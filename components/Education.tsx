import React, { useState } from 'react';
import { PRODUCT_TUTORIALS, CYCLE_PHASES } from '../constants';
import { getProductAdvice, getLuminaAdvice } from '../services/gemini';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  BookOpen, 
  Sparkles, 
  ShieldCheck, 
  RefreshCw, 
  MessageCircle, 
  ChevronRight,
  AlertCircle,
  CheckCircle2,
  Info,
  Heart
} from 'lucide-react';

const Education: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'products' | 'beginner' | 'hygiene' | 'cycle' | 'qa'>('products');
  const [selectedProduct, setSelectedProduct] = useState(0);
  const [concern, setConcern] = useState('');
  const [aiAdvice, setAiAdvice] = useState('');
  const [loadingAdvice, setLoadingAdvice] = useState(false);

  const currentProduct = PRODUCT_TUTORIALS[selectedProduct];

  const handleAskLumina = async () => {
    if (!concern.trim()) return;
    setLoadingAdvice(true);
    let advice = '';
    if (activeTab === 'products') {
      advice = await getProductAdvice(currentProduct?.title || 'General', concern);
    } else {
      advice = await getLuminaAdvice(concern);
    }
    setAiAdvice(advice);
    setLoadingAdvice(false);
  };

  const tabs = [
    { id: 'products', label: 'Products', icon: <Sparkles className="w-4 h-4" /> },
    { id: 'beginner', label: 'Beginner', icon: <BookOpen className="w-4 h-4" /> },
    { id: 'hygiene', label: 'Hygiene', icon: <ShieldCheck className="w-4 h-4" /> },
    { id: 'cycle', label: 'Cycle', icon: <RefreshCw className="w-4 h-4" /> },
    { id: 'qa', label: 'AI Bot', icon: <MessageCircle className="w-4 h-4" /> },
  ];

  return (
    <div className="space-y-8 animate-fadeIn pb-24">
      <header className="text-center pt-4">
        <h2 className="text-4xl font-serif text-pink-500 italic mb-2">Lumina Academy</h2>
        <p className="text-sm text-pink-300 italic">Empowering you with knowledge & confidence</p>
      </header>

      {/* Navigation Tabs */}
      <div className="flex gap-2.5 overflow-x-auto pb-3 scrollbar-hide sticky top-0 bg-[#fffafb]/85 backdrop-blur-md z-20 py-2 px-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 px-5 py-3 rounded-full whitespace-nowrap transition-all duration-300 font-bold text-[10px] uppercase tracking-widest cursor-pointer ${
              activeTab === tab.id 
                ? 'bg-gradient-to-br from-pink-400 to-rose-400 text-white shadow-[inset_0_2px_4px_rgba(255,255,255,0.4),_inset_0_-2px_4px_rgba(0,0,0,0.15),_0_6px_15px_rgba(244,114,182,0.25)] scale-[1.02]' 
                : 'bg-white/80 backdrop-blur-sm text-pink-300 border border-pink-100/50 hover:border-pink-300 shadow-sm'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'products' && (
          <motion.div 
            key="products"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-8"
          >
            <div className="flex gap-3 overflow-x-auto pb-4 scrollbar-hide">
              {PRODUCT_TUTORIALS.map((t, i) => (
                <button
                  key={i}
                  onClick={() => setSelectedProduct(i)}
                  className={`flex-1 min-w-[140px] p-6 rounded-[2.5rem] border-2 transition-all flex flex-col items-center gap-3 ${
                    selectedProduct === i 
                      ? 'bg-pink-500 text-white border-pink-400 shadow-xl scale-105' 
                      : 'bg-white text-pink-300 border-pink-50 hover:border-pink-200'
                  }`}
                >
                  <span className="text-3xl">{t.icon}</span>
                  <div className="text-center">
                    <span className="text-[10px] font-bold uppercase tracking-widest block mb-1">
                      {t.title.split(' ').pop()}
                    </span>
                    <span className={`text-[8px] font-medium uppercase px-2 py-0.5 rounded-full ${selectedProduct === i ? 'bg-pink-400' : 'bg-pink-50'}`}>
                      {t.difficulty}
                    </span>
                  </div>
                </button>
              ))}
            </div>

            <div className="bg-white p-8 md:p-12 rounded-[3.5rem] shadow-sm border border-pink-50 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-8 opacity-5">
                 <span className="text-[12rem]">{currentProduct.icon}</span>
              </div>

              <div className="relative z-10">
                <div className="mb-10">
                  <h3 className="text-3xl font-serif text-pink-600 italic mb-2">{currentProduct.title}</h3>
                  <p className="text-gray-500 italic mb-4">{currentProduct.description}</p>
                  <div className="flex flex-wrap gap-2">
                     <span className="text-[10px] bg-pink-50 text-pink-400 px-3 py-1 rounded-full font-bold uppercase">Best for: {currentProduct.bestFor}</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                  <div className="space-y-8">
                    <div>
                      <h4 className="text-xs font-bold text-pink-300 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                        <span className="w-8 h-[1px] bg-pink-100"></span>
                        The Ritual
                      </h4>
                      <div className="space-y-6">
                        {currentProduct.steps.map((step, idx) => (
                          <div key={idx} className="flex gap-5 items-start group">
                            <div className="flex-shrink-0 w-7 h-7 rounded-full bg-pink-50 text-pink-400 flex items-center justify-center font-bold text-[10px] group-hover:bg-pink-500 group-hover:text-white transition-all shadow-sm">
                              {idx + 1}
                            </div>
                            <p className="text-gray-600 text-base font-serif italic leading-relaxed pt-0.5">{step}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="p-6 bg-pink-50/30 rounded-[2rem] border border-pink-50/50">
                      <h4 className="text-[10px] font-bold text-pink-400 uppercase tracking-widest mb-3">Pros & Cons</h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <p className="text-[9px] font-bold text-green-400 uppercase">Pros</p>
                          {currentProduct.pros?.map((p, i) => (
                            <p key={i} className="text-[11px] text-gray-500 italic flex items-start gap-1">
                              <CheckCircle2 className="w-3 h-3 text-green-300 flex-shrink-0 mt-0.5" /> {p}
                            </p>
                          ))}
                        </div>
                        <div className="space-y-2">
                          <p className="text-[9px] font-bold text-rose-400 uppercase">Cons</p>
                          {currentProduct.cons?.map((c, i) => (
                            <p key={i} className="text-[11px] text-gray-500 italic flex items-start gap-1">
                              <AlertCircle className="w-3 h-3 text-rose-300 flex-shrink-0 mt-0.5" /> {c}
                            </p>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="p-6 bg-gradient-to-br from-rose-500 to-pink-400 rounded-[2rem] text-white shadow-lg shadow-pink-100">
                      <h4 className="text-[10px] font-bold uppercase tracking-widest opacity-80 mb-2">Confidence Boost</h4>
                      <p className="font-serif italic text-lg leading-relaxed">
                        "{currentProduct.proTip}"
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'beginner' && (
          <motion.div 
            key="beginner"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            <div className="bg-white p-8 rounded-[3rem] border border-pink-50 space-y-8">
              <section>
                <h3 className="text-2xl font-serif text-pink-600 italic mb-4">What is a period?</h3>
                <p className="text-gray-600 font-serif italic leading-relaxed">
                  A period is your body's way of releasing tissue that it no longer needs. Every month, your body prepares for a possible pregnancy. If that doesn't happen, the lining of the uterus sheds, and that's what we call a period! It's a natural, healthy sign that your body is growing and working exactly as it should.
                </p>
              </section>

              <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-6 bg-pink-50/50 rounded-[2rem] border border-pink-100">
                  <h4 className="text-sm font-bold text-pink-500 uppercase tracking-widest mb-3">How to track your cycle</h4>
                  <ul className="space-y-3">
                    <li className="flex items-start gap-3 text-sm text-gray-600 italic">
                      <span className="text-pink-400">1.</span> Mark the first day of bleeding as Day 1.
                    </li>
                    <li className="flex items-start gap-3 text-sm text-gray-600 italic">
                      <span className="text-pink-400">2.</span> Note how long the bleeding lasts (usually 3-7 days).
                    </li>
                    <li className="flex items-start gap-3 text-sm text-gray-600 italic">
                      <span className="text-pink-400">3.</span> Count the days until your next period starts.
                    </li>
                  </ul>
                </div>
                <div className="p-6 bg-pink-50/50 rounded-[2rem] border border-pink-100">
                  <h4 className="text-sm font-bold text-pink-500 uppercase tracking-widest mb-3">What to expect</h4>
                  <ul className="space-y-3">
                    <li className="flex items-start gap-3 text-sm text-gray-600 italic">
                      <span className="text-pink-400">🌸</span> Mild cramps or bloating.
                    </li>
                    <li className="flex items-start gap-3 text-sm text-gray-600 italic">
                      <span className="text-pink-400">🌸</span> Changes in mood or energy.
                    </li>
                    <li className="flex items-start gap-3 text-sm text-gray-600 italic">
                      <span className="text-pink-400">🌸</span> Different flow colors (red, brown, pink).
                    </li>
                  </ul>
                </div>
              </section>
            </div>
          </motion.div>
        )}

        {activeTab === 'hygiene' && (
          <motion.div 
            key="hygiene"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white p-8 rounded-[3rem] border border-pink-50 space-y-4">
                <div className="w-12 h-12 bg-pink-100 rounded-full flex items-center justify-center text-2xl">🧼</div>
                <h3 className="text-xl font-serif text-pink-600 italic">Freshness Rituals</h3>
                <ul className="space-y-4">
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-pink-400 mt-1" />
                    <p className="text-sm text-gray-600 italic">Change pads every 4-6 hours, and tampons every 4-8 hours.</p>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-pink-400 mt-1" />
                    <p className="text-sm text-gray-600 italic">Wash the external area (vulva) with warm water only. Avoid harsh soaps inside!</p>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-pink-400 mt-1" />
                    <p className="text-sm text-gray-600 italic">Always wipe from front to back to prevent infections.</p>
                  </li>
                </ul>
              </div>

              <div className="bg-white p-8 rounded-[3rem] border border-pink-50 space-y-4">
                <div className="w-12 h-12 bg-rose-100 rounded-full flex items-center justify-center text-2xl">⚠️</div>
                <h3 className="text-xl font-serif text-rose-600 italic">Safety First</h3>
                <ul className="space-y-4">
                  <li className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-rose-400 mt-1" />
                    <p className="text-sm text-gray-600 italic">Never leave a tampon in for more than 8 hours (risk of TSS).</p>
                  </li>
                  <li className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-rose-400 mt-1" />
                    <p className="text-sm text-gray-600 italic">If you have a sudden high fever, rash, or vomiting while using a tampon, remove it and see a doctor.</p>
                  </li>
                  <li className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-rose-400 mt-1" />
                    <p className="text-sm text-gray-600 italic">Wrap used products in paper and bin them. Flushing causes major plumbing issues!</p>
                  </li>
                </ul>
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'cycle' && (
          <motion.div 
            key="cycle"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-8"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {CYCLE_PHASES.map((phase) => (
                <div key={phase.id} className="bg-white p-8 rounded-[3rem] border border-pink-50 hover:shadow-md transition-all">
                  <div className="flex justify-between items-start mb-4">
                    <span className="text-4xl">{phase.emoji}</span>
                    <span className="text-[10px] font-bold text-pink-300 uppercase tracking-widest">{phase.duration}</span>
                  </div>
                  <h3 className="text-xl font-serif text-pink-600 italic mb-2">{phase.name}</h3>
                  <p className="text-sm text-gray-500 italic leading-relaxed mb-4">{phase.description}</p>
                  <div className="space-y-2">
                    <p className="text-[10px] font-bold text-pink-400 uppercase">Common Symptoms:</p>
                    <div className="flex flex-wrap gap-2">
                      {phase.symptoms.map((s, i) => (
                        <span key={i} className="text-[10px] bg-pink-50 text-pink-500 px-2 py-1 rounded-full italic">{s}</span>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-rose-50 p-8 rounded-[3rem] border border-rose-100">
              <h3 className="text-xl font-serif text-rose-600 italic mb-4 flex items-center gap-2">
                <Info className="w-5 h-5" /> When to see a doctor
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 rounded-full bg-rose-400 mt-2 flex-shrink-0" />
                  <p className="text-sm text-gray-600 italic">Extremely heavy bleeding (soaking a pad every hour).</p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 rounded-full bg-rose-400 mt-2 flex-shrink-0" />
                  <p className="text-sm text-gray-600 italic">Severe pain that prevents you from daily activities.</p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 rounded-full bg-rose-400 mt-2 flex-shrink-0" />
                  <p className="text-sm text-gray-600 italic">Periods that last longer than 10 days.</p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 rounded-full bg-rose-400 mt-2 flex-shrink-0" />
                  <p className="text-sm text-gray-600 italic">Irregular cycles or missed periods for over 3 months.</p>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'qa' && (
          <motion.div 
            key="qa"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-8"
          >
            <section className="bg-white p-10 rounded-[3.5rem] shadow-sm border border-pink-50 space-y-6">
              <div className="flex items-center gap-4 mb-2">
                <div className="w-12 h-12 bg-pink-100 rounded-full flex items-center justify-center text-2xl shadow-inner animate-pulse">🤖</div>
                <div>
                  <h3 className="text-2xl font-serif text-pink-600 italic">Lumina AI Bot</h3>
                  <p className="text-xs text-pink-300 font-bold uppercase tracking-widest">Your personal feminine health companion</p>
                </div>
              </div>

              <div className="space-y-4 max-h-[400px] overflow-y-auto p-4 bg-pink-50/20 rounded-[2rem] border border-pink-50/50 scrollbar-hide">
                {/* Initial Bot Message */}
                <div className="flex justify-start">
                  <div className="max-w-[85%] bg-white p-4 rounded-2xl rounded-tl-none shadow-sm border border-pink-50">
                    <p className="text-sm text-gray-700 font-serif italic">"Hello beautiful! I'm Lumina, your AI companion. You can ask me anything about your body, cycle, or feminine health. How can I help you today?"</p>
                  </div>
                </div>

                {/* User Message (if any) */}
                {aiAdvice && !loadingAdvice && (
                  <>
                    <div className="flex justify-end">
                      <div className="max-w-[85%] bg-pink-500 p-4 rounded-2xl rounded-tr-none shadow-lg shadow-pink-100">
                        <p className="text-sm text-white font-serif italic">"{concern}"</p>
                      </div>
                    </div>
                    <div className="flex justify-start">
                      <div className="max-w-[85%] bg-white p-6 rounded-2xl rounded-tl-none shadow-sm border border-pink-50">
                        <p className="text-sm text-gray-700 font-serif italic leading-relaxed whitespace-pre-wrap">
                          {aiAdvice}
                        </p>
                        <div className="mt-4 pt-4 border-t border-pink-50 flex items-center gap-2 opacity-50">
                          <Info className="w-3 h-3 text-pink-300" />
                          <p className="text-[8px] text-pink-300 italic">Always consult a doctor for medical concerns.</p>
                        </div>
                      </div>
                    </div>
                  </>
                )}

                {loadingAdvice && (
                  <div className="flex justify-start">
                    <div className="bg-white p-4 rounded-2xl rounded-tl-none shadow-sm border border-pink-50 flex items-center gap-2">
                      <div className="w-2 h-2 bg-pink-200 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-pink-300 rounded-full animate-bounce [animation-delay:0.2s]"></div>
                      <div className="w-2 h-2 bg-pink-400 rounded-full animate-bounce [animation-delay:0.4s]"></div>
                    </div>
                  </div>
                )}
              </div>

              {/* Quick Questions */}
              <div className="flex flex-wrap gap-2">
                {[
                  "What is ovulation?",
                  "How to track my cycle?",
                  "Is brown discharge normal?",
                  "Tips for period cramps"
                ].map((q, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      setConcern(q);
                      // Trigger advice automatically for quick questions
                      const ask = async () => {
                        setLoadingAdvice(true);
                        const advice = await getLuminaAdvice(q);
                        setAiAdvice(advice);
                        setLoadingAdvice(false);
                      };
                      ask();
                    }}
                    className="px-4 py-2 bg-pink-50 text-pink-400 rounded-full text-[10px] font-bold uppercase tracking-wider hover:bg-pink-100 transition-all border border-pink-100"
                  >
                    {q}
                  </button>
                ))}
              </div>

              <div className="flex gap-2">
                <input 
                  type="text"
                  value={concern}
                  onChange={(e) => setConcern(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleAskLumina()}
                  placeholder="Ask me anything..."
                  className="flex-1 bg-pink-50/30 px-6 py-4 rounded-full outline-none focus:ring-2 focus:ring-pink-100 text-gray-700 font-serif italic text-lg border border-transparent focus:border-pink-100 transition-all"
                />
                <button 
                  onClick={handleAskLumina}
                  disabled={loadingAdvice || !concern.trim()}
                  className="bg-pink-500 text-white w-14 h-14 rounded-full flex items-center justify-center shadow-lg shadow-pink-100 hover:bg-pink-600 transition-all disabled:opacity-50"
                >
                  <ChevronRight className="w-6 h-6" />
                </button>
              </div>
            </section>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               <div className="p-8 bg-white rounded-[2.5rem] border border-pink-100">
                  <h4 className="font-serif text-pink-600 text-xl mb-4 italic">🦷 Hygiene Myths</h4>
                  <p className="text-sm text-pink-400 leading-relaxed italic">
                    "Myth: You can't pee with a tampon in. <br/>
                    Fact: Your body has two separate openings! The tampon goes into the vagina, and urine comes from the urethra. No need to remove it!"
                  </p>
               </div>
               <div className="p-8 bg-white rounded-[2.5rem] border border-pink-100">
                  <h4 className="font-serif text-pink-600 text-xl mb-4 italic">🌊 Flow Facts</h4>
                  <p className="text-sm text-pink-400 leading-relaxed italic">
                    "Myth: I'm losing too much blood! <br/>
                    Fact: It might look like a lot, but most women lose only 2-3 tablespoons (30-45ml) during their entire period. You're okay, darling!"
                  </p>
               </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Education;
