"use client";

import * as React from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface SheetProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  side?: "left" | "right" | "top" | "bottom";
}

const sheetVariants = {
  side: {
    left: "inset-y-0 left-0 h-full w-72 border-r border-border data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left",
    right: "inset-y-0 right-0 h-full w-72 border-l border-border data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right",
    top: "inset-x-0 top-0 border-b border-border data-[state=closed]:slide-out-to-top data-[state=open]:slide-in-from-top",
    bottom: "inset-x-0 bottom-0 border-t border-border data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom",
  },
};

function Sheet({ open, onClose, children, side = "right" }: SheetProps) {
  React.useEffect(() => {
    if (!open) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleEscape);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="relative z-50">
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div
        className={cn(
          "fixed z-50 bg-background neo-depth",
          "animate-in duration-300",
          sheetVariants.side[side]
        )}
      >
        {children}
      </div>
    </div>
  );
}

function SheetHeader({ className, children, onClose, ...props }: React.HTMLAttributes<HTMLDivElement> & { onClose?: () => void }) {
  return (
    <div className={cn("flex items-center justify-between divider-subtle p-4", className)} {...props}>
      {children}
      {onClose && (
        <button onClick={onClose} className="rounded-lg p-1 text-muted hover:text-foreground transition-colors" aria-label="Close sheet">
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

function SheetContent({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("flex-1 overflow-y-auto p-4", className)} {...props}>
      {children}
    </div>
  );
}

function SheetFooter({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("flex items-center justify-end gap-3 border-t border-border p-4", className)} {...props}>
      {children}
    </div>
  );
}

export { Sheet, SheetHeader, SheetContent, SheetFooter };
