import { BRAND } from "@/config/brand";
import { cn } from "@/lib/utils";

export function BrandLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={cn("size-8 shrink-0", className)} aria-hidden="true">
      <rect width="32" height="32" rx="8" fill="var(--primary)" />
      <rect x="7" y="17" width="4" height="8" rx="1.5" fill="#fff" />
      <rect x="14" y="12" width="4" height="13" rx="1.5" fill="#fff" />
      <rect x="21" y="7" width="4" height="18" rx="1.5" fill="#fff" opacity=".75" />
    </svg>
  );
}

export function BrandMark({ collapsed = false, className }: { collapsed?: boolean; className?: string }) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <BrandLogo />
      {!collapsed && (
        <div className="min-w-0 leading-tight">
          <p className="truncate text-[15px] font-semibold tracking-tight text-foreground">{BRAND.name}</p>
          <p className="truncate text-[11px] text-muted-foreground">Retail analytics · Inventory AI</p>
        </div>
      )}
    </div>
  );
}
