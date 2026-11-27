import React, { useState, useEffect } from 'react';
import { User } from '../types';
import { auth, db } from '../services/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { 
  signInWithPopup, 
  OAuthProvider,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
  setPersistence,
  indexedDBLocalPersistence,
  browserSessionPersistence
} from 'firebase/auth';
import { ForgotPasswordScreen } from './ForgotPasswordScreen';
import { ResetPasswordConfirmScreen } from './ResetPasswordConfirmScreen';
import { syncUser, getInvite, getCleanName } from '../services/firebaseService';
import { trackSignUp, trackLogin, setUserProperties, logCrashReport } from '../services/analyticsService';
import {
  decryptWithPassphrase,
  loadEncryptedSessionUser,
  saveEncryptedSessionUser,
  scrubLegacySensitiveKeys,
  secureStorage
} from '../services/secureStorage';
import {
  applyLoginSecurityAudit,
  checkClientRateLimit,
  clearDiaryPinLockout,
  clearLoginLockout,
  evaluatePasswordStrength,
  getAccountLockoutState,
  getDiaryPinLockoutState,
  getLocalSessionEpoch,
  isHoneypotTriggered,
  isValidEmailAddress,
  recordFailedDiaryPinAttempt,
  recordFailedLoginAttempt,
  sanitizeTextInput,
  storeLocalCredentialVerifier,
  userHasConfiguredPin,
  verifyAndConsumeRecoveryCode,
  verifyDiaryPin,
  verifyLocalCredential,
  verifyTotpCode
} from '../services/securityService';
import {
  authenticateWithBiometrics,
  getBiometricCapability,
  getBiometricProfileHint
} from '../services/biometricService';
import { 
  Fingerprint, 
  Lock, 
  Check, 
  X, 
  Delete, 
  Mail, 
  ArrowLeft,
  ArrowRight,
  ShieldCheck, 
  Smartphone,
  ChevronRight,
  KeyRound,
  HeartHandshake,
  CloudDownload,
  Calendar,
  Flower2,
  UserPlus
} from 'lucide-react';

interface AuthProps {
  onLogin: (user: User, rememberMe?: boolean) => void;
  initialInviteCode?: string | null;
  onClearInvite?: () => void;
  initialPasswordResetActive?: boolean;
  initialPasswordResetCode?: string | null;
  initialForgotPasswordActive?: boolean;
  initialPostResetNotice?: boolean;
  onClearPasswordReset?: (didCompleteReset?: boolean) => void;
  latestCloudUser?: User | null;
  latestCloudLoading?: boolean;
}

const DEFAULT_PRIVATE_SHARING_SETTINGS = {
  shareCycleInfo: false,
  shareSymptoms: false,
  shareMood: false,
  shareNotes: false,
  shareFertilityInfo: false,
  sharePregnancyInfo: false,
  shareIntimacyInfo: false,
  shareDoctorReports: false,
  shareAppointmentReminders: false,
  shareWellnessUpdates: false,
};

const Auth: React.FC<AuthProps> = ({
  onLogin,
  initialInviteCode,
  onClearInvite,
  initialPasswordResetActive = false,
  initialPasswordResetCode,
  initialForgotPasswordActive = false,
  initialPostResetNotice = false,
  onClearPasswordReset,
  latestCloudUser,
  latestCloudLoading,
}) => {
  const [connectionMode, setConnectionMode] = useState<'cloud' | 'offline'>(() =>
    typeof navigator !== 'undefined' && navigator.onLine === false ? 'offline' : 'cloud'
  );
  const [activeResetCode, setActiveResetCode] = useState<string | null>(() => initialPasswordResetCode || null);
  const [screen, setScreen] = useState<
    | 'returning'
    | 'welcome'
    | 'email_login'
    | 'email_signup'
    | 'partner_invite'
    | 'scan_welcome'
    | 'forgot_password'
    | 'reset_password_confirm'
  >(() => {
    if (initialPasswordResetActive || initialPasswordResetCode) {
      return 'reset_password_confirm';
    }
    if (initialForgotPasswordActive) {
      return 'forgot_password';
    }
    if (initialPostResetNotice) {
      return 'email_login';
    }
    if (initialInviteCode) {
      return 'partner_invite';
    }
    const loggedOut = sessionStorage.getItem('lumina_logged_out') === 'true';
    if (loggedOut) {
      return 'email_login';
    }
    if (latestCloudUser) {
      return 'returning';
    }
    return 'welcome';
  });
  const [welcomeStep, setWelcomeStep] = useState<'choose_experience' | 'auth_creation'>('choose_experience');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState(() =>
    initialPostResetNotice
      ? 'Your Lumina | Bloom & Balance password has been reset. Please sign in with your new password.'
      : ''
  );
  const [pendingRestoreUser, setPendingRestoreUser] = useState<User | null>(null);
  const [returningHint, setReturningHint] = useState<{ userId: string; name: string; email: string } | null>(null);
  const [cachedSecureUser, setCachedSecureUser] = useState<User | null>(null);
  const [biometricLabel, setBiometricLabel] = useState<string>('Device Biometrics');
  const [biometricAvailable, setBiometricAvailable] = useState<boolean>(false);

  // Biometric / Passcode Modal state
  const [biometricScanning, setBiometricScanning] = useState<'none' | 'face' | 'touch' | 'passcode'>('none');
  const [biometricStatus, setBiometricStatus] = useState<'idle' | 'scanning' | 'success' | 'fail'>('idle');
  const [typedPin, setTypedPin] = useState<string>('');
  const [passcodeError, setPasscodeError] = useState<string>('');

  // Form Fields (never read plaintext password from localStorage)
  const [email, setEmail] = useState(() => localStorage.getItem('lumina_saved_email') || '');
  const [password, setPassword] = useState('');
  const [honeypot, setHoneypot] = useState('');
  const [name, setName] = useState(() => localStorage.getItem('lumina_saved_name') || '');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [age, setAge] = useState('');
  const [dob, setDob] = useState('');
  const [country, setCountry] = useState('');
  const [timezone, setTimezone] = useState(() => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
    } catch {
      return 'UTC';
    }
  });
  const [registerRole, setRegisterRole] = useState<'tracker' | 'partner'>('tracker');
  const [rememberMe, setRememberMe] = useState(() => localStorage.getItem('lumina_remember_me') !== 'false');

  // Two-Factor Verification Challenge state
  const [pending2faChallenge, setPending2faChallenge] = useState<{
    user: User;
    method: string;
    remember: boolean;
  } | null>(null);
  const [twoFactorInput, setTwoFactorInput] = useState('');
  const [useRecoveryCode, setUseRecoveryCode] = useState(false);

  const [inviteSenderName, setInviteSenderName] = useState<string>('');

  const getTargetUser = (): User | null => {
    if (latestCloudUser) {
      return latestCloudUser;
    }
    if (cachedSecureUser) {
      return cachedSecureUser;
    }
    return null;
  };

  // Scrub legacy plaintext keys, load encrypted returning hint/capability, and check session revocation
  useEffect(() => {
    scrubLegacySensitiveKeys();

    const handleOnlineStatus = () => {
      setConnectionMode(navigator.onLine ? 'cloud' : 'offline');
    };
    window.addEventListener('online', handleOnlineStatus);
    window.addEventListener('offline', handleOnlineStatus);

    let cancelled = false;
    (async () => {
      const [hint, encryptedProfile] = await Promise.all([
        getBiometricProfileHint(),
        loadEncryptedSessionUser<User>(true),
      ]);
      if (cancelled) return;

      if (hint) setReturningHint(hint);
      if (encryptedProfile) setCachedSecureUser(encryptedProfile);

      const target = latestCloudUser || encryptedProfile || null;
      const cap = await getBiometricCapability(hint?.userId || target?.id);
      if (cancelled) return;
      setBiometricAvailable(cap.available);
      setBiometricLabel(cap.biometryLabel);

      if (target) {
        const remoteEpoch = target.securitySettings?.sessionEpoch || 1;
        const localEpoch = target.id ? getLocalSessionEpoch(target.id) : 1;
        if (remoteEpoch > localEpoch) {
          await secureStorage.removeItem('biometric_hint_v1');
          sessionStorage.setItem('lumina_logged_out', 'true');
          setScreen('email_login');
          setError('All devices were signed out from Security Settings. Please sign in again.');
          return;
        }
      }

      if (!initialInviteCode && !initialPasswordResetActive && !initialPasswordResetCode && !initialForgotPasswordActive && !initialPostResetNotice) {
        const loggedOut = sessionStorage.getItem('lumina_logged_out') === 'true';
        if (loggedOut) {
          setScreen('email_login');
        } else if (
          (hint || target) &&
          (cap.available || cap.enrolledForUser || userHasConfiguredPin(target))
        ) {
          setScreen('returning');
        }
      }
    })();

    if (initialPasswordResetActive || initialPasswordResetCode) {
      setActiveResetCode(initialPasswordResetCode || null);
      setScreen('reset_password_confirm');
      setError('');
      setNotice('');
    } else if (initialPostResetNotice) {
      setScreen('email_login');
      setError('');
      setNotice('Your Lumina | Bloom & Balance password has been reset. Please sign in with your new password.');
    } else if (initialForgotPasswordActive) {
      setScreen('forgot_password');
    } else if (initialInviteCode) {
      setScreen('partner_invite');
      setRegisterRole('partner');
      getInvite(initialInviteCode).then((invite) => {
        if (cancelled) return;
        if (invite) {
          const cleaned = getCleanName(invite.senderName, invite.senderEmail || '');
          setInviteSenderName(cleaned || 'Your Partner');
        } else {
          setInviteSenderName('Your Partner');
        }
      }).catch(() => {
        if (!cancelled) setInviteSenderName('Your Partner');
      });
    }

    return () => {
      cancelled = true;
      window.removeEventListener('online', handleOnlineStatus);
      window.removeEventListener('offline', handleOnlineStatus);
    };
  }, [initialInviteCode, initialPasswordResetActive, initialPasswordResetCode, initialForgotPasswordActive, initialPostResetNotice, latestCloudUser]);

  const getDisplayName = (): string => {
    const savedName = localStorage.getItem('lumina_saved_name');
    if (savedName) return savedName;
    if (returningHint?.name) return returningHint.name;
    const target = getTargetUser();
    return target?.name || 'there';
  };

  const handleSaveCredentials = (emailStr: string, _unused: string, nameStr?: string) => {
    scrubLegacySensitiveKeys();
    localStorage.setItem('lumina_remember_me', rememberMe ? 'true' : 'false');
    if (rememberMe) {
      localStorage.setItem('lumina_saved_email', emailStr);
      if (nameStr) {
        localStorage.setItem('lumina_saved_name', nameStr);
      }
    } else {
      localStorage.removeItem('lumina_saved_email');
      localStorage.removeItem('lumina_saved_name');
    }
  };

  const finalizeAuthenticatedSession = (userToLogin: User, method: string, remember: boolean) => {
    const auditedUser = applyLoginSecurityAudit(userToLogin, method, 'success');
    localStorage.setItem('lumina_remember_me', remember ? 'true' : 'false');
    void saveEncryptedSessionUser(auditedUser, remember);
    if (auditedUser.email) {
      void secureStorage.setItem('offline_user_' + auditedUser.email.toLowerCase().trim(), JSON.stringify(auditedUser));
    }
    syncUser(auditedUser);
    setUserProperties({
      userId: auditedUser.id,
      isPartner: auditedUser.isPartner,
      isPremium: auditedUser.isPremium
    });
    trackLogin(method, auditedUser.isPartner);
    onLogin(auditedUser, remember);
  };

  const completeOrChallenge2FA = (candidateUser: User, method: string, remember: boolean = rememberMe) => {
    if (candidateUser.securitySettings?.twoFactorEnabled) {
      setPending2faChallenge({ user: candidateUser, method, remember });
      setTwoFactorInput('');
      setUseRecoveryCode(false);
      setLoading(false);
      return;
    }
    finalizeAuthenticatedSession(candidateUser, method, remember);
  };

  const handleVerify2faSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pending2faChallenge) return;
    setError('');
    setLoading(true);
    try {
      const targetUser = pending2faChallenge.user;
      if (useRecoveryCode) {
        const result = await verifyAndConsumeRecoveryCode(targetUser, twoFactorInput);
        if (!result.valid) {
          setError('Invalid or already-used recovery code. Please check and try again.');
          setLoading(false);
          return;
        }
        const updatedWithConsumed: User = {
          ...targetUser,
          securitySettings: {
            ...(targetUser.securitySettings || {
              twoFactorEnabled: true,
              sessionEpoch: 1,
              activeSessions: [],
              loginHistory: [],
            }),
            twoFactorRecoveryHashes: result.updatedHashes,
          },
        };
        setPending2faChallenge(null);
        finalizeAuthenticatedSession(updatedWithConsumed, `${pending2faChallenge.method}+recovery`, pending2faChallenge.remember);
        return;
      }

      let secret: string | null = await secureStorage.getItem(`totp_secret_${targetUser.id}`);
      if (!secret && targetUser.securitySettings?.twoFactorSecretEnc) {
        try {
          const parsed = JSON.parse(targetUser.securitySettings.twoFactorSecretEnc);
          secret = await decryptWithPassphrase(
            parsed,
            `${targetUser.id}::${(targetUser.email || '').toLowerCase().trim()}`
          );
        } catch {
          secret = null;
        }
      }
      if (!secret) {
        setError('Two-factor key could not be verified on this device. Use a recovery code instead.');
        setLoading(false);
        return;
      }

      const valid = await verifyTotpCode(secret, twoFactorInput);
      if (!valid) {
        setError('Incorrect 6-digit authenticator code. Try the current code or switch to a recovery code.');
        setLoading(false);
        return;
      }
      setPending2faChallenge(null);
      finalizeAuthenticatedSession(targetUser, `${pending2faChallenge.method}+2fa`, pending2faChallenge.remember);
    } finally {
      setLoading(false);
    }
  };

  // Genuine Biometric / Security PIN trigger (never simulates success or auto-unlocks via Firebase alone)
  const handleBiometricAuth = async (type: 'face' | 'touch' | 'passcode') => {
    setError('');
    setNotice('');
    const targetUser = getTargetUser();
    if (!targetUser) {
      setScreen('email_login');
      setError('No saved profile is available on this device. Please sign in with your Email and Password.');
      return;
    }

    const remoteEpoch = targetUser.securitySettings?.sessionEpoch || 1;
    const localEpoch = targetUser.id ? getLocalSessionEpoch(targetUser.id) : 1;
    if (remoteEpoch > localEpoch) {
      await secureStorage.removeItem('biometric_hint_v1');
      setScreen('email_login');
      setError('Session expired after logging out of all devices. Please sign in again with your Email and Password.');
      return;
    }

    const isCloudProfile = !targetUser.id.startsWith('offline_');
    if (isCloudProfile && auth.currentUser?.uid !== targetUser.id) {
      setScreen('email_login');
      setError('Your cloud session requires fresh verification. Please sign in with your Email and Password.');
      return;
    }

    if (type === 'passcode') {
      if (!userHasConfiguredPin(targetUser)) {
        setScreen('email_login');
        setError('No private Security PIN has been created yet. Sign in with your email and password, then set a PIN in Settings.');
        return;
      }
      setBiometricScanning('passcode');
      setBiometricStatus('idle');
      setTypedPin('');
      setPasscodeError('');
      return;
    }

    setBiometricScanning(type);
    setBiometricStatus('scanning');
    setTypedPin('');
    setPasscodeError('');

    const res = await authenticateWithBiometrics(targetUser, 'Verify your identity to unlock Lumina');
    if (res.verified) {
      setBiometricStatus('success');
      setBiometricScanning('none');
      completeOrChallenge2FA(targetUser, res.method || type, rememberMe);
    } else {
      setBiometricStatus('fail');
      setBiometricScanning('none');
      setError(res.message);
    }
  };

  const handlePasscodeSubmit = async (candidatePin: string = typedPin) => {
    const targetUser = getTargetUser();
    if (!targetUser) {
      setBiometricScanning('none');
      setScreen('email_login');
      return;
    }

    const lockout = await getDiaryPinLockoutState(targetUser.id);
    if (lockout.isLocked) {
      const mins = Math.max(1, Math.ceil(lockout.remainingMs / 60_000));
      setPasscodeError(`Too many incorrect PIN attempts. Try again in ${mins} minute(s) or sign in with password.`);
      return;
    }

    const verdict = await verifyDiaryPin(candidatePin, targetUser);
    if (verdict === 'valid') {
      await clearDiaryPinLockout(targetUser.id);
      setBiometricStatus('success');
      setBiometricScanning('none');
      setTypedPin('');
      setPasscodeError('');
      completeOrChallenge2FA(targetUser, 'passcode', rememberMe);
      return;
    }

    if (verdict === 'unset') {
      setBiometricScanning('none');
      setScreen('email_login');
      setError('No Security PIN is set on this account yet. Please sign in with Email and Password.');
      return;
    }

    const failState = await recordFailedDiaryPinAttempt(targetUser.id);
    setBiometricStatus('fail');
    setTypedPin('');
    setPasscodeError(
      failState.isLocked
        ? 'PIN locked for 5 minutes after 5 failed attempts.'
        : `Incorrect Security PIN (${failState.remainingAttempts} attempt(s) left).`
    );
  };

  const handlePasscodeDigit = (digit: string) => {
    if (typedPin.length >= 6 || biometricStatus === 'success') return;
    setPasscodeError('');
    setBiometricStatus('idle');
    setTypedPin(prev => prev + digit);
  };

  const handleBackspace = () => {
    if (typedPin.length > 0) {
      setTypedPin(typedPin.slice(0, -1));
    }
  };

  // Helper to distinguish user roles (Cycle Tracker vs Partner) and route through 2FA & security audit
  const handleExistingUserLogin = (existingUser: User, credentialsSaver: () => void, method: string = 'email') => {
    const hasTrackerData = !!(
      (existingUser.periods && existingUser.periods.length > 0) ||
      (existingUser.periodDates && existingUser.periodDates.length > 0) ||
      (existingUser.symptoms && existingUser.symptoms.length > 0) ||
      (existingUser.moodLogs && existingUser.moodLogs.length > 0) ||
      (existingUser.bcLogs && existingUser.bcLogs.length > 0) ||
      (existingUser.diaryEntries && existingUser.diaryEntries.length > 0)
    );

    const isCompleted = existingUser.onboardingCompleted === false
      ? false
      : (existingUser.onboardingCompleted === true || hasTrackerData);

    const fullExistingUser: User = {
      ...existingUser,
      onboardingCompleted: isCompleted
    };

    credentialsSaver();
    completeOrChallenge2FA(fullExistingUser, method, rememberMe);
  };

  // Real Firebase Apple OAuth Sign-In (never simulated)
  const handleAppleLogin = async () => {
    setLoading(true);
    setError('');
    setNotice('');
    try {
      await setPersistence(auth, rememberMe ? indexedDBLocalPersistence : browserSessionPersistence).catch(() => {});
      const provider = new OAuthProvider('apple.com');
      provider.addScope('email');
      provider.addScope('name');
      const userCredential = await signInWithPopup(auth, provider);
      const fbUser = userCredential.user;

      const docSnap = await getDoc(doc(db, "users", fbUser.uid));
      if (docSnap.exists()) {
        const existingData = docSnap.data() as User;
        handleExistingUserLogin(existingData, () => {
          handleSaveCredentials(existingData.email, 'apple', existingData.name);
        }, 'apple');
        return;
      }

      const newUser: User = {
        id: fbUser.uid,
        name: fbUser.displayName || 'Lumina Member',
        email: fbUser.email || '',
        partnerName: '',
        isPartnerLinked: false,
        isPartner: registerRole === 'partner',
        cycleLength: 28,
        periodLength: 5,
        lastPeriodStart: new Date().toISOString(),
        isPregnancyMode: false,
        onboardingCompleted: false,
        theme: 'rose',
        favoriteSongs: [],
        customSongs: [],
        wishlist: [],
        receivedComforts: [],
        tempUnit: 'F',
        waterGoal: 8,
        sharingSettings: { ...DEFAULT_PRIVATE_SHARING_SETTINGS },
      };

      await syncUser(newUser);
      localStorage.setItem('lumina_remember_me', rememberMe ? 'true' : 'false');
      await saveEncryptedSessionUser(newUser, rememberMe);
      handleSaveCredentials(newUser.email, 'apple', newUser.name);
      trackSignUp('apple', newUser.isPartner);
      onLogin(newUser, rememberMe);
    } catch (fbErr: any) {
      logCrashReport(fbErr, 'Authentication Error', { provider: 'apple' });
      const code = fbErr?.code || '';
      if (code === 'auth/operation-not-allowed') {
        setError('Apple Sign-In is not enabled in Firebase Authentication Console yet. Please use Email Sign-In.');
      } else if (code === 'auth/popup-closed-by-user') {
        setError('Apple sign-in was cancelled.');
      } else {
        setError('Apple Sign-In could not be completed. Please try Email Sign-In.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Email login / signup combined handler with accurate Firebase error mapping & encrypted offline fallback
  const handleEmailFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setNotice('');

    if (isHoneypotTriggered(honeypot)) {
      setError('Submission rejected. Please refresh and try again cleanly.');
      return;
    }

    const rate = checkClientRateLimit('email_auth_submit', 8, 60_000);
    if (!rate.allowed) {
      setError(`Too many sign-in attempts. Please wait ${rate.retryAfterSec}s before trying again.`);
      return;
    }

    setLoading(true);
    const emailKey = sanitizeTextInput(email, 160).toLowerCase();
    const isSignUp = screen === 'email_signup';

    if (!isValidEmailAddress(emailKey)) {
      setError("Please enter a valid email address.");
      setLoading(false);
      return;
    }

    if (!isSignUp) {
      const lockout = await getAccountLockoutState(emailKey);
      if (lockout.isLocked) {
        const mins = Math.max(1, Math.ceil(lockout.remainingMs / 60_000));
        setError(`Account temporarily locked for security after repeated failed attempts. Try again in ${mins} minute(s).`);
        setLoading(false);
        return;
      }
    }

    if (isSignUp) {
      const strength = evaluatePasswordStrength(password);
      if (!strength.valid) {
        setError(strength.error || 'Choose a stronger password (8+ chars, upper/lowercase, number, and symbol).');
        setLoading(false);
        return;
      }
    } else if (!password || password.length < 6) {
      setError("Please enter your password.");
      setLoading(false);
      return;
    }

    const cleanFirst = sanitizeTextInput(firstName, 60);
    const cleanLast = sanitizeTextInput(lastName, 60);
    const cleanDisplay = sanitizeTextInput(displayName, 80);
    const resolvedName = isSignUp ? (cleanDisplay || `${cleanFirst} ${cleanLast}`).trim() : sanitizeTextInput(name, 80);

    if (isSignUp) {
      const isPartnerRole = registerRole === 'partner';
      const hasAllFields = isPartnerRole
        ? (cleanFirst && cleanLast && cleanDisplay && emailKey && password)
        : (cleanFirst && cleanLast && cleanDisplay && age.trim() && dob.trim() && emailKey && password);

      if (!hasAllFields) {
        setError(isPartnerRole
          ? "Please provide all required registration fields (First Name, Last Name, Display Name, Email, and Password) to continue."
          : "Please provide all required registration fields (First Name, Last Name, Display Name, Age, Date of Birth, Email, and Password) to continue."
        );
        setLoading(false);
        return;
      }
    }

    const getEncryptedOfflineUser = async (): Promise<User | null> => {
      try {
        const raw = await secureStorage.getItem('offline_user_' + emailKey);
        if (raw) {
          const parsed = JSON.parse(raw) as User;
          if (parsed?.email && parsed.email.toLowerCase().trim() === emailKey) {
            return parsed;
          }
        }
      } catch {}
      const target = getTargetUser();
      if (target?.email && target.email.toLowerCase().trim() === emailKey) {
        return target;
      }
      return null;
    };

    const handleOfflineLoginOrSignup = async () => {
      const existingLocal = await getEncryptedOfflineUser();

      if (isSignUp) {
        if (existingLocal) {
          setError('An account with this email already exists on this device. Please use Sign In instead.');
          setLoading(false);
          return;
        }
        const offlineUser = createNewSandboxUser(
          'offline_' + Date.now(),
          resolvedName,
          emailKey,
          'offline_companion',
          '',
          registerRole === 'partner',
          cleanFirst,
          cleanLast,
          cleanDisplay,
          parseInt(age) || undefined,
          dob,
          sanitizeTextInput(country, 60) || undefined,
          timezone
        );

        await storeLocalCredentialVerifier(emailKey, password);
        await secureStorage.setItem('offline_user_' + emailKey, JSON.stringify(offlineUser));
        handleSaveCredentials(emailKey, '', resolvedName);
        finalizeAuthenticatedSession(offlineUser, 'email_signup', rememberMe);
        setLoading(false);
        return;
      }

      const credCheck = await verifyLocalCredential(emailKey, password);

      if (existingLocal && credCheck === 'valid') {
        await clearLoginLockout(emailKey);
        handleExistingUserLogin(existingLocal, () => handleSaveCredentials(emailKey, '', existingLocal.name), 'email');
        setLoading(false);
        return;
      }

      if (credCheck === 'missing') {
        setError(
          'You appear to be offline and this email has no cached sign-in verifier on this device yet. Connect to the internet to sign in with Email and Password.'
        );
        setLoading(false);
        return;
      }

      const lockStatus = await recordFailedLoginAttempt(emailKey);
      if (existingLocal) {
        const failedAudit = applyLoginSecurityAudit(
          existingLocal,
          'email',
          lockStatus.isLocked ? 'locked' : 'failed',
          'Incorrect password attempt'
        );
        await secureStorage.setItem('offline_user_' + emailKey, JSON.stringify(failedAudit));
      }
      setError(
        lockStatus.isLocked
          ? 'Too many unsuccessful sign-in attempts. Your account is temporarily locked for 5 minutes.'
          : `Incorrect email or password. ${lockStatus.remainingAttempts} attempt(s) remaining before temporary lockout.`
      );
      setLoading(false);
    };

    if (connectionMode === 'offline' || (typeof navigator !== 'undefined' && navigator.onLine === false)) {
      await handleOfflineLoginOrSignup();
      return;
    }

    try {
      await setPersistence(auth, rememberMe ? indexedDBLocalPersistence : browserSessionPersistence).catch(() => {});
      if (isSignUp) {
        const userCredential = await createUserWithEmailAndPassword(auth, emailKey, password);
        const fbUser = userCredential.user;
        await updateProfile(fbUser, { displayName: resolvedName });

        const newUser: User = {
          id: fbUser.uid,
          name: resolvedName,
          email: fbUser.email || emailKey,
          firstName: cleanFirst,
          lastName: cleanLast,
          displayName: cleanDisplay,
          age: parseInt(age) || undefined,
          dob,
          country: sanitizeTextInput(country, 60) || undefined,
          timezone,
          partnerName: '',
          cycleLength: 28,
          periodLength: 5,
          lastPeriodStart: new Date().toISOString(),
          isPartner: registerRole === 'partner',
          isPregnancyMode: false,
          theme: 'rose',
          isPartnerLinked: false,
          sharingSettings: { ...DEFAULT_PRIVATE_SHARING_SETTINGS },
          waterGoal: 8,
          onboardingCompleted: false
        };

        await storeLocalCredentialVerifier(emailKey, password);
        await syncUser(newUser);
        await secureStorage.setItem('offline_user_' + emailKey, JSON.stringify(newUser));
        handleSaveCredentials(newUser.email, '', resolvedName);
        trackSignUp('email', newUser.isPartner);
        finalizeAuthenticatedSession(newUser, 'email_signup', rememberMe);
        setLoading(false);
      } else {
        const userCredential = await signInWithEmailAndPassword(auth, emailKey, password);
        const fbUser = userCredential.user;
        await clearLoginLockout(emailKey);
        await storeLocalCredentialVerifier(emailKey, password);

        let existingUser: User | null = null;
        try {
          const userSnap = await getDoc(doc(db, 'users', fbUser.uid));
          if (userSnap.exists()) {
            existingUser = userSnap.data() as User;
          }
        } catch (readErr) {
          console.warn('[Auth] Firestore profile read fallback:', readErr);
        }

        const localSaved = await getEncryptedOfflineUser();
        const resolvedExisting = existingUser || (localSaved && localSaved.id === fbUser.uid ? localSaved : null);

        if (resolvedExisting) {
          const mergedUser = localSaved && localSaved.lastPeriodStart && localSaved.cycleLength
            ? {
                ...localSaved,
                ...resolvedExisting,
                cycleLength: resolvedExisting.cycleLength || localSaved.cycleLength,
                periodLength: resolvedExisting.periodLength || localSaved.periodLength,
                lastPeriodStart: resolvedExisting.lastPeriodStart || localSaved.lastPeriodStart,
              }
            : resolvedExisting;

          if (fbUser.emailVerified && mergedUser.securitySettings) {
            mergedUser.securitySettings.emailVerified = true;
          }
          handleExistingUserLogin(mergedUser, () => {
            handleSaveCredentials(emailKey, '', mergedUser.name);
          }, 'email');
        } else {
          // Firebase Auth succeeded, bootstrap profile record cleanly if doc doesn't exist yet
          const bootstrappedUser: User = {
            id: fbUser.uid,
            name: fbUser.displayName || emailKey.split('@')[0] || 'Lumina Member',
            email: fbUser.email || emailKey,
            partnerName: '',
            cycleLength: 28,
            periodLength: 5,
            lastPeriodStart: new Date().toISOString(),
            isPartner: Boolean(initialInviteCode) || registerRole === 'partner',
            isPregnancyMode: false,
            theme: 'rose',
            isPartnerLinked: false,
            sharingSettings: { ...DEFAULT_PRIVATE_SHARING_SETTINGS },
            waterGoal: 8,
            onboardingCompleted: false,
          };
          await syncUser(bootstrappedUser);
          handleExistingUserLogin(bootstrappedUser, () => {
            handleSaveCredentials(emailKey, '', bootstrappedUser.name);
          }, 'email');
        }
        setLoading(false);
      }
    } catch (fbErr: any) {
      const code = String(fbErr?.code || '');
      const msg = String(fbErr?.message || '');

      if (code === 'auth/operation-not-allowed' || msg.includes('operation-not-allowed') || msg.includes('PASSWORD_LOGIN_DISABLED')) {
        setError(
          'Email/Password sign-in is disabled in Firebase Console for this project. Open Firebase Console → Authentication → Sign-in method and enable "Email/Password", then retry.'
        );
        setLoading(false);
        return;
      }

      if (code === 'auth/user-disabled') {
        setError('This account has been disabled. Please contact support.');
        setLoading(false);
        return;
      }

      if (code === 'auth/invalid-email') {
        setError('Please enter a valid email address.');
        setLoading(false);
        return;
      }

      if (code === 'auth/email-already-in-use' || msg.includes('email-already-in-use')) {
        setError('An account already exists with this email. Please use Sign In or "Forgot password?" instead.');
        setLoading(false);
        return;
      }

      const isBadCredentials = [
        'auth/wrong-password',
        'auth/invalid-credential',
        'auth/invalid-password',
        'auth/user-not-found',
        'auth/too-many-requests'
      ].some(t => code.includes(t) || msg.includes(t));

      if (isBadCredentials) {
        const lockStatus = await recordFailedLoginAttempt(emailKey);
        const cached = await getEncryptedOfflineUser();
        if (cached) {
          const failedAudit = applyLoginSecurityAudit(cached, 'email', lockStatus.isLocked ? 'locked' : 'failed', 'Failed login attempt');
          await secureStorage.setItem('offline_user_' + emailKey, JSON.stringify(failedAudit));
        }
        setError(
          lockStatus.isLocked || code.includes('too-many-requests')
            ? 'Too many unsuccessful sign-in attempts. Your account is temporarily locked for 5 minutes.'
            : `Incorrect email or password (${lockStatus.remainingAttempts} attempt(s) left). If you have not created an Email/Password account yet, tap "Need an account? Create one" below.`
        );
        setLoading(false);
        return;
      }

      // Only fall back to encrypted offline verifier when there is a real network connectivity failure
      if (code.includes('network-request-failed') || (typeof navigator !== 'undefined' && navigator.onLine === false)) {
        await handleOfflineLoginOrSignup();
        return;
      }

      setError('Unable to complete cloud sign-in right now. Please check your connection and try again.');
      setLoading(false);
    }
  };

  const createNewSandboxUser = (
    currentId: string,
    currentName: string,
    emailStr: string,
    _partnerId: string,
    _partnerName: string,
    isPartner: boolean,
    firstName?: string,
    lastName?: string,
    displayName?: string,
    age?: number,
    dob?: string,
    country?: string,
    timezone?: string
  ): User => {
    return {
      id: currentId,
      name: currentName,
      email: emailStr,
      firstName,
      lastName,
      displayName,
      age,
      dob,
      country,
      timezone,
      partnerName: '',
      partnerId: undefined,
      isPartnerLinked: false,
      isPartner: isPartner,
      cycleLength: 28,
      periodLength: 5,
      lastPeriodStart: new Date().toISOString(),
      isPregnancyMode: false,
      onboardingCompleted: false,
      theme: 'rose',
      favoriteSongs: [],
      customSongs: [],
      sharingSettings: { ...DEFAULT_PRIVATE_SHARING_SETTINGS },
      waterGoal: 8,
    };
  };

  return (
    <div className="min-h-screen bg-[#faf8f6] dark:bg-[#11100f] flex items-center justify-center p-4 sm:p-6 lg:p-8 select-none transition-colors">
      <div className="w-full max-w-4xl bg-white dark:bg-[#1a1816] rounded-2xl border border-stone-200/80 dark:border-[#2e2a26] shadow-[0_12px_40px_rgba(24,20,18,0.06)] dark:shadow-[0_12px_40px_rgba(0,0,0,0.4)] overflow-hidden grid grid-cols-1 lg:grid-cols-12 animate-fadeIn">
        {/* Desktop Editorial Brand Column */}
        <aside className="hidden lg:flex lg:col-span-5 bg-[#faf8f6] dark:bg-[#151311] border-r border-stone-200/70 dark:border-[#2e2a26] p-10 flex-col justify-between">
          <div className="space-y-8">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-pink-600 text-white flex items-center justify-center">
                <Flower2 size={20} strokeWidth={1.75} aria-hidden="true" />
              </div>
              <div>
                <span className="font-serif text-xl font-semibold text-stone-900 dark:text-stone-100 tracking-tight block leading-none">
                  Lumina
                </span>
                <span className="text-[11px] font-medium text-stone-500 dark:text-stone-400 tracking-wider uppercase mt-1 block">
                  Bloom &amp; Balance
                </span>
              </div>
            </div>

            <div className="space-y-3">
              <h2 className="text-3xl font-serif font-semibold text-stone-900 dark:text-stone-100 leading-tight tracking-tight">
                Your cycle, your sanctuary.
              </h2>
              <p className="text-sm text-stone-600 dark:text-stone-400 leading-relaxed">
                Private cycle forecasting, symptom care, pregnancy milestones, and restorative soundscapes built around biological privacy.
              </p>
            </div>

            <ul className="space-y-4 pt-2 border-t border-stone-200/70 dark:border-[#2e2a26]">
              <li className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-white dark:bg-[#23201d] border border-stone-200/80 dark:border-[#342f2b] text-pink-600 dark:text-pink-400 flex items-center justify-center shrink-0 mt-0.5">
                  <Calendar size={15} strokeWidth={1.75} aria-hidden="true" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-stone-900 dark:text-stone-100">Cycle &amp; fertility clarity</p>
                  <p className="text-xs text-stone-500 dark:text-stone-400 leading-relaxed">Calibrated phase predictions and daily symptom insights.</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-white dark:bg-[#23201d] border border-stone-200/80 dark:border-[#342f2b] text-pink-600 dark:text-pink-400 flex items-center justify-center shrink-0 mt-0.5">
                  <HeartHandshake size={15} strokeWidth={1.75} aria-hidden="true" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-stone-900 dark:text-stone-100">Selective partner sync</p>
                  <p className="text-xs text-stone-500 dark:text-stone-400 leading-relaxed">Share only the specific updates you explicitly approve.</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-white dark:bg-[#23201d] border border-stone-200/80 dark:border-[#342f2b] text-pink-600 dark:text-pink-400 flex items-center justify-center shrink-0 mt-0.5">
                  <Lock size={15} strokeWidth={1.75} aria-hidden="true" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-stone-900 dark:text-stone-100">On-device encryption</p>
                  <p className="text-xs text-stone-500 dark:text-stone-400 leading-relaxed">Protected by native biometrics, 2FA, and encrypted local vaults.</p>
                </div>
              </li>
            </ul>
          </div>

          <div className="pt-6 border-t border-stone-200/70 dark:border-[#2e2a26] flex items-center gap-2.5 text-xs text-stone-500 dark:text-stone-400">
            <ShieldCheck size={15} className="text-emerald-600 dark:text-emerald-400 shrink-0" aria-hidden="true" />
            <span>Health records remain private and never sold.</span>
          </div>
        </aside>

        {/* Auth Interaction Column */}
        <div className="lg:col-span-7 px-6 py-8 sm:p-10 flex flex-col justify-between min-h-[560px]">
          {/* Compact Mobile Header (hidden on desktop where aside renders brand) */}
          <div className="flex items-center justify-between lg:hidden pb-4 border-b border-stone-100 dark:border-[#2e2a26]">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-pink-600 text-white flex items-center justify-center">
                <Flower2 size={18} strokeWidth={1.75} aria-hidden="true" />
              </div>
              <div>
                <h1 className="text-xl font-serif text-stone-900 dark:text-stone-100 font-semibold leading-none">Lumina</h1>
                <p className="text-[11px] text-stone-500 dark:text-stone-400 font-medium mt-0.5">Bloom &amp; Balance</p>
              </div>
            </div>
          </div>

          {/* Dynamic view switcher */}
          <div className="w-full flex-1 flex flex-col justify-center my-6 space-y-5 max-w-md mx-auto">
            {error && (
              <div role="alert" className="w-full bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-200 text-xs font-medium p-3.5 rounded-xl border border-rose-200 dark:border-rose-900/50 animate-fadeIn leading-relaxed">
                {error}
              </div>
            )}
            {notice && (
              <div role="status" className="w-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 text-xs font-medium p-3.5 rounded-xl border border-emerald-200 dark:border-emerald-900/50 animate-fadeIn leading-relaxed">
                {notice}
              </div>
            )}

            {pendingRestoreUser && (
              <div className="space-y-5 animate-fadeIn">
                <div className="space-y-2">
                  <div className="w-11 h-11 rounded-xl bg-pink-50 dark:bg-pink-950/30 border border-pink-200/70 dark:border-pink-900/50 text-pink-600 dark:text-pink-400 flex items-center justify-center">
                    {pendingRestoreUser.isPartner ? <HeartHandshake size={20} /> : <CloudDownload size={20} />}
                  </div>
                  <h2 className="text-2xl font-serif text-stone-900 dark:text-stone-100 font-semibold tracking-tight leading-snug">
                    {pendingRestoreUser.isPartner ? 'Restore your partner connection?' : 'Restore your Lumina data?'}
                  </h2>
                  <p className="text-sm text-stone-600 dark:text-stone-400 leading-relaxed">
                    {pendingRestoreUser.isPartner ? (
                      <>
                        Welcome back, <strong className="text-stone-900 dark:text-stone-100 font-semibold">{pendingRestoreUser.name}</strong>. We found your synced Partner settings and comfort preferences.
                      </>
                    ) : (
                      <>
                        Welcome back, <strong className="text-stone-900 dark:text-stone-100 font-semibold">{pendingRestoreUser.name}</strong>. We found an encrypted Cloud Backup with your cycle history, logs, and preferences.
                      </>
                    )}
                  </p>
                </div>

                <div className="bg-[#faf8f6] dark:bg-[#23201d] border border-stone-200/80 dark:border-[#342f2b] p-4 rounded-xl text-xs text-stone-600 dark:text-stone-300 space-y-2">
                  <p className="font-semibold text-stone-800 dark:text-stone-100">
                    {pendingRestoreUser.isPartner ? 'Available companion data' : 'Available cloud backup'}
                  </p>
                  <ul className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-stone-600 dark:text-stone-300">
                    {pendingRestoreUser.isPartner ? (
                      <>
                        <li className="flex items-center gap-1.5"><Check size={12} className="text-pink-600 dark:text-pink-400" /> Partner sync link</li>
                        <li className="flex items-center gap-1.5"><Check size={12} className="text-pink-600 dark:text-pink-400" /> Support custom tips</li>
                        <li className="flex items-center gap-1.5"><Check size={12} className="text-pink-600 dark:text-pink-400" /> Shared profile settings</li>
                        <li className="flex items-center gap-1.5"><Check size={12} className="text-pink-600 dark:text-pink-400" /> Comfort cards</li>
                      </>
                    ) : (
                      <>
                        <li className="flex items-center gap-1.5"><Check size={12} className="text-pink-600 dark:text-pink-400" /> Cycle &amp; period history</li>
                        <li className="flex items-center gap-1.5"><Check size={12} className="text-pink-600 dark:text-pink-400" /> Symptom &amp; mood logs</li>
                        <li className="flex items-center gap-1.5"><Check size={12} className="text-pink-600 dark:text-pink-400" /> Contraceptive profiles</li>
                        <li className="flex items-center gap-1.5"><Check size={12} className="text-pink-600 dark:text-pink-400" /> Diary entries</li>
                      </>
                    )}
                  </ul>
                </div>

                <div className="space-y-2.5 pt-1">
                  <button
                    type="button"
                    id="btn-confirm-restore"
                    onClick={async () => {
                      localStorage.setItem('lumina_remember_me', rememberMe ? 'true' : 'false');
                      await saveEncryptedSessionUser(pendingRestoreUser, rememberMe);
                      onLogin(pendingRestoreUser, rememberMe);
                      setPendingRestoreUser(null);
                    }}
                    className="w-full h-11 px-4 bg-pink-600 hover:bg-pink-700 text-white font-semibold rounded-xl text-sm transition-colors flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <CloudDownload size={16} />
                    <span>{pendingRestoreUser.isPartner ? 'Restore partner link' : 'Restore from cloud backup'}</span>
                  </button>

                  <button
                    type="button"
                    id="btn-cancel-restore"
                    onClick={async () => {
                      const emptyUser: User = {
                        id: pendingRestoreUser.id,
                        name: pendingRestoreUser.name || 'Lumina Member',
                        email: pendingRestoreUser.email || '',
                        partnerName: '',
                        cycleLength: 28,
                        periodLength: 5,
                        lastPeriodStart: new Date().toISOString(),
                        isPartner: pendingRestoreUser.isPartner,
                        isPregnancyMode: false,
                        theme: 'rose',
                        isPartnerLinked: false,
                        sharingSettings: { ...DEFAULT_PRIVATE_SHARING_SETTINGS },
                        waterGoal: 8,
                        onboardingCompleted: false,
                        partnerOnboardingCompleted: false
                      };
                      localStorage.setItem('lumina_remember_me', rememberMe ? 'true' : 'false');
                      await saveEncryptedSessionUser(emptyUser, rememberMe);
                      onLogin(emptyUser, rememberMe);
                      setPendingRestoreUser(null);
                    }}
                    className="w-full h-11 px-4 bg-white dark:bg-[#23201d] border border-stone-200 dark:border-[#342f2b] rounded-xl text-stone-700 dark:text-stone-200 hover:bg-stone-50 dark:hover:bg-[#2a2622] font-medium text-sm transition-colors flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {pendingRestoreUser.isPartner ? 'Start with new connection' : 'Continue as new user'}
                  </button>
                </div>
              </div>
            )}

            {/* PARTNER INVITATION DETECTED FLOW */}
            {!pendingRestoreUser && screen === 'partner_invite' && (
              <div className="space-y-5 animate-fadeIn">
                <div className="space-y-2">
                  <div className="w-11 h-11 rounded-xl bg-pink-50 dark:bg-pink-950/30 border border-pink-200/70 dark:border-pink-900/50 text-pink-600 dark:text-pink-400 flex items-center justify-center">
                    <HeartHandshake size={20} />
                  </div>
                  <h2 className="text-2xl font-serif text-stone-900 dark:text-stone-100 font-semibold tracking-tight leading-snug">
                    {inviteSenderName || 'Your partner'} invited you to Lumina Partner Circle
                  </h2>
                  <p className="text-sm text-stone-600 dark:text-stone-400 leading-relaxed">
                    Connect securely with <strong className="text-stone-900 dark:text-stone-100">Lumina Partner Circle</strong> to receive approved updates and support prompts.
                  </p>
                </div>

                <div className="bg-[#faf8f6] dark:bg-[#23201d] py-3 px-4 rounded-xl border border-stone-200/80 dark:border-[#342f2b] flex items-center justify-between">
                  <span className="text-xs font-medium text-stone-500 dark:text-stone-400">Invitation code</span>
                  <span className="text-base font-mono font-semibold text-stone-900 dark:text-stone-100 tracking-wider tabular-nums">
                    {initialInviteCode}
                  </span>
                </div>

                <div className="space-y-2.5 pt-1">
                  <button
                    type="button"
                    id="btn-partner-signup"
                    onClick={() => {
                      setRegisterRole('partner');
                      setWelcomeStep('auth_creation');
                      setScreen('email_signup');
                    }}
                    className="w-full h-11 px-4 bg-pink-600 hover:bg-pink-700 text-white font-semibold rounded-xl text-sm flex items-center justify-center gap-2 cursor-pointer transition-colors"
                  >
                    <UserPlus size={16} />
                    <span>Create companion account</span>
                  </button>

                  <button
                    type="button"
                    id="btn-partner-login"
                    onClick={() => {
                      setRegisterRole('partner');
                      setScreen('email_login');
                    }}
                    className="w-full h-11 px-4 bg-white dark:bg-[#23201d] border border-stone-200 dark:border-[#342f2b] rounded-xl hover:bg-stone-50 dark:hover:bg-[#2a2622] flex items-center justify-center gap-2 text-stone-800 dark:text-stone-100 font-semibold text-sm cursor-pointer transition-colors"
                  >
                    <Mail size={16} className="text-stone-500 dark:text-stone-400" />
                    <span>Sign in</span>
                  </button>

                  {onClearInvite && (
                    <button
                      type="button"
                      onClick={onClearInvite}
                      className="w-full py-2 bg-transparent text-stone-500 dark:text-stone-400 hover:text-stone-800 dark:hover:text-stone-200 text-xs font-medium transition-colors cursor-pointer"
                    >
                      Decline and use Tracker Mode
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* 1. RETURNING USER FLOW */}
            {!pendingRestoreUser && screen === 'returning' && (
              <div className="space-y-5 animate-fadeIn">
                <div className="space-y-1.5">
                  <h2 className="text-2xl font-serif text-stone-900 dark:text-stone-100 font-semibold tracking-tight">
                    Welcome back, {getDisplayName()}
                  </h2>
                  <p className="text-sm text-stone-600 dark:text-stone-400">
                    Verify with {biometricLabel} or sign in to unlock your sanctuary.
                  </p>
                </div>

                <div className="space-y-2.5 pt-1">
                  {biometricAvailable && (
                    <button
                      type="button"
                      onClick={() => handleBiometricAuth('face')}
                      disabled={loading}
                      className="w-full p-4 bg-white dark:bg-[#23201d] hover:bg-stone-50 dark:hover:bg-[#2a2622] border border-stone-200 dark:border-[#342f2b] rounded-xl flex items-center gap-3.5 cursor-pointer transition-colors"
                    >
                      <div className="w-10 h-10 bg-pink-50 dark:bg-pink-950/30 border border-pink-200/70 dark:border-pink-900/50 text-pink-600 dark:text-pink-400 rounded-lg flex items-center justify-center shrink-0">
                        <Fingerprint size={18} />
                      </div>
                      <div className="text-left flex-1 min-w-0">
                        <p className="text-sm font-semibold text-stone-900 dark:text-stone-100">{biometricLabel}</p>
                        <p className="text-xs text-stone-500 dark:text-stone-400">Verify identity with device hardware</p>
                      </div>
                      <ChevronRight size={16} className="text-stone-400 shrink-0" />
                    </button>
                  )}

                  {userHasConfiguredPin(getTargetUser()) && (
                    <button
                      type="button"
                      onClick={() => handleBiometricAuth('passcode')}
                      disabled={loading}
                      className="w-full p-4 bg-white dark:bg-[#23201d] hover:bg-stone-50 dark:hover:bg-[#2a2622] border border-stone-200 dark:border-[#342f2b] rounded-xl flex items-center gap-3.5 cursor-pointer transition-colors"
                    >
                      <div className="w-10 h-10 bg-stone-100 dark:bg-[#2e2a26] text-stone-700 dark:text-stone-200 rounded-lg flex items-center justify-center shrink-0">
                        <Lock size={17} />
                      </div>
                      <div className="text-left flex-1 min-w-0">
                        <p className="text-sm font-semibold text-stone-900 dark:text-stone-100">Security PIN</p>
                        <p className="text-xs text-stone-500 dark:text-stone-400">Unlock with your 4–6 digit PIN</p>
                      </div>
                      <ChevronRight size={16} className="text-stone-400 shrink-0" />
                    </button>
                  )}
                </div>

                <div className="pt-3 border-t border-stone-100 dark:border-[#2e2a26] flex flex-col gap-2.5 text-center">
                  <button
                    type="button"
                    onClick={() => {
                      setScreen('email_login');
                      setError('');
                      setNotice('');
                    }}
                    className="text-sm font-semibold text-pink-700 dark:text-pink-400 hover:underline transition-colors cursor-pointer"
                  >
                    Sign in with email &amp; password
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setScreen('welcome');
                      setError('');
                      setNotice('');
                    }}
                    className="text-xs font-medium text-stone-500 dark:text-stone-400 hover:text-stone-800 dark:hover:text-stone-200 transition-colors cursor-pointer"
                  >
                    Switch account or set up new device
                  </button>
                </div>
              </div>
            )}

            {/* 2. NO ACCOUNT / FIRST TIME USER */}
            {!pendingRestoreUser && screen === 'welcome' && (
              <div className="space-y-6 animate-fadeIn">
                <div className="space-y-2">
                  <span className="text-xs font-semibold tracking-wide text-pink-700 dark:text-pink-400 block">
                    Private cycle &amp; wellness
                  </span>
                  <h2 className="text-3xl font-serif text-stone-900 dark:text-stone-100 font-semibold tracking-tight leading-tight">
                    Welcome to Lumina
                  </h2>
                  <p className="text-sm text-stone-600 dark:text-stone-400 leading-relaxed">
                    Sign in to access your encrypted health logs or create a new personal sanctuary.
                  </p>
                </div>

                <div className="space-y-3 pt-1">
                  <button
                    type="button"
                    id="btn-welcome-signup"
                    onClick={() => {
                      setRegisterRole('tracker');
                      setScreen('email_signup');
                      setError('');
                      setNotice('');
                    }}
                    className="w-full h-12 px-5 bg-pink-600 hover:bg-pink-700 text-white font-semibold rounded-xl text-sm flex items-center justify-center gap-2 cursor-pointer transition-colors"
                  >
                    <span>Create account</span>
                    <ArrowRight size={16} />
                  </button>

                  <button
                    type="button"
                    id="btn-welcome-signin"
                    onClick={() => {
                      setScreen('email_login');
                      setError('');
                      setNotice('');
                    }}
                    className="w-full h-12 px-5 bg-white dark:bg-[#23201d] border border-stone-200 dark:border-[#342f2b] rounded-xl hover:bg-stone-50 dark:hover:bg-[#2a2622] flex items-center justify-center gap-2 text-stone-800 dark:text-stone-100 font-semibold text-sm cursor-pointer transition-colors"
                  >
                    <Mail size={16} className="text-stone-500 dark:text-stone-400" />
                    <span>Sign in with email</span>
                  </button>
                </div>
              </div>
            )}

            {/* Welcome Screen after Scan */}
            {!pendingRestoreUser && screen === 'scan_welcome' && (
              <div className="space-y-5 animate-fadeIn" id="scan-welcome-screen">
                <div className="space-y-1.5">
                  <h2 className="text-3xl font-serif text-stone-900 dark:text-stone-100 font-semibold tracking-tight leading-tight">
                    Welcome to Lumina
                  </h2>
                  <p className="text-sm text-stone-600 dark:text-stone-400">Your cycle, your sanctuary.</p>
                </div>

                <ul className="space-y-2.5 bg-[#faf8f6] dark:bg-[#23201d] p-4 rounded-xl border border-stone-200/80 dark:border-[#342f2b] text-xs font-medium text-stone-700 dark:text-stone-300">
                  <li className="flex items-center gap-2.5">
                    <Check size={14} className="text-pink-600 dark:text-pink-400 shrink-0" />
                    <span>Track your cycle and phase shifts</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Check size={14} className="text-pink-600 dark:text-pink-400 shrink-0" />
                    <span>Understand symptoms, mood, and fertility</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Check size={14} className="text-pink-600 dark:text-pink-400 shrink-0" />
                    <span>Stay connected to your wellness journey</span>
                  </li>
                </ul>

                <div className="space-y-2.5">
                  <button
                    type="button"
                    id="btn-scan-create-account"
                    onClick={() => {
                      setScreen('welcome');
                      setWelcomeStep('choose_experience');
                    }}
                    className="w-full h-11 px-4 bg-pink-600 hover:bg-pink-700 text-white font-semibold rounded-xl text-sm flex items-center justify-center gap-2 cursor-pointer transition-colors"
                  >
                    Create account
                  </button>

                  <button
                    type="button"
                    id="btn-scan-apple"
                    onClick={handleAppleLogin}
                    disabled={loading}
                    className="w-full h-11 px-4 bg-stone-900 dark:bg-stone-800 hover:bg-stone-800 dark:hover:bg-stone-700 text-white rounded-xl flex items-center justify-center gap-2 font-semibold text-sm cursor-pointer transition-colors"
                  >
                    <Smartphone size={15} />
                    <span>Continue with Apple</span>
                  </button>

                  <button
                    type="button"
                    id="btn-scan-email"
                    onClick={() => {
                      setScreen('email_signup');
                      setError('');
                      setNotice('');
                    }}
                    className="w-full h-11 px-4 bg-white dark:bg-[#23201d] border border-stone-200 dark:border-[#342f2b] text-stone-800 dark:text-stone-100 rounded-xl hover:bg-stone-50 dark:hover:bg-[#2a2622] flex items-center justify-center gap-2 font-semibold text-sm cursor-pointer transition-colors"
                  >
                    Continue with email
                  </button>
                </div>

                <div className="text-center pt-2 border-t border-stone-100 dark:border-[#2e2a26]">
                  <button
                    type="button"
                    onClick={() => {
                      setScreen('email_login');
                      setError('');
                      setNotice('');
                    }}
                    className="text-xs font-semibold text-pink-700 dark:text-pink-400 hover:underline transition-colors cursor-pointer"
                  >
                    Already have an account? Sign in
                  </button>
                </div>
              </div>
            )}

            {/* 3. EMAIL LOGIN PAGE */}
            {!pendingRestoreUser && !pending2faChallenge && screen === 'email_login' && (
              <div className="space-y-5 animate-fadeIn">
                <button
                  type="button"
                  onClick={() => {
                    setScreen('welcome');
                    setError('');
                    setNotice('');
                  }}
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 transition-colors cursor-pointer"
                >
                  <ArrowLeft size={14} /> Back
                </button>

                <div className="space-y-1">
                  <h3 className="text-2xl font-serif text-stone-900 dark:text-stone-100 font-semibold tracking-tight">Sign in</h3>
                  <p className="text-sm text-stone-600 dark:text-stone-400">Sign in with your verified email and password.</p>
                </div>

                <form onSubmit={handleEmailFormSubmit} className="space-y-4">
                  <div className="hidden" aria-hidden="true">
                    <label htmlFor="auth-login-website">Website</label>
                    <input
                      id="auth-login-website"
                      name="website"
                      type="text"
                      tabIndex={-1}
                      autoComplete="off"
                      value={honeypot}
                      onChange={(e) => setHoneypot(e.target.value)}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="login-email-input" className="block text-xs font-medium text-stone-700 dark:text-stone-300">
                      Email address
                    </label>
                    <input
                      id="login-email-input"
                      type="email"
                      aria-label="Email Address"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full h-11 px-3.5 bg-white dark:bg-[#23201d] border border-stone-200 dark:border-[#342f2b] rounded-xl text-sm text-stone-900 dark:text-stone-100 placeholder:text-stone-400 dark:placeholder:text-stone-500 outline-none focus:border-pink-500 transition-colors"
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="login-password-input" className="block text-xs font-medium text-stone-700 dark:text-stone-300">
                      Password
                    </label>
                    <input
                      id="login-password-input"
                      type="password"
                      aria-label="Security Password"
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full h-11 px-3.5 bg-white dark:bg-[#23201d] border border-stone-200 dark:border-[#342f2b] rounded-xl text-sm text-stone-900 dark:text-stone-100 placeholder:text-stone-400 dark:placeholder:text-stone-500 outline-none focus:border-pink-500 transition-colors"
                      required
                    />
                  </div>

                  <div className="flex justify-between items-center pt-0.5">
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                        className="accent-pink-600 w-4 h-4 rounded border-stone-300"
                      />
                      <span className="text-xs font-medium text-stone-600 dark:text-stone-300">Remember this device</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setError('');
                        setNotice('');
                        setScreen('forgot_password');
                      }}
                      className="text-xs font-semibold text-pink-700 dark:text-pink-400 hover:underline transition-colors cursor-pointer"
                    >
                      Forgot password?
                    </button>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full h-11 px-4 bg-pink-600 hover:bg-pink-700 text-white rounded-xl font-semibold text-sm transition-colors text-center cursor-pointer disabled:opacity-60"
                  >
                    {loading ? 'Signing in...' : 'Sign in'}
                  </button>
                </form>

                <div className="text-center pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setScreen('email_signup');
                      setError('');
                      setNotice('');
                    }}
                    className="text-xs font-medium text-pink-700 dark:text-pink-400 hover:underline cursor-pointer"
                  >
                    Need an account? Create one
                  </button>
                </div>
              </div>
            )}

            {/* 3B. DEDICATED FORGOT PASSWORD SCREEN */}
            {!pendingRestoreUser && !pending2faChallenge && screen === 'forgot_password' && (
              <ForgotPasswordScreen
                initialEmail={email}
                onEmailChange={(val) => setEmail(val)}
                onBackToSignIn={() => {
                  setError('');
                  setNotice('');
                  setPassword('');
                  setScreen('email_login');
                }}
              />
            )}

            {/* 3C. PASSWORD RESET COMPLETION SCREEN (FIREBASE oobCode) */}
            {!pendingRestoreUser && !pending2faChallenge && screen === 'reset_password_confirm' && (
              <ResetPasswordConfirmScreen
                oobCode={activeResetCode}
                onRequestNewLink={() => {
                  setActiveResetCode(null);
                  onClearPasswordReset?.(false);
                  setError('');
                  setNotice('');
                  setScreen('forgot_password');
                }}
                onResetConsumed={() => {
                  setActiveResetCode(null);
                }}
                onBackToSignIn={(prefillEmail, didCompleteReset) => {
                  setActiveResetCode(null);
                  onClearPasswordReset?.(Boolean(didCompleteReset));
                  if (prefillEmail) setEmail(prefillEmail);
                  setPassword('');
                  setError('');
                  setNotice(
                    didCompleteReset
                      ? 'Your password has been updated. Please sign in with your new password.'
                      : ''
                  );
                  setScreen('email_login');
                }}
              />
            )}

            {/* TWO-FACTOR AUTHENTICATION CHALLENGE */}
            {pending2faChallenge && (
              <div className="space-y-4 animate-fadeIn">
                <div className="space-y-1.5">
                  <div className="w-10 h-10 rounded-xl bg-pink-50 dark:bg-pink-950/30 border border-pink-200/70 dark:border-pink-900/50 text-pink-600 dark:text-pink-400 flex items-center justify-center">
                    <KeyRound size={18} aria-hidden="true" />
                  </div>
                  <h3 className="text-2xl font-serif text-stone-900 dark:text-stone-100 font-semibold">Two-factor verification</h3>
                  <p className="text-sm text-stone-600 dark:text-stone-400">
                    {useRecoveryCode
                      ? 'Enter one of your 8-character backup recovery codes.'
                      : 'Enter the 6-digit code from your authenticator app.'}
                  </p>
                </div>

                <form onSubmit={handleVerify2faSubmit} className="space-y-3">
                  <input
                    type="text"
                    inputMode={useRecoveryCode ? 'text' : 'numeric'}
                    maxLength={useRecoveryCode ? 12 : 6}
                    aria-label={useRecoveryCode ? 'Recovery code' : '6-digit two-factor code'}
                    placeholder={useRecoveryCode ? 'ABCD-EFGH' : '123456'}
                    value={twoFactorInput}
                    onChange={(e) => setTwoFactorInput(e.target.value)}
                    className="w-full h-12 px-4 bg-white dark:bg-[#23201d] border border-stone-200 dark:border-[#342f2b] rounded-xl text-center text-lg font-mono font-semibold tracking-[0.28em] tabular-nums text-stone-900 dark:text-stone-100 outline-none focus:border-pink-500"
                    required
                  />
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full h-11 px-4 bg-pink-600 hover:bg-pink-700 text-white rounded-xl font-semibold text-sm cursor-pointer transition-colors"
                  >
                    {loading ? 'Verifying...' : 'Verify & continue'}
                  </button>
                  <div className="flex items-center justify-between pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setUseRecoveryCode(!useRecoveryCode);
                        setTwoFactorInput('');
                        setError('');
                      }}
                      className="text-xs font-semibold text-pink-700 dark:text-pink-400 hover:underline cursor-pointer"
                    >
                      {useRecoveryCode ? 'Use authenticator app code' : 'Use a recovery code instead'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setPending2faChallenge(null);
                        setTwoFactorInput('');
                        setError('');
                      }}
                      className="text-xs font-medium text-stone-600 dark:text-stone-400 hover:underline cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* 4. EMAIL SIGNUP PAGE */}
            {!pendingRestoreUser && !pending2faChallenge && screen === 'email_signup' && (() => {
              const strength = evaluatePasswordStrength(password);
              return (
                <div className="space-y-4 animate-fadeIn w-full">
                  <button
                    type="button"
                    onClick={() => setScreen('welcome')}
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 transition-colors cursor-pointer"
                  >
                    <ArrowLeft size={14} /> Back
                  </button>

                  <div className="space-y-1">
                    <h3 className="text-2xl font-serif text-stone-900 dark:text-stone-100 font-semibold tracking-tight">Create account</h3>
                    <p className="text-sm text-stone-600 dark:text-stone-400">Set up your private cycle or companion profile.</p>
                  </div>

                  <form onSubmit={handleEmailFormSubmit} className="space-y-4">
                    <div className="hidden" aria-hidden="true">
                      <label htmlFor="auth-signup-website">Website</label>
                      <input
                        id="auth-signup-website"
                        name="website"
                        type="text"
                        tabIndex={-1}
                        autoComplete="off"
                        value={honeypot}
                        onChange={(e) => setHoneypot(e.target.value)}
                      />
                    </div>
                    <div className="max-h-[320px] overflow-y-auto pr-1 space-y-4 custom-scrollbar">
                      {/* Account Role */}
                      <div className="space-y-1.5">
                        <span className="block text-xs font-medium text-stone-700 dark:text-stone-300">Account type</span>
                        <div className="grid grid-cols-2 gap-1.5 bg-stone-100 dark:bg-[#23201d] p-1 rounded-xl border border-stone-200/60 dark:border-[#342f2b]">
                          <button
                            type="button"
                            onClick={() => setRegisterRole('tracker')}
                            className={`h-9 text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
                              registerRole === 'tracker' ? 'bg-white dark:bg-[#1a1816] text-stone-900 dark:text-stone-100 shadow-xs' : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100'
                            }`}
                          >
                            <Flower2 size={14} className={registerRole === 'tracker' ? 'text-pink-600 dark:text-pink-400' : 'text-stone-400'} />
                            <span>Tracker</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setRegisterRole('partner')}
                            className={`h-9 text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
                              registerRole === 'partner' ? 'bg-white dark:bg-[#1a1816] text-stone-900 dark:text-stone-100 shadow-xs' : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100'
                            }`}
                          >
                            <HeartHandshake size={14} className={registerRole === 'partner' ? 'text-pink-600 dark:text-pink-400' : 'text-stone-400'} />
                            <span>Partner</span>
                          </button>
                        </div>
                      </div>

                      {/* Required Fields Group */}
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-2.5">
                          <div className="space-y-1">
                            <label htmlFor="signup-first-name" className="block text-xs font-medium text-stone-700 dark:text-stone-300">First name</label>
                            <input
                              id="signup-first-name"
                              type="text"
                              placeholder="First name"
                              value={firstName}
                              onChange={(e) => setFirstName(e.target.value)}
                              className="w-full h-10 px-3 bg-white dark:bg-[#23201d] border border-stone-200 dark:border-[#342f2b] rounded-xl text-sm text-stone-900 dark:text-stone-100 outline-none focus:border-pink-500 transition-colors"
                              required
                            />
                          </div>
                          <div className="space-y-1">
                            <label htmlFor="signup-last-name" className="block text-xs font-medium text-stone-700 dark:text-stone-300">Last name</label>
                            <input
                              id="signup-last-name"
                              type="text"
                              placeholder="Last name"
                              value={lastName}
                              onChange={(e) => setLastName(e.target.value)}
                              className="w-full h-10 px-3 bg-white dark:bg-[#23201d] border border-stone-200 dark:border-[#342f2b] rounded-xl text-sm text-stone-900 dark:text-stone-100 outline-none focus:border-pink-500 transition-colors"
                              required
                            />
                          </div>
                        </div>

                        <div className="space-y-1">
                          <label htmlFor="signup-display-name" className="block text-xs font-medium text-stone-700 dark:text-stone-300">Display name</label>
                          <input
                            id="signup-display-name"
                            type="text"
                            placeholder="How Lumina greets you"
                            value={displayName}
                            onChange={(e) => setDisplayName(e.target.value)}
                            className="w-full h-10 px-3 bg-white dark:bg-[#23201d] border border-stone-200 dark:border-[#342f2b] rounded-xl text-sm text-stone-900 dark:text-stone-100 outline-none focus:border-pink-500 transition-colors"
                            required
                          />
                        </div>

                        {registerRole !== 'partner' && (
                          <div className="grid grid-cols-2 gap-2.5">
                            <div className="space-y-1">
                              <label htmlFor="signup-age" className="block text-xs font-medium text-stone-700 dark:text-stone-300">Age</label>
                              <input
                                id="signup-age"
                                type="number"
                                placeholder="25"
                                min="13"
                                max="120"
                                value={age}
                                onChange={(e) => setAge(e.target.value)}
                                className="w-full h-10 px-3 bg-white dark:bg-[#23201d] border border-stone-200 dark:border-[#342f2b] rounded-xl text-sm tabular-nums text-stone-900 dark:text-stone-100 outline-none focus:border-pink-500 transition-colors"
                                required
                              />
                            </div>
                            <div className="space-y-1">
                              <label htmlFor="signup-dob" className="block text-xs font-medium text-stone-700 dark:text-stone-300">Date of birth</label>
                              <input
                                id="signup-dob"
                                type="date"
                                value={dob}
                                onChange={(e) => setDob(e.target.value)}
                                className="w-full h-10 px-3 bg-white dark:bg-[#23201d] border border-stone-200 dark:border-[#342f2b] rounded-xl text-sm tabular-nums text-stone-900 dark:text-stone-100 outline-none focus:border-pink-500 transition-colors"
                                required
                              />
                            </div>
                          </div>
                        )}

                        <div className="space-y-1">
                          <label htmlFor="signup-email" className="block text-xs font-medium text-stone-700 dark:text-stone-300">Email address</label>
                          <input
                            id="signup-email"
                            type="email"
                            placeholder="you@example.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full h-10 px-3 bg-white dark:bg-[#23201d] border border-stone-200 dark:border-[#342f2b] rounded-xl text-sm text-stone-900 dark:text-stone-100 outline-none focus:border-pink-500 transition-colors"
                            required
                          />
                        </div>

                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            <label htmlFor="signup-password" className="text-xs font-medium text-stone-700 dark:text-stone-300">Password</label>
                            {password.length > 0 && (
                              <span className={`text-xs font-semibold ${
                                strength.valid ? 'text-emerald-700 dark:text-emerald-400' : strength.score >= 2 ? 'text-amber-700 dark:text-amber-400' : 'text-rose-700 dark:text-rose-400'
                              }`}>
                                {strength.label}
                              </span>
                            )}
                          </div>
                          <input
                            id="signup-password"
                            type="password"
                            placeholder="8+ characters with symbol & number"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full h-10 px-3 bg-white dark:bg-[#23201d] border border-stone-200 dark:border-[#342f2b] rounded-xl text-sm text-stone-900 dark:text-stone-100 outline-none focus:border-pink-500 transition-colors"
                            required
                          />
                          <p className="text-[11px] text-stone-500 dark:text-stone-400">
                            Include upper &amp; lowercase letters, a number, and a special character.
                          </p>
                        </div>
                      </div>

                      {/* Optional Fields Group */}
                      <div className="grid grid-cols-2 gap-2.5 pt-2 border-t border-stone-100 dark:border-[#2e2a26]">
                        <div className="space-y-1">
                          <label htmlFor="signup-country" className="block text-xs font-medium text-stone-600 dark:text-stone-400">Country (optional)</label>
                          <input
                            id="signup-country"
                            type="text"
                            placeholder="Country"
                            value={country}
                            onChange={(e) => setCountry(e.target.value)}
                            className="w-full h-10 px-3 bg-white dark:bg-[#23201d] border border-stone-200 dark:border-[#342f2b] rounded-xl text-sm text-stone-900 dark:text-stone-100 outline-none focus:border-pink-500 transition-colors"
                          />
                        </div>
                        <div className="space-y-1">
                          <label htmlFor="signup-timezone" className="block text-xs font-medium text-stone-600 dark:text-stone-400">Time zone (optional)</label>
                          <input
                            id="signup-timezone"
                            type="text"
                            placeholder="UTC"
                            value={timezone}
                            onChange={(e) => setTimezone(e.target.value)}
                            className="w-full h-10 px-3 bg-white dark:bg-[#23201d] border border-stone-200 dark:border-[#342f2b] rounded-xl text-sm text-stone-900 dark:text-stone-100 outline-none focus:border-pink-500 transition-colors"
                          />
                        </div>
                      </div>
                    </div>

                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                        className="accent-pink-600 w-4 h-4 rounded border-stone-300"
                      />
                      <span className="text-xs font-medium text-stone-600 dark:text-stone-300">Enable quick unlock &amp; remember device</span>
                    </label>

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full h-11 px-4 bg-pink-600 hover:bg-pink-700 text-white rounded-xl font-semibold text-sm transition-colors text-center cursor-pointer disabled:opacity-60"
                    >
                      {loading ? 'Creating account...' : 'Create account'}
                    </button>
                  </form>
                </div>
              );
            })()}
          </div>

          {/* Mobile / Compact Footer */}
          <div className="pt-4 border-t border-stone-100 dark:border-[#2e2a26] flex items-center justify-center gap-2 text-xs text-stone-500 dark:text-stone-400 lg:justify-start">
            <ShieldCheck size={14} className="text-pink-600 dark:text-pink-400 shrink-0" aria-hidden="true" />
            <span>Device-encrypted health records · Strictly private</span>
          </div>
        </div>
      </div>

      {/* GENUINE BIOMETRIC / SECURITY PIN VERIFICATION MODAL */}
      {biometricScanning !== 'none' && (
        <div className="fixed inset-0 bg-stone-950/55 backdrop-blur-xs flex flex-col items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-white dark:bg-[#1a1816] p-7 rounded-2xl shadow-xl border border-stone-200 dark:border-[#2e2a26] w-full max-w-sm flex flex-col items-center justify-center relative min-h-[400px]">
            <button
              type="button"
              onClick={() => {
                setBiometricScanning('none');
                setTypedPin('');
                setPasscodeError('');
              }}
              className="absolute top-4 right-4 w-8 h-8 rounded-lg bg-stone-100 dark:bg-[#23201d] hover:bg-stone-200 dark:hover:bg-[#2e2a26] flex items-center justify-center text-stone-600 dark:text-stone-300 transition-colors cursor-pointer"
              aria-label="Close verification"
            >
              <X size={16} />
            </button>

            {(biometricScanning === 'face' || biometricScanning === 'touch') && (
              <div className="flex flex-col items-center text-center space-y-5">
                <div className="relative w-20 h-20 flex items-center justify-center">
                  <div className={`w-16 h-16 rounded-2xl border flex items-center justify-center transition-colors ${biometricStatus === 'success' ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900/50 text-emerald-600 dark:text-emerald-400' : 'bg-pink-50 dark:bg-pink-950/40 border-pink-200 dark:border-pink-900/50 text-pink-600 dark:text-pink-400'}`}>
                    {biometricStatus === 'success' ? <Check size={28} /> : <Fingerprint size={28} />}
                  </div>
                </div>
                <div className="space-y-1.5">
                  <h3 className="text-stone-900 dark:text-stone-100 font-serif text-xl font-semibold">{biometricLabel}</h3>
                  <p className="text-xs text-stone-600 dark:text-stone-400 leading-relaxed max-w-[230px]">
                    {biometricStatus === 'scanning' && 'Waiting for native device authentication prompt...'}
                    {biometricStatus === 'success' && 'Identity verified cleanly.'}
                  </p>
                </div>
              </div>
            )}

            {biometricScanning === 'passcode' && (
              <div className="flex flex-col items-center w-full space-y-5 animate-fadeIn">
                <div className="text-center space-y-1">
                  <div className={`mx-auto w-10 h-10 rounded-xl flex items-center justify-center ${biometricStatus === 'success' ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400' : 'bg-pink-50 dark:bg-pink-950/40 text-pink-600 dark:text-pink-400'}`}>
                    {biometricStatus === 'success' ? <Check size={18} /> : <Lock size={17} />}
                  </div>
                  <h3 className="text-stone-900 dark:text-stone-100 font-serif text-lg font-semibold">Enter security PIN</h3>
                  <p className="text-xs text-stone-500 dark:text-stone-400">Enter your private 4–6 digit PIN</p>
                </div>

                <div className="flex gap-3 justify-center items-center h-5">
                  {[0, 1, 2, 3, 4, 5].map((idx) => (
                    <div
                      key={idx}
                      className={`w-2.5 h-2.5 rounded-full transition-all duration-150 ${
                        passcodeError ? 'bg-rose-500' :
                        biometricStatus === 'success' ? 'bg-emerald-500 scale-110' :
                        typedPin.length > idx ? 'bg-pink-600 scale-110' : 'bg-stone-200 dark:bg-[#342f2b]'
                      }`}
                    />
                  ))}
                </div>

                <div className="min-h-4 text-center">
                  {passcodeError && <p className="text-xs font-medium text-rose-600 dark:text-rose-400 animate-fadeIn">{passcodeError}</p>}
                </div>

                <div className="grid grid-cols-3 gap-3 justify-items-center w-full max-w-[216px]">
                  {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
                    <button
                      key={digit}
                      type="button"
                      disabled={biometricStatus === 'success'}
                      onClick={() => handlePasscodeDigit(digit)}
                      className="w-14 h-12 rounded-xl bg-stone-50 dark:bg-[#23201d] border border-stone-200 dark:border-[#342f2b] hover:bg-stone-100 dark:hover:bg-[#2e2a26] active:scale-95 transition-all text-base font-semibold tabular-nums text-stone-900 dark:text-stone-100 flex items-center justify-center cursor-pointer"
                    >
                      {digit}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => {
                      setBiometricScanning('none');
                      setTypedPin('');
                      setPasscodeError('');
                    }}
                    className="w-14 h-12 text-xs font-medium text-stone-500 dark:text-stone-400 hover:text-stone-800 dark:hover:text-stone-200 flex items-center justify-center cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={biometricStatus === 'success'}
                    onClick={() => handlePasscodeDigit('0')}
                    className="w-14 h-12 rounded-xl bg-stone-50 dark:bg-[#23201d] border border-stone-200 dark:border-[#342f2b] hover:bg-stone-100 dark:hover:bg-[#2e2a26] active:scale-95 transition-all text-base font-semibold tabular-nums text-stone-900 dark:text-stone-100 flex items-center justify-center cursor-pointer"
                  >
                    0
                  </button>
                  <button
                    type="button"
                    disabled={biometricStatus === 'success' || typedPin.length === 0}
                    onClick={handleBackspace}
                    aria-label="Backspace"
                    className="w-14 h-12 text-stone-600 dark:text-stone-300 hover:text-stone-900 dark:hover:text-stone-100 flex items-center justify-center active:scale-95 transition-all cursor-pointer disabled:opacity-40"
                  >
                    <Delete size={17} />
                  </button>
                </div>

                <button
                  type="button"
                  disabled={typedPin.length < 4 || biometricStatus === 'success'}
                  onClick={() => handlePasscodeSubmit()}
                  className="w-full max-w-[216px] h-10 bg-pink-600 hover:bg-pink-700 text-white rounded-xl text-sm font-semibold disabled:opacity-40 cursor-pointer transition-colors"
                >
                  Unlock
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Auth;
