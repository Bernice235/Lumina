import { User, Period, Symptom } from '../types';
import { addNotificationToUser } from './firebaseService';

export interface CompletedCycle {
  cycleIndex: number;
  cycleName: string;
  length: number;
  periodLength: number;
  startDate: string;
  nextStartDate?: string;
  formattedDate: string;
  isBaseline?: boolean;
}

export interface CycleAnalyticsSummary {
  // 2. Accurate Cycle Trend Tracking
  previousCycleLength: number;
  currentCycleLength: number;
  cycleChange: number;
  cycleChangeFormatted: string; // e.g. "+1 day", "-2 days", "0 days"
  trendDirection: 'Lengthening' | 'Shortening' | 'Stable';
  trendDirectionLabel: string;   // e.g. "Lengthening (+1 day)", "Shortening (-2 days)", "Stable (No change)"
  trendDirectionIcon: string;    // "↗", "↘", "➔"
  trendDirectionColor: string;

  // 3. Statistics Section Improvements
  averageCycleLength: number;
  averageCycleDisplay: string;   // e.g. "28.3 Days"
  averagePeriodLength: number;
  averagePeriodDisplay: string;  // e.g. "5.3 Days"

  // 4. Cycle Regularity Score
  cycleRegularity: 'Very Regular' | 'Regular' | 'Moderately Irregular' | 'Irregular';
  averageVariation: number;
  averageVariationDisplay: string; // e.g. "1.2 Days"
  regularityDescription: string;
  regularityBadgeClass: string;

  // 5. Statistics Additions
  longestCycle: number;
  shortestCycle: number;
  totalLoggedCycles: number;
  totalLoggedPeriods: number;
  averageMonthlySymptoms: string; // e.g. "4.2 / Month"
  totalSymptomsCount: number;

  // Chart data
  chartData: {
    name: string;
    cycleIndex: number;
    cycleLength: number;
    periodLength: number;
    isBaseline?: boolean;
    formattedDate: string;
  }[];

  // 6. Trend Notifications
  hasSignificantTrendAlert: boolean;
  significantTrendMessage: string;
  hasRealCompletedCycles: boolean;
}

/**
 * Format a day count to 1 decimal place if fractional, or integer if whole
 * e.g. 28.333 -> "28.3 Days", 28.0 -> "28 Days", 5.333 -> "5.3 Days"
 */
export function formatDayDisplay(days: number): string {
  if (isNaN(days) || days <= 0) return '0 Days';
  const rounded = Math.round(days * 10) / 10;
  // If user requested e.g. 28.3 Days or 5.3 Days
  const str = Number.isInteger(rounded) ? `${rounded} Days` : `${rounded.toFixed(1)} Days`;
  return str;
}

/**
 * Main cycle analytics and trend calculation engine
 */
export function getCycleAnalytics(user: User, customSymptoms?: Symptom[]): CycleAnalyticsSummary {
  const baselineCycle = user.cycleLength || 28;
  const baselinePeriod = user.periodLength || 5;

  // 1. Sort periods chronologically ascending
  const rawPeriods = [...(user.periods || [])].filter(p => p.startDate && !isNaN(new Date(p.startDate).getTime()));
  const sortedPeriods = rawPeriods.sort(
    (a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
  );

  // 2. Calculate period bleeding durations
  const loggedPeriodLengths: number[] = [];
  const periodDurationMap: Record<string, number> = {};

  sortedPeriods.forEach(p => {
    const s = new Date(p.startDate);
    const e = new Date(p.endDate || p.startDate);
    const diff = Math.round((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    const len = Math.max(1, Math.min(20, diff));
    loggedPeriodLengths.push(len);
    periodDurationMap[p.id] = len;
  });

  // 3. Compute completed cycles from consecutive periods
  const completedCycles: CompletedCycle[] = [];

  for (let i = 0; i < sortedPeriods.length - 1; i++) {
    const s1 = new Date(sortedPeriods[i].startDate);
    const s2 = new Date(sortedPeriods[i + 1].startDate);
    const cycleDays = Math.round((s2.getTime() - s1.getTime()) / (1000 * 60 * 60 * 24));
    
    // Physiologically sound cycle window (15 to 90 days)
    if (cycleDays >= 15 && cycleDays <= 90) {
      completedCycles.push({
        cycleIndex: completedCycles.length + 1,
        cycleName: `Cycle ${completedCycles.length + 1}`,
        length: cycleDays,
        periodLength: loggedPeriodLengths[i] || baselinePeriod,
        startDate: sortedPeriods[i].startDate,
        nextStartDate: sortedPeriods[i + 1].startDate,
        formattedDate: s1.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        isBaseline: false
      });
    }
  }

  const hasRealCompletedCycles = completedCycles.length > 0;
  const totalLoggedCycles = completedCycles.length;

  // 4. Determine Previous Cycle Length, Current Cycle Length, and Change
  let currentCycleLength = baselineCycle;
  let previousCycleLength = baselineCycle;

  if (completedCycles.length >= 2) {
    currentCycleLength = completedCycles[completedCycles.length - 1].length;
    previousCycleLength = completedCycles[completedCycles.length - 2].length;
  } else if (completedCycles.length === 1) {
    currentCycleLength = completedCycles[0].length;
    previousCycleLength = user.previousCycleLength || baselineCycle;
  } else {
    currentCycleLength = user.cycleLength || 28;
    previousCycleLength = user.previousCycleLength || user.cycleLength || 28;
  }

  const cycleChange = currentCycleLength - previousCycleLength;
  const cycleChangeFormatted = cycleChange > 0 
    ? `+${cycleChange} ${cycleChange === 1 ? 'day' : 'days'}`
    : cycleChange < 0
    ? `${cycleChange} ${Math.abs(cycleChange) === 1 ? 'day' : 'days'}`
    : `0 days`;

  // Trend direction
  let trendDirection: 'Lengthening' | 'Shortening' | 'Stable' = 'Stable';
  let trendDirectionLabel = 'Stable (No change)';
  let trendDirectionIcon = '➔';
  let trendDirectionColor = 'text-pink-600 bg-pink-50 border-pink-200';

  if (cycleChange > 0) {
    trendDirection = 'Lengthening';
    trendDirectionLabel = `Lengthening (+${cycleChange} ${cycleChange === 1 ? 'day' : 'days'})`;
    trendDirectionIcon = '↗';
    trendDirectionColor = 'text-amber-700 bg-amber-50 border-amber-200';
  } else if (cycleChange < 0) {
    trendDirection = 'Shortening';
    trendDirectionLabel = `Shortening (${cycleChange} ${Math.abs(cycleChange) === 1 ? 'day' : 'days'})`;
    trendDirectionIcon = '↘';
    trendDirectionColor = 'text-indigo-700 bg-indigo-50 border-indigo-200';
  }

  // 5. Average Cycle Length (using actual completed cycles)
  let avgCycleLengthNum = baselineCycle;
  if (completedCycles.length > 0) {
    const sumCycles = completedCycles.reduce((acc, c) => acc + c.length, 0);
    avgCycleLengthNum = sumCycles / completedCycles.length;
  }
  const averageCycleDisplay = formatDayDisplay(avgCycleLengthNum);

  // 6. Average Period Length (using actual logged periods)
  let avgPeriodLengthNum = baselinePeriod;
  if (loggedPeriodLengths.length > 0) {
    const sumPeriods = loggedPeriodLengths.reduce((acc, l) => acc + l, 0);
    avgPeriodLengthNum = sumPeriods / loggedPeriodLengths.length;
  }
  const averagePeriodDisplay = formatDayDisplay(avgPeriodLengthNum);

  // 7. Longest & Shortest Cycle
  const allCycleValues = completedCycles.length > 0 
    ? completedCycles.map(c => c.length) 
    : [currentCycleLength];
  const longestCycle = Math.max(...allCycleValues);
  const shortestCycle = Math.min(...allCycleValues);

  // 8. Cycle Regularity Score & Average Variation
  // Thresholds:
  // Very Regular: Variation 0–1 day (<= 1.4)
  // Regular: Variation 2–3 days (1.5 - 3.4)
  // Moderately Irregular: Variation 4–7 days (3.5 - 7.4)
  // Irregular: Variation 8+ days (>= 7.5)
  let avgVariation = 0;
  if (completedCycles.length >= 2) {
    const totalDiff = completedCycles.reduce((acc, c) => acc + Math.abs(c.length - avgCycleLengthNum), 0);
    avgVariation = totalDiff / completedCycles.length;
  } else if (completedCycles.length === 1 && user.previousCycleLength && user.previousCycleLength !== completedCycles[0].length) {
    avgVariation = Math.abs(completedCycles[0].length - user.previousCycleLength);
  } else if (user.previousCycleLength && user.cycleLength && user.previousCycleLength !== user.cycleLength) {
    avgVariation = Math.abs(user.cycleLength - user.previousCycleLength);
  }

  let cycleRegularity: 'Very Regular' | 'Regular' | 'Moderately Irregular' | 'Irregular' = 'Regular';
  let regularityDescription = 'Healthy and consistent monthly rhythm.';
  let regularityBadgeClass = 'text-teal-700 bg-teal-50 border-teal-200';

  if (avgVariation <= 1.4) {
    cycleRegularity = 'Very Regular';
    regularityDescription = 'Minimal variation between cycles (0–1 day).';
    regularityBadgeClass = 'text-emerald-700 bg-emerald-50 border-emerald-200';
  } else if (avgVariation <= 3.4) {
    cycleRegularity = 'Regular';
    regularityDescription = 'Standard, predictable biological variation (2–3 days).';
    regularityBadgeClass = 'text-teal-700 bg-teal-50 border-teal-200';
  } else if (avgVariation <= 7.4) {
    cycleRegularity = 'Moderately Irregular';
    regularityDescription = 'Moderate fluctuation observed between cycles (4–7 days).';
    regularityBadgeClass = 'text-amber-700 bg-amber-50 border-amber-200';
  } else {
    cycleRegularity = 'Irregular';
    regularityDescription = 'Significant cycle length shifts detected (8+ days).';
    regularityBadgeClass = 'text-rose-700 bg-rose-50 border-rose-200';
  }

  const averageVariationDisplay = `${(Math.round(avgVariation * 10) / 10).toFixed(1)} Days`;

  // 9. Average Monthly Symptoms
  const symptomsList = customSymptoms || user.symptoms || [];
  const totalSymptomsCount = symptomsList.length;

  let monthsTracked = 1;
  if (sortedPeriods.length >= 2) {
    const firstDate = new Date(sortedPeriods[0].startDate).getTime();
    const lastDate = new Date(sortedPeriods[sortedPeriods.length - 1].startDate).getTime();
    const monthDiff = Math.max(1, Math.round((lastDate - firstDate) / (1000 * 60 * 60 * 24 * 30.4)));
    monthsTracked = monthDiff;
  }
  const avgMonthlySymptomsNum = Math.round((totalSymptomsCount / monthsTracked) * 10) / 10;
  const averageMonthlySymptoms = `${avgMonthlySymptomsNum} / Month`;

  // 10. Chart Data
  // If user has completed cycles, chart them chronologically!
  // If fewer than 2 completed cycles, show an elegant baseline reflecting current cycleLength and change.
  let chartData: CycleAnalyticsSummary['chartData'] = [];

  if (completedCycles.length > 0) {
    chartData = completedCycles.map(c => ({
      name: c.cycleName,
      cycleIndex: c.cycleIndex,
      cycleLength: c.length,
      periodLength: c.periodLength,
      isBaseline: false,
      formattedDate: c.formattedDate
    }));
  } else {
    // Generate baseline chart reflecting the user's cycle length and recent changes
    const prev = previousCycleLength;
    const curr = currentCycleLength;
    chartData = [
      { name: 'Cycle 1', cycleIndex: 1, cycleLength: prev, periodLength: baselinePeriod, isBaseline: true, formattedDate: 'Baseline 1' },
      { name: 'Cycle 2', cycleIndex: 2, cycleLength: prev, periodLength: baselinePeriod, isBaseline: true, formattedDate: 'Baseline 2' },
      { name: 'Current Cycle', cycleIndex: 3, cycleLength: curr, periodLength: baselinePeriod, isBaseline: false, formattedDate: 'Current' }
    ];
  }

  // 11. Trend Notifications
  // "When a significant cycle change occurs (e.g. 28 days -> 35 days)
  // Notify user: 'We’ve noticed your cycle length has changed significantly over the last few months. Consider discussing this with a healthcare professional if the change continues.'
  // Only show after repeated changes, not after one unusual cycle."
  let hasSignificantTrendAlert = false;
  const significantTrendMessage = "We’ve noticed your cycle length has changed significantly over the last few months. Consider discussing this with a healthcare professional if the change continues.";

  if (completedCycles.length >= 2) {
    const lengths = completedCycles.map(c => c.length);
    const n = lengths.length;

    // Determine baseline from early cycles or user baseline
    let baseline = baselineCycle;
    if (n >= 4) {
      const earlier = lengths.slice(0, n - 2);
      baseline = earlier.reduce((a, b) => a + b, 0) / earlier.length;
    }

    const last1 = lengths[n - 1];
    const last2 = lengths[n - 2];

    // Check if repeated consecutive cycles (at least 2) show significant shift (>= 5-6 days) in the same direction
    const bothLengthened = (last1 - baseline >= 5) && (last2 - baseline >= 5);
    const bothShortened = (baseline - last1 >= 5) && (baseline - last2 >= 5);
    const repeatedLargeShift = Math.abs(last1 - baseline) >= 6 && Math.abs(last2 - baseline) >= 6;

    if (bothLengthened || bothShortened || repeatedLargeShift) {
      hasSignificantTrendAlert = true;
    }
  }

  return {
    previousCycleLength,
    currentCycleLength,
    cycleChange,
    cycleChangeFormatted,
    trendDirection,
    trendDirectionLabel,
    trendDirectionIcon,
    trendDirectionColor,

    averageCycleLength: Math.round(avgCycleLengthNum * 10) / 10,
    averageCycleDisplay,
    averagePeriodLength: Math.round(avgPeriodLengthNum * 10) / 10,
    averagePeriodDisplay,

    cycleRegularity,
    averageVariation: Math.round(avgVariation * 10) / 10,
    averageVariationDisplay,
    regularityDescription,
    regularityBadgeClass,

    longestCycle,
    shortestCycle,
    totalLoggedCycles,
    totalLoggedPeriods: loggedPeriodLengths.length,
    averageMonthlySymptoms,
    totalSymptomsCount,

    chartData,
    hasSignificantTrendAlert,
    significantTrendMessage,
    hasRealCompletedCycles
  };
}

/**
 * Checks and dispatches trend notification to user's notifications if repeated significant change is detected
 */
export async function checkAndDispatchTrendNotification(
  user: User, 
  setUser?: (u: User | null | ((prev: User | null) => User | null)) => void
): Promise<boolean> {
  const analytics = getCycleAnalytics(user);
  if (!analytics.hasSignificantTrendAlert) {
    return false;
  }

  const existingNotifs = user.notifications || [];
  const alreadyNotified = existingNotifs.some(n => 
    n.body.includes('changed significantly over the last few months') ||
    n.title.includes('Significant Cycle Change')
  );

  if (alreadyNotified) {
    return true;
  }

  try {
    await addNotificationToUser(user.id, {
      title: 'Significant Cycle Change Noticed',
      body: analytics.significantTrendMessage,
      emoji: '🩺',
      category: 'cycle'
    });

    if (setUser) {
      const newNotif = {
        id: `trend_alert_${Date.now()}`,
        title: 'Significant Cycle Change Noticed',
        body: analytics.significantTrendMessage,
        emoji: '🩺',
        timestamp: new Date().toISOString(),
        isRead: false,
        category: 'cycle' as const
      };
      setUser(prev => prev ? {
        ...prev,
        notifications: [newNotif, ...(prev.notifications || [])]
      } : null);
    }
    return true;
  } catch (err) {
    console.warn('[Trend Notification] Failed to dispatch notification:', err);
    return false;
  }
}
