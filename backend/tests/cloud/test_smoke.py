"""Smoke test to verify cloud mode infrastructure works with PostgreSQL."""

import uuid


def test_register_and_create_workspace(api):
    email = f"smoke-{uuid.uuid4().hex[:8]}@example.com"
    rv = api.post("/auth/register", data={
        "email": email, "password": "Password123!", "name": "Smoke",
    })
    assert rv.status_code == 201
    data = rv.get_json()["data"]
    assert "access_token" in data
    api.token = data["access_token"]

    rv = api.post("/workspaces/", data={"name": "Smoke WS"})
    assert rv.status_code == 201
    ws = rv.get_json()["data"]
    assert ws["name"] == "Smoke WS"


def test_health_check(client):
    rv = client.get("/health")
    assert rv.status_code == 200
