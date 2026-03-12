import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Card,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    Lock,
    MessageSquare,
    Shield,
    Clock,
    UserX,
    ServerOff,
} from "lucide-react";
import { ModeToggle } from "@/components/mode-toggle";
import InstaChatLogo from "@/components/InstaChatLogo";
import InstaChatAppLogo from "@/components/InstaChatAppLogo";

const features = [
    {
        icon: Lock,
        title: "End-to-End Encryption",
        description:
            "Your messages are encrypted before leaving your device. Only you and your recipient can read them.",
    },
    {
        icon: Clock,
        title: "Auto-Delete in 2 Hours",
        description:
            "Every chat room self-destructs 2 hours after creation. No traces left behind.",
    },
    {
        icon: UserX,
        title: "No Registration Required",
        description:
            "No accounts, no emails, no phone numbers. Just create a room and start chatting.",
    },
    {
        icon: ServerOff,
        title: "Zero Data Storage",
        description:
            "Messages are relayed in real-time and never stored on any server. When the chat ends, it's gone forever.",
    },
];

export default function LandingPage() {
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
                <nav className="mx-auto flex h-14 max-w-5xl items-center justify-between px-6">
                    <Link
                        to="/"
                        className="flex items-center gap-2 font-semibold"
                    >
                        <InstaChatLogo className="h-5 w-auto" />
                        <span>InstaChat</span>
                    </Link>
                    <div className="flex items-center gap-3">
                        <Button variant="ghost" size="sm" asChild>
                            <Link to="/join">Join Chat</Link>
                        </Button>
                        <Button size="sm" asChild>
                            <Link to="/create">Create Chat</Link>
                        </Button>
                        <ModeToggle />
                    </div>
                </nav>
            </header>

            {/* Hero Section */}
            <section className="mx-auto flex max-w-3xl flex-col items-center px-6 pt-24 pb-20 text-center">
                <Badge variant="secondary" className="mb-6 gap-1.5">
                    <Shield className="size-3" />
                    End-to-End Encrypted
                </Badge>

                <InstaChatAppLogo className="h-40 w-auto" />

                <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
                    Messages that vanish.
                    <br />
                    <span className="text-muted-foreground">
                        Privacy that stays.
                    </span>
                </h1>

                <p className="mt-6 max-w-xl text-lg text-muted-foreground">
                    Encrypted end-to-end chat. No sign-up. No data stored. No
                    trace. Chats auto-delete after 2 hours.
                </p>

                <div className="mt-10 flex flex-col gap-3 sm:flex-row">
                    <Button size="lg" asChild>
                        <Link to="/create">
                            <MessageSquare className="size-4" />
                            Create a Chat
                        </Link>
                    </Button>
                    <Button size="lg" variant="outline" asChild>
                        <Link to="/join">
                            <Lock className="size-4" />
                            Join a Chat
                        </Link>
                    </Button>
                </div>
            </section>

            {/* Benefits Cards */}
            <section className="mx-auto max-w-5xl px-6 pb-24">
                <div className="grid gap-4 sm:grid-cols-2">
                    {features.map((feature) => (
                        <Card key={feature.title}>
                            <CardHeader>
                                <div className="mb-2 flex size-10 items-center justify-center rounded-lg bg-primary/10">
                                    <feature.icon className="size-5 text-primary" />
                                </div>
                                <CardTitle className="text-lg">
                                    {feature.title}
                                </CardTitle>
                                <CardDescription>
                                    {feature.description}
                                </CardDescription>
                            </CardHeader>
                        </Card>
                    ))}
                </div>
            </section>

            {/* Footer */}
            <footer className="border-t">
                <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-6 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                        <MessageSquare className="size-4" />
                        <span>InstaChat</span>
                    </div>
                    <p>Private by design. No data collected.</p>
                </div>
            </footer>
        </div>
    );
}
