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
  ArrowRight
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
  AvatarTier 
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
  logAvatarActionReward
} from '../services/avatarService';
import { syncUser } from '../services/firebaseService';

interface AvatarDashboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User;
  setUser?: React.Dispatch<React.SetStateAction<User | null>> | ((u: any) => void);
  onOpenLogModal?: () => void;
  onNavigateTab?: (tab: string) => void;
}

export const AvatarDashboardModal: React.FC<AvatarDashboardModalProps> = ({
  isOpen,
  onClose,
  user,
  setUser,
  onOpenLogModal,
  onNavigateTab
}) => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'customize' | 'rewards'>('dashboard');
  
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

  if (!isOpen) return null;

  const progression = calculateAvatarProgression(user, currentAvatar);
  const speech = getAvatarCompanionSpeech(user, currentAvatar);

  // Live preview avatar for customization tab
  const previewAvatar: Partial<UserAvatar> = {
    ...currentAvatar,
    id: selectedId,
    name: AVATAR_PRESETS[selectedId]?.name || currentAvatar.name,
    title: AVATAR_PRESETS[selectedId]?.title || currentAvatar.title,
    skinTone: selectedSkin,
    hairstyle: selectedHair,
    headwrap: selectedHeadwrap,
    glasses: selectedGlasses,
    outfit: selectedOutfit
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
    }
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
      outfit: selectedOutfit
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
        className="bg-white rounded-[2.8rem] w-full max-w-3xl overflow-hidden shadow-2xl relative border border-pink-100 flex flex-col max-h-[92vh]"
      >
        {/* Modal Header */}
        <div className="p-6 md:p-7 border-b border-pink-50 flex items-center justify-between bg-gradient-to-r from-pink-50/50 to-white">
          <div className="flex items-center gap-3">
            <AvatarVisual avatar={activeTab === 'customize' ? previewAvatar : currentAvatar} size="sm" />
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-pink-400">
                  Lumina Companion Sanctuary
                </span>
                <span className="px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider bg-pink-100 text-pink-600">
                  Level {progression.level}
                </span>
              </div>
              <h3 className="text-xl sm:text-2xl font-serif text-pink-600 font-bold italic">
                {activeTab === 'customize' ? previewAvatar.name : currentAvatar.name} • {activeTab === 'customize' ? previewAvatar.title : currentAvatar.title}
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="w-10 h-10 rounded-full bg-pink-50 hover:bg-pink-100 text-pink-400 flex items-center justify-center transition-all cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="px-6 pt-3 pb-2 flex gap-2 border-b border-pink-50/80 bg-pink-50/20 overflow-x-auto scrollbar-hide">
          {[
            { id: 'dashboard', label: 'Companion Dashboard', icon: '🌸' },
            { id: 'customize', label: 'Customize Studio', icon: '🎨' },
            { id: 'rewards', label: 'Actions & Rewards', icon: '🏆' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer ${
                activeTab === tab.id
                  ? 'bg-pink-500 text-white shadow-sm'
                  : 'text-gray-400 hover:text-pink-600 hover:bg-pink-50'
              }`}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-6 md:p-8 overflow-y-auto space-y-6 flex-1">
          
          {/* ================= TAB 1: AVATAR DASHBOARD ================= */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6 animate-fadeIn">
              
              {/* Hero Companion Speech & Interactive Presence Card */}
              <div className="bg-gradient-to-br from-pink-500 via-rose-500 to-pink-600 rounded-[2.5rem] p-6 sm:p-7 text-white shadow-xl shadow-pink-200/50 flex flex-col sm:flex-row items-center gap-6 relative overflow-hidden">
                <div className="absolute -right-8 -bottom-8 text-white/10 text-9xl font-black pointer-events-none select-none">
                  🌸
                </div>

                <div className="relative z-10 flex flex-col items-center text-center sm:text-left sm:items-start shrink-0">
                  <AvatarVisual 
                    avatar={currentAvatar} 
                    size="xl" 
                    showTierBadge 
                    interactive 
                    className="shadow-lg shadow-pink-700/20"
                  />
                  <span className="text-[10px] font-extrabold uppercase tracking-widest text-pink-100 mt-2 bg-white/20 px-2.5 py-0.5 rounded-full border border-white/20">
                    Tier: {progression.tierLabel}
                  </span>
                </div>

                <div className="relative z-10 flex-1 space-y-3 text-center sm:text-left">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 text-white text-[10px] font-black uppercase tracking-wider border border-white/30 backdrop-blur-md">
                    <span>{speech.emoji}</span>
                    <span>{speech.phaseLabel}</span>
                  </div>

                  <h4 className="text-xl sm:text-2xl font-serif italic text-white font-bold leading-snug">
                    "{speech.companionMessage}"
                  </h4>

                  <p className="text-xs text-pink-100 font-medium">
                    {speech.cycleStatusText}
                  </p>

                  <div className="pt-2 flex flex-wrap items-center justify-center sm:justify-start gap-2">
                    <button
                      onClick={() => setActiveTab('customize')}
                      className="px-4 py-2 bg-white text-pink-600 hover:bg-pink-50 rounded-full font-bold text-[9px] uppercase tracking-wider shadow-sm transition-all cursor-pointer flex items-center gap-1.5"
                    >
                      <span>🎨 Style & Customization</span>
                      <ArrowRight size={11} />
                    </button>
                    <button
                      onClick={() => {
                        onClose();
                        if (onOpenLogModal) onOpenLogModal();
                      }}
                      className="px-4 py-2 bg-pink-400/50 hover:bg-pink-400 text-white rounded-full font-bold text-[9px] uppercase tracking-wider border border-white/30 transition-all cursor-pointer flex items-center gap-1.5"
                    >
                      <span>✨ Log Today (+10 XP)</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Required Dashboard Telemetry: 4 Core Stat Cards */}
              {/* Companion Level 4 🌸 | 17-day wellness streak | Cycle phase: Luteal | Self-care score */}
              <div>
                <h4 className="text-xs font-black uppercase tracking-[0.2em] text-pink-400 mb-3 px-1">
                  Active Companion Telemetry
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
                  
                  {/* Card 1: Companion Level */}
                  <div className="bg-pink-50/30 border border-pink-100 p-4 rounded-3xl space-y-1 shadow-sm">
                    <div className="flex justify-between items-center text-[9px] font-black uppercase tracking-wider text-pink-400">
                      <span>Companion Level</span>
                      <span>🌸</span>
                    </div>
                    <p className="text-xl sm:text-2xl font-serif text-pink-600 font-extrabold italic">
                      Level {progression.level}
                    </p>
                    <div className="w-full bg-pink-100 h-1.5 rounded-full overflow-hidden mt-1">
                      <div 
                        className="bg-pink-500 h-full rounded-full transition-all duration-500" 
                        style={{ width: `${progression.xpInLevel}%` }}
                      />
                    </div>
                    <span className="text-[8.5px] text-gray-400 font-bold block pt-0.5">
                      {progression.xpInLevel} / {progression.xpForNextLevel} XP to Level {progression.level + 1}
                    </span>
                  </div>

                  {/* Card 2: Wellness Streak */}
                  <div className="bg-pink-50/30 border border-pink-100 p-4 rounded-3xl space-y-1 shadow-sm">
                    <div className="flex justify-between items-center text-[9px] font-black uppercase tracking-wider text-amber-500">
                      <span>Wellness Streak</span>
                      <span>🔥</span>
                    </div>
                    <p className="text-xl sm:text-2xl font-serif text-amber-700 font-extrabold italic">
                      {progression.wellnessStreak} <span className="text-xs font-sans not-italic font-bold text-amber-500">Days</span>
                    </p>
                    <p className="text-[9px] text-gray-400 italic">
                      Consecutive self-care journey
                    </p>
                  </div>

                  {/* Card 3: Current Cycle Phase */}
                  <div className="bg-pink-50/30 border border-pink-100 p-4 rounded-3xl space-y-1 shadow-sm">
                    <div className="flex justify-between items-center text-[9px] font-black uppercase tracking-wider text-purple-400">
                      <span>Cycle Phase</span>
                      <span>🌙</span>
                    </div>
                    <p className="text-base sm:text-lg font-serif text-purple-800 font-extrabold italic leading-tight">
                      {speech.phaseLabel}
                    </p>
                    <p className="text-[9px] text-gray-400 italic">
                      Live hormonal awareness
                    </p>
                  </div>

                  {/* Card 4: Self-Care Score */}
                  <div className="bg-pink-50/30 border border-pink-100 p-4 rounded-3xl space-y-1 shadow-sm">
                    <div className="flex justify-between items-center text-[9px] font-black uppercase tracking-wider text-teal-500">
                      <span>Self-Care Score</span>
                      <span>🌿</span>
                    </div>
                    <p className="text-xl sm:text-2xl font-serif text-teal-700 font-extrabold italic">
                      {progression.selfCareScore}%
                    </p>
                    <p className="text-[9px] text-gray-400 italic">
                      Habits & journal harmony
                    </p>
                  </div>

                </div>
              </div>

              {/* Meaningful Avatar Progression Tiers Showcase */}
              <div className="bg-white border border-pink-100 rounded-3xl p-5 sm:p-6 space-y-4 shadow-sm">
                <div className="flex justify-between items-center">
                  <div>
                    <h4 className="text-xs font-black uppercase tracking-wider text-pink-500">
                      Avatar Progression Journey
                    </h4>
                    <p className="text-[11px] text-gray-400 italic">
                      Tiers advance meaningfully through actual cycle documentation and regular symptom tracking.
                    </p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider border ${progression.tierBadgeColor}`}>
                    Active: {progression.tierLabel}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  {[
                    { id: 'seedling', label: 'Seedling', req: '0–5 cycles logged', icon: '🌱', active: true },
                    { id: 'blooming', label: 'Blooming', req: '6+ cycles & tracking', icon: '🌸', active: progression.cyclesLogged >= 6 },
                    { id: 'radiant', label: 'Radiant', req: '12+ cycles & engagement', icon: '💎', active: progression.cyclesLogged >= 12 },
                    { id: 'flourishing', label: 'Flourishing', req: '18+ cycles logged', icon: '👑', active: progression.cyclesLogged >= 18 }
                  ].map(tierItem => (
                    <div 
                      key={tierItem.id}
                      className={`p-3.5 rounded-2xl border text-center transition-all ${
                        progression.tier === tierItem.id 
                          ? 'bg-pink-50 border-pink-300 ring-2 ring-pink-400 shadow-sm'
                          : tierItem.active
                          ? 'bg-gray-50/80 border-gray-200 text-gray-700'
                          : 'bg-white border-dashed border-gray-200 opacity-60 text-gray-400'
                      }`}
                    >
                      <span className="text-2xl block mb-1">{tierItem.icon}</span>
                      <h5 className="font-serif font-bold text-xs text-gray-900">{tierItem.label}</h5>
                      <span className="text-[9px] text-gray-500 block leading-tight mt-0.5">{tierItem.req}</span>
                      {progression.tier === tierItem.id && (
                        <span className="inline-block mt-1 px-2 py-0.5 bg-pink-500 text-white text-[8px] font-black uppercase rounded-full">
                          Current Tier
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
              <div className="bg-gradient-to-r from-pink-50 via-rose-50 to-amber-50 p-6 rounded-3xl border border-pink-100 flex flex-col sm:flex-row items-center gap-6 shadow-sm">
                <AvatarVisual avatar={previewAvatar} size="xl" className="shadow-md" />
                
                <div className="flex-1 text-center sm:text-left space-y-1.5">
                  <span className="text-[10px] font-black uppercase tracking-widest text-pink-400">
                    Live Customization Studio
                  </span>
                  <h3 className="text-2xl font-serif text-pink-700 font-bold italic">
                    {previewAvatar.name} • {previewAvatar.title}
                  </h3>
                  <p className="text-xs text-gray-500 italic max-w-md">
                    "{AVATAR_PRESETS[selectedId]?.quote}"
                  </p>
                  
                  <div className="flex flex-wrap gap-1.5 justify-center sm:justify-start pt-1">
                    <span className="px-2.5 py-0.5 rounded-full text-[8.5px] font-bold uppercase bg-white border border-pink-200 text-pink-600">
                      Skin: {SKIN_TONE_PALETTES[selectedSkin]?.label}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full text-[8.5px] font-bold uppercase bg-white border border-pink-200 text-pink-600">
                      Hair: {HAIRSTYLES_LIST.find(h => h.id === selectedHair)?.label}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full text-[8.5px] font-bold uppercase bg-white border border-pink-200 text-pink-600">
                      Outfit: {OUTFITS_LIST.find(o => o.id === selectedOutfit)?.label}
                    </span>
                  </div>
                </div>

                <div className="shrink-0 flex sm:flex-col gap-2">
                  <button
                    onClick={handleSaveCustomization}
                    className="px-6 py-3 bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white font-black text-xs uppercase tracking-wider rounded-2xl shadow-md transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Check size={14} />
                    <span>{savedToast ? 'Saved! ✨' : 'Save Avatar'}</span>
                  </button>
                </div>
              </div>

              {/* Customization Sub-categories Pills */}
              <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
                {[
                  { id: 'character', label: 'Companions (6)', icon: '🌸' },
                  { id: 'skin', label: 'Skin Tones (7)', icon: '🎨' },
                  { id: 'hair', label: 'Hairstyles (8)', icon: '💇🏽‍♀️' },
                  { id: 'outfit', label: 'Outfits (10)', icon: '👗' },
                  { id: 'accessories', label: 'Headwraps & Glasses', icon: '👑' }
                ].map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => setCustomCategory(cat.id as any)}
                    className={`flex items-center gap-1.5 px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap ${
                      customCategory === cat.id
                        ? 'bg-pink-500 text-white shadow-xs'
                        : 'bg-white border border-pink-100 text-gray-500 hover:bg-pink-50/50'
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
                          className={`p-4 rounded-3xl border text-center transition-all cursor-pointer relative ${
                            isSelected
                              ? 'bg-pink-50/80 border-pink-400 ring-2 ring-pink-400 shadow-sm'
                              : 'bg-white border-pink-100 hover:border-pink-200'
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
                          <h4 className="font-serif font-black text-sm text-gray-900">{p.name}</h4>
                          <span className="text-[9px] font-bold text-pink-500 block uppercase tracking-wider">{p.title}</span>
                          <p className="text-[9.5px] text-gray-400 italic mt-1 leading-snug">{p.personality}</p>
                          {isSelected && (
                            <span className="absolute top-3 right-3 w-5 h-5 rounded-full bg-pink-500 text-white text-[10px] flex items-center justify-center font-bold">
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
                          className={`p-3.5 rounded-2xl border flex items-center gap-3 cursor-pointer transition-all ${
                            isSelected ? 'bg-pink-50 border-pink-400 ring-2 ring-pink-300' : 'bg-white border-pink-100 hover:bg-pink-50/30'
                          }`}
                        >
                          <div 
                            className="w-8 h-8 rounded-full border border-black/10 shadow-xs shrink-0" 
                            style={{ backgroundColor: pal.base }}
                          />
                          <div className="text-left flex-1 min-w-0">
                            <h5 className="font-serif font-bold text-xs text-gray-800 truncate">{pal.label}</h5>
                            <span className="text-[8.5px] text-gray-400 uppercase font-mono">{tone}</span>
                          </div>
                          {isSelected && <Check size={14} className="text-pink-500" />}
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
                          className={`p-3.5 rounded-2xl border text-center cursor-pointer transition-all ${
                            isSelected ? 'bg-pink-50 border-pink-400 ring-2 ring-pink-300' : 'bg-white border-pink-100 hover:bg-pink-50/30'
                          }`}
                        >
                          <span className="text-2xl block mb-1">{hairItem.icon}</span>
                          <h5 className="font-serif font-bold text-xs text-gray-800">{hairItem.label}</h5>
                          {isSelected && <span className="text-[9px] font-bold text-pink-500 uppercase mt-0.5 block">Selected</span>}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Sub-category 4: Outfits (Including Pregnancy & Postpartum Themes) */}
              {customCategory === 'outfit' && (
                <div className="space-y-4">
                  {/* Category Filter */}
                  <div className="flex gap-2">
                    {[
                      { id: 'all', label: 'All Outfits' },
                      { id: 'standard', label: 'Daily & Wellness' },
                      { id: 'pregnancy', label: '🤰 Maternal / Bump' },
                      { id: 'postpartum', label: '👶 Postpartum Recovery' }
                    ].map(f => (
                      <button
                        key={f.id}
                        onClick={() => setOutfitFilter(f.id as any)}
                        className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                          outfitFilter === f.id
                            ? 'bg-rose-500 text-white'
                            : 'bg-pink-50/60 text-gray-500 hover:bg-pink-100/50'
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
                            className={`p-4 rounded-2xl border flex items-start gap-3.5 cursor-pointer transition-all ${
                              isSelected ? 'bg-pink-50 border-pink-400 ring-2 ring-pink-300 shadow-xs' : 'bg-white border-pink-100 hover:bg-pink-50/20'
                            }`}
                          >
                            <span className="text-2xl p-2 rounded-xl bg-pink-50 shrink-0">{o.icon}</span>
                            <div className="flex-1 min-w-0 text-left">
                              <div className="flex items-center justify-between">
                                <h5 className="font-serif font-bold text-xs text-gray-900">{o.label}</h5>
                                <span className="text-[8px] font-black uppercase text-pink-500 bg-pink-100 px-2 py-0.5 rounded-full">
                                  {o.category}
                                </span>
                              </div>
                              <p className="text-[10px] text-gray-400 italic mt-0.5 leading-snug">{o.desc}</p>
                            </div>
                            {isSelected && <Check size={16} className="text-pink-500 mt-1" />}
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
                    <h5 className="text-[10px] font-black uppercase tracking-wider text-pink-400 mb-2">
                      Headwraps & Floral Crowns
                    </h5>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {HEADWRAPS_LIST.map(h => {
                        const isSelected = selectedHeadwrap === h.id;
                        return (
                          <div
                            key={h.id}
                            onClick={() => setSelectedHeadwrap(h.id)}
                            className={`p-3 rounded-2xl border text-center cursor-pointer transition-all ${
                              isSelected ? 'bg-pink-50 border-pink-400 ring-2 ring-pink-300' : 'bg-white border-pink-100 hover:bg-pink-50/30'
                            }`}
                          >
                            <span className="text-xl block mb-1">{h.icon}</span>
                            <h6 className="font-serif font-bold text-xs text-gray-800">{h.label}</h6>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Glasses */}
                  <div>
                    <h5 className="text-[10px] font-black uppercase tracking-wider text-pink-400 mb-2">
                      Eyewear & Glasses
                    </h5>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {GLASSES_LIST.map(g => {
                        const isSelected = selectedGlasses === g.id;
                        return (
                          <div
                            key={g.id}
                            onClick={() => setSelectedGlasses(g.id)}
                            className={`p-3 rounded-2xl border text-center cursor-pointer transition-all ${
                              isSelected ? 'bg-pink-50 border-pink-400 ring-2 ring-pink-300' : 'bg-white border-pink-100 hover:bg-pink-50/30'
                            }`}
                          >
                            <span className="text-xl block mb-1">{g.icon}</span>
                            <h6 className="font-serif font-bold text-xs text-gray-800">{g.label}</h6>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* Bottom Sticky Action Bar */}
              <div className="pt-2 flex justify-between items-center border-t border-pink-50">
                <button
                  onClick={() => setActiveTab('dashboard')}
                  className="px-5 py-2.5 bg-gray-100 text-gray-600 rounded-2xl font-bold text-xs uppercase tracking-wider hover:bg-gray-200 transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveCustomization}
                  className="px-8 py-3 bg-gradient-to-r from-pink-500 to-rose-500 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-md hover:scale-[1.02] active:scale-95 transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <Check size={14} />
                  <span>{savedToast ? 'Saved!' : 'Save & Set Companion'}</span>
                </button>
              </div>

            </div>
          )}

          {/* ================= TAB 3: ACTIONS & REWARDS ================= */}
          {activeTab === 'rewards' && (
            <div className="space-y-6 animate-fadeIn">
              
              <div className="bg-gradient-to-r from-amber-50 to-pink-50 p-5 rounded-3xl border border-amber-200/60 flex items-start gap-4">
                <span className="text-3xl p-2 rounded-2xl bg-amber-100/70 text-amber-700 shrink-0">🏆</span>
                <div className="space-y-1">
                  <h4 className="font-serif font-bold text-base text-amber-900">
                    Unlock Avatar Rewards Through Meaningful Actions
                  </h4>
                  <p className="text-xs text-amber-800/80 leading-relaxed font-medium">
                    Avatar progression advances through real wellness interactions—not just passing time. Log cycles, track symptoms, complete yoga, and read guides to level up your companion!
                  </p>
                </div>
              </div>

              {/* Actions Grid */}
              <div className="space-y-3">
                <h5 className="text-[10px] font-black uppercase tracking-wider text-pink-400 px-1">
                  Active Action Rewards
                </h5>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    { action: 'log_cycle', label: 'Log Completed Cycle', points: '+50 XP', icon: '🩸', desc: 'Document period start & end dates in Tracker.' },
                    { action: 'track_symptoms', label: 'Track Daily Symptoms', points: '+10 XP', icon: '✨', desc: 'Record physical & emotional sensations.' },
                    { action: 'postpartum_yoga', label: 'Complete Postpartum/Wellness Yoga', points: '+25 XP', icon: '🧘🏽‍♀️', desc: 'Finish a restorative yoga or breathing session.' },
                    { action: 'read_guide', label: 'Read Sanctuary Education Guide', points: '+15 XP', icon: '📖', desc: 'Learn about reproductive and cycle health.' },
                    { action: 'self_care_challenge', label: 'Complete Self-Care Challenge', points: '+30 XP', icon: '🌸', desc: 'Complete daily hydration and rest goals.' }
                  ].map(item => (
                    <div 
                      key={item.action}
                      className="bg-white border border-pink-100 p-4 rounded-2xl shadow-sm flex items-center justify-between gap-3 hover:border-pink-200 transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-2xl p-2 rounded-xl bg-pink-50 shrink-0">{item.icon}</span>
                        <div className="text-left">
                          <h6 className="font-serif font-bold text-xs text-gray-900">{item.label}</h6>
                          <p className="text-[9.5px] text-gray-400 italic">{item.desc}</p>
                        </div>
                      </div>
                      <span className="px-2.5 py-1 rounded-xl bg-pink-100 text-pink-700 font-black text-xs shrink-0">
                        {item.points}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action History Log */}
              <div className="bg-white border border-pink-100 rounded-3xl p-5 space-y-3">
                <div className="flex justify-between items-center border-b border-pink-50 pb-2">
                  <h5 className="text-[10px] font-black uppercase tracking-wider text-gray-500">
                    Recent Rewards Earned
                  </h5>
                  <span className="text-[9px] text-pink-500 font-bold">
                    Total XP: {progression.totalXP}
                  </span>
                </div>

                {(!currentAvatar.actionHistory || currentAvatar.actionHistory.length === 0) ? (
                  <div className="text-center py-6 text-gray-400 italic text-xs">
                    <span className="text-2xl block mb-1">🌸</span>
                    No recent actions recorded. Complete a daily check-in to earn companion XP!
                  </div>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {currentAvatar.actionHistory.slice(0, 10).map(act => (
                      <div key={act.id} className="flex justify-between items-center text-xs p-2 rounded-xl bg-pink-50/30">
                        <div className="flex items-center gap-2">
                          <span className="text-pink-500">✨</span>
                          <span className="font-medium text-gray-800">{act.label}</span>
                        </div>
                        <span className="font-bold text-pink-600 font-mono">+{act.points} XP</span>
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
