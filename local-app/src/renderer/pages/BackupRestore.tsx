import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { HardDrive, Download, Upload, FileJson, Archive, Trash2, AlertCircle } from 'lucide-react'
import { useStore } from '@/store'
import { useExportBackup, useImportBackup, useDeleteBackup } from '@/hooks/useBackup'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { EmptyState } from '@/components/common/EmptyState'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { formatDate, formatBytes } from '@/lib/utils'
import type { ExportFormat } from '@shared/types'

interface BackupEntry {
  id: string
  filename: string
  size: number
  created_at: string
}

interface BackupImportData {
  entity_types?: unknown[]
  entities?: unknown[]
  blocks?: unknown[]
  relations?: unknown[]
  tags?: unknown[]
  comments?: unknown[]
  properties?: unknown[]
}

const FORMAT_OPTIONS: { value: ExportFormat; label: string; icon: typeof FileJson }[] = [
  { value: 'json', label: 'JSON', icon: FileJson },
  { value: 'markdown', label: 'Markdown', icon: FileJson },
  { value: 'zip', label: 'ZIP Archive', icon: Archive },
  { value: 'html', label: 'HTML', icon: FileJson },
  { value: 'pdf', label: 'PDF', icon: FileJson },
]

export default function BackupRestore() {
  const activeWorkspaceId = useStore((s) => s.activeWorkspaceId)
  const exportBackup = useExportBackup()
  const importBackup = useImportBackup()

  const deleteBackup = useDeleteBackup()

  const [backups, setBackups] = useState<BackupEntry[]>([])
  const [loadingList, setLoadingList] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [exportFormat, setExportFormat] = useState<ExportFormat>('json')

  const fetchBackups = useCallback(async () => {
    setLoadingList(true)
    setFetchError(null)
    try {
      const result = await window.gnovium.backup.list()
      setBackups(Array.isArray(result) ? (result as BackupEntry[]) : [])
    } catch {
      setBackups([])
      setFetchError('Failed to load backups')
    } finally {
      setLoadingList(false)
    }
  }, [])

  useEffect(() => {
    void fetchBackups()
  }, [fetchBackups])

  const handleExport = async () => {
    if (!activeWorkspaceId) return

    if (exportFormat === 'json') {
      const data = await exportBackup.mutateAsync({ workspace_id: activeWorkspaceId })
      const json = JSON.stringify(data, null, 2)
      const blob = new Blob([json], { type: 'application/json' })
      const url = URL.createObjectURL(blob)

      const a = document.createElement('a')
      a.href = url
      a.download = `backup-${activeWorkspaceId}-${Date.now()}.json`
      a.click()
      URL.revokeObjectURL(url)
    } else {
      const filePath = await window.gnovium.dialog.showSaveDialog({
        title: 'Export Backup',
        defaultPath: `backup-${activeWorkspaceId}-${Date.now()}.${exportFormat}`,
        filters: [{ name: exportFormat.toUpperCase(), extensions: [exportFormat] }],
      })
      if (!filePath) return

      const channelMap: Record<string, string> = {
        markdown: 'backup:export-markdown',
        zip: 'backup:export-zip',
        html: 'backup:export-html',
        pdf: 'backup:export-pdf',
      }
      const channel = channelMap[exportFormat]
      if (!channel) return

      const result = (await window.gnovium.ipc.invoke(channel, activeWorkspaceId)) as { data?: string | unknown } | null
      if (result?.data) {
        const content = typeof result.data === 'string' ? result.data : JSON.stringify(result.data)
        await window.gnovium.filesystem.writeFile(filePath, content)
      }
      await fetchBackups()
    }
  }

  const handleImport = async () => {
    if (!activeWorkspaceId) return

    const filePaths = await window.gnovium.dialog.showOpenDialog({
      title: 'Import Backup',
      filters: [{ name: 'Backup', extensions: ['json'] }],
      properties: ['openFile'],
    })

    if (!filePaths || filePaths.length === 0) return

    const filePath = filePaths[0]!
    const raw = await window.gnovium.filesystem.readFile(filePath)
    const data = JSON.parse(raw) as BackupImportData

    await importBackup.mutateAsync({
      workspace_id: activeWorkspaceId,
      entity_types: data.entity_types as import('@shared/types').EntityType[] | undefined,
      entities: data.entities as import('@shared/types').Entity[] | undefined,
      blocks: data.blocks as import('@shared/types').Block[] | undefined,
      relations: data.relations as import('@shared/types').Relation[] | undefined,
      tags: data.tags as import('@shared/types').Tag[] | undefined,
      comments: data.comments as import('@shared/types').Comment[] | undefined,
      properties: data.properties as import('@shared/types').EntityProperty[] | undefined,
    })

    await fetchBackups()
  }

  const isWorking = exportBackup.isPending || importBackup.isPending

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="p-8"
    >
      <h1 className="mb-2 text-2xl font-bold">Backup & Restore</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        Create backups and restore from previous snapshots
      </p>

      <div className="mb-6 flex flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <Select value={exportFormat} onValueChange={(v) => setExportFormat(v as ExportFormat)}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Format" />
            </SelectTrigger>
            <SelectContent>
              {FORMAT_OPTIONS.map((f) => (
                <SelectItem key={f.value} value={f.value}>
                  {f.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            onClick={handleExport}
            disabled={!activeWorkspaceId || isWorking}
          >
            <Download className="mr-2 h-4 w-4" />
            {exportBackup.isPending ? 'Exporting...' : 'Export Backup'}
          </Button>
        </div>

        <Button
          variant="outline"
          onClick={handleImport}
          disabled={!activeWorkspaceId || isWorking}
        >
          <Upload className="mr-2 h-4 w-4" />
          {importBackup.isPending ? 'Importing...' : 'Import from File'}
        </Button>
      </div>

      {(exportBackup.isError || importBackup.isError) && (
        <div className="mb-4 flex items-center gap-2 rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>
            {exportBackup.isError
              ? `Export failed: ${exportBackup.error instanceof Error ? exportBackup.error.message : 'Unknown error'}`
              : `Import failed: ${importBackup.error instanceof Error ? importBackup.error.message : 'Unknown error'}`}
          </span>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Existing Backups</CardTitle>
        </CardHeader>
        <CardContent>
          {loadingList ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          ) : fetchError ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <AlertCircle className="mb-3 h-6 w-6 text-destructive" />
              <p className="text-sm text-muted-foreground">{fetchError}</p>
              <Button variant="outline" size="sm" className="mt-3" onClick={() => void fetchBackups()}>
                Retry
              </Button>
            </div>
          ) : backups.length === 0 ? (
            <EmptyState
              icon={<HardDrive className="h-6 w-6 text-muted-foreground" />}
              title="No backups yet"
              description="Create a backup to preserve your knowledge base. You can restore from any backup at any time."
            />
          ) : (
            <div className="space-y-2">
              <AnimatePresence>
                {backups.map((backup) => (
                  <motion.div
                    key={backup.id}
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 8 }}
                    className="flex items-center justify-between rounded-md border p-3"
                  >
                    <div className="flex items-center gap-3">
                      <HardDrive className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">{backup.filename}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatBytes(backup.size)} &middot; {formatDate(backup.created_at)}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      disabled={deleteBackup.isPending}
                      onClick={async () => {
                        await deleteBackup.mutateAsync(backup.id)
                        await fetchBackups()
                      }}
                    >
                      <Trash2 className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  )
}
