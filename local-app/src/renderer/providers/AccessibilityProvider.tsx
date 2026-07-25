import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react'

interface AccessibilityContextValue {
  reducedMotion: boolean
  fontSize: number
  setFontSize: (size: number) => void
  announcements: string
  announce: (message: string) => void
}

const AccessibilityContext = createContext<AccessibilityContextValue | null>(null)

export function AccessibilityProvider({ children }: { children: ReactNode }) {
  const [reducedMotion, setReducedMotion] = useState(false)
  const [fontSize, setFontSizeState] = useState(() => {
    try { return parseInt(localStorage.getItem('gnovium-font-size') ?? '14', 10) } catch { return 14 }
  })
  const [announcements, setAnnouncements] = useState('')

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReducedMotion(mq.matches)
    const h = (e: MediaQueryListEvent) => setReducedMotion(e.matches)
    mq.addEventListener('change', h)
    return () => mq.removeEventListener('change', h)
  }, [])

  useEffect(() => {
    document.documentElement.style.fontSize = `${fontSize}px`
    try { localStorage.setItem('gnovium-font-size', String(fontSize)) } catch { /* */ }
  }, [fontSize])

  const setFontSize = useCallback((s: number) => setFontSizeState(Math.max(10, Math.min(24, s))), [])
  const announce = useCallback((m: string) => { setAnnouncements(''); requestAnimationFrame(() => setAnnouncements(m)) }, [])

  return (
    <AccessibilityContext.Provider value={{ reducedMotion, fontSize, setFontSize, announcements, announce }}>
      {children}
    </AccessibilityContext.Provider>
  )
}

export function useAccessibility() {
  const ctx = useContext(AccessibilityContext)
  if (!ctx) throw new Error('useAccessibility must be used within AccessibilityProvider')
  return ctx
}
