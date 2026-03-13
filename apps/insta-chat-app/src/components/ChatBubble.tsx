import type { ChatMessage } from "@/lib/types";
import { memo, useEffect, useState } from "react";
import { toast } from "sonner";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { formatTime } from "@/lib/utils";
import { CheckCheck, Copy, Download, File as FileIcon } from "lucide-react";
import { Button } from "./ui/button";

interface ChatBubbleProps {
  msg: ChatMessage;
  isMine: boolean;
}

export const ChatBubble = memo(({ msg, isMine }: ChatBubbleProps) => {
  let isImage = false;
  let isFile = false;
  let fileDataUrl = "";
  let fileName = "";
  let fileText = "";
  const textContent = msg.content;

  if (msg.content.startsWith("[FILE]")) {
    try {
      const fileData = JSON.parse(msg.content.substring(6));
      isFile = true;
      isImage = fileData.type === "image";
      fileDataUrl = fileData.dataUrl;
      fileName = fileData.name;
      if (fileData.text) {
        fileText = fileData.text;
      }
    } catch {
      // JSON parse error, treat as text
    }
  } else if (msg.content.startsWith("data:image/")) {
    // Backward compatibility with previous image sends
    isImage = true;
    isFile = true;
    fileDataUrl = msg.content;
    fileName = "image.jpg";
  } else if (msg.content.startsWith("data:")) {
    // Backward compatibility with raw data URLs
    isFile = true;
    fileDataUrl = msg.content;
    fileName = "file";
  }

  const handleCopy = () => {
    const textToCopy = isFile ? fileText : textContent;
    if (textToCopy) {
      navigator.clipboard.writeText(textToCopy);
      toast.success("Message copied");
    }
  };

  const handleDownload = () => {
    const link = document.createElement("a");
    link.href = fileDataUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div
      className={`flex items-end gap-2 group ${isMine ? "flex-row-reverse" : "flex-row"}`}
    >
      {!isMine && (
        <Avatar className="size-7 shrink-0">
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
            <div className="flex flex-col">
              <img
                src={fileDataUrl}
                alt={fileName}
                className="mt-1 rounded-md max-w-full max-h-64 object-contain bg-black/5"
              />
              {fileText && <p className="mt-2 break-words whitespace-pre-wrap">{fileText}</p>}
            </div>
          ) : isFile ? (
            <div className="flex flex-col">
              <div className="flex items-center gap-3 mt-1 rounded-md bg-background/20 p-2">
                <FileIcon className="size-8 opacity-80 shrink-0" />
                <span className="truncate max-w-[150px] font-medium">{fileName}</span>
              </div>
              {fileText && <p className="mt-2 break-words whitespace-pre-wrap">{fileText}</p>}
            </div>
          ) : (
            <p className="break-words whitespace-pre-wrap">{textContent}</p>
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
      <div className="opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity flex flex-col gap-1 self-center shrink-0">
        {isFile && (
          <Button
            variant="ghost"
            size="icon"
            className="size-8 md:size-6"
            onClick={handleDownload}
            title="Download"
          >
            <Download className="size-4 md:size-3" />
          </Button>
        )}
        {(!isFile || fileText) && (
          <Button
            variant="ghost"
            size="icon"
            className="size-8 md:size-6"
            onClick={handleCopy}
            title="Copy message"
          >
            <Copy className="size-4 md:size-3" />
          </Button>
        )}
      </div>
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
