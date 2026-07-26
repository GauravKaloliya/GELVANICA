"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { configService } from "@/lib/services/configService";
import { Filter, X } from "lucide-react";

interface GraphFiltersProps {
  depth: number;
  onDepthChange: (depth: number) => void;
  relationTypes: string[];
  onRelationTypesChange: (types: string[]) => void;
  nodeTypeFilter?: string[];
  onNodeTypeFilterChange?: (types: string[]) => void;
  entityTypes?: Array<{ id: string; name: string }>;
  workspaceId: string;
  className?: string;
}

export default function GraphFilters({
  depth, onDepthChange,
  relationTypes, onRelationTypesChange,
  nodeTypeFilter = [], onNodeTypeFilterChange,
  entityTypes = [],
  workspaceId,
  className,
}: GraphFiltersProps) {
  const [open, setOpen] = useState(false);
  const [availableRelationTypes, setAvailableRelationTypes] = useState<string[]>([]);

  useEffect(() => {
    configService.get(workspaceId).then(c => setAvailableRelationTypes(c.relation_types ?? [])).catch(() => {});
  }, [workspaceId]);

  const toggleRelation = (r: string) => {
    onRelationTypesChange(
      relationTypes.includes(r) ? relationTypes.filter((x) => x !== r) : [...relationTypes, r]
    );
  };

  const toggleNodeType = (t: string) => {
    onNodeTypeFilterChange?.(
      nodeTypeFilter.includes(t) ? nodeTypeFilter.filter((x) => x !== t) : [...nodeTypeFilter, t]
    );
  };

  const hasFilters = relationTypes.length > 0 || nodeTypeFilter.length > 0;

  return (
    <div className={cn("relative", className)}>
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
          open || hasFilters ? "bg-card text-foreground" : "bg-surface text-muted hover:text-foreground"
        )}
      >
        <Filter className="h-3.5 w-3.5" />
        Filters
        {hasFilters && (
          <span className="ml-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-black/20 text-[10px]">
            {relationTypes.length + nodeTypeFilter.length}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-72 rounded-xl border border-border bg-card p-4 neo-depth-zinc">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-foreground">Filters</h3>
            <button onClick={() => setOpen(false)} className="text-muted hover:text-foreground" aria-label="Close filters">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label htmlFor="graph-depth" className="text-xs text-muted mb-2 block">Depth: {depth}</label>
              <input
                id="graph-depth"
                type="range"
                min={1}
                max={5}
                value={depth}
                onChange={(e) => onDepthChange(Number(e.target.value))}
                className="w-full accent-white"
              />
            </div>

            <div>
              <label htmlFor="graph-relation-types" className="text-xs text-muted mb-2 block">Relation Types</label>
              <div className="flex flex-wrap gap-1.5">
                {availableRelationTypes.map((r) => (
                  <button
                    key={r}
                    onClick={() => toggleRelation(r)}
                    className={cn(
                      "rounded-md px-2 py-1 text-[10px] font-medium transition-colors",
                      relationTypes.includes(r)
                        ? "bg-card text-foreground"
                        : "bg-surface text-muted hover:text-foreground"
                    )}
                  >
                    {r.replace(/_/g, " ")}
                  </button>
                ))}
              </div>
            </div>

            {entityTypes.length > 0 && (
              <div>
                <label htmlFor="graph-node-types" className="text-xs text-muted mb-2 block">Node Types</label>
                <div className="flex flex-wrap gap-1.5">
                  {entityTypes.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => toggleNodeType(t.name)}
                      className={cn(
                        "rounded-md px-2 py-1 text-[10px] font-medium transition-colors capitalize",
                        nodeTypeFilter.includes(t.name)
                          ? "bg-card text-foreground"
                          : "bg-surface text-muted hover:text-foreground"
                      )}
                    >
                      {t.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
