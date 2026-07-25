import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { useStore } from '@/store'
import { api } from '@lib/api'
import logoImg from '../../../resources/icon.png'

type Phase = 'init' | 'settings' | 'health' | 'ready' | 'error'

export default function SplashScreen() {
  const navigate = useNavigate()
  const [phase, setPhase] = useState<Phase>('init')
  const [status, setStatus] = useState('Initializing...')
  const loadSettings = useStore((s) => s.loadSettings)
  const activeWorkspaceId = useStore((s) => s.activeWorkspaceId)

  useEffect(() => {
    let cancelled = false
    const run = async () => {
      try {
        setPhase('settings')
        setStatus('Loading settings...')
        await loadSettings()
        if (cancelled) return

        setPhase('health')
        setStatus('Connecting to backend...')
        try {
          await api.health.check()
        } catch {
          await new Promise((r) => setTimeout(r, 1500))
          try {
            await api.health.check()
          } catch {
            if (!cancelled) { setPhase('error'); setStatus('Backend unavailable.') }
            return
          }
        }
        if (cancelled) return

        setPhase('ready')
        setStatus('Ready')
        await new Promise((r) => setTimeout(r, 250))
        if (!cancelled) {
          navigate(activeWorkspaceId ? '/dashboard' : '/workspaces', { replace: true })
        }
      } catch {
        if (!cancelled) { setPhase('error'); setStatus('Startup failed.') }
      }
    }
    run()
    return () => { cancelled = true }
  }, [activeWorkspaceId, loadSettings, navigate])

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex h-screen flex-col items-center justify-center bg-background"
    >
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="flex flex-col items-center gap-6"
      >
        <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-2xl bg-primary/10">
          <img src={logoImg} alt="Gnovium" className="h-full w-full object-cover" />
        </div>
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight">GNOVIUM</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Local-First Knowledge Operating System
          </p>
        </div>
        {phase !== 'error' ? (
          <LoadingSpinner size="sm" />
        ) : (
          <button
            onClick={() => window.location.reload()}
            className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90"
          >
            Retry
          </button>
        )}
        <p className="text-xs text-muted-foreground">{status}</p>
      </motion.div>
    </motion.div>
  )
}
