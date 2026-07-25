export type { User, AuthTokens, AppSettings } from '../shared/types'

export interface FileInfo {
  name: string
  path: string
  isDirectory: boolean
  size: number
  modifiedAt: string
}

export interface OpenDialogOptions {
  title?: string
  defaultPath?: string
  buttonLabel?: string
  filters?: Array<{ name: string; extensions: string[] }>
  properties?: Array<'openFile' | 'openDirectory' | 'multiSelections'>
}

export interface SaveDialogOptions {
  title?: string
  defaultPath?: string
  buttonLabel?: string
  filters?: Array<{ name: string; extensions: string[] }>
}
