import { NavLink } from "react-router";
import { ChevronsLeft, ChevronsRight, FlaskConical } from "lucide-react";
import { NAV_ITEMS } from "@/config/navigation";
import { BrandMark } from "./BrandMark";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useAppStore } from "@/store/useAppStore";
import { useInventorySummary } from "@/hooks/useInventory";
import { cn } from "@/lib/utils";

export function SidebarNav({ collapsed = false, onNavigate }: { collapsed?: boolean; onNavigate?: () => void }) {
  const { needsReplenishment } = useInventorySummary();
  const failedVideos = useAppStore((s) => s.videos.filter((v) => v.status === "failed").length);
  const counts: Record<string, number> = { "/inventory": needsReplenishment, "/data": failedVideos };

  return (
    <nav aria-label="Main navigation" className="flex flex-col gap-0.5">
      {NAV_ITEMS.map((item) => {
        const count = counts[item.to];
        const link = (
          <NavLink
            key={item.to}
            to={item.to}
            onClick={onNavigate}
            className={({ isActive }) =>
              cn(
                "group relative flex h-9 items-center gap-3 rounded-lg px-2.5 text-sm font-medium text-muted-foreground transition-colors",
                "hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-ring",
                isActive && "bg-primary-soft text-primary-soft-foreground hover:bg-primary-soft hover:text-primary-soft-foreground",
                collapsed && "justify-center px-0",
              )
            }
            aria-label={collapsed ? item.label : undefined}
          >
            {({ isActive }) => (
              <>
                {isActive && <span aria-hidden="true" className="absolute top-1.5 bottom-1.5 left-0 w-[3px] rounded-r-full bg-primary" />}
                <item.icon className="size-[18px] shrink-0" aria-hidden="true" />
                {!collapsed && <span className="truncate">{item.label}</span>}
                {!collapsed && count > 0 && (
                  <span
                    className="ml-auto rounded-full bg-muted px-1.5 text-[11px] font-semibold text-muted-foreground tabular group-aria-[current=page]:bg-card"
                    aria-label={`${count} need attention`}
                  >
                    {count}
                  </span>
                )}
              </>
            )}
          </NavLink>
        );
        return collapsed ? (
          <Tooltip key={item.to}>
            <TooltipTrigger asChild>{link}</TooltipTrigger>
            <TooltipContent side="right">{item.label}</TooltipContent>
          </Tooltip>
        ) : (
          link
        );
      })}
    </nav>
  );
}

export function Sidebar({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) {
  const store = useAppStore((s) => s.store);
  return (
    <aside
      className={cn(
        "sticky top-0 hidden h-dvh shrink-0 flex-col border-r border-border bg-sidebar transition-[width] duration-200 lg:flex",
        collapsed ? "w-[68px]" : "w-64",
      )}
      aria-label="Sidebar"
    >
      <div className={cn("flex h-16 items-center border-b border-border px-4", collapsed && "justify-center px-0")}>
        <BrandMark collapsed={collapsed} />
      </div>
      <div className="flex-1 overflow-y-auto px-3 py-4 scrollbar-thin">
        {!collapsed && <p className="mb-2 px-2.5 text-[11px] font-semibold tracking-wider text-subtle uppercase">Workspace</p>}
        <SidebarNav collapsed={collapsed} />
      </div>
      <div className="space-y-2 border-t border-border p-3">
        {!collapsed && (
          <div className="rounded-lg border border-warning/30 bg-warning-soft p-3">
            <p className="flex items-center gap-1.5 text-xs font-semibold text-warning-text">
              <FlaskConical className="size-3.5" aria-hidden="true" /> Demo Mode
            </p>
            <p className="mt-1 text-[11.5px] leading-4 text-muted-foreground">
              {store.name} uses simulated data. AI models and cameras are not connected.
            </p>
          </div>
        )}
        <button
          type="button"
          onClick={onToggle}
          className={cn(
            "flex h-8 w-full items-center gap-2 rounded-md px-2.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring",
            collapsed && "justify-center px-0",
          )}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          aria-expanded={!collapsed}
        >
          {collapsed ? <ChevronsRight className="size-4" aria-hidden="true" /> : <ChevronsLeft className="size-4" aria-hidden="true" />}
          {!collapsed && "Collapse"}
        </button>
      </div>
    </aside>
  );
}
