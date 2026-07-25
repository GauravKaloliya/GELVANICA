"use client";

import { Skeleton } from "@/components/ui/Skeleton";

export default function RootLoading() {
  return (
    <div className="flex h-screen items-center justify-center">
      <Skeleton className="h-10 w-10 rounded-full" />
    </div>
  );
}