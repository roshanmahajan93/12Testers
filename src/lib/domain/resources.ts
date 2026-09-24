/**
 * Appwrite resource IDs shared by the app, the functions and the setup scripts.
 * The database id itself comes from env (EXPO_PUBLIC_APPWRITE_DATABASE_ID / APPWRITE_DATABASE_ID).
 */
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
  // Not callable from the app:
  generateDailyTasks: 'generateDailyTasks',
  dropoutMonitor: 'dropoutMonitor',
  revenuecatWebhook: 'revenuecatWebhook',
} as const;
export type FunctionId = (typeof FUNCTIONS)[keyof typeof FUNCTIONS];
