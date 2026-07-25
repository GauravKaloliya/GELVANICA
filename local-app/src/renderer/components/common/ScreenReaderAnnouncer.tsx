import { useAccessibility } from '@/providers/AccessibilityProvider'

export function ScreenReaderAnnouncer() {
  const { announcements } = useAccessibility()
  return <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">{announcements}</div>
}
