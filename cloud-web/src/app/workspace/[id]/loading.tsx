"use client";

import { Skeleton } from "@/components/ui/Skeleton";

export default function WorkspaceRootLoading() {
  return (
    <div className="flex h-screen">
      <div className="w-56 border-r p-4 space-y-3">
        <Skeleton className="h-6 w-36" />
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-full rounded-md" />
        ))}
      </div>
      <div className="flex-1 p-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-72" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    </div>
  );
}