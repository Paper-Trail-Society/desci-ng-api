import { NextFunction, Request, Response } from "express";
import { logger } from "../config/logger";

const WIDE_EVENT_LOG_ORIGIN = "wide-event-middleware";
export const wideEventMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const ctx = new Map();

  const startTime = Date.now();

  ctx.set("origin", WIDE_EVENT_LOG_ORIGIN);
  ctx.set("request_id", req.log.bindings().req.id);
  ctx.set("timestamp", new Date().toISOString());
  ctx.set("method", req.method);
  ctx.set("path", req.path);
  ctx.set("ip", req.ip);

  req.ctx = ctx;

  // Hook into response finish event
  res.on("finish", () => {
    req.ctx.set("status_code", res.statusCode);
    req.ctx.set("outcome", res.statusCode < 400 ? "success" : "error");
    req.ctx.set("duration_ms", Date.now() - startTime);

    // Attach any error caught by global error handler
    if ((res as any).locals.error) {
      req.ctx.set("error", (res as any).locals.error);
    }
    logger.info(Object.fromEntries(ctx));
  });

  next();
};
