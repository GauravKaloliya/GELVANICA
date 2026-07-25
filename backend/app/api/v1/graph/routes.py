"""Knowledge graph traversal routes."""

from flask import Blueprint, Response, request

from app.api.v1.helpers import check_workspace_access, item_response, raw_response, request_json
from app.core.constants import RATE_LIMIT_STANDARD, RATE_LIMIT_STRICT
from app.core.response import error
from app.extensions import limiter
from app.repositories import GraphMaterializationRepository
from app.services.graph_service import GraphService
from app.services.security import secured

bp = Blueprint("graph", __name__)


@bp.get("/<string:workspace_id>/graph/")
@limiter.limit(RATE_LIMIT_STANDARD)
@secured
def get_graph(workspace_id: str) -> Response:
    """Return the graph for a workspace.

    When entity_id is provided, performs BFS traversal from that entity.
    Otherwise returns the latest materialized graph snapshot.
    Query params: entity_id, depth, filter_type, include_tags, page, per_page.
    """
    access_err = check_workspace_access(workspace_id)
    if access_err:
        return access_err

    entity_id = request.args.get("entity_id")
    if entity_id:
        depth = request.args.get("depth", default=2, type=int)
        filter_type = request.args.get("filter_type")
        include_tags = request.args.get("include_tags")
        if include_tags:
            include_tags = [t.strip() for t in include_tags.split(",") if t.strip()]
        result = GraphService().traverse_graph(
            workspace_id=workspace_id,
            center_node_id=entity_id,
            depth=depth,
            relation_types=[filter_type] if filter_type else None,
        )
        if result is None:
            return error("not_found", "entity_id not found in this workspace", status=404)
        return item_response(result)

    mat = GraphMaterializationRepository().latest(workspace_id)
    if mat is None:
        return error("not_found", "No graph materialization found. POST /graph/materialize first.", status=404)
    return item_response(mat)


@bp.post("/<string:workspace_id>/graph/materialize")
@limiter.limit(RATE_LIMIT_STRICT)
@secured
def materialize_graph(workspace_id: str) -> Response:
    """Generate a fresh graph snapshot and store it."""
    access_err = check_workspace_access(workspace_id)
    if access_err:
        return access_err
    return item_response(GraphService().materialize(workspace_id), 201)


@bp.post("/<string:workspace_id>/graph/query")
@limiter.limit(RATE_LIMIT_STRICT)
@secured
def query_graph(workspace_id: str) -> Response:
    """Query filtered nodes and edges from a workspace graph."""
    data = request_json()
    if not isinstance(data, dict):
        return error("bad_request", "Invalid request body", status=400)
    access_err = check_workspace_access(workspace_id)
    if access_err:
        return access_err
    try:
        limit = min(int(data.get("limit", 200)), 500)
    except (TypeError, ValueError):
        return error("bad_request", "limit must be an integer", status=400)
    result = GraphService().query_graph(
        workspace_id=workspace_id,
        relation_types=data.get("relation_types"),
        entity_type_ids=data.get("entity_type_ids"),
        limit=limit,
    )
    return item_response(result)


@bp.post("/<string:workspace_id>/graph/cleanup")
@limiter.limit(RATE_LIMIT_STRICT)
@secured
def cleanup_materializations(workspace_id: str) -> Response:
    """Remove old materializations, keeping only the most recent ones."""
    data = request_json()
    if not isinstance(data, dict):
        return error("bad_request", "Invalid request body", status=400)
    access_err = check_workspace_access(workspace_id)
    if access_err:
        return access_err
    try:
        keep = max(min(int(data.get("keep", 10)), 100), 1)
    except (TypeError, ValueError):
        return error("bad_request", "keep must be a positive integer", status=400)
    removed = GraphService().cleanup_old_materializations(workspace_id, keep=keep)
    return raw_response({"removed": removed, "keep": keep})


@bp.post("/<string:workspace_id>/graph/traverse")
@limiter.limit(RATE_LIMIT_STRICT)
@secured
def traverse_graph(workspace_id: str) -> Response:
    """BFS traversal from a center node up to a configurable depth."""
    data = request_json()
    if not isinstance(data, dict):
        return error("bad_request", "Invalid request body", status=400)
    center_node = data.get("center_node")
    if not center_node:
        return error("bad_request", "center_node is required", status=400)
    access_err = check_workspace_access(workspace_id)
    if access_err:
        return access_err
    try:
        depth = max(min(int(data.get("depth", 2)), 5), 1)
    except (TypeError, ValueError):
        return error("bad_request", "depth must be an integer", status=400)
    result = GraphService().traverse_graph(
        workspace_id=workspace_id,
        center_node_id=center_node,
        depth=depth,
        relation_types=data.get("relation_types"),
    )
    if result is None:
        return error("not_found", "center_node not found in this workspace", status=404)
    return item_response(result)


@bp.post("/<string:workspace_id>/graph/paths")
@limiter.limit(RATE_LIMIT_STRICT)
@secured
def find_path(workspace_id: str) -> Response:
    """Find the shortest path between two entities in the workspace graph."""
    data = request_json()
    if not isinstance(data, dict):
        return error("bad_request", "Invalid request body", status=400)
    source = data.get("source_id")
    target = data.get("target_id")
    if not source or not target:
        return error("bad_request", "source_id and target_id are required", status=400)
    access_err = check_workspace_access(workspace_id)
    if access_err:
        return access_err
    result = GraphService().find_shortest_path(
        workspace_id=workspace_id,
        source_entity_id=source,
        target_entity_id=target,
    )
    if result is None:
        return raw_response({"source": source, "target": target, "path": [], "edges": [], "distance": -1})
    return item_response(result)


@bp.get("/<string:workspace_id>/graph/search")
@limiter.limit(RATE_LIMIT_STANDARD)
@secured
def search_graph(workspace_id: str) -> Response:
    """Search within graph nodes and edges."""
    q = request.args.get("q")
    relation_type = request.args.get("type")
    if not q:
        return error("bad_request", "q query param is required", status=400)
    access_err = check_workspace_access(workspace_id)
    if access_err:
        return access_err
    from app.services.graph_service import GraphService
    result = GraphService().search(workspace_id, q, relation_type)
    return raw_response(result)
