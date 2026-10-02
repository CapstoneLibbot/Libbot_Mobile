import { describe, expect, it, vi } from "vitest";
import { SignalRClient } from "../signalRClient";

describe("SignalR Client and Specific Cleanup Subscriptions (src/platform)", () => {
  it("returns a specific cleanup callback when subscribing with on()", () => {
    const client = new SignalRClient();

    // Mock HubConnection
    const mockOn = vi.fn();
    const mockOff = vi.fn();
    const mockConnection = {
      on: mockOn,
      off: mockOff,
    } as unknown as import("@microsoft/signalr").HubConnection;

    client.setConnectionForTesting(mockConnection);

    const callback1 = vi.fn();
    const callback2 = vi.fn();

    // Subscribe two distinct listeners to the same event
    const unsubscribe1 = client.on("MissionStatusChanged", callback1);
    const unsubscribe2 = client.on("MissionStatusChanged", callback2);

    expect(typeof unsubscribe1).toBe("function");
    expect(typeof unsubscribe2).toBe("function");
    expect(mockOn).toHaveBeenCalledTimes(2);

    // Call first cleanup
    unsubscribe1();

    // mockOff should have been called with the first wrapped handler
    expect(mockOff).toHaveBeenCalledTimes(1);
    const firstUnregisteredHandler = mockOff.mock.calls[0][1];
    expect(typeof firstUnregisteredHandler).toBe("function");

    // Call second cleanup
    unsubscribe2();
    expect(mockOff).toHaveBeenCalledTimes(2);
    const secondUnregisteredHandler = mockOff.mock.calls[1][1];
    expect(secondUnregisteredHandler).not.toBe(firstUnregisteredHandler);
  });

  it("validates event payloads and discards malformed data", () => {
    const client = new SignalRClient();
    let capturedHandler: ((payload: unknown) => void) | null = null;

    const mockConnection = {
      on: (_event: string, handler: (payload: unknown) => void) => {
        capturedHandler = handler;
      },
      off: vi.fn(),
    } as unknown as import("@microsoft/signalr").HubConnection;

    client.setConnectionForTesting(mockConnection);

    const listener = vi.fn();
    client.on("RobotPositionUpdated", listener);

    expect(capturedHandler).not.toBeNull();

    // Send malformed payload (missing x, y, yaw, invalid types)
    capturedHandler!({ robotId: "R-01", invalid: true });
    expect(listener).not.toHaveBeenCalled();

    // Send valid payload
    capturedHandler!({ robotId: "R-01", x: 10.5, y: 5.2, yaw: 0.1 });
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith({
      robotId: "R-01",
      x: 10.5,
      y: 5.2,
      yaw: 0.1,
    });
  });
});
