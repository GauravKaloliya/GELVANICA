from marshmallow import EXCLUDE, Schema, fields, validate, validates_schema, ValidationError


def UUIDStr(**kwargs):
    """UUID field that validates UUID format but stores as string."""
    return fields.Str(**kwargs, validate=validate.Regexp(r'^[0-9a-fA-F]{32}$|^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$', error="Not a valid UUID"))


class WorkspaceCreateSchema(Schema):
    class Meta:
        unknown = EXCLUDE

    name = fields.Str(required=True, validate=validate.Length(min=1, max=80))
    description = fields.Str(load_default=None)
    settings = fields.Dict(load_default=dict)
    icon = fields.Str(load_default=None)
    color = fields.Str(load_default=None)


class WorkspaceUpdateSchema(Schema):
    class Meta:
        unknown = EXCLUDE

    name = fields.Str(validate=validate.Length(min=1, max=80))
    description = fields.Str(allow_none=True)
    settings = fields.Dict()
    icon = fields.Str(allow_none=True)
    color = fields.Str(allow_none=True)


class EntityTypeCreateSchema(Schema):
    class Meta:
        unknown = EXCLUDE

    workspace_id = UUIDStr(required=True)
    name = fields.Str(required=True)
    slug = fields.Str(load_default="")
    icon = fields.Str(load_default=None)
    description = fields.Str(load_default=None)
    color = fields.Str(load_default=None)
    config = fields.Dict(load_default=dict)


class PropertyCreateSchema(Schema):
    class Meta:
        unknown = EXCLUDE

    workspace_id = UUIDStr(required=True)
    entity_type_id = UUIDStr(load_default=None, allow_none=True)
    name = fields.Str(required=True)
    type = fields.Str(required=True, validate=validate.OneOf([
        "text", "number", "date", "select", "multi_select",
        "checkbox", "url", "email", "phone", "rich_text",
        "boolean", "entity_ref"
    ]))
    description = fields.Str(load_default=None, allow_none=True)
    required = fields.Bool(load_default=False)
    options = fields.List(fields.Str(), load_default=list)
    config = fields.Dict(load_default=dict)
    default_value = fields.Raw(load_default=None, allow_none=True)


class EntityCreateSchema(Schema):
    class Meta:
        unknown = EXCLUDE

    workspace_id = UUIDStr(required=True)
    entity_type_id = UUIDStr(required=True)
    parent_id = UUIDStr(load_default=None, allow_none=True)
    name = fields.Str(load_default=None)
    icon = fields.Str(load_default=None)
    cover_image = fields.Str(load_default=None)
    sort_order = fields.Int(load_default=None, allow_none=True)
    summary = fields.Str(load_default=None, allow_none=True)
    properties = fields.Dict(keys=fields.Str(), values=fields.Raw(), load_default=dict)
    is_favorite = fields.Bool(load_default=False)
    color = fields.Str(load_default=None, allow_none=True)

    @validates_schema
    def validate_properties(self, data, **kwargs):
        from app.extensions import db
        from app.models import Property
        props = data.get("properties", {})
        if not props:
            return
        workspace_id = data.get("workspace_id")
        if not workspace_id:
            return
        for key in props:
            if not isinstance(key, str) or len(key) > 100:
                raise ValidationError(f"Invalid property key: {key}")
        existing = set(
            p.name for p in db.session.query(Property.name).filter(
                Property.workspace_id == workspace_id,
                Property.name.in_(list(props.keys())),
                Property.is_deleted.is_(False),
            ).all()
        )
        missing = set(props.keys()) - existing
        if missing:
            raise ValidationError(f"Unknown property keys: {', '.join(missing)}")


class EntityUpdateSchema(Schema):
    class Meta:
        unknown = EXCLUDE

    name = fields.Str(allow_none=True)
    icon = fields.Str(allow_none=True)
    cover_image = fields.Str(allow_none=True)
    parent_id = UUIDStr(allow_none=True)
    sort_order = fields.Int(allow_none=True)
    summary = fields.Str(allow_none=True)
    properties = fields.Dict(keys=fields.Str(), values=fields.Raw())
    is_favorite = fields.Bool()
    color = fields.Str(allow_none=True)
    is_archived = fields.Bool()


class BlockCreateSchema(Schema):
    class Meta:
        unknown = EXCLUDE

    entity_id = UUIDStr(required=True)
    branch_id = UUIDStr(required=True)
    parent_block_id = UUIDStr(load_default=None, allow_none=True)
    type = fields.Str(required=True)
    position = fields.Decimal(as_string=True, required=True)
    indent = fields.Int(load_default=0)
    content = fields.Dict(load_default=dict)
    properties = fields.Dict(load_default=dict)

    @validates_schema
    def validate_content_by_block_type(self, data, **kwargs):
        block_type = data.get("type")
        content = data.get("content", {})
        if block_type == "text" and not isinstance(content, dict):
            raise ValidationError("Text block content must be a dict")
        if block_type == "image" and not isinstance(content, dict):
            raise ValidationError("Image block content must be a dict")
        if block_type == "text":
            if "text" not in content:
                raise ValidationError("text block requires 'text' key in content")
        elif block_type == "heading":
            if "text" not in content:
                raise ValidationError("heading block requires 'text' key in content")
            if "level" in content and content["level"] not in (1, 2, 3):
                raise ValidationError("heading block 'level' must be 1, 2, or 3")
        elif block_type == "checkbox":
            if "checked" not in content:
                raise ValidationError("checkbox block requires 'checked' key in content")
        elif block_type == "code":
            if "language" not in content:
                raise ValidationError("code block requires 'language' key in content")
        elif block_type in ("image", "video", "file"):
            if "url" not in content:
                raise ValidationError(f"{block_type} block requires 'url' key in content")


class BlockUpdateSchema(Schema):
    class Meta:
        unknown = EXCLUDE

    parent_block_id = UUIDStr(allow_none=True)
    type = fields.Str()
    position = fields.Decimal(as_string=True)
    indent = fields.Int()
    content = fields.Dict()
    properties = fields.Dict()


class MoveBlockSchema(Schema):
    class Meta:
        unknown = EXCLUDE

    parent_block_id = UUIDStr(load_default=None, allow_none=True)
    position = fields.Decimal(as_string=True, required=True)
    indent = fields.Int(load_default=0)
    entity_id = UUIDStr(load_default=None, allow_none=True)
    properties = fields.Dict(load_default=dict)


class RelationUpdateSchema(Schema):
    class Meta:
        unknown = EXCLUDE

    type = fields.Str()
    generated_by = fields.Str()
    verified = fields.Bool()
    confidence = fields.Float(allow_none=True)
    ai_model = fields.Str(allow_none=True)
    properties = fields.Dict(load_default=None, allow_none=True)
    label = fields.Str(allow_none=True)


class RelationCreateSchema(Schema):
    class Meta:
        unknown = EXCLUDE

    workspace_id = UUIDStr(required=True)
    source_id = UUIDStr(required=True)
    target_id = UUIDStr(required=True)
    type = fields.Str(required=True)
    generated_by = fields.Str(load_default='manual', validate=validate.OneOf(['manual', 'ai']))
    verified = fields.Bool(load_default=True)
    confidence = fields.Float(load_default=None, allow_none=True)
    ai_model = fields.Str(load_default=None, allow_none=True)
    properties = fields.Dict(load_default=None, allow_none=True)
    label = fields.Str(load_default=None, allow_none=True)


class BranchCreateSchema(Schema):
    class Meta:
        unknown = EXCLUDE

    workspace_id = UUIDStr(required=True)
    parent_branch_id = UUIDStr(load_default=None, allow_none=True)
    name = fields.Str(required=True)
    description = fields.Str(load_default=None)
    is_default = fields.Bool(load_default=False)
    version = fields.Int(load_default=None, allow_none=True)
    is_locked = fields.Bool(load_default=False)


class BranchUpdateSchema(Schema):
    class Meta:
        unknown = EXCLUDE

    name = fields.Str()
    description = fields.Str(allow_none=True)
    version = fields.Int(allow_none=True)
    is_locked = fields.Bool()


class EntitySnapshotSchema(Schema):
    class Meta:
        unknown = EXCLUDE

    changeset_id = UUIDStr(load_default=None, allow_none=True)


class SnapshotCreateSchema(Schema):
    class Meta:
        unknown = EXCLUDE

    branch_id = UUIDStr(required=True)
    name = fields.Str(load_default=None)
    description = fields.Str(load_default=None)
    metadata = fields.Dict(data_key="metadata", load_default=dict)


class ChangesetCreateSchema(Schema):
    class Meta:
        unknown = EXCLUDE

    branch_id = UUIDStr(required=True)
    snapshot_id = UUIDStr(load_default=None, allow_none=True)
    message = fields.Str(load_default=None)


class MergeBranchSchema(Schema):
    class Meta:
        unknown = EXCLUDE

    source_branch_id = UUIDStr(required=True)
    target_branch_id = UUIDStr(required=True)


class SearchQuerySchema(Schema):
    class Meta:
        unknown = EXCLUDE

    workspace_id = UUIDStr(required=True)
    q = fields.Str(required=True, validate=validate.Length(min=1))
    mode = fields.Str(load_default="hybrid", validate=validate.OneOf(["keyword", "full_text", "hybrid", "semantic"]))
    entity_type_id = UUIDStr(load_default=None, allow_none=True)
    relation_type = fields.Str(load_default=None)
    tag_ids = fields.List(fields.Str(), load_default=None)
    date_from = fields.Str(load_default=None, validate=validate.Regexp(r'^\d{4}-\d{2}-\d{2}', error="Must be YYYY-MM-DD format"))
    date_to = fields.Str(load_default=None, validate=validate.Regexp(r'^\d{4}-\d{2}-\d{2}', error="Must be YYYY-MM-DD format"))
    limit = fields.Int(load_default=20, validate=validate.Range(min=1, max=30))


class FileCreateSchema(Schema):
    class Meta:
        unknown = EXCLUDE

    workspace_id = UUIDStr(load_default=None)
    file_name = fields.Str(required=True)
    mime_type = fields.Str(load_default=None)
    file_size = fields.Integer(load_default=0, strict=False)
    object_key = fields.Str(required=True)
    content_hash = fields.Str(load_default="")
    has_extracted_text = fields.Bool(load_default=False)
    has_metadata = fields.Bool(load_default=False)


class PresignUploadSchema(Schema):
    class Meta:
        unknown = EXCLUDE

    workspace_id = UUIDStr(load_default=None)
    file_name = fields.Str(required=True)
    content_type = fields.Str(required=True)
    file_size = fields.Int(required=True)
    content_hash = fields.Str(load_default=None)


class PresignMultipartSchema(Schema):
    class Meta:
        unknown = EXCLUDE

    workspace_id = UUIDStr(load_default=None)
    file_name = fields.Str(required=True)
    content_type = fields.Str(required=True)
    file_size = fields.Int(required=True)
    content_hash = fields.Str(load_default=None)


class PresignMultipartCompleteSchema(Schema):
    class Meta:
        unknown = EXCLUDE

    workspace_id = UUIDStr(load_default=None)
    file_id = UUIDStr(required=True)
    upload_id = fields.Str(required=True)
    parts = fields.List(fields.Dict(), required=True)


class QuarantineResolveSchema(Schema):
    class Meta:
        unknown = EXCLUDE

    approve = fields.Bool(required=True)


class NotificationCreateSchema(Schema):
    class Meta:
        unknown = EXCLUDE

    workspace_id = UUIDStr(load_default=None)
    user_id = UUIDStr(required=True)
    entity_id = UUIDStr(load_default=None, allow_none=True)
    type = fields.Str(required=True, validate=validate.OneOf([
        "mention", "comment", "update", "entity_update", "invite",
        "relation_created", "backup_complete", "sync_conflict", "system",
        "share", "version_created", "export_complete", "import_complete",
        "governance_report_ready", "system_alert"
    ]))
    title = fields.Str(required=True)
    body = fields.Str(load_default=None)
    data = fields.Dict(load_default=None, allow_none=True)


class JobCreateSchema(Schema):
    class Meta:
        unknown = EXCLUDE

    workspace_id = UUIDStr(load_default=None, allow_none=True)
    type = fields.Str(required=True)
    payload = fields.Dict(required=True)
    priority = fields.Str(load_default="medium", validate=validate.OneOf(["critical", "high", "medium", "low"]))
    idempotency_key = fields.Str(load_default=None, allow_none=True)


class CommentCreateSchema(Schema):
    class Meta:
        unknown = EXCLUDE

    workspace_id = UUIDStr(load_default=None)
    entity_id = UUIDStr(load_default=None, allow_none=True)
    block_id = UUIDStr(load_default=None, allow_none=True)
    parent_id = UUIDStr(load_default=None, allow_none=True)
    content = fields.Str(required=True, validate=validate.Length(min=2))
    display_name = fields.Str(required=True)
    avatar_url = fields.Str(load_default=None, allow_none=True)
    resolved = fields.Bool(load_default=False)


class CommentUpdateSchema(Schema):
    class Meta:
        unknown = EXCLUDE

    content = fields.Str(required=True, validate=validate.Length(min=2))
    display_name = fields.Str(allow_none=True)
    avatar_url = fields.Str(allow_none=True)
    resolved = fields.Bool()


class SyncOperationCreateSchema(Schema):
    class Meta:
        unknown = EXCLUDE

    workspace_id = UUIDStr(required=True)
    operation_type = fields.Str(required=True)
    entity_type = fields.Str(load_default=None, allow_none=True)
    entity_id = UUIDStr(load_default=None, allow_none=True)
    payload = fields.Dict(required=True)
    device_id = fields.Str(load_default=None, allow_none=True)
    client_clock = fields.Int(load_default=None, allow_none=True)
    synced = fields.Bool(load_default=False)


class TagCreateSchema(Schema):
    class Meta:
        unknown = EXCLUDE

    workspace_id = UUIDStr(required=True)
    name = fields.Str(required=True)
    color = fields.Str(load_default=None, allow_none=True)


class TagUpdateSchema(Schema):
    class Meta:
        unknown = EXCLUDE

    name = fields.Str(required=True)
    color = fields.Str(allow_none=True)


class WorkspaceMemberInviteSchema(Schema):
    class Meta:
        unknown = EXCLUDE

    email = fields.Email(required=True)
    role = fields.Str(required=True, validate=validate.OneOf(["owner", "admin", "editor", "viewer"]))
    display_name = fields.Str(load_default=None, allow_none=True)
    avatar_url = fields.Str(load_default=None, allow_none=True)


class WorkspaceMemberUpdateSchema(Schema):
    class Meta:
        unknown = EXCLUDE

    email = fields.Email(required=True)
    role = fields.Str(required=True, validate=validate.OneOf(["viewer", "editor", "admin", "owner"]))
    display_name = fields.Str(allow_none=True)
    avatar_url = fields.Str(allow_none=True)


class GovernanceReportCreateSchema(Schema):
    class Meta:
        unknown = EXCLUDE

    workspace_id = UUIDStr(required=True)
    type = fields.Str(required=True, validate=validate.OneOf(["access_audit", "change_log", "storage_summary", "activity_summary", "compliance"]))
    title = fields.Str(required=True)
    status = fields.Str(load_default="pending")
    data = fields.Dict(load_default=None, allow_none=True)
    params = fields.Dict(load_default=dict)
    created_by = UUIDStr(load_default=None, allow_none=True)


class DiffQuerySchema(Schema):
    class Meta:
        unknown = EXCLUDE

    workspace_id = UUIDStr(required=True)
    left_version_id = UUIDStr(load_default=None, allow_none=True)
    right_version_id = UUIDStr(load_default=None, allow_none=True)
    left_snapshot_id = UUIDStr(load_default=None, allow_none=True)
    right_snapshot_id = UUIDStr(load_default=None, allow_none=True)
    left_branch_id = UUIDStr(load_default=None, allow_none=True)
    right_branch_id = UUIDStr(load_default=None, allow_none=True)
    entity_type_id = UUIDStr(load_default=None, allow_none=True)
    limit = fields.Int(load_default=100, validate=validate.Range(min=1, max=500))


class UserUpdateSchema(Schema):
    class Meta:
        unknown = EXCLUDE

    name = fields.Str()
    avatar_url = fields.Str(allow_none=True)
    profile_image_url = fields.Str(allow_none=True)


class EntityTypeUpdateSchema(Schema):
    class Meta:
        unknown = EXCLUDE

    name = fields.Str()
    slug = fields.Str()
    icon = fields.Str(allow_none=True)
    description = fields.Str(allow_none=True)
    color = fields.Str(allow_none=True)
    config = fields.Dict()


class PropertyUpdateSchema(Schema):
    class Meta:
        unknown = EXCLUDE

    name = fields.Str()
    type = fields.Str(validate=validate.OneOf([
        "text", "number", "date", "select", "multi_select",
        "checkbox", "url", "email", "phone", "rich_text",
        "boolean", "entity_ref"
    ]))
    entity_type_id = UUIDStr(allow_none=True)
    description = fields.Str(allow_none=True)
    required = fields.Bool()
    options = fields.List(fields.Str())
    config = fields.Dict()
    default_value = fields.Raw(allow_none=True)


class UserSchema(Schema):
    id = fields.Str()
    email = fields.Email()
    name = fields.Str()
    avatar_url = fields.Str(allow_none=True)
    profile_image_url = fields.Str(allow_none=True)
    updated_at = fields.DateTime()
    created_at = fields.DateTime()
    is_deleted = fields.Bool()
    deleted_at = fields.DateTime(allow_none=True)
    deleted_by = fields.Str(allow_none=True)

    class Meta:
        unknown = EXCLUDE


class SessionSchema(Schema):
    id = fields.Str()
    user_id = fields.Str()
    jti = fields.Str(allow_none=True)
    refresh_jti = fields.Str()
    user_agent = fields.Str(allow_none=True)
    ip_address = fields.Str(allow_none=True)
    revoked_at = fields.DateTime(allow_none=True)
    expires_at = fields.DateTime()
    created_at = fields.DateTime()
    is_deleted = fields.Bool()
    deleted_at = fields.DateTime(allow_none=True)
    deleted_by = fields.Str(allow_none=True)

    class Meta:
        unknown = EXCLUDE


class AuthCodeSchema(Schema):
    id = fields.Str()
    code = fields.Str()
    user_id = fields.Str()
    redirect_uri = fields.Str(allow_none=True)
    expires_at = fields.DateTime()
    consumed_at = fields.DateTime(allow_none=True)
    created_at = fields.DateTime()
    is_deleted = fields.Bool()
    deleted_at = fields.DateTime(allow_none=True)
    deleted_by = fields.Str(allow_none=True)

    class Meta:
        unknown = EXCLUDE


class WorkspaceSchema(Schema):
    id = fields.Str()
    name = fields.Str()
    description = fields.Str(allow_none=True)
    settings = fields.Dict(dump_default=dict)
    owner_id = fields.Str()
    deployment_mode = fields.Str()
    sync_enabled = fields.Bool()
    cloud_workspace_id = fields.Str(allow_none=True)
    icon = fields.Str(allow_none=True)
    color = fields.Str(allow_none=True)
    is_deleted = fields.Bool()
    deleted_at = fields.DateTime(allow_none=True)
    deleted_by = fields.Str(allow_none=True)
    created_at = fields.DateTime()
    updated_at = fields.DateTime()

    class Meta:
        unknown = EXCLUDE


class InviteSchema(Schema):
    id = fields.Str()
    workspace_id = fields.Str()
    email = fields.Str()
    role = fields.Str()
    invited_by = fields.Str()
    token = fields.Str()
    status = fields.Str()
    message = fields.Str(allow_none=True)
    expires_at = fields.DateTime()
    accepted_at = fields.DateTime(allow_none=True)
    accepted_by = fields.Str(allow_none=True)
    created_at = fields.DateTime()
    updated_at = fields.DateTime()
    is_deleted = fields.Bool()
    deleted_at = fields.DateTime(allow_none=True)
    deleted_by = fields.Str(allow_none=True)

    class Meta:
        unknown = EXCLUDE


class EntitySchema(Schema):
    id = fields.Str()
    workspace_id = fields.Str()
    entity_type_id = fields.Str()
    name = fields.Str(allow_none=True)
    icon = fields.Str(allow_none=True)
    cover_image = fields.Str(allow_none=True)
    parent_id = fields.Str(allow_none=True)
    sort_order = fields.Int(allow_none=True)
    summary = fields.Str(allow_none=True)
    properties = fields.Dict(dump_default=dict)
    is_favorite = fields.Bool()
    color = fields.Str(allow_none=True)
    is_archived = fields.Bool()
    archived_at = fields.DateTime(allow_none=True)
    is_deleted = fields.Bool()
    deleted_at = fields.DateTime(allow_none=True)
    deleted_by = fields.Str(allow_none=True)
    version = fields.Int()
    created_by = fields.Str(allow_none=True)
    created_at = fields.DateTime()
    updated_at = fields.DateTime()
    block_count = fields.Int(dump_default=0)

    class Meta:
        unknown = EXCLUDE


class EntityPropertyValueSchema(Schema):
    id = fields.Str()
    entity_id = fields.Str()
    property_id = fields.Str()
    value = fields.Raw()
    created_at = fields.DateTime()
    updated_at = fields.DateTime()
    is_deleted = fields.Bool()
    deleted_at = fields.DateTime(allow_none=True)
    deleted_by = fields.Str(allow_none=True)

    class Meta:
        unknown = EXCLUDE


class BlockSchema(Schema):
    id = fields.Str()
    entity_id = fields.Str()
    parent_block_id = fields.Str(allow_none=True)
    type = fields.Str()
    content = fields.Raw()
    position = fields.Decimal(as_string=True)
    branch_id = fields.Str()
    content_hash = fields.Str()
    indent = fields.Int()
    properties = fields.Dict(dump_default=dict)
    version = fields.Int()
    is_deleted = fields.Bool()
    deleted_at = fields.DateTime(allow_none=True)
    deleted_by = fields.Str(allow_none=True)
    created_at = fields.DateTime()
    updated_at = fields.DateTime()

    class Meta:
        unknown = EXCLUDE


class CommentSchema(Schema):
    id = fields.Str()
    workspace_id = fields.Str()
    entity_id = fields.Str(allow_none=True)
    block_id = fields.Str(allow_none=True)
    parent_id = fields.Str(allow_none=True)
    user_id = fields.Str()
    content = fields.Str()
    display_name = fields.Str()
    avatar_url = fields.Str(allow_none=True)
    resolved = fields.Bool()
    is_deleted = fields.Bool()
    deleted_at = fields.DateTime(allow_none=True)
    deleted_by = fields.Str(allow_none=True)
    created_at = fields.DateTime()
    updated_at = fields.DateTime()

    class Meta:
        unknown = EXCLUDE


class CommentReactionSchema(Schema):
    id = fields.Str()
    comment_id = fields.Str()
    user_id = fields.Str()
    reaction = fields.Str()
    created_at = fields.DateTime()
    is_deleted = fields.Bool()
    deleted_at = fields.DateTime(allow_none=True)
    deleted_by = fields.Str(allow_none=True)

    class Meta:
        unknown = EXCLUDE


class RelationSchema(Schema):
    id = fields.Str()
    workspace_id = fields.Str()
    source_id = fields.Str()
    target_id = fields.Str()
    type = fields.Str()
    generated_by = fields.Str()
    verified = fields.Bool(dump_default=True)
    confidence = fields.Float(allow_none=True)
    ai_model = fields.Str(allow_none=True)
    properties = fields.Dict(dump_default=dict)
    label = fields.Str(allow_none=True)
    created_by = fields.Str(allow_none=True)
    created_at = fields.DateTime()
    updated_at = fields.DateTime()
    is_deleted = fields.Bool()
    deleted_at = fields.DateTime(allow_none=True)
    deleted_by = fields.Str(allow_none=True)

    class Meta:
        unknown = EXCLUDE


class EntityFileSchema(Schema):
    id = fields.Str()
    entity_id = fields.Str()
    file_id = fields.Str()
    block_id = fields.Str(allow_none=True)
    created_at = fields.DateTime()
    is_deleted = fields.Bool()
    deleted_at = fields.DateTime(allow_none=True)
    deleted_by = fields.Str(allow_none=True)

    class Meta:
        unknown = EXCLUDE


class FileVariantSchema(Schema):
    id = fields.Str()
    file_id = fields.Str()
    variant_type = fields.Str()
    object_key = fields.Str()
    mime_type = fields.Str()
    width = fields.Integer(allow_none=True)
    height = fields.Integer(allow_none=True)
    file_size = fields.Integer(allow_none=True)
    algorithm = fields.Str(allow_none=True)
    algorithm_version = fields.Str(allow_none=True)
    quality = fields.Integer(allow_none=True)
    created_at = fields.DateTime()
    updated_at = fields.DateTime()
    is_deleted = fields.Bool()
    deleted_at = fields.DateTime(allow_none=True)
    deleted_by = fields.Str(allow_none=True)

    class Meta:
        unknown = EXCLUDE


class FileSchema(Schema):
    id = fields.Str()
    workspace_id = fields.Str()
    file_name = fields.Str()
    mime_type = fields.Str()
    file_size = fields.Integer(allow_none=True)
    content_hash = fields.Str()
    state = fields.Str()
    storage_provider = fields.Str()
    object_key = fields.Str()
    uploaded_by = fields.Str(allow_none=True)
    uploaded_at = fields.DateTime()
    updated_at = fields.DateTime()
    has_extracted_text = fields.Bool()
    has_metadata = fields.Bool()
    extracted_text = fields.Str(allow_none=True)
    metadata_json = fields.Dict(dump_default=None, allow_none=True)
    is_deleted = fields.Bool()
    deleted_at = fields.DateTime(allow_none=True)
    deleted_by = fields.Str(allow_none=True)
    object_lock_mode = fields.Str(allow_none=True)
    object_lock_retain_until = fields.DateTime(allow_none=True)
    legal_hold_status = fields.Bool(dump_default=False)
    storage_class = fields.Str(dump_default="STANDARD")

    class Meta:
        unknown = EXCLUDE


class EntityVersionSchema(Schema):
    id = fields.Str()
    entity_id = fields.Str()
    branch_id = fields.Str(allow_none=True)
    changeset_id = fields.Str(allow_none=True)
    snapshot_id = fields.Str(allow_none=True)
    version = fields.Integer(allow_none=True)
    message = fields.Str(allow_none=True)
    snapshot = fields.Dict()
    content_hash = fields.Str()
    created_by = fields.Str(allow_none=True)
    created_at = fields.DateTime()
    is_deleted = fields.Bool()
    deleted_at = fields.DateTime(allow_none=True)
    deleted_by = fields.Str(allow_none=True)

    class Meta:
        unknown = EXCLUDE


class BlockVersionSchema(Schema):
    id = fields.Str()
    block_id = fields.Str()
    changeset_id = fields.Str(allow_none=True)
    snapshot = fields.Dict()
    content_hash = fields.Str()
    created_at = fields.DateTime()
    is_deleted = fields.Bool()
    deleted_at = fields.DateTime(allow_none=True)
    deleted_by = fields.Str(allow_none=True)

    class Meta:
        unknown = EXCLUDE


class MergeConflictSchema(Schema):
    id = fields.Str()
    merge_id = fields.Str()
    workspace_id = fields.Str()
    entity_id = fields.Str()
    conflict_type = fields.Str()
    details = fields.Dict()
    resolved = fields.Bool()
    resolved_by = fields.Str(allow_none=True)
    resolution = fields.Str(allow_none=True)
    resolved_at = fields.DateTime(allow_none=True)
    is_deleted = fields.Bool()
    deleted_at = fields.DateTime(allow_none=True)
    deleted_by = fields.Str(allow_none=True)

    class Meta:
        unknown = EXCLUDE


class EntityBranchHeadSchema(Schema):
    id = fields.Str()
    branch_id = fields.Str()
    entity_id = fields.Str()
    current_version_id = fields.Str(allow_none=True)
    base_version_id = fields.Str(allow_none=True)
    is_deleted = fields.Bool()
    deleted_at = fields.DateTime(allow_none=True)
    deleted_by = fields.Str(allow_none=True)

    class Meta:
        unknown = EXCLUDE


class EntityEventSchema(Schema):
    id = fields.Str()
    workspace_id = fields.Str()
    entity_id = fields.Str()
    user_id = fields.Str(allow_none=True)
    changeset_id = fields.Str(allow_none=True)
    event_type = fields.Str()
    payload = fields.Dict()
    created_at = fields.DateTime()
    is_deleted = fields.Bool()
    deleted_at = fields.DateTime(allow_none=True)
    deleted_by = fields.Str(allow_none=True)

    class Meta:
        unknown = EXCLUDE


class EmbeddingSchema(Schema):
    id = fields.Str()
    workspace_id = fields.Str()
    entity_id = fields.Str(allow_none=True)
    block_id = fields.Str(allow_none=True)
    model = fields.Str()
    embedding = fields.Raw(allow_none=True)
    content_hash = fields.Str()
    created_at = fields.DateTime()
    updated_at = fields.DateTime()
    is_deleted = fields.Bool()
    deleted_at = fields.DateTime(allow_none=True)
    deleted_by = fields.Str(allow_none=True)

    class Meta:
        unknown = EXCLUDE


class SearchDocumentSchema(Schema):
    id = fields.Str()
    workspace_id = fields.Str()
    entity_id = fields.Str()
    block_id = fields.Str(allow_none=True)
    title = fields.Str(allow_none=True)
    content = fields.Str(allow_none=True)
    content_hash = fields.Str()
    search_vector = fields.Raw(allow_none=True)
    created_at = fields.DateTime()
    updated_at = fields.DateTime()
    is_deleted = fields.Bool()
    deleted_at = fields.DateTime(allow_none=True)
    deleted_by = fields.Str(allow_none=True)

    class Meta:
        unknown = EXCLUDE


class GraphMaterializationSchema(Schema):
    id = fields.Str()
    workspace_id = fields.Str()
    graph_snapshot = fields.Dict()
    version_hash = fields.Str(allow_none=True)
    generated_at = fields.DateTime()
    created_at = fields.DateTime()
    updated_at = fields.DateTime()
    is_deleted = fields.Bool()
    deleted_at = fields.DateTime(allow_none=True)
    deleted_by = fields.Str(allow_none=True)

    class Meta:
        unknown = EXCLUDE


class EntityTagSchema(Schema):
    id = fields.Str()
    entity_id = fields.Str()
    tag_id = fields.Str()
    created_at = fields.DateTime()
    is_deleted = fields.Bool()
    deleted_at = fields.DateTime(allow_none=True)
    deleted_by = fields.Str(allow_none=True)

    class Meta:
        unknown = EXCLUDE


class TagSchema(Schema):
    id = fields.Str()
    workspace_id = fields.Str()
    name = fields.Str()
    color = fields.Str(allow_none=True)
    entity_count = fields.Integer(dump_default=0)
    created_at = fields.DateTime()
    updated_at = fields.DateTime()
    is_deleted = fields.Bool()
    deleted_at = fields.DateTime(allow_none=True)
    deleted_by = fields.Str(allow_none=True)

    class Meta:
        unknown = EXCLUDE


class NotificationSchema(Schema):
    id = fields.Str()
    workspace_id = fields.Str()
    user_id = fields.Str()
    entity_id = fields.Str(allow_none=True)
    type = fields.Str()
    title = fields.Str()
    body = fields.Str(dump_default=None)
    data = fields.Dict(dump_default=dict)
    is_read = fields.Bool()
    is_deleted = fields.Bool()
    deleted_at = fields.DateTime(allow_none=True)
    deleted_by = fields.Str(allow_none=True)
    created_at = fields.DateTime()

    class Meta:
        unknown = EXCLUDE


class ActivityEntrySchema(Schema):
    id = fields.Str()
    workspace_id = fields.Str()
    entity_id = fields.Str(allow_none=True)
    block_id = fields.Str(allow_none=True)
    user_id = fields.Str(allow_none=True)
    display_name = fields.Str(allow_none=True)
    action = fields.Str()
    resource_type = fields.Str(allow_none=True)
    resource_id = fields.Str(allow_none=True)
    details = fields.Dict(dump_default=dict)
    created_at = fields.DateTime()
    is_deleted = fields.Bool()
    deleted_at = fields.DateTime(allow_none=True)
    deleted_by = fields.Str(allow_none=True)

    class Meta:
        unknown = EXCLUDE


class WorkspaceMemberSchema(Schema):
    id = fields.Str()
    workspace_id = fields.Str()
    user_id = fields.Str()
    role = fields.Str()
    email = fields.Str()
    display_name = fields.Str()
    avatar_url = fields.Str(allow_none=True)
    joined_at = fields.DateTime()
    updated_at = fields.DateTime()
    is_deleted = fields.Bool()
    deleted_at = fields.DateTime(allow_none=True)
    deleted_by = fields.Str(allow_none=True)

    class Meta:
        unknown = EXCLUDE


class EntityTypeSchema(Schema):
    id = fields.Str()
    workspace_id = fields.Str()
    name = fields.Str()
    slug = fields.Str()
    icon = fields.Str(allow_none=True)
    description = fields.Str(allow_none=True)
    color = fields.Str(allow_none=True)
    config = fields.Dict(dump_default=dict)
    created_at = fields.DateTime()
    updated_at = fields.DateTime()
    is_deleted = fields.Bool()
    deleted_at = fields.DateTime(allow_none=True)
    deleted_by = fields.Str(allow_none=True)

    class Meta:
        unknown = EXCLUDE


class PropertySchema(Schema):
    id = fields.Str()
    workspace_id = fields.Str()
    entity_type_id = fields.Str(allow_none=True)
    name = fields.Str()
    type = fields.Str()
    description = fields.Str(allow_none=True)
    required = fields.Bool()
    options = fields.List(fields.Str(), dump_default=list)
    config = fields.Dict(dump_default=dict)
    default_value = fields.Raw(allow_none=True)
    created_at = fields.DateTime()
    updated_at = fields.DateTime()
    is_deleted = fields.Bool()
    deleted_at = fields.DateTime(allow_none=True)
    deleted_by = fields.Str(allow_none=True)

    class Meta:
        unknown = EXCLUDE


class BranchSchema(Schema):
    id = fields.Str()
    workspace_id = fields.Str()
    parent_branch_id = fields.Str(allow_none=True)
    name = fields.Str()
    description = fields.Str(allow_none=True)
    is_default = fields.Bool()
    is_locked = fields.Bool()
    created_by = fields.Str(allow_none=True)
    version = fields.Integer()
    created_at = fields.DateTime()
    updated_at = fields.DateTime()
    is_deleted = fields.Bool()
    deleted_at = fields.DateTime(allow_none=True)
    deleted_by = fields.Str(allow_none=True)

    class Meta:
        unknown = EXCLUDE


class SnapshotSchema(Schema):
    id = fields.Str()
    branch_id = fields.Str()
    name = fields.Str(allow_none=True)
    description = fields.Str(allow_none=True)
    metadata = fields.Dict(dump_default=dict)
    created_by = fields.Str(allow_none=True)
    created_at = fields.DateTime()
    is_deleted = fields.Bool()
    deleted_at = fields.DateTime(allow_none=True)
    deleted_by = fields.Str(allow_none=True)

    class Meta:
        unknown = EXCLUDE


class ChangesetSchema(Schema):
    id = fields.Str()
    branch_id = fields.Str()
    snapshot_id = fields.Str(allow_none=True)
    message = fields.Str(allow_none=True)
    created_by = fields.Str(allow_none=True)
    created_at = fields.DateTime()
    is_deleted = fields.Bool()
    deleted_at = fields.DateTime(allow_none=True)
    deleted_by = fields.Str(allow_none=True)

    class Meta:
        unknown = EXCLUDE


class BranchMergeSchema(Schema):
    id = fields.Str()
    source_branch_id = fields.Str()
    target_branch_id = fields.Str()
    created_by = fields.Str(allow_none=True)
    merged_at = fields.DateTime()
    status = fields.Str()
    metadata = fields.Dict(dump_default=dict)
    is_deleted = fields.Bool()
    deleted_at = fields.DateTime(allow_none=True)
    deleted_by = fields.Str(allow_none=True)

    class Meta:
        unknown = EXCLUDE


class JobSchema(Schema):
    id = fields.Str()
    workspace_id = fields.Str(allow_none=True)
    type = fields.Str()
    status = fields.Str()
    progress = fields.Integer(dump_default=0)
    message = fields.Str(allow_none=True)
    priority = fields.Str()
    payload = fields.Dict()
    result = fields.Dict(allow_none=True)
    error = fields.Dict(allow_none=True)
    idempotency_key = fields.Str(allow_none=True)
    retry_count = fields.Integer()
    max_retries = fields.Integer()
    timeout_seconds = fields.Integer(allow_none=True)
    created_by = fields.Str(allow_none=True)
    started_at = fields.DateTime(allow_none=True)
    completed_at = fields.DateTime(allow_none=True)
    schedule_at = fields.DateTime(allow_none=True)
    created_at = fields.DateTime()
    is_deleted = fields.Bool()
    deleted_at = fields.DateTime(allow_none=True)
    deleted_by = fields.Str(allow_none=True)

    class Meta:
        unknown = EXCLUDE


class SyncOperationSchema(Schema):
    id = fields.Str()
    workspace_id = fields.Str()
    operation_type = fields.Str()
    entity_type = fields.Str(allow_none=True)
    entity_id = fields.Str(allow_none=True)
    payload = fields.Dict()
    device_id = fields.Str(allow_none=True)
    client_clock = fields.Integer(allow_none=True)
    synced = fields.Bool()
    retry_count = fields.Integer()
    error_message = fields.Str(allow_none=True)
    synced_at = fields.DateTime(allow_none=True)
    created_at = fields.DateTime()
    updated_at = fields.DateTime()
    is_deleted = fields.Bool()
    deleted_at = fields.DateTime(allow_none=True)
    deleted_by = fields.Str(allow_none=True)

    class Meta:
        unknown = EXCLUDE


class GovernanceReportSchema(Schema):
    id = fields.Str()
    workspace_id = fields.Str()
    type = fields.Str()
    title = fields.Str()
    status = fields.Str()
    data = fields.Dict(allow_none=True)
    params = fields.Dict(allow_none=True)
    created_by = fields.Str(allow_none=True)
    created_at = fields.DateTime()
    is_deleted = fields.Bool()
    deleted_at = fields.DateTime(allow_none=True)
    deleted_by = fields.Str(allow_none=True)

    class Meta:
        unknown = EXCLUDE
