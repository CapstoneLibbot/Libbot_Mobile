export const formatRobotLabel = (robotId: string): string => `Robot ${robotId}`;

export const calculateDistance = (x1: number, y1: number, x2: number, y2: number): number =>
  Math.hypot(x2 - x1, y2 - y1);
