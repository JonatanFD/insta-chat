import InstaChatLogo from "./InstaChatLogo";
import { ModeToggle } from "./mode-toggle";

export default function LandingHeader() {
    return (
        <header className="bg-background w-full max-w-5xl mx-auto border p-4 mt-2 rounded-xl">
            <nav className="flex items-center justify-between">
                <a href="/" className="flex items-center gap-4">
                    <InstaChatLogo className="h-8 w-auto" />
                    <span className="text-xl font-bold">InstaChat</span>
                </a>

                <ModeToggle />
            </nav>
        </header>
    );
}
