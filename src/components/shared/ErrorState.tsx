import type * as React from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function ErrorState({
  title = "Something went wrong",
  description = "We couldn't load this information. Please try again.",
  onRetry,
  action,
  className,
}: {
  title?: string;
  description?: React.ReactNode;
  onRetry?: () => void;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      role="alert"
      className={cn("flex flex-col items-center justify-center rounded-lg border border-destructive/25 bg-destructive-soft px-6 py-8 text-center", className)}
    >
      <AlertTriangle className="mb-2 size-6 text-destructive-text" aria-hidden="true" />
      <p className="text-sm font-semibold text-foreground">{title}</p>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>
      <div className="mt-4 flex gap-2">
        {onRetry && (
          <Button variant="outline" size="sm" onClick={onRetry}>
            <RotateCcw /> Try again
          </Button>
        )}
        {action}
      </div>
    </div>
  );
}
