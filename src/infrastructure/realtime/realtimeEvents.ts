import { z } from 'zod';

export const robotPositionPayloadSchema = z.object({
  robotId: z.string(),
  x: z.number(),
  y: z.number(),
  yaw: z.number(),
});

export const robotStatusPayloadSchema = z.object({
  robotId: z.string(),
  status: z.string(),
});

export const robotBatteryPayloadSchema = z.object({
  robotId: z.string(),
  battery: z.number().min(0).max(100),
});

export const robotConnectionPayloadSchema = z.object({
  robotId: z.string(),
  connected: z.boolean(),
});

export const missionStatusPayloadSchema = z.object({
  missionId: z.string(),
  status: z.enum(['creating', 'active', 'completed', 'cancelled', 'failed']),
  progress: z.number().min(0).max(100).optional(),
});

export const missionStepPayloadSchema = z.object({
  missionId: z.string(),
  step: z.string(),
  progress: z.number().min(0).max(100).optional(),
});

export type RealtimeEventName =
  | 'RobotPositionUpdated'
  | 'RobotStatusChanged'
  | 'RobotBatteryUpdated'
  | 'RobotConnectionChanged'
  | 'MissionStatusChanged'
  | 'MissionStepChanged';

export interface RealtimeEventMap {
  RobotPositionUpdated: z.infer<typeof robotPositionPayloadSchema>;
  RobotStatusChanged: z.infer<typeof robotStatusPayloadSchema>;
  RobotBatteryUpdated: z.infer<typeof robotBatteryPayloadSchema>;
  RobotConnectionChanged: z.infer<typeof robotConnectionPayloadSchema>;
  MissionStatusChanged: z.infer<typeof missionStatusPayloadSchema>;
  MissionStepChanged: z.infer<typeof missionStepPayloadSchema>;
}

export const realtimeEventSchemas = {
  RobotPositionUpdated: robotPositionPayloadSchema,
  RobotStatusChanged: robotStatusPayloadSchema,
  RobotBatteryUpdated: robotBatteryPayloadSchema,
  RobotConnectionChanged: robotConnectionPayloadSchema,
  MissionStatusChanged: missionStatusPayloadSchema,
  MissionStepChanged: missionStepPayloadSchema,
};

export function validateRealtimePayload<T extends RealtimeEventName>(
  eventName: T,
  rawPayload: unknown,
): RealtimeEventMap[T] | null {
  const schema = realtimeEventSchemas[eventName];
  const result = schema.safeParse(rawPayload);
  if (!result.success) {
    return null;
  }
  return result.data as RealtimeEventMap[T];
}
