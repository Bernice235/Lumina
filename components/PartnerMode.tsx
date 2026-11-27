
import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PartnerOnboardingWizard } from './PartnerOnboardingWizard';
import { Bell, X, GraduationCap, BookOpen, Heart, ShieldCheck, CheckCircle2, AlertCircle, Info, Sparkles, Settings, LogOut, Shield, User as UserIcon, Trash2, Menu, Home, Gift, Mail, CheckSquare, Calendar, ChevronRight, ChevronLeft, Lock, Copy, Share2, MessageSquare, QrCode, RefreshCw, Pause, Play, Unlink, ArrowLeft, Plus, Clock, Users, Check, AlertTriangle, Lightbulb } from 'lucide-react';
import { User, Reminder, ReceivedComfort, PartnerNotificationPreferences, PartnerSharedSummary } from '../types';
import { getGiftIdeas, getCommunicationTips, getLoveNoteIdeas, getSupportMission } from '../services/gemini';
import { 
  createInvite, 
  acceptInvite, 
  disconnectPartner, 
  deleteUserAccount,
  sendGift, 
  subscribeToPartnerSharedView,
  subscribeToGifts,
  syncUser,
  subscribeToPartnerRequests,
  submitPartnerRequest,
  updatePartnerRequestStatus,
  addNotificationToUser,
  completePartnerConnection,
  getUserDisplayName,
  getCleanName,
  getSanctuaryTitle
} from '../services/firebaseService';
import { saveEncryptedSessionUser, secureStorage } from '../services/secureStorage';
import { trackSendPartnerInvite, trackAcceptPartnerInvite, trackDeclinePartnerInvite } from '../services/analyticsService';
import { calculateCycleSyncData } from '../services/cycleSyncService';
import { QrCodeCanvas } from './QrCodeCanvas';
import { DeleteAccountModal } from './DeleteAccountModal';

interface PartnerModeProps {
  user: User;
  reminders: Reminder[];
  setReminders: React.Dispatch<React.SetStateAction<Reminder[]>>;
  setUser: React.Dispatch<React.SetStateAction<User | null>>;
  partnerUser?: User | null;
  onLogout?: () => void;
  onOpenNotificationCenter?: (notif?: any) => void;
}

const PartnerMode: React.FC<PartnerModeProps> = ({ user, reminders, setReminders, setUser, partnerUser, onLogout, onOpenNotificationCenter }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showDeleteAccountModal, setShowDeleteAccountModal] = useState(false);
  const [isPreviewingCompanion, setIsPreviewingCompanion] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const unreadPartnerNotifications = user.notifications?.filter(n => !n.isRead) || [];
  const hasUnreadPartnerAlerts = unreadPartnerNotifications.length > 0;

  const [giftIdeas, setGiftIdeas] = useState<string[]>([]);
  const [supportMission, setSupportMission] = useState<string[]>([]);
  const [commTips, setCommTips] = useState<string>('');
  const [loveNotes, setLoveNotes] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [newReminderText, setNewReminderText] = useState('');
  const [newReminderTime, setNewReminderTime] = useState('');
  const [activeTab, setActiveTab] = useState<'home' | 'mission' | 'ideas' | 'notes' | 'reminders' | 'calendar' | 'education' | 'notifications'>('home');
  const [selectedMissionPhase, setSelectedMissionPhase] = useState<string>('Menstrual');
  const [selectedGiftCategory, setSelectedGiftCategory] = useState<string>('All');
  const [customNoteText, setCustomNoteText] = useState<string>('');
  const [customNoteEmoji, setCustomNoteEmoji] = useState<string>('💌');
  const [sentNoteSuccess, setSentNoteSuccess] = useState<boolean>(false);
  const [calendarMonthOffset, setCalendarMonthOffset] = useState<number>(0);
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<Date>(new Date());
  const [taskPriority, setTaskPriority] = useState<'high' | 'medium' | 'normal'>('normal');
  const [taskFilter, setTaskFilter] = useState<'all' | 'pending' | 'completed'>('all');
  const [expandedPhase, setExpandedPhase] = useState<string | null>(null);
  const [selectedQuickCard, setSelectedQuickCard] = useState<string | null>(null);
  const [partnerCodeInput, setPartnerCodeInput] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [connectionRequest, setConnectionRequest] = useState<any | null>(null);
  const isPartnerOnboardingDone = Boolean(user.partnerOnboardingCompleted ?? user.onboardingCompleted);
  const [onboardingStep, setOnboardingStep] = useState<number>(user.isPartner && !isPartnerOnboardingDone ? 1 : 0);
  const [partnerStep, setPartnerStep] = useState<number>(() => {
    if (!user.isPartner) return 0;
    if (!user.partnerId) return 0;
    if (!user.partnerRequest) return 1;
    if (user.partnerRequest.status === 'pending') return 3;
    if (user.partnerRequest.status === 'approved' && !isPartnerOnboardingDone) return 4;
    if (user.partnerRequest.status === 'declined') return 5;
    return 6;
  });
  const [requestedReceives, setRequestedReceives] = useState<string[]>(() => {
    return (user.partnerRequest?.requestedReceives || [
      "Cycle status",
      "Period predictions",
      "Mood updates",
      "Symptoms",
      "Cravings",
      "Wellness insights"
    ]).filter((item) => !/journal|diary|doctor|report|note/i.test(item));
  });
  const [notificationStyle, setNotificationStyle] = useState<'gentle' | 'full'>('gentle');
  const [copied, setCopied] = useState(false);
  const [linkOnlyCopied, setLinkOnlyCopied] = useState(false);
  const [showDisconnectConfirm, setShowDisconnectConfirm] = useState(false);
  const [showUnlinkInSettingsConfirm, setShowUnlinkInSettingsConfirm] = useState(false);
  const [showCancelRequestConfirm, setShowCancelRequestConfirm] = useState(false);
  const [showDeclineConfirm, setShowDeclineConfirm] = useState(false);
  const [partnerNotice, setPartnerNotice] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);
  const [linkedSummary, setLinkedSummary] = useState<PartnerSharedSummary | null>(null);

  const showNotice = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setPartnerNotice({ message, type });
    window.setTimeout(() => {
      setPartnerNotice((prev) => (prev?.message === message ? null : prev));
    }, 4500);
  };
  const [receivedGifts, setReceivedGifts] = useState<ReceivedComfort[]>([]);
  const [generatingLink, setGeneratingLink] = useState(false);
  const [showQRCode, setShowQRCode] = useState(false);
  const [inviteSuccess, setInviteSuccess] = useState(false);
  const [subTab, setSubTab] = useState<'partners' | 'requests' | 'invitations' | 'privacy' | 'permissions'>('partners');
  const [isCustomizingSharing, setIsCustomizingSharing] = useState(false);

  const [incomingRequests, setIncomingRequests] = useState<any[]>([]);
  const [outgoingRequests, setOutgoingRequests] = useState<any[]>([]);
  const [reviewedPermissions, setReviewedPermissions] = useState<string[]>([]);

  const activePendingRequest = incomingRequests.find(r => r.status === 'pending');

  useEffect(() => {
    if (activePendingRequest) {
      setReviewedPermissions(activePendingRequest.requested_permissions || []);
    } else {
      setReviewedPermissions([]);
    }
  }, [activePendingRequest?.id]);

  useEffect(() => {
    if (user && !user.isPartner) {
      const unsub = subscribeToPartnerRequests(user.id, 'user', (reqs) => {
        setIncomingRequests(reqs);
      });
      return () => unsub();
    } else {
      setIncomingRequests([]);
    }
  }, [user?.id, user?.isPartner]);

  // Auto-redirect to requests tab if there are pending requests
  useEffect(() => {
    if (incomingRequests.some(r => r.status === 'pending') && subTab === 'partners') {
      setSubTab('requests');
    }
  }, [incomingRequests, subTab]);

  useEffect(() => {
    const handleSubtabChange = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail) {
        setSubTab(detail);
      }
    };
    window.addEventListener('lumina-set-partner-subtab', handleSubtabChange);
    const stored = sessionStorage.getItem('lumina_partnermode_subtab');
    if (stored) {
      setSubTab(stored as any);
      sessionStorage.removeItem('lumina_partnermode_subtab');
    }
    return () => window.removeEventListener('lumina-set-partner-subtab', handleSubtabChange);
  }, []);

  useEffect(() => {
    if (user && user.isPartner && user.partnerId) {
      const unsub = subscribeToPartnerRequests(user.id, 'partner', (reqs) => {
        setOutgoingRequests(reqs);
      });
      return () => unsub();
    } else {
      setOutgoingRequests([]);
    }
  }, [user?.id, user?.isPartner, user?.partnerId]);

  // Synchronize partnerStep with actual active Request status dynamically in real-time
  useEffect(() => {
    if (!user.isPartner || !user.partnerId) return;
    
    // Check outgoing requests list first for the source of truth
    const activeRequest = outgoingRequests.find(r => r.user_id === user.partnerId);
    if (activeRequest) {
      if (activeRequest.status === 'pending') {
        setPartnerStep(3);
      } else if (activeRequest.status === 'approved') {
        if (!user.isPartnerLinked || user.partnerRequest?.status !== 'approved') {
          const syncedPartner: User = {
            ...user,
            isPartnerLinked: true,
            partnerRequest: {
              ...(user.partnerRequest || {
                partnerId: user.partnerId || '',
                partnerName: user.partnerName || '',
                requestedReceives: activeRequest.requested_permissions || [],
              }),
              status: 'approved',
            },
          };
          setUser(syncedPartner);
          void syncUser(syncedPartner);
        }
        if (!user.partnerOnboardingCompleted) {
          setPartnerStep(4);
        } else {
          setPartnerStep(6);
        }
      } else if (activeRequest.status === 'declined') {
        if (user.isPartnerLinked || user.partnerRequest?.status !== 'declined') {
          const declinedPartner: User = {
            ...user,
            isPartnerLinked: false,
            partnerRequest: {
              ...(user.partnerRequest || {
                partnerId: user.partnerId || '',
                partnerName: user.partnerName || '',
                requestedReceives: activeRequest.requested_permissions || [],
              }),
              status: 'declined',
            },
          };
          setUser(declinedPartner);
          void syncUser(declinedPartner);
        }
        setPartnerStep(5);
      }
    } else {
      // Fallback to legacy in-user profile representation
      if (!user.partnerRequest) {
        setPartnerStep(1);
      } else if (user.partnerRequest.status === 'pending') {
        setPartnerStep(3);
      } else if (user.partnerRequest.status === 'approved' && !user.partnerOnboardingCompleted) {
        setPartnerStep(4);
      } else if (user.partnerRequest.status === 'declined') {
        setPartnerStep(5);
      } else if (user.partnerOnboardingCompleted || user.onboardingCompleted) {
        setPartnerStep(6);
      }
    }
  }, [outgoingRequests, user.isPartner, user.partnerId, user.partnerRequest?.status, user.partnerOnboardingCompleted, user.onboardingCompleted, user.isPartnerLinked]);

  // Listen to visual navigation tab changes from banner clicks
  useEffect(() => {
    const handleSetSubTab = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail) {
        setSubTab(detail as any);
      }
    };
    window.addEventListener('lumina-set-partner-subtab', handleSetSubTab);
    
    const saved = sessionStorage.getItem('lumina_partnermode_subtab');
    if (saved) {
      setSubTab(saved as any);
      sessionStorage.removeItem('lumina_partnermode_subtab');
    }
    
    return () => window.removeEventListener('lumina-set-partner-subtab', handleSetSubTab);
  }, []);

  useEffect(() => {
    // Check for invite link in URL
    const params = new URLSearchParams(window.location.search);
    const inviteCode = params.get('invite');
    if (inviteCode && !user.partnerId) {
      setPartnerCodeInput(inviteCode.toUpperCase());
    }
  }, [user.partnerId]);

  useEffect(() => {
    if (user.isPartner && user.partnerId) {
      const unsubSummary = subscribeToPartnerSharedView(user.partnerId, (summary) => {
        setLinkedSummary(summary);
      });
      return () => unsubSummary();
    } else {
      setLinkedSummary(null);
    }
  }, [user.isPartner, user.partnerId]);

  useEffect(() => {
    const unsubGifts = subscribeToGifts(user.id, (gifts) => {
      setReceivedGifts(gifts);
    });
    return () => unsubGifts();
  }, [user.id]);

  const projectedPartnerUser: User | null = linkedSummary
    ? ({
        id: linkedSummary.ownerId,
        name: linkedSummary.ownerName,
        email: '',
        partnerName: user.name || '',
        partnerId: user.id,
        isPartnerLinked: Boolean(linkedSummary.isPartnerLinked),
        isSharingPaused: Boolean(linkedSummary.isSharingPaused),
        isPartner: false,
        isPregnancyMode: Boolean(linkedSummary.isPregnancyMode),
        isPostpartumMode: Boolean(linkedSummary.isPostpartumMode),
        pregnancyStartDate: linkedSummary.pregnancyStartDate,
        deliveryDate: linkedSummary.deliveryDate,
        pregnancyAppointments: linkedSummary.pregnancyAppointments,
        cycleLength: linkedSummary.cycleLength || 28,
        previousCycleLength: linkedSummary.previousCycleLength,
        periodLength: linkedSummary.periodLength || 5,
        lastPeriodStart: linkedSummary.lastPeriodStart || '',
        periods: linkedSummary.periods,
        periodLogs: linkedSummary.periodLogs,
        periodDates: linkedSummary.periodDates,
        symptoms: linkedSummary.symptoms,
        todaySymptomLog: linkedSummary.todaySymptomLog,
        moodLogs: linkedSummary.moodLogs,
        sexualActivityLogs: linkedSummary.sexualActivityLogs,
        wishlist: linkedSummary.wishlist,
        partnerSupportPreferences: linkedSummary.partnerSupportPreferences,
        receivedComforts: linkedSummary.receivedComforts,
        theme: linkedSummary.theme || 'rose',
        sharingSettings: linkedSummary.sharingSettings,
      } as User)
    : null;

  const actualPartnerUser = (projectedPartnerUser && projectedPartnerUser.id !== user.id) ? projectedPartnerUser :
                            (partnerUser && partnerUser.id !== user.id) ? partnerUser : null;

  const activeOutgoingRequest = outgoingRequests.find(r => r.user_id === user.partnerId) || outgoingRequests[0];

  const isDeclined = user.partnerRequest?.status === 'declined' || 
                     activePendingRequest?.status === 'declined' || 
                     activeOutgoingRequest?.status === 'declined';

  const isPendingApproval = !isDeclined && (
    user.partnerRequest?.status === 'pending' || 
    activePendingRequest?.status === 'pending' || 
    activeOutgoingRequest?.status === 'pending' ||
    (!user.isPartnerLinked && !linkedSummary?.isPartnerLinked && !partnerUser?.isPartnerLinked && Boolean(user.partnerId))
  );

  const isConnected = Boolean(
    !isDeclined &&
    !isPendingApproval &&
    (
      user.isPartnerLinked ||
      linkedSummary?.isPartnerLinked ||
      (partnerUser && partnerUser.isPartnerLinked) ||
      user.partnerRequest?.status === 'approved' ||
      activePendingRequest?.status === 'approved' ||
      activeOutgoingRequest?.status === 'approved'
    )
  );

  const partnerDisplayName = (() => {
    if (actualPartnerUser?.name) {
      const clean = getCleanName(actualPartnerUser.name, actualPartnerUser.email);
      if (clean) return clean;
    }
    
    if (user.isPartner) {
      // Current user is the Partner. We need the Primary User's (invite owner) name.
      const candidate = connectionRequest?.senderName ||
                        connectionRequest?.name ||
                        user.partnerName || 
                        user.partnerRequest?.partnerName || 
                        outgoingRequests.find(r => r.status === 'pending' || r.user_id === user.partnerId || r.userId === user.partnerId)?.partnerName ||
                        outgoingRequests[0]?.partnerName;
      if (candidate) {
        const clean = getCleanName(candidate, undefined);
        if (clean) return clean;
      }
    } else {
      // Current user is the Primary User. We need the Partner's name.
      const candidate = user.partnerName ||
                        incomingRequests.find(r => r.status === 'pending')?.partnerName ||
                        user.partnerRequest?.partnerName;
      if (candidate) {
        const clean = getCleanName(candidate, undefined);
        if (clean) return clean;
      }
    }

    return 'Partner';
  })();

  const targetUser: User | null = user.isPartner ? actualPartnerUser : user;
  
  const currentPhase = (() => {
    if (!targetUser) return 'Luteal';
    if (targetUser.sharingSettings?.shareCycleInfo !== true) return 'Private';
    if (targetUser.isPregnancyMode) return 'Pregnancy';
    const sync = calculateCycleSyncData(targetUser, new Date());
    return sync.phase;
  })();

  const calculateCycleDetailsForDate = (date: Date, u: User | null) => {
    if (!u) {
      return {
        phaseName: '🌙 Luteal Phase (Care & Comfort)',
        phaseEmoji: '🌙',
        isPeriod: false,
        isFertile: false,
        isOvulation: false,
        dayInCycle: 1,
        fertilityStatus: null,
        loggedSymptoms: [] as string[],
        loggedMood: null as string | null
      };
    }

    const dateStr = date.toDateString();
    const dateISO = date.toISOString().split('T')[0];

    // Use central synchronised calculation
    const sync = calculateCycleSyncData(u, date);

    const isPeriod = sync.phase === 'Menstrual';
    const isFertile = sync.isWithinFertileWindow;
    const isOvulation = sync.isOvulationDay;
    const dayInCycle = sync.cycleDay;

    let phaseName = '🌙 Luteal Phase (PMS & Gentle Care Needed)';
    let phaseEmoji = '🌙';

    if (sync.isLatePeriodMode) {
      phaseName = `⏳ Day ${sync.daysLate} Late (Expected Period Pending)`;
      phaseEmoji = '⏳';
    } else if (isPeriod) {
      phaseName = '🩸 Menstrual Phase (Rest & Comfort Needed)';
      phaseEmoji = '🩸';
    } else if (sync.phase === 'Ovulatory') {
      phaseName = '☀️ Ovulatory Phase (Peak Vitality & Radiance)';
      phaseEmoji = '☀️';
    } else if (sync.phase === 'Follicular') {
      phaseName = '🌱 Follicular Phase (Rising Energy & Motivation)';
      phaseEmoji = '🌱';
    }

    const loggedSymptoms = (u.symptoms || [])
      .filter((s: any) => s.date === dateStr || s.date === dateISO || (s.timestamp && new Date(s.timestamp).toDateString() === dateStr))
      .map((s: any) => typeof s === 'string' ? s : s.name || s.type || s.symptom || 'Discomfort');

    const loggedMood = (u.moodLogs || [])
      .find((m: any) => m.date === dateStr || m.date === dateISO || (m.timestamp && new Date(m.timestamp).toDateString() === dateStr))?.mood || null;

    return {
      phaseName,
      phaseEmoji,
      isPeriod,
      isFertile,
      isOvulation,
      dayInCycle,
      fertilityStatus: sync.fertilityStatus,
      isWithinFertileWindow: sync.isWithinFertileWindow,
      loggedSymptoms,
      loggedMood
    };
  };

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
      const code = await createInvite(user.id, getUserDisplayName(user));
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
      const code = await createInvite(user.id, getUserDisplayName(user));
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

  // Generate unique link using the configured public app URL if available, falling back to window.location.origin
  const getBaseUrl = () => {
    const envUrl = (import.meta as any).env?.VITE_PUBLIC_APP_URL;
    if (envUrl && envUrl.trim().length > 0) {
      return envUrl.trim().replace(/\/$/, "");
    }
    return window.location.origin.replace('://ais-dev-', '://ais-pre-');
  };

  const inviteLink = `${getBaseUrl()}?invite=${user.partnerCode || ''}`;

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
        const updatedUser = {
          ...user,
          partnerId: inviteData.senderId,
          partnerName: inviteData.senderName,
          isPartner: true,
          isPartnerLinked: false,
          partnerRequest: {
            partnerId: user.id,
            partnerName: user.name,
            requestedReceives: ['Period Updates', 'Fertility Updates', 'Wellness Support', 'Symptom Updates'],
            status: 'pending' as const,
            timestamp: new Date().toISOString()
          }
        };
        setUser(updatedUser);
        const rememberMe = localStorage.getItem('lumina_remember_me') !== 'false';
        void saveEncryptedSessionUser(updatedUser, rememberMe).catch(() => {});
        localStorage.removeItem('lumina_user');
        localStorage.removeItem('lumina_biometric_user');
        setOnboardingStep(1);
      }
    } catch (err: any) {
      showNotice(err.message || 'Failed to connect. Please check the code.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    if (user.partnerId) {
      const pName = user.partnerName || 'Partner';
      const partnerIdToDisconnect = user.partnerId;
      
      const updatedUser = { 
        ...user, 
        isPartnerLinked: false, 
        partnerId: undefined, 
        partnerName: '', 
        isPartner: false, 
        partnerCode: undefined 
      };
      
      setUser(updatedUser);
      const rememberMe = localStorage.getItem('lumina_remember_me') !== 'false';
      void saveEncryptedSessionUser(updatedUser, rememberMe).catch(() => {});
      localStorage.removeItem('lumina_user');
      localStorage.removeItem('lumina_biometric_user');
      
      await disconnectPartner(user.id, partnerIdToDisconnect);
      await syncUser(updatedUser);
      
      setShowDisconnectConfirm(false);
      showNotice(`You have disconnected from ${pName}.`, 'info');
    }
  };

  const sendDigitalComfort = async (type: ReceivedComfort['type']) => {
    if (user.partnerId) {
      await sendGift(user.name, user.id, user.partnerId, type);
      showNotice(`Sent a digital ${type} to ${partnerDisplayName}! It will bloom on her dashboard instantly. ✨`, 'success');
    } else {
      showNotice('Connect with a partner first to send a gift! 💞', 'info');
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

  const renderNoticeBanner = () =>
    partnerNotice ? (
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[220] max-w-md w-[92%] animate-fadeIn">
        <div
          className={`px-4 py-3 rounded-xl shadow-lg border flex items-center justify-between gap-3 text-xs font-semibold ${
            partnerNotice.type === 'error'
              ? 'bg-rose-50 dark:bg-rose-950/90 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200'
              : partnerNotice.type === 'info'
                ? 'bg-indigo-50 dark:bg-indigo-950/90 border-indigo-200 dark:border-indigo-800 text-indigo-800 dark:text-indigo-200'
                : 'bg-emerald-50 dark:bg-emerald-950/90 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200'
          }`}
        >
          <span>{partnerNotice.message}</span>
          <button
            type="button"
            onClick={() => setPartnerNotice(null)}
            className="p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer shrink-0"
            aria-label="Dismiss notification"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    ) : null;

  const renderGlobalModals = () => (
    <>
      {renderNoticeBanner()}
      {/* GLOBAL HAMBURGER NAVIGATION DRAWER */}
      {isMenuOpen && (
        <>
          <div className="fixed inset-0 bg-stone-950/50 backdrop-blur-sm z-[150] transition-opacity" onClick={() => setIsMenuOpen(false)} />
          <div className="fixed inset-y-0 left-0 top-0 bottom-0 h-screen h-[100dvh] max-h-screen max-h-[100dvh] max-w-xs w-full bg-[#faf8f6] dark:bg-[#1a1816] shadow-2xl z-[160] flex flex-col border-r border-stone-200/80 dark:border-[#2e2a26] animate-slideRight text-left overflow-hidden">
            {/* Title Header with Close */}
            <div className="flex items-center justify-between border-b border-stone-200/80 dark:border-[#2e2a26] p-5 shrink-0 bg-white dark:bg-[#1a1816]">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200/70 dark:border-indigo-900/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                  <Heart className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-serif font-semibold text-lg text-stone-900 dark:text-stone-100 block leading-tight">Lumina Partner</span>
                  <span className="text-[11px] font-medium text-stone-500 dark:text-stone-400 block">Navigation menu</span>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setIsMenuOpen(false)}
                className="p-2 rounded-xl bg-stone-100 dark:bg-[#23201d] text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-[#2e2a26] transition-colors cursor-pointer"
                title="Close Menu"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Navigation Items List */}
            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 space-y-2 overscroll-contain touch-pan-y scroll-smooth">
                {/* 0. Home Dashboard */}
                <button 
                  type="button"
                  onClick={() => {
                    setActiveTab('home');
                    setIsMenuOpen(false);
                  }}
                  className="w-full p-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold text-xs flex items-center justify-between cursor-pointer transition-colors"
                >
                  <span className="flex items-center gap-2.5">
                    <Home className="w-4 h-4" /> Home Dashboard
                  </span>
                  <ChevronRight className="w-4 h-4 text-white/80" />
                </button>

                {/* 1. Daily Support Mission */}
                <button 
                  type="button"
                  onClick={() => {
                    setActiveTab('mission');
                    setIsMenuOpen(false);
                  }}
                  className="w-full p-3 bg-white dark:bg-[#23201d] hover:bg-stone-50 dark:hover:bg-[#2a2622] border border-stone-200/80 dark:border-[#2e2a26] rounded-xl text-stone-800 dark:text-stone-200 font-semibold text-xs flex items-center justify-between cursor-pointer transition-colors"
                >
                  <span className="flex items-center gap-2.5">
                    <Shield className="w-4 h-4 text-indigo-600 dark:text-indigo-400" /> Support Mission
                  </span>
                  <ChevronRight className="w-4 h-4 text-stone-400" />
                </button>

                {/* 2. Support Ideas & Gifts */}
                <button 
                  type="button"
                  onClick={() => {
                    setActiveTab('ideas');
                    setIsMenuOpen(false);
                  }}
                  className="w-full p-3 bg-white dark:bg-[#23201d] hover:bg-stone-50 dark:hover:bg-[#2a2622] border border-stone-200/80 dark:border-[#2e2a26] rounded-xl text-stone-800 dark:text-stone-200 font-semibold text-xs flex items-center justify-between cursor-pointer transition-colors"
                >
                  <span className="flex items-center gap-2.5">
                    <Gift className="w-4 h-4 text-pink-600 dark:text-pink-400" /> Support Ideas & Gifts
                  </span>
                  <ChevronRight className="w-4 h-4 text-stone-400" />
                </button>

                {/* 3. Sweet Notes */}
                <button 
                  type="button"
                  onClick={() => {
                    setActiveTab('notes');
                    setIsMenuOpen(false);
                  }}
                  className="w-full p-3 bg-white dark:bg-[#23201d] hover:bg-stone-50 dark:hover:bg-[#2a2622] border border-stone-200/80 dark:border-[#2e2a26] rounded-xl text-stone-800 dark:text-stone-200 font-semibold text-xs flex items-center justify-between cursor-pointer transition-colors"
                >
                  <span className="flex items-center gap-2.5">
                    <Mail className="w-4 h-4 text-rose-600 dark:text-rose-400" /> Sweet Notes
                  </span>
                  <ChevronRight className="w-4 h-4 text-stone-400" />
                </button>

                {/* 4. Partner Education Guide */}
                <button 
                  type="button"
                  onClick={() => {
                    setActiveTab('education');
                    setIsMenuOpen(false);
                  }}
                  className="w-full p-3 bg-indigo-50/70 dark:bg-indigo-950/30 hover:bg-indigo-100/70 dark:hover:bg-indigo-950/50 border border-indigo-200/70 dark:border-indigo-900/50 rounded-xl text-indigo-900 dark:text-indigo-200 font-semibold text-xs flex items-center justify-between cursor-pointer transition-colors"
                >
                  <span className="flex items-center gap-2.5">
                    <GraduationCap className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    <span>Partner Education Guide</span>
                  </span>
                  <ChevronRight className="w-4 h-4 text-indigo-400" />
                </button>

                {/* 5. Hero Checklist & Tasks */}
                <button 
                  type="button"
                  onClick={() => {
                    setActiveTab('reminders');
                    setIsMenuOpen(false);
                  }}
                  className="w-full p-3 bg-white dark:bg-[#23201d] hover:bg-stone-50 dark:hover:bg-[#2a2622] border border-stone-200/80 dark:border-[#2e2a26] rounded-xl text-stone-800 dark:text-stone-200 font-semibold text-xs flex items-center justify-between cursor-pointer transition-colors"
                >
                  <span className="flex items-center gap-2.5">
                    <CheckSquare className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /> Hero Checklist & Tasks
                  </span>
                  <ChevronRight className="w-4 h-4 text-stone-400" />
                </button>

                {/* 6. Partner Calendar */}
                <button 
                  type="button"
                  onClick={() => {
                    setActiveTab('calendar');
                    setIsMenuOpen(false);
                  }}
                  className="w-full p-3 bg-white dark:bg-[#23201d] hover:bg-stone-50 dark:hover:bg-[#2a2622] border border-stone-200/80 dark:border-[#2e2a26] rounded-xl text-stone-800 dark:text-stone-200 font-semibold text-xs flex items-center justify-between cursor-pointer transition-colors"
                >
                  <span className="flex items-center gap-2.5">
                    <Calendar className="w-4 h-4 text-amber-600 dark:text-amber-400" /> Partner Calendar
                  </span>
                  <ChevronRight className="w-4 h-4 text-stone-400" />
                </button>

                {/* 7. Sanctuary & Preferences */}
                <button 
                  type="button"
                  onClick={() => {
                    setIsMenuOpen(false);
                    setShowSettings(true);
                  }}
                  className="w-full p-3 bg-pink-50/70 dark:bg-pink-950/30 hover:bg-pink-100/70 dark:hover:bg-pink-950/50 border border-pink-200/70 dark:border-pink-900/50 rounded-xl text-pink-900 dark:text-pink-200 font-semibold text-xs flex items-center justify-between cursor-pointer transition-colors"
                >
                  <span className="flex items-center gap-2.5">
                    <Settings className="w-4 h-4 text-pink-600 dark:text-pink-400" />
                    <span>Sanctuary & Preferences</span>
                  </span>
                  <ChevronRight className="w-4 h-4 text-pink-400" />
                </button>
              </div>

            {/* Bottom Actions: Log Out & Delete Account (Pinned Footer) */}
            <div className="border-t border-stone-200/80 dark:border-[#2e2a26] p-4 shrink-0 bg-white dark:bg-[#1a1816] space-y-2 text-center">
              <span className="text-[11px] font-semibold text-stone-400 block mb-1">Account actions</span>
              
              {onLogout && (
                <button 
                  type="button"
                  onClick={() => {
                    setIsMenuOpen(false);
                    setShowLogoutModal(true);
                  }}
                  className="w-full h-10 rounded-xl bg-stone-100 dark:bg-[#23201d] hover:bg-stone-200 dark:hover:bg-[#2e2a26] text-stone-700 dark:text-stone-200 font-semibold text-xs flex items-center justify-center gap-2 cursor-pointer transition-colors border border-stone-200/80 dark:border-[#342f2b]"
                >
                  <LogOut className="w-4 h-4 text-stone-600 dark:text-stone-300" />
                  Log out
                </button>
              )}

              <button 
                type="button"
                onClick={() => {
                  setIsMenuOpen(false);
                  setShowDeleteAccountModal(true);
                }}
                className="w-full h-10 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs flex items-center justify-center gap-2 cursor-pointer transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                Delete account & data
              </button>
            </div>
          </div>
        </>
      )}

      {/* GLOBAL PARTNER SETTINGS MODAL */}
      {showSettings && (
        <div className="fixed inset-0 bg-stone-950/60 backdrop-blur-sm z-[160] flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white dark:bg-[#1a1816] rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6 md:p-7 space-y-5 border border-stone-200/80 dark:border-[#2e2a26] shadow-2xl text-stone-800 dark:text-stone-100 scrollbar-thin">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-stone-200/80 dark:border-[#2e2a26] pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-xl flex items-center justify-center border border-indigo-200/60 dark:border-indigo-900/50">
                  <Settings className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-serif font-semibold text-xl text-stone-900 dark:text-stone-100">Partner Settings</h3>
                  <p className="text-xs text-stone-500 dark:text-stone-400">Sanctuary & preferences</p>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setShowSettings(false)}
                className="p-2 rounded-xl bg-stone-100 dark:bg-[#23201d] hover:bg-stone-200 dark:hover:bg-[#2e2a26] text-stone-500 dark:text-stone-300 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Section 1: Account Profile */}
            <div className="bg-[#faf8f6] dark:bg-[#23201d] p-4 sm:p-5 rounded-2xl border border-stone-200/80 dark:border-[#342f2b] space-y-3">
              <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-semibold text-xs">
                <UserIcon className="w-4 h-4" /> Account information
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="bg-white dark:bg-[#1a1816] p-3.5 rounded-xl border border-stone-200/80 dark:border-[#2e2a26]">
                  <span className="text-[11px] font-medium text-stone-500 dark:text-stone-400 block">Your name</span>
                  <span className="font-semibold text-stone-900 dark:text-stone-100 text-sm">{user.name || 'Partner'}</span>
                </div>
                <div className="bg-white dark:bg-[#1a1816] p-3.5 rounded-xl border border-stone-200/80 dark:border-[#2e2a26]">
                  <span className="text-[11px] font-medium text-stone-500 dark:text-stone-400 block">Email</span>
                  <span className="font-medium text-stone-700 dark:text-stone-300 truncate block text-xs">{user.email || 'partner@lumina.app'}</span>
                </div>
              </div>
              <div className="bg-white dark:bg-[#1a1816] p-3.5 rounded-xl border border-stone-200/80 dark:border-[#2e2a26] flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <span className="text-[11px] font-medium text-stone-500 dark:text-stone-400 block">Partner invite code</span>
                  <span className="font-mono font-semibold text-indigo-600 dark:text-indigo-400 text-sm tabular-nums truncate block">{user.partnerCode || user.id}</span>
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    await navigator.clipboard.writeText(user.partnerCode || user.id);
                    showNotice('Partner Code copied to clipboard!', 'success');
                  }}
                  className="px-3 py-1.5 bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 text-indigo-600 dark:text-indigo-400 rounded-lg text-xs font-semibold cursor-pointer shrink-0 whitespace-nowrap"
                >
                  Copy code
                </button>
              </div>
            </div>

            {/* Section 2: Privacy & Sharing Controls */}
            <div className="bg-[#faf8f6] dark:bg-[#23201d] p-4 sm:p-5 rounded-2xl border border-stone-200/80 dark:border-[#342f2b] space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-pink-600 dark:text-pink-400 font-semibold text-xs">
                  <Shield className="w-4 h-4" /> Sharing & privacy
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    const updated = { ...user, isSharingPaused: !user.isSharingPaused };
                    setUser(updated);
                    await syncUser(updated);
                  }}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold cursor-pointer transition-colors whitespace-nowrap shrink-0 ${
                    user.isSharingPaused 
                      ? 'bg-amber-100 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800' 
                      : 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                  }`}
                >
                  {user.isSharingPaused ? 'Sharing paused' : 'Sharing active'}
                </button>
              </div>
              <div className="space-y-2 pt-1">
                <SharingToggle label="Share Cycle Information" active={user.sharingSettings?.shareCycleInfo === true} onChange={(v) => updateSharing('shareCycleInfo', v)} />
                <SharingToggle label="Share Symptoms & Comfort" active={user.sharingSettings?.shareSymptoms === true} onChange={(v) => updateSharing('shareSymptoms', v)} />
                <SharingToggle label="Share Mood Updates" active={user.sharingSettings?.shareMood === true} onChange={(v) => updateSharing('shareMood', v)} />
                <SharingToggle label="Share Appointment Reminders" active={user.sharingSettings?.shareAppointmentReminders === true} onChange={(v) => updateSharing('shareAppointmentReminders', v)} />
              </div>
            </div>

            {/* Section 3: Partner Education Shortcut */}
            <div className="bg-[#faf8f6] dark:bg-[#23201d] p-4 rounded-2xl border border-stone-200/80 dark:border-[#342f2b] flex items-center justify-between gap-3">
              <div>
                <span className="font-semibold text-xs text-stone-900 dark:text-stone-100 flex items-center gap-1.5">
                  <GraduationCap className="w-4 h-4 text-indigo-600 dark:text-indigo-400" /> Partner Education Guide
                </span>
                <span className="text-xs text-stone-500 dark:text-stone-400 block mt-0.5">Learn about the 4 cycle phases, PMS, and support tips</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowSettings(false);
                  setActiveTab('education');
                }}
                className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold cursor-pointer shrink-0 transition-colors whitespace-nowrap"
              >
                Open guide
              </button>
            </div>

            {/* Section 4: Connection Info & Unlink */}
            {user.isPartnerLinked && (
              <div className="bg-[#faf8f6] dark:bg-[#23201d] p-4 sm:p-5 rounded-2xl border border-stone-200/80 dark:border-[#342f2b] space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-stone-700 dark:text-stone-200 font-semibold text-xs">
                    <Users className="w-4 h-4 text-indigo-600 dark:text-indigo-400" /> Partner connection
                  </div>
                  <span className="px-2.5 py-0.5 bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 rounded-md text-[11px] font-semibold">
                    Active link
                  </span>
                </div>
                <p className="text-xs text-stone-600 dark:text-stone-300">
                  Connected with: <span className="font-semibold text-stone-900 dark:text-stone-100">{getCleanName(partnerUser?.name || user.partnerName, partnerUser?.email) || 'Partner'}</span>
                </p>
                {!showUnlinkInSettingsConfirm ? (
                  <button
                    type="button"
                    onClick={() => setShowUnlinkInSettingsConfirm(true)}
                    className="w-full h-10 bg-rose-50 dark:bg-rose-950/30 hover:bg-rose-100 dark:hover:bg-rose-950/50 text-rose-600 dark:text-rose-400 rounded-xl text-xs font-semibold border border-rose-200 dark:border-rose-900/50 cursor-pointer transition-colors"
                  >
                    Unlink partner connection
                  </button>
                ) : (
                  <div className="p-3 bg-rose-50 dark:bg-rose-950/30 rounded-xl border border-rose-200 dark:border-rose-900/50 space-y-2">
                    <p className="text-xs font-medium text-rose-800 dark:text-rose-200">Are you sure you want to disconnect and immediately stop sharing?</p>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setShowUnlinkInSettingsConfirm(false)}
                        className="flex-1 h-9 bg-white dark:bg-[#1a1816] text-stone-600 dark:text-stone-300 rounded-lg text-xs font-semibold border border-stone-200 dark:border-[#342f2b] cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          await disconnectPartner(user.id, user.partnerId || '');
                          const updated = { ...user, isPartnerLinked: false, partnerId: '', partnerName: '' };
                          setUser(updated);
                          await syncUser(updated);
                          setShowUnlinkInSettingsConfirm(false);
                          setShowSettings(false);
                          showNotice('Partner connection unlinked and sharing revoked.', 'info');
                        }}
                        className="flex-1 h-9 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold cursor-pointer"
                      >
                        Confirm unlink
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Section 5: Account Actions (Log Out & Delete Account) */}
            <div className="pt-3 border-t border-stone-200/80 dark:border-[#2e2a26] space-y-2.5 text-center">
              <span className="text-xs font-semibold text-stone-500 dark:text-stone-400 block mb-1">Account actions</span>
              
              {onLogout && (
                <button
                  type="button"
                  onClick={() => {
                    setShowSettings(false);
                    setShowLogoutModal(true);
                  }}
                  className="w-full h-11 bg-stone-100 dark:bg-[#23201d] hover:bg-stone-200 dark:hover:bg-[#2e2a26] text-stone-700 dark:text-stone-200 rounded-xl font-semibold text-xs cursor-pointer transition-colors flex items-center justify-center gap-2 border border-stone-200/80 dark:border-[#342f2b]"
                >
                  <LogOut className="w-4 h-4 text-stone-600 dark:text-stone-300" /> Log out
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  setShowSettings(false);
                  setShowDeleteAccountModal(true);
                }}
                className="w-full h-11 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-semibold text-xs cursor-pointer transition-colors flex items-center justify-center gap-2"
              >
                <Trash2 className="w-4 h-4" /> Delete account & data
              </button>

              <button
                type="button"
                onClick={() => setShowSettings(false)}
                className="text-xs font-semibold text-stone-500 hover:text-stone-800 dark:hover:text-stone-200 cursor-pointer pt-2 inline-block"
              >
                Close settings
              </button>
            </div>
          </div>
        </div>
      )}

      {/* GLOBAL LOGOUT CONFIRMATION MODAL */}
      {showLogoutModal && (
        <div className="fixed inset-0 bg-stone-950/60 backdrop-blur-sm z-[170] flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white dark:bg-[#1a1816] rounded-2xl p-6 max-w-sm w-full space-y-5 border border-stone-200/80 dark:border-[#2e2a26] shadow-2xl text-center">
            <div className="w-14 h-14 bg-rose-50 dark:bg-rose-950/40 rounded-2xl border border-rose-200/70 dark:border-rose-900/50 flex items-center justify-center text-rose-600 dark:text-rose-400 mx-auto">
              <LogOut className="w-6 h-6" />
            </div>
            <div className="space-y-2">
              <h3 className="font-serif font-semibold text-lg text-stone-900 dark:text-stone-100">Partner logout</h3>
              <p className="text-xs text-stone-600 dark:text-stone-400 leading-relaxed">
                Are you sure you want to log out of Lumina Partner Mode?
              </p>
            </div>
            <div className="flex gap-3 pt-1">
              <button
                type="button"
                onClick={() => setShowLogoutModal(false)}
                className="flex-1 h-10 bg-stone-100 dark:bg-[#23201d] hover:bg-stone-200 dark:hover:bg-[#2e2a26] text-stone-700 dark:text-stone-200 font-semibold text-xs rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowLogoutModal(false);
                  if (onLogout) onLogout();
                }}
                className="flex-1 h-10 bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs rounded-xl transition-colors cursor-pointer"
              >
                Log out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* GLOBAL REAUTHENTICATED DELETE ACCOUNT MODAL */}
      <DeleteAccountModal
        isOpen={showDeleteAccountModal}
        user={user}
        onClose={() => setShowDeleteAccountModal(false)}
        onDeleted={() => {
          if (onLogout) onLogout();
          else setUser(null);
        }}
      />
    </>
  );

  if (onboardingStep > 0 && connectionRequest) {
    return (
      <div className="space-y-6 animate-fadeIn pb-24 max-w-lg mx-auto min-h-[70vh] flex flex-col justify-center">
        {onboardingStep === 1 && (
          <div className="bg-white dark:bg-[#1a1816] border border-stone-200/80 dark:border-[#2e2a26] rounded-2xl p-8 text-center space-y-6 animate-fadeIn shadow-xs">
            <div className="relative mx-auto w-20 h-20">
              <div className="w-20 h-20 bg-pink-50 dark:bg-pink-950/40 border border-pink-200/70 dark:border-pink-900/50 rounded-2xl flex items-center justify-center text-pink-600 dark:text-pink-400">
                <Heart className="w-9 h-9" />
              </div>
              <div className="absolute -top-2 -right-2 w-7 h-7 bg-emerald-600 rounded-full flex items-center justify-center text-white border-2 border-white dark:border-[#1a1816]">
                <Check className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl sm:text-3xl font-serif text-stone-900 dark:text-stone-100 font-semibold">
                You&apos;re now connected with {connectionRequest.name}
              </h2>
              <p className="text-sm text-stone-500 dark:text-stone-400 leading-relaxed">
                You can now view cycle updates and support your partner better.
              </p>
            </div>
            <button 
              type="button"
              onClick={() => setOnboardingStep(2)}
              className="w-full h-11 bg-pink-600 hover:bg-pink-700 text-white rounded-xl font-semibold text-sm transition-colors cursor-pointer"
            >
              Continue
            </button>
          </div>
        )}

        {onboardingStep === 2 && (
          <div className="bg-white dark:bg-[#1a1816] border border-stone-200/80 dark:border-[#2e2a26] rounded-2xl p-8 text-center space-y-6 animate-fadeIn shadow-xs">
            <div className="w-16 h-16 bg-pink-50 dark:bg-pink-950/40 border border-pink-200/70 dark:border-pink-900/50 rounded-2xl flex items-center justify-center text-pink-600 dark:text-pink-400 mx-auto">
              <Sparkles className="w-7 h-7" />
            </div>
            <div className="space-y-3">
              <h2 className="text-2xl sm:text-3xl font-serif text-stone-900 dark:text-stone-100 font-semibold">Welcome to Partner Mode</h2>
              <div className="space-y-2 text-sm text-stone-600 dark:text-stone-300 leading-relaxed">
                <p>Stay informed about your partner&apos;s cycle</p>
                <p>Get reminders and support tips</p>
                <p>Be more present and understanding</p>
              </div>
            </div>
            <button 
              type="button"
              onClick={() => setOnboardingStep(3)}
              className="w-full h-11 bg-pink-600 hover:bg-pink-700 text-white rounded-xl font-semibold text-sm transition-colors cursor-pointer"
            >
              Next
            </button>
          </div>
        )}

        {onboardingStep === 3 && (
          <div className="bg-white dark:bg-[#1a1816] border border-stone-200/80 dark:border-[#2e2a26] rounded-2xl p-8 text-center space-y-6 animate-fadeIn shadow-xs">
            <h2 className="text-2xl sm:text-3xl font-serif text-stone-900 dark:text-stone-100 font-semibold">What you&apos;ll see</h2>
            <div className="grid grid-cols-1 gap-3 text-left">
              <div className="p-4 bg-[#faf8f6] dark:bg-[#23201d] rounded-xl border border-stone-200/80 dark:border-[#342f2b] flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-white dark:bg-[#1a1816] border border-stone-200/80 dark:border-[#2e2a26] flex items-center justify-center text-pink-600 dark:text-pink-400 shrink-0">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-semibold text-stone-900 dark:text-stone-100 text-sm">Cycle updates</h4>
                  <p className="text-xs text-stone-500 dark:text-stone-400">Know when her period is approaching</p>
                </div>
              </div>
              <div className="p-4 bg-[#faf8f6] dark:bg-[#23201d] rounded-xl border border-stone-200/80 dark:border-[#342f2b] flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-white dark:bg-[#1a1816] border border-stone-200/80 dark:border-[#2e2a26] flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
                  <Lightbulb className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-semibold text-stone-900 dark:text-stone-100 text-sm">Support tips</h4>
                  <p className="text-xs text-stone-500 dark:text-stone-400">Get suggestions on how to help</p>
                </div>
              </div>
              <div className="p-4 bg-[#faf8f6] dark:bg-[#23201d] rounded-xl border border-stone-200/80 dark:border-[#342f2b] flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-white dark:bg-[#1a1816] border border-stone-200/80 dark:border-[#2e2a26] flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
                  <Gift className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-semibold text-stone-900 dark:text-stone-100 text-sm">Care reminders</h4>
                  <p className="text-xs text-stone-500 dark:text-stone-400">Never forget important moments</p>
                </div>
              </div>
            </div>
            <button 
              type="button"
              onClick={() => setOnboardingStep(4)}
              className="w-full h-11 bg-pink-600 hover:bg-pink-700 text-white rounded-xl font-semibold text-sm transition-colors cursor-pointer"
            >
              Next
            </button>
          </div>
        )}

        {onboardingStep === 4 && (
          <div className="bg-white dark:bg-[#1a1816] border border-stone-200/80 dark:border-[#2e2a26] rounded-2xl p-8 text-center space-y-6 animate-fadeIn shadow-xs">
            <div className="w-16 h-16 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200/70 dark:border-indigo-900/50 rounded-2xl flex items-center justify-center text-indigo-600 dark:text-indigo-400 mx-auto">
              <Lock className="w-7 h-7" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl sm:text-3xl font-serif text-stone-900 dark:text-stone-100 font-semibold">Respect & privacy</h2>
              <p className="text-sm text-stone-500 dark:text-stone-400 leading-relaxed px-2">
                Your partner controls what you can see. Please respect their privacy and use this feature to support them.
              </p>
            </div>
            <button 
              type="button"
              onClick={() => setOnboardingStep(5)}
              className="w-full h-11 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold text-sm transition-colors cursor-pointer"
            >
              I understand
            </button>
          </div>
        )}

        {onboardingStep === 5 && (
          <div className="bg-white dark:bg-[#1a1816] border border-stone-200/80 dark:border-[#2e2a26] rounded-2xl p-8 text-center space-y-6 animate-fadeIn shadow-xs">
            <div className="w-16 h-16 bg-pink-50 dark:bg-pink-950/40 border border-pink-200/70 dark:border-pink-900/50 rounded-2xl flex items-center justify-center text-pink-600 dark:text-pink-400 mx-auto">
              <Bell className="w-7 h-7" />
            </div>
            <div className="space-y-3">
              <h2 className="text-2xl sm:text-3xl font-serif text-stone-900 dark:text-stone-100 font-semibold">Personalization</h2>
              <p className="text-xs text-stone-500 dark:text-stone-400 font-semibold">Notification style</p>
              <div className="grid grid-cols-1 gap-3">
                <button 
                  type="button"
                  onClick={() => setNotificationStyle('gentle')}
                  className={`p-4 rounded-xl border transition-all text-left flex items-center justify-between cursor-pointer ${notificationStyle === 'gentle' ? 'bg-pink-600 text-white border-pink-600' : 'bg-[#faf8f6] dark:bg-[#23201d] text-stone-900 dark:text-stone-100 border-stone-200/80 dark:border-[#342f2b]'}`}
                >
                  <div>
                    <h4 className="font-semibold text-sm">Gentle reminders</h4>
                    <p className={`text-xs ${notificationStyle === 'gentle' ? 'text-pink-100' : 'text-stone-500 dark:text-stone-400'}`}>Only important updates</p>
                  </div>
                  {notificationStyle === 'gentle' && <Check className="w-4 h-4" />}
                </button>
                <button 
                  type="button"
                  onClick={() => setNotificationStyle('full')}
                  className={`p-4 rounded-xl border transition-all text-left flex items-center justify-between cursor-pointer ${notificationStyle === 'full' ? 'bg-pink-600 text-white border-pink-600' : 'bg-[#faf8f6] dark:bg-[#23201d] text-stone-900 dark:text-stone-100 border-stone-200/80 dark:border-[#342f2b]'}`}
                >
                  <div>
                    <h4 className="font-semibold text-sm">Full updates</h4>
                    <p className={`text-xs ${notificationStyle === 'full' ? 'text-pink-100' : 'text-stone-500 dark:text-stone-400'}`}>Detailed cycle notifications</p>
                  </div>
                  {notificationStyle === 'full' && <Check className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <button 
              type="button"
              onClick={() => {
                setOnboardingStep(0);
                setConnectionRequest(null);
              }}
              className="w-full h-11 bg-pink-600 hover:bg-pink-700 text-white rounded-xl font-semibold text-sm transition-colors cursor-pointer"
            >
              Finish setup
            </button>
          </div>
        )}
      </div>
    );
  }

  if (connectionRequest) {
    return (
      <div className="space-y-6 animate-fadeIn pb-24 max-w-lg mx-auto">
        {/* 1. Welcome Header */}
        <header className="bg-white dark:bg-[#1a1816] p-8 rounded-2xl border border-stone-200/80 dark:border-[#2e2a26] shadow-xs text-center space-y-2">
          <div className="w-12 h-12 rounded-xl bg-pink-50 dark:bg-pink-950/40 border border-pink-200/70 dark:border-pink-900/50 flex items-center justify-center text-pink-600 dark:text-pink-400 mx-auto mb-2">
            <Mail className="w-6 h-6" />
          </div>
          <h2 className="text-2xl sm:text-3xl font-serif text-stone-900 dark:text-stone-100 font-semibold">You&apos;ve been invited</h2>
          <p className="text-sm text-stone-600 dark:text-stone-400">
            <span className="font-semibold text-stone-900 dark:text-stone-100">{connectionRequest.name}</span> has invited you to connect on Partner Mode.
          </p>
        </header>

        {/* 2. User Identity Section */}
        <section className="bg-white dark:bg-[#1a1816] p-6 sm:p-8 rounded-2xl shadow-xs border border-stone-200/80 dark:border-[#2e2a26] flex flex-col items-center gap-6">
          <div className="relative">
            <div className="w-20 h-20 bg-pink-50 dark:bg-pink-950/40 rounded-2xl flex items-center justify-center text-3xl font-serif font-semibold text-pink-600 dark:text-pink-400 border border-pink-200/70 dark:border-pink-900/50">
              {connectionRequest.name.charAt(0)}
            </div>
            <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-white dark:bg-[#23201d] rounded-full shadow-sm flex items-center justify-center border border-stone-200/80 dark:border-[#342f2b] text-pink-600 dark:text-pink-400">
              <Heart className="w-4 h-4" />
            </div>
          </div>
          
          <div className="text-center space-y-1">
            <h3 className="text-xl font-serif font-semibold text-stone-900 dark:text-stone-100">{connectionRequest.name}</h3>
            <p className="text-xs font-medium text-pink-600 dark:text-pink-400">Your blooming partner</p>
          </div>

          {/* 4. Optional Preview */}
          <div className="w-full grid grid-cols-1 gap-2.5">
            <div className="flex items-center gap-3 p-3.5 bg-[#faf8f6] dark:bg-[#23201d] rounded-xl border border-stone-200/80 dark:border-[#342f2b]">
              <Calendar className="w-4 h-4 text-pink-600 dark:text-pink-400 shrink-0" />
              <p className="text-xs text-stone-700 dark:text-stone-300 font-medium">View cycle updates &amp; predictions</p>
            </div>
            <div className="flex items-center gap-3 p-3.5 bg-[#faf8f6] dark:bg-[#23201d] rounded-xl border border-stone-200/80 dark:border-[#342f2b]">
              <Clock className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
              <p className="text-xs text-stone-700 dark:text-stone-300 font-medium">Receive smart care reminders</p>
            </div>
            <div className="flex items-center gap-3 p-3.5 bg-[#faf8f6] dark:bg-[#23201d] rounded-xl border border-stone-200/80 dark:border-[#342f2b]">
              <Shield className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <p className="text-xs text-stone-700 dark:text-stone-300 font-medium">Support your partner better</p>
            </div>
          </div>

          {/* Privacy Message */}
          <div className="w-full p-3.5 bg-indigo-50/70 dark:bg-indigo-950/30 rounded-xl border border-indigo-200/70 dark:border-indigo-900/50 flex items-center gap-3">
            <Lock className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
            <p className="text-xs text-indigo-700 dark:text-indigo-300 font-medium leading-relaxed">
              Your connection is private and secure. Only approved data will be shared.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="w-full space-y-2.5">
            <button 
              type="button"
              onClick={acceptConnection}
              className="w-full h-11 bg-pink-600 hover:bg-pink-700 text-white rounded-xl font-semibold text-sm transition-colors cursor-pointer"
            >
              Accept &amp; connect
            </button>
            <button 
              type="button"
              onClick={() => setConnectionRequest(null)}
              className="w-full h-10 bg-white dark:bg-[#23201d] border border-stone-200/80 dark:border-[#342f2b] text-stone-600 dark:text-stone-300 rounded-xl font-semibold text-xs hover:bg-stone-50 dark:hover:bg-[#2a2622] transition-colors cursor-pointer"
            >
              Decline
            </button>
          </div>
        </section>

        {/* Fallback */}
        <div className="text-center space-y-3 p-4">
          <p className="text-xs font-medium text-stone-500 dark:text-stone-400">Not on Lumina yet?</p>
          <div className="flex justify-center gap-3">
            <button type="button" className="px-4 py-2 bg-stone-100 dark:bg-[#23201d] text-stone-600 dark:text-stone-300 rounded-lg text-xs font-medium">Download App</button>
            <button type="button" className="px-4 py-2 text-pink-600 dark:text-pink-400 text-xs font-medium underline underline-offset-4">Already installed?</button>
          </div>
        </div>
      </div>
    );
  }

  const addReminder = (text?: string) => {
    const finalStep = text || newReminderText;
    if (!finalStep.trim()) return;
    const reminder: Reminder = {
      id: crypto.randomUUID(),
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
    showNotice('Copied to clipboard, hero! 💌', 'success');
  };

  const finishOnboarding = () => {
    setUser({ ...user, onboardingCompleted: true, partnerOnboardingCompleted: true });
    setPartnerStep(6);
  };

  if (user.isPartner && (partnerStep === 4 || ((user.isPartnerLinked || user.partnerRequest?.status === 'approved' || outgoingRequests.some(r => r.status === 'approved')) && !user.partnerOnboardingCompleted))) {
    return (
      <>
        {renderNoticeBanner()}
        <PartnerOnboardingWizard
          user={user}
          setUser={setUser}
          onComplete={(completedUser) => {
            setUser(completedUser);
            const rememberMe = localStorage.getItem('lumina_remember_me') !== 'false';
            void saveEncryptedSessionUser(completedUser, rememberMe).catch(() => {});
            localStorage.removeItem('lumina_user');
            if (completedUser.email) {
              const emailKey = completedUser.email.toLowerCase().trim();
              void secureStorage.setItem('offline_user_' + emailKey, JSON.stringify(completedUser)).catch(() => {});
              localStorage.removeItem('lumina_user_email_' + emailKey);
            }
            syncUser(completedUser);
            setPartnerStep(6);
          }}
        />
      </>
    );
  }

  if (user.isPartner && user.partnerId && partnerStep < 6) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center p-4 sm:p-6 animate-fadeIn font-sans">
        {renderNoticeBanner()}
        <div className="w-full max-w-md bg-white dark:bg-[#1a1816] rounded-2xl shadow-sm border border-stone-200/80 dark:border-[#2e2a26] p-6 sm:p-8 space-y-6 relative overflow-hidden">
          {/* Progress Bar */}
          <div className="absolute top-0 left-0 w-full h-1.5 bg-stone-100 dark:bg-[#23201d]">
            <div 
              className="h-full bg-pink-600 transition-all duration-500" 
              style={{ width: `${(partnerStep / 5) * 100}%` }}
            ></div>
          </div>

          {partnerStep === 1 && (
            <div className="text-center space-y-5 animate-fadeIn py-4">
              <div className="w-16 h-16 bg-pink-50 dark:bg-pink-950/40 border border-pink-200/70 dark:border-pink-900/50 rounded-2xl flex items-center justify-center text-pink-600 dark:text-pink-400 mx-auto">
                <Heart className="w-7 h-7" />
              </div>
              <h2 className="text-2xl sm:text-3xl font-serif text-stone-900 dark:text-stone-100 leading-tight font-semibold">
                {getCleanName(user.partnerName, user.partnerEmail) || 'Your partner'} invited you to connect on Lumina
              </h2>
              <p className="text-sm text-stone-500 dark:text-stone-400 leading-relaxed max-w-sm mx-auto">
                You are about to connect safely as {getCleanName(user.partnerName, user.partnerEmail) || 'your partner'}&apos;s partner. First, complete your companion connection permission setup.
              </p>
              <button 
                type="button"
                onClick={() => setPartnerStep(2)}
                className="w-full h-11 bg-pink-600 hover:bg-pink-700 text-white rounded-xl font-semibold text-sm transition-colors cursor-pointer"
              >
                Continue
              </button>
            </div>
          )}

          {partnerStep === 2 && (
            <div className="space-y-5 animate-fadeIn py-2">
              <div className="text-center space-y-2">
                <div className="w-12 h-12 bg-pink-50 dark:bg-pink-950/40 border border-pink-200/70 dark:border-pink-900/50 rounded-xl flex items-center justify-center text-pink-600 dark:text-pink-400 mx-auto">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <h2 className="text-2xl font-serif text-stone-900 dark:text-stone-100 font-semibold">What updates would you like to receive?</h2>
                <p className="text-xs text-stone-500 dark:text-stone-400">Select the categories you request to stay synchronized with:</p>
              </div>

              <div className="max-h-[300px] overflow-y-auto pr-1 space-y-2 border border-stone-200/80 dark:border-[#2e2a26] p-3.5 rounded-xl bg-[#faf8f6] dark:bg-[#23201d]">
                {[
                  "Period Updates",
                  "Fertility Updates",
                  "Ovulation Updates",
                  "Pregnancy Updates",
                  "Mood Updates",
                  "Wellness Updates"
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
                      className={`flex items-center gap-3 p-3 rounded-xl border transition-colors cursor-pointer text-left ${isChecked ? 'border-pink-500 bg-pink-50/70 dark:bg-pink-950/30' : 'border-stone-200/80 dark:border-[#342f2b] bg-white dark:bg-[#1a1816] hover:border-pink-300'}`}
                    >
                      <div className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 ${isChecked ? 'border-pink-600 bg-pink-600 text-white' : 'border-stone-300 dark:border-stone-600'}`}>
                        {isChecked && <Check className="w-3.5 h-3.5" />}
                      </div>
                      <span className="text-xs font-semibold text-stone-800 dark:text-stone-200">{item}</span>
                    </div>
                  );
                })}
              </div>

              <button 
                type="button"
                onClick={async () => {
                  setLoading(true);
                  try {
                    const targetPartnerId = user.partnerId || connectionRequest?.senderId || '';
                    const targetPartnerName = user.partnerName || connectionRequest?.senderName || 'Partner';

                    const req = {
                      partnerId: user.id,
                      partnerName: user.name,
                      requestedReceives: requestedReceives,
                      status: 'pending' as const,
                      timestamp: new Date().toISOString()
                    };
                    const updatedUser = {
                      ...user,
                      partnerId: targetPartnerId,
                      partnerName: targetPartnerName,
                      partnerRequest: req,
                      partnerOnboardingCompleted: false
                    };
                    setUser(updatedUser);
                    await syncUser(updatedUser);

                    if (targetPartnerId) {
                      await submitPartnerRequest(
                        targetPartnerId,
                        user.id || '',
                        user.name || '',
                        user.email || '',
                        requestedReceives
                      );

                      await addNotificationToUser(targetPartnerId, {
                        title: 'New Partner Connection Request',
                        body: `${user.name} requested to connect on Partner Mode. Tap to review and accept or decline.`,
                        emoji: '💕'
                      });
                    }

                    setPartnerStep(3);
                  } catch (err) {
                    console.error(err);
                  } finally {
                    setLoading(false);
                  }
                }}
                className="w-full h-11 bg-pink-600 hover:bg-pink-700 text-white rounded-xl font-semibold text-sm transition-colors cursor-pointer"
              >
                Submit request
              </button>
            </div>
          )}

          {partnerStep === 3 && (
            <div className="text-center space-y-5 animate-fadeIn py-4">
              <div className="w-16 h-16 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200/70 dark:border-indigo-900/50 rounded-2xl flex items-center justify-center text-indigo-600 dark:text-indigo-400 mx-auto">
                <Mail className="w-7 h-7" />
              </div>
              <h2 className="text-2xl font-serif text-stone-900 dark:text-stone-100 font-semibold leading-tight">Connection request sent to {partnerDisplayName}.</h2>
              <div className="space-y-2 max-w-sm mx-auto">
                <p className="text-xs text-stone-600 dark:text-stone-300 leading-relaxed">
                  We have sent your connection and privacy request to <span className="font-semibold text-stone-900 dark:text-stone-100">{partnerDisplayName}</span>.
                </p>
                <p className="text-xs text-stone-500 dark:text-stone-400">
                  Once she reviews and approves your requested options, you&apos;ll be able to access your companion dashboard.
                </p>
              </div>

              <div className="p-4 bg-[#faf8f6] dark:bg-[#23201d] rounded-xl border border-stone-200/80 dark:border-[#342f2b] text-left space-y-2">
                <p className="text-xs font-semibold text-indigo-700 dark:text-indigo-300 tabular-nums">Requested categories ({requestedReceives.length})</p>
                <div className="flex flex-wrap gap-1.5 max-h-[120px] overflow-y-auto p-1">
                  {requestedReceives.map(r => (
                    <span key={r} className="px-2.5 py-1 bg-white dark:bg-[#1a1816] border border-stone-200/80 dark:border-[#2e2a26] rounded-md text-xs font-medium text-stone-700 dark:text-stone-300">{r}</span>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-center gap-2 py-2">
                <span className="w-2 h-2 bg-amber-500 rounded-full shrink-0" />
                <span className="text-xs font-medium text-stone-600 dark:text-stone-400">Waiting for approval from {partnerDisplayName}.</span>
              </div>

              {!showCancelRequestConfirm ? (
                <button
                  type="button"
                  onClick={() => setShowCancelRequestConfirm(true)}
                  className="text-xs font-semibold text-stone-500 hover:text-rose-600 dark:text-stone-400 dark:hover:text-rose-400 transition-colors cursor-pointer"
                >
                  Disconnect &amp; cancel connection
                </button>
              ) : (
                <div className="p-4 bg-rose-50 dark:bg-rose-950/30 rounded-xl border border-rose-200 dark:border-rose-900/50 space-y-3 text-center">
                  <p className="text-xs font-medium text-rose-800 dark:text-rose-200">Cancel and disconnect from your partner connection?</p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setShowCancelRequestConfirm(false)}
                      className="flex-1 h-9 bg-white dark:bg-[#1a1816] text-stone-600 dark:text-stone-300 rounded-lg text-xs font-semibold border border-stone-200 dark:border-[#342f2b] cursor-pointer"
                    >
                      Keep waiting
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
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
                        await syncUser(updated);
                        setShowCancelRequestConfirm(false);
                        setPartnerStep(0);
                      }}
                      className="flex-1 h-9 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold cursor-pointer"
                    >
                      Disconnect
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {partnerStep === 4 && (
            <div className="text-center space-y-5 animate-fadeIn py-4">
              <div className="w-16 h-16 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/70 dark:border-emerald-900/50 rounded-2xl flex items-center justify-center text-emerald-600 dark:text-emerald-400 mx-auto">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h2 className="text-2xl sm:text-3xl font-serif text-stone-900 dark:text-stone-100 font-semibold">Request approved</h2>
              <p className="text-sm text-stone-600 dark:text-stone-300 leading-relaxed max-w-sm mx-auto">
                <span className="font-semibold text-stone-900 dark:text-stone-100">{getCleanName(user.partnerName, user.partnerEmail) || 'Your partner'}</span> has approved and completed setting up your sharing permissions.
              </p>
              <button 
                type="button"
                onClick={async () => {
                  setLoading(true);
                  try {
                    const updatedUser = { ...user, onboardingCompleted: true, partnerOnboardingCompleted: true };
                    setUser(updatedUser);
                    await syncUser(updatedUser);
                    setPartnerStep(6);
                  } catch (err) {
                    console.error(err);
                  } finally {
                    setLoading(false);
                  }
                }}
                className="w-full h-11 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold text-sm transition-colors cursor-pointer"
              >
                Enter companion dashboard
              </button>
            </div>
          )}

          {partnerStep === 5 && (
            <div className="text-center space-y-5 animate-fadeIn py-4">
              <div className="w-16 h-16 bg-rose-50 dark:bg-rose-950/40 border border-rose-200/70 dark:border-rose-900/50 rounded-2xl flex items-center justify-center text-rose-600 dark:text-rose-400 mx-auto">
                <AlertCircle className="w-7 h-7" />
              </div>
              <h2 className="text-2xl sm:text-3xl font-serif text-stone-900 dark:text-stone-100 font-semibold leading-tight">Connection declined</h2>
              <p className="text-sm text-stone-600 dark:text-stone-300 leading-relaxed px-2">
                Your connection request has been declined or unlinked by {user.partnerName || 'your partner'}.
              </p>
              <button 
                type="button"
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
                className="w-full h-11 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-semibold text-sm transition-colors cursor-pointer"
              >
                Disconnect &amp; try again
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  const hasPendingNotificationRequest = (user.notifications || []).some(n => 
    (n.category === 'partner_request' || n.isPartnerRequest || (n.title && n.title.toLowerCase().includes('request')))
  );

  if (!user.isPartner && !user.partnerId && !incomingRequests.some(r => r.status === 'pending') && user.partnerRequest?.status !== 'pending' && !hasPendingNotificationRequest) {
    return (
      <div className="space-y-6 animate-fadeIn pb-24 font-sans select-none">
        {renderNoticeBanner()}
        <header className="bg-white dark:bg-[#1a1816] p-6 sm:p-8 rounded-2xl shadow-xs border border-stone-200/80 dark:border-[#2e2a26] text-center space-y-1">
          <h2 className="text-2xl sm:text-3xl font-serif text-stone-900 dark:text-stone-100 font-semibold">Partner Mode</h2>
          <p className="text-sm text-stone-500 dark:text-stone-400">Connect with your partner privately &amp; securely</p>
        </header>

        <section className="bg-white dark:bg-[#1a1816] p-6 sm:p-8 rounded-2xl shadow-xs border border-stone-200/80 dark:border-[#2e2a26] flex flex-col items-center gap-6">
          <div className="w-14 h-14 bg-pink-50 dark:bg-pink-950/40 border border-pink-200/70 dark:border-pink-900/50 rounded-2xl flex items-center justify-center text-pink-600 dark:text-pink-400">
            {generatingLink ? <Sparkles className="w-6 h-6" /> : <Users className="w-6 h-6" />}
          </div>

          <div className="w-full space-y-5">
            {generatingLink ? (
              <div className="p-8 text-center space-y-3 bg-[#faf8f6] dark:bg-[#23201d] rounded-2xl border border-stone-200/80 dark:border-[#342f2b]">
                <div className="inline-block animate-spin rounded-full h-7 w-7 border-2 border-pink-600 border-t-transparent"></div>
                <p className="text-sm font-semibold text-stone-900 dark:text-stone-100">Creating your private partner connection...</p>
                <p className="text-xs text-stone-500 dark:text-stone-400">Establishing a secure, private sharing channel.</p>
              </div>
            ) : (
              <>
                {!user.partnerCode ? (
                  <button 
                    type="button"
                    onClick={handleGenerateCode}
                    className="w-full h-11 bg-pink-600 hover:bg-pink-700 text-white rounded-xl font-semibold text-sm transition-colors flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Share2 className="w-4 h-4" /> Generate invite link
                  </button>
                ) : (
                  <div className="space-y-5 animate-fadeIn">
                    
                    {/* Success Message Header */}
                    <div className="bg-[#faf8f6] dark:bg-[#23201d] border border-stone-200/80 dark:border-[#342f2b] rounded-2xl p-6 text-center space-y-2.5">
                      <h3 className="text-lg font-serif font-semibold text-stone-900 dark:text-stone-100">Partner invitation ready</h3>
                      <p className="text-xs text-stone-500 dark:text-stone-400 font-medium">Invite code</p>
                      <div className="bg-white dark:bg-[#1a1816] py-2.5 px-6 rounded-xl border border-stone-200/80 dark:border-[#2e2a26] inline-block text-xl font-mono font-bold text-pink-600 dark:text-pink-400 tracking-widest tabular-nums">
                        {user.partnerCode}
                      </div>
                    </div>

                    {/* Pre-existing Link Display */}
                    <div className="bg-[#faf8f6] dark:bg-[#23201d] p-4 rounded-xl border border-stone-200/80 dark:border-[#342f2b] space-y-2">
                      <p className="text-xs font-medium text-stone-500 dark:text-stone-400 text-left">Current partner link</p>
                      <div className="flex items-center gap-2 bg-white dark:bg-[#1a1816] p-2.5 rounded-xl border border-stone-200/80 dark:border-[#2e2a26]">
                        <div className="text-xs text-stone-700 dark:text-stone-300 font-mono truncate flex-1 text-left">
                          lumina.app/invite/{user.partnerCode}
                        </div>
                        <button 
                          type="button"
                          onClick={() => copyOnlyLink()}
                          className={`shrink-0 px-3.5 py-1.5 rounded-lg border text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                            linkOnlyCopied 
                              ? 'bg-emerald-600 border-emerald-600 text-white' 
                              : 'bg-stone-50 dark:bg-[#23201d] border-stone-200/80 dark:border-[#342f2b] text-stone-700 dark:text-stone-200 hover:bg-stone-100'
                          }`}
                        >
                          {linkOnlyCopied ? <><Check className="w-3.5 h-3.5" /> Copied</> : <><Copy className="w-3.5 h-3.5" /> Copy</>}
                        </button>
                      </div>
                    </div>

                    {/* Share Channels */}
                    <div className="space-y-3">
                      <p className="text-xs font-semibold text-stone-600 dark:text-stone-400 text-left">Share options</p>
                      
                      <div className="grid grid-cols-2 gap-3">
                        <button
                          type="button"
                          onClick={copyInviteLink}
                          className="p-4 bg-[#faf8f6] dark:bg-[#23201d] hover:bg-stone-100 dark:hover:bg-[#2a2622] border border-stone-200/80 dark:border-[#342f2b] rounded-xl text-left transition-colors flex flex-col justify-between gap-2.5 cursor-pointer group"
                        >
                          <Copy className="w-5 h-5 text-pink-600 dark:text-pink-400" />
                          <div>
                            <p className="font-semibold text-xs text-stone-900 dark:text-stone-100">Copy link</p>
                            <p className="text-[11px] text-stone-500 dark:text-stone-400">
                              {copied ? 'Copied to clipboard' : 'Copy invite text'}
                            </p>
                          </div>
                        </button>

                        <a
                          href={`https://api.whatsapp.com/send?text=${encodeURIComponent(`Join my Partner Mode on Lumina to stay connected ${inviteLink}`)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-4 bg-[#faf8f6] dark:bg-[#23201d] hover:bg-stone-100 dark:hover:bg-[#2a2622] border border-stone-200/80 dark:border-[#342f2b] rounded-xl text-left transition-colors flex flex-col justify-between gap-2.5 cursor-pointer"
                        >
                          <MessageSquare className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                          <div>
                            <p className="font-semibold text-xs text-stone-900 dark:text-stone-100">WhatsApp</p>
                            <p className="text-[11px] text-stone-500 dark:text-stone-400">Send message instantly</p>
                          </div>
                        </a>

                        <a
                          href={`sms:?&body=${encodeURIComponent(`Join my Partner Mode on Lumina ${inviteLink}`)}`}
                          className="p-4 bg-[#faf8f6] dark:bg-[#23201d] hover:bg-stone-100 dark:hover:bg-[#2a2622] border border-stone-200/80 dark:border-[#342f2b] rounded-xl text-left transition-colors flex flex-col justify-between gap-2.5 cursor-pointer"
                        >
                          <MessageSquare className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                          <div>
                            <p className="font-semibold text-xs text-stone-900 dark:text-stone-100">Messages</p>
                            <p className="text-[11px] text-stone-500 dark:text-stone-400">SMS invitation text</p>
                          </div>
                        </a>

                        <a
                          href={`mailto:?subject=${encodeURIComponent("Join my Lumina Partner Mode")}&body=${encodeURIComponent(`Hi, join my private Partner Mode on Lumina to stay in sync with my cycle and journey: ${inviteLink}`)}`}
                          className="p-4 bg-[#faf8f6] dark:bg-[#23201d] hover:bg-stone-100 dark:hover:bg-[#2a2622] border border-stone-200/80 dark:border-[#342f2b] rounded-xl text-left transition-colors flex flex-col justify-between gap-2.5 cursor-pointer"
                        >
                          <Mail className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                          <div>
                            <p className="font-semibold text-xs text-stone-900 dark:text-stone-100">Email</p>
                            <p className="text-[11px] text-stone-500 dark:text-stone-400">Send email message</p>
                          </div>
                        </a>
                      </div>

                      {/* QR Code Option */}
                      <button
                        type="button"
                        onClick={() => setShowQRCode(!showQRCode)}
                        className="w-full p-4 bg-[#faf8f6] dark:bg-[#23201d] hover:bg-stone-100 dark:hover:bg-[#2a2622] border border-stone-200/80 dark:border-[#342f2b] rounded-xl text-left transition-colors flex items-center justify-between gap-4 cursor-pointer"
                      >
                        <div className="flex items-center gap-3">
                          <QrCode className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />
                          <div>
                            <p className="font-semibold text-xs text-stone-900 dark:text-stone-100">QR Code</p>
                            <p className="text-[11px] text-stone-500 dark:text-stone-400">Scan invitation directly on device</p>
                          </div>
                        </div>
                        <span className="text-xs font-semibold text-amber-600 dark:text-amber-400 whitespace-nowrap">{showQRCode ? 'Hide' : 'View'}</span>
                      </button>

                      {showQRCode && (
                        <div className="bg-[#faf8f6] dark:bg-[#23201d] border border-stone-200/80 dark:border-[#342f2b] p-5 rounded-2xl text-center space-y-4 animate-slideDownBlock flex flex-col items-center justify-center w-full">
                          <p className="text-xs font-semibold text-stone-700 dark:text-stone-300">Lumina scan invitation</p>
                          <div className="qr-code-container bg-white p-4 rounded-xl border border-stone-200/80 shadow-xs w-full max-w-[260px] aspect-square flex items-center justify-center overflow-hidden mx-auto">
                            <QrCodeCanvas
                              value={inviteLink}
                              size={240}
                              alt="Lumina Partner Invitation QR Code"
                            />
                          </div>
                          <p className="text-xs text-stone-500 dark:text-stone-400 leading-relaxed break-words max-w-full px-2">Have your partner open their camera app to scan and connect instantly.</p>
                        </div>
                      )}
                    </div>

                    {/* Generate New Link button */}
                    <div className="pt-3 border-t border-stone-200/70 dark:border-[#2e2a26] flex justify-end">
                      <button 
                        type="button"
                        onClick={handleForceGenerateNewCode}
                        disabled={generatingLink}
                        className="px-4 py-2 bg-[#faf8f6] dark:bg-[#23201d] hover:bg-stone-100 dark:hover:bg-[#2a2622] rounded-xl font-semibold text-xs border border-stone-200/80 dark:border-[#342f2b] text-pink-600 dark:text-pink-400 transition-colors cursor-pointer flex items-center gap-1.5"
                      >
                        <RefreshCw className="w-3.5 h-3.5" /> Generate new link
                      </button>
                    </div>

                  </div>
                )}
              </>
            )}

            <div className="flex items-center gap-4 py-2">
              <div className="h-[1px] flex-1 bg-stone-200 dark:bg-[#2e2a26]"></div>
              <span className="text-xs font-semibold text-stone-400">OR</span>
              <div className="h-[1px] flex-1 bg-stone-200 dark:bg-[#2e2a26]"></div>
            </div>

            <div className="space-y-2.5">
              <input 
                type="text" 
                value={partnerCodeInput}
                onChange={(e) => setPartnerCodeInput(e.target.value)}
                placeholder="Enter partner code"
                className="w-full h-11 px-4 rounded-xl bg-[#faf8f6] dark:bg-[#23201d] border border-stone-200/80 dark:border-[#342f2b] outline-none focus:border-pink-500 text-center text-stone-900 dark:text-stone-100 font-semibold tracking-wider uppercase text-sm"
              />
              <button 
                type="button"
                onClick={handleLinkPartner}
                className="w-full h-11 bg-white dark:bg-[#23201d] border border-stone-200/80 dark:border-[#342f2b] text-pink-600 dark:text-pink-400 rounded-xl font-semibold text-sm hover:bg-stone-50 dark:hover:bg-[#2a2622] transition-colors cursor-pointer"
              >
                Link partner
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2 text-stone-500 dark:text-stone-400">
            <Lock className="w-4 h-4 shrink-0" />
            <p className="text-xs font-medium">Only your partner can view your shared cycle data</p>
          </div>
        </section>
        {renderGlobalModals()}
      </div>
    );
  }

  if (!user.isPartner && !isPreviewingCompanion && (user.partnerId || incomingRequests.some(r => r.status === 'pending') || user.partnerRequest?.status === 'pending' || hasPendingNotificationRequest)) {
    const activePendingRequest = incomingRequests.find(r => r.status === 'pending') || 
      (user.partnerRequest?.status === 'pending' ? {
        id: `${user.id}_${user.partnerRequest.partnerId || 'partner'}`,
        user_id: user.id,
        partner_id: user.partnerRequest.partnerId || user.partnerId || '',
        partnerName: user.partnerRequest.partnerName || user.partnerName || 'Your partner',
        requested_permissions: user.partnerRequest.requestedReceives || ['Period Updates', 'Fertility Updates', 'Wellness Support', 'Symptom Updates'],
        status: 'pending' as const
      } : null);
    const isPendingApproval = Boolean(activePendingRequest) || (!user.isPartnerLinked && user.partnerRequest?.status === 'pending');
    const isApproved = !activePendingRequest && (user.isPartnerLinked || incomingRequests.some(r => r.status === 'approved' && (!user.partnerId || r.partner_id === user.partnerId)));
    const requestedPermissionsList = activePendingRequest 
      ? activePendingRequest.requested_permissions 
      : (user.partnerRequest?.requestedReceives || []);

    const requesterName = activePendingRequest ? activePendingRequest.partnerName : (user.partnerName || 'Your partner');

    const mapPermissionsToSharingSettings = (permissions: string[]) => {
      const lowercasePerms = permissions.map(p => p.toLowerCase());
      return {
        shareCycleInfo: lowercasePerms.some(p => p.includes('period') || p.includes('cycle') || p.includes('ovulation') || p.includes('fertility')),
        shareFertilityInfo: lowercasePerms.some(p => p.includes('fertility') || p.includes('ovulation')),
        sharePregnancyInfo: lowercasePerms.some(p => p.includes('pregnancy')),
        shareSymptoms: lowercasePerms.some(p => p.includes('symptom') || p.includes('craving')),
        shareMood: lowercasePerms.some(p => p.includes('mood')),
        shareNotes: false,
        shareIntimacyInfo: false,
        shareDoctorReports: false,
        shareAppointmentReminders: lowercasePerms.some(p => p.includes('appointment') || p.includes('reminder')),
        shareWellnessUpdates: lowercasePerms.some(p => p.includes('wellness') || p.includes('insight') || p.includes('support') || p.includes('gift') || p.includes('message')),
      };
    };

    const handleApproveAll = async () => {
      const requested = requestedPermissionsList;
      const approvedSettings = mapPermissionsToSharingSettings(requested);
      
      const partnerIdToSet = activePendingRequest ? activePendingRequest.partner_id : (user.partnerId || '');
      const partnerNameToSet = activePendingRequest ? activePendingRequest.partnerName : (user.partnerName || 'Partner');

      const updatedUser = {
        ...user,
        partnerId: partnerIdToSet,
        partnerName: partnerNameToSet,
        sharingSettings: approvedSettings,
        isPartnerLinked: true
      };
      setUser(updatedUser);
      await syncUser(updatedUser);

      // Update primary user's own connection + partner_shared/summary projection + notify partner
      await completePartnerConnection(user.id, partnerIdToSet, partnerNameToSet, getUserDisplayName(user));

      const reqId = activePendingRequest ? activePendingRequest.id : `${user.id}_${user.partnerId}`;
      await updatePartnerRequestStatus(reqId, 'approved');
      trackAcceptPartnerInvite?.();

      setSubTab('partners');
      showNotice(`You approved ${partnerNameToSet}'s connection and sharing preferences! 💖`, 'success');
    };

    const handleApproveSelected = async () => {
      const approvedSettings = mapPermissionsToSharingSettings(reviewedPermissions);
      
      const partnerIdToSet = activePendingRequest ? activePendingRequest.partner_id : (user.partnerId || '');
      const partnerNameToSet = activePendingRequest ? activePendingRequest.partnerName : (user.partnerName || 'Partner');

      const updatedUser = {
        ...user,
        partnerId: partnerIdToSet,
        partnerName: partnerNameToSet,
        sharingSettings: approvedSettings,
        isPartnerLinked: true
      };
      setUser(updatedUser);
      await syncUser(updatedUser);

      await completePartnerConnection(user.id, partnerIdToSet, partnerNameToSet, getUserDisplayName(user));

      const reqId = activePendingRequest ? activePendingRequest.id : `${user.id}_${user.partnerId}`;
      await updatePartnerRequestStatus(reqId, 'approved');
      trackAcceptPartnerInvite?.();

      setSubTab('partners');
      showNotice(`You approved ${partnerNameToSet}'s connection with your selected categories! 💖`, 'success');
    };

    const executeDeclineRequest = async () => {
      const partnerIdToDecline = activePendingRequest ? activePendingRequest.partner_id : (user.partnerId || '');
      const reqId = activePendingRequest ? activePendingRequest.id : `${user.id}_${partnerIdToDecline}`;
      await updatePartnerRequestStatus(reqId, 'declined');
      trackDeclinePartnerInvite?.();

      const updatedUser = {
        ...user,
        partnerId: undefined,
        partnerName: '',
        isPartnerLinked: false
      };
      setUser(updatedUser);
      await syncUser(updatedUser);

      if (partnerIdToDecline) {
        await addNotificationToUser(partnerIdToDecline, {
          title: 'Partner Request Declined',
          body: `${getUserDisplayName(user)} declined the partner connection request.`,
          emoji: '🔒',
          category: 'partner',
        });
      }

      setShowDeclineConfirm(false);
      showNotice(`Request from ${requesterName} declined.`, 'info');
    };

    const handleSaveCustomSharing = async () => {
      const partnerIdToSet = activePendingRequest ? activePendingRequest.partner_id : (user.partnerId || '');
      const partnerNameToSet = activePendingRequest ? activePendingRequest.partnerName : (user.partnerName || 'Partner');

      const updatedUser = {
        ...user,
        partnerId: partnerIdToSet,
        partnerName: partnerNameToSet,
        isPartnerLinked: true
      };
      setUser(updatedUser);
      await syncUser(updatedUser);

      await completePartnerConnection(user.id, partnerIdToSet, partnerNameToSet, getUserDisplayName(user));

      const reqId = activePendingRequest ? activePendingRequest.id : `${user.id}_${user.partnerId}`;
      await updatePartnerRequestStatus(reqId, 'approved');
      trackAcceptPartnerInvite?.();

      setIsCustomizingSharing(false);
      setSubTab('partners');
      showNotice(`Custom privacy preferences saved and connection approved for ${partnerNameToSet}! 💮`, 'success');
    };

    const togglePauseSharing = async () => {
      const updatedUser = {
        ...user,
        isSharingPaused: !user.isSharingPaused
      };
      setUser(updatedUser);
      await syncUser(updatedUser);
      showNotice(updatedUser.isSharingPaused ? 'Sharing paused immediately.' : 'Sharing resumed.', 'info');
    };

    return (
      <div className="space-y-6 animate-fadeIn pb-24 font-sans select-none">
        {/* Screen Header */}
        <header className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 text-center md:text-left bg-white dark:bg-[#1a1816] p-6 rounded-2xl border border-stone-200/80 dark:border-[#2e2a26] shadow-xs">
          <div>
            <h2 className="text-2xl sm:text-3xl font-serif text-stone-900 dark:text-stone-100 font-semibold tracking-tight">Partner</h2>
            <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">Build understanding and grow together</p>
          </div>
          {onLogout && (
            <button
              type="button"
              onClick={() => setShowLogoutModal(true)}
              className="px-4 py-2 bg-rose-50 dark:bg-rose-950/30 hover:bg-rose-100 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900/50 rounded-xl text-xs font-semibold transition-colors cursor-pointer self-center md:self-auto flex items-center gap-2 whitespace-nowrap"
            >
              <LogOut className="w-3.5 h-3.5" /> Log out
            </button>
          )}
        </header>

        {/* Sub-Navigation tabs */}
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide py-1">
          <button 
            type="button"
            onClick={() => { setSubTab('partners'); setIsCustomizingSharing(false); }}
            className={`px-4 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 transition-colors cursor-pointer flex items-center gap-1.5 ${subTab === 'partners' ? 'bg-pink-600 text-white' : 'bg-white dark:bg-[#1a1816] border border-stone-200/80 dark:border-[#2e2a26] text-stone-700 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-[#23201d]'}`}
          >
            <Users className="w-3.5 h-3.5" /> Connected partners
          </button>
          <button 
            type="button"
            onClick={() => { setSubTab('requests'); }}
            className={`px-4 py-2.5 rounded-xl text-xs font-semibold relative whitespace-nowrap shrink-0 transition-colors cursor-pointer flex items-center gap-1.5 ${subTab === 'requests' ? 'bg-pink-600 text-white' : 'bg-white dark:bg-[#1a1816] border border-stone-200/80 dark:border-[#2e2a26] text-stone-700 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-[#23201d]'}`}
          >
            <Mail className="w-3.5 h-3.5" /> Pending requests
            {isPendingApproval && (
              <span className="ml-1 w-4 h-4 bg-rose-600 rounded-full flex items-center justify-center text-[10px] font-bold text-white">!</span>
            )}
          </button>
          <button 
            type="button"
            onClick={() => { setSubTab('invitations'); setIsCustomizingSharing(false); }}
            className={`px-4 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 transition-colors cursor-pointer flex items-center gap-1.5 ${subTab === 'invitations' ? 'bg-pink-600 text-white' : 'bg-white dark:bg-[#1a1816] border border-stone-200/80 dark:border-[#2e2a26] text-stone-700 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-[#23201d]'}`}
          >
            <Share2 className="w-3.5 h-3.5" /> Sent invitations
          </button>
          <button 
            type="button"
            onClick={() => { setSubTab('privacy'); }}
            className={`px-4 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 transition-colors cursor-pointer flex items-center gap-1.5 ${subTab === 'privacy' ? 'bg-pink-600 text-white' : 'bg-white dark:bg-[#1a1816] border border-stone-200/80 dark:border-[#2e2a26] text-stone-700 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-[#23201d]'}`}
          >
            <Lock className="w-3.5 h-3.5" /> Privacy settings
          </button>
          <button 
            type="button"
            onClick={() => { setSubTab('permissions'); }}
            className={`px-4 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 transition-colors cursor-pointer flex items-center gap-1.5 ${subTab === 'permissions' ? 'bg-pink-600 text-white' : 'bg-white dark:bg-[#1a1816] border border-stone-200/80 dark:border-[#2e2a26] text-stone-700 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-[#23201d]'}`}
          >
            <Settings className="w-3.5 h-3.5" /> Manage permissions
          </button>
          {onLogout && (
            <button 
              type="button"
              onClick={() => setShowLogoutModal(true)}
              className="px-4 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 transition-colors cursor-pointer bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900/50 hover:bg-rose-100 flex items-center gap-1.5"
            >
              <LogOut className="w-3.5 h-3.5" /> Log out
            </button>
          )}
        </div>

        {/* LOGOUT CONFIRMATION MODAL */}
        {showLogoutModal && (
          <div className="fixed inset-0 bg-stone-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn">
            <div className="bg-white dark:bg-[#1a1816] rounded-2xl p-6 max-w-sm w-full space-y-5 border border-stone-200/80 dark:border-[#2e2a26] shadow-2xl text-center">
              <div className="w-14 h-14 bg-rose-50 dark:bg-rose-950/40 border border-rose-200/70 dark:border-rose-900/50 rounded-2xl flex items-center justify-center text-rose-600 dark:text-rose-400 mx-auto">
                <LogOut className="w-6 h-6" />
              </div>
              <div className="space-y-2">
                <h3 className="font-serif font-semibold text-lg text-stone-900 dark:text-stone-100">Partner logout</h3>
                <p className="text-xs text-stone-600 dark:text-stone-400 leading-relaxed">
                  Are you sure you want to log out?
                </p>
              </div>
              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setShowLogoutModal(false)}
                  className="flex-1 h-10 bg-stone-100 dark:bg-[#23201d] hover:bg-stone-200 dark:hover:bg-[#2e2a26] text-stone-700 dark:text-stone-200 font-semibold text-xs rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowLogoutModal(false);
                    if (onLogout) onLogout();
                  }}
                  className="flex-1 h-10 bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs rounded-xl transition-colors cursor-pointer"
                >
                  Log out
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Sub-Tab Contents */}
        {subTab === 'partners' && (
          <div className="space-y-6 animate-fadeIn">
            <section className="bg-white dark:bg-[#1a1816] p-6 sm:p-8 rounded-2xl shadow-xs border border-stone-200/80 dark:border-[#2e2a26] space-y-5">
              <div className="flex items-center gap-4 p-4 sm:p-5 bg-[#faf8f6] dark:bg-[#23201d] rounded-xl border border-stone-200/80 dark:border-[#342f2b]">
                <div className="w-12 h-12 bg-white dark:bg-[#1a1816] border border-stone-200/80 dark:border-[#2e2a26] rounded-xl flex items-center justify-center text-pink-600 dark:text-pink-400 font-serif font-semibold text-lg shrink-0">
                  {(user.partnerName || 'P').charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 text-left min-w-0">
                  <h3 className="text-lg font-serif text-stone-900 dark:text-stone-100 font-semibold truncate">{user.partnerName}</h3>
                  {isApproved ? (
                    <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span> Sync active
                    </p>
                  ) : isPendingApproval ? (
                    <p className="text-xs font-medium text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-amber-500 inline-block"></span> Awaiting approval
                    </p>
                  ) : (
                    <p className="text-xs font-medium text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-rose-500 inline-block"></span> Setup pending
                    </p>
                  )}
                </div>
              </div>

              {!isApproved && isPendingApproval && (
                <div className="p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-900/50 rounded-xl text-left text-xs text-amber-800 dark:text-amber-200 leading-relaxed">
                  <span className="font-semibold">{user.partnerName}</span> has sent a connection request. Head to the <span className="font-semibold text-pink-600 dark:text-pink-400 cursor-pointer underline" onClick={() => setSubTab('requests')}>Pending requests</span> tab to review and approve.
                </div>
              )}

              <div className="grid gap-2.5">
                {isApproved && (
                  <button 
                    type="button"
                    onClick={() => setIsPreviewingCompanion(true)}
                    className="w-full h-11 bg-pink-600 hover:bg-pink-700 text-white rounded-xl font-semibold text-xs transition-colors cursor-pointer"
                  >
                    Preview companion dashboard
                  </button>
                )}
                
                <button 
                  type="button"
                  onClick={() => setSubTab('privacy')}
                  className="w-full h-11 bg-[#faf8f6] dark:bg-[#23201d] border border-stone-200/80 dark:border-[#342f2b] text-stone-700 dark:text-stone-200 rounded-xl font-semibold text-xs hover:bg-stone-100 dark:hover:bg-[#2a2622] cursor-pointer transition-colors"
                >
                  Manage sharing settings
                </button>

                <button 
                  type="button"
                  onClick={() => setShowDisconnectConfirm(true)}
                  className="w-full h-10 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl font-semibold text-xs cursor-pointer transition-colors"
                >
                  Disconnect partner
                </button>
              </div>
            </section>

            {isApproved && (
              <section className="bg-white dark:bg-[#1a1816] p-6 sm:p-8 rounded-2xl shadow-xs border border-stone-200/80 dark:border-[#2e2a26] space-y-5 text-center">
                <h3 className="text-lg font-serif text-stone-900 dark:text-stone-100 font-semibold">Send supportive comfort</h3>
                <p className="text-xs text-stone-500 dark:text-stone-400 max-w-md mx-auto leading-relaxed">
                  Send your partner thoughtful digital gifts that appear on their companion dashboard right away.
                </p>
                <div className="flex justify-center gap-6 pt-1">
                  <ComfortButton icon="🌸" label="Flower" onClick={() => sendDigitalComfort('flower')} />
                  <ComfortButton icon="🍫" label="Chocolate" onClick={() => sendDigitalComfort('chocolate')} />
                  <ComfortButton icon="🍵" label="Warm Tea" onClick={() => sendDigitalComfort('tea')} />
                </div>
              </section>
            )}
          </div>
        )}

        {subTab === 'requests' && (
          <div className="space-y-6 animate-fadeIn text-left">
            {/* Header / Subtitle */}
            <div className="space-y-1">
              <h3 className="text-xl font-serif text-stone-900 dark:text-stone-100 font-semibold">Partner requests inbox</h3>
              <p className="text-xs text-stone-500 dark:text-stone-400">Review connection requests, customize sharing categories, and check request history.</p>
            </div>

            {isPendingApproval ? (
              <div className="bg-white dark:bg-[#1a1816] p-6 sm:p-8 rounded-2xl border border-stone-200/80 dark:border-[#2e2a26] shadow-xs space-y-5">
                <div className="flex items-start gap-4">
                  <div className="w-11 h-11 rounded-xl bg-pink-50 dark:bg-pink-950/40 border border-pink-200/70 dark:border-pink-900/50 flex items-center justify-center text-pink-600 dark:text-pink-400 shrink-0">
                    <Heart className="w-5 h-5" />
                  </div>
                  <div className="space-y-2 w-full">
                    <h3 className="text-lg font-serif text-stone-900 dark:text-stone-100 font-semibold">Active connection request</h3>
                    <div className="text-xs space-y-1 text-stone-600 dark:text-stone-300 bg-[#faf8f6] dark:bg-[#23201d] p-3.5 rounded-xl border border-stone-200/80 dark:border-[#342f2b]">
                      <p><span className="font-semibold text-stone-900 dark:text-stone-100">Partner name:</span> {requesterName}</p>
                      <p><span className="font-semibold text-stone-900 dark:text-stone-100">Partner email:</span> {activePendingRequest?.partnerEmail || 'No email provided'}</p>
                      <p className="tabular-nums"><span className="font-semibold text-stone-900 dark:text-stone-100">Date requested:</span> {activePendingRequest?.created_at ? new Date(activePendingRequest.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Recently'}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-[#faf8f6] dark:bg-[#23201d] p-5 rounded-xl border border-stone-200/80 dark:border-[#342f2b] space-y-3.5">
                  <div>
                    <h4 className="text-xs font-semibold text-indigo-700 dark:text-indigo-300">Permission review</h4>
                    <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">Deselect any categories you do not wish to share before approving.</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                    {requestedPermissionsList.map((reqItem) => {
                      const isChecked = reviewedPermissions.includes(reqItem);
                      return (
                        <div 
                          key={reqItem}
                          onClick={() => {
                            if (isChecked) {
                              setReviewedPermissions(reviewedPermissions.filter(p => p !== reqItem));
                            } else {
                              setReviewedPermissions([...reviewedPermissions, reqItem]);
                            }
                          }}
                          className={`flex items-center gap-3 p-2.5 rounded-xl border transition-colors cursor-pointer ${isChecked ? 'border-pink-500 bg-pink-50/70 dark:bg-pink-950/30' : 'border-stone-200/80 dark:border-[#342f2b] bg-white dark:bg-[#1a1816] hover:border-pink-300'}`}
                        >
                          <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${isChecked ? 'border-pink-600 bg-pink-600 text-white' : 'border-stone-300 dark:border-stone-600 bg-white dark:bg-[#1a1816]'}`}>
                            {isChecked && <Check className="w-3 h-3" />}
                          </div>
                          <span className="font-semibold text-stone-800 dark:text-stone-200">{reqItem}</span>
                        </div>
                      );
                    })}
                    {requestedPermissionsList.length === 0 && (
                      <span className="text-xs text-stone-500 dark:text-stone-400">No specific categories specified (All by default)</span>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap gap-2.5 pt-1">
                  <button
                    type="button"
                    onClick={handleApproveSelected}
                    className="px-5 h-10 bg-pink-600 hover:bg-pink-700 text-white font-semibold rounded-xl text-xs transition-colors cursor-pointer flex items-center gap-1.5"
                  >
                    <Check className="w-4 h-4" /> Save permissions &amp; approve
                  </button>
                  <button
                    type="button"
                    onClick={handleApproveAll}
                    className="px-5 h-10 bg-white dark:bg-[#23201d] text-stone-700 dark:text-stone-200 border border-stone-200/80 dark:border-[#342f2b] hover:bg-stone-50 font-semibold rounded-xl text-xs transition-colors cursor-pointer"
                  >
                    Approve all categories
                  </button>
                  {!showDeclineConfirm ? (
                    <button
                      type="button"
                      onClick={() => setShowDeclineConfirm(true)}
                      className="px-5 h-10 bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 hover:bg-rose-100 font-semibold rounded-xl text-xs transition-colors cursor-pointer"
                    >
                      Decline request
                    </button>
                  ) : (
                    <div className="w-full p-4 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 rounded-xl flex flex-wrap items-center justify-between gap-3">
                      <span className="text-xs font-medium text-rose-800 dark:text-rose-200">Decline {requesterName}&apos;s partner request?</span>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setShowDeclineConfirm(false)}
                          className="px-3.5 h-8 bg-white dark:bg-[#1a1816] text-stone-600 dark:text-stone-300 rounded-lg text-xs font-semibold border border-stone-200 dark:border-[#342f2b] cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={executeDeclineRequest}
                          className="px-3.5 h-8 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold cursor-pointer"
                        >
                          Confirm decline
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <section className="bg-white dark:bg-[#1a1816] p-8 rounded-2xl shadow-xs border border-stone-200/80 dark:border-[#2e2a26] text-center space-y-3">
                <div className="w-12 h-12 rounded-xl bg-[#faf8f6] dark:bg-[#23201d] border border-stone-200/80 dark:border-[#342f2b] flex items-center justify-center text-stone-400 mx-auto">
                  <Mail className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-serif text-stone-900 dark:text-stone-100 font-semibold">No active pending requests</h3>
                <p className="text-xs text-stone-500 dark:text-stone-400 max-w-xs mx-auto">
                  You don&apos;t have any pending requests to approve at the moment.
                </p>
              </section>
            )}

            {/* Notification & Connection History */}
            <section className="bg-white dark:bg-[#1a1816] p-6 sm:p-8 rounded-2xl shadow-xs border border-stone-200/80 dark:border-[#2e2a26] space-y-5">
              <div className="flex items-center justify-between border-b border-stone-200/70 dark:border-[#2e2a26] pb-4 gap-3">
                <div className="space-y-1">
                  <h4 className="text-lg font-serif text-stone-900 dark:text-stone-100 font-semibold">Request &amp; connection history</h4>
                  <p className="text-xs text-stone-500 dark:text-stone-400">A timeline of companion connection requests on this account.</p>
                </div>
                <span className="text-xs font-semibold font-mono text-stone-600 dark:text-stone-300 px-3 py-1 bg-[#faf8f6] dark:bg-[#23201d] rounded-lg border border-stone-200/80 dark:border-[#342f2b] tabular-nums shrink-0">
                  Total: {incomingRequests.length}
                </span>
              </div>

              <div className="space-y-3">
                {incomingRequests.map((req) => (
                  <div key={req.id} className="p-4 sm:p-5 rounded-xl border border-stone-200/80 dark:border-[#342f2b] bg-[#faf8f6] dark:bg-[#23201d] space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="space-y-0.5 text-left">
                        <span className="text-sm font-semibold text-stone-900 dark:text-stone-100">{req.partnerName}</span>
                        <p className="text-xs text-stone-500 dark:text-stone-400">{req.partnerEmail || 'No email provided'}</p>
                      </div>
                      
                      <span className={`px-3 py-1 rounded-lg text-xs font-semibold border ${
                        req.status === 'approved' 
                          ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900/50' 
                          : req.status === 'declined'
                          ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-900/50'
                          : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-900/50'
                      }`}>
                        {req.status === 'approved' ? 'Approved' : req.status === 'declined' ? 'Declined' : 'Pending review'}
                      </span>
                    </div>

                    <div className="pt-2.5 border-t border-stone-200/70 dark:border-[#2e2a26] flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs text-left">
                      <div className="tabular-nums">
                        <span className="font-semibold text-stone-600 dark:text-stone-400">Date:</span>{' '}
                        <span className="text-stone-700 dark:text-stone-300">
                          {req.created_at ? new Date(req.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : 'Recently'}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1.5 items-center">
                        <span className="font-semibold text-stone-600 dark:text-stone-400 mr-1">Categories:</span>
                        {(req.requested_permissions || []).map((p: string, idx: number) => (
                          <span key={idx} className="bg-white dark:bg-[#1a1816] text-xs font-medium text-pink-700 dark:text-pink-300 px-2 py-0.5 rounded-md border border-stone-200/80 dark:border-[#2e2a26]">
                            {p}
                          </span>
                        ))}
                        {(!req.requested_permissions || req.requested_permissions.length === 0) && (
                          <span className="text-stone-500 dark:text-stone-400">None specified</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}

                {incomingRequests.length === 0 && (
                  <div className="text-center py-8 text-stone-500 dark:text-stone-400 space-y-2">
                    <Mail className="w-6 h-6 mx-auto opacity-50" />
                    <p className="text-xs font-medium">No requests recorded in history.</p>
                  </div>
                )}
              </div>
            </section>
          </div>
        )}

        {subTab === 'invitations' && (
          <div className="space-y-6 animate-fadeIn text-left">
            <section className="bg-white dark:bg-[#1a1816] p-6 sm:p-8 rounded-2xl shadow-xs border border-stone-200/80 dark:border-[#2e2a26] space-y-5">
              <div className="bg-[#faf8f6] dark:bg-[#23201d] border border-stone-200/80 dark:border-[#342f2b] rounded-2xl p-6 text-center space-y-2.5">
                <h3 className="text-lg font-serif font-semibold text-stone-900 dark:text-stone-100">Your partner link</h3>
                <p className="text-xs text-stone-500 dark:text-stone-400 font-medium">Share with your partner to connect</p>
                <div className="bg-white dark:bg-[#1a1816] py-3 px-5 rounded-xl border border-stone-200/80 dark:border-[#2e2a26] block text-sm font-mono font-semibold text-pink-600 dark:text-pink-400 tracking-wide truncate">
                  {window.location.host}/invite/{user.partnerCode || '...'}
                </div>
              </div>

              {/* Share Options Grid */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(inviteLink);
                    showNotice("Invite link copied to clipboard!", 'success');
                  }}
                  className="p-4 bg-[#faf8f6] dark:bg-[#23201d] hover:bg-stone-100 dark:hover:bg-[#2a2622] border border-stone-200/80 dark:border-[#342f2b] rounded-xl flex flex-col items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  <Copy className="w-5 h-5 text-pink-600 dark:text-pink-400" />
                  <span className="text-xs font-semibold text-stone-800 dark:text-stone-200">Copy link</span>
                </button>

                <button
                  type="button"
                  onClick={async () => {
                    if (navigator.share) {
                      try {
                        await navigator.share({
                          title: 'Connect on Lumina',
                          text: `${getUserDisplayName(user)} invited you to join her Lumina Partner Circle`,
                          url: inviteLink
                        });
                      } catch (err) {
                        console.warn(err);
                      }
                    } else {
                      navigator.clipboard.writeText(inviteLink);
                      showNotice("Web Share not supported. Link copied to clipboard instead!", 'info');
                    }
                  }}
                  className="p-4 bg-[#faf8f6] dark:bg-[#23201d] hover:bg-stone-100 dark:hover:bg-[#2a2622] border border-stone-200/80 dark:border-[#342f2b] rounded-xl flex flex-col items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  <Share2 className="w-5 h-5 text-pink-600 dark:text-pink-400" />
                  <span className="text-xs font-semibold text-stone-800 dark:text-stone-200">Share link</span>
                </button>

                <a
                  href={`https://api.whatsapp.com/send?text=${encodeURIComponent(`${getUserDisplayName(user)} invited you to join her Lumina Partner Circle: ${inviteLink}`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-4 bg-[#faf8f6] dark:bg-[#23201d] hover:bg-stone-100 dark:hover:bg-[#2a2622] border border-stone-200/80 dark:border-[#342f2b] rounded-xl flex flex-col items-center justify-center gap-2 transition-colors cursor-pointer text-center"
                >
                  <MessageSquare className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  <span className="text-xs font-semibold text-stone-800 dark:text-stone-200">WhatsApp</span>
                </a>

                <a
                  href={`sms:?&body=${encodeURIComponent(`${getUserDisplayName(user)} invited you to join her Lumina Partner Circle: ${inviteLink}`)}`}
                  className="p-4 bg-[#faf8f6] dark:bg-[#23201d] hover:bg-stone-100 dark:hover:bg-[#2a2622] border border-stone-200/80 dark:border-[#342f2b] rounded-xl flex flex-col items-center justify-center gap-2 transition-colors cursor-pointer text-center"
                >
                  <MessageSquare className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  <span className="text-xs font-semibold text-stone-800 dark:text-stone-200">Messages</span>
                </a>

                <a
                  href={`mailto:?subject=${encodeURIComponent('Join my Lumina Partner Circle')}&body=${encodeURIComponent(`Hi,\n\nI want to connect with you securely on Lumina Partner Mode! Here is my invitation link to join my Lumina Partner Circle:\n${inviteLink}\n\nLove,\n${getUserDisplayName(user)}`)}`}
                  className="p-4 bg-[#faf8f6] dark:bg-[#23201d] hover:bg-stone-100 dark:hover:bg-[#2a2622] border border-stone-200/80 dark:border-[#342f2b] rounded-xl flex flex-col items-center justify-center gap-2 transition-colors cursor-pointer text-center"
                >
                  <Mail className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                  <span className="text-xs font-semibold text-stone-800 dark:text-stone-200">Email</span>
                </a>

                <button
                  type="button"
                  onClick={() => setShowQRCode(!showQRCode)}
                  className={`p-4 border rounded-xl flex flex-col items-center justify-center gap-2 transition-colors cursor-pointer ${showQRCode ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-300 dark:border-amber-800' : 'bg-[#faf8f6] dark:bg-[#23201d] hover:bg-stone-100 dark:hover:bg-[#2a2622] border-stone-200/80 dark:border-[#342f2b]'}`}
                >
                  <QrCode className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                  <span className="text-xs font-semibold text-stone-800 dark:text-stone-200">QR Code</span>
                </button>
              </div>

              {showQRCode && (
                <div className="bg-[#faf8f6] dark:bg-[#23201d] border border-stone-200/80 dark:border-[#342f2b] p-5 rounded-2xl text-center space-y-4 animate-slideDownBlock flex flex-col items-center justify-center w-full">
                  <p className="text-xs font-semibold text-stone-700 dark:text-stone-300">Lumina scan invitation</p>
                  <div className="qr-code-container bg-white p-4 rounded-xl border border-stone-200/80 shadow-xs w-full max-w-[260px] aspect-square flex items-center justify-center overflow-hidden mx-auto">
                    <QrCodeCanvas
                      value={inviteLink}
                      size={240}
                      alt="Lumina Partner Invitation QR Code"
                    />
                  </div>
                  <p className="text-xs text-stone-500 dark:text-stone-400 leading-relaxed break-words max-w-full px-2">Have your partner open their camera app to scan and connect instantly.</p>
                </div>
              )}

              {/* Generate New Link button */}
              <div className="pt-3 border-t border-stone-200/70 dark:border-[#2e2a26] flex justify-end">
                <button 
                  type="button"
                  onClick={handleForceGenerateNewCode}
                  disabled={generatingLink}
                  className="px-4 py-2 bg-[#faf8f6] dark:bg-[#23201d] hover:bg-stone-100 dark:hover:bg-[#2a2622] rounded-xl font-semibold text-xs border border-stone-200/80 dark:border-[#342f2b] text-pink-600 dark:text-pink-400 transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Generate new link
                </button>
              </div>
            </section>
          </div>
        )}

        {subTab === 'privacy' && (
          <div className="space-y-6 animate-fadeIn text-left">
            <section className="bg-white dark:bg-[#1a1816] p-6 sm:p-8 rounded-2xl shadow-xs border border-stone-200/80 dark:border-[#2e2a26] space-y-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-xl font-serif text-stone-900 dark:text-stone-100 font-semibold">Privacy controls</h3>
                  <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
                    Control what information your connected companion can view in real time.
                  </p>
                </div>
                <button 
                  type="button"
                  onClick={togglePauseSharing}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer whitespace-nowrap shrink-0 flex items-center gap-1.5 ${user.isSharingPaused ? 'bg-amber-600 border-amber-600 text-white' : 'bg-[#faf8f6] dark:bg-[#23201d] border-amber-300 dark:border-amber-800 text-amber-700 dark:text-amber-300 hover:bg-amber-50'}`}
                >
                  {user.isSharingPaused ? <><Play className="w-3.5 h-3.5" /> Sharing paused</> : <><Pause className="w-3.5 h-3.5" /> Pause all</>}
                </button>
              </div>

              {isCustomizingSharing && (
                <div className="p-4 bg-pink-50/70 dark:bg-pink-950/30 border border-pink-200/80 dark:border-pink-900/50 rounded-xl text-xs text-pink-900 dark:text-pink-200 leading-relaxed font-medium">
                  <span className="font-semibold text-pink-700 dark:text-pink-300">Custom mode:</span> Toggling the switches below will adjust your sharing settings. Save below to activate sync.
                </div>
              )}

              <div className="space-y-3">
                <SharingToggle label="Share Cycle Information" active={user.sharingSettings?.shareCycleInfo === true} onChange={(v) => updateSharing('shareCycleInfo', v)} />
                <SharingToggle label="Share Symptoms" active={user.sharingSettings?.shareSymptoms === true} onChange={(v) => updateSharing('shareSymptoms', v)} />
                <SharingToggle label="Share Mood" active={user.sharingSettings?.shareMood === true} onChange={(v) => updateSharing('shareMood', v)} />
                <SharingToggle label="Share Fertility Information" active={user.sharingSettings?.shareFertilityInfo === true} onChange={(v) => updateSharing('shareFertilityInfo', v)} />
                <SharingToggle label="Share Pregnancy Information" active={user.sharingSettings?.sharePregnancyInfo === true} onChange={(v) => updateSharing('sharePregnancyInfo', v)} />
                <SharingToggle label="Share Appointment Reminders" active={user.sharingSettings?.shareAppointmentReminders === true} onChange={(v) => updateSharing('shareAppointmentReminders', v)} />
                <SharingToggle label="Share Wellness Updates" active={user.sharingSettings?.shareWellnessUpdates === true} onChange={(v) => updateSharing('shareWellnessUpdates', v)} />
              </div>

              {isCustomizingSharing ? (
                <button 
                  type="button"
                  onClick={handleSaveCustomSharing}
                  className="w-full mt-4 h-11 bg-pink-600 hover:bg-pink-700 text-white rounded-xl font-semibold text-xs transition-colors cursor-pointer"
                >
                  Save &amp; approve connection
                </button>
              ) : (
                <button 
                  type="button"
                  onClick={async () => {
                    await syncUser(user);
                    showNotice('Sharing settings saved and synchronized securely!', 'success');
                  }}
                  className="w-full mt-4 h-11 bg-pink-600 hover:bg-pink-700 text-white rounded-xl font-semibold text-xs transition-colors cursor-pointer"
                >
                  Save sharing settings
                </button>
              )}
            </section>
          </div>
        )}

        {showDisconnectConfirm && (
          <div className="fixed inset-0 bg-stone-950/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <div className="bg-white dark:bg-[#1a1816] rounded-2xl p-6 sm:p-8 w-full max-w-sm border border-stone-200/80 dark:border-[#2e2a26] shadow-2xl text-center space-y-5 animate-fadeIn">
              <div className="w-14 h-14 bg-rose-50 dark:bg-rose-950/40 border border-rose-200/70 dark:border-rose-900/50 rounded-2xl flex items-center justify-center text-rose-600 dark:text-rose-400 mx-auto">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-serif text-stone-900 dark:text-stone-100 font-semibold">Disconnect partner?</h3>
                <p className="text-xs text-stone-600 dark:text-stone-400 leading-relaxed">
                  This will immediately stop sharing your cycle data with {user.partnerName}. They will no longer be able to see your updates.
                </p>
              </div>
              <div className="grid gap-2.5">
                <button 
                  type="button"
                  onClick={handleDisconnect}
                  className="w-full h-11 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-semibold text-xs transition-colors cursor-pointer"
                >
                  Yes, disconnect
                </button>
                <button 
                  type="button"
                  onClick={() => setShowDisconnectConfirm(false)}
                  className="w-full h-10 bg-stone-100 dark:bg-[#23201d] border border-stone-200/80 dark:border-[#342f2b] text-stone-700 dark:text-stone-200 rounded-xl font-semibold text-xs hover:bg-stone-200 cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
        {renderGlobalModals()}
      </div>
    );
  }

  // Partner pending or declined state view for Partner Mode
  if (user.isPartner && !isConnected) {
    return (
      <div className="space-y-6 animate-fadeIn pb-24 font-sans max-w-2xl mx-auto pt-4">
        {renderNoticeBanner()}
        {/* Top Header Section for Partner Mode */}
        <header className="flex items-center justify-between px-4 py-3 bg-white/95 dark:bg-[#1a1816]/95 backdrop-blur-md border border-stone-200/80 dark:border-[#2e2a26] shadow-xs rounded-2xl sticky top-2 z-40 flex-wrap gap-2">
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200/70 dark:border-indigo-900/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                <Users className="w-4 h-4" />
              </div>
              <span className="font-serif font-semibold text-lg text-stone-900 dark:text-stone-100">
                Lumina Partner
              </span>
            </div>
            {isDeclined ? (
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 rounded-full text-xs font-medium border border-rose-200/70 dark:border-rose-900/50">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
                <span>Request declined</span>
              </div>
            ) : (
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 rounded-full text-xs font-medium border border-amber-200/70 dark:border-amber-900/50">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                <span>Pending approval</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            {onLogout && (
              <button 
                type="button"
                onClick={() => setShowLogoutModal(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-900/50 text-xs font-semibold border border-rose-200/70 dark:border-rose-900/50 transition-colors cursor-pointer whitespace-nowrap"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Log out</span>
              </button>
            )}
          </div>
        </header>

        {isDeclined ? (
          <section className="bg-white dark:bg-[#1a1816] p-8 sm:p-10 rounded-2xl shadow-xs border border-stone-200/80 dark:border-[#2e2a26] flex flex-col items-center text-center space-y-5 animate-fadeIn">
            <div className="w-16 h-16 bg-rose-50 dark:bg-rose-950/40 rounded-2xl flex items-center justify-center text-rose-600 dark:text-rose-400 border border-rose-200/70 dark:border-rose-900/50">
              <AlertCircle className="w-7 h-7" />
            </div>
            <div className="space-y-2">
              <h3 className="text-2xl font-serif text-stone-900 dark:text-stone-100 font-semibold">Connection request declined</h3>
              <p className="text-sm text-stone-600 dark:text-stone-400 max-w-md mx-auto leading-relaxed">
                Your request to connect with <span className="font-semibold text-indigo-600 dark:text-indigo-400">{partnerDisplayName}</span> was declined. You will be able to access partner features and cycle insights once <span className="font-semibold text-indigo-600 dark:text-indigo-400">{partnerDisplayName}</span> accepts your connection request.
              </p>
            </div>
            <div className="p-4 bg-[#faf8f6] dark:bg-[#23201d] rounded-xl border border-stone-200/80 dark:border-[#342f2b] max-w-md w-full text-left space-y-1.5">
              <p className="font-semibold text-xs text-stone-900 dark:text-stone-100 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                <span>Privacy safeguard</span>
              </p>
              <p className="text-stone-600 dark:text-stone-400 text-xs leading-relaxed">
                We respect both partners&apos; privacy choices. You can enter a new invitation link if your partner re-invites you.
              </p>
            </div>
          </section>
        ) : (
          <section className="bg-white dark:bg-[#1a1816] p-8 sm:p-10 rounded-2xl shadow-xs border border-stone-200/80 dark:border-[#2e2a26] flex flex-col items-center text-center space-y-5 animate-fadeIn">
            <div className="w-16 h-16 bg-amber-50 dark:bg-amber-950/40 rounded-2xl flex items-center justify-center text-amber-600 dark:text-amber-400 border border-amber-200/70 dark:border-amber-900/50">
              <Clock className="w-7 h-7" />
            </div>
            <div className="space-y-2">
              <h3 className="text-2xl font-serif text-stone-900 dark:text-stone-100 font-semibold">Connection request pending</h3>
              <p className="text-sm text-stone-600 dark:text-stone-400 max-w-md mx-auto leading-relaxed">
                Your partner account has been created. A connection request has been sent to <span className="font-semibold text-indigo-600 dark:text-indigo-400">{partnerDisplayName}</span>. Once <span className="font-semibold text-indigo-600 dark:text-indigo-400">{partnerDisplayName}</span> accepts your request, you will be connected and can view their shared cycle calendar and support features.
              </p>
            </div>
            <div className="p-4 bg-[#faf8f6] dark:bg-[#23201d] rounded-xl border border-stone-200/80 dark:border-[#342f2b] max-w-md w-full text-left space-y-1.5">
              <p className="font-semibold text-xs text-stone-900 dark:text-stone-100 flex items-center gap-1.5">
                <Bell className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                <span>Notification sent to {partnerDisplayName}</span>
              </p>
              <p className="text-stone-600 dark:text-stone-400 text-xs leading-relaxed">
                {partnerDisplayName} has received a notification in their notifications drawer and pending requests panel to approve your request.
              </p>
            </div>
            <button 
              type="button"
              onClick={async () => {
                if (user.partnerId) {
                  const unsub = subscribeToPartnerSharedView(user.partnerId, (summary) => {
                    if (summary) setLinkedSummary(summary);
                  });
                  setTimeout(unsub, 1500);
                }
                await syncUser(user);
                showNotice('Connection status refreshed.', 'info');
              }}
              className="inline-flex items-center gap-2 px-6 h-11 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold text-xs transition-colors cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Check connection status</span>
            </button>
          </section>
        )}

        {/* LOGOUT CONFIRMATION MODAL */}
        {showLogoutModal && (
          <div className="fixed inset-0 bg-stone-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn">
            <div className="bg-white dark:bg-[#1a1816] rounded-2xl p-6 max-w-sm w-full space-y-5 border border-stone-200/80 dark:border-[#2e2a26] shadow-2xl text-center">
              <div className="w-12 h-12 bg-rose-50 dark:bg-rose-950/40 border border-rose-200/70 dark:border-rose-900/50 rounded-xl flex items-center justify-center text-rose-600 dark:text-rose-400 mx-auto">
                <LogOut className="w-5 h-5" />
              </div>
              <div className="space-y-1.5">
                <h3 className="font-serif font-semibold text-lg text-stone-900 dark:text-stone-100">Partner log out</h3>
                <p className="text-xs text-stone-600 dark:text-stone-400 leading-relaxed">
                  Are you sure you want to log out?
                </p>
              </div>
              <div className="flex gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={() => setShowLogoutModal(false)}
                  className="flex-1 h-10 bg-stone-100 dark:bg-[#23201d] hover:bg-stone-200 dark:hover:bg-[#2e2a26] border border-stone-200/80 dark:border-[#342f2b] text-stone-700 dark:text-stone-200 font-semibold text-xs rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowLogoutModal(false);
                    if (onLogout) onLogout();
                  }}
                  className="flex-1 h-10 bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs rounded-xl transition-colors cursor-pointer"
                >
                  Log out
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Partner Dashboard View (Paused Sharing)
  if (targetUser?.isSharingPaused) {
    return (
      <div className="space-y-6 animate-fadeIn pb-24 font-sans">
        {/* Top Header Section for Partner Mode */}
        <header className="flex items-center justify-between px-4 py-3 bg-white/95 dark:bg-[#1a1816]/95 backdrop-blur-md border border-stone-200/80 dark:border-[#2e2a26] shadow-xs rounded-2xl sticky top-2 z-40 flex-wrap gap-2">
          <div className="flex items-center gap-2.5 flex-wrap">
            <button 
              type="button"
              onClick={() => setIsMenuOpen(true)}
              title="Navigation menu"
              className="p-2 rounded-xl bg-stone-100 dark:bg-[#23201d] hover:bg-stone-200 dark:hover:bg-[#2e2a26] text-stone-700 dark:text-stone-200 transition-colors border border-stone-200/80 dark:border-[#342f2b] cursor-pointer flex items-center justify-center"
            >
              <Menu className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => setActiveTab('home')}>
              <span className="font-serif font-semibold text-lg text-stone-900 dark:text-stone-100">
                Lumina Partner
              </span>
            </div>
            {isConnected ? (
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 rounded-full text-xs font-medium border border-emerald-200/70 dark:border-emerald-900/50">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                <span>Connected ({partnerDisplayName})</span>
              </div>
            ) : activePendingRequest?.status === 'pending' || user.partnerRequest?.status === 'pending' ? (
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 rounded-full text-xs font-medium border border-amber-200/70 dark:border-amber-900/50">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                <span>Pending approval</span>
              </div>
            ) : activePendingRequest?.status === 'declined' || user.partnerRequest?.status === 'declined' ? (
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 rounded-full text-xs font-medium border border-rose-200/70 dark:border-rose-900/50">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
                <span>Request declined</span>
              </div>
            ) : (
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-stone-100 dark:bg-[#23201d] text-stone-600 dark:text-stone-400 rounded-full text-xs font-medium border border-stone-200/80 dark:border-[#342f2b]">
                <span className="w-1.5 h-1.5 rounded-full bg-stone-400 shrink-0" />
                <span>Not connected</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            {(!user.isPartner || isPreviewingCompanion) && (
              <button 
                type="button"
                onClick={() => setIsPreviewingCompanion(false)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 rounded-xl border border-indigo-200/70 dark:border-indigo-900/50 transition-colors cursor-pointer whitespace-nowrap"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to my account</span>
              </button>
            )}

            <button 
              type="button"
              onClick={() => {
                if (onOpenNotificationCenter) {
                  onOpenNotificationCenter(null);
                } else {
                  setIsNotificationsOpen(true);
                }
              }}
              title="Notifications"
              className="p-2 rounded-xl bg-stone-100 dark:bg-[#23201d] hover:bg-stone-200 dark:hover:bg-[#2e2a26] text-stone-700 dark:text-stone-200 transition-colors border border-stone-200/80 dark:border-[#342f2b] cursor-pointer flex items-center justify-center relative"
            >
              <Bell className="w-4 h-4" />
              {hasUnreadPartnerAlerts && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-indigo-600 rounded-full ring-2 ring-white dark:ring-[#23201d]" />
              )}
            </button>
          </div>
        </header>

        <section className="bg-indigo-950 dark:bg-[#1c1a30] p-8 sm:p-10 rounded-2xl shadow-sm border border-indigo-900/60 dark:border-indigo-900/40 text-white text-center space-y-4">
          <div className="w-14 h-14 bg-white/10 border border-white/15 rounded-2xl flex items-center justify-center mx-auto">
            <Pause className="w-6 h-6 text-indigo-200" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl sm:text-3xl font-serif font-semibold">Sharing temporarily paused</h2>
            <p className="text-sm text-indigo-100/90 max-w-md mx-auto leading-relaxed">
              {getCleanName(targetUser?.name, targetUser?.email) || 'Your partner'} has temporarily paused cycle data sharing. Their privacy choices remain protected.
            </p>
          </div>
          <div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/10 rounded-full text-xs font-medium border border-white/15">
              <Lock className="w-3.5 h-3.5 text-indigo-200" />
              <span>Pause guard active</span>
            </span>
          </div>
        </section>

        <section className="bg-white dark:bg-[#1a1816] p-8 rounded-2xl shadow-xs border border-stone-200/80 dark:border-[#2e2a26] flex flex-col items-center gap-5 text-center">
          <div className="space-y-1.5">
            <h3 className="text-lg font-serif font-semibold text-stone-900 dark:text-stone-100">Send supportive comfort</h3>
            <p className="text-xs text-stone-600 dark:text-stone-400 max-w-md leading-relaxed">
              Even while sharing is paused, you can send thoughtful gestures directly to her dashboard.
            </p>
          </div>
          <div className="flex flex-wrap justify-center gap-6 pt-1">
            <ComfortButton icon="🌸" label="Flower" onClick={() => sendDigitalComfort('flower')} />
            <ComfortButton icon="🍫" label="Chocolate" onClick={() => sendDigitalComfort('chocolate')} />
            <ComfortButton icon="🍵" label="Warm tea" onClick={() => sendDigitalComfort('tea')} />
          </div>
          <button 
            type="button"
            onClick={() => setIsPreviewingCompanion(false)}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline mt-2 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to my account</span>
          </button>
        </section>

        {/* Slide-out notifications pane (Right drawer) */}
        {isNotificationsOpen && (
          <>
            <div className="fixed inset-0 bg-stone-950/60 backdrop-blur-sm z-[150] transition-opacity" onClick={() => setIsNotificationsOpen(false)} />
            <div className="fixed inset-y-0 right-0 max-w-xs w-full bg-white dark:bg-[#1a1816] shadow-2xl z-[160] p-6 flex flex-col border-l border-stone-200/80 dark:border-[#2e2a26] animate-slideLeft text-left">
              <div className="flex items-center justify-between border-b border-stone-200/80 dark:border-[#2e2a26] pb-4 mb-5">
                <div className="flex items-center gap-2">
                  <Bell className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  <span className="font-serif font-semibold text-lg text-stone-900 dark:text-stone-100">Notifications</span>
                </div>
                <button 
                  type="button"
                  onClick={() => setIsNotificationsOpen(false)}
                  className="p-1.5 rounded-lg bg-stone-100 dark:bg-[#23201d] text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-[#2e2a26] transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto space-y-4 scrollbar-hide">
                {user.notifications && user.notifications.length > 0 ? (
                  <div className="space-y-2.5">
                    <div className="flex justify-between items-center px-1">
                      <p className="text-xs font-semibold text-stone-500 dark:text-stone-400">System notifications</p>
                      <button 
                        type="button"
                        onClick={async () => {
                          const updatedUser = {
                            ...user,
                            notifications: (user.notifications || []).map(n => ({ ...n, isRead: true }))
                          };
                          setUser(updatedUser);
                          await syncUser(updatedUser);
                        }}
                        className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                      >
                        Mark all read
                      </button>
                    </div>
                    <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
                      {user.notifications.map(notif => (
                        <div 
                          key={notif.id} 
                          onClick={async () => {
                            if (!notif.isRead) {
                              const updatedUser = {
                                ...user,
                                notifications: (user.notifications || []).map(n => n.id === notif.id ? { ...n, isRead: true } : n)
                              };
                              setUser(updatedUser);
                              await syncUser(updatedUser);
                            }
                          }}
                          className={`p-3.5 rounded-xl border transition-colors flex flex-col gap-1 cursor-pointer ${
                            notif.isRead 
                              ? 'bg-[#faf8f6] dark:bg-[#23201d] border-stone-200/70 dark:border-[#342f2b] opacity-75 hover:opacity-100' 
                              : 'bg-indigo-50/60 dark:bg-indigo-950/30 border-indigo-200/80 dark:border-indigo-900/50'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <span className="text-sm shrink-0">{notif.emoji || '🔔'}</span>
                              <p className="text-xs font-semibold text-stone-900 dark:text-stone-100 truncate">{notif.title}</p>
                            </div>
                            {!notif.isRead && (
                              <span className="w-2 h-2 bg-indigo-600 rounded-full shrink-0" />
                            )}
                          </div>
                          <p className="text-xs text-stone-600 dark:text-stone-400 leading-normal break-words">{notif.body}</p>
                          <p className="text-[11px] text-stone-400 dark:text-stone-500 self-end tabular-nums">
                            {new Date(notif.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-stone-500 dark:text-stone-400 text-xs">
                    No notifications yet.
                  </div>
                )}
              </div>
            </div>
          </>
        )}
        {renderGlobalModals()}
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn pb-24 font-sans">
      {/* Top Header Section for Partner Mode */}
      <header className="flex items-center justify-between px-4 py-3 bg-white/95 dark:bg-[#1a1816]/95 backdrop-blur-md border border-stone-200/80 dark:border-[#2e2a26] shadow-xs rounded-2xl sticky top-2 z-40 flex-wrap gap-2">
        <div className="flex items-center gap-2.5 flex-wrap">
          <button 
            type="button"
            onClick={() => setIsMenuOpen(true)}
            title="Navigation menu"
            className="p-2 rounded-xl bg-stone-100 dark:bg-[#23201d] hover:bg-stone-200 dark:hover:bg-[#2e2a26] text-stone-700 dark:text-stone-200 transition-colors border border-stone-200/80 dark:border-[#342f2b] cursor-pointer flex items-center justify-center"
          >
            <Menu className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => setActiveTab('home')}>
            <span className="font-serif font-semibold text-lg text-stone-900 dark:text-stone-100">
              Lumina Partner
            </span>
          </div>
          {isConnected ? (
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 rounded-full text-xs font-medium border border-emerald-200/70 dark:border-emerald-900/50">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
              <span>Connected ({partnerDisplayName})</span>
            </div>
          ) : activePendingRequest?.status === 'pending' || user.partnerRequest?.status === 'pending' ? (
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 rounded-full text-xs font-medium border border-amber-200/70 dark:border-amber-900/50">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
              <span>Pending approval</span>
            </div>
          ) : activePendingRequest?.status === 'declined' || user.partnerRequest?.status === 'declined' ? (
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 rounded-full text-xs font-medium border border-rose-200/70 dark:border-rose-900/50">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
              <span>Request declined</span>
            </div>
          ) : (
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-stone-100 dark:bg-[#23201d] text-stone-600 dark:text-stone-400 rounded-full text-xs font-medium border border-stone-200/80 dark:border-[#342f2b]">
              <span className="w-1.5 h-1.5 rounded-full bg-stone-400 shrink-0" />
              <span>Not connected</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {(!user.isPartner || isPreviewingCompanion) && (
            <button 
              type="button"
              onClick={() => setIsPreviewingCompanion(false)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 rounded-xl border border-indigo-200/70 dark:border-indigo-900/50 transition-colors cursor-pointer whitespace-nowrap"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to my account</span>
            </button>
          )}
          
          <button 
            type="button"
            onClick={() => {
              if (onOpenNotificationCenter) {
                onOpenNotificationCenter(null);
              } else {
                setIsNotificationsOpen(true);
              }
            }}
            title="Notifications"
            className="p-2 rounded-xl bg-stone-100 dark:bg-[#23201d] hover:bg-stone-200 dark:hover:bg-[#2e2a26] text-stone-700 dark:text-stone-200 transition-colors border border-stone-200/80 dark:border-[#342f2b] cursor-pointer flex items-center justify-center relative"
          >
            <Bell className="w-4 h-4" />
            {hasUnreadPartnerAlerts && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-indigo-600 rounded-full ring-2 ring-white dark:ring-[#23201d]" />
            )}
          </button>
        </div>
      </header>

      {/* ALWAYS-VISIBLE TOP NAVIGATION TAB BAR */}
      <nav className="flex items-center gap-1.5 overflow-x-auto scrollbar-none sticky top-[62px] z-30 bg-white/95 dark:bg-[#1a1816]/95 backdrop-blur-md p-1.5 rounded-2xl border border-stone-200/80 dark:border-[#2e2a26] shadow-xs">
        {[
          { id: 'home', label: 'Dashboard', Icon: Home },
          { id: 'mission', label: 'Support mission', Icon: Shield },
          { id: 'ideas', label: 'Ideas & gifts', Icon: Gift },
          { id: 'notes', label: 'Sweet notes', Icon: Mail },
          { id: 'reminders', label: 'Checklist', Icon: CheckSquare },
          { id: 'calendar', label: 'Cycle calendar', Icon: Calendar },
          { id: 'education', label: 'Education', Icon: GraduationCap },
          { id: 'notifications', label: 'Settings', Icon: Settings }
        ].map(({ id, label, Icon }) => {
          const isActive = activeTab === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => setActiveTab(id as any)}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap cursor-pointer shrink-0 ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-[#23201d] hover:text-stone-900 dark:hover:text-stone-100'
              }`}
            >
              <Icon className="w-3.5 h-3.5 shrink-0" />
              <span>{label}</span>
            </button>
          );
        })}
      </nav>

      {/* Home Dashboard View */}
      {activeTab === 'home' && (
        <div className="space-y-6 animate-fadeIn">
          {/* Header with Linked User Profile */}
          <header className="bg-indigo-950 dark:bg-[#1c1a30] p-6 sm:p-8 rounded-2xl shadow-sm text-white border border-indigo-900/60 dark:border-indigo-900/40">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center border border-white/15 shrink-0">
                    <ShieldCheck className="w-6 h-6 text-indigo-200" />
                  </div>
                  <div>
                    <h2 className="text-2xl sm:text-3xl font-serif font-semibold tracking-tight">
                      {getSanctuaryTitle(targetUser)}
                    </h2>
                    <p className="text-sm text-indigo-200/90 mt-0.5">
                      Supporting {getCleanName(targetUser?.name, targetUser?.email) || 'your partner'}&apos;s bloom
                    </p>
                  </div>
                </div>
                
                <div className="flex flex-wrap gap-2">
                  <div className="bg-white/10 px-3.5 py-1.5 rounded-full text-xs font-medium border border-white/15">
                    Phase: <span className="text-amber-300 font-semibold">{currentPhase}</span>
                  </div>
                  <div className="bg-white/10 px-3.5 py-1.5 rounded-full text-xs font-medium border border-white/15">
                    Role: <span className="text-pink-200 font-semibold">Support companion</span>
                  </div>
                </div>
              </div>

              <div className="bg-white/10 p-4 rounded-xl border border-white/15 w-full md:w-64">
                <p className="text-xs font-semibold text-indigo-200 mb-1">Quick navigation</p>
                <p className="text-xs text-white/85 leading-relaxed">
                  Use the navigation tabs above or choose a card below for Support Tasks, Gifts, Sweet Notes, and the Cycle Calendar.
                </p>
              </div>
            </div>
          </header>

          {/* Quick Access Feature Shortcuts Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { id: 'mission', title: 'Support mission', badge: 'Phase tasks', desc: `Daily phase-specific actions for ${currentPhase} phase`, Icon: Shield, accent: 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 border-indigo-200/70 dark:border-indigo-900/50' },
              { id: 'ideas', title: 'Ideas & gifts', badge: 'Care ideas', desc: 'Thoughtful gifts, date ideas, and comforting gestures', Icon: Gift, accent: 'text-pink-600 dark:text-pink-400 bg-pink-50 dark:bg-pink-950/40 border-pink-200/70 dark:border-pink-900/50' },
              { id: 'notes', title: 'Sweet notes', badge: 'Love notes', desc: 'Send affirmations and digital comfort to her app', Icon: Mail, accent: 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 border-rose-200/70 dark:border-rose-900/50' },
              { id: 'reminders', title: 'Hero checklist', badge: 'To-do list', desc: 'Track support tasks and stay consistent', Icon: CheckSquare, accent: 'text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/40 border-purple-200/70 dark:border-purple-900/50' },
              { id: 'calendar', title: 'Partner calendar', badge: 'Live phases', desc: 'View upcoming periods, fertile window, and phase dates', Icon: Calendar, accent: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border-amber-200/70 dark:border-amber-900/50' },
              { id: 'education', title: 'Education guide', badge: 'Guide', desc: 'Understand cycle phases and hormonal shifts', Icon: GraduationCap, accent: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200/70 dark:border-emerald-900/50' },
            ].map((card) => (
              <button
                key={card.id}
                type="button"
                onClick={() => setActiveTab(card.id as any)}
                className="bg-white dark:bg-[#1a1816] p-5 rounded-2xl border border-stone-200/80 dark:border-[#2e2a26] shadow-xs hover:border-indigo-300 dark:hover:border-indigo-700 transition-colors cursor-pointer text-left flex flex-col justify-between gap-4"
              >
                <div className="flex items-center justify-between w-full">
                  <div className={`w-10 h-10 rounded-xl border flex items-center justify-center ${card.accent}`}>
                    <card.Icon className="w-5 h-5" />
                  </div>
                  <span className="text-[11px] font-medium text-stone-600 dark:text-stone-400 bg-stone-100 dark:bg-[#23201d] border border-stone-200/70 dark:border-[#342f2b] px-2.5 py-0.5 rounded-full">
                    {card.badge}
                  </span>
                </div>
                <div>
                  <h4 className="font-serif font-semibold text-stone-900 dark:text-stone-100 text-base">{card.title}</h4>
                  <p className="text-xs text-stone-600 dark:text-stone-400 mt-1 line-clamp-2">{card.desc}</p>
                </div>
              </button>
            ))}
          </div>

          {/* Cycle Overview Card */}
          <section className="bg-white dark:bg-[#1a1816] p-6 sm:p-8 rounded-2xl shadow-xs border border-stone-200/80 dark:border-[#2e2a26] space-y-5">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h3 className="text-xl font-serif font-semibold text-stone-900 dark:text-stone-100">
                {getCleanName(targetUser?.name, targetUser?.email) || 'Your partner'}&apos;s cycle status
              </h3>
              {(!user.isPartner || isPreviewingCompanion) && (
                <button 
                  type="button"
                  onClick={() => setIsPreviewingCompanion(false)}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 dark:text-indigo-400 cursor-pointer hover:underline"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back to my account</span>
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-5 bg-[#faf8f6] dark:bg-[#23201d] rounded-xl border border-stone-200/80 dark:border-[#342f2b] space-y-1.5">
                <p className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">Status</p>
                {targetUser && targetUser.sharingSettings?.shareCycleInfo === true ? (
                  (() => {
                    const sync = calculateCycleSyncData(targetUser, new Date());
                    return (
                      <>
                        <p className="text-base font-serif font-semibold text-stone-900 dark:text-stone-100">
                          Current phase: <span className="text-indigo-600 dark:text-indigo-400">{currentPhase}</span>
                        </p>
                        <p className="text-xs text-stone-600 dark:text-stone-400 tabular-nums">
                          Cycle day {sync.cycleDay} • Next period in ~{sync.daysUntilNextPeriod} days
                        </p>
                      </>
                    );
                  })()
                ) : (
                  <p className="text-xs text-stone-500 dark:text-stone-400 flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5" />
                    <span>Cycle info is private</span>
                  </p>
                )}
              </div>
              <div className="p-5 bg-[#faf8f6] dark:bg-[#23201d] rounded-xl border border-stone-200/80 dark:border-[#342f2b] space-y-1.5">
                <p className="text-xs font-semibold text-pink-600 dark:text-pink-400">Mood &amp; symptoms</p>
                {targetUser && (targetUser.sharingSettings?.shareMood === true || targetUser.sharingSettings?.shareSymptoms === true) ? (
                  <>
                    {targetUser.sharingSettings?.shareMood === true ? (
                      <p className="text-base font-serif font-semibold text-stone-900 dark:text-stone-100">
                        {targetUser.todaySymptomLog?.mood ? `Mood: ${targetUser.todaySymptomLog.mood}` : 'Mood: Restful & calm'}
                      </p>
                    ) : (
                      <p className="text-xs text-stone-500 dark:text-stone-400">Mood updates are private</p>
                    )}
                    {targetUser.sharingSettings?.shareSymptoms === true ? (
                      <p className="text-xs text-stone-600 dark:text-stone-400">
                        {targetUser.todaySymptomLog?.symptoms?.length ? `Symptoms: ${targetUser.todaySymptomLog.symptoms.join(', ')}` : 'Symptoms: None logged today'}
                      </p>
                    ) : (
                      <p className="text-xs text-stone-500 dark:text-stone-400">Symptoms are private</p>
                    )}
                  </>
                ) : (
                  <p className="text-xs text-stone-500 dark:text-stone-400 flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5" />
                    <span>Mood &amp; symptoms are private</span>
                  </p>
                )}
              </div>
            </div>

            <div className="p-5 bg-amber-50/70 dark:bg-amber-950/20 rounded-xl border border-amber-200/70 dark:border-amber-900/40 flex items-start gap-3">
              <Lightbulb className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold text-amber-800 dark:text-amber-300 mb-1">Today&apos;s support strategy</p>
                <p className="text-sm text-stone-700 dark:text-stone-300 leading-relaxed">
                  {loading ? 'Calculating support strategy...' : (commTips.substring(0, 140).split('\n')[0] || 'She may benefit from a warm cup of herbal tea and lower stress today. Offer quiet companionship and help with evening chores.')}
                </p>
              </div>
            </div>
          </section>
        </div>
      )}

      {/* Sub-view Top Header Bar (When a feature tab is selected from navigation bar) */}
      {activeTab !== 'home' && (
        <div className="flex items-center justify-between bg-white dark:bg-[#1a1816] p-4 rounded-2xl border border-stone-200/80 dark:border-[#2e2a26] shadow-xs animate-fadeIn flex-wrap gap-2 mb-6">
          <button 
            type="button"
            onClick={() => setActiveTab('home')}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200/70 dark:border-indigo-900/50 rounded-xl font-semibold text-xs transition-colors cursor-pointer whitespace-nowrap"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Back to dashboard</span>
          </button>
          <span className="inline-flex items-center gap-2 text-xs font-semibold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/50 px-3.5 py-2 rounded-xl border border-indigo-200/70 dark:border-indigo-900/50 whitespace-nowrap shrink-0">
            {activeTab === 'mission' && <><Shield className="w-3.5 h-3.5" /> Daily Support Mission</>}
            {activeTab === 'ideas' && <><Gift className="w-3.5 h-3.5" /> Support Ideas & Gifts</>}
            {activeTab === 'notes' && <><Mail className="w-3.5 h-3.5" /> Sweet Notes</>}
            {activeTab === 'education' && <><GraduationCap className="w-3.5 h-3.5" /> Partner Education</>}
            {activeTab === 'reminders' && <><CheckSquare className="w-3.5 h-3.5" /> Support Checklist</>}
            {activeTab === 'calendar' && <><Calendar className="w-3.5 h-3.5" /> Cycle Calendar</>}
            {activeTab === 'notifications' && <><Settings className="w-3.5 h-3.5" /> Notification Settings</>}
          </span>
        </div>
      )}

      {/* 1. Daily Support Mission View */}
      {activeTab === 'mission' && (
        <div className="space-y-6 animate-fadeIn">
          <section className="bg-white dark:bg-[#1a1816] p-6 sm:p-8 rounded-2xl shadow-xs border border-stone-200/80 dark:border-[#2e2a26] space-y-6">
            <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h3 className="text-2xl font-serif font-semibold text-stone-900 dark:text-stone-100">Daily Support Mission</h3>
                <p className="text-sm text-stone-500 dark:text-stone-400 mt-1">Actionable tasks tailored to her current phase</p>
              </div>
              {loading && <RefreshCw className="w-5 h-5 text-indigo-500 animate-spin shrink-0" />}
            </header>

            {/* Mission Phase Switcher Pills */}
            <div className="space-y-2">
              <p className="text-xs font-semibold text-stone-500 dark:text-stone-400">Select phase view</p>
              <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                {[
                  { name: 'Menstrual', label: 'Menstrual' },
                  { name: 'Follicular', label: 'Follicular' },
                  { name: 'Ovulation', label: 'Ovulation' },
                  { name: 'Luteal', label: 'Luteal' },
                  { name: 'Pregnancy', label: 'Pregnancy' }
                ].map((ph) => {
                  const isActive = selectedMissionPhase === ph.name;
                  return (
                    <button
                      key={ph.name}
                      type="button"
                      onClick={() => setSelectedMissionPhase(ph.name)}
                      className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                        isActive
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : 'bg-[#faf8f6] dark:bg-[#23201d] hover:bg-stone-100 dark:hover:bg-[#2c2824] text-stone-700 dark:text-stone-300 border border-stone-200/80 dark:border-[#342f2b]'
                      }`}
                    >
                      <span>{ph.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Task list for selected phase */}
            <div className="space-y-3 pt-1">
              {(() => {
                const phaseTasksMap: Record<string, string[]> = {
                  'Menstrual': [
                    "Prepare a warm heating pad or hot water bottle for cramps.",
                    "Brew soothing chamomile or ginger tea without being asked.",
                    "Bring her favorite dark chocolate or comfort snack.",
                    "Take care of heavy household chores (dishes, laundry) so she can rest.",
                    "Set up a cozy blanket spot on the couch with a quiet movie.",
                    "Offer a gentle lower back or foot rub to ease tension."
                  ],
                  'Follicular': [
                    "Plan an exciting, creative outdoor date or walk together.",
                    "Encourage her new ideas and support her active projects.",
                    "Prepare a fresh, light, protein-rich meal.",
                    "Ask about her personal goals and brainstorm together.",
                    "Try a fun new activity together like cooking a new recipe."
                  ],
                  'Ovulation': [
                    "Plan a thoughtful dinner date night out.",
                    "Surprise her with fresh flowers or a small thoughtful gift.",
                    "Dress up nicely together and take photos together.",
                    "Give sincere compliments on her energy, style, and presence.",
                    "Create a relaxing candlelit atmosphere at home."
                  ],
                  'Luteal': [
                    "Keep her favorite crunchy or sweet comfort snacks stocked.",
                    "Listen patiently without offering unsolicited solutions.",
                    "Prepare a warm relaxing bath with Epsom salts.",
                    "Protect her quiet time and reduce household noise and stress.",
                    "Offer a soothing neck and shoulder massage before sleep."
                  ],
                  'Pregnancy': [
                    "Keep cold water and nausea-safe snacks (crackers) nearby.",
                    "Fluff back pillows and ensure comfortable seating.",
                    "Take over grocery shopping and heavy carrying completely.",
                    "Offer a soothing foot massage to reduce swelling.",
                    "Leave a sweet note telling her how much she is appreciated."
                  ]
                };

                const displayTasks = phaseTasksMap[selectedMissionPhase] || supportMission;

                return displayTasks.map((task, i) => (
                  <div key={i} className="p-4 bg-[#faf8f6] dark:bg-[#23201d] rounded-xl hover:border-indigo-300 dark:hover:border-indigo-700 transition-colors border border-stone-200/80 dark:border-[#342f2b] flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <CheckCircle2 className="w-4 h-4 text-indigo-500 shrink-0" />
                      <p className="text-stone-800 dark:text-stone-200 text-sm leading-snug">{task}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        addReminder(task);
                        showNotice(`Added "${task.slice(0, 30)}..." to your Support Checklist.`, 'success');
                      }}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors shrink-0 cursor-pointer whitespace-nowrap"
                    >
                      + Add Task
                    </button>
                  </div>
                ));
              })()}
            </div>
          </section>

          <section className="bg-gradient-to-br from-indigo-950 via-indigo-900 to-stone-900 p-6 sm:p-8 rounded-2xl text-white shadow-sm border border-indigo-800/60">
            <div className="space-y-3">
              <h4 className="text-lg font-serif font-semibold flex items-center gap-2 text-indigo-100">
                <MessageSquare className="w-5 h-5 text-indigo-300" />
                Communication Briefing ({selectedMissionPhase} Phase)
              </h4>
              <div className="p-5 bg-white/10 rounded-xl border border-white/15 text-sm leading-relaxed text-stone-100">
                {selectedMissionPhase === 'Menstrual' && "During the menstrual phase, energy is low and physical comfort is paramount. Keep conversation light, offer warm drinks, and take initiative on chores so she doesn't have to ask."}
                {selectedMissionPhase === 'Follicular' && "Estrogen is rising. She likely feels refreshed, optimistic, and mentally sharp. This is a great time to discuss future plans, try new hobbies, or enjoy an active outing."}
                {selectedMissionPhase === 'Ovulation' && "Peak energy, sociability, and confidence. Thoughtful gestures, sincere compliments, and shared quality time will resonate strongly right now."}
                {selectedMissionPhase === 'Luteal' && "Progesterone is elevated and drops before the period starts. She may feel more sensitive to stress, bloated, or fatigued. Be extra patient, avoid debating small things, and keep her favorite snacks stocked."}
                {selectedMissionPhase === 'Pregnancy' && "Hormonal shifts and physical fatigue call for gentle care and proactive support. Help ensure she feels rested, hydrated, and supported every day."}
              </div>
            </div>
          </section>
        </div>
      )}

      {/* 2. Support Ideas & Gifts View */}
      {activeTab === 'ideas' && (
        <section className="bg-white dark:bg-[#1a1816] p-6 sm:p-8 rounded-2xl shadow-xs border border-stone-200/80 dark:border-[#2e2a26] animate-fadeIn space-y-6">
          <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-stone-200/70 dark:border-[#2e2a26] pb-5">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-pink-50 dark:bg-pink-950/40 text-pink-700 dark:text-pink-300 text-xs font-semibold mb-2 border border-pink-200/60 dark:border-pink-900/50">
                <Gift className="w-3.5 h-3.5" /> Support Ideas & Gestures
              </div>
              <h3 className="text-2xl font-serif font-semibold text-stone-900 dark:text-stone-100">Thoughtful Care & Gift Ideas</h3>
              <p className="text-sm text-stone-500 dark:text-stone-400 mt-1">Thoughtful gifts, date nights, and comforting acts of service</p>
            </div>
            <button
              type="button"
              onClick={() => setActiveTab('notes')}
              className="px-4 py-2.5 bg-pink-600 hover:bg-pink-700 text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0 flex items-center gap-1.5"
            >
              <Mail className="w-3.5 h-3.5" /> Send Sweet Note
            </button>
          </header>

          {/* Category Filters */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-stone-500 dark:text-stone-400">Filter by category</p>
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
              {['All', 'Care Packages', 'Romantic Dates', 'Comfort Foods', 'Acts of Service', 'Digital Gestures'].map((cat) => {
                const isCatSelected = selectedGiftCategory === cat || (cat === 'All' && selectedGiftCategory === 'All') || selectedGiftCategory.startsWith(cat);
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setSelectedGiftCategory(cat)}
                    className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                      isCatSelected
                        ? 'bg-pink-600 text-white shadow-xs'
                        : 'bg-[#faf8f6] dark:bg-[#23201d] hover:bg-stone-100 dark:hover:bg-[#2c2824] text-stone-700 dark:text-stone-300 border border-stone-200/80 dark:border-[#342f2b]'
                    }`}
                  >
                    {cat}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Ideas Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { emoji: '♨️', title: 'Electric Heating Pad / Hot Water Bottle', desc: 'A soft heated cushion for quick abdominal and lower-back cramp relief.', cat: 'Care Packages' },
              { emoji: '💐', title: 'Surprise Flower Bouquet', desc: 'Fresh peonies, roses, or wildflowers delivered with a handwritten note.', cat: 'Care Packages' },
              { emoji: '🕯️', title: 'Lavender Aromatherapy & Candle', desc: 'Essential oil diffuser or soothing candle to calm stress and ease sleep.', cat: 'Care Packages' },
              { emoji: '🍫', title: 'Artisanal Dark Chocolate & Treats', desc: '70%+ dark chocolate bars rich in magnesium to help soothe muscle tension.', cat: 'Comfort Foods' },
              { emoji: '🍵', title: 'Warm Chamomile or Berry Herbal Tea', desc: 'Hot caffeine-free tea served in her favorite mug with a drizzle of honey.', cat: 'Comfort Foods' },
              { emoji: '🛋️', title: 'Cozy Blanket Movie Night', desc: 'Set up plush pillows on the couch with her favorite movies and snacks.', cat: 'Romantic Dates' },
              { emoji: '🧺', title: 'Full House Chores Takeover', desc: 'Clean the kitchen, run laundry, and fold clothes without her asking.', cat: 'Acts of Service' },
              { emoji: '💆', title: '15-Minute Foot or Neck Massage', desc: 'Use warm lotion or massage oil to relieve joint tension and fatigue.', cat: 'Acts of Service' },
              { emoji: '✨', title: 'Send Digital Comfort Gesture', desc: 'Send a live warm hug, tea, or flower notification straight to her screen.', cat: 'Digital Gestures' }
            ]
            .filter(item => selectedGiftCategory === 'All' || item.cat.includes(selectedGiftCategory.split(' ')[0]))
            .map((idea, i) => (
              <div key={i} className="p-5 bg-[#faf8f6] dark:bg-[#23201d] rounded-2xl border border-stone-200/80 dark:border-[#342f2b] flex flex-col justify-between gap-4 hover:border-pink-300 dark:hover:border-pink-800 transition-colors">
                <div className="flex items-start gap-3.5">
                  <div className="w-11 h-11 bg-white dark:bg-[#1a1816] rounded-xl flex items-center justify-center text-xl border border-stone-200/80 dark:border-[#342f2b] shrink-0">
                    {idea.emoji}
                  </div>
                  <div>
                    <h4 className="font-serif font-semibold text-stone-900 dark:text-stone-100 text-base">{idea.title}</h4>
                    <p className="text-xs text-stone-600 dark:text-stone-400 mt-1 leading-relaxed">{idea.desc}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-stone-200/70 dark:border-[#342f2b]">
                  <span className="text-xs font-medium text-stone-600 dark:text-stone-300 bg-white dark:bg-[#1a1816] px-2.5 py-1 rounded-lg border border-stone-200/70 dark:border-[#342f2b]">
                    {idea.cat}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      if (idea.cat.includes('Digital')) {
                        sendDigitalComfort('flower');
                      } else {
                        addReminder(`Get: ${idea.title}`);
                        showNotice(`Added "${idea.title}" to your Support Checklist.`, 'success');
                      }
                    }}
                    className="px-3.5 py-1.5 bg-pink-600 hover:bg-pink-700 text-white rounded-xl text-xs font-semibold cursor-pointer transition-colors whitespace-nowrap"
                  >
                    {idea.cat.includes('Digital') ? 'Send Now' : '+ Add to List'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 3. Sweet Notes View */}
      {activeTab === 'notes' && (
        <section className="bg-white dark:bg-[#1a1816] p-6 sm:p-8 rounded-2xl shadow-xs border border-stone-200/80 dark:border-[#2e2a26] animate-fadeIn space-y-6">
          <header className="border-b border-stone-200/70 dark:border-[#2e2a26] pb-5">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 text-xs font-semibold mb-2 border border-rose-200/60 dark:border-rose-900/50">
              <Mail className="w-3.5 h-3.5" /> Love Notes & Affirmations
            </div>
            <h3 className="text-2xl font-serif font-semibold text-stone-900 dark:text-stone-100">Send a Sweet Note</h3>
            <p className="text-sm text-stone-500 dark:text-stone-400 mt-1">Send thoughtful affirmations directly to her app or copy for messaging</p>
          </header>

          {/* Custom Love Note Composer */}
          <div className="p-5 sm:p-6 bg-[#faf8f6] dark:bg-[#23201d] rounded-2xl border border-stone-200/80 dark:border-[#342f2b] space-y-4">
            <h4 className="text-base font-serif font-semibold text-stone-900 dark:text-stone-100 flex items-center gap-2">
              <Heart className="w-4 h-4 text-rose-500" />
              Compose a note for {getCleanName(targetUser?.name, targetUser?.email) || "Your Partner"}
            </h4>

            <div className="flex flex-wrap gap-2">
              {['💌', '🌹', '💖', '🍫', '🍵', '✨', '👑', '🌸'].map(emo => (
                <button
                  key={emo}
                  type="button"
                  onClick={() => setCustomNoteEmoji(emo)}
                  className={`p-2 text-xl rounded-xl border transition-colors cursor-pointer ${
                    customNoteEmoji === emo
                      ? 'bg-white dark:bg-[#1a1816] border-rose-500 ring-2 ring-rose-500/20'
                      : 'bg-white/70 dark:bg-[#1a1816]/60 border-stone-200/80 dark:border-[#342f2b] opacity-80 hover:opacity-100'
                  }`}
                >
                  {emo}
                </button>
              ))}
            </div>

            <textarea
              value={customNoteText}
              onChange={(e) => setCustomNoteText(e.target.value)}
              placeholder="Write a sweet message (e.g. 'You are doing great today. I made sure tea is ready when you get home')..."
              className="w-full p-4 rounded-xl bg-white dark:bg-[#1a1816] border border-stone-200/80 dark:border-[#342f2b] text-sm text-stone-900 dark:text-stone-100 placeholder:text-stone-400 dark:placeholder:text-stone-500 outline-none focus:ring-2 focus:ring-rose-500/30 min-h-[96px]"
            />

            <div className="flex justify-between items-center flex-wrap gap-3">
              <span className="text-xs font-medium text-stone-500 dark:text-stone-400">
                {sentNoteSuccess ? 'Delivered to her Lumina dashboard.' : 'Delivered live via Lumina connection'}
              </span>
              <button
                type="button"
                onClick={async () => {
                  if (!customNoteText.trim()) return;
                  await sendDigitalComfort('love_note');
                  setSentNoteSuccess(true);
                  setTimeout(() => setSentNoteSuccess(false), 4000);
                  setCustomNoteText('');
                }}
                className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap"
              >
                Send to App Screen
              </button>
            </div>
          </div>

          {/* Preset Love Letters Grid */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-stone-500 dark:text-stone-400">Ready-to-send affirmations</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {loveNotes.map((note, i) => (
                <div
                  key={i}
                  className="p-5 bg-[#faf8f6] dark:bg-[#23201d] rounded-2xl border border-stone-200/80 dark:border-[#342f2b] flex flex-col justify-between gap-4 hover:border-indigo-300 dark:hover:border-indigo-700 transition-colors"
                >
                  <p className="text-stone-800 dark:text-stone-200 font-serif text-base leading-relaxed">
                    "{note.replace(/^\d\.\s*/, '')}"
                  </p>

                  <div className="flex items-center justify-between pt-3 border-t border-stone-200/70 dark:border-[#342f2b]">
                    <button
                      type="button"
                      onClick={() => copyToClipboard(note)}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                    >
                      <Copy className="w-3.5 h-3.5" /> Copy Text
                    </button>

                    <button
                      type="button"
                      onClick={async () => {
                        await sendDigitalComfort('love_note');
                      }}
                      className="px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap"
                    >
                      Send to App
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* 4. Hero Checklist & Tasks View */}
      {activeTab === 'reminders' && (
        <section className="bg-white dark:bg-[#1a1816] p-6 sm:p-8 rounded-2xl shadow-xs border border-stone-200/80 dark:border-[#2e2a26] animate-fadeIn space-y-6">
          <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-stone-200/70 dark:border-[#2e2a26] pb-5">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 text-xs font-semibold mb-2 border border-indigo-200/60 dark:border-indigo-900/50">
                <CheckSquare className="w-3.5 h-3.5" /> Partner To-Do List
              </div>
              <h3 className="text-2xl font-serif font-semibold text-stone-900 dark:text-stone-100">Support Checklist</h3>
              <p className="text-sm text-stone-500 dark:text-stone-400 mt-1">Track active support tasks and build your consistency</p>
            </div>

            {/* Support Level Badge */}
            <div className="bg-indigo-600 text-white px-4 py-2.5 rounded-xl text-left sm:text-right shrink-0">
              <p className="text-xs font-medium text-indigo-100">Support Level</p>
              <p className="text-base font-serif font-semibold">
                {reminders.filter(r => r.isCompleted).length > 3 ? 'Dedicated Partner' : 'Active Supporter'}
              </p>
            </div>
          </header>

          {/* Add New Task Form */}
          <div className="p-5 bg-[#faf8f6] dark:bg-[#23201d] rounded-2xl border border-stone-200/80 dark:border-[#342f2b] space-y-3">
            <label className="block text-xs font-semibold text-stone-600 dark:text-stone-300">Add new support task</label>
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                value={newReminderText}
                onChange={(e) => setNewReminderText(e.target.value)}
                placeholder="e.g. Buy warm heating pad, prepare dinner..."
                className="flex-1 h-11 px-4 rounded-xl bg-white dark:bg-[#1a1816] border border-stone-200/80 dark:border-[#342f2b] outline-none text-sm text-stone-900 dark:text-stone-100 placeholder:text-stone-400 focus:ring-2 focus:ring-indigo-500/30"
              />
              <button
                type="button"
                onClick={() => addReminder()}
                className="h-11 px-5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold text-xs transition-colors cursor-pointer shrink-0 flex items-center justify-center gap-1.5 whitespace-nowrap"
              >
                <Plus className="w-4 h-4" /> Add Task
              </button>
            </div>
          </div>

          {/* Tasks List */}
          <div className="space-y-3">
            <div className="flex justify-between items-center px-1">
              <p className="text-xs font-semibold text-stone-500 dark:text-stone-400 tabular-nums">
                Active Checklist ({reminders.filter(r => r.isCompleted).length} / {reminders.length} Completed)
              </p>
            </div>

            {reminders.length === 0 ? (
              <div className="text-center py-10 bg-[#faf8f6] dark:bg-[#23201d] rounded-2xl border border-stone-200/80 dark:border-[#342f2b] space-y-2">
                <CheckSquare className="w-8 h-8 text-indigo-500 mx-auto" />
                <p className="font-serif font-semibold text-stone-900 dark:text-stone-100 text-base">No active tasks on your list</p>
                <p className="text-xs text-stone-500 dark:text-stone-400">Add tasks from the Support Mission or Ideas tabs.</p>
              </div>
            ) : (
              reminders.map((reminder) => (
                <div key={reminder.id} className="flex items-center justify-between p-4 bg-[#faf8f6] dark:bg-[#23201d] border border-stone-200/80 dark:border-[#342f2b] rounded-xl transition-colors gap-4">
                  <div className="flex items-center gap-3.5 min-w-0">
                    <button
                      type="button"
                      onClick={() => toggleReminder(reminder.id)}
                      className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-colors cursor-pointer shrink-0 ${
                        reminder.isCompleted
                          ? 'bg-emerald-600 border-emerald-600 text-white'
                          : 'border-stone-300 dark:border-stone-600 bg-white dark:bg-[#1a1816] hover:border-indigo-500'
                      }`}
                    >
                      {reminder.isCompleted && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    </button>
                    <p className={`text-sm ${reminder.isCompleted ? 'line-through text-stone-400 dark:text-stone-500' : 'text-stone-800 dark:text-stone-200 font-medium'}`}>
                      {reminder.text}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => deleteReminder(reminder.id)}
                    className="text-stone-400 hover:text-rose-600 p-2 rounded-lg cursor-pointer transition-colors"
                    title="Delete Task"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))
            )}
          </div>
        </section>
      )}

      {/* 5. Partner Calendar View */}
      {activeTab === 'calendar' && (
        <section className="bg-white dark:bg-[#1a1816] p-6 sm:p-8 rounded-2xl shadow-xs border border-stone-200/80 dark:border-[#2e2a26] animate-fadeIn space-y-6">
          <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-stone-200/70 dark:border-[#2e2a26] pb-5">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 text-xs font-semibold mb-2 border border-indigo-200/60 dark:border-indigo-900/50">
                <Calendar className="w-3.5 h-3.5" /> Live Cycle Calendar
              </div>
              <h3 className="text-2xl font-serif font-semibold text-stone-900 dark:text-stone-100">
                {getCleanName(targetUser?.name, targetUser?.email) || partnerDisplayName}'s Calendar
              </h3>
              <p className="text-sm text-stone-500 dark:text-stone-400 mt-1">Calculated cycle phases, fertile window, and mood forecast</p>
            </div>

            {/* Legend */}
            <div className="flex items-center gap-3 bg-[#faf8f6] dark:bg-[#23201d] px-3.5 py-2 rounded-xl border border-stone-200/80 dark:border-[#342f2b]">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 bg-rose-500 rounded-full inline-block"></span>
                <span className="text-xs font-medium text-stone-700 dark:text-stone-300">Period</span>
              </div>
              {targetUser?.sharingSettings?.shareFertilityInfo === true && (
                <>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 bg-purple-500 rounded-full inline-block"></span>
                    <span className="text-xs font-medium text-stone-700 dark:text-stone-300">Fertile</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 bg-amber-400 rounded-full inline-block"></span>
                    <span className="text-xs font-medium text-stone-700 dark:text-stone-300">Ovulation</span>
                  </div>
                </>
              )}
            </div>
          </header>

          {!targetUser || targetUser.sharingSettings?.shareCycleInfo !== true ? (
            <div className="p-8 bg-[#faf8f6] dark:bg-[#23201d] rounded-2xl border border-stone-200/80 dark:border-[#342f2b] text-center space-y-2">
              <Lock className="w-8 h-8 text-indigo-500 mx-auto" />
              <p className="font-serif font-semibold text-stone-900 dark:text-stone-100 text-lg">Cycle Calendar is Private</p>
              <p className="text-sm text-stone-500 dark:text-stone-400 max-w-md mx-auto">
                Your partner has not enabled Cycle Information sharing yet. You can still send digital comfort or love notes anytime.
              </p>
            </div>
          ) : (
            <>
              {/* Interactive Month Calendar */}
              <div className="p-4 sm:p-6 bg-[#faf8f6] dark:bg-[#23201d] rounded-2xl border border-stone-200/80 dark:border-[#342f2b] space-y-4">
                <div className="flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => setCalendarMonthOffset(prev => prev - 1)}
                    className="inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-white dark:bg-[#1a1816] border border-stone-200/80 dark:border-[#342f2b] text-stone-700 dark:text-stone-200 text-xs font-semibold hover:bg-stone-50 dark:hover:bg-[#2c2824] transition-colors cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" /> Prev
                  </button>

                  <p className="font-serif font-semibold text-stone-900 dark:text-stone-100 text-lg">
                    {new Date(new Date().getFullYear(), new Date().getMonth() + calendarMonthOffset, 1).toLocaleDateString([], { month: 'long', year: 'numeric' })}
                  </p>

                  <button
                    type="button"
                    onClick={() => setCalendarMonthOffset(prev => prev + 1)}
                    className="inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-white dark:bg-[#1a1816] border border-stone-200/80 dark:border-[#342f2b] text-stone-700 dark:text-stone-200 text-xs font-semibold hover:bg-stone-50 dark:hover:bg-[#2c2824] transition-colors cursor-pointer"
                  >
                    Next <ChevronRight className="w-4 h-4" />
                  </button>
                </div>

                {/* Days of Week Header */}
                <div className="grid grid-cols-7 gap-1.5 sm:gap-2 text-center">
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                    <span key={d} className="text-xs font-semibold text-stone-500 dark:text-stone-400">{d}</span>
                  ))}
                </div>

                {/* Calendar Grid */}
                <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
                  {(() => {
                    const now = new Date();
                    const targetMonth = new Date(now.getFullYear(), now.getMonth() + calendarMonthOffset, 1);
                    const totalDaysInMonth = new Date(targetMonth.getFullYear(), targetMonth.getMonth() + 1, 0).getDate();
                    const startDayOfWeek = targetMonth.getDay();
                    const canSeeFertility = targetUser.sharingSettings?.shareFertilityInfo === true;

                    const cells = [];
                    for (let i = 0; i < startDayOfWeek; i++) {
                      cells.push(<div key={`empty-${i}`} className="aspect-square opacity-0"></div>);
                    }

                    for (let d = 1; d <= totalDaysInMonth; d++) {
                      const cellDate = new Date(targetMonth.getFullYear(), targetMonth.getMonth(), d);
                      const details = calculateCycleDetailsForDate(cellDate, targetUser);
                      const isToday = calendarMonthOffset === 0 && d === now.getDate();
                      const isSelected = selectedCalendarDate.toDateString() === cellDate.toDateString();

                      cells.push(
                        <button
                          key={d}
                          type="button"
                          onClick={() => setSelectedCalendarDate(cellDate)}
                          className={`aspect-square rounded-xl flex flex-col items-center justify-center p-1 cursor-pointer transition-all border relative tabular-nums ${
                            isToday ? 'ring-2 ring-indigo-600' : ''
                          } ${
                            isSelected ? 'ring-2 ring-purple-500 z-10 shadow-xs' : ''
                          } ${
                            details.isPeriod ? 'bg-rose-600 text-white border-rose-500' :
                            canSeeFertility && details.isOvulation ? 'bg-amber-400 text-stone-950 font-semibold border-amber-300' :
                            canSeeFertility && details.isFertile ? 'bg-purple-600 text-white border-purple-500' :
                            'bg-white dark:bg-[#1a1816] text-stone-800 dark:text-stone-200 border-stone-200/80 dark:border-[#342f2b] hover:bg-stone-50 dark:hover:bg-[#2c2824]'
                          }`}
                        >
                          <span className="text-xs font-semibold tabular-nums">{d}</span>
                          <span className="text-[10px] font-medium opacity-90 truncate max-w-full hidden sm:inline">
                            {details.isPeriod ? 'Period' : canSeeFertility && details.isOvulation ? 'Peak' : canSeeFertility && details.isFertile ? 'Fertile' : ''}
                          </span>
                        </button>
                      );
                    }

                    return cells;
                  })()}
                </div>
              </div>

              {/* Selected Date Insight Panel */}
              {(() => {
                const details = calculateCycleDetailsForDate(selectedCalendarDate, targetUser);
                const canSeeMood = targetUser.sharingSettings?.shareMood === true;
                const canSeeSymptoms = targetUser.sharingSettings?.shareSymptoms === true;
                return (
                  <div className="p-5 bg-[#faf8f6] dark:bg-[#23201d] rounded-2xl border border-stone-200/80 dark:border-[#342f2b] space-y-3">
                    <h4 className="font-serif font-semibold text-stone-900 dark:text-stone-100 text-base flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-indigo-500" />
                      {selectedCalendarDate.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-stone-700 dark:text-stone-300">
                      <div className="bg-white dark:bg-[#1a1816] p-4 rounded-xl border border-stone-200/80 dark:border-[#342f2b] space-y-2">
                        <div>
                          <p className="font-semibold text-xs text-indigo-600 dark:text-indigo-400 mb-0.5">Calculated Cycle Phase</p>
                          <p className="font-serif text-base text-stone-900 dark:text-stone-100 font-semibold">
                            {details.phaseName}
                          </p>
                          {targetUser?.cycleLength && (
                            <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5 tabular-nums">Cycle Day {details.dayInCycle} of {targetUser.cycleLength || 28}</p>
                          )}
                        </div>

                        {canSeeMood && details.loggedMood && (
                          <div className="pt-2 border-t border-stone-200/70 dark:border-[#2e2a26]">
                            <p className="font-semibold text-xs text-purple-600 dark:text-purple-400">Logged Mood</p>
                            <p className="text-sm font-medium text-stone-800 dark:text-stone-200 capitalize">{details.loggedMood}</p>
                          </div>
                        )}

                        {canSeeSymptoms && details.loggedSymptoms.length > 0 && (
                          <div className="pt-2 border-t border-stone-200/70 dark:border-[#2e2a26]">
                            <p className="font-semibold text-xs text-rose-600 dark:text-rose-400">Logged Symptoms</p>
                            <div className="flex flex-wrap gap-1.5 mt-1.5">
                              {details.loggedSymptoms.map((sym, idx) => (
                                <span key={idx} className="px-2.5 py-0.5 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 rounded-lg text-xs font-medium border border-rose-200/60 dark:border-rose-900/50">{sym}</span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="bg-white dark:bg-[#1a1816] p-4 rounded-xl border border-stone-200/80 dark:border-[#342f2b] flex flex-col justify-between gap-3">
                        <div>
                          <p className="font-semibold text-xs text-indigo-600 dark:text-indigo-400 mb-1">Partner Action Plan</p>
                          <p className="text-xs text-stone-600 dark:text-stone-300 leading-relaxed">
                            {details.isPeriod ? "Offer warm drinks, heating pads, and extra rest support." :
                             (targetUser.sharingSettings?.shareFertilityInfo === true && details.isOvulation) ? "Higher energy day. Great time for a special date or quality bonding." :
                             (targetUser.sharingSettings?.shareFertilityInfo === true && details.isFertile) ? "Higher energy and connection window. Plan enjoyable activities together." :
                             "Send a thoughtful note or check-in message to brighten her day."}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => sendDigitalComfort('flower')}
                          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer self-start whitespace-nowrap"
                        >
                          Send Comfort Greeting
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </>
          )}
        </section>
      )}

      {activeTab === 'education' && (
        <section className="space-y-6 animate-fadeIn">
          {/* Partner Education Header Banner */}
          <div className="bg-gradient-to-br from-indigo-700 via-indigo-800 to-stone-900 p-6 sm:p-8 rounded-2xl text-white shadow-sm border border-indigo-700/50">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-white/15 text-xs font-semibold border border-white/20">
                <GraduationCap className="w-4 h-4 text-indigo-200" />
                Partner Education Guide
              </div>
              <h3 className="text-2xl sm:text-3xl font-serif font-semibold">Understanding Her Cycle & How to Support</h3>
              <p className="text-sm text-indigo-100 max-w-2xl leading-relaxed">
                Knowledge builds empathy. Understanding the four menstrual phases, PMS, and mood patterns helps you offer thoughtful support at the right moment.
              </p>
            </div>
          </div>

          {/* The 4 Phases Cards */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-stone-700 dark:text-stone-300 px-1">The 4 Menstrual Phases</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Phase 1: Menstrual */}
              <div className="bg-white dark:bg-[#1a1816] p-6 rounded-2xl border border-stone-200/80 dark:border-[#2e2a26] shadow-xs space-y-4">
                <div className="flex justify-between items-center">
                  <h5 className="text-lg font-serif font-semibold text-rose-700 dark:text-rose-400">1. Menstrual Phase</h5>
                  <span className="px-2.5 py-1 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 text-xs font-semibold tabular-nums border border-rose-200/60 dark:border-rose-900/50">Days 1 - 5</span>
                </div>
                <p className="text-xs text-stone-600 dark:text-stone-400 leading-relaxed">
                  Estrogen and progesterone drop to their lowest levels as the uterine lining sheds.
                </p>
                <div className="space-y-2 pt-3 border-t border-stone-200/70 dark:border-[#2e2a26]">
                  <p className="text-xs font-semibold text-rose-600 dark:text-rose-400">How she may feel</p>
                  <p className="text-xs text-stone-600 dark:text-stone-300">Cramps, lower energy, fatigue, need for warmth and rest.</p>
                  <p className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 pt-1">How you can support</p>
                  <p className="text-xs text-stone-700 dark:text-stone-300 bg-[#faf8f6] dark:bg-[#23201d] p-3 rounded-xl border border-stone-200/70 dark:border-[#342f2b]">
                    Bring a heating pad, prepare warm tea, offer gentle massages, and handle household chores proactively.
                  </p>
                </div>
              </div>

              {/* Phase 2: Follicular */}
              <div className="bg-white dark:bg-[#1a1816] p-6 rounded-2xl border border-stone-200/80 dark:border-[#2e2a26] shadow-xs space-y-4">
                <div className="flex justify-between items-center">
                  <h5 className="text-lg font-serif font-semibold text-emerald-700 dark:text-emerald-400">2. Follicular Phase</h5>
                  <span className="px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-xs font-semibold tabular-nums border border-emerald-200/60 dark:border-emerald-900/50">Days 6 - 13</span>
                </div>
                <p className="text-xs text-stone-600 dark:text-stone-400 leading-relaxed">
                  Estrogen rises steadily as follicles develop in the ovaries and energy rebounds.
                </p>
                <div className="space-y-2 pt-3 border-t border-stone-200/70 dark:border-[#2e2a26]">
                  <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">How she may feel</p>
                  <p className="text-xs text-stone-600 dark:text-stone-300">Increased stamina, optimism, mental clarity, creative energy.</p>
                  <p className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 pt-1">How you can support</p>
                  <p className="text-xs text-stone-700 dark:text-stone-300 bg-[#faf8f6] dark:bg-[#23201d] p-3 rounded-xl border border-stone-200/70 dark:border-[#342f2b]">
                    Plan active dates, try new outdoor experiences, and encourage her new ideas and projects.
                  </p>
                </div>
              </div>

              {/* Phase 3: Ovulation */}
              <div className="bg-white dark:bg-[#1a1816] p-6 rounded-2xl border border-stone-200/80 dark:border-[#2e2a26] shadow-xs space-y-4">
                <div className="flex justify-between items-center">
                  <h5 className="text-lg font-serif font-semibold text-amber-700 dark:text-amber-400">3. Ovulation Phase</h5>
                  <span className="px-2.5 py-1 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 text-xs font-semibold tabular-nums border border-amber-200/60 dark:border-amber-900/50">Days 14 - 16</span>
                </div>
                <p className="text-xs text-stone-600 dark:text-stone-400 leading-relaxed">
                  Estrogen and LH surge to release an egg. Energy and confidence often reach their peak.
                </p>
                <div className="space-y-2 pt-3 border-t border-stone-200/70 dark:border-[#2e2a26]">
                  <p className="text-xs font-semibold text-amber-600 dark:text-amber-400">How she may feel</p>
                  <p className="text-xs text-stone-600 dark:text-stone-300">Higher confidence, sociability, heightened emotional connection.</p>
                  <p className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 pt-1">How you can support</p>
                  <p className="text-xs text-stone-700 dark:text-stone-300 bg-[#faf8f6] dark:bg-[#23201d] p-3 rounded-xl border border-stone-200/70 dark:border-[#342f2b]">
                    Plan a thoughtful dinner, dress up together, share sincere compliments, and enjoy quality time.
                  </p>
                </div>
              </div>

              {/* Phase 4: Luteal */}
              <div className="bg-white dark:bg-[#1a1816] p-6 rounded-2xl border border-stone-200/80 dark:border-[#2e2a26] shadow-xs space-y-4">
                <div className="flex justify-between items-center">
                  <h5 className="text-lg font-serif font-semibold text-purple-700 dark:text-purple-400">4. Luteal Phase & PMS</h5>
                  <span className="px-2.5 py-1 rounded-lg bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 text-xs font-semibold tabular-nums border border-purple-200/60 dark:border-purple-900/50">Days 17 - 28</span>
                </div>
                <p className="text-xs text-stone-600 dark:text-stone-400 leading-relaxed">
                  Progesterone peaks then drops. Resting metabolic needs rise, which can bring cravings and stress sensitivity.
                </p>
                <div className="space-y-2 pt-3 border-t border-stone-200/70 dark:border-[#2e2a26]">
                  <p className="text-xs font-semibold text-purple-600 dark:text-purple-400">How she may feel</p>
                  <p className="text-xs text-stone-600 dark:text-stone-300">Bloating, mood shifts, fatigue, food cravings, heightened sensitivity to stress.</p>
                  <p className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 pt-1">How you can support</p>
                  <p className="text-xs text-stone-700 dark:text-stone-300 bg-[#faf8f6] dark:bg-[#23201d] p-3 rounded-xl border border-stone-200/70 dark:border-[#342f2b]">
                    Practice extra patience, bring her favorite snacks, avoid debating small things, and offer calm support.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* PMS & Mood Changes Deep Dive */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white dark:bg-[#1a1816] p-6 rounded-2xl border border-stone-200/80 dark:border-[#2e2a26] shadow-xs space-y-3">
              <div className="w-10 h-10 bg-pink-50 dark:bg-pink-950/40 rounded-xl flex items-center justify-center text-pink-600 dark:text-pink-400 border border-pink-200/60 dark:border-pink-900/50">
                <Lightbulb className="w-5 h-5" />
              </div>
              <h4 className="text-lg font-serif font-semibold text-stone-900 dark:text-stone-100">Understanding PMS & Mood Shifts</h4>
              <p className="text-xs text-stone-500 dark:text-stone-400 leading-relaxed">
                PMS is driven by real physiological hormone shifts prior to menstruation.
              </p>
              <ul className="space-y-2 text-xs text-stone-700 dark:text-stone-300">
                <li className="flex items-start gap-2">
                  <span className="text-pink-600 dark:text-pink-400 font-bold">•</span>
                  <span><strong>Cravings:</strong> Metabolic demand rises during the luteal phase, driving carbohydrate and sweet cravings.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-pink-600 dark:text-pink-400 font-bold">•</span>
                  <span><strong>Mood Shifts:</strong> Serotonin shifts alongside progesterone drops; extra patience goes a long way.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-pink-600 dark:text-pink-400 font-bold">•</span>
                  <span><strong>Physical Sensitivity:</strong> Headaches, bloating, and muscle soreness are common.</span>
                </li>
              </ul>
            </div>

            <div className="bg-white dark:bg-[#1a1816] p-6 rounded-2xl border border-stone-200/80 dark:border-[#2e2a26] shadow-xs space-y-3">
              <div className="w-10 h-10 bg-indigo-50 dark:bg-indigo-950/40 rounded-xl flex items-center justify-center text-indigo-600 dark:text-indigo-400 border border-indigo-200/60 dark:border-indigo-900/50">
                <Shield className="w-5 h-5" />
              </div>
              <h4 className="text-lg font-serif font-semibold text-stone-900 dark:text-stone-100">Practical Support Habits</h4>
              <p className="text-xs text-stone-500 dark:text-stone-400 leading-relaxed">
                Three consistent habits that make a lasting difference:
              </p>
              <ul className="space-y-2 text-xs text-stone-700 dark:text-stone-300">
                <li className="flex items-start gap-2">
                  <span className="text-indigo-600 dark:text-indigo-400 font-bold">1.</span>
                  <span><strong>Listen without fixing:</strong> Sometimes empathy and validation are what help most.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-indigo-600 dark:text-indigo-400 font-bold">2.</span>
                  <span><strong>Anticipate needs:</strong> Check her cycle phase and offer tea or snacks before she asks.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-indigo-600 dark:text-indigo-400 font-bold">3.</span>
                  <span><strong>Send quick check-ins:</strong> Use the Digital Comfort actions below to brighten her day.</span>
                </li>
              </ul>
            </div>
          </div>
        </section>
      )}

      {activeTab === 'notifications' && (
        <section className="bg-white dark:bg-[#1a1816] p-6 sm:p-8 rounded-2xl border border-stone-200/80 dark:border-[#2e2a26] shadow-xs space-y-6 animate-fadeIn">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-stone-200/70 dark:border-[#2e2a26] pb-5">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 text-xs font-semibold mb-2 border border-purple-200/60 dark:border-purple-900/50">
                <Bell className="w-3.5 h-3.5" /> Notification Preferences
              </div>
              <h3 className="text-2xl font-serif font-semibold text-stone-900 dark:text-stone-100">
                Stay Connected
              </h3>
              <p className="text-sm text-stone-500 dark:text-stone-400 mt-1">
                Choose which partner updates you would like to receive.
              </p>
            </div>
            <button
              type="button"
              onClick={async () => {
                await syncUser(user);
                showNotice("Notification preferences updated.", 'success');
              }}
              className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold transition-colors shrink-0 cursor-pointer whitespace-nowrap"
            >
              Save Preferences
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {[
              { key: 'periodStarting', label: 'Period Starting', desc: "Notify me when my partner's period starts." },
              { key: 'periodEnding', label: 'Period Ending', desc: "Notify me when my partner's period ends." },
              { key: 'ovulationUpdates', label: 'Ovulation Updates', desc: 'Notify me during ovulation and fertility windows.' },
              { key: 'moodUpdates', label: 'Mood Updates', desc: 'Notify me when my partner shares a mood update.' },
              { key: 'symptomUpdates', label: 'Symptom Updates', desc: 'Notify me when my partner shares symptoms.' },
              { key: 'lowEnergyDays', label: 'Low Energy Days', desc: 'Notify me when my partner reports low energy.' },
              { key: 'supportReminders', label: 'Support Reminders', desc: 'Receive suggestions on how to support my partner.' },
              { key: 'wellnessUpdates', label: 'Wellness Updates', desc: 'Receive wellness summaries and educational tips.' },
              { key: 'partnerMessages', label: 'Partner Messages', desc: 'Receive shared updates and appreciation notes.' },
              { key: 'educationalInsights', label: 'Educational Insights', desc: 'Receive learning content about menstrual health and cycle phases.' },
            ].map((pref) => {
              const currentVal = Boolean(user.partnerNotificationPreferences?.[pref.key as keyof PartnerNotificationPreferences] ?? true);
              return (
                <label key={pref.key} className="flex items-start justify-between p-4 bg-[#faf8f6] dark:bg-[#23201d] hover:border-indigo-300 dark:hover:border-indigo-700 rounded-xl border border-stone-200/80 dark:border-[#342f2b] transition-colors cursor-pointer">
                  <div className="pr-4">
                    <p className="text-sm font-semibold text-stone-900 dark:text-stone-100">
                      {pref.label}
                    </p>
                    <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5 leading-snug">{pref.desc}</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={currentVal}
                    onChange={async (e) => {
                      const updatedPrefs = {
                        ...(user.partnerNotificationPreferences || {
                          periodStarting: true, periodEnding: true, ovulationUpdates: true, moodUpdates: true, symptomUpdates: true, lowEnergyDays: true, supportReminders: true, wellnessUpdates: true, partnerMessages: true, educationalInsights: true
                        }),
                        [pref.key]: e.target.checked
                      };
                      const existingNotifSettings = user.notificationSettings || {
                        enabled: true,
                        toneStyle: 'supportive' as const,
                        reminderDaysBefore: 2,
                        quietHours: { enabled: false, startTime: '22:00', endTime: '07:00' },
                        types: {
                          periodStarting: true,
                          periodStarted: true,
                          periodEnding: true,
                          ovulation: true,
                          fertileWindow: true,
                          lutealPhase: true,
                          pregnancyRisk: true
                        },
                        partnerNotificationsEnabled: true,
                        partnerReceiveTypes: {
                          periodStarting: true,
                          periodStarted: true,
                          periodEnding: true,
                          ovulation: true,
                          fertileWindow: true,
                          pregnancyRisk: true
                        },
                        pregnancyEnabled: false,
                        partnerPregnancyEnabled: false,
                        pregnancyReminderTime: '09:00',
                        pregnancyTypes: {
                          welcome: true, weeklyBabyDev: true, babySizeUpdate: true, appointment: true, medicationVitamin: true, hydration: true, rest: true, kickCounter: true, symptomCheck: true, dueDateCountdown: true, laborNear: true, encouragement: true, hospitalBag: true, contractionTimer: true, breastfeedingPrep: true, birthPlan: true, postpartumPrep: true
                        },
                        partnerPregnancyReceiveTypes: {
                          welcome: true, weeklyBabyDev: true, appointment: true, rest: true, symptomSupport: true, dueDateCountdown: true, laborNear: true, encouragement: true
                        }
                      };
                      const updatedUser: User = {
                        ...user,
                        partnerNotificationPreferences: updatedPrefs,
                        notificationSettings: {
                          ...existingNotifSettings,
                          partnerReceiveTypes: {
                            ...existingNotifSettings.partnerReceiveTypes,
                            [pref.key]: e.target.checked
                          }
                        }
                      };
                      setUser(updatedUser);
                      const rememberMe = localStorage.getItem('lumina_remember_me') !== 'false';
                      void saveEncryptedSessionUser(updatedUser, rememberMe).catch(() => {});
                      localStorage.removeItem('lumina_user');
                      await syncUser(updatedUser);
                    }}
                    className="w-4 h-4 rounded border-stone-300 dark:border-stone-600 text-indigo-600 focus:ring-indigo-500 mt-1 cursor-pointer shrink-0"
                  />
                </label>
              );
            })}
          </div>
        </section>
      )}

      {/* Comfort Station */}
      <section className="bg-white dark:bg-[#1a1816] p-6 rounded-2xl border border-stone-200/80 dark:border-[#2e2a26] shadow-xs flex flex-col items-center gap-4">
        <h3 className="text-xs font-semibold text-stone-500 dark:text-stone-400">Send Digital Comfort</h3>
        <div className="flex flex-wrap justify-center gap-3 sm:gap-4">
          <ComfortButton icon="💖" label="Hug" onClick={() => sendDigitalComfort('hug')} />
          <ComfortButton icon="🍵" label="Tea" onClick={() => sendDigitalComfort('tea')} />
          <ComfortButton icon="💐" label="Flower" onClick={() => sendDigitalComfort('flower')} />
          <ComfortButton icon="🍫" label="Cocoa" onClick={() => sendDigitalComfort('chocolate')} />
          <ComfortButton icon="✨" label="Sparkle" onClick={() => sendDigitalComfort('sparkle')} />
        </div>
      </section>

      {/* Slide-out notifications pane (Right drawer) */}
      {isNotificationsOpen && (
        <>
          <div className="fixed inset-0 bg-stone-950/50 backdrop-blur-xs z-[150] transition-opacity" onClick={() => setIsNotificationsOpen(false)} />
          <div className="fixed inset-y-0 right-0 max-w-xs w-full bg-white dark:bg-[#1a1816] shadow-2xl z-[160] p-5 flex flex-col border-l border-stone-200 dark:border-[#2e2a26] animate-slideLeft text-left">
            {/* Title Header with Close */}
            <div className="flex items-center justify-between border-b border-stone-200/80 dark:border-[#2e2a26] pb-4 mb-4">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <span className="font-serif font-semibold text-lg text-stone-900 dark:text-stone-100">Notifications</span>
              </div>
              <button
                type="button"
                onClick={() => setIsNotificationsOpen(false)}
                className="p-1.5 rounded-xl bg-[#faf8f6] dark:bg-[#23201d] text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-[#2c2824] transition-colors cursor-pointer border border-stone-200/80 dark:border-[#342f2b]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Notifications Content */}
            <div className="flex-1 overflow-y-auto space-y-4 scrollbar-hide">
              {/* Partner Persistent System Notifications */}
              {user.notifications && user.notifications.length > 0 ? (
                <div className="space-y-2.5">
                  <div className="flex justify-between items-center px-1">
                    <p className="text-xs font-semibold text-stone-500 dark:text-stone-400">System Updates</p>
                    <button
                      type="button"
                      onClick={async () => {
                        const updatedUser = {
                          ...user,
                          notifications: (user.notifications || []).map(n => ({ ...n, isRead: true }))
                        };
                        setUser(updatedUser);
                        await syncUser(updatedUser);
                      }}
                      className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                    >
                      Mark all read
                    </button>
                  </div>
                  <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1 scrollbar-thin">
                    {user.notifications.map(notif => (
                      <div
                        key={notif.id}
                        onClick={async () => {
                          if (!notif.isRead) {
                            const updatedUser = {
                              ...user,
                              notifications: (user.notifications || []).map(n => n.id === notif.id ? { ...n, isRead: true } : n)
                            };
                            setUser(updatedUser);
                            await syncUser(updatedUser);
                          }
                        }}
                        className={`p-3 rounded-xl border transition-colors flex flex-col gap-1 cursor-pointer ${
                          notif.isRead
                            ? 'bg-[#faf8f6]/70 dark:bg-[#23201d]/50 border-stone-200/60 dark:border-[#342f2b]/60 opacity-75 hover:opacity-100'
                            : 'bg-indigo-50/60 dark:bg-indigo-950/30 border-indigo-200/80 dark:border-indigo-900/60'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="text-sm shrink-0">{notif.emoji || '🔔'}</span>
                            <p className="text-xs font-semibold text-stone-900 dark:text-stone-100 truncate">{notif.title}</p>
                          </div>
                          {!notif.isRead && (
                            <span className="w-2 h-2 bg-indigo-600 rounded-full shrink-0" />
                          )}
                        </div>
                        <p className="text-xs text-stone-600 dark:text-stone-300 leading-snug break-words">{notif.body}</p>
                        <p className="text-[11px] text-stone-400 dark:text-stone-500 self-end tabular-nums">
                          {new Date(notif.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-stone-500 dark:text-stone-400 text-sm">
                  No notifications yet.
                </div>
              )}
            </div>
          </div>
        </>
      )}
      {renderGlobalModals()}
    </div>
  );
};

const SharingToggle: React.FC<{ label: string; active: boolean; onChange: (v: boolean) => void }> = ({ label, active, onChange }) => (
  <div className="flex items-center justify-between p-4 bg-[#faf8f6] dark:bg-[#23201d] rounded-xl border border-stone-200/80 dark:border-[#342f2b]">
    <span className="text-sm font-medium text-stone-800 dark:text-stone-200">{label}</span>
    <button
      type="button"
      onClick={() => onChange(!active)}
      className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${active ? 'bg-pink-600' : 'bg-stone-300 dark:bg-stone-700'}`}
    >
      <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${active ? 'left-6' : 'left-1'}`}></div>
    </button>
  </div>
);

const SuggestionItem: React.FC<{ icon: string; label: string }> = ({ icon, label }) => (
  <div className="flex items-center gap-3 p-3 bg-[#faf8f6] dark:bg-[#23201d] rounded-xl border border-stone-200/80 dark:border-[#342f2b]">
    <span className="text-lg">{icon}</span>
    <span className="text-xs font-medium text-stone-700 dark:text-stone-300">{label}</span>
  </div>
);

const NavItem: React.FC<{ active: boolean, onClick: () => void, label: string, icon: string }> = ({ active, onClick, label, icon }) => (
  <button
    type="button"
    onClick={onClick}
    className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-semibold transition-colors flex flex-col items-center gap-1 cursor-pointer ${
      active
        ? 'bg-indigo-600 text-white shadow-xs'
        : 'text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-[#23201d]'
    }`}
  >
    <span className="text-base">{icon}</span>
    <span className="hidden md:inline">{label}</span>
  </button>
);

const ComfortButton: React.FC<{ icon: string, label: string, onClick: () => void }> = ({ icon, label, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className="flex flex-col items-center gap-1.5 group cursor-pointer"
  >
    <div className="w-14 h-14 bg-[#faf8f6] dark:bg-[#23201d] rounded-2xl flex items-center justify-center text-2xl border border-stone-200/80 dark:border-[#342f2b] group-hover:border-pink-400 dark:group-hover:border-pink-700 transition-colors">
      {icon}
    </div>
    <span className="text-xs font-semibold text-stone-600 dark:text-stone-300">{label}</span>
  </button>
);

export default PartnerMode;
