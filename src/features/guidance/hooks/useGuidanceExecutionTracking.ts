import { useCallback, useEffect, useRef, useState } from "react";
import { bookGuidanceApi, type BookGuidanceExecution } from "../api/bookGuidance.api";
import { facilityGuidanceApi } from "@/features/facilities/api/facilityGuidance.api";
import type { GuidanceSession } from "../types/guidance.types";
import type { useGuidanceAnnouncer } from "./useGuidanceAnnouncer";

export function getWorkflowFailureDetails(execution?: BookGuidanceExecution | null): {
  step?: string;
  code?: string;
  message?: string;
} {
  const results = execution?.result?.results ?? [];
  const failedStep =
    execution?.result?.failed_step ?? execution?.currentStep ?? undefined;
  const failedStepResult =
    results.find((item) => item.step === failedStep) ??
    results.find((item) =>
      ["error", "failed", "timeout"].includes(
        item.result?.status?.toLowerCase() ?? "",
      ),
    );
  return {
    step: failedStep ?? undefined,
    code: failedStepResult?.result?.nav2_result_code ?? undefined,
    message:
      failedStepResult?.result?.message ??
      execution?.error ??
      execution?.message ??
      undefined,
  };
}

export function formatWorkflowFailure(execution: BookGuidanceExecution): string {
  const details = getWorkflowFailureDetails(execution);
  return (
    [
      details.step ? `Bước ${details.step}` : undefined,
      details.code,
      details.message,
    ]
      .filter(Boolean)
      .join(" · ") || "BookGuidance workflow thất bại."
  );
}

export interface UseGuidanceExecutionTrackingOptions {
  activeSession: GuidanceSession | null;
  setSession: (session: GuidanceSession | null) => void;
  announcer: ReturnType<typeof useGuidanceAnnouncer>;
  onGoToFeedback: (jobId: string) => void;
  onErrorMessage?: (message: string) => void;
  pollIntervalMs?: number;
}

export function useGuidanceExecutionTracking({
  activeSession,
  setSession,
  announcer,
  onGoToFeedback,
  onErrorMessage,
  pollIntervalMs = 1200,
}: UseGuidanceExecutionTrackingOptions) {
  const [execution, setExecution] = useState<BookGuidanceExecution | null>(null);
  const pollInFlight = useRef(false);
  const completionPosted = useRef(false);
  const feedbackNavigated = useRef(false);

  const guidanceKind = activeSession?.guidanceKind;
  const postCompletion = useCallback(
    async (jobId: string, succeeded: boolean, message?: string) => {
      if (completionPosted.current) return;
      completionPosted.current = true;
      try {
        if (guidanceKind === "LOCATION_GUIDANCE") {
          await facilityGuidanceApi.complete(jobId, succeeded, message);
        } else {
          await bookGuidanceApi.complete(jobId, succeeded, message);
        }
      } catch {
        /* Workflow state remains authoritative in the UI. */
      }
    },
    [guidanceKind],
  );

  useEffect(() => {
    if (!activeSession || activeSession.terminalStatus) return;
    let mounted = true;
    const tick = async () => {
      if (!mounted || pollInFlight.current) return;
      pollInFlight.current = true;
      try {
        const state =
          activeSession.guidanceKind === "LOCATION_GUIDANCE"
            ? await facilityGuidanceApi.getExecution(activeSession.executionId)
            : await bookGuidanceApi.getExecution(activeSession.executionId);
        if (!mounted) return;
        setExecution(state);

        if (state.status.toLowerCase() === "completed") {
          if (feedbackNavigated.current) return;
          feedbackNavigated.current = true;
          setSession({ ...activeSession, terminalStatus: "COMPLETED" });
          void postCompletion(activeSession.jobId, true);
          announcer.announceArrival(() => {
            onGoToFeedback(activeSession.jobId);
          });
        } else if (
          ["failed", "cancelled"].includes(state.status.toLowerCase())
        ) {
          if (feedbackNavigated.current) return;
          feedbackNavigated.current = true;
          const failureMessage = formatWorkflowFailure(state);
          setSession({
            ...activeSession,
            terminalStatus:
              state.status.toLowerCase() === "cancelled" ? "CANCELLED" : "FAILED",
          });
          void postCompletion(activeSession.jobId, false, failureMessage);
          announcer.announceError(() => {
            onGoToFeedback(activeSession.jobId);
          });
        }
      } catch (error: unknown) {
        if (mounted && onErrorMessage) {
          const msg =
            error instanceof Error
              ? error.message
              : "Không thể kết nối với robot.";
          onErrorMessage(msg);
        }
      } finally {
        pollInFlight.current = false;
      }
    };

    void tick();
    const timer = setInterval(() => {
      void tick();
    }, pollIntervalMs);
    return () => {
      mounted = false;
      clearInterval(timer);
    };
  }, [
    activeSession,
    announcer,
    onErrorMessage,
    onGoToFeedback,
    pollIntervalMs,
    postCompletion,
    setSession,
  ]);

  const resetTracking = useCallback(() => {
    completionPosted.current = false;
    feedbackNavigated.current = false;
    setExecution(null);
  }, []);

  return {
    execution,
    resetTracking,
  };
}
