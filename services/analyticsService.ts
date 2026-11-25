import * as amplitude from '@amplitude/analytics-browser';
import { getAnalytics, logEvent, isSupported } from 'firebase/analytics';
import { initializeApp, getApps } from 'firebase/app';
import { collection, addDoc } from 'firebase/firestore';
import { db, auth } from './firebase';
import firebaseConfig from '../firebase-applet-config.json';

// Read optional public analytics key from environment — never hardcode secrets/keys in source
const AMPLITUDE_API_KEY = (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_AMPLITUDE_API_KEY) || '';
const COOKIE_CONSENT_KEY = 'lumina_cookie_consent_v1';

export interface CookieConsentState {
  essential: true; // Always required for security, session & local storage persistence
  analytics: boolean;
  performance: boolean;
  personalization: boolean;
  decided: boolean;
  updatedAt: string;
}

const DEFAULT_CONSENT: CookieConsentState = {
  essential: true,
  analytics: false,
  performance: false,
  personalization: false,
  decided: false,
  updatedAt: '',
};

let firebaseAnalyticsInstance: any = null;
let isAmplitudeInitialized = false;
let webVitalsAttached = false;
let globalErrorListenersAttached = false;

export function getCookieConsent(): CookieConsentState {
  if (typeof window === 'undefined') return DEFAULT_CONSENT;
  try {
    const raw = localStorage.getItem(COOKIE_CONSENT_KEY);
    if (!raw) return DEFAULT_CONSENT;
    const parsed = JSON.parse(raw);
    return {
      essential: true,
      analytics: Boolean(parsed.analytics),
      performance: Boolean(parsed.performance),
      personalization: Boolean(parsed.personalization),
      decided: Boolean(parsed.decided),
      updatedAt: typeof parsed.updatedAt === 'string' ? parsed.updatedAt : '',
    };
  } catch {
    return DEFAULT_CONSENT;
  }
}

export function hasConsent(category: 'essential' | 'analytics' | 'performance' | 'personalization'): boolean {
  if (category === 'essential') return true;
  const state = getCookieConsent();
  return state.decided && Boolean(state[category]);
}

export function setCookieConsent(
  next: Partial<Pick<CookieConsentState, 'analytics' | 'performance' | 'personalization'>> & { decided?: boolean }
): CookieConsentState {
  const current = getCookieConsent();
  const updated: CookieConsentState = {
    essential: true,
    analytics: next.analytics ?? current.analytics,
    performance: next.performance ?? current.performance,
    personalization: next.personalization ?? current.personalization,
    decided: next.decided ?? true,
    updatedAt: new Date().toISOString(),
  };

  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify(updated));
      window.dispatchEvent(new CustomEvent('lumina:consent-changed', { detail: updated }));
    } catch {}
  }

  if (updated.analytics) {
    initializeConsentedAnalyticsSDKs();
  } else {
    try {
      if (isAmplitudeInitialized) {
        amplitude.setOptOut(true);
      }
    } catch {}
    isAmplitudeInitialized = false;
  }

  if (updated.performance) {
    attachPerformanceMonitoring();
  }

  return updated;
}

function initializeConsentedAnalyticsSDKs(): void {
  if (typeof window === 'undefined' || !hasConsent('analytics')) return;

  if (AMPLITUDE_API_KEY && !isAmplitudeInitialized) {
    try {
      const silentLogger = {
        disable: () => {},
        enable: () => {},
        error: () => {},
        warn: () => {},
        log: () => {},
        debug: () => {},
      };

      const initResult = amplitude.init(AMPLITUDE_API_KEY, {
        fetchRemoteConfig: false,
        logLevel: amplitude.Types?.LogLevel?.None ?? 0,
        loggerProvider: silentLogger,
        defaultTracking: {
          pageViews: false,
          sessions: true,
          formInteractions: false,
          fileDownloads: false,
        },
      });
      amplitude.setOptOut(false);

      if (initResult && (initResult as any).promise) {
        (initResult as any).promise
          .then(() => {
            isAmplitudeInitialized = true;
          })
          .catch(() => {
            isAmplitudeInitialized = false;
          });
      } else {
        isAmplitudeInitialized = true;
      }
    } catch {
      isAmplitudeInitialized = false;
    }
  }

  const measurementId = (firebaseConfig as { measurementId?: string })?.measurementId;
  if (!firebaseAnalyticsInstance && typeof measurementId === 'string' && measurementId.trim().length > 0) {
    isSupported()
      .then((supported) => {
        if (supported && hasConsent('analytics')) {
          try {
            const app = getApps().length > 0 ? getApps()[0] : initializeApp(firebaseConfig);
            firebaseAnalyticsInstance = getAnalytics(app);
          } catch {}
        }
      })
      .catch(() => {});
  }
}

export interface WebVitalMetric {
  name: string;
  value: number;
  unit: 'ms' | 'score';
  timestamp: string;
}

function recordPerformanceMetric(metric: WebVitalMetric): void {
  if (typeof window === 'undefined' || !hasConsent('performance')) return;
  try {
    const key = 'lumina_perf_metrics';
    const existing: WebVitalMetric[] = JSON.parse(localStorage.getItem(key) || '[]');
    existing.unshift(metric);
    localStorage.setItem(key, JSON.stringify(existing.slice(0, 50)));
  } catch {}
}

function attachPerformanceMonitoring(): void {
  if (typeof window === 'undefined' || webVitalsAttached || !hasConsent('performance')) return;
  webVitalsAttached = true;

  try {
    // Navigation Timing
    const navEntries = performance.getEntriesByType?.('navigation') as PerformanceNavigationTiming[] | undefined;
    if (navEntries && navEntries.length > 0) {
      const nav = navEntries[0];
      const loadMs = Math.round((nav.loadEventEnd || nav.domInteractive || performance.now()));
      if (loadMs > 0) {
        recordPerformanceMetric({ name: 'App Load Time', value: loadMs, unit: 'ms', timestamp: new Date().toISOString() });
      }
    }

    // Core Web Vitals observers if supported
    if ('PerformanceObserver' in window) {
      try {
        const lcpObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const last = entries[entries.length - 1];
          if (last) {
            recordPerformanceMetric({
              name: 'LCP',
              value: Math.round(last.startTime),
              unit: 'ms',
              timestamp: new Date().toISOString(),
            });
          }
        });
        lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });
      } catch {}

      try {
        let clsScore = 0;
        const clsObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries() as any[]) {
            if (!entry.hadRecentInput) {
              clsScore += entry.value || 0;
            }
          }
          recordPerformanceMetric({
            name: 'CLS',
            value: Number(clsScore.toFixed(4)),
            unit: 'score',
            timestamp: new Date().toISOString(),
          });
        });
        clsObserver.observe({ type: 'layout-shift', buffered: true });
      } catch {}
    }
  } catch {}
}

// Initialize only if user has already consented in a previous session
if (typeof window !== 'undefined') {
  if (hasConsent('analytics')) {
    initializeConsentedAnalyticsSDKs();
  }
  if (hasConsent('performance')) {
    attachPerformanceMonitoring();
  }
}

export const getDeviceMetadata = () => {
  if (typeof window === 'undefined') {
    return { country: 'Unknown', deviceType: 'Desktop', appVersion: '1.0.0' };
  }
  const ua = navigator.userAgent;
  let deviceType = 'Desktop';
  if (/mobile/i.test(ua)) deviceType = 'Mobile';
  if (/ipad|tablet/i.test(ua)) deviceType = 'Tablet';
  if (/iphone|ipad|ipod/i.test(ua)) deviceType = 'iOS';
  if (/android/i.test(ua)) deviceType = 'Android';

  const language = navigator.language || 'en-US';
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

  return {
    country: timeZone.split('/')[0] || language,
    deviceType,
    appVersion: '1.0.0',
    language,
    timeZone,
    screenResolution: `${window.screen.width}x${window.screen.height}`,
  };
};

/**
 * Identify non-PII user mode properties only when Analytics consent is granted.
 */
export const setUserProperties = (properties: {
  userMode?: 'Primary' | 'Partner';
  isPartner?: boolean;
  isPremium?: boolean;
  subscriptionStatus?: string;
  userId?: string;
  email?: string;
}) => {
  if (!hasConsent('analytics')) return;
  try {
    const meta = getDeviceMetadata();
    const userProps = {
      'User Mode': properties.userMode || (properties.isPartner ? 'Partner Mode' : 'User Mode'),
      Country: meta.country,
      'Device Type': meta.deviceType,
      'App Version': meta.appVersion,
      'Subscription Status': properties.subscriptionStatus || (properties.isPremium ? 'Premium' : 'Free'),
    };

    if (isAmplitudeInitialized) {
      if (properties.userId) {
        amplitude.setUserId(properties.userId);
      }
      const identifyObj = new amplitude.Identify();
      Object.entries(userProps).forEach(([key, val]) => {
        identifyObj.set(key, val as any);
      });
      amplitude.identify(identifyObj);
    }

    if (firebaseAnalyticsInstance) {
      logEvent(firebaseAnalyticsInstance, 'user_properties_update', userProps);
    }
  } catch {}
};

/**
 * Consent-gated central event tracking function.
 * Never logs personal health notes, diary text, or sensitive PII.
 */
export const trackEvent = async (eventName: string, properties: Record<string, any> = {}) => {
  if (!hasConsent('analytics')) return;
  try {
    const meta = getDeviceMetadata();
    const currentUserId = auth.currentUser?.uid || 'anonymous';
    const timestamp = new Date().toISOString();

    const sanitizedProps: Record<string, any> = {
      ...properties,
      country: meta.country,
      device_type: meta.deviceType,
      app_version: meta.appVersion,
    };
    delete sanitizedProps.email;
    delete sanitizedProps.notes;
    delete sanitizedProps.content;

    if (isAmplitudeInitialized) {
      amplitude.track(eventName, sanitizedProps);
    }

    if (firebaseAnalyticsInstance) {
      const sanitizedFirebaseName = eventName.toLowerCase().replace(/\s+/g, '_').substring(0, 40);
      logEvent(firebaseAnalyticsInstance, sanitizedFirebaseName, sanitizedProps);
    }

    const eventRecord = {
      eventName,
      userId: currentUserId,
      properties: sanitizedProps,
      timestamp,
      date: timestamp.split('T')[0],
    };

    try {
      const localEvents = JSON.parse(localStorage.getItem('lumina_analytics_events') || '[]');
      localEvents.unshift(eventRecord);
      localStorage.setItem('lumina_analytics_events', JSON.stringify(localEvents.slice(0, 300)));
    } catch {}

    if (db && auth.currentUser?.uid) {
      addDoc(collection(db, 'analytics_events'), eventRecord).catch(() => {});
    }
  } catch {}
};

export const trackPageView = (screenName: string) => {
  trackEvent('Screen View', { screen: screenName });
};

/**
 * Privacy-safe error & crash monitoring.
 * Remote dispatch requires analytics or performance consent; sanitized local diagnostics stay private on-device.
 */
export const logCrashReport = async (
  error: Error | string,
  category: 'App Crash' | 'Screen Rendering' | 'Authentication Error' | 'Partner Error' | 'Notification Failure' | 'Payment Error' | 'Network Error' = 'App Crash',
  additionalContext: Record<string, any> = {}
) => {
  try {
    const meta = getDeviceMetadata();
    const currentUserId = auth.currentUser?.uid || 'anonymous';
    const errorMessage = (typeof error === 'string' ? error : error.message || 'Unknown runtime error').slice(0, 300);
    const errorStack = (typeof error === 'string' ? '' : error.stack || '').slice(0, 1000);
    const timestamp = new Date().toISOString();

    const safeContext: Record<string, any> = {};
    for (const [k, v] of Object.entries(additionalContext || {})) {
      const lower = k.toLowerCase();
      if (
        lower.includes('email') ||
        lower.includes('password') ||
        lower.includes('pin') ||
        lower.includes('token') ||
        lower.includes('secret') ||
        lower.includes('diary') ||
        lower.includes('symptom') ||
        lower.includes('period') ||
        lower.includes('note')
      ) {
        continue;
      }
      safeContext[k] = typeof v === 'string' ? v.slice(0, 120) : v;
    }

    const sanitizedMsg = errorMessage
      .replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[redacted-email]')
      .slice(0, 300);

    const crashReport = {
      id: `crash_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      category,
      errorMessage: sanitizedMsg,
      errorStack: errorStack.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[redacted-email]'),
      userId: currentUserId,
      deviceType: meta.deviceType,
      appVersion: meta.appVersion,
      context: safeContext,
      timestamp,
    };

    try {
      const localCrashes = JSON.parse(localStorage.getItem('lumina_crash_reports') || '[]');
      localCrashes.unshift(crashReport);
      localStorage.setItem('lumina_crash_reports', JSON.stringify(localCrashes.slice(0, 50)));
    } catch {}

    if (!hasConsent('analytics') && !hasConsent('performance')) return;

    if (firebaseAnalyticsInstance) {
      logEvent(firebaseAnalyticsInstance, 'app_exception', {
        description: sanitizedMsg.substring(0, 100),
        fatal: category === 'App Crash' || category === 'Screen Rendering',
        category,
      });
    }

    if (isAmplitudeInitialized) {
      amplitude.track('App Exception', { category, error_message: sanitizedMsg });
    }

    if (db && auth.currentUser?.uid) {
      addDoc(collection(db, 'crash_reports'), crashReport).catch(() => {});
    }
  } catch {}
};

if (typeof window !== 'undefined' && !globalErrorListenersAttached) {
  globalErrorListenersAttached = true;
  window.addEventListener('error', (event) => {
    const rawMsg = event.error?.message || (typeof event.message === 'string' ? event.message : '') || '';
    if (
      !rawMsg ||
      rawMsg.includes('Load failed') ||
      rawMsg.includes('Failed to fetch') ||
      rawMsg.includes('NetworkError') ||
      rawMsg.includes('Amplitude') ||
      rawMsg.includes('ResizeObserver') ||
      rawMsg.includes('Script error') ||
      rawMsg.includes('user gesture') ||
      rawMsg.includes('NotAllowedError') ||
      rawMsg.includes('play()') ||
      rawMsg.includes('speechSynthesis') ||
      rawMsg.includes('canceled') ||
      rawMsg.includes('interrupted') ||
      rawMsg.includes('AudioContext') ||
      rawMsg.includes('permission') ||
      rawMsg.includes('quota')
    ) {
      return;
    }
    logCrashReport(event.error || event.message || 'Window Error', 'App Crash', {
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
    });
  });

  window.addEventListener('unhandledrejection', (event) => {
    const reasonStr = String(event.reason?.message || event.reason || '');
    if (
      !reasonStr ||
      reasonStr.includes('Load failed') ||
      reasonStr.includes('Failed to fetch') ||
      reasonStr.includes('NetworkError') ||
      reasonStr.includes('Amplitude') ||
      reasonStr.includes('AbortError') ||
      reasonStr.includes('NotAllowedError') ||
      reasonStr.includes('play()') ||
      reasonStr.includes('interrupted') ||
      reasonStr.includes('speechSynthesis') ||
      reasonStr.includes('canceled') ||
      reasonStr.includes('The user aborted a request') ||
      reasonStr.includes('AudioContext') ||
      reasonStr.includes('permission-denied') ||
      reasonStr.includes('Missing or insufficient permissions')
    ) {
      return;
    }
    logCrashReport(event.reason || 'Unhandled Promise Rejection', 'App Crash', {
      type: 'unhandledrejection',
    });
  });
}

// Specific Event Trackers
export const trackSignUp = (method: string, isPartner: boolean = false) => {
  trackEvent('Sign Up', { method, mode: isPartner ? 'Partner' : 'Primary' });
};
export const trackLogin = (method: string, isPartner: boolean = false) => {
  trackEvent('Login', { method, mode: isPartner ? 'Partner' : 'Primary' });
};
export const trackCompleteOnboarding = (isPartner: boolean = false) => {
  trackEvent('Complete Onboarding', { mode: isPartner ? 'Partner' : 'Primary' });
};
export const trackLogPeriod = (periodDurationDays?: number) => {
  trackEvent('Log Period', { duration_days: periodDurationDays || 5 });
};
export const trackEditCycle = (cycleLength: number, periodLength: number) => {
  trackEvent('Edit Cycle', { cycle_length: cycleLength, period_length: periodLength });
};
export const trackSendPartnerInvite = () => {
  trackEvent('Send Partner Invite', { invite_sent: true });
};
export const trackAcceptPartnerInvite = () => {
  trackEvent('Accept Partner Invite', { success: true });
};
export const trackDeclinePartnerInvite = () => {
  trackEvent('Decline Partner Invite', { declined: true });
};
export const trackCreateDiaryEntry = (moodTag?: string) => {
  trackEvent('Create Diary Entry', { mood_tag: moodTag || 'General' });
};
export const trackUpdateDiaryEntry = (moodTag?: string) => {
  trackEvent('Update Diary Entry', { mood_tag: moodTag || 'General' });
};
export const trackOpenNotification = (type: string, category?: string) => {
  trackEvent('Open Notification', { notification_type: type, category: category || 'general' });
};
export const trackStartSubscription = (planType: string = 'Premium Plan') => {
  trackEvent('Start Subscription', { plan: planType });
};
export const trackCancelSubscription = (reason: string = 'User preference') => {
  trackEvent('Cancel Subscription', { reason });
};
export const trackOpenWellnessContent = (title: string, category: string = 'Wellness') => {
  trackEvent('Open Wellness Content', { content_title: title, category });
};
export const trackOpenSexEducationContent = (topic: string) => {
  trackEvent('Open Sex Education Content', { topic });
};
