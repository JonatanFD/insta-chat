import { useEffect, useRef, useState, useCallback, memo } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import {
    ArrowLeft,
    Clock,
    MessageSquare,
    Loader2,
    AlertTriangle,
    LogIn,
} from "lucide-react";
import { chatSocket } from "@/services/socket";
import { encryptionService } from "@/services/encryption";
import { fetchParticipants, leaveChat } from "@/services/api";
import { useChatStore } from "@/stores/chat";
import { ModeToggle } from "@/components/mode-toggle";
import {
    ConnectionStatus,
    type E2EStatus,
} from "@/components/ConnectionStatus";
import { ChatInput } from "@/components/ChatInput";
import { clearReconnectCredentials } from "@/lib/utils";
import { useRoomReconnect } from "@/hooks/useRoomReconnect";
import { createLogger } from "@/lib/logger";

const logger = createLogger("ChatPage");

const SYSTEM_MSG_REGEX = /^.+ Has (joined|left)$/;
const TYPING_DOTS = ["Writing.", "Writing..", "Writing..."];

interface ChatMessage {
    type: "chat";
    id: string;
    senderName: string;
    senderId: string;
    content: string;
    timestamp: number;
}

interface SystemMessage {
    type: "system";
    id: string;
    content: string;
    timestamp: number;
}

type DisplayMessage = ChatMessage | SystemMessage;

function formatTime(timestamp: number): string {
    return new Date(timestamp).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
    });
}

function makeSystemMsg(content: string): SystemMessage {
    return {
        type: "system",
        id: `sys-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        content,
        timestamp: Date.now(),
    };
}

interface TypingBubbleProps {
    senderName: string;
}

const TypingBubble = memo(({ senderName }: TypingBubbleProps) => {
    const [dotIndex, setDotIndex] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => {
            setDotIndex((prev) => (prev + 1) % TYPING_DOTS.length);
        }, 400);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="flex items-end gap-2">
            <Avatar className="size-7">
                <AvatarFallback className="text-xs">
                    {senderName.slice(0, 2).toUpperCase()}
                </AvatarFallback>
            </Avatar>
            <div className="max-w-[70%] rounded-2xl px-3.5 py-2 text-sm bg-muted">
                <p className="mb-0.5 text-xs font-medium opacity-70">
                    {senderName}
                </p>
                <p className="break-words text-muted-foreground italic">
                    {TYPING_DOTS[dotIndex]}
                </p>
            </div>
        </div>
    );
});

const SystemBubble = memo(({ content }: { content: string }) => (
    <div className="flex justify-center">
        <div className="rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground">
            {content}
        </div>
    </div>
));

interface ChatBubbleProps {
    msg: ChatMessage;
    isMine: boolean;
}

const ChatBubble = memo(({ msg, isMine }: ChatBubbleProps) => (
    <div
        className={`flex items-end gap-2 ${isMine ? "flex-row-reverse" : "flex-row"}`}
    >
        {!isMine && (
            <Avatar className="size-7">
                <AvatarFallback className="text-xs">
                    {msg.senderName.slice(0, 2).toUpperCase()}
                </AvatarFallback>
            </Avatar>
        )}
        <div
            className={`max-w-[70%] rounded-2xl px-3.5 py-2 text-sm ${
                isMine ? "bg-primary text-primary-foreground" : "bg-muted"
            }`}
        >
            {!isMine && (
                <p className="mb-0.5 text-xs font-medium opacity-70">
                    {msg.senderName}
                </p>
            )}
            <p className="break-words">{msg.content}</p>
            <p
                className={`mt-1 text-[10px] ${isMine ? "text-primary-foreground/70" : "text-muted-foreground"}`}
            >
                {formatTime(msg.timestamp)}
            </p>
        </div>
    </div>
));

// ─── Reconnect overlay screens ────────────────────────────────────────────────

function ReconnectingScreen() {
    return (
        <div className="flex h-screen flex-col items-center justify-center gap-4 text-muted-foreground">
            <Loader2 className="size-8 animate-spin text-primary" />
            <div className="text-center">
                <p className="text-sm font-medium text-foreground">
                    Reconnecting…
                </p>
                <p className="mt-1 text-xs">
                    Verifying session and rejoining the room…
                </p>
            </div>
        </div>
    );
}

interface ReconnectFailedScreenProps {
    chatName: string;
    error: string | null;
    onRetry: () => void;
}

function ReconnectFailedScreen({
    chatName,
    error,
    onRetry,
}: ReconnectFailedScreenProps) {
    return (
        <div className="flex h-screen flex-col items-center justify-center gap-6 px-6">
            <div className="flex flex-col items-center gap-3 text-center">
                <div className="flex size-12 items-center justify-center rounded-full bg-destructive/10">
                    <AlertTriangle className="size-6 text-destructive" />
                </div>
                <div>
                    <p className="font-medium">
                        Could not reconnect to "{chatName}"
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                        {error ?? "An unexpected error occurred."}
                    </p>
                </div>
            </div>

            <div className="flex flex-col items-center gap-2 w-full max-w-xs">
                <Button className="w-full" onClick={onRetry}>
                    <Loader2 className="size-4" />
                    Try again
                </Button>
                <Button variant="ghost" className="w-full" asChild>
                    <Link to="/">Back to home</Link>
                </Button>
            </div>
        </div>
    );
}

interface MissingCredentialsScreenProps {
    chatName: string;
}

function MissingCredentialsScreen({ chatName }: MissingCredentialsScreenProps) {
    const navigate = useNavigate();

    return (
        <div className="flex h-screen flex-col items-center justify-center gap-6 px-6">
            <div className="flex flex-col items-center gap-3 text-center">
                <div className="flex size-12 items-center justify-center rounded-full bg-muted">
                    <LogIn className="size-6 text-muted-foreground" />
                </div>
                <div>
                    <p className="font-medium">Session not found</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                        You need to join "{chatName}" again to access this room.
                    </p>
                </div>
            </div>

            <div className="flex flex-col items-center gap-2 w-full max-w-xs">
                <Button className="w-full" onClick={() => navigate("/join")}>
                    <LogIn className="size-4" />
                    Join Room
                </Button>
                <Button variant="ghost" className="w-full" asChild>
                    <Link to="/">Back to home</Link>
                </Button>
            </div>
        </div>
    );
}

// ─── Main chat page ───────────────────────────────────────────────────────────

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
    const [typingUsers, setTypingUsers] = useState<Map<string, string>>(
        new Map(),
    );
    const typingTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(
        new Map(),
    );

    const bottomRef = useRef<HTMLDivElement>(null);

    const clearTypingUser = useCallback((senderId: string) => {
        const timer = typingTimers.current.get(senderId);
        if (timer !== undefined) clearTimeout(timer);
        typingTimers.current.delete(senderId);
        setTypingUsers((prev) => {
            const next = new Map(prev);
            next.delete(senderId);
            return next;
        });
    }, []);

    const setTypingUser = useCallback(
        (senderId: string, senderName: string) => {
            const existing = typingTimers.current.get(senderId);
            if (existing !== undefined) clearTimeout(existing);

            setTypingUsers((prev) => new Map(prev).set(senderId, senderName));

            const timer = setTimeout(() => {
                clearTypingUser(senderId);
            }, 300);
            typingTimers.current.set(senderId, timer);
        },
        [clearTypingUser],
    );
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
                await encryptionService.deriveSharedKeyFromString(
                    peer.publicKey,
                );
                e2eReadyRef.current = true;
                setE2eStatus("ready");
                logger.success(
                    "Shared AES-GCM key derived — E2E encryption ready",
                );
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

    useEffect(() => {
        // Only start the socket once we have a valid, matching session
        if (!sessionMatchesRoom || !session || reconnectStatus !== "idle")
            return;

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
                };

                if (parsed.type === "typing") {
                    if (parsed.senderId !== sessionRef.current?.participantId) {
                        setTypingUser(parsed.senderId, parsed.senderName);
                    }
                    return;
                }

                if (parsed.senderId === sessionRef.current?.participantId)
                    return;

                logger.debug("Incoming message received", {
                    senderId: parsed.senderId,
                    senderName: parsed.senderName,
                    encrypted: encryptionService.hasSharedKey,
                    timestamp: parsed.timestamp,
                });

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

                clearTypingUser(parsed.senderId);

                setMessages((prev) => [
                    ...prev,
                    {
                        type: "chat",
                        id: `msg-${parsed.timestamp}-${parsed.senderId.slice(-4)}`,
                        senderName: parsed.senderName,
                        senderId: parsed.senderId,
                        content: decryptedContent,
                        timestamp: parsed.timestamp,
                    },
                ]);
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
        };
    }, [
        chatName,
        sessionMatchesRoom,
        session,
        deriveKey,
        reconnectStatus,
        clearTypingUser,
        setTypingUser,
    ]);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

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

        // Eagerly clear local state so the UI responds immediately
        clearReconnectCredentials(chatName);
        clearSession();
        chatSocket.disconnect();
        logger.debug(
            "Reconnect credentials cleared, session cleared, socket disconnected",
        );

        // Best-effort server-side cleanup — we don't block navigation on it
        if (currentSession) {
            logger.debug("Notifying server of participant removal…", {
                participantId: currentSession.participantId,
            });
            leaveChat(chatName, currentSession.participantId)
                .then(() =>
                    logger.success("Server-side participant removal confirmed"),
                )
                .catch((err) => {
                    logger.warn("Server-side removal failed (non-blocking)", {
                        error: err instanceof Error ? err.message : String(err),
                    });
                });
        }

        logger.groupEnd();
        navigate("/");
    }, [chatName, clearSession, navigate]);

    // ─── Reconnect state screens ─────────────────────────────────────────────

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

    // reconnectStatus === "idle" from here on
    if (!sessionMatchesRoom) return null;

    return (
        <div className="flex h-screen flex-col">
            <header className="flex items-center justify-between border-b px-4 py-2">
                <div className="flex items-center gap-3">
                    <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={handleLeave}
                    >
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
                    <ConnectionStatus
                        isConnected={isConnected}
                        e2eStatus={e2eStatus}
                    />
                    <ModeToggle />
                </div>
            </header>

            <ScrollArea className="flex-1 p-4 overflow-auto">
                <div className="mx-auto max-w-2xl space-y-4">
                    <div className="flex justify-center">
                        <div className="rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground">
                            Messages are end-to-end encrypted. This room will
                            auto-delete in 2 hours.
                        </div>
                    </div>

                    {messages.map((msg) =>
                        msg.type === "system" ? (
                            <SystemBubble key={msg.id} content={msg.content} />
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

            {typingUsers.size > 0 && (
                <div className="px-4 pb-1">
                    <div className="mx-auto max-w-2xl space-y-2">
                        {[...typingUsers.entries()].map(([id, name]) => (
                            <TypingBubble key={id} senderName={name} />
                        ))}
                    </div>
                </div>
            )}

            <ChatInput
                onSend={handleSend}
                onTyping={handleTyping}
                disabled={!isConnected}
            />
        </div>
    );
}
