import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart, Bar, LineChart, Line, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend
} from 'recharts';
import {
  X, Activity, ShieldAlert, TrendingUp, Heart, CheckCircle2, RefreshCw, BarChart2, ShieldCheck, Trash2
} from 'lucide-react';
import { collection, getDocs, query, orderBy, limit, where } from 'firebase/firestore';
import { db, auth } from '../services/firebase';
import { hasConsent, purgeTelemetryStorage } from '../services/analyticsService';

interface AnalyticsDashboardModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AnalyticsDashboardModal: React.FC<AnalyticsDashboardModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'features' | 'conversions' | 'crashes'>('overview');
  const [loading, setLoading] = useState<boolean>(true);
  const [eventsList, setEventsList] = useState<any[]>([]);
  const [crashesList, setCrashesList] = useState<any[]>([]);
  const [perfList, setPerfList] = useState<any[]>([]);

  const analyticsConsented = hasConsent('analytics');
  const perfConsented = hasConsent('performance');

  const loadAnalyticsData = async () => {
    setLoading(true);
    try {
      if (!analyticsConsented && !perfConsented) {
        purgeTelemetryStorage({ analytics: true, performance: true });
        setEventsList([]);
        setCrashesList([]);
        setPerfList([]);
        setLoading(false);
        return;
      }

      const localEvents = analyticsConsented
        ? JSON.parse(localStorage.getItem('lumina_analytics_events') || '[]')
        : [];
      const localCrashes = (analyticsConsented || perfConsented)
        ? JSON.parse(localStorage.getItem('lumina_crash_reports') || '[]')
        : [];
      const localPerf = perfConsented
        ? JSON.parse(localStorage.getItem('lumina_perf_metrics') || '[]')
        : [];

      let firestoreEvents: any[] = [];
      let firestoreCrashes: any[] = [];

      try {
        if (db && auth.currentUser?.uid) {
          const uid = auth.currentUser.uid;
          if (analyticsConsented) {
            const eventsSnap = await getDocs(
              query(collection(db, 'analytics_events'), where('userId', '==', uid), orderBy('timestamp', 'desc'), limit(150))
            );
            firestoreEvents = eventsSnap.docs.map(d => d.data());
          }

          if (analyticsConsented || perfConsented) {
            const crashesSnap = await getDocs(
              query(collection(db, 'crash_reports'), where('userId', '==', uid), orderBy('timestamp', 'desc'), limit(50))
            );
            firestoreCrashes = crashesSnap.docs.map(d => d.data());
          }
        }
      } catch {
        // Fallback to local consented records only
      }

      setEventsList([...firestoreEvents, ...localEvents]);
      setCrashesList([...firestoreCrashes, ...localCrashes]);
      setPerfList(Array.isArray(localPerf) ? localPerf : []);
    } catch {
      setEventsList([]);
      setCrashesList([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadAnalyticsData();
    }
  }, [isOpen]);

  const metrics = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    const eventsToday = eventsList.filter(e => (e.timestamp || '').startsWith(todayStr)).length;
    const screenViews = eventsList.filter(e => e.eventName === 'Screen View').length;
    const periodLogs = eventsList.filter(e => (e.eventName || '').includes('Period')).length;
    const diaryActions = eventsList.filter(e => (e.eventName || '').includes('Diary')).length;
    const partnerEvents = eventsList.filter(e => (e.eventName || '').includes('Partner')).length;
    const latestLcp = perfList.find(m => m.name === 'LCP');

    return {
      totalEvents: eventsList.length,
      eventsToday,
      screenViews,
      periodLogs,
      diaryActions,
      partnerEvents,
      totalCrashes: crashesList.length,
      latestLcpMs: latestLcp ? `${latestLcp.value}ms` : 'N/A',
    };
  }, [eventsList, crashesList, perfList]);

  const weeklyActivityData = useMemo(() => {
    const days: { day: string; date: string; Events: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const isoDate = d.toISOString().split('T')[0];
      const label = d.toLocaleDateString('en-US', { weekday: 'short' });
      const count = eventsList.filter(e => (e.timestamp || '').startsWith(isoDate)).length;
      days.push({ day: label, date: isoDate, Events: count });
    }
    return days;
  }, [eventsList]);

  const featureUsageData = useMemo(() => {
    const counts: Record<string, number> = {};
    eventsList.forEach((evt) => {
      const label = evt.properties?.screen
        ? `Screen: ${evt.properties.screen}`
        : (evt.eventName || 'Other');
      counts[label] = (counts[label] || 0) + 1;
    });
    const palette = ['#f43f5e', '#8b5cf6', '#ec4899', '#10b981', '#f59e0b', '#06b6d4'];
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([feature, usage], idx) => ({
        feature,
        usage,
        fill: palette[idx % palette.length],
      }));
  }, [eventsList]);

  if (!isOpen) return null;

  return (
    <div id="analytics_dashboard_modal" className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-stone-900/60 backdrop-blur-md animate-fadeIn">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-3xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden font-sans text-stone-800 dark:text-stone-100"
      >
        <div className="px-6 py-5 border-b border-stone-100 dark:border-stone-800 flex items-center justify-between bg-stone-50/50 dark:bg-stone-950/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-rose-500 to-indigo-600 flex items-center justify-center text-white shadow-md">
              <Activity size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-serif italic font-bold">Your Privacy-Scoped Insights &amp; Diagnostics</h2>
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 ${analyticsConsented || perfConsented ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300' : 'bg-stone-200 dark:bg-stone-800 text-stone-700 dark:text-stone-300'}`}>
                  {analyticsConsented || perfConsented ? 'Consent Active' : 'Telemetry Off'}
                </span>
              </div>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                Displays strictly your own consented session metrics (zero health notes or PII stored)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {(analyticsConsented || perfConsented) && (
              <button
                type="button"
                onClick={() => {
                  purgeTelemetryStorage({ analytics: true, performance: true });
                  localStorage.removeItem('lumina_crash_reports');
                  setEventsList([]);
                  setCrashesList([]);
                  setPerfList([]);
                }}
                className="px-3 py-2 rounded-xl border border-stone-200 dark:border-stone-800 hover:bg-rose-50 text-xs font-bold text-rose-600 flex items-center gap-1 cursor-pointer"
                title="Clear Local Telemetry"
              >
                <Trash2 size={14} /> Clear Local
              </button>
            )}
            <button
              type="button"
              onClick={loadAnalyticsData}
              className="p-2.5 rounded-xl border border-stone-200 dark:border-stone-800 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors text-stone-500 dark:text-stone-400 cursor-pointer"
              title="Refresh Diagnostics"
            >
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2.5 rounded-xl border border-stone-200 dark:border-stone-800 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors text-stone-500 dark:text-stone-400 cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="px-6 pt-3 border-b border-stone-100 dark:border-stone-800 flex items-center gap-2 overflow-x-auto bg-white dark:bg-stone-900">
          <button
            type="button"
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-2.5 border-b-2 text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'overview'
                ? 'border-rose-500 text-rose-600 dark:text-rose-400 font-extrabold'
                : 'border-transparent text-stone-500 hover:text-stone-800 dark:hover:text-stone-200'
            }`}
          >
            <TrendingUp size={14} /> Session Activity
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('features')}
            className={`px-4 py-2.5 border-b-2 text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'features'
                ? 'border-rose-500 text-rose-600 dark:text-rose-400 font-extrabold'
                : 'border-transparent text-stone-500 hover:text-stone-800 dark:hover:text-stone-200'
            }`}
          >
            <BarChart2 size={14} /> Your Top Screens
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('conversions')}
            className={`px-4 py-2.5 border-b-2 text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'conversions'
                ? 'border-rose-500 text-rose-600 dark:text-rose-400 font-extrabold'
                : 'border-transparent text-stone-500 hover:text-stone-800 dark:hover:text-stone-200'
            }`}
          >
            <Heart size={14} /> Performance &amp; Privacy
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('crashes')}
            className={`px-4 py-2.5 border-b-2 text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'crashes'
                ? 'border-rose-500 text-rose-600 dark:text-rose-400 font-extrabold'
                : 'border-transparent text-stone-500 hover:text-stone-800 dark:hover:text-stone-200'
            }`}
          >
            <ShieldAlert size={14} /> Diagnostics Log ({metrics.totalCrashes})
          </button>
        </div>

        <div className="p-6 flex-grow overflow-y-auto space-y-6">
          {!analyticsConsented && !perfConsented && (
            <div className="p-5 rounded-2xl bg-stone-50 dark:bg-stone-950/60 border border-stone-200 dark:border-stone-800 flex items-start gap-3">
              <ShieldCheck size={20} className="text-emerald-600 shrink-0 mt-0.5" />
              <div className="space-y-1 text-xs">
                <p className="font-bold text-stone-900 dark:text-stone-100">Optional Analytics &amp; Diagnostics Are Disabled</p>
                <p className="text-stone-600 dark:text-stone-400 leading-relaxed">
                  Lumina respects your default privacy choice: no usage analytics or crash logs are collected unless you explicitly opt in via Privacy &amp; Cookie Settings.
                </p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="p-4 rounded-2xl bg-rose-50/60 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30">
              <span className="text-[10px] font-black uppercase tracking-wider text-rose-600 dark:text-rose-400">Events Today</span>
              <p className="text-2xl font-black text-rose-950 dark:text-rose-100 mt-1">{metrics.eventsToday}</p>
              <p className="text-[10px] text-rose-500 dark:text-rose-400 mt-0.5">{metrics.totalEvents} total recorded</p>
            </div>

            <div className="p-4 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/30">
              <span className="text-[10px] font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400">Screen Visits</span>
              <p className="text-2xl font-black text-indigo-950 dark:text-indigo-100 mt-1">{metrics.screenViews}</p>
              <p className="text-[10px] text-indigo-500 dark:text-indigo-400 mt-0.5">Consented navigation events</p>
            </div>

            <div className="p-4 rounded-2xl bg-purple-50/60 dark:bg-purple-950/20 border border-purple-100 dark:border-purple-900/30">
              <span className="text-[10px] font-black uppercase tracking-wider text-purple-600 dark:text-purple-400">Cycle &amp; Diary Actions</span>
              <p className="text-2xl font-black text-purple-950 dark:text-purple-100 mt-1">{metrics.periodLogs + metrics.diaryActions}</p>
              <p className="text-[10px] text-purple-500 dark:text-purple-400 mt-0.5">Action counts only (zero content)</p>
            </div>

            <div className="p-4 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30">
              <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Largest Paint (LCP)</span>
              <p className="text-2xl font-black text-emerald-950 dark:text-emerald-100 mt-1">{metrics.latestLcpMs}</p>
              <p className="text-[10px] text-emerald-500 dark:text-emerald-400 mt-0.5">Local performance timing</p>
            </div>
          </div>

          {activeTab === 'overview' && (
            <div className="p-5 bg-stone-50 dark:bg-stone-950/50 rounded-2xl border border-stone-200 dark:border-stone-800">
              <h3 className="text-sm font-bold text-stone-800 dark:text-stone-200 mb-4 flex items-center justify-between">
                <span>Your 7-Day Consented Activity</span>
                <span className="text-[10px] text-stone-400 font-normal">Computed strictly from your account logs</span>
              </h3>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={weeklyActivityData}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                    <XAxis dataKey="day" stroke="#a8a29e" fontSize={11} />
                    <YAxis allowDecimals={false} stroke="#a8a29e" fontSize={11} />
                    <Tooltip contentStyle={{ backgroundColor: '#1c1917', borderRadius: '12px', border: 'none', color: '#fff', fontSize: '12px' }} />
                    <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                    <Line type="monotone" dataKey="Events" stroke="#f43f5e" strokeWidth={3} dot={{ r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {activeTab === 'features' && (
            <div className="p-5 bg-stone-50 dark:bg-stone-950/50 rounded-2xl border border-stone-200 dark:border-stone-800">
              <h3 className="text-sm font-bold text-stone-800 dark:text-stone-200 mb-4">Your Recorded Activity Breakdown</h3>
              {featureUsageData.length === 0 ? (
                <p className="text-xs text-stone-500 py-8 text-center">No consented usage events recorded yet.</p>
              ) : (
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={featureUsageData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                      <XAxis type="number" allowDecimals={false} stroke="#a8a29e" fontSize={11} />
                      <YAxis dataKey="feature" type="category" stroke="#a8a29e" fontSize={11} width={140} />
                      <Tooltip contentStyle={{ backgroundColor: '#1c1917', borderRadius: '12px', border: 'none', color: '#fff', fontSize: '12px' }} />
                      <Bar dataKey="usage" radius={[0, 8, 8, 0]}>
                        {featureUsageData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          )}

          {activeTab === 'conversions' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 space-y-2">
                <h4 className="text-xs font-bold text-stone-800 dark:text-stone-200">Recent Web Vitals</h4>
                {perfList.length === 0 ? (
                  <p className="text-xs text-stone-500">No performance metrics captured (requires Performance consent).</p>
                ) : (
                  <div className="space-y-1.5 max-h-48 overflow-y-auto">
                    {perfList.slice(0, 8).map((m, i) => (
                      <div key={i} className="flex justify-between text-xs p-2 rounded-xl bg-stone-50 dark:bg-stone-950/60">
                        <span className="font-semibold">{m.name}</span>
                        <span className="font-mono">{m.value}{m.unit === 'ms' ? ' ms' : ''}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="p-4 rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 space-y-2">
                <h4 className="text-xs font-bold text-stone-800 dark:text-stone-200">Privacy &amp; Data Minimization Guard</h4>
                <p className="text-xs text-stone-600 dark:text-stone-300 leading-relaxed">
                  Lumina never collects diary contents, symptom details, partner emails, or menstrual dates into analytics or diagnostics logs. Revoking consent immediately clears local diagnostic caches.
                </p>
              </div>
            </div>
          )}

          {activeTab === 'crashes' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-stone-800 dark:text-stone-200 flex items-center gap-2">
                  <ShieldAlert size={16} className="text-rose-500" />
                  Sanitized Diagnostics Log
                </h3>
                <span className="text-xs text-stone-500">
                  Total Captured: {crashesList.length}
                </span>
              </div>

              {crashesList.length === 0 ? (
                <div className="p-8 text-center bg-stone-50 dark:bg-stone-950/40 rounded-2xl border border-stone-200 dark:border-stone-800 space-y-2">
                  <CheckCircle2 size={32} className="text-emerald-500 mx-auto" />
                  <p className="text-sm font-bold text-stone-800 dark:text-stone-200">No Recorded Runtime Errors</p>
                  <p className="text-xs text-stone-500">Diagnostics are clean or opt-in diagnostics are disabled.</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1">
                  {crashesList.map((crash, idx) => (
                    <div key={crash.id || idx} className="p-3.5 rounded-xl border border-rose-200 dark:border-rose-900/40 bg-rose-50/30 dark:bg-rose-950/20 text-xs space-y-1">
                      <div className="flex items-center justify-between font-bold text-rose-700 dark:text-rose-300">
                        <span className="uppercase tracking-wider text-[10px] bg-rose-100 dark:bg-rose-900/60 px-2 py-0.5 rounded-md">
                          {crash.category || 'App Crash'}
                        </span>
                        <span className="text-[10px] font-mono text-stone-400">
                          {crash.timestamp ? new Date(crash.timestamp).toLocaleTimeString() : 'Just now'}
                        </span>
                      </div>
                      <p className="font-mono text-stone-800 dark:text-stone-200 font-semibold break-all">
                        {crash.errorMessage}
                      </p>
                      {crash.errorStack && (
                        <pre className="text-[10px] font-mono text-stone-500 bg-black/5 dark:bg-black/30 p-2 rounded-lg overflow-x-auto max-h-20">
                          {crash.errorStack}
                        </pre>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="p-4 border-t border-stone-100 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-950/50 flex items-center justify-between text-xs text-stone-500">
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${analyticsConsented ? 'bg-emerald-500' : 'bg-stone-400'}`}></span>
            <span>Analytics: <strong className="text-stone-700 dark:text-stone-300">{analyticsConsented ? 'Consented' : 'Off'}</strong></span>
            <span className="mx-1">•</span>
            <span>Diagnostics: <strong className="text-stone-700 dark:text-stone-300">{perfConsented ? 'Consented' : 'Off'}</strong></span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-stone-800 hover:bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900 dark:hover:bg-white rounded-xl font-bold transition-all cursor-pointer"
          >
            Close Dashboard
          </button>
        </div>
      </motion.div>
    </div>
  );
};
