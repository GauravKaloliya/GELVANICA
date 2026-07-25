"use client";

import { Loader2 } from "lucide-react";

interface UploadProgressProps {
  uploading: boolean;
  uploadProgress: number;
}

export function UploadProgress({ uploading, uploadProgress }: UploadProgressProps) {
  if (!uploading) return null;

  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4">
      <div className="flex items-center gap-3">
        <Loader2 className="h-5 w-5 animate-spin text-white" />
        <div className="flex-1">
          <p className="text-sm text-white">Uploading...</p>
          <div className="mt-2 h-1.5 rounded-full bg-zinc-800">
            <div
              className="h-full rounded-full bg-white transition-all"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        </div>
        <span className="text-xs text-zinc-500">{Math.round(uploadProgress)}%</span>
      </div>
    </div>
  );
}
