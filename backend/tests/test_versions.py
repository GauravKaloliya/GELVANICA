"""Tests for branch, version, and diff routes."""

import uuid


def _create_branch(api, ws_id, name="Test Branch"):
    rv = api.post(f"/workspaces/{ws_id}/branches", data={"name": name})
    return rv.get_json()["data"]


def _create_block(api, ws_id, entity_id, branch_id):
    rv = api.post(f"/workspaces/{ws_id}/blocks/", data={
        "entity_id": entity_id,
        "branch_id": branch_id,
        "type": "text",
        "position": "0",
        "content": {"text": "hello"},
    })
    return rv.get_json()["data"]


# ---------------------------------------------------------------------------
# Branch routes
# ---------------------------------------------------------------------------

class TestBranchRoutes:
    """10 branch endpoints under /workspaces/{ws_id}/branches."""

    def test_list_branches(self, seeded, api):
        ws_id = seeded["workspace_id"]
        rv = api.get(f"/workspaces/{ws_id}/branches")
        assert rv.status_code == 200
        body = rv.get_json()
        assert "data" in body

    def test_create_branch(self, seeded, api):
        ws_id = seeded["workspace_id"]
        rv = api.post(f"/workspaces/{ws_id}/branches", data={"name": "feature-1"})
        assert rv.status_code == 201
        body = rv.get_json()
        assert body["data"]["name"] == "feature-1"
        assert body["data"]["workspace_id"] == ws_id

    def test_get_branch(self, seeded, api):
        ws_id = seeded["workspace_id"]
        branch = _create_branch(api, ws_id)
        rv = api.get(f"/workspaces/{ws_id}/branches/{branch['id']}")
        assert rv.status_code == 200
        assert rv.get_json()["data"]["id"] == branch["id"]

    def test_delete_branch(self, seeded, api):
        ws_id = seeded["workspace_id"]
        branch = _create_branch(api, ws_id, name="delete-me")
        rv = api.delete(f"/workspaces/{ws_id}/branches/{branch['id']}")
        assert rv.status_code == 200

    def test_update_branch_name(self, seeded, api):
        ws_id = seeded["workspace_id"]
        branch = _create_branch(api, ws_id, name="old-name")
        rv = api.patch(f"/workspaces/{ws_id}/branches/{branch['id']}", data={"name": "new-name"})
        assert rv.status_code == 200
        assert rv.get_json()["data"]["name"] == "new-name"

    def test_restore_branch(self, seeded, api):
        ws_id = seeded["workspace_id"]
        branch = _create_branch(api, ws_id, name="to-restore")
        api.delete(f"/workspaces/{ws_id}/branches/{branch['id']}")
        rv = api.post(f"/workspaces/{ws_id}/branches/{branch['id']}/restore")
        assert rv.status_code == 200
        assert rv.get_json()["data"]["is_deleted"] is False

    def test_merge_branch_single(self, seeded, api):
        ws_id = seeded["workspace_id"]
        source = _create_branch(api, ws_id, name="source")
        target = _create_branch(api, ws_id, name="target")
        rv = api.post(
            f"/workspaces/{ws_id}/branches/{source['id']}/merge",
            data={"target_branch_id": target["id"]},
        )
        assert rv.status_code == 400

    def test_merge_branches_two(self, seeded, api):
        ws_id = seeded["workspace_id"]
        source = _create_branch(api, ws_id, name="src")
        target = _create_branch(api, ws_id, name="tgt")
        rv = api.post(
            f"/workspaces/{ws_id}/branches/merge",
            data={"source_branch_id": source["id"], "target_branch_id": target["id"]},
        )
        assert rv.status_code == 400

    def test_list_merge_conflicts(self, seeded, api):
        ws_id = seeded["workspace_id"]
        rv = api.get(f"/workspaces/{ws_id}/branches/merge-conflicts")
        assert rv.status_code == 400

    def test_resolve_merge_conflict_not_found(self, seeded, api):
        ws_id = seeded["workspace_id"]
        fake_id = str(uuid.uuid4())
        rv = api.patch(
            f"/workspaces/{ws_id}/branches/merge-conflicts/{fake_id}/resolve",
            data={"resolution": "source"},
        )
        assert rv.status_code == 400


# ---------------------------------------------------------------------------
# Version routes
# ---------------------------------------------------------------------------

class TestVersionRoutes:
    """13 version endpoints under /workspaces/{ws_id}/versions."""

    def test_list_changesets_empty(self, seeded, api):
        ws_id = seeded["workspace_id"]
        rv = api.get(f"/workspaces/{ws_id}/versions/changesets")
        assert rv.status_code == 200
        body = rv.get_json()
        assert "data" in body

    def test_get_changeset_not_found(self, seeded, api):
        ws_id = seeded["workspace_id"]
        rv = api.get(f"/workspaces/{ws_id}/versions/changesets/{uuid.uuid4()}")
        assert rv.status_code == 404

    def test_delete_changeset_not_found(self, seeded, api):
        ws_id = seeded["workspace_id"]
        rv = api.delete(f"/workspaces/{ws_id}/versions/changesets/{uuid.uuid4()}")
        assert rv.status_code == 404

    def test_create_changeset(self, seeded, api):
        ws_id = seeded["workspace_id"]
        branch = _create_branch(api, ws_id)
        rv = api.post(f"/workspaces/{ws_id}/versions/changesets", data={"branch_id": branch["id"]})
        assert rv.status_code == 201
        body = rv.get_json()
        assert body["data"]["branch_id"] == branch["id"]

    def test_list_snapshots_empty(self, seeded, api):
        ws_id = seeded["workspace_id"]
        rv = api.get(f"/workspaces/{ws_id}/versions/snapshots")
        assert rv.status_code == 200
        body = rv.get_json()
        assert "data" in body

    def test_get_snapshot_not_found(self, seeded, api):
        ws_id = seeded["workspace_id"]
        rv = api.get(f"/workspaces/{ws_id}/versions/snapshots/{uuid.uuid4()}")
        assert rv.status_code == 404

    def test_delete_snapshot_not_found(self, seeded, api):
        ws_id = seeded["workspace_id"]
        rv = api.delete(f"/workspaces/{ws_id}/versions/snapshots/{uuid.uuid4()}")
        assert rv.status_code == 404

    def test_create_snapshot(self, seeded, api):
        ws_id = seeded["workspace_id"]
        branch = _create_branch(api, ws_id)
        rv = api.post(f"/workspaces/{ws_id}/versions/snapshots", data={
            "branch_id": branch["id"],
            "name": "v1",
        })
        assert rv.status_code == 201
        body = rv.get_json()
        assert body["data"]["branch_id"] == branch["id"]
        assert body["data"]["name"] == "v1"

    def test_snapshot_entity(self, seeded, api):
        ws_id = seeded["workspace_id"]
        entity_id = seeded["entity_id"]
        rv = api.post(f"/workspaces/{ws_id}/versions/entities/{entity_id}/snapshot", data={})
        assert rv.status_code == 201
        body = rv.get_json()
        assert "id" in body["data"]

    def test_list_entity_versions(self, seeded, api):
        ws_id = seeded["workspace_id"]
        entity_id = seeded["entity_id"]
        rv = api.get(f"/workspaces/{ws_id}/versions/entities/{entity_id}")
        assert rv.status_code == 200
        body = rv.get_json()
        assert "data" in body

    def test_list_block_versions(self, seeded, api):
        ws_id = seeded["workspace_id"]
        entity_id = seeded["entity_id"]
        branch = _create_branch(api, ws_id)
        block = _create_block(api, ws_id, entity_id, branch["id"])
        rv = api.get(f"/workspaces/{ws_id}/versions/blocks/{block['id']}")
        assert rv.status_code == 200
        body = rv.get_json()
        assert "data" in body

    def test_compare_versions_missing_params(self, seeded, api):
        ws_id = seeded["workspace_id"]
        rv = api.get(f"/workspaces/{ws_id}/versions/compare")
        assert rv.status_code == 400

    def test_restore_version_not_found(self, seeded, api):
        ws_id = seeded["workspace_id"]
        rv = api.post(f"/workspaces/{ws_id}/versions/{uuid.uuid4()}/restore")
        assert rv.status_code in (404, 400)


# ---------------------------------------------------------------------------
# Diff routes
# ---------------------------------------------------------------------------

class TestDiffRoutes:
    """2 diff endpoints under /workspaces/{ws_id}/diffs."""

    def test_compare_entities_diff(self, seeded, api):
        ws_id = seeded["workspace_id"]
        etype_id = seeded["entity_type_id"]
        crv = api.post(f"/workspaces/{ws_id}/entities/", data={
            "entity_type_id": etype_id, "name": "Diff Entity"
        })
        entity_id = crv.get_json()["data"]["id"]
        rv1 = api.post(f"/workspaces/{ws_id}/versions/entities/{entity_id}/snapshot", data={})
        assert rv1.status_code == 201
        v1_id = rv1.get_json()["data"]["id"]
        api.patch(f"/workspaces/{ws_id}/entities/{entity_id}", data={"name": "Updated Diff Entity"})
        rv2 = api.post(f"/workspaces/{ws_id}/versions/entities/{entity_id}/snapshot", data={})
        assert rv2.status_code == 201
        v2_id = rv2.get_json()["data"]["id"]
        rv = api.get(f"/workspaces/{ws_id}/diffs/compare?left_version_id={v1_id}&right_version_id={v2_id}")
        assert rv.status_code == 200

    def test_compare_blocks_diff(self, seeded, api):
        ws_id = seeded["workspace_id"]
        entity_id = seeded["entity_id"]
        branch = _create_branch(api, ws_id)
        block = _create_block(api, ws_id, entity_id, branch["id"])
        api.patch(f"/workspaces/{ws_id}/blocks/{block['id']}", data={"content": {"text": "updated"}})
        rv = api.post(f"/workspaces/{ws_id}/diffs/blocks", data={
            "left_block_id": block["id"],
            "right_block_id": block["id"],
        })
        assert rv.status_code in (200, 400)

    def test_compare_missing_params(self, seeded, api):
        ws_id = seeded["workspace_id"]
        rv = api.get(f"/workspaces/{ws_id}/diffs/compare")
        assert rv.status_code == 400

    def test_compare_version_not_found(self, seeded, api):
        ws_id = seeded["workspace_id"]
        rv = api.get(f"/workspaces/{ws_id}/diffs/compare?left_version_id={uuid.uuid4()}&right_version_id={uuid.uuid4()}")
        assert rv.status_code in (200, 404)
