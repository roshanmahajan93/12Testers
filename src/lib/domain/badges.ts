import type { ProfileRow } from './types';

export interface BadgeDef {
  id: string;
  title: string;
  description: string;
  icon: string;
  earned: (p: ProfileRow) => boolean;
  /** 0..1 progress towards the badge for display. */
  progress: (p: ProfileRow) => number;
}

const ratio = (n: number, target: number) => Math.max(0, Math.min(1, n / target));

export const BADGES: BadgeDef[] = [
  { id: 'first_test', title: 'First finish', description: 'Complete your first 14-day test', icon: 'ribbon-outline', earned: (p) => p.testsCompleted >= 1, progress: (p) => ratio(p.testsCompleted, 1) },
  { id: 'streak_7', title: 'Week warrior', description: 'Reach a 7-day streak', icon: 'flame-outline', earned: (p) => p.longestStreak >= 7, progress: (p) => ratio(p.longestStreak, 7) },
  { id: 'streak_14', title: 'Unbroken', description: 'Reach a 14-day streak', icon: 'bonfire-outline', earned: (p) => p.longestStreak >= 14, progress: (p) => ratio(p.longestStreak, 14) },
  { id: 'tasks_50', title: 'Fifty days', description: 'Complete 50 daily tasks', icon: 'checkmark-done-outline', earned: (p) => p.tasksCompleted >= 50, progress: (p) => ratio(p.tasksCompleted, 50) },
  { id: 'tests_10', title: 'Veteran', description: 'Complete 10 tests', icon: 'medal-outline', earned: (p) => p.testsCompleted >= 10, progress: (p) => ratio(p.testsCompleted, 10) },
  {
    id: 'helpful',
    title: 'Sharp eye',
    description: 'Average 4★+ on 5 rated feedback reports',
    icon: 'eye-outline',
    earned: (p) => p.ratingCount >= 5 && p.ratingSum / p.ratingCount >= 4,
    progress: (p) => ratio(p.ratingCount, 5),
  },
  { id: 'trusted', title: 'Trusted', description: 'Reach 85 reputation', icon: 'shield-checkmark-outline', earned: (p) => p.reputation >= 85, progress: (p) => ratio(p.reputation, 85) },
];

export function earnedBadges(p: ProfileRow): BadgeDef[] {
  return BADGES.filter((b) => b.earned(p));
}
