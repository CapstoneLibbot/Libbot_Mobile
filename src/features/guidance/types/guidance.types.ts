export interface RobotPose {
  x: number;
  y: number;
  yaw: number;
}

export interface GuidanceMission {
  id: string;
  bookId: string;
  robotId?: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  destination?: RobotPose;
  path?: RobotPose[];
  progress: number;
}
