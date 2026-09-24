/** Test-plan templates and defaults. Original copy — tweak freely. */

export const GENERIC_INSTRUCTION = 'Open the app and use it for 2–3 minutes.';

export interface PlanDayDraft {
  dayNumber: number;
  title: string;
  instruction: string;
  requiresScreenshot: boolean;
  question: string | null;
}

const TEMPLATE: readonly Omit<PlanDayDraft, 'dayNumber'>[] = [
  { title: 'First launch', instruction: 'Install from the testing link, open the app and look around the first screen.', requiresScreenshot: true, question: 'What did you expect the app to do from its first screen?' },
  { title: 'Sign up', instruction: 'Create an account or finish onboarding. Note anything confusing.', requiresScreenshot: true, question: null },
  { title: 'Core feature', instruction: 'Use the main feature of the app once from start to finish.', requiresScreenshot: true, question: 'Was anything slow or unclear?' },
  { title: 'Explore settings', instruction: 'Open the settings or profile area and change one preference.', requiresScreenshot: true, question: null },
  { title: 'Daily use', instruction: GENERIC_INSTRUCTION, requiresScreenshot: true, question: null },
  { title: 'Try an edge case', instruction: 'Try entering unusual input or going offline briefly, then come back.', requiresScreenshot: true, question: 'Did anything break?' },
  { title: 'Daily use', instruction: GENERIC_INSTRUCTION, requiresScreenshot: true, question: null },
  { title: 'Notifications', instruction: 'Check whether the app’s notifications or reminders work for you.', requiresScreenshot: true, question: null },
  { title: 'Daily use', instruction: GENERIC_INSTRUCTION, requiresScreenshot: true, question: null },
  { title: 'Share or export', instruction: 'Try sharing, exporting or saving something from the app.', requiresScreenshot: true, question: null },
  { title: 'Daily use', instruction: GENERIC_INSTRUCTION, requiresScreenshot: true, question: null },
  { title: 'Accessibility', instruction: 'Increase your system font size and check the main screens still read well.', requiresScreenshot: true, question: 'Was any text cut off?' },
  { title: 'Daily use', instruction: GENERIC_INSTRUCTION, requiresScreenshot: true, question: null },
  { title: 'Final impressions', instruction: 'Use the app one last time and leave honest overall feedback.', requiresScreenshot: true, question: 'What is the one thing you would improve?' },
];

export function templatePlan(days: number): PlanDayDraft[] {
  return Array.from({ length: days }, (_, i) => {
    const t = TEMPLATE[i % TEMPLATE.length] ?? { title: 'Daily use', instruction: GENERIC_INSTRUCTION, requiresScreenshot: true, question: null };
    return { dayNumber: i + 1, ...t };
  });
}

export function sameTaskEveryDay(days: number, instruction: string, requiresScreenshot = true): PlanDayDraft[] {
  return Array.from({ length: days }, (_, i) => ({
    dayNumber: i + 1,
    title: `Day ${i + 1}`,
    instruction: instruction.trim() || GENERIC_INSTRUCTION,
    requiresScreenshot,
    question: null,
  }));
}

/** Fill gaps / blanks so every day 1..days has an instruction. */
export function normalizePlan(days: number, drafts: readonly Partial<PlanDayDraft>[]): PlanDayDraft[] {
  const byDay = new Map<number, Partial<PlanDayDraft>>();
  drafts.forEach((d, i) => byDay.set(d.dayNumber ?? i + 1, d));
  return Array.from({ length: days }, (_, i) => {
    const d = byDay.get(i + 1) ?? {};
    const instruction = (d.instruction ?? '').trim() || GENERIC_INSTRUCTION;
    return {
      dayNumber: i + 1,
      title: (d.title ?? '').trim() || `Day ${i + 1}`,
      instruction,
      requiresScreenshot: d.requiresScreenshot ?? true,
      question: (d.question ?? '').trim() || null,
    };
  });
}

/** Reorder by moving one day to a new position; day numbers are re-assigned 1..n. */
export function moveDay(plan: readonly PlanDayDraft[], from: number, to: number): PlanDayDraft[] {
  const next = [...plan];
  const [item] = next.splice(from, 1);
  if (!item) return [...plan];
  next.splice(Math.max(0, Math.min(to, next.length)), 0, item);
  return next.map((d, i) => ({ ...d, dayNumber: i + 1 }));
}
