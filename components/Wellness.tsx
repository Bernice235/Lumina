import React, { useState, useEffect } from 'react';
import { Symptom, User } from '../types';
import { SUPPLEMENTS } from '../constants';
import { getSupplementAdvice } from '../services/gemini';
import YogaTutorials from './YogaTutorials';
import EndometriosisCare from './EndometriosisCare';
import { trackOpenWellnessContent } from '../services/analyticsService';
import { 
  Activity, 
  Heart, 
  Smile, 
  Droplet, 
  Moon, 
  Apple, 
  Sparkles, 
  TrendingUp, 
  RotateCw, 
  Smartphone, 
  ChevronRight, 
  Info,
  Flame,
  Dumbbell,
  Compass,
  ShieldCheck
} from 'lucide-react';

interface WellnessProps {
  symptoms: Symptom[];
  user: User;
  setUser: (u: User) => void;
  waterIntake: number;
  setWaterIntake: React.Dispatch<React.SetStateAction<number>>;
}

const Wellness: React.FC<WellnessProps> = ({ symptoms, user, setUser, waterIntake, setWaterIntake }) => {
  const [activeTab, setActiveTab] = useState<'trackers' | 'rituals' | 'endo' | 'yoga'>('trackers');
  
  // Daily wellness tracker state (persisted locally per user session)
  const [sleepHours, setSleepHours] = useState<number>(7.0);
  const [exerciseMinutes, setExerciseMinutes] = useState<number>(30);
  const [nutritionScore, setNutritionScore] = useState<string>('Balanced'); // 'Anti-inflammatory' | 'Balanced' | 'Heavy Cravings'
  const [mindfulnessMinutes, setMindfulnessMinutes] = useState<number>(15);
  
  // Gemini advisor states
  const [aiAdvice, setAiAdvice] = useState('');
  const [loading, setLoading] = useState(false);

  const today = new Date().toDateString();
  const todaysSymptoms = symptoms.filter(s => s.date === today).map(s => s.type);

  useEffect(() => {
    trackOpenWellnessContent(`Wellness Tab: ${activeTab}`, activeTab);
  }, [activeTab]);

  // Calculate high-fidelity Wellness Score (out of 100)
  const wellnessScore = (() => {
    // Sleep: optimal 7-9 hours (30 points)
    let sleepPoints = 0;
    if (sleepHours >= 7 && sleepHours <= 9) sleepPoints = 30;
    else if (sleepHours > 9) sleepPoints = 20;
    else sleepPoints = Math.round((sleepHours / 7) * 30);

    // Exercise: optimal 30+ mins (25 points)
    const exercisePoints = Math.min(25, Math.round((exerciseMinutes / 30) * 25));

    // Water: optimal 8 glasses (20 points)
    const waterPoints = Math.min(20, Math.round((waterIntake / 8) * 20));

    // Mindfulness: optimal 15+ mins (15 points)
    const mindPoints = Math.min(15, Math.round((mindfulnessMinutes / 15) * 15));

    // Nutrition: (10 points)
    let nutritionPoints = 6;
    if (nutritionScore === 'Anti-inflammatory') nutritionPoints = 10;
    if (nutritionScore === 'Balanced') nutritionPoints = 8;

    return Math.min(100, sleepPoints + exercisePoints + waterPoints + mindPoints + nutritionPoints);
  })();

  const handleAskAI = async () => {
    if (todaysSymptoms.length === 0) return;
    setLoading(true);
    const advice = await getSupplementAdvice(todaysSymptoms);
    setAiAdvice(advice);
    setLoading(false);
  };

  return (
    <div className="space-y-8 animate-fadeIn pb-12 text-gray-800">
      {/* Redesigned Glassmorphic Screen Header */}
      <header className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 text-center md:text-left bg-white/40 backdrop-blur-xl p-6 md:p-8 rounded-[2.5rem] border border-white/60 shadow-[inset_0_2px_4px_rgba(255,255,255,0.6),_0_12px_36px_rgba(244,114,182,0.03)]">
        <div>
          <h2 className="text-3xl font-serif text-pink-600 font-bold tracking-tight">Wellness</h2>
          <p className="text-xs text-stone-500 font-serif italic mt-1">Nourish your body and mind</p>
        </div>
      </header>

      {/* Glassmorphic Top Tab Navigation */}
      <div className="flex flex-wrap md:flex-nowrap bg-pink-100/30 p-1.5 rounded-[2rem] border border-white/60 shadow-[inset_0_2px_4px_rgba(255,255,255,0.5),_0_4px_15px_rgba(244,114,182,0.03)] backdrop-blur-md gap-1 md:gap-0">
        <button 
          onClick={() => setActiveTab('trackers')}
          className={`flex-1 py-3 rounded-[1.8rem] text-[10px] font-black uppercase tracking-widest transition-all duration-300 cursor-pointer min-w-[110px] ${
            activeTab === 'trackers' 
              ? 'bg-gradient-to-br from-pink-400 to-rose-400 text-white shadow-[inset_0_2px_4px_rgba(255,255,255,0.4),_inset_0_-2px_4px_rgba(0,0,0,0.15),_0_6px_15px_rgba(244,114,182,0.25)] scale-[1.01]' 
              : 'text-pink-400 hover:text-pink-600'
          }`}
        >
          Score & Trackers
        </button>
        <button 
          onClick={() => setActiveTab('rituals')}
          className={`flex-1 py-3 rounded-[1.8rem] text-[10px] font-black uppercase tracking-widest transition-all duration-300 cursor-pointer min-w-[110px] ${
            activeTab === 'rituals' 
              ? 'bg-gradient-to-br from-pink-400 to-rose-400 text-white shadow-[inset_0_2px_4px_rgba(255,255,255,0.4),_inset_0_-2px_4px_rgba(0,0,0,0.15),_0_6px_15px_rgba(244,114,182,0.25)] scale-[1.01]' 
              : 'text-pink-400 hover:text-pink-600'
          }`}
        >
          Divine Rituals
        </button>
        <button 
          onClick={() => setActiveTab('endo')}
          className={`flex-1 py-3 rounded-[1.8rem] text-[10px] font-black uppercase tracking-widest transition-all duration-300 cursor-pointer min-w-[110px] ${
            activeTab === 'endo' 
              ? 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-[inset_0_2px_4px_rgba(255,255,255,0.4),_inset_0_-2px_4px_rgba(0,0,0,0.15),_0_6px_15px_rgba(99,102,241,0.25)] scale-[1.01]' 
              : 'text-indigo-400 hover:text-indigo-600'
          }`}
        >
          Endo Care
        </button>
        <button 
          onClick={() => setActiveTab('yoga')}
          className={`flex-1 py-3 rounded-[1.8rem] text-[10px] font-black uppercase tracking-widest transition-all duration-300 cursor-pointer min-w-[110px] ${
            activeTab === 'yoga' 
              ? 'bg-gradient-to-br from-pink-400 to-rose-400 text-white shadow-[inset_0_2px_4px_rgba(255,255,255,0.4),_inset_0_-2px_4px_rgba(0,0,0,0.15),_0_6px_15px_rgba(244,114,182,0.25)] scale-[1.01]' 
              : 'text-pink-400 hover:text-pink-600'
          }`}
        >
          Yoga Guide
        </button>
      </div>

      {/* TAB 1: DAILY TRACKERS & WELLNESS SCORE */}
      {activeTab === 'trackers' && (
        <div className="space-y-6 animate-fadeIn">
          {/* Glassmorphic Wellness Score Circular Chart */}
          <section className="bg-gradient-to-br from-pink-50/60 via-rose-50/40 to-amber-50/40 border border-white rounded-[2.5rem] p-8 text-center relative overflow-hidden shadow-sm backdrop-blur-md">
            <div className="relative z-10 flex flex-col items-center space-y-4">
              <div className="space-y-1">
                <span className="text-[9px] font-black uppercase tracking-[0.2em] text-pink-400 block">Endocrine & Physical Vitality</span>
                <h3 className="text-2xl font-serif italic text-pink-600 font-bold">Your Wellness Score</h3>
              </div>

              {/* Dynamic Circular Indicator with Soft Shadow */}
              <div className="relative w-36 h-36 flex items-center justify-center">
                {/* SVG Progress Circle */}
                <svg className="w-full h-full transform -rotate-90">
                  <circle 
                    cx="72" cy="72" r="60" 
                    fill="none" stroke="rgba(244,114,182,0.1)" strokeWidth="10" 
                  />
                  <circle 
                    cx="72" cy="72" r="60" 
                    fill="none" stroke="url(#pinkOrangeGrad)" strokeWidth="10" 
                    strokeDasharray={2 * Math.PI * 60}
                    strokeDashoffset={2 * Math.PI * 60 * (1 - wellnessScore / 100)}
                    strokeLinecap="round"
                    className="transition-all duration-1000 ease-out"
                  />
                  <defs>
                    <linearGradient id="pinkOrangeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#f472b6" />
                      <stop offset="100%" stopColor="#fb923c" />
                    </linearGradient>
                  </defs>
                </svg>

                <div className="absolute inset-0 flex flex-col items-center justify-center space-y-0.5">
                  <span className="text-3xl font-serif italic text-pink-600 font-bold leading-none">{wellnessScore}</span>
                  <span className="text-[8px] font-black text-pink-400 uppercase tracking-widest">Glow Index</span>
                </div>
              </div>

              <p className="text-xs text-gray-500 font-serif italic leading-relaxed max-w-md">
                {wellnessScore >= 80 
                  ? "A celestial glow! Your endocrine rhythm is perfectly synced and nourished today." 
                  : wellnessScore >= 60 
                    ? "Glow in progress. Small daily comforts will help stabilize your physical sanctuary." 
                    : "Time for self-nurture. Give your temple sweet water, deep sleep, and comforting rest."
                }
              </p>
            </div>
          </section>

          {/* Fully Interactive Sliders and Selection Grid */}
          <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* 1. Sleep Tracker */}
            <div className="bg-white/75 backdrop-blur-md border border-pink-50 p-6 rounded-[2rem] shadow-sm space-y-4">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-pink-50 flex items-center justify-center text-pink-500 shadow-inner">
                    <Moon size={16} />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider">Divine Sleep</h4>
                    <p className="text-[9px] text-gray-400">Essential hormone stabilization</p>
                  </div>
                </div>
                <span className="text-sm font-serif italic font-bold text-pink-600">{sleepHours} hrs</span>
              </div>
              
              <div className="space-y-1 pt-1">
                <input 
                  type="range" min="4" max="11" step="0.1"
                  value={sleepHours}
                  onChange={(e) => setSleepHours(parseFloat(e.target.value))}
                  className="w-full accent-pink-400 cursor-pointer"
                />
                <div className="flex justify-between text-[8px] text-gray-400 uppercase font-bold">
                  <span>4 hrs</span>
                  <span>7-9 hrs (Optimal)</span>
                  <span>11 hrs</span>
                </div>
              </div>
            </div>

            {/* 2. Exercise Tracker */}
            <div className="bg-white/75 backdrop-blur-md border border-pink-50 p-6 rounded-[2rem] shadow-sm space-y-4">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-pink-50 flex items-center justify-center text-pink-500 shadow-inner">
                    <Dumbbell size={16} />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider">Exercise / Movement</h4>
                    <p className="text-[9px] text-gray-400">Cortisol release & circulation</p>
                  </div>
                </div>
                <span className="text-sm font-serif italic font-bold text-pink-600">{exerciseMinutes} mins</span>
              </div>
              
              <div className="space-y-1 pt-1">
                <input 
                  type="range" min="0" max="120" step="5"
                  value={exerciseMinutes}
                  onChange={(e) => setExerciseMinutes(parseInt(e.target.value))}
                  className="w-full accent-pink-400 cursor-pointer"
                />
                <div className="flex justify-between text-[8px] text-gray-400 uppercase font-bold">
                  <span>Rest</span>
                  <span>30 mins (Healthy)</span>
                  <span>120 mins</span>
                </div>
              </div>
            </div>

            {/* 3. Water Intake Slider */}
            <div className="bg-white/75 backdrop-blur-md border border-pink-50 p-6 rounded-[2rem] shadow-sm space-y-4">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-pink-50 flex items-center justify-center text-pink-500 shadow-inner">
                    <Droplet size={16} />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider">Hydration</h4>
                    <p className="text-[9px] text-gray-400">Optimal hydration levels</p>
                  </div>
                </div>
                <span className="text-sm font-serif italic font-bold text-pink-600">{waterIntake} of 8 glasses</span>
              </div>
              
              <div className="space-y-1 pt-1">
                <input 
                  type="range" min="0" max="8" step="1"
                  value={waterIntake}
                  onChange={(e) => setWaterIntake(parseInt(e.target.value))}
                  className="w-full accent-pink-400 cursor-pointer"
                />
                <div className="flex justify-between text-[8px] text-gray-400 uppercase font-bold">
                  <span>0 glasses</span>
                  <span>4 glasses</span>
                  <span>8 glasses</span>
                </div>
              </div>
            </div>

            {/* 4. Mindfulness Meditation */}
            <div className="bg-white/75 backdrop-blur-md border border-pink-50 p-6 rounded-[2rem] shadow-sm space-y-4">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-pink-50 flex items-center justify-center text-pink-500 shadow-inner">
                    <Compass size={16} />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider">Mindfulness / Calm</h4>
                    <p className="text-[9px] text-gray-400">Stress mitigation</p>
                  </div>
                </div>
                <span className="text-sm font-serif italic font-bold text-pink-600">{mindfulnessMinutes} mins</span>
              </div>
              
              <div className="space-y-1 pt-1">
                <input 
                  type="range" min="0" max="60" step="5"
                  value={mindfulnessMinutes}
                  onChange={(e) => setMindfulnessMinutes(parseInt(e.target.value))}
                  className="w-full accent-pink-400 cursor-pointer"
                />
                <div className="flex justify-between text-[8px] text-gray-400 uppercase font-bold">
                  <span>0 mins</span>
                  <span>15 mins (Zen)</span>
                  <span>60 mins</span>
                </div>
              </div>
            </div>

            {/* 5. Anti-Inflammatory Nutrition */}
            <div className="bg-white/75 backdrop-blur-md border border-pink-50 p-6 rounded-[2rem] shadow-sm md:col-span-2 space-y-4">
              <div className="flex justify-between items-center pb-2 border-b border-pink-50/50">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-pink-50 flex items-center justify-center text-pink-500 shadow-inner">
                    <Apple size={16} />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider">Nourishing Nutrition</h4>
                    <p className="text-[9px] text-gray-400">Eat anti-inflammatory meals</p>
                  </div>
                </div>
                <span className="text-xs font-serif italic text-pink-500 font-bold">{nutritionScore} Diet</span>
              </div>

              <div className="grid grid-cols-3 gap-3">
                {[
                  { value: 'Anti-inflammatory', label: '🌿 Anti-Inflam', desc: 'No processed sugar' },
                  { value: 'Balanced', label: '🥗 Balanced', desc: 'Healthy proteins & carbs' },
                  { value: 'Heavy Cravings', label: '🍫 Cravings Alert', desc: 'Slightly higher sugar' }
                ].map((nut) => (
                  <button
                    key={nut.value}
                    type="button"
                    onClick={() => setNutritionScore(nut.value)}
                    className={`p-3 rounded-2xl border text-center transition-all cursor-pointer ${
                      nutritionScore === nut.value
                        ? 'border-pink-400 bg-pink-50/20 text-pink-600 shadow-inner'
                        : 'border-gray-100 hover:border-pink-200 text-gray-500'
                    }`}
                  >
                    <p className="text-[10px] font-bold uppercase">{nut.label}</p>
                    <p className="text-[7.5px] opacity-70 font-sans mt-0.5 leading-tight">{nut.desc}</p>
                  </button>
                ))}
              </div>
            </div>
          </section>
        </div>
      )}

      {/* TAB 2: DIVINE SANCTUARY RITUALS (Supplements) */}
      {activeTab === 'rituals' && (
        <div className="space-y-8 animate-fadeIn">
          {/* AI Advisor Card */}
          <section className="bg-gradient-to-br from-pink-400 to-rose-400 p-8 rounded-[2.5rem] text-white shadow-xl relative overflow-hidden">
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
                    className="w-full py-3.5 bg-white text-pink-500 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-lg hover:scale-[1.01] transition-transform disabled:opacity-50 cursor-pointer"
                  >
                    {loading ? 'Consulting the Sanctuary...' : 'Get Wellness Plan'}
                  </button>
                </div>
              ) : (
                <div className="space-y-3 pt-2">
                  <p className="text-xs italic opacity-90">Log your symptoms in the Cycle tab to get a personalized ritual recommendation, darling!</p>
                  <button 
                    onClick={handleAskAI}
                    disabled={loading}
                    className="w-full py-3 bg-white/10 hover:bg-white/20 text-white rounded-2xl font-bold uppercase text-[9px] tracking-widest border border-white/20 transition-all cursor-pointer"
                  >
                    {loading ? 'Consulting the Sanctuary...' : 'Consult General Hormone Advice 🧠'}
                  </button>
                </div>
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
              <div key={supp.id} className="bg-white/75 backdrop-blur-md p-8 rounded-[2rem] border border-pink-50 hover:border-pink-200 transition-all group shadow-sm">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-14 h-14 bg-pink-50 rounded-2xl flex items-center justify-center text-3xl group-hover:scale-110 transition-transform shadow-inner">{supp.emoji}</div>
                  <div>
                    <h4 className="text-lg font-serif text-pink-600 italic leading-none font-bold">{supp.name}</h4>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {supp.bestFor.map(b => (
                        <span key={b} className="text-[8px] bg-pink-100/60 text-pink-500 px-2 py-0.5 rounded-full font-bold uppercase">{b.replace('_', ' ')}</span>
                      ))}
                    </div>
                  </div>
                </div>
                <p className="text-xs text-gray-500 italic leading-relaxed mb-4">{supp.description}</p>
                <div className="pt-4 border-t border-pink-50">
                  <span className="text-[9px] font-bold text-pink-300 uppercase tracking-widest block mb-1">Divine Dosage</span>
                  <p className="text-xs text-pink-600 font-serif italic">{supp.dosage}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: ENDOMETRIOSIS DEDICATED CARE SANCTUARY */}
      {activeTab === 'endo' && (
        <div className="space-y-6 animate-fadeIn">
          <EndometriosisCare user={user} setUser={setUser} />
        </div>
      )}

      {/* TAB 4: AI YOGA GUIDE */}
      {activeTab === 'yoga' && (
        <YogaTutorials 
          user={user} 
          setUser={setUser}
          todaysSymptoms={todaysSymptoms} 
        />
      )}
    </div>
  );
};

export default Wellness;
