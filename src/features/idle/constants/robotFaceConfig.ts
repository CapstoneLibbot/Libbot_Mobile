export const MAX_GAZE_OFFSET = {
  x: 13,
  y: 9,
} as const;

export interface GazeTarget {
  x: number;
  y: number;
  holdMs: number;
}

export const GLANCE_TARGETS: readonly GazeTarget[] = [
  { x: 0, y: 0, holdMs: 3200 }, // Look straight at user
  { x: 12, y: 0, holdMs: 2200 }, // Look right
  { x: 0, y: 0, holdMs: 3400 }, // Return center
  { x: -12, y: 0, holdMs: 2200 }, // Look left
  { x: 0, y: 0, holdMs: 3000 }, // Return center
  { x: 8, y: -6, holdMs: 2000 }, // Look curious top-right
  { x: 0, y: 0, holdMs: 3200 }, // Return center
  { x: -8, y: -6, holdMs: 2000 }, // Look curious top-left
  { x: 0, y: 0, holdMs: 3000 }, // Return center
  { x: 0, y: 6, holdMs: 1800 }, // Look down-center warmly
] as const;

export const ROBOT_EYE_DIMENSIONS = {
  socketWidth: 124,
  socketHeight: 150,
  pupilWidth: 92,
  pupilHeight: 112,
  eyeGap: 40,
} as const;
