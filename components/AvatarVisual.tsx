import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  UserAvatar, 
  SkinTone, 
  Hairstyle, 
  Headwrap, 
  Glasses, 
  Outfit,
  AvatarMood 
} from '../types';
import { SKIN_TONE_PALETTES } from '../services/avatarService';

interface AvatarVisualProps {
  avatar: Partial<UserAvatar>;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  showTierBadge?: boolean;
  showMoodBadge?: boolean;
  interactive?: boolean;
  isSpeaking?: boolean;
  isWaving?: boolean;
  animated?: boolean;
  level?: number;
  onClick?: () => void;
  className?: string;
}

export const AvatarVisual: React.FC<AvatarVisualProps> = ({
  avatar,
  size = 'md',
  showTierBadge = false,
  showMoodBadge = false,
  interactive = false,
  isSpeaking = false,
  isWaving: propIsWaving,
  animated = true,
  level = 1,
  onClick,
  className = ''
}) => {
  const skinKey: SkinTone = avatar.skinTone || 'amber';
  const palette = SKIN_TONE_PALETTES[skinKey] || SKIN_TONE_PALETTES.amber;
  const hair: Hairstyle = avatar.hairstyle || 'afro_puffs';
  const headwrap: Headwrap = avatar.headwrap || 'floral_crown';
  const glasses: Glasses = avatar.glasses || 'none';
  const outfit: Outfit = avatar.outfit || 'floral_sundress';
  const mood: AvatarMood = avatar.mood || 'radiant';
  const effectiveLevel = level || avatar.level || 1;

  // Internal animation cycles: occasional blinking, smiling, and waving
  const [internalBlink, setInternalBlink] = useState(false);
  const [internalSmile, setInternalSmile] = useState(false);
  const [internalWave, setInternalWave] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    if (!animated) return;

    // Wave animation when app opens / mounts
    const waveOnMountTimer = setTimeout(() => {
      setInternalWave(true);
      setTimeout(() => setInternalWave(false), 2400);
    }, 500);

    // Natural Blinking interval (every 3.6 to 4.8s)
    const blinkTimer = setInterval(() => {
      setInternalBlink(true);
      setTimeout(() => setInternalBlink(false), 160);
    }, 4000 + Math.random() * 1200);

    // Occasional gentle smile (every 6 to 9s)
    const smileTimer = setInterval(() => {
      setInternalSmile(true);
      setTimeout(() => setInternalSmile(false), 2200);
    }, 6500 + Math.random() * 2000);

    // Occasional gentle wave (every 16s)
    const waveTimer = setInterval(() => {
      setInternalWave(true);
      setTimeout(() => setInternalWave(false), 2600);
    }, 16000);

    return () => {
      clearTimeout(waveOnMountTimer);
      clearInterval(blinkTimer);
      clearInterval(smileTimer);
      clearInterval(waveTimer);
    };
  }, [animated]);

  const shouldWave = propIsWaving !== undefined ? propIsWaving : (internalWave || isHovered);
  const shouldSmile = internalSmile || isHovered || isSpeaking;
  const shouldBlink = internalBlink && !shouldSmile;

  const sizeDimensions = {
    xs: 'w-8 h-8',
    sm: 'w-11 h-11',
    md: 'w-16 h-16',
    lg: 'w-24 h-24',
    xl: 'w-36 h-36',
    '2xl': 'w-52 h-52'
  };

  const isMaternity = outfit === 'maternity_wrap' || outfit === 'bump_loungewear' || outfit === 'flowing_tunic';
  const isPostpartum = outfit === 'nursing_robe' || outfit === 'restore_kimono' || outfit === 'skin_to_skin';

  // Mood glow aura styling
  const moodAura = {
    radiant: 'from-pink-400/35 via-rose-300/30 to-amber-300/30 ring-pink-300/50',
    cozy: 'from-amber-400/35 via-rose-300/25 to-pink-200/30 ring-amber-300/50',
    serene: 'from-purple-400/30 via-pink-200/25 to-teal-300/30 ring-purple-300/50',
    nurturing: 'from-rose-400/35 via-pink-300/30 to-purple-300/30 ring-rose-300/50',
    energized: 'from-amber-400/40 via-yellow-300/35 to-rose-300/35 ring-amber-400/60'
  }[mood] || 'from-pink-300/30 via-rose-200/20 to-amber-200/30 ring-pink-200/50';

  const moodEmoji = {
    radiant: '✨',
    cozy: '🍵',
    serene: '🌿',
    nurturing: '🌸',
    energized: '☀️'
  }[mood] || '✨';

  // Level visual unlocks (Requirement 8)
  const isLevel2Plus = effectiveLevel >= 2;
  const isLevel3Plus = effectiveLevel >= 3;
  const isLevel4Plus = effectiveLevel >= 4;
  const isLevel5Plus = effectiveLevel >= 5;

  // Unique ID prefix for gradients to prevent SVG conflict across multiple instances
  const idPrefix = `av_${avatar.id || 'amara'}_${skinKey}`;

  return (
    <motion.div
      whileHover={interactive ? { scale: 1.07, y: -3 } : undefined}
      whileTap={interactive ? { scale: 0.95 } : undefined}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onClick}
      className={`relative select-none shrink-0 ${sizeDimensions[size]} ${interactive ? 'cursor-pointer' : ''} ${className}`}
    >
      {/* 
        Modern Alive Companion Frame (Requirement 3: Escaping the circular border):
        The circular frame sits slightly lower in the container (top-3.5 bottom-0.5 inset-x-1),
        so the head, regal hair bun, afro puffs, floral crown, and waving hand naturally
        pop out and overlap outside the top circular edge!
      */}
      <div 
        className={`absolute inset-x-1 bottom-0.5 top-3.5 rounded-full bg-gradient-to-tr ${moodAura} shadow-md transition-all duration-500 ring-2 ring-white/95 overflow-hidden ${
          isLevel5Plus 
            ? 'animate-celestial-glow ring-amber-300' 
            : isLevel4Plus 
              ? 'ring-amber-200 shadow-[0_0_20px_rgba(251,191,36,0.4)]' 
              : isLevel2Plus 
                ? 'shadow-[0_0_12px_rgba(244,114,182,0.35)]' 
                : ''
        }`}
      >
        {/* Soft background radial shine */}
        <div className="absolute inset-0 bg-gradient-to-b from-white/90 via-pink-50/50 to-rose-100/40" />
        {isSpeaking && (
          <div className="absolute inset-0 bg-pink-400/15 animate-ping opacity-75 rounded-full" />
        )}
      </div>

      {/* Level 4 & 5 Golden Celestial Radiant Halo Ring behind hair */}
      {isLevel4Plus && (
        <div 
          className="absolute -top-2 inset-x-3 h-5 rounded-full border-2 border-amber-300/80 bg-amber-200/20 blur-[0.6px] pointer-events-none z-0 animate-pulse"
          style={{ transform: 'rotate(-6deg)' }}
        />
      )}

      {/* Level 3+ Floating Botanical Petals / Sparkles */}
      {isLevel3Plus && (
        <div className="absolute -top-1.5 -left-1 text-[10px] pointer-events-none animate-float-petal z-20">
          🌸
        </div>
      )}
      {isLevel5Plus && (
        <div className="absolute -bottom-1 -left-1.5 text-[9px] pointer-events-none animate-bounce z-20">
          ✨
        </div>
      )}

      {/* SVG Container: overflow-visible with alive breathing & floating movement */}
      <svg 
        viewBox="0 0 100 108" 
        className={`relative z-10 w-full h-full overflow-visible transition-transform duration-500 ${animated ? 'animate-companion-breathe' : ''}`}
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* Circular Frame ClipPath for bottom torso only (cx: 50, cy: 59, r: 42) */}
          <clipPath id={`${idPrefix}_torsoClip`}>
            <circle cx="50" cy="59" r="43" />
          </clipPath>

          {/* Skin Gradient */}
          <linearGradient id={`${idPrefix}_skin`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={palette.base} />
            <stop offset="100%" stopColor={palette.shadow} />
          </linearGradient>

          {/* Hair Color Gradient */}
          <linearGradient id={`${idPrefix}_hair`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2c1a12" />
            <stop offset="100%" stopColor="#120804" />
          </linearGradient>

          {/* Outfits */}
          <linearGradient id={`${idPrefix}_floral`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#f472b6" />
            <stop offset="100%" stopColor="#fb7185" />
          </linearGradient>
          <linearGradient id={`${idPrefix}_linen`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#e7dfd5" />
            <stop offset="100%" stopColor="#d5c8b8" />
          </linearGradient>
          <linearGradient id={`${idPrefix}_kimono`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#fbcfe8" />
            <stop offset="100%" stopColor="#e0e7ff" />
          </linearGradient>
          <linearGradient id={`${idPrefix}_athleisure`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#f59e0b" />
            <stop offset="100%" stopColor="#ec4899" />
          </linearGradient>
          <linearGradient id={`${idPrefix}_maternity`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#f43f5e" />
            <stop offset="100%" stopColor="#fda4af" />
          </linearGradient>
          <linearGradient id={`${idPrefix}_nursing`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#818cf8" />
            <stop offset="100%" stopColor="#c084fc" />
          </linearGradient>
          <linearGradient id={`${idPrefix}_silkWrap`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#a855f7" />
            <stop offset="100%" stopColor="#ec4899" />
          </linearGradient>
        </defs>

        {/* ================= 1. Hair Behind Head (Extends above frame) ================= */}
        {hair === 'afro_puffs' && (
          <g fill={`url(#${idPrefix}_hair)`} className="transition-all duration-300">
            {/* Left Puff - pops out to top left outside circular boundary */}
            <circle cx="23" cy="25" r="16.5" filter="drop-shadow(0 2px 4px rgba(0,0,0,0.15))" />
            <circle cx="28" cy="28" r="12" opacity="0.3" fill="#3d2116" />
            {/* Right Puff - pops out to top right */}
            <circle cx="77" cy="25" r="16.5" filter="drop-shadow(0 2px 4px rgba(0,0,0,0.15))" />
            <circle cx="72" cy="28" r="12" opacity="0.3" fill="#3d2116" />
          </g>
        )}

        {hair === 'high_bun' && (
          <g fill={`url(#${idPrefix}_hair)`}>
            {/* Regal Topknot Bun: Extends generously above circular frame! */}
            <circle cx="50" cy="11" r="15" filter="drop-shadow(0 2px 5px rgba(0,0,0,0.18))" />
            {/* Subtle hair texture ring */}
            <ellipse cx="50" cy="11" rx="10" ry="7" fill="none" stroke="#3d2116" strokeWidth="1.2" opacity="0.6" />
          </g>
        )}

        {hair === 'long_curls' && (
          <g fill={`url(#${idPrefix}_hair)`}>
            <path d="M 18,36 Q 10,65 21,84 Q 26,65 24,44 Z" />
            <path d="M 82,36 Q 90,65 79,84 Q 74,65 76,44 Z" />
          </g>
        )}

        {hair === 'box_braids' && (
          <g stroke="#1a0c06" strokeWidth="3.2" strokeLinecap="round">
            <path d="M 22,38 Q 14,64 17,86" />
            <path d="M 26,36 Q 21,65 23,86" />
            <path d="M 74,36 Q 79,65 77,86" />
            <path d="M 78,38 Q 86,64 83,86" />
          </g>
        )}

        {/* ================= 2. Neck & Torso (Clipped to circular boundary) ================= */}
        <g clipPath={`url(#${idPrefix}_torsoClip)`}>
          {/* Neck */}
          <path d="M 43,54 L 43,72 L 57,72 L 57,54 Z" fill={`url(#${idPrefix}_skin)`} />

          {/* Outfit Torso */}
          {outfit === 'floral_sundress' && (
            <g>
              <path d="M 24,90 Q 50,67 76,90 L 84,108 L 16,108 Z" fill={`url(#${idPrefix}_floral)`} />
              <circle cx="44" cy="85" r="1.8" fill="#fdf2f8" />
              <circle cx="56" cy="88" r="1.8" fill="#fdf2f8" />
              <circle cx="50" cy="94" r="1.8" fill="#fdf2f8" />
            </g>
          )}

          {outfit === 'linen_loungewear' && (
            <g>
              <path d="M 24,90 Q 50,69 76,90 L 84,108 L 16,108 Z" fill={`url(#${idPrefix}_linen)`} />
              <path d="M 50,75 L 50,108" stroke="#bda892" strokeWidth="1.5" strokeDasharray="2 2" />
            </g>
          )}

          {outfit === 'cozy_kimono' && (
            <g>
              <path d="M 22,90 Q 50,66 78,90 L 86,108 L 14,108 Z" fill={`url(#${idPrefix}_kimono)`} />
              <path d="M 36,73 L 50,89 L 64,73" fill="none" stroke="#f472b6" strokeWidth="2.2" strokeLinecap="round" />
            </g>
          )}

          {outfit === 'athleisure_wrap' && (
            <g>
              <path d="M 22,90 Q 50,68 78,90 L 86,108 L 14,108 Z" fill={`url(#${idPrefix}_athleisure)`} />
              <path d="M 33,74 L 67,89" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" />
            </g>
          )}

          {isMaternity && (
            <g>
              <path d="M 20,90 Q 50,62 80,90 L 88,108 L 12,108 Z" fill={`url(#${idPrefix}_maternity)`} />
              <path d="M 38,92 Q 50,99 62,92" fill="none" stroke="#ffffff" strokeWidth="1.8" opacity="0.7" strokeLinecap="round" />
            </g>
          )}

          {isPostpartum && (
            <g>
              <path d="M 22,90 Q 50,64 78,90 L 86,108 L 14,108 Z" fill={`url(#${idPrefix}_nursing)`} />
              <path d="M 38,74 L 50,89 L 62,74" fill="none" stroke="#fdf2f8" strokeWidth="2" strokeLinecap="round" />
              <circle cx="50" cy="92" r="3" fill="#f43f5e" />
            </g>
          )}
        </g>

        {/* ================= 3. Head & Facial Features ================= */}
        {/* Head Shape */}
        <path 
          d="M 32,41 Q 31,63 50,66 Q 69,63 68,41 Q 69,21 50,20 Q 31,21 32,41 Z" 
          fill={`url(#${idPrefix}_skin)`}
          filter="drop-shadow(0 2px 4px rgba(0,0,0,0.08))"
        />

        {/* Soft Cheeks / Blush (Glows brighter when smiling) */}
        <ellipse 
          cx="38" 
          cy="48" 
          rx={shouldSmile ? 4.8 : 4} 
          ry={shouldSmile ? 3.2 : 2.5} 
          fill="#f43f5e" 
          opacity={shouldSmile ? 0.45 : 0.25}
          className="transition-all duration-300"
        />
        <ellipse 
          cx="62" 
          cy="48" 
          rx={shouldSmile ? 4.8 : 4} 
          ry={shouldSmile ? 3.2 : 2.5} 
          fill="#f43f5e" 
          opacity={shouldSmile ? 0.45 : 0.25}
          className="transition-all duration-300"
        />

        {/* Eyelashes & Brows */}
        <path d="M 37,36 Q 42,34 47,36" fill="none" stroke="#1f0f08" strokeWidth="1.3" strokeLinecap="round" />
        <path d="M 53,36 Q 58,34 63,36" fill="none" stroke="#1f0f08" strokeWidth="1.3" strokeLinecap="round" />

        {/* Eyes (Blinking Animation Support) */}
        <g 
          className="transition-transform duration-100 origin-center"
          style={{ 
            transformOrigin: '50px 42px',
            transform: shouldBlink ? 'scaleY(0.12)' : 'scaleY(1)' 
          }}
        >
          {/* Left Eye */}
          <circle cx="41.5" cy="42" r="2.4" fill="#24120a" />
          <circle cx="42.5" cy="41" r="0.8" fill="#ffffff" />
          {/* Right Eye */}
          <circle cx="58.5" cy="42" r="2.4" fill="#24120a" />
          <circle cx="59.5" cy="41" r="0.8" fill="#ffffff" />
        </g>

        {/* Nose */}
        <path d="M 49,45 Q 50,47.5 51,45" fill="none" stroke={palette.shadow} strokeWidth="1.4" strokeLinecap="round" />

        {/* Dynamic Serene Smile (Smooth transition between peaceful rest and happy smile) */}
        <path 
          d={shouldSmile ? "M 43.5,51 Q 50,57.5 56.5,51" : "M 44.5,52 Q 50,55.5 55.5,52"} 
          fill="none" 
          stroke="#be185d" 
          strokeWidth="1.8" 
          strokeLinecap="round"
          className="transition-all duration-300" 
        />

        {/* ================= 4. Hair Front / Style Over Head ================= */}
        {hair === 'sleek_bob' && (
          <path 
            d="M 30,36 Q 28,56 34,57 Q 39,22 50,22 Q 61,22 66,57 Q 72,56 70,36 Q 68,18 50,18 Q 32,18 30,36 Z" 
            fill={`url(#${idPrefix}_hair)`} 
          />
        )}

        {hair === 'pixie' && (
          <path 
            d="M 31,33 Q 33,18 50,18 Q 67,18 69,33 Q 62,23 50,24 Q 38,23 31,33 Z" 
            fill={`url(#${idPrefix}_hair)`} 
          />
        )}

        {hair === 'braided_crown' && (
          <path 
            d="M 30,29 Q 50,18 70,29 Q 50,14 30,29 Z" 
            fill={`url(#${idPrefix}_hair)`} 
            stroke="#4a2a1a" 
            strokeWidth="1.8" 
          />
        )}

        {hair === 'short_waves' && (
          <path 
            d="M 30,34 Q 40,22 50,23 Q 60,22 70,34 Q 64,19 50,19 Q 36,19 30,34 Z" 
            fill={`url(#${idPrefix}_hair)`} 
          />
        )}

        {/* ================= 5. Headwrap / Crown Accessories ================= */}
        {headwrap === 'floral_crown' && (
          <g filter="drop-shadow(0 2px 3px rgba(0,0,0,0.12))">
            <path d="M 30,27 Q 50,18 70,27" fill="none" stroke="#15803d" strokeWidth="1.8" strokeLinecap="round" />
            <circle cx="34" cy="24" r="3.4" fill="#fb7185" />
            <circle cx="42" cy="21" r="3.8" fill="#fda4af" />
            <circle cx="50" cy="19" r="4.2" fill="#f43f5e" />
            <circle cx="58" cy="21" r="3.8" fill="#fb7185" />
            <circle cx="66" cy="24" r="3.4" fill="#fda4af" />
            <circle cx="50" cy="19" r="1.4" fill="#fef08a" />
          </g>
        )}

        {headwrap === 'silk_wrap' && (
          <g filter="drop-shadow(0 2px 4px rgba(0,0,0,0.14))">
            <path d="M 28,32 Q 50,14 72,32 Q 50,21 28,32 Z" fill={`url(#${idPrefix}_silkWrap)`} />
            <circle cx="50" cy="20" r="3.5" fill="#f59e0b" />
          </g>
        )}

        {headwrap === 'minimal_band' && (
          <path d="M 31,27 Q 50,18 69,27" fill="none" stroke="#f59e0b" strokeWidth="2.2" strokeLinecap="round" />
        )}

        {/* ================= 6. Glasses ================= */}
        {glasses === 'round' && (
          <g stroke="#d97706" strokeWidth="1.5" fill="rgba(255,255,255,0.3)">
            <circle cx="41.5" cy="42" r="5.5" />
            <circle cx="58.5" cy="42" r="5.5" />
            <line x1="47" y1="42" x2="53" y2="42" stroke="#d97706" strokeWidth="1.4" />
          </g>
        )}

        {glasses === 'cat_eye' && (
          <g stroke="#db2777" strokeWidth="1.5" fill="rgba(255,255,255,0.3)">
            <path d="M 35,40 Q 41.5,36 48,42 Q 43.5,47.5 37,45 Z" />
            <path d="M 65,40 Q 58.5,36 52,42 Q 56.5,47.5 63,45 Z" />
            <line x1="48" y1="42" x2="52" y2="42" stroke="#db2777" strokeWidth="1.4" />
          </g>
        )}

        {glasses === 'square' && (
          <g stroke="#475569" strokeWidth="1.5" fill="rgba(255,255,255,0.3)">
            <rect x="36" y="37.5" width="11" height="9" rx="2.5" />
            <rect x="53" y="37.5" width="11" height="9" rx="2.5" />
            <line x1="47" y1="42" x2="53" y2="42" stroke="#475569" strokeWidth="1.4" />
          </g>
        )}

        {/* ================= 7. Small Wave Hand Animation ================= */}
        {/* Animated hand waving gently from the side */}
        <g 
          className={`transition-all duration-300 origin-bottom-left ${shouldWave ? 'animate-companion-wave' : 'opacity-0 translate-y-3'}`}
          style={{ transformOrigin: '76px 74px' }}
        >
          {/* Forearm & sleeve */}
          <path d="M 73,78 Q 80,68 83,57" stroke={`url(#${idPrefix}_skin)`} strokeWidth="5.5" strokeLinecap="round" />
          {/* Palm */}
          <circle cx="84" cy="54" r="4.2" fill={`url(#${idPrefix}_skin)`} />
          {/* Fingers waving */}
          <path d="M 83,52 L 84,46" stroke={`url(#${idPrefix}_skin)`} strokeWidth="1.8" strokeLinecap="round" />
          <path d="M 85,52 L 87,47" stroke={`url(#${idPrefix}_skin)`} strokeWidth="1.8" strokeLinecap="round" />
          <path d="M 87,54 L 90,50" stroke={`url(#${idPrefix}_skin)`} strokeWidth="1.8" strokeLinecap="round" />
          {/* Thumb */}
          <path d="M 81,55 L 78,52" stroke={`url(#${idPrefix}_skin)`} strokeWidth="1.8" strokeLinecap="round" />
        </g>

        {/* ================= 8. Level 5+ Celestial Star Crown ================= */}
        {isLevel5Plus && (
          <g filter="drop-shadow(0 2px 5px rgba(251,191,36,0.75))" className="animate-pulse">
            <path d="M 38,9 L 43,15 L 50,4 L 57,15 L 62,9 L 58,17 L 42,17 Z" fill="#fbbf24" stroke="#fef08a" strokeWidth="0.9" />
            <circle cx="50" cy="4" r="1.6" fill="#ffffff" />
            <circle cx="38" cy="9" r="1.3" fill="#ffffff" />
            <circle cx="62" cy="9" r="1.3" fill="#ffffff" />
          </g>
        )}
      </svg>

      {/* Floating Active Voice Waves when Speaking */}
      {isSpeaking && (
        <div className="absolute -top-1 -right-1 flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-pink-500 text-white shadow-sm z-20 animate-pulse">
          <span className="w-1 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
          <span className="w-1 h-3 bg-white rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
          <span className="w-1 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
      )}

      {/* Optional Companion Mood Indicator Badge */}
      {showMoodBadge && (
        <div 
          className="absolute -top-1 -left-1 bg-white/95 border border-pink-200 rounded-full w-5 h-5 flex items-center justify-center text-[10px] shadow-sm z-20"
          title={`Mood: ${mood}`}
        >
          {moodEmoji}
        </div>
      )}

      {/* Optional Progression Level / Tier Badge Indicator */}
      {showTierBadge && (
        <div className="absolute -bottom-1 -right-1 bg-white border border-pink-200 rounded-full w-5 h-5 flex items-center justify-center text-[10px] shadow-sm z-20">
          {avatar.tier === 'flourishing' ? '👑' : avatar.tier === 'radiant' ? '💎' : avatar.tier === 'blooming' ? '🌸' : '🌱'}
        </div>
      )}
    </motion.div>
  );
};

export default AvatarVisual;
