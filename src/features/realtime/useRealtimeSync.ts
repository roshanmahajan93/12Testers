import { useEffect } from 'react';

import type { Role } from '@/lib/domain/types';
import { isBackendConfigured } from '@/lib/env';
import { subscribeToTables, TABLES, type TableId } from '@/services/appwrite';
import { logger } from '@/services/logger';
import { api, TAG_TYPES } from '@/store/api';
import { useAppDispatch } from '@/store/hooks';

type Tag = (typeof TAG_TYPES)[number];

const TAGS_FOR_TABLE: Partial<Record<TableId, Tag[]>> = {
  [TABLES.apps]: ['Apps'],
  [TABLES.enrollments]: ['Enrollments'],
  [TABLES.dailyTasks]: ['DailyTasks'],
  [TABLES.feedback]: ['Feedback'],
  [TABLES.creditTransactions]: ['Credits', 'Profile'],
  [TABLES.pointTransactions]: ['Points', 'Profile'],
  [TABLES.notifications]: ['Notifications'],
  [TABLES.profiles]: ['Profile'],
};

const TABLES_FOR_ROLE: Record<Role, TableId[]> = {
  developer: [TABLES.apps, TABLES.enrollments, TABLES.dailyTasks, TABLES.feedback, TABLES.creditTransactions, TABLES.notifications, TABLES.profiles],
  tester: [TABLES.apps, TABLES.enrollments, TABLES.dailyTasks, TABLES.pointTransactions, TABLES.notifications, TABLES.profiles],
};

/**
 * Realtime → cache invalidation. Row permissions decide which events arrive, so the developer
 * hears about their apps' testers/tasks/feedback and the tester about their own tasks/points.
 * Invalidations are batched (250ms) so a burst of server writes triggers one refetch.
 * Unsubscribes automatically when the role layout unmounts (sign-out).
 */
export function useRealtimeSync(role: Role, enabled = true): void {
  const dispatch = useAppDispatch();
  useEffect(() => {
    if (!enabled || !isBackendConfigured) return;
    let unsubscribe: (() => Promise<void>) | null = null;
    let cancelled = false;
    const pending = new Set<Tag>();
    let timer: ReturnType<typeof setTimeout> | null = null;

    const flush = () => {
      timer = null;
      if (pending.size) dispatch(api.util.invalidateTags([...pending]));
      pending.clear();
    };

    subscribeToTables(TABLES_FOR_ROLE[role], (e) => {
      for (const tag of TAGS_FOR_TABLE[e.tableId as TableId] ?? []) pending.add(tag);
      // Specific app row changed → also refresh that app's detail query.
      if (e.tableId === TABLES.apps) {
        const id = (e.row as { $id?: string }).$id;
        if (id) dispatch(api.util.invalidateTags([{ type: 'App', id }]));
      }
      if (!timer) timer = setTimeout(flush, 250);
    })
      .then((unsub) => {
        if (cancelled) void unsub();
        else unsubscribe = unsub;
      })
      .catch((err) => logger.warn('realtime subscribe failed', err));

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      if (unsubscribe) void unsubscribe();
    };
  }, [role, enabled, dispatch]);
}
