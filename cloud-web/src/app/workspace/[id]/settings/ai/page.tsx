"use client";

import { useParams } from "next/navigation";
import { AISettings } from "@/components/settings/AISettings";

export default function AIConfigPage() {
  const params = useParams();
  const workspaceId = params.id as string;

  return (
    <div className="mx-auto max-w-3xl p-6 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">AI Configuration</h1>
        <p className="mt-1 text-sm text-zinc-500">Configure AI features and test queries</p>
      </div>
      <AISettings workspaceId={workspaceId} />
    </div>
  );
}
