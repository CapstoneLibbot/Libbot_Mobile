import { apiClient } from "@/services/api/client";
import type { FeedbackRepository, FeedbackSubmissionResult, SubmitFeedbackRequest } from "../types/feedback.types";

const GUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export class HttpFeedbackRepository implements FeedbackRepository {
  async submitFeedback(req: SubmitFeedbackRequest): Promise<FeedbackSubmissionResult> {
    if (req.rating < 1 || req.rating > 5) {
      throw new Error("Đánh giá phải từ 1 đến 5 sao.");
    }

    // In simulation, mock or detached mission mode, jobId might not be a backend GUID
    if (!req.jobId || !GUID_REGEX.test(req.jobId)) {
      return { success: true, message: "Cảm ơn bạn đã gửi phản hồi!" };
    }

    const path = req.guidanceKind === "BOOK_GUIDANCE"
      ? "/book-guidance/feedback"
      : "/facility-guidance/feedback";

    try {
      const response = await apiClient.post<{ feedbackId?: string }>(path, {
        jobId: req.jobId,
        rating: req.rating,
        comment: req.comment,
      });
      return {
        success: Boolean(response.data?.feedbackId || response.status === 200 || response.status === 201),
        message: "Cảm ơn bạn đã gửi phản hồi!",
      };
    } catch (error: unknown) {
      // If task was not found (404), e.g. ephemeral mock robot or already archived task,
      // treat gracefully so Kiosk is not blocked.
      const status = typeof error === "object" && error !== null && "status" in error
        ? (error as { status: number }).status
        : undefined;

      if (status === 404) {
        return { success: true, message: "Cảm ơn bạn đã gửi phản hồi!" };
      }
      throw error;
    }
  }
}
