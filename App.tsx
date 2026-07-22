
import React, { useState, useEffect, useRef, useMemo } from 'react';
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
  Power, 
  Eye, 
  Info, 
  RefreshCw, 
  Volume2, 
  VolumeX, 
  X,
  Trash2,
  CheckCheck,
  Image as ImageIcon 
} from 'lucide-react';
import { User, Symptom, DiaryEntry, SelfCareTask, AppTheme, Reminder, BirthControlLog, Song, TemperatureLog, PeriodLog, Period, ReceivedComfort } from './types';
import Auth from './components/Auth';
import { OnboardingWizard } from './components/OnboardingWizard';
import { PartnerOnboardingWizard } from './components/PartnerOnboardingWizard';
import Dashboard from './components/Dashboard';
import PeriodTracker from './components/PeriodTracker';
import SelfCare from './components/SelfCare';
import YogaTutorials from './components/YogaTutorials';
import Diary from './components/Diary';
import PartnerMode from './components/PartnerMode';
import WaterTracker from './components/WaterTracker';
import Education from './components/Education';
import Cyclepedia from './components/Cyclepedia';
import Wellness from './components/Wellness';
import PregnancyTracker from './components/PregnancyTracker';
import Settings from './components/Settings';
import MusicRoom from './components/MusicRoom';
import LogModal from './components/LogModal';
import DoctorReport from './components/DoctorReport';
import { CycleGraph } from './components/CycleGraph';
import { playWelcomeVoice } from './services/gemini';
import { THEMES, SONGS, THEME_PALETTES } from './constants';
import { WALLPAPER_LIST } from './components/WallpapersAndThemesModal';
import { syncUser, subscribeToGifts, subscribeToUser, acceptInvite, subscribeToPartnerRequests, getCleanName } from './services/firebaseService';
import { getDefaultNotificationSettings, calculateScheduledNotifications, scheduleNativeLocalNotification } from './services/notificationService';
import { auth } from './services/firebase';
import { onAuthStateChanged, setPersistence, browserSessionPersistence, indexedDBLocalPersistence } from 'firebase/auth';
import { SplashScreen } from './components/SplashScreen';

const App: React.FC = () => {
  const [user, setUserState] = useState<User | null>(() => {
    // Check if there is an active invite link in the URL.
    // If so, we must NEVER auto-restore any cached session (protect user account isolation).
    const urlParams = new URLSearchParams(window.location.search);
    const qInvite = urlParams.get('invite');
    const pathParts = window.location.pathname.split('/');
    const inviteIdx = pathParts.indexOf('invite');
    const hasInvite = !!(qInvite || (inviteIdx !== -1 && pathParts[inviteIdx + 1]));

    if (hasInvite) {
      localStorage.removeItem('lumina_user');
      localStorage.removeItem('lumina_biometric_user');
      sessionStorage.removeItem('lumina_session_unlocked');
      return null;
    }

    // Check if we have a saved user to restore automatically on relaunch
    const saved = localStorage.getItem('lumina_user');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.id) {
          sessionStorage.setItem('lumina_session_unlocked', 'true');
          parsed.isPremium = true;
          return parsed;
        }
      } catch (err) {
        console.error('Failed to parse initial user from localStorage', err);
      }
    }
    return null;
  });
  const userRef = useRef<User | null>(user);
  const setUser = (val: User | null | ((prev: User | null) => User | null)) => {
    if (typeof val === 'function') {
      setUserState((prev) => {
        const next = val(prev);
        if (next) next.isPremium = true;
        userRef.current = next;
        return next;
      });
    } else {
      if (val) val.isPremium = true;
      setUserState(val);
      userRef.current = val;
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

  const [activeTab, setActiveTab] = useState(() => {
    const saved = localStorage.getItem('lumina_user');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed) {
          parsed.isPremium = true;
          if (parsed.isPartner) return 'partner';
          if (parsed.isPregnancyMode) return 'cycle';
        }
      } catch (err) {
        console.warn("Failed to parse dynamic starting activeTab:", err);
      }
    }
    return 'dashboard';
  });
  const [settingsSubTab, setSettingsSubTab] = useState<'notifications' | 'general' | 'billing'>('billing');
  const [isGlobalNotificationsOpen, setIsGlobalNotificationsOpen] = useState(false);
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

  // Biometric screen locks on startup
  const [isSessionUnlocked, setIsSessionUnlocked] = useState<boolean>(() => {
    return sessionStorage.getItem('lumina_session_unlocked') === 'true';
  });
  const [appBiometricResult, setAppBiometricResult] = useState<'idle' | 'scanning' | 'success'>('idle');

  // Interactive Asset Creator & Builder States
  const [activeCreatorTab, setActiveCreatorTab] = useState<'icon' | 'screenshots' | 'capacitor'>('icon');
  const [iconTheme, setIconTheme] = useState<'sakura' | 'cosmic' | 'mint' | 'solar'>('sakura');
  const [iconSymbol, setIconSymbol] = useState<string>('🌸');
  const [screenshotTemplate, setScreenshotTemplate] = useState<'cosmic' | 'spiritual' | 'botanical'>('spiritual');
  const [screenshotTagline, setScreenshotTagline] = useState<string>("Your cycle and body in peaceful flow.");
  const [screenshotPlatform, setScreenshotPlatform] = useState<'ios' | 'android'>('ios');
  const [simulatingBiometricOnApp, setSimulatingBiometricOnApp] = useState<boolean>(false);

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

  // Play "Welcome Back" voice greeting on reload/returning session
  useEffect(() => {
    if (user && user.onboardingCompleted && !sessionStorage.getItem('lumina_welcome_voice_played')) {
      sessionStorage.setItem('lumina_welcome_voice_played', 'true');
      const timer = setTimeout(() => {
        try {
          playWelcomeVoice(user.name || 'Beautiful');
        } catch (e) {
          console.warn("Could not play welcome back voice:", e);
        }
      }, 1200);
      return () => clearTimeout(timer);
    }
  }, [user]);

  // Synchronize CSS custom properties with the selected theme color palette
  useEffect(() => {
    const selectedTheme = user?.theme || 'rose';
    const palette = THEME_PALETTES[selectedTheme];
    if (palette) {
      const root = document.documentElement;
      Object.entries(palette).forEach(([shade, hex]) => {
        root.style.setProperty(`--brand-${shade}`, hex as string);
      });
    }
  }, [user?.theme]);

  const triggerFullNotification = (title: string, body: string, emoji: string = '🔔') => {
    if ('Notification' in window) {
      if (window.Notification.permission === 'granted') {
        try {
          new window.Notification(`${emoji} ${title}`, { body });
        } catch (e) {
          console.warn("Native Notification trigger failed:", e);
        }
      } else if (window.Notification.permission !== 'denied') {
        window.Notification.requestPermission();
      }
    }

    if (userRef.current) {
      const currentUser = userRef.current;
      const newAlert = {
        id: Math.random().toString(),
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
      localStorage.setItem('lumina_user', JSON.stringify(updatedUser));
      localStorage.setItem('lumina_biometric_user', JSON.stringify(updatedUser));
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
          id: Math.random().toString(),
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
    const scheduled = calculateScheduledNotifications(user, user.notificationSettings);
    if (!scheduled || scheduled.length === 0) return;

    const existingNotifs = user.notifications || [];
    let updatedNotifs = [...existingNotifs];
    let hasNew = false;
    const nowISO = new Date().toISOString();

    scheduled.forEach(item => {
      const exists = updatedNotifs.some(n => n.id === item.id);
      if (!exists) {
        updatedNotifs.unshift({
          id: item.id,
          title: item.title,
          body: item.body,
          emoji: item.emoji,
          timestamp: nowISO,
          isRead: false
        });
        hasNew = true;
      }
    });

    if (hasNew) {
      const updatedUser = { ...user, notifications: updatedNotifs };
      setUser(updatedUser);
      localStorage.setItem('lumina_user', JSON.stringify(updatedUser));
      syncUser(updatedUser);
    }
  }, [user?.id, user?.lastPeriodStart, user?.cycleLength, user?.periodLength, user?.notificationSettings?.enabled, user?.partnerNotificationPreferences]);
  const [showSplash, setShowSplash] = useState(true);
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

    if (hasInvite) return false;
    return !localStorage.getItem('lumina_user');
  });

  // Restore Session
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const qInvite = urlParams.get('invite');
    const pathParts = window.location.pathname.split('/');
    const inviteIdx = pathParts.indexOf('invite');
    const hasInvite = !!(qInvite || (inviteIdx !== -1 && pathParts[inviteIdx + 1]));

    if (hasInvite) {
      // Force clear cache and sign out immediately for account isolation
      localStorage.removeItem('lumina_user');
      localStorage.removeItem('lumina_biometric_user');
      sessionStorage.removeItem('lumina_session_unlocked');
      auth.signOut().catch(() => {});
      setUser(null);
      setAuthLoading(false);
      return;
    }

    const isUnlocked = sessionStorage.getItem('lumina_session_unlocked') === 'true';
    let unsubscribeUser: (() => void) | undefined;

    // 1. IF THE CURRENT BROWSER SESSION IS UNLOCKED, RESTORE DATA REALTIME SNAPSHOT
    if (isUnlocked) {
      const savedLocalUser = localStorage.getItem('lumina_user');
      if (savedLocalUser) {
        try {
          const parsed = JSON.parse(savedLocalUser);
          if (parsed && parsed.id) {
            setWaterGoal(parsed.waterGoal || 8);
            setAuthLoading(false);

            unsubscribeUser = subscribeToUser(parsed.id, (userData) => {
              if (userData) {
                const localUser = userRef.current;
                if (localUser) {
                  if (JSON.stringify(userData) === JSON.stringify(localUser)) {
                    return;
                  }
                  let emailBackup: Partial<User> = {};
                  if (userData.email) {
                    const savedEmailStr = localStorage.getItem('lumina_user_email_' + userData.email.toLowerCase().trim());
                    if (savedEmailStr) {
                      try {
                        emailBackup = JSON.parse(savedEmailStr);
                      } catch (e) {
                        console.warn("Failed to parse emailBackup", e);
                      }
                    }
                  }

                  const fullUser: User = {
                    ...emailBackup,
                    ...userData,
                    cycleLength: userData.cycleLength || emailBackup.cycleLength || 28,
                    periodLength: userData.periodLength || emailBackup.periodLength || 5,
                    lastPeriodStart: userData.lastPeriodStart || emailBackup.lastPeriodStart || new Date().toISOString(),
                    periods: (userData.periods && userData.periods.length > 0) ? userData.periods : (emailBackup.periods || []),
                    periodLogs: (userData.periodLogs && userData.periodLogs.length > 0) ? userData.periodLogs : (emailBackup.periodLogs || []),
                    symptoms: (userData.symptoms && userData.symptoms.length > 0) ? userData.symptoms : (emailBackup.symptoms || []),
                    moodLogs: (userData.moodLogs && userData.moodLogs.length > 0) ? userData.moodLogs : (emailBackup.moodLogs || []),
                    theme: userData.theme || emailBackup.theme || 'rose',
                    tempUnit: userData.tempUnit || emailBackup.tempUnit || 'C',
                    isPregnancyMode: userData.isPregnancyMode ?? emailBackup.isPregnancyMode ?? false,
                    onboardingCompleted: userData.onboardingCompleted === true || emailBackup.onboardingCompleted === true || !!userData.isPartner || !!(userData.lastPeriodStart || emailBackup.lastPeriodStart),
                    diaryPin: userData.diaryPin || emailBackup.diaryPin || '1234',
                    favoriteSongs: userData.favoriteSongs || emailBackup.favoriteSongs || [],
                    customSongs: userData.customSongs || emailBackup.customSongs || [],
                    isPartnerLinked: userData.isPartnerLinked ?? emailBackup.isPartnerLinked ?? false,
                    sharingSettings: {
                      shareCycleInfo: userData.sharingSettings?.shareCycleInfo ?? true,
                      shareSymptoms: userData.sharingSettings?.shareSymptoms ?? false,
                      shareMood: userData.sharingSettings?.shareMood ?? false,
                      shareNotes: userData.sharingSettings?.shareNotes ?? false,
                      shareFertilityInfo: userData.sharingSettings?.shareFertilityInfo ?? false,
                      sharePregnancyInfo: userData.sharingSettings?.sharePregnancyInfo ?? false,
                      shareIntimacyInfo: userData.sharingSettings?.shareIntimacyInfo ?? false,
                      shareDoctorReports: userData.sharingSettings?.shareDoctorReports ?? false,
                      shareAppointmentReminders: userData.sharingSettings?.shareAppointmentReminders ?? false,
                      shareWellnessUpdates: userData.sharingSettings?.shareWellnessUpdates ?? false,
                    },
                    birthControlConfig: userData.birthControlConfig || {
                      method: 'Pill',
                      frequency: 'daily',
                      reminderTime: '09:00',
                      enabled: false
                    },
                    waterGoal: userData.waterGoal || 8,
                    notificationSettings: userData.notificationSettings || getDefaultNotificationSettings()
                  };
                  setUser(fullUser);
                  localStorage.setItem('lumina_user', JSON.stringify(fullUser));
                  localStorage.setItem('lumina_biometric_user', JSON.stringify(fullUser));
                  setWaterGoal(fullUser.waterGoal || 8);
                } else {
                  handleLogin(userData);
                }
              }
              setAuthLoading(false);
            });
          }
        } catch (err) {
          console.error('Failed to restore active user session from local storage:', err);
        }
      }
    }

    // 2. ENFORCE RETRIEVING THE LATEST PROFILE SECURELY BEHIND THE BIOMETRIC BLOCK
    const unsubscribeAuth = onAuthStateChanged(auth, (fbUser: any) => {
      if (hasInvite) {
        setLatestCloudUser(null);
        setLatestCloudLoading(false);
        setAuthLoading(false);
        return;
      }
      if (fbUser) {
        setLatestCloudLoading(true);
        // Retrieve and update cache for user experience, but do NOT log them into Active unlocked state if blocked
        subscribeToUser(fbUser.uid, (userData) => {
          if (userData) {
            const isUnlockedNow = sessionStorage.getItem('lumina_session_unlocked') === 'true';
            
            // Restore any cached local cycle data for this email if present
            let emailBackup: Partial<User> = {};
            if (userData.email) {
              const savedEmailStr = localStorage.getItem('lumina_user_email_' + userData.email.toLowerCase().trim());
              if (savedEmailStr) {
                try {
                  emailBackup = JSON.parse(savedEmailStr);
                } catch (e) {
                  console.warn("Failed to parse emailBackup", e);
                }
              }
            }

            const fullUser: User = {
              ...emailBackup,
              ...userData,
              cycleLength: userData.cycleLength || emailBackup.cycleLength || 28,
              periodLength: userData.periodLength || emailBackup.periodLength || 5,
              lastPeriodStart: userData.lastPeriodStart || emailBackup.lastPeriodStart || new Date().toISOString(),
              periods: (userData.periods && userData.periods.length > 0) ? userData.periods : (emailBackup.periods || []),
              periodLogs: (userData.periodLogs && userData.periodLogs.length > 0) ? userData.periodLogs : (emailBackup.periodLogs || []),
              symptoms: (userData.symptoms && userData.symptoms.length > 0) ? userData.symptoms : (emailBackup.symptoms || []),
              moodLogs: (userData.moodLogs && userData.moodLogs.length > 0) ? userData.moodLogs : (emailBackup.moodLogs || []),
              theme: userData.theme || emailBackup.theme || 'rose',
              tempUnit: userData.tempUnit || emailBackup.tempUnit || 'C',
              isPregnancyMode: userData.isPregnancyMode ?? emailBackup.isPregnancyMode ?? false,
              onboardingCompleted: userData.onboardingCompleted === true || emailBackup.onboardingCompleted === true || !!userData.isPartner,
              diaryPin: userData.diaryPin || emailBackup.diaryPin || '1234',
              favoriteSongs: userData.favoriteSongs || emailBackup.favoriteSongs || [],
              customSongs: userData.customSongs || emailBackup.customSongs || [],
              isPartnerLinked: userData.isPartnerLinked ?? emailBackup.isPartnerLinked ?? false,
              sharingSettings: {
                shareCycleInfo: userData.sharingSettings?.shareCycleInfo ?? true,
                shareSymptoms: userData.sharingSettings?.shareSymptoms ?? false,
                shareMood: userData.sharingSettings?.shareMood ?? false,
                shareNotes: userData.sharingSettings?.shareNotes ?? false,
                shareFertilityInfo: userData.sharingSettings?.shareFertilityInfo ?? false,
                sharePregnancyInfo: userData.sharingSettings?.sharePregnancyInfo ?? false,
                shareIntimacyInfo: userData.sharingSettings?.shareIntimacyInfo ?? false,
                shareDoctorReports: userData.sharingSettings?.shareDoctorReports ?? false,
                shareAppointmentReminders: userData.sharingSettings?.shareAppointmentReminders ?? false,
                shareWellnessUpdates: userData.sharingSettings?.shareWellnessUpdates ?? false,
              },
              birthControlConfig: userData.birthControlConfig || emailBackup.birthControlConfig || {
                method: 'Pill',
                frequency: 'daily',
                reminderTime: '09:00',
                enabled: false
              },
              waterGoal: userData.waterGoal || emailBackup.waterGoal || 8,
              notificationSettings: userData.notificationSettings || emailBackup.notificationSettings || getDefaultNotificationSettings()
            };
            
            // Sync with memory
            setLatestCloudUser(fullUser);
            setLatestCloudLoading(false);
            
            const isRememberEnabled = localStorage.getItem('lumina_remember_me') !== 'false';
            
            if (fullUser.email) {
              localStorage.setItem('lumina_user_email_' + fullUser.email.toLowerCase().trim(), JSON.stringify(fullUser));
            }
            
            // Cache details for biometrics if remember me is enabled
            if (isRememberEnabled) {
              localStorage.setItem('lumina_biometric_user', JSON.stringify(fullUser));
            } else {
              localStorage.removeItem('lumina_biometric_user');
            }
            
            // Automatically unlock session for any authenticated user on app load or snapshot sync
            sessionStorage.setItem('lumina_session_unlocked', 'true');
            
            const localUser = userRef.current;
            if (!localUser || JSON.stringify(fullUser) !== JSON.stringify(localUser)) {
              setUser(fullUser);
              if (isRememberEnabled) {
                localStorage.setItem('lumina_user', JSON.stringify(fullUser));
              } else {
                sessionStorage.setItem('lumina_user', JSON.stringify(fullUser));
              }
              setWaterGoal(fullUser.waterGoal || 8);
            }
          } else {
            setLatestCloudLoading(false);
          }
          setAuthLoading(false);
        });
      } else {
        setLatestCloudUser(null);
        setLatestCloudLoading(false);
        const isUnlockedNow = sessionStorage.getItem('lumina_session_unlocked') === 'true';
        if (!isUnlockedNow) {
          setUser(null);
        } else {
          const loggedInUser = localStorage.getItem('lumina_user');
          if (!loggedInUser) {
            setUser(null);
          }
        }
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

  // Sync to Firestore and Local Storage securely to remember all changes
  useEffect(() => {
    if (user) {
      syncUser(user);
      if (user.email) {
        localStorage.setItem('lumina_user_email_' + user.email.toLowerCase().trim(), JSON.stringify(user));
      }
      const isRememberEnabled = localStorage.getItem('lumina_remember_me') !== 'false';
      if (isRememberEnabled) {
        localStorage.setItem('lumina_user', JSON.stringify(user));
        localStorage.setItem('lumina_biometric_user', JSON.stringify(user));
      } else {
        sessionStorage.setItem('lumina_user', JSON.stringify(user));
      }
    }
  }, [user]);

  // ----------------------------------------------------
  // AUTOMATIC NOTIFICATION ENGINE & SCHEDULER
  // ----------------------------------------------------
  useEffect(() => {
    if (!user) return;

    // Request browser notification permission if available and default
    if ('Notification' in window && window.Notification.permission === 'default') {
      try {
        window.Notification.requestPermission();
      } catch (e) {
        console.warn('Notification permission request error:', e);
      }
    }

    const activeSettings = user.notificationSettings || getDefaultNotificationSettings();
    if (!activeSettings.enabled && !activeSettings.partnerNotificationsEnabled) {
      return;
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
      if ('Notification' in window && window.Notification.permission === 'granted') {
        try {
          new window.Notification(`${topAlert.emoji} ${topAlert.title}`, { body: topAlert.body });
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
      localStorage.setItem('lumina_user', JSON.stringify(updatedUser));
      localStorage.setItem('lumina_biometric_user', JSON.stringify(updatedUser));
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

  const proceedWithLogin = (userData: User, remember: boolean = true) => {
    const activeData = (latestCloudUser && latestCloudUser.id === userData.id)
      ? latestCloudUser
      : userData;

    const fullUser: User = {
      ...activeData,
      theme: activeData.theme || 'rose',
      tempUnit: activeData.tempUnit || 'C',
      isPregnancyMode: activeData.isPregnancyMode || false,
      onboardingCompleted: (activeData.onboardingCompleted === true || userData.onboardingCompleted === true || !!activeData.lastPeriodStart || !!userData.lastPeriodStart || !!activeData.isPartner || !!userData.isPartner) ? true : false,
      diaryPin: activeData.diaryPin || '1234',
      favoriteSongs: activeData.favoriteSongs || [],
      customSongs: activeData.customSongs || [],
      isPartnerLinked: activeData.isPartnerLinked || false,
      sharingSettings: {
        shareCycleInfo: activeData.sharingSettings?.shareCycleInfo ?? true,
        shareSymptoms: activeData.sharingSettings?.shareSymptoms ?? false,
        shareMood: activeData.sharingSettings?.shareMood ?? false,
        shareNotes: activeData.sharingSettings?.shareNotes ?? false,
        shareFertilityInfo: activeData.sharingSettings?.shareFertilityInfo ?? false,
        sharePregnancyInfo: activeData.sharingSettings?.sharePregnancyInfo ?? false,
        shareIntimacyInfo: activeData.sharingSettings?.shareIntimacyInfo ?? false,
        shareDoctorReports: activeData.sharingSettings?.shareDoctorReports ?? false,
        shareAppointmentReminders: activeData.sharingSettings?.shareAppointmentReminders ?? false,
        shareWellnessUpdates: activeData.sharingSettings?.shareWellnessUpdates ?? false,
      },
      birthControlConfig: activeData.birthControlConfig || {
        method: 'Pill',
        frequency: 'daily',
        reminderTime: '09:00',
        enabled: false
      },
      waterGoal: activeData.waterGoal || 8,
      notificationSettings: activeData.notificationSettings || getDefaultNotificationSettings()
    };

    // Dynamically adjust Firebase Auth persistence based on user preference
    try {
      if (remember) {
        setPersistence(auth, indexedDBLocalPersistence).catch((err) => {
          console.warn("Failed to set persistent local auth persistence:", err);
        });
      } else {
        setPersistence(auth, browserSessionPersistence).catch((err) => {
          console.warn("Failed to set session auth persistence:", err);
        });
      }
    } catch (e) {
      console.warn("Failed to configure dynamic persistence:", e);
    }

    sessionStorage.setItem('lumina_session_unlocked', 'true');
    sessionStorage.removeItem('lumina_logged_out');
    setUser(fullUser);

    if (remember) {
      localStorage.setItem('lumina_remember_me', 'true');
      localStorage.setItem('lumina_user', JSON.stringify(fullUser));
      localStorage.setItem('lumina_biometric_user', JSON.stringify(fullUser));
    } else {
      localStorage.setItem('lumina_remember_me', 'false');
      localStorage.removeItem('lumina_user');
      localStorage.removeItem('lumina_biometric_user');
      sessionStorage.setItem('lumina_user', JSON.stringify(fullUser));
    }

    setWaterGoal(fullUser.waterGoal || 8);
    playWelcomeVoice(fullUser.name);
    setIsMusicPlaying(true);

    if (fullUser.isPartner) {
      setActiveTab('partner'); // Routes explicitly to Partner Dashboard / Connect experience
    } else if (fullUser.isPregnancyMode) {
      setActiveTab('cycle'); // Routes to Pregnancy Tracker Dashboard
    } else {
      setActiveTab('dashboard'); // Routes to standard Cycle Dashboard
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
      diaryPin: '1234',
      favoriteSongs: [],
      customSongs: [],
      isPartnerLinked: false,
      sharingSettings: {
        shareCycleInfo: true,
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
    
    proceedWithLogin(newUserObj, true);
    setRestoreDataPrompt(null);
  };

  const handleLogin = (userData: User, rememberMe: boolean = true) => {
    // Check cloud backup and restore saved cycle data automatically
    const hasCycleInfo = !!(userData.lastPeriodStart && userData.cycleLength && userData.periodLength);
    const hasCloudBackup = 
      hasCycleInfo ||
      (userData.periods && userData.periods.length > 0) || 
      (userData.symptoms && userData.symptoms.length > 0) ||
      (userData.moodLogs && userData.moodLogs.length > 0) ||
      (userData.periodDates && userData.periodDates.length > 0) ||
      (userData.bcLogs && userData.bcLogs.length > 0) ||
      (userData.diaryEntries && userData.diaryEntries.length > 0);

    const restoredUser = {
      ...userData,
      onboardingCompleted: (userData.onboardingCompleted === true || hasCloudBackup || hasCycleInfo || !!userData.isPartner) ? true : false
    };
    proceedWithLogin(restoredUser, rememberMe);
  };

  const handleLogout = () => {
    // 1. Completely sign out the user in Firebase Auth
    auth.signOut().catch(() => {});

    // 2. Clear the active session in React state
    setUser(null);
    setLatestCloudUser(null);
    setIsMusicPlaying(false);

    // 3. Clear all active session flags in sessionStorage
    sessionStorage.removeItem('lumina_session_unlocked');
    sessionStorage.setItem('lumina_logged_out', 'true');
    sessionStorage.removeItem('lumina_user');

    // 4. Completely purge stored login state and biometric credentials from localStorage
    localStorage.removeItem('lumina_user');
    localStorage.removeItem('lumina_biometric_user');
    localStorage.removeItem('lumina_saved_email');
    localStorage.removeItem('lumina_saved_password');
    localStorage.removeItem('lumina_saved_name');
    localStorage.removeItem('lumina_remember_me');
  };

  // Handle auto-linking on login / startup with an invitation code
  useEffect(() => {
    if (inviteCode && user) {
      if (!user.isPartner) {
        // Tracker user detected trying to open an invite link meant for partners.
        // Log out immediately to allow the separate partner (companion) sign-up / log-in flow.
        console.log("Logged in user is a standard cycle tracker. Logging out to ensure separate partner setup.");
        handleLogout();
      } else if (!user.partnerId) {
        // Valid partner user, but not linked yet. Let's auto-link them!
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
              localStorage.setItem('lumina_user', JSON.stringify(updated));
              localStorage.setItem('lumina_biometric_user', JSON.stringify(updated));
              handleClearInvite();
            }
          })
          .catch((err) => {
            console.error("Auto linking failed during session load:", err);
          });
      }
    }
  }, [inviteCode, user?.id, user?.isPartner, user?.partnerId]);

  // Subscribe to partner user data changes in real time
  useEffect(() => {
    if (user && user.partnerId) {
      const unsubscribe = subscribeToUser(user.partnerId, (pUser) => {
        setPartnerUser(pUser);
      });
      return () => unsubscribe();
    } else {
      setPartnerUser(null);
    }
  }, [user?.partnerId]);

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

  const handleLogPeriod = (intensity: PeriodLog['intensity']) => {
    if (!user) return;
    const today = new Date().toDateString();
    const newDates = Array.from(new Set([...(user.periodDates || []), today]));
    const newLogs = [...(user.periodLogs || []), { date: today, intensity }];
    
    setUser({ 
      ...user, 
      periodDates: newDates, 
      periodLogs: newLogs,
      lastPeriodStart: today 
    });
    setIsLogModalOpen(false);
  };

  const handleLogFullPeriod = (startDate: string, endDate: string, intensity: PeriodLog['intensity']) => {
    if (!user) return;
    
    const start = new Date(startDate);
    const end = new Date(endDate);
    const newDates: string[] = [...(user.periodDates || [])];
    const newLogs: PeriodLog[] = [...(user.periodLogs || [])];
    
    const current = new Date(start);
    while (current <= end) {
      const dateStr = current.toDateString();
      if (!newDates.includes(dateStr)) {
        newDates.push(dateStr);
        newLogs.push({ date: dateStr, intensity });
      }
      current.setDate(current.getDate() + 1);
    }
    
    const newPeriod: Period = {
      id: Math.random().toString(36).substr(2, 9),
      startDate,
      endDate,
      intensity
    };
    
    const allPeriods = [...(user.periods || []), newPeriod].sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());
    
    setUser({ 
      ...user, 
      periodDates: newDates, 
      periodLogs: newLogs,
      periods: allPeriods,
      lastPeriodStart: allPeriods[0]?.startDate || user.lastPeriodStart
    });
    setIsLogModalOpen(false);
  };

  const handleLogMood = (mood: any, note?: string) => {
    if (!user) return;
    const newMoodEntry = {
      id: Math.random().toString(36).substr(2, 9),
      date: new Date().toDateString(),
      mood,
      note
    };
    setUser({
      ...user,
      moodLogs: [...(user.moodLogs || []), newMoodEntry]
    });
  };

  const handleLogSexualActivity = (isProtected: boolean, notes?: string) => {
    if (!user) return;
    const newLog = {
      id: Math.random().toString(36).substr(2, 9),
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
      id: Math.random().toString(36).substr(2, 9),
      date: new Date().toDateString(),
      type,
      intensity
    };
    // Prior to Firebase we were using a separate symptoms state
    setSymptoms(prev => [...prev, newSymptom]);
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

  const updatePeriodDates = (dates: string[]) => {
    if (user) {
      setUser({ ...user, periodDates: dates });
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
        <div className="flex-1 bg-[#fffafb] dark:bg-[#12100e] flex flex-col items-center justify-center p-6 h-full min-h-[500px]">
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-pink-100 border-t-pink-500 rounded-full animate-spin"></div>
            <p className="text-pink-400 font-serif italic text-sm tracking-widest animate-pulse text-center animate-pulse">Entering Sanctuary...</p>
          </div>
        </div>
      );
    }

    if (restoreDataPrompt) {
      return (
        <div className="flex-1 bg-[#fffafb] dark:bg-[#12100e] flex items-center justify-center p-4 h-full min-h-[450px]">
          <div className="bg-white dark:bg-[#1c1917] max-w-sm w-full rounded-[2rem] border border-pink-100/60 shadow-lg p-6 space-y-4 text-center">
            <div className="w-12 h-12 bg-gradient-to-br from-pink-100 to-rose-100 rounded-xl flex items-center justify-center text-2xl mx-auto animate-pulse">🌸</div>
            <div className="space-y-1">
              <h2 className="text-base font-serif font-bold text-gray-800 dark:text-stone-200 italic leading-snug">Restore cloud data?</h2>
              <p className="text-[10px] text-gray-500">Backup found under <strong className="text-pink-500">{restoreDataPrompt.userData.email}</strong>.</p>
            </div>
            <div className="flex flex-col gap-2 pt-2">
              <button
                onClick={() => {
                  proceedWithLogin(restoreDataPrompt.userData);
                  setRestoreDataPrompt(null);
                }}
                className="w-full py-2.5 bg-gradient-to-r from-pink-400 to-rose-400 text-white font-extrabold uppercase text-[9px] tracking-widest rounded-full shadow-md"
              >
                ☁️ Restore Data
              </button>
              <button
                onClick={() => handleContinueAsNewUser(restoreDataPrompt.userData)}
                className="w-full py-2 bg-white border border-gray-150 text-gray-500 font-bold uppercase text-[9px] tracking-widest rounded-full"
              >
                Start Fresh
              </button>
            </div>
          </div>
        </div>
      );
    }

    if (!user) {
      return (
        <Auth 
          onLogin={handleLogin} 
          initialInviteCode={inviteCode} 
          onClearInvite={handleClearInvite}
          latestCloudUser={latestCloudUser}
          latestCloudLoading={latestCloudLoading}
        />
      );
    }

    if ((user as any).biometricsEnabled && !isSessionUnlocked) {
      return (
        <div className="flex-1 bg-stone-950 flex flex-col items-center justify-center p-8 h-full min-h-[480px] text-stone-100 font-sans">
          <div className="max-w-xs w-full text-center space-y-8 animate-fadeIn">
            <div className="w-20 h-20 bg-stone-900 border border-stone-800 rounded-3xl flex items-center justify-center mx-auto text-3xl shadow-lg relative">
              <span className="animate-pulse">🔒</span>
              <div className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-pink-500 rounded-full flex items-center justify-center text-[9px] font-black border-2 border-stone-950 text-stone-100">!</div>
            </div>

            <div className="space-y-2">
              <h2 className="text-xl font-serif italic text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-rose-300">Lumina Secured</h2>
              <p className="text-xs text-stone-400 leading-relaxed">
                Biometric security is active. Please authenticate using Face ID or your fingerprint scanner to unlock your physical data sanctuary.
              </p>
            </div>

            {appBiometricResult === 'scanning' ? (
              <div className="space-y-3 py-4">
                <div className="w-12 h-12 border-2 border-dashed border-pink-500 rounded-full animate-spin mx-auto flex items-center justify-center">
                  <div className="w-8 h-8 rounded-full bg-pink-500/10 animate-pulse" />
                </div>
                <p className="text-[10px] text-pink-500 font-bold uppercase tracking-widest animate-pulse">Scanning biometric signature...</p>
              </div>
            ) : appBiometricResult === 'success' ? (
              <div className="space-y-2 py-4">
                <div className="w-12 h-12 bg-emerald-500/20 border border-emerald-500 rounded-full mx-auto flex items-center justify-center text-emerald-400 text-xl">
                  ✓
                </div>
                <p className="text-[10px] text-emerald-400 font-bold uppercase tracking-widest">Access Granted</p>
              </div>
            ) : (
              <button
                onClick={() => {
                  setAppBiometricResult('scanning');
                  setTimeout(() => {
                    setAppBiometricResult('success');
                    setTimeout(() => {
                      setIsSessionUnlocked(true);
                      sessionStorage.setItem('lumina_session_unlocked', 'true');
                      setAppBiometricResult('idle');
                    }, 1000);
                  }, 1500);
                }}
                className="w-full py-4 bg-gradient-to-r from-pink-400 to-rose-400 text-white font-extrabold uppercase text-[10px] tracking-widest rounded-full shadow-lg hover:scale-105 transition-all cursor-pointer"
              >
                🔑 Scan Face ID / Touch ID
              </button>
            )}

            <button 
              onClick={handleLogout}
              className="text-[9px] text-stone-500 hover:text-stone-300 uppercase tracking-widest font-black transition-colors block mx-auto cursor-pointer"
            >
              Sign out of account
            </button>
          </div>
        </div>
      );
    }

    if (!user.onboardingCompleted) {
      if (user.isPartner) {
        return (
          <PartnerOnboardingWizard
            user={user}
            setUser={setUser}
            onComplete={(completedUser) => {
              setUser(completedUser);
              localStorage.setItem('lumina_user', JSON.stringify(completedUser));
              syncUser(completedUser);
            }}
          />
        );
      }
      return (
        <OnboardingWizard 
          user={user} 
          setUser={setUser} 
          onComplete={(completedUser) => {
            setUser(completedUser);
            localStorage.setItem('lumina_user', JSON.stringify(completedUser));
            syncUser(completedUser);
            try {
              playWelcomeVoice(completedUser.name || 'Beautiful');
            } catch (e) {
              console.warn("TTS Welcome Voice skip:", e);
            }
          }} 
        />
      );
    }

    const unreadCount = user?.notifications?.filter(n => !n.isRead).length || 0;
    const hasUnreadNotifs = unreadCount > 0;

    // Main authenticated application screen inside container
    return (
      <div className="flex flex-col h-full w-full relative">
        <header className="px-4 py-3 bg-white/90 dark:bg-stone-900/90 backdrop-blur-md shadow-sm sticky top-0 z-[60] border-b border-pink-50/10">
          <div className="w-full flex justify-between items-center gap-2">
            <div className="cursor-pointer flex-shrink-0" onClick={() => setActiveTab('dashboard')}>
              <h1 className={`text-xl font-serif italic ${themeClass}`}>Lumina</h1>
            </div>
            
            <div className="flex items-center gap-1.5 justify-end">
              {/* Notification Bell */}
              <button 
                onClick={() => setIsGlobalNotificationsOpen(true)}
                className="p-1.5 rounded-full bg-pink-50/80 dark:bg-stone-800 hover:bg-pink-100 text-pink-600 transition-all relative cursor-pointer active:scale-95 flex items-center justify-center border border-pink-100/50"
                title="Notification Center"
              >
                <Bell className={`w-3.5 h-3.5 ${hasUnreadNotifs ? 'animate-bounce text-pink-600' : 'text-stone-500'}`} />
                {hasUnreadNotifs && (
                  <span className="absolute -top-1 -right-1 min-w-[15px] h-[15px] px-1 bg-gradient-to-r from-rose-500 to-pink-500 text-white text-[8px] font-black rounded-full flex items-center justify-center border border-white dark:border-stone-900 animate-pulse">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              {!user.isPartner && (
                <button 
                  onClick={togglePregnancy}
                  className={`text-[8px] font-extrabold uppercase px-2.5 py-1 rounded-full border border-pink-100/40 transition-all ${user.isPregnancyMode ? 'bg-indigo-500 text-white border-indigo-500' : 'bg-rose-50/60 dark:bg-stone-800 text-gray-500'}`}
                >
                  {user.isPregnancyMode ? 'Pregnancy' : 'Cycle'}
                </button>
              )}

              <div className="flex items-center gap-1 bg-pink-50/30 dark:bg-stone-800/40 px-1.5 py-0.5 rounded-full border border-pink-100/30">
                <button 
                  onClick={() => {
                    if (currentTrack?.source !== 'internal') {
                      window.open(currentTrack.url, '_blank');
                    } else {
                      toggleMusic();
                    }
                  }} 
                  className="text-[9px]"
                  title="Toggle Ambient Audio"
                >
                  {currentTrack?.source !== 'internal' ? '↗' : (isMusicPlaying ? '⏸️' : '▶️')}
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Content body with custom padding inside the mobile container */}
        <main className="flex-1 overflow-y-auto px-4 py-4 scrollbar-none pb-32">
          {renderContent()}
        </main>

        {/* Global Notification Center Drawer */}
        {isGlobalNotificationsOpen && (
          <div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm flex justify-end animate-fadeIn">
            <div className="w-full max-w-sm bg-white dark:bg-stone-900 h-full shadow-2xl flex flex-col overflow-hidden animate-slideLeft">
              {/* Drawer Header */}
              <div className="p-4 bg-gradient-to-r from-pink-500 via-rose-500 to-purple-600 text-white flex justify-between items-center shadow-md">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-white/20 rounded-full">
                    <Bell className="w-5 h-5 text-white animate-bounce" />
                  </div>
                  <div>
                    <h3 className="font-serif italic font-bold text-lg leading-tight">Notification Center</h3>
                    <p className="text-[10px] text-pink-100 opacity-90">
                      {unreadCount > 0 ? `${unreadCount} new update${unreadCount > 1 ? 's' : ''}` : 'All caught up ✨'}
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => setIsGlobalNotificationsOpen(false)}
                  className="p-1.5 rounded-full bg-white/20 hover:bg-white/30 text-white transition-all cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Action Toolbar */}
              <div className="px-4 py-2.5 bg-pink-50/50 dark:bg-stone-800/60 border-b border-pink-100/30 flex justify-between items-center text-xs">
                <button 
                  onClick={() => {
                    if (!user) return;
                    const marked = (user.notifications || []).map(n => ({ ...n, isRead: true }));
                    const updated = { ...user, notifications: marked };
                    setUser(updated);
                    syncUser(updated);
                  }}
                  className="text-pink-600 dark:text-pink-400 font-medium hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <CheckCheck className="w-3.5 h-3.5" /> Mark all read
                </button>
                <button 
                  onClick={() => {
                    if (!user) return;
                    const updated = { ...user, notifications: [] };
                    setUser(updated);
                    syncUser(updated);
                  }}
                  className="text-stone-400 hover:text-rose-500 font-medium hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Clear all
                </button>
              </div>

              {/* Notification List */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {(!user?.notifications || user.notifications.length === 0) ? (
                  <div className="py-16 text-center text-stone-400 dark:text-stone-500 space-y-2">
                    <Sparkles className="w-8 h-8 mx-auto opacity-30 text-pink-400" />
                    <p className="text-sm font-medium text-stone-600 dark:text-stone-300">No notifications right now</p>
                    <p className="text-xs text-stone-400 max-w-xs mx-auto">
                      Your automatic period, ovulation, water, medication, and partner notifications will appear here.
                    </p>
                  </div>
                ) : (
                  user.notifications.map((notif) => (
                    <div 
                      key={notif.id}
                      onClick={() => {
                        if (!user) return;
                        const updatedList = (user.notifications || []).map(n => n.id === notif.id ? { ...n, isRead: true } : n);
                        const updated = { ...user, notifications: updatedList };
                        setUser(updated);
                        syncUser(updated);
                        setIsGlobalNotificationsOpen(false);
                        if (notif.title.toLowerCase().includes('water') || notif.title.toLowerCase().includes('hydration')) {
                          setActiveTab('water');
                        } else if (notif.title.toLowerCase().includes('period') || notif.title.toLowerCase().includes('ovulation') || notif.title.toLowerCase().includes('cycle')) {
                          setActiveTab('tracker');
                        } else if (notif.title.toLowerCase().includes('partner')) {
                          setActiveTab('partner');
                        } else if (notif.title.toLowerCase().includes('medication') || notif.title.toLowerCase().includes('pill')) {
                          setActiveTab('settings');
                        }
                      }}
                      className={`p-3.5 rounded-2xl border transition-all cursor-pointer relative group ${
                        !notif.isRead 
                          ? 'bg-gradient-to-r from-pink-50/90 to-rose-50/40 dark:from-stone-800 dark:to-stone-800/80 border-pink-200/80 dark:border-pink-900/50 shadow-sm' 
                          : 'bg-white dark:bg-stone-800/40 border-stone-100 dark:border-stone-800 opacity-80 hover:opacity-100'
                      }`}
                    >
                      {!notif.isRead && (
                        <span className="absolute top-3.5 right-3.5 w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                      )}
                      <div className="flex items-start gap-3">
                        <span className="text-2xl flex-shrink-0 leading-none pt-0.5">{notif.emoji || '🌸'}</span>
                        <div className="flex-1 min-w-0 pr-2">
                          <h4 className="text-xs font-bold text-stone-800 dark:text-stone-100 leading-snug">
                            {notif.title}
                          </h4>
                          <p className="text-[11px] text-stone-600 dark:text-stone-300 mt-1 leading-relaxed">
                            {notif.body}
                          </p>
                          <p className="text-[9px] text-stone-400 mt-2 font-mono">
                            {new Date(notif.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {new Date(notif.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                          </p>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (!user) return;
                            const updatedList = (user.notifications || []).filter(n => n.id !== notif.id);
                            const updated = { ...user, notifications: updatedList };
                            setUser(updated);
                            syncUser(updated);
                          }}
                          className="text-stone-300 hover:text-rose-500 p-1 rounded-full transition-colors opacity-60 hover:opacity-100 hover:bg-stone-100 dark:hover:bg-stone-700"
                          title="Delete notification"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
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
        return 'bg-gradient-to-br from-purple-150 via-indigo-100/80 to-slate-200/60';
      }
    }

    if (user?.wallpaper) {
      const wp = WALLPAPER_LIST.find(w => w.id === user.wallpaper);
      if (wp) {
        return `bg-gradient-to-br ${wp.gradient}`;
      }
    }

    return currentThemeData?.bg || 'bg-[#fffafb]';
  };

  const renderPremiumLock = (title: string, description: string, emoji: string) => {
    return (
      <div className="bg-white rounded-[3rem] border border-pink-50 p-12 text-center max-w-lg mx-auto shadow-sm space-y-6 my-10 animate-fadeIn text-gray-700">
        <div className="w-20 h-20 bg-pink-50 text-pink-500 rounded-full flex items-center justify-center text-4xl mx-auto shadow-inner animate-pulse">
          {emoji}
        </div>
        <div className="space-y-3">
          <h3 className="text-2xl font-serif italic text-pink-600 font-bold">{title}</h3>
          <p className="text-[10px] font-black uppercase tracking-widest text-pink-400">Premium Sanctuary Feature 👑</p>
          <p className="text-xs text-gray-500 leading-relaxed font-serif italic">
            {description}
          </p>
        </div>
        <div className="pt-4">
          <button
            onClick={() => {
              setSettingsSubTab('billing');
              setActiveTab('settings');
            }}
            className="w-full py-4 bg-gradient-to-r from-pink-50 via-rose-500 to-indigo-600 text-white rounded-3xl text-xs uppercase tracking-widest font-black shadow-xl shadow-rose-100/40 hover:scale-[1.01] active:scale-95 transition-all cursor-pointer"
          >
            💎 Get Premium Access
          </button>
        </div>
      </div>
    );
  };

  const renderContent = () => {
    if (user.isPartner) {
      return <PartnerMode user={user} reminders={reminders} setReminders={setReminders} setUser={setUser} />;
    }

    switch (activeTab) {
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
            isMusicActive={isMusicActive}
            toggleMusicActive={toggleMusicActive}
            volume={volume}
            setVolume={setVolume}
            togglePregnancy={togglePregnancy}
            partnerRequests={partnerRequests}
            handleLogout={handleLogout}
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
        return <Diary entries={diaryEntries} setEntries={setDiaryEntries} user={user} />;
      case 'selfcare':
        return <SelfCare tasks={selfCareTasks} setTasks={setSelfCareTasks} />;
      case 'partner':
        return (
          <PartnerMode user={user} reminders={reminders} setReminders={setReminders} setUser={setUser} />
        );
      case 'graphs':
        return <CycleGraph user={user} />;
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
            isMusicActive={isMusicActive}
            toggleMusicActive={toggleMusicActive}
            volume={volume}
            setVolume={setVolume}
            togglePregnancy={togglePregnancy}
            partnerRequests={partnerRequests}
            handleLogout={handleLogout}
          />
        );
    }
  };

  const currentTrack = fullLibrary[currentSongIndex];

  // If the user is not fully logged in, onboarded, or is locked, render the appropriate active screen directly
  if (showSplash || authLoading || restoreDataPrompt || !user || ((user as any).biometricsEnabled && !isSessionUnlocked) || (!user.onboardingCompleted && !user.isPartner)) {
    return renderActiveScreen();
  }

  return (
    <div className={`min-h-screen w-full overflow-x-hidden pb-28 ${getAppBackgroundClass()} selection:bg-pink-100 transition-colors duration-500`}>
      <audio 
        ref={audioRef}
        src={currentTrack?.source === 'internal' ? currentTrack.url : undefined} 
        onEnded={nextSong}
        loop={false}
      />
      
      {!(activeTab === 'dashboard' && !user.isPartner) && (
        <header className="px-4 md:px-6 pt-8 pb-5 bg-white/80 backdrop-blur-md shadow-sm sticky top-0 z-[60] border-b border-pink-50">
          <div className="w-full flex flex-wrap md:flex-nowrap justify-between items-center gap-4">
            <div className="cursor-pointer flex-shrink-0" onClick={() => setActiveTab('dashboard')}>
              <h1 className={`text-2xl md:text-3xl font-serif italic ${themeClass}`}>Lumina</h1>
            </div>
            
            <div className="flex items-center gap-2 md:gap-4 flex-wrap justify-end">
              {!user.isPartner && (
                <button 
                  onClick={togglePregnancy}
                  className={`text-[8px] md:text-[9px] font-bold px-2.5 py-1.5 md:px-4 md:py-1.5 rounded-full border transition-all ${user.isPregnancyMode ? 'bg-indigo-500 text-white border-indigo-500 shadow-md' : 'bg-white text-gray-400 border-gray-200'}`}
                >
                  {user.isPregnancyMode ? 'PREGNANCY' : 'CYCLE'}
                </button>
              )}

              <div className="flex items-center gap-1.5 md:gap-2 bg-pink-50/50 px-2 py-1 md:px-3 md:py-1.5 rounded-full border border-pink-100/50">
                <button 
                  onClick={() => {
                    if (currentTrack?.source !== 'internal') {
                      window.open(currentTrack.url, '_blank');
                    } else {
                      toggleMusic();
                    }
                  }} 
                  className="text-[10px] md:text-xs"
                >
                  {currentTrack?.source !== 'internal' ? '↗' : (isMusicPlaying ? '⏸️' : '▶️')}
                </button>
                <input 
                  type="range" min="0" max="1" step="0.01" value={volume} 
                  onChange={(e) => setVolume(parseFloat(e.target.value))}
                  className="w-8 md:w-10 h-1 accent-pink-400"
                />
              </div>

              {!user.isPartner && !['cycle', 'wellness', 'edu', 'pedia', 'settings'].includes(activeTab) && (
                <button 
                  onClick={() => {
                    setActiveTab('partner');
                    sessionStorage.setItem('lumina_partnermode_subtab', 'requests');
                    window.dispatchEvent(new CustomEvent('lumina-set-partner-subtab', { detail: 'requests' }));
                  }} 
                  className="p-1 md:p-2 text-gray-400 hover:text-pink-400 transition-colors relative"
                  title="Partner Connection Requests"
                >
                  <span>🔔</span>
                  {partnerRequests.filter(r => r.status === 'pending').length > 0 && (
                    <span className="absolute top-0.5 right-0.5 w-2 h-2 bg-rose-500 rounded-full border-2 border-white animate-pulse" />
                  )}
                </button>
              )}

              {!['cycle', 'wellness', 'edu', 'pedia', 'settings'].includes(activeTab) && (
                <button 
                  onClick={() => {
                    setSettingsSubTab('notifications');
                    setActiveTab('settings');
                  }} 
                  className="p-1 md:p-2 text-gray-400 hover:text-pink-400 transition-colors"
                >
                  ⚙️
                </button>
              )}
            </div>
          </div>
        </header>
      )}

      <main className={`max-w-4xl mx-auto px-4 ${activeTab === 'dashboard' && !user.isPartner ? 'mt-4' : 'mt-8'} pb-10`}>
        {renderContent()}
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

      <DoctorReport 
        isOpen={isDoctorReportOpen}
        onClose={() => setIsDoctorReportOpen(false)}
        user={user}
        symptoms={symptoms}
      />

      {/* Floating Mini Player (Global) */}
      {isMusicActive && (
        <div className="fixed bottom-28 left-4 right-4 bg-white/95 backdrop-blur-2xl border border-pink-100 rounded-[2.5rem] p-4 shadow-2xl z-[60] flex items-center justify-between animate-fadeIn">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className={`w-12 h-12 rounded-full bg-pink-100 flex items-center justify-center text-2xl ${isMusicPlaying ? 'animate-[spin_10s_linear_infinite]' : ''}`}>
              {currentTrack?.coverEmoji || '🎵'}
            </div>
            <div className="min-w-0 flex flex-col justify-center">
              <h4 className="text-sm font-serif italic text-pink-600 truncate leading-tight">{currentTrack?.title || 'No Song Selected'}</h4>
              <div className="flex items-center gap-1.5 mt-0.5 min-w-0">
                <p className="text-[9px] font-bold text-pink-300 uppercase truncate leading-none shrink-0">{currentTrack?.artist || 'Unknown'}</p>
                <span className="text-pink-200 text-[8px] leading-none shrink-0">•</span>
                <select
                  value={activeMusicGenre}
                  onChange={(e) => {
                    const newGenre = e.target.value;
                    setActiveMusicGenre(newGenre);
                    // Find first track in the new genre
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
                  className="text-[8px] font-black text-pink-500 bg-pink-50 hover:bg-pink-100 rounded-full px-2 py-0.5 border-none outline-none cursor-pointer uppercase tracking-wider leading-none focus:ring-1 focus:ring-pink-200"
                >
                  <option value="all">🌈 All</option>
                  <option value="lo-fi">☕ Lo-Fi</option>
                  <option value="classical">🎻 Classical</option>
                  <option value="ambient">🌌 Ambient</option>
                  <option value="nature sounds">🍃 Nature</option>
                  <option value="jazz">🎷 Jazz</option>
                  <option value="pop">🎤 Pop</option>
                  <option value="afrobeats">🌍 Afro</option>
                </select>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2 px-2">
            <button 
              onClick={prevSong}
              className="w-8 h-8 text-pink-400 hover:text-pink-600 transition-colors"
            >
              ⏮
            </button>
            <button 
              onClick={toggleMusic} 
              className="w-12 h-12 bg-pink-500 text-white rounded-full flex items-center justify-center shadow-lg hover:scale-105 transition-transform"
            >
              {isMusicPlaying ? '⏸' : '▶'}
            </button>
            <button 
              onClick={nextSong}
              className="w-8 h-8 text-pink-400 hover:text-pink-600 transition-colors"
            >
              ⏭
            </button>
          </div>
          
          <div className="hidden md:flex items-center gap-2 ml-4 border-l border-pink-100 pl-4 pr-3">
            <span className="text-xs">🔊</span>
            <input 
              type="range" 
              min="0" max="1" step="0.01" value={volume}
              onChange={(e) => setVolume(parseFloat(e.target.value))}
              className="w-20 h-1 accent-pink-400" 
            />
          </div>

          <button 
            onClick={() => {
              setIsMusicPlaying(false);
              setIsMusicActive(false);
            }}
            className="w-8 h-8 rounded-full border border-pink-100 flex items-center justify-center text-pink-400 hover:text-pink-600 hover:bg-pink-50 transition-colors shrink-0"
            title="Stop & Close Player"
          >
            ✕
          </button>
        </div>
      )}

      {!user.isPartner && (
        <>
          <nav className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-3xl border-t border-white/60 flex justify-around items-center py-3 px-1 shadow-[0_-15px_40px_rgba(244,114,182,0.05),_inset_0_2px_4px_rgba(255,255,255,0.7)] z-50 rounded-t-[2.5rem]">
            <NavItem icon="🏠" label="Home" active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} theme={user.theme} />
            <NavItem icon="📅" label="Calendar" active={activeTab === 'cycle'} onClick={() => setActiveTab('cycle')} theme={user.theme} />
            <NavItem icon="🌸" label="Wellness" active={activeTab === 'wellness'} onClick={() => setActiveTab('wellness')} theme={user.theme} />
            
            <button 
              onClick={() => setIsLogModalOpen(true)}
              className="flex flex-col items-center justify-center w-12 h-12 bg-gradient-to-br from-pink-400 to-rose-400 text-white rounded-full shadow-[0_4px_12px_rgba(244,114,182,0.3),_inset_0_1.5px_3px_rgba(255,255,255,0.4)] border-2 border-white hover:scale-105 active:scale-95 transition-all cursor-pointer shrink-0 z-50"
              title="Log Your Day"
              id="nav-log-plus-btn"
            >
              <span className="text-xl font-black leading-none">+</span>
            </button>

            <NavItem icon="🎵" label="Music" active={activeTab === 'music'} onClick={() => setActiveTab('music')} theme={user.theme} />
            <NavItem icon="📚" label="Learn" active={activeTab === 'edu'} onClick={() => setActiveTab('edu')} theme={user.theme} />
            <NavItem icon="👤" label="Settings" active={activeTab === 'settings'} onClick={() => { setSettingsSubTab('account'); setActiveTab('settings'); }} theme={user.theme} />
          </nav>
        </>
      )}
      {/* Simulated Phone Push Notification Lock Screen Card */}
      {simulatedNotify && (
        <div 
          onClick={() => {
            if (simulatedNotify.action) {
              simulatedNotify.action();
            }
            setSimulatedNotify(null);
          }}
          className={`notification-drawer fixed top-4 z-[200] rounded-3xl p-4.5 cursor-pointer shadow-[0_20px_50px_rgba(0,0,0,0.18)] border backdrop-blur-3xl flex flex-col gap-2.5 overflow-hidden ${
            simulatedNotify.isPartner 
              ? 'bg-gradient-to-br from-slate-900/95 to-slate-800/95 text-white border-slate-700/60' 
              : 'bg-white/95 text-gray-800 border-pink-100/80 hover:border-pink-200'
          }`}
        >
          {/* Header */}
          <div className="flex items-center justify-between text-[9px] uppercase tracking-widest font-black leading-none opacity-85">
            <div className="flex items-center gap-1.5 font-sans min-w-0">
              <span className="text-sm shrink-0">{simulatedNotify.isPartner ? '💞' : '🌸'}</span>
              <span className="truncate">{simulatedNotify.isPartner ? 'LUMINA PARTNER SYNC' : 'LUMINA SANCTUARY'}</span>
            </div>
            <div className="flex items-center gap-1 opacity-70 shrink-0">
              <span>now</span>
              <span>•</span>
              <span>simulated</span>
            </div>
          </div>

          {/* Body */}
          <div className="flex gap-3 items-start pr-1 min-w-0">
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center text-xl shrink-0 ${
              simulatedNotify.isPartner 
                ? 'bg-indigo-950/45 border border-indigo-500/30' 
                : 'bg-rose-50 border border-rose-100/50 text-rose-500'
            }`}>
              {simulatedNotify.emoji}
            </div>
            <div className="flex-1 min-w-0 flex flex-col gap-0.5">
              <h4 className={`text-[11px] font-bold tracking-tight leading-snug break-words ${simulatedNotify.isPartner ? 'text-indigo-200' : 'text-rose-500'}`}>
                {simulatedNotify.title}
              </h4>
              <p className="text-[10px] leading-relaxed font-semibold tracking-tight opacity-90 break-words whitespace-pre-line">
                {simulatedNotify.body}
              </p>
            </div>
          </div>

          {/* Action Footer */}
          <div className="flex items-center justify-between border-t mt-1.5 pt-2 opacity-65 text-[8px] font-bold uppercase tracking-wider border-current/10">
            <span>Tap to dismiss</span>
            <span>📱 Slide up to close</span>
          </div>
        </div>
      )}
    </div>
  );
};

const NavItem: React.FC<{ icon: string, label: string, active: boolean, onClick: () => void, theme: AppTheme, badge?: number }> = ({ icon, label, active, onClick, theme, badge }) => {
  return (
    <button 
      onClick={onClick}
      className={`flex flex-col items-center gap-1 py-2 px-3 rounded-[1.25rem] transition-all duration-300 relative cursor-pointer ${
        active 
          ? 'bg-gradient-to-br from-pink-400/10 to-rose-400/10 text-pink-600 scale-[1.04] font-black shadow-[inset_0_2px_4px_rgba(255,255,255,0.7),_inset_0_-1.5px_2px_rgba(0,0,0,0.03),_0_6px_15px_rgba(244,114,182,0.06)] border border-pink-100/40' 
          : 'text-gray-400 grayscale opacity-80 hover:grayscale-[50%] hover:scale-[1.02]'
      }`}
    >
      <span className={`text-xl transition-all duration-300 ${active ? 'scale-110 drop-shadow-sm' : ''}`}>{icon}</span>
      <span className="text-[7.5px] uppercase tracking-tighter font-black">{label}</span>
      {badge !== undefined && badge > 0 && (
        <span className="absolute -top-1 -right-1 bg-gradient-to-r from-pink-500 to-rose-500 text-white text-[8px] font-black w-4.5 h-4.5 rounded-full flex items-center justify-center shadow-[inset_0_1px_2.5px_rgba(255,255,255,0.45),_0_2px_5px_rgba(244,114,182,0.25)] border border-white animate-pulse">
          {badge}
        </span>
      )}
    </button>
  );
};

export default App;
