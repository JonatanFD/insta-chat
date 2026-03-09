import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  Wifi,
  WifiOff,
  Lock,
  LockOpen,
  Loader2,
  AlertTriangle,
} from "lucide-react";

export type E2EStatus = "pending" | "deriving" | "ready" | "failed";

interface ConnectionStatusProps {
  isConnected: boolean;
  e2eStatus: E2EStatus;
}

const e2eConfig: Record<
  E2EStatus,
  {
    label: string;
    icon: React.ReactNode;
    variant: "default" | "outline" | "destructive" | "secondary";
    className?: string;
  }
> = {
  pending: {
    label: "E2E Pending",
    icon: <LockOpen className="size-3" />,
    variant: "outline",
  },
  deriving: {
    label: "Establishing E2E...",
    icon: <Loader2 className="size-3 animate-spin" />,
    variant: "secondary",
  },
  ready: {
    label: "E2E Active",
    icon: <Lock className="size-3" />,
    variant: "default",
    className: "bg-green-600 hover:bg-green-600",
  },
  failed: {
    label: "E2E Failed",
    icon: <AlertTriangle className="size-3" />,
    variant: "destructive",
  },
};

export function ConnectionStatus({
  isConnected,
  e2eStatus,
}: ConnectionStatusProps) {
  const e2e = e2eConfig[e2eStatus];

  return (
    <div className="flex items-center gap-2">
      {/* Conexión WebSocket */}
      <Badge
        variant={isConnected ? "default" : "destructive"}
        className={cn(
          "gap-1 text-xs",
          isConnected && "bg-green-600 hover:bg-green-600",
        )}
      >
        {isConnected ? (
          <Wifi className="size-3" />
        ) : (
          <WifiOff className="size-3" />
        )}
        {isConnected ? "Connected" : "Disconnected"}
      </Badge>

      {/* Estado E2E */}
      <Badge
        variant={e2e.variant}
        className={cn("gap-1 text-xs", e2e.className)}
      >
        {e2e.icon}
        {e2e.label}
      </Badge>
    </div>
  );
}
