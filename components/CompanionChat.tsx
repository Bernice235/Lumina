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

  // States
  const [messages, setMessages] = useState<CompanionChatMessage[]>(() => {
    try {
      const saved = localStorage.getItem(`lumina_chat_${user.id}_${avatarId}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.warn("Could not load companion chat history:", e);
    }
    return [];
  });

  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isVoiceAutoPlay, setIsVoiceAutoPlay] = useState(true);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isWaving, setIsWaving] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [activeSpeechMessageId, setActiveSpeechMessageId] = useState<string | null>(null);
  const [showAvatarSelector, setShowAvatarSelector] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const speechRecognitionRef = useRef<any>(null);

  // Calculate current wellness context
  const cycleDay = user.lastPeriodStart
    ? Math.max(1, Math.floor((Date.now() - new Date(user.lastPeriodStart).getTime()) / (1000 * 60 * 60 * 24)) + 1)
    : 3;

  const cyclePhase = (() => {
    if (cycleDay <= (user.periodLength || 5)) return 'Menstrual';
    if (cycleDay <= 12) return 'Follicular';
    if (cycleDay <= 16) return 'Ovulation';
    return 'Luteal';
  })();

  const pregnancyWeek = user.isPregnancyMode && user.pregnancyStartDate
    ? Math.max(1, Math.min(42, Math.floor((Date.now() - new Date(user.pregnancyStartDate).getTime()) / (1000 * 60 * 60 * 24 * 7))))
    : 24;

  const periodStatus = user.isPregnancyMode 
    ? `Pregnancy Week ${pregnancyWeek}` 
    : user.isPostpartumMode 
      ? `Postpartum Recovery` 
      : `Day ${cycleDay} of cycle`;

  const recentSymptomsList = symptoms.slice(-5).map(s => s.type ? s.type.replace('_', ' ') : 'symptom');
  const recentMoodStr = (user.moodLogs && user.moodLogs.length > 0)
    ? user.moodLogs[user.moodLogs.length - 1].mood
    : 'Centered';

  // Save messages to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(`lumina_chat_${user.id}_${avatarId}`, JSON.stringify(messages));
    } catch (e) {
      console.warn("Could not save chat history:", e);
    }
  }, [messages, user.id, avatarId]);

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

  // Initial personalized daily greeting if chat is empty
  useEffect(() => {
    if (messages.length === 0) {
      const initialGreeting = getInitialGreetingMessage();
      setMessages([initialGreeting]);
      if (isVoiceAutoPlay) {
        handleSpeakMessage(initialGreeting.id, initialGreeting.text);
      }
    }
  }, [avatarId]);

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
      alert("Voice input is not supported in this browser. Please type your message.");
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
    const fresh = getInitialGreetingMessage();
    setMessages([fresh]);
    if (isVoiceAutoPlay) {
      handleSpeakMessage(fresh.id, fresh.text);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-rose-50/70 via-stone-50 to-pink-50/40 text-stone-800 flex flex-col relative pb-2 sm:pb-4 max-w-4xl mx-auto shadow-2xl rounded-none sm:rounded-[2.5rem] overflow-hidden border border-pink-100/80 my-0 sm:my-3">
      {/* Companion Top App Header */}
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-pink-100/90 px-4 sm:px-6 py-3.5 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={onClose}
            className="p-2 -ml-1 rounded-full text-stone-500 hover:text-stone-800 hover:bg-pink-50 transition-all cursor-pointer"
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
            <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-gradient-to-r from-pink-500 to-rose-400 text-white text-[9px] font-black flex items-center justify-center border-2 border-white shadow-xs">
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
      <div className="bg-gradient-to-r from-pink-50 via-rose-50/60 to-amber-50/40 px-4 py-2 border-b border-pink-100/60 flex items-center justify-between text-[11px] text-stone-600 flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <span className="font-semibold flex items-center gap-1 text-pink-700">
            <Calendar className="w-3.5 h-3.5" />
            <span>{periodStatus}</span>
          </span>
          <span className="font-semibold flex items-center gap-1 text-sky-700">
            <Droplet className="w-3.5 h-3.5" />
            <span>{waterIntake}ml / {waterGoal}ml</span>
          </span>
        </div>
        <div className="flex items-center gap-2">
          {recentSymptomsList.length > 0 && (
            <span className="text-[10px] bg-white/80 px-2 py-0.5 rounded-full border border-pink-100 font-medium text-stone-500">
              Recent: {recentSymptomsList.slice(0, 2).join(', ')}
            </span>
          )}
          <span className="text-[10px] font-bold text-pink-600 bg-white px-2 py-0.5 rounded-full shadow-2xs border border-pink-100">
            {avatarMood.emoji} {avatarMood.label}
          </span>
        </div>
      </div>

      {/* Chat Messages Scroll Container */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-6 space-y-5">
        {/* Companion Welcome Introduction Card */}
        <div className="bg-gradient-to-br from-white/90 to-pink-50/50 p-4 rounded-3xl border border-pink-100/80 shadow-xs flex items-center gap-4 text-left">
          <div className="shrink-0">
            <AvatarVisual 
              avatar={currentAvatar} 
              size="lg" 
              interactive
              isWaving={isWaving}
              showMoodBadge={false}
            />
          </div>
          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-black uppercase tracking-wider text-pink-600">
                {preset.name} {preset.emoji}
              </span>
              <span className="text-[10px] bg-pink-100 text-pink-700 font-bold px-2 py-0.5 rounded-full">
                Level {progression.level} Companion
              </span>
            </div>
            <p className="text-xs text-stone-600 leading-relaxed font-serif italic">
              "{preset.quote}"
            </p>
            <div className="flex items-center gap-1.5 pt-1 flex-wrap">
              {preset.traits.map((trait, idx) => (
                <span key={idx} className="text-[9.5px] font-bold px-2 py-0.5 bg-white text-stone-600 rounded-full border border-pink-100">
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
                  className={`p-3.5 sm:p-4 rounded-3xl text-sm leading-relaxed text-left shadow-xs transition-all ${
                    isUser
                      ? 'bg-gradient-to-r from-pink-500 to-rose-500 text-white rounded-br-xs font-medium'
                      : 'bg-white text-stone-800 rounded-bl-xs border border-pink-100/80 shadow-xs'
                  }`}
                >
                  <p className="whitespace-pre-wrap">{msg.text}</p>
                </div>
              </div>

              {/* Timestamp & Companion Audio Read-Aloud trigger */}
              <div className={`flex items-center gap-2 text-[10px] text-stone-400 px-2 ${isUser ? 'pr-2' : 'pl-9'}`}>
                <span>{msg.timestamp}</span>
                {!isUser && (
                  <button
                    onClick={() => {
                      if (isCurrentlySpeakingThis) {
                        handleStopSpeaking();
                      } else {
                        handleSpeakMessage(msg.id, msg.text);
                      }
                    }}
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-bold transition-colors cursor-pointer ${
                      isCurrentlySpeakingThis 
                        ? 'bg-rose-500 text-white animate-pulse' 
                        : 'hover:text-pink-600 bg-pink-50 hover:bg-pink-100 text-pink-700'
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
                      key={pIdx}
                      onClick={() => handleSendMessage(prompt.replace(/[^\w\s\?]/g, '').trim())}
                      className="text-[11px] font-semibold bg-white/90 hover:bg-pink-50 text-stone-700 hover:text-pink-700 px-3 py-1.5 rounded-full border border-pink-200/60 shadow-2xs transition-all active:scale-95 cursor-pointer flex items-center gap-1"
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
            className="flex items-center gap-2.5 text-stone-400 pl-1"
          >
            <div className="w-6 h-6 rounded-full bg-pink-100 flex items-center justify-center text-xs">
              {preset.emoji}
            </div>
            <div className="bg-white border border-pink-100 px-3.5 py-2.5 rounded-2xl rounded-bl-xs flex items-center gap-1.5 shadow-2xs">
              <span className="w-2 h-2 rounded-full bg-pink-400 animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-2 h-2 rounded-full bg-pink-400 animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-2 h-2 rounded-full bg-pink-400 animate-bounce" style={{ animationDelay: '300ms' }} />
              <span className="text-[11px] text-stone-400 font-medium ml-1">{preset.name} is typing...</span>
            </div>
          </motion.div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick Action Pills above Input Field */}
      <div className="px-4 pb-2 flex items-center gap-2 overflow-x-auto no-scrollbar">
        <button
          onClick={() => handleSendMessage("How is my cycle today?")}
          className="shrink-0 text-[11px] font-bold bg-pink-50 hover:bg-pink-100 text-pink-700 px-3 py-1.5 rounded-full border border-pink-200/70 transition-all cursor-pointer flex items-center gap-1 shadow-2xs"
        >
          <Calendar className="w-3 h-3 text-pink-500" />
          <span>Cycle Status</span>
        </button>

        <button
          onClick={() => {
            if (onOpenLogModal) onOpenLogModal();
            else handleSendMessage("I want to log my symptoms today");
          }}
          className="shrink-0 text-[11px] font-bold bg-rose-50 hover:bg-rose-100 text-rose-700 px-3 py-1.5 rounded-full border border-rose-200/70 transition-all cursor-pointer flex items-center gap-1 shadow-2xs"
        >
          <Heart className="w-3 h-3 text-rose-500" />
          <span>Log Symptoms</span>
        </button>

        <button
          onClick={() => handleSendMessage("Give me a self-care recommendation for right now")}
          className="shrink-0 text-[11px] font-bold bg-amber-50 hover:bg-amber-100 text-amber-700 px-3 py-1.5 rounded-full border border-amber-200/70 transition-all cursor-pointer flex items-center gap-1 shadow-2xs"
        >
          <Sparkles className="w-3 h-3 text-amber-500" />
          <span>Self-Care Tip</span>
        </button>

        <button
          onClick={() => handleSendMessage("Remind me to drink water and check my hydration")}
          className="shrink-0 text-[11px] font-bold bg-sky-50 hover:bg-sky-100 text-sky-700 px-3 py-1.5 rounded-full border border-sky-200/70 transition-all cursor-pointer flex items-center gap-1 shadow-2xs"
        >
          <Droplet className="w-3 h-3 text-sky-500" />
          <span>Hydration</span>
        </button>
      </div>

      {/* Input Form Bar */}
      <footer className="bg-white/95 backdrop-blur-md border-t border-pink-100 px-4 py-3 sm:px-6">
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
            className={`p-2.5 rounded-full transition-all cursor-pointer shrink-0 ${
              isListening 
                ? 'bg-rose-500 text-white animate-pulse shadow-md' 
                : 'bg-pink-50 hover:bg-pink-100 text-pink-600'
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
              placeholder={isListening ? "Listening to your voice..." : `Message ${preset.name}...`}
              className="w-full bg-stone-50 hover:bg-stone-100/70 focus:bg-white border border-pink-200/80 rounded-full px-4 py-2.5 text-sm text-stone-800 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-pink-400 focus:border-transparent transition-all shadow-inner"
            />
          </div>

          {/* Send Button */}
          <button
            type="submit"
            disabled={!inputText.trim() || isTyping}
            className={`p-2.5 rounded-full transition-all cursor-pointer shrink-0 ${
              inputText.trim() && !isTyping
                ? 'bg-gradient-to-r from-pink-500 to-rose-500 text-white shadow-md hover:opacity-95 active:scale-95'
                : 'bg-stone-200 text-stone-400 cursor-not-allowed'
            }`}
            title="Send Message"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>

        <p className="text-[10px] text-stone-400 mt-2 text-center">
          {preset.name} is your daily holistic sanctuary companion. Always consult healthcare professionals for medical advice.
        </p>
      </footer>
    </div>
  );
};
