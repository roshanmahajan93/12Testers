/**
 * Idempotent Appwrite setup: database, tables, columns, indexes, buckets and the config row.
 * Safe to re-run — existing resources are skipped (409), new columns/indexes are added.
 *
 *   APPWRITE_API_KEY=... npm run setup:appwrite
 *
 * Reads EXPO_PUBLIC_APPWRITE_ENDPOINT / _PROJECT_ID / _DATABASE_ID from .env(.local).
 * The API key needs databases.*, tables.*, columns.*, indexes.*, rows.*, buckets.* scopes.
 */
import { config as loadEnv } from 'dotenv';
import {
  AppwriteException,
  Client,
  Compression,
  OrderBy,
  Permission,
  Role,
  Storage,
  TablesDB,
  TablesDBIndexType,
} from 'node-appwrite';

import { BUCKET_DEFS, TABLE_DEFS, type Column, type TableDef } from '../appwrite/schema';
import { DEFAULT_CONFIG } from '../src/lib/domain/config';
import { CONFIG_ROW_ID, TABLES } from '../src/lib/domain/resources';

loadEnv({ path: ['.env.local', '.env'], quiet: true });

const endpoint = process.env.EXPO_PUBLIC_APPWRITE_ENDPOINT;
const projectId = process.env.EXPO_PUBLIC_APPWRITE_PROJECT_ID;
const databaseId = process.env.EXPO_PUBLIC_APPWRITE_DATABASE_ID ?? 'main';
const apiKey = process.env.APPWRITE_API_KEY;

if (!endpoint || !projectId || !apiKey) {
  console.error('Set EXPO_PUBLIC_APPWRITE_ENDPOINT, EXPO_PUBLIC_APPWRITE_PROJECT_ID and APPWRITE_API_KEY.');
  process.exit(1);
}

const client = new Client().setEndpoint(endpoint).setProject(projectId).setKey(apiKey);
const db = new TablesDB(client);
const storage = new Storage(client);

async function ignoreExists<T>(label: string, fn: () => Promise<T>): Promise<'created' | 'exists'> {
  try {
    await fn();
    console.log(`  + ${label}`);
    return 'created';
  } catch (e) {
    if (e instanceof AppwriteException && e.code === 409) return 'exists';
    throw e;
  }
}

async function createColumn(tableId: string, c: Column): Promise<void> {
  const base = { databaseId, tableId, key: c.key, required: c.required ?? false };
  const label = `column ${tableId}.${c.key}`;
  switch (c.type) {
    case 'varchar':
      await ignoreExists(label, () =>
        db.createVarcharColumn({ ...base, size: c.size, xdefault: c.default, array: c.array ?? false }),
      );
      break;
    case 'text':
      await ignoreExists(label, () => db.createTextColumn({ ...base, xdefault: c.default }));
      break;
    case 'integer':
      await ignoreExists(label, () =>
        db.createIntegerColumn({ ...base, min: c.min, max: c.max, xdefault: c.required ? undefined : c.default }),
      );
      break;
    case 'float':
      await ignoreExists(label, () =>
        db.createFloatColumn({ ...base, min: c.min, max: c.max, xdefault: c.required ? undefined : c.default }),
      );
      break;
    case 'boolean':
      await ignoreExists(label, () => db.createBooleanColumn({ ...base, xdefault: c.required ? undefined : c.default }));
      break;
    case 'datetime':
      await ignoreExists(label, () => db.createDatetimeColumn(base));
      break;
    case 'enum':
      await ignoreExists(label, () =>
        db.createEnumColumn({ ...base, elements: [...c.elements], xdefault: c.required ? undefined : c.default }),
      );
      break;
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Columns are created asynchronously; indexes fail until they are `available`. */
async function waitForColumns(tableId: string): Promise<void> {
  for (let i = 0; i < 60; i++) {
    const { columns } = await db.listColumns({ databaseId, tableId });
    const pending = (columns as { status: string }[]).filter((c) => c.status !== 'available');
    if (pending.length === 0) return;
    await sleep(1000);
  }
  throw new Error(`Timed out waiting for columns on ${tableId}`);
}

function tablePermissions(t: TableDef): string[] {
  return t.permissions.read === 'users' ? [Permission.read(Role.users())] : [];
}

async function setupTable(t: TableDef): Promise<void> {
  console.log(`table ${t.id}`);
  const created = await ignoreExists(`table ${t.id}`, () =>
    db.createTable({ databaseId, tableId: t.id, name: t.name, permissions: tablePermissions(t), rowSecurity: t.rowSecurity }),
  );
  if (created === 'exists') {
    await db.updateTable({ databaseId, tableId: t.id, name: t.name, permissions: tablePermissions(t), rowSecurity: t.rowSecurity });
  }
  for (const c of t.columns) await createColumn(t.id, c);
  await waitForColumns(t.id);
  for (const idx of t.indexes) {
    await ignoreExists(`index ${t.id}.${idx.key}`, () =>
      db.createIndex({
        databaseId,
        tableId: t.id,
        key: idx.key,
        type:
          idx.type === 'unique'
            ? TablesDBIndexType.Unique
            : idx.type === 'fulltext'
              ? TablesDBIndexType.Fulltext
              : TablesDBIndexType.Key,
        columns: idx.columns,
        orders: idx.orders?.map((o) => (o === 'DESC' ? OrderBy.Desc : OrderBy.Asc)),
      }),
    );
  }
}

async function setupBuckets(): Promise<void> {
  for (const b of BUCKET_DEFS) {
    const create = b.createLabel === 'users' ? Role.users() : Role.label(b.createLabel);
    const params = {
      bucketId: b.id,
      name: b.name,
      permissions: [Permission.create(create)],
      fileSecurity: true,
      enabled: true,
      maximumFileSize: b.maxBytes,
      allowedFileExtensions: b.extensions,
      compression: Compression.None,
      encryption: false,
      antivirus: true,
      transformations: true,
    };
    const res = await ignoreExists(`bucket ${b.id}`, () => storage.createBucket(params));
    if (res === 'exists') await storage.updateBucket(params);
  }
}

async function setupConfigRow(): Promise<void> {
  try {
    await db.getRow({ databaseId, tableId: TABLES.config, rowId: CONFIG_ROW_ID });
    console.log('config row exists — leaving live values untouched');
  } catch (e) {
    if (!(e instanceof AppwriteException && e.code === 404)) throw e;
    await db.createRow({ databaseId, tableId: TABLES.config, rowId: CONFIG_ROW_ID, data: { ...DEFAULT_CONFIG } });
    console.log('  + config row (defaults)');
  }
}

async function main(): Promise<void> {
  console.log(`Appwrite ${endpoint} project=${projectId} db=${databaseId}`);
  await ignoreExists(`database ${databaseId}`, () => db.create({ databaseId, name: '12Testers' }));
  for (const t of TABLE_DEFS) await setupTable(t);
  await setupBuckets();
  await setupConfigRow();
  console.log('✔ Appwrite setup complete');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
