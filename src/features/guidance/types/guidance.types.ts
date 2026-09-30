export type GuidanceMissionStatus =
  | 'creating'
  | 'active'
  | 'completed'
  | 'cancelled'
  | 'failed';

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
  createdAt: string;
  updatedAt: string;
}

export interface CreateMissionRequest {
  bookId: string;
  kioskSessionId: string;
}
