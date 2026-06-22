import React, { useState, useMemo } from 'react';
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
  Cell
} from 'recharts';
import { motion } from 'framer-motion';
import { 
  TrendingUp, 
  Activity, 
  Thermometer, 
  Sparkles, 
  Info,
  ChevronRight,
  Heart
} from 'lucide-react';
import { User, Period, Symptom, TemperatureLog } from '../types';

interface CycleGraphProps {
  user: User;
}

export const CycleGraph: React.FC<CycleGraphProps> = ({ user }) => {
  const [activeTab, setActiveTab] = useState<'history' | 'symptoms' | 'temperature'>('history');

  // 1. Calculate stats and chart data for Period / Cycle History
  const historyData = useMemo(() => {
    const sortedPeriods = [...(user.periods || [])].sort(
      (a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
    );

    if (sortedPeriods.length === 0) {
      // Fallback/Default mock data to show an elegant baseline if user hasn't logged anything yet.
      return [
        { name: 'Cycle 1', periodLength: user.periodLength || 5, cycleLength: user.cycleLength || 28 },
        { name: 'Cycle 2', periodLength: (user.periodLength || 5) + 1, cycleLength: (user.cycleLength || 28) - 1 },
        { name: 'Cycle 3', periodLength: user.periodLength || 5, cycleLength: (user.cycleLength || 28) + 2 },
        { name: 'Current Cycle', periodLength: user.periodLength || 5, cycleLength: user.cycleLength || 28 }
      ];
    }

    return sortedPeriods.map((period, index) => {
      // Period Length in days
      const start = new Date(period.startDate);
      const end = new Date(period.endDate);
      const diffTime = Math.abs(end.getTime() - start.getTime());
      const periodLength = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));

      // Estimate cycle length if there's a next period
      let cycleLength = user.cycleLength || 28;
      if (index < sortedPeriods.length - 1) {
        const nextStart = new Date(sortedPeriods[index + 1].startDate);
        const cycleDiff = Math.abs(nextStart.getTime() - start.getTime());
        cycleLength = Math.ceil(cycleDiff / (1000 * 60 * 60 * 24));
      }

      const formattedDate = start.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

      return {
        name: formattedDate,
        periodLength,
        cycleLength
      };
    });
  }, [user.periods, user.periodLength, user.cycleLength]);

  // Dynamic statistics calculations
  const statsSummary = useMemo(() => {
    const isMock = !user.periods || user.periods.length === 0;
    
    if (isMock) {
      return {
        avgPeriod: user.periodLength || 5,
        avgCycle: user.cycleLength || 28,
        variation: 'Stable (Model Baseline)',
        isMock: true
      };
    }

    const periodsData = historyData;
    const avgPeriod = Math.round(
      periodsData.reduce((acc, curr) => acc + curr.periodLength, 0) / periodsData.length
    );
    const avgCycle = Math.round(
      periodsData.reduce((acc, curr) => acc + curr.cycleLength, 0) / periodsData.length
    );

    const cycles = periodsData.map(p => p.cycleLength);
    const minCycle = Math.min(...cycles);
    const maxCycle = Math.max(...cycles);
    const variation = maxCycle - minCycle <= 2 ? 'Highly Regular' : maxCycle - minCycle <= 5 ? 'Moderate Variation' : 'Irregular Cycle';

    return {
      avgPeriod,
      avgCycle,
      variation,
      isMock: false
    };
  }, [historyData, user.periodLength, user.cycleLength, user.periods]);

  // 2. Aggregate logged symptoms
  const symptomData = useMemo(() => {
    const symptoms = user.symptoms || [];
    if (symptoms.length === 0) {
      // Default baseline data for empty-state aesthetics
      return [
        { symptom: 'Cramps', count: 0 },
        { symptom: 'Headache', count: 0 },
        { symptom: 'Bloating', count: 0 },
        { symptom: 'Fatigue', count: 0 },
        { symptom: 'Moody', count: 0 }
      ];
    }

    const symptomCounts: Record<string, number> = {};
    symptoms.forEach(sym => {
      const label = sym.type.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase());
      symptomCounts[label] = (symptomCounts[label] || 0) + 1;
    });

    return Object.entries(symptomCounts)
      .map(([symptom, count]) => ({ symptom, count }))
      .sort((a, b) => b.count - a.count);
  }, [user.symptoms]);

  // 3. Basal Body Temperature Logs
  const temperatureData = useMemo(() => {
    const logs = [...(user.tempLogs || [])].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    if (logs.length === 0) {
      // Elegant sinusoidal mock path to represent a biological thermal cycle
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

  // Aesthetic color arrays matches our standard theme
  const barColors = ['#f472b6', '#f43f5e', '#fda4af', '#fbcfe8', '#db2777', '#f472b6'];

  return (
    <div className="space-y-6 select-none animate-fadeIn">
      {/* Dynamic Health Stats Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-pink-50/50 to-pink-100/20 border border-pink-100/60 p-5 rounded-[2.2rem] flex items-center gap-4 shadow-sm">
          <div className="w-12 h-12 bg-pink-400 text-white rounded-2xl flex items-center justify-center text-xl shadow-md shadow-pink-100">
            🩸
          </div>
          <div>
            <p className="text-[9px] font-bold text-pink-400 uppercase tracking-widest">Average Period</p>
            <h4 className="text-2xl font-serif font-black text-pink-900 tracking-tight">
              {statsSummary.avgPeriod} <span className="text-xs font-sans font-bold text-pink-500">Days</span>
            </h4>
          </div>
        </div>

        <div className="bg-gradient-to-br from-rose-50/50 to-rose-100/20 border border-pink-100/40 p-5 rounded-[2.2rem] flex items-center gap-4 shadow-sm">
          <div className="w-12 h-12 bg-rose-400 text-white rounded-2xl flex items-center justify-center text-xl shadow-md shadow-rose-100">
            🔄
          </div>
          <div>
            <p className="text-[9px] font-bold text-pink-400 uppercase tracking-widest">Average Cycle</p>
            <h4 className="text-2xl font-serif font-black text-pink-900 tracking-tight">
              {statsSummary.avgCycle} <span className="text-xs font-sans font-bold text-pink-500">Days</span>
            </h4>
          </div>
        </div>

        <div className="bg-gradient-to-br from-[#fafafb] to-pink-50/10 border border-pink-100/30 p-5 rounded-[2.2rem] flex items-center gap-4 shadow-sm">
          <div className="w-12 h-12 bg-pink-200 text-pink-600 rounded-2xl flex items-center justify-center text-xl shadow-md">
            ✨
          </div>
          <div>
            <p className="text-[9px] font-bold text-pink-400 uppercase tracking-widest">Regularity</p>
            <h4 className="text-base font-serif font-black text-pink-900 leading-tight">
              {statsSummary.variation}
            </h4>
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
              <span>Bio-Metrics & Trends</span>
            </h3>
            <p className="text-[10px] text-gray-400 font-medium">
              Interactive physiological analysis and historical pattern tracking.
            </p>
          </div>

          {/* Toggle Pills */}
          <div className="flex bg-pink-50/50 p-1.5 rounded-full border border-pink-100/40 shrink-0">
            {[
              { id: 'history', label: 'Cycle Timeline', icon: <Activity size={12} /> },
              { id: 'symptoms', label: 'Symptoms', icon: <Sparkles size={12} /> },
              { id: 'temperature', label: 'Basal Temp', icon: <Thermometer size={12} /> }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-[9px] font-extrabold uppercase tracking-widest transition-all ${
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

        {/* Informative Banner when showing baseline mock data */}
        {statsSummary.isMock && activeTab === 'history' && (
          <div className="bg-amber-50/70 border border-amber-100 rounded-2xl p-4 flex gap-3 text-amber-800">
            <Info className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <p className="text-[10px] font-extrabold uppercase tracking-wide">Historical Preview Mode</p>
              <p className="text-[9px] text-amber-700/80 font-medium leading-relaxed">
                Log consecutive period cycles inside the Diary or Tracker to see personal automated cycle length calculation charts compile here dynamically.
              </p>
            </div>
          </div>
        )}

        {/* Graphic Output Container */}
        <div className="h-72 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            {activeTab === 'history' ? (
              <BarChart data={historyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
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
                  labelStyle={{ fontWeight: 'extrabold', color: '#db2777', fontSize: '10px' }}
                />
                <Legend 
                  verticalAlign="top" 
                  height={36} 
                  wrapperStyle={{ fontSize: '9px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.05em' }}
                />
                <Bar 
                  dataKey="periodLength" 
                  name="Bleeding Duration (Days)" 
                  fill="#f43f5e" 
                  radius={[12, 12, 0, 0]} 
                  maxBarSize={38} 
                />
                <Bar 
                  dataKey="cycleLength" 
                  name="Total Cycle Duration (Days)" 
                  fill="#fbcfe8" 
                  radius={[12, 12, 0, 0]} 
                  maxBarSize={38} 
                />
              </BarChart>
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
