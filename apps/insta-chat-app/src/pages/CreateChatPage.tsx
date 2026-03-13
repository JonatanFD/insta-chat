import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";
import { ArrowLeft, Lock, MessageSquare, Loader2, AlertTriangle } from "lucide-react";
import { createChat, joinChat } from "@/services/api";
import { encryptionService } from "@/services/encryption";
import { saveReconnectCredentials } from "@/lib/utils";
import { useChatStore } from "@/stores/chat";

function decodeJwtPayload(token: string): {
    participantId: string;
    chatName: string;
    participantName: string;
} {
    const base64 = token.split(".")[1];
    return JSON.parse(atob(base64));
}

export default function CreateChatPage() {
    const navigate = useNavigate();
    const setSession = useChatStore((s) => s.setSession);

    const [chatName, setChatName] = useState("");
    const [password, setPassword] = useState("");
    const [termsAccepted, setTermsAccepted] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [rateLimitModalOpen, setRateLimitModalOpen] = useState(false);
    const [resetTime, setResetTime] = useState<string>("");

    const formatResetTime = (seconds: number) => {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        if (h > 0) return `${h} hours and ${m} minutes`;
        if (m > 0) return `${m} minutes`;
        return `${seconds} seconds`;
    };

    const handleCreate = async () => {
        const name = chatName.trim();
        const pass = password.trim();
        if (!name || !pass || !termsAccepted) return;

        setLoading(true);
        setError(null);

        try {
            // 1. Create the chat room
            await createChat(name, pass, termsAccepted);

            // 2. Generate E2E key pair
            const publicKey = await encryptionService.generateKeyPair();

            // 3. Auto-join the chat
            const token = await joinChat(name, pass, publicKey);
            const payload = decodeJwtPayload(token);

            // 4. Store session
            setSession({
                chatName: payload.chatName,
                token,
                participantId: payload.participantId,
                participantName: payload.participantName,
            });

            // 5. Save reconnect credentials so the user can rejoin after a page reload
            await saveReconnectCredentials({ chatName: name, password: pass });

            // 6. Navigate to chat
            navigate(`/rooms/${encodeURIComponent(name)}`);
        } catch (err) {
            if (err instanceof Error) {
                try {
                    const parsedErr = JSON.parse(err.message);
                    if (parsedErr.type === "RATE_LIMIT") {
                        const timeStr = parsedErr.resetInSeconds 
                            ? formatResetTime(parsedErr.resetInSeconds) 
                            : "24 hours";
                        setResetTime(timeStr);
                        setRateLimitModalOpen(true);
                        return; // return so we don't set a normal error
                    }
                } catch {
                    // Not a JSON error, handle normally
                }
                setError(err.message);
            } else {
                setError("Failed to create chat");
            }
        } finally {
            setLoading(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter") {
            handleCreate();
        }
    };

    return (
        <div className="relative min-h-screen">
            {/* Grid background */}
            <div
                className="pointer-events-none fixed inset-0 -z-10"
                style={{
                    backgroundImage:
                        "linear-gradient(to right, var(--color-border) 1px, transparent 1px), linear-gradient(to bottom, var(--color-border) 1px, transparent 1px)",
                    backgroundSize: "4rem 4rem",
                }}
            />
            <div className="pointer-events-none fixed inset-0 -z-10 bg-gradient-to-b from-background/80 via-background/60 to-background/80" />

            {/* Navbar */}
            <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-sm">
                <nav className="mx-auto flex h-14 max-w-5xl items-center px-6">
                    <Button variant="ghost" size="sm" asChild>
                        <Link to="/">
                            <ArrowLeft className="size-4" />
                            Back
                        </Link>
                    </Button>
                </nav>
            </header>

            <main className="mx-auto flex max-w-md flex-col items-center px-6 pt-24">
                <Card className="w-full">
                    <CardHeader className="text-center">
                        <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-primary/10">
                            <MessageSquare className="size-6 text-primary" />
                        </div>
                        <CardTitle className="text-2xl">
                            Create a Chat Room
                        </CardTitle>
                        <CardDescription>
                            Choose a name and password for your encrypted room.
                            Share them with whoever you want to chat with.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-3">
                            <div className="space-y-1.5">
                                <label
                                    htmlFor="chatName"
                                    className="text-sm font-medium"
                                >
                                    Room Name
                                </label>
                                <Input
                                    id="chatName"
                                    placeholder="e.g. secret-meeting"
                                    value={chatName}
                                    onChange={(e) => {
                                        setChatName(e.target.value.replace(/\s+/g, '_'));
                                        setError(null);
                                    }}
                                    onKeyDown={handleKeyDown}
                                    disabled={loading}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label
                                    htmlFor="password"
                                    className="text-sm font-medium"
                                >
                                    Password
                                </label>
                                <Input
                                    id="password"
                                    type="password"
                                    placeholder="Room password"
                                    value={password}
                                    onChange={(e) => {
                                        setPassword(e.target.value);
                                        setError(null);
                                    }}
                                    onKeyDown={handleKeyDown}
                                    disabled={loading}
                                />
                            </div>
                        </div>

                        {error ? (
                            <p className="text-sm text-destructive">{error}</p>
                        ) : null}

                        <div className="flex items-center gap-2">
                            <Badge variant="secondary" className="gap-1">
                                <Lock className="size-3" />
                                E2E Encrypted
                            </Badge>
                            <Badge variant="outline" className="gap-1 text-xs">
                                2h auto-delete
                            </Badge>
                        </div>

                        <div className="flex items-start space-x-2 rounded-md border p-4">
                            <Checkbox 
                                id="terms" 
                                checked={termsAccepted}
                                onCheckedChange={(checked) => setTermsAccepted(checked as boolean)}
                            />
                            <div className="grid gap-1.5 leading-none">
                                <label
                                    htmlFor="terms"
                                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                >
                                    Accept terms and conditions
                                </label>
                                <p className="text-sm text-muted-foreground">
                                    I agree to the{" "}
                                    <Link to="/terms" className="text-primary hover:underline">
                                        terms of service
                                    </Link>
                                    {" "}and understand my IP is temporarily stored for rate limiting.
                                </p>
                            </div>
                        </div>

                        <Button
                            className="w-full"
                            size="lg"
                            onClick={handleCreate}
                            disabled={
                                !chatName.trim() || !password.trim() || !termsAccepted || loading
                            }
                        >
                            {loading ? (
                                <Loader2 className="size-4 animate-spin" />
                            ) : (
                                <Lock className="size-4" />
                            )}
                            {loading ? "Creating..." : "Create Encrypted Room"}
                        </Button>
                    </CardContent>
                </Card>
            </main>

            <Dialog open={rateLimitModalOpen} onOpenChange={setRateLimitModalOpen}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-destructive/10">
                            <AlertTriangle className="size-6 text-destructive" />
                        </div>
                        <DialogTitle className="text-center text-xl">Rate Limit Exceeded</DialogTitle>
                        <DialogDescription className="text-center text-base pt-2">
                            You have reached the maximum number of chat rooms you can create within 24 hours to prevent spam and abuse.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4 text-center">
                        <p className="text-sm text-muted-foreground">
                            Please try again in:
                        </p>
                        <p className="text-2xl font-bold text-foreground mt-1">
                            {resetTime}
                        </p>
                    </div>
                    <DialogFooter className="sm:justify-center">
                        <Button onClick={() => setRateLimitModalOpen(false)}>
                            Understood
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
