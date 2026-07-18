import React, { useState, useEffect, useRef } from 'react';
import { YOGA_POSES } from '../constants';
import { User } from '../types';
import { getLuminaAdvice } from '../services/gemini';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  Sparkles, 
  Check, 
  Activity, 
  Heart, 
  Info, 
  Volume2, 
  VolumeX, 
  X, 
  ChevronRight, 
  Compass, 
  Flame, 
  MapPin, 
  Sparkle,
  Calendar,
  Award,
  History,
  Trophy,
  Trash2,
  TrendingUp,
  Sliders,
  Smile
} from 'lucide-react';

interface YogaTutorialsProps {
  user: User;
  setUser: React.Dispatch<React.SetStateAction<User | null>>;
  todaysSymptoms: string[];
}

const YogaTutorials: React.FC<YogaTutorialsProps> = ({ user, setUser, todaysSymptoms }) => {
  const [selectedPose, setSelectedPose] = useState<typeof YOGA_POSES[number] | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [tick, setTick] = useState<number>(0);
  const [breathTime, setBreathTime] = useState<number>(0); // 0 to 6 seconds
  const [breathState, setBreathState] = useState<'Inhale' | 'Hold' | 'Exhale'>('Inhale');
  const [breathScale, setBreathScale] = useState<number>(1.0);
  
  // AI advice states
  const [aiAdvice, setAiAdvice] = useState<string>('');
  const [aiLoading, setAiLoading] = useState<boolean>(false);
  const [isChimeEnabled, setIsChimeEnabled] = useState<boolean>(true);

  // Simulated metrics
  const [simulatedHeartRate, setSimulatedHeartRate] = useState<number>(72);
  const [simulatedAlignment, setSimulatedAlignment] = useState<number>(98);

  // Logging states
  const [loggedSuccessfully, setLoggedSuccessfully] = useState<boolean>(false);
  const [showHistoryModal, setShowHistoryModal] = useState<boolean>(false);

  // Audio elements for soft practice sound
  const audioContextRef = useRef<AudioContext | null>(null);

  // Cycle phase calculation
  const getCyclePhase = (): string => {
    if (user.isPregnancyMode) return 'Pregnancy Mode';
    if (user.isPostpartumMode) return 'Postpartum Recovery';
    
    // Fallback to calculation
    const cycleLen = user.cycleLength || 28;
    const periodLen = user.periodLength || 5;
    const lastStartStr = user.lastPeriodStart;
    if (!lastStartStr) return 'Menstrual';

    const lastStart = new Date(lastStartStr);
    const today = new Date();
    const diffTime = today.getTime() - lastStart.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    let day = (diffDays % cycleLen) + 1;
    if (day <= 0) day += cycleLen;

    if (day <= periodLen) return 'Menstrual';
    if (day <= cycleLen - 14) return 'Follicular';
    if (day <= cycleLen - 10) return 'Ovulatory';
    return 'Luteal';
  };

  const currentPhase = getCyclePhase();

  // Safely extract yoga logs from user
  const yogaLogs = user.yogaLogs || [];

  // Helper to filter logs in the last 7 days for fluid rolling consistency
  const getWeeklySessions = () => {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setHours(0, 0, 0, 0);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    return yogaLogs.filter(log => new Date(log.date) >= sevenDaysAgo);
  };

  const weeklySessions = getWeeklySessions();

  // Helper to get number of unique days practiced in the last 7 days
  const getWeeklyActiveDays = (): number => {
    const activeDaysSet = new Set<string>();
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setHours(0, 0, 0, 0);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    yogaLogs.forEach(log => {
      const logDate = new Date(log.date);
      if (logDate >= sevenDaysAgo) {
        const key = logDate.toISOString().split('T')[0];
        activeDaysSet.add(key);
      }
    });
    return activeDaysSet.size;
  };

  const activeDaysCount = getWeeklyActiveDays();

  // Badge tier calculation
  const getWeeklyBadge = () => {
    if (activeDaysCount === 0) {
      return {
        name: 'Glow Seeker',
        icon: '🌱',
        description: 'You are on the beautiful threshold of balance. Complete your first practice to sprout!',
        color: 'from-stone-400 to-stone-500',
        textColor: 'text-stone-500',
        borderColor: 'border-stone-200/60',
        bgColor: 'bg-stone-50/50',
      };
    }
    if (activeDaysCount <= 2) {
      return {
        name: 'Glow Luminary',
        icon: '🌙',
        description: 'A soft light is igniting in your core. You are nurturing your cyclic temple.',
        color: 'from-amber-400 to-rose-400',
        textColor: 'text-amber-600',
        borderColor: 'border-amber-200/60',
        bgColor: 'bg-amber-50/50',
      };
    }
    if (activeDaysCount <= 4) {
      return {
        name: 'Harmonious Bloom',
        icon: '🌸',
        description: 'Consistent movement is bringing deep harmony to your pelvic center and endocrine system.',
        color: 'from-pink-400 to-indigo-400',
        textColor: 'text-pink-500',
        borderColor: 'border-pink-200/60',
        bgColor: 'bg-pink-50/50',
      };
    }
    return {
      name: 'Radiant Divinity',
      icon: '✨',
      description: 'Your cycle is fully illuminated! You have achieved sacred somatic alignment.',
      color: 'from-indigo-500 via-purple-500 to-pink-500',
      textColor: 'text-indigo-600',
      borderColor: 'border-indigo-200/60',
      bgColor: 'bg-indigo-50/50',
    };
  };

  const currentBadge = getWeeklyBadge();

  // Helper to generate the Mon-Sun calendar representing the last 7 days
  const getWeeklyCalendarChecklist = () => {
    const days = [];
    const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dayStr = d.toISOString().split('T')[0];
      const hasPracticed = yogaLogs.some(log => log.date.startsWith(dayStr));
      days.push({
        name: weekdays[d.getDay()],
        dateNum: d.getDate(),
        hasPracticed,
        isToday: i === 0,
        fullDateStr: dayStr
      });
    }
    return days;
  };

  const calendarChecklist = getWeeklyCalendarChecklist();

  // Tick generator for procedural animations
  useEffect(() => {
    let animFrameId: number;
    const updateTick = () => {
      if (isPlaying) {
        setTick(prev => prev + 1);
      }
      animFrameId = requestAnimationFrame(updateTick);
    };
    animFrameId = requestAnimationFrame(updateTick);
    return () => cancelAnimationFrame(animFrameId);
  }, [isPlaying]);

  // Breathing Cycle state machine (6s total)
  useEffect(() => {
    if (!isPlaying) return;

    const interval = setInterval(() => {
      setBreathTime(prev => {
        const next = (prev + 0.1) % 6.0;
        
        // Map breathing phase
        if (next < 2.0) {
          setBreathState('Inhale');
          // Inhale expansion
          const progress = next / 2.0;
          setBreathScale(1.0 + progress * 0.4); // 1.0 to 1.4
        } else if (next < 4.0) {
          setBreathState('Hold');
          setBreathScale(1.4);
        } else {
          setBreathState('Exhale');
          // Exhale contraction
          const progress = (next - 4.0) / 2.0;
          setBreathScale(1.4 - progress * 0.4); // 1.4 down to 1.0
        }

        return next;
      });
    }, 100);

    return () => clearInterval(interval);
  }, [isPlaying]);

  // Simulated metrics fluctuating
  useEffect(() => {
    if (!isPlaying) return;

    const interval = setInterval(() => {
      setSimulatedHeartRate(prev => {
        const delta = Math.floor(Math.random() * 3) - 1;
        const target = breathState === 'Inhale' ? 74 : breathState === 'Exhale' ? 68 : 71;
        const step = prev < target ? 1 : prev > target ? -1 : delta;
        return Math.max(60, Math.min(85, prev + step));
      });

      setSimulatedAlignment(prev => {
        const delta = Math.floor(Math.random() * 3) - 1;
        const next = prev + delta;
        return Math.max(95, Math.min(100, next));
      });
    }, 1500);

    return () => clearInterval(interval);
  }, [isPlaying, breathState]);

  // Soft wellness chime synth player
  const playChime = (freq: number, duration: number) => {
    if (!isChimeEnabled) return;
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioContextRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime);

      gainNode.gain.setValueAtTime(0.08, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);

      osc.connect(gainNode);
      gainNode.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch (e) {
      console.warn("Chime play error:", e);
    }
  };

  // Play chimes at breathing transitions
  useEffect(() => {
    if (!isPlaying) return;
    if (breathState === 'Inhale' && Math.abs(breathTime - 0) < 0.15) {
      playChime(329.63, 1.5); // E4 note: Soft rise
    } else if (breathState === 'Hold' && Math.abs(breathTime - 2.0) < 0.15) {
      playChime(392.00, 1.2); // G4 note: Soft hold
    } else if (breathState === 'Exhale' && Math.abs(breathTime - 4.0) < 0.15) {
      playChime(261.63, 2.0); // C4 note: Soft release
    }
  }, [breathState, isPlaying]);

  // Ask Lumina AI for Personalized guidance
  const fetchPersonalizedAdvice = async (poseName: string) => {
    setAiLoading(true);
    setAiAdvice('');
    
    const activeSymptoms = todaysSymptoms.length > 0 ? todaysSymptoms : ['general fatigue'];
    const prompt = `I am practicing the yoga pose "${poseName}" during my ${currentPhase} cycle phase. My symptoms today are: ${activeSymptoms.join(', ')}. Please give me 3 highly comforting, big-sisterly tips/modifications on how to safely align or practice this pose to nourish my pelvic area, soothe muscles, and support endocrine flow. Keep the reply to exactly three direct bullet points, concise and elegant, followed by a warm signature.`;

    try {
      const responseText = await getLuminaAdvice(prompt);
      setAiAdvice(responseText);
    } catch (err) {
      console.error("Yoga AI advice error:", err);
      // Perfect Offline Fallbacks based on pose
      setTimeout(() => {
        if (poseName.includes("Child's")) {
          setAiAdvice(`* **Widen Your Knees**: Create a loving space for your abdomen and uterine region to breathe fully without pressure.\n* **Support Your Third Eye**: Rest your forehead on a folded blanket or block to calm your pituitary gland and drop your cortisol levels.\n* **Lower Back Breath**: Direct your warm inhales specifically to your lower hips and lumbar zone where pelvic pressure aggregates.\n\nFlow with gentle ease, darling! ✨`);
        } else if (poseName.includes("Cat-Cow")) {
          setAiAdvice(`* **Soften the Arch**: Avoid over-extending your back or over-compressing your belly during the Cow phase.\n* **Match with Breath**: Slowly rise into Cat as you exhale, creating a light contraction that relieves abdominal bloating.\n* **Sway the Hips**: Add gentle lateral swaying to loosen the sacroiliac joints and pelvic girdle.\n\nNurture your temple beautifully! 🌸`);
        } else {
          setAiAdvice(`* **Elevate Hips**: Sit on a plush pillow to lift your pelvis, letting your knees naturally gravity-drop to relieve groin tension.\n* **Avoid Forcing**: Keep the soles of your feet resting softly together without pulling them too close to your torso.\n* **Heart Expansion**: Lift your chest gently as you inhale to counter physical fatigue and nursing slouching.\n\nLove your magical structure! 💖`);
        }
      }, 800);
    } finally {
      setAiLoading(false);
    }
  };

  // Trigger personalized advice when entering a pose practice
  const handleStartPractice = (pose: typeof YOGA_POSES[number]) => {
    setSelectedPose(pose);
    setIsPlaying(true);
    setBreathTime(0);
    setBreathState('Inhale');
    setBreathScale(1.0);
    setAiAdvice('');
    // Prefetch custom AI advice
    fetchPersonalizedAdvice(pose.name);
  };

  const handleClosePractice = () => {
    setSelectedPose(null);
    setAiAdvice('');
  };

  // LOG SESSIONS METHOD
  const handleLogSession = () => {
    if (!selectedPose) return;
    
    const newLog = {
      id: `yoga-${Date.now()}`,
      date: new Date().toISOString(),
      poseName: selectedPose.name,
      duration: 10, // standard 10 mins self-guided practice
      benefit: selectedPose.benefit
    };

    const currentLogs = user.yogaLogs || [];
    setUser(prev => {
      if (!prev) return null;
      return {
        ...prev,
        yogaLogs: [newLog, ...currentLogs]
      };
    });

    // Harmonious success chime chord
    playChime(523.25, 0.6); // C5
    setTimeout(() => playChime(659.25, 0.6), 120); // E5
    setTimeout(() => playChime(783.99, 0.6), 240); // G5
    setTimeout(() => playChime(1046.50, 1.2), 360); // High C6

    setLoggedSuccessfully(true);
  };

  // DELETE LOG METHOD
  const handleDeleteLog = (id: string) => {
    const currentLogs = user.yogaLogs || [];
    const updated = currentLogs.filter(log => log.id !== id);
    
    setUser(prev => {
      if (!prev) return null;
      return {
        ...prev,
        yogaLogs: updated
      };
    });

    // Dissolving drop chord
    playChime(392.00, 0.5); // G4
    setTimeout(() => playChime(261.63, 0.8), 150); // C4
  };

  // Procedural SVG animator for poses
  const renderProceduralAnimation = (poseName: string) => {
    const isChilds = poseName.includes("Child's");
    const isCatCow = poseName.includes("Cat-Cow");
    const isBoundAngle = poseName.includes("Bound Angle");

    if (isChilds) {
      // Child's Pose (Balasana) - Figure kneeling down with hips to heels, arms stretched out
      const hipsX = 210 + (breathScale - 1.0) * 8;
      const hipsY = 138 + (breathScale - 1.0) * 4;
      const headX = 85;
      const headY = 145;
      
      return (
        <svg viewBox="0 0 300 200" className="w-full h-full">
          <defs>
            <linearGradient id="bodyGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#f472b6" />
              <stop offset="100%" stopColor="#818cf8" />
            </linearGradient>
            <linearGradient id="glowGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="rgba(244,114,182,0.15)" />
              <stop offset="100%" stopColor="rgba(129,140,248,0.02)" />
            </linearGradient>
            <filter id="glow">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Floor Line */}
          <line x1="20" y1="160" x2="280" y2="160" stroke="#f472b6" strokeWidth="2" strokeDasharray="4 4" className="opacity-45" />

          {/* Pelvic Breath Expansion Shadow */}
          <circle 
            cx={hipsX - 20} 
            cy={hipsY} 
            r={18 + (breathScale - 1.0) * 40} 
            fill="url(#glowGrad)" 
            className="transition-all duration-300"
          />

          {/* Kneeling Body Vector Lines */}
          <path 
            d={`M ${hipsX} ${hipsY} Q 150 105 ${headX + 15} ${headY - 15}`} 
            fill="none" 
            stroke="url(#bodyGrad)" 
            strokeWidth="6" 
            strokeLinecap="round"
            filter="url(#glow)"
          />

          {/* Neck & Head */}
          <circle cx={headX} cy={headY} r="10" fill="#f472b6" filter="url(#glow)" />

          {/* Arms Stretching out */}
          <path 
            d={`M ${headX + 10} ${headY - 10} Q 90 140 35 156`} 
            fill="none" 
            stroke="url(#bodyGrad)" 
            strokeWidth="4" 
            strokeLinecap="round"
          />

          {/* Thighs & Feet tucked */}
          <path 
            d={`M ${hipsX} ${hipsY} L 180 156 L 235 156`} 
            fill="none" 
            stroke="url(#bodyGrad)" 
            strokeWidth="5" 
            strokeLinecap="round"
          />

          {/* Key Alignment Markers */}
          <circle cx={hipsX} cy={hipsY} r="4" fill="#60a5fa" />
          <circle cx="150" cy="115" r="4" fill="#34d399" />
          <circle cx={headX + 10} cy={headY - 10} r="4" fill="#60a5fa" />

          {/* Core Energy Center Accent */}
          <g transform={`translate(${hipsX - 25}, ${hipsY - 10})`}>
            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" 
                  fill="#f472b6" 
                  className="opacity-70 animate-pulse" 
                  transform="scale(0.8)"
            />
          </g>
        </svg>
      );
    }

    if (isCatCow) {
      // Cat-Cow Stretch - Morphing Spine line
      const period = (tick % 160) / 160; 
      const t = 0.5 - 0.5 * Math.cos(period * 2 * Math.PI); 
      
      const handsX = 75;
      const handsY = 155;
      const kneesX = 220;
      const kneesY = 155;

      const shoulderY = 100 + t * 18;
      const hipY = 103 + t * 12;
      const ctrlY = 32 + t * 115; 
      const headY = 125 - t * 45; 
      const headX = 48 + t * 5;

      return (
        <svg viewBox="0 0 300 200" className="w-full h-full">
          <defs>
            <linearGradient id="catCowGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#f472b6" stopOpacity="0.8" />
              <stop offset="50%" stopColor="#a78bfa" />
              <stop offset="100%" stopColor="#34d399" stopOpacity="0.8" />
            </linearGradient>
            <filter id="neon">
              <feGaussianBlur stdDeviation="2.5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Floor Line */}
          <line x1="20" y1="160" x2="280" y2="160" stroke="#f472b6" strokeWidth="2" strokeDasharray="4 4" className="opacity-45" />

          {/* Ground arms and thighs */}
          <line x1={handsX} y1={handsY} x2={handsX + 15} y2={shoulderY} stroke="#f472b6" strokeWidth="5" strokeLinecap="round" />
          <line x1={kneesX} y1={kneesY} x2={kneesX - 12} y2={hipY} stroke="#f472b6" strokeWidth="5" strokeLinecap="round" />
          <line x1={kneesX} y1={kneesY} x2={kneesX + 35} y2={kneesY} stroke="#f472b6" strokeWidth="4" strokeLinecap="round" className="opacity-70" />

          {/* Morphing Spine Curve (Cat/Cow) */}
          <path 
            d={`M ${handsX + 15} ${shoulderY} Q 145 ${ctrlY} ${kneesX - 12} ${hipY}`} 
            fill="none" 
            stroke="url(#catCowGrad)" 
            strokeWidth="6" 
            strokeLinecap="round"
            filter="url(#neon)"
          />

          {/* Head & Neck */}
          <path d={`M ${handsX + 15} ${shoulderY} L ${headX + 10} ${headY}`} stroke="#a78bfa" strokeWidth="4" />
          <circle cx={headX} cy={headY} r="10" fill="#a78bfa" filter="url(#neon)" />

          {/* Alignment Joint Orbs */}
          <circle cx={handsX + 15} cy={shoulderY} r="4" fill="#fb7185" />
          <circle cx={kneesX - 12} cy={hipY} r="4" fill="#fb7185" />
          <circle cx="145" cy={ctrlY / 2 + 60} r="3" fill="#34d399" className="opacity-80" />

          {/* Cycle flow text indicator inside SVG */}
          <text x="150" y="185" textAnchor="middle" fill="#9ca3af" className="text-[9px] uppercase tracking-widest font-black">
            {t < 0.4 ? "Cat Stretch (Exhale)" : t > 0.6 ? "Cow Arch (Inhale)" : "Transition Flow"}
          </text>
        </svg>
      );
    }

    if (isBoundAngle) {
      // Bound Angle Pose (Baddha Konasana)
      const flutter = Math.sin(tick * 0.1) * 6; 
      const centerX = 150;
      const headY = 45;
      const hipsY = 135;
      const feetY = 160;

      return (
        <svg viewBox="0 0 300 200" className="w-full h-full">
          <defs>
            <linearGradient id="boundGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#fb7185" />
              <stop offset="100%" stopColor="#f472b6" />
            </linearGradient>
            <radialGradient id="pelvicGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="rgba(244,114,182,0.3)" />
              <stop offset="100%" stopColor="rgba(244,114,182,0)" />
            </radialGradient>
          </defs>

          {/* Ground line */}
          <line x1="20" y1="165" x2="280" y2="165" stroke="#f472b6" strokeWidth="2" strokeDasharray="4 4" className="opacity-45" />

          {/* Soft Pelvic glow */}
          <circle cx={centerX} cy={hipsY + 10} r="30" fill="url(#pelvicGlow)" />

          {/* Spine */}
          <line x1={centerX} y1={headY + 15} x2={centerX} y2={hipsY} stroke="url(#boundGrad)" strokeWidth="6" strokeLinecap="round" />

          {/* Head & Neck */}
          <circle cx={centerX} cy={headY} r="11" fill="#fb7185" />
          <circle cx={centerX} cy={headY + 13} r="4.5" fill="#34d399" />

          {/* Left Leg */}
          <line x1={centerX} y1={hipsY} x2={85} y2={142 + flutter} stroke="#fb7185" strokeWidth="5" strokeLinecap="round" />
          <line x1={85} y1={142 + flutter} x2={centerX} y2={feetY} stroke="#fb7185" strokeWidth="4" strokeLinecap="round" />

          {/* Right Leg */}
          <line x1={centerX} y1={hipsY} x2={215} y2={142 + flutter} stroke="#fb7185" strokeWidth="5" strokeLinecap="round" />
          <line x1={215} y1={142 + flutter} x2={centerX} y2={feetY} stroke="#fb7185" strokeWidth="4" strokeLinecap="round" />

          {/* Clapsed Hands */}
          <circle cx={centerX} cy={feetY - 10} r="5" fill="#34d399" />
          <line x1={centerX} y1={headY + 35} x2={centerX} y2={feetY - 10} stroke="#f472b6" strokeWidth="2.5" strokeDasharray="2 2" className="opacity-60" />

          {/* Joint Dots */}
          <circle cx="85" cy={142 + flutter} r="4.5" fill="#60a5fa" />
          <circle cx="215" cy={142 + flutter} r="4.5" fill="#60a5fa" />
          <circle cx={centerX} cy={hipsY} r="5.5" fill="#f472b6" />

          {/* Breath ripple ring on Chest */}
          <circle 
            cx={centerX} 
            cy={90} 
            r={12 + (breathScale - 1.0) * 20} 
            fill="none" 
            stroke="rgba(244,114,182,0.4)" 
            strokeWidth="1.5" 
            className="transition-all duration-300" 
          />
        </svg>
      );
    }

    return null;
  };

  return (
    <div className="space-y-8 animate-fadeIn text-gray-800 relative">
      
      {/* Practice Studio Overlay (Full Height Glass Modal) */}
      {selectedPose && (
        <div className="fixed inset-0 z-[100] bg-stone-950/85 backdrop-blur-xl flex flex-col justify-between overflow-y-auto p-4 md:p-8 animate-fadeIn">
          
          {/* LOGGING SUCCESS FULLSCREEN CELEBRATION */}
          {loggedSuccessfully ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center space-y-6 max-w-lg mx-auto animate-zoomIn py-12">
              <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-emerald-400 to-teal-500 flex items-center justify-center text-white text-5xl shadow-2xl animate-bounce">
                ✨
              </div>
              
              <div className="space-y-2">
                <span className="text-[10px] font-black tracking-[0.25em] text-emerald-400 uppercase">Self-Care Logged!</span>
                <h3 className="text-3xl font-serif text-white font-bold italic">Nourishment Saved</h3>
                <p className="text-xs text-stone-400 font-serif italic max-w-sm">
                  You have successfully logged a 10-minute session of <span className="text-pink-400 font-bold">{selectedPose.name}</span>. Your weekly consistency is blooming!
                </p>
              </div>

              {/* Instant Consistency Mini Check */}
              <div className="bg-white/5 border border-white/10 p-5 rounded-[2rem] w-full space-y-3">
                <div className="flex justify-between items-center text-stone-300 text-xs">
                  <span>Weekly Consistency Badge</span>
                  <span className="font-mono text-emerald-400 font-bold">{activeDaysCount + 1} Days Active</span>
                </div>
                
                {/* Simulated increase tracker bar */}
                <div className="w-full bg-stone-800 h-2.5 rounded-full overflow-hidden">
                  <div 
                    className="bg-gradient-to-r from-emerald-400 to-teal-400 h-full rounded-full transition-all duration-1000" 
                    style={{ width: `${Math.min(100, ((activeDaysCount + 1) / 7) * 100)}%` }}
                  />
                </div>

                <p className="text-[10px] text-stone-400 italic font-serif">
                  Badge Status: <span className="text-white font-bold">{getWeeklyBadge().name} {getWeeklyBadge().icon}</span>
                </p>
              </div>

              <button 
                onClick={() => {
                  setLoggedSuccessfully(false);
                  handleClosePractice();
                }}
                className="px-8 py-3 bg-white text-stone-950 rounded-full font-black text-[10px] uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-lg cursor-pointer"
              >
                Close Studio & View Badges
              </button>
            </div>
          ) : (
            <>
              {/* Studio Header */}
              <header className="flex justify-between items-center w-full max-w-5xl mx-auto border-b border-white/10 pb-4 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-pink-500/10 border border-pink-500/20 flex items-center justify-center text-xl text-pink-400">🧘</div>
                  <div>
                    <h3 className="text-lg md:text-xl font-serif text-white italic font-bold">{selectedPose.name}</h3>
                    <p className="text-[9px] uppercase tracking-widest text-pink-400 font-extrabold flex items-center gap-1">
                      <span>AI Practice Sanctuary</span>
                      <span className="text-white/20">•</span>
                      <span>{currentPhase} Support</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleLogSession}
                    className="px-4 py-2 bg-gradient-to-r from-pink-500 via-rose-500 to-indigo-500 text-white font-black text-[9px] uppercase tracking-widest rounded-full shadow-lg hover:scale-[1.02] active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer border border-white/15 mr-2"
                  >
                    <span>🌸</span>
                    <span>Complete & Log</span>
                  </button>

                  <button 
                    onClick={handleClosePractice}
                    className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-white transition-colors cursor-pointer"
                    title="Exit Sanctuary"
                  >
                    <X size={18} />
                  </button>
                </div>
              </header>

              {/* Main Studio Body Grid */}
              <main className="w-full max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6 my-6 flex-1 items-stretch">
                {/* LEFT COLUMN: Animated Video Canvas Player (7 cols) */}
                <section className="lg:col-span-7 bg-stone-900 border border-white/5 rounded-[2.5rem] p-6 flex flex-col justify-between relative overflow-hidden min-h-[380px] lg:min-h-0 shadow-2xl">
                  
                  {/* Top Watermark & Breath stage */}
                  <div className="flex justify-between items-center w-full relative z-10">
                    <div className="flex items-center gap-1.5 bg-black/40 backdrop-blur-md border border-white/10 px-3 py-1.5 rounded-full text-[9px] font-bold uppercase text-white tracking-widest">
                      <span className="w-1.5 h-1.5 rounded-full bg-pink-500 animate-ping shrink-0" />
                      <span>Procedural Live Guide</span>
                    </div>

                    <div className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${
                      breathState === 'Inhale' ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30' :
                      breathState === 'Hold' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' :
                      'bg-pink-500/20 text-pink-300 border border-pink-500/30'
                    } transition-all duration-300 animate-pulse`}>
                      💨 {breathState}...
                    </div>
                  </div>

                  {/* Central Vector Canvas container */}
                  <div className="flex-1 flex items-center justify-center max-h-[250px] my-4">
                    {renderProceduralAnimation(selectedPose.name)}
                  </div>

                  {/* Bottom Breathing Indicator Ring & Action Buttons */}
                  <div className="flex flex-col md:flex-row items-center justify-between gap-4 border-t border-white/5 pt-4 relative z-10 shrink-0">
                    
                    {/* Breathing Bar gauge */}
                    <div className="flex items-center gap-3 w-full md:w-auto">
                      <div className="relative w-12 h-12 flex items-center justify-center shrink-0">
                        <svg className="w-full h-full transform -rotate-90">
                          <circle cx="24" cy="24" r="20" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="4" />
                          <circle cx="24" cy="24" r="20" fill="none" stroke="#f472b6" strokeWidth="4"
                                  strokeDasharray={2 * Math.PI * 20}
                                  strokeDashoffset={2 * Math.PI * 20 * (1 - breathTime / 6.0)}
                                  className="transition-all duration-100 ease-linear" />
                        </svg>
                        <span className="absolute text-[9px] font-black text-white">{Math.round(breathTime)}s</span>
                      </div>
                      <div>
                        <p className="text-[8px] font-black text-stone-400 uppercase tracking-widest leading-none">Breathing Rhythm</p>
                        <p className="text-xs font-serif italic text-white pt-0.5 font-bold leading-tight">Deep Diaphragmatic</p>
                      </div>
                    </div>

                    {/* Simulated HUD Metrics */}
                    <div className="flex items-center gap-4 bg-black/35 px-4 py-2.5 rounded-2xl border border-white/5 shrink-0">
                      <div className="flex items-center gap-1.5 text-rose-400">
                        <Heart size={14} className="animate-pulse" />
                        <span className="text-xs font-mono font-bold text-white">{simulatedHeartRate} <span className="text-[8px] text-stone-500 uppercase">bpm</span></span>
                      </div>
                      <span className="text-white/10">|</span>
                      <div className="flex items-center gap-1.5 text-emerald-400">
                        <Activity size={14} />
                        <span className="text-xs font-mono font-bold text-white">{simulatedAlignment}% <span className="text-[8px] text-stone-500 uppercase">align</span></span>
                      </div>
                    </div>

                    {/* Controls */}
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => setIsChimeEnabled(!isChimeEnabled)}
                        className={`w-9 h-9 rounded-full border flex items-center justify-center transition-all cursor-pointer ${
                          isChimeEnabled 
                            ? 'bg-pink-500/20 text-pink-400 border-pink-500/30' 
                            : 'bg-white/5 text-stone-500 border-white/5'
                        }`}
                        title={isChimeEnabled ? "Chimes Active" : "Silence Mode"}
                      >
                        {isChimeEnabled ? <Volume2 size={14} /> : <VolumeX size={14} />}
                      </button>
                      <button 
                        onClick={() => setIsPlaying(!isPlaying)}
                        className="px-5 py-2 bg-white text-stone-950 font-black uppercase text-[9px] tracking-widest rounded-full shadow-lg hover:scale-105 active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer"
                      >
                        {isPlaying ? <Pause size={10} fill="currentColor" /> : <Play size={10} fill="currentColor" />}
                        <span>{isPlaying ? "Pause" : "Resume"}</span>
                      </button>
                    </div>

                  </div>

                </section>

                {/* RIGHT COLUMN: AI Guide & Classic Instructions (5 cols) */}
                <section className="lg:col-span-5 flex flex-col gap-5 min-h-[380px] lg:min-h-0">
                  
                  {/* AI PERSONALIZED CARD */}
                  <div className="bg-gradient-to-br from-indigo-950/70 to-purple-950/70 border border-indigo-500/20 p-6 md:p-8 rounded-[2.5rem] shadow-xl flex flex-col justify-between flex-1 relative overflow-hidden text-white">
                    
                    <div className="space-y-4 relative z-10">
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-xl bg-indigo-500/25 border border-indigo-400/30 flex items-center justify-center text-indigo-300">
                            <Sparkles size={14} />
                          </div>
                          <div>
                            <h4 className="text-xs font-bold uppercase tracking-widest text-indigo-300">Lumina Pose Coach</h4>
                            <p className="text-[8px] text-indigo-200 uppercase tracking-widest">Generative Cycle Tuning</p>
                          </div>
                        </div>

                        <span className="bg-indigo-500/30 text-indigo-200 text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full">
                          Phase Active
                        </span>
                      </div>

                      <div className="border-t border-indigo-500/10 pt-3">
                        {aiLoading ? (
                          <div className="py-8 text-center space-y-3">
                            <div className="w-8 h-8 border-2 border-dashed border-indigo-400 rounded-full animate-spin mx-auto" />
                            <p className="text-[10px] text-indigo-300 uppercase font-black tracking-widest animate-pulse">Personalizing for {currentPhase}...</p>
                          </div>
                        ) : aiAdvice ? (
                          <div className="space-y-3 max-h-[220px] overflow-y-auto scrollbar-none pr-1">
                            <p className="text-[9px] font-extrabold uppercase tracking-widest text-indigo-400">Adjustments for {currentPhase}:</p>
                            <div className="text-xs leading-relaxed text-indigo-100/90 font-serif space-y-2 whitespace-pre-wrap">
                              {aiAdvice}
                            </div>
                          </div>
                        ) : (
                          <div className="text-center py-6 space-y-4">
                            <p className="text-xs font-serif italic text-indigo-200 leading-relaxed">
                              "Tap to let Lumina AI dynamically align this pose to help relieve your cycle symptoms."
                            </p>
                            <button 
                              onClick={() => fetchPersonalizedAdvice(selectedPose.name)}
                              className="px-6 py-2.5 bg-gradient-to-r from-pink-400 to-indigo-500 text-white font-extrabold uppercase text-[9px] tracking-widest rounded-full shadow-lg border border-white/10 hover:scale-[1.02] transition-transform cursor-pointer"
                            >
                              ✨ Personalize Pose Adjustments
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Small disclaimer footer inside AI Box */}
                    <div className="text-[8px] opacity-40 italic mt-3 pt-2 border-t border-indigo-500/10 shrink-0">
                      ⚠️ Generative advice. Honor your body. Consult physical therapist if feeling acute lumbar pressure.
                    </div>

                    <span className="absolute bottom-[-10%] right-[-10%] text-[8rem] opacity-5 pointer-events-none select-none font-black text-indigo-500 font-serif">AI</span>
                  </div>

                  {/* CLASSIC INSTRUCTIONAL STEPS */}
                  <div className="bg-stone-900 border border-white/5 p-6 rounded-[2.5rem] flex flex-col justify-between text-white shrink-0">
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-lg bg-white/5 flex items-center justify-center text-xs text-stone-400">ℹ️</div>
                        <h5 className="text-xs font-bold text-stone-200 uppercase tracking-widest">Pose Guidelines</h5>
                      </div>

                      <p className="text-xs text-stone-400 italic font-serif leading-relaxed">
                        {selectedPose.description}
                      </p>

                      <div className="pt-2">
                        <p className="text-[9px] font-bold text-pink-400 uppercase tracking-widest mb-1">Target Benefit</p>
                        <p className="text-xs italic text-pink-200 flex items-center gap-1">
                          <span>✨</span>
                          <span>{selectedPose.benefit}</span>
                        </p>
                      </div>
                    </div>
                  </div>

                </section>
              </main>

              {/* Practice Studio Footer */}
              <footer className="w-full max-w-5xl mx-auto border-t border-white/5 pt-4 text-center text-[9px] text-stone-500 font-serif italic shrink-0">
                "Your body is a temple in constant, beautiful change. Flow gently." • Lumina Practice Room
              </footer>
            </>
          )}

        </div>
      )}

      {/* POSE SELECTION SCREEN WITH WEEKLY PROGRESS BADGES */}
      {!selectedPose && (
        <div className="space-y-8 animate-fadeIn">
          
          {/* Girly Header */}
          <header className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 text-center md:text-left bg-gradient-to-br from-pink-50/60 to-rose-50/40 p-8 rounded-[2.5rem] border border-white/60 shadow-[inset_0_2px_4px_rgba(255,255,255,0.6),_0_12px_36px_rgba(244,114,182,0.03)]">
            <div className="space-y-1">
              <span className="text-[9px] font-black uppercase tracking-[0.2em] text-pink-400 block">Flow & Glow Sanctuary</span>
              <h3 className="text-2xl font-serif text-pink-600 font-bold italic">Animated Yoga Guide</h3>
              <p className="text-xs text-stone-500 leading-relaxed font-serif italic">
                Replacing missing YouTube tutorials with high-fidelity, procedurally-animated, and AI-personalized interactive posture controllers.
              </p>
            </div>

            <div className="bg-white/80 backdrop-blur-md px-4 py-3 rounded-2xl border border-pink-100 flex items-center gap-2.5 shadow-sm text-left shrink-0">
              <div className="w-8 h-8 rounded-full bg-pink-50 text-pink-500 flex items-center justify-center text-lg animate-pulse">🧘‍♀️</div>
              <div>
                <p className="text-[8px] font-black text-pink-400 uppercase tracking-widest leading-none">Your Cycle Today</p>
                <p className="text-xs font-serif italic text-pink-700 font-bold pt-0.5 leading-none">{currentPhase} Phase</p>
              </div>
            </div>
          </header>

          {/* NEW MODULE: WEEKLY CONSISTENCY & PROGRESS BADGES DASHBOARD */}
          <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 bg-white/40 border border-pink-100/50 p-6 md:p-8 rounded-[2.5rem] shadow-sm">
            
            {/* Left Card: Consistency Trophy & Badge */}
            <div className="lg:col-span-5 bg-gradient-to-br from-pink-50 to-pink-100/30 border border-pink-100 p-6 rounded-[2rem] flex flex-col justify-between relative overflow-hidden">
              <div className="space-y-3 relative z-10">
                <div className="flex items-center gap-2">
                  <Trophy size={16} className="text-pink-500" />
                  <span className="text-[9px] font-black uppercase tracking-widest text-pink-500">Weekly Consistency</span>
                </div>

                <div className="flex items-center gap-3 pt-1">
                  <div className={`w-16 h-16 rounded-2xl bg-gradient-to-tr ${currentBadge.color} flex items-center justify-center text-3xl shadow-md border border-white/20 shrink-0 transform hover:scale-110 transition-transform`}>
                    {currentBadge.icon}
                  </div>
                  <div>
                    <h4 className="text-md font-serif text-pink-900 italic font-bold leading-none">{currentBadge.name}</h4>
                    <span className="text-[9px] font-black uppercase text-pink-400 tracking-wider block mt-1">Level {activeDaysCount === 0 ? 0 : activeDaysCount <= 2 ? 1 : activeDaysCount <= 4 ? 2 : 3} Badge</span>
                  </div>
                </div>

                <p className="text-xs text-stone-500 font-serif italic leading-relaxed pt-1">
                  "{currentBadge.description}"
                </p>
              </div>

              {/* Progress bar inside left card */}
              <div className="pt-4 mt-4 border-t border-pink-100 relative z-10">
                <div className="flex justify-between text-[10px] text-pink-800 font-black uppercase tracking-wider mb-1.5">
                  <span>Weekly Commitment</span>
                  <span>{activeDaysCount} / 7 Days Active</span>
                </div>
                <div className="w-full bg-pink-100/60 h-2.5 rounded-full overflow-hidden border border-pink-200/20">
                  <div 
                    className="bg-gradient-to-r from-pink-400 to-rose-400 h-full rounded-full transition-all duration-1000" 
                    style={{ width: `${Math.round((activeDaysCount / 7) * 100)}%` }}
                  />
                </div>
              </div>

              {/* Decorative background watermark */}
              <span className="absolute right-[-10px] bottom-[-20px] text-[6.5rem] opacity-5 pointer-events-none select-none font-bold text-pink-500">🧘</span>
            </div>

            {/* Middle Card: 7-Day Interactive Progress Checkbox track */}
            <div className="lg:col-span-4 bg-white/70 border border-pink-50 p-6 rounded-[2rem] flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Calendar size={16} className="text-pink-400" />
                  <span className="text-[9px] font-black uppercase tracking-widest text-pink-400">Activity Calendar</span>
                </div>
                <h5 className="text-xs font-serif text-pink-900 font-bold italic">Last 7 Days Journey</h5>
                <p className="text-[10px] text-gray-400 font-serif italic">Days marked with checks represent logged self-care somatic flows.</p>
              </div>

              {/* 7 Days circles list */}
              <div className="grid grid-cols-7 gap-2 pt-4">
                {calendarChecklist.map((day, idx) => (
                  <div 
                    key={idx} 
                    className={`flex flex-col items-center p-2 rounded-xl border transition-all ${
                      day.isToday 
                        ? 'bg-pink-500/5 border-pink-500/30 shadow-[0_0_10px_rgba(244,114,182,0.1)]' 
                        : 'border-transparent'
                    }`}
                  >
                    <span className="text-[8px] font-black uppercase text-stone-400 tracking-wider block">{day.name}</span>
                    <span className={`text-[10px] font-mono font-bold block mt-1 ${day.isToday ? 'text-pink-600' : 'text-stone-500'}`}>{day.dateNum}</span>
                    
                    <div className={`mt-2 w-6 h-6 rounded-full border flex items-center justify-center text-xs transition-all ${
                      day.hasPracticed 
                        ? 'bg-emerald-50 text-emerald-500 border-emerald-200 shadow-sm animate-pulse' 
                        : 'bg-stone-50 text-stone-300 border-stone-200/50'
                    }`}>
                      {day.hasPracticed ? <Check size={10} strokeWidth={4} /> : <div className="w-1.5 h-1.5 rounded-full bg-stone-300" />}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right Card: Quick Logs Stats & sliding history button */}
            <div className="lg:col-span-3 bg-white/70 border border-pink-50 p-6 rounded-[2rem] flex flex-col justify-between">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <History size={16} className="text-pink-400" />
                  <span className="text-[9px] font-black uppercase tracking-widest text-pink-400">Total Practice</span>
                </div>
                
                <div className="pt-2">
                  <span className="text-3xl font-mono font-black text-pink-600 block leading-none">
                    {yogaLogs.length}
                  </span>
                  <span className="text-[9px] font-black uppercase text-stone-400 tracking-widest block mt-1">Sessions Logged</span>
                </div>

                <div className="pt-2 border-t border-pink-50">
                  <p className="text-[10px] text-gray-500 font-serif italic leading-relaxed">
                    Total somatic relaxation time: <span className="text-pink-500 font-bold">{yogaLogs.length * 10} minutes</span> of pelvic and endocrine recovery flow.
                  </p>
                </div>
              </div>

              <button 
                onClick={() => setShowHistoryModal(true)}
                className="w-full mt-4 py-2.5 bg-pink-50/80 hover:bg-pink-100 text-pink-600 font-extrabold uppercase text-[9px] tracking-widest rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer border border-pink-100"
              >
                <span>📁</span>
                <span>View Practice History</span>
              </button>
            </div>

          </section>

          {/* Active symptoms matching notice */}
          {todaysSymptoms.length > 0 && (
            <div className="bg-amber-50/40 border border-amber-200/50 p-4 rounded-3xl flex items-center gap-3 animate-fadeIn text-gray-700">
              <span className="text-xl shrink-0">🩹</span>
              <div className="min-w-0">
                <p className="text-[9px] font-black text-amber-500 uppercase tracking-widest leading-none">Symptom Mitigation Activated</p>
                <p className="text-xs leading-snug font-serif italic text-stone-600 mt-0.5 truncate">
                  Tailoring yoga guides to soothe your active {todaysSymptoms.join(', ')} symptoms with Lumina Pose personalization.
                </p>
              </div>
            </div>
          )}

          {/* Poses Cards Grid */}
          <div className="space-y-6">
            {YOGA_POSES.map((pose, i) => (
              <div 
                key={i} 
                className="bg-white/70 hover:bg-white border border-pink-50 hover:border-pink-200 p-6 rounded-[2.5rem] shadow-sm hover:shadow-md transition-all duration-300 flex flex-col md:flex-row items-center gap-6 group"
              >
                {/* Simulated Animated Thumb container */}
                <div className="w-full md:w-44 h-36 bg-stone-900 rounded-[2rem] border border-pink-100/10 overflow-hidden relative shrink-0 flex items-center justify-center shadow-inner">
                  {/* Subtle vector preview sketch inside thumbnail */}
                  <div className="w-24 h-24 opacity-80 group-hover:scale-105 transition-transform">
                    {renderProceduralAnimation(pose.name)}
                  </div>
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-[2rem]">
                    <span className="w-12 h-12 bg-white text-pink-500 rounded-full flex items-center justify-center shadow-lg transform scale-90 group-hover:scale-100 transition-transform">
                      <Play size={16} fill="currentColor" className="ml-1" />
                    </span>
                  </div>
                </div>

                {/* Details */}
                <div className="flex-1 space-y-3.5 text-center md:text-left min-w-0">
                  <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-2">
                    <div>
                      <h4 className="text-xl font-serif text-pink-600 font-bold italic group-hover:text-pink-700 transition-colors">{pose.name}</h4>
                      <p className="text-[8px] font-black uppercase tracking-widest text-pink-400 mt-0.5">Instructional Procedural Video Clip</p>
                    </div>
                    <span className="bg-pink-50/60 border border-pink-100/50 text-pink-500 text-[9px] font-bold px-3 py-1.5 rounded-full uppercase shrink-0 mx-auto md:mx-0">
                      ⏱️ 6s Breath Cycles
                    </span>
                  </div>

                  <p className="text-xs text-gray-500 leading-relaxed font-serif italic">
                    {pose.description}
                  </p>

                  <div className="pt-2 border-t border-pink-50/50 flex flex-wrap gap-4 justify-center md:justify-start items-center">
                    <div>
                      <span className="text-[8px] font-black text-pink-300 uppercase tracking-widest block leading-none">Primary Benefit</span>
                      <span className="text-xs font-serif italic text-pink-500 block mt-0.5">✨ {pose.benefit}</span>
                    </div>
                    
                    <button 
                      onClick={() => handleStartPractice(pose)}
                      className="ml-auto px-6 py-3 bg-gradient-to-r from-pink-400 to-rose-400 hover:from-pink-500 hover:to-rose-500 text-white font-extrabold uppercase text-[9px] tracking-widest rounded-full shadow-md hover:shadow-lg hover:scale-[1.02] active:scale-95 transition-all cursor-pointer flex items-center gap-1.5"
                    >
                      <span>▶️</span>
                      <span>Enter Practice Studio</span>
                    </button>
                  </div>
                </div>

              </div>
            ))}
          </div>

          {/* Guided Meditation Prompt Banner */}
          <div className="bg-gradient-to-r from-pink-400 via-rose-400 to-indigo-500 p-8 rounded-[2.5rem] text-white flex flex-col md:flex-row items-center justify-between gap-6 shadow-lg shadow-pink-100">
             <div className="space-y-1.5 text-center md:text-left">
                <p className="text-xl font-serif italic font-bold">Need a guided meditation?</p>
                <p className="text-xs opacity-90 font-serif italic">Let Lumina's beautiful therapeutic voice coach guide your body posture on standard cycles.</p>
             </div>
             <button 
               onClick={() => {
                 if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
                   window.speechSynthesis.cancel();
                   const text = "Sit back, close your eyes, and allow your beautiful body to rest. Inhale love, hold peace, exhale all your concerns.";
                   const utterance = new SpeechSynthesisUtterance(text);
                   utterance.rate = 0.85;
                   window.speechSynthesis.speak(utterance);
                 }
               }}
               className="bg-white text-pink-500 px-6 py-3.5 rounded-full font-black text-[10px] uppercase shadow-lg hover:scale-105 active:scale-95 transition-all shrink-0 cursor-pointer"
             >
               🎙️ Listen to Chime Guide
             </button>
          </div>

        </div>
      )}

      {/* PRACTICE HISTORY SLIDING OVERLAY SHEET (MODAL) */}
      {showHistoryModal && (
        <div className="fixed inset-0 z-[110] bg-stone-950/60 backdrop-blur-sm flex items-center justify-end animate-fadeIn">
          <div className="bg-white w-full max-w-md h-full shadow-2xl p-6 md:p-8 flex flex-col justify-between overflow-y-auto animate-slideIn">
            
            <div className="space-y-6">
              {/* Header */}
              <div className="flex justify-between items-center border-b border-pink-50 pb-4">
                <div className="flex items-center gap-2.5">
                  <span className="text-xl">📁</span>
                  <div>
                    <h4 className="text-lg font-serif text-pink-900 font-bold italic">Practice Records</h4>
                    <p className="text-[8px] font-black uppercase tracking-widest text-pink-400">Somatic Care Logs</p>
                  </div>
                </div>

                <button 
                  onClick={() => setShowHistoryModal(false)}
                  className="w-8 h-8 rounded-full bg-stone-100 hover:bg-stone-200 flex items-center justify-center text-stone-500 transition-colors cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              {/* History checklist logs list */}
              <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
                {yogaLogs.length === 0 ? (
                  <div className="text-center py-12 space-y-3">
                    <span className="text-4xl block opacity-35">🧘‍♀️</span>
                    <p className="text-xs text-stone-400 font-serif italic">Your practice record book is empty, darling.</p>
                    <p className="text-[9px] text-pink-400 uppercase tracking-widest font-bold">Start a pose to log consistency</p>
                  </div>
                ) : (
                  yogaLogs.map((log) => (
                    <div 
                      key={log.id} 
                      className="bg-pink-50/30 border border-pink-100/50 p-4 rounded-2xl flex justify-between items-center group relative hover:border-pink-200 transition-all"
                    >
                      <div className="space-y-1 pr-6">
                        <span className="text-[8px] font-mono font-bold text-pink-400 uppercase tracking-wide block">
                          {new Date(log.date).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </span>
                        <h5 className="text-sm font-serif font-bold text-stone-800 italic leading-none">{log.poseName}</h5>
                        <p className="text-[10px] text-gray-500 leading-tight pt-0.5">{log.benefit}</p>
                        <span className="text-[9px] text-emerald-600 font-black uppercase tracking-widest bg-emerald-50 px-2 py-0.5 rounded-full inline-block mt-1">
                          ⏱️ {log.duration} Mins Logged
                        </span>
                      </div>

                      {/* Delete action */}
                      <button 
                        onClick={() => handleDeleteLog(log.id)}
                        className="w-8 h-8 rounded-full bg-rose-50 text-rose-500 hover:bg-rose-100 hover:text-rose-600 flex items-center justify-center transition-all opacity-80 group-hover:opacity-100 cursor-pointer"
                        title="Delete this record"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="border-t border-pink-50 pt-4 mt-6">
              <button 
                onClick={() => setShowHistoryModal(false)}
                className="w-full py-3 bg-pink-500 hover:bg-pink-600 text-white font-extrabold uppercase text-[10px] tracking-widest rounded-full shadow-md transition-all cursor-pointer"
              >
                Return to Flow Sanctuary
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};

export default YogaTutorials;
