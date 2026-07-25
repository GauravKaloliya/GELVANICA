"""Tests for notification routes."""


def _create_notification(api, ws_id, user_id=None):
    if user_id is None:
        user_id = api.get("/auth/me").get_json()["data"]["id"]
    rv = api.post(f"/workspaces/{ws_id}/notifications", data={
        "user_id": user_id, "type": "system", "title": "Test Notification",
    })
    return rv.get_json()["data"]


class TestListNotifications:
    def test_list(self, api, seeded):
        ws_id = seeded["workspace_id"]
        rv = api.get(f"/workspaces/{ws_id}/notifications")
        assert rv.status_code == 200
        assert "data" in rv.get_json()

    def test_list_unread_only(self, api, seeded):
        ws_id = seeded["workspace_id"]
        rv = api.get(f"/workspaces/{ws_id}/notifications?unread_only=true")
        assert rv.status_code == 200
        assert "data" in rv.get_json()

    def test_list_requires_auth(self, client):
        rv = client.get("/api/v1/workspaces/foo/notifications")
        assert rv.status_code in (401, 403)


class TestCreateNotification:
    def test_create(self, api, seeded):
        ws_id = seeded["workspace_id"]
        me = api.get("/auth/me").get_json()["data"]["id"]
        rv = api.post(f"/workspaces/{ws_id}/notifications", data={
            "user_id": me, "type": "system", "title": "Test",
        })
        assert rv.status_code == 201
        data = rv.get_json()["data"]
        assert data["title"] == "Test"
        assert data["type"] == "system"
        assert not data["is_read"]

    def test_create_missing_fields(self, api, seeded):
        ws_id = seeded["workspace_id"]
        rv = api.post(f"/workspaces/{ws_id}/notifications", data={})
        assert rv.status_code == 422


class TestMarkRead:
    def test_mark_read(self, api, seeded):
        ws_id = seeded["workspace_id"]
        nid = _create_notification(api, ws_id)["id"]
        rv = api.post(f"/workspaces/{ws_id}/notifications/{nid}/read")
        assert rv.status_code == 200
        assert rv.get_json()["data"]["is_read"] is True

    def test_mark_read_not_found(self, api, seeded):
        ws_id = seeded["workspace_id"]
        rv = api.post(f"/workspaces/{ws_id}/notifications/nonexistent/read")
        assert rv.status_code == 404


class TestMarkReadPatch:
    def test_mark_read_patch(self, api, seeded):
        ws_id = seeded["workspace_id"]
        nid = _create_notification(api, ws_id)["id"]
        rv = api.patch(f"/workspaces/{ws_id}/notifications/{nid}")
        assert rv.status_code == 200
        assert rv.get_json()["data"]["is_read"] is True


class TestDismiss:
    def test_dismiss(self, api, seeded):
        ws_id = seeded["workspace_id"]
        nid = _create_notification(api, ws_id)["id"]
        rv = api.post(f"/workspaces/{ws_id}/notifications/{nid}/dismiss")
        assert rv.status_code == 200

    def test_dismiss_not_found(self, api, seeded):
        ws_id = seeded["workspace_id"]
        rv = api.post(f"/workspaces/{ws_id}/notifications/nonexistent/dismiss")
        assert rv.status_code == 404


class TestGetNotification:
    def test_get(self, api, seeded):
        ws_id = seeded["workspace_id"]
        nid = _create_notification(api, ws_id)["id"]
        rv = api.get(f"/workspaces/{ws_id}/notifications/{nid}")
        assert rv.status_code == 200
        assert rv.get_json()["data"]["id"] == nid

    def test_get_not_found(self, api, seeded):
        ws_id = seeded["workspace_id"]
        rv = api.get(f"/workspaces/{ws_id}/notifications/nonexistent")
        assert rv.status_code == 404


class TestMarkAllRead:
    def test_mark_all_read(self, api, seeded):
        ws_id = seeded["workspace_id"]
        _create_notification(api, ws_id)
        _create_notification(api, ws_id)
        rv = api.post(f"/workspaces/{ws_id}/notifications/read-all")
        assert rv.status_code == 200
        assert rv.get_json()["data"]["success"] is True
        uc = api.get(f"/workspaces/{ws_id}/notifications/unread-count").get_json()["data"]
        assert uc["unread_count"] == 0


class TestUnreadCount:
    def test_unread_count(self, api, seeded):
        ws_id = seeded["workspace_id"]
        _create_notification(api, ws_id)
        rv = api.get(f"/workspaces/{ws_id}/notifications/unread-count")
        assert rv.status_code == 200
        assert rv.get_json()["data"]["unread_count"] >= 1

    def test_unread_count_zero(self, api, seeded):
        ws_id = seeded["workspace_id"]
        rv = api.get(f"/workspaces/{ws_id}/notifications/unread-count")
        assert rv.status_code == 200
        data = rv.get_json()["data"]
        assert "unread_count" in data
        assert data["unread_count"] == 0
