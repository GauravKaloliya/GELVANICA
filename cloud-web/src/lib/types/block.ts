export type BlockType =
  | "text"
  | "heading_1"
  | "heading_2"
  | "heading_3"
  | "bulleted_list"
  | "numbered_list"
  | "to_do"
  | "code"
  | "quote"
  | "callout"
  | "image"
  | "divider"
  | "table"
  | "toggle"
  | "embed"
  | "equation"
  | "mention"
  | "ai";

export type BlockContent =
  | { text: string }
  | { text: string; checked: boolean }
  | { text: string; language: string }
  | { text: string; icon: string }
  | { text: string; open: boolean }
  | { url: string; alt: string }
  | { url: string; title?: string }
  | { text: string; display?: boolean }
  | { text: string; entity_id?: string; entity_title?: string; mention_type?: string }
  | { text: string; prompt?: string; model?: string }
  | Record<string, never>
  | { rows: unknown[]; columns: unknown[] };

export interface Block {
  id: string;
  entity_id: string;
  parent_block_id: string | null;
  block_type: BlockType;
  position: number;
  indent: number;
  content: BlockContent;
  is_deleted: boolean;
  deleted_at: string | null;
  deleted_by: string | null;
  created_at: string;
  updated_at: string;
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
