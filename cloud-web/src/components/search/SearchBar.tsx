"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { Search, X, Loader2 } from "lucide-react";

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  onSearch: () => void;
  isLoading?: boolean;
  placeholder?: string;
}

export function SearchBar({
  value,
  onChange,
  onSearch,
  isLoading = false,
  placeholder = "Search entities, blocks, content...",
}: SearchBarProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [localValue, setLocalValue] = useState(value);

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const debouncedOnChange = useCallback(
    (v: string) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => onChange(v), 300);
    },
    [onChange]
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value;
      setLocalValue(val);
      debouncedOnChange(val);
    },
    [debouncedOnChange]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault();
        onSearch();
      }
      if (e.key === "Escape") {
        setLocalValue("");
        onChange("");
        inputRef.current?.blur();
      }
    },
    [onSearch, onChange]
  );

  const handleClear = useCallback(() => {
    setLocalValue("");
    onChange("");
    inputRef.current?.focus();
  }, [onChange]);

  return (
    <div className="relative">
      <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted" />
      <input
        ref={inputRef}
        type="text"
        value={localValue}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className="w-full rounded-xl border-border bg-card py-3 pl-12 pr-12 text-sm text-foreground placeholder:text-muted focus:border-accent focus:outline-none"
      />
      {isLoading ? (
        <div className="absolute right-4 top-1/2 -translate-y-1/2">
          <Loader2 className="h-4 w-4 animate-spin text-muted" />
        </div>
      ) : (
        localValue && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-4 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted hover:text-foreground"
            aria-label="Clear search"
          >
            <X className="h-4 w-4" />
          </button>
        )
      )}
    </div>
  );
}
