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
    localStorage.setItem('lumina_user', JSON.stringify(updatedUser));
    if (updatedUser.email) {
      localStorage.setItem('lumina_user_email_' + updatedUser.email.toLowerCase().trim(), JSON.stringify(updatedUser));
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
        x: { type: 'spring', stiffness: 350, damping: 35 },
        opacity: { duration: 0.2 },
        scale: { duration: 0.2 }
      }
    },
    exit: (direction: number) => ({
      x: direction < 0 ? 80 : -80,
      opacity: 0,
      scale: 0.98,
      transition: {
        x: { type: 'spring', stiffness: 350, damping: 35 },
        opacity: { duration: 0.15 },
        scale: { duration: 0.15 }
      }
    })
  };

  return (
    <div id="partner_onboarding_container" className={`min-h-screen ${currentThemeInfo?.bg || 'bg-gradient-to-br from-indigo-50 to-pink-50/30'} flex items-center justify-center p-4 relative overflow-hidden transition-colors duration-500 font-sans`}>
      {/* Background ambient glow */}
      <div className="absolute top-[-10%] left-[-10%] w-[45%] h-[45%] rounded-full blur-[120px] opacity-25 bg-indigo-300 dark:bg-indigo-900/20 transition-all duration-700 animate-pulse"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[45%] h-[45%] rounded-full blur-[120px] opacity-20 bg-purple-300 dark:bg-purple-900/20 transition-all duration-700 animate-pulse"></div>

      <div id="partner_onboarding_card" className="bg-white/90 dark:bg-stone-900/90 backdrop-blur-2xl px-6 py-8 md:px-10 md:py-10 rounded-[2.5rem] shadow-[0_20px_50px_rgba(99,102,241,0.08)] border border-white/60 dark:border-stone-800/50 w-full max-w-xl z-10 flex flex-col justify-between min-h-[580px] relative transition-all">
        
        {/* Header step progress */}
        <div className="space-y-3">
          <div className="flex justify-between items-center text-[10px] font-black tracking-widest uppercase text-indigo-600 transition-colors">
            <span className="flex items-center gap-1.5 font-bold tracking-widest">
              <Sparkles size={12} className="text-indigo-500 animate-pulse" />
              PARTNER ONBOARDING
            </span>
            <span className="font-serif italic font-bold text-indigo-700">
              Step {step} of {totalSteps}
            </span>
          </div>
          
          <div className="w-full h-1.5 bg-indigo-50 dark:bg-stone-800 rounded-full overflow-hidden">
            <motion.div 
              className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"
              initial={{ width: '0%' }}
              animate={{ width: `${(step / totalSteps) * 100}%` }}
              transition={{ type: 'spring', stiffness: 100 }}
            ></motion.div>
          </div>
        </div>

        {/* Step Content */}
        <div className="my-6 flex-grow flex flex-col justify-center min-h-[360px]">
          <AnimatePresence mode="wait" custom={step}>
            
            {/* STEP 1: Welcome Partner 💜 */}
            {step === 1 && (
              <motion.div
                key="pstep1"
                initial="enter"
                animate="center"
                exit="exit"
                custom={1}
                variants={slideVariants}
                className="space-y-6 text-center"
              >
                <div className="flex justify-center">
                  <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-purple-100 to-indigo-100 dark:bg-indigo-950/40 flex items-center justify-center text-4xl shadow-inner border border-purple-200/50 animate-pulse">
                    💜
                  </div>
                </div>
                <div className="space-y-3">
                  <h1 className="text-3xl md:text-4xl font-serif italic text-stone-900 dark:text-stone-100 font-bold leading-tight">
                    Welcome Partner 💜
                  </h1>
                  <p className="text-sm md:text-base text-stone-600 dark:text-stone-300 font-serif italic max-w-md mx-auto leading-relaxed">
                    Your connection request has been approved! Let's set up your personalized partner companion preferences to help you support your loved one seamlessly.
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
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-300 text-[10px] font-black uppercase tracking-widest">
                    <Bell size={12} />
                    NOTIFICATION PREFERENCES
                  </div>
                  <h2 className="text-2xl font-serif italic text-stone-900 dark:text-stone-100 font-bold">
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
                      <div
                        key={item.id}
                        onClick={() => toggleNotif(item.id)}
                        className={`p-3.5 border rounded-2xl flex items-center justify-between text-left transition-all cursor-pointer ${
                          isChecked
                            ? 'border-indigo-400 bg-indigo-50/40 dark:bg-indigo-950/30 text-indigo-950 dark:text-indigo-100 shadow-sm'
                            : 'border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-950 text-stone-500 opacity-70 hover:opacity-100'
                        }`}
                      >
                        <div className="pr-2">
                          <p className="text-xs font-bold text-stone-800 dark:text-stone-100">
                            ☐ {item.label}
                          </p>
                          <p className="text-[10px] text-stone-500 dark:text-stone-400 leading-tight mt-0.5">
                            {item.desc}
                          </p>
                        </div>
                        <div className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 transition-colors ${
                          isChecked ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900'
                        }`}>
                          {isChecked && <Check size={13} strokeWidth={3} />}
                        </div>
                      </div>
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
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-300 text-[10px] font-black uppercase tracking-widest">
                    <BookOpen size={12} />
                    LEARNING & GUIDANCE
                  </div>
                  <h2 className="text-2xl font-serif italic text-stone-900 dark:text-stone-100 font-bold">
                    Partner Education Interests
                  </h2>
                  <p className="text-xs text-stone-500 dark:text-stone-400">
                    Which topics would you like quick tips and guides on?
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
                        className={`w-full p-4 border rounded-2xl flex items-center justify-between text-left transition-all cursor-pointer ${
                          isSel
                            ? 'border-purple-400 bg-purple-50/40 dark:bg-purple-950/30 text-purple-950 dark:text-purple-100 font-bold shadow-sm'
                            : 'border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-950 text-stone-600 dark:text-stone-300 hover:border-purple-200'
                        }`}
                      >
                        <span className="text-xs font-bold flex items-center gap-2">
                          <span>☐</span>
                          {option}
                        </span>
                        <div className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 transition-colors ${
                          isSel ? 'bg-purple-600 border-purple-600 text-white' : 'border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900'
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
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-pink-50 dark:bg-pink-950/50 text-pink-600 dark:text-pink-300 text-[10px] font-black uppercase tracking-widest">
                    <Clock size={12} />
                    DELIVERY FREQUENCY
                  </div>
                  <h2 className="text-2xl font-serif italic text-stone-900 dark:text-stone-100 font-bold">
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
                        className={`w-full p-4.5 border rounded-2xl flex items-start gap-4 text-left transition-all cursor-pointer ${
                          isSelected
                            ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/40 text-indigo-950 dark:text-indigo-100 shadow-md ring-2 ring-indigo-400/20'
                            : 'border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-950 text-stone-600 dark:text-stone-300 hover:border-indigo-200'
                        }`}
                      >
                        <span className="text-2xl mt-0.5">{freq.emoji}</span>
                        <div className="flex-1">
                          <p className="text-xs font-bold text-stone-900 dark:text-stone-100">
                            ☐ {freq.title}
                          </p>
                          <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-1 leading-relaxed">
                            {freq.desc}
                          </p>
                        </div>
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-1 transition-colors ${
                          isSelected ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900'
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
                className="space-y-6 text-center py-4"
              >
                <div className="flex justify-center">
                  <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-emerald-100 to-indigo-100 dark:bg-emerald-950/30 flex items-center justify-center text-4xl shadow-inner animate-bounce">
                    ✨
                  </div>
                </div>
                <div className="space-y-3">
                  <h1 className="text-3xl font-serif italic text-stone-900 dark:text-stone-100 font-bold leading-tight">
                    Complete Setup 💖
                  </h1>
                  <p className="text-sm text-stone-600 dark:text-stone-300 font-serif italic max-w-sm mx-auto leading-relaxed">
                    Your preferences are saved! You are now fully configured to enter your Connected Partner Dashboard.
                  </p>
                </div>

                <div className="p-4 bg-indigo-50/50 dark:bg-stone-850/50 rounded-2xl border border-indigo-100 dark:border-stone-800 text-left text-xs space-y-2 max-w-sm mx-auto">
                  <div className="flex items-center justify-between text-indigo-900 dark:text-indigo-200 font-bold">
                    <span>Frequency Mode:</span>
                    <span className="text-indigo-600 dark:text-indigo-400 font-mono text-[10px] uppercase font-black">{selectedFrequency}</span>
                  </div>
                  <div className="flex items-center justify-between text-indigo-900 dark:text-indigo-200 font-bold">
                    <span>Topics Selected:</span>
                    <span className="text-indigo-600 dark:text-indigo-400 font-mono text-[10px] uppercase font-black">{selectedEducation.length} categories</span>
                  </div>
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </div>

        {/* Footer Controls */}
        <div className="border-t border-stone-100 dark:border-stone-800 pt-5 mt-2 flex items-center justify-between gap-4">
          {step > 1 ? (
            <button
              type="button"
              onClick={handleBack}
              className="flex items-center gap-1 text-xs font-bold text-stone-400 hover:text-indigo-600 uppercase tracking-wider transition-colors cursor-pointer shrink-0"
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
              className="flex items-center gap-1.5 px-6 py-3.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-2xl text-xs font-black uppercase tracking-wider shadow-md hover:opacity-95 active:scale-95 transition-all cursor-pointer"
            >
              Continue
              <ChevronRight size={14} />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleNext}
              className="px-8 py-4 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-xl hover:scale-105 active:scale-95 transition-all cursor-pointer"
            >
              Open Connected Partner Dashboard 💖
            </button>
          )}
        </div>

      </div>
    </div>
  );
};
