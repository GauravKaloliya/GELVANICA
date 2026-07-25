"use client";

import { useState } from "react";
import { GitMerge, Loader2, Check, AlertCircle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";

interface MergeModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  sourceBranch: string;
  targetBranch: string;
  conflictCount?: number;
}

export function MergeModal({
  open,
  onClose,
  onConfirm,
  sourceBranch,
  targetBranch,
  conflictCount = 0,
}: MergeModalProps) {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await onConfirm();
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        onClose();
      }, 1200);
    } catch {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-500/10">
              <GitMerge className="h-5 w-5 text-purple-400" />
            </div>
            <DialogTitle>Merge Branch</DialogTitle>
          </div>
        </DialogHeader>

        <div className="rounded-lg border border-zinc-800 bg-zinc-800/50 p-4">
          <div className="flex items-center gap-3 text-sm">
            <Badge variant="outline" className="font-mono text-purple-400 border-purple-500/30">
              {sourceBranch}
            </Badge>
            <span className="text-zinc-500">→</span>
            <Badge variant="outline" className="font-mono">
              {targetBranch}
            </Badge>
          </div>
        </div>

        {conflictCount > 0 && (
          <div className="flex items-start gap-2 rounded-lg border border-amber-500/20 bg-amber-500/5 p-3">
            <AlertCircle className="h-4 w-4 shrink-0 text-amber-400 mt-0.5" />
            <p className="text-xs text-amber-300">
              {conflictCount} conflict{conflictCount !== 1 ? "s" : ""} detected. You may need to
              resolve them after merging.
            </p>
          </div>
        )}

        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={loading}
            className={cn(
              "bg-purple-600 hover:bg-purple-700",
              success && "bg-green-600 hover:bg-green-700"
            )}
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : success ? (
              <Check className="h-4 w-4" />
            ) : (
              <GitMerge className="h-4 w-4" />
            )}
            {success ? "Merged!" : "Merge"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
