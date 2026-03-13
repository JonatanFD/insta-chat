import { Link } from "react-router-dom";
import InstaChatLogo from "./InstaChatLogo";
import { ModeToggle } from "./mode-toggle";
import { GithubLogo } from "./ui/GithubLogo";
import { Button } from "./ui/button";
import { Lock, MessageSquare } from "lucide-react";

export default function LandingHeader() {
  return (
    <header className="sticky top-2 sm:top-4 z-50 p-2">
      <nav className=" bg-background w-full md:max-w-7xl md:mx-auto border p-3 sm:p-4 rounded-xl flex items-center justify-between">
        <a href="/" className="flex items-center gap-2 sm:gap-4">
          <InstaChatLogo className="h-6 sm:h-8 w-auto" />
          <span className="text-lg sm:text-xl font-bold">InstaChat</span>
        </a>

        <div className="flex items-center gap-1 sm:gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="size-8 sm:size-10"
            asChild
          >
            <a
              href="https://github.com/JonatanFD/insta-chat"
              target="_blank"
              rel="noreferrer noopener"
            >
              <GithubLogo className="size-4 sm:size-5" />
              <span className="sr-only">GitHub Repository</span>
            </a>
          </Button>
          <ModeToggle />

          <div className="hidden md:flex flex-row gap-2 ml-2">
            <Button size="sm" asChild>
              <Link to="/create">
                <MessageSquare className="size-4 mr-2" />
                Create a Chat
              </Link>
            </Button>
            <Button size="sm" variant="outline" asChild>
              <Link to="/join">
                <Lock className="size-4 mr-2" />
                Join a Chat
              </Link>
            </Button>
          </div>
        </div>
      </nav>
    </header>
  );
}
