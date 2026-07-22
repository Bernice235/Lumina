import { decodeBase64, decodeAudioData } from "./audio";

// Helper function to send safe POST requests to our server API proxy endpoints with timeout
async function fetchGeminiProxy(endpoint: string, body: object): Promise<any> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000);

  try {
    const response = await fetch(`/api/gemini/${endpoint}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (err) {
    clearTimeout(timeoutId);
    throw err;
  }
}

function generateClientFallbackAffirmation(name: string, phase?: string, mood?: string): string {
  const n = name || 'beautiful';
  const m = mood?.toLowerCase() || '';
  const p = phase?.toLowerCase() || '';

  if (m.includes('happy') || m.includes('excited') || m.includes('joyful')) {
    return `Your light is radiant today, ${n}. Keep shining and embracing this wonderful, magnetic energy. You are exactly where you need to be. 🌟`;
  }
  if (m.includes('crampy') || m.includes('sleepy') || m.includes('tired') || m.includes('sad')) {
    return `Be gentle with your beautiful temple, ${n}. Your body is doing sacred work right now, and you deserve deep comfort, rest, and peace. 🩹`;
  }
  if (p.includes('menstrual')) {
    return `In this winter of your cycle, ${n}, your softest surrender is your greatest power. Let go, rest deeply, and let your body renew. 🌸`;
  }
  if (p.includes('follicular')) {
    return `Your spring is rising, ${n}. New beginnings, fresh clarity, and beautiful ideas are starting to bloom in your heart. 🌱`;
  }
  if (p.includes('ovulat')) {
    return `You are at your absolute solar peak, ${n}. Magnetic, brilliant, and deeply alluring, the world reflects your inner sun. ☀️`;
  }
  if (p.includes('luteal')) {
    return `As the autumn wind blows, ${n}, draw inward. Protect your boundaries, nest in cozy comfort, and honor your intuitive wisdom. 🍂`;
  }
  return `Your presence is a gentle whisper of beauty in the world, ${n}. Nurture your soul, honor your pace, and love your magic. 💖`;
}

export async function getDailyAffirmation(name: string, phase?: string, mood?: string): Promise<string> {
  try {
    const data = await fetchGeminiProxy("daily-affirmation", { name, phase, mood });
    if (data?.text) return data.text;
  } catch (error) {
    console.warn("Proxy affirmation unavailable, using fallback:", error);
  }
  return generateClientFallbackAffirmation(name, phase, mood);
}

export async function getSupplementAdvice(symptoms: string[]): Promise<string> {
  try {
    const data = await fetchGeminiProxy("supplement-advice", { symptoms });
    if (data?.text) return data.text;
  } catch (error) {
    console.warn("Proxy supplement advice unavailable, using fallback:", error);
  }
  return "Your body is doing its best! Consider magnesium for cramps and some quiet rest. Always check with a professional first, sweet girl!";
}

export async function getLuminaAdvice(question: string): Promise<string> {
  try {
    const data = await fetchGeminiProxy("lumina-advice", { question });
    if (data?.text) return data.text;
  } catch (error) {
    console.warn("Proxy Lumina advice unavailable, using fallback:", error);
  }
  return "Your body is a beautiful mystery! It's always best to chat with a professional for specific medical concerns, but remember that you are perfectly made.";
}

export async function getProductAdvice(product: string, concern: string): Promise<string> {
  try {
    const data = await fetchGeminiProxy("product-advice", { product, concern });
    if (data?.text) return data.text;
  } catch (error) {
    console.warn("Proxy product advice unavailable, using fallback:", error);
  }
  return "Take a deep breath. You are in control of your body, and it's okay to take it slow. You've got this, beautiful!";
}

export async function playWelcomeVoice(name: string): Promise<void> {
  const cleanName = name?.trim() || 'Beautiful';

  try {
    const data = await fetchGeminiProxy("welcome-voice", { name: cleanName });
    const base64Audio = data?.base64Audio;
    if (base64Audio) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        const audioContext = new AudioCtx({ sampleRate: 24000 });
        if (audioContext.state === 'suspended') {
          await audioContext.resume().catch(() => {});
        }
        const audioBuffer = await decodeAudioData(
          decodeBase64(base64Audio),
          audioContext,
          24000,
          1
        );
        const source = audioContext.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(audioContext.destination);
        source.start();
        return;
      }
    }
  } catch (error: any) {
    console.warn("Welcome Voice proxy notice, using Web Speech synthesis:", error?.message || error);
  }

  // Fallback using native Web Speech Synthesis
  try {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      window.speechSynthesis.resume();

      const text = `Welcome back to your sanctuary, ${cleanName}. You are safe, and you are exactly where you need to be.`;
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.9;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;

      const speakWithVoices = () => {
        const voices = window.speechSynthesis.getVoices();
        if (voices && voices.length > 0) {
          const sweetVoice = voices.find(v => 
            v.name.includes('Google US English') || 
            v.name.includes('Natural') || 
            v.name.includes('Samantha') || 
            v.name.includes('Victoria') ||
            v.name.includes('Karen') ||
            v.name.includes('Zira') ||
            v.lang.startsWith('en-')
          );
          if (sweetVoice) {
            utterance.voice = sweetVoice;
          }
        }
        window.speechSynthesis.speak(utterance);
      };

      if (window.speechSynthesis.getVoices().length === 0) {
        window.speechSynthesis.onvoiceschanged = () => {
          speakWithVoices();
          window.speechSynthesis.onvoiceschanged = null;
        };
        setTimeout(speakWithVoices, 200);
      } else {
        speakWithVoices();
      }
    }
  } catch (synthError) {
    console.warn("Web speech synthesis notice:", synthError);
  }
}

export async function getGiftIdeas(phase: string): Promise<string[]> {
  try {
    const data = await fetchGeminiProxy("gift-ideas", { phase });
    if (data?.items || data?.ideas) return data.items || data.ideas;
  } catch (error) {
    console.warn("Proxy gift ideas unavailable, using fallback:", error);
  }
  return ["A bouquet of flowers", "Soft silk pajamas", "A handwritten letter", "Luxury chocolates", "A relaxing foot rub"];
}

export async function getSupportMission(phase: string): Promise<string[]> {
  try {
    const data = await fetchGeminiProxy("support-mission", { phase });
    if (data?.items || data?.mission) return data.items || data.mission;
  } catch (error) {
    console.warn("Proxy support missions unavailable, using fallback:", error);
  }
  return ["Clean the kitchen", "Prepare a warm bath", "Get her favorite snacks", "Light a scented candle", "Take care of dinner tonight"];
}

export async function getCommunicationTips(phase: string): Promise<string> {
  try {
    const data = await fetchGeminiProxy("communication-tips", { phase });
    if (data?.text) return data.text;
  } catch (error) {
    console.warn("Proxy communication tips unavailable, using fallback:", error);
  }
  return "Be patient, offer snacks, and ask 'How can I support you best right now?'";
}

export async function getLoveNoteIdeas(phase: string): Promise<string[]> {
  try {
    const data = await fetchGeminiProxy("love-note-ideas", { phase });
    if (data?.items || data?.ideas) return data.items || data.ideas;
  } catch (error) {
    console.warn("Proxy love note ideas unavailable, using fallback:", error);
  }
  return ["Just thinking about you and how amazing you are. ✨", "I'm here for whatever you need today, my love.", "You're doing so much, don't forget how much you're appreciated."];
}
