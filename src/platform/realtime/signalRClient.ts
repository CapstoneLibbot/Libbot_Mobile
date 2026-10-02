import * as signalR from "@microsoft/signalr";
import { runtimeConfig } from "@/core/config";
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

  setConnectionForTesting(conn: signalR.HubConnection | null): void {
    this.connection = conn;
  }

  getConnection(): signalR.HubConnection | null {
    return this.connection;
  }

  async connect(): Promise<void> {
    if (this.connection) return;

    this.connection = new signalR.HubConnectionBuilder()
      .withUrl(runtimeConfig.signalRUrl)
      .withAutomaticReconnect()
      .build();

    await this.connection.start();
  }

  async disconnect(): Promise<void> {
    if (!this.connection) return;

    await this.connection.stop();
    this.connection = null;
    this.listeners.clear();
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
}

export const signalRClient = new SignalRClient();
