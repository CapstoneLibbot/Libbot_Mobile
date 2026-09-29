import { RobotStatus } from '../features/robot-monitoring/types/robot.types';

export const robotsMock: RobotStatus[] = [
  { robotId: 'R-01', name: 'LiBot-01', status: 'MOVING', battery: 84, connected: true, pose: { x: 12, y: 8, yaw: 0.3 } },
  { robotId: 'R-02', name: 'LiBot-02', status: 'CHARGING', battery: 52, connected: true, pose: { x: 20, y: 13, yaw: 1.4 } },
  { robotId: 'R-03', name: 'LiBot-03', status: 'FAULT', battery: 18, connected: false, pose: { x: 9, y: 18, yaw: 2.2 } },
];
