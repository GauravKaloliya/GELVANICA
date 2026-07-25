declare const __brand: unique symbol
type Brand<T, B extends string> = T & { readonly [__brand]: B }

export type WorkspaceId = Brand<string, 'WorkspaceId'>
export type EntityId = Brand<string, 'EntityId'>
export type BlockId = Brand<string, 'BlockId'>
export type TagId = Brand<string, 'TagId'>
export type UserId = Brand<string, 'UserId'>
export type BackupId = Brand<string, 'BackupId'>
export type FileId = Brand<string, 'FileId'>
export type RelationId = Brand<string, 'RelationId'>
export type CommentId = Brand<string, 'CommentId'>
export type BranchId = Brand<string, 'BranchId'>
export type VersionId = Brand<string, 'VersionId'>
export type SnapshotId = Brand<string, 'SnapshotId'>
export type PropertyId = Brand<string, 'PropertyId'>
export type EntityTypeId = Brand<string, 'EntityTypeId'>

export function toWorkspaceId(id: string): WorkspaceId { return id as WorkspaceId }
export function toEntityId(id: string): EntityId { return id as EntityId }
export function toBlockId(id: string): BlockId { return id as BlockId }
export function toTagId(id: string): TagId { return id as TagId }
export function toUserId(id: string): UserId { return id as UserId }
export function toBackupId(id: string): BackupId { return id as BackupId }
export function toFileId(id: string): FileId { return id as FileId }
export function toRelationId(id: string): RelationId { return id as RelationId }
export function toCommentId(id: string): CommentId { return id as CommentId }
export function toBranchId(id: string): BranchId { return id as BranchId }
export function toVersionId(id: string): VersionId { return id as VersionId }
export function toSnapshotId(id: string): SnapshotId { return id as SnapshotId }
export function toPropertyId(id: string): PropertyId { return id as PropertyId }
export function toEntityTypeId(id: string): EntityTypeId { return id as EntityTypeId }
