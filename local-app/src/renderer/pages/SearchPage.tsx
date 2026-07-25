import { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Tag, FileText, Box, AlertCircle, Clock, X } from 'lucide-react'
import { SearchBar } from '@/components/search/SearchBar'
import { SearchResults } from '@/components/search/SearchResults'
import { SearchFilters, type SearchFiltersState } from '@/components/search/SearchFilters'
import { SearchModeToggle } from '@/components/search/SearchModeToggle'
import { useSearch } from '@/hooks/useSearch'
import { useStore } from '@/store'
import { api } from '@lib/api'
import { ROUTES } from '@/router'
import type { SearchMode, SearchSuggestItem } from '@shared/types'

const SUGGESTION_ICONS: Record<SearchSuggestItem['type'], React.ComponentType<{ className?: string }>> = {
  entity: FileText,
  block: Box,
  tag: Tag,
}

export default function SearchPage() {
  const navigate = useNavigate()
  const activeWorkspaceId = useStore((s) => s.activeWorkspaceId)
  const addSearchHistory = useStore((s) => s.addSearchHistory)
  const searchHistory = useStore((s) => s.searchHistory)
  const removeSearchHistory = useStore((s) => s.removeSearchHistory)
  const clearSearchHistory = useStore((s) => s.clearSearchHistory)
  const [query, setQuery] = useState('')
  const [mode, setMode] = useState<SearchMode>('hybrid')
  const [filters, setFilters] = useState<SearchFiltersState>({
    matchType: 'all',
    dateRange: 'all',
    minScore: 0,
    tags: [],
  })
  const [searchFocused, setSearchFocused] = useState(false)

  // Debounced query
  const [debouncedQuery, setDebouncedQuery] = useState('')
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query.trim()), 300)
    return () => clearTimeout(timer)
  }, [query])

  // Search suggestions
  const [suggestions, setSuggestions] = useState<SearchSuggestItem[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [activeSuggestion, setActiveSuggestion] = useState(-1)
  const suggestionTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const suggestionsRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (query.trim().length < 2) {
      setSuggestions([])
      setShowSuggestions(false)
      return
    }

    if (suggestionTimerRef.current) clearTimeout(suggestionTimerRef.current)
    suggestionTimerRef.current = setTimeout(() => {
      if (!activeWorkspaceId) return
      api.search
        .suggest({ workspace_id: activeWorkspaceId, q: query.trim(), limit: 8 })
        .then((data) => {
          setSuggestions(data ?? [])
          setShowSuggestions(true)
          setActiveSuggestion(-1)
        })
        .catch(() => {
          setSuggestions([])
          setShowSuggestions(false)
        })
    }, 300)

    return () => {
      if (suggestionTimerRef.current) clearTimeout(suggestionTimerRef.current)
    }
  }, [query, activeWorkspaceId])

  // Close suggestions on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(e.target as Node)) {
        setShowSuggestions(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const { data: rawResults, isLoading, isError, error } = useSearch({
    workspace_id: activeWorkspaceId ?? '',
    q: debouncedQuery,
    mode,
    limit: 50,
  })

  // Search history
  useEffect(() => {
    if (debouncedQuery && rawResults && rawResults.length > 0) {
      addSearchHistory(debouncedQuery)
    }
  }, [debouncedQuery, rawResults, addSearchHistory])

  // Client-side filtering
  const results = useMemo(() => {
    if (!rawResults) return undefined
    return rawResults.filter((r) => {
      if (filters.matchType !== 'all' && r.match_type !== filters.matchType) return false
      if (filters.minScore > 0 && r.score * 100 < filters.minScore) return false
      if (filters.dateRange !== 'all') {
        const dateField = 'created_at' in r ? (r as { created_at?: string }).created_at : undefined
        if (dateField) {
          const now = new Date()
          const cutoff = new Date()
          switch (filters.dateRange) {
            case 'today': cutoff.setDate(now.getDate() - 1); break
            case 'week': cutoff.setDate(now.getDate() - 7); break
            case 'month': cutoff.setMonth(now.getMonth() - 1); break
            case 'year': cutoff.setFullYear(now.getFullYear() - 1); break
          }
          if (new Date(dateField) < cutoff) return false
        }
      }
      if (filters.tags.length > 0) {
        const resultTags = r.tags ?? []
        const resultTagNames = resultTags.map((t) => t.name.toLowerCase())
        const hasMatchingTag = filters.tags.some((tag) => resultTagNames.includes(tag.toLowerCase()))
        if (!hasMatchingTag) return false
      }
      return true
    })
  }, [rawResults, filters])

  // Stats for filter counts
  const resultCounts = useMemo(() => {
    if (!rawResults) return undefined
    return {
      page: rawResults.filter((r) => r.match_type === 'page').length,
      block: rawResults.filter((r) => r.match_type === 'block').length,
      total: rawResults.length,
    }
  }, [rawResults])

  const handleResultClick = useCallback(
    (entityId: string) => {
      navigate(ROUTES.ENTITY.replace(':id', entityId))
    },
    [navigate]
  )

  const handleSuggestionClick = useCallback(
    (text: string) => {
      setQuery(text)
      setShowSuggestions(false)
      setActiveSuggestion(-1)
    },
    []
  )

  const handleQueryKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!showSuggestions || suggestions.length === 0) return
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setActiveSuggestion((prev) => (prev < suggestions.length - 1 ? prev + 1 : 0))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setActiveSuggestion((prev) => (prev > 0 ? prev - 1 : suggestions.length - 1))
      } else if (e.key === 'Enter' && activeSuggestion >= 0) {
        e.preventDefault()
        handleSuggestionClick(suggestions[activeSuggestion]?.text ?? '')
      } else if (e.key === 'Escape') {
        setShowSuggestions(false)
      }
    },
    [showSuggestions, suggestions, activeSuggestion, handleSuggestionClick]
  )

  const showRecentSearches = searchFocused && !query.trim() && searchHistory.length > 0
  const recentSearches = searchHistory.slice(0, 10)

  const handleRecentSearchClick = useCallback(
    (text: string) => {
      setQuery(text)
      setSearchFocused(false)
    },
    []
  )

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex h-full"
    >
      {/* Main search area */}
      <div className="flex flex-1 flex-col overflow-hidden p-8">
        <div className="mb-6">
          <h1 className="mb-1 text-2xl font-bold tracking-tight">Search</h1>
          <p className="text-sm text-muted-foreground">
            Search across all your knowledge
          </p>
        </div>

        {/* Search Bar + Mode Toggle */}
        <div className="mb-4 flex items-center gap-3">
          <div className="relative flex-1" ref={suggestionsRef}>
            <div onKeyDown={handleQueryKeyDown}>
              <SearchBar
                value={query}
                onChange={setQuery}
                onClear={() => {
                  setQuery('')
                  setSuggestions([])
                  setShowSuggestions(false)
                }}
                onFocus={() => setSearchFocused(true)}
                onBlur={() => setTimeout(() => setSearchFocused(false), 150)}
                isLoading={isLoading}
              />
            </div>

            {/* Suggestions dropdown */}
            <AnimatePresence>
              {showSuggestions && suggestions.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.15 }}
                  className="absolute top-full left-0 right-0 z-50 mt-1 overflow-hidden rounded-lg border bg-popover shadow-md"
                >
                  {suggestions.map((s, i) => {
                    const Icon = SUGGESTION_ICONS[s.type]
                    return (
                      <button
                        key={`${s.type}-${s.text}-${i}`}
                        onClick={() => handleSuggestionClick(s.text)}
                        className={`flex w-full items-center gap-3 px-3 py-2 text-left text-sm transition-colors ${
                          activeSuggestion === i
                            ? 'bg-accent text-accent-foreground'
                            : 'hover:bg-muted'
                        }`}
                      >
                        <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                        <span className="flex-1 truncate">{s.text}</span>
                        <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                          {s.type}
                        </span>
                        <span className="shrink-0 text-[10px] text-muted-foreground">
                          {Math.round(s.score * 100)}%
                        </span>
                      </button>
                    )
                  })}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Recent searches dropdown */}
            <AnimatePresence>
              {showRecentSearches && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.15 }}
                  className="absolute top-full left-0 right-0 z-50 mt-1 overflow-hidden rounded-lg border bg-popover shadow-md"
                >
                  <div className="flex items-center justify-between px-3 py-2">
                    <span className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      Recent Searches
                    </span>
                    <button
                      onClick={() => {
                        clearSearchHistory()
                        setSearchFocused(false)
                      }}
                      className="text-[11px] text-muted-foreground hover:text-foreground transition-colors"
                    >
                      Clear all
                    </button>
                  </div>
                  <div className="border-t" />
                  {recentSearches.map((item) => (
                    <div
                      key={item}
                      className="flex items-center gap-2 px-3 py-1.5 hover:bg-muted transition-colors group"
                    >
                      <Clock className="h-3 w-3 shrink-0 text-muted-foreground/50" />
                      <button
                        onClick={() => handleRecentSearchClick(item)}
                        className="flex-1 truncate text-left text-sm text-muted-foreground group-hover:text-foreground"
                      >
                        {item}
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          removeSearchHistory(item)
                        }}
                        className="shrink-0 rounded p-0.5 text-muted-foreground/50 opacity-0 hover:text-foreground group-hover:opacity-100 transition-opacity"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <SearchModeToggle mode={mode} onChange={setMode} />
        </div>

        {/* Results */}
        <div className="flex-1 overflow-auto">
          {isError ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <AlertCircle className="mb-3 h-8 w-8 text-destructive" />
              <h3 className="text-sm font-semibold text-foreground">Search failed</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {error instanceof Error ? error.message : 'An error occurred while searching'}
              </p>
            </div>
          ) : (
            <SearchResults
              results={results}
              query={debouncedQuery}
              isLoading={isLoading}
              onResultClick={handleResultClick}
            />
          )}
        </div>
      </div>

      {/* Right filter panel */}
      <div className="w-64 shrink-0 border-l overflow-y-auto p-4">
        <SearchFilters
          filters={filters}
          onChange={setFilters}
          resultCounts={resultCounts}
        />
      </div>
    </motion.div>
  )
}
