"""Tests for all governance routes: reports, health, duplicates, orphans, stale, health-score."""



def _create_report(api, ws_id):
    rv = api.post(f"/workspaces/{ws_id}/governance/reports", data={
        "type": "storage_summary",
        "title": "Storage Summary Report",
    })
    assert rv.status_code == 201, f"create report failed: {rv.get_json()}"
    return rv.get_json()["data"]["id"]


class TestListReports:
    def test_list_reports(self, api, auth_headers, seeded):
        ws_id = seeded["workspace_id"]
        _create_report(api, ws_id)
        rv = api.get(f"/workspaces/{ws_id}/governance/reports")
        assert rv.status_code == 200
        body = rv.get_json()
        assert "data" in body
        assert "meta" in body
        assert body["meta"]["total"] >= 1
        assert "id" in body["data"][0]

    def test_list_reports_empty(self, api, auth_headers, seeded):
        ws_id = seeded["workspace_id"]
        rv = api.get(f"/workspaces/{ws_id}/governance/reports")
        assert rv.status_code == 200
        body = rv.get_json()
        assert body["meta"]["total"] == 0
        assert body["data"] == []

    def test_list_reports_pagination(self, api, auth_headers, seeded):
        ws_id = seeded["workspace_id"]
        rv = api.get(f"/workspaces/{ws_id}/governance/reports?page=1&per_page=5")
        assert rv.status_code == 200
        body = rv.get_json()
        assert body["meta"]["page"] == 1
        assert body["meta"]["per_page"] == 5

    def test_unauthenticated(self, client, seeded):
        rv = client.get(
            f"/api/v1/workspaces/{seeded['workspace_id']}/governance/reports"
        )
        assert rv.status_code == 401


class TestHealth:
    def test_health(self, api, auth_headers, seeded):
        ws_id = seeded["workspace_id"]
        rv = api.get(f"/workspaces/{ws_id}/governance/health")
        assert rv.status_code == 200
        body = rv.get_json()
        assert "data" in body

    def test_unauthenticated(self, client, seeded):
        rv = client.get(
            f"/api/v1/workspaces/{seeded['workspace_id']}/governance/health"
        )
        assert rv.status_code == 401


class TestDuplicates:
    def test_duplicates(self, api, auth_headers, seeded):
        ws_id = seeded["workspace_id"]
        rv = api.get(f"/workspaces/{ws_id}/governance/duplicates")
        assert rv.status_code == 200
        body = rv.get_json()
        assert "data" in body

    def test_unauthenticated(self, client, seeded):
        rv = client.get(
            f"/api/v1/workspaces/{seeded['workspace_id']}/governance/duplicates"
        )
        assert rv.status_code == 401


class TestOrphans:
    def test_orphans(self, api, auth_headers, seeded):
        ws_id = seeded["workspace_id"]
        rv = api.get(f"/workspaces/{ws_id}/governance/orphans")
        assert rv.status_code == 200
        body = rv.get_json()
        assert "data" in body

    def test_unauthenticated(self, client, seeded):
        rv = client.get(
            f"/api/v1/workspaces/{seeded['workspace_id']}/governance/orphans"
        )
        assert rv.status_code == 401


class TestStale:
    def test_stale(self, api, auth_headers, seeded):
        ws_id = seeded["workspace_id"]
        rv = api.get(f"/workspaces/{ws_id}/governance/stale")
        assert rv.status_code == 200
        body = rv.get_json()
        assert "data" in body

    def test_unauthenticated(self, client, seeded):
        rv = client.get(
            f"/api/v1/workspaces/{seeded['workspace_id']}/governance/stale"
        )
        assert rv.status_code == 401


class TestHealthScore:
    def test_health_score(self, api, auth_headers, seeded):
        ws_id = seeded["workspace_id"]
        rv = api.post(f"/workspaces/{ws_id}/governance/health-score")
        assert rv.status_code == 200
        body = rv.get_json()
        assert "data" in body

    def test_unauthenticated(self, client, seeded):
        rv = client.post(
            f"/api/v1/workspaces/{seeded['workspace_id']}/governance/health-score"
        )
        assert rv.status_code == 401


class TestCreateReport:
    def test_create_report(self, api, auth_headers, seeded):
        ws_id = seeded["workspace_id"]
        rv = api.post(f"/workspaces/{ws_id}/governance/reports", data={
            "type": "access_audit",
            "title": "Access Audit Report",
        })
        assert rv.status_code == 201
        body = rv.get_json()
        assert body["data"]["type"] == "access_audit"
        assert body["data"]["title"] == "Access Audit Report"
        assert "id" in body["data"]

    def test_create_report_with_data(self, api, auth_headers, seeded):
        ws_id = seeded["workspace_id"]
        rv = api.post(f"/workspaces/{ws_id}/governance/reports", data={
            "type": "change_log",
            "title": "Change Log Report",
            "data": {"changes": 15, "users": ["alice", "bob"]},
        })
        assert rv.status_code == 201
        body = rv.get_json()
        assert body["data"]["data"]["changes"] == 15

    def test_create_report_with_params(self, api, auth_headers, seeded):
        ws_id = seeded["workspace_id"]
        rv = api.post(f"/workspaces/{ws_id}/governance/reports", data={
            "type": "compliance",
            "title": "Compliance Check",
            "params": {"scope": "full"},
        })
        assert rv.status_code == 201
        assert rv.get_json()["data"]["params"]["scope"] == "full"

    def test_create_report_all_types(self, api, auth_headers, seeded):
        ws_id = seeded["workspace_id"]
        types = ["access_audit", "change_log", "storage_summary", "activity_summary", "compliance"]
        for t in types:
            rv = api.post(f"/workspaces/{ws_id}/governance/reports", data={
                "type": t,
                "title": f"{t} report",
            })
            assert rv.status_code == 201, f"type {t} failed: {rv.get_json()}"

    def test_create_report_missing_type(self, api, auth_headers, seeded):
        ws_id = seeded["workspace_id"]
        rv = api.post(f"/workspaces/{ws_id}/governance/reports", data={
            "title": "No type",
        })
        assert rv.status_code == 422
        assert "error" in rv.get_json()

    def test_create_report_missing_title(self, api, auth_headers, seeded):
        ws_id = seeded["workspace_id"]
        rv = api.post(f"/workspaces/{ws_id}/governance/reports", data={
            "type": "change_log",
        })
        assert rv.status_code == 422
        assert "error" in rv.get_json()

    def test_create_report_invalid_type(self, api, auth_headers, seeded):
        ws_id = seeded["workspace_id"]
        rv = api.post(f"/workspaces/{ws_id}/governance/reports", data={
            "type": "invalid_type",
            "title": "Invalid",
        })
        assert rv.status_code == 422
        assert "error" in rv.get_json()

    def test_unauthenticated(self, client, seeded):
        rv = client.post(
            f"/api/v1/workspaces/{seeded['workspace_id']}/governance/reports",
            json={"type": "compliance", "title": "Compliance Report"},
        )
        assert rv.status_code == 401


class TestGetReport:
    def test_get_report(self, api, auth_headers, seeded):
        ws_id = seeded["workspace_id"]
        report_id = _create_report(api, ws_id)
        rv = api.get(f"/workspaces/{ws_id}/governance/reports/{report_id}")
        assert rv.status_code == 200
        body = rv.get_json()
        assert body["data"]["id"] == report_id
        assert body["data"]["type"] == "storage_summary"

    def test_get_report_not_found(self, api, auth_headers, seeded):
        ws_id = seeded["workspace_id"]
        rv = api.get(
            f"/workspaces/{ws_id}/governance/reports/"
            "00000000-0000-0000-0000-000000000000"
        )
        assert rv.status_code == 404
        assert "error" in rv.get_json()

    def test_unauthenticated(self, client, seeded):
        rv = client.get(
            f"/api/v1/workspaces/{seeded['workspace_id']}/governance/reports/"
            "00000000-0000-0000-0000-000000000000"
        )
        assert rv.status_code == 401
