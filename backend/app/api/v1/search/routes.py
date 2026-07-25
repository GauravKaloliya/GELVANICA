from flask import Blueprint, Response, request

from app.api.v1.helpers import check_workspace_access, item_response, list_response, pagination_args, raw_response
from app.core.constants import RATE_LIMIT_STANDARD, RATE_LIMIT_STRICT
from app.core.response import error, ok_list
from app.core.validation import load_schema
from app.extensions import db, limiter
from app.schemas.domain import SearchQuerySchema
from app.services.search_service import SearchService
from app.services.security import secured

bp = Blueprint("search", __name__)


@bp.get("/<string:workspace_id>/search")
@limiter.limit(RATE_LIMIT_STANDARD)
@secured
def search(workspace_id: str) -> Response:
    data = dict(workspace_id=workspace_id, **request.args.to_dict())
    data = load_schema(SearchQuerySchema(), data)

    access_err = check_workspace_access(workspace_id)
    if access_err:
        return access_err

    args = pagination_args()
    page = args["page"]
    per_page = args["per_page"]

    svc = SearchService()
    results = svc.search(workspace_id, data["q"], data.get("entity_type_id"), page, per_page)
    items = results.get("results", [])
    total = results.get("total", len(items))
    pages = (total + per_page - 1) // per_page if per_page > 0 else 0
    return ok_list({"results": items}, meta={"total": total, "page": page, "per_page": per_page, "pages": pages})


@bp.post("/<string:workspace_id>/search/rebuild-index")
@limiter.limit(RATE_LIMIT_STRICT)
@secured
def rebuild_search_index(workspace_id: str) -> Response:
    access_err = check_workspace_access(workspace_id)
    if access_err:
        return access_err
    svc = SearchService()
    result = svc.rebuild_index(workspace_id)
    return item_response(result)


@bp.get("/<string:workspace_id>/search/history")
@limiter.limit(RATE_LIMIT_STANDARD)
@secured
def search_history(workspace_id: str) -> Response:
    access_err = check_workspace_access(workspace_id)
    if access_err:
        return access_err
    return list_response({"items": [], "total": 0, "page": 1, "per_page": 20})


@bp.get("/<string:workspace_id>/search/suggest")
@limiter.limit(RATE_LIMIT_STANDARD)
@secured
def search_suggest(workspace_id: str) -> Response:
    q = request.args.get("q", "")
    if not q:
        return error("bad_request", "q (query) is required", status=400)
    access_err = check_workspace_access(workspace_id)
    if access_err:
        return access_err
    rows = db.session.execute(
        db.text("SELECT id, name FROM entities WHERE workspace_id = :ws AND is_deleted = 0 AND name LIKE :q ORDER BY name LIMIT 10"),
        {"ws": workspace_id, "q": f"%{q}%"},
    ).fetchall()
    results = [{"text": r[1], "entity_id": r[0]} for r in rows if r[1]]
    return raw_response({
        "items": results,
        "total": len(results),
        "page": 1,
        "per_page": 10,
    })
