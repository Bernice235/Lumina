import { Capacitor } from '@capacitor/core';
import { Purchases, PurchasesEntitlementInfo, LOG_LEVEL } from '@revenuecat/purchases-capacitor';
import { User, BillingItem } from '../types';
import { syncUser } from './firebaseService';
import { auth } from './firebase';
import { saveEncryptedSessionUser } from './secureStorage';

export interface PremiumPlan {
  id: 'monthly' | '6month' | 'yearly';
  productId: string;
  name: string;
  priceNGN: number;
  priceFormatted: string;
  description: string;
}

export const REVENUECAT_PLANS: PremiumPlan[] = [
  {
    id: 'monthly',
    productId: 'lumina_premium_monthly',
    name: 'Premium Monthly Sanctuary',
    priceNGN: 4500,
    priceFormatted: '₦4,500 / month',
    description: 'Renewable monthly after setup. Full premium access.'
  },
  {
    id: '6month',
    productId: 'lumina_premium_6month',
    name: 'Premium 6-Month Sanctuary',
    priceNGN: 22500,
    priceFormatted: '₦22,500 / 6 months',
    description: 'Unlock premium advanced features for 6 complete months.'
  },
  {
    id: 'yearly',
    productId: 'lumina_premium_yearly',
    name: 'Premium Yearly Sanctuary',
    priceNGN: 39999,
    priceFormatted: '₦39,999 / year',
    description: 'Our absolute best value. Deep continuous sanctuary sync.'
  }
];

const ENV = (typeof import.meta !== 'undefined' && (import.meta as any).env) || {};
const REVENUECAT_API_KEYS = {
  android: (ENV.VITE_REVENUECAT_ANDROID_KEY as string) || '',
  ios: (ENV.VITE_REVENUECAT_IOS_KEY as string) || '',
};

const ENTITLEMENT_ID = 'Lumina Premium Sanctuary';

async function verifyEntitlementWithServer(payload: {
  provider: 'revenuecat' | 'paystack';
  reference?: string;
  productId?: string;
}): Promise<{
  verified: boolean;
  planId?: 'monthly' | '6month' | 'yearly';
  expirationDate?: string;
  error?: string;
}> {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    return { verified: false, error: 'Sign in with your account before verifying purchases.' };
  }
  const token = await currentUser.getIdToken();
  const res = await fetch('/api/subscription/verify', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data?.verified) {
    return { verified: false, error: data?.error || 'Subscription verification failed.' };
  }
  return {
    verified: true,
    planId: data.planId,
    expirationDate: data.expirationDate,
  };
}

/**
 * Initializes RevenueCat SDK for native mobile platforms.
 */
export const initializeRevenueCat = async (userId: string): Promise<void> => {
  if (!Capacitor.isNativePlatform()) {
    return;
  }

  const isIOS = Capacitor.getPlatform() === 'ios';
  const apiKey = isIOS ? REVENUECAT_API_KEYS.ios : REVENUECAT_API_KEYS.android;
  if (!apiKey) {
    console.warn('RevenueCat public SDK key is not configured for this build.');
    return;
  }

  try {
    await Purchases.setLogLevel({ level: LOG_LEVEL.WARN });
    await Purchases.configure({
      apiKey,
      appUserID: userId
    });
  } catch (err) {
    console.error('Failed to initialize RevenueCat native SDK:', err);
  }
};

/**
 * Performs a real native store purchase or verifies a real web payment reference via backend.
 * Never grants complimentary simulated premium access on web or native bypasses.
 */
export const purchasePremiumPlan = async (
  plan: PremiumPlan,
  currentUser: User,
  setUser: (user: User) => void,
  paymentReference?: string
): Promise<{ success: boolean; error?: string }> => {
  const now = new Date();

  if (!Capacitor.isNativePlatform()) {
    if (!paymentReference) {
      return {
        success: false,
        error: 'Web subscriptions require a verified Paystack or mobile store receipt. Simulated free upgrades are disabled.'
      };
    }

    const serverCheck = await verifyEntitlementWithServer({
      provider: 'paystack',
      reference: paymentReference,
      productId: plan.productId,
    });
    if (!serverCheck.verified) {
      return { success: false, error: serverCheck.error || 'Payment could not be verified.' };
    }

    const daysToAdd = plan.id === 'monthly' ? 30 : plan.id === '6month' ? 180 : 365;
    const expiryDate = serverCheck.expirationDate || new Date(now.getTime() + daysToAdd * 24 * 60 * 60 * 1000).toISOString();
    const newBilling: BillingItem = {
      id: `rc_bill_${Date.now()}`,
      date: now.toISOString(),
      amount: plan.priceNGN,
      currency: 'NGN',
      planName: plan.name,
      status: 'paid',
      reference: paymentReference
    };

    const updatedUser: User = {
      ...currentUser,
      isPremium: true,
      subscriptionPlan: plan.id,
      subscriptionStatus: 'active',
      subscriptionEnd: expiryDate,
      billingHistory: [...(currentUser.billingHistory || []), newBilling]
    };

    setUser(updatedUser);
    await syncUser(updatedUser);
    const rememberMe = localStorage.getItem('lumina_remember_me') !== 'false';
    await saveEncryptedSessionUser(updatedUser, rememberMe);
    return { success: true };
  }

  try {
    const { customerInfo } = await (Purchases as any).purchaseStoreProduct({
      productIdentifier: plan.productId
    });

    const hasActiveEntitlement = customerInfo?.entitlements?.active?.[ENTITLEMENT_ID] !== undefined;
    if (!hasActiveEntitlement) {
      return { success: false, error: 'Store purchase completed without an active entitlement.' };
    }

    // Server-side cross-check when configured; otherwise enforce store-verified CustomerInfo dates
    const serverCheck = await verifyEntitlementWithServer({
      provider: 'revenuecat',
      productId: plan.productId,
    }).catch(() => null);

    const entitlement: PurchasesEntitlementInfo = customerInfo.entitlements.active[ENTITLEMENT_ID];
    const expirationDate = serverCheck?.expirationDate
      ? new Date(serverCheck.expirationDate)
      : entitlement.expirationDate
        ? new Date(entitlement.expirationDate)
        : new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const newBilling: BillingItem = {
      id: `rc_native_${Date.now()}`,
      date: now.toISOString(),
      amount: plan.priceNGN,
      currency: 'NGN',
      planName: plan.name,
      status: 'paid',
      reference: customerInfo.originalAppUserId || 'rc_native'
    };

    const updatedUser: User = {
      ...currentUser,
      isPremium: true,
      subscriptionPlan: plan.id,
      subscriptionStatus: 'active',
      subscriptionEnd: expirationDate.toISOString(),
      billingHistory: [...(currentUser.billingHistory || []), newBilling]
    };

    setUser(updatedUser);
    await syncUser(updatedUser);
    const rememberMe = localStorage.getItem('lumina_remember_me') !== 'false';
    await saveEncryptedSessionUser(updatedUser, rememberMe);
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Native purchase cancelled or failed.' };
  }
};

/**
 * Restores real purchases from App Store / Google Play on native devices or checks server-verified RevenueCat state on web.
 */
export const restorePremiumPurchases = async (
  currentUser: User,
  setUser: (user: User) => void
): Promise<{ success: boolean; restored: boolean; error?: string }> => {
  const now = new Date();

  if (!Capacitor.isNativePlatform()) {
    const serverCheck = await verifyEntitlementWithServer({ provider: 'revenuecat' });
    if (!serverCheck.verified) {
      return {
        success: false,
        restored: false,
        error: serverCheck.error || 'No verified cloud subscription found for this account.'
      };
    }

    const updatedUser: User = {
      ...currentUser,
      isPremium: true,
      subscriptionPlan: serverCheck.planId || 'monthly',
      subscriptionStatus: 'active',
      subscriptionEnd: serverCheck.expirationDate || new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString()
    };

    setUser(updatedUser);
    await syncUser(updatedUser);
    const rememberMe = localStorage.getItem('lumina_remember_me') !== 'false';
    await saveEncryptedSessionUser(updatedUser, rememberMe);
    return { success: true, restored: true };
  }

  try {
    const { customerInfo } = await (Purchases as any).restorePurchases();
    const hasActiveEntitlement = customerInfo?.entitlements?.active?.[ENTITLEMENT_ID] !== undefined;

    if (hasActiveEntitlement) {
      const entitlement = customerInfo.entitlements.active[ENTITLEMENT_ID];
      const expirationDate = entitlement.expirationDate
        ? new Date(entitlement.expirationDate)
        : new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

      let planId: 'monthly' | '6month' | 'yearly' = 'monthly';
      if (entitlement.productIdentifier === 'lumina_premium_6month') planId = '6month';
      else if (entitlement.productIdentifier === 'lumina_premium_yearly') planId = 'yearly';

      const updatedUser: User = {
        ...currentUser,
        isPremium: true,
        subscriptionPlan: planId,
        subscriptionStatus: 'active',
        subscriptionEnd: expirationDate.toISOString()
      };

      setUser(updatedUser);
      await syncUser(updatedUser);
      const rememberMe = localStorage.getItem('lumina_remember_me') !== 'false';
      await saveEncryptedSessionUser(updatedUser, rememberMe);
      return { success: true, restored: true };
    }

    return { success: true, restored: false };
  } catch (err: any) {
    return { success: false, restored: false, error: err?.message || 'Restore process failed.' };
  }
};

/**
 * Validates current subscription expiration and native RevenueCat entitlement status.
 */
export const syncActiveSubscriptionStatus = async (
  currentUser: User,
  setUser: (user: User) => void
): Promise<User> => {
  const now = new Date();

  if (currentUser.isPremium && currentUser.subscriptionEnd) {
    const exp = new Date(currentUser.subscriptionEnd);
    if (!isNaN(exp.getTime()) && now > exp) {
      const downgradedUser: User = {
        ...currentUser,
        isPremium: false,
        subscriptionStatus: 'failed',
        subscriptionPlan: 'free'
      };
      setUser(downgradedUser);
      await syncUser(downgradedUser);
      const rememberMe = localStorage.getItem('lumina_remember_me') !== 'false';
      await saveEncryptedSessionUser(downgradedUser, rememberMe);
      return downgradedUser;
    }
  }

  if (!Capacitor.isNativePlatform()) {
    return currentUser;
  }

  try {
    const { customerInfo } = await (Purchases as any).getCustomerInfo();
    const hasActiveEntitlement = customerInfo?.entitlements?.active?.[ENTITLEMENT_ID] !== undefined;

    if (!hasActiveEntitlement && currentUser.isPremium) {
      const downgradedUser: User = {
        ...currentUser,
        isPremium: false,
        subscriptionStatus: 'failed',
        subscriptionPlan: 'free'
      };
      setUser(downgradedUser);
      await syncUser(downgradedUser);
      const rememberMe = localStorage.getItem('lumina_remember_me') !== 'false';
      await saveEncryptedSessionUser(downgradedUser, rememberMe);
      return downgradedUser;
    } else if (hasActiveEntitlement) {
      const entitlement = customerInfo.entitlements.active[ENTITLEMENT_ID];
      const expirationDate = entitlement.expirationDate
        ? new Date(entitlement.expirationDate)
        : new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

      let planId: 'monthly' | '6month' | 'yearly' = 'monthly';
      if (entitlement.productIdentifier === 'lumina_premium_6month') planId = '6month';
      else if (entitlement.productIdentifier === 'lumina_premium_yearly') planId = 'yearly';

      const updatedUser: User = {
        ...currentUser,
        isPremium: true,
        subscriptionPlan: planId,
        subscriptionStatus: 'active',
        subscriptionEnd: expirationDate.toISOString()
      };

      setUser(updatedUser);
      await syncUser(updatedUser);
      const rememberMe = localStorage.getItem('lumina_remember_me') !== 'false';
      await saveEncryptedSessionUser(updatedUser, rememberMe);
      return updatedUser;
    }
  } catch (err) {
    console.error('Failed to check native RevenueCat status:', err);
  }

  return currentUser;
};
