"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/Button";

export default function FilesError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    if (process.env.NODE_ENV === "development") console.error("[FilesError]", error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] p-8 text-center">
      <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-red-500/10 mb-4">
        <AlertTriangle className="h-6 w-6 text-red-500" />
      </div>
      <h2 className="text-lg font-semibold text-foreground mb-2">Files failed to load</h2>
      <p className="text-sm text-muted mb-6 max-w-md">
        An unexpected error occurred. Please try again later.
      </p>
      <Button onClick={reset} variant="outline" className="gap-2">
        <RefreshCw className="h-4 w-4" />
        Try Again
      </Button>
    </div>
  );
}
