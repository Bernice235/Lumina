import { Capacitor } from '@capacitor/core';
import { BiometricAuth, BiometryError, BiometryErrorType, BiometryType } from '@aparajita/capacitor-biometric-auth';
import { User } from '../types';
import { secureStorage } from './secureStorage';

export interface BiometricCapability {
  available: boolean;
  enrolledForUser: boolean;
  platform: 'ios' | 'android' | 'web';
  biometryLabel: string;
  biometryType: 'face' | 'fingerprint' | 'passkey' | 'none';
  deviceHasPasscodeFallback: boolean;
  reason?: string;
}

export interface BiometricAuthResult {
  verified: boolean;
  method?: 'native_face_id' | 'native_touch_id' | 'native_biometric' | 'webauthn';
  credentialId?: string;
  code?:
    | 'SUCCESS'
    | 'CANCELLED'
    | 'LOCKOUT'
    | 'UNAVAILABLE'
    | 'NOT_ENROLLED'
    | 'FAILED';
  message: string;
}

interface StoredWebAuthnRecord {
  credentialId: string;
  rpId: string;
  userId: string;
  createdAt: string;
}

function getWebAuthnStorageKey(userId: string): string {
  return `webauthn_cred_${userId}`;
}

function getNativeBioFlagKey(userId: string): string {
  return `native_bio_enrolled_${userId}`;
}

function bufferToBase64Url(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function base64UrlToUint8Array(base64url: string): Uint8Array {
  const padded = base64url.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(base64url.length / 4) * 4, '=');
  const raw = atob(padded);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) {
    out[i] = raw.charCodeAt(i);
  }
  return out;
}

function mapNativeBiometryType(type: BiometryType): { label: string; kind: 'face' | 'fingerprint' | 'none' } {
  switch (type) {
    case BiometryType.faceId:
      return { label: 'Face ID', kind: 'face' };
    case BiometryType.touchId:
      return { label: 'Touch ID', kind: 'fingerprint' };
    case BiometryType.faceAuthentication:
      return { label: 'Face Unlock', kind: 'face' };
    case BiometryType.fingerprintAuthentication:
      return { label: 'Fingerprint', kind: 'fingerprint' };
    case BiometryType.irisAuthentication:
      return { label: 'Iris Recognition', kind: 'face' };
    default:
      return { label: 'Device Biometrics', kind: 'none' };
  }
}

function mapNativeBiometricError(err: unknown): BiometricAuthResult {
  const bioErr = err as BiometryError | undefined;
  const code = bioErr?.code;

  if (code === BiometryErrorType.userCancel || code === BiometryErrorType.appCancel || code === BiometryErrorType.systemCancel) {
    return {
      verified: false,
      code: 'CANCELLED',
      message: 'Biometric verification was cancelled. Please verify again or use your PIN / password.',
    };
  }
  if (code === BiometryErrorType.biometryLockout) {
    return {
      verified: false,
      code: 'LOCKOUT',
      message: 'Biometrics temporarily locked after repeated failed attempts. Unlock with your device passcode or account password.',
    };
  }
  if (code === BiometryErrorType.biometryNotEnrolled) {
    return {
      verified: false,
      code: 'NOT_ENROLLED',
      message: 'No biometrics are enrolled in your device settings. Set up Face ID / Fingerprint in OS Settings or use your PIN.',
    };
  }
  if (
    code === BiometryErrorType.biometryNotAvailable ||
    code === BiometryErrorType.noDeviceCredential ||
    code === BiometryErrorType.passcodeNotSet
  ) {
    return {
      verified: false,
      code: 'UNAVAILABLE',
      message: 'Biometric hardware or device lock is unavailable on this device. Please use your PIN or password.',
    };
  }
  if (code === BiometryErrorType.userFallback) {
    return {
      verified: false,
      code: 'CANCELLED',
      message: 'Switched to fallback PIN / password authentication.',
    };
  }
  return {
    verified: false,
    code: 'FAILED',
    message: bioErr?.message || 'Biometric authentication did not match. Please try again or use your PIN.',
  };
}

/**
 * Checks genuine platform biometric capability across iOS, Android, and Web (WebAuthn/Passkeys).
 */
export async function getBiometricCapability(userId?: string): Promise<BiometricCapability> {
  const platform = Capacitor.isNativePlatform()
    ? (Capacitor.getPlatform() === 'ios' ? 'ios' : 'android')
    : 'web';

  if (platform === 'ios' || platform === 'android') {
    try {
      const info = await BiometricAuth.checkBiometry();
      const mapped = mapNativeBiometryType(info.biometryType);
      const enrolledFlag = userId ? (await secureStorage.getItem(getNativeBioFlagKey(userId))) === 'true' : false;
      const canUseDeviceLock = Boolean(info.deviceIsSecure);

      return {
        available: Boolean(info.isAvailable || canUseDeviceLock),
        enrolledForUser: enrolledFlag,
        platform,
        biometryLabel: info.isAvailable ? mapped.label : canUseDeviceLock ? 'Device Passcode' : 'Unavailable',
        biometryType: mapped.kind,
        deviceHasPasscodeFallback: canUseDeviceLock,
        reason: info.reason || undefined,
      };
    } catch {
      return {
        available: false,
        enrolledForUser: false,
        platform,
        biometryLabel: 'Unavailable',
        biometryType: 'none',
        deviceHasPasscodeFallback: false,
        reason: 'Biometric hardware check unavailable.',
      };
    }
  }

  // Web: Real WebAuthn Platform Authenticator check
  try {
    const hasWebAuthn =
      typeof window !== 'undefined' &&
      typeof window.PublicKeyCredential !== 'undefined' &&
      window.isSecureContext;

    if (!hasWebAuthn) {
      return {
        available: false,
        enrolledForUser: false,
        platform: 'web',
        biometryLabel: 'Passkey / Biometrics Unavailable',
        biometryType: 'none',
        deviceHasPasscodeFallback: true,
        reason: 'Passkeys require a secure HTTPS browser context with WebAuthn support.',
      };
    }

    const platformAvailable = await window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
    let enrolled = false;
    if (userId) {
      const stored = await secureStorage.getItem(getWebAuthnStorageKey(userId));
      enrolled = Boolean(stored);
    }

    return {
      available: platformAvailable,
      enrolledForUser: enrolled,
      platform: 'web',
      biometryLabel: platformAvailable ? 'Passkey / Device Biometrics' : 'Passkey (PIN Fallback)',
      biometryType: platformAvailable ? 'passkey' : 'none',
      deviceHasPasscodeFallback: true,
      reason: platformAvailable ? undefined : 'No platform biometric authenticator detected on this browser.',
    };
  } catch {
    return {
      available: false,
      enrolledForUser: false,
      platform: 'web',
      biometryLabel: 'Unavailable',
      biometryType: 'none',
      deviceHasPasscodeFallback: true,
    };
  }
}

/**
 * Checks whether a genuine local biometric enrollment exists for a given userId.
 */
export async function isBiometricEnrolledForUser(user: User | null | undefined): Promise<boolean> {
  if (!user?.id) return false;
  if (!user.biometricsEnabled && !user.securitySettings?.biometricQuickUnlock) return false;

  if (Capacitor.isNativePlatform()) {
    const flag = await secureStorage.getItem(getNativeBioFlagKey(user.id));
    return flag === 'true' || Boolean(user.biometricsEnabled);
  }

  const storedCred = await secureStorage.getItem(getWebAuthnStorageKey(user.id));
  return Boolean(storedCred || user.securitySettings?.biometricCredentialId);
}

/**
 * Enrolls real biometric / WebAuthn passkey authentication for the authenticated user.
 * Requires live device biometric verification before activation succeeds.
 */
export async function enrollBiometricForUser(user: User): Promise<BiometricAuthResult> {
  if (!user?.id) {
    return { verified: false, code: 'FAILED', message: 'Sign in before enabling biometric lock.' };
  }

  if (Capacitor.isNativePlatform()) {
    try {
      const info = await BiometricAuth.checkBiometry();
      if (!info.isAvailable && !info.deviceIsSecure) {
        return {
          verified: false,
          code: 'UNAVAILABLE',
          message: 'No biometric sensor or device passcode is configured on this device.',
        };
      }

      const mapped = mapNativeBiometryType(info.biometryType);
      await BiometricAuth.authenticate({
        reason: `Verify with ${mapped.label} to enable Lumina App Lock`,
        cancelTitle: 'Cancel',
        allowDeviceCredential: true,
        iosFallbackTitle: 'Use Passcode',
        androidTitle: 'Enable Lumina Biometric Lock',
        androidSubtitle: 'Verify your identity on this device',
        androidConfirmationRequired: true,
      });

      await secureStorage.setItem(getNativeBioFlagKey(user.id), 'true');
      await secureStorage.setItem(
        'biometric_hint_v1',
        JSON.stringify({ userId: user.id, name: user.name || 'Lumina User', email: user.email || '' })
      );

      const method =
        info.biometryType === BiometryType.faceId
          ? 'native_face_id'
          : info.biometryType === BiometryType.touchId
            ? 'native_touch_id'
            : 'native_biometric';

      return {
        verified: true,
        method,
        code: 'SUCCESS',
        message: `${mapped.label} enabled cleanly.`,
      };
    } catch (err) {
      return mapNativeBiometricError(err);
    }
  }

  // Web: Real WebAuthn credential creation
  try {
    if (
      typeof window === 'undefined' ||
      !window.PublicKeyCredential ||
      !window.isSecureContext ||
      !navigator.credentials?.create
    ) {
      return {
        verified: false,
        code: 'UNAVAILABLE',
        message: 'WebAuthn passkeys are unavailable in this browser. Use your Security PIN or Password instead.',
      };
    }

    const platformSupported = await window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
    if (!platformSupported) {
      return {
        verified: false,
        code: 'UNAVAILABLE',
        message: 'This browser/device has no built-in biometric authenticator. Use your Security PIN or Password instead.',
      };
    }

    const challenge = crypto.getRandomValues(new Uint8Array(32));
    const rpId = window.location.hostname;
    const credential = (await navigator.credentials.create({
      publicKey: {
        challenge,
        rp: {
          name: 'Lumina: Bloom & Balance',
          id: rpId,
        },
        user: {
          id: new TextEncoder().encode(user.id.slice(0, 64)),
          name: user.email || user.id,
          displayName: user.name || 'Lumina User',
        },
        pubKeyCredParams: [
          { type: 'public-key', alg: -7 }, // ES256
          { type: 'public-key', alg: -257 }, // RS256
        ],
        authenticatorSelection: {
          authenticatorAttachment: 'platform',
          userVerification: 'required',
          residentKey: 'preferred',
        },
        timeout: 60000,
        attestation: 'none',
      },
    })) as PublicKeyCredential | null;

    if (!credential || !credential.rawId) {
      return {
        verified: false,
        code: 'CANCELLED',
        message: 'Passkey registration was cancelled.',
      };
    }

    const credId = bufferToBase64Url(credential.rawId);
    const record: StoredWebAuthnRecord = {
      credentialId: credId,
      rpId,
      userId: user.id,
      createdAt: new Date().toISOString(),
    };

    await secureStorage.setItem(getWebAuthnStorageKey(user.id), JSON.stringify(record));
    await secureStorage.setItem(
      'biometric_hint_v1',
      JSON.stringify({ userId: user.id, name: user.name || 'Lumina User', email: user.email || '' })
    );

    return {
      verified: true,
      method: 'webauthn',
      credentialId: credId,
      code: 'SUCCESS',
      message: 'Device Passkey / Biometrics enrolled cleanly.',
    };
  } catch (err: any) {
    if (err?.name === 'NotAllowedError' || err?.name === 'AbortError') {
      return {
        verified: false,
        code: 'CANCELLED',
        message: 'Passkey verification was cancelled or timed out. Use your PIN or Password if needed.',
      };
    }
    return {
      verified: false,
      code: 'UNAVAILABLE',
      message: err?.message || 'Unable to register a passkey in this browser context. Use your Security PIN instead.',
    };
  }
}

/**
 * Executes genuine hardware/WebAuthn verification for unlocking Lumina or the Secret Diary.
 * Never auto-unlocks or uses timers.
 */
export async function authenticateWithBiometrics(
  user: User,
  reason: string = 'Verify your identity to unlock Lumina'
): Promise<BiometricAuthResult> {
  if (!user?.id) {
    return { verified: false, code: 'FAILED', message: 'No active account found to verify.' };
  }

  if (Capacitor.isNativePlatform()) {
    try {
      const info = await BiometricAuth.checkBiometry();
      if (!info.isAvailable && !info.deviceIsSecure) {
        return {
          verified: false,
          code: 'UNAVAILABLE',
          message: 'Biometrics and device lock are unavailable on this device. Unlock with your PIN or password.',
        };
      }

      await BiometricAuth.authenticate({
        reason,
        cancelTitle: 'Use PIN / Password',
        allowDeviceCredential: true,
        iosFallbackTitle: 'Use Passcode',
        androidTitle: 'Lumina Security Lock',
        androidSubtitle: reason,
        androidConfirmationRequired: true,
      });

      const method =
        info.biometryType === BiometryType.faceId
          ? 'native_face_id'
          : info.biometryType === BiometryType.touchId
            ? 'native_touch_id'
            : 'native_biometric';

      return {
        verified: true,
        method,
        code: 'SUCCESS',
        message: 'Biometric verification succeeded.',
      };
    } catch (err) {
      return mapNativeBiometricError(err);
    }
  }

  // Web: Real WebAuthn Passkey assertion verification
  try {
    if (
      typeof window === 'undefined' ||
      !window.PublicKeyCredential ||
      !window.isSecureContext ||
      !navigator.credentials?.get
    ) {
      return {
        verified: false,
        code: 'UNAVAILABLE',
        message: 'Passkey biometrics unavailable in this browser. Please enter your Security PIN or Password.',
      };
    }

    const storedRaw = await secureStorage.getItem(getWebAuthnStorageKey(user.id));
    let storedRecord: StoredWebAuthnRecord | null = null;
    if (storedRaw) {
      try {
        storedRecord = JSON.parse(storedRaw);
      } catch {}
    }

    const credIdToUse = storedRecord?.credentialId || user.securitySettings?.biometricCredentialId;
    if (!credIdToUse) {
      return {
        verified: false,
        code: 'NOT_ENROLLED',
        message: 'No passkey is registered for this browser yet. Please enter your Security PIN or re-enroll Passkeys in Settings.',
      };
    }

    const challengeBytes = crypto.getRandomValues(new Uint8Array(32));
    const expectedChallenge = bufferToBase64Url(challengeBytes);
    const rpId = storedRecord?.rpId || window.location.hostname;

    const assertion = (await navigator.credentials.get({
      publicKey: {
        challenge: challengeBytes,
        rpId,
        allowCredentials: [
          {
            type: 'public-key',
            id: base64UrlToUint8Array(credIdToUse) as BufferSource,
          },
        ],
        userVerification: 'required',
        timeout: 60000,
      },
    })) as PublicKeyCredential | null;

    if (!assertion || !assertion.response) {
      return {
        verified: false,
        code: 'CANCELLED',
        message: 'Passkey prompt dismissed. Please enter your Security PIN or Password.',
      };
    }

    const response = assertion.response as AuthenticatorAssertionResponse;
    const clientDataText = new TextDecoder().decode(response.clientDataJSON);
    const clientData = JSON.parse(clientDataText);

    if (clientData.type !== 'webauthn.get' || clientData.challenge !== expectedChallenge) {
      return {
        verified: false,
        code: 'FAILED',
        message: 'Passkey challenge mismatch. Verification rejected.',
      };
    }

    if (clientData.origin !== window.location.origin) {
      return {
        verified: false,
        code: 'FAILED',
        message: 'Passkey origin mismatch. Verification rejected.',
      };
    }

    // Check authenticatorData flags byte (index 32): UP (0x01) and UV (0x04) must both be set
    const authData = new Uint8Array(response.authenticatorData);
    if (authData.byteLength < 37) {
      return { verified: false, code: 'FAILED', message: 'Invalid authenticator response.' };
    }
    const flags = authData[32];
    const userPresent = (flags & 0x01) !== 0;
    const userVerified = (flags & 0x04) !== 0;

    if (!userPresent || !userVerified) {
      return {
        verified: false,
        code: 'FAILED',
        message: 'User verification (biometric/PIN) was not confirmed by the authenticator.',
      };
    }

    return {
      verified: true,
      method: 'webauthn',
      credentialId: credIdToUse,
      code: 'SUCCESS',
      message: 'Passkey verification succeeded.',
    };
  } catch (err: any) {
    if (err?.name === 'NotAllowedError' || err?.name === 'AbortError') {
      return {
        verified: false,
        code: 'CANCELLED',
        message: 'Passkey verification was cancelled or timed out. Use your PIN or Password.',
      };
    }
    return {
      verified: false,
      code: 'FAILED',
      message: err?.message || 'Passkey verification failed. Please use your Security PIN or Password.',
    };
  }
}

export async function revokeBiometricForUser(userId: string): Promise<void> {
  if (!userId) return;
  await secureStorage.removeItem(getWebAuthnStorageKey(userId));
  await secureStorage.removeItem(getNativeBioFlagKey(userId));
  await secureStorage.removeItem('biometric_hint_v1');
}

export async function getBiometricProfileHint(): Promise<{ userId: string; name: string; email: string } | null> {
  try {
    const raw = await secureStorage.getItem('biometric_hint_v1');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
