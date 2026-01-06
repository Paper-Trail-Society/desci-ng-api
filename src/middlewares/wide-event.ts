import { NextFunction, Request, Response } from "express";
import { getRequestContext } from "../config/request-context";
import { logger } from "../config/logger";
import ApiError from "../utils/api-error";
import { randomUUID } from "node:crypto";

export const wideEventMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const ctx = getRequestContext();
  const startTime = Date.now();

  const event: Record<string, unknown> = {
    request_id: req.headers["x-request-id"]?.toString() ?? randomUUID(),
    timestamp: new Date().toISOString(),
    method: req.method,
    path: req.path,
  };

  ctx.set("wideEvent", event);

  // Hook into response finish event
  res.on("finish", () => {
    event.status_code = res.statusCode;
    event.outcome = res.statusCode < 400 ? "success" : "error";
    event.duration_ms = Date.now() - startTime;
    logger.info(event);
  });

  // Hook into response error
  res.on("error", (error) => {
    event.outcome = "error";
    event.error = {
      type: error.name,
      message: error.message,
    };
  });

  try {
    next();
  } catch (error) {
    if (error instanceof ApiError) {
      event.error = {
        type: error.name,
        message: error.message,
        code: error.code,
      };
    }
    throw error;
  }
};
