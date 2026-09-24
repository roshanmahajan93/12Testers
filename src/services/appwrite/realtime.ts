import { Channel } from 'react-native-appwrite';

import { logger } from '@/services/logger';

import { realtime } from './client';
import { DATABASE_ID, type TableId } from './ids';

export type RowEvent<T> = { action: 'create' | 'update' | 'delete' | 'other'; row: T; tableId: string };

function actionOf(events: string[]): RowEvent<unknown>['action'] {
  const e = events[0] ?? '';
  if (e.endsWith('.create')) return 'create';
  if (e.endsWith('.update')) return 'update';
  if (e.endsWith('.delete')) return 'delete';
  return 'other';
}

/**
 * Subscribe to row changes on several tables. Appwrite only delivers events for rows the user
 * can read, so permissions double as the filter. Returns an unsubscribe function.
 */
export async function subscribeToTables<T = Record<string, unknown>>(
  tableIds: readonly TableId[],
  onEvent: (e: RowEvent<T>) => void,
): Promise<() => Promise<void>> {
  const channels = tableIds.map((t) => Channel.tablesdb(DATABASE_ID).table(t).row());
  const sub = await realtime.subscribe<T>(channels, (event) => {
    const tableId = tableIds.find((t) => event.channels.some((c) => c.includes(`.tables.${t}.`))) ?? '';
    onEvent({ action: actionOf(event.events), row: event.payload, tableId });
  });
  return async () => {
    try {
      await sub.unsubscribe();
    } catch (e) {
      logger.warn('realtime unsubscribe failed', e);
    }
  };
}

export async function disconnectRealtime(): Promise<void> {
  try {
    await realtime.disconnect();
  } catch {
    // ignore
  }
}
