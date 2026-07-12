var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// server.ts
var import_express = __toESM(require("express"), 1);
var import_path = __toESM(require("path"), 1);
var import_vite = require("vite");
var import_genai = require("@google/genai");

// firebase-applet-config.json
var firebase_applet_config_default = {
  projectId: "coral-gizmo-05xj8",
  appId: "1:132449945787:web:f827da49ebfd3f7159819e",
  apiKey: "AIzaSyD7xs76O6daNAkooN4Uyn27Dghw0yhIunI",
  authDomain: "coral-gizmo-05xj8.firebaseapp.com",
  firestoreDatabaseId: "ai-studio-ec8e5512-930d-4979-91c3-1cc220afd7f4",
  storageBucket: "coral-gizmo-05xj8.firebasestorage.app",
  messagingSenderId: "132449945787",
  measurementId: ""
};

// server.ts
var import_firebase_admin = __toESM(require("firebase-admin"), 1);
var import_firestore = require("firebase-admin/firestore");
var firestoreDb;
try {
  import_firebase_admin.default.initializeApp({
    projectId: firebase_applet_config_default.projectId
  });
  firestoreDb = (0, import_firestore.getFirestore)(firebase_applet_config_default.firestoreDatabaseId);
} catch (err) {
  console.error("Firebase Admin initialization error:", err);
  try {
    firestoreDb = (0, import_firestore.getFirestore)(firebase_applet_config_default.firestoreDatabaseId);
  } catch (err2) {
    console.error("Firebase Admin retry failed:", err2);
  }
}
var PLANS_CONFIG = [
  { id: "monthly", name: "Premium Monthly", priceUSD: 10.97, priceNGN: 16500 },
  { id: "6month", name: "Premium 6-Month Plan", priceUSD: 49.99, priceNGN: 75e3 }
];
function getPlanPrice(planId, currency) {
  const plan = PLANS_CONFIG.find((p) => p.id === planId);
  if (!plan) return 0;
  if (currency === "USD") return plan.priceUSD;
  if (currency === "NGN") return plan.priceNGN;
  if (currency === "GHS") return Number((plan.priceUSD * 14.5).toFixed(2));
  if (currency === "ZAR") return Number((plan.priceUSD * 18.2).toFixed(2));
  return plan.priceUSD;
}
var apiKey = process.env.GEMINI_API_KEY || firebase_applet_config_default.apiKey;
var isGeminiBlocked = !apiKey || apiKey === "MOCK_KEY_FOR_LOCAL_PLAYBACK";
var ai = new import_genai.GoogleGenAI({
  apiKey: apiKey || "MOCK_KEY_FOR_LOCAL_PLAYBACK",
  httpOptions: {
    headers: {
      "User-Agent": "aistudio-build"
    }
  }
});
var app = (0, import_express.default)();
var PORT = 3e3;
app.use(import_express.default.json());
async function generateSafeContent(config) {
  if (isGeminiBlocked) {
    throw new Error("Gemini API is currently blocked or disabled.");
  }
  const models = ["gemini-3.1-flash-lite", "gemini-3.5-flash", "gemini-flash-latest", "gemini-3.1-pro-preview"];
  let lastError = null;
  for (const model of models) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: config.contents,
        config: config.systemInstruction ? { systemInstruction: config.systemInstruction } : void 0
      });
      if (response.text) {
        return response.text;
      }
    } catch (error) {
      const errStr = String(error?.message || error).toLowerCase();
      const isBlocked = errStr.includes("blocked") || errStr.includes("disabled") || errStr.includes("denied") || errStr.includes("forbidden") || errStr.includes("403") || errStr.includes("permission_denied") || errStr.includes("service_disabled") || errStr.includes("api_key_service_blocked");
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
function getLocalFallbackAffirmation(name, phase, mood) {
  const normalizedMood = mood?.toLowerCase() || "";
  const normalizedPhase = phase?.toLowerCase() || "";
  const templates = [];
  if (normalizedMood.includes("happy") || normalizedMood.includes("excited")) {
    templates.push(
      `Your light is radiant today, ${name}. Keep shining and embracing this wonderful, magnetic energy. You are exactly where you need to be. \u{1F31F}`,
      `The world is a softer, brighter place with your laughter, ${name}. Celebrate your strength and flow with joy. \u2728`,
      `Abundance and bliss flow to you naturally today, ${name}. Your positive spirit is a gift to yourself and everyone around you. \u{1F338}`
    );
  } else if (normalizedMood.includes("calm") || normalizedMood.includes("dreamy")) {
    templates.push(
      `Rest in your own gentle rhythm today, ${name}. Your peaceful mind is your sanctuary, and you are surrounded by love. \u{1F343}`,
      `Breath by breath, you are creating a beautiful, harmonious space for yourself, ${name}. In trust and ease, you bloom. \u{1F90D}`,
      `Allow yourself to simply be, sweet ${name}. Your stillness is powerful, and your dreams are being nurtured. \u2728`
    );
  } else if (normalizedMood.includes("crampy") || normalizedMood.includes("sleepy") || normalizedMood.includes("tired")) {
    templates.push(
      `Be gentle with your beautiful temple, ${name}. Your body is doing sacred work right now, and you deserve deep comfort, rest, and peace. \u{1FA79}`,
      `It is safe to slow down and rest, sweet ${name}. Wrapped in comfort, you are recharging your internal light. \u{1F319}`,
      `Your comfort is precious, ${name}. Give yourself permission to hibernate, wrap yourself in warmth, and let go of all demands. \u{1F9F8}`
    );
  } else {
    templates.push(
      `You are a masterpiece in progress, ${name}. Stay gentle with your heart, hold space for your feelings, and trust your magnificent flow. \u{1F338}`,
      `Every phase of your journey is beautiful, ${name}. You are blooming with strength, grace, and limitless potential. \u2728`,
      `Your presence is a gentle whisper of beauty in the world, ${name}. Nurture your soul, honor your pace, and love your magic. \u{1F496}`
    );
  }
  if (normalizedPhase.includes("menstrual")) {
    templates.push(
      `In this winter of your cycle, ${name}, your softest surrender is your greatest power. Let go, rest deeply, and let your body renew. \u2744\uFE0F`,
      `Honoring the deep, cleansing release of your cycle, ${name}. You are restoring, healing, and listening to your inner wisdom. \u{1FA78}`
    );
  } else if (normalizedPhase.includes("follicular")) {
    templates.push(
      `Your spring is rising, ${name}. New beginnings, fresh clarity, and beautiful ideas are starting to bloom in your heart. \u{1F331}`,
      `Feel the gentle spark of awakening within you, ${name}. You are stepping into your radiant, creative power. \u2728`
    );
  } else if (normalizedPhase.includes("ovulat")) {
    templates.push(
      `You are at your absolute solar peak, ${name}. Magnetic, brilliant, and deeply alluring, the world reflects your inner sun. \u2600\uFE0F`,
      `Speak your truth with passion, ${name}. Your voice is magnetic, and you are fully aligned with your feminine power. \u{1F33A}`
    );
  } else if (normalizedPhase.includes("luteal")) {
    templates.push(
      `As the autumn wind blows, ${name}, draw inward. Protect your boundaries, nest in cozy comfort, and honor your intuitive wisdom. \u{1F342}`,
      `It is safe to pull back and conserve your magic, ${name}. You are beautiful, wise, and protecting your peace. \u{1F56F}\uFE0F`
    );
  }
  const index = Math.floor(Math.random() * templates.length);
  return templates[index];
}
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
    const transactionRef = `lumina_trial_${planId}_${Date.now()}_${Math.floor(Math.random() * 1e5)}`;
    if (isMock) {
      const mockRedirectUrl = `${callbackUrl || "/settings"}?reference=${transactionRef}_card_success&planId=${planId}&currency=${currency}&userId=${userId}`;
      return res.json({
        authorization_url: mockRedirectUrl,
        reference: transactionRef
      });
    }
    const initUrl = "https://api.paystack.co/transaction/initialize";
    const body = {
      email,
      amount,
      currency,
      reference: transactionRef,
      callback_url: callbackUrl || `https://${req.headers.host}/settings?planId=${planId}&currency=${currency}&userId=${userId}`
    };
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
    const resData = await initResponse.json();
    if (resData && resData.status && resData.data && resData.data.authorization_url) {
      return res.json({
        authorization_url: resData.data.authorization_url,
        reference: transactionRef
      });
    } else {
      throw new Error("Invalid initialization response from Paystack API");
    }
  } catch (err) {
    console.error("Paystack Initialize Error:", err);
    return res.status(500).json({ error: err.message || "Failed to initialize payment transaction" });
  }
});
app.get("/api/paystack/banks", async (req, res) => {
  try {
    const isMock = !process.env.PAYSTACK_SECRET_KEY;
    if (isMock) {
      return res.json([
        { code: "058", name: "Guaranty Trust Bank (GTB)" },
        { code: "011", name: "First Bank of Nigeria" },
        { code: "033", name: "United Bank for Africa (UBA)" },
        { code: "057", name: "Zenith Bank" },
        { code: "035", name: "Wema Bank / ALAT" },
        { code: "070", name: "Fidelity Bank" },
        { code: "044", name: "Access Bank" },
        { code: "305", name: "Paycom (OPay)" },
        { code: "311", name: "Kuda Bank" }
      ]);
    }
    const banksUrl = "https://api.paystack.co/bank";
    const banksRes = await fetch(banksUrl, {
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`
      }
    });
    if (!banksRes.ok) {
      throw new Error(`Paystack banks fetch returned status ${banksRes.status}`);
    }
    const resData = await banksRes.json();
    if (resData && resData.status && resData.data) {
      const banks = resData.data.map((b) => ({
        code: b.code,
        name: b.name
      }));
      return res.json(banks);
    } else {
      throw new Error("Invalid response from Paystack bank list");
    }
  } catch (err) {
    console.warn("[Fetch Banks Fallback]:", err.message || err);
    return res.json([
      { code: "058", name: "Guaranty Trust Bank (GTB)" },
      { code: "011", name: "First Bank of Nigeria" },
      { code: "033", name: "United Bank for Africa (UBA)" },
      { code: "057", name: "Zenith Bank" },
      { code: "035", name: "Wema Bank / ALAT" },
      { code: "070", name: "Fidelity Bank" },
      { code: "044", name: "Access Bank" },
      { code: "305", name: "Paycom (OPay)" },
      { code: "311", name: "Kuda Bank" }
    ]);
  }
});
app.post("/api/paystack/resolve-account", async (req, res) => {
  const { accountNumber, bankCode } = req.body;
  if (!accountNumber || !bankCode) {
    return res.status(400).json({ error: "Missing accountNumber or bankCode" });
  }
  const trimmed = String(accountNumber).trim();
  if (trimmed.length !== 10 || !/^\d+$/.test(trimmed)) {
    return res.status(400).json({ error: "Account number must be exactly 10 digits." });
  }
  try {
    const isMock = !process.env.PAYSTACK_SECRET_KEY;
    if (isMock) {
      return res.json({
        status: "success",
        accountName: "Simulated Lumina Account Holder",
        accountNumber: trimmed,
        bankCode
      });
    }
    const resolveUrl = `https://api.paystack.co/bank/resolve?account_number=${encodeURIComponent(trimmed)}&bank_code=${encodeURIComponent(bankCode)}`;
    const resolveRes = await fetch(resolveUrl, {
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        "Content-Type": "application/json"
      }
    });
    if (!resolveRes.ok) {
      const errText = await resolveRes.text().catch(() => "");
      return res.status(400).json({ error: "Could not resolve bank account. Please verify that the bank and 10-digit account number are correct." });
    }
    const resData = await resolveRes.json();
    if (resData && resData.status && resData.data) {
      return res.json({
        status: "success",
        accountName: resData.data.account_name,
        accountNumber: resData.data.account_number,
        bankCode
      });
    } else {
      return res.status(400).json({ error: resData.message || "Could not resolve account with Paystack." });
    }
  } catch (err) {
    console.error("[Resolve Account Error]:", err);
    return res.status(500).json({ error: err.message || "Internal server error resolving bank account credentials" });
  }
});
app.post("/api/paystack/verify", async (req, res) => {
  const { reference, planId, currency, userId } = req.body;
  if (!reference || !planId || !currency || !userId) {
    return res.status(400).json({ error: "Missing required verification fields" });
  }
  try {
    const targetPlan = PLANS_CONFIG.find((p) => p.id === planId);
    if (!targetPlan) {
      return res.status(400).json({ error: "Invalid plan ID" });
    }
    const expectedPrice = getPlanPrice(planId, currency);
    const expectedAmountSubunits = Math.round(expectedPrice * 100);
    const isMock = !process.env.PAYSTACK_SECRET_KEY || userId.startsWith("sandbox_") || userId.startsWith("offline_");
    let isSuccess = false;
    let gatewayChannel = "";
    let verificationError = "";
    if (isMock) {
      console.log(`[Verify] Simulating payment verification in mock mode for ${reference}...`);
      if (reference.includes("_transfer_pending") || reference.includes("_transfer")) {
        isSuccess = true;
        gatewayChannel = "bank_transfer";
      } else if (reference.includes("_card_success")) {
        isSuccess = true;
        gatewayChannel = "card";
      } else {
        verificationError = "Payment not completed";
      }
    } else {
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
      const resData = await verifyRes.json();
      if (resData && resData.status && resData.data) {
        const paystackData = resData.data;
        if (paystackData.status === "success") {
          const actualAmount = paystackData.amount;
          const diff = Math.abs(actualAmount - expectedAmountSubunits);
          const isFullAmount = diff <= 100;
          const isVerificationTrace = actualAmount === 100 || actualAmount === 1e4 || actualAmount === 1e3 || actualAmount === 1500;
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
      const now = /* @__PURE__ */ new Date();
      const trialEnd = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1e3);
      const subscriptionEnd = new Date(trialEnd.getTime() + (planId === "monthly" ? 30 : 180) * 24 * 60 * 60 * 1e3);
      const trial_start_date = now.toISOString();
      const trial_end_date = trialEnd.toISOString();
      const billingItem = {
        id: `bill_${Date.now()}_${Math.floor(Math.random() * 1e3)}`,
        date: now.toISOString(),
        amount: 0,
        // 0.0 during 7-day free trial
        currency,
        planName: planId === "monthly" ? `${targetPlan.name} (7-Day Trial Started)` : `${targetPlan.name} (7-Day Trial Started)`,
        status: "paid",
        reference
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
        trial_start_date,
        trial_end_date,
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
  } catch (err) {
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
    const symStr = (symptoms || []).join(", ");
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
        responseModalities: [import_genai.Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: "Zephyr" }
          }
        }
      }
    });
    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    res.json({ base64Audio: base64Audio || null });
  } catch (error) {
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
    const ideas = response.split("\n").filter((s) => s.trim().length > 5).slice(0, 5) || [];
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
    const mission = response.split("\n").filter((s) => s.trim().length > 5).slice(0, 5) || [];
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
    const ideas = response.split("\n").filter((s) => s.trim().length > 5).slice(0, 3) || [];
    res.json({ ideas, items: ideas });
  } catch (error) {
    const fallback = ["Just thinking about you and how amazing you are. \u2728", "I'm here for whatever you need today, my love.", "You're doing so much, don't forget how much you're appreciated."];
    res.json({ ideas: fallback, items: fallback });
  }
});
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await (0, import_vite.createServer)({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = import_path.default.join(process.cwd(), "dist");
    app.use(import_express.default.static(distPath));
    app.get("*all", (req, res) => {
      res.sendFile(import_path.default.join(distPath, "index.html"));
    });
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}
startServer();
//# sourceMappingURL=server.cjs.map
