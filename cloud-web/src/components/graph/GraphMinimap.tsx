"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";

interface GraphMinimapProps {
  nodes: Array<{ id: string; type?: string; x?: number; y?: number }>;
  viewportX: number;
  viewportY: number;
  viewportWidth: number;
  viewportHeight: number;
  totalWidth: number;
  totalHeight: number;
  onNavigate?: (x: number, y: number) => void;
  className?: string;
}

const NODE_COLORS: Record<string, string> = {
  page: "#60a5fa",
  note: "#a78bfa",
  document: "#34d399",
  task: "#fbbf24",
  person: "#f87171",
  organization: "#fb923c",
  event: "#e879f9",
  concept: "#2dd4bf",
  resource: "#94a3b8",
};

const DEFAULT_COLOR = "#60a5fa";

const MINIMAP_W = 150;
const MINIMAP_H = 100;

export default function GraphMinimap({
  nodes,
  viewportX,
  viewportY,
  viewportWidth,
  viewportHeight,
  totalWidth,
  totalHeight,
  onNavigate,
  className,
}: GraphMinimapProps) {
  const scaledNodes = useMemo(() => {
    if (!totalWidth || !totalHeight) return [];
    return nodes.map((n) => ({
      ...n,
      sx: ((n.x ?? 0) / totalWidth) * MINIMAP_W,
      sy: ((n.y ?? 0) / totalHeight) * MINIMAP_H,
    }));
  }, [nodes, totalWidth, totalHeight]);

  const vpRect = useMemo(() => {
    if (!totalWidth || !totalHeight) return { x: 0, y: 0, w: MINIMAP_W, h: MINIMAP_H };
    return {
      x: (viewportX / totalWidth) * MINIMAP_W,
      y: (viewportY / totalHeight) * MINIMAP_H,
      w: (viewportWidth / totalWidth) * MINIMAP_W,
      h: (viewportHeight / totalHeight) * MINIMAP_H,
    };
  }, [viewportX, viewportY, viewportWidth, viewportHeight, totalWidth, totalHeight]);

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!onNavigate) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;
    onNavigate(
      (clickX / MINIMAP_W) * totalWidth,
      (clickY / MINIMAP_H) * totalHeight
    );
  };

  return (
    <div
      className={cn(
        "absolute bottom-3 left-3 z-10 overflow-hidden rounded-lg border border-zinc-800 bg-zinc-900/95 shadow-2xl",
        onNavigate && "cursor-crosshair",
        className
      )}
      style={{ width: MINIMAP_W, height: MINIMAP_H }}
      onClick={handleClick}
    >
      <svg width={MINIMAP_W} height={MINIMAP_H}>
        {scaledNodes.map((n) => (
          <circle
            key={n.id}
            cx={n.sx}
            cy={n.sy}
            r={2}
            fill={NODE_COLORS[n.type ?? ""] ?? DEFAULT_COLOR}
            opacity={0.8}
          />
        ))}

        <rect
          x={vpRect.x}
          y={vpRect.y}
          width={vpRect.w}
          height={vpRect.h}
          fill="rgba(255,255,255,0.06)"
          stroke="rgba(255,255,255,0.25)"
          strokeWidth={1}
          rx={2}
        />
      </svg>

      <div className="absolute bottom-0.5 right-1 font-mono text-[8px] text-zinc-600 select-none">
        {nodes.length}
      </div>
    </div>
  );
}
