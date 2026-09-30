import { GuidanceMission } from '../features/guidance/types/guidance.types';

export const sampleMissionTemplate: Omit<GuidanceMission, 'id' | 'bookId' | 'createdAt' | 'updatedAt'> = {
  robotId: 'LiBot-01',
  status: 'active',
  progress: 25,
  currentPose: { x: 5.2, y: 3.1, yaw: 0.4 },
  destination: { x: 24.0, y: 16.5, yaw: 1.2 },
  path: [
    { x: 0, y: 0, yaw: 0 },
    { x: 5.2, y: 3.1, yaw: 0.4 },
    { x: 12.0, y: 8.5, yaw: 0.8 },
    { x: 18.5, y: 13.0, yaw: 1.0 },
    { x: 24.0, y: 16.5, yaw: 1.2 },
  ],
};
