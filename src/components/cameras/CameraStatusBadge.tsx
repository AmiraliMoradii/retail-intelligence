import { CheckCircle2, Loader2, Radio, VideoOff } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { CameraStatus } from "@/types";
import { CAMERA_STATUS_META } from "@/utils/cameras";

/** Derived camera status — icon + label, never colour alone. */
export function CameraStatusBadge({ status }: { status: CameraStatus }) {
  const meta = CAMERA_STATUS_META[status];
  const badge =
    status === "active" ? (
      <Badge variant="success">
        <CheckCircle2 aria-hidden="true" /> {meta.label}
      </Badge>
    ) : status === "processing" ? (
      <Badge variant="default">
        <Loader2 className="animate-spin" aria-hidden="true" /> {meta.label}
      </Badge>
    ) : status === "future_integration" ? (
      <Badge variant="warning">
        <Radio aria-hidden="true" /> {meta.label}
      </Badge>
    ) : (
      <Badge variant="secondary">
        <VideoOff aria-hidden="true" /> {meta.label}
      </Badge>
    );
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span tabIndex={0} className="inline-flex rounded-full focus-visible:outline-2 focus-visible:outline-ring">
          {badge}
        </span>
      </TooltipTrigger>
      <TooltipContent>{meta.description}</TooltipContent>
    </Tooltip>
  );
}
