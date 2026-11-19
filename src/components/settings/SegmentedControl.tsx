import type * as React from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SegmentOption<T extends string> {
  value: T;
  label: string;
  icon?: LucideIcon;
  hint?: string;
  disabled?: boolean;
}

/**
 * Accessible single-choice control built on native radio inputs (arrow keys move between options).
 * `variant="cards"` renders larger options with a hint line.
 */
export function SegmentedControl<T extends string>({
  name,
  legend,
  legendHidden = false,
  value,
  onChange,
  options,
  variant = "segmented",
  className,
  describedBy,
}: {
  name: string;
  legend: React.ReactNode;
  legendHidden?: boolean;
  value: T;
  onChange: (value: T) => void;
  options: SegmentOption<T>[];
  variant?: "segmented" | "cards";
  className?: string;
  describedBy?: string;
}) {
  return (
    <fieldset className={cn("min-w-0", className)} aria-describedby={describedBy}>
      <legend className={cn("mb-1.5 text-[13px] font-medium text-foreground", legendHidden && "sr-only")}>{legend}</legend>
      <div
        className={cn(
          variant === "segmented"
            ? "inline-flex flex-wrap gap-1 rounded-lg bg-muted p-1"
            : "grid gap-2 sm:grid-cols-[repeat(auto-fit,minmax(9rem,1fr))]",
        )}
      >
        {options.map((o) => {
          const Icon = o.icon;
          return (
            <label
              key={o.value}
              className={cn(
                "relative flex cursor-pointer items-center gap-2 text-sm font-medium transition-colors",
                "has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ring",
                "has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-50",
                variant === "segmented"
                  ? "h-8 rounded-md px-3 text-muted-foreground hover:text-foreground has-[:checked]:bg-card has-[:checked]:text-foreground has-[:checked]:shadow-sm"
                  : "items-start rounded-lg border border-border bg-card px-3 py-2.5 hover:border-primary/40 has-[:checked]:border-primary has-[:checked]:bg-primary-soft",
              )}
            >
              <input
                type="radio"
                name={name}
                value={o.value}
                checked={value === o.value}
                disabled={o.disabled}
                onChange={() => onChange(o.value)}
                className="sr-only"
              />
              {Icon && <Icon className={cn("size-4 shrink-0", variant === "cards" && "mt-0.5 text-muted-foreground")} aria-hidden="true" />}
              {variant === "cards" ? (
                <span className="min-w-0">
                  <span className="block leading-5">{o.label}</span>
                  {o.hint && <span className="block text-xs font-normal text-muted-foreground">{o.hint}</span>}
                </span>
              ) : (
                o.label
              )}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
