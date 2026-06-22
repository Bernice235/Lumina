
import React, { useState, useEffect } from 'react';
import { Symptom } from '../types';
import { SUPPLEMENTS } from '../constants';
import { getSupplementAdvice } from '../services/gemini';

interface WellnessProps {
  symptoms: Symptom[];
}

const Wellness: React.FC<WellnessProps> = ({ symptoms }) => {
  const [activeTab, setActiveTab] = useState<'supplements' | 'endo'>('supplements');
  const [aiAdvice, setAiAdvice] = useState('');
  const [loading, setLoading] = useState(false);

  const today = new Date().toDateString();
  const todaysSymptoms = symptoms.filter(s => s.date === today).map(s => s.type);

  const handleAskAI = async () => {
    if (todaysSymptoms.length === 0) return;
    setLoading(true);
    const advice = await getSupplementAdvice(todaysSymptoms);
    setAiAdvice(advice);
    setLoading(false);
  };

  return (
    <div className="space-y-8 animate-fadeIn pb-12">
      <header className="text-center">
        <h2 className="text-4xl font-serif text-pink-500 italic mb-2">Wellness Sanctuary</h2>
        <p className="text-sm text-pink-300 italic font-medium">Nourish your temple, heal your soul</p>
      </header>

      {/* Wellness Tabs */}
      <div className="flex bg-pink-50/50 p-1.5 rounded-[2rem] border border-pink-100/50">
        <button 
          onClick={() => setActiveTab('supplements')}
          className={`flex-1 py-4 rounded-[1.8rem] text-xs font-bold uppercase tracking-widest transition-all ${activeTab === 'supplements' ? 'bg-white text-pink-500 shadow-md' : 'text-pink-300'}`}
        >
          Supplements
        </button>
        <button 
          onClick={() => setActiveTab('endo')}
          className={`flex-1 py-4 rounded-[1.8rem] text-xs font-bold uppercase tracking-widest transition-all ${activeTab === 'endo' ? 'bg-white text-pink-500 shadow-md' : 'text-pink-300'}`}
        >
          Endo Care
        </button>
      </div>

      {activeTab === 'supplements' ? (
        <div className="space-y-8 animate-fadeIn">
          {/* AI Advisor Card */}
          <section className="bg-gradient-to-br from-pink-400 to-rose-400 p-8 rounded-[3rem] text-white shadow-xl shadow-pink-100 relative overflow-hidden">
            <div className="relative z-10 space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-2xl border border-white/30">✨</div>
                <div>
                  <h3 className="text-xl font-serif italic">Your Personal Supplement Ritual</h3>
                  <p className="text-[10px] uppercase font-bold tracking-widest opacity-80">Based on today's symptoms</p>
                </div>
              </div>
              
              {todaysSymptoms.length > 0 ? (
                <div className="space-y-4">
                  <div className="flex flex-wrap gap-2">
                    {todaysSymptoms.map(s => (
                      <span key={s} className="bg-white/20 px-3 py-1 rounded-full text-[10px] font-bold uppercase border border-white/20">
                        {s.replace('_', ' ')}
                      </span>
                    ))}
                  </div>
                  <button 
                    onClick={handleAskAI}
                    disabled={loading}
                    className="w-full py-4 bg-white text-pink-500 rounded-2xl font-bold uppercase text-[10px] tracking-widest shadow-lg hover:scale-[1.02] transition-transform disabled:opacity-50"
                  >
                    {loading ? 'Consulting the Sanctuary...' : 'Get Wellness Plan'}
                  </button>
                </div>
              ) : (
                <p className="text-sm italic opacity-90">Log your symptoms in the Cycle tab to get a personalized ritual recommendation, darling!</p>
              )}

              {aiAdvice && (
                <div className="p-6 bg-white/10 backdrop-blur-md rounded-3xl border border-white/20 animate-fadeIn">
                  <p className="text-sm font-serif italic leading-relaxed whitespace-pre-wrap">"{aiAdvice}"</p>
                </div>
              )}
            </div>
            <span className="absolute -bottom-10 -right-10 text-[12rem] opacity-10">💊</span>
          </section>

          {/* Supplement Library */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {SUPPLEMENTS.map(supp => (
              <div key={supp.id} className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-pink-50 hover:border-pink-200 transition-all group">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-14 h-14 bg-pink-50 rounded-2xl flex items-center justify-center text-3xl group-hover:scale-110 transition-transform">{supp.emoji}</div>
                  <div>
                    <h4 className="text-xl font-serif text-pink-600 italic leading-none">{supp.name}</h4>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {supp.bestFor.map(b => (
                        <span key={b} className="text-[8px] bg-pink-100 text-pink-500 px-2 py-0.5 rounded-full font-bold uppercase">{b.replace('_', ' ')}</span>
                      ))}
                    </div>
                  </div>
                </div>
                <p className="text-sm text-gray-500 italic leading-relaxed mb-4">{supp.description}</p>
                <div className="pt-4 border-t border-pink-50">
                  <span className="text-[10px] font-bold text-pink-300 uppercase tracking-widest block mb-1">Divine Dosage</span>
                  <p className="text-xs text-pink-600 font-serif italic">{supp.dosage}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-8 animate-fadeIn">
          <section className="bg-white p-10 rounded-[3rem] shadow-sm border border-indigo-50 relative overflow-hidden">
             <div className="absolute top-0 right-0 p-8 opacity-5">
               <span className="text-[12rem]">🔥</span>
             </div>
             <div className="relative z-10 space-y-6">
                <h3 className="text-3xl font-serif text-indigo-600 italic">Endometriosis Support</h3>
                <p className="text-gray-600 font-serif italic text-lg leading-relaxed">
                  Endometriosis is more than just "bad periods." It's a journey of deep strength. Here, we focus on anti-inflammatory rituals and gentle self-compassion.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
                  <div className="p-8 bg-indigo-50/50 rounded-[2.5rem] border border-indigo-100">
                    <h4 className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest mb-4">Flare-up Kit</h4>
                    <ul className="space-y-3">
                       {['Heating pad for pelvic/back relief', 'Tens machine (if recommended)', 'Peppermint or Ginger tea', 'Comforting loose silk clothing'].map((item, i) => (
                         <li key={i} className="text-sm text-indigo-700 italic flex gap-3">
                           <span className="text-indigo-300">•</span> {item}
                         </li>
                       ))}
                    </ul>
                  </div>

                  <div className="p-8 bg-rose-50/50 rounded-[2.5rem] border border-rose-100">
                    <h4 className="text-[10px] font-bold text-rose-400 uppercase tracking-widest mb-4">The Endo Diet</h4>
                    <p className="text-xs text-rose-600 font-serif italic leading-relaxed">
                      Focus on lowering inflammation. Embrace dark leafy greens, berries, fatty fish (Omega-3s), and turmeric. Limit processed sugars and caffeine during flare-ups.
                    </p>
                  </div>
                </div>
             </div>
          </section>

          {/* Flare-up Tracking Info */}
          <div className="p-10 bg-indigo-900 rounded-[3rem] text-white shadow-xl relative overflow-hidden">
             <div className="relative z-10">
                <h4 className="text-2xl font-serif italic mb-4">Monitoring Your Spells</h4>
                <p className="text-sm opacity-80 leading-relaxed mb-6 font-serif italic">
                  When you log an "Endo Flare-up" in your symptoms tracker, we monitor the intensity and duration. This data is vital for your conversations with specialists.
                </p>
                <div className="flex gap-4">
                  <div className="flex-1 p-4 bg-white/10 rounded-2xl text-center border border-white/10">
                    <p className="text-2xl font-serif">7</p>
                    <p className="text-[8px] font-bold uppercase tracking-widest opacity-60">Flare Days (Month)</p>
                  </div>
                  <div className="flex-1 p-4 bg-white/10 rounded-2xl text-center border border-white/10">
                    <p className="text-2xl font-serif">High</p>
                    <p className="text-[8px] font-bold uppercase tracking-widest opacity-60">Average Intensity</p>
                  </div>
                </div>
             </div>
             <span className="absolute bottom-[-10%] left-[-5%] text-[10rem] opacity-10 rotate-12">🛡️</span>
          </div>

          <div className="p-8 bg-white rounded-[2.5rem] border border-indigo-50 text-center">
             <p className="text-sm text-indigo-300 italic mb-4">"You are not your pain. You are the ocean, and the pain is just a wave."</p>
             <button className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest hover:text-indigo-600">Find Specialists Nearby</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Wellness;
