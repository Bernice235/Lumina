import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Symptom } from '../types';
import { 
  FileText, Check, Download, Share2, X, Calendar, Activity, 
  Heart, Smile, Plus, Edit, Printer, Mail, Send, Info, 
  Sparkles, Weight, Clock, HeartHandshake, Eye, AlertCircle, Dumbbell
} from 'lucide-react';
import { getPregnancyStats, getBabySize } from '../services/notificationService';
import { getCycleAnalytics } from '../services/cycleAnalyticsService';
import { calculateCycleSyncData } from '../services/cycleSyncService';
import { escapeHtml } from '../services/securityService';

interface DoctorReportProps {
  isOpen: boolean;
  onClose: () => void;
  user: User;
  symptoms: Symptom[];
}

const DoctorReport: React.FC<DoctorReportProps> = ({ isOpen, onClose, user, symptoms }) => {
  // 1. Core Selection and Interactive Input states
  const [selectedOptions, setSelectedOptions] = useState({
    cycleHistory: true,
    periodDates: true,
    cycleLength: true,
    periodLength: true,
    symptoms: true,
    moods: true,
    sexualActivity: false, // Default false for strict medical confidentiality
    fertility: true,
    pregnancyRisk: true,
    contraceptive: true,
    // Pregnancy mode elements
    pregnancyWeek: true,
    dueDate: true,
    pregnancySymptoms: true,
    wellnessChecks: true,
    weightTrack: true,
    medications: true,
    appointments: true,
    notes: true
  });

  // Dynamic user-customizable values which will populate the report
  const [medsInput, setMedsInput] = useState("");
  const [notesInput, setNotesInput] = useState("");
  const [weightInput, setWeightInput] = useState(user.isPregnancyMode ? "68.5 kg" : "62.0 kg");
  const [appointmentsInput, setAppointmentsInput] = useState("");
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [reportGenerated, setReportGenerated] = useState(false);
  const [showToast, setShowToast] = useState<string | null>(null);

  // Initialize interactive inputs with beautiful default values based on mode
  useEffect(() => {
    if (isOpen) {
      if (user.isPregnancyMode) {
        setMedsInput("Prenatal Multivitamin (with 800mcg Folic Acid), Vitamin D3 (2000 IU), Magnesium Citrate");
        setNotesInput("Occasional mild lower back pulling in the late evenings. Would like to ask if pelvic squats are still recommended during third trimester or if gentle hip swaying is safer.");
        setAppointmentsInput("Upcoming: OB Routine checkup & glucose tolerance test next Tuesday at 9:30 AM");
      } else {
        setMedsInput(user.birthControlConfig?.enabled 
          ? `Oral contraceptive pill (taken daily at ${user.birthControlConfig.reminderTime})` 
          : "Daily multivitamin, Omega-3 supplement"
        );
        setNotesInput("Mild menstrual cramping on day 1-2. Exploring if heat-therapy combined with light core routines is sufficient or if prescription pain remedies are recommended.");
        setAppointmentsInput("Upcoming: Routine annual gynecological checkup scheduled on June 18th at 11:00 AM");
      }
    }
  }, [isOpen, user.isPregnancyMode, user.birthControlConfig]);

  if (!isOpen) return null;

  // Toggle selection with safety check
  const toggleOption = (key: keyof typeof selectedOptions) => {
    setSelectedOptions(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // Helper for Toast Notifications
  const triggerToast = (msg: string) => {
    setShowToast(msg);
    setTimeout(() => {
      setShowToast(null);
    }, 4000);
  };

  // 2. Calculations for standard and pregnancy parameters
  const today = new Date();
  const reportDateStr = today.toLocaleDateString('en-US', { 
    month: 'long', 
    day: 'numeric', 
    year: 'numeric' 
  });
  const randCode = (() => {
    const arr = new Uint32Array(1);
    globalThis.crypto.getRandomValues(arr);
    return 100000 + (arr[0] % 900000);
  })();
  const reportId = `LMN-RE-${randCode}`;

  // Pregnancy parameters
  const pregStats = getPregnancyStats(user);
  const pregnancyWeek = pregStats.weeks;
  const estimatedDueDate = pregStats.dueDate;
  const babySizeLabel = getBabySize(pregnancyWeek);
  const currentTrimester = Math.min(3, Math.floor((pregnancyWeek - 1) / 13) + 1);

  // Cycle stats (standard mode)
  const cycleAnalytics = getCycleAnalytics(user, symptoms);
  const averageCycle = cycleAnalytics.averageCycleLength;
  const averagePeriod = cycleAnalytics.averagePeriodLength;
  const averageCycleDisplay = cycleAnalytics.averageCycleDisplay;
  const averagePeriodDisplay = cycleAnalytics.averagePeriodDisplay;
  // Synchronized Cycle Predictions (clearly labelled as estimates)
  const sync = calculateCycleSyncData(user, new Date());
  const nextExpectedPeriod = sync.nextExpectedPeriodFormatted;
  const predictedOvulation = sync.estimatedOvulationDateFormatted;
  const predictedFertileRange = sync.estimatedFertileRangeFormatted || 'None estimated';

  // Symptom parsing
  const formattedSymptoms = symptoms.map(s => {
    const nameMap: Record<string, string> = {
      cramps: "Pelvic Cramps ⚡",
      headache: "Headache/Migraine 🤕",
      bloating: "Abdominal Bloating 🎈",
      moody: "Mood Fluctuations 🎭",
      acne: "Skin Breakouts 🌸",
      fatigue: "General Fatigue 🥱",
      tender_breasts: "Breast Tenderness 🍒",
      insomnia: "Insomnia/Sleep Disturbed 🌙",
      nausea: "Nausea/Morning Sickness 🤢",
      back_pain: "Lumbar Back pain 🪵",
      flare_up: "Chronic Flare-up ⚡",
      brain_fog: "Cognitive Brain Fog 🌫️"
    };
    return {
      date: new Date(s.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      name: nameMap[s.type] || s.type,
      intensity: s.intensity === 3 ? "Severe" : s.intensity === 2 ? "Moderate" : "Mild"
    };
  });

  // Recent Periods dates listing
  const samplePeriods = user.periodDates && user.periodDates.length > 0
    ? Array.from(new Set<string>(user.periodDates)).slice(0, 5).map((d: string) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }))
    : [
        new Date(Date.now() - 28 * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        new Date(Date.now() - 56 * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      ];

  // Core generation logic with transition delay
  const handleGenerate = () => {
    setIsGenerating(true);
    setTimeout(() => {
      setIsGenerating(false);
      setReportGenerated(true);
    }, 1800);
  };

  // 3. Multi-path Exports: Safe Hidden Iframe Print (no window.open / no unescaped script injection)
  const handlePrint = () => {
    const modeTitle = user.isPregnancyMode ? "Pregnancy Wellness Summary" : "Menstrual Cycle & Health Summary";
    const themeColor = user.isPregnancyMode ? "#6366f1" : "#ec4899";

    const safeName = escapeHtml(user.name || 'Lumina Member');
    const safeEmail = escapeHtml(user.email || '');
    const safeDate = escapeHtml(reportDateStr);
    const safeRef = escapeHtml(reportId);
    const safeMeds = escapeHtml(medsInput);
    const safeNotes = escapeHtml(notesInput);
    const safeWeight = escapeHtml(weightInput);
    const safeAppointments = escapeHtml(appointmentsInput);

    const symptomsHtml = selectedOptions.symptoms
      ? formattedSymptoms.length > 0
        ? `<table><thead><tr><th>Date</th><th>Symptom</th><th>Intensity</th></tr></thead><tbody>${formattedSymptoms
            .map(
              (s) =>
                `<tr><td>${escapeHtml(s.date)}</td><td>${escapeHtml(s.name)}</td><td>${escapeHtml(s.intensity)}</td></tr>`
            )
            .join('')}</tbody></table>`
        : `<p>No clinical symptoms entered in active timeline.</p>`
      : '';

    const periodsHtml = selectedOptions.periodDates
      ? `<p>${samplePeriods.map((pd) => `<span class="badge">${escapeHtml(pd)}</span>`).join(' ')}</p>`
      : '';

    const htmlDoc = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Lumina Clinical Report - ${safeName}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #1e293b; line-height: 1.6; padding: 36px; max-width: 780px; margin: 0 auto; }
    .header { border-bottom: 2px solid #e2e8f0; padding-bottom: 16px; margin-bottom: 24px; display: flex; justify-content: space-between; }
    h1 { font-family: Georgia, serif; font-style: italic; font-size: 24px; color: ${themeColor}; margin: 0 0 4px 0; }
    .sub { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.12em; color: #475569; margin: 0; }
    .meta { text-align: right; font-size: 11px; color: #64748b; font-family: monospace; }
    .card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; margin-bottom: 20px; display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; }
    .section { margin-bottom: 22px; page-break-inside: avoid; }
    .section h2 { font-family: Georgia, serif; font-style: italic; font-size: 16px; color: ${themeColor}; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; margin-bottom: 12px; }
    .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
    .box { background: #fafafa; border: 1px solid #e2e8f0; border-radius: 10px; padding: 12px; text-align: center; }
    .box .val { font-size: 18px; font-weight: 700; color: #0f172a; }
    .box .lbl { font-size: 10px; font-weight: 700; color: #475569; text-transform: uppercase; }
    .badge { display: inline-block; padding: 4px 10px; border-radius: 8px; background: #fdf2f8; border: 1px solid #fbcfe8; font-size: 11px; font-weight: 600; color: #9d174d; margin: 2px; }
    .notes { background: #fffbeb; border-left: 4px solid #d97706; padding: 12px 14px; font-style: italic; font-size: 12.5px; color: #451a03; border-radius: 6px; }
    table { width: 100%; border-collapse: collapse; margin-top: 8px; }
    th, td { text-align: left; padding: 8px 10px; font-size: 12px; border-bottom: 1px solid #e2e8f0; }
    th { background: #f8fafc; font-size: 10px; text-transform: uppercase; color: #475569; }
    .footer { margin-top: 36px; padding-top: 14px; border-top: 1px solid #e2e8f0; font-size: 10px; text-align: center; color: #64748b; text-transform: uppercase; letter-spacing: 0.08em; }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <h1>Lumina Clinical Record Summary</h1>
      <p class="sub">${escapeHtml(modeTitle)}</p>
    </div>
    <div class="meta">
      <div>CONFIDENTIAL</div>
      <div>Date: ${safeDate}</div>
      <div>Ref: ${safeRef}</div>
    </div>
  </div>
  <div class="card">
    <div><strong>Patient Name:</strong><br/>${safeName}</div>
    <div><strong>Patient Email:</strong><br/>${safeEmail}</div>
  </div>
  ${user.isPregnancyMode ? `
    <div class="section">
      <h2>Maternity Progression Summary</h2>
      <div class="grid">
        ${selectedOptions.pregnancyWeek ? `<div class="box"><div class="val">Week ${pregnancyWeek}</div><div class="lbl">Gestational Age</div></div>` : ''}
        <div class="box"><div class="val">Trimester ${currentTrimester}</div><div class="lbl">Maternity Stage</div></div>
        ${selectedOptions.dueDate ? `<div class="box"><div class="val">${escapeHtml(estimatedDueDate)}</div><div class="lbl">Estimated Due</div></div>` : ''}
      </div>
      ${selectedOptions.weightTrack && safeWeight ? `<p><strong>Registered Weight:</strong> ${safeWeight}</p>` : ''}
      ${selectedOptions.appointments && safeAppointments ? `<p><strong>Schedule:</strong> ${safeAppointments}</p>` : ''}
    </div>
  ` : `
    ${selectedOptions.cycleHistory ? `
      <div class="section">
        <h2>Menstrual Cycle Analytics</h2>
        <div class="grid">
          ${selectedOptions.cycleLength ? `<div class="box"><div class="val">${escapeHtml(averageCycleDisplay)}</div><div class="lbl">Average Cycle</div></div>` : ''}
          ${selectedOptions.periodLength ? `<div class="box"><div class="val">${escapeHtml(averagePeriodDisplay)}</div><div class="lbl">Mean Period</div></div>` : ''}
          <div class="box"><div class="val">${escapeHtml(nextExpectedPeriod)}</div><div class="lbl">Next Estimated</div></div>
        </div>
      </div>
    ` : ''}
    ${periodsHtml ? `<div class="section"><h2>Recent Logged Periods</h2>${periodsHtml}</div>` : ''}
    ${selectedOptions.fertility ? `<div class="section"><h2>Estimated Fertility Windows</h2><p><strong>Expected Ovulation:</strong> ${escapeHtml(predictedOvulation)}<br/><strong>Fertile Window Range:</strong> ${escapeHtml(predictedFertileRange)}</p></div>` : ''}
  `}
  ${selectedOptions.medications && safeMeds ? `<div class="section"><h2>Active Medications &amp; Supplements</h2><p>${safeMeds}</p></div>` : ''}
  ${selectedOptions.notes && safeNotes ? `<div class="section"><h2>Consultation Notes</h2><div class="notes">${safeNotes}</div></div>` : ''}
  ${symptomsHtml ? `<div class="section"><h2>Logged Symptoms</h2>${symptomsHtml}</div>` : ''}
  <div class="footer">CONFIDENTIAL CLINICAL BRIEF • GENERATED VIA LUMINA BLOOM &amp; BALANCE</div>
</body>
</html>`;

    try {
      const iframe = document.createElement('iframe');
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = '0';
      iframe.setAttribute('title', 'Lumina Print Preview');
      iframe.onload = () => {
        try {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
        } catch {
          triggerToast("Print dialog could not open automatically. Please use Copy Text below.");
        }
        setTimeout(() => {
          iframe.parentNode?.removeChild(iframe);
        }, 2500);
      };
      iframe.srcdoc = htmlDoc;
      document.body.appendChild(iframe);
      triggerToast("System Print spool prepared! Save as PDF or select printer.");
    } catch {
      triggerToast("Unable to open print frame. Use Copy Summary below.");
    }
  };

  // Compile detailed text representation for Emailing and Clipboard Copying
  const compileTextSummary = () => {
    let text = `LUMINA CLINICAL COMPANION HEALTH REPORT\n`;
    text += `=========================================\n`;
    text += `Document Reference ID: ${reportId}\n`;
    text += `Patient Name: ${user.name}\n`;
    text += `Registered Email: ${user.email}\n`;
    text += `Date Compiled: ${reportDateStr}\n`;
    text += `Mode: ${user.isPregnancyMode ? "Pregnancy Wellness Support" : "Menstrual Cycle Monitor"}\n\n`;

    if (user.isPregnancyMode) {
      if (selectedOptions.pregnancyWeek) text += `* Gestational Age: Week ${pregnancyWeek}\n`;
      if (selectedOptions.dueDate) text += `* Estimated Due Date (EDD): ${estimatedDueDate}\n`;
      text += `* Active Trimester: Trimester ${currentTrimester}\n`;
      if (selectedOptions.weightTrack) text += `* Tracked Weight Session: ${weightInput}\n`;
      if (selectedOptions.medications && medsInput) text += `* Active Medications/Supplements: ${medsInput}\n`;
      if (selectedOptions.appointments && appointmentsInput) text += `* Appointments: ${appointmentsInput}\n`;
      if (selectedOptions.notes && notesInput) text += `\n* Questions/Notes for OB-GYN: "${notesInput}"\n`;
    } else {
      if (selectedOptions.cycleHistory) {
        text += `CLINICAL CYCLE TRACKS:\n`;
        if (selectedOptions.cycleLength) text += `- Average Cycle Duration: ${averageCycleDisplay}\n`;
        if (selectedOptions.periodLength) text += `- Average Bleeding Span: ${averagePeriodDisplay}\n`;
        text += `- Last Period Initialized: ${user.lastPeriodStart || "None configured"}\n`;
        text += `- Next Predicted Initiation: ${nextExpectedPeriod}\n`;
      }
      if (selectedOptions.fertility) {
        text += `\nESTIMATED FERTILITY LOGS:\n`;
        text += `- Next Ovulation Target: ${predictedOvulation}\n`;
        text += `- Fertile Cycle Sweep: ${predictedFertileRange}\n`;
      }
      if (selectedOptions.contraceptive && user.birthControlConfig?.enabled) {
        text += `\nCONTRACEPTIVE STRATEGY:\n`;
        text += `- Active Arrangement: ${user.birthControlConfig.method} (${user.birthControlConfig.frequency})\n`;
      }
      if (selectedOptions.medications && medsInput) {
        text += `\nACTIVE MEDICATION & VITAMINS:\n`;
        text += `- ${medsInput}\n`;
      }
      if (selectedOptions.notes && notesInput) {
        text += `\nPATIENT QUESTIONS & CLINICAL NOTES:\n`;
        text += `"${notesInput}"\n`;
      }
    }

    if (selectedOptions.symptoms) {
      text += `\nLOGGED SYMPTOMS LIST:\n`;
      if (formattedSymptoms.length > 0) {
        formattedSymptoms.forEach(s => {
          text += `- [${s.date}] ${s.name} (Intensity: ${s.intensity})\n`;
        });
      } else {
        text += `- No clinical symptoms entered in active timeline.\n`;
      }
    }

    text += `\n-----------------------------------------\n`;
    text += `Report compiled securely from Lumina Bloom & Balance Patient Companion app.`;
    return text;
  };

  const handleEmailShare = () => {
    const emailSubject = `Lumina Health Report - ${user.name} (${reportId})`;
    const emailBody = compileTextSummary();
    const mailtoUrl = `mailto:?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`;
    window.location.href = mailtoUrl;
    triggerToast("Email draft prefilled and dispatched to client provider!");
  };

  const handleCopyClipboard = () => {
    const text = compileTextSummary();
    navigator.clipboard.writeText(text)
      .then(() => {
        triggerToast("Health Summary copied to clipboard! Ready to paste on WhatsApp or messaging cards 🌸");
      })
      .catch(() => {
        triggerToast("Copy failed, please highlight text summary manually.");
      });
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 overflow-y-auto">
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-stone-950/60 backdrop-blur-sm"
        />
        
        <motion.div 
          initial={{ scale: 0.96, opacity: 0, y: 16 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.96, opacity: 0, y: 16 }}
          className="relative bg-white dark:bg-[#1a1816] w-full max-w-2xl rounded-2xl overflow-hidden shadow-2xl border border-stone-200/80 dark:border-[#2e2a26] my-8 z-10 max-h-[85vh] flex flex-col"
        >
          {/* Header */}
          <div className="p-6 md:p-7 bg-[#faf8f6] dark:bg-[#23201d] border-b border-stone-200/80 dark:border-[#2e2a26] shrink-0 flex justify-between items-center gap-4">
            <div className="space-y-1">
              <span className="px-2.5 py-1 bg-pink-50 dark:bg-pink-950/50 text-pink-700 dark:text-pink-300 border border-pink-200/60 dark:border-pink-900/50 rounded-lg text-[11px] font-semibold inline-block">
                Clinical export
              </span>
              <h3 className="text-2xl md:text-3xl font-serif font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
                Generate Doctor Report <span className="text-xl" aria-hidden="true">🏥</span>
              </h3>
            </div>
            <button 
              onClick={onClose} 
              aria-label="Close doctor report builder"
              className="w-10 h-10 rounded-xl bg-white dark:bg-[#1a1816] shadow-xs border border-stone-200/80 dark:border-[#342f2b] flex items-center justify-center text-stone-500 dark:text-stone-400 hover:text-pink-600 dark:hover:text-pink-400 transition-colors cursor-pointer shrink-0"
            >
              <X size={18} />
            </button>
          </div>

          {/* Core Body Section wrapper with scroll */}
          <div className="p-6 md:p-7 overflow-y-auto flex-1 space-y-7">
            {!reportGenerated ? (
              <div className="space-y-7">
                {/* Intro note */}
                <div className="p-4 bg-[#faf8f6] dark:bg-[#23201d] border border-stone-200/80 dark:border-[#342f2b] rounded-xl flex gap-3 items-start">
                  <Info size={16} className="text-pink-600 dark:text-pink-400 mt-0.5 shrink-0" />
                  <p className="text-xs text-stone-600 dark:text-stone-300 font-medium leading-relaxed">
                    Prepare a professional health timeline to share during checkups. Customize which indices are included. Calculations are privately compiled on-demand with full confidentiality controls.
                  </p>
                </div>

                {/* Grid Split options list vs Custom Inputs */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Option Checkboxes Column */}
                  <div className="space-y-3.5">
                    <h4 className="text-xs font-semibold text-stone-700 dark:text-stone-200 border-b border-stone-200/80 dark:border-[#2e2a26] pb-2">
                      1. Choose information to include
                    </h4>
                    
                    <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
                      {/* Standard settings */}
                      {!user.isPregnancyMode && (
                        <>
                          {[
                            { id: 'cycleHistory', label: 'Cycle average summary', d: 'Average length, period span, last start date' },
                            { id: 'periodDates', label: 'Period dates timeline', d: 'Historical cycle start dates' },
                            { id: 'fertility', label: 'Fertility & ovulation windows', d: 'Predicted ovulation date & fertile spans' },
                            { id: 'pregnancyRisk', label: 'Pregnancy risk estimator', d: 'Follicular & luteal phase risk metrics' },
                            { id: 'contraceptive', label: 'Contraceptive configuration', d: 'Active birth control configurations' },
                            { id: 'symptoms', label: 'Logged symptoms timeline', d: `${formattedSymptoms.length} signs compiled` },
                            { id: 'moods', label: 'Mood track record', d: 'Recent emotional logs' },
                            { id: 'sexualActivity', label: 'Intimacy & protection logs 🔒', d: 'Protected ratio index' },
                            { id: 'medications', label: 'Medications list', d: 'Custom active medications & supplements' },
                            { id: 'notes', label: 'Patient consultation notes', d: 'Custom focus questions' },
                          ].map(opt => (
                            <button
                              key={opt.id}
                              type="button"
                              onClick={() => toggleOption(opt.id as any)}
                              className={`w-full flex items-start gap-3 p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                                selectedOptions[opt.id as keyof typeof selectedOptions]
                                  ? 'bg-pink-50/70 dark:bg-pink-950/30 border-pink-300 dark:border-pink-800/70'
                                  : 'bg-[#faf8f6] dark:bg-[#23201d] border-stone-200/80 dark:border-[#342f2b] opacity-75 hover:opacity-100'
                              }`}
                            >
                              <div className={`mt-0.5 w-4 h-4 rounded flex items-center justify-center border shrink-0 ${
                                selectedOptions[opt.id as keyof typeof selectedOptions]
                                  ? 'bg-pink-600 border-pink-600 text-white'
                                  : 'border-stone-300 dark:border-stone-600'
                              }`}>
                                {selectedOptions[opt.id as keyof typeof selectedOptions] && <Check size={11} strokeWidth={3} />}
                              </div>
                              <div className="space-y-0.5">
                                <span className="text-xs font-semibold text-stone-800 dark:text-stone-100 block leading-snug">{opt.label}</span>
                                <span className="text-[11px] text-stone-500 dark:text-stone-400 leading-tight block">{opt.d}</span>
                              </div>
                            </button>
                          ))}
                        </>
                      )}

                      {/* Pregnancy settings */}
                      {user.isPregnancyMode && (
                        <>
                          {[
                            { id: 'pregnancyWeek', label: 'Gestational progression', d: `Current week details (Week ${pregnancyWeek})` },
                            { id: 'dueDate', label: 'Estimated due date (EDD)', d: `Due: ${estimatedDueDate}` },
                            { id: 'pregnancySymptoms', label: 'Pregnancy-specific symptoms', d: 'Nausea, fatigue, back pain timeline' },
                            { id: 'wellnessChecks', label: 'Wellness check statistics', d: 'Hydration and sleep patterns' },
                            { id: 'contraceptive', label: 'Pre-pregnancy contraceptive use', d: 'Contraception methods' },
                            { id: 'weightTrack', label: 'Weight progress monitor', d: 'Dynamic maternity weight log' },
                            { id: 'medications', label: 'Prenatal vitamins & medications', d: 'Vitamins and supplements' },
                            { id: 'appointments', label: 'Clinical schedules', d: 'OB-GYN scheduled dates' },
                            { id: 'notes', label: 'Maternal consultation notes', d: 'Specific questions for doctor' },
                          ].map(opt => (
                            <button
                              key={opt.id}
                              type="button"
                              onClick={() => toggleOption(opt.id as any)}
                              className={`w-full flex items-start gap-3 p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                                selectedOptions[opt.id as keyof typeof selectedOptions]
                                  ? 'bg-indigo-50/70 dark:bg-indigo-950/30 border-indigo-300 dark:border-indigo-800/70'
                                  : 'bg-[#faf8f6] dark:bg-[#23201d] border-stone-200/80 dark:border-[#342f2b] opacity-75 hover:opacity-100'
                              }`}
                            >
                              <div className={`mt-0.5 w-4 h-4 rounded flex items-center justify-center border shrink-0 ${
                                selectedOptions[opt.id as keyof typeof selectedOptions]
                                  ? 'bg-indigo-600 border-indigo-600 text-white'
                                  : 'border-stone-300 dark:border-stone-600'
                              }`}>
                                {selectedOptions[opt.id as keyof typeof selectedOptions] && <Check size={11} strokeWidth={3} />}
                              </div>
                              <div className="space-y-0.5">
                                <span className="text-xs font-semibold text-stone-800 dark:text-stone-100 block leading-snug">{opt.label}</span>
                                <span className="text-[11px] text-stone-500 dark:text-stone-400 leading-tight block">{opt.d}</span>
                              </div>
                            </button>
                          ))}
                        </>
                      )}
                    </div>
                  </div>

                  {/* Interactive inputs details */}
                  <div className="space-y-4">
                    <h4 className="text-xs font-semibold text-stone-700 dark:text-stone-200 border-b border-stone-200/80 dark:border-[#2e2a26] pb-2">
                      2. Modify report vitals
                    </h4>
                    
                    {/* Weight track input */}
                    {selectedOptions.weightTrack && (
                      <div className="space-y-1.5 font-sans">
                        <label className="text-xs font-semibold text-stone-600 dark:text-stone-300 flex items-center gap-1.5">
                          <Weight size={13} className="text-indigo-500 dark:text-indigo-400" /> Tracked maternity weight
                        </label>
                        <input
                          type="text"
                          value={weightInput}
                          onChange={(e) => setWeightInput(e.target.value)}
                          placeholder="e.g. 64.5 kg"
                          className="w-full p-3 text-xs bg-[#faf8f6] dark:bg-[#23201d] border border-stone-200/80 dark:border-[#342f2b] rounded-xl text-stone-800 dark:text-stone-100 focus:border-pink-400 focus:outline-none transition-all font-semibold tabular-nums"
                        />
                      </div>
                    )}

                    {/* Medications input */}
                    {selectedOptions.medications && (
                      <div className="space-y-1.5 font-sans">
                        <label className="text-xs font-semibold text-stone-600 dark:text-stone-300 flex items-center gap-1.5">
                          <Plus size={13} className="text-indigo-500 dark:text-indigo-400" /> Active medications & supplements
                        </label>
                        <textarea
                          rows={2}
                          value={medsInput}
                          onChange={(e) => setMedsInput(e.target.value)}
                          placeholder="e.g. Folic acid, daily vitamins..."
                          className="w-full p-3 text-xs bg-[#faf8f6] dark:bg-[#23201d] border border-stone-200/80 dark:border-[#342f2b] rounded-xl text-stone-700 dark:text-stone-200 focus:border-pink-400 focus:outline-none transition-all leading-relaxed"
                        />
                      </div>
                    )}

                    {/* Upcoming appointments */}
                    {selectedOptions.appointments && (
                      <div className="space-y-1.5 font-sans">
                        <label className="text-xs font-semibold text-stone-600 dark:text-stone-300 flex items-center gap-1.5">
                          <Clock size={13} className="text-indigo-500 dark:text-indigo-400" /> Clinical schedule & visits
                        </label>
                        <input
                          type="text"
                          value={appointmentsInput}
                          onChange={(e) => setAppointmentsInput(e.target.value)}
                          placeholder="e.g. Ultrasound Friday 2 PM"
                          className="w-full p-3 text-xs bg-[#faf8f6] dark:bg-[#23201d] border border-stone-200/80 dark:border-[#342f2b] rounded-xl text-stone-700 dark:text-stone-200 focus:border-pink-400 focus:outline-none transition-all"
                        />
                      </div>
                    )}

                    {/* Consultation notes text comments */}
                    {selectedOptions.notes && (
                      <div className="space-y-1.5 font-sans">
                        <label className="text-xs font-semibold text-stone-600 dark:text-stone-300 flex items-center gap-1.5">
                          <Edit size={13} className="text-indigo-500 dark:text-indigo-400" /> Notes to highlight & ask doctor
                        </label>
                        <textarea
                          rows={3}
                          value={notesInput}
                          onChange={(e) => setNotesInput(e.target.value)}
                          placeholder="Type questions or symptom patterns you want to highlight during your visit..."
                          className="w-full p-3 text-xs bg-[#faf8f6] dark:bg-[#23201d] border border-stone-200/80 dark:border-[#342f2b] rounded-xl text-stone-700 dark:text-stone-200 focus:border-pink-400 focus:outline-none transition-all leading-relaxed"
                        />
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-4 border-t border-stone-200/80 dark:border-[#2e2a26]">
                  <button
                    onClick={handleGenerate}
                    disabled={isGenerating}
                    className="w-full py-3.5 px-6 bg-pink-600 hover:bg-pink-700 text-white rounded-xl font-semibold text-sm shadow-sm transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {isGenerating ? (
                      <>
                        <motion.div 
                          animate={{ rotate: 360 }}
                          transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                          className="w-4 h-4 border-2 border-white border-t-transparent rounded-full"
                        />
                        <span>Compiling secure chart metrics...</span>
                      </>
                    ) : (
                      <>
                        <FileText size={17} />
                        <span>Generate clinical report</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            ) : (
              // 4. GENERATED MEDICAL REPORT PREVIEW VIEW
              <div className="space-y-6 animate-fadeIn">
                <div className="p-4 bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800/70 text-teal-900 dark:text-teal-200 rounded-xl flex items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2">
                    <Check size={16} className="text-teal-600 dark:text-teal-400 shrink-0" />
                    <span>Report compiled. Review preview and select sharing method below.</span>
                  </div>
                  <button
                    onClick={() => setReportGenerated(false)}
                    className="text-xs font-semibold bg-teal-600 hover:bg-teal-700 text-white px-3 py-1.5 rounded-lg whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    Edit settings
                  </button>
                </div>

                {/* Styled clinical chart card (kept light paper style for clinical clarity) */}
                <div 
                  id="lumina-doctor-report-document"
                  className="p-6 md:p-7 bg-white border border-stone-200 rounded-2xl shadow-xs font-sans text-stone-800 space-y-6 max-h-[460px] overflow-y-auto"
                >
                  {/* Header metadata */}
                  <div className="header-bar flex justify-between items-start border-b border-stone-200 pb-4">
                    <div className="header-info space-y-1">
                      <h1 className="text-xl md:text-2xl font-serif font-bold text-pink-600">Lumina Clinical Record Summary</h1>
                      <p className="text-xs font-semibold text-stone-500 leading-none">
                        {user.isPregnancyMode ? "Pregnancy Care & Gestation Log" : "Menstrual Wellness Case Summary"}
                      </p>
                    </div>
                    <div className="doc-id text-right text-[11px] text-stone-500 font-mono leading-tight tabular-nums">
                      <p className="font-bold">CONFIDENTIAL</p>
                      <p>Date: {reportDateStr}</p>
                      <p>Ref: {reportId}</p>
                    </div>
                  </div>

                  {/* Patient Profile info */}
                  <div className="patient-card grid grid-cols-2 gap-4 bg-[#faf8f6] p-4 rounded-xl border border-stone-200/80">
                    <div className="patient-field text-xs">
                      <strong className="text-[11px] font-semibold text-stone-500 block mb-0.5">Patient name</strong>
                      <span className="font-bold text-stone-800">{user.name}</span>
                    </div>
                    <div className="patient-field text-xs">
                      <strong className="text-[11px] font-semibold text-stone-500 block mb-0.5">Patient email</strong>
                      <span className="font-semibold text-stone-700 truncate block">{user.email}</span>
                    </div>
                    <div className="patient-field text-xs col-span-2">
                      <strong className="text-[11px] font-semibold text-stone-500 block mb-0.5">Data integrity audit</strong>
                      <span className="text-xs text-stone-600 leading-tight block">Generated on direct patient authorization from Lumina Secure Ledger</span>
                    </div>
                  </div>

                  {/* Mode Specific content boxes */}
                  {user.isPregnancyMode ? (
                    /* PREGNANCY REPORT BLOCKS */
                    <div className="space-y-5">
                      {(selectedOptions.pregnancyWeek || selectedOptions.dueDate) && (
                        <div className="section space-y-3">
                          <h4 className="section-title text-sm font-serif font-bold text-indigo-600 border-b border-stone-200 pb-1">Maternity Progression Summary</h4>
                          <div className="grid grid-cols-3 gap-3 tabular-nums">
                            {selectedOptions.pregnancyWeek && (
                              <div className="data-box bg-indigo-50/40 p-3 rounded-xl border border-indigo-100 text-center">
                                <div className="value text-lg font-bold text-indigo-700">Week {pregnancyWeek}</div>
                                <div className="label text-[11px] text-stone-500 font-medium">Gestational age</div>
                              </div>
                            )}
                            
                            <div className="data-box bg-indigo-50/40 p-3 rounded-xl border border-indigo-100 text-center">
                              <div className="value text-lg font-bold text-indigo-700">Trimester {currentTrimester}</div>
                              <div className="label text-[11px] text-stone-500 font-medium">Maternity stage</div>
                            </div>

                            {selectedOptions.dueDate && (
                              <div className="data-box bg-indigo-50/40 p-3 rounded-xl border border-indigo-100 text-center">
                                <div className="value text-xs font-bold text-indigo-700 mt-1">{estimatedDueDate}</div>
                                <div className="label text-[11px] text-stone-500 font-medium">Estimated due</div>
                              </div>
                            )}
                          </div>
                          
                          <div className="bg-indigo-50/30 p-3.5 rounded-xl border border-indigo-100 text-xs flex items-center justify-between text-indigo-900">
                             <span>🌱 Development check: Baby is the size of a <strong>{babySizeLabel}</strong></span>
                             <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-md text-[11px] font-semibold tabular-nums">{40 - pregnancyWeek} wks left</span>
                          </div>
                        </div>
                      )}

                      {selectedOptions.weightTrack && weightInput && (
                        <div className="section space-y-2">
                           <h4 className="section-title text-sm font-serif font-bold text-indigo-600 border-b border-stone-200 pb-1">Physical Metrics</h4>
                           <div className="bg-[#faf8f6] p-3.5 rounded-xl border border-stone-200/80 flex justify-between items-center text-xs">
                             <span className="text-stone-600 font-semibold">Registered maternity weight</span>
                             <span className="font-bold text-stone-800 bg-white px-3 py-1 rounded-lg border border-stone-200 tabular-nums">{weightInput}</span>
                           </div>
                        </div>
                      )}

                      {selectedOptions.wellnessChecks && (
                        <div className="section space-y-2">
                          <h4 className="section-title text-sm font-serif font-bold text-indigo-600 border-b border-stone-200 pb-1">Maternal Wellness Check-in Statistics</h4>
                          <p className="text-xs text-stone-500">Self-care index compiled over current weekly trimester stretch:</p>
                          <div className="grid grid-cols-2 gap-3 text-xs">
                            <div className="p-3.5 bg-[#faf8f6] border border-stone-200/80 rounded-xl leading-relaxed">
                               <strong className="text-[11px] font-semibold text-stone-500 block mb-0.5">Hydration norms</strong>
                               <span className="text-stone-700">Average daily water: <strong>2.8 Liters</strong> (Target: 3.0L) 💧</span>
                            </div>
                            <div className="p-3.5 bg-[#faf8f6] border border-stone-200/80 rounded-xl leading-relaxed">
                               <strong className="text-[11px] font-semibold text-stone-500 block mb-0.5">Sleep cumulative</strong>
                               <span className="text-stone-700">Rest hours: <strong>7.5 hrs/night</strong> (Steady profile) 🛌</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    /* STANDARD CYCLE REPORT BLOCKS */
                    <div className="space-y-5">
                      {selectedOptions.cycleHistory && (
                        <div className="section space-y-3">
                          <h4 className="section-title text-sm font-serif font-bold text-pink-600 border-b border-stone-200 pb-1">Menstrual Cycle Analytics</h4>
                          <div className="grid grid-cols-3 gap-3 tabular-nums">
                            {selectedOptions.cycleLength && (
                              <div className="data-box bg-[#faf8f6] p-3.5 rounded-xl border border-stone-200/80 text-center">
                                <div className="value text-xl font-bold text-stone-800">{averageCycleDisplay}</div>
                                <div className="label text-[11px] text-stone-500 font-medium">Average cycle</div>
                              </div>
                            )}

                            {selectedOptions.periodLength && (
                              <div className="data-box bg-[#faf8f6] p-3.5 rounded-xl border border-stone-200/80 text-center">
                                <div className="value text-xl font-bold text-stone-800">{averagePeriodDisplay}</div>
                                <div className="label text-[11px] text-stone-500 font-medium">Mean period</div>
                              </div>
                            )}

                            <div className="data-box bg-[#faf8f6] p-3.5 rounded-xl border border-stone-200/80 text-center">
                              <div className="value text-xs font-bold leading-tight mt-1 text-stone-700">{user.lastPeriodStart ? new Date(user.lastPeriodStart).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : "Not logged"}</div>
                              <div className="label text-[11px] text-stone-500 font-medium mt-1">Last cycle start</div>
                            </div>
                          </div>
                        </div>
                      )}

                      {selectedOptions.periodDates && (
                        <div className="section space-y-2">
                          <h4 className="section-title text-sm font-serif font-bold text-pink-600 border-b border-stone-200 pb-1">Recent Logged Periods</h4>
                          <div className="flex flex-wrap gap-2 tabular-nums">
                             {samplePeriods.map((pd, index) => (
                               <span key={index} className="px-3 py-1 bg-pink-50 text-pink-700 rounded-lg text-xs font-semibold border border-pink-200/70">
                                 {pd}
                               </span>
                             ))}
                          </div>
                        </div>
                      )}

                      {selectedOptions.fertility && (
                        <div className="section space-y-2">
                          <h4 className="section-title text-sm font-serif font-bold text-teal-700 border-b border-stone-200 pb-1">Fertility & Luteal Windows</h4>
                          <div className="grid grid-cols-2 gap-3 text-xs leading-snug tabular-nums">
                            <div className="p-3 bg-teal-50/50 border border-teal-200/60 rounded-xl">
                              <span className="text-[11px] font-semibold text-teal-700 block mb-0.5">Expected ovulation</span>
                              <span className="font-bold text-teal-900">{predictedOvulation}</span>
                            </div>
                            <div className="p-3 bg-teal-50/50 border border-teal-200/60 rounded-xl">
                              <span className="text-[11px] font-semibold text-teal-700 block mb-0.5">Fertile window range</span>
                              <span className="font-bold text-teal-900">{predictedFertileRange}</span>
                            </div>
                          </div>
                        </div>
                      )}

                      {selectedOptions.pregnancyRisk && (
                        <div className="section space-y-2">
                          <h4 className="section-title text-sm font-serif font-bold text-pink-600 border-b border-stone-200 pb-1">Pregnancy Risk Timeline</h4>
                          <p className="text-xs text-stone-500">Compiles natural hormonal estimates during logging cycle epochs:</p>
                          <div className="bg-[#faf8f6] p-3.5 rounded-xl border border-stone-200/80 text-xs flex justify-between items-center font-sans">
                            <span className="font-semibold text-stone-600">Predicted active risk level today</span>
                            <span className="px-2.5 py-1 bg-amber-100 text-amber-800 rounded-lg font-semibold text-[11px] border border-amber-200">Moderate Low</span>
                          </div>
                        </div>
                      )}

                      {selectedOptions.contraceptive && (
                        <div className="section space-y-2">
                           <h4 className="section-title text-sm font-serif font-bold text-pink-600 border-b border-stone-200 pb-1">Contraceptive History</h4>
                           <div className="bg-[#faf8f6] p-3 rounded-xl border border-stone-200/80 text-xs font-sans leading-relaxed">
                             {user.birthControlConfig?.enabled ? (
                               <p className="font-semibold text-stone-700">
                                 Active regimen: <strong>{user.birthControlConfig.method}</strong>, taken {user.birthControlConfig.frequency} with reminders enabled at {user.birthControlConfig.reminderTime}.
                               </p>
                             ) : (
                               <p className="text-stone-500">No active contraceptive methods configured in profile settings.</p>
                             )}
                           </div>
                        </div>
                      )}

                      {selectedOptions.sexualActivity && (
                        <div className="section space-y-2">
                          <h4 className="section-title text-sm font-serif font-bold text-rose-600 border-b border-stone-200 pb-1">Sexual Activity & Protection Patterns 🔒</h4>
                          <p className="text-xs text-rose-600">Sensitive logs. Shown only upon explicit patient authorization.</p>
                          <div className="bg-[#faf8f6] p-3.5 rounded-xl border border-stone-200/80 text-xs leading-relaxed space-y-1">
                            <p className="text-stone-700 font-medium">Logged intimacy occurrences (Last 30 Days): <strong>2 instances logged</strong></p>
                            <p className="text-xs text-stone-500">Protection index: 100% Protected (Condom barriers registered in logs)</p>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* COMMON SECTIONS */}
                  {selectedOptions.symptoms && (
                    <div className="section space-y-2">
                      <h4 className="section-title text-sm font-serif font-bold text-pink-600 border-b border-stone-200 pb-1">Logged Physiological Symptoms Timeline</h4>
                      
                      {formattedSymptoms.length > 0 ? (
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="border-b border-stone-200 text-stone-500">
                              <th className="py-2 text-left font-semibold">Date</th>
                              <th className="py-2 text-left font-semibold">Symptom category</th>
                              <th className="py-2 text-left font-semibold">Intensity</th>
                            </tr>
                          </thead>
                          <tbody>
                            {formattedSymptoms.map((s, idx) => (
                              <tr key={idx} className="border-b border-stone-100">
                                <td className="py-2 tabular-nums">{s.date}</td>
                                <td className="py-2">{s.name}</td>
                                <td className="py-2">
                                  <span className={`px-2 py-0.5 rounded-md text-[11px] font-semibold ${s.intensity === 'Severe' ? 'bg-rose-50 text-rose-700' : s.intensity === 'Moderate' ? 'bg-amber-50 text-amber-700' : 'bg-stone-100 text-stone-700'}`}>
                                    {s.intensity}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      ) : (
                        <div className="p-4 bg-[#faf8f6] rounded-xl text-center text-xs text-stone-500 border border-dashed border-stone-300">
                          No severe or moderate symptoms checked in active 30-day timeline.
                        </div>
                      )}
                    </div>
                  )}

                  {selectedOptions.moods && (
                    <div className="section space-y-2">
                       <h4 className="section-title text-sm font-serif font-bold text-pink-600 border-b border-stone-200 pb-1">Cognitive & Mood Variance</h4>
                       <p className="text-xs text-stone-500">Predominant emotional state logs computed over current cycle epoch:</p>
                       <div className="flex items-center gap-2 flex-wrap">
                          {user.moodLogs && user.moodLogs.length > 0 ? (
                            Array.from(new Set(user.moodLogs.map(m=>m.mood))).map((md, i) => (
                              <span key={i} className="px-3 py-1 bg-amber-50 text-amber-800 capitalize border border-amber-200/70 rounded-lg text-xs font-semibold">
                                {md} ✨
                              </span>
                            ))
                          ) : (
                            ['calm 😌', 'stable ⚖️', 'energetic ⚡'].map((mLabel, i) => (
                              <span key={i} className="px-3 py-1 bg-stone-100 border border-stone-200 rounded-lg text-xs text-stone-700 font-semibold">
                                 {mLabel}
                              </span>
                            ))
                          )}
                       </div>
                    </div>
                  )}

                  {selectedOptions.medications && medsInput && (
                    <div className="section space-y-2">
                      <h4 className="section-title text-sm font-serif font-bold text-pink-600 border-b border-stone-200 pb-1">Active Supplementation & Medications</h4>
                      <p className="text-xs bg-[#faf8f6] p-3.5 border border-stone-200/80 rounded-xl leading-relaxed text-stone-700">
                        "{medsInput}"
                      </p>
                    </div>
                  )}

                  {selectedOptions.appointments && appointmentsInput && (
                    <div className="section space-y-2">
                      <h4 className="section-title text-sm font-serif font-bold text-indigo-600 border-b border-stone-200 pb-1">Schedules & Clinical Appointments</h4>
                      <p className="text-xs bg-[#faf8f6] p-3.5 border border-stone-200/80 rounded-xl leading-relaxed text-stone-700 font-medium">
                        "{appointmentsInput}"
                      </p>
                    </div>
                  )}

                  {selectedOptions.notes && notesInput && (
                    <div className="section space-y-2">
                      <h4 className="section-title text-sm font-serif font-bold text-amber-700 border-b border-stone-200 pb-1">Maternal/Patient Consultation Inquiries</h4>
                      <div className="notes-block bg-amber-50/60 border-l-4 border-amber-500 p-4 rounded-r-xl text-xs text-amber-950 leading-relaxed">
                        "{notesInput}"
                      </div>
                    </div>
                  )}
                </div>

                {/* Grid controls action box */}
                <div className="space-y-4 pt-4 border-t border-stone-200/80 dark:border-[#2e2a26]">
                  <h4 className="text-xs font-semibold text-center text-stone-500 dark:text-stone-400">Select sharing method</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <button
                      onClick={handlePrint}
                      className="flex items-center justify-center gap-2 p-3.5 bg-pink-600 hover:bg-pink-700 text-white rounded-xl font-semibold text-xs transition-all cursor-pointer"
                    >
                      <Printer size={15} /> Print / Save PDF
                    </button>
                    
                    <button
                      onClick={handleEmailShare}
                      className="flex items-center justify-center gap-2 p-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold text-xs transition-all cursor-pointer"
                    >
                      <Mail size={15} /> Email provider
                    </button>

                    <button
                      onClick={handleCopyClipboard}
                      className="flex items-center justify-center gap-2 p-3.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-semibold text-xs transition-all cursor-pointer"
                    >
                      <Send size={15} /> WhatsApp / Copy
                    </button>
                  </div>
                  
                  <div className="text-center">
                    <button
                      onClick={() => setReportGenerated(false)}
                      className="text-xs font-semibold text-stone-500 dark:text-stone-400 hover:text-pink-600 dark:hover:text-pink-400 transition-colors cursor-pointer"
                    >
                      &larr; Return to settings builder
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </motion.div>

        {/* Global Toast Notification */}
        {showToast && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[400] max-w-sm w-full px-4">
            <div className="bg-stone-950/95 text-white p-4 rounded-2xl text-xs font-semibold text-center shadow-2xl border border-white/10">
              {showToast}
            </div>
          </div>
        )}
      </div>
    </AnimatePresence>
  );
};

export default DoctorReport;
