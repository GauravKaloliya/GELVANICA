import type { AuthSlice } from './slices/authSlice'
import type { WorkspaceSlice } from './slices/workspaceSlice'
import type { EditorSlice } from './slices/editorSlice'
import type { UiSlice } from './slices/uiSlice'
import type { SettingsSlice } from './slices/settingsSlice'
import type { SyncSlice } from './slices/syncSlice'
import type { GraphSlice } from './slices/graphSlice'
import type { SearchSlice } from './slices/searchSlice'
import type { VersioningSlice } from './slices/versioningSlice'
import type { NotificationsSlice } from './slices/notificationsSlice'

export type StoreState = AuthSlice &
  WorkspaceSlice &
  EditorSlice &
  UiSlice &
  SettingsSlice &
  SyncSlice &
  GraphSlice &
  SearchSlice &
  VersioningSlice &
  NotificationsSlice
