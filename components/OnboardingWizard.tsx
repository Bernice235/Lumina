import React, { useState } from 'react';
import { User, AppTheme } from '../types';
import { THEMES } from '../constants';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Calendar, ChevronRight, ChevronLeft, Heart, Check, Baby, Award } from 'lucide-react';

interface OnboardingWizardProps {
  user: User;
  setUser: React.Dispatch<React.SetStateAction<User | null>>;
  onComplete: (user: User) => void;
}

export const OnboardingWizard: React.FC<OnboardingWizardProps> = ({ user, setUser, onComplete }) => {
  const [step, setStep] = useState(1);
  const totalSteps = 7;

  // Local values prefilled with user defaults
  const [cycleLength, setCycleLength] = useState(user.cycleLength || 28);
  const [periodLength, setPeriodLength] = useState(user.periodLength || 5);
  const [lastPeriodStart, setLastPeriodStart] = useState(() => {
    if (user.lastPeriodStart) {
      return user.lastPeriodStart.split('T')[0];
    }
    return new Date().toISOString().split('T')[0];
  });
  const [isPregnancyMode, setIsPregnancyMode] = useState(user.isPregnancyMode || false);
  const [wellnessPrefs, setWellnessPrefs] = useState<string[]>(user.wellnessPreferences || [
    'Cycle Timing & Predictions 🌸',
    'Symptom & Bio Insights 📊'
  ]);
  const [notificationPrefs, setNotificationPrefs] = useState<string[]>([
    'Period Predictions & Phase Shifts 🩸',
    'Ovulation & Fertile Windows 🌸',
    'Daily Wellness Reminders ✨'
  ]);
  const [selectedTheme, setSelectedTheme] = useState<AppTheme>(user.theme || 'rose');

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
    // Commit the values to the user object
    const updatedUser: User = {
      ...user,
      cycleLength: parseInt(String(cycleLength)) || 28,
      periodLength: parseInt(String(periodLength)) || 5,
      lastPeriodStart: new Date(lastPeriodStart).toISOString(),
      isPregnancyMode: isPregnancyMode,
      wellnessPreferences: wellnessPrefs,
      notificationSettings: {
        enabled: true,
        toneStyle: 'supportive',
        reminderDaysBefore: 2,
        quietHours: { enabled: false, startTime: '22:00', endTime: '07:00' },
        types: {
          periodStarting: notificationPrefs.includes('Period Predictions & Phase Shifts 🩸'),
          periodStarted: notificationPrefs.includes('Period Predictions & Phase Shifts 🩸'),
          periodEnding: notificationPrefs.includes('Period Predictions & Phase Shifts 🩸'),
          ovulation: notificationPrefs.includes('Ovulation & Fertile Windows 🌸'),
          fertileWindow: notificationPrefs.includes('Ovulation & Fertile Windows 🌸'),
          lutealPhase: true,
          pregnancyRisk: true
        },
        partnerNotificationsEnabled: true,
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

  const toggleWellnessPref = (pref: string) => {
    if (wellnessPrefs.includes(pref)) {
      setWellnessPrefs(wellnessPrefs.filter(p => p !== pref));
    } else {
      setWellnessPrefs([...wellnessPrefs, pref]);
    }
  };

  const toggleNotificationPref = (pref: string) => {
    if (notificationPrefs.includes(pref)) {
      setNotificationPrefs(notificationPrefs.filter(p => p !== pref));
    } else {
      setNotificationPrefs([...notificationPrefs, pref]);
    }
  };

  const currentThemeInfo = THEMES[selectedTheme] || THEMES['rose'];

  const variants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 100 : -100,
      opacity: 0
    }),
    center: {
      x: 0,
      opacity: 1
    },
    exit: (direction: number) => ({
      x: direction < 0 ? 100 : -100,
      opacity: 0
    })
  };

  const availablePrefs = [
    'Cycle Timing & Predictions 🌸',
    'Symptom & Bio Insights 📊',
    'Daily Reflections & Diary 📝',
    'Supportive Partner Synclinks 💞',
    'Mindfulness & Healing Soundscapes 🎵',
    'Pregnancy Tracking Support 🍼'
  ];

  const availableNotifications = [
    'Period Predictions & Phase Shifts 🩸',
    'Ovulation & Fertile Windows 🌸',
    'Daily Wellness Reminders ✨',
    'Pregnancy Stage Insights 🍼',
    'Mood Check-in Prompts 🌿'
  ];

  return (
    <div className={`min-h-screen ${currentThemeInfo.bg} flex items-center justify-center p-4 relative overflow-hidden transition-colors duration-500`}>
      {/* Abstract Calming Shapes */}
      <div className={`absolute top-[-10%] left-[-10%] w-[45%] h-[45%] rounded-full blur-[120px] opacity-40 bg-${currentThemeInfo.primary}/20 transition-all duration-700`}></div>
      <div className={`absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full blur-[140px] opacity-40 bg-${currentThemeInfo.primary}/10 transition-all duration-700`}></div>

      <div className="bg-white/70 backdrop-blur-2xl px-6 py-10 md:p-12 rounded-[2.5rem] shadow-[0_20px_50px_rgba(249,168,212,0.12)] border border-white/60 w-full max-w-xl z-10 flex flex-col justify-between min-h-[550px]">
        
        {/* Progress header */}
        <div className="space-y-4">
          <div className="flex justify-between items-center text-[10px] font-black tracking-widest uppercase transition-colors" style={{ color: `var(--color-${currentThemeInfo.text})` || '#f472b6' }}>
            <span>🌸 Cycle Sanctuary Setup</span>
            <span>Step {step} of {totalSteps}</span>
          </div>
          <div className="w-full h-1.5 bg-gray-100/80 rounded-full overflow-hidden">
            <motion.div 
              className={`h-full bg-${currentThemeInfo.primary}`}
              initial={{ width: '20%' }}
              animate={{ width: `${(step / totalSteps) * 100}%` }}
              transition={{ type: 'spring', stiffness: 80 }}
            ></motion.div>
          </div>
        </div>

        {/* Content body with animations */}
        <div className="my-8 flex-grow flex flex-col justify-center">
          <AnimatePresence mode="wait" custom={step}>
            {step === 1 && (
              <motion.div
                key="step1"
                initial="enter"
                animate="center"
                exit="exit"
                variants={variants}
                transition={{ duration: 0.3 }}
                className="space-y-6"
              >
                <div className="space-y-2">
                  <h1 className="text-3xl font-serif italic text-pink-900 leading-tight">When did your last cycle start? 📅</h1>
                  <p className="text-xs text-gray-400 font-medium leading-relaxed">
                    This maps the base timing for predictions. Select the first day of your most recent period. If you can't recall precisely, choose an approximate date.
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="bg-pink-50/20 p-5 rounded-3xl border border-pink-100/20 flex flex-col gap-3">
                    <label className="text-[9px] font-black uppercase tracking-widest text-pink-500 flex items-center gap-1.5 leading-none">
                      <Calendar size={11} /> First Day of Last Period
                    </label>
                    <input
                      type="date"
                      max={new Date().toISOString().split('T')[0]}
                      value={lastPeriodStart}
                      onChange={(e) => setLastPeriodStart(e.target.value)}
                      className="w-full bg-white px-5 py-4 border border-pink-100 rounded-2xl text-xs font-bold text-pink-600 outline-none text-center shadow-inner"
                    />
                  </div>
                  <div className="text-[10px] text-pink-400 text-center leading-normal italic px-2">
                    ✨ Predictions correspond with logged periods dynamically once inside the app!
                  </div>
                </div>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div
                key="step2"
                initial="enter"
                animate="center"
                exit="exit"
                variants={variants}
                transition={{ duration: 0.3 }}
                className="space-y-6"
              >
                <div className="space-y-2">
                  <h1 className="text-3xl font-serif italic text-pink-900 leading-tight flex items-center gap-2">
                     Understand your Rhythm 🌿
                  </h1>
                  <p className="text-xs text-gray-400 font-medium leading-relaxed">
                    Setting your average cycle length lets Lumina predict exact fertile windows, menstrual phases, and share tailored warnings. (Typical cycles run 25-35 days).
                  </p>
                </div>

                <div className="space-y-5">
                  <div className="bg-pink-50/20 p-5 rounded-3xl border border-pink-100/20 space-y-3">
                    <div className="flex justify-between items-center text-xs font-bold text-gray-700">
                      <span className="text-[10px] font-black uppercase tracking-wider text-pink-500">Average Cycle Length</span>
                      <span className="font-serif text-pink-600 bg-white ring-1 ring-pink-100 px-3 py-1 rounded-xl shadow-inner font-black">{cycleLength} days</span>
                    </div>
                    <input
                      type="range"
                      min={21}
                      max={42}
                      value={cycleLength}
                      onChange={(e) => setCycleLength(parseInt(e.target.value))}
                      className="w-full accent-pink-500 h-1 bg-pink-100/50 rounded-lg cursor-pointer"
                    />
                    <div className="flex justify-between text-[8px] font-bold text-pink-300 uppercase tracking-widest">
                      <span>21 Days</span>
                      <span>28 Days (Typical)</span>
                      <span>42 Days</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div
                key="step3"
                initial="enter"
                animate="center"
                exit="exit"
                variants={variants}
                transition={{ duration: 0.3 }}
                className="space-y-6"
              >
                <div className="space-y-2">
                  <h1 className="text-3xl font-serif italic text-pink-900 leading-tight flex items-center gap-2">
                     Flow Duration 🩸
                  </h1>
                  <p className="text-xs text-gray-400 font-medium leading-relaxed">
                    How many days does your period flow usually last? This helps us display the correct calendar layouts.
                  </p>
                </div>

                <div className="space-y-5">
                  <div className="bg-pink-50/20 p-5 rounded-3xl border border-pink-100/20 space-y-3">
                    <div className="flex justify-between items-center text-xs font-bold text-gray-700">
                      <span className="text-[10px] font-black uppercase tracking-wider text-pink-500">Average Period Length</span>
                      <span className="font-serif text-pink-600 bg-white ring-1 ring-pink-100 px-3 py-1 rounded-xl shadow-inner font-black">{periodLength} days</span>
                    </div>
                    <input
                      type="range"
                      min={3}
                      max={10}
                      value={periodLength}
                      onChange={(e) => setPeriodLength(parseInt(e.target.value))}
                      className="w-full accent-pink-500 h-1 bg-pink-100/50 rounded-lg cursor-pointer"
                    />
                    <div className="flex justify-between text-[8px] font-bold text-pink-300 uppercase tracking-widest">
                      <span>3 Days</span>
                      <span>5 Days (Typical)</span>
                      <span>10 Days</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {step === 4 && (
              <motion.div
                key="step4"
                initial="enter"
                animate="center"
                exit="exit"
                variants={variants}
                transition={{ duration: 0.3 }}
                className="space-y-6"
              >
                <div className="space-y-2">
                  <h1 className="text-3xl font-serif italic text-pink-900 leading-tight flex items-center gap-1.5">
                     Pregnancy Mode 🍼
                  </h1>
                  <p className="text-xs text-gray-400 font-medium leading-relaxed">
                    Are you currently expecting or trying to track pregnancy stages? Lumina includes a tailored pregnancy interface to track baby size, appointments, and trimester insights.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsPregnancyMode(false)}
                    className={`p-6 border-2 rounded-3xl flex flex-col justify-between items-center text-center min-h-[140px] relative transition-all duration-300 ${
                      !isPregnancyMode
                        ? 'border-pink-500 bg-pink-50/30 shadow-md shadow-pink-100'
                        : 'border-pink-100 bg-white/60 hover:border-pink-300'
                    }`}
                  >
                    <span className="text-3xl mb-2">🌸</span>
                    <span className="text-[10px] font-black uppercase tracking-widest text-pink-900">
                      Regular Tracking
                    </span>
                    <p className="text-[8px] text-gray-400 mt-1">Track menstrual cycles & fertile windows</p>
                    {!isPregnancyMode && (
                      <div className="absolute top-3 right-3 w-4 h-4 rounded-full bg-pink-500 text-white flex items-center justify-center shadow-sm">
                        <Check size={8} strokeWidth={4} />
                      </div>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsPregnancyMode(true)}
                    className={`p-6 border-2 rounded-3xl flex flex-col justify-between items-center text-center min-h-[140px] relative transition-all duration-300 ${
                      isPregnancyMode
                        ? 'border-indigo-500 bg-indigo-50/30 shadow-md shadow-indigo-100'
                        : 'border-pink-100 bg-white/60 hover:border-pink-300'
                    }`}
                  >
                    <span className="text-3xl mb-2">🍼</span>
                    <span className="text-[10px] font-black uppercase tracking-widest text-indigo-900">
                      Pregnancy Mode
                    </span>
                    <p className="text-[8px] text-gray-400 mt-1">Track baby growth, trimesters & health</p>
                    {isPregnancyMode && (
                      <div className="absolute top-3 right-3 w-4 h-4 rounded-full bg-indigo-500 text-white flex items-center justify-center shadow-sm">
                        <Check size={8} strokeWidth={4} />
                      </div>
                    )}
                  </button>
                </div>
              </motion.div>
            )}

            {step === 5 && (
              <motion.div
                key="step5"
                initial="enter"
                animate="center"
                exit="exit"
                variants={variants}
                transition={{ duration: 0.3 }}
                className="space-y-6 animate-fadeIn"
              >
                <div className="space-y-2">
                  <h1 className="text-3xl font-serif italic text-pink-900 leading-tight">
                    Wellness Preferences ✨
                  </h1>
                  <p className="text-xs text-gray-400 font-medium leading-relaxed">
                    Customize your experience. What features are most aligned with your personal goals in Lumina? Select all that apply.
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-2.5 max-h-[250px] overflow-y-auto pr-1">
                  {availablePrefs.map((pref) => {
                    const isSelected = wellnessPrefs.includes(pref);
                    return (
                      <button
                        key={pref}
                        type="button"
                        onClick={() => toggleWellnessPref(pref)}
                        className={`p-4 border rounded-2xl flex items-center justify-between text-left transition-all duration-200 ${
                          isSelected
                            ? 'border-pink-300 bg-pink-50/40 text-pink-900 font-semibold'
                            : 'border-pink-100 bg-white hover:border-pink-200 text-gray-600'
                        }`}
                      >
                        <span className="text-xs tracking-wide">{pref}</span>
                        <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-all ${
                          isSelected ? 'bg-pink-500 border-pink-500 text-white' : 'border-gray-200'
                        }`}>
                          {isSelected && <Check size={10} strokeWidth={3} />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {step === 6 && (
              <motion.div
                key="step6"
                initial="enter"
                animate="center"
                exit="exit"
                variants={variants}
                transition={{ duration: 0.3 }}
                className="space-y-6 animate-fadeIn"
              >
                <div className="space-y-2">
                  <h1 className="text-3xl font-serif italic text-pink-900 leading-tight">
                    Notification Preferences 🔔
                  </h1>
                  <p className="text-xs text-gray-400 font-medium leading-relaxed">
                    Stay gently reminded and synchronized. What updates would you like to receive notifications for?
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-2.5 max-h-[250px] overflow-y-auto pr-1">
                  {availableNotifications.map((pref) => {
                    const isSelected = notificationPrefs.includes(pref);
                    return (
                      <button
                        key={pref}
                        type="button"
                        onClick={() => toggleNotificationPref(pref)}
                        className={`p-4 border rounded-2xl flex items-center justify-between text-left transition-all duration-200 ${
                          isSelected
                            ? 'border-pink-300 bg-pink-50/40 text-pink-900 font-semibold'
                            : 'border-pink-100 bg-white hover:border-pink-200 text-gray-600'
                        }`}
                      >
                        <span className="text-xs tracking-wide">{pref}</span>
                        <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-all ${
                          isSelected ? 'bg-pink-500 border-pink-500 text-white' : 'border-gray-200'
                        }`}>
                          {isSelected && <Check size={10} strokeWidth={3} />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {step === 7 && (
              <motion.div
                key="step7"
                initial="enter"
                animate="center"
                exit="exit"
                variants={variants}
                transition={{ duration: 0.3 }}
                className="space-y-6 animate-fadeIn"
              >
                <div className="space-y-2 text-center">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-pink-100 text-pink-600 mb-2">
                    <Sparkles size={24} className="animate-pulse" />
                  </div>
                  <h1 className="text-3xl font-serif italic text-pink-900 leading-tight">
                    Your Cycle Setup Summary ✨
                  </h1>
                  <p className="text-xs text-gray-400 font-medium leading-relaxed max-w-sm mx-auto">
                    Here is a summary of your customized cycle plan. Everything is tailored to your unique rhythm.
                  </p>
                </div>

                <div className="bg-pink-50/30 border border-pink-100/50 p-5 rounded-3xl space-y-4 text-xs max-h-[280px] overflow-y-auto">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white p-3 rounded-2xl border border-pink-100/30 shadow-sm">
                      <p className="text-[9px] uppercase font-bold text-pink-500 tracking-wider">Last Period Start</p>
                      <p className="font-bold text-gray-700 mt-1">
                        {new Date(lastPeriodStart).toLocaleDateString(undefined, {
                          month: 'long',
                          day: 'numeric',
                          year: 'numeric'
                        })}
                      </p>
                    </div>
                    <div className="bg-white p-3 rounded-2xl border border-pink-100/30 shadow-sm">
                      <p className="text-[9px] uppercase font-bold text-pink-500 tracking-wider">Cycle & Flow</p>
                      <p className="font-bold text-gray-700 mt-1">
                        {cycleLength} days / {periodLength} days
                      </p>
                    </div>
                  </div>

                  <div className="bg-white p-3 rounded-2xl border border-pink-100/30 shadow-sm flex items-center justify-between">
                    <div>
                      <p className="text-[9px] uppercase font-bold text-pink-500 tracking-wider">Tracking Mode</p>
                      <p className="font-bold text-gray-700 mt-0.5">
                        {isPregnancyMode ? '🍼 Pregnancy Mode' : '🌸 Regular Cycle Tracking'}
                      </p>
                    </div>
                    <span className={`text-[8px] font-bold uppercase px-2 py-1 rounded-full ${
                      isPregnancyMode ? 'bg-indigo-50 text-indigo-600 border border-indigo-100' : 'bg-pink-50 text-pink-600 border border-pink-100'
                    }`}>
                      Active
                    </span>
                  </div>

                  {wellnessPrefs.length > 0 && (
                    <div className="bg-white p-3 rounded-2xl border border-pink-100/30 shadow-sm space-y-2">
                      <p className="text-[9px] uppercase font-bold text-pink-500 tracking-wider">Wellness Preferences</p>
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {wellnessPrefs.map((pref) => (
                          <span key={pref} className="text-[9px] font-semibold bg-pink-50 text-pink-700 border border-pink-100 px-2 py-0.5 rounded-lg">
                            {pref}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {notificationPrefs.length > 0 && (
                    <div className="bg-white p-3 rounded-2xl border border-pink-100/30 shadow-sm space-y-2">
                      <p className="text-[9px] uppercase font-bold text-pink-500 tracking-wider">Notification Subscriptions</p>
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {notificationPrefs.map((pref) => (
                          <span key={pref} className="text-[9px] font-semibold bg-amber-50 text-amber-700 border border-amber-100 px-2 py-0.5 rounded-lg">
                            {pref}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Action controls row */}
        <div className="flex justify-between items-center pt-6 border-t border-gray-100/50 mt-4">
          <button
            type="button"
            onClick={handleBack}
            disabled={step === 1}
            className={`px-5 py-3 cursor-pointer select-none rounded-xl text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 transition-all ${
              step === 1 
                ? 'opacity-0 pointer-events-none' 
                : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            <ChevronLeft size={13} />
            Back
          </button>

          <button
            type="button"
            onClick={handleNext}
            className={`px-6 py-4 rounded-2xl text-[11px] font-bold uppercase tracking-widest text-white shadow-lg flex items-center gap-2 transition-all hover:scale-[1.02] active:scale-95 ${
              `bg-gradient-to-r from-${currentThemeInfo.primary} to-rose-450` || 'bg-pink-500'
            }`}
            style={{
              backgroundImage: selectedTheme === 'rose' ? 'linear-gradient(to right, #ec4899, #f43f5e)' :
                               selectedTheme === 'lavender' ? 'linear-gradient(to right, #8b5cf6, #ec4899)' :
                               selectedTheme === 'mint' ? 'linear-gradient(to right, #14b8a6, #0d9488)' :
                               'linear-gradient(to right, #f97316, #f43f5e)',
              boxShadow: `0 10px 25px rgba(236, 72, 153, 0.25)`
            }}
          >
            {step === totalSteps ? (
              <>
                <Sparkles size={11} className="animate-spin-slow" />
                Continue to Dashboard
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
