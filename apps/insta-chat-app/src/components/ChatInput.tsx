import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import {
    InputGroup,
    InputGroupAddon,
    InputGroupTextarea,
} from "@/components/ui/input-group";
import { ArrowUp } from "lucide-react";

const formSchema = z.object({
    message: z.string().min(1),
});

type FormValues = z.infer<typeof formSchema>;

interface ChatInputProps {
    onSend: (value: string) => void;
    disabled?: boolean;
}

export function ChatInput({ onSend, disabled }: ChatInputProps) {
    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: { message: "" },
    });

    function onSubmit(data: FormValues) {
        onSend(data.message.trim());
        form.reset();
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            form.handleSubmit(onSubmit)();
        }
    };

    return (
        <div className="p-4">
            <div className="mx-auto max-w-2xl">
                <form onSubmit={form.handleSubmit(onSubmit)}>
                    <Controller
                        name="message"
                        control={form.control}
                        render={({ field }) => (
                            <Field>
                                <InputGroup className="rounded-2xl border bg-background shadow-sm">
                                    <InputGroupTextarea
                                        {...field}
                                        placeholder="Message..."
                                        rows={1}
                                        className="min-h-[44px] max-h-36 resize-none border-0 shadow-none bg-transparent px-4 py-3 focus-visible:ring-0 text-sm"
                                        onKeyDown={handleKeyDown}
                                        disabled={disabled}
                                        autoFocus
                                    />
                                    <InputGroupAddon
                                        align="block-end"
                                        className="p-2"
                                    >
                                        <Button
                                            type="submit"
                                            size="icon"
                                            disabled={
                                                !form.watch("message").trim() ||
                                                disabled
                                            }
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
                    Enter to send · Shift+Enter for new line
                </p>
            </div>
        </div>
    );
}
