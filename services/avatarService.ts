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
  AvatarActionLog 
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
}> = {
  amara: {
    name: 'Amara',
    title: 'The Radiant Bloom',
    personality: 'Warm, nurturing, botanical, and soothing guide',
    quote: 'Your body is a blooming garden. Honor each season with love.',
    skinTone: 'amber',
    hairstyle: 'afro_puffs',
    headwrap: 'floral_crown',
    glasses: 'none',
    outfit: 'floral_sundress',
    accentColor: '#f43f5e',
    emoji: '🌸'
  },
  zainab: {
    name: 'Zainab',
    title: 'The Serene Oasis',
    personality: 'Mindful, calm, grounded, and deeply reflective',
    quote: 'Find tranquility in your stillness. Peace lives within your breath.',
    skinTone: 'chestnut',
    hairstyle: 'braided_crown',
    headwrap: 'silk_wrap',
    glasses: 'none',
    outfit: 'linen_loungewear',
    accentColor: '#8b5cf6',
    emoji: '🌿'
  },
  kemi: {
    name: 'Kemi',
    title: 'The Bright Spirit',
    personality: 'Energetic, uplifting, empowering, and vibrant guide',
    quote: 'Step boldly into your power. Your radiance lights up every room.',
    skinTone: 'espresso',
    hairstyle: 'box_braids',
    headwrap: 'none',
    glasses: 'cat_eye',
    outfit: 'athleisure_wrap',
    accentColor: '#f59e0b',
    emoji: '☀️'
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
    emoji: '🍃'
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
    emoji: '🌺'
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
    emoji: '✨'
  }
};

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

  // Companion Level: Every 100 XP is 1 level
  const level = Math.max(1, Math.floor(totalXP / 100) + 1);
  const xpInLevel = totalXP % 100;
  const xpForNextLevel = 100;

  // Progression Tiers
  // Seedling: 0–5 cycles logged
  // Blooming: 6+ cycles logged, regular tracking
  // Radiant: 12+ cycles logged, consistent engagement
  // Flourishing: 18+ cycles logged, high engagement
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
    const pStart = user.pregnancyStartDate ? new Date(user.pregnancyStartDate) : new Date(Date.now() - 14 * 7 * 86400000);
    const diffWeeks = Math.max(1, Math.min(42, Math.floor((Date.now() - pStart.getTime()) / (1000 * 60 * 60 * 24 * 7))));
    const trimester = diffWeeks <= 13 ? 1 : diffWeeks <= 27 ? 2 : 3;

    return {
      greeting,
      cycleStatusText: `You are in Week ${diffWeeks} • Trimester ${trimester}`,
      companionMessage: `You’re doing beautifully. Remember to stay hydrated. Don’t forget your hydration goal.`,
      phaseLabel: `Pregnancy (Week ${diffWeeks})`,
      emoji: '🤰🏽'
    };
  }

  // 2. Postpartum Mode
  if (user.isPostpartumMode) {
    return {
      greeting,
      cycleStatusText: 'Postpartum Nurturing & Restoration Phase',
      companionMessage: `Recovery takes time. Be kind to yourself and be gentle with yourself today.`,
      phaseLabel: 'Postpartum Restoration',
      emoji: '👶🏽'
    };
  }

  // 3. Menstrual & Bio-Cycle Tracking
  const lastStartStr = user.lastPeriodStart || (user.periods && user.periods[0]?.startDate);
  const cycleLen = user.cycleLength || 28;
  const periodLen = user.periodLength || 5;

  let cycleDay = 12; // default
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
      cycleStatusText: `Your cycle is on Day ${cycleDay} • ${lateDays} days past expected date`,
      companionMessage: `Hi ${username} 🌸. Your period is a few days past expected. Remember to breathe and listen to your body’s unique pace.`,
      phaseLabel: 'Cycle Past Expected',
      emoji: '⏳'
    };
  }

  // Menstrual Phase (Days 1 to periodLen)
  if (cycleDay <= periodLen) {
    return {
      greeting,
      cycleStatusText: `Your cycle is on Day ${cycleDay} • Menstrual Phase`,
      companionMessage: `Take things gently today and prioritize rest.`,
      phaseLabel: 'Menstrual Phase',
      emoji: '🩸'
    };
  }

  // Imminent period (Starts in 1-2 days)
  if (daysToNextPeriod <= 2 && daysToNextPeriod >= 1) {
    return {
      greeting,
      cycleStatusText: `Your cycle is on Day ${cycleDay} • Menstrual Phase approaching`,
      companionMessage: `Hi ${username} 🌸. Your period may begin in ${daysToNextPeriod} ${daysToNextPeriod === 1 ? 'day' : 'days'}. Remember to prepare your comfort kit.`,
      phaseLabel: 'Pre-Menstrual Window',
      emoji: '🌸'
    };
  }

  // Follicular Phase (Days periodLen+1 to Ovulation - 3)
  if (daysToOvulation > 2) {
    return {
      greeting,
      cycleStatusText: `Your cycle is on Day ${cycleDay} • Follicular Phase`,
      companionMessage: `Your energy may be increasing today.`,
      phaseLabel: 'Follicular Phase',
      emoji: '🌱'
    };
  }

  // Fertile Window & Ovulation (Ovulation - 2 to Ovulation + 1)
  if (daysToOvulation >= -1 && daysToOvulation <= 2) {
    const windowText = daysToOvulation === 0 
      ? 'Predicted ovulation is today 🌟' 
      : daysToOvulation > 0 
      ? `Your fertile window starts in ${daysToOvulation} days.`
      : 'Peak fertility window is closing.';

    return {
      greeting,
      cycleStatusText: `Your cycle is on Day ${cycleDay}. ${daysToOvulation > 0 ? `Your fertile window starts in ${daysToOvulation} days.` : 'Your fertile window is active.'}`,
      companionMessage: `Your fertile window is active today.`,
      phaseLabel: 'Ovulation & Fertile Window',
      emoji: '☀️'
    };
  }

  // Luteal Phase (Post Ovulation)
  return {
    greeting,
    cycleStatusText: `Your cycle is on Day ${cycleDay} • Luteal Phase (Period in ${daysToNextPeriod} days)`,
    companionMessage: `The body is turning inward, ${username} 🍂. Honor your boundaries, nourish yourself with warm slow foods, and protect your peace.`,
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
