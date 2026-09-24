import { Query } from 'react-native-appwrite';

import type { WithMeta } from '@/lib/domain/types';

import { tables } from './client';
import { DATABASE_ID, type TableId } from './ids';

export { Query };

/**
 * Typed read helpers over TablesDB. The client only READS rows — every write that touches
 * business state goes through an Appwrite Function (see functions.ts).
 */
export async function listRows<T>(tableId: TableId, queries: string[] = []): Promise<(T & WithMeta)[]> {
  const res = await tables.listRows({ databaseId: DATABASE_ID, tableId, queries });
  return res.rows as unknown as (T & WithMeta)[];
}

export async function listRowsWithTotal<T>(
  tableId: TableId,
  queries: string[] = [],
): Promise<{ rows: (T & WithMeta)[]; total: number }> {
  const res = await tables.listRows({ databaseId: DATABASE_ID, tableId, queries });
  return { rows: res.rows as unknown as (T & WithMeta)[], total: res.total };
}

export async function getRow<T>(tableId: TableId, rowId: string): Promise<T & WithMeta> {
  const row = await tables.getRow({ databaseId: DATABASE_ID, tableId, rowId });
  return row as unknown as T & WithMeta;
}

export async function getRowOrNull<T>(tableId: TableId, rowId: string): Promise<(T & WithMeta) | null> {
  try {
    return await getRow<T>(tableId, rowId);
  } catch (e) {
    if ((e as { code?: number }).code === 404) return null;
    throw e;
  }
}

/** The only client-side write: flipping the `read` flag on the user's own notifications. */
export async function updateOwnRow(tableId: TableId, rowId: string, data: Record<string, unknown>): Promise<void> {
  await tables.updateRow({ databaseId: DATABASE_ID, tableId, rowId, data });
}
