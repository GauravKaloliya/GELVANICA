"""Tests for relation and tag API routes."""


def _create_entity(api, ws_id, etype_id, name):
    rv = api.post(
        f"/workspaces/{ws_id}/entities/",
        data={"entity_type_id": etype_id, "name": name},
    )
    assert rv.status_code == 201
    return rv.get_json()["data"]["id"]


# ── Relations ──────────────────────────────────────────────────────────────


def test_list_relations_empty(seeded, api):
    ws_id = seeded["workspace_id"]
    rv = api.get(f"/workspaces/{ws_id}/relations/")
    assert rv.status_code == 200
    body = rv.get_json()
    assert body["data"] == []
    assert body["meta"]["total"] == 0


def test_create_relation(seeded, api):
    ws_id = seeded["workspace_id"]
    eid = seeded["entity_id"]
    target = _create_entity(api, ws_id, seeded["entity_type_id"], "Target")
    rv = api.post(
        f"/workspaces/{ws_id}/relations/",
        data={"source_id": eid, "target_id": target, "type": "references"},
    )
    assert rv.status_code == 201
    d = rv.get_json()["data"]
    assert d["source_id"] == eid
    assert d["target_id"] == target
    assert d["type"] == "references"
    assert d["is_deleted"] is False


def test_create_relation_missing_fields(seeded, api):
    ws_id = seeded["workspace_id"]
    rv = api.post(f"/workspaces/{ws_id}/relations/", data={})
    assert rv.status_code == 422


def test_get_relation(seeded, api):
    ws_id = seeded["workspace_id"]
    eid = seeded["entity_id"]
    target = _create_entity(api, ws_id, seeded["entity_type_id"], "Target")
    rv = api.post(
        f"/workspaces/{ws_id}/relations/",
        data={"source_id": eid, "target_id": target, "type": "depends_on"},
    )
    rel_id = rv.get_json()["data"]["id"]
    rv = api.get(f"/workspaces/{ws_id}/relations/{rel_id}")
    assert rv.status_code == 200
    d = rv.get_json()["data"]
    assert d["id"] == rel_id
    assert d["type"] == "depends_on"


def test_get_relation_not_found(seeded, api):
    ws_id = seeded["workspace_id"]
    rv = api.get(f"/workspaces/{ws_id}/relations/nonexistent-id")
    assert rv.status_code == 404


def test_update_relation(seeded, api):
    ws_id = seeded["workspace_id"]
    eid = seeded["entity_id"]
    target = _create_entity(api, ws_id, seeded["entity_type_id"], "Target")
    rv = api.post(
        f"/workspaces/{ws_id}/relations/",
        data={"source_id": eid, "target_id": target, "type": "references"},
    )
    rel_id = rv.get_json()["data"]["id"]
    rv = api.patch(
        f"/workspaces/{ws_id}/relations/{rel_id}", data={"type": "related_to"}
    )
    assert rv.status_code == 200
    assert rv.get_json()["data"]["type"] == "related_to"


def test_delete_relation_soft_delete(seeded, api):
    ws_id = seeded["workspace_id"]
    eid = seeded["entity_id"]
    target = _create_entity(api, ws_id, seeded["entity_type_id"], "Target")
    rv = api.post(
        f"/workspaces/{ws_id}/relations/",
        data={"source_id": eid, "target_id": target, "type": "references"},
    )
    rel_id = rv.get_json()["data"]["id"]
    rv = api.delete(f"/workspaces/{ws_id}/relations/{rel_id}")
    assert rv.status_code == 200
    assert rv.get_json()["data"]["is_deleted"] is True


def test_entity_outgoing_relations(seeded, api):
    ws_id = seeded["workspace_id"]
    eid = seeded["entity_id"]
    target1 = _create_entity(api, ws_id, seeded["entity_type_id"], "T1")
    target2 = _create_entity(api, ws_id, seeded["entity_type_id"], "T2")
    api.post(
        f"/workspaces/{ws_id}/relations/",
        data={"source_id": eid, "target_id": target1, "type": "references"},
    )
    api.post(
        f"/workspaces/{ws_id}/relations/",
        data={"source_id": eid, "target_id": target2, "type": "depends_on"},
    )
    rv = api.get(f"/workspaces/{ws_id}/relations/entity/{eid}")
    assert rv.status_code == 200
    body = rv.get_json()
    assert len(body["data"]) == 2
    assert body["meta"]["total"] == 2


def test_backlinks(seeded, api):
    ws_id = seeded["workspace_id"]
    eid = seeded["entity_id"]
    source1 = _create_entity(api, ws_id, seeded["entity_type_id"], "S1")
    source2 = _create_entity(api, ws_id, seeded["entity_type_id"], "S2")
    api.post(
        f"/workspaces/{ws_id}/relations/",
        data={"source_id": source1, "target_id": eid, "type": "references"},
    )
    api.post(
        f"/workspaces/{ws_id}/relations/",
        data={"source_id": source2, "target_id": eid, "type": "mentions"},
    )
    rv = api.get(f"/workspaces/{ws_id}/relations/backlinks/{eid}")
    assert rv.status_code == 200
    body = rv.get_json()
    assert len(body["data"]) == 2


def test_restore_relation(seeded, api):
    ws_id = seeded["workspace_id"]
    eid = seeded["entity_id"]
    target = _create_entity(api, ws_id, seeded["entity_type_id"], "Target")
    rv = api.post(
        f"/workspaces/{ws_id}/relations/",
        data={"source_id": eid, "target_id": target, "type": "references"},
    )
    rel_id = rv.get_json()["data"]["id"]
    api.delete(f"/workspaces/{ws_id}/relations/{rel_id}")
    rv = api.post(f"/workspaces/{ws_id}/relations/{rel_id}/restore")
    assert rv.status_code == 200
    assert rv.get_json()["data"]["is_deleted"] is False


def test_neighbors(seeded, api):
    ws_id = seeded["workspace_id"]
    eid = seeded["entity_id"]
    target = _create_entity(api, ws_id, seeded["entity_type_id"], "Target")
    api.post(
        f"/workspaces/{ws_id}/relations/",
        data={"source_id": eid, "target_id": target, "type": "references"},
    )
    rv = api.get(f"/workspaces/{ws_id}/relations/neighbors/{eid}")
    assert rv.status_code == 200


def test_shortest_path(seeded, api):
    ws_id = seeded["workspace_id"]
    eid = seeded["entity_id"]
    mid = _create_entity(api, ws_id, seeded["entity_type_id"], "Mid")
    target = _create_entity(api, ws_id, seeded["entity_type_id"], "Target")
    api.post(
        f"/workspaces/{ws_id}/relations/",
        data={"source_id": eid, "target_id": mid, "type": "references"},
    )
    api.post(
        f"/workspaces/{ws_id}/relations/",
        data={"source_id": mid, "target_id": target, "type": "references"},
    )
    rv = api.get(
        f"/workspaces/{ws_id}/relations/path",
        query_string={"source_entity_id": eid, "target_entity_id": target},
    )
    assert rv.status_code == 200


def test_shortest_path_missing_params(seeded, api):
    ws_id = seeded["workspace_id"]
    rv = api.get(f"/workspaces/{ws_id}/relations/path")
    assert rv.status_code == 400


def test_bulk_create_relations(seeded, api):
    ws_id = seeded["workspace_id"]
    eid = seeded["entity_id"]
    t1 = _create_entity(api, ws_id, seeded["entity_type_id"], "T1")
    t2 = _create_entity(api, ws_id, seeded["entity_type_id"], "T2")
    rv = api.post(
        f"/workspaces/{ws_id}/relations/batch",
        data=[
            {"source_id": eid, "target_id": t1, "type": "references"},
            {"source_id": eid, "target_id": t2, "type": "depends_on"},
        ],
    )
    assert rv.status_code == 201
    body = rv.get_json()["data"]
    assert body["total"] == 2
    assert len(body["created"]) == 2


def test_bulk_create_empty(seeded, api):
    ws_id = seeded["workspace_id"]
    rv = api.post(f"/workspaces/{ws_id}/relations/batch", data=[])
    assert rv.status_code == 400


# ── Tags ───────────────────────────────────────────────────────────────────


def test_list_tags_empty(seeded, api):
    ws_id = seeded["workspace_id"]
    rv = api.get(f"/workspaces/{ws_id}/tags/")
    assert rv.status_code == 200
    body = rv.get_json()
    assert body["data"] == []
    assert body["meta"]["total"] == 0


def test_create_tag(seeded, api):
    ws_id = seeded["workspace_id"]
    rv = api.post(f"/workspaces/{ws_id}/tags/", data={"name": "Important"})
    assert rv.status_code == 201
    d = rv.get_json()["data"]
    assert d["name"] == "Important"
    assert d["is_deleted"] is False


def test_create_tag_duplicate(seeded, api):
    ws_id = seeded["workspace_id"]
    api.post(f"/workspaces/{ws_id}/tags/", data={"name": "Unique"})
    rv = api.post(f"/workspaces/{ws_id}/tags/", data={"name": "Unique"})
    assert rv.status_code == 409


def test_create_tag_missing_name(seeded, api):
    ws_id = seeded["workspace_id"]
    rv = api.post(f"/workspaces/{ws_id}/tags/", data={})
    assert rv.status_code == 422


def test_get_tag(seeded, api):
    ws_id = seeded["workspace_id"]
    rv = api.post(f"/workspaces/{ws_id}/tags/", data={"name": "MyTag"})
    tag_id = rv.get_json()["data"]["id"]
    rv = api.get(f"/workspaces/{ws_id}/tags/{tag_id}")
    assert rv.status_code == 200
    assert rv.get_json()["data"]["name"] == "MyTag"


def test_get_tag_not_found(seeded, api):
    ws_id = seeded["workspace_id"]
    rv = api.get(f"/workspaces/{ws_id}/tags/nonexistent-id")
    assert rv.status_code == 404


def test_update_tag(seeded, api):
    ws_id = seeded["workspace_id"]
    rv = api.post(f"/workspaces/{ws_id}/tags/", data={"name": "Old"})
    tag_id = rv.get_json()["data"]["id"]
    rv = api.patch(
        f"/workspaces/{ws_id}/tags/{tag_id}", data={"name": "Renamed", "color": "#ff0"}
    )
    assert rv.status_code == 200
    d = rv.get_json()["data"]
    assert d["name"] == "Renamed"
    assert d["color"] == "#ff0"


def test_delete_tag_soft_delete(seeded, api):
    ws_id = seeded["workspace_id"]
    rv = api.post(f"/workspaces/{ws_id}/tags/", data={"name": "DeleteMe"})
    tag_id = rv.get_json()["data"]["id"]
    rv = api.delete(f"/workspaces/{ws_id}/tags/{tag_id}")
    assert rv.status_code == 200
    assert rv.get_json()["data"]["is_deleted"] is True


def test_restore_tag(seeded, api):
    ws_id = seeded["workspace_id"]
    rv = api.post(f"/workspaces/{ws_id}/tags/", data={"name": "RestoreMe"})
    tag_id = rv.get_json()["data"]["id"]
    api.delete(f"/workspaces/{ws_id}/tags/{tag_id}")
    rv = api.post(f"/workspaces/{ws_id}/tags/{tag_id}/restore")
    assert rv.status_code == 200
    assert rv.get_json()["data"]["is_deleted"] is False


def test_tag_entity(seeded, api):
    ws_id = seeded["workspace_id"]
    eid = seeded["entity_id"]
    rv = api.post(f"/workspaces/{ws_id}/tags/", data={"name": "Critical"})
    tag_id = rv.get_json()["data"]["id"]
    rv = api.post(f"/workspaces/{ws_id}/tags/{tag_id}/entities/{eid}")
    assert rv.status_code == 201
    d = rv.get_json()["data"]
    assert d["entity_id"] == eid
    assert d["tag_id"] == tag_id


def test_tag_entity_twice_idempotent(seeded, api):
    ws_id = seeded["workspace_id"]
    eid = seeded["entity_id"]
    rv = api.post(f"/workspaces/{ws_id}/tags/", data={"name": "DupTag"})
    tag_id = rv.get_json()["data"]["id"]
    api.post(f"/workspaces/{ws_id}/tags/{tag_id}/entities/{eid}")
    rv = api.post(f"/workspaces/{ws_id}/tags/{tag_id}/entities/{eid}")
    assert rv.status_code == 201


def test_untag_entity(seeded, api):
    ws_id = seeded["workspace_id"]
    eid = seeded["entity_id"]
    rv = api.post(f"/workspaces/{ws_id}/tags/", data={"name": "RemoveMe"})
    tag_id = rv.get_json()["data"]["id"]
    api.post(f"/workspaces/{ws_id}/tags/{tag_id}/entities/{eid}")
    rv = api.delete(f"/workspaces/{ws_id}/tags/{tag_id}/entities/{eid}")
    assert rv.status_code == 200
    assert rv.get_json()["data"]["untagged"] is True


def test_untag_entity_no_association(seeded, api):
    ws_id = seeded["workspace_id"]
    eid = seeded["entity_id"]
    rv = api.post(f"/workspaces/{ws_id}/tags/", data={"name": "NeverTagged"})
    tag_id = rv.get_json()["data"]["id"]
    rv = api.delete(f"/workspaces/{ws_id}/tags/{tag_id}/entities/{eid}")
    assert rv.status_code == 200
    assert rv.get_json()["data"]["untagged"] is True
