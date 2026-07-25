"""
Compare API endpoints between cloud-web/SPEC.md and backend/API.md.
Normalizes workspace scoping: SPEC.md uses flat paths (/entities/) while
API.md uses scoped paths (/workspaces/<id>/entities/).
"""
import re

# ── SPEC.md endpoints (from cloud-web) ──────────────────────
SPEC = [
    ("GET", "/health"),
    ("POST", "/auth/register"), ("POST", "/auth/login"), ("POST", "/auth/google"),
    ("GET", "/auth/check-email"), ("POST", "/auth/refresh"), ("POST", "/auth/logout"),
    ("GET", "/auth/me"), ("PATCH", "/auth/me"),
    ("POST", "/auth/exchange-code"), ("POST", "/auth/exchange"),
    ("GET", "/workspaces/"), ("POST", "/workspaces/"),
    ("GET", "/workspaces/<id>"), ("PATCH", "/workspaces/<id>"), ("DELETE", "/workspaces/<id>"),
    ("GET", "/workspaces/<id>/stats"),
    ("GET", "/workspaces/<id>/members"), ("POST", "/workspaces/<id>/members"),
    ("PATCH", "/workspaces/<id>/members/<user_id>"), ("DELETE", "/workspaces/<id>/members/<user_id>"),
    ("GET", "/entities/"), ("POST", "/entities/"),
    ("GET", "/entities/<id>"), ("PATCH", "/entities/<id>"), ("DELETE", "/entities/<id>"),
    ("POST", "/entities/<id>/restore"), ("POST", "/entities/<id>/archive"),
    ("POST", "/entities/<id>/duplicate"), ("GET", "/entities/<id>/children"),
    ("POST", "/entities/<id>/children"), ("GET", "/entities/<id>/versions"),
    ("POST", "/entities/types"), ("GET", "/entities/types"),
    ("POST", "/entities/properties"), ("GET", "/entities/properties"),
    ("GET", "/blocks/"), ("POST", "/blocks/"),
    ("GET", "/blocks/<id>"), ("PATCH", "/blocks/<id>"),
    ("POST", "/blocks/<id>/move"), ("DELETE", "/blocks/<id>"),
    ("POST", "/blocks/reorder"), ("GET", "/blocks/entity/<entity_id>"),
    ("GET", "/relations/"), ("POST", "/relations/"),
    ("GET", "/relations/<id>"), ("DELETE", "/relations/<id>"),
    ("GET", "/relations/entity/<entity_id>"), ("GET", "/relations/backlinks/<entity_id>"),
    ("GET", "/relations/neighbors/<entity_id>"), ("GET", "/relations/path"),
    ("GET", "/tags/"), ("POST", "/tags/"), ("GET", "/tags/<id>"),
    ("PATCH", "/tags/<id>"), ("DELETE", "/tags/<id>"),
    ("POST", "/tags/<tag_id>/entities/<entity_id>"), ("DELETE", "/tags/<tag_id>/entities/<entity_id>"),
    ("GET", "/comments/"), ("POST", "/comments/"),
    ("GET", "/comments/<id>"), ("PATCH", "/comments/<id>"), ("DELETE", "/comments/<id>"),
    ("GET", "/branches/"), ("POST", "/branches/"), ("GET", "/branches/<id>"),
    ("DELETE", "/branches/<id>"), ("POST", "/branches/<id>/merge"), ("POST", "/branches/merge"),
    ("GET", "/branches/merge-conflicts"), ("PATCH", "/branches/merge-conflicts/<id>/resolve"),
    ("GET", "/versions/changesets"), ("POST", "/versions/changesets"),
    ("GET", "/versions/snapshots"), ("POST", "/versions/snapshots"),
    ("POST", "/versions/entities/<entity_id>/snapshot"),
    ("GET", "/versions/entities/<entity_id>"), ("GET", "/versions/blocks/<block_id>"),
    ("GET", "/versions/compare"), ("POST", "/versions/restore/<version_id>"),
    ("POST", "/diffs/compare"), ("POST", "/diffs/blocks"),
    ("GET", "/search/"), ("GET", "/search/history"), ("GET", "/search/suggest"),
    ("POST", "/ai/query"), ("POST", "/ai/summarize"), ("POST", "/ai/suggest-relations"),
    ("GET", "/files/"), ("POST", "/files/upload"), ("POST", "/files/"),
    ("GET", "/files/<id>"), ("GET", "/files/<id>/download"), ("DELETE", "/files/<id>"),
    ("GET", "/files/<id>/thumbnail"), ("GET", "/files/<id>/preview"),
    ("GET", "/files/<id>/variants"), ("GET", "/files/<id>/variants/<type>"),
    ("POST", "/files/<id>/entities/<eid>"), ("DELETE", "/files/<id>/entities/<eid>"),
    ("POST", "/files/presign"), ("POST", "/files/presign-multipart"),
    ("POST", "/files/presign-multipart/complete"), ("POST", "/files/<id>/confirm"),
    ("POST", "/files/quarantine/<id>/resolve"),
    ("POST", "/files/cleanup-orphans"), ("POST", "/files/cleanup-quarantine"),
    ("POST", "/files/cleanup-deleted"), ("GET", "/files/storage-info"),
    ("GET", "/graph/"), ("POST", "/graph/materialize"),
    ("POST", "/graph/query"), ("POST", "/graph/traverse"), ("POST", "/graph/paths"),
    ("GET", "/governance/health"), ("GET", "/governance/duplicates"),
    ("GET", "/governance/orphans"), ("GET", "/governance/stale"),
    ("POST", "/governance/health-score"),
    ("GET", "/dashboard/overview"),
    ("GET", "/settings/"), ("GET", "/settings/<category>"),
    ("PUT", "/settings/<category>"), ("POST", "/settings/reset"),
    ("GET", "/notifications/"), ("POST", "/notifications/"),
    ("POST", "/notifications/<id>/read"), ("POST", "/notifications/<id>/dismiss"),
    ("GET", "/jobs/"), ("POST", "/jobs/"),
    ("POST", "/jobs/<id>/running"), ("POST", "/jobs/<id>/completed"),
    ("GET", "/sync/"), ("POST", "/sync/"),
    ("GET", "/sync/<id>"), ("POST", "/sync/<op_id>/ack"),
    ("POST", "/sync/diff"), ("POST", "/sync/apply-diff"),
    ("POST", "/sync/sync-from-export"), ("POST", "/sync/resolve-conflict"),
    ("GET", "/activity/"), ("GET", "/activity/events"),
    ("GET", "/backups/"), ("POST", "/backups/export"),
    ("POST", "/backups/export-to-disk"), ("POST", "/backups/export-markdown"),
    ("POST", "/backups/export-zip"), ("POST", "/backups/export-html"),
    ("POST", "/backups/export-pdf"), ("POST", "/backups/import"),
]

# ── API.md endpoints (from backend) ─────────────────────────
API = [
    ("GET", "/health"),
    ("GET", "/metrics"),
    ("GET", "/auth/authorize"), ("POST", "/auth/authorize"),
    ("GET", "/auth/check-email"),
    ("POST", "/auth/register"), ("POST", "/auth/login"), ("POST", "/auth/google"),
    ("POST", "/auth/exchange"), ("POST", "/auth/exchange-code"),
    ("POST", "/auth/refresh"), ("POST", "/auth/logout"),
    ("GET", "/auth/me"), ("PATCH", "/auth/me"),
    ("POST", "/auth/change-password"), ("POST", "/auth/forgot-password"),
    ("POST", "/auth/reset-password"), ("POST", "/auth/profile-changed"),
    # Workspace scope
    ("GET", "/workspaces"), ("POST", "/workspaces"),
    ("GET", "/workspaces/<wid>"), ("PATCH", "/workspaces/<wid>"), ("DELETE", "/workspaces/<wid>"),
    ("GET", "/workspaces/<wid>/members"),
    ("POST", "/workspaces/<wid>/members/invite"),
    ("PATCH", "/workspaces/<wid>/members/<mid>"),
    ("DELETE", "/workspaces/<wid>/members/<mid>"),
    ("GET", "/workspaces/<wid>/entities"),
    ("POST", "/workspaces/<wid>/entities"),
    ("GET", "/workspaces/<wid>/entities/<eid>"),
    ("PATCH", "/workspaces/<wid>/entities/<eid>"),
    ("DELETE", "/workspaces/<wid>/entities/<eid>"),
    ("POST", "/workspaces/<wid>/entities/<eid>/restore"),
    ("DELETE", "/workspaces/<wid>/entities/<eid>/permanent"),
    ("GET", "/workspaces/<wid>/entities/<eid>/blocks"),
    ("POST", "/workspaces/<wid>/entities/<eid>/blocks"),
    ("PATCH", "/workspaces/<wid>/entities/<eid>/blocks/<bid>"),
    ("DELETE", "/workspaces/<wid>/entities/<eid>/blocks/<bid>"),
    ("POST", "/workspaces/<wid>/entities/<eid>/blocks/reorder"),
    ("GET", "/workspaces/<wid>/relations"),
    ("POST", "/workspaces/<wid>/relations"),
    ("DELETE", "/workspaces/<wid>/relations/<rid>"),
    ("POST", "/workspaces/<wid>/relations/batch"),
    ("GET", "/workspaces/<wid>/tags"),
    ("POST", "/workspaces/<wid>/tags"),
    ("DELETE", "/workspaces/<wid>/tags/<tid>"),
    ("GET", "/workspaces/<wid>/properties"),
    ("POST", "/workspaces/<wid>/properties"),
    ("DELETE", "/workspaces/<wid>/properties/<pid>"),
    ("GET", "/workspaces/<wid>/comments"),
    ("POST", "/workspaces/<wid>/comments"),
    ("PATCH", "/workspaces/<wid>/comments/<cid>"),
    ("DELETE", "/workspaces/<wid>/comments/<cid>"),
    ("GET", "/workspaces/<wid>/settings"),
    ("PATCH", "/workspaces/<wid>/settings"),
    # Files under workspace scope
    ("POST", "/workspaces/<wid>/files/presign"),
    ("POST", "/workspaces/<wid>/files/confirm"),
    ("POST", "/workspaces/<wid>/files/upload"),
    ("GET", "/workspaces/<wid>/files/<fid>"),
    ("GET", "/workspaces/<wid>/files/<fid>/download"),
    ("GET", "/workspaces/<wid>/files/<fid>/thumbnail"),
    ("GET", "/workspaces/<wid>/files/<fid>/preview"),
    ("GET", "/workspaces/<wid>/files/<fid>/variants"),
    ("GET", "/workspaces/<wid>/files/<fid>/variants/<vtype>"),
    ("POST", "/workspaces/<wid>/files/<fid>/entities/<entid>"),
    ("DELETE", "/workspaces/<wid>/files/<fid>/entities/<entid>"),
    ("DELETE", "/workspaces/<wid>/files/<fid>"),
    ("POST", "/workspaces/<wid>/files/cleanup-orphans"),
    ("POST", "/workspaces/<wid>/files/cleanup-quarantine"),
    ("POST", "/workspaces/<wid>/files/cleanup-deleted"),
    ("GET", "/workspaces/<wid>/files/storage-info"),
    # Versions
    ("GET", "/workspaces/<wid>/versions"),
    ("POST", "/workspaces/<wid>/versions"),
    ("GET", "/workspaces/<wid>/versions/<vid>"),
    ("POST", "/workspaces/<wid>/versions/<vid>/restore"),
    # Branches
    ("GET", "/workspaces/<wid>/branches"),
    ("POST", "/workspaces/<wid>/branches"),
    ("PATCH", "/workspaces/<wid>/branches/<bid>"),
    ("DELETE", "/workspaces/<wid>/branches/<bid>"),
    # Diffs
    ("GET", "/workspaces/<wid>/diffs/compare"),
    # Sync
    ("POST", "/workspaces/<wid>/sync/push"),
    ("POST", "/workspaces/<wid>/sync/pull"),
    ("GET", "/workspaces/<wid>/sync/status"),
    # Search
    ("GET", "/workspaces/<wid>/search"),
    # Graph
    ("GET", "/workspaces/<wid>/graph"),
    ("GET", "/workspaces/<wid>/graph/search"),
    # AI
    ("POST", "/workspaces/<wid>/ai/chat"),
    ("POST", "/workspaces/<wid>/ai/complete"),
    ("POST", "/workspaces/<wid>/ai/embed"),
    ("POST", "/workspaces/<wid>/ai/semantic-search"),
    # Backups
    ("POST", "/workspaces/<wid>/backups/export-zip-encrypted"),
    ("POST", "/workspaces/<wid>/backups/import-zip"),
    ("POST", "/workspaces/<wid>/backups/export-markdown"),
    ("POST", "/workspaces/<wid>/backups/export-html"),
    ("POST", "/workspaces/<wid>/backups/export-pdf"),
    ("POST", "/workspaces/<wid>/backups/export"),
    ("POST", "/workspaces/<wid>/backups/create"),
    ("POST", "/workspaces/<wid>/backups/<fname>/restore"),
    ("GET", "/workspaces/<wid>/backups"),
    ("GET", "/workspaces/<wid>/backups/download-zip/<fname>"),
    # Admin
    ("GET", "/admin/users"), ("PATCH", "/admin/users/<uid>"), ("DELETE", "/admin/users/<uid>"),
    ("GET", "/admin/system/status"), ("GET", "/admin/system/logs"),
    ("POST", "/admin/system/cleanup"),
    # Governance
    ("GET", "/workspaces/<wid>/governance/reports"),
    ("POST", "/workspaces/<wid>/governance/reports"),
    ("GET", "/workspaces/<wid>/governance/reports/<rid>"),
    # Notifications
    ("GET", "/notifications"),
    ("PATCH", "/notifications/<nid>"),
    ("POST", "/notifications/read-all"),
    ("GET", "/notifications/unread-count"),
    # Activity
    ("GET", "/workspaces/<wid>/activity"),
    # Dashboard
    ("GET", "/workspaces/<wid>/dashboard/overview"),
    ("GET", "/workspaces/<wid>/dashboard/storage"),
    # Jobs
    ("GET", "/workspaces/<wid>/jobs"),
    ("GET", "/workspaces/<wid>/jobs/<jid>"),
    ("POST", "/workspaces/<wid>/jobs/<jid>/cancel"),
]


def normalize(method, path):
    """Normalize path params and strip trailing slashes."""
    path = re.sub(r"/<[^>]+>", "/<id>", path)
    # Collapse multiple consecutive <id> slugs to a single <id>
    path = re.sub(r"/<id>/<id>", "/<id>", path)
    path = path.rstrip("/") or "/"
    return method.upper(), path


# Flatten workspace scope: /workspaces/<wid>/X -> /X
def flatten_workspace_scope(method, path):
    """SPEC.md uses flat paths (/entities/). API.md uses /workspaces/<wid>/entities/.
    Normalize API.md paths by stripping the workspace scope prefix."""
    m, p = normalize(method, path)
    stripped = re.sub(r"^/workspaces/<id>/", "/", p)
    if stripped == p:
        return m, p  # no change
    return m, stripped


# Build sets
spec_raw = {normalize(m, p) for m, p in SPEC}
api_raw = {normalize(m, p) for m, p in API}
# API flat (without workspace scope)
api_flat = {flatten_workspace_scope(m, p) for m, p in API}

print("=" * 72)
print("DEEP COMPARISON: cloud-web/SPEC.md vs backend/API.md")
print("=" * 72)

print(f"\nSPEC.md total endpoints:  {len(spec_raw)}")
print(f"API.md total endpoints:   {len(api_raw)}")
print(f"API.md (flat workspace):  {len(api_flat)}")
print()

# Real differences after normalizing workspace scope
only_spec = spec_raw - api_flat
only_api = api_flat - spec_raw

# Categorize
def cat(p):
    if p.startswith("/auth/"):
        return "Auth"
    if p.startswith("/workspaces"):
        return "Workspaces"
    if p.startswith("/entities"):
        return "Entities"
    if p.startswith("/blocks"):
        return "Blocks"
    if p.startswith("/relations"):
        return "Relations"
    if p.startswith("/tags"):
        return "Tags"
    if p.startswith("/properties") or "/properties" in p:
        return "Properties"
    if p.startswith("/comments"):
        return "Comments"
    if p.startswith("/branches"):
        return "Branches"
    if p.startswith("/versions"):
        return "Versions"
    if p.startswith("/diffs"):
        return "Diffs"
    if p.startswith("/search"):
        return "Search"
    if p.startswith("/ai"):
        return "AI"
    if p.startswith("/files"):
        return "Files"
    if p.startswith("/graph"):
        return "Graph"
    if p.startswith("/governance"):
        return "Governance"
    if p.startswith("/dashboard"):
        return "Dashboard"
    if p.startswith("/settings"):
        return "Settings"
    if p.startswith("/notifications"):
        return "Notifications"
    if p.startswith("/jobs"):
        return "Jobs"
    if p.startswith("/sync"):
        return "Sync"
    if p.startswith("/activity"):
        return "Activity"
    if p.startswith("/backups"):
        return "Backups"
    if p.startswith("/admin"):
        return "Admin"
    if p.startswith("/health") or p.startswith("/metrics"):
        return "System"
    return "Other"


print("── ENDPOINTS IN SPEC.md but MISSING from API.md (frontend expects, backend missing) ──")
print()
for m, p in sorted(only_spec, key=lambda x: (cat(x[1]), x[1])):
    print(f"  [{cat(p):13s}] {m:6s} {p}")

print()
print("── ENDPOINTS IN API.md but MISSING from SPEC.md (backend has, frontend spec doesn't mention) ──")
print()
for m, p in sorted(only_api, key=lambda x: (cat(x[1]), x[1])):
    print(f"  [{cat(p):13s}] {m:6s} {p}")

print()
print("── METHOD MISMATCHES (same path, different HTTP method) ──")
print()

# Build path->methods maps
spec_paths = {}
for m, p in spec_raw:
    spec_paths.setdefault(p, set()).add(m)
api_paths = {}
for m, p in api_flat:
    api_paths.setdefault(p, set()).add(m)

for p in sorted(set(spec_paths) & set(api_paths)):
    sm = spec_paths[p]
    am = api_paths[p]
    if sm != am:
        print(f"  PATH: {p}")
        print(f"    SPEC.md: {', '.join(sorted(sm))}")
        print(f"    API.md:  {', '.join(sorted(am))}")
        print()

print()
print("═══ SUMMARY ═══")
print(f"  Only in SPEC.md (frontend wants, backend missing):  {len(only_spec)}")
print(f"  Only in API.md  (backend has, frontend spec missing): {len(only_api)}")
