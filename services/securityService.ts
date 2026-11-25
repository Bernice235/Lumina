import { ActiveSessionInfo, AppNotification, LoginActivityEntry, SecuritySettings, User } from '../types';
import { sha256Hex, secureStorage } from './secureStorage';

const SESSION_ID_KEY = 'lumina_device_session_id_v1';
const LOCKOUT_PREFIX = 'lumina_auth_lockout_v1_';
const DIARY_LOCKOUT_PREFIX = 'lumina_diary_lockout_v1_';
const CRED_VERIFIER_PREFIX = 'lumina_cred_v2_';
const FORM_RATE_PREFIX = 'lumina_form_rate_v1_';

const COMMON_WEAK_PASSWORDS = new Set([
  '12345678',
  'password',
  'password1',
  'qwerty123',
  '11111111',
  'iloveyou',
  'letmein1',
  'admin123',
  'welcome1',
  'lumina123',
]);

const WEAK_PINS = new Set([
  '0000', '1111', '2222', '3333', '4444', '5555', '6666', '7777', '8888', '9999',
  '1234', '4321', '000000', '111111', '123456', '654321',
]);

// ----------------- Input Sanitization & Validation -----------------

export function sanitizeTextInput(value: unknown, maxLength: number = 500): string {
  if (typeof value !== 'string') return '';
  return value
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .trim()
    .slice(0, maxLength);
}

export function escapeHtml(str: unknown): string {
  const s = typeof str === 'string' ? str : String(str ?? '');
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function isValidEmailAddress(email: string): boolean {
  const trimmed = email.trim();
  if (!trimmed || trimmed.length > 160) return false;
  return /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(trimmed);
}

export function redactEmailForLogs(email?: string | null): string {
  if (!email) return '[none]';
  const at = email.indexOf('@');
  if (at <= 1) return '[redacted]';
  return `${email[0]}***@${email.slice(at + 1)}`;
}

function timingSafeEqualStr(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('');
}

function hexToBytes(hex: string): Uint8Array {
  const clean = hex.replace(/[^0-9a-fA-F]/g, '');
  const out = new Uint8Array(clean.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

async function pbkdf2Hex(secret: string, saltHex: string, iterations: number = 120_000): Promise<string> {
  const cryptoObj = globalThis.crypto;
  if (!cryptoObj?.subtle) {
    throw new Error('Web Crypto PBKDF2 is unavailable.');
  }
  const baseKey = await cryptoObj.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    'PBKDF2',
    false,
    ['deriveBits']
  );
  const derived = await cryptoObj.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: hexToBytes(saltHex) as BufferSource,
      iterations,
      hash: 'SHA-256',
    },
    baseKey,
    256
  );
  return bytesToHex(new Uint8Array(derived));
}

// ----------------- Password Strength -----------------

export interface PasswordStrengthResult {
  valid: boolean;
  score: number; // 0..4
  label: 'Weak' | 'Fair' | 'Good' | 'Strong';
  checks: {
    minLength: boolean;
    hasUpper: boolean;
    hasLower: boolean;
    hasNumber: boolean;
    hasSymbol: boolean;
    notCommon: boolean;
  };
  error?: string;
}

export function evaluatePasswordStrength(password: string): PasswordStrengthResult {
  const p = password || '';
  const checks = {
    minLength: p.length >= 8,
    hasUpper: /[A-Z]/.test(p),
    hasLower: /[a-z]/.test(p),
    hasNumber: /[0-9]/.test(p),
    hasSymbol: /[^A-Za-z0-9]/.test(p),
    notCommon: !COMMON_WEAK_PASSWORDS.has(p.toLowerCase()),
  };

  let score = 0;
  if (checks.minLength) score++;
  if (checks.hasUpper && checks.hasLower) score++;
  if (checks.hasNumber) score++;
  if (checks.hasSymbol) score++;
  if (!checks.notCommon) score = Math.min(score, 1);

  const valid =
    checks.minLength &&
    checks.hasUpper &&
    checks.hasLower &&
    checks.hasNumber &&
    checks.hasSymbol &&
    checks.notCommon;

  const label: PasswordStrengthResult['label'] =
    score >= 4 && valid ? 'Strong' : score === 3 ? 'Good' : score === 2 ? 'Fair' : 'Weak';

  let error: string | undefined;
  if (!checks.minLength) error = 'Use at least 8 characters.';
  else if (!checks.notCommon) error = 'Avoid common easy-to-guess passwords.';
  else if (!checks.hasUpper || !checks.hasLower) error = 'Include both uppercase and lowercase letters.';
  else if (!checks.hasNumber) error = 'Include at least one number (0-9).';
  else if (!checks.hasSymbol) error = 'Include at least one special character (e.g. !@#$%).';

  return { valid, score, label, checks, error };
}

// ----------------- Salted PBKDF2 Diary PIN Security & Attempt Throttling -----------------

export function validateNewDiaryPin(pin: string): { valid: boolean; error?: string } {
  const clean = (pin || '').trim();
  if (!/^\d{4,6}$/.test(clean)) {
    return { valid: false, error: 'PIN must be 4 to 6 numeric digits.' };
  }
  if (WEAK_PINS.has(clean)) {
    return { valid: false, error: 'Please choose a private PIN other than 1234 or repeated digits.' };
  }
  return { valid: true };
}

export async function hashDiaryPin(pin: string): Promise<{ hash: string; salt: string }> {
  const clean = (pin || '').trim();
  const saltBytes = globalThis.crypto.getRandomValues(new Uint8Array(16));
  const salt = bytesToHex(saltBytes);
  const hash = await pbkdf2Hex(`lumina_pin_v2:${clean}`, salt, 120_000);
  return { hash, salt };
}

export function userHasConfiguredPin(user: User | null | undefined): boolean {
  if (!user) return false;
  if (user.diaryPinHash && user.diaryPinSalt) return true;
  // Legacy PIN counts as configured ONLY if it was actually customized away from the old '1234' default
  if (user.diaryPin && user.diaryPin !== '1234' && /^\d{4,6}$/.test(user.diaryPin)) {
    return true;
  }
  return false;
}

export async function verifyDiaryPin(
  submittedPin: string,
  user: User
): Promise<'valid' | 'invalid' | 'unset'> {
  const clean = (submittedPin || '').trim();
  if (!clean) return 'invalid';

  if (user.diaryPinHash && user.diaryPinSalt) {
    const candidate = await pbkdf2Hex(`lumina_pin_v2:${clean}`, user.diaryPinSalt, 120_000);
    return timingSafeEqualStr(candidate, user.diaryPinHash) ? 'valid' : 'invalid';
  }

  // Legacy migration: allow custom non-default legacy PIN once so caller can upgrade to diaryPinHash
  if (user.diaryPin && user.diaryPin !== '1234') {
    return timingSafeEqualStr(clean, user.diaryPin) ? 'valid' : 'invalid';
  }

  return 'unset';
}

const MAX_DIARY_PIN_ATTEMPTS = 5;
const DIARY_LOCKOUT_DURATION_MS = 5 * 60 * 1000;

export async function getDiaryPinLockoutState(userId: string): Promise<{
  isLocked: boolean;
  remainingMs: number;
  failures: number;
}> {
  if (typeof window === 'undefined' || !userId) {
    return { isLocked: false, remainingMs: 0, failures: 0 };
  }
  try {
    const h = await sha256Hex(userId);
    const k = DIARY_LOCKOUT_PREFIX + h.slice(0, 24);
    const raw = localStorage.getItem(k);
    if (!raw) return { isLocked: false, remainingMs: 0, failures: 0 };
    const rec: LockoutRecord = JSON.parse(raw);
    const now = Date.now();
    if (rec.lockedUntil && rec.lockedUntil > now) {
      return {
        isLocked: true,
        remainingMs: rec.lockedUntil - now,
        failures: rec.failures || MAX_DIARY_PIN_ATTEMPTS,
      };
    }
    if (rec.lockedUntil && rec.lockedUntil <= now) {
      localStorage.removeItem(k);
      return { isLocked: false, remainingMs: 0, failures: 0 };
    }
    return { isLocked: false, remainingMs: 0, failures: rec.failures || 0 };
  } catch {
    return { isLocked: false, remainingMs: 0, failures: 0 };
  }
}

export async function recordFailedDiaryPinAttempt(userId: string): Promise<{
  isLocked: boolean;
  remainingMs: number;
  failures: number;
  remainingAttempts: number;
}> {
  if (typeof window === 'undefined' || !userId) {
    return { isLocked: false, remainingMs: 0, failures: 1, remainingAttempts: MAX_DIARY_PIN_ATTEMPTS - 1 };
  }
  const h = await sha256Hex(userId);
  const k = DIARY_LOCKOUT_PREFIX + h.slice(0, 24);
  const now = Date.now();
  let rec: LockoutRecord = { failures: 0, lockedUntil: 0, lastFailureAt: now };
  try {
    const raw = localStorage.getItem(k);
    if (raw) rec = JSON.parse(raw);
  } catch {}

  if (now - (rec.lastFailureAt || 0) > 15 * 60 * 1000) {
    rec.failures = 0;
    rec.lockedUntil = 0;
  }

  rec.failures = (rec.failures || 0) + 1;
  rec.lastFailureAt = now;
  if (rec.failures >= MAX_DIARY_PIN_ATTEMPTS) {
    rec.lockedUntil = now + DIARY_LOCKOUT_DURATION_MS;
  }
  localStorage.setItem(k, JSON.stringify(rec));
  const isLocked = rec.lockedUntil > now;
  return {
    isLocked,
    remainingMs: isLocked ? rec.lockedUntil - now : 0,
    failures: rec.failures,
    remainingAttempts: Math.max(0, MAX_DIARY_PIN_ATTEMPTS - rec.failures),
  };
}

export async function clearDiaryPinLockout(userId: string): Promise<void> {
  if (typeof window === 'undefined' || !userId) return;
  try {
    const h = await sha256Hex(userId);
    localStorage.removeItem(DIARY_LOCKOUT_PREFIX + h.slice(0, 24));
  } catch {}
}

// ----------------- Anti-Spam & Honeypot Protection -----------------

export function isHoneypotTriggered(honeypotValue: string | undefined | null): boolean {
  return typeof honeypotValue === 'string' && honeypotValue.trim().length > 0;
}

export function checkClientRateLimit(
  actionKey: string,
  maxAttempts: number = 5,
  windowMs: number = 60_000
): { allowed: boolean; retryAfterSec: number } {
  if (typeof window === 'undefined') return { allowed: true, retryAfterSec: 0 };
  try {
    const key = FORM_RATE_PREFIX + actionKey;
    const now = Date.now();
    const raw = localStorage.getItem(key);
    const timestamps: number[] = raw ? JSON.parse(raw).filter((t: number) => now - t < windowMs) : [];
    if (timestamps.length >= maxAttempts) {
      const oldest = timestamps[0];
      const retryAfterSec = Math.max(1, Math.ceil((windowMs - (now - oldest)) / 1000));
      return { allowed: false, retryAfterSec };
    }
    timestamps.push(now);
    localStorage.setItem(key, JSON.stringify(timestamps));
    return { allowed: true, retryAfterSec: 0 };
  } catch {
    return { allowed: true, retryAfterSec: 0 };
  }
}

// ----------------- Account Lockout Protection -----------------

const MAX_FAILED_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 5 * 60 * 1000;

interface LockoutRecord {
  failures: number;
  lockedUntil: number;
  lastFailureAt: number;
}

async function getLockoutStorageKey(email: string): Promise<string> {
  const hash = await sha256Hex(email.toLowerCase().trim());
  return LOCKOUT_PREFIX + hash.slice(0, 24);
}

export async function getAccountLockoutState(email: string): Promise<{
  isLocked: boolean;
  remainingMs: number;
  failures: number;
}> {
  if (typeof window === 'undefined' || !email) {
    return { isLocked: false, remainingMs: 0, failures: 0 };
  }
  try {
    const k = await getLockoutStorageKey(email);
    const raw = localStorage.getItem(k);
    if (!raw) return { isLocked: false, remainingMs: 0, failures: 0 };
    const rec: LockoutRecord = JSON.parse(raw);
    const now = Date.now();
    if (rec.lockedUntil && rec.lockedUntil > now) {
      return {
        isLocked: true,
        remainingMs: rec.lockedUntil - now,
        failures: rec.failures || MAX_FAILED_LOGIN_ATTEMPTS,
      };
    }
    if (rec.lockedUntil && rec.lockedUntil <= now) {
      localStorage.removeItem(k);
      return { isLocked: false, remainingMs: 0, failures: 0 };
    }
    return { isLocked: false, remainingMs: 0, failures: rec.failures || 0 };
  } catch {
    return { isLocked: false, remainingMs: 0, failures: 0 };
  }
}

export async function recordFailedLoginAttempt(email: string): Promise<{
  isLocked: boolean;
  remainingMs: number;
  failures: number;
  remainingAttempts: number;
}> {
  if (typeof window === 'undefined' || !email) {
    return { isLocked: false, remainingMs: 0, failures: 1, remainingAttempts: MAX_FAILED_LOGIN_ATTEMPTS - 1 };
  }
  const k = await getLockoutStorageKey(email);
  const now = Date.now();
  let rec: LockoutRecord = { failures: 0, lockedUntil: 0, lastFailureAt: now };
  try {
    const raw = localStorage.getItem(k);
    if (raw) rec = JSON.parse(raw);
  } catch {}

  if (now - (rec.lastFailureAt || 0) > 30 * 60 * 1000) {
    rec.failures = 0;
    rec.lockedUntil = 0;
  }

  rec.failures = (rec.failures || 0) + 1;
  rec.lastFailureAt = now;
  if (rec.failures >= MAX_FAILED_LOGIN_ATTEMPTS) {
    rec.lockedUntil = now + LOCKOUT_DURATION_MS;
  }

  localStorage.setItem(k, JSON.stringify(rec));
  const isLocked = rec.lockedUntil > now;
  return {
    isLocked,
    remainingMs: isLocked ? rec.lockedUntil - now : 0,
    failures: rec.failures,
    remainingAttempts: Math.max(0, MAX_FAILED_LOGIN_ATTEMPTS - rec.failures),
  };
}

export async function clearLoginLockout(email: string): Promise<void> {
  if (typeof window === 'undefined' || !email) return;
  try {
    const k = await getLockoutStorageKey(email);
    localStorage.removeItem(k);
  } catch {}
}

// ----------------- Salted PBKDF2-SHA256 Local Credential Verifier -----------------

export async function storeLocalCredentialVerifier(email: string, password: string): Promise<void> {
  if (typeof window === 'undefined' || !email || !password) return;
  try {
    const emailHash = await sha256Hex(email.toLowerCase().trim());
    const saltBytes = globalThis.crypto.getRandomValues(new Uint8Array(16));
    const saltHex = bytesToHex(saltBytes);
    const digest = await pbkdf2Hex(`lumina_cred_v2:${email.toLowerCase().trim()}:${password}`, saltHex, 120_000);
    await secureStorage.setItem(
      CRED_VERIFIER_PREFIX + emailHash.slice(0, 24),
      JSON.stringify({ v: 2, salt: saltHex, digest })
    );
  } catch {}
}

export async function verifyLocalCredential(email: string, password: string): Promise<'valid' | 'invalid' | 'missing'> {
  if (typeof window === 'undefined' || !email || !password) return 'missing';
  try {
    const cleanEmail = email.toLowerCase().trim();
    const emailHash = await sha256Hex(cleanEmail);
    const stored = await secureStorage.getItem(CRED_VERIFIER_PREFIX + emailHash.slice(0, 24));
    if (!stored) return 'missing';
    const parsed = JSON.parse(stored);
    if (!parsed?.salt || !parsed?.digest) return 'missing';

    if (parsed.v === 2) {
      const candidate = await pbkdf2Hex(`lumina_cred_v2:${cleanEmail}:${password}`, parsed.salt, 120_000);
      return timingSafeEqualStr(candidate, parsed.digest) ? 'valid' : 'invalid';
    }

    // Legacy v1 verifier read + auto-upgrade on match
    const legacyCandidate = await sha256Hex(`lumina_cred:${parsed.salt}:${password}`);
    if (timingSafeEqualStr(legacyCandidate, parsed.digest)) {
      await storeLocalCredentialVerifier(cleanEmail, password);
      return 'valid';
    }
    return 'invalid';
  } catch {
    return 'missing';
  }
}

// ----------------- Real RFC-6238 TOTP Two-Factor Authentication -----------------

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

export function generateTotpSecret(length: number = 32): string {
  const bytes = new Uint8Array(length);
  if (typeof globalThis !== 'undefined' && globalThis.crypto?.getRandomValues) {
    globalThis.crypto.getRandomValues(bytes);
  } else {
    throw new Error('Cryptographic RNG unavailable.');
  }
  let secret = '';
  for (let i = 0; i < length; i++) {
    secret += BASE32_ALPHABET[bytes[i] % 32];
  }
  return secret;
}

function base32ToBytes(base32: string): Uint8Array {
  const cleaned = base32.toUpperCase().replace(/[^A-Z2-7]/g, '');
  let bits = 0;
  let value = 0;
  const output: number[] = [];
  for (let i = 0; i < cleaned.length; i++) {
    const idx = BASE32_ALPHABET.indexOf(cleaned[i]);
    if (idx === -1) continue;
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      output.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return new Uint8Array(output);
}

export function buildOtpAuthUri(accountEmail: string, secret: string, issuer: string = 'Lumina Wellness'): string {
  const label = encodeURIComponent(`${issuer}:${accountEmail}`);
  const iss = encodeURIComponent(issuer);
  return `otpauth://totp/${label}?secret=${encodeURIComponent(secret)}&issuer=${iss}&algorithm=SHA1&digits=6&period=30`;
}

export async function generateTotpToken(secret: string, stepOffset: number = 0): Promise<string> {
  if (typeof globalThis === 'undefined' || !globalThis.crypto?.subtle) {
    throw new Error('Web Crypto HMAC is unavailable.');
  }
  const keyBytes = base32ToBytes(secret);
  const counter = Math.floor(Date.now() / 1000 / 30) + stepOffset;
  const msg = new ArrayBuffer(8);
  const view = new DataView(msg);
  view.setUint32(0, Math.floor(counter / 0x100000000), false);
  view.setUint32(4, counter >>> 0, false);

  const hmacKey = await globalThis.crypto.subtle.importKey(
    'raw',
    keyBytes as BufferSource,
    { name: 'HMAC', hash: 'SHA-1' },
    false,
    ['sign']
  );
  const signature = new Uint8Array(await globalThis.crypto.subtle.sign('HMAC', hmacKey, msg));
  const offset = signature[signature.length - 1] & 0x0f;
  const binary =
    ((signature[offset] & 0x7f) << 24) |
    ((signature[offset + 1] & 0xff) << 16) |
    ((signature[offset + 2] & 0xff) << 8) |
    (signature[offset + 3] & 0xff);
  return String(binary % 1_000_000).padStart(6, '0');
}

export async function verifyTotpCode(secret: string, submittedCode: string): Promise<boolean> {
  const cleaned = (submittedCode || '').replace(/\s+/g, '');
  if (!/^\d{6}$/.test(cleaned) || !secret) return false;
  for (const offset of [-1, 0, 1]) {
    const expected = await generateTotpToken(secret, offset);
    if (timingSafeEqualStr(expected, cleaned)) return true;
  }
  return false;
}

export async function generateRecoveryCodes(count: number = 8): Promise<{ plainCodes: string[]; hashes: string[] }> {
  const plainCodes: string[] = [];
  const hashes: string[] = [];
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

  for (let i = 0; i < count; i++) {
    const rand = new Uint8Array(8);
    globalThis.crypto.getRandomValues(rand);
    let code = '';
    for (let j = 0; j < 8; j++) {
      if (j === 4) code += '-';
      code += chars[rand[j] % chars.length];
    }
    plainCodes.push(code);
    hashes.push(await sha256Hex(code.replace(/-/g, '').toUpperCase()));
  }
  return { plainCodes, hashes };
}

export async function verifyAndConsumeRecoveryCode(
  user: User,
  codeInput: string
): Promise<{ valid: boolean; updatedHashes: string[] }> {
  const normalized = (codeInput || '').replace(/[\s-]/g, '').toUpperCase();
  const hashes = user.securitySettings?.twoFactorRecoveryHashes || [];
  if (!normalized || hashes.length === 0) return { valid: false, updatedHashes: hashes };

  const targetHash = await sha256Hex(normalized);
  const idx = hashes.findIndex((h) => timingSafeEqualStr(h, targetHash));
  if (idx === -1) return { valid: false, updatedHashes: hashes };

  const updatedHashes = hashes.filter((_, i) => i !== idx);
  return { valid: true, updatedHashes };
}

// ----------------- Device Sessions, Login Monitoring & Notifications -----------------

export function getOrCreateDeviceSessionId(): string {
  if (typeof window === 'undefined') return 'server-session';
  try {
    let sid = localStorage.getItem(SESSION_ID_KEY);
    if (!sid) {
      const rand = new Uint8Array(12);
      window.crypto.getRandomValues(rand);
      const hex = Array.from(rand).map((b) => b.toString(16).padStart(2, '0')).join('');
      sid = `sess_${hex}`;
      localStorage.setItem(SESSION_ID_KEY, sid);
    }
    return sid;
  } catch {
    return `sess_${Date.now().toString(36)}`;
  }
}

export function getLocalSessionEpoch(userId: string): number {
  if (typeof window === 'undefined' || !userId) return 1;
  try {
    const val = localStorage.getItem(`lumina_session_epoch_${userId}`);
    return val ? parseInt(val, 10) || 1 : 1;
  } catch {
    return 1;
  }
}

export function setLocalSessionEpoch(userId: string, epoch: number): void {
  if (typeof window === 'undefined' || !userId) return;
  try {
    localStorage.setItem(`lumina_session_epoch_${userId}`, String(epoch));
  } catch {}
}

export function getCurrentDeviceDescriptor(): { deviceLabel: string; platform: string; timezone: string } {
  if (typeof window === 'undefined') {
    return { deviceLabel: 'Web Browser', platform: 'Web', timezone: 'UTC' };
  }
  const ua = navigator.userAgent || '';
  let os = 'Desktop';
  if (/iphone/i.test(ua)) os = 'iPhone (iOS)';
  else if (/ipad/i.test(ua)) os = 'iPad (iPadOS)';
  else if (/android/i.test(ua)) os = 'Android Device';
  else if (/macintosh|mac os x/i.test(ua)) os = 'Mac';
  else if (/windows/i.test(ua)) os = 'Windows PC';
  else if (/linux/i.test(ua)) os = 'Linux';

  let browser = 'Browser';
  if (/edg/i.test(ua)) browser = 'Edge';
  else if (/chrome|crios/i.test(ua)) browser = 'Chrome';
  else if (/safari/i.test(ua) && !/chrome/i.test(ua)) browser = 'Safari';
  else if (/firefox|fxios/i.test(ua)) browser = 'Firefox';

  let timezone = 'UTC';
  try {
    timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {}

  return {
    deviceLabel: `${browser} on ${os}`,
    platform: os,
    timezone,
  };
}

export function createSecurityNotification(
  title: string,
  body: string,
  emoji: string = '🛡️'
): AppNotification {
  return {
    id: `sec_notif_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    title,
    body,
    emoji,
    timestamp: new Date().toISOString(),
    isRead: false,
    category: 'security',
    phaseInfo: 'Account Security',
  };
}

export function getDefaultSecuritySettings(existing?: Partial<SecuritySettings>): SecuritySettings {
  return {
    twoFactorEnabled: existing?.twoFactorEnabled ?? false,
    twoFactorSecretEnc: existing?.twoFactorSecretEnc,
    twoFactorRecoveryHashes: existing?.twoFactorRecoveryHashes ?? [],
    emailVerified: existing?.emailVerified ?? false,
    sessionEpoch: existing?.sessionEpoch ?? 1,
    activeSessions: existing?.activeSessions ?? [],
    loginHistory: existing?.loginHistory ?? [],
    biometricQuickUnlock: existing?.biometricQuickUnlock ?? false,
    biometricCredentialId: existing?.biometricCredentialId,
    biometricPlatform: existing?.biometricPlatform,
    lastPasswordChangeAt: existing?.lastPasswordChangeAt,
    lastSecurityUpdateAt: existing?.lastSecurityUpdateAt,
  };
}

export function applyLoginSecurityAudit(
  user: User,
  method: string,
  status: LoginActivityEntry['status'] = 'success',
  note?: string
): User {
  const nowIso = new Date().toISOString();
  const sessionId = getOrCreateDeviceSessionId();
  const descriptor = getCurrentDeviceDescriptor();
  const prevSec = getDefaultSecuritySettings(user.securitySettings);

  const priorSuccess = prevSec.loginHistory.filter((h) => h.status === 'success');
  const knownDevice = priorSuccess.some((h) => h.deviceLabel === descriptor.deviceLabel);
  const knownTimezone = priorSuccess.some((h) => h.timezone === descriptor.timezone);
  const isSuspicious =
    status === 'success' &&
    priorSuccess.length > 0 &&
    (!knownDevice || !knownTimezone);

  const loginEntry: LoginActivityEntry = {
    id: `login_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    timestamp: nowIso,
    method,
    status,
    deviceLabel: descriptor.deviceLabel,
    timezone: descriptor.timezone,
    suspicious: isSuspicious,
    note: isSuspicious
      ? `New ${!knownDevice ? 'device' : 'timezone'} sign-in detected (${descriptor.deviceLabel} • ${descriptor.timezone})`
      : note,
  };

  let nextSessions = [...prevSec.activeSessions];
  if (status === 'success') {
    const existingIdx = nextSessions.findIndex((s) => s.sessionId === sessionId);
    const sessionRecord: ActiveSessionInfo = {
      sessionId,
      deviceLabel: descriptor.deviceLabel,
      platform: descriptor.platform,
      timezone: descriptor.timezone,
      lastActiveAt: nowIso,
      createdAt: existingIdx >= 0 ? nextSessions[existingIdx].createdAt : nowIso,
      authMethod: method,
    };
    if (existingIdx >= 0) {
      nextSessions[existingIdx] = sessionRecord;
    } else {
      nextSessions = [sessionRecord, ...nextSessions].slice(0, 10);
    }
    setLocalSessionEpoch(user.id, prevSec.sessionEpoch);
  }

  let notifications = user.notifications || [];
  if (isSuspicious) {
    const alert = createSecurityNotification(
      'Suspicious New Sign-In Detected',
      `We noticed a sign-in from ${descriptor.deviceLabel} (${descriptor.timezone}). If this wasn't you, revoke sessions in Privacy & Security immediately.`,
      '🚨'
    );
    notifications = [alert, ...notifications].slice(0, 50);
  }

  return {
    ...user,
    notifications,
    securitySettings: {
      ...prevSec,
      activeSessions: nextSessions,
      loginHistory: [loginEntry, ...prevSec.loginHistory].slice(0, 25),
    },
  };
}

export function appendSecurityEventToUser(
  user: User,
  title: string,
  body: string,
  emoji: string = '🛡️'
): User {
  const prevSec = getDefaultSecuritySettings(user.securitySettings);
  const descriptor = getCurrentDeviceDescriptor();
  const nowIso = new Date().toISOString();
  const notif = createSecurityNotification(title, body, emoji);
  const entry: LoginActivityEntry = {
    id: `sec_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    timestamp: nowIso,
    method: 'security_setting',
    status: 'security_change',
    deviceLabel: descriptor.deviceLabel,
    timezone: descriptor.timezone,
    note: title,
  };

  return {
    ...user,
    notifications: [notif, ...(user.notifications || [])].slice(0, 50),
    securitySettings: {
      ...prevSec,
      lastSecurityUpdateAt: nowIso,
      loginHistory: [entry, ...prevSec.loginHistory].slice(0, 25),
    },
  };
}
