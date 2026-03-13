import InstaChatLogo from "./InstaChatLogo";
import { ModeToggle } from "./mode-toggle";
import { GithubLogo } from "./ui/GithubLogo";
import { Button } from "./ui/button";

export default function LandingHeader() {
    return (
        <header className="bg-background w-full max-w-5xl mx-auto border p-4 mt-2 rounded-xl">
            <nav className="flex items-center justify-between">
                <a href="/" className="flex items-center gap-4">
                    <InstaChatLogo className="h-8 w-auto" />
                    <span className="text-xl font-bold">InstaChat</span>
                </a>

                <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" asChild>
                        <a
                            href="https://github.com/JonatanFD/insta-chat"
                            target="_blank"
                            rel="noreferrer noopener"
                        >
                            <GithubLogo className="size-5" />
                            <span className="sr-only">GitHub Repository</span>
                        </a>
                    </Button>
                    <ModeToggle />
                </div>
            </nav>
        </header>
    );
}
