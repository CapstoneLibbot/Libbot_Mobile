import * as signalR from "@microsoft/signalr";
import { env } from "@/config/env";

export type HeartbeatCallback = (
  robotId: string,
  status: string,
  timestamp: string | Date,
) => void;

export class SignalRService {
  private connection: signalR.HubConnection | null = null;
  private heartbeatListeners: Set<HeartbeatCallback> = new Set();
  private isConnecting = false;

  setConnectionForTesting(conn: signalR.HubConnection | null): void {
    this.connection = conn;
  }

  getConnection(): signalR.HubConnection | null {
    return this.connection;
  }

  getHeartbeatListenerCount(): number {
    return this.heartbeatListeners.size;
  }

  async connect(): Promise<boolean> {
    // In mock mode or when no signalRUrl is configured, do not attempt to connect.
    if (env.isMock || !env.signalRUrl) {
      return false;
    }

    if (
      this.connection &&
      this.connection.state === signalR.HubConnectionState.Connected
    ) {
      return true;
    }

    if (this.isConnecting) {
      return false;
    }

    try {
      this.isConnecting = true;
      if (!this.connection) {
        this.connection = new signalR.HubConnectionBuilder()
          .withUrl(env.signalRUrl)
          .withAutomaticReconnect()
          .build();

        this.connection.on(
          "ReceiveHeartbeat",
          (robotId: string, status: string, timestamp: string | Date) => {
            for (const listener of this.heartbeatListeners) {
              listener(robotId, status, timestamp);
            }
          },
        );
      }

      if (this.connection.state === signalR.HubConnectionState.Disconnected) {
        await this.connection.start();
      }
      return true;
    } finally {
      this.isConnecting = false;
    }
  }

  async disconnect(): Promise<void> {
    if (!this.connection) return;
    await this.connection.stop();
    this.connection = null;
    this.heartbeatListeners.clear();
  }

  onHeartbeat(callback: HeartbeatCallback): () => void {
    this.heartbeatListeners.add(callback);

    let wrappedConnectionHandler:
      | ((robotId: string, status: string, timestamp: string | Date) => void)
      | null = null;

    if (this.connection) {
      wrappedConnectionHandler = (
        robotId: string,
        status: string,
        timestamp: string | Date,
      ) => {
        if (this.heartbeatListeners.has(callback)) {
          callback(robotId, status, timestamp);
        }
      };
      this.connection.on("ReceiveHeartbeat", wrappedConnectionHandler);
    }

    return () => {
      this.heartbeatListeners.delete(callback);
      if (this.connection && wrappedConnectionHandler) {
        this.connection.off("ReceiveHeartbeat", wrappedConnectionHandler);
      }
    };
  }
}

export const signalRService = new SignalRService();
