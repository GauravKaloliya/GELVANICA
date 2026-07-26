"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { SlidersHorizontal, Calendar, Tag, FileType, ChevronDown, User, Link, Paperclip } from "lucide-react";
import { configService } from "@/lib/services/configService";

export interface SearchFilters {
  entityType: string;
  tagIds: string[];
  dateFrom: string;
  dateTo: string;
  matchType: "all" | "page" | "block";
  authorId: string;
  relationType: string;
  fileAttachment: boolean;
}

interface SearchFiltersProps {
  filters: SearchFilters;
  onChange: (filters: SearchFilters) => void;
  tags?: Array<{ id: string; name: string; color: string | null }>;
  entityTypes?: Array<{ id: string; name: string }>;
  workspaceId: string;
}

export default function SearchFiltersPanel({ filters, onChange, tags = [], entityTypes = [], workspaceId }: SearchFiltersProps) {
  const [open, setOpen] = useState(false);
  const [relationTypes, setRelationTypes] = useState<string[]>([]);

  useEffect(() => {
    configService.get(workspaceId).then(c => setRelationTypes(c.relation_types ?? [])).catch(() => {});
  }, [workspaceId]);
  const activeCount =
    (filters.entityType ? 1 : 0) +
    filters.tagIds.length +
    (filters.dateFrom ? 1 : 0) +
    (filters.dateTo ? 1 : 0) +
    (filters.matchType !== "all" ? 1 : 0) +
    (filters.authorId ? 1 : 0) +
    (filters.relationType ? 1 : 0) +
    (filters.fileAttachment ? 1 : 0);

  const updateFilter = <K extends keyof SearchFilters>(key: K, value: SearchFilters[K]) => {
    onChange({ ...filters, [key]: value });
  };

  const toggleTag = (tagId: string) => {
    const next = filters.tagIds.includes(tagId)
      ? filters.tagIds.filter((id) => id !== tagId)
      : [...filters.tagIds, tagId];
    updateFilter("tagIds", next);
  };

  const clearAll = () => {
    onChange({ entityType: "", tagIds: [], dateFrom: "", dateTo: "", matchType: "all", authorId: "", relationType: "", fileAttachment: false });
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          "flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors",
          activeCount > 0
            ? "border-blue-500/30 bg-blue-500/10 text-blue-400"
            : "border-border bg-surface text-muted hover:text-foreground"
        )}
      >
        <SlidersHorizontal className="h-3.5 w-3.5" />
        Filters
        {activeCount > 0 && (
          <span className="flex h-4 w-4 items-center justify-center rounded-full bg-blue-500 text-[10px] font-bold text-white">
            {activeCount}
          </span>
        )}
        <ChevronDown className={cn("h-3 w-3 transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div className="absolute left-0 top-full z-50 mt-2 w-80 rounded-xl border-border bg-card neo-depth-zinc p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-xs font-semibold text-foreground">Search Filters</h3>
            {activeCount > 0 && (
              <button onClick={clearAll} className="text-[11px] text-muted hover:text-foreground">
                Clear all
              </button>
            )}
          </div>

          <div className="space-y-4">
            {/* Match Type */}
            <div>
              <label htmlFor="search-filter-match-type" className="mb-1.5 flex items-center gap-1.5 text-[11px] font-medium text-muted">
                <FileType className="h-3 w-3" /> Match type
              </label>
              <div className="flex gap-1">
                {(["all", "page", "block"] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => updateFilter("matchType", t)}
                    className={cn(
                      "flex-1 rounded-md px-2 py-1.5 text-[11px] font-medium capitalize transition-colors",
                      filters.matchType === t
                        ? "bg-surface-2 text-foreground"
                        : "bg-surface text-muted hover:text-foreground"
                    )}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* Entity Type */}
            <div>
              <label htmlFor="search-filter-entity-type" className="mb-1.5 flex items-center gap-1.5 text-[11px] font-medium text-muted">
                <FileType className="h-3 w-3" /> Entity type
              </label>
              <select
                id="search-filter-entity-type"
                value={filters.entityType}
                onChange={(e) => updateFilter("entityType", e.target.value)}
                className="w-full rounded-md border-border bg-surface px-2.5 py-1.5 text-xs text-foreground outline-none"
              >
                <option value="">All types</option>
                {entityTypes.map((et) => (
                  <option key={et.id} value={et.id}>
                    {et.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Tags */}
            <div>
              <label htmlFor="search-filter-tags" className="mb-1.5 flex items-center gap-1.5 text-[11px] font-medium text-muted">
                <Tag className="h-3 w-3" /> Tags
              </label>
              <div className="flex flex-wrap gap-1.5">
                {tags.map((tag) => (
                  <button
                    key={tag.id}
                    onClick={() => toggleTag(tag.id)}
                    className={cn(
                      "flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors",
                      filters.tagIds.includes(tag.id)
                        ? "bg-accent text-foreground"
                        : "bg-surface text-muted hover:text-foreground"
                    )}
                  >
                    <div
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: tag.color || "#6b7280" }}
                    />
                    {tag.name}
                  </button>
                ))}
                {tags.length === 0 && (
                  <p className="text-[11px] text-muted">No tags available</p>
                )}
              </div>
            </div>

            {/* Date Range */}
            <div>
              <label htmlFor="search-filter-date-from" className="mb-1.5 flex items-center gap-1.5 text-[11px] font-medium text-muted">
                <Calendar className="h-3 w-3" /> Date range
              </label>
              <div className="flex gap-2">
                <input
                  id="search-filter-date-from"
                  type="date"
                  value={filters.dateFrom}
                  onChange={(e) => updateFilter("dateFrom", e.target.value)}
                  className="flex-1 rounded-md border-border bg-surface px-2.5 py-1.5 text-xs text-foreground outline-none"
                />
                <span className="self-center text-xs text-muted">to</span>
                <input
                  id="search-filter-date-to"
                  type="date"
                  value={filters.dateTo}
                  onChange={(e) => updateFilter("dateTo", e.target.value)}
                  className="flex-1 rounded-md border-border bg-surface px-2.5 py-1.5 text-xs text-foreground outline-none"
                />
              </div>
            </div>

            {/* Author */}
            <div>
              <label htmlFor="search-filter-author" className="mb-1.5 flex items-center gap-1.5 text-[11px] font-medium text-muted">
                <User className="h-3 w-3" /> Author ID
              </label>
              <input
                id="search-filter-author"
                type="text"
                value={filters.authorId}
                onChange={(e) => updateFilter("authorId", e.target.value)}
                placeholder="Filter by author..."
                className="w-full rounded-md border-border bg-surface px-2.5 py-1.5 text-xs text-foreground outline-none placeholder:text-muted"
              />
            </div>

            {/* Relation Type */}
            <div>
              <label htmlFor="search-filter-relation" className="mb-1.5 flex items-center gap-1.5 text-[11px] font-medium text-muted">
                <Link className="h-3 w-3" /> Relation type
              </label>
              <select
                id="search-filter-relation"
                value={filters.relationType}
                onChange={(e) => updateFilter("relationType", e.target.value)}
                className="w-full rounded-md border-border bg-surface px-2.5 py-1.5 text-xs text-foreground outline-none"
              >
                <option value="">All relations</option>
                {relationTypes.map((rt) => (
                  <option key={rt} value={rt}>
                    {rt}
                  </option>
                ))}
              </select>
            </div>

            {/* File Attachment */}
            <div className="flex items-center gap-2">
              <button
                role="checkbox"
                aria-checked={filters.fileAttachment}
                onClick={() => updateFilter("fileAttachment", !filters.fileAttachment)}
                className={cn(
                  "flex h-4 w-4 items-center justify-center rounded border transition-colors",
                  filters.fileAttachment
                    ? "border-blue-500 bg-blue-500 text-white"
                    : "border-border bg-surface"
                )}
              >
                {filters.fileAttachment && <span className="text-[10px] leading-none">&#10003;</span>}
              </button>
              <label className="flex items-center gap-1.5 text-[11px] font-medium text-muted">
                <Paperclip className="h-3 w-3" /> Has files
              </label>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
