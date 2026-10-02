import { useMutation } from "@tanstack/react-query";
import { getFeedbackRepository } from "@/core/composition";
import { useKioskStore } from "@/core/state";
import {
  FeedbackSubmissionResult,
  SubmitFeedbackRequest,
} from "../types/feedback.types";

export const useSubmitFeedback = () => {
  const resetKioskSession = useKioskStore((state) => state.resetKioskSession);

  return useMutation<FeedbackSubmissionResult, Error, SubmitFeedbackRequest>({
    mutationFn: (req) => getFeedbackRepository().submitFeedback(req),
    onSuccess: () => {
      resetKioskSession();
    },
  });
};
