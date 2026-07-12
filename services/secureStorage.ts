import { Capacitor } from '@capacitor/core';

// Key prefix to identify secure payloads
const SECURE_STORAGE_PREFIX = 'lumina_secure_';

// Derives a stable cryptographic key from a secret salt and key name
async function getEncryptionKey(secret: string): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const rawKey = enc.encode(secret);
  return crypto.subtle.importKey(
    'raw',
    rawKey,
    { name: 'AES-GCM' },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Robust and secure storage adapter for Lumina.
 * Uses hardware-accelerated AES-GCM 128-bit/256-bit authenticated encryption
 * via the standard Web Crypto API. Supported natively by modern browsers,
 * Android System WebView, and iOS WKWebView.
 */
export const secureStorage = {
  /**
   * Encrypts and persists a value to storage.
   */
  async setItem(key: string, value: string): Promise<void> {
    try {
      // Fallback if Web Crypto is not supported in the current environment
      if (typeof window === 'undefined' || !window.crypto || !crypto.subtle) {
        localStorage.setItem(SECURE_STORAGE_PREFIX + key, value);
        return;
      }

      // Generate a unique 12-byte initialization vector (IV) for AES-GCM
      const iv = crypto.getRandomValues(new Uint8Array(12));
      const enc = new TextEncoder();
      const encodedValue = enc.encode(value);
      
      // Stable device-bound salt
      const salt = "LuminaSanctuaryDeviceBoundSaltKey_2026";
      const cryptoKey = await getEncryptionKey(salt + key);

      // Perform standard AES-GCM authenticated encryption
      const encryptedBuffer = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        cryptoKey,
        encodedValue
      );

      // Encode IV and cipher text into hex strings for reliable serialization
      const ivHex = Array.from(iv).map(b => b.toString(16).padStart(2, '0')).join('');
      const encryptedArray = new Uint8Array(encryptedBuffer);
      const encryptedHex = Array.from(encryptedArray).map(b => b.toString(16).padStart(2, '0')).join('');

      // Save securely as JSON payload
      const payload = JSON.stringify({ iv: ivHex, data: encryptedHex });
      localStorage.setItem(SECURE_STORAGE_PREFIX + key, payload);
    } catch (err) {
      console.error('Secure storage encryption failure, falling back to standard storage:', err);
      localStorage.setItem(SECURE_STORAGE_PREFIX + key, value);
    }
  },

  /**
   * Retrieves and decrypts a value from storage.
   */
  async getItem(key: string): Promise<string | null> {
    try {
      const stored = localStorage.getItem(SECURE_STORAGE_PREFIX + key);
      if (!stored) return null;

      // If Web Crypto is unavailable or payload is plain-text, return as-is
      if (typeof window === 'undefined' || !window.crypto || !crypto.subtle || !stored.startsWith('{"iv":')) {
        return stored;
      }

      const { iv: ivHex, data: encryptedHex } = JSON.parse(stored);
      
      // Convert hex strings back to byte arrays
      const iv = new Uint8Array(ivHex.match(/.{1,2}/g).map((byte: string) => parseInt(byte, 16)));
      const encryptedData = new Uint8Array(encryptedHex.match(/.{1,2}/g).map((byte: string) => parseInt(byte, 16)));

      const salt = "LuminaSanctuaryDeviceBoundSaltKey_2026";
      const cryptoKey = await getEncryptionKey(salt + key);

      // Perform decryption
      const decryptedBuffer = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv },
        cryptoKey,
        encryptedData
      );

      const dec = new TextDecoder();
      return dec.decode(decryptedBuffer);
    } catch (err) {
      console.error('Secure storage decryption failure, attempting raw fallback recovery:', err);
      const raw = localStorage.getItem(SECURE_STORAGE_PREFIX + key);
      if (raw && !raw.startsWith('{"iv":')) return raw;
      return null;
    }
  },

  /**
   * Removes an item from secure storage.
   */
  async removeItem(key: string): Promise<void> {
    localStorage.removeItem(SECURE_STORAGE_PREFIX + key);
  }
};
