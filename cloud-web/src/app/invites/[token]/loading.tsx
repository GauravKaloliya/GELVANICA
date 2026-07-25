"use client";

import { Skeleton } from "@/components/ui/Skeleton";

export default function InviteLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-md space-y-4">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-10 w-full rounded-lg" />
        <Skeleton className="h-4 w-48" />
        <div className="flex gap-3 pt-2">
          <Skeleton className="h-10 w-24 rounded-lg" />
          <Skeleton className="h-10 w-24 rounded-lg" />
        </div>
      </div>
    </div>
  );
}