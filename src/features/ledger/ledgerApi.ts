/** Credits (developer) and points (tester) ledgers + leaderboard. Read-only for the client. */
import type { CreditTransaction, CreditTransactionRow, LeaderboardEntry, PointTransaction, PointTransactionRow } from '@/lib/domain/types';
import { toAppError } from '@/lib/errors';
import { callFunction, FUNCTIONS, listRows, Query, TABLES } from '@/services/appwrite';
import { api } from '@/store/api';

export interface Leaderboard {
  period: 'month' | 'all';
  month: string;
  entries: LeaderboardEntry[];
}

export const ledgerApi = api.injectEndpoints({
  endpoints: (build) => ({
    creditHistory: build.query<CreditTransaction[], string>({
      async queryFn(developerId) {
        try {
          return {
            data: await listRows<CreditTransactionRow>(TABLES.creditTransactions, [
              Query.equal('developerId', developerId),
              Query.orderDesc('$createdAt'),
              Query.limit(100),
            ]),
          };
        } catch (e) {
          return { error: toAppError(e) };
        }
      },
      providesTags: ['Credits'],
    }),
    pointHistory: build.query<PointTransaction[], string>({
      async queryFn(testerId) {
        try {
          return {
            data: await listRows<PointTransactionRow>(TABLES.pointTransactions, [
              Query.equal('testerId', testerId),
              Query.orderDesc('$createdAt'),
              Query.limit(100),
            ]),
          };
        } catch (e) {
          return { error: toAppError(e) };
        }
      },
      providesTags: ['Points'],
    }),
    leaderboard: build.query<Leaderboard, 'month' | 'all'>({
      async queryFn(period) {
        try {
          return { data: await callFunction<Leaderboard>(FUNCTIONS.getLeaderboard, { period }) };
        } catch (e) {
          return { error: toAppError(e) };
        }
      },
      providesTags: ['Leaderboard'],
      keepUnusedDataFor: 300,
    }),
  }),
});

export const { useCreditHistoryQuery, usePointHistoryQuery, useLeaderboardQuery } = ledgerApi;
