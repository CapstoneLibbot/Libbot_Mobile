import { describe, expect, it } from "vitest";
import {
  formatWorkflowFailure,
  getWorkflowFailureDetails,
} from "../hooks/useGuidanceExecutionTracking";
import type { BookGuidanceExecution } from "../api/bookGuidance.api";

describe("useGuidanceExecutionTracking Workflow Failure Formatters", () => {
  it("extracts failed step, nav2 code and message from execution result", () => {
    const execution: BookGuidanceExecution = {
      status: "FAILED",
      currentStep: "NAVIGATE_TO_SHELF",
      result: {
        failed_step: "NAVIGATE_TO_SHELF",
        results: [
          {
            step: "ARM_ROBOT",
            result: { status: "COMPLETED" },
          },
          {
            step: "NAVIGATE_TO_SHELF",
            result: {
              status: "FAILED",
              nav2_result_code: "NAV2_COLLISION_WARNING",
              message: "Đường đi bị vật cản chặn",
            },
          },
        ],
      },
    };

    const details = getWorkflowFailureDetails(execution);
    expect(details.step).toBe("NAVIGATE_TO_SHELF");
    expect(details.code).toBe("NAV2_COLLISION_WARNING");
    expect(details.message).toBe("Đường đi bị vật cản chặn");

    const formatted = formatWorkflowFailure(execution);
    expect(formatted).toContain("Bước NAVIGATE_TO_SHELF");
    expect(formatted).toContain("NAV2_COLLISION_WARNING");
    expect(formatted).toContain("Đường đi bị vật cản chặn");
  });

  it("falls back to root execution error message when results array is empty", () => {
    const execution: BookGuidanceExecution = {
      status: "FAILED",
      currentStep: "DOCKING",
      error: "Mất kết nối với robot base",
    };

    const details = getWorkflowFailureDetails(execution);
    expect(details.step).toBe("DOCKING");
    expect(details.message).toBe("Mất kết nối với robot base");

    const formatted = formatWorkflowFailure(execution);
    expect(formatted).toContain("Bước DOCKING");
    expect(formatted).toContain("Mất kết nối với robot base");
  });

  it("handles null or undefined execution gracefully", () => {
    const details = getWorkflowFailureDetails(null);
    expect(details.step).toBeUndefined();
    expect(details.code).toBeUndefined();
    expect(details.message).toBeUndefined();
  });
});
