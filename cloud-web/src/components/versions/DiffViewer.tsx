"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { ArrowLeftRight, Plus, Minus, Pencil, ChevronDown, ChevronRight } from "lucide-react";

interface DiffField {
  field: string;
  type: "added" | "removed" | "modified";
  snapshot?: Record<string, unknown>;
  before?: unknown;
  after?: unknown;
}

interface DiffViewerProps {
  leftLabel?: string;
  rightLabel?: string;
  fields: DiffField[];
  emptyMessage?: string;
  viewMode?: "unified" | "side-by-side";
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "string") return value || "—";
  if (typeof value === "object") return JSON.stringify(value, null, 2);
  return String(value);
}

function DiffFieldRow({ field }: { field: DiffField }) {
  const [expanded, setExpanded] = useState(true);
  const before = field.before;
  const after = field.after;
  const longContent =
    (typeof before === "string" && before.length > 120) ||
    (typeof after === "string" && after.length > 120) ||
    (typeof before === "object" && before !== null) ||
    (typeof after === "object" && after !== null);

  const Icon =
    field.type === "added" ? Plus :
    field.type === "removed" ? Minus :
    Pencil;

  const iconColor =
    field.type === "added" ? "text-green-400" :
    field.type === "removed" ? "text-red-400" :
    "text-amber-400";

  const bg =
    field.type === "added" ? "bg-green-500/5 border-green-500/20" :
    field.type === "removed" ? "bg-red-500/5 border-red-500/20" :
    "bg-amber-500/5 border-amber-500/20";

  return (
    <div className={cn("rounded-lg border", bg)}>
      <button
        onClick={() => longContent && setExpanded(!expanded)}
        className="flex w-full items-center gap-2 px-3 py-2 text-left"
      >
        <Icon className={cn("h-3.5 w-3.5 shrink-0", iconColor)} />
        <span className="flex-1 text-sm font-medium text-zinc-300">{field.field}</span>
        <span className="text-[10px] text-zinc-500 uppercase">{field.type}</span>
        {longContent && (
          expanded ?
            <ChevronDown className="h-3 w-3 text-zinc-500" /> :
            <ChevronRight className="h-3 w-3 text-zinc-500" />
        )}
      </button>
      {expanded && (
        <div className="grid grid-cols-2 gap-px border-t border-zinc-800">
          <div className="bg-zinc-900/50 p-3">
            <p className="mb-1 text-[10px] font-medium text-zinc-500 uppercase">Before</p>
            <pre className="whitespace-pre-wrap break-words text-xs text-zinc-400">
              {field.type === "added" ? "—" : formatValue(before)}
            </pre>
          </div>
          <div className="bg-zinc-900/50 p-3">
            <p className="mb-1 text-[10px] font-medium text-zinc-500 uppercase">After</p>
            <pre className="whitespace-pre-wrap break-words text-xs text-zinc-300">
              {field.type === "removed" ? "—" : formatValue(after)}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}

export default function DiffViewer({
  leftLabel = "Before",
  rightLabel = "After",
  fields,
  emptyMessage = "No differences found",
  viewMode = "unified",
}: DiffViewerProps) {
  const added = fields.filter((f) => f.type === "added").length;
  const removed = fields.filter((f) => f.type === "removed").length;
  const modified = fields.filter((f) => f.type === "modified").length;

  if (fields.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-zinc-800 py-12 text-center">
        <ArrowLeftRight className="mx-auto h-8 w-8 text-zinc-600" />
        <p className="mt-2 text-sm text-zinc-500">{emptyMessage}</p>
      </div>
    );
  }

  if (viewMode === "side-by-side") {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs text-zinc-500">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-green-400" />
              {added} added
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-red-400" />
              {removed} removed
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-amber-400" />
              {modified} modified
            </span>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <p className="text-xs font-medium text-zinc-400 uppercase">{leftLabel}</p>
            {fields.map((field, i) => (
              <div key={`left-${field.field}-${i}`} className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-3">
                <p className="mb-1 text-[10px] font-medium text-zinc-500 uppercase">{field.field}</p>
                <pre className="whitespace-pre-wrap break-words text-xs text-zinc-400">
                  {field.type === "added" ? "—" : formatValue(field.before)}
                </pre>
              </div>
            ))}
          </div>
          <div className="space-y-2">
            <p className="text-xs font-medium text-zinc-400 uppercase">{rightLabel}</p>
            {fields.map((field, i) => (
              <div key={`right-${field.field}-${i}`} className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-3">
                <p className="mb-1 text-[10px] font-medium text-zinc-500 uppercase">{field.field}</p>
                <pre className="whitespace-pre-wrap break-words text-xs text-zinc-300">
                  {field.type === "removed" ? "—" : formatValue(field.after)}
                </pre>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Legend */}
      <div className="flex items-center justify-between text-xs text-zinc-500">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-green-400" />
            {added} added
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-red-400" />
            {removed} removed
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-amber-400" />
            {modified} modified
          </span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-zinc-600">{leftLabel}</span>
          <span className="text-zinc-600">{rightLabel}</span>
        </div>
      </div>

      {/* Diff Fields */}
      <div className="space-y-2">
        {fields.map((field, i) => (
          <DiffFieldRow key={`${field.field}-${i}`} field={field} />
        ))}
      </div>
    </div>
  );
}
