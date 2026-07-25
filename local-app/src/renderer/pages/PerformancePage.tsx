import { useState, useEffect } from 'react'
import { Activity, Cpu, HardDrive, MemoryStick, Clock, RefreshCw } from 'lucide-react'

interface PerfMetric {
  label: string
  value: string
  icon: React.ReactNode
  status: 'good' | 'warning' | 'critical'
}

export default function PerformancePage() {
  const [metrics, setMetrics] = useState<PerfMetric[]>([])
  const [loading, setLoading] = useState(true)

  const collectMetrics = async () => {
    setLoading(true)
    const results: PerfMetric[] = []

    // Memory usage
    try {
      if (typeof performance !== 'undefined' && 'memory' in performance) {
        const mem = (performance as { memory?: { usedJSHeapSize: number; jsHeapSizeLimit: number } }).memory
        if (mem) {
          const usedMB = Math.round(mem.usedJSHeapSize / 1024 / 1024)
          const limitMB = Math.round(mem.jsHeapSizeLimit / 1024 / 1024)
          const percent = Math.round((usedMB / limitMB) * 100)
          results.push({
            label: 'JS Heap Memory',
            value: `${usedMB} MB / ${limitMB} MB (${percent}%)`,
            icon: <MemoryStick className="h-4 w-4" />,
            status: percent > 80 ? 'critical' : percent > 60 ? 'warning' : 'good',
          })
        }
      }
    } catch { /* perf API not available */ }

    // Renderer performance
    try {
      const entries = performance.getEntriesByType('navigation')
      if (entries.length > 0) {
        const nav = entries[0] as PerformanceNavigationTiming
        const loadTime = Math.round(nav.loadEventEnd - nav.startTime)
        results.push({
          label: 'Page Load Time',
          value: `${loadTime}ms`,
          icon: <Clock className="h-4 w-4" />,
          status: loadTime > 3000 ? 'critical' : loadTime > 1500 ? 'warning' : 'good',
        })
      }
    } catch { /* navigation timing not available */ }

    // Active resources
    try {
      const resourceCount = performance.getEntriesByType('resource').length
      results.push({
        label: 'Active Resources',
        value: `${resourceCount} loaded`,
        icon: <Activity className="h-4 w-4" />,
        status: resourceCount > 200 ? 'warning' : 'good',
      })
    } catch { /* performance API not available */ }

    // CPU cores
    results.push({
      label: 'CPU Cores',
      value: `${navigator.hardwareConcurrency ?? 'Unknown'}`,
      icon: <Cpu className="h-4 w-4" />,
      status: 'good',
    })

    // Device memory
    try {
      const devMem = (navigator as { deviceMemory?: number }).deviceMemory
      if (devMem) {
        results.push({
          label: 'Device Memory',
          value: `${devMem} GB`,
          icon: <HardDrive className="h-4 w-4" />,
          status: devMem < 4 ? 'warning' : 'good',
        })
      }
    } catch { /* deviceMemory not available */ }

    // Connection info
    try {
      const conn = (navigator as { connection?: { effectiveType?: string; downlink?: number } }).connection
      if (conn) {
        results.push({
          label: 'Network',
          value: `${conn.effectiveType ?? 'unknown'} (${conn.downlink ?? '?'} Mbps)`,
          icon: <Activity className="h-4 w-4" />,
          status: 'good',
        })
      }
    } catch { /* connection API not available */ }

    setMetrics(results)
    setLoading(false)
  }

  useEffect(() => {
    collectMetrics()
    const interval = setInterval(collectMetrics, 5000)
    return () => clearInterval(interval)
  }, [])

  const statusColor = (status: PerfMetric['status']) => {
    switch (status) {
      case 'good': return 'text-emerald-500'
      case 'warning': return 'text-amber-500'
      case 'critical': return 'text-destructive'
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Performance</h1>
          <p className="text-sm text-muted-foreground">Real-time system metrics</p>
        </div>
        <button
          onClick={collectMetrics}
          className="flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm hover:bg-muted"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      <div className="space-y-2">
        {metrics.map((metric) => (
          <div key={metric.label} className="flex items-center justify-between rounded-lg border p-3">
            <div className="flex items-center gap-3">
              <div className={statusColor(metric.status)}>{metric.icon}</div>
              <span className="text-sm font-medium">{metric.label}</span>
            </div>
            <span className="text-xs text-muted-foreground">{metric.value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
