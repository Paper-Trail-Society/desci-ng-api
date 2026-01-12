import { NextFunction, Request, Response } from "express";

export const wideEventMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const ctx = new Map();

  ctx.set("timestamp", new Date().toISOString());

  req.ctx = ctx;

  next();
};
