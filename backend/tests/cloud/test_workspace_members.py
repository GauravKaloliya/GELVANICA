"""Tests for all workspace member routes: list, get, invite, update role, remove."""

import uuid


def _create_workspace(api):
    name = f"Member WS {uuid.uuid4().hex[:8]}"
    rv = api.post("/workspaces/", data={"name": name})
    assert rv.status_code == 201, f"create workspace failed: {rv.get_json()}"
    return rv.get_json()["data"]["id"]


def _second_user(api):
    email = f"member-{uuid.uuid4().hex[:8]}@example.com"
    rv = api.post("/auth/register", data={
        "email": email, "password": "Password123!", "name": "Second User",
    })
    assert rv.status_code == 201, f"register failed: {rv.get_json()}"
    data = rv.get_json()["data"]
    return data["user"]["id"], email


def _invite(api, ws_id, email, role="viewer"):
    return api.post(f"/workspaces/{ws_id}/members/invite", data={
        "email": email, "role": role,
    })


class TestListMembers:
    def test_list_members(self, api, auth_headers):
        ws_id = _create_workspace(api)
        rv = api.get(f"/workspaces/{ws_id}/members")
        assert rv.status_code == 200
        body = rv.get_json()
        assert "data" in body
        assert "meta" in body
        assert body["meta"]["total"] >= 1
        assert "user_id" in body["data"][0]

    def test_list_members_search(self, api, auth_headers):
        ws_id = _create_workspace(api)
        _, email = _second_user(api)
        _invite(api, ws_id, email, "editor")

        rv = api.get(f"/workspaces/{ws_id}/members?search=Second")
        assert rv.status_code == 200
        body = rv.get_json()
        assert body["meta"]["total"] >= 1

    def test_list_members_search_no_match(self, api, auth_headers):
        ws_id = _create_workspace(api)
        rv = api.get(f"/workspaces/{ws_id}/members?search=NonExistentXYZ")
        assert rv.status_code == 200
        body = rv.get_json()
        assert body["meta"]["total"] == 0
        assert body["data"] == []

    def test_unauthenticated(self, client):
        rv = client.get("/api/v1/workspaces/00000000-0000-0000-0000-000000000000/members")
        assert rv.status_code == 401


class TestGetMember:
    def test_get_member(self, api, auth_headers):
        ws_id = _create_workspace(api)
        rv = api.get("/auth/me")
        assert rv.status_code == 200
        user_id = rv.get_json()["data"]["id"]

        rv = api.get(f"/workspaces/{ws_id}/members/{user_id}")
        assert rv.status_code == 200
        body = rv.get_json()
        assert body["data"]["user_id"] == user_id
        assert body["data"]["role"] == "owner"

    def test_get_member_not_found(self, api, auth_headers):
        ws_id = _create_workspace(api)
        rv = api.get(f"/workspaces/{ws_id}/members/00000000-0000-0000-0000-000000000000")
        assert rv.status_code == 404
        body = rv.get_json()
        assert "error" in body

    def test_unauthenticated(self, client):
        rv = client.get(
            "/api/v1/workspaces/00000000-0000-0000-0000-000000000000/members/"
            "00000000-0000-0000-0000-000000000000"
        )
        assert rv.status_code == 401


class TestInviteMember:
    def test_invite_member(self, api, auth_headers):
        ws_id = _create_workspace(api)
        uid, email = _second_user(api)

        rv = _invite(api, ws_id, email, role="editor")
        assert rv.status_code == 201
        body = rv.get_json()
        assert body["data"]["user_id"] == uid
        assert body["data"]["role"] == "editor"

    def test_invite_member_duplicate(self, api, auth_headers):
        ws_id = _create_workspace(api)
        _, email = _second_user(api)
        _invite(api, ws_id, email, "viewer")

        rv = _invite(api, ws_id, email, "editor")
        assert rv.status_code == 409
        body = rv.get_json()
        assert "error" in body

    def test_invite_member_nonexistent_email(self, api, auth_headers):
        ws_id = _create_workspace(api)
        rv = _invite(api, ws_id, "nobody@example.com", "viewer")
        assert rv.status_code == 404
        body = rv.get_json()
        assert "error" in body

    def test_invite_member_missing_email(self, api, auth_headers):
        ws_id = _create_workspace(api)
        rv = api.post(f"/workspaces/{ws_id}/members/invite", data={
            "role": "editor",
        })
        assert rv.status_code == 422
        body = rv.get_json()
        assert "error" in body

    def test_invite_member_missing_role(self, api, auth_headers):
        ws_id = _create_workspace(api)
        _, email = _second_user(api)
        rv = api.post(f"/workspaces/{ws_id}/members/invite", data={
            "email": email,
        })
        assert rv.status_code == 422
        body = rv.get_json()
        assert "error" in body

    def test_invite_member_invalid_role(self, api, auth_headers):
        ws_id = _create_workspace(api)
        _, email = _second_user(api)
        rv = api.post(f"/workspaces/{ws_id}/members/invite", data={
            "email": email, "role": "superadmin",
        })
        assert rv.status_code == 422
        body = rv.get_json()
        assert "error" in body

    def test_unauthenticated(self, client):
        rv = client.post(
            "/api/v1/workspaces/00000000-0000-0000-0000-000000000000/members/invite",
            json={"email": "test@example.com", "role": "editor"},
        )
        assert rv.status_code == 401


class TestUpdateMemberRole:
    def test_update_member_role(self, api, auth_headers):
        ws_id = _create_workspace(api)
        uid, email = _second_user(api)
        _invite(api, ws_id, email, "viewer")

        rv = api.patch(f"/workspaces/{ws_id}/members/{uid}", data={
            "email": email, "role": "editor",
        })
        assert rv.status_code == 200
        body = rv.get_json()
        assert body["data"]["role"] == "editor"

    def test_update_member_promote_to_admin(self, api, auth_headers):
        ws_id = _create_workspace(api)
        uid, email = _second_user(api)
        _invite(api, ws_id, email, "viewer")

        rv = api.patch(f"/workspaces/{ws_id}/members/{uid}", data={
            "email": email, "role": "admin",
        })
        assert rv.status_code == 200
        body = rv.get_json()
        assert body["data"]["role"] == "admin"

    def test_update_member_cannot_change_own_role(self, api, auth_headers):
        ws_id = _create_workspace(api)
        rv = api.get("/auth/me")
        assert rv.status_code == 200
        user_id = rv.get_json()["data"]["id"]

        rv = api.patch(f"/workspaces/{ws_id}/members/{user_id}", data={
            "email": "cloud-test@example.com", "role": "editor",
        })
        assert rv.status_code == 400
        body = rv.get_json()
        assert "error" in body

    def test_update_member_not_found(self, api, auth_headers):
        ws_id = _create_workspace(api)
        rv = api.patch(
            f"/workspaces/{ws_id}/members/00000000-0000-0000-0000-000000000000",
            data={"email": "x@y.com", "role": "editor"},
        )
        assert rv.status_code == 404
        body = rv.get_json()
        assert "error" in body

    def test_update_member_invalid_role(self, api, auth_headers):
        ws_id = _create_workspace(api)
        uid, email = _second_user(api)
        _invite(api, ws_id, email, "viewer")

        rv = api.patch(f"/workspaces/{ws_id}/members/{uid}", data={
            "email": email, "role": "superadmin",
        })
        assert rv.status_code == 422
        body = rv.get_json()
        assert "error" in body

    def test_unauthenticated(self, client):
        rv = client.patch(
            "/api/v1/workspaces/00000000-0000-0000-0000-000000000000/members/"
            "00000000-0000-0000-0000-000000000000",
            json={"email": "x@y.com", "role": "editor"},
        )
        assert rv.status_code == 401


class TestRemoveMember:
    def test_remove_member(self, api, auth_headers):
        ws_id = _create_workspace(api)
        uid, email = _second_user(api)
        _invite(api, ws_id, email, "editor")

        rv = api.delete(f"/workspaces/{ws_id}/members/{uid}")
        assert rv.status_code == 200
        body = rv.get_json()
        assert body["data"]["message"] == "Member removed"

    def test_remove_member_twice(self, api, auth_headers):
        ws_id = _create_workspace(api)
        uid, email = _second_user(api)
        _invite(api, ws_id, email, "editor")
        api.delete(f"/workspaces/{ws_id}/members/{uid}")

        rv = api.delete(f"/workspaces/{ws_id}/members/{uid}")
        assert rv.status_code == 404
        body = rv.get_json()
        assert "error" in body

    def test_remove_member_not_found(self, api, auth_headers):
        ws_id = _create_workspace(api)
        rv = api.delete(
            f"/workspaces/{ws_id}/members/00000000-0000-0000-0000-000000000000"
        )
        assert rv.status_code == 404
        body = rv.get_json()
        assert "error" in body

    def test_remove_member_cannot_remove_self(self, api, auth_headers):
        ws_id = _create_workspace(api)
        rv = api.get("/auth/me")
        assert rv.status_code == 200
        user_id = rv.get_json()["data"]["id"]

        rv = api.delete(f"/workspaces/{ws_id}/members/{user_id}")
        assert rv.status_code == 400
        body = rv.get_json()
        assert "error" in body

    def test_remove_member_cannot_remove_owner(self, api, auth_headers):
        ws_id = _create_workspace(api)
        uid, email = _second_user(api)
        _invite(api, ws_id, email, "viewer")
        api.patch(f"/workspaces/{ws_id}/members/{uid}", data={
            "email": email, "role": "owner",
        })

        rv = api.delete(f"/workspaces/{ws_id}/members/{uid}")
        assert rv.status_code == 400
        body = rv.get_json()
        assert "error" in body

    def test_unauthenticated(self, client):
        rv = client.delete(
            "/api/v1/workspaces/00000000-0000-0000-0000-000000000000/members/"
            "00000000-0000-0000-0000-000000000000"
        )
        assert rv.status_code == 401
