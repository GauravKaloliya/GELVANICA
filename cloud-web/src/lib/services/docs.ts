import { apiClient } from "../apiClient";

interface DocsResponse { data: Record<string, unknown>; }

export const docsService = {
  getDocs: () =>
    apiClient.get<DocsResponse>("/docs/"),
};
