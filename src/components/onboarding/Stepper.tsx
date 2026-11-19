import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export function Stepper({ steps, current, maxReached, onSelect }: { steps: { title: string; hint: string }[]; current: number; maxReached: number; onSelect: (i: number) => void }) {
  return (
    <nav aria-label="Setup progress">
      <ol className="flex gap-2 lg:flex-col lg:gap-1">
        {steps.map((s, i) => {
          const done = i !== current && i < maxReached;
          const active = i === current;
          const reachable = i <= maxReached;
          return (
            <li key={s.title} className="flex-1 lg:flex-none">
              <button
                type="button"
                disabled={!reachable}
                onClick={() => onSelect(i)}
                aria-current={active ? "step" : undefined}
                className={cn(
                  "flex w-full items-center gap-3 rounded-lg p-2 text-left transition-colors focus-visible:outline-2 focus-visible:outline-ring lg:p-3",
                  active && "bg-card shadow-card ring-1 ring-border",
                  reachable && !active && "hover:bg-muted",
                  !reachable && "cursor-not-allowed opacity-60",
                )}
              >
                <span
                  className={cn(
                    "flex size-7 shrink-0 items-center justify-center rounded-full border text-xs font-semibold",
                    active && "border-primary bg-primary text-primary-foreground",
                    done && !active && "border-success bg-success-soft text-success-text",
                    !active && !done && "border-input bg-card text-muted-foreground",
                  )}
                >
                  {done && !active ? <Check className="size-3.5" strokeWidth={3} aria-hidden="true" /> : i + 1}
                </span>
                <span className="hidden min-w-0 sm:block">
                  <span className={cn("block truncate text-sm font-medium", active ? "text-foreground" : "text-muted-foreground")}>{s.title}</span>
                  <span className="hidden truncate text-xs text-muted-foreground lg:block">{s.hint}</span>
                </span>
                <span className="sr-only">
                  {active ? "(current step)" : done ? "(completed)" : reachable ? "" : "(not yet available)"}
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
