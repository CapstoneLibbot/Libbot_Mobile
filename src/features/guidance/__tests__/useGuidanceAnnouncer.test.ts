import { describe, expect, it } from "vitest";
import {
  guidanceAnnouncerTransitions,
  GUIDANCE_SPEECH_TEXTS,
  INITIAL_GUIDANCE_ANNOUNCER_STATE,
} from "../domain/guidanceAnnouncerState";

describe("Guidance Announcer State Transitions & Machine Contract", () => {
  it("initializes in IDLE phase with no announcedJobId", () => {
    expect(INITIAL_GUIDANCE_ANNOUNCER_STATE).toEqual({
      phase: "IDLE",
      announcedJobId: null,
    });
  });

  describe("sessionStarted transition", () => {
    it("transitions to DEPARTING and requests speech when a new jobId is provided", () => {
      const result = guidanceAnnouncerTransitions.sessionStarted("job-101");
      expect(result.state).toEqual({
        phase: "DEPARTING",
        announcedJobId: "job-101",
      });
      expect(result.shouldSpeak).toBe(true);
      expect(result.speechText).toBe(GUIDANCE_SPEECH_TEXTS.START);
      expect(result.speechText).toBe("Mời bạn đi theo tôi");
    });

    it("does not speak or change state if the same jobId is passed again (Idempotency Guard)", () => {
      const first = guidanceAnnouncerTransitions.sessionStarted("job-101");
      const second = guidanceAnnouncerTransitions.sessionStarted("job-101", first.state);
      expect(second.shouldSpeak).toBe(false);
      expect(second.state).toBe(first.state);
    });

    it("ignores empty or null jobId", () => {
      const result = guidanceAnnouncerTransitions.sessionStarted("");
      expect(result.shouldSpeak).toBe(false);
      expect(result.state.phase).toBe("IDLE");
    });
  });

  describe("departingCompleted transition", () => {
    it("transitions from DEPARTING to NAVIGATING", () => {
      const departingState = {
        phase: "DEPARTING" as const,
        announcedJobId: "job-101",
      };
      const next = guidanceAnnouncerTransitions.departingCompleted(departingState);
      expect(next).toEqual({
        phase: "NAVIGATING",
        announcedJobId: "job-101",
      });
    });

    it("preserves state if not in DEPARTING phase", () => {
      const idleState = { phase: "IDLE" as const, announcedJobId: null };
      expect(guidanceAnnouncerTransitions.departingCompleted(idleState)).toBe(idleState);
    });
  });

  describe("arrived transition", () => {
    it("transitions to ARRIVED and requests speech with exact text", () => {
      const navigatingState = {
        phase: "NAVIGATING" as const,
        announcedJobId: "job-101",
      };
      const result = guidanceAnnouncerTransitions.arrived(navigatingState);
      expect(result.state.phase).toBe("ARRIVED");
      expect(result.shouldSpeak).toBe(true);
      expect(result.speechText).toBe(GUIDANCE_SPEECH_TEXTS.ARRIVED);
      expect(result.speechText).toBe("Đã đến nơi rồi");
    });
  });

  describe("failed transition", () => {
    it("transitions to FAILED and requests speech with exact short text (no verbose reason)", () => {
      const navigatingState = {
        phase: "NAVIGATING" as const,
        announcedJobId: "job-101",
      };
      const result = guidanceAnnouncerTransitions.failed(navigatingState);
      expect(result.state.phase).toBe("FAILED");
      expect(result.shouldSpeak).toBe(true);
      expect(result.speechText).toBe(GUIDANCE_SPEECH_TEXTS.ERROR);
      expect(result.speechText).toBe("Đã có lỗi xảy ra");
    });
  });

  describe("reset transition", () => {
    it("resets back to INITIAL_GUIDANCE_ANNOUNCER_STATE", () => {
      const result = guidanceAnnouncerTransitions.reset();
      expect(result).toEqual(INITIAL_GUIDANCE_ANNOUNCER_STATE);
    });
  });
});
