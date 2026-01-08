import { NextFunction, Request, Response } from "express";

const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  res.locals.error = { type: err.name, message: err.message };
  req.log.error(err, "Internal server error");
  return res.status(500).send({
    message: `Internal server error: ${err.message}`,
    stack: process.env.NODE_ENV === "production" ? null : err.stack,
  });
};

export default errorHandler;
