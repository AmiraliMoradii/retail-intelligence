import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function LoadingState({ label = "Loading…", className }: { label?: string; className?: string }) {
  return (
    <div role="status" aria-live="polite" className={cn("space-y-3", className)}>
      <span className="sr-only">{label}</span>
      <Skeleton className="h-4 w-1/3" />
      <Skeleton className="h-40 w-full" />
      <Skeleton className="h-4 w-2/3" />
    </div>
  );
}

export function KpiSkeletonRow({ count = 4 }: { count?: number }) {
  return (
    <div role="status" aria-label="Loading metrics" className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-[repeat(var(--n),minmax(0,1fr))]" style={{ ["--n" as string]: count }}>
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i} className="space-y-3 p-5">
          <Skeleton className="h-3.5 w-24" />
          <Skeleton className="h-7 w-20" />
          <Skeleton className="h-3 w-28" />
        </Card>
      ))}
    </div>
  );
}

export function ChartSkeleton({ height = 280 }: { height?: number }) {
  return (
    <div role="status" aria-label="Loading chart" className="flex items-end gap-2 px-1" style={{ height }}>
      {Array.from({ length: 14 }).map((_, i) => (
        <Skeleton key={i} className="flex-1" style={{ height: `${30 + ((i * 37) % 60)}%` }} />
      ))}
    </div>
  );
}

export function PageLoading() {
  return (
    <div className="space-y-6 p-1" role="status" aria-label="Loading page">
      <div className="space-y-2">
        <Skeleton className="h-7 w-56" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </div>
      <KpiSkeletonRow />
      <Card className="p-5">
        <ChartSkeleton />
      </Card>
    </div>
  );
}
