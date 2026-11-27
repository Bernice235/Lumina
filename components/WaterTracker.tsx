import React, { useState } from 'react';
import { Droplets, Minus, Plus, SlidersHorizontal } from 'lucide-react';

interface WaterTrackerProps {
  waterIntake: number;
  setWaterIntake: React.Dispatch<React.SetStateAction<number>>;
  waterGoal: number;
  setWaterGoal: React.Dispatch<React.SetStateAction<number>>;
}

const WaterTracker: React.FC<WaterTrackerProps> = ({ waterIntake, setWaterIntake, waterGoal, setWaterGoal }) => {
  const [isEditingGoal, setIsEditingGoal] = useState(false);

  const percentage = Math.min(Math.round((waterIntake / waterGoal) * 100), 100);

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-serif font-semibold text-stone-900 dark:text-stone-100">Hydration</h2>
          <p className="text-sm text-stone-500 dark:text-stone-400 mt-1">Daily hydration supports hormone balance and cycle comfort</p>
        </div>

        <button
          type="button"
          onClick={() => setIsEditingGoal(!isEditingGoal)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-white dark:bg-[#1a1816] text-stone-700 dark:text-stone-200 rounded-xl hover:bg-stone-50 dark:hover:bg-[#23201d] transition-colors text-xs font-semibold border border-stone-200/80 dark:border-[#2e2a26] cursor-pointer self-start sm:self-auto whitespace-nowrap"
        >
          <SlidersHorizontal className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
          <span className="tabular-nums">{isEditingGoal ? 'Done' : `Daily Goal: ${waterGoal} glasses`}</span>
        </button>
      </header>

      {isEditingGoal && (
        <div className="bg-white dark:bg-[#1a1816] p-6 rounded-2xl shadow-xs border border-stone-200/80 dark:border-[#2e2a26] animate-fadeIn space-y-4 text-center">
          <label className="block text-xs font-semibold text-stone-600 dark:text-stone-300">
            Adjust Daily Hydration Target
          </label>
          <div className="flex items-center justify-center gap-6">
            <button
              type="button"
              onClick={() => setWaterGoal(Math.max(1, waterGoal - 1))}
              className="w-10 h-10 bg-[#faf8f6] dark:bg-[#23201d] text-stone-700 dark:text-stone-200 rounded-xl flex items-center justify-center border border-stone-200/80 dark:border-[#342f2b] hover:bg-stone-100 dark:hover:bg-[#2c2824] transition-colors cursor-pointer"
            >
              <Minus className="w-4 h-4" />
            </button>
            <div className="flex flex-col items-center">
              <input
                type="number"
                value={waterGoal}
                onChange={(e) => setWaterGoal(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-20 text-3xl font-serif font-semibold text-stone-900 dark:text-stone-100 text-center bg-transparent border-b-2 border-stone-200 dark:border-[#342f2b] focus:border-sky-500 outline-none tabular-nums"
              />
              <span className="text-xs font-medium text-stone-500 dark:text-stone-400 mt-1">Glasses</span>
            </div>
            <button
              type="button"
              onClick={() => setWaterGoal(Math.min(30, waterGoal + 1))}
              className="w-10 h-10 bg-[#faf8f6] dark:bg-[#23201d] text-stone-700 dark:text-stone-200 rounded-xl flex items-center justify-center border border-stone-200/80 dark:border-[#342f2b] hover:bg-stone-100 dark:hover:bg-[#2c2824] transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
          <p className="text-xs text-stone-500 dark:text-stone-400">Most clinicians recommend 8 to 12 glasses daily.</p>
        </div>
      )}

      <div className="bg-white dark:bg-[#1a1816] p-6 sm:p-10 rounded-2xl shadow-xs border border-stone-200/80 dark:border-[#2e2a26] flex flex-col items-center gap-8 text-center">
        <div className="relative w-44 h-60 border-2 border-stone-200/90 dark:border-[#342f2b] rounded-2xl overflow-hidden bg-[#faf8f6] dark:bg-[#23201d]">
          <div
            className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-sky-500 to-sky-400 transition-all duration-700 ease-out flex items-center justify-center"
            style={{ height: `${Math.min(100, (waterIntake / waterGoal) * 100)}%` }}
          >
            <div className="flex flex-col items-center text-white">
              <span className="text-3xl font-serif font-semibold tabular-nums">{percentage}%</span>
              <span className="text-xs font-medium opacity-90">Daily Goal</span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap justify-center gap-2.5 max-w-lg">
          {[...Array(waterGoal)].map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setWaterIntake(i + 1)}
              className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors border cursor-pointer ${
                i < waterIntake
                  ? 'bg-sky-600 border-sky-600 text-white'
                  : 'bg-[#faf8f6] dark:bg-[#23201d] border-stone-200/80 dark:border-[#342f2b] text-stone-400 dark:text-stone-500 hover:border-sky-400'
              }`}
              aria-label={`Log ${i + 1} glass${i === 0 ? '' : 'es'}`}
            >
              <Droplets className="w-5 h-5" />
            </button>
          ))}
        </div>

        <div className="space-y-3 w-full max-w-md">
          <p className="text-lg font-serif font-semibold text-stone-900 dark:text-stone-100 tabular-nums">
            {waterIntake >= waterGoal
              ? "Daily hydration goal reached."
              : waterIntake === 0
                ? "Start logging your hydration for today."
                : `${Math.max(0, waterGoal - waterIntake)} more glass${Math.max(0, waterGoal - waterIntake) === 1 ? '' : 'es'} to reach your goal.`
            }
          </p>
          <div className="h-2 w-48 bg-stone-100 dark:bg-[#23201d] rounded-full mx-auto overflow-hidden">
            <div className="h-full bg-sky-600 transition-all duration-500" style={{ width: `${percentage}%` }}></div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
        <div className="p-6 bg-white dark:bg-[#1a1816] rounded-2xl border border-stone-200/80 dark:border-[#2e2a26] shadow-xs">
          <h4 className="text-xs font-semibold text-sky-600 dark:text-sky-400 mb-2">Cycle Sync Tip</h4>
          <p className="text-sm text-stone-700 dark:text-stone-300 leading-relaxed">Consistent hydration helps reduce luteal phase bloating and eases muscle cramping during menstruation.</p>
        </div>
        <div className="p-6 bg-white dark:bg-[#1a1816] rounded-2xl border border-stone-200/80 dark:border-[#2e2a26] shadow-xs">
          <h4 className="text-xs font-semibold text-pink-600 dark:text-pink-400 mb-2">Infusion Idea</h4>
          <p className="text-sm text-stone-700 dark:text-stone-300 leading-relaxed">Add sliced strawberries, cucumber, or fresh mint to your bottle for refreshing electrolytes without added sugar.</p>
        </div>
      </div>
    </div>
  );
};

export default WaterTracker;
