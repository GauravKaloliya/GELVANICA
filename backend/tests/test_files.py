"""Tests for file management endpoints."""

import io
import uuid


FILE_META = {
    "file_name": "test.txt",
    "mime_type": "text/plain",
    "file_size": 100,
    "object_key": "test-key",
}


def _upload_file(api, ws_id):
    """Upload a file via multipart and return its id."""
    data = {"file": (io.BytesIO(b"test content"), "test.txt")}
    rv = api.client.post(
        f"/api/v1/workspaces/{ws_id}/files/upload",
        data=data,
        content_type="multipart/form-data",
        headers={"Authorization": api._headers()["Authorization"]},
    )
    return rv.get_json()["data"]["id"]


def _create_file_meta(api, ws_id):
    """Create file metadata and return its id."""
    rv = api.post(f"/workspaces/{ws_id}/files", data=FILE_META)
    return rv.get_json()["data"]["id"]


class TestFileRoutes:
    """Tests for all file management endpoints."""

    # ------------------------------------------------------------------ #
    #  Local-mode (non-cloud) endpoints
    # ------------------------------------------------------------------ #

    def test_list_files(self, seeded, api):
        ws_id = seeded["workspace_id"]
        _create_file_meta(api, ws_id)

        rv = api.get(f"/workspaces/{ws_id}/files")

        assert rv.status_code == 200
        body = rv.get_json()
        assert "data" in body
        assert "meta" in body
        assert len(body["data"]) >= 1

    def test_create_file_metadata(self, seeded, api):
        ws_id = seeded["workspace_id"]

        rv = api.post(f"/workspaces/{ws_id}/files", data=FILE_META)

        assert rv.status_code == 201
        body = rv.get_json()
        assert body["data"]["file_name"] == "test.txt"
        assert "id" in body["data"]

    def test_get_file(self, seeded, api):
        ws_id = seeded["workspace_id"]
        file_id = _create_file_meta(api, ws_id)

        rv = api.get(f"/workspaces/{ws_id}/files/{file_id}")

        assert rv.status_code == 200
        body = rv.get_json()
        assert body["data"]["id"] == file_id
        assert body["data"]["file_name"] == "test.txt"

    def test_get_file_404(self, seeded, api):
        ws_id = seeded["workspace_id"]

        rv = api.get(f"/workspaces/{ws_id}/files/{uuid.uuid4()}")

        assert rv.status_code == 404
        assert "error" in rv.get_json()

    def test_upload_file(self, seeded, api):
        ws_id = seeded["workspace_id"]
        data = {"file": (io.BytesIO(b"test content"), "test.txt")}

        rv = api.client.post(
            f"/api/v1/workspaces/{ws_id}/files/upload",
            data=data,
            content_type="multipart/form-data",
            headers={"Authorization": api._headers()["Authorization"]},
        )

        assert rv.status_code in (200, 201)
        body = rv.get_json()
        assert body["data"]["file_name"] == "test.txt"
        assert "id" in body["data"]

    def test_download_file(self, seeded, api):
        ws_id = seeded["workspace_id"]
        file_id = _upload_file(api, ws_id)

        rv = api.get(f"/workspaces/{ws_id}/files/{file_id}/download")

        assert rv.status_code == 200

    def test_download_file_404(self, seeded, api):
        ws_id = seeded["workspace_id"]

        rv = api.get(f"/workspaces/{ws_id}/files/{uuid.uuid4()}/download")

        assert rv.status_code == 404

    def test_thumbnail(self, seeded, api):
        ws_id = seeded["workspace_id"]
        file_id = _upload_file(api, ws_id)

        rv = api.get(f"/workspaces/{ws_id}/files/{file_id}/thumbnail")

        assert rv.status_code in (200, 404)

    def test_preview(self, seeded, api):
        ws_id = seeded["workspace_id"]
        file_id = _upload_file(api, ws_id)

        rv = api.get(f"/workspaces/{ws_id}/files/{file_id}/preview")

        assert rv.status_code in (200, 404)

    def test_optimized(self, seeded, api):
        ws_id = seeded["workspace_id"]
        file_id = _upload_file(api, ws_id)

        rv = api.get(f"/workspaces/{ws_id}/files/{file_id}/optimized")

        assert rv.status_code in (200, 404)

    def test_delete_file(self, seeded, api):
        ws_id = seeded["workspace_id"]
        file_id = _create_file_meta(api, ws_id)

        rv = api.delete(f"/workspaces/{ws_id}/files/{file_id}")

        assert rv.status_code == 200
        assert rv.get_json()["data"]["is_deleted"] is True

    def test_link_entity(self, seeded, api):
        ws_id = seeded["workspace_id"]
        entity_id = seeded["entity_id"]
        file_id = _create_file_meta(api, ws_id)

        rv = api.post(
            f"/workspaces/{ws_id}/files/{file_id}/entities/{entity_id}",
            data={},
        )

        assert rv.status_code == 201
        assert "data" in rv.get_json()

    def test_unlink_entity(self, seeded, api):
        ws_id = seeded["workspace_id"]
        entity_id = seeded["entity_id"]
        file_id = _create_file_meta(api, ws_id)
        api.post(
            f"/workspaces/{ws_id}/files/{file_id}/entities/{entity_id}",
            data={},
        )

        rv = api.delete(
            f"/workspaces/{ws_id}/files/{file_id}/entities/{entity_id}",
        )

        assert rv.status_code == 200
        assert rv.get_json()["data"]["unlinked"] is True

    def test_list_variants(self, seeded, api):
        ws_id = seeded["workspace_id"]
        file_id = _create_file_meta(api, ws_id)

        rv = api.get(f"/workspaces/{ws_id}/files/{file_id}/variants")

        assert rv.status_code == 200
        body = rv.get_json()
        assert "data" in body
        assert isinstance(body["data"], list)

    def test_get_variant_404(self, seeded, api):
        ws_id = seeded["workspace_id"]
        file_id = _create_file_meta(api, ws_id)

        rv = api.get(
            f"/workspaces/{ws_id}/files/{file_id}/variants/thumbnail",
        )

        assert rv.status_code == 404

    def test_cleanup_orphans(self, seeded, api):
        ws_id = seeded["workspace_id"]

        rv = api.post(f"/workspaces/{ws_id}/files/cleanup-orphans")

        assert rv.status_code == 200
        assert "deleted" in rv.get_json()["data"]

    def test_storage_info(self, seeded, api):
        ws_id = seeded["workspace_id"]

        rv = api.get(f"/workspaces/{ws_id}/files/storage-info")

        assert rv.status_code == 200
        body = rv.get_json()
        assert "used_bytes" in body["data"]
        assert "file_count" in body["data"]

    def test_upload_and_verify_content(self, seeded, api):
        ws_id = seeded["workspace_id"]
        payload = b"Hello World Content Verify"
        data = {"file": (io.BytesIO(payload), "content_check.txt")}
        rv = api.client.post(
            f"/api/v1/workspaces/{ws_id}/files/upload",
            data=data,
            content_type="multipart/form-data",
            headers={"Authorization": api._headers()["Authorization"]},
        )
        result = rv.get_json()
        file_id = result["data"]["id"]

        rv = api.get(f"/workspaces/{ws_id}/files/{file_id}/download")
        assert rv.status_code == 200
        assert rv.data == payload

    def test_upload_and_verify_binary(self, seeded, api):
        ws_id = seeded["workspace_id"]
        payload = b"\x00\x01\x02\x03\xFE\xFF"
        data = {"file": (io.BytesIO(payload), "binary_data.txt")}
        rv = api.client.post(
            f"/api/v1/workspaces/{ws_id}/files/upload",
            data=data,
            content_type="multipart/form-data",
            headers={"Authorization": api._headers()["Authorization"]},
        )
        assert rv.status_code in (200, 201), rv.data
        result = rv.get_json()
        file_id = result["data"]["id"]

        rv = api.get(f"/workspaces/{ws_id}/files/{file_id}/download")
        assert rv.status_code == 200
        assert rv.data == payload

    def test_upload_and_download_multiple_times(self, seeded, api):
        ws_id = seeded["workspace_id"]
        payload = b"Content that should be stable across downloads"
        data = {"file": (io.BytesIO(payload), "stable.txt")}
        rv = api.client.post(
            f"/api/v1/workspaces/{ws_id}/files/upload",
            data=data,
            content_type="multipart/form-data",
            headers={"Authorization": api._headers()["Authorization"]},
        )
        file_id = rv.get_json()["data"]["id"]

        rv1 = api.get(f"/workspaces/{ws_id}/files/{file_id}/download")
        rv2 = api.get(f"/workspaces/{ws_id}/files/{file_id}/download")

        assert rv1.status_code == 200
        assert rv2.status_code == 200
        assert rv1.data == rv2.data

    def test_upload_updates_file_size(self, seeded, api):
        ws_id = seeded["workspace_id"]
        payload = b"1234567890"
        data = {"file": (io.BytesIO(payload), "small.txt")}
        rv = api.client.post(
            f"/api/v1/workspaces/{ws_id}/files/upload",
            data=data,
            content_type="multipart/form-data",
            headers={"Authorization": api._headers()["Authorization"]},
        )
        result = rv.get_json()
        file_id = result["data"]["id"]

        rv = api.get(f"/workspaces/{ws_id}/files/{file_id}")
        assert rv.status_code == 200
        assert rv.get_json()["data"]["file_size"] == len(payload)

    def test_file_metadata_update(self, seeded, api):
        ws_id = seeded["workspace_id"]
        file_id = _create_file_meta(api, ws_id)

        rv = api.post(f"/workspaces/{ws_id}/files/{file_id}/update", data={"file_name": "renamed.txt"})
        assert rv.status_code in (200, 404), rv.get_json()

    def test_list_files_pagination(self, seeded, api):
        ws_id = seeded["workspace_id"]
        for i in range(3):
            payload = {"file_name": f"test{i}.txt", "mime_type": "text/plain", "file_size": 100 + i, "object_key": f"key-{i}", "content_hash": f"hash-{i}"}
            rv = api.post(f"/workspaces/{ws_id}/files", data=payload)
            assert rv.status_code in (200, 201), rv.get_json()

        rv = api.get(f"/workspaces/{ws_id}/files?per_page=2")
        assert rv.status_code == 200
        body = rv.get_json()
        assert len(body["data"]) == 2
        assert "meta" in body
        assert body["meta"]["page"] == 1

        rv2 = api.get(f"/workspaces/{ws_id}/files?page=2&per_page=2")
        assert rv2.status_code == 200
        assert len(rv2.get_json()["data"]) >= 1

    # ------------------------------------------------------------------ #
    #  Cloud-only endpoints  (return 404 in local mode)
    # ------------------------------------------------------------------ #

    def test_presign(self, seeded, api):
        ws_id = seeded["workspace_id"]
        rv = api.post(f"/workspaces/{ws_id}/files/presign", data={})
        assert rv.status_code == 404

    def test_presign_multipart(self, seeded, api):
        ws_id = seeded["workspace_id"]
        rv = api.post(f"/workspaces/{ws_id}/files/presign-multipart", data={})
        assert rv.status_code == 404

    def test_presign_multipart_complete(self, seeded, api):
        ws_id = seeded["workspace_id"]
        rv = api.post(
            f"/workspaces/{ws_id}/files/presign-multipart/complete",
            data={},
        )
        assert rv.status_code == 404

    def test_confirm_upload(self, seeded, api):
        ws_id = seeded["workspace_id"]
        rv = api.post(f"/workspaces/{ws_id}/files/{uuid.uuid4()}/confirm")
        assert rv.status_code == 404

    def test_resolve_quarantine(self, seeded, api):
        ws_id = seeded["workspace_id"]
        rv = api.post(
            f"/workspaces/{ws_id}/files/quarantine/{uuid.uuid4()}/resolve",
            data={"approve": True},
        )
        assert rv.status_code == 404

    def test_cleanup_quarantine(self, seeded, api):
        ws_id = seeded["workspace_id"]
        rv = api.post(f"/workspaces/{ws_id}/files/cleanup-quarantine")
        assert rv.status_code == 404

    def test_cleanup_deleted(self, seeded, api):
        ws_id = seeded["workspace_id"]
        rv = api.post(f"/workspaces/{ws_id}/files/cleanup-deleted")
        assert rv.status_code == 404
