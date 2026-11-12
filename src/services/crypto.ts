/**
 * Client-Side End-to-End Encryption Service using Web Crypto API.
 * Uses AES-GCM 256-bit encryption with PBKDF2 key derivation (100,000 iterations, SHA-256).
 * Ensures zero-knowledge privacy for confidential student notes and teacher observations.
 */

function bufferToBase64(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

function base64ToBuffer(base64: string): Uint8Array {
  const binary = window.atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

// In-memory decrypted CryptoKey cache for current session only
let activeSessionKey: CryptoKey | null = null;
let activeSessionSalt: string | null = null;

export const CryptoVault = {
  /**
   * Generates a random cryptographic salt (16 bytes)
   */
  generateSalt(): string {
    const salt = window.crypto.getRandomValues(new Uint8Array(16));
    return bufferToBase64(salt);
  },

  /**
   * Generates a password verifier hash to check passphrase correctness without storing password
   */
  async generateVerifier(password: string, saltBase64: string): Promise<string> {
    const enc = new TextEncoder();
    const salt = base64ToBuffer(saltBase64);
    const combined = new Uint8Array(salt.length + enc.encode(password).length);
    combined.set(salt, 0);
    combined.set(enc.encode("VERIFY_VAULT_KEY:" + password), salt.length);
    const hash = await window.crypto.subtle.digest('SHA-256', combined);
    return bufferToBase64(hash);
  },

  /**
   * Derives an AES-GCM 256 key from a passphrase and salt using PBKDF2
   */
  async deriveKey(password: string, saltBase64: string): Promise<CryptoKey> {
    const enc = new TextEncoder();
    const keyMaterial = await window.crypto.subtle.importKey(
      'raw',
      enc.encode(password),
      { name: 'PBKDF2' },
      false,
      ['deriveKey']
    );

    const salt = base64ToBuffer(saltBase64);

    return window.crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: salt as any,
        iterations: 100000,
        hash: 'SHA-256',
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
  },

  /**
   * Unlocks vault in current session memory
   */
  async unlock(password: string, saltBase64: string, expectedVerifier?: string): Promise<boolean> {
    if (expectedVerifier) {
      const verifier = await this.generateVerifier(password, saltBase64);
      if (verifier !== expectedVerifier) {
        return false;
      }
    }

    try {
      const key = await this.deriveKey(password, saltBase64);
      activeSessionKey = key;
      activeSessionSalt = saltBase64;
      return true;
    } catch (err) {
      console.error('Failed to unlock vault:', err);
      return false;
    }
  },

  /**
   * Clears decrypted key from memory
   */
  lock(): void {
    activeSessionKey = null;
    activeSessionSalt = null;
  },

  isUnlocked(): boolean {
    return activeSessionKey !== null;
  },

  /**
   * Encrypts plaintext string using AES-GCM 256 with a unique 12-byte IV
   */
  async encrypt(plaintext: string): Promise<{ ciphertext: string; iv: string; salt: string }> {
    if (!activeSessionKey || !activeSessionSalt) {
      throw new Error('Vault is locked. Unlock the vault to encrypt notes.');
    }

    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const enc = new TextEncoder();
    const data = enc.encode(plaintext);

    const encrypted = await window.crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv,
      },
      activeSessionKey,
      data
    );

    return {
      ciphertext: bufferToBase64(encrypted),
      iv: bufferToBase64(iv),
      salt: activeSessionSalt,
    };
  },

  /**
   * Decrypts ciphertext with IV using the active session key
   */
  async decrypt(ciphertextBase64: string, ivBase64: string): Promise<string> {
    if (!activeSessionKey) {
      throw new Error('Vault is locked. Unlock the vault to decrypt notes.');
    }

    const ciphertext = base64ToBuffer(ciphertextBase64);
    const iv = base64ToBuffer(ivBase64);

    try {
      const decrypted = await window.crypto.subtle.decrypt(
        {
          name: 'AES-GCM',
          iv: iv as any,
        },
        activeSessionKey,
        ciphertext as any
      );

      const dec = new TextDecoder();
      return dec.decode(decrypted);
    } catch (err) {
      console.error('Decryption failed. Invalid key or corrupted data.');
      return '[Decryption error: Note could not be decrypted with active key]';
    }
  },
};
