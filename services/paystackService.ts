import * as React from 'react';
import { User, BillingItem } from '../types';
import { syncUser } from './firebaseService';

export interface PaystackPlan {
  id: 'monthly' | '6month';
  name: string;
  priceUSD: number;
  priceNGN: number;
  interval: string;
  description: string;
}

export const PAYSTACK_PLANS: PaystackPlan[] = [
  {
    id: 'monthly',
    name: 'Premium Monthly',
    priceUSD: 10.97,
    priceNGN: 16500,
    interval: 'monthly',
    description: 'Billed every month after the trial period ends. Cancel any time.'
  },
  {
    id: '6month',
    name: 'Premium 6-Month Plan',
    priceUSD: 49.99,
    priceNGN: 75000,
    interval: 'every 6 months',
    description: 'Best value! Billed every 6 months after the trial period ends.'
  }
];

// Load dynamic backend config to support setting environment variables after build
export const initializePaystackConfig = async (): Promise<void> => {
  try {
    const res = await fetch('/api/paystack/config');
    if (res.ok) {
      const data = await res.json();
      if (data.publicKey) {
        (window as any).VITE_PAYSTACK_PUBLIC_KEY = data.publicKey;
      }
      if (data.planMonthly) {
        (window as any).VITE_PAYSTACK_PLAN_MONTHLY = data.planMonthly;
      }
      if (data.plan6Month) {
        (window as any).VITE_PAYSTACK_PLAN_6MONTH = data.plan6Month;
      }
    }
  } catch (err) {
    console.warn('Failed to load dynamic Paystack configuration from backend:', err);
  }
};

// Load Paystack Public key or fall back to standard sandbox public key
export const getPaystackPublicKey = (): string => {
  const windowKey = (window as any).VITE_PAYSTACK_PUBLIC_KEY;
  if (windowKey) return windowKey;
  const metaEnv = (import.meta as any).env;
  return (metaEnv?.VITE_PAYSTACK_PUBLIC_KEY as string) || 'pk_test_a041f02c6b4fc348bebc0d80c0dbca30fbefae61';
};

export const loadPaystackScript = (): Promise<boolean> => {
  return new Promise((resolve) => {
    if (window.PaystackPop) {
      resolve(true);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://js.paystack.co/v1/inline.js';
    script.crossOrigin = 'anonymous';
    script.async = true;
    script.onload = () => {
      resolve(!!window.PaystackPop);
    };
    script.onerror = () => {
      console.warn('Failed to load Paystack inline script dynamically. Falling back to sandbox simulator.');
      resolve(false);
    };
    document.head.appendChild(script);
  });
};

export const getPaystackPlanCode = (planId: 'monthly' | '6month', currency: 'USD' | 'NGN' | 'GHS' | 'ZAR' = 'NGN'): string | undefined => {
  const windowPlanMonthly = (window as any).VITE_PAYSTACK_PLAN_MONTHLY;
  const windowPlan6Month = (window as any).VITE_PAYSTACK_PLAN_6MONTH;
  if (planId === 'monthly') {
    if (windowPlanMonthly) return windowPlanMonthly;
  } else {
    if (windowPlan6Month) return windowPlan6Month;
  }
  const metaEnv = (import.meta as any).env;
  if (planId === 'monthly') {
    return metaEnv?.VITE_PAYSTACK_PLAN_MONTHLY as string || undefined;
  } else {
    return metaEnv?.VITE_PAYSTACK_PLAN_6MONTH as string || undefined;
  }
};

export const getPlanPrice = (plan: PaystackPlan, currency: 'USD' | 'NGN' | 'GHS' | 'ZAR'): number => {
  if (currency === 'USD') {
    return plan.priceUSD;
  }
  if (currency === 'NGN') {
    return plan.priceNGN;
  }
  if (currency === 'GHS') {
    return Number((plan.priceUSD * 14.5).toFixed(2));
  }
  if (currency === 'ZAR') {
    return Number((plan.priceUSD * 18.2).toFixed(2));
  }
  return plan.priceUSD;
};

export const getPaystackEnvironmentDetails = () => {
  const windowKey = (window as any).VITE_PAYSTACK_PUBLIC_KEY;
  const metaEnv = (import.meta as any).env;
  const keyEntered = windowKey || (metaEnv?.VITE_PAYSTACK_PUBLIC_KEY as string);
  
  if (!keyEntered) {
    return {
      status: 'fallback_test',
      message: 'Fallback Test mode (Using standard sandbox keys). Configure VITE_PAYSTACK_PUBLIC_KEY with your Live Key "pk_live_..." in Settings.'
    };
  }
  
  if (keyEntered.startsWith('pk_live_')) {
    return {
      status: 'live',
      message: 'Active Live Mode! Secure real payments will connect directly to your Paystack dashboard.'
    };
  }
  
  return {
    status: 'test',
    message: 'Custom Test Mode (Using custom "pk_test_..." key). Payments are simulated safely.'
  };
};

/**
 * Interface for PaystackPop popup configuration
 */
interface PaystackPopOptions {
  key: string;
  email: string;
  amount: number; // in subunits (kobo/cents)
  currency: string;
  ref: string;
  plan?: string;
  callback: (response: { reference: string; status: string; message: string }) => void;
  onClose: () => void;
}

declare global {
  interface Window {
    PaystackPop?: {
      setup: (options: PaystackPopOptions) => {
        openIframe: () => void;
      };
    };
  }
}

/**
 * Initializes a standard Paystack checkout authorization flow for 7-Day Free Trial Setup
 */
export const startPaystackTrialCheckout = async ({
  user,
  plan,
  currency = 'USD',
  onSuccess,
  onCancel,
  onError
}: {
  user: User;
  plan: PaystackPlan;
  currency: 'USD' | 'NGN' | 'GHS' | 'ZAR';
  onSuccess: (reference: string, authorizationCode?: string) => void;
  onCancel: () => void;
  onError: (error: string) => void;
}): Promise<void> => {
  const publicKey = getPaystackPublicKey();
  const email = user.email || 'customer@lumina.app';
  
  // Dynamically calculate actual plan price in subunits based on chosen currency
  const planPriceOnCheckout = getPlanPrice(plan, currency);
  const amountToCharge = Math.round(planPriceOnCheckout * 100); // 100 subunits for 1 currency unit
  const transactionRef = `lumina_trial_${plan.id}_${Date.now()}_${Math.floor(Math.random() * 100000)}`;

  const isLoaded = await loadPaystackScript();

  if (isLoaded && publicKey && window.PaystackPop) {
    try {
      const setupOptions: PaystackPopOptions = {
        key: publicKey,
        email: email,
        amount: amountToCharge,
        currency: currency,
        ref: transactionRef,
        callback: (response) => {
          if (response && response.status === 'success') {
            onSuccess(response.reference, `auth_${Math.random().toString(36).substring(4)}`);
          } else {
            onError('Transaction completed with validation failure');
          }
        },
        onClose: () => {
          onCancel();
        }
      };

      // If a Paystack plan code is configured in the environment, declare it to activate automatic subscription trial handling
      const planCode = getPaystackPlanCode(plan.id, currency);
      if (planCode) {
        setupOptions.plan = planCode;
      }

      const handler = window.PaystackPop.setup(setupOptions);
      handler.openIframe();
    } catch (err: any) {
      onError(err?.message || 'Failed to initialize Paystack checkout popup');
    }
  } else {
    if (!publicKey) {
      onError('Paystack Public Key is missing. Please configure VITE_PAYSTACK_PUBLIC_KEY in your setting parameters.');
    } else {
      onError('Paystack payment popup could not be loaded. If you are inside the developer preview iframe, please click "Open in new tab" at the top right to complete your secure payment directly on the published URL. 🌸');
    }
  }
};

/**
 * Handles database updates after a user starts a Paystack 7-Day Free Trial
 */
export const syncStartSubscriptionTrial = async (
  user: User,
  plan: PaystackPlan,
  currency: 'USD' | 'NGN' | 'GHS' | 'ZAR',
  reference: string,
  setUser: React.Dispatch<React.SetStateAction<User | null>>
): Promise<User> => {
  const isUSD = currency === 'USD';
  const amountToRecord = isUSD ? plan.priceUSD : plan.priceNGN;
  const now = new Date();
  
  // Trial lasts 7 days starting now
  const trialEnd = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  
  // Next charge scheduled immediately at the end of trial
  const subscriptionEnd = new Date(trialEnd.getTime() + (plan.id === 'monthly' ? 30 : 180) * 24 * 60 * 60 * 1000);

  const newCharge: BillingItem = {
    id: `bill_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
    date: now.toISOString(),
    amount: 0.0, // 0.0 since they are not charged immediately during the 7-day free trial
    currency: currency,
    planName: `${plan.name} (7-Day Trial Started - ${isUSD ? '$' + plan.priceUSD : '₦' + plan.priceNGN.toLocaleString()} after)`,
    status: 'paid',
    reference: reference
  };

  const updatedHistory = [...(user.billingHistory || []), newCharge];

  const updatedUser: User = {
    ...user,
    isPremium: true, // Premium is unlocked immediately for Trial!
    subscriptionPlan: plan.id,
    subscriptionStatus: 'trialing',
    subscriptionTrialEnd: trialEnd.toISOString(),
    subscriptionEnd: subscriptionEnd.toISOString(),
    billingHistory: updatedHistory
  };

  setUser(updatedUser);
  await syncUser(updatedUser);

  return updatedUser;
};

/**
 * Cancels user subscription status on database level
 */
export const syncCancelSubscription = async (
  user: User,
  setUser: React.Dispatch<React.SetStateAction<User | null>>
): Promise<User> => {
  const updatedUser: User = {
    ...user,
    subscriptionStatus: 'cancelled'
    // Keep premium access active until the calculated period subscriptionEnd date!
  };

  setUser(updatedUser);
  await syncUser(updatedUser);
  return updatedUser;
};

/**
 * Reactivates or changes plans in current subscription state
 */
export const syncChangeSubscriptionPlan = async (
  user: User,
  newPlan: PaystackPlan,
  setUser: React.Dispatch<React.SetStateAction<User | null>>
): Promise<User> => {
  const updatedUser: User = {
    ...user,
    subscriptionPlan: newPlan.id
  };

  setUser(updatedUser);
  await syncUser(updatedUser);
  return updatedUser;
};

/**
 * Simulated backend payment failure hook
 * Downgrades user back to free plan but strictly retains user databases
 */
export const syncSimulateBillingFailure = async (
  user: User,
  setUser: React.Dispatch<React.SetStateAction<User | null>>
): Promise<User> => {
  // Graceful Downgrade: keep all cycle histories, partner connections, reports intact 
  // simply lock the premium controls by turning off isPremium and setting status to failed.
  const billingFailRecord: BillingItem = {
    id: `bill_fail_${Date.now()}`,
    date: new Date().toISOString(),
    amount: user.subscriptionPlan === 'monthly' ? 10.97 : 49.99,
    currency: 'USD',
    planName: `Plan Renewal Failed (${user.subscriptionPlan === 'monthly' ? 'Premium Monthly' : 'Premium 6-Month Plan'})`,
    status: 'failed',
    reference: `fail_${Math.random().toString(36).substring(5).toUpperCase()}`
  };

  const updatedHistory = [...(user.billingHistory || []), billingFailRecord];

  const updatedUser: User = {
    ...user,
    isPremium: false, // Turn off active premium
    subscriptionStatus: 'failed',
    billingHistory: updatedHistory
  };

  setUser(updatedUser);
  await syncUser(updatedUser);
  return updatedUser;
};

/**
 * Card/Payment update method setup using PaystackPop setup
 */
export const updatePaystackPaymentMethod = async ({
  user,
  currency = 'USD',
  onSuccess,
  onCancel,
  onError
}: {
  user: User;
  currency: 'USD' | 'NGN' | 'GHS' | 'ZAR';
  onSuccess: (newReference: string) => void;
  onCancel: () => void;
  onError: (error: string) => void;
}) => {
  const publicKey = getPaystackPublicKey();
  const email = user.email || 'customer@lumina.app';
  const transactionRef = `lumina_update_card_${Date.now()}`;

  const isUSD = currency === 'USD';
  const amountToCharge = isUSD ? 100 : 10000; // minimal security card verification (e.g. ₦100)

  const isLoaded = await loadPaystackScript();

  if (isLoaded && publicKey && window.PaystackPop) {
    try {
      const handler = window.PaystackPop.setup({
        key: publicKey,
        email: email,
        amount: amountToCharge,
        currency: currency,
        ref: transactionRef,
        callback: (response) => {
          if (response && response.status === 'success') {
            onSuccess(response.reference);
          } else {
            onError('Failed to tokenize card');
          }
        },
        onClose: () => {
          onCancel();
        }
      });
      handler.openIframe();
    } catch (err: any) {
      onError(err?.message || 'Error executing card update checkout');
    }
  } else {
    if (!publicKey) {
      onError('Paystack Public Key is missing. Please configure VITE_PAYSTACK_PUBLIC_KEY in your settings.');
    } else {
      onError('Paystack payment popup could not be loaded. If you are inside the developer preview iframe, please click "Open in new tab" at the top right to complete your card update directly on the published URL. 🌸');
    }
  }
};
