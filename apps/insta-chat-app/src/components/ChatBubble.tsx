import type { ChatMessage } from "@/lib/types";
import { memo, useEffect, useState } from "react";
import { toast } from "sonner";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { formatTime } from "@/lib/utils";
import { CheckCheck, Copy } from "lucide-react";
import { Button } from "./ui/button";

interface ChatBubbleProps {
  msg: ChatMessage;
  isMine: boolean;
}

export const ChatBubble = memo(({ msg, isMine }: ChatBubbleProps) => {
  const handleCopy = () => {
    navigator.clipboard.writeText(msg.content);
    toast.success("Message copied");
  };

  const isImage = msg.content.startsWith("data:image/");

  return (
    <div
      className={`flex items-end gap-2 group ${isMine ? "flex-row-reverse" : "flex-row"}`}
    >
      {!isMine && (
        <Avatar className="size-7">
          <AvatarFallback className="text-xs">
            {msg.senderName.slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
      )}
      <div className="flex flex-col relative max-w-[70%]">
        <div
          className={`rounded-2xl px-3.5 py-2 text-sm ${
            isMine ? "bg-primary text-primary-foreground" : "bg-muted"
          }`}
        >
          {!isMine && (
            <p className="mb-0.5 text-xs font-medium opacity-70">
              {msg.senderName}
            </p>
          )}
          {isImage ? (
            <img
              src={msg.content}
              alt="Shared"
              className="mt-1 rounded-md max-w-full max-h-64 object-contain"
            />
          ) : (
            <p className="break-words whitespace-pre-wrap">{msg.content}</p>
          )}
          <div className="flex justify-end items-center gap-1 mt-1">
            <p
              className={`text-[10px] ${isMine ? "text-primary-foreground/70" : "text-muted-foreground"}`}
            >
              {formatTime(msg.timestamp)}
            </p>
            {isMine && msg.isRead && (
              <CheckCheck className="size-3 text-primary-foreground/90" />
            )}
          </div>
        </div>
      </div>
      {!isImage && (
        <Button
          variant="ghost"
          size="icon"
          className="opacity-0 group-hover:opacity-100 transition-opacity size-6"
          onClick={handleCopy}
          title="Copy message"
        >
          <Copy className="size-3" />
        </Button>
      )}
    </div>
  );
});

interface TypingBubbleProps {
  senderName: string;
}
const TYPING_DOTS = ["Writing.", "Writing..", "Writing..."];

export const TypingBubble = memo(({ senderName }: TypingBubbleProps) => {
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
        <p className="mb-0.5 text-xs font-medium opacity-70">{senderName}</p>
        <p className="break-words text-muted-foreground italic">
          {TYPING_DOTS[dotIndex]}
        </p>
      </div>
    </div>
  );
});

export const SystemBubble = memo(({ content }: { content: string }) => (
  <div className="flex justify-center">
    <div className="rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground">
      {content}
    </div>
  </div>
));
