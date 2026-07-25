def test_list_workspaces(api, auth_headers, seeded):
    rv = api.get("/workspaces/")
    assert rv.status_code == 200
    body = rv.get_json()
    assert "data" in body
    assert "meta" in body
    assert body["meta"]["total"] >= 1
    names = [ws["name"] for ws in body["data"]]
    assert "Test Workspace" in names


def test_list_workspaces_pagination(api, auth_headers, seeded):
    rv = api.get("/workspaces/?page=1&per_page=1")
    assert rv.status_code == 200
    body = rv.get_json()
    assert body["meta"]["page"] == 1
    assert body["meta"]["per_page"] == 1
    assert len(body["data"]) <= 1


def test_list_workspaces_search(api, auth_headers, seeded):
    rv = api.get("/workspaces/?search=Test")
    assert rv.status_code == 200
    body = rv.get_json()
    assert body["meta"]["total"] >= 1
    names = [ws["name"] for ws in body["data"]]
    assert "Test Workspace" in names


def test_list_workspaces_search_no_match(api, auth_headers, seeded):
    rv = api.get("/workspaces/?search=NonExistentXYZ")
    assert rv.status_code == 200
    body = rv.get_json()
    assert body["meta"]["total"] == 0
    assert body["data"] == []


def test_list_workspaces_unauthorized(client):
    rv = client.get("/api/v1/workspaces/")
    assert rv.status_code == 401


def test_create_workspace(api, auth_headers, app):
    rv = api.post("/workspaces/", data={"name": "New Workspace"})
    assert rv.status_code == 201
    body = rv.get_json()
    assert body["data"]["name"] == "New Workspace"
    assert "id" in body["data"]


def test_create_workspace_empty_name(api, auth_headers):
    rv = api.post("/workspaces/", data={"name": ""})
    assert rv.status_code == 422
    body = rv.get_json()
    assert "error" in body


def test_create_workspace_blank_name(api, auth_headers):
    rv = api.post("/workspaces/", data={"name": "   "})
    assert rv.status_code == 422
    body = rv.get_json()
    assert "error" in body


def test_create_workspace_long_name(api, auth_headers):
    rv = api.post("/workspaces/", data={"name": "a" * 81})
    assert rv.status_code == 422
    body = rv.get_json()
    assert "error" in body


def test_create_workspace_missing_name(api, auth_headers):
    rv = api.post("/workspaces/", data={"description": "no name"})
    assert rv.status_code == 422
    body = rv.get_json()
    assert "error" in body


def test_create_workspace_unauthorized(client):
    rv = client.post("/api/v1/workspaces/", json={"name": "Hacker WS"})
    assert rv.status_code == 401


def test_get_workspace(api, auth_headers, seeded):
    ws_id = seeded["workspace_id"]
    rv = api.get(f"/workspaces/{ws_id}")
    assert rv.status_code == 200
    body = rv.get_json()
    assert body["data"]["id"] == ws_id
    assert body["data"]["name"] == "Test Workspace"


def test_get_workspace_not_found(api, auth_headers):
    rv = api.get("/workspaces/00000000-0000-0000-0000-000000000000")
    assert rv.status_code == 404
    body = rv.get_json()
    assert "error" in body


def test_get_workspace_unauthorized(client, seeded):
    rv = client.get(f"/api/v1/workspaces/{seeded['workspace_id']}")
    assert rv.status_code == 401


def test_update_workspace(api, auth_headers, seeded):
    ws_id = seeded["workspace_id"]
    rv = api.patch(f"/workspaces/{ws_id}", data={"name": "Updated Name", "description": "New desc"})
    assert rv.status_code == 200
    body = rv.get_json()
    assert body["data"]["name"] == "Updated Name"
    assert body["data"]["description"] == "New desc"


def test_update_workspace_partial(api, auth_headers, seeded):
    ws_id = seeded["workspace_id"]
    rv = api.patch(f"/workspaces/{ws_id}", data={"description": "Just desc"})
    assert rv.status_code == 200
    body = rv.get_json()
    assert "description" in body["data"]


def test_update_workspace_not_found(api, auth_headers):
    rv = api.patch("/workspaces/00000000-0000-0000-0000-000000000000", data={"name": "Nope"})
    assert rv.status_code == 404
    body = rv.get_json()
    assert "error" in body


def test_update_workspace_unauthorized(client, seeded):
    rv = client.patch(
        f"/api/v1/workspaces/{seeded['workspace_id']}",
        json={"name": "Hacked"},
    )
    assert rv.status_code == 401


def test_delete_workspace(api, auth_headers, seeded):
    ws_id = seeded["workspace_id"]
    rv = api.delete(f"/workspaces/{ws_id}")
    assert rv.status_code == 200
    body = rv.get_json()
    assert "message" in body["data"]


def test_delete_workspace_twice(api, auth_headers, seeded):
    ws_id = seeded["workspace_id"]
    api.delete(f"/workspaces/{ws_id}")
    rv = api.delete(f"/workspaces/{ws_id}")
    assert rv.status_code == 404
    body = rv.get_json()
    assert "error" in body


def test_delete_workspace_not_found(api, auth_headers):
    rv = api.delete("/workspaces/00000000-0000-0000-0000-000000000000")
    assert rv.status_code == 404
    body = rv.get_json()
    assert "error" in body


def test_delete_workspace_unauthorized(client, seeded):
    rv = client.delete(f"/api/v1/workspaces/{seeded['workspace_id']}")
    assert rv.status_code == 401


def test_restore_workspace(api, auth_headers, seeded):
    ws_id = seeded["workspace_id"]
    api.delete(f"/workspaces/{ws_id}")
    rv = api.post(f"/workspaces/{ws_id}/restore")
    assert rv.status_code == 200
    body = rv.get_json()
    assert body["data"]["id"] == ws_id


def test_restore_workspace_not_deleted(api, auth_headers, seeded):
    ws_id = seeded["workspace_id"]
    rv = api.post(f"/workspaces/{ws_id}/restore")
    assert rv.status_code == 200
    body = rv.get_json()
    assert body["data"]["id"] == ws_id


def test_restore_workspace_not_found(api, auth_headers):
    rv = api.post("/workspaces/00000000-0000-0000-0000-000000000000/restore")
    assert rv.status_code == 404
    body = rv.get_json()
    assert "error" in body


def test_restore_workspace_unauthorized(client, seeded):
    rv = client.post(f"/api/v1/workspaces/{seeded['workspace_id']}/restore")
    assert rv.status_code == 401


def test_workspace_stats(api, auth_headers, seeded):
    ws_id = seeded["workspace_id"]
    rv = api.get(f"/workspaces/{ws_id}/stats")
    assert rv.status_code == 200
    body = rv.get_json()
    assert body["data"]["entity_count"] >= 1
    assert "block_count" in body["data"]
    assert "relation_count" in body["data"]


def test_workspace_stats_not_found(api, auth_headers):
    rv = api.get("/workspaces/00000000-0000-0000-0000-000000000000/stats")
    assert rv.status_code == 404
    body = rv.get_json()
    assert "error" in body


def test_workspace_stats_unauthorized(client, seeded):
    rv = client.get(f"/api/v1/workspaces/{seeded['workspace_id']}/stats")
    assert rv.status_code == 401
