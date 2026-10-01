export type GuidanceMissionStatus =
  "creating" | "active" | "completed" | "cancelled" | "failed";

export interface RobotPose {
  x: number;
  y: number;
  yaw: number;
}

export interface GuidanceMission {
  id: string;
  bookId: string;
  bookTitle?: string;
  shelf?: string;
  targetFacilityId?: string;
  robotId: string;
  status: GuidanceMissionStatus;
  progress: number;
  currentPose?: RobotPose;
  destination?: RobotPose;
  path?: RobotPose[];
  errorMessage?: string;
  mapVersion?: string;
  routeRevision?: number;
  createdAt: string;
  updatedAt: string;
}

export type GuidanceDemoState =
  "navigating" | "replanning" | "arrived" | "cancelled";

export interface CreateMissionRequest {
  bookId: string;
  kioskSessionId: string;
}
