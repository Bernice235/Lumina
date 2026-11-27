import React, { useState } from 'react';
import { User, AppTheme } from '../types';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, Check, Moon, Sun, Heart, Palette, RefreshCw } from 'lucide-react';
import { syncUser } from '../services/firebaseService';
import { saveEncryptedSessionUser } from '../services/secureStorage';

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
    gradient: 'from-purple-100/70 via-indigo-50 to-fuchsia-100/60',
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
    gradient: 'from-purple-100 via-indigo-100 to-slate-200/60',
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
    const rememberPref = localStorage.getItem('lumina_remember_me') !== 'false';
    await saveEncryptedSessionUser(updatedUser, rememberPref);
    await syncUser(updatedUser);
  };

  const handleToggleDynamic = async (enabled: boolean) => {
    const updatedUser: User = {
      ...user,
      useCycleBasedWallpaper: enabled
    };
    setUser(updatedUser);
    const rememberPref = localStorage.getItem('lumina_remember_me') !== 'false';
    await saveEncryptedSessionUser(updatedUser, rememberPref);
    await syncUser(updatedUser);
  };

  const selectedWallpaperObj = WALLPAPER_LIST.find(w => w.id === currentWallpaperId) || WALLPAPER_LIST[0];

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-stone-950/60 backdrop-blur-md z-[200] flex items-center justify-center p-3 sm:p-6 overflow-y-auto font-sans">
        
        {/* Backdrop click to close */}
        <div className="absolute inset-0" onClick={onClose} />

        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 12 }}
          className="bg-white dark:bg-[#1a1816] border border-stone-200/80 dark:border-[#2e2a26] rounded-2xl shadow-xl w-full max-w-4xl relative z-10 overflow-hidden my-auto max-h-[90vh] flex flex-col"
        >
          {/* Top Header */}
          <div className="px-6 py-5 border-b border-stone-200/70 dark:border-[#2e2a26] bg-[#faf8f6] dark:bg-[#151311] flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-pink-600 text-white flex items-center justify-center text-lg">
                🎨
              </div>
              <div>
                <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-pink-600 dark:text-pink-400">
                  <Sparkles size={12} />
                  Personalization Sanctuary
                </div>
                <h2 className="text-xl sm:text-2xl font-serif text-stone-900 dark:text-stone-100 font-semibold">
                  Wallpapers &amp; Themes
                </h2>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-white dark:bg-[#23201d] text-stone-500 dark:text-stone-300 hover:text-stone-900 dark:hover:text-stone-100 transition-colors cursor-pointer border border-stone-200/80 dark:border-[#342f2b]"
            >
              <X size={18} />
            </button>
          </div>

          {/* Current Active Wallpaper Banner */}
          <div className="px-6 py-3 bg-[#faf8f6] dark:bg-[#23201d] border-b border-stone-200/70 dark:border-[#2e2a26] flex flex-wrap items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-stone-600 dark:text-stone-300">Active wallpaper:</span>
              {isDynamicActive ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-pink-600 text-white text-xs font-semibold">
                  Dynamic Cycle Wallpapers Active
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white dark:bg-[#1a1816] text-stone-800 dark:text-stone-100 text-xs font-semibold border border-stone-200/80 dark:border-[#342f2b]">
                  <span>{selectedWallpaperObj.icon}</span>
                  <span>{selectedWallpaperObj.name}</span>
                  <span className="text-pink-600 dark:text-pink-400">· {selectedWallpaperObj.badge}</span>
                </span>
              )}
            </div>

            <p className="text-xs text-stone-500 dark:text-stone-400">
              Changes apply across your sanctuary.
            </p>
          </div>

          {/* Category Tabs */}
          <div className="px-6 py-3 border-b border-stone-200/70 dark:border-[#2e2a26] bg-white dark:bg-[#1a1816] flex gap-2 overflow-x-auto scrollbar-none shrink-0">
            {[
              { id: 'lumina', label: 'Lumina Wallpapers' },
              { id: 'partner', label: 'Partner Wallpapers' },
              { id: 'sanctuary', label: 'Sanctuary Wallpapers' },
              { id: 'dynamic', label: 'Dynamic Wallpapers' },
            ].map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer shrink-0 border whitespace-nowrap ${
                    isActive
                      ? 'bg-pink-600 text-white border-pink-600'
                      : 'bg-[#faf8f6] dark:bg-[#23201d] text-stone-600 dark:text-stone-300 border-stone-200/80 dark:border-[#342f2b] hover:border-pink-400'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Scrollable Content Body */}
          <div className="p-6 md:p-8 overflow-y-auto flex-grow space-y-6">

            {/* STATIC WALLPAPERS TABS */}
            {activeTab !== 'dynamic' && (
              <div className="space-y-5">
                <div className="space-y-1">
                  <h3 className="text-lg font-serif text-stone-900 dark:text-stone-100 font-semibold">
                    {activeTab === 'lumina' && 'Lumina Wallpapers'}
                    {activeTab === 'partner' && 'Partner Wallpapers'}
                    {activeTab === 'sanctuary' && 'Sanctuary Wallpapers'}
                  </h3>
                  <p className="text-xs text-stone-500 dark:text-stone-400">
                    {activeTab === 'lumina' && 'Soft pastel gradients and calming floral tones crafted for daily wellness.'}
                    {activeTab === 'partner' && 'Warm indigo and romantic themes designed to enhance partner connection.'}
                    {activeTab === 'sanctuary' && 'Deep nocturnal and starry atmospheres created for calm evenings and quiet rest.'}
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {WALLPAPER_LIST.filter(w => w.category === activeTab).map((wp) => {
                    const isSelected = !isDynamicActive && currentWallpaperId === wp.id;
                    return (
                      <div
                        key={wp.id}
                        onClick={() => handleSelectWallpaper(wp)}
                        className={`group relative rounded-2xl p-4 border transition-colors cursor-pointer overflow-hidden flex flex-col justify-between min-h-[190px] ${
                          isSelected
                            ? 'border-pink-600 ring-1 ring-pink-500/40'
                            : 'border-stone-200/80 dark:border-[#342f2b] hover:border-pink-400'
                        }`}
                      >
                        <div className={`absolute inset-0 bg-gradient-to-br ${wp.gradient} opacity-80`} />
                        <div className="absolute inset-0 bg-white/50 dark:bg-[#1a1816]/75" />

                        <div className="relative z-10 space-y-2.5">
                          <div className="flex items-center justify-between">
                            <span className="text-2xl p-2 rounded-xl bg-white/90 dark:bg-[#23201d] border border-stone-200/70 dark:border-[#342f2b]">
                              {wp.icon}
                            </span>

                            <div className="flex items-center gap-1.5">
                              <span className="px-2 py-0.5 rounded-lg bg-white/90 dark:bg-[#23201d] text-stone-700 dark:text-stone-200 text-[11px] font-medium border border-stone-200/70 dark:border-[#342f2b]">
                                {wp.badge}
                              </span>
                              {isSelected && (
                                <span className="w-6 h-6 rounded-lg bg-pink-600 text-white flex items-center justify-center">
                                  <Check size={13} strokeWidth={3} />
                                </span>
                              )}
                            </div>
                          </div>

                          <div>
                            <h4 className="text-base font-serif font-semibold text-stone-900 dark:text-stone-100">
                              {wp.name}
                            </h4>
                            <p className="text-xs text-stone-600 dark:text-stone-300 mt-1 leading-snug">
                              {wp.description}
                            </p>
                          </div>
                        </div>

                        <div className="relative z-10 pt-3 flex items-center justify-between border-t border-stone-900/10 dark:border-white/10">
                          <span className="text-xs font-medium text-stone-600 dark:text-stone-300">
                            Theme: <span className="text-pink-600 dark:text-pink-400 font-semibold capitalize">{wp.theme}</span>
                          </span>

                          <span
                            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
                              isSelected
                                ? 'bg-pink-600 text-white'
                                : 'bg-white dark:bg-[#23201d] text-stone-700 dark:text-stone-200'
                            }`}
                          >
                            {isSelected ? 'Applied' : 'Apply'}
                          </span>
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
                <div className="bg-indigo-600 p-6 rounded-2xl text-white flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                  <div className="space-y-2 max-w-xl">
                    <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-100">
                      <Sparkles size={13} />
                      Automatic atmosphere shift
                    </div>
                    <h3 className="text-2xl font-serif font-semibold">
                      Use Cycle-Based Wallpapers
                    </h3>
                    <p className="text-xs text-indigo-100 leading-relaxed">
                      Allow Lumina to adapt its palette gently as you move through your four cycle phases.
                    </p>
                  </div>

                  <div className="shrink-0 bg-white/15 p-4 rounded-xl border border-white/20 flex flex-col items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleToggleDynamic(!isDynamicActive)}
                      className={`w-14 h-8 rounded-full p-1 transition-colors flex items-center cursor-pointer ${
                        isDynamicActive ? 'bg-emerald-400 justify-end' : 'bg-white/30 justify-start'
                      }`}
                    >
                      <span className="w-6 h-6 rounded-full bg-white shadow-xs" />
                    </button>
                    <span className="text-xs font-semibold text-white">
                      {isDynamicActive ? 'Enabled' : 'Disabled'}
                    </span>
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="text-xs font-semibold text-stone-500 dark:text-stone-400 px-1">
                    Cycle phase wallpaper palette
                  </h4>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {CYCLE_WALLPAPERS.map((phase) => (
                      <div
                        key={phase.phase}
                        className={`p-5 rounded-2xl border bg-[#faf8f6] dark:bg-[#23201d] flex flex-col justify-between gap-3 ${
                          isDynamicActive ? 'border-indigo-400' : 'border-stone-200/80 dark:border-[#342f2b]'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <span className="text-2xl p-2 rounded-xl bg-white dark:bg-[#1a1816] border border-stone-200/80 dark:border-[#342f2b]">
                              {phase.emoji}
                            </span>
                            <div>
                              <p className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                                {phase.phase}
                              </p>
                              <h5 className="text-base font-serif text-stone-900 dark:text-stone-100 font-semibold">
                                {phase.name}
                              </h5>
                            </div>
                          </div>

                          <span className="px-2.5 py-0.5 rounded-lg bg-white dark:bg-[#1a1816] text-stone-700 dark:text-stone-300 text-xs font-medium border border-stone-200/80 dark:border-[#342f2b]">
                            {phase.theme}
                          </span>
                        </div>

                        <p className="text-xs text-stone-600 dark:text-stone-300 leading-relaxed">
                          {phase.desc}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

          </div>

          {/* Footer Close */}
          <div className="px-6 py-4 border-t border-stone-200/70 dark:border-[#2e2a26] bg-[#faf8f6] dark:bg-[#151311] flex justify-end shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 bg-pink-600 hover:bg-pink-700 text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer"
            >
              Done
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
