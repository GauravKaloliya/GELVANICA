"use client";

import { useEffect } from "react";

export default function WorkspacesError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { if (process.env.NODE_ENV === "development") console.error(error); }, [error]);
  return (
    <div className="flex flex-col items-center justify-center gap-4 p-12 text-center">
      <h2 className="text-xl font-bold text-white">Something went wrong</h2>
      <p className="text-sm text-zinc-500">An unexpected error occurred. Please try again later.</p>
      <button onClick={reset} className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-black hover:bg-zinc-200">
        Try again
      </button>
    </div>
  );
}
