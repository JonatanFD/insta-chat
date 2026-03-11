import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import z from "zod";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ─── Reconnect credentials (AES-GCM encrypted) ───────────────────────────────

const RECONNECT_KEY_PREFIX = "chat-reconnect:";
const DEVICE_KEY_ID = "insta-chat-device-key-id";

const reconnectSchema = z.object({
  chatName: z.string(),
  password: z.string(),
});

export interface ReconnectCredentials {
  chatName: string;
  password: string;
}

// ── Device-bound key ──────────────────────────────────────────────────────────
// A random seed is generated once per device and stored in localStorage.
// It is combined with the page origin via PBKDF2 to derive an AES-GCM key,
// so the ciphertext is only decryptable in the same browser on the same origin.

function getOrCreateDeviceSeed(): string {
  let seed = localStorage.getItem(DEVICE_KEY_ID);
  if (!seed) {
    const bytes = crypto.getRandomValues(new Uint8Array(32));
    seed = bufferToBase64(bytes);
    localStorage.setItem(DEVICE_KEY_ID, seed);
  }
  return seed;
}

async function deriveStorageKey(seed: string): Promise<CryptoKey> {
  const enc = new TextEncoder();

  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    enc.encode(seed),
    "PBKDF2",
    false,
    ["deriveKey"],
  );

  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: enc.encode(window.location.origin),
      iterations: 100_000,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

// ── Encrypt / decrypt helpers ─────────────────────────────────────────────────

interface StoredBlob {
  iv: string; // base64
  data: string; // base64
}

async function encryptJson(value: unknown): Promise<string> {
  const seed = getOrCreateDeviceSeed();
  const key = await deriveStorageKey(seed);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(JSON.stringify(value));

  const cipherBuffer = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    encoded,
  );

  const blob: StoredBlob = {
    iv: bufferToBase64(iv),
    data: bufferToBase64(cipherBuffer),
  };

  return btoa(JSON.stringify(blob));
}

async function decryptJson(raw: string): Promise<unknown> {
  const blob: StoredBlob = JSON.parse(atob(raw));
  const seed = getOrCreateDeviceSeed();
  const key = await deriveStorageKey(seed);

  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: base64ToBuffer(blob.iv) as BufferSource },
    key,
    base64ToBuffer(blob.data) as BufferSource,
  );

  return JSON.parse(new TextDecoder().decode(decrypted));
}

// ── Public API ────────────────────────────────────────────────────────────────

export async function saveReconnectCredentials(
  credentials: ReconnectCredentials,
): Promise<void> {
  const key = `${RECONNECT_KEY_PREFIX}${credentials.chatName}`;
  const encrypted = await encryptJson(credentials);
  localStorage.setItem(key, encrypted);
}

export async function loadReconnectCredentials(
  chatName: string,
): Promise<ReconnectCredentials | null> {
  const key = `${RECONNECT_KEY_PREFIX}${chatName}`;
  const raw = localStorage.getItem(key);
  if (!raw) return null;

  try {
    const decrypted = await decryptJson(raw);
    const parsed = reconnectSchema.safeParse(decrypted);
    if (!parsed.success) return null;
    return parsed.data;
  } catch {
    // Corrupted or from a different device — discard it
    localStorage.removeItem(key);
    return null;
  }
}

export function clearReconnectCredentials(chatName: string): void {
  localStorage.removeItem(`${RECONNECT_KEY_PREFIX}${chatName}`);
}

// ─── Shared binary helpers ────────────────────────────────────────────────────

export function bufferToBase64(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export function base64ToBuffer(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}
