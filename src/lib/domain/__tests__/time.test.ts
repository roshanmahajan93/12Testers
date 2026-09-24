import { addDaysToKey, dayNumberFor, diffDayKeys, isValidTimeZone, localDateKey, msUntilReset, taskDayKey } from '../time';

describe('localDateKey', () => {
  it('uses the tester timezone, not UTC', () => {
    const d = new Date('2026-03-10T23:30:00Z');
    expect(localDateKey(d, 'UTC')).toBe('2026-03-10');
    expect(localDateKey(d, 'Asia/Kolkata')).toBe('2026-03-11'); // +05:30
    expect(localDateKey(d, 'America/Los_Angeles')).toBe('2026-03-10');
  });

  it('falls back to UTC for an unknown timezone', () => {
    expect(isValidTimeZone('Mars/Olympus')).toBe(false);
    expect(localDateKey(new Date('2026-03-10T23:30:00Z'), 'Mars/Olympus')).toBe('2026-03-10');
  });
});

describe('taskDayKey (reset hour rollover)', () => {
  it('stays on the previous day before the reset hour', () => {
    // 02:00 in Kolkata on the 11th, reset at 04:00 → still the 10th's task day
    const d = new Date('2026-03-10T20:30:00Z');
    expect(localDateKey(d, 'Asia/Kolkata')).toBe('2026-03-11');
    expect(taskDayKey(d, 'Asia/Kolkata', 4)).toBe('2026-03-10');
  });

  it('rolls over at the reset hour', () => {
    // 04:00 in Kolkata on the 11th
    const d = new Date('2026-03-10T22:30:00Z');
    expect(taskDayKey(d, 'Asia/Kolkata', 4)).toBe('2026-03-11');
  });

  it('two testers in different timezones can be on different task days at the same instant', () => {
    const d = new Date('2026-06-01T05:00:00Z');
    expect(taskDayKey(d, 'Asia/Tokyo', 4)).toBe('2026-06-01'); // 14:00 Tokyo
    expect(taskDayKey(d, 'America/New_York', 4)).toBe('2026-05-31'); // 01:00 NY
  });
});

describe('day key arithmetic', () => {
  it('diffs and adds across month boundaries', () => {
    expect(diffDayKeys('2026-01-30', '2026-02-02')).toBe(3);
    expect(addDaysToKey('2026-02-27', 2)).toBe('2026-03-01');
    expect(addDaysToKey('2026-03-01', -1)).toBe('2026-02-28');
  });

  it('numbers test days from the start day', () => {
    expect(dayNumberFor('2026-04-01', '2026-04-01')).toBe(1);
    expect(dayNumberFor('2026-04-01', '2026-04-14')).toBe(14);
    expect(dayNumberFor('2026-04-01', '2026-04-15')).toBe(15);
  });
});

describe('msUntilReset', () => {
  it('counts down to the next reset in the tester timezone', () => {
    const d = new Date('2026-03-10T00:00:00Z'); // 00:00 UTC
    expect(msUntilReset(d, 'UTC', 4)).toBe(4 * 3600_000);
    expect(msUntilReset(new Date('2026-03-10T05:00:00Z'), 'UTC', 4)).toBe(23 * 3600_000);
  });
});
