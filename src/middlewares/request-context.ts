import { randomUUID } from "node:crypto";
import { Request, Response, NextFunction } from "express";
import { requestContext } from "../config/request-context";

export function requestContextMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction,
) {
  const context = new Map();
  requestContext.run(context, async () => {
    try {
      await next();
    } catch (err) {
      next(err);
    }
  });
}
