"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import { useParams } from "next/navigation";
import { useAuthStore } from "@/stores/authStore";
import { FILE_UPLOAD } from "@/lib/config/constants";
import { fileService } from "@/lib/services/fileService";
import type { FileRecord, FileUploadResult } from "@/lib/types";
import { cn, formatFileSize } from "@/lib/utils";
import { ConfirmDialog } from "@/components/modals/ConfirmDialog";
import { FileGrid } from "@/components/files/FileGrid";
import { FileList } from "@/components/files/FileList";
import { FilePreviewModal } from "@/components/files/FilePreviewModal";
import { FileLinkModal } from "@/components/files/FileLinkModal";
import { FileToolbar } from "@/components/files/FileToolbar";
import { UploadProgress } from "@/components/files/UploadProgress";
import { BulkActionBar } from "@/components/shared/BulkActionBar";
import { Checkbox } from "@/components/ui/Checkbox";
import { FileUpload } from "@/components/files/FileUpload";
import { StorageIndicator } from "@/components/files/StorageIndicator";
import {
  Upload,
  Loader2,
  X,
  AlertCircle,
  Sparkles,
  Check,
  Trash2,
} from "lucide-react";
import { Skeleton } from "@/components/ui/Skeleton";
export default function FilesPage() {
  const params = useParams();
  const { tokens } = useAuthStore();
  const workspaceId = params.id as string;
  const token = tokens?.access_token || "";
  const [files, setFiles] = useState<FileRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [previewFile, setPreviewFile] = useState<FileRecord | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<FileRecord | null>(null);
  const [linkTarget, setLinkTarget] = useState<FileRecord | null>(null);
  const [entityIdInput, setEntityIdInput] = useState("");
  const [linking, setLinking] = useState(false);
  const [linkSuccess, setLinkSuccess] = useState<string | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const [lastClickedFileIndex, setLastClickedFileIndex] = useState<number | null>(null);
  const [cleaningOrphans, setCleaningOrphans] = useState(false);
  const [orphanResult, setOrphanResult] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<"name" | "size" | "date" | "type">("date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [filterType, setFilterType] = useState<string>("all");
  const [sizeFilter, setSizeFilter] = useState<string>("all");
  const [stateFilter, setStateFilter] = useState<string>("all");
  const [storageInfo, setStorageInfo] = useState<{ used_bytes: number; quota_bytes: number; max_file_size: number; file_count: number } | null>(null);

  const fetchFiles = useCallback(async () => {
    setLoading(true);
    try {
      const json = await fileService.list(workspaceId);
      setFiles(json.data || []);
    } catch {
      // handle error
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  const fetchStorageInfo = useCallback(async () => {
    try {
      const json = await fileService.getStorageStats(workspaceId);
      if (json?.data) {
        setStorageInfo(json.data);
      }
    } catch {
      // ignore
    }
  }, [workspaceId]);

  useEffect(() => {
    document.title = 'Files | Gnovium'
  }, [])

  useEffect(() => {
    fetchFiles();
    fetchStorageInfo();
  }, [fetchFiles, fetchStorageInfo]);

  const handleUpload = useCallback(
    async (selectedFiles: FileList) => {
      const fileArray = Array.from(selectedFiles);
      const oversized = fileArray.find((f) => f.size > FILE_UPLOAD.MAX_SIZE_MB * 1024 * 1024);
      if (oversized) {
        setUploadError(`${oversized.name} exceeds ${FILE_UPLOAD.MAX_SIZE_MB}MB limit`);
        return;
      }

      setUploading(true);
      setUploadError(null);
      setUploadProgress(0);

      const results: FileUploadResult[] = [];
      for (let i = 0; i < fileArray.length; i++) {
        const file = fileArray[i];
        try {
          const uploaded = await fileService.upload(workspaceId, file, (pct) => {
            setUploadProgress(((i + pct / 100) / fileArray.length) * 100);
          });
          results.push(uploaded as FileUploadResult);
        } catch {
          // continue with other files
        }
        setUploadProgress(((i + 1) / fileArray.length) * 100);
      }

      fetchFiles();
      fetchStorageInfo();
      setUploading(false);
    },
    [workspaceId, fetchFiles, fetchStorageInfo]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      if (e.dataTransfer.files.length > 0) {
        handleUpload(e.dataTransfer.files);
      }
    },
    [handleUpload]
  );

  const handleDelete = useCallback(
    async (fileId: string) => {
      await fileService.delete(workspaceId, fileId);
      setFiles((prev) => prev.filter((f) => f.id !== fileId));
      setDeleteTarget(null);
      fetchStorageInfo();
    },
    [fetchStorageInfo]
  );

  const handleLinkToEntity = useCallback(
    async (fileId: string, entityId: string) => {
      setLinking(true);
      try {
        await fileService.linkToEntity(workspaceId, fileId, entityId);
        setLinkSuccess(fileId);
        setTimeout(() => {
          setLinkSuccess(null);
          setLinkTarget(null);
          setEntityIdInput("");
        }, 1500);
      } catch {
        // handle error
      } finally {
        setLinking(false);
      }
    },
    []
  );

  const handleCleanupOrphans = useCallback(async () => {
    setCleaningOrphans(true);
    setOrphanResult(null);
    try {
      const json = await fileService.cleanupOrphans(workspaceId) as Record<string, unknown>;
      const removed = (json?.data as Record<string, unknown>)?.removed ?? json?.removed ?? 0;
      setOrphanResult(`Removed ${removed} orphaned file${removed !== 1 ? "s" : ""}`);
      fetchFiles();
      fetchStorageInfo();
      setTimeout(() => setOrphanResult(null), 4000);
    } catch {
      setOrphanResult("Cleanup failed");
      setTimeout(() => setOrphanResult(null), 4000);
    } finally {
      setCleaningOrphans(false);
    }
  }, [fetchFiles, fetchStorageInfo]);

  const openLinkModal = useCallback((file: FileRecord) => {
    setLinkTarget(file);
    setEntityIdInput("");
    setLinkSuccess(null);
  }, []);

  const closeLinkModal = useCallback(() => {
    setLinkTarget(null);
    setEntityIdInput("");
  }, []);
  const filteredFiles = files
    .filter((f) => {
      if (!f.file_name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      if (stateFilter !== "all" && f.state !== stateFilter) return false;
      if (filterType === "images") return f.mime_type?.startsWith("image/");
      if (filterType === "documents") return f.mime_type?.includes("pdf") || f.mime_type?.includes("word") || f.mime_type?.includes("text");
      if (filterType === "code") return /\.(js|ts|py|go|rs|java|css|html|json)$/i.test(f.file_name || "");
      if (filterType === "linked") return (f.linked_entity_ids?.length ?? 0) > 0;
      if (filterType === "unlinked") return !f.linked_entity_ids || f.linked_entity_ids.length === 0;
      if (filterType !== "all") return false;
      return true;
    })
    .filter((f) => {
      if (sizeFilter === "all") return true;
      const size = f.file_size || 0;
      if (sizeFilter === "small") return size < 1 * 1024 * 1024;
      if (sizeFilter === "medium") return size >= 1 * 1024 * 1024 && size <= 10 * 1024 * 1024;
      if (sizeFilter === "large") return size > 10 * 1024 * 1024;
      return true;
    })
    .sort((a, b) => {
      const dir = sortDir === "asc" ? 1 : -1;
      if (sortBy === "name") return (a.file_name || "").localeCompare(b.file_name || "") * dir;
      if (sortBy === "size") return ((a.file_size || 0) - (b.file_size || 0)) * dir;
      if (sortBy === "date") return (new Date(a.uploaded_at).getTime() - new Date(b.uploaded_at).getTime()) * dir;
      if (sortBy === "type") return (a.mime_type || "").localeCompare(b.mime_type || "") * dir;
      return 0;
    });
  const totalSize = storageInfo?.used_bytes ?? files.reduce((acc, f) => acc + (f.file_size || 0), 0);
  const storageQuota = storageInfo?.quota_bytes ?? 10 * 1024 * 1024 * 1024;
  const filteredFileIds = useMemo(() => filteredFiles.map((f) => f.id), [filteredFiles]);
  const handleFileToggleSelect = useCallback(
    (id: string, shiftKey: boolean, metaKey: boolean) => {
      const currentIndex = filteredFileIds.indexOf(id);
      if (shiftKey && lastClickedFileIndex !== null && currentIndex !== -1) {
        const start = Math.min(lastClickedFileIndex, currentIndex);
        const end = Math.max(lastClickedFileIndex, currentIndex);
        const rangeIds = filteredFileIds.slice(start, end + 1);
        setSelectedFiles((prev) => [...new Set([...prev, ...rangeIds])]);
      } else if (metaKey) {
        setSelectedFiles((prev) =>
          prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id]
        );
        setLastClickedFileIndex(currentIndex);
      } else {
        setSelectedFiles((prev) =>
          prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id]
        );
        setLastClickedFileIndex(currentIndex);
      }
    },
    [filteredFileIds, lastClickedFileIndex]
  );

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground display-heading">Files</h1>
          <p className="mt-1 text-step-3 text-muted">
            {files.length} file{files.length !== 1 ? "s" : ""} · {formatFileSize(files.reduce((s, f) => s + (f.file_size ?? 0), 0))}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleCleanupOrphans}
            disabled={cleaningOrphans}
            className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium text-foreground transition-colors hover:border-accent hover:text-foreground disabled:opacity-50"
          >
            {cleaningOrphans ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            Cleanup Orphans
          </button>
        </div>
      </div>

      {/* File Upload */}
      <FileUpload
        workspaceId={workspaceId}
        token={token}
        onUploadComplete={() => fetchFiles()}
        onUploadProgress={setUploadProgress}
      />

      {/* Storage Indicator */}
      <StorageIndicator
        usedBytes={totalSize}
        totalBytes={storageQuota}
        variant="detailed"
      />

      {orphanResult && (
        <div className="flex items-center gap-2 rounded-lg border border-blue-500/20 bg-blue-500/5 p-3 text-sm text-blue-400">
          <Check className="h-4 w-4" />
          {orphanResult}
          <button onClick={() => setOrphanResult(null)} className="ml-auto" aria-label="Dismiss">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <UploadProgress uploading={uploading} uploadProgress={uploadProgress} />

      {uploadError && (
        <div className="flex items-center gap-2 rounded-lg border border-red-500/20 bg-red-500/5 p-3 text-sm text-red-400">
          <AlertCircle className="h-4 w-4" />
          {uploadError}
          <button onClick={() => setUploadError(null)} className="ml-auto" aria-label="Dismiss">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <div className="flex items-center gap-3">
        <FileToolbar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
        />
        <div className="flex items-center gap-2">
          <select aria-label="Sort by" value={sortBy} onChange={(e) => setSortBy(e.target.value as typeof sortBy)} className="rounded-lg border border-border bg-surface/50 px-2 py-1 text-xs text-foreground">
            <option value="date">Date</option>
            <option value="name">Name</option>
            <option value="size">Size</option>
            <option value="type">Type</option>
          </select>
          <button onClick={() => setSortDir(d => d === "asc" ? "desc" : "asc")} className="rounded-lg border border-border px-2 py-1 text-xs text-muted hover:bg-surface" aria-label={sortDir === "asc" ? "Sort descending" : "Sort ascending"}>
            {sortDir === "asc" ? "↑" : "↓"}
          </button>
          <select aria-label="Filter by type" value={filterType} onChange={(e) => setFilterType(e.target.value)} className="rounded-lg border border-border bg-surface/50 px-2 py-1 text-xs text-foreground">
            <option value="all">All Files</option>
            <option value="images">Images</option>
            <option value="documents">Documents</option>
            <option value="code">Code</option>
            <option value="linked">Linked</option>
            <option value="unlinked">Unlinked</option>
          </select>
          <select aria-label="Filter by size" value={sizeFilter} onChange={(e) => setSizeFilter(e.target.value)} className="rounded-lg border border-border bg-surface/50 px-2 py-1 text-xs text-foreground">
            <option value="all">All Sizes</option>
            <option value="small">Small (&lt; 1MB)</option>
            <option value="medium">Medium (1-10MB)</option>
            <option value="large">Large (&gt; 10MB)</option>
          </select>
          <select aria-label="Filter by state" value={stateFilter} onChange={(e) => setStateFilter(e.target.value)} className="rounded-lg border border-border bg-surface/50 px-2 py-1 text-xs text-foreground">
            <option value="all">All States</option>
            <option value="READY">Ready</option>
            <option value="VALIDATING">Validating</option>
            <option value="PENDING">Pending</option>
            <option value="QUARANTINED">Quarantined</option>
            <option value="DELETED">Deleted</option>
          </select>
        </div>
      </div>

      {filteredFiles.length > 0 && (
        <div className="flex items-center gap-2 px-1">
          <Checkbox
            checked={selectedFiles.length === filteredFiles.length && filteredFiles.length > 0}
            onCheckedChange={(checked) => {
              if (checked) {
                setSelectedFiles(filteredFiles.map((f) => f.id));
              } else {
                setSelectedFiles([]);
              }
            }}
          />
          <span className="text-step-1 text-muted">
            Select all ({filteredFiles.length})
          </span>
        </div>
      )}

      {/* Drop Zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        className={cn(
          "rounded-xl border-2 border-dashed p-12 text-center transition-colors",
          dragOver
            ? "border-white bg-white/5"
            : "border-border hover:border-border"
        )}
      >
        {loading ? (
          <div className="grid grid-cols-3 gap-4 p-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} variant="rectangular" className="h-32 rounded-lg" />
            ))}
          </div>
        ) : filteredFiles.length === 0 && !searchQuery ? (
          <>
            <Upload className="mx-auto h-10 w-10 text-muted" />
            <p className="mt-3 text-step-3 text-muted">Drag and drop files here, or click to upload</p>
            <p className="mt-1 text-step-1 text-muted">
              Max {FILE_UPLOAD.MAX_SIZE_MB}MB per file
            </p>
          </>
        ) : filteredFiles.length === 0 ? (
          <p className="text-sm text-muted">No files match &quot;{searchQuery}&quot;</p>
        ) : viewMode === "grid" ? (
          <FileGrid
            workspaceId={workspaceId}
            files={filteredFiles}
            onPreview={setPreviewFile}
            onLink={openLinkModal}
            onDelete={setDeleteTarget}
            selectedFiles={selectedFiles}
            onToggleSelect={handleFileToggleSelect}
          />
        ) : (
          <FileList
            workspaceId={workspaceId}
            files={filteredFiles}
            onLink={openLinkModal}
            onDelete={(f) => handleDelete(f.id)}
            selectedFiles={selectedFiles}
            onToggleSelect={handleFileToggleSelect}
          />
        )}
      </div>

      {previewFile && (
        <FilePreviewModal workspaceId={workspaceId} file={previewFile} onClose={() => setPreviewFile(null)} />
      )}

      {linkTarget && (
        <FileLinkModal
          file={linkTarget}
          entityIdInput={entityIdInput}
          linking={linking}
          linkSuccess={linkSuccess}
          onEntityIdChange={setEntityIdInput}
          onLink={handleLinkToEntity}
          onClose={closeLinkModal}
        />
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => { if (deleteTarget) return handleDelete(deleteTarget.id); }}
        title="Delete File"
        description={`"${deleteTarget?.file_name}" will be permanently deleted. This action cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
      />

      <BulkActionBar
        selectedCount={selectedFiles.length}
        selectedIds={selectedFiles}
        onClearSelection={() => setSelectedFiles([])}
        actions={[
          {
            id: "delete",
            label: "Delete",
            icon: <Trash2 className="h-4 w-4" />,
            variant: "danger",
            onClick: async () => {
              for (const fileId of selectedFiles) {
                await handleDelete(fileId);
              }
              setSelectedFiles([]);
            },
          },
        ]}
      />
    </div>
  );
}
