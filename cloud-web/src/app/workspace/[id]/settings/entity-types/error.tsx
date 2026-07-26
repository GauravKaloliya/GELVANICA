"use client";

import { useEffect } from "react";

export default function EntityTypesError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { if (process.env.NODE_ENV === "development") console.error(error); }, [error]);
  return (
    <div className="flex flex-col items-center justify-center gap-4 p-12 text-center">
      <h2 className="text-xl font-bold text-foreground">Something went wrong</h2>
      <p className="text-sm text-muted">An unexpected error occurred. Please try again later.</p>
      <button onClick={reset} className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-foreground hover:bg-accent/90">
        Try again
      </button>
    </div>
  );
}
