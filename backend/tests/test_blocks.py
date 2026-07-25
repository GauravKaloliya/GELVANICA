"""Tests for block routes (all @secured, prefix /workspaces)."""

import uuid


def _branch(api, ws_id):
    rv = api.post(f"/workspaces/{ws_id}/branches", data={
        "name": "main", "is_default": True,
    })
    return rv.get_json()["data"]["id"]


def _text_block(api, ws_id, entity_id, branch_id, position="1.0"):
    data = {
        "entity_id": entity_id,
        "branch_id": branch_id,
        "type": "text",
        "content": {"text": "Hello"},
        "position": position,
    }
    rv = api.post(f"/workspaces/{ws_id}/blocks/", data=data)
    return rv.get_json()["data"]


class TestListBlocks:
    def test_requires_entity_id(self, api, seeded):
        ws_id = seeded["workspace_id"]
        rv = api.get(f"/workspaces/{ws_id}/blocks/")
        assert rv.status_code == 400
        assert rv.get_json()["error"]["code"] == "bad_request"

    def test_list_blocks(self, api, seeded):
        ws_id = seeded["workspace_id"]
        entity_id = seeded["entity_id"]
        branch_id = _branch(api, ws_id)
        b1 = _text_block(api, ws_id, entity_id, branch_id, "1.0")
        b2 = _text_block(api, ws_id, entity_id, branch_id, "2.0")
        rv = api.get(f"/workspaces/{ws_id}/blocks/?entity_id={entity_id}")
        assert rv.status_code == 200
        body = rv.get_json()
        assert body["meta"]["total"] >= 2
        ids = [b["id"] for b in body["data"]]
        assert b1["id"] in ids
        assert b2["id"] in ids

    def test_404_when_entity_not_found(self, api, seeded):
        ws_id = seeded["workspace_id"]
        fake = uuid.uuid4().hex
        rv = api.get(f"/workspaces/{ws_id}/blocks/?entity_id={fake}")
        assert rv.status_code == 404


class TestCreateBlock:
    def test_creates_block(self, api, seeded):
        ws_id = seeded["workspace_id"]
        entity_id = seeded["entity_id"]
        branch_id = _branch(api, ws_id)
        rv = api.post(f"/workspaces/{ws_id}/blocks/", data={
            "entity_id": entity_id,
            "branch_id": branch_id,
            "type": "text",
            "content": {"text": "Hello"},
            "position": "1.0",
        })
        assert rv.status_code == 201
        data = rv.get_json()["data"]
        assert data["type"] == "text"
        assert data["content"] == {"text": "Hello"}
        assert data["position"] == 1.0
        assert data["entity_id"] == entity_id
        assert data["is_deleted"] is False

    def test_requires_entity_id(self, api, seeded):
        ws_id = seeded["workspace_id"]
        branch_id = _branch(api, ws_id)
        rv = api.post(f"/workspaces/{ws_id}/blocks/", data={
            "branch_id": branch_id,
            "type": "text",
            "content": {"text": "Hello"},
            "position": "1.0",
        })
        assert rv.status_code == 422

    def test_requires_type(self, api, seeded):
        ws_id = seeded["workspace_id"]
        entity_id = seeded["entity_id"]
        branch_id = _branch(api, ws_id)
        rv = api.post(f"/workspaces/{ws_id}/blocks/", data={
            "entity_id": entity_id,
            "branch_id": branch_id,
            "content": {"text": "Hello"},
            "position": "1.0",
        })
        assert rv.status_code == 422

    def test_requires_position(self, api, seeded):
        ws_id = seeded["workspace_id"]
        entity_id = seeded["entity_id"]
        branch_id = _branch(api, ws_id)
        rv = api.post(f"/workspaces/{ws_id}/blocks/", data={
            "entity_id": entity_id,
            "branch_id": branch_id,
            "type": "text",
            "content": {"text": "Hello"},
        })
        assert rv.status_code == 422

    def test_404_when_entity_not_found(self, api, seeded):
        ws_id = seeded["workspace_id"]
        branch_id = _branch(api, ws_id)
        rv = api.post(f"/workspaces/{ws_id}/blocks/", data={
            "entity_id": "00000000-0000-0000-0000-000000000000",
            "branch_id": branch_id,
            "type": "text",
            "content": {"text": "Hello"},
            "position": "1.0",
        })
        assert rv.status_code == 404

    def test_heading_block_content(self, api, seeded):
        ws_id = seeded["workspace_id"]
        entity_id = seeded["entity_id"]
        branch_id = _branch(api, ws_id)
        rv = api.post(f"/workspaces/{ws_id}/blocks/", data={
            "entity_id": entity_id,
            "branch_id": branch_id,
            "type": "heading",
            "content": {"text": "Heading", "level": 2},
            "position": "1.0",
        })
        assert rv.status_code == 201
        assert rv.get_json()["data"]["type"] == "heading"

    def test_checkbox_block_content(self, api, seeded):
        ws_id = seeded["workspace_id"]
        entity_id = seeded["entity_id"]
        branch_id = _branch(api, ws_id)
        rv = api.post(f"/workspaces/{ws_id}/blocks/", data={
            "entity_id": entity_id,
            "branch_id": branch_id,
            "type": "checkbox",
            "content": {"checked": False},
            "position": "1.0",
        })
        assert rv.status_code == 201


class TestGetBlock:
    def test_gets_block(self, api, seeded):
        ws_id = seeded["workspace_id"]
        entity_id = seeded["entity_id"]
        branch_id = _branch(api, ws_id)
        created = _text_block(api, ws_id, entity_id, branch_id)
        rv = api.get(f"/workspaces/{ws_id}/blocks/{created['id']}")
        assert rv.status_code == 200
        assert rv.get_json()["data"]["id"] == created["id"]

    def test_404_when_not_found(self, api, seeded):
        ws_id = seeded["workspace_id"]
        rv = api.get(f"/workspaces/{ws_id}/blocks/{uuid.uuid4().hex}")
        assert rv.status_code == 404


class TestUpdateBlock:
    def test_updates_content(self, api, seeded):
        ws_id = seeded["workspace_id"]
        entity_id = seeded["entity_id"]
        branch_id = _branch(api, ws_id)
        created = _text_block(api, ws_id, entity_id, branch_id)
        rv = api.patch(f"/workspaces/{ws_id}/blocks/{created['id']}", data={
            "content": {"text": "Updated"},
        })
        assert rv.status_code == 200
        assert rv.get_json()["data"]["content"]["text"] == "Updated"

    def test_updates_position(self, api, seeded):
        ws_id = seeded["workspace_id"]
        entity_id = seeded["entity_id"]
        branch_id = _branch(api, ws_id)
        created = _text_block(api, ws_id, entity_id, branch_id, "1.0")
        rv = api.patch(f"/workspaces/{ws_id}/blocks/{created['id']}", data={
            "position": "5.0",
        })
        assert rv.status_code == 200
        assert rv.get_json()["data"]["position"] == 5.0

    def test_404_when_not_found(self, api, seeded):
        ws_id = seeded["workspace_id"]
        rv = api.patch(f"/workspaces/{ws_id}/blocks/{uuid.uuid4().hex}", data={
            "content": {"text": "Nope"},
        })
        assert rv.status_code == 404


class TestMoveBlock:
    def test_moves_block(self, api, seeded):
        ws_id = seeded["workspace_id"]
        entity_id = seeded["entity_id"]
        branch_id = _branch(api, ws_id)
        created = _text_block(api, ws_id, entity_id, branch_id, "1.0")
        rv = api.post(f"/workspaces/{ws_id}/blocks/{created['id']}/move", data={
            "position": "10.0",
        })
        assert rv.status_code == 200
        assert rv.get_json()["data"]["position"] == 10.0

    def test_requires_position(self, api, seeded):
        ws_id = seeded["workspace_id"]
        entity_id = seeded["entity_id"]
        branch_id = _branch(api, ws_id)
        created = _text_block(api, ws_id, entity_id, branch_id)
        rv = api.post(f"/workspaces/{ws_id}/blocks/{created['id']}/move", data={})
        assert rv.status_code == 422

    def test_404_when_not_found(self, api, seeded):
        ws_id = seeded["workspace_id"]
        rv = api.post(f"/workspaces/{ws_id}/blocks/{uuid.uuid4().hex}/move", data={
            "position": "1.0",
        })
        assert rv.status_code == 404


class TestDeleteBlock:
    def test_soft_deletes(self, api, seeded):
        ws_id = seeded["workspace_id"]
        entity_id = seeded["entity_id"]
        branch_id = _branch(api, ws_id)
        created = _text_block(api, ws_id, entity_id, branch_id)
        rv = api.delete(f"/workspaces/{ws_id}/blocks/{created['id']}")
        assert rv.status_code == 200
        assert rv.get_json()["data"]["is_deleted"] is True

    def test_404_when_not_found(self, api, seeded):
        ws_id = seeded["workspace_id"]
        rv = api.delete(f"/workspaces/{ws_id}/blocks/{uuid.uuid4().hex}")
        assert rv.status_code == 404


class TestReorderBlocks:
    def test_reorders(self, api, seeded):
        ws_id = seeded["workspace_id"]
        entity_id = seeded["entity_id"]
        branch_id = _branch(api, ws_id)
        b1 = _text_block(api, ws_id, entity_id, branch_id, "1.0")
        b2 = _text_block(api, ws_id, entity_id, branch_id, "2.0")
        rv = api.post(f"/workspaces/{ws_id}/blocks/reorder", data={
            "entity_id": entity_id,
            "blocks": [
                {"id": b1["id"], "position": "99.0"},
                {"id": b2["id"], "position": "100.0"},
            ],
        })
        assert rv.status_code == 200
        assert rv.get_json()["data"]["reordered"] == 2

    def test_requires_entity_id(self, api, seeded):
        ws_id = seeded["workspace_id"]
        rv = api.post(f"/workspaces/{ws_id}/blocks/reorder", data={"blocks": []})
        assert rv.status_code == 400

    def test_requires_blocks_list(self, api, seeded):
        ws_id = seeded["workspace_id"]
        rv = api.post(f"/workspaces/{ws_id}/blocks/reorder", data={
            "entity_id": seeded["entity_id"],
        })
        assert rv.status_code == 400


class TestRestoreBlock:
    def test_restores(self, api, seeded):
        ws_id = seeded["workspace_id"]
        entity_id = seeded["entity_id"]
        branch_id = _branch(api, ws_id)
        created = _text_block(api, ws_id, entity_id, branch_id)
        api.delete(f"/workspaces/{ws_id}/blocks/{created['id']}")
        rv = api.post(f"/workspaces/{ws_id}/blocks/{created['id']}/restore")
        assert rv.status_code == 200
        assert rv.get_json()["data"]["is_deleted"] is False

    def test_404_when_not_found(self, api, seeded):
        ws_id = seeded["workspace_id"]
        rv = api.post(f"/workspaces/{ws_id}/blocks/{uuid.uuid4().hex}/restore")
        assert rv.status_code == 404


class TestEntityRedirect:
    def test_redirects_to_list_blocks(self, api, seeded):
        ws_id = seeded["workspace_id"]
        entity_id = seeded["entity_id"]
        rv = api.get(f"/workspaces/{ws_id}/blocks/entity/{entity_id}", follow_redirects=False)
        assert rv.status_code == 308
        assert f"entity_id={entity_id}" in rv.headers.get("Location", "")

    def test_404_when_entity_not_found(self, api, seeded):
        ws_id = seeded["workspace_id"]
        rv = api.get(f"/workspaces/{ws_id}/blocks/entity/{uuid.uuid4().hex}", follow_redirects=False)
        assert rv.status_code == 404


class TestBranchIsolation:
    def test_blocks_can_be_created_in_different_branches(self, api, seeded):
        ws_id = seeded["workspace_id"]
        entity_id = seeded["entity_id"]
        branch_a_id = _branch(api, ws_id)
        rv = api.post(f"/workspaces/{ws_id}/branches", data={
            "name": "feature", "is_default": False,
        })
        branch_b_id = rv.get_json()["data"]["id"]
        b_a = _text_block(api, ws_id, entity_id, branch_a_id, "1.0")
        b_b = _text_block(api, ws_id, entity_id, branch_b_id, "1.0")
        rv = api.get(f"/workspaces/{ws_id}/blocks/?entity_id={entity_id}")
        assert rv.status_code == 200
        ids = [b["id"] for b in rv.get_json()["data"]]
        assert b_a["id"] in ids
        assert b_b["id"] in ids
        assert len(ids) == 2

    def test_same_position_different_branches_allowed(self, api, seeded):
        ws_id = seeded["workspace_id"]
        entity_id = seeded["entity_id"]
        branch_a_id = _branch(api, ws_id)
        rv = api.post(f"/workspaces/{ws_id}/branches", data={
            "name": "other", "is_default": False,
        })
        branch_b_id = rv.get_json()["data"]["id"]
        rv = api.post(f"/workspaces/{ws_id}/blocks/", data={
            "entity_id": entity_id,
            "branch_id": branch_a_id,
            "type": "text",
            "content": {"text": "A"},
            "position": "1.0",
        })
        assert rv.status_code == 201
        rv = api.post(f"/workspaces/{ws_id}/blocks/", data={
            "entity_id": entity_id,
            "branch_id": branch_b_id,
            "type": "text",
            "content": {"text": "B"},
            "position": "1.0",
        })
        assert rv.status_code == 201

    def test_list_blocks_filters_by_branch(self, api, seeded):
        ws_id = seeded["workspace_id"]
        entity_id = seeded["entity_id"]
        branch_id = _branch(api, ws_id)
        b1 = _text_block(api, ws_id, entity_id, branch_id, "1.0")
        b2 = _text_block(api, ws_id, entity_id, branch_id, "2.0")
        rv = api.get(f"/workspaces/{ws_id}/blocks/?entity_id={entity_id}")
        assert rv.status_code == 200
        ids = [b["id"] for b in rv.get_json()["data"]]
        assert b1["id"] in ids
        assert b2["id"] in ids

    def test_delete_block_on_one_branch_does_not_affect_other(self, api, seeded):
        ws_id = seeded["workspace_id"]
        entity_id = seeded["entity_id"]
        branch_a_id = _branch(api, ws_id)
        rv = api.post(f"/workspaces/{ws_id}/branches", data={
            "name": "side", "is_default": False,
        })
        branch_b_id = rv.get_json()["data"]["id"]
        b_a = _text_block(api, ws_id, entity_id, branch_a_id, "1.0")
        b_b = _text_block(api, ws_id, entity_id, branch_b_id, "1.0")
        api.delete(f"/workspaces/{ws_id}/blocks/{b_a['id']}")
        rv = api.get(f"/workspaces/{ws_id}/blocks/?entity_id={entity_id}&branch_id={branch_b_id}")
        assert rv.status_code == 200
        ids = [b["id"] for b in rv.get_json()["data"]]
        assert b_b["id"] in ids
        assert b_a["id"] not in ids
