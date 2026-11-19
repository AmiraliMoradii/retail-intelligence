import type { Camera, CameraStatus, VideoAsset } from "@/types";

/** Camera status is derived from its source type and assigned footage — never stored. */
export function cameraStatus(camera: Camera, videos: VideoAsset[]): CameraStatus {
  if (camera.sourceType === "cctv_stream") return "future_integration";
  const assigned = videos.filter((v) => v.cameraId === camera.id);
  if (assigned.some((v) => v.status === "processing")) return "processing";
  if (assigned.some((v) => v.status === "completed")) return "active";
  return "no_footage";
}

export const CAMERA_STATUS_META: Record<CameraStatus, { label: string; description: string }> = {
  active: { label: "Footage processed", description: "Simulated analytics are available from uploaded footage." },
  processing: { label: "Processing", description: "Uploaded footage is being processed (simulated)." },
  no_footage: { label: "No footage", description: "Upload and assign a video to produce aisle analytics." },
  future_integration: { label: "Stream — planned", description: "Live CCTV streaming is a future integration and is not connected." },
};

export const SOURCE_TYPE_LABEL: Record<Camera["sourceType"], string> = {
  uploaded_video: "Uploaded Video",
  cctv_stream: "CCTV Stream — Future Integration",
};
