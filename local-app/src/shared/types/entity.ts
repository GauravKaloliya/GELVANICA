export interface Entity {
  id: string
  workspace_id: string
  entity_type_id: string | null
  title: string
  icon: string | null
  cover_image: string | null
  properties: Record<string, unknown> | null
  is_archived: boolean
  archived_at: string | null
  created_by: string | null
  is_deleted: boolean
  created_at: string
  updated_at: string
}

export interface EntityType {
  id: string
  workspace_id: string
  name: string
  icon: string | null
  config: Record<string, unknown> | null
  is_deleted: boolean
  deleted_at: string | null
  deleted_by: string | null
  created_at: string
}

export interface EntityProperty {
  id: string
  workspace_id: string
  entity_type_id: string | null
  name: string
  property_type: PropertyType
  config: Record<string, unknown> | null
  created_at: string
  value?: unknown
  property_name?: string
}

export type PropertyType = 'text' | 'number' | 'select' | 'multi_select' | 'date' | 'checkbox' | 'url' | 'email' | 'phone' | 'rich_text'

export interface EntityCreateRequest {
  workspace_id: string
  entity_type_id: string
  title?: string
  icon?: string
  cover_image?: string
  properties?: Record<string, unknown>
}

export interface EntityUpdateRequest {
  title?: string | null
  icon?: string | null
  cover_image?: string | null
  is_archived?: boolean
  properties?: Record<string, unknown>
}

export interface EntityTypeCreateRequest {
  workspace_id: string
  name: string
  icon?: string
  config?: Record<string, unknown>
}

export interface PropertyCreateRequest {
  workspace_id: string
  entity_type_id?: string | null
  name: string
  property_type: PropertyType
  config?: Record<string, unknown>
}

export type BlockType =
  | 'text'
  | 'heading_1'
  | 'heading_2'
  | 'heading_3'
  | 'bulleted_list'
  | 'numbered_list'
  | 'to_do'
  | 'code'
  | 'quote'
  | 'callout'
  | 'image'
  | 'divider'
  | 'table'
  | 'toggle'

export interface Block {
  id: string
  entity_id: string
  parent_block_id: string | null
  block_type: BlockType
  position: number
  indent: number
  content: BlockContent
  content_hash: string
  branch_id?: string
  is_deleted?: boolean
  created_at: string
  updated_at?: string
}

export type BlockContent =
  | TextContent
  | HeadingContent
  | ListContent
  | ToDoContent
  | CodeContent
  | QuoteContent
  | CalloutContent
  | ImageContent
  | DividerContent
  | TableContent
  | ToggleContent

export interface TextContent { text: string }
export interface HeadingContent { text: string }
export interface ListContent { text: string }
export interface ToDoContent { text: string; checked: boolean }
export interface CodeContent { text: string; language?: string }
export interface QuoteContent { text: string }
export interface CalloutContent { text: string; icon?: string }
export interface ImageContent { url: string; alt?: string }
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface DividerContent {}
export interface TableContent { rows?: unknown[][]; columns?: string[] }
export interface ToggleContent { text: string; open?: boolean }

export interface BlockCreateRequest {
  entity_id: string
  parent_block_id?: string | null
  block_type: BlockType
  position?: number | null
  indent?: number
  content?: BlockContent
}

export interface BlockUpdateRequest {
  parent_block_id?: string | null
  block_type?: BlockType
  position?: number
  indent?: number
  content?: BlockContent
}

export interface MoveBlockRequest {
  parent_block_id?: string | null
  position: number
  indent?: number
  entity_id?: string
}

export interface ReorderBlockRequest {
  entity_id: string
  blocks: Array<{ id: string; position: number }>
}
