/**
 * Encrypted storage in IndexedDB using Web Crypto
 */

const DB_NAME = "encrypted-storage";
const STORE_NAME = "key-value-pairs";
const DB_VERSION = 1;

/** ------------------------------------------------------------------
 * IndexedDB Helpers
 * ------------------------------------------------------------------ */

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveEncrypted(key: string, value: any) {
  const db = await openDB();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).put(value, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function loadEncrypted(key: string) {
  const db = await openDB();
  return new Promise<any>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const request = tx.objectStore(STORE_NAME).get(key);

    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
}

/** ------------------------------------------------------------------
 * Base64 helpers
 * ------------------------------------------------------------------ */

export function base64ToBytes(b64: string): Uint8Array {
  const binary = atob(b64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/** ------------------------------------------------------------------
 * Crypto Helpers
 * ------------------------------------------------------------------ */

let cryptoKey: CryptoKey | null = null;

async function getCryptoKey(): Promise<CryptoKey> {
  if (cryptoKey) return cryptoKey;

  const stored = localStorage.getItem("crypto_key");

  if (stored) {
    const raw = base64ToBytes(stored);
    const rawBuffer: ArrayBuffer = raw.buffer as ArrayBuffer; // <-- TS-safe
    cryptoKey = await crypto.subtle.importKey(
      "raw",
      rawBuffer,
      "AES-GCM",
      true,
      ["encrypt", "decrypt"]
    );
    return cryptoKey;
  }

  // First-time creation
  const key = await crypto.subtle.generateKey(
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"]
  );

  const exported = new Uint8Array(await crypto.subtle.exportKey("raw", key));
  localStorage.setItem("crypto_key", bytesToBase64(exported));

  cryptoKey = key;
  return key;
}

/** ------------------------------------------------------------------
 * Encrypt / Decrypt operations
 * ------------------------------------------------------------------ */

export async function encryptText(text: string) {
  const key = await getCryptoKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(text);

  const ciphertext = new Uint8Array(
    await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, encoded)
  );

  return {
    ciphertext: bytesToBase64(ciphertext),
    iv: bytesToBase64(iv),
  };
}

export async function decryptText(encrypted: { ciphertext: string; iv: string }) {
  const key = await getCryptoKey();

  const ciphertextOrig = base64ToBytes(encrypted.ciphertext);
  const ivOrig = base64ToBytes(encrypted.iv);

  // Copy bytes into a new Uint8Array backed by a plain ArrayBuffer
  const ivSafe = new Uint8Array(ivOrig.length);
  ivSafe.set(ivOrig);

  const ciphertextSafe = new Uint8Array(ciphertextOrig.length);
  ciphertextSafe.set(ciphertextOrig);

  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: ivSafe },
    key,
    ciphertextSafe
  );

  return new TextDecoder().decode(new Uint8Array(decrypted));
}


