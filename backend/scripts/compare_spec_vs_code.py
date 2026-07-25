"""
Compare SPEC.md endpoints against actual backend route files.
"""
import os
import re
from pathlib import Path

BACKEND = Path(__file__).resolve().parent.parent
ROUTES_DIR = str(BACKEND / "app" / "api" / "v1")
API_INIT = str(BACKEND / "app" / "api" / "v1" / "__init__.py")

# Parse url_prefix for each blueprint from top-level __init__.py
init_py_text = open(API_INIT).read()
prefix_map = {}
for m in re.finditer(r'register_blueprint\((\w+_bp),\s*url_prefix="([^"]+)"\)', init_py_text):
    bp_var = m.group(1)
    prefix = m.group(2)
    for m2 in re.finditer(rf'from\s+app\.api\.v1\.(\w+)(?:\.routes)?\s+import\s+{bp_var}', init_py_text):
        prefix_map[m2.group(1)] = prefix

# Parse actual routes from @bp decorators in route files
code_endpoints = set()
for root, dirs, files in os.walk(ROUTES_DIR):
    for fn in files:
        if fn != "routes.py":
            continue
        text = open(os.path.join(root, fn)).read()
        bp_name = os.path.basename(root)
        prefix = prefix_map.get(bp_name, f"/{bp_name}")
        
        for match in re.finditer(r'@bp\.(get|post|patch|put|delete)\("([^"]*)"\)', text):
            method = match.group(1).upper()
            path = match.group(2)
            full = prefix + path
            full = re.sub(r'<string:(\w+)>', r'<\1>', full)
            full = re.sub(r'<path:(\w+)>', r'<\1>', full)
            code_endpoints.add((method, full))

# SPEC endpoints (from SPEC.md Section 10)
spec_endpoints = {
    ("GET", "/health"),
    ("POST", "/auth/register"), ("POST", "/auth/login"), ("POST", "/auth/google"),
    ("GET", "/auth/check-email"), ("POST", "/auth/refresh"), ("POST", "/auth/logout"),
    ("GET", "/auth/me"), ("PATCH", "/auth/me"),
    ("POST", "/auth/exchange-code"), ("POST", "/auth/exchange"),
    ("GET", "/workspaces"), ("POST", "/workspaces"),
    ("GET", "/workspaces/<id>"), ("PATCH", "/workspaces/<id>"), ("DELETE", "/workspaces/<id>"),
    ("GET", "/workspaces/<id>/stats"),
    ("GET", "/workspaces/<id>/members"), ("POST", "/workspaces/<id>/members"),
    ("PATCH", "/workspaces/<id>/members/<user_id>"), ("DELETE", "/workspaces/<id>/members/<user_id>"),
    ("GET", "/entities"), ("POST", "/entities"),
    ("GET", "/entities/<id>"), ("PATCH", "/entities/<id>"), ("DELETE", "/entities/<id>"),
    ("POST", "/entities/<id>/restore"), ("POST", "/entities/<id>/archive"),
    ("POST", "/entities/<id>/duplicate"), ("GET", "/entities/<id>/children"),
    ("POST", "/entities/<id>/children"), ("GET", "/entities/<id>/versions"),
    ("POST", "/entities/types"), ("GET", "/entities/types"),
    ("POST", "/entities/properties"), ("GET", "/entities/properties"),
    ("GET", "/blocks"), ("POST", "/blocks"),
    ("GET", "/blocks/<id>"), ("PATCH", "/blocks/<id>"),
    ("POST", "/blocks/<id>/move"), ("DELETE", "/blocks/<id>"),
    ("POST", "/blocks/reorder"), ("GET", "/blocks/entity/<entity_id>"),
    ("GET", "/relations"), ("POST", "/relations"),
    ("GET", "/relations/<id>"), ("DELETE", "/relations/<id>"),
    ("GET", "/relations/entity/<entity_id>"), ("GET", "/relations/backlinks/<entity_id>"),
    ("GET", "/relations/neighbors/<entity_id>"), ("GET", "/relations/path"),
    ("GET", "/tags"), ("POST", "/tags"), ("GET", "/tags/<id>"),
    ("PATCH", "/tags/<id>"), ("DELETE", "/tags/<id>"),
    ("POST", "/tags/<tag_id>/entities/<entity_id>"), ("DELETE", "/tags/<tag_id>/entities/<entity_id>"),
    ("GET", "/comments"), ("POST", "/comments"),
    ("GET", "/comments/<id>"), ("PATCH", "/comments/<id>"), ("DELETE", "/comments/<id>"),
    ("GET", "/branches"), ("POST", "/branches"), ("GET", "/branches/<id>"),
    ("DELETE", "/branches/<id>"),
    ("POST", "/branches/<id>/merge"), ("POST", "/branches/merge"),
    ("GET", "/branches/merge-conflicts"), ("PATCH", "/branches/merge-conflicts/<id>/resolve"),
    ("GET", "/versions/changesets"), ("POST", "/versions/changesets"),
    ("GET", "/versions/snapshots"), ("POST", "/versions/snapshots"),
    ("POST", "/versions/entities/<entity_id>/snapshot"),
    ("GET", "/versions/entities/<entity_id>"), ("GET", "/versions/blocks/<block_id>"),
    ("GET", "/versions/compare"), ("POST", "/versions/restore/<version_id>"),
    ("POST", "/diffs/compare"), ("POST", "/diffs/blocks"),
    ("GET", "/search"), ("GET", "/search/history"), ("GET", "/search/suggest"),
    ("POST", "/ai/query"), ("POST", "/ai/summarize"), ("POST", "/ai/suggest-relations"),
    ("GET", "/files"), ("POST", "/files/upload"), ("POST", "/files"),
    ("GET", "/files/<id>"), ("GET", "/files/<id>/download"), ("DELETE", "/files/<id>"),
    ("GET", "/files/<id>/thumbnail"), ("GET", "/files/<id>/preview"),
    ("GET", "/files/<id>/variants"), ("GET", "/files/<id>/variants/<type>"),
    ("POST", "/files/<id>/entities/<eid>"), ("DELETE", "/files/<id>/entities/<eid>"),
    ("POST", "/files/presign"),
    ("POST", "/files/presign-multipart"), ("POST", "/files/presign-multipart/complete"),
    ("POST", "/files/<id>/confirm"),
    ("POST", "/files/quarantine/<id>/resolve"),
    ("POST", "/files/cleanup-orphans"), ("POST", "/files/cleanup-quarantine"),
    ("POST", "/files/cleanup-deleted"), ("GET", "/files/storage-info"),
    ("GET", "/graph"), ("POST", "/graph/materialize"),
    ("POST", "/graph/query"), ("POST", "/graph/traverse"), ("POST", "/graph/paths"),
    ("GET", "/governance/health"), ("GET", "/governance/duplicates"),
    ("GET", "/governance/orphans"), ("GET", "/governance/stale"),
    ("POST", "/governance/health-score"),
    ("GET", "/dashboard/overview"),
    ("GET", "/settings"), ("GET", "/settings/<category>"),
    ("PUT", "/settings/<category>"), ("POST", "/settings/reset"),
    ("GET", "/notifications"), ("POST", "/notifications"),
    ("POST", "/notifications/<id>/read"), ("POST", "/notifications/<id>/dismiss"),
    ("GET", "/jobs"), ("POST", "/jobs"),
    ("POST", "/jobs/<id>/running"), ("POST", "/jobs/<id>/completed"),
    ("GET", "/sync"), ("POST", "/sync"),
    ("GET", "/sync/<id>"), ("POST", "/sync/<op_id>/ack"),
    ("POST", "/sync/diff"), ("POST", "/sync/apply-diff"),
    ("POST", "/sync/sync-from-export"), ("POST", "/sync/resolve-conflict"),
    ("GET", "/activity"), ("GET", "/activity/events"),
    ("GET", "/backups"), ("POST", "/backups/export"),
    ("POST", "/backups/export-to-disk"), ("POST", "/backups/export-markdown"),
    ("POST", "/backups/export-zip"), ("POST", "/backups/export-html"),
    ("POST", "/backups/export-pdf"), ("POST", "/backups/import"),
}

def norm(m, p):
    p = re.sub(r'/<\w+>', '/<id>', p)
    # Flatten workspace scope: /workspaces/<id>/entities/<id> -> /entities/<id>
    p = re.sub(r'^/workspaces/<id>', '', p)
    p = p.rstrip("/") or "/"
    return m.upper(), p

spec_norm = {norm(m, p) for m, p in spec_endpoints}
code_norm = {norm(m, p) for m, p in code_endpoints}

print("SPEC.md total: ", len(spec_norm))
print("Code total:    ", len(code_norm))
print()

missing_from_code = spec_norm - code_norm
extra_in_code = code_norm - spec_norm

print("=== IN SPEC.md but MISSING from CODE ===")
print(f"Count: {len(missing_from_code)}")
for m, p in sorted(missing_from_code):
    print(f"  {m:6s} {p}")

print()
print("=== IN CODE but NOT in SPEC.md ===")
print(f"Count: {len(extra_in_code)}")
for m, p in sorted(extra_in_code):
    print(f"  {m:6s} {p}")
