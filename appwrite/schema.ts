/**
 * Declarative Appwrite schema — the single source of truth for tables, columns, indexes,
 * table-level permissions and buckets. Applied idempotently by `scripts/setup-appwrite.ts`.
 *
 * Permission model:
 * - Tables use row security. Table-level permissions are empty unless noted, so the ONLY way a
 *   client can see a row is a row permission written by a Function.
 * - No table grants create/update/delete to clients, except `notifications` rows which grant
 *   update/delete to their owner (to mark read / dismiss).
 */
import {
  APP_CATEGORIES,
  APP_STATUSES,
  CREDIT_TX_TYPES,
  ENROLLMENT_STATUSES,
  FEEDBACK_SEVERITIES,
  FEEDBACK_TYPES,
  POINT_TX_TYPES,
  ROLES,
  TASK_STATUSES,
} from '../src/lib/domain/types';
import { BUCKETS, TABLES } from '../src/lib/domain/resources';

export type Column =
  | { type: 'varchar'; key: string; size: number; required?: boolean; default?: string; array?: boolean }
  | { type: 'text'; key: string; required?: boolean; default?: string }
  | { type: 'integer'; key: string; required?: boolean; default?: number; min?: number; max?: number }
  | { type: 'float'; key: string; required?: boolean; default?: number; min?: number; max?: number }
  | { type: 'boolean'; key: string; required?: boolean; default?: boolean }
  | { type: 'datetime'; key: string; required?: boolean }
  | { type: 'enum'; key: string; elements: readonly string[]; required?: boolean; default?: string };

export interface IndexDef {
  key: string;
  type: 'key' | 'unique' | 'fulltext';
  columns: string[];
  orders?: ('ASC' | 'DESC')[];
}

export interface TableDef {
  id: string;
  name: string;
  /** Table-level permissions (Permission.* strings are built in the setup script). */
  permissions: { read?: 'users'; };
  rowSecurity: boolean;
  columns: Column[];
  indexes: IndexDef[];
}

const id = (key: string, required = true): Column => ({ type: 'varchar', key, size: 36, required });
const str = (key: string, size: number, required = false): Column => ({ type: 'varchar', key, size, required });
const int = (key: string, dflt = 0, min?: number, max?: number): Column => ({ type: 'integer', key, default: dflt, min, max });
const bool = (key: string, dflt = false): Column => ({ type: 'boolean', key, default: dflt });
const date = (key: string, required = false): Column => ({ type: 'datetime', key, required });
const text = (key: string): Column => ({ type: 'text', key });

export const TABLE_DEFS: TableDef[] = [
  {
    id: TABLES.profiles,
    name: 'Profiles',
    permissions: {},
    rowSecurity: true,
    columns: [
      id('userId'),
      { type: 'enum', key: 'role', elements: ROLES, required: true },
      str('displayName', 60, true),
      id('avatarFileId', false),
      str('country', 56),
      { type: 'varchar', key: 'languages', size: 24, array: true },
      { type: 'varchar', key: 'timezone', size: 64, default: 'UTC' },
      str('expoPushToken', 200),
      text('notificationPrefs'),
      int('credits', 0, 0),
      bool('isPro'),
      str('companyName', 60),
      str('deviceModel', 80),
      int('androidVersion', 0, 0, 40),
      int('maxActiveTests', 3, 1, 20),
      int('points', 0),
      int('reputation', 60, 0, 100),
      int('currentStreak'),
      int('longestStreak'),
      str('lastStreakDay', 10),
      int('testsCompleted'),
      int('tasksCompleted'),
      int('tasksMissed'),
      int('flagsReceived'),
      int('drops'),
      int('ratingSum'),
      int('ratingCount'),
      str('monthKey', 7),
      int('tasksThisMonth'),
    ],
    indexes: [
      { key: 'userId_unique', type: 'unique', columns: ['userId'] },
      { key: 'role_points', type: 'key', columns: ['role', 'points'], orders: ['ASC', 'DESC'] },
      { key: 'role_month', type: 'key', columns: ['role', 'monthKey', 'tasksThisMonth'], orders: ['ASC', 'ASC', 'DESC'] },
    ],
  },
  {
    id: TABLES.apps,
    name: 'Apps',
    permissions: {},
    rowSecurity: true,
    columns: [
      id('ownerId'),
      str('ownerName', 60),
      str('name', 50, true),
      str('packageName', 150, true),
      id('iconFileId', false),
      str('shortDescription', 160, true),
      { type: 'enum', key: 'category', elements: APP_CATEGORIES, default: 'other' },
      str('optInUrl', 300, true),
      str('googleGroupUrl', 300),
      text('generalInstructions'),
      int('minReputation', 0, 0, 100),
      int('minAndroidVersion', 0, 0, 40),
      int('testersNeeded', 14, 1, 100),
      int('testersActive'),
      int('testersCompleted'),
      int('slotsOpen'),
      { type: 'enum', key: 'status', elements: APP_STATUSES, default: 'draft' },
      str('testStartDate', 10),
      bool('isBoosted'),
      date('boostUntil'),
      int('creditsReserved'),
    ],
    indexes: [
      { key: 'owner', type: 'key', columns: ['ownerId'] },
      { key: 'status_boost', type: 'key', columns: ['status', 'isBoosted'] },
      { key: 'status_slots', type: 'key', columns: ['status', 'slotsOpen'] },
      { key: 'package', type: 'key', columns: ['packageName'] },
      { key: 'name_search', type: 'fulltext', columns: ['name'] },
    ],
  },
  {
    id: TABLES.testPlans,
    name: 'Test plans',
    permissions: {},
    rowSecurity: true,
    columns: [
      id('appId'),
      int('dayNumber', 1, 1, 60),
      str('title', 60),
      str('instruction', 500, true),
      bool('requiresScreenshot', true),
      str('question', 200),
    ],
    indexes: [
      { key: 'app_day_unique', type: 'unique', columns: ['appId', 'dayNumber'] },
      { key: 'app', type: 'key', columns: ['appId'] },
    ],
  },
  {
    id: TABLES.enrollments,
    name: 'Enrollments',
    permissions: {},
    rowSecurity: true,
    columns: [
      id('appId'),
      str('appName', 50),
      id('appIconFileId', false),
      str('packageName', 150),
      id('testerId'),
      id('developerId'),
      str('testerName', 60),
      id('testerAvatarFileId', false),
      str('testerDevice', 120),
      int('testerReputation', 60),
      { type: 'enum', key: 'status', elements: ENROLLMENT_STATUSES, default: 'joined' },
      date('joinedAt', true),
      date('startedAt'),
      str('startDay', 10),
      date('lastTaskCompletedAt'),
      int('tasksCompleted'),
      int('streak'),
      str('dayHistory', 60),
    ],
    indexes: [
      { key: 'app_tester_unique', type: 'unique', columns: ['appId', 'testerId'] },
      { key: 'tester_status', type: 'key', columns: ['testerId', 'status'] },
      { key: 'app_status', type: 'key', columns: ['appId', 'status'] },
      { key: 'developer', type: 'key', columns: ['developerId'] },
      { key: 'status', type: 'key', columns: ['status'] },
    ],
  },
  {
    id: TABLES.dailyTasks,
    name: 'Daily tasks',
    permissions: {},
    rowSecurity: true,
    columns: [
      id('enrollmentId'),
      id('appId'),
      str('appName', 50),
      id('appIconFileId', false),
      str('packageName', 150),
      id('testerId'),
      id('developerId'),
      int('dayNumber', 1, 1, 60),
      str('dueDate', 10, true),
      str('title', 60),
      str('instruction', 500),
      bool('requiresScreenshot', true),
      str('question', 200),
      { type: 'enum', key: 'status', elements: TASK_STATUSES, default: 'pending' },
      id('screenshotFileId', false),
      str('answer', 1000),
      str('note', 1000),
      date('completedAt'),
      str('flagReason', 300),
    ],
    indexes: [
      { key: 'enrollment_due_unique', type: 'unique', columns: ['enrollmentId', 'dueDate'] },
      { key: 'tester_due', type: 'key', columns: ['testerId', 'dueDate'] },
      { key: 'app_due', type: 'key', columns: ['appId', 'dueDate'] },
      { key: 'status_due', type: 'key', columns: ['status', 'dueDate'] },
      { key: 'enrollment', type: 'key', columns: ['enrollmentId'] },
    ],
  },
  {
    id: TABLES.feedback,
    name: 'Feedback',
    permissions: {},
    rowSecurity: true,
    columns: [
      id('appId'),
      id('developerId'),
      id('testerId'),
      str('testerName', 60),
      id('taskId', false),
      { type: 'enum', key: 'type', elements: FEEDBACK_TYPES, required: true },
      { type: 'enum', key: 'severity', elements: FEEDBACK_SEVERITIES, default: 'low' },
      str('title', 100, true),
      text('body'),
      { type: 'varchar', key: 'attachmentFileIds', size: 36, array: true },
      str('deviceInfo', 200),
      int('ownerRating', 0, 0, 5),
    ],
    indexes: [
      { key: 'app', type: 'key', columns: ['appId'] },
      { key: 'tester', type: 'key', columns: ['testerId'] },
      { key: 'developer', type: 'key', columns: ['developerId'] },
    ],
  },
  {
    id: TABLES.creditTransactions,
    name: 'Credit transactions',
    permissions: {},
    rowSecurity: true,
    columns: [
      id('developerId'),
      { type: 'integer', key: 'amount', required: true },
      { type: 'enum', key: 'type', elements: CREDIT_TX_TYPES, required: true },
      str('refId', 64),
      str('note', 200),
      str('idempotencyKey', 120, true),
    ],
    indexes: [
      { key: 'developer', type: 'key', columns: ['developerId'] },
      { key: 'idem_unique', type: 'unique', columns: ['idempotencyKey'] },
    ],
  },
  {
    id: TABLES.pointTransactions,
    name: 'Point transactions',
    permissions: {},
    rowSecurity: true,
    columns: [
      id('testerId'),
      { type: 'integer', key: 'amount', required: true },
      { type: 'enum', key: 'type', elements: POINT_TX_TYPES, required: true },
      str('refId', 64),
      str('note', 200),
      str('idempotencyKey', 120, true),
    ],
    indexes: [
      { key: 'tester', type: 'key', columns: ['testerId'] },
      { key: 'idem_unique', type: 'unique', columns: ['idempotencyKey'] },
    ],
  },
  {
    id: TABLES.notifications,
    name: 'Notifications',
    permissions: {},
    rowSecurity: true,
    columns: [id('userId'), str('title', 120, true), str('body', 500), text('data'), bool('read')],
    indexes: [{ key: 'user_read', type: 'key', columns: ['userId', 'read'] }],
  },
  {
    id: TABLES.reports,
    name: 'Reports',
    permissions: {},
    rowSecurity: true,
    columns: [
      id('reporterId'),
      { type: 'enum', key: 'targetType', elements: ['app', 'feedback', 'tester', 'task'], required: true },
      id('targetId'),
      str('reason', 500, true),
    ],
    indexes: [{ key: 'reporter', type: 'key', columns: ['reporterId'] }],
  },
  {
    id: TABLES.config,
    name: 'Config',
    // Everyone signed in can read the single config row; only functions/console write it.
    permissions: { read: 'users' },
    rowSecurity: false,
    columns: [
      int('TESTERS_REQUIRED', 12),
      int('TEST_DAYS', 14),
      int('EXTRA_TESTER_BUFFER', 2),
      int('CREDITS_PER_TESTER_SLOT', 10),
      int('DEVELOPER_WELCOME_CREDITS', 50),
      int('POINTS_PER_TASK', 10),
      int('POINTS_COMPLETION_BONUS', 60),
      int('MAX_ACTIVE_TESTS_PER_TESTER', 5),
      int('TASK_DAY_RESET_HOUR', 4, 0, 23),
      int('DROPOUT_WARN_HOURS', 48),
      int('DROPOUT_DROP_HOURS', 72),
      int('DEFAULT_REPUTATION', 60),
      int('DROP_REPUTATION_PENALTY', 15),
      int('FLAG_POINTS_PENALTY', 10),
      int('CLAIM_RATE_LIMIT_PER_HOUR', 10),
      int('REPORT_RATE_LIMIT_PER_DAY', 10),
    ],
    indexes: [],
  },
];

export interface BucketDef {
  id: string;
  name: string;
  /** Which label may upload (create) files. */
  createLabel: 'users' | 'developer' | 'tester';
  maxBytes: number;
  extensions: string[];
}

const IMG = ['jpg', 'jpeg', 'png', 'webp'];

export const BUCKET_DEFS: BucketDef[] = [
  { id: BUCKETS.avatars, name: 'Avatars', createLabel: 'users', maxBytes: 2 * 1024 * 1024, extensions: IMG },
  { id: BUCKETS.appIcons, name: 'App icons', createLabel: 'developer', maxBytes: 1024 * 1024, extensions: IMG },
  { id: BUCKETS.taskScreenshots, name: 'Task screenshots', createLabel: 'tester', maxBytes: 5 * 1024 * 1024, extensions: IMG },
  { id: BUCKETS.feedbackAttachments, name: 'Feedback attachments', createLabel: 'tester', maxBytes: 5 * 1024 * 1024, extensions: IMG },
];
