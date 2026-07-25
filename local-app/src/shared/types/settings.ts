import type { BlockType } from './entity'

export interface AppSettings {
  general: {
    language: string
    auto_save_interval: number
    startup_behavior: 'last_workspace' | 'workspace_picker' | 'dashboard'
  }
  editor: {
    default_block_type: BlockType
    auto_close_brackets: boolean
    spellcheck: boolean
  }
  appearance: {
    theme: 'dark' | 'light' | 'sepia' | 'high-contrast'
    font_size: number
    font_family: string
    density: 'compact' | 'comfortable' | 'spacious'
    sidebar_width: number
  }
  ai: {
    enabled: boolean
    model_path: string
    gpu_layers: number
    confidence_threshold: number
    auto_suggest: boolean
    context_window?: number
    temperature?: number
    max_tokens?: number
    embedding_model?: string
  }
  performance: {
    max_cache_size: number
    batch_size: number
    worker_count: number
    lazy_loading: boolean
    virtualization: boolean
  }
  backups: {
    backup_interval: number
    max_backups: number
    export_path: string
    auto_backup: boolean
    backup_path: string
  }
  privacy: {
    telemetry: boolean
    crash_reports: boolean
    analytics: boolean
    data_retention_days: number
  }
  sync: {
    auto_sync: boolean
    sync_interval: number
    conflict_strategy: 'local_wins' | 'cloud_wins' | 'ask' | 'manual'
    server_url: string
    sync_on_save?: boolean
    offline_queue?: boolean
  }
  advanced: {
    debug_mode: boolean
    log_level: 'error' | 'warn' | 'info' | 'debug'
    experimental_features: boolean
    reset_settings: boolean
  }
  keyboard_shortcuts: Record<string, string>
}

export type SettingsCategory =
  | 'general'
  | 'editor'
  | 'appearance'
  | 'ai'
  | 'performance'
  | 'backups'
  | 'privacy'
  | 'sync'
  | 'keyboard_shortcuts'
  | 'advanced'

export type SettingsValues = Record<string, unknown>

export type AllSettings = Record<SettingsCategory, SettingsValues>
