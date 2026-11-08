import { User, Period } from '../types';

export type MenstrualPhase = 'Menstrual' | 'Follicular' | 'Ovulatory' | 'Luteal' | 'Late Period';

export interface CycleSyncData {
  cycleDay: number;
  cycleLength: number;
  periodLength: number;
  phase: MenstrualPhase;
  phaseName: string;
  phaseEmoji: string;
  phaseDescription: string;
  isLatePeriodMode: boolean;
  daysLate: number;

  // Ovulation & Fertile Window estimates (clearly marked as estimates)
  ovulationDay: number;
  estimatedOvulationDate: Date | null;
  estimatedOvulationDateFormatted: string; // e.g. "Nov 14 (Estimated)"
  daysUntilEstimatedOvulation: number | null; // negative if past ovulation in current cycle

  fertileStartDay: number;
  fertileEndDay: number;
  estimatedFertileStartDate: Date | null;
  estimatedFertileEndDate: Date | null;
  estimatedFertileRangeFormatted: string; // e.g. "Nov 9 – Nov 15 (Estimated)" or "" if not available
  isWithinFertileWindow: boolean;
  isOvulationDay: boolean;
  fertilityStatus: string | null; // e.g. "High Fertility (Estimated)" | "Peak Fertility - Ovulation Day (Estimated)" | null
  fertilityBadgeColor: string;

  // Next expected period
  nextExpectedPeriodDate: Date | null;
  nextExpectedPeriodFormatted: string; // e.g. "Nov 28 (Estimated)"
  daysUntilNextPeriod: number | null; // negative if late, 0 if today, positive if upcoming

  // Reference start date used for calculation
  referencePeriodStart: Date | null;
  hasLoggedHistory: boolean;
  isEstimated: boolean; // true if based on algorithmic projection
}

export interface DateCycleDetails {
  date: Date;
  dateString: string;
  cycleDay: number;
  phase: MenstrualPhase;
  phaseName: string;
  phaseKey: 'menstrual' | 'follicular' | 'ovulatory' | 'luteal' | 'late';
  phaseEmoji: string;
  isLoggedPeriod: boolean;
  isPredictedPeriod: boolean;
  isWithinFertileWindow: boolean;
  isOvulationDay: boolean;
  fertilityStatus: string | null;
  fertilityKey: 'none' | 'fertile_window' | 'peak_ovulation';
  color: string;
  badgeColor: string;
  hormoneInfo: string;
  insights: string;
}

/**
 * Standardizes a date to local midnight (00:00:00.000) to ensure robust day difference math.
 */
export function toMidnight(d: Date | string | number): Date {
  const date = new Date(d);
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/**
 * Finds the most authoritative reference period start date for a user:
 * 1. The most recent logged period in user.periods (if valid)
 * 2. user.lastPeriodStart
 * 3. Earliest logged periodDate or today if no history logged
 */
export function getAuthoritativePeriodStart(user?: Partial<User> | null): { date: Date; hasLoggedHistory: boolean } {
  if (!user) {
    return { date: toMidnight(new Date()), hasLoggedHistory: false };
  }

  // Check user.periods array for latest valid startDate
  if (user.periods && user.periods.length > 0) {
    const validPeriods = user.periods
      .filter(p => p.startDate && !isNaN(new Date(p.startDate).getTime()))
      .sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());

    if (validPeriods.length > 0) {
      return { date: toMidnight(validPeriods[0].startDate), hasLoggedHistory: true };
    }
  }

  // Check user.lastPeriodStart
  if (user.lastPeriodStart && !isNaN(new Date(user.lastPeriodStart).getTime())) {
    return { date: toMidnight(user.lastPeriodStart), hasLoggedHistory: true };
  }

  // Fallback to today (uninitialized / onboarding placeholder)
  return { date: toMidnight(new Date()), hasLoggedHistory: false };
}

/**
 * Central synchronised calculation engine for:
 * - Current cycle day
 * - Cycle length & period length
 * - Menstrual phase (Menstrual, Follicular, Ovulatory, Luteal, or Late Period)
 * - Estimated ovulation date & days until ovulation
 * - Estimated fertile window (separate fertility status, NOT replacing the phase)
 * - Next expected period date
 */
export function calculateCycleSyncData(
  user?: Partial<User> | null,
  targetDate: Date = new Date()
): CycleSyncData {
  const cycleLen = Math.max(15, Math.min(60, Number(user?.cycleLength) || 28));
  const periodLen = Math.max(1, Math.min(15, Number(user?.periodLength) || 5));

  const { date: refStart, hasLoggedHistory } = getAuthoritativePeriodStart(user);
  const targetMidnight = toMidnight(targetDate);
  const startMidnight = toMidnight(refStart);

  const diffTime = targetMidnight.getTime() - startMidnight.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  // Determine if user has logged a period that started on or after the expected next period
  const expectedMidnight = toMidnight(new Date(startMidnight.getTime() + cycleLen * 86400000));
  let hasLoggedPeriodForExpectedCycle = false;
  if (user?.periods && user.periods.length > 0) {
    hasLoggedPeriodForExpectedCycle = user.periods.some(p => {
      const pStart = toMidnight(p.startDate).getTime();
      return pStart >= expectedMidnight.getTime();
    });
  }

  const isLatePeriodMode = diffDays > cycleLen && !hasLoggedPeriodForExpectedCycle;
  const daysLate = isLatePeriodMode ? diffDays - cycleLen : 0;

  // Cycle day calculation
  let cycleDay: number;
  if (isLatePeriodMode) {
    cycleDay = cycleLen + daysLate;
  } else if (diffDays >= 0) {
    cycleDay = (diffDays % cycleLen) + 1;
  } else {
    // Target date is before reference start
    cycleDay = ((diffDays % cycleLen) + cycleLen) % cycleLen + 1;
  }

  // Standard physiological ovulation timing: luteal phase is typically ~14 days (ovulationDay = cycleLen - 14)
  const ovulationDay = Math.max(periodLen + 1, cycleLen - 14);

  // Fertile window: sperm survives up to 5 days, egg survives up to 24-48 hours.
  // Standard clinical window: ovulationDay - 5 to ovulationDay + 1 (7 days total)
  const fertileStartDay = Math.max(1, ovulationDay - 5);
  const fertileEndDay = Math.min(cycleLen, ovulationDay + 1);

  // Biological menstrual phase (distinct from fertility status!)
  let phase: MenstrualPhase = 'Follicular';
  let phaseName = 'Follicular Phase';
  let phaseEmoji = '🌱';
  let phaseDescription = 'Rising physical energy, creativity, and fresh optimism as estrogen climbs.';

  if (isLatePeriodMode) {
    phase = 'Late Period';
    phaseName = `Day ${daysLate} Late`;
    phaseEmoji = '⏳';
    phaseDescription = `Your period is past the expected date (${expectedMidnight.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}). Lumina is tracking your late period mode.`;
  } else if (cycleDay <= periodLen) {
    phase = 'Menstrual';
    phaseName = 'Menstrual Phase';
    phaseEmoji = '🩸';
    phaseDescription = 'A time for quiet sunset reflection, gentle hydration, and restorative physical rest.';
  } else if (cycleDay <= ovulationDay - 1) {
    phase = 'Follicular';
    phaseName = 'Follicular Phase';
    phaseEmoji = '🌱';
    phaseDescription = 'Rising vitality, focus, and estrogen. Excellent for creative goals and fresh habits.';
  } else if (cycleDay <= ovulationDay + 1) {
    phase = 'Ovulatory';
    phaseName = 'Ovulatory Phase';
    phaseEmoji = '✨';
    phaseDescription = 'Peak biological glow and social radiance. Confidence and vitality are elevated.';
  } else {
    phase = 'Luteal';
    phaseName = 'Luteal Phase';
    phaseEmoji = '🌙';
    phaseDescription = 'Turning gently inward. High emotional intuition, nesting instincts, and cozy comfort.';
  }

  // Separate fertility window evaluation
  const isWithinFertileWindow = !isLatePeriodMode && cycleDay >= fertileStartDay && cycleDay <= fertileEndDay;
  const isOvulationDay = !isLatePeriodMode && cycleDay === ovulationDay;

  let fertilityStatus: string | null = null;
  let fertilityBadgeColor = '';

  if (isOvulationDay) {
    fertilityStatus = 'Peak Fertility • Ovulation Day (Estimated)';
    fertilityBadgeColor = 'bg-amber-100 text-amber-800 border-amber-200';
  } else if (isWithinFertileWindow) {
    fertilityStatus = 'Fertile Window Active (Estimated)';
    fertilityBadgeColor = 'bg-teal-100 text-teal-800 border-teal-200';
  } else {
    fertilityStatus = null; // Requirement 4: If outside estimated fertile window, do NOT display Fertile Window
  }

  // Date objects for current cycle predictions
  // How many complete cycles between startMidnight and targetMidnight?
  const completedCycleCount = diffDays >= 0 ? Math.floor(diffDays / cycleLen) : -1;
  const currentCycleStartMidnight = new Date(startMidnight.getTime() + completedCycleCount * cycleLen * 86400000);

  const estimatedOvulationDate = hasLoggedHistory
    ? new Date(currentCycleStartMidnight.getTime() + (ovulationDay - 1) * 86400000)
    : null;

  const estimatedFertileStartDate = hasLoggedHistory
    ? new Date(currentCycleStartMidnight.getTime() + (fertileStartDay - 1) * 86400000)
    : null;

  const estimatedFertileEndDate = hasLoggedHistory
    ? new Date(currentCycleStartMidnight.getTime() + (fertileEndDay - 1) * 86400000)
    : null;

  const nextExpectedPeriodDate = hasLoggedHistory
    ? new Date(currentCycleStartMidnight.getTime() + cycleLen * 86400000)
    : null;

  const daysUntilEstimatedOvulation = !isLatePeriodMode ? ovulationDay - cycleDay : null;
  const daysUntilNextPeriod = !isLatePeriodMode ? cycleLen - cycleDay : -daysLate;

  const formatShortDate = (d: Date | null) => {
    if (!d || isNaN(d.getTime())) return '';
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const estimatedOvulationDateFormatted = estimatedOvulationDate
    ? `${formatShortDate(estimatedOvulationDate)} (Estimated)`
    : 'Estimated based on cycle length';

  const estimatedFertileRangeFormatted = estimatedFertileStartDate && estimatedFertileEndDate
    ? `${formatShortDate(estimatedFertileStartDate)} – ${formatShortDate(estimatedFertileEndDate)} (Estimated)`
    : '';

  const nextExpectedPeriodFormatted = nextExpectedPeriodDate
    ? `${formatShortDate(nextExpectedPeriodDate)} (Estimated)`
    : 'Estimated based on cycle length';

  return {
    cycleDay,
    cycleLength: cycleLen,
    periodLength: periodLen,
    phase,
    phaseName,
    phaseEmoji,
    phaseDescription,
    isLatePeriodMode,
    daysLate,
    ovulationDay,
    estimatedOvulationDate,
    estimatedOvulationDateFormatted,
    daysUntilEstimatedOvulation,
    fertileStartDay,
    fertileEndDay,
    estimatedFertileStartDate,
    estimatedFertileEndDate,
    estimatedFertileRangeFormatted,
    isWithinFertileWindow,
    isOvulationDay,
    fertilityStatus,
    fertilityBadgeColor,
    nextExpectedPeriodDate,
    nextExpectedPeriodFormatted,
    daysUntilNextPeriod,
    referencePeriodStart: refStart,
    hasLoggedHistory,
    isEstimated: true
  };
}

/**
 * Calculates complete cycle and fertility details for any specified date (used by Calendar, Day inspector, etc.)
 */
export function getCycleDetailsForSpecificDate(
  user?: Partial<User> | null,
  targetDate: Date = new Date()
): DateCycleDetails {
  const sync = calculateCycleSyncData(user, targetDate);
  const dateStr = targetDate.toDateString();

  // Check if date is explicitly logged as a period date
  const isLoggedPeriod = Boolean(
    user?.periods?.some(p => {
      const s = toMidnight(p.startDate).getTime();
      const e = toMidnight(p.endDate || p.startDate).getTime();
      const c = toMidnight(targetDate).getTime();
      return c >= s && c <= e;
    }) || user?.periodDates?.includes(dateStr)
  );

  const isPredictedPeriod = !isLoggedPeriod && !sync.isLatePeriodMode && sync.cycleDay <= sync.periodLength;

  let phaseKey: 'menstrual' | 'follicular' | 'ovulatory' | 'luteal' | 'late' = 'follicular';
  let color = '#a855f7';
  let badgeColor = 'bg-purple-100 text-purple-700';
  let hormoneInfo = 'FSH rises as follicles mature. Estrogen climbs steadily.';
  let insights = 'Energy and cognitive focus are expanding. Ideal for new beginnings!';

  if (sync.isLatePeriodMode) {
    phaseKey = 'late';
    color = '#f59e0b';
    badgeColor = 'bg-amber-100 text-amber-800';
    hormoneInfo = 'Hormone levels are pending onset of menses.';
    insights = 'Take time to rest and honor your natural rhythm.';
  } else if (isLoggedPeriod || isPredictedPeriod) {
    phaseKey = 'menstrual';
    color = '#f472b6';
    badgeColor = 'bg-pink-100 text-pink-700';
    hormoneInfo = 'Estrogen and progesterone are at baseline levels as the lining renews.';
    insights = 'Prioritize deep nourishment, rest, and warm comfort.';
  } else if (sync.phase === 'Ovulatory') {
    phaseKey = 'ovulatory';
    color = '#eab308';
    badgeColor = 'bg-amber-100 text-amber-800';
    hormoneInfo = 'Estrogen peaks, triggering an LH surge for egg release.';
    insights = 'Social charisma, confidence, and radiance are at their highest!';
  } else if (sync.phase === 'Luteal') {
    phaseKey = 'luteal';
    color = '#6366f1';
    badgeColor = 'bg-indigo-100 text-indigo-700';
    hormoneInfo = 'Progesterone dominates to nurture the lining.';
    insights = 'Slow down, nurture yourself, and honor your inner space.';
  }

  let fertilityKey: 'none' | 'fertile_window' | 'peak_ovulation' = 'none';
  if (sync.isOvulationDay) {
    fertilityKey = 'peak_ovulation';
  } else if (sync.isWithinFertileWindow) {
    fertilityKey = 'fertile_window';
  }

  return {
    date: targetDate,
    dateString: dateStr,
    cycleDay: sync.cycleDay,
    phase: sync.phase,
    phaseName: sync.phaseName,
    phaseKey,
    phaseEmoji: sync.phaseEmoji,
    isLoggedPeriod,
    isPredictedPeriod,
    isWithinFertileWindow: sync.isWithinFertileWindow,
    isOvulationDay: sync.isOvulationDay,
    fertilityStatus: sync.fertilityStatus,
    fertilityKey,
    color,
    badgeColor,
    hormoneInfo,
    insights
  };
}
