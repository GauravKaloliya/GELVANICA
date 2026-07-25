from flask import jsonify
from typing import Any, Optional


def ok(data: Any = None) -> tuple:
    return jsonify({"data": data}), 200


def ok_list(data: Optional[list] = None, meta: Optional[dict] = None) -> tuple:
    return jsonify({"data": data if data is not None else [], "meta": meta or {}}), 200


def error(
    code: str = "bad_request",
    message: str = "",
    details: Optional[dict] = None,
    status: int = 400,
    request_id: Optional[str] = None,
) -> tuple:
    payload = {"error": {"code": code, "message": message}}
    if details:
        payload["error"]["details"] = details
    if request_id:
        payload["error"]["request_id"] = request_id
    return jsonify(payload), status


def error_response(
    code: str = "bad_request",
    message: str = "",
    details: Optional[dict] = None,
    status: int = 400,
    request_id: Optional[str] = None,
) -> tuple:
    return error(code=code, message=message, details=details, status=status, request_id=request_id)
