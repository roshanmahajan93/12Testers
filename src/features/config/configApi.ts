import { DEFAULT_CONFIG, resolveConfig, type DomainConfig } from '@/lib/domain/config';
import { toAppError } from '@/lib/errors';
import { CONFIG_ROW_ID, getRowOrNull, TABLES } from '@/services/appwrite';
import { api } from '@/store/api';

export const configApi = api.injectEndpoints({
  endpoints: (build) => ({
    getConfig: build.query<DomainConfig, void>({
      async queryFn() {
        try {
          const row = await getRowOrNull<Record<keyof DomainConfig, unknown>>(TABLES.config, CONFIG_ROW_ID);
          return { data: resolveConfig(row) };
        } catch (e) {
          return { error: toAppError(e) };
        }
      },
      providesTags: ['Config'],
      keepUnusedDataFor: 3600,
    }),
  }),
});

/** Tunable business rules from the server `config` row, with defaults while loading. */
export function useDomainConfig(): DomainConfig {
  const { data } = configApi.useGetConfigQuery();
  return data ?? DEFAULT_CONFIG;
}
