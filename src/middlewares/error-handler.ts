import { Request, Response } from "express";

const ERROR_HANDLER_LOG_ORIGIN = "error-handler-middleware";
const errorHandler = (err: Error, req: Request, res: Response) => {
  res.locals.error = { type: err.name, message: err.message, stack: err.stack };
  req.log
    .child({ origin: ERROR_HANDLER_LOG_ORIGIN })
    .error(err, "Internal server error");
  return res.status(500).send({
    message: `Internal server error: ${err.message}`,
    stack: process.env.NODE_ENV === "production" ? null : err.stack,
  });
};

export default errorHandler;
