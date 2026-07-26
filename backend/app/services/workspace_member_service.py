from typing import Any, Dict

from flask import current_app
from sqlalchemy.orm import joinedload

from app.core.errors import ApiError, ConflictError, NotFoundError
from app.core.logging import logger
from app.extensions import db
from app.repositories import WorkspaceMemberRepository


def _ensure_member_cloud():
    if current_app.config.get("GNOVIUM_MODE") != "cloud":
        raise ApiError("Workspace members are only available in cloud mode", 400, "cloud_only")


def _workspace_member_model():
    try:
        from app.models import WorkspaceMember as _m
        from sqlalchemy import inspect
        inspect(_m)
        return _m
    except Exception:
        return None


def _user_model():
    try:
        from app.models import User as _m
        from sqlalchemy import inspect
        inspect(_m)
        return _m
    except Exception:
        return None


VALID_ROLES = {"owner", "admin", "editor", "viewer"}


class WorkspaceMemberService:
    """Service for managing workspace membership and roles."""

    def _presign_url(self, url):
        if url and isinstance(url, str) and url.startswith("v1/"):
            from flask import current_app
            from app.services.storage_provider import create_storage_provider
            provider = create_storage_provider(current_app.config)
            return provider.presign_download(url, expires_in=3600)
        return url

    def _fill_member_display(self, member):
        if hasattr(member, 'user') and member.user:
            if not member.display_name:
                member.display_name = member.user.name or ""
            if not member.email:
                member.email = member.user.email
            if not member.avatar_url and member.user.avatar_url:
                member.avatar_url = member.user.avatar_url
        member.avatar_url = self._presign_url(member.avatar_url)
        return member

    def list_members(self, workspace_id: str, page: int = 1, per_page: int = 25, search: str = None) -> Any:
        _ensure_member_cloud()
        """List all members of a workspace, paginated."""
        WorkspaceMember = _workspace_member_model()
        User = _user_model()
        if WorkspaceMember is None or User is None:
            _ensure_member_cloud()
        if search:
            query = WorkspaceMember.query.options(db.joinedload(WorkspaceMember.user)).filter(
                WorkspaceMember.workspace_id == workspace_id,
                WorkspaceMember.is_deleted.is_(False),
            ).join(User, WorkspaceMember.user_id == User.id).filter(
                db.or_(
                    User.name.ilike(f"%{search}%"),
                    User.email.ilike(f"%{search}%"),
                )
            ).order_by(WorkspaceMember.joined_at.desc())
            result = query.paginate(page=page, per_page=per_page, error_out=False)
            if hasattr(result, 'items'):
                for m in result.items:
                    self._fill_member_display(m)
            return result
        result = WorkspaceMemberRepository().list(
            {"workspace_id": workspace_id}, page, per_page,
            "joined_at", True,
            joinedload(WorkspaceMember.user),
        )
        if hasattr(result, 'items'):
            for m in result.items:
                self._fill_member_display(m)
        return result

    def get_member(self, workspace_id: str, user_id: str, for_update: bool = False) -> Any:
        """Get a single workspace membership, or raise NotFoundError.

        Args:
            for_update: If True, uses FOR UPDATE row lock for write safety.
        """
        WorkspaceMember = _workspace_member_model()
        if WorkspaceMember is None:
            _ensure_member_cloud()
        query = WorkspaceMember.query.filter_by(workspace_id=workspace_id, user_id=user_id, is_deleted=False)
        if for_update:
            query = query.with_for_update()
        membership = query.first()
        if not membership:
            raise NotFoundError("Member not found")
        return membership

    def invite(self, workspace_id: str, data: Dict[str, Any]) -> Any:
        """Invite a user to a workspace by email."""
        _ensure_member_cloud()
        WorkspaceMember = _workspace_member_model()
        User = _user_model()
        email = data.get("email")
        if not email:
            raise ApiError("Email is required", 400)

        role = data.get("role")
        if role and role not in VALID_ROLES:
            raise ApiError(f"Invalid role: {role}. Must be one of: {', '.join(VALID_ROLES)}", 400)

        user = User.query.filter(User.email.ilike(email)).first()
        if not user:
            raise ApiError("No user found with that email", 404, "not_found")

        existing = WorkspaceMember.query.with_for_update().filter_by(workspace_id=workspace_id, user_id=user.id, is_deleted=False).first()
        if existing:
            raise ConflictError("User is already a member of this workspace")

        member = WorkspaceMemberRepository().create({
            "workspace_id": workspace_id,
            "user_id": user.id,
            "role": data.get("role", "editor"),
            "display_name": user.name or "",
            "email": user.email,
            "avatar_url": user.avatar_url,
        })
        try:
            db.session.commit()
        except Exception:
            db.session.rollback()
            raise
        logger.info("workspace_member_added", extra={"workspace_id": workspace_id, "user_id": str(user.id), "role": data.get("role", "editor")})
        return member

    def update_role(self, workspace_id: str, user_id: str, data: Dict[str, Any]) -> Any:
        """Update a member's role within a workspace."""
        _workspace_member_model()
        membership = self.get_member(workspace_id, user_id, for_update=True)
        if membership.role == "owner":
            raise ApiError("Cannot change the owner's role", 400, "bad_request")

        new_role = data.get("role")
        if not new_role:
            raise ApiError("Role is required", 400)
        if new_role not in VALID_ROLES:
            raise ApiError(f"Invalid role: {new_role}. Must be one of: {', '.join(VALID_ROLES)}", 400)

        # Prevent demoting the last admin
        if new_role != "admin" and membership.role == "admin":
            admin_count = WorkspaceMemberRepository().count(
                {"workspace_id": workspace_id, "role": "admin"}
            )
            if admin_count <= 1:
                raise ApiError("Cannot demote the last admin", 400)

        WorkspaceMemberRepository().update(membership, {"role": new_role})
        try:
            db.session.commit()
        except Exception:
            db.session.rollback()
            raise
        logger.info("workspace_member_role_updated", extra={"workspace_id": workspace_id, "user_id": user_id, "new_role": new_role})
        return membership

    def remove(self, workspace_id: str, user_id: str) -> Any:
        """Remove a member from a workspace."""
        _workspace_member_model()
        membership = self.get_member(workspace_id, user_id, for_update=True)
        if membership.role == "owner":
            raise ApiError("Cannot remove the workspace owner", 400, "bad_request")
        if membership.role == "admin":
            admin_count = WorkspaceMemberRepository().count(
                {"workspace_id": workspace_id, "role": "admin"}
            )
            if admin_count <= 1:
                raise ApiError("Cannot remove the last admin", 400)
        WorkspaceMemberRepository().soft_delete(membership)
        try:
            db.session.commit()
        except Exception:
            db.session.rollback()
            raise
        logger.info("workspace_member_removed", extra={"workspace_id": workspace_id, "user_id": user_id})
        return membership
