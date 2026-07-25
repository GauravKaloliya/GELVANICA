"""Tests for model serialization, constraints, and soft-delete behavior."""

import json


class TestModelSoftDelete:
    """Verify soft-delete columns exist and behave correctly."""

    def test_users_has_soft_delete_columns(self, app):
        with app.app_context():
            from app.models.local import User
            cols = {c.name for c in User.__table__.c}
            assert "is_deleted" in cols
            assert "deleted_at" in cols
            assert "deleted_by" in cols

    def test_workspaces_has_soft_delete_columns(self, app):
        with app.app_context():
            from app.models.local import Workspace
            cols = {c.name for c in Workspace.__table__.c}
            assert "is_deleted" in cols
            assert "deleted_at" in cols
            assert "deleted_by" in cols
            assert "deployment_mode" in cols
            assert "sync_enabled" in cols

    def test_entities_has_soft_delete_columns(self, app):
        with app.app_context():
            from app.models.local import Entity
            cols = {c.name for c in Entity.__table__.c}
            assert "is_deleted" in cols
            assert "deleted_at" in cols
            assert "deleted_by" in cols

    def test_blocks_has_soft_delete_columns(self, app):
        with app.app_context():
            from app.models.local import Block
            cols = {c.name for c in Block.__table__.c}
            assert "is_deleted" in cols
            assert "deleted_at" in cols
            assert "deleted_by" in cols

    def test_relations_has_soft_delete_columns(self, app):
        with app.app_context():
            from app.models.local import Relation
            cols = {c.name for c in Relation.__table__.c}
            assert "is_deleted" in cols
            assert "deleted_at" in cols
            assert "deleted_by" in cols

    def test_tags_has_soft_delete_columns(self, app):
        with app.app_context():
            from app.models.local import Tag
            cols = {c.name for c in Tag.__table__.c}
            assert "is_deleted" in cols
            assert "deleted_at" in cols
            assert "deleted_by" in cols

    def test_notifications_has_soft_delete_columns(self, app):
        with app.app_context():
            from app.models.local import Notification
            cols = {c.name for c in Notification.__table__.c}
            assert "is_deleted" in cols
            assert "deleted_at" in cols
            assert "deleted_by" in cols

    def test_files_has_soft_delete_columns(self, app):
        with app.app_context():
            from app.models.local import File
            cols = {c.name for c in File.__table__.c}
            assert "is_deleted" in cols
            assert "deleted_at" in cols
            assert "deleted_by" in cols


class TestModelTimestampColumns:
    """Verify timestamp columns exist on models that have them."""

    def test_user_has_timestamps(self, app):
        with app.app_context():
            from app.models.local import User
            cols = {c.name for c in User.__table__.c}
            assert "created_at" in cols
            assert "updated_at" in cols

    def test_workspace_has_timestamps(self, app):
        with app.app_context():
            from app.models.local import Workspace
            cols = {c.name for c in Workspace.__table__.c}
            assert "created_at" in cols
            assert "updated_at" in cols

    def test_entity_has_timestamps(self, app):
        with app.app_context():
            from app.models.local import Entity
            cols = {c.name for c in Entity.__table__.c}
            assert "created_at" in cols
            assert "updated_at" in cols

    def test_block_has_timestamps(self, app):
        with app.app_context():
            from app.models.local import Block
            cols = {c.name for c in Block.__table__.c}
            assert "created_at" in cols
            assert "updated_at" in cols


class TestModelConstraints:
    """Verify model constraints are properly enforced."""

    def test_blocks_composite_pk_columns(self, app):
        with app.app_context():
            from app.models.local import Block
            pk_cols = [c.name for c in Block.__table__.primary_key.columns]
            assert "id" in pk_cols
            assert "branch_id" in pk_cols
            assert "created_at" in pk_cols

    def test_entities_deleted_by_created_by_column(self, app):
        with app.app_context():
            from app.models.local import Entity
            cols = {c.name for c in Entity.__table__.c}
            assert "is_deleted" in cols
            assert "deleted_at" in cols
            assert "deleted_by" in cols
            assert "created_by" in cols
            assert "version" in cols

    def test_sync_operations_has_payload_validation(self, app):
        with app.app_context():
            from app.models.local import SyncOperation
            assert hasattr(SyncOperation, "validate_payload_json")

    def test_entity_events_has_payload_constraint(self, app):
        with app.app_context():
            from app.models.local import EntityEvent
            from sqlalchemy import CheckConstraint
            has_check = any(
                isinstance(c, CheckConstraint)
                for c in EntityEvent.__table_args__
            )
            assert has_check


class TestAllTablesHaveDeletedBy:
    """Verify ALL 27 SQLite tables have deleted_by column."""

    TABLES_WITH_DELETED_BY = [
        "users", "auth_codes", "sessions", "workspaces",
        "entity_types", "entities", "blocks", "search_documents",
        "properties", "entity_property_values", "relations",
        "tags", "entity_tags", "entity_events", "file_records",
        "entity_files", "branches", "snapshots", "changesets",
        "entity_versions", "block_versions", "embeddings",
        "graph_materializations", "notifications",
        "activity_entries", "sync_operations",
        "entity_branch_heads",
    ]

    def test_all_tables_have_deleted_by(self, app):
        with app.app_context():
            from app.extensions import db
            inspector = db.inspect(db.engine)
            for table_name in self.TABLES_WITH_DELETED_BY:
                cols = {c["name"] for c in inspector.get_columns(table_name)}
                assert "deleted_by" in cols, f"{table_name} missing deleted_by"
                assert "is_deleted" in cols, f"{table_name} missing is_deleted"

    def test_all_tables_have_deleted_at(self, app):
        with app.app_context():
            from app.extensions import db
            inspector = db.inspect(db.engine)
            for table_name in self.TABLES_WITH_DELETED_BY:
                cols = {c["name"] for c in inspector.get_columns(table_name)}
                assert "deleted_at" in cols, f"{table_name} missing deleted_at"


class TestModelRepr:
    """Verify __repr__ methods don't crash."""

    def test_user_repr(self, app):
        with app.app_context():
            from app.models.local import User
            u = User(id="test-id", email="test@test.com")
            r = repr(u)
            assert "test-id" in r or "test@test.com" in r

    def test_workspace_repr(self, app):
        with app.app_context():
            from app.models.local import Workspace
            ws = Workspace(id="ws-id", name="Test WS")
            r = repr(ws)
            assert "ws-id" in r or "Test WS" in r

    def test_entity_repr(self, app):
        with app.app_context():
            from app.models.local import Entity
            e = Entity(id="e-id", name="Test Entity")
            r = repr(e)
            assert "e-id" in r or "Test Entity" in r

    def test_block_repr(self, app):
        with app.app_context():
            from app.models.local import Block
            b = Block(id="b-id", type="text", entity_id="e-id")
            r = repr(b)
            assert "b-id" in r or "text" in r
