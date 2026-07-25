'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { Search, FileText, ArrowRight, X, Star, ExternalLink, Terminal, BookOpen } from 'lucide-react';
import founderImg from '@gnovium/shared/assets/images/founder.png';
import { ENDPOINTS, Endpoint } from '@/data';

interface SearchPaletteProps {
  onClose: () => void;
}

export default function SearchPalette({ onClose }: SearchPaletteProps) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const results = useMemo<Endpoint[]>(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    return ENDPOINTS.filter(
      (ep) =>
        ep.path.toLowerCase().includes(q) ||
        ep.summary.toLowerCase().includes(q) ||
        ep.module.toLowerCase().includes(q) ||
        ep.description.toLowerCase().includes(q)
    );
  }, [query]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    const totalItems = results.length + 1;

    if (e.key === 'Escape') {
      onClose();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % totalItems);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + totalItems) % totalItems);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedIndex === 0) {
        window.open('https://www.linkedin.com/in/gaurav-kaloliya-b44569417', '_blank');
        onClose();
      } else if (results[selectedIndex - 1]) {
        selectEndpoint(results[selectedIndex - 1].id);
      }
    }
  };

  const selectEndpoint = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    window.history.pushState(null, '', `?endpoint=${id}`);
    onClose();
  };

  const highlightMatch = (text: string) => {
    if (!query.trim()) return text;
    const idx = text.toLowerCase().indexOf(query.toLowerCase());
    if (idx === -1) return text;
    return (
      <>
        {text.slice(0, idx)}
        <span className="font-bold underline decoration-2 underline-offset-2">
          {text.slice(idx, idx + query.length)}
        </span>
        {text.slice(idx + query.length)}
      </>
    );
  };

  const methodBadge = (method: string) => {
    const cls = method === 'GET' ? 'method-get' : method === 'POST' ? 'method-post' : method === 'PATCH' ? 'method-patch' : 'method-delete';
    return `text-[11px] font-black px-2 py-0.5 border-2 ${cls} rounded-none`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[10vh] px-4" role="dialog" aria-label="Search API endpoints">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-[var(--background)]/80 backdrop-blur-sm"
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: -20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: -20 }}
        className="z-10 w-full max-w-2xl overflow-hidden rounded-none border-[3px] border-[var(--foreground)] bg-[var(--card-bg)] shadow-[8px_8px_0px_0px_var(--shadow-color)]"
      >
        {/* Input bar */}
        <div className="relative flex items-center border-b-2 border-[var(--border)] px-4">
          <Search className="h-5 w-5 text-[var(--muted)] stroke-[2.5]" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setSelectedIndex(0); }}
            onKeyDown={handleKeyDown}
            placeholder="Search endpoints, modules, descriptions..."
            className="h-12 w-full bg-transparent px-3 text-sm text-[var(--foreground)] outline-none focus:outline-none focus-visible:outline-none border-0 placeholder:text-[var(--muted)]/40 font-mono font-bold"
            aria-label="Search query"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="p-1 mr-1 hover:bg-[var(--code-bg)] border border-transparent hover:border-[var(--border)] transition-all cursor-pointer"
              aria-label="Clear search"
            >
              <X className="h-4 w-4 text-[var(--muted)]" />
            </button>
          )}
          <button
            onClick={onClose}
            className="p-1 hover:bg-[var(--code-bg)] border border-transparent hover:border-[var(--border)] transition-all cursor-pointer"
            aria-label="Close search"
          >
            <X className="h-5 w-5 text-[var(--muted)] hover:text-[var(--foreground)]" />
          </button>
        </div>

        {/* Results */}
        <div className="max-h-[460px] overflow-y-auto p-3 scrollbar-thin space-y-1.5">
          {/* Founder Card */}
          <button
            onClick={() => {
              window.open('https://www.linkedin.com/in/gaurav-kaloliya-b44569417', '_blank');
              onClose();
            }}
            onMouseEnter={() => setSelectedIndex(0)}
            className={`w-full flex items-center justify-between px-4 py-4 rounded-none text-left transition-all border-2 cursor-pointer ${
              selectedIndex === 0
                ? 'border-[var(--foreground)] bg-[var(--card-bg)] neo-depth'
                : 'border-transparent hover:border-[var(--border)] hover:bg-[var(--card-bg)]'
            }`}
            aria-label="Visit founder profile"
          >
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 border-[3px] border-[var(--foreground)] flex items-center justify-center bg-[var(--code-bg)] flex-shrink-0 overflow-hidden">
                <Image
                  src={founderImg}
                  alt="Gaurav Kaloliya"
                  width={56}
                  height={56}
                  className="object-cover w-full h-full"
                />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <span className="text-[10px] font-black font-mono uppercase tracking-[0.2em] text-[var(--muted)]">Founder &amp; Creator</span>
                  <span className="text-sm font-black font-mono text-[var(--foreground)]">Gaurav Kaloliya</span>
                  <span className="px-1.5 py-0.5 border border-[var(--border)] text-[9px] font-black font-mono uppercase tracking-wider text-[var(--muted)]">Gnovium</span>
                </div>
                <p className="text-xs text-[var(--muted)] mt-1 font-mono max-w-md">
                  &ldquo;Knowledge should behave like a living system. I built Gnovium to make that vision real.&rdquo;
                </p>
                <div className="flex gap-4 mt-2 text-[11px] font-mono">
                  <span className="text-[var(--muted)] hover:text-[var(--foreground)] flex items-center gap-1">
                    <ExternalLink className="h-3 w-3" /> LinkedIn
                  </span>
                  <span className="text-[var(--muted)] hover:text-[var(--foreground)] flex items-center gap-1">
                    <Star className="h-3 w-3" /> GitHub
                  </span>
                </div>
              </div>
            </div>
            {selectedIndex === 0 && (
              <div className="text-[var(--foreground)] font-bold text-xs flex items-center gap-1.5 font-mono">
                Visit Profile <ArrowRight className="h-3.5 w-3.5" />
              </div>
            )}
          </button>

          {/* No results state */}
          {results.length === 0 && query.trim() ? (
            <div className="flex flex-col items-center justify-center py-12 text-[var(--muted)] border-2 border-dashed border-[var(--border)] mx-1">
              <Terminal className="h-12 w-12 stroke-[1.5] mb-3 opacity-30" />
              <p className="text-sm font-bold font-mono mb-1">
                No endpoints match &ldquo;{query}&rdquo;
              </p>
              <p className="text-[11px] font-mono opacity-60 text-center max-w-xs">
                Try a different module, method, or search term.
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              {/* Category header */}
              {results.length > 0 && (
                <div className="flex items-center gap-2 px-3 py-2 border-b border-[var(--border)] mb-1">
                  <BookOpen className="h-3.5 w-3.5 text-[var(--muted)]" />
                  <span className="text-[10px] font-black font-mono uppercase tracking-wider text-[var(--muted)]">
                    Endpoints ({results.length})
                  </span>
                  <div className="flex-1 divider-subtle" />
                </div>
              )}
              {results.map((ep, index) => {
                const isSelected = index + 1 === selectedIndex;
                return (
                  <button
                    key={ep.id}
                    onClick={() => selectEndpoint(ep.id)}
                    onMouseEnter={() => setSelectedIndex(index + 1)}
                    className={`w-full flex items-center justify-between px-3 py-3 rounded-none text-left transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-[var(--card-bg)] border-2 border-[var(--foreground)] text-[var(--foreground)] neo-depth-btn'
                        : 'border-2 border-transparent text-[var(--muted)] hover:bg-[var(--card-bg)]'
                    }`}
                    aria-label={`${ep.method} ${ep.path}`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className={methodBadge(ep.method)}>{ep.method}</span>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-black text-[var(--muted)] uppercase tracking-widest">{highlightMatch(ep.module)}</span>
                          <span className="text-sm text-[var(--foreground)] font-mono truncate">{highlightMatch(ep.path)}</span>
                        </div>
                        <p className="text-[11px] text-[var(--muted)] mt-0.5 truncate font-mono">{highlightMatch(ep.summary)}</p>
                      </div>
                    </div>
                    {isSelected && (
                      <div className="flex items-center gap-1.5 text-xs text-[var(--foreground)] font-bold animate-pulse font-mono uppercase tracking-widest">
                        Go <ArrowRight className="h-3.5 w-3.5 stroke-[2.5]" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer with keyboard hints */}
        <div className="flex items-center justify-between border-t-2 border-[var(--border)] bg-[var(--card-bg)] px-4 py-3 text-[11px] text-[var(--muted)] font-bold uppercase tracking-wider">
          <div className="flex items-center gap-4 font-mono">
            <span className="flex items-center gap-1.5">
              <kbd className="px-2 py-0.5 rounded-none border-2 border-[var(--border)] bg-[var(--card-bg)] text-[var(--foreground)] text-[10px]">↑↓</kbd> Navigate
            </span>
            <span className="flex items-center gap-1.5">
              <kbd className="px-2 py-0.5 rounded-none border-2 border-[var(--border)] bg-[var(--card-bg)] text-[var(--foreground)] text-[10px]">Enter</kbd> Select
            </span>
          </div>
          <span className="flex items-center gap-1.5 font-mono">
            <kbd className="px-2 py-0.5 rounded-none border-2 border-[var(--border)] bg-[var(--card-bg)] text-[var(--foreground)] text-[10px]">Esc</kbd> Close
          </span>
        </div>
      </motion.div>
    </div>
  );
}
