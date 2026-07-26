"use client";

import { cn } from "@/lib/utils";
import { X, ArrowRight, Network, Link2 } from "lucide-react";
import { useRouter } from "next/navigation";

interface GraphInfoPanelProps {
  nodeId: string;
  nodeLabel: string;
  nodeType?: string;
  nodeIcon?: string;
  workspaceId: string;
  edgeCount?: number;
  onClose: () => void;
  onTraverse?: (nodeId: string) => void;
  className?: string;
}

export default function GraphInfoPanel({
  nodeId, nodeLabel, nodeType, nodeIcon, workspaceId,
  edgeCount, onClose, onTraverse, className,
}: GraphInfoPanelProps) {
  const router = useRouter();

  return (
    <div className={cn("rounded-xl border border-border bg-card p-4 neo-depth-zinc", className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {nodeIcon && <span className="text-lg">{nodeIcon}</span>}
          <h3 className="text-sm font-semibold text-foreground">{nodeLabel}</h3>
        </div>
        <button onClick={onClose} className="rounded p-0.5 text-muted hover:text-foreground" aria-label="Close panel">
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="mt-3 space-y-2">
        {nodeType && (
          <div className="flex items-center gap-2 text-xs text-muted">
            <Network className="h-3 w-3 text-muted" />
            <span>Type: <span className="text-foreground">{nodeType}</span></span>
          </div>
        )}
        {edgeCount !== undefined && (
          <div className="flex items-center gap-2 text-xs text-muted">
            <Link2 className="h-3 w-3 text-muted" />
            <span>Connections: <span className="text-foreground">{edgeCount}</span></span>
          </div>
        )}
      </div>

      <div className="mt-4 flex gap-2">
        <button
          onClick={() => router.push(`/workspace/${workspaceId}/entity/${nodeId}`)}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-surface py-1.5 text-xs text-foreground hover:bg-surface-2"
        >
          Open <ArrowRight className="h-3 w-3" />
        </button>
        {onTraverse && (
          <button
            onClick={() => onTraverse(nodeId)}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-card py-1.5 text-xs font-medium text-foreground hover:opacity-90"
          >
            Traverse
          </button>
        )}
      </div>
    </div>
  );
}
