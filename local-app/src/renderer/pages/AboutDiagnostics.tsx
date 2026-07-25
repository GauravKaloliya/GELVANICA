import { useState, useEffect, useRef, useCallback } from 'react'
import { motion } from 'framer-motion'
import { Info, Monitor, Cpu, HardDrive, Download, FileText, RefreshCw, Copy, Check } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'

interface VersionInfo {
  app: string
  electron: string
  chrome: string
  node: string
  platform: string
  arch: string
}

const platformLabels: Record<string, string> = {
  darwin: 'macOS',
  win32: 'Windows',
  linux: 'Linux',
}

export default function AboutDiagnostics() {
  const [info, setInfo] = useState<VersionInfo | null>(null)
  const [logContent, setLogContent] = useState('')
  const [logLoading, setLogLoading] = useState(false)
  const [logError, setLogError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const logEndRef = useRef<HTMLDivElement>(null)

  const fetchLogs = useCallback(async () => {
    setLogLoading(true)
    setLogError(null)
    try {
      const logDir = await window.gnovium?.app?.getLogDir?.()
      if (!logDir) {
        setLogError('Log directory not available')
        return
      }
      const files = await window.gnovium.filesystem.listDir(logDir)
      const logFiles = files
        .filter((f) => f.name.endsWith('.log'))
        .sort()
      if (logFiles.length === 0) {
        setLogContent('No log files found.')
        return
      }
      const latestLog = logFiles[logFiles.length - 1]
      if (!latestLog) {
        setLogContent('No log files found.')
        return
      }
      const content = await window.gnovium.filesystem.readFile(`${logDir}/${latestLog.name}`)
      const lines = content.split('\n')
      const last200 = lines.slice(-200).join('\n')
      setLogContent(last200 || 'Log file is empty.')
    } catch (err) {
      setLogError(err instanceof Error ? err.message : 'Failed to load logs')
    } finally {
      setLogLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchLogs()
  }, [fetchLogs])

  useEffect(() => {
    if (logContent && logEndRef.current) {
      logEndRef.current.scrollIntoView({ behavior: 'auto' })
    }
  }, [logContent])

  const handleCopyLogs = useCallback(async () => {
    try {
      await window.gnovium?.clipboard?.writeText(logContent)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // fallback
    }
  }, [logContent])

  const colorizeLogLine = (line: string) => {
    const upper = line.toUpperCase()
    if (upper.includes('[ERROR]')) return 'text-red-400'
    if (upper.includes('[WARN]')) return 'text-yellow-400'
    if (upper.includes('[DEBUG]')) return 'text-gray-500'
    return 'text-gray-300'
  }

  useEffect(() => {
    window.gnovium?.version?.info?.()
      .then((v) => setInfo(v as VersionInfo))
      .catch(() => {
        setInfo({
          app: 'Loading...',
          electron: '...',
          chrome: '...',
          node: '...',
          platform: navigator.platform,
          arch: '...',
        })
      })
  }, [])

  const handleExport = async () => {
    const report = {
      timestamp: new Date().toISOString(),
      system: info,
      settings: await window.gnovium?.settings?.getAll?.() ?? {},
    }
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' })
    const text = await blob.text()
    const paths = await window.gnovium.dialog.showSaveDialog({
      defaultPath: `gnovium-diagnostics-${Date.now()}.json`,
      filters: [{ name: 'JSON', extensions: ['json'] }],
    })
    if (paths && paths.length > 0 && paths[0]) {
      await window.gnovium.filesystem.writeFile(paths[0], text)
    }
  }

  const items = info
    ? [
        { label: 'App Version', value: info.app, icon: Info },
        { label: 'Platform', value: platformLabels[info.platform] ?? info.platform, icon: Monitor },
        { label: 'Architecture', value: info.arch, icon: Cpu },
        { label: 'Electron', value: info.electron, icon: Monitor },
        { label: 'Chromium', value: info.chrome, icon: Monitor },
        { label: 'Node.js', value: info.node, icon: HardDrive },
      ]
    : []

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="p-8"
    >
      <div className="mb-6 flex items-center gap-2">
        <Info className="h-5 w-5" />
        <h1 className="text-2xl font-bold">About & Diagnostics</h1>
      </div>
      <Card className="max-w-lg">
        <CardHeader>
          <CardTitle>System Information</CardTitle>
        </CardHeader>
        <CardContent>
          {!info ? (
            <LoadingSpinner />
          ) : (
            <div className="space-y-3">
              {items.map((item, i) => (
                <div key={item.label}>
                  <div className="flex justify-between">
                    <span className="flex items-center gap-2 text-sm text-muted-foreground">
                      <item.icon className="h-3.5 w-3.5" />
                      {item.label}
                    </span>
                    <span className="text-sm font-medium">{item.value}</span>
                  </div>
                  {i < items.length - 1 && <Separator className="mt-3" />}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      <div className="mt-4">
        <Button variant="outline" onClick={handleExport} disabled={!info}>
          <Download className="mr-2 h-4 w-4" />
          Export Diagnostics
        </Button>
      </div>

      {/* Log Viewer */}
      <Card className="mt-6 max-w-3xl">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Logs
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={fetchLogs} disabled={logLoading}>
                <RefreshCw className={`h-3.5 w-3.5 ${logLoading ? 'animate-spin' : ''}`} />
              </Button>
              <Button variant="ghost" size="sm" onClick={handleCopyLogs} disabled={!logContent || logLoading}>
                {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {logLoading ? (
            <div className="flex items-center justify-center py-8">
              <LoadingSpinner size="sm" />
            </div>
          ) : logError ? (
            <p className="text-sm text-destructive">{logError}</p>
          ) : (
            <div className="max-h-96 overflow-auto rounded-md bg-black/90 p-4">
              <pre className="text-xs font-mono whitespace-pre-wrap break-all">
                {logContent.split('\n').map((line, i) => (
                  <div key={i} className={colorizeLogLine(line)}>
                    {line}
                  </div>
                ))}
              </pre>
              <div ref={logEndRef} />
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  )
}
