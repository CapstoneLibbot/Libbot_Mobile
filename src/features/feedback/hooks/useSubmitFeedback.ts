import { useMutation } from "@tanstack/react-query";
import { useKioskStore } from "../../../core/store/kioskStore";
import { feedbackRepository } from "../../../infrastructure/repositories/feedback.repository";
import {
  FeedbackSubmissionResult,
  SubmitFeedbackRequest,
} from "../types/feedback.types";

export const useSubmitFeedback = () => {
  const resetKioskSession = useKioskStore((state) => state.resetKioskSession);

  return useMutation<FeedbackSubmissionResult, Error, SubmitFeedbackRequest>({
    mutationFn: (req) => feedbackRepository.submitFeedback(req),
    onSuccess: () => {
      resetKioskSession();
    },
  });
};
