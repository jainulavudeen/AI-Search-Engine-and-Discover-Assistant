export interface ApiResponse<T = unknown> {
  status: "ok" | "error";
  data?: T;
  message?: string;
  timestamp: string;
}

export interface HealthCheckResponse {
  status: "ok";
  service: string;
  version: string;
  environment: string;
}
