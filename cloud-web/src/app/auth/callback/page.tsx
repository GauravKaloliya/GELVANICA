"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { apiClient } from "@/lib/apiClient";
import { useAuthStore } from "@/stores/authStore";
import type { User, AuthTokens } from "@/lib/types";
import { Skeleton } from "@/components/ui/Skeleton";

export default function AuthCallbackPage() {
  const router = useRouter();
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
        const json = await apiClient.post<{ data: { user: User; tokens: AuthTokens } }>("/auth/google", { credential: credential || code });

        login(json.data.user, json.data.tokens);
        router.push("/workspaces");
      } catch {
        setError("Authentication failed. Redirecting to sign in...");
        setTimeout(() => router.push("/auth/sign-in"), 3000);
      }
    };

    handleCallback();
  }, [searchParams, login, router]);

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
