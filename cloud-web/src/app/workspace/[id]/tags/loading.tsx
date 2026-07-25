"use client";

import { Skeleton } from "@/components/ui/Skeleton";

export default function TagsLoading() {
  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-28" />
        <Skeleton className="h-9 w-24 rounded-lg" />
      </div>
      <div className="flex flex-wrap gap-2">
        {[72, 88, 64, 96, 80, 68, 92, 76, 84, 60, 94, 70].map((w, i) => (
          <Skeleton key={i} className="h-8 rounded-full" style={{ width: `${w}px` }} />
        ))}
      </div>
    </div>
  );
}