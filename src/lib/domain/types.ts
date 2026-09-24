/**
 * Domain types shared by the app and the Appwrite Functions.
 * Row types describe the columns we own; Appwrite metadata ($id, $createdAt, ...) is added by `WithMeta`.
 * Keep this file free of React Native / Appwrite SDK imports so functions can bundle it.
 */

export const ROLES = ['developer', 'tester'] as const;
export type Role = (typeof ROLES)[number];

export const APP_STATUSES = ['draft', 'recruiting', 'testing', 'completed', 'paused'] as const;
export type AppStatus = (typeof APP_STATUSES)[number];

export const ENROLLMENT_STATUSES = ['joined', 'active', 'warned', 'dropped', 'completed'] as const;
export type EnrollmentStatus = (typeof ENROLLMENT_STATUSES)[number];

export const TASK_STATUSES = ['pending', 'completed', 'missed', 'flagged'] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

export const FEEDBACK_TYPES = ['bug', 'ux', 'crash', 'suggestion', 'praise'] as const;
export type FeedbackType = (typeof FEEDBACK_TYPES)[number];

export const FEEDBACK_SEVERITIES = ['low', 'medium', 'high', 'critical'] as const;
export type FeedbackSeverity = (typeof FEEDBACK_SEVERITIES)[number];

export const CREDIT_TX_TYPES = ['welcome', 'slot_reserve', 'slot_refund', 'purchase', 'admin'] as const;
export type CreditTxType = (typeof CREDIT_TX_TYPES)[number];

export const POINT_TX_TYPES = ['task', 'completion_bonus', 'penalty', 'admin'] as const;
export type PointTxType = (typeof POINT_TX_TYPES)[number];

export const APP_CATEGORIES = [
  'productivity',
  'tools',
  'games',
  'education',
  'health',
  'finance',
  'social',
  'lifestyle',
  'entertainment',
  'business',
  'other',
] as const;
export type AppCategory = (typeof APP_CATEGORIES)[number];

export interface NotificationPrefs {
  dailyTasks: boolean;
  reminders: boolean;
  /** Local time (HH:mm) for the tester's pending-task reminder. */
  reminderTime: string;
  testerActivity: boolean;
  feedback: boolean;
  marketing: boolean;
}

export interface ProfileRow {
  userId: string;
  role: Role;
  displayName: string;
  avatarFileId: string | null;
  country: string | null;
  languages: string[];
  timezone: string;
  expoPushToken: string | null;
  /** JSON-encoded NotificationPrefs (Appwrite has no nested object column). */
  notificationPrefs: string | null;
  // developer
  credits: number;
  isPro: boolean;
  companyName: string | null;
  // tester
  deviceModel: string | null;
  androidVersion: number | null;
  maxActiveTests: number;
  points: number;
  reputation: number;
  currentStreak: number;
  longestStreak: number;
  lastStreakDay: string | null;
  testsCompleted: number;
  tasksCompleted: number;
  tasksMissed: number;
  flagsReceived: number;
  drops: number;
  ratingSum: number;
  ratingCount: number;
  /** YYYY-MM of `tasksThisMonth` (leaderboard). */
  monthKey: string | null;
  tasksThisMonth: number;
}

export interface AppRow {
  ownerId: string;
  ownerName: string;
  name: string;
  packageName: string;
  iconFileId: string | null;
  shortDescription: string;
  category: AppCategory;
  optInUrl: string;
  googleGroupUrl: string | null;
  generalInstructions: string;
  minReputation: number;
  minAndroidVersion: number;
  testersNeeded: number;
  testersActive: number;
  testersCompleted: number;
  slotsOpen: number;
  status: AppStatus;
  testStartDate: string | null;
  isBoosted: boolean;
  boostUntil: string | null;
  creditsReserved: number;
}

export interface TestPlanRow {
  appId: string;
  dayNumber: number;
  title: string;
  instruction: string;
  requiresScreenshot: boolean;
  question: string | null;
}

export interface EnrollmentRow {
  appId: string;
  appName: string;
  appIconFileId: string | null;
  packageName: string;
  testerId: string;
  developerId: string;
  // Denormalized public tester info so developers never read tester profiles directly.
  testerName: string;
  testerAvatarFileId: string | null;
  testerDevice: string | null;
  testerReputation: number;
  status: EnrollmentStatus;
  joinedAt: string;
  startedAt: string | null;
  /** Tester-local day key of day 1. */
  startDay: string | null;
  lastTaskCompletedAt: string | null;
  tasksCompleted: number;
  streak: number;
  /** Compact 14-char history: c=completed, m=missed, f=flagged, p=pending, -=future. */
  dayHistory: string;
}

export interface DailyTaskRow {
  enrollmentId: string;
  appId: string;
  appName: string;
  appIconFileId: string | null;
  packageName: string;
  testerId: string;
  developerId: string;
  dayNumber: number;
  dueDate: string;
  title: string;
  instruction: string;
  requiresScreenshot: boolean;
  question: string | null;
  status: TaskStatus;
  screenshotFileId: string | null;
  answer: string | null;
  note: string | null;
  completedAt: string | null;
  flagReason: string | null;
}

export interface FeedbackRow {
  appId: string;
  developerId: string;
  testerId: string;
  testerName: string;
  taskId: string | null;
  type: FeedbackType;
  severity: FeedbackSeverity;
  title: string;
  body: string;
  attachmentFileIds: string[];
  deviceInfo: string | null;
  ownerRating: number | null;
}

export interface CreditTransactionRow {
  developerId: string;
  amount: number;
  type: CreditTxType;
  refId: string | null;
  note: string | null;
  /** Unique per logical grant (e.g. `rc:<eventId>`, `reserve:<appId>`) so retries never double-apply. */
  idempotencyKey: string;
}

export interface PointTransactionRow {
  testerId: string;
  amount: number;
  type: PointTxType;
  refId: string | null;
  note: string | null;
  idempotencyKey: string;
}

export interface NotificationRow {
  userId: string;
  title: string;
  body: string;
  /** JSON-encoded NotificationData. */
  data: string | null;
  read: boolean;
}

export interface NotificationData {
  /** In-app route to open when tapped, e.g. `/(tester)/task/abc`. */
  url?: string;
  kind?: string;
  role?: Role;
}

export interface ReportRow {
  reporterId: string;
  targetType: 'app' | 'feedback' | 'tester' | 'task';
  targetId: string;
  reason: string;
}

export interface WithMeta {
  $id: string;
  $createdAt: string;
  $updatedAt: string;
}

export type Profile = ProfileRow & WithMeta;
export type App = AppRow & WithMeta;
export type TestPlanDay = TestPlanRow & WithMeta;
export type Enrollment = EnrollmentRow & WithMeta;
export type DailyTask = DailyTaskRow & WithMeta;
export type Feedback = FeedbackRow & WithMeta;
export type CreditTransaction = CreditTransactionRow & WithMeta;
export type PointTransaction = PointTransactionRow & WithMeta;
export type AppNotification = NotificationRow & WithMeta;

export interface LeaderboardEntry {
  testerId: string;
  displayName: string;
  avatarFileId: string | null;
  points: number;
  reputation: number;
  testsCompleted: number;
  tasksThisMonth: number;
}
