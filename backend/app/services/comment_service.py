from sqlalchemy.exc import IntegrityError

from app.core.errors import ApiError, ConflictError, ForbiddenError, NotFoundError
from app.core.sanitization import sanitize_text
from app.extensions import db
from app.repositories import CommentRepository

from app.core.logging import logger


def _comment_model():
    try:
        from app.models import Comment as _m
        from sqlalchemy import inspect
        inspect(_m)
        return _m
    except Exception:
        return None


class CommentService:
    def __init__(self, comment_repo=None):
        self.comment_repo = comment_repo or CommentRepository()

    @staticmethod
    def _to_dict(comment) -> dict:
        return {
            "id": str(comment.id),
            "entity_id": str(comment.entity_id) if comment.entity_id else None,
            "workspace_id": str(comment.workspace_id) if comment.workspace_id else None,
            "block_id": str(comment.block_id) if comment.block_id else None,
            "user_id": str(comment.user_id) if comment.user_id else None,
            "display_name": comment.display_name if hasattr(comment, 'display_name') else None,
            "avatar_url": comment.avatar_url if hasattr(comment, 'avatar_url') else None,
            "content": comment.content,
            "parent_id": str(comment.parent_id) if comment.parent_id else None,
            "resolved": comment.resolved if hasattr(comment, 'resolved') else False,
            "created_at": comment.created_at.isoformat() if comment.created_at else None,
            "updated_at": comment.updated_at.isoformat() if comment.updated_at else None,
            "is_deleted": comment.is_deleted if hasattr(comment, 'is_deleted') else False,
            "deleted_at": comment.deleted_at.isoformat() if hasattr(comment, 'deleted_at') and comment.deleted_at else None,
            "deleted_by": str(comment.deleted_by) if hasattr(comment, 'deleted_by') and comment.deleted_by else None,
        }

    def create(self, data: dict, user_id: str) -> dict:
        Comment = _comment_model()
        if Comment is None:
            raise ApiError("Comments are only available in cloud mode", 400, "cloud_only")
        content = data.get("content", "")
        if not content or not isinstance(content, str) or len(content.strip()) < 1:
            raise ApiError("Comment content is required", 400, "bad_request")
        if len(content) > 50000:
            raise ApiError("Comment content exceeds maximum length", 400, "bad_request")
        data["content"] = sanitize_text(content)
        existing = Comment.query.with_for_update().filter_by(
            entity_id=data["entity_id"],
            content=data["content"],
            user_id=user_id,
            is_deleted=False,
        ).first()
        if existing:
            raise ConflictError("Comment already exists")
        comment = self.comment_repo.create({**data, "user_id": user_id})
        try:
            db.session.commit()
        except IntegrityError:
            db.session.rollback()
            raise ConflictError("Comment already exists")
        except Exception:
            db.session.rollback()
            raise
        logger.info("comment_created", extra={"comment_id": str(comment.id), "entity_id": data.get("entity_id"), "user_id": user_id})
        return self._to_dict(comment)

    def list_by_entity(self, entity_id: str, page: int = 1, per_page: int = 50) -> dict:
        query = self.comment_repo.query()
        if hasattr(self.comment_repo.model, 'entity_id'):
            query = query.filter(
                self.comment_repo.model.entity_id == entity_id,
                self.comment_repo.model.is_deleted.is_(False),
            ).order_by(self.comment_repo.model.created_at.asc())
        pagination = query.paginate(page=page, per_page=per_page, error_out=False)
        return {
            "items": [self._to_dict(c) for c in pagination.items],
            "total": pagination.total,
            "page": page,
            "per_page": per_page,
        }

    def update(self, comment_id: str, data: dict, user_id: str) -> dict:
        Comment = _comment_model()
        if Comment is None:
            raise ApiError("Comments are only available in cloud mode", 400, "cloud_only")
        comment = Comment.query.with_for_update().filter(Comment.id == comment_id).first()
        if not comment:
            raise NotFoundError("Comment not found")
        if str(comment.user_id) != str(user_id):
            raise ForbiddenError("Not authorized to edit this comment")
        content = data.get("content")
        if content is None:
            raise ApiError("content is required for update", 400)
        data["content"] = sanitize_text(content)
        update_fields = {k: v for k, v in data.items() if k in ("content", "display_name", "avatar_url", "resolved")}
        self.comment_repo.update(comment, update_fields)
        try:
            db.session.commit()
        except Exception:
            db.session.rollback()
            raise
        logger.info("comment_updated", extra={"comment_id": comment_id, "user_id": user_id})
        return self._to_dict(comment)

    def delete(self, comment_id: str, user_id: str) -> dict:
        Comment = _comment_model()
        if Comment is None:
            raise ApiError("Comments are only available in cloud mode", 400, "cloud_only")
        comment = Comment.query.with_for_update().filter(Comment.id == comment_id).first()
        if not comment:
            raise NotFoundError("Comment not found")
        if str(comment.user_id) != str(user_id):
            raise ForbiddenError("Not authorized to delete this comment")
        self.comment_repo.soft_delete(comment, deleted_by=user_id)
        try:
            db.session.commit()
        except Exception:
            db.session.rollback()
            raise
        logger.info("comment_deleted", extra={"comment_id": comment_id, "user_id": user_id})
        return self._to_dict(comment)

    def restore(self, comment_id: str) -> dict:
        Comment = _comment_model()
        if Comment is None:
            raise ApiError("Comments are only available in cloud mode", 400, "cloud_only")
        comment = Comment.query.with_for_update().filter(Comment.id == comment_id).first()
        if not comment:
            raise NotFoundError("Comment not found")
        comment.is_deleted = False
        comment.deleted_at = None
        comment.deleted_by = None
        try:
            db.session.commit()
        except Exception:
            db.session.rollback()
            raise
        return self._to_dict(comment)


