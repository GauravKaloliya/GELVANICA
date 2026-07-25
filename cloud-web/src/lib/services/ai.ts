import { apiClient } from "@/lib/apiClient";

interface AIQueryParams {
  workspaceId: string;
  question: string;
  limit?: number;
}

interface AIQueryResponse {
  data: {
    answer: string;
    sources: Array<{ title: string; content: string }>;
  };
}

interface SafetyCheck {
  allowed: boolean;
  reason?: string;
  sanitized?: string;
}

const BLOCKED_PATTERNS = [
  /delete\s+all/i,
  /drop\s+table/i,
  /admin\s+password/i,
  /api[_\s]?key/i,
  /secret/i,
  /private[_\s]?key/i,
];

const SENSITIVE_TERMS = [/password/i, /token/i, /secret/i, /api[_\s]?key/i, /credential/i];

function clientSafetyCheck(prompt: string): SafetyCheck {
  for (const pattern of BLOCKED_PATTERNS) {
    if (pattern.test(prompt)) {
      return { allowed: false, reason: "Prompt contains blocked content" };
    }
  }
  return { allowed: true };
}

function sanitizeResponse(answer: string): string {
  let sanitized = answer;
  for (const term of SENSITIVE_TERMS) {
    sanitized = sanitized.replace(term, "[REDACTED]");
  }
  return sanitized;
}

function sanitizeSources(sources: Array<{ title: string; content: string }>): Array<{ title: string; content: string }> {
  return sources.map((s) => ({
    title: s.title,
    content: sanitizeResponse(s.content),
  }));
}

export const aiService = {
  query: async (
    _token: string,
    { workspaceId, question, limit = 8 }: AIQueryParams
  ): Promise<{ answer: string; sources: Array<{ title: string; content: string }> }> => {
    const check = clientSafetyCheck(question);
    if (!check.allowed) {
      throw new Error(check.reason || "Query blocked by safety filter");
    }

    const res = await apiClient.post<AIQueryResponse>("/ai/query", {
      workspace_id: workspaceId,
      question,
      limit,
    });
    return {
      answer: sanitizeResponse(res.data.answer),
      sources: sanitizeSources(res.data.sources),
    };
  },

  summarize: async (_token: string, data: { entity_id: string; workspace_id: string }) => {
    const res = await apiClient.post<{ data: { summary: string } }>("/ai/summarize", data);
    return { summary: sanitizeResponse(res.data.summary) };
  },

  suggestRelations: async (_token: string, data: { entity_id: string; workspace_id: string }) => {
    const res = await apiClient.post<{ data: Array<{ target_entity_id: string; relation_type: string; confidence: number }> }>(
      "/ai/suggest-relations",
      data
    );
    return res.data;
  },

  safetyCheck: clientSafetyCheck,

  sanitizeResponse,

  queryStream: async function* (
    token: string,
    params: AIQueryParams
  ): AsyncGenerator<string> {
    const check = clientSafetyCheck(params.question);
    if (!check.allowed) {
      throw new Error(check.reason || "Query blocked by safety filter");
    }

    const { API_BASE } = await import("@/lib/config/constants");
    const res = await fetch(`${API_BASE}/ai/query`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        workspace_id: params.workspaceId,
        question: params.question,
        limit: params.limit ?? 8,
      }),
    });

    if (!res.ok) {
      throw new Error("AI request failed");
    }

    const reader = res.body?.getReader();
    if (!reader) return;

    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (line.startsWith("data: ")) {
          const data = line.slice(6);
          if (data === "[DONE]") return;
          try {
            const parsed = JSON.parse(data);
            if (parsed.answer) yield sanitizeResponse(parsed.answer);
          } catch {
            yield data;
          }
        }
      }
    }
  },
};
