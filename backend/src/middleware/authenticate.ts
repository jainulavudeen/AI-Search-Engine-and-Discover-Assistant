import { Request, Response, NextFunction } from "express";
import { verifyToken, JwtPayload } from "../lib/jwt";

export interface AuthRequest extends Request {
  user?: JwtPayload;
}

/**
 * Validates Bearer token and attaches decoded payload to req.user.
 */
export const authenticate = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void => {
  const header = req.headers.authorization;

  if (!header?.startsWith("Bearer ")) {
    res
      .status(401)
      .json({ status: "error", message: "Authentication required" });
    return;
  }

  try {
    const token = header.slice(7);
    req.user = verifyToken(token);
    next();
  } catch {
    res
      .status(401)
      .json({ status: "error", message: "Invalid or expired token. Please log in again." });
  }
};

/**
 * Like `authenticate`, but never blocks the request.
 *
 * Used on endpoints (e.g. AI search) that must work for anonymous visitors
 * but should personalize results when a valid token is present. A missing
 * or invalid token is treated the same as "anonymous" — no 401 is thrown.
 */
export const optionalAuthenticate = (
  req: AuthRequest,
  _res: Response,
  next: NextFunction
): void => {
  const header = req.headers.authorization;

  if (header?.startsWith("Bearer ")) {
    try {
      req.user = verifyToken(header.slice(7));
    } catch {
      // Invalid/expired token — continue as anonymous rather than blocking the request
    }
  }

  next();
};

/**
 * Requires a valid, authenticated ADMIN user. Chain after `authenticate`
 * (so req.user is populated) — e.g. `router.use(authenticate, requireAdmin)`.
 *
 * A student's valid token is rejected with 403, not silently downgraded —
 * the frontend must never be the only thing standing between a student and
 * an admin action; this is the actual enforcement.
 *
 * Note: tokens issued before the admin-role feature shipped won't carry a
 * `role` claim and will be denied here until the user logs in again.
 */
export const requireAdmin = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void => {
  if (req.user?.role !== "ADMIN") {
    res.status(403).json({ status: "error", message: "Admin access required" });
    return;
  }
  next();
};
