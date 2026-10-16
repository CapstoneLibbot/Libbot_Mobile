import { useCallback, useEffect, useRef, useState } from "react";
import { bookGuidanceApi, RobotRuntime } from "../api/bookGuidance.api";
import { signalRClient } from "@/platform/realtime";

export function useRobotRuntimeTelemetry(runtimeId: string): {
  runtime: RobotRuntime | null;
  realtimeConnected: boolean;
  refreshRuntime: () => Promise<RobotRuntime | null>;
} {
  const [runtime, setRuntime] = useState<RobotRuntime | null>(null);
  const [realtimeConnected, setRealtimeConnected] = useState(false);
  const polling = useRef(false);
  const subscribing = useRef(false);

  const refreshRuntime = useCallback(async (): Promise<RobotRuntime | null> => {
    if (polling.current) return null;
    polling.current = true;
    try {
      const latest = await bookGuidanceApi.getRuntime(runtimeId);
      if (latest.id === runtimeId) setRuntime(latest);
      return latest;
    } catch {
      setRuntime((current) => current?.id === runtimeId ? { ...current, connected: false, stale: true } : current);
      return null;
    } finally {
      polling.current = false;
    }
  }, [runtimeId]);

  useEffect(() => {
    let mounted = true;
    const acceptSnapshot = (snapshot: RobotRuntime) => {
      if (snapshot.id !== runtimeId) return;
      setRuntime(snapshot);
      setRealtimeConnected(true);
    };
    const unsubscribeTelemetry = signalRClient.on("RobotTelemetryUpdated", (snapshot) => acceptSnapshot(snapshot as RobotRuntime));
    const unsubscribeConnection = signalRClient.on("RuntimeConnectionChanged", (snapshot) => acceptSnapshot(snapshot as RobotRuntime));

    const subscribe = async () => {
      if (subscribing.current) return;
      subscribing.current = true;
      try {
        await signalRClient.subscribeRuntime(runtimeId);
        if (mounted) setRealtimeConnected(signalRClient.getConnection()?.state === "Connected");
      } catch {
        if (mounted) setRealtimeConnected(false);
      } finally {
        subscribing.current = false;
      }
    };

    const refresh = () => {
      if (!mounted) return;
      const connected = signalRClient.getConnection()?.state === "Connected";
      setRealtimeConnected(connected);
      if (!connected) void subscribe();
      void refreshRuntime();
    };

    const initialRefresh = setTimeout(() => {
      void refreshRuntime();
      void subscribe();
    }, 0);
    const timer = setInterval(refresh, 2000);
    return () => {
      mounted = false;
      clearTimeout(initialRefresh);
      clearInterval(timer);
      unsubscribeTelemetry();
      unsubscribeConnection();
      void signalRClient.unsubscribeRuntime(runtimeId).catch(() => {});
    };
  }, [runtimeId, refreshRuntime]);

  return { runtime, realtimeConnected, refreshRuntime };
}
