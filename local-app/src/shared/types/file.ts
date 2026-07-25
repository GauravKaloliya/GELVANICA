export interface GnoviumFile {
  id: string
  workspace_id: string
  file_name: string
  mime_type: string
  file_size: number
  content_hash: string
  storage_provider: string
  object_key: string
  uploaded_by: string | null
  uploaded_at: string
  extracted_text: string | null
  metadata_json: Record<string, unknown> | null
  is_deleted: boolean
  deleted_at: string | null
  deleted_by: string | null
  has_thumbnail?: boolean
  has_preview?: boolean
  created_at?: string
}

export interface FileVariant {
  variant_type: string
  object_key: string
  mime_type: string
}

export interface FileUploadResponse {
  id: string
  workspace_id: string
  file_name: string
  mime_type: string
  file_size: number
  content_hash: string
  storage_provider: string
  object_key: string
  uploaded_by: string | null
  uploaded_at: string
  deduplicated: boolean
  has_thumbnail: boolean
  has_preview: boolean
}

export interface FileCreateRequest {
  workspace_id: string
  file_name: string
  mime_type?: string
  file_size?: number
  object_key: string
  public_url?: string
}

export interface FileLinkRequest {
  block_id?: string | null
}

export interface CleanupOrphansRequest {
  workspace_id?: string
}

export interface CleanupOrphansResponse {
  deleted: number
}
