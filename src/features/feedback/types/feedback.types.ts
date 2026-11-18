import type { GuidanceKind, GuidanceTerminalStatus } from "@/features/guidance/types/guidance.types";

export interface SubmitFeedbackRequest {
  jobId: string;
  guidanceKind: GuidanceKind;
  terminalStatus: GuidanceTerminalStatus;
  rating: number; // 1 - 5
  /** Legacy mock/test compatibility; tags are intentionally not sent to the backend. */
  tags?: string[];
  comment?: string;
}

export interface FeedbackSubmissionResult {
  success: boolean;
  message?: string;
}

export interface FeedbackRepository {
  submitFeedback(req: SubmitFeedbackRequest): Promise<FeedbackSubmissionResult>;
}

