import * as React from "react";
import { Label as LabelPrimitive } from "radix-ui";
import { cn } from "@/lib/utils";

export function Label({ className, ...props }: React.ComponentProps<typeof LabelPrimitive.Root>) {
  return (
    <LabelPrimitive.Root
      className={cn(
        "flex items-center gap-1.5 text-[13px] font-medium leading-5 text-foreground select-none peer-disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}
