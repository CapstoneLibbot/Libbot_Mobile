export type GuidanceMissionStatus =
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

export interface GuidanceSession {
  missionId: string;
  executionId: string;
  runtimeId: string;
  endpointId: string;
  armLeaseId?: string;
  status: "starting" | "waiting" | "navigating" | "completed" | "failed";
}

export type GuidanceDemoState =
  "navigating" | "replanning" | "arrived" | "cancelled";

export interface CreateMissionRequest {
  bookId: string;
  kioskSessionId: string;
  bookItemId?: string;
  targetShelf?: string;
  barcode?: string;
}

export interface GuidanceRepository {
  createMission(req: CreateMissionRequest): Promise<GuidanceMission>;
  getMission(missionId: string): Promise<GuidanceMission | null>;
  cancelMission(missionId: string): Promise<GuidanceMission>;
  completeMission(missionId: string): Promise<GuidanceMission>;
}

