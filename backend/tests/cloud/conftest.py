import os
os.environ["GNOVIUM_MODE"] = "cloud"

import pytest

from app import create_app
from app.core.config import CloudTestingConfig


@pytest.fixture
def app():
    application = create_app(CloudTestingConfig)
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
def auth_headers(api):
    import uuid
    email = f"cloud-test-{uuid.uuid4().hex[:8]}@example.com"
    rv = api.post("/auth/register", data={
        "email": email, "password": "Password123!", "name": "Cloud Test User",
    })
    assert rv.status_code == 201, f"Register failed: {rv.status_code} {rv.get_json()}"
    data = rv.get_json()
    api.token = data["data"]["access_token"]
    return {"Authorization": f"Bearer {api.token}"}


@pytest.fixture
def seeded(app, api, auth_headers):
    rv = api.post("/workspaces/", data={"name": "Cloud Test Workspace"})
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
