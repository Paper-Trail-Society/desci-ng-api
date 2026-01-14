import { Response, NextFunction, Request } from "express";
import { auth } from "../../utils/auth";
import { fromNodeHeaders } from "better-auth/node";

/**
 * Middleware to protect routes with authentication
 * Checks for a valid session and attaches user and session to the request
 */
export const authMiddleware =
  ({ optional = false }: { optional?: boolean }) =>
  async (req: Request, res: Response, next: NextFunction) => {
    const ctx = req.ctx;

    try {
      if (req.admin) {
        next();
        return;
      }

      const session = await auth.api.getSession({
        headers: fromNodeHeaders(req.headers),
      });

      if (!session && !optional) {
        return res.status(401).json({
          status: "error",
          message: "Authentication required. Please sign in to continue.",
        });
      }

      if (session) {
        // Attach session and user to request for use in route handlers
        req.user = session.user;
        req.session = session.session;

        req.ctx.set("user", session.user);
      }

      next();
    } catch (error) {
      req.log.error(error, "Authentication middleware error:");
      return res.status(500).json({
        status: "error",
        message: "Authentication verification failed",
      });
    }
  };
