"use client";

import { useState, useCallback, useRef } from "react";
import { cn, formatFileSize } from "@/lib/utils";
import { FILE_UPLOAD } from "@/lib/config/constants";
import { fileService } from "@/lib/services/fileService";
import { useAuthStore } from "@/stores/authStore";
import { Progress } from "@/components/ui/Progress";
import { Upload, X, AlertCircle, Loader2, File } from "lucide-react";
import type { FileUploadResult } from "@/lib/types/file";

interface FileUploadProps {
  workspaceId: string;
  token: string;
  onUploadComplete?: (result?: FileUploadResult) => void;
  onUploadProgress?: (progress: number) => void;
  maxSizeMB?: number;
  accept?: string[];
  multiple?: boolean;
}

interface PendingFile {
  file: File;
  error?: string;
}

export function FileUpload({
  workspaceId,
  token,
  onUploadComplete,
  onUploadProgress,
  maxSizeMB = FILE_UPLOAD.MAX_SIZE_MB,
  accept = [...FILE_UPLOAD.ALLOWED_EXTENSIONS],
  multiple = true,
}: FileUploadProps) {
  const { tokens } = useAuthStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const authToken = token || tokens?.access_token || "";

  const validateFile = useCallback(
    (file: File): string | undefined => {
      if (file.size > maxSizeMB * 1024 * 1024) {
        return `${file.name} exceeds ${maxSizeMB}MB limit`;
      }
      if (accept.length > 0) {
        const ext = file.name.split(".").pop()?.toLowerCase() || "";
        if (!accept.includes(ext)) {
          return `${file.name} is not a supported file type`;
        }
      }
      return undefined;
    },
    [maxSizeMB, accept]
  );

  const handleUpload = useCallback(
    async (files: File[]) => {
      if (!authToken) return;
      setUploading(true);
      setUploadProgress(0);
      setUploadError(null);

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        try {
          const result = await fileService.upload(workspaceId, file, (pct) => {
            const progress = ((i + pct / 100) / files.length) * 100;
            setUploadProgress(progress);
            onUploadProgress?.(progress);
          });
          setUploadError(null);
        } catch (e) {
          setUploadError(`Failed to upload ${file.name}`);
        }
        onUploadComplete?.();
        const progress = ((i + 1) / files.length) * 100;
        setUploadProgress(progress);
        onUploadProgress?.(progress);
      }

      setUploading(false);
      setPendingFiles([]);
    },
    [authToken, workspaceId, onUploadComplete, onUploadProgress]
  );

  const processFiles = useCallback(
    (fileList: FileList) => {
      const files = Array.from(fileList);
      const validated: PendingFile[] = files.map((file) => ({
        file,
        error: validateFile(file),
      }));
      setPendingFiles(validated);
      setUploadError(null);

      const hasErrors = validated.some((f) => f.error);
      if (hasErrors) return;

      handleUpload(validated.map((f) => f.file));
    },
    [validateFile, handleUpload]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      if (e.dataTransfer.files.length > 0) {
        processFiles(e.dataTransfer.files);
      }
    },
    [processFiles]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragOver(false);
  }, []);

  const handleBrowse = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
        processFiles(e.target.files);
      }
    },
    [processFiles]
  );

  const handleClear = useCallback(() => {
    setPendingFiles([]);
    setUploadError(null);
    setUploadProgress(0);
  }, []);

  return (
    <div className="space-y-3">
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => !uploading && fileInputRef.current?.click()}
        className={cn(
          "relative cursor-pointer rounded-xl border-2 border-dashed p-8 text-center transition-colors",
dragOver
              ? "border-accent bg-accent/5"
              : "border-border card-hover",
          uploading && "pointer-events-none opacity-50"
        )}
      >
        {uploading ? (
          <div className="space-y-3">
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-muted" />
            <p className="text-sm text-muted">Uploading...</p>
            <Progress value={uploadProgress} size="md" />
            <p className="text-xs text-muted">
              {Math.round(uploadProgress)}%
            </p>
          </div>
        ) : (
          <>
            <Upload className="mx-auto h-8 w-8 text-muted" />
            <p className="mt-2 text-sm text-muted">
              Drag and drop files here, or click to browse
            </p>
            <p className="mt-1 text-xs text-muted">
              Max {maxSizeMB}MB per file ·{" "}
              {accept.length > 0
                ? accept.slice(0, 5).join(", ") +
                  (accept.length > 5 ? ` +${accept.length - 5} more` : "")
                : "All file types"}
            </p>
          </>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        multiple={multiple}
        onChange={handleBrowse}
        className="hidden"
      />

      {uploadError && (
        <div className="flex items-center gap-2 rounded-lg border border-red-500/20 bg-red-500/5 p-3 text-sm text-red-400">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {uploadError}
          <button
            onClick={handleClear}
            className="ml-auto"
            aria-label="Dismiss"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {pendingFiles.length > 0 && !uploading && (
        <div className="space-y-1.5">
          {pendingFiles.map((pf, i) => (
            <div
              key={i}
              className={cn(
                "flex items-center gap-3 rounded-lg border p-2.5 text-sm",
                pf.error
                  ? "border-red-500/20 bg-red-500/5 text-red-400"
                  : "border-border bg-card text-foreground"
              )}
            >
              <File className="h-4 w-4 shrink-0 text-muted" />
              <span className="truncate flex-1">{pf.file.name}</span>
              <span className="shrink-0 text-xs text-muted">
                {formatFileSize(pf.file.size)}
              </span>
              {pf.error && (
                <span className="shrink-0 text-xs text-red-400">
                  {pf.error}
                </span>
              )}
            </div>
          ))}
          <div className="flex justify-end pt-1">
            <button
              onClick={handleClear}
              className="rounded-lg border-border px-3 py-1.5 text-xs text-muted hover:bg-surface hover:text-foreground"
            >
              Clear
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
