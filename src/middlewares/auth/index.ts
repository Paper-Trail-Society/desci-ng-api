import { Response, NextFunction } from "express";
import { auth } from "../../utils/auth";
import { fromNodeHeaders } from "better-auth/node";
import { AuthenticatedRequest } from "../../types";
import { getRequestContext } from "../../config/request-context";

/**
 * Middleware to protect routes with authentication
 * Checks for a valid session and attaches user and session to the request
 */
export const requireAuth = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  const event = getRequestContext().get("wideEvent");
  try {
    if (req.admin) {
      next();
      return;
    }

    const session = await auth.api.getSession({
      headers: fromNodeHeaders(req.headers),
    });

    if (!session) {
      return res.status(401).json({
        status: "error",
        message: "Authentication required. Please sign in to continue.",
      });
    }

    // Attach session and user to request for use in route handlers
    req.user = session.user;
    req.session = session.session;

    event.user = session.user;

    next();
  } catch (error) {
    console.error("Authentication middleware error:", error);
    return res.status(500).json({
      status: "error",
      message: "Authentication verification failed",
    });
  }
};
