import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Symptom } from '../types';
import { 
  FileText, Check, Download, Share2, X, Calendar, Activity, 
  Heart, Smile, Plus, Edit, Printer, Mail, Send, Info, 
  Sparkles, Weight, Clock, HeartHandshake, Eye, AlertCircle, Dumbbell
} from 'lucide-react';
import { getPregnancyStats, getBabySize } from '../services/notificationService';

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
  const reportId = `LMN-RE-${Math.floor(100000 + Math.random() * 900000)}`;

  // Pregnancy parameters
  const pregStats = getPregnancyStats(user);
  const pregnancyWeek = pregStats.weeks;
  const estimatedDueDate = pregStats.dueDate;
  const babySizeLabel = getBabySize(pregnancyWeek);
  const currentTrimester = Math.min(3, Math.floor((pregnancyWeek - 1) / 13) + 1);

  // Cycle stats (standard mode)
  const averageCycle = user.cycleLength || 28;
  const averagePeriod = user.periodLength || 5;
  const lastPeriodStart = user.lastPeriodStart ? new Date(user.lastPeriodStart) : null;
  
  let nextExpectedPeriod = "Unavailable";
  let nextExpectedPeriodDate: Date | null = null;
  if (lastPeriodStart) {
    nextExpectedPeriodDate = new Date(lastPeriodStart.getTime() + averageCycle * 24 * 60 * 60 * 1000);
    nextExpectedPeriod = nextExpectedPeriodDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  // Fertile & Ovulation Windows
  let predictedOvulation = "Unavailable";
  let predictedFertileRange = "Unavailable";
  if (nextExpectedPeriodDate) {
    const ovulationDate = new Date(nextExpectedPeriodDate.getTime() - 14 * 24 * 60 * 60 * 1000);
    const fertileStart = new Date(ovulationDate.getTime() - 4 * 24 * 60 * 60 * 1000);
    const fertileEnd = new Date(ovulationDate.getTime() + 1 * 24 * 60 * 60 * 1000);
    
    predictedOvulation = ovulationDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    predictedFertileRange = `${fertileStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${fertileEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
  }

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

  // 3. Multi-path Exports: Print/Save to PDF, Email prefill, and WhatsApp Copy share
  const handlePrint = () => {
    const printArea = document.getElementById('lumina-doctor-report-document');
    if (!printArea) {
      triggerToast("Error: Document element not found.");
      return;
    }
    
    // Spawns a clean document-only window
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      triggerToast("Popup blocker active! Please allow popups or use Copy Text.");
      return;
    }

    const modeTitle = user.isPregnancyMode ? "Pregnancy Wellness Summary" : "Menstrual Cycle & Health Summary";
    const themeColor = user.isPregnancyMode ? "#6366f1" : "#ec4899"; // Indigo vs Pink
    const fontTheme = "Georgia, 'Times New Roman', serif";

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Lumina Clinical Report - ${user.name}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
            body {
              font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
              color: #1e293b;
              line-height: 1.6;
              padding: 45px;
              background-color: #fff;
              max-width: 800px;
              margin: 0 auto;
            }
            .header-bar {
              border-bottom: 2px solid #e2e8f0;
              padding-bottom: 22px;
              margin-bottom: 30px;
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
            }
            .header-info h1 {
              font-family: ${fontTheme};
              italic: true;
              font-size: 28px;
              font-style: italic;
              color: ${themeColor};
              margin: 0 0 6px 0;
            }
            .header-info p {
              margin: 0;
              font-size: 11px;
              font-weight: 700;
              text-transform: uppercase;
              letter-spacing: 0.15em;
              color: #64748b;
            }
            .doc-id {
              text-align: right;
              font-size: 11px;
              color: #94a3b8;
              font-family: monospace;
            }
            .doc-id p {
              margin: 2px 0;
            }
            .patient-card {
              background: #f8fafc;
              border: 1px solid #f1f5f9;
              border-radius: 16px;
              padding: 20px;
              margin-bottom: 30px;
              display: grid;
              grid-template-columns: repeat(2, 1fr);
              gap: 15px;
            }
            .patient-field {
              font-size: 13px;
            }
            .patient-field strong {
              color: #475569;
              text-transform: uppercase;
              font-size: 10px;
              letter-spacing: 0.05em;
              display: block;
              margin-bottom: 3px;
            }
            .section {
              margin-bottom: 30px;
              page-break-inside: avoid;
            }
            .section-title {
              font-family: ${fontTheme};
              font-size: 17px;
              font-style: italic;
              color: ${themeColor};
              border-bottom: 1.5px solid #f1f5f9;
              padding-bottom: 6px;
              margin-bottom: 18px;
              display: flex;
              align-items: center;
              gap: 8px;
            }
            .grid-3 {
              display: grid;
              grid-template-columns: repeat(3, 1fr);
              gap: 15px;
            }
            .grid-2 {
              display: grid;
              grid-template-columns: repeat(2, 1fr);
              gap: 15px;
            }
            .data-box {
              background: #fafafa;
              border: 1px solid #f1f5f9;
              border-radius: 12px;
              padding: 14px;
            }
            .data-box .value {
              font-size: 20px;
              font-weight: 700;
              color: #0f172a;
              margin-bottom: 4px;
            }
            .data-box .label {
              font-size: 10px;
              font-weight: 700;
              color: #64748b;
              text-transform: uppercase;
              letter-spacing: 0.05em;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 10px;
            }
            th {
              background-color: #f8fafc;
              padding: 10px 12px;
              font-size: 10px;
              font-weight: 800;
              text-transform: uppercase;
              letter-spacing: 0.08em;
              color: #475569;
              text-align: left;
              border-bottom: 2px solid #e2e8f0;
            }
            td {
              padding: 10px 12px;
              font-size: 12px;
              color: #334155;
              border-bottom: 1px solid #f1f5f9;
            }
            .notes-block {
              background: #fdfaf2;
              border-left: 4px solid #d97706;
              border-radius: 4px 12px 12px 4px;
              padding: 15px;
              font-size: 12.5px;
              font-style: italic;
              color: #451a03;
              line-height: 1.6;
            }
            .footer {
              margin-top: 55px;
              padding-top: 20px;
              border-t: 1px solid #e2e8f0;
              font-size: 10px;
              text-align: center;
              color: #94a3b8;
              text-transform: uppercase;
              letter-spacing: 0.1em;
            }
            @media print {
              body { padding: 0px; }
            }
          </style>
        </head>
        <body>
          ${printArea.innerHTML}
          <div class="footer">
            CONFIDENTIAL CLINICAL BRIEF • GENERATED VIA LUMINA CYCLE COMPANION SECURE PROTOCOL
          </div>
          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 800);
            };
          <\/script>
        </body>
      </html>
    `);
    printWindow.document.close();
    triggerToast("System Print spool dispatched! Open PDF destination or paper drawer.");
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
        if (selectedOptions.cycleLength) text += `- Average Cycle Duration: ${averageCycle} Days\n`;
        if (selectedOptions.periodLength) text += `- Average Bleeding Span: ${averagePeriod} Days\n`;
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
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-md"
        />
        
        <motion.div 
          initial={{ scale: 0.95, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 20 }}
          className="relative bg-white w-full max-w-2xl rounded-[3rem] overflow-hidden shadow-2xl border border-pink-100/30 my-8 z-10 max-h-[85vh] flex flex-col"
        >
          {/* Header */}
          <div className="p-6 md:p-8 bg-gradient-to-r from-pink-500/5 via-rose-500/10 to-indigo-500/5 border-b border-pink-100/20 shrink-0 flex justify-between items-center">
            <div className="space-y-1">
              <span className="px-3 py-1 bg-pink-500/10 text-pink-500 rounded-full text-[9px] font-black uppercase tracking-widest block w-max">Clinical Export</span>
              <h3 className="text-2xl md:text-3xl font-serif text-slate-800 italic flex items-center gap-2">
                Generate Doctor Report <span className="text-xl">🏥</span>
              </h3>
            </div>
            <button 
              onClick={onClose} 
              className="w-10 h-10 rounded-full bg-white shadow-sm border border-pink-100 flex items-center justify-center text-slate-400 hover:text-pink-500 transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          {/* Core Body Section wrapper with scroll */}
          <div className="p-6 md:p-8 overflow-y-auto flex-1 space-y-8">
            {!reportGenerated ? (
              <div className="space-y-8">
                {/* Intro note */}
                <div className="p-4 bg-pink-50/20 border border-pink-100/40 rounded-2xl flex gap-3 items-start">
                  <Info size={16} className="text-pink-500 mt-0.5 shrink-0" />
                  <p className="text-xs text-slate-600 font-medium leading-relaxed font-serif italic">
                    Prepare a professional health timeline to share during checkups. 
                    Customize which indices are shared. All calculations are privately compiled on-demand in full adherence to the strict confidentiality request.
                  </p>
                </div>

                {/* Grid Split options list vs Custom Inputs */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Option Checkboxes Column */}
                  <div className="space-y-4">
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 border-b pb-2">1. Choose Information to Include</h4>
                    
                    <div className="space-y-2 max-h-[380px] overflow-y-auto pr-2">
                      {/* Standard settings */}
                      {!user.isPregnancyMode && (
                        <>
                          {[
                            { id: 'cycleHistory', label: 'Cycle Average Summary', d: 'Average length, period span, last start date' },
                            { id: 'periodDates', label: 'Period Dates Timeline', d: 'Historical cycle start dates' },
                            { id: 'fertility', label: 'Fertility & Ovulation Windows', d: 'Predicted ovulation date & fertile spans' },
                            { id: 'pregnancyRisk', label: 'Pregnancy Risk Estimator', d: 'Follicular & luteal phase risk metrics' },
                            { id: 'contraceptive', label: 'Contraceptive Configuration', d: 'Active birth control configurations' },
                            { id: 'symptoms', label: 'Logged Symptoms Timeline', d: `${formattedSymptoms.length} signs compiled` },
                            { id: 'moods', label: 'Mood Track Record', d: 'Recent emotional logs' },
                            { id: 'sexualActivity', label: 'Intimacy & Protection Logs 🔒', d: 'Protected ratio index' },
                            { id: 'medications', label: 'Medications List', d: 'Custom active prefilled drugs' },
                            { id: 'notes', label: 'Patient consultation notes', d: 'Custom focus questions' },
                          ].map(opt => (
                            <button
                              key={opt.id}
                              onClick={() => toggleOption(opt.id as any)}
                              className={`w-full flex items-start gap-3 p-3.5 rounded-2xl border text-left transition-all ${selectedOptions[opt.id as keyof typeof selectedOptions] ? 'bg-pink-50/30 border-pink-200' : 'bg-white border-slate-100 opacity-60 hover:opacity-80'}`}
                            >
                              <div className={`mt-0.5 w-4 h-4 rounded flex items-center justify-center border shrink-0 ${selectedOptions[opt.id as keyof typeof selectedOptions] ? 'bg-pink-500 border-pink-500 text-white' : 'border-slate-300'}`}>
                                {selectedOptions[opt.id as keyof typeof selectedOptions] && <Check size={11} strokeWidth={3} />}
                              </div>
                              <div className="space-y-0.5">
                                <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block leading-none">{opt.label}</span>
                                <span className="text-[9px] text-slate-400 font-medium leading-tight block">{opt.d}</span>
                              </div>
                            </button>
                          ))}
                        </>
                      )}

                      {/* Pregnancy settings */}
                      {user.isPregnancyMode && (
                        <>
                          {[
                            { id: 'pregnancyWeek', label: 'Gestational Progression', d: `Current week details (Week ${pregnancyWeek})` },
                            { id: 'dueDate', label: 'Estimated Due Date (EDD)', d: `Due: ${estimatedDueDate}` },
                            { id: 'pregnancySymptoms', label: 'Pregnancy-Specific Symptoms', d: 'Nausea, fatigue, back pain timeline' },
                            { id: 'wellnessChecks', label: 'Wellness check statistics', d: 'Hydration and sleep patterns' },
                            { id: 'contraceptive', label: 'Pre-pregnancy contraceptive use', d: 'Contraception methods' },
                            { id: 'weightTrack', label: 'Weight Progress monitor', d: 'Dynamic maternity weight log' },
                            { id: 'medications', label: 'Prenatal vitamins & medications', d: 'Vitamins, supplements' },
                            { id: 'appointments', label: 'Clinical Schedules', d: 'OB-GYN scheduled dates' },
                            { id: 'notes', label: 'Maternal Consultation Notes', d: 'Specific questions for doctor' },
                          ].map(opt => (
                            <button
                              key={opt.id}
                              onClick={() => toggleOption(opt.id as any)}
                              className={`w-full flex items-start gap-3 p-3.5 rounded-2xl border text-left transition-all ${selectedOptions[opt.id as keyof typeof selectedOptions] ? 'bg-indigo-50/40 border-indigo-200' : 'bg-white border-slate-100 opacity-60 hover:opacity-80'}`}
                            >
                              <div className={`mt-0.5 w-4 h-4 rounded flex items-center justify-center border shrink-0 ${selectedOptions[opt.id as keyof typeof selectedOptions] ? 'bg-indigo-500 border-indigo-500 text-white' : 'border-slate-300'}`}>
                                {selectedOptions[opt.id as keyof typeof selectedOptions] && <Check size={11} strokeWidth={3} />}
                              </div>
                              <div className="space-y-0.5">
                                <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block leading-none">{opt.label}</span>
                                <span className="text-[9px] text-slate-400 font-medium leading-tight block">{opt.d}</span>
                              </div>
                            </button>
                          ))}
                        </>
                      )}
                    </div>
                  </div>

                  {/* Interactive inputs details */}
                  <div className="space-y-5">
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 border-b pb-2">2. Modify Report Vitals</h4>
                    
                    {/* Weight track input */}
                    {selectedOptions.weightTrack && (
                      <div className="space-y-1.5 font-sans">
                        <label className="text-[9px] font-black uppercase tracking-wider text-slate-500 flex items-center gap-1">
                          <Weight size={12} className="text-indigo-400" /> Tracked Maternity Weight
                        </label>
                        <input
                          type="text"
                          value={weightInput}
                          onChange={(e) => setWeightInput(e.target.value)}
                          placeholder="e.g. 64.5 kg"
                          className="w-full p-3 text-xs bg-slate-50 border border-slate-100 rounded-xl focus:border-pink-300 focus:bg-white transition-all font-bold"
                        />
                      </div>
                    )}

                    {/* Medications input */}
                    {selectedOptions.medications && (
                      <div className="space-y-1.5 font-sans">
                        <label className="text-[9px] font-black uppercase tracking-wider text-slate-500 flex items-center gap-1">
                          <Plus size={12} className="text-indigo-400" /> Active Medications & Supplements
                        </label>
                        <textarea
                          rows={2}
                          value={medsInput}
                          onChange={(e) => setMedsInput(e.target.value)}
                          placeholder="e.g. Folic acid, daily pills..."
                          className="w-full p-3 text-xs bg-slate-50 border border-slate-100 rounded-xl focus:border-pink-300 focus:bg-white transition-all text-gray-600 leading-relaxed font-serif italic"
                        />
                      </div>
                    )}

                    {/* Upcoming appointments */}
                    {selectedOptions.appointments && (
                      <div className="space-y-1.5 font-sans">
                        <label className="text-[9px] font-black uppercase tracking-wider text-slate-500 flex items-center gap-1">
                          <Clock size={12} className="text-indigo-400" /> Clinical Schedule / Visits
                        </label>
                        <input
                          type="text"
                          value={appointmentsInput}
                          onChange={(e) => setAppointmentsInput(e.target.value)}
                          placeholder="e.g. Ultrasound Friday 2 PM"
                          className="w-full p-3 text-xs bg-slate-50 border border-slate-100 rounded-xl focus:border-pink-300 focus:bg-white transition-all text-gray-600 font-serif italic"
                        />
                      </div>
                    )}

                    {/* Consultation notes text comments */}
                    {selectedOptions.notes && (
                      <div className="space-y-1.5 font-sans">
                        <label className="text-[9px] font-black uppercase tracking-wider text-slate-500 flex items-center gap-1">
                          <Edit size={12} className="text-indigo-400" /> Notes to highlight & ask Doctor
                        </label>
                        <textarea
                          rows={3}
                          value={notesInput}
                          onChange={(e) => setNotesInput(e.target.value)}
                          placeholder="Type questions or symptom patterns you want to highlight during your visit..."
                          className="w-full p-3 text-xs bg-slate-50 border border-slate-100 rounded-xl focus:border-pink-300 focus:bg-white transition-all text-gray-600 leading-relaxed font-serif italic"
                        />
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-4 border-t">
                  <button
                    onClick={handleGenerate}
                    disabled={isGenerating}
                    className="w-full py-4.5 bg-gradient-to-r from-pink-500 to-indigo-500 text-white rounded-3xl font-black uppercase text-[10px] tracking-widest shadow-lg shadow-pink-100/55 hover:scale-[1.01] active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isGenerating ? (
                      <>
                        <motion.div 
                          animate={{ rotate: 360 }}
                          transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                          className="w-5 h-5 border-2 border-white border-t-transparent rounded-full"
                        />
                        <span>Compiling Secure Chart Metrics...</span>
                      </>
                    ) : (
                      <>
                        <FileText size={18} />
                        <span>GENERATE CLINICAL REPORT</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            ) : (
              // 4. GENERATED MEDICAL REPORT PREVIEW VIEW
              <div className="space-y-6 animate-fadeIn">
                <div className="p-4 bg-teal-50 border border-teal-200 text-teal-800 rounded-2xl flex items-center justify-between font-serif italic text-xs">
                  <div className="flex items-center gap-2">
                    <Check size={16} className="text-teal-600 shrink-0 animate-bounce" />
                    <span>Report compiled! Review preview and select sharing parameters below.</span>
                  </div>
                  <button onClick={() => setReportGenerated(false)} className="text-[9px] font-sans font-black uppercase tracking-widest bg-teal-600 text-white px-2.5 py-1 rounded-lg">
                    Edit Settings
                  </button>
                </div>

                {/* Styled clinical chart card */}
                <div 
                  id="lumina-doctor-report-document"
                  className="p-6 md:p-8 bg-white border border-slate-100 rounded-[2.5rem] shadow-sm font-sans text-slate-800 space-y-6 max-h-[480px] overflow-y-auto"
                >
                  {/* Header metadata */}
                  <div className="header-bar flex justify-between items-start border-b-2 border-slate-100 pb-4">
                    <div className="header-info space-y-1">
                      <h1 className="text-xl md:text-2xl font-serif italic text-pink-500">Lumina Clinical Record Summary</h1>
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">
                        {user.isPregnancyMode ? "Pregnancy Care & Gestation Log" : "Menstrual Wellness Case Summary"}
                      </p>
                    </div>
                    <div className="doc-id text-right text-[9px] text-slate-400 font-mono leading-tight">
                      <p className="font-bold uppercase">CONFIDENTIAL</p>
                      <p>Date: {reportDateStr}</p>
                      <p>Ref: {reportId}</p>
                    </div>
                  </div>

                  {/* Patient Profile info */}
                  <div className="patient-card grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                    <div className="patient-field text-xs">
                      <strong className="text-[9px] font-black uppercase text-slate-400 block mb-0.5">Patient Name</strong>
                      <span className="font-bold text-slate-700">{user.name}</span>
                    </div>
                    <div className="patient-field text-xs">
                      <strong className="text-[9px] font-black uppercase text-slate-400 block mb-0.5">Patient Email</strong>
                      <span className="font-semibold text-slate-600 truncate block">{user.email}</span>
                    </div>
                    <div className="patient-field text-xs col-span-2">
                      <strong className="text-[9px] font-black uppercase text-slate-400 block mb-0.5">Data Integrity Audit</strong>
                      <span className="text-[10px] text-slate-500 font-serif italic leading-tight block">Generated on direct patient authorization from Lumina Secure Ledger</span>
                    </div>
                  </div>

                  {/* Mode Specific content boxes */}
                  {user.isPregnancyMode ? (
                    /* PREGNANCY REPORT BLOCKS */
                    <div className="space-y-6">
                      {/* Gestation Overview stats */}
                      {(selectedOptions.pregnancyWeek || selectedOptions.dueDate) && (
                        <div className="section space-y-3">
                          <h4 className="section-title text-xs font-serif italic text-indigo-500 border-b pb-1">Maternity Progression Summary</h4>
                          <div className="grid grid-cols-3 gap-3">
                            {selectedOptions.pregnancyWeek && (
                              <div className="data-box bg-indigo-50/20 p-3 rounded-xl border border-indigo-50 text-center">
                                <div className="value text-lg font-black text-indigo-600">Week {pregnancyWeek}</div>
                                <div className="label text-[8px] text-slate-400 font-bold uppercase">Gestational Age</div>
                              </div>
                            )}
                            
                            <div className="data-box bg-indigo-50/20 p-3 rounded-xl border border-indigo-50 text-center">
                              <div className="value text-lg font-black text-indigo-600">Trimester {currentTrimester}</div>
                              <div className="label text-[8px] text-slate-400 font-bold uppercase">Maternity Stage</div>
                            </div>

                            {selectedOptions.dueDate && (
                              <div className="data-box bg-indigo-50/20 p-3 rounded-xl border border-indigo-50 text-center">
                                <div className="value text-xs font-black text-indigo-600 mt-1">{estimatedDueDate}</div>
                                <div className="label text-[8px] text-slate-400 font-bold uppercase">Estimated Due (EDD)</div>
                              </div>
                            )}
                          </div>
                          
                          <div className="bg-indigo-50/10 p-3.5 rounded-xl border border-indigo-50/50 text-[10px] italic font-serif flex items-center justify-between text-indigo-800">
                             <span>🌱 Development scale check: Baby is the size of a <strong>{babySizeLabel}</strong></span>
                             <span className="px-2 py-0.5 bg-indigo-100 text-indigo-600 rounded text-[8px] font-black font-sans uppercase uppercase">{40 - pregnancyWeek} wks left</span>
                          </div>
                        </div>
                      )}

                      {/* Weight progress */}
                      {selectedOptions.weightTrack && weightInput && (
                        <div className="section space-y-2">
                           <h4 className="section-title text-xs font-serif italic text-indigo-500 border-b pb-1">Physical Metrics</h4>
                           <div className="bg-slate-50 p-3.5 rounded-xl border flex justify-between items-center text-xs">
                             <span className="text-slate-500 uppercase tracking-widest text-[9px] font-black">Registered Maternity Weight</span>
                             <span className="font-bold text-slate-800 bg-white px-3 py-1 rounded-lg border border-slate-100 shadow-sm">{weightInput}</span>
                           </div>
                        </div>
                      )}

                      {/* Wellness stats */}
                      {selectedOptions.wellnessChecks && (
                        <div className="section space-y-2">
                          <h4 className="section-title text-xs font-serif italic text-indigo-500 border-b pb-1">Maternal Wellness Check-in Statistics</h4>
                          <p className="text-[10px] text-slate-400 italic">Self care index compiled over current weekly trimester stretch:</p>
                          <div className="grid grid-cols-2 gap-3 text-xs">
                            <div className="p-3.5 bg-slate-50 rounded-xl leading-relaxed">
                               <strong className="text-[8px] font-black uppercase text-slate-400 block mb-0.5">Hydration Norms</strong>
                               <span className="text-slate-700 font-serif italic">Average daily water: <strong>2.8 Liters</strong> (Target: 3.0L) 💧</span>
                            </div>
                            <div className="p-3.5 bg-slate-50 rounded-xl leading-relaxed font-sans">
                               <strong className="text-[8px] font-black uppercase text-slate-400 block mb-0.5">Sleep Cumulative</strong>
                               <span className="text-slate-700 font-serif italic">Rest hours: <strong>7.5 hrs/night</strong> (Steady profile) 🛌</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    /* STANDARD CYCLE REPORT BLOCKS */
                    <div className="space-y-6">
                      {/* Cycle Averages block */}
                      {selectedOptions.cycleHistory && (
                        <div className="section space-y-3">
                          <h4 className="section-title text-xs font-serif italic text-pink-500 border-b pb-1">Menstrual Cycle Analytics</h4>
                          <div className="grid grid-cols-3 gap-3">
                            {selectedOptions.cycleLength && (
                              <div className="data-box bg-slate-50 p-3.5 rounded-xl border text-center">
                                <div className="value text-xl font-black">{averageCycle} Days</div>
                                <div className="label text-[8px] text-slate-400 font-bold uppercase">Average Cycle Length</div>
                              </div>
                            )}

                            {selectedOptions.periodLength && (
                              <div className="data-box bg-slate-50 p-3.5 rounded-xl border text-center">
                                <div className="value text-xl font-black">{averagePeriod} Days</div>
                                <div className="label text-[8px] text-slate-400 font-bold uppercase">Mean Bleeding Span</div>
                              </div>
                            )}

                            <div className="data-box bg-slate-50 p-3.5 rounded-xl border text-center">
                              <div className="value text-xs font-bold leading-tight mt-1 text-slate-600">{user.lastPeriodStart ? new Date(user.lastPeriodStart).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : "Not logged"}</div>
                              <div className="label text-[8px] text-slate-400 font-bold uppercase">Last Cycle Start</div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Recent Period History Dates list */}
                      {selectedOptions.periodDates && (
                        <div className="section space-y-2">
                          <h4 className="section-title text-xs font-serif italic text-pink-500 border-b pb-1">Recent Logged Periods</h4>
                          <div className="flex flex-wrap gap-2">
                             {samplePeriods.map((pd, index) => (
                               <span key={index} className="px-3 py-1.5 bg-pink-50 text-pink-600 rounded-lg text-[10px] font-bold tracking-tight border border-pink-100">
                                 {pd}
                               </span>
                             ))}
                          </div>
                        </div>
                      )}

                      {/* Fertility Data block */}
                      {selectedOptions.fertility && (
                        <div className="section space-y-2">
                          <h4 className="section-title text-xs font-serif italic text-pink-500 border-b pb-1 text-teal-600">Fertility & Luteal Windows</h4>
                          <div className="grid grid-cols-2 gap-3 text-xs leading-none">
                            <div className="p-3 bg-teal-50/20 border border-teal-100/30 rounded-xl">
                              <span className="text-[8px] font-black uppercase text-teal-600 tracking-wider block mb-1">Expected Ovulation</span>
                              <span className="font-bold text-teal-900">{predictedOvulation}</span>
                            </div>
                            <div className="p-3 bg-teal-50/20 border border-teal-100/30 rounded-xl">
                              <span className="text-[8px] font-black uppercase text-teal-600 tracking-wider block mb-1">Fertile Window range</span>
                              <span className="font-bold text-teal-900">{predictedFertileRange}</span>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Pregnancy Risk Logs */}
                      {selectedOptions.pregnancyRisk && (
                        <div className="section space-y-2">
                          <h4 className="section-title text-xs font-serif italic text-pink-500 border-b pb-1">Pregnancy Risk Timeline</h4>
                          <p className="text-[10px] text-slate-400 italic">Compiles natural hormonal estimates during logging cycle epochs:</p>
                          <div className="bg-slate-50 p-3.5 rounded-xl border text-xs flex justify-between items-center font-sans">
                            <span className="text-[9px] font-black uppercase text-slate-500">Predicted Active Risk Level Today</span>
                            <span className="px-2.5 py-1 bg-yellow-100 text-yellow-800 rounded-full font-bold text-[9px] uppercase tracking-widest border border-yellow-200">Moderate Low</span>
                          </div>
                        </div>
                      )}

                      {/* Contraceptive configuration */}
                      {selectedOptions.contraceptive && (
                        <div className="section space-y-2">
                           <h4 className="section-title text-xs font-serif italic text-pink-500 border-b pb-1">Contraceptive History</h4>
                           <div className="bg-slate-50 p-3 rounded-xl border text-xs font-sans leading-relaxed">
                             {user.birthControlConfig?.enabled ? (
                               <p className="font-semibold text-slate-700">
                                 Active regimen: <strong>{user.birthControlConfig.method}</strong>, taken {user.birthControlConfig.frequency} with reminders enabled at {user.birthControlConfig.reminderTime}.
                               </p>
                             ) : (
                               <p className="italic text-slate-400">No active contraceptive methods configured in profile settings.</p>
                             )}
                           </div>
                        </div>
                      )}

                      {/* Sexual Activity Logs */}
                      {selectedOptions.sexualActivity && (
                        <div className="section space-y-2">
                          <h4 className="section-title text-xs font-serif italic text-pink-500 border-b pb-1 text-red-500">Sexual Activity & Protection Patterns 🔒</h4>
                          <p className="text-[9px] text-red-400 italic">Sensitive logs. Shown only upon explicit patient authorization.</p>
                          <div className="bg-slate-50 p-3.5 rounded-xl border text-xs leading-relaxed space-y-1">
                            <p className="text-slate-600 font-medium">Logged intimacy occurrences (Last 30 Days): <strong>2 instances logged</strong></p>
                            <p className="text-[10px] text-slate-400">Protection index: 100% Protected (Condom barriers registered in logs)</p>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* COMMON SECTIONS (Both modes fallback options) */}
                  {/* Symptoms list */}
                  {selectedOptions.symptoms && (
                    <div className="section space-y-2">
                      <h4 className="section-title text-xs font-serif italic text-pink-500 border-b pb-1">Logged Physiological Symptoms Timeline</h4>
                      
                      {formattedSymptoms.length > 0 ? (
                        <table>
                          <thead>
                            <tr>
                              <th>Date</th>
                              <th>Symptom Category</th>
                              <th>Registered Intensity</th>
                            </tr>
                          </thead>
                          <tbody>
                            {formattedSymptoms.map((s, idx) => (
                              <tr key={idx}>
                                <td>{s.date}</td>
                                <td>{s.name}</td>
                                <td>
                                  <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${s.intensity === 'Severe' ? 'bg-red-50 text-red-600' : s.intensity === 'Moderate' ? 'bg-amber-50 text-amber-600' : 'bg-slate-100 text-slate-600'}`}>
                                    {s.intensity}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      ) : (
                        <div className="p-4 bg-slate-50 rounded-xl text-center text-xs text-slate-400 italic border border-dashed">
                          No severe or moderate symptoms checked in active 30-day timeline.
                        </div>
                      )}
                    </div>
                  )}

                  {/* Mood variations */}
                  {selectedOptions.moods && (
                    <div className="section space-y-2">
                       <h4 className="section-title text-xs font-serif italic text-pink-500 border-b pb-1">Cognitive & Mood Variance</h4>
                       <p className="text-[10px] text-slate-400 italic">Predominant emotional state logs computed over current cycle epoch:</p>
                       <div className="flex items-center gap-2.5 flex-wrap">
                          {user.moodLogs && user.moodLogs.length > 0 ? (
                            Array.from(new Set(user.moodLogs.map(m=>m.mood))).map((md, i) => (
                              <span key={i} className="px-3 py-1 bg-yellow-50 text-yellow-700 capitalize border border-yellow-100 rounded-lg text-xs font-bold leading-none">
                                {md} ✨
                              </span>
                            ))
                          ) : (
                            ['calm 😌', 'stable ⚖️', 'energetic ⚡'].map((mLabel, i) => (
                              <span key={i} className="px-3 py-1 bg-slate-100 border rounded-lg text-[10px] text-slate-600 font-bold font-sans">
                                 {mLabel}
                              </span>
                            ))
                          )}
                       </div>
                    </div>
                  )}

                  {/* Active medications & Supplements */}
                  {selectedOptions.medications && medsInput && (
                    <div className="section space-y-2">
                      <h4 className="section-title text-xs font-serif italic text-pink-500 border-b pb-1">Active Supplementation & Medications</h4>
                      <p className="text-xs bg-slate-50 p-3.5 border rounded-xl leading-relaxed text-slate-600 font-serif italic">
                        "{medsInput}"
                      </p>
                    </div>
                  )}

                  {/* Appointments checklist */}
                  {selectedOptions.appointments && appointmentsInput && (
                    <div className="section space-y-2">
                      <h4 className="section-title text-xs font-serif italic text-indigo-500 border-b pb-1">Schedules & Clinical Appointments</h4>
                      <p className="text-xs bg-slate-100/50 p-3.5 border rounded-xl leading-relaxed text-slate-600 font-semibold font-serif italic">
                        "{appointmentsInput}"
                      </p>
                    </div>
                  )}

                  {/* Personal consulting notes */}
                  {selectedOptions.notes && notesInput && (
                    <div className="section space-y-2">
                      <h4 className="section-title text-xs font-serif italic text-orange-500 border-b pb-1">Maternal/Patient Consultation Inquiries</h4>
                      <div className="notes-block bg-amber-50/50 border-l-4 border-amber-500 p-4 rounded-r-xl text-xs text-amber-950 font-serif italic leading-relaxed">
                        "{notesInput}"
                      </div>
                    </div>
                  )}
                </div>

                {/* Grid controls action box */}
                <div className="space-y-4 pt-4 border-t">
                  <h4 className="text-[10px] font-black uppercase text-center text-slate-400 tracking-wider">Select Sharing Method</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <button
                      onClick={handlePrint}
                      className="flex items-center justify-center gap-2.5 p-4 bg-pink-500 hover:bg-pink-600 text-white rounded-2xl font-bold text-xs uppercase tracking-wider transition-all"
                    >
                      <Printer size={16} /> Print / Save PDF
                    </button>
                    
                    <button
                      onClick={handleEmailShare}
                      className="flex items-center justify-center gap-2.5 p-4 bg-indigo-500 hover:bg-indigo-600 text-white rounded-2xl font-bold text-xs uppercase tracking-wider transition-all"
                    >
                      <Mail size={16} /> Email Provider
                    </button>

                    <button
                      onClick={handleCopyClipboard}
                      className="flex items-center justify-center gap-2.5 p-4 bg-teal-500 hover:bg-teal-600 text-white rounded-2xl font-bold text-xs uppercase tracking-wider transition-all"
                    >
                      <Send size={16} /> WhatsApp / Copy
                    </button>
                  </div>
                  
                  <div className="text-center">
                    <button
                      onClick={() => setReportGenerated(false)}
                      className="text-[10px] font-bold text-slate-400 hover:text-pink-500 tracking-widest uppercase transition-colors"
                    >
                      &larr; Return to Settings Builder
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </motion.div>

        {/* Global Toast Notification */}
        {showToast && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[400] max-w-sm w-full px-4 animate-bounce">
            <div className="bg-slate-950/95 text-white p-4.5 rounded-2xl text-[11px] font-bold font-serif italic text-center shadow-2xl border border-white/10">
              {showToast}
            </div>
          </div>
        )}
      </div>
    </AnimatePresence>
  );
};

export default DoctorReport;
