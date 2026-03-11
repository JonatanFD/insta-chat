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
    | "idle" // session is ready — either it was already in-memory or we just rebuilt it
    | "reconnecting" // joinToChat in progress (only runs on page reload / missing session)
    | "failed" // joinToChat failed (room gone, full, wrong password, etc.)
    | "missing"; // no encrypted credentials found and no in-memory session

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
 * Guards the ChatPage session lifecycle.
 *
 * Decision tree on every mount:
 *
 *  A) The Zustand store already holds a session for this room
 *     → status "idle" immediately. No API call is made.
 *       This is the happy-path after a normal JoinChatPage flow.
 *
 *  B) The store is empty (page reload, direct URL, tab restore)
 *     → look up AES-GCM encrypted { chatName, password } in localStorage.
 *       B1) Credentials found  → generate a fresh ECDH key pair, call
 *           joinToChat, write the new session into the store → "idle".
 *       B2) Credentials missing → "missing" (user must re-join manually).
 *       B3) joinToChat throws  → "failed" (show error + retry button).
 *
 * By checking the store first we guarantee that joinToChat is called at most
 * once per session, preventing the duplicate-participant bug that occurred
 * when JoinChatPage and useRoomReconnect both called joinToChat on the same
 * navigation.
 */
export function useRoomReconnect(chatName: string): UseRoomReconnectResult {
    const session = useChatStore((s) => s.session);
    const setSession = useChatStore((s) => s.setSession);

    // If the store already has a matching session skip everything synchronously.
    const hasSessionForRoom = session?.chatName === chatName;

    const [status, setStatus] = useState<ReconnectStatus>(
        hasSessionForRoom ? "idle" : "reconnecting",
    );
    const [error, setError] = useState<string | null>(null);

    // Prevent double-firing in React StrictMode / concurrent mode
    const attemptRef = useRef(false);
    const attemptCountRef = useRef(0);

    const doReconnect = async () => {
        // Re-check inside the async function in case the store was populated
        // between the render and the effect firing (e.g. StrictMode double-invoke).
        const currentSession = useChatStore.getState().session;
        if (currentSession?.chatName === chatName) {
            logger.info(
                "Session already present in store — skipping joinToChat",
                { chatName },
            );
            setStatus("idle");
            return;
        }

        attemptCountRef.current += 1;
        const attempt = attemptCountRef.current;

        logger.group(`Reconnect attempt #${attempt} — room: "${chatName}"`);
        logger.info(`Starting reconnect attempt #${attempt}`, { chatName });

        setStatus("reconnecting");
        setError(null);

        // ── Step 1: load encrypted credentials ───────────────────────────────
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
            // ── Step 2: fresh ECDH key pair ───────────────────────────────────
            logger.debug("Step 2/4 — Generating new ECDH key pair…");
            const publicKey = await encryptionService.generateKeyPair();
            logger.success("Step 2/4 — ECDH key pair generated");

            // ── Step 3: joinToChat ────────────────────────────────────────────
            logger.debug("Step 3/4 — Calling joinToChat API…", { chatName });
            const token = await joinChat(
                creds.chatName,
                creds.password,
                publicKey,
            );
            const payload = decodeJwtPayload(token);
            logger.success("Step 3/4 — joinToChat succeeded", {
                participantId: payload.participantId,
                participantName: payload.participantName,
            });

            // ── Step 4: write session into store ──────────────────────────────
            logger.debug("Step 4/4 — Writing fresh session into store…");
            setSession({
                chatName: payload.chatName,
                token,
                participantId: payload.participantId,
                participantName: payload.participantName,
            });
            logger.success("Step 4/4 — Session ready");

            setStatus("idle");
            logger.success(
                `Reconnect attempt #${attempt} completed — status: idle`,
            );
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
                logger.warn(
                    "Clearing stale credentials — room is gone or full",
                    { chatName },
                );
                clearReconnectCredentials(chatName);
            }

            setError(message);
            setStatus("failed");
        } finally {
            logger.groupEnd();
        }
    };

    useEffect(() => {
        // Path A: valid session already in the store — nothing to do.
        if (hasSessionForRoom) {
            logger.debug(
                "Effect: in-memory session found for this room — skipping reconnect",
                { chatName },
            );
            return;
        }

        // Path B: no session — attempt a credential-based rejoin (page reload etc.).
        logger.debug(
            "Effect triggered — no in-memory session, will reconnect",
            {
                chatName,
                attemptAlreadyRunning: attemptRef.current,
            },
        );

        if (attemptRef.current) {
            logger.debug(
                "Effect: reconnect already in progress, skipping duplicate run",
            );
            return;
        }
        attemptRef.current = true;

        doReconnect();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [chatName, hasSessionForRoom]);

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
