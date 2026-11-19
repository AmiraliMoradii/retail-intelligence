import type * as React from "react";
import { Link } from "react-router";
import { ArrowDownRight, ArrowRight, ArrowUpRight, type LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export interface KPICardProps {
  label: string;
  value: React.ReactNode;
  icon?: LucideIcon;
  /** Secondary line, e.g. "vs. same day last week" */
  hint?: React.ReactNode;
  /** Signed % change; sign + arrow + text are shown, never colour alone. */
  deltaPct?: number | null;
  deltaLabel?: string;
  /** When the increase is bad (e.g. stock-outs), flip the tone. */
  invertDelta?: boolean;
  to?: string;
  tone?: "default" | "warning" | "destructive" | "success";
  loading?: boolean;
  className?: string;
}

const toneIcon: Record<NonNullable<KPICardProps["tone"]>, string> = {
  default: "bg-primary-soft text-primary-soft-foreground",
  warning: "bg-warning-soft text-warning-text",
  destructive: "bg-destructive-soft text-destructive-text",
  success: "bg-success-soft text-success-text",
};

export function KPICard({
  label,
  value,
  icon: Icon,
  hint,
  deltaPct,
  deltaLabel,
  invertDelta,
  to,
  tone = "default",
  loading,
  className,
}: KPICardProps) {
  const up = (deltaPct ?? 0) > 0;
  const good = invertDelta ? !up : up;
  const content = (
    <>
      <div className="flex items-start justify-between gap-3">
        <p className="text-[13px] font-medium text-muted-foreground">{label}</p>
        {Icon && (
          <span className={cn("flex size-8 shrink-0 items-center justify-center rounded-lg", toneIcon[tone])} aria-hidden="true">
            <Icon className="size-4" />
          </span>
        )}
      </div>
      {loading ? (
        <div className="mt-1 space-y-2">
          <Skeleton className="h-7 w-24" />
          <Skeleton className="h-3 w-32" />
        </div>
      ) : (
        <>
          <div className="mt-1 text-kpi text-foreground">{value}</div>
          <div className="mt-1.5 flex min-h-5 flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
            {deltaPct !== undefined && deltaPct !== null && Number.isFinite(deltaPct) && (
              <span
                className={cn(
                  "inline-flex items-center gap-0.5 font-semibold",
                  Math.abs(deltaPct) < 0.05 ? "text-muted-foreground" : good ? "text-success-text" : "text-destructive-text",
                )}
              >
                {up ? <ArrowUpRight className="size-3.5" aria-hidden="true" /> : <ArrowDownRight className="size-3.5" aria-hidden="true" />}
                <span className="sr-only">{up ? "Up" : "Down"} </span>
                {Math.abs(deltaPct).toFixed(1)}%
              </span>
            )}
            {deltaLabel && <span>{deltaLabel}</span>}
            {hint && <span>{hint}</span>}
          </div>
        </>
      )}
      {to && (
        <span className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-primary opacity-80 transition-opacity group-hover:opacity-100">
          View details <ArrowRight className="size-3 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
        </span>
      )}
    </>
  );

  if (to) {
    return (
      <Card className={cn("group relative p-5 transition-[border-color,box-shadow] hover:border-primary/40 hover:shadow-md", className)}>
        <Link
          to={to}
          className="absolute inset-0 z-10 rounded-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          aria-label={`${label}: ${typeof value === "string" || typeof value === "number" ? value : ""}. View details`}
        />
        {content}
      </Card>
    );
  }
  return <Card className={cn("p-5", className)}>{content}</Card>;
}
