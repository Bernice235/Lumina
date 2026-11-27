import React, { useState } from 'react';
import { User, PartnerNotificationPreferences } from '../types';
import { THEMES } from '../constants';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Sparkles, 
  ChevronRight, 
  ChevronLeft, 
  Heart, 
  Check, 
  Bell, 
  BookOpen, 
  Clock, 
  ShieldCheck, 
  Award,
  CheckCircle2
} from 'lucide-react';
import { syncUser } from '../services/firebaseService';
import { trackCompleteOnboarding } from '../services/analyticsService';
import { saveEncryptedSessionUser, secureStorage } from '../services/secureStorage';

interface PartnerOnboardingWizardProps {
  user: User;
  setUser: React.Dispatch<React.SetStateAction<User | null>>;
  onComplete: (user: User) => void;
}

export const PartnerOnboardingWizard: React.FC<PartnerOnboardingWizardProps> = ({ user, setUser, onComplete }) => {
  const [step, setStep] = useState(1);
  const totalSteps = 5;

  // Step 2 Notifications list (8 options requested)
  const NOTIFICATION_OPTIONS = [
    { id: 'periodStarting', label: 'Period Starting', desc: 'Alerts when period is predicted to start' },
    { id: 'periodEnding', label: 'Period Ending', desc: 'Alerts when period is ending' },
    { id: 'ovulation', label: 'Ovulation', desc: 'Alerts on ovulation day' },
    { id: 'fertileWindow', label: 'Fertile Window', desc: 'Updates when fertile window begins' },
    { id: 'moodUpdates', label: 'Mood Updates', desc: 'Real-time updates when mood logs are shared' },
    { id: 'symptomUpdates', label: 'Symptom Updates', desc: 'Alerts when symptoms or discomfort are logged' },
    { id: 'medicationReminders', label: 'Medication Reminders', desc: 'Support reminders for medication or birth control' },
    { id: 'wellnessCheckIns', label: 'Wellness Check-ins', desc: 'Regular check-in tips and care suggestions' },
  ];

  const [selectedNotifs, setSelectedNotifs] = useState<Record<string, boolean>>({
    periodStarting: true,
    periodEnding: true,
    ovulation: true,
    fertileWindow: true,
    moodUpdates: true,
    symptomUpdates: true,
    medicationReminders: true,
    wellnessCheckIns: true,
  });

  // Step 3 Partner Education Interests (6 options requested)
  const EDUCATION_OPTIONS = [
    'Understanding Menstruation',
    'Ovulation & Fertility',
    'PMS & Mood Changes',
    'Sexual Health',
    'Infection Prevention',
    'Supporting a Partner During Periods',
  ];

  const [selectedEducation, setSelectedEducation] = useState<string[]>([
    'Understanding Menstruation',
    'Supporting a Partner During Periods',
  ]);

  // Step 4 Notification Frequency (3 options requested)
  const FREQUENCY_OPTIONS = [
    {
      id: 'Important Events Only',
      title: 'Important Events Only',
      desc: 'Only essential updates like period start and ovulation alerts.',
      emoji: '🔔'
    },
    {
      id: 'Daily Insights',
      title: 'Daily Insights',
      desc: 'Daily wellness summaries, phase updates, and care tips.',
      emoji: '☀️'
    },
    {
      id: 'Full Companion Mode',
      title: 'Full Companion Mode',
      desc: 'Comprehensive real-time alerts, mood updates, and active care missions.',
      emoji: '💖'
    }
  ];

  const [selectedFrequency, setSelectedFrequency] = useState<string>('Full Companion Mode');

  const toggleNotif = (id: string) => {
    setSelectedNotifs(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const toggleEducation = (option: string) => {
    if (selectedEducation.includes(option)) {
      setSelectedEducation(selectedEducation.filter(e => e !== option));
    } else {
      setSelectedEducation([...selectedEducation, option]);
    }
  };

  const handleNext = () => {
    if (step < totalSteps) {
      setStep(step + 1);
    } else {
      handleFinish();
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const handleFinish = () => {
    const partnerNotifPrefs: PartnerNotificationPreferences = {
      periodStarting: !!selectedNotifs.periodStarting,
      periodEnding: !!selectedNotifs.periodEnding,
      ovulation: !!selectedNotifs.ovulation,
      ovulationUpdates: !!selectedNotifs.ovulation,
      fertileWindow: !!selectedNotifs.fertileWindow,
      moodUpdates: !!selectedNotifs.moodUpdates,
      symptomUpdates: !!selectedNotifs.symptomUpdates,
      medicationReminders: !!selectedNotifs.medicationReminders,
      wellnessCheckIns: !!selectedNotifs.wellnessCheckIns,
      frequency: selectedFrequency,
    };

    const updatedUser: User = {
      ...user,
      isPartner: true,
      partnerOnboardingCompleted: true,
      onboardingCompleted: true,
      partnerNotificationPreferences: partnerNotifPrefs,
      partnerEducationPreferences: selectedEducation,
      notificationSettings: {
        ...(user.notificationSettings || {
          enabled: true,
          toneStyle: 'aesthetic',
          reminderDaysBefore: 2,
          quietHours: { enabled: false, startTime: '22:00', endTime: '07:00' },
          types: {
            periodStarting: true,
            periodStarted: true,
            periodEnding: true,
            ovulation: true,
            fertileWindow: true,
            lutealPhase: true,
            pregnancyRisk: true
          },
          pregnancyEnabled: false,
          partnerPregnancyEnabled: false,
          pregnancyReminderTime: '09:00',
          pregnancyTypes: {
            welcome: true, weeklyBabyDev: true, babySizeUpdate: true, appointment: true, medicationVitamin: true, hydration: true, rest: true, kickCounter: true, symptomCheck: true, dueDateCountdown: true, laborNear: true, encouragement: true, hospitalBag: true, contractionTimer: true, breastfeedingPrep: true, birthPlan: true, postpartumPrep: true
          },
          partnerPregnancyReceiveTypes: {
            welcome: true, weeklyBabyDev: true, appointment: true, rest: true, symptomSupport: true, dueDateCountdown: true, laborNear: true, encouragement: true
          }
        }),
        partnerNotificationsEnabled: true,
        partnerReceiveTypes: {
          periodStarting: !!selectedNotifs.periodStarting,
          periodStarted: !!selectedNotifs.periodStarting,
          periodEnding: !!selectedNotifs.periodEnding,
          ovulation: !!selectedNotifs.ovulation,
          fertileWindow: !!selectedNotifs.fertileWindow,
          pregnancyRisk: !!selectedNotifs.fertileWindow
        }
      }
    };

    setUser(updatedUser);
    const rememberPref = localStorage.getItem('lumina_remember_me') !== 'false';
    void saveEncryptedSessionUser(updatedUser, rememberPref);
    if (updatedUser.email) {
      void secureStorage.setItem('offline_user_' + updatedUser.email.toLowerCase().trim(), JSON.stringify(updatedUser));
    }
    syncUser(updatedUser);
    trackCompleteOnboarding(true);
    onComplete(updatedUser);
  };

  const currentThemeInfo = THEMES[user.theme || 'rose'];

  const slideVariants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 80 : -80,
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
      x: direction < 0 ? 80 : -80,
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
    <div id="partner_onboarding_container" className={`min-h-screen ${currentThemeInfo?.bg || 'bg-[#faf8f6] dark:bg-[#11100f]'} flex items-center justify-center p-4 transition-colors duration-300 font-sans`}>
      <div id="partner_onboarding_card" className="bg-white dark:bg-[#1a1816] px-6 py-7 md:px-9 md:py-9 rounded-2xl shadow-sm border border-stone-200/80 dark:border-[#2e2a26] w-full max-w-xl flex flex-col justify-between min-h-[560px] relative transition-colors">

        {/* Header step progress */}
        <div className="space-y-3">
          <div className="flex justify-between items-center text-xs font-semibold text-indigo-600 dark:text-indigo-400">
            <span className="flex items-center gap-1.5">
              <Sparkles size={14} className="text-indigo-500" />
              Partner Onboarding
            </span>
            <span className="font-serif font-semibold text-stone-700 dark:text-stone-300 tabular-nums">
              Step {step} of {totalSteps}
            </span>
          </div>

          <div className="w-full h-1.5 bg-stone-100 dark:bg-[#23201d] rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-indigo-600"
              initial={{ width: '0%' }}
              animate={{ width: `${(step / totalSteps) * 100}%` }}
              transition={{ type: 'spring', stiffness: 120 }}
            ></motion.div>
          </div>
        </div>

        {/* Step Content */}
        <div className="my-6 flex-grow flex flex-col justify-center min-h-[360px]">
          <AnimatePresence mode="wait" custom={step}>

            {/* STEP 1: Welcome Partner */}
            {step === 1 && (
              <motion.div
                key="pstep1"
                initial="enter"
                animate="center"
                exit="exit"
                custom={1}
                variants={slideVariants}
                className="space-y-5 text-center"
              >
                <div className="flex justify-center">
                  <div className="w-20 h-20 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 flex items-center justify-center border border-indigo-200/60 dark:border-indigo-900/50 text-indigo-600 dark:text-indigo-400">
                    <Heart className="w-9 h-9" />
                  </div>
                </div>
                <div className="space-y-3">
                  <h1 className="text-3xl font-serif text-stone-900 dark:text-stone-100 font-semibold leading-tight">
                    Welcome, Partner
                  </h1>
                  <p className="text-sm md:text-base text-stone-600 dark:text-stone-300 max-w-md mx-auto leading-relaxed">
                    Your connection request has been approved. Set up your partner companion preferences to stay informed and supportive.
                  </p>
                </div>
              </motion.div>
            )}

            {/* STEP 2: What notifications would you like to receive? */}
            {step === 2 && (
              <motion.div
                key="pstep2"
                initial="enter"
                animate="center"
                exit="exit"
                custom={1}
                variants={slideVariants}
                className="space-y-4"
              >
                <div className="space-y-1 text-center md:text-left">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 text-xs font-semibold">
                    <Bell size={13} />
                    Notification Preferences
                  </div>
                  <h2 className="text-2xl font-serif text-stone-900 dark:text-stone-100 font-semibold">
                    What notifications would you like to receive?
                  </h2>
                  <p className="text-xs text-stone-500 dark:text-stone-400">
                    Select the updates you wish to receive about your partner's cycle.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 max-h-[320px] overflow-y-auto pr-1 pb-1 scrollbar-thin">
                  {NOTIFICATION_OPTIONS.map((item) => {
                    const isChecked = !!selectedNotifs[item.id];
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => toggleNotif(item.id)}
                        className={`p-3.5 border rounded-xl flex items-center justify-between text-left transition-colors cursor-pointer ${
                          isChecked
                            ? 'border-indigo-500 bg-indigo-50/60 dark:bg-indigo-950/30 text-stone-900 dark:text-stone-100'
                            : 'border-stone-200/80 dark:border-[#342f2b] bg-[#faf8f6] dark:bg-[#23201d] text-stone-600 dark:text-stone-300 hover:border-indigo-300'
                        }`}
                      >
                        <div className="pr-2">
                          <p className="text-xs font-semibold text-stone-900 dark:text-stone-100">
                            {item.label}
                          </p>
                          <p className="text-[11px] text-stone-500 dark:text-stone-400 leading-snug mt-0.5">
                            {item.desc}
                          </p>
                        </div>
                        <div className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 transition-colors ${
                          isChecked ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-stone-300 dark:border-stone-600 bg-white dark:bg-[#1a1816]'
                        }`}>
                          {isChecked && <Check size={13} strokeWidth={3} />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {/* STEP 3: Partner Education Interests */}
            {step === 3 && (
              <motion.div
                key="pstep3"
                initial="enter"
                animate="center"
                exit="exit"
                custom={1}
                variants={slideVariants}
                className="space-y-4"
              >
                <div className="space-y-1 text-center md:text-left">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 text-xs font-semibold">
                    <BookOpen size={13} />
                    Learning & Guidance
                  </div>
                  <h2 className="text-2xl font-serif text-stone-900 dark:text-stone-100 font-semibold">
                    Partner Education Interests
                  </h2>
                  <p className="text-xs text-stone-500 dark:text-stone-400">
                    Which topics would you like concise tips and guides on?
                  </p>
                </div>

                <div className="space-y-2.5 max-h-[320px] overflow-y-auto pr-1 pb-1">
                  {EDUCATION_OPTIONS.map((option) => {
                    const isSel = selectedEducation.includes(option);
                    return (
                      <button
                        key={option}
                        type="button"
                        onClick={() => toggleEducation(option)}
                        className={`w-full p-4 border rounded-xl flex items-center justify-between text-left transition-colors cursor-pointer ${
                          isSel
                            ? 'border-indigo-500 bg-indigo-50/60 dark:bg-indigo-950/30 text-stone-900 dark:text-stone-100 font-semibold'
                            : 'border-stone-200/80 dark:border-[#342f2b] bg-[#faf8f6] dark:bg-[#23201d] text-stone-700 dark:text-stone-300 hover:border-indigo-300'
                        }`}
                      >
                        <span className="text-sm font-medium">{option}</span>
                        <div className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 transition-colors ${
                          isSel ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-stone-300 dark:border-stone-600 bg-white dark:bg-[#1a1816]'
                        }`}>
                          {isSel && <Check size={13} strokeWidth={3} />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {/* STEP 4: Notification Frequency */}
            {step === 4 && (
              <motion.div
                key="pstep4"
                initial="enter"
                animate="center"
                exit="exit"
                custom={1}
                variants={slideVariants}
                className="space-y-4"
              >
                <div className="space-y-1 text-center md:text-left">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-pink-50 dark:bg-pink-950/40 text-pink-700 dark:text-pink-300 text-xs font-semibold">
                    <Clock size={13} />
                    Delivery Frequency
                  </div>
                  <h2 className="text-2xl font-serif text-stone-900 dark:text-stone-100 font-semibold">
                    Notification Frequency
                  </h2>
                  <p className="text-xs text-stone-500 dark:text-stone-400">
                    Choose how often you would like to receive companion updates.
                  </p>
                </div>

                <div className="space-y-3">
                  {FREQUENCY_OPTIONS.map((freq) => {
                    const isSelected = selectedFrequency === freq.id;
                    return (
                      <button
                        key={freq.id}
                        type="button"
                        onClick={() => setSelectedFrequency(freq.id)}
                        className={`w-full p-4 border rounded-xl flex items-start gap-3.5 text-left transition-colors cursor-pointer ${
                          isSelected
                            ? 'border-indigo-500 bg-indigo-50/60 dark:bg-indigo-950/30 text-stone-900 dark:text-stone-100'
                            : 'border-stone-200/80 dark:border-[#342f2b] bg-[#faf8f6] dark:bg-[#23201d] text-stone-700 dark:text-stone-300 hover:border-indigo-300'
                        }`}
                      >
                        <span className="text-xl mt-0.5 shrink-0">{freq.emoji}</span>
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-stone-900 dark:text-stone-100">
                            {freq.title}
                          </p>
                          <p className="text-xs text-stone-500 dark:text-stone-400 mt-1 leading-relaxed">
                            {freq.desc}
                          </p>
                        </div>
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-1 transition-colors ${
                          isSelected ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-stone-300 dark:border-stone-600 bg-white dark:bg-[#1a1816]'
                        }`}>
                          {isSelected && <div className="w-2 h-2 rounded-full bg-white"></div>}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {/* STEP 5: Complete Setup */}
            {step === 5 && (
              <motion.div
                key="pstep5"
                initial="enter"
                animate="center"
                exit="exit"
                custom={1}
                variants={slideVariants}
                className="space-y-5 text-center py-4"
              >
                <div className="flex justify-center">
                  <div className="w-16 h-16 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-center text-emerald-600 dark:text-emerald-400 border border-emerald-200/70 dark:border-emerald-900/50">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>
                </div>
                <div className="space-y-2">
                  <h1 className="text-3xl font-serif text-stone-900 dark:text-stone-100 font-semibold leading-tight">
                    Setup Complete
                  </h1>
                  <p className="text-sm text-stone-600 dark:text-stone-300 max-w-sm mx-auto leading-relaxed">
                    Your preferences are saved. You are ready to open your Connected Partner Dashboard.
                  </p>
                </div>

                <div className="p-4 bg-[#faf8f6] dark:bg-[#23201d] rounded-xl border border-stone-200/80 dark:border-[#342f2b] text-left text-xs space-y-2.5 max-w-sm mx-auto">
                  <div className="flex items-center justify-between">
                    <span className="text-stone-500 dark:text-stone-400 font-medium">Frequency Mode</span>
                    <span className="text-indigo-600 dark:text-indigo-400 font-semibold">{selectedFrequency}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-stone-500 dark:text-stone-400 font-medium">Topics Selected</span>
                    <span className="text-indigo-600 dark:text-indigo-400 font-semibold tabular-nums">{selectedEducation.length} categories</span>
                  </div>
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </div>

        {/* Footer Controls */}
        <div className="border-t border-stone-200/80 dark:border-[#2e2a26] pt-5 mt-2 flex items-center justify-between gap-4">
          {step > 1 ? (
            <button
              type="button"
              onClick={handleBack}
              className="flex items-center gap-1 text-xs font-semibold text-stone-600 dark:text-stone-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors cursor-pointer shrink-0"
            >
              <ChevronLeft size={16} />
              Back
            </button>
          ) : (
            <div></div>
          )}

          {step < totalSteps ? (
            <button
              type="button"
              onClick={handleNext}
              className="flex items-center gap-1.5 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap"
            >
              Continue
              <ChevronRight size={14} />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleNext}
              className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap"
            >
              Open Partner Dashboard
            </button>
          )}
        </div>

      </div>
    </div>
  );
};
