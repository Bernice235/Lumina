
import React, { useState, useEffect, useRef, useMemo, Suspense } from 'react';
import { 
  Smartphone, 
  Download, 
  Check, 
  Sparkles, 
  ShieldCheck, 
  Fingerprint, 
  Bell, 
  Play, 
  Pause, 
  SkipBack,
  SkipForward,
  Disc3,
  Power, 
  Eye, 
  Info, 
  RefreshCw, 
  Volume2, 
  VolumeX, 
  X,
  Trash2,
  CheckCheck,
  Activity,
  Image as ImageIcon,
  Home,
  Calendar,
  HeartPulse,
  BookOpen,
  Music,
  User as UserIcon,
  Plus,
  Menu,
  Settings as SettingsIcon,
  Flower2,
  Lock,
  KeyRound,
  CloudDownload,
  Crown,
  HeartHandshake,
  ArrowRight
} from 'lucide-react';
import { User, Symptom, DiaryEntry, SelfCareTask, AppTheme, Reminder, BirthControlLog, Song, TemperatureLog, PeriodLog, Period, ReceivedComfort, AppNotification } from './types';
import Auth from './components/Auth';
import ErrorBoundary from './components/ErrorBoundary';
import { OnboardingWizard } from './components/OnboardingWizard';
import { PartnerOnboardingWizard } from './components/PartnerOnboardingWizard';
import Dashboard from './components/Dashboard';
import PeriodTracker from './components/PeriodTracker';
import LogModal from './components/LogModal';
import { NotificationCenterModal } from './components/NotificationCenterModal';
import { AvatarVisual } from './components/AvatarVisual';
import { CompanionChat } from './components/CompanionChat';
import { CookieConsentBanner } from './components/CookieConsentBanner';
import { DeleteAccountPage } from './components/DeleteAccountPage';
import { DeleteAccountModal } from './components/DeleteAccountModal';
import { PWAInstallButton } from './components/PWAInstallButton';
import { OfflineIndicator } from './components/OfflineIndicator';
import { isRunningAsApp } from './hooks/usePWAInstall';
import { getOrCreateUserAvatar } from './services/avatarService';
import { playWelcomeVoice } from './services/gemini';
import { 
  playWelcomeVoiceGreeting, 
  getWelcomeGreeting, 
  getUserFirstName, 
  stopWelcomeVoice, 
  isSessionGreetingPlayed,
  WelcomeGreeting 
} from './services/welcomeVoiceService';
import { THEMES, SONGS, THEME_PALETTES } from './constants';
import { WALLPAPER_LIST } from './components/WallpapersAndThemesModal';
import { getDefaultNotificationSettings, calculateScheduledNotifications, sanitizeUserNotifications, scheduleNativeLocalNotification, formatDiscreetOsNotification, registerNativePush } from './services/notificationService';
import { logAvatarActionReward } from './services/avatarService';
import { parseYMDToLocalDate, reconstructCycleData } from './services/cycleSyncService';
import {
  migrateAndScrubLegacyPlaintextData,
  saveEncryptedSessionUser,
  loadEncryptedSessionUser,
  purgeAllLuminaClientSecrets,
  secureStorage,
} from './services/secureStorage';
import {
  clearDiaryPinLockout,
  getDefaultSecuritySettings,
  getDiaryPinLockoutState,
  getLocalSessionEpoch,
  recordFailedDiaryPinAttempt,
  setLocalSessionEpoch,
  userHasConfiguredPin,
  verifyDiaryPin,
} from './services/securityService';
import { authenticateWithBiometrics } from './services/biometricService';
import { syncUser as firebaseSyncUser, subscribeToGifts, subscribeToUser, subscribeToPartnerSharedView, subscribeToIncomingNotifications, markCloudNotificationRead, acceptInvite, subscribeToPartnerRequests, getCleanName, deleteUserAccount, getUserDisplayName, checkIsOnboardingCompleted } from './services/firebaseService';
import { saveAutomaticEncryptedSnapshot } from './services/backupService';
import { trackPageView } from './services/analyticsService';
import { parsePasswordResetParams } from './services/passwordResetService';
import { auth } from './services/firebase';
import { onAuthStateChanged, setPersistence, browserSessionPersistence, indexedDBLocalPersistence } from 'firebase/auth';
import { SplashScreen } from './components/SplashScreen';

// Lazy-load secondary views to optimize initial bundle and mobile load performance
const SelfCare = React.lazy(() => import('./components/SelfCare'));
const YogaTutorials = React.lazy(() => import('./components/YogaTutorials'));
const Diary = React.lazy(() => import('./components/Diary'));
const PartnerMode = React.lazy(() => import('./components/PartnerMode'));
const WaterTracker = React.lazy(() => import('./components/WaterTracker'));
const Education = React.lazy(() => import('./components/Education'));
const Cyclepedia = React.lazy(() => import('./components/Cyclepedia'));
const Wellness = React.lazy(() => import('./components/Wellness'));
const PregnancyTracker = React.lazy(() => import('./components/PregnancyTracker'));
const Settings = React.lazy(() => import('./components/Settings'));
const MusicRoom = React.lazy(() => import('./components/MusicRoom'));
const DoctorReport = React.lazy(() => import('./components/DoctorReport'));
const AnalyticsDashboardModal = React.lazy(() =>
  import('./components/AnalyticsDashboardModal').then((m) => ({ default: m.AnalyticsDashboardModal }))
);
const CycleGraph = React.lazy(() =>
  import('./components/CycleGraph').then((m) => ({ default: m.CycleGraph }))
);
const PrivacyDashboard = React.lazy(() =>
  import('./components/PrivacyDashboard').then((m) => ({ default: m.PrivacyDashboard }))
);

const PATH_TO_TAB: Record<string, string> = {
  '': 'dashboard',
  '/': 'dashboard',
  '/index.html': 'dashboard',
  '/dashboard': 'dashboard',
  '/home': 'dashboard',
  '/cycle': 'cycle',
  '/calendar': 'cycle',
  '/wellness': 'wellness',
  '/edu': 'edu',
  '/learn': 'edu',
  '/pedia': 'pedia',
  '/music': 'music',
  '/diary': 'diary',
  '/selfcare': 'selfcare',
  '/partner': 'partner',
  '/graphs': 'graphs',
  '/settings': 'settings',
  '/privacy': 'privacy',
  '/water': 'water',
  '/companion': 'companion_chat',
};

function resolveInitialRoute(pathname: string): { isNotFound: boolean; isDeleteAccountRoute: boolean; tabFromPath: string | null; shouldNormalizeUrl?: boolean } {
  const normalized = (pathname || '/').replace(/\/+$/, '') || '/';
  if (normalized === '/delete-account' || normalized === '/account-deletion') {
    return { isNotFound: false, isDeleteAccountRoute: true, tabFromPath: null };
  }
  if (normalized.startsWith('/invite/') || normalized === '/reset-password' || normalized === '/__/auth/action') {
    return { isNotFound: false, isDeleteAccountRoute: false, tabFromPath: null };
  }
  if (Object.prototype.hasOwnProperty.call(PATH_TO_TAB, normalized)) {
    return { isNotFound: false, isDeleteAccountRoute: false, tabFromPath: PATH_TO_TAB[normalized] };
  }
  return { isNotFound: false, isDeleteAccountRoute: false, tabFromPath: 'dashboard', shouldNormalizeUrl: true };
}

const isDeepEqual = (obj1: any, obj2: any): boolean => {
  if (obj1 === obj2) return true;
  if (obj1 === null || obj2 === null || typeof obj1 !== 'object' || typeof obj2 !== 'object') {
    return obj1 === obj2;
  }
  if (Array.isArray(obj1) !== Array.isArray(obj2)) return false;
  if (Array.isArray(obj1)) {
    if (obj1.length !== obj2.length) return false;
    for (let i = 0; i < obj1.length; i++) {
      if (!isDeepEqual(obj1[i], obj2[i])) return false;
    }
    return true;
  }
  const keys1 = Object.keys(obj1);
  const keys2 = Object.keys(obj2);
  if (keys1.length !== keys2.length) return false;
  for (const key of keys1) {
    if (!Object.prototype.hasOwnProperty.call(obj2, key)) return false;
    if (!isDeepEqual(obj1[key], obj2[key])) return false;
  }
  return true;
};

const syncUser = firebaseSyncUser;

const normalizeSharingSettings = (s?: Partial<User['sharingSettings']>): User['sharingSettings'] => ({
  shareCycleInfo: s?.shareCycleInfo === true,
  shareSymptoms: s?.shareSymptoms === true,
  shareMood: s?.shareMood === true,
  shareNotes: false,
  shareFertilityInfo: s?.shareFertilityInfo === true,
  sharePregnancyInfo: s?.sharePregnancyInfo === true,
  shareIntimacyInfo: s?.shareIntimacyInfo === true,
  shareDoctorReports: false,
  shareAppointmentReminders: s?.shareAppointmentReminders === true,
  shareWellnessUpdates: s?.shareWellnessUpdates === true,
});

const App: React.FC = () => {
  const [user, setUserState] = useState<User | null>(null);
  const userRef = useRef<User | null>(user);
  const setUser = (val: User | null | ((prev: User | null) => User | null)) => {
    if (typeof val === 'function') {
      setUserState((prev) => {
        const next = val(prev);
        if (isDeepEqual(prev, next)) {
          return prev;
        }
        userRef.current = next;
        return next;
      });
    } else {
      if (isDeepEqual(userRef.current, val)) {
        return;
      }
      userRef.current = val;
      setUserState(val);
    }
  };

  const [partnerUser, setPartnerUser] = useState<User | null>(null);

  const [inviteCode, setInviteCode] = useState<string | null>(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const qInvite = urlParams.get('invite');
    if (qInvite) return qInvite.trim().toUpperCase();

    const pathParts = window.location.pathname.split('/');
    const inviteIdx = pathParts.indexOf('invite');
    if (inviteIdx !== -1 && pathParts[inviteIdx + 1]) {
      return pathParts[inviteIdx + 1].trim().toUpperCase();
    }
    return null;
  });

  const handleClearInvite = () => {
    setInviteCode(null);
    const newUrl = window.location.origin + window.location.pathname;
    window.history.replaceState({}, document.title, newUrl);
  };

  const [passwordResetFlow, setPasswordResetFlow] = useState<{
    active: boolean;
    oobCode: string | null;
    postResetNotice: boolean;
  }>(() => {
    const parsed = parsePasswordResetParams(window.location.search, window.location.hash);
    if (parsed.isResetFlow) {
      return { active: true, oobCode: parsed.oobCode, postResetNotice: false };
    }
    if (parsed.isPostFirebaseContinue) {
      return { active: false, oobCode: null, postResetNotice: true };
    }
    return { active: false, oobCode: null, postResetNotice: false };
  });

  const handleClearPasswordReset = (didCompleteReset?: boolean) => {
    setPasswordResetFlow({ active: false, oobCode: null, postResetNotice: Boolean(didCompleteReset) });
    if (didCompleteReset) {
      sessionStorage.setItem('lumina_logged_out', 'true');
      auth.signOut().catch(() => {});
      setUser(null);
      setIsSessionUnlocked(false);
    }
    try {
      window.history.replaceState({}, document.title, '/');
    } catch {}
  };

  useEffect(() => {
    const parsed = parsePasswordResetParams(window.location.search, window.location.hash);
    if (parsed.isResetFlow) {
      setPasswordResetFlow({ active: true, oobCode: parsed.oobCode, postResetNotice: false });
      try {
        const cleanPath = window.location.pathname === '/reset-password' ? '/reset-password' : '/';
        window.history.replaceState({}, document.title, cleanPath);
      } catch {}
    } else if (parsed.isPostFirebaseContinue) {
      sessionStorage.setItem('lumina_logged_out', 'true');
      auth.signOut().catch(() => {});
      setUser(null);
      setIsSessionUnlocked(false);
      setPasswordResetFlow({ active: false, oobCode: null, postResetNotice: true });
      try {
        window.history.replaceState({}, document.title, '/');
      } catch {}
    }
  }, []);

  const [isNotFoundRoute, setIsNotFoundRoute] = useState<boolean>(() => resolveInitialRoute(window.location.pathname).isNotFound);
  const [isDeleteAccountRoute, setIsDeleteAccountRoute] = useState<boolean>(() => resolveInitialRoute(window.location.pathname).isDeleteAccountRoute);
  const [showGlobalDeleteModal, setShowGlobalDeleteModal] = useState<boolean>(false);
  const skipNextCloudWriteRef = useRef<boolean>(false);

  const [activeTab, setActiveTab] = useState(() => {
    const route = resolveInitialRoute(window.location.pathname);
    if (route.tabFromPath && route.tabFromPath !== 'dashboard') {
      return route.tabFromPath;
    }
    return 'dashboard';
  });
  const [settingsSubTab, setSettingsSubTab] = useState<'account' | 'cycle' | 'notifications' | 'music' | 'partner' | 'premium' | 'privacy' | 'about' | 'general' | 'billing' | 'invite' | 'mobile' | 'menu' | 'profile' | 'backup_sync' | 'help_support'>('menu');
  const [isGlobalNotificationsOpen, setIsGlobalNotificationsOpen] = useState(false);
  const [isAnalyticsOpen, setIsAnalyticsOpen] = useState(false);
  const [selectedNotifForModal, setSelectedNotifForModal] = useState<AppNotification | null>(null);
  const [simulatedNotify, setSimulatedNotify] = useState<{
    id: string;
    title: string;
    body: string;
    emoji: string;
    isPartner: boolean;
    action?: () => void;
  } | null>(null);

  const [partnerRequests, setPartnerRequests] = useState<any[]>([]);
  const notifiedRequestIds = useRef<Set<string>>(new Set());
  const isRequestsFirstLoad = useRef(true);

  // --- MOBILE SIMULATOR CONTROLS & STATUS ---
  const [useSimulator, setUseSimulator] = useState<boolean>(() => {
    return window.innerWidth >= 640;
  });
  const [phoneModel, setPhoneModel] = useState<'iphone' | 'pixel' | 'minimal' | 'pearl'>('iphone');
  const [simulatedBattery, setSimulatedBattery] = useState<number>(88);
  const [simulatedCharging, setSimulatedCharging] = useState<boolean>(false);
  const [isScreenOff, setIsScreenOff] = useState<boolean>(false);
  const [volumeHUD, setVolumeHUD] = useState<boolean>(false);
  const [hudVolumeVal, setHudVolumeVal] = useState<number>(0.5);
  const [currentTime, setCurrentTime] = useState<string>('12:00 PM');

  // Biometric screen locks on cold startup until explicitly verified
  const [isSessionUnlocked, setIsSessionUnlocked] = useState<boolean>(false);
  const [appBiometricResult, setAppBiometricResult] = useState<'idle' | 'scanning' | 'success' | 'error'>('idle');
  const [appLockError, setAppLockError] = useState<string>('');
  const [appLockPin, setAppLockPin] = useState<string>('');
  const [showLockPinFallback, setShowLockPinFallback] = useState<boolean>(false);
  const [showNotifPrePrompt, setShowNotifPrePrompt] = useState<boolean>(false);

  // Interactive Asset Creator & Builder States
  const [activeCreatorTab, setActiveCreatorTab] = useState<'icon' | 'screenshots' | 'capacitor'>('icon');
  const [iconTheme, setIconTheme] = useState<'sakura' | 'cosmic' | 'mint' | 'solar'>('sakura');
  const [iconSymbol, setIconSymbol] = useState<string>('🌸');
  const [screenshotTemplate, setScreenshotTemplate] = useState<'cosmic' | 'spiritual' | 'botanical'>('spiritual');
  const [screenshotTagline, setScreenshotTagline] = useState<string>("Your cycle and body in peaceful flow.");
  const [screenshotPlatform, setScreenshotPlatform] = useState<'ios' | 'android'>('ios');
  const [simulatingBiometricOnApp, setSimulatingBiometricOnApp] = useState<boolean>(false);

  // Migrate and scrub legacy plaintext localStorage data & sync browser history on mount
  useEffect(() => {
    migrateAndScrubLegacyPlaintextData().catch(() => {});
    const initialRoute = resolveInitialRoute(window.location.pathname);
    if (initialRoute.shouldNormalizeUrl) {
      try {
        window.history.replaceState({}, document.title, '/');
      } catch {}
    }
    const handlePopState = () => {
      const route = resolveInitialRoute(window.location.pathname);
      setIsNotFoundRoute(false);
      setIsDeleteAccountRoute(route.isDeleteAccountRoute);
      if (!route.isDeleteAccountRoute && route.tabFromPath) {
        setActiveTab(route.tabFromPath);
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const openExternalDeletionPage = () => {
    setShowGlobalDeleteModal(false);
    setIsNotFoundRoute(false);
    setIsDeleteAccountRoute(true);
    try {
      window.history.pushState({}, '', '/delete-account');
    } catch {}
  };

  // Track consent-gated screen navigation
  useEffect(() => {
    if (user && user.onboardingCompleted && !isNotFoundRoute && !isDeleteAccountRoute) {
      trackPageView(activeTab);
    }
  }, [activeTab, user?.id, user?.onboardingCompleted, isNotFoundRoute, isDeleteAccountRoute]);

  const handleNavigateFrom404 = (targetTab: string = 'dashboard') => {
    setIsNotFoundRoute(false);
    setIsDeleteAccountRoute(false);
    setActiveTab(targetTab);
    try {
      window.history.pushState({}, '', '/');
    } catch {}
  };

  // Real-time clock updating for the simulated top status bar
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      let hours = now.getHours();
      const minutes = now.getMinutes().toString().padStart(2, '0');
      const ampm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12;
      hours = hours ? hours : 12;
      setCurrentTime(`${hours}:${minutes} ${ampm}`);
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  // Welcome Voice & Greeting Toast State
  const [welcomeGreetingToast, setWelcomeGreetingToast] = useState<WelcomeGreeting | null>(null);
  const welcomeVoicePlayedRef = useRef<string | null>(null);

  // Listen for custom welcome greeting events across the app
  useEffect(() => {
    const handleGreetingEvent = (e: any) => {
      if (e.detail) {
        setWelcomeGreetingToast(e.detail);
      }
    };
    window.addEventListener('lumina:welcome-greeting', handleGreetingEvent);
    return () => window.removeEventListener('lumina:welcome-greeting', handleGreetingEvent);
  }, []);

  // Auto-dismiss greeting toast after 7.5 seconds
  useEffect(() => {
    if (welcomeGreetingToast) {
      const timer = setTimeout(() => {
        setWelcomeGreetingToast(null);
      }, 7500);
      return () => clearTimeout(timer);
    }
  }, [welcomeGreetingToast]);

  // Play personalized Welcome Voice greeting automatically every time the user opens Lumina
  useEffect(() => {
    if (user && (user.onboardingCompleted || user.isPartner)) {
      const timer = setTimeout(() => {
        try {
          // Trigger welcome voice greeting automatically upon session restoration / login
          playWelcomeVoiceGreeting(user, {
            onStart: (greeting) => {
              setWelcomeGreetingToast(greeting);
            }
          }).catch(() => {});
        } catch (e) {
          console.warn("Could not trigger welcome greeting:", e);
        }
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [user?.id]);

  // Synchronize CSS custom properties and system bar theme-color with active theme
  useEffect(() => {
    const selectedTheme = user?.theme || 'rose';
    const palette = THEME_PALETTES[selectedTheme];
    if (palette) {
      const root = document.documentElement;
      Object.entries(palette).forEach(([shade, hex]) => {
        root.style.setProperty(`--brand-${shade}`, hex as string);
      });
    }
    const isDark =
      document.documentElement.classList.contains('dark') ||
      document.documentElement.classList.contains('dark-mode') ||
      document.body.classList.contains('dark-mode');
    const themeMeta = document.querySelector('meta[name="theme-color"]:not([media])');
    if (themeMeta) {
      themeMeta.setAttribute('content', isDark ? '#11100f' : '#faf8f6');
    }
  }, [user?.theme, user?.wallpaper]);

  const triggerFullNotification = (title: string, body: string, emoji: string = '🔔') => {
    const currentUser = userRef.current;
    const hidePreviews = currentUser?.privacyPreferences?.hideNotificationPreviews ?? true;
    const discreetOs = formatDiscreetOsNotification(title, body, emoji, hidePreviews);

    if ('Notification' in window && window.Notification.permission === 'granted') {
      try {
        new window.Notification(discreetOs.title, { body: discreetOs.body });
      } catch (e) {
        console.warn("Native Notification trigger failed:", e);
      }
    }

    if (currentUser) {
      const newAlert = {
        id: crypto.randomUUID(),
        title,
        body,
        emoji,
        timestamp: new Date().toISOString(),
        isRead: false
      };
      const existingAlerts = currentUser.notifications || [];
      const updatedAlerts = [newAlert, ...existingAlerts].slice(0, 20);
      const updatedUser = {
        ...currentUser,
        notifications: updatedAlerts
      };
      setUser(updatedUser);
      syncUser(updatedUser);
      const rememberMe = localStorage.getItem('lumina_remember_me') !== 'false';
      saveEncryptedSessionUser(updatedUser, rememberMe).catch(() => {});
    }
  };

  // Subscribe to real-time partner requests (Incoming & Outgoing)
  useEffect(() => {
    if (user?.id) {
      const role = user.isPartner ? 'partner' : 'user';
      const unsub = subscribeToPartnerRequests(user.id, role, (requests) => {
        if (isRequestsFirstLoad.current) {
          // Identify existing requests and suppress initial toast banners upon login/tab reload
          requests.forEach(req => {
            notifiedRequestIds.current.add(req.id);
            notifiedRequestIds.current.add(`${req.id}_${req.status}`);
          });
          isRequestsFirstLoad.current = false;
        }
        setPartnerRequests(requests);
      });
      return () => {
        unsub();
        isRequestsFirstLoad.current = true;
      };
    } else {
      setPartnerRequests([]);
      isRequestsFirstLoad.current = true;
    }
  }, [user?.id, user?.isPartner]);

  // Handle simulated top-bar notification alerts on real-time request activities
  useEffect(() => {
    if (!user || partnerRequests.length === 0) return;

    if (!user.isPartner) {
      // Tracked user receives request alerts
      const pendingRequests = partnerRequests.filter(r => r.status === 'pending');
      pendingRequests.forEach(req => {
        if (!notifiedRequestIds.current.has(req.id)) {
          notifiedRequestIds.current.add(req.id);

          const requestedText = req.requested_permissions
            .map((p: string) => `✓ ${p}`)
            .join('\n');

          const title = "💕 New Partner Request";
          const body = `${getCleanName(req.partnerName, req.partnerEmail || '')} wants to connect with you.\n\nRequested Access:\n${requestedText}`;
          const emoji = "💕";

          setSimulatedNotify({
            id: req.id,
            title,
            body,
            emoji,
            isPartner: true,
            action: () => {
              setActiveTab('partner');
              sessionStorage.setItem('lumina_partnermode_subtab', 'requests');
              window.dispatchEvent(new CustomEvent('lumina-set-partner-subtab', { detail: 'requests' }));
            }
          });
          triggerFullNotification(title, body, emoji);
        }
      });
    } else {
      // Partner receives approved/declined status change alerts
      partnerRequests.forEach(req => {
        const key = `${req.id}_${req.status}`;
        if (!notifiedRequestIds.current.has(key)) {
          notifiedRequestIds.current.add(key);

          if (req.status === 'approved') {
            const title = "💕 Connection Approved";
            const body = `${getCleanName(req.partnerName, req.partnerEmail || '')} approved your request.`;
            const emoji = "💕";
            setSimulatedNotify({
              id: req.id,
              title,
              body,
              emoji,
              isPartner: true,
              action: () => {
                window.location.reload();
              }
            });
            triggerFullNotification(title, body, emoji);
          } else if (req.status === 'declined') {
            const title = "💔 Connection Declined";
            const body = `Your connection request has been declined or unlinked.`;
            const emoji = "💔";
            setSimulatedNotify({
              id: req.id,
              title,
              body,
              emoji,
              isPartner: true
            });
            triggerFullNotification(title, body, emoji);
          }
        }
      });
    }
  }, [partnerRequests, user]);

  // Listen for simulated notifications
  useEffect(() => {
    const playChime = () => {
      try {
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        
        const osc1 = audioCtx.createOscillator();
        const osc2 = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        
        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(523.25, audioCtx.currentTime); // C5
        osc1.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.15); // A5
        
        osc2.type = 'triangle';
        osc2.frequency.setValueAtTime(659.25, audioCtx.currentTime); // E5
        osc2.frequency.exponentialRampToValueAtTime(1046.50, audioCtx.currentTime + 0.2); // C6
        
        gainNode.gain.setValueAtTime(0.01, audioCtx.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.18, audioCtx.currentTime + 0.05);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.8);
        
        osc1.connect(gainNode);
        osc2.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        
        osc1.start();
        osc2.start();
        osc1.stop(audioCtx.currentTime + 0.8);
        osc2.stop(audioCtx.currentTime + 0.8);
      } catch (err) {
        console.warn("AudioContext chime failed:", err);
      }
    };

    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail) {
        const isNotifForPartner = !!detail.isPartner;
        const currentUserIsPartner = userRef.current ? userRef.current.isPartner : false;
        
        // Isolate notifications: partner notifications only in partner mode, user notifications only in user mode
        if (currentUserIsPartner !== isNotifForPartner) {
          return; // Ignore this notification as it's not meant for the current mode
        }

        setSimulatedNotify({
          id: crypto.randomUUID(),
          title: detail.title,
          body: detail.body,
          emoji: detail.emoji || '🔔',
          isPartner: isNotifForPartner,
          action: detail.action
        });
        playChime();
        triggerFullNotification(detail.title, detail.body, detail.emoji || '🔔');
      }
    };

    window.addEventListener('lumina-simulate-notification', handler);
    return () => window.removeEventListener('lumina-simulate-notification', handler);
  }, []);

  useEffect(() => {
    const navHandler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail && detail.tab) {
        setActiveTab(detail.tab);
        if (detail.subTab) {
          setSettingsSubTab(detail.subTab);
        }
      }
    };
    window.addEventListener('lumina-set-active-tab', navHandler);
    return () => window.removeEventListener('lumina-set-active-tab', navHandler);
  }, []);

  // Auto dismiss simulated notification
  useEffect(() => {
    if (simulatedNotify) {
      const timer = setTimeout(() => {
        setSimulatedNotify(null);
      }, 7000);
      return () => clearTimeout(timer);
    }
  }, [simulatedNotify?.id]);

  // Calculate and sync scheduled notifications to user.notifications array
  useEffect(() => {
    if (!user) return;
    const existingNotifs = user.notifications || [];
    const sanitizedNotifs = sanitizeUserNotifications(user);

    const scheduled = calculateScheduledNotifications(user, user.notificationSettings);
    let updatedNotifs = [...sanitizedNotifs];
    let hasChange = sanitizedNotifs.length !== existingNotifs.length;
    const nowISO = new Date().toISOString();

    if (scheduled && scheduled.length > 0) {
      scheduled.forEach(item => {
        const exists = updatedNotifs.some(n => n.id === item.id);
        if (!exists) {
          updatedNotifs.unshift({
            id: item.id,
            title: item.title,
            body: item.body,
            emoji: item.emoji,
            timestamp: nowISO,
            isRead: false,
            phaseInfo: item.phaseInfo,
            category: item.category,
            detailedTip: item.detailedTip
          });
          hasChange = true;
        }
      });
    }

    if (hasChange) {
      const updatedUser = { ...user, notifications: updatedNotifs };
      setUser(updatedUser);
      const rememberMe = localStorage.getItem('lumina_remember_me') !== 'false';
      saveEncryptedSessionUser(updatedUser, rememberMe).catch(() => {});
      syncUser(updatedUser);
    }
  }, [user?.id, user?.lastPeriodStart, user?.cycleLength, user?.periodLength, user?.notificationSettings?.enabled, user?.partnerNotificationPreferences]);
  const [showSplash, setShowSplash] = useState(() => {
    const parsed = parsePasswordResetParams(window.location.search, window.location.hash);
    return !parsed.isResetFlow && !parsed.isPostFirebaseContinue;
  });
  const [restoreDataPrompt, setRestoreDataPrompt] = useState<{ userData: User } | null>(null);
  const [latestCloudUser, setLatestCloudUser] = useState<User | null>(null);
  const [latestCloudLoading, setLatestCloudLoading] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  const [symptoms, setSymptomsInternal] = useState<Symptom[]>([]);
  const setSymptoms = (action: React.SetStateAction<Symptom[]>) => {
    setSymptomsInternal(prev => {
      const next = typeof action === 'function' ? (action as Function)(prev) : action;
      if (userRef.current) {
        setUser(u => u ? { ...u, symptoms: next } : null);
      }
      return next;
    });
  };

  const [diaryEntries, setDiaryEntriesInternal] = useState<DiaryEntry[]>([]);
  const setDiaryEntries = (action: React.SetStateAction<DiaryEntry[]>) => {
    setDiaryEntriesInternal(prev => {
      const next = typeof action === 'function' ? (action as Function)(prev) : action;
      if (userRef.current) {
        setUser(u => u ? { ...u, diaryEntries: next } : null);
      }
      return next;
    });
  };

  const [waterIntake, setWaterIntake] = useState(0);
  const [waterGoal, setWaterGoal] = useState(8);
  const [isMusicPlaying, setIsMusicPlaying] = useState(false);
  const [isMusicActive, setIsMusicActive] = useState(false);
  const [currentSongIndex, setCurrentSongIndex] = useState(0);
  const [activeMusicGenre, setActiveMusicGenre] = useState<string>('all');
  const [volume, setVolume] = useState(0.3);

  // Keep volume HUD in sync with global audio volume changes
  useEffect(() => {
    setHudVolumeVal(volume);
  }, [volume]);

  // Show a native iOS-like volume indicator when volume slider is dragged or buttons are pressed
  const prevVolumeRef = useRef(volume);
  useEffect(() => {
    if (volume !== prevVolumeRef.current) {
      setVolumeHUD(true);
      const timer = setTimeout(() => {
        setVolumeHUD(false);
      }, 1500);
      prevVolumeRef.current = volume;
      return () => clearTimeout(timer);
    }
  }, [volume]);
  const [reminders, setReminders] = useState<Reminder[]>([]);

  const [bcLogs, setBcLogsInternal] = useState<BirthControlLog[]>([]);
  const setBcLogs = (action: React.SetStateAction<BirthControlLog[]>) => {
    setBcLogsInternal(prev => {
      const next = typeof action === 'function' ? (action as Function)(prev) : action;
      if (userRef.current) {
        setUser(u => u ? { ...u, bcLogs: next } : null);
      }
      return next;
    });
  };

  const [tempLogs, setTempLogsInternal] = useState<TemperatureLog[]>([]);
  const setTempLogs = (action: React.SetStateAction<TemperatureLog[]>) => {
    setTempLogsInternal(prev => {
      const next = typeof action === 'function' ? (action as Function)(prev) : action;
      if (userRef.current) {
        setUser(u => u ? { ...u, tempLogs: next } : null);
      }
      return next;
    });
  };

  // Hydrate states when user profile changes
  useEffect(() => {
    if (user) {
      setSymptomsInternal(prev => {
        const next = user.symptoms || [];
        if (JSON.stringify(prev) !== JSON.stringify(next)) {
          return next;
        }
        return prev;
      });
      setDiaryEntriesInternal(prev => {
        const next = user.diaryEntries || [];
        if (JSON.stringify(prev) !== JSON.stringify(next)) {
          return next;
        }
        return prev;
      });
      setBcLogsInternal(prev => {
        const next = user.bcLogs || [];
        if (JSON.stringify(prev) !== JSON.stringify(next)) {
          return next;
        }
        return prev;
      });
      setTempLogsInternal(prev => {
        const next = user.tempLogs || [];
        if (JSON.stringify(prev) !== JSON.stringify(next)) {
          return next;
        }
        return prev;
      });
    } else {
      setSymptomsInternal([]);
      setDiaryEntriesInternal([]);
      setBcLogsInternal([]);
      setTempLogsInternal([]);
    }
  }, [
    user?.id,
    JSON.stringify(user?.symptoms || []),
    JSON.stringify(user?.diaryEntries || []),
    JSON.stringify(user?.bcLogs || []),
    JSON.stringify(user?.tempLogs || [])
  ]);
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [isDoctorReportOpen, setIsDoctorReportOpen] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [receivedGifts, setReceivedGifts] = useState<ReceivedComfort[]>([]);
  const [authLoading, setAuthLoading] = useState(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const qInvite = urlParams.get('invite');
    const pathParts = window.location.pathname.split('/');
    const inviteIdx = pathParts.indexOf('invite');
    const hasInvite = !!(qInvite || (inviteIdx !== -1 && pathParts[inviteIdx + 1]));
    const parsedReset = parsePasswordResetParams(window.location.search, window.location.hash);

    if (hasInvite || parsedReset.isResetFlow || parsedReset.isPostFirebaseContinue) return false;
    return true;
  });

  // Auto-lock on backgrounding or inactivity when App Lock or Auto-Lock is enabled
  useEffect(() => {
    const canLockWithPin = userHasConfiguredPin(user);
    const lockEnabled = Boolean(
      user && (
        user.biometricsEnabled ||
        user.securitySettings?.biometricQuickUnlock ||
        (user.privacyPreferences?.autoLockOnBlur && canLockWithPin)
      )
    );
    if (!lockEnabled || !isSessionUnlocked) {
      return;
    }

    let lastHiddenAt = 0;
    let inactivityTimer: ReturnType<typeof setTimeout> | null = null;
    const timeoutMinutes = Math.max(1, Math.min(30, Number(user?.privacyPreferences?.autoLockTimeoutMinutes) || 5));

    const lockSessionNow = () => {
      setIsSessionUnlocked(false);
      setAppBiometricResult('idle');
      setAppLockError('');
    };

    const resetInactivity = () => {
      if (inactivityTimer) clearTimeout(inactivityTimer);
      inactivityTimer = setTimeout(lockSessionNow, timeoutMinutes * 60 * 1000);
    };

    const handleVisibility = () => {
      if (document.visibilityState === 'hidden') {
        lastHiddenAt = Date.now();
        if (user?.privacyPreferences?.autoLockOnBlur) {
          lockSessionNow();
        }
      } else if (document.visibilityState === 'visible') {
        if (lastHiddenAt && Date.now() - lastHiddenAt > 2000) {
          lockSessionNow();
        }
      }
    };

    const activityEvents: (keyof WindowEventMap)[] = ['pointerdown', 'keydown', 'touchstart', 'scroll'];
    activityEvents.forEach((ev) => window.addEventListener(ev, resetInactivity, { passive: true }));
    document.addEventListener('visibilitychange', handleVisibility);
    resetInactivity();

    return () => {
      if (inactivityTimer) clearTimeout(inactivityTimer);
      activityEvents.forEach((ev) => window.removeEventListener(ev, resetInactivity));
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [
    user?.id,
    user?.biometricsEnabled,
    user?.securitySettings?.biometricQuickUnlock,
    user?.privacyPreferences?.autoLockOnBlur,
    user?.privacyPreferences?.autoLockTimeoutMinutes,
    isSessionUnlocked
  ]);

  // Restore Session strictly via Firebase Authentication & AES-GCM-256 Encrypted Storage
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const qInvite = urlParams.get('invite');
    const pathParts = window.location.pathname.split('/');
    const inviteIdx = pathParts.indexOf('invite');
    const hasInvite = !!(qInvite || (inviteIdx !== -1 && pathParts[inviteIdx + 1]));

    if (hasInvite) {
      purgeAllLuminaClientSecrets().catch(() => {});
      auth.signOut().catch(() => {});
      setUser(null);
      setIsSessionUnlocked(false);
      setAuthLoading(false);
      return;
    }

    const rememberPref = localStorage.getItem('lumina_remember_me') !== 'false';
    try {
      setPersistence(auth, rememberPref ? indexedDBLocalPersistence : browserSessionPersistence).catch(() => {});
    } catch {}

    let unsubscribeUser: (() => void) | undefined;

    const unsubscribeAuth = onAuthStateChanged(auth, async (fbUser: any) => {
      if (typeof unsubscribeUser === 'function') {
        unsubscribeUser();
        unsubscribeUser = undefined;
      }

      if (hasInvite) {
        setLatestCloudUser(null);
        setLatestCloudLoading(false);
        setAuthLoading(false);
        return;
      }

      if (fbUser) {
        setLatestCloudLoading(true);
        const rememberNow = localStorage.getItem('lumina_remember_me') !== 'false';
        const encryptedCached = await loadEncryptedSessionUser<User>(rememberNow);

        unsubscribeUser = subscribeToUser(fbUser.uid, async (userData) => {
          if (userData) {
            let emailBackup: Partial<User> = {};
            if (userData.email) {
              const rawEnc = await secureStorage.getItem(`user_email_${userData.email.toLowerCase().trim()}`);
              if (rawEnc) {
                try {
                  emailBackup = JSON.parse(rawEnc);
                } catch {}
              }
            }

            const mergedBio =
              Boolean(userData.biometricsEnabled ?? emailBackup.biometricsEnabled ?? encryptedCached?.biometricsEnabled) ||
              Boolean(userData.securitySettings?.biometricQuickUnlock);

            const fullUser: User = {
              ...emailBackup,
              ...userData,
              cycleLength: userData.cycleLength ?? emailBackup.cycleLength ?? 28,
              periodLength: userData.periodLength ?? emailBackup.periodLength ?? 5,
              automaticCyclePrediction: userData.automaticCyclePrediction ?? emailBackup.automaticCyclePrediction ?? false,
              lastPeriodStart: userData.lastPeriodStart || emailBackup.lastPeriodStart || new Date().toISOString(),
              periods: userData.periods !== undefined ? userData.periods : (emailBackup.periods || []),
              periodDates: userData.periodDates !== undefined ? userData.periodDates : (emailBackup.periodDates || []),
              periodLogs: userData.periodLogs !== undefined ? userData.periodLogs : (emailBackup.periodLogs || []),
              symptoms: userData.symptoms && userData.symptoms.length > 0 ? userData.symptoms : (emailBackup.symptoms || []),
              moodLogs: userData.moodLogs && userData.moodLogs.length > 0 ? userData.moodLogs : (emailBackup.moodLogs || []),
              theme: userData.theme || emailBackup.theme || 'rose',
              tempUnit: userData.tempUnit || emailBackup.tempUnit || 'C',
              isPregnancyMode: userData.isPregnancyMode ?? emailBackup.isPregnancyMode ?? false,
              onboardingCompleted: checkIsOnboardingCompleted(userData, emailBackup),
              diaryPin: userData.diaryPin && userData.diaryPin !== '1234' ? userData.diaryPin : undefined,
              diaryPinHash: userData.diaryPinHash || emailBackup.diaryPinHash,
              diaryPinSalt: userData.diaryPinSalt || emailBackup.diaryPinSalt,
              biometricsEnabled: mergedBio,
              favoriteSongs: userData.favoriteSongs || emailBackup.favoriteSongs || [],
              customSongs: userData.customSongs || emailBackup.customSongs || [],
              isPartnerLinked: userData.isPartnerLinked ?? emailBackup.isPartnerLinked ?? false,
              sharingSettings: normalizeSharingSettings(userData.sharingSettings || emailBackup.sharingSettings),
              birthControlConfig: userData.birthControlConfig || emailBackup.birthControlConfig || {
                method: 'Pill',
                frequency: 'daily',
                reminderTime: '09:00',
                enabled: false,
              },
              waterGoal: userData.waterGoal || emailBackup.waterGoal || 8,
              notificationSettings: userData.notificationSettings || emailBackup.notificationSettings || getDefaultNotificationSettings(),
            };

            setLatestCloudUser(fullUser);
            setLatestCloudLoading(false);

            const cloudEpoch = fullUser.securitySettings?.sessionEpoch || 1;
            const hasLocalEpoch = localStorage.getItem(`lumina_session_epoch_${fullUser.id}`) !== null;
            const localEpoch = getLocalSessionEpoch(fullUser.id);
            if (hasLocalEpoch && cloudEpoch > localEpoch) {
              handleLogout();
              setAuthLoading(false);
              return;
            }
            setLocalSessionEpoch(fullUser.id, cloudEpoch);

            if (fullUser.email) {
              const emailCacheKey = `user_email_${fullUser.email.toLowerCase().trim()}`;
              if (rememberNow) {
                secureStorage.setItem(emailCacheKey, JSON.stringify(fullUser)).catch(() => {});
              } else {
                secureStorage.removeItem(emailCacheKey).catch(() => {});
              }
            }
            await saveEncryptedSessionUser(fullUser, rememberNow);

            const requiresBioUnlock = Boolean(fullUser.biometricsEnabled || fullUser.securitySettings?.biometricQuickUnlock);
            const hadUserBefore = Boolean(userRef.current);
            if (!hadUserBefore) {
              if (!requiresBioUnlock) {
                setIsSessionUnlocked(true);
              }
            }

            if (!hadUserBefore || !isDeepEqual(fullUser, userRef.current)) {
              skipNextCloudWriteRef.current = true;
              setUser(fullUser);
              setWaterGoal(fullUser.waterGoal || 8);
              const initialRoute = resolveInitialRoute(window.location.pathname);
              if (!hadUserBefore && !initialRoute.tabFromPath) {
                if (fullUser.isPartner) setActiveTab('partner');
                else if (fullUser.isPregnancyMode) setActiveTab('cycle');
              }
            }
          } else {
            setLatestCloudLoading(false);
          }
          setAuthLoading(false);
        });
      } else {
        setLatestCloudUser(null);
        setLatestCloudLoading(false);
        if (sessionStorage.getItem('lumina_deletion_in_progress') === 'true') {
          setAuthLoading(false);
          return;
        }
        const currentInMem = userRef.current;
        if (currentInMem && (currentInMem.id.startsWith('sandbox_') || currentInMem.id.startsWith('offline_'))) {
          setAuthLoading(false);
          return;
        }
        setUser(null);
        setIsSessionUnlocked(false);
        setAuthLoading(false);
      }
    });

    return () => {
      if (typeof unsubscribeUser === 'function') {
        unsubscribeUser();
      }
      unsubscribeAuth();
    };
  }, []);

  const [selfCareTasks, setSelfCareTasks] = useState<SelfCareTask[]>([
    { id: '1', task: 'Drink warm tea ritual', completed: false },
    { id: '2', task: 'Facial massage', completed: false },
    { id: '3', task: 'Meditation for 5 mins', completed: false },
    { id: '4', task: 'Gentle yoga stretch', completed: false },
  ]);

  const lastGiftCount = useRef<number | null>(null);

  // Real-time Gifts Listener & push notifications
  useEffect(() => {
    if (user) {
      const unsub = subscribeToGifts(user.id, (gifts) => {
        setReceivedGifts(gifts);
        if (lastGiftCount.current !== null && gifts.length > lastGiftCount.current) {
          const newGift = gifts[gifts.length - 1];
          const emojiMap: Record<string, string> = {
            flower: '🌸',
            chocolate: '🍫',
            tea: '🍵',
            hug: '💖',
            sparkle: '✨'
          };
          const emoji = emojiMap[newGift.type.toLowerCase()] || '💝';
          setSimulatedNotify({
            id: newGift.id,
            title: `💝 Digital Gift from ${newGift.senderName || 'Partner'}`,
            body: `${newGift.senderName || 'Your partner'} sent you a digital ${newGift.type}! ${emoji}`,
            emoji: emoji,
            isPartner: false,
            action: () => {
              setActiveTab('dashboard');
            }
          });
        }
        lastGiftCount.current = gifts.length;
      });
      return () => unsub();
    }
  }, [user?.id]);

  // Subscribe to recipient-scoped /notifications collection for cross-user partner alerts & gifts
  useEffect(() => {
    if (!user?.id) return;
    const unsub = subscribeToIncomingNotifications(user.id, (cloudNotifs) => {
      const current = userRef.current;
      if (!current || cloudNotifs.length === 0) return;

      const existingIds = new Set((current.notifications || []).map((n) => n.id));
      const newOnes = cloudNotifs.filter((cn) => !existingIds.has(cn.id));
      if (newOnes.length > 0) {
        const mapped: AppNotification[] = newOnes.map((cn) => ({
          id: cn.id,
          title: cn.title,
          body: cn.body,
          emoji: cn.emoji || '💕',
          timestamp: cn.timestamp,
          isRead: Boolean(cn.read || cn.isRead),
          category: (cn.category as AppNotification['category']) || 'partner',
          isPartnerRequest: Boolean(cn.isPartnerRequest),
          isPartner: cn.category === 'partner',
        }));

        const unreadNew = mapped.find((m) => !m.isRead);
        if (unreadNew) {
          setSimulatedNotify({
            id: unreadNew.id,
            title: unreadNew.title,
            body: unreadNew.body,
            emoji: unreadNew.emoji || '💕',
            isPartner: Boolean(current.isPartner),
          });
        }

        const updated: User = {
          ...current,
          notifications: [...mapped, ...(current.notifications || [])].slice(0, 50),
        };
        setUser(updated);
        syncUser(updated);
        mapped.forEach((m) => markCloudNotificationRead(m.id).catch(() => {}));
      }
    });
    return () => unsub();
  }, [user?.id]);

  // Sync changes securely to Firestore & AES-GCM-256 encrypted storage (never plaintext localStorage)
  useEffect(() => {
    if (user) {
      if (skipNextCloudWriteRef.current) {
        skipNextCloudWriteRef.current = false;
        return;
      }
      syncUser(user);
      if (user.email) {
        secureStorage.setItem(`user_email_${user.email.toLowerCase().trim()}`, JSON.stringify(user)).catch(() => {});
      }
      const isRememberEnabled = localStorage.getItem('lumina_remember_me') !== 'false';
      saveEncryptedSessionUser(user, isRememberEnabled).catch(() => {});
    }
  }, [user]);

  // Debounced AES-256 Encrypted Automatic Local Backup Snapshot
  useEffect(() => {
    if (!user?.id || user.backupMetadata?.autoBackupEnabled === false) return;
    const timer = setTimeout(() => {
      saveAutomaticEncryptedSnapshot(user, {
        symptoms,
        diaryEntries,
        bcLogs,
        tempLogs,
        reminders,
      })
        .then((snap) => {
          if (snap && snap.createdAt !== userRef.current?.backupMetadata?.lastAutoBackupAt) {
            setUser((prev) =>
              prev
                ? {
                    ...prev,
                    backupMetadata: {
                      autoBackupEnabled: prev.backupMetadata?.autoBackupEnabled ?? true,
                      lastAutoBackupAt: snap.createdAt,
                      lastManualExportAt: prev.backupMetadata?.lastManualExportAt,
                      lastChecksum: snap.checksum,
                      snapshotCount: (prev.backupMetadata?.snapshotCount || 0) + 1,
                    },
                  }
                : prev
            );
          }
        })
        .catch(() => {});
    }, 2500);
    return () => clearTimeout(timer);
  }, [
    user?.id,
    user?.periods?.length,
    user?.periodDates?.length,
    symptoms.length,
    diaryEntries.length,
    bcLogs.length,
    tempLogs.length,
  ]);

  // ----------------------------------------------------
  // AUTOMATIC NOTIFICATION ENGINE & SCHEDULER
  // ----------------------------------------------------
  useEffect(() => {
    if (!user) return;

    const activeSettings = user.notificationSettings || getDefaultNotificationSettings();
    if (!activeSettings.enabled && !activeSettings.partnerNotificationsEnabled) {
      return;
    }

    // Show respectful in-app pre-permission consent card instead of cold browser OS prompt
    if (
      'Notification' in window &&
      window.Notification.permission === 'default' &&
      localStorage.getItem('lumina_notif_preprompt_dismissed') !== 'true'
    ) {
      setShowNotifPrePrompt(true);
    }

    const scheduled = calculateScheduledNotifications(user, activeSettings);
    if (!scheduled || scheduled.length === 0) return;

    const existingNotifs = user.notifications || [];
    const existingIds = new Set(existingNotifs.map(n => n.id));
    const newNotifsToAdd: { id: string; title: string; body: string; emoji: string; timestamp: string; isRead: boolean }[] = [];

    scheduled.forEach(item => {
      if (!existingIds.has(item.id)) {
        newNotifsToAdd.push({
          id: item.id,
          title: item.title,
          body: item.body,
          emoji: item.emoji || '🔔',
          timestamp: new Date().toISOString(),
          isRead: false
        });
      }
    });

    if (newNotifsToAdd.length > 0) {
      const topAlert = newNotifsToAdd[0];
      const hidePreviews = user.privacyPreferences?.hideNotificationPreviews ?? true;
      const discreetOs = formatDiscreetOsNotification(topAlert.title, topAlert.body, topAlert.emoji, hidePreviews);

      if ('Notification' in window && window.Notification.permission === 'granted') {
        try {
          new window.Notification(discreetOs.title, { body: discreetOs.body });
        } catch (e) {
          console.warn("Native Notification trigger failed:", e);
        }
      }

      const updatedNotifs = [...newNotifsToAdd, ...existingNotifs].slice(0, 50);
      const updatedUser: User = {
        ...user,
        notifications: updatedNotifs
      };
      setUser(updatedUser);
      syncUser(updatedUser);
      const rememberMe = localStorage.getItem('lumina_remember_me') !== 'false';
      saveEncryptedSessionUser(updatedUser, rememberMe).catch(() => {});
    }
  }, [
    user?.id,
    user?.lastPeriodStart,
    user?.cycleLength,
    user?.periodLength,
    user?.isPregnancyMode,
    user?.notificationSettings?.enabled,
    user?.notificationSettings?.toneStyle,
    JSON.stringify(user?.notificationSettings?.types || {})
  ]);

  const proceedWithLogin = (userData: User, remember: boolean = true, options?: { skipCloudOverride?: boolean }) => {
    const activeData = (!options?.skipCloudOverride && latestCloudUser && latestCloudUser.id === userData.id)
      ? latestCloudUser
      : userData;

    const fullUser: User = {
      ...activeData,
      theme: activeData.theme || 'rose',
      tempUnit: activeData.tempUnit || 'C',
      isPregnancyMode: activeData.isPregnancyMode || false,
      onboardingCompleted: options?.skipCloudOverride
        ? Boolean(userData.onboardingCompleted)
        : checkIsOnboardingCompleted(activeData, userData),
      diaryPin: activeData.diaryPin && activeData.diaryPin !== '1234' ? activeData.diaryPin : undefined,
      diaryPinHash: activeData.diaryPinHash,
      diaryPinSalt: activeData.diaryPinSalt,
      biometricsEnabled: Boolean(activeData.biometricsEnabled),
      favoriteSongs: activeData.favoriteSongs || [],
      customSongs: activeData.customSongs || [],
      isPartnerLinked: activeData.isPartnerLinked || false,
      sharingSettings: normalizeSharingSettings(activeData.sharingSettings),
      birthControlConfig: activeData.birthControlConfig || {
        method: 'Pill',
        frequency: 'daily',
        reminderTime: '09:00',
        enabled: false
      },
      waterGoal: activeData.waterGoal || 8,
      notificationSettings: activeData.notificationSettings || getDefaultNotificationSettings()
    };

    try {
      setPersistence(auth, remember ? indexedDBLocalPersistence : browserSessionPersistence).catch((err) => {
        console.warn("Failed to configure auth persistence:", err);
      });
    } catch (e) {
      console.warn("Failed to configure dynamic persistence:", e);
    }

    sessionStorage.removeItem('lumina_logged_out');
    localStorage.setItem('lumina_remember_me', remember ? 'true' : 'false');
    setIsSessionUnlocked(true);
    setUser(fullUser);
    saveEncryptedSessionUser(fullUser, remember).catch(() => {});

    setWaterGoal(fullUser.waterGoal || 8);
    playWelcomeVoiceGreeting(fullUser, { force: true }).catch(() => {});

    if (fullUser.isPartner) {
      setActiveTab('partner');
    } else if (fullUser.isPregnancyMode) {
      setActiveTab('cycle');
    } else {
      setActiveTab('dashboard');
    }
  };

  const handleContinueAsNewUser = (userData: User) => {
    const newUserObj: User = {
      id: userData.id,
      email: userData.email,
      name: userData.name,
      partnerName: userData.partnerName || '',
      cycleLength: userData.cycleLength || 28,
      periodLength: userData.periodLength || 5,
      lastPeriodStart: userData.lastPeriodStart || new Date().toISOString(),
      isPartner: false,
      theme: 'rose',
      tempUnit: 'C',
      isPregnancyMode: false,
      onboardingCompleted: false, // Force new onboarding experience
      diaryPin: undefined,
      favoriteSongs: [],
      customSongs: [],
      isPartnerLinked: false,
      sharingSettings: {
        shareCycleInfo: false,
        shareSymptoms: false,
        shareMood: false,
        shareNotes: false,
        shareFertilityInfo: false,
        sharePregnancyInfo: false,
        shareIntimacyInfo: false,
        shareDoctorReports: false,
        shareAppointmentReminders: false,
        shareWellnessUpdates: false,
      },
      birthControlConfig: {
        method: 'Pill',
        frequency: 'daily',
        reminderTime: '09:00',
        enabled: false
      },
      waterGoal: 8,
      notificationSettings: getDefaultNotificationSettings(),
      periods: [],
      periodDates: [],
      periodLogs: [],
      symptoms: [],
      moodLogs: [],
      bcLogs: [],
      diaryEntries: [],
      tempLogs: [],
    };
    
    proceedWithLogin(newUserObj, true, { skipCloudOverride: true });
    setRestoreDataPrompt(null);
  };

  const handleLogin = (userData: User, rememberMe: boolean = true) => {
    // Check cloud backup and restore saved logged entries automatically for legacy accounts
    const hasRealLoggedData = !!(
      (userData.periods && userData.periods.length > 0) || 
      (userData.symptoms && userData.symptoms.length > 0) ||
      (userData.moodLogs && userData.moodLogs.length > 0) ||
      (userData.periodDates && userData.periodDates.length > 0) ||
      (userData.bcLogs && userData.bcLogs.length > 0) ||
      (userData.diaryEntries && userData.diaryEntries.length > 0)
    );

    const isCompleted = userData.onboardingCompleted === false 
      ? false 
      : (userData.onboardingCompleted === true || hasRealLoggedData);

    const restoredUser = {
      ...userData,
      onboardingCompleted: isCompleted
    };
    proceedWithLogin(restoredUser, rememberMe);
  };

  const handleLogout = () => {
    auth.signOut().catch(() => {});

    setUser(null);
    setPartnerUser(null);
    setLatestCloudUser(null);
    setIsSessionUnlocked(false);
    setAppBiometricResult('idle');
    setAppLockError('');
    setAppLockPin('');
    setShowLockPinFallback(false);
    setIsMusicPlaying(false);
    welcomeVoicePlayedRef.current = null;

    sessionStorage.setItem('lumina_logged_out', 'true');
    purgeAllLuminaClientSecrets().catch(() => {});
    localStorage.removeItem('lumina_saved_email');
    localStorage.removeItem('lumina_saved_password');
    localStorage.removeItem('lumina_saved_name');
    localStorage.removeItem('lumina_remember_me');
  };

  // Handle auto-linking on login / startup with an invitation code
  useEffect(() => {
    if (inviteCode && user) {
      if (!user.isPartner) {
        console.log("Logged in user is a standard cycle tracker. Logging out to ensure separate partner setup.");
        handleLogout();
      } else if (!user.partnerId) {
        const codeToAccept = inviteCode.toUpperCase();
        acceptInvite(codeToAccept, user.id, user.name)
          .then((inviteData) => {
            if (inviteData) {
              const updated = {
                ...user,
                partnerId: inviteData.senderId,
                partnerName: inviteData.name,
                isPartnerLinked: false,
                isPartner: true
              };
              setUser(updated);
              const rememberMe = localStorage.getItem('lumina_remember_me') !== 'false';
              saveEncryptedSessionUser(updated, rememberMe).catch(() => {});
              handleClearInvite();
            }
          })
          .catch((err) => {
            console.error("Auto linking failed during session load:", err);
          });
      }
    }
  }, [inviteCode, user?.id, user?.isPartner, user?.partnerId]);

  // Subscribe linked Partner strictly to /users/{partnerId}/partner_shared/summary (never full user doc)
  useEffect(() => {
    if (user && user.partnerId && user.isPartner) {
      const unsubscribe = subscribeToPartnerSharedView(user.partnerId, (summary) => {
        if (!summary) {
          setPartnerUser(null);
          return;
        }
        const mappedPartnerView: User = {
          id: summary.ownerId,
          name: summary.ownerName,
          email: '',
          partnerName: getUserDisplayName(user),
          partnerId: user.id,
          isPartnerLinked: summary.isPartnerLinked,
          isSharingPaused: summary.isSharingPaused,
          isPartner: false,
          cycleLength: summary.cycleLength || 28,
          periodLength: summary.periodLength || 5,
          lastPeriodStart: summary.lastPeriodStart || new Date().toISOString(),
          isPregnancyMode: Boolean(summary.isPregnancyMode),
          isPostpartumMode: Boolean(summary.isPostpartumMode),
          pregnancyStartDate: summary.pregnancyStartDate,
          deliveryDate: summary.deliveryDate,
          theme: summary.theme || 'rose',
          tempUnit: 'C',
          onboardingCompleted: true,
          sharingSettings: summary.sharingSettings,
          periods: summary.periods || [],
          periodLogs: summary.periodLogs || [],
          periodDates: summary.periodDates || [],
          symptoms: summary.symptoms || [],
          moodLogs: summary.moodLogs || [],
          todaySymptomLog: summary.todaySymptomLog,
          sexualActivityLogs: summary.sexualActivityLogs,
          wishlist: summary.wishlist,
          partnerSupportPreferences: summary.partnerSupportPreferences,
          receivedComforts: summary.receivedComforts,
          pregnancyAppointments: summary.pregnancyAppointments,
          waterGoal: 8,
        };
        setPartnerUser(mappedPartnerView);
      });
      return () => unsubscribe();
    } else {
      setPartnerUser(null);
    }
  }, [user?.id, user?.partnerId, user?.isPartner]);

  const updateTheme = (newTheme: AppTheme) => {
    if (user) {
      setUser({ ...user, theme: newTheme });
    }
  };

  const updateTempUnit = (unit: 'C' | 'F') => {
    if (user) {
      setUser({ ...user, tempUnit: unit });
    }
  };

  const togglePregnancy = () => {
    if (user) {
      setUser({ 
        ...user, 
        isPregnancyMode: !user.isPregnancyMode,
        pregnancyStartDate: !user.isPregnancyMode ? new Date().toISOString() : undefined 
      });
    }
  };

  const updateBCConfig = (config: User['birthControlConfig']) => {
    if (user && config) {
      setUser({ ...user, birthControlConfig: config });
    }
  };

  const handleLogPeriod = async (intensity: PeriodLog['intensity']) => {
    if (!user) return;
    const today = new Date();
    const periodLen = user.periodLength || 5;
    const end = new Date(today.getTime() + (periodLen - 1) * 86400000);
    const startStr = today.toDateString();
    const endStr = end.toDateString();

    const newPeriod: Period = {
      id: crypto.randomUUID(),
      startDate: startStr,
      endDate: endStr,
      intensity
    };

    const reconstructed = reconstructCycleData(
      [newPeriod, ...(user.periods || [])],
      user.periodDates,
      user.periodLogs
    );

    const updatedUser: User = {
      ...user,
      periods: reconstructed.periods,
      periodDates: reconstructed.periodDates,
      periodLogs: reconstructed.periodLogs,
      lastPeriodStart: startStr,
      latePeriodCheckIn: undefined,
      latePeriodDismissedDate: undefined
    };

    setUser(updatedUser);
    try {
      await syncUser(updatedUser);
    } catch (e) {
      console.warn("Failed to sync logged period:", e);
    }

    logAvatarActionReward(updatedUser, 'log_cycle', 'Logged Today Period Flow', setUser);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('lumina:checkin-completed', { detail: { type: 'period' } }));
    }
    setIsLogModalOpen(false);
  };

  const handleLogFullPeriod = async (startDateInput: string, endDateInput: string, intensity: PeriodLog['intensity']) => {
    if (!user) return;
    const start = parseYMDToLocalDate(startDateInput);
    let end = parseYMDToLocalDate(endDateInput);
    if (end < start) end = new Date(start);

    const startStr = start.toDateString();
    const endStr = end.toDateString();

    const newPeriod: Period = {
      id: crypto.randomUUID(),
      startDate: startStr,
      endDate: endStr,
      intensity
    };

    const reconstructed = reconstructCycleData(
      [newPeriod, ...(user.periods || [])],
      [],
      []
    );

    const updatedUser: User = {
      ...user,
      periods: reconstructed.periods,
      periodDates: reconstructed.periodDates,
      periodLogs: reconstructed.periodLogs,
      lastPeriodStart: reconstructed.lastPeriodStart,
      latePeriodCheckIn: undefined,
      latePeriodDismissedDate: undefined
    };

    setUser(updatedUser);
    try {
      await syncUser(updatedUser);
    } catch (e) {
      console.warn("Failed to sync full period log:", e);
    }

    logAvatarActionReward(updatedUser, 'log_cycle', 'Logged Completed Cycle', setUser);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('lumina:checkin-completed', { detail: { type: 'period' } }));
    }
    setIsLogModalOpen(false);
  };

  const handleLogMood = (mood: any, note?: string) => {
    if (!user) return;
    const newMoodEntry = {
      id: crypto.randomUUID(),
      date: new Date().toDateString(),
      mood,
      note
    };
    setUser({
      ...user,
      moodLogs: [...(user.moodLogs || []), newMoodEntry]
    });
    logAvatarActionReward(user, 'log_mood', 'Logged Mood & Emotion', setUser);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('lumina:symptom-logged', { detail: { type: mood } }));
    }
  };

  const handleLogSexualActivity = (isProtected: boolean, notes?: string) => {
    if (!user) return;
    const newLog = {
      id: crypto.randomUUID(),
      date: new Date().toDateString(),
      protected: isProtected,
      notes
    };
    setUser({
      ...user,
      sexualActivityLogs: [...(user.sexualActivityLogs || []), newLog]
    });
  };

  const handleLogSymptom = (type: Symptom['type'], intensity: Symptom['intensity']) => {
    if (!user) return;
    const newSymptom: Symptom = {
      id: crypto.randomUUID(),
      date: new Date().toDateString(),
      type,
      intensity
    };
    // Prior to Firebase we were using a separate symptoms state
    setSymptoms(prev => [...prev, newSymptom]);
    logAvatarActionReward(user, 'track_symptoms', `Tracked Symptom: ${type}`, setUser);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('lumina:symptom-logged', { detail: { type, intensity } }));
    }
  };

  const toggleFavoriteSong = (songId: string) => {
    if (!user) return;
    const currentFavs = user.favoriteSongs || [];
    const newFavs = currentFavs.includes(songId) 
      ? currentFavs.filter(id => id !== songId) 
      : [...currentFavs, songId];
    setUser({ ...user, favoriteSongs: newFavs });
  };

  const addCustomSong = (song: Song) => {
    if (!user) return;
    const newCustoms = [...(user.customSongs || []), song];
    setUser({ ...user, customSongs: newCustoms });
  };

  const updatePeriodDates = async (dates: string[]) => {
    if (user) {
      const updatedUser = { ...user, periodDates: dates };
      setUser(updatedUser);
      try {
        await syncUser(updatedUser);
      } catch (e) {
        console.warn("Failed to sync periodDates:", e);
      }
    }
  };

  const handleUpdateWaterGoal = (goal: number) => {
    setWaterGoal(goal);
    if (user) {
      setUser({ ...user, waterGoal: goal });
    }
  };

  const fullLibrary = [...SONGS, ...(user?.customSongs || [])];

  const activeQueue = useMemo(() => {
    return fullLibrary.filter(song => {
      if (activeMusicGenre === 'all') return true;
      const isLofi = activeMusicGenre === 'lo-fi' || activeMusicGenre === 'lofi chill';
      const isNature = activeMusicGenre === 'nature sounds' || activeMusicGenre === 'nature soundscapes';
      const isAmbient = activeMusicGenre === 'ambient' || activeMusicGenre === 'cosmic';
      
      if (isLofi) return song.tags.includes('lo-fi') || song.tags.includes('lofi chill');
      if (isNature) return song.tags.includes('nature sounds') || song.tags.includes('nature soundscapes');
      if (isAmbient) return song.tags.includes('ambient') || song.tags.includes('cosmic');
      
      return song.tags.includes(activeMusicGenre);
    });
  }, [fullLibrary, activeMusicGenre]);

  const nextSong = () => {
    if (activeQueue.length === 0) return;
    const currentSong = fullLibrary[currentSongIndex];
    const currentQueueIdx = activeQueue.findIndex(s => s.id === currentSong?.id);
    
    let nextTrack;
    if (currentQueueIdx === -1) {
      nextTrack = activeQueue[0];
    } else {
      const nextQueueIdx = (currentQueueIdx + 1) % activeQueue.length;
      nextTrack = activeQueue[nextQueueIdx];
    }
    
    if (nextTrack) {
      const globalIdx = fullLibrary.findIndex(s => s.id === nextTrack.id);
      if (globalIdx !== -1) {
        setCurrentSongIndex(globalIdx);
      }
    }
  };

  const prevSong = () => {
    if (activeQueue.length === 0) return;
    const currentSong = fullLibrary[currentSongIndex];
    const currentQueueIdx = activeQueue.findIndex(s => s.id === currentSong?.id);
    
    let prevTrack;
    if (currentQueueIdx === -1) {
      prevTrack = activeQueue[activeQueue.length - 1];
    } else {
      const prevQueueIdx = (currentQueueIdx - 1 + activeQueue.length) % activeQueue.length;
      prevTrack = activeQueue[prevQueueIdx];
    }
    
    if (prevTrack) {
      const globalIdx = fullLibrary.findIndex(s => s.id === prevTrack.id);
      if (globalIdx !== -1) {
        setCurrentSongIndex(globalIdx);
      }
    }
  };

  useEffect(() => {
    if (audioRef.current) {
      const currentTrack = fullLibrary[currentSongIndex];
      if (currentTrack?.source === 'internal') {
        if (isMusicPlaying) {
          audioRef.current.play().catch(e => console.log("Playback interaction required", e));
        } else {
          audioRef.current.pause();
        }
      }
    }
  }, [isMusicPlaying]);

  useEffect(() => {
    if (audioRef.current) {
      const currentTrack = fullLibrary[currentSongIndex];
      if (currentTrack?.source === 'internal') {
        audioRef.current.load(); // Force load the new track src!
        if (isMusicPlaying) {
          audioRef.current.play().catch(e => console.log("Playback interaction required", e));
        }
      }
    }
  }, [currentSongIndex, user?.customSongs]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  const toggleMusic = () => {
    const nextPlayingState = !isMusicPlaying;
    setIsMusicPlaying(nextPlayingState);
    if (nextPlayingState) {
      setIsMusicActive(true);
    }
  };

  const toggleMusicActive = () => {
    const nextActiveState = !isMusicActive;
    setIsMusicActive(nextActiveState);
    setIsMusicPlaying(nextActiveState);
  };

  const handleSelectSong = (index: number, genre: string = 'all') => {
    if (genre && genre !== 'all') {
      setActiveMusicGenre(genre);
    }
    if (index === currentSongIndex) {
      const nextPlayingState = !isMusicPlaying;
      setIsMusicPlaying(nextPlayingState);
      if (nextPlayingState) {
        setIsMusicActive(true);
      }
    } else {
      setCurrentSongIndex(index);
      setIsMusicPlaying(true);
      setIsMusicActive(true);
    }
  };

  const handleVolumeUp = () => {
    setVolume(prev => Math.min(1.0, Number((prev + 0.1).toFixed(1))));
  };

  const handleVolumeDown = () => {
    setVolume(prev => Math.max(0.0, Number((prev - 0.1).toFixed(1))));
  };

  const handleTogglePower = () => {
    setIsScreenOff(prev => !prev);
  };

  const renderActiveScreen = () => {
    if (showSplash) {
      return <SplashScreen />;
    }

    if (authLoading) {
      return (
        <div className="flex-1 bg-[#faf8f6] dark:bg-[#11100f] flex flex-col items-center justify-center p-6 h-full min-h-[500px]">
          <div className="flex flex-col items-center gap-4">
            <div className="w-10 h-10 border-2 border-stone-200 dark:border-stone-800 border-t-pink-600 rounded-full animate-spin" />
            <p className="text-stone-600 dark:text-stone-300 font-serif text-sm tracking-wide text-center">
              Entering your sanctuary...
            </p>
          </div>
        </div>
      );
    }

    if (restoreDataPrompt) {
      return (
        <div className="flex-1 bg-[#faf8f6] dark:bg-[#11100f] flex items-center justify-center p-4 h-full min-h-[450px]">
          <div className="bg-white dark:bg-[#1a1816] max-w-sm w-full rounded-2xl border border-stone-200/80 dark:border-[#2e2a26] shadow-sm p-6 sm:p-7 space-y-5 text-center">
            <div className="w-11 h-11 bg-pink-50 dark:bg-pink-950/40 text-pink-600 dark:text-pink-400 border border-pink-100 dark:border-pink-900/40 rounded-xl flex items-center justify-center mx-auto">
              <CloudDownload className="w-5 h-5" />
            </div>
            <div className="space-y-1.5">
              <h2 className="text-lg font-serif font-semibold text-stone-900 dark:text-stone-100 leading-snug">Restore cloud data?</h2>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                Encrypted backup found for <strong className="text-stone-800 dark:text-stone-200 font-semibold">{restoreDataPrompt.userData.email}</strong>.
              </p>
            </div>
            <div className="flex flex-col gap-2.5 pt-1">
              <button
                onClick={() => {
                  proceedWithLogin(restoreDataPrompt.userData);
                  setRestoreDataPrompt(null);
                }}
                className="w-full h-11 bg-pink-600 hover:bg-pink-700 text-white font-semibold text-sm rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-2"
              >
                <CloudDownload className="w-4 h-4" />
                <span>Restore Data</span>
              </button>
              <button
                onClick={() => handleContinueAsNewUser(restoreDataPrompt.userData)}
                className="w-full h-11 bg-white dark:bg-[#23201d] border border-stone-200 dark:border-[#2e2a26] hover:bg-stone-50 dark:hover:bg-stone-800 text-stone-700 dark:text-stone-300 font-medium text-sm rounded-xl transition-colors cursor-pointer"
              >
                Start Fresh
              </button>
            </div>
          </div>
        </div>
      );
    }

    if (!user || passwordResetFlow.active) {
      return (
        <Auth 
          onLogin={handleLogin} 
          initialInviteCode={inviteCode} 
          onClearInvite={handleClearInvite}
          initialPasswordResetActive={passwordResetFlow.active}
          initialPasswordResetCode={passwordResetFlow.oobCode}
          initialForgotPasswordActive={!passwordResetFlow.active && !passwordResetFlow.postResetNotice && window.location.pathname.replace(/\/+$/, '') === '/reset-password'}
          initialPostResetNotice={passwordResetFlow.postResetNotice}
          onClearPasswordReset={handleClearPasswordReset}
          latestCloudUser={latestCloudUser}
          latestCloudLoading={latestCloudLoading}
        />
      );
    }

    const hasPinConfigured = userHasConfiguredPin(user);
    const hasBiometricUnlock = Boolean(user.biometricsEnabled || user.securitySettings?.biometricQuickUnlock);
    const requiresSessionLock = Boolean(hasBiometricUnlock || (user.privacyPreferences?.autoLockOnBlur && hasPinConfigured));

    if (requiresSessionLock && !isSessionUnlocked) {

      const handleRealBiometricUnlock = async () => {
        setAppLockError('');
        setAppBiometricResult('scanning');
        const res = await authenticateWithBiometrics(user, 'Verify your identity to unlock Lumina');
        if (res.verified) {
          setAppBiometricResult('success');
          setTimeout(() => {
            setIsSessionUnlocked(true);
            setAppBiometricResult('idle');
            setAppLockError('');
          }, 500);
        } else {
          setAppBiometricResult('error');
          setAppLockError(res.message);
        }
      };

      const handleLockPinSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setAppLockError('');
        const lockout = await getDiaryPinLockoutState(user.id);
        if (lockout.isLocked) {
          const mins = Math.max(1, Math.ceil(lockout.remainingMs / 60_000));
          setAppLockError(`PIN temporarily locked. Try again in ${mins} minute(s) or sign out and sign in with your password.`);
          return;
        }
        const verdict = await verifyDiaryPin(appLockPin, user);
        if (verdict === 'valid') {
          await clearDiaryPinLockout(user.id);
          setAppBiometricResult('success');
          setTimeout(() => {
            setIsSessionUnlocked(true);
            setAppBiometricResult('idle');
            setAppLockPin('');
            setShowLockPinFallback(false);
          }, 350);
          return;
        }
        const failState = await recordFailedDiaryPinAttempt(user.id);
        setAppLockPin('');
        setAppLockError(
          failState.isLocked
            ? 'Too many incorrect PIN attempts. Temporarily locked for 5 minutes.'
            : `Incorrect PIN. ${failState.remainingAttempts} attempt(s) remaining.`
        );
      };

      return (
        <div className="flex-1 bg-[#11100f] flex flex-col items-center justify-center p-6 sm:p-8 h-full min-h-[480px] text-stone-100 font-sans">
          <div className="max-w-sm w-full bg-[#1a1816] border border-[#2e2a26] rounded-2xl p-6 sm:p-8 text-center space-y-6 shadow-xl">
            <div className="w-12 h-12 bg-[#23201d] border border-[#2e2a26] rounded-xl flex items-center justify-center mx-auto text-pink-400">
              <Lock className="w-5 h-5" />
            </div>

            <div className="space-y-2">
              <h2 className="text-2xl font-serif font-normal text-stone-100 tracking-tight">Lumina Secured</h2>
              <p className="text-xs text-stone-400 leading-relaxed">
                App Lock is active. Verify with {hasBiometricUnlock ? 'your device biometrics' : 'your Security PIN'} {hasBiometricUnlock && hasPinConfigured ? 'or your Security PIN' : ''} to continue.
              </p>
            </div>

            {appLockError && (
              <div role="alert" className="p-3 rounded-xl bg-rose-950/60 border border-rose-500/30 text-xs text-rose-200 leading-relaxed text-left">
                {appLockError}
              </div>
            )}

            {appBiometricResult === 'scanning' ? (
              <div className="space-y-3 py-4">
                <div className="w-10 h-10 border-2 border-stone-700 border-t-pink-500 rounded-full animate-spin mx-auto" />
                <p className="text-xs text-pink-300 font-medium">Waiting for device verification...</p>
              </div>
            ) : appBiometricResult === 'success' ? (
              <div className="space-y-2 py-4">
                <div className="w-10 h-10 bg-emerald-500/15 border border-emerald-500/50 rounded-full mx-auto flex items-center justify-center text-emerald-400">
                  <Check className="w-5 h-5" />
                </div>
                <p className="text-xs text-emerald-400 font-medium">Access Granted</p>
              </div>
            ) : (showLockPinFallback || !hasBiometricUnlock) && hasPinConfigured ? (
              <form onSubmit={handleLockPinSubmit} className="space-y-3">
                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={6}
                  value={appLockPin}
                  onChange={(e) => setAppLockPin(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))}
                  placeholder="Enter 4–6 digit PIN"
                  aria-label="Security PIN"
                  className="w-full h-11 px-4 rounded-xl bg-[#23201d] border border-[#2e2a26] text-center text-sm font-mono tracking-[0.35em] tabular-nums text-white outline-none focus:border-pink-500"
                  required
                />
                <button
                  type="submit"
                  className="w-full h-11 bg-pink-600 hover:bg-pink-700 text-white font-semibold text-sm rounded-xl transition-colors cursor-pointer"
                >
                  Unlock with PIN
                </button>
                {hasBiometricUnlock && (
                  <button
                    type="button"
                    onClick={() => {
                      setShowLockPinFallback(false);
                      setAppLockError('');
                    }}
                    className="text-xs text-stone-400 hover:text-white font-medium cursor-pointer pt-1"
                  >
                    Back to Biometrics
                  </button>
                )}
              </form>
            ) : (
              <div className="space-y-2.5">
                <button
                  type="button"
                  onClick={handleRealBiometricUnlock}
                  className="w-full h-11 bg-pink-600 hover:bg-pink-700 text-white font-semibold text-sm rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-2"
                >
                  <Fingerprint className="w-4 h-4" />
                  <span>Unlock with Biometrics</span>
                </button>
                {hasPinConfigured && (
                  <button
                    type="button"
                    onClick={() => {
                      setShowLockPinFallback(true);
                      setAppLockError('');
                    }}
                    className="w-full h-11 bg-[#23201d] border border-[#2e2a26] hover:bg-stone-800 text-stone-200 font-medium text-sm rounded-xl cursor-pointer transition-colors flex items-center justify-center gap-2"
                  >
                    <KeyRound className="w-4 h-4" />
                    <span>Use Security PIN</span>
                  </button>
                )}
              </div>
            )}

            <button 
              type="button"
              onClick={handleLogout}
              className="text-xs text-stone-400 hover:text-stone-200 font-medium transition-colors block mx-auto cursor-pointer"
            >
              Sign out &amp; verify with password
            </button>
          </div>
        </div>
      );
    }

    const isPartnerApproved = Boolean(user.isPartnerLinked || user.partnerRequest?.status === 'approved');
    const needsPartnerOnboarding = Boolean(user.isPartner && isPartnerApproved && !user.partnerOnboardingCompleted);
    const needsPrimaryOnboarding = Boolean(!user.isPartner && !user.onboardingCompleted);

    if (needsPartnerOnboarding) {
      return (
        <PartnerOnboardingWizard
          user={user}
          setUser={setUser}
          onComplete={(completedUser) => {
            setUser(completedUser);
            const rememberMe = localStorage.getItem('lumina_remember_me') !== 'false';
            saveEncryptedSessionUser(completedUser, rememberMe).catch(() => {});
            if (completedUser.email) {
              secureStorage.setItem(`user_email_${completedUser.email.toLowerCase().trim()}`, JSON.stringify(completedUser)).catch(() => {});
            }
            syncUser(completedUser);
          }}
        />
      );
    }

    if (needsPrimaryOnboarding) {
      return (
        <OnboardingWizard 
          user={user} 
          setUser={setUser} 
          onComplete={(completedUser) => {
            setUser(completedUser);
            const rememberMe = localStorage.getItem('lumina_remember_me') !== 'false';
            saveEncryptedSessionUser(completedUser, rememberMe).catch(() => {});
            if (completedUser.email) {
              secureStorage.setItem(`user_email_${completedUser.email.toLowerCase().trim()}`, JSON.stringify(completedUser)).catch(() => {});
            }
            syncUser(completedUser);
            try {
              playWelcomeVoiceGreeting(completedUser, { force: true }).catch(() => {});
            } catch (e) {
              console.warn("TTS Welcome Voice skip:", e);
            }
          }} 
        />
      );
    }

    const unreadCount = (user?.notifications || []).filter(n => {
      if (n.isRead) return false;
      if (!user?.isPartner) {
        // ALWAYS keep partner requests, invites, and connection notifications visible for primary users!
        const isConnectionRequest = n.category === 'partner_request' || 
                                    n.isPartnerRequest === true || 
                                    (n.title && (n.title.toLowerCase().includes('request') || n.title.toLowerCase().includes('invite')));
        if (isConnectionRequest) return true;

        // Filter out general partner-mode tips/reminders meant only for partner users
        const isPartnerNotif = n.category === 'partner' || n.isPartner === true;
        if (isPartnerNotif) return false;
      }
      return true;
    }).length;
    const hasUnreadNotifs = unreadCount > 0;

    // Main authenticated application screen inside container
    return (
      <div className="flex flex-col h-full w-full relative">
        <header className="pt-[env(safe-area-inset-top)] px-4 sm:px-6 bg-white/95 dark:bg-[#1a1816]/95 backdrop-blur-md sticky top-0 z-[60] border-b border-stone-200/80 dark:border-[#2e2a26]">
          <div className="w-full max-w-6xl mx-auto h-14 flex justify-between items-center gap-3">
            <button
              type="button"
              className="flex items-center gap-2 cursor-pointer shrink-0 text-left"
              onClick={() => setActiveTab('dashboard')}
            >
              <Flower2 className="w-5 h-5 text-pink-600 dark:text-pink-400" />
              <span className={`text-xl font-serif tracking-tight ${themeClass}`}>Lumina</span>
            </button>
            
            <div className="flex items-center gap-2 justify-end shrink-0">
              <button
                onClick={() => setIsAnalyticsOpen(true)}
                className="w-9 h-9 rounded-xl bg-stone-50 dark:bg-[#23201d] hover:bg-stone-100 text-stone-600 dark:text-stone-300 transition-colors cursor-pointer flex items-center justify-center border border-stone-200/80 dark:border-[#2e2a26]"
                title="Analytics & Health Dashboard"
                id="app-header-analytics-button"
              >
                <Activity className="w-4 h-4 text-rose-600 dark:text-rose-400" />
              </button>

              <button 
                onClick={() => {
                  setSelectedNotifForModal(null);
                  setIsGlobalNotificationsOpen(true);
                }}
                className="w-9 h-9 rounded-xl bg-stone-50 dark:bg-[#23201d] hover:bg-stone-100 text-stone-600 dark:text-stone-300 transition-colors relative cursor-pointer flex items-center justify-center border border-stone-200/80 dark:border-[#2e2a26]"
                title="Notification Center"
                id="app-header-notification-bell"
              >
                <Bell className={`w-4 h-4 ${hasUnreadNotifs ? 'text-pink-600 dark:text-pink-400' : 'text-stone-500'}`} />
                {hasUnreadNotifs && (
                  <span className="absolute -top-1 -right-1 min-w-[16px] h-[16px] px-1 bg-pink-600 text-white text-[10px] font-semibold tabular-nums rounded-full flex items-center justify-center border border-white dark:border-[#1a1816]">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              {!user.isPartner && (
                <button 
                  onClick={togglePregnancy}
                  className={`h-9 px-3 text-xs font-semibold rounded-xl border whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                    user.isPregnancyMode 
                      ? 'bg-indigo-600 text-white border-indigo-600' 
                      : 'bg-stone-50 dark:bg-[#23201d] text-stone-700 dark:text-stone-300 border-stone-200/80 dark:border-[#2e2a26] hover:bg-stone-100'
                  }`}
                >
                  {user.isPregnancyMode ? 'Pregnancy' : 'Cycle'}
                </button>
              )}

              <button 
                onClick={() => {
                  if (currentTrack?.source !== 'internal') {
                    setActiveTab('music');
                  } else {
                    toggleMusic();
                  }
                }} 
                className="w-9 h-9 rounded-xl bg-stone-50 dark:bg-[#23201d] hover:bg-stone-100 text-stone-700 dark:text-stone-300 border border-stone-200/80 dark:border-[#2e2a26] flex items-center justify-center transition-colors cursor-pointer"
                title="Toggle Ambient Audio"
                aria-label="Toggle Ambient Audio"
              >
                {currentTrack?.source !== 'internal' ? (
                  <Music className="w-4 h-4" />
                ) : isMusicPlaying ? (
                  <Pause className="w-4 h-4" />
                ) : (
                  <Play className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>
        </header>

        {/* Content body inside container */}
        <main className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 py-6 max-w-6xl w-full mx-auto scrollbar-none pb-28">
          <ErrorBoundary onReset={() => setActiveTab('dashboard')}>
            <Suspense fallback={<div className="py-12 text-center text-xs text-stone-600 font-medium">Loading section...</div>}>
              {renderContent()}
            </Suspense>
          </ErrorBoundary>
        </main>

        {/* Global Notification Center Modal */}
        <NotificationCenterModal
          isOpen={isGlobalNotificationsOpen}
          onClose={() => {
            setIsGlobalNotificationsOpen(false);
            setSelectedNotifForModal(null);
          }}
          user={user}
          setUser={setUser}
          syncUser={syncUser}
          setActiveTab={setActiveTab}
          initialSelectedNotif={selectedNotifForModal}
        />
      </div>
    );
  };

  const currentThemeData = THEMES[user?.theme || 'rose'];
  const themeClass = `text-${currentThemeData.primary}`;

  const getAppBackgroundClass = () => {
    if (user?.useCycleBasedWallpaper) {
      const lastStart = user.lastPeriodStart ? new Date(user.lastPeriodStart) : new Date();
      const today = new Date();
      const diffDays = Math.floor((today.getTime() - lastStart.getTime()) / (1000 * 60 * 60 * 24)) % (user.cycleLength || 28);
      const day = diffDays + 1;

      if (day <= (user.periodLength || 5)) {
        return 'bg-gradient-to-br from-rose-100/90 via-pink-50 to-rose-200/50';
      } else if (day <= 13) {
        return 'bg-gradient-to-br from-teal-100/80 via-emerald-50 to-purple-100/60';
      } else if (day <= 16) {
        return 'bg-gradient-to-br from-orange-100/80 via-amber-50 to-yellow-100/50';
      } else {
        return 'bg-gradient-to-br from-purple-100 via-indigo-100/80 to-slate-200/60';
      }
    }

    if (user?.wallpaper) {
      const wp = WALLPAPER_LIST.find(w => w.id === user.wallpaper);
      if (wp) {
        return `bg-gradient-to-br ${wp.gradient}`;
      }
    }

    return currentThemeData?.bg || 'bg-[#faf8f6]';
  };

  const renderPremiumLock = (title: string, description: string, emoji: string) => {
    return (
      <div className="bg-white dark:bg-[#1a1816] rounded-2xl border border-stone-200/80 dark:border-[#2e2a26] p-8 sm:p-10 text-center max-w-lg mx-auto shadow-sm space-y-5 my-10 text-stone-700 dark:text-stone-300">
        <div className="w-12 h-12 bg-pink-50 dark:bg-pink-950/40 text-pink-600 dark:text-pink-400 border border-pink-100 dark:border-pink-900/40 rounded-xl flex items-center justify-center mx-auto">
          <Crown className="w-5 h-5" />
        </div>
        <div className="space-y-2">
          <p className="text-xs font-semibold text-pink-700 dark:text-pink-400">Premium Sanctuary Feature</p>
          <h3 className="text-2xl font-serif text-stone-900 dark:text-stone-100 font-normal tracking-tight">{title}</h3>
          <p className="text-sm text-stone-600 dark:text-stone-400 leading-relaxed">
            {description}
          </p>
        </div>
        <div className="pt-2">
          <button
            onClick={() => {
              setSettingsSubTab('billing');
              setActiveTab('settings');
            }}
            className="w-full h-11 bg-pink-600 hover:bg-pink-700 text-white rounded-xl text-sm font-semibold transition-colors cursor-pointer"
          >
            Unlock Premium Access
          </button>
        </div>
      </div>
    );
  };

  const renderContent = () => {
    if (user.isPartner) {
      return (
        <PartnerMode 
          user={user} 
          reminders={reminders} 
          setReminders={setReminders} 
          setUser={setUser} 
          partnerUser={partnerUser}
          onLogout={handleLogout} 
          onOpenNotificationCenter={(notif) => {
            if (notif) setSelectedNotifForModal(notif);
            else setSelectedNotifForModal(null);
            setIsGlobalNotificationsOpen(true);
          }}
        />
      );
    }

    switch (activeTab) {
      case 'companion_chat':
        return (
          <CompanionChat 
            user={user} 
            setUser={setUser}
            symptoms={symptoms}
            waterIntake={waterIntake}
            waterGoal={waterGoal}
            reminders={reminders}
            onClose={() => setActiveTab('dashboard')}
            onOpenLogModal={() => setIsLogModalOpen(true)}
          />
        );
      case 'dashboard':
        return (
          <Dashboard 
            user={user} 
            setUser={setUser}
            partnerUser={partnerUser}
            symptoms={symptoms} 
            waterIntake={waterIntake} 
            setWaterIntake={setWaterIntake} 
            waterGoal={waterGoal} 
            reminders={reminders} 
            receivedGifts={receivedGifts}
            currentSongIndex={currentSongIndex}
            isMusicPlaying={isMusicPlaying}
            toggleMusic={toggleMusic}
            nextSong={nextSong}
            prevSong={prevSong}
            setCurrentSongIndex={handleSelectSong}
            onTabChange={setActiveTab}
            setActiveTab={setActiveTab}
            onOpenLogModal={() => setIsLogModalOpen(true)}
            onOpenCompanionChat={() => setActiveTab('companion_chat')}
            isMusicActive={isMusicActive}
            toggleMusicActive={toggleMusicActive}
            volume={volume}
            setVolume={setVolume}
            togglePregnancy={togglePregnancy}
            partnerRequests={partnerRequests}
            handleLogout={handleLogout}
            onOpenNotificationCenter={(notif) => {
              if (notif) setSelectedNotifForModal(notif);
              else setSelectedNotifForModal(null);
              setIsGlobalNotificationsOpen(true);
            }}
          />
        );
      case 'cycle':
        return user.isPregnancyMode 
          ? <PregnancyTracker user={user} setUser={setUser} onOpenDoctorReport={() => {
              setIsDoctorReportOpen(true);
            }} /> 
          : <PeriodTracker 
              user={user} 
              symptoms={symptoms} 
              setSymptoms={setSymptoms} 
              bcLogs={bcLogs} 
              setBcLogs={setBcLogs}
              onUpdateBCConfig={updateBCConfig}
              onUpdatePeriodDates={updatePeriodDates}
              tempLogs={tempLogs}
              setTempLogs={setTempLogs}
              onUpdateTempUnit={updateTempUnit}
              onOpenLogModal={() => setIsLogModalOpen(true)}
              onOpenDoctorReport={() => {
                setIsDoctorReportOpen(true);
              }}
              setUser={setUser}
            />;
      case 'wellness':
        return (
          <Wellness 
            symptoms={symptoms} 
            user={user} 
            setUser={setUser} 
            waterIntake={waterIntake} 
            setWaterIntake={setWaterIntake} 
          />
        );
      case 'pedia':
        return <Cyclepedia />;
      case 'edu':
        return <Education />;
      case 'water':
        return <WaterTracker waterIntake={waterIntake} setWaterIntake={setWaterIntake} waterGoal={waterGoal} setWaterGoal={handleUpdateWaterGoal} />;
      case 'music':
        return (
          <MusicRoom 
            user={user} 
            onToggleFavorite={toggleFavoriteSong} 
            currentSongIndex={currentSongIndex} 
            onSelectSong={handleSelectSong} 
            isMusicPlaying={isMusicPlaying} 
            onTogglePlay={toggleMusic} 
            onNext={nextSong}
            onPrev={prevSong}
            onAddCustomSong={addCustomSong}
            activeMusicGenre={activeMusicGenre}
            setActiveMusicGenre={setActiveMusicGenre}
          />
        );
      case 'diary':
        return <Diary entries={diaryEntries} setEntries={setDiaryEntries} user={user} setUser={setUser} />;
      case 'selfcare':
        return <SelfCare tasks={selfCareTasks} setTasks={setSelfCareTasks} user={user} setUser={setUser} />;
      case 'partner':
        return (
          <PartnerMode 
            user={user} 
            reminders={reminders} 
            setReminders={setReminders} 
            setUser={setUser} 
            partnerUser={partnerUser}
            onLogout={handleLogout} 
            onOpenNotificationCenter={(notif) => {
              if (notif) setSelectedNotifForModal(notif);
              else setSelectedNotifForModal(null);
              setIsGlobalNotificationsOpen(true);
            }}
          />
        );
      case 'graphs':
        return <CycleGraph user={user} setUser={setUser} symptoms={symptoms} />;
      case 'privacy':
        return (
          <PrivacyDashboard
            user={user}
            onUpdateUser={(next) => {
              setUser(next);
              const rememberMe = localStorage.getItem('lumina_remember_me') !== 'false';
              saveEncryptedSessionUser(next, rememberMe).catch(() => {});
              syncUser(next);
            }}
            onLogoutAllDevices={handleLogout}
            onRequestDeleteAccount={() => setShowGlobalDeleteModal(true)}
            onNavigateToBackup={() => {
              setSettingsSubTab('backup_sync');
              setActiveTab('settings');
            }}
          />
        );
      case 'settings':
        return (
          <Settings 
            user={user} 
            setUser={setUser} 
            onLogout={handleLogout} 
            symptoms={symptoms}
            diaryEntries={diaryEntries}
            bcLogs={bcLogs}
            tempLogs={tempLogs}
            initialSubTab={settingsSubTab}
            setActiveTab={setActiveTab}
            onOpenExternalDeletionPage={openExternalDeletionPage}
          />
        );
      default:
        return (
          <Dashboard 
            user={user} 
            setUser={setUser}
            symptoms={symptoms} 
            waterIntake={waterIntake} 
            setWaterIntake={setWaterIntake} 
            waterGoal={waterGoal} 
            reminders={reminders} 
            currentSongIndex={currentSongIndex} 
            isMusicPlaying={isMusicPlaying} 
            toggleMusic={toggleMusic} 
            nextSong={nextSong} 
            prevSong={prevSong} 
            setCurrentSongIndex={handleSelectSong} 
            onTabChange={setActiveTab} 
            setActiveTab={setActiveTab}
            onOpenCompanionChat={() => setActiveTab('companion_chat')}
            isMusicActive={isMusicActive}
            toggleMusicActive={toggleMusicActive}
            volume={volume}
            setVolume={setVolume}
            togglePregnancy={togglePregnancy}
            partnerRequests={partnerRequests}
            handleLogout={handleLogout}
            onOpenNotificationCenter={(notif) => {
              if (notif) setSelectedNotifForModal(notif);
              else setSelectedNotifForModal(null);
              setIsGlobalNotificationsOpen(true);
            }}
          />
        );
    }
  };

  const currentTrack = fullLibrary[currentSongIndex];

  // Render Public Account Deletion & DSAR Page for /delete-account or /account-deletion
  if (!showSplash && isDeleteAccountRoute) {
    return (
      <>
        <DeleteAccountPage
          signedInUserId={user?.id}
          signedInUserEmail={user?.email}
          onBackHome={() => handleNavigateFrom404('dashboard')}
          onAccountDeleted={() => {
            handleLogout();
            handleNavigateFrom404('dashboard');
          }}
        />
        <CookieConsentBanner />
      </>
    );
  }

  const requiresGateOnboarding = Boolean(
    user && (
      (!user.isPartner && !user.onboardingCompleted) ||
      (user.isPartner && (user.isPartnerLinked || user.partnerRequest?.status === 'approved') && !user.partnerOnboardingCompleted)
    )
  );

  const hasAppLockActive = Boolean(
    user && (
      user.biometricsEnabled ||
      user.securitySettings?.biometricQuickUnlock ||
      (user.privacyPreferences?.autoLockOnBlur && userHasConfiguredPin(user))
    )
  );

  if (showSplash || authLoading || restoreDataPrompt || passwordResetFlow.active || !user || (hasAppLockActive && !isSessionUnlocked) || requiresGateOnboarding) {
    return (
      <>
        {renderActiveScreen()}
        {!showSplash && <CookieConsentBanner />}
      </>
    );
  }

  const unreadNotifCount = (user?.notifications || []).filter(n => {
    if (n.isRead) return false;
    if (!user?.isPartner) {
      const isConnectionRequest = n.category === 'partner_request' || 
                                  n.isPartnerRequest === true || 
                                  (n.title && (n.title.toLowerCase().includes('request') || n.title.toLowerCase().includes('invite') || n.title.toLowerCase().includes('connection') || n.title.toLowerCase().includes('linked')));
      if (isConnectionRequest) return true;

      const isPartnerNotif = n.category === 'partner' || n.isPartner === true;
      if (isPartnerNotif) return false;
    }
    return true;
  }).length;

  const pendingPartnerRequestCount = partnerRequests.filter(r => r.status === 'pending').length;

  return (
    <div className={`min-h-screen w-full overflow-x-clip pb-[calc(5.5rem+env(safe-area-inset-bottom))] md:pb-10 ${getAppBackgroundClass()} selection:bg-pink-100 transition-colors duration-200`}>
      <audio 
        ref={audioRef}
        src={currentTrack?.source === 'internal' ? currentTrack.url : undefined} 
        onEnded={nextSong}
        loop={false}
      />
      
      {!user.isPartner && (
        <header className="pt-[env(safe-area-inset-top)] sticky top-0 z-[60] bg-white/95 dark:bg-[#1a1816]/95 backdrop-blur-md border-b border-stone-200/80 dark:border-[#2e2a26]">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-14 md:h-16 flex items-center justify-between gap-3">
            {/* Zone 1: Menu + Brand */}
            <div className="flex items-center gap-2.5 shrink-0">
              <button
                type="button"
                onClick={() => {
                  if (activeTab !== 'dashboard') {
                    setActiveTab('dashboard');
                    setTimeout(() => {
                      window.dispatchEvent(new CustomEvent('lumina:toggle-dashboard-menu'));
                    }, 50);
                  } else {
                    window.dispatchEvent(new CustomEvent('lumina:toggle-dashboard-menu'));
                  }
                }}
                className="w-9 h-9 rounded-xl border border-stone-200/80 dark:border-[#2e2a26] bg-white dark:bg-[#23201d] hover:bg-stone-50 dark:hover:bg-stone-800 text-stone-700 dark:text-stone-200 flex items-center justify-center transition-colors cursor-pointer shrink-0"
                title="Open Sanctuary Menu"
                aria-label="Open Sanctuary Menu"
              >
                <Menu className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('dashboard')}
                className="flex items-center gap-2 cursor-pointer whitespace-nowrap shrink-0"
              >
                <Flower2 className="w-5 h-5 text-pink-600 dark:text-pink-400 shrink-0" />
                <span className={`text-xl md:text-2xl font-serif tracking-tight font-normal ${themeClass}`}>Lumina</span>
              </button>
            </div>

            {/* Zone 2: Desktop Primary Nav */}
            <nav className="hidden md:flex items-center gap-1" aria-label="Primary Navigation">
              {[
                { id: 'dashboard', label: 'Today' },
                { id: 'cycle', label: 'Calendar' },
                { id: 'wellness', label: 'Wellness' },
                { id: 'edu', label: 'Learn' },
                { id: 'music', label: 'Music' },
              ].map((item) => {
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setActiveTab(item.id)}
                    aria-current={isActive ? 'page' : undefined}
                    className={`px-3 py-2 rounded-xl text-sm whitespace-nowrap shrink-0 transition-colors cursor-pointer relative ${
                      isActive
                        ? 'text-pink-700 dark:text-pink-300 bg-pink-50/90 dark:bg-pink-950/30 font-semibold'
                        : 'text-stone-600 dark:text-stone-300 hover:text-stone-900 dark:hover:text-white hover:bg-stone-100/80 dark:hover:bg-[#23201d] font-medium'
                    }`}
                  >
                    {item.label}
                  </button>
                );
              })}
            </nav>

            {/* Zone 3: Mode Toggle, Utilities & Primary CTA */}
            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              <button 
                type="button"
                onClick={togglePregnancy}
                className={`h-9 px-2.5 sm:px-3 text-xs font-semibold rounded-xl border whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                  user.isPregnancyMode 
                    ? 'bg-indigo-600 text-white border-indigo-600' 
                    : 'bg-stone-50 dark:bg-[#23201d] text-stone-700 dark:text-stone-300 border-stone-200/80 dark:border-[#2e2a26] hover:bg-stone-100 dark:hover:bg-stone-800'
                }`}
              >
                {user.isPregnancyMode ? 'Pregnancy' : 'Cycle'}
              </button>

              {/* Welcome Voice Trigger Button */}
              <button
                type="button"
                onClick={() => {
                  if (user) {
                    playWelcomeVoiceGreeting(user, { force: true }).catch(() => {});
                  }
                }}
                className="w-9 h-9 rounded-xl bg-stone-50 dark:bg-[#23201d] hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-600 dark:text-stone-300 border border-stone-200/80 dark:border-[#2e2a26] transition-colors cursor-pointer flex items-center justify-center shrink-0"
                title="Play Welcome Voice Greeting"
                aria-label="Play Welcome Voice Greeting"
                id="global-header-welcome-voice-btn"
              >
                <Volume2 className="w-4 h-4" />
              </button>

              {/* Privacy & Security Vault Shortcut */}
              <button
                type="button"
                onClick={() => setActiveTab('privacy')}
                className={`w-9 h-9 rounded-xl transition-colors cursor-pointer flex items-center justify-center border shrink-0 ${
                  activeTab === 'privacy'
                    ? 'bg-pink-600 text-white border-pink-600'
                    : 'bg-stone-50 dark:bg-[#23201d] hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-600 dark:text-stone-300 border-stone-200/80 dark:border-[#2e2a26]'
                }`}
                title="Privacy & Security Dashboard"
                aria-label="Open Privacy and Security Dashboard"
              >
                <ShieldCheck className="w-4 h-4" />
              </button>

              {/* Global Notification Bell Button */}
              <button 
                type="button"
                onClick={() => {
                  setSelectedNotifForModal(null);
                  setIsGlobalNotificationsOpen(true);
                }}
                className="w-9 h-9 rounded-xl bg-stone-50 dark:bg-[#23201d] hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-600 dark:text-stone-300 border border-stone-200/80 dark:border-[#2e2a26] transition-colors relative cursor-pointer flex items-center justify-center shrink-0"
                title="Notification Center"
                aria-label="Open Notification Center"
                id="global-header-notification-bell"
              >
                <Bell className={`w-4 h-4 ${unreadNotifCount > 0 ? 'text-pink-600 dark:text-pink-400' : 'text-stone-600 dark:text-stone-300'}`} />
                {unreadNotifCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[16px] h-[16px] px-1 bg-pink-600 text-white text-[10px] font-semibold tabular-nums rounded-full flex items-center justify-center border border-white dark:border-[#1a1816]">
                    {unreadNotifCount > 9 ? '9+' : unreadNotifCount}
                  </span>
                )}
              </button>

              {/* Settings Shortcut (Desktop) */}
              <button 
                type="button"
                onClick={() => {
                  setSettingsSubTab('menu');
                  setActiveTab('settings');
                }} 
                className={`hidden md:flex w-9 h-9 rounded-xl transition-colors cursor-pointer items-center justify-center border shrink-0 relative ${
                  activeTab === 'settings'
                    ? 'bg-pink-600 text-white border-pink-600'
                    : 'bg-stone-50 dark:bg-[#23201d] hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-600 dark:text-stone-300 border-stone-200/80 dark:border-[#2e2a26]'
                }`}
                title="Settings"
                aria-label="Open Settings"
              >
                <SettingsIcon className="w-4 h-4" />
                {pendingPartnerRequestCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-rose-500 rounded-full border-2 border-white dark:border-[#1a1816]" />
                )}
              </button>

              {/* Desktop/Mobile Browser Standalone Install Shortcut (hidden once installed/native) */}
              <div className="hidden sm:flex">
                <PWAInstallButton variant="compact" />
              </div>

              {/* Primary Log Today CTA (Tablet & Desktop) */}
              <button
                type="button"
                onClick={() => setIsLogModalOpen(true)}
                className="hidden sm:inline-flex items-center gap-1.5 h-9 px-3.5 rounded-xl bg-pink-600 hover:bg-pink-700 text-white text-xs font-semibold whitespace-nowrap shrink-0 transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Log Today</span>
              </button>
            </div>
          </div>
        </header>
      )}

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 md:pt-7 pb-12">
        <PWAInstallButton variant="banner" />

        <ErrorBoundary onReset={() => setActiveTab('dashboard')}>
          <Suspense
            fallback={
              <div className="py-16 flex flex-col items-center justify-center gap-3 text-stone-600 dark:text-stone-300">
                <div className="w-8 h-8 border-2 border-stone-200 dark:border-stone-700 border-t-pink-600 rounded-full animate-spin" />
                <p className="text-xs font-medium">Loading sanctuary view...</p>
              </div>
            }
          >
            {renderContent()}
          </Suspense>
        </ErrorBoundary>

        {/* Web Privacy Footer (hidden on mobile and standalone/native app mode) */}
        {!isRunningAsApp() && (
          <footer className="hidden md:flex mt-12 pt-6 border-t border-stone-200/80 dark:border-[#2e2a26] flex-wrap items-center justify-between gap-3 text-xs text-stone-500 dark:text-stone-400">
            <span>Lumina: Bloom &amp; Balance — Your health data remains private to you.</span>
            <div className="flex flex-wrap items-center gap-5 font-medium">
              <button
                type="button"
                onClick={() => setActiveTab('privacy')}
                className="text-stone-700 dark:text-stone-300 hover:text-pink-700 dark:hover:text-pink-300 cursor-pointer transition-colors"
              >
                Privacy Dashboard
              </button>
              <button
                type="button"
                onClick={() => window.dispatchEvent(new CustomEvent('lumina:open-cookie-settings'))}
                className="text-stone-700 dark:text-stone-300 hover:text-pink-700 dark:hover:text-pink-300 cursor-pointer transition-colors"
              >
                Cookie Preferences
              </button>
              <button
                type="button"
                onClick={() => {
                  setSettingsSubTab('backup_sync');
                  setActiveTab('settings');
                }}
                className="text-stone-700 dark:text-stone-300 hover:text-pink-700 dark:hover:text-pink-300 cursor-pointer transition-colors"
              >
                Backups &amp; Recovery
              </button>
              <button
                type="button"
                onClick={openExternalDeletionPage}
                className="text-rose-700 dark:text-rose-400 hover:underline cursor-pointer"
              >
                Delete Account
              </button>
            </div>
          </footer>
        )}
      </main>

      <LogModal 
        isOpen={isLogModalOpen}
        onClose={() => setIsLogModalOpen(false)}
        user={user}
        symptoms={symptoms}
        onLogSymptom={handleLogSymptom}
        onLogPeriod={handleLogPeriod}
        onLogFullPeriod={handleLogFullPeriod}
        onLogMood={handleLogMood}
        onLogSexualActivity={handleLogSexualActivity}
      />

      <Suspense fallback={null}>
        <DoctorReport 
          isOpen={isDoctorReportOpen}
          onClose={() => setIsDoctorReportOpen(false)}
          user={user}
          symptoms={symptoms}
        />
      </Suspense>

      {/* Floating Mini Player (Global) */}
      {isMusicActive && (
        <div className="fixed bottom-[calc(4.75rem+env(safe-area-inset-bottom))] md:bottom-6 left-4 right-4 md:left-auto md:right-6 md:w-[420px] bg-white/95 dark:bg-[#1a1816]/95 backdrop-blur-xl border border-stone-200/80 dark:border-[#2e2a26] rounded-2xl p-3.5 shadow-lg z-[60] flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-pink-50 dark:bg-pink-950/40 text-pink-600 dark:text-pink-400 border border-pink-100 dark:border-pink-900/40 flex items-center justify-center shrink-0">
              <Disc3 className={`w-5 h-5 ${isMusicPlaying ? 'animate-[spin_10s_linear_infinite]' : ''}`} />
            </div>
            <div className="min-w-0 flex flex-col justify-center">
              <h4 className="text-sm font-serif text-stone-900 dark:text-stone-100 truncate leading-tight">
                {currentTrack?.title || 'No Song Selected'}
              </h4>
              <div className="flex items-center gap-1.5 mt-0.5 min-w-0">
                <p className="text-xs text-stone-500 dark:text-stone-400 truncate leading-none shrink-0">
                  {currentTrack?.artist || 'Lumina Audio'}
                </p>
                <span className="text-stone-300 text-xs leading-none shrink-0">·</span>
                <select
                  value={activeMusicGenre}
                  onChange={(e) => {
                    const newGenre = e.target.value;
                    setActiveMusicGenre(newGenre);
                    const tempQueue = fullLibrary.filter(s => {
                      if (newGenre === 'all') return true;
                      const isLofi = newGenre === 'lo-fi' || newGenre === 'lofi chill';
                      const isNature = newGenre === 'nature sounds' || newGenre === 'nature soundscapes';
                      const isAmbient = newGenre === 'ambient' || newGenre === 'cosmic';
                      
                      if (isLofi) return s.tags.includes('lo-fi') || s.tags.includes('lofi chill');
                      if (isNature) return s.tags.includes('nature sounds') || s.tags.includes('nature soundscapes');
                      if (isAmbient) return s.tags.includes('ambient') || s.tags.includes('cosmic');
                      
                      return s.tags.includes(newGenre);
                    });
                    if (tempQueue.length > 0) {
                      const globalIdx = fullLibrary.findIndex(s => s.id === tempQueue[0].id);
                      if (globalIdx !== -1) {
                        setCurrentSongIndex(globalIdx);
                        setIsMusicPlaying(true);
                        setIsMusicActive(true);
                      }
                    }
                  }}
                  aria-label="Filter music genre"
                  className="text-[11px] font-medium text-pink-700 dark:text-pink-300 bg-pink-50 dark:bg-pink-950/30 hover:bg-pink-100 rounded-lg px-1.5 py-0.5 border border-pink-100 dark:border-pink-900/30 outline-none cursor-pointer"
                >
                  <option value="all">All</option>
                  <option value="lo-fi">Lo-Fi</option>
                  <option value="classical">Classical</option>
                  <option value="ambient">Ambient</option>
                  <option value="nature sounds">Nature</option>
                  <option value="jazz">Jazz</option>
                  <option value="pop">Pop</option>
                  <option value="afrobeats">Afrobeats</option>
                </select>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-1 shrink-0">
            <button 
              type="button"
              onClick={prevSong}
              aria-label="Previous track"
              className="w-8 h-8 rounded-lg text-stone-500 hover:text-stone-900 dark:hover:text-white hover:bg-stone-100 dark:hover:bg-stone-800 flex items-center justify-center transition-colors cursor-pointer"
            >
              <SkipBack className="w-4 h-4" />
            </button>
            <button 
              type="button"
              onClick={toggleMusic} 
              aria-label={isMusicPlaying ? 'Pause' : 'Play'}
              className="w-9 h-9 bg-pink-600 hover:bg-pink-700 text-white rounded-xl flex items-center justify-center transition-colors cursor-pointer"
            >
              {isMusicPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
            </button>
            <button 
              type="button"
              onClick={nextSong}
              aria-label="Next track"
              className="w-8 h-8 rounded-lg text-stone-500 hover:text-stone-900 dark:hover:text-white hover:bg-stone-100 dark:hover:bg-stone-800 flex items-center justify-center transition-colors cursor-pointer"
            >
              <SkipForward className="w-4 h-4" />
            </button>
          </div>
          
          <button 
            type="button"
            onClick={() => {
              setIsMusicPlaying(false);
              setIsMusicActive(false);
            }}
            className="w-8 h-8 rounded-lg border border-stone-200/80 dark:border-[#2e2a26] flex items-center justify-center text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors shrink-0 cursor-pointer"
            title="Stop & Close Player"
            aria-label="Close music player"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {!user.isPartner && (
        <nav
          aria-label="Mobile Navigation"
          className="md:hidden fixed bottom-0 left-0 right-0 h-[calc(4rem+env(safe-area-inset-bottom))] pb-[env(safe-area-inset-bottom)] bg-white/95 dark:bg-[#1a1816]/95 backdrop-blur-xl border-t border-stone-200/80 dark:border-[#2e2a26] grid grid-cols-7 items-center px-1 z-50"
        >
          <NavItem icon={<Home className="w-4 h-4" />} label="Home" active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} theme={user.theme} />
          <NavItem icon={<Calendar className="w-4 h-4" />} label="Calendar" active={activeTab === 'cycle'} onClick={() => setActiveTab('cycle')} theme={user.theme} />
          <NavItem icon={<HeartPulse className="w-4 h-4" />} label="Wellness" active={activeTab === 'wellness'} onClick={() => setActiveTab('wellness')} theme={user.theme} />
          
          <div className="flex items-center justify-center">
            <button 
              type="button"
              onClick={() => setIsLogModalOpen(true)}
              className="w-11 h-11 bg-pink-600 hover:bg-pink-700 text-white rounded-xl shadow-sm active:scale-95 transition-all cursor-pointer flex items-center justify-center"
              title="Log Your Day"
              aria-label="Log Today Period, Mood or Symptoms"
              id="nav-log-plus-btn"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>

          <NavItem icon={<BookOpen className="w-4 h-4" />} label="Learn" active={activeTab === 'edu'} onClick={() => setActiveTab('edu')} theme={user.theme} />
          <NavItem icon={<Music className="w-4 h-4" />} label="Music" active={activeTab === 'music'} onClick={() => setActiveTab('music')} theme={user.theme} />
          <NavItem icon={<UserIcon className="w-4 h-4" />} label="Settings" active={activeTab === 'settings'} onClick={() => { setSettingsSubTab('menu'); setActiveTab('settings'); }} theme={user.theme} badge={pendingPartnerRequestCount} />
        </nav>
      )}

      {/* Notification Toast Card */}
      {simulatedNotify && (
        <div 
          onClick={() => {
            if (simulatedNotify.action) {
              simulatedNotify.action();
            }
            const matchingNotif = user?.notifications?.find(n => n.title === simulatedNotify.title || n.body === simulatedNotify.body);
            const targetNotif: AppNotification = matchingNotif || {
              id: simulatedNotify.id || crypto.randomUUID(),
              title: simulatedNotify.title,
              body: simulatedNotify.body,
              emoji: simulatedNotify.emoji,
              timestamp: new Date().toISOString(),
              isRead: true,
              phaseInfo: 'Lumina Alert',
              category: 'cycle',
              detailedTip: simulatedNotify.body
            };
            setSelectedNotifForModal(targetNotif);
            setIsGlobalNotificationsOpen(true);
            setSimulatedNotify(null);
          }}
          className={`notification-drawer fixed top-4 z-[200] rounded-2xl p-4 cursor-pointer shadow-xl border backdrop-blur-xl flex flex-col gap-2.5 overflow-hidden ${
            simulatedNotify.isPartner 
              ? 'bg-stone-900/95 text-white border-stone-700/80' 
              : 'bg-white/95 dark:bg-[#1a1816]/95 text-stone-800 dark:text-stone-100 border-stone-200/80 dark:border-[#2e2a26] hover:border-pink-200'
          }`}
        >
          <div className="flex items-center justify-between text-[11px] font-medium opacity-80">
            <div className="flex items-center gap-1.5 min-w-0">
              {simulatedNotify.isPartner ? (
                <HeartHandshake className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
              ) : (
                <Flower2 className="w-3.5 h-3.5 text-pink-600 shrink-0" />
              )}
              <span className="truncate">{simulatedNotify.isPartner ? 'Partner Sync' : 'Lumina Sanctuary'}</span>
            </div>
            <span className="text-[11px] opacity-70 shrink-0">Just now</span>
          </div>

          <div className="flex gap-3 items-start pr-1 min-w-0">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
              simulatedNotify.isPartner 
                ? 'bg-indigo-950/60 border border-indigo-500/30 text-indigo-300' 
                : 'bg-pink-50 dark:bg-pink-950/40 border border-pink-100 dark:border-pink-900/40 text-pink-600 dark:text-pink-400'
            }`}>
              <Bell className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0 flex flex-col gap-0.5">
              <h4 className={`text-xs font-semibold leading-snug break-words ${simulatedNotify.isPartner ? 'text-indigo-200' : 'text-stone-900 dark:text-stone-100'}`}>
                {simulatedNotify.title}
              </h4>
              <p className="text-xs leading-relaxed opacity-85 break-words whitespace-pre-line">
                {simulatedNotify.body}
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between border-t pt-2 opacity-75 text-[11px] font-medium border-current/10">
            <span className="flex items-center gap-1">
              <span>Tap to open</span>
              <ArrowRight className="w-3 h-3" />
            </span>
            <span>Dismiss</span>
          </div>
        </div>
      )}

      {/* Global Notification Center Modal */}
      <NotificationCenterModal
        isOpen={isGlobalNotificationsOpen}
        onClose={() => {
          setIsGlobalNotificationsOpen(false);
          setSelectedNotifForModal(null);
        }}
        user={user}
        setUser={setUser}
        syncUser={syncUser}
        setActiveTab={setActiveTab}
        initialSelectedNotif={selectedNotifForModal}
      />

      {/* Analytics & Health Monitoring Dashboard Modal */}
      {isAnalyticsOpen && (
        <Suspense fallback={null}>
          <AnalyticsDashboardModal
            isOpen={isAnalyticsOpen}
            onClose={() => setIsAnalyticsOpen(false)}
          />
        </Suspense>
      )}

      {/* Pre-Permission Notification Privacy Consent Card */}
      {showNotifPrePrompt && (
        <div className="fixed bottom-[calc(4.75rem+env(safe-area-inset-bottom))] md:bottom-6 left-4 right-4 max-w-md mx-auto bg-white/95 dark:bg-[#1a1816]/95 backdrop-blur-xl border border-stone-200/80 dark:border-[#2e2a26] rounded-2xl p-4 shadow-xl z-[180] flex flex-col gap-3">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-pink-50 dark:bg-pink-950/40 text-pink-600 dark:text-pink-400 border border-pink-100 dark:border-pink-900/40 flex items-center justify-center shrink-0">
              <Bell className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-semibold text-stone-900 dark:text-stone-100">Enable discreet cycle &amp; wellness alerts?</h4>
              <p className="text-xs text-stone-600 dark:text-stone-400 mt-0.5 leading-relaxed">
                Lumina hides sensitive period and health details on your lock screen by default unless you enable previews in Settings.
              </p>
            </div>
          </div>
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                localStorage.setItem('lumina_notif_preprompt_dismissed', 'true');
                setShowNotifPrePrompt(false);
              }}
              className="h-9 px-3.5 rounded-xl bg-stone-100 dark:bg-[#23201d] hover:bg-stone-200 text-stone-700 dark:text-stone-300 text-xs font-medium cursor-pointer transition-colors"
            >
              Not Now
            </button>
            <button
              type="button"
              onClick={async () => {
                localStorage.setItem('lumina_notif_preprompt_dismissed', 'true');
                setShowNotifPrePrompt(false);
                try {
                  if ('Notification' in window && window.Notification.requestPermission) {
                    await window.Notification.requestPermission().catch(() => {});
                  }
                  await registerNativePush(true);
                } catch {}
              }}
              className="h-9 px-4 rounded-xl bg-pink-600 hover:bg-pink-700 text-white text-xs font-semibold cursor-pointer transition-colors"
            >
              Allow Alerts
            </button>
          </div>
        </div>
      )}

      <DeleteAccountModal
        isOpen={showGlobalDeleteModal}
        user={user}
        onClose={() => setShowGlobalDeleteModal(false)}
        onDeleted={handleLogout}
        onOpenExternalPage={openExternalDeletionPage}
      />

      <OfflineIndicator />
      <CookieConsentBanner />
    </div>
  );
};

const NavItem: React.FC<{ icon: React.ReactNode, label: string, active: boolean, onClick: () => void, theme: AppTheme, badge?: number }> = ({ icon, label, active, onClick, badge }) => {
  return (
    <button 
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-current={active ? 'page' : undefined}
      className={`flex flex-col items-center justify-center gap-0.5 py-1.5 px-1 rounded-xl transition-colors relative cursor-pointer ${
        active 
          ? 'text-pink-700 dark:text-pink-300 font-semibold' 
          : 'text-stone-500 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200 font-medium'
      }`}
    >
      <span className="flex items-center justify-center" aria-hidden="true">{icon}</span>
      <span className="text-[10px] leading-tight whitespace-nowrap">{label}</span>
      {badge !== undefined && badge > 0 && (
        <span className="absolute top-0.5 right-1 bg-pink-600 text-white text-[9px] font-semibold tabular-nums min-w-[14px] h-[14px] px-1 rounded-full flex items-center justify-center border border-white dark:border-[#1a1816]">
          {badge}
        </span>
      )}
    </button>
  );
};

export default App;
