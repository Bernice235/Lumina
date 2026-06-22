
import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Symptom, PeriodLog } from '../types';
import { SYMPTOMS } from '../constants';
import { Calendar, Activity, History, Plus, X } from 'lucide-react';

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
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [periodNotes, setPeriodNotes] = useState('');
  const [moodNote, setMoodNote] = useState('');
  const [sexNote, setSexNote] = useState('');
  const [isProtected, setIsProtected] = useState(true);

  const today = new Date().toDateString();
  const isPeriodLogged = user.periodDates?.includes(today);
  const currentLog = user.periodLogs?.find(l => l.date === today);

  const combinedTimeline = useMemo(() => {
    const sLogs = symptoms.map(s => ({ ...s, logType: 'symptom' as const }));
    const pLogs = (user.periodLogs || []).map(p => ({ ...p, id: `p-${p.date}`, logType: 'period' as const }));
    return [...sLogs, ...pLogs].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [symptoms, user.periodLogs]);

  const getSymptomInfo = (type: string) => SYMPTOMS.find(s => s.id === type);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center p-4">
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-pink-900/20 backdrop-blur-sm"
        />
        
        <motion.div 
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="relative bg-white w-full max-w-lg rounded-t-[3rem] sm:rounded-[3rem] overflow-hidden shadow-2xl"
        >
          {/* Header */}
          <div className="p-8 pb-4 flex justify-between items-center">
            <div>
              <h3 className="text-2xl font-serif text-pink-500 italic">Daily Log</h3>
              <p className="text-[10px] font-bold text-pink-300 uppercase tracking-widest">How are you feeling today?</p>
            </div>
            <button 
              onClick={onClose}
              className="w-10 h-10 rounded-full bg-pink-50 flex items-center justify-center text-pink-400 hover:bg-pink-100 transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          {/* Tabs */}
          <div className="px-8 flex gap-2 overflow-x-auto scrollbar-hide pb-4">
            {[
              { id: 'period', label: 'Period', icon: Calendar },
              { id: 'symptoms', label: 'Symptoms', icon: Activity },
              { id: 'timeline', label: 'Timeline', icon: History },
              { id: 'other', label: 'Other', icon: Plus },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all flex-shrink-0 ${activeTab === tab.id ? 'bg-pink-400 text-white shadow-md' : 'text-pink-300 hover:bg-pink-50'}`}
              >
                <tab.icon size={14} />
                <span className="text-[10px] font-bold uppercase tracking-widest">{tab.label}</span>
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="p-8 pt-4">
            {activeTab === 'period' && (
              <div className="space-y-6 animate-fadeIn">
                <div className="text-center">
                  <div className="text-5xl mb-4">🩸</div>
                  <h4 className="text-lg font-serif text-pink-600 italic mb-2">Log Your Period</h4>
                  <p className="text-[10px] font-bold text-pink-300 uppercase tracking-widest mb-6">Select the dates of your flow</p>
                  
                  <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2 text-left">
                        <label className="text-[10px] font-bold text-pink-300 uppercase ml-2">Start Date</label>
                        <input 
                          type="date" 
                          value={startDate}
                          onChange={(e) => setStartDate(e.target.value)}
                          className="w-full bg-pink-50/50 p-4 rounded-2xl outline-none text-pink-600 font-bold text-sm border border-transparent focus:border-pink-200"
                        />
                      </div>
                      <div className="space-y-2 text-left">
                        <label className="text-[10px] font-bold text-pink-300 uppercase ml-2">End Date</label>
                        <input 
                          type="date" 
                          value={endDate}
                          onChange={(e) => setEndDate(e.target.value)}
                          className="w-full bg-pink-50/50 p-4 rounded-2xl outline-none text-pink-600 font-bold text-sm border border-transparent focus:border-pink-200"
                        />
                      </div>
                    </div>

                    <div className="space-y-3">
                      <label className="text-[10px] font-bold text-pink-300 uppercase block text-left ml-2">Flow Intensity</label>
                      <div className="flex justify-between gap-2">
                        {(['spotting', 'light', 'medium', 'heavy'] as const).map(intensity => (
                          <button
                            key={intensity}
                            onClick={() => setSelectedIntensity(intensity)}
                            className={`flex-1 py-3 rounded-2xl border-2 transition-all ${selectedIntensity === intensity ? 'border-pink-400 bg-pink-50 text-pink-600 shadow-sm' : 'border-gray-50 text-gray-400 hover:border-pink-100'}`}
                          >
                            <span className="text-[9px] font-bold uppercase tracking-widest">{intensity}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2 text-left">
                      <label className="text-[10px] font-bold text-pink-300 uppercase ml-2">Notes (Optional)</label>
                      <textarea 
                        placeholder="How are you feeling during this period?"
                        value={periodNotes}
                        onChange={(e) => setPeriodNotes(e.target.value)}
                        className="w-full bg-pink-50/50 p-4 rounded-2xl outline-none text-pink-600 text-sm border border-transparent focus:border-pink-200 min-h-[80px] resize-none"
                      />
                    </div>

                    <button
                      onClick={() => {
                        const startStr = new Date(startDate + 'T12:00:00').toDateString();
                        const endStr = new Date(endDate + 'T12:00:00').toDateString();
                        onLogFullPeriod(startStr, endStr, selectedIntensity);
                        onClose();
                      }}
                      className="w-full py-5 bg-gradient-to-r from-pink-400 to-rose-400 text-white rounded-3xl font-bold text-lg shadow-xl shadow-pink-100 hover:scale-[1.02] active:scale-95 transition-all"
                    >
                      SAVE PERIOD LOG
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'symptoms' && (
              <div className="grid grid-cols-3 gap-3 animate-fadeIn max-h-[350px] overflow-y-auto pr-2 scrollbar-hide">
                {SYMPTOMS.map(s => {
                  const isLogged = symptoms.some(sym => sym.type === s.id && sym.date === today);
                  return (
                    <button
                      key={s.id}
                      onClick={() => onLogSymptom(s.id as any, 2)}
                      className={`flex flex-col items-center gap-2 p-4 rounded-3xl border transition-all ${isLogged ? 'bg-pink-400 border-pink-400 text-white shadow-md' : 'bg-white border-gray-100 text-gray-400 hover:border-pink-200'}`}
                    >
                      <span className="text-2xl">{s.emoji}</span>
                      <span className="text-[8px] font-bold uppercase text-center leading-tight">{s.label}</span>
                    </button>
                  );
                })}
              </div>
            )}

            {activeTab === 'timeline' && (
              <div className="space-y-4 animate-fadeIn max-h-[350px] overflow-y-auto pr-2 scrollbar-hide">
                {combinedTimeline.length > 0 ? (
                  combinedTimeline.map((item) => (
                    <div key={item.id} className="flex items-center gap-4 p-4 bg-pink-50/30 rounded-2xl border border-pink-50">
                      <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm text-xl">
                        {item.logType === 'period' ? '🩸' : getSymptomInfo((item as Symptom).type)?.emoji}
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-pink-300 uppercase">{new Date(item.date).toLocaleDateString('default', { month: 'short', day: 'numeric' })}</p>
                        <p className="text-sm font-serif text-pink-600 italic">
                          {item.logType === 'period' ? `Period (${(item as any).intensity})` : getSymptomInfo((item as Symptom).type)?.label}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-12">
                    <p className="text-pink-300 italic">No logs yet.</p>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'other' && (
              <div className="space-y-6 animate-fadeIn max-h-[400px] overflow-y-auto pr-2 scrollbar-hide">
                {/* Mood Section */}
                <div className="space-y-4">
                  <h4 className="text-[10px] font-bold text-pink-300 uppercase tracking-widest ml-2">Daily Mood</h4>
                  <div className="grid grid-cols-4 gap-2">
                    {(['happy', 'calm', 'excited', 'tired', 'sad', 'anxious', 'angry', 'irritable'] as const).map(mood => (
                      <button
                        key={mood}
                        onClick={() => onLogMood(mood, moodNote)}
                        className="flex flex-col items-center gap-1 p-3 rounded-2xl bg-pink-50/50 hover:bg-pink-100 transition-colors"
                      >
                        <span className="text-xl">
                          {mood === 'happy' ? '😊' : mood === 'calm' ? '😌' : mood === 'excited' ? '🤩' : mood === 'tired' ? '😴' : 
                           mood === 'sad' ? '😢' : mood === 'anxious' ? '😰' : mood === 'angry' ? '😡' : '😤'}
                        </span>
                        <span className="text-[8px] font-bold uppercase text-pink-400">{mood}</span>
                      </button>
                    ))}
                  </div>
                  <input 
                    type="text"
                    placeholder="Add a mood note..."
                    value={moodNote}
                    onChange={(e) => setMoodNote(e.target.value)}
                    className="w-full bg-pink-50/30 p-3 rounded-2xl outline-none text-pink-600 text-xs border border-transparent focus:border-pink-200"
                  />
                </div>

                {/* Sexual Activity Section */}
                <div className="space-y-4 pt-4 border-t border-pink-50">
                  <h4 className="text-[10px] font-bold text-pink-300 uppercase tracking-widest ml-2">Sexual Activity</h4>
                  <div className="flex items-center justify-between bg-pink-50/30 p-4 rounded-2xl">
                    <span className="text-xs font-medium text-pink-600">Protected?</span>
                    <button 
                      onClick={() => setIsProtected(!isProtected)}
                      className={`px-4 py-1 rounded-full text-[10px] font-bold uppercase transition-all ${isProtected ? 'bg-teal-400 text-white' : 'bg-rose-400 text-white'}`}
                    >
                      {isProtected ? 'Yes' : 'No'}
                    </button>
                  </div>
                  <div className="flex gap-2">
                    <input 
                      type="text"
                      placeholder="Activity notes..."
                      value={sexNote}
                      onChange={(e) => setSexNote(e.target.value)}
                      className="flex-1 bg-pink-50/30 p-3 rounded-2xl outline-none text-pink-600 text-xs border border-transparent focus:border-pink-200"
                    />
                    <button 
                      onClick={() => onLogSexualActivity(isProtected, sexNote)}
                      className="px-6 bg-pink-400 text-white rounded-2xl font-bold text-[10px] uppercase shadow-md shadow-pink-100"
                    >
                      Log
                    </button>
                  </div>
                </div>

                {/* Other Placeholders */}
                <div className="grid grid-cols-2 gap-3 pt-4 border-t border-pink-50">
                  {[
                    { label: 'Birth Control', emoji: '💊', color: 'blue' },
                    { label: 'Temperature', emoji: '🌡️', color: 'orange' },
                    { label: 'Water Intake', emoji: '💧', color: 'cyan' },
                    { label: 'Weight', emoji: '⚖️', color: 'purple' },
                  ].map(item => (
                    <button
                      key={item.label}
                      className={`flex items-center gap-3 p-3 bg-white rounded-2xl border border-gray-100 hover:border-pink-200 transition-colors group`}
                    >
                      <div className="w-8 h-8 rounded-full bg-pink-50 flex items-center justify-center text-sm group-hover:scale-110 transition-transform">
                        {item.emoji}
                      </div>
                      <span className="text-[9px] font-bold text-gray-400 uppercase">{item.label}</span>
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
