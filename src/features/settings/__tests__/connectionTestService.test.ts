import axios from "axios";
import { describe, expect, it, vi } from "vitest";
import { connectionTestService } from "../services/connectionTestService";

vi.mock("axios");

describe("connectionTestService", () => {
  it("tests REST API connection successfully", async () => {
    vi.mocked(axios.get).mockResolvedValueOnce({ status: 200 });

    const result = await connectionTestService.testApiConnection("http://192.168.1.100:5205/api");
    expect(result.success).toBe(true);
    expect(result.message).toContain("REST API hoạt động tốt");
    expect(axios.get).toHaveBeenCalledWith(
      "http://192.168.1.100:5205/api",
      expect.objectContaining({ timeout: 4000 }),
    );
  });

  it("handles REST API connection error", async () => {
    vi.mocked(axios.get).mockRejectedValueOnce(new Error("Network Error"));

    const result = await connectionTestService.testApiConnection("http://192.168.1.100:5205/api");
    expect(result.success).toBe(false);
    expect(result.message).toContain("Network Error");
  });

  it("tests SignalR connection via negotiate endpoint", async () => {
    vi.mocked(axios.post).mockResolvedValueOnce({ status: 200, data: {} });

    const result = await connectionTestService.testSignalRConnection("http://192.168.1.100:5205/robotHub");
    expect(result.success).toBe(true);
    expect(result.message).toContain("SignalR Hub kết nối tốt");
    expect(axios.post).toHaveBeenCalledWith(
      "http://192.168.1.100:5205/robotHub/negotiate?negotiateVersion=1",
      {},
      expect.objectContaining({ timeout: 4000 }),
    );
  });

  it("rejects invalid WebSocket URL formats", async () => {
    const result = await connectionTestService.testWebSocketConnection("http://192.168.1.100:8000");
    expect(result.success).toBe(false);
    expect(result.message).toContain("ws://");
  });
});
