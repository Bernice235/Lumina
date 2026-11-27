import React, { useEffect, useState } from 'react';
import { User, AppTheme, Symptom, NotificationSettings, AvatarId, SkinTone, UserAvatar } from '../types';
import { THEMES } from '../constants';
import { motion, AnimatePresence } from 'framer-motion';
import { AvatarVisual } from './AvatarVisual';
import { AVATAR_PRESETS, SKIN_TONE_PALETTES } from '../services/avatarService';
import { getAvatarIntroduction, playAvatarIntroduction, stopWelcomeVoice } from '../services/welcomeVoiceService';
import { 
  Sparkles, 
  Calendar, 
  ChevronRight, 
  ChevronLeft, 
  Heart, 
  Check, 
  User as UserIcon, 
  Smile, 
  Bell, 
  Clock, 
  RefreshCw, 
  Sparkle, 
  ShieldCheck, 
  Activity, 
  Droplets,
  Music,
  Moon,
  PenTool,
  Wind,
  Plus,
  Volume2,
  VolumeX
} from 'lucide-react';

import { syncUser } from '../services/firebaseService';
import { trackCompleteOnboarding } from '../services/analyticsService';
import { saveEncryptedSessionUser, secureStorage } from '../services/secureStorage';

interface OnboardingWizardProps {
  user: User;
  setUser: React.Dispatch<React.SetStateAction<User | null>>;
  onComplete: (user: User) => void;
}

export const OnboardingWizard: React.FC<OnboardingWizardProps> = ({ user, setUser, onComplete }) => {
  const [step, setStep] = useState(1);
  const totalSteps = 12;

  // Local values prefilled with user defaults if available
  const [name, setName] = useState(user.firstName || user.name || '');
  const [dob, setDob] = useState(user.dob || '');

  // Avatar selection states
  const [selectedAvatarId, setSelectedAvatarId] = useState<AvatarId>(user.avatar?.id || 'amara');
  const [selectedSkinTone, setSelectedSkinTone] = useState<SkinTone>(user.avatar?.skinTone || 'amber');
  const [isCompanionWaving, setIsCompanionWaving] = useState<boolean>(false);
  const [isCompanionSpeaking, setIsCompanionSpeaking] = useState<boolean>(false);

  const handleSelectAvatarWithVoice = (id: AvatarId) => {
    setSelectedAvatarId(id);
    const preset = AVATAR_PRESETS[id];
    if (preset) {
      setSelectedSkinTone(preset.skinTone);
    }
    // Trigger animated wave and speech
    setIsCompanionWaving(true);
    setTimeout(() => setIsCompanionWaving(false), 2800);

    playAvatarIntroduction(
      id, 
      { firstName: name?.trim() || 'friend' },
      {
        accent: preset?.defaultAccent,
        personality: preset?.defaultPersonality,
        onStart: () => setIsCompanionSpeaking(true),
        onEnd: () => setIsCompanionSpeaking(false)
      }
    ).catch(() => {});
  };
  
  const [lastPeriodStart, setLastPeriodStart] = useState(() => {
    if (user.lastPeriodStart) {
      return user.lastPeriodStart.split('T')[0];
    }
    return new Date().toISOString().split('T')[0];
  });

  const [cycleLength, setCycleLength] = useState<number>(user.cycleLength || 28);
  const [periodLength, setPeriodLength] = useState<number>(user.periodLength || 5);

  // Seed Wellness goals from saved user preferences if returning to wizard
  const KNOWN_GOALS = [
    'Understanding my cycle',
    'Period tracking',
    'Tracking fertility',
    'Hormone balance',
    'Mental wellness',
    'Pregnancy preparation',
  ];
  const KNOWN_SANCTUARY = ['Music', 'Meditation', 'Breathing exercises', 'Journaling', 'Yoga tutorials'];

  const [wellnessGoals, setWellnessGoals] = useState<string[]>(() => {
    const saved = (user.wellnessPreferences || []).filter((p) => KNOWN_GOALS.includes(p));
    return saved.length > 0 ? saved : ['Understanding my cycle', 'Period tracking'];
  });

  // Reminders preferences seeded from user.notificationSettings if present
  const [reminders, setReminders] = useState<string[]>(() => {
    const ns = user.notificationSettings;
    if (!ns) return ['Period reminders', 'Ovulation reminders'];
    const list: string[] = [];
    if (ns.types?.periodStarting || ns.types?.periodStarted) list.push('Period reminders');
    if (ns.types?.ovulation || ns.types?.fertileWindow) list.push('Ovulation reminders');
    if (ns.pregnancyTypes?.medicationVitamin) list.push('Medication reminders');
    if (ns.pregnancyTypes?.hydration) list.push('Water reminders');
    return list.length > 0 ? list : ['Period reminders', 'Ovulation reminders'];
  });

  // Partner mode preference seeded if previously set
  const [partnerMode, setPartnerMode] = useState<'yes' | 'no' | null>(() => {
    if (user.notificationSettings?.partnerNotificationsEnabled === true) return 'yes';
    if (user.notificationSettings?.partnerNotificationsEnabled === false) return 'no';
    return null;
  });

  // Sanctuary preferences seeded from saved preferences
  const [sanctuaryPrefs, setSanctuaryPrefs] = useState<string[]>(() => {
    const saved = (user.wellnessPreferences || []).filter((p) => KNOWN_SANCTUARY.includes(p));
    return saved.length > 0 ? saved : ['Music', 'Meditation', 'Breathing exercises'];
  });

  // Notification permissions
  const [notificationsAllowed, setNotificationsAllowed] = useState<boolean | null>(() =>
    typeof user.notificationSettings?.enabled === 'boolean' ? user.notificationSettings.enabled : null
  );

  // Restore any interrupted encrypted draft so step/answers never fluctuate across refreshes
  useEffect(() => {
    let active = true;
    secureStorage.getItem(`onboarding_draft_${user.id}`).then((raw) => {
      if (!active || !raw) return;
      try {
        const d = JSON.parse(raw);
        if (typeof d.step === 'number' && d.step >= 1 && d.step <= totalSteps) setStep(d.step);
        if (typeof d.name === 'string' && d.name.trim()) setName(d.name);
        if (typeof d.dob === 'string') setDob(d.dob);
        if (d.selectedAvatarId) setSelectedAvatarId(d.selectedAvatarId);
        if (d.selectedSkinTone) setSelectedSkinTone(d.selectedSkinTone);
        if (typeof d.lastPeriodStart === 'string') setLastPeriodStart(d.lastPeriodStart);
        if (typeof d.cycleLength === 'number') setCycleLength(d.cycleLength);
        if (typeof d.periodLength === 'number') setPeriodLength(d.periodLength);
        if (Array.isArray(d.wellnessGoals)) setWellnessGoals(d.wellnessGoals);
        if (Array.isArray(d.reminders)) setReminders(d.reminders);
        if (d.partnerMode === 'yes' || d.partnerMode === 'no') setPartnerMode(d.partnerMode);
        if (Array.isArray(d.sanctuaryPrefs)) setSanctuaryPrefs(d.sanctuaryPrefs);
        if (typeof d.notificationsAllowed === 'boolean') setNotificationsAllowed(d.notificationsAllowed);
      } catch {}
    }).catch(() => {});
    return () => { active = false; };
  }, [user.id]);

  useEffect(() => {
    const draft = {
      step,
      name,
      dob,
      selectedAvatarId,
      selectedSkinTone,
      lastPeriodStart,
      cycleLength,
      periodLength,
      wellnessGoals,
      reminders,
      partnerMode,
      sanctuaryPrefs,
      notificationsAllowed,
    };
    secureStorage.setItem(`onboarding_draft_${user.id}`, JSON.stringify(draft)).catch(() => {});
  }, [
    user.id,
    step,
    name,
    dob,
    selectedAvatarId,
    selectedSkinTone,
    lastPeriodStart,
    cycleLength,
    periodLength,
    wellnessGoals,
    reminders,
    partnerMode,
    sanctuaryPrefs,
    notificationsAllowed,
  ]);

  // error state
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleNext = () => {
    // Validation for Step 2
    if (step === 2 && !name.trim()) {
      setValidationError("Please share your name so we can personalize your experience.");
      return;
    }
    setValidationError(null);

    if (step < totalSteps) {
      setStep(step + 1);
    } else {
      handleFinish();
    }
  };

  const handleBack = () => {
    setValidationError(null);
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const handleFinish = () => {
    // Calculate age from DOB if present
    let calculatedAge = user.age || 25;
    if (dob) {
      const birthDate = new Date(dob);
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
      if (age > 0 && age < 120) {
        calculatedAge = age;
      }
    }

    // Populate notification settings based on choices
    const finalRemindersEnabled = notificationsAllowed === true;

    const preset = AVATAR_PRESETS[selectedAvatarId] || AVATAR_PRESETS.amara;
    const initialAvatar: UserAvatar = user.avatar ? {
      ...user.avatar,
      id: selectedAvatarId,
      name: preset.name,
      title: preset.title,
      personality: preset.personality,
      skinTone: selectedSkinTone
    } : {
      id: selectedAvatarId,
      name: preset.name,
      title: preset.title,
      personality: preset.personality,
      skinTone: selectedSkinTone,
      hairstyle: preset.hairstyle,
      headwrap: preset.headwrap,
      glasses: preset.glasses,
      outfit: preset.outfit,
      tier: 'seedling',
      level: 1,
      xp: 0,
      wellnessStreak: 1,
      selfCareScore: 78,
      unlockedOutfits: ['floral_sundress', 'cozy_kimono', 'linen_loungewear', 'athleisure_wrap'],
      unlockedAccessories: ['floral_crown', 'minimal_band', 'round'],
      actionHistory: []
    };

    // Create updated user object
    const updatedUser: User = {
      ...user,
      name: name.trim(),
      firstName: name.trim(),
      displayName: name.trim(),
      dob: dob || undefined,
      age: calculatedAge,
      avatar: initialAvatar,
      cycleLength: cycleLength,
      periodLength: periodLength,
      lastPeriodStart: new Date(lastPeriodStart).toISOString(),
      wellnessPreferences: [...new Set([...wellnessGoals, ...sanctuaryPrefs])],
      onboardingCompleted: true,
      notificationSettings: {
        enabled: finalRemindersEnabled,
        toneStyle: 'aesthetic',
        reminderDaysBefore: 2,
        quietHours: { enabled: false, startTime: '22:00', endTime: '07:00' },
        types: {
          periodStarting: reminders.includes('Period reminders'),
          periodStarted: reminders.includes('Period reminders'),
          periodEnding: reminders.includes('Period reminders'),
          ovulation: reminders.includes('Ovulation reminders'),
          fertileWindow: reminders.includes('Ovulation reminders'),
          lutealPhase: true,
          pregnancyRisk: true
        },
        partnerNotificationsEnabled: partnerMode === 'yes',
        partnerReceiveTypes: {
          periodStarting: true,
          periodStarted: true,
          periodEnding: true,
          ovulation: true,
          fertileWindow: true,
          pregnancyRisk: true
        },
        pregnancyEnabled: false,
        partnerPregnancyEnabled: false,
        pregnancyReminderTime: '09:00',
        pregnancyTypes: {
          welcome: true,
          weeklyBabyDev: true,
          babySizeUpdate: true,
          appointment: true,
          medicationVitamin: reminders.includes('Medication reminders'),
          hydration: reminders.includes('Water reminders'),
          rest: true,
          kickCounter: true,
          symptomCheck: true,
          dueDateCountdown: true,
          laborNear: true,
          encouragement: true,
          hospitalBag: true,
          contractionTimer: true,
          breastfeedingPrep: true,
          birthPlan: true,
          postpartumPrep: true
        },
        partnerPregnancyReceiveTypes: {
          welcome: true,
          weeklyBabyDev: true,
          appointment: true,
          rest: true,
          symptomSupport: true,
          dueDateCountdown: true,
          laborNear: true,
          encouragement: true
        }
      }
    };

    setUser(updatedUser);
    const rememberPref = localStorage.getItem('lumina_remember_me') !== 'false';
    void saveEncryptedSessionUser(updatedUser, rememberPref);
    if (updatedUser.email) {
      void secureStorage.setItem('offline_user_' + updatedUser.email.toLowerCase().trim(), JSON.stringify(updatedUser));
    }
    void secureStorage.removeItem(`onboarding_draft_${user.id}`).catch(() => {});
    syncUser(updatedUser);
    trackCompleteOnboarding(false);
    onComplete(updatedUser);
  };

  const toggleGoal = (goal: string) => {
    if (wellnessGoals.includes(goal)) {
      setWellnessGoals(wellnessGoals.filter(g => g !== goal));
    } else {
      setWellnessGoals([...wellnessGoals, goal]);
    }
  };

  const toggleReminder = (reminder: string) => {
    if (reminders.includes(reminder)) {
      setReminders(reminders.filter(r => r !== reminder));
    } else {
      setReminders([...reminders, reminder]);
    }
  };

  const toggleSanctuary = (pref: string) => {
    if (sanctuaryPrefs.includes(pref)) {
      setSanctuaryPrefs(sanctuaryPrefs.filter(p => p !== pref));
    } else {
      setSanctuaryPrefs([...sanctuaryPrefs, pref]);
    }
  };

  const currentThemeInfo = THEMES[user.theme || 'rose'];

  const slideVariants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 100 : -100,
      opacity: 0,
      scale: 0.98
    }),
    center: {
      x: 0,
      opacity: 1,
      scale: 1,
      transition: {
        x: { type: 'spring' as const, stiffness: 350, damping: 35 },
        opacity: { duration: 0.2 },
        scale: { duration: 0.2 }
      }
    },
    exit: (direction: number) => ({
      x: direction < 0 ? 100 : -100,
      opacity: 0,
      scale: 0.98,
      transition: {
        x: { type: 'spring' as const, stiffness: 350, damping: 35 },
        opacity: { duration: 0.15 },
        scale: { duration: 0.15 }
      }
    })
  };

  return (
    <div id="onboarding_container" className="min-h-screen bg-[#faf8f6] dark:bg-[#11100f] flex items-center justify-center p-4 sm:p-6 transition-colors duration-300 font-sans">
      <div id="onboarding_card" className="bg-white dark:bg-[#1a1816] px-6 py-7 sm:p-10 rounded-2xl shadow-sm border border-stone-200/80 dark:border-[#2e2a26] w-full max-w-xl flex flex-col justify-between min-h-[560px] relative transition-all">
        
        {/* Step progress header */}
        <div className="space-y-3">
          <div className="flex justify-between items-center text-xs font-medium text-stone-500 dark:text-stone-400">
            <span className="font-semibold text-pink-700 dark:text-pink-400 tracking-wide text-xs">
              Sanctuary setup
            </span>
            <span className="tabular-nums font-medium text-stone-600 dark:text-stone-300">
              Step {step} of {totalSteps}
            </span>
          </div>
          
          <div className="w-full h-1.5 bg-stone-100 dark:bg-[#23201d] rounded-full overflow-hidden">
            <motion.div 
              className="h-full bg-pink-600 rounded-full"
              initial={{ width: '0%' }}
              animate={{ width: `${(step / totalSteps) * 100}%` }}
              transition={{ type: 'spring', stiffness: 120, damping: 20 }}
            />
          </div>
        </div>

        {/* Step display container */}
        <div className="my-6 flex-grow flex flex-col justify-center min-h-[340px]">
          <AnimatePresence mode="wait" custom={step}>
            
            {/* STEP 1: Welcome */}
            {step === 1 && (
              <motion.div
                key="step1"
                initial="enter"
                animate="center"
                exit="exit"
                custom={1}
                variants={slideVariants}
                className="space-y-5 text-center"
                id="onboarding_step_1"
              >
                <div className="flex justify-center">
                  <div className="w-16 h-16 rounded-2xl bg-pink-50 border border-pink-200/70 flex items-center justify-center text-pink-600">
                    <Sparkles size={28} strokeWidth={1.75} />
                  </div>
                </div>
                <div className="space-y-2">
                  <h1 className="text-3xl sm:text-4xl font-serif text-stone-900 dark:text-stone-100 font-semibold tracking-tight leading-tight">
                    Welcome to Lumina
                  </h1>
                  <p className="text-sm sm:text-base text-stone-600 dark:text-stone-400 max-w-md mx-auto leading-relaxed">
                    Let&apos;s tailor your cycle predictions, wellness reminders, and personal companion in a few quick steps.
                  </p>
                </div>
              </motion.div>
            )}

            {/* STEP 2: Personal Information */}
            {step === 2 && (
              <motion.div
                key="step2"
                initial="enter"
                animate="center"
                exit="exit"
                custom={1}
                variants={slideVariants}
                className="space-y-5"
                id="onboarding_step_2"
              >
                <div className="space-y-2 text-center md:text-left">
                  <div className="inline-flex w-11 h-11 rounded-xl bg-pink-50 dark:bg-pink-950/30 border border-pink-200/70 dark:border-pink-900/50 items-center justify-center text-pink-600 dark:text-pink-400 mb-1">
                    <UserIcon size={20} />
                  </div>
                  <h2 className="text-2xl font-serif text-stone-900 dark:text-stone-100 font-semibold">
                    What should we call you?
                  </h2>
                  <p className="text-sm text-stone-500 dark:text-stone-400">
                    Tell us your name and optionally your birthday to tailor predictions.
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-stone-700 dark:text-stone-300">First name</label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => {
                        setName(e.target.value);
                        if (validationError) setValidationError(null);
                      }}
                      placeholder="e.g. Sarah"
                      className="w-full h-11 bg-[#faf8f6] dark:bg-[#23201d] border border-stone-200/80 dark:border-[#342f2b] px-4 rounded-xl text-sm font-medium text-stone-900 dark:text-stone-100 outline-none focus:border-pink-500 transition-colors"
                      autoFocus
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-stone-700 dark:text-stone-300">Date of birth <span className="text-stone-400 dark:text-stone-500 font-normal">(Optional)</span></label>
                    <input
                      type="date"
                      value={dob}
                      onChange={(e) => setDob(e.target.value)}
                      className="w-full h-11 bg-[#faf8f6] dark:bg-[#23201d] border border-stone-200/80 dark:border-[#342f2b] px-4 rounded-xl text-sm font-medium text-stone-900 dark:text-stone-100 outline-none focus:border-pink-500 transition-colors tabular-nums"
                    />
                  </div>

                  {validationError && (
                    <p className="text-xs text-rose-600 dark:text-rose-400 font-medium">
                      {validationError}
                    </p>
                  )}
                </div>
              </motion.div>
            )}

            {/* STEP 3: Choose Your Wellness Avatar Companion */}
            {step === 3 && (
              <motion.div
                key="step3"
                initial="enter"
                animate="center"
                exit="exit"
                custom={1}
                variants={slideVariants}
                className="space-y-4"
                id="onboarding_step_3"
              >
                <div className="space-y-1 text-center md:text-left">
                  <div className="inline-flex w-11 h-11 rounded-xl bg-pink-50 dark:bg-pink-950/30 border border-pink-200/70 dark:border-pink-900/50 items-center justify-center text-pink-600 dark:text-pink-400 mb-1">
                    <Sparkles size={20} />
                  </div>
                  <h2 className="text-2xl font-serif text-stone-900 dark:text-stone-100 font-semibold">
                    Choose your companion
                  </h2>
                  <p className="text-sm text-stone-500 dark:text-stone-400">
                    Select a visual companion to encourage, guide, and walk with you every day.
                  </p>
                </div>

                {/* Preview Box */}
                <div className="bg-[#faf8f6] dark:bg-[#23201d] p-4 sm:p-5 rounded-2xl border border-stone-200/80 dark:border-[#342f2b] flex flex-col sm:flex-row items-center gap-4 text-left relative">
                  <div className="shrink-0 relative">
                    <AvatarVisual
                      avatar={{
                        id: selectedAvatarId,
                        name: AVATAR_PRESETS[selectedAvatarId]?.name,
                        skinTone: selectedSkinTone,
                        hairstyle: AVATAR_PRESETS[selectedAvatarId]?.hairstyle,
                        headwrap: AVATAR_PRESETS[selectedAvatarId]?.headwrap,
                        glasses: AVATAR_PRESETS[selectedAvatarId]?.glasses,
                        outfit: AVATAR_PRESETS[selectedAvatarId]?.outfit,
                        mood: 'radiant'
                      }}
                      size="xl"
                      showMoodBadge
                      isSpeaking={isCompanionSpeaking}
                      isWaving={isCompanionWaving}
                      interactive
                      onClick={() => handleSelectAvatarWithVoice(selectedAvatarId)}
                    />
                    <button
                      type="button"
                      onClick={() => handleSelectAvatarWithVoice(selectedAvatarId)}
                      className="absolute -bottom-2 -right-2 px-2.5 py-1 rounded-lg bg-pink-600 hover:bg-pink-700 text-white text-[11px] font-semibold shadow-sm flex items-center gap-1 transition-colors cursor-pointer whitespace-nowrap"
                      title="Tap to preview companion voice"
                    >
                      {isCompanionSpeaking ? <VolumeX className="w-3 h-3" /> : <Volume2 className="w-3 h-3" />}
                      <span>{isCompanionSpeaking ? 'Speaking' : 'Greet'}</span>
                    </button>
                  </div>

                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <h4 className="font-serif font-semibold text-base text-stone-900 dark:text-stone-100">
                        {AVATAR_PRESETS[selectedAvatarId]?.name} · {AVATAR_PRESETS[selectedAvatarId]?.title}
                      </h4>
                      <span className="text-[11px] font-medium text-pink-700 dark:text-pink-300 bg-white dark:bg-[#1a1816] px-2.5 py-0.5 rounded-lg border border-stone-200/80 dark:border-[#2e2a26]">
                        {AVATAR_PRESETS[selectedAvatarId]?.defaultPersonality}
                      </span>
                    </div>

                    {/* Interactive Introduction Speech Bubble */}
                    <div className="bg-white dark:bg-[#1a1816] p-3 rounded-xl border border-stone-200/80 dark:border-[#2e2a26] relative">
                      <p className="text-xs text-stone-700 dark:text-stone-300 font-medium leading-relaxed">
                        &ldquo;{getAvatarIntroduction(selectedAvatarId, name?.trim() || 'friend', AVATAR_PRESETS[selectedAvatarId]?.defaultPersonality).displayText}&rdquo;
                      </p>
                      
                      <div className="flex items-center justify-between gap-2 mt-2 pt-2 border-t border-stone-100 dark:border-[#2e2a26] text-xs">
                        <button
                          type="button"
                          onClick={() => {
                            if (isCompanionSpeaking) {
                              stopWelcomeVoice();
                              setIsCompanionSpeaking(false);
                            } else {
                              handleSelectAvatarWithVoice(selectedAvatarId);
                            }
                          }}
                          className="flex items-center gap-1.5 font-semibold text-pink-600 dark:text-pink-400 hover:text-pink-700 cursor-pointer whitespace-nowrap"
                        >
                          {isCompanionSpeaking ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                          <span>{isCompanionSpeaking ? 'Stop voice' : 'Hear introduction'}</span>
                        </button>
                        <span className="text-[11px] text-stone-500 dark:text-stone-400 truncate">
                          {AVATAR_PRESETS[selectedAvatarId]?.bio}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Companions Grid */}
                <div className="grid grid-cols-3 gap-2">
                  {(Object.keys(AVATAR_PRESETS) as AvatarId[]).map((id) => {
                    const preset = AVATAR_PRESETS[id];
                    const isSelected = selectedAvatarId === id;
                    return (
                      <button
                        key={id}
                        type="button"
                        onClick={() => handleSelectAvatarWithVoice(id)}
                        className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer relative ${
                          isSelected
                            ? 'bg-pink-50/70 dark:bg-pink-950/30 border-pink-500 ring-1 ring-pink-500/40'
                            : 'bg-white dark:bg-[#23201d] border-stone-200/80 dark:border-[#342f2b] hover:border-pink-300'
                        }`}
                      >
                        <AvatarVisual
                          avatar={{
                            id,
                            skinTone: preset.skinTone,
                            hairstyle: preset.hairstyle,
                            headwrap: preset.headwrap,
                            glasses: preset.glasses,
                            outfit: preset.outfit,
                            mood: 'radiant'
                          }}
                          size="sm"
                          className="mx-auto mb-1"
                        />
                        <span className="font-serif font-semibold text-xs text-stone-900 dark:text-stone-100 block truncate">
                          {preset.name}
                        </span>
                        <span className="text-[11px] text-pink-600 dark:text-pink-400 font-medium block truncate">
                          {preset.title.split('The ')[1] || preset.title}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Skin Tone Selector */}
                <div className="space-y-1.5 pt-1">
                  <label className="text-xs font-semibold text-stone-600 dark:text-stone-400 block text-left">
                    Preferred skin tone
                  </label>
                  <div className="flex gap-2 justify-center sm:justify-start overflow-x-auto pb-1">
                    {(Object.keys(SKIN_TONE_PALETTES) as SkinTone[]).map((tone) => (
                      <button
                        key={tone}
                        type="button"
                        onClick={() => setSelectedSkinTone(tone)}
                        className={`w-6 h-6 rounded-full border-2 transition-all cursor-pointer shrink-0 ${
                          selectedSkinTone === tone ? 'border-pink-600 ring-2 ring-pink-300/60' : 'border-white dark:border-[#2e2a26]'
                        }`}
                        style={{ backgroundColor: SKIN_TONE_PALETTES[tone].base }}
                        title={SKIN_TONE_PALETTES[tone].label}
                      />
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {/* STEP 4: Cycle Information */}
            {step === 4 && (
              <motion.div
                key="step4"
                initial="enter"
                animate="center"
                exit="exit"
                custom={1}
                variants={slideVariants}
                className="space-y-5 text-center md:text-left"
                id="onboarding_step_4"
              >
                <div className="space-y-2">
                  <div className="inline-flex w-11 h-11 rounded-xl bg-pink-50 dark:bg-pink-950/30 border border-pink-200/70 dark:border-pink-900/50 items-center justify-center text-pink-600 dark:text-pink-400 mb-1">
                    <Calendar size={20} />
                  </div>
                  <h2 className="text-2xl font-serif text-stone-900 dark:text-stone-100 font-semibold">
                    When did your last period start?
                  </h2>
                  <p className="text-sm text-stone-500 dark:text-stone-400">
                    Your previous period start date is the foundation of your cycle forecasting.
                  </p>
                </div>

                <div className="p-5 bg-[#faf8f6] dark:bg-[#23201d] rounded-2xl border border-stone-200/80 dark:border-[#342f2b] space-y-3">
                  <input
                    type="date"
                    max={new Date().toISOString().split('T')[0]}
                    value={lastPeriodStart}
                    onChange={(e) => setLastPeriodStart(e.target.value)}
                    className="w-full h-11 bg-white dark:bg-[#1a1816] px-4 border border-stone-200/80 dark:border-[#342f2b] rounded-xl text-sm font-semibold text-stone-900 dark:text-stone-100 outline-none focus:border-pink-500 text-center cursor-pointer tabular-nums"
                  />
                  <p className="text-xs text-stone-500 dark:text-stone-400">
                    Select the calendar date your last flow began.
                  </p>
                </div>
              </motion.div>
            )}

            {/* STEP 5: Cycle Length */}
            {step === 5 && (
              <motion.div
                key="step5"
                initial="enter"
                animate="center"
                exit="exit"
                custom={1}
                variants={slideVariants}
                className="space-y-5"
                id="onboarding_step_5"
              >
                <div className="space-y-2 text-center md:text-left">
                  <div className="inline-flex w-11 h-11 rounded-xl bg-pink-50 dark:bg-pink-950/30 border border-pink-200/70 dark:border-pink-900/50 items-center justify-center text-pink-600 dark:text-pink-400 mb-1">
                    <RefreshCw size={20} />
                  </div>
                  <h2 className="text-2xl font-serif text-stone-900 dark:text-stone-100 font-semibold">
                    How long is your average cycle?
                  </h2>
                  <p className="text-sm text-stone-500 dark:text-stone-400">
                    The number of days between the start of one period and the start of the next.
                  </p>
                </div>

                <div className="grid grid-cols-3 gap-2.5 max-h-[250px] overflow-y-auto pr-1 pb-1">
                  {Array.from({ length: 15 }, (_, i) => 21 + i).map((days) => (
                    <button
                      key={days}
                      type="button"
                      onClick={() => setCycleLength(days)}
                      className={`p-3 border rounded-xl flex flex-col items-center justify-center text-center transition-all cursor-pointer tabular-nums ${
                        cycleLength === days
                          ? 'border-pink-600 bg-pink-50/70 dark:bg-pink-950/30 text-pink-900 dark:text-pink-200 font-semibold'
                          : 'border-stone-200/80 dark:border-[#342f2b] bg-[#faf8f6] dark:bg-[#23201d] text-stone-700 dark:text-stone-300 hover:border-pink-300'
                      }`}
                    >
                      <span className="text-xs font-semibold">{days} days</span>
                      {days === 28 && (
                        <span className="text-[10px] text-pink-600 dark:text-pink-400 font-medium mt-0.5">Typical</span>
                      )}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            {/* STEP 6: Period Length */}
            {step === 6 && (
              <motion.div
                key="step6"
                initial="enter"
                animate="center"
                exit="exit"
                custom={1}
                variants={slideVariants}
                className="space-y-5"
                id="onboarding_step_6"
              >
                <div className="space-y-2 text-center md:text-left">
                  <div className="inline-flex w-11 h-11 rounded-xl bg-pink-50 dark:bg-pink-950/30 border border-pink-200/70 dark:border-pink-900/50 items-center justify-center text-pink-600 dark:text-pink-400 mb-1">
                    <Droplets size={20} />
                  </div>
                  <h2 className="text-2xl font-serif text-stone-900 dark:text-stone-100 font-semibold">
                    How many days does your period usually last?
                  </h2>
                  <p className="text-sm text-stone-500 dark:text-stone-400">
                    Typical bleeding flow lasts between 2 and 10 days.
                  </p>
                </div>

                <div className="grid grid-cols-3 gap-2.5 max-h-[250px] overflow-y-auto pr-1 pb-1">
                  {Array.from({ length: 9 }, (_, i) => 2 + i).map((days) => (
                    <button
                      key={days}
                      type="button"
                      onClick={() => setPeriodLength(days)}
                      className={`p-4 border rounded-xl flex flex-col items-center justify-center text-center transition-all cursor-pointer tabular-nums ${
                        periodLength === days
                          ? 'border-pink-600 bg-pink-50/70 dark:bg-pink-950/30 text-pink-900 dark:text-pink-200 font-semibold'
                          : 'border-stone-200/80 dark:border-[#342f2b] bg-[#faf8f6] dark:bg-[#23201d] text-stone-700 dark:text-stone-300 hover:border-pink-300'
                      }`}
                    >
                      <span className="text-xs font-semibold">{days} days</span>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            {/* STEP 7: Wellness Goals */}
            {step === 7 && (
              <motion.div
                key="step7"
                initial="enter"
                animate="center"
                exit="exit"
                custom={1}
                variants={slideVariants}
                className="space-y-5"
                id="onboarding_step_7"
              >
                <div className="space-y-2 text-center md:text-left">
                  <div className="inline-flex w-11 h-11 rounded-xl bg-pink-50 dark:bg-pink-950/30 border border-pink-200/70 dark:border-pink-900/50 items-center justify-center text-pink-600 dark:text-pink-400 mb-1">
                    <Activity size={20} />
                  </div>
                  <h2 className="text-2xl font-serif text-stone-900 dark:text-stone-100 font-semibold">
                    What would you like help with?
                  </h2>
                  <p className="text-sm text-stone-500 dark:text-stone-400">
                    Select all that apply to personalize your sanctuary journey.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2 max-h-[240px] overflow-y-auto pr-1 pb-1">
                  {[
                    'Understanding my cycle',
                    'Period tracking',
                    'Fertility awareness',
                    'Symptom tracking',
                    'Mood tracking',
                    'Better sleep',
                    'Drinking more water',
                    'Exercise consistency',
                    'Stress management',
                    'Self-care'
                  ].map((goal) => {
                    const isSel = wellnessGoals.includes(goal);
                    return (
                      <button
                        key={goal}
                        type="button"
                        onClick={() => toggleGoal(goal)}
                        className={`p-3 border rounded-xl flex items-center justify-between text-left transition-all cursor-pointer ${
                          isSel
                            ? 'border-pink-500 bg-pink-50/70 dark:bg-pink-950/30 text-pink-900 dark:text-pink-200 font-semibold'
                            : 'border-stone-200/80 dark:border-[#342f2b] bg-[#faf8f6] dark:bg-[#23201d] text-stone-700 dark:text-stone-300 hover:border-pink-300'
                        }`}
                      >
                        <span className="text-xs font-medium pr-1">{goal}</span>
                        <div className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${
                          isSel ? 'bg-pink-600 border-pink-600 text-white' : 'border-stone-300 dark:border-stone-600'
                        }`}>
                          {isSel && <Check size={10} strokeWidth={3.5} />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {/* STEP 8: Reminder Preferences */}
            {step === 8 && (
              <motion.div
                key="step8"
                initial="enter"
                animate="center"
                exit="exit"
                custom={1}
                variants={slideVariants}
                className="space-y-5"
                id="onboarding_step_8"
              >
                <div className="space-y-2 text-center md:text-left">
                  <div className="inline-flex w-11 h-11 rounded-xl bg-pink-50 dark:bg-pink-950/30 border border-pink-200/70 dark:border-pink-900/50 items-center justify-center text-pink-600 dark:text-pink-400 mb-1">
                    <Bell size={20} />
                  </div>
                  <h2 className="text-2xl font-serif text-stone-900 dark:text-stone-100 font-semibold">
                    Which reminders would you like to receive?
                  </h2>
                  <p className="text-sm text-stone-500 dark:text-stone-400">
                    Select your preferred gentle nudges. You can edit these anytime.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2 max-h-[240px] overflow-y-auto pr-1 pb-1">
                  {[
                    'Period reminders',
                    'Ovulation reminders',
                    'Water reminders',
                    'Medication reminders',
                    'Contraception reminders',
                    'Meditation reminders'
                  ].map((rem) => {
                    const isSel = reminders.includes(rem);
                    return (
                      <button
                        key={rem}
                        type="button"
                        onClick={() => toggleReminder(rem)}
                        className={`p-3.5 border rounded-xl flex items-center justify-between text-left transition-all cursor-pointer ${
                          isSel
                            ? 'border-pink-500 bg-pink-50/70 dark:bg-pink-950/30 text-pink-900 dark:text-pink-200 font-semibold'
                            : 'border-stone-200/80 dark:border-[#342f2b] bg-[#faf8f6] dark:bg-[#23201d] text-stone-700 dark:text-stone-300 hover:border-pink-300'
                        }`}
                      >
                        <span className="text-xs font-medium pr-1">{rem}</span>
                        <div className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${
                          isSel ? 'bg-pink-600 border-pink-600 text-white' : 'border-stone-300 dark:border-stone-600'
                        }`}>
                          {isSel && <Check size={10} strokeWidth={3.5} />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {/* STEP 9: Partner Mode */}
            {step === 9 && (
              <motion.div
                key="step9"
                initial="enter"
                animate="center"
                exit="exit"
                custom={1}
                variants={slideVariants}
                className="space-y-5"
                id="onboarding_step_9"
              >
                <div className="space-y-2 text-center md:text-left">
                  <div className="inline-flex w-11 h-11 rounded-xl bg-pink-50 dark:bg-pink-950/30 border border-pink-200/70 dark:border-pink-900/50 items-center justify-center text-pink-600 dark:text-pink-400 mb-1">
                    <Heart size={20} />
                  </div>
                  <h2 className="text-2xl font-serif text-stone-900 dark:text-stone-100 font-semibold">
                    Would you like to use Partner Mode?
                  </h2>
                  <p className="text-sm text-stone-500 dark:text-stone-400">
                    Share your calendar, symptoms, and comfort preferences with a trusted person.
                  </p>
                </div>

                <div className="space-y-3.5">
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setPartnerMode('yes')}
                      className={`p-5 border rounded-2xl flex flex-col items-center justify-center text-center transition-all cursor-pointer gap-2 ${
                        partnerMode === 'yes'
                          ? 'border-pink-600 bg-pink-50/70 dark:bg-pink-950/30 font-semibold text-pink-900 dark:text-pink-200'
                          : 'border-stone-200/80 dark:border-[#342f2b] bg-[#faf8f6] dark:bg-[#23201d] text-stone-600 dark:text-stone-300 hover:border-pink-300'
                      }`}
                    >
                      <Heart size={20} className="text-pink-600 dark:text-pink-400" />
                      <span className="text-sm font-semibold">Yes, interested</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPartnerMode('no')}
                      className={`p-5 border rounded-2xl flex flex-col items-center justify-center text-center transition-all cursor-pointer gap-2 ${
                        partnerMode === 'no'
                          ? 'border-stone-600 bg-stone-100 dark:bg-[#2a2622] font-semibold text-stone-900 dark:text-stone-100'
                          : 'border-stone-200/80 dark:border-[#342f2b] bg-[#faf8f6] dark:bg-[#23201d] text-stone-600 dark:text-stone-300 hover:border-stone-300'
                      }`}
                    >
                      <Clock size={20} className="text-stone-500 dark:text-stone-400" />
                      <span className="text-sm font-semibold">Not right now</span>
                    </button>
                  </div>

                  {partnerMode === 'yes' && (
                    <div className="p-4 bg-[#faf8f6] dark:bg-[#23201d] border border-stone-200/80 dark:border-[#342f2b] rounded-xl animate-fadeIn">
                      <p className="text-center text-xs text-stone-600 dark:text-stone-300">
                        You can invite and manage partner permissions anytime from Settings.
                      </p>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* STEP 10: Sanctuary Preferences */}
            {step === 10 && (
              <motion.div
                key="step10"
                initial="enter"
                animate="center"
                exit="exit"
                custom={1}
                variants={slideVariants}
                className="space-y-5"
                id="onboarding_step_10"
              >
                <div className="space-y-2 text-center md:text-left">
                  <div className="inline-flex w-11 h-11 rounded-xl bg-pink-50 dark:bg-pink-950/30 border border-pink-200/70 dark:border-pink-900/50 items-center justify-center text-pink-600 dark:text-pink-400 mb-1">
                    <Sparkle size={20} />
                  </div>
                  <h2 className="text-2xl font-serif text-stone-900 dark:text-stone-100 font-semibold">
                    What helps you relax?
                  </h2>
                  <p className="text-sm text-stone-500 dark:text-stone-400">
                    Select all that apply. We will tailor your sanctuary modules accordingly.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2 max-h-[240px] overflow-y-auto pr-1 pb-1">
                  {[
                    { label: 'Music', icon: <Music size={14} className="text-pink-600 dark:text-pink-400" /> },
                    { label: 'Meditation', icon: <Wind size={14} className="text-indigo-600 dark:text-indigo-400" /> },
                    { label: 'Sleep sounds', icon: <Moon size={14} className="text-blue-600 dark:text-blue-400" /> },
                    { label: 'Journaling', icon: <PenTool size={14} className="text-amber-600 dark:text-amber-400" /> },
                    { label: 'Breathing exercises', icon: <Wind size={14} className="text-teal-600 dark:text-teal-400" /> },
                    { label: 'Wellness tips', icon: <Sparkles size={14} className="text-purple-600 dark:text-purple-400" /> }
                  ].map((item) => {
                    const isSel = sanctuaryPrefs.includes(item.label);
                    return (
                      <button
                        key={item.label}
                        type="button"
                        onClick={() => toggleSanctuary(item.label)}
                        className={`p-3 border rounded-xl flex items-center justify-between text-left transition-all cursor-pointer ${
                          isSel
                            ? 'border-pink-500 bg-pink-50/70 dark:bg-pink-950/30 text-pink-900 dark:text-pink-200 font-semibold'
                            : 'border-stone-200/80 dark:border-[#342f2b] bg-[#faf8f6] dark:bg-[#23201d] text-stone-700 dark:text-stone-300 hover:border-pink-300'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          {item.icon}
                          <span className="text-xs font-medium truncate">{item.label}</span>
                        </div>
                        <div className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${
                          isSel ? 'bg-pink-600 border-pink-600 text-white' : 'border-stone-300 dark:border-stone-600'
                        }`}>
                          {isSel && <Check size={10} strokeWidth={3.5} />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {/* STEP 11: Notifications Permission */}
            {step === 11 && (
              <motion.div
                key="step11"
                initial="enter"
                animate="center"
                exit="exit"
                custom={1}
                variants={slideVariants}
                className="space-y-5"
                id="onboarding_step_11"
              >
                <div className="space-y-2 text-center md:text-left">
                  <div className="inline-flex w-11 h-11 rounded-xl bg-pink-50 dark:bg-pink-950/30 border border-pink-200/70 dark:border-pink-900/50 items-center justify-center text-pink-600 dark:text-pink-400 mb-1">
                    <ShieldCheck size={20} />
                  </div>
                  <h2 className="text-2xl font-serif text-stone-900 dark:text-stone-100 font-semibold">
                    Allow Lumina to send reminders and wellness updates?
                  </h2>
                  <p className="text-sm text-stone-500 dark:text-stone-400">
                    Stay closely synchronized with daily self-care goals and phase predictions.
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      setNotificationsAllowed(true);
                      handleNext();
                    }}
                    className="w-full h-11 px-4 bg-pink-600 hover:bg-pink-700 text-white rounded-xl text-sm font-semibold transition-colors cursor-pointer flex items-center justify-center gap-2"
                  >
                    <Bell size={15} />
                    Allow notifications
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setNotificationsAllowed(false);
                      handleNext();
                    }}
                    className="w-full h-11 px-4 bg-stone-100 dark:bg-[#23201d] hover:bg-stone-200 dark:hover:bg-[#2e2a26] text-stone-700 dark:text-stone-200 rounded-xl text-sm font-medium transition-colors cursor-pointer"
                  >
                    Maybe later
                  </button>
                </div>
              </motion.div>
            )}

            {/* STEP 12: Complete */}
            {step === 12 && (
              <motion.div
                key="step12"
                initial="enter"
                animate="center"
                exit="exit"
                custom={1}
                variants={slideVariants}
                className="space-y-5 text-center"
                id="onboarding_step_12"
              >
                <div className="flex justify-center">
                  <div className="w-16 h-16 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                    <Check size={28} strokeWidth={2.25} />
                  </div>
                </div>
                <div className="space-y-2">
                  <h1 className="text-3xl font-serif text-stone-900 dark:text-stone-100 font-semibold leading-tight">
                    You&apos;re all set
                  </h1>
                  <p className="text-sm text-stone-600 dark:text-stone-400">
                    Lumina is ready to become your sanctuary.
                  </p>
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </div>

        {/* Navigation bottom bar */}
        <div className="border-t border-stone-200/70 dark:border-[#2e2a26] pt-5 mt-4 flex items-center justify-between gap-4">
          {step > 1 ? (
            <button
              type="button"
              onClick={handleBack}
              className="flex items-center gap-1.5 text-sm font-medium text-stone-600 dark:text-stone-300 hover:text-stone-900 dark:hover:text-stone-100 transition-colors cursor-pointer shrink-0 whitespace-nowrap"
            >
              <ChevronLeft size={16} />
              Back
            </button>
          ) : (
            <div />
          )}

          {step < totalSteps ? (
            step !== 11 ? (
              <button
                type="button"
                onClick={handleNext}
                className="flex items-center gap-1.5 h-10 px-5 bg-pink-600 hover:bg-pink-700 text-white rounded-xl text-sm font-semibold transition-colors cursor-pointer whitespace-nowrap"
              >
                {step === 1 ? 'Get started' : 'Continue'}
                <ChevronRight size={15} />
              </button>
            ) : null
          ) : (
            <button
              type="button"
              onClick={handleNext}
              className="h-10 px-6 bg-pink-600 hover:bg-pink-700 text-white rounded-xl text-sm font-semibold transition-colors cursor-pointer whitespace-nowrap"
            >
              Enter Lumina
            </button>
          )}
        </div>

      </div>
    </div>
  );
};
