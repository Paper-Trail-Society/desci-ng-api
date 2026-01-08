import { NextFunction, Request, Response } from "express";
import { getRequestContext } from "../config/request-context";
import { logger } from "../config/logger";

export const wideEventMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const ctx = getRequestContext();
  logger.trace(
    { entries: getRequestContext().get("wideEvent") },
    "getRequestContext called in [wideEventMiddleware]",
  );

  const startTime = Date.now();

  const event: Record<string, unknown> = {
    request_id: req.log.bindings().req.id,
    timestamp: new Date().toISOString(),
    method: req.method,
    path: req.path,
  };

  if (!ctx.get("wideEvent")) {
    ctx.set("wideEvent", event);
  }

  // Hook into response finish event
  res.on("finish", () => {
    event.status_code = res.statusCode;
    event.outcome = res.statusCode < 400 ? "success" : "error";
    event.duration_ms = Date.now() - startTime;

    // Attach any error caught by global error handler
    if ((res as any).locals.error) {
      event.error = (res as any).locals.error;
    }

    logger.info(event);
  });

  await next();
};
