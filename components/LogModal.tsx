import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Symptom, PeriodLog } from '../types';
import { SYMPTOMS } from '../constants';
import { Calendar, Activity, History, Plus, X, Droplets, Pill, Thermometer, Scale } from 'lucide-react';
import { trackLogPeriod } from '../services/analyticsService';
import { formatYMD, parseYMDToLocalDate } from '../services/cycleSyncService';

interface LogModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User;
  symptoms: Symptom[];
  onLogSymptom: (type: Symptom['type'], intensity: Symptom['intensity']) => void;
  onLogPeriod: (intensity: PeriodLog['intensity']) => void;
  onLogFullPeriod: (startDate: string, endDate: string, intensity: PeriodLog['intensity']) => void;
  onLogMood: (mood: any, note?: string) => void;
  onLogSexualActivity: (isProtected: boolean, notes?: string) => void;
}

const LogModal: React.FC<LogModalProps> = ({ 
  isOpen, 
  onClose, 
  user, 
  symptoms, 
  onLogSymptom, 
  onLogPeriod,
  onLogFullPeriod,
  onLogMood,
  onLogSexualActivity
}) => {
  const [activeTab, setActiveTab] = useState<'period' | 'symptoms' | 'timeline' | 'other'>('period');
  const [selectedIntensity, setSelectedIntensity] = useState<PeriodLog['intensity']>('medium');
  const [startDate, setStartDate] = useState(formatYMD(new Date()));
  const [endDate, setEndDate] = useState(formatYMD(new Date()));
  const [periodNotes, setPeriodNotes] = useState('');
  const [moodNote, setMoodNote] = useState('');
  const [sexNote, setSexNote] = useState('');
  const [isProtected, setIsProtected] = useState(true);

  const today = new Date().toDateString();

  const combinedTimeline = useMemo(() => {
    const sLogs = symptoms.map(s => ({ ...s, logType: 'symptom' as const }));
    const pLogs = (user.periodLogs || []).map(p => ({ ...p, id: `p-${p.date}`, logType: 'period' as const }));
    return [...sLogs, ...pLogs].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [symptoms, user.periodLogs]);

  const getSymptomInfo = (type: string) => SYMPTOMS.find(s => s.id === type);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center sm:p-4">
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-stone-950/45 backdrop-blur-xs"
        />
        
        <motion.div 
          initial={{ y: 24, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 24, opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="relative bg-white dark:bg-[#1a1816] w-full max-w-lg rounded-t-2xl sm:rounded-2xl border border-stone-200/80 dark:border-[#2e2a26] overflow-hidden shadow-2xl max-h-[92vh] flex flex-col"
        >
          {/* Header */}
          <div className="px-6 pt-6 pb-4 flex justify-between items-center border-b border-stone-100 dark:border-[#2e2a26]">
            <div>
              <h3 className="text-xl font-serif text-stone-900 dark:text-stone-100">Daily Log</h3>
              <p className="text-xs text-stone-500 dark:text-stone-400">Record your cycle, symptoms, and wellbeing</p>
            </div>
            <button 
              type="button"
              onClick={onClose}
              aria-label="Close daily log"
              className="w-9 h-9 rounded-xl bg-stone-100 dark:bg-[#23201d] flex items-center justify-center text-stone-600 dark:text-stone-300 hover:bg-stone-200 transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>

          {/* Segmented Tabs */}
          <div className="px-6 pt-4">
            <div className="grid grid-cols-4 gap-1 bg-stone-100 dark:bg-[#23201d] p-1 rounded-xl border border-stone-200/70 dark:border-[#2e2a26]">
              {[
                { id: 'period', label: 'Period', icon: Calendar },
                { id: 'symptoms', label: 'Symptoms', icon: Activity },
                { id: 'timeline', label: 'Timeline', icon: History },
                { id: 'other', label: 'Other', icon: Plus },
              ].map(tab => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                    activeTab === tab.id 
                      ? 'bg-white dark:bg-[#1a1816] text-pink-700 dark:text-pink-300 shadow-xs' 
                      : 'text-stone-600 dark:text-stone-400 hover:text-stone-900'
                  }`}
                >
                  <tab.icon size={13} />
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto">
            {activeTab === 'period' && (
              <div className="space-y-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-100 dark:border-rose-900/40 flex items-center justify-center shrink-0">
                    <Droplets className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-base font-serif text-stone-900 dark:text-stone-100">Log Your Period</h4>
                    <p className="text-xs text-stone-500 dark:text-stone-400">Select flow dates and intensity</p>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5 text-left">
                      <label className="text-xs font-semibold text-stone-700 dark:text-stone-300">Start Date</label>
                      <input 
                        type="date" 
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="w-full h-11 bg-stone-50 dark:bg-[#23201d] px-3.5 rounded-xl outline-none text-stone-900 dark:text-stone-100 font-medium text-sm border border-stone-200 dark:border-[#2e2a26] focus:border-pink-500"
                      />
                    </div>
                    <div className="space-y-1.5 text-left">
                      <label className="text-xs font-semibold text-stone-700 dark:text-stone-300">End Date</label>
                      <input 
                        type="date" 
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="w-full h-11 bg-stone-50 dark:bg-[#23201d] px-3.5 rounded-xl outline-none text-stone-900 dark:text-stone-100 font-medium text-sm border border-stone-200 dark:border-[#2e2a26] focus:border-pink-500"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-stone-700 dark:text-stone-300 block text-left">Flow Intensity</label>
                    <div className="grid grid-cols-4 gap-2">
                      {(['spotting', 'light', 'medium', 'heavy'] as const).map(intensity => (
                        <button
                          key={intensity}
                          type="button"
                          onClick={() => setSelectedIntensity(intensity)}
                          className={`h-10 rounded-xl border text-xs font-semibold capitalize transition-colors cursor-pointer ${
                            selectedIntensity === intensity 
                              ? 'border-pink-500 bg-pink-50 dark:bg-pink-950/40 text-pink-700 dark:text-pink-300' 
                              : 'border-stone-200 dark:border-[#2e2a26] text-stone-600 dark:text-stone-400 hover:border-pink-200'
                          }`}
                        >
                          {intensity}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1.5 text-left">
                    <label className="text-xs font-semibold text-stone-700 dark:text-stone-300">Notes (Optional)</label>
                    <textarea 
                      placeholder="Add optional notes about flow or comfort..."
                      value={periodNotes}
                      onChange={(e) => setPeriodNotes(e.target.value)}
                      className="w-full bg-stone-50 dark:bg-[#23201d] p-3.5 rounded-xl outline-none text-stone-900 dark:text-stone-100 text-sm border border-stone-200 dark:border-[#2e2a26] focus:border-pink-500 min-h-[80px] resize-none"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      const startLocal = parseYMDToLocalDate(startDate);
                      let endLocal = parseYMDToLocalDate(endDate);
                      if (endLocal < startLocal) {
                        endLocal = startLocal;
                      }
                      onLogFullPeriod(startLocal.toDateString(), endLocal.toDateString(), selectedIntensity);
                      trackLogPeriod();
                      onClose();
                    }}
                    className="w-full h-11 bg-pink-600 hover:bg-pink-700 text-white rounded-xl font-semibold text-sm transition-colors cursor-pointer"
                  >
                    Save Period Log
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'symptoms' && (
              <div className="grid grid-cols-3 gap-2.5 max-h-[360px] overflow-y-auto pr-1 scrollbar-hide">
                {SYMPTOMS.map(s => {
                  const isLogged = symptoms.some(sym => sym.type === s.id && sym.date === today);
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => onLogSymptom(s.id as any, 2)}
                      className={`flex flex-col items-center justify-center gap-1.5 p-3.5 rounded-xl border transition-colors cursor-pointer ${
                        isLogged 
                          ? 'bg-pink-600 border-pink-600 text-white' 
                          : 'bg-stone-50 dark:bg-[#23201d] border-stone-200 dark:border-[#2e2a26] text-stone-700 dark:text-stone-300 hover:border-pink-300'
                      }`}
                    >
                      <span className="text-xl">{s.emoji}</span>
                      <span className="text-xs font-medium text-center leading-tight">{s.label}</span>
                    </button>
                  );
                })}
              </div>
            )}

            {activeTab === 'timeline' && (
              <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1 scrollbar-hide">
                {combinedTimeline.length > 0 ? (
                  combinedTimeline.map((item) => (
                    <div key={item.id} className="flex items-center gap-3.5 p-3.5 bg-stone-50 dark:bg-[#23201d] rounded-xl border border-stone-200/70 dark:border-[#2e2a26]">
                      <div className="w-10 h-10 rounded-xl bg-white dark:bg-[#1a1816] border border-stone-200/80 dark:border-[#2e2a26] flex items-center justify-center text-lg shrink-0">
                        {item.logType === 'period' ? (
                          <Droplets className="w-4 h-4 text-rose-600" />
                        ) : (
                          getSymptomInfo((item as Symptom).type)?.emoji
                        )}
                      </div>
                      <div>
                        <p className="text-xs font-medium text-stone-500 dark:text-stone-400 tabular-nums">
                          {new Date(item.date).toLocaleDateString('default', { month: 'short', day: 'numeric' })}
                        </p>
                        <p className="text-sm font-semibold text-stone-900 dark:text-stone-100 capitalize">
                          {item.logType === 'period' ? `Period (${(item as any).intensity})` : getSymptomInfo((item as Symptom).type)?.label}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-12">
                    <p className="text-sm text-stone-500 dark:text-stone-400">No logs recorded yet.</p>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'other' && (
              <div className="space-y-5 max-h-[400px] overflow-y-auto pr-1 scrollbar-hide">
                {/* Mood Section */}
                <div className="space-y-3">
                  <h4 className="text-xs font-semibold text-stone-700 dark:text-stone-300">Daily Mood</h4>
                  <div className="grid grid-cols-4 gap-2">
                    {(['happy', 'calm', 'excited', 'tired', 'sad', 'anxious', 'angry', 'irritable'] as const).map(mood => (
                      <button
                        key={mood}
                        type="button"
                        onClick={() => onLogMood(mood, moodNote)}
                        className="flex flex-col items-center gap-1 p-2.5 rounded-xl bg-stone-50 dark:bg-[#23201d] border border-stone-200/70 dark:border-[#2e2a26] hover:border-pink-300 transition-colors cursor-pointer"
                      >
                        <span className="text-lg">
                          {mood === 'happy' ? '😊' : mood === 'calm' ? '😌' : mood === 'excited' ? '🤩' : mood === 'tired' ? '😴' : 
                           mood === 'sad' ? '😢' : mood === 'anxious' ? '😰' : mood === 'angry' ? '😡' : '😤'}
                        </span>
                        <span className="text-[11px] font-medium capitalize text-stone-700 dark:text-stone-300">{mood}</span>
                      </button>
                    ))}
                  </div>
                  <input 
                    type="text"
                    placeholder="Add a mood note..."
                    value={moodNote}
                    onChange={(e) => setMoodNote(e.target.value)}
                    className="w-full h-10 bg-stone-50 dark:bg-[#23201d] px-3.5 rounded-xl outline-none text-stone-900 dark:text-stone-100 text-xs border border-stone-200 dark:border-[#2e2a26] focus:border-pink-500"
                  />
                </div>

                {/* Sexual Activity Section */}
                <div className="space-y-3 pt-4 border-t border-stone-200/70 dark:border-[#2e2a26]">
                  <h4 className="text-xs font-semibold text-stone-700 dark:text-stone-300">Intimacy Log</h4>
                  <div className="flex items-center justify-between bg-stone-50 dark:bg-[#23201d] px-4 py-3 rounded-xl border border-stone-200/70 dark:border-[#2e2a26]">
                    <span className="text-xs font-medium text-stone-700 dark:text-stone-300">Protected?</span>
                    <button 
                      type="button"
                      onClick={() => setIsProtected(!isProtected)}
                      className={`px-3.5 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${isProtected ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'}`}
                    >
                      {isProtected ? 'Yes' : 'No'}
                    </button>
                  </div>
                  <div className="flex gap-2">
                    <input 
                      type="text"
                      placeholder="Optional notes..."
                      value={sexNote}
                      onChange={(e) => setSexNote(e.target.value)}
                      className="flex-1 h-10 bg-stone-50 dark:bg-[#23201d] px-3.5 rounded-xl outline-none text-stone-900 dark:text-stone-100 text-xs border border-stone-200 dark:border-[#2e2a26] focus:border-pink-500"
                    />
                    <button 
                      type="button"
                      onClick={() => onLogSexualActivity(isProtected, sexNote)}
                      className="px-5 h-10 bg-pink-600 hover:bg-pink-700 text-white rounded-xl font-semibold text-xs transition-colors cursor-pointer"
                    >
                      Log
                    </button>
                  </div>
                </div>

                {/* Additional Trackers */}
                <div className="grid grid-cols-2 gap-2.5 pt-4 border-t border-stone-200/70 dark:border-[#2e2a26]">
                  {[
                    { label: 'Birth Control', icon: <Pill className="w-4 h-4 text-sky-600" /> },
                    { label: 'Temperature', icon: <Thermometer className="w-4 h-4 text-amber-600" /> },
                    { label: 'Water Intake', icon: <Droplets className="w-4 h-4 text-cyan-600" /> },
                    { label: 'Weight', icon: <Scale className="w-4 h-4 text-purple-600" /> },
                  ].map(item => (
                    <button
                      key={item.label}
                      type="button"
                      className="flex items-center gap-2.5 p-3 bg-stone-50 dark:bg-[#23201d] rounded-xl border border-stone-200/70 dark:border-[#2e2a26] hover:border-pink-300 transition-colors cursor-pointer"
                    >
                      <div className="w-8 h-8 rounded-lg bg-white dark:bg-[#1a1816] border border-stone-200/70 dark:border-[#2e2a26] flex items-center justify-center shrink-0">
                        {item.icon}
                      </div>
                      <span className="text-xs font-medium text-stone-700 dark:text-stone-300">{item.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default LogModal;

