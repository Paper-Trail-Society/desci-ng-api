import { Request, Response, NextFunction } from "express";
import { adminAuth } from "../../utils/admin-auth";
import { fromNodeHeaders } from "better-auth/node";

export interface AuthenticatedAdminRequest extends Request {
  admin?: typeof adminAuth.$Infer.Session.user;
  session?: typeof adminAuth.$Infer.Session.session;
}

/**
 * Middleware to protect routes with authentication
 * Checks for a valid session and attaches user and session to the request
 */
export const adminAuthMiddleware =
  ({ optional = false }: { optional?: boolean }) =>
  async (req: AuthenticatedAdminRequest, res: Response, next: NextFunction) => {
    try {
      const session = await adminAuth.api.getSession({
        headers: fromNodeHeaders(req.headers),
      });

      if (!session && !optional) {
        return res.status(401).json({
          status: "error",
          message: "Admin authentication required. Please sign in to continue.",
        });
      }

      if (session) {
        // Attach session and user to request for use in route handlers
        req.admin = session.user;
        req.session = session.session;
      }

      console.log({ session });

      next();
    } catch (error) {
      console.error("Admin authentication middleware error:", error);
      return res.status(500).json({
        status: "error",
        message: "Admin authentication verification failed",
      });
    }
  };
