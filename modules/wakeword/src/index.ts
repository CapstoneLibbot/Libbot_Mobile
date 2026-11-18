import { requireOptionalNativeModule } from "expo-modules-core";

export interface WakeWordEvent {
  keyword: string;
  score: number;
}

export interface WakeWordStateEvent {
  isListening: boolean;
}

export interface WakeWordErrorEvent {
  message: string;
}

export interface WakeWordNativeModule {
  initModels(classifierAsset?: string): Promise<boolean>;
  startListening(options?: {
    keyword?: string;
    threshold?: number;
    classifierAsset?: string;
  }): Promise<boolean>;
  stopListening(): Promise<boolean>;
  isListening(): boolean;
  addListener(
    eventName: "onWakeWord",
    listener: (event: WakeWordEvent) => void,
  ): { remove(): void };
  addListener(
    eventName: "onListeningStateChange",
    listener: (event: WakeWordStateEvent) => void,
  ): { remove(): void };
  addListener(
    eventName: "onError",
    listener: (event: WakeWordErrorEvent) => void,
  ): { remove(): void };
}

const WakeWordModule =
  requireOptionalNativeModule<WakeWordNativeModule>("WakeWord");

export const NativeWakeWord = {
  isAvailable(): boolean {
    return WakeWordModule != null;
  },

  async initModels(classifierAsset?: string): Promise<boolean> {
    if (!WakeWordModule) return false;
    return await WakeWordModule.initModels(classifierAsset);
  },

  async startListening(options?: {
    keyword?: string;
    threshold?: number;
    classifierAsset?: string;
  }): Promise<boolean> {
    if (!WakeWordModule) return false;
    return await WakeWordModule.startListening(options);
  },

  async stopListening(): Promise<boolean> {
    if (!WakeWordModule) return false;
    return await WakeWordModule.stopListening();
  },

  isListening(): boolean {
    if (!WakeWordModule) return false;
    return WakeWordModule.isListening();
  },

  addWakeWordListener(
    listener: (event: WakeWordEvent) => void,
  ): { remove(): void } | undefined {
    if (!WakeWordModule) return undefined;
    return WakeWordModule.addListener("onWakeWord", listener);
  },

  addStateListener(
    listener: (event: WakeWordStateEvent) => void,
  ): { remove(): void } | undefined {
    if (!WakeWordModule) return undefined;
    return WakeWordModule.addListener("onListeningStateChange", listener);
  },

  addErrorListener(
    listener: (event: WakeWordErrorEvent) => void,
  ): { remove(): void } | undefined {
    if (!WakeWordModule) return undefined;
    return WakeWordModule.addListener("onError", listener);
  },
};

export default WakeWordModule;
