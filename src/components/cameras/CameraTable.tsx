import { Eye, MoreHorizontal, Pencil, Trash2, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CameraStatusBadge } from "./CameraStatusBadge";
import { useAppStore } from "@/store/useAppStore";
import { cameraStatus, SOURCE_TYPE_LABEL } from "@/utils/cameras";
import { formatDateTime } from "@/utils/formatters";
import type { Camera } from "@/types";

export function CameraTable({
  onView,
  onEdit,
  onAssignVideo,
  onRemove,
}: {
  onView: (camera: Camera) => void;
  onEdit: (camera: Camera) => void;
  onAssignVideo: (camera: Camera) => void;
  onRemove: (camera: Camera) => void;
}) {
  const cameras = useAppStore((s) => s.cameras);
  const videos = useAppStore((s) => s.videos);
  const aisles = useAppStore((s) => s.aisles);
  const dateFormat = useAppStore((s) => s.settings.dateFormat);

  return (
    <Table>
      <caption className="sr-only">Configured cameras</caption>
      <TableHeader>
        <TableRow>
          <TableHead scope="col">Camera ID</TableHead>
          <TableHead scope="col">Camera Name</TableHead>
          <TableHead scope="col">Store Area</TableHead>
          <TableHead scope="col">Source Type</TableHead>
          <TableHead scope="col">Status</TableHead>
          <TableHead scope="col">Last Updated</TableHead>
          <TableHead scope="col" className="text-right">
            <span className="sr-only">Actions</span>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {cameras.map((c) => {
          const covered = aisles.filter((a) => a.cameraId === c.id).map((a) => a.name);
          return (
            <TableRow key={c.id}>
              <TableCell className="font-mono text-xs font-semibold text-muted-foreground">{c.id.toUpperCase()}</TableCell>
              <TableCell>
                <button
                  type="button"
                  onClick={() => onView(c)}
                  className="rounded text-left font-medium text-foreground hover:text-primary hover:underline focus-visible:outline-2 focus-visible:outline-ring"
                >
                  {c.name}
                </button>
                <p className="max-w-[16rem] truncate text-xs text-muted-foreground">
                  {covered.length ? `Covers ${covered.join(", ")}` : "No aisle regions assigned"}
                </p>
              </TableCell>
              <TableCell>{c.area}</TableCell>
              <TableCell className="text-muted-foreground">{SOURCE_TYPE_LABEL[c.sourceType]}</TableCell>
              <TableCell>
                <CameraStatusBadge status={cameraStatus(c, videos)} />
              </TableCell>
              <TableCell className="text-muted-foreground tabular">{formatDateTime(c.updatedAt, dateFormat)}</TableCell>
              <TableCell className="text-right">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon-sm" aria-label={`Actions for ${c.name}`}>
                      <MoreHorizontal />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem onSelect={() => onView(c)}>
                      <Eye /> View details
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => onEdit(c)}>
                      <Pencil /> Edit camera
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => onAssignVideo(c)}>
                      <Video /> Assign video
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem variant="destructive" onSelect={() => onRemove(c)}>
                      <Trash2 /> Remove camera
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
