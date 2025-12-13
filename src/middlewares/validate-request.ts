import z, { ZodError, ZodObject } from "zod";
import { Request, Response, NextFunction } from "express";

/**
 * Middleware to validate request data against a provided schema.
 */
export const validateRequest =
  (inputSource: "query" | "body" | "params", schema: ZodObject<any>) =>
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const inputSourceToValidationMap = {
        params: req.params,
        body: req.body,
        query: req.query,
      };
      await schema.parseAsync(inputSourceToValidationMap[inputSource]);
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        const formattedErrors = z.treeifyError(err);
        return res.status(400).json(formattedErrors);
      }

      next(err); // Pass unknown errors to default error handler
    }
  };
