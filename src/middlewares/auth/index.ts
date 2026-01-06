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

/**
 * Optional authentication middleware
 * Checks for a session but doesn't require it
 * Attaches user and session to request if available
 */
export const optionalAuth = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const session = await auth.api.getSession({
      headers: fromNodeHeaders(req.headers),
    });

    if (session) {
      req.user = session.user;
      req.session = session.session;
    }

    next();
  } catch (error) {
    console.error("Optional auth middleware error:", error);
    // Continue without authentication
    next();
  }
};

/**
 * Middleware to log authentication details for debugging
 * Useful for troubleshooting authentication issues
 * @deprecated
 */
export const authLogger = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const headers = fromNodeHeaders(req.headers);
    const authHeader = headers.get("authorization");
    const cookieHeader = headers.get("cookie");

    console.log("[Auth Logger] Request to:", req.path);
    console.log("[Auth Logger] Method:", req.method);
    console.log(
      "[Auth Logger] Auth Header:",
      authHeader ? "Present" : "Not present",
    );
    console.log(
      "[Auth Logger] Cookie Header:",
      cookieHeader ? "Present" : "Not present",
    );

    const session = await auth.api.getSession({
      headers: headers,
    });

    if (session) {
      console.log("[Auth Logger] Session found for user:", session.user.email);
      console.log("[Auth Logger] User ID:", session.user.id);
      console.log(
        "[Auth Logger] Session expires at:",
        session.session.expiresAt,
      );
    } else {
      console.log("[Auth Logger] No session found");
    }

    next();
  } catch (error) {
    console.error("[Auth Logger] Error checking session:", error);
    next();
  }
};
