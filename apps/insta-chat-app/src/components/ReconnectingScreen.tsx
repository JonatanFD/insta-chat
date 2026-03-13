import { Loader2 } from "lucide-react";

export function ReconnectingScreen() {
  return (
    <div className="flex h-screen flex-col items-center justify-center gap-4 text-muted-foreground">
      <Loader2 className="size-8 animate-spin text-primary" />
      <div className="text-center">
        <p className="text-sm font-medium text-foreground">Reconnecting…</p>
        <p className="mt-1 text-xs">
          Verifying session and rejoining the room…
        </p>
      </div>
    </div>
  );
}
