import hashlib
import json
from collections import deque
from datetime import datetime, timezone
from typing import Any, Optional

from app.core.constants import GRAPH_MAX_ITERATIONS
from app.core.errors import NotFoundError
from app.extensions import db
from app.repositories import GraphMaterializationRepository, RelationRepository, EntityRepository

from app.models import Entity, Relation


class GraphService:
    """Service for graph materialization, querying, traversal, and pathfinding."""

    def materialize(self, workspace_id: str, force: bool = False) -> Any:
        """Generate and store a graph snapshot for the given workspace.

        Uses incremental materialization: only processes entities/relations
        changed since the last materialization unless force=True.
        """
        from app.models import GraphMaterialization

        last = GraphMaterialization.query.filter_by(
            workspace_id=workspace_id
        ).order_by(GraphMaterialization.created_at.desc()).first()

        since = None if force else (last.created_at if last else None)

        entity_query = EntityRepository().query().filter_by(workspace_id=workspace_id)
        relation_query = RelationRepository().query().filter_by(workspace_id=workspace_id)

        if since:
            entity_query = entity_query.filter(
                db.or_(
                    Entity.updated_at > since,
                    Entity.created_at > since,
                )
            )
            from app.models import Relation
            relation_query = relation_query.filter(
                db.or_(Relation.created_at > since, Relation.updated_at > since)
            )

        entities = entity_query.all()
        relations = relation_query.all()

        nodes = [
            {"id": str(e.id), "name": e.name, "type": str(e.entity_type_id), "icon": e.icon}
            for e in entities
        ]
        edges = [
            {
                "id": str(r.id),
                "source": str(r.source_id),
                "target": str(r.target_id),
                "type": r.type,
            }
            for r in relations
        ]
        snapshot = {"nodes": nodes, "edges": edges, "generated_at": datetime.now(timezone.utc).isoformat()}
        version_hash = hashlib.sha256(json.dumps(snapshot, sort_keys=True).encode()).hexdigest()

        mat = GraphMaterializationRepository().create(
            {
                "workspace_id": workspace_id,
                "graph_snapshot": snapshot,
                "version_hash": version_hash,
            }
        )
        try:
            db.session.commit()
        except Exception:
            db.session.rollback()
            raise
        return mat

    def query_graph(
        self,
        workspace_id: str,
        relation_types: Optional[list[str]] = None,
        entity_type_ids: Optional[list[str]] = None,
        limit: int = 200,
    ) -> dict[str, Any]:
        """Query filtered nodes and edges from a workspace.

        Optionally filter by relation_types and entity_type_ids.
        """
        entity_q = EntityRepository().query().filter_by(workspace_id=workspace_id)
        if entity_type_ids:
            entity_q = entity_q.filter(Entity.entity_type_id.in_(entity_type_ids))
        entities = entity_q.limit(limit).all()
        entity_ids = {str(e.id) for e in entities}

        relation_q = RelationRepository().query().filter_by(workspace_id=workspace_id)
        if relation_types:
            relation_q = relation_q.filter(Relation.type.in_(relation_types))
        relations = relation_q.limit(limit * 10).all()
        # Only keep edges where both endpoints are in the node set
        edges = [
            {
                "id": str(r.id),
                "source": str(r.source_id),
                "target": str(r.target_id),
                "type": r.type,
                "metadata": r.properties or {},
            }
            for r in relations
            if str(r.source_id) in entity_ids and str(r.target_id) in entity_ids
        ]

        nodes = [
            {
                "id": str(e.id),
                "name": e.name,
                "type": str(e.entity_type_id),
                "icon": e.icon,
                "is_archived": e.is_archived,
            }
            for e in entities
        ]

        return {
            "workspace_id": workspace_id,
            "nodes": nodes,
            "edges": edges,
            "node_count": len(nodes),
            "edge_count": len(edges),
        }

    def traverse_graph(
        self,
        workspace_id: str,
        center_node_id: str,
        depth: int = 2,
        relation_types: Optional[list[str]] = None,
    ) -> Optional[dict[str, Any]]:
        """BFS traversal from a center node up to a given depth.

        Returns all reachable nodes and edges within the depth limit.
        Returns None if center_node_id is not found.
        """
        all_relations = RelationRepository().query().filter_by(workspace_id=workspace_id).all()

        if relation_types:
            all_relations = [r for r in all_relations if r.type in relation_types]

        # Build adjacency map: node_id -> list of (neighbor_id, relation)
        adjacency: dict[str, list] = {}
        for r in all_relations:
            src = str(r.source_id)
            tgt = str(r.target_id)
            adjacency.setdefault(src, []).append((tgt, r))
            adjacency.setdefault(tgt, []).append((src, r))

        # BFS
        visited_nodes: set[str] = {center_node_id}
        visited_edges: set[str] = set()
        queue = deque([(center_node_id, 0)])
        result_edges = []

        while queue:
            node_id, current_depth = queue.popleft()
            if current_depth >= depth:
                continue
            for neighbor_id, relation in adjacency.get(node_id, []):
                edge_id = str(relation.id)
                if edge_id not in visited_edges:
                    visited_edges.add(edge_id)
                    result_edges.append({
                        "id": edge_id,
                        "source": str(relation.source_id),
                        "target": str(relation.target_id),
                        "type": relation.type,
                        "metadata": relation.properties or {},
                    })
                if neighbor_id not in visited_nodes:
                    visited_nodes.add(neighbor_id)
                    queue.append((neighbor_id, current_depth + 1))

        # Fetch entity details for all visited nodes
        entity_ids = list(visited_nodes)
        entities = EntityRepository().query().filter(Entity.id.in_(entity_ids)).all()
        entity_map = {str(e.id): e for e in entities}

        if center_node_id not in entity_map:
            return None  # center node not found

        nodes = [
            {
                "id": str(e.id),
                "name": e.name,
                "type": str(e.entity_type_id),
                "icon": e.icon,
                "depth": 0 if str(e.id) == center_node_id else None,
            }
            for e in entity_map.values()
        ]

        return {
            "center_node": center_node_id,
            "depth": depth,
            "nodes": nodes,
            "edges": result_edges,
            "node_count": len(nodes),
            "edge_count": len(result_edges),
        }

    def get_related_entities(self, entity_id: str, relation_type: str = None,
                             direction: str = "outgoing", page: int = 1,
                             per_page: int = 50) -> dict:
        entity = EntityRepository().get(entity_id)
        if not entity:
            raise NotFoundError("Entity not found")
        query = RelationRepository().query().filter(Relation.is_deleted.is_(False))
        if direction == "outgoing":
            query = query.filter(Relation.source_id == entity_id)
            target_col = Relation.target_id
        else:
            query = query.filter(Relation.target_id == entity_id)
            target_col = Relation.source_id
        if relation_type:
            query = query.filter(Relation.type == relation_type)
        relations_page = query.order_by(Relation.created_at.desc()).paginate(
            page=page, per_page=per_page, error_out=False
        )
        related_ids = [getattr(r, target_col.key) for r in relations_page.items]
        related_entities = Entity.query.filter(Entity.id.in_(related_ids)).all() if related_ids else []
        entity_map = {str(e.id): e for e in related_entities}
        items = []
        for r in relations_page.items:
            related_id = str(r.target_id if direction == "outgoing" else r.source_id)
            related = entity_map.get(related_id)
            items.append({
                "relation_id": str(r.id),
                "type": r.type,
                "entity": {
                    "id": str(related.id) if related else None,
                    "name": related.name if related else None,
                    "entity_type_id": str(related.entity_type_id) if related and related.entity_type_id else None,
                } if related else None,
            })
        return {
            "items": items,
            "total": relations_page.total,
            "page": page,
            "per_page": per_page,
        }

    def refresh(self, workspace_id: str) -> dict:
        mat = self.materialize(workspace_id, force=True)
        return {
            "id": str(mat.id),
            "workspace_id": str(mat.workspace_id),
            "version_hash": mat.version_hash,
            "generated_at": mat.generated_at.isoformat() if hasattr(mat, 'generated_at') and mat.generated_at else None,
            "created_at": mat.created_at.isoformat() if mat.created_at else None,
        }

    def cleanup_old_materializations(self, workspace_id, keep=10):
        from app.models import GraphMaterialization
        subq = db.session.query(GraphMaterialization.id).filter(
            GraphMaterialization.workspace_id == workspace_id
        ).order_by(GraphMaterialization.generated_at.desc()).offset(keep).subquery()
        count = GraphMaterialization.query.filter(GraphMaterialization.id.in_(db.session.query(subq.c.id))).delete(synchronize_session='fetch')
        try:
            db.session.commit()
        except Exception:
            db.session.rollback()
            raise
        return count

    def find_shortest_path(
        self,
        workspace_id: str,
        source_entity_id: str,
        target_entity_id: str,
        max_iterations: int = GRAPH_MAX_ITERATIONS,
    ) -> Optional[dict[str, Any]]:
        """BFS-based shortest path between two entities within a workspace.

        Returns the path as a list of entity IDs and the traversed edges.
        Returns None if no path exists.
        """
        if source_entity_id == target_entity_id:
            return {
                "source": source_entity_id,
                "target": target_entity_id,
                "path": [source_entity_id],
                "edges": [],
                "distance": 0,
            }

        all_relations = RelationRepository().query().filter_by(workspace_id=workspace_id).all()

        adjacency: dict[str, list] = {}
        for r in all_relations:
            src = str(r.source_id)
            tgt = str(r.target_id)
            adjacency.setdefault(src, []).append((tgt, r))
            adjacency.setdefault(tgt, []).append((src, r))

        visited: set[str] = {source_entity_id}
        parent: dict[str, tuple | None] = {source_entity_id: None}
        queue = deque([source_entity_id])
        iterations = 0

        while queue and iterations < max_iterations:
            iterations += 1
            current = queue.popleft()
            if current == target_entity_id:
                break
            for neighbor, relation in adjacency.get(current, []):
                if neighbor not in visited:
                    visited.add(neighbor)
                    parent[neighbor] = (current, relation)
                    queue.append(neighbor)

        if target_entity_id not in parent:
            return None

        path_nodes = []
        path_edges = []
        current = target_entity_id
        while current is not None:
            path_nodes.append(current)
            if parent[current] is not None:
                prev_node, relation = parent[current]
                path_edges.append({
                    "id": str(relation.id),
                    "source": str(relation.source_id),
                    "target": str(relation.target_id),
                    "type": relation.type,
                })
                current = prev_node
            else:
                current = None

        path_nodes.reverse()
        path_edges.reverse()

        return {
            "source": source_entity_id,
            "target": target_entity_id,
            "path": path_nodes,
            "edges": path_edges,
            "distance": len(path_nodes) - 1,
        }

    def search(self, workspace_id: str, query: str, relation_type: str | None = None) -> dict:
        from app.services.search_service import SearchService
        return SearchService().search(workspace_id, query, entity_type_id=relation_type)
