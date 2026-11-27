import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  Sparkles, 
  Award, 
  Flame, 
  Heart, 
  Activity, 
  Check, 
  Palette, 
  Crown, 
  Smile, 
  Calendar,
  Layers,
  ChevronRight,
  Droplets,
  BookOpen,
  ArrowRight,
  Volume2,
  VolumeX,
  Mic,
  Sliders,
  Radio
} from 'lucide-react';
import { 
  User, 
  UserAvatar, 
  AvatarId, 
  SkinTone, 
  Hairstyle, 
  Headwrap, 
  Glasses, 
  Outfit,
  AvatarTier,
  AvatarMood,
  AvatarAccent,
  AvatarPersonalityStyle 
} from '../types';
import { AvatarVisual } from './AvatarVisual';
import { 
  AVATAR_PRESETS, 
  SKIN_TONE_PALETTES, 
  HAIRSTYLES_LIST, 
  HEADWRAPS_LIST, 
  GLASSES_LIST, 
  OUTFITS_LIST,
  getOrCreateUserAvatar,
  calculateAvatarProgression,
  getAvatarCompanionSpeech,
  calculateAvatarMood,
  logAvatarActionReward
} from '../services/avatarService';
import { 
  playWelcomeVoiceGreeting, 
  playAvatarIntroduction, 
  getAvatarIntroduction, 
  stopWelcomeVoice, 
  getWelcomeGreeting,
  ACCENT_OPTIONS, 
  PERSONALITY_OPTIONS 
} from '../services/welcomeVoiceService';
import { syncUser } from '../services/firebaseService';

interface AvatarDashboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User;
  setUser?: React.Dispatch<React.SetStateAction<User | null>> | ((u: any) => void);
  onOpenLogModal?: () => void;
  onNavigateTab?: (tab: string) => void;
  onOpenChat?: () => void;
}

export const AvatarDashboardModal: React.FC<AvatarDashboardModalProps> = ({
  isOpen,
  onClose,
  user,
  setUser,
  onOpenLogModal,
  onNavigateTab,
  onOpenChat
}) => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'customize' | 'voice' | 'rewards'>('dashboard');
  
  // Customization local working state
  const currentAvatar = getOrCreateUserAvatar(user);
  const [selectedId, setSelectedId] = useState<AvatarId>(currentAvatar.id || 'amara');
  const [selectedSkin, setSelectedSkin] = useState<SkinTone>(currentAvatar.skinTone || 'amber');
  const [selectedHair, setSelectedHair] = useState<Hairstyle>(currentAvatar.hairstyle || 'afro_puffs');
  const [selectedHeadwrap, setSelectedHeadwrap] = useState<Headwrap>(currentAvatar.headwrap || 'floral_crown');
  const [selectedGlasses, setSelectedGlasses] = useState<Glasses>(currentAvatar.glasses || 'none');
  const [selectedOutfit, setSelectedOutfit] = useState<Outfit>(currentAvatar.outfit || 'floral_sundress');
  const [customCategory, setCustomCategory] = useState<'character' | 'skin' | 'hair' | 'outfit' | 'accessories'>('character');
  const [outfitFilter, setOutfitFilter] = useState<'all' | 'standard' | 'pregnancy' | 'postpartum'>('all');
  const [savedToast, setSavedToast] = useState(false);

  // Companion Voice & Personality states
  const [selectedPersonality, setSelectedPersonality] = useState<AvatarPersonalityStyle>(currentAvatar.personalityStyle || 'supportive');
  const [selectedAccent, setSelectedAccent] = useState<AvatarAccent>(currentAvatar.accent || 'us');
  const [selectedMood, setSelectedMood] = useState<AvatarMood>(currentAvatar.mood || 'radiant');
  const [selectedPitch, setSelectedPitch] = useState<number>(currentAvatar.speechPitch ?? 1.05);
  const [selectedRate, setSelectedRate] = useState<number>(currentAvatar.speechRate ?? 0.93);
  const [isCompanionSpeaking, setIsCompanionSpeaking] = useState<boolean>(false);
  const [isCompanionWaving, setIsCompanionWaving] = useState<boolean>(false);

  if (!isOpen) return null;

  const progression = calculateAvatarProgression(user, currentAvatar);
  const speech = getAvatarCompanionSpeech(user, currentAvatar);
  const currentMood = calculateAvatarMood(user, currentAvatar);

  // Live preview avatar for customization and voice tabs
  const previewAvatar: Partial<UserAvatar> = {
    ...currentAvatar,
    id: selectedId,
    name: AVATAR_PRESETS[selectedId]?.name || currentAvatar.name,
    title: AVATAR_PRESETS[selectedId]?.title || currentAvatar.title,
    skinTone: selectedSkin,
    hairstyle: selectedHair,
    headwrap: selectedHeadwrap,
    glasses: selectedGlasses,
    outfit: selectedOutfit,
    personalityStyle: selectedPersonality,
    accent: selectedAccent,
    mood: selectedMood
  };

  const handleSelectPreset = (id: AvatarId) => {
    setSelectedId(id);
    const preset = AVATAR_PRESETS[id];
    if (preset) {
      setSelectedSkin(preset.skinTone);
      setSelectedHair(preset.hairstyle);
      setSelectedHeadwrap(preset.headwrap);
      setSelectedGlasses(preset.glasses);
      setSelectedOutfit(user.isPregnancyMode ? 'maternity_wrap' : user.isPostpartumMode ? 'nursing_robe' : preset.outfit);
      setSelectedPersonality(preset.defaultPersonality || 'supportive');
      setSelectedAccent(preset.defaultAccent || 'us');
    }
  };

  const handlePlayVoiceGreeting = () => {
    if (isCompanionSpeaking) {
      stopWelcomeVoice();
      setIsCompanionSpeaking(false);
      return;
    }
    const greeting = getWelcomeGreeting(user);
    playWelcomeVoiceGreeting(user, {
      force: true,
      customGreeting: greeting,
      onStart: () => setIsCompanionSpeaking(true),
      onEnd: () => setIsCompanionSpeaking(false),
      onError: () => setIsCompanionSpeaking(false)
    }).catch(() => setIsCompanionSpeaking(false));
  };

  const handlePlayIntroductionVoice = (id: AvatarId = selectedId) => {
    setIsCompanionWaving(true);
    setTimeout(() => setIsCompanionWaving(false), 2800);
    playAvatarIntroduction(id, user, {
      accent: selectedAccent,
      personality: selectedPersonality,
      onStart: () => setIsCompanionSpeaking(true),
      onEnd: () => setIsCompanionSpeaking(false)
    }).catch(() => setIsCompanionSpeaking(false));
  };

  const handleSaveCustomization = async () => {
    const updatedAvatar: UserAvatar = {
      ...currentAvatar,
      id: selectedId,
      name: AVATAR_PRESETS[selectedId]?.name || currentAvatar.name,
      title: AVATAR_PRESETS[selectedId]?.title || currentAvatar.title,
      personality: AVATAR_PRESETS[selectedId]?.personality || currentAvatar.personality,
      skinTone: selectedSkin,
      hairstyle: selectedHair,
      headwrap: selectedHeadwrap,
      glasses: selectedGlasses,
      outfit: selectedOutfit,
      personalityStyle: selectedPersonality,
      accent: selectedAccent,
      mood: selectedMood,
      speechPitch: selectedPitch,
      speechRate: selectedRate
    };

    const updatedUser: User = {
      ...user,
      avatar: updatedAvatar
    };

    if (setUser) {
      setUser(updatedUser);
    }
    await syncUser(updatedUser);

    setSavedToast(true);
    setTimeout(() => {
      setSavedToast(false);
      setActiveTab('dashboard');
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-5 bg-stone-900/60 backdrop-blur-md animate-fadeIn text-left font-sans select-none">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="bg-white dark:bg-[#1a1816] rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl relative border border-stone-200/80 dark:border-[#2e2a26] flex flex-col max-h-[92vh]"
      >
        {/* Modal Header */}
        <div className="p-5 md:p-6 border-b border-stone-100 dark:border-[#2e2a26] flex items-center justify-between bg-white dark:bg-[#1a1816]">
          <div className="flex items-center gap-3">
            <AvatarVisual avatar={activeTab === 'customize' ? previewAvatar : currentAvatar} size="sm" />
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-semibold text-pink-600 dark:text-pink-400">
                  Lumina Companion
                </span>
                <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-pink-50 dark:bg-pink-950/40 text-pink-700 dark:text-pink-300 border border-pink-200/70 dark:border-pink-900/40 tabular-nums">
                  Level {progression.level}
                </span>
              </div>
              <h3 className="text-lg sm:text-xl font-serif text-stone-900 dark:text-stone-100 font-bold">
                {activeTab === 'customize' ? previewAvatar.name : currentAvatar.name} · {activeTab === 'customize' ? previewAvatar.title : currentAvatar.title}
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="w-9 h-9 rounded-xl bg-stone-100 dark:bg-[#23201d] hover:bg-stone-200 dark:hover:bg-[#2b2724] text-stone-500 dark:text-stone-300 flex items-center justify-center transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="px-6 py-2.5 flex gap-1.5 border-b border-stone-100 dark:border-[#2e2a26] bg-[#faf8f6] dark:bg-[#161412] overflow-x-auto scrollbar-hide">
          {[
            { id: 'dashboard', label: 'Dashboard' },
            { id: 'customize', label: 'Customize Studio' },
            { id: 'voice', label: 'Voice & Personality' },
            { id: 'rewards', label: 'Actions & Rewards' },
          ].map(tab => (
            <button
              type="button"
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                activeTab === tab.id
                  ? 'bg-pink-600 text-white shadow-xs'
                  : 'text-stone-600 dark:text-stone-300 hover:text-stone-900 dark:hover:text-white hover:bg-white dark:hover:bg-[#23201d]'
              }`}
            >
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-6 md:p-7 overflow-y-auto space-y-6 flex-1 bg-white dark:bg-[#1a1816]">

          {/* ================= TAB 1: AVATAR DASHBOARD ================= */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6 animate-fadeIn">

              {/* Hero Companion Speech & Interactive Presence Card */}
              <div className="bg-gradient-to-br from-pink-600 to-rose-600 rounded-2xl p-6 text-white shadow-sm flex flex-col sm:flex-row items-center gap-6 relative overflow-visible">

                <div 
                  onClick={() => handlePlayIntroductionVoice(currentAvatar.id)}
                  className="relative z-10 flex flex-col items-center text-center sm:text-left sm:items-start shrink-0 cursor-pointer group"
                  title="Click to hear companion wave and speak"
                >
                  <AvatarVisual 
                    avatar={{
                      ...currentAvatar,
                      mood: currentMood.mood
                    }} 
                    size="xl" 
                    showTierBadge
                    showMoodBadge 
                    interactive 
                    isSpeaking={isCompanionSpeaking}
                    isWaving={isCompanionWaving}
                    className="shadow-lg shadow-pink-700/20 group-hover:scale-105 transition-all"
                  />
                  <span className="text-xs font-semibold text-white mt-2.5 bg-white/20 px-3 py-1 rounded-lg border border-white/25">
                    Tier: {progression.tierLabel}
                  </span>
                </div>

                <div className="relative z-10 flex-1 space-y-3 text-center sm:text-left">
                  <div className="flex items-center justify-center sm:justify-start gap-2 flex-wrap">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white/20 text-white text-xs font-semibold border border-white/25">
                      <span>{speech.emoji}</span>
                      <span>{speech.phaseLabel}</span>
                    </div>

                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white/15 text-white text-xs font-medium border border-white/20">
                      <span>{currentMood.emoji}</span>
                      <span>Mood: {currentMood.label}</span>
                    </div>
                  </div>

                  <h4 className="text-xl sm:text-2xl font-serif text-white font-bold leading-snug">
                    "{speech.companionMessage}"
                  </h4>

                  <p className="text-xs text-pink-100 font-medium">
                    {speech.cycleStatusText}
                  </p>

                  <div className="pt-2 flex flex-wrap items-center justify-center sm:justify-start gap-2">
                    <button
                      onClick={() => {
                        onClose();
                        onOpenChat?.();
                      }}
                      className="px-4 py-2 bg-amber-300 hover:bg-amber-200 text-stone-900 rounded-xl font-semibold text-xs shadow-xs transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap shrink-0"
                    >
                      <span>💬 Chat with {currentAvatar.name || 'Amara'}</span>
                    </button>
                    <button
                      onClick={handlePlayVoiceGreeting}
                      className="px-4 py-2 bg-white text-pink-700 hover:bg-pink-50 rounded-xl font-semibold text-xs shadow-xs transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap shrink-0"
                    >
                      {isCompanionSpeaking ? <VolumeX size={13} /> : <Volume2 size={13} />}
                      <span>{isCompanionSpeaking ? 'Stop voice' : 'Play greeting'}</span>
                    </button>
                    <button
                      onClick={() => handlePlayIntroductionVoice(currentAvatar.id)}
                      className="px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-xl font-semibold text-xs border border-white/25 transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap shrink-0"
                    >
                      <span>👋 Wave & introduce</span>
                    </button>
                    <button
                      onClick={() => setActiveTab('voice')}
                      className="px-4 py-2 bg-white/15 hover:bg-white/25 text-white rounded-xl font-semibold text-xs border border-white/20 transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap shrink-0"
                    >
                      <span>🎙️ Voice studio</span>
                      <ArrowRight size={12} />
                    </button>
                  </div>
                </div>
              </div>

              {/* Active Companion Telemetry */}
              <div>
                <h4 className="text-xs font-semibold text-pink-600 dark:text-pink-400 mb-3 px-1">
                  Active companion telemetry
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 tabular-nums">
                  
                  {/* Card 1: Companion Level */}
                  <div className="bg-[#faf8f6] dark:bg-[#23201d] border border-stone-200/80 dark:border-[#342f2b] p-4 rounded-2xl space-y-1.5 shadow-xs">
                    <div className="flex justify-between items-center text-xs font-semibold text-pink-600 dark:text-pink-400">
                      <span>Companion level</span>
                      <span aria-hidden="true">🌸</span>
                    </div>
                    <p className="text-xl sm:text-2xl font-serif text-stone-900 dark:text-stone-100 font-bold">
                      Level {progression.level}
                    </p>
                    <div className="w-full bg-pink-100 dark:bg-pink-950/60 h-1.5 rounded-full overflow-hidden mt-1">
                      <div 
                        className="bg-pink-600 h-full rounded-full transition-all duration-500" 
                        style={{ width: `${progression.xpInLevel}%` }}
                      />
                    </div>
                    <span className="text-[11px] text-stone-500 dark:text-stone-400 font-medium block pt-0.5">
                      {progression.xpInLevel} / {progression.xpForNextLevel} XP to Level {progression.level + 1}
                    </span>
                  </div>

                  {/* Card 2: Wellness Streak */}
                  <div className="bg-[#faf8f6] dark:bg-[#23201d] border border-stone-200/80 dark:border-[#342f2b] p-4 rounded-2xl space-y-1.5 shadow-xs">
                    <div className="flex justify-between items-center text-xs font-semibold text-amber-600 dark:text-amber-400">
                      <span>Wellness streak</span>
                      <span aria-hidden="true">🔥</span>
                    </div>
                    <p className="text-xl sm:text-2xl font-serif text-amber-800 dark:text-amber-200 font-bold">
                      {progression.wellnessStreak} <span className="text-xs font-sans font-semibold text-amber-600 dark:text-amber-400">days</span>
                    </p>
                    <p className="text-[11px] text-stone-500 dark:text-stone-400">
                      Consecutive self-care journey
                    </p>
                  </div>

                  {/* Card 3: Current Cycle Phase */}
                  <div className="bg-[#faf8f6] dark:bg-[#23201d] border border-stone-200/80 dark:border-[#342f2b] p-4 rounded-2xl space-y-1.5 shadow-xs">
                    <div className="flex justify-between items-center text-xs font-semibold text-purple-600 dark:text-purple-400">
                      <span>Cycle phase</span>
                      <span aria-hidden="true">🌙</span>
                    </div>
                    <p className="text-base sm:text-lg font-serif text-purple-900 dark:text-purple-200 font-bold leading-tight">
                      {speech.phaseLabel}
                    </p>
                    <p className="text-[11px] text-stone-500 dark:text-stone-400">
                      Live hormonal awareness
                    </p>
                  </div>

                  {/* Card 4: Self-Care Score */}
                  <div className="bg-[#faf8f6] dark:bg-[#23201d] border border-stone-200/80 dark:border-[#342f2b] p-4 rounded-2xl space-y-1.5 shadow-xs">
                    <div className="flex justify-between items-center text-xs font-semibold text-teal-700 dark:text-teal-400">
                      <span>Self-care score</span>
                      <span aria-hidden="true">🌿</span>
                    </div>
                    <p className="text-xl sm:text-2xl font-serif text-teal-800 dark:text-teal-200 font-bold">
                      {progression.selfCareScore}%
                    </p>
                    <p className="text-[11px] text-stone-500 dark:text-stone-400">
                      Habits & journal harmony
                    </p>
                  </div>

                </div>
              </div>

              {/* Meaningful Avatar Progression Tiers Showcase */}
              <div className="bg-[#faf8f6] dark:bg-[#23201d] border border-stone-200/80 dark:border-[#342f2b] rounded-2xl p-5 sm:p-6 space-y-4 shadow-xs">
                <div className="flex flex-wrap justify-between items-center gap-2">
                  <div>
                    <h4 className="text-sm font-semibold text-stone-900 dark:text-stone-100">
                      Avatar progression journey
                    </h4>
                    <p className="text-xs text-stone-500 dark:text-stone-400">
                      Tiers advance meaningfully through cycle documentation and symptom tracking.
                    </p>
                  </div>
                  <span className={`px-3 py-1 rounded-xl text-xs font-semibold border whitespace-nowrap shrink-0 ${progression.tierBadgeColor}`}>
                    Active: {progression.tierLabel}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { id: 'seedling', label: 'Seedling', req: '0–5 cycles logged', icon: '🌱', active: true },
                    { id: 'blooming', label: 'Blooming', req: '6+ cycles & tracking', icon: '🌸', active: progression.cyclesLogged >= 6 },
                    { id: 'radiant', label: 'Radiant', req: '12+ cycles & engagement', icon: '💎', active: progression.cyclesLogged >= 12 },
                    { id: 'flourishing', label: 'Flourishing', req: '18+ cycles logged', icon: '👑', active: progression.cyclesLogged >= 18 }
                  ].map(tierItem => (
                    <div 
                      key={tierItem.id}
                      className={`p-3.5 rounded-xl border text-center transition-all ${
                        progression.tier === tierItem.id 
                          ? 'bg-pink-50 dark:bg-pink-950/40 border-pink-400 dark:border-pink-700 ring-1 ring-pink-400 shadow-xs'
                          : tierItem.active
                          ? 'bg-white dark:bg-[#1a1816] border-stone-200/80 dark:border-[#342f2b] text-stone-700 dark:text-stone-200'
                          : 'bg-white/60 dark:bg-[#1a1816]/60 border-dashed border-stone-300 dark:border-[#342f2b] opacity-65 text-stone-400'
                      }`}
                    >
                      <span className="text-2xl block mb-1" aria-hidden="true">{tierItem.icon}</span>
                      <h5 className="font-serif font-bold text-xs text-stone-900 dark:text-stone-100">{tierItem.label}</h5>
                      <span className="text-[11px] text-stone-500 dark:text-stone-400 block leading-tight mt-0.5">{tierItem.req}</span>
                      {progression.tier === tierItem.id && (
                        <span className="inline-block mt-1.5 px-2 py-0.5 bg-pink-600 text-white text-[11px] font-semibold rounded-md">
                          Current tier
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

            </div>
          )}

          {/* ================= TAB 2: AVATAR CUSTOMIZATION ================= */}
          {activeTab === 'customize' && (
            <div className="space-y-6 animate-fadeIn">
              
              {/* Live Preview Display Card */}
              <div className="bg-[#faf8f6] dark:bg-[#23201d] p-6 rounded-2xl border border-stone-200/80 dark:border-[#342f2b] flex flex-col sm:flex-row items-center gap-6 shadow-xs">
                <AvatarVisual avatar={previewAvatar} size="xl" className="shadow-md" />
                
                <div className="flex-1 text-center sm:text-left space-y-1.5">
                  <span className="text-xs font-semibold text-pink-600 dark:text-pink-400 block">
                    Live customization studio
                  </span>
                  <h3 className="text-2xl font-serif text-stone-900 dark:text-stone-100 font-bold">
                    {previewAvatar.name} • {previewAvatar.title}
                  </h3>
                  <p className="text-xs text-stone-500 dark:text-stone-400 max-w-md">
                    "{AVATAR_PRESETS[selectedId]?.quote}"
                  </p>
                  
                  <div className="flex flex-wrap gap-1.5 justify-center sm:justify-start pt-1">
                    <span className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-white dark:bg-[#1a1816] border border-stone-200/80 dark:border-[#342f2b] text-pink-700 dark:text-pink-300">
                      Skin: {SKIN_TONE_PALETTES[selectedSkin]?.label}
                    </span>
                    <span className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-white dark:bg-[#1a1816] border border-stone-200/80 dark:border-[#342f2b] text-pink-700 dark:text-pink-300">
                      Hair: {HAIRSTYLES_LIST.find(h => h.id === selectedHair)?.label}
                    </span>
                    <span className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-white dark:bg-[#1a1816] border border-stone-200/80 dark:border-[#342f2b] text-pink-700 dark:text-pink-300">
                      Outfit: {OUTFITS_LIST.find(o => o.id === selectedOutfit)?.label}
                    </span>
                  </div>
                </div>

                <div className="shrink-0 flex sm:flex-col gap-2">
                  <button
                    onClick={handleSaveCustomization}
                    className="px-5 py-3 bg-pink-600 hover:bg-pink-700 text-white font-semibold text-xs rounded-xl shadow-xs transition-all cursor-pointer flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0"
                  >
                    <Check size={14} />
                    <span>{savedToast ? 'Saved! ✨' : 'Save avatar'}</span>
                  </button>
                </div>
              </div>

              {/* Customization Sub-categories */}
              <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
                {[
                  { id: 'character', label: 'Companions (6)', icon: '🌸' },
                  { id: 'skin', label: 'Skin tones (7)', icon: '🎨' },
                  { id: 'hair', label: 'Hairstyles (8)', icon: '💇🏽‍♀️' },
                  { id: 'outfit', label: 'Outfits (10)', icon: '👗' },
                  { id: 'accessories', label: 'Headwraps & glasses', icon: '👑' }
                ].map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => setCustomCategory(cat.id as any)}
                    className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                      customCategory === cat.id
                        ? 'bg-pink-600 text-white shadow-xs'
                        : 'bg-[#faf8f6] dark:bg-[#23201d] border border-stone-200/80 dark:border-[#342f2b] text-stone-700 dark:text-stone-200 hover:border-pink-300'
                    }`}
                  >
                    <span>{cat.icon}</span>
                    <span>{cat.label}</span>
                  </button>
                ))}
              </div>

              {/* Sub-category 1: Signature Lumina Companions */}
              {customCategory === 'character' && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {(Object.keys(AVATAR_PRESETS) as AvatarId[]).map(id => {
                      const p = AVATAR_PRESETS[id];
                      const isSelected = selectedId === id;
                      return (
                        <div
                          key={id}
                          onClick={() => handleSelectPreset(id)}
                          className={`p-4 rounded-2xl border text-center transition-all cursor-pointer relative ${
                            isSelected
                              ? 'bg-pink-50 dark:bg-pink-950/40 border-pink-400 dark:border-pink-700 ring-1 ring-pink-400 shadow-xs'
                              : 'bg-[#faf8f6] dark:bg-[#23201d] border-stone-200/80 dark:border-[#342f2b] hover:border-pink-300'
                          }`}
                        >
                          <AvatarVisual 
                            avatar={{
                              id,
                              skinTone: p.skinTone,
                              hairstyle: p.hairstyle,
                              headwrap: p.headwrap,
                              glasses: p.glasses,
                              outfit: p.outfit
                            }} 
                            size="lg" 
                            className="mx-auto mb-2"
                          />
                          <h4 className="font-serif font-bold text-sm text-stone-900 dark:text-stone-100">{p.name}</h4>
                          <span className="text-[11px] font-semibold text-pink-600 dark:text-pink-400 block">{p.title}</span>
                          <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-1 leading-snug">{p.personality}</p>
                          {isSelected && (
                            <span className="absolute top-3 right-3 w-5 h-5 rounded-full bg-pink-600 text-white text-[10px] flex items-center justify-center font-bold">
                              ✓
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Sub-category 2: Skin Tones */}
              {customCategory === 'skin' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {(Object.keys(SKIN_TONE_PALETTES) as SkinTone[]).map(tone => {
                      const pal = SKIN_TONE_PALETTES[tone];
                      const isSelected = selectedSkin === tone;
                      return (
                        <div
                          key={tone}
                          onClick={() => setSelectedSkin(tone)}
                          className={`p-3.5 rounded-xl border flex items-center gap-3 cursor-pointer transition-all ${
                            isSelected
                              ? 'bg-pink-50 dark:bg-pink-950/40 border-pink-400 dark:border-pink-700 ring-1 ring-pink-400'
                              : 'bg-[#faf8f6] dark:bg-[#23201d] border-stone-200/80 dark:border-[#342f2b] hover:border-pink-300'
                          }`}
                        >
                          <div 
                            className="w-8 h-8 rounded-full border border-black/15 shadow-xs shrink-0" 
                            style={{ backgroundColor: pal.base }}
                          />
                          <div className="text-left flex-1 min-w-0">
                            <h5 className="font-serif font-bold text-xs text-stone-900 dark:text-stone-100 truncate">{pal.label}</h5>
                            <span className="text-[11px] text-stone-500 dark:text-stone-400 font-mono">{tone}</span>
                          </div>
                          {isSelected && <Check size={14} className="text-pink-600 dark:text-pink-400" />}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Sub-category 3: Hairstyles */}
              {customCategory === 'hair' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {HAIRSTYLES_LIST.map(hairItem => {
                      const isSelected = selectedHair === hairItem.id;
                      return (
                        <div
                          key={hairItem.id}
                          onClick={() => setSelectedHair(hairItem.id)}
                          className={`p-3.5 rounded-xl border text-center cursor-pointer transition-all ${
                            isSelected
                              ? 'bg-pink-50 dark:bg-pink-950/40 border-pink-400 dark:border-pink-700 ring-1 ring-pink-400'
                              : 'bg-[#faf8f6] dark:bg-[#23201d] border-stone-200/80 dark:border-[#342f2b] hover:border-pink-300'
                          }`}
                        >
                          <span className="text-2xl block mb-1" aria-hidden="true">{hairItem.icon}</span>
                          <h5 className="font-serif font-bold text-xs text-stone-900 dark:text-stone-100">{hairItem.label}</h5>
                          {isSelected && <span className="text-[11px] font-semibold text-pink-600 dark:text-pink-400 mt-0.5 block">Selected</span>}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Sub-category 4: Outfits */}
              {customCategory === 'outfit' && (
                <div className="space-y-4">
                  {/* Category Filter */}
                  <div className="flex flex-wrap gap-2">
                    {[
                      { id: 'all', label: 'All outfits' },
                      { id: 'standard', label: 'Daily & wellness' },
                      { id: 'pregnancy', label: '🤰 Maternal / bump' },
                      { id: 'postpartum', label: '👶 Postpartum recovery' }
                    ].map(f => (
                      <button
                        key={f.id}
                        onClick={() => setOutfitFilter(f.id as any)}
                        className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                          outfitFilter === f.id
                            ? 'bg-pink-600 text-white'
                            : 'bg-[#faf8f6] dark:bg-[#23201d] border border-stone-200/80 dark:border-[#342f2b] text-stone-600 dark:text-stone-300 hover:border-pink-300'
                        }`}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {OUTFITS_LIST
                      .filter(o => outfitFilter === 'all' || o.category === outfitFilter)
                      .map(o => {
                        const isSelected = selectedOutfit === o.id;
                        return (
                          <div
                            key={o.id}
                            onClick={() => setSelectedOutfit(o.id)}
                            className={`p-4 rounded-xl border flex items-start gap-3.5 cursor-pointer transition-all ${
                              isSelected
                                ? 'bg-pink-50 dark:bg-pink-950/40 border-pink-400 dark:border-pink-700 ring-1 ring-pink-400 shadow-xs'
                                : 'bg-[#faf8f6] dark:bg-[#23201d] border-stone-200/80 dark:border-[#342f2b] hover:border-pink-300'
                            }`}
                          >
                            <span className="text-2xl p-2 rounded-xl bg-white dark:bg-[#1a1816] shrink-0" aria-hidden="true">{o.icon}</span>
                            <div className="flex-1 min-w-0 text-left">
                              <div className="flex items-center justify-between gap-2">
                                <h5 className="font-serif font-bold text-xs text-stone-900 dark:text-stone-100">{o.label}</h5>
                                <span className="text-[11px] font-semibold text-pink-700 dark:text-pink-300 bg-pink-100 dark:bg-pink-950/60 px-2 py-0.5 rounded-md capitalize">
                                  {o.category}
                                </span>
                              </div>
                              <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-0.5 leading-snug">{o.desc}</p>
                            </div>
                            {isSelected && <Check size={16} className="text-pink-600 dark:text-pink-400 mt-1" />}
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}

              {/* Sub-category 5: Headwraps & Glasses */}
              {customCategory === 'accessories' && (
                <div className="space-y-6">
                  {/* Headwraps */}
                  <div>
                    <h5 className="text-xs font-semibold text-pink-600 dark:text-pink-400 mb-2.5">
                      Headwraps & floral crowns
                    </h5>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {HEADWRAPS_LIST.map(h => {
                        const isSelected = selectedHeadwrap === h.id;
                        return (
                          <div
                            key={h.id}
                            onClick={() => setSelectedHeadwrap(h.id)}
                            className={`p-3 rounded-xl border text-center cursor-pointer transition-all ${
                              isSelected
                                ? 'bg-pink-50 dark:bg-pink-950/40 border-pink-400 dark:border-pink-700 ring-1 ring-pink-400'
                                : 'bg-[#faf8f6] dark:bg-[#23201d] border-stone-200/80 dark:border-[#342f2b] hover:border-pink-300'
                            }`}
                          >
                            <span className="text-xl block mb-1" aria-hidden="true">{h.icon}</span>
                            <h6 className="font-serif font-bold text-xs text-stone-900 dark:text-stone-100">{h.label}</h6>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Glasses */}
                  <div>
                    <h5 className="text-xs font-semibold text-pink-600 dark:text-pink-400 mb-2.5">
                      Eyewear & glasses
                    </h5>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {GLASSES_LIST.map(g => {
                        const isSelected = selectedGlasses === g.id;
                        return (
                          <div
                            key={g.id}
                            onClick={() => setSelectedGlasses(g.id)}
                            className={`p-3 rounded-xl border text-center cursor-pointer transition-all ${
                              isSelected
                                ? 'bg-pink-50 dark:bg-pink-950/40 border-pink-400 dark:border-pink-700 ring-1 ring-pink-400'
                                : 'bg-[#faf8f6] dark:bg-[#23201d] border-stone-200/80 dark:border-[#342f2b] hover:border-pink-300'
                            }`}
                          >
                            <span className="text-xl block mb-1" aria-hidden="true">{g.icon}</span>
                            <h6 className="font-serif font-bold text-xs text-stone-900 dark:text-stone-100">{g.label}</h6>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* Bottom Sticky Action Bar */}
              <div className="pt-4 flex justify-between items-center border-t border-stone-200/80 dark:border-[#2e2a26]">
                <button
                  onClick={() => setActiveTab('dashboard')}
                  className="px-5 py-2.5 bg-[#faf8f6] dark:bg-[#23201d] border border-stone-200/80 dark:border-[#342f2b] text-stone-700 dark:text-stone-200 rounded-xl font-semibold text-xs hover:border-stone-400 transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveCustomization}
                  className="px-6 py-2.5 bg-pink-600 hover:bg-pink-700 text-white rounded-xl font-semibold text-xs shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <Check size={14} />
                  <span>{savedToast ? 'Saved!' : 'Save & set companion'}</span>
                </button>
              </div>

            </div>
          )}

          {/* ================= TAB 3: COMPANION VOICE & PERSONALITY STUDIO ================= */}
          {activeTab === 'voice' && (
            <div className="space-y-6 animate-fadeIn">
              
              {/* Voice Studio Hero Preview Card */}
              <div className="bg-[#faf8f6] dark:bg-[#23201d] p-5 rounded-2xl border border-stone-200/80 dark:border-[#342f2b] flex flex-col sm:flex-row items-center gap-5 shadow-xs text-left relative overflow-visible">
                <div className="shrink-0 relative">
                  <AvatarVisual
                    avatar={{
                      ...previewAvatar,
                      mood: selectedMood
                    }}
                    size="xl"
                    showMoodBadge
                    isSpeaking={isCompanionSpeaking}
                    isWaving={isCompanionWaving}
                    interactive
                    onClick={() => handlePlayIntroductionVoice(selectedId)}
                  />
                  <span className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-pink-600 text-white text-[10px] font-bold flex items-center justify-center border-2 border-white dark:border-[#23201d] shadow-xs">
                    {isCompanionSpeaking ? '🔊' : '🎙️'}
                  </span>
                </div>

                <div className="flex-1 min-w-0 space-y-2">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <h4 className="font-serif font-bold text-base text-stone-900 dark:text-stone-100">
                      {AVATAR_PRESETS[selectedId]?.name}'s Voice & Personality Sanctuary
                    </h4>
                    <span className="text-[11px] font-semibold text-pink-700 dark:text-pink-300 bg-white dark:bg-[#1a1816] px-2.5 py-0.5 rounded-lg border border-stone-200/80 dark:border-[#342f2b] capitalize">
                      {selectedPersonality} • {selectedAccent}
                    </span>
                  </div>

                  <p className="text-xs text-stone-600 dark:text-stone-300 leading-snug">
                    Fine-tune how your companion speaks, guides your health check-ins, and embodies unique emotional moods.
                  </p>

                  <div className="flex items-center gap-2 pt-1 flex-wrap">
                    <button
                      type="button"
                      onClick={() => handlePlayIntroductionVoice(selectedId)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-pink-600 hover:bg-pink-700 text-white text-xs font-semibold shadow-xs transition-all cursor-pointer"
                    >
                      {isCompanionSpeaking ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                      <span>{isCompanionSpeaking ? 'Speaking...' : 'Test introduction'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={handlePlayVoiceGreeting}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white dark:bg-[#1a1816] hover:border-pink-400 text-pink-700 dark:text-pink-300 text-xs font-semibold border border-stone-200/80 dark:border-[#342f2b] shadow-xs transition-all cursor-pointer"
                    >
                      <span>✨ Test health check-in</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* 1. Personality Styles */}
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <label className="text-xs font-semibold text-pink-600 dark:text-pink-400 flex items-center gap-1.5">
                    <span>🌸</span>
                    <span>Avatar personality style</span>
                  </label>
                  <span className="text-[11px] text-stone-500 dark:text-stone-400">Controls speech tone and encouragement style</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {PERSONALITY_OPTIONS.map((p) => {
                    const isSelected = selectedPersonality === p.id;
                    return (
                      <div
                        key={p.id}
                        onClick={() => setSelectedPersonality(p.id)}
                        className={`p-3.5 rounded-xl border text-left cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-pink-50 dark:bg-pink-950/40 border-pink-400 dark:border-pink-700 ring-1 ring-pink-400 shadow-xs'
                            : 'bg-[#faf8f6] dark:bg-[#23201d] border-stone-200/80 dark:border-[#342f2b] hover:border-pink-300'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-serif font-bold text-sm text-stone-900 dark:text-stone-100 flex items-center gap-1.5">
                            <span>{p.icon}</span>
                            <span>{p.label}</span>
                          </span>
                          {isSelected && <Check size={14} className="text-pink-600 dark:text-pink-400 font-bold" />}
                        </div>
                        <p className="text-xs text-stone-500 dark:text-stone-400 leading-snug">
                          {p.desc}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 2. Accents & Vocal Cadences */}
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <label className="text-xs font-semibold text-pink-600 dark:text-pink-400 flex items-center gap-1.5">
                    <span>🌍</span>
                    <span>Companion voice accent & cadence</span>
                  </label>
                  <span className="text-[11px] text-stone-500 dark:text-stone-400">Natural speech synthesis vocal accents</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {ACCENT_OPTIONS.map((acc) => {
                    const isSelected = selectedAccent === acc.id;
                    return (
                      <div
                        key={acc.id}
                        onClick={() => setSelectedAccent(acc.id)}
                        className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-pink-50 dark:bg-pink-950/40 border-pink-400 dark:border-pink-700 ring-1 ring-pink-400 shadow-xs'
                            : 'bg-[#faf8f6] dark:bg-[#23201d] border-stone-200/80 dark:border-[#342f2b] hover:border-pink-300'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-lg">{acc.flag}</span>
                          {isSelected && <Check size={13} className="text-pink-600 dark:text-pink-400" />}
                        </div>
                        <h6 className="font-serif font-bold text-xs text-stone-900 dark:text-stone-100">
                          {acc.label}
                        </h6>
                        <span className="text-[11px] text-stone-500 dark:text-stone-400 font-mono block mt-0.5">
                          {acc.langCodes[0]}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 3. Avatar Moods & Wellness Glow */}
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <label className="text-xs font-semibold text-pink-600 dark:text-pink-400 flex items-center gap-1.5">
                    <span>✨</span>
                    <span>Avatar mood & aura state</span>
                  </label>
                  <span className="text-[11px] text-stone-500 dark:text-stone-400">Adapts companion visual aura & expressions</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  {[
                    { id: 'radiant', label: 'Radiant', emoji: '🌸', desc: 'Peak vitality' },
                    { id: 'cozy', label: 'Cozy', emoji: '🍵', desc: 'Rest & comfort' },
                    { id: 'serene', label: 'Serene', emoji: '🌿', desc: 'Deep calm' },
                    { id: 'nurturing', label: 'Nurturing', emoji: '🤱🏽', desc: 'Maternal care' },
                    { id: 'energized', label: 'Energized', emoji: '☀️', desc: 'Active pace' },
                  ].map((m) => {
                    const isSelected = selectedMood === m.id;
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setSelectedMood(m.id as AvatarMood)}
                        className={`p-2.5 rounded-xl border text-center transition-colors cursor-pointer ${
                          isSelected
                            ? 'bg-pink-50 dark:bg-pink-950/40 border-pink-500 ring-1 ring-pink-400 shadow-xs'
                            : 'bg-[#faf8f6] dark:bg-[#23201d] border-stone-200/80 dark:border-[#342f2b] hover:border-pink-300'
                        }`}
                      >
                        <span className="text-xl block mb-0.5" aria-hidden="true">{m.emoji}</span>
                        <span className="font-serif font-bold text-xs text-stone-900 dark:text-stone-100 block">
                          {m.label}
                        </span>
                        <span className="text-[11px] text-stone-500 dark:text-stone-400 block truncate">
                          {m.desc}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 4. Fine Vocal Calibration (Pitch & Pace) */}
              <div className="bg-[#faf8f6] dark:bg-[#23201d] p-4 rounded-2xl border border-stone-200/80 dark:border-[#342f2b] space-y-4">
                <div className="flex items-center justify-between">
                  <h5 className="text-xs font-semibold text-pink-600 dark:text-pink-400 flex items-center gap-1.5">
                    <Sliders size={13} />
                    <span>Fine-tune companion vocal pitch & cadence</span>
                  </h5>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedPitch(1.05);
                      setSelectedRate(0.93);
                    }}
                    className="text-xs font-semibold text-stone-500 dark:text-stone-400 hover:text-pink-600 underline cursor-pointer"
                  >
                    Reset defaults
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left tabular-nums">
                  {/* Pitch slider */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs font-semibold text-stone-700 dark:text-stone-200">
                      <span>Vocal pitch</span>
                      <span className="text-pink-600 dark:text-pink-400">{Math.round(selectedPitch * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min="0.85"
                      max="1.25"
                      step="0.02"
                      value={selectedPitch}
                      onChange={(e) => setSelectedPitch(parseFloat(e.target.value))}
                      className="w-full accent-pink-600 cursor-pointer"
                    />
                    <div className="flex justify-between text-[11px] text-stone-500 dark:text-stone-400">
                      <span>Deeper</span>
                      <span>Gentle warmth</span>
                      <span>Brighter</span>
                    </div>
                  </div>

                  {/* Speech Rate slider */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs font-semibold text-stone-700 dark:text-stone-200">
                      <span>Speaking speed</span>
                      <span className="text-pink-600 dark:text-pink-400">{Math.round(selectedRate * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min="0.80"
                      max="1.15"
                      step="0.02"
                      value={selectedRate}
                      onChange={(e) => setSelectedRate(parseFloat(e.target.value))}
                      className="w-full accent-pink-600 cursor-pointer"
                    />
                    <div className="flex justify-between text-[11px] text-stone-500 dark:text-stone-400">
                      <span>Meditative slow</span>
                      <span>Natural pace</span>
                      <span>Spirited</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom Sticky Action Bar */}
              <div className="pt-4 flex justify-between items-center border-t border-stone-200/80 dark:border-[#2e2a26]">
                <button
                  onClick={() => setActiveTab('dashboard')}
                  className="px-5 py-2.5 bg-[#faf8f6] dark:bg-[#23201d] border border-stone-200/80 dark:border-[#342f2b] text-stone-700 dark:text-stone-200 rounded-xl font-semibold text-xs hover:border-stone-400 transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveCustomization}
                  className="px-6 py-2.5 bg-pink-600 hover:bg-pink-700 text-white rounded-xl font-semibold text-xs shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <Check size={14} />
                  <span>{savedToast ? 'Voice settings saved!' : 'Save voice & personality'}</span>
                </button>
              </div>

            </div>
          )}

          {/* ================= TAB 4: ACTIONS & REWARDS ================= */}
          {activeTab === 'rewards' && (
            <div className="space-y-6 animate-fadeIn">
              
              <div className="bg-amber-50/70 dark:bg-amber-950/30 p-5 rounded-2xl border border-amber-200/70 dark:border-amber-800/60 flex items-start gap-4">
                <span className="text-3xl p-2 rounded-xl bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300 shrink-0" aria-hidden="true">🏆</span>
                <div className="space-y-1">
                  <h4 className="font-serif font-bold text-base text-amber-950 dark:text-amber-100">
                    Unlock Avatar Rewards Through Meaningful Actions
                  </h4>
                  <p className="text-xs text-amber-900/85 dark:text-amber-200/85 leading-relaxed">
                    Avatar progression advances through real wellness interactions. Log cycles, track symptoms, complete yoga, and read guides to level up your companion.
                  </p>
                </div>
              </div>

              {/* Actions Grid */}
              <div className="space-y-3">
                <h5 className="text-xs font-semibold text-pink-600 dark:text-pink-400 px-1">
                  Active action rewards
                </h5>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    { action: 'log_cycle', label: 'Log completed cycle', points: '+50 XP', icon: '🩸', desc: 'Document period start & end dates in Tracker.' },
                    { action: 'track_symptoms', label: 'Track daily symptoms', points: '+10 XP', icon: '✨', desc: 'Record physical & emotional sensations.' },
                    { action: 'postpartum_yoga', label: 'Complete wellness yoga', points: '+25 XP', icon: '🧘🏽‍♀️', desc: 'Finish a restorative yoga or breathing session.' },
                    { action: 'read_guide', label: 'Read education guide', points: '+15 XP', icon: '📖', desc: 'Learn about reproductive and cycle health.' },
                    { action: 'self_care_challenge', label: 'Complete self-care challenge', points: '+30 XP', icon: '🌸', desc: 'Complete daily hydration and rest goals.' }
                  ].map(item => (
                    <div 
                      key={item.action}
                      className="bg-[#faf8f6] dark:bg-[#23201d] border border-stone-200/80 dark:border-[#342f2b] p-4 rounded-xl shadow-xs flex items-center justify-between gap-3 hover:border-pink-300 dark:hover:border-pink-800/70 transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-2xl p-2 rounded-xl bg-white dark:bg-[#1a1816] shrink-0" aria-hidden="true">{item.icon}</span>
                        <div className="text-left">
                          <h6 className="font-serif font-bold text-xs text-stone-900 dark:text-stone-100">{item.label}</h6>
                          <p className="text-[11px] text-stone-500 dark:text-stone-400">{item.desc}</p>
                        </div>
                      </div>
                      <span className="px-2.5 py-1 rounded-lg bg-pink-100 dark:bg-pink-950/60 text-pink-700 dark:text-pink-300 font-semibold text-xs shrink-0 tabular-nums">
                        {item.points}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action History Log */}
              <div className="bg-[#faf8f6] dark:bg-[#23201d] border border-stone-200/80 dark:border-[#342f2b] rounded-2xl p-5 space-y-3">
                <div className="flex justify-between items-center border-b border-stone-200/70 dark:border-[#342f2b] pb-2">
                  <h5 className="text-xs font-semibold text-stone-700 dark:text-stone-200">
                    Recent rewards earned
                  </h5>
                  <span className="text-xs text-pink-600 dark:text-pink-400 font-semibold tabular-nums">
                    Total XP: {progression.totalXP}
                  </span>
                </div>

                {(!currentAvatar.actionHistory || currentAvatar.actionHistory.length === 0) ? (
                  <div className="text-center py-6 text-stone-500 dark:text-stone-400 text-xs">
                    <span className="text-2xl block mb-1" aria-hidden="true">🌸</span>
                    No recent actions recorded. Complete a daily check-in to earn companion XP!
                  </div>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto tabular-nums">
                    {currentAvatar.actionHistory.slice(0, 10).map(act => (
                      <div key={act.id} className="flex justify-between items-center text-xs p-2.5 rounded-xl bg-white dark:bg-[#1a1816] border border-stone-200/60 dark:border-[#342f2b]">
                        <div className="flex items-center gap-2">
                          <span className="text-pink-500" aria-hidden="true">✨</span>
                          <span className="font-medium text-stone-800 dark:text-stone-100">{act.label}</span>
                        </div>
                        <span className="font-semibold text-pink-600 dark:text-pink-400 font-mono">+{act.points} XP</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>
          )}

        </div>
      </motion.div>
    </div>
  );
};

export default AvatarDashboardModal;
