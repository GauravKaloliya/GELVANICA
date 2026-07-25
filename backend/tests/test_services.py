"""Unit tests for services with mocked dependencies."""

from unittest.mock import MagicMock, patch

import pytest
from app.core.errors import ApiError, ConflictError, NotFoundError, ForbiddenError


class TestTagService:
    """TagService unit tests with mocked repository."""

    def test_create_tag_success(self, app):
        from app.services.tag_service import TagService
        mock_tag = MagicMock()
        mock_tag.id = "tag-1"
        mock_tag.workspace_id = "ws-1"
        mock_tag.name = "Test Tag"
        mock_tag.color = None
        mock_tag.entity_count = 0
        mock_tag.is_deleted = False
        mock_tag.deleted_at = None
        mock_tag.deleted_by = None
        mock_tag.created_at = None
        mock_tag.updated_at = None

        with app.app_context():
            with patch("app.services.tag_service.Tag") as MockTag:
                MockTag.query.with_for_update.return_value.filter_by.return_value.first.return_value = None
                with patch("app.services.tag_service.TagRepository") as mock_repo_cls:
                    mock_repo = MagicMock()
                    mock_repo.create.return_value = mock_tag
                    mock_repo_cls.return_value = mock_repo
                    with patch("app.services.tag_service.db.session.commit"):
                        result = TagService().create({"name": "Test Tag", "workspace_id": "ws-1"})

        assert result["name"] == "Test Tag"
        assert result["id"] == "tag-1"

    def test_create_tag_missing_name(self):
        from app.services.tag_service import TagService
        with pytest.raises(ApiError, match="Tag name is required"):
            TagService().create({"workspace_id": "ws-1"})

    def test_create_tag_missing_workspace_id(self):
        from app.services.tag_service import TagService
        with pytest.raises(ApiError, match="workspace_id is required"):
            TagService().create({"name": "Test"})

    def test_create_tag_duplicate(self):
        from app.services.tag_service import TagService
        with patch("app.services.tag_service.Tag") as MockTag:
            MockTag.query.with_for_update.return_value.filter_by.return_value.first.return_value = MagicMock()
            with pytest.raises(ConflictError, match="Tag already exists"):
                TagService().create({"name": "Dup", "workspace_id": "ws-1"})

    def test_list_by_workspace(self):
        from app.services.tag_service import TagService
        mock_tag = MagicMock()
        mock_tag.id = "tag-1"
        mock_tag.workspace_id = "ws-1"
        mock_tag.name = "Tag"
        mock_tag.color = None
        mock_tag.entity_count = 0
        mock_tag.is_deleted = False
        mock_tag.deleted_at = None
        mock_tag.deleted_by = None
        mock_tag.created_at = None
        mock_tag.updated_at = None

        mock_pagination = MagicMock()
        mock_pagination.items = [mock_tag]
        mock_pagination.total = 1

        with patch("app.services.tag_service.TagRepository") as mock_repo_cls:
            mock_query = MagicMock()
            mock_query.filter.return_value.order_by.return_value.paginate.return_value = mock_pagination
            mock_repo = MagicMock()
            mock_repo.query.return_value = mock_query
            mock_repo_cls.return_value = mock_repo

            result = TagService().list_by_workspace("ws-1")

        assert result["total"] == 1
        assert len(result["items"]) == 1
        assert result["items"][0]["name"] == "Tag"

    def test_get_entity_tags_returns_empty_list(self, app):
        from app.services.tag_service import TagService
        with app.app_context():
            with patch("app.services.tag_service.EntityTag") as MockEntityTag:
                MockEntityTag.query.filter_by.return_value.all.return_value = []
                result = TagService().get_entity_tags("nonexistent")
        assert result == []


class TestNotificationService:
    """NotificationService unit tests with mocked repository."""

    def test_create_notification_success(self):
        from app.services.notification_service import NotificationService
        mock_notification = MagicMock()
        mock_notification.id = "notif-1"
        mock_notification.user_id = "user-1"
        mock_notification.workspace_id = "ws-1"
        mock_notification.entity_id = None
        mock_notification.type = "system"
        mock_notification.title = "Test"
        mock_notification.body = None
        mock_notification.data = None
        mock_notification.is_read = False
        mock_notification.is_deleted = False
        mock_notification.deleted_at = None
        mock_notification.deleted_by = None
        mock_notification.created_at = None

        with patch("app.services.security.current_user_id", return_value="user-1"):
            with patch("app.services.notification_service.NotificationRepository") as mock_repo_cls:
                mock_repo = MagicMock()
                mock_repo.create.return_value = mock_notification
                mock_repo_cls.return_value = mock_repo

                with patch("app.services.notification_service.db.session.commit"):
                    result = NotificationService().create({
                        "user_id": "user-1", "type": "system", "title": "Test",
                    })

        assert result["title"] == "Test"
        assert result["type"] == "system"

    def test_create_notification_forbidden(self):
        from app.services.notification_service import NotificationService
        with patch("app.services.security.current_user_id", return_value="user-1"):
            with pytest.raises(ForbiddenError):
                NotificationService().create({
                    "user_id": "user-2", "type": "system", "title": "Test",
                })

    def test_get_notification_not_found(self):
        from app.services.notification_service import NotificationService
        with patch("app.services.notification_service.NotificationRepository") as mock_repo_cls:
            mock_repo = MagicMock()
            mock_repo.get.return_value = None
            mock_repo_cls.return_value = mock_repo

            with pytest.raises(NotFoundError):
                NotificationService().get_by_id("nonexistent", "user-1")

    def test_get_notification_forbidden(self):
        from app.services.notification_service import NotificationService
        mock_notification = MagicMock()
        mock_notification.user_id = "user-2"

        with patch("app.services.notification_service.NotificationRepository") as mock_repo_cls:
            mock_repo = MagicMock()
            mock_repo.get.return_value = mock_notification
            mock_repo_cls.return_value = mock_repo

            with pytest.raises(ForbiddenError):
                NotificationService().get_by_id("notif-1", "user-1")

    def test_get_unread_count(self):
        from app.services.notification_service import NotificationService
        mock_query = MagicMock()
        mock_query.filter.return_value.count.return_value = 3

        with patch("app.services.notification_service.NotificationRepository") as mock_repo_cls:
            mock_repo = MagicMock()
            mock_repo.query.return_value = mock_query
            mock_repo_cls.return_value = mock_repo

            result = NotificationService().get_unread_count("user-1")

        assert result["unread_count"] == 3


class TestDashboardService:
    """DashboardService unit tests with mocked _compute_stats."""

    def test_get_overview(self, app):
        from app.services.dashboard_service import DashboardService
        expected = {
            "workspace_id": "ws-1",
            "entity_count": 5,
            "block_count": 10,
            "relation_count": 3,
            "comment_count": 0,
            "member_count": 1,
            "archived_count": 0,
            "recent_entities": [],
        }
        with app.app_context():
            with patch.object(DashboardService, '_compute_stats', return_value=expected):
                result = DashboardService().overview("ws-1")
        assert result == expected
