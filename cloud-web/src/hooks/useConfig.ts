import { useState, useEffect } from "react";
import { configService, type WorkspaceConfig } from "@/lib/services/configService";

export function useConfig(workspaceId: string) {
  const [config, setConfig] = useState<WorkspaceConfig | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!workspaceId) return;
    setLoading(true);
    configService.get(workspaceId)
      .then(setConfig)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [workspaceId]);

  return { config, loading };
}
