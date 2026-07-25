"""Tests for all admin routes: user management and system endpoints."""

import uuid


def _create_workspace(api):
    """Create a workspace with a unique name and return its ID."""
    name = f"Admin WS {uuid.uuid4().hex[:8]}"
    rv = api.post("/workspaces/", data={"name": name})
    assert rv.status_code == 201, f"create workspace failed: {rv.get_json()}"
    return rv.get_json()["data"]["id"]


def _target_user(api):
    """Register a unique target user (not the auth_headers user)."""
    email = f"admin-target-{uuid.uuid4().hex[:8]}@example.com"
    rv = api.post("/auth/register", data={
        "email": email, "password": "Password123!", "name": "Target User",
    })
    assert rv.status_code == 201
    data = rv.get_json()["data"]
    return data["user"]["id"], email


class TestListUsers:
    def test_list_users(self, api, auth_headers):
        _create_workspace(api)
        rv = api.get("/admin/users")
        assert rv.status_code == 200
        body = rv.get_json()
        assert "data" in body
        assert "meta" in body
        assert body["meta"]["total"] >= 1

    def test_list_users_search(self, api, auth_headers):
        _create_workspace(api)
        rv = api.get("/admin/users?search=Cloud")
        assert rv.status_code == 200
        body = rv.get_json()
        assert "data" in body
        assert "meta" in body

    def test_list_users_search_no_match(self, api, auth_headers):
        _create_workspace(api)
        rv = api.get("/admin/users?search=NonExistentXYZ")
        assert rv.status_code == 200
        body = rv.get_json()
        assert "data" in body
        assert "meta" in body

    def test_list_users_pagination(self, api, auth_headers):
        _create_workspace(api)
        rv = api.get("/admin/users?page=1&per_page=1")
        assert rv.status_code == 200
        body = rv.get_json()
        assert body["meta"]["page"] == 1
        assert body["meta"]["per_page"] == 1

    def test_unauthenticated(self, client):
        rv = client.get("/api/v1/admin/users")
        assert rv.status_code == 401


class TestGetUser:
    def test_get_user(self, api, auth_headers):
        _create_workspace(api)
        target_id, _ = _target_user(api)
        rv = api.get(f"/admin/users/{target_id}")
        assert rv.status_code == 200
        body = rv.get_json()
        assert body["data"]["id"] == target_id
        assert body["data"]["email"] is not None

    def test_get_user_not_found(self, api, auth_headers):
        _create_workspace(api)
        rv = api.get("/admin/users/00000000-0000-0000-0000-000000000000")
        assert rv.status_code == 404
        body = rv.get_json()
        assert "error" in body

    def test_unauthenticated(self, client):
        rv = client.get("/api/v1/admin/users/00000000-0000-0000-0000-000000000000")
        assert rv.status_code == 401


class TestUpdateUser:
    def test_update_user(self, api, auth_headers):
        _create_workspace(api)
        target_id, _ = _target_user(api)
        rv = api.patch(f"/admin/users/{target_id}", data={"name": "Updated Name"})
        assert rv.status_code == 200
        body = rv.get_json()
        assert body["data"]["name"] == "Updated Name"
        assert "password_hash" not in body["data"]

    def test_update_user_not_found(self, api, auth_headers):
        _create_workspace(api)
        rv = api.patch(
            "/admin/users/00000000-0000-0000-0000-000000000000",
            data={"name": "Nope"},
        )
        assert rv.status_code == 404
        body = rv.get_json()
        assert "error" in body

    def test_unauthenticated(self, client):
        rv = client.patch(
            "/api/v1/admin/users/00000000-0000-0000-0000-000000000000",
            json={"name": "Hacker"},
        )
        assert rv.status_code == 401


class TestDeleteUser:
    def test_delete_user(self, api, auth_headers):
        _create_workspace(api)
        target_id, _ = _target_user(api)
        rv = api.delete(f"/admin/users/{target_id}")
        assert rv.status_code == 200
        body = rv.get_json()
        assert body["data"]["deleted"] is True

    def test_delete_user_twice(self, api, auth_headers):
        _create_workspace(api)
        target_id, _ = _target_user(api)
        api.delete(f"/admin/users/{target_id}")
        rv = api.delete(f"/admin/users/{target_id}")
        assert rv.status_code == 404
        body = rv.get_json()
        assert "error" in body

    def test_delete_user_not_found(self, api, auth_headers):
        _create_workspace(api)
        rv = api.delete("/admin/users/00000000-0000-0000-0000-000000000000")
        assert rv.status_code == 404
        body = rv.get_json()
        assert "error" in body

    def test_unauthenticated(self, client):
        rv = client.delete("/api/v1/admin/users/00000000-0000-0000-0000-000000000000")
        assert rv.status_code == 401


class TestSystemStatus:
    def test_system_status(self, api, auth_headers):
        _create_workspace(api)
        rv = api.get("/admin/system/status")
        assert rv.status_code == 501
        body = rv.get_json()
        assert "data" in body
        assert "message" in body["data"]

    def test_unauthenticated(self, client):
        rv = client.get("/api/v1/admin/system/status")
        assert rv.status_code == 401


class TestSystemLogs:
    def test_system_logs(self, api, auth_headers):
        _create_workspace(api)
        rv = api.get("/admin/system/logs")
        assert rv.status_code == 501
        body = rv.get_json()
        assert "data" in body
        assert "message" in body["data"]

    def test_unauthenticated(self, client):
        rv = client.get("/api/v1/admin/system/logs")
        assert rv.status_code == 401


class TestSystemCleanup:
    def test_system_cleanup(self, api, auth_headers):
        _create_workspace(api)
        rv = api.post("/admin/system/cleanup")
        assert rv.status_code == 501
        body = rv.get_json()
        assert "data" in body
        assert "message" in body["data"]

    def test_unauthenticated(self, client):
        rv = client.post("/api/v1/admin/system/cleanup")
        assert rv.status_code == 401
