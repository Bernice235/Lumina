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

/**
 * Returns the exact personalized time-of-day greeting
 * 
 * Morning (5am–11:59am):
 * “Good morning, {name} 🌸. Welcome back to Lumina: Bloom & Balance. I hope you have a beautiful day ahead.”
 * 
 * Afternoon (12pm–4:59pm):
 * “Good afternoon, {name} 🌸. Welcome back to Lumina. How are you feeling today?”
 * 
 * Evening (5pm–8:59pm):
 * “Good evening, {name} 🌸. Welcome back to your wellness sanctuary.”
 * 
 * Night (9pm–4:59am):
 * “Good evening, {name} 🌸. Welcome back to Lumina. Remember to take time to rest and care for yourself.”
 */
export function getWelcomeGreeting(user?: Partial<User> | null, customDate?: Date, rotationOffset?: number): WelcomeGreeting {
  const name = getUserFirstName(user);
  const now = customDate || new Date();
  const hour = now.getHours();

  let timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night' = 'morning';
  let timeLabel = 'Morning (5:00 AM – 11:59 AM)';
  let emoji = '🌸';
  let displayText = '';
  let speechText = '';

  if (hour >= 5 && hour < 12) {
    timeOfDay = 'morning';
    timeLabel = 'Morning (5:00 AM – 11:59 AM)';
    emoji = '🌸';
    displayText = `Good morning, ${name} 🌸. Welcome back to Lumina: Bloom & Balance. I hope you have a beautiful day ahead.`;
    speechText = `Good morning, ${name}. Welcome back to Lumina: Bloom and Balance. I hope you have a beautiful day ahead.`;
  } else if (hour >= 12 && hour < 17) {
    timeOfDay = 'afternoon';
    timeLabel = 'Afternoon (12:00 PM – 4:59 PM)';
    emoji = '🌸';
    displayText = `Good afternoon, ${name} 🌸. Welcome back to Lumina. How are you feeling today?`;
    speechText = `Good afternoon, ${name}. Welcome back to Lumina. How are you feeling today?`;
  } else if (hour >= 17 && hour < 21) {
    timeOfDay = 'evening';
    timeLabel = 'Evening (5:00 PM – 8:59 PM)';
    emoji = '🌸';
    displayText = `Good evening, ${name} 🌸. Welcome back to your wellness sanctuary.`;
    speechText = `Good evening, ${name}. Welcome back to your wellness sanctuary.`;
  } else {
    timeOfDay = 'night';
    timeLabel = 'Night (9:00 PM – 4:59 AM)';
    emoji = '🌙';
    displayText = `Good evening, ${name} 🌸. Welcome back to Lumina. Remember to take time to rest and care for yourself.`;
    speechText = `Good evening, ${name}. Welcome back to Lumina. Remember to take time to rest and care for yourself.`;
  }

  // If rotation offset is provided for the Settings preview button
  if (rotationOffset && rotationOffset % 2 !== 0) {
    if (timeOfDay === 'morning') {
      displayText = `Good morning, ${name} 🌸. Let's start today with grace, balance, and care.`;
      speechText = `Good morning, ${name}. Let's start today with grace, balance, and care.`;
    } else if (timeOfDay === 'afternoon') {
      displayText = `Good afternoon, ${name} 🌸. Pause for a gentle moment and celebrate how far you’ve come today.`;
      speechText = `Good afternoon, ${name}. Pause for a gentle moment and celebrate how far you've come today.`;
    } else if (timeOfDay === 'evening') {
      displayText = `Good evening, ${name} 🌸. Unwind and let the warmth of this evening surround you.`;
      speechText = `Good evening, ${name}. Unwind and let the warmth of this evening surround you.`;
    } else {
      displayText = `Good night, ${name} 🌙. Welcome back to Lumina. Rest peacefully and restore your inner light.`;
      speechText = `Good night, ${name}. Welcome back to Lumina. Rest peacefully and restore your inner light.`;
    }
  }

  return {
    displayText,
    speechText,
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

    utterance.onstart = () => {
      markSessionGreetingPlayed();
    };

    utterance.onend = () => {
      markSessionGreetingPlayed();
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
    }, 3000);

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

/**
 * Trigger personalized voice greeting.
 * If called on app launch, plays automatically without requiring a button press.
 * If the browser's autoplay policy temporarily holds speech, it seamlessly auto-unmutes
 * and speaks on the very first touch/click anywhere on the screen.
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

    // Always dispatch custom event so app UI displays the visual greeting banner / toast immediately (Requirement 5)
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

    // 2. Trigger Web Speech Synthesis
    speakNativeSpeech(
      greeting.speechText,
      () => {
        markSessionGreetingPlayed();
        window._luminaPendingGreeting = null;
        if (options?.onEnd) options.onEnd();
      },
      (err) => {
        if (options?.onError) options.onError(err);
      }
    );

    // 3. Register seamless global unlock listener:
    // If the browser's background autoplay policy queued or suspended the initial speech,
    // the very first tap or touch anywhere in the app immediately triggers resume/speak.
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

        // If the greeting hasn't played yet this session, speak it now with the user's active gesture!
        if (!isSessionGreetingPlayed() && window._luminaPendingGreeting) {
          const pending = window._luminaPendingGreeting;
          window._luminaPendingGreeting = null;
          speakNativeSpeech(
            pending.speechText,
            () => {
              markSessionGreetingPlayed();
              if (options?.onEnd) options.onEnd();
            },
            options?.onError
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
    console.warn('Welcome voice execution notice:', outerErr);
    if (options?.onError) {
      try { options.onError(outerErr); } catch {}
    }
    return null;
  }
}
