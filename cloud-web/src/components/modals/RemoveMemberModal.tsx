"use client";

import { useState } from "react";
import { Loader2, UserMinus } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";

interface RemoveMemberModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  memberName: string;
  memberEmail: string;
  role: string;
}

export function RemoveMemberModal({
  open,
  onClose,
  onConfirm,
  memberName,
  memberEmail,
  role,
}: RemoveMemberModalProps) {
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await onConfirm();
      onClose();
    } catch {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-500/10">
              <UserMinus className="h-5 w-5 text-red-400" />
            </div>
            <div>
              <DialogTitle>Remove Member</DialogTitle>
              <DialogDescription>
                Are you sure you want to remove{" "}
                <span className="font-medium text-foreground">{memberName}</span> from this workspace?
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="rounded-lg border-border bg-surface p-3">
          <p className="text-xs text-muted">
            <span className="font-medium text-foreground">{memberName}</span>
            <br />
            {memberEmail}
            <br />
            <Badge variant="outline" size="sm" className="mt-1 capitalize">
              {role}
            </Badge>
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={loading}
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserMinus className="h-4 w-4" />}
            Remove
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
