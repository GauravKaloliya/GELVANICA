"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Search } from "lucide-react";
import { fuzzyFilter } from "@/components/ui/FuzzySearch";

interface CommandPaletteItem {
  id: string;
  label: string;
  description?: string;
  shortcut?: string;
  icon?: React.ReactNode;
  group?: string;
  disabled?: boolean;
  onSelect: () => void;
}

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  items: CommandPaletteItem[];
  placeholder?: string;
}

export function CommandPalette({ open, onClose, items, placeholder = "Type a command..." }: CommandPaletteProps) {
  const [query, setQuery] = React.useState("");
  const [selectedIndex, setSelectedIndex] = React.useState(0);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const listRef = React.useRef<HTMLDivElement>(null);
  const previousFocusRef = React.useRef<HTMLElement | null>(null);

  const filtered = React.useMemo(() => {
    if (!query) return items.filter((i) => !i.disabled);
    const results = fuzzyFilter(
      items.filter((i) => !i.disabled),
      query,
      (i) => `${i.label} ${i.description || ""} ${i.group || ""}`
    );
    return results.map((r) => r.item);
  }, [items, query]);

  const groups = React.useMemo(() => {
    const map = new Map<string, CommandPaletteItem[]>();
    filtered.forEach((item) => {
      const group = item.group || "Commands";
      if (!map.has(group)) map.set(group, []);
      map.get(group)!.push(item);
    });
    return map;
  }, [filtered]);

  const flatItems = React.useMemo(() => filtered, [filtered]);

  React.useEffect(() => {
    if (open) {
      previousFocusRef.current = document.activeElement as HTMLElement;
      setQuery("");
      setSelectedIndex(0);
      requestAnimationFrame(() => inputRef.current?.focus());
    } else {
      previousFocusRef.current?.focus();
    }
  }, [open]);

  React.useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  React.useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") { onClose(); return; }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((i) => Math.min(i + 1, flatItems.length - 1));
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((i) => Math.max(i - 1, 0));
      }
      if (e.key === "Enter" && flatItems[selectedIndex]) {
        e.preventDefault();
        flatItems[selectedIndex].onSelect();
        onClose();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, flatItems, selectedIndex, onClose]);

  React.useEffect(() => {
    if (!listRef.current) return;
    const selected = listRef.current.querySelector(`[data-index="${selectedIndex}"]`);
    selected?.scrollIntoView({ block: "nearest" });
  }, [selectedIndex]);

  if (!open) return null;

  let flatIndex = -1;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh]"
      aria-label="Command palette"
    >
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
      <div className="relative z-50 w-full max-w-xl overflow-hidden rounded-2xl border border-border bg-card neo-depth animate-in fade-in-0 zoom-in-95 duration-150">
        <div className="flex items-center gap-3 border-b border-border px-4 py-3">
          <Search className="h-5 w-5 shrink-0 text-muted" aria-hidden="true" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={placeholder}
            aria-label="Search commands"
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted outline-none"
          />
          <kbd className="hidden rounded-md border border-border px-1.5 py-0.5 text-[10px] text-muted sm:block">
            ESC
          </kbd>
        </div>

        <div ref={listRef} id="command-listbox" role="listbox" aria-label="Commands" className="max-h-80 overflow-y-auto p-1.5">
          {filtered.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-sm text-muted">No results found</p>
            </div>
          ) : (
            Array.from(groups.entries()).map(([group, groupItems]) => (
              <div key={group} role="group" aria-label={group}>
                <p className="px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted">
                  {group}
                </p>
                {groupItems.map((item) => {
                  flatIndex++;
                  const idx = flatIndex;
                  const isSelected = idx === selectedIndex;
                  return (
                    <button
                      key={item.id}
                      role="option"
                      aria-selected={isSelected}
                      data-index={idx}
                      id={`cmd-option-${item.id}`}
                      onClick={() => { item.onSelect(); onClose(); }}
                      onMouseEnter={() => setSelectedIndex(idx)}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left text-sm transition-colors",
                        isSelected ? "bg-surface text-foreground" : "text-muted hover:bg-surface"
                      )}
                    >
                      {item.icon && <span className="shrink-0 text-muted" aria-hidden="true">{item.icon}</span>}
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">{item.label}</p>
                        {item.description && (
                          <p className="truncate text-xs text-muted">{item.description}</p>
                        )}
                      </div>
                      {item.shortcut && (
                        <kbd className="shrink-0 rounded border border-border px-1.5 py-0.5 text-[10px] text-muted">
                          {item.shortcut}
                        </kbd>
                      )}
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>

        <div className="flex items-center justify-between border-t border-border px-4 py-2 text-[11px] text-muted">
          <span>{filtered.length} result{filtered.length !== 1 ? "s" : ""}</span>
          <div className="flex items-center gap-3">
            <span><kbd className="rounded border border-border px-1">&#8593;&#8595;</kbd> Navigate</span>
            <span><kbd className="rounded border border-border px-1">&#8629;</kbd> Select</span>
            <span><kbd className="rounded border border-border px-1">Esc</kbd> Close</span>
          </div>
        </div>
      </div>
    </div>
  );
}
