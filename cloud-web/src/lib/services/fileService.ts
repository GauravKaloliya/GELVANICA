import { apiClient } from "../apiClient";
import { API_URL, API_BASE_PATH } from "../config/constants";
import type { FileRecord, FileState, FileUploadResult, MultipartInitResult, PresignResult } from "../types/file";

interface FileListResponse {
  data: FileRecord[];
  meta?: { total: number };
}

interface FileResponse {
  data: FileRecord;
}

interface PresignResponse {
  data: PresignResult;
}

interface StorageInfoResponse {
  data: { used_bytes: number; quota_bytes: number; max_file_size: number; file_count: number; quota_used_percent: number; storage_provider: string };
}

const MULTIPART_THRESHOLD_BYTES = 100 * 1024 * 1024;
const PROCESSING_STATES: FileState[] = ["UPLOADED", "VALIDATING"];

async function sha256File(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const digest = await crypto.subtle.digest("SHA-256", buffer);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function toUploadResult(file: FileRecord, deduplicated: boolean): FileUploadResult {
  return {
    ...file,
    mime_type: file.mime_type || "application/octet-stream",
    file_size: file.file_size || 0,
    deduplicated,
    has_thumbnail: Boolean(file.variants?.some((variant) => variant.variant_type === "thumbnail")),
    has_preview: Boolean(file.variants?.some((variant) => variant.variant_type === "preview")),
  };
}

export const fileService = {
  list: (workspaceId: string, params?: { page?: number; per_page?: number; state?: string; uploaded_by?: string }) => {
    const sp = new URLSearchParams({ workspace_id: workspaceId });
    if (params?.page) sp.set("page", String(params.page));
    if (params?.per_page) sp.set("per_page", String(params.per_page));
    if (params?.state) sp.set("state", params.state);
    if (params?.uploaded_by) sp.set("uploaded_by", params.uploaded_by);
    return apiClient.get<FileListResponse>(`/files/?${sp}`);
  },

  upload: async (workspaceId: string, file: File, onProgress?: (pct: number) => void): Promise<FileUploadResult> => {
    if (file.size >= MULTIPART_THRESHOLD_BYTES) {
      return fileService.uploadMultipart(workspaceId, file, onProgress);
    }

    const contentHash = await sha256File(file);
    const presignRes = await fileService.presign({
      workspace_id: workspaceId,
      file_name: file.name,
      content_type: file.type || "application/octet-stream",
      file_size: file.size,
      content_hash: contentHash,
    });
    const presign = presignRes.data;

    if (presign.deduplicated && presign.file) {
      onProgress?.(100);
      return toUploadResult(presign.file, true);
    }

    if (!presign.upload_url || !presign.file_id) {
      throw new Error("Presigned upload was not returned by the backend");
    }

    await fileService.uploadViaPresign(presign.upload_url, file, onProgress);
    const confirmed = await fileService.confirm(presign.file_id, workspaceId);
    const ready = await fileService.waitForProcessing(confirmed.data.id, confirmed.data);
    return toUploadResult(ready, false);
  },

  uploadMultipart: async (workspaceId: string, file: File, onProgress?: (pct: number) => void): Promise<FileUploadResult> => {
    const init = await fileService.multipartInit({
      workspace_id: workspaceId,
      file_name: file.name,
      content_type: file.type || "application/octet-stream",
      content_length: file.size,
      part_size: 10 * 1024 * 1024,
    });
    const multipart = init.data as MultipartInitResult;
    const uploadedBytesByPart = new Map<number, number>();
    const parts: Array<{ PartNumber: number; ETag: string }> = [];

    for (const part of multipart.presigned_urls) {
      const start = (part.part_number - 1) * multipart.part_size;
      const end = Math.min(start + multipart.part_size, file.size);
      const blob = file.slice(start, end);
      const etag = await fileService.uploadMultipartPart(part.presigned_url, blob, file.type || "application/octet-stream", (loaded) => {
        uploadedBytesByPart.set(part.part_number, loaded);
        const uploaded = Array.from(uploadedBytesByPart.values()).reduce((sum, value) => sum + value, 0);
        onProgress?.(Math.min(99, Math.round((uploaded / file.size) * 100)));
      });
      parts.push({ PartNumber: part.part_number, ETag: etag });
    }

    const completed = await fileService.multipartComplete({
      upload_id: multipart.upload_id,
      file_id: multipart.file_id,
      parts,
    });
    const ready = await fileService.waitForProcessing(completed.data.id, completed.data);
    onProgress?.(100);
    return toUploadResult(ready, Boolean(completed.data.deduplicated));
  },

  uploadMultipartPart: (presignedUrl: string, blob: Blob, contentType: string, onLoaded?: (loaded: number) => void) =>
    new Promise<string>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.upload.onprogress = (e) => onLoaded?.(e.loaded);
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve((xhr.getResponseHeader("ETag") || "").replaceAll('"', ""));
        } else {
          reject(new Error(`Part upload failed (${xhr.status})`));
        }
      };
      xhr.onerror = () => reject(new Error("Part upload failed"));
      xhr.open("PUT", presignedUrl);
      xhr.setRequestHeader("Content-Type", contentType);
      xhr.send(blob);
    }),

  waitForProcessing: async (fileId: string, initial?: FileRecord): Promise<FileRecord> => {
    let current = initial;
    for (let attempt = 0; attempt < 30; attempt++) {
      if (current && !PROCESSING_STATES.includes(current.state)) return current;
      await new Promise((resolve) => setTimeout(resolve, attempt < 5 ? 1000 : 3000));
      const response = await fileService.getMetadata(fileId);
      current = response.data;
    }
    return current || (await fileService.getMetadata(fileId)).data;
  },

  uploadFormData: (workspaceId: string, file: File, onProgress?: (pct: number) => void): Promise<FileRecord> =>
    new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) onProgress?.(Math.round((e.loaded / e.total) * 100));
      };
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          const json = JSON.parse(xhr.responseText);
          resolve(json.data);
        } else {
          reject(new Error(`Upload failed (${xhr.status})`));
        }
      };
      xhr.onerror = () => reject(new Error("Upload failed"));
      const formData = new FormData();
      formData.append("file", file);
      formData.append("workspace_id", workspaceId);
      xhr.open("POST", `${API_URL}${API_BASE_PATH}/files/upload`);
      import("@/stores/authStore").then(({ useAuthStore }) => {
        const token = useAuthStore.getState().tokens?.access_token;
        if (!token) {
          reject(new Error("Not authenticated"));
          return;
        }
        xhr.setRequestHeader("Authorization", `Bearer ${token}`);
        xhr.send(formData);
      }).catch(() => reject(new Error("Failed to load auth module")));
    }),

  presign: (data: {
    workspace_id: string;
    file_name: string;
    content_type: string;
    file_size: number;
    content_hash: string;
  }) => apiClient.post<PresignResponse>("/files/presign", data),

  uploadViaPresign: (presignedUrl: string, file: File, onProgress?: (pct: number) => void) =>
    new Promise<void>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) onProgress?.(Math.round((e.loaded / e.total) * 100));
      };
      xhr.onload = () =>
        xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(`Upload failed (${xhr.status})`));
      xhr.onerror = () => reject(new Error("Upload failed"));
      xhr.open("PUT", presignedUrl);
      xhr.setRequestHeader("Content-Type", file.type || "application/octet-stream");
      xhr.setRequestHeader("x-amz-server-side-encryption", "AES256");
      xhr.send(file);
    }),

  multipartInit: (data: {
    workspace_id: string;
    file_name: string;
    content_type: string;
    content_length: number;
    part_size: number;
  }) => apiClient.post<{ data: MultipartInitResult }>("/files/presign-multipart", data),

  multipartComplete: (data: { upload_id: string; file_id: string; parts: Array<{ PartNumber: number; ETag: string }> }) =>
    apiClient.post<{ data: FileRecord & { deduplicated?: boolean } }>("/files/presign-multipart/complete", data),

  confirm: (fileId: string, workspaceId: string) =>
    apiClient.post<FileResponse>(`/files/${fileId}/confirm`, { workspace_id: workspaceId }),

  getDownloadUrl: (fileId: string) =>
    `${API_URL}${API_BASE_PATH}/files/${fileId}/download`,

  getThumbnailUrl: (fileId: string) =>
    apiClient.get<{ data: { presigned_url: string } }>(`/files/${fileId}/thumbnail`),

  getPreviewUrl: (fileId: string) =>
    apiClient.get<{ data: { presigned_url: string } }>(`/files/${fileId}/preview`),

  getVariants: (fileId: string) =>
    apiClient.get(`/files/${fileId}/variants`),

  getVariant: (fileId: string, type: string) =>
    apiClient.get(`/files/${fileId}/variants/${type}`),

  linkToEntity: (fileId: string, entityId: string) =>
    apiClient.post(`/files/${fileId}/entities/${entityId}`),

  unlinkFromEntity: (fileId: string, entityId: string) =>
    apiClient.delete(`/files/${fileId}/entities/${entityId}`),

  getMetadata: (fileId: string) =>
    apiClient.get<FileResponse>(`/files/${fileId}`),

  delete: (fileId: string) =>
    apiClient.delete(`/files/${fileId}`),

  quarantineResolve: (fileId: string, approve: boolean) =>
    apiClient.post(`/files/quarantine/${fileId}/resolve`, { approve }),

  getStorageStats: (workspaceId: string) =>
    apiClient.get<StorageInfoResponse>(`/files/storage-info?workspace_id=${workspaceId}`),

  cleanupOrphans: () =>
    apiClient.post("/files/cleanup-orphans"),

  cleanupQuarantine: () =>
    apiClient.post("/files/cleanup-quarantine"),

  cleanupDeleted: () =>
    apiClient.post("/files/cleanup-deleted"),
};
