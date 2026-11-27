import React, { useState } from 'react';
import { User, EndoPainLog, EndoMentalLog, EndoSpecialistQuestion } from '../types';
import { 
  Heart, 
  Activity, 
  Sparkles, 
  Smile, 
  Moon, 
  Compass, 
  Plus, 
  Trash2, 
  CheckCircle2, 
  Circle, 
  FileText, 
  Printer, 
  BookOpen, 
  Flame, 
  ChevronRight, 
  ChevronDown, 
  AlertCircle, 
  Droplet, 
  Wind, 
  ShieldCheck,
  Calendar,
  Layers,
  HelpCircle,
  Clock,
  MapPin,
  Zap,
  Target
} from 'lucide-react';
import { trackOpenWellnessContent } from '../services/analyticsService';
import { syncUser } from '../services/firebaseService';
import { saveEncryptedSessionUser } from '../services/secureStorage';

interface EndometriosisCareProps {
  user: User;
  setUser: (u: User) => void;
}

const DEFAULT_SPECIALIST_QUESTIONS: { id: string; category: string; question: string }[] = [
  {
    id: 'q_diag_1',
    category: 'Diagnostics & Imaging',
    question: 'Can we schedule a specialized Pelvic Ultrasound or 3T Pelvic MRI with an endometriosis-specific protocol?'
  },
  {
    id: 'q_diag_2',
    category: 'Diagnostics & Imaging',
    question: 'Are my ovaries, bowel, and uterosacral ligaments showing any signs of deep infiltrating endometriosis (DIE) or adhesions?'
  },
  {
    id: 'q_surg_1',
    category: 'Surgical & Excision Options',
    question: 'Do you perform laparoscopic excision (cutting out lesions at the root) rather than superficial ablation (burning)?'
  },
  {
    id: 'q_surg_2',
    category: 'Surgical & Excision Options',
    question: 'If bowel, bladder, or diaphragmatic lesions are found during surgery, do you have a multidisciplinary surgical team available?'
  },
  {
    id: 'q_pain_1',
    category: 'Pain & Medical Management',
    question: 'What non-opioid or nerve-modulating therapies can help calm central sensitization and pelvic nerve burning?'
  },
  {
    id: 'q_pain_2',
    category: 'Pain & Medical Management',
    question: 'Can we explore targeted hormonal therapies (e.g. bio-identical micronized progesterone or continuous progestins) tailored to my goals?'
  },
  {
    id: 'q_pt_1',
    category: 'Pelvic Physical Therapy',
    question: 'Can you provide a referral for Pelvic Floor Physical Therapy to evaluate hypertonic pelvic guarding and muscle spasms?'
  },
  {
    id: 'q_fert_1',
    category: 'Fertility & Family Planning',
    question: 'How is my endometriosis currently affecting my ovarian reserve (AMH / Antral Follicle Count) and egg quality?'
  },
  {
    id: 'q_fert_2',
    category: 'Fertility & Family Planning',
    question: 'Should we perform a hysterosalpingography (HSG) to verify fallopian tube patency before conceiving?'
  }
];

const PAIN_LOCATIONS = [
  'Lower Abdomen (Central)',
  'Left Pelvic / Ovary',
  'Right Pelvic / Ovary',
  'Deep Pelvic Floor',
  'Lower Lumbar & Sacrum',
  'Hips & Gluteal Muscle',
  'Radiating Thighs / Legs',
  'Bowel / Rectum Area',
  'Bladder / Urethral Area',
  'Upper Abdomen / Diaphragm'
];

const PAIN_TRIGGERS = [
  'Menstrual Period Onset',
  'Ovulation Window',
  'High Psychological Stress',
  'Sexual Intercourse (Deep/Post)',
  'Cold Weather / Temperature Drops',
  'High-Sugar / Gluten / Dairy Food',
  'Physical Over-exertion',
  'Poor Sleep / Exhaustion',
  'Bowel Movement / Digestion'
];

const PAIN_CHARACTERISTICS = [
  'Sharp & Stabbing',
  'Deep Burning Pelvic Heat',
  'Dull Heavy Aching',
  'Spasmodic Cramping',
  'Dragging Pressure',
  'Shooting Sciatic Nerve Pain',
  'Throbbing Inflammation'
];

const STRETCHES = [
  {
    name: 'Supported Reclined Butterfly (Supta Baddha Konasana)',
    duration: '5 - 10 mins',
    benefit: 'Opens pelvic fascia and relaxes tight groin without abdominal pull.',
    instructions: 'Place a bolster or folded blankets under your spine and pillows under both knees. Lie back, bring soles of feet together, and let arms rest wide with palms facing up. Breathe gently into your lower belly.',
    icon: '🦋'
  },
  {
    name: 'Wide-Knee Supported Child’s Pose (Balasana)',
    duration: '5 - 8 mins',
    benefit: 'Decompresses the lower back and creates soothing space for the pelvis.',
    instructions: 'Kneel on your mat, widen knees to mat-width, and place a large pillow between your thighs. Fold your upper body forward onto the cushion, resting one cheek, arms relaxed forward.',
    icon: '🌸'
  },
  {
    name: 'Legs-Up-The-Wall (Viparita Karani)',
    duration: '10 - 15 mins',
    benefit: 'Encourages venous and lymphatic drainage from the pelvis, soothing inflammation.',
    instructions: 'Sit sideways against a wall, gently swing your legs up the wall, and lower your back to the floor. Place a soft cushion under your hips if comfortable. Relax your shoulders completely.',
    icon: '🌙'
  },
  {
    name: 'Gentle Supine Pelvic Drops & Rocking',
    duration: '3 - 5 mins',
    benefit: 'Releases the hypertonic pelvic diaphragm through breath-guided micromovements.',
    instructions: 'Lie flat on your back with knees bent and feet flat on the floor. On the inhale, allow your belly and pelvic bowl to completely soften and drop. On the exhale, let the breath gently leave without straining.',
    icon: '✨'
  }
];

export const EndometriosisCare: React.FC<EndometriosisCareProps> = ({ user, setUser }) => {
  const [subTab, setSubTab] = useState<'pain' | 'recovery' | 'mental' | 'specialist' | 'fertility' | 'learning'>('pain');
  
  // Pain tracking form state
  const [selectedLocations, setSelectedLocations] = useState<string[]>(['Lower Abdomen (Central)']);
  const [painIntensity, setPainIntensity] = useState<number>(5);
  const [painDuration, setPainDuration] = useState<string>('1 - 4 hours');
  const [selectedTriggers, setSelectedTriggers] = useState<string[]>(['Menstrual Period Onset']);
  const [selectedChars, setSelectedChars] = useState<string[]>(['Dull Heavy Aching']);
  const [painNotes, setPainNotes] = useState<string>('');
  const [painSuccessMsg, setPainSuccessMsg] = useState<string>('');
  const [painErrorMsg, setPainErrorMsg] = useState<string>('');

  const persistEndoUpdate = (updatedUser: User) => {
    setUser(updatedUser);
    const rememberPref = localStorage.getItem('lumina_remember_me') !== 'false';
    void saveEncryptedSessionUser(updatedUser, rememberPref);
    void syncUser(updatedUser);
  };

  // Mental wellness form state
  const [mentalMood, setMentalMood] = useState<string>('Resilient');
  const [stressLevel, setStressLevel] = useState<'Low' | 'Moderate' | 'High' | 'Severe'>('Moderate');
  const [dailyImpact, setDailyImpact] = useState<'None' | 'Mild' | 'Moderate (Breaks needed)' | 'Severe (Unable to do tasks)' | 'Bedrest Required'>('Moderate (Breaks needed)');
  const [mentalNotes, setMentalNotes] = useState<string>('');
  const [mentalSuccessMsg, setMentalSuccessMsg] = useState<string>('');

  // Specialist questions state
  const [customQuestion, setCustomQuestion] = useState<string>('');
  const [customCategory, setCustomCategory] = useState<string>('General Consultation');
  const [showPrintReport, setShowPrintReport] = useState<boolean>(false);

  // Learning hub expanded articles state
  const [expandedArticle, setExpandedArticle] = useState<string | null>('what-is-endo');

  // Breathing timer state
  const [isBreathingActive, setIsBreathingActive] = useState<boolean>(false);
  const [breathPhase, setBreathPhase] = useState<'Inhale (4s)' | 'Hold (7s)' | 'Exhale (8s)'>('Inhale (4s)');
  const [breathCounter, setBreathCounter] = useState<number>(4);

  // Initialize or fetch questions
  const specialistQuestions: EndoSpecialistQuestion[] = user.endoSpecialistQuestions || DEFAULT_SPECIALIST_QUESTIONS.map(q => ({
    id: q.id,
    category: q.category,
    question: q.question,
    isChecked: false,
    isCustom: false
  }));

  const painLogs = user.endoPainLogs || [];
  const mentalLogs = user.endoMentalLogs || [];

  // Somatic 4-7-8 breathing timer effect
  React.useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isBreathingActive) {
      timer = setInterval(() => {
        setBreathCounter(prev => {
          if (prev > 1) return prev - 1;
          // Transition phases
          if (breathPhase.startsWith('Inhale')) {
            setBreathPhase('Hold (7s)');
            return 7;
          } else if (breathPhase.startsWith('Hold')) {
            setBreathPhase('Exhale (8s)');
            return 8;
          } else {
            setBreathPhase('Inhale (4s)');
            return 4;
          }
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isBreathingActive, breathPhase]);

  const handleSavePainLog = () => {
    if (selectedLocations.length === 0) {
      setPainErrorMsg('Please select at least one pain location before saving.');
      return;
    }
    setPainErrorMsg('');

    const newLog: EndoPainLog = {
      id: `endo_pain_${Date.now()}`,
      date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
      locations: selectedLocations,
      intensity: painIntensity,
      duration: painDuration,
      triggers: selectedTriggers,
      characteristics: selectedChars,
      notes: painNotes.trim() || undefined
    };

    const updatedLogs = [newLog, ...painLogs];
    const updatedUser: User = {
      ...user,
      endoPainLogs: updatedLogs
    };

    persistEndoUpdate(updatedUser);
    
    setPainNotes('');
    setPainSuccessMsg('✨ Pain pattern logged safely to your Endometriosis record!');
    setTimeout(() => setPainSuccessMsg(''), 4000);
  };

  const handleDeletePainLog = (id: string) => {
    const updatedLogs = painLogs.filter(l => l.id !== id);
    const updatedUser: User = {
      ...user,
      endoPainLogs: updatedLogs
    };
    persistEndoUpdate(updatedUser);
  };

  const handleSaveMentalLog = () => {
    const newLog: EndoMentalLog = {
      id: `endo_mental_${Date.now()}`,
      date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
      mood: mentalMood,
      stressLevel,
      impactOnDailyActivities: dailyImpact,
      notes: mentalNotes.trim() || undefined
    };

    const updatedLogs = [newLog, ...mentalLogs];
    const updatedUser: User = {
      ...user,
      endoMentalLogs: updatedLogs
    };

    persistEndoUpdate(updatedUser);
    
    setMentalNotes('');
    setMentalSuccessMsg('💖 Mental wellness check-in saved! Be gentle with yourself today.');
    setTimeout(() => setMentalSuccessMsg(''), 4000);
  };

  const handleDeleteMentalLog = (id: string) => {
    const updatedLogs = mentalLogs.filter(l => l.id !== id);
    const updatedUser: User = {
      ...user,
      endoMentalLogs: updatedLogs
    };
    persistEndoUpdate(updatedUser);
  };

  const handleToggleQuestion = (id: string) => {
    const updatedQuestions = specialistQuestions.map(q => 
      q.id === id ? { ...q, isChecked: !q.isChecked } : q
    );
    const updatedUser: User = {
      ...user,
      endoSpecialistQuestions: updatedQuestions
    };
    persistEndoUpdate(updatedUser);
  };

  const handleAddCustomQuestion = () => {
    if (!customQuestion.trim()) return;

    const newQ: EndoSpecialistQuestion = {
      id: `custom_q_${Date.now()}`,
      category: customCategory,
      question: customQuestion.trim(),
      isChecked: true,
      isCustom: true
    };

    const updatedQuestions = [...specialistQuestions, newQ];
    const updatedUser: User = {
      ...user,
      endoSpecialistQuestions: updatedQuestions
    };
    persistEndoUpdate(updatedUser);
    setCustomQuestion('');
  };

  const handleDeleteQuestion = (id: string) => {
    const updatedQuestions = specialistQuestions.filter(q => q.id !== id);
    const updatedUser: User = {
      ...user,
      endoSpecialistQuestions: updatedQuestions
    };
    persistEndoUpdate(updatedUser);
  };

  const handlePrintSummary = () => {
    window.print();
  };

  // Helper for pain severity label & color
  const getIntensityBadge = (val: number) => {
    if (val <= 3) return { label: 'Mild Discomfort', color: 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/70' };
    if (val <= 6) return { label: 'Moderate Flare', color: 'bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800/70' };
    if (val <= 8) return { label: 'Severe Pain', color: 'bg-orange-50 dark:bg-orange-950/50 text-orange-800 dark:text-orange-300 border-orange-200 dark:border-orange-800/70' };
    return { label: 'Debilitating Crisis', color: 'bg-rose-50 dark:bg-rose-950/50 text-rose-800 dark:text-rose-300 border-rose-200 dark:border-rose-800/70' };
  };

  return (
    <div className="space-y-6 animate-fadeIn text-stone-800 dark:text-stone-100">
      
      {/* Hero Header Banner */}
      <section className="bg-gradient-to-br from-indigo-950 via-purple-950 to-slate-900 text-white p-7 md:p-9 rounded-2xl border border-indigo-800/40 shadow-md relative overflow-hidden">
        <div className="relative z-10 space-y-5 max-w-3xl">
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-3 py-1 bg-indigo-500/25 text-indigo-100 rounded-lg text-xs font-semibold border border-indigo-400/30 flex items-center gap-1.5">
              <ShieldCheck size={13} className="text-indigo-300" /> Clinical & somatic support
            </span>
            <span className="px-3 py-1 bg-pink-500/20 text-pink-100 rounded-lg text-xs font-semibold border border-pink-400/25">
              Endo care sanctuary
            </span>
          </div>

          <div className="space-y-2">
            <h2 className="text-3xl md:text-4xl font-serif text-white font-bold leading-tight">
              Endometriosis Care & Recovery
            </h2>
            <p className="text-sm text-indigo-100/90 leading-relaxed">
              Empowering your journey with clinical pain tracking, restorative somatic movement, mental wellness validation, specialist visit preparation, and evidence-based learning.
            </p>
          </div>

          {/* Quick Hub Jump Buttons */}
          <div className="flex flex-wrap gap-2 pt-1">
            <button
              onClick={() => {
                setSubTab('specialist');
                setShowPrintReport(true);
              }}
              className="px-4 py-2 bg-teal-500/20 hover:bg-teal-500/30 text-teal-100 border border-teal-400/30 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
            >
              <Printer size={13} className="text-teal-300" /> Printable clinical summary
            </button>
            <button
              onClick={() => setSubTab('specialist')}
              className="px-4 py-2 bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-100 border border-indigo-400/30 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
            >
              🩺 Specialist visit prep
            </button>
            <button
              onClick={() => setSubTab('fertility')}
              className="px-4 py-2 bg-rose-500/20 hover:bg-rose-500/30 text-rose-100 border border-rose-400/30 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
            >
              🌸 Fertility & planning
            </button>
            <button
              onClick={() => setSubTab('learning')}
              className="px-4 py-2 bg-purple-500/20 hover:bg-purple-500/30 text-purple-100 border border-purple-400/30 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
            >
              📚 Learning hub
            </button>
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1 tabular-nums">
            <div className="bg-white/10 p-3.5 rounded-xl border border-white/15 text-center">
              <p className="text-xl font-serif font-bold text-pink-200">{painLogs.length}</p>
              <p className="text-[11px] text-indigo-100/80 font-medium mt-0.5">Logged spells</p>
            </div>
            <div className="bg-white/10 p-3.5 rounded-xl border border-white/15 text-center">
              <p className="text-xl font-serif font-bold text-purple-200">
                {painLogs.length > 0 ? (painLogs.reduce((a, b) => a + b.intensity, 0) / painLogs.length).toFixed(1) : '0.0'}
              </p>
              <p className="text-[11px] text-indigo-100/80 font-medium mt-0.5">Avg intensity (1–10)</p>
            </div>
            <div className="bg-white/10 p-3.5 rounded-xl border border-white/15 text-center">
              <p className="text-xl font-serif font-bold text-teal-200">{mentalLogs.length}</p>
              <p className="text-[11px] text-indigo-100/80 font-medium mt-0.5">Wellness check-ins</p>
            </div>
            <div className="bg-white/10 p-3.5 rounded-xl border border-white/15 text-center">
              <p className="text-xl font-serif font-bold text-amber-200">
                {specialistQuestions.filter(q => q.isChecked).length}
              </p>
              <p className="text-[11px] text-indigo-100/80 font-medium mt-0.5">Specialist questions</p>
            </div>
          </div>
        </div>
      </section>

      {/* Sub-Navigation Grid / Tabs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 bg-[#faf8f6] dark:bg-[#1a1816] p-2 rounded-2xl border border-stone-200/80 dark:border-[#2e2a26] shadow-xs">
        {[
          { id: 'pain', label: 'Pain tracking', subtitle: 'Patterns & flares', icon: '📍' },
          { id: 'recovery', label: 'Energy & recovery', subtitle: 'Breath & movement', icon: '🌿' },
          { id: 'mental', label: 'Mental wellness', subtitle: 'Resilience check-in', icon: '🧠' },
          { id: 'specialist', label: 'Specialist prep', subtitle: 'Questions & export', icon: '🩺' },
          { id: 'fertility', label: 'Fertility & planning', subtitle: 'Ovarian health', icon: '🌸' },
          { id: 'learning', label: 'Learning hub', subtitle: 'Articles & staging', icon: '📚' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setSubTab(tab.id as any)}
            className={`p-3 rounded-xl transition-all flex flex-col items-center justify-center text-center gap-1 cursor-pointer ${
              subTab === tab.id
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-white dark:bg-[#23201d] hover:bg-indigo-50/60 dark:hover:bg-[#2a2622] text-stone-800 dark:text-stone-100 border border-stone-200/70 dark:border-[#342f2b]'
            }`}
          >
            <span className="text-lg" aria-hidden="true">{tab.icon}</span>
            <span className="text-xs font-semibold leading-tight">{tab.label}</span>
            <span className={`text-[11px] leading-tight ${subTab === tab.id ? 'text-indigo-100' : 'text-stone-500 dark:text-stone-400'}`}>
              {tab.subtitle}
            </span>
          </button>
        ))}
      </div>

      {/* ==================================================== */}
      {/* TAB 1: PAIN PATTERN TRACKING */}
      {/* ==================================================== */}
      {subTab === 'pain' && (
        <div className="space-y-6 animate-fadeIn">
          
          {/* Pain Logging Form Card */}
          <section className="bg-white dark:bg-[#1a1816] p-6 md:p-8 rounded-2xl border border-stone-200/80 dark:border-[#2e2a26] shadow-xs space-y-6">
            <div className="space-y-1.5">
              <span className="px-2.5 py-1 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-900/50 rounded-lg text-[11px] font-semibold inline-block">
                Clinical symptom tracker
              </span>
              <h3 className="text-2xl font-serif text-stone-900 dark:text-stone-100 font-bold">Log Pain Pattern</h3>
              <p className="text-xs text-stone-500 dark:text-stone-400 leading-relaxed">
                Capturing precise pain locations, intensity, duration, and triggers helps you and your specialist identify cyclical patterns and nerve involvement.
              </p>
            </div>

            {/* Pain Intensity Slider */}
            <div className="p-5 sm:p-6 bg-[#faf8f6] dark:bg-[#23201d] rounded-xl border border-stone-200/80 dark:border-[#342f2b] space-y-4">
              <div className="flex flex-wrap justify-between items-center gap-2">
                <label className="text-xs font-semibold text-stone-800 dark:text-stone-100 flex items-center gap-1.5">
                  <Flame size={15} className="text-rose-500" /> Pain intensity (1–10)
                </label>
                <span className={`px-3 py-1 rounded-lg text-xs font-semibold border tabular-nums ${getIntensityBadge(painIntensity).color}`}>
                  {painIntensity} / 10 • {getIntensityBadge(painIntensity).label}
                </span>
              </div>
              <input
                type="range"
                min="1"
                max="10"
                value={painIntensity}
                onChange={e => setPainIntensity(parseInt(e.target.value))}
                className="w-full h-2.5 bg-indigo-200 dark:bg-indigo-950 rounded-lg appearance-none cursor-pointer accent-indigo-600"
              />
              <div className="flex justify-between text-[11px] text-stone-500 dark:text-stone-400 font-mono tabular-nums">
                <span>1 (Mild)</span>
                <span>5 (Moderate)</span>
                <span>8 (Severe)</span>
                <span>10 (Crisis)</span>
              </div>
            </div>

            {/* Pain Location Selector */}
            <div className="space-y-2.5">
              <label className="text-xs font-semibold text-stone-800 dark:text-stone-100 flex items-center gap-1.5">
                <MapPin size={15} className="text-indigo-500 dark:text-indigo-400" /> Pain location (select all that apply)
              </label>
              <div className="flex flex-wrap gap-2">
                {PAIN_LOCATIONS.map(loc => {
                  const isSelected = selectedLocations.includes(loc);
                  return (
                    <button
                      key={loc}
                      type="button"
                      onClick={() => {
                        if (isSelected) {
                          setSelectedLocations(selectedLocations.filter(l => l !== loc));
                        } else {
                          setSelectedLocations([...selectedLocations, loc]);
                        }
                      }}
                      className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer border ${
                        isSelected
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                          : 'bg-[#faf8f6] dark:bg-[#23201d] text-stone-700 dark:text-stone-200 border-stone-200/80 dark:border-[#342f2b] hover:border-indigo-400'
                      }`}
                    >
                      {isSelected ? '✓ ' : ''}{loc}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Pain Duration & Characteristics */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2.5">
                <label className="text-xs font-semibold text-stone-800 dark:text-stone-100 flex items-center gap-1.5">
                  <Clock size={15} className="text-indigo-500 dark:text-indigo-400" /> Duration of flare
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {['< 1 hour', '1 - 4 hours', '4 - 8 hours', 'All Day (8+ hrs)', 'Multi-Day Flare'].map(dur => (
                    <button
                      key={dur}
                      type="button"
                      onClick={() => setPainDuration(dur)}
                      className={`py-2 px-3 rounded-xl text-xs font-semibold transition-all border text-center cursor-pointer ${
                        painDuration === dur
                          ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
                          : 'bg-[#faf8f6] dark:bg-[#23201d] text-stone-700 dark:text-stone-200 border-stone-200/80 dark:border-[#342f2b] hover:border-purple-400'
                      }`}
                    >
                      {dur}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2.5">
                <label className="text-xs font-semibold text-stone-800 dark:text-stone-100 flex items-center gap-1.5">
                  <Zap size={15} className="text-indigo-500 dark:text-indigo-400" /> Pain sensation / quality
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {PAIN_CHARACTERISTICS.map(char => {
                    const isSelected = selectedChars.includes(char);
                    return (
                      <button
                        key={char}
                        type="button"
                        onClick={() => {
                          if (isSelected) {
                            setSelectedChars(selectedChars.filter(c => c !== char));
                          } else {
                            setSelectedChars([...selectedChars, char]);
                          }
                        }}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border cursor-pointer ${
                          isSelected
                            ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                            : 'bg-[#faf8f6] dark:bg-[#23201d] text-stone-700 dark:text-stone-200 border-stone-200/80 dark:border-[#342f2b] hover:border-rose-400'
                        }`}
                      >
                        {char}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Pain Triggers */}
            <div className="space-y-2.5">
              <label className="text-xs font-semibold text-stone-800 dark:text-stone-100 flex items-center gap-1.5">
                <Target size={15} className="text-indigo-500 dark:text-indigo-400" /> Suspected triggers
              </label>
              <div className="flex flex-wrap gap-2">
                {PAIN_TRIGGERS.map(trig => {
                  const isSelected = selectedTriggers.includes(trig);
                  return (
                    <button
                      key={trig}
                      type="button"
                      onClick={() => {
                        if (isSelected) {
                          setSelectedTriggers(selectedTriggers.filter(t => t !== trig));
                        } else {
                          setSelectedTriggers([...selectedTriggers, trig]);
                        }
                      }}
                      className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all border cursor-pointer ${
                        isSelected
                          ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                          : 'bg-[#faf8f6] dark:bg-[#23201d] text-stone-700 dark:text-stone-200 border-stone-200/80 dark:border-[#342f2b] hover:border-amber-400'
                      }`}
                    >
                      {isSelected ? '✓ ' : ''}{trig}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Additional Notes */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-stone-800 dark:text-stone-100 block">
                Personal reflections or relief methods tried (optional)
              </label>
              <textarea
                value={painNotes}
                onChange={e => setPainNotes(e.target.value)}
                placeholder="e.g. Used heat pack on sacrum for 30 mins, ginger tea helped relieve cramping..."
                rows={2}
                className="w-full p-4 rounded-xl bg-[#faf8f6] dark:bg-[#23201d] border border-stone-200/80 dark:border-[#342f2b] text-xs text-stone-800 dark:text-stone-100 outline-none focus:border-indigo-500"
              />
            </div>

            {painErrorMsg && (
              <div role="alert" className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/70 rounded-xl text-rose-700 dark:text-rose-300 font-semibold text-xs flex items-center gap-2 animate-fadeIn">
                <AlertCircle size={16} /> {painErrorMsg}
              </div>
            )}

            {painSuccessMsg && (
              <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/70 rounded-xl text-emerald-700 dark:text-emerald-300 font-semibold text-xs flex items-center gap-2 animate-fadeIn">
                <CheckCircle2 size={16} /> {painSuccessMsg}
              </div>
            )}

            {/* Save Button */}
            <button
              onClick={handleSavePainLog}
              className="w-full py-3.5 px-6 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm rounded-xl shadow-sm transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <span>💾</span> Save pain pattern record
            </button>
          </section>

          {/* Past Pain Records List */}
          <section className="bg-white dark:bg-[#1a1816] p-6 md:p-8 rounded-2xl border border-stone-200/80 dark:border-[#2e2a26] shadow-xs space-y-4">
            <div className="flex flex-wrap justify-between items-center gap-2">
              <div>
                <h4 className="text-xl font-serif font-bold text-stone-900 dark:text-stone-100">Pain Pattern History</h4>
                <p className="text-xs text-stone-500 dark:text-stone-400">Review past flare-ups and share with your specialist</p>
              </div>
              <span className="text-xs font-mono font-semibold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200/60 dark:border-indigo-900/50 px-3 py-1 rounded-xl tabular-nums">
                {painLogs.length} {painLogs.length === 1 ? 'record' : 'records'}
              </span>
            </div>

            {painLogs.length === 0 ? (
              <div className="p-10 text-center space-y-2 bg-[#faf8f6] dark:bg-[#23201d] rounded-xl border border-stone-200/70 dark:border-[#342f2b]">
                <p className="text-3xl" aria-hidden="true">🌸</p>
                <p className="text-xs text-stone-500 dark:text-stone-400 font-medium">
                  No pain patterns logged yet. Use the form above to record your symptoms when a flare occurs.
                </p>
              </div>
            ) : (
              <div className="space-y-3 pt-2">
                {painLogs.map(log => {
                  const badge = getIntensityBadge(log.intensity);
                  return (
                    <div
                      key={log.id}
                      className="p-5 rounded-xl bg-[#faf8f6] dark:bg-[#23201d] border border-stone-200/80 dark:border-[#342f2b] hover:border-indigo-300 dark:hover:border-indigo-800/70 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
                    >
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2.5 tabular-nums">
                          <span className={`px-2.5 py-0.5 rounded-lg text-xs font-semibold border ${badge.color}`}>
                            {log.intensity}/10 • {badge.label}
                          </span>
                          <span className="text-xs font-mono text-stone-500 dark:text-stone-400">{log.date}</span>
                          <span className="text-xs font-semibold text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/50 px-2.5 py-0.5 rounded-lg">
                            ⏳ {log.duration}
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-1.5 text-xs text-stone-700 dark:text-stone-300">
                          <span className="font-semibold text-stone-900 dark:text-stone-100">Locations:</span>
                          {log.locations.map(l => (
                            <span key={l} className="bg-white dark:bg-[#1a1816] border border-stone-200/80 dark:border-[#342f2b] px-2.5 py-0.5 rounded-lg text-xs font-medium">
                              {l}
                            </span>
                          ))}
                        </div>

                        {log.triggers && log.triggers.length > 0 && (
                          <div className="flex flex-wrap items-center gap-1.5 text-xs text-stone-700 dark:text-stone-300">
                            <span className="font-semibold text-amber-800 dark:text-amber-300">Triggers:</span>
                            {log.triggers.map(t => (
                              <span key={t} className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200/70 dark:border-amber-800/60 text-amber-800 dark:text-amber-300 px-2.5 py-0.5 rounded-lg text-xs">
                                {t}
                              </span>
                            ))}
                          </div>
                        )}

                        {log.notes && (
                          <p className="text-xs text-stone-600 dark:text-stone-300 pt-1">
                            "{log.notes}"
                          </p>
                        )}
                      </div>

                      <button
                        onClick={() => handleDeletePainLog(log.id)}
                        className="p-2.5 text-stone-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition-colors self-end md:self-center cursor-pointer"
                        title="Delete log"
                        aria-label="Delete pain log"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      )}

      {/* ==================================================== */}
      {/* TAB 2: ENERGY & RECOVERY SUPPORT */}
      {/* ==================================================== */}
      {subTab === 'recovery' && (
        <div className="space-y-6 animate-fadeIn">
          
          {/* Somatic Vagus Nerve Breathing Guide */}
          <section className="bg-gradient-to-r from-indigo-900 to-purple-900 text-white p-6 md:p-8 rounded-2xl shadow-md space-y-5 relative overflow-hidden">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative z-10">
              <div className="space-y-1.5">
                <span className="px-3 py-1 bg-white/10 rounded-lg text-xs font-semibold text-indigo-100 inline-block">
                  Nervous system down-regulation
                </span>
                <h3 className="text-2xl font-serif font-bold">4-7-8 Pelvic Calming Breath</h3>
                <p className="text-xs text-indigo-100/90 max-w-xl leading-relaxed">
                  Activates the parasympathetic vagus nerve, calming pelvic floor muscle guarding and soothing chronic pain signals.
                </p>
              </div>

              <button
                onClick={() => setIsBreathingActive(!isBreathingActive)}
                className={`px-5 py-3 rounded-xl font-semibold text-xs transition-all shadow-sm cursor-pointer whitespace-nowrap shrink-0 ${
                  isBreathingActive
                    ? 'bg-rose-600 hover:bg-rose-700 text-white'
                    : 'bg-white text-indigo-950 hover:bg-indigo-50'
                }`}
              >
                {isBreathingActive ? '⏹ Stop somatic breath' : '▶ Begin somatic breathing'}
              </button>
            </div>

            {isBreathingActive && (
              <div className="p-7 bg-white/10 rounded-xl border border-white/20 text-center space-y-4 animate-fadeIn relative z-10">
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-indigo-400 to-pink-400 flex items-center justify-center mx-auto text-3xl font-mono font-bold shadow-xl tabular-nums">
                  {breathCounter}
                </div>
                <div className="space-y-1">
                  <h4 className="text-xl font-serif font-bold text-pink-200">{breathPhase}</h4>
                  <p className="text-xs text-indigo-100">
                    {breathPhase.startsWith('Inhale') && "Inhale deeply through your nose, expanding your lower abdomen and pelvic bowl..."}
                    {breathPhase.startsWith('Hold') && "Hold gently with relaxed shoulders and softened jaw..."}
                    {breathPhase.startsWith('Exhale') && "Exhale completely through parted lips, letting all pelvic tension melt away..."}
                  </p>
                </div>
              </div>
            )}
          </section>

          {/* Gentle Stretching Recommendations */}
          <section className="bg-white dark:bg-[#1a1816] p-6 md:p-8 rounded-2xl border border-stone-200/80 dark:border-[#2e2a26] shadow-xs space-y-6">
            <div className="space-y-1.5">
              <span className="px-2.5 py-1 bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 border border-purple-200/60 dark:border-purple-900/50 rounded-lg text-[11px] font-semibold inline-block">
                Restorative somatic movement
              </span>
              <h3 className="text-2xl font-serif text-stone-900 dark:text-stone-100 font-bold">Gentle Stretching for Pelvic Relief</h3>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                These non-compressive stretches help release hypertonic pelvic tension, ease lower back stiffness, and stimulate lymphatic drainage.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {STRETCHES.map((st, i) => (
                <div key={i} className="p-5 bg-[#faf8f6] dark:bg-[#23201d] border border-stone-200/80 dark:border-[#342f2b] rounded-xl space-y-2.5 hover:border-indigo-300 dark:hover:border-indigo-800/70 transition-all flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="flex justify-between items-start gap-2">
                      <div className="flex items-center gap-2.5">
                        <span className="text-2xl" aria-hidden="true">{st.icon}</span>
                        <h4 className="text-sm font-serif font-bold text-stone-900 dark:text-stone-100">{st.name}</h4>
                      </div>
                      <span className="text-[11px] font-semibold bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 px-2.5 py-0.5 rounded-lg whitespace-nowrap shrink-0 tabular-nums">
                        {st.duration}
                      </span>
                    </div>
                    <p className="text-xs text-indigo-700 dark:text-indigo-300 font-medium">{st.benefit}</p>
                    <p className="text-xs text-stone-600 dark:text-stone-300 leading-relaxed pt-0.5">
                      <strong>How to perform:</strong> {st.instructions}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Walking Recommendations & Rest Guidance */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Walking Guidelines */}
            <section className="bg-white dark:bg-[#1a1816] p-6 md:p-7 rounded-2xl border border-stone-200/80 dark:border-[#2e2a26] shadow-xs space-y-4">
              <div className="flex items-center gap-3">
                <span className="text-3xl" aria-hidden="true">🚶‍♀️</span>
                <div>
                  <h4 className="text-lg font-serif font-bold text-stone-900 dark:text-stone-100">Mindful Walking Recommendations</h4>
                  <p className="text-xs text-stone-500 dark:text-stone-400">Pacing your movement without triggering flares</p>
                </div>
              </div>

              <ul className="space-y-3 text-xs text-stone-600 dark:text-stone-300 leading-relaxed pt-1">
                <li className="flex gap-2">
                  <span className="text-indigo-500 font-bold">•</span>
                  <span><strong>10–15 Minute Gentle Pacing:</strong> Short, slow-paced flat surface walks stimulate pelvic blood flow and lower systemic inflammation without straining pelvic ligaments.</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-indigo-500 font-bold">•</span>
                  <span><strong>Post-Meal Movement:</strong> A gentle 10-minute stroll post-meals aids gastrointestinal motility and reduces painful "endo belly" gas pressure.</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-indigo-500 font-bold">•</span>
                  <span><strong>Energy Envelope Awareness:</strong> If you feel acute sharp pelvic catches or heavy dragging pressure, pause immediately and transition to horizontal resting.</span>
                </li>
              </ul>
            </section>

            {/* Rest & Recovery Protocols */}
            <section className="bg-white dark:bg-[#1a1816] p-6 md:p-7 rounded-2xl border border-stone-200/80 dark:border-[#2e2a26] shadow-xs space-y-4">
              <div className="flex items-center gap-3">
                <span className="text-3xl" aria-hidden="true">🛌</span>
                <div>
                  <h4 className="text-lg font-serif font-bold text-stone-900 dark:text-stone-100">Rest & Flare Recovery Protocols</h4>
                  <p className="text-xs text-stone-500 dark:text-stone-400">Nurturing comfort during active pain spells</p>
                </div>
              </div>

              <ul className="space-y-3 text-xs text-stone-600 dark:text-stone-300 leading-relaxed pt-1">
                <li className="flex gap-2">
                  <span className="text-rose-500 font-bold">•</span>
                  <span><strong>Pelvic & Sacral Heat Therapy:</strong> Apply a moist heating pad or warm water bottle over the lower pelvis and sacrum for 20 minutes to relax vascular spasms.</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-rose-500 font-bold">•</span>
                  <span><strong>Warm Epsom Salt Soak:</strong> Magnesium sulfate absorbed in warm water promotes systemic muscle relaxation and eases neuro-inflammatory pain loops.</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-rose-500 font-bold">•</span>
                  <span><strong>Anti-Constriction Clothing:</strong> Avoid tight high-waisted bands; embrace breathable, ultra-soft natural bamboo or silk garments.</span>
                </li>
              </ul>
            </section>
          </div>

          {/* Sleep Tracking Suggestions */}
          <section className="bg-indigo-950 text-white p-6 md:p-8 rounded-2xl shadow-md space-y-4">
            <div className="flex items-center gap-3">
              <span className="text-3xl" aria-hidden="true">🌙</span>
              <div>
                <h4 className="text-xl font-serif font-bold text-indigo-100">Sleep Suggestions During Endo Flares</h4>
                <p className="text-xs text-indigo-200/80">Optimizing nocturnal restorative recovery</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
              <div className="p-4 bg-white/10 rounded-xl border border-white/15 space-y-1.5">
                <span className="text-xs font-semibold text-pink-200">Side-Sleeping Alignment</span>
                <p className="text-xs text-indigo-100/85 leading-relaxed">
                  Sleep on your side with a contour pillow between your knees to keep your pelvis neutral and un-twist the sacroiliac joints.
                </p>
              </div>

              <div className="p-4 bg-white/10 rounded-xl border border-white/15 space-y-1.5">
                <span className="text-xs font-semibold text-purple-200">Topical Magnesium & Tea</span>
                <p className="text-xs text-indigo-100/85 leading-relaxed">
                  Sip warm chamomile or ginger tea and apply topical magnesium lotion to your lower abdomen 30 minutes before rest.
                </p>
              </div>

              <div className="p-4 bg-white/10 rounded-xl border border-white/15 space-y-1.5">
                <span className="text-xs font-semibold text-teal-200">Zero Blue-Light Wind Down</span>
                <p className="text-xs text-indigo-100/85 leading-relaxed">
                  Elevate your melatonin levels naturally to support deep delta-wave sleep where tissue cellular repair occurs.
                </p>
              </div>
            </div>
          </section>
        </div>
      )}

      {/* ==================================================== */}
      {/* TAB 3: MENTAL WELLNESS CHECK-IN */}
      {/* ==================================================== */}
      {subTab === 'mental' && (
        <div className="space-y-6 animate-fadeIn">
          
          <section className="bg-white dark:bg-[#1a1816] p-6 md:p-8 rounded-2xl border border-stone-200/80 dark:border-[#2e2a26] shadow-xs space-y-6">
            <div className="space-y-1.5">
              <span className="px-2.5 py-1 bg-pink-50 dark:bg-pink-950/50 text-pink-700 dark:text-pink-300 border border-pink-200/60 dark:border-pink-900/50 rounded-lg text-[11px] font-semibold inline-block">
                Compassionate self-care
              </span>
              <h3 className="text-2xl font-serif text-stone-900 dark:text-stone-100 font-bold">Mental Wellness Check-In</h3>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                Living with chronic pelvic pain takes immense mental and emotional strength. Honor how you are truly feeling today without judgment.
              </p>
            </div>

            {/* Mood Selector */}
            <div className="space-y-2.5">
              <label className="text-xs font-semibold text-stone-800 dark:text-stone-100 flex items-center gap-1.5">
                <Smile size={15} className="text-pink-500" /> Current emotional state / mood
              </label>
              <div className="flex flex-wrap gap-2">
                {[
                  { label: 'Hopeful & Grounded', emoji: '🌱' },
                  { label: 'Resilient & Strong', emoji: '💪' },
                  { label: 'Overwhelmed & Sensitive', emoji: '🥺' },
                  { label: 'Physically Exhausted', emoji: '🥱' },
                  { label: 'Anxious About Pain', emoji: '⚡' },
                  { label: 'Frustrated / Grieving', emoji: '🌧️' },
                  { label: 'Gentle & Calm', emoji: '🕊️' }
                ].map(m => (
                  <button
                    key={m.label}
                    type="button"
                    onClick={() => setMentalMood(m.label)}
                    className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all border flex items-center gap-1.5 cursor-pointer ${
                      mentalMood === m.label
                        ? 'bg-pink-600 text-white border-pink-600 shadow-xs'
                        : 'bg-[#faf8f6] dark:bg-[#23201d] text-stone-700 dark:text-stone-200 border-stone-200/80 dark:border-[#342f2b] hover:border-pink-400'
                    }`}
                  >
                    <span>{m.emoji}</span>
                    <span>{m.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Stress Level & Impact on Daily Activities */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Stress Levels */}
              <div className="space-y-2.5">
                <label className="text-xs font-semibold text-stone-800 dark:text-stone-100 flex items-center gap-1.5">
                  <Activity size={15} className="text-indigo-500 dark:text-indigo-400" /> Stress level
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {(['Low', 'Moderate', 'High', 'Severe'] as const).map(lvl => (
                    <button
                      key={lvl}
                      type="button"
                      onClick={() => setStressLevel(lvl)}
                      className={`py-2.5 px-3 rounded-xl text-xs font-semibold transition-all border text-center cursor-pointer ${
                        stressLevel === lvl
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                          : 'bg-[#faf8f6] dark:bg-[#23201d] text-stone-700 dark:text-stone-200 border-stone-200/80 dark:border-[#342f2b] hover:border-indigo-400'
                      }`}
                    >
                      {lvl} Stress
                    </button>
                  ))}
                </div>
              </div>

              {/* Impact on Daily Activities */}
              <div className="space-y-2.5">
                <label className="text-xs font-semibold text-stone-800 dark:text-stone-100 flex items-center gap-1.5">
                  <Target size={15} className="text-indigo-500 dark:text-indigo-400" /> Impact of symptoms today
                </label>
                <div className="space-y-1.5">
                  {[
                    'None',
                    'Mild',
                    'Moderate (Breaks needed)',
                    'Severe (Unable to do tasks)',
                    'Bedrest Required'
                  ].map(imp => (
                    <button
                      key={imp}
                      type="button"
                      onClick={() => setDailyImpact(imp as any)}
                      className={`w-full py-2 px-3 rounded-xl text-xs font-semibold transition-all border text-left cursor-pointer ${
                        dailyImpact === imp
                          ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
                          : 'bg-[#faf8f6] dark:bg-[#23201d] text-stone-700 dark:text-stone-200 border-stone-200/80 dark:border-[#342f2b] hover:border-purple-400'
                      }`}
                    >
                      {dailyImpact === imp ? '✓ ' : '• '}{imp}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Notes / Journaling */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-stone-800 dark:text-stone-100 block">
                Personal mental reflection (optional)
              </label>
              <textarea
                value={mentalNotes}
                onChange={e => setMentalNotes(e.target.value)}
                placeholder="How are you taking care of your spirit today? What boundaries are you setting?"
                rows={2}
                className="w-full p-4 rounded-xl bg-[#faf8f6] dark:bg-[#23201d] border border-stone-200/80 dark:border-[#342f2b] text-xs text-stone-800 dark:text-stone-100 outline-none focus:border-pink-400"
              />
            </div>

            {mentalSuccessMsg && (
              <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/70 rounded-xl text-emerald-700 dark:text-emerald-300 font-semibold text-xs flex items-center gap-2 animate-fadeIn">
                <CheckCircle2 size={16} /> {mentalSuccessMsg}
              </div>
            )}

            <button
              onClick={handleSaveMentalLog}
              className="w-full py-3.5 px-6 bg-pink-600 hover:bg-pink-700 text-white font-semibold text-sm rounded-xl shadow-sm transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <span>💖</span> Save mental wellness check-in
            </button>
          </section>

          {/* Past Mental Check-Ins */}
          <section className="bg-white dark:bg-[#1a1816] p-6 md:p-8 rounded-2xl border border-stone-200/80 dark:border-[#2e2a26] shadow-xs space-y-4">
            <div className="flex flex-wrap justify-between items-center gap-2">
              <div>
                <h4 className="text-xl font-serif font-bold text-stone-900 dark:text-stone-100">Mental Wellness History</h4>
                <p className="text-xs text-stone-500 dark:text-stone-400">Track how your emotional resilience shifts throughout your cycle</p>
              </div>
              <span className="text-xs font-mono font-semibold text-pink-700 dark:text-pink-300 bg-pink-50 dark:bg-pink-950/50 border border-pink-200/60 dark:border-pink-900/50 px-3 py-1 rounded-xl tabular-nums">
                {mentalLogs.length} {mentalLogs.length === 1 ? 'check-in' : 'check-ins'}
              </span>
            </div>

            {mentalLogs.length === 0 ? (
              <div className="p-8 text-center bg-[#faf8f6] dark:bg-[#23201d] rounded-xl border border-stone-200/70 dark:border-[#342f2b]">
                <p className="text-xs text-stone-500 dark:text-stone-400">
                  No mental wellness check-ins recorded yet. Check in with yourself whenever you need a moment of pause.
                </p>
              </div>
            ) : (
              <div className="space-y-3 pt-2">
                {mentalLogs.map(log => (
                  <div
                    key={log.id}
                    className="p-5 rounded-xl bg-[#faf8f6] dark:bg-[#23201d] border border-stone-200/80 dark:border-[#342f2b] hover:border-pink-300 dark:hover:border-pink-800/70 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
                  >
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2.5 tabular-nums">
                        <span className="px-3 py-0.5 rounded-lg text-xs font-semibold bg-pink-100 dark:bg-pink-950/60 text-pink-800 dark:text-pink-200 border border-pink-200/70 dark:border-pink-900/50">
                          {log.mood}
                        </span>
                        <span className="text-xs font-mono text-stone-500 dark:text-stone-400">{log.date}</span>
                        <span className="text-xs font-semibold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/50 px-2.5 py-0.5 rounded-lg">
                          Stress: {log.stressLevel}
                        </span>
                      </div>

                      <p className="text-xs text-stone-700 dark:text-stone-300 font-medium">
                        <span className="font-semibold text-purple-900 dark:text-purple-300">Activity impact:</span> {log.impactOnDailyActivities}
                      </p>

                      {log.notes && (
                        <p className="text-xs text-stone-600 dark:text-stone-400 pt-1">
                          "{log.notes}"
                        </p>
                      )}
                    </div>

                    <button
                      onClick={() => handleDeleteMentalLog(log.id)}
                      className="p-2.5 text-stone-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition-colors self-end md:self-center cursor-pointer"
                      title="Delete log"
                      aria-label="Delete mental check-in log"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      )}

      {/* ==================================================== */}
      {/* TAB 4: SPECIALIST VISIT PREPARATION */}
      {/* ==================================================== */}
      {subTab === 'specialist' && (
        <div className="space-y-6 animate-fadeIn">
          
          <section className="bg-white dark:bg-[#1a1816] p-6 md:p-8 rounded-2xl border border-stone-200/80 dark:border-[#2e2a26] shadow-xs space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div className="space-y-1.5">
                <span className="px-2.5 py-1 bg-teal-50 dark:bg-teal-950/50 text-teal-700 dark:text-teal-300 border border-teal-200/60 dark:border-teal-900/50 rounded-lg text-[11px] font-semibold inline-block">
                  Clinical advocacy toolkit
                </span>
                <h3 className="text-2xl font-serif text-stone-900 dark:text-stone-100 font-bold">Specialist Visit Preparation</h3>
                <p className="text-xs text-stone-500 dark:text-stone-400">
                  Select key questions to ask your gynecological excision specialist, add your custom questions, and export a full clinical summary.
                </p>
              </div>

              <button
                onClick={() => setShowPrintReport(!showPrintReport)}
                className="px-5 py-3 bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs rounded-xl shadow-xs transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap shrink-0"
              >
                <Printer size={15} /> {showPrintReport ? 'Hide clinical report' : 'Generate & print visit summary'}
              </button>
            </div>

            {/* Printable Specialist Summary Report Preview Modal/Section */}
            {showPrintReport && (
              <div className="p-6 md:p-7 bg-[#faf8f6] dark:bg-[#23201d] border border-indigo-300 dark:border-indigo-800/70 rounded-2xl space-y-6 print:border-none print:p-0">
                <div className="flex flex-wrap justify-between items-start gap-3 border-b border-stone-200 dark:border-[#342f2b] pb-4">
                  <div>
                    <h4 className="text-xl md:text-2xl font-serif font-bold text-stone-900 dark:text-stone-100">Lumina Endometriosis Clinical Summary</h4>
                    <p className="text-xs text-stone-500 dark:text-stone-400">Prepared for specialist consultation • Patient: {user.name}</p>
                  </div>
                  <button
                    onClick={handlePrintSummary}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-xs cursor-pointer flex items-center gap-1.5 whitespace-nowrap shrink-0"
                  >
                    <Printer size={14} /> Print document
                  </button>
                </div>

                {/* Summary Snapshot */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center tabular-nums">
                  <div className="p-3 bg-white dark:bg-[#1a1816] rounded-xl border border-stone-200/80 dark:border-[#342f2b]">
                    <p className="text-[11px] text-stone-500 dark:text-stone-400 font-semibold">Cycle length</p>
                    <p className="text-base font-bold text-stone-900 dark:text-stone-100">{user.cycleLength || 28} Days</p>
                  </div>
                  <div className="p-3 bg-white dark:bg-[#1a1816] rounded-xl border border-stone-200/80 dark:border-[#342f2b]">
                    <p className="text-[11px] text-stone-500 dark:text-stone-400 font-semibold">Pain flare records</p>
                    <p className="text-base font-bold text-stone-900 dark:text-stone-100">{painLogs.length}</p>
                  </div>
                  <div className="p-3 bg-white dark:bg-[#1a1816] rounded-xl border border-stone-200/80 dark:border-[#342f2b]">
                    <p className="text-[11px] text-stone-500 dark:text-stone-400 font-semibold">Avg flare intensity</p>
                    <p className="text-base font-bold text-stone-900 dark:text-stone-100">
                      {painLogs.length > 0 ? (painLogs.reduce((a, b) => a + b.intensity, 0) / painLogs.length).toFixed(1) : 'N/A'}/10
                    </p>
                  </div>
                  <div className="p-3 bg-white dark:bg-[#1a1816] rounded-xl border border-stone-200/80 dark:border-[#342f2b]">
                    <p className="text-[11px] text-stone-500 dark:text-stone-400 font-semibold">Selected questions</p>
                    <p className="text-base font-bold text-stone-900 dark:text-stone-100">
                      {specialistQuestions.filter(q => q.isChecked).length}
                    </p>
                  </div>
                </div>

                {/* Selected Questions Section in Printout */}
                <div className="space-y-2">
                  <h5 className="text-sm font-semibold text-stone-900 dark:text-stone-100">Consultation questions selected:</h5>
                  <ul className="space-y-2 list-disc pl-5 text-xs text-stone-700 dark:text-stone-300 leading-relaxed">
                    {specialistQuestions.filter(q => q.isChecked).map(q => (
                      <li key={q.id}>
                        <strong>[{q.category}]</strong> {q.question}
                      </li>
                    ))}
                    {specialistQuestions.filter(q => q.isChecked).length === 0 && (
                      <p className="text-xs text-stone-500 dark:text-stone-400">No specific questions checked yet.</p>
                    )}
                  </ul>
                </div>

                {/* Recent Pain Flare Summary in Printout */}
                {painLogs.length > 0 && (
                  <div className="space-y-2">
                    <h5 className="text-sm font-semibold text-stone-900 dark:text-stone-100">Recent pain pattern logs:</h5>
                    <div className="space-y-1.5 text-xs text-stone-700 dark:text-stone-300">
                      {painLogs.slice(0, 5).map(l => (
                        <div key={l.id} className="p-3 bg-white dark:bg-[#1a1816] rounded-xl border border-stone-200/80 dark:border-[#342f2b] flex flex-wrap justify-between items-center gap-2">
                          <span><strong>{l.date}</strong>: {l.intensity}/10 intensity ({l.duration}) — Locations: {l.locations.join(', ')}</span>
                          {l.triggers && <span className="text-[11px] text-stone-500 dark:text-stone-400">Triggers: {l.triggers.join(', ')}</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Questions Checklist */}
            <div className="space-y-4">
              <h4 className="text-base font-serif font-bold text-stone-900 dark:text-stone-100">Recommended Questions for Your Specialist</h4>
              
              {/* Grouped Questions */}
              {['Diagnostics & Imaging', 'Surgical & Excision Options', 'Pain & Medical Management', 'Pelvic Physical Therapy', 'Fertility & Family Planning', 'General Consultation'].map(cat => {
                const groupQuestions = specialistQuestions.filter(q => q.category === cat);
                if (groupQuestions.length === 0) return null;

                return (
                  <div key={cat} className="space-y-2 pt-2">
                    <h5 className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-indigo-500"></span> {cat}
                    </h5>
                    <div className="space-y-2">
                      {groupQuestions.map(q => (
                        <div
                          key={q.id}
                          onClick={() => handleToggleQuestion(q.id)}
                          className={`p-4 rounded-xl border transition-all cursor-pointer flex items-start justify-between gap-3 ${
                            q.isChecked
                              ? 'bg-indigo-50/70 dark:bg-indigo-950/35 border-indigo-300 dark:border-indigo-700 text-stone-900 dark:text-stone-100 font-medium'
                              : 'bg-[#faf8f6] dark:bg-[#23201d] border-stone-200/80 dark:border-[#342f2b] text-stone-700 dark:text-stone-300 hover:border-indigo-300'
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            {q.isChecked ? (
                              <CheckCircle2 size={18} className="text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
                            ) : (
                              <Circle size={18} className="text-stone-300 dark:text-stone-600 shrink-0 mt-0.5" />
                            )}
                            <p className="text-xs leading-relaxed">{q.question}</p>
                          </div>

                          {q.isCustom && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteQuestion(q.id);
                              }}
                              className="text-stone-400 hover:text-rose-600 p-1 cursor-pointer"
                              title="Delete custom question"
                              aria-label="Delete custom question"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Add Custom Question Form */}
            <div className="p-5 bg-[#faf8f6] dark:bg-[#23201d] rounded-xl border border-stone-200/80 dark:border-[#342f2b] space-y-3">
              <h5 className="text-xs font-semibold text-stone-800 dark:text-stone-100">Add your own custom question</h5>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  value={customQuestion}
                  onChange={e => setCustomQuestion(e.target.value)}
                  placeholder="Type a specific question you want to ask your doctor..."
                  className="flex-1 p-3.5 rounded-xl bg-white dark:bg-[#1a1816] border border-stone-200/80 dark:border-[#342f2b] text-xs text-stone-800 dark:text-stone-100 outline-none focus:border-indigo-500"
                />
                <button
                  onClick={handleAddCustomQuestion}
                  className="px-5 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-xl shadow-xs transition-all cursor-pointer shrink-0 flex items-center justify-center gap-1.5"
                >
                  <Plus size={15} /> Add question
                </button>
              </div>
            </div>
          </section>
        </div>
      )}

      {/* ==================================================== */}
      {/* TAB 5: FERTILITY & FAMILY PLANNING */}
      {/* ==================================================== */}
      {subTab === 'fertility' && (
        <div className="space-y-6 animate-fadeIn">
          
          <section className="bg-white dark:bg-[#1a1816] p-6 md:p-8 rounded-2xl border border-stone-200/80 dark:border-[#2e2a26] shadow-xs space-y-6">
            <div className="space-y-1.5">
              <span className="px-2.5 py-1 bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border border-rose-200/60 dark:border-rose-900/50 rounded-lg text-[11px] font-semibold inline-block">
                Reproductive health & planning
              </span>
              <h3 className="text-2xl font-serif text-stone-900 dark:text-stone-100 font-bold">Fertility & Family Planning with Endometriosis</h3>
              <p className="text-xs text-stone-500 dark:text-stone-400 leading-relaxed">
                An evidence-based, compassionate guide to understanding how endometriosis interacts with fertility, what baseline tests to consider, and proactive steps for conception.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 pt-2">
              
              {/* Module 1 */}
              <div className="p-6 bg-[#faf8f6] dark:bg-[#23201d] rounded-xl border border-stone-200/80 dark:border-[#342f2b] space-y-3 flex flex-col justify-between">
                <div className="space-y-2">
                  <span className="text-3xl" aria-hidden="true">🌸</span>
                  <h4 className="text-base font-serif font-bold text-stone-900 dark:text-stone-100">How Endo Impacts Fertility</h4>
                  <p className="text-xs text-stone-600 dark:text-stone-300 leading-relaxed">
                    Endometriosis can influence conception through several pathways:
                  </p>
                  <ul className="space-y-1.5 text-xs text-stone-600 dark:text-stone-300 leading-relaxed list-disc pl-4">
                    <li><strong>Peritoneal Cytokines:</strong> Inflammatory fluid in the pelvis can alter sperm motility and egg quality.</li>
                    <li><strong>Adhesions:</strong> Scar tissue can restrict fallopian tube mobility or fimbrial egg capture.</li>
                    <li><strong>Endometriomas:</strong> "Chocolate cysts" on ovaries may affect local blood supply or follicular development.</li>
                  </ul>
                </div>
                <div className="pt-3 border-t border-stone-200/70 dark:border-[#342f2b]">
                  <span className="text-xs font-semibold text-rose-600 dark:text-rose-400">Key takeaway:</span>
                  <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">Many women with endometriosis conceive naturally, and early baseline knowledge provides control.</p>
                </div>
              </div>

              {/* Module 2 */}
              <div className="p-6 bg-[#faf8f6] dark:bg-[#23201d] rounded-xl border border-stone-200/80 dark:border-[#342f2b] space-y-3 flex flex-col justify-between">
                <div className="space-y-2">
                  <span className="text-3xl" aria-hidden="true">🔬</span>
                  <h4 className="text-base font-serif font-bold text-stone-900 dark:text-stone-100">Planning Ahead & Tests</h4>
                  <p className="text-xs text-stone-600 dark:text-stone-300 leading-relaxed">
                    Consider discussing these proactive baseline evaluations with your doctor:
                  </p>
                  <ul className="space-y-1.5 text-xs text-stone-600 dark:text-stone-300 leading-relaxed list-disc pl-4">
                    <li><strong>AMH (Anti-Müllerian Hormone):</strong> Measures your ovarian reserve baseline.</li>
                    <li><strong>Antral Follicle Count (AFC):</strong> Ultrasound assessment of resting follicles.</li>
                    <li><strong>HSG (Hysterosalpingogram):</strong> Verifies whether fallopian tubes are open and unobstructed.</li>
                    <li><strong>Semen Analysis:</strong> Ensures partner parameters are optimal to avoid compounding factors.</li>
                  </ul>
                </div>
                <div className="pt-3 border-t border-stone-200/70 dark:border-[#342f2b]">
                  <span className="text-xs font-semibold text-purple-600 dark:text-purple-400">Action step:</span>
                  <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">Request an AMH check early to establish your individualized timeline.</p>
                </div>
              </div>

              {/* Module 3 */}
              <div className="p-6 bg-[#faf8f6] dark:bg-[#23201d] rounded-xl border border-stone-200/80 dark:border-[#342f2b] space-y-3 flex flex-col justify-between">
                <div className="space-y-2">
                  <span className="text-3xl" aria-hidden="true">🌿</span>
                  <h4 className="text-base font-serif font-bold text-stone-900 dark:text-stone-100">Treatment & Conception Insights</h4>
                  <p className="text-xs text-stone-600 dark:text-stone-300 leading-relaxed">
                    Options for family planning and fertility preservation:
                  </p>
                  <ul className="space-y-1.5 text-xs text-stone-600 dark:text-stone-300 leading-relaxed list-disc pl-4">
                    <li><strong>Excision Surgery Timing:</strong> Surgical removal of active lesions often provides a "fertility window" of reduced inflammation.</li>
                    <li><strong>Assisted Reproduction (IUI / IVF):</strong> IVF bypasses pelvic inflammation and tubal factors directly.</li>
                    <li><strong>Egg / Embryo Freezing:</strong> An empowering preservation option before major ovarian surgery.</li>
                  </ul>
                </div>
                <div className="pt-3 border-t border-stone-200/70 dark:border-[#342f2b]">
                  <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">Empowerment:</span>
                  <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">Collaborating with a Reproductive Endocrinologist early creates a low-stress roadmap.</p>
                </div>
              </div>

            </div>
          </section>
        </div>
      )}

      {/* ==================================================== */}
      {/* TAB 6: ENDOMETRIOSIS LEARNING HUB */}
      {/* ==================================================== */}
      {subTab === 'learning' && (
        <div className="space-y-6 animate-fadeIn">
          
          <section className="bg-white dark:bg-[#1a1816] p-6 md:p-8 rounded-2xl border border-stone-200/80 dark:border-[#2e2a26] shadow-xs space-y-6">
            <div className="space-y-1.5">
              <span className="px-2.5 py-1 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-900/50 rounded-lg text-[11px] font-semibold inline-block">
                Evidence-based medical education
              </span>
              <h3 className="text-2xl font-serif text-stone-900 dark:text-stone-100 font-bold">Endometriosis Learning Hub</h3>
              <p className="text-xs text-stone-500 dark:text-stone-400 leading-relaxed">
                Clear, medically validated articles to help you understand your anatomy, staging, anti-inflammatory nutrition, and pelvic rehabilitation.
              </p>
            </div>

            {/* Expandable Articles List */}
            <div className="space-y-4 pt-2">
              
              {/* Article 1: What is Endo */}
              <div className="border border-stone-200/80 dark:border-[#342f2b] rounded-2xl overflow-hidden shadow-xs">
                <button
                  onClick={() => setExpandedArticle(expandedArticle === 'what-is-endo' ? null : 'what-is-endo')}
                  className="w-full p-5 sm:p-6 bg-[#faf8f6] dark:bg-[#23201d] hover:bg-indigo-50/40 dark:hover:bg-[#2a2622] flex justify-between items-center text-left transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl" aria-hidden="true">🧬</span>
                    <div>
                      <h4 className="text-base font-serif font-bold text-stone-900 dark:text-stone-100">1. What is Endometriosis?</h4>
                      <p className="text-xs text-stone-500 dark:text-stone-400">Pathology, cellular differences, and immune dysregulation</p>
                    </div>
                  </div>
                  {expandedArticle === 'what-is-endo' ? <ChevronDown size={20} className="text-indigo-600 dark:text-indigo-400" /> : <ChevronRight size={20} className="text-stone-400" />}
                </button>

                {expandedArticle === 'what-is-endo' && (
                  <div className="p-6 bg-white dark:bg-[#1a1816] space-y-3 text-xs text-stone-700 dark:text-stone-300 leading-relaxed border-t border-stone-200/70 dark:border-[#2e2a26]">
                    <p>
                      Endometriosis is a systemic inflammatory condition where tissue <em>similar to</em> (but biologically distinct from) the endometrium (uterine lining) grows outside the uterus—most commonly on the ovaries, fallopian tubes, uterosacral ligaments, bladder, bowel, and pelvic peritoneum.
                    </p>
                    <p>
                      Unlike the normal uterine lining that exits the body during menstruation, these ectopic lesions swell, break down, and bleed internally during each menstrual cycle. Because this blood and cellular debris has no exit pathway, it triggers localized inflammation, nerve irritation, and progressive fibrotic scar tissue (adhesions).
                    </p>
                    <div className="p-4 bg-indigo-50/60 dark:bg-indigo-950/40 rounded-xl border border-indigo-200/70 dark:border-indigo-800/60 text-xs text-indigo-900 dark:text-indigo-200">
                      <strong>Myth Buster:</strong> Endometriosis is NOT simply "painful periods." It is a whole-body neuro-inflammatory condition that requires expert multidisciplinary management.
                    </div>
                  </div>
                )}
              </div>

              {/* Article 2: Stages and Symptoms */}
              <div className="border border-stone-200/80 dark:border-[#342f2b] rounded-2xl overflow-hidden shadow-xs">
                <button
                  onClick={() => setExpandedArticle(expandedArticle === 'stages' ? null : 'stages')}
                  className="w-full p-5 sm:p-6 bg-[#faf8f6] dark:bg-[#23201d] hover:bg-indigo-50/40 dark:hover:bg-[#2a2622] flex justify-between items-center text-left transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl" aria-hidden="true">📊</span>
                    <div>
                      <h4 className="text-base font-serif font-bold text-stone-900 dark:text-stone-100">2. Clinical Stages & Common Symptoms</h4>
                      <p className="text-xs text-stone-500 dark:text-stone-400">Stages I to IV, superficial vs deep infiltrating endometriosis (DIE)</p>
                    </div>
                  </div>
                  {expandedArticle === 'stages' ? <ChevronDown size={20} className="text-indigo-600 dark:text-indigo-400" /> : <ChevronRight size={20} className="text-stone-400" />}
                </button>

                {expandedArticle === 'stages' && (
                  <div className="p-6 bg-white dark:bg-[#1a1816] space-y-3 text-xs text-stone-700 dark:text-stone-300 leading-relaxed border-t border-stone-200/70 dark:border-[#2e2a26]">
                    <p>
                      The American Society for Reproductive Medicine (ASRM) classifies endometriosis into four stages based on the quantity, depth, and location of implants:
                    </p>
                    <ul className="space-y-1.5 list-disc pl-5 text-xs text-stone-700 dark:text-stone-200">
                      <li><strong>Stage I (Minimal):</strong> Few superficial implants with minimal scar tissue.</li>
                      <li><strong>Stage II (Mild):</strong> More implants penetrating deeper into pelvic tissues.</li>
                      <li><strong>Stage III (Moderate):</strong> Deep implants with visible endometriomas ("chocolate cysts") on one or both ovaries and thin adhesions.</li>
                      <li><strong>Stage IV (Severe):</strong> Deep infiltrating endometriosis (DIE) with dense, thick adhesions binding pelvic organs together (such as uterus to bowel).</li>
                    </ul>
                    <div className="p-4 bg-amber-50 dark:bg-amber-950/40 rounded-xl border border-amber-200 dark:border-amber-800/60 text-xs text-amber-900 dark:text-amber-200">
                      <strong>Important Clinical Fact:</strong> The staging does NOT correlate with pain severity. A patient with Stage I superficial implants can experience excruciating debilitating pain, while a patient with Stage IV may have silent or painless lesions.
                    </div>
                  </div>
                )}
              </div>

              {/* Article 3: Anti-Inflammatory Nutrition */}
              <div className="border border-stone-200/80 dark:border-[#342f2b] rounded-2xl overflow-hidden shadow-xs">
                <button
                  onClick={() => setExpandedArticle(expandedArticle === 'nutrition' ? null : 'nutrition')}
                  className="w-full p-5 sm:p-6 bg-[#faf8f6] dark:bg-[#23201d] hover:bg-indigo-50/40 dark:hover:bg-[#2a2622] flex justify-between items-center text-left transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl" aria-hidden="true">🥑</span>
                    <div>
                      <h4 className="text-base font-serif font-bold text-stone-900 dark:text-stone-100">3. Anti-Inflammatory Nutrition & Diet</h4>
                      <p className="text-xs text-stone-500 dark:text-stone-400">The gut-pelvic microbiome, Omega-3s, and trigger elimination</p>
                    </div>
                  </div>
                  {expandedArticle === 'nutrition' ? <ChevronDown size={20} className="text-indigo-600 dark:text-indigo-400" /> : <ChevronRight size={20} className="text-stone-400" />}
                </button>

                {expandedArticle === 'nutrition' && (
                  <div className="p-6 bg-white dark:bg-[#1a1816] space-y-3 text-xs text-stone-700 dark:text-stone-300 leading-relaxed border-t border-stone-200/70 dark:border-[#2e2a26]">
                    <p>
                      Because endometriosis thrives on systemic inflammation and localized estrogen dominance, strategic dietary habits can significantly soothe symptom severity:
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs pt-1">
                      <div className="p-4 bg-emerald-50 dark:bg-emerald-950/35 rounded-xl border border-emerald-200 dark:border-emerald-800/60 space-y-1">
                        <strong className="text-emerald-800 dark:text-emerald-300">✅ Foods to Embrace:</strong>
                        <p className="text-stone-700 dark:text-stone-300">Wild-caught fatty fish (high Omega-3 EPA/DHA), dark leafy greens, berries, extra virgin olive oil, turmeric/curcumin, cruciferous veggies (broccoli, kale for DIM/estrogen detoxification), and fermented foods for gut barrier integrity.</p>
                      </div>
                      <div className="p-4 bg-rose-50 dark:bg-rose-950/35 rounded-xl border border-rose-200 dark:border-rose-800/60 space-y-1">
                        <strong className="text-rose-800 dark:text-rose-300">⚠️ Foods to Moderate or Limit:</strong>
                        <p className="text-stone-700 dark:text-stone-300">Refined sugars (which trigger inflammatory cytokine cascades), industrial trans-fats, excess alcohol (which burdens hepatic estrogen clearance), and high-gluten or dairy if you notice digestive flare triggers.</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Article 4: Pelvic Floor Physical Therapy */}
              <div className="border border-stone-200/80 dark:border-[#342f2b] rounded-2xl overflow-hidden shadow-xs">
                <button
                  onClick={() => setExpandedArticle(expandedArticle === 'pelvic-pt' ? null : 'pelvic-pt')}
                  className="w-full p-5 sm:p-6 bg-[#faf8f6] dark:bg-[#23201d] hover:bg-indigo-50/40 dark:hover:bg-[#2a2622] flex justify-between items-center text-left transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl" aria-hidden="true">🧘‍♀️</span>
                    <div>
                      <h4 className="text-base font-serif font-bold text-stone-900 dark:text-stone-100">4. Pelvic Floor Physical Therapy & Down-Training</h4>
                      <p className="text-xs text-stone-500 dark:text-stone-400">Releasing hypertonicity, trigger-point therapy, and diaphragmatic release</p>
                    </div>
                  </div>
                  {expandedArticle === 'pelvic-pt' ? <ChevronDown size={20} className="text-indigo-600 dark:text-indigo-400" /> : <ChevronRight size={20} className="text-stone-400" />}
                </button>

                {expandedArticle === 'pelvic-pt' && (
                  <div className="p-6 bg-white dark:bg-[#1a1816] space-y-3 text-xs text-stone-700 dark:text-stone-300 leading-relaxed border-t border-stone-200/70 dark:border-[#2e2a26]">
                    <p>
                      When the body experiences chronic pelvic pain, the muscles of the pelvic floor, hips, and lower back involuntarily clench into a perpetual state of contraction called <strong>hypertonicity</strong> (or pelvic floor spasm).
                    </p>
                    <p>
                      This muscle tightness compresses pelvic nerves, worsens dyspareunia (pain with intercourse), causes painful urination or bowel movements, and mimics active endo pain even after surgery.
                    </p>
                    <div className="p-4 bg-purple-50 dark:bg-purple-950/40 rounded-xl border border-purple-200 dark:border-purple-800/60 text-xs text-purple-900 dark:text-purple-200 space-y-1">
                      <strong>How Pelvic PT Helps:</strong>
                      <p className="text-stone-700 dark:text-stone-300">A specialized Pelvic Health Physical Therapist uses gentle internal and external myofascial release, biofeedback, and diaphragmatic "down-training" to teach the pelvic floor how to fully relax and release tension.</p>
                    </div>
                  </div>
                )}
              </div>

            </div>
          </section>
        </div>
      )}

    </div>
  );
};

export default EndometriosisCare;
