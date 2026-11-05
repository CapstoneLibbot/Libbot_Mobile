import { apiClient } from "@/services/api/client";
import type { FeedbackRepository, FeedbackSubmissionResult, SubmitFeedbackRequest } from "../types/feedback.types";

export class HttpFeedbackRepository implements FeedbackRepository {
  async submitFeedback(req: SubmitFeedbackRequest): Promise<FeedbackSubmissionResult> {
    const response = await apiClient.post<{ feedbackId: string }>("/book-guidance/feedback", {
      taskId: req.missionId,
      rating: req.rating,
      comment: req.comment,
    });
    return { success: Boolean(response.data.feedbackId), message: "Cảm ơn bạn đã gửi phản hồi!" };
  }
}
