/**
 * Appwrite resource IDs. These are fixed IDs created by `scripts/setup-appwrite.ts` and
 * `appwrite/appwrite.json` — keep all three in sync.
 */
import { env } from '@/lib/env';

export const DATABASE_ID = env.appwriteDatabaseId;

export const TABLES = {
  profiles: 'profiles',
  apps: 'apps',
  testPlans: 'testPlans',
  enrollments: 'enrollments',
  dailyTasks: 'dailyTasks',
  feedback: 'feedback',
  creditTransactions: 'creditTransactions',
  pointTransactions: 'pointTransactions',
  notifications: 'notifications',
  reports: 'reports',
  config: 'config',
} as const;
export type TableId = (typeof TABLES)[keyof typeof TABLES];

export const CONFIG_ROW_ID = 'global';

export const BUCKETS = {
  avatars: 'avatars',
  appIcons: 'app-icons',
  taskScreenshots: 'task-screenshots',
  feedbackAttachments: 'feedback-attachments',
} as const;
export type BucketKey = keyof typeof BUCKETS;
export type BucketId = BucketKey;

export const FUNCTIONS = {
  setRole: 'setRole',
  updateProfile: 'updateProfile',
  saveApp: 'saveApp',
  listApp: 'listApp',
  manageApp: 'manageApp',
  claimTest: 'claimTest',
  completeDailyTask: 'completeDailyTask',
  submitFeedback: 'submitFeedback',
  moderate: 'moderate',
  report: 'report',
  getLeaderboard: 'getLeaderboard',
  deleteAccount: 'deleteAccount',
} as const;
export type FunctionId = (typeof FUNCTIONS)[keyof typeof FUNCTIONS];
