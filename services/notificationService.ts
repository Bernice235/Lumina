import { User, NotificationSettings } from '../types';
import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { PushNotifications } from '@capacitor/push-notifications';

export interface CyclePredictions {
  nextPeriod: string;
  ovulation: string;
  fertileStart: string;
  fertileEnd: string;
}

export interface PregnancyStats {
  weeks: number;
  weeksLeft: number;
  dueDate: string;
}

export function getDefaultNotificationSettings(): NotificationSettings {
  return {
    enabled: true,
    toneStyle: 'supportive',
    reminderDaysBefore: 3,
    quietHours: {
      enabled: false,
      startTime: '22:00',
      endTime: '08:00',
    },
    types: {
      periodStarting: true,
      periodStarted: true,
      periodEnding: true,
      ovulation: true,
      fertileWindow: true,
      lutealPhase: true,
      pregnancyRisk: true,
    },
    partnerNotificationsEnabled: false,
    partnerReceiveTypes: {
      periodStarting: true,
      periodStarted: true,
      periodEnding: true,
      ovulation: true,
      fertileWindow: true,
      pregnancyRisk: true,
    },
    pregnancyEnabled: true,
    partnerPregnancyEnabled: false,
    pregnancyReminderTime: '09:00',
    pregnancyTypes: {
      welcome: true,
      weeklyBabyDev: true,
      babySizeUpdate: true,
      appointment: true,
      medicationVitamin: true,
      hydration: true,
      rest: true,
      kickCounter: true,
      symptomCheck: true,
      dueDateCountdown: true,
      laborNear: true,
      encouragement: true,
      hospitalBag: true,
      contractionTimer: true,
      breastfeedingPrep: true,
      birthPlan: true,
      postpartumPrep: true,
    },
    partnerPregnancyReceiveTypes: {
      welcome: true,
      weeklyBabyDev: true,
      appointment: true,
      rest: true,
      symptomSupport: true,
      dueDateCountdown: true,
      laborNear: true,
      encouragement: true,
    },
  };
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) {
    const today = new Date();
    today.setDate(today.getDate() + days);
    return today.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }
  d.setDate(d.getDate() + days);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function getCyclePredictions(user: User | null): CyclePredictions {
  const start = user?.lastPeriodStart || new Date().toISOString().split('T')[0];
  const cycle = user?.cycleLength || 28;
  const ovulationDay = cycle - 14;

  const nextPeriodDate = addDays(start, cycle);
  const ovulationDate = addDays(start, ovulationDay);
  const fertileStartDate = addDays(start, ovulationDay - 5);
  const fertileEndDate = addDays(start, ovulationDay + 1);

  return {
    nextPeriod: nextPeriodDate,
    ovulation: ovulationDate,
    fertileStart: fertileStartDate,
    fertileEnd: fertileEndDate,
  };
}

export function getPregnancyStats(user: User | null): PregnancyStats {
  const startDateStr = user?.pregnancyStartDate || new Date(Date.now() - 84 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const startDate = new Date(startDateStr);
  const today = new Date();
  
  const diffTime = Math.abs(today.getTime() - startDate.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  let weeks = Math.min(40, Math.floor(diffDays / 7) + 1);
  if (weeks < 1) weeks = 1;
  const weeksLeft = Math.max(0, 40 - weeks);
  
  const dueDateObj = new Date(startDate.getTime());
  dueDateObj.setDate(dueDateObj.getDate() + 280);
  const dueDateStr = dueDateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  
  return {
    weeks,
    weeksLeft,
    dueDate: dueDateStr
  };
}

export function getBabySize(weeks: number): string {
  if (weeks <= 4) return "Sesame Seed 📍";
  if (weeks <= 8) return "Sweet Raspberry 🍓";
  if (weeks <= 12) return "Bright Plum 🍒";
  if (weeks <= 16) return "Zesty Lemon 🍋";
  if (weeks <= 20) return "Sweet Peach 🍑";
  if (weeks <= 24) return "Golden Mango 🥭";
  if (weeks <= 28) return "Ripe Eggplant 🍆";
  if (weeks <= 32) return "Creamy Avocado 🥑";
  if (weeks <= 36) return "Safe Coconut 🥥";
  return "Sweet Watermelon 🍉";
}

export interface ScheduledNotificationItem {
  id: string;
  type: string;
  title: string;
  body: string;
  date: string;
  emoji: string;
  isPartner: boolean;
  category: 'cycle' | 'mood' | 'symptom' | 'wellness' | 'medication' | 'partner' | 'pregnancy';
}

export function calculateScheduledNotifications(user: any, settings: any): ScheduledNotificationItem[] {
  if (!user) return [];
  const activeSettings = settings || user.notificationSettings || getDefaultNotificationSettings();
  if (!activeSettings.enabled && !activeSettings.partnerNotificationsEnabled) return [];

  const items: ScheduledNotificationItem[] = [];
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];

  const tone = activeSettings.toneStyle || 'supportive';
  const isPartner = !!user.isPartner;

  if (user.isPregnancyMode) {
    // Pregnancy Notifications
    if (activeSettings.pregnancyEnabled || activeSettings.partnerPregnancyEnabled) {
      const pStats = getPregnancyStats(user);
      const babySize = getBabySize(pStats.weeks);

      // Weekly Development
      if (activeSettings.pregnancyTypes?.weeklyBabyDev ?? true) {
        items.push({
          id: `preg_dev_${pStats.weeks}`,
          type: 'weeklyBabyDev',
          title: isPartner ? 'Supporting Her Bloom 💕' : `Week ${pStats.weeks} Baby Growth 👶`,
          body: generatePregnancyNotificationText(isPartner ? 'weeklyBabyUpdate' : 'weeklyBabyDev', tone, isPartner, { week: pStats.weeks }),
          date: todayStr,
          emoji: '👶',
          isPartner,
          category: 'pregnancy'
        });
      }

      // Baby Size Update
      if (activeSettings.pregnancyTypes?.babySizeUpdate ?? true) {
        items.push({
          id: `preg_size_${pStats.weeks}`,
          type: 'babySizeUpdate',
          title: 'Baby Size Milestone 🥭',
          body: generatePregnancyNotificationText('babySizeUpdate', tone, false, { size: babySize }),
          date: todayStr,
          emoji: '🥭',
          isPartner: false,
          category: 'pregnancy'
        });
      }

      // Hydration
      if (activeSettings.pregnancyTypes?.hydration ?? true) {
        items.push({
          id: `preg_hyd_${todayStr}`,
          type: 'hydration',
          title: 'Gentle Hydration 💧',
          body: generatePregnancyNotificationText('hydration', tone, false),
          date: todayStr,
          emoji: '💧',
          isPartner: false,
          category: 'wellness'
        });
      }

      // Prenatal Vitamin
      if (activeSettings.pregnancyTypes?.medicationVitamin ?? true) {
        items.push({
          id: `preg_vit_${todayStr}`,
          type: 'medicationVitamin',
          title: 'Prenatal Vitamin Reminder 💊',
          body: generatePregnancyNotificationText('medicationVitamin', tone, false),
          date: todayStr,
          emoji: '💊',
          isPartner: false,
          category: 'medication'
        });
      }

      // Rest / Gentle Care
      if (activeSettings.pregnancyTypes?.rest ?? true) {
        items.push({
          id: `preg_rest_${todayStr}`,
          type: 'rest',
          title: isPartner ? 'Supporting Her Rest 🌙' : 'Sanctuary Rest Check 🌙',
          body: generatePregnancyNotificationText('rest', tone, isPartner),
          date: todayStr,
          emoji: '🌙',
          isPartner,
          category: 'pregnancy'
        });
      }

      // Due Date Countdown
      if (activeSettings.pregnancyTypes?.dueDateCountdown ?? true) {
        items.push({
          id: `preg_due_${pStats.weeksLeft}`,
          type: 'dueDateCountdown',
          title: isPartner ? 'Partner Arrival Countdown 🎀' : 'Due Date Milestone 🎀',
          body: generatePregnancyNotificationText('dueDateCountdown', tone, isPartner, { weeksLeft: pStats.weeksLeft }),
          date: todayStr,
          emoji: '🎀',
          isPartner,
          category: 'pregnancy'
        });
      }
    }
  } else {
    // Standard Cycle Notifications
    const predictions = getCyclePredictions(user);

    // 1. Period Starting
    if (activeSettings.types?.periodStarting ?? true) {
      items.push({
        id: `period_start_${predictions.nextPeriod}`,
        type: 'periodStarting',
        title: isPartner ? 'Her Cycle Approaching 🌸' : 'Period Starting Soon 🌸',
        body: generateNotificationText('periodStarting', tone, isPartner, { date: predictions.nextPeriod }),
        date: predictions.nextPeriod,
        emoji: '🌸',
        isPartner,
        category: 'cycle'
      });
    }

    // 2. Period Ending
    if (activeSettings.types?.periodEnding ?? true) {
      items.push({
        id: `period_end_${user.lastPeriodStart}`,
        type: 'periodEnding',
        title: isPartner ? 'Sanctuary Renewal 🌷' : 'Cycle Cleansing Done ✨',
        body: generateNotificationText('periodEnding', tone, isPartner),
        date: todayStr,
        emoji: '🌷',
        isPartner,
        category: 'cycle'
      });
    }

    // 3. Ovulation
    if (activeSettings.types?.ovulation ?? true) {
      items.push({
        id: `ovulation_${predictions.ovulation}`,
        type: 'ovulation',
        title: isPartner ? 'Her Ovulation Season 🌸' : 'Celestial Ovulation ✨',
        body: generateNotificationText('ovulation', tone, isPartner, { date: predictions.ovulation }),
        date: predictions.ovulation,
        emoji: '💖',
        isPartner,
        category: 'cycle'
      });
    }

    // 4. Fertile Window
    if (activeSettings.types?.fertileWindow ?? true) {
      items.push({
        id: `fertile_${predictions.fertileStart}`,
        type: 'fertileWindow',
        title: isPartner ? 'Abundant Bloom Phase 💞' : 'Abundant Peak Bloom 💞',
        body: generateNotificationText('fertileWindow', tone, isPartner, { startDate: predictions.fertileStart, endDate: predictions.fertileEnd }),
        date: predictions.fertileStart,
        emoji: '💞',
        isPartner,
        category: 'cycle'
      });
    }

    // 5. Luteal Phase
    if (activeSettings.types?.lutealPhase ?? true) {
      items.push({
        id: `luteal_${todayStr}`,
        type: 'lutealPhase',
        title: 'Quiet Sunset Inward 🌙',
        body: generateNotificationText('lutealPhase', tone, isPartner),
        date: todayStr,
        emoji: '🌙',
        isPartner,
        category: 'cycle'
      });
    }

    // 6. Medication / Birth Control Reminders
    if (user.birthControlConfig?.enabled) {
      items.push({
        id: `bc_reminder_${todayStr}`,
        type: 'medication',
        title: 'Medication & Supplement Reminder 💊',
        body: `Time for your scheduled ${user.birthControlConfig.method || 'medication'} intake (${user.birthControlConfig.reminderTime || '09:00'}). Stay consistent & hydrated! 🌸`,
        date: todayStr,
        emoji: '💊',
        isPartner: false,
        category: 'medication'
      });
    }

    // 7. Water & Hydration Reminder
    if (activeSettings.types?.hydration ?? true) {
      items.push({
        id: `water_reminder_${todayStr}`,
        type: 'hydration',
        title: 'Hydration & Water Reminder 💧',
        body: `Drink up! Reach your daily target of ${user.waterGoal || 8} glasses of water today for optimal cycle vitality and self-care. 💧`,
        date: todayStr,
        emoji: '💧',
        isPartner: false,
        category: 'wellness'
      });
    }

    // 8. Low Energy / Mood Updates
    const latestMood = user.moodLogs?.[user.moodLogs.length - 1];
    if (latestMood && (latestMood.mood === 'tired' || latestMood.mood === 'sad' || latestMood.mood === 'anxious' || latestMood.mood === 'irritable')) {
      items.push({
        id: `mood_care_${latestMood.id || todayStr}`,
        type: 'moodCare',
        title: isPartner ? 'Partner Low Energy Alert 🧸' : 'Gentle Self-Care Pause 🧸',
        body: isPartner 
          ? `Your partner recently logged feeling ${latestMood.mood}. Offer a warm hug, heating pad, or a cup of warm tea! 💗`
          : `You noted feeling ${latestMood.mood} today. Give yourself permission to rest and recharge in sanctuary. 💆‍♀️`,
        date: todayStr,
        emoji: '🧸',
        isPartner,
        category: 'mood'
      });
    }

    // 8. Symptom Updates
    const recentSymptoms = user.symptoms || [];
    if (recentSymptoms.length > 0) {
      items.push({
        id: `symptom_care_${todayStr}`,
        type: 'symptomCare',
        title: isPartner ? 'Partner Symptom Update 🌸' : 'Sanctuary Symptom Care 🌸',
        body: isPartner
          ? `Your partner recently logged symptoms (${recentSymptoms.slice(0, 2).map((s: any) => s.name || s.type).join(', ')}). A gentle check-in means the world. 💖`
          : `Remember to stay hydrated and rest for your reported symptoms (${recentSymptoms.slice(0, 2).map((s: any) => s.name || s.type).join(', ')}). 🍵`,
        date: todayStr,
        emoji: '🍵',
        isPartner,
        category: 'symptom'
      });
    }

    // 9. Support Reminders & Wellness Updates
    items.push({
      id: `wellness_tip_${todayStr}`,
      type: 'wellness',
      title: 'Daily Wellness Affirmation 🌿',
      body: 'Take a deep, belly breath. Your body is navigating its natural rhythm with wisdom and grace. 🌸',
      date: todayStr,
      emoji: '🌿',
      isPartner: false,
      category: 'wellness'
    });
  }

  return items;
}

export function generateNotificationText(
  type: string,
  tone: string,
  isPartner: boolean,
  data?: any
): string {
  if (isPartner) {
    switch (type) {
      case 'periodStarting':
        if (tone === 'playful') return `Flow-alert inbound! 🤫 She might need sweet comfort food soon. Keep the chocolate vault unlocked!`;
        if (tone === 'affirming') return `Her cleansing cycle approaches. Prepare a peaceful sanctuary of understanding and active listening.`;
        if (tone === 'aesthetic') return `A gentle turn of her season. Help her prepare the nest for a comforting rest. 🩰`;
        return `Hey, her period is expected around ${data?.date || 'soon'}. A perfect time to stock up on cozy snacks and comfort tea. 🌸`;

      case 'periodStarted':
        if (tone === 'playful') return `Red alert! 🔴 Activate ultimate partner mode. Deliver favorite cravings and movie options static!`;
        if (tone === 'affirming') return `Her body begins its release. Ground her with stabilizing support, calm, and loving presence.`;
        if (tone === 'aesthetic') return `The winter rain has arrived. Offer the comforting shelter of your warm embrace. 🌷`;
        return `She started her period today 💗. Heat up the thermal pad, help out with chores, and give extra gentle hugs.`;

      case 'periodEnding':
        if (tone === 'playful') return `The fog is lifting! ☀️ Time to celebrate her return of light and cheerful strength.`;
        if (tone === 'affirming') return `Her renewal is complete. Share in the joyful return of active, vibrant spring energy.`;
        if (tone === 'aesthetic') return `The sunlight breaks through. Walk beside her as she steps into the warmth of early spring. 🩰`;
        return `Her period is ending! 🌷 New energy and renewal are blooming. Suggest a nice walk or date night!`;

      case 'ovulation':
        if (tone === 'playful') return `High power vibes! ⚡ She's ovulating soon. Bring your brightest smile and cute energy!`;
        if (tone === 'affirming') return `Celebrate the creative peak of her biological cycle. Match her radiance and joy.`;
        if (tone === 'aesthetic') return `Under her celestial peak, may your hearts align in full, beautiful alignment. 💖`;
        return `She is ovulating on ${data?.date || 'soon'} 💖. Her energy and mood are beautifully high. Enjoy this bright phase together!`;

      case 'fertileWindow':
        if (tone === 'playful') return `Fertility window is open wide! 🚪 Sparkles, deep connections, and romantic plans await!`;
        if (tone === 'affirming') return `The window of abundance opens. Walk with mindful awareness and shared wisdom.`;
        if (tone === 'aesthetic') return `Springtime fertile bloom is here. Nurture the delicate garden of your connection. 🌹`;
        return `Her fertile window is predicted from ${data?.startDate || 'now'} to ${data?.endDate || 'soon'}. Be in sync with your shared intentions! 💕`;

      case 'lutealPhase':
        if (tone === 'playful') return `Moody-tude might pop up! 🤫 Be her absolute safe haven and dodge any arguments with sweet treats.`;
        if (tone === 'affirming') return `Her season shifts inward. Meet her with space, gentle reassurance, and a comforting sanctuary.`;
        if (tone === 'aesthetic') return `The evening cold returns. Wrap her in the warm cashmere of your caring, silent devotion. 🍁`;
        return `She's in her luteal phase now. Encourage her to rest, listen patiently, and handle extra chores. 🧸`;

      case 'pregnancyRiskLow':
        if (tone === 'playful') return `Low risk category for she. Enjoy your companion peace! 😉`;
        if (tone === 'affirming') return `A quiet stage in the biological journey. Experience the comfort of gentle stability.`;
        if (tone === 'aesthetic') return `A quiet harbor under the silver moon. Sail in peaceful safety together. 🐚`;
        return `Discreet reminder: her cycle predicts a low fertility/risk category today. Enjoy your peaceful comfort. 🩺`;

      case 'pregnancyRiskHigh':
      default:
        if (tone === 'playful') return `Caution, fertile risk is high! Protect your plans beautifully today! 💗`;
        if (tone === 'affirming') return `The abundance of life-force peaks. Respect this energy with deliberate alignment and care.`;
        if (tone === 'aesthetic') return `The wild tide rises. Guide your ship with mutual understanding and bright wisdom. 🌌`;
        return `Important sync: peak fertile risk is predicted high today. Coordinate your plans with deliberate care. 🩺`;
    }
  } else {
    switch (type) {
      case 'periodStarting':
        if (tone === 'playful') return `Psst... 🤫 your flow-cycle is preparing to land on ${data?.date || 'soon'}. Stock up on your favorite chocolates! 🍫`;
        if (tone === 'affirming') return `Your body's natural state is approaching its cleansing phase on ${data?.date || 'soon'}. Honor this timing. 🌾`;
        if (tone === 'aesthetic') return `The tide turns. Your monthly winter begins soon around ${data?.date || 'soon'}. Step softly into the sanctuary of rest. 🩰`;
        return `Hey girl 💗 your period is expected to start on ${data?.date || 'soon'}. Be prepared, you got this 🌸`;

      case 'periodStarted':
        if (tone === 'playful') return `Flow has entered the chat! 🔴 Time to activate self-care mode and cue the comfy sweatpants! ✨`;
        if (tone === 'affirming') return `Honor this day 🌾. Your body is releasing, cleansing, and returning to its natural center.`;
        if (tone === 'aesthetic') return `A soft shade of winter begins. Let the quiet hours of reflection wash over your spirit. 🩰`;
        return `Hey babe, flow is here! Be extra gentle with yourself today. Grab a heating pad and stay cozy. 🌸`;

      case 'periodEnding':
        if (tone === 'playful') return `The storm has cleared! ☀️ Time to conquer the world and enjoy that post-period glowing skin!`;
        if (tone === 'affirming') return `A new season of renewal rises. Celebrate the strength and resilience of your physical sanctuary.`;
        if (tone === 'aesthetic') return `Spring returns 🩰. The winter frost melts, inviting you to dance in the returning sunlight.`;
        return `Hooray, period is wrapping up! 🌷 Feel that fresh energy returning? You did amazing this week!`;

      case 'ovulation':
        if (tone === 'playful') return `Ovulation time! 🎉 High energy, glow-up vibes, and cute ideas ahead!`;
        if (tone === 'affirming') return `The creative peak of your seasonal bloom occurs on ${data?.date || 'soon'}. Embrace your inner radiance.`;
        if (tone === 'aesthetic') return `The celestial peak of your cycle blooms beautifully today. May warmth guide your steps. 💖`;
        return `Peak fertility predictions on ${data?.date || 'soon'}! 💖 Listen to your body's beautiful energy and light.`;

      case 'fertileWindow':
        if (tone === 'playful') return `Vibe-check: peak fertile window is officially open! Sparkles and magic all around! ✨`;
        if (tone === 'affirming') return `Your biological peak creation window opens. Honor the sacred fertility of your physical temple.`;
        if (tone === 'aesthetic') return `The sweet fragrance of spring fertile blossom fills the air. Flow with the divine rhythm. 🩰`;
        return `Your fertile window is active from ${data?.startDate || 'now'} to ${data?.endDate || 'soon'}. Stay aligned with your plans! 🌸`;

      case 'lutealPhase':
        if (tone === 'playful') return `Entering the inward-facing season. Cravings might knock, say yes to cozy naps! 🍕💤`;
        if (tone === 'affirming') return `Your body turns inward. Respect the slowing pace and find stillness in quiet sanctuary.`;
        if (tone === 'aesthetic') return `The late autumn sun sets. Retreat into your quiet cottage of rest and whisper sweet peace. 🍁`;
        return `Transitioning into your luteal phase. Time to slow down, cozy up, and let go of external weights. 🧸`;

      case 'pregnancyRiskLow':
        if (tone === 'playful') return `Low risk zone! Keep track of your logs to watch predicted shifts! 📊`;
        if (tone === 'affirming') return `Embrace the peaceful quietude of low fertility cycles. Rest and celebrate stability.`;
        if (tone === 'aesthetic') return `A serene tide of calm. The waters are still, reflecting the quiet stars above. 🐚`;
        return `Just a friendly note: your statistical pregnancy risk is quite low right now. Keep staying mindful! 🌸`;

      case 'pregnancyRiskHigh':
      default:
        if (tone === 'playful') return `Risk-o-meter is high! Make informed, protective decisions, cute friend! 😉`;
        if (tone === 'affirming') return `In this highly creative phase, act with full alignment and wisdom for your path.`;
        if (tone === 'aesthetic') return `The creative current flows strongly tonight. Journey with deliberate, beautiful steps. 🌌`;
        return `Heads up! Statistical pregnancy risk is higher today. Direct your choices toward your loving intentions! 💕`;
    }
  }
}

export function generatePostpartumNotificationText(
  type: string,
  isPartner: boolean
): string {
  if (isPartner) {
    switch (type) {
      case 'recovery':
        return `She is in recovery 💗 be patient and supportive`;
      case 'rest':
        return `She may need help resting today 💕`;
      case 'wellbeing':
        return `Check in on her emotional wellbeing 🌸`;
      case 'support':
      default:
        return `She may provide hydration, food, or rest support today 💗`;
    }
  } else {
    switch (type) {
      case 'feeling':
        return `Hey mama 💕 how are you feeling today?`;
      case 'hydration':
        return `Did you drink water today? 💧`;
      case 'stretch':
        return `Time for a little stretch mama 🧘`;
      case 'rest':
        return `Have you rested today? 🌙`;
      case 'checkup':
      default:
        return `Don’t forget your checkup this week 🩺`;
    }
  }
}

export function generatePregnancyNotificationText(
  type: string,
  tone: string,
  isPartner: boolean,
  data?: any
): string {
  if (isPartner) {
    switch (type) {
      case 'welcome':
        if (tone === 'playful') return `💡 “Congrats dad/co-parent! 🎉 She is taking a beautiful pregnancy mode journey. Prep your superhero cape!”`;
        if (tone === 'affirming') return `💡 “Witness this sacred chapter. Her body prepares to nurture new life, and your presence is her foundation.”`;
        if (tone === 'aesthetic') return `💡 “A whisper of stars. She walks the path of motherhood; support her steps with quiet care. 🩰”`;
        return `She’s pregnant 💗 this is a beautiful journey. Be there for her 🌸`;

      case 'weeklyBabyUpdate':
        if (tone === 'playful') return `📊 “Weekly update! Your baby is starting Week ${data?.week || 12}. Little sprout is scaling up speed!”`;
        if (tone === 'affirming') return `📊 “Week ${data?.week || 12}. A miraculous growth unfolds in the quiet dark. Appreciate this mystery.”`;
        if (tone === 'aesthetic') return `📊 “The delicate hands of time shape Week ${data?.week || 12}. A small leaf unfurls gently. 🩰”`;
        return `Baby is now ${data?.week || 12} weeks along 👶 exciting changes this week 💕`;

      case 'appointment':
        if (tone === 'playful') return `🩺 “Clinic visit tomorrow! Hold her hand, ask questions, and take notes! 📝”`;
        if (tone === 'affirming') return `🩺 “Accompany her to the sacred checks of wellness tomorrow. Protect her temple.”`;
        if (tone === 'aesthetic') return `🩺 “Standing by her side under the gentle clinical light. Walk with her in loving synchrony.”`;
        return `She has a prenatal appointment on ${data?.date || 'soon'} 🩺 maybe check in on her 💗`;

      case 'rest':
        if (tone === 'playful') return `🌙 “Time-out alert! Go make her a comfy sanctuary and steal her away for a nap! 🛋️”`;
        if (tone === 'affirming') return `🌙 “Gently encourage her rest. Supporting her peace balances the currents of new life.”`;
        if (tone === 'aesthetic') return `🌙 “Step softly. Help her rest under the quiet twilight, cocooned in love. 👑”`;
        return `She may need extra rest today 🌙 support her if you can 💕`;

      case 'symptomSupport':
        if (tone === 'playful') return `💖 “Nausea or fatigue logged! Bring back those premium saltines and flat ginger ale! stat!”`;
        if (tone === 'affirming') return `💖 “Her physical vessel experiences shifts. Support her with patience, warmth, and a loving heart.”`;
        if (tone === 'aesthetic') return `💖 “A quiet response to her heavy hours. Prepare her the soothing elixir of ginger and mint. 🌿”`;
        return `She may be experiencing pregnancy symptoms today 💗 patience and support matter 🌸`;

      case 'dueDateCountdown':
        if (tone === 'playful') return `🎀 “Due date timer is ticking down! Only a few milestones left to tackle! 🎉”`;
        if (tone === 'affirming') return `🎀 “The arrival threshold grows nearer. Meditate on the beauty of this countdown together.”`;
        if (tone === 'aesthetic') return `🎀 “Each setting sun brings the little light closer to home. Walk softly towards the threshold.”`;
        return `Baby may arrive in ${data?.weeksLeft || 28} weeks 🎀 exciting times ahead 💕`;

      case 'laborNear':
        if (tone === 'playful') return `🍼 “Almost time! Double-check the gas tank, hospital bag, and download the countdown app!”`;
        if (tone === 'affirming') return `🍼 “The gates of delivery near. Be her absolute lock and key of peace and steady support.”`;
        if (tone === 'aesthetic') return `🍼 “The birth wind rises. Prepare the safe harbor where she will deliver her beautiful miracle.”`;
        return `She is getting close to delivery 💗 be prepared and supportive 🍼`;

      case 'encouragement':
      default:
        if (tone === 'playful') return `💖 “Love prompt! Send her a random cheesy text or surprise her with a floral bouquet!”`;
        if (tone === 'affirming') return `💖 “Acknowledge her physical and maternal strength. Voice your profound honor of her journey.”`;
        if (tone === 'aesthetic') return `💖 “Wrap her in soft prose. Leave a handwritten note of quiet, lovely adoration for her eyes.”`;
        {
          const texts = [
            `Check in on her today 💕 a little love goes a long way 🌸`,
            `She’s carrying your little one 💗 support means everything 🩷`
          ];
          const index = data?.index !== undefined ? data.index : (Math.floor(Math.random() * texts.length));
          return texts[index];
        }
    }
  } else {
    // For mother/user
    switch (type) {
      case 'welcome':
        if (tone === 'playful') return `“Congrats mama! 🎉 A little roommate is officially making their lease in your tummy! We're here for the cravings 🍕✨”`;
        if (tone === 'affirming') return `“We honor your body as it begins the sacred art of carrying life. You are grounded, capable, and surrounded by love. 🌾”`;
        if (tone === 'aesthetic') return `“The start of a poetry in motion... 🩰 Welcome to your serene pregnancy journey. Step softly into this light. 🌸”`;
        return `Hey mama 💗 welcome to your pregnancy journey. We’re here with you every step of the way 🌸`;

      case 'weeklyBabyDev':
        if (tone === 'playful') return `“Week ${data?.week || 12} update! Baby is doing acrobatics inside! Developing those adorable tiny details. 🤸‍♀️”`;
        if (tone === 'affirming') return `“Week ${data?.week || 12}. Honor the slow, magnificent building of organs and light within your vessel.”`;
        if (tone === 'aesthetic') return `“A soft whisper in the dark. Week ${data?.week || 12} brings delicate eyelashes and dream structures. 🩰”`;
        if (data?.week === 5) return `Hey mama 🌱 your baby is growing fast this week. Tiny but amazing already 💕`;
        if (data?.week === 12) return `Hey mama 💖 you’ve entered a new stage of pregnancy. Keep taking care of yourself 🌸`;
        if (data?.week === 24) return `Hey mama 👶 your baby is growing stronger every day. You’re doing amazing 💗`;
        if (data?.week === 39) return `Hey mama 🎉 baby could arrive soon. Get ready for the big moment 💕`;
        return `Hey mama 🌸 your baby is currently at Week ${data?.week || 12}. You are doing an amazing job, cherish this sweet phase! 💗`;

      case 'babySizeUpdate':
        if (tone === 'playful') return `“Size matching! Baby is currently the exact size of a adorable ${data?.size || 'little fruit'}! 🥭”`;
        if (tone === 'affirming') return `“Hold your hands to your center. Picture the precious size of a ${data?.size || 'little fruit'} blossoming within.”`;
        if (tone === 'aesthetic') return `“A sweet token in nature. Your growing miracle matches the delicate dimensions of a ${data?.size || 'little fruit'}. 🌸”`;
        return `Your baby is the size of a ${data?.rawSize || 'mango'} this week ${data?.sizeEmoji || '🥭'}💕`;

      case 'appointment':
        if (tone === 'playful') return `“Checkup clinic time! 🩺 Pack your journal to log those lovely pictures and flutters!”`;
        if (tone === 'affirming') return `“Prepare for your appointment with a serene heart, honoring the wellness of motherhood.”`;
        if (tone === 'aesthetic') return `“Step softly to your sanctuary visit. Ensure safety and warmth for your beautiful sprout.”`;
        return `Hey mama 🩺 you have a prenatal checkup coming on ${data?.date || '[date]'}. Don’t forget 💗`;

      case 'medicationVitamin':
        if (tone === 'playful') return `“Pop! 💊 Time for your prenatal vitamin buddy. Fuel the tiny sprout!”`;
        if (tone === 'affirming') return `“Nourish your sacred vessel. Sip water and take your prenatal vitamins with gratitude.”`;
        if (tone === 'aesthetic') return `“A morning dew drops ritual. Take your nutrients to support the blooming bud. 🌸”`;
        return `Hey mama 💊 time to take your prenatal vitamins and care for yourself 🌸`;

      case 'hydration':
        if (tone === 'playful') return `“Glug glug! 💧 Time to refill that gorgeous pastel water flask. Sip sip!”`;
        if (tone === 'affirming') return `“Purify your connection. Drink clean water to nurture the amniotic fluid sanctuary.”`;
        if (tone === 'aesthetic') return `“Sip the clear crystals of winter ice. Hydrate the root of your growing sprout. 🐚”`;
        return `Hey mama 💧 drink some water, your body needs it too 💖`;

      case 'rest':
        if (tone === 'playful') return `“Nap-time coordinates locked! 🛌 Get horizontal and take a cozy 20-minute snooze!”`;
        if (tone === 'affirming') return `“Listen to your heavy eyelids. Rest is active building. Put your feet up and breathe.”`;
        if (tone === 'aesthetic') return `“The tea is warm, the blanket soft. Rest in the quiet hollow of the afternoon. 🩰”`;
        return `Hey mama 🌙 your body is working hard. Take some time to rest 💗`;

      case 'kickCounter':
        if (tone === 'playful') return `“Flutter tap check! 👣 Baby is sending you secret signals! Log those active kicks!”`;
        if (tone === 'affirming') return `“Feel the light taps of connection. Your baby is communicating their vibrant presence.”`;
        if (tone === 'aesthetic') return `“Tiny movements resemble the brush of butterfly wings. Sit quietly and feel the dance.”`;
        return `Hey mama 👣 don’t forget to monitor baby kicks today 💕`;

      case 'symptomCheck':
        if (tone === 'playful') return `“Log the shifts! 📝 How are nausea and fatigue holding up? Update your cute buddy!”`;
        if (tone === 'affirming') return `“Honor the variations of your physical state today. Log and adjust with deep self-care.”`;
        if (tone === 'aesthetic') return `“Keep notes of the seasonal shifts in your sanctuary. Step gently through changes. 🩰”`;
        return `Hey mama 🌸 how are you feeling today? Log your symptoms so we can keep track 💗`;

      case 'dueDateCountdown':
        if (tone === 'playful') return `“Countdown mode: only ${data?.weeksLeft || 28} weeks left until baby’s main stage debut!”`;
        if (tone === 'affirming') return `“Just ${data?.weeksLeft || 28} weeks left in this temporary container of love. Prepare your spirit.”`;
        if (tone === 'aesthetic') return `“${data?.weeksLeft || 28} moons left to wait. Watch the calendar lights grow soft. 🎀”`;
        return `Hey mama 🎀 only ${data?.weeksLeft || 28} weeks left until baby arrives 💕`;

      case 'laborNear':
        if (tone === 'playful') return `“Delivery bags packed? 👜 We're reaching the exciting finale! Keep calm and carry on!”`;
        if (tone === 'affirming') return `“The body knows exactly how to open. Prepare to step onto the path of birth strength.”`;
        if (tone === 'aesthetic') return `“The final notes of the lullaby approach. Prep your linens and nesting details. 🍼”`;
        return `Hey mama 💗 you’re getting close to delivery. Make sure your hospital bag is ready 🍼`;

      case 'hospitalBag':
        if (tone === 'playful') return `“Let's check details! 👜 Packing comfortable socks, dry lips balm, and baby’s first onesie!”`;
        if (tone === 'affirming') return `“Gracefully pack your birth accessories. Prepare a warm, welcoming suitcase for the birth sanctuary.”`;
        if (tone === 'aesthetic') return `“Gather ivory woolens and calming lavender oil. Nest your travel bag with gentle intent. 👜”`;
        return `Hey mama 👜 time to double check your hospital bag list and make sure everything is packed and ready 💗`;

      case 'contractionTimer':
        if (tone === 'playful') return `“Stopwatch time! ⏱️ Tracking the intervals of your cozy labor surges with ease!”`;
        if (tone === 'affirming') return `“Empower each contraction surge. Time them to observe the steady rhythm of arrival.”`;
        if (tone === 'aesthetic') return `“Measure the deep waves of birth tides as they roll to shore. Trust the design. ⏱️”`;
        return `Hey mama ⏱️ if you are feeling labor surges, remember you can track them in our contraction timer 🌸`;

      case 'breastfeedingPrep':
        if (tone === 'playful') return `“Lactation check! 🍼 Gather guidance on comfortable positions, cozy pillow supports, and shield aids!”`;
        if (tone === 'affirming') return `“Prepare to offer early liquid gold. Nurture your soul with peaceful hydration beforehand.”`;
        if (tone === 'aesthetic') return `“The softest touch. Learn the classic hold techniques as baby rests sweet against your chest. 🍼”`;
        return `Hey mama 🍼 check out our breastfeeding prep guide to feel confident and ready to feed your little one 💕`;

      case 'birthPlan':
        if (tone === 'playful') return `“Customizing delivery room playlists and aromatherapy! Make it a cozy party! 📝”`;
        if (tone === 'affirming') return `“Write down your birth desires. Center your wishes around gentle breathing and respect.”`;
        if (tone === 'aesthetic') return `“Draft a delicate outline mapping soft music, soft lighting, and gentle hands. 🩰”`;
        return `Hey mama 📝 let's finalize your positive birth plan wishlist so your preferences are honored 🌷`;

      case 'postpartumPrep':
        if (tone === 'playful') return `“Prep the healing kit! 🌿 Cozy linen pads, soothing witch hazel wipes, and endless sweatpants!”`;
        if (tone === 'affirming') return `“Prepare for the fourth trimester sanctuary. The period of healing needs ultimate slow rest.”`;
        if (tone === 'aesthetic') return `“Plan your nesting station with dry lavender sachets, herbal balms, and warm linens. 🌿”`;
        return `Hey mama 🌿 preparing for the fourth trimester counts! Take a look at our postpartum healing checklists 🌸`;

      case 'encouragement':
      default:
        if (tone === 'playful') return `“You are a total goddess! 💖 Carrying life looks absolute gold on you! Keep shining!”`;
        if (tone === 'affirming') return `“Every breath you breathe feeds the little soul. You are perfect, powerful, and deeply loved.”`;
        if (tone === 'aesthetic') return `“A soft canvas of grace. May peace rest in your heart as you carry this gentle seed. 💖”`;
        {
          const texts = [
            `Hey mama 🌷 you are doing an amazing job. One day at a time 💖`,
            `Hey mama 💕 your body is creating life. Be proud of yourself 🌸`
          ];
          const index = data?.index !== undefined ? data.index : (Math.floor(Math.random() * texts.length));
          return texts[index];
        }
    }
  }
}

// --- NATIVE MOBILE PUSH & LOCAL NOTIFICATION INTEGRATION (CAPACITOR) ---

export const registerNativePush = async (): Promise<boolean> => {
  if (!Capacitor.isNativePlatform()) {
    console.log('Push notification registration is only available on native Android/iOS devices.');
    return false;
  }
  try {
    let perm = await PushNotifications.checkPermissions();
    if (perm.receive !== 'granted') {
      perm = await PushNotifications.requestPermissions();
    }
    if (perm.receive === 'granted') {
      await PushNotifications.register();
      return true;
    }
    return false;
  } catch (err) {
    console.error('Failed to register native push notifications:', err);
    return false;
  }
};

export const scheduleNativeLocalNotification = async (
  id: number,
  title: string,
  body: string,
  triggerAt: Date
): Promise<boolean> => {
  if (!Capacitor.isNativePlatform()) {
    console.log('Local notification scheduling is only available on native Android/iOS devices.');
    return false;
  }
  try {
    let perm = await LocalNotifications.checkPermissions();
    if (perm.display !== 'granted') {
      perm = await LocalNotifications.requestPermissions();
    }
    if (perm.display === 'granted') {
      // Clear previous matching notification
      try {
        await LocalNotifications.cancel({ notifications: [{ id }] });
      } catch (e) {
        // Safe to ignore if not exists
      }
      await LocalNotifications.schedule({
        notifications: [
          {
            id,
            title,
            body,
            schedule: { at: triggerAt },
            sound: 'beep.wav',
            smallIcon: 'ic_stat_icon_config_sample',
            actionTypeId: 'OPEN_LUMINA'
          }
        ]
      });
      return true;
    }
    return false;
  } catch (err) {
    console.error('Failed to schedule native local notification:', err);
    return false;
  }
};

export const clearAllNativeLocalNotifications = async (): Promise<void> => {
  if (!Capacitor.isNativePlatform()) return;
  try {
    const pending = await LocalNotifications.getPending();
    if (pending.notifications.length > 0) {
      await LocalNotifications.cancel({ notifications: pending.notifications });
    }
  } catch (err) {
    console.error('Failed to clear local notifications:', err);
  }
};
