export interface RobotStatus {
  robotId: string;
  name: string;
  status: 'IDLE' | 'MOVING' | 'CHARGING' | 'FAULT';
  battery: number;
  connected: boolean;
  pose?: {
    x: number;
    y: number;
    yaw: number;
  };
}
