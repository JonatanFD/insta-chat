import { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Clock, MessageSquare } from "lucide-react";
import { chatSocket } from "@/services/socket";
import { encryptionService } from "@/services/encryption";
import { fetchParticipants, leaveChat } from "@/services/api";
import { useChatStore } from "@/stores/chat";
import { ModeToggle } from "@/components/mode-toggle";
import {
  ConnectionStatus,
  type E2EStatus,
} from "@/components/ConnectionStatus";
import { useDropzone } from "react-dropzone";
import { ChatInput, type ChatInputRef } from "@/components/ChatInput";
import { clearReconnectCredentials, makeSystemMsg } from "@/lib/utils";
import { useRoomReconnect } from "@/hooks/useRoomReconnect";
import { createLogger } from "@/lib/logger";
import MissingCredentialsScreen from "@/components/MissingCredentialsScreen";
import { ReconnectFailedScreen } from "@/components/ReconnectFailedScreen";
import { ReconnectingScreen } from "@/components/ReconnectingScreen";
import type { DisplayMessage, TypingMessage } from "@/lib/types";
import {
  ChatBubble,
  SystemBubble,
  TypingBubble,
} from "@/components/ChatBubble";

const logger = createLogger("ChatPage");

const SYSTEM_MSG_REGEX = /^.+ Has (joined|left)$/;
const TYPING_IDLE_HIDE_MS = 1500;

export default function ChatPage() {
  const { roomId } = useParams<{ roomId: string }>();
  const chatName = roomId ? decodeURIComponent(roomId) : "";
  const session = useChatStore((s) => s.session);
  const clearSession = useChatStore((s) => s.clearSession);
  const navigate = useNavigate();

  const {
    status: reconnectStatus,
    error: reconnectError,
    retry,
  } = useRoomReconnect(chatName);

  const sessionMatchesRoom = session?.chatName === chatName;

  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [e2eStatus, setE2eStatus] = useState<E2EStatus>("pending");

  const chatInputRef = useRef<ChatInputRef>(null);

  const { getRootProps, isDragActive } = useDropzone({
    onDrop: (acceptedFiles) => {
      if (acceptedFiles.length > 0 && chatInputRef.current) {
        chatInputRef.current.processFile(acceptedFiles[0]);
      }
    },
    noClick: true,
    noKeyboard: true,
  });

  // One timer per sender — auto-removes the typing bubble after idle
  const typingTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(
    new Map(),
  );

  const bottomRef = useRef<HTMLDivElement>(null);

  // ─── Typing bubble helpers ────────────────────────────────────────────────

  /**
   * Removes the typing bubble for a given sender from the message list
   * and clears its idle timer.
   */
  const removeTypingMessage = useCallback((senderId: string) => {
    const timer = typingTimers.current.get(senderId);
    if (timer !== undefined) clearTimeout(timer);
    typingTimers.current.delete(senderId);

    setMessages((prev) =>
      prev.filter(
        (msg) => !(msg.type === "typing" && msg.senderId === senderId),
      ),
    );
  }, []);

  /**
   * Inserts a typing bubble for a sender (if not already present) and
   * resets the idle-hide timer. Each sender has exactly one bubble.
   */
  const upsertTypingMessage = useCallback(
    (senderId: string, senderName: string) => {
      // Reset idle timer
      const existing = typingTimers.current.get(senderId);
      if (existing !== undefined) clearTimeout(existing);

      const timer = setTimeout(
        () => removeTypingMessage(senderId),
        TYPING_IDLE_HIDE_MS,
      );
      typingTimers.current.set(senderId, timer);

      setMessages((prev) => {
        // Bubble already in list — timer was reset above, no state change needed
        if (
          prev.some((msg) => msg.type === "typing" && msg.senderId === senderId)
        ) {
          return prev;
        }

        return [
          ...prev,
          {
            type: "typing",
            id: `typing-${senderId}`,
            senderId,
            senderName,
            timestamp: Date.now(),
          } satisfies TypingMessage,
        ];
      });
    },
    [removeTypingMessage],
  );

  // ─── E2E key derivation ───────────────────────────────────────────────────

  const e2eReadyRef = useRef(false);
  const sessionRef = useRef(session);

  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  const deriveKey = useCallback(async () => {
    if (e2eReadyRef.current || !sessionRef.current) return;
    setE2eStatus("deriving");

    logger.group("E2E key derivation");
    logger.debug("Fetching participants to find peer public key…", {
      chatName,
    });

    try {
      const participants = await fetchParticipants(
        chatName,
        sessionRef.current.token,
      );

      logger.debug("Participants fetched", {
        count: participants.length,
        ids: participants.map((p) => p.participantId),
      });

      const peer = participants.find(
        (p) => p.participantId !== sessionRef.current!.participantId,
      );

      if (peer?.publicKey) {
        logger.info("Peer found, deriving shared AES key…", {
          peerId: peer.participantId,
          peerName: peer.username,
        });
        await encryptionService.deriveSharedKeyFromString(peer.publicKey);
        e2eReadyRef.current = true;
        setE2eStatus("ready");
        logger.success("Shared AES-GCM key derived — E2E encryption ready");
      } else {
        logger.warn(
          "No peer with a public key found yet, will retry on join event",
        );
      }
    } catch (err) {
      setE2eStatus("failed");
      logger.error("Failed to derive E2E shared key", {
        error: err instanceof Error ? err.message : String(err),
      });
    } finally {
      logger.groupEnd();
    }
  }, [chatName]);

  // ─── Socket lifecycle ─────────────────────────────────────────────────────

  useEffect(() => {
    if (!sessionMatchesRoom || !session || reconnectStatus !== "idle") return;

    logger.group(`Socket lifecycle — room: "${chatName}"`, false);
    logger.info("Connecting to WebSocket…", {
      chatName,
      participantId: session.participantId,
      participantName: session.participantName,
    });

    const unsubConnection = chatSocket.onConnectionChange((connected) => {
      if (connected) {
        logger.success("WebSocket connected");
      } else {
        logger.warn("WebSocket disconnected");
      }
      setIsConnected(connected);
    });

    const unsubMessage = chatSocket.onMessage(async (raw: string) => {
      if (SYSTEM_MSG_REGEX.test(raw)) {
        setMessages((prev) => [...prev, makeSystemMsg(raw)]);
        if (raw.endsWith("Has joined")) await deriveKey();
        return;
      }

      try {
        const parsed = JSON.parse(raw) as {
          type?: string;
          senderId: string;
          senderName: string;
          content: string;
          iv: string;
          timestamp: number;
          messageId?: string;
        };

        // ── Read Receipt Event ──────────────────────────────────────
        if (parsed.type === "read_receipt") {
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === parsed.messageId ? { ...msg, isRead: true } : msg,
            ),
          );
          return;
        }

        // ── Typing event ──────────────────────────────────────────────
        if (parsed.type === "typing") {
          if (parsed.senderId !== sessionRef.current?.participantId) {
            upsertTypingMessage(parsed.senderId, parsed.senderName);
          }
          return;
        }

        // Ignore own messages echoed back
        if (parsed.senderId === sessionRef.current?.participantId) return;

        logger.debug("Incoming message received", {
          senderId: parsed.senderId,
          senderName: parsed.senderName,
          encrypted: encryptionService.hasSharedKey,
          timestamp: parsed.timestamp,
        });

        // ── Decrypt ───────────────────────────────────────────────────
        let decryptedContent = parsed.content;
        if (encryptionService.hasSharedKey) {
          try {
            decryptedContent = await encryptionService.decrypt({
              ciphertext: parsed.content,
              iv: parsed.iv,
            });
            logger.debug("Message decrypted successfully", {
              senderId: parsed.senderId,
            });
          } catch {
            decryptedContent = "[Could not decrypt]";
            logger.error("Failed to decrypt incoming message", {
              senderId: parsed.senderId,
            });
          }
        }

        // Remove typing bubble immediately when real message arrives
        removeTypingMessage(parsed.senderId);

        const messageId = `msg-${parsed.timestamp}-${parsed.senderId.slice(-4)}`;

        setMessages((prev) => [
          ...prev,
          {
            type: "chat",
            id: messageId,
            senderName: parsed.senderName,
            senderId: parsed.senderId,
            content: decryptedContent,
            timestamp: parsed.timestamp,
            isRead: false,
          },
        ]);

        // Send read receipt if window is focused
        if (document.hasFocus()) {
          chatSocket.send(
            JSON.stringify({
              type: "read_receipt",
              messageId: messageId,
              senderId: sessionRef.current?.participantId,
            }),
          );
        }
      } catch {
        setMessages((prev) => [...prev, makeSystemMsg(raw)]);
      }
    });

    chatSocket.connect(chatName, session.token);
    deriveKey();

    return () => {
      logger.warn("Cleaning up socket — unsubscribing and disconnecting");
      logger.groupEnd();
      unsubConnection();
      unsubMessage();
      chatSocket.disconnect();
      e2eReadyRef.current = false;
      setE2eStatus("pending");
      encryptionService.resetSharedKey();
      // Clear all pending typing timers
      typingTimers.current.forEach((t) => clearTimeout(t));
      typingTimers.current.clear();
    };
  }, [
    chatName,
    sessionMatchesRoom,
    session,
    deriveKey,
    reconnectStatus,
    removeTypingMessage,
    upsertTypingMessage,
  ]);

  // ─── Scroll to bottom on new messages ────────────────────────────────────

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ─── Send handlers ────────────────────────────────────────────────────────

  const handleTyping = useCallback(() => {
    const currentSession = sessionRef.current;
    if (!currentSession) return;
    chatSocket.sendTyping(
      currentSession.participantId,
      currentSession.participantName,
    );
  }, []);

  const handleSend = useCallback(async (content: string) => {
    const currentSession = sessionRef.current;
    if (!currentSession) return;

    const timestamp = Date.now();
    logger.debug("Sending message", {
      encrypted: encryptionService.hasSharedKey,
      senderId: currentSession.participantId,
      timestamp,
    });

    setMessages((prev) => [
      ...prev,
      {
        type: "chat",
        id: `msg-${timestamp}-${currentSession.participantId.slice(-4)}`,
        senderName: currentSession.participantName,
        senderId: currentSession.participantId,
        content,
        timestamp,
      },
    ]);

    let contentToSend = content;
    let iv = "";

    if (encryptionService.hasSharedKey) {
      const encrypted = await encryptionService.encrypt(content);
      contentToSend = encrypted.ciphertext;
      iv = encrypted.iv;
      logger.debug("Message encrypted before sending");
    }

    const payload = JSON.stringify({
      senderId: currentSession.participantId,
      senderName: currentSession.participantName,
      content: contentToSend,
      iv,
      timestamp,
    });

    chatSocket.send(payload);
  }, []);

  const handleLeave = useCallback(async () => {
    const currentSession = sessionRef.current;

    logger.group(`Leaving room "${chatName}"`);
    logger.info("User initiated leave — clearing local state", {
      chatName,
      participantId: currentSession?.participantId,
    });

    clearReconnectCredentials(chatName);
    clearSession();
    chatSocket.disconnect();
    logger.debug(
      "Reconnect credentials cleared, session cleared, socket disconnected",
    );

    if (currentSession) {
      logger.debug("Notifying server of participant removal…", {
        participantId: currentSession.participantId,
      });
      leaveChat(chatName, currentSession.participantId)
        .then(() => logger.success("Server-side participant removal confirmed"))
        .catch((err) => {
          logger.warn("Server-side removal failed (non-blocking)", {
            error: err instanceof Error ? err.message : String(err),
          });
        });
    }

    logger.groupEnd();
    navigate("/");
  }, [chatName, clearSession, navigate]);

  // ─── Reconnect state screens ──────────────────────────────────────────────

  if (reconnectStatus === "reconnecting") {
    return <ReconnectingScreen />;
  }

  if (reconnectStatus === "failed") {
    return (
      <ReconnectFailedScreen
        chatName={chatName}
        error={reconnectError}
        onRetry={retry}
      />
    );
  }

  if (reconnectStatus === "missing") {
    return <MissingCredentialsScreen chatName={chatName} />;
  }

  if (!sessionMatchesRoom) return null;

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="flex h-screen flex-col relative" {...getRootProps()}>
      {isDragActive && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm border-4 border-dashed border-primary">
          <p className="text-2xl font-medium text-primary">
            Drop file here to send
          </p>
        </div>
      )}
      <header className="flex items-center justify-between border-b px-4 py-2">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon-sm" onClick={handleLeave}>
            <ArrowLeft className="size-4" />
          </Button>
          <div className="flex items-center gap-2">
            <MessageSquare className="size-4" />
            <span className="text-sm font-medium">{chatName}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="gap-1 text-xs">
            <Clock className="size-3" />
            2h
          </Badge>
          <ConnectionStatus isConnected={isConnected} e2eStatus={e2eStatus} />
          <ModeToggle />
        </div>
      </header>

      <ScrollArea className="flex-1 p-4 overflow-auto">
        <div className="mx-auto max-w-2xl space-y-4">
          <div className="flex justify-center">
            <div className="rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground">
              Messages are end-to-end encrypted. This room will auto-delete in 2
              hours.
            </div>
          </div>

          {messages.map((msg) =>
            msg.type === "system" ? (
              <SystemBubble key={msg.id} content={msg.content} />
            ) : msg.type === "typing" ? (
              <TypingBubble key={msg.id} senderName={msg.senderName} />
            ) : (
              <ChatBubble
                key={msg.id}
                msg={msg}
                isMine={msg.senderId === session?.participantId}
              />
            ),
          )}

          <div ref={bottomRef} className="h-1" />
        </div>
      </ScrollArea>

      <Separator />

      <ChatInput
        ref={chatInputRef}
        onSend={handleSend}
        onTyping={handleTyping}
        disabled={!isConnected}
      />
    </div>
  );
}
