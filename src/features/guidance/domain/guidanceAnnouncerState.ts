export type GuidancePhase =
  | "IDLE"
  | "DEPARTING"
  | "NAVIGATING"
  | "ARRIVED"
  | "FAILED";

export const GUIDANCE_SPEECH_TEXTS = {
  START: "Mời bạn đi theo tôi",
  ARRIVED: "Đã đến nơi rồi",
  ERROR: "Đã có lỗi xảy ra",
} as const;

export const GUIDANCE_TRANSITION_DELAY_MS = 1800;

export interface GuidanceAnnouncerState {
  phase: GuidancePhase;
  announcedJobId: string | null;
}

export const INITIAL_GUIDANCE_ANNOUNCER_STATE: GuidanceAnnouncerState = {
  phase: "IDLE",
  announcedJobId: null,
};

export const guidanceAnnouncerTransitions = {
  sessionStarted(jobId: string, current: GuidanceAnnouncerState = INITIAL_GUIDANCE_ANNOUNCER_STATE): {
    state: GuidanceAnnouncerState;
    shouldSpeak: boolean;
    speechText?: string;
  } {
    if (!jobId || current.announcedJobId === jobId) {
      return { state: current, shouldSpeak: false };
    }
    return {
      state: { phase: "DEPARTING", announcedJobId: jobId },
      shouldSpeak: true,
      speechText: GUIDANCE_SPEECH_TEXTS.START,
    };
  },

  departingCompleted(current: GuidanceAnnouncerState): GuidanceAnnouncerState {
    if (current.phase === "DEPARTING") {
      return { ...current, phase: "NAVIGATING" };
    }
    return current;
  },

  arrived(current: GuidanceAnnouncerState): {
    state: GuidanceAnnouncerState;
    shouldSpeak: boolean;
    speechText: string;
  } {
    return {
      state: { ...current, phase: "ARRIVED" },
      shouldSpeak: true,
      speechText: GUIDANCE_SPEECH_TEXTS.ARRIVED,
    };
  },

  failed(current: GuidanceAnnouncerState): {
    state: GuidanceAnnouncerState;
    shouldSpeak: boolean;
    speechText: string;
  } {
    return {
      state: { ...current, phase: "FAILED" },
      shouldSpeak: true,
      speechText: GUIDANCE_SPEECH_TEXTS.ERROR,
    };
  },

  reset(): GuidanceAnnouncerState {
    return INITIAL_GUIDANCE_ANNOUNCER_STATE;
  },
};
