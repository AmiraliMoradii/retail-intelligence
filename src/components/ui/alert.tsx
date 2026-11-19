import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { AlertTriangle, CheckCircle2, Info, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

const alertVariants = cva("relative flex w-full gap-3 rounded-lg border px-4 py-3 text-sm [&>svg]:mt-0.5 [&>svg]:size-4 [&>svg]:shrink-0", {
  variants: {
    variant: {
      info: "border-primary/20 bg-primary-soft text-foreground [&>svg]:text-primary",
      success: "border-success/25 bg-success-soft text-foreground [&>svg]:text-success-text",
      warning: "border-warning/35 bg-warning-soft text-foreground [&>svg]:text-warning-text",
      destructive: "border-destructive/25 bg-destructive-soft text-foreground [&>svg]:text-destructive-text",
    },
  },
  defaultVariants: { variant: "info" },
});

const icons = { info: Info, success: CheckCircle2, warning: AlertTriangle, destructive: XCircle };

export function Alert({
  className,
  variant = "info",
  title,
  children,
  icon,
  ...props
}: Omit<React.ComponentProps<"div">, "title"> &
  VariantProps<typeof alertVariants> & { title?: React.ReactNode; icon?: React.ReactNode }) {
  const Icon = icons[variant ?? "info"];
  return (
    <div className={cn(alertVariants({ variant }), className)} {...props}>
      {icon ?? <Icon aria-hidden="true" />}
      <div className="min-w-0 flex-1 space-y-0.5">
        {title && <p className="font-semibold leading-5">{title}</p>}
        {children && <div className="leading-5 text-muted-foreground [&_strong]:text-foreground">{children}</div>}
      </div>
    </div>
  );
}
