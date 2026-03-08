import { useEffect, useRef, useState, useCallback } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft,
  Clock,
  Lock,
  MessageSquare,
  Send,
  Wifi,
  WifiOff,
} from "lucide-react";
import { chatSocket } from "@/services/socket";
import { encryptionService } from "@/services/encryption";
import { fetchParticipants } from "@/services/api";
import { useChatStore } from "@/stores/chat";

// Regex to detect server system messages like "BraveLion Has joined" / "BraveLion Has left"
const SYSTEM_MSG_REGEX = /^.+ Has (joined|left)$/;

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

export default function ChatPage() {
  const { roomId } = useParams<{ roomId: string }>();
  const chatName = roomId ? decodeURIComponent(roomId) : "";
  const navigate = useNavigate();
  const session = useChatStore((s) => s.session);

  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isConnected, setIsConnected] = useState(false);
  const [e2eReady, setE2eReady] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Redirect if no session
  useEffect(() => {
    if (!session) {
      navigate("/join", { replace: true });
    }
  }, [session, navigate]);

  // Fetch participants and derive E2E shared key
  useEffect(() => {
    if (!session || !chatName) return;

    let cancelled = false;

    const setupE2E = async () => {
      try {
        const participants = await fetchParticipants(chatName, session.token);
        const peer = participants.find(
          (p) => p.participantId !== session.participantId,
        );

        if (peer && peer.publicKey && !cancelled) {
          await encryptionService.deriveSharedKeyFromString(peer.publicKey);
          setE2eReady(true);
        }
      } catch {
        // Peer may not have joined yet -- we'll retry on system messages
      }
    };

    setupE2E();

    return () => {
      cancelled = true;
    };
  }, [session, chatName]);

  // Try to establish E2E when a new user joins
  const tryEstablishE2E = useCallback(async () => {
    if (e2eReady || !session || !chatName) return;
    try {
      const participants = await fetchParticipants(chatName, session.token);
      const peer = participants.find(
        (p) => p.participantId !== session.participantId,
      );
      if (peer?.publicKey) {
        await encryptionService.deriveSharedKeyFromString(peer.publicKey);
        setE2eReady(true);
      }
    } catch {
      // ignore
    }
  }, [e2eReady, session, chatName]);

  // Connect WebSocket
  useEffect(() => {
    if (!session || !chatName) return;

    const unsubConnection = chatSocket.onConnectionChange(setIsConnected);

    const unsubMessage = chatSocket.onMessage(async (raw: string) => {
      // Check if it's a system message from the server
      if (SYSTEM_MSG_REGEX.test(raw)) {
        setMessages((prev) => [
          ...prev,
          { type: "system", content: raw, timestamp: Date.now() },
        ]);

        // If someone joined, try to establish E2E
        if (raw.endsWith("Has joined")) {
          tryEstablishE2E();
        }
        return;
      }

      // Try to parse as our JSON chat message format
      try {
        const parsed = JSON.parse(raw) as {
          senderId: string;
          senderName: string;
          content: string;
          iv: string;
          timestamp: number;
        };

        // Skip our own messages (already shown optimistically)
        if (parsed.senderId === session.participantId) return;

        let decryptedContent = parsed.content;

        // Decrypt if E2E is ready
        if (encryptionService.hasSharedKey) {
          try {
            decryptedContent = await encryptionService.decrypt({
              ciphertext: parsed.content,
              iv: parsed.iv,
            });
          } catch {
            decryptedContent = "[Could not decrypt]";
          }
        }

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
        // Unknown format -- show as system message
        setMessages((prev) => [
          ...prev,
          { type: "system", content: raw, timestamp: Date.now() },
        ]);
      }
    });

    chatSocket.connect(chatName, session.token);

    return () => {
      unsubConnection();
      unsubMessage();
      chatSocket.disconnect();
    };
  }, [session, chatName, tryEstablishE2E]);

  // Auto-scroll on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    const content = inputValue.trim();
    if (!content || !session) return;

    const timestamp = Date.now();

    // Show message optimistically (plaintext for ourselves)
    setMessages((prev) => [
      ...prev,
      {
        type: "chat",
        id: `msg-${timestamp}-${session.participantId.slice(-4)}`,
        senderName: session.participantName,
        senderId: session.participantId,
        content,
        timestamp,
      },
    ]);

    // Encrypt if E2E is ready, otherwise send plaintext
    let payload: string;

    if (encryptionService.hasSharedKey) {
      const encrypted = await encryptionService.encrypt(content);
      payload = JSON.stringify({
        senderId: session.participantId,
        senderName: session.participantName,
        content: encrypted.ciphertext,
        iv: encrypted.iv,
        timestamp,
      });
    } else {
      payload = JSON.stringify({
        senderId: session.participantId,
        senderName: session.participantName,
        content,
        iv: "",
        timestamp,
      });
    }
    console.log("Payload sent: ", payload);

    chatSocket.send(payload);
    setInputValue("");
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!session) return null;

  return (
    <div className="flex h-screen flex-col">
      {/* Header */}
      <header className="flex items-center justify-between border-b px-4 py-2">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon-sm" asChild>
            <Link to="/">
              <ArrowLeft className="size-4" />
            </Link>
          </Button>
          <div className="flex items-center gap-2">
            <MessageSquare className="size-4" />
            <span className="text-sm font-medium">{chatName}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Badge
            variant={e2eReady ? "default" : "outline"}
            className="gap-1 text-xs"
          >
            <Lock className="size-3" />
            {e2eReady ? "E2E Active" : "E2E Pending"}
          </Badge>
          <Badge variant="secondary" className="gap-1 text-xs">
            <Clock className="size-3" />
            2h
          </Badge>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            {isConnected ? (
              <Wifi className="size-3 text-green-500" />
            ) : (
              <WifiOff className="size-3 text-destructive" />
            )}
          </div>
        </div>
      </header>

      {/* Messages area */}
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        <div className="mx-auto max-w-2xl space-y-4">
          {/* Welcome system message */}
          <div className="flex justify-center">
            <div className="rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground">
              Messages are end-to-end encrypted. This room will auto-delete in 2
              hours.
            </div>
          </div>

          {messages.map((msg, i) =>
            msg.type === "system" ? (
              <div key={i} className="flex justify-center">
                <div className="rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground">
                  {msg.content}
                </div>
              </div>
            ) : (
              <div
                key={msg.id}
                className={`flex items-end gap-2 ${
                  msg.senderId === session.participantId
                    ? "flex-row-reverse"
                    : "flex-row"
                }`}
              >
                {msg.senderId !== session.participantId ? (
                  <Avatar className="size-7">
                    <AvatarFallback className="text-xs">
                      {msg.senderName.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                ) : null}
                <div
                  className={`max-w-[70%] rounded-2xl px-3.5 py-2 text-sm ${
                    msg.senderId === session.participantId
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted"
                  }`}
                >
                  {msg.senderId !== session.participantId ? (
                    <p className="mb-0.5 text-xs font-medium opacity-70">
                      {msg.senderName}
                    </p>
                  ) : null}
                  <p className="break-words">{msg.content}</p>
                  <p
                    className={`mt-1 text-[10px] ${
                      msg.senderId === session.participantId
                        ? "text-primary-foreground/70"
                        : "text-muted-foreground"
                    }`}
                  >
                    {formatTime(msg.timestamp)}
                  </p>
                </div>
              </div>
            ),
          )}
        </div>
      </ScrollArea>

      <Separator />

      {/* Composer */}
      <div className="p-4">
        <div className="mx-auto flex max-w-2xl items-center gap-2">
          <Input
            ref={inputRef}
            placeholder="Type a message..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1"
            autoFocus
          />
          <Button
            size="icon"
            onClick={handleSend}
            disabled={!inputValue.trim()}
          >
            <Send className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
