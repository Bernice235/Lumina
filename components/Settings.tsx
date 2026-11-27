import React, { useState } from 'react';
import { User, NotificationSettings, Symptom, DiaryEntry, BirthControlLog, TemperatureLog, SharingSettings, Reminder } from '../types';
import PartnerMode from './PartnerMode';
import { CommunityInvite } from './CommunityInvite';
import { 
  Bell, 
  Sparkles, 
  Moon, 
  Heart, 
  Volume2, 
  ShieldAlert, 
  Eye, 
  Check, 
  HelpCircle,
  MessageCircle,
  Clock,
  Send,
  UserCheck,
  LogOut,
  Lock,
  Fingerprint,
  User as UserIcon,
  Calendar,
  Layers,
  Download,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  FileText,
  Bug,
  Lightbulb,
  RefreshCw,
  UploadCloud,
  Shield,
  CheckCircle2,
  X,
  Smartphone,
  Users,
  Baby,
  HeartHandshake,
  Cookie,
  KeyRound,
  AlertTriangle,
  Flower2,
  Mail,
  Music,
  Crown,
  SlidersHorizontal,
  Trash2,
  FolderUp,
  Sun,
  Sunrise,
  Sunset
} from 'lucide-react';
import { 
  getCyclePredictions, 
  getDefaultNotificationSettings, 
  generateNotificationText,
  getPregnancyStats,
  getBabySize,
  generatePregnancyNotificationText
} from '../services/notificationService';
import { 
  getWelcomeGreeting, 
  getUserFirstName, 
  playWelcomeVoiceGreeting, 
  stopWelcomeVoice, 
  WelcomeGreeting 
} from '../services/welcomeVoiceService';
import { syncUser, blockPartner, unblockPartner } from '../services/firebaseService';
import { DeleteAccountModal } from './DeleteAccountModal';
import { PWAInstallButton } from './PWAInstallButton';
import { 
  applyPeriodDurationChange, 
  applyCycleLengthChange, 
  analyzeCycleHistory 
} from '../services/cycleSyncService';
import { 
  REVENUECAT_PLANS, 
  purchasePremiumPlan, 
  restorePremiumPurchases, 
  syncActiveSubscriptionStatus 
} from '../services/revenueCatService';
import { PrivacyDashboard } from './PrivacyDashboard';
import {
  AutoBackupSnapshot,
  applyBackupToUser,
  buildPortableBackupExport,
  listAutomaticSnapshots,
  saveAutomaticEncryptedSnapshot,
  verifyAndParseBackupFile,
} from '../services/backupService';
import {
  appendSecurityEventToUser,
  checkClientRateLimit,
  evaluatePasswordStrength,
  getDefaultSecuritySettings,
  hashDiaryPin,
  isHoneypotTriggered,
  isValidEmailAddress,
  sanitizeTextInput,
  storeLocalCredentialVerifier,
  userHasConfiguredPin,
  validateNewDiaryPin,
} from '../services/securityService';
import { saveEncryptedSessionUser } from '../services/secureStorage';
import {
  BiometricCapability,
  enrollBiometricForUser,
  getBiometricCapability,
  revokeBiometricForUser,
} from '../services/biometricService';
import { doc, getDoc } from 'firebase/firestore';
import { db, auth } from '../services/firebase';
import { updateEmail, updatePassword } from 'firebase/auth';

interface SettingsProps {
  user: User;
  setUser: React.Dispatch<React.SetStateAction<User | null>>;
  onLogout?: () => void;
  symptoms?: Symptom[];
  diaryEntries?: DiaryEntry[];
  bcLogs?: BirthControlLog[];
  tempLogs?: TemperatureLog[];
  initialSubTab?: 'account' | 'cycle' | 'notifications' | 'music' | 'partner' | 'premium' | 'privacy' | 'about' | 'general' | 'billing' | 'invite' | 'mobile' | 'menu' | 'profile' | 'backup_sync' | 'help_support';
  reminders?: Reminder[];
  setReminders?: React.Dispatch<React.SetStateAction<Reminder[]>>;
  volume?: number;
  setVolume?: (vol: number) => void;
  partnerUser?: User | null;
  isMusicPlaying?: boolean;
  toggleMusic?: () => void;
  isMusicActive?: boolean;
  toggleMusicActive?: () => void;
  setActiveTab?: (tab: any) => void;
  onOpenExternalDeletionPage?: () => void;
}

const Settings: React.FC<SettingsProps> = ({ 
  user, 
  setUser, 
  onLogout,
  symptoms = [],
  diaryEntries = [],
  bcLogs = [],
  tempLogs = [],
  initialSubTab = 'menu',
  reminders = [],
  setReminders = () => {},
  volume = 0.3,
  setVolume = (vol: number) => {},
  partnerUser = null,
  isMusicPlaying = false,
  toggleMusic = () => {},
  isMusicActive = false,
  toggleMusicActive = () => {},
  setActiveTab,
  onOpenExternalDeletionPage
}) => {
  const getMappedTab = (tab: any): 'menu' | 'profile' | 'account' | 'cycle' | 'notifications' | 'music_sanctuary' | 'partner' | 'premium' | 'privacy_security' | 'backup_sync' | 'help_support' | 'invite' => {
    if (tab === 'menu') return 'menu';
    if (tab === 'profile') return 'profile';
    if (tab === 'cycle') return 'cycle';
    if (tab === 'invite') return 'invite';
    if (tab === 'notifications') return 'notifications';
    if (tab === 'music' || tab === 'music_sanctuary') return 'music_sanctuary';
    if (tab === 'partner') return 'partner';
    if (tab === 'premium' || tab === 'billing') return 'premium';
    if (tab === 'privacy' || tab === 'privacy_security' || tab === 'mobile') return 'privacy_security';
    if (tab === 'backup' || tab === 'backup_sync') return 'backup_sync';
    if (tab === 'help' || tab === 'help_support' || tab === 'about' || tab === 'about_lumina') return 'help_support';
    if (tab === 'account') return 'profile';
    return 'menu';
  };

  const [activeSubTab, setActiveSubTab] = useState<'menu' | 'profile' | 'account' | 'cycle' | 'notifications' | 'music_sanctuary' | 'partner' | 'premium' | 'privacy_security' | 'backup_sync' | 'help_support' | 'invite'>(getMappedTab(initialSubTab));
  
  // Modals
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState<'support' | 'bug' | 'feature' | null>(null);
  const [feedbackText, setFeedbackText] = useState('');
  const [feedbackEmail, setFeedbackEmail] = useState(user.email || '');
  const [feedbackHoneypot, setFeedbackHoneypot] = useState('');
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [feedbackError, setFeedbackError] = useState<string | null>(null);
  const [feedbackTicketId, setFeedbackTicketId] = useState<string | null>(null);

  // FAQ Accordion
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  // Backup & Snapshot States
  const [autoSnapshots, setAutoSnapshots] = useState<AutoBackupSnapshot[]>([]);
  const [exportPassphrase, setExportPassphrase] = useState('');
  const [pendingEncryptedImport, setPendingEncryptedImport] = useState<string | null>(null);
  const [importPassphrase, setImportPassphrase] = useState('');
  const [musicNotice, setMusicNotice] = useState<string | null>(null);
  const [partnerActionNotice, setPartnerActionNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [biometricCap, setBiometricCap] = useState<BiometricCapability | null>(null);
  const [bioBusy, setBioBusy] = useState(false);
  const [bioFeedback, setBioFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [pinDraft, setPinDraft] = useState('');
  const [pinConfirmDraft, setPinConfirmDraft] = useState('');
  const [pinFeedback, setPinFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [pinSaving, setPinSaving] = useState(false);

  const persistUserLocally = (nextUser: User) => {
    setUser(nextUser);
    localStorage.removeItem('lumina_user');
    localStorage.removeItem('lumina_biometric_user');
    const rememberPref = localStorage.getItem('lumina_remember_me') !== 'false';
    void saveEncryptedSessionUser(nextUser, rememberPref);
  };

  React.useEffect(() => {
    setActiveSubTab(getMappedTab(initialSubTab));
  }, [initialSubTab]);

  React.useEffect(() => {
    if (activeSubTab === 'privacy_security' && user?.id) {
      getBiometricCapability(user.id).then(setBiometricCap).catch(() => {});
    }
  }, [activeSubTab, user?.id, user?.biometricsEnabled]);

  React.useEffect(() => {
    if (activeSubTab === 'backup_sync' && user?.id) {
      listAutomaticSnapshots(user.id).then(setAutoSnapshots).catch(() => {});
    }
  }, [activeSubTab, user?.id, user?.backupMetadata?.lastAutoBackupAt]);

  const [selectedPlanId, setSelectedPlanId] = useState<'monthly' | '6month' | 'yearly'>('monthly');
  const [billingProgress, setBillingProgress] = useState<string | null>(null);
  const [billingError, setBillingError] = useState<string | null>(null);
  const [billingSuccess, setBillingSuccess] = useState<string | null>(null);

  const [localFeedback, setLocalFeedback] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [cloudFeedback, setCloudFeedback] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [isImportDragging, setIsImportDragging] = useState(false);

  const handleExportData = async (encrypted: boolean = false) => {
    setLocalFeedback(null);
    if (encrypted && exportPassphrase.trim().length < 6) {
      setLocalFeedback({ type: 'error', text: 'Please enter a passphrase of at least 6 characters to encrypt your backup file.' });
      return;
    }
    try {
      const result = await buildPortableBackupExport(
        user,
        { symptoms, diaryEntries, bcLogs, tempLogs, reminders },
        encrypted ? exportPassphrase.trim() : undefined
      );
      const blob = new Blob([result.content], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = result.filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      const updatedUser = appendSecurityEventToUser(
        {
          ...user,
          backupMetadata: {
            autoBackupEnabled: user.backupMetadata?.autoBackupEnabled ?? true,
            lastAutoBackupAt: user.backupMetadata?.lastAutoBackupAt,
            lastManualExportAt: new Date().toISOString(),
            lastChecksum: result.checksum,
            snapshotCount: autoSnapshots.length,
          },
        },
        'Data Backup Exported',
        `Downloaded ${result.encrypted ? 'AES-256 encrypted' : 'checksum-verified'} backup (${result.filename}).`,
        '📦'
      );
      persistUserLocally(updatedUser);
      syncUser(updatedUser);
      if (encrypted) setExportPassphrase('');
      setLocalFeedback({
        type: 'success',
        text: `Saved ${result.filename} (${result.encrypted ? 'AES-256-GCM Encrypted' : 'SHA-256 Verified'}).`,
      });
    } catch {
      setLocalFeedback({ type: 'error', text: 'Unable to prepare your backup export right now.' });
    }
  };

  // Profile Edit States
  const [profileName, setProfileName] = useState(user.name || '');
  const [profileAge, setProfileAge] = useState(user.age ? String(user.age) : '');
  const [profileEmail, setProfileEmail] = useState(user.email || '');
  const [profilePassword, setProfilePassword] = useState('');
  const [profileFeedback, setProfileFeedback] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);

  // Account Deletion & Partner Control States
  const [showDeleteAccountModal, setShowDeleteAccountModal] = useState(false);
  const [partnerToBlock, setPartnerToBlock] = useState<{ id: string; name: string } | null>(null);
  const [partnerToUnblock, setPartnerToUnblock] = useState<{ id: string; name: string } | null>(null);

  const handleBlockPartnerConfirm = async () => {
    if (!partnerToBlock) return;
    try {
      await blockPartner(user.id, partnerToBlock.id, { id: partnerToBlock.id, name: partnerToBlock.name });
      const updatedUser = appendSecurityEventToUser(
        {
          ...user,
          partnerId: undefined,
          partnerName: '',
          isPartnerLinked: false,
          partnerRequest: undefined,
          blockedPartners: [
            ...(user.blockedPartners || []).filter(b => b.id !== partnerToBlock.id),
            { id: partnerToBlock.id, name: partnerToBlock.name, dateBlocked: new Date().toISOString() }
          ]
        },
        'Partner Blocked',
        `${partnerToBlock.name} was disconnected and added to your blocked list.`,
        '🛡️'
      );
      persistUserLocally(updatedUser);
      setPartnerActionNotice({ type: 'success', text: `${partnerToBlock.name} has been blocked.` });
    } catch (err) {
      console.error("Error blocking partner:", err);
      setPartnerActionNotice({ type: 'error', text: 'Unable to block partner right now.' });
    } finally {
      setPartnerToBlock(null);
    }
  };

  const handleUnblockPartnerConfirm = async () => {
    if (!partnerToUnblock) return;
    try {
      await unblockPartner(user.id, partnerToUnblock.id);
      const updatedUser = appendSecurityEventToUser(
        {
          ...user,
          blockedPartners: (user.blockedPartners || []).filter(b => b.id !== partnerToUnblock.id)
        },
        'Partner Unblocked',
        `${partnerToUnblock.name} was removed from your blocked list.`,
        '🔓'
      );
      persistUserLocally(updatedUser);
      setPartnerActionNotice({ type: 'success', text: `${partnerToUnblock.name} has been unblocked.` });
    } catch (err) {
      console.error("Error unblocking partner:", err);
      setPartnerActionNotice({ type: 'error', text: 'Unable to unblock partner right now.' });
    } finally {
      setPartnerToUnblock(null);
    }
  };

  React.useEffect(() => {
    setProfileName(user.name || '');
    setProfileAge(user.age ? String(user.age) : '');
    setProfileEmail(user.email || '');
  }, [user]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileFeedback(null);
    setProfileLoading(true);
    try {
      const cleanName = sanitizeTextInput(profileName, 80);
      const cleanEmail = sanitizeTextInput(profileEmail, 160);
      const nextPassword = profilePassword.trim();

      if (!cleanName) {
        throw new Error('Please enter your display name.');
      }
      if (!isValidEmailAddress(cleanEmail)) {
        throw new Error('Please enter a valid email address.');
      }
      if (nextPassword) {
        const strength = evaluatePasswordStrength(nextPassword);
        if (!strength.valid) {
          throw new Error(strength.error || 'Please choose a stronger password (8+ characters with upper/lowercase, number, and symbol).');
        }
      }

      let updatedUser = { ...user };
      let securityChanged = false;
      updatedUser.name = cleanName;
      if (profileAge.trim()) {
        const parsedAge = parseInt(profileAge, 10);
        if (!Number.isNaN(parsedAge) && parsedAge >= 10 && parsedAge <= 120) {
          updatedUser.age = parsedAge;
        }
      } else {
        delete updatedUser.age;
      }

      // 1. Firebase Auth Update (Email & Password)
      const currentUser = auth.currentUser;
      if (currentUser) {
        if (cleanEmail && cleanEmail !== currentUser.email) {
          try {
            await updateEmail(currentUser, cleanEmail);
            updatedUser.email = cleanEmail;
            securityChanged = true;
          } catch (err: any) {
            if (err?.code === 'auth/requires-recent-login' || String(err?.message || '').includes('requires-recent-login')) {
              throw new Error("Changing your email requires a recent login. Please log out and log in again, then retry.");
            }
            throw err;
          }
        }

        if (nextPassword) {
          try {
            await updatePassword(currentUser, nextPassword);
            await storeLocalCredentialVerifier(cleanEmail || updatedUser.email, nextPassword);
            securityChanged = true;
          } catch (err: any) {
            if (err?.code === 'auth/requires-recent-login' || String(err?.message || '').includes('requires-recent-login')) {
              throw new Error("Changing your password requires a recent login. Please log out and log in again, then retry.");
            }
            throw err;
          }
        }
      } else {
        if (cleanEmail && cleanEmail !== updatedUser.email) {
          updatedUser.email = cleanEmail;
          securityChanged = true;
        }
        if (nextPassword) {
          await storeLocalCredentialVerifier(cleanEmail || updatedUser.email, nextPassword);
          securityChanged = true;
        }
      }

      localStorage.removeItem('lumina_saved_password');

      if (securityChanged) {
        updatedUser = appendSecurityEventToUser(
          updatedUser,
          nextPassword ? 'Password Updated' : 'Account Email Updated',
          nextPassword
            ? 'Your account password was changed from My Profile.'
            : `Your account email was updated to ${cleanEmail}.`,
          '🔐'
        );
        if (nextPassword) {
          updatedUser.securitySettings = {
            ...getDefaultSecuritySettings(updatedUser.securitySettings),
            lastPasswordChangeAt: new Date().toISOString(),
          };
        }
      }

      // Save user state cleanly into encrypted storage + Firestore
      persistUserLocally(updatedUser);
      await syncUser(updatedUser);

      setProfileFeedback({ type: 'success', text: 'Profile updated securely! ✨' });
      setProfilePassword('');
    } catch (err: any) {
      console.error("Error updating profile:", err);
      setProfileFeedback({ 
        type: 'error', 
        text: err instanceof Error ? err.message : 'Could not update profile. Please try again.' 
      });
    } finally {
      setProfileLoading(false);
    }
  };

  const handleCloudBackupNow = async () => {
    setCloudFeedback(null);
    try {
      await syncUser(user);
      setCloudFeedback({ type: 'success', text: 'Your wellness data has been safely backed up to the cloud! ☁️✨' });
    } catch (err) {
      console.error(err);
      setCloudFeedback({ type: 'error', text: 'Could not connect to the cloud. Your local records remain safe on this device.' });
    }
  };

  const handleCloudRestoreNow = async () => {
    setCloudFeedback(null);
    try {
      const docSnap = await getDoc(doc(db, "users", user.id));
      if (docSnap.exists()) {
        const cloudUser = docSnap.data() as User;
        const restoredUser: User = {
          ...cloudUser,
          onboardingCompleted: true
        };
        persistUserLocally(restoredUser);
        setCloudFeedback({ type: 'success', text: 'Your health data has been successfully restored from the cloud! 🌸' });
      } else {
        setCloudFeedback({ type: 'error', text: 'No cloud backup was found for this account.' });
      }
    } catch (err) {
      console.error(err);
      setCloudFeedback({ type: 'error', text: 'Could not connect to the cloud. Your local records remain safe on this device.' });
    }
  };

  // --- REVENUECAT SUBSCRIPTION SYNCHRONIZATION ---
  React.useEffect(() => {
    const syncStatus = async () => {
      try {
        await syncActiveSubscriptionStatus(user, setUser);
      } catch (err) {
        console.error("Failed to auto-sync RevenueCat status on load:", err);
      }
    };
    syncStatus();
  }, []);

  const parseAndImportJSON = async (jsonText: string, passphrase?: string) => {
    setLocalFeedback(null);
    try {
      const parsed = await verifyAndParseBackupFile(jsonText, passphrase);
      const restored = applyBackupToUser(user, parsed.data);
      const audited = appendSecurityEventToUser(
        restored,
        'Backup Data Restored',
        `Restored ${parsed.recordCount} wellness records from a ${parsed.isEncrypted ? 'AES-256 encrypted' : parsed.checksumVerified ? 'SHA-256 verified' : 'portable'} backup file.`,
        '📥'
      );

      persistUserLocally(audited);
      syncUser(audited);
      setPendingEncryptedImport(null);
      setImportPassphrase('');

      setLocalFeedback({
        type: 'success',
        text: `Restored ${parsed.recordCount} records (${parsed.checksumVerified ? 'SHA-256 integrity verified' : 'legacy format imported'}). ✨`,
      });
    } catch (e: any) {
      if (e?.message === 'PASSPHRASE_REQUIRED') {
        setPendingEncryptedImport(jsonText);
        setLocalFeedback({
          type: 'error',
          text: 'This backup is AES-256 encrypted. Enter your backup passphrase below to decrypt and restore it.',
        });
        return;
      }
      setLocalFeedback({ type: 'error', text: `Failed to restore: ${e.message || 'Invalid backup file structure.'}` });
    }
  };

  const handleRestoreSnapshot = async (snapshot: AutoBackupSnapshot) => {
    try {
      const restored = applyBackupToUser(user, snapshot.payload);
      const audited = appendSecurityEventToUser(
        restored,
        'Snapshot Restored',
        `Restored automatic snapshot from ${new Date(snapshot.createdAt).toLocaleString()} (${snapshot.recordCount} records).`,
        '⏪'
      );
      persistUserLocally(audited);
      syncUser(audited);
      setLocalFeedback({
        type: 'success',
        text: `Snapshot from ${new Date(snapshot.createdAt).toLocaleString()} restored cleanly! ✨`,
      });
    } catch {
      setLocalFeedback({ type: 'error', text: 'Unable to restore that snapshot.' });
    }
  };

  const handleLocalFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalFeedback(null);
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      if (typeof event.target?.result === 'string') {
        parseAndImportJSON(event.target.result);
      }
    };
    reader.readAsText(file);
  };

  const settings: NotificationSettings = user.notificationSettings || getDefaultNotificationSettings();

  const updateSettings = (newSettings: Partial<NotificationSettings>) => {
    if (!user) return;
    const updatedUser = {
      ...user,
      notificationSettings: {
        ...settings,
        ...newSettings
      }
    };
    persistUserLocally(updatedUser);
  };

  const updateTypes = (key: keyof NotificationSettings['types'], value: boolean) => {
    updateSettings({
      types: {
         ...settings.types,
         [key]: value
      }
    });
  };

  const updatePartnerReceiveTypes = (key: keyof NotificationSettings['partnerReceiveTypes'], value: boolean) => {
    updateSettings({
      partnerReceiveTypes: {
        ...(settings.partnerReceiveTypes || {
          periodStarting: true,
          periodStarted: true,
          periodEnding: true,
          ovulation: true,
          fertileWindow: true,
          pregnancyRisk: true,
        }),
        [key]: value
      }
    });
  };

  const updatePartnerPregnancyReceiveTypes = (key: keyof NotificationSettings['partnerPregnancyReceiveTypes'], value: boolean) => {
    updateSettings({
      partnerPregnancyReceiveTypes: {
        ...(settings.partnerPregnancyReceiveTypes || {
          welcome: true,
          weeklyBabyDev: true,
          appointment: true,
          rest: true,
          symptomSupport: true,
          dueDateCountdown: true,
          laborNear: true,
          encouragement: true,
        }),
        [key]: value
      }
    });
  };

  const updatePartnerPref = (key: string, value: boolean) => {
    if (!user) return;
    const updatedUser = {
      ...user,
      partnerNotificationPreferences: {
        ...(user.partnerNotificationPreferences || {}),
        [key]: value
      }
    };
    persistUserLocally(updatedUser);
    syncUser(updatedUser);
  };

  const [isPlayingVoiceTest, setIsPlayingVoiceTest] = useState(false);
  const [greetingRotationOffset, setGreetingRotationOffset] = useState(0);

  const userFirstName = getUserFirstName(user);
  const currentPreviewGreeting = getWelcomeGreeting(user, undefined, greetingRotationOffset);

  const handleTestWelcomeVoice = async () => {
    setIsPlayingVoiceTest(true);
    try {
      await playWelcomeVoiceGreeting(user, {
        force: true,
        customGreeting: currentPreviewGreeting,
        onEnd: () => setIsPlayingVoiceTest(false),
        onError: () => setIsPlayingVoiceTest(false),
      });
    } catch (e) {
      console.warn("Welcome voice test notice:", e);
      setIsPlayingVoiceTest(false);
    }
  };

  const handleRotatePreview = () => {
    setGreetingRotationOffset((prev) => prev + 1);
  };

  const triggerSimulation = (
    type: keyof NotificationSettings['types'] | 'pregnancyRiskLow' | 'pregnancyRiskHigh',
    isPartner: boolean
  ) => {
    const tone = settings.toneStyle || 'supportive';
    let bodyText = '';
    let titleText = isPartner ? 'Partner Connection 💕' : 'Cycle Update 🌸';
    let emojiText = '🔔';

    const predictions = getCyclePredictions(user);

    if (type === 'periodStarting') {
      bodyText = generateNotificationText('periodStarting', tone, isPartner, { date: predictions.nextPeriod });
      titleText = isPartner ? 'Partner Connection 💞' : 'Cycle Reminder 🌸';
      emojiText = '🌸';
    } else if (type === 'periodStarted') {
      bodyText = generateNotificationText('periodStarted', tone, isPartner);
      titleText = isPartner ? 'Period started 💕' : 'New Cycle Begins 🩷';
      emojiText = '🩷';
    } else if (type === 'periodEnding') {
      bodyText = generateNotificationText('periodEnding', tone, isPartner);
      titleText = isPartner ? 'Cycle Update 🌷' : 'Period Ending ✨';
      emojiText = '🌷';
    } else if (type === 'ovulation') {
      bodyText = generateNotificationText('ovulation', tone, isPartner, { date: predictions.ovulation });
      titleText = isPartner ? 'Ovulation Update 🌸' : 'Ovulation Day ✨';
      emojiText = '💖';
    } else if (type === 'fertileWindow') {
      bodyText = generateNotificationText('fertileWindow', tone, isPartner, { startDate: predictions.fertileStart, endDate: predictions.fertileEnd });
      titleText = isPartner ? 'Fertile Window 💞' : 'Fertile Window 💞';
      emojiText = '💞';
    } else if (type === 'lutealPhase') {
      bodyText = generateNotificationText('lutealPhase', tone, isPartner);
      titleText = 'Luteal Phase 🌙';
      emojiText = '🌙';
    }

    const event = new CustomEvent('lumina-simulate-notification', {
      detail: {
        title: titleText,
        body: bodyText,
        emoji: emojiText,
        isPartner
      }
    });
    window.dispatchEvent(event);
  };

  const tonePreviews = {
    supportive: {
      desc: "Warm, empathetic, and gentle. Feels like a supportive, reassuring text from a caring friend.",
      label: "Supportive 💗",
      sample: user.isPregnancyMode 
        ? "“Hey mama 💗 Welcome to your pregnancy journey. We’re here with you every step of the way 🌸”" 
        : "“Hey girl 💗 Your period is expected to start soon. Remember to take gentle care of yourself 🌸”"
    },
    playful: {
      desc: "Lighthearted, uplifting, and cheerful. Adds a gentle smile to your daily cycle reminders.",
      label: "Playful 😜",
      sample: user.isPregnancyMode 
        ? "“Congrats mama! 🎉 A little bundle of joy is growing! Stock up on your favorite snacks 🍕✨”"
        : "“Psst... 🤫 Your period is just around the corner. Time to grab your favorite chocolate! 🍫”"
    },
    affirming: {
      desc: "Empowering, mindful, and centered. Cultivates body literacy, mindfulness, and calm awareness.",
      label: "Affirming 🧘‍♀️",
      sample: user.isPregnancyMode 
        ? "“We honor your body as it nurtures new life. You are grounded, capable, and supported. 🌾”"
        : "“Your body is transitioning naturally. Honor its timing and give yourself space to rest. 🌾”"
    },
    aesthetic: {
      desc: "Soft, poetic, and serene. Adorned with seasonal metaphors and calming reflections.",
      label: "Aesthetic 🩰",
      sample: user.isPregnancyMode 
        ? "“A beautiful new chapter begins... 🩰 Step softly into the gentle light of your pregnancy journey. 🌸”"
        : "“A time for rest and renewal. Step softly into your cycle's quiet winter season. 🩰”"
    }
  };

  const handleFeedbackSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedbackError(null);

    if (isHoneypotTriggered(feedbackHoneypot)) {
      setFeedbackError('Unable to verify form submission. Please refresh and try again.');
      return;
    }

    const cleanEmail = sanitizeTextInput(feedbackEmail, 160);
    const cleanMessage = sanitizeTextInput(feedbackText, 2000);

    if (!isValidEmailAddress(cleanEmail)) {
      setFeedbackError('Please enter a valid contact email address.');
      return;
    }
    if (cleanMessage.length < 10) {
      setFeedbackError('Please share at least 10 characters so our team can assist you properly.');
      return;
    }

    const limit = checkClientRateLimit('support_form', 3, 60_000);
    if (!limit.allowed) {
      setFeedbackError(`Please wait ${limit.retryAfterSec}s before sending another support request.`);
      return;
    }

    setFeedbackLoading(true);
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'X-Requested-With': 'LuminaWebApp',
      };
      if (auth.currentUser) {
        try {
          const token = await auth.currentUser.getIdToken();
          if (token) headers.Authorization = `Bearer ${token}`;
        } catch {}
      }

      const res = await fetch('/api/support', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          email: cleanEmail,
          type: showFeedbackModal || 'support',
          message: cleanMessage,
          website: feedbackHoneypot,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || 'Could not send your message right now.');
      }

      setFeedbackTicketId(data.ticketId || null);
      setFeedbackSubmitted(true);
      setTimeout(() => {
        setFeedbackSubmitted(false);
        setShowFeedbackModal(null);
        setFeedbackText('');
        setFeedbackTicketId(null);
        setFeedbackError(null);
      }, 3200);
    } catch (err: any) {
      setFeedbackError(err?.message || 'Unable to submit right now. Please try again.');
    } finally {
      setFeedbackLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-16 max-w-4xl mx-auto">
      {/* Sub-navigation Header */}
      <header className="flex items-center justify-between gap-4 pb-3 border-b border-stone-200/80 dark:border-[#2e2a26]">
        <button 
          type="button"
          onClick={() => {
            if (activeSubTab === 'menu') {
              if (setActiveTab) setActiveTab('dashboard');
            } else {
              setActiveSubTab('menu');
            }
          }}
          className="h-9 px-3 rounded-xl bg-white dark:bg-[#1a1816] hover:bg-stone-50 dark:hover:bg-[#23201d] text-stone-700 dark:text-stone-200 transition-colors border border-stone-200/80 dark:border-[#2e2a26] cursor-pointer flex items-center gap-1.5 text-xs font-semibold shrink-0"
          title="Back"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>{activeSubTab === 'menu' ? 'Dashboard' : 'Settings'}</span>
        </button>

        <h1 className="font-serif font-bold text-lg sm:text-xl text-stone-900 dark:text-stone-100 truncate">
          {activeSubTab === 'menu' ? 'Settings' : 
           activeSubTab === 'cycle' ? 'My Cycle' :
           activeSubTab === 'profile' ? 'My Profile' :
           activeSubTab === 'privacy_security' ? 'Privacy & Security' :
           activeSubTab === 'backup_sync' ? 'Backup & Sync' :
           activeSubTab === 'invite' ? 'Invite Friends' :
           activeSubTab === 'notifications' ? 'Reminders & Notifications' :
           activeSubTab === 'partner' ? 'Partner Mode' :
           activeSubTab === 'music_sanctuary' ? 'Music & Sanctuary' :
           activeSubTab === 'premium' ? 'Premium' :
           activeSubTab === 'help_support' ? 'Help & Support' :
           activeSubTab === 'account' ? 'Account' : 'Settings'}
        </h1>

        <button 
          type="button"
          className="h-9 w-9 rounded-xl bg-white dark:bg-[#1a1816] hover:bg-stone-50 dark:hover:bg-[#23201d] text-stone-600 dark:text-stone-300 cursor-pointer flex items-center justify-center border border-stone-200/80 dark:border-[#2e2a26] transition-colors shrink-0"
          onClick={() => setActiveSubTab('help_support')}
          title="Help & Support"
        >
          <HelpCircle className="w-4 h-4" />
        </button>
      </header>

      {/* ========================================================================= */}
      {/* 1. MAIN MENU SCREEN */}
      {/* ========================================================================= */}
      {activeSubTab === 'menu' ? (
        <div className="space-y-6 animate-fadeIn">
          {/* Header Greeting Banner */}
          <div className="bg-white dark:bg-[#1a1816] p-6 rounded-2xl border border-stone-200/80 dark:border-[#2e2a26] shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <span className="text-[11px] font-semibold tracking-wide text-pink-600 dark:text-pink-400">Your wellness space</span>
              <h2 className="text-2xl font-serif text-stone-900 dark:text-stone-100 font-bold tracking-tight">
                Settings &amp; Preferences
              </h2>
              <p className="text-xs text-stone-600 dark:text-stone-400">Manage cycle calculations, privacy, notifications, and encrypted backups.</p>
            </div>
            <button
              type="button"
              onClick={() => setActiveSubTab('profile')}
              className="px-4 h-10 bg-stone-50 dark:bg-[#23201d] border border-stone-200/80 dark:border-[#342f2b] text-stone-800 dark:text-stone-200 font-semibold text-xs rounded-xl hover:border-pink-300 transition-colors flex items-center gap-2 shrink-0 cursor-pointer self-start sm:self-center"
            >
              <UserIcon size={14} className="text-pink-600 dark:text-pink-400" />
              <span>{user.name ? user.name.split(' ')[0] : 'My Profile'}</span>
            </button>
          </div>

          <PWAInstallButton variant="settings" />

          {/* Group 1: Cycle & Body */}
          <div className="space-y-2">
            <span className="text-[11px] font-semibold tracking-wide text-stone-500 dark:text-stone-400 ml-1">Cycle &amp; Body</span>
            <div className="bg-white dark:bg-[#1a1816] rounded-2xl border border-stone-200/80 dark:border-[#2e2a26] shadow-xs p-1.5 overflow-hidden">
              <button
                type="button"
                onClick={() => setActiveSubTab('cycle')}
                className="w-full flex items-center justify-between p-3.5 hover:bg-stone-50 dark:hover:bg-[#23201d] transition-colors rounded-xl text-left group cursor-pointer"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-9 h-9 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-pink-600 dark:text-pink-400 flex items-center justify-center shrink-0">
                    <Flower2 size={18} />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-stone-900 dark:text-stone-100 group-hover:text-pink-600 dark:group-hover:text-pink-400 transition-colors">My Cycle</h4>
                    <p className="text-xs text-stone-500 dark:text-stone-400">Cycle length, period duration &amp; pregnancy mode</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-stone-400 group-hover:text-pink-600 transition-colors" />
              </button>
            </div>
          </div>

          {/* Group 2: Personal & Privacy */}
          <div className="space-y-2">
            <span className="text-[11px] font-semibold tracking-wide text-stone-500 dark:text-stone-400 ml-1">Personal &amp; Privacy</span>
            <div className="bg-white dark:bg-[#1a1816] rounded-2xl border border-stone-200/80 dark:border-[#2e2a26] shadow-xs p-1.5 divide-y divide-stone-100 dark:divide-[#2e2a26] overflow-hidden">
              {[
                {
                  id: 'profile' as const,
                  label: 'My Profile',
                  desc: 'Name, age, email & account password',
                  color: 'bg-teal-50 dark:bg-teal-950/40 text-teal-600 dark:text-teal-400',
                  Icon: UserIcon,
                },
                {
                  id: 'privacy_security' as const,
                  label: 'Privacy & Security Vault',
                  desc: 'Privacy Dashboard, 2FA, active sessions, biometrics & PIN',
                  color: 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400',
                  Icon: ShieldCheck,
                },
                {
                  id: 'backup_sync' as const,
                  label: 'Backup & Sync',
                  desc: 'Encrypted snapshots, cloud sync & verified recovery',
                  color: 'bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400',
                  Icon: UploadCloud,
                },
              ].map((item) => {
                const Icon = item.Icon;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setActiveSubTab(item.id)}
                    className="w-full flex items-center justify-between p-3.5 hover:bg-stone-50 dark:hover:bg-[#23201d] transition-colors rounded-xl text-left group cursor-pointer"
                  >
                    <div className="flex items-center gap-3.5">
                      <div className={`w-9 h-9 rounded-xl ${item.color} flex items-center justify-center shrink-0`}>
                        <Icon size={18} />
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-stone-900 dark:text-stone-100 group-hover:text-pink-600 dark:group-hover:text-pink-400 transition-colors">{item.label}</h4>
                        <p className="text-xs text-stone-500 dark:text-stone-400">{item.desc}</p>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-stone-400 group-hover:text-pink-600 transition-colors" />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Group 3: Connected & Wellness */}
          <div className="space-y-2">
            <span className="text-[11px] font-semibold tracking-wide text-stone-500 dark:text-stone-400 ml-1">Connected &amp; Wellness</span>
            <div className="bg-white dark:bg-[#1a1816] rounded-2xl border border-stone-200/80 dark:border-[#2e2a26] shadow-xs p-1.5 divide-y divide-stone-100 dark:divide-[#2e2a26] overflow-hidden">
              {[
                {
                  id: 'notifications' as const,
                  label: 'Reminders & Notifications',
                  desc: 'Cycle reminders, ovulation alerts & greeting tone',
                  color: 'bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400',
                  Icon: Bell,
                },
                {
                  id: 'partner' as const,
                  label: 'Partner Mode',
                  desc: 'Share supportive cycle updates with your partner',
                  color: 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400',
                  Icon: HeartHandshake,
                },
                {
                  id: 'music_sanctuary' as const,
                  label: 'Music & Sanctuary',
                  desc: 'Relaxing ambient frequencies & sound volume',
                  color: 'bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400',
                  Icon: Music,
                },
                {
                  id: 'invite' as const,
                  label: 'Invite Friends',
                  desc: 'Share Lumina with friends and loved ones',
                  color: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400',
                  Icon: Users,
                },
              ].map((item) => {
                const Icon = item.Icon;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setActiveSubTab(item.id)}
                    className="w-full flex items-center justify-between p-3.5 hover:bg-stone-50 dark:hover:bg-[#23201d] transition-colors rounded-xl text-left group cursor-pointer"
                  >
                    <div className="flex items-center gap-3.5">
                      <div className={`w-9 h-9 rounded-xl ${item.color} flex items-center justify-center shrink-0`}>
                        <Icon size={18} />
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-stone-900 dark:text-stone-100 group-hover:text-pink-600 dark:group-hover:text-pink-400 transition-colors">{item.label}</h4>
                        <p className="text-xs text-stone-500 dark:text-stone-400">{item.desc}</p>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-stone-400 group-hover:text-pink-600 transition-colors" />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Group 4: Support & Account */}
          <div className="space-y-2">
            <span className="text-[11px] font-semibold tracking-wide text-stone-500 dark:text-stone-400 ml-1">Support &amp; Account</span>
            <div className="bg-white dark:bg-[#1a1816] rounded-2xl border border-stone-200/80 dark:border-[#2e2a26] shadow-xs p-1.5 divide-y divide-stone-100 dark:divide-[#2e2a26] overflow-hidden">
              <button
                type="button"
                onClick={() => setActiveSubTab('help_support')}
                className="w-full flex items-center justify-between p-3.5 hover:bg-stone-50 dark:hover:bg-[#23201d] transition-colors rounded-xl text-left group cursor-pointer"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-9 h-9 rounded-xl bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0">
                    <HelpCircle size={18} />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-stone-900 dark:text-stone-100 group-hover:text-pink-600 dark:group-hover:text-pink-400 transition-colors">Help &amp; Support</h4>
                    <p className="text-xs text-stone-500 dark:text-stone-400">FAQs, contact support, bug reports &amp; suggestions</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-stone-400 group-hover:text-pink-600 transition-colors" />
              </button>

              <button
                type="button"
                onClick={() => setActiveSubTab('account')}
                className="w-full flex items-center justify-between p-3.5 hover:bg-stone-50 dark:hover:bg-[#23201d] transition-colors rounded-xl text-left group cursor-pointer"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-9 h-9 rounded-xl bg-stone-100 dark:bg-[#23201d] text-stone-600 dark:text-stone-300 flex items-center justify-center shrink-0">
                    <SlidersHorizontal size={18} />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-stone-900 dark:text-stone-100 group-hover:text-pink-600 dark:group-hover:text-pink-400 transition-colors">Account</h4>
                    <p className="text-xs text-stone-500 dark:text-stone-400">Log out &amp; permanent account deletion</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-stone-400 group-hover:text-pink-600 transition-colors" />
              </button>
            </div>
          </div>
        </div>

      /* ========================================================================= */
      /* 2. MY CYCLE SCREEN */
      /* ========================================================================= */
      ) : activeSubTab === 'cycle' ? (
        <div className="space-y-6 animate-fadeIn">
          {/* App Mode Switcher */}
          <div className="bg-white dark:bg-[#1a1816] p-6 rounded-2xl border border-stone-200/80 dark:border-[#2e2a26] shadow-xs space-y-4">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-pink-50 dark:bg-pink-950/40 text-pink-600 dark:text-pink-400 flex items-center justify-center shrink-0">
                    {user.isPregnancyMode ? <Baby size={18} /> : <Flower2 size={18} />}
                  </div>
                  <h3 className="text-lg font-serif font-bold text-stone-900 dark:text-stone-100">
                    Tracking Mode
                  </h3>
                </div>
                <p className="text-xs text-stone-600 dark:text-stone-400 leading-relaxed">
                  Choose between standard cycle tracking and dedicated pregnancy tracking.
                </p>
              </div>
              <div className="flex bg-stone-100 dark:bg-[#23201d] p-1 rounded-xl border border-stone-200/80 dark:border-[#342f2b] self-stretch md:self-auto">
                <button
                  type="button"
                  onClick={() => {
                    if (user.isPregnancyMode) {
                      const updatedUser = {
                        ...user,
                        isPregnancyMode: false,
                        pregnancyStartDate: undefined,
                        notificationSettings: {
                          ...settings,
                          pregnancyEnabled: false,
                          partnerPregnancyEnabled: false,
                          types: {
                            ...settings.types,
                            periodStarting: true,
                            periodStarted: true,
                            periodEnding: true,
                            ovulation: true,
                            fertileWindow: true,
                            lutealPhase: true,
                            pregnancyRisk: true,
                          }
                        }
                      };
                      persistUserLocally(updatedUser);
                    }
                  }}
                  className={`flex-1 md:flex-initial px-4 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                    !user.isPregnancyMode
                      ? 'bg-pink-600 text-white shadow-xs'
                      : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200'
                  }`}
                >
                  Period Tracker
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (!user.isPregnancyMode) {
                      const updatedUser = {
                        ...user,
                        isPregnancyMode: true,
                        pregnancyStartDate: user.pregnancyStartDate || new Date(Date.now() - 84 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                        notificationSettings: {
                          ...settings,
                          pregnancyEnabled: true,
                          types: {
                            ...settings.types,
                            periodStarting: false,
                            periodStarted: false,
                            periodEnding: false,
                            ovulation: false,
                            fertileWindow: false,
                            lutealPhase: false,
                            pregnancyRisk: false,
                          }
                        }
                      };
                      persistUserLocally(updatedUser);
                    }
                  }}
                  className={`flex-1 md:flex-initial px-4 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                    user.isPregnancyMode
                      ? 'bg-amber-600 text-white shadow-xs'
                      : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200'
                  }`}
                >
                  Pregnancy Mode
                </button>
              </div>
            </div>

            {user.isPregnancyMode && (
              <div className="pt-4 border-t border-stone-200/80 dark:border-[#2e2a26] flex flex-col md:flex-row gap-4 justify-between items-stretch md:items-center animate-fadeIn">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-800/50 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                    <Baby size={20} />
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-[11px] font-semibold text-amber-700 dark:text-amber-400">Pregnancy progress</span>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold text-stone-900 dark:text-stone-100 tabular-nums">
                        Week {user.pregnancyStartDate ? getPregnancyStats(user).weeks : 12}
                      </span>
                      <span className="w-1 h-1 rounded-full bg-amber-400" />
                      <span className="text-xs text-stone-600 dark:text-stone-400 tabular-nums">
                        Due {user.pregnancyStartDate ? getPregnancyStats(user).dueDate : 'Dec 25, 2026'} ({user.pregnancyStartDate ? getPregnancyStats(user).weeksLeft : 28} weeks left)
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-1 shrink-0">
                  <label className="text-[11px] font-semibold text-amber-800 dark:text-amber-300">Last Menstrual Period (LMP)</label>
                  <input
                    type="date"
                    value={user.pregnancyStartDate || new Date(Date.now() - 84 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}
                    onChange={(e) => {
                      const updatedUser = {
                        ...user,
                        pregnancyStartDate: e.target.value
                      };
                      persistUserLocally(updatedUser);
                    }}
                    className="h-10 bg-[#faf8f6] dark:bg-[#23201d] px-3 rounded-xl outline-none font-semibold text-xs text-stone-800 dark:text-stone-200 border border-stone-200 dark:border-[#342f2b] tabular-nums"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Cycle Metrics Sliders & Automatic Prediction */}
          <section className="bg-white dark:bg-[#1a1816] p-6 rounded-2xl shadow-xs border border-stone-200/80 dark:border-[#2e2a26] space-y-5">
            <div className="space-y-1">
              <h3 className="text-lg font-serif font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
                <Calendar size={18} className="text-pink-600 dark:text-pink-400" />
                Cycle Settings
              </h3>
              <p className="text-xs text-stone-600 dark:text-stone-400 leading-relaxed">
                Keep your cycle metrics updated for accurate phase windows and reminders.
              </p>
            </div>

            {/* AUTOMATIC CYCLE PREDICTION TOGGLE */}
            {(() => {
              const cycleAnalysis = analyzeCycleHistory(user.periods || [], user.cycleLength || 28);
              const handleToggleAutoPrediction = () => {
                const newAuto = !user.automaticCyclePrediction;
                let updatedUser: User = {
                  ...user,
                  automaticCyclePrediction: newAuto
                };
                if (newAuto && cycleAnalysis.cycleCount >= 1) {
                  updatedUser = {
                    ...updatedUser,
                    manualCycleLength: user.cycleLength || 28,
                    cycleLength: cycleAnalysis.averageCycleLength
                  };
                } else if (!newAuto && user.manualCycleLength) {
                  updatedUser = {
                    ...updatedUser,
                    cycleLength: user.manualCycleLength
                  };
                }
                setUser(updatedUser);
                syncUser(updatedUser);
              };

              return (
                <div className="bg-[#faf8f6] dark:bg-[#23201d] p-5 rounded-xl border border-stone-200/80 dark:border-[#2e2a26] flex flex-col gap-3">
                  <div className="flex justify-between items-center gap-3">
                    <div className="flex flex-col">
                      <span className="text-xs font-semibold text-stone-900 dark:text-stone-100 flex items-center gap-1.5">
                        <Sparkles size={14} className="text-pink-600 dark:text-pink-400" />
                        Automatic cycle prediction
                      </span>
                      <p className="text-xs text-stone-600 dark:text-stone-400 mt-0.5 leading-snug">
                        Learn from your logged cycle patterns and update predictions automatically.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleToggleAutoPrediction}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${user.automaticCyclePrediction ? 'bg-pink-600' : 'bg-stone-300 dark:bg-stone-600'}`}
                      aria-pressed={Boolean(user.automaticCyclePrediction)}
                      title="Toggle automatic cycle prediction"
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${user.automaticCyclePrediction ? 'translate-x-5' : 'translate-x-0'}`}
                      />
                    </button>
                  </div>

                  {user.automaticCyclePrediction ? (
                    <div className="bg-white dark:bg-[#1a1816] p-4 rounded-xl border border-stone-200/80 dark:border-[#342f2b] text-xs space-y-2.5 mt-1">
                      <div className="flex justify-between items-center gap-2">
                        <span className="font-semibold text-stone-700 dark:text-stone-300">Estimated Cycle Length</span>
                        <span className="font-semibold text-pink-700 dark:text-pink-300 bg-pink-50 dark:bg-pink-950/40 px-2.5 py-1 rounded-lg border border-pink-200/70 dark:border-pink-800/40 text-xs tabular-nums">
                          {cycleAnalysis.cycleCount >= 1 ? `${cycleAnalysis.averageCycleLength} Days (Learned)` : `${user.cycleLength ?? 28} Days (Baseline)`}
                        </span>
                      </div>
                      <p className="text-xs text-stone-600 dark:text-stone-400 leading-relaxed">
                        {cycleAnalysis.explanation}
                      </p>
                      {cycleAnalysis.cycleCount < 1 && (
                        <div className="text-xs text-amber-900 dark:text-amber-200 bg-amber-50 dark:bg-amber-950/30 p-3 rounded-lg border border-amber-200/80 dark:border-amber-800/40 leading-relaxed">
                          <strong>Learning your rhythm:</strong> Record at least 2 period start dates to compute your personal average. Currently using {user.cycleLength ?? 28} days.
                        </div>
                      )}
                      {cycleAnalysis.isIrregular && (
                        <div className="text-xs text-indigo-900 dark:text-indigo-200 bg-indigo-50 dark:bg-indigo-950/30 p-3 rounded-lg border border-indigo-200/80 dark:border-indigo-800/40 leading-relaxed">
                          <strong>Irregular variation noted:</strong> Your cycles varied by {cycleAnalysis.variationDays} days. Lumina adapts to your actual intervals.
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-xs text-stone-500 dark:text-stone-400">
                      Manual mode active: adjust your baseline cycle length and period duration below.
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Manual Sliders */}
            {user.automaticCyclePrediction ? (
              <div className="bg-[#faf8f6] dark:bg-[#23201d] p-5 rounded-xl border border-stone-200/80 dark:border-[#2e2a26] flex items-start gap-3.5">
                <div className="w-9 h-9 rounded-xl bg-white dark:bg-[#1a1816] border border-stone-200/80 dark:border-[#342f2b] flex items-center justify-center text-stone-600 dark:text-stone-300 shrink-0 mt-0.5">
                  <Lock size={16} />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-stone-900 dark:text-stone-100">
                      Manual controls inactive
                    </span>
                    <span className="text-[11px] font-medium bg-stone-200/70 dark:bg-[#342f2b] text-stone-700 dark:text-stone-300 px-2 py-0.5 rounded-md">
                      Auto-managed
                    </span>
                  </div>
                  <p className="text-xs text-stone-600 dark:text-stone-400 leading-relaxed max-w-lg">
                    Manual sliders are paused while Automatic Cycle Prediction is active. Turn off auto-prediction above to override manually.
                  </p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-fadeIn">
                {/* Cycle Length */}
                <div className="bg-[#faf8f6] dark:bg-[#23201d] p-5 rounded-xl border border-stone-200/80 dark:border-[#2e2a26] flex flex-col gap-2">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-semibold text-stone-800 dark:text-stone-200 flex items-center gap-1.5">
                      <Layers size={14} className="text-pink-600 dark:text-pink-400" />
                      Manual Cycle Length
                    </label>
                    <span className="text-xs font-semibold text-pink-700 dark:text-pink-300 bg-white dark:bg-[#1a1816] px-2.5 py-1 rounded-lg border border-stone-200 dark:border-[#342f2b] tabular-nums">
                      {user.cycleLength ?? 28} Days
                    </span>
                  </div>
                  <input 
                    type="range" 
                    min="21" 
                    max="42" 
                    value={user.cycleLength ?? 28} 
                    onChange={(e) => {
                      const val = parseInt(e.target.value) || 28;
                      const updatedUser = applyCycleLengthChange(user, val);
                      setUser(updatedUser);
                      syncUser(updatedUser);
                    }}
                    className="w-full accent-pink-600 h-1.5 bg-stone-200 dark:bg-[#342f2b] rounded-lg cursor-pointer mt-2"
                  />
                  <span className="text-[11px] text-stone-500 dark:text-stone-400">Days from one period start to the next (typical: 28)</span>
                </div>

                {/* Period Duration */}
                <div className="bg-[#faf8f6] dark:bg-[#23201d] p-5 rounded-xl border border-stone-200/80 dark:border-[#2e2a26] flex flex-col gap-2">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-semibold text-stone-800 dark:text-stone-200 flex items-center gap-1.5">
                      <Calendar size={14} className="text-pink-600 dark:text-pink-400" />
                      Manual Period Duration
                    </label>
                    <span className="text-xs font-semibold text-pink-700 dark:text-pink-300 bg-white dark:bg-[#1a1816] px-2.5 py-1 rounded-lg border border-stone-200 dark:border-[#342f2b] tabular-nums">
                      {user.periodLength ?? 5} Days
                    </span>
                  </div>
                  <input 
                    type="range" 
                    min="3" 
                    max="10" 
                    value={user.periodLength ?? 5} 
                    onChange={(e) => {
                      const val = parseInt(e.target.value) || 5;
                      const updatedUser = applyPeriodDurationChange(user, val);
                      setUser(updatedUser);
                      syncUser(updatedUser);
                    }}
                    className="w-full accent-pink-600 h-1.5 bg-stone-200 dark:bg-[#342f2b] rounded-lg cursor-pointer mt-2"
                  />
                  <span className="text-[11px] text-stone-500 dark:text-stone-400">Typical bleeding duration in days (typical: 5)</span>
                </div>
              </div>
            )}

            {/* Last Period Start Date */}
            <div className="bg-[#faf8f6] dark:bg-[#23201d] p-5 rounded-xl border border-stone-200/80 dark:border-[#2e2a26] flex flex-col gap-2">
              <label className="text-xs font-semibold text-stone-800 dark:text-stone-200 flex items-center gap-1.5">
                <Calendar size={14} className="text-pink-600 dark:text-pink-400" />
                Last Period Start Date
              </label>
              <input 
                type="date"
                value={user.lastPeriodStart ? user.lastPeriodStart.split('T')[0] : new Date().toISOString().split('T')[0]}
                onChange={(e) => {
                  const selectedDate = e.target.value ? new Date(e.target.value).toISOString() : new Date().toISOString();
                  const updatedUser = { ...user, lastPeriodStart: selectedDate };
                  setUser(updatedUser);
                  syncUser(updatedUser);
                }}
                className="h-11 bg-white dark:bg-[#1a1816] px-4 rounded-xl outline-none font-medium text-xs text-stone-900 dark:text-stone-100 border border-stone-200 dark:border-[#342f2b] w-full focus:border-pink-400 transition-colors cursor-pointer tabular-nums"
              />
              <span className="text-[11px] text-stone-500 dark:text-stone-400">Reference date for upcoming cycle and ovulation windows</span>
            </div>

            {/* Restart Setup Questions */}
            <div className="bg-[#faf8f6] dark:bg-[#23201d] p-5 rounded-xl border border-stone-200/80 dark:border-[#2e2a26] flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="space-y-1 text-left">
                <h4 className="text-xs font-semibold text-stone-900 dark:text-stone-100 flex items-center gap-2">
                  <FileText size={14} className="text-pink-600 dark:text-pink-400" />
                  Update Baseline Questions
                </h4>
                <p className="text-xs text-stone-600 dark:text-stone-400">
                  Re-answer the initial setup questions to refresh your baseline goals and preferences.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  const resetUser = { ...user, onboardingCompleted: false };
                  persistUserLocally(resetUser);
                  syncUser(resetUser);
                  if (setActiveTab) setActiveTab('dashboard');
                }}
                className="px-4 h-10 bg-pink-600 hover:bg-pink-700 text-white font-semibold text-xs rounded-xl transition-colors cursor-pointer shrink-0"
              >
                Update Setup Questions
              </button>
            </div>
          </section>
        </div>

      /* ========================================================================= */
      /* 3. MY PROFILE SCREEN */
      /* ========================================================================= */
      ) : activeSubTab === 'profile' ? (
        <div className="space-y-6 animate-fadeIn">
          <section className="bg-white dark:bg-[#1a1816] p-6 rounded-2xl shadow-xs border border-stone-200/80 dark:border-[#2e2a26] space-y-6">
            <div className="space-y-1">
              <h3 className="text-lg font-serif font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
                <UserIcon size={18} className="text-pink-600 dark:text-pink-400" />
                My Profile
              </h3>
              <p className="text-xs text-stone-600 dark:text-stone-400">
                Manage your name, age, email address, and account password.
              </p>
            </div>

            {profileFeedback && (
              <div className={`p-4 rounded-xl text-xs font-medium border flex items-center gap-2 ${
                profileFeedback.type === 'success' ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 border-emerald-200 dark:border-emerald-800/50' : 'bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-200 border-rose-200 dark:border-rose-800/50'
              }`}>
                {profileFeedback.type === 'success' ? <CheckCircle2 size={16} /> : <ShieldAlert size={16} />}
                <span>{profileFeedback.text}</span>
              </div>
            )}

            <form onSubmit={handleUpdateProfile} className="space-y-4">
              {/* Display Name */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-stone-700 dark:text-stone-300 flex items-center gap-1.5">
                  <UserCheck size={14} className="text-pink-600 dark:text-pink-400" />
                  Name / Nickname
                </label>
                <input 
                  type="text" 
                  value={profileName} 
                  onChange={(e) => setProfileName(e.target.value)}
                  className="h-11 bg-[#faf8f6] dark:bg-[#23201d] px-4 rounded-xl outline-none font-medium text-xs text-stone-900 dark:text-stone-100 border border-stone-200 dark:border-[#342f2b] placeholder-stone-400 w-full focus:border-pink-400 transition-colors"
                  placeholder="e.g. Sarah"
                  required
                />
              </div>

              {/* Age */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-stone-700 dark:text-stone-300 flex items-center gap-1.5">
                  <Calendar size={14} className="text-pink-600 dark:text-pink-400" />
                  Age
                </label>
                <input 
                  type="number" 
                  value={profileAge} 
                  onChange={(e) => setProfileAge(e.target.value)}
                  className="h-11 bg-[#faf8f6] dark:bg-[#23201d] px-4 rounded-xl outline-none font-medium text-xs text-stone-900 dark:text-stone-100 border border-stone-200 dark:border-[#342f2b] placeholder-stone-400 w-full focus:border-pink-400 transition-colors tabular-nums"
                  placeholder="e.g. 28"
                  min="1"
                  max="120"
                />
              </div>

              {/* Email Address */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-stone-700 dark:text-stone-300 flex items-center gap-1.5">
                  <Mail size={14} className="text-pink-600 dark:text-pink-400" />
                  Email Address
                </label>
                <input 
                  type="email" 
                  value={profileEmail} 
                  onChange={(e) => setProfileEmail(e.target.value)}
                  className="h-11 bg-[#faf8f6] dark:bg-[#23201d] px-4 rounded-xl outline-none font-medium text-xs text-stone-900 dark:text-stone-100 border border-stone-200 dark:border-[#342f2b] placeholder-stone-400 w-full focus:border-pink-400 transition-colors"
                  placeholder="e.g. you@example.com"
                  required
                />
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <label htmlFor="settings-profile-password" className="text-xs font-semibold text-stone-700 dark:text-stone-300 flex items-center gap-1.5">
                  <Lock size={14} className="text-pink-600 dark:text-pink-400" />
                  Change Password
                </label>
                <input 
                  id="settings-profile-password"
                  type="password" 
                  value={profilePassword} 
                  onChange={(e) => setProfilePassword(e.target.value)}
                  className="h-11 bg-[#faf8f6] dark:bg-[#23201d] px-4 rounded-xl outline-none font-medium text-xs text-stone-900 dark:text-stone-100 border border-stone-200 dark:border-[#342f2b] placeholder-stone-400 w-full focus:border-pink-400 transition-colors"
                  placeholder="Enter a new password"
                />
                {profilePassword ? (() => {
                  const pw = evaluatePasswordStrength(profilePassword);
                  return (
                    <div className="space-y-1.5 pt-1">
                      <div className="flex items-center gap-1.5">
                        {[0, 1, 2, 3].map((idx) => (
                          <div
                            key={idx}
                            className={`h-1.5 flex-1 rounded-full ${
                              idx < pw.score
                                ? pw.score >= 4
                                  ? 'bg-emerald-500'
                                  : pw.score === 3
                                    ? 'bg-amber-400'
                                    : 'bg-rose-400'
                                : 'bg-stone-200 dark:bg-[#342f2b]'
                            }`}
                          />
                        ))}
                        <span className="text-[11px] font-semibold text-stone-700 dark:text-stone-300 ml-1">{pw.label}</span>
                      </div>
                      <p className="text-[11px] text-stone-600 dark:text-stone-400">
                        {pw.valid ? 'Strong password meets Lumina protection standards.' : pw.error}
                      </p>
                    </div>
                  );
                })() : (
                  <span className="text-[11px] text-stone-500 dark:text-stone-400 block">Leave blank to keep your current password (8+ chars, upper/lowercase, number &amp; symbol)</span>
                )}
              </div>

              {/* Save Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={profileLoading}
                  className="w-full h-11 bg-pink-600 hover:bg-pink-700 text-white font-semibold rounded-xl text-xs flex items-center justify-center gap-2 shadow-xs cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {profileLoading ? 'Saving Changes...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </section>
        </div>

      /* ========================================================================= */
      /* 4. PRIVACY & SECURITY SCREEN */
      /* ========================================================================= */
      ) : activeSubTab === 'privacy_security' ? (
        <div className="space-y-6 animate-fadeIn">
          {partnerActionNotice && (
            <div
              role="status"
              className={`p-4 rounded-2xl text-xs font-semibold border flex items-center justify-between gap-2 ${
                partnerActionNotice.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : 'bg-rose-50 text-rose-700 border-rose-200'
              }`}
            >
              <span>{partnerActionNotice.text}</span>
              <button
                type="button"
                onClick={() => setPartnerActionNotice(null)}
                aria-label="Dismiss notice"
                className="p-1 rounded-full hover:bg-black/5 cursor-pointer"
              >
                <X size={14} />
              </button>
            </div>
          )}

          {/* Full Privacy Dashboard & Account Protection */}
          <PrivacyDashboard
            user={user}
            onUpdateUser={(next) => {
              persistUserLocally(next);
              syncUser(next);
            }}
            onLogoutAllDevices={() => {
              if (onLogout) onLogout();
            }}
            onRequestDeleteAccount={() => {
              setShowDeleteAccountModal(true);
            }}
            onNavigateToBackup={() => setActiveSubTab('backup_sync')}
            embedded={true}
          />

          {/* Quick Device App Lock (Real Biometrics & Salted Security PIN) */}
          <section className="bg-white dark:bg-[#1a1816] p-6 rounded-2xl shadow-xs border border-stone-200/80 dark:border-[#2e2a26] space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="space-y-1">
                <h3 className="text-lg font-serif font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
                  <Lock size={18} className="text-pink-600 dark:text-pink-400" />
                  Device App Lock &amp; Cookie Controls
                </h3>
                <p className="text-xs text-stone-600 dark:text-stone-400 leading-relaxed">
                  Configure native Face ID / Fingerprint / WebAuthn passkeys and your private salted diary PIN.
                </p>
              </div>
              <button
                type="button"
                onClick={() => window.dispatchEvent(new CustomEvent('lumina:open-cookie-settings'))}
                className="px-3.5 py-2 rounded-xl bg-stone-50 dark:bg-[#23201d] hover:bg-stone-100 dark:hover:bg-[#2c2824] text-stone-800 dark:text-stone-200 border border-stone-200/80 dark:border-[#342f2b] text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                <Cookie size={14} className="text-pink-600 dark:text-pink-400" />
                <span>Manage Cookie Preferences</span>
              </button>
            </div>

            <div className="space-y-4">
              {/* Genuine Biometric Enrollment Toggle */}
              <div className="bg-[#faf8f6] dark:bg-[#23201d] p-5 rounded-xl border border-stone-200/80 dark:border-[#2e2a26] flex flex-col gap-3">
                <div className="flex items-center justify-between gap-4">
                  <div className="space-y-0.5">
                    <p className="text-xs font-semibold text-stone-900 dark:text-stone-100 flex items-center gap-1.5">
                      <Fingerprint size={15} className="text-pink-600 dark:text-pink-400" />
                      {biometricCap?.biometryLabel || 'Face ID / Fingerprint / Passkey'}
                    </p>
                    <p className="text-xs text-stone-600 dark:text-stone-400">
                      {biometricCap?.available
                        ? 'Requires live hardware biometric confirmation before enabling or unlocking.'
                        : biometricCap?.reason || 'No platform biometric sensor detected on this device; use a private Security PIN.'}
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer shrink-0">
                    <input
                      type="checkbox"
                      aria-label="Toggle biometric app lock"
                      className="sr-only peer"
                      disabled={bioBusy}
                      checked={Boolean(user.biometricsEnabled || user.securitySettings?.biometricQuickUnlock)}
                      onChange={async (e) => {
                        setBioFeedback(null);
                        const wantEnable = e.target.checked;
                        setBioBusy(true);
                        try {
                          if (wantEnable) {
                            const res = await enrollBiometricForUser(user);
                            if (!res.verified) {
                              setBioFeedback({ type: 'error', text: res.message });
                              return;
                            }
                            const nextSec = {
                              ...getDefaultSecuritySettings(user.securitySettings),
                              biometricQuickUnlock: true,
                              biometricCredentialId: res.credentialId,
                              biometricPlatform: biometricCap?.platform || 'web',
                            };
                            const updatedUser = appendSecurityEventToUser(
                              { ...user, biometricsEnabled: true, securitySettings: nextSec },
                              'Biometric App Lock Enabled',
                              `${biometricCap?.biometryLabel || 'Device Biometrics'} verified and enabled for this device.`,
                              '🔑'
                            );
                            persistUserLocally(updatedUser);
                            await syncUser(updatedUser);
                            setBioFeedback({ type: 'success', text: res.message });
                          } else {
                            await revokeBiometricForUser(user.id);
                            const nextSec = {
                              ...getDefaultSecuritySettings(user.securitySettings),
                              biometricQuickUnlock: false,
                              biometricCredentialId: undefined,
                            };
                            const updatedUser = appendSecurityEventToUser(
                              { ...user, biometricsEnabled: false, securitySettings: nextSec },
                              'Biometric App Lock Disabled',
                              'Device biometric unlock was removed from your sanctuary settings.',
                              '🔓'
                            );
                            persistUserLocally(updatedUser);
                            await syncUser(updatedUser);
                            setBioFeedback({ type: 'success', text: 'Biometric lock disabled cleanly.' });
                          }
                        } finally {
                          setBioBusy(false);
                        }
                      }}
                    />
                    <div className="w-10 h-6 bg-pink-100 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gradient-to-r peer-checked:from-pink-500 peer-checked:to-rose-400"></div>
                  </label>
                </div>

                {bioFeedback && (
                  <div
                    role="status"
                    className={`p-3 rounded-2xl text-[11px] font-semibold border ${
                      bioFeedback.type === 'success'
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                        : 'bg-rose-50 text-rose-700 border-rose-200'
                    }`}
                  >
                    {bioFeedback.text}
                  </div>
                )}

                <div className="pt-2 border-t border-rose-100/40">
                  {user.biometricsEnabled || user.securitySettings?.biometricQuickUnlock ? (
                    <span className="text-[11px] text-emerald-700 font-semibold flex items-center gap-1">
                      <CheckCircle2 size={13} />
                      Enabled • Genuine biometric verification required on resume
                    </span>
                  ) : (
                    <span className="text-[11px] text-stone-600 font-medium">
                      Disabled • Unlock with your account password or private PIN
                    </span>
                  )}
                </div>
              </div>

              {/* Set / Update Private Salted 4-6 Digit Security PIN */}
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  setPinFeedback(null);
                  const check = validateNewDiaryPin(pinDraft);
                  if (!check.valid) {
                    setPinFeedback({ type: 'error', text: check.error || 'Choose a valid 4–6 digit PIN.' });
                    return;
                  }
                  if (pinDraft !== pinConfirmDraft) {
                    setPinFeedback({ type: 'error', text: 'Your two PIN entries do not match.' });
                    return;
                  }
                  setPinSaving(true);
                  try {
                    const { hash, salt } = await hashDiaryPin(pinDraft);
                    const updatedUser = appendSecurityEventToUser(
                      { ...user, diaryPin: undefined, diaryPinHash: hash, diaryPinSalt: salt },
                      'Security PIN Updated',
                      'Your Secret Diary & Sanctuary PIN was updated with salted PBKDF2-SHA256 encryption.',
                      '🔐'
                    );
                    persistUserLocally(updatedUser);
                    await syncUser(updatedUser);
                    setPinDraft('');
                    setPinConfirmDraft('');
                    setPinFeedback({ type: 'success', text: 'Private Security PIN saved and salted securely.' });
                  } catch {
                    setPinFeedback({ type: 'error', text: 'Unable to save Security PIN right now.' });
                  } finally {
                    setPinSaving(false);
                  }
                }}
                    className="bg-[#faf8f6] dark:bg-[#23201d] p-5 rounded-xl border border-stone-200/80 dark:border-[#2e2a26] flex flex-col gap-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <label htmlFor="settings-diary-pin" className="text-xs font-semibold text-stone-800 dark:text-stone-200 flex items-center gap-1.5">
                    <Lock size={14} className="text-pink-600 dark:text-pink-400" />
                    Private Security &amp; Diary PIN
                  </label>
                  <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-md ${
                    userHasConfiguredPin(user) ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300' : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300'
                  }`}>
                    {userHasConfiguredPin(user) ? 'Configured' : 'Not Set'}
                  </span>
                </div>

                {pinFeedback && (
                  <div
                    role="status"
                    className={`p-3 rounded-xl text-xs font-medium border ${
                      pinFeedback.type === 'success'
                        ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 border-emerald-200 dark:border-emerald-800/50'
                        : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-200 border-rose-200 dark:border-rose-800/50'
                    }`}
                  >
                    {pinFeedback.text}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <input
                    id="settings-diary-pin"
                    type="password"
                    inputMode="numeric"
                    maxLength={6}
                    value={pinDraft}
                    onChange={(e) => setPinDraft(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))}
                    className="h-11 bg-white dark:bg-[#1a1816] px-4 rounded-xl outline-none font-bold text-sm tracking-[0.35em] text-stone-900 dark:text-stone-100 border border-stone-200 dark:border-[#342f2b] w-full focus:border-pink-400 transition-colors text-center tabular-nums"
                    placeholder="New 4–6 digit PIN"
                    aria-label="New 4 to 6 digit PIN"
                  />
                  <input
                    id="settings-diary-pin-confirm"
                    type="password"
                    inputMode="numeric"
                    maxLength={6}
                    value={pinConfirmDraft}
                    onChange={(e) => setPinConfirmDraft(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))}
                    className="h-11 bg-white dark:bg-[#1a1816] px-4 rounded-xl outline-none font-bold text-sm tracking-[0.35em] text-stone-900 dark:text-stone-100 border border-stone-200 dark:border-[#342f2b] w-full focus:border-pink-400 transition-colors text-center tabular-nums"
                    placeholder="Confirm PIN"
                    aria-label="Confirm PIN"
                  />
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-[11px] text-stone-500 dark:text-stone-400">
                    Stored only as a salted PBKDF2-SHA256 hash. Weak codes like 1234 are rejected.
                  </span>
                  <button
                    type="submit"
                    disabled={pinSaving || pinDraft.length < 4}
                    className="px-4 h-10 bg-pink-600 hover:bg-pink-700 text-white rounded-xl text-xs font-semibold cursor-pointer disabled:opacity-40 transition-colors"
                  >
                    {pinSaving ? 'Encrypting...' : userHasConfiguredPin(user) ? 'Update Private PIN' : 'Set Private PIN'}
                  </button>
                </div>
              </form>
            </div>
          </section>

          {/* Blocked Connections */}
          <section className="bg-white dark:bg-[#1a1816] p-6 rounded-2xl shadow-xs border border-stone-200/80 dark:border-[#2e2a26] space-y-4">
            <h3 className="text-base font-serif font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
              <ShieldAlert size={18} className="text-pink-600 dark:text-pink-400" />
              Blocked Connections
            </h3>
            <p className="text-xs text-stone-600 dark:text-stone-400 leading-relaxed">
              Manage partners you have blocked. Blocked partners cannot send requests or view cycle updates.
            </p>

            {user.blockedPartners && user.blockedPartners.length > 0 ? (
              <div className="space-y-2 pt-2">
                {user.blockedPartners.map((bp) => (
                  <div key={bp.id} className="flex items-center justify-between p-4 bg-[#faf8f6] dark:bg-[#23201d] rounded-xl border border-stone-200/80 dark:border-[#2e2a26]">
                    <div>
                      <p className="text-xs font-semibold text-stone-900 dark:text-stone-100">{bp.name}</p>
                      {bp.dateBlocked && (
                        <p className="text-[11px] text-stone-500 dark:text-stone-400 tabular-nums">Blocked on {new Date(bp.dateBlocked).toLocaleDateString()}</p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => setPartnerToUnblock({ id: bp.id, name: bp.name })}
                      className="px-3.5 py-2 bg-white dark:bg-[#1a1816] border border-stone-200 dark:border-[#342f2b] text-pink-700 dark:text-pink-400 hover:bg-stone-50 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
                    >
                      Unblock
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-5 bg-[#faf8f6] dark:bg-[#23201d] rounded-xl text-center space-y-1 border border-stone-200/80 dark:border-[#2e2a26]">
                <p className="text-xs font-semibold text-stone-800 dark:text-stone-200">You haven’t blocked anyone.</p>
                <p className="text-xs text-stone-500 dark:text-stone-400">Anyone you block will appear here, and you can unblock them anytime.</p>
              </div>
            )}
          </section>

          {/* Privacy Policy & Terms of Service */}
          <section className="bg-white dark:bg-[#1a1816] p-6 rounded-2xl shadow-xs border border-stone-200/80 dark:border-[#2e2a26] space-y-4">
            <h3 className="text-base font-serif font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
              <ShieldCheck size={18} className="text-pink-600 dark:text-pink-400" />
              Your Privacy &amp; Terms
            </h3>
            <p className="text-xs text-stone-600 dark:text-stone-400 leading-relaxed">
              Your health data belongs strictly to you. Review how Lumina protects your privacy and rights.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
              <div className="p-5 bg-[#faf8f6] dark:bg-[#23201d] rounded-xl border border-stone-200/80 dark:border-[#2e2a26] space-y-2.5">
                <h4 className="text-xs font-semibold text-stone-900 dark:text-stone-100 flex items-center gap-1.5">
                  <Shield size={14} className="text-pink-600 dark:text-pink-400" />
                  Privacy Policy
                </h4>
                <p className="text-xs text-stone-600 dark:text-stone-400 leading-relaxed">
                  We never sell or monetize your personal cycle or health records. You own 100% of your data.
                </p>
                <button
                  type="button"
                  onClick={() => setShowPrivacyModal(true)}
                  className="text-xs text-pink-700 dark:text-pink-400 font-semibold hover:underline cursor-pointer flex items-center gap-1"
                >
                  Read Privacy Policy &rarr;
                </button>
              </div>

              <div className="p-5 bg-[#faf8f6] dark:bg-[#23201d] rounded-xl border border-stone-200/80 dark:border-[#2e2a26] space-y-2.5">
                <h4 className="text-xs font-semibold text-stone-900 dark:text-stone-100 flex items-center gap-1.5">
                  <FileText size={14} className="text-pink-600 dark:text-pink-400" />
                  Terms of Service
                </h4>
                <p className="text-xs text-stone-600 dark:text-stone-400 leading-relaxed">
                  Lumina provides supportive cycle estimations and wellness insights to help you understand your body.
                </p>
                <button
                  type="button"
                  onClick={() => setShowTermsModal(true)}
                  className="text-xs text-pink-700 dark:text-pink-400 font-semibold hover:underline cursor-pointer flex items-center gap-1"
                >
                  Read Terms of Service &rarr;
                </button>
              </div>
            </div>
          </section>
        </div>

      /* ========================================================================= */
      /* 5. BACKUP & SYNC SCREEN */
      /* ========================================================================= */
      ) : activeSubTab === 'backup_sync' ? (
        <div className="space-y-6 animate-fadeIn">
          {/* Cloud Sync & Automatic Encrypted Snapshots */}
          <section className="bg-white dark:bg-[#1a1816] p-6 rounded-2xl shadow-xs border border-stone-200/80 dark:border-[#2e2a26] space-y-6">
            <div className="space-y-1">
              <h3 className="text-lg font-serif font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
                <UploadCloud size={18} className="text-pink-600 dark:text-pink-400" />
                Backup, Encryption &amp; Recovery
              </h3>
              <p className="text-xs text-stone-600 dark:text-stone-400 leading-relaxed">
                Keep your health logs, notes, and cycle history safe with AES-256 encrypted snapshots, cloud sync, and integrity-verified exports.
              </p>
            </div>

            {/* Automatic Local Encrypted Backup Snapshots */}
            <div className="p-5 bg-[#faf8f6] dark:bg-[#23201d] rounded-xl border border-stone-200/80 dark:border-[#2e2a26] space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="space-y-1">
                  <h4 className="text-xs font-semibold text-stone-900 dark:text-stone-100 flex items-center gap-1.5">
                    <ShieldCheck size={15} className="text-indigo-600 dark:text-indigo-400" />
                    Automatic AES-256 Encrypted Snapshots
                  </h4>
                  <p className="text-xs text-stone-600 dark:text-stone-400">
                    Automatically saves verified encrypted recovery points on your device whenever your records change.
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    aria-label="Enable automatic encrypted snapshots"
                    className="sr-only peer"
                    checked={user.backupMetadata?.autoBackupEnabled !== false}
                    onChange={(e) => {
                      const nextUser: User = {
                        ...user,
                        backupMetadata: {
                          autoBackupEnabled: e.target.checked,
                          lastAutoBackupAt: user.backupMetadata?.lastAutoBackupAt,
                          lastManualExportAt: user.backupMetadata?.lastManualExportAt,
                          lastChecksum: user.backupMetadata?.lastChecksum,
                          snapshotCount: autoSnapshots.length,
                        },
                      };
                      persistUserLocally(nextUser);
                      syncUser(nextUser);
                    }}
                  />
                  <div className="w-10 h-6 bg-stone-300 dark:bg-stone-600 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                </label>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                <span className="text-xs text-stone-600 dark:text-stone-400 tabular-nums">
                  {user.backupMetadata?.lastAutoBackupAt
                    ? `Last snapshot: ${new Date(user.backupMetadata.lastAutoBackupAt).toLocaleString()}`
                    : 'No snapshots saved yet in this session'}
                </span>
                <button
                  type="button"
                  onClick={async () => {
                    const snap = await saveAutomaticEncryptedSnapshot(user, { symptoms, diaryEntries, bcLogs, tempLogs, reminders });
                    if (snap) {
                      const nextList = await listAutomaticSnapshots(user.id);
                      setAutoSnapshots(nextList);
                      const nextUser: User = {
                        ...user,
                        backupMetadata: {
                          autoBackupEnabled: user.backupMetadata?.autoBackupEnabled ?? true,
                          lastAutoBackupAt: snap.createdAt,
                          lastManualExportAt: user.backupMetadata?.lastManualExportAt,
                          lastChecksum: snap.checksum,
                          snapshotCount: nextList.length,
                        },
                      };
                      persistUserLocally(nextUser);
                      setLocalFeedback({ type: 'success', text: `Encrypted snapshot saved (${snap.recordCount} records, SHA-256 ${snap.checksum.slice(0, 10)}…).` });
                    }
                  }}
                  className="px-3.5 py-2 bg-white dark:bg-[#1a1816] border border-stone-200 dark:border-[#342f2b] text-indigo-700 dark:text-indigo-400 hover:bg-stone-50 rounded-xl text-xs font-semibold cursor-pointer transition-colors"
                >
                  Save Snapshot Now
                </button>
              </div>

              {autoSnapshots.length > 0 && (
                <div className="space-y-2 pt-3 border-t border-stone-200/80 dark:border-[#342f2b]">
                  <p className="text-[11px] font-semibold tracking-wide text-indigo-700 dark:text-indigo-400">Recovery History (Last {autoSnapshots.length})</p>
                  {autoSnapshots.map((snap) => (
                    <div key={snap.id} className="flex flex-wrap items-center justify-between gap-2 p-3 bg-white dark:bg-[#1a1816] rounded-xl border border-stone-200/80 dark:border-[#342f2b]">
                      <div className="space-y-0.5">
                        <p className="text-xs font-semibold text-stone-900 dark:text-stone-100 tabular-nums">{new Date(snap.createdAt).toLocaleString()}</p>
                        <p className="text-[11px] text-stone-600 dark:text-stone-400 tabular-nums">
                          {snap.recordCount} records • {(snap.sizeBytes / 1024).toFixed(1)} KB • SHA-256 {snap.checksum.slice(0, 8)}…
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRestoreSnapshot(snap)}
                        className="px-3 py-1.5 bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 text-indigo-700 dark:text-indigo-300 font-semibold text-xs rounded-lg cursor-pointer transition-colors"
                      >
                        Restore
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Cloud Sync Card */}
            <div className="p-5 bg-[#faf8f6] dark:bg-[#23201d] rounded-xl border border-stone-200/80 dark:border-[#2e2a26] space-y-4">
              <div className="space-y-1">
                <h4 className="text-xs font-semibold text-stone-900 dark:text-stone-100 flex items-center gap-1.5">
                  <UploadCloud size={14} className="text-pink-600 dark:text-pink-400" />
                  Cloud Sync
                </h4>
                <p className="text-xs text-stone-600 dark:text-stone-400 leading-relaxed">
                  Your data syncs automatically when signed in, or you can manually push or restore your cloud profile anytime.
                </p>
              </div>

              {cloudFeedback && (
                <div className={`p-4 rounded-xl text-xs font-medium border flex items-center gap-2 ${
                  cloudFeedback.type === 'success' ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 border-emerald-200 dark:border-emerald-800/50' : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-200 border-rose-200 dark:border-rose-800/50'
                }`}>
                  {cloudFeedback.type === 'success' ? <CheckCircle2 size={16} /> : <ShieldAlert size={16} />}
                  <span>{cloudFeedback.text}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={handleCloudBackupNow}
                  className="h-10 px-4 bg-pink-600 hover:bg-pink-700 text-white font-semibold rounded-xl text-xs flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer"
                >
                  <UploadCloud size={14} />
                  <span>Sync Data Now</span>
                </button>
                <button
                  type="button"
                  onClick={handleCloudRestoreNow}
                  className="h-10 px-4 bg-white dark:bg-[#1a1816] border border-stone-200 dark:border-[#342f2b] text-stone-800 dark:text-stone-200 font-semibold rounded-xl text-xs flex items-center justify-center gap-2 hover:bg-stone-50 transition-colors cursor-pointer"
                >
                  <RefreshCw size={14} />
                  <span>Restore From Cloud</span>
                </button>
              </div>
            </div>

            {/* Download My Data */}
            <div className="space-y-3 pt-1">
              <div className="space-y-1">
                <h4 className="text-xs font-semibold text-stone-900 dark:text-stone-100 flex items-center gap-1.5">
                  <Download size={14} className="text-pink-600 dark:text-pink-400" />
                  Export &amp; Download My Data
                </h4>
                <p className="text-xs text-stone-600 dark:text-stone-400">
                  Save a SHA-256 verified portable copy or lock it with an AES-256-GCM passphrase before downloading.
                </p>
              </div>

              <div className="space-y-2">
                <label htmlFor="backup-export-passphrase" className="text-xs font-semibold text-stone-700 dark:text-stone-300 block">
                  Optional Encryption Passphrase (6+ characters for AES-256 encrypted file)
                </label>
                <input
                  id="backup-export-passphrase"
                  type="password"
                  value={exportPassphrase}
                  onChange={(e) => setExportPassphrase(e.target.value)}
                  placeholder="Enter passphrase for encrypted export (optional)"
                  className="w-full h-11 bg-[#faf8f6] dark:bg-[#23201d] border border-stone-200 dark:border-[#342f2b] rounded-xl px-4 text-xs text-stone-900 dark:text-stone-100 outline-none focus:border-pink-400"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => handleExportData(false)}
                  className="h-10 px-4 bg-white dark:bg-[#1a1816] border border-stone-200 dark:border-[#342f2b] text-stone-800 dark:text-stone-200 hover:bg-stone-50 font-semibold rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer transition-colors"
                >
                  <Download size={15} />
                  <span>Download Portable JSON</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleExportData(true)}
                  className="h-10 px-4 bg-pink-600 hover:bg-pink-700 text-white font-semibold rounded-xl text-xs flex items-center justify-center gap-2 shadow-xs cursor-pointer transition-colors"
                >
                  <KeyRound size={15} />
                  <span>Download Encrypted Backup</span>
                </button>
              </div>
            </div>

            {/* Upload Backup File */}
            <div className="pt-4 space-y-3 border-t border-stone-200/80 dark:border-[#2e2a26]">
              <div className="space-y-1">
                <h4 className="text-xs font-semibold text-stone-900 dark:text-stone-100 flex items-center gap-1.5">
                  <FileText size={14} className="text-pink-600 dark:text-pink-400" />
                  Restore From Backup File
                </h4>
                <p className="text-xs text-stone-600 dark:text-stone-400">
                  Restore your cycle history and notes from an encrypted or portable Lumina backup file. Integrity checksums are verified automatically.
                </p>
              </div>

              {localFeedback && (
                <div className={`p-4 rounded-xl text-xs font-medium border flex items-center gap-2 ${
                  localFeedback.type === 'success' ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 border-emerald-200 dark:border-emerald-800/50' : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-200 border-rose-200 dark:border-rose-800/50'
                }`}>
                  {localFeedback.type === 'success' ? <CheckCircle2 size={16} /> : <ShieldAlert size={16} />}
                  <span>{localFeedback.text}</span>
                </div>
              )}

              {pendingEncryptedImport && (
                <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 space-y-3">
                  <p className="text-xs font-semibold text-amber-900 dark:text-amber-200">Enter Passphrase to Decrypt Backup</p>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="password"
                      value={importPassphrase}
                      onChange={(e) => setImportPassphrase(e.target.value)}
                      placeholder="Backup passphrase"
                      aria-label="Backup decryption passphrase"
                      className="flex-1 h-10 bg-white dark:bg-[#1a1816] border border-amber-200 dark:border-amber-800/50 rounded-xl px-3.5 text-xs text-stone-900 dark:text-stone-100 outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => parseAndImportJSON(pendingEncryptedImport, importPassphrase)}
                      className="px-4 h-10 bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs rounded-xl cursor-pointer transition-colors"
                    >
                      Unlock &amp; Restore
                    </button>
                    <button
                      type="button"
                      onClick={() => { setPendingEncryptedImport(null); setImportPassphrase(''); }}
                      className="px-3 h-10 bg-white dark:bg-[#1a1816] border border-amber-200 dark:border-amber-800/50 text-stone-700 dark:text-stone-300 font-semibold text-xs rounded-xl cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* Drag and drop upload zone */}
              <div 
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsImportDragging(true);
                }}
                onDragLeave={() => setIsImportDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsImportDragging(false);
                  const file = e.dataTransfer.files?.[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onload = (event) => {
                      if (typeof event.target?.result === 'string') {
                        parseAndImportJSON(event.target.result);
                      }
                    };
                    reader.readAsText(file);
                  }
                }}
                className={`relative border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-colors ${
                  isImportDragging 
                    ? 'border-pink-500 bg-pink-50/40 dark:bg-pink-950/20' 
                    : 'border-stone-300 dark:border-[#342f2b] bg-[#faf8f6] dark:bg-[#23201d] hover:border-pink-400'
                }`}
              >
                <input 
                  type="file" 
                  accept=".json"
                  aria-label="Choose a Lumina backup JSON file to restore"
                  onChange={handleLocalFileSelect}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  id="import-json-picker-input"
                />
                <div className="w-10 h-10 rounded-xl bg-pink-50 dark:bg-pink-950/40 text-pink-600 dark:text-pink-400 flex items-center justify-center mx-auto mb-2.5">
                  <FolderUp size={20} />
                </div>
                <p className="text-xs font-semibold text-stone-900 dark:text-stone-100">
                  Upload Backup File
                </p>
                <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-1">
                  Drag &amp; drop your backup file here, or click to browse
                </p>
              </div>
            </div>

            {/* Step-by-step Recovery Guide */}
            <div className="p-5 bg-[#faf8f6] dark:bg-[#23201d] rounded-xl border border-stone-200/80 dark:border-[#2e2a26] space-y-2">
              <h4 className="text-xs font-semibold text-stone-900 dark:text-stone-100">Recovery &amp; Continuity Guide</h4>
              <ol className="list-decimal pl-5 space-y-1 text-xs text-stone-600 dark:text-stone-400">
                <li><strong>New Phone or Browser:</strong> Sign in with your verified Lumina account and tap <em>Restore From Cloud</em>.</li>
                <li><strong>Offline / Encrypted Recovery:</strong> Upload your saved <code className="text-[11px] bg-white dark:bg-[#1a1816] px-1 rounded">lumina_encrypted_backup_*.json</code> file and enter your passphrase.</li>
                <li><strong>Accidental Change Rollback:</strong> Pick any recent timestamped entry under <em>Recovery History</em> above to restore instantaneously.</li>
              </ol>
            </div>
          </section>
        </div>

      /* ========================================================================= */
      /* 6. HELP & SUPPORT SCREEN */
      /* ========================================================================= */
      ) : activeSubTab === 'help_support' ? (
        <div className="space-y-6 animate-fadeIn">
          {/* Header Support Card */}
          <section className="bg-white dark:bg-[#1a1816] p-6 rounded-2xl shadow-xs border border-stone-200/80 dark:border-[#2e2a26] space-y-6">
            <div className="space-y-1">
              <h3 className="text-lg font-serif font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
                <HelpCircle size={18} className="text-pink-600 dark:text-pink-400" />
                Help &amp; Support
              </h3>
              <p className="text-xs text-stone-600 dark:text-stone-400 leading-relaxed">
                Reach out to our team or explore common questions.
              </p>
            </div>

            {/* Quick Action Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => setShowFeedbackModal('support')}
                className="p-5 bg-[#faf8f6] dark:bg-[#23201d] hover:border-pink-300 dark:hover:border-pink-800/60 rounded-xl border border-stone-200/80 dark:border-[#2e2a26] text-left space-y-2 transition-colors group cursor-pointer"
              >
                <div className="w-9 h-9 rounded-xl bg-pink-600 text-white flex items-center justify-center shrink-0">
                  <MessageCircle size={17} />
                </div>
                <h4 className="text-xs font-semibold text-stone-900 dark:text-stone-100">Contact Support</h4>
                <p className="text-xs text-stone-500 dark:text-stone-400 leading-snug">Get in touch with our care team</p>
              </button>

              <button
                type="button"
                onClick={() => setShowFeedbackModal('bug')}
                className="p-5 bg-[#faf8f6] dark:bg-[#23201d] hover:border-rose-300 dark:hover:border-rose-800/60 rounded-xl border border-stone-200/80 dark:border-[#2e2a26] text-left space-y-2 transition-colors group cursor-pointer"
              >
                <div className="w-9 h-9 rounded-xl bg-rose-600 text-white flex items-center justify-center shrink-0">
                  <Bug size={17} />
                </div>
                <h4 className="text-xs font-semibold text-stone-900 dark:text-stone-100">Report a Bug</h4>
                <p className="text-xs text-stone-500 dark:text-stone-400 leading-snug">Let us know if something isn’t working</p>
              </button>

              <button
                type="button"
                onClick={() => setShowFeedbackModal('feature')}
                className="p-5 bg-[#faf8f6] dark:bg-[#23201d] hover:border-amber-300 dark:hover:border-amber-800/60 rounded-xl border border-stone-200/80 dark:border-[#2e2a26] text-left space-y-2 transition-colors group cursor-pointer"
              >
                <div className="w-9 h-9 rounded-xl bg-amber-600 text-white flex items-center justify-center shrink-0">
                  <Lightbulb size={17} />
                </div>
                <h4 className="text-xs font-semibold text-stone-900 dark:text-stone-100">Suggest a Feature</h4>
                <p className="text-xs text-stone-500 dark:text-stone-400 leading-snug">Share ideas to improve Lumina</p>
              </button>
            </div>
          </section>

          {/* FAQs Section */}
          <section className="bg-white dark:bg-[#1a1816] p-6 rounded-2xl shadow-xs border border-stone-200/80 dark:border-[#2e2a26] space-y-4">
            <h3 className="text-base font-serif font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
              <MessageCircle size={18} className="text-pink-600 dark:text-pink-400" />
              Frequently Asked Questions
            </h3>

            <div className="space-y-2.5 pt-1">
              {[
                {
                  q: "How are my cycle and ovulation dates predicted?",
                  a: "Lumina calculates predictions based on your recorded cycle length, period start dates, and biological phase models. As you log more cycles over time, calculations naturally adjust to your unique rhythm."
                },
                {
                  q: "Is my personal health data private and secure?",
                  a: "Yes, completely. Your health logs, notes, and cycle records belong strictly to you. We never sell, rent, or share your data with advertisers or third parties."
                },
                {
                  q: "How does Partner Mode work?",
                  a: "Partner Mode lets you share selected cycle updates, fertile windows, or gentle reminders with your partner. You have complete control over what is shared and can disconnect at any time."
                },
                {
                  q: "Can I use Lumina during pregnancy?",
                  a: "Yes. In Settings -> My Cycle, you can switch to Pregnancy Mode for gestational week tracking, trimester guidance, and gentle maternal wellness."
                },
                {
                  q: "How do I restore my data on a new device?",
                  a: "When you log into your Lumina account on a new device, your cloud data syncs automatically. You can also go to Settings -> Backup & Sync to restore from cloud or an encrypted backup file."
                }
              ].map((faq, idx) => {
                const isOpen = expandedFaq === idx;
                return (
                  <div key={idx} className="bg-[#faf8f6] dark:bg-[#23201d] rounded-xl border border-stone-200/80 dark:border-[#2e2a26] overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setExpandedFaq(isOpen ? null : idx)}
                      className="w-full p-4 flex items-center justify-between text-left cursor-pointer hover:bg-stone-100/60 dark:hover:bg-[#2a2622] transition-colors"
                    >
                      <span className="text-xs font-semibold text-stone-900 dark:text-stone-100 pr-2">{faq.q}</span>
                      <ChevronRight className={`w-4 h-4 text-stone-400 transition-transform shrink-0 ${isOpen ? 'rotate-90' : ''}`} />
                    </button>
                    {isOpen && (
                      <div className="px-4 pb-4 pt-3 text-xs text-stone-600 dark:text-stone-400 leading-relaxed border-t border-stone-200/80 dark:border-[#2e2a26] bg-white dark:bg-[#1a1816]">
                        {faq.a}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>

          {/* App Info Footer */}
          <div className="text-center space-y-1.5 py-2">
            <p className="text-xs font-semibold text-stone-700 dark:text-stone-300">Lumina Wellness</p>
            <p className="text-[11px] text-stone-500 dark:text-stone-400 tabular-nums">Version 2.4.0 • Designed for women’s health</p>
            <div className="flex items-center justify-center gap-3 pt-1">
              <button 
                type="button"
                onClick={() => setShowPrivacyModal(true)} 
                className="text-xs text-pink-700 dark:text-pink-400 hover:underline font-medium cursor-pointer"
              >
                Privacy Policy
              </button>
              <span className="text-stone-300 dark:text-stone-600">•</span>
              <button 
                type="button"
                onClick={() => setShowTermsModal(true)} 
                className="text-xs text-pink-700 dark:text-pink-400 hover:underline font-medium cursor-pointer"
              >
                Terms of Service
              </button>
            </div>
          </div>
        </div>

      /* ========================================================================= */
      /* 7. ACCOUNT SCREEN (Log Out & Delete Account) */
      /* ========================================================================= */
      ) : activeSubTab === 'account' ? (
        <div className="space-y-6 animate-fadeIn">
          {/* Account Profile Card */}
          <section className="bg-white dark:bg-[#1a1816] p-6 rounded-2xl shadow-xs border border-stone-200/80 dark:border-[#2e2a26] space-y-6">
            <div className="space-y-1">
              <h3 className="text-lg font-serif font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
                <UserIcon size={18} className="text-pink-600 dark:text-pink-400" />
                Account
              </h3>
              <p className="text-xs text-stone-600 dark:text-stone-400 leading-relaxed">
                Manage your active session and account settings.
              </p>
            </div>

            <div className="p-4 bg-[#faf8f6] dark:bg-[#23201d] rounded-xl border border-stone-200/80 dark:border-[#2e2a26] flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-semibold text-stone-900 dark:text-stone-100 truncate">{user.name || 'Lumina Member'}</p>
                <p className="text-xs text-stone-500 dark:text-stone-400 truncate">{user.email}</p>
              </div>
              <button
                type="button"
                onClick={() => setActiveSubTab('profile')}
                className="px-4 py-2 bg-white dark:bg-[#1a1816] border border-stone-200 dark:border-[#342f2b] text-pink-700 dark:text-pink-400 font-semibold text-xs rounded-xl hover:bg-stone-50 transition-colors cursor-pointer shrink-0"
              >
                Edit Profile
              </button>
            </div>

            {/* Log Out */}
            {onLogout && (
              <div className="pt-2 space-y-3 border-t border-stone-100 dark:border-[#2e2a26]">
                <div className="space-y-1">
                  <h4 className="text-xs font-semibold text-stone-900 dark:text-stone-100 flex items-center gap-1.5">
                    <LogOut size={14} className="text-pink-600 dark:text-pink-400" />
                    Log Out
                  </h4>
                  <p className="text-xs text-stone-600 dark:text-stone-400">
                    Safely log out of Lumina on this device. Your records remain saved for your next sign-in.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onLogout}
                  className="w-full h-11 bg-stone-100 dark:bg-[#23201d] hover:bg-stone-200 dark:hover:bg-[#2c2824] text-stone-800 dark:text-stone-200 font-semibold rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer transition-colors border border-stone-200/80 dark:border-[#342f2b]"
                >
                  <LogOut size={14} />
                  <span>Log Out</span>
                </button>
              </div>
            )}
          </section>

          {/* Delete Account (Danger Zone) */}
          <section className="bg-rose-50/70 dark:bg-rose-950/30 p-6 rounded-2xl border border-rose-200 dark:border-rose-800/50 space-y-4">
            <div className="flex items-center gap-2 text-rose-800 dark:text-rose-200">
              <ShieldAlert className="w-5 h-5 text-rose-600 dark:text-rose-400" />
              <h3 className="text-base font-serif font-bold">Delete Account</h3>
            </div>
            <p className="text-xs text-rose-900 dark:text-rose-300 leading-relaxed">
              Permanently remove your Lumina account and all associated personal cycle, journal, and partner connection records.
            </p>
            <button
              type="button"
              onClick={() => setShowDeleteAccountModal(true)}
              className="w-full h-11 bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded-xl text-xs transition-colors cursor-pointer shadow-xs flex items-center justify-center gap-2"
            >
              <Trash2 size={14} />
              <span>Delete Account</span>
            </button>
          </section>
        </div>

      /* ========================================================================= */
      /* 8. REMINDERS & NOTIFICATIONS SCREEN */
      /* ========================================================================= */
      ) : activeSubTab === 'notifications' ? (
        <div className="space-y-6 animate-fadeIn">
          {/* Master Notification & Companion Controls */}
          <div className="bg-white dark:bg-[#1a1816] p-6 rounded-2xl shadow-xs border border-stone-200/80 dark:border-[#2e2a26] space-y-5">
            <div className="space-y-1">
              <h3 className="text-lg font-serif font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
                <Bell size={18} className="text-pink-600 dark:text-pink-400" />
                Notification &amp; Companion Preferences
              </h3>
              <p className="text-xs text-stone-600 dark:text-stone-400 leading-relaxed">
                Customize your daily greetings, cycle alerts, mindful affirmations, and shared partner updates.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 pt-1">
              {/* 1. Voice Greetings ON/OFF */}
              <div className="p-4 bg-[#faf8f6] dark:bg-[#23201d] rounded-xl border border-stone-200/80 dark:border-[#2e2a26] flex items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <p className="text-xs font-semibold text-stone-900 dark:text-stone-100 flex items-center gap-1.5">
                    <Volume2 size={14} className="text-pink-600 dark:text-pink-400" />
                    Voice Greetings
                  </p>
                  <p className="text-[11px] text-stone-500 dark:text-stone-400">Audio greeting on launch</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input 
                    type="checkbox" 
                    className="sr-only peer"
                    checked={Boolean(settings.welcomeVoiceEnabled ?? user.welcomeVoiceEnabled ?? true)}
                    onChange={(e) => {
                      const val = e.target.checked;
                      updateSettings({ welcomeVoiceEnabled: val, voiceGreetingsEnabled: val });
                      const updatedUser = { ...user, welcomeVoiceEnabled: val, voiceGreetingsEnabled: val };
                      persistUserLocally(updatedUser);
                      syncUser(updatedUser);
                    }}
                  />
                  <div className="w-10 h-6 bg-stone-300 dark:bg-stone-600 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-pink-600"></div>
                </label>
              </div>

              {/* 2. Daily Affirmations ON/OFF */}
              <div className="p-4 bg-[#faf8f6] dark:bg-[#23201d] rounded-xl border border-stone-200/80 dark:border-[#2e2a26] flex items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <p className="text-xs font-semibold text-stone-900 dark:text-stone-100 flex items-center gap-1.5">
                    <Sparkles size={14} className="text-amber-600 dark:text-amber-400" />
                    Daily Affirmations
                  </p>
                  <p className="text-[11px] text-stone-500 dark:text-stone-400">Mindset &amp; phase nudges</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input 
                    type="checkbox" 
                    className="sr-only peer"
                    checked={Boolean(settings.dailyAffirmationsEnabled ?? user.dailyAffirmationsEnabled ?? true)}
                    onChange={(e) => {
                      const val = e.target.checked;
                      updateSettings({ dailyAffirmationsEnabled: val });
                      const updatedUser = { ...user, dailyAffirmationsEnabled: val };
                      persistUserLocally(updatedUser);
                      syncUser(updatedUser);
                    }}
                  />
                  <div className="w-10 h-6 bg-stone-300 dark:bg-stone-600 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-600"></div>
                </label>
              </div>

              {/* 3. Partner Notifications ON/OFF */}
              <div className="p-4 bg-[#faf8f6] dark:bg-[#23201d] rounded-xl border border-stone-200/80 dark:border-[#2e2a26] flex items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <p className="text-xs font-semibold text-stone-900 dark:text-stone-100 flex items-center gap-1.5">
                    <Heart size={14} className="text-purple-600 dark:text-purple-400" />
                    Partner Notifications
                  </p>
                  <p className="text-[11px] text-stone-500 dark:text-stone-400">Sync care alerts to partner</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input 
                    type="checkbox" 
                    className="sr-only peer"
                    checked={Boolean(settings.partnerNotificationsEnabled ?? true)}
                    onChange={(e) => {
                      const val = e.target.checked;
                      updateSettings({ partnerNotificationsEnabled: val });
                    }}
                  />
                  <div className="w-10 h-6 bg-stone-300 dark:bg-stone-600 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                </label>
              </div>
            </div>
          </div>

          {/* Welcome Voice Greeting Card */}
          <div className="bg-white dark:bg-[#1a1816] p-6 rounded-2xl shadow-xs border border-stone-200/80 dark:border-[#2e2a26] space-y-5">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-pink-50 dark:bg-pink-950/40 text-pink-600 dark:text-pink-400 flex items-center justify-center shrink-0">
                    <Volume2 className="w-4 h-4" />
                  </div>
                  <h4 className="text-base font-serif font-bold text-stone-900 dark:text-stone-100">
                    Avatar Companion Greetings
                  </h4>
                </div>
                <p className="text-xs text-stone-600 dark:text-stone-400 leading-relaxed">
                  Your selected companion greets you with time-aware reflections when you open Lumina.
                </p>
              </div>

              <span className={`text-xs font-semibold px-3 py-1 rounded-lg border shrink-0 ${
                Boolean(settings.welcomeVoiceEnabled ?? user.welcomeVoiceEnabled ?? true)
                  ? 'bg-pink-50 dark:bg-pink-950/40 border-pink-200 dark:border-pink-800/50 text-pink-700 dark:text-pink-300'
                  : 'bg-stone-100 dark:bg-[#23201d] border-stone-200 dark:border-[#342f2b] text-stone-600 dark:text-stone-400'
              }`}>
                {Boolean(settings.welcomeVoiceEnabled ?? user.welcomeVoiceEnabled ?? true) ? 'Voice Active' : 'Muted (Banner Only)'}
              </span>
            </div>

            {Boolean(settings.welcomeVoiceEnabled ?? user.welcomeVoiceEnabled ?? true) ? (
              <div className="space-y-4 animate-fadeIn">
                <div className="p-4 bg-[#faf8f6] dark:bg-[#23201d] rounded-xl border border-stone-200/80 dark:border-[#2e2a26] space-y-2">
                  <div className="flex items-center justify-between text-xs font-semibold text-pink-700 dark:text-pink-400 flex-wrap gap-1">
                    <span className="flex items-center gap-1.5">
                      <span>Current Schedule: {currentPreviewGreeting.timeLabel}</span>
                    </span>
                    <span className="text-[11px] px-2.5 py-0.5 rounded-md bg-pink-50 dark:bg-pink-950/40 text-pink-700 dark:text-pink-300 font-medium">
                      Personalized for {userFirstName}
                    </span>
                  </div>
                  <p className="text-xs font-serif italic text-stone-700 dark:text-stone-300 leading-relaxed bg-white dark:bg-[#1a1816] p-3 rounded-lg border border-stone-200/70 dark:border-[#342f2b]">
                    “{currentPreviewGreeting.displayText}”
                  </p>
                </div>

                {/* Time-Based Schedule Table */}
                <div className="space-y-2 pt-1">
                  <span className="text-[11px] font-semibold tracking-wide text-stone-500 dark:text-stone-400 block">
                    Personalized time-of-day schedule
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div className="p-3.5 bg-[#faf8f6] dark:bg-[#23201d] rounded-xl border border-stone-200/80 dark:border-[#2e2a26] space-y-1">
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-stone-900 dark:text-stone-100">
                        <Sunrise size={14} className="text-amber-500" />
                        <span>Morning (5:00 AM – 11:59 AM)</span>
                      </div>
                      <p className="text-[11px] text-stone-600 dark:text-stone-400 leading-snug">
                        “Good morning, {userFirstName}. I hope you slept well.”
                      </p>
                    </div>

                    <div className="p-3.5 bg-[#faf8f6] dark:bg-[#23201d] rounded-xl border border-stone-200/80 dark:border-[#2e2a26] space-y-1">
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-stone-900 dark:text-stone-100">
                        <Sun size={14} className="text-pink-500" />
                        <span>Afternoon (12:00 PM – 4:59 PM)</span>
                      </div>
                      <p className="text-[11px] text-stone-600 dark:text-stone-400 leading-snug">
                        “Good afternoon, {userFirstName}. How are you feeling today?”
                      </p>
                    </div>

                    <div className="p-3.5 bg-[#faf8f6] dark:bg-[#23201d] rounded-xl border border-stone-200/80 dark:border-[#2e2a26] space-y-1">
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-stone-900 dark:text-stone-100">
                        <Sunset size={14} className="text-rose-500" />
                        <span>Evening (5:00 PM – 8:59 PM)</span>
                      </div>
                      <p className="text-[11px] text-stone-600 dark:text-stone-400 leading-snug">
                        “Good evening, {userFirstName}. Let’s check in with your wellness journey.”
                      </p>
                    </div>

                    <div className="p-3.5 bg-[#faf8f6] dark:bg-[#23201d] rounded-xl border border-stone-200/80 dark:border-[#2e2a26] space-y-1">
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-stone-900 dark:text-stone-100">
                        <Moon size={14} className="text-indigo-500" />
                        <span>Night (9:00 PM – 4:59 AM)</span>
                      </div>
                      <p className="text-[11px] text-stone-600 dark:text-stone-400 leading-snug">
                        “Good night, {userFirstName}. Remember to rest and recharge.”
                      </p>
                    </div>
                  </div>
                </div>

                {/* Preview Controls */}
                <div className="pt-1 flex flex-col sm:flex-row gap-2.5">
                  <button
                    type="button"
                    onClick={() => handleTestWelcomeVoice()}
                    disabled={isPlayingVoiceTest}
                    className="flex-1 h-11 bg-pink-600 hover:bg-pink-700 text-white font-semibold text-xs rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    <Volume2 size={15} />
                    <span>{isPlayingVoiceTest ? 'Playing Voice Greeting...' : 'Test Welcome Voice Greeting'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleRotatePreview()}
                    className="px-4 h-11 bg-stone-50 dark:bg-[#23201d] hover:bg-stone-100 dark:hover:bg-[#2c2824] text-stone-800 dark:text-stone-200 font-semibold text-xs rounded-xl border border-stone-200 dark:border-[#342f2b] transition-colors flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
                    title="Rotate greeting variation"
                  >
                    <Sparkles size={14} className="text-pink-600 dark:text-pink-400" />
                    <span>Rotate Message</span>
                  </button>
                </div>

                <p className="text-[11px] text-stone-500 dark:text-stone-400 text-center">
                  Plays automatically on app launch when sound is enabled.
                </p>
              </div>
            ) : (
              <div className="p-4 bg-[#faf8f6] dark:bg-[#23201d] rounded-xl text-center space-y-1 border border-stone-200/80 dark:border-[#2e2a26]">
                <p className="text-xs font-semibold text-stone-700 dark:text-stone-300">Voice Greeting Audio is Off</p>
                <p className="text-[11px] text-stone-500 dark:text-stone-400">A visual text greeting card will be shown when you open Lumina.</p>
              </div>
            )}
          </div>

          {settings.enabled && (
            <div className="space-y-6">
              {/* Notification Tone Selection */}
              <div className="bg-white dark:bg-[#1a1816] p-6 rounded-2xl shadow-xs border border-stone-200/80 dark:border-[#2e2a26] space-y-5">
                <div className="space-y-1">
                  <h4 className="text-base font-serif font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
                    <Sparkles size={17} className="text-pink-600 dark:text-pink-400" />
                    Reminder Tone &amp; Personality
                  </h4>
                  <p className="text-xs text-stone-600 dark:text-stone-400">
                    Choose how reminders sound: supportive, playful, affirming, or poetic.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {(Object.keys(tonePreviews) as Array<keyof typeof tonePreviews>).map((key) => {
                    const info = tonePreviews[key];
                    const isSelected = settings.toneStyle === key;
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => updateSettings({ toneStyle: key })}
                        className={`text-left p-4 rounded-xl border transition-colors flex flex-col gap-2 relative cursor-pointer ${
                          isSelected 
                            ? 'bg-pink-50/50 dark:bg-pink-950/30 border-pink-400 dark:border-pink-600' 
                            : 'bg-[#faf8f6] dark:bg-[#23201d] border-stone-200/80 dark:border-[#2e2a26] hover:border-pink-300'
                        }`}
                      >
                        {isSelected && (
                          <span className="absolute top-3.5 right-3.5 w-5 h-5 bg-pink-600 rounded-full flex items-center justify-center text-white">
                            <Check size={11} strokeWidth={3} />
                          </span>
                        )}
                        <span className="text-xs font-semibold text-pink-700 dark:text-pink-400">
                          {info.label}
                        </span>
                        <p className="text-xs text-stone-600 dark:text-stone-400 leading-relaxed">
                          {info.desc}
                        </p>
                        <div className="bg-white dark:bg-[#1a1816] p-2.5 rounded-lg border border-stone-200/70 dark:border-[#342f2b] text-[11px] font-medium text-stone-700 dark:text-stone-300 italic leading-snug mt-auto">
                          {info.sample}
                        </div>
                      </button>
                    );
                  })}
                </div>

                <button
                  type="button"
                  onClick={() => triggerSimulation('periodStarting', false)}
                  className="w-full h-11 bg-pink-600 hover:bg-pink-700 text-white font-semibold text-xs rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Volume2 size={15} />
                  <span>Preview Selected Reminder Tone</span>
                </button>
              </div>

              {/* Cycle Alert Toggles */}
              <div className="bg-white dark:bg-[#1a1816] p-6 rounded-2xl shadow-xs border border-stone-200/80 dark:border-[#2e2a26] space-y-4">
                <div className="space-y-1">
                  <h4 className="text-base font-serif font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
                    <Bell size={17} className="text-pink-600 dark:text-pink-400" />
                    Cycle &amp; Ovulation Alerts
                  </h4>
                  <p className="text-xs text-stone-600 dark:text-stone-400">
                    Choose which notifications you would like to receive.
                  </p>
                </div>

                <div className="space-y-2.5">
                  {[
                    { key: 'periodStarting' as const, label: 'Period Approaching', desc: 'Gentle heads up 2 days before your expected start' },
                    { key: 'periodStarted' as const, label: 'Period Day 1 Check-In', desc: 'A warm greeting on the expected start of your period' },
                    { key: 'fertileWindow' as const, label: 'Fertile Window Begins', desc: 'Notifies you when your estimated fertile window starts' },
                    { key: 'ovulation' as const, label: 'Peak Ovulation Day', desc: 'Notification on your estimated peak ovulation day' },
                    { key: 'periodEnding' as const, label: 'Period Ending & Transition', desc: 'Gentle check-in as your bleeding wraps up' },
                    { key: 'lutealPhase' as const, label: 'Luteal Phase & Self-Care', desc: 'Mindful reminders for rest and hydration before your next cycle' },
                  ].map((item) => (
                    <div key={item.key} className="flex items-center justify-between p-3.5 bg-[#faf8f6] dark:bg-[#23201d] rounded-xl border border-stone-200/80 dark:border-[#2e2a26]">
                      <div className="space-y-0.5 pr-3">
                        <p className="text-xs font-semibold text-stone-900 dark:text-stone-100">{item.label}</p>
                        <p className="text-[11px] text-stone-500 dark:text-stone-400">{item.desc}</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer shrink-0">
                        <input 
                          type="checkbox" 
                          className="sr-only peer"
                          checked={settings.types[item.key]}
                          onChange={(e) => updateTypes(item.key, e.target.checked)}
                        />
                        <div className="w-9 h-5 bg-stone-300 dark:bg-stone-600 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-pink-600"></div>
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Partner Notification Controls */}
              <div className="bg-white dark:bg-[#1a1816] p-6 rounded-2xl shadow-xs border border-stone-200/80 dark:border-[#2e2a26] space-y-5">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
                        <Heart className="w-4 h-4" />
                      </div>
                      <h4 className="text-base font-serif font-bold text-stone-900 dark:text-stone-100">
                        Partner Notification Preferences
                      </h4>
                    </div>
                    <p className="text-xs text-stone-600 dark:text-stone-400 leading-relaxed">
                      Select which cycle updates, fertile windows, and care nudges are shared with your partner.
                    </p>
                  </div>

                  <label className="relative inline-flex items-center cursor-pointer shrink-0">
                    <input 
                      type="checkbox" 
                      className="sr-only peer"
                      checked={Boolean(settings.partnerNotificationsEnabled)}
                      onChange={(e) => updateSettings({ partnerNotificationsEnabled: e.target.checked })}
                    />
                    <div className="w-11 h-6 bg-stone-300 dark:bg-stone-600 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                  </label>
                </div>

                {/* Partner status banner */}
                <div className="p-3.5 bg-[#faf8f6] dark:bg-[#23201d] rounded-xl border border-stone-200/80 dark:border-[#2e2a26] flex items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2 text-stone-700 dark:text-stone-300 font-medium">
                    <Users className="w-4 h-4 text-purple-600 dark:text-purple-400 shrink-0" />
                    <span>
                      {user.partnerName || user.isPartnerLinked ? (
                        <>Connected Partner: <strong className="font-semibold text-purple-700 dark:text-purple-300">{user.partnerName || 'Partner'}</strong></>
                      ) : (
                        <>No partner linked yet — preferences apply automatically once linked in Partner Mode.</>
                      )}
                    </span>
                  </div>
                  {(!user.partnerName && !user.isPartnerLinked) && (
                    <button
                      type="button"
                      onClick={() => setActiveSubTab('partner')}
                      className="text-xs font-semibold text-purple-700 dark:text-purple-400 hover:underline shrink-0 cursor-pointer"
                    >
                      Connect &rarr;
                    </button>
                  )}
                </div>

                {settings.partnerNotificationsEnabled ? (
                  <div className="space-y-4 animate-fadeIn">
                    <div className="space-y-2.5">
                      <span className="text-[11px] font-semibold tracking-wide text-purple-700 dark:text-purple-400 block">Cycle &amp; fertility alerts</span>
                      <div className="space-y-2">
                        {[
                          { key: 'periodStarting' as const, label: 'Period Approaching', desc: 'Gentle heads up 2 days before your period so your partner can offer care' },
                          { key: 'periodStarted' as const, label: 'Period Day 1 Check-In', desc: 'Notifies your partner when your period begins' },
                          { key: 'fertileWindow' as const, label: 'Fertile Window Begins', desc: 'Alerts your partner when your estimated fertile window starts' },
                          { key: 'ovulation' as const, label: 'Peak Ovulation Day', desc: 'Shared reminder on your estimated peak ovulation day' },
                          { key: 'periodEnding' as const, label: 'Period Ending', desc: 'Updates your partner as your bleeding concludes' },
                          { key: 'pregnancyRisk' as const, label: 'Luteal Phase & Wellness Nudges', desc: 'Supportive suggestions for rest, comfort, and hydration during the luteal phase' },
                        ].map((item) => (
                          <div key={item.key} className="flex items-center justify-between p-3.5 bg-[#faf8f6] dark:bg-[#23201d] rounded-xl border border-stone-200/80 dark:border-[#2e2a26]">
                            <div className="space-y-0.5 pr-3">
                              <p className="text-xs font-semibold text-stone-900 dark:text-stone-100">{item.label}</p>
                              <p className="text-[11px] text-stone-500 dark:text-stone-400 leading-snug">{item.desc}</p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer shrink-0">
                              <input 
                                type="checkbox" 
                                className="sr-only peer"
                                checked={Boolean(settings.partnerReceiveTypes?.[item.key] ?? true)}
                                onChange={(e) => updatePartnerReceiveTypes(item.key, e.target.checked)}
                              />
                              <div className="w-9 h-5 bg-stone-300 dark:bg-stone-600 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-purple-600"></div>
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2.5 pt-2">
                      <span className="text-[11px] font-semibold tracking-wide text-purple-700 dark:text-purple-400 block">Support &amp; mood updates</span>
                      <div className="space-y-2">
                        {[
                          { key: 'moodUpdates', label: 'Mood & Energy Updates', desc: 'Notify partner when you share a mood check-in or low energy state' },
                          { key: 'supportReminders', label: 'Comfort & Care Reminders', desc: 'Gentle ideas for your partner to bring warm tea, snacks, or rest' },
                          { key: 'educationalInsights', label: 'Cycle & Educational Tips', desc: 'Bite-sized cycle facts and empathy tips to help your partner understand your rhythm' }
                        ].map((item) => (
                          <div key={item.key} className="flex items-center justify-between p-3.5 bg-[#faf8f6] dark:bg-[#23201d] rounded-xl border border-stone-200/80 dark:border-[#2e2a26]">
                            <div className="space-y-0.5 pr-3">
                              <p className="text-xs font-semibold text-stone-900 dark:text-stone-100">{item.label}</p>
                              <p className="text-[11px] text-stone-500 dark:text-stone-400 leading-snug">{item.desc}</p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer shrink-0">
                              <input 
                                type="checkbox" 
                                className="sr-only peer"
                                checked={Boolean(user.partnerNotificationPreferences?.[item.key as keyof typeof user.partnerNotificationPreferences] ?? true)}
                                onChange={(e) => updatePartnerPref(item.key, e.target.checked)}
                              />
                              <div className="w-9 h-5 bg-stone-300 dark:bg-stone-600 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-purple-600"></div>
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>

                    {user.isPregnancyMode && (
                      <div className="space-y-3 pt-3 border-t border-stone-200/80 dark:border-[#2e2a26]">
                        <div className="flex items-center justify-between">
                          <div className="space-y-0.5">
                            <span className="text-xs font-semibold text-amber-700 dark:text-amber-400 flex items-center gap-1">
                              <Baby className="w-3.5 h-3.5" />
                              Pregnancy Companion Alerts
                            </span>
                            <p className="text-[11px] text-stone-500 dark:text-stone-400">Share gestational progress and doctor check-ins</p>
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input 
                              type="checkbox" 
                              className="sr-only peer"
                              checked={Boolean(settings.partnerPregnancyEnabled)}
                              onChange={(e) => updateSettings({ partnerPregnancyEnabled: e.target.checked })}
                            />
                            <div className="w-9 h-5 bg-stone-300 dark:bg-stone-600 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-600"></div>
                          </label>
                        </div>

                        {settings.partnerPregnancyEnabled && (
                          <div className="space-y-2 pl-2">
                            {[
                              { key: 'weeklyBabyDev' as const, label: 'Weekly Baby Growth & Milestones' },
                              { key: 'appointment' as const, label: 'Prenatal Doctor & Ultrasound Reminders' },
                              { key: 'rest' as const, label: 'Rest & Hydration Support Nudges' },
                              { key: 'dueDateCountdown' as const, label: 'Due Date Countdown & Trimester Updates' },
                              { key: 'laborNear' as const, label: 'Labor & Hospital Bag Readiness' },
                            ].map((pItem) => (
                              <div key={pItem.key} className="flex items-center justify-between p-3 bg-[#faf8f6] dark:bg-[#23201d] rounded-xl border border-stone-200/80 dark:border-[#2e2a26]">
                                <span className="text-xs font-medium text-stone-800 dark:text-stone-200">{pItem.label}</span>
                                <input 
                                  type="checkbox"
                                  checked={Boolean(settings.partnerPregnancyReceiveTypes?.[pItem.key] ?? true)}
                                  onChange={(e) => updatePartnerPregnancyReceiveTypes(pItem.key, e.target.checked)}
                                  className="w-4 h-4 rounded accent-amber-600 cursor-pointer"
                                />
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={() => triggerSimulation('periodStarting', true)}
                      className="w-full h-11 bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <HeartHandshake size={15} />
                      <span>Preview What Partner Sees</span>
                    </button>
                  </div>
                ) : (
                  <div className="p-4 bg-[#faf8f6] dark:bg-[#23201d] rounded-xl text-center space-y-1 border border-stone-200/80 dark:border-[#2e2a26]">
                    <p className="text-xs font-semibold text-stone-700 dark:text-stone-300">Partner notifications are paused</p>
                    <p className="text-[11px] text-stone-500 dark:text-stone-400">Turn on the switch above to choose which reminders your partner receives.</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

      /* ========================================================================= */
      /* 9. PARTNER MODE */
      /* ========================================================================= */
      ) : activeSubTab === 'partner' ? (
        <div className="space-y-6 animate-fadeIn">
          <PartnerMode user={user} reminders={reminders} setReminders={setReminders} setUser={setUser} partnerUser={partnerUser} onLogout={onLogout} />
        </div>

      /* ========================================================================= */
      /* 10. MUSIC & SANCTUARY */
      /* ========================================================================= */
      ) : activeSubTab === 'music_sanctuary' ? (
        <div className="space-y-6 animate-fadeIn">
          <section className="bg-white dark:bg-[#1a1816] p-6 md:p-8 rounded-2xl shadow-xs border border-stone-200/80 dark:border-[#2e2a26] space-y-6">
            <div className="space-y-1">
              <h3 className="text-xl font-serif font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
                <Music size={20} className="text-pink-600 dark:text-pink-400" />
                Music & Sanctuary
              </h3>
              <p className="text-xs text-stone-500 dark:text-stone-400 leading-relaxed">
                Immerse yourself in calming soundscapes designed to ease menstrual discomfort, calm the mind, and support restful sleep.
              </p>
            </div>

            <div className="space-y-5">
              {/* Playback Control HUD */}
              <div className="bg-[#faf8f6] dark:bg-[#23201d] p-5 sm:p-6 rounded-xl border border-stone-200/80 dark:border-[#342f2b] flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="space-y-1 text-center md:text-left">
                  <h4 className="text-xs font-bold text-stone-800 dark:text-stone-100">
                    Ambient Audio Player
                  </h4>
                  <p className="text-[11px] text-stone-500 dark:text-stone-400">
                    {isMusicPlaying ? 'Playing restorative soundscape' : 'Soundscape is currently paused'}
                  </p>
                </div>
                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={toggleMusicActive}
                    className={`py-2 px-4 rounded-xl text-xs font-semibold border cursor-pointer transition-colors ${
                      isMusicActive
                        ? 'bg-pink-600 text-white border-pink-600'
                        : 'bg-white dark:bg-[#1a1816] text-stone-700 dark:text-stone-200 border-stone-200/80 dark:border-[#342f2b] hover:bg-stone-50 dark:hover:bg-[#2b2724]'
                    }`}
                  >
                    {isMusicActive ? 'Sound Enabled' : 'Muted'}
                  </button>
                  <button
                    type="button"
                    onClick={toggleMusic}
                    className="py-2.5 px-5 bg-pink-600 hover:bg-pink-700 text-white font-semibold rounded-xl text-xs shadow-xs cursor-pointer transition-colors"
                  >
                    {isMusicPlaying ? 'Pause' : 'Play Ambient'}
                  </button>
                </div>
              </div>

              {/* Volume Slider */}
              <div className="bg-[#faf8f6] dark:bg-[#23201d] p-5 rounded-xl border border-stone-200/80 dark:border-[#342f2b] flex flex-col gap-2">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-semibold text-stone-800 dark:text-stone-200 flex items-center gap-1.5">
                    <Volume2 size={14} className="text-pink-600 dark:text-pink-400" /> Volume
                  </label>
                  <span className="text-xs font-bold text-pink-600 dark:text-pink-400 tabular-nums">{Math.round(volume * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={volume}
                  onChange={(e) => setVolume(parseFloat(e.target.value))}
                  className="w-full accent-pink-600 h-1.5 bg-stone-200 dark:bg-[#342f2b] rounded-lg cursor-pointer mt-1"
                />
              </div>

              {/* Meditation Sounds Selection */}
              <div className="bg-[#faf8f6] dark:bg-[#23201d] p-5 rounded-xl border border-stone-200/80 dark:border-[#342f2b] flex flex-col gap-3">
                <label className="text-xs font-semibold text-stone-800 dark:text-stone-200 flex items-center gap-1.5">
                  <SlidersHorizontal size={14} className="text-pink-600 dark:text-pink-400" /> Calming Frequencies
                </label>
                {musicNotice && (
                  <p role="status" className="text-xs font-medium text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-900/50 px-3 py-2 rounded-xl">
                    {musicNotice}
                  </p>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                  {[
                    { id: 'rain', label: 'Forest Rain' },
                    { id: 'bowls', label: 'Tibetan Singing Bowls' },
                    { id: 'solfeggio', label: 'Solfeggio 528Hz' },
                    { id: 'ocean', label: 'Soft Ocean Waves' },
                  ].map((sound) => (
                    <button
                      key={sound.id}
                      type="button"
                      onClick={() => setMusicNotice(`Activated ${sound.label}.`)}
                      className="p-3.5 rounded-xl border border-stone-200/80 dark:border-[#342f2b] bg-white dark:bg-[#1a1816] text-left font-semibold text-stone-700 dark:text-stone-200 hover:border-pink-300 dark:hover:border-pink-800 transition-colors flex items-center justify-between text-xs cursor-pointer"
                    >
                      <span>{sound.label}</span>
                      <span className="w-2 h-2 rounded-full bg-pink-500"></span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </section>
        </div>

      /* ========================================================================= */
      /* 11. INVITE FRIENDS */
      /* ========================================================================= */
      ) : activeSubTab === 'invite' ? (
        <div className="space-y-6 animate-fadeIn">
          <CommunityInvite user={user} />
        </div>

      /* ========================================================================= */
      /* 12. PREMIUM */
      /* ========================================================================= */
      ) : activeSubTab === 'premium' ? (
        <div className="space-y-6 animate-fadeIn">
          <div className="bg-white dark:bg-[#1a1816] p-6 md:p-8 rounded-2xl border border-stone-200/80 dark:border-[#2e2a26] shadow-xs space-y-6 max-w-2xl mx-auto text-center">
            <div className="w-12 h-12 rounded-2xl bg-pink-50 dark:bg-pink-950/40 border border-pink-100 dark:border-pink-900/40 text-pink-600 dark:text-pink-400 flex items-center justify-center mx-auto">
              <Crown size={24} />
            </div>
            <div className="space-y-1.5">
              <h3 className="text-2xl font-serif font-bold text-stone-900 dark:text-stone-100">Lumina Premium</h3>
              {user.isPremium ? (
                <div className="space-y-2 pt-1">
                  <span className="inline-block px-3 py-1 rounded-md bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-900/50 text-xs font-semibold">
                    Active Subscription {user.subscriptionPlan ? `(${user.subscriptionPlan})` : ''}
                  </span>
                  <p className="text-xs text-stone-600 dark:text-stone-400">
                    {user.subscriptionEnd
                      ? `Verified through ${new Date(user.subscriptionEnd).toLocaleDateString()}.`
                      : 'All Lumina Premium features are active on your account.'}
                  </p>
                </div>
              ) : (
                <p className="text-xs text-stone-600 dark:text-stone-400 max-w-md mx-auto leading-relaxed">
                  Upgrade with verified in-app billing (App Store / Google Play via RevenueCat or verified Paystack checkout) to unlock AI Doctor Reports, deep cycle trends, and full soundscapes.
                </p>
              )}
            </div>

            {billingError && (
              <div role="alert" className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200/80 dark:border-rose-900/50 text-xs text-rose-700 dark:text-rose-300 font-medium">
                {billingError}
              </div>
            )}
            {billingSuccess && (
              <div role="status" className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-900/50 text-xs text-emerald-800 dark:text-emerald-300 font-medium">
                {billingSuccess}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-left">
              {REVENUECAT_PLANS.map((plan) => (
                <button
                  key={plan.id}
                  type="button"
                  onClick={() => setSelectedPlanId(plan.id)}
                  className={`p-4 rounded-xl border transition-colors cursor-pointer ${
                    selectedPlanId === plan.id
                      ? 'border-pink-600 bg-pink-50/70 dark:bg-pink-950/30 dark:border-pink-500 shadow-xs'
                      : 'border-stone-200/80 dark:border-[#342f2b] bg-[#faf8f6] dark:bg-[#23201d] hover:border-pink-300 dark:hover:border-pink-800'
                  }`}
                >
                  <p className="text-xs font-bold text-stone-900 dark:text-stone-100">{plan.name}</p>
                  <p className="text-lg font-serif font-extrabold text-pink-600 dark:text-pink-400 mt-1 tabular-nums">{plan.priceFormatted}</p>
                  <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-0.5">{plan.description}</p>
                </button>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row gap-3 justify-center pt-1">
              <button
                type="button"
                onClick={async () => {
                  setBillingError(null);
                  setBillingSuccess(null);
                  setBillingProgress('Verifying subscription with billing provider...');
                  try {
                    const selected = REVENUECAT_PLANS.find((p) => p.id === selectedPlanId) || REVENUECAT_PLANS[0];
                    const res = await purchasePremiumPlan(selected, user, setUser);
                    if (res.success) {
                      setBillingSuccess(`${selected.name} is now active and verified.`);
                    } else {
                      setBillingError(res.error || 'Could not complete purchase verification.');
                    }
                  } finally {
                    setBillingProgress(null);
                  }
                }}
                disabled={Boolean(billingProgress)}
                className="px-6 py-3 bg-pink-600 hover:bg-pink-700 text-white rounded-xl text-xs font-semibold shadow-xs cursor-pointer disabled:opacity-50 transition-colors"
              >
                {billingProgress || 'Upgrade / Subscribe'}
              </button>
              <button
                type="button"
                onClick={async () => {
                  setBillingError(null);
                  setBillingSuccess(null);
                  const res = await restorePremiumPurchases(user, setUser);
                  if (res.success && res.restored) {
                    setBillingSuccess('Verified active subscription restored to your account.');
                  } else if (res.success && !res.restored) {
                    setBillingError('No active App Store, Google Play, or verified cloud subscription found.');
                  } else {
                    setBillingError(res.error || 'Restore check failed.');
                  }
                }}
                className="px-6 py-3 bg-white dark:bg-[#23201d] border border-stone-200/80 dark:border-[#342f2b] text-stone-700 dark:text-stone-200 rounded-xl text-xs font-semibold cursor-pointer hover:bg-stone-50 dark:hover:bg-[#2b2724] transition-colors"
              >
                Restore Purchases
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* ========================================================================= */}
      {/* MODALS */}
      {/* ========================================================================= */}

      {/* PRIVACY POLICY MODAL */}
      {showPrivacyModal && (
        <div className="fixed inset-0 bg-stone-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white dark:bg-[#1a1816] rounded-2xl p-6 max-w-lg w-full space-y-5 border border-stone-200/80 dark:border-[#2e2a26] shadow-2xl max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-stone-100 dark:border-[#2e2a26] pb-3.5">
              <div className="flex items-center gap-2 text-pink-600 dark:text-pink-400">
                <ShieldCheck size={20} />
                <h3 className="font-serif font-bold text-lg text-stone-900 dark:text-stone-100">Lumina Privacy Promise</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowPrivacyModal(false)}
                className="p-1.5 rounded-lg hover:bg-stone-100 dark:hover:bg-[#23201d] text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3 text-xs text-stone-600 dark:text-stone-300 leading-relaxed">
              <div className="bg-[#faf8f6] dark:bg-[#23201d] p-4 rounded-xl border border-stone-200/80 dark:border-[#342f2b]">
                <h4 className="font-bold text-stone-900 dark:text-stone-100 text-xs mb-1">1. We Never Sell Your Data</h4>
                <p>Your intimate health, menstrual flow, moods, and private notes are never sold, rented, or monetized for advertising. You are the sole owner of your health journey.</p>
              </div>

              <div className="bg-[#faf8f6] dark:bg-[#23201d] p-4 rounded-xl border border-stone-200/80 dark:border-[#342f2b]">
                <h4 className="font-bold text-stone-900 dark:text-stone-100 text-xs mb-1">2. Private & Encrypted</h4>
                <p>Your logs and account credentials are secure in transit and storage. You can enable biometric locks (Face ID / Fingerprint) or a 4-digit PIN for device security.</p>
              </div>

              <div className="bg-[#faf8f6] dark:bg-[#23201d] p-4 rounded-xl border border-stone-200/80 dark:border-[#342f2b]">
                <h4 className="font-bold text-stone-900 dark:text-stone-100 text-xs mb-1">3. Transparent Partner Sharing</h4>
                <p>Partner Mode is completely optional. You choose exactly which cycle highlights to share, and you can disconnect or block a partner at any moment.</p>
              </div>

              <div className="bg-[#faf8f6] dark:bg-[#23201d] p-4 rounded-xl border border-stone-200/80 dark:border-[#342f2b]">
                <h4 className="font-bold text-stone-900 dark:text-stone-100 text-xs mb-1">4. You Own Your Data</h4>
                <p>Download a complete private copy of your data or delete your account anytime with a single tap in Settings.</p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowPrivacyModal(false)}
              className="w-full py-3 bg-pink-600 hover:bg-pink-700 text-white font-semibold text-xs rounded-xl shadow-xs cursor-pointer transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* TERMS OF SERVICE MODAL */}
      {showTermsModal && (
        <div className="fixed inset-0 bg-stone-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white dark:bg-[#1a1816] rounded-2xl p-6 max-w-lg w-full space-y-5 border border-stone-200/80 dark:border-[#2e2a26] shadow-2xl max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-stone-100 dark:border-[#2e2a26] pb-3.5">
              <div className="flex items-center gap-2 text-pink-600 dark:text-pink-400">
                <FileText size={20} />
                <h3 className="font-serif font-bold text-lg text-stone-900 dark:text-stone-100">Terms of Service</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowTermsModal(false)}
                className="p-1.5 rounded-lg hover:bg-stone-100 dark:hover:bg-[#23201d] text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3 text-xs text-stone-600 dark:text-stone-300 leading-relaxed">
              <div className="bg-[#faf8f6] dark:bg-[#23201d] p-4 rounded-xl border border-stone-200/80 dark:border-[#342f2b]">
                <h4 className="font-bold text-stone-900 dark:text-stone-100 text-xs mb-1">Wellness & Educational Support</h4>
                <p>Lumina provides cycle calculations and supportive wellness insights. These calculations are estimated tools and do not substitute for professional medical advice, clinical diagnosis, or contraception.</p>
              </div>

              <div className="bg-[#faf8f6] dark:bg-[#23201d] p-4 rounded-xl border border-stone-200/80 dark:border-[#342f2b]">
                <h4 className="font-bold text-stone-900 dark:text-stone-100 text-xs mb-1">Account Responsibility</h4>
                <p>You are responsible for keeping your login credentials and security PIN secure. Lumina provides tools like biometric locks to help safeguard access on your personal device.</p>
              </div>

              <div className="bg-[#faf8f6] dark:bg-[#23201d] p-4 rounded-xl border border-stone-200/80 dark:border-[#342f2b]">
                <h4 className="font-bold text-stone-900 dark:text-stone-100 text-xs mb-1">Respectful Companion Sharing</h4>
                <p>When using Partner Mode, both partners agree to respect mutual privacy boundaries and communication preferences.</p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowTermsModal(false)}
              className="w-full py-3 bg-pink-600 hover:bg-pink-700 text-white font-semibold text-xs rounded-xl shadow-xs cursor-pointer transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* FEEDBACK & SUPPORT MODAL */}
      {showFeedbackModal && (
        <div className="fixed inset-0 bg-stone-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white dark:bg-[#1a1816] rounded-2xl p-6 max-w-md w-full space-y-5 border border-stone-200/80 dark:border-[#2e2a26] shadow-2xl">
            <div className="flex items-center justify-between border-b border-stone-100 dark:border-[#2e2a26] pb-3.5">
              <div className="flex items-center gap-2 text-pink-600 dark:text-pink-400">
                {showFeedbackModal === 'support' ? <MessageCircle size={19} /> :
                 showFeedbackModal === 'bug' ? <Bug size={19} /> : <Lightbulb size={19} />}
                <h3 className="font-serif font-bold text-lg text-stone-900 dark:text-stone-100">
                  {showFeedbackModal === 'support' ? 'Contact Support' :
                   showFeedbackModal === 'bug' ? 'Report an Issue' : 'Suggest a Feature'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowFeedbackModal(null)}
                className="p-1.5 rounded-lg hover:bg-stone-100 dark:hover:bg-[#23201d] text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {feedbackSubmitted ? (
              <div className="py-8 text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-pink-50 dark:bg-pink-950/40 border border-pink-100 dark:border-pink-900/40 text-pink-600 dark:text-pink-400 flex items-center justify-center mx-auto">
                  <Flower2 size={24} />
                </div>
                <h4 className="text-sm font-bold text-stone-900 dark:text-stone-100">Thank you for reaching out</h4>
                <p className="text-xs text-stone-600 dark:text-stone-400 max-w-xs mx-auto">
                  Our care team has received your message and will review it carefully.
                </p>
                {feedbackTicketId && (
                  <p className="inline-block px-3 py-1 rounded-md bg-pink-50 dark:bg-pink-950/40 border border-pink-200/80 dark:border-pink-900/40 text-[11px] font-mono font-bold text-pink-700 dark:text-pink-300 tabular-nums">
                    Reference: {feedbackTicketId}
                  </p>
                )}
              </div>
            ) : (
              <form onSubmit={handleFeedbackSubmit} className="space-y-4">
                {/* Honeypot anti-spam trap */}
                <div className="sr-only" aria-hidden="true">
                  <label htmlFor="support-website-hp">Website</label>
                  <input
                    id="support-website-hp"
                    type="text"
                    name="website"
                    tabIndex={-1}
                    autoComplete="off"
                    value={feedbackHoneypot}
                    onChange={(e) => setFeedbackHoneypot(e.target.value)}
                  />
                </div>

                {feedbackError && (
                  <div role="alert" className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200/80 dark:border-rose-900/50 text-xs font-semibold text-rose-700 dark:text-rose-300">
                    {feedbackError}
                  </div>
                )}

                <div className="space-y-1.5">
                  <label htmlFor="support-feedback-email" className="text-xs font-semibold text-stone-700 dark:text-stone-300">Your Email</label>
                  <input
                    id="support-feedback-email"
                    type="email"
                    value={feedbackEmail}
                    onChange={(e) => setFeedbackEmail(e.target.value)}
                    required
                    className="w-full h-11 bg-[#faf8f6] dark:bg-[#23201d] border border-stone-200/80 dark:border-[#342f2b] rounded-xl px-4 text-xs text-stone-900 dark:text-stone-100 outline-none focus:border-pink-400"
                    placeholder="you@example.com"
                  />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="support-feedback-message" className="text-xs font-semibold text-stone-700 dark:text-stone-300">
                    {showFeedbackModal === 'support' ? 'How can we help you?' :
                     showFeedbackModal === 'bug' ? 'Describe what happened:' : 'What feature would you love to see?'}
                  </label>
                  <textarea
                    id="support-feedback-message"
                    rows={4}
                    value={feedbackText}
                    onChange={(e) => setFeedbackText(e.target.value)}
                    required
                    minLength={10}
                    maxLength={2000}
                    className="w-full bg-[#faf8f6] dark:bg-[#23201d] border border-stone-200/80 dark:border-[#342f2b] rounded-xl p-4 text-xs text-stone-900 dark:text-stone-100 outline-none focus:border-pink-400 resize-none"
                    placeholder={
                      showFeedbackModal === 'support' ? 'Write your question or request here (min 10 chars)...' :
                      showFeedbackModal === 'bug' ? 'Tell us what went wrong and where...' : 'Share your idea with us...'
                    }
                  />
                </div>

                <div className="flex gap-3 pt-1">
                  <button
                    type="button"
                    onClick={() => { setShowFeedbackModal(null); setFeedbackError(null); }}
                    className="flex-1 py-3 bg-stone-100 dark:bg-[#23201d] hover:bg-stone-200 dark:hover:bg-[#2b2724] text-stone-700 dark:text-stone-200 font-semibold text-xs rounded-xl transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={feedbackLoading}
                    className="flex-1 py-3 bg-pink-600 hover:bg-pink-700 text-white font-semibold text-xs rounded-xl shadow-xs disabled:opacity-60 transition-colors cursor-pointer"
                  >
                    {feedbackLoading ? 'Sending...' : 'Send Message'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* REAUTHENTICATED DELETE ACCOUNT MODAL */}
      <DeleteAccountModal
        isOpen={showDeleteAccountModal}
        user={user}
        onClose={() => setShowDeleteAccountModal(false)}
        onDeleted={() => {
          if (onLogout) onLogout();
          else setUser(null);
        }}
        onOpenExternalPage={onOpenExternalDeletionPage}
      />

      {/* BLOCK PARTNER MODAL */}
      {partnerToBlock && (
        <div className="fixed inset-0 bg-stone-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white dark:bg-[#1a1816] rounded-2xl p-6 max-w-sm w-full space-y-4 border border-stone-200/80 dark:border-[#2e2a26] shadow-2xl">
            <h3 className="font-serif font-bold text-lg text-stone-900 dark:text-stone-100">Block {partnerToBlock.name}?</h3>
            <p className="text-xs text-stone-600 dark:text-stone-400 leading-relaxed">
              Blocking this partner will disconnect sharing and prevent them from sending you new connection requests.
            </p>
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setPartnerToBlock(null)}
                className="flex-1 py-3 bg-stone-100 dark:bg-[#23201d] hover:bg-stone-200 dark:hover:bg-[#2b2724] text-stone-700 dark:text-stone-200 font-semibold text-xs rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleBlockPartnerConfirm}
                className="flex-1 py-3 bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs rounded-xl transition-colors cursor-pointer shadow-xs"
              >
                Block Partner
              </button>
            </div>
          </div>
        </div>
      )}

      {/* UNBLOCK PARTNER MODAL */}
      {partnerToUnblock && (
        <div className="fixed inset-0 bg-stone-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white dark:bg-[#1a1816] rounded-2xl p-6 max-w-sm w-full space-y-4 border border-stone-200/80 dark:border-[#2e2a26] shadow-2xl">
            <h3 className="font-serif font-bold text-lg text-stone-900 dark:text-stone-100">Unblock {partnerToUnblock.name}?</h3>
            <p className="text-xs text-stone-600 dark:text-stone-400 leading-relaxed">
              Unblocking {partnerToUnblock.name} will allow them to send you partner connection requests again.
            </p>
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setPartnerToUnblock(null)}
                className="flex-1 py-3 bg-stone-100 dark:bg-[#23201d] hover:bg-stone-200 dark:hover:bg-[#2b2724] text-stone-700 dark:text-stone-200 font-semibold text-xs rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleUnblockPartnerConfirm}
                className="flex-1 py-3 bg-pink-600 hover:bg-pink-700 text-white font-semibold text-xs rounded-xl transition-colors cursor-pointer shadow-xs"
              >
                Unblock Partner
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;
