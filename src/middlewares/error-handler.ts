import { NextFunction, Request, Response } from "express";
import ApiError from "../utils/api-error";

const ERROR_HANDLER_LOG_ORIGIN = "error-handler-middleware";
const errorHandler = (
  err: Error,
  req: Request,
res: Response,
  next: NextFunction,
) => {
  req.log
    .child({ origin: ERROR_HANDLER_LOG_ORIGIN })
    .error(err, "Internal server error");
  const responseCode = err instanceof ApiError ? err.code : 500;

  return res.status(responseCode).send({
    error: `Internal server error: ${err.message}`,
    stack: process.env.NODE_ENV === "production" ? null : err.stack,
  });
};

export default errorHandler;
