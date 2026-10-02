import { create } from "zustand";

export interface KioskState {
  kioskSessionId: string;
  activeMissionId: string | null;
  lastInteractionAt: number;
  selectedFacilityId: string | null;
  isVoiceActive: boolean;
  setActiveMissionId: (missionId: string | null) => void;
  setSelectedFacilityId: (facilityId: string | null) => void;
  setVoiceActive: (active: boolean) => void;
  recordInteraction: () => void;
  resetKioskSession: () => void;
}

export const generateSessionId = (): string =>
  `kiosk-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

export const useKioskStore = create<KioskState>((set) => ({
  kioskSessionId: generateSessionId(),
  activeMissionId: null,
  lastInteractionAt: Date.now(),
  selectedFacilityId: null,
  isVoiceActive: false,
  setActiveMissionId: (missionId: string | null) =>
    set({ activeMissionId: missionId, lastInteractionAt: Date.now() }),
  setSelectedFacilityId: (facilityId: string | null) =>
    set({ selectedFacilityId: facilityId, lastInteractionAt: Date.now() }),
  setVoiceActive: (active: boolean) =>
    set({ isVoiceActive: active, lastInteractionAt: Date.now() }),
  recordInteraction: () => set({ lastInteractionAt: Date.now() }),
  resetKioskSession: () =>
    set({
      kioskSessionId: generateSessionId(),
      activeMissionId: null,
      selectedFacilityId: null,
      isVoiceActive: false,
      lastInteractionAt: Date.now(),
    }),
}));
