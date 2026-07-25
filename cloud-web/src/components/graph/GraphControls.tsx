"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { TooltipWrapper } from "@/components/ui/Tooltip";
import {
  ZoomIn,
  ZoomOut,
  Maximize,
  Layout,
  ChevronDown,
} from "lucide-react";

interface GraphControlsProps {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFitView: () => void;
  onToggleLayout?: (layout: "force" | "hierarchical" | "circular") => void;
  currentLayout?: string;
  className?: string;
}

const LAYOUTS = [
  { value: "force" as const, label: "Force" },
  { value: "hierarchical" as const, label: "Hierarchical" },
  { value: "circular" as const, label: "Circular" },
];

export default function GraphControls({
  onZoomIn,
  onZoomOut,
  onFitView,
  onToggleLayout,
  currentLayout = "force",
  className,
}: GraphControlsProps) {
  const [layoutOpen, setLayoutOpen] = useState(false);

  return (
    <div
      className={cn(
        "absolute bottom-3 right-3 z-10 flex flex-col items-center gap-1",
        className
      )}
    >
      <div className="flex flex-col items-center gap-1 rounded-lg border border-zinc-800 bg-zinc-900/90 p-1 shadow-2xl backdrop-blur-sm">
        <TooltipWrapper content="Zoom in" side="left">
          <button
            onClick={onZoomIn}
            className="flex h-7 w-7 items-center justify-center rounded-md text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-white"
          >
            <ZoomIn size={14} strokeWidth={2.5} />
          </button>
        </TooltipWrapper>

        <TooltipWrapper content="Zoom out" side="left">
          <button
            onClick={onZoomOut}
            className="flex h-7 w-7 items-center justify-center rounded-md text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-white"
          >
            <ZoomOut size={14} strokeWidth={2.5} />
          </button>
        </TooltipWrapper>

        <TooltipWrapper content="Fit view" side="left">
          <button
            onClick={onFitView}
            className="flex h-7 w-7 items-center justify-center rounded-md text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-white"
          >
            <Maximize size={14} strokeWidth={2.5} />
          </button>
        </TooltipWrapper>

        {onToggleLayout && (
          <>
            <div className="my-0.5 h-px w-5 bg-zinc-800" />
            <div className="relative">
              <TooltipWrapper content="Layout" side="left">
                <button
                  onClick={() => setLayoutOpen(!layoutOpen)}
                  className="flex h-7 w-7 items-center justify-center rounded-md text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-white"
                >
                  <Layout size={14} strokeWidth={2.5} />
                  <ChevronDown
                    size={10}
                    className={cn(
                      "ml-0.5 transition-transform",
                      layoutOpen && "rotate-180"
                    )}
                  />
                </button>
              </TooltipWrapper>

              {layoutOpen && (
                <div className="absolute bottom-full left-full mb-0 ml-1 w-36 rounded-lg border border-zinc-800 bg-zinc-900 p-1 shadow-2xl">
                  {LAYOUTS.map((l) => (
                    <button
                      key={l.value}
                      onClick={() => {
                        onToggleLayout(l.value);
                        setLayoutOpen(false);
                      }}
                      className={cn(
                        "flex w-full items-center rounded-md px-2.5 py-1.5 text-xs transition-colors",
                        currentLayout === l.value
                          ? "bg-white font-medium text-black"
                          : "text-zinc-400 hover:bg-zinc-800 hover:text-white"
                      )}
                    >
                      {l.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
