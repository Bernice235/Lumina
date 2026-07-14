import React, { useEffect, useState } from 'react';
import { User, Symptom, Reminder, ReceivedComfort } from '../types';
import { getDailyAffirmation } from '../services/gemini';
import { syncUser } from '../services/firebaseService';
import { SONGS, MOODS, BABY_SIZES } from '../constants';
import { 
  Activity, 
  Heart, 
  Smile, 
  Compass, 
  BookOpen, 
  Video, 
  Play, 
  Calendar, 
  Coffee, 
  Baby, 
  Utensils, 
  Sparkles, 
  Droplet, 
  AlertCircle, 
  CheckCircle, 
  ChevronRight, 
  Music,
  Zap,
  Clock,
  UserCheck,
  Menu,
  Bell,
  X,
  LogOut
} from 'lucide-react';

interface DashboardProps {
  user: User;
  setUser?: (val: User | null | ((prev: User | null) => User | null)) => void;
  partnerUser?: User | null;
  symptoms: Symptom[];
  waterIntake: number;
  setWaterIntake: React.Dispatch<React.SetStateAction<number>>;
  waterGoal: number;
  reminders: Reminder[];
  currentSongIndex: number;
  isMusicPlaying: boolean;
  toggleMusic: () => void;
  nextSong: () => void;
  prevSong: () => void;
  setCurrentSongIndex: (index: number) => void;
  onTabChange?: (tab: string) => void;
  setActiveTab: (tab: string) => void;
  onOpenLogModal?: () => void;
  receivedGifts?: ReceivedComfort[];
  isMusicActive: boolean;
  toggleMusicActive: () => void;
  volume: number;
  setVolume: (v: number) => void;
  togglePregnancy?: () => void;
  partnerRequests?: any[];
  handleLogout?: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({ 
  user, 
  setUser,
  partnerUser,
  symptoms = [],
  waterIntake, 
  setWaterIntake, 
  waterGoal, 
  reminders,
  currentSongIndex,
  isMusicPlaying,
  toggleMusic,
  nextSong,
  prevSong,
  setCurrentSongIndex,
  onTabChange,
  setActiveTab,
  onOpenLogModal,
  receivedGifts = [],
  isMusicActive,
  toggleMusicActive,
  volume,
  setVolume,
  togglePregnancy,
  partnerRequests = [],
  handleLogout
}) => {
  const [affirmation, setAffirmation] = useState("Loading your daily inspiration...");
  const [selectedMood, setSelectedMood] = useState('Happy');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);

  // Pregnancy and Postpartum Custom states
  const [exerciseTrimester, setExerciseTrimester] = useState<1 | 2 | 3>(1);
  const [selectedWeekTab, setSelectedWeekTab] = useState<number>(12);
  const [simulatedVideo, setSimulatedVideo] = useState<{ name: string; duration: string } | null>(null);
  const [videoLoading, setVideoLoading] = useState(false);
  const [videoTimer, setVideoTimer] = useState(10);
  const [isDeliveredModalOpen, setIsDeliveredModalOpen] = useState(false);
  const [deliveryDateInput, setDeliveryDateInput] = useState(new Date().toISOString().split('T')[0]);

  // Postpartum healing checkin states
  const [postpartumMood, setPostpartumMood] = useState<'happy' | 'calm' | 'sensitive' | 'tired' | 'overwhelmed'>('calm');
  const [postpartumSleep, setPostpartumSleep] = useState<number>(6);
  const [postpartumBleeding, setPostpartumBleeding] = useState<'none' | 'spotting' | 'light' | 'medium' | 'heavy'>('light');
  const [breastfeedingMinutes, setBreastfeedingMinutes] = useState<number>(15);
  const [postpartumHydration, setPostpartumHydration] = useState<number>(4);
  const [selfCareCheck, setSelfCareCheck] = useState({
    pelvicFloor: false,
    napTaken: false,
    healingBalm: false,
    nutritiousSoup: false
  });
  const [checkinSuccess, setCheckinSuccess] = useState(false);

  // --- Partner connection request permission setup states & helpers (Steps 3 & 4) ---
  const [isCustomizingSharing, setIsCustomizingSharing] = useState(false);
  const [sharingPrefs, setSharingPrefs] = useState({
    shareCycleInfo: true,
    shareFertilityInfo: false,
    sharePregnancyInfo: false,
    shareMood: false,
    shareSymptoms: false,
    shareIntimacyInfo: false,
    shareDoctorReports: false,
    shareAppointmentReminders: false,
    shareWellnessUpdates: false
  });

  useEffect(() => {
    if (partnerUser?.partnerRequest?.status === 'pending') {
      const requested = partnerUser.partnerRequest.requestedReceives || [];
      setSharingPrefs({
        shareCycleInfo: requested.some(r => r.includes('Period')),
        shareFertilityInfo: requested.some(r => r.includes('Fertility') || r.includes('Ovulation')),
        sharePregnancyInfo: requested.some(r => r.includes('Pregnancy')),
        shareSymptoms: requested.some(r => r.includes('Symptom')),
        shareMood: requested.some(r => r.includes('Mood')),
        shareIntimacyInfo: false, // Default to false for privacy
        shareDoctorReports: false, // Default to false for privacy
        shareAppointmentReminders: requested.some(r => r.includes('Appointment') || r.includes('Doctor')),
        shareWellnessUpdates: requested.some(r => r.includes('Wellness') || r.includes('Suggestions') || r.includes('Support') || r.includes('Gift') || r.includes('Messages')),
      });
    }
  }, [partnerUser?.partnerRequest]);

  const handleApproveAll = async () => {
    if (!partnerUser || !setUser) return;
    const requested = partnerUser.partnerRequest?.requestedReceives || [];
    const approvedSettings = {
      shareCycleInfo: requested.some(r => r.includes('Period')),
      shareFertilityInfo: requested.some(r => r.includes('Fertility') || r.includes('Ovulation')),
      sharePregnancyInfo: requested.some(r => r.includes('Pregnancy')),
      shareSymptoms: requested.some(r => r.includes('Symptom')),
      shareMood: requested.some(r => r.includes('Mood')),
      shareNotes: user.sharingSettings?.shareNotes || false,
      shareIntimacyInfo: false,
      shareDoctorReports: false,
      shareAppointmentReminders: requested.some(r => r.includes('Appointment') || r.includes('Doctor')),
      shareWellnessUpdates: requested.some(r => r.includes('Wellness') || r.includes('Suggestions') || r.includes('Support') || r.includes('Gift') || r.includes('Messages')),
    };
    
    // Update user
    const updatedUser = {
      ...user,
      sharingSettings: approvedSettings,
      isPartnerLinked: true
    };
    setUser(updatedUser);
    await syncUser(updatedUser);

    // Update partner request status to approved
    const updatedPartner = {
      ...partnerUser,
      partnerRequest: {
        ...partnerUser.partnerRequest!,
        status: 'approved' as const
      },
      isPartnerLinked: true
    };
    await syncUser(updatedPartner);
    alert(`You successfully approved ${partnerUser.name}'s connection and sharing preferences! 💖`);
  };

  const handleSaveCustomSharing = async () => {
    if (!partnerUser || !setUser) return;
    const updatedUser = {
      ...user,
      sharingSettings: {
        ...user.sharingSettings,
        ...sharingPrefs,
        shareNotes: user.sharingSettings?.shareNotes || false
      },
      isPartnerLinked: true
    };
    setUser(updatedUser);
    await syncUser(updatedUser);

    const updatedPartner = {
      ...partnerUser,
      partnerRequest: {
        ...partnerUser.partnerRequest!,
        status: 'approved' as const
      },
      isPartnerLinked: true
    };
    await syncUser(updatedPartner);
    setIsCustomizingSharing(false);
    alert(`Custom privacy preferences saved and connection approved for ${partnerUser.name}! 💮`);
  };

  const handleDeclineRequest = async () => {
    if (!partnerUser || !setUser) return;
    if (confirm(`Are you sure you want to decline ${partnerUser.name}'s request?`)) {
      const updatedPartner = {
        ...partnerUser,
        partnerRequest: {
          ...partnerUser.partnerRequest!,
          status: 'declined' as const
        },
        isPartnerLinked: false
      };
      await syncUser(updatedPartner);

      const updatedUser = {
        ...user,
        partnerId: undefined,
        partnerName: '',
        isPartnerLinked: false
      };
      setUser(updatedUser);
      await syncUser(updatedUser);

      alert(`Request from ${partnerUser.name} declined.`);
    }
  };

  const today = new Date();
  const lastStart = user.lastPeriodStart ? new Date(user.lastPeriodStart) : null;
  const cycleLen = user.cycleLength || 28;
  const periodLen = user.periodLength || 5;

  const cycleDay = (() => {
    if (!lastStart) return 1;
    const diffTime = today.getTime() - lastStart.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    let day = (diffDays % cycleLen) + 1;
    if (day <= 0) day += cycleLen;
    return day;
  })();

  const currentPhase = (() => {
    if (cycleDay <= periodLen) return 'Menstrual';
    if (cycleDay <= cycleLen - 14) return 'Follicular';
    if (cycleDay <= cycleLen - 10) return 'Ovulatory';
    return 'Luteal';
  })();

  useEffect(() => {
    if (user.isPregnancyMode) {
      setAffirmation("Bloom beautifully mama. Within you is the warm nursery of a sweet new life. 🌻");
    } else if (user.isPostpartumMode) {
      setAffirmation("Step into quiet. Rest your heavy bones. You created a magnificent miracle 💗");
    } else {
      getDailyAffirmation(user.name, currentPhase, selectedMood).then(setAffirmation);
    }
  }, [user.name, currentPhase, selectedMood, user.isPregnancyMode, user.isPostpartumMode]);

  const getGreeting = () => {
    const hour = today.getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  };

  const handleMoodSelect = (mood: typeof MOODS[0]) => {
    setSelectedMood(mood.label);
    const moodSong = SONGS.find(s => s.tags.includes(mood.songTag));
    if (moodSong) {
      const idx = SONGS.indexOf(moodSong);
      if (idx !== -1) setCurrentSongIndex(idx);
    }
  };

  const activeReminders = reminders.filter(r => !r.isCompleted);
  const fullLibrary = [...SONGS, ...(user.customSongs || [])];
  const currentSong = fullLibrary[currentSongIndex] || fullLibrary[0] || SONGS[0];
  const waterPercentage = Math.min((waterIntake / waterGoal) * 100, 100);

  // Pregnancy calculations
  const pregnancyStart = user.pregnancyStartDate ? new Date(user.pregnancyStartDate) : new Date();
  const diffTime = Math.abs(today.getTime() - pregnancyStart.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  const weeks = Math.min(40, Math.floor(diffDays / 7) + 1);
  const currentBaby = BABY_SIZES[Math.min(weeks, BABY_SIZES.length) - 1] || BABY_SIZES[0];

  // Set default weekly education tab based on current gestational week
  useEffect(() => {
    if (user.isPregnancyMode && weeks > 0 && weeks <= 40) {
      setSelectedWeekTab(weeks);
    }
  }, [user.isPregnancyMode, weeks]);

  // Cycle calculations for Dashboard
  let nextPeriodDate = lastStart ? new Date(lastStart.getTime() + cycleLen * 24 * 60 * 60 * 1000) : null;
  let daysUntilNext = nextPeriodDate ? Math.ceil((nextPeriodDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)) : null;

  // If next period is in the past, calculate the next one
  if (daysUntilNext !== null && daysUntilNext < 0) {
    const cyclesPassed = Math.floor(Math.abs(daysUntilNext) / cycleLen) + 1;
    nextPeriodDate = new Date(nextPeriodDate!.getTime() + cyclesPassed * cycleLen * 24 * 60 * 60 * 1000);
    daysUntilNext = Math.ceil((nextPeriodDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  }

  const cycleStatusText = daysUntilNext === 0 
    ? "Period starts today" 
    : daysUntilNext && daysUntilNext > 0 
      ? `Next period in ${daysUntilNext} days` 
      : "Log a period to see status";

  // Video Demo Simulation
  const startVideoSimulation = (exerciseName: string, duration: string) => {
    setSimulatedVideo({ name: exerciseName, duration });
    setVideoLoading(true);
    setVideoTimer(10);
  };

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (simulatedVideo && videoLoading) {
      timer = setTimeout(() => {
        setVideoLoading(false);
      }, 2500);
    } else if (simulatedVideo && !videoLoading && videoTimer > 0) {
      timer = setInterval(() => {
        setVideoTimer(prev => {
          if (prev <= 1) {
            setSimulatedVideo(null);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      clearTimeout(timer);
      clearInterval(timer);
    };
  }, [simulatedVideo, videoLoading, videoTimer]);

  // Transition to Postpartum Mode Actions
  const handleMarkDelivered = () => {
    if (setUser) {
      setUser(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          isPregnancyMode: false,
          isPostpartumMode: true,
          deliveryDate: deliveryDateInput
        };
      });
      setIsDeliveredModalOpen(false);
    }
  };

  const handleExitPostpartum = () => {
    if (setUser) {
      setUser(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          isPostpartumMode: false,
          lastPeriodStart: new Date().toDateString() // restart standard calculations
        };
      });
    }
  };

  const handlePostpartumCheckin = (e: React.FormEvent) => {
    e.preventDefault();
    setCheckinSuccess(true);
    setTimeout(() => {
      setCheckinSuccess(false);
    }, 4000);
  };

  // Calendar Preview Logic
  const monthName = today.toLocaleString('default', { month: 'long' });
  const year = today.getFullYear();
  const daysInMonth = new Date(year, today.getMonth() + 1, 0).getDate();
  const firstDay = new Date(year, today.getMonth(), 1).getDay();
  const adjustedFirstDay = (firstDay + 6) % 7;

  const getDayStatus = (date: Date) => {
    const dateStr = date.toDateString();
    if (user.periodDates?.includes(dateStr)) return 'period';
    if (nextPeriodDate) {
      const nextStart = new Date(nextPeriodDate);
      const nextEnd = new Date(nextStart.getTime() + (periodLen - 1) * 24 * 60 * 60 * 1000);
      if (date >= nextStart && date <= nextEnd) return 'predicted';
    }
    if (nextPeriodDate) {
      const ovulation = new Date(nextPeriodDate.getTime() - 14 * 24 * 60 * 60 * 1000);
      const fertileStart = new Date(ovulation.getTime() - 3 * 24 * 60 * 60 * 1000);
      const fertileEnd = new Date(ovulation.getTime() + 1 * 24 * 60 * 60 * 1000);
      if (date >= fertileStart && date <= fertileEnd) return 'fertile';
    }
    return 'none';
  };

  const dayStyles = {
    period: 'bg-pink-400 text-white shadow-md shadow-pink-100',
    predicted: 'bg-pink-50 text-pink-400 border border-pink-200 border-dashed',
    fertile: 'bg-teal-50 text-teal-500 border border-teal-100',
    none: 'text-gray-400 hover:bg-pink-50'
  };

  // ==========================================
  // RENDER: PREGNANCY MODE WELLNESS DASHBOARD
  // ==========================================
  const renderPregnancyWellnessDashboard = () => {
    // Trimester Exercises static guidelines
    const exerciseCategories = {
      1: [
        { name: "Light Pelvic Stretch", duration: "10 mins", desc: "Gentle pelvic extension promoting hip mobility early on.", note: "In Trimester 1, avoid lying completely flat, stand or sit on a chair!" },
        { name: "Focus Breathing", duration: "5 mins", desc: "Soothing diaphragmatic inhales to control nausea & ease fatigue.", note: "Perform with eyes half-shut in a quiet spot." },
        { name: "Beginner Pregnancy Yoga", duration: "15 mins", desc: "Delicate cat-cow shifts and support blocks squats to relieve stiffness.", note: "Do not twist your center aggressively." }
      ],
      2: [
        { name: "Mama Glow Yoga Flow", duration: "20 mins", desc: "Grounding flow to strengthen thighs, stretch side body, and build poise.", note: "Practice using wall support for balance check." },
        { name: "Pelvic Girdle Kegels", duration: "10 mins", desc: "Focused Kegels and deep pelvic floor contractions to build birth elasticity.", note: "Repeat smoothly without holding breath." },
        { name: "Safe Moderate Walking", duration: "30 mins", desc: "Paced outdoors walks to keep healthy heart circulation and stamina.", note: "Maintain conversational pace; hydrate constantly." }
      ],
      3: [
        { name: "Nesting Gentle Yoga", duration: "15 mins", desc: "Wide child's pose and soft side stretches with cushions.", note: "Excellent for lower loin support." },
        { name: "Hip-Opening preparation", duration: "12 mins", desc: "Supported sitting butterfly holds and pelvic rocking to soften ligament door.", note: "Very gentle movements only." },
        { name: "Interactive Breathing for Labor", duration: "10 mins", desc: "Rhythmic breathing pacing. Mimicking surge wave relaxation.", note: "Keep face and mouth soft during sighs." }
      ]
    };

    // Weekly pregnancy milestones databases
    const weeklyEducationContent: Record<number, { baby: string; body: string; nutrition: string; exercise: string; skin: string }> = {
      4: {
        baby: "Your baby is currently a tiny blastocyst, safely nested in your uterine wall. Major life patterns are forming 🌱",
        body: "You may experience subtle hormonal twinges. Your body is releasing progesterone to lock the cozy incubator.",
        nutrition: "Folate takes extreme key! Consume beans, spinach, fortified grains to safeguard early neural progress.",
        exercise: "Maintain light walking routines. Keep body core temperature moderate.",
        skin: "Skin is adapting to hormonal shifts; avoid strong chemical peels or chemical creams."
      },
      8: {
        baby: "Your baby is now a raspberry! 🍓 Tiny webbed fingers are forming, and the tiny heart rhythm beats doubly rapid.",
        body: "Morning sickness or active nausea may highlight your hours. Feeling sleepy is totally normal.",
        nutrition: "Eat small, frequent starch crackers. Keep ginger slices handy to calm morning tummy nausea.",
        exercise: "Gentle stretching is lovely to relieve overall upper vertebrae tension.",
        skin: "Begin applying clean hydration oils to lock natural protective layers."
      },
      12: {
        baby: "Your baby is the size of a lime! 🍋 Microscopic fingernails are taking shape, and baby's face looks extremely human.",
        body: "Your womb rises above the pelvic girdle. Morning nauseas might slowly subside as placenta wraps its flow.",
        nutrition: "Boost calcium! Eat sesame seeds, yoghurt parfaits, broccoli to help baby form beautiful bone structures.",
        exercise: "Kegels are vital starting this stage to support heavy bladder pressure.",
        skin: "Hydrating organic coconut or shea butter aids elastic stomach stretching."
      },
      16: {
        baby: "Baby is an avocado 🥑! Muscle movements are developing, and they might open tiny eyes inside the fluid dark.",
        body: "You might feel a sudden surge of physical energy. A gentle maternity contour starts to bloom on your waist.",
        nutrition: "Iron is critical to supply the doubled vascular flow. Include darker legumes and organic leafy greens.",
        exercise: "Enjoy moderate pregnancy yoga flows to stretch groin and support heavy spinal weight.",
        skin: "Keep moisturizing the belly corridor to alleviate mild stretching itching."
      },
      20: {
        baby: "The halfway mark! Baby is a sweet banana 🍌. They can swallow fluid, and a fine protective coat of lanugo grows.",
        body: "You may start feeling delicate flutter butterfly movements (quickening)! Your lungs are working extra hard.",
        nutrition: "Incorporate Vitamin C with iron foods to optimize intake efficiency. Orange slices with spinach works wonders.",
        exercise: "Practice standing pelvic tilts. They prevent round ligament pull and back strain.",
        skin: "Safe sunscreen is essential; pregnancy skin is extra prone to sun-induced pigmentation (chloasma)."
      },
      24: {
        baby: "Baby is the size of a corn cob 🌽. Inner ear membranes are finalized; baby can hear your beautiful voice and lullabies!",
        body: "Spinal center of balance moves forward. Take steps slowly; lower loin muscles may fatigue easily.",
        nutrition: "Choline is vital for baby's high density memory structures. Organic egg yolks or baked beans are premium sources.",
        exercise: "Pelvic floor support squats are perfect for leg stamina prep.",
        skin: "Apply soothing cucumber cooling gels to release tension from stretched hips."
      },
      28: {
        baby: "Third Trimester boundary! Baby is an eggplant 🍆. They can blink their cute eyes, and light brain waves are tracking.",
        body: "Indigestion or mild heartburn might crop up. Sleeping on your left side with pillows is highly advisory.",
        nutrition: "Fibers and steady hydration keep digestion light. Take water with squeeze of fresh lime.",
        exercise: "Gentle deep squats using support cushions prep pelvic opening paths.",
        skin: "Elastic skin oils are highly useful as stretching hits peak speed."
      },
      32: {
        baby: "Baby is a golden squash 🎃. Nails have reached finger edges. Baby spends hours cozy in deep REM sleep loops.",
        body: "Shortness of breath is common as your womb elevates toward the ribcage. Gentle rest is mandatory.",
        nutrition: "Healthy fats (omega-3s in flaxseeds/walnuts) help baby's brain cells settle into perfect patterns.",
        exercise: "Diaphragmatic breathing is the perfect way to make room for full oxygen flow.",
        skin: "Pure shea creams relieve the taut, stretched stomach tightness."
      },
      36: {
        baby: "Baby is a honeydew melon 🍈! Lungs are nearly full-term solid. Baby drops lower into pelvic position (lightening).",
        body: "Contractions (Braxton Hicks) may feel tighter. Bladder pressure goes double; you will need to void extra often.",
        nutrition: "Warm easily digestible soups and warm teas. Prepare your body without bloated feeling.",
        exercise: "Focus entirely on soft labor breathing rehearsals. Release pelvic floor fully.",
        skin: "Massage your stretch points gently with warm sweet almond oil."
      },
      40: {
        baby: "Full term watermelon 🍉! Ready to hold and sniff. Your beautiful miracle is prepared to meet the light!",
        body: "Any day now! The cervix is softening and dilating. Trust your biological wisdom mama.",
        nutrition: "Keep hydration high. Take honey spoons or warm dates for instant birthing stamina.",
        exercise: "Gentle hip sway movements on a birth ball to relax heavy surges.",
        skin: "Keep skin soft, organic materials only. Welcome the nursing journey."
      }
    };

    const edWeek = weeklyEducationContent[selectedWeekTab] || weeklyEducationContent[12];

    return (
      <div className="space-y-8 animate-fadeIn">
        {/* Header Hero */}
        <section className="bg-gradient-to-br from-indigo-500 via-indigo-400 to-purple-400 p-8 rounded-[3rem] text-white shadow-xl shadow-indigo-100/50 relative overflow-hidden">
          <div className="relative z-10 space-y-4">
            <span className="px-3.5 py-1.5 bg-white/20 backdrop-blur-md rounded-full text-[10px] font-black tracking-widest uppercase border border-white/25">Pregnancy Sanctuary ON</span>
            <div className="space-y-2">
              <h2 className="text-3xl md:text-5xl font-serif italic text-white font-thin">Hey mama, welcome 💗</h2>
              <p className="text-sm opacity-90 max-w-xl font-serif italic">“{affirmation}”</p>
            </div>
            
            <div className="pt-4 flex flex-col md:flex-row gap-6 justify-between items-stretch md:items-center border-t border-white/10">
              <div className="flex items-center gap-4">
                <div className="text-5xl">{currentBaby.fruit}</div>
                <div>
                  <p className="text-lg font-bold font-serif italic">Week {weeks} Pregnancy</p>
                  <p className="text-xs opacity-75">Baby size of a <span className="underline font-bold">{currentBaby.size}</span></p>
                </div>
              </div>

              <button 
                onClick={() => setIsDeliveredModalOpen(true)}
                className="px-6 py-3.5 bg-yellow-400 text-indigo-950 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-lg hover:scale-[1.03] transition-transform flex items-center justify-center gap-2 border-2 border-white"
              >
                <span>👶</span> Baby is Delivered! 🎉
              </button>
            </div>
          </div>
          <span className="absolute -bottom-12 -right-12 text-[14rem] opacity-5 select-none pointer-events-none">🤰</span>
        </section>

        {/* Exercises Section */}
        <section className="bg-white p-8 rounded-[3rem] border border-indigo-50 shadow-sm space-y-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2">
            <div className="space-y-1">
              <span className="px-3 py-1 bg-indigo-50 text-indigo-500 rounded-full text-[9px] font-black uppercase tracking-wider">trimester movement</span>
              <h3 className="text-2xl font-serif italic text-indigo-600">Pregnancy-Safe Exercises</h3>
            </div>
            {/* Trimester switcher */}
            <div className="flex bg-indigo-50/50 p-1.5 rounded-2xl border border-indigo-100/40">
              {([1, 2, 3] as const).map(tri => (
                <button
                  key={tri}
                  onClick={() => setExerciseTrimester(tri)}
                  className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wide transition-all ${exerciseTrimester === tri ? 'bg-indigo-500 text-white shadow-md' : 'text-indigo-400 hover:text-indigo-600'}`}
                >
                  Tri {tri}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {exerciseCategories[exerciseTrimester].map((ex, i) => (
              <div key={i} className="p-5 bg-indigo-50/20 border border-indigo-50/50 rounded-2xl space-y-3 flex flex-col justify-between hover:border-indigo-200 transition-colors">
                <div className="space-y-2">
                  <div className="flex justify-between items-start">
                    <span className="text-xs font-serif italic font-bold text-indigo-600">{ex.name}</span>
                    <span className="text-[9px] font-black uppercase tracking-wider bg-indigo-50 text-indigo-500 px-2.5 py-1 rounded-full">{ex.duration}</span>
                  </div>
                  <p className="text-[11px] text-gray-500 leading-relaxed font-medium">{ex.desc}</p>
                </div>
                <div className="pt-2.5 border-t border-indigo-50">
                  <p className="text-[8px] font-black uppercase tracking-widest text-indigo-400">safety check</p>
                  <p className="text-[9px] text-indigo-800 italic font-semibold">{ex.note}</p>
                  <button
                    onClick={() => startVideoSimulation(ex.name, ex.duration)}
                    className="mt-3.5 w-full py-2 bg-indigo-100 hover:bg-indigo-200 text-indigo-600 font-bold uppercase text-[9px] tracking-widest rounded-xl flex items-center justify-center gap-1.5 transition-all"
                  >
                    <Video size={11} /> Play tutorial video
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-amber-50 p-4 rounded-2xl border border-amber-200/50 flex gap-3 items-center">
            <AlertCircle size={18} className="text-amber-600 shrink-0" />
            <p className="text-[10px] text-amber-950 font-semibold leading-relaxed">
              <strong>Check with your doctor first:</strong> Standard pregnancy exercises list represents educational guidelines. Discontinue any pose causing tight pulls, twinges, or shortness of breath.
            </p>
          </div>
        </section>

        {/* Simulated Tutorial Video Modal */}
        {simulatedVideo && (
          <div className="fixed inset-0 bg-indigo-950/80 backdrop-blur-md z-[300] flex items-center justify-center p-4">
            <div className="bg-white rounded-[3rem] p-8 max-w-sm w-full space-y-6 text-center shadow-2xl border border-indigo-100">
              <span className="text-4xl animate-bounce">🧘‍♀️</span>
              <div>
                <h4 className="text-xl font-serif italic text-indigo-600">{simulatedVideo.name}</h4>
                <p className="text-[10px] font-black uppercase tracking-widest text-indigo-300">Sanctuary Exercise Simulation ({simulatedVideo.duration})</p>
              </div>

              {videoLoading ? (
                <div className="space-y-4 py-6">
                  <div className="w-12 h-12 border-4 border-indigo-100 border-t-indigo-500 rounded-full animate-spin mx-auto"></div>
                  <p className="text-xs text-indigo-500 italic font-semibold leading-none animate-pulse">Buffering tutorial stream, mama...</p>
                </div>
              ) : (
                <div className="space-y-6 py-4 animate-fadeIn">
                  <div className="w-24 h-24 rounded-full bg-indigo-50 border-4 border-indigo-400 flex items-center justify-center mx-auto animate-ping">
                    <span className="text-3xl">✨</span>
                  </div>
                  <p className="text-[11px] text-indigo-600 font-bold tracking-tight">
                    Inhale deeply... repeat slowly. Focus on the core... 🌸
                  </p>
                  <div className="text-[10px] font-black text-indigo-400 uppercase">
                    Ends in {videoTimer} seconds
                  </div>
                </div>
              )}

              <button
                onClick={() => setSimulatedVideo(null)}
                className="w-full py-3 bg-indigo-500 text-white font-bold uppercase text-[10px] tracking-widest rounded-xl hover:bg-indigo-600"
              >
                Close tutorial
              </button>
            </div>
          </div>
        )}

        {/* Nutrition and Skincare Infusion */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white p-8 rounded-[2.5rem] border border-indigo-50 shadow-sm space-y-4">
            <h4 className="text-lg font-serif text-indigo-600 italic flex items-center gap-2.5">
              <Utensils size={18} className="text-indigo-400" /> Healthy meals & Infusions
            </h4>
            <div className="space-y-3.5 pt-2">
              <div className="p-4 bg-indigo-50/10 border border-indigo-50/50 rounded-2xl flex items-start gap-3">
                <span className="text-2xl mt-0.5">🥑</span>
                <div>
                  <span className="text-[10px] font-black uppercase text-indigo-400 tracking-wider">Nutrition Highlights</span>
                  <p className="text-xs text-indigo-950 font-serif italic font-bold">Folate, Iron, Protein boosts</p>
                  <p className="text-[10px] text-gray-400 font-medium leading-relaxed">Eat slow-broth local soups, baked avocado frittatas, or sesame greens.</p>
                </div>
              </div>
              
              <div className="p-4 bg-amber-50/30 border border-amber-100/40 rounded-2xl flex items-start gap-3">
                <span className="text-2xl mt-0.5">🍵</span>
                <div>
                  <span className="text-[10px] font-black uppercase text-amber-600 tracking-wider">Pregnancy-safe Teas</span>
                  <p className="text-xs text-amber-950 font-serif italic font-bold">Ginger, Peppermint, Red Raspberry</p>
                  <p className="text-[10px] text-amber-900 leading-relaxed font-semibold">
                    Ginger infusion targets fatigue; Peppermint releases gas. Red Raspberry is *only* recommended for uterine stamina in Trimester 3—consult obstetrician first!
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white p-8 rounded-[2.5rem] border border-indigo-50 shadow-sm space-y-4">
            <h4 className="text-lg font-serif text-indigo-600 italic flex items-center gap-2.5">
              <Sparkles size={18} className="text-indigo-400" /> Skincare Pregnancy-Safe Rituals
            </h4>
            <ul className="space-y-3 text-sm text-gray-500 font-serif italic pt-2">
              <li className="flex gap-2.5">
                <span className="text-indigo-300 mt-1">•</span>
                Use rich biological cocoa or whipped shea fat butter to lock belly layers.
              </li>
              <li className="flex gap-2.5">
                <span className="text-indigo-300 mt-1">•</span>
                Ensure 100% avoidance of chemical retinoids, hydroquinone, or chemical exfoliants.
              </li>
              <li className="flex gap-2.5">
                <span className="text-indigo-300 mt-1">•</span>
                Stay hydrated to maintain dermal fiber elasticity naturally from within.
              </li>
            </ul>
          </div>
        </section>

        {/* Weekly Education Hub */}
        <section className="bg-white p-8 rounded-[3rem] border border-indigo-50 shadow-sm space-y-6">
          <div className="space-y-1">
            <span className="px-3 py-1 bg-indigo-50 text-indigo-500 rounded-full text-[9px] font-black uppercase tracking-wider">Maternal Study corner</span>
            <h3 className="text-2xl font-serif italic text-indigo-600">Weekly Pregnancy Education Hub</h3>
            <p className="text-xs text-gray-400">Track and study baby's details, maternal structural edits, skincare advice, and recipes week-by-week.</p>
          </div>

          {/* Quick weeks toggler slider */}
          <div className="flex gap-2 overflow-x-auto pb-4 pt-1 scrollbar-hide">
            {(Object.keys(weeklyEducationContent).map(Number).sort((a,b)=>a-b)).map(wk => (
              <button
                key={wk}
                onClick={() => setSelectedWeekTab(wk)}
                className={`flex-shrink-0 px-4 py-2.5 rounded-xl text-xs font-bold transition-all relative ${selectedWeekTab === wk ? 'bg-indigo-500 text-white shadow-md font-extrabold scale-105' : 'bg-indigo-50/40 text-indigo-400 hover:bg-indigo-50 border border-indigo-50'}`}
              >
                Week {wk} 
                {wk === weeks && <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-yellow-400 border border-white rounded-full animate-ping"></span>}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            <div className="p-5.5 bg-indigo-50/30 rounded-2xl border border-indigo-100/30 space-y-2">
              <span className="text-xs font-black uppercase tracking-wider text-indigo-500 flex items-center gap-1.5"><Baby size={13} /> Baby's Progress</span>
              <p className="text-sm text-gray-600 leading-relaxed font-serif italic">"{edWeek.baby}"</p>
            </div>
            
            <div className="p-5.5 bg-purple-50/30 rounded-2xl border border-purple-100/30 space-y-2">
              <span className="text-xs font-black uppercase tracking-wider text-purple-500 flex items-center gap-1.5"><Compass size={13} /> Mama's Body & Skin Shifts</span>
              <p className="text-sm text-gray-600 leading-relaxed font-serif italic">"{edWeek.body}" <br/><span className="text-[10px] text-purple-400 font-sans font-black block mt-2 uppercase tracking-widest">skin care advice:</span> "{edWeek.skin}"</p>
            </div>

            <div className="p-5.5 bg-amber-50/20 rounded-2xl border border-amber-100/20 space-y-2">
              <span className="text-xs font-black uppercase tracking-wider text-amber-600 flex items-center gap-1.5"><Utensils size={13} /> Nutritional Additions</span>
              <p className="text-sm text-gray-600 leading-relaxed font-serif italic">"{edWeek.nutrition}"</p>
            </div>

            <div className="p-5.5 bg-teal-50/20 rounded-2xl border border-teal-100/25 space-y-2">
              <span className="text-xs font-black uppercase tracking-wider text-teal-600 flex items-center gap-1.5"><Activity size={13} /> Active Movement Focus</span>
              <p className="text-sm text-gray-600 leading-relaxed font-serif italic">"{edWeek.exercise}"</p>
            </div>
          </div>
        </section>

        {/* Connected Partner Pregnancy notifications widget */}
        {user.isPartnerLinked && (
          <section className="bg-indigo-950 text-white p-8 rounded-[3.5rem] relative overflow-hidden space-y-4">
             <div className="relative z-10 space-y-2">
                <span className="px-3 py-1 bg-indigo-800 text-indigo-200 rounded-full text-[8px] font-black uppercase tracking-widest">Linked partner support sync</span>
                <h4 className="text-xl font-serif italic text-indigo-200">Shared Pregnancy Companion Reminders</h4>
                <p className="text-xs opacity-80 leading-relaxed max-w-xl font-serif italic">
                  Since you enabled shared notifications, your connected partner ({user.partnerName}) receives real-time assistance tips on their device, like:
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-3">
                  <div className="p-4 bg-white/5 border border-white/10 rounded-2xl italic text-[11px] opacity-90 font-serif leading-relaxed">
                    “She may need extra support today 💗 check in on her and maybe surprise her with comforting snacks or tea 🌸”
                  </div>
                  <div className="p-4 bg-white/5 border border-white/10 rounded-2xl italic text-[11px] opacity-90 font-serif leading-relaxed">
                     “She has an appointment this week 🩺 maybe help pack her maternity notebook and offer to drive 💕”
                  </div>
                  <div className="p-4 bg-white/5 border border-white/10 rounded-2xl italic text-[11px] opacity-90 font-serif leading-relaxed">
                     “Your little sprout is going fast this week 👶 check up on her fatigue and offer a cozy foot backrub 💗”
                  </div>
                  <div className="p-4 bg-white/5 border border-white/10 rounded-2xl italic text-[11px] opacity-90 font-serif leading-relaxed">
                     “Check in on her hydration levels 💧 keep her custom pastel water flask locked and chilled today 💕”
                  </div>
                </div>
             </div>
             <span className="absolute bottom-[-10%] left-[-5%] text-[10rem] opacity-5 select-none pointer-events-none">💞</span>
          </section>
        )}
      </div>
    );
  };

  // ==========================================
  // RENDER: POSTPARTUM RECOVERY WELLNESS DASHBOARD
  // ==========================================
  const renderPostpartumWellnessDashboard = () => {
    // Cultural warm recipes database
    const traditionalRecipes = [
      {
        name: "Korean Seaweed Soup (Miyeok-guk)",
        culture: "Korean Tradition",
        purpose: "Blood Cleansing & Lactation Volume support",
        ingredients: ["Dried brown seaweed (Miyeok)", "Clean beef shank or minced garlic pieces", "Toasted sesame seed oil", "Sea salt, drop of soy sauce"],
        prep: "Soak seaweed in cool water for 25 mins. Rinse and drain cleanly, then chop. Sauté with sesame seed oil and garlic. Add bone broth or water and boil on low temperature for 45 minutes to tenderize. Sip warm."
      },
      {
        name: "Warm Ginger & Scomber Broth",
        culture: "South Asian Tradition",
        purpose: "Womb Warming & Dispelling Pelvic Wind/Gas",
        ingredients: ["Fresh shredded ginger slices (3 inches)", "Fish bone base broth", "Handful of goji berries", "Scallion stems"],
        prep: "Boil ginger and fish bones on medium flame. Strain broth to acquire a clean clear golden liquid. Float goji berries and scallions, simmer for 15 minutes. Serve extremely hot to promote perspiration and joint relief."
      },
      {
        name: "Cinnamon & Jujube Rice Congee",
        culture: "Traditional Eastern Health",
        purpose: "Extremely Gentle Digestive recovery & Yang energy",
        ingredients: ["Local whole jasmine rice (1 cup)", "Filtered water (7 cups)", "Pitted red jujube dates (5)", "Shaved cassia cinnamon stick"],
        prep: "Place washed rice, dates, and water in a deep clay pot. Slowly simmer on low for 1.5 hours until rice dissolves into a velvety congee paste. Toss cinnamon stick, ladle into bowls, serve warm."
      }
    ];

    // Restorative gentle tutorials
    const postpartumGentlyYoga = [
      { name: "Deep Diaphragmatic Breath", duration: "5 mins", desc: "Helps gently realign deep abdominal tissue wall sheets.", warning: "Do not pull belly layers with too much torque." },
      { name: "Early Pelvic Floor Rehab (Kegels)", duration: "8 mins", desc: "Gentle contraction holds to assist perineal recovery.", warning: "Squeeze soft, release completely." },
      { name: "Shoulder Chest Openers", duration: "10 mins", desc: "Releases pectoral tension from nursing cradles.", warning: "Perform seated using clean supports." },
      { name: "Supportive Child's Pose", duration: "12 mins", desc: "Gently stretches the back muscles after carriage pressure.", warning: "Widen knees to avoid pelvic compression." }
    ];

    return (
      <div className="space-y-8 animate-fadeIn">
        {/* Header Hero */}
        <section className="bg-gradient-to-br from-[#4f46e5] via-[#4338ca] to-[#312e81] p-8 rounded-[3rem] text-white shadow-xl relative overflow-hidden">
          <div className="relative z-10 space-y-4">
            <span className="px-3.5 py-1.5 bg-pink-500 text-white rounded-full text-[9px] font-black tracking-widest uppercase border border-pink-400">Postpartum recovery Mode ON</span>
            <div className="space-y-2">
              <h2 className="text-3xl md:text-5xl font-serif italic text-white font-thin">Sanctuary Healing, {user.name} 💗</h2>
              <p className="text-sm opacity-90 max-w-xl font-serif italic">“{affirmation}”</p>
            </div>
            
            <div className="pt-4 flex flex-col md:flex-row gap-6 justify-between items-stretch md:items-center border-t border-white/10">
              <div className="flex items-center gap-3">
                <span className="text-3xl">🌿</span>
                <p className="text-xs text-indigo-200">Focus: Gentle organ recovery, pelvic tissue closing, nesting comfort, lactation rhythm.</p>
              </div>

              <button 
                onClick={handleExitPostpartum}
                className="px-6 py-3 bg-red-500 hover:bg-red-600 text-white rounded-2xl font-black uppercase text-[9px] tracking-widest shadow-lg flex items-center justify-center gap-1.5 transition-transform"
              >
                <span>🌸</span> Exit Postpartum and resume classical Period Tracker
              </button>
            </div>
          </div>
          <span className="absolute -bottom-12 -right-12 text-[14rem] opacity-5 select-none pointer-events-none">🍼</span>
        </section>

        {/* Daily Healing Logging Check-in Form */}
        <section className="bg-white p-8 rounded-[3rem] border border-pink-100 shadow-sm space-y-6">
          <div className="space-y-1">
             <span className="px-3 py-1 bg-pink-50 text-pink-500 rounded-full text-[9px] font-black uppercase tracking-wider">daily healing monitor</span>
             <h3 className="text-2xl font-serif italic text-slate-800">Postpartum Healing Check-in</h3>
             <p className="text-xs text-gray-400">A compassionate logs tracking physical and emotional healing steps day-by-day.</p>
          </div>

          {checkinSuccess && (
            <div className="p-4 bg-teal-50 border border-teal-200 text-teal-800 rounded-2xl flex items-center gap-2 animate-fadeIn">
              <CheckCircle size={18} className="text-teal-600" />
              <p className="text-xs font-bold font-serif italic">Sanctuary Healing Logged! Breathe deep, you are recovering beautifully 🌸</p>
            </div>
          )}

          <form onSubmit={handlePostpartumCheckin} className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
             <div className="space-y-4">
                {/* 1. Mood slider/buttons */}
                <div className="space-y-2">
                   <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">Healing Emotional Mood</label>
                   <div className="grid grid-cols-5 gap-1 pt-1">
                     {(['happy', 'calm', 'sensitive', 'tired', 'overwhelmed'] as const).map(md => (
                       <button
                         key={md}
                         type="button"
                         onClick={() => setPostpartumMood(md)}
                         className={`py-2 px-1 rounded-xl text-xs font-bold border transition-all ${postpartumMood === md ? 'bg-pink-100 border-pink-400 text-pink-600 scale-105 font-black' : 'bg-white border-gray-100 text-gray-500 hover:border-pink-200'}`}
                       >
                         <span className="block text-lg">{md === 'happy' ? '😊' : md === 'calm' ? '😌' : md === 'sensitive' ? '🥺' : md === 'overwhelmed' ? '🌪️' : '🥱'}</span>
                         <span className="text-[8px] uppercase">{md}</span>
                       </button>
                     ))}
                   </div>
                </div>

                {/* 2. Sleep interval tracking */}
                <div className="space-y-2">
                   <div className="flex justify-between items-center">
                     <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">Aggregate Sleep Hours (Cumulative)</label>
                     <span className="text-xs font-serif italic font-bold text-pink-500">{postpartumSleep} hours</span>
                   </div>
                   <input
                     type="range" min="3" max="12" step="0.5"
                     value={postpartumSleep}
                     onChange={(e) => setPostpartumSleep(parseFloat(e.target.value))}
                     className="w-full accent-pink-500"
                   />
                </div>

                {/* 3. Hydration check */}
                <div className="space-y-2">
                   <div className="flex justify-between items-center2">
                     <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">Hydration Intake (Liters)</label>
                     <span className="text-xs font-serif italic font-bold text-pink-500">{postpartumHydration} L</span>
                   </div>
                   <input
                     type="range" min="1" max="6" step="0.5"
                     value={postpartumHydration}
                     onChange={(e) => setPostpartumHydration(parseFloat(e.target.value))}
                     className="w-full accent-pink-500"
                   />
                </div>
             </div>

             <div className="space-y-4">
                {/* 4. Lochia / bleeding log */}
                <div className="space-y-2">
                   <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">Bleeding / Lochia Intensity</label>
                   <div className="grid grid-cols-5 gap-1">
                     {(['none', 'spotting', 'light', 'medium', 'heavy'] as const).map(bl => (
                       <button
                         key={bl}
                         type="button"
                         onClick={() => setPostpartumBleeding(bl)}
                         className={`py-2 px-1 rounded-xl text-[9px] font-bold border transition-all capitalize ${postpartumBleeding === bl ? 'bg-red-50 border-red-400 text-red-600 scale-105 font-black' : 'bg-white border-gray-100 text-gray-500 hover:border-red-200'}`}
                       >
                         {bl}
                       </button>
                     ))}
                   </div>
                   {postpartumBleeding === 'heavy' && (
                     <p className="text-[9px] text-red-500 font-semibold italic">⚠️ Inform your midwife or physician if bleeding persists or clots are large.</p>
                   )}
                </div>

                {/* 5. breastfeeding helper */}
                <div className="space-y-2">
                   <div className="flex justify-between items-center">
                     <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">Breastfeeding feeds logs (Duration)</label>
                     <span className="text-xs font-serif italic font-bold text-indigo-500">{breastfeedingMinutes} Mins</span>
                   </div>
                   <input
                     type="range" min="5" max="60" step="5"
                     value={breastfeedingMinutes}
                     onChange={(e) => setBreastfeedingMinutes(parseInt(e.target.value))}
                     className="w-full accent-indigo-500"
                   />
                </div>

                {/* 6. Self care checkbox list */}
                <div className="space-y-2">
                   <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">Completed Core Self-Care Tasks</label>
                   <div className="grid grid-cols-2 gap-2 pt-1 font-sans">
                     {[
                       { key: 'pelvicFloor', label: 'Pelvic breathe rehab' },
                       { key: 'napTaken', label: 'Sunset nap taken 🛌' },
                       { key: 'healingBalm', label: 'Witch hazel comforts' },
                       { key: 'nutritiousSoup', label: 'Warm recovery soup 🍵' }
                     ].map(sc => (
                       <label key={sc.key} className="flex items-center gap-2 bg-pink-50/15 border border-pink-100/10 p-2.5 rounded-xl cursor-pointer">
                         <input
                           type="checkbox"
                           checked={selfCareCheck[sc.key as keyof typeof selfCareCheck]}
                           onChange={(e) => {
                             setSelfCareCheck(prev => ({ ...prev, [sc.key]: e.target.checked }));
                           }}
                           className="accent-pink-500 w-3.5 h-3.5"
                         />
                         <span className="text-[10px] text-gray-600 font-bold">{sc.label}</span>
                       </label>
                     ))}
                   </div>
                </div>
             </div>

             <div className="md:col-span-2 pt-2">
                <button
                  type="submit"
                  className="w-full py-4 bg-gradient-to-r from-pink-500 to-rose-500 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-lg shadow-pink-100 hover:scale-[1.01] active:scale-[0.99] transition-all"
                >
                   ✨ Save Healing Logs to Sanctuary &rarr;
                </button>
             </div>
          </form>
        </section>

        {/* Traditional Cultural Recovery Meals */}
        <section className="bg-white p-8 rounded-[3rem] border border-pink-100 shadow-sm space-y-6">
          <div className="space-y-1">
             <span className="px-3 py-1 bg-pink-50 text-pink-500 rounded-full text-[9px] font-black uppercase tracking-wider">healing diet corner</span>
             <h3 className="text-2xl font-serif italic text-slate-800">Postpartum Traditional Recovery Nutrition</h3>
             <p className="text-xs text-gray-400">Warm, mineral-dense meals meant to close the body, stimulate lactation, and replace hydration elements.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
             {traditionalRecipes.map((rc, i) => (
               <div key={i} className="p-5.5 bg-pink-50/10 border border-pink-50/50 rounded-2xl flex flex-col justify-between hover:border-pink-200 transition-all">
                  <div className="space-y-3">
                     <div className="space-y-0.5">
                       <span className="text-[8px] tracking-[0.15em] font-black uppercase text-pink-400 block">{rc.culture}</span>
                       <span className="text-sm font-serif font-black text-slate-800 leading-snug block">{rc.name}</span>
                     </div>
                     
                     <div className="p-2 bg-pink-50/20 border border-pink-50/30 rounded-xl text-[9px] text-pink-600 italic font-semibold leading-relaxed">
                        <strong>Lactation/Recovery:</strong> {rc.purpose}
                     </div>

                     <div className="text-[10px] leading-relaxed">
                        <span className="font-bold text-gray-600 block mb-0.5">Ingredients:</span>
                        <p className="text-gray-400 italic font-serif">{rc.ingredients.join(", ")}</p>
                     </div>
                  </div>

                  <div className="mt-4 pt-4 border-t border-dashed border-pink-100">
                     <span className="text-[9px] font-black uppercase text-slate-500 block mb-1">Preparation steps</span>
                     <p className="text-[10px] text-gray-500 leading-relaxed font-serif italic truncate-3-lines mb-0.5">{rc.prep}</p>
                  </div>
               </div>
             ))}
          </div>

          <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200/50 flex gap-2.5 items-start">
             <AlertCircle size={16} className="text-amber-600 shrink-0 mt-0.5" />
             <div className="space-y-0.5">
               <span className="text-[9px] font-black uppercase text-amber-700 tracking-widest block">Educational Purpose Disclaimer</span>
               <p className="text-[9px] text-amber-900 leading-relaxed font-semibold">
                  Traditional dietary remedies represent historical self-care wisdom and support rituals. They are NOT clinical medical treatments, diagnosis, or medication. Always get qualified medical evaluation for custom supplementation or pain reliefs.
               </p>
             </div>
          </div>
        </section>

        {/* Postpartum recovery wellness guided videos */}
        <section className="bg-white p-8 rounded-[3rem] border border-pink-100 shadow-sm space-y-6">
          <div className="space-y-1">
             <span className="px-3 py-1 bg-pink-50 text-pink-500 rounded-full text-[9px] font-black uppercase tracking-wider">guided rehab</span>
             <h3 className="text-2xl font-serif italic text-slate-800">Postpartum Gentle Wellness Exercises</h3>
             <p className="text-xs text-gray-400">Rehabilitating movements aimed at pelvic and posture decompression safely.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {postpartumGentlyYoga.map((ex, i) => (
              <div key={i} className="p-4 bg-pink-50/5 border border-pink-100/20 rounded-2xl flex flex-col justify-between hover:border-pink-200 transition-colors">
                 <div className="space-y-1.5">
                   <div className="flex justify-between items-start">
                      <span className="text-xs font-serif font-black text-slate-800 italic leading-snug">{ex.name}</span>
                      <span className="text-[8px] font-black uppercase tracking-wider bg-pink-100 text-pink-600 px-2 py-0.5 rounded-full">{ex.duration}</span>
                   </div>
                   <p className="text-[10px] text-gray-400 leading-normal">{ex.desc}</p>
                 </div>
                 <div className="mt-3 pt-3 border-t border-pink-50">
                    <span className="text-[8px] text-red-400 font-bold block">safety details:</span>
                    <p className="text-[9px] text-red-500 font-semibold italic">{ex.warning}</p>
                    <button
                      onClick={() => startVideoSimulation(ex.name, ex.duration)}
                      className="mt-3.5 w-full py-2 bg-pink-50 hover:bg-pink-100 text-pink-600 font-bold uppercase text-[8px] tracking-widest rounded-xl flex items-center justify-center gap-1.5 transition-all mb-0.5"
                    >
                      <Video size={11} /> Play tutorial video
                    </button>
                 </div>
              </div>
            ))}
          </div>

          <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200/50 flex gap-2.5 items-start">
             <AlertCircle size={16} className="text-amber-600 shrink-0 mt-0.5" />
             <div className="space-y-0.5">
               <span className="text-[9px] font-black uppercase text-amber-700 tracking-widest block">Pelvic safety caution notice</span>
               <p className="text-[9px] text-amber-900 leading-relaxed font-semibold">
                  Always seek explicit clearance from your obstetrician or midwife (typically structured at the 6-week postnatal postpartum mark, or longer for cesarean surgery) before engaging in core rehabilitation.
               </p>
             </div>
          </div>
        </section>

        {/* Connected Partner Postpartum sync reminders */}
        {user.isPartnerLinked && (
          <section className="bg-slate-900 text-white p-8 rounded-[3.5rem] relative overflow-hidden space-y-4">
             <div className="relative z-10 space-y-2">
                <span className="px-3 py-1 bg-slate-800 text-pink-200 rounded-full text-[8px] font-black uppercase tracking-widest">Linked partner support sync</span>
                <h4 className="text-xl font-serif italic text-pink-200">Shared Postpartum Recovery Reminders</h4>
                <p className="text-xs opacity-80 leading-relaxed max-w-xl font-serif italic">
                  Since you enabled shared notifications, your connected partner ({user.partnerName}) receives real-time supportive alerts on their device, like:
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-3">
                  <div className="p-4 bg-white/5 border border-white/10 rounded-2xl italic text-[11px] opacity-90 font-serif leading-relaxed">
                    “She is in postpartum recovery right now 💗 be patient, support her selfare routines and protect her quiet sanctuary hour 💕”
                  </div>
                  <div className="p-4 bg-white/5 border border-white/10 rounded-2xl italic text-[11px] opacity-90 font-serif leading-relaxed">
                    “She may need help resting today 💕 offer to watch babies/tasks so she can have deep restorative snooze naps 🛌”
                  </div>
                  <div className="p-4 bg-white/5 border border-white/10 rounded-2xl italic text-[11px] opacity-90 font-serif leading-relaxed">
                     “Check up on her emotional wellbeing today 🌸 take time to listen, hold space, and support her post-birth fatigue 💕”
                  </div>
                  <div className="p-4 bg-white/5 border border-white/10 rounded-2xl italic text-[11px] opacity-90 font-serif leading-relaxed">
                     “She may need helper hydration, nutrition prep support today. Cook her warming seaweed recovery broth or prepare water 💗”
                  </div>
                </div>
             </div>
             <span className="absolute bottom-[-10%] left-[-5%] text-[10rem] opacity-5 select-none pointer-events-none">💞</span>
          </section>
        )}
      </div>
    );
  };

  // ==========================================
  // RENDER: STANDARD CYCLE TRACKER DASHBOARD
  // ==========================================
  const renderStandardDashboard = () => {
    // Determine dynamic values for Today's Summary
    const loggedToday = symptoms.some(s => s.date === today.toDateString());
    const flowToday = loggedToday ? "Light" : "None";
    const moodToday = loggedToday ? "Calm" : "Good";
    const energyToday = loggedToday ? "Good" : "Normal";
    const sleepToday = "7h 30m";

    return (
      <div className="space-y-8 animate-fadeIn pb-12 text-gray-800">
        {/* Dynamic Gift / Comfort Alerts from Partner */}
        {receivedGifts.length > 0 && (
          <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide py-1">
            {receivedGifts.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).map((gift) => (
              <div 
                key={gift.id}
                className="flex-shrink-0 bg-white/75 backdrop-blur-xl p-[2px] rounded-3xl shadow-sm border border-pink-100/50 animate-fadeIn"
              >
                <div className="px-5 py-3 rounded-3xl flex items-center gap-3">
                   <div className="w-10 h-10 bg-pink-50 rounded-2xl flex items-center justify-center text-2xl shadow-inner animate-bounce shrink-0">
                     {gift.type === 'hug' ? '🌸' : gift.type === 'tea' ? '🍵' : gift.type === 'flower' ? '💐' : gift.type === 'chocolate' ? '🍫' : '✨'}
                   </div>
                   <div className="min-w-[120px]">
                      <p className="text-[9px] font-bold text-pink-300 uppercase tracking-wider">Surprise from {gift.senderName}</p>
                      <p className="text-xs font-serif italic text-pink-600">Sent you a {gift.type}!</p>
                   </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Large Beautiful Cycle Phase Card */}
        <section className="relative overflow-hidden bg-gradient-to-tr from-pink-100/40 via-rose-50/60 to-amber-50/40 rounded-[2.5rem] border border-white/80 p-8 shadow-[0_15px_30px_rgba(244,114,182,0.05)] backdrop-blur-xl flex flex-col md:flex-row justify-between items-center gap-8 group">
          {/* Decorative floating blurred gradient balls */}
          <div className="absolute top-[-20%] right-[-10%] w-48 h-48 bg-gradient-to-tr from-pink-300/20 to-rose-400/20 rounded-full blur-3xl group-hover:scale-110 transition-transform duration-[4s]"></div>
          <div className="absolute bottom-[-10%] left-[-10%] w-36 h-36 bg-gradient-to-tr from-amber-200/10 to-pink-300/15 rounded-full blur-2xl"></div>

          <div className="space-y-4 z-10 w-full md:max-w-[60%] text-center md:text-left">
            <div className="space-y-1">
              <span className="text-[10px] font-black uppercase tracking-[0.25em] text-pink-400 block">Current Phase</span>
              <h2 className="text-3xl md:text-4xl font-serif italic text-pink-600 font-bold leading-none">
                {currentPhase} Phase
              </h2>
              <span className="text-xs font-serif italic text-pink-400/80 block pt-1">
                {currentPhase === 'Menstrual' && "A time for quiet sunset reflection and deep physical rest."}
                {currentPhase === 'Follicular' && "A time of rising physical energy, creativity, and new beginnings."}
                {currentPhase === 'Ovulatory' && "Your peak biological glow. Social, radiant, and fertile."}
                {currentPhase === 'Luteal' && "Turning gently inward. High emotional intuition and cozy comfort."}
              </span>
            </div>

            <div className="pt-2">
              <div className="flex justify-between items-center text-[10px] font-bold text-pink-500 uppercase tracking-widest mb-1.5">
                <span>Cycle day {cycleDay} of {cycleLen}</span>
                <span className="font-serif italic font-black text-pink-700">{cycleStatusText}</span>
              </div>
              
              {/* Progress Bar Container */}
              <div className="w-full h-3 bg-pink-100/50 rounded-full overflow-hidden p-[2px] border border-pink-100/30">
                <div 
                  className="h-full bg-gradient-to-r from-pink-400 via-rose-400 to-amber-300 rounded-full transition-all duration-1000 ease-out shadow-[0_1px_3px_rgba(244,114,182,0.2)]"
                  style={{ width: `${Math.min(100, (cycleDay / cycleLen) * 100)}%` }}
                ></div>
              </div>
            </div>
          </div>

          {/* Elegant Illustration Artwork Area */}
          <div className="relative z-10 w-44 h-44 rounded-full bg-white/60 border border-white/80 shadow-md backdrop-blur-md flex items-center justify-center transition-transform hover:scale-105 duration-500">
            {/* Ambient pulse circle */}
            <div className="absolute inset-2 bg-gradient-to-br from-pink-200/50 via-rose-100/40 to-amber-100/30 rounded-full animate-pulse"></div>
            <div className="absolute inset-6 bg-white/85 rounded-full flex flex-col items-center justify-center text-center p-3 shadow-inner">
              <span className="text-4xl animate-bounce mb-1">
                {currentPhase === 'Menstrual' && "🩸"}
                {currentPhase === 'Follicular' && "🌱"}
                {currentPhase === 'Ovulatory' && "✨"}
                {currentPhase === 'Luteal' && "🌙"}
              </span>
              <p className="text-[8px] font-black text-pink-400 uppercase tracking-widest">{currentPhase}</p>
              <p className="text-xs font-serif font-black text-pink-700">Day {cycleDay}</p>
            </div>
          </div>
        </section>

        {/* Quick Action Cards */}
        <section className="grid grid-cols-4 gap-3">
          {[
            { id: 'cycle', label: 'Calendar', icon: '📅', action: () => setActiveTab('cycle') },
            { id: 'symptoms', label: 'Symptoms', icon: '💖', action: onOpenLogModal },
            { id: 'mood', label: 'Mood', icon: '😊', action: onOpenLogModal },
            { id: 'insights', label: 'Insights', icon: '📊', action: () => setActiveTab('wellness') }
          ].map((act) => (
            <button
              key={act.id}
              onClick={act.action}
              className="bg-gradient-to-br from-white/90 to-pink-50/20 backdrop-blur-md p-4 rounded-[2rem] border border-white/90 shadow-[inset_0_2.5px_4px_rgba(255,255,255,0.8),_0_8px_24px_rgba(244,114,182,0.03)] hover:scale-[1.03] active:scale-[0.97] cursor-pointer group transition-all duration-300 flex flex-col items-center justify-center gap-2"
            >
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-pink-50 to-rose-100/40 flex items-center justify-center text-xl shadow-[inset_0_2px_3px_rgba(255,255,255,0.75),_inset_0_-1px_2px_rgba(0,0,0,0.02),_0_4px_10px_rgba(244,114,182,0.04)] group-hover:scale-110 transition-transform duration-300">
                {act.icon}
              </div>
              <span className="text-[9px] font-black text-gray-500 uppercase tracking-wider group-hover:text-pink-600 transition-colors leading-none">{act.label}</span>
            </button>
          ))}
        </section>

        {/* Two-Column Middle Layout: Today's Summary & Water Intake */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Today's Summary Section */}
          <section className="bg-white/75 backdrop-blur-md p-6 rounded-[2.5rem] border border-pink-50 shadow-sm flex flex-col justify-between space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-pink-50/50">
              <h3 className="font-serif text-lg text-pink-600 italic font-bold">Today's Summary</h3>
              <button 
                onClick={onOpenLogModal}
                className="text-[9px] font-bold text-pink-400 uppercase tracking-widest hover:text-pink-600"
              >
                View All
              </button>
            </div>

            <div className="divide-y divide-pink-50/50">
              {[
                { label: 'Flow', value: flowToday, icon: '🩸' },
                { label: 'Mood', value: moodToday, icon: '😊' },
                { label: 'Energy', value: energyToday, icon: '⚡' },
                { label: 'Sleep', value: sleepToday, icon: '🌙' },
                { label: 'Water', value: `${waterIntake}/8 glasses`, icon: '💧' }
              ].map((item, index) => (
                <div 
                  key={index} 
                  onClick={onOpenLogModal}
                  className="py-3 flex items-center justify-between text-xs cursor-pointer hover:bg-pink-50/20 px-2 rounded-xl transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="text-base">{item.icon}</span>
                    <span className="font-bold text-gray-500 uppercase tracking-wider text-[10px]">{item.label}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="font-serif italic font-bold text-pink-600">{item.value}</span>
                    <ChevronRight size={12} className="text-pink-300" />
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Claymorphic Water Intake Tracker Card */}
          <section className="bg-white/75 backdrop-blur-md p-6 rounded-[2.5rem] border border-pink-50 shadow-sm flex flex-col justify-between space-y-5">
            <div className="space-y-1">
              <h3 className="font-serif text-lg text-pink-600 italic font-bold">Water Intake</h3>
              <p className="text-[10px] text-gray-400">Track and meet your daily cellular hydration goal</p>
            </div>

            {/* Individual glass/cup indicators with claymorphic fill effect */}
            <div className="grid grid-cols-8 gap-1.5 py-2">
              {Array.from({ length: 8 }).map((_, idx) => {
                const isFilled = idx < waterIntake;
                return (
                  <button
                    key={idx}
                    onClick={() => setWaterIntake(idx + 1)}
                    className={`h-14 rounded-2xl border-2 transition-all duration-500 relative flex items-end justify-center overflow-hidden cursor-pointer ${
                      isFilled
                        ? 'border-sky-400/80 bg-sky-50/30 shadow-[inset_0_2px_4px_rgba(255,255,255,0.4),_0_2px_8px_rgba(56,189,248,0.15)] scale-[1.03]'
                        : 'border-pink-100 bg-pink-50/15 hover:border-pink-300 shadow-[inset_0_-1px_3px_rgba(244,114,182,0.05)]'
                    }`}
                  >
                    {/* Fill animated wave */}
                    {isFilled && (
                      <div className="absolute inset-x-0 bottom-0 top-[20%] bg-gradient-to-t from-sky-400/80 to-indigo-400/70 animate-pulse transition-all duration-500 rounded-b-[10px]">
                        {/* Tiny bubble/sparkle effect */}
                        <div className="absolute top-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-white/40 rounded-full animate-bounce"></div>
                      </div>
                    )}
                    <span className="text-[8px] font-bold text-gray-400 pb-1 z-10 select-none">
                      {idx + 1}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Controls with Claymorphic buttons */}
            <div className="flex items-center justify-between gap-4 pt-1">
              <div className="text-left">
                <p className="text-[10px] font-bold text-pink-400 uppercase tracking-widest">Hydration Progress</p>
                <p className="text-base font-serif italic text-pink-700 font-bold leading-none">{waterIntake} of 8 glasses</p>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setWaterIntake(Math.max(0, waterIntake - 1))}
                  className="w-10 h-10 rounded-full bg-white border border-pink-100 hover:bg-pink-50 text-pink-500 flex items-center justify-center shadow-sm active:scale-90 transition-transform cursor-pointer"
                  title="Remove 1 glass"
                >
                  -
                </button>
                <button
                  onClick={() => setWaterIntake(Math.min(8, waterIntake + 1))}
                  className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-400 to-rose-400 text-white flex items-center justify-center shadow-[inset_0_2px_4px_rgba(255,255,255,0.3),_0_4px_10px_rgba(244,114,182,0.2)] hover:scale-105 active:scale-90 transition-transform font-bold text-lg cursor-pointer"
                  title="Add 1 glass"
                >
                  +
                </button>
              </div>
            </div>
          </section>
        </div>

        {/* Serenading Ambient Player Card */}
        <section className="bg-white/75 backdrop-blur-md p-6 rounded-[2.5rem] border border-pink-50 shadow-sm overflow-hidden relative group">
          <div className="flex flex-col md:flex-row items-center gap-6">
            <div className="relative w-28 h-28 flex-shrink-0">
              <div className={`absolute inset-0 bg-gradient-to-br from-pink-100 to-rose-200 rounded-full shadow-md transition-all duration-[8s] ${isMusicPlaying ? 'rotate-[360deg] animate-[spin_10s_linear_infinite]' : ''}`}>
                 <div className="absolute inset-2 bg-white/45 backdrop-blur-sm rounded-full border border-white/60 flex items-center justify-center text-4xl">
                   {currentSong.coverEmoji}
                 </div>
              </div>
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow-inner z-10"></div>
            </div>
            
            <div className="flex-1 text-center md:text-left space-y-1">
              <div className="flex justify-between items-start">
                <p className="text-[9px] font-bold text-pink-300 uppercase tracking-widest flex items-center justify-center md:justify-start gap-1.5">
                  <span className="w-3 h-[1px] bg-pink-100"></span> Now Serenading <span className="w-3 h-[1px] bg-pink-100"></span>
                </p>
                <button 
                  onClick={() => onTabChange?.('music')}
                  className="hidden md:block text-[9px] font-bold text-pink-400 uppercase tracking-widest hover:underline"
                >
                  Open Music Hub ↗
                </button>
              </div>
              <h3 className="text-xl font-serif text-pink-600 italic leading-tight font-bold">{currentSong.title}</h3>
              <p className="text-[9px] text-pink-400 font-bold uppercase tracking-widest pb-3">{currentSong.artist}</p>
              
              <div className="flex items-center justify-center md:justify-start gap-5 pt-1">
                <button onClick={prevSong} className="text-2xl text-pink-200 hover:text-pink-400 transition-colors">⏮</button>
                <button 
                  onClick={toggleMusic}
                  className="w-10 h-10 bg-gradient-to-br from-pink-400 to-rose-400 text-white rounded-full flex items-center justify-center shadow-lg shadow-pink-100 hover:scale-110 active:scale-95 transition-all text-sm font-bold cursor-pointer"
                >
                  {isMusicPlaying ? '⏸' : '▶'}
                </button>
                <button onClick={nextSong} className="text-2xl text-pink-200 hover:text-pink-400 transition-colors">⏭</button>
              </div>
            </div>
          </div>
        </section>
      </div>
    );
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Top Header Section with Hamburger (left), Logo (center), Notification (right) */}
      <header className="flex items-center justify-between px-4 py-3 bg-white/40 backdrop-blur-2xl border border-white/60 shadow-[inset_0_2px_4px_rgba(255,255,255,0.6),_0_8px_32px_rgba(244,114,182,0.03)] rounded-3xl sticky top-2 z-40">
        <button 
          onClick={() => setIsMenuOpen(true)}
          className="p-2.5 rounded-2xl bg-white/60 hover:bg-white/90 text-pink-600 transition-all duration-300 shadow-[inset_0_1.5px_2.5px_rgba(255,255,255,0.7),_0_4px_12px_rgba(244,114,182,0.05)] border border-pink-50/50 cursor-pointer flex items-center justify-center active:scale-90"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-1.5 cursor-pointer" onClick={() => setActiveTab('dashboard')}>
          <span className="text-xl animate-pulse">🌸</span>
          <span className="font-serif italic font-black text-2xl bg-gradient-to-r from-pink-500 to-rose-400 bg-clip-text text-transparent drop-shadow-sm">
            Lumina
          </span>
        </div>

        <button 
          onClick={() => setIsNotificationsOpen(true)}
          className="p-2.5 rounded-2xl bg-white/60 hover:bg-white/90 text-pink-600 transition-all duration-300 shadow-[inset_0_1.5px_2.5px_rgba(255,255,255,0.7),_0_4px_12px_rgba(244,114,182,0.05)] border border-pink-50/50 cursor-pointer flex items-center justify-center relative active:scale-90"
        >
          <Bell className="w-5 h-5" />
          {/* Active Notifications dot if any partner requests or alerts are active */}
          {((partnerUser?.partnerRequest?.status === 'pending') || receivedGifts.length > 0 || reminders.filter(r => !r.isCompleted).length > 0) && (
            <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-gradient-to-r from-rose-500 to-pink-500 rounded-full border-2 border-white animate-pulse" />
          )}
        </button>
      </header>

      {/* Personalized Greeting & Short Inspirational Message Section */}
      <section className="bg-gradient-to-br from-white/80 via-pink-50/20 to-amber-50/10 backdrop-blur-md p-6 md:p-8 rounded-[2.5rem] border border-white/90 shadow-[inset_0_3px_5px_rgba(255,255,255,0.85),_0_12px_36px_rgba(244,114,182,0.04)] relative overflow-hidden transition-all duration-500">
        {/* Claymorphic blobs inside greeting for fluid background */}
        <div className="absolute -top-12 -left-12 w-32 h-32 bg-gradient-to-tr from-pink-300/10 to-rose-300/10 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -bottom-16 -right-16 w-36 h-36 bg-gradient-to-tr from-amber-200/10 to-pink-300/10 rounded-full blur-2xl pointer-events-none" />
        
        <div className="relative z-10 space-y-2">
          <p className="text-[10px] font-black uppercase tracking-widest text-pink-400">Welcome to your sanctuary</p>
          <h1 className="text-3xl md:text-4xl font-serif italic text-pink-600 font-black leading-tight">
            {getGreeting()}, {user.firstName || user.name || "Ella"} ✨
          </h1>
          <p className="text-xs md:text-sm text-stone-500 leading-relaxed italic font-serif">
            "{affirmation || 'You are not just your cycle, you are the whole universe in motion.'}"
          </p>
        </div>
      </section>

      {/* Slide-out side menu (Hamburger drawer) */}
      {isMenuOpen && (
        <>
          <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm z-[150] transition-opacity" onClick={() => setIsMenuOpen(false)} />
          <div className="fixed inset-y-0 left-0 max-w-xs w-full bg-[#fffafb]/95 backdrop-blur-3xl shadow-2xl z-[160] p-6 flex flex-col justify-between border-r border-pink-100/40 animate-slideRight">
            <div className="space-y-6">
              {/* Title Header with Close */}
              <div className="flex items-center justify-between border-b border-pink-100/30 pb-4">
                <div className="flex items-center gap-1.5">
                  <span className="text-xl">🌸</span>
                  <span className="font-serif italic font-black text-xl text-pink-600">Lumina Menu</span>
                </div>
                <button 
                  onClick={() => setIsMenuOpen(false)}
                  className="p-1.5 rounded-xl bg-pink-50 text-pink-500 hover:bg-pink-100 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Menu List */}
              <div className="space-y-4">
                {/* Mode Select Card with Claymorphic style */}
                <div className="bg-white/80 backdrop-blur-md p-4 rounded-3xl border border-pink-100/50 shadow-[inset_0_2px_4px_rgba(255,255,255,0.8),_0_6px_15px_rgba(244,114,182,0.03)]">
                  <p className="text-[9px] font-black uppercase tracking-wider text-pink-400 mb-2">Sanctuary Mode</p>
                  <div className="flex flex-col gap-2">
                    <button 
                      onClick={() => {
                        if (togglePregnancy) togglePregnancy();
                        setIsMenuOpen(false);
                      }}
                      className={`w-full py-2.5 px-4 rounded-2xl text-[10px] font-bold uppercase tracking-widest transition-all cursor-pointer ${user.isPregnancyMode ? 'bg-indigo-500 text-white shadow-md' : 'bg-pink-50 text-pink-500 border border-pink-100 hover:bg-pink-100/50'}`}
                    >
                      🤰 {user.isPregnancyMode ? 'Pregnancy Mode: ON' : 'Switch to Pregnancy'}
                    </button>
                    {user.isPostpartumMode && (
                      <div className="w-full py-2.5 px-4 rounded-2xl bg-[#4f46e5]/10 text-[#4f46e5] text-[10px] font-bold uppercase tracking-widest text-center">
                        👶 Postpartum Active
                      </div>
                    )}
                  </div>
                </div>

                {/* Themes Card with Claymorphic style */}
                <div className="bg-white/80 backdrop-blur-md p-4 rounded-3xl border border-pink-100/50 shadow-[inset_0_2px_4px_rgba(255,255,255,0.8),_0_6px_15px_rgba(244,114,182,0.03)]">
                  <p className="text-[9px] font-black uppercase tracking-wider text-pink-400 mb-2">Sanctuary Theme</p>
                  <div className="grid grid-cols-2 gap-2">
                    {['rose', 'lavender', 'mint', 'peach'].map(t => {
                      const isActive = user.theme === t;
                      return (
                        <button 
                          key={t}
                          onClick={() => {
                            if (setUser) {
                              setUser((prev: any) => prev ? { ...prev, theme: t } : null);
                            }
                          }}
                          className={`py-2 px-3 rounded-2xl text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center justify-between border ${isActive ? 'bg-gradient-to-br from-pink-400 to-rose-400 text-white shadow-md border-pink-300' : 'bg-pink-50/50 text-pink-400 border-pink-100/50 hover:bg-pink-100/20'}`}
                        >
                          <span className="capitalize">{t}</span>
                          <span className={`w-3 h-3 rounded-full border border-white ${t === 'rose' ? 'bg-pink-400' : t === 'lavender' ? 'bg-purple-400' : t === 'mint' ? 'bg-teal-400' : 'bg-orange-400'}`} />
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* Logout Button */}
            <div className="border-t border-pink-100/30 pt-4">
              <button 
                onClick={() => {
                  if (handleLogout) handleLogout();
                  setIsMenuOpen(false);
                }}
                className="w-full py-3 rounded-2xl bg-rose-50 text-rose-500 hover:bg-rose-100 transition-colors duration-300 font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                Sign Out of Sanctuary
              </button>
            </div>
          </div>
        </>
      )}

      {/* Slide-out notifications pane (Right drawer) */}
      {isNotificationsOpen && (
        <>
          <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm z-[150] transition-opacity" onClick={() => setIsNotificationsOpen(false)} />
          <div className="fixed inset-y-0 right-0 max-w-xs w-full bg-[#fffafb]/95 backdrop-blur-3xl shadow-2xl z-[160] p-6 flex flex-col border-l border-pink-100/40 animate-slideLeft">
            {/* Title Header with Close */}
            <div className="flex items-center justify-between border-b border-pink-100/30 pb-4 mb-6">
              <div className="flex items-center gap-1.5">
                <span className="text-xl">🔔</span>
                <span className="font-serif italic font-black text-xl text-pink-600">Notifications</span>
              </div>
              <button 
                onClick={() => setIsNotificationsOpen(false)}
                className="p-1.5 rounded-xl bg-pink-50 text-pink-500 hover:bg-pink-100 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Notifications Content */}
            <div className="flex-1 overflow-y-auto space-y-4 scrollbar-hide">
              {/* Partner connection request notification */}
              {partnerUser?.partnerRequest?.status === 'pending' && (
                <div className="bg-gradient-to-br from-indigo-50 to-purple-50 p-4 rounded-3xl border border-indigo-100 shadow-[inset_0_2px_4px_rgba(255,255,255,0.8),_0_6px_15px_rgba(244,114,182,0.03)] space-y-3 animate-fadeIn">
                  <div className="flex gap-2">
                    <span className="text-xl shrink-0">💕</span>
                    <div>
                      <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Companion Link</p>
                      <p className="text-xs text-indigo-900 font-bold mt-0.5">{partnerUser.name} requested to link accounts!</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => {
                      setIsNotificationsOpen(false);
                    }}
                    className="w-full py-2 bg-indigo-600 text-white rounded-xl text-[9px] font-black uppercase tracking-widest shadow-md hover:bg-indigo-700 transition-all text-center block"
                  >
                    Review Request Below
                  </button>
                </div>
              )}

              {/* Gift Notifications */}
              {receivedGifts.length > 0 && (
                <div className="space-y-2">
                  <p className="text-[9px] font-black uppercase tracking-wider text-pink-400 px-1">Comfort Gifts</p>
                  {receivedGifts.slice(0, 3).map(gift => (
                    <div key={gift.id} className="bg-white/80 p-3 rounded-2xl border border-pink-100/30 shadow-sm flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-pink-50 flex items-center justify-center text-lg shadow-inner">
                        {gift.type === 'hug' ? '🌸' : gift.type === 'tea' ? '🍵' : gift.type === 'flower' ? '💐' : gift.type === 'chocolate' ? '🍫' : '✨'}
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-gray-700">{gift.senderName} sent a {gift.type}!</p>
                        <p className="text-[8px] text-gray-400">{new Date(gift.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Active Reminders */}
              <div className="space-y-2">
                <p className="text-[9px] font-black uppercase tracking-wider text-pink-400 px-1">Active Reminders</p>
                {reminders.filter(r => !r.isCompleted).length === 0 ? (
                  <div className="p-4 bg-white/40 border border-dashed border-pink-100/50 rounded-2xl text-center">
                    <p className="text-[10px] text-gray-400 italic">All sanctuary routines are completed today 🌸</p>
                  </div>
                ) : (
                  reminders.filter(r => !r.isCompleted).map(rem => (
                    <div key={rem.id} className="bg-white/80 p-3 rounded-2xl border border-pink-100/30 shadow-sm flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <span className="text-base">⏰</span>
                        <div>
                          <p className="text-[10px] font-bold text-gray-700 leading-tight">{rem.title}</p>
                          <p className="text-[8px] text-gray-400 mt-0.5">{rem.time}</p>
                        </div>
                      </div>
                      <button 
                        onClick={() => {
                          if (setUser) {
                            setUser((prev: any) => {
                              if (!prev) return null;
                              const updated = (prev.reminders || []).map((r: any) => r.id === rem.id ? { ...r, isCompleted: true } : r);
                              return { ...prev, reminders: updated };
                            });
                          }
                        }}
                        className="p-1 rounded-lg bg-pink-50 text-pink-500 hover:bg-pink-100 transition-colors text-[9px] font-bold cursor-pointer"
                      >
                        Done
                      </button>
                    </div>
                  ))
                )}
              </div>

              {/* General cycle suggestions */}
              <div className="bg-pink-50/30 p-4 rounded-3xl border border-pink-100/30 space-y-2">
                <p className="text-[9px] font-black uppercase tracking-wider text-pink-400">Sanctuary Intelligence</p>
                <p className="text-[11px] text-stone-500 leading-relaxed font-serif italic">
                  "Synchronize your heavy workloads with your peak follicular and ovulatory energies to protect your mental sanctuary."
                </p>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Step 3 (Partner Connection Request) & Step 4 (Privacy Controls) */}
      {partnerUser?.partnerRequest?.status === 'pending' && (
        <section className="bg-gradient-to-br from-purple-50 to-pink-50 p-8 rounded-[2.5rem] border border-pink-100 shadow-sm space-y-6 animate-fadeIn">
          <div className="flex items-start gap-4">
            <span className="text-3xl">💕</span>
            <div className="space-y-1">
              <h3 className="text-2xl font-serif text-indigo-950 italic">Partner Connection Request</h3>
              <p className="text-sm text-gray-600">
                <span className="font-bold text-indigo-600">{partnerUser.name}</span> would like to connect on Lumina and has requested to receive the following:
              </p>
            </div>
          </div>

          <div className="bg-white/80 backdrop-blur-sm p-6 rounded-2xl border border-pink-100/50">
            <h4 className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest mb-3">Requested Categories:</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-indigo-900">
              {partnerUser.partnerRequest.requestedReceives?.map((reqItem, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-pink-500">✓</span>
                  <span>{reqItem}</span>
                </div>
              ))}
            </div>
          </div>

          {!isCustomizingSharing ? (
            <div className="flex flex-wrap gap-3">
              <button
                onClick={handleApproveAll}
                className="px-6 py-3 bg-indigo-600 text-white font-bold rounded-2xl text-[10px] uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-md"
              >
                Approve All
              </button>
              <button
                onClick={() => setIsCustomizingSharing(true)}
                className="px-6 py-3 bg-white text-indigo-600 border border-indigo-100 font-bold rounded-2xl text-[10px] uppercase tracking-widest hover:bg-indigo-50 transition-all"
              >
                Customize Sharing
              </button>
              <button
                onClick={handleDeclineRequest}
                className="px-6 py-3 bg-rose-50 text-rose-600 font-bold rounded-2xl text-[10px] uppercase tracking-widest hover:bg-rose-100 transition-all"
              >
                Decline
              </button>
            </div>
          ) : (
            <div className="space-y-5 bg-white p-6 rounded-3xl border border-pink-100 mt-4 animate-scaleUp">
              <div>
                <h4 className="text-lg font-serif text-indigo-950 italic">Step 4: Privacy Controls</h4>
                <p className="text-xs text-gray-500 mt-1">
                  Fine-tune exactly what information {partnerUser.name} can access. Turn off any sensitive category anytime.
                </p>
              </div>

              <div className="space-y-3">
                {[
                  { label: "Share Cycle Information", desc: "Status of period and calendar predictions", key: "shareCycleInfo" },
                  { label: "Share Symptoms", desc: "Symptom logs, physical discomfort levels", key: "shareSymptoms" },
                  { label: "Share Mood", desc: "Mood updates and emotional state logs", key: "shareMood" },
                  { label: "Share Fertility Information", desc: "Fertile windows, ovulation history", key: "shareFertilityInfo" },
                  { label: "Share Pregnancy Information", desc: "Pregnancy progression and due dates", key: "sharePregnancyInfo" },
                  { label: "Share Intimacy Logs", desc: "Intimacy tracking and contraceptive use", key: "shareIntimacyInfo" },
                  { label: "Share Doctor Reports", desc: "Logs related to professional body checks", key: "shareDoctorReports" },
                  { label: "Share Appointment Reminders", desc: "Upcoming doctor appointments and timing", key: "shareAppointmentReminders" },
                  { label: "Share Wellness Updates", desc: "Wellness missions, self-care suggestions", key: "shareWellnessUpdates" }
                ].map((pref) => (
                  <div key={pref.key} className="flex items-start gap-3 p-3 bg-indigo-50/20 hover:bg-indigo-50/40 rounded-xl transition-all">
                    <input
                      type="checkbox"
                      id={pref.key}
                      checked={sharingPrefs[pref.key as keyof typeof sharingPrefs]}
                      onChange={(e) => setSharingPrefs(prev => ({ ...prev, [pref.key]: e.target.checked }))}
                      className="w-5 h-5 rounded border-indigo-200 text-indigo-600 focus:ring-indigo-500 mt-0.5 cursor-pointer"
                    />
                    <label htmlFor={pref.key} className="flex-1 cursor-pointer">
                      <p className="text-xs font-bold text-indigo-950">{pref.label}</p>
                      <p className="text-[10px] text-gray-400 mt-0.5">{pref.desc}</p>
                    </label>
                  </div>
                ))}
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleSaveCustomSharing}
                  className="flex-1 py-3 bg-indigo-600 text-white font-bold rounded-xl text-[10px] uppercase tracking-widest shadow-md hover:bg-indigo-700 transition"
                >
                  Save Preferences & Connect
                </button>
                <button
                  onClick={() => setIsCustomizingSharing(false)}
                  className="px-6 py-3 bg-gray-50 text-gray-500 font-bold rounded-xl text-[10px] uppercase tracking-widest hover:bg-gray-100 transition"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </section>
      )}

      {/* Dynamic Render based of App Modes */}
      {user.isPregnancyMode ? (
        renderPregnancyWellnessDashboard()
      ) : user.isPostpartumMode ? (
        renderPostpartumWellnessDashboard()
      ) : (
        renderStandardDashboard()
      )}


      {/* "Mark Delivered" Birth modal */}
      {isDeliveredModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[300] flex items-center justify-center p-4">
          <div className="bg-white rounded-[3rem] p-8 max-w-md w-full space-y-6 shadow-2xl border border-pink-100 animate-slideDown">
            <div className="text-center space-y-2">
              <span className="text-5xl animate-bounce">🎉🐣</span>
              <h3 className="text-2xl font-serif italic text-indigo-950">Congratulations Mama!</h3>
              <p className="text-xs text-gray-400">Mark Baby as Delivered and configure the fourth Trimester Postpartum Sanctuary.</p>
            </div>

            <div className="space-y-4">
               <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 ml-1">Delivery / Birth Date</label>
                  <input
                    type="date"
                    value={deliveryDateInput}
                    onChange={(e) => setDeliveryDateInput(e.target.value)}
                    className="bg-indigo-50/50 px-4 py-2.5 rounded-2xl border border-indigo-100 text-indigo-950 font-bold outline-none text-sm text-center shadow-inner"
                  />
               </div>
            </div>

            <div className="flex gap-3 pt-2">
               <button
                 type="button"
                 onClick={() => setIsDeliveredModalOpen(false)}
                 className="flex-1 py-3 bg-gray-50 text-gray-400 hover:bg-gray-100 font-bold uppercase text-[10px] tracking-widest rounded-xl transition-all"
               >
                 Cancel
               </button>
               <button
                 type="button"
                 onClick={handleMarkDelivered}
                 className="flex-1 py-3 bg-gradient-to-r from-pink-500 to-indigo-500 text-white font-bold uppercase text-[10px] tracking-widest rounded-xl shadow-lg transition-all"
               >
                 Activate Recovery Mode 🎉
               </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
