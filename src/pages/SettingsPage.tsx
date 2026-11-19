import type * as React from "react";
import { Link } from "react-router";
import { format } from "date-fns";
import { toast } from "sonner";
import { BarChart3, Bell, EyeOff, Laptop, Moon, Palette, ShieldCheck, Store, Sun, UserCog, Clock, ScanFace, Users, Video, ArrowRight } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageHeader } from "@/components/shared/PageHeader";
import { SegmentedControl } from "@/components/settings/SegmentedControl";
import { StoreSettingsForm } from "@/components/settings/StoreSettingsForm";
import { DataDeletionControls } from "@/components/settings/DataDeletionControls";
import { useAppStore } from "@/store/useAppStore";
import { DATE_RANGES } from "@/services/analyticsService";
import { DEMO_TODAY } from "@/data/mockStore";
import type { AppSettings, DateFormatPreference, DateRangeKey, RefreshPreference, ThemePreference } from "@/types";

function Section({
  icon: Icon,
  title,
  description,
  children,
  id,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  children: React.ReactNode;
  id: string;
}) {
  return (
    <Card id={id} role="region" aria-labelledby={`${id}-title`} className="scroll-mt-24">
      <CardHeader>
        <div className="flex items-start gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary-soft-foreground" aria-hidden="true">
            <Icon className="size-4" />
          </span>
          <div>
            <CardTitle id={`${id}-title`}>{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">{children}</CardContent>
    </Card>
  );
}

function SwitchRow({
  id,
  label,
  description,
  checked,
  onCheckedChange,
  badge,
}: {
  id: string;
  label: string;
  description: string;
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
  badge?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        <Label htmlFor={id} className="flex-wrap">
          {label} {badge}
        </Label>
        <p id={`${id}-desc`} className="text-xs text-muted-foreground">
          {description}
        </p>
      </div>
      <Switch id={id} checked={checked} onCheckedChange={onCheckedChange} aria-describedby={`${id}-desc`} className="mt-0.5" />
    </div>
  );
}

const SECTIONS = [
  { id: "store", label: "Store" },
  { id: "preferences", label: "Preferences" },
  { id: "analytics", label: "Analytics" },
  { id: "privacy", label: "Privacy" },
];

export default function SettingsPage() {
  const settings = useAppStore((s) => s.settings);
  const updateSettings = useAppStore((s) => s.updateSettings);
  const setFilters = useAppStore((s) => s.setFilters);

  const saved = (description: string) => toast.success("Settings updated", { id: "settings-updated", description });
  const set = (patch: Partial<AppSettings>, description: string) => {
    updateSettings(patch);
    saved(description);
  };
  const setNotif = (key: keyof AppSettings["notifications"], value: boolean, label: string) => {
    updateSettings({ notifications: { ...settings.notifications, [key]: value } });
    saved(`${label} ${value ? "on" : "off"}.`);
  };

  const dateExample = (f: DateFormatPreference) => format(DEMO_TODAY, f);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        description="Store details, display preferences, analytics defaults and privacy controls. Settings are saved in this browser."
      />

      <nav aria-label="Settings sections" className="flex flex-wrap gap-2">
        {SECTIONS.map((s) => (
          <a
            key={s.id}
            href={`#${s.id}`}
            className="rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
          >
            {s.label}
          </a>
        ))}
      </nav>

      <div className="grid gap-6 xl:grid-cols-2">
        <Section id="store" icon={Store} title="Store settings" description="How your store appears across the platform.">
          <StoreSettingsForm />
        </Section>

        <Section id="preferences" icon={UserCog} title="User preferences" description="Appearance, date format and notifications for your account.">
          <SegmentedControl<ThemePreference>
            name="theme"
            legend={
              <span className="flex items-center gap-1.5">
                <Palette className="size-3.5 text-muted-foreground" aria-hidden="true" /> Theme
              </span>
            }
            value={settings.theme}
            onChange={(v) => set({ theme: v }, `Theme set to ${v === "system" ? "match your system" : v}.`)}
            options={[
              { value: "light", label: "Light", icon: Sun },
              { value: "dark", label: "Dark", icon: Moon },
              { value: "system", label: "System", icon: Laptop },
            ]}
          />
          <SegmentedControl<DateFormatPreference>
            name="date-format"
            legend="Date format"
            variant="cards"
            value={settings.dateFormat}
            onChange={(v) => set({ dateFormat: v }, `Dates will display as ${dateExample(v)}.`)}
            options={[
              { value: "MMM d, yyyy", label: dateExample("MMM d, yyyy"), hint: "Month day, year" },
              { value: "dd/MM/yyyy", label: dateExample("dd/MM/yyyy"), hint: "Day/month/year" },
              { value: "yyyy-MM-dd", label: dateExample("yyyy-MM-dd"), hint: "ISO 8601" },
            ]}
          />
          <SwitchRow
            id="reduce-motion"
            label="Reduce motion"
            description="Turns off animations and transitions. Your system's reduced-motion setting is always respected."
            checked={settings.reduceMotion}
            onCheckedChange={(v) => set({ reduceMotion: v }, `Reduce motion ${v ? "on" : "off"}.`)}
          />
          <Separator />
          <fieldset className="space-y-4">
            <legend className="mb-3 flex items-center gap-1.5 text-[13px] font-medium">
              <Bell className="size-3.5 text-muted-foreground" aria-hidden="true" /> Notifications
            </legend>
            <SwitchRow
              id="notif-inventory"
              label="Inventory alerts"
              description="Replenishment needs and imported data."
              checked={settings.notifications.inventoryAlerts}
              onCheckedChange={(v) => setNotif("inventoryAlerts", v, "Inventory alerts")}
            />
            <SwitchRow
              id="notif-processing"
              label="Video processing updates"
              description="When simulated processing completes or fails."
              checked={settings.notifications.processingUpdates}
              onCheckedChange={(v) => setNotif("processingUpdates", v, "Video processing updates")}
            />
            <SwitchRow
              id="notif-forecast"
              label="Forecast updates"
              description="When a simulated forecast is generated."
              checked={settings.notifications.forecastUpdates}
              onCheckedChange={(v) => setNotif("forecastUpdates", v, "Forecast updates")}
            />
            <SwitchRow
              id="notif-weekly"
              label="Weekly summary email"
              badge={<Badge variant="secondary">Simulated — no email is sent</Badge>}
              description="A weekly digest of traffic and inventory highlights."
              checked={settings.notifications.weeklySummary}
              onCheckedChange={(v) => setNotif("weeklySummary", v, "Weekly summary email (simulated)")}
            />
          </fieldset>
        </Section>

        <Section id="analytics" icon={BarChart3} title="Analytics settings" description="Defaults for reports, aisle naming and data refresh.">
          <div className="grid gap-1.5 sm:max-w-xs">
            <Label htmlFor="default-range">Default reporting period</Label>
            <Select
              value={settings.defaultRange}
              onValueChange={(v) => {
                updateSettings({ defaultRange: v as DateRangeKey });
                setFilters({ range: v as DateRangeKey });
                saved(`Default reporting period set to ${DATE_RANGES.find((r) => r.value === v)?.label}.`);
              }}
            >
              <SelectTrigger id="default-range" aria-describedby="default-range-desc">
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
            <p id="default-range-desc" className="text-helper">
              Used by Store Overview and Aisle Analytics. Also applied to the current view.
            </p>
          </div>
          <Separator />
          <div className="space-y-3">
            <SwitchRow
              id="aisle-codes"
              label="Show aisle codes"
              description="Prefix aisle names with their code, e.g. “A1 · Produce”, in charts and tables."
              checked={settings.showAisleCodes}
              onCheckedChange={(v) => set({ showAisleCodes: v }, `Aisle codes ${v ? "shown" : "hidden"}.`)}
            />
            <Link
              to="/cameras"
              className="inline-flex items-center gap-1 rounded text-sm font-medium text-primary hover:underline focus-visible:outline-2 focus-visible:outline-ring"
            >
              Rename aisles and edit regions in Cameras & Aisles <ArrowRight className="size-3.5" aria-hidden="true" />
            </Link>
          </div>
          <Separator />
          <SegmentedControl<RefreshPreference>
            name="refresh"
            legend={
              <span className="flex items-center gap-1.5">
                <Clock className="size-3.5 text-muted-foreground" aria-hidden="true" /> Data refresh
              </span>
            }
            variant="cards"
            value={settings.refresh}
            onChange={(v) =>
              set({ refresh: v }, `Data refresh set to ${v === "manual" ? "manual" : v === "15min" ? "every 15 minutes" : "hourly"} (simulated).`)
            }
            options={[
              { value: "manual", label: "Manual", hint: "Use the Refresh button" },
              { value: "15min", label: "Every 15 minutes", hint: "After video processing" },
              { value: "hourly", label: "Hourly", hint: "Lower processing cost" },
            ]}
            describedBy="refresh-desc"
          />
          <p id="refresh-desc" className="text-helper">
            Refresh is simulated in this prototype — demo data is deterministic, so values do not change between refreshes.
          </p>
        </Section>

        <Section id="privacy" icon={ShieldCheck} title="Privacy settings" description="Footage retention, how tracking stays anonymous, and local data controls.">
          <div className="grid gap-1.5 sm:max-w-xs">
            <Label htmlFor="retention">Video retention</Label>
            <Select
              value={String(settings.videoRetentionDays)}
              onValueChange={(v) => set({ videoRetentionDays: Number(v) as AppSettings["videoRetentionDays"] }, `Footage will be kept for ${v} days.`)}
            >
              <SelectTrigger id="retention" aria-describedby="retention-desc">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[7, 14, 30, 90].map((d) => (
                  <SelectItem key={d} value={String(d)}>
                    {d} days
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p id="retention-desc" className="text-helper">
              How long uploaded footage would be kept before automatic deletion once storage exists (Milestone 4). Aggregated metrics are kept.
            </p>
          </div>

          <div className="rounded-lg border border-border bg-muted/40 p-4">
            <p className="mb-3 text-sm font-semibold">How anonymous tracking works</p>
            <ul className="space-y-2.5 text-sm text-muted-foreground">
              <li className="flex gap-2.5">
                <Users className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
                <span>
                  People are detected as anonymous shapes and given <strong className="text-foreground">temporary, camera-local track IDs</strong>.
                  IDs are not linked across cameras or visits, so the same shopper may create several aisle visits.
                </span>
              </li>
              <li className="flex gap-2.5">
                <ScanFace className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
                <span>
                  <strong className="text-foreground">No facial recognition</strong> and no identity or demographic profiles are created.
                </span>
              </li>
              <li className="flex gap-2.5">
                <BarChart3 className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
                <span>
                  Dashboards show <strong className="text-foreground">aggregate statistics only</strong> — visit counts, dwell times and peak hours.
                </span>
              </li>
              <li className="flex gap-2.5">
                <Video className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
                <span>
                  Raw footage can still show identifiable people. Before real deployment the store needs appropriate authorization, restricted
                  access, retention rules and a privacy assessment.
                </span>
              </li>
              <li className="flex gap-2.5">
                <EyeOff className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
                <span>In this prototype no footage is analysed, stored or sent anywhere.</span>
              </li>
            </ul>
          </div>

          <div>
            <p className="mb-1 text-sm font-semibold">Local demo data</p>
            <p className="mb-3 text-xs text-muted-foreground">
              The prototype stores its data in this browser's local storage. These controls only affect this browser.
            </p>
            <DataDeletionControls />
          </div>
        </Section>
      </div>
    </div>
  );
}
