import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  User, 
  UserAvatar, 
  AvatarId, 
  Symptom, 
  Reminder,
  CompanionChatMessage 
} from '../types';
import { AvatarVisual } from './AvatarVisual';
import { 
  AVATAR_PRESETS, 
  getOrCreateUserAvatar, 
  calculateAvatarMood,
  calculateAvatarProgression 
} from '../services/avatarService';
import { 
  speakNativeSpeech, 
  stopWelcomeVoice, 
  getUserFirstName 
} from '../services/welcomeVoiceService';
import { sendCompanionChatMessage } from '../services/gemini';
import { calculateCycleSyncData } from '../services/cycleSyncService';
import { secureStorage } from '../services/secureStorage';
import { syncUser } from '../services/firebaseService';
import { 
  ArrowLeft, 
  Send, 
  Mic, 
  MicOff, 
  Volume2, 
  VolumeX, 
  Sparkles, 
  RefreshCw, 
  Droplet, 
  Heart, 
  Calendar, 
  Smile, 
  Trash2,
  ChevronDown,
  Info
} from 'lucide-react';

interface CompanionChatProps {
  user: User;
  setUser?: (val: User | null | ((prev: User | null) => User | null)) => void;
  symptoms?: Symptom[];
  waterIntake?: number;
  waterGoal?: number;
  reminders?: Reminder[];
  onClose: () => void;
  onOpenLogModal?: () => void;
  onOpenAvatarCustomizer?: () => void;
}

export const CompanionChat: React.FC<CompanionChatProps> = ({
  user,
  setUser,
  symptoms = [],
  waterIntake = 0,
  waterGoal = 2000,
  reminders = [],
  onClose,
  onOpenLogModal,
  onOpenAvatarCustomizer
}) => {
  const currentAvatar: UserAvatar = user.avatar || getOrCreateUserAvatar(user);
  const avatarId = currentAvatar.id || 'amara';
  const preset = AVATAR_PRESETS[avatarId] || AVATAR_PRESETS.amara;
  const avatarMood = calculateAvatarMood(user, currentAvatar);
  const progression = calculateAvatarProgression(user, currentAvatar);
  const firstName = getUserFirstName(user);

  const [messages, setMessages] = useState<CompanionChatMessage[]>([]);
  const [historyLoaded, setHistoryLoaded] = useState(false);

  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isVoiceAutoPlay, setIsVoiceAutoPlay] = useState(true);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isWaving, setIsWaving] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [activeSpeechMessageId, setActiveSpeechMessageId] = useState<string | null>(null);
  const [showAvatarSelector, setShowAvatarSelector] = useState(false);
  const [chatNotice, setChatNotice] = useState<string | null>(null);

  const isAiPersonalizationAllowed = user.privacyPreferences?.allowAiPersonalization === true;

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const speechRecognitionRef = useRef<any>(null);

  // Calculate synchronized current wellness context
  const cycleSync = calculateCycleSyncData(user, new Date());
  const cycleDay = cycleSync.cycleDay;
  const cyclePhase = cycleSync.phase;

  const pregnancyWeek = user.isPregnancyMode && user.pregnancyStartDate
    ? Math.max(1, Math.min(42, Math.floor((Date.now() - new Date(user.pregnancyStartDate).getTime()) / (1000 * 60 * 60 * 24 * 7))))
    : 24;

  const periodStatus = user.isPregnancyMode 
    ? `Pregnancy Week ${pregnancyWeek}` 
    : user.isPostpartumMode 
      ? `Postpartum Recovery` 
      : cycleSync.isLatePeriodMode
        ? `Day ${cycleSync.daysLate} Late (Late Period Mode)`
        : `Day ${cycleDay} of cycle (${cycleSync.phaseName}${cycleSync.isWithinFertileWindow && cycleSync.fertilityStatus ? ` • ${cycleSync.fertilityStatus}` : ''})`;

  const recentSymptomsList = symptoms.slice(-5).map(s => s.type ? s.type.replace('_', ' ') : 'symptom');
  const recentMoodStr = (user.moodLogs && user.moodLogs.length > 0)
    ? user.moodLogs[user.moodLogs.length - 1].mood
    : 'Centered';

  // Load & migrate encrypted chat history from IndexedDB vault
  useEffect(() => {
    let cancelled = false;
    setHistoryLoaded(false);
    (async () => {
      try {
        const legacyKey = `lumina_chat_${user.id}_${avatarId}`;
        const legacyRaw = localStorage.getItem(legacyKey);
        if (legacyRaw) {
          await secureStorage.setItem(`chat_${user.id}_${avatarId}`, legacyRaw);
          localStorage.removeItem(legacyKey);
        }
        const saved = await secureStorage.getItem(`chat_${user.id}_${avatarId}`);
        if (!cancelled && saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setMessages(parsed);
            setHistoryLoaded(true);
            return;
          }
        }
      } catch {}
      if (!cancelled) {
        const initialGreeting = getInitialGreetingMessage();
        setMessages([initialGreeting]);
        setHistoryLoaded(true);
        if (isVoiceAutoPlay) {
          handleSpeakMessage(initialGreeting.id, initialGreeting.text);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user.id, avatarId]);

  // Save messages to encrypted IndexedDB vault
  useEffect(() => {
    if (!historyLoaded) return;
    void secureStorage.setItem(`chat_${user.id}_${avatarId}`, JSON.stringify(messages)).catch(() => {});
  }, [messages, user.id, avatarId, historyLoaded]);

  // Scroll to bottom on new messages
  const scrollToBottom = (smooth = true) => {
    messagesEndRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' });
  };

  useEffect(() => {
    scrollToBottom(false);
  }, []);

  useEffect(() => {
    scrollToBottom(true);
  }, [messages, isTyping]);

  // Personalized greeting generator based on avatar personality
  const getInitialGreetingMessage = (): CompanionChatMessage => {
    const hour = new Date().getHours();
    let timeGreeting = "Good morning";
    let emoji = "🌞";
    if (hour >= 12 && hour < 17) {
      timeGreeting = "Good afternoon";
      emoji = "🌸";
    } else if (hour >= 17 && hour < 21) {
      timeGreeting = "Good evening";
      emoji = "✨";
    } else if (hour >= 21 || hour < 5) {
      timeGreeting = "Good night";
      emoji = "🌙";
    }

    let text = "";
    let suggested: string[] = [];

    // Avatar personality differences
    if (avatarId === 'zainab') {
      if (user.isPregnancyMode) {
        text = `${timeGreeting}, ${firstName}! ⚡ Week ${pregnancyWeek} of pregnancy—you are radiating pure strength. How is your energy today, mama?`;
        suggested = ["Feeling energetic! ⚡", "A bit fatigued 😴", "Baby movement update 👶"];
      } else {
        text = `${timeGreeting}, ${firstName}! ⚡ You're on Day ${cycleDay} of your cycle today (${cyclePhase} phase). I'm here to motivate and support you. How are your cramps and energy feeling today?`;
        suggested = ["Cramps are manageable 🌿", "Need an energy boost ⚡", "Log my symptoms 📝"];
      }
    } else if (avatarId === 'naomi') {
      if (user.isPregnancyMode) {
        text = `${timeGreeting}, ${firstName} 🌿. Congratulations on reaching Week ${pregnancyWeek} of pregnancy. Take a deep, gentle breath and honor the life growing within you. How does your body feel right now?`;
        suggested = ["Feeling peaceful 🌿", "Experiencing some aches 🩹", "Resting today 🤍"];
      } else {
        text = `${timeGreeting}, ${firstName} 🌿. In this ${cyclePhase} season (Day ${cycleDay}), remember to be gentle with yourself. How are your cramps feeling today, and did you sleep well last night?`;
        suggested = ["Slept deeply 🌙", "Cramps are acting up 🩹", "Log morning symptoms 📝"];
      }
    } else if (avatarId === 'amina') {
      if (user.isPregnancyMode) {
        text = `${timeGreeting}, sunshine ${firstName}! ☀️ Week ${pregnancyWeek} is such a magical milestone! Your baby is growing beautifully. How are you smiling today?`;
        suggested = ["Feeling wonderful! 🌸", "A bit sleepy today 🥱", "Hydration check 💧"];
      } else {
        text = `${timeGreeting}, ${firstName} ☀️! So happy to connect with you today! You’re on Day ${cycleDay} of your cycle. Would you like to log any symptoms, or should we check in on your water goal?`;
        suggested = ["Log my symptoms 📝", "Check my water goal 💧", "I'm doing well! 😊"];
      }
    } else {
      // Default: Amara (Warm, Gentle, Encouraging)
      if (user.isPregnancyMode) {
        text = `${timeGreeting}, ${firstName} 🌸. Congratulations on reaching Week ${pregnancyWeek} of pregnancy. Your baby is growing beautifully. How are you and your sweet bump feeling today?`;
        suggested = ["Feeling connected to baby 🌸", "Experiencing fatigue 😴", "Sip of water reminder 💧"];
      } else if (user.isPostpartumMode) {
        text = `${timeGreeting}, ${firstName} 🌸. You’re doing amazing. Recovery takes time, and every small step matters. Did you get enough rest last night?`;
        suggested = ["Rested a little 🤍", "Feeling overwhelmed 🌿", "Gentle self-care 🌸"];
      } else {
        text = `${timeGreeting}, ${firstName} ${emoji}. You’re on Day ${cycleDay} of your cycle today. Take it easy and stay hydrated. How are your cramps feeling?`;
        suggested = ["Cramps are manageable 🌸", "Feeling tired & moody 🩹", "Log my symptoms 📝"];
      }
    }

    return {
      id: `msg_init_${Date.now()}`,
      sender: 'companion',
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      avatarId,
      suggestedPrompts: suggested,
      healthTopic: 'cycle'
    };
  };

  // Read message aloud
  const handleSpeakMessage = (messageId: string, text: string) => {
    stopWelcomeVoice();
    setActiveSpeechMessageId(messageId);
    setIsSpeaking(true);
    setIsWaving(true);

    const spoken = speakNativeSpeech(text, {
      accent: currentAvatar.accent || preset.defaultAccent || 'us',
      avatarId,
      pitch: currentAvatar.speechPitch ?? 1.05,
      rate: currentAvatar.speechRate ?? 0.94,
      onEnd: () => {
        setIsSpeaking(false);
        setIsWaving(false);
        setActiveSpeechMessageId(null);
      },
      onError: () => {
        setIsSpeaking(false);
        setIsWaving(false);
        setActiveSpeechMessageId(null);
      }
    });

    if (!spoken) {
      setIsSpeaking(false);
      setIsWaving(false);
      setActiveSpeechMessageId(null);
    }
  };

  const handleStopSpeaking = () => {
    stopWelcomeVoice();
    setIsSpeaking(false);
    setIsWaving(false);
    setActiveSpeechMessageId(null);
  };

  // Send a user message and get companion AI response
  const handleSendMessage = async (textToSend?: string) => {
    const content = (textToSend || inputText).trim();
    if (!content) return;

    if (!isAiPersonalizationAllowed) {
      setChatNotice('AI Companion messaging is paused in your Privacy Preferences. Enable AI Personalization below to resume.');
      return;
    }

    setChatNotice(null);
    setInputText('');
    stopWelcomeVoice();

    const userMsg: CompanionChatMessage = {
      id: `msg_user_${Date.now()}`,
      sender: 'user',
      text: content,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    const newHistory = [...messages, userMsg];
    setMessages(newHistory);
    setIsTyping(true);
    setIsWaving(true);

    try {
      // Build history for backend
      const formattedHistory = newHistory.slice(-8).map(m => ({
        role: (m.sender === 'user' ? 'user' : 'assistant') as 'user' | 'assistant',
        content: m.text
      }));

      const res = await sendCompanionChatMessage({
        avatarId,
        avatarName: preset.name,
        userName: firstName,
        userMessage: content,
        wellnessContext: {
          cyclePhase,
          cycleDay,
          periodStatus,
          symptoms: recentSymptomsList,
          isPregnancyMode: !!user.isPregnancyMode,
          pregnancyWeek,
          isPostpartumMode: !!user.isPostpartumMode,
          postpartumDays: 21,
          recentMood: recentMoodStr,
          waterIntake,
          waterGoal,
          wellnessGoals: ['Stay hydrated', 'Ease cramps', 'Mindful rest']
        },
        history: formattedHistory
      });

      const companionMsg: CompanionChatMessage = {
        id: `msg_comp_${Date.now()}`,
        sender: 'companion',
        text: res.reply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        avatarId,
        suggestedPrompts: res.suggestedPrompts || [
          "Log today's symptoms 📝",
          "Hydration check 💧",
          "Give me gentle advice ✨"
        ]
      };

      setMessages(prev => [...prev, companionMsg]);
      setIsTyping(false);

      if (isVoiceAutoPlay) {
        handleSpeakMessage(companionMsg.id, companionMsg.text);
      } else {
        setIsWaving(false);
      }
    } catch (e) {
      console.warn("Error sending message to companion:", e);
      setIsTyping(false);
      setIsWaving(false);
    }
  };

  // Voice Input Speech-to-Text
  const toggleVoiceListening = () => {
    if (typeof window === 'undefined') return;

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setChatNotice("Voice input is not supported in this browser. Please type your message below.");
      return;
    }

    if (isListening) {
      speechRecognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        if (transcript) {
          setInputText(transcript);
          handleSendMessage(transcript);
        }
      };

      recognition.onerror = (event: any) => {
        console.warn("Speech recognition error:", event);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      speechRecognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.warn("Speech recognition initiation error:", err);
      setIsListening(false);
    }
  };

  // Switch Companion Avatar
  const handleSelectCompanion = (id: AvatarId) => {
    if (setUser) {
      const targetPreset = AVATAR_PRESETS[id];
      setUser(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          avatar: {
            ...(prev.avatar || getOrCreateUserAvatar(prev)),
            id,
            name: targetPreset.name,
            title: targetPreset.title,
            skinTone: targetPreset.skinTone,
            hairstyle: targetPreset.hairstyle,
            headwrap: targetPreset.headwrap,
            glasses: targetPreset.glasses,
            outfit: targetPreset.outfit,
            personalityStyle: targetPreset.defaultPersonality,
            accent: targetPreset.defaultAccent
          }
        };
      });
    }
    setShowAvatarSelector(false);
  };

  // Clear chat history
  const handleClearHistory = () => {
    stopWelcomeVoice();
    localStorage.removeItem(`lumina_chat_${user.id}_${avatarId}`);
    void secureStorage.removeItem(`chat_${user.id}_${avatarId}`);
    const fresh = getInitialGreetingMessage();
    setMessages([fresh]);
    if (isVoiceAutoPlay) {
      handleSpeakMessage(fresh.id, fresh.text);
    }
  };

  return (
    <div className="min-h-screen bg-[#faf8f6] dark:bg-[#11100f] text-stone-800 dark:text-stone-100 flex flex-col relative pb-2 sm:pb-4 max-w-4xl mx-auto shadow-sm sm:rounded-2xl overflow-hidden border border-stone-200/80 dark:border-[#2e2a26] my-0 sm:my-3">
      {/* Companion Top App Header */}
      <header className="sticky top-0 z-30 bg-white/95 dark:bg-[#1a1816]/95 backdrop-blur-md border-b border-stone-200/80 dark:border-[#2e2a26] px-4 sm:px-6 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={onClose}
            className="p-2 -ml-1 rounded-xl text-stone-500 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 hover:bg-stone-100 dark:hover:bg-[#23201d] transition-colors cursor-pointer"
            title="Back to Dashboard"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          {/* Avatar Visual with Protruding Head & Alive Expressions */}
          <div
            onClick={() => setShowAvatarSelector(!showAvatarSelector)}
            className="relative cursor-pointer group shrink-0"
            title="Click to switch companion or see profile"
          >
            <AvatarVisual
              avatar={{
                ...currentAvatar,
                mood: avatarMood.mood
              }}
              size="md"
              showTierBadge={false}
              showMoodBadge={false}
              isSpeaking={isSpeaking}
              isWaving={isWaving}
              interactive
              className="group-hover:scale-105 transition-transform"
            />
            <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-pink-600 text-white text-[9px] font-bold flex items-center justify-center border-2 border-white dark:border-[#1a1816]">
              {preset.emoji}
            </span>
          </div>

          {/* Avatar Name & Personality Description */}
          <div className="min-w-0 text-left">
            <div className="flex items-center gap-1.5 flex-wrap">
              <h1 className="font-serif font-black text-stone-900 text-base sm:text-lg flex items-center gap-1 leading-tight">
                <span>{preset.name}</span>
                <span>{preset.emoji}</span>
              </h1>
              <button
                onClick={() => setShowAvatarSelector(!showAvatarSelector)}
                className="text-[10px] text-pink-600 bg-pink-50 hover:bg-pink-100 px-2 py-0.5 rounded-full font-bold flex items-center gap-0.5 transition-colors cursor-pointer"
              >
                <span>Switch</span>
                <ChevronDown className="w-3 h-3" />
              </button>
            </div>
            
            {/* Personality Description */}
            <p className="text-[11px] sm:text-xs text-stone-500 font-medium truncate">
              "{preset.personalityDescription}"
            </p>
          </div>
        </div>

        {/* Header Right Action Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Read Aloud / Voice Toggle */}
          <button
            onClick={() => {
              if (isSpeaking) {
                handleStopSpeaking();
              }
              setIsVoiceAutoPlay(!isVoiceAutoPlay);
            }}
            className={`p-2 rounded-full text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
              isVoiceAutoPlay 
                ? 'bg-rose-100/80 text-rose-600 hover:bg-rose-200' 
                : 'bg-stone-100 text-stone-400 hover:bg-stone-200'
            }`}
            title={isVoiceAutoPlay ? 'Auto-voice enabled (taps to mute)' : 'Auto-voice muted (taps to enable)'}
          >
            {isVoiceAutoPlay ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            <span className="hidden md:inline text-[11px] font-semibold">{isVoiceAutoPlay ? 'Voice On' : 'Muted'}</span>
          </button>

          {/* Clear history */}
          <button
            onClick={handleClearHistory}
            className="p-2 rounded-full text-stone-400 hover:text-rose-500 hover:bg-rose-50 transition-colors cursor-pointer"
            title="Clear Chat History"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Dropdown Companion Selector Modal / Drawer */}
      <AnimatePresence>
        {showAvatarSelector && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-white/95 backdrop-blur-md border-b border-pink-100 px-4 py-4 z-20 shadow-md"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-black uppercase tracking-wider text-pink-600">
                Choose Your Companion Persona
              </span>
              <button 
                onClick={() => setShowAvatarSelector(false)}
                className="text-stone-400 hover:text-stone-600 text-xs font-bold"
              >
                Close ✕
              </button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {(Object.keys(AVATAR_PRESETS) as AvatarId[]).map((id) => {
                const p = AVATAR_PRESETS[id];
                const isSelected = avatarId === id;
                return (
                  <button
                    key={id}
                    onClick={() => handleSelectCompanion(id)}
                    className={`p-2.5 rounded-2xl border text-left flex items-center gap-2.5 transition-all cursor-pointer ${
                      isSelected 
                        ? 'border-pink-500 bg-pink-50/80 shadow-xs' 
                        : 'border-stone-100 bg-white hover:border-pink-200 hover:bg-stone-50'
                    }`}
                  >
                    <div className="w-9 h-9 rounded-full bg-pink-100 flex items-center justify-center text-lg shrink-0">
                      {p.emoji}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-stone-800 truncate">{p.name}</p>
                      <p className="text-[10px] text-stone-500 truncate">{p.traits.join(', ')}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Wellness Context Bar banner */}
      <div className="bg-white dark:bg-[#1a1816] px-4 sm:px-6 py-2.5 border-b border-stone-200/80 dark:border-[#2e2a26] flex items-center justify-between text-[11px] text-stone-600 dark:text-stone-300 flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <span className="font-semibold flex items-center gap-1.5 text-pink-700 dark:text-pink-400 tabular-nums">
            <Calendar className="w-3.5 h-3.5" />
            <span>{periodStatus}</span>
          </span>
          <span className="font-semibold flex items-center gap-1.5 text-sky-700 dark:text-sky-400 tabular-nums">
            <Droplet className="w-3.5 h-3.5" />
            <span>{waterIntake}ml / {waterGoal}ml</span>
          </span>
        </div>
        <div className="flex items-center gap-2">
          {recentSymptomsList.length > 0 && (
            <span className="text-[10px] bg-[#faf8f6] dark:bg-[#23201d] px-2.5 py-0.5 rounded-md border border-stone-200/80 dark:border-[#342f2b] font-medium text-stone-600 dark:text-stone-300">
              Recent: {recentSymptomsList.slice(0, 2).join(', ')}
            </span>
          )}
          <span className="text-[10px] font-semibold text-pink-700 dark:text-pink-300 bg-pink-50 dark:bg-pink-950/40 px-2.5 py-0.5 rounded-md border border-pink-200/70 dark:border-pink-900/40">
            {avatarMood.emoji} {avatarMood.label}
          </span>
        </div>
      </div>

      {/* Chat Messages Scroll Container */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-6 space-y-5">
        {/* Companion Welcome Introduction Card */}
        <div className="bg-white dark:bg-[#1a1816] p-4 sm:p-5 rounded-2xl border border-stone-200/80 dark:border-[#2e2a26] shadow-xs flex items-center gap-4 text-left">
          <div className="shrink-0">
            <AvatarVisual
              avatar={currentAvatar}
              size="lg"
              interactive
              isWaving={isWaving}
              showMoodBadge={false}
            />
          </div>
          <div className="space-y-1.5 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold text-stone-900 dark:text-stone-100">
                {preset.name} {preset.emoji}
              </span>
              <span className="text-[10px] bg-pink-50 dark:bg-pink-950/40 text-pink-700 dark:text-pink-300 border border-pink-200/70 dark:border-pink-900/40 font-semibold px-2 py-0.5 rounded-md tabular-nums">
                Level {progression.level} Companion
              </span>
            </div>
            <p className="text-xs text-stone-600 dark:text-stone-300 leading-relaxed font-serif italic">
              "{preset.quote}"
            </p>
            <div className="flex items-center gap-1.5 pt-0.5 flex-wrap">
              {preset.traits.map((trait, idx) => (
                <span key={idx} className="text-[10px] font-medium px-2 py-0.5 bg-[#faf8f6] dark:bg-[#23201d] text-stone-600 dark:text-stone-300 rounded-md border border-stone-200/80 dark:border-[#342f2b]">
                  {trait}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Message bubbles list */}
        {messages.map((msg) => {
          const isUser = msg.sender === 'user';
          const isCurrentlySpeakingThis = activeSpeechMessageId === msg.id && isSpeaking;

          return (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} space-y-1.5`}
            >
              <div className={`flex items-end gap-2.5 max-w-[88%] sm:max-w-[78%] ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
                {/* Companion Small Avatar Icon */}
                {!isUser && (
                  <div className="shrink-0 mb-1">
                    <AvatarVisual 
                      avatar={currentAvatar} 
                      size="xs" 
                      isSpeaking={isCurrentlySpeakingThis}
                    />
                  </div>
                )}

                {/* Message Bubble */}
                <div
                  className={`p-3.5 sm:p-4 rounded-2xl text-sm leading-relaxed text-left transition-colors ${
                    isUser
                      ? 'bg-pink-600 text-white rounded-br-sm font-medium'
                      : 'bg-white dark:bg-[#1a1816] text-stone-800 dark:text-stone-100 rounded-bl-sm border border-stone-200/80 dark:border-[#2e2a26] shadow-xs'
                  }`}
                >
                  <p className="whitespace-pre-wrap">{msg.text}</p>
                </div>
              </div>

              {/* Timestamp & Companion Audio Read-Aloud trigger */}
              <div className={`flex items-center gap-2 text-[10px] text-stone-500 dark:text-stone-400 px-2 ${isUser ? 'pr-2' : 'pl-9'}`}>
                <span className="tabular-nums">{msg.timestamp}</span>
                {!isUser && (
                  <button
                    type="button"
                    onClick={() => {
                      if (isCurrentlySpeakingThis) {
                        handleStopSpeaking();
                      } else {
                        handleSpeakMessage(msg.id, msg.text);
                      }
                    }}
                    className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md font-semibold transition-colors cursor-pointer ${
                      isCurrentlySpeakingThis
                        ? 'bg-pink-600 text-white'
                        : 'hover:text-pink-700 dark:hover:text-pink-300 bg-pink-50 dark:bg-pink-950/40 hover:bg-pink-100 dark:hover:bg-pink-950/60 text-pink-700 dark:text-pink-300'
                    }`}
                    title={isCurrentlySpeakingThis ? 'Stop speaking' : 'Read aloud with companion voice'}
                  >
                    {isCurrentlySpeakingThis ? <VolumeX className="w-3 h-3" /> : <Volume2 className="w-3 h-3" />}
                    <span>{isCurrentlySpeakingThis ? 'Speaking...' : 'Listen'}</span>
                  </button>
                )}
              </div>

              {/* Suggested reply prompts for companion messages */}
              {!isUser && msg.suggestedPrompts && msg.suggestedPrompts.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pl-9 pt-1">
                  {msg.suggestedPrompts.map((prompt, pIdx) => (
                    <button
                      type="button"
                      key={pIdx}
                      onClick={() => handleSendMessage(prompt.replace(/[^\w\s\?]/g, '').trim())}
                      className="text-[11px] font-semibold bg-white dark:bg-[#1a1816] hover:bg-pink-50 dark:hover:bg-[#23201d] text-stone-700 dark:text-stone-200 hover:text-pink-700 dark:hover:text-pink-300 px-3 py-1.5 rounded-xl border border-stone-200/80 dark:border-[#2e2a26] transition-colors cursor-pointer flex items-center gap-1"
                    >
                      <span>{prompt}</span>
                    </button>
                  ))}
                </div>
              )}
            </motion.div>
          );
        })}

        {/* Typing indicator */}
        {isTyping && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center gap-2.5 text-stone-500 dark:text-stone-400 pl-1"
          >
            <div className="w-6 h-6 rounded-full bg-pink-100 dark:bg-pink-950/50 flex items-center justify-center text-xs">
              {preset.emoji}
            </div>
            <div className="bg-white dark:bg-[#1a1816] border border-stone-200/80 dark:border-[#2e2a26] px-3.5 py-2.5 rounded-xl rounded-bl-sm flex items-center gap-2 shadow-xs">
              <RefreshCw className="w-3.5 h-3.5 text-pink-600 dark:text-pink-400 animate-spin" />
              <span className="text-[11px] text-stone-500 dark:text-stone-400 font-medium">{preset.name} is thinking...</span>
            </div>
          </motion.div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick Action Bar above Input Field */}
      <div className="px-4 pb-2 flex items-center gap-2 overflow-x-auto no-scrollbar">
        <button
          type="button"
          onClick={() => handleSendMessage("How is my cycle today?")}
          className="shrink-0 text-[11px] font-semibold bg-white dark:bg-[#1a1816] hover:bg-pink-50 dark:hover:bg-[#23201d] text-stone-700 dark:text-stone-200 px-3 py-1.5 rounded-xl border border-stone-200/80 dark:border-[#2e2a26] transition-colors cursor-pointer flex items-center gap-1.5"
        >
          <Calendar className="w-3.5 h-3.5 text-pink-600 dark:text-pink-400" />
          <span>Cycle Status</span>
        </button>

        <button
          type="button"
          onClick={() => {
            if (onOpenLogModal) onOpenLogModal();
            else handleSendMessage("I want to log my symptoms today");
          }}
          className="shrink-0 text-[11px] font-semibold bg-white dark:bg-[#1a1816] hover:bg-pink-50 dark:hover:bg-[#23201d] text-stone-700 dark:text-stone-200 px-3 py-1.5 rounded-xl border border-stone-200/80 dark:border-[#2e2a26] transition-colors cursor-pointer flex items-center gap-1.5"
        >
          <Heart className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
          <span>Log Symptoms</span>
        </button>

        <button
          type="button"
          onClick={() => handleSendMessage("Give me a self-care recommendation for right now")}
          className="shrink-0 text-[11px] font-semibold bg-white dark:bg-[#1a1816] hover:bg-pink-50 dark:hover:bg-[#23201d] text-stone-700 dark:text-stone-200 px-3 py-1.5 rounded-xl border border-stone-200/80 dark:border-[#2e2a26] transition-colors cursor-pointer flex items-center gap-1.5"
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
          <span>Self-Care Tip</span>
        </button>

        <button
          type="button"
          onClick={() => handleSendMessage("Remind me to drink water and check my hydration")}
          className="shrink-0 text-[11px] font-semibold bg-white dark:bg-[#1a1816] hover:bg-pink-50 dark:hover:bg-[#23201d] text-stone-700 dark:text-stone-200 px-3 py-1.5 rounded-xl border border-stone-200/80 dark:border-[#2e2a26] transition-colors cursor-pointer flex items-center gap-1.5"
        >
          <Droplet className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
          <span>Hydration</span>
        </button>
      </div>

      {/* Input Form Bar */}
      <footer className="bg-white/95 dark:bg-[#1a1816]/95 backdrop-blur-md border-t border-stone-200/80 dark:border-[#2e2a26] px-4 py-3 sm:px-6">
        {/* Privacy / Notice Banners */}
        {!isAiPersonalizationAllowed && (
          <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-900/40 rounded-xl p-3 mb-2 flex items-center justify-between gap-2 text-xs text-amber-900 dark:text-amber-200">
            <span>AI companion replies are paused per your Privacy Preferences.</span>
            {setUser && (
              <button
                type="button"
                onClick={async () => {
                  const updatedUser: User = {
                    ...user,
                    privacyPreferences: {
                      shareAnonymousDiagnostics: user.privacyPreferences?.shareAnonymousDiagnostics ?? false,
                      allowPartnerActivityAlerts: user.privacyPreferences?.allowPartnerActivityAlerts ?? true,
                      autoLockOnBlur: user.privacyPreferences?.autoLockOnBlur ?? false,
                      hideNotificationPreviews: user.privacyPreferences?.hideNotificationPreviews ?? true,
                      dataRetentionDays: user.privacyPreferences?.dataRetentionDays ?? 365,
                      ...user.privacyPreferences,
                      allowAiPersonalization: true,
                      consentUpdatedAt: new Date().toISOString(),
                    },
                  };
                  setUser(updatedUser);
                  await syncUser(updatedUser);
                  setChatNotice(null);
                }}
                className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-semibold text-xs cursor-pointer shrink-0 transition-colors"
              >
                Enable AI Chat
              </button>
            )}
          </div>
        )}
        {chatNotice && (
          <div role="status" className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-rose-700 dark:text-rose-300 rounded-xl px-3 py-2 mb-2 text-xs flex items-center justify-between gap-2">
            <span>{chatNotice}</span>
            <button type="button" onClick={() => setChatNotice(null)} className="text-xs font-semibold cursor-pointer">Dismiss</button>
          </div>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="flex items-center gap-2"
        >
          {/* Voice Input Microphone Button */}
          <button
            type="button"
            onClick={toggleVoiceListening}
            className={`p-2.5 rounded-xl transition-colors cursor-pointer shrink-0 border ${
              isListening
                ? 'bg-rose-600 text-white border-rose-600'
                : 'bg-[#faf8f6] dark:bg-[#23201d] hover:bg-pink-50 dark:hover:bg-[#2b2724] text-pink-600 dark:text-pink-400 border-stone-200/80 dark:border-[#342f2b]'
            }`}
            title={isListening ? 'Listening... tap to stop' : 'Tap to speak your message'}
          >
            {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </button>

          {/* Text Input */}
          <div className="relative flex-1">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              disabled={!isAiPersonalizationAllowed}
              placeholder={!isAiPersonalizationAllowed ? 'AI Companion paused in Privacy Settings' : isListening ? "Listening to your voice..." : `Message ${preset.name}...`}
              className="w-full h-11 bg-[#faf8f6] dark:bg-[#23201d] focus:bg-white dark:focus:bg-[#1a1816] border border-stone-200/80 dark:border-[#342f2b] rounded-xl px-4 text-sm text-stone-900 dark:text-stone-100 placeholder-stone-400 focus:outline-none focus:border-pink-400 transition-colors disabled:opacity-60"
            />
          </div>

          {/* Send Button */}
          <button
            type="submit"
            disabled={!inputText.trim() || isTyping || !isAiPersonalizationAllowed}
            className={`h-11 px-4 rounded-xl transition-colors cursor-pointer shrink-0 flex items-center justify-center ${
              inputText.trim() && !isTyping && isAiPersonalizationAllowed
                ? 'bg-pink-600 hover:bg-pink-700 text-white shadow-xs'
                : 'bg-stone-200 dark:bg-[#23201d] text-stone-400 cursor-not-allowed'
            }`}
            title="Send Message"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>

        <p className="text-[10px] text-stone-500 dark:text-stone-400 mt-2 text-center">
          {preset.name} is an AI wellness companion powered by Google Gemini — not a medical professional or medical advice.
        </p>
      </footer>
    </div>
  );
};
