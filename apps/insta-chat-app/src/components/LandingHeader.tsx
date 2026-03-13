import { Link } from "react-router-dom";
import InstaChatLogo from "./InstaChatLogo";
import { ModeToggle } from "./mode-toggle";
import { GithubLogo } from "./ui/GithubLogo";
import { Button } from "./ui/button";
import { Lock, MessageSquare } from "lucide-react";

export default function LandingHeader() {
  return (
    <header className="bg-background w-full max-w-7xl mx-auto border p-4 rounded-xl sticky top-4">
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

          <div className="flex flex-col gap-3 sm:flex-row">
            <Button size="sm" asChild>
              <Link to="/create">
                <MessageSquare className="size-4" />
                Create a Chat
              </Link>
            </Button>
            <Button size="sm" variant="outline" asChild>
              <Link to="/join">
                <Lock className="size-4" />
                Join a Chat
              </Link>
            </Button>
          </div>
        </div>
      </nav>
    </header>
  );
}
