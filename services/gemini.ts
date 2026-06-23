import { decodeBase64, decodeAudioData } from "./audio";

// Helper function to send safe POST requests to our server API proxy endpoints 
async function fetchGeminiProxy(endpoint: string, body: object): Promise<any> {
  const response = await fetch(`/api/gemini/${endpoint}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  return await response.json();
}

export async function getDailyAffirmation(name: string, phase?: string, mood?: string): Promise<string> {
  try {
    const data = await fetchGeminiProxy("affirmation", { name, phase, mood });
    return data.text;
  } catch (error) {
    console.error("Failed to fetch daily affirmation from proxy:", error);
    return `Your presence is a gentle whisper of beauty in the world, ${name}. Nurture your soul, honor your pace, and love your magic. 💖`;
  }
}

export async function getSupplementAdvice(symptoms: string[]): Promise<string> {
  try {
    const data = await fetchGeminiProxy("supplement", { symptoms });
    return data.text;
  } catch (error) {
    console.error("Failed to fetch supplement advice from proxy:", error);
    return "Your body is doing its best! Consider magnesium for cramps and some quiet rest. Always check with a professional first, sweet girl!";
  }
}

export async function getLuminaAdvice(question: string): Promise<string> {
  try {
    const data = await fetchGeminiProxy("advice", { question });
    return data.text;
  } catch (error) {
    console.error("Failed to fetch Lumina advice from proxy:", error);
    return "Your body is a beautiful mystery! It's always best to chat with a professional for specific medical concerns, but remember that you are perfectly made.";
  }
}

export async function getProductAdvice(product: string, concern: string): Promise<string> {
  try {
    const data = await fetchGeminiProxy("product", { product, concern });
    return data.text;
  } catch (error) {
    console.error("Failed to fetch product advice from proxy:", error);
    return "Take a deep breath. You are in control of your body, and it's okay to take it slow. You've got this, beautiful!";
  }
}

export async function playWelcomeVoice(name: string): Promise<void> {
  try {
    const data = await fetchGeminiProxy("welcome-voice", { name });
    const base64Audio = data.base64Audio;
    if (base64Audio) {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
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
    }
  } catch (error: any) {
    console.warn("Welcome Voice could not be played:", error?.message || error);
  }
}

export async function getGiftIdeas(phase: string): Promise<string[]> {
  try {
    const data = await fetchGeminiProxy("gift-ideas", { phase });
    return data.items || [];
  } catch (error) {
    console.error("Failed to fetch gift ideas from proxy:", error);
    return ["A bouquet of flowers", "Soft silk pajamas", "A handwritten letter", "Luxury chocolates", "A relaxing foot rub"];
  }
}

export async function getSupportMission(phase: string): Promise<string[]> {
  try {
    const data = await fetchGeminiProxy("support-mission", { phase });
    return data.items || [];
  } catch (error) {
    console.error("Failed to fetch support missions from proxy:", error);
    return ["Clean the kitchen", "Prepare a warm bath", "Get her favorite snacks", "Light a scented candle", "Take care of dinner tonight"];
  }
}

export async function getCommunicationTips(phase: string): Promise<string> {
  try {
    const data = await fetchGeminiProxy("communication-tips", { phase });
    return data.text;
  } catch (error) {
    console.error("Failed to fetch communication tips from proxy:", error);
    return "Be patient, offer snacks, and ask 'How can I support you best right now?'";
  }
}

export async function getLoveNoteIdeas(phase: string): Promise<string[]> {
  try {
    const data = await fetchGeminiProxy("love-note-ideas", { phase });
    return data.items || [];
  } catch (error) {
    console.error("Failed to fetch love note ideas from proxy:", error);
    return ["Just thinking about you and how amazing you are. ✨", "I'm here for whatever you need today, my love.", "You're doing so much, don't forget how much you're appreciated."];
  }
}
