import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

export const badgeVariants = cva(
  "inline-flex w-fit shrink-0 items-center gap-1 whitespace-nowrap rounded-full border px-2 py-0.5 text-xs font-medium [&_svg]:size-3 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary-soft text-primary-soft-foreground",
        secondary: "border-transparent bg-muted text-muted-foreground",
        outline: "border-border bg-card text-foreground",
        success: "border-success/25 bg-success-soft text-success-text",
        warning: "border-warning/30 bg-warning-soft text-warning-text",
        destructive: "border-destructive/25 bg-destructive-soft text-destructive-text",
        demo: "border-warning/30 bg-warning-soft text-warning-text uppercase tracking-wide text-[10.5px] font-semibold",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

export function Badge({
  className,
  variant,
  ...props
}: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}
