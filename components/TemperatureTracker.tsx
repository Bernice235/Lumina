import React, { useState } from 'react';
import { User, TemperatureLog } from '../types';
import { Thermometer, Info } from 'lucide-react';

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

  // Scales: C: 35.5 - 38.0 | F: 96.0 - 100.4
  const minTemp = unit === 'C' ? 35.5 : 96.0;
  const maxTemp = unit === 'C' ? 38.0 : 100.4;
  const range = maxTemp - minTemp;

  const handleAddLog = () => {
    const val = parseFloat(inputValue);
    if (isNaN(val)) return;

    const newLog: TemperatureLog = {
      id: crypto.randomUUID(),
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
    <div className="bg-white dark:bg-[#1a1816] p-6 sm:p-8 rounded-2xl shadow-xs border border-stone-200/80 dark:border-[#2e2a26] space-y-7 animate-fadeIn">
      <div className="flex justify-between items-center gap-4">
        <h3 className="text-xl font-serif font-semibold text-stone-900 dark:text-stone-100 flex items-center gap-2">
          <Thermometer className="w-5 h-5 text-pink-600 dark:text-pink-400" />
          Basal Temperature
        </h3>
        <div className="flex bg-[#faf8f6] dark:bg-[#23201d] p-1 rounded-xl border border-stone-200/80 dark:border-[#342f2b]">
          <button
            type="button"
            onClick={() => onUpdateUnit('C')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${unit === 'C' ? 'bg-white dark:bg-[#1a1816] text-pink-600 dark:text-pink-400 shadow-xs' : 'text-stone-500 dark:text-stone-400'}`}
          >
            °C
          </button>
          <button
            type="button"
            onClick={() => onUpdateUnit('F')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${unit === 'F' ? 'bg-white dark:bg-[#1a1816] text-pink-600 dark:text-pink-400 shadow-xs' : 'text-stone-500 dark:text-stone-400'}`}
          >
            °F
          </button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-8 items-center">
        {/* Thermometer Scale UI */}
        <div className="relative h-60 w-11 bg-[#faf8f6] dark:bg-[#23201d] rounded-full border border-stone-200/80 dark:border-[#342f2b] overflow-hidden flex flex-col-reverse shrink-0">
          <div
            className="bg-gradient-to-t from-pink-600 to-rose-400 w-full transition-all duration-700 ease-out flex items-start justify-center relative"
            style={{ height: `${todayLog ? getPercentage(todayLog.value) : 0}%` }}
          >
            <div className="w-full h-1 bg-white/50"></div>
            {todayLog && (
              <div className="absolute -top-8 bg-pink-600 text-white text-xs px-2.5 py-0.5 rounded-lg font-semibold shadow-sm whitespace-nowrap tabular-nums">
                {todayLog.value}°{unit}
              </div>
            )}
          </div>
          {/* Ticks */}
          <div className="absolute inset-0 flex flex-col justify-between py-6 px-1.5 opacity-30 pointer-events-none">
            {[...Array(6)].map((_, i) => <div key={i} className="w-full h-[1px] bg-stone-400 dark:bg-stone-500"></div>)}
          </div>
        </div>

        <div className="flex-1 space-y-5 w-full">
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-stone-600 dark:text-stone-300">Log today's reading</label>
            <div className="flex gap-3">
              <input
                type="number"
                step="0.1"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder={unit === 'C' ? "36.5" : "97.7"}
                className="flex-1 h-11 px-4 bg-[#faf8f6] dark:bg-[#23201d] border border-stone-200/80 dark:border-[#342f2b] rounded-xl focus:ring-2 focus:ring-pink-500/30 outline-none text-stone-900 dark:text-stone-100 font-semibold text-base tabular-nums"
              />
              <button
                type="button"
                onClick={handleAddLog}
                className="h-11 px-6 bg-pink-600 hover:bg-pink-700 text-white rounded-xl font-semibold text-xs transition-colors cursor-pointer whitespace-nowrap"
              >
                Log Reading
              </button>
            </div>
          </div>

          <div className="bg-[#faf8f6] dark:bg-[#23201d] p-5 rounded-2xl border border-stone-200/80 dark:border-[#342f2b]">
            <div className="flex items-center gap-2 mb-1.5">
              <Info className="w-4 h-4 text-rose-600 dark:text-rose-400" />
              <h4 className="text-xs font-semibold text-stone-800 dark:text-stone-200">Why track basal body temperature?</h4>
            </div>
            <p className="text-xs text-stone-600 dark:text-stone-300 leading-relaxed">
              Your resting temperature rises slightly after ovulation due to progesterone. Measuring immediately upon waking helps pinpoint your fertile window and confirm ovulation.
            </p>
          </div>
        </div>
      </div>

      {/* History List */}
      <div className="pt-4 border-t border-stone-200/70 dark:border-[#2e2a26]">
        <h4 className="text-xs font-semibold text-stone-600 dark:text-stone-300 mb-3">Recent Readings</h4>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {logs.slice(0, 4).map(log => (
            <div key={log.id} className="p-3 bg-[#faf8f6] dark:bg-[#23201d] rounded-xl border border-stone-200/80 dark:border-[#342f2b] flex flex-col items-center">
              <span className="text-xs text-stone-500 dark:text-stone-400 font-medium">{log.date.split(' ').slice(1, 3).join(' ')}</span>
              <span className="text-base font-serif text-stone-900 dark:text-stone-100 font-semibold tabular-nums mt-0.5">{log.value}°{log.unit}</span>
            </div>
          ))}
          {logs.length === 0 && <p className="col-span-4 text-center text-xs text-stone-500 dark:text-stone-400 py-4">No temperature readings logged yet.</p>}
        </div>
      </div>
    </div>
  );
};

export default TemperatureTracker;
