export type FileState = 'PENDING' | 'UPLOADED' | 'VALIDATING' | 'READY' | 'QUARANTINED' | 'DELETED';

export interface FileRecord {
  id: string;
  workspace_id: string;
  file_name: string;
  mime_type: string | null;
  file_size: number | null;
  content_hash: string;
  state: FileState;
  storage_provider: string;
  object_key: string;
  uploaded_by: string | null;
  uploaded_at: string;
  has_extracted_text: boolean;
  has_metadata: boolean;
  variants: FileVariant[];
  is_deleted: boolean;
  deleted_at: string | null;
  deleted_by: string | null;
  linked_entity_ids?: string[];
}

export interface EntityFile {
  id: string;
  entity_id: string;
  file_id: string;
  block_id: string | null;
  created_at: string;
  is_deleted: boolean;
  deleted_at: string | null;
  deleted_by: string | null;
}

export interface FileVariant {
  id: string;
  file_id: string;
  variant_type: string;
  object_key: string;
  mime_type: string;
  width: number | null;
  height: number | null;
  file_size: number;
  algorithm: string | null;
  algorithm_version: string | null;
  quality: number | null;
  created_at: string;
  is_deleted: boolean;
  deleted_at: string | null;
  deleted_by: string | null;
}

export interface FileUploadResult {
  id: string;
  file_name: string;
  mime_type: string;
  file_size: number;
  workspace_id: string;
  content_hash: string;
  storage_provider: string;
  object_key: string;
  state: FileState;
  deduplicated: boolean;
  has_thumbnail: boolean;
  has_preview: boolean;
  presigned_url?: string;
  uploaded_by: string | null;
  uploaded_at: string;
}

export interface PresignResult {
  enabled: boolean;
  upload_url?: string;
  object_key?: string;
  file_id?: string;
  expires_at?: string;
  deduplicated?: boolean;
  file?: FileRecord;
}

export interface PresignUploadSchema {
  workspace_id: string;
  file_name: string;
  content_type: string;
  file_size: number;
  content_hash: string;
}

export interface MultipartInitSchema {
  workspace_id: string;
  file_name: string;
  content_type: string;
  content_length: number;
  part_size: number;
}

export interface MultipartInitResult {
  upload_id: string;
  file_id: string;
  object_key: string;
  part_size: number;
  presigned_urls: Array<{
    part_number: number;
    presigned_url: string;
    part_size: number;
  }>;
}

export interface MultipartPartSchema {
  PartNumber: number;
  ETag: string;
}

export interface MultipartCompleteSchema {
  upload_id: string;
  file_id: string;
  parts: MultipartPartSchema[];
}

export interface QuarantineResolveSchema {
  approve: boolean;
}
