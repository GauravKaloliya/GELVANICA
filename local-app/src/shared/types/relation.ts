export type RelationType = string

export const KNOWN_RELATION_TYPES = [
  'refers_to', 'depends_on', 'part_of', 'related_to', 'implements', 'extends',
] as const

export interface Relation {
  id: string
  workspace_id: string
  source_entity_id: string
  target_entity_id: string
  relation_type: RelationType
  generated_by: 'manual' | 'ai'
  verified: boolean
  confidence: number | null
  ai_model: string | null
  metadata: Record<string, unknown> | null
  created_by: string | null
  created_at: string
  source_entity_title?: string
  target_entity_title?: string
  description?: string
}

export interface RelationCreateRequest {
  workspace_id: string
  source_entity_id: string
  target_entity_id: string
  relation_type: RelationType
  generated_by?: 'manual' | 'ai'
  verified?: boolean
  confidence?: number | null
  ai_model?: string | null
  metadata?: Record<string, unknown>
}
