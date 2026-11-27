import React, { useState, useMemo, useEffect } from 'react';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  BarChart, 
  Bar, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  Cell,
  ReferenceLine
} from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  TrendingUp, 
  Activity, 
  Thermometer, 
  Sparkles, 
  Info,
  ChevronRight,
  ChevronDown,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Calendar,
  X,
  Layers,
  Droplet,
  Smile,
  ShieldCheck
} from 'lucide-react';
import { User, Symptom } from '../types';
import { 
  getCycleAnalytics, 
  checkAndDispatchTrendNotification,
  formatDayDisplay,
  CompletedCycle
} from '../services/cycleAnalyticsService';

interface CycleGraphProps {
  user: User;
  setUser?: React.Dispatch<React.SetStateAction<User | null>> | ((u: any) => void);
  symptoms?: Symptom[];
}

type ComparisonRange = '3' | '6' | '12' | 'all';

export const CycleGraph: React.FC<CycleGraphProps> = ({ user, setUser, symptoms }) => {
  const [chartType, setChartType] = useState<'bar' | 'line'>('bar');
  const [comparisonRange, setComparisonRange] = useState<ComparisonRange>('3');
  const [comparisonChartType, setComparisonChartType] = useState<'cycle-length' | 'period-length'>('cycle-length');
  const [isAdvancedInsightsOpen, setIsAdvancedInsightsOpen] = useState(false);
  const [advancedTab, setAdvancedTab] = useState<'symptoms' | 'temperature'>('symptoms');
  const [isAlertDismissed, setIsAlertDismissed] = useState<boolean>(() => {
    try {
      return localStorage.getItem(`lumina_dismiss_trend_alert_${user?.id || 'default'}`) === 'true';
    } catch {
      return false;
    }
  });

  // Deep dynamic bio-aware analytics from central service
  const analytics = useMemo(() => {
    return getCycleAnalytics(user, symptoms);
  }, [user, symptoms]);

  // Dispatch trend notification to user notifications list if repeated changes occur
  useEffect(() => {
    if (analytics.hasSignificantTrendAlert) {
      checkAndDispatchTrendNotification(user, setUser);
    }
  }, [analytics.hasSignificantTrendAlert, user, setUser]);

  const handleDismissAlert = () => {
    setIsAlertDismissed(true);
    try {
      localStorage.setItem(`lumina_dismiss_trend_alert_${user?.id || 'default'}`, 'true');
    } catch {
      // ignore
    }
  };

  // Symptoms frequency data
  const symptomData = useMemo(() => {
    const symList = symptoms || user.symptoms || [];
    if (symList.length === 0) {
      return [
        { symptom: 'Cramps', count: 0 },
        { symptom: 'Headache', count: 0 },
        { symptom: 'Bloating', count: 0 },
        { symptom: 'Fatigue', count: 0 },
        { symptom: 'Moody', count: 0 }
      ];
    }

    const counts: Record<string, number> = {};
    symList.forEach(s => {
      const label = s.type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
      counts[label] = (counts[label] || 0) + 1;
    });

    return Object.entries(counts)
      .map(([symptom, count]) => ({ symptom, count }))
      .sort((a, b) => b.count - a.count);
  }, [symptoms, user.symptoms]);

  // Basal Body Temperature Logs
  const temperatureData = useMemo(() => {
    const logs = [...(user.tempLogs || [])].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    if (logs.length === 0) {
      return Array.from({ length: 15 }).map((_, i) => {
        const val = 36.4 + Math.sin(i * 0.4) * 0.4 + (i > 7 ? 0.35 : 0);
        return {
          date: `Day ${i + 1}`,
          temperature: parseFloat(val.toFixed(2))
        };
      });
    }

    return logs.map(log => ({
      date: new Date(log.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      temperature: log.value
    }));
  }, [user.tempLogs]);

  // =========================================================================
  // SECTION E: CYCLE COMPARISON COMPUTATIONS
  // =========================================================================
  const comparisonData = useMemo(() => {
    const cycles = analytics.completedCycles || [];
    const baselineCycle = user.cycleLength || 28;
    const baselinePeriod = user.periodLength || 5;

    // Filter cycles according to comparison range
    let selectedCycles: CompletedCycle[] = [];
    if (cycles.length > 0) {
      if (comparisonRange === '3') {
        selectedCycles = cycles.slice(-3);
      } else if (comparisonRange === '6') {
        selectedCycles = cycles.slice(-6);
      } else if (comparisonRange === '12') {
        selectedCycles = cycles.slice(-12);
      } else {
        selectedCycles = [...cycles];
      }
    }

    const hasSufficientHistory = selectedCycles.length >= 2;
    const count = selectedCycles.length;

    // Compute cohort statistics
    const cycleLengths = selectedCycles.map(c => c.length);
    const periodLengths = selectedCycles.map(c => c.periodLength);

    const cohortAvgCycle = count > 0 
      ? Math.round((cycleLengths.reduce((a, b) => a + b, 0) / count) * 10) / 10
      : baselineCycle;
    
    const cohortAvgPeriod = count > 0
      ? Math.round((periodLengths.reduce((a, b) => a + b, 0) / count) * 10) / 10
      : baselinePeriod;

    // Cohort variation
    let cohortVariation = 0;
    if (count >= 2) {
      const mean = cohortAvgCycle;
      const totalDev = cycleLengths.reduce((acc, len) => acc + Math.abs(len - mean), 0);
      cohortVariation = Math.round((totalDev / count) * 10) / 10;
    }

    // Regularity classification
    let cohortRegularity: 'Very Regular' | 'Regular' | 'Moderately Irregular' | 'Irregular' = 'Regular';
    if (cohortVariation <= 1.5) cohortRegularity = 'Very Regular';
    else if (cohortVariation <= 3.5) cohortRegularity = 'Regular';
    else if (cohortVariation <= 6) cohortRegularity = 'Moderately Irregular';
    else cohortRegularity = 'Irregular';

    // Difference from overall user average
    const diffFromOverall = Math.round((cohortAvgCycle - analytics.averageCycleLength) * 10) / 10;

    // Flow intensity breakdown across selected periods
    const periodsList = user.periods || [];
    const flowCounts = { spotting: 0, light: 0, medium: 0, heavy: 0 };
    periodsList.slice(-Math.max(count, 3)).forEach(p => {
      if (p.intensity && flowCounts[p.intensity] !== undefined) {
        flowCounts[p.intensity]++;
      } else {
        flowCounts.medium++;
      }
    });

    // Top symptoms logged
    const topSymptoms = symptomData.slice(0, 3);

    // Moods logged
    const moodLogs = user.moodLogs || [];
    const moodCounts: Record<string, number> = {};
    moodLogs.forEach(m => {
      moodCounts[m.mood] = (moodCounts[m.mood] || 0) + 1;
    });
    const topMoods = Object.entries(moodCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([m, cnt]) => ({
        mood: m.charAt(0).toUpperCase() + m.slice(1),
        count: cnt
      }));

    // Chart dataset for comparison
    const chartList = selectedCycles.length > 0 ? selectedCycles.map((c, idx) => ({
      name: c.cycleName,
      cycleIndex: c.cycleIndex,
      cycleLength: c.length,
      periodLength: c.periodLength,
      diffFromAvg: Math.round((c.length - cohortAvgCycle) * 10) / 10,
      formattedDate: c.formattedDate
    })) : [
      { name: 'Cycle 1', cycleIndex: 1, cycleLength: baselineCycle, periodLength: baselinePeriod, diffFromAvg: 0, formattedDate: 'Baseline 1' },
      { name: 'Cycle 2', cycleIndex: 2, cycleLength: baselineCycle, periodLength: baselinePeriod, diffFromAvg: 0, formattedDate: 'Baseline 2' },
      { name: 'Cycle 3', cycleIndex: 3, cycleLength: baselineCycle, periodLength: baselinePeriod, diffFromAvg: 0, formattedDate: 'Baseline 3' },
    ];

    // Natural Language Personalized Insights Generation
    let narrativeInsight = '';
    if (selectedCycles.length >= 2) {
      const firstCycle = selectedCycles[0].length;
      const lastCycle = selectedCycles[selectedCycles.length - 1].length;
      const netShift = lastCycle - firstCycle;

      if (Math.abs(netShift) === 0) {
        narrativeInsight = `Across your ${comparisonRange === 'all' ? 'recorded cycles' : `last ${count} cycles`}, your cycle length has remained remarkably consistent at an average of ${cohortAvgCycle} days. Your bleeding duration averaged ${cohortAvgPeriod} days, reflecting stable hormonal and follicular rhythms.`;
      } else if (netShift > 0) {
        narrativeInsight = `Over your ${comparisonRange === 'all' ? 'recorded cycles' : `last ${count} cycles`}, your cycle length showed a lengthening pattern, shifting by +${netShift} days (from ${firstCycle} to ${lastCycle} days), with an overall cohort average of ${cohortAvgCycle} days. Your period duration averaged ${cohortAvgPeriod} days.`;
      } else {
        narrativeInsight = `Over your ${comparisonRange === 'all' ? 'recorded cycles' : `last ${count} cycles`}, your cycle length has slightly shortened by ${Math.abs(netShift)} days (from ${firstCycle} to ${lastCycle} days), holding an average of ${cohortAvgCycle} days. Your bleeding duration remained consistent at ${cohortAvgPeriod} days.`;
      }

      if (topSymptoms.length > 0 && topSymptoms[0].count > 0) {
        narrativeInsight += ` ${topSymptoms[0].symptom} was your most frequently logged symptom during this timeframe.`;
      }
    } else {
      narrativeInsight = `Lumina is currently tracking your baseline cycle of ${baselineCycle} days with a ${baselinePeriod}-day period duration. As you log more consecutive cycles in Lumina, this comparison panel will automatically generate deep historical comparative analytics.`;
    }

    return {
      selectedCycles,
      hasSufficientHistory,
      count,
      cohortAvgCycle,
      cohortAvgPeriod,
      cohortVariation,
      cohortRegularity,
      diffFromOverall,
      flowCounts,
      topSymptoms,
      topMoods,
      chartList,
      narrativeInsight
    };
  }, [analytics, comparisonRange, user.cycleLength, user.periodLength, user.periods, user.moodLogs, symptomData]);

  const barColors = ['#f472b6', '#f43f5e', '#fda4af', '#fbcfe8', '#db2777', '#f472b6'];

  return (
    <div className="space-y-6 select-none animate-fadeIn text-left font-sans">
      
      {/* Clinical Trend Notice (if repeated significant shifts occur) */}
      {analytics.hasSignificantTrendAlert && !isAlertDismissed && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 p-5 rounded-2xl shadow-xs relative overflow-hidden"
        >
          <div className="flex items-start gap-4">
            <div className="w-11 h-11 bg-amber-600 text-white rounded-xl flex items-center justify-center text-xl shrink-0 shadow-xs">
              🩺
            </div>
            <div className="flex-1 pr-6 space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[11px] font-semibold text-amber-800 dark:text-amber-300 bg-amber-200/70 dark:bg-amber-900/50 px-2.5 py-0.5 rounded-lg">
                  Clinical trend notice
                </span>
                <span className="text-xs text-amber-800 dark:text-amber-300 font-semibold">Repeated shifts detected</span>
              </div>
              <p className="text-sm font-serif text-amber-950 dark:text-amber-100 font-semibold leading-relaxed">
                "{analytics.significantTrendMessage}"
              </p>
              <p className="text-xs text-amber-800/90 dark:text-amber-200/80 leading-relaxed">
                Lumina detected repeated shifts (6+ days) over consecutive cycles. Monitoring patterns with a healthcare provider helps optimize reproductive well-being.
              </p>
            </div>
            <button
              onClick={handleDismissAlert}
              className="w-8 h-8 rounded-xl bg-amber-100 dark:bg-amber-900/40 hover:bg-amber-200 dark:hover:bg-amber-900/70 text-amber-800 dark:text-amber-300 flex items-center justify-center transition-colors cursor-pointer shrink-0"
              title="Dismiss notification"
              aria-label="Dismiss clinical trend notice"
            >
              <X size={15} />
            </button>
          </div>
        </motion.div>
      )}

      {/* ========================================================================= */}
      {/* SECTION A: CYCLE OVERVIEW (4 PRIMARY METRIC CARDS)                       */}
      {/* ========================================================================= */}
      <section className="space-y-3.5">
        <div className="flex flex-wrap items-center justify-between gap-2 px-1">
          <div>
            <h3 className="text-sm font-semibold text-pink-600 dark:text-pink-400 flex items-center gap-1.5">
              <span>🌸</span> Cycle overview
            </h3>
            <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
              Computed from completed cycle logs and biological telemetry.
            </p>
          </div>
          <span className="text-xs font-semibold text-pink-700 dark:text-pink-300 bg-pink-50 dark:bg-pink-950/40 border border-pink-200/70 dark:border-pink-800/60 px-3 py-1 rounded-xl tabular-nums whitespace-nowrap shrink-0">
            {analytics.totalLoggedCycles} {analytics.totalLoggedCycles === 1 ? 'cycle logged' : 'cycles logged'}
          </span>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          
          {/* Card 1: Average Cycle Length */}
          <div className="bg-white dark:bg-[#1a1816] border border-stone-200/80 dark:border-[#2e2a26] p-4 sm:p-5 rounded-2xl shadow-xs flex flex-col justify-between hover:border-pink-300 dark:hover:border-pink-800/70 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-pink-600 dark:text-pink-400">
                Average cycle length
              </span>
              <span className="text-base" aria-hidden="true">🔄</span>
            </div>
            <div className="my-2.5">
              <h4 className="text-2xl sm:text-3xl font-serif font-bold text-stone-900 dark:text-stone-100 tracking-tight tabular-nums">
                {analytics.averageCycleDisplay}
              </h4>
            </div>
            <p className="text-[11px] text-stone-500 dark:text-stone-400">
              {analytics.hasRealCompletedCycles ? 'Based on completed cycles' : 'Configured user baseline'}
            </p>
          </div>

          {/* Card 2: Average Period Length */}
          <div className="bg-white dark:bg-[#1a1816] border border-stone-200/80 dark:border-[#2e2a26] p-4 sm:p-5 rounded-2xl shadow-xs flex flex-col justify-between hover:border-pink-300 dark:hover:border-pink-800/70 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-rose-600 dark:text-rose-400">
                Average period length
              </span>
              <span className="text-base" aria-hidden="true">🩸</span>
            </div>
            <div className="my-2.5">
              <h4 className="text-2xl sm:text-3xl font-serif font-bold text-rose-700 dark:text-rose-300 tracking-tight tabular-nums">
                {analytics.averagePeriodDisplay}
              </h4>
            </div>
            <p className="text-[11px] text-stone-500 dark:text-stone-400">
              Bleeding duration per period
            </p>
          </div>

          {/* Card 3: Cycle Regularity */}
          <div className="bg-white dark:bg-[#1a1816] border border-stone-200/80 dark:border-[#2e2a26] p-4 sm:p-5 rounded-2xl shadow-xs flex flex-col justify-between hover:border-pink-300 dark:hover:border-pink-800/70 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-teal-700 dark:text-teal-400">
                Cycle regularity
              </span>
              <span className="text-base" aria-hidden="true">✨</span>
            </div>
            <div className="my-2.5 space-y-1.5">
              <h4 className="text-xl sm:text-2xl font-serif font-bold text-stone-900 dark:text-stone-100 leading-tight">
                {analytics.cycleRegularity}
              </h4>
              <span className={`inline-block text-[11px] font-semibold px-2.5 py-0.5 rounded-lg border ${analytics.regularityBadgeClass}`}>
                {analytics.cycleRegularity}
              </span>
            </div>
            <p className="text-[11px] text-stone-500 dark:text-stone-400 leading-snug">
              {analytics.regularityDescription}
            </p>
          </div>

          {/* Card 4: Average Cycle Variation */}
          <div className="bg-white dark:bg-[#1a1816] border border-stone-200/80 dark:border-[#2e2a26] p-4 sm:p-5 rounded-2xl shadow-xs flex flex-col justify-between hover:border-pink-300 dark:hover:border-pink-800/70 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-purple-600 dark:text-purple-400">
                Cycle variation
              </span>
              <span className="text-base" aria-hidden="true">📊</span>
            </div>
            <div className="my-2.5">
              <h4 className="text-2xl sm:text-3xl font-serif font-bold text-purple-900 dark:text-purple-200 tracking-tight tabular-nums">
                {analytics.averageVariationDisplay}
              </h4>
            </div>
            <p className="text-[11px] text-stone-500 dark:text-stone-400">
              Mean absolute deviation across cycles
            </p>
          </div>

        </div>
      </section>

      {/* ========================================================================= */}
      {/* SECTION B: CYCLE TREND (HISTORICAL GRAPH & PREV VS CURRENT DELTA)        */}
      {/* ========================================================================= */}
      <section className="bg-gradient-to-br from-pink-600 via-rose-500 to-pink-600 rounded-2xl p-6 sm:p-8 text-white shadow-md relative overflow-hidden">
        <div className="relative z-10 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/20 pb-4">
            <div>
              <span className="text-xs font-semibold text-pink-100 flex items-center gap-1.5">
                <Activity size={14} />
                <span>Cycle trend analysis</span>
              </span>
              <h3 className="text-2xl font-serif font-bold text-white tracking-tight mt-1">
                Previous vs. Current Cycle Trend
              </h3>
            </div>
            
            <div className="flex items-center gap-2">
              <span className="px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 bg-white/15 text-white border border-white/25 whitespace-nowrap shrink-0">
                <span>{analytics.trendDirectionIcon}</span>
                <span>{analytics.trendDirectionLabel}</span>
              </span>
            </div>
          </div>

          {/* Previous vs Current Cycle Length & Change Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-1">
            {/* Previous Cycle Length */}
            <div className="bg-white/15 border border-white/20 rounded-xl p-4 space-y-1">
              <span className="text-xs font-semibold text-pink-100 block">
                Previous cycle length
              </span>
              <div className="flex items-baseline gap-1.5 tabular-nums">
                <span className="text-3xl font-serif font-bold tracking-tight text-white">
                  {analytics.previousCycleLength}
                </span>
                <span className="text-xs font-sans font-semibold text-pink-100">days</span>
              </div>
              <p className="text-[11px] text-pink-100/90">
                {analytics.totalLoggedCycles >= 2 
                  ? `Cycle ${analytics.totalLoggedCycles - 1} length`
                  : 'Configured reference baseline'}
              </p>
            </div>

            {/* Current Cycle Length */}
            <div className="bg-white/20 border border-white/35 rounded-xl p-4 space-y-1 shadow-xs">
              <span className="text-xs font-semibold text-pink-50 block">
                Current cycle length
              </span>
              <div className="flex items-baseline gap-1.5 tabular-nums">
                <span className="text-3xl font-serif font-bold tracking-tight text-white">
                  {analytics.currentCycleLength}
                </span>
                <span className="text-xs font-sans font-semibold text-pink-100">days</span>
              </div>
              <p className="text-[11px] text-pink-50/90">
                {analytics.totalLoggedCycles >= 1 
                  ? `Cycle ${analytics.totalLoggedCycles} length`
                  : 'Current configured cycle length'}
              </p>
            </div>

            {/* Change / Difference */}
            <div className="bg-white/15 border border-white/20 rounded-xl p-4 space-y-1">
              <span className="text-xs font-semibold text-pink-100 block">
                Change from previous
              </span>
              <div className="flex items-baseline gap-1.5 tabular-nums">
                <span className="text-3xl font-serif font-bold tracking-tight text-white">
                  {analytics.cycleChangeFormatted}
                </span>
              </div>
              <p className="text-[11px] text-pink-100/90">
                {analytics.cycleChange > 0 
                  ? 'Lengthened from previous cycle'
                  : analytics.cycleChange < 0
                  ? 'Shortened from previous cycle'
                  : 'Identical duration to previous cycle'}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* SECTION C: REGULARITY ANALYSIS (SHORTEST, LONGEST, VARIATION & TIER)     */}
      {/* ========================================================================= */}
      <section className="bg-white dark:bg-[#1a1816] p-6 sm:p-7 rounded-2xl border border-stone-200/80 dark:border-[#2e2a26] shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-100 dark:border-[#2e2a26] pb-3.5">
          <div>
            <span className="text-xs font-semibold text-pink-600 dark:text-pink-400">
              Clinical regularity analysis
            </span>
            <h4 className="text-lg font-serif font-bold text-stone-900 dark:text-stone-100 mt-0.5">
              Cycle Regularity Classification & Boundary Range
            </h4>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-teal-50 dark:bg-teal-950/40 border border-teal-200/70 dark:border-teal-800/60 text-teal-800 dark:text-teal-300 text-xs font-semibold whitespace-nowrap shrink-0">
            <ShieldCheck size={14} />
            <span>{analytics.cycleRegularity}</span>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          <div className="p-4 rounded-xl bg-[#faf8f6] dark:bg-[#23201d] border border-stone-200/70 dark:border-[#342f2b] space-y-1">
            <span className="text-xs font-semibold text-stone-500 dark:text-stone-400 block">Shortest cycle</span>
            <p className="text-2xl font-serif font-bold text-pink-600 dark:text-pink-400 tabular-nums">
              {analytics.shortestCycle} <span className="text-xs font-sans font-medium text-stone-500 dark:text-stone-400">days</span>
            </p>
            <p className="text-[11px] text-stone-500 dark:text-stone-400">Minimum recorded interval</p>
          </div>

          <div className="p-4 rounded-xl bg-[#faf8f6] dark:bg-[#23201d] border border-stone-200/70 dark:border-[#342f2b] space-y-1">
            <span className="text-xs font-semibold text-stone-500 dark:text-stone-400 block">Longest cycle</span>
            <p className="text-2xl font-serif font-bold text-rose-600 dark:text-rose-400 tabular-nums">
              {analytics.longestCycle} <span className="text-xs font-sans font-medium text-stone-500 dark:text-stone-400">days</span>
            </p>
            <p className="text-[11px] text-stone-500 dark:text-stone-400">Maximum recorded interval</p>
          </div>

          <div className="p-4 rounded-xl bg-[#faf8f6] dark:bg-[#23201d] border border-stone-200/70 dark:border-[#342f2b] space-y-1">
            <span className="text-xs font-semibold text-stone-500 dark:text-stone-400 block">Cycle variation</span>
            <p className="text-2xl font-serif font-bold text-purple-700 dark:text-purple-300 tabular-nums">
              {analytics.averageVariationDisplay}
            </p>
            <p className="text-[11px] text-stone-500 dark:text-stone-400">Normal benchmark is &lt; 5 days</p>
          </div>

          <div className="p-4 rounded-xl bg-[#faf8f6] dark:bg-[#23201d] border border-stone-200/70 dark:border-[#342f2b] space-y-1">
            <span className="text-xs font-semibold text-stone-500 dark:text-stone-400 block">Clinical classification</span>
            <p className="text-base font-serif font-bold text-teal-800 dark:text-teal-300 pt-1">
              {analytics.cycleRegularity}
            </p>
            <p className="text-[11px] text-stone-500 dark:text-stone-400">FIGO menstrual criteria</p>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* SECTION E: NEW CYCLE COMPARISON FEATURE                                  */}
      {/* ========================================================================= */}
      <section className="bg-white dark:bg-[#1a1816] p-6 sm:p-8 rounded-2xl border border-stone-200/80 dark:border-[#2e2a26] shadow-xs space-y-6">
        
        {/* Header & Cohort Selection Tabs */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-stone-100 dark:border-[#2e2a26] pb-5">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-lg" aria-hidden="true">📊</span>
              <span className="text-xs font-semibold text-pink-600 dark:text-pink-400">
                Cycle comparison
              </span>
            </div>
            <h3 className="text-xl sm:text-2xl font-serif font-bold text-stone-900 dark:text-stone-100">
              Comparative Cycle Analysis & Cohorts
            </h3>
            <p className="text-xs text-stone-500 dark:text-stone-400">
              Compare your cycle trends across distinct historical cohorts.
            </p>
          </div>

          {/* Cohort Selectors: Last 3, Last 6, Last 12, All */}
          <div className="flex flex-wrap items-center gap-1 p-1 bg-[#faf8f6] dark:bg-[#23201d] rounded-xl border border-stone-200/80 dark:border-[#342f2b] self-start md:self-auto">
            {[
              { id: '3', label: 'Last 3' },
              { id: '6', label: 'Last 6' },
              { id: '12', label: 'Last 12' },
              { id: 'all', label: 'All cycles' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setComparisonRange(tab.id as ComparisonRange)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                  comparisonRange === tab.id
                    ? 'bg-pink-600 text-white shadow-xs'
                    : 'text-stone-600 dark:text-stone-300 hover:text-pink-600 dark:hover:text-pink-400'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Cohort Comparative Summary Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          
          {/* Cohort Avg Cycle Length */}
          <div className="bg-[#faf8f6] dark:bg-[#23201d] p-4 rounded-xl border border-stone-200/70 dark:border-[#342f2b] space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-stone-500 dark:text-stone-400">Cohort avg cycle</span>
              <span className="text-xs" aria-hidden="true">🔄</span>
            </div>
            <p className="text-2xl font-serif font-bold text-pink-600 dark:text-pink-400 tabular-nums">
              {formatDayDisplay(comparisonData.cohortAvgCycle)}
            </p>
            <div className="flex flex-wrap items-center gap-1 text-[11px] font-semibold tabular-nums">
              <span className="text-stone-500 dark:text-stone-400">Overall:</span>
              <span className="text-stone-700 dark:text-stone-200">{analytics.averageCycleDisplay}</span>
              {comparisonData.diffFromOverall !== 0 && (
                <span className={`px-1.5 py-0.5 rounded font-semibold ${
                  comparisonData.diffFromOverall > 0
                    ? 'bg-amber-100 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300'
                    : 'bg-sky-100 dark:bg-sky-950/50 text-sky-800 dark:text-sky-300'
                }`}>
                  {comparisonData.diffFromOverall > 0 ? `+${comparisonData.diffFromOverall}d` : `${comparisonData.diffFromOverall}d`}
                </span>
              )}
            </div>
          </div>

          {/* Cohort Period Duration */}
          <div className="bg-[#faf8f6] dark:bg-[#23201d] p-4 rounded-xl border border-stone-200/70 dark:border-[#342f2b] space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-stone-500 dark:text-stone-400">Cohort period duration</span>
              <span className="text-xs" aria-hidden="true">🩸</span>
            </div>
            <p className="text-2xl font-serif font-bold text-rose-600 dark:text-rose-400 tabular-nums">
              {formatDayDisplay(comparisonData.cohortAvgPeriod)}
            </p>
            <p className="text-[11px] text-stone-500 dark:text-stone-400">
              Bleeding duration per cycle
            </p>
          </div>

          {/* Cohort Regularity */}
          <div className="bg-[#faf8f6] dark:bg-[#23201d] p-4 rounded-xl border border-stone-200/70 dark:border-[#342f2b] space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-stone-500 dark:text-stone-400">Cohort regularity</span>
              <span className="text-xs" aria-hidden="true">✨</span>
            </div>
            <p className="text-lg font-serif font-bold text-teal-800 dark:text-teal-300">
              {comparisonData.cohortRegularity}
            </p>
            <p className="text-[11px] text-teal-700 dark:text-teal-400 font-medium tabular-nums">
              Variation: ±{comparisonData.cohortVariation} days
            </p>
          </div>

          {/* Flow Distribution */}
          <div className="bg-[#faf8f6] dark:bg-[#23201d] p-4 rounded-xl border border-stone-200/70 dark:border-[#342f2b] space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-stone-500 dark:text-stone-400">Flow breakdown</span>
              <Droplet size={14} className="text-rose-500 dark:text-rose-400" />
            </div>
            <div className="grid grid-cols-2 gap-1 text-[11px] tabular-nums">
              <span className="text-stone-600 dark:text-stone-300">Med: <strong className="text-rose-600 dark:text-rose-400">{comparisonData.flowCounts.medium}</strong></span>
              <span className="text-stone-600 dark:text-stone-300">Hvy: <strong className="text-rose-700 dark:text-rose-300">{comparisonData.flowCounts.heavy}</strong></span>
              <span className="text-stone-600 dark:text-stone-300">Lgt: <strong className="text-rose-500 dark:text-rose-400">{comparisonData.flowCounts.light}</strong></span>
              <span className="text-stone-600 dark:text-stone-300">Spot: <strong className="text-rose-400 dark:text-rose-300">{comparisonData.flowCounts.spotting}</strong></span>
            </div>
          </div>

        </div>

        {/* Interactive Comparison Chart Card */}
        <div className="bg-[#faf8f6] dark:bg-[#23201d] p-5 sm:p-6 rounded-2xl border border-stone-200/80 dark:border-[#342f2b] space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-200/70 dark:border-[#342f2b] pb-3.5">
            <div>
              <h4 className="text-base font-serif font-bold text-stone-900 dark:text-stone-100">
                Cycle Progression Across Cohort ({comparisonRange === 'all' ? 'All Recorded Cycles' : `Last ${comparisonData.count} Cycles`})
              </h4>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                Compare individual cycle lengths with bleeding durations and the cohort average benchmark.
              </p>
            </div>

            <div className="flex items-center gap-1 p-1 bg-white dark:bg-[#1a1816] rounded-xl border border-stone-200/80 dark:border-[#2e2a26] self-start sm:self-auto">
              <button
                onClick={() => setComparisonChartType('cycle-length')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                  comparisonChartType === 'cycle-length'
                    ? 'bg-pink-600 text-white shadow-xs'
                    : 'text-stone-600 dark:text-stone-300 hover:text-pink-600 dark:hover:text-pink-400'
                }`}
              >
                Cycle & Period
              </button>
              <button
                onClick={() => setComparisonChartType('period-length')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                  comparisonChartType === 'period-length'
                    ? 'bg-pink-600 text-white shadow-xs'
                    : 'text-stone-600 dark:text-stone-300 hover:text-pink-600 dark:hover:text-pink-400'
                }`}
              >
                Deviation (±Days)
              </button>
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              {comparisonChartType === 'cycle-length' ? (
                <BarChart data={comparisonData.chartList} margin={{ top: 15, right: 15, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" opacity={0.45} vertical={false} />
                  <XAxis 
                    dataKey="name" 
                    tick={{ fill: '#e11d48', fontSize: 11, fontWeight: 600 }} 
                    axisLine={false} 
                    tickLine={false} 
                  />
                  <YAxis 
                    tick={{ fill: '#e11d48', fontSize: 11 }} 
                    axisLine={false} 
                    tickLine={false} 
                    domain={[0, 'dataMax + 8']}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#fff', 
                      borderRadius: '0.75rem', 
                      borderColor: '#fbcfe8',
                      color: '#1c1917',
                      boxShadow: '0 4px 12px rgba(244,114,182,0.12)' 
                    }}
                    labelStyle={{ fontWeight: 'bold', color: '#be185d', fontSize: '12px' }}
                    formatter={(val: any, name: string) => [`${val} days`, name]}
                  />
                  <Legend 
                    verticalAlign="top" 
                    height={32} 
                    wrapperStyle={{ fontSize: '11px', fontWeight: 600 }}
                  />
                  <ReferenceLine 
                    y={comparisonData.cohortAvgCycle} 
                    stroke="#db2777" 
                    strokeDasharray="4 4" 
                    label={{ 
                      value: `Cohort Avg (${comparisonData.cohortAvgCycle}d)`, 
                      fill: '#db2777', 
                      fontSize: 10, 
                      position: 'insideTopRight' 
                    }} 
                  />
                  <Bar 
                    dataKey="periodLength" 
                    name="Bleeding Duration (Days)" 
                    fill="#f43f5e" 
                    radius={[6, 6, 0, 0]} 
                    maxBarSize={32} 
                  />
                  <Bar 
                    dataKey="cycleLength" 
                    name="Total Cycle Length (Days)" 
                    fill="#fbcfe8" 
                    radius={[6, 6, 0, 0]} 
                    maxBarSize={32} 
                  />
                </BarChart>
              ) : (
                <BarChart data={comparisonData.chartList} margin={{ top: 15, right: 15, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" opacity={0.45} vertical={false} />
                  <XAxis 
                    dataKey="name" 
                    tick={{ fill: '#e11d48', fontSize: 11, fontWeight: 600 }} 
                    axisLine={false} 
                    tickLine={false} 
                  />
                  <YAxis 
                    tick={{ fill: '#e11d48', fontSize: 11 }} 
                    axisLine={false} 
                    tickLine={false} 
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#fff', 
                      borderRadius: '0.75rem', 
                      borderColor: '#fbcfe8',
                      color: '#1c1917',
                      boxShadow: '0 4px 12px rgba(244,114,182,0.12)' 
                    }}
                    formatter={(val: any) => [`${val > 0 ? `+${val}` : val} days from average`, 'Deviation']}
                  />
                  <ReferenceLine y={0} stroke="#9ca3af" strokeWidth={1.5} />
                  <Bar 
                    dataKey="diffFromAvg" 
                    name="Difference from Cohort Average" 
                    fill="#a855f7" 
                    radius={[6, 6, 6, 6]} 
                    maxBarSize={28} 
                  />
                </BarChart>
              )}
            </ResponsiveContainer>
          </div>
        </div>

        {/* Natural Language Personalized Narrative Insight Card */}
        <div className="bg-pink-50/60 dark:bg-pink-950/20 p-5 sm:p-6 rounded-2xl border border-pink-200/70 dark:border-pink-900/50 flex items-start gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-white dark:bg-[#1a1816] shadow-xs border border-pink-200/70 dark:border-pink-900/50 flex items-center justify-center text-lg shrink-0 mt-0.5">
            💬
          </div>
          <div className="space-y-1">
            <span className="text-xs font-semibold text-pink-700 dark:text-pink-400 block">
              Personalized cycle intelligence narrative
            </span>
            <p className="text-xs sm:text-sm text-stone-700 dark:text-stone-300 leading-relaxed">
              "{comparisonData.narrativeInsight}"
            </p>
          </div>
        </div>

      </section>

      {/* ========================================================================= */}
      {/* SECTION D: ADVANCED INSIGHTS (COLLAPSIBLE: SYMPTOMS & BBT TRENDS)        */}
      {/* ========================================================================= */}
      <section className="bg-white dark:bg-[#1a1816] rounded-2xl border border-stone-200/80 dark:border-[#2e2a26] shadow-xs overflow-hidden">
        <button
          onClick={() => setIsAdvancedInsightsOpen(!isAdvancedInsightsOpen)}
          className="w-full p-6 flex items-center justify-between text-left hover:bg-[#faf8f6] dark:hover:bg-[#23201d] transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-pink-50 dark:bg-pink-950/40 text-pink-600 dark:text-pink-400 flex items-center justify-center text-lg border border-pink-200/60 dark:border-pink-900/50">
              🔬
            </div>
            <div>
              <span className="text-xs font-semibold text-pink-600 dark:text-pink-400 block">
                Advanced insights
              </span>
              <h4 className="text-base font-serif font-bold text-stone-900 dark:text-stone-100">
                Symptom Trends & Basal Body Temperature (BBT) Analysis
              </h4>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs font-semibold text-pink-600 dark:text-pink-400">
              {isAdvancedInsightsOpen ? 'Collapse' : 'Expand insights'}
            </span>
            {isAdvancedInsightsOpen ? (
              <ChevronDown size={18} className="text-pink-500 dark:text-pink-400" />
            ) : (
              <ChevronRight size={18} className="text-pink-500 dark:text-pink-400" />
            )}
          </div>
        </button>

        <AnimatePresence>
          {isAdvancedInsightsOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="border-t border-stone-100 dark:border-[#2e2a26] p-6 space-y-6"
            >
              {/* Tabs for Symptoms vs BBT */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => setAdvancedTab('symptoms')}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                    advancedTab === 'symptoms'
                      ? 'bg-pink-600 text-white shadow-xs'
                      : 'bg-[#faf8f6] dark:bg-[#23201d] text-stone-700 dark:text-stone-300 border border-stone-200/70 dark:border-[#342f2b] hover:border-pink-300'
                  }`}
                >
                  <Sparkles size={13} />
                  <span>Symptom frequency</span>
                </button>
                <button
                  onClick={() => setAdvancedTab('temperature')}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                    advancedTab === 'temperature'
                      ? 'bg-pink-600 text-white shadow-xs'
                      : 'bg-[#faf8f6] dark:bg-[#23201d] text-stone-700 dark:text-stone-300 border border-stone-200/70 dark:border-[#342f2b] hover:border-pink-300'
                  }`}
                >
                  <Thermometer size={13} />
                  <span>Basal body temperature</span>
                </button>
              </div>

              {advancedTab === 'symptoms' ? (
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                    <span className="text-stone-500 dark:text-stone-400">Most frequently logged symptoms across recorded cycles:</span>
                    <span className="text-pink-600 dark:text-pink-400 font-semibold tabular-nums">{analytics.totalSymptomsCount} symptoms logged</span>
                  </div>

                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={symptomData} layout="vertical" margin={{ top: 10, right: 15, left: 20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" opacity={0.45} horizontal={false} />
                        <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: '#ec4899', fontSize: 11 }} />
                        <YAxis 
                          dataKey="symptom" 
                          type="category" 
                          axisLine={false} 
                          tickLine={false} 
                          tick={{ fill: '#db2777', fontSize: 11, fontWeight: 600 }} 
                        />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: '#fff', 
                            borderRadius: '0.75rem', 
                            borderColor: '#fbcfe8',
                            color: '#1c1917',
                            boxShadow: '0 4px 12px rgba(244,114,182,0.12)' 
                          }}
                        />
                        <Bar dataKey="count" name="Times Logged" radius={[0, 6, 6, 0]} barSize={16}>
                          {symptomData.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={barColors[index % barColors.length]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                    <span className="text-stone-500 dark:text-stone-400">Biphasic follicular-to-luteal temperature shift:</span>
                    <span className="text-pink-600 dark:text-pink-400 font-semibold">{user.tempUnit === 'F' ? '°F scale' : '°C scale'}</span>
                  </div>

                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={temperatureData} margin={{ top: 10, right: 15, left: -20, bottom: 0 }}>
                        <defs>
                          <linearGradient id="tempGlowGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#f472b6" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#f472b6" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" opacity={0.45} vertical={false} />
                        <XAxis 
                          dataKey="date" 
                          tick={{ fill: '#ec4899', fontSize: 11, fontWeight: 600 }} 
                          axisLine={false} 
                          tickLine={false} 
                        />
                        <YAxis 
                          domain={['dataMin - 0.2', 'dataMax + 0.2']} 
                          tick={{ fill: '#ec4899', fontSize: 11 }} 
                          axisLine={false} 
                          tickLine={false} 
                        />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: '#fff', 
                            borderRadius: '0.75rem', 
                            borderColor: '#fbcfe8',
                            color: '#1c1917',
                            boxShadow: '0 4px 12px rgba(244,114,182,0.12)' 
                          }}
                        />
                        <Area 
                          type="monotone" 
                          dataKey="temperature" 
                          name={`Basal Temp (${user.tempUnit === 'F' ? '°F' : '°C'})`} 
                          stroke="#db2777" 
                          strokeWidth={3} 
                          fillOpacity={1} 
                          fill="url(#tempGlowGrad)" 
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </section>

    </div>
  );
};

export default CycleGraph;
