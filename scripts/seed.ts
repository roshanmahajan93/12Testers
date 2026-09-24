/**
 * Seeds a DEV Appwrite project with sample data:
 *  - 2 developers (200 credits each), 14 testers
 *  - "Pocket Budget" recruiting (5 testers joined), "Trail Log" testing (12 testers, day 5),
 *    "Habit Sprout" draft
 *
 *   APPWRITE_API_KEY=... SEED_EMAIL=you@gmail.com npm run seed
 *
 * Users get emails via plus-addressing (you+dev1@gmail.com, you+tester3@gmail.com, …) so you can
 * sign in to any of them with email OTP. Never run against production.
 */
import { config as loadEnv } from 'dotenv';
import { AppwriteException, Client, Messaging, Permission, Role, Storage, TablesDB, Users } from 'node-appwrite';

import { applyCredits } from '../appwrite/functions/_shared/ledger';
import { appPermissions, ensureTodayTask, planRowId, testerDeviceLabel } from '../appwrite/functions/_shared/lifecycle';
import type { Admin } from '../appwrite/functions/_shared/runtime';
import { DEFAULT_CONFIG } from '../src/lib/domain/config';
import { TABLES } from '../src/lib/domain/resources';
import { EMPTY_HISTORY, setDayHistory } from '../src/lib/domain/rules';
import { templatePlan } from '../src/lib/domain/testPlan';
import { addDaysToKey, taskDayKey } from '../src/lib/domain/time';
import type { AppRow, Enrollment, EnrollmentRow, ProfileRow, Role as UserRole } from '../src/lib/domain/types';
import { optInUrlFor } from '../src/lib/validators';

loadEnv({ path: ['.env.local', '.env'], quiet: true });

const endpoint = process.env.EXPO_PUBLIC_APPWRITE_ENDPOINT;
const projectId = process.env.EXPO_PUBLIC_APPWRITE_PROJECT_ID;
const apiKey = process.env.APPWRITE_API_KEY;
const seedEmail = process.env.SEED_EMAIL ?? 'seed@example.com';
if (!endpoint || !projectId || !apiKey) {
  console.error('Set EXPO_PUBLIC_APPWRITE_ENDPOINT, EXPO_PUBLIC_APPWRITE_PROJECT_ID and APPWRITE_API_KEY.');
  process.exit(1);
}
process.env.APPWRITE_DATABASE_ID = process.env.EXPO_PUBLIC_APPWRITE_DATABASE_ID ?? 'main';
const databaseId = process.env.APPWRITE_DATABASE_ID;

const client = new Client().setEndpoint(endpoint).setProject(projectId).setKey(apiKey);
const admin: Admin = {
  client,
  db: new TablesDB(client),
  users: new Users(client),
  storage: new Storage(client),
  messaging: new Messaging(client),
};
const cfg = DEFAULT_CONFIG;

const [local, domain] = seedEmail.split('@');
const emailFor = (tag: string) => `${local}+${tag}@${domain}`;

const DEVICES = ['Pixel 8', 'Galaxy S23', 'Redmi Note 13', 'Moto G84', 'OnePlus 12R', 'Galaxy A54', 'Pixel 7a'];
const NAMES = ['Asha', 'Ben', 'Chen', 'Dara', 'Eli', 'Farah', 'Gabe', 'Hana', 'Ivan', 'Jaya', 'Kofi', 'Lena', 'Milo', 'Nia'];

async function upsertUser(tag: string, name: string, role: UserRole): Promise<string> {
  const userId = `seed-${tag}`;
  try {
    await admin.users.create({ userId, email: emailFor(tag), name });
  } catch (e) {
    if (!(e instanceof AppwriteException && e.code === 409)) throw e;
  }
  await admin.users.updateLabels({ userId, labels: [role] });
  return userId;
}

async function upsertRow(tableId: string, rowId: string, data: object, permissions: string[]) {
  await admin.db.upsertRow({ databaseId, tableId, rowId, data: data as Record<string, unknown>, permissions });
}

function profile(userId: string, role: UserRole, name: string, i: number): ProfileRow {
  return {
    userId,
    role,
    displayName: name,
    avatarFileId: null,
    country: ['India', 'Brazil', 'Germany', 'Kenya', 'USA'][i % 5] ?? 'India',
    languages: ['English'],
    timezone: 'UTC',
    notificationPrefs: null,
    credits: 0,
    isPro: false,
    companyName: role === 'developer' ? `${name} Labs` : null,
    deviceModel: role === 'tester' ? (DEVICES[i % DEVICES.length] ?? 'Pixel 8') : null,
    androidVersion: role === 'tester' ? 12 + (i % 4) : null,
    maxActiveTests: 3,
    points: 0,
    reputation: role === 'tester' ? 55 + ((i * 7) % 40) : cfg.DEFAULT_REPUTATION,
    currentStreak: 0,
    longestStreak: 0,
    lastStreakDay: null,
    testsCompleted: 0,
    tasksCompleted: 0,
    tasksMissed: 0,
    flagsReceived: 0,
    drops: 0,
    ratingSum: 0,
    ratingCount: 0,
    monthKey: null,
    tasksThisMonth: 0,
  };
}

async function createApp(
  ownerId: string,
  ownerName: string,
  name: string,
  pkg: string,
  status: AppRow['status'],
  description: string,
): Promise<string> {
  const appId = `seed-${pkg.split('.').pop()}`;
  const slots = cfg.TESTERS_REQUIRED + cfg.EXTRA_TESTER_BUFFER;
  const app: AppRow = {
    ownerId,
    ownerName,
    name,
    packageName: pkg,
    iconFileId: null,
    shortDescription: description,
    category: 'productivity',
    optInUrl: optInUrlFor(pkg),
    googleGroupUrl: null,
    generalInstructions: 'Please keep the app installed for all 14 days and open it daily.',
    minReputation: 0,
    minAndroidVersion: 10,
    testersNeeded: slots,
    testersActive: 0,
    testersCompleted: 0,
    slotsOpen: status === 'draft' ? 0 : slots,
    status,
    testStartDate: null,
    isBoosted: false,
    boostUntil: null,
    creditsReserved: status === 'draft' ? 0 : slots * cfg.CREDITS_PER_TESTER_SLOT,
  };
  await upsertRow(TABLES.apps, appId, app, appPermissions(ownerId, status));
  for (const day of templatePlan(cfg.TEST_DAYS)) {
    await upsertRow(TABLES.testPlans, planRowId(appId, day.dayNumber), { appId, ...day }, appPermissions(ownerId, status));
  }
  if (status !== 'draft') {
    await applyCredits(admin, {
      developerId: ownerId,
      amount: -app.creditsReserved,
      type: 'slot_reserve',
      refId: appId,
      note: `${slots} tester slots for ${name}`,
      idempotencyKey: `seed-reserve:${appId}`,
    });
  }
  return appId;
}

async function enroll(appId: string, app: { name: string; pkg: string; ownerId: string }, testerId: string, p: ProfileRow, startDay: string | null, pastDays: number) {
  const rowId = `${appId}-${testerId}`.slice(0, 36);
  let history = EMPTY_HISTORY(cfg.TEST_DAYS);
  for (let d = 1; d <= pastDays; d++) history = setDayHistory(history, d, d % 6 === 0 ? 'm' : 'c', cfg.TEST_DAYS);
  const completed = history.split('').filter((c) => c === 'c').length;
  const row: EnrollmentRow = {
    appId,
    appName: app.name,
    appIconFileId: null,
    packageName: app.pkg,
    testerId,
    developerId: app.ownerId,
    testerName: p.displayName,
    testerAvatarFileId: null,
    testerDevice: testerDeviceLabel(p),
    testerReputation: p.reputation,
    status: startDay ? 'active' : 'joined',
    joinedAt: new Date().toISOString(),
    startedAt: startDay ? new Date(Date.now() - pastDays * 86_400_000).toISOString() : null,
    startDay,
    lastTaskCompletedAt: startDay ? new Date(Date.now() - 20 * 3_600_000).toISOString() : null,
    tasksCompleted: completed,
    streak: Math.min(pastDays, 5),
    dayHistory: history,
  };
  await upsertRow(TABLES.enrollments, rowId, row, [Permission.read(Role.user(testerId)), Permission.read(Role.user(app.ownerId))]);
  return { ...row, $id: rowId, $createdAt: '', $updatedAt: '' } as Enrollment;
}

async function main() {
  console.log(`Seeding ${endpoint} project=${projectId}`);
  const devs: { id: string; name: string }[] = [];
  for (const [i, name] of ['Riya Dev', 'Sam Builder'].entries()) {
    const id = await upsertUser(`dev${i + 1}`, name, 'developer');
    await upsertRow(TABLES.profiles, id, profile(id, 'developer', name, i), [Permission.read(Role.user(id))]);
    await applyCredits(admin, { developerId: id, amount: 200, type: 'admin', note: 'Seed credits', idempotencyKey: `seed-credits:${id}` });
    devs.push({ id, name });
  }

  const testers: { id: string; profile: ProfileRow }[] = [];
  for (const [i, name] of NAMES.entries()) {
    const id = await upsertUser(`tester${i + 1}`, `${name} Tester`, 'tester');
    const p = profile(id, 'tester', `${name} Tester`, i);
    await upsertRow(TABLES.profiles, id, p, [Permission.read(Role.user(id))]);
    testers.push({ id, profile: p });
  }

  const [dev1, dev2] = devs as [{ id: string; name: string }, { id: string; name: string }];
  const recruiting = await createApp(dev1.id, dev1.name, 'Pocket Budget', 'com.seed.pocketbudget', 'recruiting', 'A tiny envelope-budgeting app with offline sync.');
  const testing = await createApp(dev2.id, dev2.name, 'Trail Log', 'com.seed.traillog', 'testing', 'Log hikes, photos and elevation — no account needed.');
  await createApp(dev1.id, dev1.name, 'Habit Sprout', 'com.seed.habitsprout', 'draft', 'Grow a plant by keeping small daily habits.');

  // Recruiting: first 5 testers joined.
  for (const t of testers.slice(0, 5)) {
    await enroll(recruiting, { name: 'Pocket Budget', pkg: 'com.seed.pocketbudget', ownerId: dev1.id }, t.id, t.profile, null, 0);
  }
  await admin.db.updateRow({ databaseId, tableId: TABLES.apps, rowId: recruiting, data: { testersActive: 5, slotsOpen: 14 - 5 } });

  // Testing: 12 testers on day 5.
  const now = new Date();
  const today = taskDayKey(now, 'UTC', cfg.TASK_DAY_RESET_HOUR);
  const startDay = addDaysToKey(today, -4);
  for (const t of testers.slice(2, 14)) {
    const e = await enroll(testing, { name: 'Trail Log', pkg: 'com.seed.traillog', ownerId: dev2.id }, t.id, t.profile, startDay, 4);
    await ensureTodayTask(admin, e, t.profile, cfg, now);
  }
  await admin.db.updateRow({
    databaseId,
    tableId: TABLES.apps,
    rowId: testing,
    data: { testersActive: 12, slotsOpen: 2, testStartDate: startDay },
  });

  console.log('✔ Seed complete');
  console.log(`  Developers: ${emailFor('dev1')}, ${emailFor('dev2')}`);
  console.log(`  Testers:    ${emailFor('tester1')} … ${emailFor('tester14')}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

