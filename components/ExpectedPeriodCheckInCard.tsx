import React, { useState, useMemo } from 'react';
import { Calendar, Clock, CheckCircle2, AlertCircle, Edit3, X, Sparkles, Droplet, RefreshCw, ChevronRight, Heart } from 'lucide-react';
import { User, Period, PeriodLog } from '../types';
import { motion, AnimatePresence } from 'framer-motion';

interface ExpectedPeriodCheckInCardProps {
  user: User;
  setUser: React.Dispatch<React.SetStateAction<User | null>>;
  onPeriodLogged?: () => void;
  onOpenLogModal?: () => void;
}

export const ExpectedPeriodCheckInCard: React.FC<ExpectedPeriodCheckInCardProps> = ({
  user,
  setUser,
  onPeriodLogged,
  onOpenLogModal
}) => {
  const [mode, setMode] = useState<'initial' | 'quick_log' | 'not_yet_acknowledged' | 'edit_prediction'>('initial');
  const [selectedDateOption, setSelectedDateOption] = useState<'today' | 'yesterday' | 'custom'>('today');
  
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];

  const lastStart = useMemo(() => {
    return user.lastPeriodStart ? new Date(user.lastPeriodStart) : null;
  }, [user.lastPeriodStart]);

  const cycleLen = user.cycleLength || 28;

  const expectedPeriodDate = useMemo(() => {
    if (!lastStart) return null;
    return new Date(lastStart.getTime() + cycleLen * 24 * 60 * 60 * 1000);
  }, [lastStart, cycleLen]);

  const customDateDefault = useMemo(() => {
    if (expectedPeriodDate) {
      return expectedPeriodDate.toISOString().split('T')[0];
    }
    return todayStr;
  }, [expectedPeriodDate, todayStr]);

  const [customDateVal, setCustomDateVal] = useState<string>(customDateDefault);
  const [selectedIntensity, setSelectedIntensity] = useState<'spotting' | 'light' | 'medium' | 'heavy'>('medium');
  const [editCycleLenInput, setEditCycleLenInput] = useState<number>(cycleLen);
  const [newPredictedDateInput, setNewPredictedDateInput] = useState<string>(customDateDefault);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Normalize dates to midnight to compute days late
  const daysDiff = useMemo(() => {
    if (!expectedPeriodDate) return -1;
    const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
    const expectedMidnight = new Date(expectedPeriodDate.getFullYear(), expectedPeriodDate.getMonth(), expectedPeriodDate.getDate()).getTime();
    const diff = Math.floor((todayMidnight - expectedMidnight) / (1000 * 60 * 60 * 24));
    return diff;
  }, [expectedPeriodDate, today]);

  // Check if period was logged starting on or after expected date
  const hasLoggedPeriodForExpectedCycle = useMemo(() => {
    if (!expectedPeriodDate || !user.lastPeriodStart) return false;
    const expectedMidnight = new Date(expectedPeriodDate.getFullYear(), expectedPeriodDate.getMonth(), expectedPeriodDate.getDate()).getTime();
    const lastStartMidnight = new Date(user.lastPeriodStart).setHours(0, 0, 0, 0);

    if (lastStartMidnight >= expectedMidnight) return true;

    if (user.periods && user.periods.length > 0) {
      return user.periods.some(p => {
        const pStart = new Date(p.startDate).setHours(0, 0, 0, 0);
        return pStart >= expectedMidnight;
      });
    }
    return false;
  }, [expectedPeriodDate, user.lastPeriodStart, user.periods]);

  const isDismissedToday = user.latePeriodDismissedDate === todayStr;

  // Do not render if pregnancy mode, partner mode, no expected date, date is in future, already logged, or dismissed today
  if (
    user.isPregnancyMode || 
    user.isPartner || 
    !expectedPeriodDate || 
    daysDiff < 0 || 
    hasLoggedPeriodForExpectedCycle || 
    isDismissedToday
  ) {
    return null;
  }

  const daysLate = Math.max(0, daysDiff);
  const formattedExpectedDate = expectedPeriodDate.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric'
  });

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // ----------------------------------------------------
  // ACTION HANDLERS
  // ----------------------------------------------------

  // "Yes, it started" -> confirm logging
  const handleConfirmPeriodLog = () => {
    let logDate: Date;
    if (selectedDateOption === 'today') {
      logDate = new Date();
    } else if (selectedDateOption === 'yesterday') {
      logDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
    } else {
      logDate = new Date(customDateVal + 'T12:00:00');
    }

    const logDateStr = logDate.toDateString();
    const isoDateStr = logDate.toISOString().split('T')[0];

    // Build period range
    const periodLen = user.periodLength || 5;
    const endDate = new Date(logDate.getTime() + (periodLen - 1) * 24 * 60 * 60 * 1000);
    const endDateStr = endDate.toDateString();

    const newPeriod: Period = {
      id: Math.random().toString(36).substring(2, 9),
      startDate: logDateStr,
      endDate: endDateStr,
      intensity: selectedIntensity
    };

    const newDates = Array.from(new Set([...(user.periodDates || []), logDateStr]));
    const newLogs: PeriodLog[] = [...(user.periodLogs || []), { date: logDateStr, intensity: selectedIntensity }];
    const allPeriods = [newPeriod, ...(user.periods || [])].sort(
      (a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime()
    );

    const updatedUser: User = {
      ...user,
      lastPeriodStart: logDateStr,
      periodDates: newDates,
      periodLogs: newLogs,
      periods: allPeriods,
      latePeriodCheckIn: undefined,
      latePeriodDismissedDate: undefined
    };

    setUser(updatedUser);
    showToast("Period logged! Cycle predictions and calendar updated. 🌸");
    if (onPeriodLogged) onPeriodLogged();
  };

  // "Not yet" -> record late response
  const handleNotYet = () => {
    const updatedUser: User = {
      ...user,
      latePeriodCheckIn: {
        acknowledgedDate: todayStr,
        daysLate: daysLate,
        response: 'not_yet'
      }
    };
    setUser(updatedUser);
    setMode('not_yet_acknowledged');
    showToast("Logged as late. Lumina will continue tracking for you safely. 💕");
  };

  // Dismiss for today
  const handleSnoozeToday = () => {
    const updatedUser: User = {
      ...user,
      latePeriodDismissedDate: todayStr
    };
    setUser(updatedUser);
  };

  // Update suggested cycle length
  const handleUpdateCycleLength = (newLen: number) => {
    const updatedUser: User = {
      ...user,
      cycleLength: newLen,
      latePeriodCheckIn: undefined
    };
    setUser(updatedUser);
    setMode('initial');
    showToast(`Cycle length updated to ${newLen} days! Future predictions adjusted. ✨`);
  };

  // Save manual prediction edit
  const handleSavePredictionEdit = () => {
    const updatedUser: User = {
      ...user,
      cycleLength: editCycleLenInput,
      latePeriodCheckIn: undefined
    };

    if (newPredictedDateInput) {
      // Adjust lastPeriodStart so expectedPeriodDate aligns with newPredictedDateInput
      const newPredDate = new Date(newPredictedDateInput + 'T12:00:00');
      const adjustedLastStart = new Date(newPredDate.getTime() - editCycleLenInput * 24 * 60 * 60 * 1000);
      updatedUser.lastPeriodStart = adjustedLastStart.toDateString();
    }

    setUser(updatedUser);
    setMode('initial');
    showToast("Predictions and cycle preferences updated! 🌸");
  };

  // Suggested cycle length calculation if late >= 2
  const suggestedCycleLength = Math.min(45, (user.cycleLength || 28) + Math.max(daysLate, 2));

  return (
    <div className="w-full relative my-4">
      {/* Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }} 
            animate={{ opacity: 1, y: 0 }} 
            exit={{ opacity: 0, y: -10 }}
            className="mb-3 p-3 bg-pink-900 text-white text-xs font-semibold rounded-2xl text-center shadow-lg flex items-center justify-center gap-2 border border-pink-400/30"
          >
            <Sparkles size={16} className="text-pink-300 animate-pulse" />
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div 
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        className="overflow-hidden bg-gradient-to-br from-rose-50/95 via-pink-50/90 to-purple-50/80 rounded-[2.5rem] border border-pink-200/80 shadow-[0_12px_28px_rgba(244,114,182,0.12)] p-6 md:p-8 backdrop-blur-xl transition-all"
      >
        {/* Header Ribbon */}
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-pink-400 to-rose-400 text-white flex items-center justify-center shadow-md shadow-pink-200 shrink-0">
              <Calendar size={20} />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-pink-500 block">
                Expected Period Check-In 🌸
              </span>
              <h3 className="text-lg md:text-xl font-serif italic font-bold text-rose-950">
                {daysLate === 0 ? (
                  <span>Period expected <span className="text-rose-600">today</span></span>
                ) : (
                  <span>Period expected on <span className="text-rose-600">{formattedExpectedDate}</span></span>
                )}
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {daysLate > 0 && (
              <span className="px-3.5 py-1 bg-amber-100/90 text-amber-900 border border-amber-300 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 shadow-sm">
                <Clock size={12} className="text-amber-600" />
                <span>Day {daysLate} Late</span>
              </span>
            )}
            <button
              onClick={handleSnoozeToday}
              title="Dismiss check-in for today"
              className="p-1.5 rounded-full hover:bg-pink-100 text-rose-400 hover:text-rose-600 transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* MODE: INITIAL QUESTION */}
        {(mode === 'initial' || (mode as string) === 'question') && (
          <div className="space-y-5">
            <p className="text-sm font-sans text-stone-700 leading-relaxed font-bold">
              Your period was expected on <span className="text-rose-800 underline decoration-rose-300 decoration-2">{formattedExpectedDate}</span>. Has your period started?
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              <button
                onClick={() => setMode('quick_log')}
                className="py-3.5 px-4 bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white rounded-2xl font-black text-xs uppercase tracking-wider shadow-md shadow-pink-200 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <CheckCircle2 size={16} />
                <span>Yes, it started</span>
              </button>

              <button
                onClick={handleNotYet}
                className="py-3.5 px-4 bg-white/90 hover:bg-white text-rose-700 border border-pink-200 rounded-2xl font-black text-xs uppercase tracking-wider shadow-sm hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Clock size={16} className="text-rose-400" />
                <span>Not yet</span>
              </button>

              <button
                onClick={() => setMode('edit_prediction')}
                className="py-3.5 px-4 bg-stone-100/80 hover:bg-stone-200/80 text-stone-700 border border-stone-200/60 rounded-2xl font-black text-xs uppercase tracking-wider shadow-sm hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Edit3 size={16} className="text-stone-500" />
                <span>Edit prediction</span>
              </button>
            </div>
          </div>
        )}

        {/* MODE: QUICK PERIOD LOGGING FLOW */}
        {mode === 'quick_log' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-5 pt-2">
            <div className="flex items-center justify-between border-b border-pink-100 pb-2">
              <h4 className="text-sm font-serif italic font-bold text-rose-900 flex items-center gap-2">
                <Droplet size={16} className="text-rose-500" />
                <span>Log Period Start Date</span>
              </h4>
              <button 
                onClick={() => setMode('initial')}
                className="text-xs font-bold text-rose-400 hover:text-rose-600"
              >
                Back
              </button>
            </div>

            {/* Quick Date Selector Chips */}
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-wider text-rose-400 block">
                When did it start?
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'today', label: 'Today', sub: today.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) },
                  { id: 'yesterday', label: 'Yesterday', sub: new Date(Date.now() - 86400000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) },
                  { id: 'custom', label: 'Custom Date', sub: customDateVal }
                ].map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() => setSelectedDateOption(opt.id as any)}
                    className={`p-3 rounded-2xl text-left border transition-all cursor-pointer ${
                      selectedDateOption === opt.id
                        ? 'bg-rose-500 text-white border-rose-500 shadow-md shadow-rose-200'
                        : 'bg-white/80 text-stone-700 border-pink-200/80 hover:bg-white'
                    }`}
                  >
                    <p className="text-xs font-bold">{opt.label}</p>
                    <p className={`text-[10px] font-medium ${selectedDateOption === opt.id ? 'text-pink-100' : 'text-stone-400'}`}>
                      {opt.sub}
                    </p>
                  </button>
                ))}
              </div>

              {selectedDateOption === 'custom' && (
                <div className="pt-2">
                  <input
                    type="date"
                    value={customDateVal}
                    onChange={(e) => setCustomDateVal(e.target.value)}
                    className="w-full p-3 bg-white border border-pink-200 rounded-2xl text-xs font-bold text-stone-800 focus:outline-none focus:border-rose-400"
                  />
                </div>
              )}
            </div>

            {/* Flow Intensity Selection */}
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-wider text-rose-400 block">
                Flow Intensity
              </label>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { id: 'spotting', label: 'Spotting', icon: '💧' },
                  { id: 'light', label: 'Light', icon: '🩸' },
                  { id: 'medium', label: 'Medium', icon: '🩸🩸' },
                  { id: 'heavy', label: 'Heavy', icon: '🩸🩸🩸' }
                ].map((flow) => (
                  <button
                    key={flow.id}
                    onClick={() => setSelectedIntensity(flow.id as any)}
                    className={`p-2.5 rounded-2xl text-center border transition-all cursor-pointer ${
                      selectedIntensity === flow.id
                        ? 'bg-rose-100 border-rose-400 text-rose-900 font-bold shadow-sm'
                        : 'bg-white/80 border-pink-100 text-stone-600 hover:bg-white'
                    }`}
                  >
                    <span className="text-base block mb-0.5">{flow.icon}</span>
                    <span className="text-[10px] font-bold block">{flow.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={handleConfirmPeriodLog}
                className="flex-1 py-3.5 bg-gradient-to-r from-rose-500 to-pink-500 text-white rounded-2xl font-bold text-xs uppercase tracking-wider shadow-md hover:scale-[1.01] active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <Sparkles size={16} />
                <span>Confirm & Update Cycle 🌸</span>
              </button>
            </div>
          </motion.div>
        )}

        {/* MODE: NOT YET ACKNOWLEDGED LATE STATE */}
        {mode === 'not_yet_acknowledged' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4 pt-1">
            <div className="p-4 bg-amber-50/90 rounded-2xl border border-amber-200/80 space-y-2">
              <div className="flex items-center gap-2 text-amber-900 font-bold text-xs">
                <AlertCircle size={16} className="text-amber-600" />
                <span>Recorded as late ({daysLate} {daysLate === 1 ? 'day' : 'days'} late)</span>
              </div>
              <p className="text-xs text-amber-800/90 leading-relaxed font-sans">
                Cycle lengths can naturally vary due to stress, changes in sleep, travel, or hormone shifts. 
                Lumina will keep tracking for you without disturbing your routines.
              </p>
            </div>

            {/* Smart Cycle Length Recommendation if late >= 2 */}
            {daysLate >= 2 && (
              <div className="p-4 bg-white/90 rounded-2xl border border-pink-200/80 space-y-3 shadow-sm">
                <div className="flex items-center gap-2 text-rose-900 font-bold text-xs">
                  <Sparkles size={16} className="text-pink-500" />
                  <span>Cycle Length Recommendation</span>
                </div>
                <p className="text-xs text-stone-600 leading-relaxed">
                  Your current expected cycle is set to <strong className="text-rose-700">{user.cycleLength || 28} days</strong>. 
                  Since your period is {daysLate} days late, would you like to adjust your average cycle length to <strong className="text-rose-700">{suggestedCycleLength} days</strong>?
                </p>
                <div className="flex gap-2 pt-1">
                  <button
                    onClick={() => handleUpdateCycleLength(suggestedCycleLength)}
                    className="flex-1 py-2.5 bg-rose-500 text-white rounded-xl font-bold text-[10px] uppercase tracking-wider shadow-sm hover:bg-rose-600 transition-all cursor-pointer"
                  >
                    Update to {suggestedCycleLength} Days 🔄
                  </button>
                  <button
                    onClick={() => setMode('initial')}
                    className="px-4 py-2.5 bg-stone-100 text-stone-600 rounded-xl font-bold text-[10px] uppercase tracking-wider hover:bg-stone-200 transition-all cursor-pointer"
                  >
                    Keep {user.cycleLength || 28} Days
                  </button>
                </div>
              </div>
            )}

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={() => setMode('quick_log')}
                className="flex-1 py-3 bg-rose-500 text-white rounded-2xl font-bold text-xs uppercase tracking-wider shadow-sm hover:bg-rose-600 transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Droplet size={14} />
                <span>Log Period Now</span>
              </button>
              <button
                onClick={() => setMode('edit_prediction')}
                className="py-3 px-4 bg-white border border-pink-200 text-stone-700 rounded-2xl font-bold text-xs uppercase tracking-wider hover:bg-stone-50 transition-all cursor-pointer"
              >
                Edit Prediction
              </button>
            </div>
          </motion.div>
        )}

        {/* MODE: EDIT PREDICTION */}
        {mode === 'edit_prediction' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4 pt-1">
            <div className="flex items-center justify-between border-b border-pink-100 pb-2">
              <h4 className="text-sm font-serif italic font-bold text-rose-900 flex items-center gap-2">
                <Edit3 size={16} className="text-rose-500" />
                <span>Adjust Predictions & Settings</span>
              </h4>
              <button 
                onClick={() => setMode('initial')}
                className="text-xs font-bold text-rose-400 hover:text-rose-600"
              >
                Back
              </button>
            </div>

            <div className="space-y-4 text-xs font-sans">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-wider text-rose-400 block">
                  Average Cycle Length (Days)
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    min={21}
                    max={45}
                    value={editCycleLenInput}
                    onChange={(e) => setEditCycleLenInput(parseInt(e.target.value) || 28)}
                    className="w-24 p-3 bg-white border border-pink-200 rounded-2xl text-sm font-bold text-rose-900 text-center focus:outline-none focus:border-rose-400"
                  />
                  <p className="text-stone-500 text-[11px] leading-snug">
                    Standard cycles range between 21 and 35 days.
                  </p>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-wider text-rose-400 block">
                  New Predicted Period Start Date
                </label>
                <input
                  type="date"
                  value={newPredictedDateInput}
                  onChange={(e) => setNewPredictedDateInput(e.target.value)}
                  className="w-full p-3 bg-white border border-pink-200 rounded-2xl text-xs font-bold text-stone-800 focus:outline-none focus:border-rose-400"
                />
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={handleSavePredictionEdit}
                className="flex-1 py-3 bg-gradient-to-r from-pink-500 to-rose-500 text-white rounded-2xl font-bold text-xs uppercase tracking-wider shadow-sm hover:scale-[1.01] transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <RefreshCw size={14} />
                <span>Save & Adjust Predictions</span>
              </button>
            </div>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
};

export default ExpectedPeriodCheckInCard;
