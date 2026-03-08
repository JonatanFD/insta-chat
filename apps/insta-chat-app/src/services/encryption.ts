/**
 * End-to-End Encryption Service
 *
 * Uses the Web Crypto API to generate key pairs, derive shared secrets,
 * and encrypt/decrypt messages between two peers.
 *
 * Flow:
 * 1. Each peer calls generateKeyPair() to create an ECDH key pair
 * 2. Public key is sent as JSON.stringify(jwk) to the server on join
 * 3. Peers fetch participants to get each other's public keys
 * 4. Each peer calls deriveSharedKey() with the other's public key
 * 5. Messages are encrypted/decrypted with the derived AES-GCM key
 */

const ALGORITHM: EcKeyGenParams = {
  name: "ECDH",
  namedCurve: "P-256",
};

const AES_ALGORITHM = "AES-GCM";
const AES_KEY_LENGTH = 256;

export interface EncryptedPayload {
  ciphertext: string; // base64
  iv: string; // base64
}

class EncryptionService {
  private keyPair: CryptoKeyPair | null = null;
  private sharedKey: CryptoKey | null = null;
  /**
   * Generate a new ECDH key pair.
   * Returns the public key as a JSON-stringified JWK, ready to send to the server.
   */
  async generateKeyPair(): Promise<string> {
    this.keyPair = await crypto.subtle.generateKey(ALGORITHM, true, [
      "deriveKey",
    ]);

    const jwk = await crypto.subtle.exportKey("jwk", this.keyPair.publicKey);
    return JSON.stringify(jwk);
  }

  /**
   * Import a peer's public key from a JSON-stringified JWK and derive the shared AES key.
   */
  async deriveSharedKeyFromString(peerPublicKeyString: string): Promise<void> {
    if (!this.keyPair) {
      throw new Error("Key pair not generated. Call generateKeyPair() first.");
    }

    const jwk: JsonWebKey = JSON.parse(peerPublicKeyString);
    const peerPublicKey = await crypto.subtle.importKey(
      "jwk",
      jwk,
      ALGORITHM,
      true,
      [],
    );

    this.sharedKey = await crypto.subtle.deriveKey(
      { name: "ECDH", public: peerPublicKey },
      this.keyPair.privateKey,
      { name: AES_ALGORITHM, length: AES_KEY_LENGTH },
      false,
      ["encrypt", "decrypt"],
    );
  }

  async encrypt(plaintext: string): Promise<EncryptedPayload> {
    if (!this.sharedKey) {
      throw new Error(
        "Shared key not derived. Call deriveSharedKeyFromString() first.",
      );
    }

    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encoded = new TextEncoder().encode(plaintext);

    const cipherBuffer = await crypto.subtle.encrypt(
      { name: AES_ALGORITHM, iv },
      this.sharedKey,
      encoded,
    );

    return {
      ciphertext: bufferToBase64(cipherBuffer),
      iv: bufferToBase64(iv),
    };
  }

  async decrypt(payload: EncryptedPayload): Promise<string> {
    if (!this.sharedKey) {
      throw new Error(
        "Shared key not derived. Call deriveSharedKeyFromString() first.",
      );
    }

    const iv = base64ToBuffer(payload.iv);
    const ciphertext = base64ToBuffer(payload.ciphertext);

    const decryptedBuffer = await crypto.subtle.decrypt(
      { name: AES_ALGORITHM, iv: iv as BufferSource },
      this.sharedKey,
      ciphertext as BufferSource,
    );

    return new TextDecoder().decode(decryptedBuffer);
  }

  reset(): void {
    this.keyPair = null;
    this.sharedKey = null;
  }

  get hasKeyPair(): boolean {
    return this.keyPair !== null;
  }

  get hasSharedKey(): boolean {
    return this.sharedKey !== null;
  }
}

function bufferToBase64(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToBuffer(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export const encryptionService = new EncryptionService();
