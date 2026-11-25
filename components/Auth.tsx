import React, { useState, useEffect } from 'react';
import { User } from '../types';
import { auth, db } from '../services/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { 
  signInWithPopup, 
  GoogleAuthProvider,
  OAuthProvider,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
  sendPasswordResetEmail
} from 'firebase/auth';
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
  Scan, 
  Lock, 
  Check, 
  X, 
  Delete, 
  Mail, 
  ArrowLeft, 
  ShieldCheck, 
  Sparkles,
  Heart,
  Smartphone,
  ChevronRight,
  KeyRound
} from 'lucide-react';

interface AuthProps {
  onLogin: (user: User, rememberMe?: boolean) => void;
  initialInviteCode?: string | null;
  onClearInvite?: () => void;
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

const Auth: React.FC<AuthProps> = ({ onLogin, initialInviteCode, onClearInvite, latestCloudUser, latestCloudLoading }) => {
  const [connectionMode, setConnectionMode] = useState<'cloud' | 'offline'>(() =>
    typeof navigator !== 'undefined' && navigator.onLine === false ? 'offline' : 'cloud'
  );
  const [screen, setScreen] = useState<'returning' | 'welcome' | 'email_login' | 'email_signup' | 'partner_invite' | 'scan_welcome'>(() => {
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
  const [notice, setNotice] = useState('');
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

      if (!initialInviteCode) {
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

    if (initialInviteCode) {
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
  }, [initialInviteCode, latestCloudUser]);

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
      setError('No saved profile is available on this device. Please sign in with Email/Password or Google.');
      return;
    }

    const remoteEpoch = targetUser.securitySettings?.sessionEpoch || 1;
    const localEpoch = targetUser.id ? getLocalSessionEpoch(targetUser.id) : 1;
    if (remoteEpoch > localEpoch) {
      await secureStorage.removeItem('biometric_hint_v1');
      setScreen('email_login');
      setError('Session expired after logging out of all devices. Please sign in with Email/Password or Google.');
      return;
    }

    const isCloudProfile = !targetUser.id.startsWith('offline_');
    if (isCloudProfile && auth.currentUser?.uid !== targetUser.id) {
      setScreen('email_login');
      setError('Your cloud session requires fresh sign-in. Please sign in with Email/Password or Continue with Google.');
      return;
    }

    if (type === 'passcode') {
      if (!userHasConfiguredPin(targetUser)) {
        setScreen('email_login');
        setError('No private Security PIN has been created yet. Sign in with your password or Google, then set a PIN in Settings.');
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
      setError('No Security PIN is set on this account yet. Sign in with Email or Google.');
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

  // Real Google OAuth Login
  const handleGoogleLogin = async () => {
    setLoading(true);
    setError('');
    setNotice('');
    try {
      const provider = new GoogleAuthProvider();
      const userCredential = await signInWithPopup(auth, provider);
      const fbUser = userCredential.user;

      const docSnap = await getDoc(doc(db, "users", fbUser.uid));
      if (docSnap.exists()) {
        const existingData = docSnap.data() as User;
        handleExistingUserLogin(existingData, () => {
          handleSaveCredentials(existingData.email, 'google', existingData.name);
        }, 'google');
        return;
      }

      const newUser: User = {
        id: fbUser.uid,
        name: fbUser.displayName || 'Lumina Member',
        email: fbUser.email || '',
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

      await syncUser(newUser);
      localStorage.setItem('lumina_remember_me', rememberMe ? 'true' : 'false');
      await saveEncryptedSessionUser(newUser, rememberMe);
      handleSaveCredentials(newUser.email, 'google', newUser.name);
      setUserProperties({ userId: newUser.id, email: newUser.email, isPartner: newUser.isPartner });
      trackSignUp('google', newUser.isPartner);
      onLogin(newUser, rememberMe);
    } catch (fbErr: any) {
      logCrashReport(fbErr, 'Authentication Error', { provider: 'google' });
      const code = fbErr?.code || '';
      if (code === 'auth/popup-closed-by-user') {
        setError('Google sign-in popup was closed before completing. Please try again.');
      } else if (code === 'auth/popup-blocked') {
        setError('Popup was blocked by your browser. Please allow popups for this site and try again.');
      } else {
        setError("Google Sign-In could not be completed. Please try again or use email sign-in.");
      }
    } finally {
      setLoading(false);
    }
  };

  // Real Firebase Apple OAuth Sign-In (never simulated)
  const handleAppleLogin = async () => {
    setLoading(true);
    setError('');
    setNotice('');
    try {
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
        setError('Apple Sign-In is not enabled in Firebase Authentication Console yet. Please use Google or Email Sign-In.');
      } else if (code === 'auth/popup-closed-by-user') {
        setError('Apple sign-in was cancelled.');
      } else {
        setError('Apple Sign-In could not be completed. Please try Google or Email Sign-In.');
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
          'You appear to be offline and this email has no cached sign-in verifier on this device yet. Connect to the internet to sign in with Email or Google.'
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

      if (code === 'auth/operation-not-allowed' || msg.includes('operation-not-allowed')) {
        setError(
          'Email/Password sign-in is not currently enabled in Firebase Authentication Console. Use "Continue with Google" below, or enable Email/Password under Firebase Console → Authentication → Sign-in method.'
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
        setError('An account already exists with this email. Sign in below or tap "Continue with Google" if you originally registered with Google.');
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
            : `Incorrect email or password (${lockStatus.remainingAttempts} attempt(s) left). If you originally signed up with Google, tap "Continue with Google" below.`
        );
        setLoading(false);
        return;
      }

      // Only fall back to encrypted offline verifier when there is a real network connectivity failure
      if (code.includes('network-request-failed') || (typeof navigator !== 'undefined' && navigator.onLine === false)) {
        await handleOfflineLoginOrSignup();
        return;
      }

      setError('Unable to complete cloud sign-in right now. Please try again or use "Continue with Google".');
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

  const handleForgotPassword = async () => {
    setError('');
    setNotice('');
    const cleanEmail = sanitizeTextInput(email, 160).toLowerCase();
    if (!isValidEmailAddress(cleanEmail)) {
      setError("Please enter a valid email address first so we can send a reset link.");
      return;
    }
    const rate = checkClientRateLimit('password_reset', 3, 60_000);
    if (!rate.allowed) {
      setError(`Please wait ${rate.retryAfterSec}s before requesting another password reset link.`);
      return;
    }
    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, cleanEmail);
      setNotice(
        `Password reset requested for ${cleanEmail}. Check Inbox, Spam, and Promotions for an email from noreply@coral-gizmo-05xj8.firebaseapp.com. Note: if this account uses Google Sign-In (no email password was set), no reset email is sent — tap "Continue with Google" instead.`
      );
    } catch (fbErr: any) {
      const code = String(fbErr?.code || '');
      if (code === 'auth/operation-not-allowed') {
        setError(
          'Password reset is unavailable because Email/Password sign-in is disabled in Firebase Authentication Console. Use "Continue with Google" or enable Email/Password in Firebase Console.'
        );
      } else if (code === 'auth/too-many-requests') {
        setError('Too many reset requests were sent recently. Please wait a few minutes before trying again.');
      } else if (code === 'auth/network-request-failed') {
        setError('Network error while contacting Firebase. Please check your internet connection and try again.');
      } else {
        setError("We couldn't dispatch a password reset email right now. Check the email address or use Continue with Google.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#fffafb] flex items-center justify-center p-4 relative overflow-hidden select-none">
      {/* Elegantly Crafted Ambient Background Blobs */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-pink-150 rounded-full blur-[100px] opacity-35"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-rose-100 rounded-full blur-[120px] opacity-40"></div>
      
      {/* Device Frame Wrapper to simulate true mobile application look */}
      <div className="bg-white/70 backdrop-blur-3xl px-6 py-10 md:p-12 rounded-[3.25rem] shadow-[0_24px_60px_rgba(251,113,133,0.08)] w-full max-w-md z-10 border border-white/60 flex flex-col items-center min-h-[620px] justify-between relative animate-fadeIn">
        
        {/* App Branding Header */}
        <div className="text-center mt-2">
          <div className="w-12 h-12 bg-gradient-to-tr from-pink-400 to-rose-450 rounded-2xl flex items-center justify-center shadow-md shadow-pink-100/50 mx-auto mb-3 hover:rotate-6 transition-transform duration-350">
            <Heart className="text-white fill-white" size={20} />
          </div>
          <h1 className="text-4xl font-serif text-pink-500 font-extrabold italic tracking-tight">Lumina</h1>
          <p className="text-pink-300 uppercase tracking-[0.3em] text-[8px] font-bold mt-1">Sanctuary of Wellness</p>
        </div>

        {/* Dynamic view switcher based on App Open Experience Design */}
        <div className="w-full flex-1 flex flex-col justify-center my-6 space-y-6">
          
          {/* Output Errors & Notices in user-friendly dialogue */}
          {error && (
            <div role="alert" className="w-full bg-rose-50 text-rose-700 text-[11px] text-center font-medium p-4 rounded-2xl border border-rose-200 animate-fadeIn leading-relaxed">
              {error}
            </div>
          )}
          {notice && (
            <div role="status" className="w-full bg-emerald-50 text-emerald-800 text-[11px] text-center font-medium p-4 rounded-2xl border border-emerald-200 animate-fadeIn leading-relaxed">
              {notice}
            </div>
          )}


          {pendingRestoreUser && (
            <div className="space-y-6 animate-fadeIn py-4">
              <div className="text-center space-y-3">
                <span className="text-5xl animate-bounce inline-block">
                  {pendingRestoreUser.isPartner ? "💞" : "☁️"}
                </span>
                <h2 className="text-2xl font-serif text-pink-950 font-black tracking-tight leading-tight">
                  {pendingRestoreUser.isPartner ? "Restore your Lumina Partner connection?" : "Restore your Lumina data?"}
                </h2>
                <div className="w-12 h-0.5 bg-gradient-to-r from-pink-400 to-rose-450 mx-auto my-2" />
                <p className="text-xs text-gray-500 italic font-serif leading-relaxed px-1">
                  {pendingRestoreUser.isPartner ? (
                    <span>
                      Welcome back, <strong className="text-pink-600 font-bold">{pendingRestoreUser.name}</strong>! We discovered your secure Partner backup containing your companion linkages, companion settings, and reminder templates.
                    </span>
                  ) : (
                    <span>
                      Welcome, <strong className="text-pink-600 font-bold">{pendingRestoreUser.name}</strong>! We discovered a secure Cloud Backup synced to your profile containing your period history, cycle logs, moods, symptoms, and preferences.
                    </span>
                  )}
                </p>
              </div>

              {pendingRestoreUser.isPartner ? (
                <div className="bg-indigo-50/20 border border-indigo-100/50 p-4 rounded-2xl text-left text-[11px] text-gray-600 space-y-2">
                  <p className="font-sans font-bold uppercase tracking-wider text-[8px] text-[#db2777]">🎁 Available Companion Backups:</p>
                  <ul className="grid grid-cols-2 gap-x-2 gap-y-1 list-disc list-inside font-medium font-serif italic text-gray-500">
                    <li>Partner connection sync</li>
                    <li>Support custom tips</li>
                    <li>Shared profile configs</li>
                    <li>Assigned comfort cards</li>
                  </ul>
                </div>
              ) : (
                <div className="bg-pink-50/15 border border-pink-100/50 p-4 rounded-2xl text-left text-[11px] text-gray-600 space-y-2">
                  <p className="font-sans font-bold uppercase tracking-wider text-[8px] text-pink-500">🎁 Available Cloud Backups:</p>
                  <ul className="grid grid-cols-2 gap-x-2 gap-y-1 list-disc list-inside font-medium font-serif italic text-gray-500">
                    <li>Cycle & period history</li>
                    <li>Symptom & mood logs</li>
                    <li>Contraceptive profiles</li>
                    <li>Diary entries & logs</li>
                  </ul>
                </div>
              )}

              <div className="space-y-3.5 pt-3">
                <button
                  type="button"
                  id="btn-confirm-restore"
                  onClick={async () => {
                    localStorage.setItem('lumina_remember_me', rememberMe ? 'true' : 'false');
                    await saveEncryptedSessionUser(pendingRestoreUser, rememberMe);
                    onLogin(pendingRestoreUser, rememberMe);
                    setPendingRestoreUser(null);
                  }}
                  className={`w-full py-4 bg-gradient-to-r ${pendingRestoreUser.isPartner ? "from-[#db2777] to-rose-400" : "from-pink-400 to-rose-450"} text-white font-bold rounded-2xl text-[10px] uppercase tracking-widest shadow-md shadow-pink-100 hover:scale-[1.01] active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer`}
                >
                  📥 {pendingRestoreUser.isPartner ? "Restore Partner Link" : "Restore from Cloud Backup"}
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
                  className="w-full py-4.5 bg-white border border-pink-100 rounded-2xl text-pink-500 hover:text-pink-600 font-bold text-[10px] uppercase tracking-widest hover:bg-pink-50/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  {pendingRestoreUser.isPartner ? "Start with New Connection" : "🌱 Continue as New User"}
                </button>
              </div>
            </div>
          )}

          {/* PARTNER INVITATION DETECTED FLOW */}
          {!pendingRestoreUser && screen === 'partner_invite' && (
            <div className="space-y-6 animate-fadeIn py-4">
              <div className="text-center space-y-3">
                <span className="text-5xl animate-bounce inline-block">💞</span>
                <h2 className="text-2xl font-serif text-pink-950 font-black tracking-tight leading-tight px-2">
                  🌸 {inviteSenderName || 'Your Partner'} invited you to join their Lumina Partner Circle.
                </h2>
                <div className="w-12 h-0.5 bg-gradient-to-r from-pink-400 to-rose-450 mx-auto my-2" />
                <p className="text-xs text-gray-500 italic font-serif leading-relaxed px-1">
                  Connect securely with your partner via <strong className="text-pink-600">Lumina Partner Circle</strong> to stay in perfect sync.
                </p>
                <div className="bg-pink-50/50 py-3 px-6 rounded-2xl border border-pink-100 inline-block">
                  <p className="text-[10px] text-pink-400 uppercase tracking-widest font-black mb-1">Invitation Code</p>
                  <span className="text-lg font-mono font-bold text-pink-600 tracking-wider">
                    {initialInviteCode}
                  </span>
                </div>
              </div>

              <div className="space-y-3.5 pt-3">
                <button
                  type="button"
                  id="btn-partner-signup"
                  onClick={() => {
                    setRegisterRole('partner');
                    setWelcomeStep('auth_creation');
                    setScreen('email_signup');
                  }}
                  className="w-full py-4 bg-gradient-to-r from-pink-400 to-rose-450 hover:scale-[1.01] active:scale-95 text-white font-bold rounded-2xl text-[10px] uppercase tracking-widest shadow-md shadow-pink-150 flex items-center justify-center gap-2 cursor-pointer transition-all"
                >
                  <Sparkles size={13} />
                  <span>Create Account</span>
                </button>

                <button
                  type="button"
                  id="btn-partner-login"
                  onClick={() => {
                    setRegisterRole('partner');
                    setScreen('email_login');
                  }}
                  className="w-full py-4 bg-white border border-pink-100 rounded-2xl hover:scale-[1.01] active:scale-95 flex items-center justify-center gap-3 text-pink-850 font-bold text-[10px] uppercase tracking-widest cursor-pointer shadow-sm hover:bg-rose-50/30 transition-all"
                >
                  <span>✉️ Sign In</span>
                </button>

                {onClearInvite && (
                  <button
                    type="button"
                    onClick={onClearInvite}
                    className="w-full py-2.5 bg-transparent text-gray-400 hover:text-gray-600 text-[9px] uppercase tracking-widest font-bold transition-colors cursor-pointer"
                  >
                    ✕ Decline / Use Tracker Mode
                  </button>
                )}
              </div>
            </div>
          )}

          {/* 1. RETURNING USER FLOW */}
          {!pendingRestoreUser && screen === 'returning' && (
            <div className="space-y-6 animate-fadeIn">
              <div className="text-center space-y-1.5">
                <h2 className="text-2xl font-serif text-pink-900 font-semibold">Welcome back, {getDisplayName()} 💕</h2>
                <p className="text-[11px] text-gray-500 italic font-serif">Verify with {biometricLabel} or sign in to unlock your sanctuary.</p>
              </div>

              {/* Real Biometric & PIN Options */}
              <div className="space-y-3 pt-2">
                {biometricAvailable && (
                  <button
                    type="button"
                    onClick={() => handleBiometricAuth('face')}
                    disabled={loading}
                    className="w-full py-4.5 bg-white hover:bg-rose-50/40 border border-pink-100/60 rounded-2xl flex items-center px-6 gap-4 hover:scale-[1.01] active:scale-95 hover:border-pink-300 shadow-sm cursor-pointer transition-all"
                  >
                    <div className="w-9 h-9 bg-pink-50 text-pink-500 rounded-xl flex items-center justify-center">
                      <Fingerprint size={18} />
                    </div>
                    <div className="text-left flex-1">
                      <p className="text-[10px] font-bold text-pink-900 uppercase tracking-wider">{biometricLabel}</p>
                      <p className="text-[8px] text-gray-500">Verify identity with native device hardware</p>
                    </div>
                    <ChevronRight size={14} className="text-pink-200" />
                  </button>
                )}

                {userHasConfiguredPin(getTargetUser()) && (
                  <button
                    type="button"
                    onClick={() => handleBiometricAuth('passcode')}
                    disabled={loading}
                    className="w-full py-4.5 bg-white hover:bg-rose-50/40 border border-pink-100/60 rounded-2xl flex items-center px-6 gap-4 hover:scale-[1.01] active:scale-95 hover:border-pink-300 shadow-sm cursor-pointer transition-all"
                  >
                    <div className="w-9 h-9 bg-pink-50 text-pink-500 rounded-xl flex items-center justify-center">
                      <Lock size={16} />
                    </div>
                    <div className="text-left flex-1">
                      <p className="text-[10px] font-bold text-pink-900 uppercase tracking-wider">Security PIN</p>
                      <p className="text-[8px] text-gray-500">Unlock with your private 4–6 digit PIN</p>
                    </div>
                    <ChevronRight size={14} className="text-pink-200" />
                  </button>
                )}
              </div>

              <div className="text-center pt-2 flex flex-col gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    setScreen('email_login');
                    setError('');
                    setNotice('');
                  }}
                  className="text-[10px] font-sans font-bold uppercase tracking-widest text-pink-500 hover:text-pink-600 transition-colors cursor-pointer"
                >
                  Sign In with Email / Google
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setScreen('welcome');
                    setError('');
                    setNotice('');
                  }}
                  className="text-[9px] font-serif font-semibold italic text-pink-400 hover:text-pink-600 transition-colors cursor-pointer"
                >
                  Switch Account or Setup New Device ✈
                </button>
              </div>
            </div>
          )}


          {/* 2. NO ACCOUNT / FIRST TIME USER */}
          {!pendingRestoreUser && screen === 'welcome' && (
            <div className="space-y-8 animate-fadeIn text-center py-6">
              <div className="space-y-3">
                <span className="text-5xl animate-bounce inline-block">🌸</span>
                <h2 className="text-3xl font-serif text-pink-950 font-black tracking-tight leading-tight">Welcome to Lumina</h2>
                <div className="w-12 h-0.5 bg-gradient-to-r from-pink-300 to-rose-400 mx-auto my-1" />
                <p className="text-xs text-pink-700 font-medium italic font-serif leading-relaxed px-1">
                  Your cycle, your sanctuary.
                </p>
              </div>

              <div className="space-y-3.5 pt-4">
                <button
                  type="button"
                  id="btn-welcome-signup"
                  onClick={() => {
                    setRegisterRole('tracker');
                    setScreen('email_signup');
                    setError('');
                    setNotice('');
                  }}
                  className="w-full py-4.5 bg-gradient-to-r from-pink-400 to-rose-450 hover:scale-[1.01] active:scale-95 text-white font-bold rounded-2xl text-[10px] uppercase tracking-[0.15em] shadow-md shadow-pink-150 flex items-center justify-center gap-2 cursor-pointer transition-all"
                >
                  <Sparkles size={12} />
                  <span>Create Account</span>
                </button>

                <button
                  type="button"
                  id="btn-welcome-signin"
                  onClick={() => {
                    setScreen('email_login');
                    setError('');
                    setNotice('');
                  }}
                  className="w-full py-4.5 bg-white border border-pink-150 rounded-2xl hover:scale-[1.01] active:scale-95 flex items-center justify-center gap-3 text-pink-850 font-bold text-[10px] uppercase tracking-[0.15em] cursor-pointer shadow-sm hover:bg-rose-50/20 transition-all"
                >
                  <span>✉️ Sign In</span>
                </button>

                <button
                  type="button"
                  id="btn-welcome-google"
                  onClick={handleGoogleLogin}
                  disabled={loading}
                  className="w-full py-4 bg-white border border-pink-150 rounded-2xl hover:scale-[1.01] active:scale-95 flex items-center justify-center gap-3 text-stone-700 font-bold text-[10px] uppercase tracking-[0.12em] cursor-pointer shadow-xs hover:bg-rose-50/20 transition-all"
                >
                  <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-4 h-4" referrerPolicy="no-referrer" />
                  <span>Continue with Google</span>
                </button>
              </div>
            </div>
          )}


          {/* Welcome Screen after Scan */}
          {!pendingRestoreUser && screen === 'scan_welcome' && (
            <div className="space-y-6 text-center animate-fadeIn max-w-sm mx-auto" id="scan-welcome-screen">
              <div className="space-y-3">
                <span className="text-4xl animate-bounce inline-block">🌸</span>
                <h2 className="text-3xl font-serif text-pink-950 font-black tracking-tight leading-tight">Welcome to Lumina</h2>
                <p className="text-sm text-pink-700 font-medium italic font-serif">Your cycle, your sanctuary.</p>
              </div>

              <div className="w-12 h-0.5 bg-pink-200/80 mx-auto my-4" />

              <div className="space-y-3.5 text-left bg-pink-50/20 p-5 rounded-3xl border border-pink-100/50">
                <div className="flex items-center gap-3 text-[10px] font-bold text-pink-950 uppercase tracking-widest">
                  <span className="text-pink-500">✨</span>
                  <span>Track your cycle</span>
                </div>
                <div className="flex items-center gap-3 text-[10px] font-bold text-pink-950 uppercase tracking-widest">
                  <span className="text-pink-500">✨</span>
                  <span>Understand your body</span>
                </div>
                <div className="flex items-center gap-3 text-[10px] font-bold text-pink-950 uppercase tracking-widest">
                  <span className="text-pink-500">✨</span>
                  <span>Stay connected to your wellness journey</span>
                </div>
              </div>

              <div className="space-y-2.5 pt-2">
                <button
                  type="button"
                  id="btn-scan-create-account"
                  onClick={() => {
                    setScreen('welcome');
                    setWelcomeStep('choose_experience');
                  }}
                  className="w-full py-4.5 bg-gradient-to-r from-pink-500 to-rose-450 hover:scale-[1.01] active:scale-95 text-white font-bold rounded-2xl text-[9px] uppercase tracking-widest shadow-md shadow-pink-100 flex items-center justify-center gap-2 cursor-pointer transition-all"
                >
                  Create Account
                </button>

                <button
                  type="button"
                  id="btn-scan-google"
                  onClick={handleGoogleLogin}
                  className="w-full py-4 bg-white border border-pink-100 rounded-2xl hover:scale-[1.01] active:scale-95 flex items-center justify-center gap-3 text-pink-900 font-bold text-[9px] uppercase tracking-widest cursor-pointer shadow-sm hover:bg-rose-50/30 transition-all"
                >
                  <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-4 h-4" referrerPolicy="no-referrer" />
                  <span>Continue with Google</span>
                </button>

                <button
                  type="button"
                  id="btn-scan-apple"
                  onClick={handleAppleLogin}
                  disabled={loading}
                  className="w-full py-4 bg-black text-white rounded-2xl hover:scale-[1.01] active:scale-95 flex items-center justify-center gap-3 font-bold text-[9px] uppercase tracking-widest cursor-pointer shadow-sm hover:opacity-90 transition-all"
                >
                  <Smartphone size={14} className="text-white fill-white" />
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
                  className="w-full py-4 bg-white border border-pink-100 text-pink-500 rounded-2xl hover:scale-[1.01] active:scale-95 flex items-center justify-center gap-3 font-bold text-[9px] uppercase tracking-widest cursor-pointer shadow-sm hover:bg-pink-50/10 transition-all"
                >
                  Continue with Email
                </button>
              </div>

              <div className="text-center pt-3 border-t border-pink-50">
                <button
                  type="button"
                  onClick={() => {
                    setScreen('email_login');
                    setError('');
                    setNotice('');
                  }}
                  className="text-[10px] font-sans font-bold uppercase tracking-widest text-pink-500 hover:text-pink-600 transition-colors cursor-pointer"
                >
                  Already have an account? Log In
                </button>
              </div>
            </div>
          )}


          {/* 3. EMAIL LOGIN PAGE */}
          {!pendingRestoreUser && !pending2faChallenge && screen === 'email_login' && (
            <div className="space-y-4 animate-fadeIn">
              <button
                type="button"
                onClick={() => {
                  setScreen('welcome');
                  setError('');
                  setNotice('');
                }}
                className="inline-flex items-center gap-1.5 text-[10px] font-sans font-bold uppercase tracking-widest text-pink-700 hover:text-pink-800 cursor-pointer"
              >
                <ArrowLeft size={12} /> Back
              </button>

              <div className="text-center space-y-1">
                <h3 className="text-xl font-serif text-pink-950 font-bold italic">Secure Entry</h3>
                <p className="text-xs text-stone-600">Sign in with your verified email &amp; password or Google.</p>
              </div>

              <form onSubmit={handleEmailFormSubmit} className="space-y-3 pt-1">
                {/* Spam / Bot Honeypot */}
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
                <input
                  type="email"
                  aria-label="Email Address"
                  placeholder="EMAIL ADDRESS"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-5 py-4 bg-white/80 border border-pink-200 rounded-2xl text-xs font-semibold text-stone-900 placeholder:text-stone-500 outline-none focus:border-pink-400 transition-colors"
                  required
                />
                <input
                  type="password"
                  aria-label="Security Password"
                  placeholder="SECURITY PASSWORD"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-5 py-4 bg-white/80 border border-pink-200 rounded-2xl text-xs font-semibold text-stone-900 placeholder:text-stone-500 outline-none focus:border-pink-400 transition-colors"
                  required
                />

                <div className="flex justify-between items-center px-1 pt-0.5">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="accent-pink-600 w-3.5 h-3.5 rounded border-pink-300"
                    />
                    <span className="text-[10px] font-bold text-stone-600 uppercase tracking-wider">Remember Me</span>
                  </label>
                  <button
                    type="button"
                    onClick={handleForgotPassword}
                    className="text-[10px] font-bold text-pink-700 hover:text-pink-900 uppercase tracking-wider transition-colors cursor-pointer"
                  >
                    Forgot password?
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-4 bg-gradient-to-r from-pink-500 to-rose-500 text-white rounded-2xl font-bold text-xs tracking-[0.15em] shadow-md shadow-pink-100 hover:opacity-95 active:scale-95 transition-all text-center cursor-pointer"
                >
                  {loading ? "UNLOCKING SANCTUARY..." : "SECURE ENTRY"}
                </button>
              </form>

              <div className="relative flex items-center py-1">
                <div className="flex-grow border-t border-pink-100" />
                <span className="mx-3 text-[10px] font-bold uppercase tracking-widest text-stone-400">or</span>
                <div className="flex-grow border-t border-pink-100" />
              </div>

              <button
                type="button"
                id="btn-login-google"
                onClick={handleGoogleLogin}
                disabled={loading}
                className="w-full py-3.5 bg-white border border-pink-200 rounded-2xl flex items-center justify-center gap-3 text-stone-800 font-bold text-[10px] uppercase tracking-widest cursor-pointer shadow-xs hover:bg-rose-50/40 transition-all"
              >
                <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-4 h-4" referrerPolicy="no-referrer" />
                <span>Continue with Google</span>
              </button>

              <div className="text-center pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setScreen('email_signup');
                    setError('');
                    setNotice('');
                  }}
                  className="text-[10px] font-bold uppercase tracking-widest text-pink-600 hover:underline cursor-pointer"
                >
                  Need an account? Create one
                </button>
              </div>
            </div>
          )}

          {/* TWO-FACTOR AUTHENTICATION CHALLENGE */}
          {pending2faChallenge && (
            <div className="space-y-4 animate-fadeIn">
              <div className="text-center space-y-1.5">
                <div className="w-12 h-12 rounded-2xl bg-pink-50 border border-pink-200 text-pink-700 flex items-center justify-center mx-auto">
                  <KeyRound size={22} aria-hidden="true" />
                </div>
                <h3 className="text-xl font-serif text-pink-950 font-bold">Two-Factor Verification</h3>
                <p className="text-xs text-stone-600">
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
                  className="w-full px-5 py-4 bg-white border border-pink-200 rounded-2xl text-center text-base font-mono font-bold tracking-[0.3em] text-stone-900 outline-none focus:border-pink-400"
                  required
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-4 bg-gradient-to-r from-pink-500 to-rose-500 text-white rounded-2xl font-bold text-xs uppercase tracking-widest shadow-md cursor-pointer"
                >
                  {loading ? 'VERIFYING...' : 'VERIFY & ENTER SANCTUARY'}
                </button>
                <div className="flex items-center justify-between pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setUseRecoveryCode(!useRecoveryCode);
                      setTwoFactorInput('');
                      setError('');
                    }}
                    className="text-xs font-bold text-pink-700 hover:underline cursor-pointer"
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
                    className="text-xs font-bold text-stone-600 hover:underline cursor-pointer"
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
                  className="inline-flex items-center gap-1.5 text-[10px] font-sans font-bold uppercase tracking-widest text-pink-700 hover:text-pink-900 cursor-pointer"
                >
                  <ArrowLeft size={12} /> Back
                </button>

                <div className="text-center space-y-1">
                  <h3 className="text-xl font-serif text-pink-950 font-bold italic">Create Account</h3>
                  <p className="text-xs text-stone-600">Nurture and align with your companion.</p>
                </div>

                <form onSubmit={handleEmailFormSubmit} className="space-y-4 pt-1">
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
                  <div className="max-h-[300px] overflow-y-auto pr-1.5 space-y-3.5">
                    
                    {/* Account Role */}
                    <div className="space-y-1 bg-rose-50/40 p-2.5 rounded-2xl border border-pink-100">
                      <p className="text-[10px] font-extrabold text-pink-700 uppercase tracking-widest text-center">Select Account Role</p>
                      <div className="grid grid-cols-2 gap-2 bg-pink-100/40 p-1 rounded-xl border border-pink-200/50">
                        <button
                          type="button"
                          onClick={() => setRegisterRole('tracker')}
                          className={`py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all flex items-center justify-center gap-1 cursor-pointer ${
                            registerRole === 'tracker' ? 'bg-gradient-to-r from-pink-500 to-rose-500 text-white shadow-sm' : 'text-pink-800 hover:text-pink-950'
                          }`}
                        >
                          🌸 Tracker Mode
                        </button>
                        <button
                          type="button"
                          onClick={() => setRegisterRole('partner')}
                          className={`py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all flex items-center justify-center gap-1 cursor-pointer ${
                            registerRole === 'partner' ? 'bg-gradient-to-r from-pink-500 to-rose-500 text-white shadow-sm' : 'text-pink-800 hover:text-pink-950'
                          }`}
                        >
                          🧸 Companion Mode
                        </button>
                      </div>
                    </div>

                    {/* Required Fields Group */}
                    <div className="space-y-3">
                      <p className="text-[10px] font-extrabold text-stone-600 uppercase tracking-widest border-b border-pink-100 pb-1">Required Information</p>
                      
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <label htmlFor="signup-first-name" className="text-[10px] font-bold text-pink-700 uppercase tracking-wider px-1">First Name</label>
                          <input
                            id="signup-first-name"
                            type="text"
                            placeholder="FIRST NAME"
                            value={firstName}
                            onChange={(e) => setFirstName(e.target.value)}
                            className="w-full px-4 py-3 bg-white/80 border border-pink-200 rounded-xl text-xs font-semibold text-stone-900 outline-none focus:border-pink-400 transition-colors"
                            required
                          />
                        </div>
                        <div className="space-y-1">
                          <label htmlFor="signup-last-name" className="text-[10px] font-bold text-pink-700 uppercase tracking-wider px-1">Last Name</label>
                          <input
                            id="signup-last-name"
                            type="text"
                            placeholder="LAST NAME"
                            value={lastName}
                            onChange={(e) => setLastName(e.target.value)}
                            className="w-full px-4 py-3 bg-white/80 border border-pink-200 rounded-xl text-xs font-semibold text-stone-900 outline-none focus:border-pink-400 transition-colors"
                            required
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label htmlFor="signup-display-name" className="text-[10px] font-bold text-pink-700 uppercase tracking-wider px-1">Display Name</label>
                        <input
                          id="signup-display-name"
                          type="text"
                          placeholder="DISPLAY NAME"
                          value={displayName}
                          onChange={(e) => setDisplayName(e.target.value)}
                          className="w-full px-4 py-3 bg-white/80 border border-pink-200 rounded-xl text-xs font-semibold text-stone-900 outline-none focus:border-pink-400 transition-colors"
                          required
                        />
                      </div>

                      {registerRole !== 'partner' && (
                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-1">
                            <label htmlFor="signup-age" className="text-[10px] font-bold text-pink-700 uppercase tracking-wider px-1">Age</label>
                            <input
                              id="signup-age"
                              type="number"
                              placeholder="AGE"
                              min="13"
                              max="120"
                              value={age}
                              onChange={(e) => setAge(e.target.value)}
                              className="w-full px-4 py-3 bg-white/80 border border-pink-200 rounded-xl text-xs font-semibold text-stone-900 outline-none focus:border-pink-400 transition-colors"
                              required
                            />
                          </div>
                          <div className="space-y-1">
                            <label htmlFor="signup-dob" className="text-[10px] font-bold text-pink-700 uppercase tracking-wider px-1">Date of Birth</label>
                            <input
                              id="signup-dob"
                              type="date"
                              value={dob}
                              onChange={(e) => setDob(e.target.value)}
                              className="w-full px-4 py-3 bg-white/80 border border-pink-200 rounded-xl text-xs font-semibold text-stone-900 outline-none focus:border-pink-400 transition-colors"
                              required
                            />
                          </div>
                        </div>
                      )}

                      <div className="space-y-1">
                        <label htmlFor="signup-email" className="text-[10px] font-bold text-pink-700 uppercase tracking-wider px-1">Email Address</label>
                        <input
                          id="signup-email"
                          type="email"
                          placeholder="EMAIL ADDRESS"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="w-full px-4 py-3 bg-white/80 border border-pink-200 rounded-xl text-xs font-semibold text-stone-900 outline-none focus:border-pink-400 transition-colors"
                          required
                        />
                      </div>

                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between px-1">
                          <label htmlFor="signup-password" className="text-[10px] font-bold text-pink-700 uppercase tracking-wider">Choose Strong Password</label>
                          {password.length > 0 && (
                            <span className={`text-[10px] font-bold ${
                              strength.valid ? 'text-emerald-700' : strength.score >= 2 ? 'text-amber-700' : 'text-rose-700'
                            }`}>
                              {strength.label}
                            </span>
                          )}
                        </div>
                        <input
                          id="signup-password"
                          type="password"
                          placeholder="STRONG PASSWORD"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="w-full px-4 py-3 bg-white/80 border border-pink-200 rounded-xl text-xs font-semibold text-stone-900 outline-none focus:border-pink-400 transition-colors"
                          required
                        />
                        <p className="text-[10px] text-stone-600 px-1">
                          Use 8+ chars with upper/lowercase, a number, and a symbol.
                        </p>
                      </div>
                    </div>

                    {/* Optional Fields Group */}
                    <div className="space-y-3">
                      <p className="text-[10px] font-extrabold text-stone-600 uppercase tracking-widest border-b border-pink-100 pb-1">Optional Details</p>

                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <label htmlFor="signup-country" className="text-[10px] font-bold text-stone-600 uppercase tracking-wider px-1">Country</label>
                          <input
                            id="signup-country"
                            type="text"
                            placeholder="COUNTRY"
                            value={country}
                            onChange={(e) => setCountry(e.target.value)}
                            className="w-full px-4 py-3 bg-white/80 border border-pink-200 rounded-xl text-xs font-semibold text-stone-900 outline-none focus:border-pink-400 transition-colors"
                          />
                        </div>
                        <div className="space-y-1">
                          <label htmlFor="signup-timezone" className="text-[10px] font-bold text-stone-600 uppercase tracking-wider px-1">Time Zone</label>
                          <input
                            id="signup-timezone"
                            type="text"
                            placeholder="UTC"
                            value={timezone}
                            onChange={(e) => setTimezone(e.target.value)}
                            className="w-full px-4 py-3 bg-white/80 border border-pink-200 rounded-xl text-xs font-semibold text-stone-900 outline-none focus:border-pink-400 transition-colors"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="px-1">
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                        className="accent-pink-600 w-3.5 h-3.5 rounded border-pink-300"
                      />
                      <span className="text-[10px] font-bold text-stone-600 uppercase tracking-wider leading-none">Enable Quick Biometric &amp; Remember Device</span>
                    </label>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-4 bg-gradient-to-r from-pink-500 to-rose-500 text-white rounded-2xl font-bold text-xs tracking-[0.15em] shadow-md shadow-pink-100 hover:opacity-95 active:scale-95 transition-all text-center cursor-pointer"
                  >
                    {loading ? "INITIALIZING SANCTUARY..." : "CREATE SANCTUARY"}
                  </button>
                </form>

                <button
                  type="button"
                  onClick={handleGoogleLogin}
                  disabled={loading}
                  className="w-full py-3.5 bg-white border border-pink-200 rounded-2xl flex items-center justify-center gap-3 text-stone-800 font-bold text-[10px] uppercase tracking-widest cursor-pointer shadow-xs hover:bg-rose-50/40 transition-all"
                >
                  <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-4 h-4" referrerPolicy="no-referrer" />
                  <span>Continue with Google</span>
                </button>
              </div>
            );
          })()}

        </div>

        {/* Small Elegant Footer */}
        <div className="text-center mt-3 border-t border-pink-100 pt-5 w-full">
          <p className="text-[11px] text-pink-700 font-bold uppercase tracking-wider flex items-center justify-center gap-2">
            <span>🛡️</span>
            <span>Private &amp; Encrypted Vault</span>
          </p>
          <p className="text-[11px] text-stone-600 italic max-w-xs mx-auto mt-1 leading-relaxed">
            Your metrics, journals, and health records remain device-encrypted and private.
          </p>
        </div>

      </div>

      {/* GENUINE BIOMETRIC / SECURITY PIN VERIFICATION MODAL */}
      {biometricScanning !== 'none' && (
        <div className="fixed inset-0 bg-white/90 backdrop-blur-xl flex flex-col items-center justify-center z-50 p-6 animate-fadeIn">
          <div className="bg-white p-8 rounded-[3rem] shadow-[0_24px_50px_rgba(244,114,182,0.12)] border border-pink-150/40 w-full max-w-sm flex flex-col items-center justify-center relative overflow-hidden min-h-[440px] animate-scaleIn">
            
            {/* Dismiss trigger */}
            <button 
              type="button"
              onClick={() => {
                setBiometricScanning('none');
                setTypedPin('');
                setPasscodeError('');
              }}
              className="absolute top-5 right-5 w-8 h-8 rounded-full bg-pink-50 hover:bg-pink-100 flex items-center justify-center text-pink-500 hover:text-pink-600 transition-colors cursor-pointer"
              aria-label="Close verification"
            >
              <X size={15} />
            </button>

            {(biometricScanning === 'face' || biometricScanning === 'touch') && (
              <div className="flex flex-col items-center text-center space-y-6">
                <div className="relative w-24 h-24 flex items-center justify-center">
                  <span className={`absolute inset-0 rounded-full border-4 border-dashed animate-spin-slow ${biometricStatus === 'success' ? 'border-emerald-400' : 'border-pink-300'}`}></span>
                  <div className={`w-18 h-18 rounded-full flex items-center justify-center transition-all duration-500 shadow-inner ${biometricStatus === 'success' ? 'bg-emerald-50 text-emerald-500' : 'bg-pink-50 text-pink-500'}`}>
                    {biometricStatus === 'success' ? <Check size={32} /> : <Fingerprint size={32} className="animate-pulse" />}
                  </div>
                </div>
                <div className="space-y-1.5">
                  <h3 className="text-pink-950 font-serif text-lg italic font-extrabold">{biometricLabel}</h3>
                  <p className="text-[11px] text-stone-600 leading-relaxed font-serif max-w-[220px]">
                    {biometricStatus === 'scanning' && 'Waiting for native device authentication prompt...'}
                    {biometricStatus === 'success' && 'Identity verified cleanly.'}
                  </p>
                </div>
              </div>
            )}

            {biometricScanning === 'passcode' && (
              <div className="flex flex-col items-center w-full space-y-5 animate-fadeIn">
                <div className="text-center space-y-1">
                  <div className={`mx-auto w-10 h-10 rounded-full flex items-center justify-center ${biometricStatus === 'success' ? 'bg-emerald-50 text-emerald-500' : 'bg-pink-50 text-pink-500'}`}>
                    {biometricStatus === 'success' ? <Check size={18} /> : <Lock size={16} className="text-pink-500" />}
                  </div>
                  <h3 className="text-pink-950 font-serif text-md font-extrabold italic">Enter Security PIN</h3>
                  <p className="text-[10px] text-stone-500 font-medium">Enter your private 4–6 digit PIN</p>
                </div>

                <div className="flex gap-3.5 justify-center items-center h-6">
                  {[0, 1, 2, 3, 4, 5].map((idx) => (
                    <div 
                      key={idx} 
                      className={`w-3 h-3 rounded-full transition-all duration-300 ${
                        passcodeError ? 'bg-rose-500' :
                        biometricStatus === 'success' ? 'bg-emerald-500 scale-110' :
                        typedPin.length > idx ? 'bg-pink-500 scale-110 shadow-[0_4px_12px_rgba(244,114,182,0.4)]' : 'bg-pink-100'
                      }`}
                    ></div>
                  ))}
                </div>

                <div className="min-h-4 text-center">
                  {passcodeError && <p className="text-[10px] font-bold text-rose-600 animate-fadeIn">{passcodeError}</p>}
                </div>

                <div className="grid grid-cols-3 gap-y-3.5 gap-x-5 justify-items-center w-full max-w-[220px]">
                  {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
                    <button
                      key={digit}
                      type="button"
                      disabled={biometricStatus === 'success'}
                      onClick={() => handlePasscodeDigit(digit)}
                      className="w-12 h-12 rounded-full bg-pink-50/30 border border-pink-100 hover:bg-pink-50 hover:border-pink-300 active:scale-90 transition-all text-xs font-bold text-pink-700 flex items-center justify-center shadow-xs cursor-pointer font-serif"
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
                    className="w-12 h-12 text-[9px] font-bold uppercase tracking-wider text-pink-500 hover:text-pink-700 flex items-center justify-center cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={biometricStatus === 'success'}
                    onClick={() => handlePasscodeDigit('0')}
                    className="w-12 h-12 rounded-full bg-pink-50/30 border border-pink-100 hover:bg-pink-50 hover:border-pink-300 active:scale-90 transition-all text-xs font-bold text-pink-700 flex items-center justify-center shadow-xs cursor-pointer font-serif"
                  >
                    0
                  </button>
                  <button
                    type="button"
                    disabled={biometricStatus === 'success' || typedPin.length === 0}
                    onClick={handleBackspace}
                    aria-label="Backspace"
                    className="w-12 h-12 text-pink-500 hover:text-pink-700 flex items-center justify-center active:scale-90 transition-all cursor-pointer"
                  >
                    <Delete size={15} />
                  </button>
                </div>

                <button
                  type="button"
                  disabled={typedPin.length < 4 || biometricStatus === 'success'}
                  onClick={() => handlePasscodeSubmit()}
                  className="w-full max-w-[220px] py-3 bg-gradient-to-r from-pink-500 to-rose-500 text-white rounded-2xl text-[10px] font-bold uppercase tracking-widest disabled:opacity-40 cursor-pointer"
                >
                  Unlock with PIN
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
