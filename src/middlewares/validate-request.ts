import { ZodObject, ZodError } from "zod";
import { Request, Response, NextFunction } from "express";

/**
 * Middleware to validate request data against a provided schema.
 *
 * @param {ZodObject} schema - The Zod schema to validate against.
 * @return {Function} The middleware function.
 */
export const validateRequest =
  (schema: ZodObject) => (req: Request, res: Response, next: NextFunction) => {
    try {
      schema.parse(req.body);
      next();
    } catch (err) {
        console.log(req.body)
      if (err instanceof ZodError) {
        const formattedErrors = err.issues.map((issue) => ({
          path: issue.path.join("."),
          message: issue.message,
        }));

        return res.status(400).json({
          errors: formattedErrors,
        });
      }

      next(err); // Pass unknown errors to default error handler
    }
  };
