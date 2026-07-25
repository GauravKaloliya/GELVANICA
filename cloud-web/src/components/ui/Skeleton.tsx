import { cn } from "@/lib/utils";

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "text" | "circular" | "rectangular";
  width?: string | number;
  height?: string | number;
  lines?: number;
}

function Skeleton({ className, variant = "text", width, height, lines = 1, ...props }: SkeletonProps) {
  if (variant === "circular") {
    return (
      <div
        className={cn("animate-pulse rounded-full bg-zinc-800", className)}
        style={{ width: width || 40, height: height || 40 }}
        {...props}
      />
    );
  }

  if (variant === "rectangular") {
    return (
      <div
        className={cn("animate-pulse rounded-lg bg-zinc-800", className)}
        style={{ width: width || "100%", height: height || 200 }}
        {...props}
      />
    );
  }

  return (
    <div className={cn("space-y-2", className)} {...props}>
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className="animate-pulse rounded-md bg-zinc-800"
          style={{
            width: i === lines - 1 ? "60%" : width || "100%",
            height: height || 12,
          }}
        />
      ))}
    </div>
  );
}

function SkeletonCard({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 space-y-3",
        className
      )}
      {...props}
    >
      <div className="flex items-center gap-3">
        <Skeleton variant="circular" width={32} height={32} />
        <div className="flex-1 space-y-1.5">
          <Skeleton width="40%" height={12} />
          <Skeleton width="60%" height={10} />
        </div>
      </div>
      <Skeleton lines={3} />
    </div>
  );
}

function SkeletonTable({ rows = 5, cols = 4, className, ...props }: { rows?: number; cols?: number } & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("space-y-2", className)} {...props}>
      <div className="flex gap-4 border-b border-zinc-800 pb-2">
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton key={i} width={`${100 / cols}%`} height={12} />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, row) => (
        <div key={row} className="flex gap-4 py-2">
          {Array.from({ length: cols }).map((_, col) => (
            <Skeleton key={col} width={`${100 / cols}%`} height={12} />
          ))}
        </div>
      ))}
    </div>
  );
}

export { Skeleton, SkeletonCard, SkeletonTable };
export { Skeleton as SkeletonLoader };
export type { SkeletonProps };
