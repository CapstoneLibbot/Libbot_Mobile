import { useXiaozhiVoiceSession } from "./useXiaozhiVoiceSession";

/** The kiosk has one voice transport: Xiaozhi over the LAN. */
export function useVoiceSession() {
  return useXiaozhiVoiceSession();
}
