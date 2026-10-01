import {
  FeedbackSubmissionResult,
  SubmitFeedbackRequest,
} from "../../features/feedback/types/feedback.types";

export interface FeedbackRepository {
  submitFeedback(req: SubmitFeedbackRequest): Promise<FeedbackSubmissionResult>;
}

export class MockFeedbackRepository implements FeedbackRepository {
  private submissions: SubmitFeedbackRequest[] = [];
  private delayMs: number;

  constructor(delayMs = 150) {
    this.delayMs = delayMs;
  }

  private sleep(): Promise<void> {
    if (this.delayMs <= 0) return Promise.resolve();
    return new Promise((resolve) => setTimeout(resolve, this.delayMs));
  }

  async submitFeedback(
    req: SubmitFeedbackRequest,
  ): Promise<FeedbackSubmissionResult> {
    await this.sleep();

    if (req.rating < 1 || req.rating > 5) {
      throw new Error("Đánh giá phải từ 1 đến 5 sao.");
    }

    this.submissions.push(req);
    return {
      success: true,
      message: "Cảm ơn quý độc giả đã gửi phản hồi!",
    };
  }

  getSubmissions(): SubmitFeedbackRequest[] {
    return [...this.submissions];
  }
}

export const feedbackRepository: FeedbackRepository =
  new MockFeedbackRepository();
