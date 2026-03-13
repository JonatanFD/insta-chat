import { AlertTriangle, Loader2 } from "lucide-react";
import { Button } from "./ui/button";
import { Link } from "react-router-dom";

interface ReconnectFailedScreenProps {
  chatName: string;
  error: string | null;
  onRetry: () => void;
}

export function ReconnectFailedScreen({
  chatName,
  error,
  onRetry,
}: ReconnectFailedScreenProps) {
  return (
    <div className="flex h-screen flex-col items-center justify-center gap-6 px-6">
      <div className="flex flex-col items-center gap-3 text-center">
        <div className="flex size-12 items-center justify-center rounded-full bg-destructive/10">
          <AlertTriangle className="size-6 text-destructive" />
        </div>
        <div>
          <p className="font-medium">Could not reconnect to "{chatName}"</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {error ?? "An unexpected error occurred."}
          </p>
        </div>
      </div>

      <div className="flex flex-col items-center gap-2 w-full max-w-xs">
        <Button className="w-full" onClick={onRetry}>
          <Loader2 className="size-4" />
          Try again
        </Button>
        <Button variant="ghost" className="w-full" asChild>
          <Link to="/">Back to home</Link>
        </Button>
      </div>
    </div>
  );
}
