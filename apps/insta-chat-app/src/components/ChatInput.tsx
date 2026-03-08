import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { ArrowUp } from "lucide-react";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupTextarea,
} from "@/components/ui/input-group";

interface ChatInputProps {
  onSend: (value: string) => void;
  disabled?: boolean;
}

export function ChatInput({ onSend, disabled }: ChatInputProps) {
  const [value, setValue] = useState("");
  const ref = useRef<HTMLTextAreaElement>(null);

  const handleSend = () => {
    const content = value.trim();
    if (!content) return;
    onSend(content);
    setValue("");
    ref.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="p-4">
      <div className="mx-auto max-w-2xl">
        <InputGroup className="rounded-2xl border bg-background shadow-sm">
          <InputGroupTextarea
            ref={ref}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Message..."
            rows={1}
            className="min-h-[44px] max-h-36 resize-none border-0 shadow-none bg-transparent px-4 py-3 focus-visible:ring-0 text-sm"
            disabled={disabled}
            autoFocus
          />
          <InputGroupAddon align="block-end" className="p-2">
            <Button
              size="icon"
              onClick={handleSend}
              disabled={!value.trim() || disabled}
              className="size-8 rounded-xl"
            >
              <ArrowUp className="size-4" />
            </Button>
          </InputGroupAddon>
        </InputGroup>
        <p className="mt-2 text-center text-[11px] text-muted-foreground">
          Enter to send · Shift+Enter for new line
        </p>
      </div>
    </div>
  );
}
