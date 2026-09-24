/**
 * zod schemas shared by the app (forms) and the Appwrite Functions (input validation).
 * Functions MUST re-validate every payload with these — never trust the client.
 */
import { z } from 'zod';

import { APP_CATEGORIES, FEEDBACK_SEVERITIES, FEEDBACK_TYPES, ROLES } from './domain/types';

export const PACKAGE_NAME_REGEX = /^[a-zA-Z][a-zA-Z0-9_]*(\.[a-zA-Z][a-zA-Z0-9_]*)+$/;
const HTTPS_URL = /^https:\/\/[^\s]+$/i;
const ID = z.string().min(1).max(36).regex(/^[a-zA-Z0-9][a-zA-Z0-9._-]*$/, 'Invalid id');

export const optInUrlFor = (packageName: string) => `https://play.google.com/apps/testing/${packageName}`;
export const playStoreUrlFor = (packageName: string) => `https://play.google.com/store/apps/details?id=${packageName}`;
export const marketUrlFor = (packageName: string) => `market://details?id=${packageName}`;

export const emailSchema = z.string().trim().toLowerCase().email('Enter a valid email address');
export const otpSchema = z.string().trim().regex(/^\d{6}$/, 'Enter the 6-digit code');

export const packageNameSchema = z
  .string()
  .trim()
  .min(3)
  .max(150)
  .regex(PACKAGE_NAME_REGEX, 'Use a package name like com.example.app');

export const httpsUrlSchema = z.string().trim().max(2000).regex(HTTPS_URL, 'Enter a full https:// link');

export const googleGroupUrlSchema = httpsUrlSchema.refine(
  (v) => /^https:\/\/groups\.google\.com\//i.test(v),
  'Use a https://groups.google.com/… link',
);

export const setRoleSchema = z.object({
  role: z.enum(ROLES),
  timezone: z.string().trim().min(1).max(64).optional(),
  displayName: z.string().trim().min(2).max(40).optional(),
});

export const testerSetupSchema = z.object({
  displayName: z.string().trim().min(2, 'At least 2 characters').max(40),
  deviceModel: z.string().trim().min(2).max(80),
  androidVersion: z.number().int().min(5).max(30),
  country: z.string().trim().min(2, 'Enter your country').max(56),
  languages: z.array(z.string().trim().min(2).max(24)).min(1, 'Pick at least one language').max(6),
  maxActiveTests: z.number().int().min(1).max(10),
});
export type TesterSetupInput = z.infer<typeof testerSetupSchema>;

export const notificationPrefsSchema = z.object({
  dailyTasks: z.boolean(),
  reminders: z.boolean(),
  reminderTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  testerActivity: z.boolean(),
  feedback: z.boolean(),
  marketing: z.boolean(),
});

/** Fields a user may change on their own profile (everything else is function-only). */
export const updateProfileSchema = z
  .object({
    displayName: z.string().trim().min(2).max(40),
    avatarFileId: ID.nullable(),
    country: z.string().trim().min(2).max(56).nullable(),
    languages: z.array(z.string().trim().min(2).max(24)).max(6),
    timezone: z.string().trim().min(1).max(64),
    expoPushToken: z.string().trim().max(200).nullable(),
    notificationPrefs: notificationPrefsSchema,
    companyName: z.string().trim().max(60).nullable(),
    deviceModel: z.string().trim().min(2).max(80),
    androidVersion: z.number().int().min(5).max(30),
    maxActiveTests: z.number().int().min(1).max(10),
  })
  .partial();
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

export const planDaySchema = z.object({
  dayNumber: z.number().int().min(1).max(60),
  title: z.string().trim().max(60),
  instruction: z.string().trim().max(500),
  requiresScreenshot: z.boolean(),
  question: z.string().trim().max(200).nullable(),
});

export const appBasicsSchema = z.object({
  name: z.string().trim().min(2, 'At least 2 characters').max(50),
  shortDescription: z.string().trim().min(10, 'Tell testers a bit more (10+ characters)').max(160),
  category: z.enum(APP_CATEGORIES),
});

export const appLinksSchema = z.object({
  packageName: packageNameSchema,
  optInUrl: httpsUrlSchema,
  googleGroupUrl: googleGroupUrlSchema.nullable(),
});

export const appRequirementsSchema = z.object({
  minReputation: z.number().int().min(0).max(90),
  minAndroidVersion: z.number().int().min(0).max(30),
  generalInstructions: z.string().trim().max(1000),
});

export const saveAppSchema = z.object({
  appId: ID.optional(),
  ...appBasicsSchema.shape,
  ...appLinksSchema.shape,
  ...appRequirementsSchema.shape,
  iconFileId: ID.nullable(),
  plan: z.array(planDaySchema).max(60),
});
export type SaveAppInput = z.infer<typeof saveAppSchema>;

export const listAppSchema = z.object({ appId: ID });
export const manageAppSchema = z.object({ appId: ID, action: z.enum(['pause', 'resume', 'cancel']) });
export const claimTestSchema = z.object({ appId: ID });
export const leaveTestSchema = z.object({ enrollmentId: ID });

export const completeTaskSchema = z.object({
  taskId: ID,
  screenshotFileId: ID.nullable(),
  answer: z.string().trim().max(1000).nullable(),
  note: z.string().trim().max(1000).nullable(),
});
export type CompleteTaskInput = z.infer<typeof completeTaskSchema>;

export const feedbackSchema = z.object({
  appId: ID,
  taskId: ID.nullable(),
  type: z.enum(FEEDBACK_TYPES),
  severity: z.enum(FEEDBACK_SEVERITIES),
  title: z.string().trim().min(3, 'Add a short title').max(100),
  body: z.string().trim().min(10, 'Describe it in a sentence or two').max(4000),
  attachmentFileIds: z.array(ID).max(4),
  deviceInfo: z.string().trim().max(200).nullable(),
});
export type FeedbackInput = z.infer<typeof feedbackSchema>;

export const moderateSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('flagTask'), taskId: ID, reason: z.string().trim().min(3).max(300) }),
  z.object({ action: z.literal('rateFeedback'), feedbackId: ID, rating: z.number().int().min(1).max(5) }),
]);
export type ModerateInput = z.infer<typeof moderateSchema>;

export const leaderboardSchema = z.object({ period: z.enum(['month', 'all']).default('month') });

export const reportSchema = z.object({
  targetType: z.enum(['app', 'feedback', 'tester', 'task']),
  targetId: ID,
  reason: z.string().trim().min(5).max(500),
});
