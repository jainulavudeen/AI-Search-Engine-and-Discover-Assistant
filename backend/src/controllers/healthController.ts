import { Request, Response } from "express";
import { HealthCheckResponse } from "../types";

/**
 * GET /api/health
 * Returns a simple health status for the backend service.
 */
export const healthCheck = (_req: Request, res: Response): void => {
  const response: HealthCheckResponse = {
    status: "ok",
    service: "AI Smart Search Backend",
    version: "1.0.0",
    environment: process.env.NODE_ENV ?? "development",
  };

  res.status(200).json(response);
};
