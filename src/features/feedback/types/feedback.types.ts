export interface SubmitFeedbackRequest {
  missionId: string;
  rating: number; // 1 - 5
  tags?: string[];
  comment?: string;
  kioskSessionId: string;
}

export interface FeedbackSubmissionResult {
  success: boolean;
  message?: string;
}
