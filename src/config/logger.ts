import pino from "pino";
import pinoHttp from "pino-http";
import { randomUUID } from "node:crypto";

const baseLogger = pino({
  level: process.env.LOG_LEVEL || "info",
  base: {
    service: "nubianresearch-api",
    env: process.env.NODE_ENV || "development",
    timestamp: new Date().toISOString(),
  },
  redact: {
    paths: [
      "req.headers.authorization",
      "req.headers.cookie",
      "password",
      "token",
    ],
    censor: "[REDACTED]",
  },
  formatters: {
    level: (label) => {
      return { level: label.toUpperCase() };
    },
  },
});

export const logger = baseLogger.child({ channel: "default" });

export const httpLogger = pinoHttp({
  name: "http",
  logger: baseLogger.child({ channel: "http" }),
  redact: {
    paths: ["req.headers.authorization", "req.headers.cookie"],
    remove: true,
  },
  customProps: (req, _res) => {
    return {
      ctx: Object.fromEntries((req as any).ctx as Map<string, any>),
    };
  },
  genReqId: (_req, res) => {
    const requestId = randomUUID();
    res.setHeader("X-Request-Id", requestId);
    return requestId;
  },
  customLogLevel: (_req, res, err) => {
    if (err || res.statusCode >= 500) return "error";
    if (res.statusCode >= 400) return "warn";
    return "info";
  },
});
