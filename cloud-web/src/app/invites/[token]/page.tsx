"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { apiClient } from "@/lib/apiClient";
import { useAuthStore } from "@/stores/authStore";
import { Loader2, CheckCircle, XCircle } from "lucide-react";

export default function InviteAcceptPage() {
  const params = useParams();
  const router = useRouter();
  const { tokens, isAuthenticated } = useAuthStore();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");

  const token = params.token as string;

  useEffect(() => {
    if (!isAuthenticated || !tokens?.access_token) {
      router.push(`/auth?redirect=/invites/${token}`);
      return;
    }

    const acceptInvite = async () => {
      try {
        const json = await apiClient.post<{ data?: { workspace_id?: string } }>(`/invites/${token}/accept`);
        const workspaceId = json.data?.workspace_id;
        setStatus("success");
        setMessage("Invite accepted! Redirecting to workspace...");
        setTimeout(() => {
          router.push(workspaceId ? `/workspace/${workspaceId}/dashboard` : "/workspaces");
        }, 2000);
      } catch {
        setStatus("error");
        setMessage("Failed to accept invite. The invite may have expired.");
      }
    };

    acceptInvite();
  }, [token, tokens, isAuthenticated, router]);

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-md text-center space-y-4">
        {status === "loading" && (
          <>
            <Loader2 className="mx-auto h-12 w-12 animate-spin text-zinc-400" />
            <p className="text-sm text-zinc-400">Accepting invitation...</p>
          </>
        )}
        {status === "success" && (
          <>
            <CheckCircle className="mx-auto h-12 w-12 text-green-400" />
            <p className="text-sm text-green-400">{message}</p>
          </>
        )}
        {status === "error" && (
          <>
            <XCircle className="mx-auto h-12 w-12 text-red-400" />
            <p className="text-sm text-red-400">{message}</p>
            <button
              onClick={() => router.push("/workspaces")}
              className="mt-4 rounded-lg bg-zinc-800 px-4 py-2 text-sm text-white hover:bg-zinc-700"
            >
              Go to Workspaces
            </button>
          </>
        )}
      </div>
    </div>
  );
}
