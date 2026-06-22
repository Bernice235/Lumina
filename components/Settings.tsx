import React, { useState } from 'react';
import { User, NotificationSettings, Symptom, DiaryEntry, BirthControlLog, TemperatureLog, SharingSettings } from '../types';
import { 
  Bell, 
  Sparkles, 
  Moon, 
  Heart, 
  Volume2, 
  ShieldAlert, 
  Eye, 
  Smartphone, 
  Check, 
  HelpCircle,
  MessageCircle,
  Clock,
  Send,
  UserCheck,
  LogOut,
  Lock,
  Fingerprint,
  Scan,
  User as UserIcon,
  Calendar,
  Layers,
  Download
} from 'lucide-react';
import { 
  getCyclePredictions, 
  getDefaultNotificationSettings, 
  calculateScheduledNotifications,
  generateNotificationText,
  getPregnancyStats,
  getBabySize,
  generatePregnancyNotificationText,
  generatePostpartumNotificationText
} from '../services/notificationService';
import { syncUser, disconnectPartner } from '../services/firebaseService';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../services/firebase';

interface SettingsProps {
  user: User;
  setUser: React.Dispatch<React.SetStateAction<User | null>>;
  onLogout?: () => void;
  symptoms?: Symptom[];
  diaryEntries?: DiaryEntry[];
  bcLogs?: BirthControlLog[];
  tempLogs?: TemperatureLog[];
}

const Settings: React.FC<SettingsProps> = ({ 
  user, 
  setUser, 
  onLogout,
  symptoms = [],
  diaryEntries = [],
  bcLogs = [],
  tempLogs = []
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'notifications' | 'general'>('notifications');

  const handleExportData = () => {
    const backupData = {
      exportedAt: new Date().toISOString(),
      appName: "Lumina Studio",
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
    link.download = `lumina_data_export_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const [localFeedback, setLocalFeedback] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [cloudFeedback, setCloudFeedback] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [isImportDragging, setIsImportDragging] = useState(false);

  const handleCloudBackupNow = async () => {
    setCloudFeedback(null);
    try {
      await syncUser(user);
      setCloudFeedback({ type: 'success', text: 'Cloud sanctuary backup generated and securely updated in Firestore! ☁️✨' });
    } catch (err) {
      console.error(err);
      setCloudFeedback({ type: 'error', text: 'Offline mode or authorization restriction. Local profile remains.' });
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
        setCloudFeedback({ type: 'success', text: 'Lumina data completely restored from Cloud Backup successfully! 🌸🌿' });
      } else {
        setCloudFeedback({ type: 'error', text: 'No existing cloud backup profile found for your secure ID.' });
      }
    } catch (err) {
      console.error(err);
      setCloudFeedback({ type: 'error', text: 'Could not communicate with cloud. Local offline database retained.' });
    }
  };

  const parseAndImportJSON = (jsonText: string) => {
    try {
      const parsed = JSON.parse(jsonText);
      if (!parsed || (!parsed.profile && !parsed.id)) {
        throw new Error('Incorrect format. Missing profile values.');
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

      setLocalFeedback({ type: 'success', text: 'Local tracking history loaded successfully! Take a look around. 💕' });
    } catch (e: any) {
      setLocalFeedback({ type: 'error', text: `Failed to import: ${e.message || 'Malformed file structure.'}` });
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

  // Load existing settings or fall back to default
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

  const updatePregnancyTypes = (key: keyof NotificationSettings['pregnancyTypes'], value: boolean) => {
    updateSettings({
      pregnancyTypes: {
         ...settings.pregnancyTypes,
         [key]: value
      }
    });
  };

  const updatePartnerReceiveTypes = (key: keyof NotificationSettings['partnerReceiveTypes'], value: boolean) => {
    updateSettings({
      partnerReceiveTypes: {
         ...settings.partnerReceiveTypes,
         [key]: value
      }
    });
  };

  const updatePartnerPregnancyReceiveTypes = (key: keyof NotificationSettings['partnerPregnancyReceiveTypes'], value: boolean) => {
    updateSettings({
      partnerPregnancyReceiveTypes: {
         ...settings.partnerPregnancyReceiveTypes,
         [key]: value
      }
    });
  };

  // Helper to trigger instant notification simulation
  const triggerSimulation = (
    type: keyof NotificationSettings['types'] | 'pregnancyRiskLow' | 'pregnancyRiskHigh',
    isPartner: boolean
  ) => {
    const tone = settings.toneStyle || 'supportive';
    let bodyText = '';
    let titleText = isPartner ? 'Supporting Her Bloom 💕' : 'Cycle Sanctuary Update 🌸';
    let emojiText = '🔔';

    const predictions = getCyclePredictions(user);

    if (type === 'periodStarting') {
      bodyText = generateNotificationText('periodStarting', tone, isPartner, { date: predictions.nextPeriod });
      titleText = isPartner ? 'Partner Connection 💞' : 'Cycle alert starting 🌸';
      emojiText = '🌸';
    } else if (type === 'periodStarted') {
      bodyText = generateNotificationText('periodStarted', tone, isPartner);
      titleText = isPartner ? 'Period started 💕' : 'New Cycle Begins 🩷';
      emojiText = '🩷';
    } else if (type === 'periodEnding') {
      bodyText = generateNotificationText('periodEnding', tone, isPartner);
      titleText = isPartner ? 'Sanctuary Renewal 🌷' : 'Cycle Cleansing Done ✨';
      emojiText = '🌷';
    } else if (type === 'ovulation') {
      bodyText = generateNotificationText('ovulation', tone, isPartner, { date: predictions.ovulation });
      titleText = isPartner ? 'Her Ovulation Season 🌸' : 'Celestial Ovulation ✨';
      emojiText = '💖';
    } else if (type === 'fertileWindow') {
      bodyText = generateNotificationText('fertileWindow', tone, isPartner, { startDate: predictions.fertileStart, endDate: predictions.fertileEnd });
      titleText = isPartner ? 'Abundant Bloom Phase 💞' : 'Abundant Peak Bloom 💞';
      emojiText = '💞';
    } else if (type === 'lutealPhase') {
      bodyText = generateNotificationText('lutealPhase', tone, isPartner);
      titleText = 'Quiet Sunset Inward 🌙';
      emojiText = '🌙';
    } else if (type === 'pregnancyRiskLow' || type === 'pregnancyRisk' || type === 'pregnancyRiskHigh') {
      const isHigh = type === 'pregnancyRiskHigh' || Math.random() > 0.5;
      bodyText = generateNotificationText(
        isHigh ? 'pregnancyRiskHigh' : 'pregnancyRiskLow', 
        tone, 
        isPartner
      ) + "\n*Estimates only, not a medical guarantee.";
      titleText = isPartner ? 'Shared Insight 🩺' : 'Cycle Educational Insight 🩺';
      emojiText = '🩺';
    }

    // Dispatch the custom event to simulate the push notification Banner sliding down from App.tsx
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

  const triggerPregnancySimulation = (type: string, isPartner: boolean) => {
    const tone = settings.toneStyle || 'supportive';
    let bodyText = '';
    let emojiText = '🤰';
    let titleText = isPartner ? 'Supporting Her Bloom 💕' : 'Welcome to Sanctuary maternal 🌸';

    const pStats = getPregnancyStats(user);
    const size = getBabySize(pStats.weeks);

    if (type === 'welcome') {
      bodyText = generatePregnancyNotificationText('welcome', tone, isPartner);
      titleText = isPartner ? 'Partner Connection 💞' : 'Welcome to Sanctuary maternal 🌸';
      emojiText = isPartner ? '💞' : '🌸';
    } else if (type === 'weeklyBabyDev') {
      bodyText = generatePregnancyNotificationText(isPartner ? 'weeklyBabyUpdate' : 'weeklyBabyDev', tone, isPartner, { week: pStats.weeks });
      titleText = isPartner ? 'Supporting Her Bloom 💕' : `Week ${pStats.weeks} update 👶`;
      emojiText = isPartner ? '💕' : '👶';
    } else if (type === 'babySizeUpdate') {
      bodyText = generatePregnancyNotificationText('babySizeUpdate', tone, false, { size });
      titleText = 'Baby Fruit Size update 🥭';
      emojiText = '🥭';
    } else if (type === 'appointment') {
      const dateStr = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      bodyText = generatePregnancyNotificationText('appointment', tone, isPartner, { date: dateStr });
      titleText = isPartner ? 'Appointment Sync 🩺' : 'Maternal checkup reminder 🩺';
      emojiText = '🩺';
    } else if (type === 'medicationVitamin') {
      bodyText = generatePregnancyNotificationText('medicationVitamin', tone, false);
      titleText = 'Nurture reminder 💊';
      emojiText = '💊';
    } else if (type === 'hydration') {
      bodyText = generatePregnancyNotificationText('hydration', tone, false);
      titleText = 'Dew of life reminder 💧';
      emojiText = '💧';
    } else if (type === 'rest') {
      bodyText = generatePregnancyNotificationText('rest', tone, isPartner);
      titleText = isPartner ? 'Supporting Her Rest 🌙' : 'Quiet Rest Reflection 🌙';
      emojiText = '🌙';
    } else if (type === 'kickCounter') {
      bodyText = generatePregnancyNotificationText('kickCounter', tone, false);
      titleText = 'Baby flutter kicks 👣';
      emojiText = '👣';
    } else if (type === 'symptomCheck') {
      bodyText = generatePregnancyNotificationText('symptomCheck', tone, false);
      titleText = 'Symptom journal log 🌸';
      emojiText = '🌸';
    } else if (type === 'symptomSupport') {
      bodyText = generatePregnancyNotificationText('symptomSupport', tone, true);
      titleText = 'Supporting Symptom shifts 💗';
      emojiText = '💗';
    } else if (type === 'dueDateCountdown') {
      bodyText = generatePregnancyNotificationText('dueDateCountdown', tone, isPartner, { weeksLeft: pStats.weeksLeft });
      titleText = isPartner ? 'Partner Countdown 🎀' : 'Due date approaching 🎀';
      emojiText = '🎀';
    } else if (type === 'laborNear') {
      bodyText = generatePregnancyNotificationText('laborNear', tone, isPartner);
      titleText = isPartner ? 'Sanctuary delivery near 🍼' : 'Delivery door approaching 🍼';
      emojiText = '🍼';
    } else if (type === 'encouragement') {
      bodyText = generatePregnancyNotificationText('encouragement', tone, isPartner);
      titleText = isPartner ? 'Supporting Her Journey 🩷' : 'Daily bloom validation 💖';
      emojiText = isPartner ? '🩷' : '💖';
    } else if (type === 'hospitalBag') {
      bodyText = generatePregnancyNotificationText('hospitalBag', tone, false);
      titleText = 'Nesting suitcase checklist 👜';
      emojiText = '👜';
    } else if (type === 'contractionTimer') {
      bodyText = generatePregnancyNotificationText('contractionTimer', tone, false);
      titleText = 'Surge wave timer ⏱️';
      emojiText = '⏱️';
    } else if (type === 'breastfeedingPrep') {
      bodyText = generatePregnancyNotificationText('breastfeedingPrep', tone, false);
      titleText = 'First feed preparation 🍼';
      emojiText = '🍼';
    } else if (type === 'birthPlan') {
      bodyText = generatePregnancyNotificationText('birthPlan', tone, false);
      titleText = 'Positive birth wishlist 📝';
      emojiText = '📝';
    } else if (type === 'postpartumPrep') {
      bodyText = generatePregnancyNotificationText('postpartumPrep', tone, false);
      titleText = 'Fourth trimester nest 🌿';
      emojiText = '🌿';
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
      desc: "Warm, empathetic, and sweet. Feels like a supportive, reassuring text from your best girlfriend.",
      label: "Supportive 💗",
      sample: user.isPregnancyMode 
        ? "“Hey mama 💗 welcome to your pregnancy journey. We’re here with you every step of the way 🌸”" 
        : "“Hey girl 💗 your period is expected to start on date. Be prepared, you got this 🌸”"
    },
    playful: {
      desc: "Lighthearted, fun-loving, and humorous. Adds a cute punchy smile to your cycle events & cravings.",
      label: "Playful 😜",
      sample: user.isPregnancyMode 
        ? "“Congrats mama! 🎉 A little roommate is officially making their lease in your tummy! We're here for the cravings 🍕✨”"
        : "“Psst... 🤫 your flow-cycle is preparing to land. Stock up on your favorite chocolates! 🍫”"
    },
    affirming: {
      desc: "Empowering, mindful, and centered. Cultivates body acceptance, biological truth, and mindful breathing.",
      label: "Affirming 🧘‍♀️",
      sample: user.isPregnancyMode 
        ? "“We honor your body as it begins the sacred art of carrying life. You are grounded, capable, and surrounded by love. 🌾”"
        : "“Your body's natural state is approaching its cleansing phase. Honor this timing. 🌾”"
    },
    aesthetic: {
      desc: "Soft, poetic, and vintage. Adorned with seasonal metaphors like 'winter periods' and 'spring return'.",
      label: "Aesthetic 🩰",
      sample: user.isPregnancyMode 
        ? "“The start of a poetry in motion... 🩰 Welcome to your serene pregnancy journey. Step softly into this light. 🌸”"
        : "“The tide turns. Your monthly winter begins soon. Step softly into the sanctuary of rest. 🩰”"
    }
  };

  return (
    <div className="space-y-8 animate-fadeIn pb-16">
      <header className="text-center">
        <h2 className="text-3xl font-serif text-pink-500 italic">App Sanctuary Settings</h2>
        <p className="text-sm text-pink-300 italic">Configure notifications, companion tones, and device layouts</p>
      </header>

      {/* Tabs */}
      <div className="flex bg-rose-50/50 p-1 rounded-2xl w-full border border-rose-100 max-w-md mx-auto">
        <button 
          onClick={() => setActiveSubTab('notifications')}
          className={`flex-1 py-3 text-[10px] font-bold uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-2 ${
            activeSubTab === 'notifications' 
              ? 'bg-gradient-to-r from-pink-500 to-rose-400 text-white shadow-md shadow-pink-100' 
              : 'text-pink-400 hover:text-pink-600'
          }`}
        >
          <Bell size={13} />
          Smart Notifications
        </button>
        <button 
          onClick={() => setActiveSubTab('general')}
          className={`flex-1 py-3 text-[10px] font-bold uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-2 ${
            activeSubTab === 'general' 
              ? 'bg-gradient-to-r from-pink-500 to-rose-400 text-white shadow-md shadow-pink-100' 
              : 'text-pink-400 hover:text-pink-600'
          }`}
        >
          <Smartphone size={13} />
          General & Publishing
        </button>
      </div>

      {activeSubTab === 'notifications' ? (
        <div className="space-y-8">
          {/* Pregnancy Mode Switcher Card */}
          <div className="bg-gradient-to-r from-pink-500 via-rose-500 to-amber-400 p-[2px] rounded-[2.5rem] shadow-lg shadow-rose-100/40">
            <div className="bg-white p-6 rounded-[2.4rem] space-y-4">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">🤰</span>
                    <h3 className="text-xl font-serif font-black text-transparent bg-clip-text bg-gradient-to-r from-pink-600 via-rose-500 to-amber-500 italic">
                      App Mode Selection
                    </h3>
                  </div>
                  <p className="text-xs text-gray-500 leading-relaxed">
                    Switch between standard cycle tracking and our dedicated, beautiful **Pregnancy Mode** journey.
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
                    className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${
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
                        
                        setTimeout(() => {
                          triggerPregnancySimulation('welcome', false);
                        }, 400);
                      }
                    }}
                    className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${
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
                      <span className="text-[10px] font-black uppercase tracking-widest text-amber-600">Gestational Tracking</span>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs font-bold text-gray-800">
                          Week {user.pregnancyStartDate ? getPregnancyStats(user).weeks : 12}
                        </span>
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-300"></span>
                        <span className="text-[11px] font-medium text-gray-500 italic">
                          Due: {user.pregnancyStartDate ? getPregnancyStats(user).dueDate : 'Dec 25, 2026'} ({user.pregnancyStartDate ? getPregnancyStats(user).weeksLeft : 28} weeks left)
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-1 shrink-0">
                    <label className="text-[9px] font-bold uppercase tracking-widest text-amber-600">Pregnancy Gestational Start Date (LMP)</label>
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
                      className="bg-amber-50/50 px-3 py-1.5 rounded-xl outline-none font-bold text-xs text-amber-800 border border-amber-200/40 text-center shadow-inner"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
          {/* Main Toggle Block */}
          <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-pink-50 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative overflow-hidden">
            <div className="space-y-1 max-w-md">
              <h3 className="text-lg font-serif text-pink-500 flex items-center gap-2 italic">
                <span className="text-2xl">🔔</span> Sanctuary Push Notifications
              </h3>
              <p className="text-xs text-gray-500 leading-relaxed">
                Receive personalized companion affirmations & alerts on your device based on cycle prediction, fertility windows, and wellness events.
              </p>
            </div>
            <button 
              onClick={() => updateSettings({ enabled: !settings.enabled })}
              className={`w-14 h-8 rounded-full p-1 transition-colors duration-300 ease-in-out flex items-center ${
                settings.enabled ? 'bg-pink-500 justify-end' : 'bg-pink-100 justify-start'
              }`}
            >
              <span className="w-6 h-6 rounded-full bg-white shadow-sm transition-transform duration-300"></span>
            </button>
          </div>

          {settings.enabled && (
            <div className="space-y-8">
              {/* Tone style selection */}
              <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-pink-50 space-y-6">
                <div className="space-y-1">
                  <h4 className="font-serif text-lg text-pink-500 flex items-center gap-2 italic">
                    <span className="text-base">🎀</span> Companion Personality Tone
                  </h4>
                  <p className="text-xs text-gray-500">
                    Choose how notifications sound. Make your cycle companion feel supportive, playful, affirming, or poetic.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                  {(Object.keys(tonePreviews) as Array<keyof typeof tonePreviews>).map((key) => {
                    const info = tonePreviews[key];
                    const isSelected = settings.toneStyle === key;
                    return (
                      <button
                        key={key}
                        onClick={() => updateSettings({ toneStyle: key })}
                        className={`text-left p-5 rounded-3xl border-2 transition-all flex flex-col gap-2 group relative overflow-hidden ${
                          isSelected 
                            ? 'bg-gradient-to-br from-pink-50/40 to-rose-50/40 border-pink-300 shadow-md shadow-pink-100/50' 
                            : 'bg-white border-pink-50 hover:border-pink-200'
                        }`}
                      >
                        {isSelected && (
                          <span className="absolute top-3 right-3 w-5 h-5 bg-pink-500 rounded-full flex items-center justify-center text-white scale-110">
                            <Check size={10} strokeWidth={4} />
                          </span>
                        )}
                        <span className="text-xs font-black uppercase tracking-widest text-pink-600">
                          {info.label}
                        </span>
                        <p className="text-[10px] text-gray-400 font-medium leading-relaxed">
                          {info.desc}
                        </p>
                        <div className="bg-white/80 p-2.5 rounded-2xl border border-pink-100/30 text-[9px] font-medium text-pink-500 italic leading-snug tracking-normal mt-1 border-dashed">
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
                    className="w-full py-3.5 bg-gradient-to-r from-pink-400 to-rose-400 text-white font-black uppercase tracking-widest text-[9px] rounded-2xl shadow-md shadow-pink-100/60 hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-2 group"
                  >
                    <Volume2 size={13} className="group-hover:animate-bounce" />
                    ✨ Play Sound & Simultanously Preview Selected Tone &rarr;
                  </button>
                </div>
              </div>

              {/* Reminder Timing & Quiet Hours */}
              <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-pink-50 space-y-6">
                <div className="space-y-1">
                  <h4 className="font-serif text-lg text-pink-500 flex items-center gap-2 italic">
                    <span className="text-base">⏰</span> Alert Timing & Quiet Hours
                  </h4>
                  <p className="text-xs text-gray-500">
                    Define when alerts arrive and toggle peaceful silences to protect your sleep.
                  </p>
                </div>

                <div className="space-y-5 pt-2">
                  {/* Timing slider / input */}
                  {user.isPregnancyMode ? (
                    <div className="bg-amber-50/35 p-5 rounded-3xl border border-amber-100/40 space-y-3 animate-fadeIn">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-black uppercase tracking-wider text-amber-600">Daily Vitamin & Health Reminder Time</span>
                        <span className="text-xs font-serif text-amber-700 font-bold bg-white px-2.5 py-1 rounded-xl shadow-inner border border-amber-100">
                          {settings.pregnancyReminderTime || '09:00'}
                        </span>
                      </div>
                      <input 
                        type="time" 
                        value={settings.pregnancyReminderTime || '09:00'} 
                        onChange={(e) => updateSettings({ pregnancyReminderTime: e.target.value })}
                        className="w-full bg-white p-2.5 rounded-2xl outline-none text-amber-700 font-bold text-xs border border-amber-200/40 text-center shadow-sm"
                      />
                    </div>
                  ) : (
                    <div className="bg-pink-50/35 p-5 rounded-3xl border border-pink-100/40 space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-black uppercase tracking-wider text-pink-500">Period Starting Reminder</span>
                        <span className="text-xs font-serif text-pink-600 font-bold bg-white px-2.5 py-1 rounded-xl shadow-inner border border-pink-100">
                          {settings.reminderDaysBefore} {settings.reminderDaysBefore === 1 ? 'day' : 'days'} before
                        </span>
                      </div>
                      <input 
                        type="range" 
                        min="1" 
                        max="7" 
                        value={settings.reminderDaysBefore ?? 3} 
                        onChange={(e) => updateSettings({ reminderDaysBefore: parseInt(e.target.value) })}
                        className="w-full accent-pink-500 h-1 bg-pink-100 rounded-lg cursor-pointer"
                      />
                      <div className="flex justify-between text-[8px] font-bold text-pink-300 uppercase tracking-widest">
                        <span>1 Day Before</span>
                        <span>4 Days Before</span>
                        <span>7 Days Before</span>
                      </div>
                    </div>
                  )}

                  {/* Quiet hours box */}
                  <div className="bg-pink-50/35 p-5 rounded-3xl border border-pink-100/40 space-y-4">
                    <div className="flex justify-between items-center">
                      <div className="space-y-0.5">
                        <span className="text-[10px] font-black uppercase tracking-wider text-pink-500 flex items-center gap-1.5">
                          <Moon size={11} className="text-pink-400" /> Quiet Hours (Do Not Disturb)
                        </span>
                        <p className="text-[9px] text-gray-400">Silences custom simulated notifications during sunset hours.</p>
                      </div>
                      <button 
                        onClick={() => updateSettings({ 
                          quietHours: { ...settings.quietHours, enabled: !settings.quietHours.enabled } 
                        })}
                        className={`w-11 h-6 rounded-full p-0.5 transition-colors duration-300 ease-in-out flex items-center ${
                          settings.quietHours.enabled ? 'bg-pink-500 justify-end' : 'bg-pink-100 justify-start'
                        }`}
                      >
                        <span className="w-5 h-5 rounded-full bg-white shadow-sm"></span>
                      </button>
                    </div>

                    {settings.quietHours.enabled && (
                      <div className="grid grid-cols-2 gap-4 pt-1 animate-fadeIn">
                        <div className="space-y-1">
                          <label className="text-[9px] font-bold uppercase tracking-widest text-pink-400 ml-1 flex items-center gap-1">
                            <Clock size={10} /> Quiet Starts
                          </label>
                          <input 
                            type="time" 
                            value={settings.quietHours?.startTime ?? '22:00'} 
                            onChange={(e) => updateSettings({ 
                              quietHours: { ...settings.quietHours, startTime: e.target.value } 
                            })}
                            className="w-full bg-white p-2.5 rounded-2xl outline-none text-pink-600 font-bold text-xs border border-pink-100 text-center"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[9px] font-bold uppercase tracking-widest text-pink-400 ml-1 flex items-center gap-1">
                            <Clock size={10} /> quiet ends
                          </label>
                          <input 
                            type="time" 
                            value={settings.quietHours?.endTime ?? '08:00'} 
                            onChange={(e) => updateSettings({ 
                              quietHours: { ...settings.quietHours, endTime: e.target.value } 
                            })}
                            className="w-full bg-white p-2.5 rounded-2xl outline-none text-pink-600 font-bold text-xs border border-pink-100 text-center"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* User Notifications Switches */}
              {user.isPregnancyMode ? (
                <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-amber-100 space-y-6">
                  <div className="space-y-1">
                    <h4 className="font-serif text-lg text-amber-600 flex items-center gap-2 italic">
                      <span className="text-base text-amber-500">🤰</span> Companion Pregnancy Alerts For You
                    </h4>
                    <p className="text-xs text-gray-500">
                      Choose which pregnancy milestones, physical reminders, and health checks prompt phone alerts.
                    </p>
                  </div>

                  {/* Pregnancy notifications master toggle */}
                  <div className="flex justify-between items-center p-4 bg-amber-50/20 border border-amber-100/30 rounded-3xl">
                    <div className="space-y-0.5">
                      <span className="text-xs font-black uppercase tracking-wider text-amber-700 flex items-center gap-1.55">
                        <Check size={12} /> Enable Pregnancy Alerts
                      </span>
                      <p className="text-[10px] text-amber-600 font-semibold">When checked, you will receive scheduled pregnancy developmental guidance.</p>
                    </div>
                    <button 
                      onClick={() => updateSettings({ pregnancyEnabled: !settings.pregnancyEnabled })}
                      className={`w-12 h-6.5 rounded-full p-0.5 transition-colors duration-300 ease-in-out flex items-center ${
                        settings.pregnancyEnabled ? 'bg-amber-500 justify-end' : 'bg-amber-100 justify-start'
                      }`}
                    >
                      <span className="w-5.5 h-5.5 rounded-full bg-white shadow-sm"></span>
                    </button>
                  </div>

                  {settings.pregnancyEnabled && (
                    <div className="space-y-3 pt-2 animate-fadeIn grid grid-cols-1 md:grid-cols-2 gap-3 md:space-y-0">
                      {[
                        { key: 'welcome', label: 'Pregnancy Welcome Celebrate', d: 'Warm greeting when starting this beautiful journey.' },
                        { key: 'weeklyBabyDev', label: 'Weekly Development Updates', d: 'How baby grows week by week (organs, heart flutters).' },
                        { key: 'babySizeUpdate', label: 'Baby Fruit Size Milestones', d: 'Visual size comparison alerts (raspberry, mango, peach).' },
                        { key: 'appointment', label: 'Doctor & Prenatal Checkups', d: 'Gentle logs and warnings for upcoming clinic appointments.' },
                        { key: 'medicationVitamin', label: 'Medication & Vitamin Reminders', d: 'Encouraging notifications for prenatal daily pills.' },
                        { key: 'hydration', label: 'Water & Hydration Reminders', d: 'Sip-counters to safeguard healthy fluids and amniotic balance.' },
                        { key: 'rest', label: 'Afternoon Rest Warnings', d: 'Reminders to put your feet up and rest.' },
                        { key: 'kickCounter', label: 'Baby Kick Counter checks', d: 'Checking on active kicks and flutters starting in trimester 2.' },
                        { key: 'symptomCheck', label: 'Symptom Journaling Alerts', d: 'Requests to log changes (nausea, fatigue, visual energy).' },
                        { key: 'dueDateCountdown', label: 'Due Date Calendar Countdowns', d: 'Exciting week countdowns guiding your thoughts toward birth.' },
                        { key: 'laborNear', label: 'Labor Closeness warnings', d: 'Checking on supplies and contractions near week 36.' },
                        { key: 'encouragement', label: 'Daily Maternal affirmation', d: 'Aesthetic, loving prompts to boost your joy and trust.' },
                        { key: 'hospitalBag', label: '👜 Nesting Hospital Bag list', d: 'Prepping details for comfortable suitcase items.' },
                        { key: 'contractionTimer', label: '⏱️ Labor Surge stopwatch', d: 'Contraction interval check warning timers.' },
                        { key: 'breastfeedingPrep', label: '🍼 Lactation prep, skin guidance', d: 'Valuable tutorials on comfortable early feeding.' },
                        { key: 'birthPlan', label: '📝 Birth Plan wishlist choices', d: 'Wishes mapping music and requests for delivery day.' },
                        { key: 'postpartumPrep', label: '🌿 Fourth Trimester Sanctuary', d: 'Preparing lists like healing linens and self-care comforts.' },
                      ].map((item) => (
                        <div key={item.key} className="flex justify-between items-center p-3.5 bg-amber-50/10 border border-amber-100/20 rounded-2xl hover:bg-amber-50/20 transition-all">
                          <div className="space-y-0.5 max-w-[80%]">
                            <span className="text-xs font-bold text-gray-700">{item.label}</span>
                            <p className="text-[10px] text-gray-400 italic font-medium leading-tight">{item.d}</p>
                          </div>
                          <button 
                            onClick={() => updatePregnancyTypes(item.key as any, !settings.pregnancyTypes[item.key as keyof NotificationSettings['pregnancyTypes']])}
                            className={`w-10 h-6 shrink-0 rounded-full p-0.5 transition-colors duration-300 ease-in-out flex items-center ${
                              settings.pregnancyTypes[item.key as keyof NotificationSettings['pregnancyTypes']] ? 'bg-amber-500 justify-end' : 'bg-amber-100 justify-start'
                            }`}
                          >
                            <span className="w-5 h-5 rounded-full bg-white shadow-sm"></span>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-pink-50 space-y-6">
                  <div className="space-y-1">
                    <h4 className="font-serif text-lg text-pink-500 flex items-center gap-2 italic">
                      <span className="text-base text-pink-400">🌸</span> Companion Notifications For You
                    </h4>
                    <p className="text-xs text-gray-500">
                      Choose which predictable cycle events prompt simulated phone warnings.
                    </p>
                  </div>

                  <div className="space-y-3 pt-2">
                    {[
                      { key: 'periodStarting', label: 'Period Starting Reminder', d: 'Friendly warning before flow expected.' },
                      { key: 'periodStarted', label: 'Period Started Alert', d: 'Loving welcoming greeting once flow starts.' },
                      { key: 'periodEnding', label: 'Period Ending Congratulations', d: 'Announcement of post-period renewal energy.' },
                      { key: 'ovulation', label: 'Ovulation Alert', d: 'Warning at predictions of peak fertile ovulation.' },
                      { key: 'fertileWindow', label: 'Fertile Window Banner', d: 'Notice spanning fertile boundaries.' },
                      { key: 'lutealPhase', label: 'Luteal Phase Transition', d: 'Reminder to turn inward and embrace gentle rest.' },
                      { key: 'pregnancyRisk', label: 'Pregnancy Risk Insights', d: 'Discreet guidelines based on statistics.' },
                    ].map((item) => (
                      <div key={item.key} className="flex justify-between items-center p-3.5 bg-rose-50/15 border border-pink-100/30 rounded-2xl hover:bg-rose-50/30 transition-all">
                        <div className="space-y-0.5">
                          <span className="text-xs font-bold text-gray-700">{item.label}</span>
                          <p className="text-[10px] text-gray-400 italic font-medium">{item.d}</p>
                        </div>
                        <button 
                          onClick={() => updateTypes(item.key as any, !settings.types[item.key as keyof NotificationSettings['types']])}
                          className={`w-10 h-6 rounded-full p-0.5 transition-colors duration-300 ease-in-out flex items-center ${
                            settings.types[item.key as keyof NotificationSettings['types']] ? 'bg-pink-500 justify-end' : 'bg-pink-100 justify-start'
                          }`}
                        >
                          <span className="w-5 h-5 rounded-full bg-white shadow-sm"></span>
                        </button>
                      </div>
                    ))}

                    {/* Disclaimer for pregnancy risk */}
                    {settings.types.pregnancyRisk && (
                      <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200/50 flex gap-2.5 items-start">
                        <ShieldAlert size={16} className="text-amber-600 shrink-0 mt-0.5" />
                        <div className="space-y-1">
                          <p className="text-[10px] font-black uppercase tracking-wider text-amber-700">Educational Insights Disclaimer</p>
                          <p className="text-[9px] text-amber-800 leading-normal font-semibold">
                            Smart Pregnancy Risk predictions are statistical calendar calculations based on logs. They are strictly for educational and self-care companion purposes, and represent NO medical guarantees, diagnosis, or bulletproof contraception. Always discuss family plans with a qualified physician.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* 🌸 PARTNER PRIVACY & CONNECTION CONTROLS */}
              <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-purple-100 space-y-6">
                <div className="space-y-1">
                  <h4 className="font-serif text-lg text-purple-600 flex items-center gap-2 italic">
                    <span className="text-base">🌸</span> Settings &rarr; Partner Privacy
                  </h4>
                  <p className="text-xs text-gray-500">
                    Manage active sharing permissions, pause synchronization temporarily, or unlink connected companion accounts.
                  </p>
                </div>

                {user.isPartnerLinked && user.partnerId ? (
                  <div className="space-y-6">
                    <div className="p-4 bg-purple-50/50 rounded-3xl border border-purple-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">💕</span>
                        <div>
                          <p className="text-xs font-black text-purple-950 uppercase tracking-wider">Connected Companion</p>
                          <p className="text-lg font-serif italic text-purple-700">{user.partnerName || "Your Partner"}</p>
                        </div>
                      </div>
                      <button
                        onClick={async () => {
                          if (confirm(`Are you absolutely sure you want to disconnect from ${user.partnerName}? This will permanently revoke all access and unlink your workspaces.`)) {
                            await disconnectPartner(user.id, user.partnerId || '');
                            const updated = {
                              ...user,
                              partnerId: undefined,
                              partnerName: '',
                              isPartnerLinked: false
                            };
                            setUser(updated);
                            alert("Successfully unlinked and disconnected from companion.");
                          }
                        }}
                        className="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold rounded-2xl text-[10px] uppercase tracking-widest transition-all w-full sm:w-auto"
                      >
                        Disconnect Companion 💔
                      </button>
                    </div>

                    {/* Pause Sharing Toggle */}
                    <div className="flex justify-between items-center p-4 bg-indigo-50/30 border border-indigo-100/40 rounded-3xl">
                      <div className="space-y-0.5">
                        <span className="text-xs font-black uppercase tracking-wider text-indigo-950 flex items-center gap-1.5">
                          ⏸️ Pause All Partner Sharing
                        </span>
                        <p className="text-[10px] text-gray-500">When active, your partner cannot see any cycle metrics until unpaused.</p>
                      </div>
                      <button 
                        onClick={async () => {
                          const updated = {
                            ...user,
                            isSharingPaused: !user.isSharingPaused
                          };
                          setUser(updated);
                          await syncUser(updated);
                        }}
                        className={`w-12 h-6.5 rounded-full p-0.5 transition-colors duration-300 ease-in-out flex items-center shrink-0 ${
                          user.isSharingPaused ? 'bg-indigo-600 justify-end' : 'bg-gray-200 justify-start'
                        }`}
                      >
                        <span className="w-5.5 h-5.5 rounded-full bg-white shadow-sm"></span>
                      </button>
                    </div>

                    {/* Permission checklists */}
                    {!user.isSharingPaused && (
                      <div className="space-y-3 pt-2">
                        <p className="text-[10px] font-black uppercase tracking-widest text-indigo-400 ml-1">Edit Shared Information</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {[
                            { label: "Share Cycle Information", desc: "Show period status and forecasts", key: "shareCycleInfo" },
                            { label: "Share Symptoms", desc: "Show physical symptom logs", key: "shareSymptoms" },
                            { label: "Share Mood", desc: "Show logged mood events", key: "shareMood" },
                            { label: "Share Fertility Information", desc: "Show fertile windows & ovulation predictions", key: "shareFertilityInfo" },
                            { label: "Share Pregnancy Information", desc: "Show pregnancy milestones", key: "sharePregnancyInfo" },
                            { label: "Share Intimacy Logs", desc: "Show contraceptive & intimacy tracker logs", key: "shareIntimacyInfo" },
                            { label: "Share Doctor Reports", desc: "Show shared medical details", key: "shareDoctorReports" },
                            { label: "Share Appointment Reminders", desc: "Show shared visits & clinic schedules", key: "shareAppointmentReminders" },
                            { label: "Share Wellness Updates", desc: "Show wellness briefs & daily suggestions", key: "shareWellnessUpdates" }
                          ].map((pref) => (
                            <div key={pref.key} className="flex items-start gap-3 p-3 bg-indigo-50/20 hover:bg-indigo-50/40 rounded-2xl transition-all">
                              <input
                                type="checkbox"
                                id={`settings_${pref.key}`}
                                checked={user.sharingSettings?.[pref.key as keyof SharingSettings] ?? false}
                                onChange={async (e) => {
                                  const updated = {
                                    ...user,
                                    sharingSettings: {
                                      ...user.sharingSettings,
                                      [pref.key]: e.target.checked
                                    }
                                  };
                                  setUser(updated);
                                  await syncUser(updated);
                                }}
                                className="w-4.5 h-4.5 rounded border-indigo-200 text-purple-600 focus:ring-purple-500 mt-0.5 cursor-pointer"
                              />
                              <label htmlFor={`settings_${pref.key}`} className="flex-1 cursor-pointer">
                                <p className="text-xs font-bold text-indigo-950">{pref.label}</p>
                                <p className="text-[10px] text-gray-400 leading-tight mt-0.5">{pref.desc}</p>
                              </label>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100 text-center space-y-2">
                    <span className="text-3xl">🔗</span>
                    <h5 className="text-sm font-bold text-indigo-950">No Linked Companion Account</h5>
                    <p className="text-[11px] text-gray-400 max-w-sm mx-auto">
                      Generate an invitation code in the main panel and share it with your partner. Once they complete the setup, you can control your privacy here.
                    </p>
                  </div>
                )}
              </div>

              {/* Partner notification rules */}
              {user.isPregnancyMode ? (
                <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-amber-100 space-y-6">
                  <div className="space-y-1">
                    <h4 className="font-serif text-lg text-amber-600 flex items-center gap-2 italic">
                      <span className="text-base text-amber-500">💞</span> Sync Partner Pregnancy Support
                    </h4>
                    <p className="text-xs text-gray-500">
                      Co-parent companion support settings to keep your partner synced with baby’s growth and maternal wellness.
                    </p>
                  </div>

                  <div className="flex justify-between items-center p-4 bg-amber-50/10 border border-amber-100/30 rounded-3xl">
                    <div className="space-y-0.5">
                      <span className="text-xs font-black uppercase tracking-wider text-amber-700 flex items-center gap-1.5">
                        <UserCheck size={12} /> Allow Partner Pregnancy Alerts
                      </span>
                      <p className="text-[10px] text-amber-600 font-semibold">When checked, companion sends supportive synchronizations to partner.</p>
                    </div>
                    <button 
                      onClick={() => updateSettings({ partnerPregnancyEnabled: !settings.partnerPregnancyEnabled })}
                      className={`w-12 h-6.5 rounded-full p-0.5 transition-colors duration-300 ease-in-out flex items-center ${
                        settings.partnerPregnancyEnabled ? 'bg-amber-500 justify-end' : 'bg-amber-100 justify-start'
                      }`}
                    >
                      <span className="w-5.5 h-5.5 rounded-full bg-white shadow-sm"></span>
                    </button>
                  </div>

                  {settings.partnerPregnancyEnabled && (
                    <div className="space-y-3 pt-2 animate-fadeIn grid grid-cols-1 md:grid-cols-2 gap-3 md:space-y-0">
                      {[
                        { key: 'welcome', label: 'Partner Welcome Support', d: '💡 “Hey dad/co-parent! She is taking a beautiful pregnancy mode journey. Here is how you can support her...”' },
                        { key: 'weeklyBabyUpdate', label: 'Partner Weekly Baby Updates', d: '📊 “Your baby is starting Week 12. Check out how tiny and adorable they are!”' },
                        { key: 'appointment', label: 'Partner Appointments Planner', d: '🩺 “Reminder: Shared clinic visit scheduled for tomorrow. Be there to support her.”' },
                        { key: 'rest', label: 'Supporting Her Rest alerts', d: '🌙 “Ask her to put her feet up this afternoon. Rest is essential right now.”' },
                        { key: 'symptomSupport', label: 'Symptoms relief tips', d: '💗 “She logged nausea. Try making her some mild ginger tea or helping with meals.”' },
                        { key: 'dueDateCountdown', label: 'Due date trackings', d: '🎀 “Interactive progress milestone checkpoints to counts together.”' },
                        { key: 'laborNear', label: 'Labor Delivery assistance', d: '🍼 “Nesting hospital bag checklist reminders and water-break contraction alerts.”' },
                        { key: 'encouragement', label: 'Helper Accolades & Love ideas', d: '💖 “Prompts reminding you to send loving affirmations or surprises today.”' },
                      ].map((item) => (
                        <div key={item.key} className="flex justify-between items-center p-3.5 bg-amber-50/10 border border-amber-100/20 rounded-2xl hover:bg-amber-50/20 pl-4 transition-all">
                          <div className="space-y-0.5 max-w-[80%]">
                            <span className="text-[11px] font-bold text-amber-950 leading-tight block">{item.label}</span>
                            <p className="text-[10px] text-amber-600 italic font-medium leading-tight">{item.d}</p>
                          </div>
                          <button 
                            onClick={() => updatePartnerPregnancyReceiveTypes(item.key as any, !settings.partnerPregnancyReceiveTypes[item.key as keyof NotificationSettings['partnerPregnancyReceiveTypes']])}
                            className={`w-9 h-5 shrink-0 rounded-full p-0.5 transition-colors duration-300 ease-in-out flex items-center ${
                              settings.partnerPregnancyReceiveTypes[item.key as keyof NotificationSettings['partnerPregnancyReceiveTypes']] ? 'bg-amber-500 justify-end' : 'bg-amber-100 justify-start'
                            }`}
                          >
                            <span className="w-4 h-4 rounded-full bg-white shadow-sm"></span>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-pink-50 space-y-6">
                  <div className="space-y-1">
                    <h4 className="font-serif text-lg text-pink-500 flex items-center gap-2 italic">
                      <span className="text-base text-pink-400">💞</span> Sync Partner Event Notifications
                    </h4>
                    <p className="text-xs text-gray-500">
                      Control companion alerts shared to your partner's workspace.
                    </p>
                  </div>

                  <div className="flex justify-between items-center p-4 bg-indigo-50/30 border border-indigo-100/40 rounded-3xl">
                    <div className="space-y-0.5">
                      <span className="text-xs font-black uppercase tracking-wider text-purple-700 flex items-center gap-1.5">
                        <UserCheck size={12} /> Allow Partner Notifications
                      </span>
                      <p className="text-[10px] text-purple-600 font-semibold">When checked, partner receives supporting synchronizations.</p>
                    </div>
                    <button 
                      onClick={() => updateSettings({ partnerNotificationsEnabled: !settings.partnerNotificationsEnabled })}
                      className={`w-12 h-6.5 rounded-full p-0.5 transition-colors duration-300 ease-in-out flex items-center ${
                        settings.partnerNotificationsEnabled ? 'bg-purple-600 justify-end' : 'bg-purple-100 justify-start'
                      }`}
                    >
                      <span className="w-5.5 h-5.5 rounded-full bg-white shadow-sm"></span>
                    </button>
                  </div>

                  {settings.partnerNotificationsEnabled && (
                    <div className="space-y-3 pt-2 animate-fadeIn grid grid-cols-1 md:grid-cols-2 gap-3 md:space-y-0">
                      <p className="text-[10px] font-black uppercase tracking-widest text-pink-500 ml-1 col-span-full">Allowed Partner Types</p>
                      {[
                        { key: 'periodStarting', label: 'Period Expected Warning', d: '“Hey she might be starting on [date], check on her...”' },
                        { key: 'periodStarted', label: 'Period Started Helper', d: '“She started today, send chocolates or comfort...”' },
                        { key: 'periodEnding', label: 'Period Ended Alert', d: '“She finished her cycle, new renewal spring...”' },
                        { key: 'ovulation', label: 'Ovulation Alert', d: '“She may be ovulating around [date]...”' },
                        { key: 'fertileWindow', label: 'Fertile Window alert', d: '“She may be in her fertile window...”' },
                        { key: 'pregnancyRisk', label: 'Educational Pregnancy Risk', d: '“Her pregnancy risk might be higher/lower...”' },
                      ].map((item) => (
                        <div key={item.key} className="flex justify-between items-center p-3 bg-purple-50/10 border border-purple-100/20 rounded-2xl hover:bg-purple-50/20 pl-4 transition-all">
                          <div className="space-y-0.5 max-w-[80%]">
                            <span className="text-[11px] font-bold text-indigo-950 leading-tight block">{item.label}</span>
                            <p className="text-[10px] text-indigo-400 italic font-medium leading-tight">{item.d}</p>
                          </div>
                          <button 
                            onClick={() => updatePartnerReceiveTypes(item.key as any, !settings.partnerReceiveTypes[item.key as keyof NotificationSettings['partnerReceiveTypes']])}
                            className={`w-9 h-5 shrink-0 rounded-full p-0.5 transition-colors duration-300 ease-in-out flex items-center ${
                              settings.partnerReceiveTypes[item.key as keyof NotificationSettings['partnerReceiveTypes']] ? 'bg-purple-500 justify-end' : 'bg-purple-100 justify-start'
                            }`}
                          >
                            <span className="w-4 h-4 rounded-full bg-white shadow-sm"></span>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Simulation Center */}
              <div className="p-8 bg-gradient-to-br from-indigo-950 via-slate-900 to-indigo-900 rounded-[2.5rem] text-white shadow-xl space-y-6 relative overflow-hidden ring-1 ring-indigo-505/20">
                <div className="absolute top-0 right-0 p-6 leading-none pointer-events-none opacity-10">
                  <Send size={150} />
                </div>
                <div className="relative z-10 space-y-1">
                  <p className="text-[9px] font-black uppercase tracking-widest text-indigo-400 flex items-center gap-1.5">
                    <Sparkles size={11} /> Companion Alert Visualizer
                  </p>
                  <h4 className="text-xl font-serif italic text-white leading-tight">Test Your companion alerts</h4>
                  <p className="text-xs text-indigo-200 leading-relaxed max-w-md">
                    Tap any cycle event below to instantly simulate a device companion notification alert. This verifies exactly how they display on your companion workspace!
                  </p>
                </div>

                <div className="relative z-10 grid grid-cols-2 gap-3 pt-2">
                  {user.isPregnancyMode ? (
                    <>
                      {/* Pregnancy simulation triggers */}
                      <button
                        type="button"
                        onClick={() => triggerPregnancySimulation('welcome', false)}
                        className="p-3 bg-white/10 hover:bg-white/15 border border-white/10 rounded-2xl text-[9px] font-bold uppercase tracking-wider text-left flex flex-col gap-1 transition-all"
                      >
                        <span>🌸 Maternal welcome</span>
                        <span className="opacity-60 italic text-[8px]">For you</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => triggerPregnancySimulation('welcome', true)}
                        className="p-3 bg-amber-500/25 hover:bg-amber-500/35 border border-amber-400/20 rounded-2xl text-[9px] font-bold uppercase tracking-wider text-left flex flex-col gap-1 transition-all"
                      >
                        <span>🌸 Co-Parent Welcome</span>
                        <span className="opacity-60 italic text-[8px] text-amber-300 font-bold">For Partner</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => triggerPregnancySimulation('weeklyBabyDev', false)}
                        className="p-3 bg-white/10 hover:bg-white/15 border border-white/10 rounded-2xl text-[9px] font-bold uppercase tracking-wider text-left flex flex-col gap-1 transition-all"
                      >
                        <span>👶 Baby Development Update</span>
                        <span className="opacity-60 italic text-[8px]">For you</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => triggerPregnancySimulation('weeklyBabyDev', true)}
                        className="p-3 bg-amber-500/25 hover:bg-amber-500/35 border border-amber-400/20 rounded-2xl text-[9px] font-bold uppercase tracking-wider text-left flex flex-col gap-1 transition-all"
                      >
                        <span>🌱 Shared Baby Updates</span>
                        <span className="opacity-60 italic text-[8px] text-amber-300 font-bold">For Partner</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => triggerPregnancySimulation('babySizeUpdate', false)}
                        className="p-3 bg-white/10 hover:bg-white/15 border border-white/10 rounded-2xl text-[9px] font-bold uppercase tracking-wider text-left flex flex-col gap-1 transition-all col-span-2"
                      >
                        <span>🥭 Baby Fruit Size Match Alert</span>
                        <span className="opacity-60 italic text-[8px]">For you</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => triggerPregnancySimulation('appointment', false)}
                        className="p-3 bg-white/10 hover:bg-white/15 border border-white/10 rounded-2xl text-[9px] font-bold uppercase tracking-wider text-left flex flex-col gap-1 transition-all"
                      >
                        <span>🩺 Doctor Appointment</span>
                        <span className="opacity-60 italic text-[8px]">For you</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => triggerPregnancySimulation('appointment', true)}
                        className="p-3 bg-amber-500/25 hover:bg-amber-500/35 border border-amber-400/20 rounded-2xl text-[9px] font-bold uppercase tracking-wider text-left flex flex-col gap-1 transition-all"
                      >
                        <span>🩺 Clinic visit sync</span>
                        <span className="opacity-60 italic text-[8px] text-amber-300 font-bold">For Partner</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => triggerPregnancySimulation('medicationVitamin', false)}
                        className="p-3 bg-white/10 hover:bg-white/15 border border-white/10 rounded-2xl text-[9px] font-bold uppercase tracking-wider text-left flex flex-col gap-1 transition-all"
                      >
                        <span>💊 Prenatal Vitamin</span>
                        <span className="opacity-60 italic text-[8px]">For you</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => triggerPregnancySimulation('hydration', false)}
                        className="p-3 bg-white/10 hover:bg-white/15 border border-white/10 rounded-2xl text-[9px] font-bold uppercase tracking-wider text-left flex flex-col gap-1 transition-all"
                      >
                        <span>💧 Water Hydration sip</span>
                        <span className="opacity-60 italic text-[8px]">For you</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => triggerPregnancySimulation('rest', false)}
                        className="p-3 bg-white/10 hover:bg-white/15 border border-white/10 rounded-2xl text-[9px] font-bold uppercase tracking-wider text-left flex flex-col gap-1 transition-all"
                      >
                        <span>🌙 Quiet Rest Reflection</span>
                        <span className="opacity-60 italic text-[8px]">For you</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => triggerPregnancySimulation('rest', true)}
                        className="p-3 bg-amber-500/25 hover:bg-amber-500/35 border border-amber-400/20 rounded-2xl text-[9px] font-bold uppercase tracking-wider text-left flex flex-col gap-1 transition-all"
                      >
                        <span>🌙 Support her quiet comfort</span>
                        <span className="opacity-60 italic text-[8px] text-amber-300 font-bold">For Partner</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => triggerPregnancySimulation('kickCounter', false)}
                        className="p-3 bg-white/10 hover:bg-white/15 border border-white/10 rounded-2xl text-[9px] font-bold uppercase tracking-wider text-left flex flex-col gap-1 transition-all"
                      >
                        <span>👣 Baby flutter kicks limit</span>
                        <span className="opacity-60 italic text-[8px]">For you</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => triggerPregnancySimulation('symptomCheck', false)}
                        className="p-3 bg-white/10 hover:bg-white/15 border border-white/10 rounded-2xl text-[9px] font-bold uppercase tracking-wider text-left flex flex-col gap-1 transition-all"
                      >
                        <span>📝 Symptom journal cue</span>
                        <span className="opacity-60 italic text-[8px]">For you</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => triggerPregnancySimulation('symptomSupport', true)}
                        className="p-3 bg-amber-500/25 hover:bg-amber-500/35 border border-amber-400/20 rounded-2xl text-[9px] font-bold uppercase tracking-wider text-left flex flex-col gap-1 transition-all col-span-2 text-center"
                      >
                        <span>💗 Symptoms support actions</span>
                        <span className="opacity-60 italic text-[8px] text-amber-300 font-bold">For Partner</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => triggerPregnancySimulation('dueDateCountdown', false)}
                        className="p-3 bg-white/10 hover:bg-white/15 border border-white/10 rounded-2xl text-[9px] font-bold uppercase tracking-wider text-left flex flex-col gap-1 transition-all"
                      >
                        <span>🎀 Due Date Countdown</span>
                        <span className="opacity-60 italic text-[8px]">For you</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => triggerPregnancySimulation('dueDateCountdown', true)}
                        className="p-3 bg-amber-500/25 hover:bg-amber-500/35 border border-amber-400/20 rounded-2xl text-[9px] font-bold uppercase tracking-wider text-left flex flex-col gap-1 transition-all"
                      >
                        <span>🎀 Milestone Countdown</span>
                        <span className="opacity-60 italic text-[8px] text-amber-300 font-bold">For Partner</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => triggerPregnancySimulation('laborNear', false)}
                        className="p-3 bg-white/10 hover:bg-white/15 border border-white/10 rounded-2xl text-[9px] font-bold uppercase tracking-wider text-left flex flex-col gap-1 transition-all"
                      >
                        <span>🍼 Nesting checklists</span>
                        <span className="opacity-60 italic text-[8px]">For you</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => triggerPregnancySimulation('laborNear', true)}
                        className="p-3 bg-amber-500/25 hover:bg-amber-500/35 border border-amber-400/20 rounded-2xl text-[9px] font-bold uppercase tracking-wider text-left flex flex-col gap-1 transition-all"
                      >
                        <span>🍼 Near delivery plan sync</span>
                        <span className="opacity-60 italic text-[8px] text-amber-300 font-bold">For Partner</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => triggerPregnancySimulation('encouragement', false)}
                        className="p-3 bg-white/10 hover:bg-white/15 border border-white/10 rounded-2xl text-[9px] font-bold uppercase tracking-wider text-left flex flex-col gap-1 transition-all"
                      >
                        <span>💖 Bloom daily affirmation</span>
                        <span className="opacity-60 italic text-[8px]">For you</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => triggerPregnancySimulation('encouragement', true)}
                        className="p-3 bg-amber-500/25 hover:bg-amber-500/35 border border-amber-400/20 rounded-2xl text-[9px] font-bold uppercase tracking-wider text-left flex flex-col gap-1 transition-all"
                      >
                        <span>💖 Love note checklist cue</span>
                        <span className="opacity-60 italic text-[8px] text-amber-300 font-bold">For Partner</span>
                      </button>

                      {/* Special Alert Buttons */}
                      <p className="text-[10px] font-serif font-black uppercase tracking-widest text-amber-400 col-span-2 text-center pt-3 border-t border-white/10">Special Pregnancy Alerts</p>

                      <button
                        type="button"
                        onClick={() => triggerPregnancySimulation('hospitalBag', false)}
                        className="p-3 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-400/20 rounded-2xl text-[9px] font-bold uppercase tracking-wider text-left flex flex-col gap-1 transition-all"
                      >
                        <span>👜 Hospital suitcase bag</span>
                        <span className="opacity-60 italic text-[8px] text-emerald-300 font-bold">Special Alert</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => triggerPregnancySimulation('contractionTimer', false)}
                        className="p-3 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-400/20 rounded-2xl text-[9px] font-bold uppercase tracking-wider text-left flex flex-col gap-1 transition-all"
                      >
                        <span>⏱️ Surge wave stopwatch</span>
                        <span className="opacity-60 italic text-[8px] text-emerald-300 font-bold">Special Alert</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => triggerPregnancySimulation('breastfeedingPrep', false)}
                        className="p-3 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-400/20 rounded-2xl text-[9px] font-bold uppercase tracking-wider text-left flex flex-col gap-1 transition-all"
                      >
                        <span>🍼 Skin feed preparation</span>
                        <span className="opacity-60 italic text-[8px] text-emerald-300 font-bold">Special Alert</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => triggerPregnancySimulation('birthPlan', false)}
                        className="p-3 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-400/20 rounded-2xl text-[9px] font-bold uppercase tracking-wider text-left flex flex-col gap-1 transition-all"
                      >
                        <span>📝 Positive birth wishes</span>
                        <span className="opacity-60 italic text-[8px] text-emerald-300 font-bold">Special Alert</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => triggerPregnancySimulation('postpartumPrep', false)}
                        className="p-3 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-400/20 rounded-2xl text-[9px] font-bold uppercase tracking-wider text-left flex flex-col gap-1 transition-all col-span-2 text-center"
                      >
                        <span>🌿 Cozy Nest Fourth Trimester Recovery</span>
                        <span className="opacity-60 italic text-[8px] text-emerald-300 font-bold">Special Alert</span>
                      </button>
                    </>
                  ) : (
                    <>
                      {/* Periodic tracker simulation triggers */}
                      <button
                        type="button"
                        onClick={() => triggerSimulation('periodStarting', false)}
                        className="p-3 bg-white/10 hover:bg-white/15 border border-white/10 rounded-2xl text-[9px] font-bold uppercase tracking-wider text-left flex flex-col gap-1 transition-all"
                      >
                        <span>🌸 Flow expected</span>
                        <span className="opacity-60 italic text-[8px]">For you</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => triggerSimulation('periodStarting', true)}
                        className="p-3 bg-purple-500/25 hover:bg-purple-500/35 border border-purple-400/20 rounded-2xl text-[9px] font-bold uppercase tracking-wider text-left flex flex-col gap-1 transition-all"
                      >
                        <span>🌸 Flow expected</span>
                        <span className="opacity-60 italic text-[8px] text-purple-300 font-bold">For Partner</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => triggerSimulation('periodStarted', false)}
                        className="p-3 bg-white/10 hover:bg-white/15 border border-white/10 rounded-2xl text-[9px] font-bold uppercase tracking-wider text-left flex flex-col gap-1 transition-all"
                      >
                        <span>🩷 Flow Started</span>
                        <span className="opacity-60 italic text-[8px]">For you</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => triggerSimulation('periodStarted', true)}
                        className="p-3 bg-purple-500/25 hover:bg-purple-500/35 border border-purple-400/20 rounded-2xl text-[9px] font-bold uppercase tracking-wider text-left flex flex-col gap-1 transition-all"
                      >
                        <span>🩷 Flow Started</span>
                        <span className="opacity-60 italic text-[8px] text-purple-300 font-bold">For Partner</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => triggerSimulation('ovulation', false)}
                        className="p-3 bg-white/10 hover:bg-white/15 border border-white/10 rounded-2xl text-[9px] font-bold uppercase tracking-wider text-left flex flex-col gap-1 transition-all"
                      >
                        <span>💖 Ovulation predicted</span>
                        <span className="opacity-60 italic text-[8px]">For you</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => triggerSimulation('ovulation', true)}
                        className="p-3 bg-purple-500/25 hover:bg-purple-500/35 border border-purple-400/20 rounded-2xl text-[9px] font-bold uppercase tracking-wider text-left flex flex-col gap-1 transition-all"
                      >
                        <span>💖 Ovulation Alert</span>
                        <span className="opacity-60 italic text-[8px] text-purple-300 font-bold">For Partner</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => triggerSimulation('pregnancyRiskHigh', false)}
                        className="p-3 bg-white/10 hover:bg-white/15 border border-white/10 rounded-2xl text-[9px] font-bold uppercase tracking-wider text-left flex flex-col gap-1 transition-all"
                      >
                        <span>🩺 Pregnancy Risk Hi</span>
                        <span className="opacity-60 italic text-[8px]">For you</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => triggerSimulation('pregnancyRiskHigh', true)}
                        className="p-3 bg-purple-500/25 hover:bg-purple-500/35 border border-purple-400/20 rounded-2xl text-[9px] font-bold uppercase tracking-wider text-left flex flex-col gap-1 transition-all"
                      >
                        <span>🩺 Pregnancy Risk Hi</span>
                        <span className="opacity-60 italic text-[8px] text-purple-300 font-bold">For Partner</span>
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-8 animate-fadeIn">
          {/* PROFILE & CYCLE CONFIGURATOR */}
          <section className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-pink-50 space-y-6">
            <h3 className="text-xl font-serif text-pink-500 flex items-center gap-2">
              <UserIcon size={20} className="text-pink-400" />
              Sanctuary Profile & Cycle Details 🌸
            </h3>
            <p className="text-xs text-gray-400 leading-relaxed font-serif italic">
               Keep your physical sanctuary metrics updated. These parameters adaptively configure predictions and botanical wellness logs.
            </p>

            <div className="space-y-5">
              {/* Display Name */}
              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-bold text-pink-400 uppercase tracking-wider flex items-center gap-1.5">
                  <UserCheck size={13} />
                  Display Name / Nickname
                </label>
                <input 
                  type="text" 
                  value={user.name || ''} 
                  onChange={(e) => {
                    const updatedUser = { ...user, name: e.target.value };
                    setUser(updatedUser);
                    localStorage.setItem('lumina_user', JSON.stringify(updatedUser));
                    syncUser(updatedUser);
                  }}
                  className="bg-pink-50/50 px-4 py-3 rounded-2xl outline-none font-medium text-xs text-pink-700 border border-pink-100 placeholder-pink-300 shadow-inner w-full focus:border-pink-300 transition-colors"
                  placeholder="e.g. Beautiful Bloom"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Cycle Length Slider */}
                <div className="bg-rose-50/30 p-5 rounded-3xl border border-rose-100/30 flex flex-col gap-2">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] font-bold text-pink-500 uppercase tracking-widest flex items-center gap-1.5">
                      <Layers size={13} />
                      Cycle Length
                    </label>
                    <span className="text-xs font-serif font-black text-pink-700">{user.cycleLength ?? 28} Days</span>
                  </div>
                  <input 
                    type="range" 
                    min="21" 
                    max="42" 
                    value={user.cycleLength ?? 28} 
                    onChange={(e) => {
                      const val = parseInt(e.target.value) || 28;
                      const updatedUser = { ...user, cycleLength: val };
                      setUser(updatedUser);
                      localStorage.setItem('lumina_user', JSON.stringify(updatedUser));
                      syncUser(updatedUser);
                    }}
                    className="w-full accent-pink-500 h-1 bg-pink-100 rounded-lg cursor-pointer mt-1"
                  />
                  <span className="text-[8px] text-gray-400 font-sans italic">Distance between active flow starts (normally 28 days)</span>
                </div>

                {/* Period Length Slider */}
                <div className="bg-rose-50/30 p-5 rounded-3xl border border-rose-100/30 flex flex-col gap-2">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] font-bold text-pink-500 uppercase tracking-widest flex items-center gap-1.5">
                      <Calendar size={13} />
                      Period Duration
                    </label>
                    <span className="text-xs font-serif font-black text-pink-700">{user.periodLength ?? 5} Days</span>
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
                    className="w-full accent-pink-500 h-1 bg-pink-100 rounded-lg cursor-pointer mt-1"
                  />
                  <span className="text-[8px] text-gray-400 font-sans italic">Expected active bleeding flow days (normally 5 days)</span>
                </div>
              </div>

              {/* Last Period Start Date */}
              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-bold text-pink-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Calendar size={13} />
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
                  className="bg-pink-50/50 px-4 py-3 rounded-2xl outline-none font-medium text-xs text-pink-700 border border-pink-100 shadow-inner w-full focus:border-pink-300 transition-colors cursor-pointer"
                />
                <span className="text-[8px] text-gray-400 italic">This anchors the beginning of your dynamic timeline predictions.</span>
              </div>
            </div>
          </section>

          {/* SECURITY & DEVICE Locking */}
          <section className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-pink-50 space-y-6">
            <h3 className="text-xl font-serif text-pink-500 flex items-center gap-2">
              <Lock size={20} className="text-pink-400" />
              🔐 Security Vault & Locker
            </h3>
            <p className="text-xs text-gray-400 leading-relaxed font-serif italic">
              Prevent unauthorized physical eyes from reading your personal medical journal logs. Enable biometric logins or customize your 4-digit device PIN.
            </p>

            <div className="space-y-5">
              {/* Biometrics Toggle */}
              <div className="bg-rose-50/30 p-5 rounded-3xl border border-rose-100/30 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <p className="text-xs font-bold text-pink-900 tracking-wide flex items-center gap-1.5 uppercase tracking-widest text-[9px]">
                      <Fingerprint size={13} className="text-pink-400" />
                      Device Biometrics & Login Persistence
                    </p>
                    <p className="text-[9px] text-gray-400 leading-none">Enable rapid biometric Face ID / Fingerprint unlock on startup</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="sr-only peer"
                      checked={!!localStorage.getItem('lumina_biometric_user')}
                      onChange={(e) => {
                        if (e.target.checked) {
                          localStorage.setItem('lumina_biometric_user', JSON.stringify(user));
                          // Trigger UI state force re-render
                          setUser({ ...user });
                        } else {
                          localStorage.removeItem('lumina_biometric_user');
                          setUser({ ...user });
                        }
                      }}
                    />
                    <div className="w-9 h-5 bg-pink-100 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-gradient-to-r peer-checked:from-pink-500 peer-checked:to-rose-400"></div>
                  </label>
                </div>

                <div className="mt-2 border-t border-rose-100/40 pt-3">
                  <div className="flex flex-col gap-1.5">
                    <span className="text-[8px] font-bold text-gray-400 uppercase tracking-widest">Enrollment Status:</span>
                    {localStorage.getItem('lumina_biometric_user') ? (
                      <span className="text-[9px] text-emerald-600 font-bold uppercase tracking-wider flex items-center gap-1">
                        ● Linked & Authorized to Device Security
                      </span>
                    ) : (
                      <span className="text-[9px] text-amber-600 font-bold uppercase tracking-wider flex items-center gap-1">
                        ○ Biometrics Disabled. Standard Password Unlock Only.
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Set custom 4-digit PIN */}
              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-bold text-pink-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Lock size={13} />
                  Safe Vault 4-Digit Security PIN
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
                    className="bg-pink-50/50 px-4 py-3 rounded-2xl outline-none font-bold text-sm tracking-[0.4em] text-pink-700 border border-pink-100 shadow-inner w-full focus:border-pink-300 transition-colors text-center"
                    placeholder="1234"
                  />
                </div>
                <span className="text-[8px] text-gray-400 italic">Used during emergency bypassing or manual dialpad lock screen access.</span>
              </div>
            </div>
          </section>

          {/* DATA EXPORT & PORTABILITY */}
          <section id="export-data" className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-pink-50 space-y-6">
            <h3 className="text-xl font-serif text-pink-500 flex items-center gap-2">
              <Download size={20} className="text-pink-400" />
              <span>Data Portability & Backups 🌸</span>
            </h3>
            
            <p className="text-xs text-gray-500 leading-relaxed font-serif italic">
              Your menstrual health, private notes, and body cycles belong solely to you. Sync across devices and download or restore your encrypted database anytime.
            </p>

            {/* Cloud Sync Backup / Restore Area */}
            <div className="p-6 bg-pink-50/25 rounded-3xl border border-pink-100/40 space-y-4 text-center sm:text-left">
              <h4 className="text-[10px] font-bold text-pink-600 uppercase tracking-widest flex items-center gap-1.5 justify-center sm:justify-start">
                <span>☁️</span> Secure Cloud Synchronization
              </h4>
              <p className="text-[10px] text-gray-400 font-serif leading-relaxed">
                Backups happen automatically in the background, but you can force an immediate sync or retrieve historical backup logs here.
              </p>

              {cloudFeedback && (
                <div className={`p-4 rounded-xl text-[10px] font-serif italic border ${cloudFeedback.type === 'success' ? 'bg-teal-50 text-teal-600 border-teal-100' : 'bg-rose-50 text-rose-500 border-rose-100'}`}>
                  {cloudFeedback.text}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <button
                  type="button"
                  id="btn-cloud-backup-now"
                  onClick={handleCloudBackupNow}
                  className="py-3 px-4 bg-pink-400 text-white font-bold rounded-2xl text-[9px] uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-sm hover:bg-pink-500 transition-all cursor-pointer"
                >
                  🚀 Sync to Cloud Now
                </button>
                <button
                  type="button"
                  id="btn-cloud-restore-now"
                  onClick={handleCloudRestoreNow}
                  className="py-3 px-4 bg-white border border-pink-200 text-pink-600 font-bold rounded-2xl text-[9px] uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-sm hover:bg-pink-50/50 transition-all cursor-pointer"
                >
                  📥 Restore from Cloud
                </button>
              </div>
            </div>

            {/* Local Export Detail */}
            <div className="space-y-3 pt-2">
              <h4 className="text-[10px] font-bold text-pink-600 uppercase tracking-widest">
                📦 Local Backup & Offline Export
              </h4>
              <button
                type="button"
                onClick={handleExportData}
                className="w-full py-4 bg-gradient-to-r from-pink-400 to-rose-450 hover:scale-[1.01] active:scale-95 text-white font-bold rounded-2xl text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 shadow-sm cursor-pointer transition-all"
              >
                <Download size={14} />
                <span>Download History Database (.JSON)</span>
              </button>
            </div>

            {/* Local File import / restore upload */}
            <div className="pt-2 space-y-4 border-t border-pink-50/40">
              <h4 className="text-[10px] font-bold text-pink-600 uppercase tracking-widest">
                ⚙️ Restore Profile from Offline JSON
              </h4>
              
              {localFeedback && (
                <div className={`p-4 rounded-xl text-[10px] font-serif italic border ${localFeedback.type === 'success' ? 'bg-teal-50 text-teal-600 border-teal-100' : 'bg-rose-50 text-rose-500 border-rose-100'}`}>
                  {localFeedback.text}
                </div>
              )}

              {/* Drag and Drop File Selection Target Box */}
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
                <p className="text-[10px] font-bold text-pink-700 uppercase tracking-wider">
                  Drag & Drop JSON File here
                </p>
                <p className="text-[8px] text-gray-400 mt-1">
                  or click to browse local files
                </p>
              </div>
            </div>
            
            <p className="text-[9px] text-gray-400 text-center italic">
              All import, export and mapping calculations operate on-device inside sandboxed memory, protecting your records.
            </p>
          </section>

          {/* SANCTUARY LOGOUT */}
          {onLogout && (
            <section className="bg-rose-50/40 p-6 rounded-[2.5rem] border border-rose-100/30 flex flex-col items-center gap-4 text-center">
              <div className="space-y-1">
                <h4 className="text-pink-900 font-serif font-black italic text-base">Lock & Leave Sanctuary</h4>
                <p className="text-[10px] text-gray-400 leading-normal max-w-[280px]">
                  Logging out of the current device closes all session bindings. You can re-enter secure profiles via email, Google or device credentials anytime.
                </p>
              </div>
              <button
                type="button"
                onClick={onLogout}
                className="px-8 py-3.5 bg-gradient-to-r from-pink-500 to-rose-450 hover:opacity-90 active:scale-95 text-white font-bold rounded-2xl text-[9px] uppercase tracking-widest flex items-center gap-2 shadow-md shadow-pink-150 cursor-pointer transition-all"
              >
                <LogOut size={13} />
                🚪 Exit Sanctuary Profile
              </button>
            </section>
          )}

          {/* Publishing Information Section */}
          <section className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-pink-50">
            <h3 className="text-xl font-serif text-pink-500 mb-6 flex items-center gap-2">
               <span className="text-2xl">📲</span> Store Publishing Guide
            </h3>
            <div className="space-y-4 text-sm text-gray-500 italic leading-relaxed">
              <p>Lumina is currently a <strong>Progressive Web App (PWA)</strong>. To see it on your home screen:</p>
              <div className="bg-pink-50 p-4 rounded-2xl border border-pink-100">
                <p className="font-bold text-pink-600 mb-2">For iPhone (Safari):</p>
                <p>1. Tap the <span className="font-bold">Share</span> button (square with arrow).</p>
                <p>2. Scroll down and tap <span className="font-bold">"Add to Home Screen"</span>.</p>
                <p>3. Tap <span className="font-bold">Add</span> in the top right.</p>
              </div>
              <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100">
                <p className="font-bold text-blue-600 mb-2">For Android (Chrome):</p>
                <p>1. Tap the <span className="font-bold">Menu</span> (three dots) in the top right.</p>
                <p>2. Tap <span className="font-bold">"Install App"</span> or <span className="font-bold">"Add to Home Screen"</span>.</p>
              </div>
            </div>
          </section>

          {/* Siri Google Assistant */}
          <section className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-pink-50">
            <h3 className="text-xl font-serif text-pink-500 mb-6 flex items-center gap-2">
               <span className="text-2xl">🎙️</span> Siri & Google Assistant
            </h3>
            <p className="text-sm text-gray-500 italic mb-4">Once you add Lumina to your Home Screen, you can simply say:</p>
            <div className="p-6 bg-gradient-to-r from-pink-400 to-rose-300 rounded-3xl text-white text-center shadow-lg shadow-pink-100">
              <p className="text-lg font-serif italic">"Hey Siri, open Lumina"</p>
            </div>
            <p className="text-[10px] text-pink-300 font-bold uppercase mt-4 text-center tracking-widest">Instant Sanctuary Access</p>
          </section>
        </div>
      )}
    </div>
  );
};

export default Settings;
