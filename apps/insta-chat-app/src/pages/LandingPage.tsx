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
import InstaChatAppLogo from "@/components/InstaChatAppLogo";
import LandingHeader from "@/components/LandingHeader";
import InstaChatLogo from "@/components/InstaChatLogo";
import { GithubLogo } from "@/components/ui/GithubLogo";
import { KofiWidget } from "@/components/KofiWidget";

const features = [
    {
        icon: Lock,
        title: "End-to-End Encryption",
        description:
            "Your messages are encrypted before leaving your device. Only you and your recipient can read them. Even we can't access your conversations.",
    },
    {
        icon: Clock,
        title: "Auto-Delete in 2 Hours",
        description:
            "Every chat room self-destructs completely 2 hours after creation. No traces left behind.",
    },
    {
        icon: UserX,
        title: "No Registration Required",
        description:
            "No accounts, no emails, no phone numbers. Just create a room and start chatting instantly.",
    },
    {
        icon: ServerOff,
        title: "Zero Data Storage",
        description:
            "Messages are relayed in real-time. We only temporarily store your IP for rate limiting.",
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
            <LandingHeader />

            {/* Hero Section */}
            <section className="mx-auto flex max-w-3xl flex-col items-center px-4 sm:px-6 pt-16 sm:pt-24 pb-12 sm:pb-20 text-center">
                <Badge variant="secondary" className="mb-4 sm:mb-6 gap-1.5">
                    <Shield className="size-3" />
                    End-to-End Encrypted
                </Badge>

                <InstaChatAppLogo className="h-32 sm:h-40 w-auto my-4" />

                <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
                    Messages that vanish.
                    <br />
                    <span className="text-muted-foreground">
                        Privacy that stays.
                    </span>
                </h1>

                <p className="mt-4 sm:mt-6 max-w-xl text-base sm:text-lg text-muted-foreground">
                    Encrypted end-to-end chat. No sign-up. No data stored. No
                    trace. Chats auto-delete after 2 hours.
                </p>

                <div className="mt-8 sm:mt-10 flex w-full sm:w-auto flex-col gap-3 sm:flex-row">
                    <Button size="lg" className="w-full sm:w-auto" asChild>
                        <Link to="/create">
                            <MessageSquare className="size-4 mr-2" />
                            Create a Chat
                        </Link>
                    </Button>
                    <Button size="lg" variant="outline" className="w-full sm:w-auto" asChild>
                        <Link to="/join">
                            <Lock className="size-4 mr-2" />
                            Join a Chat
                        </Link>
                    </Button>
                </div>
            </section>

            {/* Features List in Grid */}
            <section className="mx-auto max-w-5xl px-4 sm:px-6 pb-16 sm:pb-24">
                <div className="mb-8 sm:mb-12 text-center">
                    <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-3 sm:mb-4">Why InstaChat?</h2>
                    <p className="text-muted-foreground max-w-2xl mx-auto text-sm sm:text-base">
                        Designed with ultimate privacy and simplicity in mind. No compromises.
                    </p>
                </div>
                <div className="grid gap-4 sm:gap-6 sm:grid-cols-2">
                    {features.map((feature) => (
                        <Card key={feature.title} className="hover:shadow-md transition-shadow">
                            <CardHeader>
                                <div className="mb-3 sm:mb-4 flex size-10 sm:size-12 items-center justify-center rounded-lg bg-primary/10">
                                    <feature.icon className="size-5 sm:size-6 text-primary" />
                                </div>
                                <CardTitle className="text-lg sm:text-xl">
                                    {feature.title}
                                </CardTitle>
                                <CardDescription className="text-sm sm:text-base mt-2">
                                    {feature.description}
                                </CardDescription>
                            </CardHeader>
                        </Card>
                    ))}
                </div>
            </section>

            {/* Donation Section */}
            <section className="mx-auto max-w-2xl px-4 sm:px-6 pb-16 sm:pb-24 text-center">
                <Card className="border-primary/20 bg-primary/5">
                    <CardHeader>
                        <CardTitle className="text-xl sm:text-2xl mb-2">Support the Project</CardTitle>
                        <CardDescription className="text-sm sm:text-base text-foreground/80 mb-6">
                            InstaChat is a free, open-source project. If you find it useful, consider supporting its development and server costs!
                        </CardDescription>
                        <KofiWidget />
                    </CardHeader>
                </Card>
            </section>

            {/* Footer */}
            <footer className="border-t">
                <div className="mx-auto flex flex-col sm:flex-row max-w-5xl items-center justify-between px-4 sm:px-6 py-6 sm:py-8 text-sm text-muted-foreground gap-4">
                    <div className="flex items-center gap-2">
                        <InstaChatLogo className="h-5 sm:h-6 w-auto" />
                        <span className="font-semibold text-foreground">InstaChat</span>
                    </div>
                    <p className="text-center sm:text-left">Private by design. No data collected.</p>
                    <div className="flex flex-wrap justify-center items-center gap-4">
                        <Link to="/terms" className="hover:text-foreground transition-colors">
                            Terms & Privacy
                        </Link>
                        <a 
                            href="https://github.com/JonatanFD/insta-chat" 
                            target="_blank" 
                            rel="noreferrer noopener"
                            className="flex items-center gap-2 hover:text-foreground transition-colors"
                        >
                            <GithubLogo className="size-4" />
                            <span>Source Code</span>
                        </a>
                    </div>
                </div>
            </footer>
        </div>
    );
}
