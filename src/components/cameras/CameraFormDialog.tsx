import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Radio, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SegmentedControl } from "@/components/settings/SegmentedControl";
import { STORE_AREAS } from "@/data/mockCameras";
import { useAppStore } from "@/store/useAppStore";
import type { Camera } from "@/types";
import { cameraLabel } from "@/services/analyticsService";

const cameraSchema = z.object({
  name: z.string().trim().min(1, "Camera name is required.").max(60, "Keep the name under 60 characters."),
  area: z.string().min(1, "Select the store area this camera covers."),
  description: z.string().max(200, "Keep the description under 200 characters."),
  sourceType: z.enum(["uploaded_video", "cctv_stream"]),
});

type CameraFormValues = z.infer<typeof cameraSchema>;

const EMPTY: CameraFormValues = { name: "", area: "", description: "", sourceType: "uploaded_video" };

export function CameraFormDialog({
  open,
  onOpenChange,
  camera,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** When provided the dialog edits this camera; otherwise it adds a new one. */
  camera?: Camera | null;
}) {
  const addCamera = useAppStore((s) => s.addCamera);
  const updateCamera = useAppStore((s) => s.updateCamera);
  const cameras = useAppStore((s) => s.cameras);
  const editing = Boolean(camera);

  const {
    register,
    control,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<CameraFormValues>({ resolver: zodResolver(cameraSchema), defaultValues: EMPTY });

  useEffect(() => {
    if (!open) return;
    reset(
      camera
        ? { name: camera.name, area: camera.area, description: camera.description, sourceType: camera.sourceType }
        : EMPTY,
    );
  }, [open, camera, reset]);

  const sourceType = watch("sourceType");
  const areas: string[] = [...STORE_AREAS];
  if (camera?.area && !areas.includes(camera.area)) areas.unshift(camera.area);

  const onSubmit = (values: CameraFormValues) => {
    const duplicate = cameras.some((c) => c.id !== camera?.id && c.name.trim().toLowerCase() === values.name.trim().toLowerCase());
    if (camera) {
      updateCamera(camera.id, { ...values, name: values.name.trim() });
      toast.success("Camera updated", { description: `${cameraLabel({ id: camera.id, name: values.name.trim() })} was saved.` });
    } else {
      const created = addCamera({ ...values, name: values.name.trim() });
      toast.success("Camera added", {
        description:
          values.sourceType === "cctv_stream"
            ? `${cameraLabel(created)} was added. Live streaming is a future integration — upload footage to analyse it today.`
            : `${cameraLabel(created)} was added. Assign an uploaded video and an aisle region to start (simulated) analytics.`,
      });
    }
    if (duplicate) toast.warning("Another camera already uses this name", { description: "Consider a more specific name to avoid confusion." });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit camera" : "Add camera"}</DialogTitle>
          <DialogDescription>
            {editing
              ? "Update how this camera is described and where its footage comes from."
              : "Register a camera so its footage can be assigned to aisle regions. No hardware connection is made in this prototype."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4" noValidate>
          <div className="grid gap-1.5">
            <Label htmlFor="camera-name">
              Camera name <span className="text-destructive-text" aria-hidden="true">*</span>
            </Label>
            <Input
              id="camera-name"
              placeholder="e.g. Produce Section"
              aria-invalid={errors.name ? true : undefined}
              aria-describedby={errors.name ? "camera-name-error" : undefined}
              aria-required="true"
              {...register("name")}
            />
            {errors.name && (
              <p id="camera-name-error" role="alert" className="text-xs text-destructive-text">
                {errors.name.message}
              </p>
            )}
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="camera-area">
              Camera location <span className="text-destructive-text" aria-hidden="true">*</span>
            </Label>
            <Controller
              control={control}
              name="area"
              render={({ field }) => (
                <Select value={field.value || undefined} onValueChange={field.onChange}>
                  <SelectTrigger
                    id="camera-area"
                    aria-invalid={errors.area ? true : undefined}
                    aria-describedby={errors.area ? "camera-area-error" : undefined}
                    aria-required="true"
                    onBlur={field.onBlur}
                  >
                    <SelectValue placeholder="Select a store area" />
                  </SelectTrigger>
                  <SelectContent>
                    {areas.map((a) => (
                      <SelectItem key={a} value={a}>
                        {a}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.area && (
              <p id="camera-area-error" role="alert" className="text-xs text-destructive-text">
                {errors.area.message}
              </p>
            )}
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="camera-description">
              Camera description <span className="text-xs font-normal text-muted-foreground">(optional)</span>
            </Label>
            <Textarea
              id="camera-description"
              rows={3}
              placeholder="Where it is mounted and what it can see"
              aria-invalid={errors.description ? true : undefined}
              aria-describedby={errors.description ? "camera-description-error" : "camera-description-hint"}
              {...register("description")}
            />
            {errors.description ? (
              <p id="camera-description-error" role="alert" className="text-xs text-destructive-text">
                {errors.description.message}
              </p>
            ) : (
              <p id="camera-description-hint" className="text-helper">
                Up to 200 characters.
              </p>
            )}
          </div>

          <Controller
            control={control}
            name="sourceType"
            render={({ field }) => (
              <SegmentedControl
                name="camera-source-type"
                legend="Source type"
                variant="cards"
                value={field.value}
                onChange={field.onChange}
                options={[
                  { value: "uploaded_video", label: "Uploaded Video", icon: Video, hint: "Recorded MP4 footage" },
                  { value: "cctv_stream", label: "CCTV Stream — Future Integration", icon: Radio, hint: "Not connected in prototype" },
                ]}
              />
            )}
          />
          {sourceType === "cctv_stream" && (
            <Alert variant="warning" title="Live CCTV streams are not connected in this prototype">
              The camera will be listed as “Stream — planned”. To see analytics today, upload recorded footage in Data Management.
            </Alert>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={isSubmitting}>
              {editing ? "Save changes" : "Add camera"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
