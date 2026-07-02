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

// Memory cache for stateful simulated bank transfers
const transferAttempts = new Map<string, number>();

interface PaystackPlan {
  id: 'monthly' | '6month';
  name: string;
  priceUSD: number;
  priceNGN: number;
}

const PLANS_CONFIG: PaystackPlan[] = [
  { id: 'monthly', name: 'Premium Monthly', priceUSD: 10.97, priceNGN: 16500 },
  { id: '6month', name: 'Premium 6-Month Plan', priceUSD: 49.99, priceNGN: 75000 }
];

function getPlanPrice(planId: 'monthly' | '6month', currency: string): number {
  const plan = PLANS_CONFIG.find(p => p.id === planId);
  if (!plan) return 0;
  if (currency === 'USD') return plan.priceUSD;
  if (currency === 'NGN') return plan.priceNGN;
  if (currency === 'GHS') return Number((plan.priceUSD * 14.5).toFixed(2));
  if (currency === 'ZAR') return Number((plan.priceUSD * 18.2).toFixed(2));
  return plan.priceUSD;
}

// Safe initialization of Google Gen AI with fallbacks
const apiKey = process.env.GEMINI_API_KEY || firebaseConfig.apiKey;
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
      console.warn(`Model ${model} fetch notice (falling back if available):`, error?.message || error);
      lastError = error;
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

app.get("/api/paystack/config", (req, res) => {
  res.json({
    publicKey: process.env.VITE_PAYSTACK_PUBLIC_KEY || "",
    planMonthly: process.env.VITE_PAYSTACK_PLAN_MONTHLY || "",
    plan6Month: process.env.VITE_PAYSTACK_PLAN_6MONTH || ""
  });
});

app.post("/api/paystack/initialize", async (req, res) => {
  const { email, amount, currency, planId, userId, callbackUrl } = req.body;

  if (!email || !amount || !currency || !planId || !userId) {
    return res.status(400).json({ error: "Missing required initialization fields" });
  }

  try {
    const isMock = !process.env.PAYSTACK_SECRET_KEY || userId.startsWith("sandbox_") || userId.startsWith("offline_");
    const transactionRef = `lumina_trial_${planId}_${Date.now()}_${Math.floor(Math.random() * 100000)}`;

    if (isMock) {
      const mockRedirectUrl = `${callbackUrl || '/settings'}?reference=${transactionRef}_card_success&planId=${planId}&currency=${currency}&userId=${userId}`;
      return res.json({
        authorization_url: mockRedirectUrl,
        reference: transactionRef
      });
    }

    const initUrl = "https://api.paystack.co/transaction/initialize";
    const body: any = {
      email,
      amount,
      currency,
      reference: transactionRef,
      callback_url: callbackUrl || `https://${req.headers.host}/settings?planId=${planId}&currency=${currency}&userId=${userId}`
    };

    // To ensure the checkout page displays the actual subscription amount instead of a $1 or 100 NGN trial setup fee,
    // we do not pass the Paystack plan code parameter on initialization. This ensures Paystack charges the full amount.
    /*
    const planEnvKey = planId === 'monthly' ? 'VITE_PAYSTACK_PLAN_MONTHLY' : 'VITE_PAYSTACK_PLAN_6MONTH';
    const planCode = process.env[planEnvKey];
    if (planCode) {
      body.plan = planCode;
    }
    */

    const initResponse = await fetch(initUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    });

    if (!initResponse.ok) {
      const errText = await initResponse.text();
      throw new Error(`Paystack API returned status ${initResponse.status}: ${errText}`);
    }

    const resData = await initResponse.json() as any;
    if (resData && resData.status && resData.data && resData.data.authorization_url) {
      return res.json({
        authorization_url: resData.data.authorization_url,
        reference: transactionRef
      });
    } else {
      throw new Error("Invalid initialization response from Paystack API");
    }
  } catch (err: any) {
    console.error("Paystack Initialize Error:", err);
    return res.status(500).json({ error: err.message || "Failed to initialize payment transaction" });
  }
});

app.post("/api/paystack/verify", async (req, res) => {
  const { reference, planId, currency, userId } = req.body;

  if (!reference || !planId || !currency || !userId) {
    return res.status(400).json({ error: "Missing required verification fields" });
  }

  try {
    const targetPlan = PLANS_CONFIG.find(p => p.id === planId);
    if (!targetPlan) {
      return res.status(400).json({ error: "Invalid plan ID" });
    }

    const expectedPrice = getPlanPrice(planId, currency);
    const expectedAmountSubunits = Math.round(expectedPrice * 100);

    // Check if running in simulation / mock mode:
    // Simulated mock mode is ONLY allowed if PAYSTACK_SECRET_KEY is completely missing/empty,
    // or if the userId is a local sandbox profile.
    // If a PAYSTACK_SECRET_KEY is set (even a test key like sk_test_...), we MUST perform
    // real remote Paystack API verification to ensure production integrity and prevent any bypass.
    const isMock = !process.env.PAYSTACK_SECRET_KEY || userId.startsWith("sandbox_") || userId.startsWith("offline_");

    let isSuccess = false;
    let gatewayChannel = "";
    let verificationError = "";

    if (isMock) {
      console.log(`[Verify] Simulating payment verification in mock mode for ${reference}...`);
      
      // If reference contains transfer_pending or is a transfer, we enforce the pending state.
      // Simulated bank transfers should NEVER auto-activate Premium to align with security logic.
      if (reference.includes("_transfer_pending") || reference.includes("_transfer")) {
        return res.status(200).json({
          status: "pending",
          message: "Waiting for payment confirmation",
          keepFree: true
        });
      } else if (reference.includes("_card_success")) {
        // Card simulation succeeds
        isSuccess = true;
        gatewayChannel = "card";
      } else {
        verificationError = "Payment not completed";
      }
    } else {
      // Real Paystack verification
      const verifyUrl = `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`;
      const verifyRes = await fetch(verifyUrl, {
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
          "Content-Type": "application/json"
        }
      });

      if (!verifyRes.ok) {
        throw new Error(`Paystack API returned status ${verifyRes.status}`);
      }

      const resData = (await verifyRes.json()) as any;
      if (resData && resData.status && resData.data) {
        const paystackData = resData.data;
        
        if (paystackData.status === "success") {
          const actualAmount = paystackData.amount;
          const diff = Math.abs(actualAmount - expectedAmountSubunits);
          
          // Accept either the full subscription amount, or a nominal authorization trace ($1 / 100 NGN, i.e., 100 cents / 10000 kobo)
          const isFullAmount = diff <= 100;
          const isVerificationTrace = actualAmount === 100 || actualAmount === 10000 || actualAmount === 1000 || actualAmount === 1500;
          
          if (isFullAmount || isVerificationTrace) {
            isSuccess = true;
            gatewayChannel = paystackData.channel || "";
          } else {
            verificationError = `Amount mismatch: expected full subscription amount (${expectedAmountSubunits} subunits) or validation trace, but received ${actualAmount} subunits from Paystack.`;
          }
        } else if (paystackData.status === "ongoing" || paystackData.status === "pending") {
          return res.status(200).json({
            status: "pending",
            message: "Waiting for payment confirmation",
            keepFree: true
          });
        } else {
          verificationError = `Paystack transaction status: ${paystackData.status}`;
        }
      } else {
        verificationError = "Invalid verification payload from Paystack";
      }
    }

    if (isSuccess) {
      const now = new Date();
      const trialEnd = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      const subscriptionEnd = new Date(trialEnd.getTime() + (planId === 'monthly' ? 30 : 180) * 24 * 60 * 60 * 1000);

      const trial_start_date = now.toISOString();
      const trial_end_date = trialEnd.toISOString();

      const billingItem = {
        id: `bill_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
        date: now.toISOString(),
        amount: 0.0, // 0.0 during 7-day free trial
        currency: currency,
        planName: planId === 'monthly' ? `${targetPlan.name} (7-Day Trial Started)` : `${targetPlan.name} (7-Day Trial Started)`,
        status: 'paid',
        reference: reference
      };

      if (userId.startsWith("sandbox_") || userId.startsWith("offline_")) {
        return res.status(200).json({
          status: "success",
          message: "Payment successfully verified (Sandbox Mode)",
          isPremium: true,
          subscriptionPlan: planId,
          subscriptionStatus: "trialing",
          subscriptionTrialEnd: trial_end_date,
          subscriptionEnd: subscriptionEnd.toISOString(),
          trial_start_date,
          trial_end_date,
          billingHistoryItem: billingItem
        });
      }

      if (!firestoreDb) {
        throw new Error("Firestore Admin database is not initialized");
      }

      const userRef = firestoreDb.collection("users").doc(userId);
      const docSnap = await userRef.get();
      if (!docSnap.exists) {
        return res.status(404).json({ error: "User document not found in Firestore" });
      }

      const userData = docSnap.data() || {};
      const currentHistory = userData.billingHistory || [];
      const updatedHistory = [...currentHistory, billingItem];

      await userRef.update({
        isPremium: true,
        subscriptionPlan: planId,
        subscriptionStatus: "trialing",
        subscriptionTrialEnd: trial_end_date,
        subscriptionEnd: subscriptionEnd.toISOString(),
        trial_start_date: trial_start_date,
        trial_end_date: trial_end_date,
        billingHistory: updatedHistory
      });

      return res.status(200).json({
        status: "success",
        message: "Payment successfully verified and premium activated!",
        isPremium: true,
        subscriptionPlan: planId,
        subscriptionStatus: "trialing",
        subscriptionTrialEnd: trial_end_date,
        subscriptionEnd: subscriptionEnd.toISOString(),
        trial_start_date,
        trial_end_date,
        billingHistoryItem: billingItem
      });
    } else {
      return res.status(400).json({
        status: "failed",
        error: verificationError || "Payment not completed"
      });
    }
  } catch (err: any) {
    console.error("[Verify Error]:", err);
    return res.status(500).json({ error: err?.message || "Internal server error during verification" });
  }
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
    if (!apiKey) throw new Error("No Gemini API key configured.");
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
  } catch (error) {
    res.json({ base64Audio: null });
  }
});

app.post("/api/gemini/gift-ideas", async (req, res) => {
  const { phase } = req.body;
  try {
    if (!apiKey) throw new Error("No Gemini API key configured.");
    const response = await generateSafeContent({
      contents: `My partner is in her ${phase} phase of her menstrual cycle. Suggest 5 thoughtful, romantic, or comforting gift ideas for this specific time.`,
      systemInstruction: "You are a thoughtful romantic advisor."
    });
    const ideas = (response.split('\n').filter(s => s.trim().length > 5).slice(0, 5)) || [];
    res.json({ ideas });
  } catch (error) {
    res.json({ ideas: ["A bouquet of flowers", "Soft silk pajamas", "A handwritten letter", "Luxury chocolates", "A relaxing foot rub"] });
  }
});

app.post("/api/gemini/support-mission", async (req, res) => {
  const { phase } = req.body;
  try {
    if (!apiKey) throw new Error("No Gemini API key configured.");
    const response = await generateSafeContent({
      contents: `My partner is in her ${phase} phase. Give me a list of 5 concrete, actionable chores or support tasks I can do to make her life easier today. Keep them simple like 'Clean the kitchen' or 'Prepare a heating pad'.`,
      systemInstruction: "You are a pragmatic and deeply empathetic support coach for partners."
    });
    const mission = (response.split('\n').filter(s => s.trim().length > 5).slice(0, 5)) || [];
    res.json({ mission });
  } catch (error) {
    res.json({ mission: ["Clean the kitchen", "Prepare a warm bath", "Get her favorite snacks", "Light a scented candle", "Take care of dinner tonight"] });
  }
});

app.post("/api/gemini/communication-tips", async (req, res) => {
  const { phase } = req.body;
  try {
    if (!apiKey) throw new Error("No Gemini API key configured.");
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
    if (!apiKey) throw new Error("No Gemini API key configured.");
    const response = await generateSafeContent({
      contents: `Write 3 short, sweet, and incredibly romantic text messages I can send my partner who is in her ${phase} phase. Make them feel seen and loved.`,
      systemInstruction: "You are a romantic poet and supportive partner."
    });
    const ideas = (response.split('\n').filter(s => s.trim().length > 5).slice(0, 3)) || [];
    res.json({ ideas });
  } catch (error) {
    res.json({ ideas: ["Just thinking about you and how amazing you are. ✨", "I'm here for whatever you need today, my love.", "You're doing so much, don't forget how much you're appreciated."] });
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
