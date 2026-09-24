import { AppwriteException, ID, Permission, Query, Role } from 'node-appwrite';

import { resolveConfig, type DomainConfig } from '../../../src/lib/domain/config';
import { CONFIG_ROW_ID, TABLES, type TableId } from '../../../src/lib/domain/resources';
import type { WithMeta } from '../../../src/lib/domain/types';

import { DATABASE_ID, FnError, type Admin } from './runtime';

export { ID, Permission, Query, Role, TABLES };

type Row<T> = T & WithMeta & { $permissions: string[] };

export async function getRow<T>(admin: Admin, tableId: TableId, rowId: string): Promise<Row<T>> {
  try {
    return (await admin.db.getRow({ databaseId: DATABASE_ID, tableId, rowId })) as unknown as Row<T>;
  } catch (e) {
    if (e instanceof AppwriteException && e.code === 404) throw new FnError('not_found', 'Not found.', 404);
    throw e;
  }
}

export async function getRowOrNull<T>(admin: Admin, tableId: TableId, rowId: string): Promise<Row<T> | null> {
  try {
    return (await admin.db.getRow({ databaseId: DATABASE_ID, tableId, rowId })) as unknown as Row<T>;
  } catch (e) {
    if (e instanceof AppwriteException && e.code === 404) return null;
    throw e;
  }
}

export async function listRows<T>(admin: Admin, tableId: TableId, queries: string[]): Promise<Row<T>[]> {
  const res = await admin.db.listRows({ databaseId: DATABASE_ID, tableId, queries });
  return res.rows as unknown as Row<T>[];
}

export async function countRows(admin: Admin, tableId: TableId, queries: string[]): Promise<number> {
  const res = await admin.db.listRows({ databaseId: DATABASE_ID, tableId, queries: [...queries, Query.limit(1)] });
  return res.total;
}

/** Iterate every matching row with cursor pagination (for cron jobs). */
export async function* iterateRows<T>(admin: Admin, tableId: TableId, queries: string[], pageSize = 100): AsyncGenerator<Row<T>> {
  let cursor: string | null = null;
  for (;;) {
    const page: Row<T>[] = await listRows<T>(admin, tableId, [
      ...queries,
      Query.limit(pageSize),
      ...(cursor ? [Query.cursorAfter(cursor)] : []),
    ]);
    for (const r of page) yield r;
    if (page.length < pageSize) return;
    cursor = page[page.length - 1]!.$id;
  }
}

export async function createRow<T extends object>(
  admin: Admin,
  tableId: TableId,
  data: T,
  permissions: string[],
  rowId: string = ID.unique(),
): Promise<Row<T>> {
  return (await admin.db.createRow({
    databaseId: DATABASE_ID,
    tableId,
    rowId,
    data: data as Record<string, unknown>,
    permissions,
  })) as unknown as Row<T>;
}

export async function updateRow<T extends object>(
  admin: Admin,
  tableId: TableId,
  rowId: string,
  data: Partial<T>,
  permissions?: string[],
): Promise<Row<T>> {
  return (await admin.db.updateRow({
    databaseId: DATABASE_ID,
    tableId,
    rowId,
    data: data as Record<string, unknown>,
    permissions,
  })) as unknown as Row<T>;
}

export async function deleteRow(admin: Admin, tableId: TableId, rowId: string): Promise<void> {
  try {
    await admin.db.deleteRow({ databaseId: DATABASE_ID, tableId, rowId });
  } catch (e) {
    if (!(e instanceof AppwriteException && e.code === 404)) throw e;
  }
}

export async function incrementColumn(admin: Admin, tableId: TableId, rowId: string, column: string, value: number): Promise<void> {
  if (value === 0) return;
  if (value > 0) {
    await admin.db.incrementRowColumn({ databaseId: DATABASE_ID, tableId, rowId, column, value });
  } else {
    await admin.db.decrementRowColumn({ databaseId: DATABASE_ID, tableId, rowId, column, value: -value });
  }
}

export function isConflict(e: unknown): boolean {
  return e instanceof AppwriteException && e.code === 409;
}

export async function loadConfig(admin: Admin): Promise<DomainConfig> {
  const row = await getRowOrNull<Record<keyof DomainConfig, unknown>>(admin, TABLES.config, CONFIG_ROW_ID);
  return resolveConfig(row);
}

/** Row permissions: read-only for each listed user. */
export function readableBy(...userIds: (string | null | undefined)[]): string[] {
  return [...new Set(userIds.filter((u): u is string => !!u))].map((u) => Permission.read(Role.user(u)));
}
