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
    <div className="space-y-8 select-none animate-fadeIn text-left font-sans">
      
      {/* Clinical Trend Notice (if repeated significant shifts occur) */}
      {analytics.hasSignificantTrendAlert && !isAlertDismissed && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-200/90 p-5 rounded-[2rem] shadow-sm relative overflow-hidden"
        >
          <div className="flex items-start gap-4">
            <div className="w-11 h-11 bg-amber-500 text-white rounded-2xl flex items-center justify-center text-xl shrink-0 shadow-sm">
              🩺
            </div>
            <div className="flex-1 pr-6 space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-amber-800 bg-amber-200/60 px-2.5 py-0.5 rounded-full">
                  Clinical Trend Notice
                </span>
                <span className="text-xs text-amber-700/80 font-bold">Repeated Shifts Detected</span>
              </div>
              <p className="text-xs sm:text-sm font-serif italic text-amber-950 font-bold leading-relaxed">
                "{analytics.significantTrendMessage}"
              </p>
              <p className="text-[10px] text-amber-800/80 font-medium pt-1">
                Lumina detected repeated significant deviations (6+ days) over consecutive cycles. Monitoring patterns with a healthcare provider helps optimize reproductive well-being.
              </p>
            </div>
            <button
              onClick={handleDismissAlert}
              className="w-7 h-7 rounded-full bg-amber-100/80 hover:bg-amber-200 text-amber-700 flex items-center justify-center transition-colors cursor-pointer shrink-0"
              title="Dismiss notification"
            >
              <X size={14} />
            </button>
          </div>
        </motion.div>
      )}

      {/* ========================================================================= */}
      {/* SECTION A: CYCLE OVERVIEW (4 PRIMARY METRIC CARDS)                       */}
      {/* ========================================================================= */}
      <section className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <div>
            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-pink-500 flex items-center gap-1.5">
              <span>🌸</span> Section A: Cycle Overview
            </h3>
            <p className="text-[11px] text-stone-400 italic">
              Computed from completed cycle logs and biological telemetry.
            </p>
          </div>
          <span className="text-[9px] font-bold text-pink-600 bg-pink-50 border border-pink-100 px-3 py-1 rounded-full uppercase tracking-wider">
            {analytics.totalLoggedCycles} {analytics.totalLoggedCycles === 1 ? 'Cycle Logged' : 'Cycles Logged'}
          </span>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          
          {/* Card 1: Average Cycle Length */}
          <div className="bg-white border border-pink-100/80 p-4 sm:p-5 rounded-3xl shadow-xs flex flex-col justify-between hover:border-pink-200 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-black uppercase tracking-wider text-pink-500">
                Average Cycle Length
              </span>
              <span className="text-base">🔄</span>
            </div>
            <div className="my-2">
              <h4 className="text-2xl sm:text-3xl font-serif font-black text-stone-800 tracking-tight">
                {analytics.averageCycleDisplay}
              </h4>
            </div>
            <p className="text-[9.5px] text-stone-400 italic">
              {analytics.hasRealCompletedCycles ? 'Based on completed cycles' : 'Configured user baseline'}
            </p>
          </div>

          {/* Card 2: Average Period Length */}
          <div className="bg-white border border-pink-100/80 p-4 sm:p-5 rounded-3xl shadow-xs flex flex-col justify-between hover:border-pink-200 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-black uppercase tracking-wider text-rose-500">
                Average Period Length
              </span>
              <span className="text-base">🩸</span>
            </div>
            <div className="my-2">
              <h4 className="text-2xl sm:text-3xl font-serif font-black text-rose-700 tracking-tight">
                {analytics.averagePeriodDisplay}
              </h4>
            </div>
            <p className="text-[9.5px] text-stone-400 italic">
              Bleeding duration per period
            </p>
          </div>

          {/* Card 3: Cycle Regularity */}
          <div className="bg-white border border-pink-100/80 p-4 sm:p-5 rounded-3xl shadow-xs flex flex-col justify-between hover:border-pink-200 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-black uppercase tracking-wider text-teal-600">
                Cycle Regularity
              </span>
              <span className="text-base">✨</span>
            </div>
            <div className="my-2 space-y-1">
              <h4 className="text-xl sm:text-2xl font-serif font-black text-stone-800 leading-tight">
                {analytics.cycleRegularity}
              </h4>
              <span className={`inline-block text-[9.5px] font-bold px-2 py-0.5 rounded-md border ${analytics.regularityBadgeClass}`}>
                {analytics.cycleRegularity}
              </span>
            </div>
            <p className="text-[9.5px] text-stone-400 italic leading-snug">
              {analytics.regularityDescription}
            </p>
          </div>

          {/* Card 4: Average Cycle Variation */}
          <div className="bg-white border border-pink-100/80 p-4 sm:p-5 rounded-3xl shadow-xs flex flex-col justify-between hover:border-pink-200 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-black uppercase tracking-wider text-purple-600">
                Cycle Variation
              </span>
              <span className="text-base">📊</span>
            </div>
            <div className="my-2">
              <h4 className="text-2xl sm:text-3xl font-serif font-black text-purple-900 tracking-tight">
                {analytics.averageVariationDisplay}
              </h4>
            </div>
            <p className="text-[9.5px] text-stone-400 italic">
              Mean absolute deviation across cycles
            </p>
          </div>

        </div>
      </section>

      {/* ========================================================================= */}
      {/* SECTION B: CYCLE TREND (HISTORICAL GRAPH & PREV VS CURRENT DELTA)        */}
      {/* ========================================================================= */}
      <section className="bg-gradient-to-br from-pink-500 via-rose-500 to-pink-600 rounded-[2.5rem] p-6 sm:p-8 text-white shadow-lg shadow-pink-200/50 relative overflow-hidden">
        <div className="absolute -right-6 -bottom-6 text-white/10 text-9xl font-black pointer-events-none select-none">
          📈
        </div>

        <div className="relative z-10 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/20 pb-4">
            <div>
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-pink-100 flex items-center gap-1.5">
                <Activity size={12} />
                <span>Section B: Cycle Trend Analysis</span>
              </span>
              <h3 className="text-2xl font-serif font-black italic text-white tracking-tight mt-1">
                Previous vs. Current Cycle Trend
              </h3>
            </div>
            
            <div className="flex items-center gap-2">
              <span className="px-3.5 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 shadow-xs bg-white/20 backdrop-blur-md text-white border border-white/30">
                <span className="text-xs">{analytics.trendDirectionIcon}</span>
                <span>{analytics.trendDirectionLabel}</span>
              </span>
            </div>
          </div>

          {/* Previous vs Current Cycle Length & Change Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-1">
            {/* Previous Cycle Length */}
            <div className="bg-white/15 backdrop-blur-md border border-white/25 rounded-2xl p-4 space-y-1">
              <span className="text-[9.5px] font-extrabold uppercase tracking-widest text-pink-100 block">
                Previous Cycle Length
              </span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-3xl font-serif font-black tracking-tight text-white">
                  {analytics.previousCycleLength}
                </span>
                <span className="text-xs font-sans font-bold text-pink-100">days</span>
              </div>
              <p className="text-[9px] text-pink-100/80 italic">
                {analytics.totalLoggedCycles >= 2 
                  ? `Cycle ${analytics.totalLoggedCycles - 1} length`
                  : 'Configured reference baseline'}
              </p>
            </div>

            {/* Current Cycle Length */}
            <div className="bg-white/25 backdrop-blur-md border border-white/40 rounded-2xl p-4 space-y-1 shadow-xs">
              <span className="text-[9.5px] font-extrabold uppercase tracking-widest text-pink-100 block">
                Current Cycle Length
              </span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-3xl font-serif font-black tracking-tight text-white">
                  {analytics.currentCycleLength}
                </span>
                <span className="text-xs font-sans font-bold text-pink-100">days</span>
              </div>
              <p className="text-[9px] text-pink-100/90 italic">
                {analytics.totalLoggedCycles >= 1 
                  ? `Cycle ${analytics.totalLoggedCycles} length`
                  : 'Current configured cycle length'}
              </p>
            </div>

            {/* Change / Difference */}
            <div className="bg-white/15 backdrop-blur-md border border-white/25 rounded-2xl p-4 space-y-1">
              <span className="text-[9.5px] font-extrabold uppercase tracking-widest text-pink-100 block">
                Change from Previous
              </span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-3xl font-serif font-black tracking-tight text-white">
                  {analytics.cycleChangeFormatted}
                </span>
              </div>
              <p className="text-[9px] text-pink-100/80 italic">
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
      <section className="bg-white p-6 sm:p-7 rounded-[2.5rem] border border-pink-100/80 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-pink-50 pb-3">
          <div>
            <span className="text-[9.5px] font-black uppercase tracking-[0.2em] text-pink-500">
              Section C: Clinical Regularity Analysis
            </span>
            <h4 className="text-lg font-serif font-bold text-stone-800 italic mt-0.5">
              Cycle Regularity Classification & Boundary Range
            </h4>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-50 border border-teal-100 text-teal-700 text-xs font-bold">
            <ShieldCheck size={14} />
            <span>{analytics.cycleRegularity}</span>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          <div className="p-4 rounded-2xl bg-pink-50/40 border border-pink-100/60 space-y-1">
            <span className="text-[9px] font-bold text-stone-400 uppercase tracking-wider block">Shortest Cycle</span>
            <p className="text-2xl font-serif font-black text-pink-600">
              {analytics.shortestCycle} <span className="text-xs font-sans not-italic text-stone-400">days</span>
            </p>
            <p className="text-[9px] text-stone-400 italic">Minimum recorded interval</p>
          </div>

          <div className="p-4 rounded-2xl bg-pink-50/40 border border-pink-100/60 space-y-1">
            <span className="text-[9px] font-bold text-stone-400 uppercase tracking-wider block">Longest Cycle</span>
            <p className="text-2xl font-serif font-black text-rose-600">
              {analytics.longestCycle} <span className="text-xs font-sans not-italic text-stone-400">days</span>
            </p>
            <p className="text-[9px] text-stone-400 italic">Maximum recorded interval</p>
          </div>

          <div className="p-4 rounded-2xl bg-purple-50/40 border border-purple-100/60 space-y-1">
            <span className="text-[9px] font-bold text-stone-400 uppercase tracking-wider block">Cycle Variation</span>
            <p className="text-2xl font-serif font-black text-purple-700">
              {analytics.averageVariationDisplay}
            </p>
            <p className="text-[9px] text-stone-400 italic">Normal benchmark is &lt; 5 days</p>
          </div>

          <div className="p-4 rounded-2xl bg-teal-50/40 border border-teal-100/60 space-y-1">
            <span className="text-[9px] font-bold text-stone-400 uppercase tracking-wider block">Clinical Classification</span>
            <p className="text-base font-serif font-bold text-teal-800 pt-1">
              {analytics.cycleRegularity}
            </p>
            <p className="text-[9px] text-stone-400 italic">FIGO Menstrual Criteria</p>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* SECTION E: NEW CYCLE COMPARISON FEATURE                                  */}
      {/* ========================================================================= */}
      <section className="bg-gradient-to-br from-white via-pink-50/20 to-purple-50/20 p-6 sm:p-8 rounded-[2.5rem] border border-pink-100/80 shadow-xs space-y-6">
        
        {/* Header & Cohort Selection Tabs */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-pink-100/60 pb-5">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xl">📊</span>
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-pink-500">
                Section E: Cycle Comparison
              </span>
            </div>
            <h3 className="text-xl sm:text-2xl font-serif font-bold text-stone-800 italic">
              Comparative Cycle Analysis & Cohorts
            </h3>
            <p className="text-xs text-stone-500 font-serif italic">
              Compare your cycle trends across distinct historical cohorts.
            </p>
          </div>

          {/* Cohort Selectors: Last 3, Last 6, Last 12, All */}
          <div className="flex items-center gap-1.5 p-1 bg-white rounded-full border border-pink-100 shadow-2xs self-start md:self-auto">
            {[
              { id: '3', label: 'Last 3 Cycles' },
              { id: '6', label: 'Last 6 Cycles' },
              { id: '12', label: 'Last 12 Cycles' },
              { id: 'all', label: 'All Cycles' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setComparisonRange(tab.id as ComparisonRange)}
                className={`px-3.5 py-1.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider transition-all cursor-pointer ${
                  comparisonRange === tab.id
                    ? 'bg-gradient-to-r from-pink-500 to-rose-400 text-white shadow-2xs'
                    : 'text-stone-500 hover:text-pink-600 hover:bg-pink-50/50'
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
          <div className="bg-white p-4 rounded-2xl border border-pink-100/70 shadow-2xs space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-bold text-stone-400 uppercase tracking-wider">Cohort Avg Cycle</span>
              <span className="text-xs">🔄</span>
            </div>
            <p className="text-2xl font-serif font-black text-pink-600">
              {formatDayDisplay(comparisonData.cohortAvgCycle)}
            </p>
            <div className="flex items-center gap-1 text-[9px] font-bold">
              <span className="text-stone-400">Overall:</span>
              <span className="text-stone-600">{analytics.averageCycleDisplay}</span>
              {comparisonData.diffFromOverall !== 0 && (
                <span className={`px-1.5 py-0.2 rounded font-extrabold ${
                  comparisonData.diffFromOverall > 0 ? 'bg-amber-50 text-amber-600' : 'bg-sky-50 text-sky-600'
                }`}>
                  {comparisonData.diffFromOverall > 0 ? `+${comparisonData.diffFromOverall}d` : `${comparisonData.diffFromOverall}d`}
                </span>
              )}
            </div>
          </div>

          {/* Cohort Period Duration */}
          <div className="bg-white p-4 rounded-2xl border border-pink-100/70 shadow-2xs space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-bold text-stone-400 uppercase tracking-wider">Cohort Period Duration</span>
              <span className="text-xs">🩸</span>
            </div>
            <p className="text-2xl font-serif font-black text-rose-600">
              {formatDayDisplay(comparisonData.cohortAvgPeriod)}
            </p>
            <p className="text-[9px] text-stone-400 italic">
              Bleeding duration per cycle
            </p>
          </div>

          {/* Cohort Regularity */}
          <div className="bg-white p-4 rounded-2xl border border-pink-100/70 shadow-2xs space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-bold text-stone-400 uppercase tracking-wider">Cohort Regularity</span>
              <span className="text-xs">✨</span>
            </div>
            <p className="text-lg font-serif font-bold text-teal-700">
              {comparisonData.cohortRegularity}
            </p>
            <p className="text-[9px] text-teal-600 font-medium">
              Variation: ±{comparisonData.cohortVariation} days
            </p>
          </div>

          {/* Flow Distribution */}
          <div className="bg-white p-4 rounded-2xl border border-pink-100/70 shadow-2xs space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-bold text-stone-400 uppercase tracking-wider">Flow Breakdown</span>
              <Droplet size={13} className="text-rose-400" />
            </div>
            <div className="grid grid-cols-2 gap-1 text-[9.5px]">
              <span className="text-stone-600">Med: <strong className="text-rose-600">{comparisonData.flowCounts.medium}</strong></span>
              <span className="text-stone-600">Hvy: <strong className="text-rose-700">{comparisonData.flowCounts.heavy}</strong></span>
              <span className="text-stone-600">Lgt: <strong className="text-rose-400">{comparisonData.flowCounts.light}</strong></span>
              <span className="text-stone-600">Spot: <strong className="text-rose-300">{comparisonData.flowCounts.spotting}</strong></span>
            </div>
          </div>

        </div>

        {/* Interactive Comparison Chart Card */}
        <div className="bg-white p-5 sm:p-6 rounded-3xl border border-pink-100/80 shadow-2xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-pink-50 pb-3">
            <div>
              <h4 className="text-sm font-serif font-bold text-stone-800 italic">
                Cycle Progression Across Cohort ({comparisonRange === 'all' ? 'All Recorded Cycles' : `Last ${comparisonData.count} Cycles`})
              </h4>
              <p className="text-[10px] text-stone-400 italic">
                Compare individual cycle lengths with bleeding durations and the cohort average benchmark.
              </p>
            </div>

            <div className="flex items-center gap-1.5 p-1 bg-pink-50/60 rounded-full border border-pink-100 self-start sm:self-auto">
              <button
                onClick={() => setComparisonChartType('cycle-length')}
                className={`px-3 py-1 rounded-full text-[9px] font-bold uppercase transition-all ${
                  comparisonChartType === 'cycle-length' ? 'bg-pink-500 text-white shadow-2xs' : 'text-stone-500 hover:text-pink-600'
                }`}
              >
                Cycle & Period
              </button>
              <button
                onClick={() => setComparisonChartType('period-length')}
                className={`px-3 py-1 rounded-full text-[9px] font-bold uppercase transition-all ${
                  comparisonChartType === 'period-length' ? 'bg-pink-500 text-white shadow-2xs' : 'text-stone-500 hover:text-pink-600'
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
                  <CartesianGrid strokeDasharray="3 3" stroke="#fdf2f8" vertical={false} />
                  <XAxis 
                    dataKey="name" 
                    tick={{ fill: '#f43f5e', fontSize: 10, fontWeight: 'bold' }} 
                    axisLine={false} 
                    tickLine={false} 
                  />
                  <YAxis 
                    tick={{ fill: '#f43f5e', fontSize: 10 }} 
                    axisLine={false} 
                    tickLine={false} 
                    domain={[0, 'dataMax + 8']}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#fff', 
                      borderRadius: '1.25rem', 
                      borderColor: '#fbcfe8',
                      boxShadow: '0 4px 12px rgba(244,114,182,0.08)' 
                    }}
                    labelStyle={{ fontWeight: 'extrabold', color: '#db2777', fontSize: '11px' }}
                    formatter={(val: any, name: string) => [`${val} days`, name]}
                  />
                  <Legend 
                    verticalAlign="top" 
                    height={32} 
                    wrapperStyle={{ fontSize: '9px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.05em' }}
                  />
                  <ReferenceLine 
                    y={comparisonData.cohortAvgCycle} 
                    stroke="#db2777" 
                    strokeDasharray="4 4" 
                    label={{ 
                      value: `Cohort Avg (${comparisonData.cohortAvgCycle}d)`, 
                      fill: '#db2777', 
                      fontSize: 9, 
                      position: 'insideTopRight' 
                    }} 
                  />
                  <Bar 
                    dataKey="periodLength" 
                    name="Bleeding Duration (Days)" 
                    fill="#f43f5e" 
                    radius={[8, 8, 0, 0]} 
                    maxBarSize={32} 
                  />
                  <Bar 
                    dataKey="cycleLength" 
                    name="Total Cycle Length (Days)" 
                    fill="#fbcfe8" 
                    radius={[8, 8, 0, 0]} 
                    maxBarSize={32} 
                  />
                </BarChart>
              ) : (
                <BarChart data={comparisonData.chartList} margin={{ top: 15, right: 15, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#fdf2f8" vertical={false} />
                  <XAxis 
                    dataKey="name" 
                    tick={{ fill: '#f43f5e', fontSize: 10, fontWeight: 'bold' }} 
                    axisLine={false} 
                    tickLine={false} 
                  />
                  <YAxis 
                    tick={{ fill: '#f43f5e', fontSize: 10 }} 
                    axisLine={false} 
                    tickLine={false} 
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#fff', 
                      borderRadius: '1.25rem', 
                      borderColor: '#fbcfe8',
                      boxShadow: '0 4px 12px rgba(244,114,182,0.08)' 
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
        <div className="bg-gradient-to-r from-pink-50/80 via-purple-50/50 to-white p-5 sm:p-6 rounded-3xl border border-pink-100/80 shadow-2xs flex items-start gap-3.5">
          <div className="w-10 h-10 rounded-2xl bg-white shadow-xs border border-pink-100 flex items-center justify-center text-xl shrink-0 mt-0.5">
            💬
          </div>
          <div className="space-y-1">
            <span className="text-[9.5px] font-black uppercase tracking-widest text-pink-600 block">
              Personalized Cycle Intelligence Narrative
            </span>
            <p className="text-xs sm:text-sm font-serif italic text-stone-700 leading-relaxed">
              "{comparisonData.narrativeInsight}"
            </p>
          </div>
        </div>

      </section>

      {/* ========================================================================= */}
      {/* SECTION D: ADVANCED INSIGHTS (COLLAPSIBLE: SYMPTOMS & BBT TRENDS)        */}
      {/* ========================================================================= */}
      <section className="bg-white rounded-[2.5rem] border border-pink-100/80 shadow-xs overflow-hidden">
        <button
          onClick={() => setIsAdvancedInsightsOpen(!isAdvancedInsightsOpen)}
          className="w-full p-6 flex items-center justify-between text-left hover:bg-pink-50/20 transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-pink-50 text-pink-500 flex items-center justify-center text-lg shadow-2xs">
              🔬
            </div>
            <div>
              <span className="text-[9.5px] font-black uppercase tracking-[0.2em] text-pink-500 block">
                Section D: Advanced Insights
              </span>
              <h4 className="text-base font-serif font-bold text-stone-800 italic">
                Symptom Trends & Basal Body Temperature (BBT) Analysis
              </h4>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-serif italic text-pink-500">
              {isAdvancedInsightsOpen ? 'Collapse' : 'Expand Insights'}
            </span>
            {isAdvancedInsightsOpen ? (
              <ChevronDown size={18} className="text-pink-400" />
            ) : (
              <ChevronRight size={18} className="text-pink-400" />
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
              className="border-t border-pink-100/70 p-6 space-y-6"
            >
              {/* Tabs for Symptoms vs BBT */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setAdvancedTab('symptoms')}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-[9px] font-extrabold uppercase tracking-widest transition-all cursor-pointer ${
                    advancedTab === 'symptoms'
                      ? 'bg-gradient-to-r from-pink-500 to-rose-400 text-white shadow-2xs'
                      : 'bg-stone-50 text-stone-600 hover:bg-pink-50'
                  }`}
                >
                  <Sparkles size={12} />
                  <span>Symptom Frequency</span>
                </button>
                <button
                  onClick={() => setAdvancedTab('temperature')}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-[9px] font-extrabold uppercase tracking-widest transition-all cursor-pointer ${
                    advancedTab === 'temperature'
                      ? 'bg-gradient-to-r from-pink-500 to-rose-400 text-white shadow-2xs'
                      : 'bg-stone-50 text-stone-600 hover:bg-pink-50'
                  }`}
                >
                  <Thermometer size={12} />
                  <span>Basal Body Temperature</span>
                </button>
              </div>

              {advancedTab === 'symptoms' ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-stone-500 font-serif italic">Most frequently logged symptoms across recorded cycles:</span>
                    <span className="text-pink-600 font-bold">{analytics.totalSymptomsCount} symptoms logged</span>
                  </div>

                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={symptomData} layout="vertical" margin={{ top: 10, right: 15, left: 20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#fdf2f8" horizontal={false} />
                        <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: '#f472b6', fontSize: 10 }} />
                        <YAxis 
                          dataKey="symptom" 
                          type="category" 
                          axisLine={false} 
                          tickLine={false} 
                          tick={{ fill: '#881337', fontSize: 10, fontWeight: 'bold' }} 
                        />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: '#fff', 
                            borderRadius: '1.25rem', 
                            borderColor: '#fbcfe8',
                            boxShadow: '0 4px 12px rgba(244,114,182,0.08)' 
                          }}
                        />
                        <Bar dataKey="count" name="Times Logged" radius={[0, 8, 8, 0]} barSize={16}>
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
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-stone-500 font-serif italic">Biphasic follicular-to-luteal temperature shift:</span>
                    <span className="text-pink-600 font-bold">{user.tempUnit === 'F' ? '°F Scale' : '°C Scale'}</span>
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
                        <CartesianGrid strokeDasharray="3 3" stroke="#fdf2f8" vertical={false} />
                        <XAxis 
                          dataKey="date" 
                          tick={{ fill: '#f472b6', fontSize: 10, fontWeight: 'bold' }} 
                          axisLine={false} 
                          tickLine={false} 
                        />
                        <YAxis 
                          domain={['dataMin - 0.2', 'dataMax + 0.2']} 
                          tick={{ fill: '#f472b6', fontSize: 10 }} 
                          axisLine={false} 
                          tickLine={false} 
                        />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: '#fff', 
                            borderRadius: '1.25rem', 
                            borderColor: '#fbcfe8',
                            boxShadow: '0 4px 12px rgba(244,114,182,0.08)' 
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
