// ─── Message types ────────────────────────────────────────────────────────────

export interface ChatMessage {
  type: "chat";
  id: string;
  senderName: string;
  senderId: string;
  content: string;
  timestamp: number;
  isRead?: boolean;
}

export interface SystemMessage {
  type: "system";
  id: string;
  content: string;
  timestamp: number;
}

export interface TypingMessage {
  type: "typing";
  id: string; // `typing-${senderId}` — always unique per sender
  senderId: string;
  senderName: string;
  timestamp: number;
}

export interface ReadReceiptMessage {
  type: "read_receipt";
  messageId: string;
}

export type DisplayMessage = ChatMessage | SystemMessage | TypingMessage;
