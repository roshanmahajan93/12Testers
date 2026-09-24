/**
 * Pluggable logger. Swap `sink` for Sentry (or similar) later without touching call sites:
 *   setLogSink({ error: (m, e) => Sentry.captureException(e ?? m), ... })
 */
export interface LogSink {
  debug(message: string, extra?: unknown): void;
  info(message: string, extra?: unknown): void;
  warn(message: string, extra?: unknown): void;
  error(message: string, extra?: unknown): void;
}

const consoleSink: LogSink = {
  debug: (m, e) => {
    if (__DEV__) console.warn(`[debug] ${m}`, e ?? '');
  },
  info: (m, e) => {
    if (__DEV__) console.warn(`[info] ${m}`, e ?? '');
  },
  warn: (m, e) => console.warn(m, e ?? ''),
  error: (m, e) => console.error(m, e ?? ''),
};

let sink: LogSink = consoleSink;

export function setLogSink(next: LogSink): void {
  sink = next;
}

export const logger: LogSink = {
  debug: (m, e) => sink.debug(m, e),
  info: (m, e) => sink.info(m, e),
  warn: (m, e) => sink.warn(m, e),
  error: (m, e) => sink.error(m, e),
};
