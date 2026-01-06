import { Response, NextFunction } from "express";
import { adminAuth } from "../../utils/admin-auth";
import { fromNodeHeaders } from "better-auth/node";
import { AuthenticatedRequest } from "../../types";
import { getRequestContext } from "../../config/request-context";

export const adminAuthMiddleware =
  ({ optional = false }: { optional?: boolean }) =>
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const event = getRequestContext().get("wideEvent");
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

        event.admin = session.user;
      }

      next();
    } catch (error) {
      console.error("Admin authentication middleware error:", error);
      return res.status(500).json({
        status: "error",
        message: "Admin authentication verification failed",
      });
    }
  };
