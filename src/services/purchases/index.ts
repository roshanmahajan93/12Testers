import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import Purchases, {
  LOG_LEVEL,
  type CustomerInfo,
  type PurchasesOffering,
  type PurchasesPackage,
} from 'react-native-purchases';

import { PRO_ENTITLEMENT } from '@/lib/constants';
import { env } from '@/lib/env';
import type { AppError } from '@/lib/errors';
import { logger } from '@/services/logger';

/**
 * RevenueCat wrapper — developer role only. Credits are NEVER granted client-side: the
 * RevenueCat webhook → `revenuecatWebhook` function writes the ledger. The app just refetches.
 */

let configuredFor: string | null = null;

function apiKey(): string {
  return Platform.OS === 'ios' ? env.revenueCatIosKey : env.revenueCatAndroidKey;
}

export function isPurchasesAvailable(): boolean {
  return Boolean(apiKey()) && Platform.OS !== 'web';
}

/** Configure once and identify with the Appwrite user id so webhooks carry `app_user_id`. */
export async function initPurchases(appwriteUserId: string): Promise<void> {
  if (!isPurchasesAvailable() || configuredFor === appwriteUserId) return;
  try {
    if (__DEV__) void Purchases.setLogLevel(LOG_LEVEL.WARN);
    if (!(await Purchases.isConfigured())) {
      Purchases.configure({ apiKey: apiKey(), appUserID: appwriteUserId });
    } else {
      await Purchases.logIn(appwriteUserId);
    }
    configuredFor = appwriteUserId;
  } catch (e) {
    logger.error('RevenueCat init failed', e);
  }
}

export async function logoutPurchases(): Promise<void> {
  if (!configuredFor) return;
  configuredFor = null;
  try {
    await Purchases.logOut();
  } catch {
    // Anonymous user already — ignore.
  }
}

export async function getCurrentOffering(): Promise<PurchasesOffering | null> {
  const offerings = await Purchases.getOfferings();
  return offerings.current;
}

export type PurchaseOutcome = { status: 'purchased'; customerInfo: CustomerInfo } | { status: 'cancelled' };

export async function buyPackage(pkg: PurchasesPackage): Promise<PurchaseOutcome> {
  try {
    const { customerInfo } = await Purchases.purchasePackage(pkg);
    return { status: 'purchased', customerInfo };
  } catch (e) {
    if ((e as { userCancelled?: boolean | null }).userCancelled) return { status: 'cancelled' };
    const err: AppError = { code: 'purchase_failed', message: (e as Error).message ?? 'Purchase failed.' };
    throw err;
  }
}

export async function restorePurchases(): Promise<CustomerInfo> {
  return Purchases.restorePurchases();
}

export function hasEntitlement(info: CustomerInfo | null, id = PRO_ENTITLEMENT): boolean {
  return Boolean(info?.entitlements.active[id]);
}

/** Live entitlement check (RevenueCat pushes CustomerInfo updates after purchases/restores). */
export function useEntitlement(id = PRO_ENTITLEMENT): { active: boolean; loading: boolean } {
  const [state, setState] = useState<{ active: boolean; loading: boolean }>(() => ({
    active: false,
    loading: isPurchasesAvailable() && configuredFor !== null,
  }));
  useEffect(() => {
    if (!isPurchasesAvailable() || !configuredFor) return;
    let alive = true;
    const listener = (info: CustomerInfo) => alive && setState({ active: hasEntitlement(info, id), loading: false });
    Purchases.getCustomerInfo()
      .then(listener)
      .catch(() => alive && setState({ active: false, loading: false }));
    Purchases.addCustomerInfoUpdateListener(listener);
    return () => {
      alive = false;
      Purchases.removeCustomerInfoUpdateListener(listener);
    };
  }, [id]);
  return state;
}

export type { PurchasesOffering, PurchasesPackage };
