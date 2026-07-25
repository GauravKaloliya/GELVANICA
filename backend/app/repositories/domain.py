from __future__ import annotations

from datetime import datetime, timedelta, timezone
from decimal import Decimal
from typing import Any, List, Optional

from sqlalchemy import func, or_
from sqlalchemy.orm import joinedload

from app.core.constants import DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE, QUARANTINE_DEFAULT_EXPIRATION_DAYS
from app.models import (
    ActivityLog,
    AuthCode,
    Block,
    BlockVersion,
    Branch,
    BranchMerge,
    Changeset,
    Comment,
    CommentReaction,
    Embedding,
    Entity,
    EntityBranchHead,
    EntityEvent,
    EntityFile,
    EntityPropertyValue,
    EntityTag,
    EntityType,
    EntityVersion,
    File,
    FileVariant,
    GovernanceReport,
    GraphMaterialization,
    Invite,
    Job,
    MergeConflict,
    Notification,
    Property,
    Relation,
    SearchDocument,
    Session,
    Snapshot,
    SyncOperation,
    Tag,
    User,
    Workspace,
    WorkspaceMember,
)

from app.repositories.base import BaseRepository


class UserRepository(BaseRepository):
    model = User

    # NOTE: Requires functional index on LOWER(email) for performance
    def find_by_email(self, email: str) -> Optional[User]:
        return self.query().filter(func.lower(User.email) == email.lower()).first()


class SessionRepository(BaseRepository):
    model = Session

    def find_active_refresh(self, refresh_jti: str) -> Optional[Session]:
        return self.query(include_deleted=True).filter(
            Session.refresh_jti == refresh_jti,
            Session.revoked_at.is_(None),
            Session.expires_at > func.now(),
        ).first()

    def find_by_any_jti(self, jti: str) -> Optional[Session]:
        return self.query(include_deleted=True).filter(
            (self.model.jti == jti) | (self.model.refresh_jti == jti),
        ).first()


class AuthCodeRepository(BaseRepository):
    model = AuthCode

    def find_by_code(self, code: str) -> Optional[AuthCode]:
        return self.query(include_deleted=True).filter(AuthCode.code == code).first()


class WorkspaceRepository(BaseRepository):
    model = Workspace

    def list(self, filters=None, page=1, per_page=DEFAULT_PAGE_SIZE, order_by=None, descending=True, *options):
        query = self.query()
        filters = dict(filters or {})
        search = filters.pop("search", None)
        if filters:
            query = self._apply_filters(query, filters)
        if search:
            from sqlalchemy import or_
            query = query.filter(
                or_(
                    self.model.name.ilike(f"%{search}%"),
                    self.model.description.ilike(f"%{search}%"),
                )
            )
        for opt in options:
            query = query.options(opt)
        if order_by and hasattr(self.model, order_by):
            col = getattr(self.model, order_by)
            if col:
                query = query.order_by(col.desc() if descending else col.asc())
        elif hasattr(self.model, "created_at"):
            query = query.order_by(self.model.created_at.desc())
        return query.paginate(page=page, per_page=min(per_page, MAX_PAGE_SIZE), error_out=False)


class WorkspaceMemberRepository(BaseRepository):
    model = WorkspaceMember

    def membership(self, workspace_id: str, user_id: str) -> Optional[WorkspaceMember]:
        return self.query().filter_by(workspace_id=workspace_id, user_id=user_id).first()


class EntityTypeRepository(BaseRepository):
    model = EntityType


class PropertyRepository(BaseRepository):
    model = Property


class EntityPropertyValueRepository(BaseRepository):
    model = EntityPropertyValue


class EntityRepository(BaseRepository):
    model = Entity


class BlockRepository(BaseRepository):
    model = Block

    def get(self, id: str, include_deleted: bool = False, branch_id: Optional[str] = None, **kwargs) -> Optional[Block]:
        """Retrieve a block by ID. branch_id is accepted for API compatibility with local mode."""
        return super().get(id, include_deleted=include_deleted)

    def next_position(self, entity_id: str, parent_block_id: Optional[str] = None) -> Decimal:
        query = self.session.query(func.coalesce(func.max(Block.position), 0)).filter(
            Block.entity_id == entity_id,
            Block.is_deleted.is_(False),
        )
        if parent_block_id is not None:
            query = query.filter(Block.parent_block_id == parent_block_id)
        else:
            query = query.filter(Block.parent_block_id.is_(None))
        return query.scalar() + 1000


class RelationRepository(BaseRepository):
    model = Relation

    def backlinks(self, entity_id: str, limit: int = 100, offset: int = 0) -> List[Relation]:
        return self.query().filter(Relation.target_id == entity_id).limit(limit).offset(offset).all()

    def neighbors(self, entity_id: str, limit: int = 100, offset: int = 0) -> List[Relation]:
        return self.query().filter(
            or_(Relation.source_id == entity_id, Relation.target_id == entity_id)
        ).limit(limit).offset(offset).all()


class BranchRepository(BaseRepository):
    model = Branch


class SnapshotRepository(BaseRepository):
    model = Snapshot


class ChangesetRepository(BaseRepository):
    model = Changeset


class EntityVersionRepository(BaseRepository):
    model = EntityVersion


class EntityBranchHeadRepository(BaseRepository):
    model = EntityBranchHead


class BranchMergeRepository(BaseRepository):
    model = BranchMerge


class MergeConflictRepository(BaseRepository):
    model = MergeConflict

    def list_for_merge(self, merge_id: str, page: int = 1, per_page: int = DEFAULT_PAGE_SIZE):
        return self.query().filter(MergeConflict.merge_id == merge_id).paginate(page=page, per_page=per_page, error_out=False)

    def list_unresolved(self, workspace_id: str, page: int = 1, per_page: int = 50):
        return self.session.query(MergeConflict).options(joinedload(MergeConflict.entity)).filter(
            MergeConflict.workspace_id == workspace_id,
            MergeConflict.resolved_at.is_(None),
            MergeConflict.is_deleted.is_(False),
        ).paginate(page=page, per_page=per_page, error_out=False)


class EntityEventRepository(BaseRepository):
    model = EntityEvent


class EmbeddingRepository(BaseRepository):
    model = Embedding


class SearchDocumentRepository(BaseRepository):
    model = SearchDocument


class FileRepository(BaseRepository):
    model = File

    def __init__(self, model=None, session=None, storage_provider=None):
        super().__init__(model, session)

    def find_by_hash(self, content_hash: str, workspace_id: Optional[str] = None) -> Optional[File]:
        query = self.query().filter(File.content_hash == content_hash)
        if workspace_id:
            query = query.filter(File.workspace_id == workspace_id)
        return query.first()

    def hard_delete(self, item: File) -> None:
        self.session.delete(item)

    def cleanup_orphans(self, workspace_id: Optional[str] = None) -> int:
        """Remove orphaned records. Uses soft-delete to preserve audit trail."""
        query = self.session.query(self.model).filter(self.model.is_deleted.is_(False))
        if workspace_id:
            query = query.filter(self.model.workspace_id == workspace_id)

        orphan_files = (
            query.filter(
                ~self.session.query(EntityFile)
                .filter(
                    EntityFile.file_id == self.model.id,
                    EntityFile.is_deleted.is_(False),
                )
                .exists()
            )
            .all()
        )

        count = 0
        now = datetime.now(timezone.utc)
        for file_record in orphan_files:
            file_record.is_deleted = True
            file_record.deleted_at = now
            file_record.state = "DELETED"
            count += 1
        self.session.flush()
        return count

    def find_pending_expired(self, hours: int = 24, limit: int = 1000) -> List[File]:
        cutoff = datetime.now(timezone.utc) - timedelta(hours=hours)
        return self.query().filter(
            File.state == "PENDING",
            File.uploaded_at <= cutoff,
        ).limit(limit).all()

    def find_quarantined_expired(self, days: int = QUARANTINE_DEFAULT_EXPIRATION_DAYS, limit: int = 1000) -> List[File]:
        cutoff = datetime.now(timezone.utc) - timedelta(days=days)
        return self.query().filter(
            File.state == "QUARANTINED",
            File.updated_at <= cutoff,
        ).limit(limit).all()

    def find_deleted_pending_cleanup(self, days: int = QUARANTINE_DEFAULT_EXPIRATION_DAYS, limit: int = 1000) -> List[File]:
        cutoff = datetime.now(timezone.utc) - timedelta(days=days)
        return self.query(include_deleted=True).filter(
            File.state == "DELETED",
            File.deleted_at <= cutoff,
            File.is_deleted.is_(True),
        ).limit(limit).all()


class EntityFileRepository(BaseRepository):
    model = EntityFile


class FileVariantRepository(BaseRepository):
    model = FileVariant

    def list_for_file(self, file_id: str, limit: int = 100, offset: int = 0) -> List[FileVariant]:
        return self.query().filter(FileVariant.file_id == file_id).limit(limit).offset(offset).all()

    def find_active_variant(self, file_id: str, variant_type: str) -> Optional[FileVariant]:
        return self.query().filter(
            FileVariant.file_id == file_id,
            FileVariant.variant_type == variant_type,
        ).first()

    def soft_delete_variants_for_file(self, file_id: str, variant_type: Optional[str] = None) -> None:
        from sqlalchemy import update
        stmt = (
            update(FileVariant)
            .where(FileVariant.file_id == file_id)
            .where(FileVariant.is_deleted.is_(False))
        )
        if variant_type:
            stmt = stmt.where(FileVariant.variant_type == variant_type)
        stmt = stmt.values(
            is_deleted=True,
            deleted_at=datetime.now(timezone.utc),
        )
        self.session.execute(stmt)


class NotificationRepository(BaseRepository):
    model = Notification


class JobRepository(BaseRepository):
    model = Job

    def get_for_update(self, job_id: str):
        return self.query(include_deleted=True).filter(
            Job.id == job_id
        ).with_for_update().first()

    def find_stale_running(self, timeout_minutes: int = 30, limit: int = 1000):
        cutoff = datetime.now(timezone.utc) - timedelta(minutes=timeout_minutes)
        return self.query(include_deleted=True).filter(
            Job.status == "running",
            Job.started_at <= cutoff,
        ).limit(limit).all()

    def reset_stale(self, job: Job) -> Job:
        job.retry_count = (job.retry_count or 0) + 1
        if job.retry_count >= (job.max_retries or 3):
            job.status = "dead_letter"
            job.error = "Stale after crash, retries exhausted"
        else:
            job.status = "pending"
            job.started_at = None
            job.error = f"Reset from stale running (retry {job.retry_count})"
        return job


class ActivityLogRepository(BaseRepository):
    model = ActivityLog

    def list_for_workspace(self, workspace_id: str, page: int = 1, per_page: int = DEFAULT_PAGE_SIZE,
                           extra_filters: dict | None = None) -> Any:
        query = self.query(include_deleted=True).filter(ActivityLog.workspace_id == workspace_id)
        for key, value in (extra_filters or {}).items():
            if key == "start_date" and value:
                query = query.filter(ActivityLog.created_at >= value)
            elif key == "end_date" and value:
                query = query.filter(ActivityLog.created_at <= value)
            elif value is not None and hasattr(ActivityLog, key):
                query = query.filter(getattr(ActivityLog, key) == value)
        return query.order_by(ActivityLog.created_at.desc()).paginate(page=page, per_page=per_page, error_out=False)


class BlockVersionRepository(BaseRepository):
    model = BlockVersion

    def list_for_block(self, block_id: str, page: int = 1, per_page: int = DEFAULT_PAGE_SIZE) -> Any:
        return (
            self.query(include_deleted=True)
            .filter(BlockVersion.block_id == block_id)
            .order_by(BlockVersion.created_at.desc())
            .paginate(page=page, per_page=per_page, error_out=False)
        )


class CommentRepository(BaseRepository):
    model = Comment

    def list_for_entity(self, entity_id: str, page: int = 1, per_page: int = DEFAULT_PAGE_SIZE) -> Any:
        return (
            self.query()
            .filter(Comment.entity_id == entity_id, Comment.parent_id.is_(None))
            .order_by(Comment.created_at.asc())
            .paginate(page=page, per_page=per_page, error_out=False)
        )

    def list_replies(self, parent_id: str, page: int = 1, per_page: int = DEFAULT_PAGE_SIZE) -> Any:
        return (
            self.query()
            .filter(Comment.parent_id == parent_id)
            .order_by(Comment.created_at.asc())
            .paginate(page=page, per_page=per_page, error_out=False)
        )


class SyncOperationRepository(BaseRepository):
    model = SyncOperation

    def pending_for_workspace(self, workspace_id: str, page: int = 1, per_page: int = DEFAULT_PAGE_SIZE) -> Any:
        return (
            self.query()
            .filter(SyncOperation.workspace_id == workspace_id, SyncOperation.synced.is_(False))
            .order_by(SyncOperation.created_at.asc())
            .paginate(page=page, per_page=per_page, error_out=False)
        )


class GraphMaterializationRepository(BaseRepository):
    model = GraphMaterialization

    def latest(self, workspace_id: str) -> Optional[GraphMaterialization]:
        return (
            self.session.query(GraphMaterialization)
            .filter(GraphMaterialization.workspace_id == workspace_id)
            .order_by(GraphMaterialization.generated_at.desc())
            .first()
        )


class GovernanceReportRepository(BaseRepository):
    model = GovernanceReport


class TagRepository(BaseRepository):
    model = Tag


class InviteRepository(BaseRepository):
    model = Invite

    def find_by_token(self, token: str) -> Optional[Invite]:
        return self.query().filter(Invite.token == token).first()

    def find_pending_for_workspace(self, workspace_id: str, page: int = 1, per_page: int = DEFAULT_PAGE_SIZE) -> Any:
        return self.query().filter(
            Invite.workspace_id == workspace_id,
            Invite.status == "pending",
        ).paginate(page=page, per_page=per_page, error_out=False)

    def find_pending_for_email(self, email: str) -> List[Invite]:
        return self.query().filter(
            Invite.email == email,
            Invite.status == "pending",
        ).all()


class CommentReactionRepository(BaseRepository):
    model = CommentReaction

    def list_for_comment(self, comment_id: str, limit: int = 100, offset: int = 0) -> List[CommentReaction]:
        return self.query().filter(CommentReaction.comment_id == comment_id).limit(limit).offset(offset).all()

    def find_user_reaction(self, comment_id: str, user_id: str, reaction: str) -> Optional[CommentReaction]:
        return self.query().filter(
            CommentReaction.comment_id == comment_id,
            CommentReaction.user_id == user_id,
            CommentReaction.reaction == reaction,
        ).first()


class EntityTagRepository(BaseRepository):
    model = EntityTag

    def list_for_entity(self, entity_id: str, limit: int = 100, offset: int = 0) -> List[EntityTag]:
        return self.query().filter(EntityTag.entity_id == entity_id).limit(limit).offset(offset).all()

    def list_for_tag(self, tag_id: str, limit: int = 100, offset: int = 0) -> List[EntityTag]:
        return self.query().filter(EntityTag.tag_id == tag_id).limit(limit).offset(offset).all()
