import React, { useState } from 'react';
import { User, AppTheme, Symptom, BillingItem, NotificationSettings } from '../types';
import { THEMES } from '../constants';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Sparkles, 
  Calendar, 
  ChevronRight, 
  ChevronLeft, 
  Heart, 
  Check, 
  Baby, 
  Award, 
  User as UserIcon, 
  Smile, 
  Bell, 
  Clock, 
  RefreshCw, 
  Sparkle, 
  ShieldCheck, 
  Flame, 
  Activity, 
  Info,
  HelpCircle,
  TrendingUp,
  Brain,
  Droplets
} from 'lucide-react';

interface OnboardingWizardProps {
  user: User;
  setUser: React.Dispatch<React.SetStateAction<User | null>>;
  onComplete: (user: User) => void;
}

export const OnboardingWizard: React.FC<OnboardingWizardProps> = ({ user, setUser, onComplete }) => {
  const [step, setStep] = useState(1);
  const totalSteps = 13; // 12 questions + 1 final summary screen

  // Local values prefilled with user defaults if available
  const [firstName, setFirstName] = useState(user.firstName || user.name || '');
  const [age, setAge] = useState<number>(user.age || 25);
  
  const [lastPeriodStart, setLastPeriodStart] = useState(() => {
    if (user.lastPeriodStart) {
      return user.lastPeriodStart.split('T')[0];
    }
    return new Date().toISOString().split('T')[0];
  });

  // average cycle length options
  const [cycleLengthOption, setCycleLengthOption] = useState<string>(() => {
    if (user.cycleLength) {
      return [21, 24, 28, 30, 35].includes(user.cycleLength) ? String(user.cycleLength) : '28';
    }
    return '28';
  });
  const [customCycleLength, setCustomCycleLength] = useState<number>(28);

  // average period length options
  const [periodLengthOption, setPeriodLengthOption] = useState<string>('4-5');

  // pregnancy status: Yes, No, Trying
  const [pregnancyStatus, setPregnancyStatus] = useState<'yes' | 'no' | 'trying'>(
    user.isPregnancyMode ? 'yes' : 'no'
  );

  // goals / what they want help with
  const [helpsSelected, setHelpsSelected] = useState<string[]>([
    'Track my period',
    'Understand my symptoms',
    'Improve wellness'
  ]);

  // symptoms commonly experienced
  const [symptomsSelected, setSymptomsSelected] = useState<string[]>(['Cramps']);

  // reminders settings
  const [periodReminders, setPeriodReminders] = useState<boolean>(true);
  const [ovulationReminders, setOvulationReminders] = useState<boolean>(true);
  const [wellnessReminders, setWellnessReminders] = useState<boolean>(true);
  
  // partner setting
  const [connectPartner, setConnectPartner] = useState<boolean>(true);

  // selected theme - default is 'rose'
  const [selectedTheme, setSelectedTheme] = useState<AppTheme>(user.theme || 'rose');

  // error state
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleNext = () => {
    // Validation
    if (step === 1 && !firstName.trim()) {
      setValidationError("Please enter your name to personalize your sanctuary.");
      return;
    }
    if (step === 2 && (age < 12 || age > 99)) {
      setValidationError("Please specify a valid age between 12 and 99.");
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

  const getCycleLengthValue = (): number => {
    if (cycleLengthOption === 'not_sure') return 28;
    return parseInt(cycleLengthOption) || customCycleLength || 28;
  };

  const getPeriodLengthValue = (): number => {
    if (periodLengthOption === '2-3') return 3;
    if (periodLengthOption === '4-5') return 5;
    if (periodLengthOption === '6-7') return 6;
    if (periodLengthOption === '8+') return 8;
    return 5; // default/not sure
  };

  const handleFinish = () => {
    const finalCycleLength = getCycleLengthValue();
    const finalPeriodLength = getPeriodLengthValue();
    const isPregnancyMode = pregnancyStatus === 'yes';

    // Map symptoms selected to actual Symptom array to pre-populate logs
    const initialSymptoms: Symptom[] = symptomsSelected
      .filter(s => s !== 'None of these')
      .map((s, idx) => {
        let type: Symptom['type'] = 'cramps';
        if (s === 'Cramps') type = 'cramps';
        else if (s === 'Headaches') type = 'headache';
        else if (s === 'Acne') type = 'acne';
        else if (s === 'Bloating') type = 'bloating';
        else if (s === 'Fatigue') type = 'fatigue';
        else if (s === 'Mood swings') type = 'moody';
        else if (s === 'Tender breasts') type = 'tender_breasts';

        return {
          id: `sym_init_${idx}_${Date.now()}`,
          date: new Date(lastPeriodStart).toISOString().split('T')[0],
          type,
          intensity: 2
        };
      });

    // Commit the values to the user object
    const updatedUser: User = {
      ...user,
      firstName: firstName.trim(),
      displayName: firstName.trim(),
      name: firstName.trim(),
      age: age,
      cycleLength: finalCycleLength,
      periodLength: finalPeriodLength,
      lastPeriodStart: new Date(lastPeriodStart).toISOString(),
      isPregnancyMode: isPregnancyMode,
      wellnessPreferences: helpsSelected,
      symptoms: initialSymptoms,
      notificationSettings: {
        enabled: periodReminders || ovulationReminders || wellnessReminders,
        toneStyle: 'supportive',
        reminderDaysBefore: 2,
        quietHours: { enabled: false, startTime: '22:00', endTime: '07:00' },
        types: {
          periodStarting: periodReminders,
          periodStarted: periodReminders,
          periodEnding: periodReminders,
          ovulation: ovulationReminders,
          fertileWindow: ovulationReminders,
          lutealPhase: true,
          pregnancyRisk: true
        },
        partnerNotificationsEnabled: connectPartner,
        partnerReceiveTypes: {
          periodStarting: true,
          periodStarted: true,
          periodEnding: true,
          ovulation: true,
          fertileWindow: true,
          pregnancyRisk: true
        },
        pregnancyEnabled: isPregnancyMode,
        partnerPregnancyEnabled: isPregnancyMode,
        pregnancyReminderTime: '09:00',
        pregnancyTypes: {
          welcome: true,
          weeklyBabyDev: true,
          babySizeUpdate: true,
          appointment: true,
          medicationVitamin: true,
          hydration: true,
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
      },
      theme: selectedTheme,
      onboardingCompleted: true,
    };

    setUser(updatedUser);
    localStorage.setItem('lumina_user', JSON.stringify(updatedUser));
    onComplete(updatedUser);
  };

  const toggleHelpGoal = (goal: string) => {
    if (helpsSelected.includes(goal)) {
      setHelpsSelected(helpsSelected.filter(g => g !== goal));
    } else {
      setHelpsSelected([...helpsSelected, goal]);
    }
  };

  const toggleSymptom = (symptom: string) => {
    if (symptom === 'None of these') {
      setSymptomsSelected(['None of these']);
      return;
    }

    let updated = symptomsSelected.filter(s => s !== 'None of these');
    if (updated.includes(symptom)) {
      updated = updated.filter(s => s !== symptom);
      if (updated.length === 0) {
        updated = ['None of these'];
      }
    } else {
      updated = [...updated, symptom];
    }
    setSymptomsSelected(updated);
  };

  const currentThemeInfo = THEMES[selectedTheme] || THEMES['rose'];

  const slideVariants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 120 : -120,
      opacity: 0,
      scale: 0.96
    }),
    center: {
      x: 0,
      opacity: 1,
      scale: 1,
      transition: {
        x: { type: 'spring', stiffness: 300, damping: 30 },
        opacity: { duration: 0.25 },
        scale: { duration: 0.25 }
      }
    },
    exit: (direction: number) => ({
      x: direction < 0 ? 120 : -120,
      opacity: 0,
      scale: 0.96,
      transition: {
        x: { type: 'spring', stiffness: 300, damping: 30 },
        opacity: { duration: 0.2 },
        scale: { duration: 0.2 }
      }
    })
  };

  const helpsList = [
    { name: 'Track my period', desc: 'Predict flow calendars with accuracy.', emoji: '🩸' },
    { name: 'Predict ovulation', desc: 'Find fertile windows and ovulation peaks.', emoji: '✨' },
    { name: 'Improve fertility awareness', desc: 'Track conception windows & bio logs.', emoji: '🌱' },
    { name: 'Understand my symptoms', desc: 'Log cravings, cramps, and energy levels.', emoji: '📊' },
    { name: 'Improve wellness', desc: 'Supplements & nutritional guidance.', emoji: '🧘' },
    { name: 'Mood tracking', desc: 'Understand physical & mental correlations.', emoji: '💭' },
    { name: 'Partner support', desc: 'Sync timelines to keep loved ones close.', emoji: '💕' },
    { name: 'Pregnancy tracking', desc: 'Baby size benchmarks & trimester updates.', emoji: '🍼' }
  ];

  const commonSymptomsList = [
    { name: 'Cramps', emoji: '⚡' },
    { name: 'Headaches', emoji: '🤕' },
    { name: 'Acne', emoji: '✨' },
    { name: 'Bloating', emoji: '🎈' },
    { name: 'Fatigue', emoji: '😴' },
    { name: 'Mood swings', emoji: '🎭' },
    { name: 'Tender breasts', emoji: '🌸' },
    { name: 'None of these', emoji: '✅' }
  ];

  return (
    <div className={`min-h-screen ${currentThemeInfo.bg} flex items-center justify-center p-4 relative overflow-hidden transition-colors duration-500 font-sans`}>
      {/* Visual Ambient Blur Spheres */}
      <div className="absolute top-[-15%] left-[-15%] w-[50%] h-[50%] rounded-full blur-[140px] opacity-30 bg-pink-300 dark:bg-pink-900/10 transition-all duration-700 animate-pulse"></div>
      <div className="absolute bottom-[-15%] right-[-15%] w-[50%] h-[50%] rounded-full blur-[140px] opacity-25 bg-indigo-300 dark:bg-indigo-900/10 transition-all duration-700 animate-pulse"></div>

      <div className="bg-white/70 dark:bg-[#1a1615]/85 backdrop-blur-2xl px-6 py-10 md:px-10 md:py-12 rounded-[2.5rem] shadow-[0_20px_50px_rgba(244,63,94,0.06)] border border-white/50 dark:border-stone-800/50 w-full max-w-xl z-10 flex flex-col justify-between min-h-[580px] relative transition-all">
        
        {/* Upper Setup Banner & Progress Bar */}
        <div className="space-y-4">
          <div className="flex justify-between items-center text-[10px] font-black tracking-widest uppercase text-rose-500 transition-colors">
            <span className="flex items-center gap-1.5 font-bold tracking-widest text-[9px]">
              <Sparkles size={11} className="text-rose-500 animate-pulse" />
              Lumina Sanctuary Setup
            </span>
            <span className="font-serif italic font-bold">
              {step === totalSteps ? 'Complete 🌸' : `Step ${step} of ${totalSteps - 1}`}
            </span>
          </div>
          
          <div className="w-full h-1 bg-gray-100 dark:bg-stone-800 rounded-full overflow-hidden">
            <motion.div 
              className="h-full bg-gradient-to-r from-rose-400 via-pink-500 to-indigo-500"
              initial={{ width: '0%' }}
              animate={{ width: `${((step - 1) / (totalSteps - 1)) * 100}%` }}
              transition={{ type: 'spring', stiffness: 90 }}
            ></motion.div>
          </div>
        </div>

        {/* Core Question Content Stage */}
        <div className="my-6 flex-grow flex flex-col justify-center min-h-[350px]">
          <AnimatePresence mode="wait" custom={step}>
            
            {/* Step 1: First Name */}
            {step === 1 && (
              <motion.div
                key="step1"
                initial="enter"
                animate="center"
                exit="exit"
                custom={1}
                variants={slideVariants}
                className="space-y-6"
              >
                <div className="space-y-2">
                  <div className="w-12 h-12 rounded-full bg-pink-50 dark:bg-pink-950/20 flex items-center justify-center text-rose-500 mb-2">
                    <UserIcon size={20} />
                  </div>
                  <h2 className="text-2xl font-serif italic text-stone-900 dark:text-stone-100 font-bold leading-tight">
                    What’s your first name?
                  </h2>
                  <p className="text-xs text-stone-400 dark:text-stone-500 leading-relaxed font-serif italic">
                    Use: Personalizes the app and sanctuary greetings.
                  </p>
                </div>

                <div className="space-y-3">
                  <input
                    type="text"
                    value={firstName}
                    onChange={(e) => {
                      setFirstName(e.target.value);
                      if (validationError) setValidationError(null);
                    }}
                    placeholder="e.g., Sarah"
                    className="w-full bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 px-6 py-4 rounded-3xl text-sm font-bold text-stone-800 dark:text-stone-100 outline-none focus:border-rose-400 dark:focus:border-rose-500 transition-colors shadow-inner text-center"
                    autoFocus
                  />
                  {validationError && (
                    <p className="text-[10px] text-rose-500 font-bold tracking-wide animate-pulse text-center">
                      ⚠️ {validationError}
                    </p>
                  )}
                  <p className="text-[10px] text-stone-400 text-center">
                    ✨ Your name resides strictly on your private, secure vault.
                  </p>
                </div>
              </motion.div>
            )}

            {/* Step 2: Age */}
            {step === 2 && (
              <motion.div
                key="step2"
                initial="enter"
                animate="center"
                exit="exit"
                custom={1}
                variants={slideVariants}
                className="space-y-6"
              >
                <div className="space-y-2">
                  <div className="w-12 h-12 rounded-full bg-pink-50 dark:bg-pink-950/20 flex items-center justify-center text-rose-500 mb-2">
                    <Smile size={20} />
                  </div>
                  <h2 className="text-2xl font-serif italic text-stone-900 dark:text-stone-100 font-bold leading-tight">
                    How old are you, {firstName || 'Beautiful'}?
                  </h2>
                  <p className="text-xs text-stone-400 dark:text-stone-500 leading-relaxed font-serif italic">
                    Use: Helps provide age-appropriate cycle and health predictions.
                  </p>
                </div>

                <div className="flex flex-col items-center gap-4 py-2">
                  <div className="flex items-center gap-6">
                    <button
                      type="button"
                      onClick={() => setAge(Math.max(12, age - 1))}
                      className="w-12 h-12 bg-rose-50 dark:bg-stone-900 border border-rose-100 dark:border-stone-800 rounded-full flex items-center justify-center text-xl font-bold text-rose-600 hover:scale-105 active:scale-95 transition-all cursor-pointer"
                    >
                      -
                    </button>
                    <span className="text-4xl font-serif italic font-bold text-rose-600 w-16 text-center">
                      {age}
                    </span>
                    <button
                      type="button"
                      onClick={() => setAge(Math.min(99, age + 1))}
                      className="w-12 h-12 bg-rose-50 dark:bg-stone-900 border border-rose-100 dark:border-stone-800 rounded-full flex items-center justify-center text-xl font-bold text-rose-600 hover:scale-105 active:scale-95 transition-all cursor-pointer"
                    >
                      +
                    </button>
                  </div>
                  <p className="text-[10px] text-stone-400">
                    Use buttons to adjust or specify your age.
                  </p>
                </div>
              </motion.div>
            )}

            {/* Step 3: Last Period Start Date */}
            {step === 3 && (
              <motion.div
                key="step3"
                initial="enter"
                animate="center"
                exit="exit"
                custom={1}
                variants={slideVariants}
                className="space-y-6"
              >
                <div className="space-y-2">
                  <div className="w-12 h-12 rounded-full bg-pink-50 dark:bg-pink-950/20 flex items-center justify-center text-rose-500 mb-2">
                    <Calendar size={20} />
                  </div>
                  <h2 className="text-2xl font-serif italic text-stone-900 dark:text-stone-100 font-bold leading-tight">
                    When did your last period start?
                  </h2>
                  <p className="text-xs text-stone-400 dark:text-stone-500 leading-relaxed font-serif italic">
                    Use: Begins cycle predictions and phase calculations.
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="bg-rose-50/10 dark:bg-stone-900/30 p-5 rounded-[2rem] border border-rose-100/10 flex flex-col gap-3">
                    <input
                      type="date"
                      max={new Date().toISOString().split('T')[0]}
                      value={lastPeriodStart}
                      onChange={(e) => setLastPeriodStart(e.target.value)}
                      className="w-full bg-white dark:bg-stone-900 px-5 py-4 border border-rose-100 dark:border-stone-800 rounded-2xl text-xs font-bold text-rose-600 outline-none text-center shadow-inner"
                    />
                  </div>
                  <p className="text-[10px] text-center text-stone-400 italic">
                    💖 Select the exact or approximate starting date of your most recent flow.
                  </p>
                </div>
              </motion.div>
            )}

            {/* Step 4: Average Cycle Length */}
            {step === 4 && (
              <motion.div
                key="step4"
                initial="enter"
                animate="center"
                exit="exit"
                custom={1}
                variants={slideVariants}
                className="space-y-6"
              >
                <div className="space-y-2">
                  <div className="w-12 h-12 rounded-full bg-pink-50 dark:bg-pink-950/20 flex items-center justify-center text-rose-500 mb-2">
                    <RefreshCw size={20} />
                  </div>
                  <h2 className="text-2xl font-serif italic text-stone-900 dark:text-stone-100 font-bold leading-tight">
                    How long is your cycle on average?
                  </h2>
                  <p className="text-xs text-stone-400 dark:text-stone-500 leading-relaxed font-serif italic">
                    Use: Improves period and ovulation forecasts.
                  </p>
                </div>

                <div className="space-y-3 max-h-[250px] overflow-y-auto pr-1">
                  {[
                    { value: '21', label: '21 days' },
                    { value: '24', label: '24 days' },
                    { value: '28', label: '28 days (Typical)' },
                    { value: '30', label: '30 days' },
                    { value: '35', label: '35 days' },
                    { value: 'not_sure', label: 'Not sure' }
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setCycleLengthOption(opt.value)}
                      className={`w-full p-4 border rounded-2xl flex items-center justify-between text-left transition-all ${
                        cycleLengthOption === opt.value
                          ? 'border-rose-400 bg-rose-50/20 text-rose-950 dark:text-rose-100 font-bold'
                          : 'border-stone-100 dark:border-stone-800 bg-white dark:bg-stone-900 text-stone-600 dark:text-stone-300 hover:border-rose-200'
                      }`}
                    >
                      <span className="text-xs">{opt.label}</span>
                      {cycleLengthOption === opt.value && (
                        <div className="w-4 h-4 rounded-full bg-rose-500 text-white flex items-center justify-center">
                          <Check size={10} strokeWidth={4} />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Step 5: Flow Duration */}
            {step === 5 && (
              <motion.div
                key="step5"
                initial="enter"
                animate="center"
                exit="exit"
                custom={1}
                variants={slideVariants}
                className="space-y-6"
              >
                <div className="space-y-2">
                  <div className="w-12 h-12 rounded-full bg-pink-50 dark:bg-pink-950/20 flex items-center justify-center text-rose-500 mb-2">
                    <Droplets size={20} />
                  </div>
                  <h2 className="text-2xl font-serif italic text-stone-900 dark:text-stone-100 font-bold leading-tight">
                    How many days does your period usually last?
                  </h2>
                  <p className="text-xs text-stone-400 dark:text-stone-500 leading-relaxed font-serif italic">
                    Use: Improves cycle layouts and prediction duration.
                  </p>
                </div>

                <div className="space-y-3 max-h-[250px] overflow-y-auto pr-1">
                  {[
                    { value: '2-3', label: '2–3 days' },
                    { value: '4-5', label: '4–5 days (Typical)' },
                    { value: '6-7', label: '6–7 days' },
                    { value: '8+', label: '8+ days' },
                    { value: 'not_sure', label: 'Not sure' }
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setPeriodLengthOption(opt.value)}
                      className={`w-full p-4 border rounded-2xl flex items-center justify-between text-left transition-all ${
                        periodLengthOption === opt.value
                          ? 'border-rose-400 bg-rose-50/20 text-rose-950 dark:text-rose-100 font-bold'
                          : 'border-stone-100 dark:border-stone-800 bg-white dark:bg-stone-900 text-stone-600 dark:text-stone-300 hover:border-rose-200'
                      }`}
                    >
                      <span className="text-xs">{opt.label}</span>
                      {periodLengthOption === opt.value && (
                        <div className="w-4 h-4 rounded-full bg-rose-500 text-white flex items-center justify-center">
                          <Check size={10} strokeWidth={4} />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Step 6: Are you currently pregnant? */}
            {step === 6 && (
              <motion.div
                key="step6"
                initial="enter"
                animate="center"
                exit="exit"
                custom={1}
                variants={slideVariants}
                className="space-y-6"
              >
                <div className="space-y-2">
                  <div className="w-12 h-12 rounded-full bg-pink-50 dark:bg-pink-950/20 flex items-center justify-center text-rose-500 mb-2">
                    <Baby size={20} />
                  </div>
                  <h2 className="text-2xl font-serif italic text-stone-900 dark:text-stone-100 font-bold leading-tight">
                    Are you currently pregnant?
                  </h2>
                  <p className="text-xs text-stone-400 dark:text-stone-500 leading-relaxed font-serif italic">
                    Use: Activates specialized Pregnancy Mode or conception predictions.
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-3">
                  {[
                    { value: 'yes', label: 'Yes', desc: 'Enables specialized trimester tools and baby size milestones.', emoji: '🍼' },
                    { value: 'no', label: 'No', desc: 'Provides cycle tracking and symptom maps.', emoji: '🌸' },
                    { value: 'trying', label: 'Trying to conceive', desc: 'Tailors predictive charts to fertile windows.', emoji: '🌱' }
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setPregnancyStatus(opt.value as any)}
                      className={`w-full p-5 border rounded-[1.8rem] flex items-start gap-4 text-left transition-all ${
                        pregnancyStatus === opt.value
                          ? 'border-indigo-400 bg-indigo-50/10 text-indigo-950 dark:text-indigo-100 font-bold'
                          : 'border-stone-100 dark:border-stone-800 bg-white dark:bg-stone-900 text-stone-600 dark:text-stone-300 hover:border-indigo-200'
                      }`}
                    >
                      <span className="text-2xl">{opt.emoji}</span>
                      <div className="space-y-0.5 flex-grow">
                        <span className="text-xs font-bold font-serif italic">{opt.label}</span>
                        <p className="text-[10px] text-stone-400 dark:text-stone-500 leading-normal font-medium">{opt.desc}</p>
                      </div>
                      {pregnancyStatus === opt.value && (
                        <div className="w-4 h-4 rounded-full bg-indigo-500 text-white flex items-center justify-center self-center flex-shrink-0">
                          <Check size={10} strokeWidth={4} />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Step 7: What would you like help with? */}
            {step === 7 && (
              <motion.div
                key="step7"
                initial="enter"
                animate="center"
                exit="exit"
                custom={1}
                variants={slideVariants}
                className="space-y-6 animate-fadeIn"
              >
                <div className="space-y-2">
                  <div className="w-12 h-12 rounded-full bg-pink-50 dark:bg-pink-950/20 flex items-center justify-center text-rose-500 mb-2">
                    <Sparkles size={20} />
                  </div>
                  <h2 className="text-2xl font-serif italic text-stone-900 dark:text-stone-100 font-bold leading-tight">
                    What would you like help with?
                  </h2>
                  <p className="text-xs text-stone-400 dark:text-stone-500 leading-relaxed font-serif italic">
                    Select all that apply: Customizes your dashboard features.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2.5 max-h-[250px] overflow-y-auto pr-1 pb-1">
                  {helpsList.map((goal) => {
                    const isSel = helpsSelected.includes(goal.name);
                    return (
                      <button
                        key={goal.name}
                        type="button"
                        onClick={() => toggleHelpGoal(goal.name)}
                        className={`p-3 border rounded-2xl flex flex-col justify-between text-left transition-all ${
                          isSel
                            ? 'border-rose-300 bg-rose-50/20 text-rose-950 dark:text-rose-100 font-bold'
                            : 'border-stone-100 dark:border-stone-800 bg-white dark:bg-stone-900 text-stone-600 dark:text-stone-300 hover:border-rose-200'
                        }`}
                      >
                        <div className="flex justify-between items-start w-full">
                          <span className="text-lg">{goal.emoji}</span>
                          <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                            isSel ? 'bg-rose-500 border-rose-500 text-white' : 'border-gray-200 dark:border-stone-700'
                          }`}>
                            {isSel && <Check size={8} strokeWidth={4} />}
                          </div>
                        </div>
                        <div className="mt-2">
                          <p className="text-[10px] font-bold tracking-tight">{goal.name}</p>
                          <p className="text-[8px] text-stone-400 dark:text-stone-500 leading-tight mt-0.5 font-medium">{goal.desc}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {/* Step 8: What symptoms do you commonly experience? */}
            {step === 8 && (
              <motion.div
                key="step8"
                initial="enter"
                animate="center"
                exit="exit"
                custom={1}
                variants={slideVariants}
                className="space-y-6 animate-fadeIn"
              >
                <div className="space-y-2">
                  <div className="w-12 h-12 rounded-full bg-pink-50 dark:bg-pink-950/20 flex items-center justify-center text-rose-500 mb-2">
                    <Activity size={20} />
                  </div>
                  <h2 className="text-2xl font-serif italic text-stone-900 dark:text-stone-100 font-bold leading-tight">
                    Common symptoms
                  </h2>
                  <p className="text-xs text-stone-400 dark:text-stone-500 leading-relaxed font-serif italic">
                    Select all that apply: Helps us recommend tailored symptom relief guides.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2 max-h-[250px] overflow-y-auto pr-1 pb-1">
                  {commonSymptomsList.map((s) => {
                    const isSel = symptomsSelected.includes(s.name);
                    return (
                      <button
                        key={s.name}
                        type="button"
                        onClick={() => toggleSymptom(s.name)}
                        className={`p-3.5 border rounded-2xl flex items-center justify-between text-left transition-all ${
                          isSel
                            ? 'border-rose-300 bg-rose-50/20 text-rose-950 dark:text-rose-100 font-bold'
                            : 'border-stone-100 dark:border-stone-800 bg-white dark:bg-stone-900 text-stone-600 dark:text-stone-300 hover:border-rose-200'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-base">{s.emoji}</span>
                          <span className="text-[10px] font-bold">{s.name}</span>
                        </div>
                        <div className={`w-4 h-4 rounded-full border flex items-center justify-center flex-shrink-0 ${
                          isSel ? 'bg-rose-500 border-rose-500 text-white' : 'border-gray-200 dark:border-stone-700'
                        }`}>
                          {isSel && <Check size={8} strokeWidth={4} />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {/* Step 9: Period reminders? */}
            {step === 9 && (
              <motion.div
                key="step9"
                initial="enter"
                animate="center"
                exit="exit"
                custom={1}
                variants={slideVariants}
                className="space-y-6"
              >
                <div className="space-y-2">
                  <div className="w-12 h-12 rounded-full bg-pink-50 dark:bg-pink-950/20 flex items-center justify-center text-rose-500 mb-2">
                    <Bell size={20} />
                  </div>
                  <h2 className="text-2xl font-serif italic text-stone-900 dark:text-stone-100 font-bold leading-tight">
                    Would you like period reminders?
                  </h2>
                  <p className="text-xs text-stone-400 dark:text-stone-500 leading-relaxed font-serif italic">
                    Use: Enables comforting, non-intrusive notifications before your flow starts.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => setPeriodReminders(true)}
                    className={`p-6 border-2 rounded-3xl flex flex-col justify-center items-center text-center min-h-[140px] relative transition-all ${
                      periodReminders
                        ? 'border-rose-400 bg-rose-50/20 shadow-md shadow-rose-100/30'
                        : 'border-stone-100 dark:border-stone-800 bg-white dark:bg-stone-900 text-stone-400'
                    }`}
                  >
                    <span className="text-3xl mb-2">🔔</span>
                    <span className="text-xs font-bold font-serif italic text-rose-950 dark:text-rose-100">Yes, please</span>
                    <p className="text-[8px] text-stone-400 mt-1">Gently reminds 2 days prior</p>
                    {periodReminders && (
                      <div className="absolute top-3 right-3 w-4 h-4 rounded-full bg-rose-500 text-white flex items-center justify-center">
                        <Check size={8} strokeWidth={4} />
                      </div>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => setPeriodReminders(false)}
                    className={`p-6 border-2 rounded-3xl flex flex-col justify-center items-center text-center min-h-[140px] relative transition-all ${
                      !periodReminders
                        ? 'border-stone-400 bg-stone-50/10 text-stone-950 dark:text-stone-100 font-bold'
                        : 'border-stone-100 dark:border-stone-800 bg-white dark:bg-stone-900 text-stone-400'
                    }`}
                  >
                    <span className="text-3xl mb-2">🔕</span>
                    <span className="text-xs font-bold font-serif italic">No, thanks</span>
                    <p className="text-[8px] text-stone-400 mt-1">I will monitor inside app</p>
                    {!periodReminders && (
                      <div className="absolute top-3 right-3 w-4 h-4 rounded-full bg-stone-500 text-white flex items-center justify-center">
                        <Check size={8} strokeWidth={4} />
                      </div>
                    )}
                  </button>
                </div>
              </motion.div>
            )}

            {/* Step 10: Ovulation reminders? */}
            {step === 10 && (
              <motion.div
                key="step10"
                initial="enter"
                animate="center"
                exit="exit"
                custom={1}
                variants={slideVariants}
                className="space-y-6"
              >
                <div className="space-y-2">
                  <div className="w-12 h-12 rounded-full bg-pink-50 dark:bg-pink-950/20 flex items-center justify-center text-rose-500 mb-2">
                    <Sparkle size={20} />
                  </div>
                  <h2 className="text-2xl font-serif italic text-stone-900 dark:text-stone-100 font-bold leading-tight">
                    Would you like ovulation reminders?
                  </h2>
                  <p className="text-xs text-stone-400 dark:text-stone-500 leading-relaxed font-serif italic">
                    Use: Enables notifications about fertile windows and ovulation days.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => setOvulationReminders(true)}
                    className={`p-6 border-2 rounded-3xl flex flex-col justify-center items-center text-center min-h-[140px] relative transition-all ${
                      ovulationReminders
                        ? 'border-rose-400 bg-rose-50/20 shadow-md shadow-rose-100/30'
                        : 'border-stone-100 dark:border-stone-800 bg-white dark:bg-stone-900 text-stone-400'
                    }`}
                  >
                    <span className="text-3xl mb-2">✨</span>
                    <span className="text-xs font-bold font-serif italic text-rose-950 dark:text-rose-100">Yes, please</span>
                    <p className="text-[8px] text-stone-400 mt-1">Stay updated on fertile peak</p>
                    {ovulationReminders && (
                      <div className="absolute top-3 right-3 w-4 h-4 rounded-full bg-rose-500 text-white flex items-center justify-center">
                        <Check size={8} strokeWidth={4} />
                      </div>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => setOvulationReminders(false)}
                    className={`p-6 border-2 rounded-3xl flex flex-col justify-center items-center text-center min-h-[140px] relative transition-all ${
                      !ovulationReminders
                        ? 'border-stone-400 bg-stone-50/10 text-stone-950 dark:text-stone-100 font-bold'
                        : 'border-stone-100 dark:border-stone-800 bg-white dark:bg-stone-900 text-stone-400'
                    }`}
                  >
                    <span className="text-3xl mb-2">🔕</span>
                    <span className="text-xs font-bold font-serif italic">No, thanks</span>
                    <p className="text-[8px] text-stone-400 mt-1">Keep notifications muted</p>
                    {!ovulationReminders && (
                      <div className="absolute top-3 right-3 w-4 h-4 rounded-full bg-rose-500 text-white flex items-center justify-center">
                        <Check size={8} strokeWidth={4} />
                      </div>
                    )}
                  </button>
                </div>
              </motion.div>
            )}

            {/* Step 11: Wellness reminders? */}
            {step === 11 && (
              <motion.div
                key="step11"
                initial="enter"
                animate="center"
                exit="exit"
                custom={1}
                variants={slideVariants}
                className="space-y-6"
              >
                <div className="space-y-2">
                  <div className="w-12 h-12 rounded-full bg-pink-50 dark:bg-pink-950/20 flex items-center justify-center text-rose-500 mb-2">
                    <Heart size={20} />
                  </div>
                  <h2 className="text-2xl font-serif italic text-stone-900 dark:text-stone-100 font-bold leading-tight">
                    Would you like wellness reminders?
                  </h2>
                  <p className="text-xs text-stone-400 dark:text-stone-500 leading-relaxed font-serif italic">
                    Use: Encourages daily self-care habits, hydration, and supplement logging.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => setWellnessReminders(true)}
                    className={`p-6 border-2 rounded-3xl flex flex-col justify-center items-center text-center min-h-[140px] relative transition-all ${
                      wellnessReminders
                        ? 'border-rose-400 bg-rose-50/20 shadow-md shadow-rose-100/30'
                        : 'border-stone-100 dark:border-stone-800 bg-white dark:bg-stone-900 text-stone-400'
                    }`}
                  >
                    <span className="text-3xl mb-2">🧘</span>
                    <span className="text-xs font-bold font-serif italic text-rose-950 dark:text-rose-100">Yes, please</span>
                    <p className="text-[8px] text-stone-400 mt-1">Hydration & self-care prompts</p>
                    {wellnessReminders && (
                      <div className="absolute top-3 right-3 w-4 h-4 rounded-full bg-rose-500 text-white flex items-center justify-center">
                        <Check size={8} strokeWidth={4} />
                      </div>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => setWellnessReminders(false)}
                    className={`p-6 border-2 rounded-3xl flex flex-col justify-center items-center text-center min-h-[140px] relative transition-all ${
                      !wellnessReminders
                        ? 'border-stone-400 bg-stone-50/10 text-stone-950 dark:text-stone-100 font-bold'
                        : 'border-stone-100 dark:border-stone-800 bg-white dark:bg-stone-900 text-stone-400'
                    }`}
                  >
                    <span className="text-3xl mb-2">🔕</span>
                    <span className="text-xs font-bold font-serif italic">No, thanks</span>
                    <p className="text-[8px] text-stone-400 mt-1">Disable wellness popups</p>
                    {!wellnessReminders && (
                      <div className="absolute top-3 right-3 w-4 h-4 rounded-full bg-rose-500 text-white flex items-center justify-center">
                        <Check size={8} strokeWidth={4} />
                      </div>
                    )}
                  </button>
                </div>
              </motion.div>
            )}

            {/* Step 12: Connect a partner later? */}
            {step === 12 && (
              <motion.div
                key="step12"
                initial="enter"
                animate="center"
                exit="exit"
                custom={1}
                variants={slideVariants}
                className="space-y-6"
              >
                <div className="space-y-2">
                  <div className="w-12 h-12 rounded-full bg-pink-50 dark:bg-pink-950/20 flex items-center justify-center text-rose-500 mb-2">
                    <Heart size={20} className="text-rose-500" />
                  </div>
                  <h2 className="text-2xl font-serif italic text-stone-900 dark:text-stone-100 font-bold leading-tight">
                    Would you like to connect a partner later?
                  </h2>
                  <p className="text-xs text-stone-400 dark:text-stone-500 leading-relaxed font-serif italic">
                    Use: Introduces Partner Mode without forcing it right now.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => setConnectPartner(true)}
                    className={`p-6 border-2 rounded-3xl flex flex-col justify-center items-center text-center min-h-[140px] relative transition-all ${
                      connectPartner
                        ? 'border-indigo-400 bg-indigo-50/20 shadow-md shadow-indigo-100/30'
                        : 'border-stone-100 dark:border-stone-800 bg-white dark:bg-stone-900 text-stone-400'
                    }`}
                  >
                    <span className="text-3xl mb-2">💞</span>
                    <span className="text-xs font-bold font-serif italic text-indigo-950 dark:text-indigo-100">Yes, absolutely</span>
                    <p className="text-[8px] text-stone-400 mt-1">Synchronize timeline later</p>
                    {connectPartner && (
                      <div className="absolute top-3 right-3 w-4 h-4 rounded-full bg-indigo-500 text-white flex items-center justify-center">
                        <Check size={8} strokeWidth={4} />
                      </div>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => setConnectPartner(false)}
                    className={`p-6 border-2 rounded-3xl flex flex-col justify-center items-center text-center min-h-[140px] relative transition-all ${
                      !connectPartner
                        ? 'border-stone-400 bg-stone-50/10 text-stone-950 dark:text-stone-100 font-bold'
                        : 'border-stone-100 dark:border-stone-800 bg-white dark:bg-stone-900 text-stone-400'
                    }`}
                  >
                    <span className="text-3xl mb-2">🔒</span>
                    <span className="text-xs font-bold font-serif italic">Not now</span>
                    <p className="text-[8px] text-stone-400 mt-1">Keep tracking strictly private</p>
                    {!connectPartner && (
                      <div className="absolute top-3 right-3 w-4 h-4 rounded-full bg-indigo-500 text-white flex items-center justify-center">
                        <Check size={8} strokeWidth={4} />
                      </div>
                    )}
                  </button>
                </div>
              </motion.div>
            )}

            {/* Step 13: Final Summary Screen */}
            {step === 13 && (
              <motion.div
                key="step13"
                initial="enter"
                animate="center"
                exit="exit"
                custom={1}
                variants={slideVariants}
                className="space-y-6 animate-fadeIn"
              >
                <div className="space-y-2 text-center">
                  <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-pink-50 dark:bg-pink-950/20 text-rose-500 mb-2 shadow-inner">
                    <Award size={28} className="animate-bounce" />
                  </div>
                  <h2 className="text-3xl font-serif italic text-stone-900 dark:text-stone-100 leading-tight font-bold">
                    Your Lumina profile is ready!
                  </h2>
                  <p className="text-xs text-stone-400 dark:text-stone-500 leading-relaxed font-serif italic max-w-sm mx-auto">
                    Your cycle sanctuary has been beautifully initialized. Here is your customized setup.
                  </p>
                </div>

                <div className="bg-rose-50/20 dark:bg-stone-900/40 border border-rose-100/30 dark:border-stone-800 p-5 rounded-3xl space-y-3.5 text-xs">
                  <div className="flex justify-between items-center bg-white dark:bg-[#1f1b1a] px-4 py-3 rounded-2xl shadow-sm border border-stone-100/50 dark:border-stone-800/80">
                    <span className="text-stone-400 dark:text-stone-500 font-serif italic">Name</span>
                    <span className="font-bold text-rose-600 dark:text-rose-400">{firstName}</span>
                  </div>

                  <div className="flex justify-between items-center bg-white dark:bg-[#1f1b1a] px-4 py-3 rounded-2xl shadow-sm border border-stone-100/50 dark:border-stone-800/80">
                    <span className="text-stone-400 dark:text-stone-500 font-serif italic">Cycle Length</span>
                    <span className="font-bold text-stone-700 dark:text-stone-300">
                      {getCycleLengthValue()} Days
                    </span>
                  </div>

                  <div className="flex justify-between items-center bg-white dark:bg-[#1f1b1a] px-4 py-3 rounded-2xl shadow-sm border border-stone-100/50 dark:border-stone-800/80">
                    <span className="text-stone-400 dark:text-stone-500 font-serif italic">Period Length</span>
                    <span className="font-bold text-stone-700 dark:text-stone-300">
                      {getPeriodLengthValue()} Days
                    </span>
                  </div>

                  <div className="flex justify-between items-center bg-white dark:bg-[#1f1b1a] px-4 py-3 rounded-2xl shadow-sm border border-stone-100/50 dark:border-stone-800/80">
                    <span className="text-stone-400 dark:text-stone-500 font-serif italic">Pregnancy Mode</span>
                    <span className="font-bold text-indigo-600 dark:text-indigo-400">
                      {pregnancyStatus === 'yes' 
                        ? 'On 🍼' 
                        : pregnancyStatus === 'trying' 
                        ? 'Trying to Conceive 🌱' 
                        : 'Off 🌸'}
                    </span>
                  </div>

                  <div className="flex justify-between items-center bg-white dark:bg-[#1f1b1a] px-4 py-3 rounded-2xl shadow-sm border border-stone-100/50 dark:border-stone-800/80">
                    <span className="text-stone-400 dark:text-stone-500 font-serif italic">Notifications</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">
                      {periodReminders || ovulationReminders || wellnessReminders ? 'Enabled 🔔' : 'Disabled 🔕'}
                    </span>
                  </div>
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </div>

        {/* Lower Navigation Controller */}
        <div className="flex justify-between items-center pt-6 border-t border-stone-100 dark:border-stone-800/80 mt-4">
          <button
            type="button"
            onClick={handleBack}
            disabled={step === 1 || step === totalSteps}
            className={`px-5 py-3 cursor-pointer select-none rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 transition-all ${
              step === 1 || step === totalSteps
                ? 'opacity-0 pointer-events-none' 
                : 'text-stone-400 hover:text-stone-600 dark:hover:text-stone-200'
            }`}
          >
            <ChevronLeft size={13} />
            Back
          </button>

          <button
            type="button"
            onClick={handleNext}
            className={`px-6 py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest text-white shadow-lg flex items-center gap-2 transition-all hover:scale-[1.02] active:scale-95 ${
              step === totalSteps
                ? 'bg-gradient-to-r from-emerald-500 to-teal-500 shadow-emerald-200/40'
                : 'bg-gradient-to-r from-rose-500 to-indigo-600 shadow-rose-100/40'
            }`}
            style={{
              backgroundImage: step === totalSteps
                ? 'linear-gradient(to right, #10b981, #14b8a6)'
                : 'linear-gradient(to right, #ec4899, #f43f5e)',
              boxShadow: step === totalSteps
                ? '0 10px 25px rgba(16, 185, 129, 0.25)'
                : '0 10px 25px rgba(244, 63, 94, 0.25)'
            }}
          >
            {step === totalSteps ? (
              <>
                <Sparkles size={11} className="animate-spin-slow" />
                Enter My Sanctuary
              </>
            ) : (
              <>
                Continue
                <ChevronRight size={13} />
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
};
