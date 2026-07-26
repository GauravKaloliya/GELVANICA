"use client";

import { useAuthStore } from "@/stores/authStore";
import { useWorkspaceStore } from "@/stores/workspaceStore";
import { Sparkles, ArrowRight } from "lucide-react";
import Link from "next/link";

interface WelcomeHeroProps {
  workspaceId: string;
  stats?: { entity_count: number; member_count: number } | null;
}

export default function WelcomeHero({ workspaceId, stats }: WelcomeHeroProps) {
  const { user } = useAuthStore();
  const { currentWorkspace } = useWorkspaceStore();
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const name = user?.name || user?.email?.split("@")[0] || "there";

  return (
    <div className="relative overflow-hidden rounded-xl border border-border bg-gradient-to-br from-card via-card to-surface p-6 hover-glow">
      <div className="absolute right-0 top-0 h-32 w-32 bg-gradient-to-br from-blue-500/10 to-purple-500/10 blur-3xl" />
      <div className="relative">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="h-4 w-4 text-blue-400" />
          <span className="text-step-1 font-medium text-blue-400">{currentWorkspace?.name || "Workspace"}</span>
        </div>
        <h1 className="text-xl font-bold text-foreground display-heading">
          {greeting}, {name}
        </h1>
        <p className="mt-1 text-step-3 text-muted">
          {stats
            ? `You have ${stats.entity_count} entities across ${stats.member_count} member${stats.member_count !== 1 ? "s" : ""}.`
            : "Welcome to your workspace."}
        </p>
        <div className="mt-4 flex gap-3">
          <Link
            href={`/workspace/${workspaceId}/search`}
            className="flex items-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 text-xs font-medium text-foreground hover:bg-accent/90 transition-colors"
          >
            Search
            <ArrowRight className="h-3 w-3" />
          </Link>
          <Link
            href={`/workspace/${workspaceId}/graph`}
            className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-surface transition-colors"
          >
            View Graph
          </Link>
        </div>
      </div>
    </div>
  );
}
