import { z } from "zod";

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

const NORMALIZED_JOB_STATUS: Record<
  string,
  "creating" | "active" | "completed" | "cancelled" | "failed"
> = {
  creating: "creating",
  queued: "creating",
  active: "active",
  running: "active",
  completed: "completed",
  succeeded: "completed",
  cancelled: "cancelled",
  failed: "failed",
};

export const jobstatusPayloadSchema = z.object({
  jobId: z.string(),
  status: z
    .enum([
      "creating",
      "active",
      "completed",
      "cancelled",
      "failed",
      "QUEUED",
      "RUNNING",
      "SUCCEEDED",
      "COMPLETED",
      "FAILED",
      "CANCELLED",
    ])
    .transform((val) => NORMALIZED_JOB_STATUS[val.toLowerCase()] ?? "active"),
  progress: z.number().min(0).max(100).optional(),
}).passthrough();

export const jobstepPayloadSchema = z.object({
  jobId: z.string(),
  step: z.string().optional(),
  executionId: z.string().optional(),
  runtimeId: z.string().optional(),
  status: z.string().optional(),
  currentStep: z.string().nullable().optional(),
  currentStepName: z.string().nullable().optional(),
  currentStepType: z.string().nullable().optional(),
  expectedEventType: z.string().nullable().optional(),
  allowedValues: z.array(z.string()).optional(),
  error: z.string().nullable().optional(),
  progress: z.number().min(0).max(100).optional(),
}).passthrough().refine(
  (payload) => typeof payload.step === "string" || typeof payload.status === "string",
  { message: "JobStepChanged payload requires step or status." },
);

export const runtimeTelemetryPayloadSchema = z.object({
  id: z.string(),
  displayName: z.string(),
  kind: z.string(),
  connected: z.boolean(),
  stale: z.boolean(),
  armed: z.boolean(),
  telemetry: z.object({
    timestamp: z.string(),
    pose: z.object({ x: z.number(), y: z.number(), yaw: z.number() }),
    localizationState: z.string(),
    navigationState: z.string(),
    activeGoalId: z.string().nullable().optional(),
    plannedPath: z.array(z.object({ x: z.number(), y: z.number() })).nullable().optional(),
    error: z.string().nullable().optional(),
    battery: z.number().nullable().optional(),
    activeMapId: z.string().nullable().optional(),
  }).nullable(),
}).passthrough();

export type RealtimeEventName =
  | "RobotPositionUpdated"
  | "RobotStatusChanged"
  | "RobotBatteryUpdated"
  | "RobotConnectionChanged"
  | "JobStatusChanged"
  | "JobStepChanged"
  | "RobotTelemetryUpdated"
  | "RuntimeConnectionChanged";

export interface RealtimeEventMap {
  RobotPositionUpdated: z.infer<typeof robotPositionPayloadSchema>;
  RobotStatusChanged: z.infer<typeof robotStatusPayloadSchema>;
  RobotBatteryUpdated: z.infer<typeof robotBatteryPayloadSchema>;
  RobotConnectionChanged: z.infer<typeof robotConnectionPayloadSchema>;
  JobStatusChanged: z.infer<typeof jobstatusPayloadSchema>;
  JobStepChanged: z.infer<typeof jobstepPayloadSchema>;
  RobotTelemetryUpdated: z.infer<typeof runtimeTelemetryPayloadSchema>;
  RuntimeConnectionChanged: z.infer<typeof runtimeTelemetryPayloadSchema>;
}

export const realtimeEventSchemas = {
  RobotPositionUpdated: robotPositionPayloadSchema,
  RobotStatusChanged: robotStatusPayloadSchema,
  RobotBatteryUpdated: robotBatteryPayloadSchema,
  RobotConnectionChanged: robotConnectionPayloadSchema,
  JobStatusChanged: jobstatusPayloadSchema,
  JobStepChanged: jobstepPayloadSchema,
  RobotTelemetryUpdated: runtimeTelemetryPayloadSchema,
  RuntimeConnectionChanged: runtimeTelemetryPayloadSchema,
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
