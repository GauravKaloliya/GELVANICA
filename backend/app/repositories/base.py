from datetime import datetime, timezone
from typing import Any, Dict, Generic, List, Optional, Type, TypeVar

from sqlalchemy import inspect

from app.core.constants import DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE
from app.core.errors import ConflictError, NotFoundError
from app.extensions import db

T = TypeVar("T")


class BaseRepository(Generic[T]):
    """Generic CRUD repository providing standard database operations."""

    model: Any = None

    def __init__(self, model: Optional[Type[T]] = None, session: Any = None) -> None:
        if model is not None:
            self.model = model
        if self.model is None:
            raise ValueError("Repository model is required")
        self.session = session or db.session

    def _apply_filters(self, query: Any, filters: Optional[Dict[str, Any]] = None, include_deleted: bool = False) -> Any:
        """Apply filter conditions and soft-delete awareness to a query."""
        if not include_deleted:
            if hasattr(self.model, "is_deleted"):
                query = query.filter(self.model.is_deleted.is_(False))
        for key, value in (filters or {}).items():
            if value is not None and hasattr(self.model, key):
                query = query.filter(getattr(self.model, key) == value)
        return query

    def query(self, include_deleted: bool = False) -> Any:
        """Return a base query, optionally including soft-deleted records."""
        query = self.session.query(self.model)
        if hasattr(self.model, "is_deleted") and not include_deleted:
            query = query.filter(self.model.is_deleted.is_(False))
        return query

    def list(
        self,
        filters: Optional[Dict[str, Any]] = None,
        page: int = 1,
        per_page: int = DEFAULT_PAGE_SIZE,
        order_by: Optional[str] = None,
        descending: bool = True,
        *options: Any,
    ) -> Any:
        """Return a paginated list of records matching the given filters."""
        query = self.query()
        if filters:
            query = self._apply_filters(query, filters)
        for opt in options:
            query = query.options(opt)
        if order_by and not hasattr(self.model, order_by):
            order_by = None
        if order_by:
            col = getattr(self.model, order_by)
            if col:
                query = query.order_by(col.desc() if descending else col.asc())
        elif hasattr(self.model, "created_at"):
            query = query.order_by(self.model.created_at.desc())
        return query.paginate(page=page, per_page=min(per_page, MAX_PAGE_SIZE), error_out=False)

    def count(self, filters: Optional[Dict[str, Any]] = None, include_deleted: bool = False) -> int:
        """Return the count of records matching the given filters."""
        query = self.query(include_deleted=include_deleted)
        if filters:
            query = self._apply_filters(query, filters)
        return query.count()

    def exists(self, object_id: str, include_deleted: bool = False) -> bool:
        """Check whether a record with the given ID exists without loading it."""
        query = self.query(include_deleted=include_deleted)
        query = query.filter(self.model.id == str(object_id))
        return self.session.query(query.exists()).scalar()

    def get(self, object_id: str, include_deleted: bool = False) -> T:
        """Return a single record by ID, or raise NotFoundError."""
        item = self.query(include_deleted=include_deleted).filter(self.model.id == str(object_id)).first()
        if not item:
            raise NotFoundError(f"{self.model.__name__} not found")
        return item

    def create(self, data: Dict[str, Any]) -> T:
        """Create and return a new record from the given data dict."""
        allowed = self.columns()
        sanitized = {key: value for key, value in data.items() if key in allowed}
        readonly = {"id", "is_deleted", "created_at", "updated_at", "deleted_at", "deleted_by", "version"}
        for key in readonly:
            sanitized.pop(key, None)
        item = self.model(**sanitized)
        self.session.add(item)
        self.session.flush()
        return item

    def update(self, item: T, data: Dict[str, Any]) -> T:
        """Update mutable fields on an existing record. Auto-detects version for optimistic locking."""
        if hasattr(item, 'version') and getattr(item, 'version', None) is not None:
            return self.update_with_version(item, data)
        readonly = {"id", "is_deleted", "deleted_at", "deleted_by", "created_at", "updated_at", "version"}
        data = {k: v for k, v in data.items() if k not in readonly}
        for key, value in data.items():
            if hasattr(item, key):
                setattr(item, key, value)
        self.session.flush()
        return item

    def update_with_version(self, model_instance, data: dict) -> T:
        """Update with optimistic locking check. Returns the updated instance."""
        current_version = getattr(model_instance, 'version', None)
        if current_version is not None:
            old_version = current_version
            update_data = {k: v for k, v in data.items() if k != 'version'}
            update_data['version'] = current_version + 1
            result = self.session.query(type(model_instance)).filter_by(
                id=model_instance.id, version=old_version
            ).update(update_data, synchronize_session='fetch')
            if result == 0:
                raise ConflictError("Record was modified by another request")
            self.session.flush()
            setattr(model_instance, 'version', current_version + 1)
        else:
            readonly = {"id", "is_deleted", "deleted_at", "deleted_by", "created_at", "updated_at", "version"}
            clean = {k: v for k, v in data.items() if k not in readonly}
            for key, value in clean.items():
                if hasattr(model_instance, key):
                    setattr(model_instance, key, value)
            self.session.flush()
        return model_instance

    def soft_delete(self, item: T, deleted_by: Optional[str] = None) -> T:
        """Soft-delete a record (or hard-delete if soft-delete is unsupported)."""
        if hasattr(item, "is_deleted"):
            item.is_deleted = True
            if hasattr(item, "deleted_at"):
                item.deleted_at = datetime.now(timezone.utc)
            if deleted_by is not None and hasattr(item, "deleted_by"):
                item.deleted_by = str(deleted_by)
        else:
            self.session.delete(item)
        return item

    def hard_delete(self, item: T) -> None:
        """Permanently delete a record from the database."""
        self.session.delete(item)

    def restore(self, item: T) -> T:
        """Restore a soft-deleted record."""
        if hasattr(item, "is_deleted"):
            item.is_deleted = False
            item.deleted_at = None
            if hasattr(item, "deleted_by"):
                item.deleted_by = None
        return item

    def bulk_create(self, items: List[Dict[str, Any]]) -> List[T]:
        """Create multiple records at once."""
        objs = [self.model(**item) for item in items]
        self.session.add_all(objs)
        self.session.flush()
        return objs

    def bulk_update(self, filters: Dict[str, Any], values: Dict[str, Any]) -> int:
        """Update multiple records matching filters."""
        query = self.session.query(self.model)
        if hasattr(self.model, "is_deleted"):
            query = query.filter(self.model.is_deleted.is_(False))
        return query.filter_by(**filters).update(values, synchronize_session='fetch')

    def bulk_delete(self, filters: Dict[str, Any]) -> int:
        """Delete multiple records matching filters."""
        if hasattr(self.model, "is_deleted"):
            values = {"is_deleted": True}
            if hasattr(self.model, "deleted_at"):
                values["deleted_at"] = datetime.now(timezone.utc)
            return self.session.query(self.model).filter_by(**filters).update(values, synchronize_session='fetch')
        return self.session.query(self.model).filter_by(**filters).delete(synchronize_session='fetch')

    def columns(self) -> set:
        """Return the set of column keys for the model."""
        return {column.key for column in inspect(self.model).mapper.column_attrs}
