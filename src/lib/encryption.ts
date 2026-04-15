import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

// Jalawarta API Credential Encryption Utility
// Menggunakan AES-256-GCM untuk enkripsi terotentikasi yang aman.
// Kunci diambil dari APP_ENCRYPTION_KEY (terpisah dari AUTH_SECRET/JWT).

const ALGORITHM = "aes-256-gcm";
const KEY_HEX = process.env.APP_ENCRYPTION_KEY!;

if (!KEY_HEX) {
  throw new Error("APP_ENCRYPTION_KEY environment variable is not set.");
}

const KEY = Buffer.from(KEY_HEX, "hex");

/**
 * Encrypts plaintext using AES-256-GCM.
 * Returns a combined string: `iv:authTag:encryptedHex` yang aman disimpan di DB.
 */
export function encryptAPIKey(plainText: string): string {
  const iv = randomBytes(12); // 96-bit IV for GCM
  const cipher = createCipheriv(ALGORITHM, KEY, iv);
  const encrypted = Buffer.concat([cipher.update(plainText, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted.toString("hex")}`;
}

/**
 * Decrypts a ciphertext string created by `encryptAPIKey`.
 * Returns null if decryption fails (e.g., key mismatch or corrupted data).
 */
export function decryptAPIKey(cipherText: string): string | null {
  try {
    const [ivHex, authTagHex, encryptedHex] = cipherText.split(":");
    if (!ivHex || !authTagHex || !encryptedHex) return null;
    const iv = Buffer.from(ivHex, "hex");
    const authTag = Buffer.from(authTagHex, "hex");
    const encrypted = Buffer.from(encryptedHex, "hex");
    const decipher = createDecipheriv(ALGORITHM, KEY, iv);
    decipher.setAuthTag(authTag);
    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
    return decrypted.toString("utf8");
  } catch {
    console.warn("[Jalawarta Encryption] Decryption failed. Check APP_ENCRYPTION_KEY.");
    return null;
  }
}

/**
 * Masks an API key for display purposes in the admin UI.
 * Example: "AIzaSyABCDEFGHIJKL1234" → "AIza••••••••••••1234"
 */
export function maskApiKey(plainKey: string): string {
  if (plainKey.length <= 8) return "••••••••";
  const head = plainKey.slice(0, 4);
  const tail = plainKey.slice(-4);
  return `${head}••••••••••••${tail}`;
}
