import React, { useState, useMemo } from 'react';
import { Calendar, Clock, CheckCircle2, AlertCircle, Edit3, X, Sparkles, Droplet, RefreshCw, ChevronRight, Heart } from 'lucide-react';
import { User, Period, PeriodLog } from '../types';
import { motion, AnimatePresence } from 'framer-motion';
import { syncUser } from '../services/firebaseService';
import { parseYMDToLocalDate, reconstructCycleData } from '../services/cycleSyncService';

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
      id: crypto.randomUUID(),
      startDate: logDateStr,
      endDate: endDateStr,
      intensity: selectedIntensity
    };

    const reconstructed = reconstructCycleData(
      [newPeriod, ...(user.periods || [])],
      user.periodDates,
      user.periodLogs
    );

    const updatedUser: User = {
      ...user,
      lastPeriodStart: logDateStr,
      periodDates: reconstructed.periodDates,
      periodLogs: reconstructed.periodLogs,
      periods: reconstructed.periods,
      latePeriodCheckIn: undefined,
      latePeriodDismissedDate: undefined
    };

    setUser(updatedUser);
    try {
      syncUser(updatedUser);
    } catch (e) {
      console.warn("Failed to sync period check-in:", e);
    }
    showToast("Period logged! Cycle Day 1 reset & calendar synchronized. 🌸");
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
    syncUser(updatedUser);
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
    syncUser(updatedUser);
  };

  // Update suggested cycle length
  const handleUpdateCycleLength = (newLen: number) => {
    const updatedUser: User = {
      ...user,
      previousCycleLength: user.cycleLength || 28,
      cycleLength: newLen,
      latePeriodCheckIn: undefined
    };
    setUser(updatedUser);
    syncUser(updatedUser);
    setMode('initial');
    showToast(`Cycle length updated to ${newLen} days! Future predictions adjusted. ✨`);
  };

  // Save manual prediction edit
  const handleSavePredictionEdit = () => {
    const updatedUser: User = {
      ...user,
      previousCycleLength: user.cycleLength || 28,
      cycleLength: editCycleLenInput,
      latePeriodCheckIn: undefined
    };

    if (newPredictedDateInput) {
      // Adjust lastPeriodStart so expectedPeriodDate aligns with newPredictedDateInput
      const newPredDate = parseYMDToLocalDate(newPredictedDateInput);
      const adjustedLastStart = new Date(newPredDate.getTime() - editCycleLenInput * 24 * 60 * 60 * 1000);
      updatedUser.lastPeriodStart = adjustedLastStart.toDateString();
    }

    setUser(updatedUser);
    syncUser(updatedUser);
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
            className="mb-3 p-3 bg-stone-900 dark:bg-[#23201d] text-white text-xs font-medium rounded-xl text-center shadow-md flex items-center justify-center gap-2 border border-stone-700 dark:border-[#342f2b]"
          >
            <Sparkles size={15} className="text-pink-400 shrink-0" />
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        initial={{ opacity: 0, scale: 0.99 }}
        animate={{ opacity: 1, scale: 1 }}
        className="overflow-hidden bg-white dark:bg-[#1a1816] rounded-2xl border border-pink-200/80 dark:border-pink-900/50 shadow-xs p-5 sm:p-7 transition-colors"
      >
        {/* Header Ribbon */}
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-pink-600 text-white flex items-center justify-center shrink-0">
              <Calendar size={18} />
            </div>
            <div>
              <span className="text-xs font-semibold text-pink-600 dark:text-pink-400 block">
                Expected Period Check-In
              </span>
              <h3 className="text-lg sm:text-xl font-serif font-semibold text-stone-900 dark:text-stone-100">
                {daysLate === 0 ? (
                  <span>Period expected <span className="text-rose-600 dark:text-rose-400">today</span></span>
                ) : (
                  <span>Period expected on <span className="text-rose-600 dark:text-rose-400">{formattedExpectedDate}</span></span>
                )}
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {daysLate > 0 && (
              <span className="px-3 py-1 bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-900/50 rounded-lg text-xs font-semibold flex items-center gap-1.5 tabular-nums">
                <Clock size={12} className="text-amber-600 dark:text-amber-400" />
                <span>Day {daysLate} Late</span>
              </span>
            )}
            <button
              type="button"
              onClick={handleSnoozeToday}
              title="Dismiss check-in for today"
              className="p-1.5 rounded-lg hover:bg-stone-100 dark:hover:bg-[#23201d] text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* MODE: INITIAL QUESTION */}
        {(mode === 'initial' || (mode as string) === 'question') && (
          <div className="space-y-4">
            <p className="text-sm text-stone-700 dark:text-stone-300 leading-relaxed">
              Your period was expected on <span className="font-semibold text-stone-900 dark:text-stone-100 underline decoration-rose-400 decoration-2">{formattedExpectedDate}</span>. Has your period started?
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => setMode('quick_log')}
                className="py-3 px-4 bg-pink-600 hover:bg-pink-700 text-white rounded-xl font-semibold text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <CheckCircle2 size={15} />
                <span>Yes, it started</span>
              </button>

              <button
                type="button"
                onClick={handleNotYet}
                className="py-3 px-4 bg-[#faf8f6] dark:bg-[#23201d] hover:bg-stone-100 dark:hover:bg-[#2c2824] text-stone-800 dark:text-stone-200 border border-stone-200/80 dark:border-[#342f2b] rounded-xl font-semibold text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <Clock size={15} className="text-rose-500" />
                <span>Not yet</span>
              </button>

              <button
                type="button"
                onClick={() => setMode('edit_prediction')}
                className="py-3 px-4 bg-[#faf8f6] dark:bg-[#23201d] hover:bg-stone-100 dark:hover:bg-[#2c2824] text-stone-700 dark:text-stone-300 border border-stone-200/80 dark:border-[#342f2b] rounded-xl font-semibold text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <Edit3 size={15} className="text-stone-500" />
                <span>Edit prediction</span>
              </button>
            </div>
          </div>
        )}

        {/* MODE: QUICK PERIOD LOGGING FLOW */}
        {mode === 'quick_log' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-5 pt-2">
            <div className="flex items-center justify-between border-b border-stone-200/70 dark:border-[#2e2a26] pb-2.5">
              <h4 className="text-sm font-serif font-semibold text-stone-900 dark:text-stone-100 flex items-center gap-2">
                <Droplet size={15} className="text-rose-500" />
                <span>Log Period Start Date</span>
              </h4>
              <button
                type="button"
                onClick={() => setMode('initial')}
                className="text-xs font-semibold text-rose-600 dark:text-rose-400 hover:underline cursor-pointer"
              >
                Back
              </button>
            </div>

            {/* Quick Date Selector Chips */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-stone-600 dark:text-stone-300 block">
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
                    type="button"
                    onClick={() => setSelectedDateOption(opt.id as any)}
                    className={`p-3 rounded-xl text-left border transition-colors cursor-pointer ${
                      selectedDateOption === opt.id
                        ? 'bg-rose-600 text-white border-rose-600'
                        : 'bg-[#faf8f6] dark:bg-[#23201d] text-stone-800 dark:text-stone-200 border-stone-200/80 dark:border-[#342f2b] hover:border-rose-300'
                    }`}
                  >
                    <p className="text-xs font-semibold">{opt.label}</p>
                    <p className={`text-[11px] font-medium tabular-nums ${selectedDateOption === opt.id ? 'text-rose-100' : 'text-stone-500 dark:text-stone-400'}`}>
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
                    className="w-full h-11 px-3.5 bg-[#faf8f6] dark:bg-[#23201d] border border-stone-200/80 dark:border-[#342f2b] rounded-xl text-xs font-medium text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-rose-500/30"
                  />
                </div>
              )}
            </div>

            {/* Flow Intensity Selection */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-stone-600 dark:text-stone-300 block">
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
                    type="button"
                    onClick={() => setSelectedIntensity(flow.id as any)}
                    className={`p-2.5 rounded-xl text-center border transition-colors cursor-pointer ${
                      selectedIntensity === flow.id
                        ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-500 text-rose-800 dark:text-rose-200 font-semibold'
                        : 'bg-[#faf8f6] dark:bg-[#23201d] border-stone-200/80 dark:border-[#342f2b] text-stone-700 dark:text-stone-300 hover:border-rose-300'
                    }`}
                  >
                    <span className="text-sm block mb-0.5">{flow.icon}</span>
                    <span className="text-xs font-medium block">{flow.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-3 pt-1">
              <button
                type="button"
                onClick={handleConfirmPeriodLog}
                className="flex-1 py-3 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-semibold text-xs transition-colors cursor-pointer flex items-center justify-center gap-2"
              >
                <Sparkles size={15} />
                <span>Confirm & Update Cycle</span>
              </button>
            </div>
          </motion.div>
        )}

        {/* MODE: NOT YET ACKNOWLEDGED LATE STATE */}
        {mode === 'not_yet_acknowledged' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4 pt-1">
            <div className="p-4 bg-amber-50 dark:bg-amber-950/30 rounded-xl border border-amber-200/80 dark:border-amber-900/50 space-y-1.5">
              <div className="flex items-center gap-2 text-amber-900 dark:text-amber-300 font-semibold text-xs tabular-nums">
                <AlertCircle size={15} className="text-amber-600 dark:text-amber-400" />
                <span>Recorded as late ({daysLate} {daysLate === 1 ? 'day' : 'days'} late)</span>
              </div>
              <p className="text-xs text-amber-800 dark:text-amber-200/90 leading-relaxed">
                Cycle lengths naturally vary due to stress, sleep shifts, travel, or hormonal changes. Lumina continues tracking without disrupting your history.
              </p>
            </div>

            {/* Smart Cycle Length Recommendation if late >= 2 */}
            {daysLate >= 2 && (
              <div className="p-4 bg-[#faf8f6] dark:bg-[#23201d] rounded-xl border border-stone-200/80 dark:border-[#342f2b] space-y-3">
                <div className="flex items-center gap-2 text-stone-900 dark:text-stone-100 font-semibold text-xs">
                  <Sparkles size={15} className="text-pink-600 dark:text-pink-400" />
                  <span>Cycle Length Recommendation</span>
                </div>
                <p className="text-xs text-stone-600 dark:text-stone-300 leading-relaxed tabular-nums">
                  Your current expected cycle is set to <strong className="text-stone-900 dark:text-stone-100">{user.cycleLength || 28} days</strong>.
                  Since your period is {daysLate} days late, would you like to adjust your average cycle length to <strong className="text-stone-900 dark:text-stone-100">{suggestedCycleLength} days</strong>?
                </p>
                <div className="flex flex-wrap gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => handleUpdateCycleLength(suggestedCycleLength)}
                    className="flex-1 py-2.5 px-3 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-semibold text-xs transition-colors cursor-pointer whitespace-nowrap"
                  >
                    Update to {suggestedCycleLength} Days
                  </button>
                  <button
                    type="button"
                    onClick={() => setMode('initial')}
                    className="px-4 py-2.5 bg-white dark:bg-[#1a1816] text-stone-700 dark:text-stone-200 border border-stone-200/80 dark:border-[#342f2b] rounded-xl font-semibold text-xs hover:bg-stone-100 dark:hover:bg-[#2c2824] transition-colors cursor-pointer whitespace-nowrap"
                  >
                    Keep {user.cycleLength || 28} Days
                  </button>
                </div>
              </div>
            )}

            <div className="flex items-center gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => setMode('quick_log')}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-semibold text-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Droplet size={14} />
                <span>Log Period Now</span>
              </button>
              <button
                type="button"
                onClick={() => setMode('edit_prediction')}
                className="py-2.5 px-4 bg-[#faf8f6] dark:bg-[#23201d] border border-stone-200/80 dark:border-[#342f2b] text-stone-700 dark:text-stone-200 rounded-xl font-semibold text-xs hover:bg-stone-100 dark:hover:bg-[#2c2824] transition-colors cursor-pointer"
              >
                Edit Prediction
              </button>
            </div>
          </motion.div>
        )}

        {/* MODE: EDIT PREDICTION */}
        {mode === 'edit_prediction' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4 pt-1">
            <div className="flex items-center justify-between border-b border-stone-200/70 dark:border-[#2e2a26] pb-2.5">
              <h4 className="text-sm font-serif font-semibold text-stone-900 dark:text-stone-100 flex items-center gap-2">
                <Edit3 size={15} className="text-rose-500" />
                <span>Adjust Predictions & Settings</span>
              </h4>
              <button
                type="button"
                onClick={() => setMode('initial')}
                className="text-xs font-semibold text-rose-600 dark:text-rose-400 hover:underline cursor-pointer"
              >
                Back
              </button>
            </div>

            <div className="space-y-4 text-xs">
              {user.automaticCyclePrediction ? (
                <div className="bg-purple-50 dark:bg-purple-950/30 p-3.5 rounded-xl border border-purple-200/70 dark:border-purple-900/50 flex items-center gap-2.5">
                  <Sparkles size={16} className="text-purple-600 dark:text-purple-400 shrink-0" />
                  <div className="text-xs text-stone-700 dark:text-stone-200 leading-snug">
                    <strong>Automatic Cycle Prediction is Active:</strong> Lumina is managing your cycle length automatically ({user.cycleLength || 28} days). Manual cycle adjustment is available when Automatic Prediction is disabled in Settings.
                  </div>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-stone-600 dark:text-stone-300 block">
                    Average Cycle Length (Days)
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="number"
                      min={21}
                      max={45}
                      value={editCycleLenInput}
                      onChange={(e) => setEditCycleLenInput(parseInt(e.target.value) || 28)}
                      className="w-24 h-11 px-3 bg-[#faf8f6] dark:bg-[#23201d] border border-stone-200/80 dark:border-[#342f2b] rounded-xl text-sm font-semibold text-stone-900 dark:text-stone-100 text-center focus:outline-none focus:ring-2 focus:ring-rose-500/30 tabular-nums"
                    />
                    <p className="text-stone-500 dark:text-stone-400 text-xs leading-snug">
                      Typical cycles range between 21 and 35 days.
                    </p>
                  </div>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-stone-600 dark:text-stone-300 block">
                  New Predicted Period Start Date
                </label>
                <input
                  type="date"
                  value={newPredictedDateInput}
                  onChange={(e) => setNewPredictedDateInput(e.target.value)}
                  className="w-full h-11 px-3.5 bg-[#faf8f6] dark:bg-[#23201d] border border-stone-200/80 dark:border-[#342f2b] rounded-xl text-xs font-medium text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-rose-500/30"
                />
              </div>
            </div>

            <div className="flex items-center gap-3 pt-1">
              <button
                type="button"
                onClick={handleSavePredictionEdit}
                className="flex-1 py-3 bg-pink-600 hover:bg-pink-700 text-white rounded-xl font-semibold text-xs transition-colors cursor-pointer flex items-center justify-center gap-2"
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
