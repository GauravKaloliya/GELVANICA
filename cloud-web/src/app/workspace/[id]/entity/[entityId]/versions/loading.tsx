"use client";

import { Skeleton } from "@/components/ui/Skeleton";

export default function VersionsLoading() {
  return (
    <div className="p-6 space-y-4">
      <Skeleton className="h-8 w-40" />
      <div className="space-y-0">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex gap-4 py-4 border-b last:border-0">
            <Skeleton className="h-3 w-3 rounded-full shrink-0 mt-1" />
            <div className="space-y-2 flex-1">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-3 w-72" />
              <Skeleton className="h-3 w-32" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}