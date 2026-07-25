# Local App Storage Architecture

## Overview

The GNOVIUM Electron app manages local file storage across three domains:

1. **Application data** — user data directory containing settings, cache, SQLite databases, and backup encryption keys
2. **User files** — file uploads, downloads, and exports stored within allowed user directories
3. **Backups** — encrypted workspace archives and export formats

All file system access is mediated through a path validation layer that restricts operations to a set of approved directories. The app communicates with a Flask backend at `http://127.0.0.1:5001` by default (configurable via FLASK_HOST and FLASK_PORT environment variables).

## Root Directory Layout

### Allowed Directories

The Electron app grants file system access to exactly four directories:

| Directory | Electron Path | Purpose |
|-----------|---------------|---------|
| `userData` | Electron's `app.getPath('userData')` | Settings, database, encryption keys, cache |
| `documents` | Electron's `app.getPath('documents')` | User document storage for exports |
| `downloads` | Electron's `app.getPath('downloads')` | Download destination for exported files |
| `temp` | Electron's `app.getPath('temp')` | Temporary file staging |

Any path operation outside these four directories is rejected with a path error.

### userData Contents

```
{userData}/
├── settings.json             — Application configuration
├── local.db                  — SQLite database
├── auth.json                 — Auth tokens (encrypted with safeStorage)
├── backup-keys.json          — Backup encryption keys (encrypted with safeStorage)
├── backup-keys.json.old      — Previous backup key (during rotation)
├── logs/
│   ├── gnovium-{timestamp}.log   — App logs (rotated, max 10MB each, 10 files max)
│   └── ...
└── .../
```

## Path Validation

All file system interactions pass through a path validation layer:

1. The requested path is resolved to an absolute path using `path.resolve()`
2. The resolved path must start with (or equal) one of the four allowed directories, each normalized to include a trailing separator
3. If validation fails, a path error is thrown
4. Validated paths are used for read, write, list, and delete operations

Additional safeguards:
- Filenames are checked for path separators (`/`, `\`) and parent directory references (`..`)
- File paths for ZIP import are resolved and validated before processing
- Flask API backup restore paths must be within the allowed backup/exports directories

## Data Flow

The app uses Electron IPC channels to bridge the renderer process to the Flask backend. File-related IPC handlers:

### File Operations

| Channel | Method | Description |
|---------|--------|-------------|
| `file:list` | GET | List files with optional filters |
| `file:get` | GET | Get file metadata |
| `file:upload` | POST | Upload a file via multipart form data |
| `file:download` | GET | Download file content (as base64 or save to disk) |
| `file:delete` | DELETE | Soft-delete a file |
| `file:link` | POST | Link a file to an entity |
| `file:unlink` | DELETE | Unlink a file from an entity |
| `file:cleanup-orphans` | POST | Remove unlinked file records |

### Backup Operations

| Channel | Description |
|---------|-------------|
| `backup:export` | Export a workspace as JSON |
| `backup:import` | Import workspace from JSON data |
| `backup:list` | List available backup files |
| `backup:auto-backup` | Trigger an automatic backup for a workspace |
| `backup:export-to-disk` | Export workspace JSON to a specified path |
| `backup:start-timer` | Start the periodic auto-backup timer |
| `backup:stop-timer` | Stop the periodic auto-backup timer |
| `backup:export-encrypted` | Export workspace encrypted with a password (AES-256-GCM) |
| `backup:import-encrypted` | Import workspace from encrypted data |
| `backup:change-password` | Re-encrypt existing backup data with a new password |
| `backup:export-markdown` | Export workspace as Markdown files |
| `backup:export-zip` | Export workspace as an unencrypted ZIP |
| `backup:export-html` | Export a single entity as HTML |
| `backup:export-pdf` | Export a single entity as PDF |
| `backup:export-zip-encrypted` | Export workspace as an encrypted `.gnv` archive |
| `backup:import-zip` | Import workspace from an encrypted `.gnv` archive |
| `backup:delete` | Delete a backup by ID |
| `backup:rotate-key` | Rotate the backup encryption key |

### Filesystem Operations

| Channel | Description |
|---------|-------------|
| `filesystem:read-file` | Read a file from disk (returns base64) |
| `filesystem:write-file` | Write base64 data to a file on disk |
| `filesystem:list-dir` | List directory contents with metadata |
| `filesystem:delete-file` | Delete a file from disk |

## File Upload Flow

1. Client requests `file:upload` via IPC with a file path and optional workspace ID
2. The file path is validated through the path validation layer
3. The filename is checked for path separators
4. File size is checked against the 100 MB limit
5. File contents are read from disk
6. Magic byte validation: the first 16 bytes are checked against known magic byte signatures (PNG, JPEG, GIF, WebP, PDF, ZIP, GZIP)
7. The detected MIME type is checked against the allowed MIME types list
8. A concurrent upload slot is acquired (max 10 concurrent uploads)
9. A multipart form request is sent to the Flask upload endpoint with the file buffer and workspace ID
10. The Bearer token is attached if available
11. The response is returned to the renderer
12. The upload slot is released

## File Download Flow

1. Client requests `file:download` via IPC with a file ID and optional save path
2. The file ID is validated as a UUID v4
3. A GET request is sent to the Flask download endpoint with the Bearer token
4. The response body is read as an ArrayBuffer
5. If a save path is provided: the buffer is written to that path (validated first)
6. If no save path: the buffer is returned as base64-encoded data

## Export and Backup Tiers

### Tier 1: JSON Export

Full workspace serialized to a JSON file. All entities, blocks, relations, tags, properties, comments, files, and entity-file links are included. Written to `<instance_path>/exports/json/`.

### Tier 2: ZIP Export

Markdown representations of every entity plus uploaded file assets bundled into a standard ZIP archive. Written to `<instance_path>/exports/zip/`. The ZIP contains:

- One `.md` file per entity with YAML front matter
- An `assets/` directory with uploaded files
- An `_index.json` manifest

Backup files on disk follow naming conventions:
- JSON exports: `workspace_{workspace_id}_{timestamp}.json`
- Encrypted archives: `backup_{workspace_id}_{timestamp}.gnv`
- ZIP exports: `workspace_{workspace_id}_{timestamp}.zip`

### Tier 3: Encrypted `.gnv` Archive

A password-free, encrypted workspace backup using AES-256-GCM encryption and HMAC-SHA256 signing. The encryption key is stored securely using Electron's safeStorage API. Key properties:

- **Encryption**: AES-256-GCM with random 12-byte IV and 16-byte authentication tag
- **Key derivation**: scrypt with a random 16-byte salt
- **Integrity**: HMAC-SHA256 of the AES ciphertext using a separate derived key
- **Format**: Binary file with a magic header, encrypted data, and HMAC signature
- **Source tracking**: Each archive is tagged with the creating mode (`local` or `cloud`). Cloud can only import archives created by local, and vice versa (bidirectional sync validation)
- **Content**: Full workspace data, entity types, tags, properties, entities, relations, blocks, comments, and file records (file binaries from local storage)

### Tier 4: HTML Export

A single entity rendered as a standalone HTML page with inline CSS. File assets embedded as base64 data URIs when they exist on local disk.

### Tier 5: PDF Export

Generated from the HTML export. Tries, in order:
- `wkhtmltopdf`
- `chromium-browser` / `chromium` / `google-chrome` headless
- WeasyPrint (as fallback)
If no converter is available, the HTML file is provided as fallback.

## Encryption

### Backup Key Rotation

Backup encryption keys are managed through Electron's `safeStorage` API (OS-level encryption):

1. Keys are stored in `backup-keys.json` inside `userData`, encrypted with `safeStorage.encryptString()`
2. On first access, a new 32-byte random key is generated and saved
3. Key rotation: the current encrypted key is saved to `backup-keys.json.old`, a new key is generated and saved
4. Key format: 32 bytes of cryptographically random data, hex-encoded

### Client-Side Encryption (Password-Based)

For password-encrypted exports:

- **Algorithm**: AES-256-GCM
- **Key derivation**: scrypt with random 16-byte salt
- **IV**: Random 12 bytes per encryption
- **Auth tag**: 16 bytes appended to ciphertext
- **Storage format**: `salt (16) + iv (12) + authTag (16) + ciphertext (variable)`
- **Password change**: decrypt with old password, re-encrypt with new password

## Auto-Backup

The app supports periodic automatic backups:

1. A timer is started via `backup:start-timer` with an interval from settings (default 24 hours)
2. On each tick, the app reads settings, fetches all workspaces, and exports each one via the backup export endpoint
3. The timer can be stopped via `backup:stop-timer`
4. Errors are logged but do not stop the timer

## Logging

The app writes logs to `userData/logs/` directory:

- Log files named `gnovium-{timestamp}.log`
- Max 10 MB per file before rotation
- Rotates up to 10 files, deleting the oldest
- Log buffer is flushed to disk every 5 seconds
- Console output in development mode

## Auth Token Storage

Authentication tokens are persisted in `userData/auth.json` encrypted with Electron's `safeStorage` API (OS-level encryption). Key behavior:

- Tokens are written to disk after initial authentication and after each refresh
- Automatic refresh is scheduled 5 minutes before token expiry
- On refresh failure, tokens are cleared and the user must re-authenticate
- On logout, the auth file is deleted from disk

## Handler Middleware

All IPC handlers pass through a middleware chain with three layers:

1. **Logging middleware** — logs channel name, arguments summary, and execution duration
2. **Rate-limit middleware** — enforces per-channel rate limits
3. **Auth-check middleware** — verifies authentication state before handler execution

Errors in handlers are caught and serialized to a standard format with `code`, `message`, and optional `details` fields.

## Security Model

### Token Management

API tokens are held by an authentication service. All Flask API calls include the Bearer token when available.

### Request Retry

Flask API requests have exponential backoff retry logic:
- Up to 3 retries
- Initial delay: 500ms, doubled each attempt
- Retryable: HTTP 429 (rate limited) and 5xx (server errors)
- Request body limited to 10 MB
- Request timeout: 30 seconds

### File Upload Limits

- Maximum concurrent uploads: 10
- Maximum file size: 100 MB
- Maximum request body: 10 MB (for JSON API calls)

### Magic Byte Validation

The app validates the first 16 bytes of uploaded files against known signatures:
- PNG: `89 50 4E 47`
- JPEG: `FF D8 FF`
- GIF: `47 49 46 38`
- WebP: `52 49 46 46`
- PDF: `25 50 44 46`
- ZIP: `50 4B 03 04`
- GZIP: `1F 8B`

### Allowed MIME Types (Client-Side)

```
image/png, image/jpeg, image/gif, image/webp, image/svg+xml
application/pdf, application/zip, application/gzip
text/plain, text/markdown, text/csv, text/html
application/json, application/xml
video/mp4, video/webm, video/quicktime
audio/mpeg, audio/wav, audio/ogg
```

## Settings

Settings are stored as `settings.json` in the `userData` directory. The settings file is read/written directly using the filesystem. Reads return an empty object if the file does not exist yet. Settings include backup interval configuration used by the auto-backup timer and other application preferences.

## Local File Deletion

In local mode, the backend uses a LocalFileRepository that physically removes file data from disk when a file record is deleted or soft-deleted. This includes:

- The main file object from `objects/original/{prefix}/{hash}`
- All variant files from `objects/thumbnail/`, `objects/preview/`, `objects/optimized/`
- Empty parent directories are cleaned up after deletion

In cloud mode, deletion is logical only — S3 lifecycle rules handle physical object cleanup.
