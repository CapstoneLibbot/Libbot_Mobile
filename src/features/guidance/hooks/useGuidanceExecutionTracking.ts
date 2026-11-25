import { useCallback, useEffect, useRef, useState } from "react";
import { signalRClient } from "@/platform/realtime";
import { bookGuidanceApi, type BookGuidanceExecution } from "../api/bookGuidance.api";
import { facilityGuidanceApi } from "@/features/facilities/api/facilityGuidance.api";
import type { GuidanceSession } from "../types/guidance.types";
import type { useGuidanceAnnouncer } from "./useGuidanceAnnouncer";

const CONNECTED_EXECUTION_POLL_MS = 5_000;

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

const STEP_TYPE_LABELS: Record<string, string> = {
  PROCESS_DATA: "Đang chuẩn bị thông tin điểm đến…",
  MOVE: "Robot đang dẫn đường đến vị trí…",
  WAIT: "Robot đã tới vị trí, đang chờ xác nhận…",
  SCAN: "Đang quét xác nhận mã sách…",
  NOTIFY: "Đã đến nơi, đang phát thông báo…",
  END: "Đang hoàn tất lượt dẫn đường…",
};

export function formatExecutionStepLabel(
  execution?: BookGuidanceExecution | null,
): string | null {
  if (!execution) return null;
  const status = execution.status?.toUpperCase();
  if (status === "STEP_FAILED" || status === "FAILED") {
    return execution.error || "Bước dẫn đường gặp sự cố.";
  }
  const stepType = execution.currentStepType?.toUpperCase();
  if (stepType && STEP_TYPE_LABELS[stepType]) {
    return execution.currentStep
      ? `${execution.currentStep} · ${STEP_TYPE_LABELS[stepType]}`
      : STEP_TYPE_LABELS[stepType];
  }
  if (execution.currentStep) {
    return `Đang xử lý bước ${execution.currentStep}…`;
  }
  return null;
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
  const latestExecutionRef = useRef<BookGuidanceExecution | null>(null);
  const pollInFlight = useRef(false);
  const completionPosted = useRef(false);
  const feedbackNavigated = useRef(false);
  const lastPollAtRef = useRef(0);

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

    const handleState = (state: BookGuidanceExecution, fromRealtime: boolean) => {
      if (!mounted) return;
      latestExecutionRef.current = state;
      setExecution(state);
      const normalized = state.status.toLowerCase();
      if (normalized === "completed" || normalized === "succeeded") {
        if (feedbackNavigated.current) return;
        feedbackNavigated.current = true;
        setSession({ ...activeSession, terminalStatus: "COMPLETED" });
        if (!fromRealtime) {
          void postCompletion(activeSession.jobId, true);
        }
        announcer.announceArrival(() => {
          onGoToFeedback(activeSession.jobId);
        });
      } else if (normalized === "failed" || normalized === "cancelled") {
        if (feedbackNavigated.current) return;
        feedbackNavigated.current = true;
        const failureMessage = formatWorkflowFailure(state);
        setSession({
          ...activeSession,
          terminalStatus: normalized === "cancelled" ? "CANCELLED" : "FAILED",
        });
        if (!fromRealtime) {
          void postCompletion(activeSession.jobId, false, failureMessage);
        }
        announcer.announceError(() => {
          onGoToFeedback(activeSession.jobId);
        });
      }
    };

    const unsubscribeStep = signalRClient.on("JobStepChanged", (payload) => {
      if (payload.jobId !== activeSession.jobId || !payload.status) return;
      handleState(
        {
          status: payload.status,
          currentStep: payload.currentStep ?? payload.step ?? null,
          currentStepType: payload.currentStepType ?? null,
          expectedEventType: payload.expectedEventType ?? null,
          allowedValues: payload.allowedValues,
          error: payload.error ?? null,
        },
        true,
      );
    });

    const unsubscribeStatus = signalRClient.on("JobStatusChanged", (payload) => {
      if (payload.jobId !== activeSession.jobId) return;
      handleState(
        {
          ...(latestExecutionRef.current ?? {}),
          status: payload.status,
        },
        true,
      );
    });

    const tick = async (force = false) => {
      if (!mounted || pollInFlight.current) return;
      const realtimeConnected = signalRClient.getConnection()?.state === "Connected";
      if (!force && realtimeConnected && Date.now() - lastPollAtRef.current < CONNECTED_EXECUTION_POLL_MS) {
        return;
      }
      pollInFlight.current = true;
      lastPollAtRef.current = Date.now();
      try {
        const state =
          activeSession.guidanceKind === "LOCATION_GUIDANCE"
            ? await facilityGuidanceApi.getExecution(activeSession.executionId)
            : await bookGuidanceApi.getExecution(activeSession.executionId);
        handleState(state, false);
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

    void tick(true);
    const timer = setInterval(() => {
      void tick(false);
    }, pollIntervalMs);
    return () => {
      mounted = false;
      clearInterval(timer);
      unsubscribeStep();
      unsubscribeStatus();
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
    lastPollAtRef.current = 0;
    latestExecutionRef.current = null;
    setExecution(null);
  }, []);

  return {
    execution,
    resetTracking,
  };
}
