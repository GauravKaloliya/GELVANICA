"""Tests for all job routes: list, get, create, mark running/completed/fail/cancel."""

import uuid


def _create_job(api, ws_id):
    rv = api.post(f"/workspaces/{ws_id}/jobs", data={
        "type": "export",
        "payload": {"format": "csv"},
    })
    assert rv.status_code == 201, f"create job failed: {rv.get_json()}"
    return rv.get_json()["data"]["id"]


class TestListJobs:
    def test_list_jobs(self, api, auth_headers, seeded):
        ws_id = seeded["workspace_id"]
        _create_job(api, ws_id)
        rv = api.get(f"/workspaces/{ws_id}/jobs")
        assert rv.status_code == 200
        body = rv.get_json()
        assert "data" in body
        assert "meta" in body
        assert body["meta"]["total"] >= 1
        assert "id" in body["data"][0]

    def test_list_jobs_empty(self, api, auth_headers, seeded):
        ws_id = seeded["workspace_id"]
        rv = api.get(f"/workspaces/{ws_id}/jobs")
        assert rv.status_code == 200
        body = rv.get_json()
        assert body["meta"]["total"] == 0
        assert body["data"] == []

    def test_list_jobs_filter_status(self, api, auth_headers, seeded):
        ws_id = seeded["workspace_id"]
        _create_job(api, ws_id)
        rv = api.get(f"/workspaces/{ws_id}/jobs?status=pending")
        assert rv.status_code == 200
        assert rv.get_json()["meta"]["total"] >= 1

    def test_list_jobs_filter_type(self, api, auth_headers, seeded):
        ws_id = seeded["workspace_id"]
        _create_job(api, ws_id)
        rv = api.get(f"/workspaces/{ws_id}/jobs?type=export")
        assert rv.status_code == 200
        assert rv.get_json()["meta"]["total"] >= 1

    def test_list_jobs_pagination(self, api, auth_headers, seeded):
        ws_id = seeded["workspace_id"]
        rv = api.get(f"/workspaces/{ws_id}/jobs?page=1&per_page=5")
        assert rv.status_code == 200
        body = rv.get_json()
        assert body["meta"]["page"] == 1
        assert body["meta"]["per_page"] == 5

    def test_unauthenticated(self, client, seeded):
        rv = client.get(f"/api/v1/workspaces/{seeded['workspace_id']}/jobs")
        assert rv.status_code == 401


class TestGetJob:
    def test_get_job(self, api, auth_headers, seeded):
        ws_id = seeded["workspace_id"]
        job_id = _create_job(api, ws_id)
        rv = api.get(f"/workspaces/{ws_id}/jobs/{job_id}")
        assert rv.status_code == 200
        body = rv.get_json()
        assert body["data"]["id"] == job_id
        assert body["data"]["type"] == "export"

    def test_get_job_not_found(self, api, auth_headers, seeded):
        ws_id = seeded["workspace_id"]
        rv = api.get(f"/workspaces/{ws_id}/jobs/00000000-0000-0000-0000-000000000000")
        assert rv.status_code == 404
        assert "error" in rv.get_json()

    def test_unauthenticated(self, client, seeded):
        rv = client.get(
            f"/api/v1/workspaces/{seeded['workspace_id']}/jobs/"
            "00000000-0000-0000-0000-000000000000"
        )
        assert rv.status_code == 401


class TestCreateJob:
    def test_create_job(self, api, auth_headers, seeded):
        ws_id = seeded["workspace_id"]
        rv = api.post(f"/workspaces/{ws_id}/jobs", data={
            "type": "export",
            "payload": {"format": "json"},
        })
        assert rv.status_code == 201
        body = rv.get_json()
        assert body["data"]["type"] == "export"
        assert body["data"]["status"] == "pending"
        assert "id" in body["data"]

    def test_create_job_minimal_payload(self, api, auth_headers, seeded):
        ws_id = seeded["workspace_id"]
        rv = api.post(f"/workspaces/{ws_id}/jobs", data={
            "type": "import",
            "payload": {},
        })
        assert rv.status_code == 201
        assert rv.get_json()["data"]["type"] == "import"

    def test_create_job_with_priority(self, api, auth_headers, seeded):
        ws_id = seeded["workspace_id"]
        rv = api.post(f"/workspaces/{ws_id}/jobs", data={
            "type": "export",
            "payload": {},
            "priority": "high",
        })
        assert rv.status_code == 201
        assert rv.get_json()["data"]["priority"] == "high"

    def test_create_job_with_idempotency_key(self, api, auth_headers, seeded):
        ws_id = seeded["workspace_id"]
        key = str(uuid.uuid4())
        rv = api.post(f"/workspaces/{ws_id}/jobs", data={
            "type": "export",
            "payload": {},
            "idempotency_key": key,
        })
        assert rv.status_code == 201
        job_id = rv.get_json()["data"]["id"]
        rv = api.post(f"/workspaces/{ws_id}/jobs", data={
            "type": "export",
            "payload": {},
            "idempotency_key": key,
        })
        assert rv.status_code == 201
        assert rv.get_json()["data"]["id"] == job_id

    def test_create_job_missing_type(self, api, auth_headers, seeded):
        ws_id = seeded["workspace_id"]
        rv = api.post(f"/workspaces/{ws_id}/jobs", data={
            "payload": {"format": "csv"},
        })
        assert rv.status_code == 422
        assert "error" in rv.get_json()

    def test_create_job_missing_payload(self, api, auth_headers, seeded):
        ws_id = seeded["workspace_id"]
        rv = api.post(f"/workspaces/{ws_id}/jobs", data={
            "type": "export",
        })
        assert rv.status_code == 422
        assert "error" in rv.get_json()

    def test_create_job_invalid_priority(self, api, auth_headers, seeded):
        ws_id = seeded["workspace_id"]
        rv = api.post(f"/workspaces/{ws_id}/jobs", data={
            "type": "export",
            "payload": {},
            "priority": "urgent",
        })
        assert rv.status_code == 422
        assert "error" in rv.get_json()

    def test_unauthenticated(self, client, seeded):
        rv = client.post(
            f"/api/v1/workspaces/{seeded['workspace_id']}/jobs",
            json={"type": "export", "payload": {}},
        )
        assert rv.status_code == 401


class TestMarkRunning:
    def test_mark_running(self, api, auth_headers, seeded):
        ws_id = seeded["workspace_id"]
        job_id = _create_job(api, ws_id)
        rv = api.post(f"/workspaces/{ws_id}/jobs/{job_id}/running")
        assert rv.status_code == 200
        assert rv.get_json()["data"]["status"] == "running"
        assert "started_at" in rv.get_json()["data"]

    def test_mark_running_twice(self, api, auth_headers, seeded):
        ws_id = seeded["workspace_id"]
        job_id = _create_job(api, ws_id)
        api.post(f"/workspaces/{ws_id}/jobs/{job_id}/running")
        rv = api.post(f"/workspaces/{ws_id}/jobs/{job_id}/running")
        assert rv.status_code == 200
        assert rv.get_json()["data"]["status"] == "running"

    def test_mark_running_not_found(self, api, auth_headers, seeded):
        ws_id = seeded["workspace_id"]
        rv = api.post(
            f"/workspaces/{ws_id}/jobs/00000000-0000-0000-0000-000000000000/running"
        )
        assert rv.status_code == 404
        assert "error" in rv.get_json()

    def test_unauthenticated(self, client, seeded):
        rv = client.post(
            f"/api/v1/workspaces/{seeded['workspace_id']}/jobs/"
            "00000000-0000-0000-0000-000000000000/running"
        )
        assert rv.status_code == 401


class TestMarkCompleted:
    def test_mark_completed(self, api, auth_headers, seeded):
        ws_id = seeded["workspace_id"]
        job_id = _create_job(api, ws_id)
        rv = api.post(f"/workspaces/{ws_id}/jobs/{job_id}/completed", data={
            "result": {"rows_processed": 42},
        })
        assert rv.status_code == 200
        body = rv.get_json()
        assert body["data"]["status"] == "completed"
        assert body["data"]["result"] == {"rows_processed": 42}

    def test_mark_completed_empty_result(self, api, auth_headers, seeded):
        ws_id = seeded["workspace_id"]
        job_id = _create_job(api, ws_id)
        rv = api.post(f"/workspaces/{ws_id}/jobs/{job_id}/completed", data={
            "result": {},
        })
        assert rv.status_code == 200
        assert rv.get_json()["data"]["status"] == "completed"

    def test_mark_completed_no_body(self, api, auth_headers, seeded):
        ws_id = seeded["workspace_id"]
        job_id = _create_job(api, ws_id)
        rv = api.post(f"/workspaces/{ws_id}/jobs/{job_id}/completed", data={})
        assert rv.status_code == 200
        assert rv.get_json()["data"]["status"] == "completed"

    def test_mark_completed_not_found(self, api, auth_headers, seeded):
        ws_id = seeded["workspace_id"]
        rv = api.post(
            f"/workspaces/{ws_id}/jobs/00000000-0000-0000-0000-000000000000/completed",
            data={"result": {}},
        )
        assert rv.status_code == 404
        assert "error" in rv.get_json()

    def test_unauthenticated(self, client, seeded):
        rv = client.post(
            f"/api/v1/workspaces/{seeded['workspace_id']}/jobs/"
            "00000000-0000-0000-0000-000000000000/completed",
            json={"result": {}},
        )
        assert rv.status_code == 401


class TestFailJob:
    def test_fail_job(self, api, auth_headers, seeded):
        ws_id = seeded["workspace_id"]
        job_id = _create_job(api, ws_id)
        rv = api.post(f"/workspaces/{ws_id}/jobs/{job_id}/fail", data={
            "error": "Something went wrong",
        })
        assert rv.status_code == 200
        body = rv.get_json()
        assert body["data"]["status"] == "failed"
        assert body["data"]["error"] == "Something went wrong"

    def test_fail_job_no_error(self, api, auth_headers, seeded):
        ws_id = seeded["workspace_id"]
        job_id = _create_job(api, ws_id)
        rv = api.post(f"/workspaces/{ws_id}/jobs/{job_id}/fail", data={})
        assert rv.status_code == 200
        assert rv.get_json()["data"]["status"] == "failed"

    def test_fail_job_not_found(self, api, auth_headers, seeded):
        ws_id = seeded["workspace_id"]
        rv = api.post(
            f"/workspaces/{ws_id}/jobs/00000000-0000-0000-0000-000000000000/fail",
            data={},
        )
        assert rv.status_code == 404
        assert "error" in rv.get_json()

    def test_unauthenticated(self, client, seeded):
        rv = client.post(
            f"/api/v1/workspaces/{seeded['workspace_id']}/jobs/"
            "00000000-0000-0000-0000-000000000000/fail",
            json={"error": "err"},
        )
        assert rv.status_code == 401


class TestCancelJob:
    def test_cancel_job(self, api, auth_headers, seeded):
        ws_id = seeded["workspace_id"]
        job_id = _create_job(api, ws_id)
        rv = api.post(f"/workspaces/{ws_id}/jobs/{job_id}/cancel")
        assert rv.status_code == 200
        assert rv.get_json()["data"]["status"] == "cancelled"

    def test_cancel_completed_job(self, api, auth_headers, seeded):
        ws_id = seeded["workspace_id"]
        job_id = _create_job(api, ws_id)
        api.post(f"/workspaces/{ws_id}/jobs/{job_id}/completed", data={"result": {}})
        rv = api.post(f"/workspaces/{ws_id}/jobs/{job_id}/cancel")
        assert rv.status_code == 400
        assert "error" in rv.get_json()

    def test_cancel_job_not_found(self, api, auth_headers, seeded):
        ws_id = seeded["workspace_id"]
        rv = api.post(
            f"/workspaces/{ws_id}/jobs/00000000-0000-0000-0000-000000000000/cancel"
        )
        assert rv.status_code == 404
        assert "error" in rv.get_json()

    def test_unauthenticated(self, client, seeded):
        rv = client.post(
            f"/api/v1/workspaces/{seeded['workspace_id']}/jobs/"
            "00000000-0000-0000-0000-000000000000/cancel"
        )
        assert rv.status_code == 401
