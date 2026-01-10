import pino from "pino";
import pinoHttp from "pino-http";
import { randomUUID } from "node:crypto";

export const logger = pino({
  name: "default",
  level: process.env.LOG_LEVEL || "trace",
  base: {
    service: "desci-ng-api",
    env: process.env.NODE_ENV || "development",
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

export const httpLogger = pinoHttp({
  name: "http",
  logger: logger,
  redact: {
    paths: ["req.headers.authorization", "req.headers.cookie"],
    remove: true,
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
