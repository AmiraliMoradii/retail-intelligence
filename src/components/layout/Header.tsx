import { useState } from "react";
import { useLocation, useNavigate } from "react-router";
import { formatDistanceToNow, parseISO } from "date-fns";
import {
  Bell,
  Building2,
  CalendarDays,
  Check,
  ChevronDown,
  LogOut,
  Menu,
  PlusCircle,
  RotateCcw,
  Settings,
  Wand2,
  Boxes,
  Video,
  TrendingUp,
  Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { SidebarNav } from "./Sidebar";
import { BrandMark } from "./BrandMark";
import { DemoBadge } from "@/components/shared/DemoBadge";
import { ResetDemoDialog } from "@/components/shared/ResetDemoDialog";
import { NAV_ITEMS } from "@/config/navigation";
import { PUBLIC_DEMO } from "@/config/demo";
import { DATE_RANGES } from "@/services/analyticsService";
import { useAppStore } from "@/store/useAppStore";
import { useAuthStore } from "@/store/useAuthStore";
import type { AppNotification, DateRangeKey } from "@/types";
import { cn } from "@/lib/utils";

const NOTIF_ICON: Record<AppNotification["kind"], typeof Bell> = {
  inventory: Boxes,
  processing: Video,
  forecast: TrendingUp,
  system: Info,
};

function NotificationsMenu() {
  const navigate = useNavigate();
  const allNotifications = useAppStore((s) => s.notifications);
  const notifications = PUBLIC_DEMO ? allNotifications.filter((item) => item.kind !== "processing") : allNotifications;
  const markRead = useAppStore((s) => s.markNotificationRead);
  const markAll = useAppStore((s) => s.markAllNotificationsRead);
  const [open, setOpen] = useState(false);
  const unread = notifications.filter((n) => !n.read).length;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label={`Notifications${unread ? `, ${unread} unread` : ""}`}>
          <Bell className="size-[18px]" />
          {unread > 0 && (
            <span className="absolute top-1 right-1 flex min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] leading-4 font-semibold text-white">
              {unread}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[22rem] p-0" aria-label="Notifications">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <p className="text-sm font-semibold">Notifications</p>
          <Button variant="link" size="sm" className="text-xs" onClick={markAll} disabled={!unread}>
            <Check className="size-3.5" /> Mark all read
          </Button>
        </div>
        {notifications.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-muted-foreground">You're all caught up.</p>
        ) : (
          <ul className="max-h-96 overflow-y-auto py-1 scrollbar-thin">
            {notifications.map((n) => {
              const Icon = NOTIF_ICON[n.kind];
              return (
                <li key={n.id}>
                  <button
                    type="button"
                    className="flex w-full gap-3 px-4 py-2.5 text-left transition-colors hover:bg-muted focus-visible:bg-muted focus-visible:outline-none"
                    onClick={() => {
                      markRead(n.id);
                      setOpen(false);
                      if (n.href) navigate(n.href);
                    }}
                  >
                    <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                      <Icon className="size-3.5" aria-hidden="true" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2">
                        <span className={cn("truncate text-sm", n.read ? "font-medium text-muted-foreground" : "font-semibold text-foreground")}>
                          {n.title}
                        </span>
                        {!n.read && <span className="size-1.5 shrink-0 rounded-full bg-primary" aria-label="Unread" />}
                      </span>
                      <span className="mt-0.5 line-clamp-2 block text-xs text-muted-foreground">{n.body}</span>
                      <span className="mt-1 block text-[11px] text-subtle">
                        {formatDistanceToNow(parseISO(n.createdAt), { addSuffix: true })}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </PopoverContent>
    </Popover>
  );
}

function StoreSelector() {
  const store = useAppStore((s) => s.store);
  const navigate = useNavigate();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="flex h-9 max-w-[15rem] items-center gap-2 rounded-lg border border-border bg-card px-2.5 text-left text-sm shadow-xs transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring"
          aria-label={`Selected store: ${store.name}. Change store`}
        >
          <Building2 className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          <span className="min-w-0">
            <span className="block truncate font-medium leading-4">{store.name}</span>
            <span className="hidden truncate text-[11px] leading-3.5 text-muted-foreground sm:block">{store.location}</span>
          </span>
          <ChevronDown className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-72">
        <DropdownMenuLabel className="text-xs font-medium text-muted-foreground">Your stores</DropdownMenuLabel>
        <DropdownMenuItem className="items-start">
          <Building2 className="mt-0.5" />
          <span className="flex-1">
            <span className="block font-medium">{store.name}</span>
            <span className="block text-xs text-muted-foreground">
              {store.type} · {store.location}
            </span>
          </span>
          <Check className="text-primary! mt-0.5" />
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem disabled>
          <PlusCircle />
          <span className="flex-1">
            Add another store
            <span className="block text-xs text-muted-foreground">Multi-store reporting is planned after the MVP</span>
          </span>
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => navigate("/settings")}>
          <Settings /> Store settings
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function DateRangeSelect({ id = "global-range", className }: { id?: string; className?: string }) {
  const range = useAppStore((s) => s.filters.range);
  const setFilters = useAppStore((s) => s.setFilters);
  return (
    <Select value={range} onValueChange={(v) => setFilters({ range: v as DateRangeKey })}>
      <SelectTrigger id={id} className={cn("w-[10.5rem]", className)} aria-label="Date range">
        <CalendarDays className="size-4 text-muted-foreground" aria-hidden="true" />
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {DATE_RANGES.map((r) => (
          <SelectItem key={r.value} value={r.value}>
            {r.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function UserMenu() {
  const user = useAuthStore((s) => s.user);
  const signOut = useAuthStore((s) => s.signOut);
  const setOnboarding = useAppStore((s) => s.setOnboarding);
  const navigate = useNavigate();
  const [resetOpen, setResetOpen] = useState(false);
  if (!user) return null;
  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="flex items-center gap-2 rounded-full p-0.5 transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring lg:rounded-lg lg:py-1 lg:pr-2 lg:pl-1"
            aria-label={`Account menu for ${user.name}`}
          >
            <span className="flex size-8 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
              {user.initials}
            </span>
            <span className="hidden text-left lg:block">
              <span className="block text-sm leading-4 font-medium">{user.name}</span>
              <span className="block text-[11px] leading-3.5 text-muted-foreground">Store Manager</span>
            </span>
            <ChevronDown className="hidden size-4 text-muted-foreground lg:block" aria-hidden="true" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-64">
          <DropdownMenuLabel className="font-normal">
            <span className="block text-sm font-semibold">{user.name}</span>
            <span className="block truncate text-xs text-muted-foreground">{user.email}</span>
            <span className="mt-1 block text-[11px] text-subtle">{user.role}</span>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => navigate("/settings")}>
            <Settings /> Settings
          </DropdownMenuItem>
          {!PUBLIC_DEMO && (
            <DropdownMenuItem
              onSelect={() => {
                setOnboarding({ completed: false, step: 0, maxStep: 0 });
                navigate("/onboarding");
              }}
            >
              <Wand2 /> Restart store setup
            </DropdownMenuItem>
          )}
          <DropdownMenuItem onSelect={() => setResetOpen(true)}>
            <RotateCcw /> Reset demo data
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            onSelect={() => {
              signOut();
              navigate("/login", { replace: true });
            }}
          >
            <LogOut /> {PUBLIC_DEMO ? "Exit sample store" : "Sign out"}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <ResetDemoDialog open={resetOpen} onOpenChange={setResetOpen} />
    </>
  );
}

export function Header() {
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const current = NAV_ITEMS.find((n) => location.pathname.startsWith(n.to));

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-header backdrop-blur-md">
      <div className="flex h-16 min-w-0 items-center gap-2 px-4 sm:gap-3 lg:px-6">
        <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setMobileOpen(true)} aria-label="Open navigation menu">
          <Menu className="size-5" />
        </Button>
        <StoreSelector />
        {current?.dateRange && <DateRangeSelect className="hidden md:flex" />}
        <div className="ml-auto flex items-center gap-1 sm:gap-2">
          <span className="hidden xl:inline-flex">
            <DemoBadge label="Demo Mode — Simulated Data" />
          </span>
          <span className="hidden sm:inline-flex xl:hidden">
            <DemoBadge label="Demo Mode" />
          </span>
          <NotificationsMenu />
          <UserMenu />
        </div>
      </div>
      {current?.dateRange && (
        <div className="flex items-center gap-2 border-t border-border px-4 py-2 md:hidden">
          <DateRangeSelect id="global-range-mobile" className="w-full" />
        </div>
      )}

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-72 p-0">
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <SheetDescription className="sr-only">Main application navigation</SheetDescription>
          <div className="flex h-16 items-center border-b border-border px-4">
            <BrandMark />
          </div>
          <div className="p-3">
            <SidebarNav onNavigate={() => setMobileOpen(false)} />
          </div>
          <div className="mx-3 mt-2 rounded-lg border border-warning/30 bg-warning-soft p-3 text-xs text-muted-foreground">
            <span className="font-semibold text-warning-text">Demo Mode — Simulated Data.</span> No real cameras, AI models or store
            systems are connected.
          </div>
        </SheetContent>
      </Sheet>
    </header>
  );
}
