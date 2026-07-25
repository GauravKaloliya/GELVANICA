"use client";

import type { FileRecord } from "@/lib/types";
import { Loader2, X, Check } from "lucide-react";

interface FileLinkModalProps {
  file: FileRecord;
  entityIdInput: string;
  linking: boolean;
  linkSuccess: string | null;
  onEntityIdChange: (value: string) => void;
  onLink: (fileId: string, entityId: string) => void;
  onClose: () => void;
}

export function FileLinkModal({
  file,
  entityIdInput,
  linking,
  linkSuccess,
  onEntityIdChange,
  onLink,
  onClose,
}: FileLinkModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/80" onClick={onClose} />
      <div className="relative z-50 w-full max-w-sm mx-4 rounded-xl border border-zinc-800 bg-zinc-900 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-white">Link to Entity</h3>
          <button onClick={onClose} className="rounded p-1 text-zinc-500 hover:text-white" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>
        <p className="text-xs text-zinc-500 mb-3">
          Link <span className="text-zinc-300">{file.file_name}</span> to an entity.
        </p>
        {linkSuccess === file.id ? (
          <div className="flex items-center gap-2 rounded-lg border border-green-500/20 bg-green-500/5 p-3 text-sm text-green-400">
            <Check className="h-4 w-4" />
            Linked successfully
          </div>
        ) : (
          <>
            <input
              type="text"
              value={entityIdInput}
              onChange={(e) => onEntityIdChange(e.target.value)}
              placeholder="Enter entity ID"
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800/50 px-3 py-2 text-sm text-white placeholder:text-zinc-500 focus:border-zinc-500 focus:outline-none"
              onKeyDown={(e) => {
                if (e.key === "Enter" && entityIdInput.trim()) {
                  onLink(file.id, entityIdInput.trim());
                }
              }}
              autoFocus
            />
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={onClose}
                className="rounded-lg px-3 py-1.5 text-sm text-zinc-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={() => onLink(file.id, entityIdInput.trim())}
                disabled={!entityIdInput.trim() || linking}
                className="flex items-center gap-2 rounded-lg bg-white px-3 py-1.5 text-sm font-medium text-black hover:bg-zinc-200 disabled:opacity-50"
              >
                {linking && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Link
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
