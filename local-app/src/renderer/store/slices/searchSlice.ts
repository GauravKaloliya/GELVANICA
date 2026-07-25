import { StateCreator } from 'zustand'
import type { SearchResult } from '@shared/types'
import type { StoreState } from '../index'

export interface SearchSlice {
  searchQuery: string
  searchMode: 'keyword' | 'full_text' | 'hybrid' | 'semantic'
  searchResults: SearchResult[]
  searchHistory: string[]
  isSearchOpen: boolean

  setSearchQuery: (query: string) => void
  setSearchMode: (mode: SearchSlice['searchMode']) => void
  setSearchResults: (results: SearchResult[]) => void
  addSearchHistory: (query: string) => void
  removeSearchHistory: (query: string) => void
  clearSearchHistory: () => void
  setSearchOpen: (open: boolean) => void
  toggleSearch: () => void
}

const MAX_HISTORY = 20

export const createSearchSlice: StateCreator<StoreState, [], [], SearchSlice> = (set) => ({
  searchQuery: '',
  searchMode: 'hybrid',
  searchResults: [],
  searchHistory: [],
  isSearchOpen: false,

  setSearchQuery: (searchQuery) => set({ searchQuery }),

  setSearchMode: (searchMode) => set({ searchMode }),

  setSearchResults: (searchResults) => set({ searchResults }),

  addSearchHistory: (query) =>
    set((state) => {
      const filtered = state.searchHistory.filter((q) => q !== query)
      return {
        searchHistory: [query, ...filtered].slice(0, MAX_HISTORY),
      }
    }),

  removeSearchHistory: (query) =>
    set((state) => ({
      searchHistory: state.searchHistory.filter((q) => q !== query),
    })),

  clearSearchHistory: () => set({ searchHistory: [] }),

  setSearchOpen: (isSearchOpen) => set({ isSearchOpen }),

  toggleSearch: () => set((state) => ({ isSearchOpen: !state.isSearchOpen })),
})
