import base64
import html as html_mod
import json
import os
import re
import subprocess
import uuid
import zipfile
from datetime import datetime, timezone

from typing import Any, Dict, List, Optional

from flask import current_app

from app.core.logging import logger
from app.models import (
    Block, EntityFile, EntityType,
    EntityTag, File, Property, Relation, Tag,
)
from app.repositories import EntityRepository

try:
    from weasyprint import HTML as WeasyHTML
except ImportError:
    WeasyHTML = None


class ExportService:
    """Service for exporting workspace data to JSON, Markdown, HTML, PDF, ZIP."""

    def __init__(self, entity_repo=None, zip_service=None):
        self.entity_repo = entity_repo or EntityRepository()
        self.zip_service = zip_service

    @staticmethod
    def serialize(records):
        if not records:
            return []
        from sqlalchemy import inspect as sa_inspect
        return [
            {
                c.key: (
                    str(val)
                    if isinstance(val, uuid.UUID)
                    or hasattr(val, "isoformat")
                    else val
                )
                for c in sa_inspect(type(r)).column_attrs
                for val in (getattr(r, c.key),)
            }
            for r in records
        ]

    def list_backups(self, workspace_id=None):
        """List available backup files on disk."""
        export_dir = os.path.join(current_app.instance_path, "exports", "json")
        backup_dir = os.path.join(current_app.instance_path, "backups")
        combined = []
        for directory in (export_dir, backup_dir):
            if not os.path.isdir(directory):
                continue
            for fname in sorted(os.listdir(directory), reverse=True):
                if not (fname.endswith(".json") or fname.endswith(".gnv")):
                    continue
                fpath = os.path.join(directory, fname)
                stat = os.stat(fpath)
                backup_workspace_id = None
                if fname.startswith("workspace_") and fname.endswith(".json"):
                    parts = fname.split("_")
                    if len(parts) >= 2:
                        backup_workspace_id = parts[1]
                elif fname.startswith("backup_") and fname.endswith(".gnv"):
                    parts = fname.split("_")
                    if len(parts) >= 2:
                        backup_workspace_id = parts[1]
                elif fname.startswith("gnovium_export_") and fname.endswith(".gnv"):
                    parts = fname.split("_")
                    if len(parts) >= 3:
                        backup_workspace_id = parts[2]
                if workspace_id and backup_workspace_id != workspace_id:
                    continue
                combined.append({
                    "filename": fname,
                    "path": fpath,
                    "size_bytes": stat.st_size,
                    "created_at": datetime.fromtimestamp(stat.st_mtime, tz=timezone.utc).isoformat(),
                    "workspace_id": backup_workspace_id,
                })
        return combined

    def export_workspace(self, workspace_id: str) -> Dict[str, Any]:
        """Serialize all workspace data into a JSON-compatible dict."""
        entities = self.entity_repo.query().filter_by(workspace_id=workspace_id, is_deleted=False).all()
        entity_types = EntityType.query.filter_by(workspace_id=workspace_id, is_deleted=False).all()
        properties = Property.query.filter_by(workspace_id=workspace_id, is_deleted=False).all()
        relations = Relation.query.filter_by(workspace_id=workspace_id, is_deleted=False).all()
        tags = Tag.query.filter_by(workspace_id=workspace_id, is_deleted=False).all()
        blocks = (
            Block.query.filter(
                Block.entity_id.in_([e.id for e in entities]),
                Block.is_deleted.is_(False),
            ).all()
        )
        from app.models import Comment
        comments = Comment.query.filter_by(workspace_id=workspace_id, is_deleted=False).all()
        files = File.query.filter_by(workspace_id=workspace_id, is_deleted=False).all()
        entity_files_records = EntityFile.query.filter(
            EntityFile.is_deleted.is_(False),
            EntityFile.entity_id.in_([e.id for e in entities]),
        ).all() if entities else []

        return {
            "exported_at": datetime.now(timezone.utc).isoformat(),
            "workspace_id": str(workspace_id),
            "entity_types": self.serialize(entity_types),
            "entities": self.serialize(entities),
            "properties": self.serialize(properties),
            "relations": self.serialize(relations),
            "tags": self.serialize(tags),
            "blocks": self.serialize(blocks),
            "comments": self.serialize(comments),
            "files": self.serialize(files),
            "entity_files": self.serialize(entity_files_records),
        }

    def export_to_disk(self, workspace_id: str, output_dir: Optional[str] = None) -> str:
        """Write the workspace backup JSON to disk and return the file path."""
        data = self.export_workspace(workspace_id)
        if output_dir is None:
            output_dir = os.path.join(current_app.instance_path, "exports", "json")
        os.makedirs(output_dir, exist_ok=True)
        timestamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
        path = os.path.join(output_dir, f"workspace_{workspace_id}_{timestamp}.json")
        try:
            with open(path, "w") as f:
                json.dump(data, f, indent=2, default=str)
        except OSError as exc:
            raise RuntimeError(f"Failed to write export file: {exc}") from exc
        return path

    # ─── Entity rendering helpers ──────────────────────────────────

    def _get_entity_blocks(self, entity_id):
        is_cloud = current_app.config.get("GNOVIUM_MODE") == "cloud"
        if is_cloud:
            return (
                Block.query.filter(
                    Block.entity_id == entity_id,
                    Block.is_deleted.is_(False),
                )
                .order_by(Block.position.asc())
                .all()
            )
        return (
            Block.query.filter(
                Block.entity_id == entity_id,
                Block.branch_id == "main",
                Block.is_deleted.is_(False),
            )
            .order_by(Block.position.asc())
            .all()
        )

    def _get_entity_tags(self, entity_id):
        etags = EntityTag.query.filter_by(entity_id=entity_id, is_deleted=False).all()
        tag_ids = [et.tag_id for et in etags]
        if not tag_ids:
            return []
        tags = Tag.query.filter(Tag.id.in_(tag_ids), Tag.is_deleted.is_(False)).all()
        return [t.name for t in tags]

    def _get_entity_type_name(self, entity_type_id):
        et = EntityType.query.filter_by(id=entity_type_id, is_deleted=False).first()
        return et.name if et else "Unknown"

    def _block_to_markdown(self, block):
        content = block.content or {}
        text = content.get("text", "")
        btype = block.type or "text"
        indent_val = getattr(block, "indent", 0) or 0
        prefix = "  " * indent_val
        if btype == "heading1":
            return f"\n# {text}\n"
        elif btype == "heading2":
            return f"\n## {text}\n"
        elif btype == "heading3":
            return f"\n### {text}\n"
        elif btype == "todo":
            checked = content.get("checked", False)
            mark = "x" if checked else " "
            return f"{prefix}- [{mark}] {text}"
        elif btype == "bulleted_list":
            return f"{prefix}- {text}"
        elif btype == "numbered_list":
            return f"{prefix}1. {text}"
        elif btype == "toggle":
            return f"\n<details><summary>{html_mod.escape(text)}</summary>\n"
        elif btype == "quote":
            return f"{prefix}> {text}"
        elif btype == "callout":
            icon = content.get("icon", "💡")
            return f"{prefix}> {icon} {text}"
        elif btype == "divider":
            return "---"
        elif btype == "code":
            lang = content.get("language", "")
            return f"```{lang}\n{text}\n```"
        elif btype == "image":
            url = content.get("url", "")
            alt = content.get("alt", text or "image")
            return f"![{alt}]({url})"
        elif btype == "video":
            url = content.get("url", "")
            return f"[Video: {text}]({url})"
        elif btype == "file":
            url = content.get("url", "")
            return f"[{text or 'File'}]({url})"
        else:
            return f"{prefix}{text}"

    def _blocks_to_markdown_body(self, blocks):
        lines = []
        for b in blocks:
            md = self._block_to_markdown(b)
            if md is not None:
                lines.append(md)
        return "\n\n".join(lines)

    def _sanitize_filename(self, title):
        name = re.sub(r"[^\w\s-]", "", title or "Untitled")
        name = re.sub(r"\s+", "-", name.strip())
        return name[:80] or "Untitled"

    # ─── Markdown export ────────────────────────────────────────────

    def export_markdown(self, workspace_id: str) -> Dict[str, Any]:
        """Export every entity in the workspace as a markdown file with YAML front-matter."""
        entities = self.entity_repo.query().filter_by(workspace_id=workspace_id, is_deleted=False).all()
        all_entity_ids = [e.id for e in entities]
        all_entity_type_ids = list({e.entity_type_id for e in entities if e.entity_type_id})
        is_cloud = current_app.config.get("GNOVIUM_MODE") == "cloud"

        all_blocks: List[Block] = []
        if all_entity_ids:
            block_q = Block.query.filter(
                Block.entity_id.in_(all_entity_ids),
                Block.is_deleted.is_(False),
            )
            if not is_cloud:
                block_q = block_q.filter(Block.branch_id == "main")
            all_blocks = block_q.order_by(Block.entity_id, Block.position.asc()).all()

        blocks_by_entity: Dict[str, List[Block]] = {}
        for block in all_blocks:
            blocks_by_entity.setdefault(str(block.entity_id), []).append(block)

        etags = EntityTag.query.filter(
            EntityTag.entity_id.in_(all_entity_ids),
            EntityTag.is_deleted.is_(False),
        ).all() if all_entity_ids else []
        tag_ids = list({et.tag_id for et in etags})
        tag_rows = Tag.query.filter(
            Tag.id.in_(tag_ids),
            Tag.is_deleted.is_(False),
        ).all() if tag_ids else []
        tag_name_map = {str(t.id): t.name for t in tag_rows}
        tags_by_entity: Dict[str, List[str]] = {}
        for et in etags:
            name = tag_name_map.get(str(et.tag_id))
            if name:
                tags_by_entity.setdefault(str(et.entity_id), []).append(name)

        type_rows = EntityType.query.filter(
            EntityType.id.in_(all_entity_type_ids),
            EntityType.is_deleted.is_(False),
        ).all() if all_entity_type_ids else []
        type_name_map = {str(et.id): et.name for et in type_rows}

        files: List[Dict[str, Any]] = []
        for entity in entities:
            entity_blocks = blocks_by_entity.get(str(entity.id), [])
            body = self._blocks_to_markdown_body(entity_blocks)
            tags = tags_by_entity.get(str(entity.id), [])
            type_name = type_name_map.get(str(entity.entity_type_id), "Unknown")
            frontmatter = {
                "entity_id": str(entity.id),
                "name": entity.name or "Untitled",
                "type": type_name,
                "created_at": entity.created_at.isoformat() if entity.created_at else None,
                "updated_at": entity.updated_at.isoformat() if entity.updated_at else None,
                "tags": tags,
            }
            fm_yaml = "---\n"
            for k, v in frontmatter.items():
                if isinstance(v, list):
                    fm_yaml += f"{k}: {json.dumps(v)}\n"
                elif v is None:
                    fm_yaml += f"{k}: null\n"
                elif isinstance(v, str):
                    fm_yaml += f"{k}: {json.dumps(v)}\n"
                else:
                    fm_yaml += f"{k}: {v}\n"
            fm_yaml += "---\n\n"
            filename = self._sanitize_filename(entity.name) + ".md"
            files.append({
                "entity_id": str(entity.id),
                "filename": filename,
                "content": fm_yaml + body,
                "frontmatter": frontmatter,
            })
        return {"files": files}

    # ─── ZIP export ──────────────────────────────────────────────────

    def export_zip(self, workspace_id: str) -> Dict[str, Any]:
        """Bundle markdown exports and uploaded assets into a ZIP archive."""
        md_data = self.export_markdown(workspace_id)
        export_dir = os.path.join(current_app.instance_path, "exports", "zip")
        os.makedirs(export_dir, exist_ok=True)
        timestamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
        zip_name = f"workspace_{workspace_id}_{timestamp}.zip"
        zip_path = os.path.join(export_dir, zip_name)

        entity_ids = [f["entity_id"] for f in md_data["files"]]
        files = File.query.filter(
            File.workspace_id == workspace_id,
            File.is_deleted.is_(False),
        ).all() if entity_ids else []

        try:
            with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as zf:
                for f in md_data["files"]:
                    zf.writestr(f["filename"], f["content"])
                for f in files:
                    if f.storage_provider == "local" and f.object_key:
                        if not f.object_key or ".." in f.object_key or f.object_key.startswith("/") or "\\" in f.object_key:
                            continue
                        local_path = os.path.join(current_app.instance_path, "objects", f.object_key)
                        if os.path.exists(local_path):
                            safe_arcname = f.file_name.replace("/", "_").replace("\\", "_")
                            arcname = f"assets/{safe_arcname}"
                            zf.write(local_path, arcname)
                zf.writestr("_index.json", json.dumps({
                    "workspace_id": str(workspace_id),
                    "exported_at": datetime.now(timezone.utc).isoformat(),
                    "file_count": len(md_data["files"]),
                    "files": [{
                        "entity_id": f["entity_id"],
                        "filename": f["filename"],
                        "size": len(f["content"].encode("utf-8")),
                    } for f in md_data["files"]],
                }, indent=2))
        except (OSError, zipfile.BadZipFile) as exc:
            raise RuntimeError(f"Failed to create ZIP export: {exc}") from exc

        return {"path": zip_path, "file_count": len(md_data["files"])}

    # ─── Secure ZIP export (encrypted + signed) ─────────────────────

    def _get_zip_service(self):
        if self.zip_service is not None:
            return self.zip_service
        from app.services.zip_service import ZipService
        return ZipService()

    def export_secure_zip(self, workspace_id: str) -> Dict[str, Any]:
        """Export workspace as an encrypted, signed .gnv archive."""
        return self._get_zip_service().export_workspace_to_zip(workspace_id)

    def import_secure_zip(self, zip_path: str, workspace_id: str, expected_source: str = None) -> Dict[str, Any]:
        """Import workspace from an encrypted, signed .gnv archive."""
        return self._get_zip_service().import_workspace_from_zip(zip_path, workspace_id, expected_source=expected_source)

    # ─── HTML export ─────────────────────────────────────────────────

    def export_html(self, workspace_id: str, entity_id: str, block_id: Optional[str] = None) -> Dict[str, str]:
        """Render a single entity as a standalone HTML page."""
        entity = self.entity_repo.get(entity_id)
        blocks = self._get_entity_blocks(entity.id)
        if block_id:
            blocks = [b for b in blocks if b.id == block_id]
        tags = self._get_entity_tags(entity.id)
        type_name = self._get_entity_type_name(entity.entity_type_id)

        e = html_mod.escape

        body_parts = []
        for b in blocks:
            content = b.content or {}
            text = content.get("text", "")
            btype = b.type or "text"
            indent_val = getattr(b, "indent", 0) or 0
            indent_style = f"margin-left: {indent_val * 24}px;" if indent_val else ""
            if btype == "heading1":
                body_parts.append(f'<h1 style="{indent_style}">{e(text)}</h1>')
            elif btype == "heading2":
                body_parts.append(f'<h2 style="{indent_style}">{e(text)}</h2>')
            elif btype == "heading3":
                body_parts.append(f'<h3 style="{indent_style}">{e(text)}</h3>')
            elif btype == "todo":
                checked = content.get("checked", False)
                mark = "✓" if checked else "○"
                body_parts.append(f'<p style="{indent_style}">{e(mark)} {e(text)}</p>')
            elif btype == "bulleted_list":
                body_parts.append(f'<p style="{indent_style}">• {e(text)}</p>')
            elif btype == "numbered_list":
                body_parts.append(f'<p style="{indent_style}">1. {e(text)}</p>')
            elif btype == "quote":
                body_parts.append(f'<blockquote style="{indent_style}border-left:3px solid #ccc;padding-left:12px;">{e(text)}</blockquote>')
            elif btype == "callout":
                icon = content.get("icon", "💡")
                body_parts.append(f'<div style="{indent_style}background:#f0f0f0;padding:12px;border-radius:6px;">{e(icon)} {e(text)}</div>')
            elif btype == "divider":
                body_parts.append('<hr/>')
            elif btype == "code":
                content.get("language", "")
                body_parts.append(f'<pre style="{indent_style}background:#1e1e1e;color:#d4d4d4;padding:16px;border-radius:6px;overflow-x:auto;"><code>{e(text)}</code></pre>')
            elif btype == "image":
                url = content.get("url", "")
                alt = content.get("alt", text or "image")
                if url and not url.startswith("http"):
                    try:
                        objects_dir = os.path.join(current_app.instance_path, "objects")
                        img_path = os.path.join(objects_dir, url.lstrip("/"))
                        if os.path.isfile(img_path):
                            with open(img_path, "rb") as img_f:
                                img_data = img_f.read()
                                mime = content.get("mime_type", "image/png")
                                b64 = base64.b64encode(img_data).decode("ascii")
                                url = f"data:{mime};base64,{b64}"
                    except Exception:
                        pass
                body_parts.append(f'<img src="{e(url)}" alt="{e(alt)}" style="max-width:100%;{indent_style}"/>')
            else:
                body_parts.append(f'<p style="{indent_style}">{e(text)}</p>')

        tags_html = "".join(
            f'<span style="background:#e0e0e0;padding:2px 8px;border-radius:4px;margin-right:4px;font-size:0.85em;">{e(t)}</span>'
            for t in tags
        )
        body_html = "\n".join(body_parts)
        entity_title = e(entity.name or 'Untitled')
        type_name_esc = e(type_name)

        html_output = f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{entity_title}</title>
<style>
  body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 800px; margin: 40px auto; padding: 0 20px; color: #333; line-height: 1.6; }}
  h1 {{ border-bottom: 2px solid #eee; padding-bottom: 8px; }}
  .meta {{ color: #666; font-size: 0.9em; margin-bottom: 24px; }}
</style>
</head>
<body>
  <h1>{entity_title}</h1>
  <div class="meta">
    <span>Type: {type_name_esc}</span> &middot;
    <span>Created: {entity.created_at.strftime('%Y-%m-%d') if entity.created_at else 'N/A'}</span> &middot;
    <span>Updated: {entity.updated_at.strftime('%Y-%m-%d') if entity.updated_at else 'N/A'}</span>
    {f'<br/>Tags: {tags_html}' if tags else ''}
  </div>
  {body_html}
</body>
</html>"""

        filename = self._sanitize_filename(entity.name) + ".html"
        return {"html": html_output, "filename": filename}

    # ─── PDF export ──────────────────────────────────────────────────

    def export_pdf(self, workspace_id: str, entity_id: str, block_id: Optional[str] = None) -> Dict[str, str]:
        """Export a single entity as a PDF file.

        Tries wkhtmltopdf, chromium, google-chrome in order,
        falling back to WeasyPrint. If no converter is available, returns
        the HTML fallback path instead.
        """
        html_data = self.export_html(workspace_id, entity_id, block_id=block_id)
        entity = self.entity_repo.get(entity_id)
        export_dir = os.path.join(current_app.instance_path, "exports", "pdf")
        os.makedirs(export_dir, exist_ok=True)
        timestamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
        safe_name = self._sanitize_filename(entity.name)
        filename = f"{safe_name}_{timestamp}.pdf"
        pdf_path = os.path.join(export_dir, filename)

        import tempfile
        tmp = tempfile.NamedTemporaryFile(suffix=".html", delete=False, mode="w", encoding="utf-8")
        html_path = tmp.name
        try:
            tmp.write(html_data["html"])
        finally:
            tmp.close()

        converted = False
        try:
            for cmd in [
                ["wkhtmltopdf", "--quiet", html_path, pdf_path],
                ["chromium-browser", "--headless", "--disable-gpu", "--no-margins", "--virtual-time-budget=5000", f"--print-to-pdf={pdf_path}", html_path],
                ["chromium", "--headless", "--disable-gpu", "--no-margins", "--virtual-time-budget=5000", f"--print-to-pdf={pdf_path}", html_path],
                ["google-chrome", "--headless", "--disable-gpu", "--no-margins", "--virtual-time-budget=5000", f"--print-to-pdf={pdf_path}", html_path],
            ]:
                try:
                    result = subprocess.run(cmd, capture_output=True, timeout=30)
                    if result.returncode == 0 and os.path.exists(pdf_path) and os.path.getsize(pdf_path) > 0:
                        converted = True
                        break
                except (FileNotFoundError, subprocess.TimeoutExpired):
                    continue

            if not converted and WeasyHTML is not None:
                try:
                    WeasyHTML(filename=html_path).write_pdf(pdf_path)
                    converted = True
                except Exception as exc:
                    logger.warning("weasyprint_pdf_failed", error=str(exc))
        finally:
            try:
                if os.path.exists(html_path):
                    os.remove(html_path)
            except OSError:
                pass

        if not converted:
            fallback_html_path = os.path.join(export_dir, html_data["filename"])
            try:
                with open(fallback_html_path, "w", encoding="utf-8") as f:
                    f.write(html_data["html"])
            except OSError:
                pass
            return {"path": fallback_html_path, "filename": html_data["filename"],
                    "note": "PDF conversion unavailable; HTML fallback provided"}

        return {"path": pdf_path, "filename": filename}
