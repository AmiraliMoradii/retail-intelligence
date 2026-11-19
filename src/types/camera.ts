export type CameraSourceType = "uploaded_video" | "cctv_stream";
export type CameraStatus = "active" | "processing" | "no_footage" | "future_integration";

export interface Camera {
  id: string;
  name: string;
  area: string;
  description: string;
  sourceType: CameraSourceType;
  /** Video currently used as this camera's footage source (status is derived, see cameraStatus()). */
  videoId: string | null;
  updatedAt: string;
}

export type ProcessingStatus = "ready" | "processing" | "completed" | "failed";

export interface VideoAsset {
  id: string;
  fileName: string;
  sizeBytes: number;
  durationLabel: string;
  cameraId: string | null;
  recordingDate: string;
  uploadedAt: string;
  status: ProcessingStatus;
  progress: number;
  message?: string;
  /** Demo fixtures have no playable file. */
  isFixture?: boolean;
}

export interface ProcessingJob {
  id: string;
  videoId: string;
  status: ProcessingStatus;
  progress: number;
  startedAt: string;
  completedAt: string | null;
  /** Pipeline stages planned for Milestone 4: OpenCV → YOLO26 → ByteTrack → zones → metrics */
  stage: "queued" | "decoding" | "detecting" | "tracking" | "aggregating" | "done";
  message?: string;
}
