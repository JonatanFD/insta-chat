const IS_DEV = import.meta.env.DEV;

type LogLevel = "info" | "warn" | "error" | "success" | "debug";

interface LevelConfig {
  label: string;
  color: string;
  method: "log" | "warn" | "error";
}

const LEVEL_CONFIG: Record<LogLevel, LevelConfig> = {
  info:    { label: "INFO",    color: "#60a5fa", method: "log"   }, // blue-400
  warn:    { label: "WARN",    color: "#facc15", method: "warn"  }, // yellow-400
  error:   { label: "ERROR",   color: "#f87171", method: "error" }, // red-400
  success: { label: "SUCCESS", color: "#4ade80", method: "log"   }, // green-400
  debug:   { label: "DEBUG",   color: "#a78bfa", method: "log"   }, // violet-400
};

const SCOPE_COLOR = "#94a3b8"; // slate-400

// ─── Core log function ────────────────────────────────────────────────────────

function log(scope: string, level: LogLevel, message: string, data?: unknown) {
  if (!IS_DEV) return;

  const { label, color, method } = LEVEL_CONFIG[level];
  const timestamp = new Date().toISOString().split("T")[1].replace("Z", "");

  const prefix =
    `%c[${timestamp}] %c${scope} %c${label}`;

  const styles = [
    `color: ${SCOPE_COLOR}; font-size: 10px;`,
    `color: ${SCOPE_COLOR}; font-weight: bold;`,
    `color: ${color}; font-weight: bold;`,
  ];

  if (data !== undefined) {
    console[method](prefix + " %c» " + message, ...styles, `color: ${color};`, data);
  } else {
    console[method](prefix + " %c» " + message, ...styles, `color: ${color};`);
  }
}

// ─── Group helpers ────────────────────────────────────────────────────────────

function group(scope: string, label: string, collapsed = true) {
  if (!IS_DEV) return;
  const fn = collapsed ? console.groupCollapsed : console.group;
  fn(`%c${scope} %c${label}`, `color: ${SCOPE_COLOR}; font-weight: bold;`, "color: inherit;");
}

function groupEnd() {
  if (!IS_DEV) return;
  console.groupEnd();
}

// ─── Scoped logger factory ────────────────────────────────────────────────────

export interface ScopedLogger {
  info    : (message: string, data?: unknown) => void;
  warn    : (message: string, data?: unknown) => void;
  error   : (message: string, data?: unknown) => void;
  success : (message: string, data?: unknown) => void;
  debug   : (message: string, data?: unknown) => void;
  group   : (label: string, collapsed?: boolean) => void;
  groupEnd: () => void;
}

export function createLogger(scope: string): ScopedLogger {
  return {
    info    : (msg, data?) => log(scope, "info",    msg, data),
    warn    : (msg, data?) => log(scope, "warn",    msg, data),
    error   : (msg, data?) => log(scope, "error",   msg, data),
    success : (msg, data?) => log(scope, "success", msg, data),
    debug   : (msg, data?) => log(scope, "debug",   msg, data),
    group   : (label, collapsed = true) => group(scope, label, collapsed),
    groupEnd: () => groupEnd(),
  };
}
