import { LogIn } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "./ui/button";

interface MissingCredentialsScreenProps {
  chatName: string;
}

export default function MissingCredentialsScreen({
  chatName,
}: MissingCredentialsScreenProps) {
  const navigate = useNavigate();

  return (
    <div className="flex h-screen flex-col items-center justify-center gap-6 px-6">
      <div className="flex flex-col items-center gap-3 text-center">
        <div className="flex size-12 items-center justify-center rounded-full bg-muted">
          <LogIn className="size-6 text-muted-foreground" />
        </div>
        <div>
          <p className="font-medium">Session not found</p>
          <p className="mt-1 text-sm text-muted-foreground">
            You need to join "{chatName}" again to access this room.
          </p>
        </div>
      </div>

      <div className="flex flex-col items-center gap-2 w-full max-w-xs">
        <Button className="w-full" onClick={() => navigate("/join")}>
          <LogIn className="size-4" />
          Join Room
        </Button>
        <Button variant="ghost" className="w-full" asChild>
          <Link to="/">Back to home</Link>
        </Button>
      </div>
    </div>
  );
}
