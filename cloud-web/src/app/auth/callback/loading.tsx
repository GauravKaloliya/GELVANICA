"use client";

import { Skeleton } from "@/components/ui/Skeleton";

export default function CallbackLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <Skeleton className="h-10 w-10 rounded-full" />
    </div>
  );
}