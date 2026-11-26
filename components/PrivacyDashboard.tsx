import React, { useEffect, useState } from 'react';
import {
  ShieldCheck,
  Lock,
  Eye,
  Smartphone,
  Download,
  Trash2,
  FileText,
  KeyRound,
  AlertTriangle,
  CheckCircle2,
  MailCheck,
  RefreshCw,
  LogOut,
  Cookie,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  Activity,
} from 'lucide-react';
import { PrivacyPreferences, User } from '../types';
import { auth } from '../services/firebase';
import { sendEmailVerification } from 'firebase/auth';
import { encryptWithPassphrase, decryptWithPassphrase, secureStorage } from '../services/secureStorage';
import {
  appendSecurityEventToUser,
  buildOtpAuthUri,
  generateRecoveryCodes,
  generateTotpSecret,
  getCurrentDeviceDescriptor,
  getDefaultSecuritySettings,
  getOrCreateDeviceSessionId,
  sanitizeTextInput,
  setLocalSessionEpoch,
  verifyTotpCode,
} from '../services/securityService';
import { buildPortableBackupExport } from '../services/backupService';
import { CookieConsentState, getCookieConsent, setCookieConsent } from '../services/analyticsService';
import { QrCodeCanvas } from './QrCodeCanvas';

interface PrivacyDashboardProps {
  user: User;
  onUpdateUser: (updated: User) => void;
  onLogoutAllDevices: () => void;
  onRequestDeleteAccount: () => void;
  onNavigateToBackup?: () => void;
  embedded?: boolean;
}

const DEFAULT_PRIVACY_PREFS: PrivacyPreferences = {
  shareAnonymousDiagnostics: false,
  allowPartnerActivityAlerts: true,
  allowAiPersonalization: false,
  autoLockOnBlur: false,
  autoLockTimeoutMinutes: 5,
  hideNotificationPreviews: true,
  dataRetentionDays: 365,
};

export const PrivacyDashboard: React.FC<PrivacyDashboardProps> = ({
  user,
  onUpdateUser,
  onLogoutAllDevices,
  onRequestDeleteAccount,
  onNavigateToBackup,
  embedded = false,
}) => {
  const [section, setSection] = useState<'overview' | 'permissions' | 'protection' | 'sessions' | 'data'>('overview');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  // Cookie consent state
  const [cookieConsent, setLocalCookieConsent] = useState<CookieConsentState>(() => getCookieConsent());

  // Privacy Policy accordion
  const [showPolicy, setShowPolicy] = useState(false);

  // Email verification state
  const [sendingVerify, setSendingVerify] = useState(false);

  // 2FA setup wizard state
  const [setup2faStep, setSetup2faStep] = useState<'idle' | 'qr' | 'recovery'>('idle');
  const [draftTotpSecret, setDraftTotpSecret] = useState('');
  const [totpCodeInput, setTotpCodeInput] = useState('');
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [copiedSecret, setCopiedSecret] = useState(false);
  const [copiedRecovery, setCopiedRecovery] = useState(false);

  // Data download state
  const [exportPassphrase, setExportPassphrase] = useState('');
  const [exporting, setExporting] = useState(false);

  // Verified Delete confirmation
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');

  const security = getDefaultSecuritySettings(user.securitySettings);
  const privacyPrefs: PrivacyPreferences = {
    ...DEFAULT_PRIVACY_PREFS,
    ...(user.privacyPreferences || {}),
  };
  const currentSessionId = getOrCreateDeviceSessionId();
  const deviceDesc = getCurrentDeviceDescriptor();

  const isFirebaseEmailVerified = Boolean(
    auth.currentUser?.emailVerified || security.emailVerified
  );

  useEffect(() => {
    const syncConsent = () => setLocalCookieConsent(getCookieConsent());
    window.addEventListener('lumina:consent-changed', syncConsent);
    return () => window.removeEventListener('lumina:consent-changed', syncConsent);
  }, []);

  const notify = (type: 'success' | 'error' | 'info', message: string) => {
    setFeedback({ type, message });
    setTimeout(() => {
      setFeedback((prev) => (prev?.message === message ? null : prev));
    }, 5500);
  };

  const updatePrivacyPrefs = (patch: Partial<PrivacyPreferences>, label: string) => {
    const nextPrefs: PrivacyPreferences = {
      ...privacyPrefs,
      ...patch,
      consentUpdatedAt: new Date().toISOString(),
    };
    const nextUser = appendSecurityEventToUser(
      { ...user, privacyPreferences: nextPrefs },
      'Privacy Setting Updated',
      `${label} preference was updated from your Privacy Dashboard.`,
      '🔒'
    );
    onUpdateUser(nextUser);
    notify('success', `${label} saved.`);
  };

  const toggleSharingSetting = (key: keyof User['sharingSettings'], label: string) => {
    const nextSharing = {
      ...user.sharingSettings,
      [key]: !user.sharingSettings?.[key],
    };
    const nextUser = appendSecurityEventToUser(
      { ...user, sharingSettings: nextSharing },
      'Partner Sharing Permission Updated',
      `Partner access for "${label}" was turned ${nextSharing[key] ? 'on' : 'off'}.`,
      '🤝'
    );
    onUpdateUser(nextUser);
    notify('success', `Partner permission for "${label}" updated.`);
  };

  const handleSendVerificationEmail = async () => {
    setSendingVerify(true);
    try {
      if (auth.currentUser) {
        await auth.currentUser.reload();
        if (auth.currentUser.emailVerified) {
          const updated = appendSecurityEventToUser(
            {
              ...user,
              securitySettings: { ...security, emailVerified: true },
            },
            'Email Address Verified',
            `Your email (${user.email}) is confirmed verified on this account.`,
            '✅'
          );
          onUpdateUser(updated);
          notify('success', 'Your email address is already verified!');
          setSendingVerify(false);
          return;
        }
        await sendEmailVerification(auth.currentUser);
        notify('success', `Verification email dispatched to ${user.email}. Check your inbox or spam folder.`);
      } else {
        notify('info', 'Verification emails are dispatched for cloud-authenticated accounts. Sign in with Firebase cloud auth to verify your inbox.');
      }
    } catch (err: any) {
      notify('error', err?.message || 'Unable to send verification email right now. Try again shortly.');
    } finally {
      setSendingVerify(false);
    }
  };

  const handleStart2faSetup = () => {
    const secret = generateTotpSecret(32);
    setDraftTotpSecret(secret);
    setTotpCodeInput('');
    setSetup2faStep('qr');
  };

  const handleConfirm2faSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = totpCodeInput.replace(/\s+/g, '');
    if (!/^\d{6}$/.test(cleaned)) {
      notify('error', 'Enter the 6-digit code displayed in your authenticator app.');
      return;
    }
    const isValid = await verifyTotpCode(draftTotpSecret, cleaned);
    if (!isValid) {
      notify('error', 'That 6-digit code did not match. Ensure your device clock is accurate and try again.');
      return;
    }

    const { plainCodes, hashes } = await generateRecoveryCodes(8);
    const encSecretObj = await encryptWithPassphrase(
      draftTotpSecret,
      `${user.id}::${user.email.toLowerCase().trim()}`
    );
    await secureStorage.setItem(`totp_secret_${user.id}`, draftTotpSecret);

    const updatedUser = appendSecurityEventToUser(
      {
        ...user,
        securitySettings: {
          ...security,
          twoFactorEnabled: true,
          twoFactorSecretEnc: JSON.stringify(encSecretObj),
          twoFactorRecoveryHashes: hashes,
        },
      },
      'Two-Factor Authentication Enabled',
      'Authenticator 2FA protection has been activated on your Lumina account.',
      '🔐'
    );
    onUpdateUser(updatedUser);
    setRecoveryCodes(plainCodes);
    setSetup2faStep('recovery');
    notify('success', 'Two-factor authentication is now active. Save your recovery codes securely.');
  };

  const handleDisable2fa = () => {
    const updatedUser = appendSecurityEventToUser(
      {
        ...user,
        securitySettings: {
          ...security,
          twoFactorEnabled: false,
          twoFactorSecretEnc: undefined,
          twoFactorRecoveryHashes: [],
        },
      },
      'Two-Factor Authentication Disabled',
      'Authenticator 2FA protection was turned off from Privacy & Security.',
      '⚠️'
    );
    secureStorage.removeItem(`totp_secret_${user.id}`);
    onUpdateUser(updatedUser);
    setSetup2faStep('idle');
    notify('info', 'Two-factor authentication has been turned off.');
  };

  const handleRevokeSession = (sessionId: string) => {
    const remaining = security.activeSessions.filter((s) => s.sessionId !== sessionId);
    const updatedUser = appendSecurityEventToUser(
      {
        ...user,
        securitySettings: {
          ...security,
          activeSessions: remaining,
        },
      },
      'Device Session Removed',
      `Session ${sessionId.slice(0, 10)}... was revoked from Active Devices.`,
      '📱'
    );
    onUpdateUser(updatedUser);
    notify('success', 'Device session revoked.');
  };

  const handleLogoutAllDevicesClick = () => {
    const nextEpoch = (security.sessionEpoch || 1) + 1;
    setLocalSessionEpoch(user.id, nextEpoch);
    const updatedUser = appendSecurityEventToUser(
      {
        ...user,
        securitySettings: {
          ...security,
          sessionEpoch: nextEpoch,
          activeSessions: [],
        },
      },
      'Logged Out of All Devices',
      'All active sessions were invalidated. Re-authentication is required across your devices.',
      '🚪'
    );
    onUpdateUser(updatedUser);
    onLogoutAllDevices();
  };

  const handleExportPersonalData = async (encrypted: boolean) => {
    if (encrypted && exportPassphrase.trim().length < 6) {
      notify('error', 'Choose a backup passphrase of at least 6 characters for encrypted downloads.');
      return;
    }
    setExporting(true);
    try {
      const result = await buildPortableBackupExport(
        user,
        {
          symptoms: user.symptoms || [],
          diaryEntries: user.diaryEntries || [],
          bcLogs: user.bcLogs || [],
          tempLogs: user.tempLogs || [],
        },
        encrypted ? exportPassphrase.trim() : undefined
      );
      const blob = new Blob([result.content], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = result.filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      const updated = appendSecurityEventToUser(
        {
          ...user,
          backupMetadata: {
            autoBackupEnabled: user.backupMetadata?.autoBackupEnabled ?? true,
            lastAutoBackupAt: user.backupMetadata?.lastAutoBackupAt,
            lastManualExportAt: new Date().toISOString(),
            lastChecksum: result.checksum,
            snapshotCount: user.backupMetadata?.snapshotCount,
          },
        },
        'Personal Data Downloaded',
        `Downloaded ${result.encrypted ? 'AES-256 encrypted' : 'checksum-verified'} data archive (${result.filename}).`,
        '📦'
      );
      onUpdateUser(updated);
      notify('success', `Downloaded ${result.filename} (SHA-256 verified).`);
      if (encrypted) setExportPassphrase('');
    } catch {
      notify('error', 'Unable to prepare your personal data download.');
    } finally {
      setExporting(false);
    }
  };

  const handleToggleCookieCategory = (category: 'analytics' | 'performance' | 'personalization') => {
    const updated = setCookieConsent({
      [category]: !cookieConsent[category],
      decided: true,
    });
    setLocalCookieConsent(updated);
    notify('success', 'Cookie & tracking consent updated immediately.');
  };

  const verifyRevealSaved2faSecret = async (): Promise<string | null> => {
    if (!security.twoFactorSecretEnc) return null;
    try {
      const parsed = JSON.parse(security.twoFactorSecretEnc);
      return await decryptWithPassphrase(parsed, `${user.id}::${user.email.toLowerCase().trim()}`);
    } catch {
      return await secureStorage.getItem(`totp_secret_${user.id}`);
    }
  };

  const otpAuthUri = draftTotpSecret ? buildOtpAuthUri(user.email || user.name, draftTotpSecret) : '';

  const collectedCategories = [
    {
      title: 'Cycle & Reproductive Health',
      items: `${user.periods?.length || 0} recorded cycles, ${user.periodDates?.length || 0} bleeding dates, phase & fertility estimates`,
      purpose: 'Used solely to compute cycle phase progress, predictions, and optional calendar charts.',
    },
    {
      title: 'Symptoms, Mood & Personal Diary',
      items: `${user.symptoms?.length || 0} symptom logs, ${user.moodLogs?.length || 0} moods, ${user.diaryEntries?.length || 0} PIN-protected journal entries`,
      purpose: 'Stored for your wellness insights and companion reflections. Never sold or shared with advertisers.',
    },
    {
      title: 'Account & Device Security',
      items: `Email (${user.email}), session tokens, ${security.loginHistory.length} security events`,
      purpose: 'Protects your account via 2FA verification, lockout prevention, and unfamiliar device notifications.',
    },
    {
      title: 'Partner Circle & Sharing',
      items: user.isPartnerLinked ? `Connected with ${user.partnerName || 'Partner'}` : 'Not currently linked to a partner',
      purpose: 'Shares only the exact switches you enable under Partner Sharing Permissions.',
    },
  ];

  const subTabs = [
    { id: 'overview' as const, label: 'Data & Policy', icon: Eye },
    { id: 'permissions' as const, label: 'Permissions & Cookies', icon: Cookie },
    { id: 'protection' as const, label: 'Account & 2FA', icon: ShieldCheck },
    { id: 'sessions' as const, label: 'Devices & Activity', icon: Smartphone },
    { id: 'data' as const, label: 'Download & Delete', icon: Download },
  ];

  return (
    <section
      aria-label="Privacy and Security Dashboard"
      className={embedded ? 'space-y-6' : 'max-w-4xl mx-auto pb-16 space-y-6'}
    >
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-pink-50 via-white to-purple-50 border border-pink-100 rounded-3xl p-6 sm:p-7 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-2xl bg-pink-100 text-pink-700">
              <ShieldCheck size={20} aria-hidden="true" />
            </span>
            <h2 className="text-2xl font-serif font-bold text-stone-900">
              Privacy &amp; Security Vault
            </h2>
          </div>
          <p className="text-sm text-stone-600">
            See what personal data Lumina stores, control consent and partner sharing, and protect your account.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <span
            className={`px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 ${
              security.twoFactorEnabled
                ? 'bg-emerald-100 text-emerald-800'
                : 'bg-amber-100 text-amber-900'
            }`}
          >
            <KeyRound size={13} aria-hidden="true" />
            {security.twoFactorEnabled ? '2FA Protected' : '2FA Off'}
          </span>
          <span
            className={`px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 ${
              isFirebaseEmailVerified
                ? 'bg-emerald-100 text-emerald-800'
                : 'bg-stone-100 text-stone-700'
            }`}
          >
            <MailCheck size={13} aria-hidden="true" />
            {isFirebaseEmailVerified ? 'Email Verified' : 'Email Unverified'}
          </span>
        </div>
      </div>

      {/* Inline Notification Banner */}
      {feedback && (
        <div
          role="status"
          className={`p-4 rounded-2xl border text-xs font-semibold flex items-center justify-between gap-3 ${
            feedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : feedback.type === 'error'
              ? 'bg-rose-50 border-rose-200 text-rose-900'
              : 'bg-purple-50 border-purple-200 text-purple-900'
          }`}
        >
          <span>{feedback.message}</span>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="text-xs underline font-bold cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex flex-wrap gap-2 bg-white p-2 rounded-2xl border border-pink-100 shadow-xs" role="tablist">
        {subTabs.map((tab) => {
          const Icon = tab.icon;
          const active = section === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setSection(tab.id)}
              className={`flex-1 min-w-[130px] py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                active
                  ? 'bg-gradient-to-r from-pink-500 to-rose-500 text-white shadow-sm'
                  : 'text-stone-700 hover:bg-pink-50'
              }`}
            >
              <Icon size={14} aria-hidden="true" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: DATA OVERVIEW & POLICY */}
      {section === 'overview' && (
        <div className="space-y-5">
          <div className="bg-white border border-pink-100 rounded-3xl p-6 space-y-4">
            <h3 className="text-lg font-serif font-bold text-stone-900">
              Information Lumina Collects &amp; How It Is Used
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {collectedCategories.map((cat) => (
                <div
                  key={cat.title}
                  className="p-4 rounded-2xl bg-pink-50/35 border border-pink-100 space-y-1.5"
                >
                  <p className="text-sm font-bold text-stone-900">{cat.title}</p>
                  <p className="text-xs font-semibold text-pink-800">{cat.items}</p>
                  <p className="text-xs text-stone-600 leading-relaxed">{cat.purpose}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white border border-pink-100 rounded-3xl p-6 space-y-3">
            <button
              type="button"
              onClick={() => setShowPolicy(!showPolicy)}
              aria-expanded={showPolicy}
              className="w-full flex items-center justify-between text-left cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <FileText size={18} className="text-pink-600" aria-hidden="true" />
                <div>
                  <h3 className="text-base font-serif font-bold text-stone-900">
                    Lumina Privacy Policy &amp; Confidentiality Pledge
                  </h3>
                  <p className="text-xs text-stone-600">
                    Clear commitments on encryption, third-party limits, and deletion rights.
                  </p>
                </div>
              </div>
              {showPolicy ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            </button>

            {showPolicy && (
              <div className="pt-3 border-t border-pink-100 text-xs text-stone-700 space-y-2.5 leading-relaxed">
                <p>
                  <strong>1. Data Controller &amp; DPO (NDPA 2023 / GDPR):</strong> Lumina: Bloom &amp; Balance acts as Data Controller for your wellness sanctuary. Contact our Data Protection Officer at{' '}
                  <a href="mailto:privacy@luminabloom.app" className="text-pink-700 font-bold underline">privacy@luminabloom.app</a>{' '}
                  for access, rectification, portability, restriction, objection, or erasure inquiries.
                </p>
                <p>
                  <strong>2. Zero Health-Data Selling &amp; Explicit Consent:</strong> Sensitive reproductive health data (menstrual dates, symptoms, pregnancy logs, mood, and diary text) is processed strictly on your explicit consent and is never sold, rented, or brokered for advertising.
                </p>
                <p>
                  <strong>3. Encryption &amp; Owner-Only Isolation:</strong> Local snapshots, PIN verifiers, and 2FA secrets are encrypted/salted with Web Crypto (AES-256-GCM / PBKDF2-SHA256). Firestore security rules keep diary entries and doctor reports strictly owner-only — never shared in Partner Mode.
                </p>
                <p>
                  <strong>4. Sub-Processors &amp; Cross-Border Safeguards:</strong> Lumina relies on vetted infrastructure sub-processors: <strong>Google Cloud / Firebase</strong> (authentication &amp; encrypted database storage), <strong>Google Gemini API</strong> (optional de-identified AI companion wellness replies without direct identifiers), <strong>Paystack</strong> &amp; <strong>RevenueCat</strong> (subscription billing verification). Cross-border transfers use TLS 1.3 encryption in transit and standard contractual data protection safeguards.
                </p>
                <p>
                  <strong>5. Automated Cycle &amp; AI Profiling Notice:</strong> Cycle phase and ovulation predictions are statistical estimates derived from your logged dates. Personalized AI Wellness Companion prompts are strictly opt-in and never make binding medical or legal decisions.
                </p>
                <p>
                  <strong>6. Concrete Retention &amp; 72-Hour Breach Notification:</strong> Active cycle and diary data is retained while your account remains active (default telemetry window: {privacyPrefs.dataRetentionDays || 365} days) and erased permanently upon verified account deletion, excluding minimal hashed billing/audit logs legally retained under statutory financial tax rules (up to 6 years). Any confirmed personal-data breach affecting user rights will be reported to relevant supervisory authorities within 72 hours and communicated promptly to affected members.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: PERMISSIONS & COOKIE CONSENT */}
      {section === 'permissions' && (
        <div className="space-y-5">
          <div className="bg-white border border-pink-100 rounded-3xl p-6 space-y-4">
            <h3 className="text-lg font-serif font-bold text-stone-900">
              Privacy &amp; App Behavior Controls
            </h3>

            {[
              {
                key: 'hideNotificationPreviews' as const,
                label: 'Hide Sensitive Notification Previews',
                desc: 'Keep cycle, fertility, and diary details generalized on lock screens or notification drawers.',
              },
              {
                key: 'allowPartnerActivityAlerts' as const,
                label: 'Partner Security & Link Alerts',
                desc: 'Notify you immediately when partner permissions or connection requests change.',
              },
              {
                key: 'allowAiPersonalization' as const,
                label: 'Personalized Companion Suggestions',
                desc: 'Use logged cycle phase trends to tailor wellness affirmations inside your sanctuary.',
              },
              {
                key: 'autoLockOnBlur' as const,
                label: 'Strict Session Privacy Reminder',
                desc: 'Prompt re-verification when switching devices or returning after inactivity.',
              },
            ].map((item) => (
              <label
                key={item.key}
                className="flex items-start justify-between gap-4 p-4 rounded-2xl bg-stone-50/70 border border-stone-200 cursor-pointer hover:border-pink-200"
              >
                <div>
                  <span className="text-sm font-bold text-stone-900 block">{item.label}</span>
                  <span className="text-xs text-stone-600 block mt-0.5">{item.desc}</span>
                </div>
                <input
                  type="checkbox"
                  checked={Boolean(privacyPrefs[item.key])}
                  onChange={(e) =>
                    updatePrivacyPrefs({ [item.key]: e.target.checked }, item.label)
                  }
                  className="mt-1 h-4 w-4 accent-pink-600 rounded"
                />
              </label>
            ))}

            <div className="p-4 rounded-2xl bg-stone-50/70 border border-stone-200 flex items-center justify-between gap-4">
              <div>
                <span className="text-sm font-bold text-stone-900 block">Inactivity Auto-Lock Timer</span>
                <span className="text-xs text-stone-600 block mt-0.5">
                  Automatically lock Secret Diary and App Lock after periods of inactivity.
                </span>
              </div>
              <select
                aria-label="Inactivity Auto-Lock Timer"
                value={privacyPrefs.autoLockTimeoutMinutes ?? 5}
                onChange={(e) =>
                  updatePrivacyPrefs(
                    { autoLockTimeoutMinutes: Number(e.target.value) },
                    'Inactivity Auto-Lock Timer'
                  )
                }
                className="px-3 py-2 rounded-xl border border-stone-200 bg-white text-xs font-bold text-stone-800 outline-none"
              >
                <option value={1}>1 minute</option>
                <option value={3}>3 minutes</option>
                <option value={5}>5 minutes</option>
                <option value={15}>15 minutes</option>
                <option value={30}>30 minutes</option>
              </select>
            </div>
          </div>

          {/* Partner Data-Sharing Permissions */}
          <div className="bg-white border border-pink-100 rounded-3xl p-6 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-serif font-bold text-stone-900">
                  Partner Data-Sharing Permissions
                </h3>
                <p className="text-xs text-stone-600">
                  Control exactly what a linked partner may view inside Partner Mode.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  const paused = !user.isSharingPaused;
                  onUpdateUser(
                    appendSecurityEventToUser(
                      { ...user, isSharingPaused: paused },
                      paused ? 'Partner Sharing Paused' : 'Partner Sharing Resumed',
                      `All partner sharing was ${paused ? 'paused' : 'resumed'}.`,
                      '⏸️'
                    )
                  );
                  notify('info', paused ? 'All partner sharing paused.' : 'Partner sharing resumed.');
                }}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold cursor-pointer ${
                  user.isSharingPaused
                    ? 'bg-amber-100 text-amber-900'
                    : 'bg-pink-50 text-pink-800 hover:bg-pink-100'
                }`}
              >
                {user.isSharingPaused ? 'Resume Sharing' : 'Pause All Sharing'}
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { key: 'shareCycleInfo' as const, label: 'Cycle Day & Period Window' },
                { key: 'shareFertilityInfo' as const, label: 'Estimated Fertility Window' },
                { key: 'shareSymptoms' as const, label: 'Symptom Support Alerts' },
                { key: 'shareMood' as const, label: 'Mood Status Updates' },
                { key: 'shareAppointmentReminders' as const, label: 'Appointment Reminders' },
                { key: 'shareWellnessUpdates' as const, label: 'Hydration & Wellness Goals' },
              ].map((perm) => (
                <label
                  key={perm.key}
                  className="flex items-center justify-between p-3.5 rounded-2xl border border-stone-200 bg-white cursor-pointer"
                >
                  <span className="text-xs font-bold text-stone-800">{perm.label}</span>
                  <input
                    type="checkbox"
                    checked={Boolean(user.sharingSettings?.[perm.key])}
                    onChange={() => toggleSharingSetting(perm.key, perm.label)}
                    className="h-4 w-4 accent-pink-600 rounded"
                  />
                </label>
              ))}
            </div>
          </div>

          {/* Cookie & Tracking Consent */}
          <div className="bg-white border border-pink-100 rounded-3xl p-6 space-y-4">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h3 className="text-lg font-serif font-bold text-stone-900">
                  Cookie &amp; Analytics Consent
                </h3>
                <p className="text-xs text-stone-600">
                  {cookieConsent.decided
                    ? `Consent recorded on ${new Date(cookieConsent.updatedAt || Date.now()).toLocaleDateString()}.`
                    : 'Pending your choice — non-essential cookies are blocked until accepted.'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => window.dispatchEvent(new CustomEvent('lumina:open-cookie-settings'))}
                className="px-3 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-bold cursor-pointer"
              >
                Open Banner Modal
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { id: 'analytics' as const, label: 'Usage Analytics', value: cookieConsent.analytics },
                { id: 'performance' as const, label: 'Web Vitals & Crash Logs', value: cookieConsent.performance },
                { id: 'personalization' as const, label: 'Theme Personalization', value: cookieConsent.personalization },
              ].map((c) => (
                <label
                  key={c.id}
                  className="p-3.5 rounded-2xl border border-stone-200 flex items-center justify-between gap-2 cursor-pointer"
                >
                  <span className="text-xs font-bold text-stone-800">{c.label}</span>
                  <input
                    type="checkbox"
                    checked={c.value}
                    onChange={() => handleToggleCookieCategory(c.id)}
                    className="h-4 w-4 accent-pink-600 rounded"
                  />
                </label>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: ACCOUNT PROTECTION & 2FA */}
      {section === 'protection' && (
        <div className="space-y-5">
          {/* Email Verification Card */}
          <div className="bg-white border border-pink-100 rounded-3xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <MailCheck size={18} className="text-pink-600" aria-hidden="true" />
                <h3 className="text-base font-serif font-bold text-stone-900">
                  Email Verification
                </h3>
              </div>
              <p className="text-xs text-stone-600">
                Primary address: <strong className="text-stone-900">{user.email}</strong> —{' '}
                {isFirebaseEmailVerified ? 'Verified and trusted for recovery.' : 'Not yet confirmed via email link.'}
              </p>
            </div>
            <button
              type="button"
              disabled={sendingVerify}
              onClick={handleSendVerificationEmail}
              className="px-4 py-2.5 rounded-2xl bg-pink-600 hover:bg-pink-700 text-white text-xs font-bold shrink-0 cursor-pointer disabled:opacity-50"
            >
              {sendingVerify ? 'Sending...' : isFirebaseEmailVerified ? 'Check Status' : 'Verify Email'}
            </button>
          </div>

          {/* Two-Factor Authentication Card */}
          <div className="bg-white border border-pink-100 rounded-3xl p-6 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <KeyRound size={18} className="text-pink-600" aria-hidden="true" />
                  <h3 className="text-lg font-serif font-bold text-stone-900">
                    Two-Factor Authentication (Authenticator App)
                  </h3>
                </div>
                <p className="text-xs text-stone-600">
                  Require a time-based 6-digit verification code (TOTP) or single-use recovery code at login.
                </p>
              </div>
              {security.twoFactorEnabled && setup2faStep === 'idle' && (
                <button
                  type="button"
                  onClick={handleDisable2fa}
                  className="px-4 py-2 rounded-2xl bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 text-xs font-bold cursor-pointer shrink-0"
                >
                  Disable 2FA
                </button>
              )}
              {!security.twoFactorEnabled && setup2faStep === 'idle' && (
                <button
                  type="button"
                  onClick={handleStart2faSetup}
                  className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-pink-500 to-rose-500 text-white text-xs font-bold shadow-sm cursor-pointer shrink-0"
                >
                  Enable 2FA Protection
                </button>
              )}
            </div>

            {setup2faStep === 'qr' && (
              <form onSubmit={handleConfirm2faSetup} className="p-5 rounded-3xl bg-pink-50/40 border border-pink-200 space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                  <div className="bg-white p-4 rounded-2xl border border-pink-100 shadow-xs w-48 h-48 mx-auto flex items-center justify-center">
                    <QrCodeCanvas
                      value={otpAuthUri}
                      size={180}
                      alt="Two-factor authentication setup QR code"
                    />
                  </div>
                  <div className="space-y-3">
                    <p className="text-xs font-bold text-stone-900">
                      1. Scan this QR code in Google Authenticator, 1Password, or Apple Passwords.
                    </p>
                    <div className="p-3 rounded-xl bg-white border border-pink-100 flex items-center justify-between gap-2">
                      <code className="text-[11px] font-mono text-pink-800 break-all">
                        {draftTotpSecret}
                      </code>
                      <button
                        type="button"
                        aria-label="Copy authenticator secret"
                        onClick={() => {
                          navigator.clipboard?.writeText(draftTotpSecret);
                          setCopiedSecret(true);
                          setTimeout(() => setCopiedSecret(false), 2000);
                        }}
                        className="p-1.5 rounded-lg bg-pink-50 text-pink-700 hover:bg-pink-100 cursor-pointer shrink-0"
                      >
                        {copiedSecret ? <Check size={14} /> : <Copy size={14} />}
                      </button>
                    </div>
                    <p className="text-xs font-bold text-stone-900">
                      2. Enter the 6-digit code shown in your app to activate 2FA:
                    </p>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        inputMode="numeric"
                        maxLength={6}
                        value={totpCodeInput}
                        onChange={(e) => setTotpCodeInput(e.target.value.replace(/\D/g, ''))}
                        placeholder="123456"
                        aria-label="6-digit authenticator verification code"
                        className="flex-1 px-4 py-2.5 rounded-xl bg-white border border-pink-200 text-sm font-mono tracking-widest text-stone-900 focus:outline-none focus:ring-2 focus:ring-pink-400"
                        required
                      />
                      <button
                        type="submit"
                        className="px-4 py-2.5 rounded-xl bg-pink-600 hover:bg-pink-700 text-white text-xs font-bold cursor-pointer"
                      >
                        Verify &amp; Activate
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSetup2faStep('idle')}
                      className="text-xs text-stone-600 underline cursor-pointer"
                    >
                      Cancel 2FA Setup
                    </button>
                  </div>
                </div>
              </form>
            )}

            {setup2faStep === 'recovery' && recoveryCodes.length > 0 && (
              <div className="p-5 rounded-3xl bg-emerald-50 border border-emerald-200 space-y-4">
                <div className="flex items-start gap-2.5">
                  <CheckCircle2 size={18} className="text-emerald-700 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-bold text-emerald-950">
                      Save Your 8 Single-Use Recovery Codes
                    </p>
                    <p className="text-xs text-emerald-800 mt-0.5">
                      Each code can unlock your account once if you lose access to your authenticator app. They will not be shown again.
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {recoveryCodes.map((code) => (
                    <code
                      key={code}
                      className="px-3 py-2 rounded-xl bg-white border border-emerald-200 text-xs font-mono font-bold text-stone-900 text-center select-all"
                    >
                      {code}
                    </code>
                  ))}
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard?.writeText(recoveryCodes.join('\n'));
                      setCopiedRecovery(true);
                      setTimeout(() => setCopiedRecovery(false), 2500);
                    }}
                    className="px-4 py-2 rounded-xl bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                  >
                    {copiedRecovery ? <Check size={14} /> : <Copy size={14} />}
                    <span>{copiedRecovery ? 'Copied Codes!' : 'Copy Recovery Codes'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSetup2faStep('idle');
                      setRecoveryCodes([]);
                    }}
                    className="px-4 py-2 rounded-xl bg-white border border-emerald-300 text-emerald-900 text-xs font-bold cursor-pointer"
                  >
                    I Have Saved Them
                  </button>
                </div>
              </div>
            )}

            {security.twoFactorEnabled && setup2faStep === 'idle' && (
              <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200 flex items-center justify-between gap-3">
                <div className="text-xs text-emerald-900">
                  <strong className="block">Authenticator 2FA Active</strong>
                  <span>
                    Remaining backup recovery codes: {security.twoFactorRecoveryHashes?.length ?? 0}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    const existingSecret = await verifyRevealSaved2faSecret();
                    if (existingSecret) {
                      notify('info', 'Your 2FA authenticator key is verified and encrypted.');
                    }
                  }}
                  className="text-xs font-bold text-emerald-800 underline cursor-pointer"
                >
                  Verify Vault Key
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 4: ACTIVE SESSIONS & LOGIN ACTIVITY */}
      {section === 'sessions' && (
        <div className="space-y-5">
          <div className="bg-white border border-pink-100 rounded-3xl p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-serif font-bold text-stone-900">
                  Active Devices &amp; Sessions
                </h3>
                <p className="text-xs text-stone-600">
                  Current browser: {deviceDesc.deviceLabel} ({deviceDesc.timezone}) • Epoch #{security.sessionEpoch || 1}
                </p>
              </div>
              <button
                type="button"
                onClick={handleLogoutAllDevicesClick}
                className="px-4 py-2.5 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shrink-0"
              >
                <LogOut size={14} aria-hidden="true" />
                <span>Log Out of All Devices</span>
              </button>
            </div>

            {security.activeSessions.length === 0 ? (
              <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 text-xs text-stone-700">
                Active session: <strong>{deviceDesc.deviceLabel}</strong> (This Device)
              </div>
            ) : (
              <div className="space-y-2.5">
                {security.activeSessions.map((sess) => {
                  const isCurrent = sess.sessionId === currentSessionId;
                  return (
                    <div
                      key={sess.sessionId}
                      className="p-4 rounded-2xl bg-stone-50/80 border border-stone-200 flex items-center justify-between gap-3"
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-stone-900">{sess.deviceLabel}</span>
                          {isCurrent && (
                            <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                              Current Device
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-stone-600">
                          {sess.timezone} • Signed in via {sess.authMethod} • Last active{' '}
                          {new Date(sess.lastActiveAt).toLocaleString()}
                        </p>
                      </div>
                      {!isCurrent && (
                        <button
                          type="button"
                          onClick={() => handleRevokeSession(sess.sessionId)}
                          className="px-3 py-1.5 rounded-xl bg-white border border-rose-200 text-rose-700 hover:bg-rose-50 text-xs font-bold cursor-pointer"
                        >
                          Revoke
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="bg-white border border-pink-100 rounded-3xl p-6 space-y-4">
            <div className="flex items-center gap-2">
              <Activity size={18} className="text-pink-600" aria-hidden="true" />
              <h3 className="text-lg font-serif font-bold text-stone-900">
                Login Activity &amp; Security Events
              </h3>
            </div>
            {security.loginHistory.length === 0 ? (
              <p className="text-xs text-stone-600">
                No recent security events recorded yet. Sign-ins, 2FA updates, and unfamiliar devices appear here.
              </p>
            ) : (
              <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                {security.loginHistory.map((evt) => (
                  <div
                    key={evt.id}
                    className={`p-3.5 rounded-2xl border text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2 ${
                      evt.suspicious || evt.status === 'locked' || evt.status === 'failed'
                        ? 'bg-rose-50/70 border-rose-200'
                        : 'bg-stone-50/60 border-stone-200'
                    }`}
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-stone-900">
                          {evt.note || `Sign-in (${evt.method})`}
                        </span>
                        {evt.suspicious && (
                          <span className="px-2 py-0.5 rounded-full bg-rose-600 text-white text-[10px] font-bold">
                            New Device / Location
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-stone-600">
                        {evt.deviceLabel} • {evt.timezone}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="px-2 py-0.5 rounded-full bg-white border border-stone-200 text-[10px] font-bold uppercase text-stone-700">
                        {evt.status.replace('_', ' ')}
                      </span>
                      <span className="text-[11px] text-stone-500">
                        {new Date(evt.timestamp).toLocaleString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 5: DOWNLOAD DATA & VERIFIED DELETION */}
      {section === 'data' && (
        <div className="space-y-5">
          <div className="bg-white border border-pink-100 rounded-3xl p-6 space-y-4">
            <div className="flex items-center gap-2">
              <Download size={18} className="text-pink-600" aria-hidden="true" />
              <h3 className="text-lg font-serif font-bold text-stone-900">
                Download Your Personal Information
              </h3>
            </div>
            <p className="text-xs text-stone-600 leading-relaxed">
              Export your complete Lumina health profile, cycle records, diary entries, and preferences in a SHA-256 verified archive. Optionally protect your download with AES-256 encryption using a custom passphrase.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-2xl bg-pink-50/40 border border-pink-100 space-y-3">
                <p className="text-xs font-bold text-stone-900">Standard Portable JSON (SHA-256 Verified)</p>
                <p className="text-[11px] text-stone-600">
                  Readable archive with tamper-evident integrity checksum for easy portability.
                </p>
                <button
                  type="button"
                  disabled={exporting}
                  onClick={() => handleExportPersonalData(false)}
                  className="w-full py-2.5 px-4 rounded-xl bg-white border border-pink-200 text-pink-800 hover:bg-pink-100 text-xs font-bold cursor-pointer"
                >
                  Download Portable Archive
                </button>
              </div>

              <div className="p-4 rounded-2xl bg-purple-50/40 border border-purple-200 space-y-3">
                <p className="text-xs font-bold text-stone-900">AES-256 Encrypted Archive</p>
                <input
                  type="password"
                  value={exportPassphrase}
                  onChange={(e) => setExportPassphrase(e.target.value)}
                  placeholder="Enter backup passphrase (min 6 chars)"
                  aria-label="Encryption passphrase for backup download"
                  className="w-full px-3.5 py-2 rounded-xl bg-white border border-purple-200 text-xs text-stone-900"
                />
                <button
                  type="button"
                  disabled={exporting}
                  onClick={() => handleExportPersonalData(true)}
                  className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 text-white text-xs font-bold cursor-pointer"
                >
                  Download Encrypted Backup
                </button>
              </div>
            </div>

            {onNavigateToBackup && (
              <button
                type="button"
                onClick={onNavigateToBackup}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-pink-700 hover:underline cursor-pointer"
              >
                <RefreshCw size={13} aria-hidden="true" />
                <span>Manage Automatic Backups &amp; Restore Snapshots</span>
              </button>
            )}
          </div>

          {/* Account & Data Deletion */}
          <div className="bg-rose-50/60 border border-rose-200 rounded-3xl p-6 space-y-4">
            <div className="flex items-start gap-3">
              <AlertTriangle size={20} className="text-rose-700 mt-0.5 shrink-0" aria-hidden="true" />
              <div className="space-y-1">
                <h3 className="text-base font-serif font-bold text-rose-950">
                  Request Permanent Account &amp; Data Deletion
                </h3>
                <p className="text-xs text-rose-900 leading-relaxed">
                  Permanently deletes your profile, cycle history, diary entries, partner connections, and device backups. This action cannot be undone.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onRequestDeleteAccount}
              className="px-4 py-2.5 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer shadow-sm"
            >
              <Trash2 size={14} aria-hidden="true" />
              <span>Verify Identity &amp; Delete Account</span>
            </button>
          </div>
        </div>
      )}
    </section>
  );
};

export default PrivacyDashboard;
