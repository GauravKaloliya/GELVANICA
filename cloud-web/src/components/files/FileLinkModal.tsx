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
      <div className="relative z-50 w-full max-w-sm mx-4 rounded-xl border-border bg-background neo-depth p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-white">Link to Entity</h3>
          <button onClick={onClose} className="rounded p-1 text-muted hover:text-foreground" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>
        <p className="text-xs text-muted mb-3">
          Link <span className="text-foreground">{file.file_name}</span> to an entity.
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
              className="w-full rounded-lg border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-muted focus:border-accent focus:outline-none"
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
                className="rounded-lg px-3 py-1.5 text-sm text-muted hover:text-foreground"
              >
                Cancel
              </button>
              <button
                onClick={() => onLink(file.id, entityIdInput.trim())}
                disabled={!entityIdInput.trim() || linking}
                className="flex items-center gap-2 rounded-lg bg-card px-3 py-1.5 text-sm font-medium text-foreground hover:bg-surface disabled:opacity-50"
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
