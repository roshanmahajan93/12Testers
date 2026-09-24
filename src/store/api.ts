import { createApi, fakeBaseQuery } from '@reduxjs/toolkit/query/react';

import type { AppError } from '@/lib/errors';

export const TAG_TYPES = [
  'Apps',
  'App',
  'TestPlan',
  'Enrollments',
  'DailyTasks',
  'Feedback',
  'Profile',
  'Credits',
  'Points',
  'Notifications',
  'Config',
  'Leaderboard',
] as const;

/**
 * One base API. Features add endpoints with `api.injectEndpoints` and implement them with
 * `queryFn` calling `src/services/appwrite` (never the Appwrite SDK directly).
 */
export const api = createApi({
  reducerPath: 'api',
  baseQuery: fakeBaseQuery<AppError>(),
  tagTypes: TAG_TYPES,
  refetchOnReconnect: true,
  refetchOnFocus: true,
  keepUnusedDataFor: 120,
  endpoints: () => ({}),
});
