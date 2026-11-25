// Encrypted Local Vault & Non-Extractable Keystore for Lumina

const SECURE_STORAGE_PREFIX = 'lumina_secure_';
const LEGACY_DEVICE_SECRET_KEY = 'lumina_device_key_material_v2';
const KEYSTORE_DB_NAME = 'lumina_secure_keystore_v3';
const KEYSTORE_STORE_NAME = 'keys';
const VAULT_STORE_NAME = 'vault';
const MASTER_KEY_ID = 'lumina_device_master_aes_key_v3';
const SESSION_KEY_ID = 'lumina_ephemeral_session_aes_key_v1';

// Plaintext keys that must never persist unencrypted in localStorage
const LEGACY_PLAINTEXT_HEALTH_KEYS = [
  'lumina_user',
  'lumina_biometric_user',
  'lumina_diary_draft',
  'lumina_partner_requests',
  'lumina_saved_password',
  'lumina_analytics_events',
  'lumina_crash_reports',
];

const LEGACY_PLAINTEXT_PREFIXES = [
  'lumina_user_',
  'lumina_user_email_',
  'lumina_chat_',
  'lumina_gifts_',
  'lumina_invite_',
  'lumina_session_unlocked',
];

let inMemoryMasterKey: CryptoKey | null = null;
let inMemorySessionKey: CryptoKey | null = null;
const inMemoryVaultFallback = new Map<string, string>();

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function hexToBytes(hex: string): Uint8Array {
  const clean = hex.replace(/[^0-9a-fA-F]/g, '');
  const out = new Uint8Array(clean.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

function openKeystoreDb(): Promise<IDBDatabase | null> {
  if (typeof window === 'undefined' || !window.indexedDB) {
    return Promise.resolve(null);
  }
  return new Promise((resolve) => {
    try {
      const req = window.indexedDB.open(KEYSTORE_DB_NAME, 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(KEYSTORE_STORE_NAME)) {
          db.createObjectStore(KEYSTORE_STORE_NAME);
        }
        if (!db.objectStoreNames.contains(VAULT_STORE_NAME)) {
          db.createObjectStore(VAULT_STORE_NAME);
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

async function idbGet<T>(storeName: string, key: string): Promise<T | null> {
  const db = await openKeystoreDb();
  if (!db) return null;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      const req = store.get(key);
      req.onsuccess = () => resolve((req.result as T) ?? null);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

async function idbPut<T>(storeName: string, key: string, value: T): Promise<boolean> {
  const db = await openKeystoreDb();
  if (!db) return false;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      const req = store.put(value, key);
      req.onsuccess = () => resolve(true);
      req.onerror = () => resolve(false);
    } catch {
      resolve(false);
    }
  });
}

async function idbDelete(storeName: string, key: string): Promise<void> {
  const db = await openKeystoreDb();
  if (!db) return;
  await new Promise<void>((resolve) => {
    try {
      const tx = db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      const req = store.delete(key);
      req.onsuccess = () => resolve();
      req.onerror = () => resolve();
    } catch {
      resolve();
    }
  });
}

async function idbGetAllKeys(storeName: string): Promise<string[]> {
  const db = await openKeystoreDb();
  if (!db) return [];
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      const req = store.getAllKeys();
      req.onsuccess = () => resolve((req.result as string[]) || []);
      req.onerror = () => resolve([]);
    } catch {
      resolve([]);
    }
  });
}

/**
 * Generates or retrieves a non-extractable AES-GCM-256 CryptoKey persisted inside IndexedDB.
 * Key bytes cannot be read via JS or localStorage inspection.
 */
async function getOrCreateNonExtractableKey(keyId: string): Promise<CryptoKey> {
  if (keyId === MASTER_KEY_ID && inMemoryMasterKey) return inMemoryMasterKey;
  if (keyId === SESSION_KEY_ID && inMemorySessionKey) return inMemorySessionKey;

  const existing = await idbGet<CryptoKey>(KEYSTORE_STORE_NAME, keyId);
  if (existing) {
    if (keyId === MASTER_KEY_ID) inMemoryMasterKey = existing;
    if (keyId === SESSION_KEY_ID) inMemorySessionKey = existing;
    return existing;
  }

  const generated = await crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    false, // Non-extractable master key
    ['encrypt', 'decrypt']
  );

  await idbPut(KEYSTORE_STORE_NAME, keyId, generated);
  if (keyId === MASTER_KEY_ID) inMemoryMasterKey = generated;
  if (keyId === SESSION_KEY_ID) inMemorySessionKey = generated;
  return generated;
}

/**
 * Legacy v2 decryption support for transparent one-time migration only.
 */
async function tryDecryptLegacyV2(
  keyName: string,
  parsed: { iv: string; data: string }
): Promise<string | null> {
  try {
    if (typeof window === 'undefined' || !window.crypto?.subtle) return null;
    const legacySeed = localStorage.getItem(LEGACY_DEVICE_SECRET_KEY);
    if (!legacySeed || legacySeed.length < 16) return null;
    const material = new TextEncoder().encode(`lumina:v2:${legacySeed}:${keyName}`);
    const hashed = await crypto.subtle.digest('SHA-256', material);
    const legacyKey = await crypto.subtle.importKey(
      'raw',
      hashed,
      { name: 'AES-GCM', length: 256 },
      false,
      ['decrypt']
    );
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: hexToBytes(parsed.iv) as BufferSource },
      legacyKey,
      hexToBytes(parsed.data) as BufferSource
    );
    return new TextDecoder().decode(decrypted);
  } catch {
    return null;
  }
}

/**
 * Computes a lowercase SHA-256 hex digest using Web Crypto.
 */
export async function sha256Hex(input: string): Promise<string> {
  if (typeof globalThis !== 'undefined' && globalThis.crypto?.subtle) {
    const enc = new TextEncoder().encode(input);
    const digest = await globalThis.crypto.subtle.digest('SHA-256', enc);
    return bytesToHex(new Uint8Array(digest));
  }
  throw new Error('Secure cryptographic hashing is required and unavailable in this runtime.');
}

/**
 * Derives a 256-bit AES-GCM key from a user passphrase and salt using PBKDF2-SHA256 (120,000 iterations).
 */
async function derivePassphraseKey(passphrase: string, salt: Uint8Array): Promise<CryptoKey> {
  const baseKey = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(passphrase),
    'PBKDF2',
    false,
    ['deriveKey']
  );
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt as BufferSource,
      iterations: 120000,
      hash: 'SHA-256',
    },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

export async function encryptWithPassphrase(plaintext: string, passphrase: string): Promise<{
  salt: string;
  iv: string;
  ciphertext: string;
}> {
  if (typeof globalThis === 'undefined' || !globalThis.crypto?.subtle) {
    throw new Error('Secure Web Crypto encryption is not supported in this environment.');
  }
  const salt = globalThis.crypto.getRandomValues(new Uint8Array(16));
  const iv = globalThis.crypto.getRandomValues(new Uint8Array(12));
  const key = await derivePassphraseKey(passphrase, salt);
  const encoded = new TextEncoder().encode(plaintext);
  const encrypted = await globalThis.crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoded);
  return {
    salt: bytesToHex(salt),
    iv: bytesToHex(iv),
    ciphertext: bytesToHex(new Uint8Array(encrypted)),
  };
}

export async function decryptWithPassphrase(
  payload: { salt: string; iv: string; ciphertext: string },
  passphrase: string
): Promise<string> {
  if (typeof globalThis === 'undefined' || !globalThis.crypto?.subtle) {
    throw new Error('Secure Web Crypto decryption is not supported in this environment.');
  }
  const salt = hexToBytes(payload.salt);
  const iv = hexToBytes(payload.iv);
  const cipherBytes = hexToBytes(payload.ciphertext);
  const key = await derivePassphraseKey(passphrase, salt);
  const decrypted = await globalThis.crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: iv as BufferSource },
    key,
    cipherBytes as BufferSource
  );
  return new TextDecoder().decode(decrypted);
}

/**
 * Encrypts plaintext with the non-extractable IndexedDB AES-GCM-256 master key using AAD bound to the key name.
 */
async function encryptWithMasterKey(keyName: string, plaintext: string, keyId: string = MASTER_KEY_ID): Promise<string> {
  if (typeof window === 'undefined' || !window.crypto?.subtle) {
    throw new Error('Web Crypto is required for encrypted storage.');
  }
  const masterKey = await getOrCreateNonExtractableKey(keyId);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const aad = new TextEncoder().encode(`lumina:v3:${keyName}`);
  const encodedValue = new TextEncoder().encode(plaintext);
  const encryptedBuffer = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv, additionalData: aad },
    masterKey,
    encodedValue
  );
  return JSON.stringify({
    v: 3,
    iv: bytesToHex(iv),
    data: bytesToHex(new Uint8Array(encryptedBuffer)),
  });
}

async function decryptWithMasterKey(keyName: string, rawPayload: string, keyId: string = MASTER_KEY_ID): Promise<string | null> {
  try {
    if (typeof window === 'undefined' || !window.crypto?.subtle) return null;
    const parsed = JSON.parse(rawPayload);
    if (!parsed?.iv || !parsed?.data) return null;

    if (parsed.v === 3) {
      const masterKey = await getOrCreateNonExtractableKey(keyId);
      const aad = new TextEncoder().encode(`lumina:v3:${keyName}`);
      const decryptedBuffer = await crypto.subtle.decrypt(
        {
          name: 'AES-GCM',
          iv: hexToBytes(parsed.iv) as BufferSource,
          additionalData: aad,
        },
        masterKey,
        hexToBytes(parsed.data) as BufferSource
      );
      return new TextDecoder().decode(decryptedBuffer);
    }

    // Legacy v2 auto-migration path
    if (parsed.v === 2) {
      const legacyPlain = await tryDecryptLegacyV2(keyName, parsed);
      if (legacyPlain !== null) {
        // Transparently upgrade stored payload to v3 non-extractable keystore
        await secureStorage.setItem(keyName, legacyPlain);
        return legacyPlain;
      }
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Actively removes any legacy insecure keys such as plaintext saved passwords or raw local health caches.
 */
export function scrubLegacySensitiveKeys(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem('lumina_saved_password');
    sessionStorage.removeItem('lumina_saved_password');
  } catch {
    // Ignore storage access exceptions
  }
}

/**
 * Migrates any legacy plaintext reproductive/profile keys out of localStorage into the AES-GCM-256 vault,
 * and scrubs plaintext localStorage copies so sensitive health records are never left readable in localStorage.
 */
export async function migrateAndScrubLegacyPlaintextData(): Promise<void> {
  if (typeof window === 'undefined') return;
  scrubLegacySensitiveKeys();

  try {
    // Migrate legacy diary draft if present in plaintext
    const legacyDraft = localStorage.getItem('lumina_diary_draft');
    if (legacyDraft) {
      await secureStorage.setItem('diary_draft_v1', legacyDraft);
      localStorage.removeItem('lumina_diary_draft');
    }

    // Migrate legacy biometric profile marker if present without storing full health JSON in localStorage
    const legacyBio = localStorage.getItem('lumina_biometric_user');
    if (legacyBio) {
      try {
        const parsed = JSON.parse(legacyBio);
        if (parsed?.id) {
          await secureStorage.setItem(
            'biometric_hint_v1',
            JSON.stringify({ userId: parsed.id, name: parsed.name || 'Lumina User', email: parsed.email || '' })
          );
        }
      } catch {}
      localStorage.removeItem('lumina_biometric_user');
    }

    // Migrate legacy chat histories to encrypted vault and delete plaintext copies
    const keysToScrub: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k) continue;
      if (k.startsWith('lumina_chat_')) {
        const val = localStorage.getItem(k);
        if (val) {
          await secureStorage.setItem(`chat_${k.slice('lumina_chat_'.length)}`, val);
        }
        keysToScrub.push(k);
      } else if (
        k === 'lumina_user' ||
        k.startsWith('lumina_user_') ||
        k.startsWith('lumina_user_email_') ||
        k === 'lumina_partner_requests' ||
        k.startsWith('lumina_gifts_') ||
        k.startsWith('lumina_invite_')
      ) {
        keysToScrub.push(k);
      }
    }
    keysToScrub.forEach((k) => localStorage.removeItem(k));
  } catch {
    // Never break app startup on cleanup
  }
}

/**
 * Hardware-accelerated AES-GCM-256 encrypted storage adapter backed by IndexedDB + non-extractable CryptoKey.
 * Ciphertexts are never stored alongside raw key material in localStorage.
 */
export const secureStorage = {
  async setItem(key: string, value: string): Promise<void> {
    if (typeof window === 'undefined' || !window.crypto?.subtle) {
      inMemoryVaultFallback.set(key, value);
      return;
    }

    const encryptedPayload = await encryptWithMasterKey(key, value, MASTER_KEY_ID);
    const savedToIdb = await idbPut(VAULT_STORE_NAME, key, encryptedPayload);
    if (savedToIdb) {
      // Remove any legacy ciphertext in localStorage
      localStorage.removeItem(SECURE_STORAGE_PREFIX + key);
    } else {
      // IndexedDB unavailable (strict private browsing): store ciphertext with non-extractable in-memory key or local fallback without exposing raw key material
      inMemoryVaultFallback.set(key, encryptedPayload);
    }
  },

  async getItem(key: string): Promise<string | null> {
    if (typeof window === 'undefined' || !window.crypto?.subtle) {
      return inMemoryVaultFallback.get(key) ?? null;
    }

    const fromIdb = await idbGet<string>(VAULT_STORE_NAME, key);
    if (fromIdb) {
      return decryptWithMasterKey(key, fromIdb, MASTER_KEY_ID);
    }

    const fromMem = inMemoryVaultFallback.get(key);
    if (fromMem) {
      return decryptWithMasterKey(key, fromMem, MASTER_KEY_ID);
    }

    // Read legacy v2 entry from localStorage and transparently migrate into IndexedDB v3 vault
    const legacyStored = localStorage.getItem(SECURE_STORAGE_PREFIX + key);
    if (legacyStored && legacyStored.startsWith('{')) {
      const migrated = await decryptWithMasterKey(key, legacyStored, MASTER_KEY_ID);
      if (migrated !== null) {
        localStorage.removeItem(SECURE_STORAGE_PREFIX + key);
        return migrated;
      }
    }
    return null;
  },

  async removeItem(key: string): Promise<void> {
    inMemoryVaultFallback.delete(key);
    await idbDelete(VAULT_STORE_NAME, key);
    try {
      localStorage.removeItem(SECURE_STORAGE_PREFIX + key);
    } catch {}
  },
};

/**
 * Stores encrypted active session profile strictly using non-extractable Web Crypto keys:
 * - persistent: encrypted inside IndexedDB vault (never plaintext in localStorage)
 * - session: encrypted inside sessionStorage using an ephemeral session AES key
 */
export async function saveEncryptedSessionUser(
  userObj: unknown,
  rememberMe: boolean
): Promise<void> {
  if (typeof window === 'undefined') return;
  const serialized = JSON.stringify(userObj);
  if (rememberMe) {
    await secureStorage.setItem('active_user_profile_v3', serialized);
    sessionStorage.removeItem('lumina_session_profile_v3');
  } else {
    await secureStorage.removeItem('active_user_profile_v3');
    if (window.crypto?.subtle) {
      const enc = await encryptWithMasterKey('session_profile_v3', serialized, SESSION_KEY_ID);
      sessionStorage.setItem('lumina_session_profile_v3', enc);
    }
  }
}

export async function loadEncryptedSessionUser<T = any>(rememberMe: boolean): Promise<T | null> {
  if (typeof window === 'undefined') return null;
  try {
    if (!rememberMe) {
      const rawSess = sessionStorage.getItem('lumina_session_profile_v3');
      if (!rawSess) return null;
      const dec = await decryptWithMasterKey('session_profile_v3', rawSess, SESSION_KEY_ID);
      return dec ? (JSON.parse(dec) as T) : null;
    }
    const rawIdb = await secureStorage.getItem('active_user_profile_v3');
    if (rawIdb) return JSON.parse(rawIdb) as T;
    // Also check session fallback if rememberMe changed during session
    const rawSess = sessionStorage.getItem('lumina_session_profile_v3');
    if (rawSess) {
      const dec = await decryptWithMasterKey('session_profile_v3', rawSess, SESSION_KEY_ID);
      return dec ? (JSON.parse(dec) as T) : null;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Completely purges sensitive session caches, health records, drafts, and chat histories upon logout.
 * Preserves long-lived device offline credential verifiers unless clearOfflineVerifiers = true.
 */
export async function purgeAllLuminaClientSecrets(options?: {
  clearOfflineVerifiers?: boolean;
  clearBiometricBinding?: boolean;
}): Promise<void> {
  if (typeof window === 'undefined') return;

  try {
    await secureStorage.removeItem('active_user_profile_v3');
    await secureStorage.removeItem('diary_draft_v1');
    if (options?.clearBiometricBinding) {
      await secureStorage.removeItem('biometric_hint_v1');
    }

    const vaultKeys = await idbGetAllKeys(VAULT_STORE_NAME);
    for (const vk of vaultKeys) {
      if (
        vk.startsWith('chat_') ||
        vk === 'active_user_profile_v3' ||
        vk === 'diary_draft_v1' ||
        (options?.clearOfflineVerifiers && vk.startsWith('lumina_cred_')) ||
        (options?.clearBiometricBinding && vk.startsWith('webauthn_cred_'))
      ) {
        await secureStorage.removeItem(vk);
      }
    }

    if (options?.clearOfflineVerifiers) {
      await idbDelete(KEYSTORE_STORE_NAME, SESSION_KEY_ID);
    }
    inMemorySessionKey = null;

    for (const k of LEGACY_PLAINTEXT_HEALTH_KEYS) {
      localStorage.removeItem(k);
    }

    const toDelete: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k) continue;
      if (LEGACY_PLAINTEXT_PREFIXES.some((prefix) => k.startsWith(prefix))) {
        toDelete.push(k);
      }
    }
    toDelete.forEach((k) => localStorage.removeItem(k));

    sessionStorage.removeItem('lumina_session_unlocked');
    sessionStorage.removeItem('lumina_session_profile_v3');
    sessionStorage.removeItem('lumina_user');
    sessionStorage.removeItem('lumina_saved_password');
    sessionStorage.removeItem('lumina_partnermode_subtab');
  } catch {
    // Best-effort full cleanup
  }
}
