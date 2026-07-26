import { apiClient } from "../apiClient";

interface HealthResponse {
  status: string;
  dependencies: {
    database: string;
    redis: string;
    db_pool: Record<string, unknown>;
  };
}

export const rootService = {
  metrics: () => apiClient.get<string>("/metrics"),
  health: () => apiClient.get<HealthResponse>("/health"),
};
