import { AlertOctagon, AlertTriangle, CheckCircle2, Clock, Layers, Loader2, XCircle, Circle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { InventoryStatus, ProcessingStatus } from "@/types";
import { STATUS_META } from "@/utils/calculations";

/** Inventory status — icon + text, never color alone. */
export function InventoryStatusBadge({ status }: { status: InventoryStatus }) {
  const meta = STATUS_META[status];
  switch (status) {
    case "stockout_risk":
      return (
        <Badge variant="destructive">
          <AlertOctagon aria-hidden="true" /> {meta.short}
        </Badge>
      );
    case "replenish":
      return (
        <Badge variant="warning">
          <AlertTriangle aria-hidden="true" /> {meta.short}
        </Badge>
      );
    case "overstock":
      return (
        <Badge variant="default">
          <Layers aria-hidden="true" /> {meta.short}
        </Badge>
      );
    default:
      return (
        <Badge variant="success">
          <CheckCircle2 aria-hidden="true" /> {meta.short}
        </Badge>
      );
  }
}

export function ProcessingStatusBadge({ status }: { status: ProcessingStatus }) {
  switch (status) {
    case "processing":
      return (
        <Badge variant="default">
          <Loader2 className="animate-spin" aria-hidden="true" /> Processing
        </Badge>
      );
    case "completed":
      return (
        <Badge variant="success">
          <CheckCircle2 aria-hidden="true" /> Completed
        </Badge>
      );
    case "failed":
      return (
        <Badge variant="destructive">
          <XCircle aria-hidden="true" /> Failed
        </Badge>
      );
    default:
      return (
        <Badge variant="secondary">
          <Clock aria-hidden="true" /> Ready
        </Badge>
      );
  }
}

export function CoverageBadge({ coverage }: { coverage: "full" | "partial" | "none" }) {
  if (coverage === "none")
    return (
      <Badge variant="secondary">
        <Circle aria-hidden="true" /> No coverage
      </Badge>
    );
  if (coverage === "partial")
    return (
      <Badge variant="warning">
        <AlertTriangle aria-hidden="true" /> Partial
      </Badge>
    );
  return (
    <Badge variant="success">
      <CheckCircle2 aria-hidden="true" /> Full
    </Badge>
  );
}
