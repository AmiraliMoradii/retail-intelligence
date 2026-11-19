import { format, parseISO } from "date-fns";
import type { DateFormatPreference } from "@/types";

const numberFmt = new Intl.NumberFormat("en-CA");
const compactFmt = new Intl.NumberFormat("en-CA", { notation: "compact", maximumFractionDigits: 1 });
const currencyFmt = new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD" });

export const formatNumber = (n: number) => numberFmt.format(Math.round(n));
export const formatCompact = (n: number) => compactFmt.format(n);
export const formatCurrency = (n: number) => currencyFmt.format(n);

export function formatPercent(n: number, { signed = true, digits = 1 } = {}) {
  const v = n.toFixed(digits);
  if (!signed) return `${v}%`;
  return `${n > 0 ? "+" : n < 0 ? "−" : ""}${Math.abs(n).toFixed(digits)}%`;
}

export function formatSeconds(seconds: number) {
  const s = Math.round(seconds);
  if (s < 60) return `${s} sec`;
  const m = Math.floor(s / 60);
  return `${m}m ${String(s % 60).padStart(2, "0")}s`;
}

export function formatHour(hour: number) {
  const h = ((hour % 24) + 24) % 24;
  const suffix = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12} ${suffix}`;
}

/** 17 → "5–6 PM", 11 → "11 AM–12 PM" */
export function formatHourRange(hour: number) {
  const start = formatHour(hour);
  const end = formatHour(hour + 1);
  const [s, sSuf] = start.split(" ");
  const [e, eSuf] = end.split(" ");
  return sSuf === eSuf ? `${s}–${e} ${eSuf}` : `${s} ${sSuf}–${e} ${eSuf}`;
}

/** Compact axis label: 8 → "8a", 17 → "5p" */
export function formatHourShort(hour: number) {
  const h = hour % 24;
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}${h >= 12 ? "p" : "a"}`;
}

export function formatDate(value: string | Date, pref: DateFormatPreference = "MMM d, yyyy") {
  const d = typeof value === "string" ? parseISO(value) : value;
  if (Number.isNaN(d.getTime())) return String(value);
  return format(d, pref);
}

export function formatDateTime(value: string | Date, pref: DateFormatPreference = "MMM d, yyyy") {
  const d = typeof value === "string" ? parseISO(value) : value;
  if (Number.isNaN(d.getTime())) return String(value);
  return `${format(d, pref)}, ${format(d, "h:mm a")}`;
}

/** "2026-10" → "Oct 2026" (or "Oct" when short) */
export function formatMonth(month: string, short = false) {
  const d = parseISO(`${month}-01`);
  return format(d, short ? "MMM" : "MMM yyyy");
}

export function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB"];
  let v = bytes / 1024;
  let i = 0;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i++;
  }
  return `${v.toFixed(v < 10 ? 1 : 0)} ${units[i]}`;
}

export function pluralize(n: number, one: string, many = `${one}s`) {
  return `${formatNumber(n)} ${n === 1 ? one : many}`;
}
