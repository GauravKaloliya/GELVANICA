import type { EntityType } from './entity'
import type { Entity } from './entity'
import type { EntityProperty } from './entity'
import type { Relation } from './relation'
import type { Tag } from './tag'
import type { Block } from './entity'
import type { Comment } from './comment'

export type SyncOperationType =
  | 'entity_create'
  | 'entity_update'
  | 'entity_delete'
  | 'block_create'
  | 'block_update'
  | 'block_delete'
  | 'relation_create'
  | 'relation_delete'

export interface SyncOperation {
  id: string
  workspace_id: string
  operation_type: SyncOperationType
  entity_type: string | null
  entity_id: string | null
  payload: Record<string, unknown>
  device_id: string | null
  client_clock: number | null
  synced: boolean
  synced_at: string | null
  synced_by: string | null
  conflict_data: Record<string, unknown> | null
  created_at: string
}

export interface SyncCreateRequest {
  workspace_id: string
  operation_type: SyncOperationType
  entity_type?: string | null
  entity_id?: string | null
  payload: Record<string, unknown>
  device_id?: string | null
  client_clock?: number | null
}

export interface SyncDiffRequest {
  workspace_id: string
  export_data: {
    entity_types?: EntityType[]
    entities?: Entity[]
    properties?: EntityProperty[]
    relations?: Relation[]
    tags?: Tag[]
    blocks?: Block[]
    comments?: Comment[]
  }
}

export interface SyncDiffResponse {
  entity_types: EntityType[]
  entities: Entity[]
  properties: EntityProperty[]
  relations: Relation[]
  tags: Tag[]
  blocks: Block[]
  comments: Comment[]
}

export interface SyncApplyDiffRequest {
  workspace_id: string
  diff: SyncDiffResponse
}

export interface SyncApplyDiffResponse {
  workspace_id: string
  synced: {
    entity_types: number
    entities: number
    properties: number
    relations: number
    tags: number
    blocks: number
    comments: number
  }
}

export type SyncStatusType = 'idle' | 'syncing' | 'error' | 'offline'

export interface SyncStatus {
  workspace_id: string
  last_synced_at: string | null
  pending_operations: number
  sync_in_progress: boolean
  device_id: string | null
  status: SyncStatusType
  error: string | null
}

export interface SyncState {
  status: SyncStatusType
  last_synced_at: string | null
  pending_changes: number
  error: string | null
}
