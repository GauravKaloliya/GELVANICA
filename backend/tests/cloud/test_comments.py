"""Tests for all comment routes: list, create, get, update, delete, restore."""



def _create_comment(api, ws_id, entity_id=None):
    data = {
        "content": "A test comment",
        "display_name": "Tester",
    }
    if entity_id:
        data["entity_id"] = entity_id
    rv = api.post(f"/workspaces/{ws_id}/comments/", data=data)
    assert rv.status_code == 201, f"create comment failed: {rv.get_json()}"
    return rv.get_json()["data"]["id"]


class TestListComments:
    def test_list_comments_by_entity(self, api, auth_headers, seeded):
        ws_id = seeded["workspace_id"]
        entity_id = seeded["entity_id"]
        _create_comment(api, ws_id, entity_id)
        rv = api.get(f"/workspaces/{ws_id}/comments/?entity_id={entity_id}")
        assert rv.status_code == 200
        body = rv.get_json()
        assert "data" in body
        assert "meta" in body
        assert body["meta"]["total"] >= 1

    def test_list_comments_empty(self, api, auth_headers, seeded):
        ws_id = seeded["workspace_id"]
        entity_id = seeded["entity_id"]
        rv = api.get(f"/workspaces/{ws_id}/comments/?entity_id={entity_id}")
        assert rv.status_code == 200
        body = rv.get_json()
        assert body["meta"]["total"] == 0
        assert body["data"] == []

    def test_list_comments_missing_params(self, api, auth_headers, seeded):
        ws_id = seeded["workspace_id"]
        rv = api.get(f"/workspaces/{ws_id}/comments/")
        assert rv.status_code == 400
        assert "error" in rv.get_json()

    def test_list_comments_entity_not_found(self, api, auth_headers, seeded):
        ws_id = seeded["workspace_id"]
        rv = api.get(
            f"/workspaces/{ws_id}/comments/?entity_id="
            "00000000-0000-0000-0000-000000000000"
        )
        assert rv.status_code == 404
        assert "error" in rv.get_json()

    def test_list_comments_pagination(self, api, auth_headers, seeded):
        ws_id = seeded["workspace_id"]
        entity_id = seeded["entity_id"]
        _create_comment(api, ws_id, entity_id)
        rv = api.get(f"/workspaces/{ws_id}/comments/?entity_id={entity_id}&page=1&per_page=5")
        assert rv.status_code == 200
        body = rv.get_json()
        assert body["meta"]["page"] == 1
        assert body["meta"]["per_page"] == 5

    def test_unauthenticated(self, client, seeded):
        ws_id = seeded["workspace_id"]
        entity_id = seeded["entity_id"]
        rv = client.get(f"/api/v1/workspaces/{ws_id}/comments/?entity_id={entity_id}")
        assert rv.status_code == 401


class TestCreateComment:
    def test_create_comment(self, api, auth_headers, seeded):
        ws_id = seeded["workspace_id"]
        entity_id = seeded["entity_id"]
        rv = api.post(f"/workspaces/{ws_id}/comments/", data={
            "content": "New comment on entity",
            "display_name": "Test User",
            "entity_id": entity_id,
        })
        assert rv.status_code == 201
        body = rv.get_json()
        assert body["data"]["content"] == "New comment on entity"
        assert body["data"]["entity_id"] == entity_id
        assert body["data"]["display_name"] == "Test User"
        assert "id" in body["data"]

    def test_create_comment_without_entity(self, api, auth_headers, seeded):
        ws_id = seeded["workspace_id"]
        rv = api.post(f"/workspaces/{ws_id}/comments/", data={
            "content": "Workspace-wide comment",
            "display_name": "Tester",
        })
        assert rv.status_code == 201
        body = rv.get_json()
        assert body["data"]["content"] == "Workspace-wide comment"
        assert body["data"]["entity_id"] is None

    def test_create_comment_with_avatar(self, api, auth_headers, seeded):
        ws_id = seeded["workspace_id"]
        entity_id = seeded["entity_id"]
        rv = api.post(f"/workspaces/{ws_id}/comments/", data={
            "content": "Comment with avatar",
            "display_name": "User",
            "entity_id": entity_id,
            "avatar_url": "https://example.com/avatar.png",
        })
        assert rv.status_code == 201
        assert rv.get_json()["data"]["avatar_url"] == "https://example.com/avatar.png"

    def test_create_comment_missing_content(self, api, auth_headers, seeded):
        ws_id = seeded["workspace_id"]
        rv = api.post(f"/workspaces/{ws_id}/comments/", data={
            "display_name": "Tester",
        })
        assert rv.status_code == 422
        assert "error" in rv.get_json()

    def test_create_comment_missing_display_name(self, api, auth_headers, seeded):
        ws_id = seeded["workspace_id"]
        rv = api.post(f"/workspaces/{ws_id}/comments/", data={
            "content": "Comment text",
        })
        assert rv.status_code == 422
        assert "error" in rv.get_json()

    def test_create_comment_content_too_short(self, api, auth_headers, seeded):
        ws_id = seeded["workspace_id"]
        rv = api.post(f"/workspaces/{ws_id}/comments/", data={
            "content": "X",
            "display_name": "Tester",
        })
        assert rv.status_code == 422
        assert "error" in rv.get_json()

    def test_unauthenticated(self, client, seeded):
        rv = client.post(
            f"/api/v1/workspaces/{seeded['workspace_id']}/comments/",
            json={"content": "Unauthenticated", "display_name": "T"},
        )
        assert rv.status_code == 401


class TestGetComment:
    def test_get_comment(self, api, auth_headers, seeded):
        ws_id = seeded["workspace_id"]
        entity_id = seeded["entity_id"]
        comment_id = _create_comment(api, ws_id, entity_id)
        rv = api.get(f"/workspaces/{ws_id}/comments/{comment_id}")
        assert rv.status_code == 200
        body = rv.get_json()
        assert body["data"]["id"] == comment_id
        assert body["data"]["content"] == "A test comment"

    def test_get_comment_not_found(self, api, auth_headers, seeded):
        ws_id = seeded["workspace_id"]
        rv = api.get(
            f"/workspaces/{ws_id}/comments/00000000-0000-0000-0000-000000000000"
        )
        assert rv.status_code == 404
        assert "error" in rv.get_json()

    def test_unauthenticated(self, client, seeded):
        rv = client.get(
            f"/api/v1/workspaces/{seeded['workspace_id']}/comments/"
            "00000000-0000-0000-0000-000000000000"
        )
        assert rv.status_code == 401


class TestUpdateComment:
    def test_update_comment_content(self, api, auth_headers, seeded):
        ws_id = seeded["workspace_id"]
        entity_id = seeded["entity_id"]
        comment_id = _create_comment(api, ws_id, entity_id)
        rv = api.patch(f"/workspaces/{ws_id}/comments/{comment_id}", data={
            "content": "Updated comment content",
        })
        assert rv.status_code == 200
        assert rv.get_json()["data"]["content"] == "Updated comment content"

    def test_update_comment_resolved(self, api, auth_headers, seeded):
        ws_id = seeded["workspace_id"]
        entity_id = seeded["entity_id"]
        comment_id = _create_comment(api, ws_id, entity_id)
        rv = api.patch(f"/workspaces/{ws_id}/comments/{comment_id}", data={
            "content": "Mark as resolved",
            "resolved": True,
        })
        assert rv.status_code == 200
        assert rv.get_json()["data"]["resolved"] is True

    def test_update_comment_not_found(self, api, auth_headers, seeded):
        ws_id = seeded["workspace_id"]
        rv = api.patch(
            f"/workspaces/{ws_id}/comments/00000000-0000-0000-0000-000000000000",
            data={"content": "Updated"},
        )
        assert rv.status_code == 404
        assert "error" in rv.get_json()

    def test_unauthenticated(self, client, seeded):
        rv = client.patch(
            f"/api/v1/workspaces/{seeded['workspace_id']}/comments/"
            "00000000-0000-0000-0000-000000000000",
            json={"content": "Updated"},
        )
        assert rv.status_code == 401


class TestDeleteComment:
    def test_delete_comment(self, api, auth_headers, seeded):
        ws_id = seeded["workspace_id"]
        entity_id = seeded["entity_id"]
        comment_id = _create_comment(api, ws_id, entity_id)
        rv = api.delete(f"/workspaces/{ws_id}/comments/{comment_id}")
        assert rv.status_code == 200
        assert "data" in rv.get_json()

    def test_delete_comment_twice(self, api, auth_headers, seeded):
        ws_id = seeded["workspace_id"]
        entity_id = seeded["entity_id"]
        comment_id = _create_comment(api, ws_id, entity_id)
        api.delete(f"/workspaces/{ws_id}/comments/{comment_id}")
        rv = api.delete(f"/workspaces/{ws_id}/comments/{comment_id}")
        assert rv.status_code == 404
        assert "error" in rv.get_json()

    def test_delete_comment_not_found(self, api, auth_headers, seeded):
        ws_id = seeded["workspace_id"]
        rv = api.delete(
            f"/workspaces/{ws_id}/comments/00000000-0000-0000-0000-000000000000"
        )
        assert rv.status_code == 404
        assert "error" in rv.get_json()

    def test_unauthenticated(self, client, seeded):
        rv = client.delete(
            f"/api/v1/workspaces/{seeded['workspace_id']}/comments/"
            "00000000-0000-0000-0000-000000000000"
        )
        assert rv.status_code == 401


class TestRestoreComment:
    def test_restore_comment(self, api, auth_headers, seeded):
        ws_id = seeded["workspace_id"]
        entity_id = seeded["entity_id"]
        comment_id = _create_comment(api, ws_id, entity_id)
        api.delete(f"/workspaces/{ws_id}/comments/{comment_id}")
        rv = api.post(f"/workspaces/{ws_id}/comments/{comment_id}/restore")
        assert rv.status_code == 200
        assert "data" in rv.get_json()

    def test_restore_not_deleted(self, api, auth_headers, seeded):
        ws_id = seeded["workspace_id"]
        entity_id = seeded["entity_id"]
        comment_id = _create_comment(api, ws_id, entity_id)
        rv = api.post(f"/workspaces/{ws_id}/comments/{comment_id}/restore")
        assert rv.status_code == 400
        assert "error" in rv.get_json()

    def test_restore_deleted_twice(self, api, auth_headers, seeded):
        ws_id = seeded["workspace_id"]
        entity_id = seeded["entity_id"]
        comment_id = _create_comment(api, ws_id, entity_id)
        api.delete(f"/workspaces/{ws_id}/comments/{comment_id}")
        api.post(f"/workspaces/{ws_id}/comments/{comment_id}/restore")
        rv = api.post(f"/workspaces/{ws_id}/comments/{comment_id}/restore")
        assert rv.status_code == 400
        assert "error" in rv.get_json()

    def test_restore_comment_not_found(self, api, auth_headers, seeded):
        ws_id = seeded["workspace_id"]
        rv = api.post(
            f"/workspaces/{ws_id}/comments/"
            "00000000-0000-0000-0000-000000000000/restore"
        )
        assert rv.status_code == 404
        assert "error" in rv.get_json()

    def test_unauthenticated(self, client, seeded):
        rv = client.post(
            f"/api/v1/workspaces/{seeded['workspace_id']}/comments/"
            "00000000-0000-0000-0000-000000000000/restore"
        )
        assert rv.status_code == 401
