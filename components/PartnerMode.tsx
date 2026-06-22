
import React, { useEffect, useState } from 'react';
import { User, Reminder, ReceivedComfort } from '../types';
import { getGiftIdeas, getCommunicationTips, getLoveNoteIdeas, getSupportMission } from '../services/gemini';
import { 
  createInvite, 
  acceptInvite, 
  disconnectPartner, 
  sendGift, 
  subscribeToUser, 
  subscribeToGifts,
  syncUser
} from '../services/firebaseService';

interface PartnerModeProps {
  user: User;
  reminders: Reminder[];
  setReminders: React.Dispatch<React.SetStateAction<Reminder[]>>;
  setUser: React.Dispatch<React.SetStateAction<User | null>>;
}

const PartnerMode: React.FC<PartnerModeProps> = ({ user, reminders, setReminders, setUser }) => {
  const [giftIdeas, setGiftIdeas] = useState<string[]>([]);
  const [supportMission, setSupportMission] = useState<string[]>([]);
  const [commTips, setCommTips] = useState<string>('');
  const [loveNotes, setLoveNotes] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [newReminderText, setNewReminderText] = useState('');
  const [newReminderTime, setNewReminderTime] = useState('');
  const [activeTab, setActiveTab] = useState<'mission' | 'ideas' | 'notes' | 'reminders' | 'calendar'>('mission');
  const [partnerCodeInput, setPartnerCodeInput] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [connectionRequest, setConnectionRequest] = useState<any | null>(null);
  const [onboardingStep, setOnboardingStep] = useState<number>(user.isPartner && !user.onboardingCompleted ? 1 : 0);
  const [partnerStep, setPartnerStep] = useState<number>(() => {
    if (!user.isPartner) return 0;
    if (!user.isPartnerLinked) return 0;
    if (!user.partnerRequest) return 1;
    if (user.partnerRequest.status === 'pending') return 3;
    if (user.partnerRequest.status === 'approved' && !user.onboardingCompleted) return 4;
    if (user.partnerRequest.status === 'declined') return 5;
    return 6;
  });
  const [requestedReceives, setRequestedReceives] = useState<string[]>(() => {
    return user.partnerRequest?.requestedReceives || [
      "Period Start Notifications",
      "Period End Notifications",
      "Symptom Updates",
      "Mood Updates",
      "Wellness Check-ins",
      "Partner Support Tips"
    ];
  });
  const [notificationStyle, setNotificationStyle] = useState<'gentle' | 'full'>('gentle');
  const [copied, setCopied] = useState(false);
  const [linkOnlyCopied, setLinkOnlyCopied] = useState(false);
  const [showDisconnectConfirm, setShowDisconnectConfirm] = useState(false);
  const [linkedUser, setLinkedUser] = useState<User | null>(null);
  const [receivedGifts, setReceivedGifts] = useState<ReceivedComfort[]>([]);
  const [generatingLink, setGeneratingLink] = useState(false);
  const [showQRCode, setShowQRCode] = useState(false);
  const [inviteSuccess, setInviteSuccess] = useState(false);

  useEffect(() => {
    if (user.isPartner && user.isPartnerLinked) {
      if (!user.partnerRequest) {
        setPartnerStep(1);
      } else if (user.partnerRequest.status === 'pending') {
        setPartnerStep(3);
      } else if (user.partnerRequest.status === 'approved' && !user.onboardingCompleted) {
        setPartnerStep(4);
      } else if (user.partnerRequest.status === 'declined') {
        setPartnerStep(5);
      } else if (user.onboardingCompleted) {
        setPartnerStep(6);
      }
    }
  }, [user.isPartner, user.isPartnerLinked, user.partnerRequest?.status, user.onboardingCompleted]);

  useEffect(() => {
    // Check for invite link in URL
    const params = new URLSearchParams(window.location.search);
    const inviteCode = params.get('invite');
    if (inviteCode && !user.isPartnerLinked) {
      setPartnerCodeInput(inviteCode.toUpperCase());
    }
  }, [user.isPartnerLinked]);

  useEffect(() => {
    if (user.isPartnerLinked && user.partnerId) {
      const unsubUser = subscribeToUser(user.partnerId, (linked) => {
        if (linked) setLinkedUser(linked);
      });
      return () => unsubUser();
    }
  }, [user.isPartnerLinked, user.partnerId]);

  useEffect(() => {
    const unsubGifts = subscribeToGifts(user.id, (gifts) => {
      setReceivedGifts(gifts);
    });
    return () => unsubGifts();
  }, [user.id]);

  const targetUser = user.isPartner ? linkedUser : user;
  
  const currentPhase = (() => {
    if (!targetUser) return 'Luteal';
    if (targetUser.isPregnancyMode) return 'Pregnancy';
    
    const today = new Date();
    const lastStart = targetUser.lastPeriodStart ? new Date(targetUser.lastPeriodStart) : null;
    const cycleLen = targetUser.cycleLength || 28;
    const periodLen = targetUser.periodLength || 5;

    if (!lastStart) return 'Luteal';
    
    const diffTime = today.getTime() - lastStart.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    let day = (diffDays % cycleLen) + 1;
    if (day <= 0) day += cycleLen;

    if (day <= periodLen) return 'Menstrual';
    if (day <= cycleLen - 14) return 'Follicular';
    if (day <= cycleLen - 10) return 'Ovulatory';
    return 'Luteal';
  })();

  useEffect(() => {
    if (user.isPartner && targetUser) {
      setLoading(true);
      Promise.all([
        getGiftIdeas(currentPhase),
        getCommunicationTips(currentPhase),
        getLoveNoteIdeas(currentPhase),
        getSupportMission(currentPhase)
      ]).then(([ideas, tips, notes, mission]) => {
        setGiftIdeas(ideas);
        setCommTips(tips);
        setLoveNotes(notes);
        setSupportMission(mission);
        setLoading(false);
      });
    }
  }, [currentPhase, user.isPartner, targetUser]);

  const handleGenerateCode = async () => {
    // If a partnerCode already exists, we do nothing to prevent unnecessary delay or re-generating
    if (user.partnerCode) {
      setInviteSuccess(true);
      return;
    }
    setGeneratingLink(true);
    setInviteSuccess(false);
    // Add deliberate premium delay for loader visibility so they know it is building the tunnel
    await new Promise(resolve => setTimeout(resolve, 1500));
    try {
      const code = await createInvite(user.id, user.name);
      if (code) {
        setUser({ ...user, partnerCode: code });
        setInviteSuccess(true);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setGeneratingLink(false);
    }
  };

  const handleForceGenerateNewCode = async () => {
    setGeneratingLink(true);
    setInviteSuccess(false);
    await new Promise(resolve => setTimeout(resolve, 1500));
    try {
      const code = await createInvite(user.id, user.name);
      if (code) {
        setUser({ ...user, partnerCode: code });
        setInviteSuccess(true);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setGeneratingLink(false);
    }
  };

  const inviteLink = `${window.location.origin}?invite=${user.partnerCode || ''}`;

  const copyInviteLink = () => {
    const text = `Join my Partner Mode to stay connected 💞 ${inviteLink}`;
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const copyOnlyLink = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    navigator.clipboard.writeText(inviteLink).then(() => {
      setLinkOnlyCopied(true);
      setTimeout(() => setLinkOnlyCopied(false), 2000);
    });
  };

  const acceptConnection = () => {
    // This is called from the UI when a user opens an invite link and accepts
    setOnboardingStep(1);
  };

  const handleLinkPartner = async () => {
    if (!partnerCodeInput.trim()) return;
    setLoading(true);
    try {
      const inviteData = await acceptInvite(partnerCodeInput.toUpperCase(), user.id, user.name);
      if (inviteData) {
        setConnectionRequest(inviteData);
        setOnboardingStep(1);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to connect. Please check the code.');
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    if (user.partnerId) {
      await disconnectPartner(user.id, user.partnerId);
      setShowDisconnectConfirm(false);
      setUser({ 
        ...user, 
        isPartnerLinked: false, 
        partnerId: undefined, 
        partnerName: '', 
        isPartner: false, 
        partnerCode: undefined 
      });
    }
  };

  const sendDigitalComfort = async (type: ReceivedComfort['type']) => {
    if (user.partnerId) {
      await sendGift(user.name, user.id, user.partnerId, type);
      alert(`Sent a digital ${type} to ${user.partnerName}! It will bloom on her dashboard instantly. ✨`);
    } else {
      alert('Connect with a partner first to send a gift! 💞');
    }
  };

  const updateSharing = (key: keyof User['sharingSettings'], value: boolean) => {
    const updatedUser = {
      ...user,
      sharingSettings: { ...user.sharingSettings, [key]: value }
    };
    setUser(updatedUser);
    syncUser(updatedUser);
  };

  if (onboardingStep > 0 && connectionRequest) {
    return (
      <div className="space-y-8 animate-fadeIn pb-24 max-w-lg mx-auto min-h-[70vh] flex flex-col justify-center">
        {onboardingStep === 1 && (
          <div className="text-center space-y-8 animate-fadeIn">
            <div className="relative mx-auto w-32 h-32">
              <div className="w-32 h-32 bg-gradient-to-tr from-pink-100 to-rose-100 rounded-full flex items-center justify-center text-6xl shadow-inner">
                💞
              </div>
              <div className="absolute -top-2 -right-2 w-10 h-10 bg-green-400 rounded-full shadow-lg flex items-center justify-center text-white text-xl border-2 border-white">
                ✓
              </div>
            </div>
            <div className="space-y-4">
              <h2 className="text-3xl font-serif italic text-pink-900">
                You're now connected with {connectionRequest.name} 💞
              </h2>
              <p className="text-sm text-pink-400 leading-relaxed">
                You can now view cycle updates and support your partner better.
              </p>
            </div>
            <button 
              onClick={() => setOnboardingStep(2)}
              className="w-full py-5 bg-gradient-to-r from-pink-500 to-rose-500 text-white rounded-[2rem] font-bold uppercase text-xs tracking-widest shadow-xl shadow-pink-100"
            >
              Continue →
            </button>
          </div>
        )}

        {onboardingStep === 2 && (
          <div className="text-center space-y-8 animate-fadeIn">
            <div className="w-24 h-24 bg-pink-50 rounded-full flex items-center justify-center text-5xl mx-auto shadow-inner">👋</div>
            <div className="space-y-4">
              <h2 className="text-3xl font-serif italic text-pink-900">Welcome to Partner Mode</h2>
              <div className="space-y-3 text-sm text-pink-400 leading-relaxed">
                <p>• Stay informed about your partner's cycle</p>
                <p>• Get reminders and support tips</p>
                <p>• Be more present and understanding</p>
              </div>
            </div>
            <button 
              onClick={() => setOnboardingStep(3)}
              className="w-full py-5 bg-gradient-to-r from-pink-500 to-rose-500 text-white rounded-[2rem] font-bold uppercase text-xs tracking-widest shadow-xl shadow-pink-100"
            >
              Next
            </button>
          </div>
        )}

        {onboardingStep === 3 && (
          <div className="text-center space-y-8 animate-fadeIn">
            <h2 className="text-3xl font-serif italic text-pink-900">What You'll See</h2>
            <div className="grid grid-cols-1 gap-4 text-left">
              <div className="p-6 bg-white rounded-[2rem] border border-pink-50 shadow-sm flex items-center gap-5">
                <span className="text-3xl">📅</span>
                <div>
                  <h4 className="font-bold text-pink-900 text-sm">Cycle Updates</h4>
                  <p className="text-xs text-pink-300">Know when her period is approaching</p>
                </div>
              </div>
              <div className="p-6 bg-white rounded-[2rem] border border-pink-50 shadow-sm flex items-center gap-5">
                <span className="text-3xl">💡</span>
                <div>
                  <h4 className="font-bold text-pink-900 text-sm">Support Tips</h4>
                  <p className="text-xs text-pink-300">Get suggestions on how to help</p>
                </div>
              </div>
              <div className="p-6 bg-white rounded-[2rem] border border-pink-50 shadow-sm flex items-center gap-5">
                <span className="text-3xl">🎁</span>
                <div>
                  <h4 className="font-bold text-pink-900 text-sm">Care Reminders</h4>
                  <p className="text-xs text-pink-300">Never forget important moments</p>
                </div>
              </div>
            </div>
            <button 
              onClick={() => setOnboardingStep(4)}
              className="w-full py-5 bg-gradient-to-r from-pink-500 to-rose-500 text-white rounded-[2rem] font-bold uppercase text-xs tracking-widest shadow-xl shadow-pink-100"
            >
              Next
            </button>
          </div>
        )}

        {onboardingStep === 4 && (
          <div className="text-center space-y-8 animate-fadeIn">
            <div className="w-24 h-24 bg-indigo-50 rounded-full flex items-center justify-center text-5xl mx-auto shadow-inner">🔒</div>
            <div className="space-y-4">
              <h2 className="text-3xl font-serif italic text-indigo-900">Respect & Privacy 🔒</h2>
              <p className="text-sm text-indigo-400 leading-relaxed px-4">
                Your partner controls what you can see. Please respect their privacy and use this feature to support them.
              </p>
            </div>
            <button 
              onClick={() => setOnboardingStep(5)}
              className="w-full py-5 bg-indigo-500 text-white rounded-[2rem] font-bold uppercase text-xs tracking-widest shadow-xl shadow-indigo-100"
            >
              I Understand
            </button>
          </div>
        )}

        {onboardingStep === 5 && (
          <div className="text-center space-y-8 animate-fadeIn">
            <div className="w-24 h-24 bg-pink-50 rounded-full flex items-center justify-center text-5xl mx-auto shadow-inner">🎯</div>
            <div className="space-y-4">
              <h2 className="text-3xl font-serif italic text-pink-900">Personalization</h2>
              <p className="text-xs text-pink-300 uppercase font-bold tracking-widest">Notification Style</p>
              <div className="grid grid-cols-1 gap-3">
                <button 
                  onClick={() => setNotificationStyle('gentle')}
                  className={`p-6 rounded-[2rem] border transition-all text-left flex items-center justify-between ${notificationStyle === 'gentle' ? 'bg-pink-500 text-white border-pink-500' : 'bg-white text-pink-900 border-pink-100'}`}
                >
                  <div>
                    <h4 className="font-bold text-sm">Gentle Reminders</h4>
                    <p className={`text-[10px] ${notificationStyle === 'gentle' ? 'text-pink-100' : 'text-pink-300'}`}>Only important updates</p>
                  </div>
                  {notificationStyle === 'gentle' && <span>✓</span>}
                </button>
                <button 
                  onClick={() => setNotificationStyle('full')}
                  className={`p-6 rounded-[2rem] border transition-all text-left flex items-center justify-between ${notificationStyle === 'full' ? 'bg-pink-500 text-white border-pink-500' : 'bg-white text-pink-900 border-pink-100'}`}
                >
                  <div>
                    <h4 className="font-bold text-sm">Full Updates</h4>
                    <p className={`text-[10px] ${notificationStyle === 'full' ? 'text-pink-100' : 'text-pink-300'}`}>Detailed cycle notifications</p>
                  </div>
                  {notificationStyle === 'full' && <span>✓</span>}
                </button>
              </div>
            </div>
            <button 
              onClick={() => {
                setOnboardingStep(0);
                setConnectionRequest(null);
              }}
              className="w-full py-5 bg-gradient-to-r from-pink-500 to-rose-500 text-white rounded-[2rem] font-bold uppercase text-xs tracking-widest shadow-xl shadow-pink-100"
            >
              Finish Setup
            </button>
          </div>
        )}
      </div>
    );
  }

  if (connectionRequest) {
    return (
      <div className="space-y-8 animate-fadeIn pb-24 max-w-lg mx-auto">
        {/* 1. First Screen - Welcome + Context */}
        <header className="bg-gradient-to-br from-pink-500 to-rose-500 p-12 rounded-[3.5rem] shadow-2xl text-white text-center relative overflow-hidden">
          <div className="relative z-10">
            <h2 className="text-4xl font-serif italic mb-3">You've been invited 💞</h2>
            <p className="text-sm opacity-90 font-medium">
              <span className="font-bold">{connectionRequest.name}</span> has invited you to connect on Partner Mode.
            </p>
          </div>
          <div className="absolute top-0 right-0 p-8 opacity-10">
            <span className="text-9xl rotate-12">💌</span>
          </div>
        </header>

        {/* 2. User Identity Section */}
        <section className="bg-white p-10 rounded-[3.5rem] shadow-sm border border-pink-50 flex flex-col items-center gap-8">
          <div className="relative">
            <div className="w-28 h-28 bg-gradient-to-tr from-pink-100 to-rose-100 rounded-full flex items-center justify-center text-6xl shadow-inner border-4 border-white">
              {connectionRequest.name.charAt(0)}
            </div>
            <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-white rounded-full shadow-md flex items-center justify-center text-xl border border-pink-50">
              💞
            </div>
          </div>
          
          <div className="text-center space-y-1">
            <h3 className="text-2xl font-serif text-pink-900 italic">{connectionRequest.name}</h3>
            <p className="text-[10px] font-bold text-pink-300 uppercase tracking-[0.2em]">Your Blooming Partner</p>
          </div>

          {/* 4. Optional Preview (Smart UX) */}
          <div className="w-full grid grid-cols-1 gap-3">
            <div className="flex items-center gap-4 p-4 bg-pink-50/30 rounded-2xl border border-pink-50/50">
              <span className="text-xl">📊</span>
              <p className="text-xs text-pink-700 font-medium">View cycle updates & predictions</p>
            </div>
            <div className="flex items-center gap-4 p-4 bg-pink-50/30 rounded-2xl border border-pink-50/50">
              <span className="text-xl">⏰</span>
              <p className="text-xs text-pink-700 font-medium">Receive smart care reminders</p>
            </div>
            <div className="flex items-center gap-4 p-4 bg-pink-50/30 rounded-2xl border border-pink-50/50">
              <span className="text-xl">🛡️</span>
              <p className="text-xs text-pink-700 font-medium">Support your partner better</p>
            </div>
          </div>

          {/* 🔐 Privacy Message */}
          <div className="p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100 flex items-center gap-3">
            <span className="text-lg">🔒</span>
            <p className="text-[10px] text-indigo-400 font-bold uppercase tracking-wider leading-relaxed">
              Your connection is private and secure. Only approved data will be shared.
            </p>
          </div>

          {/* ✅ Action Buttons */}
          <div className="w-full space-y-3">
            <button 
              onClick={acceptConnection}
              className="w-full py-5 bg-gradient-to-r from-pink-500 to-rose-500 text-white rounded-[2rem] font-bold uppercase text-xs tracking-widest shadow-xl shadow-pink-100 hover:scale-[1.02] active:scale-95 transition-all"
            >
              Accept & Connect 💞
            </button>
            <button 
              onClick={() => setConnectionRequest(null)}
              className="w-full py-4 bg-white border-2 border-pink-100 text-pink-400 rounded-[2rem] font-bold uppercase text-[10px] tracking-widest hover:bg-pink-50 transition-colors"
            >
              Decline ❌
            </button>
          </div>
        </section>

        {/* 📱 2. If App is Not Installed (Simulated Fallback) */}
        <div className="text-center space-y-4 p-6">
          <p className="text-[10px] font-bold text-gray-300 uppercase tracking-widest">Not on Lumina yet?</p>
          <div className="flex justify-center gap-4">
            <button className="px-6 py-2 bg-gray-100 text-gray-500 rounded-full text-[9px] font-bold uppercase tracking-widest">Download App</button>
            <button className="px-6 py-2 text-pink-400 text-[9px] font-bold uppercase tracking-widest underline underline-offset-4">Already installed?</button>
          </div>
        </div>
      </div>
    );
  }

  const addReminder = (text?: string) => {
    const finalStep = text || newReminderText;
    if (!finalStep.trim()) return;
    const reminder: Reminder = {
      id: Math.random().toString(36).substr(2, 9),
      text: finalStep,
      time: newReminderTime || 'Today',
      isCompleted: false
    };
    setReminders([...reminders, reminder]);
    setNewReminderText('');
    setNewReminderTime('');
  };

  const toggleReminder = (id: string) => {
    setReminders(reminders.map(r => r.id === id ? { ...r, isCompleted: !r.isCompleted } : r));
  };

  const deleteReminder = (id: string) => {
    setReminders(reminders.filter(r => r.id !== id));
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('Copied to clipboard, hero! 💌');
  };

  const finishOnboarding = () => {
    setUser({ ...user, onboardingCompleted: true });
    setPartnerStep(6);
  };

  if (user.isPartner && user.isPartnerLinked && partnerStep < 6) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center p-6 animate-fadeIn font-sans">
        <div className="w-full max-w-md bg-white rounded-[3rem] shadow-2xl border border-pink-50 p-10 space-y-8 relative overflow-hidden">
          {/* Progress Bar */}
          <div className="absolute top-0 left-0 w-full h-1.5 bg-pink-100/50">
            <div 
              className="h-full bg-pink-500 transition-all duration-500" 
              style={{ width: `${(partnerStep / 5) * 100}%` }}
            ></div>
          </div>

          {partnerStep === 1 && (
            <div className="text-center space-y-6 animate-fadeIn py-6">
              <div className="w-24 h-24 bg-pink-100 rounded-full flex items-center justify-center text-5xl mx-auto shadow-inner animate-pulse">🌸</div>
              <h2 className="text-3xl font-serif italic text-pink-900 leading-tight">
                {user.partnerName || 'Your partner'} invited you to connect on Lumina
              </h2>
              <p className="text-sm text-pink-500 leading-relaxed max-w-sm mx-auto">
                You are about to connect safely as {user.partnerName || 'their'}'s Partner. First, complete your companion connection permission setup.
              </p>
              <button 
                onClick={() => setPartnerStep(2)}
                className="w-full py-4.5 bg-gradient-to-r from-pink-500 to-rose-500 text-white rounded-2xl font-bold uppercase tracking-widest text-xs shadow-lg shadow-pink-150 hover:scale-[1.02] active:scale-95 transition-all"
              >
                Continue &rarr;
              </button>
            </div>
          )}

          {partnerStep === 2 && (
            <div className="space-y-6 animate-fadeIn py-4">
              <div className="text-center space-y-2">
                <span className="text-3xl">💕</span>
                <h2 className="text-2xl font-serif italic text-pink-905">What would you like to receive from your partner?</h2>
                <p className="text-[11px] text-pink-400 font-medium col-span-full">Select all the categories you request to stay synchronized with:</p>
              </div>

              <div className="max-h-[300px] overflow-y-auto pr-2 space-y-2 border border-pink-50/50 p-4 rounded-3xl bg-pink-50/5">
                {[
                  "Period Start Notifications",
                  "Period End Notifications",
                  "Ovulation Notifications",
                  "Fertility Window Updates",
                  "Pregnancy Updates",
                  "Symptom Updates",
                  "Mood Updates",
                  "Wellness Check-ins",
                  "Doctor Appointment Reminders",
                  "Self-Care Suggestions",
                  "Gift Reminders",
                  "Partner Support Tips",
                  "Low Pregnancy Risk Alerts",
                  "High Pregnancy Risk Alerts",
                  "Custom Messages From Partner"
                ].map((item) => {
                  const isChecked = requestedReceives.includes(item);
                  return (
                    <div 
                      key={item} 
                      onClick={() => {
                        if (isChecked) {
                          setRequestedReceives(requestedReceives.filter(r => r !== item));
                        } else {
                          setRequestedReceives([...requestedReceives, item]);
                        }
                      }}
                      className={`flex items-center gap-3 p-3 rounded-2xl border transition-all cursor-pointer text-left ${isChecked ? 'border-pink-300 bg-pink-50/20' : 'border-gray-100 hover:bg-gray-50'}`}
                    >
                      <div className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 ${isChecked ? 'border-pink-500 bg-pink-500 text-white animate-fadeIn' : 'border-gray-300'}`}>
                        {isChecked && <span className="text-xs">✓</span>}
                      </div>
                      <span className="text-xs font-semibold text-gray-750">{item}</span>
                    </div>
                  );
                })}
              </div>

              <button 
                onClick={async () => {
                  setLoading(true);
                  try {
                    const req = {
                      partnerId: user.partnerId || '',
                      partnerName: user.partnerName || '',
                      requestedReceives: requestedReceives,
                      status: 'pending' as const,
                      timestamp: new Date().toISOString()
                    };
                    const updatedUser = {
                      ...user,
                      partnerRequest: req,
                      onboardingCompleted: false
                    };
                    setUser(updatedUser);
                    await syncUser(updatedUser);
                    setPartnerStep(3);
                  } catch (err) {
                    console.error(err);
                  } finally {
                    setLoading(false);
                  }
                }}
                className="w-full py-4.5 bg-gradient-to-r from-pink-500 to-rose-500 text-white rounded-2xl font-bold uppercase tracking-widest text-xs shadow-lg cursor-pointer"
              >
                Send Request to Partner &rarr;
              </button>
            </div>
          )}

          {partnerStep === 3 && (
            <div className="text-center space-y-6 animate-fadeIn py-6">
              <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center text-3xl mx-auto shadow-inner animate-pulse">📨</div>
              <h2 className="text-3xl font-serif italic text-indigo-900 leading-tight">Request Sent!</h2>
              <div className="space-y-2 max-w-sm mx-auto">
                <p className="text-sm text-indigo-500 leading-relaxed">
                  We have sent your connection and privacy request to <span className="font-bold text-indigo-900">{user.partnerName || 'your partner'}</span>!
                </p>
                <p className="text-xs text-indigo-400 italic">
                  Once she reviews and approves your requested options, you'll be able to access your companion dashboard instantly.
                </p>
              </div>

              <div className="p-4 bg-indigo-50/40 rounded-3xl border border-indigo-150/10 text-left space-y-2">
                <p className="text-[10px] font-black uppercase tracking-widest text-indigo-450 col-span-full">Requested Categories ({requestedReceives.length})</p>
                <div className="flex flex-wrap gap-1.5 max-h-[120px] overflow-y-auto p-1">
                  {requestedReceives.map(r => (
                    <span key={r} className="px-2.5 py-1 bg-white border border-indigo-100 rounded-full text-[9px] font-semibold text-indigo-700">{r}</span>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-center gap-2 py-4">
                <div className="w-2 h-2 bg-indigo-600 rounded-full animate-ping"></div>
                <span className="text-[10px] font-black uppercase tracking-widest text-indigo-400">Waiting for {user.partnerName || 'partner'} approval...</span>
              </div>

              <button
                onClick={async () => {
                  if (confirm("Would you like to cancel and disconnect from your partner connection?")) {
                    await disconnectPartner(user.id, user.partnerId || '');
                    const updated = {
                      ...user,
                      partnerId: undefined,
                      partnerName: '',
                      isPartnerLinked: false,
                      partnerRequest: undefined,
                      isPartner: false
                    };
                    setUser(updated);
                    setPartnerStep(0);
                  }
                }}
                className="text-[10px] uppercase tracking-widest font-bold text-gray-400 hover:text-rose-500 transition-colors"
              >
                Disconnect & Cancel Connection 💔
              </button>
            </div>
          )}

          {partnerStep === 4 && (
            <div className="text-center space-y-6 animate-fadeIn py-6">
              <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center text-5xl mx-auto shadow-inner animate-bounce">🎉</div>
              <h2 className="text-3xl font-serif italic text-green-900">Request Approved!</h2>
              <p className="text-sm text-green-700 leading-relaxed max-w-sm mx-auto">
                <span className="font-bold">{user.partnerName}</span> has approved and completed setting up your custom sharing permissions! Let's enter your companion workspace.
              </p>
              <button 
                onClick={async () => {
                  setLoading(true);
                  try {
                    const updatedUser = { ...user, onboardingCompleted: true };
                    setUser(updatedUser);
                    await syncUser(updatedUser);
                    setPartnerStep(6);
                  } catch (err) {
                    console.error(err);
                  } finally {
                    setLoading(false);
                  }
                }}
                className="w-full py-4.5 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-2xl font-bold uppercase tracking-widest text-xs shadow-xl hover:scale-[1.02] active:scale-95 transition-all w-full cursor-pointer animate-pulse"
              >
                Enter Companion Dashboard 💖
              </button>
            </div>
          )}

          {partnerStep === 5 && (
            <div className="text-center space-y-6 animate-fadeIn py-6">
              <div className="w-20 h-20 bg-rose-50 rounded-full flex items-center justify-center text-4xl mx-auto shadow-inner">💔</div>
              <h2 className="text-3xl font-serif italic text-rose-900 leading-tight">Connection Declined</h2>
              <p className="text-sm text-rose-600 leading-relaxed px-4">
                Your connection request has been declined or unlinked by {user.partnerName || 'your partner'}.
              </p>
              <button 
                onClick={async () => {
                  setLoading(true);
                  try {
                    await disconnectPartner(user.id, user.partnerId || '');
                    const updated = {
                      ...user,
                      partnerId: undefined,
                      partnerName: '',
                      isPartnerLinked: false,
                      partnerRequest: undefined,
                      isPartner: false
                    };
                    setUser(updated);
                    setPartnerStep(0);
                  } catch (err) {
                    console.error(err);
                  } finally {
                    setLoading(false);
                  }
                }}
                className="w-full py-4 bg-rose-500 text-white rounded-2xl font-bold uppercase text-xs tracking-widest shadow-lg shadow-rose-100 hover:bg-rose-600 cursor-pointer"
              >
                Disconnect & Try Again 💔
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (!user.isPartner && !user.isPartnerLinked) {
    return (
      <div className="space-y-8 animate-fadeIn pb-24 font-sans select-none">
        <header className="bg-gradient-to-br from-pink-500 to-rose-500 p-10 rounded-[3rem] shadow-xl text-white text-center">
          <h2 className="text-4xl font-serif italic mb-2">Partner Mode</h2>
          <p className="text-sm opacity-90">Connect with YOUR partner privately & securely</p>
        </header>

        <section className="bg-white p-10 rounded-[3rem] shadow-sm border border-pink-50 flex flex-col items-center gap-8">
          <div className="w-20 h-20 bg-pink-50 rounded-full flex items-center justify-center text-4xl shadow-inner">
            {generatingLink ? "💖" : "🔗"}
          </div>

          <div className="w-full space-y-4">
            {generatingLink ? (
              <div className="p-8 text-center space-y-4 animate-pulse bg-pink-50/20 rounded-[2.5rem] border border-pink-50">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-r-2 border-pink-500 border-t-2"></div>
                <p className="text-sm font-bold text-pink-600">Creating your private partner connection...</p>
                <p className="text-[10px] text-gray-450 italic">Establishing a secure, private sharing channel...</p>
              </div>
            ) : (
              <>
                {!user.partnerCode ? (
                  <button 
                    onClick={handleGenerateCode}
                    className="w-full py-4.5 bg-gradient-to-r from-pink-500 to-rose-400 text-white rounded-2xl font-bold uppercase text-xs tracking-widest shadow-lg shadow-pink-100 hover:scale-[1.01] active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <span>🔗</span> Generate Invite Link
                  </button>
                ) : (
                  <div className="space-y-6 animate-fadeIn">
                    
                    {/* Success Message Header */}
                    <div className="bg-gradient-to-br from-pink-500/5 to-rose-500/5 border border-pink-100 rounded-[2.5rem] p-6 text-center space-y-3">
                      <span className="text-3xl">✨</span>
                      <h3 className="text-lg font-serif italic font-extrabold text-pink-600">Partner Invitation Ready</h3>
                      <p className="text-[10px] text-gray-400 uppercase tracking-widest font-black">Invite Code</p>
                      <div className="bg-white py-3 px-8 rounded-2xl border-2 border-pink-100 inline-block text-2xl font-mono font-black text-pink-600 tracking-widest shadow-sm">
                        {user.partnerCode}
                      </div>
                    </div>

                    {/* Pre-existing Link Display */}
                    <div className="bg-pink-50/20 p-5 rounded-[2rem] border border-pink-50 space-y-2.5">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest text-left pl-1">Current Partner Link</p>
                      <div className="flex items-center gap-2 bg-white p-3 rounded-xl border border-pink-100">
                        <div className="text-xs text-pink-700 font-mono truncate flex-1 text-left">
                          lumina.app/invite/{user.partnerCode}
                        </div>
                        <button 
                          onClick={() => copyOnlyLink()}
                          className={`flex-shrink-0 px-4 py-1.5 rounded-lg border text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
                            linkOnlyCopied 
                              ? 'bg-green-500 border-green-500 text-white shadow-sm' 
                              : 'bg-white border-pink-100 text-pink-500 hover:bg-pink-50/30'
                          }`}
                        >
                          {linkOnlyCopied ? '✓ Copied' : '📋 Copy'}
                        </button>
                      </div>
                    </div>

                    {/* Share Channels */}
                    <div className="space-y-3">
                      <p className="text-[10px] font-bold text-pink-400 uppercase tracking-widest text-left pl-1">Share Options</p>
                      
                      <div className="grid grid-cols-2 gap-3">
                        {/* Copy Link Option */}
                        <button
                          onClick={copyInviteLink}
                          className="p-4 bg-white hover:bg-pink-50/30 border border-pink-50 rounded-2xl text-left transition-all flex flex-col justify-between gap-3 shadow-sm cursor-pointer group"
                        >
                          <span className="text-xl">📋</span>
                          <div>
                            <p className="font-bold text-xs text-gray-800">Copy Link</p>
                            <p className="text-[9px] text-gray-400 group-hover:text-pink-500 transition-colors">
                              {copied ? 'Copied to clipboard' : 'Copy invite text'}
                            </p>
                          </div>
                        </button>

                        {/* WhatsApp Option */}
                        <a
                          href={`https://api.whatsapp.com/send?text=${encodeURIComponent(`Join my Partner Mode on Lumina to stay connected 💞 ${inviteLink}`)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-4 bg-white hover:bg-green-50/30 border border-green-100 rounded-2xl text-left transition-all flex flex-col justify-between gap-3 shadow-sm cursor-pointer"
                        >
                          <span className="text-xl">💬</span>
                          <div>
                            <p className="font-bold text-xs text-gray-850">WhatsApp</p>
                            <p className="text-[9px] text-gray-450">Send message instantly</p>
                          </div>
                        </a>

                        {/* Messages Option */}
                        <a
                          href={`sms:?&body=${encodeURIComponent(`Join my Partner Mode on Lumina 💞 ${inviteLink}`)}`}
                          className="p-4 bg-white hover:bg-blue-50/30 border border-blue-100 rounded-2xl text-left transition-all flex flex-col justify-between gap-3 shadow-sm cursor-pointer"
                        >
                          <span className="text-xl">📱</span>
                          <div>
                            <p className="font-bold text-xs text-gray-850">Messages</p>
                            <p className="text-[9px] text-gray-450">SMS invitation text</p>
                          </div>
                        </a>

                        {/* Email Option */}
                        <a
                          href={`mailto:?subject=${encodeURIComponent("Join my Lumina Partner Mode")}&body=${encodeURIComponent(`Hi darling, join my private Partner Mode on Lumina to stay in sync with my cycle and journey: ${inviteLink}`)}`}
                          className="p-4 bg-white hover:bg-purple-50/30 border border-purple-100 rounded-2xl text-left transition-all flex flex-col justify-between gap-3 shadow-sm cursor-pointer"
                        >
                          <span className="text-xl">✉️</span>
                          <div>
                            <p className="font-bold text-xs text-gray-850">Email</p>
                            <p className="text-[9px] text-gray-450">Send email message</p>
                          </div>
                        </a>
                      </div>

                      {/* QR Code Option */}
                      <button
                        onClick={() => setShowQRCode(!showQRCode)}
                        className="w-full p-4.5 bg-white hover:bg-amber-50/10 border border-amber-100 rounded-2xl text-left transition-all flex items-center justify-between gap-4 shadow-sm cursor-pointer"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">🔳</span>
                          <div>
                            <p className="font-bold text-xs text-gray-850">QR Code</p>
                            <p className="text-[9px] text-gray-450">Scan invitation directly on device</p>
                          </div>
                        </div>
                        <span className="text-[10px] uppercase font-bold text-amber-500">{showQRCode ? 'Hide ✕' : 'View →'}</span>
                      </button>

                      {showQRCode && (
                        <div className="bg-amber-50/10 border border-amber-100/50 p-6 rounded-3xl text-center space-y-4 animate-slideDown">
                          <p className="text-[10px] font-bold text-amber-600 uppercase tracking-widest">Lumina Scan Invitation</p>
                          <div className="bg-white p-4 inline-block rounded-2xl border border-amber-100 shadow-md">
                            <img 
                              src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&color=db2777&data=${encodeURIComponent(inviteLink)}`} 
                              alt="Lumina Partner Invitation QR Code"
                              className="w-44 h-44 mx-auto"
                              referrerPolicy="no-referrer"
                            />
                          </div>
                          <p className="text-[10px] text-gray-400 italic">Have your partner open their camera app to scan and connect instantly.</p>
                        </div>
                      )}
                    </div>

                    {/* Generate New Link button */}
                    <div className="pt-4 border-t border-pink-50 flex justify-end">
                      <button 
                        onClick={handleForceGenerateNewCode}
                        disabled={generatingLink}
                        className="px-4 py-2 bg-pink-50 hover:bg-pink-100 rounded-full font-serif font-bold italic text-xs border border-pink-100 text-pink-500 transition-colors cursor-pointer"
                      >
                        🔄 Generate New Link
                      </button>
                    </div>

                  </div>
                )}
              </>
            )}

            <div className="flex items-center gap-4 py-2">
              <div className="h-[1px] flex-1 bg-pink-100"></div>
              <span className="text-[10px] font-bold text-pink-300 uppercase">OR</span>
              <div className="h-[1px] flex-1 bg-pink-100"></div>
            </div>

            <div className="space-y-2">
              <input 
                type="text" 
                value={partnerCodeInput}
                onChange={(e) => setPartnerCodeInput(e.target.value)}
                placeholder="Enter Partner Code"
                className="w-full px-6 py-4 rounded-2xl bg-pink-50/30 border border-pink-50 outline-none text-center text-pink-900 font-bold tracking-widest uppercase"
              />
              <button 
                onClick={handleLinkPartner}
                className="w-full py-4 bg-white border-2 border-pink-100 text-pink-500 rounded-2xl font-bold uppercase text-xs tracking-widest hover:bg-pink-50 transition-colors cursor-pointer"
              >
                Link Partner
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2 text-pink-300">
            <span className="text-lg">🔒</span>
            <p className="text-[10px] font-bold uppercase tracking-widest">Only your partner can view your cycle data</p>
          </div>
        </section>
      </div>
    );
  }

  if (!user.isPartner && user.isPartnerLinked) {
    return (
      <div className="space-y-8 animate-fadeIn pb-24">
        <header className="bg-gradient-to-br from-pink-500 to-rose-500 p-10 rounded-[3rem] shadow-xl text-white text-center">
          <h2 className="text-4xl font-serif italic mb-2">Your Partner</h2>
          <p className="text-sm opacity-90">Connected with {user.partnerName}</p>
        </header>

        <section className="bg-white p-8 rounded-[3rem] shadow-sm border border-pink-50 space-y-6">
          <div className="flex items-center gap-4 p-6 bg-pink-50/30 rounded-[2.5rem] border border-pink-50">
            <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center text-3xl shadow-sm">👩</div>
            <div className="flex-1">
              <h3 className="text-xl font-serif text-pink-600 italic">{user.partnerName}</h3>
              <p className="text-[10px] font-bold text-green-500 uppercase tracking-widest">Status: Connected ✅</p>
            </div>
          </div>

          <div className="grid gap-3">
            <button 
              onClick={() => setUser({ ...user, isPartner: true })}
              className="w-full py-4 bg-pink-500 text-white rounded-2xl font-bold uppercase text-xs tracking-widest shadow-lg shadow-pink-100"
            >
              View Partner Dashboard
            </button>
            <button 
              onClick={() => setShowSettings(!showSettings)}
              className="w-full py-4 bg-white border-2 border-pink-100 text-pink-500 rounded-2xl font-bold uppercase text-xs tracking-widest"
            >
              Manage Sharing Settings
            </button>
            <button 
              onClick={() => setShowDisconnectConfirm(true)}
              className="w-full py-4 text-rose-400 font-bold uppercase text-[10px] tracking-widest"
            >
              Disconnect Partner ❌
            </button>
          </div>
        </section>

        {showDisconnectConfirm && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] flex items-center justify-center p-6">
            <div className="bg-white rounded-[3rem] p-10 w-full max-w-sm text-center space-y-8 animate-fadeIn">
              <div className="w-20 h-20 bg-rose-50 rounded-full flex items-center justify-center text-4xl mx-auto shadow-inner">⚠️</div>
              <div className="space-y-3">
                <h3 className="text-2xl font-serif italic text-rose-900">Disconnect?</h3>
                <p className="text-xs text-rose-300 leading-relaxed">
                  This will immediately stop sharing your cycle data with {user.partnerName}. They will no longer be able to see your updates.
                </p>
              </div>
              <div className="grid gap-3">
                <button 
                  onClick={handleDisconnect}
                  className="w-full py-4 bg-rose-500 text-white rounded-2xl font-bold uppercase text-xs tracking-widest shadow-lg shadow-rose-100"
                >
                  Yes, Disconnect ❌
                </button>
                <button 
                  onClick={() => setShowDisconnectConfirm(false)}
                  className="w-full py-4 bg-white border-2 border-rose-100 text-rose-400 rounded-2xl font-bold uppercase text-xs tracking-widest"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {showSettings && (
          <section className="bg-white p-8 rounded-[3rem] shadow-sm border border-pink-50 animate-fadeIn">
            <h3 className="text-xl font-serif text-pink-600 mb-6 italic">Sharing Settings</h3>
            <div className="space-y-4">
              <SharingToggle label="Share Cycle Info" active={user.sharingSettings.shareCycleInfo} onChange={(v) => updateSharing('shareCycleInfo', v)} />
              <SharingToggle label="Share Symptoms" active={user.sharingSettings.shareSymptoms} onChange={(v) => updateSharing('shareSymptoms', v)} />
              <SharingToggle label="Share Mood" active={user.sharingSettings.shareMood} onChange={(v) => updateSharing('shareMood', v)} />
              <SharingToggle label="Share Notes" active={user.sharingSettings.shareNotes} onChange={(v) => updateSharing('shareNotes', v)} />
            </div>
            <button 
              onClick={() => setShowSettings(false)}
              className="w-full mt-8 py-4 bg-pink-500 text-white rounded-2xl font-bold uppercase text-xs tracking-widest"
            >
              Save
            </button>
          </section>
        )}
      </div>
    );
  }

  // Partner Dashboard View
  if (targetUser?.isSharingPaused) {
    return (
      <div className="space-y-8 animate-fadeIn pb-24 font-sans">
        <header className="relative bg-gradient-to-br from-indigo-700 to-purple-800 p-12 rounded-[3.5rem] shadow-2xl text-white text-center overflow-hidden">
          <div className="relative z-10 space-y-4">
            <span className="text-5xl block animate-bounce">⏸️</span>
            <h2 className="text-3xl font-serif italic">Sharing Temporarily Paused</h2>
            <p className="text-sm opacity-90 max-w-sm mx-auto font-medium">
              {targetUser?.name || 'Your partner'} has temporarily paused data sharing. We respect her privacy choices.
            </p>
            <div className="pt-2">
              <span className="px-4 py-1.5 bg-white/15 rounded-full text-[10px] font-black uppercase tracking-widest border border-white/10">Active Pause Guard 🔒</span>
            </div>
          </div>
          <div className="absolute top-0 right-0 p-8 opacity-10">
            <span className="text-9xl rotate-12">🌸</span>
          </div>
        </header>

        <section className="bg-white p-10 rounded-[3rem] shadow-sm border border-purple-50 flex flex-col items-center gap-6 text-center">
          <h3 className="text-lg font-serif italic text-indigo-950">Send supportive comfort instead! 💕</h3>
          <p className="text-xs text-gray-500 max-w-md leading-relaxed">
            Just because sharing is paused doesn't mean you can't be a hero. Send her sweet animations or supportive digital gifts that balloon on her dashboard instantly!
          </p>
          <div className="flex justify-center gap-8 pt-2">
            <ComfortButton icon="🌸" label="Flower" onClick={() => sendDigitalComfort('flower')} />
            <ComfortButton icon="🍫" label="Chocolate" onClick={() => sendDigitalComfort('chocolate')} />
            <ComfortButton icon="🍵" label="Warm Tea" onClick={() => sendDigitalComfort('tea')} />
          </div>
          <button 
            onClick={() => setUser({ ...user, isPartner: false })}
            className="text-[10px] font-black text-indigo-505 uppercase tracking-widest hover:underline mt-4 cursor-pointer"
          >
            ← Back to My Account
          </button>
        </section>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fadeIn pb-24">
      {/* Header with Linked User Profile */}
      <header className="relative bg-gradient-to-br from-indigo-600 to-indigo-800 p-10 rounded-[3rem] shadow-2xl shadow-indigo-200 text-white border border-indigo-400 overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="space-y-4 text-center md:text-left">
            <div className="flex items-center justify-center md:justify-start gap-4">
              <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-4xl shadow-inner border border-white/30">
                🛡️
              </div>
              <div>
                <h2 className="text-4xl font-serif italic tracking-tight">{targetUser?.name}'s Sanctuary</h2>
                <p className="text-sm opacity-80 font-medium">Supporting {targetUser?.name}'s bloom</p>
              </div>
            </div>
            
            <div className="flex flex-wrap justify-center md:justify-start gap-2">
              <div className="bg-white/10 backdrop-blur-sm px-4 py-2 rounded-full text-[10px] font-bold uppercase tracking-widest border border-white/10">
                Phase: <span className="text-yellow-300">{currentPhase}</span>
              </div>
              <div className="bg-white/10 backdrop-blur-sm px-4 py-2 rounded-full text-[10px] font-bold uppercase tracking-widest border border-white/10">
                Mission: <span className="text-pink-300">Support Hero</span>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-[2.5rem] shadow-lg flex-shrink-0 w-full md:w-72 border border-white">
            <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-400 mb-3 text-center">Hero's Guide</p>
            <p className="text-xs text-indigo-900 font-serif italic leading-relaxed text-center">
              {loading ? "Aligning stars..." : (supportMission[0] || "Small gestures mean the most. Today, focus on listening without solving.")}
            </p>
            <div className="mt-4 flex justify-center gap-3">
              {['🌸', '🍫', '🍵'].map((e, i) => (
                <div key={i} className="w-8 h-8 bg-indigo-50 rounded-full flex items-center justify-center text-lg">{e}</div>
              ))}
            </div>
          </div>
        </div>
        <div className="absolute top-0 right-0 p-12 opacity-10">
          <span className="text-[15rem] rotate-12">🛡️</span>
        </div>
      </header>

      {/* Cycle Overview Card */}
      <section className="bg-white p-8 rounded-[3rem] shadow-sm border border-indigo-50 space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-2xl font-serif text-indigo-600 italic">{targetUser?.name}'s Cycle</h3>
          <button 
            onClick={() => setUser({ ...user, isPartner: false })}
            className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest"
          >
            ← Back to My Account
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-6 bg-indigo-50/30 rounded-[2rem] border border-indigo-50">
            <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest mb-2">Status</p>
            {targetUser?.sharingSettings.shareCycleInfo ? (
              <>
                <p className="text-lg font-serif italic text-indigo-900">Period starts in 2 days</p>
                <p className="text-xs text-indigo-300 mt-1">Current Phase: {currentPhase}</p>
              </>
            ) : (
              <p className="text-xs text-indigo-300 italic">Cycle info is private 🔒</p>
            )}
          </div>
          <div className="p-6 bg-pink-50/30 rounded-[2rem] border border-pink-50">
            <p className="text-[10px] font-bold text-pink-400 uppercase tracking-widest mb-2">Mood & Symptoms</p>
            {targetUser?.sharingSettings.shareMood || targetUser?.sharingSettings.shareSymptoms ? (
              <>
                {targetUser?.sharingSettings.shareMood && <p className="text-lg font-serif italic text-pink-600">😔 Low energy</p>}
                {targetUser?.sharingSettings.shareSymptoms && <p className="text-xs text-pink-300 mt-1">Symptoms: Cramps</p>}
              </>
            ) : (
              <p className="text-xs text-pink-300 italic">Mood & symptoms are private 🔒</p>
            )}
          </div>
        </div>

        <div className="p-6 bg-yellow-50/50 rounded-[2rem] border border-yellow-100 flex items-start gap-4">
          <span className="text-2xl">💡</span>
          <div>
            <p className="text-[10px] font-bold text-yellow-600 uppercase tracking-widest mb-1">Support Tip</p>
            <p className="text-sm text-yellow-800 italic">
              {loading ? "Calculating support strategy..." : (commTips.substring(0, 100).split('\n')[0] || "She may need rest today. Consider preparing a warm bath or a heating pad.")}
            </p>
          </div>
        </div>
      </section>

      {/* Care & Gift Reminders */}
      <section className="bg-white p-8 rounded-[3rem] shadow-sm border border-pink-50">
        <h3 className="text-2xl font-serif text-pink-500 italic mb-6">Care & Gift Reminders</h3>
        <div className="space-y-4">
          <div className="p-6 bg-pink-50/30 rounded-[2rem] border border-pink-50">
            <p className="text-[10px] font-bold text-pink-400 uppercase tracking-widest mb-2">Upcoming</p>
            {targetUser?.sharingSettings.shareCycleInfo ? (
              <p className="text-sm text-pink-600 font-serif italic">
                • {currentPhase === 'Menstrual' ? 'Period in progress' : 
                   currentPhase === 'Pregnancy' ? 'Pregnancy journey' :
                   'Preparing for next bloom'}
              </p>
            ) : (
              <p className="text-xs text-pink-300 italic">Protected Information 🔒</p>
            )}
          </div>
          <div className="p-6 bg-white border border-pink-100 rounded-[2rem] space-y-4">
            <p className="text-[10px] font-bold text-pink-400 uppercase tracking-widest">💡 AI Suggestions</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {giftIdeas.slice(0, 3).map((idea, i) => (
                <SuggestionItem key={i} icon={['🎁', '🌸', '💬'][i % 3]} label={idea.length > 20 ? idea.substring(0, 20) + "..." : idea} />
              ))}
              {giftIdeas.length === 0 && (
                <>
                  <SuggestionItem icon="🎁" label="Buy chocolate" />
                  <SuggestionItem icon="🌸" label="Send flowers" />
                  <SuggestionItem icon="💬" label="Check in emotionally" />
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Dashboard Navigation */}
      <nav className="flex bg-white/50 p-1.5 rounded-3xl border border-indigo-100/50 shadow-sm sticky top-24 z-40 backdrop-blur-md">
        <NavItem active={activeTab === 'mission'} onClick={() => setActiveTab('mission')} label="Support Mission" icon="⚔️" />
        <NavItem active={activeTab === 'ideas'} onClick={() => setActiveTab('ideas')} label="Gift Ideas" icon="🎁" />
        <NavItem active={activeTab === 'notes'} onClick={() => setActiveTab('notes')} label="Love Notes" icon="✉️" />
        <NavItem active={activeTab === 'reminders'} onClick={() => setActiveTab('reminders')} label="Tasks" icon="⏰" />
        <NavItem active={activeTab === 'calendar'} onClick={() => setActiveTab('calendar')} label="Calendar" icon="📅" />
      </nav>

      {activeTab === 'mission' && (
        <div className="space-y-6 animate-fadeIn">
          <section className="bg-white p-8 rounded-[3rem] shadow-sm border border-indigo-50">
            <header className="flex justify-between items-center mb-8">
               <div>
                  <h3 className="text-2xl font-serif text-indigo-600 italic">Daily Support Mission</h3>
                  <p className="text-xs text-indigo-300 font-bold uppercase tracking-widest mt-1">Specific tasks for the {currentPhase} phase</p>
               </div>
               {loading && <div className="w-6 h-6 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin"></div>}
            </header>
            
            <div className="space-y-4">
              {supportMission.map((task, i) => (
                <div key={i} className="group p-6 bg-indigo-50/30 rounded-[2rem] hover:bg-indigo-50 transition-all border border-transparent hover:border-indigo-100 flex items-center justify-between">
                  <div className="flex items-center gap-5">
                    <span className="text-2xl opacity-40 group-hover:opacity-100 transition-opacity">📌</span>
                    <p className="text-indigo-900 font-serif italic text-lg">{task.replace(/^\d\.\s*/, '')}</p>
                  </div>
                  <button 
                    onClick={() => addReminder(task)}
                    className="bg-indigo-500 text-white px-4 py-2 rounded-full text-[10px] font-bold uppercase tracking-widest hover:scale-110 active:scale-95 transition-all shadow-md"
                  >
                    Add to List
                  </button>
                </div>
              ))}
            </div>
          </section>

          <section className="bg-indigo-900 p-8 rounded-[3rem] text-white shadow-xl relative overflow-hidden">
             <div className="relative z-10">
                <h4 className="text-xl font-serif italic mb-4 flex items-center gap-2">
                  <span className="text-2xl">🗣️</span> Communication Briefing
                </h4>
                <div className="p-6 bg-white/10 rounded-3xl border border-white/10 italic text-sm leading-relaxed whitespace-pre-line">
                  {loading ? "Decrypting her language..." : commTips}
                </div>
             </div>
             <span className="absolute bottom-[-20%] right-[-10%] text-[10rem] opacity-5">⚡</span>
          </section>
        </div>
      )}

      {activeTab === 'ideas' && (
        <section className="bg-white p-8 rounded-[3rem] shadow-sm border border-pink-50 animate-fadeIn">
          <header className="mb-8">
            <h3 className="text-2xl font-serif text-pink-500 italic">Romantic Operations</h3>
            <p className="text-xs text-pink-300 font-bold uppercase tracking-widest mt-1">Gift & Gesture Suggestions</p>
          </header>
          
          <div className="grid gap-4">
            {giftIdeas.map((idea, i) => (
              <div key={i} className="group p-6 bg-pink-50/30 rounded-[2.5rem] hover:bg-pink-50 transition-all border border-transparent hover:border-pink-200 flex items-center gap-5">
                <div className="w-14 h-14 bg-white rounded-full flex items-center justify-center text-3xl shadow-sm group-hover:scale-110 transition-transform">
                   {['💝', '💐', '☕', '🕯️', '🍪'][i % 5]}
                </div>
                <p className="text-gray-700 font-serif italic text-xl leading-snug flex-1">{idea}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {activeTab === 'notes' && (
        <section className="bg-white p-8 rounded-[3rem] shadow-sm border border-pink-50 animate-fadeIn">
          <header className="mb-8">
            <h3 className="text-2xl font-serif text-pink-500 italic">Encoded Love Letters</h3>
            <p className="text-xs text-pink-300 font-bold uppercase tracking-widest mt-1">Ready-to-send affirmations</p>
          </header>

          <div className="grid gap-6">
            {loveNotes.map((note, i) => (
              <div 
                key={i} 
                onClick={() => copyToClipboard(note)}
                className="relative bg-gradient-to-br from-indigo-50 to-white p-8 rounded-[2.5rem] border border-indigo-100 cursor-pointer hover:shadow-lg transition-all active:scale-95 group overflow-hidden"
              >
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-100 transition-opacity">
                  📋
                </div>
                <p className="text-indigo-900 font-serif italic text-xl leading-relaxed">
                  "{note.replace(/^\d\.\s*/, '')}"
                </p>
                <div className="mt-4 flex items-center gap-2">
                   <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">TAP TO COPY</span>
                   <div className="h-[1px] flex-1 bg-indigo-100"></div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {activeTab === 'reminders' && (
        <section className="bg-white p-8 rounded-[3rem] shadow-sm border border-indigo-50 animate-fadeIn">
           <h3 className="text-2xl font-serif text-indigo-600 mb-8 italic">Your Hero Checklist</h3>
           
           <div className="flex flex-col md:flex-row gap-3 mb-8">
              <input 
                type="text" 
                value={newReminderText}
                onChange={(e) => setNewReminderText(e.target.value)}
                placeholder="New support task..."
                className="flex-1 px-6 py-4 rounded-2xl bg-indigo-50/30 border border-indigo-50 outline-none text-sm text-indigo-900 placeholder:text-indigo-200"
              />
              <button 
                onClick={() => addReminder()}
                className="px-8 py-4 bg-indigo-500 text-white rounded-2xl font-bold uppercase text-[10px] tracking-widest shadow-lg shadow-indigo-100"
              >
                ADD
              </button>
           </div>

           <div className="space-y-4">
              {reminders.map((reminder) => (
                <div key={reminder.id} className="flex items-center justify-between p-6 bg-white border border-indigo-50 rounded-[2.5rem] shadow-sm">
                   <div className="flex items-center gap-5">
                      <button 
                        onClick={() => toggleReminder(reminder.id)}
                        className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all ${reminder.isCompleted ? 'bg-indigo-500 border-indigo-500' : 'border-indigo-100'}`}
                      >
                         {reminder.isCompleted && <span className="text-white text-xs">✓</span>}
                      </button>
                      <p className={`font-serif italic text-lg ${reminder.isCompleted ? 'line-through text-gray-400' : 'text-indigo-900'}`}>{reminder.text}</p>
                   </div>
                   <button onClick={() => deleteReminder(reminder.id)} className="text-gray-300 hover:text-rose-400">✕</button>
                </div>
              ))}
           </div>
        </section>
      )}
      {activeTab === 'calendar' && (
        <section className="bg-white p-8 rounded-[3rem] shadow-sm border border-indigo-50 animate-fadeIn">
          <h3 className="text-2xl font-serif text-indigo-600 italic mb-6">{targetUser?.name}'s Calendar</h3>
          <div className="p-6 bg-indigo-50/30 rounded-[2rem] border border-indigo-50 text-center">
            <p className="text-sm text-indigo-900 font-serif italic mb-4">Upcoming Period Days: April 12 - April 17</p>
            <div className="grid grid-cols-7 gap-2">
              {Array.from({ length: 31 }).map((_, i) => {
                const day = i + 1;
                const isPeriod = day >= 12 && day <= 17;
                const isFertile = day >= 24 && day <= 28;
                return (
                  <div 
                    key={i} 
                    className={`aspect-square flex items-center justify-center rounded-xl text-[10px] font-bold ${
                      isPeriod ? 'bg-rose-400 text-white shadow-md shadow-rose-100' : 
                      isFertile ? 'bg-indigo-400 text-white shadow-md shadow-indigo-100' : 
                      'bg-white text-indigo-300 border border-indigo-50'
                    }`}
                  >
                    {day}
                  </div>
                );
              })}
            </div>
            <div className="mt-6 flex justify-center gap-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-rose-400 rounded-full"></div>
                <span className="text-[10px] font-bold text-indigo-400 uppercase">Period</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-indigo-400 rounded-full"></div>
                <span className="text-[10px] font-bold text-indigo-400 uppercase">Fertile</span>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Comfort Station */}
      <section className="bg-white/70 backdrop-blur-md p-8 rounded-[3rem] border border-pink-100 shadow-sm flex flex-col items-center gap-6">
         <h3 className="text-xs font-bold text-pink-400 uppercase tracking-widest">Send Digital Comfort</h3>
         <div className="flex flex-wrap justify-center gap-4">
            <ComfortButton icon="💖" label="Hug" onClick={() => sendDigitalComfort('hug')} />
            <ComfortButton icon="🍵" label="Tea" onClick={() => sendDigitalComfort('tea')} />
            <ComfortButton icon="💐" label="Flower" onClick={() => sendDigitalComfort('flower')} />
            <ComfortButton icon="🍫" label="Cocoa" onClick={() => sendDigitalComfort('chocolate')} />
            <ComfortButton icon="✨" label="Sparkle" onClick={() => sendDigitalComfort('sparkle')} />
         </div>
      </section>
    </div>
  );
};

const SharingToggle: React.FC<{ label: string; active: boolean; onChange: (v: boolean) => void }> = ({ label, active, onChange }) => (
  <div className="flex items-center justify-between p-4 bg-pink-50/30 rounded-2xl border border-pink-50">
    <span className="text-sm font-medium text-pink-900">{label}</span>
    <button 
      onClick={() => onChange(!active)}
      className={`w-12 h-6 rounded-full transition-colors relative ${active ? 'bg-pink-500' : 'bg-pink-100'}`}
    >
      <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${active ? 'left-7' : 'left-1'}`}></div>
    </button>
  </div>
);

const SuggestionItem: React.FC<{ icon: string; label: string }> = ({ icon, label }) => (
  <div className="flex items-center gap-3 p-3 bg-pink-50/50 rounded-xl border border-pink-50">
    <span className="text-lg">{icon}</span>
    <span className="text-[10px] font-bold text-pink-600 uppercase tracking-tight">{label}</span>
  </div>
);

const NavItem: React.FC<{ active: boolean, onClick: () => void, label: string, icon: string }> = ({ active, onClick, label, icon }) => (
  <button 
    onClick={onClick}
    className={`flex-1 py-3 rounded-2xl text-[9px] font-bold uppercase tracking-widest transition-all flex flex-col items-center gap-1 ${active ? 'bg-indigo-500 text-white shadow-lg' : 'text-indigo-300 hover:bg-indigo-50'}`}
  >
    <span className="text-lg">{icon}</span>
    <span className="hidden md:inline">{label}</span>
  </button>
);

const ComfortButton: React.FC<{ icon: string, label: string, onClick: () => void }> = ({ icon, label, onClick }) => (
  <button 
    onClick={onClick}
    className="flex flex-col items-center gap-1 group"
  >
     <div className="w-16 h-16 bg-pink-50 rounded-[2rem] flex items-center justify-center text-3xl shadow-sm border border-pink-100 group-hover:scale-110 group-hover:bg-pink-100 transition-all active:scale-95">
        {icon}
     </div>
     <span className="text-[9px] font-bold text-pink-300 uppercase tracking-widest">{label}</span>
  </button>
);

export default PartnerMode;
