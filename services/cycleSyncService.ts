import { User, Period } from '../types';

export type MenstrualPhase = 'Menstrual' | 'Follicular' | 'Ovulatory' | 'Luteal' | 'Late Period';

export interface CycleAnalysisResult {
  averageCycleLength: number;
  averagePeriodDuration: number;
  cycleCount: number;
  variationDays: number;
  confidence: 'insufficient_data' | 'learning' | 'established';
  explanation: string;
  isIrregular: boolean;
  historyIntervals: number[];
}

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
  estimatedPrecedingFertileEndDate: Date | null;
  estimatedFertileRangeFormatted: string; // e.g. "Nov 1 – Nov 5 (Estimated)" (the 5 preceding fertile days)
  isPrecedingFertileDay: boolean; // True during the 5 days before ovulation
  isWithinFertileWindow: boolean; // True during the 5 preceding fertile days OR on ovulation day
  isOvulationDay: boolean; // True ONLY for the single estimated ovulation date
  fertilityStatus: string | null; // e.g. "High Fertility • Fertile Window (Estimated)" | "Peak Fertility • Ovulation Day (Estimated)" | null
  fertilityBadgeColor: string;

  // Next expected period
  nextExpectedPeriodDate: Date | null;
  nextExpectedPeriodFormatted: string; // e.g. "Nov 28 (Estimated)"
  daysUntilNextPeriod: number | null; // negative if late, 0 if today, positive if upcoming

  // Reference start date used for calculation
  referencePeriodStart: Date | null;
  hasLoggedHistory: boolean;
  isEstimated: boolean; // true if based on algorithmic projection

  // Automatic cycle prediction properties
  isAutomaticPrediction: boolean;
  predictionExplanation: string;
  predictionConfidence: 'insufficient_data' | 'learning' | 'established' | 'manual';
  insufficientHistory: boolean;
  cycleAnalysis: CycleAnalysisResult;
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
  isPrecedingFertileDay: boolean;
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
 * Formats a date into "YYYY-MM-DD" using local calendar components (not UTC).
 * This prevents the timezone-shift bug where e.g. Nov 8 becomes Nov 7.
 */
export function formatYMD(dateInput: Date | string | number | null | undefined): string {
  if (!dateInput) return '';
  if (typeof dateInput === 'string') {
    const trimmed = dateInput.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  }
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return '';
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Parses a date or "YYYY-MM-DD" string into a Date object at local midnight without UTC drift.
 */
export function parseYMDToLocalDate(input: string | Date | number | null | undefined): Date {
  if (!input) return toMidnight(new Date());
  if (input instanceof Date) {
    return toMidnight(input);
  }
  if (typeof input === 'string') {
    const trimmed = input.trim();
    const match = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) {
      const [, y, m, d] = match;
      return new Date(Number(y), Number(m) - 1, Number(d));
    }
    const parsed = new Date(trimmed);
    if (!isNaN(parsed.getTime())) {
      return toMidnight(parsed);
    }
  }
  return toMidnight(new Date());
}

/**
 * Converts a date input to standardized string e.g. "Sun Nov 08 2026"
 */
export function toStandardDateString(input: string | Date | number | null | undefined): string {
  return parseYMDToLocalDate(input).toDateString();
}

/**
 * Robust reconstruction of periods, periodDates, and periodLogs.
 * Ensures consistent sorting, deduplication, and synchronization of lastPeriodStart.
 */
/**
 * Robust reconstruction of periods, periodDates, and periodLogs.
 * Ensures consistent sorting, deduplication, and synchronization of lastPeriodStart.
 * Authoritative: When periods exist, dates are strictly reconstructed from the periods,
 * preventing old extraneous dates (e.g. from a previously changed duration or deleted period)
 * from lingering in periodDates.
 */
export function reconstructCycleData(
  periods: Period[],
  existingDates: string[] = [],
  existingLogs: { date: string; intensity?: any }[] = []
): {
  periods: Period[];
  periodDates: string[];
  periodLogs: { date: string; intensity: 'spotting' | 'light' | 'medium' | 'heavy' }[];
  lastPeriodStart: string;
} {
  const sortedPeriods = [...periods].sort(
    (a, b) => parseYMDToLocalDate(b.startDate).getTime() - parseYMDToLocalDate(a.startDate).getTime()
  );

  const datesSet = new Set<string>();
  const logsMap = new Map<string, 'spotting' | 'light' | 'medium' | 'heavy'>();

  // Add all dates from periods
  sortedPeriods.forEach(p => {
    const s = parseYMDToLocalDate(p.startDate);
    const e = parseYMDToLocalDate(p.endDate || p.startDate);
    const cur = new Date(s);
    while (cur <= e) {
      const dStr = cur.toDateString();
      datesSet.add(dStr);
      logsMap.set(dStr, (p.intensity as any) || 'medium');
      cur.setDate(cur.getDate() + 1);
    }
  });

  // Only preserve loose existingDates if NO period objects exist (legacy / initial manual dates)
  if (sortedPeriods.length === 0 && existingDates.length > 0) {
    existingDates.forEach(d => {
      datesSet.add(d);
    });
    existingLogs.forEach(l => {
      if (!logsMap.has(l.date)) {
        logsMap.set(l.date, (l.intensity as any) || 'medium');
      }
    });
  }

  const periodDates = Array.from(datesSet).sort(
    (a, b) => new Date(b).getTime() - new Date(a).getTime()
  );

  const periodLogs = Array.from(logsMap.entries()).map(([date, intensity]) => ({
    date,
    intensity
  })).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const lastPeriodStart = sortedPeriods[0]?.startDate || (periodDates[0] ? periodDates[0] : new Date().toDateString());

  return {
    periods: sortedPeriods,
    periodDates,
    periodLogs,
    lastPeriodStart
  };
}

/**
 * Analyzes previous recorded cycle history to compute average cycle length,
 * irregularity, and confidence status for automatic cycle prediction.
 */
export function analyzeCycleHistory(
  periods: Period[] = [],
  fallbackCycleLength: number = 28,
  fallbackPeriodLength: number = 5
): CycleAnalysisResult {
  const fallback = Math.max(15, Math.min(60, Number(fallbackCycleLength) || 28));
  const fallbackPeriod = Math.max(1, Math.min(15, Number(fallbackPeriodLength) || 5));

  // Compute average period bleeding duration from logged periods
  const validDurations: number[] = [];
  (periods || []).forEach(p => {
    if (p.startDate) {
      const s = parseYMDToLocalDate(p.startDate);
      const e = parseYMDToLocalDate(p.endDate || p.startDate);
      const dur = Math.round((e.getTime() - s.getTime()) / 86400000) + 1;
      if (dur >= 2 && dur <= 14) {
        validDurations.push(dur);
      }
    }
  });

  const averagePeriodDuration = validDurations.length > 0
    ? Math.max(2, Math.min(10, Math.round(validDurations.reduce((a, b) => a + b, 0) / validDurations.length)))
    : fallbackPeriod;

  // Extract all valid start dates
  const validStarts = (periods || [])
    .filter(p => p.startDate && !isNaN(parseYMDToLocalDate(p.startDate).getTime()))
    .map(p => parseYMDToLocalDate(p.startDate).getTime())
    .sort((a, b) => a - b);

  // Deduplicate start dates
  const uniqueStarts: number[] = [];
  validStarts.forEach(t => {
    if (uniqueStarts.length === 0 || Math.abs(t - uniqueStarts[uniqueStarts.length - 1]) >= 86400000) {
      uniqueStarts.push(t);
    }
  });

  const intervals: number[] = [];
  for (let i = 0; i < uniqueStarts.length - 1; i++) {
    const diffDays = Math.round((uniqueStarts[i + 1] - uniqueStarts[i]) / 86400000);
    // Physiological sanity check: only count realistic menstrual cycles (15 to 90 days)
    if (diffDays >= 15 && diffDays <= 90) {
      intervals.push(diffDays);
    }
  }

  if (intervals.length === 0) {
    return {
      averageCycleLength: fallback,
      averagePeriodDuration,
      cycleCount: 0,
      variationDays: 0,
      confidence: 'insufficient_data',
      explanation: `Need at least 2 recorded period start dates to calculate your personalized average cycle length. Currently using your baseline of ${fallback} days and ${fallbackPeriod}-day period duration.`,
      isIrregular: false,
      historyIntervals: []
    };
  }

  const sum = intervals.reduce((acc, v) => acc + v, 0);
  const avg = Math.round(sum / intervals.length);
  const clampedAvg = Math.max(20, Math.min(50, avg));
  const maxInt = Math.max(...intervals);
  const minInt = Math.min(...intervals);
  const variation = maxInt - minInt;
  const isIrregular = variation >= 7;

  const confidence: 'learning' | 'established' = intervals.length >= 3 ? 'established' : 'learning';
  const explanation = intervals.length >= 3
    ? `Lumina calculated your average cycle length as ${clampedAvg} days (${averagePeriodDuration}-day period duration) from ${intervals.length} recorded cycles.${isIrregular ? ' (Irregular variation detected: cycles vary between ' + minInt + ' and ' + maxInt + ' days).' : ''} Predictions adapt automatically as you log new periods.`
    : `Lumina is learning your cycle rhythm (${intervals.length} recorded cycle interval, average ${clampedAvg} days, ${averagePeriodDuration}-day duration). Add more periods to refine prediction accuracy.`;

  return {
    averageCycleLength: clampedAvg,
    averagePeriodDuration,
    cycleCount: intervals.length,
    variationDays: variation,
    confidence,
    explanation,
    isIrregular,
    historyIntervals: intervals
  };
}

/**
 * Cleanly applies a period duration change (e.g. from 5 to 4 or 4 to 5 days).
 * Immediately adjusts affected period end dates, cleans up periodDates, and recalculates cycle state.
 */
export function applyPeriodDurationChange(user: User, newPeriodLength: number): User {
  const periodLen = Math.max(1, Math.min(15, newPeriodLength));
  const oldPeriodLen = user.periodLength || 5;

  let updatedPeriods = [...(user.periods || [])];

  if (updatedPeriods.length > 0) {
    updatedPeriods = updatedPeriods.map((p, index) => {
      const s = parseYMDToLocalDate(p.startDate);
      const e = parseYMDToLocalDate(p.endDate || p.startDate);
      const currentDur = Math.round((e.getTime() - s.getTime()) / 86400000) + 1;

      // If the duration matched the previous global period length, or was 4 or 5, or is the most recent period:
      // adjust endDate to match the new duration
      if (currentDur === oldPeriodLen || currentDur === 5 || currentDur === 4 || index === 0) {
        const newEnd = new Date(s.getTime() + (periodLen - 1) * 86400000);
        return {
          ...p,
          endDate: newEnd.toDateString()
        };
      }
      return p;
    });
  } else if (user.lastPeriodStart) {
    const s = parseYMDToLocalDate(user.lastPeriodStart);
    const newEnd = new Date(s.getTime() + (periodLen - 1) * 86400000);
    updatedPeriods = [{
      id: Math.random().toString(36).substr(2, 9),
      startDate: s.toDateString(),
      endDate: newEnd.toDateString(),
      intensity: 'medium'
    }];
  }

  // Reconstruct periodDates strictly from updated periods (clears any orphaned 5th day!)
  const reconstructed = reconstructCycleData(updatedPeriods, [], []);

  return {
    ...user,
    periodLength: periodLen,
    periods: reconstructed.periods,
    periodDates: reconstructed.periodDates,
    periodLogs: reconstructed.periodLogs,
    lastPeriodStart: reconstructed.lastPeriodStart || user.lastPeriodStart
  };
}

/**
 * Updates manual cycle length and keeps previousCycleLength for trend tracking.
 */
export function applyCycleLengthChange(user: User, newCycleLength: number): User {
  const cycleLen = Math.max(15, Math.min(60, newCycleLength));
  const prevVal = user.cycleLength || 28;
  return {
    ...user,
    previousCycleLength: user.previousCycleLength || (prevVal !== cycleLen ? prevVal : undefined),
    cycleLength: cycleLen,
    manualCycleLength: cycleLen
  };
}

/**
 * Finds the most authoritative reference period start date for a user:
 * 1. The most recent logged period in user.periods that started on or before targetDate
 * 2. user.lastPeriodStart
 * 3. Today if no history logged
 */
export function getAuthoritativePeriodStart(
  user?: Partial<User> | null,
  targetDate: Date = new Date()
): { date: Date; hasLoggedHistory: boolean } {
  if (!user) {
    return { date: toMidnight(new Date()), hasLoggedHistory: false };
  }

  const targetMidnight = toMidnight(targetDate).getTime();

  // Check user.periods array
  if (user.periods && user.periods.length > 0) {
    const validPeriods = user.periods
      .filter(p => p.startDate && !isNaN(parseYMDToLocalDate(p.startDate).getTime()))
      .map(p => ({
        ...p,
        startMidnight: parseYMDToLocalDate(p.startDate).getTime()
      }))
      .sort((a, b) => b.startMidnight - a.startMidnight);

    // Look for the latest period starting on or before targetDate
    const currentOrPastPeriod = validPeriods.find(p => p.startMidnight <= targetMidnight);
    if (currentOrPastPeriod) {
      return { date: new Date(currentOrPastPeriod.startMidnight), hasLoggedHistory: true };
    }

    if (validPeriods.length > 0) {
      return { date: new Date(validPeriods[validPeriods.length - 1].startMidnight), hasLoggedHistory: true };
    }
  }

  // Check user.lastPeriodStart
  if (user.lastPeriodStart && !isNaN(parseYMDToLocalDate(user.lastPeriodStart).getTime())) {
    return { date: parseYMDToLocalDate(user.lastPeriodStart), hasLoggedHistory: true };
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
  const isAuto = Boolean(user?.automaticCyclePrediction);
  const cycleAnalysis = analyzeCycleHistory(user?.periods || [], user?.cycleLength || 28, user?.periodLength || 5);

  // If automatic prediction is enabled and user has at least 1 recorded cycle interval, use learned average:
  const cycleLen = (isAuto && cycleAnalysis.cycleCount >= 1)
    ? cycleAnalysis.averageCycleLength
    : Math.max(15, Math.min(60, Number(user?.cycleLength) || 28));

  const periodLen = (isAuto && cycleAnalysis.cycleCount >= 1 && cycleAnalysis.averagePeriodDuration)
    ? cycleAnalysis.averagePeriodDuration
    : Math.max(1, Math.min(15, Number(user?.periodLength) || 5));

  const { date: refStart, hasLoggedHistory } = getAuthoritativePeriodStart(user, targetDate);
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

  // Fertile window: sperm survives up to 5 days, egg viability is on ovulation day
  // Preceding 5 fertile days:
  const fertileStartDay = Math.max(1, ovulationDay - 5);
  const precedingFertileEndDay = Math.max(fertileStartDay, ovulationDay - 1);
  const fertileEndDay = ovulationDay;

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
  } else if (cycleDay < ovulationDay) {
    phase = 'Follicular';
    phaseName = 'Follicular Phase';
    phaseEmoji = '🌱';
    phaseDescription = 'Rising vitality, focus, and estrogen. Excellent for creative goals and fresh habits.';
  } else if (cycleDay === ovulationDay) {
    // Exactly one single estimated ovulation day
    phase = 'Ovulatory';
    phaseName = 'Ovulatory Phase';
    phaseEmoji = '✨';
    phaseDescription = 'Peak biological glow and social radiance on your single estimated ovulation day.';
  } else {
    // Once estimated ovulation has passed, update user's current phase to luteal
    phase = 'Luteal';
    phaseName = 'Luteal Phase';
    phaseEmoji = '🌙';
    phaseDescription = 'Turning gently inward. High emotional intuition, nesting instincts, and cozy comfort.';
  }

  // Requirement 1, 2, 3: Separate fertility status evaluation
  const isPrecedingFertileDay = !isLatePeriodMode && cycleDay >= fertileStartDay && cycleDay < ovulationDay;
  const isOvulationDay = !isLatePeriodMode && cycleDay === ovulationDay;
  const isWithinFertileWindow = !isLatePeriodMode && (isPrecedingFertileDay || isOvulationDay);

  let fertilityStatus: string | null = null;
  let fertilityBadgeColor = '';

  if (isOvulationDay) {
    fertilityStatus = 'Peak Fertility • Ovulation Day (Estimated)';
    fertilityBadgeColor = 'bg-amber-100 text-amber-800 border-amber-300';
  } else if (isPrecedingFertileDay) {
    fertilityStatus = 'High Fertility • Fertile Window (Estimated)';
    fertilityBadgeColor = 'bg-sky-100 text-sky-800 border-sky-300';
  } else {
    fertilityStatus = null; // Outside estimated fertile window, do NOT display Fertile Window
  }

  // Date objects for current cycle predictions
  const completedCycleCount = diffDays >= 0 ? Math.floor(diffDays / cycleLen) : -1;
  const currentCycleStartMidnight = new Date(startMidnight.getTime() + completedCycleCount * cycleLen * 86400000);

  const estimatedOvulationDate = hasLoggedHistory
    ? new Date(currentCycleStartMidnight.getTime() + (ovulationDay - 1) * 86400000)
    : null;

  const estimatedFertileStartDate = hasLoggedHistory
    ? new Date(currentCycleStartMidnight.getTime() + (fertileStartDay - 1) * 86400000)
    : null;

  const estimatedPrecedingFertileEndDate = hasLoggedHistory
    ? new Date(currentCycleStartMidnight.getTime() + (precedingFertileEndDay - 1) * 86400000)
    : null;

  const estimatedFertileEndDate = estimatedOvulationDate;

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

  const estimatedFertileRangeFormatted = estimatedFertileStartDate && estimatedPrecedingFertileEndDate
    ? `${formatShortDate(estimatedFertileStartDate)} – ${formatShortDate(estimatedPrecedingFertileEndDate)} (Estimated)`
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
    estimatedPrecedingFertileEndDate,
    estimatedFertileRangeFormatted,
    isPrecedingFertileDay,
    isWithinFertileWindow,
    isOvulationDay,
    fertilityStatus,
    fertilityBadgeColor,
    nextExpectedPeriodDate,
    nextExpectedPeriodFormatted,
    daysUntilNextPeriod,
    referencePeriodStart: refStart,
    hasLoggedHistory,
    isEstimated: true,

    // Automatic cycle prediction status
    isAutomaticPrediction: isAuto,
    predictionExplanation: isAuto
      ? cycleAnalysis.explanation
      : `Manual mode active (${cycleLen}-day cycle, ${periodLen}-day bleeding duration).`,
    predictionConfidence: isAuto ? cycleAnalysis.confidence : 'manual',
    insufficientHistory: isAuto && cycleAnalysis.confidence === 'insufficient_data',
    cycleAnalysis
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
  let color = '#10b981'; // Soft green for follicular
  let badgeColor = 'bg-emerald-100 text-emerald-800';
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
    color = '#f43f5e';
    badgeColor = 'bg-pink-100 text-pink-700';
    hormoneInfo = 'Estrogen and progesterone are at baseline levels as the lining renews.';
    insights = 'Prioritize deep nourishment, rest, and warm comfort.';
  } else if (sync.cycleDay === sync.ovulationDay) {
    phaseKey = 'ovulatory';
    color = '#f59e0b';
    badgeColor = 'bg-amber-100 text-amber-800';
    hormoneInfo = 'Estrogen peaks, triggering an LH surge for egg release.';
    insights = 'Peak biological glow! Social charisma, confidence, and radiance are elevated.';
  } else if (sync.cycleDay > sync.ovulationDay) {
    phaseKey = 'luteal';
    color = '#a855f7'; // Lavender / purple
    badgeColor = 'bg-purple-100 text-purple-800';
    hormoneInfo = 'Progesterone dominates to nurture and support the lining.';
    insights = 'Slow down, nurture yourself, and honor your inner space and cozy comfort.';
  } else {
    phaseKey = 'follicular';
    color = '#10b981'; // Soft green
    badgeColor = 'bg-emerald-100 text-emerald-800';
    hormoneInfo = 'FSH rises as follicles mature. Estrogen climbs steadily.';
    insights = 'Energy and cognitive focus are expanding. Ideal for new beginnings!';
  }

  let fertilityKey: 'none' | 'fertile_window' | 'peak_ovulation' = 'none';
  if (sync.isOvulationDay) {
    fertilityKey = 'peak_ovulation';
  } else if (sync.isPrecedingFertileDay) {
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
    isPrecedingFertileDay: sync.isPrecedingFertileDay,
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
