import { User } from '../types';
import { decodeBase64, decodeAudioData } from './audio';

export interface WelcomeGreeting {
  displayText: string;
  speechText: string;
  timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night';
  timeLabel: string;
  emoji: string;
  firstName: string;
}

let activeAudioSource: AudioBufferSourceNode | null = null;
let activeAudioContext: AudioContext | null = null;
// Keep a module-level reference to prevent garbage collection in Chrome
let activeUtterance: SpeechSynthesisUtterance | null = null;
let unlockListenerAttached = false;
let isAudioUnlocked = false;

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
    const now = ctx.currentTime;
    
    // Create gentle warm dual chime
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(528, now); // 528Hz Solfeggio Love frequency
    osc1.frequency.exponentialRampToValueAtTime(660, now + 0.6);

    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(792, now);
    osc2.frequency.exponentialRampToValueAtTime(880, now + 0.7);

    gainNode.gain.setValueAtTime(0.001, now);
    gainNode.gain.linearRampToValueAtTime(0.08, now + 0.08);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 1.2);

    osc1.connect(gainNode);
    osc2.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc1.start(now);
    osc2.start(now + 0.05);
    osc1.stop(now + 1.3);
    osc2.stop(now + 1.3);

    setTimeout(() => {
      try {
        if (ctx.state !== 'closed') {
          ctx.close().catch(() => {});
        }
      } catch {}
    }, 1500);
  } catch (e) {
    // Ignore audio chime errors
  }
}

export function stopWelcomeVoice(): void {
  try {
    if (activeAudioSource) {
      activeAudioSource.stop();
      activeAudioSource.disconnect();
      activeAudioSource = null;
    }
  } catch {}

  try {
    if (activeAudioContext && activeAudioContext.state !== 'closed') {
      activeAudioContext.close().catch(() => {});
      activeAudioContext = null;
    }
  } catch {}

  try {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      activeUtterance = null;
    }
  } catch {}
}

// Ensure Web Speech Synthesis is active and speaks reliably
function speakNativeSpeech(
  text: string, 
  onEnd?: () => void, 
  onError?: (err: any) => void
): boolean {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    return false;
  }

  try {
    window.speechSynthesis.cancel();
    window.speechSynthesis.resume();

    const utterance = new SpeechSynthesisUtterance(text);
    activeUtterance = utterance; // Retain reference against GC
    utterance.rate = 0.93;
    utterance.pitch = 1.05;
    utterance.volume = 1.0;

    const applyBestVoice = () => {
      try {
        const voices = window.speechSynthesis.getVoices();
        if (voices && voices.length > 0) {
          const femaleVoice = voices.find(v => 
            v.name.includes('Google US English') ||
            v.name.includes('Natural') ||
            v.name.includes('Samantha') ||
            v.name.includes('Victoria') ||
            v.name.includes('Karen') ||
            v.name.includes('Moira') ||
            v.name.includes('Zira') ||
            v.name.includes('Jenny') ||
            v.name.includes('Aria') ||
            (v.lang.startsWith('en') && v.name.toLowerCase().includes('female')) ||
            v.lang.startsWith('en-US') ||
            v.lang.startsWith('en-')
          );
          if (femaleVoice) {
            utterance.voice = femaleVoice;
          }
        }
      } catch {}
    };

    applyBestVoice();

    utterance.onend = () => {
      activeUtterance = null;
      if (onEnd) {
        try { onEnd(); } catch {}
      }
    };

    utterance.onerror = (e) => {
      activeUtterance = null;
      if (onError) {
        try { onError(e); } catch {}
      }
    };

    window.speechSynthesis.speak(utterance);

    if (window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
    }

    if (window.speechSynthesis.getVoices().length === 0) {
      window.speechSynthesis.onvoiceschanged = () => {
        applyBestVoice();
        window.speechSynthesis.onvoiceschanged = null;
      };
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

    // 1. First trigger subtle pleasant entry chime
    playSoothingChime();

    // 2. Attempt High Quality Gemini TTS Proxy first (with short 3.5s timeout)
    let ttsPlayed = false;
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500);

      const response = await fetch('/api/gemini/welcome-voice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: greeting.firstName,
          text: greeting.speechText
        }),
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        if (data?.base64Audio) {
          const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
          if (AudioCtx) {
            const audioContext = new AudioCtx({ sampleRate: 24000 });
            activeAudioContext = audioContext;
            if (audioContext.state === 'suspended') {
              await audioContext.resume().catch(() => {});
            }
            if (audioContext.state === 'running') {
              const audioBuffer = await decodeAudioData(
                decodeBase64(data.base64Audio),
                audioContext,
                24000,
                1
              );
              const source = audioContext.createBufferSource();
              source.buffer = audioBuffer;
              source.connect(audioContext.destination);
              activeAudioSource = source;
              source.onended = () => {
                activeAudioSource = null;
                if (options?.onEnd) {
                  try { options.onEnd(); } catch {}
                }
              };
              source.start();
              ttsPlayed = true;
              isAudioUnlocked = true;
              return greeting;
            }
          }
        }
      }
    } catch (err) {
      // Proceed to native speech immediately
    }

    // 3. Fallback to Web Speech Synthesis immediately
    if (!ttsPlayed) {
      const spoke = speakNativeSpeech(
        greeting.speechText,
        options?.onEnd,
        options?.onError
      );

      if (spoke) {
        isAudioUnlocked = true;
      }
    }

    // 4. Setup auto-unlock on first user interaction if browser blocked autoplay
    if (!isAudioUnlocked && !unlockListenerAttached && typeof window !== 'undefined') {
      unlockListenerAttached = true;
      const unlockHandler = () => {
        isAudioUnlocked = true;
        unlockListenerAttached = false;
        window.removeEventListener('pointerdown', unlockHandler);
        window.removeEventListener('click', unlockHandler);
        window.removeEventListener('touchstart', unlockHandler);
        window.removeEventListener('keydown', unlockHandler);
        
        // Play immediately upon first user touch/click if not already completed
        playWelcomeVoiceGreeting(user, { force: true, customGreeting: greeting }).catch(() => {});
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
