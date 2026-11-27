import React, { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { User, Symptom, Reminder, ReceivedComfort } from '../types';
import { ExpectedPeriodCheckInCard } from './ExpectedPeriodCheckInCard';
import { WallpapersAndThemesModal } from './WallpapersAndThemesModal';
import { AvatarDashboardModal } from './AvatarDashboardModal';
import { AvatarVisual } from './AvatarVisual';
import { 
  getOrCreateUserAvatar, 
  calculateAvatarProgression, 
  getAvatarCompanionSpeech,
  calculateAvatarMood,
  AVATAR_PRESETS,
  logAvatarActionReward
} from '../services/avatarService';
import { 
  playWelcomeVoiceGreeting, 
  playAvatarIntroduction, 
  getWelcomeGreeting, 
  stopWelcomeVoice 
} from '../services/welcomeVoiceService';
import { getDailyAffirmation } from '../services/gemini';
import { syncUser, updatePartnerRequestStatus, addNotificationToUser } from '../services/firebaseService';
import { calculateCycleSyncData, getCycleDetailsForSpecificDate } from '../services/cycleSyncService';
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
  LogOut,
  Volume2,
  VolumeX,
  MessageCircle,
  Flower2,
  Moon,
  ArrowRight,
  Palette,
  Lightbulb,
  HeartHandshake,
  Check,
  BarChart3
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

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
  onOpenCompanionChat?: () => void;
  receivedGifts?: ReceivedComfort[];
  isMusicActive: boolean;
  toggleMusicActive: () => void;
  volume: number;
  setVolume: (v: number) => void;
  togglePregnancy?: () => void;
  partnerRequests?: any[];
  handleLogout?: () => void;
  onOpenNotificationCenter?: (notif?: any) => void;
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
  onOpenCompanionChat,
  receivedGifts = [],
  isMusicActive,
  toggleMusicActive,
  volume,
  setVolume,
  togglePregnancy,
  partnerRequests = [],
  handleLogout,
  onOpenNotificationCenter
}) => {
  const today = new Date();
  const [affirmation, setAffirmation] = useState("Loading your daily inspiration...");
  const [selectedMood, setSelectedMood] = useState('Happy');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isWallpapersOpen, setIsWallpapersOpen] = useState(false);
  const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false);

  // Avatar System integration
  const currentAvatar = getOrCreateUserAvatar(user);
  const avatarProgression = calculateAvatarProgression(user, currentAvatar);
  const avatarSpeech = getAvatarCompanionSpeech(user, currentAvatar);
  const avatarMood = calculateAvatarMood(user, currentAvatar);
  const companionGreeting = getWelcomeGreeting(user);
  const [isCompanionSpeaking, setIsCompanionSpeaking] = useState(false);
  const [isCompanionWaving, setIsCompanionWaving] = useState(false);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  };

  // Dynamic speech bubble prompts: starts with the warm personalized greeting
  const companionPrompts = [
    companionGreeting.displayText || `${getGreeting()} ${user.firstName || user.name || "friend"} 🌞`,
    `${getGreeting()} ${user.firstName || user.name || "friend"} 🌞`,
    "How are you feeling today?",
    "Need help tracking symptoms?",
    avatarSpeech.cycleStatusText,
    "Remember to take a mindful sip of water 💧"
  ].filter(Boolean);

  const [promptIndex, setPromptIndex] = useState(0);
  const [companionReaction, setCompanionReaction] = useState<{
    message: string;
    emoji: string;
    type: 'wave' | 'symptom' | 'celebrate' | 'welcome';
  } | null>(null);

  // Wave animation and automatic greeting when app opens / mounts
  useEffect(() => {
    setIsCompanionWaving(true);
    const waveTimer = setTimeout(() => {
      setIsCompanionWaving(false);
    }, 3200);

    // Automatically welcome and greet user visually & with voice when app opens
    if (user) {
      const greetingWord = getGreeting();
      const userName = user.firstName || user.name || "friend";
      setCompanionReaction({
        message: `${greetingWord}, ${userName}! 🌸 Welcome to Lumina.`,
        emoji: '👋',
        type: 'welcome'
      });
      const reactionTimer = setTimeout(() => {
        setCompanionReaction(null);
      }, 7000);

      const voiceTimer = setTimeout(() => {
        playWelcomeVoiceGreeting(user, {
          force: true,
          onStart: () => setIsCompanionSpeaking(true),
          onEnd: () => setIsCompanionSpeaking(false),
          onError: () => setIsCompanionSpeaking(false)
        }).catch(() => setIsCompanionSpeaking(false));
      }, 500);

      return () => {
        clearTimeout(waveTimer);
        clearTimeout(reactionTimer);
        clearTimeout(voiceTimer);
      };
    }

    return () => clearTimeout(waveTimer);
  }, [user?.id]);

  // Rotate dynamic speech bubble gently every 7 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setPromptIndex(prev => (prev + 1) % companionPrompts.length);
    }, 7000);
    return () => clearInterval(timer);
  }, [companionPrompts.length]);

  // Track symptom logs & water intake changes for automatic companion reactions (Requirement 7)
  const prevSymptomsLenRef = useRef(symptoms.length);
  useEffect(() => {
    if (symptoms.length > prevSymptomsLenRef.current) {
      setIsCompanionWaving(true);
      setCompanionReaction({
        message: `${currentAvatar.name} noted your symptoms. Rest and take it easy! 🩹`,
        emoji: '🌸',
        type: 'symptom'
      });
      setTimeout(() => {
        setIsCompanionWaving(false);
        setCompanionReaction(null);
      }, 5000);
    }
    prevSymptomsLenRef.current = symptoms.length;
  }, [symptoms.length, currentAvatar.name]);

  const prevWaterRef = useRef(waterIntake);
  useEffect(() => {
    if (waterIntake > prevWaterRef.current) {
      setIsCompanionWaving(true);
      setCompanionReaction({
        message: `${currentAvatar.name} celebrates your hydration! 💧 (+10 XP)`,
        emoji: '🎉',
        type: 'celebrate'
      });
      setTimeout(() => {
        setIsCompanionWaving(false);
        setCompanionReaction(null);
      }, 5000);
    }
    prevWaterRef.current = waterIntake;
  }, [waterIntake, currentAvatar.name]);

  // Listen for symptom logs or check-in completions (Requirement 7)
  useEffect(() => {
    const handleSymptomEvent = (e: any) => {
      setIsCompanionWaving(true);
      setCompanionReaction({
        message: `${currentAvatar.name} noted your symptoms. Rest and take it easy! 🩹`,
        emoji: '🌸',
        type: 'symptom'
      });
      setTimeout(() => {
        setIsCompanionWaving(false);
        setCompanionReaction(null);
      }, 5000);
    };

    const handleCheckinEvent = (e: any) => {
      setIsCompanionWaving(true);
      setCompanionReaction({
        message: `${currentAvatar.name} celebrates your check-in! 🎉 (+25 XP)`,
        emoji: '🎉',
        type: 'celebrate'
      });
      setTimeout(() => {
        setIsCompanionWaving(false);
        setCompanionReaction(null);
      }, 5000);
    };

    const handleToggleMenuEvent = () => {
      setIsMenuOpen(prev => !prev);
    };

    window.addEventListener('lumina:symptom-logged', handleSymptomEvent);
    window.addEventListener('lumina:checkin-completed', handleCheckinEvent);
    window.addEventListener('lumina:toggle-dashboard-menu', handleToggleMenuEvent);
    return () => {
      window.removeEventListener('lumina:symptom-logged', handleSymptomEvent);
      window.removeEventListener('lumina:checkin-completed', handleCheckinEvent);
      window.removeEventListener('lumina:toggle-dashboard-menu', handleToggleMenuEvent);
    };
  }, [currentAvatar.name]);

  const handleOpenCompanionChat = () => {
    if (onOpenCompanionChat) {
      onOpenCompanionChat();
    } else if (onTabChange) {
      onTabChange('companion_chat');
    } else {
      setActiveTab('companion_chat');
    }
  };

  const handleAvatarTap = () => {
    setIsCompanionWaving(true);
    setTimeout(() => {
      setIsCompanionWaving(false);
    }, 2400);
    handleOpenCompanionChat();
  };

  const handlePlayCompanionVoice = () => {
    if (isCompanionSpeaking) {
      stopWelcomeVoice();
      setIsCompanionSpeaking(false);
      return;
    }
    playWelcomeVoiceGreeting(user, {
      force: true,
      customGreeting: companionGreeting,
      onStart: () => setIsCompanionSpeaking(true),
      onEnd: () => setIsCompanionSpeaking(false),
      onError: () => setIsCompanionSpeaking(false)
    }).catch(() => setIsCompanionSpeaking(false));
  };

  const handleSayHiToCompanion = () => {
    setIsCompanionWaving(true);
    setTimeout(() => setIsCompanionWaving(false), 2800);
    playAvatarIntroduction(currentAvatar.id, user, {
      accent: currentAvatar.accent,
      personality: currentAvatar.personalityStyle,
      onStart: () => setIsCompanionSpeaking(true),
      onEnd: () => setIsCompanionSpeaking(false)
    }).catch(() => setIsCompanionSpeaking(false));
  };

  // Pregnancy and Postpartum Custom states
  const [exerciseTrimester, setExerciseTrimester] = useState<1 | 2 | 3>(1);
  const [selectedWeekTab, setSelectedWeekTab] = useState<number>(12);
  const [simulatedVideo, setSimulatedVideo] = useState<{ name: string; duration: string; mp4Url: string; youtubeUrl: string } | null>(null);
  const [videoLoading, setVideoLoading] = useState(false);
  const [videoTimer, setVideoTimer] = useState(10);
  const [isDeliveredModalOpen, setIsDeliveredModalOpen] = useState(false);

  // Guided Breath & Posture Coach States
  const [coachMode, setCoachMode] = useState<'ai' | 'classic'>('ai');
  const [coachInstructionIndex, setCoachInstructionIndex] = useState(0);
  const [videoTick, setVideoTick] = useState(0);
  const [dashBreathTime, setDashBreathTime] = useState(0);
  const [dashBreathState, setDashBreathState] = useState<'Inhale' | 'Hold' | 'Exhale'>('Inhale');
  const [dashBreathScale, setDashBreathScale] = useState(1.0);
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

  const unreadSystemNotifications = (user.notifications || []).filter(n => {
    if (n.isRead) return false;
    if (!user.isPartner) {
      const isConnectionRequest = n.category === 'partner_request' || 
                                  n.isPartnerRequest === true ||
                                  (n.title && (n.title.toLowerCase().includes('request') || n.title.toLowerCase().includes('invite') || n.title.toLowerCase().includes('connection') || n.title.toLowerCase().includes('linked')));
      if (isConnectionRequest) return true;

      const isPartnerNotif = n.category === 'partner' || n.isPartner === true;
      if (isPartnerNotif) return false;
    }
    return true;
  });

  const activePendingRequest = (partnerRequests && partnerRequests.find((r: any) => r.status === 'pending')) || 
                               user.partnerRequest || 
                               partnerUser?.partnerRequest;
  const isPendingRequest = activePendingRequest?.status === 'pending';

  const hasUnreadAlerts = isPendingRequest || 
                          (receivedGifts.length > 0) || 
                          (reminders.filter(r => !r.isCompleted).length > 0) ||
                          (unreadSystemNotifications.length > 0);

  // --- Partner connection request permission setup states & helpers (Steps 3 & 4) ---
  const [isCustomizingSharing, setIsCustomizingSharing] = useState(false);
  const [confirmDeclineRequest, setConfirmDeclineRequest] = useState(false);
  const [partnerNotice, setPartnerNotice] = useState<string | null>(null);
  const [sharingPrefs, setSharingPrefs] = useState({
    shareCycleInfo: false,
    shareFertilityInfo: false,
    sharePregnancyInfo: false,
    shareMood: false,
    shareSymptoms: false,
    shareIntimacyInfo: false,
    shareAppointmentReminders: false,
    shareWellnessUpdates: false
  });

  useEffect(() => {
    if (activePendingRequest?.status === 'pending') {
      const requested = activePendingRequest.requestedReceives || activePendingRequest.requested_permissions || [];
      setSharingPrefs({
        shareCycleInfo: requested.some((r: string) => r.includes('Period')),
        shareFertilityInfo: requested.some((r: string) => r.includes('Fertility') || r.includes('Ovulation')),
        sharePregnancyInfo: requested.some((r: string) => r.includes('Pregnancy')),
        shareSymptoms: requested.some((r: string) => r.includes('Symptom')),
        shareMood: requested.some((r: string) => r.includes('Mood')),
        shareIntimacyInfo: false, // Default to false for privacy
        shareAppointmentReminders: requested.some((r: string) => r.includes('Appointment') || r.includes('Reminder')),
        shareWellnessUpdates: requested.some((r: string) => r.includes('Wellness') || r.includes('Suggestions') || r.includes('Support') || r.includes('Gift') || r.includes('Messages')),
      });
    }
  }, [activePendingRequest?.status]);

  const handleApproveAll = async () => {
    if (!setUser) return;
    const activeReq = activePendingRequest;
    if (!activeReq) return;

    const targetPartnerId = partnerUser?.id || user.partnerId || activeReq.partnerId || activeReq.partner_id;
    const targetPartnerName = partnerUser?.name || user.partnerName || activeReq.partnerName || 'Partner';
    const requested = activeReq.requestedReceives || activeReq.requested_permissions || ['Period Updates', 'Fertility Updates', 'Wellness Support', 'Symptom Updates'];

    const approvedSettings = {
      shareCycleInfo: requested.some((r: string) => r.includes('Period')),
      shareFertilityInfo: requested.some((r: string) => r.includes('Fertility') || r.includes('Ovulation')),
      sharePregnancyInfo: requested.some((r: string) => r.includes('Pregnancy')),
      shareSymptoms: requested.some((r: string) => r.includes('Symptom')),
      shareMood: requested.some((r: string) => r.includes('Mood')),
      shareNotes: false,
      shareIntimacyInfo: false,
      shareDoctorReports: false,
      shareAppointmentReminders: requested.some((r: string) => r.includes('Appointment') || r.includes('Reminder')),
      shareWellnessUpdates: requested.some((r: string) => r.includes('Wellness') || r.includes('Suggestions') || r.includes('Support') || r.includes('Gift') || r.includes('Messages')),
    };
    
    // Update user
    const updatedUser = {
      ...user,
      sharingSettings: approvedSettings,
      isPartnerLinked: true,
      partnerId: targetPartnerId,
      partnerName: targetPartnerName,
      partnerRequest: {
        ...activeReq,
        status: 'approved' as const
      }
    };
    setUser(updatedUser);
    await syncUser(updatedUser);

    if (partnerRequests && partnerRequests.length > 0) {
      for (const req of partnerRequests) {
        if (req.status === 'pending') {
          await updatePartnerRequestStatus(req.id, 'approved');
        }
      }
    }

    if (targetPartnerId) {
      await addNotificationToUser(targetPartnerId, {
        title: '💖 Connection Approved!',
        body: `${user.name} approved your partner connection request! You are now connected in Partner Mode.`,
        emoji: '💖'
      });
    }

    setPartnerNotice(`You approved ${targetPartnerName}'s connection and sharing preferences.`);
  };

  const handleSaveCustomSharing = async () => {
    if (!setUser) return;
    const activeReq = activePendingRequest;
    const targetPartnerId = partnerUser?.id || user.partnerId || activeReq?.partnerId || activeReq?.partner_id;
    const targetPartnerName = partnerUser?.name || user.partnerName || activeReq?.partnerName || 'Partner';

    const updatedUser = {
      ...user,
      sharingSettings: {
        ...user.sharingSettings,
        ...sharingPrefs,
        shareNotes: false,
        shareDoctorReports: false,
      },
      isPartnerLinked: true,
      partnerId: targetPartnerId,
      partnerName: targetPartnerName,
      partnerRequest: activeReq ? {
        ...activeReq,
        status: 'approved' as const
      } : undefined
    };
    setUser(updatedUser);
    await syncUser(updatedUser);

    if (partnerRequests && partnerRequests.length > 0) {
      for (const req of partnerRequests) {
        if (req.status === 'pending') {
          await updatePartnerRequestStatus(req.id, 'approved');
        }
      }
    }

    if (targetPartnerId) {
      await addNotificationToUser(targetPartnerId, {
        title: '💖 Connection Approved!',
        body: `${user.name} approved your partner connection request! You are now connected in Partner Mode.`,
        emoji: '💖'
      });
    }

    setIsCustomizingSharing(false);
    setPartnerNotice(`Custom privacy preferences saved and connection approved for ${targetPartnerName}.`);
  };

  const handleDeclineRequest = async () => {
    if (!setUser) return;
    const activeReq = activePendingRequest;
    const targetPartnerId = partnerUser?.id || user.partnerId || activeReq?.partnerId || activeReq?.partner_id;

    const updatedUser = {
      ...user,
      partnerId: undefined,
      partnerName: '',
      isPartnerLinked: false,
      partnerRequest: activeReq ? {
        ...activeReq,
        status: 'declined' as const
      } : undefined
    };
    setUser(updatedUser);
    await syncUser(updatedUser);

    if (partnerRequests && partnerRequests.length > 0) {
      for (const req of partnerRequests) {
        if (req.status === 'pending') {
          await updatePartnerRequestStatus(req.id, 'declined');
        }
      }
    }

    if (targetPartnerId) {
      await addNotificationToUser(targetPartnerId, {
        title: '💔 Connection Declined',
        body: `${user.name} declined the partner connection request.`,
        emoji: '💔'
      });
    }

    setConfirmDeclineRequest(false);
    setPartnerNotice('Partner connection request declined.');
  };

  // Centralized synchronised cycle calculation across Lumina (Dashboard, Companion, Calendar & Stats)
  const cycleSync = calculateCycleSyncData(user, today);
  const cycleDay = cycleSync.cycleDay;
  const cycleLen = cycleSync.cycleLength;
  const periodLen = cycleSync.periodLength;
  const currentPhase = cycleSync.phase;
  const isLatePeriodMode = cycleSync.isLatePeriodMode;
  const daysLate = cycleSync.daysLate;
  const expectedPeriodDate = cycleSync.nextExpectedPeriodDate;
  const daysUntilNext = cycleSync.daysUntilNextPeriod;

  useEffect(() => {
    if (user.isPregnancyMode) {
      setAffirmation("Bloom beautifully mama. Within you is the warm nursery of a sweet new life. 🌻");
    } else if (user.isPostpartumMode) {
      setAffirmation("Step into quiet. Rest your heavy bones. You created a magnificent miracle 💗");
    } else {
      getDailyAffirmation(user.name, currentPhase, selectedMood).then(setAffirmation);
    }
  }, [user.name, currentPhase, selectedMood, user.isPregnancyMode, user.isPostpartumMode]);

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
  const cycleStatusText = isLatePeriodMode
    ? `Day ${daysLate} Late`
    : daysUntilNext === 0 
      ? "Period starts today" 
      : daysUntilNext && daysUntilNext > 0 
        ? `Next period in ${daysUntilNext} days` 
        : "Log a period to see status";

  const getYouTubeId = (url: string): string => {
    const match = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/);
    return match ? match[1] : '';
  };

  // Video Demo Simulation
  const getVideoDetails = (name: string): { mp4Url: string; youtubeUrl: string } => {
    switch (name) {
      // Trimester 1
      case "Light Pelvic Stretch":
        return {
          mp4Url: "https://assets.mixkit.co/videos/preview/mixkit-woman-doing-yoga-stretches-on-a-mat-40292-large.mp4",
          youtubeUrl: "https://www.youtube.com/watch?v=0719gXz2E3U"
        };
      case "Focus Breathing":
        return {
          mp4Url: "https://assets.mixkit.co/videos/preview/mixkit-meditating-woman-in-a-beautiful-park-42289-large.mp4",
          youtubeUrl: "https://www.youtube.com/watch?v=gAkbHe-j2h8"
        };
      case "Beginner Pregnancy Yoga":
        return {
          mp4Url: "https://assets.mixkit.co/videos/preview/mixkit-young-woman-doing-yoga-on-a-sunny-day-41662-large.mp4",
          youtubeUrl: "https://www.youtube.com/watch?v=H7t6fUqWnQ8"
        };

      // Trimester 2
      case "Mama Glow Yoga Flow":
        return {
          mp4Url: "https://assets.mixkit.co/videos/preview/mixkit-young-woman-doing-yoga-on-a-sunny-day-41662-large.mp4",
          youtubeUrl: "https://www.youtube.com/watch?v=gT8wNlC2n7Q"
        };
      case "Pelvic Girdle Kegels":
        return {
          mp4Url: "https://assets.mixkit.co/videos/preview/mixkit-woman-doing-yoga-stretches-on-a-mat-40292-large.mp4",
          youtubeUrl: "https://www.youtube.com/watch?v=A_coXl7f-2Y"
        };
      case "Safe Moderate Walking":
        return {
          mp4Url: "https://assets.mixkit.co/videos/preview/mixkit-woman-meditating-in-nature-32545-large.mp4",
          youtubeUrl: "https://www.youtube.com/watch?v=tI8bN_f9WkE"
        };

      // Trimester 3
      case "Nesting Gentle Yoga":
        return {
          mp4Url: "https://assets.mixkit.co/videos/preview/mixkit-young-woman-doing-yoga-on-a-sunny-day-41662-large.mp4",
          youtubeUrl: "https://www.youtube.com/watch?v=g2rE90kO8C4"
        };
      case "Hip-Opening preparation":
        return {
          mp4Url: "https://assets.mixkit.co/videos/preview/mixkit-woman-doing-yoga-stretches-on-a-mat-40292-large.mp4",
          youtubeUrl: "https://www.youtube.com/watch?v=3n-vY5Isc6U"
        };
      case "Interactive Breathing for Labor":
        return {
          mp4Url: "https://assets.mixkit.co/videos/preview/mixkit-meditating-woman-in-a-beautiful-park-42289-large.mp4",
          youtubeUrl: "https://www.youtube.com/watch?v=vV95L4N3P1U"
        };

      // Postpartum
      case "Deep Diaphragmatic Breath":
        return {
          mp4Url: "https://assets.mixkit.co/videos/preview/mixkit-meditating-woman-in-a-beautiful-park-42289-large.mp4",
          youtubeUrl: "https://www.youtube.com/watch?v=gAkbHe-j2h8"
        };
      case "Early Pelvic Floor Rehab (Kegels)":
        return {
          mp4Url: "https://assets.mixkit.co/videos/preview/mixkit-woman-doing-yoga-stretches-on-a-mat-40292-large.mp4",
          youtubeUrl: "https://www.youtube.com/watch?v=s0K6s0fCj8E"
        };
      case "Shoulder Chest Openers":
        return {
          mp4Url: "https://assets.mixkit.co/videos/preview/mixkit-woman-doing-yoga-stretches-on-a-mat-40292-large.mp4",
          youtubeUrl: "https://www.youtube.com/watch?v=pAnV94lS_1A"
        };
      case "Supportive Child's Pose":
        return {
          mp4Url: "https://assets.mixkit.co/videos/preview/mixkit-young-woman-doing-yoga-on-a-sunny-day-41662-large.mp4",
          youtubeUrl: "https://www.youtube.com/watch?v=r_v2bLg_eQ8"
        };

      default:
        return {
          mp4Url: "https://assets.mixkit.co/videos/preview/mixkit-young-woman-doing-yoga-on-a-sunny-day-41662-large.mp4",
          youtubeUrl: "https://www.youtube.com/watch?v=0719gXz2E3U"
        };
    }
  };

  const renderPregnancyPostpartumExerciseSVG = (exerciseName: string) => {
    const isStretch = exerciseName.includes("Stretch") || exerciseName.includes("Openers");
    const isBreathing = exerciseName.includes("Breathing") || exerciseName.includes("Breath") || exerciseName.includes("Focus");
    const isYoga = exerciseName.includes("Yoga") || exerciseName.includes("Flow");
    const isKegels = exerciseName.includes("Kegels") || exerciseName.includes("Rehab");
    const isWalking = exerciseName.includes("Walking");
    const isChilds = exerciseName.includes("Child's") || exerciseName.includes("Nesting");
    const isHipPrep = exerciseName.includes("Hip-Opening") || exerciseName.includes("Circles");

    const osc = Math.sin(videoTick * 0.05);
    const oscFast = Math.sin(videoTick * 0.1);
    const scale = dashBreathScale || 1.0;

    // Standard styling & glow gradients
    const gradients = (
      <defs>
        <linearGradient id="dbBodyGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#f472b6" />
          <stop offset="100%" stopColor="#818cf8" />
        </linearGradient>
        <linearGradient id="dbGlowGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="rgba(244,114,182,0.3)" />
          <stop offset="100%" stopColor="rgba(129,140,248,0.02)" />
        </linearGradient>
        <linearGradient id="ballGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#818cf8" />
          <stop offset="100%" stopColor="#4f46e5" />
        </linearGradient>
        <filter id="dbGlow">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
    );

    const floor = (
      <line x1="20" y1="170" x2="300" y2="170" stroke="#f472b6" strokeWidth="2" strokeDasharray="4 4" className="opacity-35" />
    );

    if (isChilds) {
      // Kneeling position resting on a support cushion
      const hipsX = 210 + (scale - 1.0) * 8;
      const hipsY = 145 + (scale - 1.0) * 4;
      const headX = 85;
      const headY = 152;
      return (
        <svg viewBox="0 0 320 220" className="w-full h-full">
          {gradients}
          {floor}
          {/* Support Cushion */}
          <ellipse cx="120" cy="165" rx="35" ry="12" fill="#818cf8" className="opacity-70" />
          {/* Kneeling Body */}
          <path d={`M ${hipsX} ${hipsY} Q 150 115 ${headX + 10} ${headY - 10}`} fill="none" stroke="url(#dbBodyGrad)" strokeWidth="6" strokeLinecap="round" filter="url(#dbGlow)" />
          <circle cx={headX} cy={headY} r="9" fill="#f472b6" filter="url(#dbGlow)" />
          <path d={`M ${headX + 8} ${headY - 8} Q 95 150 45 165`} fill="none" stroke="url(#dbBodyGrad)" strokeWidth="4" strokeLinecap="round" />
          <path d={`M ${hipsX} ${hipsY} L 180 166 L 235 166`} fill="none" stroke="url(#dbBodyGrad)" strokeWidth="5" strokeLinecap="round" />
          <circle cx={hipsX} cy={hipsY} r="4" fill="#60a5fa" />
          {/* Heart pulse center */}
          <circle cx="150" cy="130" r={4 + (scale - 1.0) * 12} fill="#ec4899" className="opacity-50" />
        </svg>
      );
    }

    if (isBreathing) {
      // Seated cross-legged posture with glowing aura
      return (
        <svg viewBox="0 0 320 220" className="w-full h-full">
          {gradients}
          {floor}
          {/* Glow backdrop */}
          <circle cx="160" cy="110" r={30 + (scale - 1.0) * 60} fill="url(#dbGlowGrad)" className="transition-all duration-300" />
          {/* Torso & Head */}
          <line x1="160" y1="160" x2="160" y2="90" stroke="url(#dbBodyGrad)" strokeWidth="6" strokeLinecap="round" filter="url(#dbGlow)" />
          <circle cx="160" cy="72" r="11" fill="#f472b6" filter="url(#dbGlow)" />
          {/* Seated crossed legs */}
          <path d="M 115 160 Q 160 178 205 160" fill="none" stroke="url(#dbBodyGrad)" strokeWidth="6" strokeLinecap="round" />
          {/* Hands on knees */}
          <path d="M 160 110 Q 130 130 120 155" fill="none" stroke="url(#dbBodyGrad)" strokeWidth="4" strokeLinecap="round" />
          <path d="M 160 110 Q 190 130 200 155" fill="none" stroke="url(#dbBodyGrad)" strokeWidth="4" strokeLinecap="round" />
          {/* Expanding lung center */}
          <circle cx="160" cy="120" r={10 + (scale - 1.0) * 35} fill="#ec4899" className="opacity-60" />
          <circle cx="160" cy="120" r="4" fill="#fff" />
        </svg>
      );
    }

    if (isKegels) {
      // Side lying/semi-reclined with active energy in pelvic zone
      const hipX = 180;
      const hipY = 150;
      const kneeX = 135;
      const kneeY = 100 - (scale - 1.0) * 10; // moving knee gently
      return (
        <svg viewBox="0 0 320 220" className="w-full h-full">
          {gradients}
          {floor}
          {/* Soft support wedge */}
          <path d="M 220 168 L 260 100 L 260 168 Z" fill="#818cf8" className="opacity-40" />
          {/* Body line */}
          <path d={`M 240 110 Q 190 145 ${hipX} ${hipY}`} fill="none" stroke="url(#dbBodyGrad)" strokeWidth="6" strokeLinecap="round" filter="url(#dbGlow)" />
          <circle cx="250" cy="95" r="9" fill="#f472b6" filter="url(#dbGlow)" />
          {/* Legs bent up */}
          <path d={`M ${hipX} ${hipY} L ${kneeX} ${kneeY} L 90 160`} fill="none" stroke="url(#dbBodyGrad)" strokeWidth="5" strokeLinecap="round" />
          {/* Pelvic contraction radiating lines */}
          <circle cx={hipX - 10} cy={hipY - 10} r={12 + (scale - 1.0) * 30} fill="none" stroke="#ec4899" strokeWidth="2" strokeDasharray="4 4" className="opacity-80" />
          <circle cx={hipX - 10} cy={hipY - 10} r={4} fill="#60a5fa" />
        </svg>
      );
    }

    if (isYoga) {
      // Elegant standing or kneeling yoga pose (Cat-Cow / Glow flow)
      const isCatCow = exerciseName.includes("Cat-Cow") || exerciseName.includes("Pregnancy Yoga") || exerciseName.includes("Stretch");
      if (isCatCow) {
        // Cat-cow spine curves up & down based on osc
        const curveY = 115 + osc * 15;
        return (
          <svg viewBox="0 0 320 220" className="w-full h-full">
            {gradients}
            {floor}
            {/* Ground support */}
            <path d={`M 220 168 L 150 ${curveY} Q 110 110 75 168`} fill="none" stroke="url(#dbBodyGrad)" strokeWidth="6" strokeLinecap="round" filter="url(#dbGlow)" />
            <circle cx="65" cy="115" r="9" fill="#f472b6" filter="url(#dbGlow)" />
            {/* Arms & Thighs */}
            <line x1="80" y1="130" x2="80" y2="168" stroke="url(#dbBodyGrad)" strokeWidth="5" />
            <line x1="205" y1="140" x2="205" y2="168" stroke="url(#dbBodyGrad)" strokeWidth="5" />
            {/* Core energy baby glow */}
            <circle cx="145" cy={curveY + 12} r={18} fill="url(#dbGlowGrad)" className="opacity-80" />
            <circle cx="145" cy={curveY + 12} r="6" fill="#fb923c" />
          </svg>
        );
      } else {
        // Standing flow warrior/reach
        const armY = 70 + osc * 20;
        return (
          <svg viewBox="0 0 320 220" className="w-full h-full">
            {gradients}
            {floor}
            {/* Legs wide */}
            <path d="M 110 168 L 150 115 L 190 168" fill="none" stroke="url(#dbBodyGrad)" strokeWidth="5" strokeLinecap="round" />
            {/* Spine */}
            <line x1="150" y1="115" x2="150" y2="65" stroke="url(#dbBodyGrad)" strokeWidth="6" strokeLinecap="round" filter="url(#dbGlow)" />
            <circle cx="150" cy="50" r="10" fill="#f472b6" filter="url(#dbGlow)" />
            {/* Reaching arms */}
            <path d={`M 110 ${armY} Q 150 75 190 ${armY}`} fill="none" stroke="url(#dbBodyGrad)" strokeWidth="4" strokeLinecap="round" />
            {/* Belly center (pregnant bump) */}
            <path d="M 150 100 Q 132 115 150 130" fill="none" stroke="#fb923c" strokeWidth="5" strokeLinecap="round" />
            <circle cx="150" cy="115" r={8} fill="#f472b6" className="opacity-30" />
          </svg>
        );
      }
    }

    if (isWalking) {
      // Walking motion simulation
      const step = osc * 15;
      return (
        <svg viewBox="0 0 320 220" className="w-full h-full">
          {gradients}
          {floor}
          {/* Walking legs */}
          <line x1="160" y1="115" x2={160 + step} y2="168" stroke="url(#dbBodyGrad)" strokeWidth="5" strokeLinecap="round" />
          <line x1="160" y1="115" x2={160 - step} y2="168" stroke="url(#dbBodyGrad)" strokeWidth="5" strokeLinecap="round" />
          {/* Spine & Head */}
          <line x1="160" y1="115" x2="160" y2="60" stroke="url(#dbBodyGrad)" strokeWidth="6" strokeLinecap="round" filter="url(#dbGlow)" />
          <circle cx="160" cy="46" r="9" fill="#f472b6" filter="url(#dbGlow)" />
          {/* Swing Arms */}
          <line x1="160" y1="75" x2={160 - step} y2="110" stroke="url(#dbBodyGrad)" strokeWidth="4" strokeLinecap="round" />
          <line x1="160" y1="75" x2={160 + step} y2="110" stroke="url(#dbBodyGrad)" strokeWidth="4" strokeLinecap="round" />
          {/* Cute energy circle around feet */}
          <ellipse cx="160" cy="168" rx="25" ry="5" fill="none" stroke="#60a5fa" strokeWidth="1.5" className="opacity-50" />
        </svg>
      );
    }

    if (isHipPrep) {
      // Seated on birth ball or butterflies rocking
      const isBall = exerciseName.includes("Ball") || exerciseName.includes("Circles");
      if (isBall) {
        // Rotational offset
        const rotX = Math.cos(videoTick * 0.1) * 8;
        const rotY = Math.sin(videoTick * 0.1) * 4;
        return (
          <svg viewBox="0 0 320 220" className="w-full h-full">
            {gradients}
            {floor}
            {/* Birth ball */}
            <circle cx="160" cy="148" r="32" fill="url(#ballGrad)" className="opacity-80" />
            {/* Seated Figure on ball */}
            <line x1={160 + rotX} y1={116 + rotY} x2={160 + rotX} y2="60" stroke="url(#dbBodyGrad)" strokeWidth="6" strokeLinecap="round" filter="url(#dbGlow)" />
            <circle cx={160 + rotX} cy="46" r="9" fill="#f472b6" filter="url(#dbGlow)" />
            {/* Sitting legs on side of ball */}
            <path d={`M ${160 + rotX} ${116 + rotY} L 120 135 L 120 168`} fill="none" stroke="url(#dbBodyGrad)" strokeWidth="4" strokeLinecap="round" />
            <path d={`M ${160 + rotX} ${116 + rotY} L 200 135 L 200 168`} fill="none" stroke="url(#dbBodyGrad)" strokeWidth="4" strokeLinecap="round" />
          </svg>
        );
      } else {
        // Butterfly sitting pose
        const flap = Math.abs(oscFast) * 12;
        return (
          <svg viewBox="0 0 320 220" className="w-full h-full">
            {gradients}
            {floor}
            {/* Spine & Head */}
            <line x1="160" y1="150" x2="160" y2="80" stroke="url(#dbBodyGrad)" strokeWidth="6" strokeLinecap="round" filter="url(#dbGlow)" />
            <circle cx="160" cy="64" r="10" fill="#f472b6" filter="url(#dbGlow)" />
            {/* Flapping butterfly legs */}
            <path d={`M 160 150 Q 120 ${130 - flap} 140 160`} fill="none" stroke="url(#dbBodyGrad)" strokeWidth="5" strokeLinecap="round" />
            <path d={`M 160 150 Q 200 ${130 - flap} 180 160`} fill="none" stroke="url(#dbBodyGrad)" strokeWidth="5" strokeLinecap="round" />
            {/* Golden light in pelvic core */}
            <circle cx="160" cy="148" r={12 + (scale - 1.0) * 30} fill="url(#dbGlowGrad)" className="opacity-85" />
          </svg>
        );
      }
    }

    // Default fallback (Gentle stretch stretch pose)
    return (
      <svg viewBox="0 0 320 220" className="w-full h-full">
        {gradients}
        {floor}
        <line x1="160" y1="160" x2="160" y2="90" stroke="url(#dbBodyGrad)" strokeWidth="6" strokeLinecap="round" filter="url(#dbGlow)" />
        <circle cx="160" cy="72" r="11" fill="#f472b6" filter="url(#dbGlow)" />
        <path d={`M 120 160 L 160 120 L 200 160`} fill="none" stroke="url(#dbBodyGrad)" strokeWidth="5" strokeLinecap="round" />
        <circle cx="160" cy="115" r={6 + osc * 6} fill="#fb923c" className="opacity-70" />
      </svg>
    );
  };

  const startVideoSimulation = (exerciseName: string, duration: string) => {
    const details = getVideoDetails(exerciseName);
    setSimulatedVideo({
      name: exerciseName,
      duration,
      mp4Url: details.mp4Url,
      youtubeUrl: details.youtubeUrl
    });
    setVideoLoading(true);
  };

  useEffect(() => {
    if (simulatedVideo) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [simulatedVideo]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (simulatedVideo && videoLoading) {
      timer = setTimeout(() => {
        setVideoLoading(false);
      }, 1500);
    }
    return () => {
      clearTimeout(timer);
    };
  }, [simulatedVideo, videoLoading]);

  // Guided Breath & Posture Coach Instruction Rotation
  useEffect(() => {
    if (!simulatedVideo || coachMode !== 'ai') return;

    const instructionInterval = setInterval(() => {
      setCoachInstructionIndex(prev => (prev + 1) % 5);
    }, 5000);

    return () => {
      clearInterval(instructionInterval);
    };
  }, [simulatedVideo, coachMode]);

  useEffect(() => {
    let frameId: number;
    const update = () => {
      setVideoTick(prev => prev + 1);
      frameId = requestAnimationFrame(update);
    };
    if (simulatedVideo) {
      frameId = requestAnimationFrame(update);
    }
    return () => cancelAnimationFrame(frameId);
  }, [simulatedVideo]);

  useEffect(() => {
    if (!simulatedVideo) return;

    const interval = setInterval(() => {
      setDashBreathTime(prev => {
        const next = (prev + 0.1) % 6.0;
        
        if (next < 2.0) {
          setDashBreathState('Inhale');
          setDashBreathScale(1.0 + (next / 2.0) * 0.4);
        } else if (next < 4.0) {
          setDashBreathState('Hold');
          setDashBreathScale(1.4);
        } else {
          setDashBreathState('Exhale');
          setDashBreathScale(1.4 - ((next - 4.0) / 2.0) * 0.4);
        }
        return next;
      });
    }, 100);

    return () => clearInterval(interval);
  }, [simulatedVideo]);

  const getCoachInstructions = (exerciseName: string): string[] => {
    switch (exerciseName) {
      case "Light Pelvic Stretch":
        return [
          "Keep your spine straight and rest your hands on your knees.",
          "Gently tilt your pelvis forward, breathing in deeply.",
          "Hold the stretch and feel the gentle release in your lower back.",
          "Tilt backward as you exhale slowly, contracting your core.",
          "Repeat the movement smoothly. Let the AI track your balance."
        ];
      case "Focus Breathing":
        return [
          "Sit comfortably, cross-legged, with shoulders dropped.",
          "Inhale through your nose, expanding your abdomen fully.",
          "Hold the life-giving breath for 3 seconds.",
          "Exhale slowly through your mouth, letting all tension melt.",
          "Lumina Coach AI is monitoring your deep diaphragmatic rhythm."
        ];
      case "Beginner Pregnancy Yoga":
        return [
          "Move slowly into a gentle Cat-Cow pose.",
          "Inhale to arch your back slightly. Don't overextend your belly.",
          "Exhale as you round your spine, pressing away from the floor.",
          "Keep your knees wide to give your baby plenty of room.",
          "Balance looks perfect! Hold the pose and breathe."
        ];
      case "Mama Glow Yoga Flow":
        return [
          "Stand tall in Mountain Pose with feet wider than hip-width.",
          "Reach arms up gently, letting your chest open to the sky.",
          "Exhale and lower into a soft, safe half-squat.",
          "Lumina Pose Estimator: Hips and knees aligned correctly.",
          "Inhale back to standing. Feel your strength and energy flow."
        ];
      case "Pelvic Girdle Kegels":
        return [
          "Lie on your back with knees bent and feet flat.",
          "Squeeze your pelvic floor muscles as if stopping urine flow.",
          "Hold the squeeze tightly for 5 full seconds.",
          "Release slowly and rest for 5 seconds.",
          "Inhale deeply to prepare for the next contraction."
        ];
      case "Safe Moderate Walking":
        return [
          "Maintain a steady, upright posture with chest lifted.",
          "Swing your arms naturally to assist your momentum.",
          "Keep a relaxed, conversational pace. No breathlessness.",
          "Lumina Step Analytics: Pace and stride are perfectly balanced.",
          "Land on your heels and roll smoothly through to your toes."
        ];
      case "Nesting Gentle Yoga":
        return [
          "Inhale and sweep arms wide, opening your ribcage.",
          "Exhale and bring hands to your heart, centering your energy.",
          "Take a gentle, wide-legged child's pose to relax.",
          "Allow your forehead to rest softly on a block or mat.",
          "Lumina Spine Tracker: Perfect alignment of back and neck."
        ];
      case "Hip-Opening preparation":
        return [
          "Sit down with soles of feet together in Butterfly Pose.",
          "Gently flutter your knees down to release tension.",
          "Inhale to lift and elongate your spine.",
          "Exhale and hinge forward slightly from your hips.",
          "Keep breathing smoothly. Do not force any stretch."
        ];
      case "Interactive Breathing for Labor":
        return [
          "Adopt a comfortable kneeling or resting posture.",
          "Use a slow, deep breath in for 4 seconds.",
          "Exhale slowly for 4 seconds, humming gently if it helps.",
          "Focus on relaxing all facial muscles and your jaw.",
          "Breathing rhythm synced perfectly. Excellent focus, mama!"
        ];
      case "Deep Diaphragmatic Breath":
        return [
          "Place one hand on your chest and one on your abdomen.",
          "Inhale to expand the belly without lifting your chest.",
          "Breathe in slow, rich oxygen to nurture your recovery.",
          "Exhale slowly, feeling your belly contract naturally.",
          "Excellent breath depth detected. Restoring core balance."
        ];
      case "Early Pelvic Floor Rehab (Kegels)":
        return [
          "Find a comfortable laying down or seated position.",
          "Gently engage the deep muscles of your pelvic floor.",
          "Hold the engagement with a steady breath. Avoid bracing.",
          "Relax fully. Feel the support in your lower pelvis.",
          "AI tracking confirms optimal muscle activation rhythm."
        ];
      case "Shoulder Chest Openers":
        return [
          "Sit tall and interlace your fingers behind your back.",
          "Gently pull your shoulders back to expand your chest.",
          "Breathe deeply into the front of your heart.",
          "Exhale to drop your shoulders further away from your ears.",
          "Releasing desk and nursing tension. Alignment is great!"
        ];
      case "Supportive Child's Pose":
        return [
          "Spread your knees wide apart on the yoga mat.",
          "Walk your hands forward, lowering your chest to the earth.",
          "Let your spine stretch out and rest your hips back.",
          "Take slow, cleansing breaths into your lower back.",
          "Deep recovery mode active. Stay here as long as needed."
        ];
      default:
        return [
          "Sit comfortably, focusing on slow, regular breaths.",
          "Inhale peace and clarity, expand your ribcage.",
          "Hold gently for a moment to center yourself.",
          "Exhale all tightness, stress, or weariness.",
          "AI Coach active: Balance, posture, and rhythm synced."
        ];
    }
  };

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
    logAvatarActionReward(user, 'self_care_challenge', 'Postpartum Healing Check-in', setUser);
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
    const details = getCycleDetailsForSpecificDate(user, date);
    if (details.isLoggedPeriod) return 'period';
    if (details.isPredictedPeriod) return 'predicted';
    if (details.isOvulationDay) return 'ovulation';
    if (details.isPrecedingFertileDay) return 'fertile';
    if (details.phaseKey === 'follicular') return 'follicular';
    if (details.phaseKey === 'luteal') return 'luteal';
    return 'none';
  };

  const dayStyles = {
    period: 'bg-pink-500 text-white shadow-md shadow-pink-100 font-bold',
    predicted: 'bg-pink-50/80 text-pink-700 border-2 border-dashed border-pink-300 font-medium',
    ovulation: 'bg-amber-400 text-white font-black shadow-md shadow-amber-200 ring-2 ring-amber-300 ring-offset-1',
    fertile: 'bg-sky-100 text-sky-800 border border-sky-300 font-bold',
    follicular: 'bg-emerald-50 text-emerald-800 border border-emerald-200/70 font-medium',
    luteal: 'bg-purple-100/75 text-purple-900 border border-purple-200/70 font-medium',
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
      <div className="space-y-6">
        {/* Header Hero */}
        <section className="bg-gradient-to-br from-indigo-600 via-indigo-500 to-purple-600 p-6 sm:p-8 rounded-2xl text-white shadow-sm border border-indigo-400/30 relative overflow-hidden">
          <div className="relative z-10 space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-semibold text-indigo-100">Pregnancy Sanctuary</span>
              <span className="text-xs font-medium text-indigo-100 tabular-nums">Week {weeks}</span>
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl sm:text-4xl font-serif text-white font-normal tracking-tight">
                Welcome, {user.firstName || user.name || 'Mama'}
              </h2>
              <p className="text-sm text-indigo-100/95 max-w-xl leading-relaxed">“{affirmation}”</p>
            </div>
            
            <div className="pt-4 flex flex-col md:flex-row gap-4 justify-between items-stretch md:items-center border-t border-white/15">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-white/15 border border-white/20 flex items-center justify-center text-2xl shrink-0">
                  {currentBaby.fruit}
                </div>
                <div>
                  <p className="text-base font-serif font-semibold tabular-nums">Week {weeks} Pregnancy</p>
                  <p className="text-xs text-indigo-100">Baby is the size of a <span className="font-semibold underline underline-offset-2">{currentBaby.size}</span></p>
                </div>
              </div>

              <button 
                type="button"
                onClick={() => setIsDeliveredModalOpen(true)}
                className="h-11 px-5 bg-amber-300 hover:bg-amber-200 text-indigo-950 rounded-xl font-semibold text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <Baby className="w-4 h-4" />
                <span>Mark Baby as Delivered</span>
              </button>
            </div>
          </div>
        </section>

        {/* Exercises Section */}
        <section className="bg-white dark:bg-[#1a1816] p-6 sm:p-8 rounded-2xl border border-stone-200/80 dark:border-[#2e2a26] shadow-sm space-y-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
            <div className="space-y-1">
              <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">Trimester Movement</span>
              <h3 className="text-2xl font-serif text-stone-900 dark:text-stone-100 font-normal">Pregnancy-Safe Exercises</h3>
            </div>
            {/* Trimester switcher */}
            <div className="flex bg-stone-100 dark:bg-[#23201d] p-1 rounded-xl border border-stone-200/80 dark:border-[#2e2a26]">
              {([1, 2, 3] as const).map(tri => (
                <button
                  key={tri}
                  type="button"
                  onClick={() => setExerciseTrimester(tri)}
                  className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${exerciseTrimester === tri ? 'bg-indigo-600 text-white shadow-xs' : 'text-stone-600 dark:text-stone-300 hover:text-stone-900'}`}
                >
                  Trimester {tri}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {exerciseCategories[exerciseTrimester].map((ex, i) => (
              <div key={i} className="p-5 bg-stone-50/70 dark:bg-[#23201d] border border-stone-200/70 dark:border-[#2e2a26] rounded-xl space-y-3 flex flex-col justify-between hover:border-indigo-200 transition-colors">
                <div className="space-y-2">
                  <div className="flex justify-between items-start gap-2">
                    <span className="text-sm font-serif font-semibold text-stone-900 dark:text-stone-100">{ex.name}</span>
                    <span className="text-xs font-medium text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/40 px-2 py-0.5 rounded-lg shrink-0 tabular-nums">{ex.duration}</span>
                  </div>
                  <p className="text-xs text-stone-600 dark:text-stone-400 leading-relaxed">{ex.desc}</p>
                </div>
                <div className="pt-3 border-t border-stone-200/60 dark:border-[#2e2a26]">
                  <p className="text-[11px] font-semibold text-stone-500 dark:text-stone-400">Safety note</p>
                  <p className="text-xs text-stone-700 dark:text-stone-300 mt-0.5">{ex.note}</p>
                  <button
                    type="button"
                    onClick={() => startVideoSimulation(ex.name, ex.duration)}
                    className="mt-3.5 w-full h-10 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Video className="w-3.5 h-3.5" />
                    <span>Play Tutorial Video</span>
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-amber-50 dark:bg-amber-950/30 p-4 rounded-xl border border-amber-200/70 dark:border-amber-900/40 flex gap-3 items-center">
            <AlertCircle size={18} className="text-amber-600 shrink-0" />
            <p className="text-xs text-amber-950 dark:text-amber-200 leading-relaxed">
              <strong>Check with your doctor first:</strong> These exercise lists are educational guidelines. Stop any movement that causes pain, cramping, or shortness of breath.
            </p>
          </div>
        </section>

        {/* Nutrition and Skincare Infusion */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-[#1a1816] p-6 sm:p-7 rounded-2xl border border-stone-200/80 dark:border-[#2e2a26] shadow-sm space-y-4">
            <h4 className="text-lg font-serif text-stone-900 dark:text-stone-100 flex items-center gap-2.5">
              <Utensils size={18} className="text-indigo-600 dark:text-indigo-400" />
              <span>Healthy Meals &amp; Infusions</span>
            </h4>
            <div className="space-y-3 pt-1">
              <div className="p-4 bg-stone-50/70 dark:bg-[#23201d] border border-stone-200/70 dark:border-[#2e2a26] rounded-xl flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                  <Utensils className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs font-semibold text-indigo-700 dark:text-indigo-300">Nutrition Highlights</span>
                  <p className="text-sm text-stone-900 dark:text-stone-100 font-semibold mt-0.5">Folate, Iron, Protein</p>
                  <p className="text-xs text-stone-600 dark:text-stone-400 leading-relaxed mt-0.5">Include slow-simmered broths, baked avocado eggs, and dark leafy greens.</p>
                </div>
              </div>
              
              <div className="p-4 bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/30 rounded-xl flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg bg-amber-100/80 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 flex items-center justify-center shrink-0">
                  <Coffee className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs font-semibold text-amber-700 dark:text-amber-300">Pregnancy-Safe Teas</span>
                  <p className="text-sm text-stone-900 dark:text-stone-100 font-semibold mt-0.5">Ginger, Peppermint, Red Raspberry</p>
                  <p className="text-xs text-stone-700 dark:text-stone-300 leading-relaxed mt-0.5">
                    Ginger helps ease nausea; peppermint aids digestion. Red raspberry leaf is advised only in Trimester 3 with clinician approval.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-[#1a1816] p-6 sm:p-7 rounded-2xl border border-stone-200/80 dark:border-[#2e2a26] shadow-sm space-y-4">
            <h4 className="text-lg font-serif text-stone-900 dark:text-stone-100 flex items-center gap-2.5">
              <Sparkles size={18} className="text-indigo-600 dark:text-indigo-400" />
              <span>Pregnancy-Safe Skincare</span>
            </h4>
            <ul className="space-y-3 text-sm text-stone-600 dark:text-stone-300 pt-1">
              <li className="flex gap-2.5 items-start">
                <Check className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                <span>Use rich cocoa or whipped shea butter to hydrate stretching skin comfortably.</span>
              </li>
              <li className="flex gap-2.5 items-start">
                <Check className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                <span>Avoid chemical retinoids, hydroquinone, and harsh salicylic exfoliants.</span>
              </li>
              <li className="flex gap-2.5 items-start">
                <Check className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                <span>Stay consistently hydrated to support skin elasticity from within.</span>
              </li>
            </ul>
          </div>
        </section>

        {/* Weekly Education Hub */}
        <section className="bg-white dark:bg-[#1a1816] p-6 sm:p-8 rounded-2xl border border-stone-200/80 dark:border-[#2e2a26] shadow-sm space-y-6">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">Maternal Study Guide</span>
            <h3 className="text-2xl font-serif text-stone-900 dark:text-stone-100 font-normal">Weekly Pregnancy Education Hub</h3>
            <p className="text-xs text-stone-500 dark:text-stone-400">Explore fetal development, maternal changes, skincare guidance, and nutrition week by week.</p>
          </div>

          {/* Quick weeks toggler slider */}
          <div className="flex gap-2 overflow-x-auto pb-2 pt-1 scrollbar-hide">
            {(Object.keys(weeklyEducationContent).map(Number).sort((a,b)=>a-b)).map(wk => (
              <button
                key={wk}
                type="button"
                onClick={() => setSelectedWeekTab(wk)}
                className={`flex-shrink-0 px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors relative cursor-pointer tabular-nums ${
                  selectedWeekTab === wk 
                    ? 'bg-indigo-600 text-white' 
                    : 'bg-stone-100 dark:bg-[#23201d] text-stone-600 dark:text-stone-300 hover:bg-stone-200 border border-stone-200/60 dark:border-[#2e2a26]'
                }`}
              >
                Week {wk}
                {wk === weeks && <span className="ml-1.5 inline-block w-1.5 h-1.5 bg-amber-300 rounded-full align-middle" />}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
            <div className="p-5 bg-indigo-50/40 dark:bg-indigo-950/20 rounded-xl border border-indigo-100/80 dark:border-indigo-900/30 space-y-2">
              <span className="text-xs font-semibold text-indigo-700 dark:text-indigo-300 flex items-center gap-1.5"><Baby size={14} /> Baby&apos;s Progress</span>
              <p className="text-sm text-stone-700 dark:text-stone-300 leading-relaxed">{edWeek.baby}</p>
            </div>
            
            <div className="p-5 bg-purple-50/40 dark:bg-purple-950/20 rounded-xl border border-purple-100/80 dark:border-purple-900/30 space-y-2">
              <span className="text-xs font-semibold text-purple-700 dark:text-purple-300 flex items-center gap-1.5"><Compass size={14} /> Body &amp; Skin Changes</span>
              <p className="text-sm text-stone-700 dark:text-stone-300 leading-relaxed">{edWeek.body}</p>
              <p className="text-xs text-purple-700 dark:text-purple-300 pt-1"><strong>Skincare:</strong> {edWeek.skin}</p>
            </div>

            <div className="p-5 bg-amber-50/40 dark:bg-amber-950/20 rounded-xl border border-amber-100/80 dark:border-amber-900/30 space-y-2">
              <span className="text-xs font-semibold text-amber-700 dark:text-amber-300 flex items-center gap-1.5"><Utensils size={14} /> Nutritional Focus</span>
              <p className="text-sm text-stone-700 dark:text-stone-300 leading-relaxed">{edWeek.nutrition}</p>
            </div>

            <div className="p-5 bg-teal-50/40 dark:bg-teal-950/20 rounded-xl border border-teal-100/80 dark:border-teal-900/30 space-y-2">
              <span className="text-xs font-semibold text-teal-700 dark:text-teal-300 flex items-center gap-1.5"><Activity size={14} /> Movement Focus</span>
              <p className="text-sm text-stone-700 dark:text-stone-300 leading-relaxed">{edWeek.exercise}</p>
            </div>
          </div>
        </section>

        {/* Connected Partner Pregnancy notifications widget */}
        {user.isPartnerLinked && (
          <section className="bg-indigo-950 text-white p-6 sm:p-8 rounded-2xl border border-indigo-900 space-y-4">
             <div className="space-y-2">
                <span className="text-xs font-semibold text-indigo-300">Partner Support Sync</span>
                <h4 className="text-xl font-serif text-white">Shared Pregnancy Companion Reminders</h4>
                <p className="text-xs text-indigo-200 leading-relaxed max-w-xl">
                  Since shared notifications are enabled, {user.partnerName || 'your partner'} receives gentle care prompts such as:
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                  <div className="p-4 bg-white/5 border border-white/10 rounded-xl text-xs text-indigo-100 leading-relaxed">
                    “She may appreciate extra comfort today. Check in and offer tea or a nourishing snack.”
                  </div>
                  <div className="p-4 bg-white/5 border border-white/10 rounded-xl text-xs text-indigo-100 leading-relaxed">
                     “She has a prenatal appointment this week. Offer to help organize notes or handle travel.”
                  </div>
                  <div className="p-4 bg-white/5 border border-white/10 rounded-xl text-xs text-indigo-100 leading-relaxed">
                     “Baby is growing quickly this week. Check in on her energy and offer quiet rest time.”
                  </div>
                  <div className="p-4 bg-white/5 border border-white/10 rounded-xl text-xs text-indigo-100 leading-relaxed">
                     “Help keep her water bottle filled and chilled throughout the day.”
                  </div>
                </div>
             </div>
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
      <div className="space-y-6">
        {/* Header Hero */}
        <section className="bg-gradient-to-br from-indigo-600 via-indigo-700 to-slate-900 p-6 sm:p-8 rounded-2xl text-white shadow-sm border border-indigo-500/30">
          <div className="space-y-4">
            <span className="text-xs font-semibold text-indigo-200">Postpartum Recovery Mode</span>
            <div className="space-y-2">
              <h2 className="text-2xl sm:text-4xl font-serif text-white font-normal tracking-tight">Sanctuary Healing, {user.firstName || user.name}</h2>
              <p className="text-sm text-indigo-100/95 max-w-xl">“{affirmation}”</p>
            </div>
            
            <div className="pt-4 flex flex-col md:flex-row gap-4 justify-between items-stretch md:items-center border-t border-white/15">
              <div className="flex items-center gap-3">
                <Flower2 className="w-5 h-5 text-pink-300 shrink-0" />
                <p className="text-xs text-indigo-100">Focus: Gentle physical recovery, pelvic floor care, rest, and nourishment.</p>
              </div>

              <button 
                type="button"
                onClick={handleExitPostpartum}
                className="h-10 px-4 bg-white/15 hover:bg-white/25 border border-white/25 text-white rounded-xl font-semibold text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Resume Classical Period Tracker</span>
              </button>
            </div>
          </div>
        </section>

        {/* Daily Healing Logging Check-in Form */}
        <section className="bg-white dark:bg-[#1a1816] p-6 sm:p-8 rounded-2xl border border-stone-200/80 dark:border-[#2e2a26] shadow-sm space-y-6">
          <div className="space-y-1">
             <span className="text-xs font-semibold text-pink-700 dark:text-pink-400">Daily Healing Monitor</span>
             <h3 className="text-2xl font-serif text-stone-900 dark:text-stone-100 font-normal">Postpartum Healing Check-in</h3>
             <p className="text-xs text-stone-500 dark:text-stone-400">Track your physical recovery, rest, hydration, and emotional wellbeing day by day.</p>
          </div>

          {checkinSuccess && (
            <div className="p-4 bg-teal-50 dark:bg-teal-950/30 border border-teal-200 dark:border-teal-900/40 text-teal-800 dark:text-teal-200 rounded-xl flex items-center gap-2">
              <CheckCircle size={18} className="text-teal-600 shrink-0" />
              <p className="text-xs font-medium">Healing check-in saved to your sanctuary.</p>
            </div>
          )}

          <form onSubmit={handlePostpartumCheckin} className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-1">
             <div className="space-y-4">
                <div className="space-y-2">
                   <label className="text-xs font-semibold text-stone-700 dark:text-stone-300">Healing Emotional Mood</label>
                   <div className="grid grid-cols-5 gap-1.5 pt-1">
                     {(['happy', 'calm', 'sensitive', 'tired', 'overwhelmed'] as const).map(md => (
                       <button
                         key={md}
                         type="button"
                         onClick={() => setPostpartumMood(md)}
                         className={`py-2.5 px-1 rounded-xl text-xs font-medium border transition-colors capitalize cursor-pointer ${
                           postpartumMood === md 
                             ? 'bg-pink-50 dark:bg-pink-950/40 border-pink-500 text-pink-700 dark:text-pink-300 font-semibold' 
                             : 'bg-white dark:bg-[#23201d] border-stone-200 dark:border-[#2e2a26] text-stone-600 dark:text-stone-300 hover:border-pink-300'
                         }`}
                       >
                         {md}
                       </button>
                     ))}
                   </div>
                </div>

                <div className="space-y-2">
                   <div className="flex justify-between items-center">
                     <label className="text-xs font-semibold text-stone-700 dark:text-stone-300">Cumulative Sleep</label>
                     <span className="text-xs font-semibold text-pink-700 dark:text-pink-400 tabular-nums">{postpartumSleep} hours</span>
                   </div>
                   <input
                     type="range" min="3" max="12" step="0.5"
                     value={postpartumSleep}
                     onChange={(e) => setPostpartumSleep(parseFloat(e.target.value))}
                     className="w-full accent-pink-600"
                   />
                </div>

                <div className="space-y-2">
                   <div className="flex justify-between items-center">
                     <label className="text-xs font-semibold text-stone-700 dark:text-stone-300">Hydration Intake</label>
                     <span className="text-xs font-semibold text-pink-700 dark:text-pink-400 tabular-nums">{postpartumHydration} L</span>
                   </div>
                   <input
                     type="range" min="1" max="6" step="0.5"
                     value={postpartumHydration}
                     onChange={(e) => setPostpartumHydration(parseFloat(e.target.value))}
                     className="w-full accent-pink-600"
                   />
                </div>
             </div>

             <div className="space-y-4">
                <div className="space-y-2">
                   <label className="text-xs font-semibold text-stone-700 dark:text-stone-300">Bleeding / Lochia Intensity</label>
                   <div className="grid grid-cols-5 gap-1.5">
                     {(['none', 'spotting', 'light', 'medium', 'heavy'] as const).map(bl => (
                       <button
                         key={bl}
                         type="button"
                         onClick={() => setPostpartumBleeding(bl)}
                         className={`py-2 px-1 rounded-xl text-xs font-medium border transition-colors capitalize cursor-pointer ${
                           postpartumBleeding === bl 
                             ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-500 text-rose-700 dark:text-rose-300 font-semibold' 
                             : 'bg-white dark:bg-[#23201d] border-stone-200 dark:border-[#2e2a26] text-stone-600 dark:text-stone-300 hover:border-rose-300'
                         }`}
                       >
                         {bl}
                       </button>
                     ))}
                   </div>
                   {postpartumBleeding === 'heavy' && (
                     <p className="text-xs text-rose-600 font-medium">Inform your midwife or physician if heavy bleeding persists or clots are large.</p>
                   )}
                </div>

                <div className="space-y-2">
                   <div className="flex justify-between items-center">
                     <label className="text-xs font-semibold text-stone-700 dark:text-stone-300">Breastfeeding Session Duration</label>
                     <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 tabular-nums">{breastfeedingMinutes} mins</span>
                   </div>
                   <input
                     type="range" min="5" max="60" step="5"
                     value={breastfeedingMinutes}
                     onChange={(e) => setBreastfeedingMinutes(parseInt(e.target.value))}
                     className="w-full accent-indigo-600"
                   />
                </div>

                <div className="space-y-2">
                   <label className="text-xs font-semibold text-stone-700 dark:text-stone-300">Completed Self-Care Tasks</label>
                   <div className="grid grid-cols-2 gap-2 pt-1">
                     {[
                       { key: 'pelvicFloor', label: 'Pelvic breath rehab' },
                       { key: 'napTaken', label: 'Restorative nap' },
                       { key: 'healingBalm', label: 'Soothing care' },
                       { key: 'nutritiousSoup', label: 'Warm recovery meal' }
                     ].map(sc => (
                       <label key={sc.key} className="flex items-center gap-2 bg-stone-50 dark:bg-[#23201d] border border-stone-200/70 dark:border-[#2e2a26] p-2.5 rounded-xl cursor-pointer">
                         <input
                           type="checkbox"
                           checked={selfCareCheck[sc.key as keyof typeof selfCareCheck]}
                           onChange={(e) => {
                             setSelfCareCheck(prev => ({ ...prev, [sc.key]: e.target.checked }));
                           }}
                           className="accent-pink-600 w-4 h-4"
                         />
                         <span className="text-xs text-stone-700 dark:text-stone-300 font-medium">{sc.label}</span>
                       </label>
                     ))}
                   </div>
                </div>
             </div>

             <div className="md:col-span-2 pt-2">
                <button
                  type="submit"
                  className="w-full h-11 bg-pink-600 hover:bg-pink-700 text-white rounded-xl font-semibold text-sm transition-colors cursor-pointer"
                >
                   Save Healing Check-in
                </button>
             </div>
          </form>
        </section>

        {/* Traditional Cultural Recovery Meals */}
        <section className="bg-white dark:bg-[#1a1816] p-6 sm:p-8 rounded-2xl border border-stone-200/80 dark:border-[#2e2a26] shadow-sm space-y-6">
          <div className="space-y-1">
             <span className="text-xs font-semibold text-pink-700 dark:text-pink-400">Nourishment Guide</span>
             <h3 className="text-2xl font-serif text-stone-900 dark:text-stone-100 font-normal">Postpartum Recovery Nutrition</h3>
             <p className="text-xs text-stone-500 dark:text-stone-400">Warm, mineral-rich traditional meals to support tissue recovery and hydration.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
             {traditionalRecipes.map((rc, i) => (
               <div key={i} className="p-5 bg-stone-50/70 dark:bg-[#23201d] border border-stone-200/70 dark:border-[#2e2a26] rounded-xl flex flex-col justify-between">
                  <div className="space-y-3">
                     <div className="space-y-1">
                       <span className="text-[11px] font-semibold text-pink-700 dark:text-pink-400 block">{rc.culture}</span>
                       <span className="text-base font-serif text-stone-900 dark:text-stone-100 leading-snug block">{rc.name}</span>
                     </div>
                     
                     <div className="p-2.5 bg-white dark:bg-[#1a1816] border border-stone-200/60 dark:border-[#2e2a26] rounded-lg text-xs text-stone-700 dark:text-stone-300 leading-relaxed">
                        <strong>Focus:</strong> {rc.purpose}
                     </div>

                     <div className="text-xs leading-relaxed">
                        <span className="font-semibold text-stone-700 dark:text-stone-300 block mb-0.5">Ingredients:</span>
                        <p className="text-stone-500 dark:text-stone-400">{rc.ingredients.join(", ")}</p>
                     </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-stone-200/70 dark:border-[#2e2a26]">
                     <span className="text-xs font-semibold text-stone-700 dark:text-stone-300 block mb-1">Preparation</span>
                     <p className="text-xs text-stone-600 dark:text-stone-400 leading-relaxed line-clamp-3">{rc.prep}</p>
                  </div>
               </div>
             ))}
          </div>

          <div className="p-4 bg-amber-50 dark:bg-amber-950/30 rounded-xl border border-amber-200/70 dark:border-amber-900/40 flex gap-2.5 items-start">
             <AlertCircle size={16} className="text-amber-600 shrink-0 mt-0.5" />
             <div className="space-y-0.5">
               <span className="text-xs font-semibold text-amber-900 dark:text-amber-300 block">Educational Purpose Notice</span>
               <p className="text-xs text-amber-900/90 dark:text-amber-200 leading-relaxed">
                  Traditional dietary suggestions are self-care support rituals and not medical treatments. Consult a clinician for personalized postnatal care.
               </p>
             </div>
          </div>
        </section>

        {/* Postpartum recovery wellness guided videos */}
        <section className="bg-white dark:bg-[#1a1816] p-6 sm:p-8 rounded-2xl border border-stone-200/80 dark:border-[#2e2a26] shadow-sm space-y-6">
          <div className="space-y-1">
             <span className="text-xs font-semibold text-pink-700 dark:text-pink-400">Guided Rehabilitation</span>
             <h3 className="text-2xl font-serif text-stone-900 dark:text-stone-100 font-normal">Postpartum Gentle Wellness Exercises</h3>
             <p className="text-xs text-stone-500 dark:text-stone-400">Gentle movements for pelvic and posture recovery.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {postpartumGentlyYoga.map((ex, i) => (
              <div key={i} className="p-4 bg-stone-50/70 dark:bg-[#23201d] border border-stone-200/70 dark:border-[#2e2a26] rounded-xl flex flex-col justify-between">
                 <div className="space-y-2">
                   <div className="flex justify-between items-start gap-2">
                      <span className="text-sm font-serif text-stone-900 dark:text-stone-100 leading-snug">{ex.name}</span>
                      <span className="text-[11px] font-semibold bg-pink-50 dark:bg-pink-950/40 text-pink-700 dark:text-pink-300 px-2 py-0.5 rounded-lg shrink-0 tabular-nums">{ex.duration}</span>
                   </div>
                   <p className="text-xs text-stone-600 dark:text-stone-400 leading-normal">{ex.desc}</p>
                 </div>
                 <div className="mt-3 pt-3 border-t border-stone-200/70 dark:border-[#2e2a26]">
                    <span className="text-[11px] text-rose-700 dark:text-rose-400 font-semibold block">Safety note:</span>
                    <p className="text-xs text-stone-600 dark:text-stone-400 mt-0.5">{ex.warning}</p>
                    <button
                      type="button"
                      onClick={() => startVideoSimulation(ex.name, ex.duration)}
                      className="mt-3 w-full h-9 bg-pink-600 hover:bg-pink-700 text-white font-semibold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Video size={13} />
                      <span>Play Tutorial</span>
                    </button>
                 </div>
              </div>
            ))}
          </div>

          <div className="p-4 bg-amber-50 dark:bg-amber-950/30 rounded-xl border border-amber-200/70 dark:border-amber-900/40 flex gap-2.5 items-start">
             <AlertCircle size={16} className="text-amber-600 shrink-0 mt-0.5" />
             <div className="space-y-0.5">
               <span className="text-xs font-semibold text-amber-900 dark:text-amber-300 block">Pelvic Safety Notice</span>
               <p className="text-xs text-amber-900/90 dark:text-amber-200 leading-relaxed">
                  Always obtain clearance from your obstetrician or midwife (often around 6 weeks postpartum, or longer following cesarean delivery) before starting core rehabilitation.
               </p>
             </div>
          </div>
        </section>

        {/* Connected Partner Postpartum sync reminders */}
        {user.isPartnerLinked && (
          <section className="bg-stone-900 text-white p-6 sm:p-8 rounded-2xl border border-stone-800 space-y-4">
             <div className="space-y-2">
                <span className="text-xs font-semibold text-pink-300">Partner Support Sync</span>
                <h4 className="text-xl font-serif text-white">Shared Postpartum Recovery Reminders</h4>
                <p className="text-xs text-stone-300 leading-relaxed max-w-xl">
                  Since shared notifications are enabled, {user.partnerName || 'your partner'} receives gentle support reminders such as:
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                  <div className="p-4 bg-white/5 border border-white/10 rounded-xl text-xs text-stone-200 leading-relaxed">
                    “She is in postpartum recovery. Support her rest routines and protect quiet recovery hours.”
                  </div>
                  <div className="p-4 bg-white/5 border border-white/10 rounded-xl text-xs text-stone-200 leading-relaxed">
                    “Offer to handle household tasks or caregiving so she can take an uninterrupted nap.”
                  </div>
                  <div className="p-4 bg-white/5 border border-white/10 rounded-xl text-xs text-stone-200 leading-relaxed">
                     “Check in on her emotional wellbeing today and listen with patience.”
                  </div>
                  <div className="p-4 bg-white/5 border border-white/10 rounded-xl text-xs text-stone-200 leading-relaxed">
                     “Support her hydration and prepare a warm, nourishing meal.”
                  </div>
                </div>
             </div>
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
    const flowToday = loggedToday ? "Light" : (user.periodDates?.includes(today.toDateString()) ? "Active" : "None");
    const moodToday = user.todaySymptomLog?.mood || (loggedToday ? "Calm" : selectedMood || "Good");
    const energyToday = loggedToday ? "Restful" : (currentPhase === 'Follicular' || currentPhase === 'Ovulatory' ? "High" : "Gentle");
    const sleepToday = "7h 30m";

    // Personalized Wellness Recommendation tailored to cycle phase and health mode
    const getWellnessRecommendation = () => {
      if (user.isPregnancyMode) {
        return "Nurture your body gently today, mama. Prioritize restful hydration, wholesome nourishment, and gentle stretching for pelvic comfort.";
      }
      if (user.isPostpartumMode) {
        return "Honor your restorative postpartum sanctuary. Deep cellular rest, warm broths, and boundary protection support your healing.";
      }
      if (isLatePeriodMode) {
        return `Your cycle is on day ${cycleDay} (${daysLate} days past expected date). Travel, hormonal shifts, and stress can naturally vary cycle timing. Keep resting and nourishing your body.`;
      }
      switch (currentPhase) {
        case 'Menstrual':
          return "Your uterine lining is renewing. Honor this natural sunset phase with warm herbal tea, iron-rich nourishment, a cozy heating pad, and restorative sleep.";
        case 'Follicular':
          if (cycleSync.isPrecedingFertileDay) {
            return "Estrogen is climbing and your fertile window is open. High cognitive stamina and creativity are peaking—an excellent time for collaborative projects.";
          }
          return "Estrogen is gently rising. Fresh vitality and physical stamina are expanding—ideal for creative goals, workouts, and initiating new routines.";
        case 'Ovulatory':
          return "Peak biological radiance! Your social glow and energy are elevated on your estimated ovulation day. Remember to maintain deep cellular hydration.";
        case 'Luteal':
        default:
          return daysUntilNext && daysUntilNext <= 3
            ? "Your luteal phase is approaching its end. Progesterone is winding down—prioritise magnesium-rich nourishment, warm baths, and extra sleep."
            : "Progesterone is steady. Your intuition and nesting instincts are heightened. Protect your peaceful routines and opt for cozy, grounding activities.";
      }
    };

    // Circular progress math
    const cycleProgress = isLatePeriodMode 
      ? 100 
      : Math.min(100, Math.max(0, (cycleDay / cycleLen) * 100));

    // Phase color definitions matching the design requirements
    const phaseStrokeColor = isLatePeriodMode
      ? '#f59e0b'
      : currentPhase === 'Menstrual'
        ? '#f43f5e' // Pink
        : currentPhase === 'Follicular'
          ? '#10b981' // Soft green
          : currentPhase === 'Ovulatory'
            ? '#f59e0b' // Golden yellow
            : '#a855f7'; // Lavender

    const renderCompanionCard = () => (
      <section className="bg-white dark:bg-[#1a1816] p-6 rounded-2xl border border-stone-200/80 dark:border-[#2e2a26] shadow-sm flex flex-col justify-between h-full">
        <div className="flex flex-col items-center text-center space-y-4">
          <div className="w-full flex items-center justify-between text-xs">
            <span className="font-semibold text-pink-700 dark:text-pink-400">Wellness Companion</span>
            <span className="text-stone-500 dark:text-stone-400 tabular-nums font-medium">
              Lvl {avatarProgression.level} · {avatarProgression.relationshipStage}
            </span>
          </div>

          <button
            type="button"
            onClick={handleAvatarTap}
            className="relative cursor-pointer group shrink-0 pt-1"
            title={`Talk with ${currentAvatar.name || 'Amara'} in Companion Chat`}
          >
            <div className="w-28 h-28 rounded-full bg-pink-50/80 dark:bg-pink-950/30 border border-pink-100 dark:border-pink-900/40 flex items-end justify-center relative overflow-visible">
              <div className="relative -top-2 z-10 overflow-visible transition-transform duration-200 group-hover:scale-105">
                <AvatarVisual 
                  avatar={{
                    ...currentAvatar,
                    mood: avatarMood.mood
                  }} 
                  size="md" 
                  level={avatarProgression.level}
                  showTierBadge={false}
                  showMoodBadge={false}
                  isSpeaking={isCompanionSpeaking}
                  isWaving={isCompanionWaving}
                  interactive={false}
                  animated={true}
                  className="overflow-visible"
                />
              </div>
            </div>
          </button>

          <div className="space-y-0.5">
            <h3 className="font-serif text-lg text-stone-900 dark:text-stone-100">{currentAvatar.name || 'Amara'}</h3>
            <p className="text-xs text-stone-500 dark:text-stone-400">{avatarMood.label}</p>
          </div>

          <button
            type="button"
            onClick={handleAvatarTap}
            className="w-full text-left bg-stone-50 dark:bg-[#23201d] hover:bg-pink-50/50 dark:hover:bg-stone-800 px-4 py-3 rounded-xl border border-stone-200/70 dark:border-[#2e2a26] cursor-pointer transition-colors"
            title={`Tap to chat with ${currentAvatar.name || 'Amara'}`}
          >
            <p className="text-xs sm:text-sm font-serif text-stone-800 dark:text-stone-200 leading-snug">
              {companionReaction ? `"${companionReaction.message}"` : `"${companionPrompts[promptIndex] || companionPrompts[0]}"`}
            </p>
            <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-1">
              {avatarSpeech.cycleStatusText}
            </p>
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2 pt-4 mt-4 border-t border-stone-100 dark:border-[#2e2a26]">
          <button
            type="button"
            onClick={handleOpenCompanionChat}
            className="h-9 rounded-xl bg-pink-600 hover:bg-pink-700 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
          >
            <MessageCircle className="w-3.5 h-3.5" />
            <span>Open Chat</span>
          </button>
          <button
            type="button"
            onClick={() => setIsAvatarModalOpen(true)}
            className="h-9 rounded-xl bg-stone-50 dark:bg-[#23201d] hover:bg-stone-100 dark:hover:bg-stone-800 border border-stone-200/80 dark:border-[#2e2a26] text-stone-700 dark:text-stone-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
          >
            <Palette className="w-3.5 h-3.5" />
            <span>Studio</span>
          </button>
        </div>
      </section>
    );

    return (
      <div className="space-y-6 pb-8 text-stone-800 dark:text-stone-200">
        {/* Dynamic Gift / Comfort Alerts from Partner */}
        {receivedGifts.length > 0 && (
          <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-hide">
            {receivedGifts.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).map((gift) => (
              <div 
                key={gift.id}
                className="shrink-0 bg-white dark:bg-[#1a1816] px-4 py-2.5 rounded-xl shadow-xs border border-stone-200/80 dark:border-[#2e2a26] flex items-center gap-3"
              >
                <div className="w-8 h-8 bg-pink-50 dark:bg-pink-950/40 text-pink-600 dark:text-pink-400 rounded-lg flex items-center justify-center shrink-0">
                  <Heart className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-stone-800 dark:text-stone-200">{gift.senderName} sent a {gift.type}</p>
                  <p className="text-[11px] text-stone-500 dark:text-stone-400">Partner Comfort Gift</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Expected Period Check-In Card (when late) */}
        {setUser && (
          <ExpectedPeriodCheckInCard 
            user={user} 
            setUser={(val) => setUser(val)} 
            onOpenLogModal={onOpenLogModal}
          />
        )}

        {/* HERO BENTO ROW: PRIMARY CYCLE OVERVIEW (8 COLS) + COMPANION SANCTUARY (4 COLS) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          <section className="lg:col-span-8 bg-white dark:bg-[#1a1816] p-6 sm:p-7 rounded-2xl border border-stone-200/80 dark:border-[#2e2a26] shadow-sm flex flex-col justify-between space-y-6">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100 dark:border-[#2e2a26]">
              <div>
                <span className="text-xs font-semibold text-pink-700 dark:text-pink-400 block">
                  Primary Tracker
                </span>
                <h2 className="text-xl sm:text-2xl font-serif text-stone-900 dark:text-stone-100 font-normal">
                  Cycle Overview
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab('cycle')}
                className="text-xs font-semibold text-pink-700 dark:text-pink-300 hover:bg-pink-100/70 bg-pink-50 dark:bg-pink-950/30 border border-pink-100 dark:border-pink-900/40 px-3.5 py-2 rounded-xl transition-colors cursor-pointer flex items-center gap-1"
              >
                <span>View Calendar</span>
                <ChevronRight size={14} />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
              {/* Circular Cycle Progress Indicator */}
              <div className="md:col-span-5 flex flex-col items-center justify-center">
                <div className="relative w-44 h-44 sm:w-48 sm:h-48 flex items-center justify-center">
                  <svg viewBox="0 0 192 192" className="w-full h-full -rotate-90 transform">
                    <circle 
                      cx="96" 
                      cy="96" 
                      r="80" 
                      fill="none" 
                      stroke="currentColor"
                      className="text-stone-100 dark:text-[#23201d]"
                      strokeWidth="10" 
                    />
                    <circle
                      cx="96" 
                      cy="96" 
                      r="80" 
                      fill="none" 
                      stroke={phaseStrokeColor} 
                      strokeWidth="10"
                      strokeDasharray={2 * Math.PI * 80}
                      strokeDashoffset={2 * Math.PI * 80 * (1 - cycleProgress / 100)}
                      strokeLinecap="round"
                      className="transition-all duration-700 ease-out"
                    />
                  </svg>

                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-4">
                    <div className="mb-1 text-pink-600 dark:text-pink-400">
                      {isLatePeriodMode ? (
                        <Clock className="w-5 h-5" />
                      ) : currentPhase === 'Menstrual' ? (
                        <Droplet className="w-5 h-5" />
                      ) : currentPhase === 'Follicular' ? (
                        <Flower2 className="w-5 h-5 text-emerald-600" />
                      ) : currentPhase === 'Ovulatory' ? (
                        <Sparkles className="w-5 h-5 text-amber-500" />
                      ) : (
                        <Moon className="w-5 h-5 text-purple-600" />
                      )}
                    </div>
                    <span className="text-2xl sm:text-3xl font-serif font-normal text-stone-900 dark:text-stone-100 leading-tight tabular-nums">
                      {isLatePeriodMode ? `${daysLate}d Late` : `Day ${cycleDay}`}
                    </span>
                    <span className="text-xs font-medium text-stone-500 dark:text-stone-400 mt-0.5 tabular-nums">
                      of {cycleLen}-day cycle
                    </span>
                  </div>
                </div>
              </div>

              {/* Structured Predictions & Phase Details */}
              <div className="md:col-span-7 space-y-3.5">
                <div className="flex items-center justify-between p-3.5 rounded-xl bg-stone-50/80 dark:bg-[#23201d] border border-stone-200/70 dark:border-[#2e2a26]">
                  <div className="space-y-0.5">
                    <span className="text-[11px] font-medium text-stone-500 dark:text-stone-400 block">Current Phase</span>
                    <span className="text-sm font-semibold text-stone-900 dark:text-stone-100">{currentPhase} Phase</span>
                  </div>
                  <span className={`px-2.5 py-1 rounded-lg text-xs font-semibold border ${
                    currentPhase === 'Menstrual' ? 'bg-pink-50 text-pink-700 border-pink-200 dark:bg-pink-950/40 dark:text-pink-300 dark:border-pink-900/40' :
                    currentPhase === 'Follicular' ? 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900/40' :
                    currentPhase === 'Ovulatory' ? 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900/40' :
                    'bg-purple-50 text-purple-800 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-900/40'
                  }`}>
                    {currentPhase}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2.5 text-xs">
                  <div className="p-3 rounded-xl bg-stone-50/70 dark:bg-[#23201d] border border-stone-200/70 dark:border-[#2e2a26] space-y-0.5">
                    <span className="text-[11px] font-medium text-stone-500 dark:text-stone-400 block">Average Cycle</span>
                    <span className="text-sm font-semibold text-stone-900 dark:text-stone-100 tabular-nums">{cycleLen} Days</span>
                  </div>
                  <div className="p-3 rounded-xl bg-pink-50/50 dark:bg-pink-950/20 border border-pink-200/60 dark:border-pink-900/30 space-y-0.5">
                    <span className="text-[11px] font-medium text-pink-700 dark:text-pink-400 block">Next Expected Period</span>
                    <span className="text-sm font-semibold text-stone-900 dark:text-stone-100 tabular-nums">{cycleSync.nextExpectedPeriodFormatted}</span>
                  </div>
                  <div className="p-3 rounded-xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/30 space-y-0.5">
                    <span className="text-[11px] font-medium text-amber-700 dark:text-amber-400 block">Estimated Ovulation</span>
                    <span className="text-sm font-semibold text-stone-900 dark:text-stone-100 tabular-nums">{cycleSync.estimatedOvulationDateFormatted}</span>
                  </div>
                  <div className="p-3 rounded-xl bg-sky-50/50 dark:bg-sky-950/20 border border-sky-200/60 dark:border-sky-900/30 space-y-0.5">
                    <span className="text-[11px] font-medium text-sky-700 dark:text-sky-400 block">Fertile Window</span>
                    <span className="text-sm font-semibold text-stone-900 dark:text-stone-100 truncate block tabular-nums">{cycleSync.estimatedFertileRangeFormatted || 'Pending history'}</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setActiveTab('cycle')}
                  className="w-full h-10 px-4 rounded-xl text-center text-xs font-semibold text-pink-700 dark:text-pink-300 bg-pink-50/70 dark:bg-pink-950/30 hover:bg-pink-100/80 transition-colors border border-pink-200/60 dark:border-pink-900/40 cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <span>Open Full Cycle Calendar</span>
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          </section>

          <div className="lg:col-span-4">
            {renderCompanionCard()}
          </div>
        </div>

        {/* SECTION 4: QUICK ACTIONS (COMPACT 4-ITEM GRID) */}
        <section className="space-y-2.5">
          <h3 className="text-xs font-semibold text-stone-500 dark:text-stone-400 px-1">
            Quick Actions
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { id: 'symptoms', label: 'Log Symptoms', icon: <Activity className="w-4 h-4 text-rose-600 dark:text-rose-400" />, action: onOpenLogModal },
              { id: 'mood', label: 'Mood Check-in', icon: <Smile className="w-4 h-4 text-amber-600 dark:text-amber-400" />, action: onOpenLogModal },
              { id: 'calendar', label: 'Cycle Calendar', icon: <Calendar className="w-4 h-4 text-pink-600 dark:text-pink-400" />, action: () => setActiveTab('cycle') },
              { id: 'insights', label: 'Wellness Insights', icon: <BarChart3 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />, action: () => setActiveTab('wellness') }
            ].map((act) => (
              <button
                key={act.id}
                type="button"
                onClick={act.action}
                className="bg-white dark:bg-[#1a1816] hover:bg-stone-50 dark:hover:bg-[#23201d] p-4 rounded-2xl border border-stone-200/80 dark:border-[#2e2a26] shadow-xs transition-colors flex items-center gap-3 cursor-pointer text-left"
              >
                <div className="w-10 h-10 rounded-xl bg-stone-50 dark:bg-[#23201d] border border-stone-200/70 dark:border-[#2e2a26] flex items-center justify-center shrink-0">
                  {act.icon}
                </div>
                <span className="text-xs sm:text-sm font-semibold text-stone-800 dark:text-stone-200">
                  {act.label}
                </span>
              </button>
            ))}
          </div>
        </section>

        {/* TWO-COLUMN LAYOUT: TODAY'S SUMMARY & HYDRATION TRACKER */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-stretch">
          <section className="bg-white dark:bg-[#1a1816] p-6 rounded-2xl border border-stone-200/80 dark:border-[#2e2a26] shadow-sm space-y-4">
            <div className="flex justify-between items-center pb-2.5 border-b border-stone-100 dark:border-[#2e2a26]">
              <h3 className="font-serif text-lg text-stone-900 dark:text-stone-100">
                Today&apos;s Health Summary
              </h3>
              <button 
                type="button"
                onClick={onOpenLogModal}
                className="text-xs font-semibold text-pink-700 dark:text-pink-400 hover:underline cursor-pointer"
              >
                Update Logs
              </button>
            </div>

            <div className="divide-y divide-stone-100 dark:divide-[#2e2a26]">
              {[
                { label: 'Menstrual Flow', value: flowToday, icon: <Droplet className="w-4 h-4 text-rose-500" /> },
                { label: 'Mood', value: moodToday, icon: <Smile className="w-4 h-4 text-amber-500" /> },
                { label: 'Energy', value: energyToday, icon: <Zap className="w-4 h-4 text-emerald-600" /> },
                { label: 'Sleep', value: sleepToday, icon: <Moon className="w-4 h-4 text-indigo-500" /> },
                { label: 'Water Intake', value: `${waterIntake} of ${waterGoal || 8} glasses`, icon: <Droplet className="w-4 h-4 text-sky-500" /> }
              ].map((item, index) => (
                <div 
                  key={index} 
                  onClick={onOpenLogModal}
                  className="py-2.5 flex items-center justify-between text-xs cursor-pointer hover:bg-stone-50 dark:hover:bg-[#23201d] px-2 rounded-xl transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    {item.icon}
                    <span className="font-medium text-stone-600 dark:text-stone-300 text-xs">{item.label}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold text-stone-900 dark:text-stone-100 tabular-nums">{item.value}</span>
                    <ChevronRight size={13} className="text-stone-400" />
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="bg-white dark:bg-[#1a1816] p-6 rounded-2xl border border-stone-200/80 dark:border-[#2e2a26] shadow-sm flex flex-col justify-between space-y-4">
            <div className="flex justify-between items-center pb-2.5 border-b border-stone-100 dark:border-[#2e2a26]">
              <div>
                <h3 className="font-serif text-lg text-stone-900 dark:text-stone-100">
                  Hydration Tracker
                </h3>
                <p className="text-xs text-stone-500 dark:text-stone-400 tabular-nums">Daily goal: {waterGoal || 8} glasses ({((waterGoal || 8) * 250)}ml)</p>
              </div>
              <span className="text-xs font-semibold text-sky-700 dark:text-sky-300 bg-sky-50 dark:bg-sky-950/40 px-2.5 py-1 rounded-lg border border-sky-200/70 dark:border-sky-900/40 tabular-nums">
                {Math.round((waterIntake / (waterGoal || 8)) * 100)}% Goal
              </span>
            </div>

            <div className="grid grid-cols-8 gap-1.5 py-1">
              {Array.from({ length: 8 }).map((_, idx) => {
                const isFilled = idx < waterIntake;
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setWaterIntake(idx + 1)}
                    className={`h-11 rounded-xl border transition-colors relative flex items-end justify-center overflow-hidden cursor-pointer ${
                      isFilled
                        ? 'border-sky-400 bg-sky-50 dark:bg-sky-950/30 text-sky-700 dark:text-sky-200'
                        : 'border-stone-200 dark:border-[#2e2a26] bg-stone-50/70 dark:bg-[#23201d] hover:border-sky-300 text-stone-500'
                    }`}
                    title={`Glass ${idx + 1}`}
                  >
                    {isFilled && (
                      <div className="absolute inset-x-0 bottom-0 top-[22%] bg-sky-400/80 rounded-b-lg" />
                    )}
                    <span className="text-[11px] font-semibold pb-1 z-10 select-none tabular-nums">
                      {idx + 1}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="flex items-center justify-between pt-1">
              <div className="text-left">
                <p className="text-[11px] font-medium text-stone-500 dark:text-stone-400">Consumed</p>
                <p className="text-sm font-semibold text-stone-900 dark:text-stone-100 tabular-nums">{waterIntake} of {waterGoal || 8} glasses</p>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setWaterIntake(Math.max(0, waterIntake - 1))}
                  className="w-9 h-9 rounded-xl bg-stone-50 dark:bg-[#23201d] border border-stone-200 dark:border-[#2e2a26] hover:bg-stone-100 text-stone-700 dark:text-stone-200 flex items-center justify-center font-semibold text-sm active:scale-95 transition-all cursor-pointer"
                  title="Remove 1 glass"
                  aria-label="Remove 1 glass of water"
                >
                  −
                </button>
                <button
                  type="button"
                  onClick={() => setWaterIntake(Math.min(waterGoal || 8, waterIntake + 1))}
                  className="w-9 h-9 rounded-xl bg-pink-600 hover:bg-pink-700 text-white flex items-center justify-center font-semibold text-sm active:scale-95 transition-all cursor-pointer"
                  title="Add 1 glass"
                  aria-label="Add 1 glass of water"
                >
                  +
                </button>
              </div>
            </div>
          </section>
        </div>

        {/* SECTION 7: PERSONALISED WELLNESS GUIDANCE */}
        <section className="bg-white dark:bg-[#1a1816] p-5 sm:p-6 rounded-2xl border border-stone-200/80 dark:border-[#2e2a26] shadow-sm flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-pink-50 dark:bg-pink-950/40 text-pink-600 dark:text-pink-400 border border-pink-100 dark:border-pink-900/40 flex items-center justify-center shrink-0 mt-0.5">
            <Flower2 className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <span className="text-xs font-semibold text-pink-700 dark:text-pink-400 block">
              Personalised Wellness Guidance
            </span>
            <p className="text-sm text-stone-700 dark:text-stone-300 leading-relaxed">
              “{getWellnessRecommendation()}”
            </p>
          </div>
        </section>
      </div>
    );
  };

  return (
    <div className="space-y-6 pb-8">
      {/* Contextual Greeting Strip */}
      <div className="flex flex-wrap items-end justify-between gap-3 pb-1">
        <div>
          <p className="text-xs font-medium text-stone-500 dark:text-stone-400">
            {today.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
          <h1 className="text-2xl sm:text-3xl font-serif text-stone-900 dark:text-stone-100 font-normal tracking-tight">
            {getGreeting()}, {user.firstName || user.name || 'Friend'}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsWallpapersOpen(true)}
            className="h-9 px-3 rounded-xl bg-white dark:bg-[#1a1816] border border-stone-200/80 dark:border-[#2e2a26] hover:bg-stone-50 text-stone-700 dark:text-stone-300 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Palette className="w-3.5 h-3.5 text-pink-600 dark:text-pink-400" />
            <span>Themes</span>
          </button>
          <button
            type="button"
            onClick={handleOpenCompanionChat}
            className="h-9 px-3.5 rounded-xl bg-white dark:bg-[#1a1816] border border-stone-200/80 dark:border-[#2e2a26] hover:bg-stone-50 text-stone-800 dark:text-stone-200 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <MessageCircle className="w-3.5 h-3.5 text-pink-600 dark:text-pink-400" />
            <span>Ask {currentAvatar.name || 'Amara'}</span>
          </button>
        </div>
      </div>

      {/* Compact Companion Card above Pregnancy/Postpartum views */}
      {(user.isPregnancyMode || user.isPostpartumMode) && (
        <section className="bg-white dark:bg-[#1a1816] p-5 rounded-2xl border border-stone-200/80 dark:border-[#2e2a26] shadow-sm flex flex-col sm:flex-row items-center gap-4">
          <button
            type="button"
            onClick={handleAvatarTap}
            className="w-16 h-16 rounded-full bg-pink-50 dark:bg-pink-950/30 border border-pink-100 dark:border-pink-900/40 flex items-end justify-center shrink-0 overflow-visible cursor-pointer"
            title={`Talk with ${currentAvatar.name || 'Amara'}`}
          >
            <AvatarVisual 
              avatar={{ ...currentAvatar, mood: avatarMood.mood }} 
              size="sm" 
              level={avatarProgression.level}
              showTierBadge={false}
              showMoodBadge={false}
              isSpeaking={isCompanionSpeaking}
              isWaving={isCompanionWaving}
              interactive={false}
              animated={true}
            />
          </button>
          <div className="flex-1 min-w-0 text-center sm:text-left">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
              <span className="text-sm font-semibold text-stone-900 dark:text-stone-100">{currentAvatar.name || 'Amara'}</span>
              <span className="text-xs text-stone-500 dark:text-stone-400 tabular-nums">Lvl {avatarProgression.level} · {avatarMood.label}</span>
            </div>
            <p className="text-sm font-serif text-stone-700 dark:text-stone-300 mt-1">
              {companionReaction ? `"${companionReaction.message}"` : `"${companionPrompts[promptIndex] || companionPrompts[0]}"`}
            </p>
          </div>
          <button
            type="button"
            onClick={handleOpenCompanionChat}
            className="h-9 px-4 rounded-xl bg-pink-600 hover:bg-pink-700 text-white text-xs font-semibold shrink-0 transition-colors cursor-pointer"
          >
            Open Chat
          </button>
        </section>
      )}

      {/* Slide-out side menu (Hamburger drawer) */}
      {isMenuOpen && (
        <>
          <div className="fixed inset-0 bg-stone-950/45 backdrop-blur-xs z-[150] transition-opacity" onClick={() => setIsMenuOpen(false)} />
          <div className="fixed inset-y-0 left-0 top-0 bottom-0 h-[100dvh] max-h-[100dvh] max-w-xs w-full bg-[#faf8f6] dark:bg-[#1a1816] shadow-2xl z-[160] flex flex-col border-r border-stone-200/80 dark:border-[#2e2a26] animate-slideRight text-left overflow-hidden">
            {/* Title Header with Close */}
            <div className="shrink-0 bg-[#faf8f6] dark:bg-[#1a1816] px-5 py-4 border-b border-stone-200/80 dark:border-[#2e2a26] flex items-center justify-between z-20">
              <div className="flex items-center gap-2">
                <Flower2 className="w-5 h-5 text-pink-600 dark:text-pink-400" />
                <span className="font-serif text-xl text-stone-900 dark:text-stone-100">Lumina Menu</span>
              </div>
              <button 
                type="button"
                onClick={() => setIsMenuOpen(false)}
                className="w-8 h-8 rounded-xl bg-white dark:bg-[#23201d] border border-stone-200 dark:border-[#2e2a26] text-stone-600 dark:text-stone-300 hover:bg-stone-100 flex items-center justify-center transition-colors cursor-pointer"
                title="Close Menu"
                aria-label="Close Menu"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable Content List */}
            <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-5 py-4 space-y-3.5 lumina-menu-scroll overscroll-contain touch-pan-y">
              <div className="bg-white dark:bg-[#23201d] p-4 rounded-2xl border border-stone-200/80 dark:border-[#2e2a26] space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-pink-700 dark:text-pink-400">Wellness Companion</p>
                  <span className="text-xs font-medium text-stone-500 dark:text-stone-400 tabular-nums">
                    Lvl {avatarProgression.level}
                  </span>
                </div>
                <div className="flex gap-2">
                  <button 
                    type="button"
                    onClick={() => {
                      handleOpenCompanionChat();
                      setIsMenuOpen(false);
                    }}
                    className="flex-1 h-10 px-3 bg-pink-600 hover:bg-pink-700 text-white rounded-xl text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <AvatarVisual avatar={{ ...currentAvatar, mood: avatarMood.mood }} size="xs" />
                    <span className="truncate">Chat with {currentAvatar.name || 'Amara'}</span>
                  </button>
                  <button 
                    type="button"
                    onClick={() => {
                      setIsAvatarModalOpen(true);
                      setIsMenuOpen(false);
                    }}
                    className="h-10 px-3 bg-stone-50 dark:bg-[#1a1816] hover:bg-stone-100 border border-stone-200 dark:border-[#2e2a26] rounded-xl text-xs font-semibold text-stone-700 dark:text-stone-200 transition-colors flex items-center justify-center cursor-pointer"
                    title="Studio & Customization"
                  >
                    <span>Studio</span>
                  </button>
                </div>
              </div>

              <div className="bg-white dark:bg-[#23201d] rounded-2xl border border-stone-200/80 dark:border-[#2e2a26] divide-y divide-stone-100 dark:divide-[#2e2a26] overflow-hidden">
                <button 
                  type="button"
                  onClick={() => {
                    onTabChange?.('edu');
                    setIsMenuOpen(false);
                  }}
                  className="w-full px-4 py-3.5 hover:bg-stone-50 dark:hover:bg-stone-800 text-sm font-medium text-stone-800 dark:text-stone-200 transition-colors flex items-center justify-between cursor-pointer"
                >
                  <span className="flex items-center gap-2.5">
                    <BookOpen className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    <span>Learn &amp; Guides Hub</span>
                  </span>
                  <ChevronRight className="w-4 h-4 text-stone-400" />
                </button>

                <button 
                  type="button"
                  onClick={() => {
                    onTabChange?.('diary');
                    setIsMenuOpen(false);
                  }}
                  className="w-full px-4 py-3.5 hover:bg-stone-50 dark:hover:bg-stone-800 text-sm font-medium text-stone-800 dark:text-stone-200 transition-colors flex items-center justify-between cursor-pointer"
                >
                  <span className="flex items-center gap-2.5">
                    <Heart className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                    <span>Personal Diary</span>
                  </span>
                  <ChevronRight className="w-4 h-4 text-stone-400" />
                </button>

                <button 
                  type="button"
                  onClick={() => {
                    onTabChange?.('music');
                    setIsMenuOpen(false);
                  }}
                  className="w-full px-4 py-3.5 hover:bg-stone-50 dark:hover:bg-stone-800 text-sm font-medium text-stone-800 dark:text-stone-200 transition-colors flex items-center justify-between cursor-pointer"
                >
                  <span className="flex items-center gap-2.5">
                    <Music className="w-4 h-4 text-pink-600 dark:text-pink-400" />
                    <span>Music Sanctuary</span>
                  </span>
                  <ChevronRight className="w-4 h-4 text-stone-400" />
                </button>

                <button 
                  type="button"
                  onClick={() => {
                    setIsWallpapersOpen(true);
                    setIsMenuOpen(false);
                  }}
                  className="w-full px-4 py-3.5 hover:bg-stone-50 dark:hover:bg-stone-800 text-sm font-medium text-stone-800 dark:text-stone-200 transition-colors flex items-center justify-between cursor-pointer"
                >
                  <span className="flex items-center gap-2.5">
                    <Palette className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                    <span>Wallpapers &amp; Themes</span>
                  </span>
                  <ChevronRight className="w-4 h-4 text-stone-400" />
                </button>
              </div>

              <div className="bg-white dark:bg-[#23201d] p-4 rounded-2xl border border-stone-200/80 dark:border-[#2e2a26] space-y-2.5">
                <p className="text-xs font-semibold text-stone-500 dark:text-stone-400">Sanctuary Mode</p>
                <button 
                  type="button"
                  onClick={() => {
                    if (togglePregnancy) togglePregnancy();
                    setIsMenuOpen(false);
                  }}
                  className={`w-full h-10 px-4 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                    user.isPregnancyMode 
                      ? 'bg-indigo-600 text-white' 
                      : 'bg-pink-50 dark:bg-pink-950/30 text-pink-700 dark:text-pink-300 border border-pink-200/70 dark:border-pink-900/40 hover:bg-pink-100/70'
                  }`}
                >
                  {user.isPregnancyMode ? 'Pregnancy Mode: Active' : 'Switch to Pregnancy Mode'}
                </button>
                {user.isPostpartumMode && (
                  <div className="w-full py-2 px-3 rounded-xl bg-indigo-50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-300 text-xs font-semibold text-center">
                    Postpartum Recovery Active
                  </div>
                )}
              </div>
            </div>

            <div className="shrink-0 px-5 py-3.5 border-t border-stone-200/80 dark:border-[#2e2a26] bg-[#faf8f6] dark:bg-[#1a1816] pb-[max(1.25rem,env(safe-area-inset-bottom))]">
              <button 
                type="button"
                onClick={() => {
                  if (handleLogout) handleLogout();
                  setIsMenuOpen(false);
                }}
                className="w-full h-10 rounded-xl bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300 hover:bg-rose-100 transition-colors font-semibold text-xs flex items-center justify-center gap-2 cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </>
      )}

      {/* Slide-out notifications pane (Right drawer) */}
      {isNotificationsOpen && (
        <>
          <div className="fixed inset-0 bg-stone-950/45 backdrop-blur-xs z-[150] transition-opacity" onClick={() => setIsNotificationsOpen(false)} />
          <div className="fixed inset-y-0 right-0 max-w-xs w-full bg-[#faf8f6] dark:bg-[#1a1816] shadow-2xl z-[160] p-5 flex flex-col border-l border-stone-200/80 dark:border-[#2e2a26] animate-slideLeft">
            <div className="flex items-center justify-between border-b border-stone-200/80 dark:border-[#2e2a26] pb-4 mb-5">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-pink-600 dark:text-pink-400" />
                <span className="font-serif text-xl text-stone-900 dark:text-stone-100">Notifications</span>
              </div>
              <button 
                type="button"
                onClick={() => setIsNotificationsOpen(false)}
                className="w-8 h-8 rounded-xl bg-white dark:bg-[#23201d] border border-stone-200 dark:border-[#2e2a26] text-stone-600 dark:text-stone-300 hover:bg-stone-100 flex items-center justify-center transition-colors cursor-pointer"
                aria-label="Close Notifications"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 scrollbar-hide">
              {user.notifications && user.notifications.length > 0 && (
                <div className="space-y-2">
                  <div className="flex justify-between items-center px-1">
                    <p className="text-xs font-semibold text-stone-500 dark:text-stone-400">System Alerts</p>
                    <button 
                      type="button"
                      onClick={async () => {
                        const updatedUser = {
                          ...user,
                          notifications: (user.notifications || []).map(n => ({ ...n, isRead: true }))
                        };
                        setUser(updatedUser);
                        await syncUser(updatedUser);
                      }}
                      className="text-xs font-medium text-pink-700 dark:text-pink-400 hover:underline cursor-pointer"
                    >
                      Mark all read
                    </button>
                  </div>
                  <div className="space-y-2 max-h-[240px] overflow-y-auto pr-1 scrollbar-thin">
                    {user.notifications.map(notif => (
                      <div 
                        key={notif.id} 
                        onClick={async () => {
                          if (!notif.isRead) {
                            const updatedUser = {
                              ...user,
                              notifications: (user.notifications || []).map(n => n.id === notif.id ? { ...n, isRead: true } : n)
                            };
                            setUser(updatedUser);
                            await syncUser(updatedUser);
                          }
                          if (onOpenNotificationCenter) {
                            onOpenNotificationCenter(notif);
                            setIsNotificationsOpen(false);
                          }
                        }}
                        className={`p-3 rounded-xl border transition-colors flex flex-col gap-1 cursor-pointer ${
                          notif.isRead 
                            ? 'bg-white/60 dark:bg-[#23201d]/60 border-stone-200/50 dark:border-[#2e2a26] opacity-75 hover:opacity-100' 
                            : 'bg-white dark:bg-[#23201d] border-pink-200/80 dark:border-pink-900/40 shadow-xs'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-xs font-semibold text-stone-900 dark:text-stone-100 truncate">{notif.title}</p>
                          {!notif.isRead && (
                            <span className="w-2 h-2 bg-pink-600 rounded-full shrink-0" />
                          )}
                        </div>
                        <p className="text-xs text-stone-600 dark:text-stone-400 leading-normal break-words">{notif.body}</p>
                        <p className="text-[11px] text-stone-400 self-end tabular-nums">
                          {new Date(notif.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {isPendingRequest && activePendingRequest && (
                <div className="bg-indigo-50/80 dark:bg-indigo-950/30 p-4 rounded-xl border border-indigo-200/70 dark:border-indigo-900/40 space-y-3">
                  <div className="flex gap-2.5 items-start">
                    <HeartHandshake className="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-semibold text-indigo-700 dark:text-indigo-300">Companion Link Request</p>
                      <p className="text-xs text-stone-800 dark:text-stone-200 mt-0.5">{partnerUser?.name || user.partnerName || activePendingRequest.partnerName || 'A partner'} requested to link accounts.</p>
                    </div>
                  </div>
                  <button 
                    type="button"
                    onClick={() => {
                      setIsNotificationsOpen(false);
                      window.scrollTo({ top: 400, behavior: 'smooth' });
                    }}
                    className="w-full h-9 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                  >
                    Review Request
                  </button>
                </div>
              )}

              {receivedGifts.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-stone-500 dark:text-stone-400 px-1">Comfort Gifts</p>
                  {receivedGifts.slice(0, 3).map(gift => (
                    <div key={gift.id} className="bg-white dark:bg-[#23201d] p-3 rounded-xl border border-stone-200/80 dark:border-[#2e2a26] flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-pink-50 dark:bg-pink-950/40 text-pink-600 flex items-center justify-center shrink-0">
                        <Heart className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-stone-800 dark:text-stone-200">{gift.senderName} sent a {gift.type}</p>
                        <p className="text-[11px] text-stone-400 tabular-nums">{new Date(gift.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="space-y-2">
                <p className="text-xs font-semibold text-stone-500 dark:text-stone-400 px-1">Active Reminders</p>
                {reminders.filter(r => !r.isCompleted).length === 0 ? (
                  <div className="p-4 bg-white dark:bg-[#23201d] border border-dashed border-stone-200 dark:border-[#2e2a26] rounded-xl text-center">
                    <p className="text-xs text-stone-500 dark:text-stone-400">All routines are completed for today.</p>
                  </div>
                ) : (
                  reminders.filter(r => !r.isCompleted).map(rem => (
                    <div key={rem.id} className="bg-white dark:bg-[#23201d] p-3 rounded-xl border border-stone-200/80 dark:border-[#2e2a26] flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <Clock className="w-4 h-4 text-pink-600 shrink-0" />
                        <div>
                          <p className="text-xs font-semibold text-stone-800 dark:text-stone-200 leading-tight">{rem.title}</p>
                          <p className="text-[11px] text-stone-400 mt-0.5 tabular-nums">{rem.time}</p>
                        </div>
                      </div>
                      <button 
                        type="button"
                        onClick={() => {
                          if (setUser) {
                            setUser((prev: any) => {
                              if (!prev) return null;
                              const updated = (prev.reminders || []).map((r: any) => r.id === rem.id ? { ...r, isCompleted: true } : r);
                              return { ...prev, reminders: updated };
                            });
                          }
                        }}
                        className="px-2.5 py-1 rounded-lg bg-pink-50 dark:bg-pink-950/40 text-pink-700 dark:text-pink-300 hover:bg-pink-100 transition-colors text-xs font-semibold cursor-pointer"
                      >
                        Done
                      </button>
                    </div>
                  ))
                )}
              </div>

              <div className="bg-white dark:bg-[#23201d] p-4 rounded-xl border border-stone-200/80 dark:border-[#2e2a26] space-y-1.5">
                <p className="text-xs font-semibold text-pink-700 dark:text-pink-400">Cycle Rhythm Tip</p>
                <p className="text-xs text-stone-600 dark:text-stone-300 leading-relaxed">
                  Align demanding focus blocks with your follicular and ovulatory phases, and reserve luteal days for calmer pacing.
                </p>
              </div>
            </div>
          </div>
        </>
      )}

      {partnerNotice && (
        <div role="status" className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/40 text-emerald-800 dark:text-emerald-200 px-4 py-3 rounded-xl text-xs font-medium flex items-center justify-between gap-3">
          <span>{partnerNotice}</span>
          <button type="button" onClick={() => setPartnerNotice(null)} className="text-emerald-700 font-semibold cursor-pointer" aria-label="Dismiss">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Step 3 (Partner Connection Request) & Step 4 (Privacy Controls) */}
      {isPendingRequest && activePendingRequest && (
        <section className="bg-white dark:bg-[#1a1816] p-6 sm:p-8 rounded-2xl border border-indigo-200/80 dark:border-indigo-900/40 shadow-sm space-y-6">
          <div className="flex items-start gap-4">
            <div className="w-11 h-11 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
              <HeartHandshake className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <h3 className="text-2xl font-serif text-stone-900 dark:text-stone-100">Partner Connection Request</h3>
              <p className="text-sm text-stone-600 dark:text-stone-400">
                <span className="font-semibold text-indigo-600 dark:text-indigo-400">{partnerUser?.name || user.partnerName || activePendingRequest.partnerName || 'Your partner'}</span> requested to connect and receive the following updates:
              </p>
            </div>
          </div>

          <div className="bg-stone-50/70 dark:bg-[#23201d] p-5 rounded-xl border border-stone-200/70 dark:border-[#2e2a26]">
            <h4 className="text-xs font-semibold text-stone-500 dark:text-stone-400 mb-3">Requested Categories</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-stone-800 dark:text-stone-200">
              {(activePendingRequest.requestedReceives || activePendingRequest.requested_permissions || ['Period Updates', 'Fertility Updates', 'Wellness Support', 'Symptom Updates']).map((reqItem: string, i: number) => (
                <div key={i} className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-pink-600 shrink-0" />
                  <span>{reqItem}</span>
                </div>
              ))}
            </div>
          </div>

          {!isCustomizingSharing ? (
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={handleApproveAll}
                className="h-10 px-5 bg-indigo-600 text-white font-semibold rounded-xl text-xs hover:bg-indigo-700 transition-colors shadow-xs cursor-pointer"
              >
                Approve All
              </button>
              <button
                type="button"
                onClick={() => setIsCustomizingSharing(true)}
                className="h-10 px-5 bg-white dark:bg-[#23201d] text-indigo-700 dark:text-indigo-300 border border-indigo-200/80 dark:border-indigo-900/40 font-semibold rounded-xl text-xs hover:bg-indigo-50 dark:hover:bg-indigo-950/30 transition-colors cursor-pointer"
              >
                Customize Sharing
              </button>
              {!confirmDeclineRequest ? (
                <button
                  type="button"
                  onClick={() => setConfirmDeclineRequest(true)}
                  className="h-10 px-5 bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300 border border-rose-200/70 dark:border-rose-900/40 font-semibold rounded-xl text-xs hover:bg-rose-100 dark:hover:bg-rose-950/50 transition-colors cursor-pointer"
                >
                  Decline
                </button>
              ) : (
                <div className="flex items-center gap-2 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/40 px-3 py-2 rounded-xl">
                  <span className="text-xs font-semibold text-rose-700 dark:text-rose-300">Decline request?</span>
                  <button
                    type="button"
                    onClick={handleDeclineRequest}
                    className="px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                  >
                    Confirm
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDeclineRequest(false)}
                    className="px-3 py-1 bg-white dark:bg-[#23201d] text-stone-700 dark:text-stone-300 border border-stone-200 dark:border-[#342f2b] rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                  >
                    Keep
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-5 bg-[#faf8f6] dark:bg-[#23201d] p-5 sm:p-6 rounded-2xl border border-stone-200/80 dark:border-[#342f2b] mt-4">
              <div>
                <h4 className="text-lg font-serif text-stone-900 dark:text-stone-100">Step 4: Privacy Controls</h4>
                <p className="text-xs text-stone-600 dark:text-stone-400 mt-1 leading-relaxed">
                  Fine-tune exactly what information {partnerUser?.name || user.partnerName || activePendingRequest.partnerName || 'your partner'} can access. Turn off any sensitive category anytime.
                </p>
              </div>

              <div className="space-y-2.5">
                {[
                  { label: "Share Cycle Information", desc: "Status of period and calendar predictions", key: "shareCycleInfo" },
                  { label: "Share Symptoms", desc: "Symptom logs, physical discomfort levels", key: "shareSymptoms" },
                  { label: "Share Mood", desc: "Mood updates and emotional state logs", key: "shareMood" },
                  { label: "Share Fertility Information", desc: "Fertile windows, ovulation history", key: "shareFertilityInfo" },
                  { label: "Share Pregnancy Information", desc: "Pregnancy progression and due dates", key: "sharePregnancyInfo" },
                  { label: "Share Intimacy Logs", desc: "Intimacy tracking and contraceptive use", key: "shareIntimacyInfo" },
                  { label: "Share Appointment Reminders", desc: "Upcoming doctor appointments and timing", key: "shareAppointmentReminders" },
                  { label: "Share Wellness Updates", desc: "Wellness missions, self-care suggestions", key: "shareWellnessUpdates" }
                ].map((pref) => (
                  <div key={pref.key} className="flex items-start gap-3 p-3.5 bg-white dark:bg-[#1a1816] border border-stone-200/70 dark:border-[#2e2a26] hover:border-indigo-300/80 dark:hover:border-indigo-800/60 rounded-xl transition-colors">
                    <input
                      type="checkbox"
                      id={pref.key}
                      checked={sharingPrefs[pref.key as keyof typeof sharingPrefs]}
                      onChange={(e) => setSharingPrefs(prev => ({ ...prev, [pref.key]: e.target.checked }))}
                      className="w-4 h-4 rounded border-stone-300 dark:border-[#342f2b] accent-indigo-600 mt-0.5 cursor-pointer shrink-0"
                    />
                    <label htmlFor={pref.key} className="flex-1 cursor-pointer">
                      <p className="text-xs font-semibold text-stone-900 dark:text-stone-100">{pref.label}</p>
                      <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-0.5">{pref.desc}</p>
                    </label>
                  </div>
                ))}
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleSaveCustomSharing}
                  className="flex-1 h-11 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl text-xs shadow-xs transition-colors cursor-pointer"
                >
                  Save Preferences &amp; Connect
                </button>
                <button
                  type="button"
                  onClick={() => setIsCustomizingSharing(false)}
                  className="h-11 px-5 bg-white dark:bg-[#1a1816] text-stone-700 dark:text-stone-300 border border-stone-200 dark:border-[#2e2a26] font-semibold rounded-xl text-xs hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors cursor-pointer"
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
        <div className="fixed inset-0 bg-stone-950/75 backdrop-blur-sm z-[300] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#1a1816] rounded-2xl p-6 sm:p-8 max-w-md w-full space-y-5 shadow-2xl border border-stone-200 dark:border-[#2e2a26]">
            <div className="text-center space-y-2">
              <div className="w-12 h-12 rounded-xl bg-amber-50 dark:bg-amber-950/30 text-amber-600 flex items-center justify-center mx-auto">
                <Baby className="w-6 h-6" />
              </div>
              <h3 className="text-2xl font-serif text-stone-900 dark:text-stone-100">Congratulations!</h3>
              <p className="text-xs text-stone-500 dark:text-stone-400">Record the birth date to activate Postpartum Recovery Mode.</p>
            </div>

            <div className="space-y-4">
               <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-stone-700 dark:text-stone-300">Delivery / Birth Date</label>
                  <input
                    type="date"
                    value={deliveryDateInput}
                    onChange={(e) => setDeliveryDateInput(e.target.value)}
                    className="h-11 bg-stone-50 dark:bg-[#23201d] px-4 rounded-xl border border-stone-200 dark:border-[#2e2a26] text-stone-900 dark:text-stone-100 font-medium outline-none text-sm text-center"
                  />
               </div>
            </div>

            <div className="flex gap-3 pt-1">
               <button
                 type="button"
                 onClick={() => setIsDeliveredModalOpen(false)}
                 className="flex-1 h-11 bg-stone-100 dark:bg-[#23201d] text-stone-700 dark:text-stone-300 hover:bg-stone-200 font-medium text-xs rounded-xl transition-colors cursor-pointer"
               >
                 Cancel
               </button>
               <button
                 type="button"
                 onClick={handleMarkDelivered}
                 className="flex-1 h-11 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-xl transition-colors cursor-pointer"
               >
                 Activate Recovery Mode
               </button>
            </div>
          </div>
        </div>
      )}

      {/* Wallpapers & Themes Customization Modal */}
      {setUser && (
        <WallpapersAndThemesModal
          isOpen={isWallpapersOpen}
          onClose={() => setIsWallpapersOpen(false)}
          user={user}
          setUser={setUser as any}
        />
      )}

      {/* Tutorial Video Modal for Pregnancy, Postpartum, & Cycle Workouts */}
      {simulatedVideo && createPortal(
        <div className="fixed inset-0 bg-stone-950/85 backdrop-blur-md z-[9999] flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#1a1816] rounded-2xl p-6 md:p-8 max-w-2xl w-full space-y-5 shadow-2xl border border-[#2e2a26] overflow-y-auto max-h-[95vh] flex flex-col text-white my-auto">
            
            <div className="flex justify-between items-start gap-4">
              <div className="flex items-center gap-3 text-left">
                <div className="w-10 h-10 rounded-xl bg-pink-950/50 border border-pink-900/40 text-pink-400 flex items-center justify-center shrink-0">
                  <Activity className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-lg md:text-xl font-serif text-white">{simulatedVideo.name}</h4>
                  <p className="text-xs text-stone-400">Guided Movement Practice · {simulatedVideo.duration}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSimulatedVideo(null)}
                className="w-8 h-8 hover:bg-stone-800 rounded-xl text-stone-400 hover:text-white transition-colors flex items-center justify-center cursor-pointer"
                title="Close player"
                aria-label="Close video player"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="relative w-full aspect-video bg-[#11100f] rounded-xl overflow-hidden flex flex-col items-center justify-center border border-[#2e2a26]">
              {videoLoading ? (
                <div className="space-y-3 text-center py-12">
                  <div className="w-10 h-10 border-2 border-stone-700 border-t-pink-500 rounded-full animate-spin mx-auto" />
                  <p className="text-xs text-stone-300 font-medium">Preparing guided movement session...</p>
                </div>
              ) : (
                <div className="w-full h-full p-4 flex flex-col items-center justify-between relative">
                  <div className="flex-1 w-full flex items-center justify-center min-h-[160px]">
                    {renderPregnancyPostpartumExerciseSVG(simulatedVideo.name)}
                  </div>

                  <div className="absolute top-3 left-3 bg-[#1a1816]/90 border border-[#2e2a26] px-2.5 py-1 rounded-lg flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span className="text-[11px] font-medium text-stone-300">Guided Breath &amp; Posture</span>
                  </div>

                  <div className="absolute top-3 right-3 bg-[#1a1816]/90 border border-[#2e2a26] px-2.5 py-1 rounded-lg">
                    <span className="text-[11px] font-semibold text-pink-400">{dashBreathState}</span>
                  </div>
                </div>
              )}
            </div>

            {!videoLoading && (
              <div className="grid grid-cols-3 gap-3 w-full text-left">
                <div className="bg-[#23201d] p-3 rounded-xl border border-[#2e2a26] flex items-center gap-2.5">
                  <Heart size={16} className="text-rose-400 shrink-0" />
                  <div>
                    <p className="text-[11px] text-stone-400">Breath Phase</p>
                    <p className="text-xs font-semibold text-stone-100">{dashBreathState}</p>
                  </div>
                </div>
                <div className="bg-[#23201d] p-3 rounded-xl border border-[#2e2a26] flex items-center gap-2.5">
                  <Activity size={16} className="text-emerald-400 shrink-0" />
                  <div>
                    <p className="text-[11px] text-stone-400">Guidance</p>
                    <p className="text-xs font-semibold text-stone-100">Slow &amp; Controlled</p>
                  </div>
                </div>
                <div className="bg-[#23201d] p-3 rounded-xl border border-[#2e2a26] flex items-center gap-2.5">
                  <Clock size={16} className="text-amber-400 shrink-0" />
                  <div>
                    <p className="text-[11px] text-stone-400">Rhythm</p>
                    <p className="text-xs font-semibold text-stone-100 tabular-nums">{(dashBreathTime).toFixed(1)}s</p>
                  </div>
                </div>
              </div>
            )}

            <div className="bg-[#23201d] p-4 rounded-xl border border-[#2e2a26] text-left space-y-1">
              <p className="text-xs font-semibold text-amber-400 flex items-center gap-1.5">
                <Lightbulb className="w-3.5 h-3.5" />
                <span>Instructions &amp; Safety</span>
              </p>
              <p className="text-xs text-stone-300 leading-relaxed">
                {getCoachInstructions(simulatedVideo.name)[coachInstructionIndex % getCoachInstructions(simulatedVideo.name).length] || 
                  "Focus on slow nasal breathing, expand your ribcage gently, and stop immediately if you feel dizzy."}
              </p>
            </div>

            <div className="flex gap-3 pt-1">
              <button
                type="button"
                onClick={() => {
                  logAvatarActionReward(user, 'postpartum_yoga', `Completed: ${simulatedVideo.name}`, setUser);
                  setSimulatedVideo(null);
                }}
                className="flex-1 h-11 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-xl transition-colors text-center cursor-pointer"
              >
                Complete Practice &amp; Close (+25 XP)
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Lumina Avatar System Companion Dashboard & Customization Modal */}
      <AvatarDashboardModal
        isOpen={isAvatarModalOpen}
        onClose={() => setIsAvatarModalOpen(false)}
        user={user}
        setUser={setUser}
        onOpenLogModal={onOpenLogModal}
        onOpenChat={handleOpenCompanionChat}
        onNavigateTab={(tab) => {
          setIsAvatarModalOpen(false);
          if (onTabChange) onTabChange(tab);
          else setActiveTab(tab);
        }}
      />
    </div>
  );
};

export default Dashboard;
