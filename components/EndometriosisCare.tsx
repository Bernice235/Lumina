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
      alert('Please select at least one pain location.');
      return;
    }

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

    setUser(updatedUser);
    localStorage.setItem('lumina_user', JSON.stringify(updatedUser));
    
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
    setUser(updatedUser);
    localStorage.setItem('lumina_user', JSON.stringify(updatedUser));
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

    setUser(updatedUser);
    localStorage.setItem('lumina_user', JSON.stringify(updatedUser));
    
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
    setUser(updatedUser);
    localStorage.setItem('lumina_user', JSON.stringify(updatedUser));
  };

  const handleToggleQuestion = (id: string) => {
    const updatedQuestions = specialistQuestions.map(q => 
      q.id === id ? { ...q, isChecked: !q.isChecked } : q
    );
    const updatedUser: User = {
      ...user,
      endoSpecialistQuestions: updatedQuestions
    };
    setUser(updatedUser);
    localStorage.setItem('lumina_user', JSON.stringify(updatedUser));
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
    setUser(updatedUser);
    localStorage.setItem('lumina_user', JSON.stringify(updatedUser));
    setCustomQuestion('');
  };

  const handleDeleteQuestion = (id: string) => {
    const updatedQuestions = specialistQuestions.filter(q => q.id !== id);
    const updatedUser: User = {
      ...user,
      endoSpecialistQuestions: updatedQuestions
    };
    setUser(updatedUser);
    localStorage.setItem('lumina_user', JSON.stringify(updatedUser));
  };

  const handlePrintSummary = () => {
    window.print();
  };

  // Helper for pain severity label & color
  const getIntensityBadge = (val: number) => {
    if (val <= 3) return { label: 'Mild Discomfort', color: 'bg-emerald-50 text-emerald-600 border-emerald-200' };
    if (val <= 6) return { label: 'Moderate Flare', color: 'bg-amber-50 text-amber-700 border-amber-200' };
    if (val <= 8) return { label: 'Severe Pain', color: 'bg-orange-50 text-orange-700 border-orange-200' };
    return { label: 'Debilitating Crisis', color: 'bg-rose-50 text-rose-700 border-rose-200 animate-pulse' };
  };

  return (
    <div className="space-y-8 animate-fadeIn text-gray-800">
      
      {/* Hero Header Banner */}
      <section className="bg-gradient-to-br from-indigo-950 via-purple-950 to-slate-900 text-white p-8 md:p-10 rounded-[3rem] shadow-xl relative overflow-hidden">
        <div className="relative z-10 space-y-4 max-w-3xl">
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-3.5 py-1 bg-indigo-500/30 text-indigo-200 rounded-full text-[9px] font-black uppercase tracking-widest border border-indigo-400/30 flex items-center gap-1.5">
              <ShieldCheck size={12} className="text-indigo-300" /> Comprehensive Clinical & Somatic Support
            </span>
            <span className="px-3 py-1 bg-pink-500/20 text-pink-200 rounded-full text-[9px] font-black uppercase tracking-widest border border-pink-400/20">
              Endo Care Sanctuary
            </span>
          </div>

          <div className="space-y-2">
            <h2 className="text-3xl md:text-4xl font-serif italic text-indigo-100 font-bold leading-tight">
              Endometriosis Care & Recovery
            </h2>
            <p className="text-sm text-indigo-200/90 font-serif italic leading-relaxed">
              Empowering your journey with clinical pain tracking, restorative somatic movement, mental wellness validation, specialist visit preparation, and evidence-based learning.
            </p>
          </div>

          {/* Quick Hub Jump Pills */}
          <div className="flex flex-wrap gap-2 pt-1">
            <button
              onClick={() => {
                setSubTab('specialist');
                setShowPrintReport(true);
              }}
              className="px-4 py-2 bg-teal-500/20 hover:bg-teal-500/30 text-teal-200 border border-teal-400/30 rounded-xl text-[10px] font-bold tracking-wider uppercase transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Printer size={13} className="text-teal-300" /> Printable Clinical Summary
            </button>
            <button
              onClick={() => setSubTab('specialist')}
              className="px-4 py-2 bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-200 border border-indigo-400/30 rounded-xl text-[10px] font-bold tracking-wider uppercase transition-all flex items-center gap-1.5 cursor-pointer"
            >
              🩺 Specialist Visit Prep
            </button>
            <button
              onClick={() => setSubTab('fertility')}
              className="px-4 py-2 bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 border border-rose-400/30 rounded-xl text-[10px] font-bold tracking-wider uppercase transition-all flex items-center gap-1.5 cursor-pointer"
            >
              🌸 Fertility & Family Planning
            </button>
            <button
              onClick={() => setSubTab('learning')}
              className="px-4 py-2 bg-purple-500/20 hover:bg-purple-500/30 text-purple-200 border border-purple-400/30 rounded-xl text-[10px] font-bold tracking-wider uppercase transition-all flex items-center gap-1.5 cursor-pointer"
            >
              📚 Learning Hub
            </button>
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
            <div className="bg-white/5 backdrop-blur-md p-3.5 rounded-2xl border border-white/10 text-center">
              <p className="text-xl font-serif font-bold text-pink-300">{painLogs.length}</p>
              <p className="text-[8px] uppercase tracking-widest text-indigo-200/70 font-black">Logged Spells</p>
            </div>
            <div className="bg-white/5 backdrop-blur-md p-3.5 rounded-2xl border border-white/10 text-center">
              <p className="text-xl font-serif font-bold text-purple-300">
                {painLogs.length > 0 ? (painLogs.reduce((a, b) => a + b.intensity, 0) / painLogs.length).toFixed(1) : '0.0'}
              </p>
              <p className="text-[8px] uppercase tracking-widest text-indigo-200/70 font-black">Avg Intensity (1-10)</p>
            </div>
            <div className="bg-white/5 backdrop-blur-md p-3.5 rounded-2xl border border-white/10 text-center">
              <p className="text-xl font-serif font-bold text-teal-300">{mentalLogs.length}</p>
              <p className="text-[8px] uppercase tracking-widest text-indigo-200/70 font-black">Wellness Check-ins</p>
            </div>
            <div className="bg-white/5 backdrop-blur-md p-3.5 rounded-2xl border border-white/10 text-center">
              <p className="text-xl font-serif font-bold text-amber-300">
                {specialistQuestions.filter(q => q.isChecked).length}
              </p>
              <p className="text-[8px] uppercase tracking-widest text-indigo-200/70 font-black">Specialist Questions</p>
            </div>
          </div>
        </div>

        <span className="absolute -bottom-10 -right-10 text-[14rem] opacity-5 select-none pointer-events-none">🛡️</span>
      </section>

      {/* Sub-Navigation Grid / Tabs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 bg-indigo-50/60 p-2 rounded-[2.2rem] border border-indigo-100/80 shadow-sm">
        {[
          { id: 'pain', label: 'Pain Tracking', subtitle: 'Patterns & Flares', icon: '📍' },
          { id: 'recovery', label: 'Energy & Recovery', subtitle: 'Somatic Breath & Movement', icon: '🌿' },
          { id: 'mental', label: 'Mental Wellness', subtitle: 'Resilience Check-in', icon: '🧠' },
          { id: 'specialist', label: 'Specialist Prep', subtitle: 'Questions & Clinical Export', icon: '🩺' },
          { id: 'fertility', label: 'Fertility & Planning', subtitle: 'Ovarian Health & Tests', icon: '🌸' },
          { id: 'learning', label: 'Endo Learning Hub', subtitle: 'Articles & Staging', icon: '📚' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setSubTab(tab.id as any)}
            className={`p-3 rounded-[1.6rem] transition-all flex flex-col items-center justify-center text-center gap-1 cursor-pointer ${
              subTab === tab.id
                ? 'bg-gradient-to-br from-indigo-600 to-purple-600 text-white shadow-md scale-[1.02]'
                : 'bg-white/70 hover:bg-white text-indigo-950 border border-indigo-50 hover:border-indigo-200 shadow-sm'
            }`}
          >
            <span className="text-xl">{tab.icon}</span>
            <span className="text-[11px] font-black uppercase tracking-wider leading-tight">{tab.label}</span>
            <span className={`text-[9px] font-medium leading-none ${subTab === tab.id ? 'text-indigo-200' : 'text-gray-400'}`}>
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
          <section className="bg-white p-8 rounded-[3rem] border border-indigo-100 shadow-sm space-y-6">
            <div className="space-y-1">
              <span className="px-3 py-1 bg-indigo-50 text-indigo-600 rounded-full text-[9px] font-black uppercase tracking-wider">Clinical symptom tracker</span>
              <h3 className="text-2xl font-serif italic text-slate-800 font-bold">Log Pain Pattern</h3>
              <p className="text-xs text-gray-500 font-serif italic">
                Capturing precise pain locations, intensity, duration, and triggers helps you and your specialist identify cyclical patterns and nerve involvement.
              </p>
            </div>

            {/* Pain Intensity Slider */}
            <div className="p-6 bg-indigo-50/30 rounded-3xl border border-indigo-100/50 space-y-4">
              <div className="flex justify-between items-center">
                <label className="text-[11px] font-black uppercase text-indigo-950 tracking-wider flex items-center gap-1.5">
                  <Flame size={14} className="text-rose-500" /> Pain Intensity (1 - 10)
                </label>
                <span className={`px-3 py-1 rounded-full text-xs font-bold border ${getIntensityBadge(painIntensity).color}`}>
                  {painIntensity} / 10 • {getIntensityBadge(painIntensity).label}
                </span>
              </div>
              <input
                type="range"
                min="1"
                max="10"
                value={painIntensity}
                onChange={e => setPainIntensity(parseInt(e.target.value))}
                className="w-full h-2.5 bg-indigo-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
              />
              <div className="flex justify-between text-[9px] text-gray-400 font-mono font-bold">
                <span>1 (Mild discomfort)</span>
                <span>5 (Moderate flare)</span>
                <span>8 (Severe distress)</span>
                <span>10 (Debilitating crisis)</span>
              </div>
            </div>

            {/* Pain Location Selector */}
            <div className="space-y-2.5">
              <label className="text-[11px] font-black uppercase text-indigo-950 tracking-wider flex items-center gap-1.5">
                <MapPin size={14} className="text-indigo-500" /> Pain Location (Select all that apply)
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
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                        isSelected
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm scale-105'
                          : 'bg-gray-50 text-gray-600 border-gray-200 hover:border-indigo-300'
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
                <label className="text-[11px] font-black uppercase text-indigo-950 tracking-wider flex items-center gap-1.5">
                  <Clock size={14} className="text-indigo-500" /> Duration of Flare
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {['< 1 hour', '1 - 4 hours', '4 - 8 hours', 'All Day (8+ hrs)', 'Multi-Day Flare'].map(dur => (
                    <button
                      key={dur}
                      type="button"
                      onClick={() => setPainDuration(dur)}
                      className={`py-2 px-3 rounded-xl text-xs font-bold transition-all border text-center cursor-pointer ${
                        painDuration === dur
                          ? 'bg-purple-600 text-white border-purple-600 shadow-sm'
                          : 'bg-gray-50 text-gray-600 border-gray-200 hover:border-purple-300'
                      }`}
                    >
                      {dur}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2.5">
                <label className="text-[11px] font-black uppercase text-indigo-950 tracking-wider flex items-center gap-1.5">
                  <Zap size={14} className="text-indigo-500" /> Pain Sensation / Quality
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
                        className={`px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all border cursor-pointer ${
                          isSelected
                            ? 'bg-rose-500 text-white border-rose-500 shadow-sm'
                            : 'bg-gray-50 text-gray-600 border-gray-200 hover:border-rose-300'
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
              <label className="text-[11px] font-black uppercase text-indigo-950 tracking-wider flex items-center gap-1.5">
                <Target size={14} className="text-indigo-500" /> Suspected Triggers
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
                      className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                        isSelected
                          ? 'bg-amber-500 text-white border-amber-500 shadow-sm'
                          : 'bg-gray-50 text-gray-600 border-gray-200 hover:border-amber-300'
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
              <label className="text-[11px] font-black uppercase text-indigo-950 tracking-wider">
                Personal Reflections or Relief Methods Tried (Optional)
              </label>
              <textarea
                value={painNotes}
                onChange={e => setPainNotes(e.target.value)}
                placeholder="e.g. Used heat pack on sacrum for 30 mins, ginger tea helped relieve cramping..."
                rows={2}
                className="w-full p-4 rounded-2xl bg-indigo-50/30 border border-indigo-100 text-xs text-gray-700 outline-none focus:border-indigo-400 shadow-inner font-serif italic"
              />
            </div>

            {painSuccessMsg && (
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-700 font-bold text-xs flex items-center gap-2 animate-fadeIn">
                <CheckCircle2 size={16} /> {painSuccessMsg}
              </div>
            )}

            {/* Save Button */}
            <button
              onClick={handleSavePainLog}
              className="w-full py-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-black text-xs uppercase tracking-widest rounded-2xl shadow-md hover:scale-[1.01] transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <span>💾</span> Save Pain Pattern Record
            </button>
          </section>

          {/* Past Pain Records List */}
          <section className="bg-white p-8 rounded-[3rem] border border-indigo-100 shadow-sm space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h4 className="text-xl font-serif italic font-bold text-slate-800">Pain Pattern History</h4>
                <p className="text-xs text-gray-400">Review past flare-ups and share with your specialist</p>
              </div>
              <span className="text-xs font-mono font-bold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full">
                {painLogs.length} Records
              </span>
            </div>

            {painLogs.length === 0 ? (
              <div className="p-10 text-center space-y-2 bg-indigo-50/20 rounded-3xl border border-indigo-50">
                <p className="text-3xl">🌸</p>
                <p className="text-xs text-gray-500 font-serif italic font-medium">
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
                      className="p-5 rounded-2xl bg-indigo-50/20 border border-indigo-100/60 hover:border-indigo-200 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
                    >
                      <div className="space-y-2">
                        <div className="flex items-center gap-3">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${badge.color}`}>
                            {log.intensity}/10 • {badge.label}
                          </span>
                          <span className="text-xs font-mono text-gray-400">{log.date}</span>
                          <span className="text-[10px] font-bold text-purple-600 bg-purple-50 px-2 py-0.5 rounded-md">
                            ⏳ {log.duration}
                          </span>
                        </div>

                        <div className="flex flex-wrap gap-1.5 text-xs text-slate-700">
                          <span className="font-bold text-indigo-900">Locations:</span>
                          {log.locations.map(l => (
                            <span key={l} className="bg-white border border-gray-200 px-2 py-0.5 rounded-lg text-[10px] font-medium">
                              {l}
                            </span>
                          ))}
                        </div>

                        {log.triggers && log.triggers.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 text-xs text-slate-700">
                            <span className="font-bold text-amber-900">Triggers:</span>
                            {log.triggers.map(t => (
                              <span key={t} className="bg-amber-50/70 border border-amber-200/60 text-amber-800 px-2 py-0.5 rounded-lg text-[10px]">
                                {t}
                              </span>
                            ))}
                          </div>
                        )}

                        {log.notes && (
                          <p className="text-xs text-gray-600 font-serif italic pt-1">
                            "{log.notes}"
                          </p>
                        )}
                      </div>

                      <button
                        onClick={() => handleDeletePainLog(log.id)}
                        className="p-2.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors self-end md:self-center cursor-pointer"
                        title="Delete log"
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
          <section className="bg-gradient-to-r from-indigo-900 to-purple-900 text-white p-8 rounded-[3rem] shadow-md space-y-5 relative overflow-hidden">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative z-10">
              <div className="space-y-1">
                <span className="px-3 py-1 bg-white/10 rounded-full text-[9px] font-black uppercase tracking-widest text-indigo-200">
                  Nervous System Down-Regulation
                </span>
                <h3 className="text-2xl font-serif italic font-bold">4-7-8 Pelvic Calming Breath</h3>
                <p className="text-xs text-indigo-200/80 font-serif italic max-w-xl">
                  Activates the parasympathetic vagus nerve, calming pelvic floor muscle guarding and soothing chronic pain signals.
                </p>
              </div>

              <button
                onClick={() => setIsBreathingActive(!isBreathingActive)}
                className={`px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-lg cursor-pointer ${
                  isBreathingActive
                    ? 'bg-rose-500 hover:bg-rose-600 text-white animate-pulse'
                    : 'bg-white text-indigo-950 hover:bg-indigo-50'
                }`}
              >
                {isBreathingActive ? '⏹ Stop Somatic Breath' : '▶ Begin Somatic Breathing'}
              </button>
            </div>

            {isBreathingActive && (
              <div className="p-8 bg-white/10 rounded-3xl border border-white/20 text-center space-y-4 animate-fadeIn relative z-10">
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-indigo-400 to-pink-400 flex items-center justify-center mx-auto text-3xl font-mono font-bold shadow-2xl animate-pulse">
                  {breathCounter}
                </div>
                <div className="space-y-1">
                  <h4 className="text-xl font-serif italic font-bold text-pink-300">{breathPhase}</h4>
                  <p className="text-xs text-indigo-100 font-serif italic">
                    {breathPhase.startsWith('Inhale') && "Inhale deeply through your nose, expanding your lower abdomen and pelvic bowl..."}
                    {breathPhase.startsWith('Hold') && "Hold gently with relaxed shoulders and softened jaw..."}
                    {breathPhase.startsWith('Exhale') && "Exhale completely through parted lips, letting all pelvic tension melt away..."}
                  </p>
                </div>
              </div>
            )}
          </section>

          {/* Gentle Stretching Recommendations */}
          <section className="bg-white p-8 rounded-[3rem] border border-indigo-100 shadow-sm space-y-6">
            <div className="space-y-1">
              <span className="px-3 py-1 bg-purple-50 text-purple-600 rounded-full text-[9px] font-black uppercase tracking-wider">
                Restorative Somatic Movement
              </span>
              <h3 className="text-2xl font-serif italic text-slate-800 font-bold">Gentle Stretching for Pelvic Relief</h3>
              <p className="text-xs text-gray-500 font-serif italic">
                These non-compressive stretches help release hypertonic pelvic tension, ease lower back stiffness, and stimulate lymphatic drainage.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {STRETCHES.map((st, i) => (
                <div key={i} className="p-6 bg-indigo-50/20 border border-indigo-100/50 rounded-3xl space-y-3 hover:border-indigo-200 transition-all flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-2.5">
                        <span className="text-2xl">{st.icon}</span>
                        <h4 className="text-sm font-serif font-bold text-indigo-950 italic">{st.name}</h4>
                      </div>
                      <span className="text-[9px] font-black uppercase bg-indigo-100 text-indigo-600 px-2 py-0.5 rounded-full">
                        {st.duration}
                      </span>
                    </div>
                    <p className="text-xs text-indigo-700 font-serif italic font-medium">{st.benefit}</p>
                    <p className="text-[11px] text-gray-500 leading-relaxed font-sans pt-1">
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
            <section className="bg-white p-8 rounded-[3rem] border border-indigo-100 shadow-sm space-y-4">
              <div className="flex items-center gap-3">
                <span className="text-3xl">🚶‍♀️</span>
                <div>
                  <h4 className="text-lg font-serif italic font-bold text-slate-800">Mindful Walking Recommendations</h4>
                  <p className="text-xs text-gray-400">Pacing your movement without triggering flares</p>
                </div>
              </div>

              <ul className="space-y-3 text-xs text-gray-600 font-serif italic leading-relaxed pt-2">
                <li className="flex gap-2">
                  <span className="text-indigo-400 font-bold">•</span>
                  <span><strong>10-15 Minute Gentle Pacing:</strong> Short, slow-paced flat surface walks stimulate pelvic blood flow and lower systemic inflammation without straining pelvic ligaments.</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-indigo-400 font-bold">•</span>
                  <span><strong>Post-Meal Movement:</strong> A gentle 10-minute stroll post-meals aids gastrointestinal motility and reduces painful "endo belly" gas pressure.</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-indigo-400 font-bold">•</span>
                  <span><strong>Energy Envelope Awareness:</strong> If you feel acute sharp pelvic catches or heavy dragging pressure, pause immediately and transition to horizontal resting.</span>
                </li>
              </ul>
            </section>

            {/* Rest & Recovery Protocols */}
            <section className="bg-white p-8 rounded-[3rem] border border-indigo-100 shadow-sm space-y-4">
              <div className="flex items-center gap-3">
                <span className="text-3xl">🛌</span>
                <div>
                  <h4 className="text-lg font-serif italic font-bold text-slate-800">Rest & Flare Recovery Protocols</h4>
                  <p className="text-xs text-gray-400">Nurturing comfort during active pain spells</p>
                </div>
              </div>

              <ul className="space-y-3 text-xs text-gray-600 font-serif italic leading-relaxed pt-2">
                <li className="flex gap-2">
                  <span className="text-rose-400 font-bold">•</span>
                  <span><strong>Pelvic & Sacral Heat Therapy:</strong> Apply a moist heating pad or warm water bottle over the lower pelvis and sacrum for 20 minutes to relax vascular spasms.</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-rose-400 font-bold">•</span>
                  <span><strong>Warm Epsom Salt Soak:</strong> Magnesium sulfate absorbed in warm water promotes systemic muscle relaxation and eases neuro-inflammatory pain loops.</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-rose-400 font-bold">•</span>
                  <span><strong>Anti-Constriction Clothing:</strong> Avoid tight high-waisted bands; embrace breathable, ultra-soft natural bamboo or silk garments.</span>
                </li>
              </ul>
            </section>
          </div>

          {/* Sleep Tracking Suggestions */}
          <section className="bg-indigo-950 text-white p-8 rounded-[3rem] shadow-md space-y-4">
            <div className="flex items-center gap-3">
              <span className="text-3xl">🌙</span>
              <div>
                <h4 className="text-xl font-serif italic font-bold text-indigo-200">Sleep Suggestions During Endo Flares</h4>
                <p className="text-xs text-indigo-300/80 font-serif italic">Optimizing nocturnal restorative recovery</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
              <div className="p-4 bg-white/5 rounded-2xl border border-white/10 space-y-1.5">
                <span className="text-xs font-bold text-pink-300">Side-Sleeping Alignment</span>
                <p className="text-[11px] text-gray-300 leading-relaxed font-serif italic">
                  Sleep on your side with a contour pillow between your knees to keep your pelvis neutral and un-twist the sacroiliac joints.
                </p>
              </div>

              <div className="p-4 bg-white/5 rounded-2xl border border-white/10 space-y-1.5">
                <span className="text-xs font-bold text-purple-300">Topical Magnesium & Tea</span>
                <p className="text-[11px] text-gray-300 leading-relaxed font-serif italic">
                  Sip warm chamomile or ginger tea and apply topical magnesium lotion to your lower abdomen 30 minutes before rest.
                </p>
              </div>

              <div className="p-4 bg-white/5 rounded-2xl border border-white/10 space-y-1.5">
                <span className="text-xs font-bold text-teal-300">Zero Blue-Light Wind Down</span>
                <p className="text-[11px] text-gray-300 leading-relaxed font-serif italic">
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
          
          <section className="bg-white p-8 rounded-[3rem] border border-indigo-100 shadow-sm space-y-6">
            <div className="space-y-1">
              <span className="px-3 py-1 bg-pink-50 text-pink-600 rounded-full text-[9px] font-black uppercase tracking-wider">Compassionate self-care</span>
              <h3 className="text-2xl font-serif italic text-slate-800 font-bold">Mental Wellness Check-In</h3>
              <p className="text-xs text-gray-500 font-serif italic">
                Living with chronic pelvic pain takes immense mental and emotional strength. Honor how you are truly feeling today without judgment.
              </p>
            </div>

            {/* Mood Selector */}
            <div className="space-y-2.5">
              <label className="text-[11px] font-black uppercase text-indigo-950 tracking-wider flex items-center gap-1.5">
                <Smile size={14} className="text-pink-500" /> Current Emotional State / Mood
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
                    className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition-all border flex items-center gap-1.5 cursor-pointer ${
                      mentalMood === m.label
                        ? 'bg-pink-500 text-white border-pink-500 shadow-md scale-105'
                        : 'bg-gray-50 text-gray-700 border-gray-200 hover:border-pink-300'
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
                <label className="text-[11px] font-black uppercase text-indigo-950 tracking-wider flex items-center gap-1.5">
                  <Activity size={14} className="text-indigo-500" /> Stress Level
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {(['Low', 'Moderate', 'High', 'Severe'] as const).map(lvl => (
                    <button
                      key={lvl}
                      type="button"
                      onClick={() => setStressLevel(lvl)}
                      className={`py-2.5 px-3 rounded-xl text-xs font-bold transition-all border text-center cursor-pointer ${
                        stressLevel === lvl
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                          : 'bg-gray-50 text-gray-700 border-gray-200 hover:border-indigo-300'
                      }`}
                    >
                      {lvl} Stress
                    </button>
                  ))}
                </div>
              </div>

              {/* Impact on Daily Activities */}
              <div className="space-y-2.5">
                <label className="text-[11px] font-black uppercase text-indigo-950 tracking-wider flex items-center gap-1.5">
                  <Target size={14} className="text-indigo-500" /> Impact of Symptoms on Today
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
                      className={`w-full py-2 px-3 rounded-xl text-xs font-bold transition-all border text-left cursor-pointer ${
                        dailyImpact === imp
                          ? 'bg-purple-600 text-white border-purple-600 shadow-sm'
                          : 'bg-gray-50 text-gray-700 border-gray-200 hover:border-purple-300'
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
              <label className="text-[11px] font-black uppercase text-indigo-950 tracking-wider">
                Personal Mental Reflection (Optional)
              </label>
              <textarea
                value={mentalNotes}
                onChange={e => setMentalNotes(e.target.value)}
                placeholder="How are you taking care of your spirit today? What boundaries are you setting?"
                rows={2}
                className="w-full p-4 rounded-2xl bg-pink-50/30 border border-pink-100 text-xs text-gray-700 outline-none focus:border-pink-400 shadow-inner font-serif italic"
              />
            </div>

            {mentalSuccessMsg && (
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-700 font-bold text-xs flex items-center gap-2 animate-fadeIn">
                <CheckCircle2 size={16} /> {mentalSuccessMsg}
              </div>
            )}

            <button
              onClick={handleSaveMentalLog}
              className="w-full py-4 bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white font-black text-xs uppercase tracking-widest rounded-2xl shadow-md hover:scale-[1.01] transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <span>💖</span> Save Mental Wellness Check-In
            </button>
          </section>

          {/* Past Mental Check-Ins */}
          <section className="bg-white p-8 rounded-[3rem] border border-indigo-100 shadow-sm space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h4 className="text-xl font-serif italic font-bold text-slate-800">Mental Wellness History</h4>
                <p className="text-xs text-gray-400">Track how your emotional resilience shifts throughout your cycle</p>
              </div>
              <span className="text-xs font-mono font-bold text-pink-600 bg-pink-50 px-3 py-1 rounded-full">
                {mentalLogs.length} Check-ins
              </span>
            </div>

            {mentalLogs.length === 0 ? (
              <div className="p-8 text-center bg-pink-50/20 rounded-3xl border border-pink-50">
                <p className="text-xs text-gray-500 font-serif italic">
                  No mental wellness check-ins recorded yet. Check in with yourself whenever you need a moment of pause.
                </p>
              </div>
            ) : (
              <div className="space-y-3 pt-2">
                {mentalLogs.map(log => (
                  <div
                    key={log.id}
                    className="p-5 rounded-2xl bg-pink-50/20 border border-pink-100/60 hover:border-pink-200 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center gap-3">
                        <span className="px-3 py-0.5 rounded-full text-[10px] font-bold bg-pink-100 text-pink-700 border border-pink-200">
                          {log.mood}
                        </span>
                        <span className="text-xs font-mono text-gray-400">{log.date}</span>
                        <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md">
                          Stress: {log.stressLevel}
                        </span>
                      </div>

                      <p className="text-xs text-gray-700 font-medium">
                        <span className="font-bold text-purple-900">Activity Impact:</span> {log.impactOnDailyActivities}
                      </p>

                      {log.notes && (
                        <p className="text-xs text-gray-600 font-serif italic pt-1">
                          "{log.notes}"
                        </p>
                      )}
                    </div>

                    <button
                      onClick={() => handleDeleteMentalLog(log.id)}
                      className="p-2.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors self-end md:self-center cursor-pointer"
                      title="Delete log"
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
          
          <section className="bg-white p-8 rounded-[3rem] border border-indigo-100 shadow-sm space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div className="space-y-1">
                <span className="px-3 py-1 bg-teal-50 text-teal-700 rounded-full text-[9px] font-black uppercase tracking-wider">
                  Clinical Advocacy Toolkit
                </span>
                <h3 className="text-2xl font-serif italic text-slate-800 font-bold">Specialist Visit Preparation</h3>
                <p className="text-xs text-gray-500 font-serif italic">
                  Select key questions to ask your gynecological excision specialist, add your custom questions, and export a full clinical summary.
                </p>
              </div>

              <button
                onClick={() => setShowPrintReport(!showPrintReport)}
                className="px-6 py-3 bg-gradient-to-r from-teal-600 to-indigo-600 text-white font-black text-xs uppercase tracking-widest rounded-2xl shadow-md hover:scale-105 transition-all cursor-pointer flex items-center gap-2"
              >
                <Printer size={15} /> {showPrintReport ? 'Hide Clinical Report' : 'Generate & Print Visit Summary'}
              </button>
            </div>

            {/* Printable Specialist Summary Report Preview Modal/Section */}
            {showPrintReport && (
              <div className="p-8 bg-slate-50 border-2 border-indigo-300 rounded-[2.5rem] space-y-6 print:border-none print:p-0">
                <div className="flex justify-between items-start border-b border-gray-200 pb-4">
                  <div>
                    <h4 className="text-2xl font-serif font-bold text-slate-900">Lumina Endometriosis Clinical Summary</h4>
                    <p className="text-xs text-gray-500">Prepared for Specialist Consultation • Patient: {user.name}</p>
                  </div>
                  <button
                    onClick={handlePrintSummary}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold uppercase tracking-wider rounded-xl shadow-sm cursor-pointer flex items-center gap-1.5"
                  >
                    <Printer size={13} /> Print Document
                  </button>
                </div>

                {/* Summary Snapshot */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
                  <div className="p-3 bg-white rounded-xl border border-gray-200">
                    <p className="text-xs text-gray-400 font-bold uppercase">Cycle Length</p>
                    <p className="text-base font-bold text-slate-800">{user.cycleLength || 28} Days</p>
                  </div>
                  <div className="p-3 bg-white rounded-xl border border-gray-200">
                    <p className="text-xs text-gray-400 font-bold uppercase">Pain Flare Records</p>
                    <p className="text-base font-bold text-slate-800">{painLogs.length}</p>
                  </div>
                  <div className="p-3 bg-white rounded-xl border border-gray-200">
                    <p className="text-xs text-gray-400 font-bold uppercase">Avg Flare Intensity</p>
                    <p className="text-base font-bold text-slate-800">
                      {painLogs.length > 0 ? (painLogs.reduce((a, b) => a + b.intensity, 0) / painLogs.length).toFixed(1) : 'N/A'}/10
                    </p>
                  </div>
                  <div className="p-3 bg-white rounded-xl border border-gray-200">
                    <p className="text-xs text-gray-400 font-bold uppercase">Selected Questions</p>
                    <p className="text-base font-bold text-slate-800">
                      {specialistQuestions.filter(q => q.isChecked).length}
                    </p>
                  </div>
                </div>

                {/* Selected Questions Section in Printout */}
                <div className="space-y-2">
                  <h5 className="text-sm font-bold uppercase tracking-wider text-slate-800">Consultation Questions Selected:</h5>
                  <ul className="space-y-2 list-disc pl-5 text-xs text-gray-700 leading-relaxed">
                    {specialistQuestions.filter(q => q.isChecked).map(q => (
                      <li key={q.id}>
                        <strong>[{q.category}]</strong> {q.question}
                      </li>
                    ))}
                    {specialistQuestions.filter(q => q.isChecked).length === 0 && (
                      <p className="text-xs text-gray-400 italic">No specific questions checked yet.</p>
                    )}
                  </ul>
                </div>

                {/* Recent Pain Flare Summary in Printout */}
                {painLogs.length > 0 && (
                  <div className="space-y-2">
                    <h5 className="text-sm font-bold uppercase tracking-wider text-slate-800">Recent Pain Pattern Logs:</h5>
                    <div className="space-y-1.5 text-xs text-gray-700">
                      {painLogs.slice(0, 5).map(l => (
                        <div key={l.id} className="p-2.5 bg-white rounded-lg border border-gray-200 flex justify-between items-center">
                          <span><strong>{l.date}</strong>: {l.intensity}/10 intensity ({l.duration}) — Locations: {l.locations.join(', ')}</span>
                          {l.triggers && <span className="text-[10px] text-gray-500">Triggers: {l.triggers.join(', ')}</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Questions Checklist */}
            <div className="space-y-4">
              <h4 className="text-base font-serif italic font-bold text-indigo-950">Recommended Questions for Your Specialist</h4>
              
              {/* Grouped Questions */}
              {['Diagnostics & Imaging', 'Surgical & Excision Options', 'Pain & Medical Management', 'Pelvic Physical Therapy', 'Fertility & Family Planning', 'General Consultation'].map(cat => {
                const groupQuestions = specialistQuestions.filter(q => q.category === cat);
                if (groupQuestions.length === 0) return null;

                return (
                  <div key={cat} className="space-y-2 pt-2">
                    <h5 className="text-xs font-black uppercase tracking-wider text-indigo-600 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-indigo-500"></span> {cat}
                    </h5>
                    <div className="space-y-2">
                      {groupQuestions.map(q => (
                        <div
                          key={q.id}
                          onClick={() => handleToggleQuestion(q.id)}
                          className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-start justify-between gap-3 ${
                            q.isChecked
                              ? 'bg-indigo-50/70 border-indigo-300 text-indigo-950 font-medium'
                              : 'bg-gray-50/60 border-gray-200 text-gray-600 hover:border-indigo-200'
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            {q.isChecked ? (
                              <CheckCircle2 size={18} className="text-indigo-600 shrink-0 mt-0.5" />
                            ) : (
                              <Circle size={18} className="text-gray-300 shrink-0 mt-0.5" />
                            )}
                            <p className="text-xs leading-relaxed font-serif italic">{q.question}</p>
                          </div>

                          {q.isCustom && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteQuestion(q.id);
                              }}
                              className="text-gray-400 hover:text-red-500 p-1"
                              title="Delete custom question"
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
            <div className="p-6 bg-indigo-50/30 rounded-3xl border border-indigo-100/60 space-y-3">
              <h5 className="text-xs font-black uppercase tracking-wider text-indigo-900">Add Your Own Custom Question</h5>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  value={customQuestion}
                  onChange={e => setCustomQuestion(e.target.value)}
                  placeholder="Type a specific question you want to ask your doctor..."
                  className="flex-1 p-3.5 rounded-2xl bg-white border border-indigo-200 text-xs text-gray-800 outline-none focus:border-indigo-500 shadow-inner font-serif italic"
                />
                <button
                  onClick={handleAddCustomQuestion}
                  className="px-6 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs uppercase tracking-wider rounded-2xl shadow-sm transition-all cursor-pointer shrink-0 flex items-center justify-center gap-1.5"
                >
                  <Plus size={15} /> Add Question
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
          
          <section className="bg-white p-8 rounded-[3rem] border border-indigo-100 shadow-sm space-y-6">
            <div className="space-y-1">
              <span className="px-3 py-1 bg-rose-50 text-rose-600 rounded-full text-[9px] font-black uppercase tracking-wider">
                Reproductive Health & Planning
              </span>
              <h3 className="text-2xl font-serif italic text-slate-800 font-bold">Fertility & Family Planning with Endometriosis</h3>
              <p className="text-xs text-gray-500 font-serif italic leading-relaxed">
                An evidence-based, compassionate guide to understanding how endometriosis interacts with fertility, what baseline tests to consider, and proactive steps for conception.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
              
              {/* Module 1 */}
              <div className="p-6 bg-rose-50/30 rounded-3xl border border-rose-100/60 space-y-3 flex flex-col justify-between">
                <div className="space-y-2">
                  <span className="text-3xl">🌸</span>
                  <h4 className="text-base font-serif italic font-bold text-rose-950">How Endo Impacts Fertility</h4>
                  <p className="text-xs text-gray-600 font-serif italic leading-relaxed">
                    Endometriosis can influence conception through several pathways:
                  </p>
                  <ul className="space-y-1.5 text-[11px] text-gray-600 font-sans leading-relaxed list-disc pl-4">
                    <li><strong>Peritoneal Cytokines:</strong> Inflammatory fluid in the pelvis can alter sperm motility and egg quality.</li>
                    <li><strong>Adhesions:</strong> Scar tissue can restrict fallopian tube mobility or fimbrial egg capture.</li>
                    <li><strong>Endometriomas:</strong> "Chocolate cysts" on ovaries may affect local blood supply or follicular development.</li>
                  </ul>
                </div>
                <div className="pt-3 border-t border-rose-100">
                  <span className="text-[10px] font-bold text-rose-600 uppercase">Key Takeaway:</span>
                  <p className="text-[10px] text-gray-500 font-serif italic">Many women with endometriosis conceive naturally, and early baseline knowledge provides control.</p>
                </div>
              </div>

              {/* Module 2 */}
              <div className="p-6 bg-purple-50/30 rounded-3xl border border-purple-100/60 space-y-3 flex flex-col justify-between">
                <div className="space-y-2">
                  <span className="text-3xl">🔬</span>
                  <h4 className="text-base font-serif italic font-bold text-purple-950">Planning Ahead & Tests</h4>
                  <p className="text-xs text-gray-600 font-serif italic leading-relaxed">
                    Consider discussing these proactive baseline evaluations with your doctor:
                  </p>
                  <ul className="space-y-1.5 text-[11px] text-gray-600 font-sans leading-relaxed list-disc pl-4">
                    <li><strong>AMH (Anti-Müllerian Hormone):</strong> Measures your ovarian reserve baseline.</li>
                    <li><strong>Antral Follicle Count (AFC):</strong> Ultrasound assessment of resting follicles.</li>
                    <li><strong>HSG (Hysterosalpingogram):</strong> Verifies whether fallopian tubes are open and unobstructed.</li>
                    <li><strong>Semen Analysis:</strong> Ensures partner parameters are optimal to avoid compounding factors.</li>
                  </ul>
                </div>
                <div className="pt-3 border-t border-purple-100">
                  <span className="text-[10px] font-bold text-purple-600 uppercase">Action Step:</span>
                  <p className="text-[10px] text-gray-500 font-serif italic">Request an AMH check early to establish your individualized timeline.</p>
                </div>
              </div>

              {/* Module 3 */}
              <div className="p-6 bg-indigo-50/30 rounded-3xl border border-indigo-100/60 space-y-3 flex flex-col justify-between">
                <div className="space-y-2">
                  <span className="text-3xl">🌿</span>
                  <h4 className="text-base font-serif italic font-bold text-indigo-950">Treatment & Conception Insights</h4>
                  <p className="text-xs text-gray-600 font-serif italic leading-relaxed">
                    Options for family planning and fertility preservation:
                  </p>
                  <ul className="space-y-1.5 text-[11px] text-gray-600 font-sans leading-relaxed list-disc pl-4">
                    <li><strong>Excision Surgery Timing:</strong> Surgical removal of active lesions often provides a "fertility window" of reduced inflammation.</li>
                    <li><strong>Assisted Reproduction (IUI / IVF):</strong> IVF bypasses pelvic inflammation and tubal factors directly.</li>
                    <li><strong>Egg / Embryo Freezing:</strong> An empowering preservation option before major ovarian surgery.</li>
                  </ul>
                </div>
                <div className="pt-3 border-t border-indigo-100">
                  <span className="text-[10px] font-bold text-indigo-600 uppercase">Empowerment:</span>
                  <p className="text-[10px] text-gray-500 font-serif italic">Collaborating with a Reproductive Endocrinologist early creates a low-stress roadmap.</p>
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
          
          <section className="bg-white p-8 rounded-[3rem] border border-indigo-100 shadow-sm space-y-6">
            <div className="space-y-1">
              <span className="px-3 py-1 bg-indigo-50 text-indigo-600 rounded-full text-[9px] font-black uppercase tracking-wider">
                Evidence-Based Medical Education
              </span>
              <h3 className="text-2xl font-serif italic text-slate-800 font-bold">Endometriosis Learning Hub</h3>
              <p className="text-xs text-gray-500 font-serif italic leading-relaxed">
                Clear, medically validated articles to help you understand your anatomy, staging, anti-inflammatory nutrition, and pelvic rehabilitation.
              </p>
            </div>

            {/* Expandable Articles List */}
            <div className="space-y-4 pt-2">
              
              {/* Article 1: What is Endo */}
              <div className="border border-indigo-100 rounded-3xl overflow-hidden shadow-sm">
                <button
                  onClick={() => setExpandedArticle(expandedArticle === 'what-is-endo' ? null : 'what-is-endo')}
                  className="w-full p-6 bg-indigo-50/30 hover:bg-indigo-50/60 flex justify-between items-center text-left transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">🧬</span>
                    <div>
                      <h4 className="text-base font-serif italic font-bold text-indigo-950">1. What is Endometriosis?</h4>
                      <p className="text-xs text-gray-500">Pathology, cellular differences, and immune dysregulation</p>
                    </div>
                  </div>
                  {expandedArticle === 'what-is-endo' ? <ChevronDown size={20} className="text-indigo-600" /> : <ChevronRight size={20} className="text-gray-400" />}
                </button>

                {expandedArticle === 'what-is-endo' && (
                  <div className="p-6 bg-white space-y-3 text-xs text-gray-700 font-serif italic leading-relaxed border-t border-indigo-50">
                    <p>
                      Endometriosis is a systemic inflammatory condition where tissue <em>similar to</em> (but biologically distinct from) the endometrium (uterine lining) grows outside the uterus—most commonly on the ovaries, fallopian tubes, uterosacral ligaments, bladder, bowel, and pelvic peritoneum.
                    </p>
                    <p>
                      Unlike the normal uterine lining that exits the body during menstruation, these ectopic lesions swell, break down, and bleed internally during each menstrual cycle. Because this blood and cellular debris has no exit pathway, it triggers localized inflammation, nerve irritation, and progressive fibrotic scar tissue (adhesions).
                    </p>
                    <div className="p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100 font-sans text-xs text-indigo-900 not-italic">
                      <strong>Myth Buster:</strong> Endometriosis is NOT simply "painful periods." It is a whole-body neuro-inflammatory condition that requires expert multidisciplinary management.
                    </div>
                  </div>
                )}
              </div>

              {/* Article 2: Stages and Symptoms */}
              <div className="border border-indigo-100 rounded-3xl overflow-hidden shadow-sm">
                <button
                  onClick={() => setExpandedArticle(expandedArticle === 'stages' ? null : 'stages')}
                  className="w-full p-6 bg-indigo-50/30 hover:bg-indigo-50/60 flex justify-between items-center text-left transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">📊</span>
                    <div>
                      <h4 className="text-base font-serif italic font-bold text-indigo-950">2. Clinical Stages & Common Symptoms</h4>
                      <p className="text-xs text-gray-500">Stages I to IV, superficial vs deep infiltrating endometriosis (DIE)</p>
                    </div>
                  </div>
                  {expandedArticle === 'stages' ? <ChevronDown size={20} className="text-indigo-600" /> : <ChevronRight size={20} className="text-gray-400" />}
                </button>

                {expandedArticle === 'stages' && (
                  <div className="p-6 bg-white space-y-3 text-xs text-gray-700 font-serif italic leading-relaxed border-t border-indigo-50">
                    <p>
                      The American Society for Reproductive Medicine (ASRM) classifies endometriosis into four stages based on the quantity, depth, and location of implants:
                    </p>
                    <ul className="space-y-1.5 list-disc pl-5 font-sans not-italic text-xs text-gray-800">
                      <li><strong>Stage I (Minimal):</strong> Few superficial implants with minimal scar tissue.</li>
                      <li><strong>Stage II (Mild):</strong> More implants penetrating deeper into pelvic tissues.</li>
                      <li><strong>Stage III (Moderate):</strong> Deep implants with visible endometriomas ("chocolate cysts") on one or both ovaries and thin adhesions.</li>
                      <li><strong>Stage IV (Severe):</strong> Deep infiltrating endometriosis (DIE) with dense, thick adhesions binding pelvic organs together (such as uterus to bowel).</li>
                    </ul>
                    <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200 font-sans text-xs text-amber-900 not-italic">
                      <strong>Important Clinical Fact:</strong> The staging does NOT correlate with pain severity. A patient with Stage I superficial implants can experience excruciating debilitating pain, while a patient with Stage IV may have silent or painless lesions.
                    </div>
                  </div>
                )}
              </div>

              {/* Article 3: Anti-Inflammatory Nutrition */}
              <div className="border border-indigo-100 rounded-3xl overflow-hidden shadow-sm">
                <button
                  onClick={() => setExpandedArticle(expandedArticle === 'nutrition' ? null : 'nutrition')}
                  className="w-full p-6 bg-indigo-50/30 hover:bg-indigo-50/60 flex justify-between items-center text-left transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">🥑</span>
                    <div>
                      <h4 className="text-base font-serif italic font-bold text-indigo-950">3. Anti-Inflammatory Nutrition & Diet</h4>
                      <p className="text-xs text-gray-500">The gut-pelvic microbiome, Omega-3s, and trigger elimination</p>
                    </div>
                  </div>
                  {expandedArticle === 'nutrition' ? <ChevronDown size={20} className="text-indigo-600" /> : <ChevronRight size={20} className="text-gray-400" />}
                </button>

                {expandedArticle === 'nutrition' && (
                  <div className="p-6 bg-white space-y-3 text-xs text-gray-700 font-serif italic leading-relaxed border-t border-indigo-50">
                    <p>
                      Because endometriosis thrives on systemic inflammation and localized estrogen dominance, strategic dietary habits can significantly soothe symptom severity:
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 font-sans not-italic text-xs pt-1">
                      <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200 space-y-1">
                        <strong className="text-emerald-800">✅ Foods to Embrace:</strong>
                        <p className="text-gray-700">Wild-caught fatty fish (high Omega-3 EPA/DHA), dark leafy greens, berries, extra virgin olive oil, turmeric/curcumin, cruciferous veggies (broccoli, kale for DIM/estrogen detoxification), and fermented foods for gut barrier integrity.</p>
                      </div>
                      <div className="p-4 bg-rose-50 rounded-2xl border border-rose-200 space-y-1">
                        <strong className="text-rose-800">⚠️ Foods to Moderate or Limit:</strong>
                        <p className="text-gray-700">Refined sugars (which trigger inflammatory cytokine cascades), industrial trans-fats, excess alcohol (which burdens hepatic estrogen clearance), and high-gluten or dairy if you notice digestive flare triggers.</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Article 4: Pelvic Floor Physical Therapy */}
              <div className="border border-indigo-100 rounded-3xl overflow-hidden shadow-sm">
                <button
                  onClick={() => setExpandedArticle(expandedArticle === 'pelvic-pt' ? null : 'pelvic-pt')}
                  className="w-full p-6 bg-indigo-50/30 hover:bg-indigo-50/60 flex justify-between items-center text-left transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">🧘‍♀️</span>
                    <div>
                      <h4 className="text-base font-serif italic font-bold text-indigo-950">4. Pelvic Floor Physical Therapy & Down-Training</h4>
                      <p className="text-xs text-gray-500">Releasing hypertonicity, trigger-point therapy, and diaphragmatic release</p>
                    </div>
                  </div>
                  {expandedArticle === 'pelvic-pt' ? <ChevronDown size={20} className="text-indigo-600" /> : <ChevronRight size={20} className="text-gray-400" />}
                </button>

                {expandedArticle === 'pelvic-pt' && (
                  <div className="p-6 bg-white space-y-3 text-xs text-gray-700 font-serif italic leading-relaxed border-t border-indigo-50">
                    <p>
                      When the body experiences chronic pelvic pain, the muscles of the pelvic floor, hips, and lower back involuntarily clench into a perpetual state of contraction called <strong>hypertonicity</strong> (or pelvic floor spasm).
                    </p>
                    <p>
                      This muscle tightness compresses pelvic nerves, worsens dyspareunia (pain with intercourse), causes painful urination or bowel movements, and mimics active endo pain even after surgery.
                    </p>
                    <div className="p-4 bg-purple-50 rounded-2xl border border-purple-200 font-sans text-xs text-purple-900 not-italic space-y-1">
                      <strong>How Pelvic PT Helps:</strong>
                      <p className="text-gray-700">A specialized Pelvic Health Physical Therapist uses gentle internal and external myofascial release, biofeedback, and diaphragmatic "down-training" to teach the pelvic floor how to fully relax and release tension.</p>
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
