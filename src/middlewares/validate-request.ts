import { ZodError, ZodObject } from "zod";
import { Request, Response, NextFunction } from "express";

/**
 * Middleware to validate request data against a provided schema.
 */
export const validateRequest =
  (
    inputType: "query" | "body",
    schema: ZodObject
  ) =>
  async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const inputTypeToValidationMap = {
        body: req.body,
        query: req.query,
      };
      await schema.parseAsync(inputTypeToValidationMap[inputType]);
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        const formattedErrors = err.format();
        return res.status(400).json({
          errors: formattedErrors,
        });
      }

      next(err); // Pass unknown errors to default error handler
    }
  };

