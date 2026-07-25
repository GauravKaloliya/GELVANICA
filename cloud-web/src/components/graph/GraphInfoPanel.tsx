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
    <div className={cn("rounded-xl border border-zinc-800 bg-zinc-900 p-4 shadow-2xl", className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {nodeIcon && <span className="text-lg">{nodeIcon}</span>}
          <h3 className="text-sm font-semibold text-white">{nodeLabel}</h3>
        </div>
        <button onClick={onClose} className="rounded p-0.5 text-zinc-500 hover:text-white" aria-label="Close panel">
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="mt-3 space-y-2">
        {nodeType && (
          <div className="flex items-center gap-2 text-xs text-zinc-400">
            <Network className="h-3 w-3 text-zinc-500" />
            <span>Type: <span className="text-zinc-300">{nodeType}</span></span>
          </div>
        )}
        {edgeCount !== undefined && (
          <div className="flex items-center gap-2 text-xs text-zinc-400">
            <Link2 className="h-3 w-3 text-zinc-500" />
            <span>Connections: <span className="text-zinc-300">{edgeCount}</span></span>
          </div>
        )}
      </div>

      <div className="mt-4 flex gap-2">
        <button
          onClick={() => router.push(`/workspace/${workspaceId}/entity/${nodeId}`)}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-zinc-800 py-1.5 text-xs text-zinc-300 hover:bg-zinc-700"
        >
          Open <ArrowRight className="h-3 w-3" />
        </button>
        {onTraverse && (
          <button
            onClick={() => onTraverse(nodeId)}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-white py-1.5 text-xs font-medium text-black hover:bg-zinc-200"
          >
            Traverse
          </button>
        )}
      </div>
    </div>
  );
}
