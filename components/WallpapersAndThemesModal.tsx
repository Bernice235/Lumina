import React, { useState } from 'react';
import { User, AppTheme } from '../types';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, Check, Moon, Sun, Heart, Palette, RefreshCw } from 'lucide-react';
import { syncUser } from '../services/firebaseService';

export interface WallpaperItem {
  id: string;
  name: string;
  category: 'lumina' | 'partner' | 'sanctuary';
  gradient: string;
  theme: AppTheme;
  icon: string;
  description: string;
  badge: string;
}

export const WALLPAPER_LIST: WallpaperItem[] = [
  // 🌸 Lumina Wallpapers
  {
    id: 'cherry_blossom',
    name: 'Cherry Blossom Sanctuary',
    category: 'lumina',
    gradient: 'from-pink-100 via-rose-50 to-pink-200/50',
    theme: 'rose',
    icon: '🌸',
    description: 'Soft sakura petals and gentle morning light for a peaceful sanctuary.',
    badge: 'Lumina Classic'
  },
  {
    id: 'rose_quartz',
    name: 'Rose Quartz',
    category: 'lumina',
    gradient: 'from-rose-100/80 via-pink-50 to-rose-200/60',
    theme: 'rose',
    icon: '💎',
    description: 'Radiant crystal quartz tones that inspire self-compassion and warmth.',
    badge: 'Healing Crystal'
  },
  {
    id: 'moon_garden',
    name: 'Moon Garden',
    category: 'lumina',
    gradient: 'from-purple-100/70 via-indigo-50/60 to-pink-100/60',
    theme: 'lavender',
    icon: '🌙',
    description: 'Serene midnight flora bathed in soft silver moonlight.',
    badge: 'Tranquil Night'
  },
  {
    id: 'aurora_wellness',
    name: 'Aurora Wellness',
    category: 'lumina',
    gradient: 'from-teal-100/70 via-emerald-50/60 to-sky-100/60',
    theme: 'mint',
    icon: '🌌',
    description: 'Refreshing pastel aurora light infused with revitalizing energy.',
    badge: 'Vitality Glow'
  },
  {
    id: 'floral_bloom',
    name: 'Floral Bloom',
    category: 'lumina',
    gradient: 'from-orange-100/70 via-pink-50 to-rose-100/60',
    theme: 'peach',
    icon: '🌺',
    description: 'Bright peony and peach blossoms for an uplifting, vibrant atmosphere.',
    badge: 'Joyful Spring'
  },
  {
    id: 'butterfly_dream',
    name: 'Butterfly Dream',
    category: 'lumina',
    gradient: 'from-fuchsia-100/70 via-purple-50 to-pink-100/60',
    theme: 'lilac',
    icon: '🦋',
    description: 'Ethereal lilac tones reminiscent of gentle butterfly wings in flight.',
    badge: 'Dreamy Lilac'
  },
  {
    id: 'ocean_serenity',
    name: 'Ocean Serenity',
    category: 'lumina',
    gradient: 'from-sky-100/70 via-cyan-50 to-teal-100/60',
    theme: 'sky',
    icon: '🌊',
    description: 'Calm ocean tides and fresh coastal breeze for deep mental clarity.',
    badge: 'Deep Peace'
  },
  {
    id: 'cloud_sanctuary',
    name: 'Cloud Sanctuary',
    category: 'lumina',
    gradient: 'from-slate-100/80 via-purple-50/50 to-pink-100/50',
    theme: 'periwinkle',
    icon: '☁️',
    description: 'Soft pastel haze and cotton-soft clouds above the horizon.',
    badge: 'Feather Soft'
  },

  // 💜 Partner Wallpapers
  {
    id: 'connected_hearts',
    name: 'Connected Hearts',
    category: 'partner',
    gradient: 'from-indigo-100/80 via-purple-50 to-pink-100/70',
    theme: 'periwinkle',
    icon: '💖',
    description: 'Harmonious indigo and heart pink designed for linked companion spaces.',
    badge: 'Shared Love'
  },
  {
    id: 'lavender_connection',
    name: 'Lavender Connection',
    category: 'partner',
    gradient: 'from-purple-150/70 via-indigo-50 to-fuchsia-100/60',
    theme: 'lavender',
    icon: '🪻',
    description: 'Deep soothing lavender field symbolizing mutual understanding and care.',
    badge: 'Empathy Flow'
  },
  {
    id: 'infinite_bond',
    name: 'Infinite Bond',
    category: 'partner',
    gradient: 'from-purple-900/15 via-indigo-900/15 to-pink-900/15 bg-purple-50/80',
    theme: 'lavender',
    icon: '♾️',
    description: 'Velvet twilight magenta celebrating unbreakable long-term devotion.',
    badge: 'Deep Bond'
  },
  {
    id: 'together',
    name: 'Together',
    category: 'partner',
    gradient: 'from-amber-100/80 via-rose-50 to-purple-100/60',
    theme: 'sunset',
    icon: '🤝',
    description: 'Warm golden hour glow that radiates support, trust, and companionship.',
    badge: 'Warm Unity'
  },
  {
    id: 'moon_and_sun',
    name: 'Moon & Sun',
    category: 'partner',
    gradient: 'from-amber-100/90 via-sky-50/70 to-indigo-100/70',
    theme: 'gold',
    icon: '🌗',
    description: 'Complementary golden sun and celestial moonlight paired together.',
    badge: 'Dual Harmony'
  },
  {
    id: 'support_growth',
    name: 'Support & Growth',
    category: 'partner',
    gradient: 'from-emerald-100/80 via-teal-50 to-indigo-50/50',
    theme: 'emerald',
    icon: '🌱',
    description: 'Lush spring foliage representing growth, health, and steadfast support.',
    badge: 'Companion Care'
  },

  // 🌙 Sanctuary Wallpapers
  {
    id: 'starry_night',
    name: 'Starry Night',
    category: 'sanctuary',
    gradient: 'from-slate-800/20 via-indigo-900/20 to-purple-900/20 bg-slate-50',
    theme: 'lavender',
    icon: '✨',
    description: 'Deep quiet dark canopy with sparkling starlight for restful evenings.',
    badge: 'Cosmic Rest'
  },
  {
    id: 'sakura_moon',
    name: 'Sakura Moon',
    category: 'sanctuary',
    gradient: 'from-pink-200/80 via-purple-100/60 to-slate-900/15',
    theme: 'rose',
    icon: '🌸',
    description: 'Twilight sakura blossoms floating beneath a luminous silver crescent.',
    badge: 'Night Blossom'
  },
  {
    id: 'northern_lights',
    name: 'Northern Lights',
    category: 'sanctuary',
    gradient: 'from-emerald-200/70 via-teal-100/60 to-purple-200/70',
    theme: 'mint',
    icon: '🔮',
    description: 'Enchanting polar aurora ribbons dancing softly in deep night skies.',
    badge: 'Aurora Glow'
  },
  {
    id: 'floating_lanterns',
    name: 'Floating Lanterns',
    category: 'sanctuary',
    gradient: 'from-amber-200/80 via-orange-100/60 to-rose-200/70',
    theme: 'amber',
    icon: '🏮',
    description: 'Warm glowing lanterns floating serenely with hopes and warm desires.',
    badge: 'Warm Glow'
  },
  {
    id: 'dream_clouds',
    name: 'Dream Clouds',
    category: 'sanctuary',
    gradient: 'from-blue-100/80 via-indigo-50 to-purple-100/70',
    theme: 'sky',
    icon: '☁️',
    description: 'Whimsical dusk cloudscape for unwinding before peaceful sleep.',
    badge: 'Twilight Haze'
  },
  {
    id: 'ocean_at_night',
    name: 'Ocean at Night',
    category: 'sanctuary',
    gradient: 'from-slate-800/25 via-sky-900/20 to-teal-900/20 bg-sky-50/80',
    theme: 'ocean',
    icon: '🌊',
    description: 'Deep nocturnal ocean tides whispering quiet comfort and equilibrium.',
    badge: 'Nocturnal Calm'
  }
];

export const CYCLE_WALLPAPERS = [
  {
    phase: 'Menstrual Phase',
    name: 'Soft Rose',
    emoji: '🌸',
    desc: 'Low energy & shedding. Comforting warm rose tones calm cramps and nurture rest.',
    gradient: 'from-rose-100 via-pink-100 to-rose-200/60',
    theme: 'rose' as AppTheme
  },
  {
    phase: 'Follicular Phase',
    name: 'Mint & Lavender',
    emoji: '🌿',
    desc: 'Rising estrogen & fresh optimism. Cool mint and soothing lavender energize mind & spirit.',
    gradient: 'from-teal-100 via-emerald-50 to-purple-100/70',
    theme: 'mint' as AppTheme
  },
  {
    phase: 'Ovulation Phase',
    name: 'Peach & Gold',
    emoji: '☀️',
    desc: 'Peak fertility & radiant confidence. Vibrant peach and golden sunlight celebrate magnetic charm.',
    gradient: 'from-orange-100 via-amber-100 to-yellow-100/60',
    theme: 'peach' as AppTheme
  },
  {
    phase: 'Luteal Phase',
    name: 'Purple & Midnight Blue',
    emoji: '🌙',
    desc: 'Progesterone shift & PMS sensitivity. Grounding royal purple and twilight blue shield your peace.',
    gradient: 'from-purple-150 via-indigo-100 to-slate-200/60',
    theme: 'lavender' as AppTheme
  }
];

interface WallpapersAndThemesModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User;
  setUser: React.Dispatch<React.SetStateAction<User | null>>;
}

export const WallpapersAndThemesModal: React.FC<WallpapersAndThemesModalProps> = ({
  isOpen,
  onClose,
  user,
  setUser
}) => {
  const [activeTab, setActiveTab] = useState<'lumina' | 'partner' | 'sanctuary' | 'dynamic'>('lumina');

  if (!isOpen) return null;

  const currentWallpaperId = user.wallpaper || 'cherry_blossom';
  const isDynamicActive = user.useCycleBasedWallpaper || false;

  const handleSelectWallpaper = async (item: WallpaperItem) => {
    const updatedUser: User = {
      ...user,
      wallpaper: item.id,
      theme: item.theme,
      useCycleBasedWallpaper: false
    };
    setUser(updatedUser);
    localStorage.setItem('lumina_user', JSON.stringify(updatedUser));
    await syncUser(updatedUser);
  };

  const handleToggleDynamic = async (enabled: boolean) => {
    const updatedUser: User = {
      ...user,
      useCycleBasedWallpaper: enabled
    };
    setUser(updatedUser);
    localStorage.setItem('lumina_user', JSON.stringify(updatedUser));
    await syncUser(updatedUser);
  };

  const selectedWallpaperObj = WALLPAPER_LIST.find(w => w.id === currentWallpaperId) || WALLPAPER_LIST[0];

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-stone-950/60 backdrop-blur-md z-[200] flex items-center justify-center p-3 sm:p-6 overflow-y-auto font-sans">
        
        {/* Backdrop click to close */}
        <div className="absolute inset-0" onClick={onClose} />

        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="bg-white/95 dark:bg-stone-900/95 backdrop-blur-2xl border border-white/80 dark:border-stone-800 rounded-[3rem] shadow-[0_25px_60px_rgba(244,114,182,0.12)] w-full max-w-4xl relative z-10 overflow-hidden my-auto max-h-[90vh] flex flex-col"
        >
          {/* Top Header */}
          <div className="px-6 py-5 md:px-8 md:py-6 border-b border-pink-100/40 dark:border-stone-800/80 bg-gradient-to-r from-pink-50/50 via-purple-50/30 to-indigo-50/40 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-pink-400 to-rose-500 text-white flex items-center justify-center text-xl shadow-md">
                🎨
              </div>
              <div>
                <div className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-pink-500">
                  <Sparkles size={11} className="animate-pulse" />
                  Personalization Sanctuary
                </div>
                <h2 className="text-2xl font-serif italic text-stone-900 dark:text-stone-100 font-bold">
                  Wallpapers & Themes
                </h2>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2.5 rounded-2xl bg-white dark:bg-stone-800 text-stone-500 hover:text-pink-600 hover:bg-pink-50 transition-all cursor-pointer border border-stone-200/60 dark:border-stone-700 shadow-sm"
            >
              <X size={18} />
            </button>
          </div>

          {/* Current Active Wallpaper Banner */}
          <div className="px-6 py-3 bg-gradient-to-r from-rose-500/10 via-purple-500/10 to-indigo-500/10 border-b border-pink-100/30 dark:border-stone-800 flex flex-wrap items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-stone-600 dark:text-stone-300">Active Wallpaper:</span>
              {isDynamicActive ? (
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 text-white text-[10px] font-black uppercase tracking-wider shadow-sm">
                  ✨ Dynamic Cycle Wallpapers Active
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white dark:bg-stone-800 text-stone-800 dark:text-stone-100 text-[10px] font-bold border border-pink-200/60 shadow-sm">
                  <span>{selectedWallpaperObj.icon}</span>
                  <span>{selectedWallpaperObj.name}</span>
                  <span className="text-pink-500 font-black">({selectedWallpaperObj.badge})</span>
                </span>
              )}
            </div>

            <p className="text-[10px] text-stone-400 italic">
              Changes apply instantly across your whole app experience.
            </p>
          </div>

          {/* Category Tabs */}
          <div className="px-6 pt-4 pb-2 border-b border-stone-100 dark:border-stone-800 bg-white/50 dark:bg-stone-900/50 flex gap-2 overflow-x-auto scrollbar-none shrink-0">
            {[
              { id: 'lumina', label: '🌸 Lumina Wallpapers' },
              { id: 'partner', label: '💜 Partner Wallpapers' },
              { id: 'sanctuary', label: '🌙 Sanctuary Wallpapers' },
              { id: 'dynamic', label: '✨ Dynamic Wallpapers' },
            ].map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer shrink-0 border ${
                    isActive
                      ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white border-transparent shadow-md font-extrabold'
                      : 'bg-stone-50 dark:bg-stone-800/60 text-stone-600 dark:text-stone-300 border-stone-200/60 dark:border-stone-700 hover:bg-pink-50/50 hover:text-pink-600'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Scrollable Content Body */}
          <div className="p-6 md:p-8 overflow-y-auto flex-grow space-y-6">

            {/* STATIC WALLPAPERS TABS (Lumina, Partner, Sanctuary) */}
            {activeTab !== 'dynamic' && (
              <div className="space-y-6">
                <div className="space-y-1">
                  <h3 className="text-lg font-serif italic text-stone-900 dark:text-stone-100 font-bold">
                    {activeTab === 'lumina' && '🌸 Lumina Wallpapers'}
                    {activeTab === 'partner' && '💜 Partner Wallpapers'}
                    {activeTab === 'sanctuary' && '🌙 Sanctuary Wallpapers'}
                  </h3>
                  <p className="text-xs text-stone-500 dark:text-stone-400">
                    {activeTab === 'lumina' && 'Soft pastel gradients and calming floral tones crafted for daily wellness.'}
                    {activeTab === 'partner' && 'Warm indigo and romantic themes designed to enhance partner connection.'}
                    {activeTab === 'sanctuary' && 'Deep nocturnal and starry atmospheres created for calm evenings and quiet rest.'}
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {WALLPAPER_LIST.filter(w => w.category === activeTab).map((wp) => {
                    const isSelected = !isDynamicActive && currentWallpaperId === wp.id;
                    return (
                      <div
                        key={wp.id}
                        onClick={() => handleSelectWallpaper(wp)}
                        className={`group relative rounded-[2.2rem] p-5 border transition-all duration-300 cursor-pointer overflow-hidden flex flex-col justify-between min-h-[200px] ${
                          isSelected
                            ? 'border-pink-500 ring-2 ring-pink-400/40 shadow-lg scale-[1.02]'
                            : 'border-stone-200/70 dark:border-stone-800 hover:border-pink-300 hover:shadow-md'
                        }`}
                      >
                        {/* Wallpaper Gradient Preview Canvas */}
                        <div className={`absolute inset-0 bg-gradient-to-br ${wp.gradient} opacity-80 group-hover:opacity-100 transition-opacity`} />

                        {/* Claymorphism overlay tint */}
                        <div className="absolute inset-0 bg-white/40 dark:bg-stone-950/40 backdrop-blur-[2px]" />

                        <div className="relative z-10 space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-3xl p-2 rounded-2xl bg-white/80 dark:bg-stone-800/80 shadow-sm border border-white/60">
                              {wp.icon}
                            </span>

                            <div className="flex items-center gap-1.5">
                              <span className="px-2.5 py-1 rounded-full bg-white/90 dark:bg-stone-800/90 text-stone-700 dark:text-stone-200 text-[9px] font-black uppercase tracking-wider border border-white/80 shadow-xs">
                                {wp.badge}
                              </span>
                              {isSelected && (
                                <span className="w-7 h-7 rounded-full bg-pink-500 text-white flex items-center justify-center shadow-md">
                                  <Check size={14} strokeWidth={3} />
                                </span>
                              )}
                            </div>
                          </div>

                          <div>
                            <h4 className="text-base font-serif font-bold text-stone-900 dark:text-stone-100">
                              {wp.name}
                            </h4>
                            <p className="text-[11px] text-stone-600 dark:text-stone-300 mt-1 leading-snug">
                              {wp.description}
                            </p>
                          </div>
                        </div>

                        <div className="relative z-10 pt-3 flex items-center justify-between border-t border-stone-900/5">
                          <span className="text-[10px] font-bold uppercase tracking-widest text-stone-500">
                            Theme: <span className="text-pink-600 font-extrabold capitalize">{wp.theme}</span>
                          </span>

                          <button
                            type="button"
                            className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${
                              isSelected
                                ? 'bg-pink-600 text-white shadow-sm'
                                : 'bg-white/80 dark:bg-stone-800/80 text-stone-700 dark:text-stone-200 group-hover:bg-pink-500 group-hover:text-white'
                            }`}
                          >
                            {isSelected ? 'Applied ✨' : 'Apply Wallpaper'}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* DYNAMIC WALLPAPERS TAB */}
            {activeTab === 'dynamic' && (
              <div className="space-y-6">
                
                {/* Main Toggle Banner */}
                <div className="bg-gradient-to-br from-purple-600 via-indigo-600 to-pink-600 p-6 md:p-8 rounded-[2.5rem] text-white shadow-xl relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                  <div className="space-y-2 max-w-xl z-10">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-[10px] font-black uppercase tracking-widest border border-white/20">
                      <Sparkles size={12} className="text-pink-200" />
                      AUTOMATIC ATMOSPHERE SHIFT
                    </div>
                    <h3 className="text-2xl md:text-3xl font-serif italic font-bold">
                      Use Cycle-Based Wallpapers
                    </h3>
                    <p className="text-xs text-white/90 leading-relaxed font-serif italic">
                      Allow Lumina to adapt its background colors automatically as your body transitions through the 4 menstrual cycle phases.
                    </p>
                  </div>

                  <div className="z-10 shrink-0 bg-white/10 backdrop-blur-md p-4 rounded-3xl border border-white/20 flex flex-col items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleToggleDynamic(!isDynamicActive)}
                      className={`w-16 h-9 rounded-full p-1 transition-colors duration-300 ease-in-out flex items-center cursor-pointer shadow-inner ${
                        isDynamicActive ? 'bg-emerald-400 justify-end' : 'bg-white/30 justify-start'
                      }`}
                    >
                      <motion.span
                        layout
                        className="w-7 h-7 rounded-full bg-white shadow-md flex items-center justify-center text-xs"
                      >
                        {isDynamicActive ? '✨' : '⚪'}
                      </motion.span>
                    </button>
                    <span className="text-[10px] font-black uppercase tracking-wider text-pink-100">
                      {isDynamicActive ? 'Enabled ✨' : 'Disabled'}
                    </span>
                  </div>
                </div>

                {/* 4 Phases List */}
                <div className="space-y-4 pt-2">
                  <h4 className="text-xs font-black text-indigo-400 uppercase tracking-widest px-1">
                    Cycle Phase Wallpaper Palette
                  </h4>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {CYCLE_WALLPAPERS.map((phase) => (
                      <div
                        key={phase.phase}
                        className={`p-5 rounded-[2rem] border relative overflow-hidden bg-white dark:bg-stone-900 shadow-xs flex flex-col justify-between gap-4 transition-all ${
                          isDynamicActive ? 'border-purple-200 dark:border-purple-950' : 'border-stone-200/70 dark:border-stone-800'
                        }`}
                      >
                        {/* Soft Gradient background slice */}
                        <div className={`absolute top-0 right-0 w-32 h-32 rounded-full bg-gradient-to-br ${phase.gradient} opacity-40 blur-2xl pointer-events-none`} />

                        <div className="flex items-start justify-between relative z-10">
                          <div className="flex items-center gap-3">
                            <span className="text-3xl p-2.5 rounded-2xl bg-stone-50 dark:bg-stone-800 shadow-xs border border-stone-100 dark:border-stone-700">
                              {phase.emoji}
                            </span>
                            <div>
                              <p className="text-[10px] font-black text-purple-600 dark:text-purple-400 uppercase tracking-widest">
                                {phase.phase}
                              </p>
                              <h5 className="text-lg font-serif italic text-stone-900 dark:text-stone-100 font-bold">
                                {phase.name}
                              </h5>
                            </div>
                          </div>

                          <span className="px-2.5 py-1 rounded-full bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 text-[9px] font-black uppercase tracking-wider border border-purple-100">
                            {phase.theme} theme
                          </span>
                        </div>

                        <p className="text-xs text-stone-600 dark:text-stone-300 leading-relaxed relative z-10 italic">
                          {phase.desc}
                        </p>

                        <div className="pt-2 border-t border-stone-100 dark:border-stone-800 flex items-center justify-between text-[10px] text-stone-400">
                          <span>Automatic color matching</span>
                          <span className={`w-4 h-4 rounded-full bg-gradient-to-br ${phase.gradient} border border-white shadow-xs`} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            )}

          </div>

          {/* Footer Close */}
          <div className="px-6 py-4 border-t border-stone-100 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-900/50 flex justify-end shrink-0">
            <button
              onClick={onClose}
              className="px-6 py-2.5 bg-stone-900 hover:bg-stone-800 dark:bg-stone-100 dark:hover:bg-white text-white dark:text-stone-900 rounded-2xl text-xs font-black uppercase tracking-widest shadow-md transition-all cursor-pointer"
            >
              Done Customizing ✨
            </button>
          </div>

        </motion.div>
      </div>
    </AnimatePresence>
  );
};
