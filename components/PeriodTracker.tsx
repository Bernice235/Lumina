
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
  Printer 
} from 'lucide-react';
import { User, Symptom, BirthControlLog, BirthControlConfig, TemperatureLog, Period, PeriodLog } from '../types';
import { SYMPTOMS } from '../constants';
import TemperatureTracker from './TemperatureTracker';
import { CycleGraph } from './CycleGraph';
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
  const [editingPeriod, setEditingPeriod] = useState<Period | null>(null);
  const [viewingPeriodId, setViewingPeriodId] = useState<string | null>(null);
  const [editingPeriodData, setEditingPeriodData] = useState<{
    id: string;
    startDate: string;
    endDate: string;
    intensity: 'spotting' | 'light' | 'medium' | 'heavy';
  } | null>(null);
  const [isAddingPeriod, setIsAddingPeriod] = useState<boolean>(false);
  const [newPeriodData, setNewPeriodData] = useState({
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    intensity: 'medium' as 'spotting' | 'light' | 'medium' | 'heavy'
  });
  const [deletingSymptomId, setDeletingSymptomId] = useState<string | null>(null);
  const [deletingIntimacyConfirm, setDeletingIntimacyConfirm] = useState<boolean>(false);
  const [deletingBCConfirm, setDeletingBCConfirm] = useState<boolean>(false);
  const [deletePeriodConfirmId, setDeletePeriodConfirmId] = useState<string | null>(null);
  const [activeGraphTab, setActiveGraphTab] = useState<'cycle-length' | 'period-length' | 'symptoms' | 'moods' | 'flows' | 'fertility' | 'pregnancy'>(user.isPregnancyMode ? 'pregnancy' : 'cycle-length');
  const [pregnancyWeightLogs, setPregnancyWeightLogs] = useState<{ week: number; weight: number }[]>(() => {
    const local = localStorage.getItem(`pregnancy_weight_${user.id}`);
    return local ? JSON.parse(local) : [
      { week: 4, weight: 62.0 },
      { week: 8, weight: 62.8 },
      { week: 12, weight: 63.5 },
      { week: 16, weight: 64.8 },
      { week: 20, weight: 66.2 },
      { week: 24, weight: 68.0 },
    ];
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

  const handleEditPeriodSave = (updatedPeriod: Period | null) => {
    if (!editingPeriod || !setUser) return;
    
    // Remaining periods
    const remainingPeriods = (user.periods || []).filter(p => p.id !== editingPeriod.id);
    
    let allPeriods: Period[];
    if (updatedPeriod === null) {
      allPeriods = remainingPeriods;
    } else {
      allPeriods = [...remainingPeriods, updatedPeriod].sort(
        (a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime()
      );
    }
    
    // Now re-calculate periodDates and periodLogs based on ALL periods!
    const newDates: string[] = [];
    const newLogs: any[] = [];
    
    allPeriods.forEach(p => {
      const startObj = new Date(p.startDate);
      const endObj = new Date(p.endDate);
      const current = new Date(startObj);
      while (current <= endObj) {
        const dStr = current.toDateString();
        if (!newDates.includes(dStr)) {
          newDates.push(dStr);
          newLogs.push({ date: dStr, intensity: p.intensity });
        }
        current.setDate(current.getDate() + 1);
      }
    });
    
    // Plus any manual single-day clicks if they exist and are not already covered
    const manualDates = (user.periodDates || []).filter(dateStr => {
      const isOldPeriodDate = (user.periods || []).some(p => {
        const sObj = new Date(p.startDate);
        const eObj = new Date(p.endDate);
        const qObj = new Date(dateStr);
        return qObj >= sObj && qObj <= eObj;
      });
      return !isOldPeriodDate;
    });
    
    manualDates.forEach(d => {
      if (!newDates.includes(d)) {
        newDates.push(d);
        const existingLog = (user.periodLogs || []).find(l => l.date === d);
        newLogs.push({ date: d, intensity: existingLog?.intensity || 'medium' });
      }
    });

    setUser(prev => prev ? {
      ...prev,
      periods: allPeriods,
      periodDates: newDates,
      periodLogs: newLogs,
      lastPeriodStart: allPeriods[0]?.startDate || prev.lastPeriodStart
    } : null);
    
    setEditingPeriod(null);
  };

  const handleAddNewPeriod = () => {
    if (!setUser) return;
    const nextPeriod: Period = {
      id: Math.random().toString(36).substr(2, 9),
      startDate: new Date(newPeriodData.startDate).toDateString(),
      endDate: new Date(newPeriodData.endDate).toDateString(),
      intensity: newPeriodData.intensity
    };
    
    const allPeriods = [...(user.periods || []), nextPeriod].sort(
      (a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime()
    );
    
    // Recalculate
    const newDates: string[] = [];
    const newLogs: any[] = [];
    allPeriods.forEach(p => {
      const startObj = new Date(p.startDate);
      const endObj = new Date(p.endDate);
      const current = new Date(startObj);
      while (current <= endObj) {
        const dStr = current.toDateString();
        if (!newDates.includes(dStr)) {
          newDates.push(dStr);
          newLogs.push({ date: dStr, intensity: p.intensity });
        }
        current.setDate(current.getDate() + 1);
      }
    });

    setUser(prev => prev ? {
      ...prev,
      periods: allPeriods,
      periodDates: newDates,
      periodLogs: newLogs,
      lastPeriodStart: allPeriods[0]?.startDate || prev.lastPeriodStart
    } : null);
    
    setIsAddingPeriod(false);
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
      const newLogs = exists ? currentLogs.filter(l => l.date !== dateStr) : [...currentLogs, { date: dateStr, intensity: 'medium' }];
      
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
    const isFertileZone = fertilityRatingKey === 'ovulation_day' || fertilityRatingKey === 'high_fertility';
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

  const cycleDay = useMemo(() => {
    if (!user.lastPeriodStart) return 1;
    const lastStart = new Date(user.lastPeriodStart);
    const now = new Date();
    const start = new Date(lastStart.getFullYear(), lastStart.getMonth(), lastStart.getDate());
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    const diffDays = Math.floor((today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    const cycleLen = user.cycleLength || 28;
    let day = (diffDays % cycleLen) + 1;
    if (day <= 0) day += cycleLen;
    return day;
  }, [user.lastPeriodStart, user.cycleLength]);

  const getCycleDetailsForDate = (date: Date) => {
    let refDate: Date | null = null;
    if (user.lastPeriodStart) {
      refDate = new Date(user.lastPeriodStart);
    } else if (user.periods && user.periods.length > 0) {
      const sorted = [...user.periods].sort((a,b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());
      refDate = new Date(sorted[0].startDate);
    } else if (user.periodDates && user.periodDates.length > 0) {
      const sorted = [...user.periodDates].map(d => new Date(d)).sort((a,b) => b.getTime() - a.getTime());
      refDate = sorted[0];
    }

    if (!refDate) {
      return {
        cycleDay: 1,
        phaseName: 'Menstrual Phase',
        phaseKey: 'menstrual',
        fertilityStatus: 'Low Chance (Non-fertile)',
        fertilityKey: 'low',
        hormoneInfo: 'Hormones are at baseline. Your cycle length defaults to 28 days.',
        insights: 'Log a period start date to unlock personal dynamic cycle phase tracking and forecast features! 🌸',
        color: '#f472b6',
        badgeColor: 'bg-pink-100 text-pink-700',
        emoji: '🩸'
      };
    }

    const dStart = new Date(refDate.getFullYear(), refDate.getMonth(), refDate.getDate());
    const dCurrent = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const diffTime = dCurrent.getTime() - dStart.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    const cycleLen = user.cycleLength || 28;
    const periodLen = user.periodLength || 5;

    let dayInCycle = diffDays % cycleLen;
    if (dayInCycle < 0) dayInCycle += cycleLen;
    dayInCycle += 1;

    const ovulationDay = cycleLen - 14;

    let phaseName = 'Luteal Phase';
    let phaseKey = 'luteal';
    let emoji = '🍂';
    let color = '#818cf8';
    let badgeColor = 'bg-indigo-50 text-indigo-700';
    let hormoneInfo = '';
    let insights = '';
    let fertilityStatus = 'Low chance of pregnancy';
    let fertilityKey = 'low';

    // Check if it is a logged period date or falls in logged periods
    const isLoggedPeriod = user.periods?.some(p => {
      const startObj = new Date(new Date(p.startDate).toDateString());
      const endObj = new Date(new Date(p.endDate).toDateString());
      const queryObj = new Date(date.toDateString());
      return queryObj >= startObj && queryObj <= endObj;
    }) || user.periodDates?.includes(date.toDateString());

    const isPredictedPeriod = (dayInCycle <= periodLen);

    if (isLoggedPeriod || isPredictedPeriod) {
      phaseName = 'Menstrual Phase';
      phaseKey = 'menstrual';
      emoji = '🩸';
      color = '#f472b6';
      badgeColor = 'bg-pink-100/80 text-pink-700';
      fertilityStatus = 'Low (Non-fertile days)';
      fertilityKey = 'low';
      hormoneInfo = 'Estrogen and progesterone are at their lowest levels. The uterine lining sheds to refresh and rebuild.';
      insights = 'Your body is working hard. Focus on quiet comfort, warm herbal tea, and peaceful reflection. Perfect for cozy journaling. 🍵';
    } else if (dayInCycle <= ovulationDay - 5) {
      phaseName = 'Follicular Phase';
      phaseKey = 'follicular';
      emoji = '🌱';
      color = '#a855f7';
      badgeColor = 'bg-purple-100/70 text-purple-700';
      fertilityStatus = 'Low chance of pregnancy';
      fertilityKey = 'low_rising';
      hormoneInfo = 'Follicle-Stimulating Hormone (FSH) rises to maturity and signals egg follicles to grow. Estrogen climbs to rebuild the uterine lining.';
      insights = 'Energy, optimism, and cognitive focus are rising. A superb time for physical goals, planning, socializing, and initiating fresh projects! 🚀';
    } else if (dayInCycle <= ovulationDay + 1) {
      phaseName = 'Ovulatory Phase';
      phaseKey = 'ovulatory';
      emoji = '☀️';
      color = '#eab308';
      badgeColor = 'bg-amber-100 text-amber-800';
      hormoneInfo = 'Estrogen reaches its peak, triggering an LH surge which releases the mature egg. Testosterone also surges.';
      insights = 'Confidence, magnetic energy, and social rhythm are fully radiant! Highly articulate and glowy. Great for social events, dates, or public projects. 🌟';

      if (dayInCycle === ovulationDay) {
        fertilityStatus = 'Ovulation Day (Peak Fertility) 🌟';
        fertilityKey = 'ovulation_day';
      } else {
        fertilityStatus = 'High Fertility Window ✨';
        fertilityKey = 'high_fertility';
      }
    } else {
      phaseName = 'Luteal Phase';
      phaseKey = 'luteal';
      emoji = '🍂';
      color = '#6366f1';
      badgeColor = 'bg-indigo-50 text-indigo-700';
      fertilityStatus = 'Low chance of pregnancy';
      fertilityKey = 'low';
      hormoneInfo = 'Progesterone dominates to secure the uterine lining. If fertilization doesn’t occur, estrogen and progesterone levels slope down.';
      insights = 'The spirit turns inward and nesting instincts peak. Perfect for detail-oriented work, delicious slow foods, and restorative sleep. Protect your peace. 🌙';
    }

    return {
      cycleDay: dayInCycle,
      phaseName,
      phaseKey,
      fertilityStatus,
      fertilityKey,
      hormoneInfo,
      insights,
      color,
      badgeColor,
      emoji
    };
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
    if (details.phaseKey === 'menstrual') return 'predicted_period';
    if (details.fertilityKey === 'ovulation_day') return 'ovulation';
    if (details.fertilityKey === 'high_fertility') return 'fertile';
    return 'none';
  };

  const dayStyles = {
    period: 'bg-pink-500 text-white font-bold shadow-md shadow-pink-200 ring-2 ring-pink-300 ring-offset-2',
    predicted_period: 'bg-pink-200 text-pink-700 font-medium border border-pink-300 border-dashed',
    ovulation: 'bg-teal-400 text-white font-bold shadow-md shadow-teal-100 ring-2 ring-teal-200',
    fertile: 'bg-teal-50 text-teal-600 font-medium border border-teal-100',
    none: 'hover:bg-pink-50 text-gray-400 hover:text-pink-400'
  };

  const renderCycle = () => {
    const progress = (cycleDay / (user.cycleLength || 28)) * 100;
    const phaseInfo = cycleDay <= (user.periodLength || 5) ? { name: 'Menstrual Phase', color: '#f472b6', emoji: '🩸', advice: 'A time for rest and inward reflection. Be gentle with yourself, blooming soul.' } : 
                     cycleDay <= (user.cycleLength || 28) - 14 ? { name: 'Follicular Phase', color: '#fb7185', emoji: '🌱', advice: 'Energy is rising. A perfect time for new projects and social connection.' } :
                     cycleDay <= (user.cycleLength || 28) - 10 ? { name: 'Ovulatory Phase', color: '#fbbf24', emoji: '☀️', advice: 'You are at your most magnetic and articulate. Shine bright!' } : 
                     { name: 'Luteal Phase', color: '#818cf8', emoji: '🍂', advice: 'Slow down and nurture yourself. Protect your peace.' };

    return (
      <div className="flex flex-col items-center animate-fadeIn">
        <div className="relative w-72 h-72 flex items-center justify-center">
          <svg className="w-full h-full -rotate-90 transform">
            <circle cx="144" cy="144" r="120" fill="none" stroke="#fdf2f8" strokeWidth="12" />
            <motion.circle
              cx="144" cy="144" r="120" fill="none" stroke={phaseInfo.color} strokeWidth="12"
              strokeDasharray={2 * Math.PI * 120}
              initial={{ strokeDashoffset: 2 * Math.PI * 120 }}
              animate={{ strokeDashoffset: 2 * Math.PI * 120 * (1 - progress / 100) }}
              transition={{ duration: 1.5, ease: "easeOut" }}
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-8">
            <span className="text-5xl mb-2">{phaseInfo.emoji}</span>
            <span className="text-4xl font-bold text-pink-600 leading-none">{cycleDay}</span>
            <span className="text-[10px] font-bold text-pink-300 uppercase tracking-[0.2em] mt-2">Day of Cycle</span>
          </div>
        </div>
        
        <div className="mt-12 text-center space-y-4 max-w-sm">
          <h3 className="text-2xl font-serif text-pink-600 italic">{phaseInfo.name}</h3>
          <p className="text-sm text-pink-300 italic leading-relaxed">{phaseInfo.advice}</p>
          
          <button 
            onClick={onOpenLogModal}
            className="mt-8 px-8 py-4 bg-gradient-to-r from-pink-400 to-rose-400 text-white rounded-full font-bold shadow-lg shadow-pink-100 hover:scale-105 transition-transform"
          >
            Log Today's Journey
          </button>
        </div>
      </div>
    );
  };

  const renderStats = () => {
    return <CycleGraph user={user} />;
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
        <div className="flex justify-between items-center px-1">
          <div>
            <h3 className="text-2xl font-serif text-pink-600 font-bold italic">Cycle History</h3>
            <p className="text-[11px] text-gray-400 italic">Review, expand dynamic forecasts, and manage your documented cycle history.</p>
          </div>
          <button 
            onClick={() => setIsAddingPeriod(!isAddingPeriod)}
            className="px-4 py-2 bg-gradient-to-r from-pink-400 to-rose-400 hover:from-pink-500 hover:to-rose-500 text-white font-extrabold uppercase text-[9px] tracking-widest rounded-full shadow-md transition-all cursor-pointer flex items-center gap-1.5"
          >
            {isAddingPeriod ? '✕ Close Form' : '➕ Add Past Cycle'}
          </button>
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
                              startDate: new Date(period.startDate).toISOString().split('T')[0],
                              endDate: new Date(period.endDate).toISOString().split('T')[0],
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
                    <div className="border-t border-pink-100/30 p-6 bg-pink-50/5 space-y-6 animate-slideDown">
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
                    <div className="border-t border-pink-100 p-6 bg-rose-50/10 space-y-4 animate-slideDown">
                      <p className="text-[10px] font-bold text-rose-400 uppercase tracking-widest mb-2">🛠 Edit Cycle Parameters</p>
                      
                      {deletePeriodConfirmId === period.id ? (
                        <div className="p-5 bg-rose-50 border border-rose-100 rounded-2xl text-center space-y-3">
                          <p className="text-xs font-semibold text-rose-800">Are you sure you want to delete this entry?</p>
                          <div className="flex justify-center gap-2 pt-1">
                            <button
                              onClick={() => {
                                setEditingPeriod(period);
                                setTimeout(() => {
                                  handleEditPeriodSave(null);
                                  setEditingPeriodData(null);
                                  setDeletePeriodConfirmId(null);
                                }, 50);
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
                                  const updated: Period = {
                                    id: period.id,
                                    startDate: new Date(editingPeriodData.startDate).toDateString(),
                                    endDate: new Date(editingPeriodData.endDate).toDateString(),
                                    intensity: editingPeriodData.intensity
                                  };
                                  setEditingPeriod(period);
                                  setTimeout(() => {
                                    handleEditPeriodSave(updated);
                                    setEditingPeriodData(null);
                                  }, 50);
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
    const highFertileDays: number[] = [];
    const lutealDays: number[] = [];
    let ovulationDayNum: number | null = null;

    for (let d = 1; d <= daysInMonth; d++) {
      const testDate = new Date(year, currentDate.getMonth(), d);
      const det = getCycleDetailsForDate(testDate);
      if (det.phaseKey === 'menstrual') {
        menstrualDays.push(d);
      } else if (det.phaseKey === 'follicular') {
        follicularDays.push(d);
      } else if (det.phaseKey === 'ovulatory') {
        highFertileDays.push(d);
        if (det.fertilityKey === 'ovulation_day') {
          ovulationDayNum = d;
        }
      } else if (det.phaseKey === 'luteal') {
        lutealDays.push(d);
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
                    bgClass = 'bg-pink-500 text-white font-bold shadow-sm shadow-pink-100';
                  } else {
                    bgClass = 'bg-pink-100/70 text-pink-700 font-semibold';
                    borderClass = 'border-2 border-dashed border-pink-300';
                  }
                } else if (details.phaseKey === 'follicular') {
                  bgClass = 'bg-purple-100/40 text-purple-700 hover:bg-purple-100/70 font-medium';
                } else if (details.phaseKey === 'ovulatory') {
                  if (details.fertilityKey === 'ovulation_day') {
                    bgClass = 'bg-amber-400 text-white font-bold shadow-sm shadow-amber-200';
                  } else {
                    bgClass = 'bg-amber-100/50 text-amber-800 hover:bg-amber-100 font-medium';
                    borderClass = 'border border-amber-200';
                  }
                } else if (details.phaseKey === 'luteal') {
                  bgClass = 'bg-indigo-50/50 text-indigo-700 hover:bg-indigo-50/90 font-medium';
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
                      isSelected ? 'ring-2 ring-pink-500 ring-offset-2 scale-110 z-10' : ''
                    } ${isToday ? 'outline-2 outline-pink-400 outline-offset-1 font-black' : ''}`}
                  >
                    {/* Visual icons/markers for easy tracking */}
                    <div className="absolute top-1 left-1 right-1 flex justify-between gap-0.5 select-none pointer-events-none">
                      {intimacyEm && (
                        <span className="text-[9px]" title={daySexLog?.protection === 'protected' ? 'Protected intimacy' : 'Unprotected intimacy'}>
                          {intimacyEm}
                        </span>
                      )}
                      <div className="flex gap-0.5">
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

                    {/* Tiny Indicator Dot for Today */}
                    {isToday && (
                      <span className="absolute bottom-1 w-1.5 h-1.5 bg-pink-500 rounded-full"></span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Upgraded Legend */}
          <div className="mt-8 border-t border-pink-50 pt-6">
            <h4 className="text-[10px] font-bold text-pink-300 uppercase tracking-widest text-center mb-4">Cycle Phase & Reproductive Health Legend</h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center mb-4 animate-fadeIn">
              <div className="flex flex-col items-center p-2 rounded-xl bg-pink-50/40">
                <div className="w-5 h-5 rounded-md bg-pink-500 mb-1 flex items-center justify-center text-[10px] text-white font-bold">🩸</div>
                <span className="text-[9px] font-bold text-pink-700 uppercase">Menstrual</span>
              </div>
              <div className="flex flex-col items-center p-2 rounded-xl bg-purple-50/40">
                <div className="w-5 h-5 rounded-md bg-purple-100/70 mb-1 flex items-center justify-center text-purple-700 text-xs text-[10px]">🌱</div>
                <span className="text-[9px] font-bold text-purple-700 uppercase">Follicular</span>
              </div>
              <div className="flex flex-col items-center p-2 rounded-xl bg-amber-50/40">
                <div className="w-5 h-5 rounded-md bg-amber-400 mb-1 flex items-center justify-center text-white text-[10px] font-bold">☀️</div>
                <span className="text-[9px] font-bold text-amber-800 uppercase">Ovulatory</span>
              </div>
              <div className="flex flex-col items-center p-2 rounded-xl bg-indigo-50/40">
                <div className="w-5 h-5 rounded-md bg-indigo-50/80 mb-1 flex items-center justify-center text-indigo-700 text-xs text-[10px]">&nbsp;🍂</div>
                <span className="text-[9px] font-bold text-indigo-700 uppercase">Luteal</span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center bg-pink-50/10 p-3 rounded-2xl border border-pink-100/30">
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
              <span className="text-3xl">{selectedDetails.emoji}</span>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-pink-300 uppercase tracking-widest">Cycle Phase</span>
                <span className={`px-3 py-1.5 rounded-full font-bold text-[9px] uppercase tracking-widest ${selectedDetails.badgeColor}`}>
                  {selectedDetails.phaseName}
                </span>
              </div>

              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-pink-300 uppercase tracking-widest">Fertility Rating</span>
                <span className={`font-bold italic ${
                  selectedDetails.fertilityKey.includes('ovulation') ? 'text-teal-600' :
                  selectedDetails.fertilityKey.includes('high') ? 'text-amber-500' :
                  'text-pink-400'
                }`}>
                  {selectedDetails.fertilityStatus}
                </span>
              </div>

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
                <span className="opacity-85 font-medium">🌟 Fertile Window:</span>
                <span className="font-bold text-teal-100 text-right pl-4">{formatRanges(highFertileDays)}</span>
              </div>
              <div className="flex justify-between items-start border-b border-white/10 pb-3">
                <span className="opacity-85 font-medium">🎯 Predicted Ovulation:</span>
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

        {/* Full-width Month-wide Connected Intimacy & Reproductive Health Timeline */}
        <div className="lg:col-span-12 mt-6 bg-gradient-to-br from-white to-pink-50/10 p-6 sm:p-8 rounded-[2.5rem] shadow-sm border border-pink-100/60 space-y-6">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center border-b border-pink-100 pb-4 gap-2">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-2xl">💞</span>
                <h4 className="font-serif text-xl text-pink-600 italic">Intimacy & Reproductive Health Timeline</h4>
              </div>
              <p className="text-[11px] text-pink-400 mt-1">
                Connected timeline of tracked sexual activity, protection methods, and contraceptive timings for {monthName} {year}.
              </p>
            </div>
            <span className="text-[8px] font-bold bg-pink-100 text-pink-600 px-3 py-1 rounded-full uppercase tracking-widest self-start sm:self-center">
              🔒 Private Timeline
            </span>
          </div>

          {monthLogs.length === 0 ? (
            <div className="text-center py-10 space-y-2">
              <span className="text-3xl block">🌸</span>
              <p className="text-xs text-pink-300 italic">No intimacy or contraceptive logs recorded for this month.</p>
              <p className="text-[10px] text-pink-400/80">Tap any day on the calendar above to log intimacy, protection, and contraceptive pills.</p>
            </div>
          ) : (
            <div className="relative border-l-2 border-pink-100 ml-4 pl-6 space-y-6">
              {monthLogs.map((log) => {
                const logDate = new Date(log.date);
                const details = getCycleDetailsForDate(logDate);
                const pregInfo = getPregnancyPossibility(logDate, user.sexualActivityLogs || [], details.fertilityKey);
                
                return (
                  <div key={log.id} className="relative group animate-fadeIn">
                    {/* Timeline Node Point */}
                    <div className="absolute -left-[31px] top-1.5 w-4 h-4 rounded-full border-2 border-white bg-pink-500 shadow-sm flex items-center justify-center">
                      <div className="w-1.5 h-1.5 rounded-full bg-white"></div>
                    </div>

                    <div className="bg-white p-5 rounded-2xl border border-pink-50 shadow-sm hover:shadow-md hover:border-pink-200 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4">
                      {/* Left: Date and Action */}
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-serif text-sm font-bold text-pink-600 italic">
                            {logDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                          </span>
                          <span className={`px-2 py-0.5 rounded-lg text-[8px] font-bold uppercase tracking-wider ${details.badgeColor}`}>
                            {details.phaseName}
                          </span>
                          <span className="text-[10px] text-pink-300 italic">
                            ({details.fertilityStatus})
                          </span>
                        </div>

                        {/* Intimacy info list */}
                        <div className="space-y-1.5">
                          {log.hadSex && (
                            <div className="flex items-center gap-1.5 text-xs text-gray-700">
                              <span className="text-[10px]">💞</span>
                              <span className="font-medium">Sexual activity logged</span>
                              <span className="text-gray-300">•</span>
                              <span className={`font-semibold text-[10px] uppercase ${log.protection === 'protected' ? 'text-teal-600' : 'text-rose-500'}`}>
                                {log.protection === 'protected' ? 'Protected Sex' : 'Unprotected Sex'}
                              </span>
                            </div>
                          )}

                          {log.hadSex && (
                            <div className="flex items-center gap-1.5 text-xs text-gray-500">
                              <span className="text-[10px]">💦</span>
                              <span>Ejaculation status:</span>
                              <span className="font-medium text-gray-700">
                                {log.ejaculation === 'occurred' ? 'Ejaculation occurred' : 'No ejaculation'}
                              </span>
                            </div>
                          )}

                          {log.contraceptiveMethod && log.contraceptiveMethod !== 'none' && (
                            <div className="flex items-center gap-1.5 text-xs text-gray-500">
                              <span className="text-[10px]">🛡️</span>
                              <span>Contraceptive:</span>
                              <span className="font-medium text-pink-600 bg-pink-50 px-1.5 py-0.5 rounded text-[10px]">
                                {log.contraceptiveMethod === 'condom' ? 'Condom' :
                                 log.contraceptiveMethod === 'pill' ? 'Birth control pill' :
                                 log.contraceptiveMethod === 'iud' ? 'IUD (Intrauterine Device)' :
                                 log.contraceptiveMethod === 'implant' ? 'Hormonal Implant' : 'Other Method'}
                              </span>
                            </div>
                          )}

                          {log.emergencyContraceptiveTaken && (
                            <div className="flex items-center gap-1.5 text-xs text-rose-600 bg-rose-50 px-2.5 py-1 rounded-lg border border-rose-100 w-fit mt-1">
                              <span className="text-[10px]">💊</span>
                              <span className="font-bold">Emergency contraception taken</span>
                              {log.emergencyContraceptiveTime && (
                                <>
                                  <span className="opacity-40 font-normal">at</span>
                                  <span className="font-semibold italic">{log.emergencyContraceptiveTime}</span>
                                </>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Right: Educational insight panel */}
                      <div className="md:max-w-xs bg-pink-50/40 p-3.5 rounded-xl border border-pink-100/50 text-left space-y-1.5 self-start md:self-center">
                        <div className="flex justify-between items-center gap-2 text-[8px] font-bold uppercase tracking-wider">
                          <span className="text-pink-400">Pregnancy Liability Insight</span>
                          <span className={pregInfo.colorClass}>{pregInfo.label}</span>
                        </div>
                        <p className="text-[10px] text-pink-600 leading-relaxed font-serif italic">
                          {pregInfo.desc}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderTimeline = () => {
    const timelineEvents = [
      ...(user.periods || []).map(p => ({ 
        date: p.startDate, 
        type: 'period', 
        label: `Period (${p.intensity})`, 
        endDate: p.endDate 
      })),
      ...(user.periodDates || []).filter(d => !user.periods?.some(p => {
        const start = new Date(new Date(p.startDate).toDateString());
        const end = new Date(new Date(p.endDate).toDateString());
        const current = new Date(new Date(d).toDateString());
        return current >= start && current <= end;
      })).map(date => ({ date, type: 'period', label: 'Period Day' })),
      ...symptoms.map(s => ({ date: s.date, type: 'symptom', label: SYMPTOMS.find(symp => symp.id === s.type)?.label || 'Symptom' })),
      ...tempLogs.map(t => ({ date: t.date, type: 'temp', label: `Temp: ${t.value}°${t.unit}` }))
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return (
      <div className="space-y-4 animate-fadeIn">
        {timelineEvents.length === 0 ? (
          <div className="bg-white p-12 rounded-[2.5rem] text-center border border-pink-50">
            <span className="text-4xl block mb-4">📜</span>
            <p className="text-pink-300 italic">No events logged yet. Start your journey today!</p>
          </div>
        ) : (
          timelineEvents.map((event: any, idx) => (
            <div key={idx} className="bg-white p-6 rounded-3xl shadow-sm border border-pink-50 flex items-center gap-4 hover:scale-[1.02] transition-transform">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl ${
                event.type === 'period' ? 'bg-pink-100 text-pink-500' : 
                event.type === 'symptom' ? 'bg-purple-100 text-purple-500' : 'bg-blue-100 text-blue-500'
              }`}>
                {event.type === 'period' ? '🩸' : event.type === 'symptom' ? '✨' : '🌡️'}
              </div>
              <div className="flex-1">
                <p className="font-serif text-lg text-pink-600 italic">{event.label}</p>
                <div className="flex flex-wrap gap-x-2 items-center">
                  <p className="text-[10px] font-bold text-pink-300 uppercase tracking-widest">
                    {new Date(event.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                  </p>
                  {event.endDate && (
                    <>
                      <span className="text-pink-200">→</span>
                      <p className="text-[10px] font-bold text-pink-300 uppercase tracking-widest">
                        {new Date(event.endDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                      </p>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    );
  };

  return (
    <div className="space-y-10 pb-20">
      <header className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 text-center md:text-left bg-gradient-to-r from-pink-500/5 via-rose-500/10 to-indigo-500/5 p-6 rounded-[2rem] border border-pink-100/20">
        <div>
          <h2 className="text-3xl font-serif text-pink-500 italic">Cycle Sanctuary</h2>
          <p className="text-sm text-pink-300 italic">Your body, your rhythm, your power</p>
        </div>
        <button
          onClick={onOpenDoctorReport}
          className="px-6 py-3.5 bg-gradient-to-r from-pink-500 to-indigo-500 hover:from-pink-600 hover:to-indigo-600 text-white rounded-full font-bold text-[10px] uppercase tracking-widest shadow-md shadow-pink-100/40 flex items-center justify-center gap-2 transition-all self-center md:self-auto hover:scale-[1.02] active:scale-95 cursor-pointer"
        >
          <FileText size={14} />
          <span>Generate Doctor Report</span>
        </button>
      </header>

      <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-4">
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
            className={`flex items-center gap-2 px-6 py-3 rounded-full transition-all whitespace-nowrap ${activeView === tab.id ? 'bg-pink-400 text-white shadow-lg shadow-pink-100' : 'bg-white text-pink-300 hover:bg-pink-50'}`}
          >
            <span className="text-sm">{tab.icon}</span>
            <span className="text-[10px] font-bold uppercase tracking-widest">{tab.label}</span>
          </button>
        ))}
      </div>

      <div className="mt-8">
        {activeView === 'cycle' && renderCycle()}
        {activeView === 'calendar' && renderCalendar()}
        {activeView === 'history' && renderHistory()}
        {activeView === 'timeline' && renderTimeline()}
        {activeView === 'stats' && renderStats()}
      </div>

      {/* Birth Control Tracker */}
      <section className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-pink-50 relative overflow-hidden">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-serif text-pink-500 flex items-center gap-2 italic">
            <span className="text-2xl">💊</span> Birth Control
          </h3>
          <button onClick={() => setIsSettingBC(!isSettingBC)} className="text-[10px] font-bold text-pink-300 uppercase hover:text-pink-500 transition-colors">
            {isSettingBC ? 'Close' : 'Configure'}
          </button>
        </div>

        {isSettingBC ? (
          <div className="space-y-6 animate-fadeIn">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-pink-300 uppercase ml-2">Method</label>
                <select value={bcMethod} onChange={(e) => setBcMethod(e.target.value)} className="w-full bg-pink-50/50 p-3 rounded-2xl outline-none text-pink-600 font-bold text-sm border border-transparent focus:border-pink-200">
                  {['Pill', 'Patch', 'Ring', 'Injection', 'IUD', 'Implant'].map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-pink-300 uppercase ml-2">Frequency</label>
                <select value={bcFrequency} onChange={(e) => setBcFrequency(e.target.value as any)} className="w-full bg-pink-50/50 p-3 rounded-2xl outline-none text-pink-600 font-bold text-sm border border-transparent focus:border-pink-200">
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-pink-300 uppercase ml-2">Reminder Time</label>
              <input type="time" value={bcTime} onChange={(e) => setBcTime(e.target.value)} className="w-full bg-pink-50/50 p-3 rounded-2xl outline-none text-pink-600 font-bold text-sm border border-transparent focus:border-pink-200" />
            </div>
            <button onClick={() => {
              onUpdateBCConfig({ method: bcMethod, frequency: bcFrequency, reminderTime: bcTime, enabled: true });
              setIsSettingBC(false);
            }} className="w-full py-4 bg-pink-400 text-white rounded-2xl font-bold uppercase tracking-widest text-[10px] shadow-lg shadow-pink-100">
              Save Settings
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className={`w-14 h-14 rounded-full flex items-center justify-center text-2xl transition-all shadow-inner ${isTakenToday ? 'bg-pink-400 text-white' : 'bg-pink-50 text-pink-200'}`}>
                {isTakenToday ? '✨' : '💊'}
              </div>
              <div>
                <p className="font-serif italic text-lg text-pink-600">{user.birthControlConfig?.enabled ? user.birthControlConfig.method : 'Track your method'}</p>
                <p className="text-[10px] font-bold text-pink-300 uppercase tracking-widest">{user.birthControlConfig?.enabled ? `${user.birthControlConfig.frequency} • ${user.birthControlConfig.reminderTime}` : 'Tap configure to start'}</p>
              </div>
            </div>
            <button onClick={() => isTakenToday ? setBcLogs(bcLogs.filter(log => log.date !== today)) : setBcLogs([...bcLogs, { date: today, taken: true }])} className={`px-6 py-3 rounded-full font-bold text-[10px] uppercase tracking-widest transition-all ${isTakenToday ? 'bg-pink-50 text-pink-400' : 'bg-pink-400 text-white shadow-lg shadow-pink-100 hover:scale-105 active:scale-95'}`}>
              {isTakenToday ? 'Taken Today' : 'Log Intake'}
            </button>
          </div>
        )}
      </section>

      <TemperatureTracker user={user} logs={tempLogs} setLogs={setTempLogs} onUpdateUnit={onUpdateTempUnit} />

      <div className="p-8 bg-gradient-to-br from-pink-500 to-rose-400 rounded-[2.5rem] text-white shadow-xl shadow-pink-200 relative overflow-hidden">
        <div className="relative z-10">
          <p className="text-xs font-bold uppercase tracking-widest opacity-80 mb-2">Cycle Wisdom</p>
          <p className="text-xl font-serif italic leading-relaxed">"Your body is a blooming garden. Honor each season with love and patience."</p>
        </div>
        <span className="absolute -bottom-10 -right-10 text-[12rem] opacity-10">✨</span>
      </div>
    </div>
  );
};

export default PeriodTracker;
