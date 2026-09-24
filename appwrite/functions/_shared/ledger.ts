/**
 * Append-only ledgers. Every balance change is a ledger row with a unique `idempotencyKey`
 * FIRST, then an atomic increment on the profile. A retried request hits the unique index (409)
 * and becomes a no-op, so credits/points can never be double-applied.
 */
import { AppwriteException } from 'node-appwrite';

import type { CreditTxType, PointTxType } from '../../../src/lib/domain/types';

import { createRow, deleteRow, incrementColumn, isConflict, readableBy, TABLES } from './db';
import { DATABASE_ID, FnError, type Admin } from './runtime';

export interface LedgerResult {
  applied: boolean;
}

export async function applyCredits(
  admin: Admin,
  p: { developerId: string; amount: number; type: CreditTxType; refId?: string | null; note?: string | null; idempotencyKey: string },
): Promise<LedgerResult> {
  let txId: string;
  try {
    const tx = await createRow(
      admin,
      TABLES.creditTransactions,
      {
        developerId: p.developerId,
        amount: p.amount,
        type: p.type,
        refId: p.refId ?? null,
        note: p.note ?? null,
        idempotencyKey: p.idempotencyKey,
      },
      readableBy(p.developerId),
    );
    txId = tx.$id;
  } catch (e) {
    if (isConflict(e)) return { applied: false };
    throw e;
  }

  try {
    if (p.amount >= 0) {
      await incrementColumn(admin, TABLES.profiles, p.developerId, 'credits', p.amount);
    } else {
      // `min: 0` makes the decrement atomic: Appwrite rejects it if the balance would go negative.
      await admin.db.decrementRowColumn({
        databaseId: DATABASE_ID,
        tableId: TABLES.profiles,
        rowId: p.developerId,
        column: 'credits',
        value: -p.amount,
        min: 0,
      });
    }
  } catch (e) {
    // Compensate so the ledger never shows a movement that didn't happen.
    await deleteRow(admin, TABLES.creditTransactions, txId);
    if (e instanceof AppwriteException && p.amount < 0) {
      throw new FnError('insufficient_credits', 'Not enough credits. Top up to continue.', 402);
    }
    throw e;
  }
  return { applied: true };
}

export async function applyPoints(
  admin: Admin,
  p: { testerId: string; amount: number; type: PointTxType; refId?: string | null; note?: string | null; idempotencyKey: string },
): Promise<LedgerResult> {
  let txId: string;
  try {
    const tx = await createRow(
      admin,
      TABLES.pointTransactions,
      {
        testerId: p.testerId,
        amount: p.amount,
        type: p.type,
        refId: p.refId ?? null,
        note: p.note ?? null,
        idempotencyKey: p.idempotencyKey,
      },
      readableBy(p.testerId),
    );
    txId = tx.$id;
  } catch (e) {
    if (isConflict(e)) return { applied: false };
    throw e;
  }
  try {
    await incrementColumn(admin, TABLES.profiles, p.testerId, 'points', p.amount);
  } catch (e) {
    await deleteRow(admin, TABLES.pointTransactions, txId);
    throw e;
  }
  return { applied: true };
}
