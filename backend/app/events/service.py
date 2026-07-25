"""Event persistence service and in-process event bus."""

import json
from collections import defaultdict
from typing import Any, Callable, Optional


from app.core.logging import logger
from app.extensions import db
from app.models import EntityEvent
from app.repositories import ActivityLogRepository, EntityEventRepository


class EventBus:
    """Simple in-process pub/sub event bus."""

    def __init__(self):
        self._handlers: dict[str, list[Callable]] = defaultdict(list)

    def subscribe(self, event_type: str, handler: Callable) -> None:
        self._handlers[event_type].append(handler)

    def unsubscribe(self, event_type: str, handler: Callable) -> None:
        if handler in self._handlers[event_type]:
            self._handlers[event_type].remove(handler)

    def publish(self, event_type: str, data: dict[str, Any]) -> None:
        for handler in self._handlers.get(event_type, []):
            try:
                handler(data)
            except Exception as e:
                logger.error("event_handler_failed", event_type=event_type, error=str(e))
        try:
            from app.extensions import redis_client
            if redis_client:
                redis_client.publish(f"events:{event_type}", json.dumps(data, default=str))
        except Exception:
            logger.warning("redis_publish_failed", event_type=event_type)


event_bus = EventBus()


class EventService:
    """Service for creating entity events and activity log entries."""

    def entity_event(
        self,
        entity_id: str,
        user_id: str,
        workspace_id: str,
        event_type: str,
        metadata: Optional[dict[str, Any]] = None,
    ) -> EntityEvent:
        """Record an entity-level event (create, update, delete, etc.)."""
        if not entity_id:
            raise ValueError("entity_id is required")
        if not event_type or not isinstance(event_type, str):
            raise ValueError("event_type must be a non-empty string")
        if metadata is not None and not isinstance(metadata, dict):
            raise ValueError("metadata must be a dict if provided")
        event = EntityEventRepository().create(
            {
                "entity_id": entity_id,
                "user_id": user_id,
                "workspace_id": workspace_id,
                "event_type": event_type,
                "payload": metadata or {},
            }
        )
        event_bus.publish(event_type, {
            "entity_id": entity_id,
            "workspace_id": workspace_id,
            "event_type": event_type,
            "metadata": metadata or {},
        })
        return event

    def activity(
        self,
        workspace_id: str,
        action: str,
        user_id: Optional[str] = None,
        entity_id: Optional[str] = None,
        block_id: Optional[str] = None,
        details: Optional[dict[str, Any]] = None,
    ) -> Any:
        """Record a workspace-level activity log entry."""
        if not action or not isinstance(action, str):
            raise ValueError("action must be a non-empty string")
        if details is not None and not isinstance(details, dict):
            raise ValueError("details must be a dict if provided")
        return ActivityLogRepository().create(
            {
                "workspace_id": workspace_id,
                "user_id": user_id,
                "entity_id": entity_id,
                "block_id": block_id,
                "action": action,
                "details": details or {},
            }
        )

    def commit(self) -> None:
        """Flush pending changes to the database with error handling."""
        try:
            db.session.commit()
        except Exception:
            logger.exception("Failed to commit to database")
            db.session.rollback()
            raise
