"use client";

import { useCallback } from "react";
import { AlertTriangle, Trash2, Info, Loader2 } from "lucide-react";
import { Modal, ModalHeader, ModalFooter } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "warning" | "info";
  loading?: boolean;
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "danger",
  loading = false,
}: ConfirmDialogProps) {
  const handleConfirm = useCallback(async () => {
    await onConfirm();
    onClose();
  }, [onConfirm, onClose]);

  const iconMap = {
    danger: <Trash2 className="h-5 w-5 text-red-400" />,
    warning: <AlertTriangle className="h-5 w-5 text-amber-400" />,
    info: <Info className="h-5 w-5 text-blue-400" />,
  };

  const buttonVariant = {
    danger: "destructive" as const,
    warning: "destructive" as const,
    info: "default" as const,
  };

  return (
    <Modal open={open} onClose={onClose} className="max-w-md">
      <ModalHeader>
        <div className="flex items-start gap-4">
          <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-full", {
            "bg-red-500/10": variant === "danger",
            "bg-amber-500/10": variant === "warning",
            "bg-blue-500/10": variant === "info",
          })}>
            {iconMap[variant]}
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white leading-none tracking-tight">{title}</h2>
            <p className="mt-1 text-sm text-muted">{description}</p>
          </div>
        </div>
      </ModalHeader>
      <ModalFooter>
        <Button variant="outline" onClick={onClose} disabled={loading}>
          {cancelLabel}
        </Button>
        <Button
          variant={buttonVariant[variant]}
          onClick={handleConfirm}
          disabled={loading}
        >
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          {confirmLabel}
        </Button>
      </ModalFooter>
    </Modal>
  );
}
