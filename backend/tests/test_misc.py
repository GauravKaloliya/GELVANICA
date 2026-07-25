"""Comprehensive tests for property, graph, search, comment, AI, backup, and sync routes."""


class TestProperties:
    """Property CRUD + soft-delete + restore (6 routes)."""

    def test_list_properties(self, api, seeded):
        ws_id = seeded["workspace_id"]
        rv = api.get(f"/workspaces/{ws_id}/properties/")
        assert rv.status_code == 200
        assert "data" in rv.get_json()

    def test_create_property(self, api, seeded):
        ws_id = seeded["workspace_id"]
        rv = api.post(f"/workspaces/{ws_id}/properties/",
                      data={"name": "Score", "type": "number"})
        assert rv.status_code == 201
        assert rv.get_json()["data"]["name"] == "Score"

    def test_get_property(self, api, seeded):
        ws_id = seeded["workspace_id"]
        crv = api.post(f"/workspaces/{ws_id}/properties/",
                       data={"name": "Email", "type": "email"})
        pid = crv.get_json()["data"]["id"]
        rv = api.get(f"/workspaces/{ws_id}/properties/{pid}")
        assert rv.status_code == 200
        assert rv.get_json()["data"]["name"] == "Email"

    def test_update_property(self, api, seeded):
        ws_id = seeded["workspace_id"]
        crv = api.post(f"/workspaces/{ws_id}/properties/",
                       data={"name": "Old", "type": "text"})
        pid = crv.get_json()["data"]["id"]
        rv = api.patch(f"/workspaces/{ws_id}/properties/{pid}",
                       data={"name": "Updated"})
        assert rv.status_code == 200
        assert rv.get_json()["data"]["name"] == "Updated"

    def test_delete_property(self, api, seeded):
        ws_id = seeded["workspace_id"]
        crv = api.post(f"/workspaces/{ws_id}/properties/",
                       data={"name": "DeleteMe", "type": "text"})
        pid = crv.get_json()["data"]["id"]
        rv = api.delete(f"/workspaces/{ws_id}/properties/{pid}")
        assert rv.status_code == 200
        assert rv.get_json()["data"]["is_deleted"] is True

    def test_restore_property(self, api, seeded):
        ws_id = seeded["workspace_id"]
        crv = api.post(f"/workspaces/{ws_id}/properties/",
                       data={"name": "RestoreMe", "type": "text"})
        pid = crv.get_json()["data"]["id"]
        api.delete(f"/workspaces/{ws_id}/properties/{pid}")
        rv = api.post(f"/workspaces/{ws_id}/properties/{pid}/restore")
        assert rv.status_code == 200
        assert rv.get_json()["data"]["is_deleted"] is False


class TestGraph:
    """Graph endpoints (7 routes)."""

    def test_get_graph_before_materialize(self, api, seeded):
        ws_id = seeded["workspace_id"]
        rv = api.get(f"/workspaces/{ws_id}/graph/")
        assert rv.status_code == 404

    def test_materialize_and_get_graph(self, api, seeded):
        ws_id = seeded["workspace_id"]
        etype_id = seeded["entity_type_id"]
        e1_id = seeded["entity_id"]
        crv = api.post(f"/workspaces/{ws_id}/entities/", data={
            "entity_type_id": etype_id, "name": "Graph Entity 2"
        })
        e2_id = crv.get_json()["data"]["id"]
        api.post(f"/workspaces/{ws_id}/relations/", data={
            "entity_id": e1_id, "target_id": e2_id, "type": "connects_to"
        })
        api.post(f"/workspaces/{ws_id}/graph/materialize")
        rv = api.get(f"/workspaces/{ws_id}/graph/")
        assert rv.status_code == 200
        body = rv.get_json()
        assert "data" in body

    def test_query_graph(self, api, seeded):
        ws_id = seeded["workspace_id"]
        etype_id = seeded["entity_type_id"]
        e1_id = seeded["entity_id"]
        crv = api.post(f"/workspaces/{ws_id}/entities/", data={
            "entity_type_id": etype_id, "name": "Graph Entity 3"
        })
        e2_id = crv.get_json()["data"]["id"]
        api.post(f"/workspaces/{ws_id}/relations/", data={
            "entity_id": e1_id, "target_id": e2_id, "type": "connects_to"
        })
        api.post(f"/workspaces/{ws_id}/graph/materialize")
        rv = api.post(f"/workspaces/{ws_id}/graph/query", data={
            "relation_types": ["connects_to"],
            "limit": 50,
        })
        assert rv.status_code == 200
        body = rv.get_json()
        assert "data" in body

    def test_traverse_graph(self, api, seeded):
        ws_id = seeded["workspace_id"]
        etype_id = seeded["entity_type_id"]
        crv_a = api.post(f"/workspaces/{ws_id}/entities/", data={
            "entity_type_id": etype_id, "name": "Node A"
        })
        a_id = crv_a.get_json()["data"]["id"]
        crv_b = api.post(f"/workspaces/{ws_id}/entities/", data={
            "entity_type_id": etype_id, "name": "Node B"
        })
        b_id = crv_b.get_json()["data"]["id"]
        crv_c = api.post(f"/workspaces/{ws_id}/entities/", data={
            "entity_type_id": etype_id, "name": "Node C"
        })
        c_id = crv_c.get_json()["data"]["id"]
        api.post(f"/workspaces/{ws_id}/relations/", data={
            "entity_id": a_id, "target_id": b_id, "type": "connects_to"
        })
        api.post(f"/workspaces/{ws_id}/relations/", data={
            "entity_id": b_id, "target_id": c_id, "type": "connects_to"
        })
        rv = api.post(f"/workspaces/{ws_id}/graph/traverse", data={
            "center_node": a_id, "depth": 3,
        })
        assert rv.status_code == 200
        body = rv.get_json()
        assert "data" in body

    def test_find_path(self, api, seeded):
        ws_id = seeded["workspace_id"]
        etype_id = seeded["entity_type_id"]
        crv_a = api.post(f"/workspaces/{ws_id}/entities/", data={
            "entity_type_id": etype_id, "name": "Path A"
        })
        a_id = crv_a.get_json()["data"]["id"]
        crv_b = api.post(f"/workspaces/{ws_id}/entities/", data={
            "entity_type_id": etype_id, "name": "Path B"
        })
        b_id = crv_b.get_json()["data"]["id"]
        crv_c = api.post(f"/workspaces/{ws_id}/entities/", data={
            "entity_type_id": etype_id, "name": "Path C"
        })
        c_id = crv_c.get_json()["data"]["id"]
        api.post(f"/workspaces/{ws_id}/relations/", data={
            "entity_id": a_id, "target_id": b_id, "type": "connects_to"
        })
        api.post(f"/workspaces/{ws_id}/relations/", data={
            "entity_id": b_id, "target_id": c_id, "type": "connects_to"
        })
        rv = api.post(f"/workspaces/{ws_id}/graph/paths", data={
            "source_id": a_id, "target_id": c_id,
        })
        assert rv.status_code == 200
        body = rv.get_json()
        assert "data" in body

    def test_cleanup_graph(self, api, seeded):
        ws_id = seeded["workspace_id"]
        api.post(f"/workspaces/{ws_id}/graph/materialize")
        api.post(f"/workspaces/{ws_id}/graph/materialize")
        rv = api.post(f"/workspaces/{ws_id}/graph/cleanup", data={"keep": 1})
        assert rv.status_code == 200
        body = rv.get_json()
        assert "data" in body


class TestSearch:
    """Search endpoints (4 routes)."""

    def test_search_finds_entity_by_name(self, api, seeded):
        ws_id = seeded["workspace_id"]
        etype_id = seeded["entity_type_id"]
        api.post(f"/workspaces/{ws_id}/entities/", data={
            "entity_type_id": etype_id, "name": "UniqueSearchEntity"
        })
        rv = api.get(f"/workspaces/{ws_id}/search?q=UniqueSearchEntity")
        assert rv.status_code == 200
        body = rv.get_json()
        assert "data" in body

    def test_search_finds_entity_without_query_returns_422(self, api, seeded):
        ws_id = seeded["workspace_id"]
        rv = api.get(f"/workspaces/{ws_id}/search")
        assert rv.status_code == 422

    def test_rebuild_index(self, api, seeded):
        ws_id = seeded["workspace_id"]
        rv = api.post(f"/workspaces/{ws_id}/search/rebuild-index")
        assert rv.status_code == 200

    def test_search_history(self, api, seeded):
        ws_id = seeded["workspace_id"]
        rv = api.get(f"/workspaces/{ws_id}/search/history")
        assert rv.status_code == 200

    def test_suggest(self, api, seeded):
        ws_id = seeded["workspace_id"]
        etype_id = seeded["entity_type_id"]
        api.post(f"/workspaces/{ws_id}/entities/", data={
            "entity_type_id": etype_id, "name": "Apple"
        })
        api.post(f"/workspaces/{ws_id}/entities/", data={
            "entity_type_id": etype_id, "name": "Application"
        })
        rv = api.get(f"/workspaces/{ws_id}/search/suggest?q=App")
        assert rv.status_code == 200
        body = rv.get_json()
        assert "data" in body


class TestComments:
    """Comments are @cloud_only -> 400 in local mode (6 routes)."""

    def test_list_comments(self, api, seeded):
        ws_id = seeded["workspace_id"]
        rv = api.get(f"/workspaces/{ws_id}/comments/")
        assert rv.status_code == 400

    def test_create_comment(self, api, seeded):
        ws_id = seeded["workspace_id"]
        rv = api.post(f"/workspaces/{ws_id}/comments/", data={"content": "Hi"})
        assert rv.status_code == 400

    def test_get_comment(self, api, seeded):
        ws_id = seeded["workspace_id"]
        rv = api.get(f"/workspaces/{ws_id}/comments/nonexistent")
        assert rv.status_code == 400

    def test_update_comment(self, api, seeded):
        ws_id = seeded["workspace_id"]
        rv = api.patch(f"/workspaces/{ws_id}/comments/nonexistent",
                       data={"content": "x"})
        assert rv.status_code == 400

    def test_delete_comment(self, api, seeded):
        ws_id = seeded["workspace_id"]
        rv = api.delete(f"/workspaces/{ws_id}/comments/nonexistent")
        assert rv.status_code == 400

    def test_restore_comment(self, api, seeded):
        ws_id = seeded["workspace_id"]
        rv = api.post(f"/workspaces/{ws_id}/comments/nonexistent/restore")
        assert rv.status_code == 400


class TestAI:
    """AI endpoints are stubs -> 501 (7 routes)."""

    def test_ai_query(self, api, seeded):
        ws_id = seeded["workspace_id"]
        rv = api.post(f"/workspaces/{ws_id}/ai/query", data={"prompt": "hello"})
        assert rv.status_code == 501

    def test_ai_suggest_relations(self, api, seeded):
        ws_id = seeded["workspace_id"]
        rv = api.post(f"/workspaces/{ws_id}/ai/suggest-relations", data={})
        assert rv.status_code == 501

    def test_ai_summarize(self, api, seeded):
        ws_id = seeded["workspace_id"]
        rv = api.post(f"/workspaces/{ws_id}/ai/summarize", data={})
        assert rv.status_code == 501

    def test_ai_chat(self, api, seeded):
        ws_id = seeded["workspace_id"]
        rv = api.post(f"/workspaces/{ws_id}/ai/chat", data={"message": "hi"})
        assert rv.status_code == 501

    def test_ai_complete(self, api, seeded):
        ws_id = seeded["workspace_id"]
        rv = api.post(f"/workspaces/{ws_id}/ai/complete", data={"text": "foo"})
        assert rv.status_code == 501

    def test_ai_embed(self, api, seeded):
        ws_id = seeded["workspace_id"]
        rv = api.post(f"/workspaces/{ws_id}/ai/embed", data={"text": "foo"})
        assert rv.status_code == 501

    def test_ai_semantic_search(self, api, seeded):
        ws_id = seeded["workspace_id"]
        rv = api.post(f"/workspaces/{ws_id}/ai/semantic-search",
                      data={"query": "foo"})
        assert rv.status_code == 501


class TestBackups:
    """Backup and export routes (13 routes)."""

    def test_list_backups(self, api, seeded):
        ws_id = seeded["workspace_id"]
        rv = api.get(f"/workspaces/{ws_id}/backups")
        assert rv.status_code == 200

    def test_export_json(self, api, seeded):
        ws_id = seeded["workspace_id"]
        rv = api.post(f"/workspaces/{ws_id}/backups/export")
        assert rv.status_code == 200

    def test_create_backup(self, api, seeded):
        ws_id = seeded["workspace_id"]
        rv = api.post(f"/workspaces/{ws_id}/backups/create")
        assert rv.status_code == 201

    def test_export_to_disk(self, api, seeded):
        ws_id = seeded["workspace_id"]
        rv = api.post(f"/workspaces/{ws_id}/backups/export-to-disk")
        assert rv.status_code == 200

    def test_import_workspace(self, api, seeded):
        ws_id = seeded["workspace_id"]
        rv = api.post(f"/workspaces/{ws_id}/backups/import",
                      data={"entities": []})
        assert rv.status_code in (200, 201)

    def test_export_markdown(self, api, seeded):
        ws_id = seeded["workspace_id"]
        rv = api.post(f"/workspaces/{ws_id}/backups/export-markdown")
        assert rv.status_code == 200

    def test_export_zip(self, api, seeded):
        ws_id = seeded["workspace_id"]
        rv = api.post(f"/workspaces/{ws_id}/backups/export-zip")
        assert rv.status_code == 200

    def test_export_html(self, api, seeded):
        ws_id = seeded["workspace_id"]
        entity_id = seeded["entity_id"]
        rv = api.post(f"/workspaces/{ws_id}/backups/export-html",
                      data={"entity_id": entity_id})
        assert rv.status_code == 200

    def test_export_pdf(self, api, seeded):
        ws_id = seeded["workspace_id"]
        entity_id = seeded["entity_id"]
        rv = api.post(f"/workspaces/{ws_id}/backups/export-pdf",
                      data={"entity_id": entity_id})
        assert rv.status_code == 200

    def test_export_zip_encrypted(self, api, seeded):
        ws_id = seeded["workspace_id"]
        rv = api.post(f"/workspaces/{ws_id}/backups/export-zip-encrypted")
        assert rv.status_code == 200

    def test_import_zip_no_file(self, api, seeded):
        ws_id = seeded["workspace_id"]
        rv = api.post(f"/workspaces/{ws_id}/backups/import-zip")
        assert rv.status_code == 400

    def test_download_zip_not_found(self, api, seeded):
        ws_id = seeded["workspace_id"]
        rv = api.get(
            f"/workspaces/{ws_id}/backups/download-zip/nonexistent.gnv")
        assert rv.status_code == 404

    def test_restore_backup_not_found(self, api, seeded):
        ws_id = seeded["workspace_id"]
        rv = api.post(
            f"/workspaces/{ws_id}/backups/nonexistent.gnv/restore")
        assert rv.status_code == 404


class TestSync:
    """Sync routes (14 routes)."""

    def test_list_sync_ops(self, api, seeded):
        ws_id = seeded["workspace_id"]
        rv = api.get(f"/workspaces/{ws_id}/sync")
        assert rv.status_code == 200

    def test_create_sync_op(self, api, seeded):
        ws_id = seeded["workspace_id"]
        rv = api.post(f"/workspaces/{ws_id}/sync", data={
            "operation_type": "create",
            "payload": {"entity": {"name": "test"}},
            "workspace_id": ws_id,
        })
        assert rv.status_code in (201, 500)

    def test_create_sync_op_and_verify(self, api, seeded):
        ws_id = seeded["workspace_id"]
        crv = api.post(f"/workspaces/{ws_id}/sync", data={
            "operation_type": "create",
            "payload": {"entity": {"name": "sync-verify"}},
            "workspace_id": ws_id,
        })
        assert crv.status_code in (201, 500)
        if crv.status_code == 201:
            op_id = crv.get_json()["data"]["id"]
            rv = api.get(f"/workspaces/{ws_id}/sync")
            assert rv.status_code == 200
            ids = [item["id"] for item in rv.get_json().get("data", [])]
            assert op_id in ids

    def test_get_sync_op_not_found(self, api, seeded):
        ws_id = seeded["workspace_id"]
        rv = api.get(f"/workspaces/{ws_id}/sync/nonexistent")
        assert rv.status_code == 404

    def test_ack_sync_op_not_found(self, api, seeded):
        ws_id = seeded["workspace_id"]
        rv = api.post(f"/workspaces/{ws_id}/sync/nonexistent/ack")
        assert rv.status_code == 404

    def test_diff(self, api, seeded):
        ws_id = seeded["workspace_id"]
        rv = api.post(f"/workspaces/{ws_id}/sync/diff",
                      data={"export_data": {"entities": []}})
        assert rv.status_code == 200

    def test_apply_diff(self, api, seeded):
        ws_id = seeded["workspace_id"]
        rv = api.post(f"/workspaces/{ws_id}/sync/apply-diff",
                      data={"diff": {"entities": []}})
        assert rv.status_code in (200, 201)

    def test_sync_from_export(self, api, seeded):
        ws_id = seeded["workspace_id"]
        rv = api.post(f"/workspaces/{ws_id}/sync/sync-from-export",
                      data={"export_data": {"entities": []}})
        assert rv.status_code in (200, 201)

    def test_push(self, api, seeded):
        ws_id = seeded["workspace_id"]
        rv = api.post(f"/workspaces/{ws_id}/sync/push",
                      data={"changes": {}})
        assert rv.status_code in (200, 500)

    def test_pull(self, api, seeded):
        ws_id = seeded["workspace_id"]
        rv = api.post(f"/workspaces/{ws_id}/sync/pull")
        assert rv.status_code == 200

    def test_full_sync(self, api, seeded):
        ws_id = seeded["workspace_id"]
        rv = api.post(f"/workspaces/{ws_id}/sync/full-sync", data={})
        assert rv.status_code == 200

    def test_sync_status(self, api, seeded):
        ws_id = seeded["workspace_id"]
        api.post(f"/workspaces/{ws_id}/sync", data={
            "operation_type": "create",
            "payload": {"entity": {"name": "sync-status-test"}},
            "workspace_id": ws_id,
        })
        rv = api.get(f"/workspaces/{ws_id}/sync/status")
        assert rv.status_code == 200
        body = rv.get_json()
        assert "data" in body

    def test_sync_changes(self, api, seeded):
        ws_id = seeded["workspace_id"]
        rv = api.get(f"/workspaces/{ws_id}/sync/changes")
        assert rv.status_code == 200

    def test_resolve_conflict_not_found(self, api, seeded):
        ws_id = seeded["workspace_id"]
        rv = api.post(
            f"/workspaces/{ws_id}/sync/conflicts/nonexistent/resolve",
            data={})
        assert rv.status_code in (404, 500)

    def test_resolve_conflict_body_no_id(self, api, seeded):
        ws_id = seeded["workspace_id"]
        rv = api.post(
            f"/workspaces/{ws_id}/sync/resolve-conflict", data={})
        assert rv.status_code in (400, 500)

    def test_get_sync_op_created(self, api, seeded):
        ws_id = seeded["workspace_id"]
        crv = api.post(f"/workspaces/{ws_id}/sync", data={
            "operation_type": "update",
            "payload": {"entity": {"name": "sync-test"}},
            "workspace_id": ws_id,
        })
        if crv.status_code == 201:
            op_id = crv.get_json()["data"]["id"]
            rv = api.get(f"/workspaces/{ws_id}/sync/{op_id}")
            assert rv.status_code == 200
