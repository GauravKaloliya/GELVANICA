"use client";

import { Skeleton } from "./Skeleton";

type LoadingVariant =
  | "spinner"
  | "page"
  | "dashboard"
  | "editor"
  | "graph"
  | "settings"
  | "search"
  | "grid"
  | "list"
  | "table"
  | "full";

interface RouteLoadingProps {
  variant?: LoadingVariant;
  message?: string;
}

function Spinner({ message }: { message?: string }) {
  return (
    <div className="flex h-64 flex-col items-center justify-center gap-3">
      <div className="flex gap-2">
        <Skeleton variant="circular" width={12} height={12} className="animate-bounce [animation-delay:0ms]" />
        <Skeleton variant="circular" width={12} height={12} className="animate-bounce [animation-delay:150ms]" />
        <Skeleton variant="circular" width={12} height={12} className="animate-bounce [animation-delay:300ms]" />
      </div>
      {message && <p className="text-sm text-zinc-500">{message}</p>}
    </div>
  );
}

function PageSkeleton() {
  return (
    <div className="space-y-6 p-6">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-64 rounded-xl" />
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6 p-6">
      <Skeleton className="h-8 w-48" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Skeleton className="h-64 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    </div>
  );
}

function EditorSkeleton() {
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b border-zinc-800 px-4 py-3">
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-4 w-4" />
        <Skeleton className="h-4 w-24" />
      </div>
      <div className="flex flex-1">
        <div className="flex-1 space-y-4 p-6">
          <Skeleton className="h-10 w-64" />
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-8 rounded-lg" />
            ))}
          </div>
        </div>
        <div className="w-80 border-l border-zinc-800 p-4">
          <Skeleton className="mb-4 h-6 w-24" />
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="mb-2 h-10 rounded-lg" />
          ))}
        </div>
      </div>
    </div>
  );
}

function GraphSkeleton() {
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-3">
        <Skeleton className="h-6 w-40" />
        <div className="flex gap-2">
          <Skeleton className="h-8 w-24" />
          <Skeleton className="h-8 w-24" />
        </div>
      </div>
      <div className="relative flex-1">
        <Skeleton className="absolute inset-4 rounded-xl" />
      </div>
    </div>
  );
}

function SettingsSkeleton() {
  return (
    <div className="space-y-6 p-6">
      <Skeleton className="h-8 w-40" />
      <Skeleton className="h-64 rounded-xl" />
      <Skeleton className="h-48 rounded-xl" />
    </div>
  );
}

function SearchSkeleton() {
  return (
    <div className="space-y-6 p-6">
      <Skeleton className="h-8 w-64" />
      <Skeleton className="h-12 w-full rounded-lg" />
      <div className="flex gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-24 rounded-full" />
        ))}
      </div>
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-20 rounded-xl" />
        ))}
      </div>
    </div>
  );
}

function GridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="space-y-6 p-6">
      <Skeleton className="h-8 w-48" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: count }).map((_, i) => (
          <Skeleton key={i} className="h-40 rounded-xl" />
        ))}
      </div>
    </div>
  );
}

function ListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-6 p-6">
      <Skeleton className="h-8 w-48" />
      <div className="space-y-3">
        {Array.from({ length: count }).map((_, i) => (
          <Skeleton key={i} className="h-16 rounded-xl" />
        ))}
      </div>
    </div>
  );
}

function TableSkeleton() {
  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-10 w-32" />
      </div>
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-16 rounded-xl" />
        ))}
      </div>
    </div>
  );
}

function FullPageSpinner({ message }: { message?: string }) {
  return (
    <div className="flex h-screen items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="flex gap-2">
          <Skeleton variant="circular" width={12} height={12} className="animate-bounce [animation-delay:0ms]" />
          <Skeleton variant="circular" width={12} height={12} className="animate-bounce [animation-delay:150ms]" />
          <Skeleton variant="circular" width={12} height={12} className="animate-bounce [animation-delay:300ms]" />
        </div>
        {message && <p className="text-sm text-zinc-500">{message}</p>}
      </div>
    </div>
  );
}

const VARIANT_MAP: Record<LoadingVariant, React.ComponentType> = {
  spinner: Spinner,
  page: PageSkeleton,
  dashboard: DashboardSkeleton,
  editor: EditorSkeleton,
  graph: GraphSkeleton,
  settings: SettingsSkeleton,
  search: SearchSkeleton,
  grid: GridSkeleton,
  list: ListSkeleton,
  table: TableSkeleton,
  full: FullPageSpinner,
};

export default function RouteLoading({ variant = "page" }: RouteLoadingProps) {
  const Component = VARIANT_MAP[variant];
  return <Component />;
}

export type { RouteLoadingProps, LoadingVariant };
