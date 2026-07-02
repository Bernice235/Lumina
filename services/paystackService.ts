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

// Load Paystack Public key
export const getPaystackPublicKey = (): string => {
  const windowKey = (window as any).VITE_PAYSTACK_PUBLIC_KEY;
  if (windowKey) return windowKey;
  const metaEnv = (import.meta as any).env;
  return (metaEnv?.VITE_PAYSTACK_PUBLIC_KEY as string) || '';
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

interface SimulateCheckoutPopProps {
  plan: any;
  currency: 'USD' | 'NGN' | 'GHS' | 'ZAR';
  email: string;
  ref: string;
  onSuccess: (reference: string) => void;
  onClose: () => void;
}

export const SimulateCheckoutPop = ({
  plan,
  currency,
  email,
  ref,
  onSuccess,
  onClose
}: SimulateCheckoutPopProps) => {
  const overlay = document.createElement('div');
  overlay.id = 'paystack-sim-overlay';
  overlay.className = 'fixed inset-0 bg-black/60 backdrop-blur-sm z-[99999] flex justify-center items-start md:items-center p-4 overflow-y-auto';

  const planPriceOnCheckout = getPlanPrice(plan, currency);
  const formattedPrice = currency === 'USD' 
    ? `$${planPriceOnCheckout.toFixed(2)}` 
    : currency === 'NGN'
      ? `₦${planPriceOnCheckout.toLocaleString()}`
      : currency === 'GHS'
        ? `GH₵${planPriceOnCheckout.toFixed(2)}`
        : `R${planPriceOnCheckout.toFixed(2)}`;

  let currentTab: 'card' | 'transfer' = 'card';

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      cleanup();
      onClose();
    }
  };

  const handleBackdropClick = (e: MouseEvent) => {
    if (e.target === overlay) {
      cleanup();
      onClose();
    }
  };

  const updateModalContent = () => {
    overlay.innerHTML = `
      <div class="bg-white w-full max-w-xl rounded-3xl overflow-hidden shadow-2xl border border-neutral-100 flex flex-col md:flex-row min-h-[360px] md:min-h-[420px] my-auto relative animate-scaleUp">
        <!-- Close Button (Highly Visible) -->
        <button id="paystack-close" class="absolute top-3 right-3 md:top-4 md:right-4 text-rose-600 hover:text-rose-800 bg-rose-50 hover:bg-rose-100/80 transition-all cursor-pointer px-3.5 py-1.5 md:px-4 md:py-2 rounded-full border border-rose-100 flex items-center gap-1.5 text-[9px] md:text-[10px] font-black uppercase tracking-widest z-10 shadow-sm">
          ✕ Cancel
        </button>

        <!-- Left Channel Selector Sidebar (Desktop: vertical, Mobile: horizontal tabs) -->
        <div class="w-full md:w-52 bg-neutral-50/70 border-b md:border-b-0 md:border-r border-neutral-100 p-4 md:p-6 flex flex-col justify-between">
          <div>
            <!-- Header Branding -->
            <div class="flex items-center justify-between gap-2 mb-3 md:mb-6">
              <div class="flex items-center gap-2">
                <span class="text-2xl">🌸</span>
                <div>
                  <h4 class="text-xs font-black text-neutral-800 uppercase tracking-wider">LUMINA</h4>
                  <p class="text-[9px] text-neutral-400 font-bold tracking-widest uppercase">Premium Portal</p>
                </div>
              </div>
              <button id="paystack-close-mobile" class="md:hidden text-rose-600 hover:text-rose-800 bg-rose-50 hover:bg-rose-100 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all cursor-pointer border border-rose-100">
                ✕
              </button>
            </div>

            <!-- Tab Selectors -->
            <div class="flex md:flex-col gap-2 mb-2 md:mb-0">
              <button id="tab-card" class="flex-1 md:flex-initial text-left py-2.5 px-3 md:py-3 md:px-4 rounded-2xl flex items-center gap-2.5 transition-all text-xs font-bold cursor-pointer ${
                currentTab === 'card' 
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-100' 
                  : 'bg-white hover:bg-neutral-100 text-neutral-600 border border-neutral-100'
              }">
                💳 <span class="truncate">Card</span>
              </button>
              <button id="tab-transfer" class="flex-1 md:flex-initial text-left py-2.5 px-3 md:py-3 md:px-4 rounded-2xl flex items-center gap-2.5 transition-all text-xs font-bold cursor-pointer ${
                currentTab === 'transfer' 
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-100' 
                  : 'bg-white hover:bg-neutral-100 text-neutral-600 border border-neutral-100'
              }">
                🏦 <span class="truncate">Bank Transfer</span>
              </button>
            </div>
          </div>

          <!-- Bottom merchant info / Cancel (desktop only) -->
          <div class="hidden md:block space-y-3 mt-6">
            <button id="paystack-cancel-sidebar" class="w-full py-2.5 bg-rose-50 hover:bg-rose-100 border border-rose-100 text-rose-600 font-bold text-[10px] uppercase tracking-widest rounded-2xl transition-all cursor-pointer flex items-center justify-center gap-1.5">
              🛑 Cancel & Exit
            </button>
            <div class="border-t border-neutral-100/80 pt-4">
              <span class="inline-flex items-center gap-1 text-[9px] font-black text-emerald-500 uppercase tracking-widest bg-emerald-50 py-1 px-2.5 rounded-full">
                ● SECURED BY PAYSTACK
              </span>
            </div>
          </div>
        </div>

        <!-- Right Content Panel -->
        <div class="flex-1 p-5 md:p-8 flex flex-col justify-between min-h-[260px] md:min-h-[340px]">
          <div>
            <!-- Top invoice segment -->
            <div class="pb-3 md:pb-5 border-b border-neutral-100 flex justify-between items-start mb-4 md:mb-6">
              <div class="space-y-1">
                <p class="text-[10px] text-neutral-400 font-bold uppercase tracking-widest">${email}</p>
                <h3 class="text-sm font-bold text-neutral-800 font-serif italic">${plan.name}</h3>
              </div>
              <div class="text-right">
                <span class="text-xs text-neutral-400 block font-bold uppercase tracking-wider text-[10px]">Amount</span>
                <span class="text-base md:text-lg font-black text-neutral-900 font-mono">${formattedPrice}</span>
              </div>
            </div>

            <!-- Tab contents -->
            <div id="tab-content" class="space-y-3.5 md:space-y-4">
              ${
                currentTab === 'card'
                  ? `
                    <div class="space-y-2.5 md:space-y-3.5 animate-fadeIn">
                      <p class="text-[9.5px] md:text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1">Simulate Card Authorization</p>
                      <div>
                        <label class="block text-[8px] md:text-[9px] font-black text-neutral-400 uppercase tracking-widest mb-1">Card Number</label>
                        <input type="text" id="sim-card-num" value="4000 1234 5678 9010" class="w-full bg-neutral-50 border border-neutral-100 rounded-2xl py-2 px-3 md:py-3 md:px-4 text-xs font-mono font-bold text-neutral-800 outline-none focus:border-indigo-300 transition-colors" />
                      </div>
                      <div class="grid grid-cols-2 gap-3.5">
                        <div>
                          <label class="block text-[8px] md:text-[9px] font-black text-neutral-400 uppercase tracking-widest mb-1">Expiry Date</label>
                          <input type="text" id="sim-card-expiry" value="12/30" class="w-full bg-neutral-50 border border-neutral-100 rounded-2xl py-2 px-3 md:py-3 md:px-4 text-xs font-mono font-bold text-neutral-800 outline-none focus:border-indigo-300 transition-colors text-center" />
                        </div>
                        <div>
                          <label class="block text-[8px] md:text-[9px] font-black text-neutral-400 uppercase tracking-widest mb-1">CVV</label>
                          <input type="text" id="sim-card-cvv" value="123" class="w-full bg-neutral-50 border border-neutral-100 rounded-2xl py-2 px-3 md:py-3 md:px-4 text-xs font-mono font-bold text-neutral-800 outline-none focus:border-indigo-300 transition-colors text-center" />
                        </div>
                      </div>
                      <p class="text-[9px] md:text-[9.5px] text-neutral-400 italic leading-snug">This is an authorized Sandbox simulation environment. You can use any testing credentials.</p>
                    </div>
                  `
                  : `
                    <div class="space-y-3 md:space-y-4 animate-fadeIn">
                      <p class="text-[9.5px] md:text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Simulate Bank Transfer Payment</p>
                      <div class="bg-indigo-50/45 border border-indigo-100/55 rounded-3xl p-4 md:p-5 space-y-2 md:space-y-3">
                        <div class="flex justify-between items-center text-xs pb-1.5 md:pb-2 border-b border-indigo-100/30">
                          <span class="text-neutral-500">Bank Name</span>
                           <span class="font-bold text-indigo-950 font-serif">Wema Bank / ALAT</span>
                        </div>
                        <div class="flex justify-between items-center text-xs pb-1.5 md:pb-2 border-b border-indigo-100/30">
                          <span class="text-neutral-500">Account Number</span>
                          <span class="font-mono font-bold text-indigo-950 text-sm select-all">9920182743</span>
                        </div>
                        <div class="flex justify-between items-center text-xs pb-1.5 md:pb-2 border-b border-indigo-100/30">
                          <span class="text-neutral-500">Account Name</span>
                          <span class="font-semibold text-indigo-900 text-[10px] md:text-[11px] truncate max-w-[140px] md:max-w-none">Lumina Bloom Portal</span>
                        </div>
                        <div class="flex justify-between items-center text-xs">
                          <span class="text-neutral-400">Total Amount</span>
                          <span class="font-black text-indigo-950 font-mono">${formattedPrice}</span>
                        </div>
                      </div>
                      <div class="flex gap-2 items-start bg-neutral-50 border border-neutral-100 p-2.5 md:p-3.5 rounded-2xl">
                        <span class="text-sm mt-0.5">💡</span>
                        <p class="text-[8.5px] md:text-[9.5px] text-neutral-500 leading-relaxed">
                          Please transfer the exact amount of <strong class="text-neutral-800 font-bold">${formattedPrice}</strong>. After completing, click <strong class="text-indigo-600 font-bold">"I've sent the money"</strong>.
                        </p>
                      </div>
                    </div>
                  `
              }
            </div>
          </div>

          <!-- Bottom Action Buttons -->
          <div class="pt-6 border-t border-neutral-50 flex flex-col gap-2.5">
            ${
              currentTab === 'card'
                ? `
                  <button id="paystack-submit" class="w-full py-4 bg-indigo-600 hover:scale-[1.01] active:scale-[0.98] text-white font-black text-xs uppercase tracking-widest rounded-2xl shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all cursor-pointer flex items-center justify-center gap-2">
                    🔒 Pay ${formattedPrice}
                  </button>
                `
                : `
                  <button id="paystack-submit" class="w-full py-4 bg-amber-500 hover:scale-[1.01] active:scale-[0.98] text-white font-black text-xs uppercase tracking-widest rounded-2xl shadow-lg shadow-amber-100 hover:bg-amber-600 transition-all cursor-pointer flex items-center justify-center gap-2">
                    ⏳ I've sent the money
                  </button>
                `
            }
            <button id="paystack-cancel" class="w-full py-3 bg-neutral-100 hover:bg-neutral-200 text-neutral-600 font-bold text-xs uppercase tracking-wider rounded-2xl transition-all cursor-pointer text-center">
              Cancel & Go Back
            </button>
          </div>
        </div>
      </div>
    `;

    // Attach listeners
    document.getElementById('paystack-close')?.addEventListener('click', () => {
      cleanup();
      onClose();
    });

    document.getElementById('paystack-close-mobile')?.addEventListener('click', () => {
      cleanup();
      onClose();
    });

    document.getElementById('paystack-cancel-sidebar')?.addEventListener('click', () => {
      cleanup();
      onClose();
    });

    document.getElementById('paystack-cancel')?.addEventListener('click', () => {
      cleanup();
      onClose();
    });

    document.getElementById('tab-card')?.addEventListener('click', () => {
      if (currentTab !== 'card') {
        currentTab = 'card';
        updateModalContent();
      }
    });

    document.getElementById('tab-transfer')?.addEventListener('click', () => {
      if (currentTab !== 'transfer') {
        currentTab = 'transfer';
        updateModalContent();
      }
    });

    const submitBtn = document.getElementById('paystack-submit') as HTMLButtonElement;
    submitBtn?.addEventListener('click', () => {
      submitBtn.setAttribute('disabled', 'true');
      submitBtn.classList.add('opacity-80', 'cursor-not-allowed');
      submitBtn.style.pointerEvents = 'none';
      
      // Also disable cancel buttons during active processing
      const cancelBtn = document.getElementById('paystack-cancel') as HTMLButtonElement;
      if (cancelBtn) {
        cancelBtn.setAttribute('disabled', 'true');
        cancelBtn.classList.add('opacity-50', 'cursor-not-allowed');
      }
      
      const sidebarCancelBtn = document.getElementById('paystack-cancel-sidebar') as HTMLButtonElement;
      if (sidebarCancelBtn) {
        sidebarCancelBtn.setAttribute('disabled', 'true');
        sidebarCancelBtn.classList.add('opacity-50', 'cursor-not-allowed');
      }

      const closeBtn = document.getElementById('paystack-close') as HTMLButtonElement;
      if (closeBtn) {
        closeBtn.setAttribute('disabled', 'true');
        closeBtn.classList.add('opacity-50', 'cursor-not-allowed');
      }

      const closeMobileBtn = document.getElementById('paystack-close-mobile') as HTMLButtonElement;
      if (closeMobileBtn) {
        closeMobileBtn.setAttribute('disabled', 'true');
        closeMobileBtn.classList.add('opacity-50', 'cursor-not-allowed');
      }
      
      if (currentTab === 'card') {
        submitBtn.innerHTML = `⌛ Authorizing Secure Card Connection...`;
        setTimeout(() => {
          cleanup();
          onSuccess(`${ref}_card_success`);
        }, 1800);
      } else {
        submitBtn.innerHTML = `⌛ Creating Bank Audit Confirmation...`;
        setTimeout(() => {
          cleanup();
          onSuccess(`${ref}_transfer_pending`);
        }, 1800);
      }
    });
  };

  const cleanup = () => {
    window.removeEventListener('keydown', handleKeyDown);
    overlay.removeEventListener('click', handleBackdropClick);
    if (document.body.contains(overlay)) {
      document.body.removeChild(overlay);
    }
  };

  window.addEventListener('keydown', handleKeyDown);
  overlay.addEventListener('click', handleBackdropClick);

  document.body.appendChild(overlay);
  updateModalContent();
};

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
  const isMock = !publicKey || user.id.startsWith("sandbox_") || user.id.startsWith("offline_");
  const email = user.email || 'customer@lumina.app';
  const planPriceOnCheckout = getPlanPrice(plan, currency);
  const amountToCharge = Math.round(planPriceOnCheckout * 100);
  const transactionRef = `lumina_trial_${plan.id}_${Date.now()}_${Math.floor(Math.random() * 100000)}`;

  if (isMock) {
    SimulateCheckoutPop({
      plan,
      currency,
      email,
      ref: transactionRef,
      onSuccess: (ref) => onSuccess(ref, `auth_simulated_${Math.random().toString(36).substring(4)}`),
      onClose: onCancel
    });
    return;
  }

  try {
    const res = await fetch("/api/paystack/initialize", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        email,
        amount: amountToCharge,
        currency,
        planId: plan.id,
        userId: user.id,
        callbackUrl: `${window.location.origin}/settings`
      })
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      throw new Error(data.error || "Failed to initiate payment gateway connection.");
    }

    if (data.authorization_url) {
      // Redirect to the real Paystack secure page directly
      window.location.href = data.authorization_url;
    } else {
      throw new Error("Invalid initialization response from server.");
    }
  } catch (err: any) {
    onError(err?.message || "Error setting up checkout session. Please try again.");
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
  const isMock = !publicKey || user.id.startsWith("sandbox_") || user.id.startsWith("offline_");
  const email = user.email || 'customer@lumina.app';
  const isUSD = currency === 'USD';
  const amountToCharge = isUSD ? 100 : 10000; // minimal security card verification trace
  const transactionRef = `lumina_update_card_${Date.now()}`;

  if (isMock) {
    SimulateCheckoutPop({
      plan: { id: 'monthly', name: 'Card Update Verification', priceUSD: isUSD ? 1.00 : 100, priceNGN: 100, interval: 'once', description: 'Validate Card' },
      currency,
      email,
      ref: transactionRef,
      onSuccess: (ref) => onSuccess(ref),
      onClose: onCancel
    });
    return;
  }

  try {
    const res = await fetch("/api/paystack/initialize", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        email,
        amount: amountToCharge,
        currency,
        planId: 'monthly',
        userId: user.id,
        callbackUrl: `${window.location.origin}/settings`
      })
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      throw new Error(data.error || "Failed to initiate card update gateway.");
    }

    if (data.authorization_url) {
      // Redirect to the real Paystack secure card update verification page directly
      window.location.href = data.authorization_url;
    } else {
      throw new Error("Invalid initialization response from server.");
    }
  } catch (err: any) {
    onError(err?.message || "Error setting up payment method update. Please try again.");
  }
};
