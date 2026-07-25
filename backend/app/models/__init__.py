import os

_mode = os.environ.get("GNOVIUM_MODE", "local").strip().lower()
_in_test = os.environ.get("PYTEST_VERSION") or os.environ.get("TESTING", "").strip().lower() in ("true", "1", "yes")

if _mode == "cloud":
    from app.models.domain import (
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
        FileVariant,
        GovernanceReport,
        GraphMaterialization,
        Invite,
        Job,
        MergeConflict,
        Notification,
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
    from app.models.domain import EntityProperty as Property
    from app.models.domain import File as FileRecord
    File = FileRecord
else:
    from app.models.local import (
        ActivityLog,
        AuthCode,
        Block,
        BlockVersion,
        Branch,
        Changeset,
        Embedding,
        Entity,
        EntityBranchHead,
        EntityEvent,
        EntityFile,
        EntityPropertyValue,
        EntityTag,
        EntityType,
        EntityVersion,
        GraphMaterialization,
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
    )
    from app.models.local import File as FileRecord
    File = FileRecord

    class _QueryProxy:
        def __init__(self, model_cls):
            self._model_cls = model_cls
        def filter_by(self, **kwargs):
            return self
        def filter(self, *args, **kwargs):
            return self
        def all(self):
            return []
        def first(self):
            return None
        def count(self):
            return 0
        def order_by(self, *args, **kwargs):
            return self
        def limit(self, n):
            return self
        def offset(self, n):
            return self
        def paginate(self, *args, **kwargs):
            from flask_sqlalchemy.pagination import Pagination
            return Pagination(self, 1, 1, 0, [])
        def __iter__(self):
            return iter([])
        def __bool__(self):
            return False

    class _CloudOnlyStubMeta(type):
        def __getattr__(cls, name):
            if name.startswith('_'):
                raise AttributeError(name)
            if name == 'query':
                raise NotImplementedError(
                    f"{cls.__name__} is only available in cloud mode. "
                    "The local SQLite backend does not support this feature."
                )
            return None

    class _CloudOnlyStub(metaclass=_CloudOnlyStubMeta):
        def __init__(self, *args, **kwargs):
            raise RuntimeError(f"{type(self).__name__} is only available in cloud mode")
        def __getattr__(self, name):
            if name.startswith('_'):
                raise AttributeError(name)
            return None

    class BranchMerge(_CloudOnlyStub):
        pass
    class Comment(_CloudOnlyStub):
        pass
    class CommentReaction(_CloudOnlyStub):
        pass
    class FileVariant(_CloudOnlyStub):
        pass
    class GovernanceReport(_CloudOnlyStub):
        pass
    class Invite(_CloudOnlyStub):
        pass
    class Job(_CloudOnlyStub):
        pass
    class MergeConflict(_CloudOnlyStub):
        pass
    class WorkspaceMember(_CloudOnlyStub):
        pass

__all__ = [
    "ActivityLog", "AuthCode", "Block", "BlockVersion", "Branch",
    "BranchMerge", "Changeset", "Comment", "CommentReaction", "Embedding",
    "Entity", "EntityBranchHead", "EntityEvent", "EntityFile",
    "EntityPropertyValue", "EntityTag", "EntityType", "EntityVersion",
    "File", "FileVariant", "GovernanceReport", "GraphMaterialization",
    "Invite", "Job", "MergeConflict", "Notification", "Property",
    "Relation", "SearchDocument", "Session", "Snapshot", "SyncOperation",
    "Tag", "User", "Workspace", "WorkspaceMember",
]
