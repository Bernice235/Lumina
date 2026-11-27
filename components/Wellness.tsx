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
    <div className="space-y-6 pb-12 text-stone-800 dark:text-stone-200">
      {/* Unboxed Editorial Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2 pb-1">
        <div>
          <h2 className="text-2xl sm:text-3xl font-serif text-stone-900 dark:text-stone-100 font-normal tracking-tight">Wellness</h2>
          <p className="text-xs sm:text-sm text-stone-500 dark:text-stone-400 mt-0.5">Track restorative habits, rituals, and cycle-aligned movement.</p>
        </div>
      </div>

      {/* Segmented Top Tab Navigation */}
      <div className="grid grid-cols-2 sm:grid-cols-4 bg-stone-100 dark:bg-[#23201d] p-1 rounded-xl border border-stone-200/80 dark:border-[#2e2a26] gap-1">
        <button 
          type="button"
          onClick={() => setActiveTab('trackers')}
          className={`py-2.5 px-3 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
            activeTab === 'trackers' 
              ? 'bg-white dark:bg-[#1a1816] text-pink-700 dark:text-pink-300 shadow-xs' 
              : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200'
          }`}
        >
          Score &amp; Trackers
        </button>
        <button 
          type="button"
          onClick={() => setActiveTab('rituals')}
          className={`py-2.5 px-3 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
            activeTab === 'rituals' 
              ? 'bg-white dark:bg-[#1a1816] text-pink-700 dark:text-pink-300 shadow-xs' 
              : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200'
          }`}
        >
          Supplement Rituals
        </button>
        <button 
          type="button"
          onClick={() => setActiveTab('endo')}
          className={`py-2.5 px-3 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
            activeTab === 'endo' 
              ? 'bg-white dark:bg-[#1a1816] text-indigo-700 dark:text-indigo-300 shadow-xs' 
              : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200'
          }`}
        >
          Endo Care
        </button>
        <button 
          type="button"
          onClick={() => setActiveTab('yoga')}
          className={`py-2.5 px-3 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
            activeTab === 'yoga' 
              ? 'bg-white dark:bg-[#1a1816] text-pink-700 dark:text-pink-300 shadow-xs' 
              : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200'
          }`}
        >
          Yoga Guide
        </button>
      </div>

      {/* TAB 1: DAILY TRACKERS & WELLNESS SCORE */}
      {activeTab === 'trackers' && (
        <div className="space-y-6">
          {/* Wellness Score Summary */}
          <section className="bg-white dark:bg-[#1a1816] border border-stone-200/80 dark:border-[#2e2a26] rounded-2xl p-6 sm:p-8 shadow-sm">
            <div className="flex flex-col sm:flex-row items-center gap-6 sm:gap-8">
              <div className="relative w-36 h-36 flex items-center justify-center shrink-0">
                <svg viewBox="0 0 144 144" className="w-full h-full transform -rotate-90">
                  <circle 
                    cx="72" cy="72" r="60" 
                    fill="none" stroke="currentColor" className="text-stone-100 dark:text-[#23201d]" strokeWidth="10" 
                  />
                  <circle 
                    cx="72" cy="72" r="60" 
                    fill="none" stroke="url(#pinkOrangeGrad)" strokeWidth="10" 
                    strokeDasharray={2 * Math.PI * 60}
                    strokeDashoffset={2 * Math.PI * 60 * (1 - wellnessScore / 100)}
                    strokeLinecap="round"
                    className="transition-all duration-700 ease-out"
                  />
                  <defs>
                    <linearGradient id="pinkOrangeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#db2777" />
                      <stop offset="100%" stopColor="#f59e0b" />
                    </linearGradient>
                  </defs>
                </svg>

                <div className="absolute inset-0 flex flex-col items-center justify-center space-y-0.5">
                  <span className="text-3xl font-serif text-stone-900 dark:text-stone-100 leading-none tabular-nums">{wellnessScore}</span>
                  <span className="text-[11px] font-medium text-stone-500 dark:text-stone-400">of 100</span>
                </div>
              </div>

              <div className="space-y-2 text-center sm:text-left">
                <span className="text-xs font-semibold text-pink-700 dark:text-pink-400 block">Daily Balance Score</span>
                <h3 className="text-2xl font-serif text-stone-900 dark:text-stone-100 font-normal">Your Wellness Overview</h3>
                <p className="text-sm text-stone-600 dark:text-stone-400 leading-relaxed max-w-lg">
                  {wellnessScore >= 80 
                    ? "Your sleep, hydration, and daily movement are well-aligned today." 
                    : wellnessScore >= 60 
                      ? "Steady progress. Small adjustments to rest or hydration will lift your balance." 
                      : "Prioritize restorative sleep, hydration, and gentle recovery today."
                  }
                </p>
              </div>
            </div>
          </section>

          {/* Interactive Sliders and Selection Grid */}
          <section className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* 1. Sleep Tracker */}
            <div className="bg-white dark:bg-[#1a1816] border border-stone-200/80 dark:border-[#2e2a26] p-6 rounded-2xl shadow-sm space-y-4">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-pink-50 dark:bg-pink-950/40 text-pink-600 dark:text-pink-400 border border-pink-100 dark:border-pink-900/40 flex items-center justify-center">
                    <Moon size={16} />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-stone-900 dark:text-stone-100">Restorative Sleep</h4>
                    <p className="text-xs text-stone-500 dark:text-stone-400">Hormone recovery target</p>
                  </div>
                </div>
                <span className="text-sm font-semibold text-pink-700 dark:text-pink-300 tabular-nums">{sleepHours} hrs</span>
              </div>
              
              <div className="space-y-1.5 pt-1">
                <input 
                  type="range" min="4" max="11" step="0.1"
                  value={sleepHours}
                  onChange={(e) => setSleepHours(parseFloat(e.target.value))}
                  aria-label="Restorative sleep hours"
                  className="w-full accent-pink-600 cursor-pointer"
                />
                <div className="flex justify-between text-[11px] text-stone-500 dark:text-stone-400 tabular-nums">
                  <span>4 hrs</span>
                  <span>7–9 hrs optimal</span>
                  <span>11 hrs</span>
                </div>
              </div>
            </div>

            {/* 2. Exercise Tracker */}
            <div className="bg-white dark:bg-[#1a1816] border border-stone-200/80 dark:border-[#2e2a26] p-6 rounded-2xl shadow-sm space-y-4">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-pink-50 dark:bg-pink-950/40 text-pink-600 dark:text-pink-400 border border-pink-100 dark:border-pink-900/40 flex items-center justify-center">
                    <Dumbbell size={16} />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-stone-900 dark:text-stone-100">Exercise &amp; Movement</h4>
                    <p className="text-xs text-stone-500 dark:text-stone-400">Circulation &amp; stress release</p>
                  </div>
                </div>
                <span className="text-sm font-semibold text-pink-700 dark:text-pink-300 tabular-nums">{exerciseMinutes} mins</span>
              </div>
              
              <div className="space-y-1.5 pt-1">
                <input 
                  type="range" min="0" max="120" step="5"
                  value={exerciseMinutes}
                  onChange={(e) => setExerciseMinutes(parseInt(e.target.value))}
                  aria-label="Exercise minutes"
                  className="w-full accent-pink-600 cursor-pointer"
                />
                <div className="flex justify-between text-[11px] text-stone-500 dark:text-stone-400 tabular-nums">
                  <span>Rest</span>
                  <span>30 mins target</span>
                  <span>120 mins</span>
                </div>
              </div>
            </div>

            {/* 3. Water Intake Slider */}
            <div className="bg-white dark:bg-[#1a1816] border border-stone-200/80 dark:border-[#2e2a26] p-6 rounded-2xl shadow-sm space-y-4">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400 border border-sky-100 dark:border-sky-900/40 flex items-center justify-center">
                    <Droplet size={16} />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-stone-900 dark:text-stone-100">Hydration</h4>
                    <p className="text-xs text-stone-500 dark:text-stone-400">Daily fluid intake</p>
                  </div>
                </div>
                <span className="text-sm font-semibold text-sky-700 dark:text-sky-300 tabular-nums">{waterIntake} / 8 glasses</span>
              </div>
              
              <div className="space-y-1.5 pt-1">
                <input 
                  type="range" min="0" max="8" step="1"
                  value={waterIntake}
                  onChange={(e) => setWaterIntake(parseInt(e.target.value))}
                  aria-label="Water intake glasses"
                  className="w-full accent-sky-600 cursor-pointer"
                />
                <div className="flex justify-between text-[11px] text-stone-500 dark:text-stone-400 tabular-nums">
                  <span>0 glasses</span>
                  <span>4 glasses</span>
                  <span>8 glasses</span>
                </div>
              </div>
            </div>

            {/* 4. Mindfulness Meditation */}
            <div className="bg-white dark:bg-[#1a1816] border border-stone-200/80 dark:border-[#2e2a26] p-6 rounded-2xl shadow-sm space-y-4">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-pink-50 dark:bg-pink-950/40 text-pink-600 dark:text-pink-400 border border-pink-100 dark:border-pink-900/40 flex items-center justify-center">
                    <Compass size={16} />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-stone-900 dark:text-stone-100">Mindfulness &amp; Calm</h4>
                    <p className="text-xs text-stone-500 dark:text-stone-400">Nervous system recovery</p>
                  </div>
                </div>
                <span className="text-sm font-semibold text-pink-700 dark:text-pink-300 tabular-nums">{mindfulnessMinutes} mins</span>
              </div>
              
              <div className="space-y-1.5 pt-1">
                <input 
                  type="range" min="0" max="60" step="5"
                  value={mindfulnessMinutes}
                  onChange={(e) => setMindfulnessMinutes(parseInt(e.target.value))}
                  aria-label="Mindfulness minutes"
                  className="w-full accent-pink-600 cursor-pointer"
                />
                <div className="flex justify-between text-[11px] text-stone-500 dark:text-stone-400 tabular-nums">
                  <span>0 mins</span>
                  <span>15 mins target</span>
                  <span>60 mins</span>
                </div>
              </div>
            </div>

            {/* 5. Anti-Inflammatory Nutrition */}
            <div className="bg-white dark:bg-[#1a1816] border border-stone-200/80 dark:border-[#2e2a26] p-6 rounded-2xl shadow-sm md:col-span-2 space-y-4">
              <div className="flex justify-between items-center pb-3 border-b border-stone-100 dark:border-[#2e2a26]">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/40 flex items-center justify-center">
                    <Apple size={16} />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-stone-900 dark:text-stone-100">Daily Nutrition</h4>
                    <p className="text-xs text-stone-500 dark:text-stone-400">Support hormone balance with whole foods</p>
                  </div>
                </div>
                <span className="text-xs font-semibold text-pink-700 dark:text-pink-300">{nutritionScore}</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  { value: 'Anti-inflammatory', label: 'Anti-Inflammatory', desc: 'Whole foods, low refined sugar' },
                  { value: 'Balanced', label: 'Balanced', desc: 'Steady protein and complex carbs' },
                  { value: 'Heavy Cravings', label: 'High Cravings', desc: 'Higher sugar or comfort foods' }
                ].map((nut) => (
                  <button
                    key={nut.value}
                    type="button"
                    onClick={() => setNutritionScore(nut.value)}
                    className={`p-3.5 rounded-xl border text-left transition-colors cursor-pointer ${
                      nutritionScore === nut.value
                        ? 'border-pink-500 bg-pink-50/70 dark:bg-pink-950/30 text-pink-900 dark:text-pink-200'
                        : 'border-stone-200 dark:border-[#2e2a26] bg-stone-50/50 dark:bg-[#23201d] hover:border-pink-300 text-stone-700 dark:text-stone-300'
                    }`}
                  >
                    <p className="text-xs font-semibold">{nut.label}</p>
                    <p className="text-[11px] opacity-75 mt-0.5 leading-snug">{nut.desc}</p>
                  </button>
                ))}
              </div>
            </div>
          </section>
        </div>
      )}

      {/* TAB 2: SUPPLEMENT RITUALS */}
      {activeTab === 'rituals' && (
        <div className="space-y-6">
          <section className="bg-gradient-to-br from-pink-600 to-rose-600 p-6 sm:p-8 rounded-2xl text-white shadow-sm space-y-4">
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 bg-white/15 rounded-xl flex items-center justify-center border border-white/25 shrink-0">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-xl font-serif text-white">Personalized Supplement Guidance</h3>
                <p className="text-xs text-pink-100">Tailored to your logged symptoms today</p>
              </div>
            </div>
            
            {todaysSymptoms.length > 0 ? (
              <div className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  {todaysSymptoms.map(s => (
                    <span key={s} className="bg-white/15 px-2.5 py-1 rounded-lg text-xs font-medium border border-white/20 capitalize">
                      {s.replace('_', ' ')}
                    </span>
                  ))}
                </div>
                <button 
                  type="button"
                  onClick={handleAskAI}
                  disabled={loading}
                  className="w-full h-11 bg-white text-pink-700 hover:bg-pink-50 rounded-xl font-semibold text-sm transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {loading ? 'Preparing recommendations...' : 'Generate Supplement Guidance'}
                </button>
              </div>
            ) : (
              <div className="space-y-3 pt-1">
                <p className="text-xs text-pink-100">Log your symptoms in the Calendar or Daily Log for tailored support, or request general cycle guidance.</p>
                <button 
                  type="button"
                  onClick={handleAskAI}
                  disabled={loading}
                  className="w-full h-11 bg-white/15 hover:bg-white/25 text-white rounded-xl font-semibold text-xs border border-white/25 transition-colors cursor-pointer"
                >
                  {loading ? 'Preparing recommendations...' : 'Get General Hormone Support Guidance'}
                </button>
              </div>
            )}

            {aiAdvice && (
              <div className="p-5 bg-white/15 rounded-xl border border-white/20">
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{aiAdvice}</p>
              </div>
            )}
          </section>

          {/* Supplement Library */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {SUPPLEMENTS.map(supp => (
              <div key={supp.id} className="bg-white dark:bg-[#1a1816] p-6 rounded-2xl border border-stone-200/80 dark:border-[#2e2a26] hover:border-pink-200 transition-colors shadow-sm flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-3.5 mb-3">
                    <div className="w-11 h-11 bg-pink-50 dark:bg-pink-950/40 rounded-xl border border-pink-100 dark:border-pink-900/40 flex items-center justify-center text-xl shrink-0">{supp.emoji}</div>
                    <div>
                      <h4 className="text-base font-serif text-stone-900 dark:text-stone-100 font-semibold leading-snug">{supp.name}</h4>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {supp.bestFor.map(b => (
                          <span key={b} className="text-[11px] bg-stone-100 dark:bg-[#23201d] text-stone-600 dark:text-stone-300 px-2 py-0.5 rounded-md font-medium capitalize">{b.replace('_', ' ')}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                  <p className="text-xs text-stone-600 dark:text-stone-400 leading-relaxed mb-4">{supp.description}</p>
                </div>
                <div className="pt-3 border-t border-stone-100 dark:border-[#2e2a26]">
                  <span className="text-xs font-semibold text-pink-700 dark:text-pink-400 block mb-0.5">Typical Guidance</span>
                  <p className="text-xs text-stone-700 dark:text-stone-300">{supp.dosage}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: ENDOMETRIOSIS DEDICATED CARE SANCTUARY */}
      {activeTab === 'endo' && (
        <div className="space-y-6">
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
