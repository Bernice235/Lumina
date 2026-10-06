import { User, UserAvatar, AvatarId, AvatarAccent, AvatarPersonalityStyle, AvatarMood } from '../types';
import { AVATAR_PRESETS, getOrCreateUserAvatar } from './avatarService';

export interface WelcomeGreeting {
  displayText: string;
  speechText: string;
  timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night';
  timeLabel: string;
  emoji: string;
  firstName: string;
  avatarName?: string;
  avatarId?: AvatarId;
  healthContext?: string;
  isIntroduction?: boolean;
}

// Global references to prevent garbage collection in Chromium / WebKit
declare global {
  interface Window {
    _luminaUtterance?: SpeechSynthesisUtterance | null;
    _luminaAudioCtx?: AudioContext | null;
    _luminaVoiceUnlocked?: boolean;
    _luminaSpeechInterval?: any;
    _luminaPendingGreeting?: WelcomeGreeting | null;
  }
}

const SESSION_STORAGE_KEY = 'lumina_session_welcome_played';

let unlockListenersAttached = false;

// Preload speech synthesis voices early
if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  try {
    window.speechSynthesis.getVoices();
    window.speechSynthesis.onvoiceschanged = () => {
      try {
        window.speechSynthesis.getVoices();
      } catch {}
    };
  } catch {}
}

export function isSessionGreetingPlayed(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return sessionStorage.getItem(SESSION_STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

export function markSessionGreetingPlayed(): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(SESSION_STORAGE_KEY, 'true');
  } catch {}
}

export function resetSessionGreeting(): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.removeItem(SESSION_STORAGE_KEY);
  } catch {}
}

export function getUserFirstName(user?: Partial<User> | null): string {
  if (!user) return 'Beautiful';
  if (user.firstName?.trim()) return user.firstName.trim();
  if (user.displayName?.trim()) return user.displayName.trim();
  if (user.name?.trim()) {
    const first = user.name.trim().split(' ')[0];
    if (first && first.length > 0) return first;
  }
  return user.isPartner ? 'Partner' : 'Beautiful';
}

export const ACCENT_OPTIONS: { id: AvatarAccent; label: string; flag: string; langCodes: string[]; defaultPitch: number; defaultRate: number }[] = [
  { id: 'us', label: 'US Natural & Warm', flag: '🇺🇸', langCodes: ['en-US', 'en_US', 'en'], defaultPitch: 1.05, defaultRate: 0.94 },
  { id: 'uk', label: 'British Nurturing', flag: '🇬🇧', langCodes: ['en-GB', 'en_GB'], defaultPitch: 1.02, defaultRate: 0.92 },
  { id: 'australian', label: 'Calming Australian', flag: '🇦🇺', langCodes: ['en-AU', 'en_AU'], defaultPitch: 1.06, defaultRate: 0.93 },
  { id: 'west_african', label: 'Gentle West African', flag: '🌍', langCodes: ['en-NG', 'en-GH', 'en-ZA', 'en-US'], defaultPitch: 1.08, defaultRate: 0.92 },
  { id: 'irish', label: 'Irish Melodic Warmth', flag: '🇮🇪', langCodes: ['en-IE', 'en_IE', 'en-GB'], defaultPitch: 1.04, defaultRate: 0.92 }
];

export const PERSONALITY_OPTIONS: { id: AvatarPersonalityStyle; label: string; desc: string; icon: string }[] = [
  { id: 'supportive', label: 'Nurturing & Supportive', desc: 'Gentle, deeply empathetic, and emotionally validating companion', icon: '🌸' },
  { id: 'cheerful', label: 'Cheerful & Motivating', desc: 'Bright, joyful, energizing, and celebrative wellness cheerleader', icon: '☀️' },
  { id: 'mindful', label: 'Calm & Mindful', desc: 'Serene, grounding, breath-centered, and peacefully contemplative', icon: '🌿' },
  { id: 'scientific', label: 'Direct & Scientific', desc: 'Clear, informative, factual, and empowering biological insights', icon: '🔬' }
];

/**
 * Calculates dynamic health state and reaction message based on user data
 */
export function getDynamicHealthReaction(user?: Partial<User> | null, personality: AvatarPersonalityStyle = 'supportive'): {
  healthText: string;
  phaseLabel: string;
  emoji: string;
  cycleDay?: number;
} {
  if (!user) {
    return {
      healthText: 'Take it easy and stay hydrated today.',
      phaseLabel: 'Wellness Sanctuary',
      emoji: '🌸'
    };
  }

  // 1. Pregnancy Mode
  if (user.isPregnancyMode) {
    const pStart = user.pregnancyStartDate ? new Date(user.pregnancyStartDate) : new Date(Date.now() - 24 * 7 * 86400000);
    const diffWeeks = Math.max(1, Math.min(42, Math.floor((Date.now() - pStart.getTime()) / (1000 * 60 * 60 * 24 * 7))));
    
    if (personality === 'scientific') {
      return {
        healthText: `You’re now ${diffWeeks} weeks along in gestational development. Your baby is growing beautifully.`,
        phaseLabel: `Pregnancy (Week ${diffWeeks})`,
        emoji: '🤰🏽'
      };
    } else if (personality === 'cheerful') {
      return {
        healthText: `You’re now ${diffWeeks} weeks along! Your little miracle is growing so beautifully. Celebrate this stage!`,
        phaseLabel: `Pregnancy (Week ${diffWeeks})`,
        emoji: '👶🏽'
      };
    }
    return {
      healthText: `You’re now ${diffWeeks} weeks along. Your baby is growing beautifully.`,
      phaseLabel: `Pregnancy (Week ${diffWeeks})`,
      emoji: '🤰🏽'
    };
  }

  // 2. Postpartum Mode
  if (user.isPostpartumMode) {
    if (personality === 'mindful') {
      return {
        healthText: 'You’re doing amazing. Recovery takes time, and every small step matters. Breathe into your healing.',
        phaseLabel: 'Postpartum Restoration',
        emoji: '🍵'
      };
    } else if (personality === 'cheerful') {
      return {
        healthText: 'You’re doing amazing! Recovery takes time, and you are doing so wonderful every step of the way.',
        phaseLabel: 'Postpartum Restoration',
        emoji: '💖'
      };
    }
    return {
      healthText: 'You’re doing amazing. Recovery takes time, and every small step matters.',
      phaseLabel: 'Postpartum Restoration',
      emoji: '👶🏽'
    };
  }

  // 3. Menstrual & Bio-Cycle Tracking
  const lastStartStr = user.lastPeriodStart || (user.periods && user.periods[0]?.startDate);
  const cycleLen = user.cycleLength || 28;
  const periodLen = user.periodLength || 5;

  let cycleDay = 14;
  let daysToNextPeriod = 14;
  let daysToOvulation = 0;

  if (lastStartStr) {
    const sDate = new Date(lastStartStr);
    const today = new Date();
    const diffDays = Math.floor((today.getTime() - sDate.getTime()) / (1000 * 60 * 60 * 24));
    cycleDay = ((diffDays % cycleLen) + cycleLen) % cycleLen + 1;
    daysToNextPeriod = cycleLen - cycleDay;
    const ovulationDay = cycleLen - 14;
    daysToOvulation = ovulationDay - cycleDay;
  }

  // Menstrual Phase (Day 1 to periodLen)
  if (cycleDay <= periodLen) {
    if (personality === 'scientific') {
      return {
        healthText: `You’re on Day ${cycleDay} of your cycle today. Uterine lining renewal is active. Take it easy and maintain electrolytes.`,
        phaseLabel: `Period (Day ${cycleDay})`,
        emoji: '🩸',
        cycleDay
      };
    } else if (personality === 'cheerful') {
      return {
        healthText: `You’re on Day ${cycleDay} of your cycle today. Give yourself extra grace, cuddle up, and stay hydrated!`,
        phaseLabel: `Period (Day ${cycleDay})`,
        emoji: '🌸',
        cycleDay
      };
    }
    return {
      healthText: `You’re on Day ${cycleDay} of your cycle today. Take it easy and stay hydrated.`,
      phaseLabel: `Period (Day ${cycleDay})`,
      emoji: '🩸',
      cycleDay
    };
  }

  // Ovulation & Fertile Window
  if (daysToOvulation >= -1 && daysToOvulation <= 2) {
    if (daysToOvulation === 0) {
      return {
        healthText: 'Predicted ovulation is today. You’re currently in your fertile window.',
        phaseLabel: 'Peak Ovulation Window',
        emoji: '☀️',
        cycleDay
      };
    }
    return {
      healthText: 'You’re currently in your fertile window.',
      phaseLabel: 'Fertile Window',
      emoji: '✨',
      cycleDay
    };
  }

  // Follicular Phase (Post-period, Pre-ovulation)
  if (daysToOvulation > 2) {
    return {
      healthText: `You’re on Day ${cycleDay} in your follicular phase. Your natural vitality and energy are on the rise.`,
      phaseLabel: 'Follicular Phase',
      emoji: '🌱',
      cycleDay
    };
  }

  // Luteal Phase (Post-ovulation, Pre-period)
  if (daysToNextPeriod <= 2 && daysToNextPeriod >= 1) {
    return {
      healthText: `Your cycle is on Day ${cycleDay}. Your period may arrive in ${daysToNextPeriod} ${daysToNextPeriod === 1 ? 'day' : 'days'}. Honor your body's need to slow down.`,
      phaseLabel: 'Pre-Menstrual Window',
      emoji: '🌸',
      cycleDay
    };
  }

  return {
    healthText: `You’re on Day ${cycleDay} in your luteal phase. Protect your peace and nourish yourself with warm comfort.`,
    phaseLabel: 'Luteal Phase',
    emoji: '🍂',
    cycleDay
  };
}

/**
 * Returns the personalized avatar companion greeting combining:
 * 1. Time-of-day greeting (Exact format requested)
 * 2. Dynamic health-aware reaction
 */
export function getWelcomeGreeting(
  user?: Partial<User> | null, 
  customDate?: Date, 
  rotationOffset?: number
): WelcomeGreeting {
  const name = getUserFirstName(user);
  const now = customDate || new Date();
  const hour = now.getHours();

  const avatar = user?.avatar || (user ? getOrCreateUserAvatar(user as User) : undefined);
  const avatarName = avatar?.name || 'Amara';
  const avatarId = avatar?.id || 'amara';
  const personality = avatar?.personalityStyle || 'supportive';

  let timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night' = 'morning';
  let timeLabel = 'Morning (5:00 AM – 11:59 AM)';
  let emoji = '🌞';
  let timeGreeting = '';

  if (hour >= 5 && hour < 12) {
    timeOfDay = 'morning';
    timeLabel = 'Morning (5:00 AM – 11:59 AM)';
    emoji = '🌞';
    timeGreeting = `Good morning, ${name} 🌞. I hope you slept well.`;
  } else if (hour >= 12 && hour < 17) {
    timeOfDay = 'afternoon';
    timeLabel = 'Afternoon (12:00 PM – 4:59 PM)';
    emoji = '🌸';
    timeGreeting = `Good afternoon, ${name} 🌸. How are you feeling today?`;
  } else if (hour >= 17 && hour < 21) {
    timeOfDay = 'evening';
    timeLabel = 'Evening (5:00 PM – 8:59 PM)';
    emoji = '✨';
    timeGreeting = `Good evening, ${name} ✨. Let’s take a moment to check in with your wellness journey.`;
  } else {
    timeOfDay = 'night';
    timeLabel = 'Night (9:00 PM – 4:59 AM)';
    emoji = '🌙';
    timeGreeting = `Good night, ${name} 🌙. Remember to take care of yourself and get enough rest.`;
  }

  // Health-aware dynamic context
  const healthReaction = getDynamicHealthReaction(user, personality);

  // Combine into complete companion speech
  const displayText = `${timeGreeting} ${healthReaction.healthText}`;
  // Text for TTS without emoji disruption
  const cleanTimeGreeting = timeGreeting.replace(/[🌞🌸✨🌙]/g, '').trim();
  const cleanHealth = healthReaction.healthText.replace(/[🩸☀️🌱🍂🤰🏽👶🏽🍵💖✨]/g, '').trim();
  const speechText = `${cleanTimeGreeting} ${cleanHealth}`;

  return {
    displayText,
    speechText,
    timeOfDay,
    timeLabel,
    emoji,
    firstName: name,
    avatarName,
    avatarId,
    healthContext: healthReaction.healthText
  };
}

/**
 * Returns the signature introduction text for an avatar companion
 * Example: “Hi Bernice 🌸. I’m Amara and I’ll be your wellness companion inside Lumina. I’ll guide you through your cycle, symptoms, wellness goals, and daily check-ins.”
 */
export function getAvatarIntroduction(
  avatarId: AvatarId = 'amara',
  userName: string = 'friend',
  personality?: AvatarPersonalityStyle
): {
  displayText: string;
  speechText: string;
  companionName: string;
  avatarId: AvatarId;
  emoji: string;
} {
  const preset = AVATAR_PRESETS[avatarId] || AVATAR_PRESETS.amara;
  const companionName = preset.name;
  const emoji = preset.emoji || '🌸';

  let introText = `Hi ${userName} ${emoji}. I’m ${companionName} and I’ll be your wellness companion inside Lumina. I’ll guide you through your cycle, symptoms, wellness goals, and daily check-ins.`;

  if (avatarId === 'zainab') {
    introText = `Hey ${userName}! ⚡ I’m Zainab and I’ll be your motivational wellness coach inside Lumina. Let’s bring empowering energy, healthy habits, and unstoppable motivation to your journey!`;
  } else if (avatarId === 'naomi') {
    introText = `Peace and welcome, ${userName} 🌿. I’m Naomi and I’ll be your calm sanctuary guide inside Lumina. I’ll help you embrace stillness, reflect with wisdom, and nurture deep inner balance.`;
  } else if (avatarId === 'amina') {
    introText = `Hello sunshine ${userName}! ☀️ I’m Amina and I’m so excited to be your cheerful wellness cheerleader inside Lumina! Let’s celebrate your body, smile together, and make each day wonderfully bright!`;
  } else if (avatarId === 'kemi') {
    introText = `Hi ${userName} ☀️. I’m Kemi and I’m thrilled to be your wellness companion inside Lumina! Let’s celebrate your daily strength, track your energy, and make every check-in joyful.`;
  } else if (avatarId === 'nia') {
    introText = `Hi ${userName} 🍃. I’m Nia, your holistic companion inside Lumina. I’ll help you stay attuned to your body’s unique rhythm, hydration, and emotional harmony.`;
  } else if (avatarId === 'maya') {
    introText = `Hi ${userName} 🌺. I’m Maya and I’ll be your creative wellness companion inside Lumina. We’ll tune into your mood, reflect gently, and celebrate your body’s unfolding wisdom.`;
  } else if (avatarId === 'aria') {
    introText = `Hi ${userName} ✨. I’m Aria and I’m so excited to be your wellness companion inside Lumina! Every small milestone and symptom check-in brings you closer to your brightest self.`;
  }

  // Adjust slightly for chosen personality if custom
  if (personality === 'scientific') {
    introText = `Hi ${userName} 🔬. I’m ${companionName} and I’ll be your bio-wellness companion inside Lumina. I’ll provide clear, evidence-based guidance through your cycle phases, biomarkers, and daily wellness logs.`;
  }

  const cleanSpeech = introText.replace(/[🌸🌿☀️🍃🌺✨🔬]/g, '').trim();

  return {
    displayText: introText,
    speechText: cleanSpeech,
    companionName,
    avatarId,
    emoji
  };
}

export function playSoothingChime(): void {
  try {
    if (typeof window === 'undefined') return;
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    window._luminaAudioCtx = ctx;
    const now = ctx.currentTime;
    
    // Warm chime with gentle harmonic harmonics (528Hz Solfeggio Love tone)
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(528, now);
    osc1.frequency.exponentialRampToValueAtTime(660, now + 0.45);

    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(792, now);
    osc2.frequency.exponentialRampToValueAtTime(880, now + 0.55);

    gainNode.gain.setValueAtTime(0.001, now);
    gainNode.gain.linearRampToValueAtTime(0.045, now + 0.05);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 0.75);

    osc1.connect(gainNode);
    osc2.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc1.start(now);
    osc2.start(now + 0.03);
    osc1.stop(now + 0.8);
    osc2.stop(now + 0.8);

    setTimeout(() => {
      try {
        if (ctx.state !== 'closed') {
          ctx.close().catch(() => {});
        }
      } catch {}
    }, 900);
  } catch (e) {
    // Ignore audio chime errors
  }
}

export function stopWelcomeVoice(): void {
  try {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      window._luminaUtterance = null;
    }
  } catch {}

  try {
    if (window._luminaSpeechInterval) {
      clearInterval(window._luminaSpeechInterval);
      window._luminaSpeechInterval = null;
    }
  } catch {}
}

/**
 * Finds the best matching voice for a given avatar accent and personality
 */
function getCompanionVoice(accent: AvatarAccent = 'us', avatarId?: AvatarId): { voice: SpeechSynthesisVoice | null; rate: number; pitch: number } {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    return { voice: null, rate: 0.93, pitch: 1.05 };
  }

  const accentConfig = ACCENT_OPTIONS.find(a => a.id === accent) || ACCENT_OPTIONS[0];
  let rate = accentConfig.defaultRate;
  let pitch = accentConfig.defaultPitch;

  // Avatar-specific vocal color tuning
  if (avatarId === 'zainab') {
    rate = 0.90; // Slower, serene, grounded
    pitch = 0.98;
  } else if (avatarId === 'kemi') {
    rate = 0.96; // Bright, energetic
    pitch = 1.10;
  } else if (avatarId === 'nia') {
    rate = 0.92; // Balanced, melodic
    pitch = 1.02;
  } else if (avatarId === 'maya') {
    rate = 0.91; // Gentle, poetic
    pitch = 1.04;
  } else if (avatarId === 'aria') {
    rate = 0.95; // Cheerful, crisp
    pitch = 1.08;
  }

  try {
    const voices = window.speechSynthesis.getVoices();
    if (!voices || voices.length === 0) {
      return { voice: null, rate, pitch };
    }

    // Try matching by language code preference
    for (const code of accentConfig.langCodes) {
      const match = voices.find(v => {
        const langMatches = v.lang.toLowerCase().startsWith(code.toLowerCase());
        const isFemale = v.name.toLowerCase().includes('female') || 
                         v.name.includes('Samantha') || 
                         v.name.includes('Victoria') || 
                         v.name.includes('Karen') || 
                         v.name.includes('Moira') || 
                         v.name.includes('Zira') || 
                         v.name.includes('Jenny') || 
                         v.name.includes('Aria') ||
                         v.name.includes('Natural');
        return langMatches && isFemale;
      });
      if (match) return { voice: match, rate, pitch };

      const langMatch = voices.find(v => v.lang.toLowerCase().startsWith(code.toLowerCase()));
      if (langMatch) return { voice: langMatch, rate, pitch };
    }

    // Fallback to highest quality natural en voice
    const fallbackVoice = voices.find(v => 
      v.name.includes('Google US English') ||
      v.name.includes('Natural') ||
      v.name.includes('Samantha') ||
      v.name.includes('Jenny') ||
      v.name.includes('Victoria') ||
      v.lang.startsWith('en')
    ) || voices[0];

    return { voice: fallbackVoice, rate, pitch };
  } catch {
    return { voice: null, rate, pitch };
  }
}

/**
 * Speaks native Web Speech synthesis with avatar companion characteristics
 */
export function speakNativeSpeech(
  text: string, 
  options?: {
    accent?: AvatarAccent;
    avatarId?: AvatarId;
    pitch?: number;
    rate?: number;
    onEnd?: () => void; 
    onError?: (err: any) => void;
  }
): boolean {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    return false;
  }

  try {
    // Unblock speech engine
    window.speechSynthesis.cancel();
    if (window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
    }

    const utterance = new SpeechSynthesisUtterance(text);
    window._luminaUtterance = utterance;

    const voiceInfo = getCompanionVoice(options?.accent, options?.avatarId);
    if (voiceInfo.voice) {
      utterance.voice = voiceInfo.voice;
      utterance.lang = voiceInfo.voice.lang || 'en-US';
    } else {
      utterance.lang = 'en-US';
    }

    utterance.rate = options?.rate ?? voiceInfo.rate;
    utterance.pitch = options?.pitch ?? voiceInfo.pitch;
    utterance.volume = 1.0;

    utterance.onstart = () => {
      markSessionGreetingPlayed();
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('lumina:avatar-speaking', { detail: { isSpeaking: true, text } }));
      }
    };

    utterance.onend = () => {
      markSessionGreetingPlayed();
      window._luminaUtterance = null;
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('lumina:avatar-speaking', { detail: { isSpeaking: false } }));
      }
      if (window._luminaSpeechInterval) {
        clearInterval(window._luminaSpeechInterval);
        window._luminaSpeechInterval = null;
      }
      if (options?.onEnd) {
        try { options.onEnd(); } catch {}
      }
    };

    utterance.onerror = (e) => {
      window._luminaUtterance = null;
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('lumina:avatar-speaking', { detail: { isSpeaking: false } }));
      }
      if (window._luminaSpeechInterval) {
        clearInterval(window._luminaSpeechInterval);
        window._luminaSpeechInterval = null;
      }
      if (options?.onError) {
        try { options.onError(e); } catch {}
      }
    };

    // Keep Chrome alive for longer speech synthesis strings
    if (window._luminaSpeechInterval) {
      clearInterval(window._luminaSpeechInterval);
    }
    window._luminaSpeechInterval = setInterval(() => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        if (window.speechSynthesis.speaking) {
          window.speechSynthesis.resume();
        } else {
          clearInterval(window._luminaSpeechInterval);
          window._luminaSpeechInterval = null;
        }
      }
    }, 3000);

    window.speechSynthesis.speak(utterance);

    // Extra kickstart for Safari / Chrome
    if (window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
    }

    return true;
  } catch (err) {
    if (options?.onError) {
      try { options.onError(err); } catch {}
    }
    return false;
  }
}

/**
 * Plays the personalized greeting from the selected Avatar Companion
 */
export async function playWelcomeVoiceGreeting(
  user?: Partial<User> | null,
  options?: {
    force?: boolean;
    customGreeting?: WelcomeGreeting;
    onStart?: (g: WelcomeGreeting) => void;
    onEnd?: () => void;
    onError?: (err: any) => void;
  }
): Promise<WelcomeGreeting | null> {
  try {
    const isEnabled = 
      user?.welcomeVoiceEnabled !== false && 
      (user?.notificationSettings?.welcomeVoiceEnabled !== false) &&
      user?.voiceGreetingsEnabled !== false &&
      (user?.notificationSettings?.voiceGreetingsEnabled !== false);

    const greeting = options?.customGreeting || getWelcomeGreeting(user);

    // Always dispatch custom event so app UI displays the visual greeting banner / toast immediately
    if (typeof window !== 'undefined') {
      try {
        window.dispatchEvent(new CustomEvent('lumina:welcome-greeting', { detail: greeting }));
      } catch (e) {}
    }

    // Check if voice greetings are disabled by user settings
    if (!options?.force && !isEnabled) {
      markSessionGreetingPlayed();
      return greeting;
    }

    // If not forced, check if this session has already been greeted
    if (!options?.force && isSessionGreetingPlayed()) {
      return greeting;
    }

    if (options?.onStart) {
      try { options.onStart(greeting); } catch {}
    }

    stopWelcomeVoice();

    // 1. Play subtle musical chime
    playSoothingChime();

    // Store pending greeting on window for instant auto-unlock if browser delays initial audio
    window._luminaPendingGreeting = greeting;

    const avatar = user?.avatar;
    const accent = avatar?.accent || 'us';
    const avatarId = avatar?.id || 'amara';

    // 2. Trigger Web Speech Synthesis with companion characteristics
    speakNativeSpeech(
      greeting.speechText,
      {
        accent,
        avatarId,
        pitch: avatar?.speechPitch,
        rate: avatar?.speechRate,
        onEnd: () => {
          markSessionGreetingPlayed();
          window._luminaPendingGreeting = null;
          if (options?.onEnd) options.onEnd();
        },
        onError: (err) => {
          if (options?.onError) options.onError(err);
        }
      }
    );

    // 3. Register seamless global unlock listener:
    if (!unlockListenersAttached && typeof window !== 'undefined') {
      unlockListenersAttached = true;
      const unlockHandler = () => {
        unlockListenersAttached = false;
        window.removeEventListener('pointerdown', unlockHandler, true);
        window.removeEventListener('click', unlockHandler, true);
        window.removeEventListener('touchstart', unlockHandler, true);
        window.removeEventListener('keydown', unlockHandler, true);

        if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
          try {
            if (window.speechSynthesis.paused) {
              window.speechSynthesis.resume();
            }
          } catch {}
        }

        // If the greeting hasn't played yet this session, speak it now with user's active gesture!
        if (!isSessionGreetingPlayed() && window._luminaPendingGreeting) {
          const pending = window._luminaPendingGreeting;
          window._luminaPendingGreeting = null;
          speakNativeSpeech(
            pending.speechText,
            {
              accent,
              avatarId,
              pitch: avatar?.speechPitch,
              rate: avatar?.speechRate,
              onEnd: () => {
                markSessionGreetingPlayed();
                if (options?.onEnd) options.onEnd();
              },
              onError: options?.onError
            }
          );
        }
      };

      window.addEventListener('pointerdown', unlockHandler, { capture: true, once: true });
      window.addEventListener('click', unlockHandler, { capture: true, once: true });
      window.addEventListener('touchstart', unlockHandler, { capture: true, once: true });
      window.addEventListener('keydown', unlockHandler, { capture: true, once: true });
    }

    return greeting;
  } catch (outerErr) {
    console.warn('Avatar companion voice execution notice:', outerErr);
    if (options?.onError) {
      try { options.onError(outerErr); } catch {}
    }
    return null;
  }
}

/**
 * Triggers avatar introduction speech (animated wave, speech, and intro message)
 */
export async function playAvatarIntroduction(
  avatarId: AvatarId = 'amara',
  user?: Partial<User> | null,
  options?: {
    accent?: AvatarAccent;
    personality?: AvatarPersonalityStyle;
    onStart?: () => void;
    onEnd?: () => void;
  }
): Promise<{ displayText: string; speechText: string }> {
  const name = getUserFirstName(user);
  const intro = getAvatarIntroduction(avatarId, name, options?.personality);

  stopWelcomeVoice();
  playSoothingChime();

  if (options?.onStart) {
    options.onStart();
  }

  speakNativeSpeech(intro.speechText, {
    avatarId,
    accent: options?.accent || 'us',
    onEnd: options?.onEnd
  });

  return intro;
}
