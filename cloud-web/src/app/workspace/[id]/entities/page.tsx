"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useParams } from "next/navigation";
import { apiClient } from "@/lib/apiClient";
import type { Entity } from "@/lib/types";
import EntityGrid from "@/components/entities/EntityGrid";
import EntityList from "@/components/entities/EntityList";
import { EmptyState } from "@/components/ui/EmptyState";
import { BulkActionBar } from "@/components/shared/BulkActionBar";
import {
  Search,
  LayoutGrid,
  List,
  ArrowUpDown,
  Loader2,
  Layers,
  ChevronRight,
  CheckSquare,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useEditorStore } from "@/stores/editorStore";

type SortKey = "name" | "updated_at" | "created_at";
type ViewMode = "grid" | "list";

const PER_PAGE = 50;

export default function EntitiesPage() {
  const params = useParams();
  const workspaceId = params.id as string;
  const {
    selectedEntityIds,
    clearSelection,
    selectAll,
    handleEntityClick,
  } = useEditorStore();

  const [entities, setEntities] = useState<Entity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  const [view, setView] = useState<ViewMode>("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("updated_at");
  const [sortAsc, setSortAsc] = useState(false);

  const fetchEntities = useCallback(
    async (pageNum: number) => {
      setIsLoading(true);
      setError(null);
      try {
        const json = await apiClient.get<Entity[]>(
          `/workspaces/${workspaceId}/entities/?page=${pageNum}&per_page=${PER_PAGE}`
        );
        setEntities((prev) => (pageNum === 1 ? json : [...prev, ...json]));
        setHasMore(json.length >= PER_PAGE);
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setIsLoading(false);
      }
    },
    [workspaceId]
  );

  useEffect(() => {
    fetchEntities(1);
  }, [fetchEntities]);

  const filtered = useMemo(() => {
    let list = entities;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((e) => (e.name || "").toLowerCase().includes(q));
    }
    list = [...list].sort((a, b) => {
      const av = a[sortKey] ?? "";
      const bv = b[sortKey] ?? "";
      if (sortKey === "name") {
        return sortAsc
          ? String(av).localeCompare(String(bv))
          : String(bv).localeCompare(String(av));
      }
      return sortAsc
        ? new Date(String(av)).getTime() - new Date(String(bv)).getTime()
        : new Date(String(bv)).getTime() - new Date(String(av)).getTime();
    });
    return list;
  }, [entities, searchQuery, sortKey, sortAsc]);

  const allFilteredIds = useMemo(() => filtered.map((e) => e.id), [filtered]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortAsc((a) => !a);
    } else {
      setSortKey(key);
      setSortAsc(false);
    }
  };

  const handleToggleSelect = useCallback(
    (id: string, shiftKey: boolean, metaKey: boolean) => {
      handleEntityClick(id, allFilteredIds, shiftKey, metaKey);
    },
    [handleEntityClick, allFilteredIds]
  );

  const hasSelection = selectedEntityIds.length > 0;

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground display-heading">Entities</h1>
        <p className="mt-1 text-step-3 text-muted">Browse and manage all entities in this workspace</p>
      </div>

      {/* Toolbar */}
      <div className="mb-6 flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter by title..."
            className="w-full rounded-lg border border-border bg-card py-2 pl-9 pr-3 text-sm text-foreground placeholder:text-muted focus:border-accent focus:outline-none"
          />
        </div>

        {/* Select all / clear */}
        {filtered.length > 0 && (
          <button
            onClick={() => {
              if (hasSelection) {
                clearSelection();
              } else {
                selectAll(allFilteredIds);
              }
            }}
            className={cn(
              "flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition-colors",
              hasSelection
                ? "bg-card text-black"
                : "bg-surface text-muted hover:text-foreground"
            )}
          >
            <CheckSquare className="h-3.5 w-3.5" />
            {hasSelection ? "Clear" : "Select all"}
          </button>
        )}

        {/* Sort */}
        <div className="flex items-center gap-1">
          {(
            [
              ["name", "Name"],
              ["updated_at", "Updated"],
              ["created_at", "Created"],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              onClick={() => handleSort(key)}
              className={cn(
                "flex items-center gap-1 rounded-lg px-3 py-2 text-xs font-medium transition-colors",
                sortKey === key
                  ? "bg-card text-black"
                  : "bg-surface text-muted hover:text-foreground"
              )}
            >
              <ArrowUpDown className="h-3 w-3" />
              {label}
            </button>
          ))}
        </div>

        {/* View toggle */}
        <div className="flex items-center rounded-lg border border-border">
          <button
            onClick={() => setView("grid")}
            className={cn(
              "flex h-9 w-9 items-center justify-center rounded-l-lg transition-colors",
              view === "grid" ? "bg-surface-2 text-foreground" : "text-muted hover:text-foreground"
            )}
            aria-label="Grid view"
          >
            <LayoutGrid className="h-4 w-4" />
          </button>
          <button
            onClick={() => setView("list")}
            className={cn(
              "flex h-9 w-9 items-center justify-center rounded-r-lg transition-colors",
              view === "list" ? "bg-surface-2 text-foreground" : "text-muted hover:text-foreground"
            )}
            aria-label="List view"
          >
            <List className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* Loading skeleton */}
      {isLoading && entities.length === 0 && (
        <div className={cn(view === "grid" ? "grid gap-4 sm:grid-cols-2 lg:grid-cols-3" : "space-y-1")}>
          {Array.from({ length: 6 }).map((_, i) =>
            view === "grid" ? (
              <div key={i} className="h-40 animate-pulse rounded-lg border border-border bg-card" />
            ) : (
              <div key={i} className="h-12 animate-pulse rounded-md bg-card" />
            )
          )}
        </div>
      )}

      {/* Content */}
      {!isLoading || entities.length > 0 ? (
        view === "grid" ? (
          <EntityGrid
            entities={filtered}
            workspaceId={workspaceId}
            emptyMessage="No entities match your filter"
            selectedIds={selectedEntityIds}
            hasSelection={hasSelection}
            onToggleSelect={handleToggleSelect}
          />
        ) : (
          <EntityList
            entities={filtered}
            workspaceId={workspaceId}
            emptyMessage="No entities match your filter"
            selectedIds={selectedEntityIds}
            hasSelection={hasSelection}
            onToggleSelect={handleToggleSelect}
          />
        )
      ) : null}

      {/* Empty state */}
      {!isLoading && !error && entities.length === 0 && (
        <EmptyState
          icon={Layers}
          title="No entities yet"
          description="Create your first entity to get started"
          action={{
            label: "Create Entity",
            onClick: () => { window.location.href = `/workspace/${workspaceId}/entity/new`; },
          }}
        />
      )}

      {/* Load more */}
      {hasMore && !searchQuery && (
        <div className="mt-6 flex justify-center">
          <button
            onClick={() => {
              const next = page + 1;
              setPage(next);
              fetchEntities(next);
            }}
            disabled={isLoading}
            className="flex items-center gap-2 rounded-lg bg-surface px-4 py-2 text-sm text-foreground hover:bg-surface-2 disabled:opacity-50"
          >
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ChevronRight className="h-4 w-4" />}
            Load more
          </button>
        </div>
      )}

      {/* Bulk Action Bar */}
      <BulkActionBar
        selectedCount={selectedEntityIds.length}
        selectedIds={selectedEntityIds}
        onClearSelection={clearSelection}
        onRefresh={() => fetchEntities(1)}
      />
    </div>
  );
}
