"use client";

import { Skeleton } from "@/components/ui/Skeleton";

export default function AISettingsLoading() {
  return (
    <div className="p-6 space-y-6">
      <Skeleton className="h-8 w-32" />
      <Skeleton className="h-4 w-64" />
      <div className="max-w-xl space-y-4 pt-2">
        <div className="flex items-center justify-between border rounded-lg p-4">
          <div className="space-y-1">
            <Skeleton className="h-4 w-36" />
            <Skeleton className="h-3 w-56" />
          </div>
          <Skeleton className="h-6 w-11 rounded-full" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-10 w-full rounded-lg" />
        </div>
        <Skeleton className="h-10 w-28 rounded-lg" />
      </div>
    </div>
  );
}