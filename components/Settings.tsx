import React, { useState } from 'react';
import { User, NotificationSettings, Symptom, DiaryEntry, BirthControlLog, TemperatureLog, SharingSettings, Reminder } from '../types';
import PartnerMode from './PartnerMode';
import { CommunityInvite } from './CommunityInvite';
import { 
  Bell, 
  Sparkles, 
  Moon, 
  Heart, 
  Volume2, 
  ShieldAlert, 
  Eye, 
  Check, 
  HelpCircle,
  MessageCircle,
  Clock,
  Send,
  UserCheck,
  LogOut,
  Lock,
  Fingerprint,
  User as UserIcon,
  Calendar,
  Layers,
  Download,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  FileText,
  Bug,
  Lightbulb,
  RefreshCw,
  UploadCloud,
  Shield,
  CheckCircle2,
  X,
  Smartphone,
  Users,
  Baby,
  HeartHandshake
} from 'lucide-react';
import { 
  getCyclePredictions, 
  getDefaultNotificationSettings, 
  generateNotificationText,
  getPregnancyStats,
  getBabySize,
  generatePregnancyNotificationText
} from '../services/notificationService';
import { 
  getWelcomeGreeting, 
  getUserFirstName, 
  playWelcomeVoiceGreeting, 
  stopWelcomeVoice, 
  WelcomeGreeting 
} from '../services/welcomeVoiceService';
import { syncUser, blockPartner, unblockPartner, deleteUserAccount } from '../services/firebaseService';
import { 
  REVENUECAT_PLANS, 
  purchasePremiumPlan, 
  restorePremiumPurchases, 
  syncActiveSubscriptionStatus 
} from '../services/revenueCatService';
import { doc, getDoc } from 'firebase/firestore';
import { db, auth } from '../services/firebase';
import { updateEmail, updatePassword } from 'firebase/auth';

interface SettingsProps {
  user: User;
  setUser: React.Dispatch<React.SetStateAction<User | null>>;
  onLogout?: () => void;
  symptoms?: Symptom[];
  diaryEntries?: DiaryEntry[];
  bcLogs?: BirthControlLog[];
  tempLogs?: TemperatureLog[];
  initialSubTab?: 'account' | 'cycle' | 'notifications' | 'music' | 'partner' | 'premium' | 'privacy' | 'about' | 'general' | 'billing' | 'invite' | 'mobile' | 'menu' | 'profile' | 'backup_sync' | 'help_support';
  reminders?: Reminder[];
  setReminders?: React.Dispatch<React.SetStateAction<Reminder[]>>;
  volume?: number;
  setVolume?: (vol: number) => void;
  partnerUser?: User | null;
  isMusicPlaying?: boolean;
  toggleMusic?: () => void;
  isMusicActive?: boolean;
  toggleMusicActive?: () => void;
  setActiveTab?: (tab: any) => void;
}

const Settings: React.FC<SettingsProps> = ({ 
  user, 
  setUser, 
  onLogout,
  symptoms = [],
  diaryEntries = [],
  bcLogs = [],
  tempLogs = [],
  initialSubTab = 'menu',
  reminders = [],
  setReminders = () => {},
  volume = 0.3,
  setVolume = (vol: number) => {},
  partnerUser = null,
  isMusicPlaying = false,
  toggleMusic = () => {},
  isMusicActive = false,
  toggleMusicActive = () => {},
  setActiveTab
}) => {
  const getMappedTab = (tab: any): 'menu' | 'profile' | 'account' | 'cycle' | 'notifications' | 'music_sanctuary' | 'partner' | 'premium' | 'privacy_security' | 'backup_sync' | 'help_support' | 'invite' => {
    if (tab === 'menu') return 'menu';
    if (tab === 'profile') return 'profile';
    if (tab === 'cycle') return 'cycle';
    if (tab === 'invite') return 'invite';
    if (tab === 'notifications') return 'notifications';
    if (tab === 'music' || tab === 'music_sanctuary') return 'music_sanctuary';
    if (tab === 'partner') return 'partner';
    if (tab === 'premium' || tab === 'billing') return 'premium';
    if (tab === 'privacy' || tab === 'privacy_security' || tab === 'mobile') return 'privacy_security';
    if (tab === 'backup' || tab === 'backup_sync') return 'backup_sync';
    if (tab === 'help' || tab === 'help_support' || tab === 'about' || tab === 'about_lumina') return 'help_support';
    if (tab === 'account') return 'profile';
    return 'menu';
  };

  const [activeSubTab, setActiveSubTab] = useState<'menu' | 'profile' | 'account' | 'cycle' | 'notifications' | 'music_sanctuary' | 'partner' | 'premium' | 'privacy_security' | 'backup_sync' | 'help_support' | 'invite'>(getMappedTab(initialSubTab));
  
  // Modals
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState<'support' | 'bug' | 'feature' | null>(null);
  const [feedbackText, setFeedbackText] = useState('');
  const [feedbackEmail, setFeedbackEmail] = useState(user.email || '');
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);

  // FAQ Accordion
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  React.useEffect(() => {
    setActiveSubTab(getMappedTab(initialSubTab));
  }, [initialSubTab]);

  const [selectedPlanId, setSelectedPlanId] = useState<'monthly' | '6month' | 'yearly'>('monthly');
  const [billingProgress, setBillingProgress] = useState<string | null>(null);
  const [billingError, setBillingError] = useState<string | null>(null);
  const [billingSuccess, setBillingSuccess] = useState<string | null>(null);

  const handleExportData = () => {
    const backupData = {
      exportedAt: new Date().toISOString(),
      appName: "Lumina Wellness",
      profile: {
        name: user.name,
        email: user.email,
        theme: user.theme,
        tempUnit: user.tempUnit || 'C',
        isPregnancyMode: user.isPregnancyMode,
        onboardingCompleted: user.onboardingCompleted,
        waterGoal: user.waterGoal || 8,
      },
      cyclePredictions: {
        cycleLength: user.cycleLength ?? 28,
        periodLength: user.periodLength ?? 5,
        lastPeriodStart: user.lastPeriodStart,
        periodDates: user.periodDates || [],
      },
      periods: user.periods || [],
      periodLogs: user.periodLogs || [],
      moodLogs: user.moodLogs || [],
      sexualActivityLogs: user.sexualActivityLogs || [],
      sharingSettings: user.sharingSettings,
      birthControlConfig: user.birthControlConfig,
      notificationSettings: user.notificationSettings,
      symptoms: symptoms,
      diaryEntries: diaryEntries,
      bcLogs: bcLogs,
      tempLogs: tempLogs
    };

    const dataStr = JSON.stringify(backupData, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `lumina_wellness_backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const [localFeedback, setLocalFeedback] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [cloudFeedback, setCloudFeedback] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [isImportDragging, setIsImportDragging] = useState(false);

  // Profile Edit States
  const [profileName, setProfileName] = useState(user.name || '');
  const [profileAge, setProfileAge] = useState(user.age ? String(user.age) : '');
  const [profileEmail, setProfileEmail] = useState(user.email || '');
  const [profilePassword, setProfilePassword] = useState('');
  const [profileFeedback, setProfileFeedback] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);

  // Account Deletion & Partner Control States
  const [showDeleteAccountModal, setShowDeleteAccountModal] = useState(false);
  const [deleteAccountInput, setDeleteAccountInput] = useState('');
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [partnerToBlock, setPartnerToBlock] = useState<{ id: string; name: string } | null>(null);
  const [partnerToUnblock, setPartnerToUnblock] = useState<{ id: string; name: string } | null>(null);

  const handleDeleteUserAccount = async () => {
    if (deleteAccountInput.trim() !== 'DELETE') return;
    setIsDeletingAccount(true);
    try {
      await deleteUserAccount(user.id);
      if (onLogout) {
        onLogout();
      } else {
        setUser(null);
      }
    } catch (err) {
      console.error("Account deletion error:", err);
      alert("Failed to delete account. Please try again.");
    } finally {
      setIsDeletingAccount(false);
    }
  };

  const handleBlockPartnerConfirm = async () => {
    if (!partnerToBlock) return;
    try {
      await blockPartner(user.id, partnerToBlock.id, { id: partnerToBlock.id, name: partnerToBlock.name });
      const updatedUser = {
        ...user,
        partnerId: undefined,
        partnerName: '',
        isPartnerLinked: false,
        partnerRequest: undefined,
        blockedPartners: [
          ...(user.blockedPartners || []).filter(b => b.id !== partnerToBlock.id),
          { id: partnerToBlock.id, name: partnerToBlock.name, dateBlocked: new Date().toISOString() }
        ]
      };
      setUser(updatedUser);
      localStorage.setItem('lumina_user', JSON.stringify(updatedUser));
      alert(`${partnerToBlock.name} has been blocked.`);
    } catch (err) {
      console.error("Error blocking partner:", err);
    } finally {
      setPartnerToBlock(null);
    }
  };

  const handleUnblockPartnerConfirm = async () => {
    if (!partnerToUnblock) return;
    try {
      await unblockPartner(user.id, partnerToUnblock.id);
      const updatedUser = {
        ...user,
        blockedPartners: (user.blockedPartners || []).filter(b => b.id !== partnerToUnblock.id)
      };
      setUser(updatedUser);
      localStorage.setItem('lumina_user', JSON.stringify(updatedUser));
      alert(`${partnerToUnblock.name} has been unblocked.`);
    } catch (err) {
      console.error("Error unblocking partner:", err);
    } finally {
      setPartnerToUnblock(null);
    }
  };

  React.useEffect(() => {
    setProfileName(user.name || '');
    setProfileAge(user.age ? String(user.age) : '');
    setProfileEmail(user.email || '');
  }, [user]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileFeedback(null);
    setProfileLoading(true);
    try {
      let updatedUser = { ...user };
      updatedUser.name = profileName.trim();
      if (profileAge.trim()) {
        updatedUser.age = parseInt(profileAge) || undefined;
      } else {
        delete updatedUser.age;
      }

      // 1. Firebase Auth Update (Email)
      const currentUser = auth.currentUser;
      if (currentUser) {
        if (profileEmail.trim() && profileEmail.trim() !== currentUser.email) {
          try {
            await updateEmail(currentUser, profileEmail.trim());
            updatedUser.email = profileEmail.trim();
          } catch (err: any) {
            if (err?.code === 'auth/requires-recent-login' || String(err?.message || '').includes('requires-recent-login')) {
              throw new Error("Changing your email requires a recent login. Please log out and log in again, then retry.");
            }
            throw err;
          }
        }

        // 2. Firebase Auth Update (Password)
        if (profilePassword.trim()) {
          try {
            await updatePassword(currentUser, profilePassword.trim());
            localStorage.setItem('lumina_saved_password', profilePassword.trim());
          } catch (err: any) {
            if (err?.code === 'auth/requires-recent-login' || String(err?.message || '').includes('requires-recent-login')) {
              throw new Error("Changing your password requires a recent login. Please log out and log in again, then retry.");
            }
            throw err;
          }
        }
      } else {
        if (profileEmail.trim()) {
          updatedUser.email = profileEmail.trim();
        }
        if (profilePassword.trim()) {
          localStorage.setItem('lumina_saved_password', profilePassword.trim());
        }
      }

      // Save user state
      setUser(updatedUser);
      localStorage.setItem('lumina_user', JSON.stringify(updatedUser));
      await syncUser(updatedUser);

      setProfileFeedback({ type: 'success', text: 'Profile updated successfully! ✨' });
      setProfilePassword('');
    } catch (err: any) {
      console.error("Error updating profile:", err);
      setProfileFeedback({ 
        type: 'error', 
        text: err instanceof Error ? err.message : 'Could not update profile. Please try again.' 
      });
    } finally {
      setProfileLoading(false);
    }
  };

  const handleCloudBackupNow = async () => {
    setCloudFeedback(null);
    try {
      await syncUser(user);
      setCloudFeedback({ type: 'success', text: 'Your wellness data has been safely backed up to the cloud! ☁️✨' });
    } catch (err) {
      console.error(err);
      setCloudFeedback({ type: 'error', text: 'Could not connect to the cloud. Your local records remain safe on this device.' });
    }
  };

  const handleCloudRestoreNow = async () => {
    setCloudFeedback(null);
    try {
      const docSnap = await getDoc(doc(db, "users", user.id));
      if (docSnap.exists()) {
        const cloudUser = docSnap.data() as User;
        const restoredUser: User = {
          ...cloudUser,
          onboardingCompleted: true
        };
        setUser(restoredUser);
        localStorage.setItem('lumina_user', JSON.stringify(restoredUser));
        localStorage.setItem('lumina_biometric_user', JSON.stringify(restoredUser));
        setCloudFeedback({ type: 'success', text: 'Your health data has been successfully restored from the cloud! 🌸' });
      } else {
        setCloudFeedback({ type: 'error', text: 'No cloud backup was found for this account.' });
      }
    } catch (err) {
      console.error(err);
      setCloudFeedback({ type: 'error', text: 'Could not connect to the cloud. Your local records remain safe on this device.' });
    }
  };

  // --- REVENUECAT SUBSCRIPTION SYNCHRONIZATION ---
  React.useEffect(() => {
    const syncStatus = async () => {
      try {
        await syncActiveSubscriptionStatus(user, setUser);
      } catch (err) {
        console.error("Failed to auto-sync RevenueCat status on load:", err);
      }
    };
    syncStatus();
  }, []);

  const parseAndImportJSON = (jsonText: string) => {
    try {
      const parsed = JSON.parse(jsonText);
      if (!parsed || (!parsed.profile && !parsed.id)) {
        throw new Error('Incorrect file format. Please upload a valid Lumina backup.');
      }

      const importedUser: User = {
        ...user,
        name: parsed.profile?.name ?? parsed.name ?? user.name,
        email: parsed.profile?.email ?? parsed.email ?? user.email,
        theme: parsed.profile?.theme ?? parsed.theme ?? user.theme,
        tempUnit: parsed.profile?.tempUnit ?? parsed.tempUnit ?? user.tempUnit ?? 'C',
        isPregnancyMode: parsed.profile?.isPregnancyMode ?? parsed.isPregnancyMode ?? user.isPregnancyMode ?? false,
        onboardingCompleted: parsed.profile?.onboardingCompleted ?? parsed.onboardingCompleted ?? user.onboardingCompleted ?? true,
        waterGoal: parsed.profile?.waterGoal ?? parsed.waterGoal ?? user.waterGoal ?? 8,
        cycleLength: parsed.cyclePredictions?.cycleLength ?? parsed.cycleLength ?? user.cycleLength ?? 28,
        periodLength: parsed.cyclePredictions?.periodLength ?? parsed.periodLength ?? user.periodLength ?? 5,
        lastPeriodStart: parsed.cyclePredictions?.lastPeriodStart ?? parsed.lastPeriodStart ?? user.lastPeriodStart,
        periods: parsed.periods ?? user.periods ?? [],
        periodDates: parsed.cyclePredictions?.periodDates ?? parsed.periodDates ?? user.periodDates ?? [],
        periodLogs: parsed.periodLogs ?? user.periodLogs ?? [],
        moodLogs: parsed.moodLogs ?? user.moodLogs ?? [],
        sexualActivityLogs: parsed.sexualActivityLogs ?? user.sexualActivityLogs ?? [],
        sharingSettings: parsed.sharingSettings ?? user.sharingSettings,
        birthControlConfig: parsed.birthControlConfig ?? user.birthControlConfig,
        notificationSettings: parsed.notificationSettings ?? user.notificationSettings,
        symptoms: parsed.symptoms ?? user.symptoms ?? [],
        diaryEntries: parsed.diaryEntries ?? user.diaryEntries ?? [],
        bcLogs: parsed.bcLogs ?? user.bcLogs ?? [],
        tempLogs: parsed.tempLogs ?? user.tempLogs ?? []
      };

      setUser(importedUser);
      localStorage.setItem('lumina_user', JSON.stringify(importedUser));
      localStorage.setItem('lumina_biometric_user', JSON.stringify(importedUser));
      syncUser(importedUser);

      setLocalFeedback({ type: 'success', text: 'Your health records have been restored successfully! ✨' });
    } catch (e: any) {
      setLocalFeedback({ type: 'error', text: `Failed to restore: ${e.message || 'Invalid backup file structure.'}` });
    }
  };

  const handleLocalFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalFeedback(null);
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      if (typeof event.target?.result === 'string') {
        parseAndImportJSON(event.target.result);
      }
    };
    reader.readAsText(file);
  };

  const settings: NotificationSettings = user.notificationSettings || getDefaultNotificationSettings();

  const updateSettings = (newSettings: Partial<NotificationSettings>) => {
    if (!user) return;
    const updatedUser = {
      ...user,
      notificationSettings: {
        ...settings,
        ...newSettings
      }
    };
    setUser(updatedUser);
    localStorage.setItem('lumina_user', JSON.stringify(updatedUser));
  };

  const updateTypes = (key: keyof NotificationSettings['types'], value: boolean) => {
    updateSettings({
      types: {
         ...settings.types,
         [key]: value
      }
    });
  };

  const updatePartnerReceiveTypes = (key: keyof NotificationSettings['partnerReceiveTypes'], value: boolean) => {
    updateSettings({
      partnerReceiveTypes: {
        ...(settings.partnerReceiveTypes || {
          periodStarting: true,
          periodStarted: true,
          periodEnding: true,
          ovulation: true,
          fertileWindow: true,
          pregnancyRisk: true,
        }),
        [key]: value
      }
    });
  };

  const updatePartnerPregnancyReceiveTypes = (key: keyof NotificationSettings['partnerPregnancyReceiveTypes'], value: boolean) => {
    updateSettings({
      partnerPregnancyReceiveTypes: {
        ...(settings.partnerPregnancyReceiveTypes || {
          welcome: true,
          weeklyBabyDev: true,
          appointment: true,
          rest: true,
          symptomSupport: true,
          dueDateCountdown: true,
          laborNear: true,
          encouragement: true,
        }),
        [key]: value
      }
    });
  };

  const updatePartnerPref = (key: string, value: boolean) => {
    if (!user) return;
    const updatedUser = {
      ...user,
      partnerNotificationPreferences: {
        ...(user.partnerNotificationPreferences || {}),
        [key]: value
      }
    };
    setUser(updatedUser);
    localStorage.setItem('lumina_user', JSON.stringify(updatedUser));
    syncUser(updatedUser);
  };

  const [isPlayingVoiceTest, setIsPlayingVoiceTest] = useState(false);
  const [greetingRotationOffset, setGreetingRotationOffset] = useState(0);

  const userFirstName = getUserFirstName(user);
  const currentPreviewGreeting = getWelcomeGreeting(user, undefined, greetingRotationOffset);

  const handleTestWelcomeVoice = async () => {
    setIsPlayingVoiceTest(true);
    try {
      await playWelcomeVoiceGreeting(user, {
        force: true,
        customGreeting: currentPreviewGreeting,
        onEnd: () => setIsPlayingVoiceTest(false),
        onError: () => setIsPlayingVoiceTest(false),
      });
    } catch (e) {
      console.warn("Welcome voice test notice:", e);
      setIsPlayingVoiceTest(false);
    }
  };

  const handleRotatePreview = () => {
    setGreetingRotationOffset((prev) => prev + 1);
  };

  const triggerSimulation = (
    type: keyof NotificationSettings['types'] | 'pregnancyRiskLow' | 'pregnancyRiskHigh',
    isPartner: boolean
  ) => {
    const tone = settings.toneStyle || 'supportive';
    let bodyText = '';
    let titleText = isPartner ? 'Partner Connection 💕' : 'Cycle Update 🌸';
    let emojiText = '🔔';

    const predictions = getCyclePredictions(user);

    if (type === 'periodStarting') {
      bodyText = generateNotificationText('periodStarting', tone, isPartner, { date: predictions.nextPeriod });
      titleText = isPartner ? 'Partner Connection 💞' : 'Cycle Reminder 🌸';
      emojiText = '🌸';
    } else if (type === 'periodStarted') {
      bodyText = generateNotificationText('periodStarted', tone, isPartner);
      titleText = isPartner ? 'Period started 💕' : 'New Cycle Begins 🩷';
      emojiText = '🩷';
    } else if (type === 'periodEnding') {
      bodyText = generateNotificationText('periodEnding', tone, isPartner);
      titleText = isPartner ? 'Cycle Update 🌷' : 'Period Ending ✨';
      emojiText = '🌷';
    } else if (type === 'ovulation') {
      bodyText = generateNotificationText('ovulation', tone, isPartner, { date: predictions.ovulation });
      titleText = isPartner ? 'Ovulation Update 🌸' : 'Ovulation Day ✨';
      emojiText = '💖';
    } else if (type === 'fertileWindow') {
      bodyText = generateNotificationText('fertileWindow', tone, isPartner, { startDate: predictions.fertileStart, endDate: predictions.fertileEnd });
      titleText = isPartner ? 'Fertile Window 💞' : 'Fertile Window 💞';
      emojiText = '💞';
    } else if (type === 'lutealPhase') {
      bodyText = generateNotificationText('lutealPhase', tone, isPartner);
      titleText = 'Luteal Phase 🌙';
      emojiText = '🌙';
    }

    const event = new CustomEvent('lumina-simulate-notification', {
      detail: {
        title: titleText,
        body: bodyText,
        emoji: emojiText,
        isPartner
      }
    });
    window.dispatchEvent(event);
  };

  const tonePreviews = {
    supportive: {
      desc: "Warm, empathetic, and gentle. Feels like a supportive, reassuring text from a caring friend.",
      label: "Supportive 💗",
      sample: user.isPregnancyMode 
        ? "“Hey mama 💗 Welcome to your pregnancy journey. We’re here with you every step of the way 🌸”" 
        : "“Hey girl 💗 Your period is expected to start soon. Remember to take gentle care of yourself 🌸”"
    },
    playful: {
      desc: "Lighthearted, uplifting, and cheerful. Adds a gentle smile to your daily cycle reminders.",
      label: "Playful 😜",
      sample: user.isPregnancyMode 
        ? "“Congrats mama! 🎉 A little bundle of joy is growing! Stock up on your favorite snacks 🍕✨”"
        : "“Psst... 🤫 Your period is just around the corner. Time to grab your favorite chocolate! 🍫”"
    },
    affirming: {
      desc: "Empowering, mindful, and centered. Cultivates body literacy, mindfulness, and calm awareness.",
      label: "Affirming 🧘‍♀️",
      sample: user.isPregnancyMode 
        ? "“We honor your body as it nurtures new life. You are grounded, capable, and supported. 🌾”"
        : "“Your body is transitioning naturally. Honor its timing and give yourself space to rest. 🌾”"
    },
    aesthetic: {
      desc: "Soft, poetic, and serene. Adorned with seasonal metaphors and calming reflections.",
      label: "Aesthetic 🩰",
      sample: user.isPregnancyMode 
        ? "“A beautiful new chapter begins... 🩰 Step softly into the gentle light of your pregnancy journey. 🌸”"
        : "“A time for rest and renewal. Step softly into your cycle's quiet winter season. 🩰”"
    }
  };

  const handleFeedbackSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedbackText.trim()) return;
    setFeedbackSubmitted(true);
    setTimeout(() => {
      setFeedbackSubmitted(false);
      setShowFeedbackModal(null);
      setFeedbackText('');
    }, 2000);
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-16">
      {/* Top Header */}
      <header className="flex items-center justify-between px-5 py-4 bg-white/60 backdrop-blur-xl border border-pink-100/60 shadow-[0_8px_32px_rgba(244,114,182,0.04)] rounded-3xl sticky top-2 z-40">
        <button 
          onClick={() => {
            if (activeSubTab === 'menu') {
              if (setActiveTab) setActiveTab('dashboard');
            } else {
              setActiveSubTab('menu');
            }
          }}
          className="p-2.5 rounded-2xl bg-white hover:bg-pink-50/40 text-pink-500 transition-all duration-200 border border-pink-100/50 cursor-pointer flex items-center justify-center active:scale-95 shadow-sm"
          title="Back"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        <h1 className="font-serif italic font-black text-xl text-stone-800">
          {activeSubTab === 'menu' ? 'Settings' : 
           activeSubTab === 'cycle' ? 'My Cycle' :
           activeSubTab === 'profile' ? 'My Profile' :
           activeSubTab === 'privacy_security' ? 'Privacy & Security' :
           activeSubTab === 'backup_sync' ? 'Backup & Sync' :
           activeSubTab === 'invite' ? 'Invite Friends' :
           activeSubTab === 'notifications' ? 'Reminders & Notifications' :
           activeSubTab === 'partner' ? 'Partner Mode' :
           activeSubTab === 'music_sanctuary' ? 'Music & Sanctuary' :
           activeSubTab === 'premium' ? 'Premium' :
           activeSubTab === 'help_support' ? 'Help & Support' :
           activeSubTab === 'account' ? 'Account' : 'Settings'}
        </h1>

        <button 
          className="p-2.5 rounded-2xl bg-white hover:bg-pink-50/40 text-pink-400 cursor-pointer flex items-center justify-center active:scale-95 border border-pink-50"
          onClick={() => setActiveSubTab('help_support')}
          title="Help & Support"
        >
          <HelpCircle className="w-5 h-5" />
        </button>
      </header>

      {/* ========================================================================= */}
      {/* 1. MAIN MENU SCREEN */}
      {/* ========================================================================= */}
      {activeSubTab === 'menu' ? (
        <div className="space-y-6 animate-fadeIn">
          {/* Header Greeting Banner */}
          <div className="bg-gradient-to-br from-pink-500/10 via-rose-500/5 to-amber-500/10 p-6 md:p-8 rounded-[2.5rem] border border-pink-100/60 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4 text-center md:text-left">
            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-widest text-pink-600">Your Wellness Space</span>
              <h2 className="text-2xl md:text-3xl font-serif text-stone-800 font-bold tracking-tight">
                Settings & Preferences
              </h2>
              <p className="text-xs text-stone-500">Manage your cycle settings, privacy, notifications, and backups</p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setActiveSubTab('profile')}
                className="px-4 py-2.5 bg-white border border-pink-100 text-pink-600 font-bold text-xs rounded-2xl shadow-sm hover:bg-pink-50/40 transition-all flex items-center gap-2"
              >
                <UserIcon size={14} />
                <span>{user.name ? user.name.split(' ')[0] : 'My Profile'}</span>
              </button>
            </div>
          </div>

          {/* Group 1: Cycle & Body */}
          <div className="space-y-2">
            <span className="text-[10px] font-bold uppercase tracking-widest text-pink-500 ml-4">Cycle & Body</span>
            <div className="bg-white/90 backdrop-blur-md rounded-[2rem] border border-pink-100/50 shadow-sm p-2 space-y-1 overflow-hidden">
              <button
                onClick={() => setActiveSubTab('cycle')}
                className="w-full flex items-center justify-between p-3.5 hover:bg-pink-50/30 active:scale-[0.99] transition-all rounded-2xl text-left group"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-2xl bg-rose-50 text-pink-500 flex items-center justify-center text-lg shadow-sm shrink-0 group-hover:scale-105 transition-transform">
                    🌸
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-stone-800 group-hover:text-pink-600 transition-colors">My Cycle</h4>
                    <p className="text-[11px] text-stone-400">Cycle length, period duration & pregnancy mode</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-pink-300 group-hover:text-pink-500 group-hover:translate-x-0.5 transition-all" />
              </button>
            </div>
          </div>

          {/* Group 2: Personal & Privacy */}
          <div className="space-y-2">
            <span className="text-[10px] font-bold uppercase tracking-widest text-pink-500 ml-4">Personal & Privacy</span>
            <div className="bg-white/90 backdrop-blur-md rounded-[2rem] border border-pink-100/50 shadow-sm p-2 space-y-1 overflow-hidden">
              {[
                {
                  id: 'profile' as const,
                  label: 'My Profile',
                  desc: 'Name, age, email & account password',
                  color: 'bg-teal-50 text-teal-600',
                  emoji: '👤',
                },
                {
                  id: 'privacy_security' as const,
                  label: 'Privacy & Security',
                  desc: 'Face ID, Security PIN, privacy policy & terms',
                  color: 'bg-indigo-50 text-indigo-500',
                  emoji: '🛡️',
                },
                {
                  id: 'backup_sync' as const,
                  label: 'Backup & Sync',
                  desc: 'Sync to cloud, download my data & upload backup',
                  color: 'bg-sky-50 text-sky-500',
                  emoji: '☁️',
                },
              ].map((item, idx) => (
                <button
                  key={item.id}
                  onClick={() => setActiveSubTab(item.id)}
                  className="w-full flex items-center justify-between p-3.5 hover:bg-pink-50/30 active:scale-[0.99] transition-all rounded-2xl text-left group border-b border-pink-50/30 last:border-0"
                >
                  <div className="flex items-center gap-3.5">
                    <div className={`w-10 h-10 rounded-2xl ${item.color} flex items-center justify-center text-lg shadow-sm shrink-0 group-hover:scale-105 transition-transform`}>
                      {item.emoji}
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-stone-800 group-hover:text-pink-600 transition-colors">{item.label}</h4>
                      <p className="text-[11px] text-stone-400">{item.desc}</p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-pink-300 group-hover:text-pink-500 group-hover:translate-x-0.5 transition-all" />
                </button>
              ))}
            </div>
          </div>

          {/* Group 3: Connected & Wellness */}
          <div className="space-y-2">
            <span className="text-[10px] font-bold uppercase tracking-widest text-pink-500 ml-4">Connected & Wellness</span>
            <div className="bg-white/90 backdrop-blur-md rounded-[2rem] border border-pink-100/50 shadow-sm p-2 space-y-1 overflow-hidden">
              {[
                {
                  id: 'notifications' as const,
                  label: 'Reminders & Notifications',
                  desc: 'Cycle reminders, ovulation alerts & friendly tone',
                  color: 'bg-purple-50 text-purple-500',
                  emoji: '🔔',
                },
                {
                  id: 'partner' as const,
                  label: 'Partner Mode',
                  desc: 'Share supportive cycle updates with your partner',
                  color: 'bg-rose-50 text-rose-500',
                  emoji: '🧸',
                },
                {
                  id: 'music_sanctuary' as const,
                  label: 'Music & Sanctuary',
                  desc: 'Relaxing ambient frequencies & sound volume',
                  color: 'bg-blue-50 text-blue-500',
                  emoji: '🎵',
                },
                {
                  id: 'invite' as const,
                  label: 'Invite Friends',
                  desc: 'Share Lumina with friends and loved ones',
                  color: 'bg-emerald-50 text-emerald-600',
                  emoji: '💌',
                },
              ].map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveSubTab(item.id)}
                  className="w-full flex items-center justify-between p-3.5 hover:bg-pink-50/30 active:scale-[0.99] transition-all rounded-2xl text-left group border-b border-pink-50/30 last:border-0"
                >
                  <div className="flex items-center gap-3.5">
                    <div className={`w-10 h-10 rounded-2xl ${item.color} flex items-center justify-center text-lg shadow-sm shrink-0 group-hover:scale-105 transition-transform`}>
                      {item.emoji}
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-stone-800 group-hover:text-pink-600 transition-colors">{item.label}</h4>
                      <p className="text-[11px] text-stone-400">{item.desc}</p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-pink-300 group-hover:text-pink-500 group-hover:translate-x-0.5 transition-all" />
                </button>
              ))}
            </div>
          </div>

          {/* Group 4: Support & Account */}
          <div className="space-y-2">
            <span className="text-[10px] font-bold uppercase tracking-widest text-pink-500 ml-4">Support & Account</span>
            <div className="bg-white/90 backdrop-blur-md rounded-[2rem] border border-pink-100/50 shadow-sm p-2 space-y-1 overflow-hidden">
              <button
                onClick={() => setActiveSubTab('help_support')}
                className="w-full flex items-center justify-between p-3.5 hover:bg-pink-50/30 active:scale-[0.99] transition-all rounded-2xl text-left group border-b border-pink-50/30"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-2xl bg-sky-50 text-sky-500 flex items-center justify-center text-lg shadow-sm shrink-0 group-hover:scale-105 transition-transform">
                    ❓
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-stone-800 group-hover:text-pink-600 transition-colors">Help & Support</h4>
                    <p className="text-[11px] text-stone-400">FAQs, contact support, bug reports & suggestions</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-pink-300 group-hover:text-pink-500 group-hover:translate-x-0.5 transition-all" />
              </button>

              <button
                onClick={() => setActiveSubTab('account')}
                className="w-full flex items-center justify-between p-3.5 hover:bg-pink-50/30 active:scale-[0.99] transition-all rounded-2xl text-left group"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-2xl bg-stone-100 text-stone-600 flex items-center justify-center text-lg shadow-sm shrink-0 group-hover:scale-105 transition-transform">
                    ⚙️
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-stone-800 group-hover:text-pink-600 transition-colors">Account</h4>
                    <p className="text-[11px] text-stone-400">Log out & account deletion</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-pink-300 group-hover:text-pink-500 group-hover:translate-x-0.5 transition-all" />
              </button>
            </div>
          </div>
        </div>

      /* ========================================================================= */
      /* 2. MY CYCLE SCREEN */
      /* ========================================================================= */
      ) : activeSubTab === 'cycle' ? (
        <div className="space-y-6 animate-fadeIn">
          {/* App Mode Switcher */}
          <div className="bg-gradient-to-r from-pink-500 via-rose-500 to-amber-400 p-[2px] rounded-[2.5rem] shadow-lg shadow-rose-100/40">
            <div className="bg-white p-6 rounded-[2.4rem] space-y-4">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{user.isPregnancyMode ? '🤰' : '🌸'}</span>
                    <h3 className="text-xl font-serif font-bold text-stone-800">
                      Tracking Mode
                    </h3>
                  </div>
                  <p className="text-xs text-gray-500 leading-relaxed">
                    Choose between standard period tracking and our dedicated pregnancy mode.
                  </p>
                </div>
                <div className="flex bg-rose-50 p-1.5 rounded-2xl border border-rose-100/60 shadow-inner self-stretch md:self-auto">
                  <button
                    onClick={() => {
                      if (user.isPregnancyMode) {
                        const updatedUser = {
                          ...user,
                          isPregnancyMode: false,
                          pregnancyStartDate: undefined,
                          notificationSettings: {
                            ...settings,
                            pregnancyEnabled: false,
                            partnerPregnancyEnabled: false,
                            types: {
                              ...settings.types,
                              periodStarting: true,
                              periodStarted: true,
                              periodEnding: true,
                              ovulation: true,
                              fertileWindow: true,
                              lutealPhase: true,
                              pregnancyRisk: true,
                            }
                          }
                        };
                        setUser(updatedUser);
                        localStorage.setItem('lumina_user', JSON.stringify(updatedUser));
                      }
                    }}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      !user.isPregnancyMode
                        ? 'bg-gradient-to-r from-pink-500 to-rose-400 text-white shadow-md shadow-pink-100'
                        : 'text-gray-400 hover:text-pink-500'
                    }`}
                  >
                    🌸 Period Tracker
                  </button>
                  <button
                    onClick={() => {
                      if (!user.isPregnancyMode) {
                        const updatedUser = {
                          ...user,
                          isPregnancyMode: true,
                          pregnancyStartDate: user.pregnancyStartDate || new Date(Date.now() - 84 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                          notificationSettings: {
                            ...settings,
                            pregnancyEnabled: true,
                            types: {
                              ...settings.types,
                              periodStarting: false,
                              periodStarted: false,
                              periodEnding: false,
                              ovulation: false,
                              fertileWindow: false,
                              lutealPhase: false,
                              pregnancyRisk: false,
                            }
                          }
                        };
                        setUser(updatedUser);
                        localStorage.setItem('lumina_user', JSON.stringify(updatedUser));
                      }
                    }}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      user.isPregnancyMode
                        ? 'bg-gradient-to-r from-amber-400 to-rose-500 text-white shadow-md shadow-amber-100'
                        : 'text-gray-400 hover:text-amber-500'
                    }`}
                  >
                    🤰 Pregnancy Mode
                  </button>
                </div>
              </div>

              {user.isPregnancyMode && (
                <div className="pt-3 border-t border-rose-100/50 flex flex-col md:flex-row gap-4 justify-between items-stretch md:items-center animate-fadeIn">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center text-xl shrink-0 shadow-sm animate-pulse">
                      🌱
                    </div>
                    <div className="space-y-0.5">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-amber-600">Pregnancy Progress</span>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs font-bold text-gray-800">
                          Week {user.pregnancyStartDate ? getPregnancyStats(user).weeks : 12}
                        </span>
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-300"></span>
                        <span className="text-[11px] font-medium text-gray-500">
                          Due: {user.pregnancyStartDate ? getPregnancyStats(user).dueDate : 'Dec 25, 2026'} ({user.pregnancyStartDate ? getPregnancyStats(user).weeksLeft : 28} weeks remaining)
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-1 shrink-0">
                    <label className="text-[10px] font-bold text-amber-700">Last Menstrual Period (LMP)</label>
                    <input
                      type="date"
                      value={user.pregnancyStartDate || new Date(Date.now() - 84 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}
                      onChange={(e) => {
                        const updatedUser = {
                          ...user,
                          pregnancyStartDate: e.target.value
                        };
                        setUser(updatedUser);
                        localStorage.setItem('lumina_user', JSON.stringify(updatedUser));
                      }}
                      className="bg-amber-50/60 px-3 py-2 rounded-xl outline-none font-bold text-xs text-amber-800 border border-amber-200/60 text-center shadow-inner"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Cycle Metrics Sliders */}
          <section className="bg-white p-6 md:p-8 rounded-[2.5rem] shadow-sm border border-pink-50 space-y-6">
            <h3 className="text-lg font-serif font-bold text-stone-800 flex items-center gap-2">
              <Calendar size={18} className="text-pink-500" />
              Cycle Settings
            </h3>
            <p className="text-xs text-stone-500 leading-relaxed">
              Keep your cycle metrics updated to ensure accurate predictions and gentle reminders.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Cycle Length */}
              <div className="bg-rose-50/40 p-5 rounded-3xl border border-rose-100/40 flex flex-col gap-2">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold text-pink-600 flex items-center gap-1.5">
                    <Layers size={14} />
                    Cycle Length
                  </label>
                  <span className="text-xs font-bold text-pink-700 bg-white px-3 py-1 rounded-xl shadow-sm border border-pink-100">
                    {user.cycleLength ?? 28} Days
                  </span>
                </div>
                <input 
                  type="range" 
                  min="21" 
                  max="42" 
                  value={user.cycleLength ?? 28} 
                  onChange={(e) => {
                    const val = parseInt(e.target.value) || 28;
                    const prevVal = user.cycleLength ?? 28;
                    const updatedUser = { 
                      ...user, 
                      previousCycleLength: user.previousCycleLength || (prevVal !== val ? prevVal : undefined),
                      cycleLength: val 
                    };
                    setUser(updatedUser);
                    localStorage.setItem('lumina_user', JSON.stringify(updatedUser));
                    syncUser(updatedUser);
                  }}
                  className="w-full accent-pink-500 h-1.5 bg-pink-100 rounded-lg cursor-pointer mt-2"
                />
                <span className="text-[11px] text-stone-400">Number of days from the start of one period to the next (average is 28 days)</span>
              </div>

              {/* Period Duration */}
              <div className="bg-rose-50/40 p-5 rounded-3xl border border-rose-100/40 flex flex-col gap-2">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold text-pink-600 flex items-center gap-1.5">
                    <Calendar size={14} />
                    Period Duration
                  </label>
                  <span className="text-xs font-bold text-pink-700 bg-white px-3 py-1 rounded-xl shadow-sm border border-pink-100">
                    {user.periodLength ?? 5} Days
                  </span>
                </div>
                <input 
                  type="range" 
                  min="3" 
                  max="10" 
                  value={user.periodLength ?? 5} 
                  onChange={(e) => {
                    const val = parseInt(e.target.value) || 5;
                    const updatedUser = { ...user, periodLength: val };
                    setUser(updatedUser);
                    localStorage.setItem('lumina_user', JSON.stringify(updatedUser));
                    syncUser(updatedUser);
                  }}
                  className="w-full accent-pink-500 h-1.5 bg-pink-100 rounded-lg cursor-pointer mt-2"
                />
                <span className="text-[11px] text-stone-400">Number of days bleeding typically lasts (average is 5 days)</span>
              </div>
            </div>

            {/* Last Period Start Date */}
            <div className="bg-rose-50/20 p-5 rounded-3xl border border-rose-100/40 flex flex-col gap-2">
              <label className="text-xs font-bold text-stone-700 flex items-center gap-1.5">
                <Calendar size={14} className="text-pink-500" />
                Last Period Start Date
              </label>
              <input 
                type="date"
                value={user.lastPeriodStart ? user.lastPeriodStart.split('T')[0] : new Date().toISOString().split('T')[0]}
                onChange={(e) => {
                  const selectedDate = e.target.value ? new Date(e.target.value).toISOString() : new Date().toISOString();
                  const updatedUser = { ...user, lastPeriodStart: selectedDate };
                  setUser(updatedUser);
                  localStorage.setItem('lumina_user', JSON.stringify(updatedUser));
                  syncUser(updatedUser);
                }}
                className="bg-white px-4 py-3 rounded-2xl outline-none font-semibold text-xs text-pink-700 border border-pink-100 shadow-sm w-full focus:border-pink-300 transition-colors cursor-pointer"
              />
              <span className="text-[11px] text-stone-400">Used as the reference date for your upcoming cycle and ovulation predictions</span>
            </div>

            {/* Restart Setup Questions */}
            <div className="bg-gradient-to-r from-pink-500/10 via-rose-500/5 to-indigo-500/10 p-5 rounded-3xl border border-pink-100/50 flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="space-y-1 text-left">
                <div className="flex items-center gap-2">
                  <span className="text-lg">📋</span>
                  <h4 className="text-xs font-bold text-pink-700">Update Baseline Questions</h4>
                </div>
                <p className="text-xs text-stone-500">
                  Want to re-answer the initial setup questions to update your baseline goals and wellness preferences?
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  const resetUser = { ...user, onboardingCompleted: false };
                  setUser(resetUser);
                  localStorage.setItem('lumina_user', JSON.stringify(resetUser));
                  syncUser(resetUser);
                  if (setActiveTab) setActiveTab('dashboard');
                }}
                className="px-5 py-3 bg-gradient-to-r from-pink-500 to-rose-500 text-white font-bold text-xs rounded-2xl shadow-md hover:opacity-90 active:scale-95 transition-all cursor-pointer shrink-0"
              >
                ✨ Update Setup Questions
              </button>
            </div>
          </section>
        </div>

      /* ========================================================================= */
      /* 3. MY PROFILE SCREEN */
      /* ========================================================================= */
      ) : activeSubTab === 'profile' ? (
        <div className="space-y-6 animate-fadeIn">
          <section className="bg-white p-6 md:p-8 rounded-[2.5rem] shadow-sm border border-pink-50 space-y-6">
            <div className="space-y-1">
              <h3 className="text-xl font-serif font-bold text-stone-800 flex items-center gap-2">
                <UserIcon size={20} className="text-pink-500" />
                My Profile
              </h3>
              <p className="text-xs text-stone-500">
                Manage your name, age, email address, and account password.
              </p>
            </div>

            {profileFeedback && (
              <div className={`p-4 rounded-2xl text-xs font-medium border flex items-center gap-2 ${
                profileFeedback.type === 'success' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-rose-50 text-rose-600 border-rose-100'
              }`}>
                {profileFeedback.type === 'success' ? <CheckCircle2 size={16} /> : <ShieldAlert size={16} />}
                <span>{profileFeedback.text}</span>
              </div>
            )}

            <form onSubmit={handleUpdateProfile} className="space-y-4">
              {/* Display Name */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-stone-700 flex items-center gap-1.5">
                  <UserCheck size={14} className="text-pink-500" />
                  Name / Nickname
                </label>
                <input 
                  type="text" 
                  value={profileName} 
                  onChange={(e) => setProfileName(e.target.value)}
                  className="bg-pink-50/30 px-4 py-3 rounded-2xl outline-none font-medium text-xs text-stone-800 border border-pink-100 placeholder-stone-400 shadow-inner w-full focus:border-pink-300 transition-colors"
                  placeholder="e.g. Sarah"
                  required
                />
              </div>

              {/* Age */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-stone-700 flex items-center gap-1.5">
                  <Calendar size={14} className="text-pink-500" />
                  Age
                </label>
                <input 
                  type="number" 
                  value={profileAge} 
                  onChange={(e) => setProfileAge(e.target.value)}
                  className="bg-pink-50/30 px-4 py-3 rounded-2xl outline-none font-medium text-xs text-stone-800 border border-pink-100 placeholder-stone-400 shadow-inner w-full focus:border-pink-300 transition-colors"
                  placeholder="e.g. 28"
                  min="1"
                  max="120"
                />
              </div>

              {/* Email Address */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-stone-700 flex items-center gap-1.5">
                  <span>✉️</span>
                  Email Address
                </label>
                <input 
                  type="email" 
                  value={profileEmail} 
                  onChange={(e) => setProfileEmail(e.target.value)}
                  className="bg-pink-50/30 px-4 py-3 rounded-2xl outline-none font-medium text-xs text-stone-800 border border-pink-100 placeholder-stone-400 shadow-inner w-full focus:border-pink-300 transition-colors"
                  placeholder="e.g. you@example.com"
                  required
                />
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-stone-700 flex items-center gap-1.5">
                  <Lock size={14} className="text-pink-500" />
                  Change Password
                </label>
                <input 
                  type="password" 
                  value={profilePassword} 
                  onChange={(e) => setProfilePassword(e.target.value)}
                  className="bg-pink-50/30 px-4 py-3 rounded-2xl outline-none font-medium text-xs text-stone-800 border border-pink-100 placeholder-stone-400 shadow-inner w-full focus:border-pink-300 transition-colors"
                  placeholder="••••••••"
                  minLength={6}
                />
                <span className="text-[11px] text-stone-400">Leave blank to keep your current password (minimum 6 characters)</span>
              </div>

              {/* Save Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={profileLoading}
                  className="w-full py-4 bg-gradient-to-r from-pink-500 to-rose-400 hover:opacity-95 active:scale-95 text-white font-bold rounded-2xl text-xs flex items-center justify-center gap-2 shadow-md cursor-pointer transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {profileLoading ? 'Saving Changes...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </section>
        </div>

      /* ========================================================================= */
      /* 4. PRIVACY & SECURITY SCREEN */
      /* ========================================================================= */
      ) : activeSubTab === 'privacy_security' ? (
        <div className="space-y-6 animate-fadeIn">
          {/* Biometrics & PIN Card */}
          <section className="bg-white p-6 md:p-8 rounded-[2.5rem] shadow-sm border border-pink-50 space-y-6">
            <div className="space-y-1">
              <h3 className="text-xl font-serif font-bold text-stone-800 flex items-center gap-2">
                <Lock size={20} className="text-pink-500" />
                Privacy & Security
              </h3>
              <p className="text-xs text-stone-500 leading-relaxed">
                Control your security preferences, app lock, and privacy protection settings.
              </p>
            </div>

            <div className="space-y-5">
              {/* Face ID / Fingerprint Toggle */}
              <div className="bg-rose-50/30 p-5 rounded-3xl border border-rose-100/40 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <p className="text-xs font-bold text-stone-800 flex items-center gap-1.5">
                      <Fingerprint size={15} className="text-pink-500" />
                      Face ID / Fingerprint Login
                    </p>
                    <p className="text-[11px] text-stone-400">Unlock Lumina quickly and securely using your device biometrics</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="sr-only peer"
                      checked={!!localStorage.getItem('lumina_biometric_user')}
                      onChange={(e) => {
                        if (e.target.checked) {
                          localStorage.setItem('lumina_biometric_user', JSON.stringify(user));
                          setUser({ ...user });
                        } else {
                          localStorage.removeItem('lumina_biometric_user');
                          setUser({ ...user });
                        }
                      }}
                    />
                    <div className="w-10 h-6 bg-pink-100 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gradient-to-r peer-checked:from-pink-500 peer-checked:to-rose-400"></div>
                  </label>
                </div>

                <div className="pt-2 border-t border-rose-100/40">
                  {localStorage.getItem('lumina_biometric_user') ? (
                    <span className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
                      <CheckCircle2 size={13} />
                      Enabled • Quick biometric unlock active
                    </span>
                  ) : (
                    <span className="text-[11px] text-stone-400 font-medium">
                      Disabled • Unlock with your password or PIN
                    </span>
                  )}
                </div>
              </div>

              {/* Set custom 4-digit PIN */}
              <div className="bg-rose-50/20 p-5 rounded-3xl border border-rose-100/40 flex flex-col gap-2">
                <label className="text-xs font-bold text-stone-700 flex items-center gap-1.5">
                  <Lock size={14} className="text-pink-500" />
                  Security PIN
                </label>
                <div className="relative">
                  <input 
                    type="text" 
                    maxLength={4}
                    value={user.diaryPin || '1234'} 
                    onChange={(e) => {
                      const val = e.target.value.replace(/[^0-9]/g, '').slice(0, 4) || '1234';
                      const updatedUser = { ...user, diaryPin: val };
                      setUser(updatedUser);
                      localStorage.setItem('lumina_user', JSON.stringify(updatedUser));
                      syncUser(updatedUser);
                      if (localStorage.getItem('lumina_biometric_user')) {
                        localStorage.setItem('lumina_biometric_user', JSON.stringify(updatedUser));
                      }
                    }}
                    className="bg-white px-4 py-3 rounded-2xl outline-none font-bold text-sm tracking-[0.4em] text-pink-700 border border-pink-100 shadow-sm w-full focus:border-pink-300 transition-colors text-center"
                    placeholder="1234"
                  />
                </div>
                <span className="text-[11px] text-stone-400">Use this 4-digit PIN to keep your personal journal notes and wellness entries private</span>
              </div>
            </div>
          </section>

          {/* Blocked Connections */}
          <section className="bg-white p-6 md:p-8 rounded-[2.5rem] shadow-sm border border-pink-50 space-y-4">
            <h3 className="text-lg font-serif font-bold text-stone-800 flex items-center gap-2">
              <ShieldAlert size={18} className="text-pink-500" />
              Blocked Connections
            </h3>
            <p className="text-xs text-stone-500 leading-relaxed">
              Manage partners you have blocked. Blocked partners cannot send you requests or view your cycle updates.
            </p>

            {user.blockedPartners && user.blockedPartners.length > 0 ? (
              <div className="space-y-2 pt-2">
                {user.blockedPartners.map((bp) => (
                  <div key={bp.id} className="flex items-center justify-between p-4 bg-rose-50/40 rounded-2xl border border-rose-100/50">
                    <div>
                      <p className="text-xs font-bold text-gray-800">{bp.name}</p>
                      {bp.dateBlocked && (
                        <p className="text-[10px] text-gray-400">Blocked on {new Date(bp.dateBlocked).toLocaleDateString()}</p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => setPartnerToUnblock({ id: bp.id, name: bp.name })}
                      className="px-4 py-2 bg-white border border-pink-200 text-pink-600 hover:bg-pink-50 text-xs font-bold rounded-xl transition-all cursor-pointer shadow-sm"
                    >
                      Unblock
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-5 bg-rose-50/20 rounded-2xl text-center space-y-1 border border-pink-50">
                <p className="text-xs font-semibold text-stone-600">You haven’t blocked anyone.</p>
                <p className="text-[11px] text-stone-400">Anyone you block will appear here, and you can unblock them at any time.</p>
              </div>
            )}
          </section>

          {/* Privacy Policy & Terms of Service */}
          <section className="bg-white p-6 md:p-8 rounded-[2.5rem] shadow-sm border border-pink-50 space-y-4">
            <h3 className="text-lg font-serif font-bold text-stone-800 flex items-center gap-2">
              <ShieldCheck size={18} className="text-pink-500" />
              Your Privacy & Terms
            </h3>
            <p className="text-xs text-stone-500 leading-relaxed">
              We believe your health data is deeply personal. Learn how Lumina protects your rights and privacy.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
              <div className="p-5 bg-rose-50/20 rounded-3xl border border-pink-100/40 space-y-2.5">
                <h4 className="text-xs font-bold text-stone-800 flex items-center gap-1.5">
                  <Shield size={14} className="text-pink-500" />
                  Privacy Policy
                </h4>
                <p className="text-xs text-stone-500 leading-relaxed">
                  We never sell or monetize your personal cycle or health records. You own 100% of your data.
                </p>
                <button
                  type="button"
                  onClick={() => setShowPrivacyModal(true)}
                  className="text-xs text-pink-600 font-bold hover:underline cursor-pointer flex items-center gap-1"
                >
                  Read Privacy Policy &rarr;
                </button>
              </div>

              <div className="p-5 bg-rose-50/20 rounded-3xl border border-pink-100/40 space-y-2.5">
                <h4 className="text-xs font-bold text-stone-800 flex items-center gap-1.5">
                  <FileText size={14} className="text-pink-500" />
                  Terms of Service
                </h4>
                <p className="text-xs text-stone-500 leading-relaxed">
                  Lumina provides supportive cycle estimations and wellness insights to help you understand your body.
                </p>
                <button
                  type="button"
                  onClick={() => setShowTermsModal(true)}
                  className="text-xs text-pink-600 font-bold hover:underline cursor-pointer flex items-center gap-1"
                >
                  Read Terms of Service &rarr;
                </button>
              </div>
            </div>
          </section>
        </div>

      /* ========================================================================= */
      /* 5. BACKUP & SYNC SCREEN */
      /* ========================================================================= */
      ) : activeSubTab === 'backup_sync' ? (
        <div className="space-y-6 animate-fadeIn">
          {/* Cloud Sync */}
          <section className="bg-white p-6 md:p-8 rounded-[2.5rem] shadow-sm border border-pink-50 space-y-6">
            <div className="space-y-1">
              <h3 className="text-xl font-serif font-bold text-stone-800 flex items-center gap-2">
                <UploadCloud size={20} className="text-pink-500" />
                Backup & Sync
              </h3>
              <p className="text-xs text-stone-500 leading-relaxed">
                Keep your health logs, notes, and cycle history safe and synced across your devices.
              </p>
            </div>

            {/* Cloud Sync Card */}
            <div className="p-6 bg-pink-50/30 rounded-3xl border border-pink-100/50 space-y-4">
              <div className="space-y-1">
                <h4 className="text-xs font-bold text-stone-800 flex items-center gap-1.5">
                  <span>☁️</span> Cloud Sync
                </h4>
                <p className="text-xs text-stone-500 leading-relaxed">
                  Your data syncs in the background, but you can also back up or restore manually anytime.
                </p>
              </div>

              {cloudFeedback && (
                <div className={`p-4 rounded-2xl text-xs font-medium border flex items-center gap-2 ${
                  cloudFeedback.type === 'success' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-rose-50 text-rose-600 border-rose-100'
                }`}>
                  {cloudFeedback.type === 'success' ? <CheckCircle2 size={16} /> : <ShieldAlert size={16} />}
                  <span>{cloudFeedback.text}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={handleCloudBackupNow}
                  className="py-3.5 px-4 bg-gradient-to-r from-pink-500 to-rose-400 text-white font-bold rounded-2xl text-xs flex items-center justify-center gap-2 shadow-sm hover:opacity-90 transition-all cursor-pointer"
                >
                  <UploadCloud size={14} />
                  <span>Sync Data Now</span>
                </button>
                <button
                  type="button"
                  onClick={handleCloudRestoreNow}
                  className="py-3.5 px-4 bg-white border border-pink-200 text-pink-600 font-bold rounded-2xl text-xs flex items-center justify-center gap-2 shadow-sm hover:bg-pink-50/50 transition-all cursor-pointer"
                >
                  <RefreshCw size={14} />
                  <span>Restore Data</span>
                </button>
              </div>
            </div>

            {/* Download My Data */}
            <div className="space-y-3 pt-2">
              <div className="space-y-1">
                <h4 className="text-xs font-bold text-stone-800 flex items-center gap-1.5">
                  <Download size={14} className="text-pink-500" />
                  Download My Data
                </h4>
                <p className="text-xs text-stone-500">
                  Save a private backup copy of your complete cycle history, symptoms, and journal notes.
                </p>
              </div>
              <button
                type="button"
                onClick={handleExportData}
                className="w-full py-4 bg-gradient-to-r from-pink-500 to-rose-400 hover:opacity-95 active:scale-95 text-white font-bold rounded-2xl text-xs flex items-center justify-center gap-2 shadow-md cursor-pointer transition-all"
              >
                <Download size={15} />
                <span>Download My Data</span>
              </button>
            </div>

            {/* Upload Backup File */}
            <div className="pt-4 space-y-3 border-t border-pink-50">
              <div className="space-y-1">
                <h4 className="text-xs font-bold text-stone-800 flex items-center gap-1.5">
                  <FileText size={14} className="text-pink-500" />
                  Upload Backup File
                </h4>
                <p className="text-xs text-stone-500">
                  Restore your cycle history and notes from a previously downloaded backup file.
                </p>
              </div>

              {localFeedback && (
                <div className={`p-4 rounded-2xl text-xs font-medium border flex items-center gap-2 ${
                  localFeedback.type === 'success' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-rose-50 text-rose-600 border-rose-100'
                }`}>
                  {localFeedback.type === 'success' ? <CheckCircle2 size={16} /> : <ShieldAlert size={16} />}
                  <span>{localFeedback.text}</span>
                </div>
              )}

              {/* Drag and drop upload zone */}
              <div 
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsImportDragging(true);
                }}
                onDragLeave={() => setIsImportDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsImportDragging(false);
                  const file = e.dataTransfer.files?.[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onload = (event) => {
                      if (typeof event.target?.result === 'string') {
                        parseAndImportJSON(event.target.result);
                      }
                    };
                    reader.readAsText(file);
                  }
                }}
                className={`relative border-2 border-dashed rounded-3xl p-6 text-center cursor-pointer transition-all duration-200 ${
                  isImportDragging 
                    ? 'border-pink-500 bg-pink-50/50 scale-[0.99]' 
                    : 'border-pink-200 bg-pink-50/10 hover:border-pink-300'
                }`}
              >
                <input 
                  type="file" 
                  accept=".json"
                  onChange={handleLocalFileSelect}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  id="import-json-picker-input"
                />
                <span className="text-3xl block mb-2">📁</span>
                <p className="text-xs font-bold text-pink-700">
                  Upload Backup File
                </p>
                <p className="text-[11px] text-stone-400 mt-1">
                  Drag & drop your backup file here, or tap to choose a file
                </p>
              </div>
            </div>
          </section>
        </div>

      /* ========================================================================= */
      /* 6. HELP & SUPPORT SCREEN */
      /* ========================================================================= */
      ) : activeSubTab === 'help_support' ? (
        <div className="space-y-6 animate-fadeIn">
          {/* Header Support Card */}
          <section className="bg-white p-6 md:p-8 rounded-[2.5rem] shadow-sm border border-pink-50 space-y-6">
            <div className="space-y-1">
              <h3 className="text-xl font-serif font-bold text-stone-800 flex items-center gap-2">
                <HelpCircle size={20} className="text-pink-500" />
                Help & Support
              </h3>
              <p className="text-xs text-stone-500 leading-relaxed">
                We're here to help you get the most out of Lumina. Reach out to our team or explore common questions.
              </p>
            </div>

            {/* Quick Action Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <button
                onClick={() => setShowFeedbackModal('support')}
                className="p-5 bg-pink-50/40 hover:bg-pink-50/80 rounded-3xl border border-pink-100/60 text-left space-y-2 transition-all group cursor-pointer"
              >
                <div className="w-10 h-10 rounded-2xl bg-pink-500 text-white flex items-center justify-center text-lg shadow-sm group-hover:scale-105 transition-transform">
                  💌
                </div>
                <h4 className="text-xs font-bold text-stone-800">Contact Support</h4>
                <p className="text-[11px] text-stone-500 leading-snug">Get in touch with our caring support team</p>
              </button>

              <button
                onClick={() => setShowFeedbackModal('bug')}
                className="p-5 bg-rose-50/40 hover:bg-rose-50/80 rounded-3xl border border-rose-100/60 text-left space-y-2 transition-all group cursor-pointer"
              >
                <div className="w-10 h-10 rounded-2xl bg-rose-500 text-white flex items-center justify-center text-lg shadow-sm group-hover:scale-105 transition-transform">
                  <Bug size={18} />
                </div>
                <h4 className="text-xs font-bold text-stone-800">Report a Bug</h4>
                <p className="text-[11px] text-stone-500 leading-snug">Let us know if something isn't working right</p>
              </button>

              <button
                onClick={() => setShowFeedbackModal('feature')}
                className="p-5 bg-amber-50/40 hover:bg-amber-50/80 rounded-3xl border border-amber-100/60 text-left space-y-2 transition-all group cursor-pointer"
              >
                <div className="w-10 h-10 rounded-2xl bg-amber-500 text-white flex items-center justify-center text-lg shadow-sm group-hover:scale-105 transition-transform">
                  <Lightbulb size={18} />
                </div>
                <h4 className="text-xs font-bold text-stone-800">Suggest a Feature</h4>
                <p className="text-[11px] text-stone-500 leading-snug">Share ideas to make Lumina even better</p>
              </button>
            </div>
          </section>

          {/* FAQs Section */}
          <section className="bg-white p-6 md:p-8 rounded-[2.5rem] shadow-sm border border-pink-50 space-y-4">
            <h3 className="text-lg font-serif font-bold text-stone-800 flex items-center gap-2">
              <MessageCircle size={18} className="text-pink-500" />
              Frequently Asked Questions
            </h3>

            <div className="space-y-3 pt-2">
              {[
                {
                  q: "How are my cycle and ovulation dates predicted?",
                  a: "Lumina calculates predictions based on your recorded cycle length, period start dates, and biological phase models. As you log more cycles over time, calculations naturally adjust to your unique rhythm."
                },
                {
                  q: "Is my personal health data private and secure?",
                  a: "Yes, completely. Your health logs, notes, and cycle records belong strictly to you. We never sell, rent, or share your data with advertisers or third parties."
                },
                {
                  q: "How does Partner Mode work?",
                  a: "Partner Mode lets you share selected cycle updates, fertile windows, or gentle reminders with your partner. You have complete control over what is shared and can disconnect at any time."
                },
                {
                  q: "Can I use Lumina during pregnancy?",
                  a: "Yes! In Settings → My Cycle, you can turn on Pregnancy Mode. This switches the app into gestational week tracking, trimester guidance, and gentle maternal wellness."
                },
                {
                  q: "How do I restore my data on a new device?",
                  a: "When you log into your Lumina account on a new device, your cloud data syncs automatically. You can also go to Settings → Backup & Sync and tap 'Restore Data' or upload a saved backup file."
                }
              ].map((faq, idx) => {
                const isOpen = expandedFaq === idx;
                return (
                  <div key={idx} className="bg-rose-50/20 rounded-2xl border border-pink-100/50 overflow-hidden transition-all">
                    <button
                      onClick={() => setExpandedFaq(isOpen ? null : idx)}
                      className="w-full p-4 flex items-center justify-between text-left cursor-pointer hover:bg-pink-50/30 transition-colors"
                    >
                      <span className="text-xs font-bold text-stone-800 pr-2">{faq.q}</span>
                      <ChevronRight className={`w-4 h-4 text-pink-400 transition-transform shrink-0 ${isOpen ? 'rotate-90' : ''}`} />
                    </button>
                    {isOpen && (
                      <div className="px-4 pb-4 pt-1 text-xs text-stone-600 leading-relaxed border-t border-pink-50/60 bg-white/60">
                        {faq.a}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>

          {/* App Info Footer */}
          <div className="text-center space-y-1.5 py-2">
            <p className="text-xs font-bold text-stone-700">Lumina Wellness</p>
            <p className="text-[11px] text-stone-400">Version 2.4.0 • Designed with love for women's health</p>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button 
                onClick={() => setShowPrivacyModal(true)} 
                className="text-[11px] text-pink-600 hover:underline font-medium cursor-pointer"
              >
                Privacy Policy
              </button>
              <span className="text-stone-300">•</span>
              <button 
                onClick={() => setShowTermsModal(true)} 
                className="text-[11px] text-pink-600 hover:underline font-medium cursor-pointer"
              >
                Terms of Service
              </button>
            </div>
          </div>
        </div>

      /* ========================================================================= */
      /* 7. ACCOUNT SCREEN (Log Out & Delete Account) */
      /* ========================================================================= */
      ) : activeSubTab === 'account' ? (
        <div className="space-y-6 animate-fadeIn">
          {/* Account Profile Card */}
          <section className="bg-white p-6 md:p-8 rounded-[2.5rem] shadow-sm border border-pink-50 space-y-6">
            <div className="space-y-1">
              <h3 className="text-xl font-serif font-bold text-stone-800 flex items-center gap-2">
                <UserIcon size={20} className="text-pink-500" />
                Account
              </h3>
              <p className="text-xs text-stone-500 leading-relaxed">
                Manage your active session and account settings.
              </p>
            </div>

            <div className="p-5 bg-rose-50/20 rounded-3xl border border-pink-100/40 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-stone-800">{user.name || 'Lumina Member'}</p>
                <p className="text-[11px] text-stone-500">{user.email}</p>
              </div>
              <button
                onClick={() => setActiveSubTab('profile')}
                className="px-4 py-2 bg-white border border-pink-200 text-pink-600 font-bold text-xs rounded-xl hover:bg-pink-50 transition-all cursor-pointer shadow-sm"
              >
                Edit Profile
              </button>
            </div>

            {/* Log Out */}
            {onLogout && (
              <div className="pt-2 space-y-3">
                <div className="space-y-1">
                  <h4 className="text-xs font-bold text-stone-800 flex items-center gap-1.5">
                    <LogOut size={14} className="text-pink-500" />
                    Log Out
                  </h4>
                  <p className="text-xs text-stone-500">
                    Safely log out of Lumina on this device. Your data will remain safe and waiting for your next login.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onLogout}
                  className="w-full py-3.5 bg-stone-100 hover:bg-stone-200 active:scale-95 text-stone-700 font-bold rounded-2xl text-xs flex items-center justify-center gap-2 cursor-pointer transition-all"
                >
                  <LogOut size={14} />
                  <span>Log Out</span>
                </button>
              </div>
            )}
          </section>

          {/* Delete Account (Danger Zone) */}
          <section className="bg-rose-50/70 p-6 rounded-[2.5rem] border border-rose-200/80 space-y-4">
            <div className="flex items-center gap-2 text-rose-700">
              <ShieldAlert className="w-5 h-5 text-rose-600" />
              <h3 className="text-base font-serif font-bold">Delete Account</h3>
            </div>
            <p className="text-xs text-rose-800 leading-relaxed">
              Permanently remove your Lumina account and all associated personal cycle, journal, and partner connection records.
            </p>
            <button
              type="button"
              onClick={() => {
                setDeleteAccountInput('');
                setShowDeleteAccountModal(true);
              }}
              className="w-full py-3.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-2xl text-xs transition-all cursor-pointer shadow-md shadow-rose-200"
            >
              🗑️ Delete Account
            </button>
          </section>
        </div>

      /* ========================================================================= */
      /* 8. REMINDERS & NOTIFICATIONS SCREEN */
      /* ========================================================================= */
      ) : activeSubTab === 'notifications' ? (
        <div className="space-y-6 animate-fadeIn">
          {/* Master Notification & Companion Controls */}
          <div className="bg-white p-6 md:p-8 rounded-[2.5rem] shadow-sm border border-pink-50 space-y-5">
            <div className="space-y-1">
              <h3 className="text-lg font-serif font-bold text-stone-800 flex items-center gap-2">
                <Bell size={20} className="text-pink-500" />
                Notification & Companion Preferences
              </h3>
              <p className="text-xs text-stone-500 leading-relaxed">
                Customize your daily greetings, cycle alerts, mindful affirmations, and shared partner updates.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 pt-1">
              {/* 1. Voice Greetings ON/OFF */}
              <div className="p-4 bg-gradient-to-br from-pink-50/50 to-rose-50/30 rounded-2xl border border-pink-100/60 flex items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <p className="text-xs font-bold text-stone-800 flex items-center gap-1.5">
                    <Volume2 size={15} className="text-pink-500" />
                    Voice Greetings
                  </p>
                  <p className="text-[11px] text-stone-400">Time-of-day audio greeting on app launch</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input 
                    type="checkbox" 
                    className="sr-only peer"
                    checked={Boolean(settings.welcomeVoiceEnabled ?? user.welcomeVoiceEnabled ?? true)}
                    onChange={(e) => {
                      const val = e.target.checked;
                      updateSettings({ welcomeVoiceEnabled: val, voiceGreetingsEnabled: val });
                      const updatedUser = { ...user, welcomeVoiceEnabled: val, voiceGreetingsEnabled: val };
                      setUser(updatedUser);
                      localStorage.setItem('lumina_user', JSON.stringify(updatedUser));
                      syncUser(updatedUser);
                    }}
                  />
                  <div className="w-11 h-6 bg-pink-100 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gradient-to-r peer-checked:from-pink-500 peer-checked:to-rose-400"></div>
                </label>
              </div>

              {/* 2. Daily Affirmations ON/OFF */}
              <div className="p-4 bg-gradient-to-br from-amber-50/40 to-pink-50/30 rounded-2xl border border-pink-100/60 flex items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <p className="text-xs font-bold text-stone-800 flex items-center gap-1.5">
                    <Sparkles size={15} className="text-amber-500" />
                    Daily Affirmations
                  </p>
                  <p className="text-[11px] text-stone-400">Poetic, empowering mindset nudges</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input 
                    type="checkbox" 
                    className="sr-only peer"
                    checked={Boolean(settings.dailyAffirmationsEnabled ?? user.dailyAffirmationsEnabled ?? true)}
                    onChange={(e) => {
                      const val = e.target.checked;
                      updateSettings({ dailyAffirmationsEnabled: val });
                      const updatedUser = { ...user, dailyAffirmationsEnabled: val };
                      setUser(updatedUser);
                      localStorage.setItem('lumina_user', JSON.stringify(updatedUser));
                      syncUser(updatedUser);
                    }}
                  />
                  <div className="w-11 h-6 bg-amber-100 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gradient-to-r peer-checked:from-amber-500 peer-checked:to-rose-400"></div>
                </label>
              </div>

              {/* 3. Partner Notifications ON/OFF */}
              <div className="p-4 bg-gradient-to-br from-purple-50/50 to-pink-50/30 rounded-2xl border border-purple-100/60 flex items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <p className="text-xs font-bold text-stone-800 flex items-center gap-1.5">
                    <Heart size={15} className="text-purple-500" />
                    Partner Notifications
                  </p>
                  <p className="text-[11px] text-stone-400">Sync cycle & care alerts to linked partner</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input 
                    type="checkbox" 
                    className="sr-only peer"
                    checked={Boolean(settings.partnerNotificationsEnabled ?? true)}
                    onChange={(e) => {
                      const val = e.target.checked;
                      updateSettings({ partnerNotificationsEnabled: val });
                    }}
                  />
                  <div className="w-11 h-6 bg-purple-100 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gradient-to-r peer-checked:from-purple-500 peer-checked:to-indigo-500"></div>
                </label>
              </div>
            </div>
          </div>

          {/* Welcome Voice Greeting Card */}
          <div className="bg-white p-6 md:p-8 rounded-[2.5rem] shadow-sm border border-pink-50 space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-pink-100 text-pink-500 flex items-center justify-center">
                    <Volume2 className="w-4 h-4" />
                  </div>
                  <h4 className="text-lg font-serif font-bold text-stone-800">
                    Avatar Companion Greetings
                  </h4>
                </div>
                <p className="text-xs text-stone-500 leading-relaxed">
                  Your selected wellness companion greets you with time-aware and dynamic health reflections every time you open Lumina.
                </p>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <span className={`text-xs font-bold px-3 py-1 rounded-full ${
                  Boolean(settings.welcomeVoiceEnabled ?? user.welcomeVoiceEnabled ?? true)
                    ? 'bg-pink-100 text-pink-700'
                    : 'bg-stone-100 text-stone-500'
                }`}>
                  {Boolean(settings.welcomeVoiceEnabled ?? user.welcomeVoiceEnabled ?? true) ? 'Voice Active 🌸' : 'Muted (Banner Only)'}
                </span>
              </div>
            </div>

            {Boolean(settings.welcomeVoiceEnabled ?? user.welcomeVoiceEnabled ?? true) ? (
              <div className="space-y-4 animate-fadeIn">
                {/* Current Live Greeting Preview based on Time */}
                <div className="p-4 bg-gradient-to-br from-pink-50/60 to-rose-50/40 rounded-2xl border border-pink-100/60 space-y-2">
                  <div className="flex items-center justify-between text-[11px] font-bold text-pink-600 flex-wrap gap-1">
                    <span className="flex items-center gap-1.5 uppercase tracking-wider text-[10px]">
                      <span>{currentPreviewGreeting.emoji}</span>
                      <span>Current Schedule: {currentPreviewGreeting.timeLabel}</span>
                    </span>
                    <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-pink-100/70 text-pink-700 font-semibold">
                      Personalized for {userFirstName} 🌸
                    </span>
                  </div>
                  <p className="text-xs font-serif italic text-stone-700 leading-relaxed bg-white/80 p-3 rounded-xl border border-pink-100/40">
                    “{currentPreviewGreeting.displayText}”
                  </p>
                </div>

                {/* Time-Based Schedule Table */}
                <div className="space-y-2 pt-1">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-pink-600 block">
                    Personalized Time-of-Day Schedule
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div className="p-3.5 bg-pink-50/20 rounded-2xl border border-pink-100/40 space-y-1">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-stone-800">
                        <span>🌞</span>
                        <span>Morning (5:00 AM – 11:59 AM)</span>
                      </div>
                      <p className="text-[11px] text-stone-500 leading-snug">
                        “Good morning, {userFirstName} 🌞. I hope you slept well.”
                      </p>
                    </div>

                    <div className="p-3.5 bg-pink-50/20 rounded-2xl border border-pink-100/40 space-y-1">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-stone-800">
                        <span>🌸</span>
                        <span>Afternoon (12:00 PM – 4:59 PM)</span>
                      </div>
                      <p className="text-[11px] text-stone-500 leading-snug">
                        “Good afternoon, {userFirstName} 🌸. How are you feeling today?”
                      </p>
                    </div>

                    <div className="p-3.5 bg-pink-50/20 rounded-2xl border border-pink-100/40 space-y-1">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-stone-800">
                        <span>✨</span>
                        <span>Evening (5:00 PM – 8:59 PM)</span>
                      </div>
                      <p className="text-[11px] text-stone-500 leading-snug">
                        “Good evening, {userFirstName} ✨. Let’s take a moment to check in with your wellness journey.”
                      </p>
                    </div>

                    <div className="p-3.5 bg-pink-50/20 rounded-2xl border border-pink-100/40 space-y-1">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-stone-800">
                        <span>🌙</span>
                        <span>Night (9:00 PM – 4:59 AM)</span>
                      </div>
                      <p className="text-[11px] text-stone-500 leading-snug">
                        “Good night, {userFirstName} 🌙. Remember to take care of yourself and get enough rest.”
                      </p>
                    </div>
                  </div>
                </div>

                {/* Preview Controls */}
                <div className="pt-2 flex flex-col sm:flex-row gap-2.5">
                  <button
                    type="button"
                    onClick={() => handleTestWelcomeVoice()}
                    disabled={isPlayingVoiceTest}
                    className="flex-1 py-3.5 bg-gradient-to-r from-pink-500 to-rose-400 text-white font-bold text-xs rounded-2xl shadow-md hover:opacity-90 active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    <Volume2 size={15} className={isPlayingVoiceTest ? 'animate-bounce' : ''} />
                    <span>{isPlayingVoiceTest ? 'Playing Voice Greeting...' : '🔊 Test Welcome Voice Greeting'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleRotatePreview()}
                    className="px-4 py-3.5 bg-pink-50 hover:bg-pink-100 text-pink-700 font-bold text-xs rounded-2xl border border-pink-200 transition-all flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
                    title="Rotate greeting variation"
                  >
                    <Sparkles size={14} className="text-pink-500" />
                    <span>Rotate Message</span>
                  </button>
                </div>

                <p className="text-[10px] text-stone-400 text-center">
                  💡 Plays automatically on app launch. The test button is for auditioning voices and is not required for greetings to play.
                </p>
              </div>
            ) : (
              <div className="p-4 bg-stone-50 rounded-2xl text-center space-y-1 border border-stone-100">
                <p className="text-xs font-semibold text-stone-600">Voice Greeting Audio is Off</p>
                <p className="text-[11px] text-stone-400">A visual text greeting card will be shown on screen whenever you open Lumina.</p>
              </div>
            )}
          </div>

          {settings.enabled && (
            <div className="space-y-6">
              {/* Notification Tone Selection */}
              <div className="bg-white p-6 md:p-8 rounded-[2.5rem] shadow-sm border border-pink-50 space-y-6">
                <div className="space-y-1">
                  <h4 className="text-lg font-serif font-bold text-stone-800 flex items-center gap-2">
                    <Sparkles size={18} className="text-pink-500" />
                    Reminder Tone & Personality
                  </h4>
                  <p className="text-xs text-stone-500">
                    Choose how notifications sound. Make your cycle companion feel supportive, playful, affirming, or poetic.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                  {(Object.keys(tonePreviews) as Array<keyof typeof tonePreviews>).map((key) => {
                    const info = tonePreviews[key];
                    const isSelected = settings.toneStyle === key;
                    return (
                      <button
                        key={key}
                        onClick={() => updateSettings({ toneStyle: key })}
                        className={`text-left p-5 rounded-3xl border-2 transition-all flex flex-col gap-2 group relative overflow-hidden cursor-pointer ${
                          isSelected 
                            ? 'bg-gradient-to-br from-pink-50/50 to-rose-50/50 border-pink-300 shadow-md shadow-pink-100/50' 
                            : 'bg-white border-pink-50 hover:border-pink-200'
                        }`}
                      >
                        {isSelected && (
                          <span className="absolute top-3 right-3 w-5 h-5 bg-pink-500 rounded-full flex items-center justify-center text-white scale-110">
                            <Check size={10} strokeWidth={4} />
                          </span>
                        )}
                        <span className="text-xs font-bold text-pink-600">
                          {info.label}
                        </span>
                        <p className="text-[11px] text-stone-400 font-medium leading-relaxed">
                          {info.desc}
                        </p>
                        <div className="bg-white/90 p-2.5 rounded-2xl border border-pink-100/40 text-[10px] font-medium text-pink-600 italic leading-snug mt-1">
                          {info.sample}
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Instant trigger for preview */}
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => triggerSimulation('periodStarting', false)}
                    className="w-full py-3.5 bg-gradient-to-r from-pink-500 to-rose-400 text-white font-bold text-xs rounded-2xl shadow-md hover:opacity-90 active:scale-[0.99] transition-all flex items-center justify-center gap-2 group cursor-pointer"
                  >
                    <Volume2 size={15} />
                    <span>Preview Selected Reminder Tone</span>
                  </button>
                </div>
              </div>

              {/* Cycle Alert Toggles */}
              <div className="bg-white p-6 md:p-8 rounded-[2.5rem] shadow-sm border border-pink-50 space-y-5">
                <div className="space-y-1">
                  <h4 className="text-lg font-serif font-bold text-stone-800 flex items-center gap-2">
                    <Bell size={18} className="text-pink-500" />
                    Cycle & Ovulation Alerts
                  </h4>
                  <p className="text-xs text-stone-500">
                    Choose which notifications you would like to receive.
                  </p>
                </div>

                <div className="space-y-3">
                  {[
                    { key: 'periodStarting' as const, label: 'Period Approaching', desc: 'Gentle heads up 2 days before your expected start' },
                    { key: 'periodStarted' as const, label: 'Period Day 1 Check-In', desc: 'A warm greeting on the expected start of your period' },
                    { key: 'fertileWindow' as const, label: 'Fertile Window Begins', desc: 'Notifies you when your estimated fertile window starts' },
                    { key: 'ovulation' as const, label: 'Peak Ovulation Day', desc: 'Notification on your estimated peak ovulation day' },
                    { key: 'periodEnding' as const, label: 'Period Ending & Transition', desc: 'Gentle check-in as your bleeding wraps up' },
                    { key: 'lutealPhase' as const, label: 'Luteal Phase & Self-Care', desc: 'Mindful reminders for rest and hydration before your next cycle' },
                  ].map((item) => (
                    <div key={item.key} className="flex items-center justify-between p-3.5 bg-rose-50/25 rounded-2xl border border-rose-100/30">
                      <div className="space-y-0.5">
                        <p className="text-xs font-bold text-stone-800">{item.label}</p>
                        <p className="text-[11px] text-stone-400">{item.desc}</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input 
                          type="checkbox" 
                          className="sr-only peer"
                          checked={settings.types[item.key]}
                          onChange={(e) => updateTypes(item.key, e.target.checked)}
                        />
                        <div className="w-9 h-5 bg-pink-100 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-gradient-to-r peer-checked:from-pink-500 peer-checked:to-rose-400"></div>
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Choose which notifications you would like your partner to receive */}
              <div className="bg-white p-6 md:p-8 rounded-[2.5rem] shadow-sm border border-purple-100/80 space-y-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-purple-100/70 text-purple-600 flex items-center justify-center text-base">
                        <Heart className="w-4 h-4 fill-purple-400 text-purple-500" />
                      </div>
                      <h4 className="text-lg font-serif font-bold text-stone-800">
                        Choose which notifications you would like your partner to receive
                      </h4>
                    </div>
                    <p className="text-xs text-stone-500 leading-relaxed">
                      Select which cycle updates, fertile windows, and gentle care nudges are shared with your partner.
                    </p>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        className="sr-only peer"
                        checked={Boolean(settings.partnerNotificationsEnabled)}
                        onChange={(e) => updateSettings({ partnerNotificationsEnabled: e.target.checked })}
                      />
                      <div className="w-12 h-6 bg-purple-100 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gradient-to-r peer-checked:from-purple-500 peer-checked:to-indigo-500"></div>
                    </label>
                  </div>
                </div>

                {/* Partner status banner */}
                <div className="p-3.5 bg-purple-50/40 rounded-2xl border border-purple-100/60 flex items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2 text-purple-900 font-medium">
                    <Users className="w-4 h-4 text-purple-500" />
                    <span>
                      {user.partnerName || user.isPartnerLinked ? (
                        <>Connected Partner: <strong className="font-bold text-purple-700">{user.partnerName || 'Partner'}</strong></>
                      ) : (
                        <>No partner linked yet — preferences will automatically apply once linked in Partner Mode.</>
                      )}
                    </span>
                  </div>
                  {(!user.partnerName && !user.isPartnerLinked) && (
                    <button
                      type="button"
                      onClick={() => setActiveSubTab('partner')}
                      className="text-[11px] font-bold text-purple-600 hover:text-purple-800 underline shrink-0 cursor-pointer"
                    >
                      Connect &rarr;
                    </button>
                  )}
                </div>

                {settings.partnerNotificationsEnabled ? (
                  <div className="space-y-4 animate-fadeIn">
                    <div className="space-y-2.5">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-purple-600 block">Cycle & Fertility Alerts</span>
                      <div className="space-y-2.5">
                        {[
                          { 
                            key: 'periodStarting' as const, 
                            label: 'Period Approaching', 
                            desc: 'Gentle heads up 2 days before your period so your partner can prepare extra comfort and care' 
                          },
                          { 
                            key: 'periodStarted' as const, 
                            label: 'Period Day 1 Check-In', 
                            desc: 'Notifies your partner when your period begins' 
                          },
                          { 
                            key: 'fertileWindow' as const, 
                            label: 'Fertile Window Begins', 
                            desc: 'Alerts your partner when your estimated fertile window starts' 
                          },
                          { 
                            key: 'ovulation' as const, 
                            label: 'Peak Ovulation Day', 
                            desc: 'Shared reminder on your estimated peak ovulation day' 
                          },
                          { 
                            key: 'periodEnding' as const, 
                            label: 'Period Ending', 
                            desc: 'Updates your partner as your bleeding concludes' 
                          },
                          { 
                            key: 'pregnancyRisk' as const, 
                            label: 'Luteal Phase & Wellness Nudges', 
                            desc: 'Supportive suggestions for rest, comfort foods, and hydration during the luteal phase' 
                          },
                        ].map((item) => (
                          <div key={item.key} className="flex items-center justify-between p-3.5 bg-purple-50/20 hover:bg-purple-50/40 rounded-2xl border border-purple-100/50 transition-all">
                            <div className="space-y-0.5 pr-3">
                              <p className="text-xs font-bold text-stone-800">{item.label}</p>
                              <p className="text-[11px] text-stone-400 leading-snug">{item.desc}</p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer shrink-0">
                              <input 
                                type="checkbox" 
                                className="sr-only peer"
                                checked={Boolean(settings.partnerReceiveTypes?.[item.key] ?? true)}
                                onChange={(e) => updatePartnerReceiveTypes(item.key, e.target.checked)}
                              />
                              <div className="w-9 h-5 bg-purple-100 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-gradient-to-r peer-checked:from-purple-500 peer-checked:to-indigo-500"></div>
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Mood & Support preferences */}
                    <div className="space-y-2.5 pt-2">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-purple-600 block">Support & Mood Updates</span>
                      <div className="space-y-2.5">
                        {[
                          {
                            key: 'moodUpdates',
                            label: 'Mood & Energy Updates',
                            desc: 'Notify partner when you share a mood check-in or low energy state so they can support you'
                          },
                          {
                            key: 'supportReminders',
                            label: 'Comfort & Care Reminders',
                            desc: 'Gentle ideas for your partner to bring warm tea, snacks, or run a soothing bath'
                          },
                          {
                            key: 'educationalInsights',
                            label: 'Cycle & Educational Tips',
                            desc: 'Bite-sized cycle facts and empathy tips to help your partner better understand your rhythm'
                          }
                        ].map((item) => (
                          <div key={item.key} className="flex items-center justify-between p-3.5 bg-purple-50/20 hover:bg-purple-50/40 rounded-2xl border border-purple-100/50 transition-all">
                            <div className="space-y-0.5 pr-3">
                              <p className="text-xs font-bold text-stone-800">{item.label}</p>
                              <p className="text-[11px] text-stone-400 leading-snug">{item.desc}</p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer shrink-0">
                              <input 
                                type="checkbox" 
                                className="sr-only peer"
                                checked={Boolean(user.partnerNotificationPreferences?.[item.key as keyof typeof user.partnerNotificationPreferences] ?? true)}
                                onChange={(e) => updatePartnerPref(item.key, e.target.checked)}
                              />
                              <div className="w-9 h-5 bg-purple-100 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-gradient-to-r peer-checked:from-purple-500 peer-checked:to-indigo-500"></div>
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Pregnancy Companion Alerts for Partner if in pregnancy mode */}
                    {user.isPregnancyMode && (
                      <div className="space-y-3 pt-3 border-t border-purple-100/60">
                        <div className="flex items-center justify-between">
                          <div className="space-y-0.5">
                            <span className="text-[10px] font-bold uppercase tracking-widest text-amber-600 flex items-center gap-1">
                              <Baby className="w-3.5 h-3.5" />
                              Pregnancy Companion Alerts
                            </span>
                            <p className="text-[11px] text-stone-400">Share gestational progress and doctor check-ins</p>
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input 
                              type="checkbox" 
                              className="sr-only peer"
                              checked={Boolean(settings.partnerPregnancyEnabled)}
                              onChange={(e) => updateSettings({ partnerPregnancyEnabled: e.target.checked })}
                            />
                            <div className="w-9 h-5 bg-amber-100 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-gradient-to-r peer-checked:from-amber-400 peer-checked:to-rose-400"></div>
                          </label>
                        </div>

                        {settings.partnerPregnancyEnabled && (
                          <div className="space-y-2 pl-2">
                            {[
                              { key: 'weeklyBabyDev' as const, label: 'Weekly Baby Growth & Milestones' },
                              { key: 'appointment' as const, label: 'Prenatal Doctor & Ultrasound Reminders' },
                              { key: 'rest' as const, label: 'Rest & Hydration Support Nudges' },
                              { key: 'dueDateCountdown' as const, label: 'Due Date Countdown & Trimester Updates' },
                              { key: 'laborNear' as const, label: 'Labor & Hospital Bag Readiness' },
                            ].map((pItem) => (
                              <div key={pItem.key} className="flex items-center justify-between p-3 bg-amber-50/20 rounded-xl border border-amber-100/40">
                                <span className="text-xs font-semibold text-stone-700">{pItem.label}</span>
                                <input 
                                  type="checkbox"
                                  checked={Boolean(settings.partnerPregnancyReceiveTypes?.[pItem.key] ?? true)}
                                  onChange={(e) => updatePartnerPregnancyReceiveTypes(pItem.key, e.target.checked)}
                                  className="w-4 h-4 text-amber-500 rounded border-amber-200 accent-amber-500 cursor-pointer"
                                />
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Preview Partner Notification Button */}
                    <div className="pt-2">
                      <button
                        type="button"
                        onClick={() => triggerSimulation('periodStarting', true)}
                        className="w-full py-3.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold text-xs rounded-2xl shadow-md hover:opacity-90 active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <HeartHandshake size={15} />
                        <span>Preview What Partner Sees 💕</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 bg-stone-50 rounded-2xl text-center space-y-1 border border-stone-100">
                    <p className="text-xs font-semibold text-stone-600">Partner notifications are paused</p>
                    <p className="text-[11px] text-stone-400">Toggle the switch above on to choose which reminders your partner receives.</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

      /* ========================================================================= */
      /* 9. PARTNER MODE */
      /* ========================================================================= */
      ) : activeSubTab === 'partner' ? (
        <div className="space-y-6 animate-fadeIn">
          <PartnerMode user={user} reminders={reminders} setReminders={setReminders} setUser={setUser} partnerUser={partnerUser} onLogout={onLogout} />
        </div>

      /* ========================================================================= */
      /* 10. MUSIC & SANCTUARY */
      /* ========================================================================= */
      ) : activeSubTab === 'music_sanctuary' ? (
        <div className="space-y-6 animate-fadeIn">
          <section className="bg-white p-6 md:p-8 rounded-[2.5rem] shadow-sm border border-pink-50 space-y-6">
            <div className="space-y-1">
              <h3 className="text-xl font-serif font-bold text-stone-800 flex items-center gap-2">
                <Volume2 size={20} className="text-pink-500" />
                Music & Sanctuary
              </h3>
              <p className="text-xs text-stone-500 leading-relaxed">
                Immerse yourself in calming soundscapes designed to ease menstrual discomfort, calm the mind, and support restful sleep.
              </p>
            </div>

            <div className="space-y-5">
              {/* Playback Control HUD */}
              <div className="bg-gradient-to-r from-pink-500/10 to-rose-500/5 p-6 rounded-3xl border border-pink-100/40 flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="space-y-1 text-center md:text-left">
                  <h4 className="text-xs font-bold text-stone-800">
                    Ambient Audio Player
                  </h4>
                  <p className="text-[11px] text-stone-500">
                    {isMusicPlaying ? "🎶 Playing soft restorative frequencies" : "🔇 Soundscape is currently paused"}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={toggleMusicActive}
                    className={`py-2 px-4 rounded-xl text-xs font-bold border cursor-pointer transition-all ${
                      isMusicActive 
                        ? 'bg-pink-500 text-white border-pink-400 shadow-md' 
                        : 'bg-white text-pink-500 border-pink-200 hover:bg-pink-50/40'
                    }`}
                  >
                    {isMusicActive ? "Sound Enabled 🔊" : "Muted 🔇"}
                  </button>
                  <button
                    type="button"
                    onClick={toggleMusic}
                    className="py-2.5 px-5 bg-gradient-to-r from-pink-500 to-rose-400 hover:opacity-90 text-white font-bold rounded-xl text-xs shadow-md cursor-pointer transition-all"
                  >
                    {isMusicPlaying ? "Pause ⏸" : "Play Ambient ▶"}
                  </button>
                </div>
              </div>

              {/* Volume Slider */}
              <div className="bg-rose-50/30 p-5 rounded-3xl border border-rose-100/30 flex flex-col gap-2">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold text-pink-600 flex items-center gap-1.5">
                    <span>🔊</span> Volume
                  </label>
                  <span className="text-xs font-bold text-pink-700">{Math.round(volume * 100)}%</span>
                </div>
                <input 
                  type="range" 
                  min="0" 
                  max="1" 
                  step="0.05"
                  value={volume} 
                  onChange={(e) => setVolume(parseFloat(e.target.value))}
                  className="w-full accent-pink-500 h-1.5 bg-pink-100 rounded-lg cursor-pointer mt-1"
                />
              </div>

              {/* Meditation Sounds Selection */}
              <div className="bg-rose-50/30 p-5 rounded-3xl border border-rose-100/30 flex flex-col gap-3">
                <label className="text-xs font-bold text-pink-600 flex items-center gap-1.5">
                  <span>🧘</span> Calming Frequencies
                </label>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {[
                    { id: 'rain', label: '🌧️ Forest Rain', active: true },
                    { id: 'bowls', label: '🥣 Zen Tibetan Bowls', active: false },
                    { id: 'solfeggio', label: '🧬 Solfeggio 528Hz', active: false },
                    { id: 'ocean', label: '🌊 Soft Ocean Waves', active: false },
                  ].map((sound) => (
                    <button
                      key={sound.id}
                      type="button"
                      onClick={() => alert(`Activated ${sound.label}!`)}
                      className="p-3 rounded-xl border border-pink-100 bg-white text-left font-bold text-stone-700 hover:bg-pink-50/50 transition-all flex items-center justify-between text-xs cursor-pointer"
                    >
                      <span>{sound.label}</span>
                      <span className="w-2 h-2 rounded-full bg-pink-500"></span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </section>
        </div>

      /* ========================================================================= */
      /* 11. INVITE FRIENDS */
      /* ========================================================================= */
      ) : activeSubTab === 'invite' ? (
        <div className="space-y-6 animate-fadeIn">
          <CommunityInvite user={user} />
        </div>

      /* ========================================================================= */
      /* 12. PREMIUM */
      /* ========================================================================= */
      ) : activeSubTab === 'premium' ? (
        <div className="space-y-6 animate-fadeIn text-center">
          <div className="bg-white p-8 rounded-[2.5rem] border border-pink-50 space-y-4 max-w-md mx-auto">
            <span className="text-4xl">👑</span>
            <h3 className="text-xl font-serif font-bold text-stone-800">Lumina Premium</h3>
            <p className="text-xs text-stone-500 leading-relaxed">
              Lumina is currently free for you. All cycle tracking, doctor reports, self-care guides, and soundscapes are unlocked! ✨
            </p>
          </div>
        </div>
      ) : null}

      {/* ========================================================================= */}
      {/* MODALS */}
      {/* ========================================================================= */}

      {/* PRIVACY POLICY MODAL */}
      {showPrivacyModal && (
        <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-[2.5rem] p-6 max-w-lg w-full space-y-5 border border-pink-100 shadow-2xl max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-pink-50 pb-3">
              <div className="flex items-center gap-2 text-pink-600">
                <ShieldCheck size={22} />
                <h3 className="font-serif font-bold text-lg text-stone-800">Lumina Privacy Promise</h3>
              </div>
              <button 
                onClick={() => setShowPrivacyModal(false)}
                className="p-1.5 rounded-full hover:bg-stone-100 text-stone-400 hover:text-stone-600 transition-all cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4 text-xs text-stone-600 leading-relaxed">
              <div className="bg-pink-50/50 p-4 rounded-2xl border border-pink-100/60">
                <h4 className="font-bold text-pink-700 text-xs mb-1">1. We Never Sell Your Data</h4>
                <p>Your intimate health, menstrual flow, moods, and private notes are never sold, rented, or monetized for advertising. You are the sole owner of your health journey.</p>
              </div>

              <div className="bg-pink-50/50 p-4 rounded-2xl border border-pink-100/60">
                <h4 className="font-bold text-pink-700 text-xs mb-1">2. Private & Encrypted</h4>
                <p>Your logs and account credentials are secure in transit and storage. You can enable biometric locks (Face ID / Fingerprint) or a 4-digit PIN for device security.</p>
              </div>

              <div className="bg-pink-50/50 p-4 rounded-2xl border border-pink-100/60">
                <h4 className="font-bold text-pink-700 text-xs mb-1">3. Transparent Partner Sharing</h4>
                <p>Partner Mode is completely optional. You choose exactly which cycle highlights to share, and you can disconnect or block a partner at any moment.</p>
              </div>

              <div className="bg-pink-50/50 p-4 rounded-2xl border border-pink-100/60">
                <h4 className="font-bold text-pink-700 text-xs mb-1">4. You Own Your Data</h4>
                <p>Download a complete private copy of your data or delete your account anytime with a single tap in Settings.</p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowPrivacyModal(false)}
              className="w-full py-3 bg-gradient-to-r from-pink-500 to-rose-400 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer transition-all"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* TERMS OF SERVICE MODAL */}
      {showTermsModal && (
        <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-[2.5rem] p-6 max-w-lg w-full space-y-5 border border-pink-100 shadow-2xl max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-pink-50 pb-3">
              <div className="flex items-center gap-2 text-pink-600">
                <FileText size={22} />
                <h3 className="font-serif font-bold text-lg text-stone-800">Terms of Service</h3>
              </div>
              <button 
                onClick={() => setShowTermsModal(false)}
                className="p-1.5 rounded-full hover:bg-stone-100 text-stone-400 hover:text-stone-600 transition-all cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4 text-xs text-stone-600 leading-relaxed">
              <div className="bg-stone-50 p-4 rounded-2xl border border-stone-100">
                <h4 className="font-bold text-stone-800 text-xs mb-1">Wellness & Educational Support</h4>
                <p>Lumina provides cycle calculations and supportive wellness insights. These calculations are estimated tools and do not substitute for professional medical advice, clinical diagnosis, or contraception.</p>
              </div>

              <div className="bg-stone-50 p-4 rounded-2xl border border-stone-100">
                <h4 className="font-bold text-stone-800 text-xs mb-1">Account Responsibility</h4>
                <p>You are responsible for keeping your login credentials and security PIN secure. Lumina provides tools like biometric locks to help safeguard access on your personal device.</p>
              </div>

              <div className="bg-stone-50 p-4 rounded-2xl border border-stone-100">
                <h4 className="font-bold text-stone-800 text-xs mb-1">Respectful Companion Sharing</h4>
                <p>When using Partner Mode, both partners agree to respect mutual privacy boundaries and communication preferences.</p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowTermsModal(false)}
              className="w-full py-3 bg-gradient-to-r from-pink-500 to-rose-400 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer transition-all"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* FEEDBACK & SUPPORT MODAL */}
      {showFeedbackModal && (
        <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-[2.5rem] p-6 max-w-md w-full space-y-5 border border-pink-100 shadow-2xl">
            <div className="flex items-center justify-between border-b border-pink-50 pb-3">
              <div className="flex items-center gap-2 text-pink-600">
                {showFeedbackModal === 'support' ? <MessageCircle size={20} /> :
                 showFeedbackModal === 'bug' ? <Bug size={20} /> : <Lightbulb size={20} />}
                <h3 className="font-serif font-bold text-lg text-stone-800">
                  {showFeedbackModal === 'support' ? 'Contact Support' :
                   showFeedbackModal === 'bug' ? 'Report an Issue' : 'Suggest a Feature'}
                </h3>
              </div>
              <button 
                onClick={() => setShowFeedbackModal(null)}
                className="p-1.5 rounded-full hover:bg-stone-100 text-stone-400 hover:text-stone-600 transition-all cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {feedbackSubmitted ? (
              <div className="py-8 text-center space-y-3">
                <span className="text-4xl">🌸</span>
                <h4 className="text-sm font-bold text-stone-800">Thank you for reaching out!</h4>
                <p className="text-xs text-stone-500 max-w-xs mx-auto">
                  Our care team has received your message and will review it carefully.
                </p>
              </div>
            ) : (
              <form onSubmit={handleFeedbackSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-stone-700">Your Email</label>
                  <input
                    type="email"
                    value={feedbackEmail}
                    onChange={(e) => setFeedbackEmail(e.target.value)}
                    required
                    className="w-full bg-pink-50/30 border border-pink-100 rounded-2xl px-4 py-2.5 text-xs text-stone-800 outline-none focus:border-pink-300"
                    placeholder="you@example.com"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-stone-700">
                    {showFeedbackModal === 'support' ? 'How can we help you?' :
                     showFeedbackModal === 'bug' ? 'Describe what happened:' : 'What feature would you love to see?'}
                  </label>
                  <textarea
                    rows={4}
                    value={feedbackText}
                    onChange={(e) => setFeedbackText(e.target.value)}
                    required
                    className="w-full bg-pink-50/30 border border-pink-100 rounded-2xl p-4 text-xs text-stone-800 outline-none focus:border-pink-300 resize-none"
                    placeholder={
                      showFeedbackModal === 'support' ? 'Write your question or request here...' :
                      showFeedbackModal === 'bug' ? 'Tell us what went wrong and where...' : 'Share your idea with us...'
                    }
                  />
                </div>

                <div className="flex gap-3 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowFeedbackModal(null)}
                    className="flex-1 py-3 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-xs rounded-xl transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-3 bg-gradient-to-r from-pink-500 to-rose-400 text-white font-bold text-xs rounded-xl shadow-md hover:opacity-90 transition-all cursor-pointer"
                  >
                    Send Message
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* DELETE ACCOUNT CONFIRMATION MODAL */}
      {showDeleteAccountModal && (
        <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-[2.5rem] p-6 max-w-md w-full space-y-5 border border-rose-100 shadow-2xl">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="p-3 bg-rose-100/60 rounded-2xl">
                <ShieldAlert size={24} />
              </div>
              <div>
                <h3 className="font-serif font-bold text-lg text-stone-800">Delete Your Account?</h3>
                <p className="text-[10px] font-bold text-rose-500 uppercase tracking-widest">Permanent & Irreversible</p>
              </div>
            </div>

            <div className="space-y-2 text-xs text-stone-600 bg-rose-50/50 p-4 rounded-2xl border border-rose-100/60">
              <p className="font-bold text-rose-800">Deleting your account will permanently remove:</p>
              <ul className="list-disc pl-5 space-y-1 text-[11px]">
                <li>Cycle history and predictions</li>
                <li>Symptoms and mood logs</li>
                <li>Journal entries and notes</li>
                <li>Partner connections and sharing</li>
                <li>All profile settings</li>
              </ul>
              <p className="font-bold text-rose-700 pt-1">This action cannot be undone.</p>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-stone-700 block">
                To confirm, please type <span className="text-rose-600 font-mono font-bold">DELETE</span> below:
              </label>
              <input
                type="text"
                value={deleteAccountInput}
                onChange={(e) => setDeleteAccountInput(e.target.value)}
                placeholder="Type DELETE to confirm"
                className="w-full bg-stone-50 border border-stone-200 px-4 py-3 rounded-2xl text-xs font-mono text-stone-800 focus:border-rose-400 outline-none"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowDeleteAccountModal(false)}
                className="flex-1 py-3 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-xs rounded-xl transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleteAccountInput.trim() !== 'DELETE' || isDeletingAccount}
                onClick={handleDeleteUserAccount}
                className="flex-1 py-3 bg-rose-600 hover:bg-rose-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-xs rounded-xl transition-all cursor-pointer shadow-md shadow-rose-200"
              >
                {isDeletingAccount ? 'Deleting...' : 'Delete Account'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* BLOCK PARTNER MODAL */}
      {partnerToBlock && (
        <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-[2.5rem] p-6 max-w-sm w-full space-y-4 border border-rose-100 shadow-2xl">
            <h3 className="font-serif font-bold text-lg text-stone-800">Block {partnerToBlock.name}?</h3>
            <p className="text-xs text-stone-600 leading-relaxed">
              Blocking this partner will disconnect sharing and prevent them from sending you new connection requests.
            </p>
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setPartnerToBlock(null)}
                className="flex-1 py-3 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-xs rounded-xl transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleBlockPartnerConfirm}
                className="flex-1 py-3 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl transition-all cursor-pointer shadow-md"
              >
                Block Partner
              </button>
            </div>
          </div>
        </div>
      )}

      {/* UNBLOCK PARTNER MODAL */}
      {partnerToUnblock && (
        <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-[2.5rem] p-6 max-w-sm w-full space-y-4 border border-pink-100 shadow-2xl">
            <h3 className="font-serif font-bold text-lg text-stone-800">Unblock {partnerToUnblock.name}?</h3>
            <p className="text-xs text-stone-600 leading-relaxed">
              Unblocking {partnerToUnblock.name} will allow them to send you partner connection requests again.
            </p>
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setPartnerToUnblock(null)}
                className="flex-1 py-3 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-xs rounded-xl transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleUnblockPartnerConfirm}
                className="flex-1 py-3 bg-pink-500 hover:bg-pink-600 text-white font-bold text-xs rounded-xl transition-all cursor-pointer shadow-md"
              >
                Unblock Partner
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;
