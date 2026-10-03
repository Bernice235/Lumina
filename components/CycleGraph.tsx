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
  Heart,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  CheckCircle2,
  Calendar,
  Clock,
  ShieldAlert,
  X
} from 'lucide-react';
import { User, Period, Symptom, TemperatureLog } from '../types';
import { 
  getCycleAnalytics, 
  checkAndDispatchTrendNotification 
} from '../services/cycleAnalyticsService';

interface CycleGraphProps {
  user: User;
  setUser?: React.Dispatch<React.SetStateAction<User | null>> | ((u: any) => void);
  symptoms?: Symptom[];
}

export const CycleGraph: React.FC<CycleGraphProps> = ({ user, setUser, symptoms }) => {
  const [activeTab, setActiveTab] = useState<'history' | 'symptoms' | 'temperature'>('history');
  const [chartType, setChartType] = useState<'bar' | 'line'>('bar');
  const [isAlertDismissed, setIsAlertDismissed] = useState<boolean>(() => {
    try {
      return localStorage.getItem(`lumina_dismiss_trend_alert_${user?.id || 'default'}`) === 'true';
    } catch {
      return false;
    }
  });

  // Calculate deep dynamic bio-aware analytics from central service
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

  const barColors = ['#f472b6', '#f43f5e', '#fda4af', '#fbcfe8', '#db2777', '#f472b6'];

  return (
    <div className="space-y-6 select-none animate-fadeIn text-left font-sans">
      
      {/* 6. Trend Notifications: Alert Banner for Repeated Significant Changes */}
      {analytics.hasSignificantTrendAlert && !isAlertDismissed && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-200/90 p-5 rounded-[2.2rem] shadow-sm relative overflow-hidden"
        >
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-amber-500 text-white rounded-2xl flex items-center justify-center text-xl shrink-0 shadow-md shadow-amber-200">
              🩺
            </div>
            <div className="flex-1 pr-6 space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-amber-800 bg-amber-200/60 px-2.5 py-0.5 rounded-full">
                  Clinical Trend Notice
                </span>
                <span className="text-xs text-amber-700/80 font-bold">Repeated Shifts Detected</span>
              </div>
              <p className="text-sm font-serif italic text-amber-950 font-bold leading-relaxed">
                "{analytics.significantTrendMessage}"
              </p>
              <p className="text-[10px] text-amber-800/80 font-medium pt-1">
                Lumina detected repeated significant deviations (e.g. shifts of 6+ days) over consecutive cycles. Monitoring patterns with a healthcare provider helps optimize your reproductive well-being.
              </p>
            </div>
            <button
              onClick={handleDismissAlert}
              className="w-8 h-8 rounded-full bg-amber-100/80 hover:bg-amber-200 text-amber-700 flex items-center justify-center transition-colors cursor-pointer shrink-0"
              title="Dismiss notification banner"
            >
              <X size={15} />
            </button>
          </div>
        </motion.div>
      )}

      {/* 2. Accurate Cycle Trend Tracking Header Card */}
      <div className="bg-gradient-to-br from-pink-500 via-rose-500 to-pink-600 rounded-[2.5rem] p-6 sm:p-8 text-white shadow-xl shadow-pink-200/60 relative overflow-hidden">
        <div className="absolute -right-8 -bottom-8 text-white/10 text-9xl font-black pointer-events-none select-none">
          📈
        </div>

        <div className="relative z-10 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/20 pb-4">
            <div>
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-pink-100 flex items-center gap-1.5">
                <Activity size={12} />
                <span>Accurate Cycle Trend Tracking</span>
              </span>
              <h3 className="text-2xl sm:text-3xl font-serif font-black italic text-white tracking-tight mt-1">
                Cycle Trend
              </h3>
            </div>
            
            <div className="flex items-center gap-2">
              <span className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 shadow-sm bg-white/20 backdrop-blur-md text-white border border-white/30`}>
                <span className="text-xs">{analytics.trendDirectionIcon}</span>
                <span>{analytics.trendDirectionLabel}</span>
              </span>
            </div>
          </div>

          {/* Previous vs Current Cycle Length & Change Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
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
                  ? `Cycle ${analytics.totalLoggedCycles - 1} duration`
                  : 'Configured baseline reference'}
              </p>
            </div>

            {/* Current Cycle Length */}
            <div className="bg-white/25 backdrop-blur-md border border-white/40 rounded-2xl p-4 space-y-1 shadow-md">
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
                  ? `Cycle ${analytics.totalLoggedCycles} duration`
                  : 'Current configured cycle parameter'}
              </p>
            </div>

            {/* Change */}
            <div className="bg-white/15 backdrop-blur-md border border-white/25 rounded-2xl p-4 space-y-1">
              <span className="text-[9.5px] font-extrabold uppercase tracking-widest text-pink-100 block">
                Change
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
      </div>

      {/* 3 & 4 & 5. Statistics Section Improvements & Additions (Grid of 8 Cards) */}
      <div>
        <div className="flex items-center justify-between mb-3 px-1">
          <div>
            <h4 className="text-xs font-black uppercase tracking-[0.2em] text-pink-500">
              Sanctuary Health Statistics
            </h4>
            <p className="text-[11px] text-gray-400 italic">
              Computed from completed cycle logs and biological telemetry.
            </p>
          </div>
          <span className="text-[9px] font-bold text-pink-600 bg-pink-50 border border-pink-100 px-3 py-1 rounded-full uppercase tracking-wider">
            {analytics.totalLoggedCycles} {analytics.totalLoggedCycles === 1 ? 'Cycle Logged' : 'Cycles Logged'}
          </span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          
          {/* Card 1: Average Cycle Length */}
          <div className="bg-white border border-pink-100 p-4 sm:p-5 rounded-3xl shadow-sm flex flex-col justify-between hover:border-pink-200 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-black uppercase tracking-wider text-pink-400">
                Average Cycle Length
              </span>
              <span className="text-base">🔄</span>
            </div>
            <div className="my-2">
              <h4 className="text-2xl sm:text-3xl font-serif font-black text-pink-900 tracking-tight">
                {analytics.averageCycleDisplay}
              </h4>
            </div>
            <p className="text-[9px] text-gray-400 italic">
              {analytics.hasRealCompletedCycles ? 'Calculated from completed cycles' : 'Configured onboarding baseline'}
            </p>
          </div>

          {/* Card 2: Average Period Length */}
          <div className="bg-white border border-pink-100 p-4 sm:p-5 rounded-3xl shadow-sm flex flex-col justify-between hover:border-pink-200 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-black uppercase tracking-wider text-rose-400">
                Average Period Length
              </span>
              <span className="text-base">🩸</span>
            </div>
            <div className="my-2">
              <h4 className="text-2xl sm:text-3xl font-serif font-black text-rose-900 tracking-tight">
                {analytics.averagePeriodDisplay}
              </h4>
            </div>
            <p className="text-[9px] text-gray-400 italic">
              Calculated from actual logged periods
            </p>
          </div>

          {/* Card 3: Cycle Regularity & Average Variation */}
          <div className="bg-white border border-pink-100 p-4 sm:p-5 rounded-3xl shadow-sm flex flex-col justify-between hover:border-pink-200 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-black uppercase tracking-wider text-teal-500">
                Cycle Regularity
              </span>
              <span className="text-base">✨</span>
            </div>
            <div className="my-2 space-y-1">
              <h4 className="text-xl sm:text-2xl font-serif font-black text-pink-900 leading-tight">
                {analytics.cycleRegularity}
              </h4>
              <div className="flex items-baseline gap-1 text-[11px] font-bold text-teal-700 bg-teal-50/80 px-2 py-0.5 rounded-lg border border-teal-100 w-fit">
                <span className="text-[9px] uppercase tracking-wide opacity-75">Avg Variation:</span>
                <span>{analytics.averageVariationDisplay}</span>
              </div>
            </div>
            <p className="text-[9px] text-gray-400 italic leading-snug">
              {analytics.regularityDescription}
            </p>
          </div>

          {/* Card 4: Trend Direction */}
          <div className="bg-white border border-pink-100 p-4 sm:p-5 rounded-3xl shadow-sm flex flex-col justify-between hover:border-pink-200 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-black uppercase tracking-wider text-purple-400">
                Trend Direction
              </span>
              <span className="text-base">🧭</span>
            </div>
            <div className="my-2">
              <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold ${analytics.trendDirectionColor}`}>
                <span>{analytics.trendDirectionIcon}</span>
                <span>{analytics.trendDirection}</span>
              </div>
              <p className="text-xs font-serif font-bold text-pink-800 mt-1.5">
                {analytics.trendDirectionLabel}
              </p>
            </div>
            <p className="text-[9px] text-gray-400 italic">
              Recent cycle delta: {analytics.cycleChangeFormatted}
            </p>
          </div>

          {/* Card 5: Longest Cycle */}
          <div className="bg-white border border-pink-100 p-4 sm:p-5 rounded-3xl shadow-sm flex flex-col justify-between hover:border-pink-200 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-black uppercase tracking-wider text-pink-400">
                Longest Cycle
              </span>
              <span className="text-base">⏳</span>
            </div>
            <div className="my-2">
              <h4 className="text-2xl sm:text-3xl font-serif font-black text-pink-900 tracking-tight">
                {analytics.longestCycle} <span className="text-xs font-sans font-bold text-pink-400">Days</span>
              </h4>
            </div>
            <p className="text-[9px] text-gray-400 italic">
              Maximum logged interval
            </p>
          </div>

          {/* Card 6: Shortest Cycle */}
          <div className="bg-white border border-pink-100 p-4 sm:p-5 rounded-3xl shadow-sm flex flex-col justify-between hover:border-pink-200 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-black uppercase tracking-wider text-pink-400">
                Shortest Cycle
              </span>
              <span className="text-base">⚡</span>
            </div>
            <div className="my-2">
              <h4 className="text-2xl sm:text-3xl font-serif font-black text-pink-900 tracking-tight">
                {analytics.shortestCycle} <span className="text-xs font-sans font-bold text-pink-400">Days</span>
              </h4>
            </div>
            <p className="text-[9px] text-gray-400 italic">
              Minimum logged interval
            </p>
          </div>

          {/* Card 7: Average Monthly Symptoms */}
          <div className="bg-white border border-pink-100 p-4 sm:p-5 rounded-3xl shadow-sm flex flex-col justify-between hover:border-pink-200 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-black uppercase tracking-wider text-pink-400">
                Avg Monthly Symptoms
              </span>
              <span className="text-base">🌸</span>
            </div>
            <div className="my-2">
              <h4 className="text-2xl sm:text-3xl font-serif font-black text-pink-900 tracking-tight">
                {analytics.averageMonthlySymptoms}
              </h4>
            </div>
            <p className="text-[9px] text-gray-400 italic">
              {analytics.totalSymptomsCount} total symptoms tracked
            </p>
          </div>

          {/* Card 8: Total Logged Cycles */}
          <div className="bg-white border border-pink-100 p-4 sm:p-5 rounded-3xl shadow-sm flex flex-col justify-between hover:border-pink-200 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-black uppercase tracking-wider text-pink-400">
                Total Logged Cycles
              </span>
              <span className="text-base">📜</span>
            </div>
            <div className="my-2">
              <h4 className="text-2xl sm:text-3xl font-serif font-black text-pink-900 tracking-tight">
                {analytics.totalLoggedCycles} <span className="text-xs font-sans font-bold text-pink-400">{analytics.totalLoggedCycles === 1 ? 'Cycle' : 'Cycles'}</span>
              </h4>
            </div>
            <p className="text-[9px] text-gray-400 italic">
              {analytics.totalLoggedPeriods} total periods recorded
            </p>
          </div>

        </div>
      </div>

      {/* Main Chart Card */}
      <div className="bg-white p-6 md:p-8 rounded-[2.5rem] border border-pink-50 shadow-sm space-y-6 relative overflow-hidden">
        
        {/* Dynamic header toggles */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-pink-50/80">
          <div>
            <h3 className="text-xl font-serif text-pink-900 font-extrabold flex items-center gap-2">
              <TrendingUp className="text-pink-400 w-5 h-5" />
              <span>Bio-Metrics & Dynamic Trend Visualizer</span>
            </h3>
            <p className="text-[10px] text-gray-400 font-medium">
              Interactive physiological analysis and historical pattern tracking across cycles.
            </p>
          </div>

          {/* Toggle Pills */}
          <div className="flex flex-wrap items-center gap-2">
            {activeTab === 'history' && (
              <div className="flex bg-pink-50/50 p-1 rounded-full border border-pink-100/40 mr-1">
                <button
                  onClick={() => setChartType('bar')}
                  className={`px-3 py-1 rounded-full text-[9px] font-black uppercase transition-all ${
                    chartType === 'bar' ? 'bg-pink-400 text-white shadow-xs' : 'text-gray-400 hover:text-pink-600'
                  }`}
                >
                  Bar
                </button>
                <button
                  onClick={() => setChartType('line')}
                  className={`px-3 py-1 rounded-full text-[9px] font-black uppercase transition-all ${
                    chartType === 'line' ? 'bg-pink-400 text-white shadow-xs' : 'text-gray-400 hover:text-pink-600'
                  }`}
                >
                  Line
                </button>
              </div>
            )}

            <div className="flex bg-pink-50/50 p-1.5 rounded-full border border-pink-100/40 shrink-0">
              {[
                { id: 'history', label: 'Cycle Trend', icon: <Activity size={12} /> },
                { id: 'symptoms', label: 'Symptoms', icon: <Sparkles size={12} /> },
                { id: 'temperature', label: 'Basal Temp', icon: <Thermometer size={12} /> }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-[9px] font-extrabold uppercase tracking-widest transition-all cursor-pointer ${
                    activeTab === tab.id 
                      ? 'bg-pink-400 text-white shadow-sm font-bold' 
                      : 'text-gray-400 hover:text-pink-600'
                  }`}
                >
                  {tab.icon}
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Informative Banner when showing baseline reference data */}
        {!analytics.hasRealCompletedCycles && activeTab === 'history' && (
          <div className="bg-amber-50/70 border border-amber-100 rounded-2xl p-4 flex gap-3 text-amber-800">
            <Info className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <p className="text-[10px] font-extrabold uppercase tracking-wide">Historical Preview Mode</p>
              <p className="text-[9.5px] text-amber-700/80 font-medium leading-relaxed">
                Log consecutive period cycles inside the Diary or Tracker to compile automated completed cycle calculations. Graph is currently showing your configured baseline of <strong className="text-amber-900">{user.cycleLength || 28} days</strong>.
              </p>
            </div>
          </div>
        )}

        {/* Graphic Output Container */}
        <div className="h-80 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            {activeTab === 'history' ? (
              chartType === 'bar' ? (
                <BarChart data={analytics.chartData} margin={{ top: 15, right: 15, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#fdf2f8" vertical={false} />
                  <XAxis 
                    dataKey="name" 
                    tick={{ fill: '#f472b6', fontSize: 10, fontWeight: 'bold' }} 
                    axisLine={false} 
                    tickLine={false} 
                  />
                  <YAxis 
                    tick={{ fill: '#f472b6', fontSize: 10 }} 
                    axisLine={false} 
                    tickLine={false} 
                    domain={[0, 'dataMax + 10']}
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
                    height={36} 
                    wrapperStyle={{ fontSize: '9px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.05em' }}
                  />
                  <ReferenceLine 
                    y={analytics.averageCycleLength} 
                    stroke="#db2777" 
                    strokeDasharray="4 4" 
                    label={{ 
                      value: `Avg (${analytics.averageCycleDisplay})`, 
                      fill: '#db2777', 
                      fontSize: 9, 
                      position: 'insideTopRight' 
                    }} 
                  />
                  <Bar 
                    dataKey="periodLength" 
                    name="Bleeding Duration (Days)" 
                    fill="#f43f5e" 
                    radius={[10, 10, 0, 0]} 
                    maxBarSize={38} 
                  />
                  <Bar 
                    dataKey="cycleLength" 
                    name="Total Cycle Duration (Days)" 
                    fill="#fbcfe8" 
                    radius={[10, 10, 0, 0]} 
                    maxBarSize={38} 
                  />
                </BarChart>
              ) : (
                <LineChart data={analytics.chartData} margin={{ top: 15, right: 15, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#fdf2f8" vertical={false} />
                  <XAxis 
                    dataKey="name" 
                    tick={{ fill: '#f472b6', fontSize: 10, fontWeight: 'bold' }} 
                    axisLine={false} 
                    tickLine={false} 
                  />
                  <YAxis 
                    tick={{ fill: '#f472b6', fontSize: 10 }} 
                    axisLine={false} 
                    tickLine={false} 
                    domain={['dataMin - 3', 'dataMax + 4']}
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
                    height={36} 
                    wrapperStyle={{ fontSize: '9px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.05em' }}
                  />
                  <ReferenceLine 
                    y={analytics.averageCycleLength} 
                    stroke="#db2777" 
                    strokeDasharray="4 4" 
                    label={{ 
                      value: `Avg (${analytics.averageCycleDisplay})`, 
                      fill: '#db2777', 
                      fontSize: 9, 
                      position: 'insideTopRight' 
                    }} 
                  />
                  <Line 
                    type="monotone" 
                    dataKey="cycleLength" 
                    name="Total Cycle Duration (Days)" 
                    stroke="#ec4899" 
                    strokeWidth={3} 
                    dot={{ r: 5, fill: '#ec4899', stroke: '#fff', strokeWidth: 2 }} 
                    activeDot={{ r: 8, fill: '#db2777', stroke: '#fff', strokeWidth: 2 }} 
                  />
                  <Line 
                    type="monotone" 
                    dataKey="periodLength" 
                    name="Bleeding Duration (Days)" 
                    stroke="#f43f5e" 
                    strokeWidth={2} 
                    strokeDasharray="5 5"
                    dot={{ r: 4, fill: '#f43f5e', stroke: '#fff', strokeWidth: 1.5 }} 
                  />
                </LineChart>
              )
            ) : activeTab === 'symptoms' ? (
              symptomData.reduce((acc, curr) => acc + curr.count, 0) === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-8 bg-pink-50/10 rounded-[2rem] border border-pink-50/40">
                  <span className="text-3xl mb-2">🌸</span>
                  <p className="text-xs text-pink-900 font-extrabold tracking-tight">No Symptom Trends</p>
                  <p className="text-[10px] text-gray-400 mt-1 max-w-xs">
                    Please log symptoms on the period tracker board to dynamically display a diagnostic overview mapping of your primary logged states.
                  </p>
                </div>
              ) : (
                <BarChart data={symptomData} layout="vertical" margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#fdf2f8" horizontal={false} />
                  <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: '#f472b6', fontSize: 10 }} />
                  <YAxis 
                    dataKey="symptom" 
                    type="category" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#9b2c2c', fontSize: 10, fontWeight: 'bold' }} 
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#fff', 
                      borderRadius: '1.25rem', 
                      borderColor: '#fbcfe8',
                      boxShadow: '0 4px 12px rgba(244,114,182,0.08)' 
                    }}
                  />
                  <Bar dataKey="count" name="Frequency Logged" radius={[0, 8, 8, 0]} barSize={16}>
                    {symptomData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={barColors[index % barColors.length]} />
                    ))}
                  </Bar>
                </BarChart>
              )
            ) : (
              <AreaChart data={temperatureData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
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
            )}
          </ResponsiveContainer>
        </div>
      </div>

      {/* Cycle Insights Tip */}
      <div className="bg-pink-50/20 border border-pink-100/30 p-6 rounded-[2.5rem] flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex gap-4 items-start">
          <div className="w-12 h-12 bg-white text-pink-500 rounded-full flex items-center justify-center text-xl shadow-md shrink-0">
            🧸
          </div>
          <div className="space-y-1">
            <h4 className="text-sm font-serif font-black text-pink-900 tracking-tight flex items-center gap-2">
              <span>Lumina Diagnostic Tip</span>
              <span className="text-pink-400 bg-pink-100/40 text-[8px] font-sans font-extrabold uppercase px-2 py-0.5 rounded-full tracking-wider">Education</span>
            </h4>
            <p className="text-[10px] text-pink-700/80 leading-relaxed max-w-xl font-medium">
              Basal body temperatures typically exhibit a biphasic shift: lower in the follicular stage, rising by 0.3°C - 0.5°C directly following ovulation due to progesterone production. Keep tracking to lock-in exact fertile boundaries!
            </p>
          </div>
        </div>
        <button 
          onClick={() => {
            const url = "https://www.acog.org/womens-health/faqs/fertility-awareness-based-methods-of-family-planning";
            window.open(url, "_blank");
          }}
          className="px-5 py-2.5 bg-white border border-pink-100 rounded-full text-[9px] font-extrabold uppercase text-pink-900 tracking-wider hover:bg-rose-50/30 cursor-pointer shadow-sm flex items-center gap-1.5 shrink-0 transition-all active:scale-95"
        >
          <span>ACOG Guidelines</span>
          <ChevronRight size={11} className="text-pink-400" />
        </button>
      </div>
    </div>
  );
};

export default CycleGraph;
