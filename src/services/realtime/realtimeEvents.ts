export type RealtimeEventName =
  | 'RobotPositionUpdated'
  | 'RobotStatusChanged'
  | 'RobotBatteryUpdated'
  | 'RobotConnectionChanged'
  | 'MissionStatusChanged'
  | 'MissionStepChanged'
  | 'NotificationCreated';

export interface RealtimeEventMap {
  RobotPositionUpdated: { robotId: string; x: number; y: number; yaw: number };
  RobotStatusChanged: { robotId: string; status: string };
  RobotBatteryUpdated: { robotId: string; battery: number };
  RobotConnectionChanged: { robotId: string; connected: boolean };
  MissionStatusChanged: { missionId: string; status: string };
  MissionStepChanged: { missionId: string; step: string };
  NotificationCreated: { notificationId: string; message: string; type: string };
}
