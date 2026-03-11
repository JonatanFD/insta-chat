import { useState, useEffect, useRef } from "react";
import { joinChat } from "@/services/api";
import { encryptionService } from "@/services/encryption";
import { useChatStore } from "@/stores/chat";
import {
  loadReconnectCredentials,
  clearReconnectCredentials,
} from "@/lib/utils";
import { createLogger } from "@/lib/logger";

const logger = createLogger("useRoomReconnect");

export type ReconnectStatus =
  | "idle" // joinToChat completed, session is ready
  | "reconnecting" // joinToChat in progress
  | "failed" // joinToChat failed (room gone, full, wrong password, etc.)
  | "missing"; // no encrypted credentials found for this room

function decodeJwtPayload(token: string): {
  participantId: string;
  chatName: string;
  participantName: string;
} {
  const base64 = token.split(".")[1];
  return JSON.parse(atob(base64));
}

interface UseRoomReconnectResult {
  status: ReconnectStatus;
  error: string | null;
  retry: () => void;
}

/**
 * On every mount (page load, reload, tab restore) this hook:
 *
 *  1. Looks up the AES-GCM encrypted { chatName, password } blob in
 *     localStorage for this room.
 *  2. If found, generates a fresh ECDH key pair and calls joinToChat to
 *     obtain a new token + participantId, then writes them into the store.
 *  3. If credentials are missing  → status "missing"  (no way to rejoin).
 *  4. If joinToChat fails          → status "failed"   (show error + retry).
 *  5. On success                   → status "idle"     (ChatPage can connect).
 *
 * The Zustand session is intentionally NOT read here — it is always rebuilt
 * from the encrypted credentials so the participantId is always fresh and
 * the server never sees a stale/deleted participant trying to connect.
 */
export function useRoomReconnect(chatName: string): UseRoomReconnectResult {
  const setSession = useChatStore((s) => s.setSession);

  const [status, setStatus] = useState<ReconnectStatus>("reconnecting");
  const [error, setError] = useState<string | null>(null);

  // Prevent double-firing in React StrictMode / concurrent mode
  const attemptRef = useRef(false);
  const attemptCountRef = useRef(0);

  const doReconnect = async () => {
    attemptCountRef.current += 1;
    const attempt = attemptCountRef.current;

    logger.group(`Reconnect attempt #${attempt} — room: "${chatName}"`);
    logger.info(`Starting reconnect attempt #${attempt}`, { chatName });

    setStatus("reconnecting");
    setError(null);

    // ── Step 1: load encrypted credentials ───────────────────────────────────
    logger.debug(
      "Step 1/4 — Loading encrypted credentials from localStorage…",
      { chatName },
    );

    const creds = await loadReconnectCredentials(chatName);

    if (!creds) {
      logger.warn("Step 1/4 — No credentials found for this room", {
        chatName,
      });
      logger.groupEnd();
      setStatus("missing");
      return;
    }

    logger.success("Step 1/4 — Credentials decrypted successfully", {
      chatName,
    });

    try {
      // ── Step 2: fresh ECDH key pair ─────────────────────────────────────────
      logger.debug("Step 2/4 — Generating new ECDH key pair…");
      const publicKey = await encryptionService.generateKeyPair();
      logger.success("Step 2/4 — ECDH key pair generated");

      // ── Step 3: joinToChat ──────────────────────────────────────────────────
      logger.debug("Step 3/4 — Calling joinToChat API…", { chatName });
      const token = await joinChat(creds.chatName, creds.password, publicKey);
      const payload = decodeJwtPayload(token);
      logger.success("Step 3/4 — joinToChat succeeded", {
        participantId: payload.participantId,
        participantName: payload.participantName,
      });

      // ── Step 4: write session into store ────────────────────────────────────
      logger.debug("Step 4/4 — Writing fresh session into store…");
      setSession({
        chatName: payload.chatName,
        token,
        participantId: payload.participantId,
        participantName: payload.participantName,
      });
      logger.success("Step 4/4 — Session ready");

      setStatus("idle");
      logger.success(`Reconnect attempt #${attempt} completed — status: idle`);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to reconnect";

      logger.error(`Reconnect attempt #${attempt} failed`, {
        message,
        chatName,
      });

      // If the room is gone or full there is no point keeping stale credentials
      if (
        message.toLowerCase().includes("not found") ||
        message.toLowerCase().includes("full")
      ) {
        logger.warn("Clearing stale credentials — room is gone or full", {
          chatName,
        });
        clearReconnectCredentials(chatName);
      }

      setError(message);
      setStatus("failed");
    } finally {
      logger.groupEnd();
    }
  };

  useEffect(() => {
    logger.debug("Effect triggered", {
      chatName,
      attemptAlreadyRunning: attemptRef.current,
    });

    if (attemptRef.current) {
      logger.debug(
        "Effect: reconnect already in progress, skipping duplicate run",
      );
      return;
    }
    attemptRef.current = true;

    doReconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatName]);

  const retry = () => {
    logger.info("Manual retry requested by user", {
      chatName,
      previousAttempts: attemptCountRef.current,
    });
    attemptRef.current = false;
    doReconnect();
  };

  return { status, error, retry };
}
