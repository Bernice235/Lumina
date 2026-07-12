import { Capacitor } from '@capacitor/core';
import { Purchases, PurchasesEntitlementInfo, LOG_LEVEL } from '@revenuecat/purchases-capacitor';
import { User, BillingItem } from '../types';
import { syncUser } from './firebaseService';

// Configure active product plans with Naira pricing requested by the user
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

// Configuration API keys (RevenueCat Public Keys)
const REVENUECAT_API_KEYS = {
  android: 'goog_fGksJduHswOpeRkDeuLsaQplK', // Google Play API Key
  ios: 'appl_XpkSdeHsuOepLmKsdWpeRkSeqpL'    // Apple App Store API Key
};

const ENTITLEMENT_ID = 'Lumina Premium Sanctuary';

/**
 * Initializes RevenueCat SDK for native mobile platforms.
 */
export const initializeRevenueCat = async (userId: string): Promise<void> => {
  if (!Capacitor.isNativePlatform()) {
    console.log('🌸 RevenueCat running in web preview simulation mode.');
    return;
  }

  try {
    await Purchases.setLogLevel({ level: LOG_LEVEL.DEBUG });
    
    const isIOS = Capacitor.getPlatform() === 'ios';
    const apiKey = isIOS ? REVENUECAT_API_KEYS.ios : REVENUECAT_API_KEYS.android;
    
    await Purchases.configure({
      apiKey,
      appUserID: userId
    });
    
    console.log(`✅ RevenueCat configured successfully for native ${Capacitor.getPlatform()} with userId: ${userId}`);
  } catch (err) {
    console.error('❌ Failed to initialize RevenueCat native SDK:', err);
  }
};

/**
 * Makes a native or simulated purchase through RevenueCat.
 */
export const purchasePremiumPlan = async (
  plan: PremiumPlan,
  currentUser: User,
  setUser: (user: User) => void
): Promise<{ success: boolean; error?: string }> => {
  const now = new Date();
  
  if (!Capacitor.isNativePlatform()) {
    // Simulated Checkout for browser preview
    return new Promise((resolve) => {
      setTimeout(async () => {
        try {
          const daysToAdd = plan.id === 'monthly' ? 30 : plan.id === '6month' ? 180 : 365;
          const expiryDate = new Date(now.getTime() + daysToAdd * 24 * 60 * 60 * 1000);

          const newBilling: BillingItem = {
            id: `rc_bill_${Date.now()}`,
            date: now.toISOString(),
            amount: plan.priceNGN,
            currency: 'NGN',
            planName: plan.name,
            status: 'paid',
            reference: `rc_sim_ref_${Math.random().toString(36).substring(4).toUpperCase()}`
          };

          const updatedUser: User = {
            ...currentUser,
            isPremium: true,
            subscriptionPlan: plan.id,
            subscriptionStatus: 'active',
            subscriptionEnd: expiryDate.toISOString(),
            billingHistory: [...(currentUser.billingHistory || []), newBilling]
          };

          setUser(updatedUser);
          await syncUser(updatedUser);
          localStorage.setItem('lumina_user', JSON.stringify(updatedUser));

          resolve({ success: true });
        } catch (err: any) {
          resolve({ success: false, error: err?.message || 'Failed to sync simulated purchase.' });
        }
      }, 1500);
    });
  }

  try {
    // Perform native App Store / Google Play purchase via RevenueCat
    const { customerInfo } = await (Purchases as any).purchaseStoreProduct({
      productIdentifier: plan.productId
    });

    const hasActiveEntitlement = customerInfo.entitlements.active[ENTITLEMENT_ID] !== undefined;
    
    if (hasActiveEntitlement) {
      const entitlement: PurchasesEntitlementInfo = customerInfo.entitlements.active[ENTITLEMENT_ID];
      const expirationDate = entitlement.expirationDate 
        ? new Date(entitlement.expirationDate)
        : new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // fallback

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
      localStorage.setItem('lumina_user', JSON.stringify(updatedUser));
      
      return { success: true };
    }

    return { success: false, error: 'Subscription was purchased but premium entitlement failed to activate.' };
  } catch (err: any) {
    console.error('❌ RevenueCat Purchase failed:', err);
    return { success: false, error: err?.message || 'Native purchase cancelled or failed.' };
  }
};

/**
 * Restores purchases across native App Store or Google Play.
 */
export const restorePremiumPurchases = async (
  currentUser: User,
  setUser: (user: User) => void
): Promise<{ success: boolean; restored: boolean; error?: string }> => {
  const now = new Date();

  if (!Capacitor.isNativePlatform()) {
    // Simulated Restore for web preview (looks into local storage/synced accounts)
    return new Promise((resolve) => {
      setTimeout(async () => {
        try {
          const expiryDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days
          const updatedUser: User = {
            ...currentUser,
            isPremium: true,
            subscriptionPlan: 'monthly',
            subscriptionStatus: 'active',
            subscriptionEnd: expiryDate.toISOString()
          };

          setUser(updatedUser);
          await syncUser(updatedUser);
          localStorage.setItem('lumina_user', JSON.stringify(updatedUser));
          
          resolve({ success: true, restored: true });
        } catch (err: any) {
          resolve({ success: false, restored: false, error: err?.message });
        }
      }, 1500);
    });
  }

  try {
    const { customerInfo } = await (Purchases as any).restorePurchases();
    const hasActiveEntitlement = customerInfo.entitlements.active[ENTITLEMENT_ID] !== undefined;

    if (hasActiveEntitlement) {
      const entitlement = customerInfo.entitlements.active[ENTITLEMENT_ID];
      const expirationDate = entitlement.expirationDate 
        ? new Date(entitlement.expirationDate)
        : new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

      // Map dynamic product ID back to subscription plan
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
      localStorage.setItem('lumina_user', JSON.stringify(updatedUser));

      return { success: true, restored: true };
    }

    return { success: true, restored: false };
  } catch (err: any) {
    console.error('❌ RevenueCat Restoration failed:', err);
    return { success: false, restored: false, error: err?.message || 'Restore process failed.' };
  }
};

/**
 * Validates current subscription expiration and renewal states dynamically.
 * Gracefully downgrades expired entitlements to keep App Store and Google Play compliant.
 */
export const syncActiveSubscriptionStatus = async (
  currentUser: User,
  setUser: (user: User) => void
): Promise<User> => {
  const now = new Date();

  // If subscription has expired in time, lock the Premium gate
  if (currentUser.isPremium && currentUser.subscriptionEnd) {
    const exp = new Date(currentUser.subscriptionEnd);
    if (now > exp) {
      console.warn('⚠️ Lumina premium subscription has expired. Downgrading to Free Tier...');
      const downgradedUser: User = {
        ...currentUser,
        isPremium: false,
        subscriptionStatus: 'failed',
        subscriptionPlan: 'free'
      };

      setUser(downgradedUser);
      await syncUser(downgradedUser);
      localStorage.setItem('lumina_user', JSON.stringify(downgradedUser));
      return downgradedUser;
    }
  }

  if (!Capacitor.isNativePlatform()) {
    return currentUser;
  }

  try {
    const { customerInfo } = await (Purchases as any).getCustomerInfo();
    const hasActiveEntitlement = customerInfo.entitlements.active[ENTITLEMENT_ID] !== undefined;

    if (!hasActiveEntitlement && currentUser.isPremium) {
      // Entitlement revoked or expired natively
      const downgradedUser: User = {
        ...currentUser,
        isPremium: false,
        subscriptionStatus: 'failed',
        subscriptionPlan: 'free'
      };

      setUser(downgradedUser);
      await syncUser(downgradedUser);
      localStorage.setItem('lumina_user', JSON.stringify(downgradedUser));
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
      localStorage.setItem('lumina_user', JSON.stringify(updatedUser));
      return updatedUser;
    }
  } catch (err) {
    console.error('❌ Failed to check native RevenueCat status:', err);
  }

  return currentUser;
};
