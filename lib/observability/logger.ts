import { redactValue } from "@/lib/observability/redact";

export type LogLevel = "debug" | "info" | "warn" | "error";

export type LogContext = Record<string, unknown>;

const LEVEL_RANK: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40
};

function getMinLevel(): LogLevel {
  const configured = process.env.LOG_LEVEL?.trim().toLowerCase();

  if (configured === "debug" || configured === "info" || configured === "warn" || configured === "error") {
    return configured;
  }

  return process.env.NODE_ENV === "production" ? "info" : "debug";
}

function shouldLog(level: LogLevel) {
  return LEVEL_RANK[level] >= LEVEL_RANK[getMinLevel()];
}

function writeLog(level: LogLevel, event: string, context?: LogContext) {
  if (!shouldLog(level)) {
    return;
  }

  const payload = {
    timestamp: new Date().toISOString(),
    level,
    event,
    ...(context ? { context: redactValue(context) } : {})
  };

  const line = JSON.stringify(payload);

  if (level === "error") {
    console.error(line);
    return;
  }

  if (level === "warn") {
    console.warn(line);
    return;
  }

  console.log(line);
}

export function logDebug(event: string, context?: LogContext) {
  writeLog("debug", event, context);
}

export function logInfo(event: string, context?: LogContext) {
  writeLog("info", event, context);
}

export function logWarn(event: string, context?: LogContext) {
  writeLog("warn", event, context);
}

export function logError(event: string, context?: LogContext) {
  writeLog("error", event, context);
}
