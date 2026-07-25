import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import {
  Settings as SettingsIcon,
  Palette,
  Code2,
  Sparkles,
  Gauge,
  HardDrive,
  Shield,
  RefreshCw,
  Wrench,
  Keyboard,
} from 'lucide-react'
import type { AppSettings, AllSettings, SettingsCategory } from '@shared/types'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { GeneralTab } from '@/components/settings/tabs/GeneralTab'
import { EditorTab } from '@/components/settings/tabs/EditorTab'
import { AppearanceTab } from '@/components/settings/tabs/AppearanceTab'
import { AITab } from '@/components/settings/tabs/AITab'
import { PerformanceTab } from '@/components/settings/tabs/PerformanceTab'
import { StorageTab } from '@/components/settings/tabs/StorageTab'
import { PrivacyTab } from '@/components/settings/tabs/PrivacyTab'
import { SyncTab } from '@/components/settings/tabs/SyncTab'
import { AdvancedTab } from '@/components/settings/tabs/AdvancedTab'
import { KeyboardShortcutsTab } from '@/components/settings/KeyboardShortcutsSettings'
import { useAllSettings, useUpdateSettings, useResetSettings } from '@/hooks/useSettings'
import { useStore } from '@/store'
import { DEFAULT_SETTINGS } from '@shared/config/defaults'

const TABS: { value: string; label: string; icon: React.ElementType }[] = [
  { value: 'general', label: 'General', icon: SettingsIcon },
  { value: 'editor', label: 'Editor', icon: Code2 },
  { value: 'appearance', label: 'Appearance', icon: Palette },
  { value: 'ai', label: 'AI', icon: Sparkles },
  { value: 'performance', label: 'Performance', icon: Gauge },
  { value: 'backups', label: 'Storage & Backups', icon: HardDrive },
  { value: 'privacy', label: 'Privacy', icon: Shield },
  { value: 'sync', label: 'Sync', icon: RefreshCw },
  { value: 'keyboard', label: 'Keyboard', icon: Keyboard },
  { value: 'advanced', label: 'Advanced', icon: Wrench },
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

function allSettingsToPartial(raw: AllSettings): Partial<AppSettings> {
  return raw as unknown as Partial<AppSettings>
}

export default function Settings() {
  const activeWorkspaceId = useStore((s) => s.activeWorkspaceId)
  const { data: allSettings, isLoading: loading } = useAllSettings(activeWorkspaceId ?? undefined)
  const updateSettingsMutation = useUpdateSettings()
  const resetSettingsMutation = useResetSettings()
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS)
  const [activeTab, setActiveTab] = useState('general')

  useEffect(() => {
    if (allSettings) setSettings((prev) => mergeSettings(prev, allSettingsToPartial(allSettings)))
  }, [allSettings])

  const update = useCallback(
    (section: string, key: string, value: unknown) => {
      setSettings((prev) => {
        const prevSection = (prev[section as keyof AppSettings] ?? {}) as Record<string, unknown>
        return {
          ...prev,
          [section]: { ...prevSection, [key]: value },
        }
      })
      if (activeWorkspaceId) {
        updateSettingsMutation.mutate({
          category: section as SettingsCategory,
          workspaceId: activeWorkspaceId,
          values: { [key]: value },
        })
      }
    },
    [activeWorkspaceId, updateSettingsMutation],
  )

  const resetDefaults = useCallback(async () => {
    if (activeWorkspaceId) {
      resetSettingsMutation.mutate(
        { workspaceId: activeWorkspaceId },
        {
          onSuccess: (defaults) => {
            setSettings((prev) => mergeSettings(prev, allSettingsToPartial(defaults)))
          },
        }
      )
    }
  }, [activeWorkspaceId, resetSettingsMutation])

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <div className="text-sm text-muted-foreground">Loading settings…</div>
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="flex h-full flex-col overflow-hidden p-6"
    >
      <div className="mb-4 shrink-0">
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-sm text-muted-foreground">Configure your GNOVIUM experience</p>
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
          <TabsContent value="general"><GeneralTab settings={settings} update={update} /></TabsContent>
          <TabsContent value="editor"><EditorTab settings={settings} update={update} /></TabsContent>
          <TabsContent value="appearance"><AppearanceTab settings={settings} update={update} /></TabsContent>
          <TabsContent value="ai"><AITab settings={settings} update={update} /></TabsContent>
          <TabsContent value="performance"><PerformanceTab settings={settings} update={update} /></TabsContent>
          <TabsContent value="backups"><StorageTab settings={settings} update={update} /></TabsContent>
          <TabsContent value="privacy"><PrivacyTab settings={settings} update={update} /></TabsContent>
          <TabsContent value="sync"><SyncTab settings={settings} update={update} /></TabsContent>
          <TabsContent value="advanced"><AdvancedTab settings={settings} update={update} onResetDefaults={resetDefaults} /></TabsContent>
          <TabsContent value="keyboard"><KeyboardShortcutsTab settings={settings} update={update} /></TabsContent>
        </div>
      </Tabs>
    </motion.div>
  )
}
