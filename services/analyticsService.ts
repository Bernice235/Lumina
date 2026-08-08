import * as amplitude from '@amplitude/analytics-browser';
import { getAnalytics, logEvent, isSupported } from 'firebase/analytics';
import { initializeApp, getApps } from 'firebase/app';
import { collection, addDoc, serverTimestamp, getDocs, query, where, orderBy, limit, doc, setDoc } from 'firebase/firestore';
import { db, auth } from './firebase';
import firebaseConfig from '../firebase-applet-config.json';

const AMPLITUDE_API_KEY = 'cf2b2b0258684768854bf345bcbcae93';

let firebaseAnalyticsInstance: any = null;
let isAmplitudeInitialized = false;

// Initialize Amplitude Analytics
try {
  if (typeof window !== 'undefined') {
    amplitude.init(AMPLITUDE_API_KEY, {
      defaultTracking: {
        pageViews: true,
        sessions: true,
        formInteractions: false,
        fileDownloads: false,
      },
    });
    isAmplitudeInitialized = true;
    console.log('[Analytics] Amplitude Browser SDK initialized successfully');
  }
} catch (err) {
  console.warn('[Analytics] Amplitude initialization warning:', err);
}

// Initialize Firebase Analytics if supported
if (typeof window !== 'undefined') {
  isSupported().then((supported) => {
    if (supported) {
      try {
        const app = getApps().length > 0 ? getApps()[0] : initializeApp(firebaseConfig);
        firebaseAnalyticsInstance = getAnalytics(app);
        console.log('[Analytics] Firebase Analytics initialized successfully');
      } catch (err) {
        console.warn('[Analytics] Firebase Analytics initialization warning:', err);
      }
    }
  }).catch((err) => {
    console.warn('[Analytics] Firebase Analytics support check error:', err);
  });
}

// Device & Environment metadata helpers
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
    screenResolution: `${window.screen.width}x${window.screen.height}`
  };
};

/**
 * Identify User & set user properties across Amplitude and Firebase
 */
export const setUserProperties = (properties: {
  userMode?: 'Primary' | 'Partner';
  isPartner?: boolean;
  isPremium?: boolean;
  subscriptionStatus?: string;
  userId?: string;
  email?: string;
}) => {
  try {
    const meta = getDeviceMetadata();
    const userProps = {
      'User Mode': properties.userMode || (properties.isPartner ? 'Partner Mode' : 'User Mode'),
      'Country': meta.country,
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
  } catch (err) {
    console.warn('[Analytics] Error setting user properties:', err);
  }
};

/**
 * Central event tracking function
 * Complies strictly with privacy regulations: NO sensitive personal health notes logged
 */
export const trackEvent = async (eventName: string, properties: Record<string, any> = {}) => {
  try {
    const meta = getDeviceMetadata();
    const currentUserId = auth.currentUser?.uid || properties.userId || 'anonymous';
    const timestamp = new Date().toISOString();

    const sanitizedProps = {
      ...properties,
      country: meta.country,
      device_type: meta.deviceType,
      app_version: meta.appVersion,
    };

    // 1. Amplitude Tracking
    if (isAmplitudeInitialized) {
      amplitude.track(eventName, sanitizedProps);
    }

    // 2. Firebase Analytics Tracking
    if (firebaseAnalyticsInstance) {
      const sanitizedFirebaseName = eventName.toLowerCase().replace(/\s+/g, '_').substring(0, 40);
      logEvent(firebaseAnalyticsInstance, sanitizedFirebaseName, sanitizedProps);
    }

    // 3. Firestore & Local Storage Persistent Metric Store for Dashboard
    const eventRecord = {
      eventName,
      userId: currentUserId,
      properties: sanitizedProps,
      timestamp,
      date: timestamp.split('T')[0]
    };

    // Save to local storage cache for instant offline dashboard updates
    try {
      const localEvents = JSON.parse(localStorage.getItem('lumina_analytics_events') || '[]');
      localEvents.unshift(eventRecord);
      // Keep last 300 events locally
      localStorage.setItem('lumina_analytics_events', JSON.stringify(localEvents.slice(0, 300)));
    } catch (e) {
      // Ignore local storage quota limits
    }

    // Persist event record to Firestore asynchronously
    if (db && currentUserId !== 'anonymous') {
      addDoc(collection(db, 'analytics_events'), eventRecord).catch((err) => {
        // Silently fail if offline or permission denied
      });
    }

    console.log(`[Analytics Event] ${eventName}:`, sanitizedProps);
  } catch (err) {
    console.warn(`[Analytics] Error tracking event ${eventName}:`, err);
  }
};

/**
 * Firebase Crashlytics & Error Monitoring
 */
export const logCrashReport = async (
  error: Error | string,
  category: 'App Crash' | 'Screen Rendering' | 'Authentication Error' | 'Partner Error' | 'Notification Failure' | 'Payment Error' | 'Network Error' = 'App Crash',
  additionalContext: Record<string, any> = {}
) => {
  try {
    const meta = getDeviceMetadata();
    const currentUserId = auth.currentUser?.uid || 'anonymous';
    const errorMessage = typeof error === 'string' ? error : error.message || 'Unknown runtime error';
    const errorStack = typeof error === 'string' ? '' : error.stack || '';
    const timestamp = new Date().toISOString();

    const crashReport = {
      id: `crash_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      category,
      errorMessage,
      errorStack,
      userId: currentUserId,
      deviceType: meta.deviceType,
      appVersion: meta.appVersion,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
      context: additionalContext,
      timestamp,
    };

    console.error(`[Crashlytics - ${category}]`, errorMessage, crashReport);

    // Track as Firebase event
    if (firebaseAnalyticsInstance) {
      logEvent(firebaseAnalyticsInstance, 'app_exception', {
        description: errorMessage.substring(0, 100),
        fatal: category === 'App Crash' || category === 'Screen Rendering',
        category,
      });
    }

    // Track on Amplitude
    if (isAmplitudeInitialized) {
      amplitude.track('App Exception', {
        category,
        error_message: errorMessage,
      });
    }

    // Save locally
    try {
      const localCrashes = JSON.parse(localStorage.getItem('lumina_crash_reports') || '[]');
      localCrashes.unshift(crashReport);
      localStorage.setItem('lumina_crash_reports', JSON.stringify(localCrashes.slice(0, 100)));
    } catch (e) {}

    // Save to Firestore
    if (db) {
      addDoc(collection(db, 'crash_reports'), crashReport).catch(() => {});
    }
  } catch (e) {
    console.error('[Crashlytics] Failed to record crash report:', e);
  }
};

// Automatic global error handlers for Crashlytics
if (typeof window !== 'undefined') {
  window.addEventListener('error', (event) => {
    logCrashReport(event.error || event.message || 'Window Error', 'App Crash', {
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
    });
  });

  window.addEventListener('unhandledrejection', (event) => {
    logCrashReport(event.reason || 'Unhandled Promise Rejection', 'App Crash', {
      type: 'unhandledrejection',
    });
  });
}

// --------------------------------------------------
// Specific Event Trackers Required by Requirements
// --------------------------------------------------

export const trackSignUp = (method: string, isPartner: boolean = false) => {
  trackEvent('Sign Up', { method, mode: isPartner ? 'Partner' : 'Primary' });
  trackEvent('user_registration', { method, is_partner: isPartner });
};

export const trackLogin = (method: string, isPartner: boolean = false) => {
  trackEvent('Login', { method, mode: isPartner ? 'Partner' : 'Primary' });
  trackEvent('user_login', { method, is_partner: isPartner });
};

export const trackCompleteOnboarding = (isPartner: boolean = false) => {
  trackEvent('Complete Onboarding', { mode: isPartner ? 'Partner' : 'Primary' });
  trackEvent('onboarding_completed', { is_partner: isPartner });
};

export const trackLogPeriod = (periodDurationDays?: number) => {
  trackEvent('Log Period', { duration_days: periodDurationDays || 5 });
  trackEvent('period_logged', { duration_days: periodDurationDays || 5 });
};

export const trackEditCycle = (cycleLength: number, periodLength: number) => {
  trackEvent('Edit Cycle', { cycle_length: cycleLength, period_length: periodLength });
  trackEvent('cycle_edited', { cycle_length: cycleLength, period_length: periodLength });
};

export const trackSendPartnerInvite = (inviteCodeOrEmail?: string) => {
  trackEvent('Send Partner Invite', { invite_sent: true });
  trackEvent('partner_invite_sent', { invite_sent: true });
};

export const trackAcceptPartnerInvite = (partnerId?: string) => {
  trackEvent('Accept Partner Invite', { success: true });
  trackEvent('partner_invite_accepted', { success: true });
};

export const trackDeclinePartnerInvite = (partnerId?: string) => {
  trackEvent('Decline Partner Invite', { declined: true });
  trackEvent('partner_invite_declined', { declined: true });
};

export const trackCreateDiaryEntry = (moodTag?: string) => {
  trackEvent('Create Diary Entry', { mood_tag: moodTag || 'General' });
  trackEvent('diary_created', { mood_tag: moodTag || 'General' });
};

export const trackUpdateDiaryEntry = (moodTag?: string) => {
  trackEvent('Update Diary Entry', { mood_tag: moodTag || 'General' });
  trackEvent('diary_updated', { mood_tag: moodTag || 'General' });
};

export const trackOpenNotification = (type: string, category?: string) => {
  trackEvent('Open Notification', { notification_type: type, category: category || 'general' });
  trackEvent('notification_opened', { notification_type: type, category: category || 'general' });
};

export const trackStartSubscription = (planType: string = 'Premium Plan') => {
  trackEvent('Start Subscription', { plan: planType });
  trackEvent('subscription_started', { plan: planType });
};

export const trackCancelSubscription = (reason: string = 'User preference') => {
  trackEvent('Cancel Subscription', { reason });
  trackEvent('subscription_cancelled', { reason });
};

export const trackOpenWellnessContent = (title: string, category: string = 'Wellness') => {
  trackEvent('Open Wellness Content', { content_title: title, category });
};

export const trackOpenSexEducationContent = (topic: string) => {
  trackEvent('Open Sex Education Content', { topic });
};
