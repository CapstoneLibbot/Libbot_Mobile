import { apiClient } from "@/services/api/client";
import type { FeedbackRepository, FeedbackSubmissionResult, SubmitFeedbackRequest } from "../types/feedback.types";

export class HttpFeedbackRepository implements FeedbackRepository {
  async submitFeedback(req: SubmitFeedbackRequest): Promise<FeedbackSubmissionResult> {
    const path = req.guidanceKind === "BOOK_GUIDANCE"
      ? "/book-guidance/feedback"
      : "/facility-guidance/feedback";
    const response = await apiClient.post<{ feedbackId: string }>(path, {
      jobId: req.jobId,
      rating: req.rating,
      comment: req.comment,
    });
    return { success: Boolean(response.data.feedbackId), message: "Cảm ơn bạn đã gửi phản hồi!" };
  }
}
