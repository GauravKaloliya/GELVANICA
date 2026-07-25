"use client";

import { Skeleton } from "@/components/ui/Skeleton";

export default function SyncSettingsLoading() {
  return (
    <div className="p-6 space-y-6">
      <Skeleton className="h-8 w-36" />
      <Skeleton className="h-4 w-56" />
      <div className="max-w-xl space-y-4 pt-2">
        <div className="space-y-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-10 w-full rounded-lg" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-10 w-full rounded-lg" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-10 w-full rounded-lg" />
        </div>
        <Skeleton className="h-10 w-28 rounded-lg" />
      </div>
    </div>
  );
}