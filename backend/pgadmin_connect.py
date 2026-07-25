"""
pgAdmin PostgreSQL Server Setup Helper

This script configures the pgAdmin server connection in its SQLite database.
If the server entry is missing, it creates one. It also generates a JSON file
for manual import via pgAdmin's GUI.

Usage:
  python3 pgadmin_connect.py          # configure server in pgAdmin DB
  python3 pgadmin_connect.py --import # generate importable JSON instead
"""

import argparse
import json
import os
import sqlite3

DB_PATH = os.path.expanduser("~/.pgadmin/pgadmin4.db")

_PASSWORD = os.getenv("PGADMIN_DB_PASSWORD", "")

SERVER_CONFIG = {
    "name": "GNOVIUM Cloud (PostgreSQL 14)",
    "host": "localhost",
    "port": 5432,
    "maintenance_db": "gnovium_cloud",
    "username": "gaurav",
    "comment": "Gnovium database - PostgreSQL 14 on localhost",
    "password": _PASSWORD,
}


def check_db_exists():
    if not os.path.isfile(DB_PATH):
        print(f"Error: pgAdmin database not found at {DB_PATH}")
        print("Make sure pgAdmin has been started at least once.")
        return False
    return True


def configure_server():
    if not check_db_exists():
        return False

    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    # Find existing user (default desktop user)
    cursor.execute("SELECT id FROM user WHERE email = 'pgadmin4@pgadmin.org'")
    user = cursor.fetchone()
    if not user:
        print("Error: No default user found in pgAdmin database.")
        conn.close()
        return False
    user_id = user["id"]

    # Check if server already configured
    cursor.execute(
        "SELECT id FROM server WHERE user_id = ? AND host = ? AND port = ? AND username = ?",
        (user_id, SERVER_CONFIG["host"], SERVER_CONFIG["port"], SERVER_CONFIG["username"]),
    )
    existing = cursor.fetchone()
    if existing:
        print(f"Server already configured (id={existing['id']}).")
        conn.close()
        return True

    # Get default server group
    cursor.execute("SELECT id FROM servergroup WHERE user_id = ?", (user_id,))
    group = cursor.fetchone()
    if not group:
        print("Error: No server group found.")
        conn.close()
        return False
    group_id = group["id"]

    # Insert server (password not stored — user will be prompted or can use master password)
    cursor.execute(
        """INSERT INTO server
           (user_id, servergroup_id, name, host, port, maintenance_db,
            username, comment, save_password, shared)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, 0)""",
        (
            user_id,
            group_id,
            SERVER_CONFIG["name"],
            SERVER_CONFIG["host"],
            SERVER_CONFIG["port"],
            SERVER_CONFIG["maintenance_db"],
            SERVER_CONFIG["username"],
            SERVER_CONFIG["comment"],
        ),
    )
    conn.commit()
    server_id = cursor.lastrowid
    conn.close()
    print(f"Server configured successfully (id={server_id}).")
    print(f"  Name:      {SERVER_CONFIG['name']}")
    print(f"  Host:      {SERVER_CONFIG['host']}:{SERVER_CONFIG['port']}")
    print(f"  Database:  {SERVER_CONFIG['maintenance_db']}")
    print(f"  Username:  {SERVER_CONFIG['username']}")
    print("Password was NOT stored for security.")
    if _PASSWORD:
        print("Password is configured via PGADMIN_DB_PASSWORD env var.")
    else:
        print("Set PGADMIN_DB_PASSWORD env var to configure a password.")
    return True


def generate_import_json():
    """Generate pgAdmin server JSON for manual import."""
    import_data = {
        "Servers": {
            "1": {
                "Name": SERVER_CONFIG["name"],
                "Group": "Servers",
                "Host": SERVER_CONFIG["host"],
                "Port": SERVER_CONFIG["port"],
                "MaintenanceDB": SERVER_CONFIG["maintenance_db"],
                "Username": SERVER_CONFIG["username"],
                "Comment": SERVER_CONFIG["comment"],
                "SSLMode": "prefer",
            }
        }
    }

    output_path = "pgadmin_server_import.json"
    with open(output_path, "w") as f:
        json.dump(import_data, f, indent=4)

    print(f"Import JSON written to {output_path}")
    print("To import: pgAdmin -> Tools -> Import/Export Servers -> Select this file.")
    return True


def verify_psql():
    """Run a quick psql verification."""
    import subprocess
    password = SERVER_CONFIG.get("password") or os.getenv("PGADMIN_DB_PASSWORD", "")
    if not password:
        print("Error: PGADMIN_DB_PASSWORD is not set. Cannot verify connection.")
        return False
    env = os.environ.copy()
    env["PGPASSWORD"] = password
    result = subprocess.run(
        [
            "psql",
            "-h", SERVER_CONFIG["host"],
            "-p", str(SERVER_CONFIG["port"]),
            "-U", SERVER_CONFIG["username"],
            "-d", SERVER_CONFIG["maintenance_db"],
            "-c", "SELECT current_database(), version();",
        ],
        env=env,
        capture_output=True,
        text=True,
    )
    if result.returncode == 0:
        print("PostgreSQL connection verified!")
        print(result.stdout)
    else:
        print("PostgreSQL connection FAILED:")
        print(result.stderr)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="pgAdmin PostgreSQL connection helper")
    parser.add_argument("--import", dest="gen_import", action="store_true",
                        help="Generate importable JSON only (no DB changes)")
    parser.add_argument("--verify", action="store_true",
                        help="Verify PostgreSQL connection with psql")
    args = parser.parse_args()

    if args.verify:
        verify_psql()
    elif args.gen_import:
        generate_import_json()
    else:
        configure_server()
