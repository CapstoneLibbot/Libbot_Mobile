import { GuidanceMission } from '../features/guidance/types/guidance.types';

export const missionsMock: GuidanceMission[] = [
  {
    id: 'mission-001',
    bookId: 'bk-1001',
    robotId: 'R-01',
    status: 'IN_PROGRESS',
    progress: 65,
    destination: { x: 24, y: 16, yaw: 1.2 },
    path: [
      { x: 0, y: 0, yaw: 0 },
      { x: 6, y: 2, yaw: 0.2 },
      { x: 14, y: 7, yaw: 0.7 },
      { x: 24, y: 16, yaw: 1.2 },
    ],
  },
];
