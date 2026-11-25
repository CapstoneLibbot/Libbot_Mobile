import * as signalR from "@microsoft/signalr";
import { env } from "@/config/env";
import {
  RealtimeEventMap,
  RealtimeEventName,
  validateRealtimePayload,
} from "./realtimeEvents";

export type RealtimeCallback<T extends RealtimeEventName> = (
  payload: RealtimeEventMap[T],
) => void;

export class SignalRClient {
  private connection: signalR.HubConnection | null = null;
  private listeners: Map<string, Set<(raw: unknown) => void>> = new Map();
  private runtimeGroups = new Set<string>();
  private customHubUrl: string | null = null;

  setHubUrl(url: string | null): void {
    this.customHubUrl = url;
  }

  async reconnectWithUrl(newUrl: string): Promise<void> {
    this.customHubUrl = newUrl;
    if (this.connection) {
      try {
        await this.disconnect();
      } catch {
        // ignore disconnect error during reconnect
      }
    }
    await this.connect();
  }

  setConnectionForTesting(conn: signalR.HubConnection | null): void {
    this.connection = conn;
  }

  getConnection(): signalR.HubConnection | null {
    return this.connection;
  }

  async connect(): Promise<void> {
    if (this.connection?.state === signalR.HubConnectionState.Connected) return;
    if (!env.apiBaseUrl && !env.signalRUrl) throw new Error("SignalR URL is not configured.");

    const hubUrl = this.getHubUrl();

    this.connection = new signalR.HubConnectionBuilder()
      .withUrl(hubUrl)
      .withAutomaticReconnect()
      .build();

    this.attachListeners(this.connection);
    this.connection.onreconnected(async () => {
      for (const runtimeId of this.runtimeGroups) {
        try { await this.connection?.invoke("SubscribeRuntime", runtimeId); } catch { /* REST polling remains available. */ }
      }
    });

    try {
      await this.connection.start();
      for (const runtimeId of this.runtimeGroups) await this.connection.invoke("SubscribeRuntime", runtimeId);
    } catch (error) {
      this.connection = null;
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    if (!this.connection) return;

    await this.connection.stop();
    this.connection = null;
    this.listeners.clear();
    this.runtimeGroups.clear();
  }

  on<T extends RealtimeEventName>(
    eventName: T,
    callback: RealtimeCallback<T>,
  ): () => void {
    const wrappedHandler = (rawPayload: unknown): void => {
      const validated = validateRealtimePayload(eventName, rawPayload);
      if (validated) {
        callback(validated);
      }
    };

    if (!this.listeners.has(eventName)) {
      this.listeners.set(eventName, new Set());
    }
    this.listeners.get(eventName)!.add(wrappedHandler);

    if (this.connection) {
      this.connection.on(eventName, wrappedHandler);
    }

    return () => {
      const set = this.listeners.get(eventName);
      if (set) {
        set.delete(wrappedHandler);
      }
      if (this.connection) {
        this.connection.off(eventName, wrappedHandler);
      }
    };
  }

  off<T extends RealtimeEventName>(
    eventName: T,
    callback?: (...args: unknown[]) => void,
  ): void {
    if (callback) {
      this.connection?.off(eventName, callback);
    } else {
      this.connection?.off(eventName);
      this.listeners.delete(eventName);
    }
  }

  async invoke(methodName: string, ...args: unknown[]): Promise<unknown> {
    if (!this.connection) {
      throw new Error("SignalR connection is not established.");
    }

    return this.connection.invoke(methodName, ...args);
  }

  async subscribeRuntime(runtimeId: string): Promise<void> {
    this.runtimeGroups.add(runtimeId);
    await this.connect();
    await this.connection!.invoke("SubscribeRuntime", runtimeId);
  }

  async unsubscribeRuntime(runtimeId: string): Promise<void> {
    this.runtimeGroups.delete(runtimeId);
    if (this.connection?.state === signalR.HubConnectionState.Connected) {
      await this.connection.invoke("UnsubscribeRuntime", runtimeId);
    }
  }

  private attachListeners(connection: signalR.HubConnection): void {
    for (const [eventName, handlers] of this.listeners) {
      for (const handler of handlers) connection.on(eventName, handler);
    }
  }

  private getHubUrl(): string {
    const configured = this.customHubUrl ?? env.signalRUrl ?? env.apiBaseUrl!;
    const url = new URL(configured);
    const path = url.pathname.replace(/\/$/, "");
    if (/\/robotHub$/i.test(path)) return url.toString().replace(/\/$/, "");
    url.pathname = path.replace(/\/(api|hubs)$/i, "") + "/robotHub";
    return url.toString().replace(/\/$/, "");
  }
}

export const signalRClient = new SignalRClient();
