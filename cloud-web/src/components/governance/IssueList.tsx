"use client";
import IssueCard, { IssueCategory } from "./IssueCard";
import { cn } from "@/lib/utils";
import { Shield, AlertCircle } from "lucide-react";

interface IssueListProps {
  workspaceId: string;
  className?: string;
  limit?: number;
  showHeader?: boolean;
}

export default function IssueList({ workspaceId, className, limit, showHeader = true }: IssueListProps) {
  // In a real implementation, this would fetch from governanceService
  // For now, show a placeholder with the proper structure
  const issues: Array<{ category: IssueCategory; title: string; description?: string; entityTitle?: string; entityId?: string }> = [];

  return (
    <div className={cn("space-y-3", className)}>
      {showHeader && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-muted" />
            <h3 className="text-sm font-semibold text-white">Issues</h3>
          </div>
          <span className="text-[11px] text-muted">{issues.length} found</span>
        </div>
      )}
      {issues.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border-border py-8 text-center">
          <AlertCircle className="mb-2 h-6 w-6 text-muted" />
          <p className="text-sm text-muted">No issues found</p>
          <p className="text-xs text-muted mt-1">
            Your workspace governance is healthy
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {(limit ? issues.slice(0, limit) : issues).map((issue, i) => (
            <IssueCard key={i} {...issue} />
          ))}
        </div>
      )}
    </div>
  );
}
