
import React, { useState, useMemo } from 'react';
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
  ChevronDown
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
  const [activeGraphTab, setActiveGraphTab] = useState<'cycle-length' | 'period-length' | 'symptoms' | 'moods' | 'flows' | 'fertility' | 'pregnancy'>(user.isPregnancyMode ? 'pregnancy' : 'cycle-length');
  const [pregnancyWeightLogs, setPregnancyWeightLogs] = useState<{ week: number; weight: number }[]>(() => {
    try {
      const local = localStorage.getItem(`pregnancy_weight_${user?.id || 'default'}`);
      return local ? JSON.parse(local) : [
        { week: 4, weight: 62.0 },
        { week: 8, weight: 62.8 },
        { week: 12, weight: 63.5 },
        { week: 16, weight: 64.8 },
        { week: 20, weight: 66.2 },
        { week: 24, weight: 68.0 },
      ];
    } catch {
      return [
        { week: 4, weight: 62.0 },
        { week: 8, weight: 62.8 },
        { week: 12, weight: 63.5 },
        { week: 16, weight: 64.8 },
        { week: 20, weight: 66.2 },
        { week: 24, weight: 68.0 },
      ];
    }
  });
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
      localStorage.setItem(`pregnancy_weight_${user.id}`, JSON.stringify(nextLogs));
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
      id: Math.random().toString(36).substr(2, 9),
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
        id: logIdx !== -1 ? currentLogs[logIdx].id : Math.random().toString(36).substr(2, 9),
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
        desc: `Emergency contraception (morning-after pill) was taken${ecTime ? ` at ${ecTime}` : ''} on this date. Emergency contraception is highly effective when taken within the recommended timeframe (typically up to 72 hours). Risk of pregnancy is substantially reduced. Note: This is an educational calculation, not a medical guarantee. 🧪`,
        colorClass: 'text-teal-600 font-bold bg-teal-50 px-2.5 py-1 rounded-lg border border-teal-200',
        pillLabel: 'Emergency Pill Taken',
        methodLabel
      };
    }

    if (isProtected || method === 'condom' || method === 'pill' || method === 'iud' || method === 'implant') {
      return {
        level: 'low',
        label: 'Lower pregnancy risk',
        desc: `Protection used successfully (${methodLabel}). Modern contraceptives and barrier methods have very high efficacy when used correctly, presenting minimal conception risk. Note: This is an educational calculation, not a medical guarantee. 🛡️`,
        colorClass: 'text-pink-600 bg-pink-50 border border-pink-100 font-bold px-2.5 py-1 rounded-lg',
        pillLabel: null,
        methodLabel
      };
    }

    if (!hasEjaculation) {
      return {
        level: 'low_to_medium',
        label: 'Lower chance of pregnancy',
        desc: `Ejaculation did not occur on this day, with no protection method. While chance is low, pre-ejaculatory fluid may still contain sperm, presenting a subtle risk during your fertile window. Note: This is an educational estimate, not a medical guarantee. 💧`,
        colorClass: 'text-amber-600 font-bold bg-amber-50 border border-amber-100 px-2.5 py-1 rounded-lg',
        pillLabel: null,
        methodLabel
      };
    }

    if (isFertileZone) {
      return {
        level: 'high',
        label: 'Higher pregnancy possibility',
        desc: `Unprotected intimacy with ejaculation occurred during your ${fertilityRatingKey === 'ovulation_day' ? 'Ovulation Day' : 'high-fertility window'}. Sperm can survive up to 5 days, making this an extremely high-probability timeframe for conception. Consider emergency options if pregnancy is not intended. Note: This is an educational estimate, not a medical guarantee. ⚠️`,
        colorClass: 'text-red-600 font-bold bg-red-50 border border-red-100 px-2.5 py-1 rounded-lg animate-pulse',
        pillLabel: null,
        methodLabel
      };
    } else {
      return {
        level: 'low_non_fertile',
        label: 'Lower chance of pregnancy',
        desc: `Unprotected intimacy with ejaculation occurred, but our calculations place you outside your principal follicular/ovulatory fertility window. Spontaneous cycle shifts can occur. Note: This is an educational estimate, not a medical guarantee. 🌸`,
        colorClass: 'text-pink-500 font-bold bg-pink-50 border border-pink-100 px-2.5 py-1 rounded-lg',
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
      <div className="flex flex-col items-center animate-fadeIn w-full max-w-xl mx-auto space-y-5">
        {setUser && (
          <div className="w-full">
            <ExpectedPeriodCheckInCard user={user} setUser={setUser} onOpenLogModal={onOpenLogModal} />
          </div>
        )}

        {/* Compact, elegant Cycle Overview Card */}
        <div className="w-full bg-white rounded-[2.5rem] p-6 sm:p-7 border border-pink-100/80 shadow-xs flex flex-col items-center text-center space-y-5">
          
          {/* Circular cycle progress indicator */}
          <div className="relative w-52 h-52 flex items-center justify-center">
            <svg className="w-full h-full -rotate-90 transform">
              <circle cx="104" cy="104" r="88" fill="none" stroke="#fdf2f8" strokeWidth="10" />
              <motion.circle
                cx="104" cy="104" r="88" fill="none" stroke={phaseColor} strokeWidth="10"
                strokeDasharray={2 * Math.PI * 88}
                initial={{ strokeDashoffset: 2 * Math.PI * 88 }}
                animate={{ strokeDashoffset: 2 * Math.PI * 88 * (1 - progress / 100) }}
                transition={{ duration: 1.2, ease: "easeOut" }}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-4">
              <span className="text-3xl mb-1">{cycleSync.phaseEmoji}</span>
              <span className={isLate ? "text-xl font-black text-amber-600 leading-tight" : "text-3xl font-serif font-black text-stone-800 leading-none"}>
                {isLate ? `Day ${daysLate} Late` : `Day ${cycleSync.cycleDay}`}
              </span>
              <span className="text-[9.5px] font-bold text-stone-400 uppercase tracking-widest mt-1">
                {isLate ? "Late Period Mode" : `of ${cycleSync.cycleLength}-Day Cycle`}
              </span>
            </div>
          </div>

          {/* Phase Badge & Fertile Status */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-center gap-2 flex-wrap">
              <span className={`px-3.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                cycleSync.phase === 'Menstrual' 
                  ? 'bg-pink-100 text-pink-700 border-pink-200' 
                  : cycleSync.phase === 'Follicular' 
                    ? 'bg-emerald-100 text-emerald-800 border-emerald-200' 
                    : cycleSync.phase === 'Ovulatory' 
                      ? 'bg-amber-100 text-amber-800 border-amber-200' 
                      : 'bg-purple-100 text-purple-800 border-purple-200'
              }`}>
                {cycleSync.phaseName}
              </span>
              {cycleSync.isWithinFertileWindow && cycleSync.fertilityStatus && (
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${cycleSync.fertilityBadgeColor}`}>
                  <Sparkles className="w-3.5 h-3.5 text-sky-600" />
                  <span>{cycleSync.fertilityStatus}</span>
                </span>
              )}
            </div>
            <p className="text-xs text-stone-500 font-serif italic max-w-sm">
              {cycleSync.phaseDescription}
            </p>
          </div>

          {/* Forecast Grid: Next Period, Estimated Ovulation, Fertile Window */}
          <div className="w-full grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1 text-left">
            <div className="bg-purple-50/70 border border-purple-100 rounded-2xl p-3">
              <span className="text-[9px] font-bold text-purple-600 uppercase tracking-wider block">Next Period</span>
              <span className="text-xs font-bold text-purple-900 block mt-0.5">{cycleSync.nextExpectedPeriodFormatted}</span>
            </div>
            <div className="bg-amber-50/70 border border-amber-200/60 rounded-2xl p-3">
              <span className="text-[9px] font-bold text-amber-700 uppercase tracking-wider block">Estimated Ovulation</span>
              <span className="text-xs font-bold text-amber-900 block mt-0.5">{cycleSync.estimatedOvulationDateFormatted}</span>
            </div>
            <div className="bg-sky-50/70 border border-sky-200/60 rounded-2xl p-3">
              <span className="text-[9px] font-bold text-sky-700 uppercase tracking-wider block">Fertile Window</span>
              <span className="text-xs font-bold text-sky-900 block mt-0.5">{cycleSync.estimatedFertileRangeFormatted || 'Pending history'}</span>
            </div>
          </div>

          {/* Action Links */}
          <div className="flex items-center gap-3 pt-2 w-full">
            <button
              onClick={() => setActiveView('calendar')}
              className="flex-1 py-3 px-4 bg-pink-50 hover:bg-pink-100 text-pink-600 font-bold text-xs uppercase tracking-wider rounded-2xl transition-all cursor-pointer shadow-2xs"
            >
              View Full Calendar
            </button>
            <button
              onClick={onOpenLogModal}
              className="flex-1 py-3 px-4 bg-gradient-to-r from-pink-500 to-rose-400 hover:from-pink-600 hover:to-rose-500 text-white font-bold text-xs uppercase tracking-wider rounded-2xl transition-all cursor-pointer shadow-xs"
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
            <h3 className="text-2xl font-serif text-pink-600 font-bold italic">Cycle History</h3>
            <p className="text-[11px] text-gray-400 italic">Review, expand dynamic forecasts, and manage your documented cycle history.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {onOpenDoctorReport && (
              <button
                onClick={onOpenDoctorReport}
                className="px-4 py-2 bg-gradient-to-r from-pink-500 to-rose-450 hover:from-pink-600 hover:to-rose-500 text-white font-extrabold uppercase text-[9px] tracking-widest rounded-full shadow-md transition-all cursor-pointer flex items-center gap-1.5"
                title="Generate Doctor Clinical Report"
              >
                <FileText size={12} />
                <span>Doctor Report</span>
              </button>
            )}
            <button 
              onClick={() => setIsViewingTrends(true)}
              className="px-4 py-2 bg-pink-50 hover:bg-pink-100 text-pink-600 border border-pink-100 font-extrabold uppercase text-[9px] tracking-widest rounded-full shadow-sm transition-all cursor-pointer flex items-center gap-1.5"
            >
              📈 Cycle Trends
            </button>
            <button 
              onClick={() => setIsAddingPeriod(!isAddingPeriod)}
              className="px-4 py-2 bg-white hover:bg-pink-50 text-pink-600 border border-pink-200 font-extrabold uppercase text-[9px] tracking-widest rounded-full shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
            >
              {isAddingPeriod ? '✕ Close Form' : '➕ Add Past Cycle'}
            </button>
          </div>
        </div>

        {/* Inline Add Past Cycle Form */}
        {isAddingPeriod && (
          <div className="bg-pink-50/20 border border-pink-100 p-6 rounded-[2.5rem] space-y-4 shadow-sm">
            <h4 className="text-xs font-bold text-pink-500 uppercase tracking-widest">Document Past Period</h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-gray-400 uppercase">Start Date</label>
                <input 
                  type="date"
                  value={newPeriodData.startDate}
                  onChange={(e) => setNewPeriodData(prev => ({ ...prev, startDate: e.target.value }))}
                  className="w-full text-xs p-3 bg-white border border-pink-100 rounded-xl text-gray-700 outline-none focus:border-pink-300"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-gray-400 uppercase">End Date</label>
                <input 
                  type="date"
                  value={newPeriodData.endDate}
                  onChange={(e) => setNewPeriodData(prev => ({ ...prev, endDate: e.target.value }))}
                  className="w-full text-xs p-3 bg-white border border-pink-100 rounded-xl text-gray-700 outline-none focus:border-pink-300"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-gray-400 uppercase">Intensity</label>
                <select 
                  value={newPeriodData.intensity}
                  onChange={(e) => setNewPeriodData(prev => ({ ...prev, intensity: e.target.value as any }))}
                  className="w-full text-xs p-3 bg-white border border-pink-100 rounded-xl text-gray-700 outline-none focus:border-pink-300"
                >
                  <option value="spotting">Spotting</option>
                  <option value="light">Light</option>
                  <option value="medium">Medium</option>
                  <option value="heavy">Heavy</option>
                </select>
              </div>
            </div>
            <div className="flex gap-2.5 pt-2">
              <button 
                onClick={handleAddNewPeriod}
                className="px-5 py-2.5 bg-gradient-to-r from-pink-400 to-rose-400 text-white rounded-full text-[9px] font-bold uppercase tracking-widest hover:shadow-md cursor-pointer transition-all"
              >
                💾 Save Record
              </button>
              <button 
                onClick={() => setIsAddingPeriod(false)}
                className="px-5 py-2.5 bg-white border border-gray-150 text-gray-500 rounded-full text-[9px] font-bold uppercase tracking-widest hover:bg-gray-50 cursor-pointer transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {pastPeriods.length === 0 ? (
          <div className="bg-white p-12 rounded-[2.5rem] text-center border border-pink-50 shadow-sm">
            <span className="text-4xl block mb-4">📜</span>
            <p className="text-pink-300 italic font-serif">No historical cycles logged. Click 'Add Past Cycle' to build your record sanctuary.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {pastPeriods.map((period, idx) => {
              const start = new Date(period.startDate);
              const end = new Date(period.endDate);
              const isViewing = viewingPeriodId === period.id;
              const isEditing = editingPeriodData?.id === period.id;
              const monthLabel = start.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
              
              const calcs = getPeriodCalculations(period, idx, pastPeriods);

              return (
                <div key={period.id} className="bg-white rounded-[2.5rem] border border-pink-50 shadow-sm overflow-hidden hover:border-pink-100 transition-colors">
                  
                  {/* Row Header */}
                  <div className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-b from-white to-pink-50/10">
                    <div>
                      <h4 className="font-serif text-lg font-bold text-gray-800 leading-tight">
                        {monthLabel}
                      </h4>
                      <p className="text-xs text-gray-400 font-medium italic mt-0.5">
                        {start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – {end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      <button 
                        onClick={() => {
                          setViewingPeriodId(isViewing ? null : period.id);
                          setEditingPeriodData(null);
                        }}
                        className={`px-4 py-2 rounded-full font-serif font-bold italic text-xs border transition-all cursor-pointer ${isViewing ? 'bg-pink-100 border-pink-200 text-pink-700' : 'bg-white border-pink-50 text-pink-500 hover:bg-pink-50/20'}`}
                      >
                        - View
                      </button>
                      <button 
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
                        className={`px-4 py-2 rounded-full font-serif font-bold italic text-xs border transition-all cursor-pointer ${isEditing ? 'bg-rose-100 border-rose-200 text-rose-700' : 'bg-white border-pink-50 text-gray-500 hover:bg-gray-50'}`}
                      >
                        - Edit
                      </button>
                    </div>
                  </div>

                  {/* VIEW DETAILS DRAWER */}
                  {isViewing && (
                    <div className="border-t border-pink-100/30 p-6 bg-pink-50/5 space-y-6 animate-slideDownBlock">
                      <p className="text-[10px] font-bold text-pink-400 uppercase tracking-widest mb-2">📊 Recalculated Health Sanctuary Parameters</p>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-xs font-serif italic text-gray-650">
                        <div className="bg-white p-3.5 rounded-xl border border-pink-50/40">
                          <p className="text-[9px] uppercase tracking-wider text-pink-300 font-sans font-bold">Period length</p>
                          <p className="text-base text-pink-600 font-bold mt-1">{calcs.periodLength} days</p>
                          <p className="text-[9px] text-gray-400 font-sans mt-0.5">Bleeding duration</p>
                        </div>
                        
                        <div className="bg-white p-3.5 rounded-xl border border-pink-50/40">
                          <p className="text-[9px] uppercase tracking-wider text-purple-300 font-sans font-bold">Cycle length</p>
                          <p className="text-base text-purple-600 font-bold mt-1">{calcs.cycleLength} days</p>
                          <p className="text-[9px] text-gray-400 font-sans mt-0.5">Start-to-start spacing</p>
                        </div>

                        <div className="bg-white p-3.5 rounded-xl border border-pink-50/40 col-span-2 md:col-span-1">
                          <p className="text-[9px] uppercase tracking-wider text-amber-500 font-sans font-bold">Ovulation prediction</p>
                          <p className="text-sm text-amber-600 font-bold mt-1.5">{calcs.ovulationDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                          <p className="text-[9px] text-gray-400 font-sans mt-0.5">Luteinizing surge estimate</p>
                        </div>
                      </div>

                      <div className="bg-white p-5 rounded-2xl border border-pink-50">
                        <p className="text-[10px] uppercase tracking-wider text-gray-450 font-sans font-bold mb-3">🌙 Dynamic Phase Breakdown</p>
                        <div className="space-y-4">
                          <div className="flex justify-between items-center text-xs pb-2 border-b border-gray-50">
                            <div>
                              <p className="font-semibold text-gray-800">Menstrual Phase</p>
                              <p className="text-[10px] text-gray-400 font-sans">Coincides with shedding of lining</p>
                            </div>
                            <p className="font-medium text-pink-500">{start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – {end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</p>
                          </div>

                          <div className="flex justify-between items-center text-xs pb-2 border-b border-gray-50">
                            <div>
                              <p className="font-semibold text-gray-800">Follicular Phase</p>
                              <p className="text-[10px] text-gray-400 font-sans">Follicles mature prior to release</p>
                            </div>
                            <p className="font-medium text-purple-500">{calcs.follicularStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – {calcs.follicularEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</p>
                          </div>

                          <div className="flex justify-between items-center text-xs pb-2 border-b border-gray-50">
                            <div>
                              <p className="font-semibold text-gray-800">Fertility Window</p>
                              <p className="text-[10px] text-gray-400 font-sans">Enhanced probability of conception</p>
                            </div>
                            <p className="font-medium text-amber-600">{calcs.fertilityStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – {calcs.fertilityEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</p>
                          </div>

                          <div className="flex justify-between items-center text-xs">
                            <div>
                              <p className="font-semibold text-gray-800">Luteal Phase</p>
                              <p className="text-[10px] text-gray-400 font-sans">Progesterone support cycle continuation</p>
                            </div>
                            <p className="font-medium text-indigo-500">{calcs.lutealStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – {calcs.lutealEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* EDIT PANEL */}
                  {isEditing && editingPeriodData && (
                    <div className="border-t border-pink-100 p-6 bg-rose-50/10 space-y-4 animate-slideDownBlock">
                      <p className="text-[10px] font-bold text-rose-400 uppercase tracking-widest mb-2">🛠 Edit Cycle Parameters</p>
                      
                      {deletePeriodConfirmId === period.id ? (
                        <div className="p-5 bg-rose-50 border border-rose-100 rounded-2xl text-center space-y-3">
                          <p className="text-xs font-semibold text-rose-800">Are you sure you want to delete this entry?</p>
                          <div className="flex justify-center gap-2 pt-1">
                            <button
                              onClick={() => {
                                handleDeletePeriod(period.id);
                              }}
                              className="px-4 py-1.5 bg-rose-600 text-white rounded-full text-[9px] font-bold uppercase tracking-widest hover:bg-rose-700 cursor-pointer transition-colors"
                            >
                              Yes, Delete
                            </button>
                            <button
                              onClick={() => setDeletePeriodConfirmId(null)}
                              className="px-4 py-1.5 bg-white border border-gray-200 text-gray-600 rounded-full text-[9px] font-bold uppercase tracking-widest hover:bg-gray-50 cursor-pointer transition-colors"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div className="space-y-1">
                              <label className="text-[9px] font-bold text-gray-400 uppercase">Start Date</label>
                              <input 
                                type="date"
                                value={editingPeriodData.startDate}
                                onChange={(e) => setEditingPeriodData(prev => prev ? ({ ...prev, startDate: e.target.value }) : null)}
                                className="w-full text-xs p-3 bg-white border border-pink-100 rounded-xl"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[9px] font-bold text-gray-400 uppercase">End Date</label>
                              <input 
                                type="date"
                                value={editingPeriodData.endDate}
                                onChange={(e) => setEditingPeriodData(prev => prev ? ({ ...prev, endDate: e.target.value }) : null)}
                                className="w-full text-xs p-3 bg-white border border-pink-100 rounded-xl"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[9px] font-bold text-gray-400 uppercase">Intensity</label>
                              <select 
                                value={editingPeriodData.intensity}
                                onChange={(e) => setEditingPeriodData(prev => prev ? ({ ...prev, intensity: e.target.value as any }) : null)}
                                className="w-full text-xs p-3 bg-white border border-pink-100 rounded-xl"
                              >
                                <option value="spotting">Spotting</option>
                                <option value="light">Light</option>
                                <option value="medium">Medium</option>
                                <option value="heavy">Heavy</option>
                              </select>
                            </div>
                          </div>

                          <div className="flex justify-between items-center pt-2">
                            <div className="flex gap-2">
                              <button
                                onClick={() => {
                                  handleSaveEditPeriod(
                                    period.id,
                                    editingPeriodData.startDate,
                                    editingPeriodData.endDate,
                                    editingPeriodData.intensity
                                  );
                                }}
                                className="px-5 py-2 bg-gradient-to-r from-pink-400 to-rose-400 hover:from-pink-500 hover:to-rose-500 text-white rounded-full text-[9px] font-extrabold uppercase tracking-widest hover:shadow-md cursor-pointer transition-all"
                              >
                                Save Changes
                              </button>
                              <button
                                onClick={() => setEditingPeriodData(null)}
                                className="px-5 py-2 bg-white border border-gray-150 text-gray-500 rounded-full text-[9px] font-extrabold uppercase tracking-widest hover:bg-gray-50 cursor-pointer transition-all"
                              >
                                Cancel
                              </button>
                            </div>
                            
                            <button
                              onClick={() => setDeletePeriodConfirmId(period.id)}
                              className="px-4 py-2 bg-rose-50 text-rose-600 hover:bg-rose-100/70 border border-rose-100 rounded-full text-[9px] font-extrabold uppercase tracking-widest cursor-pointer transition-colors"
                            >
                              🗑️ Delete Cycle
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
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-fadeIn">
        {/* Left Column: Calendar Grid */}
        <div className="lg:col-span-12 xl:col-span-7 bg-white p-6 sm:p-8 rounded-[2.5rem] shadow-sm border border-pink-50 flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-6 px-2">
              <h3 className="font-serif text-xl text-pink-600 italic">{monthName} {year}</h3>
              <div className="flex gap-2">
                <button onClick={() => setCurrentDate(new Date(year, currentDate.getMonth() - 1, 1))} className="p-2 text-pink-300 hover:text-pink-500 hover:scale-110 transition-transform">←</button>
                <button onClick={() => setCurrentDate(new Date(year, currentDate.getMonth() + 1, 1))} className="p-2 text-pink-300 hover:text-pink-500 hover:scale-110 transition-transform">→</button>
              </div>
            </div>

            <div className="grid grid-cols-7 gap-2 sm:gap-2.5">
              {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
                <div key={`${d}-${i}`} className="text-center text-[10px] font-bold text-pink-200 uppercase py-2">{d}</div>
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
                let bgClass = 'bg-white hover:bg-gray-50 text-gray-700';
                let borderClass = 'border border-transparent';
                let roundedClass = 'rounded-2xl';

                if (details.phaseKey === 'menstrual') {
                  if (isLogged) {
                    // Confirmed period: Solid pink
                    bgClass = 'bg-pink-500 text-white font-bold shadow-sm shadow-pink-100';
                    borderClass = 'border border-pink-500';
                  } else {
                    // Predicted period: Dashed pink outline
                    bgClass = 'bg-pink-50/80 text-pink-700 font-semibold';
                    borderClass = 'border-2 border-dashed border-pink-300';
                  }
                } else if (details.isOvulationDay) {
                  // Requirement 2 & 4: Distinct color & marker for single estimated ovulation day (Golden yellow)
                  bgClass = 'bg-amber-400 text-white font-black shadow-md shadow-amber-200 ring-2 ring-amber-300 ring-offset-1';
                  borderClass = 'border-amber-400';
                } else if (details.isPrecedingFertileDay) {
                  // Requirement 3: Highlight the five preceding fertile days separately in light blue
                  bgClass = 'bg-sky-50 text-sky-800 font-bold border border-sky-300 hover:bg-sky-100/80 shadow-xs';
                  borderClass = 'border border-sky-300';
                } else if (details.phaseKey === 'follicular') {
                  // Follicular phase: Soft green
                  bgClass = 'bg-emerald-50 text-emerald-800 border border-emerald-200/70 font-medium hover:bg-emerald-100/60';
                  borderClass = 'border border-emerald-200/70';
                } else if (details.phaseKey === 'luteal') {
                  // Requirement 2: Luteal phase dynamically marked in lavender/purple until next period
                  bgClass = 'bg-purple-100/75 text-purple-900 border border-purple-200/80 font-medium hover:bg-purple-100';
                  borderClass = 'border border-purple-200/80';
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
                    onClick={() => {
                      setSelectedCalendarDate(date);
                    }}
                    className={`aspect-square relative flex flex-col items-center justify-center text-sm transition-all focus:outline-none ${bgClass} ${borderClass} ${roundedClass} ${
                      isSelected ? 'ring-2 ring-stone-900 ring-offset-2 scale-105 z-20 shadow-md' : ''
                    }`}
                  >
                    {/* Visual icons/markers for easy tracking */}
                    <div className="absolute top-1 left-1 right-1 flex justify-between gap-0.5 select-none pointer-events-none">
                      {details.isOvulationDay ? (
                        <span className="text-[10px]" title="Single Estimated Ovulation Day">🎯</span>
                      ) : details.isPrecedingFertileDay ? (
                        <span className="text-[8.5px] text-sky-600 font-bold" title="Fertile Window (5 Days Preceding Ovulation)">✨</span>
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
                          <span className="text-[8px] animate-pulse" title="Emergency contraception">
                            {emergencyEm}
                          </span>
                        )}
                      </div>
                    </div>

                    <span className="mt-2 text-xs sm:text-sm font-semibold">{day}</span>

                    {/* Dedicated Indicator Dot for Today */}
                    {isToday && (
                      <span className="absolute bottom-1 w-1.5 h-1.5 bg-rose-500 rounded-full ring-1 ring-white" title="Today"></span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Upgraded Legend */}
          <div className="mt-8 border-t border-pink-50 pt-6">
            <h4 className="text-[10px] font-bold text-pink-300 uppercase tracking-widest text-center mb-4">Cycle Phase & Reproductive Health Legend</h4>
            <div className="grid grid-cols-2 sm:grid-cols-6 gap-2.5 text-center mb-4 animate-fadeIn">
              <div className="flex flex-col items-center p-2 rounded-xl bg-pink-50/50 border border-pink-200/50">
                <div className="w-5 h-5 rounded-md bg-pink-500 mb-1 flex items-center justify-center text-[10px] text-white font-bold">🩸</div>
                <span className="text-[9px] font-bold text-pink-700 uppercase">Confirmed (Solid)</span>
              </div>
              <div className="flex flex-col items-center p-2 rounded-xl bg-pink-50/50 border-2 border-dashed border-pink-300">
                <div className="w-5 h-5 rounded-md bg-pink-100 mb-1 flex items-center justify-center text-pink-700 text-xs border border-dashed border-pink-300">🩸</div>
                <span className="text-[9px] font-bold text-pink-700 uppercase">Predicted (Dashed)</span>
              </div>
              <div className="flex flex-col items-center p-2 rounded-xl bg-emerald-50/70 border border-emerald-200/60">
                <div className="w-5 h-5 rounded-md bg-emerald-100 mb-1 flex items-center justify-center text-emerald-700 text-xs text-[10px]">🌱</div>
                <span className="text-[9px] font-bold text-emerald-800 uppercase">Follicular (Green)</span>
              </div>
              <div className="flex flex-col items-center p-2 rounded-xl bg-sky-50/70 border border-sky-300">
                <div className="w-5 h-5 rounded-md bg-sky-100 mb-1 flex items-center justify-center text-sky-700 text-[10px] font-bold">✨</div>
                <span className="text-[9px] font-bold text-sky-800 uppercase">Fertile (Light Blue)</span>
              </div>
              <div className="flex flex-col items-center p-2 rounded-xl bg-amber-50/70 border border-amber-300">
                <div className="w-5 h-5 rounded-md bg-amber-400 mb-1 flex items-center justify-center text-white text-[10px] font-bold">🎯</div>
                <span className="text-[9px] font-bold text-amber-800 uppercase">Ovulation (Gold)</span>
              </div>
              <div className="flex flex-col items-center p-2 rounded-xl bg-purple-100/70 border border-purple-200">
                <div className="w-5 h-5 rounded-md bg-purple-200/80 mb-1 flex items-center justify-center text-purple-800 text-xs text-[10px]">🍂</div>
                <span className="text-[9px] font-bold text-purple-900 uppercase">Luteal (Lavender)</span>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center bg-pink-50/10 p-3 rounded-2xl border border-pink-100/30">
              <div className="flex items-center gap-1.5 justify-center">
                <span className="w-3 h-3 rounded-full border-2 border-stone-800 inline-block"></span>
                <span className="text-[8px] font-bold text-stone-600 uppercase tracking-tight">Selected Date</span>
              </div>
              <div className="flex items-center gap-1.5 justify-center">
                <span className="w-2 h-2 rounded-full bg-rose-500 inline-block"></span>
                <span className="text-[8px] font-bold text-pink-600 uppercase tracking-tight">Today</span>
              </div>
              <div className="flex items-center gap-1 justify-center">
                <span className="text-[10px]">💖</span>
                <span className="text-[8px] font-bold text-pink-500 uppercase tracking-tight">Protected</span>
              </div>
              <div className="flex items-center gap-1 justify-center">
                <span className="text-[10px]">❤️</span>
                <span className="text-[8px] font-bold text-rose-500 uppercase tracking-tight">Unprotected</span>
              </div>
              <div className="flex items-center gap-1 justify-center">
                <span className="text-[10px]">💊</span>
                <span className="text-[8px] font-bold text-purple-600 uppercase tracking-tight">Pill/IUD</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Dynamic Sanctuary Insights Panel */}
        <div className="lg:col-span-12 xl:col-span-5 space-y-6">
          <div className="bg-gradient-to-br from-white to-pink-50/20 p-8 rounded-[2.5rem] shadow-sm border border-pink-50 space-y-6">
            <div className="flex justify-between items-start border-b border-pink-100 pb-4">
              <div>
                <span className="text-xs font-bold text-pink-300 uppercase tracking-widest">Selected Date</span>
                <h4 className="text-base font-serif italic text-pink-600 mt-1">{selectedDateStr}</h4>
              </div>
              <span className="text-3xl">{selectedDetails.phaseEmoji || '🌸'}</span>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-pink-300 uppercase tracking-widest">Cycle Phase</span>
                <span className={`px-3 py-1.5 rounded-full font-bold text-[9px] uppercase tracking-widest ${selectedDetails.badgeColor}`}>
                  {selectedDetails.phaseName}
                </span>
              </div>

              {selectedDetails.isWithinFertileWindow && selectedDetails.fertilityStatus && (
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-sky-600 uppercase tracking-widest">Fertility Status</span>
                  <span className={`font-bold italic text-sky-700`}>
                    {selectedDetails.fertilityStatus}
                  </span>
                </div>
              )}

              {/* Private Sexual Activity Logging Sub-card */}
              {(() => {
                const activeSexLog = (user.sexualActivityLogs || []).find(l => l.date === selectedCalendarDate.toDateString());
                const pregInfo = getPregnancyPossibility(selectedCalendarDate, user.sexualActivityLogs || [], selectedDetails.fertilityKey);
                
                return (
                  <div className="bg-white p-5 rounded-3xl border border-pink-100/60 space-y-4 shadow-sm">
                    <div className="flex justify-between items-center">
                      <h5 className="text-[10px] font-bold text-pink-600 uppercase tracking-widest flex items-center gap-1.5">
                        <span>💞</span> Intimacy Tracker
                      </h5>
                      <span className="text-[8px] font-bold bg-pink-100 text-pink-500 px-2 py-0.5 rounded-md uppercase tracking-widest">
                        🔒 Private
                      </span>
                    </div>

                    {/* Toggle Intimacy */}
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => handleUpdateSexualActivity(
                          selectedCalendarDate,
                          true,
                          activeSexLog?.protection || 'protected',
                          activeSexLog?.ejaculation || 'none',
                          activeSexLog?.contraceptiveMethod || 'none',
                          activeSexLog?.emergencyContraceptiveTaken || false,
                          activeSexLog?.emergencyContraceptiveTime || ''
                        )}
                        className={`py-2 px-1 text-[9px] font-bold rounded-xl border transition-all uppercase tracking-wider ${
                          activeSexLog?.hadSex 
                            ? 'bg-pink-500 text-white border-pink-500 shadow-sm' 
                            : 'bg-white text-pink-400 border-pink-100 hover:bg-pink-50/50'
                        }`}
                      >
                        Yes, Intimacy Logged
                      </button>
                      <button
                        onClick={() => handleUpdateSexualActivity(selectedCalendarDate, false)}
                        className={`py-2 px-1 text-[9px] font-bold rounded-xl border transition-all uppercase tracking-wider ${
                          !activeSexLog?.hadSex 
                            ? 'bg-gray-100 text-gray-500 border-gray-200' 
                            : 'bg-white text-gray-400 border-pink-100 hover:bg-pink-50/50'
                        }`}
                      >
                        No Intimacy
                      </button>
                    </div>

                    {activeSexLog?.hadSex && (
                      <div className="space-y-4 pt-3 border-t border-pink-50 animate-fadeIn">
                        {/* Protection State */}
                        <div className="space-y-1.5">
                          <p className="text-[9px] font-bold text-pink-400 uppercase tracking-wider">Protection Status</p>
                          <div className="grid grid-cols-2 gap-2">
                            <button
                              onClick={() => handleUpdateSexualActivity(
                                selectedCalendarDate,
                                true,
                                'protected',
                                activeSexLog.ejaculation || 'none',
                                activeSexLog.contraceptiveMethod,
                                activeSexLog.emergencyContraceptiveTaken,
                                activeSexLog.emergencyContraceptiveTime
                              )}
                              className={`py-1.5 rounded-lg text-[9px] font-bold border transition-all uppercase tracking-wider ${
                                activeSexLog.protection === 'protected'
                                  ? 'bg-pink-50 border-pink-300 text-pink-700'
                                  : 'bg-white border-gray-100 text-gray-400 hover:bg-gray-50'
                              }`}
                            >
                              Protected Sex 🛡️
                            </button>
                            <button
                              onClick={() => handleUpdateSexualActivity(
                                selectedCalendarDate,
                                true,
                                'unprotected',
                                activeSexLog.ejaculation || 'none',
                                activeSexLog.contraceptiveMethod,
                                activeSexLog.emergencyContraceptiveTaken,
                                activeSexLog.emergencyContraceptiveTime
                              )}
                              className={`py-1.5 rounded-lg text-[9px] font-bold border transition-all uppercase tracking-wider ${
                                activeSexLog.protection === 'unprotected'
                                  ? 'bg-rose-50 border-rose-300 text-rose-700'
                                  : 'bg-white border-gray-100 text-gray-400 hover:bg-gray-50'
                              }`}
                            >
                              Unprotected Sex ⚠️
                            </button>
                          </div>
                        </div>

                        {/* Ejaculation State */}
                        <div className="space-y-1.5">
                          <p className="text-[9px] font-bold text-pink-400 uppercase tracking-wider">Ejaculation Occurrences</p>
                          <div className="grid grid-cols-2 gap-2">
                            <button
                              onClick={() => handleUpdateSexualActivity(
                                selectedCalendarDate,
                                true,
                                activeSexLog.protection || 'protected',
                                'occurred',
                                activeSexLog.contraceptiveMethod,
                                activeSexLog.emergencyContraceptiveTaken,
                                activeSexLog.emergencyContraceptiveTime
                              )}
                              className={`py-1.5 rounded-lg text-[9px] font-bold border transition-all uppercase tracking-wider ${
                                activeSexLog.ejaculation === 'occurred'
                                  ? 'bg-pink-50 border-pink-300 text-pink-700 font-bold'
                                  : 'bg-white border-gray-100 text-gray-400 hover:bg-gray-50'
                              }`}
                            >
                              Ejaculation Occurred
                            </button>
                            <button
                              onClick={() => handleUpdateSexualActivity(
                                selectedCalendarDate,
                                true,
                                activeSexLog.protection || 'protected',
                                'none',
                                activeSexLog.contraceptiveMethod,
                                activeSexLog.emergencyContraceptiveTaken,
                                activeSexLog.emergencyContraceptiveTime
                              )}
                              className={`py-1.5 rounded-lg text-[9px] font-bold border transition-all uppercase tracking-wider ${
                                activeSexLog.ejaculation === 'none'
                                  ? 'bg-pink-50 border-pink-300 text-pink-700 font-bold'
                                  : 'bg-white border-gray-100 text-gray-400 hover:bg-gray-50'
                              }`}
                            >
                              No Ejaculation
                            </button>
                          </div>
                        </div>

                        {/* Contraceptive Method Selection */}
                        <div className="space-y-1.5 pt-1 border-t border-pink-50">
                          <p className="text-[9px] font-bold text-pink-400 uppercase tracking-wider">Contraceptive Method Used</p>
                          <div className="grid grid-cols-2 gap-2">
                            {[
                              { key: 'condom', label: 'Condom 🛡️' },
                              { key: 'pill', label: 'Pill 💊' },
                              { key: 'iud', label: 'IUD 🧬' },
                              { key: 'implant', label: 'Implant 🩹' },
                              { key: 'other', label: 'Other 🔮' },
                              { key: 'none', label: 'None ❌' }
                            ].map((item) => (
                              <button
                                key={item.key}
                                onClick={() => handleUpdateSexualActivity(
                                  selectedCalendarDate,
                                  true,
                                  activeSexLog.protection || 'protected',
                                  activeSexLog.ejaculation,
                                  item.key as any,
                                  activeSexLog.emergencyContraceptiveTaken,
                                  activeSexLog.emergencyContraceptiveTime
                                )}
                                className={`py-1.5 rounded-lg text-[9px] font-bold border transition-all uppercase tracking-wider ${
                                  (activeSexLog.contraceptiveMethod || 'none') === item.key
                                    ? 'bg-pink-100/80 border-pink-300 text-pink-700 font-extrabold'
                                    : 'bg-white border-gray-100 text-gray-400 hover:bg-gray-50'
                                }`}
                              >
                                {item.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Emergency Contreception Token */}
                        <div className="space-y-1.5 pt-1 border-t border-pink-50">
                          <div className="flex justify-between items-center">
                            <p className="text-[9px] font-bold text-rose-400 uppercase tracking-wider">Emergency Contraception</p>
                            <span className="text-[8px] font-bold text-rose-300 uppercase tracking-widest">e.g. Morning-After Pill</span>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <button
                              onClick={() => handleUpdateSexualActivity(
                                selectedCalendarDate,
                                true,
                                activeSexLog.protection,
                                activeSexLog.ejaculation,
                                activeSexLog.contraceptiveMethod,
                                true,
                                activeSexLog.emergencyContraceptiveTime || 'Within 24 Hours'
                              )}
                              className={`py-1.5 rounded-lg text-[9px] font-bold border transition-all uppercase tracking-wider ${
                                activeSexLog.emergencyContraceptiveTaken
                                  ? 'bg-rose-100 border-rose-300 text-rose-700 font-extrabold animate-pulse'
                                  : 'bg-white border-gray-100 text-gray-400 hover:bg-gray-50'
                              }`}
                            >
                              💊 Yes, Taken
                            </button>
                            <button
                              onClick={() => handleUpdateSexualActivity(
                                selectedCalendarDate,
                                true,
                                activeSexLog.protection,
                                activeSexLog.ejaculation,
                                activeSexLog.contraceptiveMethod,
                                false,
                                ''
                              )}
                              className={`py-1.5 rounded-lg text-[9px] font-bold border transition-all uppercase tracking-wider ${
                                !activeSexLog.emergencyContraceptiveTaken
                                  ? 'bg-gray-50 border-gray-200 text-gray-500'
                                  : 'bg-white border-gray-100 text-gray-400 hover:bg-gray-50'
                              }`}
                            >
                              Not Taken
                            </button>
                          </div>
                        </div>

                        {/* Emergency Contraception Intake Time/Date Info */}
                        {activeSexLog.emergencyContraceptiveTaken && (
                          <div className="space-y-1.5 pt-1 animate-fadeIn">
                            <p className="text-[9px] font-bold text-rose-400 uppercase tracking-wider">Intake Time Frame / Note</p>
                            <div className="grid grid-cols-2 gap-1.5">
                              {[
                                'Within 12h',
                                'Within 24h',
                                'Within 48h',
                                'Within 72h'
                              ].map((timeOption) => (
                                <button
                                  key={timeOption}
                                  onClick={() => handleUpdateSexualActivity(
                                    selectedCalendarDate,
                                    true,
                                    activeSexLog.protection,
                                    activeSexLog.ejaculation,
                                    activeSexLog.contraceptiveMethod,
                                    true,
                                    timeOption
                                  )}
                                  className={`py-1 rounded-md text-[8px] font-bold border transition-all uppercase ${
                                    activeSexLog.emergencyContraceptiveTime === timeOption
                                      ? 'bg-rose-100 border-rose-300 text-rose-700 font-extrabold'
                                      : 'bg-white border-gray-100 text-gray-400 hover:bg-rose-50'
                                  }`}
                                >
                                  {timeOption}
                                </button>
                              ))}
                              <div className="col-span-2">
                                <input
                                  type="text"
                                  placeholder="Or custom details..."
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
                                  className="w-full text-[9px] px-2.5 py-1.5 border border-pink-100 rounded-lg focus:outline-pink-300 text-pink-700 placeholder:text-pink-200 bg-rose-50/20"
                                />
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Educational Pregnancy Likelihood Insight */}
                        <div className="bg-pink-50/30 p-3 rounded-2xl border border-pink-100 text-left space-y-1.5">
                          <div className="flex justify-between items-center text-[9px] font-bold uppercase tracking-wider">
                            <span className="text-pink-400">Possibility Estimation</span>
                            <span className={pregInfo.colorClass}>{pregInfo.label}</span>
                          </div>
                          <p className="text-[10px] text-pink-600 leading-relaxed font-serif italic">
                            {pregInfo.desc}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}

              <div className="bg-pink-50/30 p-4 rounded-2xl border border-pink-100/50 space-y-2">
                <h5 className="text-[10px] font-bold text-pink-600 uppercase tracking-widest">Hormonal Profile</h5>
                <p className="text-[11px] text-pink-500 leading-relaxed font-serif italic">{selectedDetails.hormoneInfo}</p>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-pink-50 space-y-2">
                <h5 className="text-[10px] font-bold text-pink-600 uppercase tracking-widest">Sanctuary Recommendations</h5>
                <p className="text-[11px] text-pink-400 leading-relaxed font-serif italic">{selectedDetails.insights}</p>
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
                  <div className="bg-rose-50/10 p-5 rounded-[2rem] border border-rose-100/40 space-y-3.5 animate-fadeIn">
                    <div className="flex justify-between items-center pb-2 border-b border-rose-100/20">
                      <h5 className="text-[10px] font-bold text-rose-500 uppercase tracking-widest flex items-center gap-1.5">
                        <span>🗑️</span> Logged Items & Corrections
                      </h5>
                    </div>

                    <div className="space-y-2.5">
                      {/* Intimacy Log Row */}
                      {sexLog && sexLog.hadSex && (
                        <div className="bg-white p-3 rounded-xl border border-rose-100/20 text-xs flex flex-col gap-2 text-left">
                          <div className="flex justify-between items-center">
                            <div>
                              <p className="font-bold text-gray-800">💞 Intimacy Logged</p>
                              <p className="text-[9px] text-gray-400 capitalize">Protection: {sexLog.protection || 'None'}</p>
                            </div>
                            {deletingIntimacyConfirm ? (
                              <div className="flex gap-1.5">
                                <button
                                  onClick={() => {
                                    handleDeleteIntimacyLog(sexLog.id);
                                    setDeletingIntimacyConfirm(false);
                                  }}
                                  className="px-2.5 py-1 bg-rose-600 text-white rounded-md text-[9px] font-bold uppercase transition-colors cursor-pointer"
                                >
                                  Yes
                                </button>
                                <button
                                  onClick={() => setDeletingIntimacyConfirm(false)}
                                  className="px-2.5 py-1 bg-gray-150 text-gray-600 rounded-md text-[9px] font-bold uppercase hover:bg-gray-200 transition-colors cursor-pointer"
                                >
                                  No
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => setDeletingIntimacyConfirm(true)}
                                className="text-[9px] font-bold text-rose-500 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 px-2.5 py-1 rounded-md transition-colors cursor-pointer"
                              >
                                Delete
                              </button>
                            )}
                          </div>
                          {deletingIntimacyConfirm && (
                            <p className="text-[9px] text-rose-600 italic">Are you sure you want to delete this entry?</p>
                          )}
                        </div>
                      )}

                      {/* Contraceptive Pill Log Row */}
                      {bcLog && (
                        <div className="bg-white p-3 rounded-xl border border-rose-100/20 text-xs flex flex-col gap-2 text-left">
                          <div className="flex justify-between items-center">
                            <div>
                              <p className="font-bold text-gray-800">💊 Contraceptive Logged</p>
                              <p className="text-[9px] text-gray-400">Birth control pill taken on this day</p>
                            </div>
                            {deletingBCConfirm ? (
                              <div className="flex gap-1.5">
                                <button
                                  onClick={() => {
                                    handleDeleteBCLog(dateStr);
                                    setDeletingBCConfirm(false);
                                  }}
                                  className="px-2.5 py-1 bg-rose-600 text-white rounded-md text-[9px] font-bold uppercase transition-colors cursor-pointer"
                                >
                                  Yes
                                </button>
                                <button
                                  onClick={() => setDeletingBCConfirm(false)}
                                  className="px-2.5 py-1 bg-gray-150 text-gray-600 rounded-md text-[9px] font-bold uppercase hover:bg-gray-200 transition-colors cursor-pointer"
                                >
                                  No
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => setDeletingBCConfirm(true)}
                                className="text-[9px] font-bold text-rose-500 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 px-2.5 py-1 rounded-md transition-colors cursor-pointer"
                              >
                                Delete
                              </button>
                            )}
                          </div>
                          {deletingBCConfirm && (
                            <p className="text-[9px] text-rose-600 italic">Are you sure you want to delete this entry?</p>
                          )}
                        </div>
                      )}

                      {/* Symptoms Rows */}
                      {daySymptoms.map((sym) => (
                        <div key={sym.id} className="bg-white p-3 rounded-xl border border-rose-100/20 text-xs flex flex-col gap-2 text-left">
                          <div className="flex justify-between items-center">
                            <div>
                              <p className="font-bold text-gray-800">✨ Symptom: <span className="capitalize">{sym.type.replace('_', ' ')}</span></p>
                              <p className="text-[9px] text-gray-400">Intensity Level: {sym.intensity} / 3</p>
                            </div>
                            {deletingSymptomId === sym.id ? (
                              <div className="flex gap-1.5">
                                <button
                                  onClick={() => {
                                    handleDeleteSymptom(sym.id);
                                    setDeletingSymptomId(null);
                                  }}
                                  className="px-2.5 py-1 bg-rose-600 text-white rounded-md text-[9px] font-bold uppercase transition-colors cursor-pointer"
                                >
                                  Yes
                                </button>
                                <button
                                  onClick={() => setDeletingSymptomId(null)}
                                  className="px-2.5 py-1 bg-gray-150 text-gray-600 rounded-md text-[9px] font-bold uppercase hover:bg-gray-200 transition-colors cursor-pointer"
                                >
                                  No
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => setDeletingSymptomId(sym.id)}
                                className="text-[9px] font-bold text-rose-500 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 px-2.5 py-1 rounded-md transition-colors cursor-pointer"
                              >
                                Delete
                              </button>
                            )}
                          </div>
                          {deletingSymptomId === sym.id && (
                            <p className="text-[9px] text-rose-600 italic">Are you sure you want to delete this entry?</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Quick Period Logging on this Selection */}
            <div className="pt-2">
              <button
                onClick={() => {
                  const dateStr = selectedCalendarDate.toDateString();
                  handleToggleAndCleanPeriodDate(dateStr);
                }}
                className={`w-full py-4 rounded-2xl font-bold uppercase tracking-widest text-[9px] transition-all flex items-center justify-center gap-2 ${
                  isSelectedPeriodLogged 
                    ? 'bg-pink-50 text-pink-500 border border-pink-200 hover:bg-pink-100' 
                    : 'bg-pink-500 text-white shadow-md shadow-pink-100 hover:bg-pink-600 hover:scale-[1.02]'
                }`}
              >
                <span>{isSelectedPeriodLogged ? '🌸 Bleeding Logged (Tap to Clear)' : '🩸 Log / Toggle Bleeding on this Date'}</span>
              </button>
            </div>
          </div>

          {/* Upgraded Automatic Predictions Board */}
          <div className="bg-gradient-to-tr from-pink-500 to-rose-400 p-8 rounded-[2.5rem] text-white shadow-lg shadow-pink-100/50 space-y-6 relative overflow-hidden">
            <div className="absolute -right-12 -bottom-12 text-[10rem] text-pink-300/10 pointer-events-none select-none font-bold">🔮</div>
            
            <div className="flex justify-between items-center border-b border-white/20 pb-4">
              <h4 className="font-serif italic text-lg flex items-center gap-2 text-white">
                <span>🔮</span> Forecast Summary for {monthName}
              </h4>
              <span className="text-[8px] font-bold bg-white/25 px-2 py-1 rounded-full uppercase tracking-widest text-white">Dynamic</span>
            </div>

            <div className="space-y-4 text-xs">
              <div className="flex justify-between items-start border-b border-white/10 pb-3 h-auto">
                <span className="opacity-85 font-medium">🩸 Menstrual Phase:</span>
                <span className="font-bold text-right pl-4">{formatRanges(menstrualDays)}</span>
              </div>
              <div className="flex justify-between items-start border-b border-white/10 pb-3">
                <span className="opacity-85 font-medium">🌱 Follicular Phase:</span>
                <span className="font-semibold text-right pl-4">{formatRanges(follicularDays)}</span>
              </div>
              <div className="flex justify-between items-start border-b border-white/10 pb-3">
                <span className="opacity-85 font-medium">✨ Fertile Window (5 Days):</span>
                <span className="font-bold text-sky-100 text-right pl-4">{formatRanges(fertilePrecedingDays)}</span>
              </div>
              <div className="flex justify-between items-start border-b border-white/10 pb-3">
                <span className="opacity-85 font-medium">🎯 Predicted Ovulation Day:</span>
                <span className="font-bold text-amber-200 text-right pl-4">{ovulationDateLabel}</span>
              </div>
              <div className="flex justify-between items-start pb-1">
                <span className="opacity-85 font-medium">🍂 Luteal Phase:</span>
                <span className="font-semibold text-right pl-4">{formatRanges(lutealDays)}</span>
              </div>
            </div>

            <div className="bg-white/10 p-4 rounded-2xl border border-white/15">
              <p className="text-[10px] leading-relaxed italic text-pink-50 font-serif">
                ✨ Calculations and fertile windows adapt dynamically when you save periods or shift cycle parameter guidelines inside onboarding!
              </p>
            </div>
          </div>
        </div>

        {/* SECTION 7: CYCLE INSIGHTS AT BOTTOM OF CALENDAR */}
        <div className="lg:col-span-12 mt-6 bg-gradient-to-br from-white via-pink-50/20 to-purple-50/20 p-6 sm:p-8 rounded-[2.5rem] border border-pink-100/80 shadow-xs space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-pink-100/60 pb-4">
            <div>
              <span className="text-[9.5px] font-black uppercase tracking-[0.2em] text-pink-500 block">
                Cycle Intelligence
              </span>
              <h4 className="text-xl font-serif font-bold text-stone-800 italic mt-0.5">
                Cycle Insights Summary
              </h4>
              <p className="text-xs text-stone-500 font-serif italic">
                A synchronized summary of your reproductive health patterns.
              </p>
            </div>
            <button
              onClick={() => setActiveView('stats')}
              className="px-5 py-2.5 bg-gradient-to-r from-pink-500 to-rose-450 hover:from-pink-600 hover:to-rose-500 text-white rounded-full font-bold text-xs uppercase tracking-wider shadow-sm transition-all flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
            >
              <span>View Full Statistics</span>
              <ChevronRight size={13} />
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <div className="bg-white p-4 rounded-2xl border border-pink-100/60 shadow-2xs space-y-1">
              <span className="text-[9px] font-bold text-stone-400 uppercase tracking-wider block">Avg Cycle</span>
              <p className="text-xl font-serif font-black text-pink-600">{analytics.averageCycleDisplay}</p>
              <p className="text-[9px] text-stone-400 italic">Historical average</p>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-pink-100/60 shadow-2xs space-y-1">
              <span className="text-[9px] font-bold text-stone-400 uppercase tracking-wider block">Avg Period</span>
              <p className="text-xl font-serif font-black text-rose-600">{analytics.averagePeriodDisplay}</p>
              <p className="text-[9px] text-stone-400 italic">Bleeding duration</p>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-pink-100/60 shadow-2xs space-y-1">
              <span className="text-[9px] font-bold text-stone-400 uppercase tracking-wider block">Shortest Cycle</span>
              <p className="text-xl font-serif font-black text-pink-700">{analytics.shortestCycle} <span className="text-xs font-sans text-stone-400">days</span></p>
              <p className="text-[9px] text-stone-400 italic">Minimum interval</p>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-pink-100/60 shadow-2xs space-y-1">
              <span className="text-[9px] font-bold text-stone-400 uppercase tracking-wider block">Longest Cycle</span>
              <p className="text-xl font-serif font-black text-purple-700">{analytics.longestCycle} <span className="text-xs font-sans text-stone-400">days</span></p>
              <p className="text-[9px] text-stone-400 italic">Maximum interval</p>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-pink-100/60 shadow-2xs space-y-1 col-span-2 sm:col-span-1">
              <span className="text-[9px] font-bold text-stone-400 uppercase tracking-wider block">Regularity</span>
              <p className="text-base font-serif font-bold text-teal-700">{analytics.cycleRegularity}</p>
              <p className="text-[9px] text-teal-600 font-medium">±{analytics.averageVariationDisplay}</p>
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
        <div className="bg-white p-6 rounded-[2.5rem] border border-pink-100/80 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-pink-50 pb-3">
            <div>
              <span className="text-[9.5px] font-black uppercase tracking-[0.2em] text-pink-500 block">
                Reproductive History
              </span>
              <h3 className="text-xl font-serif font-bold text-stone-800 italic mt-0.5">
                Chronological Health Timeline
              </h3>
            </div>
            <span className="text-[10px] font-bold text-stone-500 bg-stone-50 px-3 py-1 rounded-full border border-stone-200/60 self-start sm:self-auto">
              {filteredEvents.length} {filteredEvents.length === 1 ? 'Record' : 'Records'}
            </span>
          </div>

          {/* Category Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide pb-1">
            {[
              { id: 'all', label: 'All Records', emoji: '📜' },
              { id: 'periods', label: 'Periods', emoji: '🩸' },
              { id: 'symptoms', label: 'Symptoms', emoji: '✨' },
              { id: 'mood', label: 'Moods', emoji: '🌸' },
              { id: 'intimacy', label: 'Intimacy', emoji: '💞' }
            ].map(filter => (
              <button
                key={filter.id}
                onClick={() => setTimelineCategoryFilter(filter.id as any)}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer ${
                  timelineCategoryFilter === filter.id
                    ? 'bg-gradient-to-r from-pink-500 to-rose-400 text-white shadow-2xs'
                    : 'bg-stone-50 hover:bg-pink-50 text-stone-600 hover:text-pink-600 border border-stone-200/50'
                }`}
              >
                <span>{filter.emoji}</span>
                <span>{filter.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Timeline Events List grouped by Month and Year */}
        {monthKeys.length === 0 ? (
          <div className="bg-white p-12 rounded-[2.5rem] text-center border border-pink-100 shadow-xs space-y-2">
            <span className="text-4xl block mb-2">📜</span>
            <h4 className="text-base font-serif font-bold text-stone-800 italic">No events found in this category</h4>
            <p className="text-xs text-stone-400 italic">
              Tap any date on the calendar or log today's journey to build your timeline.
            </p>
          </div>
        ) : (
          monthKeys.map(month => (
            <div key={month} className="space-y-3">
              {/* Month Group Header */}
              <div className="sticky top-2 z-10 flex items-center gap-2 px-2 py-1 bg-[#fffafb]/90 backdrop-blur-md rounded-xl w-fit">
                <span className="w-2 h-2 rounded-full bg-pink-500 inline-block" />
                <h4 className="font-serif font-black text-stone-800 text-sm tracking-tight italic">
                  {month}
                </h4>
              </div>

              {/* Items in Month */}
              <div className="relative border-l-2 border-pink-100/80 ml-3 pl-5 space-y-3">
                {groupedByMonth[month].map(event => {
                  const isExpanded = expandedTimelineId === event.id;
                  const dateFormatted = new Date(event.date).toLocaleDateString('en-US', {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric'
                  });

                  return (
                    <div key={event.id} className="relative group animate-fadeIn">
                      {/* Node point */}
                      <div className="absolute -left-[27px] top-3.5 w-3.5 h-3.5 rounded-full border-2 border-white bg-pink-400 shadow-2xs" />

                      {/* Event Card */}
                      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-pink-100/70 shadow-2xs hover:shadow-xs hover:border-pink-200 transition-all space-y-2">
                        <div 
                          onClick={() => setExpandedTimelineId(isExpanded ? null : event.id)}
                          className="flex items-start justify-between gap-3 cursor-pointer"
                        >
                          <div className="flex items-start gap-3">
                            <div className="w-10 h-10 rounded-xl bg-pink-50/70 flex items-center justify-center text-lg shrink-0 border border-pink-100/50 mt-0.5">
                              {event.emoji}
                            </div>
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className={`text-[8.5px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border ${event.badgeColor}`}>
                                  {event.typeLabel}
                                </span>
                                <span className="text-[10px] font-bold text-stone-400">
                                  {dateFormatted}
                                  {event.endDate && ` → ${new Date(event.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`}
                                </span>
                              </div>
                              <h5 className="font-serif font-bold text-stone-800 text-sm italic">
                                {event.title}
                              </h5>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 text-stone-400 shrink-0">
                            <span className="text-[9.5px] font-serif italic text-pink-500">
                              {isExpanded ? 'Less' : 'Details'}
                            </span>
                            <ChevronDown size={14} className={`transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
                          </div>
                        </div>

                        {/* Expandable details and actions */}
                        {isExpanded && (
                          <div className="pt-3 border-t border-pink-50 space-y-3 animate-fadeIn">
                            {event.details && (
                              <p className="text-xs text-stone-600 font-serif italic leading-relaxed">
                                {event.details}
                              </p>
                            )}

                            {/* Actions toolbar */}
                            <div className="flex items-center justify-end gap-2 pt-1">
                              {event.category === 'periods' && event.rawItem?.id && (
                                <button
                                  onClick={() => setEditingPeriodData({
                                    id: event.rawItem.id,
                                    startDate: event.rawItem.startDate,
                                    endDate: event.rawItem.endDate,
                                    intensity: event.rawItem.intensity || 'medium'
                                  })}
                                  className="px-3 py-1 bg-pink-50 hover:bg-pink-100 text-pink-600 font-bold text-[9.5px] uppercase tracking-wider rounded-lg transition-colors cursor-pointer"
                                >
                                  Edit Period
                                </button>
                              )}

                              {/* Delete Action */}
                              <button
                                onClick={() => {
                                  if (confirm(`Are you sure you want to delete this ${event.typeLabel.toLowerCase()}?`)) {
                                    if (event.category === 'periods' && event.rawItem?.id) {
                                      handleDeletePeriod(event.rawItem.id);
                                    } else if (event.category === 'symptoms' && event.rawItem?.id) {
                                      handleDeleteSymptom(event.rawItem.id);
                                    } else if (event.category === 'intimacy' && event.rawItem?.id) {
                                      handleDeleteIntimacyLog(event.rawItem.id);
                                    }
                                  }
                                }}
                                className="px-3 py-1 bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold text-[9.5px] uppercase tracking-wider rounded-lg transition-colors cursor-pointer"
                              >
                                Delete
                              </button>
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
      <div className="fixed inset-0 bg-black/40 backdrop-blur-md z-50 flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          className="bg-white rounded-[2.5rem] w-full max-w-2xl overflow-hidden shadow-2xl relative border border-pink-100 flex flex-col max-h-[90vh]"
        >
          {/* Header */}
          <div className="p-6 md:p-8 border-b border-pink-50 flex justify-between items-start">
            <div className="text-left">
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-pink-400">Analytics Sanctuary</span>
              <h3 className="text-2xl font-serif text-pink-600 font-bold italic mt-1">Cycle Trends</h3>
              <p className="text-[11px] text-gray-400 italic">Historical Cycle Length & Pattern Analysis</p>
            </div>
            <button 
              onClick={() => setIsViewingTrends(false)}
              className="w-10 h-10 rounded-full bg-pink-50 hover:bg-pink-100 text-pink-500 flex items-center justify-center transition-all cursor-pointer"
            >
              ✕
            </button>
          </div>

          <div className="p-6 md:p-8 overflow-y-auto space-y-6 flex-1 text-left">
            {/* 6. Trend Notifications: Clinical Alert Banner */}
            {analytics.hasSignificantTrendAlert && (
              <div className="bg-amber-50 border-2 border-amber-200 p-4 rounded-2xl flex items-start gap-3 shadow-xs">
                <span className="text-2xl shrink-0">🩺</span>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] font-black uppercase tracking-wider text-amber-800 bg-amber-200/60 px-2 py-0.5 rounded-full">
                      Clinical Trend Notice
                    </span>
                    <span className="text-xs text-amber-700 font-bold">Repeated Shifts Detected</span>
                  </div>
                  <p className="text-xs font-serif italic text-amber-950 font-bold leading-relaxed">
                    "{analytics.significantTrendMessage}"
                  </p>
                </div>
              </div>
            )}

            {/* 2. Accurate Cycle Trend Tracking Header Component */}
            <div className="bg-gradient-to-br from-pink-500 to-rose-500 rounded-3xl p-5 sm:p-6 text-white shadow-md relative overflow-hidden">
              <div className="flex justify-between items-center border-b border-white/20 pb-3 mb-4">
                <span className="text-[10px] font-black uppercase tracking-wider text-pink-100">
                  Accurate Cycle Trend Tracking
                </span>
                <span className="px-2.5 py-1 rounded-full bg-white/20 text-white font-extrabold text-[9px] uppercase tracking-wider border border-white/25">
                  {analytics.trendDirectionLabel}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="bg-white/15 backdrop-blur-md rounded-2xl p-3.5 border border-white/20">
                  <span className="text-[9px] font-extrabold uppercase tracking-wider text-pink-100 block">
                    Previous Cycle Length
                  </span>
                  <p className="text-2xl font-serif font-black text-white mt-0.5">
                    {analytics.previousCycleLength} <span className="text-xs font-sans font-bold text-pink-100">days</span>
                  </p>
                </div>

                <div className="bg-white/25 backdrop-blur-md rounded-2xl p-3.5 border border-white/35 shadow-sm">
                  <span className="text-[9px] font-extrabold uppercase tracking-wider text-pink-100 block">
                    Current Cycle Length
                  </span>
                  <p className="text-2xl font-serif font-black text-white mt-0.5">
                    {analytics.currentCycleLength} <span className="text-xs font-sans font-bold text-pink-100">days</span>
                  </p>
                </div>

                <div className="bg-white/15 backdrop-blur-md rounded-2xl p-3.5 border border-white/20">
                  <span className="text-[9px] font-extrabold uppercase tracking-wider text-pink-100 block">
                    Change
                  </span>
                  <p className="text-2xl font-serif font-black text-white mt-0.5">
                    {analytics.cycleChangeFormatted}
                  </p>
                </div>
              </div>
            </div>

            {/* Status Alert if showing simulated baseline */}
            {!analytics.hasRealCompletedCycles && (
              <div className="bg-pink-50/40 border border-pink-100/60 p-4 rounded-2xl flex items-start gap-3">
                <span className="text-xl">📈</span>
                <div>
                  <h4 className="text-xs font-bold text-pink-700">Displaying Configured Baseline</h4>
                  <p className="text-[10.5px] text-pink-600/80 leading-relaxed">
                    You haven't logged enough consecutive periods yet. We are displaying your onboarding configured default cycle length of <span className="font-extrabold">{user.cycleLength || 28} days</span> as a reference. Add more past cycles to begin plotting real trends!
                  </p>
                </div>
              </div>
            )}

            {/* Recharts Line Graph reflecting cycle changes */}
            <div className="bg-pink-50/10 border border-pink-50/40 rounded-3xl p-4 md:p-6 shadow-sm">
              <div className="flex justify-between items-center mb-4">
                <span className="text-[10px] font-bold text-pink-400 uppercase tracking-wider">Cycle Duration (Days)</span>
                <span className="text-[10px] text-gray-400 font-bold italic">
                  {analytics.hasRealCompletedCycles ? `${analytics.totalLoggedCycles} Completed Cycles` : 'Configured Reference'}
                </span>
              </div>

              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={analytics.chartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#fdf2f8" />
                    <XAxis 
                      dataKey="name" 
                      tick={{ fontSize: 10, fill: '#f472b6', fontWeight: 'bold' }} 
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis 
                      domain={['dataMin - 3', 'dataMax + 3']} 
                      tick={{ fontSize: 10, fill: '#f472b6' }} 
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip 
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <div className="bg-white/95 backdrop-blur-sm border border-pink-100 p-3 rounded-2xl shadow-xl text-left">
                              <p className="text-[10px] text-pink-400 font-bold uppercase">{data.name}</p>
                              <p className="text-xs font-serif italic text-pink-600 font-bold mt-1">
                                Cycle Length: <span className="text-sm font-sans font-extrabold">{data.cycleLength} days</span>
                              </p>
                              <p className="text-[10px] text-gray-400 italic">
                                Period Bleeding: {data.periodLength} days
                              </p>
                              {data.isBaseline && (
                                <span className="inline-block mt-1 px-1.5 py-0.5 bg-pink-100 text-pink-600 font-extrabold text-[8px] rounded uppercase tracking-wider">
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
                      stroke="#ec4899" 
                      strokeDasharray="5 5" 
                      label={{ 
                        value: `Avg (${analytics.averageCycleDisplay})`, 
                        fill: '#db2777', 
                        fontSize: 9, 
                        position: 'insideBottomRight',
                        offset: 10
                      }} 
                    />
                    <Line 
                      type="monotone" 
                      dataKey="cycleLength" 
                      stroke="#f472b6" 
                      strokeWidth={3} 
                      dot={{ r: 5, fill: '#ec4899', stroke: '#fff', strokeWidth: 2 }} 
                      activeDot={{ r: 8, fill: '#db2777', stroke: '#fff', strokeWidth: 2 }} 
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* 3, 4, 5. Analytics Summary Statistics Cards (8 Cards) */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-white border border-pink-100 p-4 rounded-2xl space-y-1 shadow-sm">
                <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Average Cycle Length</span>
                <p className="text-xl font-serif text-pink-600 font-extrabold italic">
                  {analytics.averageCycleDisplay}
                </p>
                <p className="text-[9px] text-gray-400 italic">
                  {user.automaticCyclePrediction ? '✨ Auto-learned average' : (analytics.hasRealCompletedCycles ? 'Completed cycles' : 'Manual baseline')}
                </p>
              </div>

              <div className="bg-white border border-pink-100 p-4 rounded-2xl space-y-1 shadow-sm">
                <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Average Period Length</span>
                <p className="text-xl font-serif text-rose-600 font-extrabold italic">
                  {analytics.averagePeriodDisplay}
                </p>
                <p className="text-[9px] text-gray-400 italic">
                  Actual logged periods
                </p>
              </div>

              <div className="bg-white border border-pink-100 p-4 rounded-2xl space-y-1 shadow-sm">
                <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Cycle Regularity</span>
                <p className={`text-[10px] font-bold uppercase tracking-wider ${analytics.regularityBadgeClass} px-2 py-0.5 rounded-full inline-block mt-0.5`}>
                  {analytics.cycleRegularity}
                </p>
                <p className="text-[9px] text-teal-700 font-semibold mt-1">
                  Avg Variation: {analytics.averageVariationDisplay}
                </p>
              </div>

              <div className="bg-white border border-pink-100 p-4 rounded-2xl space-y-1 shadow-sm">
                <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Trend Direction</span>
                <p className="text-xs font-serif text-pink-700 font-bold mt-1">
                  {analytics.trendDirectionLabel}
                </p>
                <p className="text-[9px] text-gray-400 italic mt-0.5">
                  Change: {analytics.cycleChangeFormatted}
                </p>
              </div>

              <div className="bg-white border border-pink-100 p-4 rounded-2xl space-y-1 shadow-sm">
                <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Shortest Cycle</span>
                <p className="text-xl font-serif text-pink-600 font-extrabold italic">
                  {analytics.shortestCycle} <span className="text-xs font-sans not-italic font-bold text-gray-400">days</span>
                </p>
                <p className="text-[9px] text-gray-400 italic">
                  Minimum logged interval
                </p>
              </div>

              <div className="bg-white border border-pink-100 p-4 rounded-2xl space-y-1 shadow-sm">
                <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Longest Cycle</span>
                <p className="text-xl font-serif text-pink-600 font-extrabold italic">
                  {analytics.longestCycle} <span className="text-xs font-sans not-italic font-bold text-gray-400">days</span>
                </p>
                <p className="text-[9px] text-gray-400 italic">
                  Maximum logged interval
                </p>
              </div>

              <div className="bg-white border border-pink-100 p-4 rounded-2xl space-y-1 shadow-sm">
                <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Monthly Symptoms</span>
                <p className="text-xl font-serif text-pink-600 font-extrabold italic">
                  {analytics.averageMonthlySymptoms}
                </p>
                <p className="text-[9px] text-gray-400 italic">
                  {analytics.totalSymptomsCount} symptoms tracked
                </p>
              </div>

              <div className="bg-white border border-pink-100 p-4 rounded-2xl space-y-1 shadow-sm">
                <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Total Logged Cycles</span>
                <p className="text-xl font-serif text-pink-600 font-extrabold italic">
                  {analytics.totalLoggedCycles} <span className="text-xs font-sans not-italic font-bold text-gray-400">{analytics.totalLoggedCycles === 1 ? 'cycle' : 'cycles'}</span>
                </p>
                <p className="text-[9px] text-gray-400 italic">
                  {analytics.totalLoggedPeriods} periods logged
                </p>
              </div>
            </div>

            {/* Wisdom card inside modal */}
            <div className="p-6 bg-gradient-to-br from-pink-500 to-rose-400 rounded-3xl text-white text-left relative overflow-hidden shadow-md">
              <div className="relative z-10 space-y-1">
                <h4 className="text-[10px] uppercase font-bold tracking-widest opacity-80">Maternal Wisdom</h4>
                <p className="text-sm font-serif italic leading-relaxed">
                  "Understanding your cycle regularity helps tune into your body's unique monthly rhythm, promoting holistic wellness and harmony."
                </p>
              </div>
              <span className="absolute -bottom-8 -right-8 text-8xl opacity-10">✨</span>
            </div>
          </div>
        </motion.div>
      </div>
    );
  };

  return (
    <div className="space-y-10 pb-20">
      {renderCycleTrendsModal()}
      {/* SECTION 1: COMPACT HEADER */}
      <header className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 text-center sm:text-left bg-white/40 backdrop-blur-xl px-6 py-4 rounded-3xl border border-white/60 shadow-[inset_0_2px_4px_rgba(255,255,255,0.6),_0_8px_24px_rgba(244,114,182,0.03)]">
        <div>
          <h2 className="text-2xl font-serif text-pink-600 font-bold tracking-tight">Calendar</h2>
          <p className="text-xs text-stone-500 font-serif italic mt-0.5">Your cycle, beautifully understood.</p>
        </div>
      </header>

      {/* SECTION 2: CYCLE NAVIGATION (5 Pill-shaped Tabs) */}
      <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-2">
        {[
          { id: 'cycle', label: 'Cycle', icon: '🌙' },
          { id: 'calendar', label: 'Calendar', icon: '📅' },
          { id: 'history', label: 'History', icon: '📜' },
          { id: 'timeline', label: 'Timeline', icon: '📝' },
          { id: 'stats', label: 'Statistics', icon: '📊' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveView(tab.id as any)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-full transition-all whitespace-nowrap cursor-pointer ${
              activeView === tab.id 
                ? 'bg-gradient-to-r from-pink-500 to-rose-400 text-white shadow-md shadow-pink-200/50' 
                : 'bg-white text-stone-600 hover:bg-pink-50/50 hover:text-pink-600 border border-pink-100/60 shadow-2xs'
            }`}
          >
            <span className="text-sm">{tab.icon}</span>
            <span className="text-[10px] font-bold uppercase tracking-wider">{tab.label}</span>
          </button>
        ))}
      </div>

      <div className="mt-6">
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
