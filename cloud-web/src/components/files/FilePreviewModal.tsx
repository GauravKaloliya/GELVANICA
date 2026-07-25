"use client";

import { useState, useEffect } from "react";
import type { FileRecord } from "@/lib/types";
import { formatFileSize } from "@/lib/utils";
import { apiClient } from "@/lib/apiClient";
import { File, X, Loader2 } from "lucide-react";

interface FilePreviewModalProps {
  file: FileRecord;
  onClose: () => void;
}

const CODE_EXTENSIONS = /\.(js|ts|py|go|rs|java|c|cpp|h|css|html|json|yaml|yml|toml|xml|sql|sh|bash)$/i;

export function FilePreviewModal({ file, onClose }: FilePreviewModalProps) {
  const [textContent, setTextContent] = useState<string | null>(null);
  const [loadingText, setLoadingText] = useState(false);

  const isImage = file.mime_type?.startsWith("image/");
  const isPdf =
    file.mime_type === "application/pdf" ||
    file.file_name?.endsWith(".pdf");
  const isCode = CODE_EXTENSIONS.test(file.file_name || "");
  const isMarkdown =
    file.mime_type === "text/markdown" ||
    file.file_name?.endsWith(".md");
  const isText =
    file.mime_type?.startsWith("text/") || isCode || isMarkdown;

  const fileUrl = `/api/v1/files/${file.id}/download`;

  useEffect(() => {
    if (!isText || !file.id) return;
    setLoadingText(true);
    apiClient.get<{ data: string }>(`/files/${file.id}/content`)
      .then((res) => setTextContent(typeof res.data === "string" ? res.data : JSON.stringify(res.data)))
      .catch(() => setTextContent("Failed to load file content."))
      .finally(() => setLoadingText(false));
  }, [isText, file.id]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/80" onClick={onClose} />
      <div className="relative z-50 max-w-4xl w-full mx-4 rounded-xl border border-zinc-800 bg-zinc-900 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-white">
            {file.file_name}
          </h3>
          <button
            onClick={onClose}
            className="rounded p-1 text-zinc-500 hover:text-white"
            aria-label="Close preview"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {isImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={fileUrl}
            alt={file.file_name}
            className="max-h-[60vh] w-full object-contain rounded-lg"
          />
        ) : isPdf ? (
          <iframe
            src={fileUrl}
            title={file.file_name}
            sandbox="allow-same-origin allow-scripts allow-popups"
            className="h-[60vh] w-full rounded-lg border border-zinc-700"
          />
        ) : isText ? (
          <div className="max-h-[60vh] overflow-auto rounded-lg border border-zinc-700 bg-zinc-950">
            {loadingText ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-5 w-5 animate-spin text-zinc-500" />
              </div>
            ) : (
              <pre className="p-4 text-xs leading-relaxed text-zinc-300 whitespace-pre-wrap break-words font-mono">
                <code>{textContent}</code>
              </pre>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12">
            <File className="h-16 w-16 text-zinc-600" />
            <p className="mt-3 text-sm text-zinc-400">{file.mime_type}</p>
            <p className="text-xs text-zinc-600">
              {formatFileSize(file.file_size ?? 0)}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
