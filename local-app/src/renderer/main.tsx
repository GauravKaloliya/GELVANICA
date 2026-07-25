import React from 'react'
import ReactDOM from 'react-dom/client'
import { App } from './App'
import { QueryProvider } from './providers/QueryProvider'
import { ThemeProvider } from './providers/ThemeProvider'
import { AccessibilityProvider } from './providers/AccessibilityProvider'
import { AppProviders } from './providers/AppProviders'
import { ErrorBoundary } from './components/ErrorBoundary'
import { Toaster } from './components/common/Toast'
import { ReconnectingOverlay } from './components/common/ReconnectingOverlay'
import { ScreenReaderAnnouncer } from './components/common/ScreenReaderAnnouncer'
import { OfflineIndicator } from './components/common/OfflineIndicator'
import './styles/globals.css'

try {
  const a = localStorage.getItem('gnovium-accent')
  if (a) document.documentElement.style.setProperty('--accent-hsl', a)
  const f = localStorage.getItem('gnovium-font-family')
  if (f) document.documentElement.style.fontFamily = f
} catch { /* */ }

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <QueryProvider>
        <ThemeProvider>
          <AccessibilityProvider>
            <AppProviders>
              <App />
            </AppProviders>
            <ReconnectingOverlay />
            <ScreenReaderAnnouncer />
            <OfflineIndicator />
            <Toaster />
          </AccessibilityProvider>
        </ThemeProvider>
      </QueryProvider>
    </ErrorBoundary>
  </React.StrictMode>
)
