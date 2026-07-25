"use client";

import { Skeleton } from "@/components/ui/Skeleton";

export default function ActivityLoading() {
  return (
    <div className="p-6 space-y-4">
      <Skeleton className="h-8 w-36" />
      <div className="space-y-0">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="flex items-start gap-3 py-3 border-b last:border-0">
            <Skeleton className="h-8 w-8 rounded-full shrink-0" />
            <div className="space-y-1.5 flex-1">
              <Skeleton className="h-4 w-56" />
              <Skeleton className="h-3 w-32" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}