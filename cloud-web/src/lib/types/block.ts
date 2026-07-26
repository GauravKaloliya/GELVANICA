export type BlockType =
  | "text"
  | "heading"
  | "heading1"
  | "heading2"
  | "heading3"
  | "bulleted_list"
  | "numbered_list"
  | "to-do"
  | "toggle"
  | "code"
  | "quote"
  | "callout"
  | "divider"
  | "image"
  | "video"
  | "file"
  | "bookmark"
  | "equation"
  | "table_of_contents"
  | "column_list"
  | "column"
  | "breadcrumb";

export type BlockContent = Record<string, unknown>;

export interface Block {
  id: string;
  entity_id: string;
  parent_block_id: string | null;
  type: string;
  position: number;
  content: Record<string, unknown>;
  properties: Record<string, unknown>;
  branch_id: string;
  content_hash: string;
  indent: number;
  version: number;
  created_at: string;
  updated_at: string;
  is_deleted: boolean;
  deleted_at: string | null;
  deleted_by: string | null;
}

export interface EmbedBlock {
  url: string;
  title?: string;
}

export interface EquationBlock {
  text: string;
  display?: boolean;
}

export interface MentionBlock {
  text: string;
  entity_id?: string;
  entity_title?: string;
  mention_type?: string;
}

export interface AIBlock {
  text: string;
  prompt?: string;
  model?: string;
}

export interface VideoBlock {
  url: string;
  caption?: string;
}

export interface FileBlock {
  url: string;
  name?: string;
}

export interface BookmarkBlock {
  url: string;
  title?: string;
  description?: string;
  icon?: string;
}

export interface TableOfContentsBlock {
}

export interface ColumnListBlock {
  columns: number;
}

export interface ColumnBlock {
}

export interface BreadcrumbBlock {
}
