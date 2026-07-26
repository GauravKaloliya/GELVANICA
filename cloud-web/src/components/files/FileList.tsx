"use client";

import type { FileRecord } from "@/lib/types";
import { formatFileSize, formatRelativeTime } from "@/lib/utils";
import { getFileIcon, getFileIconColor } from "@/lib/utils/fileUtils";
import { cn } from "@/lib/utils";
import { fileService } from "@/lib/services/fileService";
import { Download, Trash2, Link } from "lucide-react";
import { Checkbox } from "@/components/ui/Checkbox";

interface FileListProps {
  workspaceId: string;
  files: FileRecord[];
  onLink: (file: FileRecord) => void;
  onDelete: (file: FileRecord) => void;
  selectedFiles?: string[];
  onToggleSelect?: (fileId: string, shiftKey: boolean, metaKey: boolean) => void;
}

export function FileList({ workspaceId, files, onLink, onDelete, selectedFiles, onToggleSelect }: FileListProps) {
  return (
    <div className="space-y-1 text-left">
      {files.map((file) => {
        const Icon = getFileIcon(file.mime_type ?? "application/octet-stream");
        const iconColor = getFileIconColor(file.mime_type ?? "application/octet-stream");
        const isSelected = selectedFiles?.includes(file.id) ?? false;
        return (
          <div
            key={file.id}
            className={cn(
              "group flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-surface",
              isSelected && "bg-white/5"
            )}
          >
            {onToggleSelect && (
              <div
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleSelect(file.id, e.shiftKey, e.metaKey || e.ctrlKey);
                }}
              >
                <Checkbox
                  checked={isSelected}
                  onCheckedChange={() => onToggleSelect(file.id, false, false)}
                />
              </div>
            )}
            <Icon className={cn("h-5 w-5 shrink-0", iconColor)} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm text-foreground">{file.file_name}</p>
            </div>
            <span className="text-xs text-muted">{formatFileSize(file.file_size ?? 0)}</span>
            <span className="text-xs text-muted">{formatRelativeTime(file.uploaded_at)}</span>
            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={() => onLink(file)}
                className="rounded p-1 text-muted hover:text-foreground"
                title="Link to Entity"
                aria-label={`Link ${file.file_name} to entity`}
              >
                <Link className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={async () => {
                  try {
                    const res = await fileService.getDownloadUrl(workspaceId, file.id);
                    window.open(res.data.presigned_url, '_blank');
                  } catch {}
                }}
                className="rounded p-1 text-muted hover:text-foreground"
                aria-label={`Download ${file.file_name}`}
              >
                <Download className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => onDelete(file)}
                className="rounded p-1 text-muted hover:text-red-400"
                aria-label={`Delete ${file.file_name}`}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
