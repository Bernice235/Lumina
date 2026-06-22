import React, { useState } from 'react';
import { User, AppTheme } from '../types';
import { THEMES } from '../constants';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Calendar, ChevronRight, ChevronLeft, Heart, Check } from 'lucide-react';

interface OnboardingWizardProps {
  user: User;
  setUser: React.Dispatch<React.SetStateAction<User | null>>;
  onComplete: (user: User) => void;
}

export const OnboardingWizard: React.FC<OnboardingWizardProps> = ({ user, setUser, onComplete }) => {
  const [step, setStep] = useState(1);
  const totalSteps = 4;

  // Local values prefilled with user defaults
  const [name, setName] = useState(user.name || '');
  const [cycleLength, setCycleLength] = useState(user.cycleLength || 28);
  const [periodLength, setPeriodLength] = useState(user.periodLength || 5);
  const [lastPeriodStart, setLastPeriodStart] = useState(() => {
    if (user.lastPeriodStart) {
      return user.lastPeriodStart.split('T')[0];
    }
    return new Date().toISOString().split('T')[0];
  });
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
      name: name.trim() || user.name || 'Bloom Member',
      cycleLength: parseInt(String(cycleLength)) || 28,
      periodLength: parseInt(String(periodLength)) || 5,
      lastPeriodStart: new Date(lastPeriodStart).toISOString(),
      theme: selectedTheme,
      onboardingCompleted: true,
    };
    setUser(updatedUser);
    localStorage.setItem('lumina_user', JSON.stringify(updatedUser));
    onComplete(updatedUser);
  };

  const currentThemeInfo = THEMES[selectedTheme];

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

  return (
    <div className={`min-h-screen ${currentThemeInfo.bg} flex items-center justify-center p-4 relative overflow-hidden transition-colors duration-500`}>
      {/* Abstract Calming Shapes */}
      <div className={`absolute top-[-10%] left-[-10%] w-[45%] h-[45%] rounded-full blur-[120px] opacity-40 bg-${currentThemeInfo.primary}/20 transition-all duration-700`}></div>
      <div className={`absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full blur-[140px] opacity-40 bg-${currentThemeInfo.primary}/10 transition-all duration-700`}></div>

      <div className="bg-white/70 backdrop-blur-2xl px-6 py-10 md:p-12 rounded-[2.5rem] shadow-[0_20px_50px_rgba(249,168,212,0.12)] border border-white/60 w-full max-w-xl z-10 flex flex-col justify-between min-h-[550px]">
        
        {/* Progress header */}
        <div className="space-y-4">
          <div className="flex justify-between items-center text-[10px] font-black tracking-widest uppercase transition-colors" style={{ color: `var(--color-${currentThemeInfo.text})` || '#f472b6' }}>
            <span>🌸 Cycle Sanctuary setup</span>
            <span>Step {step} of {totalSteps}</span>
          </div>
          <div className="w-full h-1.5 bg-gray-100/80 rounded-full overflow-hidden">
            <motion.div 
              className={`h-full bg-${currentThemeInfo.primary}`}
              initial={{ width: '25%' }}
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
                  <h1 className="text-3xl md:text-4xl font-serif italic text-pink-900 leading-tight">Welcome to your Sanctuary 🌸</h1>
                  <p className="text-xs text-gray-400 font-medium leading-relaxed">
                    Lumina is a peaceful space to stay in sync with your cycle, log your feelings, and nurture your body. What name should we call you in our daily checks?
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="text-[9px] font-black uppercase tracking-widest text-pink-500">Your display name</label>
                  <input
                    type="text"
                    maxLength={35}
                    placeholder="Enter your name, sister..."
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-5 py-4 bg-white/50 border border-pink-100 rounded-2xl text-[11px] font-bold tracking-wider outline-none focus:border-pink-300 transition-colors shadow-sm"
                  />
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
                    Setting your cycle characteristics lets Lumina predict exact fertile windows, menstrual phases, and share tailored warnings. (Typical cycles run 25-35 days).
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

                  <div className="bg-pink-50/20 p-5 rounded-3xl border border-pink-100/20 space-y-3">
                    <div className="flex justify-between items-center text-xs font-bold text-gray-700">
                      <span className="text-[10px] font-black uppercase tracking-wider text-pink-500">Average flow duration</span>
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
                  <h1 className="text-3xl font-serif italic text-pink-900 leading-tight">When did your last cycle start? 📅</h1>
                  <p className="text-xs text-gray-400 font-medium leading-relaxed">
                    This maps the base timing for predictions. Select the first day of your most recent period. If you can't recall precisely, choose an approximate date.
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="bg-pink-50/20 p-5 rounded-3xl border border-pink-100/20 flex flex-col gap-3">
                    <label className="text-[9px] font-black uppercase tracking-widest text-pink-500 flex items-center gap-1.5 leading-none">
                      <Calendar size={11} /> First Day of last Period
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
                    ✨ Predictions update to correspond with logged periods dynamically once inside the app!
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
                     Santuary Mood Accents 🎨
                  </h1>
                  <p className="text-xs text-gray-400 font-medium leading-relaxed">
                    Lumina adapts to reflect your state of mind. Choose a visual sound tone accent that resonates with you today (you can adjust this anytime under dashboard controls).
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2">
                  {(Object.keys(THEMES) as AppTheme[]).map((themeKey) => {
                    const activeTheme = THEMES[themeKey];
                    const isSelected = selectedTheme === themeKey;
                    return (
                      <button
                        key={themeKey}
                        type="button"
                        onClick={() => setSelectedTheme(themeKey)}
                        className={`p-4 border-2 rounded-2xl flex flex-col justify-between items-start text-left min-h-[95px] relative transition-all duration-300 ${
                          isSelected
                            ? `border-${activeTheme.primary} bg-white shadow-md shadow-pink-100/30`
                            : 'border-pink-50 bg-white/55 hover:border-pink-150'
                        }`}
                      >
                        <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: isSelected ? `var(--color-${activeTheme.text})` : '#4b5563' }}>
                          {themeKey === 'rose' ? '🌸 Rose' : themeKey === 'lavender' ? '🪻 Lavender' : themeKey === 'mint' ? '🌿 Mint' : '🍑 Peach'}
                        </span>
                        
                        <div className="flex gap-1.5 mt-2.5">
                          <span className={`w-3.5 h-3.5 rounded-full bg-${activeTheme.primary} shadow-sm border border-white`}></span>
                          <span className={`w-3.5 h-3.5 rounded-full bg-${activeTheme.secondary} shadow-sm border border-white`}></span>
                        </div>

                        {isSelected && (
                          <div className={`absolute top-3 right-3 w-4 h-4 rounded-full bg-${activeTheme.primary} text-white flex items-center justify-center scale-110 shadow-sm border border-white`}>
                            <Check size={8} strokeWidth={4} />
                          </div>
                        )}
                      </button>
                    );
                  })}
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
                Enter Sanctuary
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
