/**
 * Appwrite resource IDs for the app. Shared constants live in `src/lib/domain/resources.ts`
 * (also used by functions + setup scripts); the database id comes from env.
 */
import { env } from '@/lib/env';

export {
  BUCKETS,
  CONFIG_ROW_ID,
  FUNCTIONS,
  TABLES,
  type BucketKey,
  type FunctionId,
  type TableId,
} from '@/lib/domain/resources';
export type { BucketKey as BucketId } from '@/lib/domain/resources';

export const DATABASE_ID = env.appwriteDatabaseId;
