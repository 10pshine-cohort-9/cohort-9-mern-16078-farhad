import pino from "pino";

export const logger = pino({
  level: process.env.LOG_LEVEL ?? "info",
  base: { service: "notes-app" },
  redact: ["req.headers.cookie", "req.headers.authorization"],
  transport: process.env.NODE_ENV === "development" ? { target: "pino/file", options: { destination: 1 } } : undefined,
});
