"use client";

import { useState } from "react";
import { Copy, Loader2, Check } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { cn } from "@/lib/utils";

interface DuplicateModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (newTitle: string) => Promise<void>;
  originalTitle: string;
}

export function DuplicateModal({ open, onClose, onConfirm, originalTitle }: DuplicateModalProps) {
  const [newTitle, setNewTitle] = useState(`${originalTitle} (Copy)`);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await onConfirm(newTitle);
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        onClose();
      }, 1000);
    } catch {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-500/10">
              <Copy className="h-5 w-5 text-blue-400" />
            </div>
            <DialogTitle>Duplicate Entity</DialogTitle>
          </div>
        </DialogHeader>

        <div className="space-y-2">
          <label htmlFor="duplicate-new-title" className="text-sm font-medium text-muted">New title</label>
          <Input
            id="duplicate-new-title"
            type="text"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            autoFocus
          />
        </div>

        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={loading || !newTitle.trim()}
            className={cn(
              success && "bg-green-600 hover:bg-green-700"
            )}
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : success ? (
              <Check className="h-4 w-4" />
            ) : null}
            {success ? "Duplicated!" : "Duplicate"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
