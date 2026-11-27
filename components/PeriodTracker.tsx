
import React, { useState, useMemo, useEffect } from 'react';
import { 
  FileText, 
  TrendingUp, 
  Calendar, 
  Activity, 
  Smile, 
  Droplet, 
  Sparkles, 
  Download, 
  Share2, 
  Heart, 
  Info, 
  Baby, 
  Layers, 
  Scale, 
  HeartPulse, 
  Eye, 
  Plus, 
  Printer,
  ChevronRight,
  ChevronDown,
  ChevronLeft,
  Trash2,
  X,
  Check,
  Lock,
  Shield,
  AlertTriangle,
  Pill,
  Moon,
  BarChart3,
  Clock,
  Stethoscope,
  Edit3
} from 'lucide-react';
import { User, Symptom, BirthControlLog, BirthControlConfig, TemperatureLog, Period, PeriodLog } from '../types';
import { SYMPTOMS } from '../constants';
import TemperatureTracker from './TemperatureTracker';
import { ExpectedPeriodCheckInCard } from './ExpectedPeriodCheckInCard';
import { CycleGraph } from './CycleGraph';
import { getCycleAnalytics } from '../services/cycleAnalyticsService';
import { 
  calculateCycleSyncData, 
  getCycleDetailsForSpecificDate, 
  CycleSyncData, 
  formatYMD, 
  parseYMDToLocalDate, 
  reconstructCycleData 
} from '../services/cycleSyncService';
import { syncUser } from '../services/firebaseService';
import { logAvatarActionReward } from '../services/avatarService';
import { secureStorage } from '../services/secureStorage';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell, 
  LineChart, 
  Line, 
  AreaChart, 
  Area, 
  Legend, 
  ReferenceLine 
} from 'recharts';
import { motion } from 'framer-motion';

interface PeriodTrackerProps {
  user: User;
  symptoms: Symptom[];
  setSymptoms: React.Dispatch<React.SetStateAction<Symptom[]>>;
  bcLogs: BirthControlLog[];
  setBcLogs: React.Dispatch<React.SetStateAction<BirthControlLog[]>>;
  onUpdateBCConfig: (config: BirthControlConfig) => void;
  onUpdatePeriodDates: (dates: string[]) => void;
  tempLogs: TemperatureLog[];
  setTempLogs: React.Dispatch<React.SetStateAction<TemperatureLog[]>>;
  onUpdateTempUnit: (unit: 'C' | 'F') => void;
  onOpenLogModal?: () => void;
  onOpenDoctorReport?: () => void;
  setUser?: React.Dispatch<React.SetStateAction<User | null>>;
}

type TrackerView = 'calendar' | 'cycle' | 'history' | 'timeline' | 'stats';

const PeriodTracker: React.FC<PeriodTrackerProps> = ({ 
  user, 
  symptoms, 
  setSymptoms, 
  bcLogs, 
  setBcLogs,
  onUpdateBCConfig,
  onUpdatePeriodDates,
  tempLogs,
  setTempLogs,
  onUpdateTempUnit,
  onOpenLogModal,
  onOpenDoctorReport,
  setUser
}) => {
  const [activeView, setActiveView] = useState<TrackerView>('cycle');
  const [viewingPeriodId, setViewingPeriodId] = useState<string | null>(null);
  const [editingPeriodData, setEditingPeriodData] = useState<{
    id: string;
    startDate: string;
    endDate: string;
    intensity: 'spotting' | 'light' | 'medium' | 'heavy';
  } | null>(null);
  const [isAddingPeriod, setIsAddingPeriod] = useState<boolean>(false);
  const [isViewingTrends, setIsViewingTrends] = useState<boolean>(false);
  const [newPeriodData, setNewPeriodData] = useState({
    startDate: formatYMD(new Date()),
    endDate: formatYMD(new Date(Date.now() + 4 * 24 * 60 * 60 * 1000)),
    intensity: 'medium' as 'spotting' | 'light' | 'medium' | 'heavy'
  });
  const [deletingSymptomId, setDeletingSymptomId] = useState<string | null>(null);
  const [deletingIntimacyConfirm, setDeletingIntimacyConfirm] = useState<boolean>(false);
  const [deletingBCConfirm, setDeletingBCConfirm] = useState<boolean>(false);
  const [deletePeriodConfirmId, setDeletePeriodConfirmId] = useState<string | null>(null);
  const [pendingDeleteTimelineEventId, setPendingDeleteTimelineEventId] = useState<string | null>(null);
  const [activeGraphTab, setActiveGraphTab] = useState<'cycle-length' | 'period-length' | 'symptoms' | 'moods' | 'flows' | 'fertility' | 'pregnancy'>(user.isPregnancyMode ? 'pregnancy' : 'cycle-length');
  const DEFAULT_PREGNANCY_WEIGHTS = [
    { week: 4, weight: 62.0 },
    { week: 8, weight: 62.8 },
    { week: 12, weight: 63.5 },
    { week: 16, weight: 64.8 },
    { week: 20, weight: 66.2 },
    { week: 24, weight: 68.0 },
  ];
  const [pregnancyWeightLogs, setPregnancyWeightLogs] = useState<{ week: number; weight: number }[]>(DEFAULT_PREGNANCY_WEIGHTS);

  useEffect(() => {
    let cancelled = false;
    const key = `pregnancy_weight_${user?.id || 'default'}`;
    (async () => {
      try {
        const legacyPlain = localStorage.getItem(key);
        if (legacyPlain) {
          const parsed = JSON.parse(legacyPlain);
          await secureStorage.setItem(key, JSON.stringify(parsed));
          localStorage.removeItem(key);
          if (!cancelled && Array.isArray(parsed)) {
            setPregnancyWeightLogs(parsed);
            return;
          }
        }
        const encrypted = await secureStorage.getItem(key);
        if (!cancelled && encrypted) {
          const parsed = JSON.parse(encrypted);
          if (Array.isArray(parsed)) setPregnancyWeightLogs(parsed);
        }
      } catch {
        // Retain default fallback on storage error
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);
  const [newWeightVal, setNewWeightVal] = useState('');
  const [newWeightWeek, setNewWeightWeek] = useState('25');
  const [showExportReport, setShowExportReport] = useState(false);
  const [reportDownloadState, setReportDownloadState] = useState<'none' | 'success'>('none');
  const [isSettingBC, setIsSettingBC] = useState(false);
  const [bcMethod, setBcMethod] = useState(user.birthControlConfig?.method || 'Pill');
  const [bcFrequency, setBcFrequency] = useState<BirthControlConfig['frequency']>(user.birthControlConfig?.frequency || 'daily');
  const [bcTime, setBcTime] = useState(user.birthControlConfig?.reminderTime || '09:00');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<Date>(new Date());
  const [timelineCategoryFilter, setTimelineCategoryFilter] = useState<'all' | 'periods' | 'symptoms' | 'mood' | 'intimacy'>('all');
  const [expandedTimelineId, setExpandedTimelineId] = useState<string | null>(null);

  // Central Cycle Analytics for insights & reports
  const analytics = useMemo(() => {
    return getCycleAnalytics(user, symptoms);
  }, [user, symptoms]);

  // Deep Bio-Aware Cycle Graph Datasets
  const cycleChartData = useMemo(() => {
    const baseMonths = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
    const defaultFlows: Record<string, { light: number; medium: number; heavy: number }> = {
      Jan: { light: 1, medium: 2, heavy: 2 },
      Feb: { light: 2, medium: 2, heavy: 1 },
      Mar: { light: 1, medium: 1, heavy: 3 },
      Apr: { light: 1, medium: 3, heavy: 1 },
      May: { light: 1, medium: 2, heavy: 2 },
      Jun: { light: 2, medium: 2, heavy: 1 },
    };

    const pastPeriods = [...(user.periods || [])].sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
    
    let data = baseMonths.map((m, idx) => {
      const uCycle = user.cycleLength || 28;
      const uPeriod = user.periodLength || 5;
      const bioCycleOffset = idx === 1 ? 2 : idx === 2 ? -1 : idx === 4 ? 2 : idx === 5 ? -2 : 0;
      const bioPeriodOffset = idx === 1 ? 1 : idx === 2 ? -1 : 0;
      
      return {
        month: m,
        cycleLength: uCycle + bioCycleOffset,
        periodLength: uPeriod + bioPeriodOffset,
        light: defaultFlows[m]?.light || 1,
        medium: defaultFlows[m]?.medium || 2,
        heavy: defaultFlows[m]?.heavy || 2,
      };
    });

    if (pastPeriods.length >= 2) {
      const userLoggedData = [];
      for (let i = 1; i < pastPeriods.length; i++) {
        const p1 = pastPeriods[i-1];
        const p2 = pastPeriods[i];
        const p1Start = new Date(p1.startDate);
        const p1End = new Date(p1.endDate);
        const p2Start = new Date(p2.startDate);
        
        const cycleLen = Math.round((p2Start.getTime() - p1Start.getTime()) / (1000 * 60 * 60 * 24));
        const periodLen = Math.round((p1End.getTime() - p1Start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
        
        userLoggedData.push({
          month: p1Start.toLocaleDateString('en-US', { month: 'short' }),
          cycleLength: (cycleLen > 15 && cycleLen < 45) ? cycleLen : (user.cycleLength || 28),
          periodLength: periodLen > 0 && periodLen < 15 ? periodLen : (user.periodLength || 5),
          light: p1.intensity === 'light' ? 2 : p1.intensity === 'spotting' ? 3 : 1,
          medium: p1.intensity === 'medium' ? 3 : 1,
          heavy: p1.intensity === 'heavy' ? 2 : 0,
        });
      }
      if (userLoggedData.length > 0) {
        data = [...data.slice(0, Math.max(0, 6 - userLoggedData.length)), ...userLoggedData];
      }
    }

    return data;
  }, [user.periods, user.cycleLength, user.periodLength]);

  const symptomWeeklyData = useMemo(() => {
    const weeks = ['Week 1 (Menstrual)', 'Week 2 (Follicular)', 'Week 3 (Ovulation)', 'Week 4 (Luteal)'];
    
    const symptomMap: Record<string, number[]> = {
      cramps: [3, 0, 0.5, 1.2],
      headache: [1, 0.5, 0.5, 2.0],
      bloating: [2, 0.2, 1.0, 3.0],
      fatigue: [3, 1, 1, 3],
      tender_breasts: [1, 0, 1.5, 2.8],
    };

    if (symptoms && symptoms.length > 0) {
      symptoms.forEach((s, idx) => {
        const type = s.type === 'back_pain' || s.type === 'cramps' ? 'cramps' :
                     s.type === 'brain_fog' || s.type === 'headache' ? 'headache' :
                     s.type === 'bloating' ? 'bloating' :
                     s.type === 'fatigue' || s.type === 'insomnia' ? 'fatigue' :
                     s.type === 'tender_breasts' ? 'tender_breasts' : 'fatigue';
        
        const intensity = s.intensity || 2;
        const weekIndex = idx % 4; // distribute
        if (symptomMap[type]) {
          symptomMap[type][weekIndex] = Math.min(3, symptomMap[type][weekIndex] + intensity * 0.4);
        }
      });
    }

    return weeks.map((w, idx) => ({
      week: w,
      Cramps: parseFloat(symptomMap.cramps[idx].toFixed(1)),
      Headaches: parseFloat(symptomMap.headache[idx].toFixed(1)),
      Bloating: parseFloat(symptomMap.bloating[idx].toFixed(1)),
      Fatigue: parseFloat(symptomMap.fatigue[idx].toFixed(1)),
      BreastTenderness: parseFloat(symptomMap.tender_breasts[idx].toFixed(1)),
    }));
  }, [symptoms]);

  const moodDistribution = useMemo(() => {
    const counts: Record<string, number> = {
      Happy: 14,
      Calm: 18,
      Emotional: 6,
      Irritable: 5,
      Anxious: 4,
    };

    if (user.moodLogs && user.moodLogs.length > 0) {
      user.moodLogs.forEach(ml => {
        const m = ml.mood === 'excited' ? 'Happy' :
                  ml.mood === 'sad' ? 'Emotional' :
                  ml.mood === 'tired' ? 'Emotional' : 
                  ml.mood === 'angry' ? 'Irritable' :
                  ml.mood === 'anxious' ? 'Anxious' :
                  ml.mood === 'calm' ? 'Calm' : 'Happy';
        if (counts[m] !== undefined) {
          counts[m] += 3;
        }
      });
    }

    return Object.entries(counts).map(([name, value]) => ({
      name,
      value
    }));
  }, [user.moodLogs]);

  const cycleHormoneData = useMemo(() => {
    const data = [];
    for (let day = 1; day <= 28; day++) {
      let estrogen = 10;
      if (day <= 5) estrogen = 15 - day;
      else if (day <= 13) estrogen = 10 + Math.pow(day - 5, 2.0);
      else if (day === 14) estrogen = 95;
      else if (day <= 22) estrogen = 35 + Math.sin((day - 15) * Math.PI / 7) * 15;
      else estrogen = 35 - (day - 22) * 3;

      let progesterone = 5;
      if (day > 14 && day <= 22) progesterone = 5 + Math.pow(day - 14, 1.8) * 1.5;
      else if (day > 22) progesterone = 5 + Math.max(0, 12 - (day - 22) * 2) * 1.5;

      let phase = 'Follicular Phase';
      if (day <= 5) phase = 'Menstrual Phase';
      else if (day >= 13 && day <= 15) phase = 'Ovulation Phase';
      else if (day > 15) phase = 'Luteal Phase';

      data.push({
        dayIndex: day,
        day: `Day ${day}`,
        Estrogen: Math.round(estrogen),
        Progesterone: Math.round(progesterone),
        phase
      });
    }
    return data;
  }, []);

  const pregnancyProgressionData = useMemo(() => {
    const weeksList = [4, 8, 12, 16, 20, 24, 28, 32, 36, 40];
    return weeksList.map(w => ({
      week: `Week ${w}`,
      weekNum: w,
      babyWeightGrams: w <= 12 ? w * 2 : w <= 24 ? w * 25 : w * 75,
      hcgLevel: Math.round(w <= 10 ? Math.pow(w, 2.5) * 350 + 500 : Math.max(2000, 150000 - (w - 10) * 4500)),
      fatigue: Math.round(w <= 12 ? 80 - w * 3 : w <= 28 ? 40 + (w - 12) * 1.2 : 70),
      fluidRetention: Math.round(w < 20 ? 10 + w * 1.2 : 30 + (w - 20) * 2),
      wellnessScore: Math.round(75 + Math.sin((w - 4) * Math.PI / 16) * 12),
    }));
  }, []);

  const handleAddWeightLog = (e: React.FormEvent) => {
    e.preventDefault();
    const w = parseFloat(newWeightVal);
    const wk = parseInt(newWeightWeek);
    if (!isNaN(w) && !isNaN(wk) && w > 0 && wk > 0 && wk <= 42) {
      const nextLogs = [...pregnancyWeightLogs, { week: wk, weight: w }].sort((a, b) => a.week - b.week);
      setPregnancyWeightLogs(nextLogs);
      const key = `pregnancy_weight_${user?.id || 'default'}`;
      void secureStorage.setItem(key, JSON.stringify(nextLogs));
      try { localStorage.removeItem(key); } catch {}
      setNewWeightVal('');
      setNewWeightWeek(String(wk + 1));
    }
  };

  const handleAddNewPeriod = async () => {
    if (!setUser || !user) return;
    if (!newPeriodData.startDate) return;

    const startLocal = parseYMDToLocalDate(newPeriodData.startDate);
    const periodDur = Math.max(1, user.periodLength || 5);
    let endLocal = newPeriodData.endDate 
      ? parseYMDToLocalDate(newPeriodData.endDate) 
      : new Date(startLocal.getTime() + (periodDur - 1) * 86400000);
    if (endLocal < startLocal) {
      endLocal = new Date(startLocal.getTime() + (periodDur - 1) * 86400000);
    }

    const nextPeriod: Period = {
      id: crypto.randomUUID(),
      startDate: startLocal.toDateString(),
      endDate: endLocal.toDateString(),
      intensity: newPeriodData.intensity
    };

    const combinedPeriods = [...(user.periods || []), nextPeriod];
    // Reconstruct dates strictly from active periods
    const reconstructed = reconstructCycleData(combinedPeriods, [], []);

    const updatedUser: User = {
      ...user,
      periods: reconstructed.periods,
      periodDates: reconstructed.periodDates,
      periodLogs: reconstructed.periodLogs,
      lastPeriodStart: reconstructed.lastPeriodStart || user.lastPeriodStart
    };

    setUser(updatedUser);
    setIsAddingPeriod(false);
    try {
      await syncUser(updatedUser);
    } catch (e) {
      console.error('Failed to sync new period to database:', e);
    }

    logAvatarActionReward(updatedUser, 'log_cycle', 'Logged Completed Cycle', setUser);
  };

  const handleSaveEditPeriod = async (
    periodId: string, 
    startYMD: string, 
    endYMD: string, 
    intensity: 'spotting' | 'light' | 'medium' | 'heavy'
  ) => {
    if (!setUser || !user) return;
    const startLocal = parseYMDToLocalDate(startYMD);
    const periodDur = Math.max(1, user.periodLength || 5);
    let endLocal = endYMD ? parseYMDToLocalDate(endYMD) : new Date(startLocal.getTime() + (periodDur - 1) * 86400000);
    if (endLocal < startLocal) {
      endLocal = new Date(startLocal.getTime() + (periodDur - 1) * 86400000);
    }

    const updatedPeriods = (user.periods || []).map(p => {
      if (p.id === periodId) {
        return {
          ...p,
          startDate: startLocal.toDateString(),
          endDate: endLocal.toDateString(),
          intensity
        };
      }
      return p;
    });

    // Reconstruct dates strictly from active periods
    const reconstructed = reconstructCycleData(updatedPeriods, [], []);

    const updatedUser: User = {
      ...user,
      periods: reconstructed.periods,
      periodDates: reconstructed.periodDates,
      periodLogs: reconstructed.periodLogs,
      lastPeriodStart: reconstructed.lastPeriodStart || user.lastPeriodStart
    };

    setUser(updatedUser);
    setEditingPeriodData(null);
    try {
      await syncUser(updatedUser);
    } catch (e) {
      console.error('Failed to sync edited period to database:', e);
    }
  };

  const handleDeletePeriod = async (periodId: string) => {
    if (!setUser || !user) return;
    const updatedPeriods = (user.periods || []).filter(p => p.id !== periodId);
    // Reconstruct dates strictly from active periods
    const reconstructed = reconstructCycleData(updatedPeriods, [], []);

    const updatedUser: User = {
      ...user,
      periods: reconstructed.periods,
      periodDates: reconstructed.periodDates,
      periodLogs: reconstructed.periodLogs,
      lastPeriodStart: reconstructed.lastPeriodStart || (updatedPeriods.length > 0 ? updatedPeriods[0].startDate : user.lastPeriodStart)
    };

    setUser(updatedUser);
    setEditingPeriodData(null);
    setDeletePeriodConfirmId(null);
    try {
      await syncUser(updatedUser);
    } catch (e) {
      console.error('Failed to sync deleted period to database:', e);
    }
  };

  const handleDeleteIntimacyLog = (logId: string) => {
    if (!setUser) return;
    setUser(prev => {
      if (!prev) return null;
      const nextLogs = (prev.sexualActivityLogs || []).filter(l => l.id !== logId);
      return { ...prev, sexualActivityLogs: nextLogs };
    });
  };

  const handleDeleteSymptom = (symptomId: string) => {
    setSymptoms(prev => prev.filter(s => s.id !== symptomId));
    if (setUser) {
      setUser(prev => {
        if (!prev) return null;
        const nextSymptoms = (prev.symptoms || []).filter(s => s.id !== symptomId);
        return { ...prev, symptoms: nextSymptoms };
      });
    }
  };

  const handleDeleteBCLog = (dateStr: string) => {
    setBcLogs(prev => prev.filter(l => l.date !== dateStr));
    if (setUser) {
      setUser(prev => {
        if (!prev) return null;
        const nextLogs = (prev.bcLogs || []).filter(l => l.date !== dateStr);
        return { ...prev, bcLogs: nextLogs };
      });
    }
  };

  const handleToggleAndCleanPeriodDate = (dateStr: string) => {
    if (!setUser) return;
    setUser(prev => {
      if (!prev) return null;
      const currentDates = prev.periodDates || [];
      const currentLogs = prev.periodLogs || [];
      const exists = currentDates.includes(dateStr);
      
      const newDates = exists ? currentDates.filter(d => d !== dateStr) : [...currentDates, dateStr];
      const newLogs: PeriodLog[] = exists ? currentLogs.filter(l => l.date !== dateStr) : [...currentLogs, { date: dateStr, intensity: 'medium' as const }];
      
      return {
        ...prev,
        periodDates: newDates,
        periodLogs: newLogs
      };
    });
  };

  const handleUpdatePeriodIntensity = (dateStr: string, intensity: PeriodLog['intensity']) => {
    if (!setUser) return;
    setUser(prev => {
      if (!prev) return null;
      const currentLogs = prev.periodLogs || [];
      const hasLog = currentLogs.some(l => l.date === dateStr);
      const newLogs = hasLog 
        ? currentLogs.map(l => l.date === dateStr ? { ...l, intensity } : l)
        : [...currentLogs, { date: dateStr, intensity }];
      return {
        ...prev,
        periodLogs: newLogs
      };
    });
  };

  const handleUpdateSexualActivity = (
    date: Date,
    hadSex: boolean,
    protection?: 'protected' | 'unprotected',
    ejaculation?: 'occurred' | 'none',
    contraceptiveMethod?: 'none' | 'condom' | 'pill' | 'iud' | 'implant' | 'other',
    emergencyContraceptiveTaken?: boolean,
    emergencyContraceptiveTime?: string,
    notes?: string
  ) => {
    if (!setUser) return;
    const dateStr = date.toDateString();
    const currentLogs = [...(user.sexualActivityLogs || [])];
    const logIdx = currentLogs.findIndex(l => l.date === dateStr);

    if (!hadSex) {
      const updatedLogs = currentLogs.filter(l => l.date !== dateStr);
      setUser(prev => prev ? { ...prev, sexualActivityLogs: updatedLogs } : null);
    } else {
      const existing = logIdx !== -1 ? currentLogs[logIdx] : {} as any;
      const updatedLog = {
        id: logIdx !== -1 ? currentLogs[logIdx].id : crypto.randomUUID(),
        date: dateStr,
        protected: protection === 'protected',
        hadSex: true,
        protection: protection !== undefined ? protection : (existing.protection || 'protected'),
        ejaculation: ejaculation !== undefined ? ejaculation : (existing.ejaculation || 'none'),
        contraceptiveMethod: contraceptiveMethod !== undefined ? contraceptiveMethod : (existing.contraceptiveMethod || 'none'),
        emergencyContraceptiveTaken: emergencyContraceptiveTaken !== undefined ? emergencyContraceptiveTaken : (existing.emergencyContraceptiveTaken || false),
        emergencyContraceptiveTime: emergencyContraceptiveTime !== undefined ? emergencyContraceptiveTime : (existing.emergencyContraceptiveTime || ''),
        notes: notes !== undefined ? notes : (existing.notes || '')
      };

      if (logIdx !== -1) {
        currentLogs[logIdx] = updatedLog;
      } else {
        currentLogs.push(updatedLog);
      }
      setUser(prev => prev ? { ...prev, sexualActivityLogs: currentLogs } : null);
    }
  };

  const getPregnancyPossibility = (date: Date, logs: any[], fertilityRatingKey: string) => {
    const dateStr = date.toDateString();
    const activeLog = logs.find(log => log.date === dateStr);
    
    if (!activeLog || !activeLog.hadSex) {
      return {
        level: 'none',
        label: 'No intimacy logged',
        desc: 'Select "Intimacy Logged" to obtain personalized pregnancy likelihood estimations and contraceptive analysis for this key date. 🌸',
        colorClass: 'text-gray-400 font-bold',
        pillLabel: null,
        methodLabel: null
      };
    }

    const isProtected = activeLog.protection === 'protected';
    const method = activeLog.contraceptiveMethod || 'none';
    const hasEjaculation = activeLog.ejaculation === 'occurred';
    const isFertileZone = fertilityRatingKey === 'peak_ovulation' || fertilityRatingKey === 'fertile_window' || fertilityRatingKey === 'ovulation_day' || fertilityRatingKey === 'high_fertility';
    const ecTaken = activeLog.emergencyContraceptiveTaken || false;
    const ecTime = activeLog.emergencyContraceptiveTime || '';

    // Standard methods labels
    const methodNames: Record<string, string> = {
      none: 'None',
      condom: 'Condom',
      pill: 'Birth Control Pill',
      iud: 'IUD (Intrauterine Device)',
      implant: 'Hormonal Implant',
      other: 'Other Method'
    };
    const methodLabel = methodNames[method] || 'None';

    // Warnings and educational notes disclaimer
    const disclaimer = "Educational estimate only; not a medical guarantee.";

    if (ecTaken) {
      return {
        level: 'very_low',
        label: 'Lower pregnancy risk',
        desc: `Emergency contraception (morning-after pill) was taken${ecTime ? ` at ${ecTime}` : ''} on this date. Emergency contraception is highly effective when taken within the recommended timeframe (typically up to 72 hours). Risk of pregnancy is substantially reduced. Note: This is an educational calculation, not a medical guarantee.`,
        colorClass: 'text-teal-700 dark:text-teal-300 font-semibold bg-teal-50 dark:bg-teal-950/30 px-2.5 py-0.5 rounded-md border border-teal-200 dark:border-teal-900/40',
        pillLabel: 'Emergency Pill Taken',
        methodLabel
      };
    }

    if (isProtected || method === 'condom' || method === 'pill' || method === 'iud' || method === 'implant') {
      return {
        level: 'low',
        label: 'Lower pregnancy risk',
        desc: `Protection used successfully (${methodLabel}). Modern contraceptives and barrier methods have very high efficacy when used correctly, presenting minimal conception risk. Note: This is an educational calculation, not a medical guarantee.`,
        colorClass: 'text-pink-700 dark:text-pink-300 bg-pink-50 dark:bg-pink-950/30 border border-pink-200/70 dark:border-pink-900/40 font-semibold px-2.5 py-0.5 rounded-md',
        pillLabel: null,
        methodLabel
      };
    }

    if (!hasEjaculation) {
      return {
        level: 'low_to_medium',
        label: 'Lower chance of pregnancy',
        desc: `Ejaculation did not occur on this day, with no protection method. While chance is low, pre-ejaculatory fluid may still contain sperm, presenting a subtle risk during your fertile window. Note: This is an educational estimate, not a medical guarantee.`,
        colorClass: 'text-amber-700 dark:text-amber-300 font-semibold bg-amber-50 dark:bg-amber-950/30 border border-amber-200/70 dark:border-amber-900/40 px-2.5 py-0.5 rounded-md',
        pillLabel: null,
        methodLabel
      };
    }

    if (isFertileZone) {
      return {
        level: 'high',
        label: 'Higher pregnancy possibility',
        desc: `Unprotected intimacy with ejaculation occurred during your ${fertilityRatingKey === 'ovulation_day' ? 'Ovulation Day' : 'high-fertility window'}. Sperm can survive up to 5 days, making this an extremely high-probability timeframe for conception. Consider emergency options if pregnancy is not intended. Note: This is an educational estimate, not a medical guarantee.`,
        colorClass: 'text-rose-700 dark:text-rose-300 font-semibold bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/40 px-2.5 py-0.5 rounded-md',
        pillLabel: null,
        methodLabel
      };
    } else {
      return {
        level: 'low_non_fertile',
        label: 'Lower chance of pregnancy',
        desc: `Unprotected intimacy with ejaculation occurred, but our calculations place you outside your principal follicular/ovulatory fertility window. Spontaneous cycle shifts can occur. Note: This is an educational estimate, not a medical guarantee.`,
        colorClass: 'text-pink-700 dark:text-pink-300 font-semibold bg-pink-50 dark:bg-pink-950/30 border border-pink-200/70 dark:border-pink-900/40 px-2.5 py-0.5 rounded-md',
        pillLabel: null,
        methodLabel
      };
    }
  };

  const today = new Date().toDateString();
  const isTakenToday = bcLogs.some(log => log.date === today && log.taken);

  const commonSymptoms = useMemo(() => {
    const counts: Record<string, number> = {};
    symptoms.forEach(s => {
      counts[s.type] = (counts[s.type] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([type, count]) => ({
        type,
        count,
        label: SYMPTOMS.find(sym => sym.id === type)?.label || type,
        emoji: SYMPTOMS.find(sym => sym.id === type)?.emoji || '✨'
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [symptoms]);

  // Synchronized Central Cycle Calculation Engine
  const cycleSync: CycleSyncData = useMemo(() => {
    return calculateCycleSyncData(user, new Date());
  }, [user]);

  const cycleDay = cycleSync.cycleDay;
  const lateInfo = useMemo(() => ({
    isLate: cycleSync.isLatePeriodMode,
    daysLate: cycleSync.daysLate
  }), [cycleSync.isLatePeriodMode, cycleSync.daysLate]);

  const getCycleDetailsForDate = (date: Date) => {
    return getCycleDetailsForSpecificDate(user, date);
  };

  const getDayStatus = (dateObj: Date) => {
    const details = getCycleDetailsForDate(dateObj);
    const dateStr = dateObj.toDateString();
    
    const isLogged = user.periods?.some(p => {
      const start = new Date(new Date(p.startDate).toDateString());
      const end = new Date(new Date(p.endDate).toDateString());
      const current = new Date(dateObj.toDateString());
      return current >= start && current <= end;
    }) || user.periodDates?.includes(dateStr);

    if (isLogged) return 'period';
    if (details.isPredictedPeriod) return 'predicted_period';
    if (details.isOvulationDay) return 'ovulation';
    if (details.isPrecedingFertileDay) return 'fertile';
    return 'none';
  };

  const dayStyles = {
    period: 'bg-pink-500 text-white font-bold shadow-md shadow-pink-200 ring-2 ring-pink-300 ring-offset-2',
    predicted_period: 'bg-pink-200 text-pink-700 font-medium border border-pink-300 border-dashed',
    ovulation: 'bg-amber-400 text-white font-black shadow-md shadow-amber-200 ring-2 ring-amber-300 ring-offset-1',
    fertile: 'bg-sky-100 text-sky-800 font-bold border border-sky-300',
    none: 'hover:bg-pink-50 text-gray-400 hover:text-pink-400'
  };

  const renderCycle = () => {
    const isLate = cycleSync.isLatePeriodMode;
    const daysLate = cycleSync.daysLate;
    const progress = isLate ? 100 : Math.min(100, Math.max(0, (cycleSync.cycleDay / cycleSync.cycleLength) * 100));

    // Phase colors according to specification:
    // Menstrual: Pink, Follicular: Soft green, Fertile window: Light blue, Ovulation: Golden yellow, Luteal: Lavender
    const phaseColor = isLate 
      ? '#f59e0b' 
      : cycleSync.phase === 'Menstrual' 
        ? '#f43f5e' 
        : cycleSync.phase === 'Follicular' 
          ? '#10b981' 
          : cycleSync.phase === 'Ovulatory' 
            ? '#f59e0b' 
            : '#a855f7';

    return (
      <div className="flex flex-col items-center animate-fadeIn w-full max-w-2xl mx-auto space-y-5">
        {setUser && (
          <div className="w-full">
            <ExpectedPeriodCheckInCard user={user} setUser={setUser} onOpenLogModal={onOpenLogModal} />
          </div>
        )}

        {/* Cycle Overview Card */}
        <div className="w-full bg-white dark:bg-[#1a1816] rounded-2xl p-6 sm:p-8 border border-stone-200/80 dark:border-[#2e2a26] shadow-xs flex flex-col items-center text-center space-y-6">
          {/* Circular cycle progress indicator */}
          <div className="relative w-52 h-52 flex items-center justify-center">
            <svg viewBox="0 0 208 208" className="w-full h-full -rotate-90 transform">
              <circle cx="104" cy="104" r="88" fill="none" className="stroke-stone-100 dark:stroke-[#2e2a26]" strokeWidth="10" />
              <motion.circle
                cx="104" cy="104" r="88" fill="none" stroke={phaseColor} strokeWidth="10"
                strokeDasharray={2 * Math.PI * 88}
                initial={{ strokeDashoffset: 2 * Math.PI * 88 }}
                animate={{ strokeDashoffset: 2 * Math.PI * 88 * (1 - progress / 100) }}
                transition={{ duration: 1.0, ease: "easeOut" }}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-4">
              <span className="text-3xl mb-1">{cycleSync.phaseEmoji}</span>
              <span className={isLate ? "text-xl font-bold text-amber-600 dark:text-amber-400 leading-tight tabular-nums" : "text-3xl font-serif font-bold text-stone-900 dark:text-stone-100 leading-none tabular-nums"}>
                {isLate ? `Day ${daysLate} Late` : `Day ${cycleSync.cycleDay}`}
              </span>
              <span className="text-xs font-medium text-stone-500 dark:text-stone-400 mt-1.5 tabular-nums">
                {isLate ? "Late Period Mode" : `of ${cycleSync.cycleLength}-Day Cycle`}
              </span>
            </div>
          </div>

          {/* Phase Badge & Fertile Status */}
          <div className="space-y-2">
            <div className="flex items-center justify-center gap-2 flex-wrap">
              <span className={`px-3 py-1 rounded-md text-xs font-semibold border ${
                cycleSync.phase === 'Menstrual'
                  ? 'bg-pink-50 dark:bg-pink-950/30 text-pink-700 dark:text-pink-300 border-pink-200/70 dark:border-pink-900/40'
                  : cycleSync.phase === 'Follicular'
                    ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300 border-emerald-200/70 dark:border-emerald-900/40'
                    : cycleSync.phase === 'Ovulatory'
                      ? 'bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-300 border-amber-200/70 dark:border-amber-900/40'
                      : 'bg-purple-50 dark:bg-purple-950/30 text-purple-800 dark:text-purple-300 border-purple-200/70 dark:border-purple-900/40'
              }`}>
                {cycleSync.phaseName}
              </span>
              {cycleSync.isWithinFertileWindow && cycleSync.fertilityStatus && (
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold border ${cycleSync.fertilityBadgeColor}`}>
                  <Sparkles className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
                  <span>{cycleSync.fertilityStatus}</span>
                </span>
              )}
            </div>
            <p className="text-sm text-stone-600 dark:text-stone-300 max-w-md leading-relaxed">
              {cycleSync.phaseDescription}
            </p>
          </div>

          {/* Forecast Grid */}
          <div className="w-full grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1 text-left">
            <div className="bg-[#faf8f6] dark:bg-[#23201d] border border-stone-200/80 dark:border-[#342f2b] rounded-xl p-3.5">
              <span className="text-[11px] font-medium text-stone-500 dark:text-stone-400 block">Next Period</span>
              <span className="text-sm font-semibold text-stone-900 dark:text-stone-100 block mt-0.5 tabular-nums">{cycleSync.nextExpectedPeriodFormatted}</span>
            </div>
            <div className="bg-[#faf8f6] dark:bg-[#23201d] border border-stone-200/80 dark:border-[#342f2b] rounded-xl p-3.5">
              <span className="text-[11px] font-medium text-stone-500 dark:text-stone-400 block">Estimated Ovulation</span>
              <span className="text-sm font-semibold text-stone-900 dark:text-stone-100 block mt-0.5 tabular-nums">{cycleSync.estimatedOvulationDateFormatted}</span>
            </div>
            <div className="bg-[#faf8f6] dark:bg-[#23201d] border border-stone-200/80 dark:border-[#342f2b] rounded-xl p-3.5">
              <span className="text-[11px] font-medium text-stone-500 dark:text-stone-400 block">Fertile Window</span>
              <span className="text-sm font-semibold text-stone-900 dark:text-stone-100 block mt-0.5 tabular-nums">{cycleSync.estimatedFertileRangeFormatted || 'Pending history'}</span>
            </div>
          </div>

          {/* Action Links */}
          <div className="flex flex-col sm:flex-row items-center gap-3 pt-1 w-full">
            <button
              type="button"
              onClick={() => setActiveView('calendar')}
              className="w-full sm:flex-1 h-11 px-4 bg-[#faf8f6] dark:bg-[#23201d] hover:bg-stone-100 dark:hover:bg-[#2e2a26] text-stone-700 dark:text-stone-200 border border-stone-200/80 dark:border-[#342f2b] font-semibold text-xs rounded-xl transition-all cursor-pointer"
            >
              View Full Calendar
            </button>
            <button
              type="button"
              onClick={onOpenLogModal}
              className="w-full sm:flex-1 h-11 px-4 bg-pink-600 hover:bg-pink-700 text-white font-semibold text-xs rounded-xl transition-all cursor-pointer"
            >
              {isLate ? "Log Period" : "Log Symptoms"}
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderStats = () => {
    return <CycleGraph user={user} setUser={setUser} symptoms={symptoms} />;
  };

  const renderHistory = () => {
    const pastPeriods = [...(user.periods || [])].sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());

    const getPeriodCalculations = (period: Period, idx: number, allPeriods: Period[]) => {
      const start = new Date(period.startDate);
      const end = new Date(period.endDate);
      const periodLength = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1);
      
      let cycleLength = user.cycleLength || 28;
      // Chronological next starting date is the one right before it in the list (since desc sorted)
      if (idx > 0 && allPeriods[idx - 1]) {
        const nextStart = new Date(allPeriods[idx - 1].startDate);
        const diff = Math.round((nextStart.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
        if (diff > 15 && diff < 50) {
          cycleLength = diff;
        }
      }

      const ovulationDay = cycleLength - 14;
      const ovulationDate = new Date(start.getTime() + (ovulationDay - 1) * 24 * 60 * 60 * 1000);
      const fertilityStart = new Date(start.getTime() + (ovulationDay - 5) * 24 * 60 * 60 * 1000);
      const fertilityEnd = new Date(start.getTime() + (ovulationDay) * 24 * 60 * 60 * 1000);
      const follicularStart = new Date(start.getTime() + periodLength * 24 * 60 * 60 * 1000);
      const follicularEnd = new Date(start.getTime() + (ovulationDay - 2) * 24 * 60 * 60 * 1000);
      const lutealStart = new Date(start.getTime() + (ovulationDay) * 24 * 60 * 60 * 1000);
      const lutealEnd = new Date(start.getTime() + (cycleLength - 1) * 24 * 60 * 60 * 1000);

      return {
        periodLength,
        cycleLength,
        ovulationDate,
        fertilityStart,
        fertilityEnd,
        follicularStart,
        follicularEnd,
        lutealStart,
        lutealEnd
      };
    };

    return (
      <div className="space-y-6 animate-fadeIn pb-12 font-sans">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 px-1">
          <div>
            <h3 className="text-2xl font-serif text-stone-900 dark:text-stone-100">Cycle History</h3>
            <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">Review phase breakdowns and manage your documented cycle records.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {onOpenDoctorReport && (
              <button
                type="button"
                onClick={onOpenDoctorReport}
                className="h-9 px-3.5 bg-pink-600 hover:bg-pink-700 text-white font-semibold text-xs rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
                title="Generate Doctor Clinical Report"
              >
                <FileText size={14} />
                <span>Doctor Report</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => setIsViewingTrends(true)}
              className="h-9 px-3.5 bg-white dark:bg-[#1a1816] hover:bg-stone-50 dark:hover:bg-[#23201d] text-stone-700 dark:text-stone-200 border border-stone-200/80 dark:border-[#2e2a26] font-semibold text-xs rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
            >
              <TrendingUp size={14} className="text-pink-600 dark:text-pink-400" />
              <span>Cycle Trends</span>
            </button>
            <button
              type="button"
              onClick={() => setIsAddingPeriod(!isAddingPeriod)}
              className="h-9 px-3.5 bg-white dark:bg-[#1a1816] hover:bg-stone-50 dark:hover:bg-[#23201d] text-stone-700 dark:text-stone-200 border border-stone-200/80 dark:border-[#2e2a26] font-semibold text-xs rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
            >
              {isAddingPeriod ? <><X size={14} /> Close Form</> : <><Plus size={14} /> Add Past Cycle</>}
            </button>
          </div>
        </div>

        {/* Inline Add Past Cycle Form */}
        {isAddingPeriod && (
          <div className="bg-white dark:bg-[#1a1816] border border-stone-200/80 dark:border-[#2e2a26] p-5 md:p-6 rounded-2xl space-y-4 shadow-xs">
            <h4 className="text-sm font-semibold text-stone-900 dark:text-stone-100">Document Past Period</h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-stone-600 dark:text-stone-300">Start Date</label>
                <input
                  type="date"
                  value={newPeriodData.startDate}
                  onChange={(e) => setNewPeriodData(prev => ({ ...prev, startDate: e.target.value }))}
                  className="w-full h-11 text-sm px-3 bg-[#faf8f6] dark:bg-[#23201d] border border-stone-200/80 dark:border-[#342f2b] rounded-xl text-stone-800 dark:text-stone-100 outline-none focus:border-pink-400"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-stone-600 dark:text-stone-300">End Date</label>
                <input
                  type="date"
                  value={newPeriodData.endDate}
                  onChange={(e) => setNewPeriodData(prev => ({ ...prev, endDate: e.target.value }))}
                  className="w-full h-11 text-sm px-3 bg-[#faf8f6] dark:bg-[#23201d] border border-stone-200/80 dark:border-[#342f2b] rounded-xl text-stone-800 dark:text-stone-100 outline-none focus:border-pink-400"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-stone-600 dark:text-stone-300">Intensity</label>
                <select
                  value={newPeriodData.intensity}
                  onChange={(e) => setNewPeriodData(prev => ({ ...prev, intensity: e.target.value as any }))}
                  className="w-full h-11 text-sm px-3 bg-[#faf8f6] dark:bg-[#23201d] border border-stone-200/80 dark:border-[#342f2b] rounded-xl text-stone-800 dark:text-stone-100 outline-none focus:border-pink-400"
                >
                  <option value="spotting">Spotting</option>
                  <option value="light">Light</option>
                  <option value="medium">Medium</option>
                  <option value="heavy">Heavy</option>
                </select>
              </div>
            </div>
            <div className="flex gap-2.5 pt-1">
              <button
                type="button"
                onClick={handleAddNewPeriod}
                className="h-10 px-5 bg-pink-600 hover:bg-pink-700 text-white rounded-xl text-xs font-semibold cursor-pointer transition-all"
              >
                Save Record
              </button>
              <button
                type="button"
                onClick={() => setIsAddingPeriod(false)}
                className="h-10 px-5 bg-[#faf8f6] dark:bg-[#23201d] border border-stone-200/80 dark:border-[#342f2b] text-stone-600 dark:text-stone-300 rounded-xl text-xs font-semibold hover:bg-stone-100 dark:hover:bg-[#2e2a26] cursor-pointer transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {pastPeriods.length === 0 ? (
          <div className="bg-white dark:bg-[#1a1816] p-12 rounded-2xl text-center border border-stone-200/80 dark:border-[#2e2a26] shadow-xs">
            <Calendar size={28} className="mx-auto text-stone-300 dark:text-stone-600 mb-3" />
            <p className="text-sm text-stone-500 dark:text-stone-400">No historical cycles logged yet. Click &ldquo;Add Past Cycle&rdquo; to record previous dates.</p>
          </div>
        ) : (
          <div className="space-y-3.5">
            {pastPeriods.map((period, idx) => {
              const start = new Date(period.startDate);
              const end = new Date(period.endDate);
              const isViewing = viewingPeriodId === period.id;
              const isEditing = editingPeriodData?.id === period.id;
              const monthLabel = start.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
              const calcs = getPeriodCalculations(period, idx, pastPeriods);

              return (
                <div key={period.id} className="bg-white dark:bg-[#1a1816] rounded-2xl border border-stone-200/80 dark:border-[#2e2a26] shadow-xs overflow-hidden transition-colors">
                  {/* Row Header */}
                  <div className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h4 className="font-serif text-lg font-semibold text-stone-900 dark:text-stone-100 leading-tight">
                        {monthLabel}
                      </h4>
                      <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5 tabular-nums">
                        {start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – {end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setViewingPeriodId(isViewing ? null : period.id);
                          setEditingPeriodData(null);
                        }}
                        className={`h-9 px-3.5 rounded-xl font-semibold text-xs border transition-all cursor-pointer flex items-center gap-1.5 ${isViewing ? 'bg-pink-50 dark:bg-pink-950/30 border-pink-300 dark:border-pink-800 text-pink-700 dark:text-pink-300' : 'bg-[#faf8f6] dark:bg-[#23201d] border-stone-200/80 dark:border-[#342f2b] text-stone-700 dark:text-stone-200 hover:bg-stone-100 dark:hover:bg-[#2e2a26]'}`}
                      >
                        <Eye size={13} /> {isViewing ? 'Hide' : 'View'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setViewingPeriodId(null);
                          if (isEditing) {
                            setEditingPeriodData(null);
                          } else {
                            setEditingPeriodData({
                              id: period.id,
                              startDate: formatYMD(period.startDate),
                              endDate: formatYMD(period.endDate),
                              intensity: period.intensity
                            });
                          }
                        }}
                        className={`h-9 px-3.5 rounded-xl font-semibold text-xs border transition-all cursor-pointer flex items-center gap-1.5 ${isEditing ? 'bg-rose-50 dark:bg-rose-950/30 border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-300' : 'bg-[#faf8f6] dark:bg-[#23201d] border-stone-200/80 dark:border-[#342f2b] text-stone-700 dark:text-stone-200 hover:bg-stone-100 dark:hover:bg-[#2e2a26]'}`}
                      >
                        <Edit3 size={13} /> Edit
                      </button>
                    </div>
                  </div>

                  {/* VIEW DETAILS DRAWER */}
                  {isViewing && (
                    <div className="border-t border-stone-100 dark:border-[#2e2a26] p-5 bg-[#faf8f6] dark:bg-[#23201d]/60 space-y-5 animate-slideDownBlock">
                      <p className="text-xs font-semibold text-stone-700 dark:text-stone-200">Recalculated Cycle Parameters</p>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-stone-700 dark:text-stone-200">
                        <div className="bg-white dark:bg-[#1a1816] p-3.5 rounded-xl border border-stone-200/80 dark:border-[#2e2a26]">
                          <p className="text-[11px] font-medium text-stone-500 dark:text-stone-400">Period length</p>
                          <p className="text-lg text-pink-600 dark:text-pink-400 font-bold mt-0.5 tabular-nums">{calcs.periodLength} days</p>
                          <p className="text-[11px] text-stone-400 dark:text-stone-500 mt-0.5">Bleeding duration</p>
                        </div>

                        <div className="bg-white dark:bg-[#1a1816] p-3.5 rounded-xl border border-stone-200/80 dark:border-[#2e2a26]">
                          <p className="text-[11px] font-medium text-stone-500 dark:text-stone-400">Cycle length</p>
                          <p className="text-lg text-purple-600 dark:text-purple-400 font-bold mt-0.5 tabular-nums">{calcs.cycleLength} days</p>
                          <p className="text-[11px] text-stone-400 dark:text-stone-500 mt-0.5">Start-to-start spacing</p>
                        </div>

                        <div className="bg-white dark:bg-[#1a1816] p-3.5 rounded-xl border border-stone-200/80 dark:border-[#2e2a26] col-span-2 md:col-span-1">
                          <p className="text-[11px] font-medium text-stone-500 dark:text-stone-400">Ovulation prediction</p>
                          <p className="text-sm text-amber-600 dark:text-amber-400 font-bold mt-1 tabular-nums">{calcs.ovulationDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                          <p className="text-[11px] text-stone-400 dark:text-stone-500 mt-0.5">Luteinizing surge estimate</p>
                        </div>
                      </div>

                      <div className="bg-white dark:bg-[#1a1816] p-4 rounded-xl border border-stone-200/80 dark:border-[#2e2a26]">
                        <p className="text-xs font-semibold text-stone-700 dark:text-stone-200 mb-3">Phase Breakdown</p>
                        <div className="space-y-3">
                          <div className="flex justify-between items-center text-xs pb-2 border-b border-stone-100 dark:border-[#2e2a26]">
                            <div>
                              <p className="font-semibold text-stone-800 dark:text-stone-100">Menstrual Phase</p>
                              <p className="text-[11px] text-stone-400 dark:text-stone-500">Coincides with shedding of lining</p>
                            </div>
                            <p className="font-semibold text-pink-600 dark:text-pink-400 tabular-nums">{start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – {end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</p>
                          </div>

                          <div className="flex justify-between items-center text-xs pb-2 border-b border-stone-100 dark:border-[#2e2a26]">
                            <div>
                              <p className="font-semibold text-stone-800 dark:text-stone-100">Follicular Phase</p>
                              <p className="text-[11px] text-stone-400 dark:text-stone-500">Follicles mature prior to release</p>
                            </div>
                            <p className="font-semibold text-purple-600 dark:text-purple-400 tabular-nums">{calcs.follicularStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – {calcs.follicularEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</p>
                          </div>

                          <div className="flex justify-between items-center text-xs pb-2 border-b border-stone-100 dark:border-[#2e2a26]">
                            <div>
                              <p className="font-semibold text-stone-800 dark:text-stone-100">Fertility Window</p>
                              <p className="text-[11px] text-stone-400 dark:text-stone-500">Enhanced probability of conception</p>
                            </div>
                            <p className="font-semibold text-amber-600 dark:text-amber-400 tabular-nums">{calcs.fertilityStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – {calcs.fertilityEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</p>
                          </div>

                          <div className="flex justify-between items-center text-xs">
                            <div>
                              <p className="font-semibold text-stone-800 dark:text-stone-100">Luteal Phase</p>
                              <p className="text-[11px] text-stone-400 dark:text-stone-500">Progesterone support cycle continuation</p>
                            </div>
                            <p className="font-semibold text-indigo-600 dark:text-indigo-400 tabular-nums">{calcs.lutealStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – {calcs.lutealEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* EDIT PANEL */}
                  {isEditing && editingPeriodData && (
                    <div className="border-t border-stone-100 dark:border-[#2e2a26] p-5 bg-[#faf8f6] dark:bg-[#23201d]/60 space-y-4 animate-slideDownBlock">
                      <p className="text-xs font-semibold text-stone-800 dark:text-stone-100">Edit Cycle Parameters</p>

                      {deletePeriodConfirmId === period.id ? (
                        <div className="p-4 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/40 rounded-xl text-center space-y-3">
                          <p className="text-xs font-semibold text-rose-800 dark:text-rose-200">Are you sure you want to delete this cycle entry?</p>
                          <div className="flex justify-center gap-2 pt-1">
                            <button
                              type="button"
                              onClick={() => handleDeletePeriod(period.id)}
                              className="h-9 px-4 bg-rose-600 text-white rounded-lg text-xs font-semibold hover:bg-rose-700 cursor-pointer transition-colors"
                            >
                              Yes, Delete
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeletePeriodConfirmId(null)}
                              className="h-9 px-4 bg-white dark:bg-[#1a1816] border border-stone-200 dark:border-[#342f2b] text-stone-700 dark:text-stone-200 rounded-lg text-xs font-semibold hover:bg-stone-50 cursor-pointer transition-colors"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                            <div className="space-y-1">
                              <label className="text-xs font-medium text-stone-600 dark:text-stone-300">Start Date</label>
                              <input
                                type="date"
                                value={editingPeriodData.startDate}
                                onChange={(e) => setEditingPeriodData(prev => prev ? ({ ...prev, startDate: e.target.value }) : null)}
                                className="w-full h-11 text-sm px-3 bg-white dark:bg-[#1a1816] border border-stone-200/80 dark:border-[#342f2b] rounded-xl text-stone-800 dark:text-stone-100"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-xs font-medium text-stone-600 dark:text-stone-300">End Date</label>
                              <input
                                type="date"
                                value={editingPeriodData.endDate}
                                onChange={(e) => setEditingPeriodData(prev => prev ? ({ ...prev, endDate: e.target.value }) : null)}
                                className="w-full h-11 text-sm px-3 bg-white dark:bg-[#1a1816] border border-stone-200/80 dark:border-[#342f2b] rounded-xl text-stone-800 dark:text-stone-100"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-xs font-medium text-stone-600 dark:text-stone-300">Intensity</label>
                              <select
                                value={editingPeriodData.intensity}
                                onChange={(e) => setEditingPeriodData(prev => prev ? ({ ...prev, intensity: e.target.value as any }) : null)}
                                className="w-full h-11 text-sm px-3 bg-white dark:bg-[#1a1816] border border-stone-200/80 dark:border-[#342f2b] rounded-xl text-stone-800 dark:text-stone-100"
                              >
                                <option value="spotting">Spotting</option>
                                <option value="light">Light</option>
                                <option value="medium">Medium</option>
                                <option value="heavy">Heavy</option>
                              </select>
                            </div>
                          </div>

                          <div className="flex flex-wrap justify-between items-center gap-2 pt-1">
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  handleSaveEditPeriod(
                                    period.id,
                                    editingPeriodData.startDate,
                                    editingPeriodData.endDate,
                                    editingPeriodData.intensity
                                  );
                                }}
                                className="h-9 px-4 bg-pink-600 hover:bg-pink-700 text-white rounded-xl text-xs font-semibold cursor-pointer transition-all"
                              >
                                Save Changes
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingPeriodData(null)}
                                className="h-9 px-4 bg-white dark:bg-[#1a1816] border border-stone-200/80 dark:border-[#342f2b] text-stone-600 dark:text-stone-300 rounded-xl text-xs font-semibold hover:bg-stone-50 cursor-pointer transition-all"
                              >
                                Cancel
                              </button>
                            </div>

                            <button
                              type="button"
                              onClick={() => setDeletePeriodConfirmId(period.id)}
                              className="h-9 px-3.5 bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-950/50 border border-rose-200/70 dark:border-rose-900/40 rounded-xl text-xs font-semibold cursor-pointer transition-colors flex items-center gap-1.5"
                            >
                              <Trash2 size={13} /> Delete Cycle
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  const renderCalendar = () => {
    const monthName = currentDate.toLocaleString('default', { month: 'long' });
    const year = currentDate.getFullYear();
    const daysInMonth = new Date(year, currentDate.getMonth() + 1, 0).getDate();
    const firstDay = new Date(year, currentDate.getMonth(), 1).getDay();
    const adjustedFirstDay = (firstDay + 6) % 7;

    // Get details for currently selected date
    const selectedDetails = getCycleDetailsForDate(selectedCalendarDate);
    const selectedDateStr = selectedCalendarDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
    const isSelectedPeriodLogged = user.periods?.some(p => {
      const s = new Date(new Date(p.startDate).toDateString());
      const e = new Date(new Date(p.endDate).toDateString());
      const c = new Date(selectedCalendarDate.toDateString());
      return c >= s && c <= e;
    }) || user.periodDates?.includes(selectedCalendarDate.toDateString());

    // Compute range segments within the current viewed month
    const menstrualDays: number[] = [];
    const follicularDays: number[] = [];
    const fertilePrecedingDays: number[] = [];
    const lutealDays: number[] = [];
    let ovulationDayNum: number | null = null;

    for (let d = 1; d <= daysInMonth; d++) {
      const testDate = new Date(year, currentDate.getMonth(), d);
      const det = getCycleDetailsForDate(testDate);
      if (det.phaseKey === 'menstrual') {
        menstrualDays.push(d);
      } else if (det.phaseKey === 'follicular') {
        follicularDays.push(d);
      } else if (det.phaseKey === 'luteal') {
        lutealDays.push(d);
      }

      if (det.isPrecedingFertileDay) {
        fertilePrecedingDays.push(d);
      }
      if (det.isOvulationDay) {
        ovulationDayNum = d;
      }
    }

    const formatRanges = (daysList: number[]) => {
      if (daysList.length === 0) return 'None predicted';
      const groups: { start: number; end: number }[] = [];
      let start = daysList[0];
      let prev = daysList[0];
      for (let idx = 1; idx < daysList.length; idx++) {
        const current = daysList[idx];
        if (current === prev + 1) {
          prev = current;
        } else {
          groups.push({ start, end: prev });
          start = current;
          prev = current;
        }
      }
      groups.push({ start, end: prev });

      return groups.map(g => {
        const startStr = new Date(year, currentDate.getMonth(), g.start).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        if (g.start === g.end) return startStr;
        const endStr = new Date(year, currentDate.getMonth(), g.end).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        return `${startStr} – ${endStr}`;
      }).join(', ');
    };

    const ovulationDateLabel = ovulationDayNum 
      ? new Date(year, currentDate.getMonth(), ovulationDayNum).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })
      : 'None in this month (or please log period parameters)';

    // Get all sexual activity logs for the currently viewed month in currentDate
    const monthLogs = (user.sexualActivityLogs || []).filter(log => {
      const logDate = new Date(log.date);
      return logDate.getMonth() === currentDate.getMonth() && logDate.getFullYear() === currentDate.getFullYear();
    }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    return (
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-fadeIn">
        {/* Left Column: Calendar Grid */}
        <div className="lg:col-span-12 xl:col-span-7 bg-white dark:bg-[#1a1816] p-5 sm:p-7 rounded-2xl shadow-xs border border-stone-200/80 dark:border-[#2e2a26] flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-5 px-1">
              <h3 className="font-serif text-xl text-stone-900 dark:text-stone-100">{monthName} {year}</h3>
              <div className="flex gap-1.5">
                <button type="button" aria-label="Previous month" onClick={() => setCurrentDate(new Date(year, currentDate.getMonth() - 1, 1))} className="w-9 h-9 rounded-xl border border-stone-200/80 dark:border-[#2e2a26] bg-[#faf8f6] dark:bg-[#23201d] text-stone-700 dark:text-stone-200 hover:border-pink-400 flex items-center justify-center transition-colors cursor-pointer">
                  <ChevronLeft size={16} />
                </button>
                <button type="button" aria-label="Next month" onClick={() => setCurrentDate(new Date(year, currentDate.getMonth() + 1, 1))} className="w-9 h-9 rounded-xl border border-stone-200/80 dark:border-[#2e2a26] bg-[#faf8f6] dark:bg-[#23201d] text-stone-700 dark:text-stone-200 hover:border-pink-400 flex items-center justify-center transition-colors cursor-pointer">
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-7 gap-2 sm:gap-2.5">
              {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
                <div key={`${d}-${i}`} className="text-center text-xs font-semibold text-stone-500 dark:text-stone-400 py-1.5">{d}</div>
              ))}
              {Array.from({ length: adjustedFirstDay }).map((_, i) => <div key={`empty-${i}`} />)}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1;
                const date = new Date(year, currentDate.getMonth(), day);
                const details = getCycleDetailsForDate(date);
                const isSelected = selectedCalendarDate.toDateString() === date.toDateString();
                const isToday = new Date().toDateString() === date.toDateString();
                const isLogged = user.periods?.some(p => {
                  const s = new Date(new Date(p.startDate).toDateString());
                  const e = new Date(new Date(p.endDate).toDateString());
                  const c = new Date(date.toDateString());
                  return c >= s && c <= e;
                }) || user.periodDates?.includes(date.toDateString());

                // Class assignments based on actual cycle characteristics
                let bgClass = 'bg-white dark:bg-[#23201d] hover:bg-stone-50 dark:hover:bg-[#2e2a26] text-stone-700 dark:text-stone-200';
                let borderClass = 'border border-stone-200/50 dark:border-[#2e2a26]';
                let roundedClass = 'rounded-xl';

                if (details.phaseKey === 'menstrual') {
                  if (isLogged) {
                    bgClass = 'bg-pink-600 text-white font-semibold shadow-xs';
                    borderClass = 'border border-pink-600';
                  } else {
                    bgClass = 'bg-pink-50 dark:bg-pink-950/30 text-pink-700 dark:text-pink-300 font-semibold';
                    borderClass = 'border-2 border-dashed border-pink-300 dark:border-pink-700';
                  }
                } else if (details.isOvulationDay) {
                  bgClass = 'bg-amber-500 text-white font-bold shadow-xs ring-1 ring-amber-400';
                  borderClass = 'border-amber-500';
                } else if (details.isPrecedingFertileDay) {
                  bgClass = 'bg-sky-50 dark:bg-sky-950/30 text-sky-800 dark:text-sky-200 font-semibold hover:bg-sky-100/80 dark:hover:bg-sky-950/50';
                  borderClass = 'border border-sky-300 dark:border-sky-800';
                } else if (details.phaseKey === 'follicular') {
                  bgClass = 'bg-emerald-50 dark:bg-emerald-950/25 text-emerald-800 dark:text-emerald-200 font-medium hover:bg-emerald-100/60 dark:hover:bg-emerald-950/40';
                  borderClass = 'border border-emerald-200/80 dark:border-emerald-900/40';
                } else if (details.phaseKey === 'luteal') {
                  bgClass = 'bg-purple-50 dark:bg-purple-950/25 text-purple-900 dark:text-purple-200 font-medium hover:bg-purple-100/60 dark:hover:bg-purple-950/40';
                  borderClass = 'border border-purple-200/80 dark:border-purple-900/40';
                }

                const daySexLog = (user.sexualActivityLogs || []).find(l => l.date === date.toDateString());
                const intimacyEm = daySexLog?.hadSex
                  ? (daySexLog.protection === 'protected' ? '💖' : '❤️')
                  : '';
                const pillEm = (daySexLog?.contraceptiveMethod && daySexLog.contraceptiveMethod !== 'none') || daySexLog?.emergencyContraceptiveTaken
                  ? '💊'
                  : '';
                const emergencyEm = daySexLog?.emergencyContraceptiveTaken ? '🚨' : '';

                return (
                  <button
                    key={day}
                    type="button"
                    onClick={() => {
                      setSelectedCalendarDate(date);
                    }}
                    className={`aspect-square relative flex flex-col items-center justify-center text-sm tabular-nums transition-all focus:outline-none cursor-pointer ${bgClass} ${borderClass} ${roundedClass} ${
                      isSelected ? 'ring-2 ring-stone-900 dark:ring-stone-100 ring-offset-2 dark:ring-offset-[#1a1816] z-20 shadow-sm' : ''
                    }`}
                  >
                    <div className="absolute top-1 left-1 right-1 flex justify-between gap-0.5 select-none pointer-events-none">
                      {details.isOvulationDay ? (
                        <span className="text-[10px]" title="Single Estimated Ovulation Day">🎯</span>
                      ) : details.isPrecedingFertileDay ? (
                        <span className="text-[8.5px] text-sky-600 dark:text-sky-300 font-bold" title="Fertile Window (5 Days Preceding Ovulation)">✨</span>
                      ) : intimacyEm ? (
                        <span className="text-[9px]" title={daySexLog?.protection === 'protected' ? 'Protected intimacy' : 'Unprotected intimacy'}>
                          {intimacyEm}
                        </span>
                      ) : null}
                      <div className="flex gap-0.5">
                        {intimacyEm && (details.isOvulationDay || details.isPrecedingFertileDay) && (
                          <span className="text-[8px]">{intimacyEm}</span>
                        )}
                        {pillEm && (
                          <span className="text-[8px]" title="Contraceptive logged">
                            {pillEm}
                          </span>
                        )}
                        {emergencyEm && (
                          <span className="text-[8px]" title="Emergency contraception">
                            {emergencyEm}
                          </span>
                        )}
                      </div>
                    </div>

                    <span className="mt-2 text-xs sm:text-sm font-semibold">{day}</span>

                    {isToday && (
                      <span className="absolute bottom-1 w-1.5 h-1.5 bg-pink-600 rounded-full ring-1 ring-white dark:ring-[#1a1816]" title="Today"></span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Legend */}
          <div className="mt-7 border-t border-stone-100 dark:border-[#2e2a26] pt-5">
            <h4 className="text-xs font-semibold text-stone-700 dark:text-stone-300 text-center mb-3.5">Cycle Phase Legend</h4>
            <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 text-center mb-3.5">
              <div className="flex flex-col items-center p-2 rounded-xl bg-pink-50/70 dark:bg-pink-950/25 border border-pink-200/70 dark:border-pink-900/40">
                <div className="w-4 h-4 rounded bg-pink-600 mb-1" />
                <span className="text-[10px] font-semibold text-pink-800 dark:text-pink-300">Confirmed</span>
              </div>
              <div className="flex flex-col items-center p-2 rounded-xl bg-pink-50/50 dark:bg-pink-950/15 border border-dashed border-pink-300 dark:border-pink-700">
                <div className="w-4 h-4 rounded bg-pink-100 dark:bg-pink-900/40 mb-1 border border-dashed border-pink-400" />
                <span className="text-[10px] font-semibold text-pink-800 dark:text-pink-300">Predicted</span>
              </div>
              <div className="flex flex-col items-center p-2 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/25 border border-emerald-200/70 dark:border-emerald-900/40">
                <div className="w-4 h-4 rounded bg-emerald-200 dark:bg-emerald-800 mb-1" />
                <span className="text-[10px] font-semibold text-emerald-800 dark:text-emerald-300">Follicular</span>
              </div>
              <div className="flex flex-col items-center p-2 rounded-xl bg-sky-50/70 dark:bg-sky-950/25 border border-sky-200 dark:border-sky-800">
                <div className="w-4 h-4 rounded bg-sky-200 dark:bg-sky-800 mb-1" />
                <span className="text-[10px] font-semibold text-sky-800 dark:text-sky-300">Fertile</span>
              </div>
              <div className="flex flex-col items-center p-2 rounded-xl bg-amber-50/70 dark:bg-amber-950/25 border border-amber-300 dark:border-amber-800">
                <div className="w-4 h-4 rounded bg-amber-500 mb-1" />
                <span className="text-[10px] font-semibold text-amber-800 dark:text-amber-300">Ovulation</span>
              </div>
              <div className="flex flex-col items-center p-2 rounded-xl bg-purple-50/70 dark:bg-purple-950/25 border border-purple-200 dark:border-purple-800">
                <div className="w-4 h-4 rounded bg-purple-200 dark:bg-purple-800 mb-1" />
                <span className="text-[10px] font-semibold text-purple-900 dark:text-purple-300">Luteal</span>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center bg-[#faf8f6] dark:bg-[#23201d] p-2.5 rounded-xl border border-stone-200/70 dark:border-[#342f2b] text-[11px] font-medium text-stone-600 dark:text-stone-300">
              <div className="flex items-center gap-1.5 justify-center">
                <span className="w-2.5 h-2.5 rounded-full border-2 border-stone-800 dark:border-stone-200 inline-block" />
                <span>Selected</span>
              </div>
              <div className="flex items-center gap-1.5 justify-center">
                <span className="w-2 h-2 rounded-full bg-pink-600 inline-block" />
                <span>Today</span>
              </div>
              <div className="flex items-center gap-1 justify-center">
                <span>💖</span>
                <span>Protected</span>
              </div>
              <div className="flex items-center gap-1 justify-center">
                <span>❤️</span>
                <span>Unprotected</span>
              </div>
              <div className="flex items-center gap-1 justify-center">
                <span>💊</span>
                <span>Pill / IUD</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Insights Panel */}
        <div className="lg:col-span-12 xl:col-span-5 space-y-5">
          <div className="bg-white dark:bg-[#1a1816] p-6 sm:p-7 rounded-2xl shadow-xs border border-stone-200/80 dark:border-[#2e2a26] space-y-5">
            <div className="flex justify-between items-start border-b border-stone-100 dark:border-[#2e2a26] pb-4">
              <div>
                <span className="text-xs font-medium text-stone-500 dark:text-stone-400">Selected Date</span>
                <h4 className="text-lg font-serif text-stone-900 dark:text-stone-100 mt-0.5">{selectedDateStr}</h4>
              </div>
              <span className="text-2xl">{selectedDetails.phaseEmoji || '🌸'}</span>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center text-xs">
                <span className="font-medium text-stone-600 dark:text-stone-300">Cycle Phase</span>
                <span className={`px-2.5 py-1 rounded-md font-semibold text-xs ${selectedDetails.badgeColor}`}>
                  {selectedDetails.phaseName}
                </span>
              </div>

              {selectedDetails.isWithinFertileWindow && selectedDetails.fertilityStatus && (
                <div className="flex justify-between items-center text-xs">
                  <span className="font-medium text-stone-600 dark:text-stone-300">Fertility Status</span>
                  <span className="font-semibold text-sky-700 dark:text-sky-300">
                    {selectedDetails.fertilityStatus}
                  </span>
                </div>
              )}

              {/* Private Sexual Activity Logging Sub-card */}
              {(() => {
                const activeSexLog = (user.sexualActivityLogs || []).find(l => l.date === selectedCalendarDate.toDateString());
                const pregInfo = getPregnancyPossibility(selectedCalendarDate, user.sexualActivityLogs || [], selectedDetails.fertilityKey);

                return (
                  <div className="bg-[#faf8f6] dark:bg-[#23201d] p-4 rounded-xl border border-stone-200/80 dark:border-[#342f2b] space-y-3.5">
                    <div className="flex justify-between items-center">
                      <h5 className="text-xs font-semibold text-stone-800 dark:text-stone-100 flex items-center gap-1.5">
                        <Heart size={13} className="text-pink-600 dark:text-pink-400" /> Intimacy Tracker
                      </h5>
                      <span className="text-[11px] font-medium bg-white dark:bg-[#1a1816] border border-stone-200/80 dark:border-[#342f2b] text-stone-500 dark:text-stone-400 px-2 py-0.5 rounded inline-flex items-center gap-1">
                        <Lock size={10} /> Private
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => handleUpdateSexualActivity(
                          selectedCalendarDate,
                          true,
                          activeSexLog?.protection || 'protected',
                          activeSexLog?.ejaculation || 'none',
                          activeSexLog?.contraceptiveMethod || 'none',
                          activeSexLog?.emergencyContraceptiveTaken || false,
                          activeSexLog?.emergencyContraceptiveTime || ''
                        )}
                        className={`h-9 px-2 text-xs font-semibold rounded-lg border transition-all cursor-pointer ${
                          activeSexLog?.hadSex
                            ? 'bg-pink-600 text-white border-pink-600'
                            : 'bg-white dark:bg-[#1a1816] text-stone-600 dark:text-stone-300 border-stone-200/80 dark:border-[#342f2b] hover:border-pink-400'
                        }`}
                      >
                        Intimacy Logged
                      </button>
                      <button
                        type="button"
                        onClick={() => handleUpdateSexualActivity(selectedCalendarDate, false)}
                        className={`h-9 px-2 text-xs font-semibold rounded-lg border transition-all cursor-pointer ${
                          !activeSexLog?.hadSex
                            ? 'bg-stone-200 dark:bg-[#2e2a26] text-stone-800 dark:text-stone-100 border-stone-300 dark:border-[#3d3732]'
                            : 'bg-white dark:bg-[#1a1816] text-stone-500 dark:text-stone-400 border-stone-200/80 dark:border-[#342f2b] hover:border-stone-400'
                        }`}
                      >
                        No Intimacy
                      </button>
                    </div>

                    {activeSexLog?.hadSex && (
                      <div className="space-y-3.5 pt-3 border-t border-stone-200/70 dark:border-[#342f2b] animate-fadeIn">
                        {/* Protection State */}
                        <div className="space-y-1.5">
                          <p className="text-[11px] font-medium text-stone-500 dark:text-stone-400">Protection Status</p>
                          <div className="grid grid-cols-2 gap-2">
                            <button
                              type="button"
                              onClick={() => handleUpdateSexualActivity(
                                selectedCalendarDate,
                                true,
                                'protected',
                                activeSexLog.ejaculation || 'none',
                                activeSexLog.contraceptiveMethod,
                                activeSexLog.emergencyContraceptiveTaken,
                                activeSexLog.emergencyContraceptiveTime
                              )}
                              className={`h-9 rounded-lg text-xs font-semibold border transition-all cursor-pointer flex items-center justify-center gap-1 ${
                                activeSexLog.protection === 'protected'
                                  ? 'bg-pink-50 dark:bg-pink-950/30 border-pink-400 dark:border-pink-700 text-pink-700 dark:text-pink-300'
                                  : 'bg-white dark:bg-[#1a1816] border-stone-200/80 dark:border-[#342f2b] text-stone-600 dark:text-stone-300'
                              }`}
                            >
                              <Shield size={12} /> Protected
                            </button>
                            <button
                              type="button"
                              onClick={() => handleUpdateSexualActivity(
                                selectedCalendarDate,
                                true,
                                'unprotected',
                                activeSexLog.ejaculation || 'none',
                                activeSexLog.contraceptiveMethod,
                                activeSexLog.emergencyContraceptiveTaken,
                                activeSexLog.emergencyContraceptiveTime
                              )}
                              className={`h-9 rounded-lg text-xs font-semibold border transition-all cursor-pointer flex items-center justify-center gap-1 ${
                                activeSexLog.protection === 'unprotected'
                                  ? 'bg-rose-50 dark:bg-rose-950/30 border-rose-400 dark:border-rose-700 text-rose-700 dark:text-rose-300'
                                  : 'bg-white dark:bg-[#1a1816] border-stone-200/80 dark:border-[#342f2b] text-stone-600 dark:text-stone-300'
                              }`}
                            >
                              <AlertTriangle size={12} /> Unprotected
                            </button>
                          </div>
                        </div>

                        {/* Ejaculation State */}
                        <div className="space-y-1.5">
                          <p className="text-[11px] font-medium text-stone-500 dark:text-stone-400">Ejaculation Occurrences</p>
                          <div className="grid grid-cols-2 gap-2">
                            <button
                              type="button"
                              onClick={() => handleUpdateSexualActivity(
                                selectedCalendarDate,
                                true,
                                activeSexLog.protection || 'protected',
                                'occurred',
                                activeSexLog.contraceptiveMethod,
                                activeSexLog.emergencyContraceptiveTaken,
                                activeSexLog.emergencyContraceptiveTime
                              )}
                              className={`h-9 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                                activeSexLog.ejaculation === 'occurred'
                                  ? 'bg-pink-50 dark:bg-pink-950/30 border-pink-400 dark:border-pink-700 text-pink-700 dark:text-pink-300'
                                  : 'bg-white dark:bg-[#1a1816] border-stone-200/80 dark:border-[#342f2b] text-stone-600 dark:text-stone-300'
                              }`}
                            >
                              Occurred
                            </button>
                            <button
                              type="button"
                              onClick={() => handleUpdateSexualActivity(
                                selectedCalendarDate,
                                true,
                                activeSexLog.protection || 'protected',
                                'none',
                                activeSexLog.contraceptiveMethod,
                                activeSexLog.emergencyContraceptiveTaken,
                                activeSexLog.emergencyContraceptiveTime
                              )}
                              className={`h-9 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                                activeSexLog.ejaculation === 'none'
                                  ? 'bg-pink-50 dark:bg-pink-950/30 border-pink-400 dark:border-pink-700 text-pink-700 dark:text-pink-300'
                                  : 'bg-white dark:bg-[#1a1816] border-stone-200/80 dark:border-[#342f2b] text-stone-600 dark:text-stone-300'
                              }`}
                            >
                              None
                            </button>
                          </div>
                        </div>

                        {/* Contraceptive Method */}
                        <div className="space-y-1.5 pt-1 border-t border-stone-200/60 dark:border-[#342f2b]">
                          <p className="text-[11px] font-medium text-stone-500 dark:text-stone-400">Contraceptive Method</p>
                          <div className="grid grid-cols-2 gap-1.5">
                            {[
                              { key: 'condom', label: 'Condom' },
                              { key: 'pill', label: 'Pill' },
                              { key: 'iud', label: 'IUD' },
                              { key: 'implant', label: 'Implant' },
                              { key: 'other', label: 'Other' },
                              { key: 'none', label: 'None' }
                            ].map((item) => (
                              <button
                                key={item.key}
                                type="button"
                                onClick={() => handleUpdateSexualActivity(
                                  selectedCalendarDate,
                                  true,
                                  activeSexLog.protection || 'protected',
                                  activeSexLog.ejaculation,
                                  item.key as any,
                                  activeSexLog.emergencyContraceptiveTaken,
                                  activeSexLog.emergencyContraceptiveTime
                                )}
                                className={`h-8 rounded-lg text-xs font-medium border transition-all cursor-pointer ${
                                  (activeSexLog.contraceptiveMethod || 'none') === item.key
                                    ? 'bg-pink-50 dark:bg-pink-950/30 border-pink-400 dark:border-pink-700 text-pink-700 dark:text-pink-300 font-semibold'
                                    : 'bg-white dark:bg-[#1a1816] border-stone-200/80 dark:border-[#342f2b] text-stone-600 dark:text-stone-300'
                                }`}
                              >
                                {item.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Emergency Contraception */}
                        <div className="space-y-1.5 pt-1 border-t border-stone-200/60 dark:border-[#342f2b]">
                          <div className="flex justify-between items-center">
                            <p className="text-[11px] font-medium text-stone-500 dark:text-stone-400">Emergency Contraception</p>
                            <span className="text-[10px] text-stone-400 dark:text-stone-500">Morning-after pill</span>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <button
                              type="button"
                              onClick={() => handleUpdateSexualActivity(
                                selectedCalendarDate,
                                true,
                                activeSexLog.protection,
                                activeSexLog.ejaculation,
                                activeSexLog.contraceptiveMethod,
                                true,
                                activeSexLog.emergencyContraceptiveTime || 'Within 24 Hours'
                              )}
                              className={`h-9 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                                activeSexLog.emergencyContraceptiveTaken
                                  ? 'bg-rose-50 dark:bg-rose-950/30 border-rose-400 dark:border-rose-700 text-rose-700 dark:text-rose-300'
                                  : 'bg-white dark:bg-[#1a1816] border-stone-200/80 dark:border-[#342f2b] text-stone-600 dark:text-stone-300'
                              }`}
                            >
                              Taken
                            </button>
                            <button
                              type="button"
                              onClick={() => handleUpdateSexualActivity(
                                selectedCalendarDate,
                                true,
                                activeSexLog.protection,
                                activeSexLog.ejaculation,
                                activeSexLog.contraceptiveMethod,
                                false,
                                ''
                              )}
                              className={`h-9 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                                !activeSexLog.emergencyContraceptiveTaken
                                  ? 'bg-stone-200 dark:bg-[#2e2a26] border-stone-300 dark:border-[#3d3732] text-stone-800 dark:text-stone-100'
                                  : 'bg-white dark:bg-[#1a1816] border-stone-200/80 dark:border-[#342f2b] text-stone-500 dark:text-stone-400'
                              }`}
                            >
                              Not Taken
                            </button>
                          </div>
                        </div>

                        {activeSexLog.emergencyContraceptiveTaken && (
                          <div className="space-y-1.5 pt-1 animate-fadeIn">
                            <p className="text-[11px] font-medium text-stone-500 dark:text-stone-400">Intake Timeframe</p>
                            <div className="grid grid-cols-2 gap-1.5">
                              {['Within 12h', 'Within 24h', 'Within 48h', 'Within 72h'].map((timeOption) => (
                                <button
                                  key={timeOption}
                                  type="button"
                                  onClick={() => handleUpdateSexualActivity(
                                    selectedCalendarDate,
                                    true,
                                    activeSexLog.protection,
                                    activeSexLog.ejaculation,
                                    activeSexLog.contraceptiveMethod,
                                    true,
                                    timeOption
                                  )}
                                  className={`h-8 rounded-lg text-xs font-medium border transition-all cursor-pointer ${
                                    activeSexLog.emergencyContraceptiveTime === timeOption
                                      ? 'bg-rose-50 dark:bg-rose-950/30 border-rose-400 dark:border-rose-700 text-rose-700 dark:text-rose-300 font-semibold'
                                      : 'bg-white dark:bg-[#1a1816] border-stone-200/80 dark:border-[#342f2b] text-stone-600 dark:text-stone-300'
                                  }`}
                                >
                                  {timeOption}
                                </button>
                              ))}
                              <div className="col-span-2">
                                <input
                                  type="text"
                                  placeholder="Or custom time/note..."
                                  value={activeSexLog.emergencyContraceptiveTime && !['Within 12h', 'Within 24h', 'Within 48h', 'Within 72h'].includes(activeSexLog.emergencyContraceptiveTime) ? activeSexLog.emergencyContraceptiveTime : ''}
                                  onChange={(e) => handleUpdateSexualActivity(
                                    selectedCalendarDate,
                                    true,
                                    activeSexLog.protection,
                                    activeSexLog.ejaculation,
                                    activeSexLog.contraceptiveMethod,
                                    true,
                                    e.target.value
                                  )}
                                  className="w-full h-9 text-xs px-3 border border-stone-200/80 dark:border-[#342f2b] rounded-lg focus:outline-none focus:border-pink-400 text-stone-800 dark:text-stone-100 bg-white dark:bg-[#1a1816]"
                                />
                              </div>
                            </div>
                          </div>
                        )}

                        <div className="bg-white dark:bg-[#1a1816] p-3 rounded-xl border border-stone-200/80 dark:border-[#2e2a26] text-left space-y-1.5">
                          <div className="flex justify-between items-center text-[11px]">
                            <span className="font-medium text-stone-500 dark:text-stone-400">Possibility Estimation</span>
                            <span className={pregInfo.colorClass}>{pregInfo.label}</span>
                          </div>
                          <p className="text-xs text-stone-600 dark:text-stone-300 leading-relaxed">
                            {pregInfo.desc}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}

              <div className="bg-[#faf8f6] dark:bg-[#23201d] p-4 rounded-xl border border-stone-200/80 dark:border-[#342f2b] space-y-1.5">
                <h5 className="text-xs font-semibold text-stone-800 dark:text-stone-100">Hormonal Profile</h5>
                <p className="text-xs text-stone-600 dark:text-stone-300 leading-relaxed">{selectedDetails.hormoneInfo}</p>
              </div>

              <div className="bg-[#faf8f6] dark:bg-[#23201d] p-4 rounded-xl border border-stone-200/80 dark:border-[#342f2b] space-y-1.5">
                <h5 className="text-xs font-semibold text-stone-800 dark:text-stone-100">Wellness Recommendations</h5>
                <p className="text-xs text-stone-600 dark:text-stone-300 leading-relaxed">{selectedDetails.insights}</p>
              </div>

              {/* Logged Entries & Corrections */}
              {(() => {
                const dateStr = selectedCalendarDate.toDateString();
                const sexLog = (user.sexualActivityLogs || []).find(l => l.date === dateStr);
                const bcLog = bcLogs.find(l => l.date === dateStr && l.taken);
                const daySymptoms = symptoms.filter(s => s.date === dateStr);
                const hasAnyLog = sexLog || bcLog || daySymptoms.length > 0;

                if (!hasAnyLog) return null;

                return (
                  <div className="bg-[#faf8f6] dark:bg-[#23201d] p-4 rounded-xl border border-stone-200/80 dark:border-[#342f2b] space-y-3 animate-fadeIn">
                    <h5 className="text-xs font-semibold text-stone-800 dark:text-stone-100 border-b border-stone-200/60 dark:border-[#342f2b] pb-2">
                      Logged Items & Corrections
                    </h5>

                    <div className="space-y-2.5">
                      {sexLog && sexLog.hadSex && (
                        <div className="bg-white dark:bg-[#1a1816] p-3 rounded-xl border border-stone-200/80 dark:border-[#2e2a26] text-xs flex flex-col gap-2 text-left">
                          <div className="flex justify-between items-center">
                            <div>
                              <p className="font-semibold text-stone-800 dark:text-stone-100">Intimacy Logged</p>
                              <p className="text-[11px] text-stone-500 dark:text-stone-400 capitalize">Protection: {sexLog.protection || 'None'}</p>
                            </div>
                            {deletingIntimacyConfirm ? (
                              <div className="flex gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => {
                                    handleDeleteIntimacyLog(sexLog.id);
                                    setDeletingIntimacyConfirm(false);
                                  }}
                                  className="px-2.5 py-1 bg-rose-600 text-white rounded-md text-[11px] font-semibold cursor-pointer"
                                >
                                  Yes
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setDeletingIntimacyConfirm(false)}
                                  className="px-2.5 py-1 bg-stone-100 dark:bg-[#23201d] text-stone-600 dark:text-stone-300 rounded-md text-[11px] font-semibold hover:bg-stone-200 cursor-pointer"
                                >
                                  No
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setDeletingIntimacyConfirm(true)}
                                className="text-[11px] font-semibold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/30 hover:bg-rose-100 px-2.5 py-1 rounded-md transition-colors cursor-pointer"
                              >
                                Delete
                              </button>
                            )}
                          </div>
                          {deletingIntimacyConfirm && (
                            <p className="text-[11px] text-rose-600 dark:text-rose-400">Are you sure you want to delete this entry?</p>
                          )}
                        </div>
                      )}

                      {bcLog && (
                        <div className="bg-white dark:bg-[#1a1816] p-3 rounded-xl border border-stone-200/80 dark:border-[#2e2a26] text-xs flex flex-col gap-2 text-left">
                          <div className="flex justify-between items-center">
                            <div>
                              <p className="font-semibold text-stone-800 dark:text-stone-100">Contraceptive Logged</p>
                              <p className="text-[11px] text-stone-500 dark:text-stone-400">Birth control pill taken on this day</p>
                            </div>
                            {deletingBCConfirm ? (
                              <div className="flex gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => {
                                    handleDeleteBCLog(dateStr);
                                    setDeletingBCConfirm(false);
                                  }}
                                  className="px-2.5 py-1 bg-rose-600 text-white rounded-md text-[11px] font-semibold cursor-pointer"
                                >
                                  Yes
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setDeletingBCConfirm(false)}
                                  className="px-2.5 py-1 bg-stone-100 dark:bg-[#23201d] text-stone-600 dark:text-stone-300 rounded-md text-[11px] font-semibold hover:bg-stone-200 cursor-pointer"
                                >
                                  No
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setDeletingBCConfirm(true)}
                                className="text-[11px] font-semibold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/30 hover:bg-rose-100 px-2.5 py-1 rounded-md transition-colors cursor-pointer"
                              >
                                Delete
                              </button>
                            )}
                          </div>
                          {deletingBCConfirm && (
                            <p className="text-[11px] text-rose-600 dark:text-rose-400">Are you sure you want to delete this entry?</p>
                          )}
                        </div>
                      )}

                      {daySymptoms.map((sym) => (
                        <div key={sym.id} className="bg-white dark:bg-[#1a1816] p-3 rounded-xl border border-stone-200/80 dark:border-[#2e2a26] text-xs flex flex-col gap-2 text-left">
                          <div className="flex justify-between items-center">
                            <div>
                              <p className="font-semibold text-stone-800 dark:text-stone-100">Symptom: <span className="capitalize">{sym.type.replace('_', ' ')}</span></p>
                              <p className="text-[11px] text-stone-500 dark:text-stone-400 tabular-nums">Intensity: {sym.intensity} / 3</p>
                            </div>
                            {deletingSymptomId === sym.id ? (
                              <div className="flex gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => {
                                    handleDeleteSymptom(sym.id);
                                    setDeletingSymptomId(null);
                                  }}
                                  className="px-2.5 py-1 bg-rose-600 text-white rounded-md text-[11px] font-semibold cursor-pointer"
                                >
                                  Yes
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setDeletingSymptomId(null)}
                                  className="px-2.5 py-1 bg-stone-100 dark:bg-[#23201d] text-stone-600 dark:text-stone-300 rounded-md text-[11px] font-semibold hover:bg-stone-200 cursor-pointer"
                                >
                                  No
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setDeletingSymptomId(sym.id)}
                                className="text-[11px] font-semibold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/30 hover:bg-rose-100 px-2.5 py-1 rounded-md transition-colors cursor-pointer"
                              >
                                Delete
                              </button>
                            )}
                          </div>
                          {deletingSymptomId === sym.id && (
                            <p className="text-[11px] text-rose-600 dark:text-rose-400">Are you sure you want to delete this entry?</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </div>

            <div className="pt-1">
              <button
                type="button"
                onClick={() => {
                  const dateStr = selectedCalendarDate.toDateString();
                  handleToggleAndCleanPeriodDate(dateStr);
                }}
                className={`w-full h-11 rounded-xl font-semibold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  isSelectedPeriodLogged
                    ? 'bg-pink-50 dark:bg-pink-950/30 text-pink-700 dark:text-pink-300 border border-pink-300 dark:border-pink-800 hover:bg-pink-100'
                    : 'bg-pink-600 text-white hover:bg-pink-700'
                }`}
              >
                <Droplet size={14} />
                <span>{isSelectedPeriodLogged ? 'Bleeding Logged (Tap to Clear)' : 'Log Bleeding on This Date'}</span>
              </button>
            </div>
          </div>

          {/* Forecast Summary */}
          <div className="bg-white dark:bg-[#1a1816] p-6 rounded-2xl border border-stone-200/80 dark:border-[#2e2a26] shadow-xs space-y-5">
            <div className="flex justify-between items-center border-b border-stone-100 dark:border-[#2e2a26] pb-3.5">
              <h4 className="font-serif text-lg text-stone-900 dark:text-stone-100">
                Forecast for {monthName}
              </h4>
              <span className="text-[11px] font-medium bg-pink-50 dark:bg-pink-950/30 text-pink-700 dark:text-pink-300 border border-pink-200/70 dark:border-pink-900/40 px-2.5 py-0.5 rounded-md">
                Dynamic
              </span>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between items-start border-b border-stone-100 dark:border-[#2e2a26] pb-2.5">
                <span className="text-stone-500 dark:text-stone-400 font-medium">Menstrual Phase</span>
                <span className="font-semibold text-stone-900 dark:text-stone-100 text-right pl-4 tabular-nums">{formatRanges(menstrualDays)}</span>
              </div>
              <div className="flex justify-between items-start border-b border-stone-100 dark:border-[#2e2a26] pb-2.5">
                <span className="text-stone-500 dark:text-stone-400 font-medium">Follicular Phase</span>
                <span className="font-semibold text-stone-900 dark:text-stone-100 text-right pl-4 tabular-nums">{formatRanges(follicularDays)}</span>
              </div>
              <div className="flex justify-between items-start border-b border-stone-100 dark:border-[#2e2a26] pb-2.5">
                <span className="text-stone-500 dark:text-stone-400 font-medium">Fertile Window (5 Days)</span>
                <span className="font-semibold text-sky-700 dark:text-sky-300 text-right pl-4 tabular-nums">{formatRanges(fertilePrecedingDays)}</span>
              </div>
              <div className="flex justify-between items-start border-b border-stone-100 dark:border-[#2e2a26] pb-2.5">
                <span className="text-stone-500 dark:text-stone-400 font-medium">Predicted Ovulation Day</span>
                <span className="font-semibold text-amber-700 dark:text-amber-300 text-right pl-4 tabular-nums">{ovulationDateLabel}</span>
              </div>
              <div className="flex justify-between items-start">
                <span className="text-stone-500 dark:text-stone-400 font-medium">Luteal Phase</span>
                <span className="font-semibold text-stone-900 dark:text-stone-100 text-right pl-4 tabular-nums">{formatRanges(lutealDays)}</span>
              </div>
            </div>

            <div className="bg-[#faf8f6] dark:bg-[#23201d] p-3.5 rounded-xl border border-stone-200/70 dark:border-[#342f2b]">
              <p className="text-xs leading-relaxed text-stone-500 dark:text-stone-400">
                Calculations and fertile windows adapt automatically as you record periods and cycle preferences.
              </p>
            </div>
          </div>
        </div>

        {/* CYCLE INSIGHTS SUMMARY */}
        <div className="lg:col-span-12 mt-2 bg-white dark:bg-[#1a1816] p-6 sm:p-7 rounded-2xl border border-stone-200/80 dark:border-[#2e2a26] shadow-xs space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-100 dark:border-[#2e2a26] pb-4">
            <div>
              <span className="text-xs font-medium text-pink-600 dark:text-pink-400 block">
                Cycle Intelligence
              </span>
              <h4 className="text-xl font-serif text-stone-900 dark:text-stone-100 mt-0.5">
                Cycle Insights Summary
              </h4>
              <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                A synchronized summary of your reproductive health patterns.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setActiveView('stats')}
              className="h-10 px-4 bg-pink-600 hover:bg-pink-700 text-white rounded-xl font-semibold text-xs transition-all flex items-center gap-1.5 self-start sm:self-auto cursor-pointer shrink-0"
            >
              <span>View Full Statistics</span>
              <ChevronRight size={14} />
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <div className="bg-[#faf8f6] dark:bg-[#23201d] p-4 rounded-xl border border-stone-200/70 dark:border-[#342f2b] space-y-1">
              <span className="text-[11px] font-medium text-stone-500 dark:text-stone-400 block">Avg Cycle</span>
              <p className="text-xl font-serif font-bold text-pink-600 dark:text-pink-400 tabular-nums">{analytics.averageCycleDisplay}</p>
              <p className="text-[11px] text-stone-400 dark:text-stone-500">Historical average</p>
            </div>
            <div className="bg-[#faf8f6] dark:bg-[#23201d] p-4 rounded-xl border border-stone-200/70 dark:border-[#342f2b] space-y-1">
              <span className="text-[11px] font-medium text-stone-500 dark:text-stone-400 block">Avg Period</span>
              <p className="text-xl font-serif font-bold text-rose-600 dark:text-rose-400 tabular-nums">{analytics.averagePeriodDisplay}</p>
              <p className="text-[11px] text-stone-400 dark:text-stone-500">Bleeding duration</p>
            </div>
            <div className="bg-[#faf8f6] dark:bg-[#23201d] p-4 rounded-xl border border-stone-200/70 dark:border-[#342f2b] space-y-1">
              <span className="text-[11px] font-medium text-stone-500 dark:text-stone-400 block">Shortest Cycle</span>
              <p className="text-xl font-serif font-bold text-stone-900 dark:text-stone-100 tabular-nums">{analytics.shortestCycle} <span className="text-xs font-sans text-stone-400">days</span></p>
              <p className="text-[11px] text-stone-400 dark:text-stone-500">Minimum interval</p>
            </div>
            <div className="bg-[#faf8f6] dark:bg-[#23201d] p-4 rounded-xl border border-stone-200/70 dark:border-[#342f2b] space-y-1">
              <span className="text-[11px] font-medium text-stone-500 dark:text-stone-400 block">Longest Cycle</span>
              <p className="text-xl font-serif font-bold text-stone-900 dark:text-stone-100 tabular-nums">{analytics.longestCycle} <span className="text-xs font-sans text-stone-400">days</span></p>
              <p className="text-[11px] text-stone-400 dark:text-stone-500">Maximum interval</p>
            </div>
            <div className="bg-[#faf8f6] dark:bg-[#23201d] p-4 rounded-xl border border-stone-200/70 dark:border-[#342f2b] space-y-1 col-span-2 sm:col-span-1">
              <span className="text-[11px] font-medium text-stone-500 dark:text-stone-400 block">Regularity</span>
              <p className="text-base font-serif font-bold text-emerald-700 dark:text-emerald-400">{analytics.cycleRegularity}</p>
              <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium tabular-nums">±{analytics.averageVariationDisplay}</p>
            </div>
          </div>
        </div>
      </div>
    );
  };
  const renderTimeline = () => {
    // 1. Gather all timeline records
    const allEvents: {
      id: string;
      date: string;
      endDate?: string;
      category: 'periods' | 'symptoms' | 'mood' | 'intimacy' | 'temp';
      typeLabel: string;
      title: string;
      emoji: string;
      badgeColor: string;
      details?: string;
      rawItem?: any;
    }[] = [
      ...(user.periods || []).map(p => ({
        id: `period-${p.id}`,
        date: p.startDate,
        endDate: p.endDate,
        category: 'periods' as const,
        typeLabel: 'Menstrual Period',
        title: `Period (${p.intensity || 'Medium'} Flow)`,
        emoji: '🩸',
        badgeColor: 'bg-rose-50 text-rose-700 border-rose-200',
        details: `Bleeding logged from ${new Date(p.startDate).toLocaleDateString()} to ${new Date(p.endDate).toLocaleDateString()}. Flow: ${p.intensity || 'Medium'}.`,
        rawItem: p
      })),
      ...(user.periodDates || []).filter(d => !user.periods?.some(p => {
        const start = new Date(new Date(p.startDate).toDateString());
        const end = new Date(new Date(p.endDate).toDateString());
        const current = new Date(new Date(d).toDateString());
        return current >= start && current <= end;
      })).map(date => ({
        id: `pdate-${date}`,
        date,
        category: 'periods' as const,
        typeLabel: 'Period Day',
        title: 'Single Period Day Logged',
        emoji: '🩸',
        badgeColor: 'bg-pink-50 text-pink-700 border-pink-200',
        details: 'Bleeding recorded for this date.'
      })),
      ...symptoms.map(s => {
        const symDef = SYMPTOMS.find(symp => symp.id === s.type);
        return {
          id: `sym-${s.id}`,
          date: s.date,
          category: 'symptoms' as const,
          typeLabel: 'Symptom Tracked',
          title: symDef?.label || s.type.replace(/_/g, ' '),
          emoji: symDef?.emoji || '✨',
          badgeColor: 'bg-purple-50 text-purple-700 border-purple-200',
          details: `Intensity: Level ${s.intensity || 1} of 3 tracked.`,
          rawItem: s
        };
      }),
      ...(user.moodLogs || []).map(m => ({
        id: `mood-${m.id}`,
        date: m.date,
        category: 'mood' as const,
        typeLabel: 'Mood Reflection',
        title: `Felt ${m.mood.charAt(0).toUpperCase() + m.mood.slice(1)}`,
        emoji: m.mood === 'happy' ? '😊' : m.mood === 'calm' ? '🧘' : m.mood === 'anxious' ? '😰' : m.mood === 'tired' ? '😴' : '🌸',
        badgeColor: 'bg-amber-50 text-amber-800 border-amber-200',
        details: m.note ? `Note: "${m.note}"` : `Recorded mood: ${m.mood}`,
        rawItem: m
      })),
      ...(user.sexualActivityLogs || []).map(l => ({
        id: `sex-${l.id}`,
        date: l.date,
        category: 'intimacy' as const,
        typeLabel: 'Intimacy Log',
        title: l.hadSex ? (l.protection === 'protected' ? 'Protected Intimacy 🛡️' : 'Unprotected Intimacy ⚠️') : 'No Intimacy',
        emoji: '💞',
        badgeColor: l.protection === 'protected' ? 'bg-teal-50 text-teal-800 border-teal-200' : 'bg-rose-50 text-rose-800 border-rose-200',
        details: `Protection: ${l.protection || 'Not specified'} • Ejaculation: ${l.ejaculation || 'None'}${l.contraceptiveMethod && l.contraceptiveMethod !== 'none' ? ` • Method: ${l.contraceptiveMethod}` : ''}${l.emergencyContraceptiveTaken ? ' • Emergency contraception taken' : ''}`,
        rawItem: l
      })),
      ...tempLogs.map(t => ({
        id: `temp-${t.date}-${t.value}`,
        date: t.date,
        category: 'symptoms' as const,
        typeLabel: 'Basal Temperature',
        title: `BBT: ${t.value}°${t.unit}`,
        emoji: '🌡️',
        badgeColor: 'bg-sky-50 text-sky-800 border-sky-200',
        details: `Basal body temperature recorded at ${t.value}°${t.unit}.`
      }))
    ];

    // Filter by category
    const filteredEvents = allEvents.filter(ev => {
      if (timelineCategoryFilter === 'all') return true;
      return ev.category === timelineCategoryFilter;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // Group events by Month and Year (e.g. "November 2026")
    const groupedByMonth: Record<string, typeof filteredEvents> = {};
    filteredEvents.forEach(ev => {
      const d = new Date(ev.date);
      const key = isNaN(d.getTime()) 
        ? 'Recent Logs'
        : d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      if (!groupedByMonth[key]) {
        groupedByMonth[key] = [];
      }
      groupedByMonth[key].push(ev);
    });

    const monthKeys = Object.keys(groupedByMonth);

    return (
      <div className="space-y-6 animate-fadeIn font-sans text-left">
        {/* Header & Category Filters */}
        <div className="bg-white dark:bg-[#1a1816] p-5 md:p-6 rounded-2xl border border-stone-200/80 dark:border-[#2e2a26] shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-100 dark:border-[#2e2a26] pb-3.5">
            <div>
              <span className="text-xs font-medium text-pink-600 dark:text-pink-400 block">
                Reproductive History
              </span>
              <h3 className="text-xl font-serif text-stone-900 dark:text-stone-100 mt-0.5">
                Chronological Health Timeline
              </h3>
            </div>
            <span className="text-xs font-medium text-stone-600 dark:text-stone-300 bg-[#faf8f6] dark:bg-[#23201d] px-3 py-1 rounded-md border border-stone-200/80 dark:border-[#342f2b] self-start sm:self-auto tabular-nums">
              {filteredEvents.length} {filteredEvents.length === 1 ? 'Record' : 'Records'}
            </span>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide pb-1">
            {[
              { id: 'all', label: 'All Records' },
              { id: 'periods', label: 'Periods' },
              { id: 'symptoms', label: 'Symptoms' },
              { id: 'mood', label: 'Moods' },
              { id: 'intimacy', label: 'Intimacy' }
            ].map(filter => (
              <button
                key={filter.id}
                type="button"
                onClick={() => setTimelineCategoryFilter(filter.id as any)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap shrink-0 cursor-pointer border ${
                  timelineCategoryFilter === filter.id
                    ? 'bg-pink-600 text-white border-pink-600'
                    : 'bg-[#faf8f6] dark:bg-[#23201d] hover:bg-stone-100 dark:hover:bg-[#2e2a26] text-stone-600 dark:text-stone-300 border-stone-200/80 dark:border-[#342f2b]'
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>

        {/* Timeline Events List grouped by Month and Year */}
        {monthKeys.length === 0 ? (
          <div className="bg-white dark:bg-[#1a1816] p-12 rounded-2xl text-center border border-stone-200/80 dark:border-[#2e2a26] shadow-xs space-y-2">
            <Clock size={28} className="mx-auto text-stone-300 dark:text-stone-600 mb-2" />
            <h4 className="text-base font-serif text-stone-900 dark:text-stone-100">No events found in this category</h4>
            <p className="text-xs text-stone-500 dark:text-stone-400">
              Tap any date on the calendar or log today&apos;s symptoms to populate your timeline.
            </p>
          </div>
        ) : (
          monthKeys.map(month => (
            <div key={month} className="space-y-3">
              <div className="sticky top-2 z-10 flex items-center gap-2 px-3 py-1.5 bg-[#faf8f6]/95 dark:bg-[#11100f]/95 backdrop-blur-md border border-stone-200/80 dark:border-[#2e2a26] rounded-xl w-fit">
                <span className="w-2 h-2 rounded-full bg-pink-600 inline-block" />
                <h4 className="font-serif font-semibold text-stone-900 dark:text-stone-100 text-sm">
                  {month}
                </h4>
              </div>

              <div className="relative border-l-2 border-stone-200 dark:border-[#2e2a26] ml-3 pl-5 space-y-3">
                {groupedByMonth[month].map(event => {
                  const isExpanded = expandedTimelineId === event.id;
                  const dateFormatted = new Date(event.date).toLocaleDateString('en-US', {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric'
                  });

                  return (
                    <div key={event.id} className="relative group animate-fadeIn">
                      <div className="absolute -left-[27px] top-4 w-3 h-3 rounded-full border-2 border-[#faf8f6] dark:border-[#11100f] bg-pink-600" />

                      <div className="bg-white dark:bg-[#1a1816] p-4 sm:p-5 rounded-2xl border border-stone-200/80 dark:border-[#2e2a26] shadow-xs hover:border-pink-300 dark:hover:border-pink-700 transition-all space-y-2">
                        <div
                          onClick={() => setExpandedTimelineId(isExpanded ? null : event.id)}
                          className="flex items-start justify-between gap-3 cursor-pointer"
                        >
                          <div className="flex items-start gap-3">
                            <div className="w-10 h-10 rounded-xl bg-[#faf8f6] dark:bg-[#23201d] flex items-center justify-center text-lg shrink-0 border border-stone-200/70 dark:border-[#342f2b] mt-0.5">
                              {event.emoji}
                            </div>
                            <div className="space-y-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className={`text-[11px] font-medium px-2 py-0.5 rounded border ${event.badgeColor}`}>
                                  {event.typeLabel}
                                </span>
                                <span className="text-xs font-medium text-stone-500 dark:text-stone-400 tabular-nums">
                                  {dateFormatted}
                                  {event.endDate && ` → ${new Date(event.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`}
                                </span>
                              </div>
                              <h5 className="font-semibold text-stone-900 dark:text-stone-100 text-sm">
                                {event.title}
                              </h5>
                            </div>
                          </div>

                          <div className="flex items-center gap-1 text-stone-400 shrink-0">
                            <span className="text-xs font-medium text-pink-600 dark:text-pink-400">
                              {isExpanded ? 'Less' : 'Details'}
                            </span>
                            <ChevronDown size={14} className={`transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
                          </div>
                        </div>

                        {isExpanded && (
                          <div className="pt-3 border-t border-stone-100 dark:border-[#2e2a26] space-y-3 animate-fadeIn">
                            {event.details && (
                              <p className="text-xs text-stone-600 dark:text-stone-300 leading-relaxed">
                                {event.details}
                              </p>
                            )}

                            <div className="flex items-center justify-end gap-2 pt-1">
                              {event.category === 'periods' && event.rawItem?.id && (
                                <button
                                  type="button"
                                  onClick={() => setEditingPeriodData({
                                    id: event.rawItem.id,
                                    startDate: event.rawItem.startDate,
                                    endDate: event.rawItem.endDate,
                                    intensity: event.rawItem.intensity || 'medium'
                                  })}
                                  className="px-3 py-1.5 bg-[#faf8f6] dark:bg-[#23201d] border border-stone-200/80 dark:border-[#342f2b] hover:border-pink-400 text-stone-700 dark:text-stone-200 font-semibold text-xs rounded-lg transition-colors cursor-pointer"
                                >
                                  Edit Period
                                </button>
                              )}

                              {pendingDeleteTimelineEventId === event.id ? (
                                <div className="flex items-center gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (event.category === 'periods' && event.rawItem?.id) {
                                        handleDeletePeriod(event.rawItem.id);
                                      } else if (event.category === 'symptoms' && event.rawItem?.id) {
                                        handleDeleteSymptom(event.rawItem.id);
                                      } else if (event.category === 'intimacy' && event.rawItem?.id) {
                                        handleDeleteIntimacyLog(event.rawItem.id);
                                      }
                                      setPendingDeleteTimelineEventId(null);
                                    }}
                                    className="px-3 py-1.5 bg-rose-600 text-white font-semibold text-xs rounded-lg cursor-pointer"
                                  >
                                    Confirm Delete
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setPendingDeleteTimelineEventId(null)}
                                    className="px-2.5 py-1.5 bg-stone-100 dark:bg-[#23201d] text-stone-600 dark:text-stone-300 font-semibold text-xs rounded-lg cursor-pointer"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => setPendingDeleteTimelineEventId(event.id)}
                                  className="px-3 py-1.5 bg-rose-50 dark:bg-rose-950/30 hover:bg-rose-100 text-rose-600 dark:text-rose-400 border border-rose-200/70 dark:border-rose-900/40 font-semibold text-xs rounded-lg transition-colors cursor-pointer"
                                >
                                  Delete
                                </button>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>
    );
  };

  const renderCycleTrendsModal = () => {
    if (!isViewingTrends) return null;

    const analytics = getCycleAnalytics(user, symptoms);

    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          className="bg-white dark:bg-[#1a1816] rounded-2xl w-full max-w-2xl overflow-hidden shadow-xl relative border border-stone-200/80 dark:border-[#2e2a26] flex flex-col max-h-[90vh]"
        >
          {/* Header */}
          <div className="p-5 md:p-6 border-b border-stone-100 dark:border-[#2e2a26] flex justify-between items-start">
            <div className="text-left">
              <span className="text-xs font-medium text-pink-600 dark:text-pink-400">Analytics</span>
              <h3 className="text-2xl font-serif text-stone-900 dark:text-stone-100 mt-0.5">Cycle Trends</h3>
              <p className="text-xs text-stone-500 dark:text-stone-400">Historical cycle length and pattern analysis</p>
            </div>
            <button
              type="button"
              onClick={() => setIsViewingTrends(false)}
              aria-label="Close cycle trends"
              className="w-9 h-9 rounded-xl bg-[#faf8f6] dark:bg-[#23201d] border border-stone-200/80 dark:border-[#342f2b] text-stone-600 dark:text-stone-300 hover:text-stone-900 dark:hover:text-stone-100 flex items-center justify-center transition-all cursor-pointer"
            >
              <X size={16} />
            </button>
          </div>

          <div className="p-5 md:p-6 overflow-y-auto space-y-5 flex-1 text-left">
            {analytics.hasSignificantTrendAlert && (
              <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 p-4 rounded-xl flex items-start gap-3">
                <Stethoscope size={20} className="text-amber-700 dark:text-amber-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[11px] font-semibold text-amber-800 dark:text-amber-200 bg-amber-200/60 dark:bg-amber-900/50 px-2 py-0.5 rounded">
                      Clinical Trend Notice
                    </span>
                    <span className="text-xs text-amber-800 dark:text-amber-300 font-semibold">Repeated Shifts Detected</span>
                  </div>
                  <p className="text-xs text-amber-950 dark:text-amber-100 leading-relaxed">
                    &ldquo;{analytics.significantTrendMessage}&rdquo;
                  </p>
                </div>
              </div>
            )}

            <div className="bg-pink-600 rounded-2xl p-5 text-white shadow-xs space-y-4">
              <div className="flex justify-between items-center border-b border-white/20 pb-3">
                <span className="text-xs font-semibold text-pink-100">
                  Cycle Trend Overview
                </span>
                <span className="px-2.5 py-0.5 rounded-md bg-white/20 text-white font-semibold text-[11px]">
                  {analytics.trendDirectionLabel}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="bg-white/15 rounded-xl p-3.5 border border-white/20">
                  <span className="text-[11px] font-medium text-pink-100 block">
                    Previous Cycle
                  </span>
                  <p className="text-2xl font-serif font-bold text-white mt-0.5 tabular-nums">
                    {analytics.previousCycleLength} <span className="text-xs font-sans font-medium text-pink-100">days</span>
                  </p>
                </div>

                <div className="bg-white/25 rounded-xl p-3.5 border border-white/30">
                  <span className="text-[11px] font-medium text-pink-100 block">
                    Current Cycle
                  </span>
                  <p className="text-2xl font-serif font-bold text-white mt-0.5 tabular-nums">
                    {analytics.currentCycleLength} <span className="text-xs font-sans font-medium text-pink-100">days</span>
                  </p>
                </div>

                <div className="bg-white/15 rounded-xl p-3.5 border border-white/20">
                  <span className="text-[11px] font-medium text-pink-100 block">
                    Change
                  </span>
                  <p className="text-2xl font-serif font-bold text-white mt-0.5 tabular-nums">
                    {analytics.cycleChangeFormatted}
                  </p>
                </div>
              </div>
            </div>

            {!analytics.hasRealCompletedCycles && (
              <div className="bg-[#faf8f6] dark:bg-[#23201d] border border-stone-200/80 dark:border-[#342f2b] p-4 rounded-xl flex items-start gap-3">
                <TrendingUp size={18} className="text-pink-600 dark:text-pink-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-semibold text-stone-800 dark:text-stone-100">Displaying Configured Baseline</h4>
                  <p className="text-xs text-stone-600 dark:text-stone-300 leading-relaxed mt-0.5">
                    Showing your default cycle length of <span className="font-semibold tabular-nums">{user.cycleLength || 28} days</span>. Log consecutive periods to plot personal cycle shifts.
                  </p>
                </div>
              </div>
            )}

            <div className="bg-[#faf8f6] dark:bg-[#23201d] border border-stone-200/80 dark:border-[#342f2b] rounded-2xl p-4 md:p-5">
              <div className="flex justify-between items-center mb-4">
                <span className="text-xs font-semibold text-stone-700 dark:text-stone-200">Cycle Duration (Days)</span>
                <span className="text-xs text-stone-500 dark:text-stone-400 tabular-nums">
                  {analytics.hasRealCompletedCycles ? `${analytics.totalLoggedCycles} Completed Cycles` : 'Configured Reference'}
                </span>
              </div>

              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={analytics.chartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e7e5e4" opacity={0.4} />
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 11, fill: '#78716c', fontWeight: 600 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      domain={['dataMin - 3', 'dataMax + 3']}
                      tick={{ fontSize: 11, fill: '#78716c' }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <div className="bg-white dark:bg-[#1a1816] border border-stone-200/80 dark:border-[#2e2a26] p-3 rounded-xl shadow-lg text-left">
                              <p className="text-[11px] text-stone-500 dark:text-stone-400 font-semibold">{data.name}</p>
                              <p className="text-xs text-pink-600 dark:text-pink-400 font-semibold mt-1 tabular-nums">
                                Cycle Length: <span className="text-sm font-bold">{data.cycleLength} days</span>
                              </p>
                              <p className="text-[11px] text-stone-500 dark:text-stone-400 tabular-nums">
                                Period Bleeding: {data.periodLength} days
                              </p>
                              {data.isBaseline && (
                                <span className="inline-block mt-1 px-1.5 py-0.5 bg-pink-50 dark:bg-pink-950/30 text-pink-600 dark:text-pink-400 font-semibold text-[10px] rounded">
                                  Default Baseline
                                </span>
                              )}
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <ReferenceLine
                      y={analytics.averageCycleLength}
                      stroke="#db2777"
                      strokeDasharray="5 5"
                      label={{
                        value: `Avg (${analytics.averageCycleDisplay})`,
                        fill: '#db2777',
                        fontSize: 10,
                        position: 'insideBottomRight',
                        offset: 10
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="cycleLength"
                      stroke="#db2777"
                      strokeWidth={2.5}
                      dot={{ r: 4, fill: '#db2777', stroke: '#fff', strokeWidth: 2 }}
                      activeDot={{ r: 6, fill: '#be185d', stroke: '#fff', strokeWidth: 2 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-[#faf8f6] dark:bg-[#23201d] border border-stone-200/80 dark:border-[#342f2b] p-3.5 rounded-xl space-y-1">
                <span className="text-[11px] font-medium text-stone-500 dark:text-stone-400">Average Cycle</span>
                <p className="text-lg font-serif text-pink-600 dark:text-pink-400 font-bold tabular-nums">
                  {analytics.averageCycleDisplay}
                </p>
                <p className="text-[11px] text-stone-400 dark:text-stone-500">
                  {user.automaticCyclePrediction ? 'Auto-learned' : (analytics.hasRealCompletedCycles ? 'Completed cycles' : 'Manual baseline')}
                </p>
              </div>

              <div className="bg-[#faf8f6] dark:bg-[#23201d] border border-stone-200/80 dark:border-[#342f2b] p-3.5 rounded-xl space-y-1">
                <span className="text-[11px] font-medium text-stone-500 dark:text-stone-400">Average Period</span>
                <p className="text-lg font-serif text-rose-600 dark:text-rose-400 font-bold tabular-nums">
                  {analytics.averagePeriodDisplay}
                </p>
                <p className="text-[11px] text-stone-400 dark:text-stone-500">Logged periods</p>
              </div>

              <div className="bg-[#faf8f6] dark:bg-[#23201d] border border-stone-200/80 dark:border-[#342f2b] p-3.5 rounded-xl space-y-1">
                <span className="text-[11px] font-medium text-stone-500 dark:text-stone-400">Regularity</span>
                <p className={`text-[11px] font-semibold ${analytics.regularityBadgeClass} px-2 py-0.5 rounded inline-block mt-0.5`}>
                  {analytics.cycleRegularity}
                </p>
                <p className="text-[11px] text-emerald-700 dark:text-emerald-400 font-medium mt-1 tabular-nums">
                  ±{analytics.averageVariationDisplay}
                </p>
              </div>

              <div className="bg-[#faf8f6] dark:bg-[#23201d] border border-stone-200/80 dark:border-[#342f2b] p-3.5 rounded-xl space-y-1">
                <span className="text-[11px] font-medium text-stone-500 dark:text-stone-400">Trend Direction</span>
                <p className="text-xs font-semibold text-stone-900 dark:text-stone-100 mt-1">
                  {analytics.trendDirectionLabel}
                </p>
                <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-0.5 tabular-nums">
                  Change: {analytics.cycleChangeFormatted}
                </p>
              </div>

              <div className="bg-[#faf8f6] dark:bg-[#23201d] border border-stone-200/80 dark:border-[#342f2b] p-3.5 rounded-xl space-y-1">
                <span className="text-[11px] font-medium text-stone-500 dark:text-stone-400">Shortest Cycle</span>
                <p className="text-lg font-serif text-stone-900 dark:text-stone-100 font-bold tabular-nums">
                  {analytics.shortestCycle} <span className="text-xs font-sans font-normal text-stone-400">days</span>
                </p>
                <p className="text-[11px] text-stone-400 dark:text-stone-500">Min interval</p>
              </div>

              <div className="bg-[#faf8f6] dark:bg-[#23201d] border border-stone-200/80 dark:border-[#342f2b] p-3.5 rounded-xl space-y-1">
                <span className="text-[11px] font-medium text-stone-500 dark:text-stone-400">Longest Cycle</span>
                <p className="text-lg font-serif text-stone-900 dark:text-stone-100 font-bold tabular-nums">
                  {analytics.longestCycle} <span className="text-xs font-sans font-normal text-stone-400">days</span>
                </p>
                <p className="text-[11px] text-stone-400 dark:text-stone-500">Max interval</p>
              </div>

              <div className="bg-[#faf8f6] dark:bg-[#23201d] border border-stone-200/80 dark:border-[#342f2b] p-3.5 rounded-xl space-y-1">
                <span className="text-[11px] font-medium text-stone-500 dark:text-stone-400">Monthly Symptoms</span>
                <p className="text-lg font-serif text-stone-900 dark:text-stone-100 font-bold tabular-nums">
                  {analytics.averageMonthlySymptoms}
                </p>
                <p className="text-[11px] text-stone-400 dark:text-stone-500 tabular-nums">
                  {analytics.totalSymptomsCount} tracked
                </p>
              </div>

              <div className="bg-[#faf8f6] dark:bg-[#23201d] border border-stone-200/80 dark:border-[#342f2b] p-3.5 rounded-xl space-y-1">
                <span className="text-[11px] font-medium text-stone-500 dark:text-stone-400">Total Cycles</span>
                <p className="text-lg font-serif text-stone-900 dark:text-stone-100 font-bold tabular-nums">
                  {analytics.totalLoggedCycles} <span className="text-xs font-sans font-normal text-stone-400">{analytics.totalLoggedCycles === 1 ? 'cycle' : 'cycles'}</span>
                </p>
                <p className="text-[11px] text-stone-400 dark:text-stone-500 tabular-nums">
                  {analytics.totalLoggedPeriods} periods logged
                </p>
              </div>
            </div>

            <div className="p-5 bg-[#faf8f6] dark:bg-[#23201d] border border-stone-200/80 dark:border-[#342f2b] rounded-2xl text-left">
              <h4 className="text-xs font-semibold text-pink-600 dark:text-pink-400 mb-1">Cycle Rhythm Note</h4>
              <p className="text-sm font-serif italic text-stone-700 dark:text-stone-200 leading-relaxed">
                &ldquo;Understanding your cycle regularity helps you tune into your body&apos;s unique monthly rhythm.&rdquo;
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    );
  };

  return (
    <div className="space-y-6 pb-20">
      {renderCycleTrendsModal()}
      {/* COMPACT HEADER */}
      <header className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 text-left bg-white dark:bg-[#1a1816] px-5 py-4 md:px-6 md:py-5 rounded-2xl border border-stone-200/80 dark:border-[#2e2a26] shadow-xs">
        <div>
          <h2 className="text-2xl font-serif text-stone-900 dark:text-stone-100 tracking-tight">Calendar &amp; Cycle</h2>
          <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">Your cycle patterns, predictions, and daily reproductive insights.</p>
        </div>

        {/* NAVIGATION TABS */}
        <div className="flex bg-[#faf8f6] dark:bg-[#23201d] p-1 rounded-xl border border-stone-200/80 dark:border-[#342f2b] gap-1 overflow-x-auto scrollbar-hide shrink-0">
          {[
            { id: 'cycle', label: 'Cycle', icon: Moon },
            { id: 'calendar', label: 'Calendar', icon: Calendar },
            { id: 'history', label: 'History', icon: Clock },
            { id: 'timeline', label: 'Timeline', icon: FileText },
            { id: 'stats', label: 'Statistics', icon: BarChart3 },
          ].map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveView(tab.id as any)}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all whitespace-nowrap shrink-0 cursor-pointer ${
                  activeView === tab.id
                    ? 'bg-pink-600 text-white shadow-xs'
                    : 'text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-[#2e2a26]'
                }`}
              >
                <Icon size={14} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </header>

      <div>
        {activeView === 'cycle' && renderCycle()}
        {activeView === 'calendar' && renderCalendar()}
        {activeView === 'history' && renderHistory()}
        {activeView === 'timeline' && renderTimeline()}
        {activeView === 'stats' && renderStats()}
      </div>
    </div>
  );
};

export default PeriodTracker;
