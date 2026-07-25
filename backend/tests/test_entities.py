import uuid

import pytest
from flask_jwt_extended import create_access_token


def _name():
    return f"test-{uuid.uuid4().hex[:8]}"


@pytest.fixture
def auth_token(app, api):
    with app.app_context():
        from app.extensions import db
        from app.models import User

        uid = uuid.uuid4().hex
        email = f"{uid}@test.com"
        user = User(id=uid, email=email, name="Tester")
        db.session.add(user)
        db.session.commit()
        token = create_access_token(identity=str(user.id))
        api.token = token
        return token


@pytest.fixture
def seeded(app, api, auth_token):
    with app.app_context():
        rv = api.post("/workspaces/", data={"name": "Test Workspace"})
        ws = rv.get_json()["data"]
        ws_id = ws["id"]

        rv = api.post(f"/workspaces/{ws_id}/entities/types", data={"name": "Page"})
        etype = rv.get_json()["data"]
        etype_id = etype["id"]

        rv = api.post(f"/workspaces/{ws_id}/entities/", data={
            "entity_type_id": etype_id, "name": "Test Entity",
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


# ---------------------------------------------------------------------------
# Entity Types
# ---------------------------------------------------------------------------

class TestCreateEntityType:
    def test_success(self, seeded, api):
        ws_id = seeded["workspace_id"]
        name = _name()
        rv = api.post(f"/workspaces/{ws_id}/entities/types", data={"name": name})
        assert rv.status_code == 201
        data = rv.get_json()["data"]
        assert data["name"] == name
        assert data["workspace_id"] == ws_id

    def test_duplicate_name(self, seeded, api):
        ws_id = seeded["workspace_id"]
        name = _name()
        api.post(f"/workspaces/{ws_id}/entities/types", data={"name": name})
        rv = api.post(f"/workspaces/{ws_id}/entities/types", data={"name": name})
        assert rv.status_code == 409
        assert rv.get_json()["error"]["code"] == "conflict"


class TestListEntityTypes:
    def test_success(self, seeded, api):
        ws_id = seeded["workspace_id"]
        rv = api.get(f"/workspaces/{ws_id}/entities/types")
        assert rv.status_code == 200
        body = rv.get_json()
        assert "data" in body
        assert "meta" in body


class TestGetEntityType:
    def test_success(self, seeded, api):
        ws_id = seeded["workspace_id"]
        et_id = seeded["entity_type_id"]
        rv = api.get(f"/workspaces/{ws_id}/entities/types/{et_id}")
        assert rv.status_code == 200
        data = rv.get_json()["data"]
        assert data["id"] == et_id

    def test_not_found(self, seeded, api):
        ws_id = seeded["workspace_id"]
        rv = api.get(f"/workspaces/{ws_id}/entities/types/{uuid.uuid4().hex}")
        assert rv.status_code == 404
        assert rv.get_json()["error"]["code"] == "not_found"


class TestUpdateEntityType:
    def test_success(self, seeded, api):
        ws_id = seeded["workspace_id"]
        et_id = seeded["entity_type_id"]
        new_name = _name()
        rv = api.patch(f"/workspaces/{ws_id}/entities/types/{et_id}", data={"name": new_name})
        assert rv.status_code == 200
        assert rv.get_json()["data"]["name"] == new_name


class TestDeleteEntityType:
    def test_success(self, seeded, api):
        ws_id = seeded["workspace_id"]
        name = _name()
        rv = api.post(f"/workspaces/{ws_id}/entities/types", data={"name": name})
        et_id = rv.get_json()["data"]["id"]
        rv = api.delete(f"/workspaces/{ws_id}/entities/types/{et_id}")
        assert rv.status_code == 200


# ---------------------------------------------------------------------------
# Entities
# ---------------------------------------------------------------------------

class TestCreateEntity:
    def test_success(self, seeded, api):
        ws_id = seeded["workspace_id"]
        et_id = seeded["entity_type_id"]
        name = _name()
        rv = api.post(f"/workspaces/{ws_id}/entities/", data={
            "entity_type_id": et_id, "name": name,
        })
        assert rv.status_code == 201
        data = rv.get_json()["data"]
        assert data["name"] == name
        assert data["entity_type_id"] == et_id
        assert data["workspace_id"] == ws_id

    def test_empty_body(self, seeded, api):
        ws_id = seeded["workspace_id"]
        rv = api.post(f"/workspaces/{ws_id}/entities/", data={})
        assert rv.status_code == 422
        assert rv.get_json()["error"]["code"] == "validation_error"

    def test_duplicate_name(self, seeded, api):
        ws_id = seeded["workspace_id"]
        et_id = seeded["entity_type_id"]
        name = _name()
        api.post(f"/workspaces/{ws_id}/entities/", data={
            "entity_type_id": et_id, "name": name,
        })
        rv = api.post(f"/workspaces/{ws_id}/entities/", data={
            "entity_type_id": et_id, "name": name,
        })
        assert rv.status_code == 409
        assert rv.get_json()["error"]["code"] == "conflict"

    def test_with_properties(self, seeded, api):
        ws_id = seeded["workspace_id"]
        et_id = seeded["entity_type_id"]

        prop_name = _name()
        rv = api.post(f"/workspaces/{ws_id}/entities/properties", data={
            "name": prop_name, "type": "text",
        })
        assert rv.status_code == 201
        name = _name()
        rv = api.post(f"/workspaces/{ws_id}/entities/", data={
            "entity_type_id": et_id,
            "name": name,
            "properties": {prop_name: "hello"},
        })
        assert rv.status_code == 201


class TestListEntities:
    def test_success(self, seeded, api):
        ws_id = seeded["workspace_id"]
        rv = api.get(f"/workspaces/{ws_id}/entities/")
        assert rv.status_code == 200
        body = rv.get_json()
        assert "data" in body
        assert "meta" in body

    def test_pagination(self, seeded, api):
        ws_id = seeded["workspace_id"]
        rv = api.get(f"/workspaces/{ws_id}/entities/?page=1&per_page=5")
        assert rv.status_code == 200
        meta = rv.get_json()["meta"]
        assert meta["page"] == 1
        assert meta["per_page"] == 5

    def test_filter_by_entity_type_id(self, seeded, api):
        ws_id = seeded["workspace_id"]
        et_id = seeded["entity_type_id"]
        rv = api.get(f"/workspaces/{ws_id}/entities/?entity_type_id={et_id}")
        assert rv.status_code == 200
        for item in rv.get_json()["data"]:
            assert item["entity_type_id"] == et_id

    def test_search(self, seeded, api):
        ws_id = seeded["workspace_id"]
        rv = api.get(f"/workspaces/{ws_id}/entities/?search=Test")
        assert rv.status_code == 200


class TestGetEntity:
    def test_success(self, seeded, api):
        ws_id = seeded["workspace_id"]
        entity_id = seeded["entity_id"]
        rv = api.get(f"/workspaces/{ws_id}/entities/{entity_id}")
        assert rv.status_code == 200
        body = rv.get_json()
        assert "data" in body
        assert body["data"]["entity"]["id"] == entity_id
        assert "blocks" in body["data"]

    def test_not_found(self, seeded, api):
        ws_id = seeded["workspace_id"]
        rv = api.get(f"/workspaces/{ws_id}/entities/{uuid.uuid4().hex}")
        assert rv.status_code == 404
        assert rv.get_json()["error"]["code"] == "not_found"


class TestUpdateEntity:
    def test_success(self, seeded, api):
        ws_id = seeded["workspace_id"]
        entity_id = seeded["entity_id"]
        new_name = _name()
        rv = api.patch(f"/workspaces/{ws_id}/entities/{entity_id}", data={"name": new_name})
        assert rv.status_code == 200
        assert rv.get_json()["data"]["name"] == new_name

    def test_empty_body(self, seeded, api):
        ws_id = seeded["workspace_id"]
        entity_id = seeded["entity_id"]
        rv = api.patch(f"/workspaces/{ws_id}/entities/{entity_id}", data={})
        assert rv.status_code == 200

    def test_not_found(self, seeded, api):
        ws_id = seeded["workspace_id"]
        rv = api.patch(f"/workspaces/{ws_id}/entities/{uuid.uuid4().hex}", data={"name": "nope"})
        assert rv.status_code == 404
        assert rv.get_json()["error"]["code"] == "not_found"


class TestDeleteEntity:
    def test_soft_delete(self, seeded, api):
        ws_id = seeded["workspace_id"]
        et_id = seeded["entity_type_id"]
        name = _name()
        rv = api.post(f"/workspaces/{ws_id}/entities/", data={
            "entity_type_id": et_id, "name": name,
        })
        entity_id = rv.get_json()["data"]["id"]
        rv = api.delete(f"/workspaces/{ws_id}/entities/{entity_id}")
        assert rv.status_code == 200
        assert rv.get_json()["data"]["is_deleted"] is True

    def test_not_found(self, seeded, api):
        ws_id = seeded["workspace_id"]
        rv = api.delete(f"/workspaces/{ws_id}/entities/{uuid.uuid4().hex}")
        assert rv.status_code == 404
        assert rv.get_json()["error"]["code"] == "not_found"


class TestPermanentDeleteEntity:
    def test_success(self, seeded, api):
        ws_id = seeded["workspace_id"]
        et_id = seeded["entity_type_id"]
        name = f"perm-{uuid.uuid4().hex[:8]}"
        rv = api.post(f"/workspaces/{ws_id}/entities/", data={
            "entity_type_id": et_id, "name": name,
        })
        entity_id = rv.get_json()["data"]["id"]
        api.delete(f"/workspaces/{ws_id}/entities/{entity_id}")
        rv = api.delete(f"/workspaces/{ws_id}/entities/{entity_id}/permanent")
        assert rv.status_code == 200

    def test_must_be_soft_deleted_first(self, seeded, api):
        ws_id = seeded["workspace_id"]
        et_id = seeded["entity_type_id"]
        name = f"fail-{uuid.uuid4().hex[:8]}"
        rv = api.post(f"/workspaces/{ws_id}/entities/", data={
            "entity_type_id": et_id, "name": name,
        })
        entity_id = rv.get_json()["data"]["id"]
        rv = api.delete(f"/workspaces/{ws_id}/entities/{entity_id}/permanent")
        assert rv.status_code == 400


class TestRestoreEntity:
    def test_success(self, seeded, api):
        ws_id = seeded["workspace_id"]
        et_id = seeded["entity_type_id"]
        name = _name()
        rv = api.post(f"/workspaces/{ws_id}/entities/", data={
            "entity_type_id": et_id, "name": name,
        })
        entity_id = rv.get_json()["data"]["id"]
        api.delete(f"/workspaces/{ws_id}/entities/{entity_id}")
        rv = api.post(f"/workspaces/{ws_id}/entities/{entity_id}/restore")
        assert rv.status_code == 200
        assert rv.get_json()["data"]["is_deleted"] is False

    def test_not_found(self, seeded, api):
        ws_id = seeded["workspace_id"]
        rv = api.post(f"/workspaces/{ws_id}/entities/{uuid.uuid4().hex}/restore")
        assert rv.status_code == 404


class TestArchiveEntity:
    def test_success(self, seeded, api):
        ws_id = seeded["workspace_id"]
        entity_id = seeded["entity_id"]
        rv = api.post(f"/workspaces/{ws_id}/entities/{entity_id}/archive")
        assert rv.status_code == 200
        assert rv.get_json()["data"]["is_archived"] is True

    def test_not_found(self, seeded, api):
        ws_id = seeded["workspace_id"]
        rv = api.post(f"/workspaces/{ws_id}/entities/{uuid.uuid4().hex}/archive")
        assert rv.status_code == 404


class TestDuplicateEntity:
    def test_success(self, seeded, api):
        ws_id = seeded["workspace_id"]
        entity_id = seeded["entity_id"]
        rv = api.post(f"/workspaces/{ws_id}/entities/{entity_id}/duplicate")
        assert rv.status_code == 201
        data = rv.get_json()["data"]
        assert data["name"] == f"{seeded['entity']['name']} Copy"

    def test_not_found(self, seeded, api):
        ws_id = seeded["workspace_id"]
        rv = api.post(f"/workspaces/{ws_id}/entities/{uuid.uuid4().hex}/duplicate")
        assert rv.status_code == 404


class TestListChildren:
    def test_success(self, seeded, api):
        ws_id = seeded["workspace_id"]
        entity_id = seeded["entity_id"]
        rv = api.get(f"/workspaces/{ws_id}/entities/{entity_id}/children")
        assert rv.status_code == 200
        assert "data" in rv.get_json()
        assert "meta" in rv.get_json()

    def test_not_found(self, seeded, api):
        ws_id = seeded["workspace_id"]
        rv = api.get(f"/workspaces/{ws_id}/entities/{uuid.uuid4().hex}/children")
        assert rv.status_code == 404


class TestCreateChild:
    def test_success(self, seeded, api):
        ws_id = seeded["workspace_id"]
        et_id = seeded["entity_type_id"]
        entity_id = seeded["entity_id"]
        name = _name()
        rv = api.post(f"/workspaces/{ws_id}/entities/{entity_id}/children", data={
            "entity_type_id": et_id, "name": name,
        })
        assert rv.status_code == 201
        data = rv.get_json()["data"]
        assert data["name"] == name

    def test_not_found(self, seeded, api):
        ws_id = seeded["workspace_id"]
        et_id = seeded["entity_type_id"]
        rv = api.post(f"/workspaces/{ws_id}/entities/{uuid.uuid4().hex}/children", data={
            "entity_type_id": et_id, "name": _name(),
        })
        assert rv.status_code == 404


# ---------------------------------------------------------------------------
# Entity Versions List
# ---------------------------------------------------------------------------

class TestEntityVersions:
    def test_list_versions(self, seeded, api):
        ws_id = seeded["workspace_id"]
        entity_id = seeded["entity_id"]
        rv = api.get(f"/workspaces/{ws_id}/entities/{entity_id}/versions")
        assert rv.status_code == 200
        body = rv.get_json()
        assert "data" in body
        assert "meta" in body

    def test_not_found(self, seeded, api):
        ws_id = seeded["workspace_id"]
        rv = api.get(f"/workspaces/{ws_id}/entities/{uuid.uuid4().hex}/versions")
        assert rv.status_code == 404
        assert rv.get_json()["error"]["code"] == "not_found"


# ---------------------------------------------------------------------------
# Entity Properties (property definitions)
# ---------------------------------------------------------------------------

class TestCreatePropertyDefinition:
    def test_success(self, seeded, api):
        ws_id = seeded["workspace_id"]
        name = _name()
        rv = api.post(f"/workspaces/{ws_id}/entities/properties", data={
            "name": name, "type": "text",
        })
        assert rv.status_code == 201
        data = rv.get_json()["data"]
        assert data["name"] == name
        assert data["type"] == "text"
        assert data["workspace_id"] == ws_id


class TestListPropertyDefinitions:
    def test_success(self, seeded, api):
        ws_id = seeded["workspace_id"]
        rv = api.get(f"/workspaces/{ws_id}/entities/properties")
        assert rv.status_code == 200
        body = rv.get_json()
        assert "data" in body
        assert "meta" in body