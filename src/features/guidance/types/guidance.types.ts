export type GuidanceJobStatus =
  "creating" | "active" | "completed" | "cancelled" | "failed";

export interface RobotPose {
  x: number;
  y: number;
  yaw: number;
}

export interface GuidanceMapEndpoint {
  id: string;
  mapId: string;
  name: string;
  endpointType?: "WAYPOINT" | "CHARGER" | "PARK";
  x: number;
  y: number;
  theta: number;
  isActive: boolean;
}

export interface GuidanceMapZone {
  id: string;
  mapId: string;
  zoneType: "KEEP_OUT" | "SPEED_LIMIT" | "NO_STOP";
  maxSpeed: number;
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  width?: number | null;
  height?: number | null;
  rotationAngle?: number;
  isActive: boolean;
}

export interface GuidanceJob {
  id: string;
  bookId: string;
  bookTitle?: string;
  shelf?: string;
  targetFacilityId?: string;
  robotId: string;
  status: GuidanceJobStatus;
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

export interface GuidanceSession {
  jobId: string;
  executionId: string;
  runtimeId: string;
  destinationId: string;
  destinationName: string;
  guidanceKind: GuidanceKind;
  startStatus: GuidanceStartStatus;
  terminalStatus?: GuidanceTerminalStatus;
}

export type GuidanceKind = "BOOK_GUIDANCE" | "LOCATION_GUIDANCE";
export type GuidanceStartStatus = "ACCEPTED" | "FAILED";
export type GuidanceTerminalStatus = "COMPLETED" | "FAILED" | "CANCELLED";

export type GuidanceDemoState =
  "navigating" | "replanning" | "arrived" | "cancelled";

export interface CreateJobRequest {
  bookId: string;
  kioskSessionId: string;
  bookItemId?: string;
  targetShelf?: string;
  barcode?: string;
}

export interface GuidanceRepository {
  createJob(req: CreateJobRequest): Promise<GuidanceJob>;
  getJob(jobId: string): Promise<GuidanceJob | null>;
  cancelJob(jobId: string): Promise<GuidanceJob>;
  completeJob(jobId: string): Promise<GuidanceJob>;
}

