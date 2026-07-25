"use client";

import type { FileRecord } from "@/lib/types";
import { formatFileSize, formatRelativeTime } from "@/lib/utils";
import { getFileIcon, getFileIconColor } from "@/lib/utils/fileUtils";
import { cn } from "@/lib/utils";
import { fileService } from "@/lib/services/fileService";
import { Eye, Link, ExternalLink, Trash2 } from "lucide-react";
import { Checkbox } from "@/components/ui/Checkbox";

interface FileGridProps {
  files: FileRecord[];
  onPreview: (file: FileRecord) => void;
  onLink: (file: FileRecord) => void;
  onDelete: (file: FileRecord) => void;
  selectedFiles?: string[];
  onToggleSelect?: (fileId: string, shiftKey: boolean, metaKey: boolean) => void;
}

export function FileGrid({ files, onPreview, onLink, onDelete, selectedFiles, onToggleSelect }: FileGridProps) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {files.map((file) => {
        const Icon = getFileIcon(file.mime_type ?? "application/octet-stream");
        const iconColor = getFileIconColor(file.mime_type ?? "application/octet-stream");
        const isSelected = selectedFiles?.includes(file.id) ?? false;
        return (
          <div
            key={file.id}
            className={cn(
              "group relative rounded-lg border bg-zinc-900/50 p-4 text-left transition-colors hover:border-zinc-700",
              isSelected ? "border-white/40 bg-white/5" : "border-zinc-800"
            )}
          >
            {onToggleSelect && (
              <div
                className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity"
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
            <div className="flex items-center gap-3">
              <Icon className={cn("h-8 w-8 shrink-0", iconColor)} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-white">{file.file_name}</p>
                <p className="text-[11px] text-zinc-500">
                  {formatFileSize(file.file_size ?? 0)} · {formatRelativeTime(file.uploaded_at)}
                </p>
              </div>
            </div>
            <div className="mt-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={() => onPreview(file)}
                className="rounded p-1 text-zinc-500 hover:bg-zinc-800 hover:text-white"
                aria-label={`Preview ${file.file_name}`}
              >
                <Eye className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => onLink(file)}
                className="rounded p-1 text-zinc-500 hover:bg-zinc-800 hover:text-white"
                title="Link to Entity"
                aria-label={`Link ${file.file_name} to entity`}
              >
                <Link className="h-3.5 w-3.5" />
              </button>
              <a
                href={fileService.getDownloadUrl(file.id)}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded p-1 text-zinc-500 hover:bg-zinc-800 hover:text-white"
                aria-label={`Download ${file.file_name}`}
              >
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
              <button
                onClick={() => onDelete(file)}
                className="rounded p-1 text-zinc-500 hover:bg-zinc-800 hover:text-red-400"
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
