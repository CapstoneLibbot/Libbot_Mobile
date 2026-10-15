import { describe, expect, it, vi } from "vitest";
import { SignalRService } from "../signalR";

describe("SignalR Service (src/services/realtime/signalR.ts)", () => {
  it("does not attempt connection when running in mock mode", async () => {
    const service = new SignalRService();
    // Default env has isMock = true (no EXPO_PUBLIC_API_BASE_URL set in test environment)
    const connected = await service.connect();

    expect(connected).toBe(false);
    expect(service.getConnection()).toBeNull();
  });

  it("registers heartbeat handler and cleans it up correctly on unsubscribe", () => {
    const service = new SignalRService();

    const mockOn = vi.fn();
    const mockOff = vi.fn();
    const mockConnection = {
      on: mockOn,
      off: mockOff,
    } as unknown as import("@microsoft/signalr").HubConnection;

    service.setConnectionForTesting(mockConnection);

    const listener = vi.fn();
    const unsubscribe = service.onHeartbeat(listener);

    expect(service.getHeartbeatListenerCount()).toBe(1);
    expect(mockOn).toHaveBeenCalledWith("ReceiveHeartbeat", expect.any(Function));

    // Call cleanup
    unsubscribe();

    expect(service.getHeartbeatListenerCount()).toBe(0);
    expect(mockOff).toHaveBeenCalledWith("ReceiveHeartbeat", expect.any(Function));
  });
});
