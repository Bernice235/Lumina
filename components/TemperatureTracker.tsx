
import React, { useState } from 'react';
import { User, TemperatureLog } from '../types';

interface TemperatureTrackerProps {
  user: User;
  logs: TemperatureLog[];
  setLogs: React.Dispatch<React.SetStateAction<TemperatureLog[]>>;
  onUpdateUnit: (unit: 'C' | 'F') => void;
}

const TemperatureTracker: React.FC<TemperatureTrackerProps> = ({ user, logs, setLogs, onUpdateUnit }) => {
  const [inputValue, setInputValue] = useState('');
  const today = new Date().toDateString();
  const todayLog = logs.find(log => log.date === today);
  const unit = user.tempUnit || 'C';

  // Scales: C: 35.5 - 38.0 | F: 96.0 - 100.0
  const minTemp = unit === 'C' ? 35.5 : 96.0;
  const maxTemp = unit === 'C' ? 38.0 : 100.4;
  const range = maxTemp - minTemp;

  const handleAddLog = () => {
    const val = parseFloat(inputValue);
    if (isNaN(val)) return;

    const newLog: TemperatureLog = {
      id: Math.random().toString(),
      date: today,
      value: val,
      unit
    };

    setLogs(prev => [newLog, ...prev.filter(l => l.date !== today)]);
    setInputValue('');
  };

  const getPercentage = (val: number) => {
    return Math.max(0, Math.min(100, ((val - minTemp) / range) * 100));
  };

  return (
    <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-pink-50 space-y-8 animate-fadeIn">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-serif text-pink-500 flex items-center gap-2 italic">
          <span className="text-2xl">🌡️</span> Basal Temperature
        </h3>
        <div className="flex bg-pink-50/50 p-1 rounded-xl border border-pink-100">
          <button 
            onClick={() => onUpdateUnit('C')}
            className={`px-3 py-1 rounded-lg text-[10px] font-bold transition-all ${unit === 'C' ? 'bg-white text-pink-500 shadow-sm' : 'text-pink-300'}`}
          >
            °C
          </button>
          <button 
            onClick={() => onUpdateUnit('F')}
            className={`px-3 py-1 rounded-lg text-[10px] font-bold transition-all ${unit === 'F' ? 'bg-white text-pink-500 shadow-sm' : 'text-pink-300'}`}
          >
            °F
          </button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-8 items-center">
        {/* Thermometer Scale UI */}
        <div className="relative h-64 w-12 bg-pink-50/50 rounded-full border border-pink-100 overflow-hidden flex flex-col-reverse group">
          <div 
            className="bg-gradient-to-t from-pink-400 to-rose-300 w-full transition-all duration-1000 ease-out flex items-start justify-center relative"
            style={{ height: `${todayLog ? getPercentage(todayLog.value) : 0}%` }}
          >
            <div className="w-full h-1 bg-white/50 blur-[1px]"></div>
            {todayLog && (
              <div className="absolute -top-8 bg-pink-500 text-white text-[10px] px-2 py-1 rounded-full font-bold shadow-lg whitespace-nowrap">
                {todayLog.value}°{unit}
              </div>
            )}
          </div>
          {/* Ticks */}
          <div className="absolute inset-0 flex flex-col justify-between py-6 px-1 opacity-20 pointer-events-none">
            {[...Array(6)].map((_, i) => <div key={i} className="w-full h-[1px] bg-pink-300"></div>)}
          </div>
        </div>

        <div className="flex-1 space-y-6 w-full">
          <div className="space-y-4">
            <p className="text-[10px] font-bold text-pink-300 uppercase tracking-widest ml-2">Log Today's Reading</p>
            <div className="flex gap-3">
              <input 
                type="number" 
                step="0.1"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder={unit === 'C' ? "36.5" : "97.7"}
                className="flex-1 px-6 py-4 bg-pink-50/30 border border-pink-50 rounded-2xl focus:ring-4 focus:ring-pink-100 outline-none text-pink-700 font-serif italic text-lg shadow-sm"
              />
              <button 
                onClick={handleAddLog}
                className="px-8 py-4 bg-pink-400 text-white rounded-2xl font-bold uppercase text-[10px] tracking-widest shadow-lg shadow-pink-100 hover:scale-105 active:scale-95 transition-all"
              >
                Log
              </button>
            </div>
          </div>

          <div className="bg-rose-50/50 p-6 rounded-3xl border border-rose-100">
             <div className="flex items-center gap-3 mb-2">
                <span className="text-xl">✨</span>
                <h4 className="text-[10px] font-bold text-rose-400 uppercase tracking-widest leading-none">Why track BBT?</h4>
             </div>
             <p className="text-xs text-rose-600 font-serif italic leading-relaxed">
               Your resting temperature rises slightly after ovulation. Tracking this helps identify your fertile window with high precision. Best measured right after waking up!
             </p>
          </div>
        </div>
      </div>

      {/* History List */}
      <div className="pt-4 border-t border-pink-50">
        <h4 className="text-[10px] font-bold text-pink-300 uppercase tracking-widest mb-4 ml-2">Recent Readings</h4>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {logs.slice(0, 4).map(log => (
            <div key={log.id} className="p-3 bg-pink-50/20 rounded-2xl border border-pink-50 flex flex-col items-center">
              <span className="text-[9px] text-pink-300 font-bold uppercase">{log.date.split(' ').slice(1, 3).join(' ')}</span>
              <span className="text-base font-serif italic text-pink-600 font-bold">{log.value}°{log.unit}</span>
            </div>
          ))}
          {logs.length === 0 && <p className="col-span-4 text-center text-xs text-pink-200 italic py-4">No readings yet, princess...</p>}
        </div>
      </div>
    </div>
  );
};

export default TemperatureTracker;
