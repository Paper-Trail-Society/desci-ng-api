import { NextFunction, Request, Response } from "express";
import { getRequestContext } from "../config/request-context";
import { logger } from "../config/logger";

export const wideEventMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const ctx = new Map();

  const startTime = Date.now();

  ctx.set("request_id", req.log.bindings().req.id);
  ctx.set("timestamp", new Date().toISOString());
  ctx.set("method", req.method);
  ctx.set("path", req.path);

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
