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
import { trackOpenSexEducationContent } from '../services/analyticsService';

const Education: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'products' | 'beginner' | 'hygiene' | 'cycle' | 'qa'>('products');
  const [selectedProduct, setSelectedProduct] = useState(0);
  const [concern, setConcern] = useState('');
  const [aiAdvice, setAiAdvice] = useState('');
  const [loadingAdvice, setLoadingAdvice] = useState(false);

  React.useEffect(() => {
    trackOpenSexEducationContent(`Education Tab: ${activeTab}`);
  }, [activeTab]);

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
    <div className="space-y-6 animate-fadeIn pb-24 font-sans">
      <header className="bg-white dark:bg-[#1a1816] p-6 rounded-2xl border border-stone-200/80 dark:border-[#2e2a26] shadow-xs">
        <h2 className="text-2xl sm:text-3xl font-serif font-semibold text-stone-900 dark:text-stone-100">Lumina Academy</h2>
        <p className="text-sm text-stone-500 dark:text-stone-400 mt-1">Evidence-based menstrual literacy, hygiene care, and cycle education</p>
      </header>

      {/* Navigation Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide sticky top-0 bg-[#faf8f6]/90 dark:bg-[#11100f]/90 backdrop-blur-md z-20 py-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl whitespace-nowrap shrink-0 transition-colors font-semibold text-xs cursor-pointer border ${
              activeTab === tab.id 
                ? 'bg-pink-600 text-white border-pink-600 shadow-xs' 
                : 'bg-white dark:bg-[#1a1816] text-stone-600 dark:text-stone-300 border-stone-200/80 dark:border-[#2e2a26] hover:border-pink-400'
            }`}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'products' && (
          <motion.div 
            key="products"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            className="space-y-6"
          >
            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
              {PRODUCT_TUTORIALS.map((t, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setSelectedProduct(i)}
                  className={`flex-1 min-w-[140px] p-4 rounded-2xl border transition-colors flex flex-col items-center gap-2 cursor-pointer ${
                    selectedProduct === i 
                      ? 'bg-pink-600 text-white border-pink-600 shadow-xs' 
                      : 'bg-white dark:bg-[#1a1816] text-stone-700 dark:text-stone-200 border-stone-200/80 dark:border-[#2e2a26] hover:border-pink-300'
                  }`}
                >
                  <span className="text-2xl">{t.icon}</span>
                  <div className="text-center">
                    <span className="text-xs font-semibold block mb-1">
                      {t.title.split(' ').pop()}
                    </span>
                    <span className={`text-[11px] font-medium px-2 py-0.5 rounded-lg ${selectedProduct === i ? 'bg-pink-500 text-white' : 'bg-stone-100 dark:bg-[#23201d] text-stone-500 dark:text-stone-400'}`}>
                      {t.difficulty}
                    </span>
                  </div>
                </button>
              ))}
            </div>

            <div className="bg-white dark:bg-[#1a1816] p-6 sm:p-8 rounded-2xl shadow-xs border border-stone-200/80 dark:border-[#2e2a26]">
              <div className="mb-8">
                <h3 className="text-2xl font-serif font-semibold text-stone-900 dark:text-stone-100 mb-1.5">{currentProduct.title}</h3>
                <p className="text-sm text-stone-600 dark:text-stone-400 mb-3">{currentProduct.description}</p>
                <span className="inline-block text-xs bg-pink-50 dark:bg-pink-950/40 text-pink-700 dark:text-pink-300 px-3 py-1 rounded-lg border border-pink-200/70 dark:border-pink-900/50 font-semibold">
                  Best for: {currentProduct.bestFor}
                </span>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <h4 className="text-xs font-semibold text-stone-500 dark:text-stone-400 tracking-wide flex items-center gap-2">
                    The Ritual
                  </h4>
                  <div className="space-y-4">
                    {currentProduct.steps.map((step, idx) => (
                      <div key={idx} className="flex gap-3.5 items-start group">
                        <div className="flex-shrink-0 w-7 h-7 rounded-lg bg-pink-50 dark:bg-pink-950/40 border border-pink-200/70 dark:border-pink-900/50 text-pink-600 dark:text-pink-400 flex items-center justify-center font-semibold text-xs tabular-nums">
                          {idx + 1}
                        </div>
                        <p className="text-stone-700 dark:text-stone-300 text-sm leading-relaxed pt-0.5">{step}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="p-5 bg-[#faf8f6] dark:bg-[#23201d] rounded-2xl border border-stone-200/80 dark:border-[#342f2b]">
                    <h4 className="text-xs font-semibold text-stone-700 dark:text-stone-200 mb-3">Pros &amp; Considerations</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">Pros</p>
                        {currentProduct.pros?.map((p, i) => (
                          <p key={i} className="text-xs text-stone-600 dark:text-stone-300 flex items-start gap-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0 mt-0.5" /> {p}
                          </p>
                        ))}
                      </div>
                      <div className="space-y-2">
                        <p className="text-xs font-semibold text-rose-600 dark:text-rose-400">Cons</p>
                        {currentProduct.cons?.map((c, i) => (
                          <p key={i} className="text-xs text-stone-600 dark:text-stone-300 flex items-start gap-1.5">
                            <AlertCircle className="w-3.5 h-3.5 text-rose-500 flex-shrink-0 mt-0.5" /> {c}
                          </p>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="p-5 bg-pink-600 rounded-2xl text-white">
                    <h4 className="text-xs font-semibold text-pink-100 mb-1.5">Confidence Note</h4>
                    <p className="font-serif text-base leading-relaxed">
                      &ldquo;{currentProduct.proTip}&rdquo;
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'beginner' && (
          <motion.div 
            key="beginner"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            className="space-y-6"
          >
            <div className="bg-white dark:bg-[#1a1816] p-6 sm:p-8 rounded-2xl border border-stone-200/80 dark:border-[#2e2a26] space-y-6">
              <section>
                <h3 className="text-2xl font-serif font-semibold text-stone-900 dark:text-stone-100 mb-3">What is a period?</h3>
                <p className="text-stone-600 dark:text-stone-300 text-sm sm:text-base leading-relaxed">
                  A period is your body&apos;s natural cycle of shedding the uterine lining each month when pregnancy does not occur. It is a normal, healthy vital sign indicating how your endocrine and reproductive systems are functioning.
                </p>
              </section>

              <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-5 bg-[#faf8f6] dark:bg-[#23201d] rounded-xl border border-stone-200/80 dark:border-[#342f2b]">
                  <h4 className="text-sm font-semibold text-pink-600 dark:text-pink-400 mb-3">How to track your cycle</h4>
                  <ul className="space-y-2.5">
                    <li className="flex items-start gap-2.5 text-sm text-stone-600 dark:text-stone-300">
                      <span className="text-pink-600 dark:text-pink-400 font-semibold tabular-nums">1.</span> Mark the first day of full bleeding as Cycle Day 1.
                    </li>
                    <li className="flex items-start gap-2.5 text-sm text-stone-600 dark:text-stone-300">
                      <span className="text-pink-600 dark:text-pink-400 font-semibold tabular-nums">2.</span> Note how long bleeding lasts (typically 3–7 days).
                    </li>
                    <li className="flex items-start gap-2.5 text-sm text-stone-600 dark:text-stone-300">
                      <span className="text-pink-600 dark:text-pink-400 font-semibold tabular-nums">3.</span> Count days until your next period begins to learn your baseline.
                    </li>
                  </ul>
                </div>
                <div className="p-5 bg-[#faf8f6] dark:bg-[#23201d] rounded-xl border border-stone-200/80 dark:border-[#342f2b]">
                  <h4 className="text-sm font-semibold text-pink-600 dark:text-pink-400 mb-3">What to expect</h4>
                  <ul className="space-y-2.5">
                    <li className="flex items-start gap-2.5 text-sm text-stone-600 dark:text-stone-300">
                      <CheckCircle2 className="w-4 h-4 text-pink-500 mt-0.5 shrink-0" /> Mild cramping, lower-back ache, or temporary bloating.
                    </li>
                    <li className="flex items-start gap-2.5 text-sm text-stone-600 dark:text-stone-300">
                      <CheckCircle2 className="w-4 h-4 text-pink-500 mt-0.5 shrink-0" /> Shifts in mood, sleep quality, or physical energy.
                    </li>
                    <li className="flex items-start gap-2.5 text-sm text-stone-600 dark:text-stone-300">
                      <CheckCircle2 className="w-4 h-4 text-pink-500 mt-0.5 shrink-0" /> Variations in color from bright red to dark brown.
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
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            className="space-y-6"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white dark:bg-[#1a1816] p-6 rounded-2xl border border-stone-200/80 dark:border-[#2e2a26] space-y-4">
                <div className="w-11 h-11 bg-pink-50 dark:bg-pink-950/40 rounded-xl flex items-center justify-center text-xl border border-pink-200/60 dark:border-pink-900/50">🧼</div>
                <h3 className="text-xl font-serif font-semibold text-stone-900 dark:text-stone-100">Daily Hygiene Rituals</h3>
                <ul className="space-y-3">
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="w-4 h-4 text-pink-600 dark:text-pink-400 mt-0.5 shrink-0" />
                    <p className="text-sm text-stone-600 dark:text-stone-300">Change pads every 4–6 hours, and tampons every 4–8 hours.</p>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="w-4 h-4 text-pink-600 dark:text-pink-400 mt-0.5 shrink-0" />
                    <p className="text-sm text-stone-600 dark:text-stone-300">Clean only the external vulva with warm water; avoid scented washes or internal douching.</p>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="w-4 h-4 text-pink-600 dark:text-pink-400 mt-0.5 shrink-0" />
                    <p className="text-sm text-stone-600 dark:text-stone-300">Always wipe from front to back to help prevent irritation or infection.</p>
                  </li>
                </ul>
              </div>

              <div className="bg-white dark:bg-[#1a1816] p-6 rounded-2xl border border-stone-200/80 dark:border-[#2e2a26] space-y-4">
                <div className="w-11 h-11 bg-rose-50 dark:bg-rose-950/40 rounded-xl flex items-center justify-center text-xl border border-rose-200/60 dark:border-rose-900/50">⚠️</div>
                <h3 className="text-xl font-serif font-semibold text-rose-700 dark:text-rose-400">Safety First</h3>
                <ul className="space-y-3">
                  <li className="flex items-start gap-3">
                    <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 mt-0.5 shrink-0" />
                    <p className="text-sm text-stone-600 dark:text-stone-300">Never leave a tampon inserted for longer than 8 hours (reduces TSS risk).</p>
                  </li>
                  <li className="flex items-start gap-3">
                    <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 mt-0.5 shrink-0" />
                    <p className="text-sm text-stone-600 dark:text-stone-300">Remove a tampon immediately and seek urgent medical care if you develop sudden fever, rash, or dizziness.</p>
                  </li>
                  <li className="flex items-start gap-3">
                    <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 mt-0.5 shrink-0" />
                    <p className="text-sm text-stone-600 dark:text-stone-300">Dispose of pads and tampons in waste bins rather than flushing them.</p>
                  </li>
                </ul>
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'cycle' && (
          <motion.div 
            key="cycle"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            className="space-y-6"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {CYCLE_PHASES.map((phase) => (
                <div key={phase.id} className="bg-white dark:bg-[#1a1816] p-6 rounded-2xl border border-stone-200/80 dark:border-[#2e2a26] shadow-xs">
                  <div className="flex justify-between items-start mb-3">
                    <span className="text-3xl">{phase.emoji}</span>
                    <span className="text-xs font-medium text-stone-500 dark:text-stone-400 tabular-nums">{phase.duration}</span>
                  </div>
                  <h3 className="text-xl font-serif font-semibold text-stone-900 dark:text-stone-100 mb-1.5">{phase.name}</h3>
                  <p className="text-sm text-stone-600 dark:text-stone-400 leading-relaxed mb-4">{phase.description}</p>
                  <div className="space-y-1.5">
                    <p className="text-xs font-semibold text-stone-700 dark:text-stone-300">Common symptoms:</p>
                    <p className="text-xs text-stone-500 dark:text-stone-400">
                      {phase.symptoms.join(' · ')}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-rose-50 dark:bg-rose-950/30 p-6 rounded-2xl border border-rose-200/80 dark:border-rose-900/50">
              <h3 className="text-lg font-serif font-semibold text-rose-800 dark:text-rose-200 mb-3 flex items-center gap-2">
                <Info className="w-4 h-4" /> When to consult a clinician
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-stone-700 dark:text-stone-300">
                <div className="flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 mt-0.5 shrink-0" />
                  <p>Soaking through a pad or tampon every hour for consecutive hours.</p>
                </div>
                <div className="flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 mt-0.5 shrink-0" />
                  <p>Severe pelvic pain that interferes with routine daily activities.</p>
                </div>
                <div className="flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 mt-0.5 shrink-0" />
                  <p>Periods lasting longer than 10 days consistently.</p>
                </div>
                <div className="flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 mt-0.5 shrink-0" />
                  <p>Missed periods for 3 or more months without pregnancy.</p>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'qa' && (
          <motion.div 
            key="qa"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            className="space-y-6"
          >
            <section className="bg-white dark:bg-[#1a1816] p-6 sm:p-8 rounded-2xl shadow-xs border border-stone-200/80 dark:border-[#2e2a26] space-y-5">
              <div className="flex items-center gap-3.5">
                <div className="w-11 h-11 bg-pink-50 dark:bg-pink-950/40 rounded-xl flex items-center justify-center text-pink-600 dark:text-pink-400 border border-pink-200/70 dark:border-pink-900/50">
                  <MessageCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xl font-serif font-semibold text-stone-900 dark:text-stone-100">Lumina Wellness Q&amp;A</h3>
                  <p className="text-xs text-stone-500 dark:text-stone-400">Private educational guidance on your cycle and reproductive care</p>
                </div>
              </div>

              <div className="space-y-4 max-h-[380px] overflow-y-auto p-4 bg-[#faf8f6] dark:bg-[#23201d] rounded-xl border border-stone-200/80 dark:border-[#342f2b]">
                <div className="flex justify-start">
                  <div className="max-w-[85%] bg-white dark:bg-[#1a1816] p-4 rounded-xl rounded-tl-none border border-stone-200/80 dark:border-[#2e2a26]">
                    <p className="text-sm text-stone-700 dark:text-stone-200 leading-relaxed">
                      Hello! Ask me any educational question about cycle phases, menstrual products, or wellness habits.
                    </p>
                  </div>
                </div>

                {aiAdvice && !loadingAdvice && (
                  <>
                    <div className="flex justify-end">
                      <div className="max-w-[85%] bg-pink-600 p-3.5 rounded-xl rounded-tr-none text-white">
                        <p className="text-sm leading-relaxed">{concern}</p>
                      </div>
                    </div>
                    <div className="flex justify-start">
                      <div className="max-w-[85%] bg-white dark:bg-[#1a1816] p-4 rounded-xl rounded-tl-none border border-stone-200/80 dark:border-[#2e2a26]">
                        <p className="text-sm text-stone-700 dark:text-stone-200 leading-relaxed whitespace-pre-wrap">
                          {aiAdvice}
                        </p>
                        <div className="mt-3 pt-2.5 border-t border-stone-100 dark:border-[#2e2a26] flex items-center gap-1.5 text-stone-400">
                          <Info className="w-3 h-3 shrink-0" />
                          <p className="text-[11px]">Educational guidance only — consult a clinician for medical concerns.</p>
                        </div>
                      </div>
                    </div>
                  </>
                )}

                {loadingAdvice && (
                  <div className="flex justify-start">
                    <div className="bg-white dark:bg-[#1a1816] px-4 py-3 rounded-xl rounded-tl-none border border-stone-200/80 dark:border-[#2e2a26] text-xs text-stone-500 dark:text-stone-400">
                      Thinking...
                    </div>
                  </div>
                )}
              </div>

              <div className="flex flex-wrap gap-2">
                {[
                  "What is ovulation?",
                  "How to track my cycle?",
                  "Is brown discharge normal?",
                  "Tips for period cramps"
                ].map((q, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => {
                      setConcern(q);
                      const ask = async () => {
                        setLoadingAdvice(true);
                        const advice = await getLuminaAdvice(q);
                        setAiAdvice(advice);
                        setLoadingAdvice(false);
                      };
                      ask();
                    }}
                    className="px-3.5 py-2 bg-[#faf8f6] dark:bg-[#23201d] text-stone-700 dark:text-stone-300 border border-stone-200/80 dark:border-[#342f2b] rounded-xl text-xs font-medium hover:border-pink-400 transition-colors cursor-pointer"
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
                  onKeyDown={(e) => e.key === 'Enter' && handleAskLumina()}
                  placeholder="Ask a question..."
                  className="flex-1 h-11 bg-[#faf8f6] dark:bg-[#23201d] border border-stone-200/80 dark:border-[#342f2b] px-4 rounded-xl outline-none focus:border-pink-500 text-stone-900 dark:text-stone-100 text-sm transition-colors"
                />
                <button 
                  type="button"
                  onClick={handleAskLumina}
                  disabled={loadingAdvice || !concern.trim()}
                  className="bg-pink-600 hover:bg-pink-700 text-white h-11 px-4 rounded-xl flex items-center justify-center transition-colors disabled:opacity-50 cursor-pointer shrink-0"
                  aria-label="Send question"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </section>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               <div className="p-6 bg-white dark:bg-[#1a1816] rounded-2xl border border-stone-200/80 dark:border-[#2e2a26]">
                  <h4 className="font-serif font-semibold text-stone-900 dark:text-stone-100 text-base mb-2">Hygiene Myths</h4>
                  <p className="text-sm text-stone-600 dark:text-stone-300 leading-relaxed">
                    <strong>Myth:</strong> You cannot urinate with a tampon in.<br />
                    <strong>Fact:</strong> Urine exits the urethra, while a tampon sits inside the vaginal canal—two separate openings.
                  </p>
               </div>
               <div className="p-6 bg-white dark:bg-[#1a1816] rounded-2xl border border-stone-200/80 dark:border-[#2e2a26]">
                  <h4 className="font-serif font-semibold text-stone-900 dark:text-stone-100 text-base mb-2">Flow Volume Facts</h4>
                  <p className="text-sm text-stone-600 dark:text-stone-300 leading-relaxed">
                    <strong>Myth:</strong> A visible bleed means excessive blood loss.<br />
                    <strong>Fact:</strong> Most cycles total around 30–45 ml (2–3 tablespoons) of blood mixed with cervical fluid.
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
