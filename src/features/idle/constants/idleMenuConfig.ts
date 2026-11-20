import { kioskTimeoutConfig } from "@/core/config";

export const IDLE_MENU_CONFIG = {
  fabSize: 58,
  fabIconSize: 28,
  actionIconSize: 22,
  animationDurationMs: 220,
  // Voice recognition can take several seconds to produce a final Vietnamese
  // transcript. Keep the shared-kiosk safeguard, but give a real reader time
  // to answer a follow-up question without ending their Xiaozhi session.
  voiceModalAutoCloseMs: kioskTimeoutConfig.voiceModalInactivityMs,
  zIndex: {
    backdrop: 90,
    fabMenu: 100,
    modal: 200,
  },
} as const;
