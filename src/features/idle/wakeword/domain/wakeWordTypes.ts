import { type WakeWordPhase } from "../../domain/wakeWordState";

export interface DetectionResult {
  score: number;
  isDetected: boolean;
  keyword: string;
}

export interface UseWakeWordOptions {
  enabled: boolean;
  onWakeWord: (keyword: string) => void;
  threshold?: number;
}

export interface UseWakeWordReturn {
  isLoaded: boolean;
  error: string | null;
  phase: WakeWordPhase;
  score: number;
}
