export interface SubmitFeedbackRequest {
  missionId: string;
  rating: number; // 1 - 5
  /** Legacy mock/test compatibility; tags are intentionally not sent to the backend. */
  tags?: string[];
  comment?: string;
  kioskSessionId: string;
}

export interface FeedbackSubmissionResult {
  success: boolean;
  message?: string;
}

export interface FeedbackRepository {
  submitFeedback(req: SubmitFeedbackRequest): Promise<FeedbackSubmissionResult>;
}

