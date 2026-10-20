export interface Pose2D {
  x: number;
  y: number;
  yaw: number;
}

export interface RobotRuntimeTelemetry {
  timestamp: string;
  pose: Pose2D;
  localizationState: string;
  navigationState: string;
  activeGoalId?: string | null;
  plannedPath?: { x: number; y: number }[] | null;
  error?: string | null;
  battery?: number | null;
}

export interface RobotRuntime {
  id: string;
  displayName: string;
  kind: string;
  connected: boolean;
  stale: boolean;
  armed: boolean;
  mappingActive: boolean;
  navigationActive: boolean;
  armExpiresAt?: string | null;
  lastTelemetryAt?: string | null;
  telemetry?: RobotRuntimeTelemetry | null;
}

export interface LiveOccupancyGrid {
  timestamp: string;
  width: number;
  height: number;
  resolution: number;
  originX: number;
  originY: number;
  originYaw: number;
  data: number[];
}

export interface SavedRobotMap {
  id: string;
  name: string;
  width: number;
  height: number;
  version: string;
  data?: { format?: string } | null;
}

export interface ArmLease {
  runtimeId: string;
  leaseId: string;
  expiresAt: string;
}
