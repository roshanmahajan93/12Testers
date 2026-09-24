/**
 * In-memory stand-in for the parts of node-appwrite the lifecycle helpers use. It understands the
 * JSON queries produced by `Query.*` and enforces the unique indexes declared in appwrite/schema.ts,
 * so idempotency (409 on duplicates) behaves like the real server.
 */
import { AppwriteException } from 'node-appwrite';

import { TABLE_DEFS } from '../../schema';
import type { Admin } from '../_shared/runtime';

type Row = Record<string, unknown> & { $id: string; $createdAt: string; $updatedAt: string; $permissions: string[] };

interface ParsedQuery {
  method: string;
  attribute?: string;
  values?: unknown[];
}

let clock = Date.parse('2026-05-01T00:00:00Z');
const tick = () => new Date((clock += 1000)).toISOString();

export class FakeTables {
  tables = new Map<string, Map<string, Row>>();
  private seq = 0;

  table(id: string): Map<string, Row> {
    let t = this.tables.get(id);
    if (!t) {
      t = new Map();
      this.tables.set(id, t);
    }
    return t;
  }

  rows(id: string): Row[] {
    return [...this.table(id).values()];
  }

  private assertUnique(tableId: string, row: Row, ignoreId?: string) {
    const def = TABLE_DEFS.find((t) => t.id === tableId);
    for (const idx of def?.indexes ?? []) {
      if (idx.type !== 'unique') continue;
      const clash = this.rows(tableId).find((r) => r.$id !== ignoreId && idx.columns.every((c) => r[c] === row[c]));
      if (clash) throw new AppwriteException(`Duplicate ${idx.key}`, 409, 'row_already_exists');
    }
  }

  async createRow(p: { tableId: string; rowId: string; data: Record<string, unknown>; permissions?: string[] }) {
    const t = this.table(p.tableId);
    const $id = p.rowId === 'unique()' ? `row${++this.seq}` : p.rowId;
    if (t.has($id)) throw new AppwriteException('Row exists', 409, 'row_already_exists');
    const now = tick();
    const row: Row = { ...p.data, $id, $createdAt: now, $updatedAt: now, $permissions: p.permissions ?? [] };
    this.assertUnique(p.tableId, row);
    t.set($id, row);
    return { ...row };
  }

  async getRow(p: { tableId: string; rowId: string }) {
    const row = this.table(p.tableId).get(p.rowId);
    if (!row) throw new AppwriteException('Not found', 404, 'row_not_found');
    return { ...row };
  }

  async updateRow(p: { tableId: string; rowId: string; data: Record<string, unknown>; permissions?: string[] }) {
    const row = this.table(p.tableId).get(p.rowId);
    if (!row) throw new AppwriteException('Not found', 404, 'row_not_found');
    const next: Row = { ...row, ...p.data, $updatedAt: tick(), $permissions: p.permissions ?? row.$permissions };
    this.assertUnique(p.tableId, next, row.$id);
    this.table(p.tableId).set(row.$id, next);
    return { ...next };
  }

  async deleteRow(p: { tableId: string; rowId: string }) {
    if (!this.table(p.tableId).delete(p.rowId)) throw new AppwriteException('Not found', 404, 'row_not_found');
    return {};
  }

  async incrementRowColumn(p: { tableId: string; rowId: string; column: string; value?: number }) {
    const row = await this.getRow(p);
    return this.updateRow({ ...p, data: { [p.column]: Number(row[p.column] ?? 0) + (p.value ?? 1) } });
  }

  async decrementRowColumn(p: { tableId: string; rowId: string; column: string; value?: number; min?: number }) {
    const row = await this.getRow(p);
    const next = Number(row[p.column] ?? 0) - (p.value ?? 1);
    if (p.min !== undefined && next < p.min) throw new AppwriteException('Below minimum', 400, 'column_value_invalid');
    return this.updateRow({ ...p, data: { [p.column]: next } });
  }

  async listRows(p: { tableId: string; queries?: string[] }) {
    const qs = (p.queries ?? []).map((q) => JSON.parse(q) as ParsedQuery);
    let rows = this.rows(p.tableId);
    for (const q of qs) {
      const a = q.attribute ?? '';
      const v = q.values ?? [];
      const cmp = (fn: (x: never, y: never) => boolean) => (rows = rows.filter((r) => fn(r[a] as never, v[0] as never)));
      switch (q.method) {
        case 'equal':
          rows = rows.filter((r) => v.includes(r[a]));
          break;
        case 'lessThan':
          cmp((x, y) => x < y);
          break;
        case 'lessThanEqual':
          cmp((x, y) => x <= y);
          break;
        case 'greaterThan':
          cmp((x, y) => x > y);
          break;
        case 'greaterThanEqual':
          cmp((x, y) => x >= y);
          break;
        case 'orderAsc':
          rows = [...rows].sort((x, y) => (String(x[a]) < String(y[a]) ? -1 : 1));
          break;
        case 'orderDesc':
          rows = [...rows].sort((x, y) => (String(x[a]) > String(y[a]) ? -1 : 1));
          break;
      }
    }
    const cursor = qs.find((q) => q.method === 'cursorAfter')?.values?.[0];
    if (cursor) rows = rows.slice(rows.findIndex((r) => r.$id === cursor) + 1);
    const total = rows.length;
    const limit = qs.find((q) => q.method === 'limit')?.values?.[0];
    if (typeof limit === 'number') rows = rows.slice(0, limit);
    return { total, rows: rows.map((r) => ({ ...r })) };
  }
}

export interface SentPush {
  users: string[];
  title?: string;
  body?: string;
  data?: Record<string, string>;
}

export function fakeAdmin(): { admin: Admin; db: FakeTables; pushes: SentPush[] } {
  const db = new FakeTables();
  const pushes: SentPush[] = [];
  // Appwrite Messaging (FCM) is a network call — capture instead.
  const messaging = {
    createPush: jest.fn(async (p: SentPush) => {
      pushes.push(p);
      return {};
    }),
  };
  const admin = { db, users: {}, storage: {}, client: {}, messaging } as unknown as Admin;
  return { admin, db, pushes };
}
