import uuid
from datetime import datetime, timezone

from sqlalchemy.orm import validates

from app.extensions import db
from app.models.local_base import CreatedOnlyMixin, TextPKMixin, TimestampMixin

def _UTCNOW():
    return datetime.now(timezone.utc)


class SoftDeleteMixin:
    is_deleted = db.Column(db.Boolean, nullable=False, default=False, server_default=db.text('0'))
    deleted_at = db.Column(db.DateTime(timezone=True), nullable=True)
    deleted_by = db.Column(db.String(36), nullable=True)


class User(TextPKMixin, TimestampMixin, SoftDeleteMixin, db.Model):
    __tablename__ = "users"
    __table_args__ = (
        db.Index("idx_users_deleted_at", "deleted_at", sqlite_where=db.text("is_deleted = 1")),
    )

    email = db.Column(db.Text, unique=True, nullable=False)
    name = db.Column(db.Text)
    avatar_url = db.Column(db.Text, nullable=True)
    profile_image_url = db.Column(db.Text, nullable=True)

    workspaces = db.relationship("Workspace", back_populates="owner", lazy="selectin", primaryjoin="User.id == Workspace.owner_id", foreign_keys="Workspace.owner_id")
    notifications = db.relationship("Notification", back_populates="user", lazy="selectin", primaryjoin="User.id == Notification.user_id", foreign_keys="Notification.user_id")
    activity_logs = db.relationship("ActivityLog", back_populates="user", lazy="selectin", primaryjoin="User.id == ActivityLog.user_id", foreign_keys="ActivityLog.user_id")
    entity_events = db.relationship("EntityEvent", back_populates="user", lazy="selectin", primaryjoin="User.id == EntityEvent.user_id", foreign_keys="EntityEvent.user_id")
    branches_created = db.relationship("Branch", back_populates="created_by_user", lazy="selectin", primaryjoin="User.id == Branch.created_by", foreign_keys="Branch.created_by")
    sessions = db.relationship("Session", back_populates="user", lazy="selectin", primaryjoin="User.id == Session.user_id", foreign_keys="Session.user_id")
    auth_codes = db.relationship("AuthCode", back_populates="user", lazy="selectin", primaryjoin="User.id == AuthCode.user_id", foreign_keys="AuthCode.user_id")

    def __repr__(self):
        return f"<User(id={self.id!r}, email={self.email!r})>"


class Workspace(TextPKMixin, TimestampMixin, SoftDeleteMixin, db.Model):
    __tablename__ = "workspaces"
    __table_args__ = (
        db.Index("uq_workspaces_owner_active", "owner_id", unique=True, sqlite_where=db.text("is_deleted = 0")),
        db.Index("idx_workspaces_deleted_at", "deleted_at", sqlite_where=db.text("is_deleted = 1")),
        db.CheckConstraint("json_valid(settings)", name="ck_workspace_settings"),
        db.CheckConstraint("deployment_mode IN ('local', 'cloud')", name="ck_workspace_deployment_mode"),
    )

    owner_id = db.Column(db.String(36), db.ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    name = db.Column(db.Text, nullable=False)
    icon = db.Column(db.Text)
    color = db.Column(db.Text)
    description = db.Column(db.Text)
    settings = db.Column(db.JSON, default=dict, server_default=db.text("'{}'"))
    deployment_mode = db.Column(db.Text, default="local", server_default=db.text("'local'"))
    sync_enabled = db.Column(db.Boolean, default=False, server_default=db.text("0"))

    owner = db.relationship("User", back_populates="workspaces", lazy="selectin", primaryjoin="User.id == Workspace.owner_id", foreign_keys="Workspace.owner_id")
    entities = db.relationship("Entity", back_populates="workspace", lazy="selectin")
    entity_types = db.relationship("EntityType", back_populates="workspace", lazy="selectin")
    tags = db.relationship("Tag", back_populates="workspace", lazy="selectin")
    properties = db.relationship("Property", back_populates="workspace", lazy="selectin")
    files = db.relationship("File", back_populates="workspace", lazy="selectin")
    activity_logs = db.relationship("ActivityLog", back_populates="workspace", lazy="selectin")
    notifications = db.relationship("Notification", back_populates="workspace", lazy="selectin")
    search_documents = db.relationship("SearchDocument", back_populates="workspace", lazy="selectin")
    embeddings = db.relationship("Embedding", back_populates="workspace", lazy="selectin")
    sync_operations = db.relationship("SyncOperation", back_populates="workspace", lazy="selectin")
    graph_materializations = db.relationship("GraphMaterialization", back_populates="workspace", lazy="selectin")
    branches = db.relationship("Branch", back_populates="workspace", lazy="selectin")
    relations = db.relationship("Relation", back_populates="workspace", lazy="selectin")
    entity_events = db.relationship("EntityEvent", back_populates="workspace", lazy="selectin")

    def __repr__(self):
        return f"<Workspace(id={self.id!r}, name={self.name!r})>"


class EntityType(TextPKMixin, TimestampMixin, SoftDeleteMixin, db.Model):
    __tablename__ = "entity_types"
    __table_args__ = (
        db.Index("idx_entity_types_workspace", "workspace_id"),
        db.Index("uq_entity_types_workspace_name", "workspace_id", "name", unique=True, sqlite_where=db.text("is_deleted = 0")),
        db.Index("idx_entity_types_deleted_at", "deleted_at", sqlite_where=db.text("is_deleted = 1")),
        db.CheckConstraint("json_valid(config)", name="ck_entity_type_config"),
    )

    workspace_id = db.Column(db.String(36), db.ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False)
    name = db.Column(db.Text, nullable=False)
    slug = db.Column(db.Text, nullable=False, default="", server_default=db.text("''"))
    icon = db.Column(db.Text)
    description = db.Column(db.Text)
    color = db.Column(db.Text)
    config = db.Column(db.JSON, default=dict, server_default=db.text("'{}'"))

    workspace = db.relationship("Workspace", back_populates="entity_types", lazy="selectin")
    entities = db.relationship("Entity", back_populates="entity_type", lazy="selectin")

    def __repr__(self):
        return f"<EntityType(id={self.id!r}, name={self.name!r})>"


class Entity(TextPKMixin, TimestampMixin, SoftDeleteMixin, db.Model):
    __tablename__ = "entities"
    __table_args__ = (
        db.Index("idx_entities_workspace_active", "workspace_id", sqlite_where=db.text("is_deleted = 0")),
        db.Index("idx_entities_type", "entity_type_id", sqlite_where=db.text("is_deleted = 0")),
        db.Index("idx_entities_archived", "archived_at", sqlite_where=db.text("archived_at IS NOT NULL AND is_deleted = 0")),
        db.Index("idx_entities_parent", "parent_id", sqlite_where=db.text("is_deleted = 0")),
        db.Index("idx_entities_deleted_at", "deleted_at", sqlite_where=db.text("is_deleted = 1")),
    )

    workspace_id = db.Column(db.String(36), db.ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False)
    entity_type_id = db.Column(db.String(36), db.ForeignKey("entity_types.id", ondelete="RESTRICT"), nullable=False)
    name = db.Column(db.Text)
    icon = db.Column(db.Text)
    color = db.Column(db.Text)
    cover_image = db.Column(db.Text)
    parent_id = db.Column(db.String(36), db.ForeignKey("entities.id", ondelete="SET NULL"), nullable=True, index=True)
    sort_order = db.Column(db.Integer, default=0, server_default=db.text("0"))
    summary = db.Column(db.Text)
    is_favorite = db.Column(db.Boolean, default=False, server_default=db.text("0"))
    is_archived = db.Column(db.Boolean, nullable=False, default=False, server_default=db.text("0"))
    archived_at = db.Column(db.DateTime(timezone=True))
    block_count = db.Column(db.Integer, default=0, server_default=db.text("0"))
    created_by = db.Column(db.String(36))
    version = db.Column(db.Integer, nullable=False, default=1, server_default=db.text("1"))

    workspace = db.relationship("Workspace", back_populates="entities", lazy="selectin")
    entity_type = db.relationship("EntityType", back_populates="entities", lazy="selectin")
    properties = db.relationship("EntityPropertyValue", back_populates="entity", lazy="selectin")
    blocks = db.relationship("Block", back_populates="entity", lazy="selectin", order_by="Block.position")
    relations_from = db.relationship("Relation", foreign_keys="Relation.source_id", back_populates="source_entity", lazy="selectin")
    relations_to = db.relationship("Relation", foreign_keys="Relation.target_id", back_populates="target_entity", lazy="selectin")
    tags = db.relationship("EntityTag", back_populates="entity", lazy="selectin")
    files = db.relationship("EntityFile", back_populates="entity", lazy="selectin")
    versions = db.relationship("EntityVersion", back_populates="entity", lazy="selectin")
    events = db.relationship("EntityEvent", back_populates="entity", lazy="selectin")
    search_document = db.relationship("SearchDocument", back_populates="entity", uselist=False, lazy="selectin", primaryjoin="and_(Entity.id == SearchDocument.entity_id, SearchDocument.is_deleted == False)")
    embeddings = db.relationship("Embedding", back_populates="entity", lazy="selectin")

    def __repr__(self):
        return f"<Entity(id={self.id!r}, name={self.name!r})>"


class Block(SoftDeleteMixin, db.Model):
    __tablename__ = "blocks"
    __table_args__ = (
        db.PrimaryKeyConstraint('id', 'branch_id', 'created_at'),
        db.CheckConstraint("json_valid(content)", name="ck_block_content"),
        db.CheckConstraint("json_valid(properties)", name="ck_block_properties"),
        db.Index("uq_blocks_entity_position", "entity_id", "branch_id", "position", unique=True, sqlite_where=db.text("is_deleted = 0")),
        db.Index("idx_blocks_current", "entity_id", "branch_id", "position", sqlite_where=db.text("is_deleted = 0")),
        db.Index("idx_blocks_parent_block", "parent_block_id"),
        db.Index("idx_blocks_entity_active", "entity_id", sqlite_where=db.text("is_deleted = 0")),
        db.Index("idx_blocks_entity_branch_active", "entity_id", "branch_id", sqlite_where=db.text("is_deleted = 0")),
        db.Index("idx_blocks_deleted_at", "deleted_at", sqlite_where=db.text("is_deleted = 1")),
    )

    id = db.Column(db.String(36), nullable=False, unique=True, default=lambda: uuid.uuid4().hex, server_default=db.text("(lower(hex(randomblob(16))))"))
    entity_id = db.Column(db.String(36), db.ForeignKey("entities.id", ondelete="CASCADE"), nullable=False)
    # NOTE: The seed UUID 00000000-0000-0000-0000-000000000003 is a well-known default "main" branch.
    # It must exist in the database before blocks referencing it are inserted.
    branch_id = db.Column(db.String(36), db.ForeignKey("branches.id", ondelete="CASCADE"), nullable=False, default="00000000-0000-0000-0000-000000000003", server_default=db.text("'00000000-0000-0000-0000-000000000003'"))
    parent_block_id = db.Column(db.String(36), db.ForeignKey("blocks.id", ondelete="CASCADE"))
    lft = db.Column(db.Integer, nullable=False, default=0, server_default=db.text("0"))
    rgt = db.Column(db.Integer, nullable=False, default=0, server_default=db.text("0"))
    type = db.Column(db.Text, nullable=False)
    content = db.Column(db.JSON, nullable=False, default=dict, server_default=db.text("'{}'"))
    properties = db.Column(db.JSON, default=dict, server_default=db.text("'{}'"))
    position = db.Column(db.Numeric(20, 10), nullable=False)
    indent = db.Column(db.Integer, nullable=False, default=0, server_default=db.text("0"))
    moved_at = db.Column(db.DateTime(timezone=True))
    content_hash = db.Column(db.Text, nullable=False, default="", server_default=db.text("''"))
    version = db.Column(db.Integer, nullable=False, default=1, server_default=db.text("1"))
    created_at = db.Column(db.DateTime(timezone=True), nullable=False, default=_UTCNOW, server_default=db.text("CURRENT_TIMESTAMP"))
    updated_at = db.Column(db.DateTime(timezone=True), nullable=False, default=_UTCNOW, onupdate=_UTCNOW, server_default=db.text("CURRENT_TIMESTAMP"))

    entity = db.relationship("Entity", back_populates="blocks", lazy="selectin", primaryjoin="Block.entity_id == Entity.id", foreign_keys="Block.entity_id")
    parent_block = db.relationship("Block", remote_side="Block.id", back_populates="child_blocks", lazy="selectin", primaryjoin="Block.parent_block_id == Block.id")
    child_blocks = db.relationship("Block", back_populates="parent_block", lazy="selectin", primaryjoin="Block.id == Block.parent_block_id")
    versions = db.relationship("BlockVersion", back_populates="block", lazy="selectin")

    def __repr__(self):
        return f"<Block(id={self.id!r}, type={self.type!r}, entity_id={self.entity_id!r})>"


class SearchDocument(TextPKMixin, TimestampMixin, SoftDeleteMixin, db.Model):
    __tablename__ = "search_documents"
    __table_args__ = (
        db.Index("uq_search_documents_workspace_entity", "workspace_id", "entity_id", unique=True, sqlite_where=db.text("is_deleted = 0")),
        db.Index("idx_search_documents_workspace", "workspace_id", sqlite_where=db.text("is_deleted = 0")),
        db.Index("idx_search_documents_deleted_at", "deleted_at", sqlite_where=db.text("is_deleted = 1")),
    )

    workspace_id = db.Column(db.String(36), db.ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False)
    entity_id = db.Column(db.String(36), db.ForeignKey("entities.id", ondelete="CASCADE"), nullable=False)
    block_id = db.Column(db.String(36), db.ForeignKey("blocks.id"))
    title = db.Column(db.Text)
    content = db.Column(db.Text)
    content_hash = db.Column(db.Text, nullable=False, default="", server_default=db.text("''"))
    search_vector = db.Column(db.Text)

    workspace = db.relationship("Workspace", back_populates="search_documents", lazy="selectin")
    entity = db.relationship("Entity", back_populates="search_document", uselist=False, lazy="selectin")
    block = db.relationship('Block', lazy='joined')

    def __repr__(self):
        return f"<SearchDocument(id={self.id!r}, title={self.title!r})>"


class Property(TextPKMixin, TimestampMixin, SoftDeleteMixin, db.Model):
    __tablename__ = "properties"
    __table_args__ = (
        db.CheckConstraint("type IN ('text','number','date','select','multi_select','checkbox','url','email','phone','rich_text','boolean','entity_ref')", name="ck_property_type"),
        db.CheckConstraint("json_valid(options)", name="ck_property_options"),
        db.CheckConstraint("json_valid(config)", name="ck_property_config"),
        db.Index("uq_properties_workspace_name_type", "workspace_id", "name", "type", unique=True, sqlite_where=db.text("is_deleted = 0")),
        db.Index("idx_properties_workspace", "workspace_id", sqlite_where=db.text("is_deleted = 0")),
        db.Index("idx_properties_deleted_at", "deleted_at", sqlite_where=db.text("is_deleted = 1")),
    )

    workspace_id = db.Column(db.String(36), db.ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False)
    entity_type_id = db.Column(db.String(36), db.ForeignKey("entity_types.id", ondelete="RESTRICT"))
    name = db.Column(db.Text, nullable=False)
    type = db.Column(db.Text, nullable=False)
    description = db.Column(db.Text)
    default_value = db.Column(db.JSON)
    required = db.Column(db.Boolean, default=False, server_default=db.text("0"))
    options = db.Column(db.JSON, default=dict, server_default=db.text("'{}'"))
    config = db.Column(db.JSON, default=dict, server_default=db.text("'{}'"))

    workspace = db.relationship("Workspace", back_populates="properties", lazy="selectin")
    entity_property_values = db.relationship("EntityPropertyValue", back_populates="property", lazy="selectin")

    def __repr__(self):
        return f"<Property(id={self.id!r}, name={self.name!r}, type={self.type!r})>"


class EntityPropertyValue(TextPKMixin, TimestampMixin, SoftDeleteMixin, db.Model):
    __tablename__ = "entity_property_values"
    __table_args__ = (
        db.CheckConstraint("json_valid(value)", name="ck_epv_value"),
        db.Index("uq_entity_property_values_active", "entity_id", "property_id", unique=True, sqlite_where=db.text("is_deleted = 0")),
        db.Index("idx_entity_property_values_entity", "entity_id", sqlite_where=db.text("is_deleted = 0")),
        db.Index("idx_entity_property_values_deleted_at", "deleted_at", sqlite_where=db.text("is_deleted = 1")),
    )

    entity_id = db.Column(db.String(36), db.ForeignKey("entities.id", ondelete="CASCADE"), nullable=False)
    property_id = db.Column(db.String(36), db.ForeignKey("properties.id", ondelete="CASCADE"), nullable=False)
    value = db.Column(db.JSON, nullable=False, server_default=db.text("'{}'"))

    entity = db.relationship("Entity", back_populates="properties", lazy="selectin")
    property = db.relationship("Property", back_populates="entity_property_values", lazy="selectin")

    def __repr__(self):
        return f"<EntityPropertyValue(entity_id={self.entity_id!r}, property_id={self.property_id!r})>"


class Relation(TextPKMixin, TimestampMixin, SoftDeleteMixin, db.Model):
    __tablename__ = "relations"
    __table_args__ = (
        db.CheckConstraint("source_id != target_id", name="no_self_relation"),
        db.CheckConstraint("generated_by IN ('manual', 'ai')", name="ck_relation_generated_by"),
        db.CheckConstraint("json_valid(properties)", name="ck_relation_properties"),
        db.Index("idx_relations_workspace", "workspace_id"),
        db.Index("uq_relations_active", "workspace_id", "source_id", "target_id", "type", unique=True, sqlite_where=db.text("is_deleted = 0")),
        db.Index("idx_relations_source_active", "source_id", sqlite_where=db.text("is_deleted = 0")),
        db.Index("idx_relations_target_active", "target_id", sqlite_where=db.text("is_deleted = 0")),
        db.Index("idx_relations_deleted_at", "deleted_at", sqlite_where=db.text("is_deleted = 1")),
    )

    workspace_id = db.Column(db.String(36), db.ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False)
    source_id = db.Column(db.String(36), db.ForeignKey("entities.id", ondelete="CASCADE"), nullable=False)
    target_id = db.Column(db.String(36), db.ForeignKey("entities.id", ondelete="CASCADE"), nullable=False)
    type = db.Column(db.Text, nullable=False)
    label = db.Column(db.Text)
    properties = db.Column(db.JSON, default=dict, server_default=db.text("'{}'"))
    generated_by = db.Column(db.Text, nullable=False, default='manual', server_default=db.text("'manual'"))
    verified = db.Column(db.Boolean, nullable=False, default=True, server_default=db.text("1"))
    confidence = db.Column(db.Float)
    ai_model = db.Column(db.Text)
    created_by = db.Column(db.String(36))

    workspace = db.relationship("Workspace", back_populates="relations", lazy="selectin")
    source_entity = db.relationship("Entity", foreign_keys=[source_id], back_populates="relations_from", lazy="selectin")
    target_entity = db.relationship("Entity", foreign_keys=[target_id], back_populates="relations_to", lazy="selectin")

    def __repr__(self):
        return f"<Relation(id={self.id!r}, type={self.type!r})>"


class Tag(TextPKMixin, TimestampMixin, SoftDeleteMixin, db.Model):
    __tablename__ = "tags"
    __table_args__ = (
        db.Index("uq_tags_workspace_name", "workspace_id", "name", unique=True, sqlite_where=db.text("is_deleted = 0")),
        db.Index("idx_tags_workspace", "workspace_id", sqlite_where=db.text("is_deleted = 0")),
        db.Index("idx_tags_deleted_at", "deleted_at", sqlite_where=db.text("is_deleted = 1")),
    )

    workspace_id = db.Column(db.String(36), db.ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False)
    name = db.Column(db.Text, nullable=False)
    color = db.Column(db.Text)
    entity_count = db.Column(db.Integer, default=0, server_default=db.text("0"))

    workspace = db.relationship("Workspace", back_populates="tags", lazy="selectin")
    entity_tags = db.relationship("EntityTag", back_populates="tag", lazy="selectin")

    def __repr__(self):
        return f"<Tag(id={self.id!r}, name={self.name!r})>"


class EntityTag(TextPKMixin, CreatedOnlyMixin, SoftDeleteMixin, db.Model):
    __tablename__ = "entity_tags"
    __table_args__ = (
        db.Index("uq_entity_tags_active", "entity_id", "tag_id", unique=True, sqlite_where=db.text("is_deleted = 0")),
        db.Index("idx_entity_tags_entity", "entity_id", sqlite_where=db.text("is_deleted = 0")),
        db.Index("idx_entity_tags_tag", "tag_id", sqlite_where=db.text("is_deleted = 0")),
        db.Index("idx_entity_tags_deleted_at", "deleted_at", sqlite_where=db.text("is_deleted = 1")),
    )

    entity_id = db.Column(db.String(36), db.ForeignKey("entities.id", ondelete="CASCADE"), nullable=False)
    tag_id = db.Column(db.String(36), db.ForeignKey("tags.id", ondelete="CASCADE"), nullable=False)

    entity = db.relationship("Entity", back_populates="tags", lazy="selectin")
    tag = db.relationship("Tag", back_populates="entity_tags", lazy="selectin")

    def __repr__(self):
        return f"<EntityTag(entity_id={self.entity_id!r}, tag_id={self.tag_id!r})>"


class EntityEvent(TextPKMixin, CreatedOnlyMixin, SoftDeleteMixin, db.Model):
    __tablename__ = "entity_events"
    __table_args__ = (
        db.Index("idx_entity_events_workspace_entity", "workspace_id", "entity_id"),
        db.Index("idx_entity_events_workspace_type", "workspace_id", "event_type"),
        db.Index("idx_entity_events_workspace_created", "workspace_id", "created_at"),
        db.Index("idx_entity_events_deleted_at", "deleted_at", sqlite_where=db.text("is_deleted = 1")),
        db.CheckConstraint("json_valid(payload)", name="ck_entity_event_payload"),
    )

    workspace_id = db.Column(db.String(36), db.ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False)
    entity_id = db.Column(db.String(36), db.ForeignKey("entities.id", ondelete="RESTRICT"), nullable=False)
    user_id = db.Column(db.String(36), db.ForeignKey("users.id", ondelete="SET NULL"))
    event_type = db.Column(db.Text, nullable=False)
    payload = db.Column(db.JSON, nullable=False)
    changeset_id = db.Column(db.String(36), db.ForeignKey("changesets.id", ondelete="SET NULL"))

    workspace = db.relationship("Workspace", back_populates="entity_events", lazy="selectin")
    entity = db.relationship("Entity", back_populates="events", lazy="selectin")
    user = db.relationship("User", back_populates="entity_events", lazy="selectin", primaryjoin="EntityEvent.user_id == User.id", foreign_keys="EntityEvent.user_id")

    def __repr__(self):
        return f"<EntityEvent(id={self.id!r}, event_type={self.event_type!r})>"


class File(TextPKMixin, TimestampMixin, SoftDeleteMixin, db.Model):
    __tablename__ = "file_records"
    __table_args__ = (
        db.Index("idx_files_workspace", "workspace_id", sqlite_where=db.text("is_deleted = 0")),
        db.Index("idx_files_state", "state", sqlite_where=db.text("is_deleted = 0")),
        db.Index("uq_files_hash_active", "workspace_id", "content_hash", unique=True, sqlite_where=db.text("is_deleted = 0")),
        db.Index("idx_files_pending", "state", "uploaded_at", sqlite_where=db.text("state = 'PENDING' AND is_deleted = 0")),
        db.Index("idx_files_deleted_at", "deleted_at", sqlite_where=db.text("is_deleted = 1")),
    )

    workspace_id = db.Column(db.String(36), db.ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False)
    file_name = db.Column(db.Text, nullable=False)
    mime_type = db.Column(db.Text)
    file_size = db.Column(db.BigInteger, nullable=False, default=0, server_default=db.text("0"))
    content_hash = db.Column(db.Text, nullable=False, default="", server_default=db.text("''"))
    storage_provider = db.Column(db.Text, nullable=False, default="local", server_default=db.text("'local'"))
    state = db.Column(db.Text, nullable=False, default="READY", server_default=db.text("'READY'"))
    object_key = db.Column(db.Text, nullable=False)
    uploaded_by = db.Column(db.String(36))
    uploaded_at = db.Column(db.DateTime(timezone=True), nullable=False, default=_UTCNOW, server_default=db.text("CURRENT_TIMESTAMP"))
    has_extracted_text = db.Column(db.Boolean, default=False, server_default=db.text("0"))
    has_metadata = db.Column(db.Boolean, default=False, server_default=db.text("0"))
    extracted_text = db.Column(db.Text)
    metadata_json = db.Column(db.Text)

    workspace = db.relationship("Workspace", back_populates="files", lazy="selectin")
    entity_files = db.relationship("EntityFile", back_populates="file", lazy="selectin")

    def __repr__(self):
        return f"<File(id={self.id!r}, file_name={self.file_name!r})>"


class EntityFile(TextPKMixin, CreatedOnlyMixin, SoftDeleteMixin, db.Model):
    __tablename__ = "entity_files"
    __table_args__ = (
        db.Index("uq_entity_files_active", "entity_id", "file_id", unique=True, sqlite_where=db.text("is_deleted = 0")),
        db.Index("idx_entity_files_entity", "entity_id", sqlite_where=db.text("is_deleted = 0")),
        db.Index("idx_entity_files_file", "file_id", sqlite_where=db.text("is_deleted = 0")),
        db.Index("idx_entity_files_block", "block_id"),
        db.Index("idx_entity_files_deleted_at", "deleted_at", sqlite_where=db.text("is_deleted = 1")),
    )

    entity_id = db.Column(db.String(36), db.ForeignKey("entities.id", ondelete="CASCADE"), nullable=False)
    file_id = db.Column(db.String(36), db.ForeignKey("file_records.id", ondelete="CASCADE"), nullable=False)
    block_id = db.Column(db.String(36), db.ForeignKey("blocks.id"))

    entity = db.relationship("Entity", back_populates="files", lazy="selectin")
    file = db.relationship("File", back_populates="entity_files", lazy="selectin")

    def __repr__(self):
        return f"<EntityFile(entity_id={self.entity_id!r}, file_id={self.file_id!r})>"


class Branch(TextPKMixin, TimestampMixin, SoftDeleteMixin, db.Model):
    __tablename__ = "branches"
    __table_args__ = (
        db.Index("idx_branches_workspace", "workspace_id", sqlite_where=db.text("is_deleted = 0")),
        db.Index("idx_branches_default", "workspace_id", "is_default", sqlite_where=db.text("is_deleted = 0")),
        db.Index("idx_branches_parent_branch", "parent_branch_id"),
        db.Index("idx_branches_deleted_at", "deleted_at", sqlite_where=db.text("is_deleted = 1")),
    )

    workspace_id = db.Column(db.String(36), db.ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False)
    parent_branch_id = db.Column(db.String(36), db.ForeignKey("branches.id", ondelete="SET NULL"))
    name = db.Column(db.Text, nullable=False)
    description = db.Column(db.Text)
    created_by = db.Column(db.String(36), db.ForeignKey("users.id", ondelete="SET NULL"))
    is_default = db.Column(db.Boolean, default=False, server_default=db.text("0"))
    is_locked = db.Column(db.Boolean, default=False, server_default=db.text("0"))
    version = db.Column(db.Integer, nullable=False, default=1)

    workspace = db.relationship("Workspace", back_populates="branches", lazy="selectin")
    created_by_user = db.relationship("User", back_populates="branches_created", lazy="selectin", primaryjoin="Branch.created_by == User.id", foreign_keys="Branch.created_by")

    def __repr__(self):
        return f"<Branch(id={self.id!r}, name={self.name!r})>"


class EntityBranchHead(TextPKMixin, SoftDeleteMixin, db.Model):
    __tablename__ = "entity_branch_heads"
    __table_args__ = (
        db.UniqueConstraint("branch_id", "entity_id", name="uq_entity_branch_heads"),
        db.Index("idx_entity_branch_heads_branch", "branch_id"),
        db.Index("idx_entity_branch_heads_entity", "entity_id"),
        db.Index("idx_entity_branch_heads_deleted_at", "deleted_at", sqlite_where=db.text("is_deleted = 1")),
    )

    branch_id = db.Column(db.String(36), db.ForeignKey("branches.id", ondelete="CASCADE"), nullable=False)
    entity_id = db.Column(db.String(36), db.ForeignKey("entities.id", ondelete="CASCADE"), nullable=False)
    current_block_id = db.Column(db.String(36), db.ForeignKey("blocks.id", ondelete="SET NULL"))
    current_block_created_at = db.Column(db.DateTime)
    base_block_id = db.Column(db.String(36), db.ForeignKey("blocks.id", ondelete="SET NULL"))
    base_block_created_at = db.Column(db.DateTime)

    def __repr__(self):
        return f"<EntityBranchHead(branch_id={self.branch_id!r}, entity_id={self.entity_id!r})>"


class Snapshot(TextPKMixin, CreatedOnlyMixin, SoftDeleteMixin, db.Model):
    __tablename__ = "snapshots"
    __table_args__ = (
        db.Index("idx_snapshots_branch_id", "branch_id"),
        db.Index("idx_snapshots_deleted_at", "deleted_at", sqlite_where=db.text("is_deleted = 1")),
    )

    branch_id = db.Column(db.String(36), db.ForeignKey("branches.id", ondelete="CASCADE"), nullable=False)
    name = db.Column(db.Text)
    description = db.Column(db.Text)
    snapshot_metadata = db.Column("metadata", db.JSON, default=dict, server_default=db.text("'{}'"))
    created_by = db.Column(db.String(36))

    def __repr__(self):
        return f"<Snapshot(id={self.id!r}, branch_id={self.branch_id!r})>"


class Changeset(TextPKMixin, CreatedOnlyMixin, SoftDeleteMixin, db.Model):
    __tablename__ = "changesets"
    __table_args__ = (
        db.Index("idx_changesets_branch", "branch_id"),
        db.Index("idx_changesets_snapshot", "snapshot_id"),
        db.Index("idx_changesets_deleted_at", "deleted_at", sqlite_where=db.text("is_deleted = 1")),
    )

    branch_id = db.Column(db.String(36), db.ForeignKey("branches.id", ondelete="CASCADE"), nullable=False)
    snapshot_id = db.Column(db.String(36), db.ForeignKey("snapshots.id", ondelete="SET NULL"))
    message = db.Column(db.Text)
    created_by = db.Column(db.String(36))

    def __repr__(self):
        return f"<Changeset(id={self.id!r}, branch_id={self.branch_id!r})>"


class EntityVersion(TextPKMixin, CreatedOnlyMixin, SoftDeleteMixin, db.Model):
    __tablename__ = "entity_versions"
    __table_args__ = (
        db.Index("idx_entity_versions_entity", "entity_id"),
        db.Index("idx_entity_versions_changeset", "changeset_id"),
        db.Index("idx_entity_versions_deleted_at", "deleted_at", sqlite_where=db.text("is_deleted = 1")),
        db.CheckConstraint("json_valid(snapshot)", name="ck_entity_version_snapshot"),
    )

    entity_id = db.Column(db.String(36), db.ForeignKey("entities.id", ondelete="RESTRICT"), nullable=False)
    branch_id = db.Column(db.String(36), db.ForeignKey("branches.id", ondelete="SET NULL"))
    changeset_id = db.Column(db.String(36), db.ForeignKey("changesets.id", ondelete="SET NULL"))
    snapshot_id = db.Column(db.String(36), db.ForeignKey("snapshots.id", ondelete="SET NULL"))
    version = db.Column(db.Integer)
    message = db.Column(db.Text)
    snapshot = db.Column(db.JSON, nullable=False)
    content_hash = db.Column(db.Text, nullable=False)
    created_by = db.Column(db.String(36))

    entity = db.relationship("Entity", back_populates="versions", lazy="selectin")

    def __repr__(self):
        return f"<EntityVersion(id={self.id!r}, entity_id={self.entity_id!r})>"


class BlockVersion(TextPKMixin, CreatedOnlyMixin, SoftDeleteMixin, db.Model):
    __tablename__ = "block_versions"
    __table_args__ = (
        db.Index("idx_block_versions_block", "block_id"),
        db.Index("idx_block_versions_changeset", "changeset_id"),
        db.Index("idx_block_versions_deleted_at", "deleted_at", sqlite_where=db.text("is_deleted = 1")),
    )

    block_id = db.Column(db.String(36), db.ForeignKey("blocks.id", ondelete="RESTRICT"), nullable=False)
    changeset_id = db.Column(db.String(36), db.ForeignKey("changesets.id", ondelete="SET NULL"))
    snapshot = db.Column(db.JSON, nullable=False)
    content_hash = db.Column(db.Text, nullable=False)

    block = db.relationship("Block", back_populates="versions", lazy="selectin")

    def __repr__(self):
        return f"<BlockVersion(id={self.id!r}, block_id={self.block_id!r})>"


class Embedding(TextPKMixin, TimestampMixin, SoftDeleteMixin, db.Model):
    __tablename__ = "embeddings"
    __table_args__ = (
        db.Index("idx_embeddings_workspace_entity", "workspace_id", "entity_id"),
        db.Index("idx_embeddings_entity", "entity_id", sqlite_where=db.text("is_deleted = 0")),
        db.Index("idx_embeddings_workspace", "workspace_id", sqlite_where=db.text("is_deleted = 0")),
        db.Index("idx_embeddings_block", "block_id"),
        db.Index("idx_embeddings_deleted_at", "deleted_at", sqlite_where=db.text("is_deleted = 1")),
    )

    workspace_id = db.Column(db.String(36), db.ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False)
    entity_id = db.Column(db.String(36), db.ForeignKey("entities.id", ondelete="CASCADE"))
    block_id = db.Column(db.String(36), db.ForeignKey("blocks.id"))
    model = db.Column(db.Text, nullable=False)
    embedding = db.Column(db.Text)
    content_hash = db.Column(db.Text, nullable=False)

    workspace = db.relationship("Workspace", back_populates="embeddings", lazy="selectin")
    entity = db.relationship("Entity", back_populates="embeddings", lazy="selectin")

    def __repr__(self):
        return f"<Embedding(id={self.id!r}, model={self.model!r})>"


class GraphMaterialization(TextPKMixin, TimestampMixin, SoftDeleteMixin, db.Model):
    __tablename__ = "graph_materializations"
    __table_args__ = (
        db.Index("idx_graph_materializations_workspace", "workspace_id"),
        db.Index("idx_graph_materializations_deleted_at", "deleted_at", sqlite_where=db.text("is_deleted = 1")),
    )

    workspace_id = db.Column(db.String(36), db.ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False)
    graph_snapshot = db.Column(db.JSON, nullable=False)
    generated_at = db.Column(db.DateTime(timezone=True), nullable=False, default=_UTCNOW, server_default=db.text("CURRENT_TIMESTAMP"))
    version_hash = db.Column(db.Text)

    @validates("graph_snapshot")
    def validate_graph_snapshot_json(self, key, value):
        if not isinstance(value, dict):
            raise ValueError("graph_snapshot must be a dict")
        return value

    workspace = db.relationship("Workspace", back_populates="graph_materializations", lazy="selectin")

    def __repr__(self):
        return f"<GraphMaterialization(id={self.id!r}, workspace_id={self.workspace_id!r})>"


class Notification(TextPKMixin, CreatedOnlyMixin, SoftDeleteMixin, db.Model):
    __tablename__ = "notifications"
    __table_args__ = (
        db.CheckConstraint("type IN ('update','entity_update','relation_created','backup_complete','sync_conflict','system')", name="ck_notification_type"),
        db.Index("idx_notifications_workspace", "workspace_id"),
        db.Index("idx_notifications_user_unread", "user_id", sqlite_where=db.text("is_read = 0 AND is_deleted = 0")),
        db.Index("idx_notifications_entity", "entity_id", sqlite_where=db.text("is_deleted = 0")),
        db.Index("idx_notifications_deleted_at", "deleted_at", sqlite_where=db.text("is_deleted = 1")),
    )

    workspace_id = db.Column(db.String(36), db.ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False)
    user_id = db.Column(db.String(36), db.ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    entity_id = db.Column(db.String(36), db.ForeignKey("entities.id", ondelete="CASCADE"))
    type = db.Column(db.Text, nullable=False)
    title = db.Column(db.Text, nullable=False)
    body = db.Column(db.Text)
    data = db.Column(db.JSON)
    is_read = db.Column(db.Boolean, default=False, server_default=db.text("0"))

    user = db.relationship("User", back_populates="notifications", lazy="selectin", primaryjoin="Notification.user_id == User.id", foreign_keys="Notification.user_id")
    workspace = db.relationship("Workspace", back_populates="notifications", lazy="selectin")

    def __repr__(self):
        return f"<Notification(id={self.id!r}, type={self.type!r}, title={self.title!r})>"


class ActivityLog(TextPKMixin, CreatedOnlyMixin, SoftDeleteMixin, db.Model):
    __tablename__ = "activity_entries"
    __table_args__ = (
        db.CheckConstraint("json_valid(details)", name="ck_activity_details"),
        db.Index("idx_activity_log_workspace", "workspace_id", "created_at"),
        db.Index("idx_activity_entries_deleted_at", "deleted_at", sqlite_where=db.text("is_deleted = 1")),
    )

    workspace_id = db.Column(db.String(36), db.ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False)
    user_id = db.Column(db.String(36), db.ForeignKey("users.id", ondelete="SET NULL"))
    entity_id = db.Column(db.String(36), db.ForeignKey("entities.id", ondelete="RESTRICT"))
    block_id = db.Column(db.String(36), db.ForeignKey("blocks.id"))
    display_name = db.Column(db.Text)
    action = db.Column(db.Text, nullable=False)
    resource_type = db.Column(db.Text)
    resource_id = db.Column(db.Text)
    details = db.Column(db.JSON, nullable=False, default=dict)

    @validates("details")
    def validate_details_json(self, key, value):
        if value is None:
            return {}
        if not isinstance(value, (dict, list)):
            raise ValueError("details must be a JSON object or array")
        return value

    workspace = db.relationship("Workspace", back_populates="activity_logs", lazy="selectin")
    entity = db.relationship("Entity", lazy="selectin", primaryjoin="ActivityLog.entity_id == Entity.id", foreign_keys="ActivityLog.entity_id")
    block = db.relationship("Block", lazy="selectin", primaryjoin="ActivityLog.block_id == Block.id", foreign_keys="ActivityLog.block_id")
    user = db.relationship("User", back_populates="activity_logs", lazy="selectin", primaryjoin="ActivityLog.user_id == User.id", foreign_keys="ActivityLog.user_id")

    def __repr__(self):
        return f"<ActivityLog(id={self.id!r}, action={self.action!r})>"


class SyncOperation(TextPKMixin, CreatedOnlyMixin, SoftDeleteMixin, db.Model):
    __tablename__ = "sync_operations"
    __table_args__ = (
        db.CheckConstraint("json_valid(payload)", name="ck_sync_payload"),
        db.Index("idx_sync_operations_workspace_synced", "workspace_id", "synced", sqlite_where=db.text("is_deleted = 0")),
        db.Index("idx_sync_operations_deleted_at", "deleted_at", sqlite_where=db.text("is_deleted = 1")),
    )

    workspace_id = db.Column(db.String(36), db.ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False)
    operation_type = db.Column(db.Text, nullable=False)
    entity_type = db.Column(db.Text)
    entity_id = db.Column(db.String(36))
    payload = db.Column(db.JSON, nullable=False)
    device_id = db.Column(db.Text)
    client_clock = db.Column(db.BigInteger)
    synced = db.Column(db.Boolean, default=False, server_default=db.text("0"))
    retry_count = db.Column(db.Integer, nullable=False, default=0)
    error_message = db.Column(db.Text)
    synced_at = db.Column(db.DateTime(timezone=True))

    workspace = db.relationship("Workspace", back_populates="sync_operations", lazy="selectin")

    @validates("payload")
    def validate_payload_json(self, key, value):
        if not isinstance(value, dict):
            raise ValueError("payload must be a dict")
        return value

    def __repr__(self):
        return f"<SyncOperation(id={self.id!r}, operation_type={self.operation_type!r})>"


class AuthCode(TextPKMixin, CreatedOnlyMixin, SoftDeleteMixin, db.Model):
    __tablename__ = "auth_codes"
    __table_args__ = (
        db.Index("idx_auth_codes_code", "code", unique=True, sqlite_where=db.text("consumed_at IS NULL")),
        db.Index("idx_auth_codes_user_id", "user_id"),
        db.Index("idx_auth_codes_deleted_at", "deleted_at", sqlite_where=db.text("is_deleted = 1")),
    )

    code = db.Column(db.Text, unique=True, nullable=False)
    user_id = db.Column(db.String(36), db.ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    expires_at = db.Column(db.DateTime(timezone=True), nullable=False)
    consumed_at = db.Column(db.DateTime(timezone=True))
    redirect_uri = db.Column(db.Text)

    user = db.relationship("User", back_populates="auth_codes", primaryjoin="AuthCode.user_id == User.id", foreign_keys="AuthCode.user_id")

    def __repr__(self):
        return f"<AuthCode(id={self.id!r}, code={self.code!r})>"


class Session(TextPKMixin, SoftDeleteMixin, db.Model):
    __tablename__ = "sessions"
    __table_args__ = (
        db.Index("idx_sessions_user_active", "user_id", "expires_at", sqlite_where=db.text("revoked_at IS NULL")),
        db.Index("idx_sessions_deleted_at", "deleted_at", sqlite_where=db.text("is_deleted = 1")),
    )

    user_id = db.Column(db.String(36), db.ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    jti = db.Column(db.Text)
    refresh_jti = db.Column(db.Text, unique=True, nullable=False)
    user_agent = db.Column(db.Text)
    ip_address = db.Column(db.Text)
    revoked_at = db.Column(db.DateTime(timezone=True))
    expires_at = db.Column(db.DateTime(timezone=True), nullable=False)
    created_at = db.Column(db.DateTime(timezone=True), nullable=False, default=_UTCNOW, server_default=db.text("CURRENT_TIMESTAMP"))

    user = db.relationship("User", back_populates="sessions", primaryjoin="Session.user_id == User.id", foreign_keys="Session.user_id")

    def __repr__(self):
        return f"<Session(id={self.id!r}, user_id={self.user_id!r})>"
