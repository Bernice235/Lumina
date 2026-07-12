import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Modality } from "@google/genai";
import firebaseConfig from "./firebase-applet-config.json" with { type: "json" };
import admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";

// Initialize firebase-admin safely
let firestoreDb: any;
try {
  admin.initializeApp({
    projectId: firebaseConfig.projectId
  });
  firestoreDb = getFirestore(firebaseConfig.firestoreDatabaseId);
} catch (err) {
  console.error("Firebase Admin initialization error:", err);
  try {
    firestoreDb = getFirestore(firebaseConfig.firestoreDatabaseId);
  } catch (err2) {
    console.error("Firebase Admin retry failed:", err2);
  }
}



// Safe initialization of Google Gen AI with fallbacks
const apiKey = process.env.GEMINI_API_KEY || firebaseConfig.apiKey;
let isGeminiBlocked = !apiKey || apiKey === "MOCK_KEY_FOR_LOCAL_PLAYBACK";

const ai = new GoogleGenAI({
  apiKey: apiKey || "MOCK_KEY_FOR_LOCAL_PLAYBACK",
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

const app = express();
const PORT = 3000;

app.use(express.json());

// Helper logic for safe generating
async function generateSafeContent(config: {
  contents: string;
  systemInstruction?: string;
}): Promise<string> {
  if (isGeminiBlocked) {
    throw new Error("Gemini API is currently blocked or disabled.");
  }

  const models = ["gemini-3.1-flash-lite", "gemini-3.5-flash", "gemini-flash-latest", "gemini-3.1-pro-preview"];
  let lastError: any = null;

  for (const model of models) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: config.contents,
        config: config.systemInstruction ? { systemInstruction: config.systemInstruction } : undefined
      });
      if (response.text) {
        return response.text;
      }
    } catch (error: any) {
      const errStr = String(error?.message || error).toLowerCase();
      const isBlocked = errStr.includes("blocked") || 
                        errStr.includes("disabled") || 
                        errStr.includes("denied") || 
                        errStr.includes("forbidden") || 
                        errStr.includes("403") || 
                        errStr.includes("permission_denied") || 
                        errStr.includes("service_disabled") || 
                        errStr.includes("api_key_service_blocked");

      if (isBlocked) {
        console.warn("[Gemini] API key is blocked/disabled on Google servers. Silently bypassing subsequent calls to use offline mock fallback content.");
        isGeminiBlocked = true;
      } else {
        console.warn(`Model ${model} fetch notice (falling back if available):`, error?.message || error);
      }
      lastError = error;
      if (isGeminiBlocked) {
        break;
      }
    }
  }

  throw lastError || new Error("All models are currently experiencing high demand.");
}

function getLocalFallbackAffirmation(name: string, phase?: string, mood?: string): string {
  const normalizedMood = mood?.toLowerCase() || '';
  const normalizedPhase = phase?.toLowerCase() || '';
  const templates: string[] = [];

  if (normalizedMood.includes('happy') || normalizedMood.includes('excited')) {
    templates.push(
      `Your light is radiant today, ${name}. Keep shining and embracing this wonderful, magnetic energy. You are exactly where you need to be. 🌟`,
      `The world is a softer, brighter place with your laughter, ${name}. Celebrate your strength and flow with joy. ✨`,
      `Abundance and bliss flow to you naturally today, ${name}. Your positive spirit is a gift to yourself and everyone around you. 🌸`
    );
  } else if (normalizedMood.includes('calm') || normalizedMood.includes('dreamy')) {
    templates.push(
      `Rest in your own gentle rhythm today, ${name}. Your peaceful mind is your sanctuary, and you are surrounded by love. 🍃`,
      `Breath by breath, you are creating a beautiful, harmonious space for yourself, ${name}. In trust and ease, you bloom. 🤍`,
      `Allow yourself to simply be, sweet ${name}. Your stillness is powerful, and your dreams are being nurtured. ✨`
    );
  } else if (normalizedMood.includes('crampy') || normalizedMood.includes('sleepy') || normalizedMood.includes('tired')) {
    templates.push(
      `Be gentle with your beautiful temple, ${name}. Your body is doing sacred work right now, and you deserve deep comfort, rest, and peace. 🩹`,
      `It is safe to slow down and rest, sweet ${name}. Wrapped in comfort, you are recharging your internal light. 🌙`,
      `Your comfort is precious, ${name}. Give yourself permission to hibernate, wrap yourself in warmth, and let go of all demands. 🧸`
    );
  } else {
    templates.push(
      `You are a masterpiece in progress, ${name}. Stay gentle with your heart, hold space for your feelings, and trust your magnificent flow. 🌸`,
      `Every phase of your journey is beautiful, ${name}. You are blooming with strength, grace, and limitless potential. ✨`,
      `Your presence is a gentle whisper of beauty in the world, ${name}. Nurture your soul, honor your pace, and love your magic. 💖`
    );
  }

  if (normalizedPhase.includes('menstrual')) {
    templates.push(
      `In this winter of your cycle, ${name}, your softest surrender is your greatest power. Let go, rest deeply, and let your body renew. ❄️`,
      `Honoring the deep, cleansing release of your cycle, ${name}. You are restoring, healing, and listening to your inner wisdom. 🩸`
    );
  } else if (normalizedPhase.includes('follicular')) {
    templates.push(
      `Your spring is rising, ${name}. New beginnings, fresh clarity, and beautiful ideas are starting to bloom in your heart. 🌱`,
      `Feel the gentle spark of awakening within you, ${name}. You are stepping into your radiant, creative power. ✨`
    );
  } else if (normalizedPhase.includes('ovulat')) {
    templates.push(
      `You are at your absolute solar peak, ${name}. Magnetic, brilliant, and deeply alluring, the world reflects your inner sun. ☀️`,
      `Speak your truth with passion, ${name}. Your voice is magnetic, and you are fully aligned with your feminine power. 🌺`
    );
  } else if (normalizedPhase.includes('luteal')) {
    templates.push(
      `As the autumn wind blows, ${name}, draw inward. Protect your boundaries, nest in cozy comfort, and honor your intuitive wisdom. 🍂`,
      `It is safe to pull back and conserve your magic, ${name}. You are beautiful, wise, and protecting your peace. 🕯️`
    );
  }

  const index = Math.floor(Math.random() * templates.length);
  return templates[index];
}

// API Routes
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", mode: process.env.NODE_ENV });
});

app.post("/api/gemini/daily-affirmation", async (req, res) => {
  const { name, phase, mood } = req.body;
  try {
    if (!apiKey) throw new Error("No Gemini API key configured.");
    let prompt = `Generate a super girly, empowering, and poetic daily affirmation for ${name}. Keep it short, beautiful, and address her directly by name occasionally.`;
    if (phase) prompt += ` She is currently in her ${phase} phase of her menstrual cycle.`;
    if (mood) prompt += ` She is feeling ${mood}.`;

    const text = await generateSafeContent({
      contents: prompt,
      systemInstruction: "You are a supportive and elegant wellness coach. Your affirmations should be deeply personal, poetic, and encouraging."
    });
    res.json({ text });
  } catch (error) {
    res.json({ text: getLocalFallbackAffirmation(name, phase, mood) });
  }
});

app.post("/api/gemini/supplement-advice", async (req, res) => {
  const { symptoms } = req.body;
  try {
    if (!apiKey) throw new Error("No Gemini API key configured.");
    const symStr = (symptoms || []).join(', ');
    const text = await generateSafeContent({
      contents: `I am experiencing these symptoms: ${symStr}. Please give me some comforting, big-sisterly advice on which natural supplements or vitamins might help me feel better. Include a medical disclaimer.`,
      systemInstruction: "You are a kind, wise older sister and wellness expert. You specialize in feminine health and natural remedies."
    });
    res.json({ text });
  } catch (error) {
    res.json({ text: "Your body is doing its best! Consider magnesium for cramps and some quiet rest. Always check with a professional first, sweet girl!" });
  }
});

app.post("/api/gemini/lumina-advice", async (req, res) => {
  const { question } = req.body;
  try {
    if (!apiKey) throw new Error("No Gemini API key configured.");
    const text = await generateSafeContent({
      contents: `I have a question about the female body or feminine health: ${question}. Please give me some comforting, big-sisterly advice that is medically sound but very gentle and empowering. Include a medical disclaimer.`,
      systemInstruction: "You are a kind, wise older sister and wellness expert. You specialize in feminine health, anatomy, and emotional well-being."
    });
    res.json({ text });
  } catch (error) {
    res.json({ text: "Your body is a beautiful mystery! It's always best to chat with a professional for specific medical concerns, but remember that you are perfectly made." });
  }
});

app.post("/api/gemini/product-advice", async (req, res) => {
  const { product, concern } = req.body;
  try {
    if (!apiKey) throw new Error("No Gemini API key configured.");
    const text = await generateSafeContent({
      contents: `I am nervous about using a ${product}. My specific concern is: ${concern}. Please give me some comforting, big-sisterly advice that is medically sound but very gentle and empowering.`,
      systemInstruction: "You are a kind, wise older sister and wellness expert."
    });
    res.json({ text });
  } catch (error) {
    res.json({ text: "Take a deep breath. You are in control of your body, and it's okay to take it slow. You've got this, beautiful!" });
  }
});

app.post("/api/gemini/welcome-voice", async (req, res) => {
  const { name } = req.body;
  try {
    if (!apiKey || isGeminiBlocked) throw new Error("No Gemini API key configured.");
    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-tts-preview",
      contents: [{ parts: [{ text: `Hello ${name}. Welcome back to your sanctuary. I hope you're feeling wonderful today.` }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Zephyr' },
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    res.json({ base64Audio: base64Audio || null });
  } catch (error: any) {
    const errStr = String(error?.message || error).toLowerCase();
    if (errStr.includes("blocked") || errStr.includes("disabled") || errStr.includes("denied") || errStr.includes("forbidden") || errStr.includes("403")) {
      isGeminiBlocked = true;
    }
    res.json({ base64Audio: null });
  }
});

app.post("/api/gemini/gift-ideas", async (req, res) => {
  const { phase } = req.body;
  try {
    if (!apiKey || isGeminiBlocked) throw new Error("No Gemini API key configured.");
    const response = await generateSafeContent({
      contents: `My partner is in her ${phase} phase of her menstrual cycle. Suggest 5 thoughtful, romantic, or comforting gift ideas for this specific time.`,
      systemInstruction: "You are a thoughtful romantic advisor."
    });
    const ideas = (response.split('\n').filter(s => s.trim().length > 5).slice(0, 5)) || [];
    res.json({ ideas, items: ideas });
  } catch (error) {
    const fallback = ["A bouquet of flowers", "Soft silk pajamas", "A handwritten letter", "Luxury chocolates", "A relaxing foot rub"];
    res.json({ ideas: fallback, items: fallback });
  }
});

app.post("/api/gemini/support-mission", async (req, res) => {
  const { phase } = req.body;
  try {
    if (!apiKey || isGeminiBlocked) throw new Error("No Gemini API key configured.");
    const response = await generateSafeContent({
      contents: `My partner is in her ${phase} phase. Give me a list of 5 concrete, actionable chores or support tasks I can do to make her life easier today. Keep them simple like 'Clean the kitchen' or 'Prepare a heating pad'.`,
      systemInstruction: "You are a pragmatic and deeply empathetic support coach for partners."
    });
    const mission = (response.split('\n').filter(s => s.trim().length > 5).slice(0, 5)) || [];
    res.json({ mission, items: mission });
  } catch (error) {
    const fallback = ["Clean the kitchen", "Prepare a warm bath", "Get her favorite snacks", "Light a scented candle", "Take care of dinner tonight"];
    res.json({ mission: fallback, items: fallback });
  }
});

app.post("/api/gemini/communication-tips", async (req, res) => {
  const { phase } = req.body;
  try {
    if (!apiKey || isGeminiBlocked) throw new Error("No Gemini API key configured.");
    const text = await generateSafeContent({
      contents: `My partner is in her ${phase} phase. What are some sensitive and supportive ways I can talk to her and listen to her right now? Give me 3 bullet points.`,
      systemInstruction: "You are a relationship therapist specializing in empathy."
    });
    res.json({ text });
  } catch (error) {
    res.json({ text: "Be patient, offer snacks, and ask 'How can I support you best right now?'" });
  }
});

app.post("/api/gemini/love-note-ideas", async (req, res) => {
  const { phase } = req.body;
  try {
    if (!apiKey || isGeminiBlocked) throw new Error("No Gemini API key configured.");
    const response = await generateSafeContent({
      contents: `Write 3 short, sweet, and incredibly romantic text messages I can send my partner who is in her ${phase} phase. Make them feel seen and loved.`,
      systemInstruction: "You are a romantic poet and supportive partner."
    });
    const ideas = (response.split('\n').filter(s => s.trim().length > 5).slice(0, 3)) || [];
    res.json({ ideas, items: ideas });
  } catch (error) {
    const fallback = ["Just thinking about you and how amazing you are. ✨", "I'm here for whatever you need today, my love.", "You're doing so much, don't forget how much you're appreciated."];
    res.json({ ideas: fallback, items: fallback });
  }
});

async function startServer() {
  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*all', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
