import React from 'react';
import { motion } from 'framer-motion';
import { 
  UserAvatar, 
  SkinTone, 
  Hairstyle, 
  Headwrap, 
  Glasses, 
  Outfit 
} from '../types';
import { SKIN_TONE_PALETTES } from '../services/avatarService';

interface AvatarVisualProps {
  avatar: Partial<UserAvatar>;
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  showTierBadge?: boolean;
  interactive?: boolean;
  onClick?: () => void;
  className?: string;
}

export const AvatarVisual: React.FC<AvatarVisualProps> = ({
  avatar,
  size = 'md',
  showTierBadge = false,
  interactive = false,
  onClick,
  className = ''
}) => {
  const skinKey: SkinTone = avatar.skinTone || 'amber';
  const palette = SKIN_TONE_PALETTES[skinKey] || SKIN_TONE_PALETTES.amber;
  const hair: Hairstyle = avatar.hairstyle || 'afro_puffs';
  const headwrap: Headwrap = avatar.headwrap || 'floral_crown';
  const glasses: Glasses = avatar.glasses || 'none';
  const outfit: Outfit = avatar.outfit || 'floral_sundress';

  const sizeDimensions = {
    sm: 'w-10 h-10',
    md: 'w-14 h-14',
    lg: 'w-24 h-24',
    xl: 'w-36 h-36',
    '2xl': 'w-52 h-52'
  };

  const isMaternity = outfit === 'maternity_wrap' || outfit === 'bump_loungewear' || outfit === 'flowing_tunic';
  const isPostpartum = outfit === 'nursing_robe' || outfit === 'restore_kimono' || outfit === 'skin_to_skin';

  return (
    <motion.div
      whileHover={interactive ? { scale: 1.05 } : undefined}
      whileTap={interactive ? { scale: 0.95 } : undefined}
      onClick={onClick}
      className={`relative rounded-full select-none shrink-0 ${sizeDimensions[size]} ${interactive ? 'cursor-pointer' : ''} ${className}`}
    >
      {/* Background Soft Glow Disc */}
      <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-pink-200/50 via-rose-100/40 to-amber-100/60 p-0.5 shadow-inner overflow-hidden border border-pink-100/80">
        <svg 
          viewBox="0 0 100 100" 
          className="w-full h-full transform transition-all duration-300"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            {/* Skin Gradient */}
            <linearGradient id={`skinGrad_${skinKey}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={palette.base} />
              <stop offset="100%" stopColor={palette.shadow} />
            </linearGradient>

            {/* Hair Color Gradient */}
            <linearGradient id="hairGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#2c1a12" />
              <stop offset="100%" stopColor="#140a06" />
            </linearGradient>

            {/* Outfit Gradients */}
            <linearGradient id="outfitFloral" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#f472b6" />
              <stop offset="100%" stopColor="#fb7185" />
            </linearGradient>

            <linearGradient id="outfitLinen" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#e7dfd5" />
              <stop offset="100%" stopColor="#d5c8b8" />
            </linearGradient>

            <linearGradient id="outfitKimono" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#fbcfe8" />
              <stop offset="100%" stopColor="#e0e7ff" />
            </linearGradient>

            <linearGradient id="outfitAthleisure" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#f59e0b" />
              <stop offset="100%" stopColor="#ec4899" />
            </linearGradient>

            <linearGradient id="outfitMaternity" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#f43f5e" />
              <stop offset="100%" stopColor="#fda4af" />
            </linearGradient>

            <linearGradient id="outfitNursing" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#818cf8" />
              <stop offset="100%" stopColor="#c084fc" />
            </linearGradient>

            <linearGradient id="silkWrapGrad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#a855f7" />
              <stop offset="100%" stopColor="#ec4899" />
            </linearGradient>
          </defs>

          {/* 1. Backdrop Glow Ring inside SVG */}
          <circle cx="50" cy="50" r="49" fill="#fffafb" />

          {/* 2. Hair Behind Head */}
          {hair === 'afro_puffs' && (
            <g fill="url(#hairGrad)">
              <circle cx="28" cy="34" r="15" />
              <circle cx="72" cy="34" r="15" />
            </g>
          )}

          {hair === 'high_bun' && (
            <circle cx="50" cy="20" r="14" fill="url(#hairGrad)" />
          )}

          {hair === 'long_curls' && (
            <g fill="url(#hairGrad)">
              <path d="M 22,40 Q 15,65 24,80 Q 28,65 26,45 Z" />
              <path d="M 78,40 Q 85,65 76,80 Q 72,65 74,45 Z" />
            </g>
          )}

          {hair === 'box_braids' && (
            <g stroke="#1a0c06" strokeWidth="3" strokeLinecap="round">
              <path d="M 24,42 Q 18,65 20,85" />
              <path d="M 28,40 Q 24,65 25,85" />
              <path d="M 72,40 Q 76,65 75,85" />
              <path d="M 76,42 Q 82,65 80,85" />
            </g>
          )}

          {/* 3. Neck & Torso / Outfit */}
          {/* Neck */}
          <path d="M 44,56 L 44,70 L 56,70 L 56,56 Z" fill={`url(#skinGrad_${skinKey})`} />

          {/* Body / Outfit */}
          {outfit === 'floral_sundress' && (
            <g>
              <path d="M 28,88 Q 50,66 72,88 L 78,100 L 22,100 Z" fill="url(#outfitFloral)" />
              {/* Petal embroidery */}
              <circle cx="45" cy="85" r="1.5" fill="#fdf2f8" />
              <circle cx="55" cy="88" r="1.5" fill="#fdf2f8" />
              <circle cx="50" cy="92" r="1.5" fill="#fdf2f8" />
            </g>
          )}

          {outfit === 'linen_loungewear' && (
            <g>
              <path d="M 28,88 Q 50,68 72,88 L 78,100 L 22,100 Z" fill="url(#outfitLinen)" />
              <path d="M 50,75 L 50,100" stroke="#bda892" strokeWidth="1.2" strokeDasharray="2 2" />
            </g>
          )}

          {outfit === 'cozy_kimono' && (
            <g>
              <path d="M 26,88 Q 50,65 74,88 L 80,100 L 20,100 Z" fill="url(#outfitKimono)" />
              <path d="M 38,72 L 50,86 L 62,72" fill="none" stroke="#f472b6" strokeWidth="2" />
            </g>
          )}

          {outfit === 'athleisure_wrap' && (
            <g>
              <path d="M 26,88 Q 50,68 74,88 L 80,100 L 20,100 Z" fill="url(#outfitAthleisure)" />
              <path d="M 35,74 L 65,88" stroke="#ffffff" strokeWidth="1.8" strokeLinecap="round" />
            </g>
          )}

          {isMaternity && (
            <g>
              <path d="M 24,88 Q 50,62 76,88 L 82,100 L 18,100 Z" fill="url(#outfitMaternity)" />
              {/* Subtle gentle bump curve indicator */}
              <path d="M 40,90 Q 50,96 60,90" fill="none" stroke="#ffffff" strokeWidth="1.5" opacity="0.6" />
            </g>
          )}

          {isPostpartum && (
            <g>
              <path d="M 25,88 Q 50,64 75,88 L 80,100 L 20,100 Z" fill="url(#outfitNursing)" />
              <path d="M 40,73 L 50,87 L 60,73" fill="none" stroke="#fdf2f8" strokeWidth="2" />
              {/* Heart pin */}
              <circle cx="50" cy="90" r="2.5" fill="#f43f5e" />
            </g>
          )}

          {/* 4. Head / Face Shape */}
          <path 
            d="M 34,42 Q 33,62 50,65 Q 67,62 66,42 Q 67,24 50,23 Q 33,24 34,42 Z" 
            fill={`url(#skinGrad_${skinKey})`} 
          />

          {/* Soft Cheeks / Blush */}
          <ellipse cx="39" cy="48" rx="4" ry="2.5" fill="#f43f5e" opacity="0.25" />
          <ellipse cx="61" cy="48" rx="4" ry="2.5" fill="#f43f5e" opacity="0.25" />

          {/* 5. Eyes & Expression */}
          <g fill="#26130b">
            {/* Left Eye */}
            <circle cx="42" cy="42" r="2.2" />
            <circle cx="43" cy="41" r="0.7" fill="#ffffff" />
            {/* Right Eye */}
            <circle cx="58" cy="42" r="2.2" />
            <circle cx="59" cy="41" r="0.7" fill="#ffffff" />
          </g>

          {/* Eyelashes & Brows */}
          <path d="M 38,37 Q 42,35 46,37" fill="none" stroke="#1f0f08" strokeWidth="1.2" strokeLinecap="round" />
          <path d="M 54,37 Q 58,35 62,37" fill="none" stroke="#1f0f08" strokeWidth="1.2" strokeLinecap="round" />

          {/* Nose */}
          <path d="M 49,45 Q 50,47 51,45" fill="none" stroke={palette.shadow} strokeWidth="1.4" strokeLinecap="round" />

          {/* Gentle Serene Smile */}
          <path d="M 45,52 Q 50,56 55,52" fill="none" stroke="#be185d" strokeWidth="1.6" strokeLinecap="round" />

          {/* 6. Hair Front / Style */}
          {hair === 'sleek_bob' && (
            <path 
              d="M 32,38 Q 30,55 35,56 Q 40,24 50,24 Q 60,24 65,56 Q 70,55 68,38 Q 66,22 50,22 Q 34,22 32,38 Z" 
              fill="url(#hairGrad)" 
            />
          )}

          {hair === 'pixie' && (
            <path 
              d="M 33,35 Q 35,22 50,22 Q 65,22 67,35 Q 60,25 50,26 Q 40,25 33,35 Z" 
              fill="url(#hairGrad)" 
            />
          )}

          {hair === 'braided_crown' && (
            <path 
              d="M 32,32 Q 50,22 68,32 Q 50,18 32,32 Z" 
              fill="url(#hairGrad)" 
              stroke="#4a2a1a" 
              strokeWidth="1.5" 
            />
          )}

          {hair === 'short_waves' && (
            <path 
              d="M 32,36 Q 40,26 50,27 Q 60,26 68,36 Q 62,23 50,23 Q 38,23 32,36 Z" 
              fill="url(#hairGrad)" 
            />
          )}

          {/* 7. Headwrap / Crown Accessories */}
          {headwrap === 'floral_crown' && (
            <g>
              <path d="M 32,30 Q 50,22 68,30" fill="none" stroke="#15803d" strokeWidth="1.5" strokeLinecap="round" />
              <circle cx="36" cy="28" r="3" fill="#fb7185" />
              <circle cx="43" cy="25" r="3.2" fill="#fda4af" />
              <circle cx="50" cy="24" r="3.5" fill="#f43f5e" />
              <circle cx="57" cy="25" r="3.2" fill="#fb7185" />
              <circle cx="64" cy="28" r="3" fill="#fda4af" />
              <circle cx="50" cy="24" r="1.2" fill="#fef08a" />
            </g>
          )}

          {headwrap === 'silk_wrap' && (
            <g>
              <path d="M 30,34 Q 50,18 70,34 Q 50,24 30,34 Z" fill="url(#silkWrapGrad)" />
              <circle cx="50" cy="24" r="3" fill="#f59e0b" />
            </g>
          )}

          {headwrap === 'minimal_band' && (
            <path d="M 33,30 Q 50,22 67,30" fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" />
          )}

          {/* 8. Glasses */}
          {glasses === 'round' && (
            <g stroke="#d97706" strokeWidth="1.4" fill="rgba(255,255,255,0.25)">
              <circle cx="42" cy="42" r="5" />
              <circle cx="58" cy="42" r="5" />
              <line x1="47" y1="42" x2="53" y2="42" stroke="#d97706" strokeWidth="1.2" />
            </g>
          )}

          {glasses === 'cat_eye' && (
            <g stroke="#db2777" strokeWidth="1.4" fill="rgba(255,255,255,0.25)">
              <path d="M 36,40 Q 42,37 48,42 Q 44,47 38,45 Z" />
              <path d="M 64,40 Q 58,37 52,42 Q 56,47 62,45 Z" />
              <line x1="48" y1="42" x2="52" y2="42" stroke="#db2777" strokeWidth="1.2" />
            </g>
          )}

          {glasses === 'square' && (
            <g stroke="#475569" strokeWidth="1.4" fill="rgba(255,255,255,0.25)">
              <rect x="37" y="38" width="10" height="8" rx="2" />
              <rect x="53" y="38" width="10" height="8" rx="2" />
              <line x1="47" y1="42" x2="53" y2="42" stroke="#475569" strokeWidth="1.2" />
            </g>
          )}
        </svg>
      </div>

      {/* Optional Progression Level / Tier Badge Indicator */}
      {showTierBadge && (
        <div className="absolute -bottom-1 -right-1 bg-white border border-pink-200 rounded-full w-5 h-5 flex items-center justify-center text-[10px] shadow-sm">
          {avatar.tier === 'flourishing' ? '👑' : avatar.tier === 'radiant' ? '💎' : avatar.tier === 'blooming' ? '🌸' : '🌱'}
        </div>
      )}
    </motion.div>
  );
};

export default AvatarVisual;
