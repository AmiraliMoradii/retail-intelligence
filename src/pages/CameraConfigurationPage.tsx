import { useState } from "react";
import { Link } from "react-router";
import { toast } from "sonner";
import { Camera as CameraIcon, Plus, Trash2, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { DemoBadge } from "@/components/shared/DemoBadge";
import { ShelfCheck } from "@/components/cameras/ShelfCheck";
import { CameraTable } from "@/components/cameras/CameraTable";
import { CameraFormDialog } from "@/components/cameras/CameraFormDialog";
import { CameraDetailsSheet } from "@/components/cameras/CameraDetailsSheet";
import { AssignVideoDialog } from "@/components/cameras/AssignVideoDialog";
import { AisleRegionEditor } from "@/components/cameras/AisleRegionEditor";
import { ConfirmDialog } from "@/components/cameras/ConfirmDialog";
import { PUBLIC_DEMO } from "@/config/demo";
import { useAppStore } from "@/store/useAppStore";
import { cameraLabel } from "@/services/analyticsService";
import { cameraStatus } from "@/utils/cameras";
import type { Camera } from "@/types";

export default function CameraConfigurationPage() {
  const cameras = useAppStore((s) => s.cameras);
  const videos = useAppStore((s) => s.videos);
  const aisles = useAppStore((s) => s.aisles);
  const removeCamera = useAppStore((s) => s.removeCamera);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Camera | null>(null);
  const [detailsId, setDetailsId] = useState<string | null>(null);
  const [assignId, setAssignId] = useState<string | null>(null);
  const [removing, setRemoving] = useState<Camera | null>(null);

  const details = cameras.find((c) => c.id === detailsId) ?? null;
  const assignCamera = cameras.find((c) => c.id === assignId) ?? null;
  const affected = removing ? aisles.filter((a) => a.cameraId === removing.id) : [];
  const withFootage = cameras.filter((c) => cameraStatus(c, videos) === "active").length;

  const openAdd = () => {
    setEditing(null);
    setFormOpen(true);
  };
  const openEdit = (c: Camera) => {
    setDetailsId(null);
    setEditing(c);
    setFormOpen(true);
  };
  const openAssign = (c: Camera) => {
    setDetailsId(null);
    setAssignId(c.id);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={<DemoBadge label="Simulated camera connections" tooltip={PUBLIC_DEMO ? "This demo uses sample camera records." : "Cameras are registered records. Footage comes from uploaded video files; no CCTV hardware is connected."} />}
        title="Cameras & Aisles"
        description="Register camera sources and define the aisle regions their footage is analysed for. Analytics only exist where a camera covers a region."
        actions={
          <>
            {!PUBLIC_DEMO && (
              <Button variant="outline" asChild>
                <Link to="/data?tab=video">
                  <Video /> Manage videos
                </Link>
              </Button>
            )}
            <Button onClick={openAdd}>
              <Plus /> Add camera
            </Button>
          </>
        }
      />

      <ShelfCheck allowLocalVideo={!PUBLIC_DEMO} />

      <Card>
        <CardHeader>
          <div>
            <CardTitle>Cameras</CardTitle>
            <CardDescription>
              {cameras.length === 0
                ? "No cameras configured."
                : `${cameras.length} ${cameras.length === 1 ? "camera" : "cameras"} · ${withFootage} with processed footage (simulated)`}
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="px-0 pb-2">
          {cameras.length === 0 ? (
            <div className="px-5 pb-3">
              <EmptyState
                icon={CameraIcon}
                title="No camera configured"
                description={PUBLIC_DEMO
                  ? "Add a sample camera and assign a sample video record."
                  : "Add a camera and assign uploaded footage to try simulated aisle analytics."}
                action={
                  <Button onClick={openAdd}>
                    <Plus /> Add camera
                  </Button>
                }
              />
            </div>
          ) : (
            <CameraTable
              onView={(c) => setDetailsId(c.id)}
              onEdit={openEdit}
              onAssignVideo={openAssign}
              onRemove={(c) => setRemoving(c)}
            />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div>
            <CardTitle>Aisle configuration</CardTitle>
            <CardDescription>
              Select an aisle, rename it, assign the camera that sees it, and reshape its region on the store layout. Saved regions are used by
              Aisle Analytics and the Overview.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <AisleRegionEditor />
        </CardContent>
      </Card>

      <Alert variant="info" title="How regions will work in the MVP">
        In Milestone 4, regions will be drawn on each camera's own frame and used by the tracking pipeline (YOLO26 person detection, ByteTrack
        tracking and Supervision zones) to count aisle visits and dwell time. In this prototype regions are drawn on a simplified store layout.
      </Alert>

      <CameraFormDialog open={formOpen} onOpenChange={setFormOpen} camera={editing} />
      <CameraDetailsSheet
        camera={details}
        open={Boolean(details)}
        onOpenChange={(o) => !o && setDetailsId(null)}
        onEdit={openEdit}
        onAssignVideo={openAssign}
      />
      <AssignVideoDialog camera={assignCamera} open={Boolean(assignCamera)} onOpenChange={(o) => !o && setAssignId(null)} />
      <ConfirmDialog
        open={Boolean(removing)}
        onOpenChange={(o) => !o && setRemoving(null)}
        title={removing ? `Remove ${cameraLabel(removing)}?` : "Remove camera?"}
        description={
          affected.length
            ? "The aisles below will lose camera coverage. They will stop being measured and will show “No camera coverage” in Aisle Analytics until another camera is assigned."
            : "This camera doesn't cover any aisle regions, so analytics are not affected."
        }
        confirmLabel={
          <>
            <Trash2 /> Remove camera
          </>
        }
        destructive
        onConfirm={() => {
          if (!removing) return;
          removeCamera(removing.id);
          toast.success("Camera removed", {
            description: affected.length
              ? `${affected.map((a) => a.name).join(", ")} ${affected.length === 1 ? "no longer has" : "no longer have"} camera coverage.`
              : `${cameraLabel(removing)} was removed.`,
          });
        }}
      >
        {affected.length > 0 && (
          <ul className="list-disc space-y-0.5 pl-5 text-sm">
            {affected.map((a) => (
              <li key={a.id}>{a.name}</li>
            ))}
          </ul>
        )}
      </ConfirmDialog>
    </div>
  );
}
