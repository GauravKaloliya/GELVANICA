"""
Generate API endpoint listing from actual Flask route registrations.
Simple fast version — just lists endpoints by category.
"""
import os
import re
from collections import defaultdict
from pathlib import Path

BACKEND = Path(__file__).resolve().parent.parent
ROUTES_DIR = str(BACKEND / "app" / "api" / "v1")
APP_FILE = str(BACKEND / "app" / "__init__.py")

init_py = open(APP_FILE).read()

# Parse url_prefix for each blueprint
prefix_map = {}
for m in re.finditer(r'register_blueprint\((\w+_bp),\s*url_prefix="([^"]+)"\)', init_py):
    bp_var = m.group(1)
    prefix = m.group(2)
    for m2 in re.finditer(rf'from\s+app\.api\.v1\.(\w+)(?:\.routes)?\s+import\s+{bp_var}', init_py):
        prefix_map[m2.group(1)] = prefix

# Root level routes
root_routes = []
for m in re.finditer(r'@app\.(get|post|patch|put|delete)\("([^"]*)"\)', init_py):
    root_routes.append((m.group(1).upper(), m.group(2)))

# Parse all route files
all_routes = defaultdict(list)
for root, dirs, files in os.walk(ROUTES_DIR):
    for fn in files:
        if fn != "routes.py":
            continue
        content = open(os.path.join(root, fn)).read()
        bp_name = os.path.basename(root)
        prefix = prefix_map.get(bp_name, f"/{bp_name}")
        for m in re.finditer(r'@bp\.(get|post|patch|put|delete)\("([^"]*)"\)', content):
            method = m.group(1).upper()
            path = m.group(2)
            full = re.sub(r'<string:(\w+)>', r'<\1>', re.sub(r'<path:(\w+)>', r'<\1>', prefix + path))
            # Categorize
            if full.startswith("/admin/"):
                cat = "Admin"
            elif full.startswith("/auth/"):
                cat = "Authentication"
            elif full.startswith("/workspaces/"):
                cat = "Workspaces"
            elif full.startswith("/entities/"):
                cat = "Entities"
            elif full.startswith("/blocks/"):
                cat = "Blocks"
            elif full.startswith("/relations/"):
                cat = "Relations"
            elif full.startswith("/tags/"):
                cat = "Tags"
            elif full.startswith("/comments/"):
                cat = "Comments"
            elif full.startswith("/properties/"):
                cat = "Properties"
            elif full.startswith("/branches/"):
                cat = "Branches"
            elif full.startswith("/versions/"):
                cat = "Versions"
            elif full.startswith("/diffs/"):
                cat = "Diffs"
            elif full.startswith("/search/"):
                cat = "Search"
            elif full.startswith("/ai/"):
                cat = "AI Assistant"
            elif full.startswith("/files/"):
                cat = "Files"
            elif full.startswith("/graph/"):
                cat = "Graph"
            elif full.startswith("/governance/"):
                cat = "Governance"
            elif full.startswith("/dashboard/"):
                cat = "Dashboard"
            elif full.startswith("/settings/"):
                cat = "Settings"
            elif full.startswith("/notifications/"):
                cat = "Notifications"
            elif full.startswith("/jobs/"):
                cat = "Jobs"
            elif full.startswith("/sync/"):
                cat = "Sync"
            elif full.startswith("/activity/"):
                cat = "Activity"
            elif full.startswith("/backups/"):
                cat = "Backups"
            else:
                cat = "Other"
            all_routes[cat].append((method, full))

# Generate output
print("# GNOVIUM API Reference (Auto-generated from code)")
print()
print("All API endpoints are served at `https://api.gnovium.com/v1` (production)")
print("or `http://localhost:5001/api/v1` (development).")
print()

for cat in sorted(all_routes):
    routes = sorted(all_routes[cat], key=lambda x: x[1])
    print(f"## {cat}")
    print()
    print("| Method | Endpoint |")
    print("|--------|----------|")
    for method, path in routes:
        print(f"| {method} | `{path}` |")
    print()

print("## System")
print()
print("| Method | Endpoint |")
print("|--------|----------|")
for method, path in sorted(root_routes, key=lambda x: x[1]):
    print(f"| {method} | `{path}` |")
print()
print("---")
print(f"**Total: {sum(len(v) for v in all_routes.values()) + len(root_routes)} endpoints**")
print()
print("_Auto-generated from Flask route registrations._")
