import express, { Request, Response, NextFunction } from "express";
import path from "path";
import crypto from "crypto";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Modality } from "@google/genai";
import firebaseConfig from "./firebase-applet-config.json" with { type: "json" };
import { initializeApp, getApps } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

// Initialize Firebase Admin purely for stateless ID token verification (no IAM required)
let isAdminAuthReady = false;
try {
  if (getApps().length === 0) {
    initializeApp({
      projectId: firebaseConfig.projectId,
    });
  }
  isAdminAuthReady = true;
} catch (err) {
  console.warn("Firebase Admin Auth init notice:", err);
}

// Strict server-side Gemini API key lookup — NEVER fall back to client Firebase key
const apiKey = (process.env.GEMINI_API_KEY || "").trim();
let isGeminiBlocked = !apiKey || apiKey === "MOCK_KEY_FOR_LOCAL_PLAYBACK";

const ai = new GoogleGenAI({
  apiKey: apiKey || "MOCK_KEY_FOR_LOCAL_PLAYBACK",
  httpOptions: {
    headers: {
      "User-Agent": "aistudio-build",
    },
  },
});

const app = express();
const PORT = 3000;

app.set("trust proxy", 1);
app.disable("x-powered-by");

// --- Security Headers & Production HTTPS Enforcement ---
app.use((req: Request, res: Response, next: NextFunction) => {
  if (process.env.NODE_ENV === "production") {
    const proto = req.headers["x-forwarded-proto"];
    if (typeof proto === "string" && proto.split(",")[0].trim() === "http" && req.headers.host) {
      return res.redirect(301, `https://${req.headers.host}${req.originalUrl}`);
    }
    res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  }

  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "SAMEORIGIN");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Permissions-Policy", "camera=(self), microphone=(self), geolocation=(self), interest-cohort=()");
  res.setHeader("X-XSS-Protection", "0");
  const isDev = process.env.NODE_ENV !== "production";
  res.setHeader(
    "Content-Security-Policy",
    [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.paystack.co https://apis.google.com https://www.gstatic.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://paystack.com",
      "font-src 'self' https://fonts.gstatic.com data:",
      "img-src 'self' data: blob: https:",
      `connect-src 'self' https: wss:${isDev ? " ws://localhost:* ws://127.0.0.1:*" : ""}`,
      "frame-src 'self' https://js.paystack.co https://checkout.paystack.com https://*.firebaseapp.com https://accounts.google.com",
      "media-src 'self' https: blob: data:",
      "object-src 'none'",
      "base-uri 'self'",
    ].join("; ")
  );
  next();
});

app.use(express.json({ limit: "100kb" }));

// Handle malformed JSON / oversized body cleanly
app.use((err: any, _req: Request, res: Response, next: NextFunction) => {
  if (err?.type === "entity.too.large") {
    return res.status(413).json({ error: "Request payload exceeds maximum allowed size." });
  }
  if (err instanceof SyntaxError && "body" in err) {
    return res.status(400).json({ error: "Invalid JSON request body." });
  }
  next(err);
});

// --- Sliding-Window Rate Limiter ---
interface RateBucket {
  timestamps: number[];
}
const rateBuckets = new Map<string, RateBucket>();

function createRateLimiter(options: { windowMs: number; maxRequests: number; bucketPrefix: string }) {
  return (req: Request, res: Response, next: NextFunction) => {
    const ip = req.ip || req.socket.remoteAddress || "unknown";
    const key = `${options.bucketPrefix}:${ip}`;
    const now = Date.now();
    const bucket = rateBuckets.get(key) || { timestamps: [] };
    bucket.timestamps = bucket.timestamps.filter((t) => now - t < options.windowMs);

    if (bucket.timestamps.length >= options.maxRequests) {
      const oldest = bucket.timestamps[0];
      const retryAfter = Math.max(1, Math.ceil((options.windowMs - (now - oldest)) / 1000));
      res.setHeader("Retry-After", String(retryAfter));
      return res.status(429).json({ error: "Too many requests. Please slow down and try again shortly." });
    }

    bucket.timestamps.push(now);
    rateBuckets.set(key, bucket);

    // Periodic pruning to keep memory bounded
    if (rateBuckets.size > 5000) {
      for (const [k, b] of rateBuckets.entries()) {
        if (b.timestamps.every((t) => now - t >= options.windowMs)) {
          rateBuckets.delete(k);
        }
      }
    }

    next();
  };
}

const apiGeminiLimiter = createRateLimiter({ windowMs: 60_000, maxRequests: 30, bucketPrefix: "gemini" });
const apiSupportLimiter = createRateLimiter({ windowMs: 60_000, maxRequests: 5, bucketPrefix: "support" });

// --- CSRF / Origin & Firebase Auth Token Verification Middleware ---
async function verifyApiSecurity(req: Request, res: Response, next: NextFunction) {
  // 1. CSRF Origin Verification (for browser requests sending Origin)
  const origin = req.headers.origin;
  const host = req.headers.host;
  if (origin && host) {
    try {
      const originHost = new URL(origin).host;
      if (originHost !== host) {
        return res.status(403).json({ error: "Cross-origin POST requests are forbidden." });
      }
    } catch {
      return res.status(403).json({ error: "Invalid request origin." });
    }
  }

  // 2. Require explicit custom CSRF header OR valid Bearer token
  const csrfHeader = req.headers["x-requested-with"];
  const authHeader = req.headers.authorization;

  if (authHeader) {
    if (!authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Malformed authorization header." });
    }
    const token = authHeader.slice(7).trim();
    if (!token || !isAdminAuthReady) {
      return res.status(401).json({ error: "Invalid or unverifiable authentication token." });
    }
    try {
      const decoded = await getAuth().verifyIdToken(token);
      (req as any).authUid = decoded.uid;
    } catch {
      return res.status(401).json({ error: "Invalid or expired authentication token." });
    }
  } else if (csrfHeader !== "LuminaWebApp") {
    return res.status(403).json({ error: "Missing required security verification header." });
  }

  next();
}

// --- Input Sanitization Helpers ---
function cleanString(val: unknown, maxLen: number): string {
  if (typeof val !== "string") return "";
  return val.replace(/[\u0000-\u001F\u007F]/g, " ").trim().slice(0, maxLen);
}

function cleanStringArray(val: unknown, maxItems: number, maxItemLen: number): string[] {
  if (!Array.isArray(val)) return [];
  return val
    .slice(0, maxItems)
    .map((item) => cleanString(item, maxItemLen))
    .filter(Boolean);
}

// Helper logic for safe generating
async function generateSafeContent(config: {
  contents: string;
  systemInstruction?: string;
}): Promise<string> {
  if (isGeminiBlocked) {
    throw new Error("Gemini API is currently unavailable.");
  }

  const models = ["gemini-3.1-flash-lite", "gemini-3.5-flash", "gemini-flash-latest", "gemini-3.1-pro-preview"];
  let lastError: any = null;

  for (const model of models) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: config.contents,
        config: config.systemInstruction ? { systemInstruction: config.systemInstruction } : undefined,
      });
      if (response.text) {
        return response.text;
      }
    } catch (error: any) {
      const errStr = String(error?.message || error).toLowerCase();
      const isBlocked =
        errStr.includes("blocked") ||
        errStr.includes("disabled") ||
        errStr.includes("denied") ||
        errStr.includes("forbidden") ||
        errStr.includes("403") ||
        errStr.includes("permission_denied") ||
        errStr.includes("service_disabled") ||
        errStr.includes("api_key_service_blocked");

      if (isBlocked) {
        isGeminiBlocked = true;
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
  const safeName = name || "Beautiful";
  const normalizedMood = mood?.toLowerCase() || "";
  const normalizedPhase = phase?.toLowerCase() || "";
  const templates: string[] = [];

  if (normalizedMood.includes("happy") || normalizedMood.includes("excited")) {
    templates.push(
      `Your light is radiant today, ${safeName}. Keep shining and embracing this wonderful, magnetic energy. You are exactly where you need to be. 🌟`,
      `The world is a softer, brighter place with your laughter, ${safeName}. Celebrate your strength and flow with joy. ✨`,
      `Abundance and bliss flow to you naturally today, ${safeName}. Your positive spirit is a gift to yourself and everyone around you. 🌸`
    );
  } else if (normalizedMood.includes("calm") || normalizedMood.includes("dreamy")) {
    templates.push(
      `Rest in your own gentle rhythm today, ${safeName}. Your peaceful mind is your sanctuary, and you are surrounded by love. 🍃`,
      `Breath by breath, you are creating a beautiful, harmonious space for yourself, ${safeName}. In trust and ease, you bloom. 🤍`,
      `Allow yourself to simply be, sweet ${safeName}. Your stillness is powerful, and your dreams are being nurtured. ✨`
    );
  } else if (normalizedMood.includes("crampy") || normalizedMood.includes("sleepy") || normalizedMood.includes("tired")) {
    templates.push(
      `Be gentle with your beautiful temple, ${safeName}. Your body is doing sacred work right now, and you deserve deep comfort, rest, and peace. 🩹`,
      `It is safe to slow down and rest, sweet ${safeName}. Wrapped in comfort, you are recharging your internal light. 🌙`,
      `Your comfort is precious, ${safeName}. Give yourself permission to hibernate, wrap yourself in warmth, and let go of all demands. 🧸`
    );
  } else {
    templates.push(
      `You are a masterpiece in progress, ${safeName}. Stay gentle with your heart, hold space for your feelings, and trust your magnificent flow. 🌸`,
      `Every phase of your journey is beautiful, ${safeName}. You are blooming with strength, grace, and limitless potential. ✨`,
      `Your presence is a gentle whisper of beauty in the world, ${safeName}. Nurture your soul, honor your pace, and love your magic. 💖`
    );
  }

  if (normalizedPhase.includes("menstrual")) {
    templates.push(
      `In this winter of your cycle, ${safeName}, your softest surrender is your greatest power. Let go, rest deeply, and let your body renew. ❄️`,
      `Honoring the deep, cleansing release of your cycle, ${safeName}. You are restoring, healing, and listening to your inner wisdom. 🩸`
    );
  } else if (normalizedPhase.includes("follicular")) {
    templates.push(
      `Your spring is rising, ${safeName}. New beginnings, fresh clarity, and beautiful ideas are starting to bloom in your heart. 🌱`,
      `Feel the gentle spark of awakening within you, ${safeName}. You are stepping into your radiant, creative power. ✨`
    );
  } else if (normalizedPhase.includes("ovulat")) {
    templates.push(
      `You are at your absolute solar peak, ${safeName}. Magnetic, brilliant, and deeply alluring, the world reflects your inner sun. ☀️`,
      `Speak your truth with passion, ${safeName}. Your voice is magnetic, and you are fully aligned with your feminine power. 🌺`
    );
  } else if (normalizedPhase.includes("luteal")) {
    templates.push(
      `As the autumn wind blows, ${safeName}, draw inward. Protect your boundaries, nest in cozy comfort, and honor your intuitive wisdom. 🍂`,
      `It is safe to pull back and conserve your magic, ${safeName}. You are beautiful, wise, and protecting your peace. 🕯️`
    );
  }

  const index = Math.floor(Math.random() * templates.length);
  return templates[index];
}

// --- Public Health Endpoint ---
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", mode: process.env.NODE_ENV || "development" });
});

// --- Support / Feedback / Bug / Feature Endpoint (Validated + Honeypot + Rate Limited) ---
app.post("/api/support", apiSupportLimiter, verifyApiSecurity, (req, res) => {
  const { email, type, message, website } = req.body || {};

  // Honeypot spam trap
  if (typeof website === "string" && website.trim().length > 0) {
    return res.status(400).json({ error: "Submission rejected." });
  }

  const safeEmail = cleanString(email, 160);
  const safeType = cleanString(type, 30);
  const safeMessage = cleanString(message, 2000);

  if (!safeEmail || !/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(safeEmail)) {
    return res.status(400).json({ error: "Please provide a valid email address." });
  }
  if (!["support", "bug", "feature"].includes(safeType)) {
    return res.status(400).json({ error: "Invalid submission category." });
  }
  if (safeMessage.length < 10) {
    return res.status(400).json({ error: "Message must be at least 10 characters long." });
  }

  const ticketId = `LMN-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;
  return res.status(201).json({
    ok: true,
    ticketId,
    receivedAt: new Date().toISOString(),
  });
});

// --- Protected Gemini AI Endpoints ---
app.post("/api/gemini/daily-affirmation", apiGeminiLimiter, verifyApiSecurity, async (req, res) => {
  const name = cleanString(req.body?.name, 80) || "Beautiful";
  const phase = cleanString(req.body?.phase, 50);
  const mood = cleanString(req.body?.mood, 50);
  try {
    if (!apiKey || isGeminiBlocked) throw new Error("No Gemini API key configured.");
    let prompt = `Generate a supportive, empowering, and poetic daily affirmation for ${name}. Keep it short, warm, and address her directly by name occasionally.`;
    if (phase) prompt += ` She is currently in her ${phase} phase of her menstrual cycle.`;
    if (mood) prompt += ` She is feeling ${mood}.`;

    const text = await generateSafeContent({
      contents: prompt,
      systemInstruction: "You are a supportive and elegant wellness coach. Your affirmations should be deeply personal, poetic, and encouraging.",
    });
    res.json({ text });
  } catch {
    res.json({ text: getLocalFallbackAffirmation(name, phase, mood) });
  }
});

app.post("/api/gemini/supplement-advice", apiGeminiLimiter, verifyApiSecurity, async (req, res) => {
  const symptoms = cleanStringArray(req.body?.symptoms, 15, 60);
  if (symptoms.length === 0) {
    return res.status(400).json({ error: "Please select at least one symptom." });
  }
  try {
    if (!apiKey || isGeminiBlocked) throw new Error("No Gemini API key configured.");
    const symStr = symptoms.join(", ");
    const text = await generateSafeContent({
      contents: `I am experiencing these symptoms: ${symStr}. Please give me some comforting, big-sisterly advice on which natural supplements or vitamins might help me feel better. Include a medical disclaimer.`,
      systemInstruction: "You are a kind, wise older sister and wellness expert. You specialize in feminine health and natural remedies.",
    });
    res.json({ text });
  } catch {
    res.json({ text: "Your body is doing its best! Consider magnesium for cramps and some quiet rest. Always check with a professional first, sweet girl!" });
  }
});

app.post("/api/gemini/lumina-advice", apiGeminiLimiter, verifyApiSecurity, async (req, res) => {
  const question = cleanString(req.body?.question, 800);
  if (question.length < 3) {
    return res.status(400).json({ error: "Please enter a valid wellness question." });
  }
  try {
    if (!apiKey || isGeminiBlocked) throw new Error("No Gemini API key configured.");
    const text = await generateSafeContent({
      contents: `I have a question about the female body or feminine health: ${question}. Please give me some comforting, big-sisterly advice that is medically sound but very gentle and empowering. Include a medical disclaimer.`,
      systemInstruction: "You are a kind, wise older sister and wellness expert. You specialize in feminine health, anatomy, and emotional well-being.",
    });
    res.json({ text });
  } catch {
    res.json({ text: "Your body is a beautiful mystery! It's always best to chat with a professional for specific medical concerns, but remember that you are perfectly made." });
  }
});

app.post("/api/gemini/product-advice", apiGeminiLimiter, verifyApiSecurity, async (req, res) => {
  const product = cleanString(req.body?.product, 100);
  const concern = cleanString(req.body?.concern, 600);
  if (!product || !concern) {
    return res.status(400).json({ error: "Both product and concern fields are required." });
  }
  try {
    if (!apiKey || isGeminiBlocked) throw new Error("No Gemini API key configured.");
    const text = await generateSafeContent({
      contents: `I am nervous about using a ${product}. My specific concern is: ${concern}. Please give me some comforting, big-sisterly advice that is medically sound but very gentle and empowering.`,
      systemInstruction: "You are a kind, wise older sister and wellness expert.",
    });
    res.json({ text });
  } catch {
    res.json({ text: "Take a deep breath. You are in control of your body, and it's okay to take it slow. You've got this, beautiful!" });
  }
});

app.post("/api/gemini/companion-chat", apiGeminiLimiter, verifyApiSecurity, async (req, res) => {
  const avatarId = cleanString(req.body?.avatarId, 30) || "amara";
  const avatarName = cleanString(req.body?.avatarName, 50) || "Amara";
  const userName = cleanString(req.body?.userName, 60) || "Friend";
  const userMessage = cleanString(req.body?.userMessage, 1000);
  const rawCtx = req.body?.wellnessContext && typeof req.body.wellnessContext === "object" ? req.body.wellnessContext : {};
  const rawHistory = Array.isArray(req.body?.history) ? req.body.history.slice(-6) : [];

  if (!userMessage) {
    return res.status(400).json({ error: "Message cannot be empty." });
  }

  const cyclePhase = cleanString(rawCtx.cyclePhase, 40) || "menstrual";
  const cycleDay = typeof rawCtx.cycleDay === "number" && rawCtx.cycleDay >= 1 && rawCtx.cycleDay <= 180 ? rawCtx.cycleDay : 1;
  const periodStatus = cleanString(rawCtx.periodStatus, 80);
  const symptoms = cleanStringArray(rawCtx.symptoms, 12, 50);
  const isPregnancyMode = Boolean(rawCtx.isPregnancyMode);
  const pregnancyWeek = typeof rawCtx.pregnancyWeek === "number" ? Math.min(42, Math.max(0, rawCtx.pregnancyWeek)) : 0;
  const isPostpartumMode = Boolean(rawCtx.isPostpartumMode);
  const postpartumDays = typeof rawCtx.postpartumDays === "number" ? Math.min(365, Math.max(0, rawCtx.postpartumDays)) : 0;
  const recentMood = cleanString(rawCtx.recentMood, 50);
  const waterIntake = typeof rawCtx.waterIntake === "number" ? Math.min(20000, Math.max(0, rawCtx.waterIntake)) : 0;
  const waterGoal = typeof rawCtx.waterGoal === "number" ? Math.min(20000, Math.max(1, rawCtx.waterGoal)) : 2000;
  const wellnessGoals = cleanStringArray(rawCtx.wellnessGoals, 10, 60);

  let personaTone = "Warm, gentle, encouraging, and soothing";
  let greetingStyle = "Warm sisterly affection, gentle botanical reminders, and loving reassurance";

  if (avatarId === "zainab") {
    personaTone = "Friendly, motivational, energetic, and empowering";
    greetingStyle = "Upbeat enthusiasm, empowering encouragement, active celebration of small wins";
  } else if (avatarId === "naomi") {
    personaTone = "Calm, wise, reflective, and serene";
    greetingStyle = "Deep grounding stillness, mindful breath reminders, reflective wisdom, and quiet peace";
  } else if (avatarId === "amina") {
    personaTone = "Cheerful, positive, supportive, and bright";
    greetingStyle = "Sunny optimism, joyful encouragement, radiant smiles, and uplifting cheerleader warmth";
  } else if (avatarId === "kemi") {
    personaTone = "Vibrant, bold, inspiring, and energizing";
    greetingStyle = "Fiery confidence, passionate sisterhood, motivating affirmations";
  }

  const generateFallbackResponse = (query: string): { reply: string; suggestedPrompts: string[] } => {
    const q = query.toLowerCase();
    if (isPregnancyMode && (q.includes("baby") || q.includes("week") || q.includes("how"))) {
      return {
        reply: `Congratulations on reaching Week ${pregnancyWeek || 24} of pregnancy, ${userName}! 🌸 Your body is doing something miraculous every single second. Make sure you're resting your feet, drinking warm nourishing fluids, and honoring the gentle kicks of life inside you.`,
        suggestedPrompts: ["What should I eat today? 🥑", "Prenatal gentle stretch 🧘‍♀️", "Hydration check 💧"],
      };
    }
    if (isPostpartumMode) {
      return {
        reply: `You are doing amazing, sweet ${userName}. Recovery takes time, and every single small step matters. Please give yourself infinite grace today—rest when baby rests, and remember to hydrate. 🤍`,
        suggestedPrompts: ["Gentle pelvic floor care 🌸", "Postpartum hydration 💧", "Emotional check-in ✨"],
      };
    }
    if (q.includes("cramp") || q.includes("pain") || q.includes("period") || cycleDay <= 5) {
      return {
        reply: `You’re on Day ${cycleDay} of your cycle today, ${userName} 🌸. Take it easy, keep warm, and stay hydrated. How are your cramps feeling right now? Remember you don't have to push yourself today.`,
        suggestedPrompts: ["Cramps are manageable 🌿", "Feeling fatigued 😴", "Log my symptoms 📝"],
      };
    }
    if (q.includes("water") || q.includes("hydrat")) {
      const remaining = Math.max(0, waterGoal - waterIntake);
      return {
        reply: `Hydration is your natural glow elixir, ${userName}! 💧 You've reached ${waterIntake} of your ${waterGoal} daily goal (${remaining} to go). Take a refreshing, mindful sip right now.`,
        suggestedPrompts: ["Logged water 💧", "Why does water help cramps? 🌸", "Cycle check-in ✨"],
      };
    }
    return {
      reply: `I'm right here with you, ${userName} 💖. In your ${cyclePhase} phase, listening to your body's subtle whispers is the greatest kindness you can offer yourself. What wellness focus would feel most supportive right now?`,
      suggestedPrompts: ["Check my cycle phase 🌸", "Self-care suggestions ✨", "Log how I'm feeling 📝"],
    };
  };

  try {
    if (!apiKey || isGeminiBlocked) {
      return res.json(generateFallbackResponse(userMessage));
    }

    const systemInstruction = `You are ${avatarName}, an interactive wellness avatar companion inside Lumina, an empowering feminine health & cycle tracking application.
You are talking directly to ${userName}.
Your personality is strictly: ${personaTone}.
Your greeting & communication style: ${greetingStyle}.

CRITICAL USER WELLNESS CONTEXT:
- Menstrual Cycle Phase: ${cyclePhase} (Day ${cycleDay} of cycle)
- Period / Flow status: ${periodStatus || "Active tracking"}
- Pregnancy Mode: ${isPregnancyMode ? `Yes (Week ${pregnancyWeek})` : "No"}
- Postpartum Mode: ${isPostpartumMode ? `Yes (${postpartumDays} days postpartum)` : "No"}
- Recently Logged Symptoms: ${symptoms.length > 0 ? symptoms.join(", ") : "None logged yet"}
- Recent Mood: ${recentMood || "Balanced"}
- Hydration Status: ${waterIntake} of ${waterGoal} goal
- User's Wellness Goals: ${wellnessGoals.length > 0 ? wellnessGoals.join(", ") : "Mindful cycle health, symptom relief"}

RULES FOR YOUR RESPONSES:
1. Speak in your distinct personality (${avatarName}: ${personaTone}).
2. Directly reference user's wellness info when relevant.
3. Keep responses warm, supportive, concise (2-4 sentences max), conversational, and caring.
4. Never diagnose medical conditions; maintain a supportive sisterly tone.`;

    let conversationPrompt = "Conversation History:\n";
    for (const msg of rawHistory) {
      if (msg && typeof msg === "object") {
        const roleLabel = msg.role === "user" ? userName : avatarName;
        const safeContent = cleanString(msg.content, 500);
        if (safeContent) conversationPrompt += `${roleLabel}: ${safeContent}\n`;
      }
    }
    conversationPrompt += `\n${userName}: ${userMessage}\n${avatarName}:`;

    const text = await generateSafeContent({
      contents: conversationPrompt,
      systemInstruction,
    });

    if (text) {
      return res.json({
        reply: text.trim(),
        suggestedPrompts: ["Log today's symptoms 📝", "How is my cycle today? 🌸", "Give me a self-care tip ✨"],
      });
    }
    return res.json(generateFallbackResponse(userMessage));
  } catch {
    return res.json(generateFallbackResponse(userMessage));
  }
});

app.post("/api/gemini/welcome-voice", apiGeminiLimiter, verifyApiSecurity, async (req, res) => {
  const name = cleanString(req.body?.name, 60) || "Beautiful";
  const customText = cleanString(req.body?.text, 400);
  try {
    if (!apiKey || isGeminiBlocked) throw new Error("No Gemini API key configured.");
    const spokenText = customText || `Hello ${name}. Welcome back to your sanctuary. I hope you're feeling wonderful today.`;
    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-tts-preview",
      contents: [{ parts: [{ text: spokenText }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: "Zephyr" },
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

app.post("/api/gemini/gift-ideas", apiGeminiLimiter, verifyApiSecurity, async (req, res) => {
  const phase = cleanString(req.body?.phase, 50) || "menstrual";
  try {
    if (!apiKey || isGeminiBlocked) throw new Error("No Gemini API key configured.");
    const response = await generateSafeContent({
      contents: `My partner is in her ${phase} phase of her menstrual cycle. Suggest 5 thoughtful, romantic, or comforting gift ideas for this specific time.`,
      systemInstruction: "You are a thoughtful romantic advisor.",
    });
    const ideas = response.split("\n").filter((s) => s.trim().length > 5).slice(0, 5) || [];
    res.json({ ideas, items: ideas });
  } catch {
    const fallback = ["A bouquet of flowers", "Soft silk pajamas", "A handwritten letter", "Luxury chocolates", "A relaxing foot rub"];
    res.json({ ideas: fallback, items: fallback });
  }
});

app.post("/api/gemini/support-mission", apiGeminiLimiter, verifyApiSecurity, async (req, res) => {
  const phase = cleanString(req.body?.phase, 50) || "menstrual";
  try {
    if (!apiKey || isGeminiBlocked) throw new Error("No Gemini API key configured.");
    const response = await generateSafeContent({
      contents: `My partner is in her ${phase} phase. Give me a list of 5 concrete, actionable chores or support tasks I can do to make her life easier today. Keep them simple like 'Clean the kitchen' or 'Prepare a heating pad'.`,
      systemInstruction: "You are a pragmatic and deeply empathetic support coach for partners.",
    });
    const mission = response.split("\n").filter((s) => s.trim().length > 5).slice(0, 5) || [];
    res.json({ mission, items: mission });
  } catch {
    const fallback = ["Clean the kitchen", "Prepare a warm bath", "Get her favorite snacks", "Light a scented candle", "Take care of dinner tonight"];
    res.json({ mission: fallback, items: fallback });
  }
});

app.post("/api/gemini/communication-tips", apiGeminiLimiter, verifyApiSecurity, async (req, res) => {
  const phase = cleanString(req.body?.phase, 50) || "menstrual";
  try {
    if (!apiKey || isGeminiBlocked) throw new Error("No Gemini API key configured.");
    const text = await generateSafeContent({
      contents: `My partner is in her ${phase} phase. What are some sensitive and supportive ways I can talk to her and listen to her right now? Give me 3 bullet points.`,
      systemInstruction: "You are a relationship therapist specializing in empathy.",
    });
    res.json({ text });
  } catch {
    res.json({ text: "Be patient, offer snacks, and ask 'How can I support you best right now?'" });
  }
});

app.post("/api/gemini/love-note-ideas", apiGeminiLimiter, verifyApiSecurity, async (req, res) => {
  const phase = cleanString(req.body?.phase, 50) || "menstrual";
  try {
    if (!apiKey || isGeminiBlocked) throw new Error("No Gemini API key configured.");
    const response = await generateSafeContent({
      contents: `Write 3 short, sweet, and incredibly romantic text messages I can send my partner who is in her ${phase} phase. Make them feel seen and loved.`,
      systemInstruction: "You are a romantic poet and supportive partner.",
    });
    const ideas = response.split("\n").filter((s) => s.trim().length > 5).slice(0, 3) || [];
    res.json({ ideas, items: ideas });
  } catch {
    const fallback = [
      "Just thinking about you and how amazing you are. ✨",
      "I'm here for whatever you need today, my love.",
      "You're doing so much, don't forget how much you're appreciated.",
    ];
    res.json({ ideas: fallback, items: fallback });
  }
});

// Reject any unknown /api/* route with JSON 404
app.all("/api/*all", (_req, res) => {
  res.status(404).json({ error: "API route not found." });
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: false, ws: false },
      appType: "spa",
    });
    app.get("/@vite/client", async (_req, res, next) => {
      try {
        const result = await vite.transformRequest("/@vite/client");
        if (result?.code) {
          res
            .type("application/javascript")
            .send(
              result.code.replace(
                "transport.connect(createHMRHandler(handleMessage));",
                "/* HMR WebSocket disabled */"
              )
            );
          return;
        }
      } catch {
        // Fall back to default Vite middleware
      }
      next();
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*all", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
