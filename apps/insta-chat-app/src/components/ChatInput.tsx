import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRef, useCallback, useState, forwardRef, useImperativeHandle } from "react";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupTextarea,
} from "@/components/ui/input-group";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ArrowUp,
  Plus,
  File as FileIcon,
  Image as ImageIcon,
  X,
} from "lucide-react";

const formSchema = z.object({
  message: z.string(),
});

type FormValues = z.infer<typeof formSchema>;

export interface ChatInputRef {
  processFile: (file: File) => void;
}

interface ChatInputProps {
  onSend: (value: string) => void;
  onTyping?: () => void;
  onStopTyping?: () => void;
  disabled?: boolean;
}

export const ChatInput = forwardRef<ChatInputRef, ChatInputProps>(({
  onSend,
  onTyping,
  onStopTyping,
  disabled,
}, ref) => {
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { message: "" },
  });

  const [attachedFile, setAttachedFile] = useState<{
    dataUrl: string;
    type: "image" | "file";
    name: string;
    size: number;
  } | null>(null);

  const MAX_FILE_SIZE = 1.33 * 1024 * 1024; // ~1.33 MB to ensure base64 < 2 MB

  const stopTypingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTyping = useRef(false);

  const clearStopTypingTimer = useCallback(() => {
    if (stopTypingTimer.current !== null) {
      clearTimeout(stopTypingTimer.current);
      stopTypingTimer.current = null;
    }
  }, []);

  const scheduleStopTyping = useCallback(() => {
    clearStopTypingTimer();
    stopTypingTimer.current = setTimeout(() => {
      if (isTyping.current) {
        isTyping.current = false;
        onStopTyping?.();
      }
    }, 1000);
  }, [clearStopTypingTimer, onStopTyping]);

  const lastTypingEmit = useRef<number>(0);
  const TYPING_THROTTLE_MS = 500;

  const handleChange = useCallback(() => {
    const now = Date.now();

    if (now - lastTypingEmit.current >= TYPING_THROTTLE_MS) {
      lastTypingEmit.current = now;
      onTyping?.();
    }

    scheduleStopTyping();
  }, [onTyping, scheduleStopTyping]);

  const handleFormSubmit = useCallback(
    (data: FormValues) => {
      clearStopTypingTimer();
      if (isTyping.current) {
        isTyping.current = false;
        onStopTyping?.();
      }

      if (attachedFile) {
        onSend(attachedFile.dataUrl);
        setAttachedFile(null);
      } else if (data.message.trim()) {
        onSend(data.message.trim());
      }
      form.reset();
    },
    [attachedFile, clearStopTypingTimer, form, onSend, onStopTyping],
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      form.handleSubmit(handleFormSubmit)();
    }
  };

  const processFile = (file: File) => {
    if (file.size > MAX_FILE_SIZE) {
      toast.error(
        `File too large. Maximum size is ${(MAX_FILE_SIZE / 1024 / 1024).toFixed(2)} MB to ensure payload is under 2MB.`,
      );
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;

      if (file.type.startsWith("image/")) {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement("canvas");
          const MAX_WIDTH = 800;
          const MAX_HEIGHT = 800;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          ctx?.drawImage(img, 0, 0, width, height);
          const resizedDataUrl = canvas.toDataURL("image/jpeg", 0.7);

          if (resizedDataUrl.length > 2 * 1024 * 1024) {
            toast.error("Image too large after compression. Max size is 2MB.");
            return;
          }

          setAttachedFile({
            dataUrl: resizedDataUrl,
            type: "image",
            name: file.name,
            size: resizedDataUrl.length,
          });
        };
        img.src = dataUrl;
      } else {
        if (dataUrl.length > 2 * 1024 * 1024) {
          toast.error("File too large. Max size is 2MB.");
          return;
        }
        setAttachedFile({
          dataUrl,
          type: "file",
          name: file.name,
          size: dataUrl.length,
        });
      }
    };
    reader.readAsDataURL(file);
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      if (items[i].kind === "file") {
        const blob = items[i].getAsFile();
        if (blob) {
          e.preventDefault();
          processFile(blob);
          break; // Process only one file
        }
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFile(e.target.files[0]);
      e.target.value = "";
    }
  };

  useImperativeHandle(ref, () => ({
    processFile,
  }));

  const fileInputRef = useRef<HTMLInputElement>(null);

  const messageValue =
    useWatch({
      control: form.control,
      name: "message",
    }) || "";

  const isSubmitDisabled = (!messageValue.trim() && !attachedFile) || disabled;

  return (
    <div className="p-4">
      <div className="mx-auto max-w-2xl relative">
        {attachedFile && (
          <div className="mb-2 relative inline-flex items-center gap-2 rounded-lg border bg-muted p-2">
            {attachedFile.type === "image" ? (
              <img
                src={attachedFile.dataUrl}
                alt="Attachment"
                className="max-h-32 rounded object-contain bg-background"
              />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded bg-background">
                <FileIcon className="size-8 text-muted-foreground" />
              </div>
            )}
            <div className="flex flex-col max-w-[200px]">
              <span className="truncate text-sm font-medium">
                {attachedFile.name}
              </span>
              <span className="text-xs text-muted-foreground">
                {(attachedFile.size / 1024 / 1024).toFixed(2)} MB
              </span>
            </div>
            <Button
              variant="destructive"
              size="icon"
              className="absolute -top-2 -right-2 size-6 rounded-full"
              onClick={() => setAttachedFile(null)}
            >
              <X className="size-3" />
            </Button>
          </div>
        )}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            form.handleSubmit(handleFormSubmit)(e);
          }}
        >
          <Controller
            name="message"
            control={form.control}
            render={({ field }) => (
              <Field>
                <InputGroup className="rounded-2xl border bg-background shadow-sm flex-wrap overflow-hidden p-2">
                  <input
                    type="file"
                    accept="*/*"
                    className="hidden"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                  />
                  <InputGroupTextarea
                    {...field}
                    placeholder={
                      attachedFile
                        ? "Press send to upload file..."
                        : "Message..."
                    }
                    rows={1}
                    className="flex-1 min-w-[200px] min-h-[44px] max-h-36 resize-none border-0 shadow-none bg-transparent px-2 py-3 focus-visible:ring-0 text-sm"
                    onKeyDown={handleKeyDown}
                    onChange={(e) => {
                      field.onChange(e);
                      handleChange();
                    }}
                    onPaste={handlePaste}
                    disabled={disabled || !!attachedFile}
                    autoFocus
                  />
                  <InputGroupAddon
                    align="block-end"
                    className="p-2 flex items-end"
                  >
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          disabled={disabled || !!attachedFile}
                          className="size-8 rounded-xl"
                        >
                          <Plus className="size-4 text-muted-foreground" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start">
                        <DropdownMenuItem
                          onClick={() => {
                            if (fileInputRef.current) {
                              fileInputRef.current.accept = "image/*";
                              fileInputRef.current.click();
                            }
                          }}
                        >
                          <ImageIcon className="mr-2 size-4" />
                          <span>Image</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => {
                            if (fileInputRef.current) {
                              fileInputRef.current.accept = "*/*";
                              fileInputRef.current.click();
                            }
                          }}
                        >
                          <FileIcon className="mr-2 size-4" />
                          <span>File</span>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                    <Button
                      type="submit"
                      size="icon"
                      disabled={isSubmitDisabled}
                      className="size-8 rounded-xl ml-auto"
                    >
                      <ArrowUp className="size-4" />
                    </Button>
                  </InputGroupAddon>
                </InputGroup>
              </Field>
            )}
          />
        </form>
        <p className="mt-2 text-center text-[11px] text-muted-foreground">
          Enter to send · Shift+Enter for new line · Drag & Drop files
        </p>
      </div>
    </div>
  );
});
ChatInput.displayName = "ChatInput";
