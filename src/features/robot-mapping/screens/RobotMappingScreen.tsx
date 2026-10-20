import { useFocusEffect } from "expo-router";
import { AppState, Pressable, ScrollView, StyleSheet, TextInput, View } from "react-native";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { AppButton, AppHeader, AppText } from "@/shared/ui";
import { useResponsiveLayout } from "@/shared/layout";
import { colors, radius, spacing } from "@/shared/theme";
import { signalRClient } from "@/platform/realtime";
import { LiveRobotOccupancyMap } from "../components/LiveRobotOccupancyMap";
import {
  armRuntime,
  disarmRuntime,
  getLatestRobotMapGrid,
  getRobotRuntimes,
  getSavedRobotMapGrid,
  getSavedRobotMaps,
  saveRobotMap,
  sendManualVelocity,
  setMapping,
  startNavigationMode,
  stopManual,
  stopNavigationMode,
} from "../api/robotMapping.api";
import type {
  LiveOccupancyGrid,
  RobotRuntime,
  SavedRobotMap,
} from "../types/robotMapping.types";

const RUNTIME_ID = "real";
type MotionKey = "forward" | "backward" | "left" | "right" | "rotateLeft" | "rotateRight";

function messageOf(error: unknown): string {
  if (typeof error === "object" && error !== null && "response" in error) {
    const response = (error as { response?: { data?: { message?: unknown; detail?: unknown; title?: unknown } } }).response;
    if (typeof response?.data?.detail === "string") return response.data.detail;
    if (typeof response?.data?.message === "string") return response.data.message;
    if (typeof response?.data?.title === "string") return response.data.title;
  }
  return error instanceof Error ? error.message : "Không thể thực hiện yêu cầu.";
}

function isValidGrid(grid: LiveOccupancyGrid): boolean {
  return Number.isInteger(grid.width) && grid.width > 0
    && Number.isInteger(grid.height) && grid.height > 0
    && grid.data.length === grid.width * grid.height
    && Number.isFinite(grid.resolution) && grid.resolution > 0
    && Number.isFinite(grid.originX) && Number.isFinite(grid.originY) && Number.isFinite(grid.originYaw);
}

export interface RobotMappingScreenProps {
  onBack: () => void;
}

export function RobotMappingScreen({ onBack }: RobotMappingScreenProps): React.ReactElement {
  const { width, height, insets } = useResponsiveLayout();
  const isExpanded = width >= 840;
  const mapHeight = Math.max(250, Math.min(isExpanded ? 650 : 420, height * (isExpanded ? 0.67 : 0.44)));

  const [runtime, setRuntime] = useState<RobotRuntime | null>(null);
  const [telemetryFresh, setTelemetryFresh] = useState(false);
  const [grid, setGrid] = useState<LiveOccupancyGrid | null>(null);
  const [leaseId, setLeaseId] = useState<string | null>(null);
  const [speed, setSpeed] = useState(0.1);
  const [maps, setMaps] = useState<SavedRobotMap[]>([]);
  const [selectedMap, setSelectedMap] = useState("");
  const [mapName, setMapName] = useState("LiBot map");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  const runtimeRef = useRef<RobotRuntime | null>(null);
  const gridRef = useRef<LiveOccupancyGrid | null>(null);
  const leaseRef = useRef<string | null>(null);
  const held = useRef(new Set<MotionKey>());
  const manualCommandInFlight = useRef(false);
  const manualCommandPromise = useRef<Promise<void> | null>(null);
  const stopPromise = useRef<Promise<void> | null>(null);
  const navigationRestartPending = useRef(false);
  const latestMapId = useRef<string | null>(null);
  const lastTelemetryAt = useRef(0);
  const mapPollInFlight = useRef(false);
  const focused = useRef(false);

  const applyRuntime = useCallback((next: RobotRuntime | null) => {
    runtimeRef.current = next;
    setRuntime(next);
    const telemetryAt = next?.lastTelemetryAt ?? next?.telemetry?.timestamp;
    const parsedTelemetryAt = telemetryAt ? Date.parse(telemetryAt) : Number.NaN;
    lastTelemetryAt.current = Number.isFinite(parsedTelemetryAt) ? parsedTelemetryAt : 0;
    setTelemetryFresh(Boolean(
      next?.connected
      && !next.stale
      && Number.isFinite(lastTelemetryAt.current)
      && Date.now() - lastTelemetryAt.current < 3000,
    ));
    if (next && !next.armed && leaseRef.current) {
      leaseRef.current = null;
      setLeaseId(null);
      setNotice("Quyền điều khiển đã hết hạn. Hãy mở khóa robot lại.");
    }
  }, []);

  const refreshRuntime = useCallback(async () => {
    try {
      const runtimes = await getRobotRuntimes();
      const real = runtimes.find((item) => item.id.toLowerCase() === RUNTIME_ID) ?? null;
      applyRuntime(real);
    } catch (error) {
      setTelemetryFresh(false);
      setNotice(messageOf(error));
    }
  }, [applyRuntime]);

  const refreshMaps = useCallback(async () => {
    try {
      const next = await getSavedRobotMaps();
      const previousLatestId = latestMapId.current;
      const nextLatestId = next[0]?.id ?? null;
      latestMapId.current = nextLatestId;
      setMaps(next);
      setSelectedMap((current) => {
        if (!nextLatestId) return "";
        return !current || current === previousLatestId || !next.some((item) => item.id === current)
          ? nextLatestId
          : current;
      });
      if (!gridRef.current && next[0]) {
        try {
          const savedGrid = await getSavedRobotMapGrid(next[0].id);
          if (!gridRef.current) {
            gridRef.current = savedGrid;
            setGrid(savedGrid);
          }
        } catch {
          // A saved map is only a fallback; live robot telemetry can still supply the map.
        }
      }
    } catch (error) {
      setNotice(messageOf(error));
    }
  }, []);

  const acceptGrid = useCallback((next: LiveOccupancyGrid) => {
    if (!isValidGrid(next)) return;
    const previousTimestamp = gridRef.current ? Date.parse(gridRef.current.timestamp) : Number.NEGATIVE_INFINITY;
    const nextTimestamp = Date.parse(next.timestamp);
    if (Number.isFinite(previousTimestamp) && Number.isFinite(nextTimestamp) && nextTimestamp <= previousTimestamp) return;
    gridRef.current = next;
    setGrid(next);
  }, []);

  const stopManualControl = useCallback((resumeNavigation = true): Promise<void> => {
    held.current.clear();
    if (stopPromise.current) return stopPromise.current;

    const shouldReportRestart = resumeNavigation && navigationRestartPending.current;
    const task = (async () => {
      const pendingCommand = manualCommandPromise.current;
      if (pendingCommand) await pendingCommand;
      try {
        const result = await stopManual(RUNTIME_ID, resumeNavigation);
        if (shouldReportRestart) {
          navigationRestartPending.current = false;
          await refreshRuntime();
          setNotice(result.navigation_restarted
            ? "Đã dừng điều khiển tay và khởi động lại Nav2."
            : "Đã dừng điều khiển tay. Nav2 chưa khởi động lại; kiểm tra map và log robot.");
        }
      } catch (error) {
        if (shouldReportRestart) setNotice(messageOf(error));
      }
    })();

    stopPromise.current = task;
    void task.finally(() => {
      if (stopPromise.current === task) stopPromise.current = null;
    });
    return task;
  }, [refreshRuntime]);

  const sendHeldVelocity = useCallback(() => {
    const lease = leaseRef.current;
    const current = runtimeRef.current;
    const telemetryFresh = Boolean(
      current?.connected
      && !current.stale
      && Date.now() - lastTelemetryAt.current < 3000,
    );
    if (!lease || !telemetryFresh || current?.navigationActive || held.current.size === 0
      || manualCommandInFlight.current) return;

    const keys = held.current;
    const velocity = {
      linearX: (Number(keys.has("forward")) - Number(keys.has("backward"))) * speed,
      linearY: (Number(keys.has("left")) - Number(keys.has("right"))) * speed,
      angularZ: (Number(keys.has("rotateLeft")) - Number(keys.has("rotateRight"))) * Math.min(0.5, speed * 2.5),
    };
    manualCommandInFlight.current = true;
    const task = sendManualVelocity(RUNTIME_ID, velocity, lease)
      .catch((error) => {
        setNotice(messageOf(error));
        held.current.clear();
        void stopManualControl();
      })
      .finally(() => {
        manualCommandInFlight.current = false;
        if (manualCommandPromise.current === task) manualCommandPromise.current = null;
      });
    manualCommandPromise.current = task;
  }, [speed, stopManualControl]);

  const releaseAndDisarm = useCallback(async () => {
    held.current.clear();
    const lease = leaseRef.current;
    leaseRef.current = null;
    if (focused.current) setLeaseId(null);
    if (!lease) return;

    await stopManualControl(true);
    try {
      await disarmRuntime(RUNTIME_ID);
    } catch {
      // The lease expires on the backend if the client is already offline.
    }
  }, [stopManualControl]);

  useFocusEffect(useCallback(() => {
    focused.current = true;
    setLeaseId(leaseRef.current);
    void refreshRuntime();
    return () => {
      focused.current = false;
      void releaseAndDisarm();
    };
  }, [refreshRuntime, releaseAndDisarm]));

  useEffect(() => {
    let mounted = true;
    const initialRefresh = setTimeout(() => {
      void refreshRuntime();
      void refreshMaps();
    }, 0);
    const runtimeTimer = setInterval(() => { void refreshRuntime(); }, 1500);
    const mapsTimer = setInterval(() => { void refreshMaps(); }, 5000);
    const removeMap = signalRClient.on("RobotMapUpdated", (payload) => acceptGrid(payload));
    const applyTelemetry = (payload: unknown) => {
      const snapshot = payload as RobotRuntime;
      if (snapshot.id?.toLowerCase() === RUNTIME_ID) applyRuntime(snapshot);
    };
    const removeTelemetry = signalRClient.on("RobotTelemetryUpdated", applyTelemetry);
    const removeConnection = signalRClient.on("RuntimeConnectionChanged", applyTelemetry);

    void signalRClient.subscribeRuntime(RUNTIME_ID).catch((error) => {
      if (mounted) setNotice(messageOf(error));
    });

    const loadCurrentMap = async () => {
      if (mapPollInFlight.current) return;
      mapPollInFlight.current = true;
      try {
        const latest = await getLatestRobotMapGrid();
        if (mounted && latest) acceptGrid(latest);
      } catch {
        // SignalR carries live map updates; REST polling is the fallback.
      } finally {
        mapPollInFlight.current = false;
      }
    };
    void loadCurrentMap();
    const mapTimer = setInterval(() => { void loadCurrentMap(); }, 2000);

    const appStateSubscription = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        void refreshRuntime();
        void loadCurrentMap();
      } else {
        void releaseAndDisarm();
      }
    });

    return () => {
      mounted = false;
      clearTimeout(initialRefresh);
      clearInterval(runtimeTimer);
      clearInterval(mapsTimer);
      clearInterval(mapTimer);
      removeMap();
      removeTelemetry();
      removeConnection();
      appStateSubscription.remove();
      void signalRClient.unsubscribeRuntime(RUNTIME_ID).catch(() => {});
    };
  }, [acceptGrid, applyRuntime, refreshMaps, refreshRuntime, releaseAndDisarm]);

  useEffect(() => {
    const timer = setInterval(() => {
      const current = runtimeRef.current;
      const lease = leaseRef.current;
      const telemetryFresh = Boolean(
        current?.connected
        && !current.stale
        && Date.now() - lastTelemetryAt.current < 3000,
      );
      if (!telemetryFresh || !lease || current?.navigationActive || held.current.size === 0) {
        if (!telemetryFresh && held.current.size > 0) void stopManualControl();
        return;
      }
      sendHeldVelocity();
    }, 100);
    return () => clearInterval(timer);
  }, [sendHeldVelocity, stopManualControl]);

  const connected = telemetryFresh;
  const navActive = Boolean(runtime?.navigationActive);
  const mappingActive = Boolean(runtime?.mappingActive);
  const robotPose = runtime?.telemetry?.pose ?? null;

  const arm = async () => {
    setBusy(true);
    setNotice("");
    try {
      const lease = await armRuntime(RUNTIME_ID);
      leaseRef.current = lease.leaseId;
      setLeaseId(lease.leaseId);
      await refreshRuntime();
      setNotice("Đã mở khóa điều khiển robot thật.");
    } catch (error) {
      setNotice(messageOf(error));
    } finally {
      setBusy(false);
    }
  };

  const disarm = async () => {
    setBusy(true);
    await stopManualControl();
    try {
      await disarmRuntime(RUNTIME_ID);
      leaseRef.current = null;
      setLeaseId(null);
      await refreshRuntime();
      setNotice("Đã khóa điều khiển.");
    } catch (error) {
      setNotice(messageOf(error));
    } finally {
      setBusy(false);
    }
  };

  const toggleMapping = async (enabled: boolean) => {
    if (enabled && !leaseId) return;
    setBusy(true);
    await stopManualControl(false);
    try {
      await setMapping(RUNTIME_ID, enabled, leaseId);
      if (enabled) navigationRestartPending.current = false;
      await refreshRuntime();
      setNotice(enabled ? "Đang mapping trực tiếp." : "Đã dừng mapping.");
    } catch (error) {
      setNotice(messageOf(error));
    } finally {
      setBusy(false);
    }
  };

  const saveMap = async () => {
    if (!leaseId || !mapName.trim() || !grid) return;
    setBusy(true);
    setNotice("Đang lưu PGM/YAML trên robot và snapshot vào database…");
    try {
      const saved = await saveRobotMap(mapName.trim(), leaseId);
      setMaps((current) => [saved, ...current.filter((item) => item.id !== saved.id)]);
      latestMapId.current = saved.id;
      setSelectedMap(saved.id);
      await setMapping(RUNTIME_ID, false, leaseId);
      const snapshot = await getSavedRobotMapGrid(saved.id);
      gridRef.current = snapshot;
      setGrid(snapshot);
      await refreshMaps();
      await refreshRuntime();
      setNotice(`Đã lưu “${saved.name}” phiên bản ${saved.version}; đã dừng SLAM để sẵn sàng chạy Nav2.`);
    } catch (error) {
      setNotice(messageOf(error));
    } finally {
      setBusy(false);
    }
  };

  const startNav = async () => {
    if (!leaseId || !selectedMap) return;
    setBusy(true);
    await stopManualControl(false);
    try {
      await startNavigationMode(selectedMap, leaseId);
      navigationRestartPending.current = false;
      await refreshRuntime();
      setNotice("Nav2 đã khởi động với map đã chọn. Dừng Nav2 trước khi điều khiển tay.");
    } catch (error) {
      setNotice(messageOf(error));
    } finally {
      setBusy(false);
    }
  };

  const stopNav = async () => {
    setBusy(true);
    await stopManualControl(false);
    try {
      await stopNavigationMode();
      navigationRestartPending.current = true;
      await refreshRuntime();
      setNotice("Đã dừng Nav2. Nav2 sẽ được khởi động lại khi dừng điều khiển tay.");
    } catch (error) {
      setNotice(messageOf(error));
    } finally {
      setBusy(false);
    }
  };

  const releaseMotion = (key: MotionKey) => {
    held.current.delete(key);
    if (held.current.size === 0) void stopManualControl();
  };

  const startMotion = (key: MotionKey) => {
    held.current.add(key);
    sendHeldVelocity();
  };

  const motionButton = (key: MotionKey, label: string, accessibilityLabel: string) => (
    <Pressable
      key={key}
      disabled={!leaseId || !connected || navActive || busy}
      onPressIn={() => startMotion(key)}
      onPressOut={() => releaseMotion(key)}
      style={({ pressed }) => [
        styles.motionButton,
        pressed && styles.motionButtonPressed,
        (!leaseId || !connected || navActive || busy) && styles.disabledButton,
      ]}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled: !leaseId || !connected || navActive || busy }}
    >
      <AppText variant="heading" style={styles.motionLabel}>{label}</AppText>
    </Pressable>
  );

  const mapPanel = (
    <View style={[styles.card, styles.mapCard, isExpanded && styles.expandedMapCard]}>
      <View style={styles.cardHeading}>
        <View style={styles.flexText}>
          <AppText variant="subtitle">Map trực tiếp</AppText>
          <AppText variant="caption" color={colors.subtext}>
            {grid ? `Cập nhật ${new Date(grid.timestamp).toLocaleTimeString()}` : "Chờ dữ liệu SLAM"}
          </AppText>
        </View>
        <View style={[styles.statusPill, mappingActive ? styles.statusActive : navActive ? styles.statusNavigation : styles.statusIdle]}>
          <AppText variant="caption" style={styles.statusPillText}>
            {mappingActive ? "SLAM ĐANG CHẠY" : navActive ? "NAV2 ĐANG CHẠY" : "CHƯA MAPPING"}
          </AppText>
        </View>
      </View>
      <LiveRobotOccupancyMap grid={grid} robotPose={robotPose} mappingActive={mappingActive} height={mapHeight} />
      <View style={styles.poseRow}>
        <View style={styles.poseValue}>
          <AppText variant="caption" color={colors.subtext}>Vị trí robot</AppText>
          <AppText variant="subtitle">{robotPose ? `${robotPose.x.toFixed(2)} m, ${robotPose.y.toFixed(2)} m` : "—"}</AppText>
        </View>
        <View style={styles.poseValue}>
          <AppText variant="caption" color={colors.subtext}>Hướng</AppText>
          <AppText variant="subtitle">{robotPose ? `${(robotPose.yaw * 180 / Math.PI).toFixed(0)}°` : "—"}</AppText>
        </View>
        <View style={styles.poseValue}>
          <AppText variant="caption" color={colors.subtext}>Kết nối</AppText>
          <AppText variant="subtitle" color={connected ? colors.success : colors.danger}>{connected ? "Trực tiếp" : "Mất kết nối"}</AppText>
        </View>
      </View>
    </View>
  );

  const controlPanel = (
    <View style={styles.controlColumn}>
      <View style={styles.card}>
        <View style={styles.cardHeading}>
          <AppText variant="subtitle">Điều khiển</AppText>
          <AppText variant="caption" color={leaseId ? colors.success : colors.subtext}>{leaseId ? "ĐÃ ARM" : "ĐANG KHÓA"}</AppText>
        </View>
        <AppButton
          title={leaseId ? "Khóa robot" : "Mở khóa robot"}
          variant={leaseId ? "danger" : "primary"}
          onPress={() => { void (leaseId ? disarm() : arm()); }}
          disabled={(!leaseId && !connected) || busy}
          loading={busy}
        />
        <View style={styles.pad}>
          {motionButton("rotateLeft", "↶", "Xoay trái")}
          {motionButton("forward", "↑", "Tiến")}
          {motionButton("rotateRight", "↷", "Xoay phải")}
          {motionButton("left", "←", "Đi ngang trái")}
          {motionButton("backward", "↓", "Lùi")}
          {motionButton("right", "→", "Đi ngang phải")}
        </View>
        <AppText variant="caption" color={colors.subtext}>
          Nhấn giữ nút để di chuyển; thả tay hoặc bấm DỪNG NGAY để dừng.
        </AppText>
        <View style={styles.speedControl}>
          <View style={styles.flexText}>
            <AppText variant="body">Tốc độ tối đa</AppText>
            <AppText variant="caption" color={colors.subtext}>m/s · xoay tối đa {Math.min(0.5, speed * 2.5).toFixed(2)} rad/s</AppText>
          </View>
          <Pressable
            onPress={() => setSpeed((current) => Math.max(0.02, Number((current - 0.02).toFixed(2))))}
            disabled={speed <= 0.02}
            style={[styles.speedButton, speed <= 0.02 && styles.disabledButton]}
            accessibilityRole="button"
            accessibilityLabel="Giảm tốc độ"
          ><AppText variant="heading">−</AppText></Pressable>
          <AppText variant="subtitle" style={styles.speedReadout}>{speed.toFixed(2)}</AppText>
          <Pressable
            onPress={() => setSpeed((current) => Math.min(0.7, Number((current + 0.02).toFixed(2))))}
            disabled={speed >= 0.7}
            style={[styles.speedButton, speed >= 0.7 && styles.disabledButton]}
            accessibilityRole="button"
            accessibilityLabel="Tăng tốc độ"
          ><AppText variant="heading">+</AppText></Pressable>
        </View>
        <AppButton title="DỪNG NGAY" variant="danger" onPress={() => { void stopManualControl(); }} disabled={navActive || busy} />
      </View>

      <View style={styles.card}>
        <AppText variant="subtitle">Mapping và lưu</AppText>
        <View style={styles.actionRow}>
          <AppButton
            title="Bắt đầu mapping"
            size="md"
            onPress={() => { void toggleMapping(true); }}
            disabled={!leaseId || !connected || navActive || mappingActive || busy}
            style={styles.flexButton}
          />
          <AppButton
            title="Dừng SLAM"
            size="md"
            variant="secondary"
            onPress={() => { void toggleMapping(false); }}
            disabled={!mappingActive || busy}
            style={styles.flexButton}
          />
        </View>
        <TextInput
          value={mapName}
          onChangeText={setMapName}
          maxLength={120}
          placeholder="Tên bản đồ"
          placeholderTextColor={colors.subtext}
          accessibilityLabel="Tên bản đồ cần lưu"
          style={styles.input}
        />
        <AppButton
          title="Lưu map trên robot và backend"
          variant="success"
          onPress={() => { void saveMap(); }}
          disabled={!leaseId || !grid || !mappingActive || !mapName.trim() || busy}
          size="md"
        />
      </View>

      <View style={styles.card}>
        <AppText variant="subtitle">Nav2</AppText>
        {maps.length ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.mapChoices}>
            {maps.map((map) => {
              const selected = map.id === selectedMap;
              return (
                <Pressable
                  key={map.id}
                  onPress={() => setSelectedMap(map.id)}
                  style={[styles.mapChoice, selected && styles.mapChoiceSelected]}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  accessibilityLabel={`${map.name}, phiên bản ${map.version}`}
                >
                  <AppText variant="caption" color={selected ? colors.primary : colors.text} numberOfLines={1}>
                    {map.name} · v{map.version}
                  </AppText>
                </Pressable>
              );
            })}
          </ScrollView>
        ) : (
          <AppText variant="body" color={colors.subtext}>Chưa có map robot đã lưu.</AppText>
        )}
        {navActive ? (
          <AppButton
            title="Dừng Nav2 để điều khiển tay"
            variant="secondary"
            onPress={() => { void stopNav(); }}
            disabled={busy}
          />
        ) : (
          <AppButton
            title="Khởi chạy Nav2 với map"
            onPress={() => { void startNav(); }}
            disabled={!leaseId || !selectedMap || !connected || mappingActive || busy}
          />
        )}
      </View>
    </View>
  );

  return (
    <View style={styles.screen}>
      <AppHeader
        title="Map robot thật"
        subtitle={runtime?.displayName ?? "LiBot · REAL"}
        onBack={onBack}
      />
      <ScrollView
        contentContainerStyle={[
          styles.content,
          {
            paddingLeft: Math.max(insets.left, spacing.md),
            paddingRight: Math.max(insets.right, spacing.md),
            paddingBottom: Math.max(insets.bottom, spacing.xl),
          },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={[styles.mainLayout, isExpanded && styles.mainLayoutExpanded]}>
          <View style={isExpanded ? styles.mapColumn : undefined}>{mapPanel}</View>
          <View style={isExpanded ? styles.sideColumn : undefined}>{controlPanel}</View>
        </View>
        {notice ? (
          <View style={styles.notice} accessibilityLiveRegion="polite">
            <AppText variant="body">{notice}</AppText>
          </View>
        ) : null}
        {runtime?.telemetry?.error ? (
          <View style={[styles.notice, styles.errorNotice]} accessibilityLiveRegion="assertive">
            <AppText variant="body" color={colors.danger}>{runtime.telemetry.error}</AppText>
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingTop: spacing.md,
    gap: spacing.md,
  },
  mainLayout: {
    gap: spacing.md,
  },
  mainLayoutExpanded: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  mapColumn: {
    flex: 1,
    minWidth: 0,
  },
  sideColumn: {
    width: 360,
    maxWidth: "42%",
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.md,
  },
  mapCard: {
    gap: spacing.sm,
  },
  expandedMapCard: {
    height: "100%",
  },
  controlColumn: {
    gap: spacing.md,
  },
  cardHeading: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: spacing.sm,
  },
  flexText: {
    flex: 1,
    minWidth: 0,
  },
  statusPill: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.sm,
  },
  statusActive: { backgroundColor: colors.successSoft },
  statusNavigation: { backgroundColor: colors.primarySoft },
  statusIdle: { backgroundColor: colors.surfaceAlt },
  statusPillText: { fontWeight: "700", color: colors.textSecondary },
  poseRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.lg,
    paddingTop: spacing.xs,
  },
  poseValue: {
    flexGrow: 1,
    minWidth: 90,
    gap: 2,
  },
  pad: {
    alignSelf: "center",
    width: "100%",
    maxWidth: 300,
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: spacing.sm,
  },
  motionButton: {
    width: "30%",
    minWidth: 64,
    minHeight: 58,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceAlt,
    alignItems: "center",
    justifyContent: "center",
  },
  motionButtonPressed: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary,
  },
  motionLabel: {
    color: colors.primaryDark,
    lineHeight: 28,
  },
  speedControl: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  speedButton: {
    width: 46,
    height: 46,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceAlt,
  },
  speedReadout: {
    minWidth: 42,
    textAlign: "center",
  },
  actionRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  flexButton: {
    flex: 1,
    paddingHorizontal: spacing.sm,
  },
  input: {
    minHeight: 48,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    color: colors.text,
    backgroundColor: colors.surface,
    fontSize: 16,
  },
  mapChoices: {
    gap: spacing.sm,
    paddingVertical: 2,
  },
  mapChoice: {
    minHeight: 44,
    maxWidth: 200,
    justifyContent: "center",
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  mapChoiceSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  notice: {
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: spacing.md,
  },
  errorNotice: {
    borderColor: colors.danger,
    backgroundColor: colors.dangerSoft,
  },
  disabledButton: {
    opacity: 0.45,
  },
});
