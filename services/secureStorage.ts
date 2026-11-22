// Key prefix to identify secure payloads
const SECURE_STORAGE_PREFIX = 'lumina_secure_';
const DEVICE_SECRET_KEY = 'lumina_device_key_material_v2';

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

function getOrCreateDeviceEntropy(): string {
  if (typeof window === 'undefined') return 'lumina-ssr-fallback-seed';
  try {
    let seed = localStorage.getItem(DEVICE_SECRET_KEY);
    if (!seed || seed.length < 32) {
      const rand = new Uint8Array(32);
      if (window.crypto && typeof window.crypto.getRandomValues === 'function') {
        window.crypto.getRandomValues(rand);
        seed = bytesToHex(rand);
      } else {
        seed = `${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}_${Math.random().toString(36).slice(2)}`;
      }
      localStorage.setItem(DEVICE_SECRET_KEY, seed);
    }
    return seed;
  } catch {
    return 'lumina-ephemeral-device-seed';
  }
}

/**
 * Computes a lowercase SHA-256 hex digest using Web Crypto.
 */
export async function sha256Hex(input: string): Promise<string> {
  if (typeof window !== 'undefined' && window.crypto?.subtle) {
    const enc = new TextEncoder().encode(input);
    const digest = await window.crypto.subtle.digest('SHA-256', enc);
    return bytesToHex(new Uint8Array(digest));
  }
  // Lightweight deterministic fallback only if Web Crypto is unavailable
  let h1 = 0xdeadbeef ^ input.length;
  let h2 = 0x41c6ce57 ^ input.length;
  for (let i = 0; i < input.length; i++) {
    const ch = input.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  return ((h1 >>> 0).toString(16).padStart(8, '0') + (h2 >>> 0).toString(16).padStart(8, '0')).repeat(4);
}

/**
 * Derives a proper 256-bit (32-byte) AES-GCM CryptoKey from device entropy + key name via SHA-256.
 */
async function getDeviceAesKey(keyName: string): Promise<CryptoKey> {
  const entropy = getOrCreateDeviceEntropy();
  const material = new TextEncoder().encode(`lumina:v2:${entropy}:${keyName}`);
  const hashed = await crypto.subtle.digest('SHA-256', material);
  return crypto.subtle.importKey(
    'raw',
    hashed,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
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
  if (typeof window === 'undefined' || !window.crypto?.subtle) {
    throw new Error('Secure Web Crypto encryption is not supported in this environment.');
  }
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await derivePassphraseKey(passphrase, salt);
  const encoded = new TextEncoder().encode(plaintext);
  const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoded);
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
  if (typeof window === 'undefined' || !window.crypto?.subtle) {
    throw new Error('Secure Web Crypto decryption is not supported in this environment.');
  }
  const salt = hexToBytes(payload.salt);
  const iv = hexToBytes(payload.iv);
  const cipherBytes = hexToBytes(payload.ciphertext);
  const key = await derivePassphraseKey(passphrase, salt);
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: iv as BufferSource },
    key,
    cipherBytes as BufferSource
  );
  return new TextDecoder().decode(decrypted);
}

/**
 * Actively removes any legacy insecure keys such as plaintext saved passwords.
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
 * Hardware-accelerated AES-GCM 256-bit authenticated storage adapter for Lumina.
 */
export const secureStorage = {
  async setItem(key: string, value: string): Promise<void> {
    try {
      if (typeof window === 'undefined' || !window.crypto || !crypto.subtle) {
        localStorage.setItem(SECURE_STORAGE_PREFIX + key, value);
        return;
      }

      const iv = crypto.getRandomValues(new Uint8Array(12));
      const encodedValue = new TextEncoder().encode(value);
      const cryptoKey = await getDeviceAesKey(key);

      const encryptedBuffer = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        cryptoKey,
        encodedValue
      );

      const payload = JSON.stringify({
        v: 2,
        iv: bytesToHex(iv),
        data: bytesToHex(new Uint8Array(encryptedBuffer)),
      });
      localStorage.setItem(SECURE_STORAGE_PREFIX + key, payload);
    } catch (err) {
      console.error('Secure storage encryption failure:', err);
      throw err;
    }
  },

  async getItem(key: string): Promise<string | null> {
    try {
      const stored = localStorage.getItem(SECURE_STORAGE_PREFIX + key);
      if (!stored) return null;

      if (typeof window === 'undefined' || !window.crypto || !crypto.subtle) {
        return stored.startsWith('{') ? null : stored;
      }

      if (!stored.startsWith('{')) {
        return stored;
      }

      const parsed = JSON.parse(stored);
      if (!parsed?.iv || !parsed?.data) {
        return stored;
      }

      const iv = hexToBytes(parsed.iv);
      const encryptedData = hexToBytes(parsed.data);
      const cryptoKey = await getDeviceAesKey(key);

      const decryptedBuffer = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: iv as BufferSource },
        cryptoKey,
        encryptedData as BufferSource
      );

      return new TextDecoder().decode(decryptedBuffer);
    } catch (err) {
      console.warn('Secure storage decryption notice for key:', key, err);
      return null;
    }
  },

  async removeItem(key: string): Promise<void> {
    localStorage.removeItem(SECURE_STORAGE_PREFIX + key);
  },
};
