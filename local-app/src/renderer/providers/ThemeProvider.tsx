import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

type Theme = 'dark' | 'light' | 'sepia' | 'high-contrast' | 'system'
type ResolvedTheme = 'dark' | 'light' | 'sepia' | 'high-contrast'

interface ThemeContextValue {
  theme: Theme
  resolvedTheme: ResolvedTheme
  setTheme: (theme: Theme) => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

const STORAGE_KEY = 'gnovium-theme'

function getSystemTheme(): 'dark' | 'light' {
  if (typeof window === 'undefined') return 'dark'
  return window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light'
}

function getStoredTheme(): Theme {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === 'dark' || stored === 'light' || stored === 'sepia' || stored === 'high-contrast' || stored === 'system') {
      return stored
    }
  } catch {
    // localStorage unavailable
  }
  return 'system'
}

function resolveTheme(theme: Theme): ResolvedTheme {
  if (theme === 'system') return getSystemTheme()
  return theme
}

export interface ThemeProviderProps {
  children: ReactNode
}

export function ThemeProvider({ children }: ThemeProviderProps): ReactNode {
  const [theme, setThemeState] = useState<Theme>(getStoredTheme)
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>(() =>
    resolveTheme(theme)
  )

  const applyTheme = useCallback((resolved: ResolvedTheme) => {
    const root = document.documentElement
    root.classList.remove('dark', 'light', 'sepia', 'high-contrast')
    root.classList.add(resolved)
    setResolvedTheme(resolved)
  }, [])

  const setTheme = useCallback(
    (next: Theme) => {
      setThemeState(next)
      applyTheme(resolveTheme(next))
      try {
        localStorage.setItem(STORAGE_KEY, next)
      } catch {
        // localStorage unavailable
      }
    },
    [applyTheme]
  )

  useEffect(() => {
    applyTheme(resolveTheme(theme))
  }, [applyTheme, theme])

  useEffect(() => {
    if (theme !== 'system') return

    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = (e: MediaQueryListEvent): void => {
      applyTheme(e.matches ? 'dark' : 'light')
    }
    media.addEventListener('change', handler)
    return () => media.removeEventListener('change', handler)
  }, [theme, applyTheme])

  useEffect(() => {
    if (theme !== 'system') return

    async function syncFromSettings(): Promise<void> {
      if (!window.gnovium) return
      try {
        const settings = await window.gnovium.settings.getAll()
        const storedTheme = settings?.appearance?.theme
        if (
          storedTheme === 'dark' ||
          storedTheme === 'light' ||
          storedTheme === 'sepia' ||
          storedTheme === 'high-contrast' ||
          storedTheme === 'system'
        ) {
          if (storedTheme !== theme) {
            setThemeState(storedTheme)
            applyTheme(resolveTheme(storedTheme))
          }
        }
      } catch {
        // settings store unavailable
      }
    }
    syncFromSettings()
  }, [applyTheme, theme])

  const value = useMemo<ThemeContextValue>(
    () => ({ theme, resolvedTheme, setTheme }),
    [theme, resolvedTheme, setTheme]
  )

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  )
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}
