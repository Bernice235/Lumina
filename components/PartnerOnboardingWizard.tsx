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
  User as UserIcon, 
  Bell, 
  BookOpen, 
  Clock, 
  ShieldCheck, 
  HelpCircle,
  Award
} from 'lucide-react';

interface PartnerOnboardingWizardProps {
  user: User;
  setUser: React.Dispatch<React.SetStateAction<User | null>>;
  onComplete: (user: User) => void;
}

export const PartnerOnboardingWizard: React.FC<PartnerOnboardingWizardProps> = ({ user, setUser, onComplete }) => {
  const [step, setStep] = useState(1);
  const totalSteps = 5;

  // Partner specific fields
  const [name, setName] = useState(user.firstName || user.name || '');
  
  // Step 3 Support options
  const SUPPORT_OPTIONS = [
    'Learn about the menstrual cycle',
    'Receive helpful reminders',
    'Stay informed about cycle updates',
    'All of the above'
  ];

  const [selectedSupport, setSelectedSupport] = useState<string[]>(['All of the above']);

  // Step 4 Notification preferences (10 options)
  const [notifPrefs, setNotifPrefs] = useState<PartnerNotificationPreferences>({
    periodStarting: true,
    periodEnding: true,
    ovulationUpdates: true,
    moodUpdates: true,
    symptomUpdates: true,
    lowEnergyDays: true,
    supportReminders: true,
    wellnessUpdates: true,
    partnerMessages: true,
    educationalInsights: true,
  });

  const [validationError, setValidationError] = useState<string | null>(null);

  const handleNext = () => {
    if (step === 2 && !name.trim()) {
      setValidationError("Please share your name so your partner knows who is supporting them.");
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

  const toggleSupportOption = (option: string) => {
    if (option === 'All of the above') {
      if (selectedSupport.includes('All of the above')) {
        setSelectedSupport([]);
      } else {
        setSelectedSupport(['Learn about the menstrual cycle', 'Receive helpful reminders', 'Stay informed about cycle updates', 'All of the above']);
      }
    } else {
      let updated = selectedSupport.filter(o => o !== 'All of the above');
      if (updated.includes(option)) {
        updated = updated.filter(o => o !== option);
      } else {
        updated.push(option);
      }
      if (updated.length === 3) {
        updated.push('All of the above');
      }
      setSelectedSupport(updated);
    }
  };

  const toggleNotifPref = (key: keyof PartnerNotificationPreferences) => {
    setNotifPrefs(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const handleFinish = () => {
    const updatedUser: User = {
      ...user,
      name: name.trim(),
      firstName: name.trim(),
      displayName: name.trim(),
      isPartner: true,
      onboardingCompleted: true,
      partnerSupportPreferences: {
        waysToSupport: selectedSupport
      },
      partnerNotificationPreferences: notifPrefs,
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
          periodStarting: notifPrefs.periodStarting,
          periodStarted: notifPrefs.periodStarting,
          periodEnding: notifPrefs.periodEnding,
          ovulation: notifPrefs.ovulationUpdates,
          fertileWindow: notifPrefs.ovulationUpdates,
          pregnancyRisk: notifPrefs.ovulationUpdates
        }
      }
    };

    setUser(updatedUser);
    localStorage.setItem('lumina_user', JSON.stringify(updatedUser));
    onComplete(updatedUser);
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
        x: { type: 'spring', stiffness: 350, damping: 35 },
        opacity: { duration: 0.2 },
        scale: { duration: 0.2 }
      }
    },
    exit: (direction: number) => ({
      x: direction < 0 ? 100 : -100,
      opacity: 0,
      scale: 0.98,
      transition: {
        x: { type: 'spring', stiffness: 350, damping: 35 },
        opacity: { duration: 0.15 },
        scale: { duration: 0.15 }
      }
    })
  };

  const NOTIF_ITEMS: { key: keyof PartnerNotificationPreferences; label: string; desc: string }[] = [
    { key: 'periodStarting', label: 'Period Starting', desc: "Notify me when my partner's period starts." },
    { key: 'periodEnding', label: 'Period Ending', desc: "Notify me when my partner's period ends." },
    { key: 'ovulationUpdates', label: 'Ovulation Updates', desc: 'Notify me during ovulation and fertility windows.' },
    { key: 'moodUpdates', label: 'Mood Updates', desc: 'Notify me when my partner shares a mood update.' },
    { key: 'symptomUpdates', label: 'Symptom Updates', desc: 'Notify me when my partner shares symptoms.' },
    { key: 'lowEnergyDays', label: 'Low Energy Days', desc: 'Notify me when my partner reports low energy.' },
    { key: 'supportReminders', label: 'Support Reminders', desc: 'Receive suggestions on how to support my partner.' },
    { key: 'wellnessUpdates', label: 'Wellness Updates', desc: 'Receive wellness summaries and educational tips.' },
    { key: 'partnerMessages', label: 'Partner Messages', desc: 'Receive shared updates and appreciation notes.' },
    { key: 'educationalInsights', label: 'Educational Insights', desc: 'Receive learning content about menstrual health and cycle phases.' },
  ];

  return (
    <div id="partner_onboarding_container" className={`min-h-screen ${currentThemeInfo?.bg || 'bg-gradient-to-br from-indigo-50 to-pink-50/30'} flex items-center justify-center p-4 relative overflow-hidden transition-colors duration-500 font-sans`}>
      {/* Background glow effects */}
      <div className="absolute top-[-10%] left-[-10%] w-[45%] h-[45%] rounded-full blur-[120px] opacity-25 bg-indigo-300 dark:bg-indigo-900/10 transition-all duration-700 animate-pulse"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[45%] h-[45%] rounded-full blur-[120px] opacity-20 bg-pink-300 dark:bg-pink-900/10 transition-all duration-700 animate-pulse"></div>

      <div id="partner_onboarding_card" className="bg-white/85 dark:bg-stone-900/90 backdrop-blur-2xl px-6 py-8 md:px-10 md:py-10 rounded-[2.5rem] shadow-[0_20px_50px_rgba(99,102,241,0.06)] border border-white/60 dark:border-stone-800/50 w-full max-w-xl z-10 flex flex-col justify-between min-h-[580px] relative transition-all">
        
        {/* Header step progress */}
        <div className="space-y-3">
          <div className="flex justify-between items-center text-[10px] font-black tracking-widest uppercase text-indigo-500 transition-colors">
            <span className="flex items-center gap-1.5 font-bold tracking-widest">
              <Sparkles size={12} className="text-indigo-500 animate-pulse" />
              PARTNER ONBOARDING FLOW
            </span>
            <span className="font-serif italic font-bold">
              Step {step} of {totalSteps}
            </span>
          </div>
          
          <div className="w-full h-1 bg-indigo-50 dark:bg-stone-850 rounded-full overflow-hidden">
            <motion.div 
              className="h-full bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-500"
              initial={{ width: '0%' }}
              animate={{ width: `${(step / totalSteps) * 100}%` }}
              transition={{ type: 'spring', stiffness: 100 }}
            ></motion.div>
          </div>
        </div>

        {/* Step contents */}
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
                className="space-y-6 text-center"
              >
                <div className="flex justify-center">
                  <div className="w-20 h-20 rounded-full bg-indigo-50 dark:bg-indigo-950/20 flex items-center justify-center text-indigo-500 shadow-inner">
                    <Heart size={38} className="text-indigo-500 animate-pulse" />
                  </div>
                </div>
                <div className="space-y-3">
                  <h1 className="text-3xl md:text-4xl font-serif italic text-stone-900 dark:text-stone-100 font-bold leading-tight">
                    Welcome to Partner Mode 🤝
                  </h1>
                  <p className="text-base text-stone-500 dark:text-stone-400 font-serif italic max-w-sm mx-auto">
                    Be the supportive partner she deserves. Get real-time cycle insights, care missions, and educational guidance.
                  </p>
                </div>
              </motion.div>
            )}

            {/* STEP 2: Name */}
            {step === 2 && (
              <motion.div
                key="pstep2"
                initial="enter"
                animate="center"
                exit="exit"
                custom={1}
                variants={slideVariants}
                className="space-y-5"
              >
                <div className="space-y-2 text-center md:text-left">
                  <div className="inline-flex w-12 h-12 rounded-full bg-indigo-50 dark:bg-indigo-950/20 items-center justify-center text-indigo-500 mb-1">
                    <UserIcon size={20} />
                  </div>
                  <h2 className="text-2xl font-serif italic text-stone-900 dark:text-stone-100 font-bold">
                    What is your name?
                  </h2>
                  <p className="text-xs text-stone-400 dark:text-stone-500">
                    Tell us your name so your partner can identify your connection request.
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black tracking-widest uppercase text-indigo-400">Your Name</label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => {
                        setName(e.target.value);
                        if (validationError) setValidationError(null);
                      }}
                      placeholder="e.g. Alex"
                      className="w-full bg-white dark:bg-stone-950 border border-stone-200 dark:border-stone-850 px-5 py-3.5 rounded-2xl text-sm font-bold text-stone-800 dark:text-stone-100 outline-none focus:border-indigo-400 dark:focus:border-indigo-500 transition-colors shadow-inner"
                      autoFocus
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

            {/* STEP 3: How to support */}
            {step === 3 && (
              <motion.div
                key="pstep3"
                initial="enter"
                animate="center"
                exit="exit"
                custom={1}
                variants={slideVariants}
                className="space-y-5"
              >
                <div className="space-y-2 text-center md:text-left">
                  <div className="inline-flex w-12 h-12 rounded-full bg-indigo-50 dark:bg-indigo-950/20 items-center justify-center text-indigo-500 mb-1">
                    <Award size={20} />
                  </div>
                  <h2 className="text-2xl font-serif italic text-stone-900 dark:text-stone-100 font-bold">
                    How would you like to support your partner? 🌸💜🤝
                  </h2>
                  <p className="text-xs text-stone-400 dark:text-stone-500">
                    Select your goals so we can customize your partner workspace experience.
                  </p>
                </div>

                <div className="space-y-2.5">
                  {SUPPORT_OPTIONS.map((option) => {
                    const isSel = selectedSupport.includes(option);
                    return (
                      <button
                        key={option}
                        type="button"
                        onClick={() => toggleSupportOption(option)}
                        className={`w-full p-4 border rounded-2xl flex items-center justify-between text-left transition-all cursor-pointer ${
                          isSel
                            ? 'border-indigo-400 bg-indigo-50/30 text-indigo-950 dark:text-indigo-100 font-bold shadow-sm'
                            : 'border-stone-100 dark:border-stone-850 bg-white dark:bg-stone-950 text-stone-600 dark:text-stone-300 hover:border-indigo-200'
                        }`}
                      >
                        <span className="text-xs font-bold">{option}</span>
                        <div className={`w-5 h-5 rounded-md border flex items-center justify-center flex-shrink-0 transition-colors ${
                          isSel ? 'bg-indigo-500 border-indigo-500 text-white' : 'border-gray-300 dark:border-stone-700'
                        }`}>
                          {isSel && <Check size={12} strokeWidth={3} />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {/* STEP 4: Partner Notification Preferences */}
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
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-50 text-purple-600 text-[10px] font-black uppercase tracking-widest mb-1">
                    <Bell size={12} />
                    PARTNER NOTIFICATION PREFERENCES
                  </div>
                  <h2 className="text-2xl font-serif italic text-stone-900 dark:text-stone-100 font-bold">
                    Stay Connected 💜
                  </h2>
                  <p className="text-xs text-stone-400 dark:text-stone-500">
                    Choose which updates you would like to receive. You can customize these anytime later in settings.
                  </p>
                </div>

                <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1 pb-1 scrollbar-thin">
                  {NOTIF_ITEMS.map((item) => {
                    const isChecked = notifPrefs[item.key];
                    return (
                      <div
                        key={item.key}
                        onClick={() => toggleNotifPref(item.key)}
                        className={`p-3 border rounded-2xl flex items-start justify-between text-left transition-all cursor-pointer ${
                          isChecked
                            ? 'border-purple-300 bg-purple-50/20 text-purple-950 dark:text-purple-100'
                            : 'border-stone-100 dark:border-stone-850 bg-white dark:bg-stone-950 text-stone-500 opacity-70'
                        }`}
                      >
                        <div className="pr-3">
                          <p className="text-xs font-bold flex items-center gap-1.5">
                            {item.label}
                          </p>
                          <p className="text-[10px] text-stone-500 dark:text-stone-400 leading-tight mt-0.5">
                            {item.desc}
                          </p>
                        </div>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {}} // handled by parent div
                          className="w-4 h-4 rounded border-purple-300 text-purple-600 focus:ring-purple-500 mt-1 cursor-pointer shrink-0"
                        />
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {/* STEP 5: Finish */}
            {step === 5 && (
              <motion.div
                key="pstep5"
                initial="enter"
                animate="center"
                exit="exit"
                custom={1}
                variants={slideVariants}
                className="space-y-6 text-center"
              >
                <div className="flex justify-center">
                  <div className="w-20 h-20 rounded-full bg-purple-100 dark:bg-purple-950/30 flex items-center justify-center text-3xl animate-bounce">
                    ✨
                  </div>
                </div>
                <div className="space-y-3">
                  <h1 className="text-3xl font-serif italic text-stone-900 dark:text-stone-100 font-bold leading-tight">
                    You're all set! 💖
                  </h1>
                  <p className="text-base text-stone-500 dark:text-stone-400 font-serif italic">
                    Your partner dashboard is ready with your personalized notification preferences.
                  </p>
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </div>

        {/* Footer Navigation */}
        <div className="border-t border-stone-100 dark:border-stone-850 pt-5 mt-4 flex items-center justify-between gap-4">
          {step > 1 ? (
            <button
              type="button"
              onClick={handleBack}
              className="flex items-center gap-1 text-xs font-bold text-stone-400 hover:text-indigo-500 uppercase tracking-wider transition-colors cursor-pointer shrink-0"
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
              className="flex items-center gap-1.5 px-6 py-3 bg-indigo-500 text-white rounded-2xl text-xs font-black uppercase tracking-wider shadow-md hover:bg-indigo-600 active:scale-95 transition-all cursor-pointer"
            >
              {step === 1 ? 'Get Started' : 'Continue'}
              <ChevronRight size={14} />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleNext}
              className="px-8 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 hover:opacity-95 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-lg active:scale-98 transition-all cursor-pointer"
            >
              Enter Partner Workspace
            </button>
          )}
        </div>

      </div>
    </div>
  );
};
