import { BADGES, earnedBadges } from '../badges';
import { GENERIC_INSTRUCTION, moveDay, normalizePlan, sameTaskEveryDay, templatePlan } from '../testPlan';
import type { ProfileRow } from '../types';

describe('test plans', () => {
  it('template covers every day', () => {
    const plan = templatePlan(14);
    expect(plan).toHaveLength(14);
    expect(plan.map((d) => d.dayNumber)).toEqual(Array.from({ length: 14 }, (_, i) => i + 1));
  });

  it('fills blank days with the generic instruction', () => {
    const plan = normalizePlan(3, [{ dayNumber: 2, instruction: 'Sign up', title: '' }]);
    expect(plan[0]!.instruction).toBe(GENERIC_INSTRUCTION);
    expect(plan[1]).toMatchObject({ instruction: 'Sign up', title: 'Day 2', requiresScreenshot: true });
    expect(plan[2]!.title).toBe('Day 3');
  });

  it('same-task quick fill', () => {
    const plan = sameTaskEveryDay(14, 'Open and add an entry');
    expect(new Set(plan.map((d) => d.instruction))).toEqual(new Set(['Open and add an entry']));
  });

  it('reorders and renumbers', () => {
    const plan = templatePlan(4);
    const moved = moveDay(plan, 0, 3);
    expect(moved[3]!.title).toBe(plan[0]!.title);
    expect(moved.map((d) => d.dayNumber)).toEqual([1, 2, 3, 4]);
  });
});

describe('badges', () => {
  const profile = {
    testsCompleted: 1,
    longestStreak: 8,
    tasksCompleted: 20,
    ratingSum: 0,
    ratingCount: 0,
    reputation: 60,
  } as ProfileRow;

  it('computes earned badges and progress', () => {
    const ids = earnedBadges(profile).map((b) => b.id);
    expect(ids).toEqual(['first_test', 'streak_7']);
    const tasks50 = BADGES.find((b) => b.id === 'tasks_50')!;
    expect(tasks50.progress(profile)).toBeCloseTo(0.4);
  });
});
