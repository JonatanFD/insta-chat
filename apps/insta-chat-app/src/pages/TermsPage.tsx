import { Link } from "react-router-dom";
import { ArrowLeft, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function TermsPage() {
    return (
        <div className="relative min-h-screen">
            <div
                className="pointer-events-none fixed inset-0 -z-10"
                style={{
                    backgroundImage:
                        "linear-gradient(to right, var(--color-border) 1px, transparent 1px), linear-gradient(to bottom, var(--color-border) 1px, transparent 1px)",
                    backgroundSize: "4rem 4rem",
                }}
            />
            <div className="pointer-events-none fixed inset-0 -z-10 bg-gradient-to-b from-background/80 via-background/60 to-background/80" />

            <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-sm">
                <nav className="mx-auto flex h-14 max-w-5xl items-center px-6">
                    <Button variant="ghost" size="sm" asChild>
                        <Link to="/create">
                            <ArrowLeft className="mr-2 size-4" />
                            Back to Create
                        </Link>
                    </Button>
                </nav>
            </header>

            <main className="mx-auto max-w-3xl px-6 py-12">
                <div className="mb-8 flex items-center gap-3">
                    <div className="flex size-12 items-center justify-center rounded-full bg-primary/10">
                        <Shield className="size-6 text-primary" />
                    </div>
                    <h1 className="text-3xl font-bold tracking-tight">Terms and Conditions</h1>
                </div>

                <div className="prose prose-invert max-w-none space-y-6 text-muted-foreground">
                    <section className="space-y-3">
                        <h2 className="text-xl font-semibold text-foreground">1. Privacy & Data Collection</h2>
                        <p>
                            We value your privacy and aim to collect as little data as possible. 
                            The <strong>only</strong> piece of information we temporarily persist is your <strong>IP Address</strong>. 
                        </p>
                        <p>
                            We collect your IP Address strictly for security purposes and to prevent abuse of the service through rate limiting.
                            It is stored for up to 24 hours and is automatically deleted afterwards. 
                        </p>
                    </section>

                    <section className="space-y-3">
                        <h2 className="text-xl font-semibold text-foreground">2. End-to-End Encryption (E2EE)</h2>
                        <p>
                            All chat messages are End-to-End Encrypted (E2EE). This means your messages are encrypted on your device 
                            and can only be decrypted by the people in your chat room who have the room password. 
                            <strong>We cannot read your messages</strong>.
                        </p>
                    </section>

                    <section className="space-y-3">
                        <h2 className="text-xl font-semibold text-foreground">3. Data Retention & Auto-Deletion</h2>
                        <p>
                            We do not store your chat history or any chat metadata on our servers beyond what is strictly necessary to 
                            deliver messages in real-time. Additionally, all chat rooms are automatically destroyed <strong>2 hours</strong> after their creation.
                        </p>
                    </section>
                </div>
            </main>
        </div>
    );
}
