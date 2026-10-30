import { requireOptionalNativeModule } from "expo-modules-core";

export type XiaozhiNativeEvent = {
  type:
    | "connected"
    | "disconnected"
    | "error"
    | "stt"
    | "stt_partial"
    | "thinking"
    | "tts"
    | "listening"
    | "tool_result";
  text?: string;
  state?: string;
  code?: string;
  tool?: "search_books" | "search_areas";
  query?: string;
  totalMatches?: number;
  books?: XiaozhiVoiceBook[];
  areas?: XiaozhiVoiceArea[];
};

/** Presentation-safe records sent by the LiBot Xiaozhi server after an MCP tool call. */
export interface XiaozhiVoiceBook {
  bookId: string;
  title: string;
  author: string;
  isbn?: string;
  classification?: string;
  availableCopies: number;
}

export interface XiaozhiVoiceArea {
  name: string;
  floorName: string;
  floorNumber: number;
}

export interface XiaozhiAudioNativeModule {
  addListener(
    eventName: "onXiaozhiEvent",
    listener: (event: XiaozhiNativeEvent) => void,
  ): { remove(): void };
  connect(url: string, deviceId: string): Promise<void>;
  disconnect(): Promise<void>;
  speakGreeting(text: string): Promise<void>;
  resumeCapture(): Promise<void>;
  abort(): Promise<void>;
}

const XiaozhiAudio =
  requireOptionalNativeModule<XiaozhiAudioNativeModule>("XiaozhiAudio");

export function addXiaozhiEventListener(
  listener: (event: XiaozhiNativeEvent) => void,
): { remove(): void } | undefined {
  if (!XiaozhiAudio) return undefined;
  return XiaozhiAudio.addListener("onXiaozhiEvent", listener);
}

export default XiaozhiAudio;
