"""Tests for dashboard, settings, activity, and governance routes."""


def _put(api, path, data=None):
    return api.client.put(
        f"{api.base}{path}",
        json=data,
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {api.token}",
        },
    )


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


def _create_entity(api, ws_id, etype_id, name):
    rv = api.post(
        f"/workspaces/{ws_id}/entities/",
        data={"entity_type_id": etype_id, "name": name},
    )
    return rv.get_json()["data"]["id"]


class TestDashboard:
    def test_overview(self, api, seeded):
        ws_id = seeded["workspace_id"]
        rv = api.get(f"/workspaces/{ws_id}/dashboard/overview")
        assert rv.status_code == 200
        data = rv.get_json()["data"]
        assert "entity_count" in data
        assert data["workspace_id"] == ws_id

    def test_overview_entity_count(self, api, seeded):
        ws_id = seeded["workspace_id"]
        etype_id = seeded["entity_type_id"]
        _create_entity(api, ws_id, etype_id, "Second Entity")
        rv = api.get(f"/workspaces/{ws_id}/dashboard/overview")
        assert rv.status_code == 200
        data = rv.get_json()["data"]
        assert data["entity_count"] == 2

    def test_overview_block_count(self, api, seeded):
        ws_id = seeded["workspace_id"]
        entity_id = seeded["entity_id"]
        branch_id = _branch(api, ws_id)
        _text_block(api, ws_id, entity_id, branch_id)
        rv = api.get(f"/workspaces/{ws_id}/dashboard/overview")
        assert rv.status_code == 200
        data = rv.get_json()["data"]
        assert data["block_count"] == 1

    def test_overview_relation_count(self, api, seeded):
        ws_id = seeded["workspace_id"]
        etype_id = seeded["entity_type_id"]
        source = seeded["entity_id"]
        target = _create_entity(api, ws_id, etype_id, "Relation Target")
        api.post(
            f"/workspaces/{ws_id}/relations/",
            data={"source_id": source, "target_id": target, "type": "references"},
        )
        rv = api.get(f"/workspaces/{ws_id}/dashboard/overview")
        assert rv.status_code == 200
        data = rv.get_json()["data"]
        assert data["relation_count"] >= 1

    def test_overview_entity_count_increases(self, api, seeded):
        ws_id = seeded["workspace_id"]
        etype_id = seeded["entity_type_id"]
        rv = api.get(f"/workspaces/{ws_id}/dashboard/overview")
        assert rv.status_code == 200
        count_before = rv.get_json()["data"]["entity_count"]
        api.post(f"/workspaces/{ws_id}/entities/types", data={"name": "Article"})
        rv = api.get(f"/workspaces/{ws_id}/dashboard/overview")
        assert rv.status_code == 200
        data = rv.get_json()["data"]
        assert data["entity_count"] == count_before  # creating a type doesn't change entity count

    def test_overview_has_expected_keys(self, api, seeded):
        ws_id = seeded["workspace_id"]
        rv = api.get(f"/workspaces/{ws_id}/dashboard/overview")
        assert rv.status_code == 200
        data = rv.get_json()["data"]
        for key in ("workspace_id", "entity_count", "block_count", "relation_count", "comment_count", "member_count", "archived_count", "recent_entities"):
            assert key in data

    def test_overview_workspace_id(self, api, seeded):
        ws_id = seeded["workspace_id"]
        rv = api.get(f"/workspaces/{ws_id}/dashboard/overview")
        assert rv.status_code == 200
        data = rv.get_json()["data"]
        assert data["workspace_id"] == ws_id

    def test_overview_after_delete(self, api, seeded):
        ws_id = seeded["workspace_id"]
        etype_id = seeded["entity_type_id"]
        rv = api.get(f"/workspaces/{ws_id}/dashboard/overview")
        assert rv.status_code == 200
        count_before = rv.get_json()["data"]["entity_count"]
        entity_id = _create_entity(api, ws_id, etype_id, "To Delete")
        api.delete(f"/workspaces/{ws_id}/entities/{entity_id}")
        rv = api.get(f"/workspaces/{ws_id}/dashboard/overview")
        assert rv.status_code == 200
        data = rv.get_json()["data"]
        assert data["entity_count"] == count_before

    def test_storage(self, api, seeded):
        ws_id = seeded["workspace_id"]
        rv = api.get(f"/workspaces/{ws_id}/dashboard/storage")
        assert rv.status_code == 200

    def test_storage_has_keys(self, api, seeded):
        ws_id = seeded["workspace_id"]
        rv = api.get(f"/workspaces/{ws_id}/dashboard/storage")
        assert rv.status_code == 200
        data = rv.get_json()["data"]
        assert "files" in data
        assert "count" in data["files"]
        assert "total_size" in data["files"]
        assert isinstance(data["files"]["total_size"], int)


class TestSettings:
    def test_get_category(self, api, seeded):
        ws_id = seeded["workspace_id"]
        rv = api.get(f"/workspaces/{ws_id}/settings/general")
        assert rv.status_code == 200

    def test_get_category_invalid(self, api, seeded):
        ws_id = seeded["workspace_id"]
        rv = api.get(f"/workspaces/{ws_id}/settings/invalid")
        assert rv.status_code == 400

    def test_list_all(self, api, seeded):
        ws_id = seeded["workspace_id"]
        rv = api.get(f"/workspaces/{ws_id}/settings")
        assert rv.status_code == 200

    def test_list_all_flat(self, api, seeded):
        ws_id = seeded["workspace_id"]
        rv = api.get(f"/workspaces/{ws_id}/settings?flat=true")
        assert rv.status_code == 200

    def test_update_category(self, api, seeded):
        ws_id = seeded["workspace_id"]
        rv = _put(api, f"/workspaces/{ws_id}/settings/general", {"language": "fr"})
        assert rv.status_code == 200
        data = rv.get_json()["data"]
        assert data["language"] == "fr"

    def test_patch_all(self, api, seeded):
        ws_id = seeded["workspace_id"]
        rv = api.patch(
            f"/workspaces/{ws_id}/settings",
            {"general": {"language": "de"}, "editor": {"spellcheck": False}},
        )
        assert rv.status_code == 200
        data = rv.get_json()["data"]
        assert data["general"]["language"] == "de"
        assert data["editor"]["spellcheck"] is False

    def test_reset_category(self, api, seeded):
        ws_id = seeded["workspace_id"]
        _put(api, f"/workspaces/{ws_id}/settings/general", {"language": "fr"})
        rv = api.post(f"/workspaces/{ws_id}/settings/reset", {"category": "general"})
        assert rv.status_code == 200
        data = rv.get_json()["data"]
        assert data["language"] == "en"

    def test_reset_all(self, api, seeded):
        ws_id = seeded["workspace_id"]
        rv = api.post(f"/workspaces/{ws_id}/settings/reset", {"category": "all"})
        assert rv.status_code == 200


class TestActivity:
    def test_list(self, api, seeded):
        ws_id = seeded["workspace_id"]
        rv = api.get(f"/workspaces/{ws_id}/activity")
        assert rv.status_code == 200

    def test_list_events(self, api, seeded):
        ws_id = seeded["workspace_id"]
        rv = api.get(f"/workspaces/{ws_id}/activity/events")
        assert rv.status_code == 200


class TestGovernance:
    def test_list_reports(self, api, seeded):
        ws_id = seeded["workspace_id"]
        rv = api.get(f"/workspaces/{ws_id}/governance/reports")
        assert rv.status_code == 400

    def test_health(self, api, seeded):
        ws_id = seeded["workspace_id"]
        rv = api.get(f"/workspaces/{ws_id}/governance/health")
        assert rv.status_code == 400

    def test_duplicates(self, api, seeded):
        ws_id = seeded["workspace_id"]
        rv = api.get(f"/workspaces/{ws_id}/governance/duplicates")
        assert rv.status_code == 400

    def test_orphans(self, api, seeded):
        ws_id = seeded["workspace_id"]
        rv = api.get(f"/workspaces/{ws_id}/governance/orphans")
        assert rv.status_code == 400

    def test_stale(self, api, seeded):
        ws_id = seeded["workspace_id"]
        rv = api.get(f"/workspaces/{ws_id}/governance/stale")
        assert rv.status_code == 400

    def test_health_score(self, api, seeded):
        ws_id = seeded["workspace_id"]
        rv = api.post(f"/workspaces/{ws_id}/governance/health-score", {})
        assert rv.status_code == 400

    def test_create_report(self, api, seeded):
        ws_id = seeded["workspace_id"]
        rv = api.post(
            f"/workspaces/{ws_id}/governance/reports",
            {"type": "health_check", "title": "Test"},
        )
        assert rv.status_code == 400

    def test_get_report(self, api, seeded):
        ws_id = seeded["workspace_id"]
        rv = api.get(f"/workspaces/{ws_id}/governance/reports/some-id")
        assert rv.status_code == 400
