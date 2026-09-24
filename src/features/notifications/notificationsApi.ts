import type { AppNotification, NotificationData, NotificationRow } from '@/lib/domain/types';
import { toAppError } from '@/lib/errors';
import { listRows, Query, TABLES, updateOwnRow } from '@/services/appwrite';
import { api } from '@/store/api';
import { useAppSelector } from '@/store/hooks';

export function parseNotificationData(raw: string | null): NotificationData {
  if (!raw) return {};
  try {
    return JSON.parse(raw) as NotificationData;
  } catch {
    return {};
  }
}

export const notificationsApi = api.injectEndpoints({
  endpoints: (build) => ({
    notifications: build.query<AppNotification[], string>({
      async queryFn(userId) {
        try {
          return {
            data: await listRows<NotificationRow>(TABLES.notifications, [
              Query.equal('userId', userId),
              Query.orderDesc('$createdAt'),
              Query.limit(60),
            ]),
          };
        } catch (e) {
          return { error: toAppError(e) };
        }
      },
      providesTags: ['Notifications'],
    }),
    markRead: build.mutation<null, { userId: string; ids: string[] }>({
      async queryFn({ ids }) {
        try {
          await Promise.all(ids.map((id) => updateOwnRow(TABLES.notifications, id, { read: true })));
          return { data: null };
        } catch (e) {
          return { error: toAppError(e) };
        }
      },
      // Optimistic read state with rollback.
      async onQueryStarted({ userId, ids }, { dispatch, queryFulfilled }) {
        const patch = dispatch(
          notificationsApi.util.updateQueryData('notifications', userId, (draft) => {
            for (const n of draft) if (ids.includes(n.$id)) n.read = true;
          }),
        );
        try {
          await queryFulfilled;
        } catch {
          patch.undo();
        }
      },
    }),
  }),
});

export const { useNotificationsQuery, useMarkReadMutation } = notificationsApi;

export function useUnreadCount(): number {
  const userId = useAppSelector((s) => s.auth.userId);
  const { data } = useNotificationsQuery(userId ?? '', { skip: !userId });
  return (data ?? []).filter((n) => !n.read).length;
}
