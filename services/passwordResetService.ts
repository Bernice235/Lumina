import {
  ActionCodeSettings,
  confirmPasswordReset,
  sendPasswordResetEmail,
  verifyPasswordResetCode,
} from 'firebase/auth';
import { Capacitor } from '@capacitor/core';
import { auth } from './firebase';
import {
  checkClientRateLimit,
  evaluatePasswordStrength,
  isValidEmailAddress,
  sanitizeTextInput,
} from './securityService';

export const LUMINA_BRAND_NAME = 'Lumina | Bloom & Balance';
export const PASSWORD_RESET_COOLDOWN_SEC = 60;

export interface ParsedResetLink {
  isResetFlow: boolean;
  oobCode: string | null;
  isPostFirebaseContinue?: boolean;
}

export interface PasswordResetRequestResult {
  ok: boolean;
  message: string;
  cooldownSec?: number;
  errorCode?: string;
}

export interface VerifyResetCodeResult {
  ok: boolean;
  email?: string;
  errorCode?: string;
  message?: string;
  canRequestNewLink?: boolean;
  canRetry?: boolean;
}

export interface ConfirmResetResult {
  ok: boolean;
  errorCode?: string;
  message?: string;
  canRequestNewLink?: boolean;
}

/**
 * Extracts Firebase action link parameters (?mode=resetPassword&oobCode=...) safely
 * without persisting the one-time action code anywhere in browser storage.
 */
export function parsePasswordResetParams(search: string, hash: string = ''): ParsedResetLink {
  const tryParse = (queryString: string): ParsedResetLink | null => {
    if (!queryString) return null;
    const cleanQuery = queryString.startsWith('?') ? queryString.slice(1) : queryString;
    if (!cleanQuery) return null;
    const params = new URLSearchParams(cleanQuery);
    const mode = params.get('mode');
    if (mode === 'resetPassword') {
      const rawCode = params.get('oobCode');
      const cleanCode = rawCode ? sanitizeTextInput(rawCode, 512) : '';
      return {
        isResetFlow: true,
        oobCode: cleanCode.length >= 8 ? cleanCode : null,
      };
    }

    if (params.get('reset') === 'complete') {
      return {
        isResetFlow: false,
        oobCode: null,
        isPostFirebaseContinue: true,
      };
    }

    return null;
  };

  const fromSearch = tryParse(search);
  if (fromSearch) return fromSearch;

  if (hash && hash.includes('?')) {
    const hashQuery = hash.slice(hash.indexOf('?'));
    const fromHash = tryParse(hashQuery);
    if (fromHash) return fromHash;
  }

  return { isResetFlow: false, oobCode: null, isPostFirebaseContinue: false };
}

/**
 * Builds Firebase ActionCodeSettings suitable for Web while avoiding invalid schemes
 * inside Capacitor iOS/Android shells.
 */
export function buildResetActionCodeSettings(): ActionCodeSettings | undefined {
  if (typeof window === 'undefined') return undefined;
  try {
    if (Capacitor.isNativePlatform()) {
      const authDomain = auth?.app?.options?.authDomain;
      if (authDomain) {
        return {
          url: `https://${authDomain}/reset-password?reset=complete`,
          handleCodeInApp: false,
        };
      }
      return undefined;
    }

    const origin = window.location.origin;
    if (/^https?:\/\//i.test(origin)) {
      return {
        url: `${origin}/reset-password?reset=complete`,
        handleCodeInApp: false,
      };
    }
  } catch {
    return undefined;
  }
  return undefined;
}

/**
 * Maps Firebase Auth error codes cleanly to user-friendly, non-sensitive Lumina messages.
 */
export function mapFirebasePasswordResetError(
  err: unknown,
  phase: 'request' | 'verify' | 'confirm'
): {
  code: string;
  message: string;
  canRequestNewLink: boolean;
  canRetry: boolean;
} {
  const rawCode = String((err as any)?.code || '');
  const rawMsg = String((err as any)?.message || '');

  if (
    rawCode === 'auth/operation-not-allowed' ||
    rawMsg.includes('PASSWORD_LOGIN_DISABLED') ||
    rawMsg.includes('OPERATION_NOT_ALLOWED')
  ) {
    return {
      code: 'auth/operation-not-allowed',
      message:
        'Password reset is currently unavailable because Email/Password sign-in is disabled in Firebase Console (Authentication → Sign-in method).',
      canRequestNewLink: false,
      canRetry: false,
    };
  }

  if (rawCode === 'auth/invalid-email' || rawCode === 'auth/missing-email') {
    return {
      code: rawCode,
      message: 'Please enter a valid email address.',
      canRequestNewLink: false,
      canRetry: false,
    };
  }

  if (rawCode === 'auth/too-many-requests') {
    return {
      code: rawCode,
      message:
        'Too many password reset requests were made recently. Please wait a few minutes before trying again.',
      canRequestNewLink: false,
      canRetry: true,
    };
  }

  if (rawCode === 'auth/network-request-failed') {
    return {
      code: rawCode,
      message:
        'Network error while reaching Firebase Authentication. Please check your internet connection and try again.',
      canRequestNewLink: false,
      canRetry: true,
    };
  }

  if (rawCode === 'auth/expired-action-code') {
    return {
      code: rawCode,
      message:
        'This password reset link has expired. For your security, reset links are time-limited—please request a fresh link.',
      canRequestNewLink: true,
      canRetry: false,
    };
  }

  if (rawCode === 'auth/invalid-action-code') {
    return {
      code: rawCode,
      message:
        'This password reset link is invalid or has already been used. Please request a new reset link.',
      canRequestNewLink: true,
      canRetry: false,
    };
  }

  if (rawCode === 'auth/user-disabled') {
    return {
      code: rawCode,
      message:
        'This account is currently disabled and cannot reset its password.',
      canRequestNewLink: false,
      canRetry: false,
    };
  }

  if (rawCode === 'auth/weak-password') {
    return {
      code: rawCode,
      message:
        'Your new password is too weak. Use at least 8 characters with uppercase, lowercase, a number, and a symbol.',
      canRequestNewLink: false,
      canRetry: false,
    };
  }

  if (phase === 'verify') {
    return {
      code: rawCode || 'auth/unknown',
      message:
        'We could not verify this password reset link. It may have expired or already been used.',
      canRequestNewLink: true,
      canRetry: true,
    };
  }

  if (phase === 'confirm') {
    return {
      code: rawCode || 'auth/unknown',
      message:
        'We could not update your password right now. Please check your connection or request a new reset link.',
      canRequestNewLink: true,
      canRetry: true,
    };
  }

  return {
    code: rawCode || 'auth/unknown',
    message:
      'We could not process your password reset request right now. Please check your connection and try again.',
    canRequestNewLink: false,
    canRetry: true,
  };
}

/**
 * Checks project-wide Email/Password provider availability using a synthetic .invalid address
 * (never queries or reveals any real user email).
 */
async function isEmailPasswordProviderDisabledInProject(): Promise<boolean> {
  const apiKey = auth?.app?.options?.apiKey;
  if (!apiKey || typeof fetch !== 'function') return false;

  try {
    const res = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${encodeURIComponent(apiKey)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'lumina-provider-probe@example.invalid',
          password: 'ProbePassword123!',
          returnSecureToken: false,
        }),
      }
    );
    const json = await res.json().catch(() => null);
    const errMsg = String(json?.error?.message || '');
    return errMsg.includes('PASSWORD_LOGIN_DISABLED') || errMsg.includes('OPERATION_NOT_ALLOWED');
  } catch {
    // Allow official Firebase SDK call to handle transient connectivity errors
    return false;
  }
}

export const NON_ENUMERATING_RESET_SUCCESS_MESSAGE =
  'If an account matches that email address, Firebase has sent password reset instructions. Please check your inbox and spam folder.';

/**
 * Requests a Firebase password reset email using official sendPasswordResetEmail.
 * Enforces email validation, client rate-limiting, project-level provider check,
 * and non-enumerating success feedback.
 */
export async function requestFirebasePasswordReset(
  rawEmail: string
): Promise<PasswordResetRequestResult> {
  const cleanEmail = sanitizeTextInput(rawEmail, 160).toLowerCase();
  if (!isValidEmailAddress(cleanEmail)) {
    return {
      ok: false,
      errorCode: 'auth/invalid-email',
      message: 'Please enter a valid email address so we can send reset instructions.',
    };
  }

  const rate = checkClientRateLimit('password_reset', 3, PASSWORD_RESET_COOLDOWN_SEC * 1000);
  if (!rate.allowed) {
    return {
      ok: false,
      errorCode: 'auth/too-many-requests',
      cooldownSec: rate.retryAfterSec,
      message: `For your security, please wait ${rate.retryAfterSec}s before requesting another reset link.`,
    };
  }

  if (await isEmailPasswordProviderDisabledInProject()) {
    return {
      ok: false,
      errorCode: 'auth/operation-not-allowed',
      message:
        'Password reset emails cannot be sent yet because Email/Password sign-in is disabled in Firebase Console (Authentication → Sign-in method).',
    };
  }

  const actionCodeSettings = buildResetActionCodeSettings();

  try {
    if (actionCodeSettings) {
      try {
        await sendPasswordResetEmail(auth, cleanEmail, actionCodeSettings);
      } catch (innerErr: any) {
        const innerCode = String(innerErr?.code || '');
        if (
          innerCode === 'auth/unauthorized-continue-uri' ||
          innerCode === 'auth/invalid-continue-uri' ||
          innerCode === 'auth/missing-continue-uri'
        ) {
          // Retry with Firebase's default hosted action handler if preview/custom continue domain is not yet whitelisted
          await sendPasswordResetEmail(auth, cleanEmail);
        } else {
          throw innerErr;
        }
      }
    } else {
      await sendPasswordResetEmail(auth, cleanEmail);
    }

    return {
      ok: true,
      cooldownSec: PASSWORD_RESET_COOLDOWN_SEC,
      message: NON_ENUMERATING_RESET_SUCCESS_MESSAGE,
    };
  } catch (err) {
    const mapped = mapFirebasePasswordResetError(err, 'request');
    return {
      ok: false,
      errorCode: mapped.code,
      message: mapped.message,
    };
  }
}

/**
 * Verifies a Firebase oobCode using official verifyPasswordResetCode before showing
 * the new password form.
 */
export async function verifyFirebaseResetCode(oobCode: string): Promise<VerifyResetCodeResult> {
  const cleanCode = sanitizeTextInput(oobCode, 512);
  if (cleanCode.length < 8) {
    return {
      ok: false,
      errorCode: 'auth/invalid-action-code',
      message: 'This password reset link is incomplete or invalid. Please request a new reset link.',
      canRequestNewLink: true,
      canRetry: false,
    };
  }

  try {
    const accountEmail = await verifyPasswordResetCode(auth, cleanCode);
    return {
      ok: true,
      email: accountEmail,
    };
  } catch (err) {
    const mapped = mapFirebasePasswordResetError(err, 'verify');
    return {
      ok: false,
      errorCode: mapped.code,
      message: mapped.message,
      canRequestNewLink: mapped.canRequestNewLink,
      canRetry: mapped.canRetry,
    };
  }
}

/**
 * Validates new password strength + confirmation and applies the reset via
 * Firebase's official confirmPasswordReset.
 */
export async function completeFirebasePasswordReset(
  oobCode: string,
  newPassword: string,
  confirmPassword: string
): Promise<ConfirmResetResult> {
  const cleanCode = sanitizeTextInput(oobCode, 512);
  if (cleanCode.length < 8) {
    return {
      ok: false,
      errorCode: 'auth/invalid-action-code',
      message: 'Your reset link is missing or invalid. Please request a fresh password reset link.',
      canRequestNewLink: true,
    };
  }

  const strength = evaluatePasswordStrength(newPassword);
  if (!strength.valid) {
    return {
      ok: false,
      errorCode: 'auth/weak-password',
      message:
        strength.error ||
        'Please choose a stronger password (at least 8 characters with uppercase, lowercase, a number, and a symbol).',
      canRequestNewLink: false,
    };
  }

  if (newPassword !== confirmPassword) {
    return {
      ok: false,
      errorCode: 'validation/password-mismatch',
      message: 'Passwords do not match. Please enter the same password in both fields.',
      canRequestNewLink: false,
    };
  }

  try {
    await confirmPasswordReset(auth, cleanCode, newPassword);
    return { ok: true };
  } catch (err) {
    const mapped = mapFirebasePasswordResetError(err, 'confirm');
    return {
      ok: false,
      errorCode: mapped.code,
      message: mapped.message,
      canRequestNewLink: mapped.canRequestNewLink,
    };
  }
}
