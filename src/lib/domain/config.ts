/**
 * Tunable business rules. The source of truth is the single `config` row in Appwrite (read by
 * functions and by the app). These defaults are used to seed that row and as a client fallback
 * while it loads. Changing values here does NOT change live behaviour — edit the config row.
 */
export interface DomainConfig {
  TESTERS_REQUIRED: number;
  TEST_DAYS: number;
  EXTRA_TESTER_BUFFER: number;
  CREDITS_PER_TESTER_SLOT: number;
  DEVELOPER_WELCOME_CREDITS: number;
  POINTS_PER_TASK: number;
  POINTS_COMPLETION_BONUS: number;
  MAX_ACTIVE_TESTS_PER_TESTER: number;
  /** Hour (tester local time) at which a new task day starts. */
  TASK_DAY_RESET_HOUR: number;
  DROPOUT_WARN_HOURS: number;
  DROPOUT_DROP_HOURS: number;
  DEFAULT_REPUTATION: number;
  /** Reputation lost when an enrollment is dropped. */
  DROP_REPUTATION_PENALTY: number;
  /** Points removed when a developer flags a task. */
  FLAG_POINTS_PENALTY: number;
  /** Rate limit: max claimTest calls per tester per hour. */
  CLAIM_RATE_LIMIT_PER_HOUR: number;
  /** Rate limit: max reports per user per day. */
  REPORT_RATE_LIMIT_PER_DAY: number;
}

export const DEFAULT_CONFIG: DomainConfig = {
  TESTERS_REQUIRED: 12,
  TEST_DAYS: 14,
  EXTRA_TESTER_BUFFER: 2,
  CREDITS_PER_TESTER_SLOT: 10,
  DEVELOPER_WELCOME_CREDITS: 50,
  POINTS_PER_TASK: 10,
  POINTS_COMPLETION_BONUS: 60,
  MAX_ACTIVE_TESTS_PER_TESTER: 5,
  TASK_DAY_RESET_HOUR: 4,
  DROPOUT_WARN_HOURS: 48,
  DROPOUT_DROP_HOURS: 72,
  DEFAULT_REPUTATION: 60,
  DROP_REPUTATION_PENALTY: 15,
  FLAG_POINTS_PENALTY: 10,
  CLAIM_RATE_LIMIT_PER_HOUR: 10,
  REPORT_RATE_LIMIT_PER_DAY: 10,
};

/** Merge a (possibly partial / stringly-typed) config row with defaults. */
export function resolveConfig(row: Partial<Record<keyof DomainConfig, unknown>> | null | undefined): DomainConfig {
  const out: DomainConfig = { ...DEFAULT_CONFIG };
  if (!row) return out;
  for (const key of Object.keys(DEFAULT_CONFIG) as (keyof DomainConfig)[]) {
    const value = Number(row[key]);
    if (row[key] !== undefined && row[key] !== null && Number.isFinite(value)) out[key] = value;
  }
  return out;
}

/** Slots a developer reserves for one app: the required testers plus a drop-out buffer. */
export function slotsForApp(cfg: DomainConfig): number {
  return cfg.TESTERS_REQUIRED + cfg.EXTRA_TESTER_BUFFER;
}

export function slotCost(slots: number, cfg: DomainConfig): number {
  return slots * cfg.CREDITS_PER_TESTER_SLOT;
}
