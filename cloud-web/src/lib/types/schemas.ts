import { z } from "zod";

export const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const RegisterSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().optional(),
});

export const WorkspaceCreateSchema = z.object({
  name: z.string().min(1).max(80),
  description: z.string().optional(),
  settings: z.record(z.string(), z.unknown()).optional(),
});

export const EntityCreateSchema = z.object({
  workspace_id: z.string().uuid(),
  entity_type_id: z.string().uuid(),
  title: z.string().optional(),
  icon: z.string().optional(),
  cover_image: z.string().nullable().optional(),
  properties: z.record(z.string(), z.unknown()).optional(),
});

export const BlockCreateSchema = z.object({
  entity_id: z.string().uuid(),
  parent_block_id: z.string().uuid().nullable().optional(),
  block_type: z.string(),
  position: z.number().nullable().optional(),
  content: z.record(z.string(), z.unknown()).optional(),
});

export const RelationCreateSchema = z.object({
  workspace_id: z.string().uuid(),
  source_entity_id: z.string().uuid(),
  target_entity_id: z.string().uuid(),
  relation_type: z.string(),
  generated_by: z.enum(["manual", "ai"]).optional().default("manual"),
  verified: z.boolean().optional().default(true),
  confidence: z.number().min(0).max(1).nullable().optional(),
  ai_model: z.string().nullable().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const TagCreateSchema = z.object({
  workspace_id: z.string().uuid(),
  name: z.string().min(1),
  color: z.string().nullable().optional(),
});

export const CommentCreateSchema = z.object({
  workspace_id: z.string().uuid(),
  entity_id: z.string().uuid().nullable().optional(),
  block_id: z.string().uuid().nullable().optional(),
  parent_comment_id: z.string().uuid().nullable().optional(),
  content: z.string().min(1),
});

export const BranchCreateSchema = z.object({
  workspace_id: z.string().uuid(),
  parent_branch_id: z.string().uuid().nullable().optional(),
  name: z.string().min(1),
  description: z.string().optional(),
  is_default: z.boolean().optional().default(false),
});

export const SearchQuerySchema = z.object({
  workspace_id: z.string().uuid(),
  q: z.string().min(1),
  mode: z.enum(["keyword", "full_text", "hybrid", "semantic"]).optional().default("hybrid"),
  limit: z.number().min(1).max(30).optional().default(20),
});

export const AIQuerySchema = z.object({
  workspace_id: z.string().uuid(),
  question: z.string().min(2),
  limit: z.number().min(1).max(20).optional().default(8),
});

export type LoginInput = z.infer<typeof LoginSchema>;
export type RegisterInput = z.infer<typeof RegisterSchema>;
export type WorkspaceCreateInput = z.infer<typeof WorkspaceCreateSchema>;
export type EntityCreateInput = z.infer<typeof EntityCreateSchema>;
export type BlockCreateInput = z.infer<typeof BlockCreateSchema>;
export type RelationCreateInput = z.infer<typeof RelationCreateSchema>;
export type TagCreateInput = z.infer<typeof TagCreateSchema>;
export type CommentCreateInput = z.infer<typeof CommentCreateSchema>;
export type BranchCreateInput = z.infer<typeof BranchCreateSchema>;
export type SearchQueryInput = z.infer<typeof SearchQuerySchema>;
export type AIQueryInput = z.infer<typeof AIQuerySchema>;
