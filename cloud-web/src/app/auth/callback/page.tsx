"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { apiClient } from "@/lib/apiClient";
import { useAuthStore } from "@/stores/authStore";
import type { User, AuthTokens } from "@/lib/types";
import { Skeleton } from "@/components/ui/Skeleton";

export default function AuthCallbackPage() {
  const searchParams = useSearchParams();
  const { login } = useAuthStore();
  const [error, setError] = useState("");

  useEffect(() => {
    const code = searchParams.get("code");
    const credential = searchParams.get("credential");

    if (!code && !credential) {
      setError("No authorization code received");
      return;
    }

    const handleCallback = async () => {
      try {
        const res = await apiClient.post<{ data: { access_token: string; refresh_token: string; token_type: string; expires_in: number; user: User } }>("/auth/google", { credential: credential || code });

        const tokens: AuthTokens = { access_token: res.data.access_token, refresh_token: res.data.refresh_token, token_type: res.data.token_type, expires_in: res.data.expires_in };
        login(res.data.user, tokens);
        window.location.href = "/app/workspaces";
      } catch {
        setError("Authentication failed. Redirecting to sign in...");
        setTimeout(() => window.location.href = "/app/auth/sign-in", 3000);
      }
    };

    handleCallback();
  }, [searchParams, login]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center space-y-4">
        {error ? (
          <p className="text-sm text-red-400">{error}</p>
        ) : (
          <>
            <Skeleton variant="circular" width={32} height={32} className="mx-auto" />
            <Skeleton className="mx-auto h-4 w-56" />
          </>
        )}
      </div>
    </div>
  );
}
