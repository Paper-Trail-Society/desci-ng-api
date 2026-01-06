import pino from "pino";
import pinoHttp from "pino-http";
import { getRequestContext } from "./request-context";

export const logger = pino({
  level: process.env.LOG_LEVEL || "info",
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
  logger: logger,
  redact: {
    paths: ["req.headers.authorization", "req.headers.cookie"],
    remove: true,
  },
  genReqId: (req, res) => {
    const event = getRequestContext().get("wideEvent");
    res.setHeader("X-Request-Id", event.request_id);
    return event.request_id;
  },

  customLogLevel: (_req, res, err) => {
    if (err || res.statusCode >= 500) return "error";
    if (res.statusCode >= 400) return "warn";
    return "info";
  },
});
