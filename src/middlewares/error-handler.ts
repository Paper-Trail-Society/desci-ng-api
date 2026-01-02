import { logger } from "../config/logger";
import { NextFunction, Request, Response } from "express";

const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  req.log.child({ scope: "errorHandler" }).error(err, "Internal server error");
  return res.status(500).send({
    message: `Internal server error: ${err.message}`,
    stack: process.env.NODE_ENV === "production" ? null : err.stack,
  });
};

export default errorHandler;
