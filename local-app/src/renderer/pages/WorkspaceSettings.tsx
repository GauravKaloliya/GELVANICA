import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { Loader2, Settings as SettingsIcon, Sparkles, RefreshCw } from 'lucide-react'
import { useStore } from '@/store'
import { useQueryClient } from '@tanstack/react-query'
import { WorkspaceGeneral } from '@/components/settings/WorkspaceGeneral'
import { AISettings } from '@/components/settings/AISettings'
import { SyncSettings } from '@/components/settings/SyncSettings'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { useAllSettings, useSettings, useUpdateSettings } from '@/hooks/useSettings'
import type { Workspace, AppSettings, SettingsCategory, SettingsValues } from '@shared/types'
import { toast } from 'sonner'
import { DEFAULT_SETTINGS } from '@shared/config/defaults'

const TABS: { value: string; label: string; icon: React.ElementType }[] = [
  { value: 'general', label: 'General', icon: SettingsIcon },
  { value: 'ai', label: 'AI', icon: Sparkles },
  { value: 'sync', label: 'Sync', icon: RefreshCw },
]

function mergeSettings(base: AppSettings, loaded: Partial<AppSettings>): AppSettings {
  return {
    ...base,
    ...loaded,
    general: { ...base.general, ...(loaded.general ?? {}) },
    editor: { ...base.editor, ...(loaded.editor ?? {}) },
    appearance: { ...base.appearance, ...(loaded.appearance ?? {}) },
    ai: { ...base.ai, ...(loaded.ai ?? {}) },
    performance: { ...base.performance, ...(loaded.performance ?? {}) },
    backups: { ...base.backups, ...(loaded.backups ?? {}) },
    privacy: { ...base.privacy, ...(loaded.privacy ?? {}) },
    sync: { ...base.sync, ...(loaded.sync ?? {}) },
    advanced: { ...base.advanced, ...(loaded.advanced ?? {}) },
    keyboard_shortcuts: { ...base.keyboard_shortcuts, ...(loaded.keyboard_shortcuts ?? {}) },
  }
}

export default function WorkspaceSettings() {
  const activeWorkspaceId = useStore((s) => s.activeWorkspaceId)
  const queryClient = useQueryClient()
  const [workspace, setWorkspace] = useState<Workspace | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('general')
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS)

  const { data: allSettings } = useAllSettings(activeWorkspaceId ?? undefined)
  const { data: generalSettings } = useSettings('general', activeWorkspaceId ?? undefined)
  const { data: aiSettings } = useSettings('ai', activeWorkspaceId ?? undefined)
  const { data: syncSettings } = useSettings('sync', activeWorkspaceId ?? undefined)
  const updateSettingsMutation = useUpdateSettings()

  useEffect(() => {
    if (allSettings) setSettings((prev) => mergeSettings(prev, allSettings as Partial<AppSettings>))
  }, [allSettings])

  useEffect(() => {
    if (generalSettings) setSettings((prev) => mergeSettings(prev, { general: generalSettings as AppSettings['general'] }))
  }, [generalSettings])

  useEffect(() => {
    if (aiSettings) setSettings((prev) => mergeSettings(prev, { ai: aiSettings as AppSettings['ai'] }))
  }, [aiSettings])

  useEffect(() => {
    if (syncSettings) setSettings((prev) => mergeSettings(prev, { sync: syncSettings as AppSettings['sync'] }))
  }, [syncSettings])

  useEffect(() => {
    if (!activeWorkspaceId) {
      setLoading(false)
      return
    }
    window.gnovium.workspace.get(activeWorkspaceId).then((resp) => {
      setWorkspace(resp.data as Workspace)
      setLoading(false)
    }).catch(() => {
      setLoading(false)
    })
  }, [activeWorkspaceId])

  const handleUpdate = async (data: { name: string; description: string; is_archived: boolean }) => {
    if (!activeWorkspaceId) return
    try {
      const updated = await window.gnovium.workspace.update(activeWorkspaceId, data)
      setWorkspace(updated.data as Workspace)
      toast.success('Workspace updated')
      queryClient.invalidateQueries({ queryKey: ['workspaces'] })
    } catch {
      toast.error('Failed to update workspace')
    }
  }

  const handleDelete = async (workspaceId: string) => {
    try {
      await window.gnovium.workspace.delete(workspaceId)
      toast.success('Workspace deleted')
      queryClient.invalidateQueries({ queryKey: ['workspaces'] })
    } catch {
      toast.error('Failed to delete workspace')
    }
  }

  const update = useCallback(
    (section: SettingsCategory, key: string, value: SettingsValues[string]) => {
      setSettings((prev) => {
        const prevSection = prev[section as keyof AppSettings]
        if (typeof prevSection === 'object' && prevSection !== null) {
          return {
            ...prev,
            [section]: { ...(prevSection as Record<string, unknown>), [key]: value },
          }
        }
        return prev
      })
      if (activeWorkspaceId) {
        updateSettingsMutation.mutate({
          category: section,
          workspaceId: activeWorkspaceId,
          values: { [key]: value },
        })
      }
    },
    [activeWorkspaceId, updateSettingsMutation],
  )

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!workspace) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <p className="text-sm text-muted-foreground">No workspace selected.</p>
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex h-full flex-col overflow-hidden p-6"
    >
      <div className="mb-4 shrink-0">
        <h1 className="text-2xl font-bold">Workspace Settings</h1>
        <p className="text-sm text-muted-foreground">
          Manage settings for {workspace.name}
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <TabsList className="w-full shrink-0 flex-wrap justify-start gap-1">
          {TABS.map((tab) => {
            const Icon = tab.icon
            return (
              <TabsTrigger key={tab.value} value={tab.value} className="gap-1.5 text-xs">
                <Icon className="h-3.5 w-3.5" />
                {tab.label}
              </TabsTrigger>
            )
          })}
        </TabsList>

        <div className="mt-4 min-h-0 flex-1 overflow-y-auto pr-2">
          <TabsContent value="general">
            <WorkspaceGeneral
              workspace={workspace}
              onUpdate={handleUpdate}
              onDelete={handleDelete}
            />
          </TabsContent>
          <TabsContent value="ai">
            <AISettings
              settings={settings.ai}
              onUpdate={(key, value) => update('ai', key, value)}
            />
          </TabsContent>
          <TabsContent value="sync">
            <SyncSettings
              settings={settings.sync}
              onUpdate={(key, value) => update('sync', key, value)}
            />
          </TabsContent>
        </div>
      </Tabs>
    </motion.div>
  )
}
