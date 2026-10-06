import { 
  User, 
  UserAvatar, 
  AvatarId, 
  AvatarTier, 
  SkinTone, 
  Hairstyle, 
  Headwrap, 
  Glasses, 
  Outfit, 
  AvatarActionLog,
  AvatarMood,
  AvatarAccent,
  AvatarPersonalityStyle,
  CompanionRelationshipStage
} from '../types';
import { syncUser } from './firebaseService';

// Default presets for the 6 signature Lumina Companions
export const AVATAR_PRESETS: Record<AvatarId, {
  name: string;
  title: string;
  personality: string;
  quote: string;
  skinTone: SkinTone;
  hairstyle: Hairstyle;
  headwrap: Headwrap;
  glasses: Glasses;
  outfit: Outfit;
  accentColor: string;
  emoji: string;
  defaultAccent: AvatarAccent;
  defaultPersonality: AvatarPersonalityStyle;
  bio: string;
  traits: string[];
  personalityDescription: string;
}> = {
  amara: {
    name: 'Amara',
    title: 'Your supportive wellness companion',
    personality: 'Warm, gentle, encouraging guide',
    quote: 'Your body is a blooming garden. Honor each season with love.',
    skinTone: 'amber',
    hairstyle: 'afro_puffs',
    headwrap: 'floral_crown',
    glasses: 'none',
    outfit: 'floral_sundress',
    accentColor: '#f43f5e',
    emoji: '🌸',
    defaultAccent: 'us',
    defaultPersonality: 'supportive',
    traits: ['Warm', 'Gentle', 'Encouraging'],
    personalityDescription: 'Your supportive wellness companion.',
    bio: 'Guides you through your cycle, symptoms, wellness goals, and daily check-ins with tender grace.'
  },
  zainab: {
    name: 'Zainab',
    title: 'Your motivational wellness coach',
    personality: 'Friendly, motivational, energetic coach',
    quote: 'Energy flows where attention goes. You have the power to thrive.',
    skinTone: 'chestnut',
    hairstyle: 'braided_crown',
    headwrap: 'silk_wrap',
    glasses: 'none',
    outfit: 'linen_loungewear',
    accentColor: '#8b5cf6',
    emoji: '⚡',
    defaultAccent: 'west_african',
    defaultPersonality: 'motivational',
    traits: ['Friendly', 'Motivational', 'Energetic'],
    personalityDescription: 'Your motivational energy & wellness coach.',
    bio: 'Ignites your motivation, movement, empowering habits, and positive energy every single day.'
  },
  naomi: {
    name: 'Naomi',
    title: 'Your calm sanctuary guide',
    personality: 'Calm, wise, reflective mentor',
    quote: 'Find peace in your stillness. Let your breath anchor your heart.',
    skinTone: 'honey',
    hairstyle: 'sleek_bob',
    headwrap: 'minimal_band',
    glasses: 'round',
    outfit: 'linen_loungewear',
    accentColor: '#10b981',
    emoji: '🌿',
    defaultAccent: 'uk',
    defaultPersonality: 'calm',
    traits: ['Calm', 'Wise', 'Reflective'],
    personalityDescription: 'Your calm, wise, and reflective guide.',
    bio: 'Provides mindful grounding, peaceful perspective, deep emotional soothing, and restorative clarity.'
  },
  amina: {
    name: 'Amina',
    title: 'Your cheerful wellness cheerleader',
    personality: 'Cheerful, positive, supportive companion',
    quote: 'Every new day is a fresh bloom of joy. Smile and shine bright!',
    skinTone: 'peach',
    hairstyle: 'short_waves',
    headwrap: 'silk_wrap',
    glasses: 'none',
    outfit: 'athleisure_wrap',
    accentColor: '#ec4899',
    emoji: '☀️',
    defaultAccent: 'us',
    defaultPersonality: 'cheerful',
    traits: ['Cheerful', 'Positive', 'Supportive'],
    personalityDescription: 'Your cheerful, uplifting wellness cheerleader.',
    bio: 'Brings sunshine, optimism, celebratory high-fives, and joyful encouragement to your health journey.'
  },
  kemi: {
    name: 'Kemi',
    title: 'Your vibrant wellness guide',
    personality: 'Energetic, uplifting, empowering, and vibrant guide',
    quote: 'Step boldly into your power. Your radiance lights up every room.',
    skinTone: 'espresso',
    hairstyle: 'box_braids',
    headwrap: 'none',
    glasses: 'cat_eye',
    outfit: 'athleisure_wrap',
    accentColor: '#f59e0b',
    emoji: '✨',
    defaultAccent: 'west_african',
    defaultPersonality: 'cheerful',
    traits: ['Vibrant', 'Empowering', 'Passionate'],
    personalityDescription: 'Your vibrant, spirited wellness guide.',
    bio: 'Empowers you with movement, daily motivation, positive affirmations, and energizing habits.'
  },
  nia: {
    name: 'Nia',
    title: 'The Harmonious Soul',
    personality: 'Intuitive, balanced, holistic, and wise companion',
    quote: 'Balance is not something you find; it is something you create with care.',
    skinTone: 'honey',
    hairstyle: 'sleek_bob',
    headwrap: 'minimal_band',
    glasses: 'round',
    outfit: 'cozy_kimono',
    accentColor: '#10b981',
    emoji: '🍃',
    defaultAccent: 'uk',
    defaultPersonality: 'mindful',
    traits: ['Intuitive', 'Balanced', 'Holistic'],
    personalityDescription: 'Your holistic rhythm & balance guide.',
    bio: 'Attunes your hydration, nutrition, bio-rhythm equilibrium, and mindful cycle tracking.'
  },
  maya: {
    name: 'Maya',
    title: 'The Creative Blossom',
    personality: 'Gentle, expressive, poetic, and restorative presence',
    quote: 'Embrace every emotion like a petal unfolding in the dawn light.',
    skinTone: 'peach',
    hairstyle: 'long_curls',
    headwrap: 'floral_crown',
    glasses: 'none',
    outfit: 'flowing_tunic',
    accentColor: '#ec4899',
    emoji: '🌺',
    defaultAccent: 'irish',
    defaultPersonality: 'supportive',
    traits: ['Gentle', 'Poetic', 'Restorative'],
    personalityDescription: 'Your poetic, restorative sanctuary guide.',
    bio: 'Nurtures your diary reflections, mood tracking, gentle self-compassion, and creative flow.'
  },
  aria: {
    name: 'Aria',
    title: 'The Golden Glow',
    personality: 'Modern, playful, spirited, and cheerful wellness supporter',
    quote: 'Celebrate your daily milestones, no matter how small they seem.',
    skinTone: 'fair',
    hairstyle: 'high_bun',
    headwrap: 'none',
    glasses: 'square',
    outfit: 'cozy_kimono',
    accentColor: '#d97706',
    emoji: '🌟',
    defaultAccent: 'australian',
    defaultPersonality: 'cheerful',
    traits: ['Playful', 'Spirited', 'Cheering'],
    personalityDescription: 'Your bright, playful wellness friend.',
    bio: 'Cheers for every milestone, hydration goal, symptom log, and streak with infectious warmth.'
  }
};

/**
 * Computes companion mood based on current wellness data
 */
export function calculateAvatarMood(user: User, avatar: UserAvatar): {
  mood: AvatarMood;
  label: string;
  emoji: string;
  description: string;
  auraGradient: string;
} {
  // If user explicitly configured avatar mood, prioritize it unless auto-wellness
  if (avatar.mood) {
    const moodMap: Record<AvatarMood, { label: string; emoji: string; description: string; auraGradient: string }> = {
      radiant: { label: 'Radiant', emoji: '🌸', description: 'Glowing with high vitality and inner light', auraGradient: 'from-pink-400 via-rose-300 to-amber-300' },
      cozy: { label: 'Cozy & Gentle', emoji: '🍵', description: 'Nesting gently, resting, and restoring energy', auraGradient: 'from-amber-400 via-rose-200 to-pink-200' },
      serene: { label: 'Serene & Mindful', emoji: '🌿', description: 'Centered in peaceful emotional equilibrium', auraGradient: 'from-emerald-400 via-teal-200 to-purple-200' },
      nurturing: { label: 'Nurturing', emoji: '🤰🏽', description: 'Surrounding you with maternal and healing warmth', auraGradient: 'from-rose-400 via-pink-300 to-purple-300' },
      energized: { label: 'Energized', emoji: '☀️', description: 'Inspired, active, and vibrating with strength', auraGradient: 'from-amber-500 via-yellow-300 to-pink-400' }
    };
    if (moodMap[avatar.mood]) {
      return { mood: avatar.mood, ...moodMap[avatar.mood] };
    }
  }

  // Auto-calculated from health data:
  if (user.isPregnancyMode || user.isPostpartumMode) {
    return {
      mood: 'nurturing',
      label: 'Nurturing & Gentle',
      emoji: user.isPregnancyMode ? '🤰🏽' : '👶🏽',
      description: user.isPregnancyMode ? 'Blooming with maternal radiance and deep care' : 'Gently holding space for healing fourth-trimester rest',
      auraGradient: 'from-rose-400 via-pink-300 to-purple-300'
    };
  }

  // Menstrual phase check
  const lastStartStr = user.lastPeriodStart || (user.periods && user.periods[0]?.startDate);
  const cycleLen = user.cycleLength || 28;
  const periodLen = user.periodLength || 5;

  if (lastStartStr) {
    const sDate = new Date(lastStartStr);
    const today = new Date();
    const diffDays = Math.floor((today.getTime() - sDate.getTime()) / (1000 * 60 * 60 * 24));
    const cycleDay = ((diffDays % cycleLen) + cycleLen) % cycleLen + 1;
    const daysToOvulation = (cycleLen - 14) - cycleDay;

    if (cycleDay <= periodLen) {
      return {
        mood: 'cozy',
        label: 'Cozy & Comforting',
        emoji: '🍵',
        description: 'Attuned to your period rest: holding gentle space for comfort and warmth',
        auraGradient: 'from-rose-300 via-pink-200 to-amber-200'
      };
    }

    if (daysToOvulation >= -1 && daysToOvulation <= 2) {
      return {
        mood: 'radiant',
        label: 'Peak Radiance',
        emoji: '✨',
        description: 'Vibrant, open, and attuned to your fertile window and high vitality',
        auraGradient: 'from-pink-400 via-rose-300 to-amber-300'
      };
    }
  }

  // Active streak
  if ((avatar.wellnessStreak || 0) >= 5) {
    return {
      mood: 'energized',
      label: 'Energized & Joyful',
      emoji: '☀️',
      description: 'Celebrating your unbroken self-care rhythm and glowing momentum',
      auraGradient: 'from-amber-400 via-orange-300 to-pink-300'
    };
  }

  return {
    mood: 'serene',
    label: 'Serene Sanctuary',
    emoji: '🌿',
    description: 'Calm, grounded, and peacefully aligned with your wellness flow',
    auraGradient: 'from-purple-300 via-pink-200 to-teal-200'
  };
}

export const SKIN_TONE_PALETTES: Record<SkinTone, { label: string; base: string; shadow: string; highlight: string }> = {
  fair: { label: 'Fair Glow', base: '#fde4df', shadow: '#f3b8ae', highlight: '#ffffff' },
  peach: { label: 'Warm Peach', base: '#fbcfe8', shadow: '#f472b6', highlight: '#fdf2f8' },
  honey: { label: 'Golden Honey', base: '#d4a373', shadow: '#bc8a5f', highlight: '#faedcd' },
  amber: { label: 'Warm Amber', base: '#b07248', shadow: '#965d38', highlight: '#d4a373' },
  chestnut: { label: 'Deep Chestnut', base: '#7e4828', shadow: '#64351b', highlight: '#a05c36' },
  espresso: { label: 'Rich Espresso', base: '#502d1a', shadow: '#3a1f10', highlight: '#734125' },
  obsidian: { label: 'Obsidian Velvet', base: '#351e16', shadow: '#24130c', highlight: '#542e20' }
};

export const HAIRSTYLES_LIST: { id: Hairstyle; label: string; icon: string }[] = [
  { id: 'afro_puffs', label: 'Afro Puffs', icon: '👩🏾‍🦱' },
  { id: 'braided_crown', label: 'Braided Crown', icon: '👑' },
  { id: 'box_braids', label: 'Box Braids', icon: '🪢' },
  { id: 'sleek_bob', label: 'Sleek Bob', icon: '💇🏽‍♀️' },
  { id: 'long_curls', label: 'Cascading Curls', icon: '✨' },
  { id: 'high_bun', label: 'Regal Topknot', icon: '🎀' },
  { id: 'short_waves', label: 'Soft Waves', icon: '🌊' },
  { id: 'pixie', label: 'Chic Pixie', icon: '💫' }
];

export const HEADWRAPS_LIST: { id: Headwrap; label: string; icon: string }[] = [
  { id: 'none', label: 'No Headpiece', icon: '🚫' },
  { id: 'floral_crown', label: 'Blooming Floral Crown', icon: '🌸' },
  { id: 'silk_wrap', label: 'Royal Silk Wrap', icon: '🧣' },
  { id: 'minimal_band', label: 'Rose Gold Band', icon: '✨' }
];

export const GLASSES_LIST: { id: Glasses; label: string; icon: string }[] = [
  { id: 'none', label: 'No Glasses', icon: '👁️' },
  { id: 'cat_eye', label: 'Chic Cat-Eye Specs', icon: '👓' },
  { id: 'round', label: 'Golden Wire Round', icon: '🕶️' },
  { id: 'square', label: 'Classic Modern Square', icon: '👓' }
];

export const OUTFITS_LIST: { 
  id: Outfit; 
  label: string; 
  category: 'standard' | 'pregnancy' | 'postpartum';
  icon: string;
  desc: string;
}[] = [
  { id: 'floral_sundress', label: 'Botanical Sundress', category: 'standard', icon: '👗', desc: 'Lightweight pastel sundress with delicate blooming flora.' },
  { id: 'linen_loungewear', label: 'Minimalist Linen Loungewear', category: 'standard', icon: '👘', desc: 'Breathable oatmeal linen tailored for peaceful nesting.' },
  { id: 'cozy_kimono', label: 'Cozy Silk Kimono', category: 'standard', icon: '🌸', desc: 'Gentle drape robe with soothing blush accents.' },
  { id: 'athleisure_wrap', label: 'Wellness Yoga Wrap', category: 'standard', icon: '🧘🏽‍♀️', desc: 'Flex-support activewear wrap for stretching and meditation.' },
  
  // Pregnancy themed
  { id: 'maternity_wrap', label: 'Supportive Maternity Wrap', category: 'pregnancy', icon: '🤰🏽', desc: 'Sculpted soft cotton wrap contoured gently for your baby bump.' },
  { id: 'bump_loungewear', label: 'Ribbed Bump Tunic', category: 'pregnancy', icon: '🍼', desc: 'Ultra-stretch nurturing ribbed set designed for maternal comfort.' },
  { id: 'flowing_tunic', label: 'Breezy Maternal Tunic', category: 'pregnancy', icon: '🕊️', desc: 'Free-flowing bohemian dress honoring your body in creation.' },

  // Postpartum themed
  { id: 'nursing_robe', label: 'Nursing Crossover Robe', category: 'postpartum', icon: '👶🏽', desc: 'Gentle quick-crossover organic robe for nourishing bonding.' },
  { id: 'restore_kimono', label: 'Healing Restoration Kimono', category: 'postpartum', icon: '🍵', desc: 'Warm comforting layer engineered for fourth trimester recovery.' },
  { id: 'skin_to_skin', label: 'Skin-to-Skin Bonding Wrap', category: 'postpartum', icon: '🤱🏽', desc: 'Intimate soft wrap for chest-to-chest connection and rest.' }
];

/**
 * Initializes or resolves a user's avatar profile
 */
export function getOrCreateUserAvatar(user: User): UserAvatar {
  if (user.avatar) {
    return user.avatar;
  }

  // Create default companion (Amara)
  const preset = AVATAR_PRESETS.amara;
  return {
    id: 'amara',
    name: preset.name,
    title: preset.title,
    personality: preset.personality,
    skinTone: preset.skinTone,
    hairstyle: preset.hairstyle,
    headwrap: preset.headwrap,
    glasses: preset.glasses,
    outfit: user.isPregnancyMode ? 'maternity_wrap' : user.isPostpartumMode ? 'nursing_robe' : preset.outfit,
    tier: 'seedling',
    level: 1,
    xp: 0,
    wellnessStreak: 1,
    selfCareScore: 78,
    personalityStyle: preset.defaultPersonality || 'supportive',
    accent: preset.defaultAccent || 'us',
    mood: 'radiant',
    unlockedOutfits: ['floral_sundress', 'cozy_kimono', 'linen_loungewear', 'athleisure_wrap'],
    unlockedAccessories: ['floral_crown', 'minimal_band', 'round'],
    actionHistory: []
  };
}

/**
 * Calculates current avatar progression tier & stats
 */
export function calculateAvatarProgression(user: User, avatar: UserAvatar): {
  tier: AvatarTier;
  tierLabel: string;
  tierDescription: string;
  tierBadgeColor: string;
  level: number;
  relationshipStage: CompanionRelationshipStage;
  stageDescription: string;
  unlockedVisuals: string[];
  xpInLevel: number;
  xpForNextLevel: number;
  totalXP: number;
  wellnessStreak: number;
  selfCareScore: number;
  cyclesLogged: number;
  symptomsLogged: number;
} {
  const cyclesLogged = user.periods && user.periods.length > 1 ? user.periods.length - 1 : (user.periods?.length || 0);
  const symptomsLogged = user.symptoms?.length || 0;
  const moodLogs = user.moodLogs?.length || 0;
  const diaryLogs = user.diaryEntries?.length || 0;
  const actionHistory = avatar.actionHistory || [];

  // Calculate XP from all activities
  const historyXP = actionHistory.reduce((acc, curr) => acc + (curr.points || 0), 0);
  const baseXP = (cyclesLogged * 50) + (symptomsLogged * 10) + (moodLogs * 10) + (diaryLogs * 15);
  const totalXP = Math.max(avatar.xp || 0, baseXP + historyXP);

  // Companion Level: Progression milestones
  let level = 1;
  let relationshipStage: CompanionRelationshipStage = 'New Friend';
  let stageDescription = 'Getting to know each other gently';
  let unlockedVisuals: string[] = ['standard_companion'];

  if (totalXP >= 900 || cyclesLogged >= 12) {
    level = 5;
    relationshipStage = 'Inner Circle';
    stageDescription = 'Deep soul sanctuary & bonded sisterhood';
    unlockedVisuals = ['standard_companion', 'rose_glow_aura', 'botanical_petals', 'golden_halo', 'celestial_crown'];
  } else if (totalXP >= 500 || cyclesLogged >= 8) {
    level = 4;
    relationshipStage = 'Trusted Friend';
    stageDescription = 'Mutual trust, intuitive check-ins & comfort';
    unlockedVisuals = ['standard_companion', 'rose_glow_aura', 'botanical_petals', 'golden_halo'];
  } else if (totalXP >= 250 || cyclesLogged >= 4) {
    level = 3;
    relationshipStage = 'Wellness Partner';
    stageDescription = 'Daily rhythm alignment & shared milestones';
    unlockedVisuals = ['standard_companion', 'rose_glow_aura', 'botanical_petals'];
  } else if (totalXP >= 100 || cyclesLogged >= 1) {
    level = 2;
    relationshipStage = 'Companion';
    stageDescription = 'Comfortable daily guidance & friendly warmth';
    unlockedVisuals = ['standard_companion', 'rose_glow_aura'];
  }

  const xpInLevel = totalXP % 100;
  const xpForNextLevel = 100;

  // Progression Tiers
  let tier: AvatarTier = 'seedling';
  let tierLabel = 'Seedling';
  let tierDescription = 'New Companion (0–5 cycles logged)';
  let tierBadgeColor = 'bg-emerald-50 text-emerald-700 border-emerald-200';

  if (cyclesLogged >= 18 || totalXP >= 1500) {
    tier = 'flourishing';
    tierLabel = 'Flourishing';
    tierDescription = '18+ cycles logged • Master Harmony';
    tierBadgeColor = 'bg-purple-50 text-purple-700 border-purple-200';
  } else if (cyclesLogged >= 12 || totalXP >= 800) {
    tier = 'radiant';
    tierLabel = 'Radiant';
    tierDescription = '12+ cycles logged • Consistent Engagement';
    tierBadgeColor = 'bg-amber-50 text-amber-700 border-amber-200';
  } else if (cyclesLogged >= 6 || totalXP >= 300) {
    tier = 'blooming';
    tierLabel = 'Blooming';
    tierDescription = '6+ cycles logged • Regular Symptom Tracking';
    tierBadgeColor = 'bg-pink-50 text-pink-700 border-pink-200';
  }

  // Wellness streak (derive from recent diary or default healthy streak)
  let wellnessStreak = Math.max(avatar.wellnessStreak || 3, Math.min(30, 3 + Math.floor(totalXP / 60)));

  // Self care score (0 to 100)
  const selfCareScore = Math.min(98, Math.max(65, 75 + Math.floor(symptomsLogged * 1.5) + (user.periodDates ? 5 : 0)));

  return {
    tier,
    tierLabel,
    tierDescription,
    tierBadgeColor,
    level,
    relationshipStage,
    stageDescription,
    unlockedVisuals,
    xpInLevel,
    xpForNextLevel,
    totalXP,
    wellnessStreak,
    selfCareScore,
    cyclesLogged,
    symptomsLogged
  };
}

/**
 * Generates dynamic, context-aware companion speech based on cycle phase,
 * pregnancy, postpartum, mood, and daily wellness activity.
 */
export function getAvatarCompanionSpeech(user: User, avatar: UserAvatar): {
  greeting: string;
  cycleStatusText: string;
  companionMessage: string;
  phaseLabel: string;
  emoji: string;
} {
  const username = user.firstName || user.name || 'friend';
  const now = new Date();
  const hour = now.getHours();

  let greeting = `Good morning, ${username}`;
  if (hour >= 12 && hour < 17) {
    greeting = `Good afternoon, ${username}`;
  } else if (hour >= 17) {
    greeting = `Good evening, ${username}`;
  }

  // 1. Pregnancy Mode
  if (user.isPregnancyMode) {
    const pStart = user.pregnancyStartDate ? new Date(user.pregnancyStartDate) : new Date(Date.now() - 24 * 7 * 86400000);
    const diffWeeks = Math.max(1, Math.min(42, Math.floor((Date.now() - pStart.getTime()) / (1000 * 60 * 60 * 24 * 7))));
    const trimester = diffWeeks <= 13 ? 1 : diffWeeks <= 27 ? 2 : 3;

    return {
      greeting,
      cycleStatusText: `Week ${diffWeeks} • Trimester ${trimester}`,
      companionMessage: `You’re now ${diffWeeks} weeks along. Your baby is growing beautifully.`,
      phaseLabel: `Pregnancy (Week ${diffWeeks})`,
      emoji: '🤰🏽'
    };
  }

  // 2. Postpartum Mode
  if (user.isPostpartumMode) {
    return {
      greeting,
      cycleStatusText: 'Postpartum Nurturing & Restoration',
      companionMessage: 'You’re doing amazing. Recovery takes time, and every small step matters.',
      phaseLabel: 'Postpartum Restoration',
      emoji: '👶🏽'
    };
  }

  // 3. Menstrual & Bio-Cycle Tracking
  const lastStartStr = user.lastPeriodStart || (user.periods && user.periods[0]?.startDate);
  const cycleLen = user.cycleLength || 28;
  const periodLen = user.periodLength || 5;

  let cycleDay = 12;
  let daysToNextPeriod = 16;
  let daysToOvulation = 2;

  if (lastStartStr) {
    const sDate = new Date(lastStartStr);
    const today = new Date();
    const diffDays = Math.floor((today.getTime() - sDate.getTime()) / (1000 * 60 * 60 * 24));
    cycleDay = ((diffDays % cycleLen) + cycleLen) % cycleLen + 1;
    daysToNextPeriod = cycleLen - cycleDay;
    const ovulationDay = cycleLen - 14;
    daysToOvulation = ovulationDay - cycleDay;
  }

  // Late period
  if (daysToNextPeriod < 0 || (lastStartStr && (now.getTime() - new Date(lastStartStr).getTime()) / 86400000 > cycleLen + 2)) {
    const lateDays = Math.abs(daysToNextPeriod);
    return {
      greeting,
      cycleStatusText: `Cycle Day ${cycleDay} • ${lateDays} days past expected date`,
      companionMessage: `Your cycle is on Day ${cycleDay}. Listen to your body and honor your unique rhythm.`,
      phaseLabel: 'Cycle Past Expected',
      emoji: '⏳'
    };
  }

  // Menstrual Phase (Days 1 to periodLen)
  if (cycleDay <= periodLen) {
    return {
      greeting,
      cycleStatusText: `Cycle Day ${cycleDay} • Menstrual Phase`,
      companionMessage: `You’re on Day ${cycleDay} of your cycle today. Take it easy and stay hydrated.`,
      phaseLabel: 'Menstrual Phase',
      emoji: '🩸'
    };
  }

  // Fertile Window & Ovulation (Ovulation - 2 to Ovulation + 1)
  if (daysToOvulation >= -1 && daysToOvulation <= 2) {
    return {
      greeting,
      cycleStatusText: `Cycle Day ${cycleDay} • Fertile Window`,
      companionMessage: daysToOvulation === 0 ? 'Predicted ovulation is today. You’re currently in your fertile window.' : 'You’re currently in your fertile window.',
      phaseLabel: 'Ovulation & Fertile Window',
      emoji: '☀️'
    };
  }

  // Follicular Phase (Days periodLen+1 to Ovulation - 3)
  if (daysToOvulation > 2) {
    return {
      greeting,
      cycleStatusText: `Cycle Day ${cycleDay} • Follicular Phase`,
      companionMessage: `You’re in your follicular phase. Your vitality and focus are expanding.`,
      phaseLabel: 'Follicular Phase',
      emoji: '🌱'
    };
  }

  // Luteal Phase (Post Ovulation)
  return {
    greeting,
    cycleStatusText: `Cycle Day ${cycleDay} • Luteal Phase (Period in ${daysToNextPeriod} days)`,
    companionMessage: `You’re in your luteal phase. Slow down gently and listen to what your body needs.`,
    phaseLabel: 'Luteal Phase',
    emoji: '🍂'
  };
}

/**
 * Logs an avatar reward action, granting XP and advancing levels
 */
export async function logAvatarActionReward(
  user: User,
  action: AvatarActionLog['action'],
  label: string,
  setUser?: React.Dispatch<React.SetStateAction<User | null>> | ((u: any) => void)
): Promise<{ earnedXP: number; newLevel: number; leveledUp: boolean }> {
  const pointsMap: Record<AvatarActionLog['action'], number> = {
    log_cycle: 50,
    track_symptoms: 10,
    postpartum_yoga: 25,
    read_guide: 15,
    self_care_challenge: 30,
    log_water: 10,
    log_mood: 10
  };

  const earnedXP = pointsMap[action] || 10;
  const currentAvatar = getOrCreateUserAvatar(user);
  const oldLevel = currentAvatar.level;

  const newLog: AvatarActionLog = {
    id: `act_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
    action,
    label,
    points: earnedXP,
    timestamp: new Date().toISOString()
  };

  const updatedActionHistory = [newLog, ...(currentAvatar.actionHistory || [])].slice(0, 50);
  const updatedTotalXP = (currentAvatar.xp || 0) + earnedXP;
  const newLevel = Math.max(1, Math.floor(updatedTotalXP / 100) + 1);
  const leveledUp = newLevel > oldLevel;

  const updatedAvatar: UserAvatar = {
    ...currentAvatar,
    xp: updatedTotalXP,
    level: newLevel,
    actionHistory: updatedActionHistory
  };

  const updatedUser: User = {
    ...user,
    avatar: updatedAvatar
  };

  if (setUser) {
    setUser(updatedUser);
  }
  await syncUser(updatedUser);

  return { earnedXP, newLevel, leveledUp };
}
