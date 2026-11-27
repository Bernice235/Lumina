import React, { useState } from 'react';
import { CYCLE_PHASES } from '../constants';
import { Sparkles, Heart, AlertCircle, BookOpen } from 'lucide-react';

const Cyclepedia: React.FC = () => {
  const [selectedPhase, setSelectedPhase] = useState(CYCLE_PHASES[0]);

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      <header>
        <h2 className="text-3xl font-serif font-semibold text-stone-900 dark:text-stone-100">Cyclepedia</h2>
        <p className="text-sm text-stone-500 dark:text-stone-400 mt-1">Evidence-based reference guide to your hormonal phases</p>
      </header>

      {/* Phase Selection Tabs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {CYCLE_PHASES.map((phase) => {
          const isSelected = selectedPhase.id === phase.id;
          return (
            <button
              key={phase.id}
              type="button"
              onClick={() => setSelectedPhase(phase)}
              className={`flex items-center gap-3 p-4 rounded-2xl border transition-colors text-left cursor-pointer ${
                isSelected
                  ? 'bg-pink-600 border-pink-600 text-white shadow-xs'
                  : 'bg-white dark:bg-[#1a1816] border-stone-200/80 dark:border-[#2e2a26] text-stone-700 dark:text-stone-200 hover:border-pink-300 dark:hover:border-pink-800'
              }`}
            >
              <span className="text-2xl shrink-0">{phase.emoji}</span>
              <span className="text-sm font-semibold truncate">{phase.name.split(' ')[0]}</span>
            </button>
          );
        })}
      </div>

      {/* Content Card */}
      <section className="bg-white dark:bg-[#1a1816] p-6 sm:p-8 rounded-2xl shadow-xs border border-stone-200/80 dark:border-[#2e2a26] space-y-6">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-3">
            <h3 className="text-2xl font-serif font-semibold text-stone-900 dark:text-stone-100">{selectedPhase.name}</h3>
            <span className="text-xs bg-pink-50 dark:bg-pink-950/40 text-pink-700 dark:text-pink-300 px-3 py-1 rounded-lg font-semibold border border-pink-200/60 dark:border-pink-900/50 tabular-nums">
              {selectedPhase.duration}
            </span>
          </div>
          <p className="text-stone-600 dark:text-stone-300 text-base leading-relaxed">{selectedPhase.description}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Feelings & Moods */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-stone-600 dark:text-stone-300 flex items-center gap-2">
              <Heart className="w-4 h-4 text-pink-600 dark:text-pink-400" /> Common Feelings
            </h4>
            <div className="flex flex-wrap gap-2">
              {selectedPhase.feelings.map((f, i) => (
                <span key={i} className="px-3 py-1.5 bg-[#faf8f6] dark:bg-[#23201d] text-stone-800 dark:text-stone-200 rounded-xl text-xs font-medium border border-stone-200/80 dark:border-[#342f2b]">
                  {f}
                </span>
              ))}
            </div>
          </div>

          {/* Cravings */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-stone-600 dark:text-stone-300 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-rose-600 dark:text-rose-400" /> Cravings
            </h4>
            <div className="flex flex-wrap gap-2">
              {selectedPhase.cravings.map((c, i) => (
                <span key={i} className="px-3 py-1.5 bg-rose-50/70 dark:bg-rose-950/30 text-rose-800 dark:text-rose-300 rounded-xl text-xs font-medium border border-rose-200/60 dark:border-rose-900/50">
                  {c}
                </span>
              ))}
            </div>
          </div>

          {/* Symptoms */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-stone-600 dark:text-stone-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-indigo-600 dark:text-indigo-400" /> Symptoms
            </h4>
            <div className="flex flex-wrap gap-2">
              {selectedPhase.symptoms.map((s, i) => (
                <span key={i} className="px-3 py-1.5 bg-indigo-50/70 dark:bg-indigo-950/30 text-indigo-800 dark:text-indigo-300 rounded-xl text-xs font-medium border border-indigo-200/60 dark:border-indigo-900/50">
                  {s}
                </span>
              ))}
            </div>
          </div>

          {/* Advice Card */}
          <div className="p-5 bg-gradient-to-br from-pink-600 to-rose-600 rounded-2xl text-white">
            <h4 className="text-xs font-semibold text-pink-100 mb-1.5">Phase Guidance</h4>
            <p className="font-serif text-base leading-relaxed">"{selectedPhase.advice}"</p>
          </div>
        </div>
      </section>

      {/* Informational Hero */}
      <div className="p-6 sm:p-8 bg-white dark:bg-[#1a1816] rounded-2xl border border-stone-200/80 dark:border-[#2e2a26] flex flex-col sm:flex-row items-start sm:items-center gap-5 shadow-xs">
        <div className="w-14 h-14 bg-indigo-50 dark:bg-indigo-950/40 rounded-2xl flex items-center justify-center text-indigo-600 dark:text-indigo-400 border border-indigo-200/70 dark:border-indigo-900/50 shrink-0">
          <BookOpen className="w-6 h-6" />
        </div>
        <div className="flex-1">
          <h4 className="text-lg font-serif font-semibold text-stone-900 dark:text-stone-100 mb-1">Why do hormones fluctuate?</h4>
          <p className="text-sm text-stone-600 dark:text-stone-300 leading-relaxed">
            Estrogen, progesterone, and testosterone work together in predictable patterns to regulate energy, mood, and reproductive health. Understanding this rhythm gives you a practical map of your cycle.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Cyclepedia;
