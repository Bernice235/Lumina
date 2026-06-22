
import React, { useState } from 'react';
import { CYCLE_PHASES } from '../constants';

const Cyclepedia: React.FC = () => {
  const [selectedPhase, setSelectedPhase] = useState(CYCLE_PHASES[0]);

  return (
    <div className="space-y-8 animate-fadeIn pb-12">
      <header className="text-center">
        <h2 className="text-4xl font-serif text-pink-500 italic mb-2">Cyclepedia</h2>
        <p className="text-sm text-pink-300 italic font-medium">Decode the magic of your divine rhythm</p>
      </header>

      {/* Phase Selection Tabs */}
      <div className="flex gap-3 overflow-x-auto pb-4 scrollbar-hide">
        {CYCLE_PHASES.map((phase) => (
          <button
            key={phase.id}
            onClick={() => setSelectedPhase(phase)}
            className={`flex-shrink-0 flex flex-col items-center gap-2 p-5 rounded-[2.5rem] border-2 transition-all ${selectedPhase.id === phase.id ? 'bg-pink-500 border-pink-500 text-white shadow-lg scale-105' : 'bg-white border-pink-50 text-pink-300 hover:border-pink-200'}`}
          >
            <span className="text-3xl">{phase.emoji}</span>
            <span className="text-[10px] font-bold uppercase tracking-tighter">{phase.name.split(' ')[0]}</span>
          </button>
        ))}
      </div>

      {/* Content Card */}
      <section className="bg-white p-8 md:p-12 rounded-[3.5rem] shadow-sm border border-pink-50 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-10 opacity-[0.03] -rotate-12 pointer-events-none">
          <span className="text-[15rem]">{selectedPhase.emoji}</span>
        </div>

        <div className="relative z-10 space-y-8">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h3 className="text-3xl font-serif text-pink-600 italic">{selectedPhase.name}</h3>
              <span className="text-xs bg-pink-50 text-pink-400 px-3 py-1 rounded-full font-bold uppercase">{selectedPhase.duration}</span>
            </div>
            <p className="text-gray-600 font-serif italic text-lg leading-relaxed">{selectedPhase.description}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Feelings & Moods */}
            <div className="space-y-4">
              <h4 className="text-[10px] font-bold text-pink-400 uppercase tracking-widest flex items-center gap-2">
                <span className="text-lg">💭</span> Common Feelings
              </h4>
              <div className="flex flex-wrap gap-2">
                {selectedPhase.feelings.map((f, i) => (
                  <span key={i} className="px-4 py-2 bg-pink-50 text-pink-600 rounded-full text-sm font-serif italic border border-pink-100/50">
                    {f}
                  </span>
                ))}
              </div>
            </div>

            {/* Cravings */}
            <div className="space-y-4">
              <h4 className="text-[10px] font-bold text-pink-400 uppercase tracking-widest flex items-center gap-2">
                <span className="text-lg">🍰</span> Cravings
              </h4>
              <div className="flex flex-wrap gap-2">
                {selectedPhase.cravings.map((c, i) => (
                  <span key={i} className="px-4 py-2 bg-rose-50 text-rose-600 rounded-full text-sm font-serif italic border border-rose-100/50">
                    {c}
                  </span>
                ))}
              </div>
            </div>

            {/* Symptoms */}
            <div className="space-y-4">
              <h4 className="text-[10px] font-bold text-pink-400 uppercase tracking-widest flex items-center gap-2">
                <span className="text-lg">🩹</span> Symptoms
              </h4>
              <div className="flex flex-wrap gap-2">
                {selectedPhase.symptoms.map((s, i) => (
                  <span key={i} className="px-4 py-2 bg-indigo-50 text-indigo-600 rounded-full text-sm font-serif italic border border-indigo-100/50">
                    {s}
                  </span>
                ))}
              </div>
            </div>

            {/* Advice Card */}
            <div className="p-6 bg-gradient-to-br from-pink-400 to-rose-400 rounded-3xl text-white shadow-xl shadow-pink-100">
              <h4 className="text-[10px] font-bold uppercase tracking-widest opacity-80 mb-2">Sacred Advice</h4>
              <p className="font-serif italic text-lg leading-relaxed">"{selectedPhase.advice}"</p>
            </div>
          </div>
        </div>
      </section>

      {/* Informational Hero */}
      <div className="p-10 bg-gradient-to-br from-indigo-50 to-white rounded-[3rem] border border-indigo-100 flex flex-col md:flex-row items-center gap-8 shadow-sm">
        <div className="w-24 h-24 bg-indigo-100 rounded-full flex items-center justify-center text-5xl shadow-inner border-2 border-white">🧬</div>
        <div className="flex-1 text-center md:text-left">
           <h4 className="text-2xl font-serif text-indigo-600 mb-2 italic">Why do hormones fluctuate?</h4>
           <p className="text-sm text-indigo-400 font-serif italic leading-relaxed">
             Your hormones—Estrogen, Progesterone, and Testosterone—work in a beautiful symphony to manage your energy, mood, and reproductive health. Understanding this rhythm is like having a map to your own internal seasons.
           </p>
        </div>
      </div>
    </div>
  );
};

export default Cyclepedia;
