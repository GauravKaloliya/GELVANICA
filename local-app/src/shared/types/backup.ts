import type { EntityType } from './entity'
import type { Entity } from './entity'
import type { EntityProperty } from './entity'
import type { Relation } from './relation'
import type { Tag } from './tag'
import type { Block } from './entity'
import type { Comment } from './comment'
import type { GnoviumFile } from './file'

export interface BackupExport {
  workspace_id: string
  exported_at: string
  entity_types: EntityType[]
  entities: Entity[]
  blocks: Block[]
  relations: Relation[]
  tags: Tag[]
  comments: Comment[]
  properties: EntityProperty[]
  files: GnoviumFile[]
}

export interface BackupExportRequest {
  workspace_id: string
}

export interface BackupImportRequest {
  workspace_id: string
  entity_types?: EntityType[]
  entities?: Entity[]
  blocks?: Block[]
  relations?: Relation[]
  tags?: Tag[]
  comments?: Comment[]
  properties?: EntityProperty[]
  files?: GnoviumFile[]
}

export interface BackupImportResponse {
  workspace_id: string
  imported: {
    entity_types: number
    entities: number
    properties: number
    blocks: number
    relations: number
    tags: number
    comments: number
  }
}

export interface BackupToDiskResponse {
  path: string
}

export type ExportFormat = 'json' | 'markdown' | 'zip' | 'html' | 'pdf'

export interface ExportRequest {
  workspace_id: string
  format: ExportFormat
}

export interface ExportMarkdownResponse {
  files: Array<{
    entity_id: string
    filename: string
    content: string
    frontmatter: Record<string, unknown>
  }>
}

export interface ExportZipResponse {
  path: string
  file_count: number
}

export interface ExportHtmlResponse {
  html: string
  filename: string
}

export interface ExportPdfResponse {
  path: string
  filename: string
}

export interface BackupListItem {
  id: string
  filename: string
  size_bytes: number
  created_at: string
  workspace_id: string
  path: string
}
