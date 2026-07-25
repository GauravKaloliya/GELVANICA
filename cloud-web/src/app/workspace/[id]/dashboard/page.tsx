"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { useAuthStore } from "@/stores/authStore";
import { useQuery } from "@tanstack/react-query";
import { dashboardService } from "@/lib/services/dashboardService";
import {
  FileText,
  Link2,
  MessageSquare,
  Archive,
  Users,
} from "lucide-react";
import { StatsCard } from "@/components/dashboard/StatsCards";
import QuickActions from "@/components/dashboard/QuickActions";
import ActivityFeed from "@/components/dashboard/ActivityFeed";
import WelcomeHero from "@/components/dashboard/WelcomeHero";
import GovernanceHealth from "@/components/dashboard/GovernanceHealth";
import { RecentEntities } from "@/components/dashboard/RecentEntities";

export default function DashboardPage() {
  const params = useParams();
  const { tokens } = useAuthStore();
  const workspaceId = params.id as string;

  const { data: overview } = useQuery<{ entity_count: number; relation_count: number; comment_count: number; archived_count: number; member_count: number } | null>({
    queryKey: ["dashboard-overview", workspaceId],
    queryFn: async () => {
      try {
        const json = await dashboardService.getOverview(workspaceId);
        return json.data ?? null;
      } catch {
        return null;
      }
    },
    enabled: !!tokens?.access_token && !!workspaceId,
  });

  const stats = overview;

  const statCards = [
    { label: "Entities", value: stats?.entity_count ?? 0, icon: FileText, color: "text-blue-400" },
    { label: "Relations", value: stats?.relation_count ?? 0, icon: Link2, color: "text-purple-400" },
    { label: "Comments", value: stats?.comment_count ?? 0, icon: MessageSquare, color: "text-green-400" },
    { label: "Archived", value: stats?.archived_count ?? 0, icon: Archive, color: "text-amber-400" },
    { label: "Members", value: stats?.member_count ?? 0, icon: Users, color: "text-cyan-400" },
  ];

  return (
    <div className="p-6 space-y-8">
      <WelcomeHero workspaceId={workspaceId} stats={stats ? { entity_count: stats.entity_count, member_count: stats.member_count } : null} />

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {statCards.map(({ label, value, icon, color }) => (
          <StatsCard key={label} label={label} value={value} icon={icon} color={color} />
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Entities */}
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold text-white">Recent Entities</h2>
            <Link
              href={`/workspace/${workspaceId}/search`}
              className="text-xs text-zinc-400 hover:text-white"
            >
              View all
            </Link>
          </div>
          <RecentEntities workspaceId={workspaceId} />
        </div>

        {/* Activity Feed */}
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-5">
          <h2 className="mb-4 font-semibold text-white">Recent Activity</h2>
          <ActivityFeed workspaceId={workspaceId} limit={15} />
        </div>
      </div>

      {/* Quick Create */}
      <QuickActions workspaceId={workspaceId} />

      {/* Governance Health */}
      <div className="grid gap-6 lg:grid-cols-2">
        <GovernanceHealth workspaceId={workspaceId} />
      </div>
    </div>
  );
}
