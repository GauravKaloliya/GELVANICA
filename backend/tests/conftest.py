import pytest
from flask import current_app
from flask_jwt_extended import create_access_token

from app import create_app
from app.core.config import TestingConfig


@pytest.fixture
def app():
    application = create_app(TestingConfig)
    yield application


@pytest.fixture
def client(app):
    with app.test_client() as c:
        yield c


@pytest.fixture
def db(app):
    with app.app_context():
        from app.extensions import db
        yield db
        db.session.remove()


@pytest.fixture
def runner(app):
    return app.test_cli_runner()


@pytest.fixture
def api(client):
    class ApiClient:
        def __init__(self, client, base="/api/v1"):
            self.client = client
            self.base = base
            self.token = None

        def _headers(self, extra=None):
            h = {"Content-Type": "application/json"}
            if self.token:
                h["Authorization"] = f"Bearer {self.token}"
            if extra:
                h.update(extra)
            return h

        def get(self, path, **kw):
            return self.client.get(f"{self.base}{path}", headers=self._headers(kw.pop("headers", None)), **kw)

        def post(self, path, data=None, **kw):
            return self.client.post(f"{self.base}{path}", json=data, headers=self._headers(kw.pop("headers", None)), **kw)

        def patch(self, path, data=None, **kw):
            return self.client.patch(f"{self.base}{path}", json=data, headers=self._headers(kw.pop("headers", None)), **kw)

        def delete(self, path, **kw):
            return self.client.delete(f"{self.base}{path}", headers=self._headers(kw.pop("headers", None)), **kw)

    return ApiClient(client)


@pytest.fixture
def auth_headers(api, app):
    mode = current_app.config.get("GNOVIUM_MODE", "local")
    if mode != "cloud":
        with app.app_context():
            from app.models.local import User
            from app.extensions import db
            user = User.query.filter_by(email="test@example.com").first()
            if not user:
                user = User(email="test@example.com", name="Test User")
                db.session.add(user)
                db.session.commit()
            api.token = create_access_token(identity=str(user.id))
    else:
        rv = api.post("/auth/register", data={
            "email": "test@example.com", "password": "password123!", "name": "Test User"
        })
        data = rv.get_json()
        api.token = data["data"]["access_token"]
    return {"Authorization": f"Bearer {api.token}"}


@pytest.fixture
def seeded(app, api, auth_headers):
    with app.app_context():
        rv = api.post("/workspaces/", data={"name": "Test Workspace"})
        ws = rv.get_json()["data"]
        ws_id = ws["id"]

        rv = api.post(f"/workspaces/{ws_id}/entities/types", data={"name": "Page"})
        etype = rv.get_json()["data"]
        etype_id = etype["id"]

        rv = api.post(f"/workspaces/{ws_id}/entities/", data={
            "entity_type_id": etype_id, "name": "Test Entity"
        })
        entity = rv.get_json()["data"]
        entity_id = entity["id"]

        return {
            "workspace_id": ws_id,
            "entity_type_id": etype_id,
            "entity_id": entity_id,
            "workspace": ws,
            "entity_type": etype,
            "entity": entity,
        }
