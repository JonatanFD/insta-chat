import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRef, useCallback, useState } from "react";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import {
    InputGroup,
    InputGroupAddon,
    InputGroupTextarea,
} from "@/components/ui/input-group";
import { ArrowUp, ImageIcon, X } from "lucide-react";

const formSchema = z.object({
    message: z.string(),
});

type FormValues = z.infer<typeof formSchema>;

interface ChatInputProps {
    onSend: (value: string) => void;
    onTyping?: () => void;
    onStopTyping?: () => void;
    disabled?: boolean;
}

export function ChatInput({
    onSend,
    onTyping,
    onStopTyping,
    disabled,
}: ChatInputProps) {
    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: { message: "" },
    });

    const [attachedImage, setAttachedImage] = useState<string | null>(null);

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

    const onSubmit = useCallback((data: FormValues) => {
        clearStopTypingTimer();
        if (isTyping.current) {
            isTyping.current = false;
            onStopTyping?.();
        }
        
        if (attachedImage) {
            onSend(attachedImage);
            setAttachedImage(null);
        } else if (data.message.trim()) {
            onSend(data.message.trim());
        }
        form.reset();
    }, [attachedImage, clearStopTypingTimer, form, onSend, onStopTyping]);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            form.handleSubmit(onSubmit)();
        }
    };

    const processFile = (file: File) => {
        if (!file.type.startsWith("image/")) return;
        const reader = new FileReader();
        reader.onload = (event) => {
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
                const dataUrl = canvas.toDataURL("image/jpeg", 0.7);
                setAttachedImage(dataUrl);
            };
            img.src = event.target?.result as string;
        };
        reader.readAsDataURL(file);
    };

    const handlePaste = (e: React.ClipboardEvent) => {
        const items = e.clipboardData.items;
        for (let i = 0; i < items.length; i++) {
            if (items[i].type.indexOf("image") !== -1) {
                const blob = items[i].getAsFile();
                if (blob) {
                    e.preventDefault();
                    processFile(blob);
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

    const fileInputRef = useRef<HTMLInputElement>(null);

    const messageValue = useWatch({
        control: form.control,
        name: "message",
    }) || "";
    const isSubmitDisabled = (!messageValue.trim() && !attachedImage) || disabled;

    return (
        <div className="p-4">
            <div className="mx-auto max-w-2xl">
                {attachedImage && (
                    <div className="mb-2 relative inline-block">
                        <img src={attachedImage} alt="Attachment" className="max-h-32 rounded-lg border object-contain bg-muted" />
                        <Button 
                            variant="destructive" 
                            size="icon" 
                            className="absolute -top-2 -right-2 size-6 rounded-full"
                            onClick={() => setAttachedImage(null)}
                        >
                            <X className="size-3" />
                        </Button>
                    </div>
                )}
                <form onSubmit={form.handleSubmit(onSubmit)}>
                    <Controller
                        name="message"
                        control={form.control}
                        render={({ field }) => (
                            <Field>
                                <InputGroup className="rounded-2xl border bg-background shadow-sm flex-wrap overflow-hidden">
                                    <InputGroupAddon align="block-start" className="p-2 flex items-end">
                                        <input 
                                            type="file" 
                                            accept="image/*" 
                                            className="hidden" 
                                            ref={fileInputRef}
                                            onChange={handleFileChange}
                                        />
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            disabled={disabled || !!attachedImage}
                                            className="size-8 rounded-xl"
                                            onClick={() => fileInputRef.current?.click()}
                                        >
                                            <ImageIcon className="size-4 text-muted-foreground" />
                                        </Button>
                                    </InputGroupAddon>
                                    <InputGroupTextarea
                                        {...field}
                                        placeholder={attachedImage ? "Press send to upload image..." : "Message..."}
                                        rows={1}
                                        className="flex-1 min-w-[200px] min-h-[44px] max-h-36 resize-none border-0 shadow-none bg-transparent px-2 py-3 focus-visible:ring-0 text-sm"
                                        onKeyDown={handleKeyDown}
                                        onChange={(e) => {
                                            field.onChange(e);
                                            handleChange();
                                        }}
                                        onPaste={handlePaste}
                                        disabled={disabled || !!attachedImage}
                                        autoFocus
                                    />
                                    <InputGroupAddon
                                        align="block-end"
                                        className="p-2 flex items-end"
                                    >
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
                    Enter to send · Shift+Enter for new line · Paste images
                </p>
            </div>
        </div>
    );
}
