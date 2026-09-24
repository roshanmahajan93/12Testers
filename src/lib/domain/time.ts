/**
 * Timezone-aware "task day" helpers. A task day starts at TASK_DAY_RESET_HOUR in the tester's
 * local timezone, so at 02:00 with a reset hour of 4 the tester is still on yesterday's day.
 * Day keys are ISO dates (YYYY-MM-DD) in the tester's timezone.
 */

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

interface LocalParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
}

const formatterCache = new Map<string, Intl.DateTimeFormat>();

function formatterFor(timeZone: string): Intl.DateTimeFormat {
  let f = formatterCache.get(timeZone);
  if (!f) {
    f = new Intl.DateTimeFormat('en-US', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    });
    formatterCache.set(timeZone, f);
  }
  return f;
}

export function isValidTimeZone(timeZone: string): boolean {
  try {
    formatterFor(timeZone);
    return true;
  } catch {
    return false;
  }
}

export function localParts(date: Date, timeZone: string): LocalParts {
  const tz = isValidTimeZone(timeZone) ? timeZone : 'UTC';
  const parts = formatterFor(tz).formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((p) => p.type === type)?.value ?? 0);
  return {
    year: get('year'),
    month: get('month'),
    day: get('day'),
    hour: get('hour') % 24,
    minute: get('minute'),
  };
}

function pad(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

/** Calendar date key (YYYY-MM-DD) of `date` in `timeZone`. */
export function localDateKey(date: Date, timeZone: string): string {
  const p = localParts(date, timeZone);
  return `${p.year}-${pad(p.month)}-${pad(p.day)}`;
}

/** The task day a moment belongs to, honouring the reset hour. */
export function taskDayKey(date: Date, timeZone: string, resetHour: number): string {
  return localDateKey(new Date(date.getTime() - resetHour * HOUR_MS), timeZone);
}

/** Whole days between two day keys (b - a). */
export function diffDayKeys(a: string, b: string): number {
  const toUtc = (k: string) => {
    const [y, m, d] = k.split('-').map(Number);
    return Date.UTC(y ?? 1970, (m ?? 1) - 1, d ?? 1);
  };
  return Math.round((toUtc(b) - toUtc(a)) / DAY_MS);
}

export function addDaysToKey(key: string, days: number): string {
  const [y, m, d] = key.split('-').map(Number);
  const t = new Date(Date.UTC(y ?? 1970, (m ?? 1) - 1, (d ?? 1) + days));
  return `${t.getUTCFullYear()}-${pad(t.getUTCMonth() + 1)}-${pad(t.getUTCDate())}`;
}

/**
 * Milliseconds until the next task-day reset for a tester. Works from the tester's local
 * wall clock so DST shifts are at most one hour off, which is fine for a countdown.
 */
export function msUntilReset(now: Date, timeZone: string, resetHour: number): number {
  const p = localParts(now, timeZone);
  const minutesNow = p.hour * 60 + p.minute;
  const resetMinutes = resetHour * 60;
  let delta = resetMinutes - minutesNow;
  if (delta <= 0) delta += 24 * 60;
  return delta * 60 * 1000 - now.getSeconds() * 1000 - now.getMilliseconds();
}

export function hoursBetween(a: Date, b: Date): number {
  return (b.getTime() - a.getTime()) / HOUR_MS;
}

/** Day number (1-based) of a tester's test given the day they started. */
export function dayNumberFor(startKey: string, todayKey: string): number {
  return diffDayKeys(startKey, todayKey) + 1;
}
