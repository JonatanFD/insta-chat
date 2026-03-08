const WS_BASE = import.meta.env.VITE_PUBLIC_WS_API;

type MessageHandler = (data: string) => void;
type ConnectionHandler = (connected: boolean) => void;

class ChatSocketService {
  private ws: WebSocket | null = null;
  private messageHandlers = new Set<MessageHandler>();
  private connectionHandlers = new Set<ConnectionHandler>();

  connect(chatName: string, token: string): void {
    if (this.ws?.readyState === WebSocket.OPEN) return;

    const url = `${WS_BASE}/${encodeURIComponent(chatName)}?token=${encodeURIComponent(token)}`;
    this.ws = new WebSocket(url);

    this.ws.onopen = () => {
      this.connectionHandlers.forEach((h) => h(true));
    };

    this.ws.onclose = () => {
      this.connectionHandlers.forEach((h) => h(false));
    };

    this.ws.onerror = () => {
      this.connectionHandlers.forEach((h) => h(false));
    };

    this.ws.onmessage = (event: MessageEvent) => {
      const data =
        typeof event.data === "string" ? event.data : String(event.data);
      this.messageHandlers.forEach((h) => h(data));
    };
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  send(payload: string): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(payload);
    }
  }

  onMessage(handler: MessageHandler): () => void {
    this.messageHandlers.add(handler);
    return () => {
      this.messageHandlers.delete(handler);
    };
  }

  onConnectionChange(handler: ConnectionHandler): () => void {
    this.connectionHandlers.add(handler);
    return () => {
      this.connectionHandlers.delete(handler);
    };
  }

  get isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }
}

export const chatSocket = new ChatSocketService();
