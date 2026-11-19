import * as React from "react";
import { Dialog as SheetPrimitive } from "radix-ui";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export const Sheet = SheetPrimitive.Root;
export const SheetTrigger = SheetPrimitive.Trigger;
export const SheetClose = SheetPrimitive.Close;

export function SheetContent({
  className,
  children,
  side = "right",
  onOpenAutoFocus,
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Content> & { side?: "left" | "right" }) {
  const contentRef = React.useRef<HTMLDivElement>(null);
  return (
    <SheetPrimitive.Portal>
      <SheetPrimitive.Overlay className="fixed inset-0 z-50 animate-fade-in bg-slate-950/40" />
      <SheetPrimitive.Content
        ref={contentRef}
        tabIndex={-1}
        onOpenAutoFocus={(e) => {
          onOpenAutoFocus?.(e);
          // Focus the panel itself (announced via its title) instead of the first tooltip/badge inside it.
          if (!e.defaultPrevented && side === "right") {
            e.preventDefault();
            contentRef.current?.focus();
          }
        }}
        className={cn(
          "fixed inset-y-0 z-50 flex h-full flex-col bg-card shadow-pop outline-none",
          side === "right"
            ? "right-0 w-full animate-slide-in-right border-l border-border sm:max-w-xl"
            : "left-0 w-72 animate-slide-in-left border-r border-border",
          className,
        )}
        {...props}
      >
        {children}
        <SheetPrimitive.Close className="absolute top-4 right-4 rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring">
          <X className="size-4" aria-hidden="true" />
          <span className="sr-only">Close panel</span>
        </SheetPrimitive.Close>
      </SheetPrimitive.Content>
    </SheetPrimitive.Portal>
  );
}

export function SheetHeader({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("flex flex-col gap-1 border-b border-border px-6 py-5 pr-12", className)} {...props} />;
}
export function SheetTitle({ className, ...props }: React.ComponentProps<typeof SheetPrimitive.Title>) {
  return <SheetPrimitive.Title className={cn("text-lg font-semibold tracking-tight", className)} {...props} />;
}
export function SheetDescription({ className, ...props }: React.ComponentProps<typeof SheetPrimitive.Description>) {
  return <SheetPrimitive.Description className={cn("text-sm text-muted-foreground", className)} {...props} />;
}
