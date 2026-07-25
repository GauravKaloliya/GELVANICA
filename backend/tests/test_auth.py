import uuid

from sqlalchemy import Column, Text, inspect, text


# ─── helpers ────────────────────────────────────────────────────────────────


def _set_cloud(app):
    app.config["GNOVIUM_MODE"] = "cloud"


def _set_local(app):
    app.config["GNOVIUM_MODE"] = "local"


def _patch_password_hash(app):
    """Add password_hash to the local User model + users table so auth works."""
    with app.app_context():
        from app.extensions import db
        from app.models import User

        # Add column to the SQLite table if missing
        inspector = inspect(db.engine)
        existing = {c["name"] for c in inspector.get_columns("users")}
        if "password_hash" not in existing:
            db.session.execute(text("ALTER TABLE users ADD COLUMN password_hash TEXT"))
            db.session.commit()

        # Add mapped Column to the ORM class if missing
        if not hasattr(User, "password_hash") or "password_hash" not in User.__table__.c:
            col = Column("password_hash", Text)
            User.__table__.append_column(col)
            User.password_hash = col


def _register_user(api, app, email=None, name="Test User"):
    """Register a user in cloud mode and return (data_dict, email)."""
    _set_cloud(app)
    _patch_password_hash(app)
    if email is None:
        email = f"test-{uuid.uuid4()}@example.com"
    rv = api.post("/auth/register", data={
        "email": email, "password": "password123!", "name": name,
    })
    assert rv.status_code == 201, f"register failed: {rv.get_json()}"
    return rv.get_json()["data"], email


# ─── POST /auth/register ─────────────────────────────────────────────────


def test_register_success(api, app):
    _set_cloud(app)
    email = f"reg-ok-{uuid.uuid4()}@example.com"
    rv = api.post("/auth/register", data={
        "email": email, "password": "password123!", "name": "Test User",
    })
    assert rv.status_code == 201
    body = rv.get_json()
    assert "data" in body
    assert "access_token" in body["data"]
    assert "refresh_token" in body["data"]
    assert "user" in body["data"]
    assert body["data"]["user"]["email"] == email


def test_register_duplicate(api, app):
    _set_cloud(app)
    email = f"reg-dup-{uuid.uuid4()}@example.com"
    rv = api.post("/auth/register", data={
        "email": email, "password": "password123!", "name": "First",
    })
    assert rv.status_code == 201
    rv = api.post("/auth/register", data={
        "email": email, "password": "password123!", "name": "Duplicate",
    })
    assert rv.status_code == 409
    body = rv.get_json()
    assert "error" in body


def test_register_validation_missing_email(api, app):
    _set_cloud(app)
    rv = api.post("/auth/register", data={"password": "password123!"})
    assert rv.status_code == 422
    body = rv.get_json()
    assert "error" in body


def test_register_validation_missing_password(api, app):
    _set_cloud(app)
    email = f"reg-nopw-{uuid.uuid4()}@example.com"
    rv = api.post("/auth/register", data={"email": email})
    assert rv.status_code == 422


def test_register_validation_short_password(api, app):
    _set_cloud(app)
    email = f"reg-short-{uuid.uuid4()}@example.com"
    rv = api.post("/auth/register", data={"email": email, "password": "short"})
    assert rv.status_code == 422


def test_register_validation_invalid_email(api, app):
    _set_cloud(app)
    rv = api.post("/auth/register", data={
        "email": "not-an-email", "password": "password123!",
    })
    assert rv.status_code == 422


def test_register_empty_body(api, app):
    _set_cloud(app)
    rv = api.post("/auth/register", data={})
    assert rv.status_code == 422


# ─── POST /auth/login ─────────────────────────────────────────────────────


def test_login_success(api, app):
    data, email = _register_user(api, app)
    rv = api.post("/auth/login", data={"email": email, "password": "password123!"})
    assert rv.status_code == 200
    body = rv.get_json()
    assert "data" in body
    assert "access_token" in body["data"]
    assert "refresh_token" in body["data"]
    assert "user" in body["data"]
    assert body["data"]["user"]["email"] == email


def test_login_wrong_password(api, app):
    data, email = _register_user(api, app)
    rv = api.post("/auth/login", data={
        "email": email, "password": "wrongpassword456!",
    })
    assert rv.status_code == 403
    body = rv.get_json()
    assert "error" in body


def test_login_wrong_email(api, app):
    _set_cloud(app)
    rv = api.post("/auth/login", data={
        "email": "nonexistent@example.com", "password": "password123!",
    })
    assert rv.status_code == 403


def test_login_missing_fields(api, app):
    _set_cloud(app)
    rv = api.post("/auth/login", data={})
    assert rv.status_code == 422


def test_login_empty_body(api, app):
    _set_cloud(app)
    rv = api.post("/auth/login", data={})
    assert rv.status_code == 422


def test_login_not_json(api, app):
    _set_cloud(app)
    rv = api.client.post(
        "/api/v1/auth/login",
        data="not-json",
        headers={"Content-Type": "application/json"},
    )
    assert rv.status_code == 422


# ─── GET /auth/check-email ────────────────────────────────────────────────


def test_check_email_available(api, app):
    _set_cloud(app)
    email = f"check-avail-{uuid.uuid4()}@example.com"
    rv = api.get(f"/auth/check-email?email={email}")
    assert rv.status_code == 200
    body = rv.get_json()
    assert body["data"]["available"] is True


def test_check_email_taken(api, app):
    _set_cloud(app)
    email = f"check-taken-{uuid.uuid4()}@example.com"
    api.post("/auth/register", data={
        "email": email, "password": "password123!",
    })
    rv = api.get(f"/auth/check-email?email={email}")
    assert rv.status_code == 200
    body = rv.get_json()
    assert body["data"]["available"] is False


def test_check_email_missing_param(api, app):
    rv = api.get("/auth/check-email")
    assert rv.status_code == 400
    body = rv.get_json()
    assert "error" in body


def test_check_email_invalid_format(api, app):
    rv = api.get("/auth/check-email?email=not-an-email")
    assert rv.status_code == 400
    body = rv.get_json()
    assert "error" in body


def test_check_email_empty_string(api, app):
    rv = api.get("/auth/check-email?email=")
    assert rv.status_code == 400
    body = rv.get_json()
    assert "error" in body


# ─── POST /auth/google (cloud_only) ──────────────────────────────────────


def test_google_cloud_only_local(api, app):
    _set_local(app)
    rv = api.post("/auth/google", data={"credential": "dummy"})
    assert rv.status_code == 400
    body = rv.get_json()
    assert body["error"]["code"] == "cloud_only"


def test_google_missing_credential(api, app):
    _set_local(app)
    rv = api.post("/auth/google", data={})
    assert rv.status_code == 400


# ─── POST /auth/refresh ───────────────────────────────────────────────────


def test_refresh_success(api, app):
    data, _ = _register_user(api, app)
    api.token = data["refresh_token"]
    rv = api.post("/auth/refresh")
    assert rv.status_code == 200
    body = rv.get_json()
    assert "data" in body
    assert "access_token" in body["data"]


def test_refresh_invalid_token(api, app):
    _set_cloud(app)
    api.token = "invalid-jwt-token"
    rv = api.post("/auth/refresh")
    assert rv.status_code == 401


def test_refresh_no_token(api, app):
    _set_cloud(app)
    api.token = None
    rv = api.post("/auth/refresh")
    assert rv.status_code == 401


# ─── POST /auth/logout ────────────────────────────────────────────────────


def test_logout_success(api, app):
    data, _ = _register_user(api, app)
    api.token = data["access_token"]
    rv = api.post("/auth/logout")
    assert rv.status_code == 200
    body = rv.get_json()
    assert "data" in body


def test_logout_no_token(api, app):
    _set_cloud(app)
    api.token = None
    rv = api.post("/auth/logout")
    assert rv.status_code == 401


# ─── GET /auth/me ─────────────────────────────────────────────────────────


def test_get_me_success(api, app):
    data, email = _register_user(api, app, name="Get Me")
    api.token = data["access_token"]
    rv = api.get("/auth/me")
    assert rv.status_code == 200
    body = rv.get_json()
    assert "data" in body
    assert body["data"]["email"] == email
    assert body["data"]["name"] == "Get Me"


def test_get_me_unauthorized(api, app):
    _set_cloud(app)
    api.token = None
    rv = api.get("/auth/me")
    assert rv.status_code == 401


def test_get_me_invalid_token(api, app):
    _set_cloud(app)
    api.token = "totally-invalid"
    rv = api.get("/auth/me")
    assert rv.status_code == 401


# ─── PATCH /auth/me ───────────────────────────────────────────────────────


def test_update_me_success(api, app):
    data, email = _register_user(api, app, name="Original")
    api.token = data["access_token"]
    rv = api.patch("/auth/me", data={"name": "Updated Name"})
    assert rv.status_code == 200
    body = rv.get_json()
    assert body["data"]["name"] == "Updated Name"


def test_update_me_empty_body(api, app):
    data, _ = _register_user(api, app, name="Empty Body")
    api.token = data["access_token"]
    rv = api.patch("/auth/me", data={})
    assert rv.status_code == 200
    body = rv.get_json()
    assert "data" in body


def test_update_me_unauthorized(api, app):
    _set_cloud(app)
    api.token = None
    rv = api.patch("/auth/me", data={"name": "Nope"})
    assert rv.status_code == 401


def test_update_me_invalid_token(api, app):
    _set_cloud(app)
    api.token = "bad-token"
    rv = api.patch("/auth/me", data={"name": "Nope"})
    assert rv.status_code == 401


# ─── POST /auth/change-password (cloud_only @secured) ────────────────────


def test_change_password_cloud_only_local(api, app):
    data, _ = _register_user(api, app)
    api.token = data["access_token"]
    _set_local(app)
    rv = api.post("/auth/change-password", data={
        "old_password": "old", "new_password": "newpassword123!",
    })
    assert rv.status_code == 400
    body = rv.get_json()
    assert body["error"]["code"] == "cloud_only"


# ─── POST /auth/forgot-password (cloud_only) ─────────────────────────────


def test_forgot_password_cloud_only_local(api, app):
    _set_local(app)
    rv = api.post("/auth/forgot-password", data={"email": "test@example.com"})
    assert rv.status_code == 400
    body = rv.get_json()
    assert body["error"]["code"] == "cloud_only"


# ─── POST /auth/reset-password (cloud_only) ──────────────────────────────


def test_reset_password_cloud_only_local(api, app):
    _set_local(app)
    rv = api.post("/auth/reset-password", data={
        "token": "sometoken", "new_password": "newpassword123!",
    })
    assert rv.status_code == 400
    body = rv.get_json()
    assert body["error"]["code"] == "cloud_only"


# ─── POST /auth/exchange-code (cloud_only @secured) ─────────────────────


def test_exchange_code_cloud_only_local(api, app):
    data, _ = _register_user(api, app)
    api.token = data["access_token"]
    _set_local(app)
    rv = api.post("/auth/exchange-code", data={})
    assert rv.status_code == 400
    body = rv.get_json()
    assert body["error"]["code"] == "cloud_only"


# ─── POST /auth/authorize (cloud_only @secured) ─────────────────────────


def test_authorize_post_cloud_only_local(api, app):
    data, _ = _register_user(api, app)
    api.token = data["access_token"]
    _set_local(app)
    rv = api.post("/auth/authorize", data={"redirect_uri": "gnovium://auth"})
    assert rv.status_code == 400
    body = rv.get_json()
    assert body["error"]["code"] == "cloud_only"


# ─── GET /auth/authorize (webview redirect) ──────────────────────────────


def test_webview_authorize_success(api, app):
    rv = api.get("/auth/authorize?redirect_uri=gnovium://auth")
    assert rv.status_code == 302


def test_webview_authorize_missing_redirect_uri(api, app):
    rv = api.get("/auth/authorize")
    assert rv.status_code == 400
    body = rv.get_json()
    assert "error" in body


def test_webview_authorize_invalid_scheme(api, app):
    rv = api.get("/auth/authorize?redirect_uri=javascript:alert(1)")
    assert rv.status_code == 400
    body = rv.get_json()
    assert "error" in body


def test_webview_authorize_with_state(api, app):
    rv = api.get("/auth/authorize?redirect_uri=gnovium-dev://callback&state=abc123")
    assert rv.status_code == 302


def test_webview_authorize_with_workspace_id(api, app):
    rv = api.get(
        "/auth/authorize?redirect_uri=http://localhost:3000/callback&workspace_id="
        "550e8400-e29b-41d4-a716-446655440000"
    )
    assert rv.status_code == 302


# ─── POST /auth/profile-changed (cloud_only @secured) ───────────────────


def test_profile_changed_cloud_only_local(api, app):
    data, _ = _register_user(api, app)
    api.token = data["access_token"]
    _set_local(app)
    rv = api.post("/auth/profile-changed", data={"since": "2024-01-01T00:00:00Z"})
    assert rv.status_code == 400
    body = rv.get_json()
    assert body["error"]["code"] == "cloud_only"


# ─── POST /auth/exchange ─────────────────────────────────────────────────


def test_exchange_invalid_code(api, app):
    _set_cloud(app)
    rv = api.post("/auth/exchange", data={"code": "invalid-code"})
    assert rv.status_code == 400
    body = rv.get_json()
    assert "error" in body
