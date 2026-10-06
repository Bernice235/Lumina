import React, { useState } from 'react';
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
      { firstName: name?.trim() || 'Bernice' },
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

  // Wellness goals
  const [wellnessGoals, setWellnessGoals] = useState<string[]>([
    'Understanding my cycle',
    'Period tracking'
  ]);

  // Reminders preferences
  const [reminders, setReminders] = useState<string[]>([
    'Period reminders',
    'Ovulation reminders'
  ]);

  // Partner mode preference
  const [partnerMode, setPartnerMode] = useState<'yes' | 'no' | null>(null);

  // Sanctuary preferences
  const [sanctuaryPrefs, setSanctuaryPrefs] = useState<string[]>([
    'Music',
    'Meditation',
    'Breathing exercises'
  ]);

  // Notification permissions
  const [notificationsAllowed, setNotificationsAllowed] = useState<boolean | null>(null);

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
    localStorage.setItem('lumina_user', JSON.stringify(updatedUser));
    if (updatedUser.email) {
      localStorage.setItem('lumina_user_email_' + updatedUser.email.toLowerCase().trim(), JSON.stringify(updatedUser));
    }
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
    <div id="onboarding_container" className={`min-h-screen ${currentThemeInfo?.bg || 'bg-gradient-to-br from-pink-50 to-indigo-50/30'} flex items-center justify-center p-4 relative overflow-hidden transition-colors duration-500 font-sans`}>
      {/* Soft background glow circles */}
      <div className="absolute top-[-10%] left-[-10%] w-[45%] h-[45%] rounded-full blur-[120px] opacity-25 bg-pink-300 dark:bg-pink-900/10 transition-all duration-700 animate-pulse"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[45%] h-[45%] rounded-full blur-[120px] opacity-20 bg-indigo-300 dark:bg-indigo-900/10 transition-all duration-700 animate-pulse"></div>

      <div id="onboarding_card" className="bg-white/80 dark:bg-stone-900/90 backdrop-blur-2xl px-6 py-8 md:px-10 md:py-10 rounded-[2.5rem] shadow-[0_20px_50px_rgba(244,63,94,0.04)] border border-white/50 dark:border-stone-800/50 w-full max-w-lg z-10 flex flex-col justify-between min-h-[580px] relative transition-all">
        
        {/* Step progress header */}
        <div className="space-y-3">
          <div className="flex justify-between items-center text-[10px] font-black tracking-widest uppercase text-pink-500 transition-colors">
            <span className="flex items-center gap-1.5 font-bold tracking-widest">
              <Sparkles size={12} className="text-pink-500 animate-pulse" />
              LUMINA ONBOARDING FLOW
            </span>
            <span className="font-serif italic font-bold">
              Step {step} of {totalSteps}
            </span>
          </div>
          
          <div className="w-full h-1 bg-gray-100 dark:bg-stone-850 rounded-full overflow-hidden">
            <motion.div 
              className="h-full bg-gradient-to-r from-pink-400 via-rose-450 to-indigo-500"
              initial={{ width: '0%' }}
              animate={{ width: `${(step / totalSteps) * 100}%` }}
              transition={{ type: 'spring', stiffness: 100 }}
            ></motion.div>
          </div>
        </div>

        {/* Step display container */}
        <div className="my-6 flex-grow flex flex-col justify-center min-h-[350px]">
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
                className="space-y-6 text-center"
                id="onboarding_step_1"
              >
                <div className="flex justify-center">
                  <div className="w-20 h-20 rounded-full bg-pink-50 dark:bg-pink-950/20 flex items-center justify-center text-rose-500 shadow-inner">
                    <Sparkles size={36} className="text-pink-500 animate-spin-slow" />
                  </div>
                </div>
                <div className="space-y-3">
                  <h1 className="text-3xl md:text-4xl font-serif italic text-stone-900 dark:text-stone-100 font-bold leading-tight">
                    Welcome to Lumina 🌸
                  </h1>
                  <p className="text-base text-stone-500 dark:text-stone-400 font-serif italic">
                    Your cycle, your sanctuary.
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
                  <div className="inline-flex w-12 h-12 rounded-full bg-pink-50 dark:bg-pink-950/20 items-center justify-center text-pink-500 mb-1">
                    <UserIcon size={20} />
                  </div>
                  <h2 className="text-2xl font-serif italic text-stone-900 dark:text-stone-100 font-bold">
                    What should we call you?
                  </h2>
                  <p className="text-xs text-stone-400 dark:text-stone-500">
                    Tell us your name and optionally your birthday to tailor predictions.
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black tracking-widest uppercase text-pink-400">Name</label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => {
                        setName(e.target.value);
                        if (validationError) setValidationError(null);
                      }}
                      placeholder="e.g. Sarah"
                      className="w-full bg-white dark:bg-stone-950 border border-stone-200 dark:border-stone-850 px-5 py-3.5 rounded-2xl text-sm font-bold text-stone-800 dark:text-stone-100 outline-none focus:border-pink-400 dark:focus:border-pink-500 transition-colors shadow-inner"
                      autoFocus
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black tracking-widest uppercase text-stone-400">Date of Birth <span className="text-stone-300 font-normal font-sans tracking-normal italic">(Optional)</span></label>
                    <input
                      type="date"
                      value={dob}
                      onChange={(e) => setDob(e.target.value)}
                      className="w-full bg-white dark:bg-stone-950 border border-stone-200 dark:border-stone-850 px-5 py-3.5 rounded-2xl text-sm font-bold text-stone-800 dark:text-stone-100 outline-none focus:border-pink-400 dark:focus:border-pink-500 transition-colors shadow-inner"
                    />
                  </div>

                  {validationError && (
                    <p className="text-[10px] text-rose-500 font-bold tracking-wide animate-pulse">
                      ⚠️ {validationError}
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
                  <div className="inline-flex w-12 h-12 rounded-full bg-pink-50 dark:bg-pink-950/20 items-center justify-center text-pink-500 mb-1">
                    <Sparkles size={20} />
                  </div>
                  <h2 className="text-2xl font-serif italic text-stone-900 dark:text-stone-100 font-bold">
                    Choose Your Wellness Avatar Companion
                  </h2>
                  <p className="text-xs text-stone-400 dark:text-stone-500">
                    Select a visual companion to encourage, guide, and walk with you every day.
                  </p>
                </div>

                {/* Preview Box with Alive Companion Extending Beyond Circular Frame */}
                <div className="bg-gradient-to-r from-pink-50/90 via-rose-50/70 to-amber-50/50 p-4 sm:p-5 rounded-3xl border border-pink-100 flex flex-col sm:flex-row items-center gap-4 shadow-sm text-left relative overflow-hidden">
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
                      className="absolute -bottom-2 -right-2 px-2 py-1 rounded-full bg-pink-500 hover:bg-pink-600 text-white text-[9px] font-black uppercase tracking-wider shadow-md flex items-center gap-1 active:scale-95 transition-all cursor-pointer"
                      title="Tap to make companion speak and wave"
                    >
                      {isCompanionSpeaking ? <VolumeX className="w-2.5 h-2.5 animate-spin" /> : <Volume2 className="w-2.5 h-2.5" />}
                      <span>{isCompanionSpeaking ? 'Speaking' : 'Wave 👋'}</span>
                    </button>
                  </div>

                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <h4 className="font-serif font-black text-base text-pink-700">
                        {AVATAR_PRESETS[selectedAvatarId]?.name} • {AVATAR_PRESETS[selectedAvatarId]?.title}
                      </h4>
                      <span className="text-[9px] font-black uppercase tracking-wider text-pink-600 bg-white px-2.5 py-0.5 rounded-full border border-pink-100 shadow-xs">
                        {AVATAR_PRESETS[selectedAvatarId]?.emoji} {AVATAR_PRESETS[selectedAvatarId]?.defaultPersonality}
                      </span>
                    </div>

                    {/* Interactive Introduction Speech Bubble */}
                    <div className="bg-white/90 backdrop-blur-xs p-3 rounded-2xl border border-pink-100/80 shadow-xs relative">
                      <div className="absolute -top-1.5 left-6 w-3 h-3 bg-white border-t border-l border-pink-100 transform rotate-45" />
                      <p className="text-xs text-stone-800 font-medium leading-relaxed italic">
                        "{getAvatarIntroduction(selectedAvatarId, name?.trim() || 'Bernice', AVATAR_PRESETS[selectedAvatarId]?.defaultPersonality).displayText}"
                      </p>
                      
                      <div className="flex items-center justify-between gap-2 mt-2 pt-2 border-t border-pink-50 text-[10px]">
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
                          className="flex items-center gap-1.5 font-bold text-pink-600 hover:text-pink-700 cursor-pointer"
                        >
                          <span>{isCompanionSpeaking ? '⏹️ Stop Voice' : '🔊 Hear Introduction'}</span>
                        </button>
                        <span className="text-[9px] text-stone-400">
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
                        className={`p-2.5 rounded-2xl border text-center transition-all cursor-pointer relative overflow-visible ${
                          isSelected
                            ? 'bg-pink-50/90 border-pink-400 ring-2 ring-pink-300 shadow-md scale-[1.02]'
                            : 'bg-white border-stone-200 hover:bg-stone-50 hover:border-pink-200'
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
                        <span className="font-serif font-bold text-xs text-stone-800 block truncate">
                          {preset.name}
                        </span>
                        <span className="text-[8.5px] text-pink-600 font-semibold block truncate">
                          {preset.emoji} {preset.title.split('The ')[1] || preset.title}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Skin Tone Selector */}
                <div className="space-y-1 pt-1">
                  <label className="text-[9px] font-black uppercase tracking-wider text-pink-400 block text-left">
                    Preferred Skin Tone
                  </label>
                  <div className="flex gap-2 justify-center sm:justify-start overflow-x-auto pb-1">
                    {(Object.keys(SKIN_TONE_PALETTES) as SkinTone[]).map((tone) => (
                      <button
                        key={tone}
                        type="button"
                        onClick={() => setSelectedSkinTone(tone)}
                        className={`w-6 h-6 rounded-full border-2 transition-all cursor-pointer ${
                          selectedSkinTone === tone ? 'border-pink-500 scale-110 shadow-sm' : 'border-white'
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
                  <div className="inline-flex w-12 h-12 rounded-full bg-pink-50 dark:bg-pink-950/20 items-center justify-center text-pink-500 mb-1">
                    <Calendar size={20} />
                  </div>
                  <h2 className="text-2xl font-serif italic text-stone-900 dark:text-stone-100 font-bold">
                    When did your last period start?
                  </h2>
                  <p className="text-xs text-stone-400 dark:text-stone-500">
                    Your previous period starting date is the foundation of your cycle forecasting.
                  </p>
                </div>

                <div className="p-5 bg-pink-50/10 dark:bg-stone-950/20 rounded-3xl border border-pink-100/10 space-y-3">
                  <input
                    type="date"
                    max={new Date().toISOString().split('T')[0]}
                    value={lastPeriodStart}
                    onChange={(e) => setLastPeriodStart(e.target.value)}
                    className="w-full bg-white dark:bg-stone-950 px-5 py-3.5 border border-pink-100 dark:border-stone-850 rounded-2xl text-sm font-bold text-pink-600 outline-none text-center shadow-inner cursor-pointer"
                  />
                  <p className="text-[10px] text-stone-400 italic font-serif">
                    🌸 Tap to select the calendar date your last flow began.
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
                  <div className="inline-flex w-12 h-12 rounded-full bg-pink-50 dark:bg-pink-950/20 items-center justify-center text-pink-500 mb-1">
                    <RefreshCw size={20} />
                  </div>
                  <h2 className="text-2xl font-serif italic text-stone-900 dark:text-stone-100 font-bold">
                    How long is your average cycle?
                  </h2>
                  <p className="text-xs text-stone-400 dark:text-stone-500">
                    The number of days between the start of one period and the start of the next.
                  </p>
                </div>

                <div className="grid grid-cols-3 gap-2.5 max-h-[250px] overflow-y-auto pr-1 pb-1">
                  {Array.from({ length: 15 }, (_, i) => 21 + i).map((days) => (
                    <button
                      key={days}
                      type="button"
                      onClick={() => setCycleLength(days)}
                      className={`p-3 border rounded-2xl flex flex-col items-center justify-center text-center transition-all cursor-pointer ${
                        cycleLength === days
                          ? 'border-pink-400 bg-pink-50/20 text-pink-950 dark:text-pink-100 font-bold shadow-sm'
                          : 'border-stone-100 dark:border-stone-850 bg-white dark:bg-stone-950 text-stone-600 dark:text-stone-300 hover:border-pink-200'
                      }`}
                    >
                      <span className="text-xs font-bold font-sans">{days} Days</span>
                      {days === 28 && (
                        <span className="text-[8px] text-pink-400 font-mono tracking-tight uppercase mt-0.5">Default</span>
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
                  <div className="inline-flex w-12 h-12 rounded-full bg-pink-50 dark:bg-pink-950/20 items-center justify-center text-pink-500 mb-1">
                    <Droplets size={20} />
                  </div>
                  <h2 className="text-2xl font-serif italic text-stone-900 dark:text-stone-100 font-bold">
                    How many days does your period usually last?
                  </h2>
                  <p className="text-xs text-stone-400 dark:text-stone-500">
                    Typical bleeding flow lasts between 2 and 10 days.
                  </p>
                </div>

                <div className="grid grid-cols-3 gap-2.5 max-h-[250px] overflow-y-auto pr-1 pb-1">
                  {Array.from({ length: 9 }, (_, i) => 2 + i).map((days) => (
                    <button
                      key={days}
                      type="button"
                      onClick={() => setPeriodLength(days)}
                      className={`p-4 border rounded-2xl flex flex-col items-center justify-center text-center transition-all cursor-pointer ${
                        periodLength === days
                          ? 'border-pink-400 bg-pink-50/20 text-pink-950 dark:text-pink-100 font-bold shadow-sm'
                          : 'border-stone-100 dark:border-stone-850 bg-white dark:bg-stone-950 text-stone-600 dark:text-stone-300 hover:border-pink-200'
                      }`}
                    >
                      <span className="text-xs font-bold font-sans">{days} Days</span>
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
                  <div className="inline-flex w-12 h-12 rounded-full bg-pink-50 dark:bg-pink-950/20 items-center justify-center text-pink-500 mb-1">
                    <Activity size={20} />
                  </div>
                  <h2 className="text-2xl font-serif italic text-stone-900 dark:text-stone-100 font-bold">
                    What would you like help with?
                  </h2>
                  <p className="text-xs text-stone-400 dark:text-stone-500">
                    Select all that apply to help customize your sanctuary journey.
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
                        className={`p-3 border rounded-2xl flex items-center justify-between text-left transition-all cursor-pointer ${
                          isSel
                            ? 'border-pink-300 bg-pink-50/15 text-pink-950 dark:text-pink-100 font-bold'
                            : 'border-stone-100 dark:border-stone-850 bg-white dark:bg-stone-950 text-stone-600 dark:text-stone-300 hover:border-pink-200'
                        }`}
                      >
                        <span className="text-[10px] font-bold pr-1">{goal}</span>
                        <div className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${
                          isSel ? 'bg-pink-500 border-pink-500 text-white' : 'border-gray-200 dark:border-stone-700'
                        }`}>
                          {isSel && <Check size={10} strokeWidth={4} />}
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
                  <div className="inline-flex w-12 h-12 rounded-full bg-pink-50 dark:bg-pink-950/20 items-center justify-center text-pink-500 mb-1">
                    <Bell size={20} />
                  </div>
                  <h2 className="text-2xl font-serif italic text-stone-900 dark:text-stone-100 font-bold">
                    Which reminders would you like to receive?
                  </h2>
                  <p className="text-xs text-stone-400 dark:text-stone-500">
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
                        className={`p-3.5 border rounded-2xl flex items-center justify-between text-left transition-all cursor-pointer ${
                          isSel
                            ? 'border-pink-300 bg-pink-50/15 text-pink-950 dark:text-pink-100 font-bold'
                            : 'border-stone-100 dark:border-stone-850 bg-white dark:bg-stone-950 text-stone-600 dark:text-stone-300 hover:border-pink-200'
                        }`}
                      >
                        <span className="text-[10px] font-bold">{rem}</span>
                        <div className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${
                          isSel ? 'bg-pink-500 border-pink-500 text-white' : 'border-gray-200 dark:border-stone-700'
                        }`}>
                          {isSel && <Check size={10} strokeWidth={4} />}
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
                  <div className="inline-flex w-12 h-12 rounded-full bg-pink-50 dark:bg-pink-950/20 items-center justify-center text-pink-500 mb-1">
                    <Heart size={20} className="text-pink-500" />
                  </div>
                  <h2 className="text-2xl font-serif italic text-stone-900 dark:text-stone-100 font-bold">
                    Would you like to use Partner Mode?
                  </h2>
                  <p className="text-xs text-stone-400 dark:text-stone-500">
                    Share your calendar, symptoms, and self-care comfort items with your trusted person.
                  </p>
                </div>

                <div className="space-y-3.5">
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setPartnerMode('yes')}
                      className={`p-5 border-2 rounded-2xl flex flex-col items-center justify-center text-center transition-all cursor-pointer ${
                        partnerMode === 'yes'
                          ? 'border-pink-400 bg-pink-50/20 font-bold text-pink-950 dark:text-pink-100'
                          : 'border-stone-100 dark:border-stone-850 bg-white dark:bg-stone-950 text-stone-500'
                      }`}
                    >
                      <span className="text-2xl mb-1">💞</span>
                      <span className="text-xs font-bold">Yes</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPartnerMode('no')}
                      className={`p-5 border-2 rounded-2xl flex flex-col items-center justify-center text-center transition-all cursor-pointer ${
                        partnerMode === 'no'
                          ? 'border-stone-400 bg-stone-50/10 font-bold text-stone-950 dark:text-stone-100'
                          : 'border-stone-100 dark:border-stone-850 bg-white dark:bg-stone-950 text-stone-500'
                      }`}
                    >
                      <span className="text-2xl mb-1">🕊️</span>
                      <span className="text-xs font-bold">Not Right Now</span>
                    </button>
                  </div>

                  {partnerMode === 'yes' && (
                    <div className="p-4 bg-pink-50/30 dark:bg-stone-950/20 border border-pink-100/30 rounded-2xl animate-fadeIn">
                      <p className="text-center text-xs text-pink-600 font-serif italic">
                        "You can connect a trusted partner later in Settings."
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
                  <div className="inline-flex w-12 h-12 rounded-full bg-pink-50 dark:bg-pink-950/20 items-center justify-center text-pink-500 mb-1">
                    <Sparkle size={20} />
                  </div>
                  <h2 className="text-2xl font-serif italic text-stone-900 dark:text-stone-100 font-bold">
                    What helps you relax?
                  </h2>
                  <p className="text-xs text-stone-400 dark:text-stone-500">
                    Select all that apply. We will seed custom items into your sanctuary space.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2 max-h-[240px] overflow-y-auto pr-1 pb-1">
                  {[
                    { label: 'Music', icon: <Music size={13} className="text-pink-400" /> },
                    { label: 'Meditation', icon: <Wind size={13} className="text-indigo-400" /> },
                    { label: 'Sleep sounds', icon: <Moon size={13} className="text-blue-400" /> },
                    { label: 'Journaling', icon: <PenTool size={13} className="text-amber-400" /> },
                    { label: 'Breathing exercises', icon: <Wind size={13} className="text-teal-400" /> },
                    { label: 'Wellness tips', icon: <Sparkles size={13} className="text-purple-400" /> }
                  ].map((item) => {
                    const isSel = sanctuaryPrefs.includes(item.label);
                    return (
                      <button
                        key={item.label}
                        type="button"
                        onClick={() => toggleSanctuary(item.label)}
                        className={`p-3 border rounded-2xl flex items-center justify-between text-left transition-all cursor-pointer ${
                          isSel
                            ? 'border-pink-300 bg-pink-50/15 text-pink-950 dark:text-pink-100 font-bold'
                            : 'border-stone-100 dark:border-stone-850 bg-white dark:bg-stone-950 text-stone-600 dark:text-stone-300 hover:border-pink-200'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          {item.icon}
                          <span className="text-[10px] font-bold">{item.label}</span>
                        </div>
                        <div className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${
                          isSel ? 'bg-pink-500 border-pink-500 text-white' : 'border-gray-200 dark:border-stone-700'
                        }`}>
                          {isSel && <Check size={10} strokeWidth={4} />}
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
                  <div className="inline-flex w-12 h-12 rounded-full bg-pink-50 dark:bg-pink-950/20 items-center justify-center text-pink-500 mb-1">
                    <ShieldCheck size={20} />
                  </div>
                  <h2 className="text-2xl font-serif italic text-stone-900 dark:text-stone-100 font-bold">
                    Allow Lumina to send reminders and wellness updates?
                  </h2>
                  <p className="text-xs text-stone-400 dark:text-stone-500">
                    Stay closely synchronized with daily self-care goals and phase predictions.
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setNotificationsAllowed(true);
                      handleNext();
                    }}
                    className="w-full py-4.5 bg-gradient-to-r from-pink-500 to-rose-450 hover:opacity-95 active:scale-98 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
                  >
                    <Bell size={14} />
                    Allow Notifications
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setNotificationsAllowed(false);
                      handleNext();
                    }}
                    className="w-full py-4 bg-gray-100 hover:bg-gray-200/70 text-gray-500 rounded-2xl text-xs font-bold uppercase tracking-widest transition-all cursor-pointer"
                  >
                    Maybe Later
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
                className="space-y-6 text-center"
                id="onboarding_step_12"
              >
                <div className="flex justify-center">
                  <div className="w-20 h-20 rounded-full bg-pink-100 dark:bg-pink-950/30 flex items-center justify-center text-3xl animate-bounce">
                    🌸
                  </div>
                </div>
                <div className="space-y-3">
                  <h1 className="text-3xl font-serif italic text-stone-900 dark:text-stone-100 font-bold leading-tight">
                    You're all set 🌸
                  </h1>
                  <p className="text-base text-stone-500 dark:text-stone-400 font-serif italic">
                    Lumina is ready to become your sanctuary.
                  </p>
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </div>

        {/* Navigation bottom bar */}
        <div className="border-t border-stone-100 dark:border-stone-850 pt-5 mt-4 flex items-center justify-between gap-4">
          {step > 1 ? (
            <button
              type="button"
              onClick={handleBack}
              className="flex items-center gap-1 text-xs font-bold text-stone-400 hover:text-pink-500 uppercase tracking-wider transition-colors cursor-pointer shrink-0"
            >
              <ChevronLeft size={16} />
              Back
            </button>
          ) : (
            <div></div>
          )}

          {step < totalSteps ? (
            step !== 11 ? (
              <button
                type="button"
                onClick={handleNext}
                className="flex items-center gap-1.5 px-6 py-3 bg-pink-500 text-white rounded-2xl text-xs font-black uppercase tracking-wider shadow-md hover:bg-pink-600 active:scale-95 transition-all cursor-pointer"
              >
                {step === 1 ? 'Get Started' : 'Continue'}
                <ChevronRight size={14} />
              </button>
            ) : null
          ) : (
            <button
              type="button"
              onClick={handleNext}
              className="px-8 py-3 bg-gradient-to-r from-pink-500 to-indigo-500 hover:opacity-95 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-lg active:scale-98 transition-all cursor-pointer"
            >
              Enter Lumina
            </button>
          )}
        </div>

      </div>
    </div>
  );
};
