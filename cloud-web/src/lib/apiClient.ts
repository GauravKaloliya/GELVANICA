import { API_BASE } from "@/lib/config/constants";
import { useAuthStore } from "@/stores/authStore";

interface RequestOptions extends Omit<RequestInit, "headers"> {
  token?: string;
  timeout?: number;
  headers?: Record<string, string>;
  retries?: number;
}

class ApiError extends Error {
  status: number;
  code?: string;
  details?: Record<string, unknown>;

  constructor(message: string, status: number, code?: string, details?: Record<string, unknown>) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

const AUTH_ENDPOINTS = ["/auth/login", "/auth/register", "/auth/refresh", "/auth/logout", "/auth/forgot-password", "/auth/reset-password"];

function isAuthEndpoint(endpoint: string): boolean {
  return AUTH_ENDPOINTS.some((p) => endpoint.startsWith(p));
}

let isRefreshing = false;

const inflightRequests = new Map<string, Promise<unknown>>();

function getDedupeKey(method: string, endpoint: string): string | null {
  if (method !== "GET" && method !== "HEAD") return null;
  return `${method}:${endpoint}`;
}

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const { token, timeout = 30000, retries = 2, ...fetchOptions } = options;
  const method = fetchOptions.method || "GET";
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  const resolvedToken = token || (() => {
    try { return useAuthStore.getState().tokens?.access_token; } catch { return undefined; }
  })();

  if (resolvedToken) {
    headers["Authorization"] = `Bearer ${resolvedToken}`;
  }

  const dedupeKey = getDedupeKey(method, endpoint);

  if (dedupeKey && inflightRequests.has(dedupeKey)) {
    return inflightRequests.get(dedupeKey) as Promise<T>;
  }

  const executeRequest = async (): Promise<T> => {
    let lastError: Error | null = null;
    for (let attempt = 0; attempt <= retries; attempt++) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      try {
        let res = await fetch(`${API_BASE}${endpoint}`, {
          ...fetchOptions,
          headers,
          signal: controller.signal,
        });

        if (res.status === 401 && !isAuthEndpoint(endpoint) && !isRefreshing) {
          isRefreshing = true;
          try {
            const { tokens, refreshAccessToken } = useAuthStore.getState();
            if (tokens?.refresh_token) {
              const newToken = await refreshAccessToken();
              if (newToken) {
                const { tokens: refreshedTokens } = useAuthStore.getState();
                headers["Authorization"] = `Bearer ${refreshedTokens?.access_token}`;
                res = await fetch(`${API_BASE}${endpoint}`, {
                  ...fetchOptions,
                  headers,
                  signal: controller.signal,
                });
              }
            }
          } catch {
            useAuthStore.getState().logout();
          } finally {
            isRefreshing = false;
          }
        }

        if (!res.ok) {
          if (res.status >= 500 && attempt < retries) {
            await sleep(Math.pow(2, attempt) * 500);
            continue;
          }
          const body = await res.json().catch(() => ({ error: { message: `HTTP ${res.status}` } }));
          throw new ApiError(
            body.error?.message || `HTTP ${res.status}`,
            res.status,
            body.error?.code,
            body.error?.details
          );
        }

        return res.json();
      } catch (err) {
        lastError = err as Error;
        if (err instanceof ApiError) throw err;
        if (attempt < retries && (err as Error).name === "AbortError") {
          await sleep(Math.pow(2, attempt) * 500);
          continue;
        }
        throw err;
      } finally {
        clearTimeout(timeoutId);
      }
    }
    throw lastError || new Error("Request failed");
  };

  const promise = executeRequest();
  if (dedupeKey) {
    inflightRequests.set(dedupeKey, promise);
    promise.finally(() => inflightRequests.delete(dedupeKey));
  }
  return promise;
}

async function requestBlob(endpoint: string, options: RequestOptions = {}): Promise<Blob> {
  const { token, timeout = 60000, retries = 2, ...fetchOptions } = options;
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };

  const resolvedToken = token || (() => {
    try { return useAuthStore.getState().tokens?.access_token; } catch { return undefined; }
  })();

  if (resolvedToken) {
    headers["Authorization"] = `Bearer ${resolvedToken}`;
  }

  let lastError: Error | null = null;
  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      let res = await fetch(`${API_BASE}${endpoint}`, {
        ...fetchOptions,
        headers,
        signal: controller.signal,
      });

      if (res.status === 401 && !isAuthEndpoint(endpoint) && !isRefreshing) {
        isRefreshing = true;
        try {
          const { tokens, refreshAccessToken } = useAuthStore.getState();
          if (tokens?.refresh_token) {
            const newToken = await refreshAccessToken();
            if (newToken) {
              const { tokens: refreshedTokens } = useAuthStore.getState();
              headers["Authorization"] = `Bearer ${refreshedTokens?.access_token}`;
              res = await fetch(`${API_BASE}${endpoint}`, {
                ...fetchOptions,
                headers,
                signal: controller.signal,
              });
            }
          }
        } catch {
          useAuthStore.getState().logout();
        } finally {
          isRefreshing = false;
        }
      }

      if (!res.ok) {
        if (res.status >= 500 && attempt < retries) {
          await sleep(Math.pow(2, attempt) * 500);
          continue;
        }
        const body = await res.json().catch(() => ({ error: { message: `HTTP ${res.status}` } }));
        throw new ApiError(
          body.error?.message || `HTTP ${res.status}`,
          res.status,
          body.error?.code
        );
      }

      return res.blob();
    } catch (err) {
      lastError = err as Error;
      if (err instanceof ApiError) throw err;
      if (attempt < retries) {
        await sleep(Math.pow(2, attempt) * 500);
        continue;
      }
      throw err;
    } finally {
      clearTimeout(timeoutId);
    }
  }
  throw lastError || new Error("Blob request failed");
}

async function requestFormData<T>(endpoint: string, formData: FormData, token?: string, timeout = 60000): Promise<T> {
  const headers: Record<string, string> = {};
  const resolvedToken = token || (() => {
    try { return useAuthStore.getState().tokens?.access_token; } catch { return undefined; }
  })();
  if (resolvedToken) {
    headers["Authorization"] = `Bearer ${resolvedToken}`;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const res = await fetch(`${API_BASE}${endpoint}`, {
      method: "POST",
      headers,
      body: formData,
      signal: controller.signal,
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({ error: { message: `HTTP ${res.status}` } }));
      throw new ApiError(body.error?.message || `HTTP ${res.status}`, res.status);
    }

    return res.json();
  } finally {
    clearTimeout(timeoutId);
  }
}

export const apiClient = {
  get: <T>(endpoint: string, token?: string, opts?: Omit<RequestOptions, "method" | "token">) =>
    request<T>(endpoint, { ...opts, method: "GET", token }),

  post: <T>(endpoint: string, body?: unknown, token?: string, opts?: Omit<RequestOptions, "method" | "body" | "token">) =>
    request<T>(endpoint, { ...opts, method: "POST", body: body ? JSON.stringify(body) : undefined, token }),

  patch: <T>(endpoint: string, body?: unknown, token?: string, opts?: Omit<RequestOptions, "method" | "body" | "token">) =>
    request<T>(endpoint, { ...opts, method: "PATCH", body: body ? JSON.stringify(body) : undefined, token }),

  put: <T>(endpoint: string, body?: unknown, token?: string, opts?: Omit<RequestOptions, "method" | "body" | "token">) =>
    request<T>(endpoint, { ...opts, method: "PUT", body: body ? JSON.stringify(body) : undefined, token }),

  delete: <T>(endpoint: string, token?: string, opts?: Omit<RequestOptions, "method" | "token">) =>
    request<T>(endpoint, { ...opts, method: "DELETE", token }),

  blob: (endpoint: string, body?: unknown, token?: string, opts?: Omit<RequestOptions, "method" | "body" | "token">) =>
    requestBlob(endpoint, { ...opts, method: "POST", body: body ? JSON.stringify(body) : undefined, token }),

  postFormData: <T>(endpoint: string, formData: FormData, token?: string) =>
    requestFormData<T>(endpoint, formData, token),
};

export { ApiError, request as rawRequest, requestBlob as rawRequestBlob };
export type { RequestOptions };
