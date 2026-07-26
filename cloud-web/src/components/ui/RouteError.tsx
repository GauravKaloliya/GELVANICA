"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface RouteErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function RouteError({ error, reset }: RouteErrorProps) {
  useEffect(() => {
    if (process.env.NODE_ENV === "development") {
      console.error("[RouteError]", error);
    }
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-500/10">
        <AlertTriangle className="h-6 w-6 text-red-400" />
      </div>
      <h2 className="mt-4 text-lg font-semibold text-white">Something went wrong</h2>
      <p className="mt-1.5 max-w-md text-sm text-muted">
        An unexpected error occurred. Please try again later.
      </p>
      {process.env.NODE_ENV === "development" && error.digest && (
        <p className="mt-1 font-mono text-xs text-muted">Error: {error.digest}</p>
      )}
      <button
        onClick={reset}
        className="mt-5 inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-surface"
      >
        <RefreshCw className="h-3.5 w-3.5" />
        Try again
      </button>
    </div>
  );
}
