import type { AppSettings } from '@shared/types'

export const DEFAULT_SETTINGS: AppSettings = {
  general: { language: 'en', auto_save_interval: 30, startup_behavior: 'last_workspace' },
  editor: { default_block_type: 'text', auto_close_brackets: true, spellcheck: true },
  appearance: { theme: 'dark', font_size: 14, font_family: 'system-ui', density: 'comfortable', sidebar_width: 260 },
  ai: { enabled: false, model_path: '', gpu_layers: 0, confidence_threshold: 0.7, auto_suggest: true },
  performance: { max_cache_size: 512, batch_size: 50, worker_count: 2, lazy_loading: true, virtualization: true },
  backups: { backup_interval: 60, max_backups: 10, export_path: '', auto_backup: false, backup_path: '' },
  privacy: { telemetry: false, crash_reports: true, analytics: false, data_retention_days: 90 },
  sync: { auto_sync: true, sync_interval: 300, conflict_strategy: 'ask', server_url: '' },
  advanced: { debug_mode: false, log_level: 'info', experimental_features: false, reset_settings: false },
  keyboard_shortcuts: {},
}
