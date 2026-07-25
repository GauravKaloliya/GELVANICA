from app.repositories.base import BaseRepository
from app.repositories.mixins import WorkspaceScopedMixin

from app.repositories.domain import (
    ActivityLogRepository,
    AuthCodeRepository,
    BlockRepository,
    BlockVersionRepository,
    BranchMergeRepository,
    BranchRepository,
    ChangesetRepository,
    CommentReactionRepository,
    CommentRepository,
    EmbeddingRepository,
    EntityBranchHeadRepository,
    EntityEventRepository,
    EntityFileRepository,
    EntityPropertyValueRepository,
    EntityRepository,
    EntityTagRepository,
    EntityTypeRepository,
    EntityVersionRepository,
    FileRepository,
    FileVariantRepository,
    GovernanceReportRepository,
    GraphMaterializationRepository,
    InviteRepository,
    JobRepository,
    MergeConflictRepository,
    NotificationRepository,
    PropertyRepository,
    RelationRepository,
    SearchDocumentRepository,
    SessionRepository,
    SnapshotRepository,
    SyncOperationRepository,
    TagRepository,
    UserRepository,
    WorkspaceMemberRepository,
    WorkspaceRepository,
)

from app.repositories.local import (
    ActivityLogRepository as LocalActivityLogRepository,
    BlockRepository as LocalBlockRepository,
    FileRepository as LocalFileRepository,
)

import os
if os.environ.get("GNOVIUM_MODE", "local").strip().lower() != "cloud":
    ActivityLogRepository = LocalActivityLogRepository
    BlockRepository = LocalBlockRepository
    FileRepository = LocalFileRepository

BlockRepo = BlockRepository
FileRepo = FileRepository
ActivityLogRepo = ActivityLogRepository

__all__ = [
    "BaseRepository", "WorkspaceScopedMixin",
    "ActivityLogRepository",
    "AuthCodeRepository",
    "BlockRepository",
    "BlockRepo",
    "BlockVersionRepository",
    "BranchMergeRepository",
    "BranchRepository",
    "ChangesetRepository",
    "CommentReactionRepository",
    "CommentRepository",
    "EmbeddingRepository",
    "EntityBranchHeadRepository",
    "EntityEventRepository",
    "EntityFileRepository",
    "EntityPropertyValueRepository",
    "EntityRepository",
    "EntityTagRepository",
    "EntityTypeRepository",
    "EntityVersionRepository",
    "FileRepository",
    "FileRepo",
    "FileVariantRepository",
    "GovernanceReportRepository",
    "GraphMaterializationRepository",
    "InviteRepository",
    "JobRepository",
    "MergeConflictRepository",
    "NotificationRepository",
    "PropertyRepository",
    "RelationRepository",
    "SearchDocumentRepository",
    "SessionRepository",
    "SnapshotRepository",
    "SyncOperationRepository",
    "TagRepository",
    "UserRepository",
    "WorkspaceMemberRepository",
    "WorkspaceRepository",
]
