import { User } from '../types';

export interface WelcomeGreeting {
  displayText: string;
  speechText: string;
  timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night';
  timeLabel: string;
  emoji: string;
  firstName: string;
}

// Global references to prevent garbage collection in Chromium / WebKit
declare global {
  interface Window {
    _luminaUtterance?: SpeechSynthesisUtterance | null;
    _luminaAudioCtx?: AudioContext | null;
    _luminaVoiceUnlocked?: boolean;
    _luminaSpeechInterval?: any;
  }
}

let unlockListenersAttached = false;
let isAudioUnlocked = false;

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

export function getWelcomeGreeting(user?: Partial<User> | null, customDate?: Date, rotationOffset?: number): WelcomeGreeting {
  const name = getUserFirstName(user);
  const now = customDate || new Date();
  const hour = now.getHours();

  // Rotation index based on day-of-month or offset for variety
  const dayIndex = now.getDate() + (rotationOffset !== undefined ? rotationOffset : 0);

  let timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night' = 'morning';
  let timeLabel = 'Morning (5:00 AM – 11:59 AM)';
  let emoji = '🌸';
  let options: { display: string; speech: string }[] = [];

  if (hour >= 5 && hour < 12) {
    timeOfDay = 'morning';
    timeLabel = 'Morning (5:00 AM – 11:59 AM)';
    emoji = '🌸';
    options = [
      {
        display: `Good morning, ${name}. 🌸 Welcome back to Lumina. Let’s start today with balance and care.`,
        speech: `Good morning, ${name}. Welcome back to Lumina. Let's start today with balance and care.`
      },
      {
        display: `Good morning, ${name}. 🌸 Ready for another beautiful day?`,
        speech: `Good morning, ${name}. Ready for another beautiful day?`
      },
      {
        display: `Welcome back, ${name}. 🌸 Take a deep breath and let’s check in with your wellbeing.`,
        speech: `Welcome back, ${name}. Take a deep breath and let's check in with your wellbeing.`
      },
      {
        display: `Welcome back, ${name}. 🌸 Your wellness journey continues today.`,
        speech: `Welcome back, ${name}. Your wellness journey continues today.`
      }
    ];
  } else if (hour >= 12 && hour < 17) {
    timeOfDay = 'afternoon';
    timeLabel = 'Afternoon (12:00 PM – 4:59 PM)';
    emoji = '🌸';
    options = [
      {
        display: `Good afternoon, ${name}. 🌸 Welcome back to Lumina. I hope your day is going well.`,
        speech: `Good afternoon, ${name}. Welcome back to Lumina. I hope your day is going well.`
      },
      {
        display: `Hello ${name}. 🌸 Take a deep breath and let’s check in with your wellbeing.`,
        speech: `Hello ${name}. Take a deep breath and let's check in with your wellbeing.`
      },
      {
        display: `Welcome back, ${name}. 🌸 Your wellness journey continues today.`,
        speech: `Welcome back, ${name}. Your wellness journey continues today.`
      },
      {
        display: `Good afternoon, ${name}. 🌸 Pause for a gentle moment and celebrate how far you’ve come today.`,
        speech: `Good afternoon, ${name}. Pause for a gentle moment and celebrate how far you've come today.`
      }
    ];
  } else if (hour >= 17 && hour < 21) {
    timeOfDay = 'evening';
    timeLabel = 'Evening (5:00 PM – 8:59 PM)';
    emoji = '🌸';
    options = [
      {
        display: `Good evening, ${name}. 🌸 Welcome back to Lumina. Take a moment for yourself today.`,
        speech: `Good evening, ${name}. Welcome back to Lumina. Take a moment for yourself today.`
      },
      {
        display: `Welcome back, ${name}. 🌸 Your wellness journey continues today.`,
        speech: `Welcome back, ${name}. Your wellness journey continues today.`
      },
      {
        display: `Hello ${name}. 🌸 Take a deep breath and let’s check in with your wellbeing.`,
        speech: `Hello ${name}. Take a deep breath and let's check in with your wellbeing.`
      },
      {
        display: `Good evening, ${name}. 🌸 Unwind and let the warmth of this evening surround you.`,
        speech: `Good evening, ${name}. Unwind and let the warmth of this evening surround you.`
      }
    ];
  } else {
    timeOfDay = 'night';
    timeLabel = 'Night (9:00 PM – 4:59 AM)';
    emoji = '🌙';
    options = [
      {
        display: `Good evening, ${name}. 🌙 Welcome back to Lumina. Remember to rest and take care of yourself.`,
        speech: `Good evening, ${name}. Welcome back to Lumina. Remember to rest and take care of yourself.`
      },
      {
        display: `Good night, ${name}. 🌙 Welcome back to Lumina. Rest peacefully and restore your inner light.`,
        speech: `Good night, ${name}. Welcome back to Lumina. Rest peacefully and restore your inner light.`
      },
      {
        display: `Welcome back, ${name}. 🌙 Time to slow down, soften your thoughts, and nurture your peace.`,
        speech: `Welcome back, ${name}. Time to slow down, soften your thoughts, and nurture your peace.`
      },
      {
        display: `Peaceful evening, ${name}. 🌙 You did wonderfully today. Let yourself rest deeply.`,
        speech: `Peaceful evening, ${name}. You did wonderfully today. Let yourself rest deeply.`
      }
    ];
  }

  const selected = options[dayIndex % options.length] || options[0];

  return {
    displayText: selected.display,
    speechText: selected.speech,
    timeOfDay,
    timeLabel,
    emoji,
    firstName: name
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
    
    // Create gentle warm dual harmonic chime (528Hz Solfeggio Love tone)
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(528, now);
    osc1.frequency.exponentialRampToValueAtTime(660, now + 0.5);

    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(792, now);
    osc2.frequency.exponentialRampToValueAtTime(880, now + 0.6);

    gainNode.gain.setValueAtTime(0.001, now);
    gainNode.gain.linearRampToValueAtTime(0.05, now + 0.06);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 0.8);

    osc1.connect(gainNode);
    osc2.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc1.start(now);
    osc2.start(now + 0.04);
    osc1.stop(now + 0.9);
    osc2.stop(now + 0.9);

    setTimeout(() => {
      try {
        if (ctx.state !== 'closed') {
          ctx.close().catch(() => {});
        }
      } catch {}
    }, 1000);
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

// Find best natural voice available
function getBestVoice(): SpeechSynthesisVoice | null {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return null;
  try {
    const voices = window.speechSynthesis.getVoices();
    if (!voices || voices.length === 0) return null;

    // Prioritize natural warm female English voices
    const preferredVoice = voices.find(v => 
      v.name.includes('Google US English') ||
      v.name.includes('Natural') ||
      v.name.includes('Samantha') ||
      v.name.includes('Victoria') ||
      v.name.includes('Karen') ||
      v.name.includes('Moira') ||
      v.name.includes('Zira') ||
      v.name.includes('Jenny') ||
      v.name.includes('Aria') ||
      v.name.includes('Microsoft Zira') ||
      (v.lang.startsWith('en') && v.name.toLowerCase().includes('female'))
    );

    if (preferredVoice) return preferredVoice;

    // Fallback to any en-US or en voice
    return voices.find(v => v.lang.startsWith('en-US') || v.lang.startsWith('en')) || voices[0] || null;
  } catch {
    return null;
  }
}

// Ensure Web Speech Synthesis speaks synchronously & reliably in the user gesture call stack
export function speakNativeSpeech(
  text: string, 
  onEnd?: () => void, 
  onError?: (err: any) => void
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
    // Pin to global window to prevent Chromium garbage collection bug during speech
    window._luminaUtterance = utterance;

    utterance.lang = 'en-US';
    utterance.rate = 0.92; // Pleasant, warm pace
    utterance.pitch = 1.04; // Gentle, uplifting pitch
    utterance.volume = 1.0;

    const voice = getBestVoice();
    if (voice) {
      utterance.voice = voice;
    }

    utterance.onend = () => {
      window._luminaUtterance = null;
      if (window._luminaSpeechInterval) {
        clearInterval(window._luminaSpeechInterval);
        window._luminaSpeechInterval = null;
      }
      if (onEnd) {
        try { onEnd(); } catch {}
      }
    };

    utterance.onerror = (e) => {
      window._luminaUtterance = null;
      if (window._luminaSpeechInterval) {
        clearInterval(window._luminaSpeechInterval);
        window._luminaSpeechInterval = null;
      }
      if (onError) {
        try { onError(e); } catch {}
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
    }, 4000);

    window.speechSynthesis.speak(utterance);

    // Extra kickstart for Safari / Chrome
    if (window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
    }

    return true;
  } catch (err) {
    if (onError) {
      try { onError(err); } catch {}
    }
    return false;
  }
}

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
    const isEnabled = user?.welcomeVoiceEnabled !== false && (user?.notificationSettings?.welcomeVoiceEnabled !== false);

    if (!options?.force) {
      // Check if user disabled welcome voice
      if (!isEnabled) {
        return null;
      }
    }

    const greeting = options?.customGreeting || getWelcomeGreeting(user);

    // Dispatch custom event so app UI can display a text greeting banner / toast
    if (typeof window !== 'undefined') {
      try {
        window.dispatchEvent(new CustomEvent('lumina:welcome-greeting', { detail: greeting }));
      } catch (e) {}
    }

    if (options?.onStart) {
      try { options.onStart(greeting); } catch {}
    }

    stopWelcomeVoice();

    // 1. Play subtle musical chime
    playSoothingChime();

    // 2. Immediately speak with high quality Web Speech Synthesis (zero network lag, instant audio)
    const spoke = speakNativeSpeech(
      greeting.speechText,
      options?.onEnd,
      options?.onError
    );

    if (spoke) {
      isAudioUnlocked = true;
      window._luminaVoiceUnlocked = true;
    }

    // 3. Setup auto-unlock on first user interaction if browser blocked background autoplay
    if (!unlockListenersAttached && typeof window !== 'undefined' && !window._luminaVoiceUnlocked) {
      unlockListenersAttached = true;
      const unlockHandler = () => {
        isAudioUnlocked = true;
        window._luminaVoiceUnlocked = true;
        unlockListenersAttached = false;
        window.removeEventListener('pointerdown', unlockHandler);
        window.removeEventListener('click', unlockHandler);
        window.removeEventListener('touchstart', unlockHandler);
        window.removeEventListener('keydown', unlockHandler);
        
        // Speak greeting immediately upon first user tap anywhere
        speakNativeSpeech(greeting.speechText, options?.onEnd, options?.onError);
      };

      window.addEventListener('pointerdown', unlockHandler, { once: true });
      window.addEventListener('click', unlockHandler, { once: true });
      window.addEventListener('touchstart', unlockHandler, { once: true });
      window.addEventListener('keydown', unlockHandler, { once: true });
    }

    return greeting;
  } catch (outerErr) {
    console.warn('Welcome voice execution notice:', outerErr);
    if (options?.onError) {
      try { options.onError(outerErr); } catch {}
    }
    return null;
  }
}

