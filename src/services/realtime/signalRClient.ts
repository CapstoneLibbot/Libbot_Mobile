import * as signalR from '@microsoft/signalr';
import { env } from '../../core/config/env';
import { RealtimeEventMap, RealtimeEventName } from './realtimeEvents';

class SignalRClient {
  private connection: signalR.HubConnection | null = null;

  async connect(): Promise<void> {
    if (this.connection) return;

    this.connection = new signalR.HubConnectionBuilder()
      .withUrl(env.signalRUrl)
      .withAutomaticReconnect()
      .build();

    await this.connection.start();
  }

  async disconnect(): Promise<void> {
    if (!this.connection) return;

    await this.connection.stop();
    this.connection = null;
  }

  on<T extends RealtimeEventName>(eventName: T, callback: (payload: RealtimeEventMap[T]) => void): void {
    if (!this.connection) return;

    this.connection.on(eventName, callback as (...args: unknown[]) => void);
  }

  off<T extends RealtimeEventName>(eventName: T): void {
    if (!this.connection) return;

    this.connection.off(eventName);
  }

  async invoke(methodName: string, ...args: unknown[]): Promise<unknown> {
    if (!this.connection) {
      throw new Error('SignalR connection is not established.');
    }

    return this.connection.invoke(methodName, ...args);
  }
}

export const signalRClient = new SignalRClient();
