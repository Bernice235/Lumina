
import React, { useState, useEffect, useRef } from 'react';
import { User, Symptom, DiaryEntry, SelfCareTask, AppTheme, Reminder, BirthControlLog, Song, TemperatureLog, PeriodLog, Period, ReceivedComfort } from './types';
import Auth from './components/Auth';
import { OnboardingWizard } from './components/OnboardingWizard';
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
import { THEMES, SONGS } from './constants';
import { syncUser, subscribeToGifts, subscribeToUser, acceptInvite, subscribeToPartnerRequests } from './services/firebaseService';
import { getDefaultNotificationSettings } from './services/notificationService';
import { auth } from './services/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { SplashScreen } from './components/SplashScreen';

const App: React.FC = () => {
  const [user, setUserState] = useState<User | null>(() => {
    // Check if we have a saved user to restore automatically on relaunch
    const saved = localStorage.getItem('lumina_user');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.id) {
          sessionStorage.setItem('lumina_session_unlocked', 'true');
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
        userRef.current = next;
        return next;
      });
    } else {
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
      // Ella (tracked user) receives request alerts
      const pendingRequests = partnerRequests.filter(r => r.status === 'pending');
      pendingRequests.forEach(req => {
        if (!notifiedRequestIds.current.has(req.id)) {
          notifiedRequestIds.current.add(req.id);

          const requestedText = req.requested_permissions
            .map((p: string) => `✓ ${p}`)
            .join('\n');

          setSimulatedNotify({
            id: req.id,
            title: "💕 New Partner Request",
            body: `${req.partnerName || 'Michael'} wants to connect with you.\n\nRequested Access:\n${requestedText}`,
            emoji: "💕",
            isPartner: true,
            action: () => {
              setActiveTab('partner');
              sessionStorage.setItem('lumina_partnermode_subtab', 'requests');
              window.dispatchEvent(new CustomEvent('lumina-set-partner-subtab', { detail: 'requests' }));
            }
          });
        }
      });
    } else {
      // Michael (partner) receives approved/declined status change alerts
      partnerRequests.forEach(req => {
        const key = `${req.id}_${req.status}`;
        if (!notifiedRequestIds.current.has(key)) {
          notifiedRequestIds.current.add(key);

          if (req.status === 'approved') {
            setSimulatedNotify({
              id: req.id,
              title: "💕 Connection Approved",
              body: `${req.partnerName || 'Ella'} approved your request.`,
              emoji: "💕",
              isPartner: true,
              action: () => {
                window.location.reload();
              }
            });
          } else if (req.status === 'declined') {
            setSimulatedNotify({
              id: req.id,
              title: "💔 Connection Declined",
              body: `Your connection request has been declined or unlinked.`,
              emoji: "💔",
              isPartner: true
            });
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
        setSimulatedNotify({
          id: Math.random().toString(),
          title: detail.title,
          body: detail.body,
          emoji: detail.emoji || '🔔',
          isPartner: !!detail.isPartner,
          action: detail.action
        });
        playChime();
      }
    };

    window.addEventListener('lumina-simulate-notification', handler);
    return () => window.removeEventListener('lumina-simulate-notification', handler);
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
  const [volume, setVolume] = useState(0.3);
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
    return !localStorage.getItem('lumina_user');
  });

  // Restore Session
  useEffect(() => {
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
                  const fullUser: User = {
                    ...userData,
                    theme: userData.theme || 'rose',
                    tempUnit: userData.tempUnit || 'C',
                    isPregnancyMode: userData.isPregnancyMode || false,
                    onboardingCompleted: userData.onboardingCompleted || false,
                    diaryPin: userData.diaryPin || '1234',
                    favoriteSongs: userData.favoriteSongs || [],
                    customSongs: userData.customSongs || [],
                    isPartnerLinked: userData.isPartnerLinked || false,
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
      if (fbUser) {
        setLatestCloudLoading(true);
        // Retrieve and update cache for user experience, but do NOT log them into Active unlocked state if blocked
        subscribeToUser(fbUser.uid, (userData) => {
          if (userData) {
            const isUnlockedNow = sessionStorage.getItem('lumina_session_unlocked') === 'true';
            
            const fullUser: User = {
              ...userData,
              theme: userData.theme || 'rose',
              tempUnit: userData.tempUnit || 'C',
              isPregnancyMode: userData.isPregnancyMode || false,
              onboardingCompleted: userData.onboardingCompleted || false,
              diaryPin: userData.diaryPin || '1234',
              favoriteSongs: userData.favoriteSongs || [],
              customSongs: userData.customSongs || [],
              isPartnerLinked: userData.isPartnerLinked || false,
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
            
            // Sync with memory
            setLatestCloudUser(fullUser);
            setLatestCloudLoading(false);
            
            // Cache details for biometrics instantly
            localStorage.setItem('lumina_biometric_user', JSON.stringify(fullUser));
            
            // Automatically unlock session for any authenticated user on app load or snapshot sync
            sessionStorage.setItem('lumina_session_unlocked', 'true');
            
            const localUser = userRef.current;
            if (!localUser || JSON.stringify(fullUser) !== JSON.stringify(localUser)) {
              setUser(fullUser);
              localStorage.setItem('lumina_user', JSON.stringify(fullUser));
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
      localStorage.setItem('lumina_user', JSON.stringify(user));
      localStorage.setItem('lumina_biometric_user', JSON.stringify(user));
    }
  }, [user]);

  const proceedWithLogin = (userData: User) => {
    const activeData = (latestCloudUser && latestCloudUser.id === userData.id)
      ? latestCloudUser
      : userData;

    const fullUser: User = {
      ...activeData,
      theme: activeData.theme || 'rose',
      tempUnit: activeData.tempUnit || 'C',
      isPregnancyMode: activeData.isPregnancyMode || false,
      onboardingCompleted: activeData.onboardingCompleted || false,
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
    sessionStorage.setItem('lumina_session_unlocked', 'true');
    setUser(fullUser);
    localStorage.setItem('lumina_user', JSON.stringify(fullUser));
    localStorage.setItem('lumina_biometric_user', JSON.stringify(fullUser));
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
    
    proceedWithLogin(newUserObj);
    setRestoreDataPrompt(null);
  };

  const handleLogin = (userData: User) => {
    // Check cloud backup and restore saved cycle data automatically
    const hasCloudBackup = 
      (userData.periods && userData.periods.length > 0) || 
      (userData.symptoms && userData.symptoms.length > 0) ||
      (userData.moodLogs && userData.moodLogs.length > 0) ||
      (userData.periodDates && userData.periodDates.length > 0) ||
      (userData.bcLogs && userData.bcLogs.length > 0) ||
      (userData.diaryEntries && userData.diaryEntries.length > 0);

    const restoredUser = {
      ...userData,
      onboardingCompleted: hasCloudBackup ? true : (userData.onboardingCompleted ?? false)
    };
    proceedWithLogin(restoredUser);
  };

  const handleLogout = () => {
    sessionStorage.removeItem('lumina_session_unlocked');
    localStorage.removeItem('lumina_user');
    localStorage.removeItem('lumina_biometric_user');
    auth.signOut().catch(() => {});
    setUser(null);
    setIsMusicPlaying(false);
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

  const nextSong = () => {
    setCurrentSongIndex((prev) => (prev + 1) % fullLibrary.length);
  };

  const prevSong = () => {
    setCurrentSongIndex((prev) => (prev - 1 + fullLibrary.length) % fullLibrary.length);
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
  }, [isMusicPlaying, currentSongIndex, user?.customSongs]);

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

  const handleSelectSong = (index: number) => {
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

  if (showSplash) {
    return <SplashScreen />;
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#fffafb] flex items-center justify-center">
        <div className="flex flex-col items-center gap-6">
          <div className="w-16 h-16 border-4 border-pink-100 border-t-pink-500 rounded-full animate-spin"></div>
          <p className="text-pink-400 font-serif italic text-lg tracking-widest animate-pulse">Entering Sanctuary...</p>
        </div>
      </div>
    );
  }

  if (restoreDataPrompt) {
    return (
      <div className="min-h-screen bg-[#fffafb] flex items-center justify-center p-6 animate-fadeIn font-sans">
        <div className="bg-white max-w-md w-full rounded-[2.5rem] border border-pink-100/60 shadow-xl overflow-hidden p-8 space-y-6 text-center hover:scale-[1.01] transition-transform">
          <div className="w-16 h-16 bg-gradient-to-br from-pink-100 to-rose-100 rounded-2xl flex items-center justify-center text-3xl mx-auto">
            🌸
          </div>
          
          <div className="space-y-2">
            <h2 className="text-2xl font-serif font-bold text-gray-800 italic">Restore your Lumina data?</h2>
            <p className="text-xs text-gray-500 leading-relaxed text-center px-1">
              We detected a valid cloud backup of your health statistics, cycle logs, and customized preferences under <strong className="text-pink-500 font-semibold">{restoreDataPrompt.userData.email}</strong>.
            </p>
          </div>

          <div className="bg-pink-50/15 border border-pink-100/50 p-4 rounded-2xl text-left text-[11px] text-pink-600 space-y-2">
            <p className="font-bold uppercase tracking-wider text-[8px] text-pink-400">🎁 Available Cloud Backups Include:</p>
            <ul className="grid grid-cols-2 gap-x-2 gap-y-1 list-disc list-inside font-medium font-serif italic text-gray-650">
              <li>Cycle & period history</li>
              <li>Symptom & bio logs</li>
              <li>Mood histories</li>
              <li>Contraceptive profiles</li>
              <li>Diary entries & logs</li>
              <li>Settings & Units</li>
            </ul>
          </div>

          <div className="flex flex-col gap-2.5 pt-2">
            <button
              onClick={() => {
                proceedWithLogin(restoreDataPrompt.userData);
                setRestoreDataPrompt(null);
              }}
              className="w-full py-4 bg-gradient-to-r from-pink-400 to-rose-400 hover:from-pink-500 hover:to-rose-500 text-white font-extrabold uppercase text-[10px] tracking-widest rounded-full shadow-lg hover:scale-[1.01] transition-all cursor-pointer"
            >
              ☁️ Restore from Cloud Backup
            </button>
            
            <button
              onClick={() => handleContinueAsNewUser(restoreDataPrompt.userData)}
              className="w-full py-3.5 bg-white border border-gray-150 hover:bg-gray-50 text-gray-505 font-bold uppercase text-[10px] tracking-widest rounded-full transition-all cursor-pointer"
            >
              Continue as New User
            </button>
          </div>
          
          <p className="text-[9px] text-gray-400 uppercase tracking-widest pt-2">Lumina Sanctuary Cloud Sync Engine</p>
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

  // Support-first setup wizard for cycle values and display preferences
  if (!user.onboardingCompleted && !user.isPartner) {
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

  const currentThemeData = THEMES[user.theme || 'rose'];
  const themeClass = `text-${currentThemeData.primary}`;

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
          />
        );
      case 'cycle':
        return user.isPregnancyMode 
          ? <PregnancyTracker user={user} setUser={setUser} onOpenDoctorReport={() => setIsDoctorReportOpen(true)} /> 
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
              onOpenDoctorReport={() => setIsDoctorReportOpen(true)}
              setUser={setUser}
            />;
      case 'wellness':
        return <Wellness symptoms={symptoms} />;
      case 'pedia':
        return <Cyclepedia />;
      case 'edu':
        return <Education />;
      case 'water':
        return <WaterTracker waterIntake={waterIntake} setWaterIntake={setWaterIntake} waterGoal={waterGoal} setWaterGoal={handleUpdateWaterGoal} />;
      case 'music':
        return <MusicRoom 
          user={user} 
          onToggleFavorite={toggleFavoriteSong} 
          currentSongIndex={currentSongIndex} 
          onSelectSong={handleSelectSong} 
          isMusicPlaying={isMusicPlaying} 
          onTogglePlay={toggleMusic} 
          onNext={nextSong}
          onPrev={prevSong}
          onAddCustomSong={addCustomSong}
        />;
      case 'diary':
        return <Diary entries={diaryEntries} setEntries={setDiaryEntries} user={user} />;
      case 'selfcare':
        return <SelfCare tasks={selfCareTasks} setTasks={setSelfCareTasks} />;
      case 'partner':
        return <PartnerMode user={user} reminders={reminders} setReminders={setReminders} setUser={setUser} />;
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
          />
        );
    }
  };

  const currentTrack = fullLibrary[currentSongIndex];

  return (
    <div className={`min-h-screen pb-28 ${currentThemeData.bg} selection:bg-pink-100 transition-colors duration-500`}>
      <audio 
        ref={audioRef}
        src={currentTrack?.source === 'internal' ? currentTrack.url : undefined} 
        onEnded={nextSong}
        loop={false}
      />
      
      <header className="px-6 pt-10 pb-6 flex justify-between items-center bg-white/80 backdrop-blur-md shadow-sm sticky top-0 z-[60] border-b border-pink-50">
        <div className="cursor-pointer" onClick={() => setActiveTab('dashboard')}>
          <h1 className={`text-3xl font-serif italic ${themeClass}`}>Lumina</h1>
          <div className="flex gap-1 mt-1">
            {(Object.keys(THEMES) as AppTheme[]).map(t => (
              <button 
                key={t}
                onClick={(e) => { e.stopPropagation(); updateTheme(t); }}
                className={`w-3 h-3 rounded-full border border-white shadow-sm transition-transform hover:scale-125 ${t === 'rose' ? 'bg-pink-400' : t === 'lavender' ? 'bg-purple-400' : t === 'mint' ? 'bg-teal-400' : 'bg-orange-400'} ${user.theme === t ? 'ring-2 ring-offset-2 ring-gray-300' : ''}`}
              />
            ))}
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <button 
            onClick={() => {
              setSettingsSubTab('billing');
              setActiveTab('settings');
            }}
            className={`text-[9px] font-black tracking-widest uppercase px-3.5 py-2 rounded-full transition-all flex items-center gap-1 cursor-pointer hover:scale-105 ${
              user.isPremium 
                ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-sm shadow-emerald-100 hover:opacity-95' 
                : 'bg-gradient-to-r from-pink-500 to-rose-400 text-white shadow-md shadow-pink-100 animate-pulse'
            }`}
          >
            {user.isPremium ? '👑 Premium' : '💎 Try Premium'}
          </button>

          {!user.isPartner && (
            <button 
              onClick={togglePregnancy}
              className={`text-[9px] font-bold px-4 py-1.5 rounded-full border transition-all ${user.isPregnancyMode ? 'bg-indigo-500 text-white border-indigo-500 shadow-md' : 'bg-white text-gray-400 border-gray-200'}`}
            >
              {user.isPregnancyMode ? 'PREGNANCY MODE' : 'OFF'}
            </button>
          )}

          <div className="flex items-center gap-2 bg-pink-50/50 px-3 py-1.5 rounded-full border border-pink-100/50">
            <button 
              onClick={() => {
                if (currentTrack?.source !== 'internal') {
                  window.open(currentTrack.url, '_blank');
                } else {
                  toggleMusic();
                }
              }} 
              className="text-xs"
            >
              {currentTrack?.source !== 'internal' ? '↗' : (isMusicPlaying ? '⏸️' : '▶️')}
            </button>
            <input 
              type="range" min="0" max="1" step="0.01" value={volume} 
              onChange={(e) => setVolume(parseFloat(e.target.value))}
              className="w-10 h-1 accent-pink-400"
            />
          </div>

          <button 
            onClick={() => {
              setSettingsSubTab('notifications');
              setActiveTab('settings');
            }} 
            className="p-2 text-gray-400 hover:text-pink-400 transition-colors"
          >
            ⚙️
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 mt-8 pb-10">
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
            <div className="min-w-0">
              <h4 className="text-sm font-serif italic text-pink-600 truncate">{currentTrack?.title || 'No Song Selected'}</h4>
              <p className="text-[9px] font-bold text-pink-300 uppercase truncate">{currentTrack?.artist || 'Unknown'}</p>
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
          <button 
            onClick={() => setIsLogModalOpen(true)}
            className="fixed bottom-48 right-6 w-16 h-16 bg-gradient-to-br from-pink-400 to-rose-400 text-white rounded-full shadow-2xl shadow-pink-200 flex items-center justify-center text-3xl hover:scale-110 active:scale-95 transition-all z-[70] border-4 border-white group"
          >
            <span className="group-hover:rotate-90 transition-transform duration-300">+</span>
            <div className="absolute right-full mr-4 bg-white px-4 py-2 rounded-2xl shadow-xl border border-pink-50 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
              <p className="text-[10px] font-bold text-pink-400 uppercase tracking-widest">Log your day</p>
            </div>
          </button>
          
          <nav className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-2xl border-t border-pink-50 flex justify-around items-center py-5 px-2 shadow-[0_-15px_40px_rgba(244,114,182,0.08)] z-50 rounded-t-[2.5rem]">
            <NavItem icon="🏠" label="Home" active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} theme={user.theme} />
            <NavItem icon={user.isPregnancyMode ? "👶" : "🌸"} label={user.isPregnancyMode ? "Baby" : "Cycle"} active={activeTab === 'cycle'} onClick={() => setActiveTab('cycle')} theme={user.theme} />
            <NavItem icon="✨" label="Wellness" active={activeTab === 'wellness'} onClick={() => setActiveTab('wellness')} theme={user.theme} />
            <NavItem icon="🎵" label="Music" active={activeTab === 'music'} onClick={() => setActiveTab('music')} theme={user.theme} />
            <NavItem icon="📖" label="Learn" active={activeTab === 'edu'} onClick={() => setActiveTab('edu')} theme={user.theme} />
            <NavItem icon="📔" label="Diary" active={activeTab === 'diary'} onClick={() => setActiveTab('diary')} theme={user.theme} />
            <NavItem icon="💆‍♀️" label="Self" active={activeTab === 'selfcare'} onClick={() => setActiveTab('selfcare')} theme={user.theme} />
            <NavItem 
              icon="💞" 
              label="Partner" 
              active={activeTab === 'partner'} 
              onClick={() => setActiveTab('partner')} 
              theme={user.theme} 
              badge={user && !user.isPartner ? partnerRequests.filter(r => r.status === 'pending').length : 0}
            />
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
  const color = THEMES[theme].primary;
  return (
    <button 
      onClick={onClick}
      className={`flex flex-col items-center gap-1.5 transition-all relative ${active ? `text-${color} scale-110 font-bold drop-shadow-sm` : 'text-gray-400 grayscale'}`}
    >
      <span className="text-2xl">{icon}</span>
      <span className="text-[8px] uppercase tracking-tighter font-black">{label}</span>
      {active && <div className={`w-1 h-1 rounded-full bg-pink-400 mt-0.5`}></div>}
      {badge !== undefined && badge > 0 && (
        <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[8px] font-black w-4.5 h-4.5 rounded-full flex items-center justify-center border border-white animate-pulse">
          {badge}
        </span>
      )}
    </button>
  );
};

export default App;
