import { Request, Response, NextFunction } from "express";
import { Prisma } from "@prisma/client";

export interface AppError extends Error {
  statusCode?: number;
}

/**
 * Central error handling middleware.
 * Must be registered LAST with app.use().
 */
export const errorHandler = (
  err: AppError,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  // Prisma known errors
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    switch (err.code) {
      case "P2002": // Unique constraint violation
        res.status(409).json({
          status: "error",
          message: "A record with these values already exists",
          code: err.code,
        });
        return;
      case "P2025": // Record not found
        res.status(404).json({
          status: "error",
          message: "Record not found",
          code: err.code,
        });
        return;
      case "P2003": // Foreign key constraint failure
        res.status(400).json({
          status: "error",
          message: "Related record does not exist",
          code: err.code,
        });
        return;
    }
  }

  // Prisma connection error
  if (err instanceof Prisma.PrismaClientInitializationError) {
    console.error("❌ Database connection failed:", err.message);
    res.status(503).json({
      status: "error",
      message: "Database connection unavailable. Check DATABASE_URL in .env",
    });
    return;
  }

  // Custom application errors with status codes
  const statusCode = err.statusCode ?? 500;
  const message =
    statusCode === 500 && process.env.NODE_ENV === "production"
      ? "Internal server error"
      : err.message ?? "Internal server error";

  if (statusCode === 500) {
    console.error("💥 Unhandled error:", err);
  }

  res.status(statusCode).json({ status: "error", message });
};

/**
 * 404 handler for unmatched routes.
 */
export const notFoundHandler = (_req: Request, res: Response): void => {
  res.status(404).json({ status: "error", message: "Route not found" });
};
