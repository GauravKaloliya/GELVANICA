"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

export default function WorkspaceRedirectPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  useEffect(() => {
    document.title = 'Workspace | Gnovium'
  }, [])

  useEffect(() => {
    router.replace(`/workspace/${id}/dashboard`);
  }, [id, router]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-500 border-t-transparent" />
    </div>
  );
}
