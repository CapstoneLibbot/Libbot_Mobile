import { CheckCircle2, MapPin, Radio, Shield, Zap } from "lucide-react-native";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { env } from "@/config/env";
import { getCatalogRepository } from "@/core/composition";
import { useKioskStore } from "@/core/state";
import { AppHeader, AppText } from "@/shared/ui";
import { useResponsiveLayout } from "@/shared/layout";
import { colors, radius, spacing } from "@/shared/theme";
import { GazeboMap2D } from "../components/GazeboMap2D";
import { bookGuidanceApi, hasNavigationEndpoint } from "../api/bookGuidance.api";
import { useRobotRuntimeTelemetry } from "../hooks/useRobotRuntimeTelemetry";
import type { RobotRuntime } from "../api/bookGuidance.api";
import type { Book } from "@/features/catalog/types/catalog.types";
import type { GuidanceSession, RobotPose } from "../types/guidance.types";

export interface GuidanceScreenProps {
  bookId: string;
  bookItemId: string;
  onGoToFeedback: (missionId: string) => void;
  onBackToSearch: () => void;
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return "Không thể kết nối với LiBot. Hãy kiểm tra mạng và thử lại.";
}

function isTerminal(status?: string): boolean {
  return status === "completed" || status === "failed";
}

export function GuidanceScreen({ bookId, bookItemId, onGoToFeedback, onBackToSearch }: GuidanceScreenProps): React.ReactElement {
  const { insets, isCompactWidth } = useResponsiveLayout();
  const session = useKioskStore((state) => state.activeGuidanceSession);
  const setSession = useKioskStore((state) => state.setActiveGuidanceSession);
  const recordInteraction = useKioskStore((state) => state.recordInteraction);
  const [book, setBook] = useState<Book | null>(null);
  const [loadedBookId, setLoadedBookId] = useState<string | null>(null);
  const [runtimes, setRuntimes] = useState<RobotRuntime[]>([]);
  const [runtimeId, setRuntimeId] = useState(session?.bookId === bookId && session.bookItemId === bookItemId ? session.runtimeId : "sim");
  const [execution, setExecution] = useState<{ status: string; currentStep?: string | null; currentStepType?: string | null; expectedEventType?: string | null } | null>(null);
  const [armLeaseId, setArmLeaseId] = useState<string | null>(session?.armLeaseId ?? null);
  const [busy, setBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const sentEvents = useRef(new Set<string>());
  const pollInFlight = useRef(false);
  const completionPosted = useRef(false);

  const { runtime, realtimeConnected, refreshRuntime } = useRobotRuntimeTelemetry(runtimeId);

  const activeSession = session?.bookId === bookId && session.bookItemId === bookItemId ? session : null;
  const currentBook = book?.id === bookId ? book : null;
  const bookLoading = loadedBookId !== bookId;
  const selectedCopy = useMemo(() => currentBook?.copies?.find((copy) => copy.id === bookItemId) ?? null, [currentBook, bookItemId]);
  const endpoint = selectedCopy?.endpoint;
  const copyAvailable = selectedCopy?.status === "Available";
  const destination = useMemo<RobotPose | null>(() => hasNavigationEndpoint(endpoint)
    ? { x: endpoint.x, y: endpoint.y, yaw: endpoint.theta }
    : null, [endpoint]);
  const runtimeMatchesSelection = runtime?.id === runtimeId;
  const robotPose = runtimeMatchesSelection ? runtime?.telemetry?.pose ?? null : null;
  const route = runtimeMatchesSelection ? runtime?.telemetry?.plannedPath?.map((point) => ({ ...point, yaw: 0 })) ?? [] : [];
  const isReal = runtime?.kind?.toUpperCase() === "REAL" || runtimeId.toLowerCase() === "real";
  const runtimeReady = Boolean(runtimeMatchesSelection && runtime?.connected && !runtime.stale && runtime.telemetry?.localizationState?.toUpperCase() === "LOCALIZED");
  const workflowStatus = activeSession?.status ?? "waiting";

  useEffect(() => {
    let mounted = true;
    void getCatalogRepository().getById(bookId)
      .then((value) => {
        if (!mounted) return;
        setBook(value);
        setLoadedBookId(bookId);
      })
      .catch((error: unknown) => {
        if (!mounted) return;
        setErrorMessage(getErrorMessage(error));
        setLoadedBookId(bookId);
      });
    return () => { mounted = false; };
  }, [bookId]);

  useEffect(() => {
    let mounted = true;
    void bookGuidanceApi.getRuntimes()
      .then((items) => {
        if (!mounted) return;
        setRuntimes(items);
        const selected = items.find((item) => item.id === runtimeId);
        if (!selected && items.length > 0) setRuntimeId(items[0].id);
      })
      .catch((error: unknown) => { if (mounted) setErrorMessage(getErrorMessage(error)); });
    return () => { mounted = false; };
  }, [runtimeId]);

  const postCompletion = useCallback(async (missionId: string, succeeded: boolean, message?: string) => {
    if (completionPosted.current) return;
    completionPosted.current = true;
    try { await bookGuidanceApi.complete(missionId, succeeded, message); } catch { /* Workflow state remains authoritative in the UI. */ }
  }, []);

  useEffect(() => {
    if (!activeSession || isTerminal(activeSession.status)) return;
    let mounted = true;
    const tick = async () => {
      if (!mounted || pollInFlight.current) return;
      pollInFlight.current = true;
      try {
        const state = await bookGuidanceApi.getExecution(activeSession.executionId);
        if (!mounted) return;
        setExecution(state);
        const eventType = state.expectedEventType?.toUpperCase();
        if (eventType === "BOOK_SELECTED" || eventType === "BOOK_ACTION") {
          const eventKey = `${activeSession.executionId}:${eventType}`;
          if (!sentEvents.current.has(eventKey)) {
            sentEvents.current.add(eventKey);
            try {
              if (eventType === "BOOK_SELECTED") {
                await bookGuidanceApi.submitEvent(activeSession.executionId, eventType, { selected_book_id: activeSession.bookId });
              } else {
                await bookGuidanceApi.submitEvent(activeSession.executionId, eventType, { action: "START_GUIDANCE" });
              }
            } catch (eventError) {
              sentEvents.current.delete(eventKey);
              throw eventError;
            }
          }
        }

        if (state.status.toLowerCase() === "completed") {
          if (activeSession.status !== "completed") setSession({ ...activeSession, status: "completed" });
          await postCompletion(activeSession.missionId, true);
        } else if (state.status.toLowerCase() === "failed") {
          if (activeSession.status !== "failed") setSession({ ...activeSession, status: "failed" });
          await postCompletion(activeSession.missionId, false, state.error ?? "BookGuidance workflow failed.");
        } else {
          const status = state.currentStep === "S120" || runtime?.telemetry?.navigationState?.toUpperCase() === "NAVIGATING"
            ? "navigating" : eventType ? "waiting" : "starting";
          if (activeSession.status !== status) setSession({ ...activeSession, status });
        }
      } catch (error: unknown) {
        if (mounted) setErrorMessage(getErrorMessage(error));
      } finally {
        pollInFlight.current = false;
      }
    };
    void tick();
    const timer = setInterval(() => { void tick(); }, 1200);
    return () => { mounted = false; clearInterval(timer); };
  }, [activeSession, runtime?.telemetry?.navigationState, setSession, postCompletion]);

  const handleArm = async () => {
    recordInteraction();
    setBusy(true);
    setErrorMessage(null);
    try {
      const lease = await bookGuidanceApi.arm(runtimeId);
      setArmLeaseId(lease.leaseId);
      await refreshRuntime();
    } catch (error: unknown) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  const handleStart = async () => {
    recordInteraction();
    if (!currentBook || !selectedCopy || !copyAvailable || !destination) {
      setErrorMessage("Bản sao đã chọn chưa có tọa độ đích hợp lệ.");
      return;
    }
    if (env.isMock) {
      setErrorMessage("BookGuidance cần kết nối BE. Hãy cấu hình EXPO_PUBLIC_API_BASE_URL để bắt đầu.");
      return;
    }
    if (!runtimeReady) {
      setErrorMessage("Robot đang offline, telemetry cũ hoặc chưa định vị. Chưa thể bắt đầu dẫn đường.");
      return;
    }
    if (isReal && !armLeaseId) {
      setErrorMessage("Hãy ARM robot thật trước khi bắt đầu dẫn đường.");
      return;
    }

    setBusy(true);
    setErrorMessage(null);
    try {
      const started = await bookGuidanceApi.start({
        query: currentBook.title,
        runtimeId,
        bookId: currentBook.id,
        bookItemId: selectedCopy.id,
        ...(isReal && armLeaseId ? { armLeaseId } : {}),
      });
      const next: GuidanceSession = {
        missionId: started.missionId,
        executionId: started.executionId,
        runtimeId: started.runtimeId || runtimeId,
        bookId: currentBook.id,
        bookItemId: selectedCopy.id,
        armLeaseId: isReal ? armLeaseId ?? undefined : undefined,
        status: "starting",
      };
      sentEvents.current.clear();
      completionPosted.current = false;
      setSession(next);
    } catch (error: unknown) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  const handleStopTracking = () => {
    recordInteraction();
    setSession(null);
    setExecution(null);
    completionPosted.current = false;
  };

  const runtimeLabel = runtimeMatchesSelection && runtime?.connected && !runtime.stale
    ? runtime.telemetry?.localizationState?.toUpperCase() === "LOCALIZED" ? "Sẵn sàng" : "Đang định vị"
    : "Mất kết nối";
  const isArrived = workflowStatus === "completed";

  return (
    <View style={[styles.screen, { paddingBottom: Math.max(insets.bottom, spacing.sm) }]}>
      <AppHeader title="Dẫn đường đến sách" subtitle="Bản đồ Gazebo 2D • vị trí và lộ trình robot trực tiếp" onBack={onBackToSearch} />
      <ScrollView contentContainerStyle={[styles.content, !isCompactWidth && styles.contentWide]}>
        <View style={styles.bookCard}>
          <View style={styles.bookIcon}><MapPin size={19} color="#1d4ed8" /></View>
          <View style={styles.bookDetails}>
            <AppText variant="subtitle" numberOfLines={2}>{currentBook?.title ?? "Đang tải sách…"}</AppText>
            <AppText variant="caption" color={colors.subtext}>
              {selectedCopy ? `${selectedCopy.barcode} • ${selectedCopy.aisle ?? ""} ${selectedCopy.shelf ?? ""} ${selectedCopy.shelfSlot ?? ""}` : `Bản sao ${bookItemId}`}
            </AppText>
          </View>
          <View style={[styles.statusPill, runtimeReady ? styles.statusReady : styles.statusWaiting]}>
            <View style={[styles.statusDot, runtimeReady ? styles.dotReady : styles.dotWaiting]} />
            <AppText variant="caption" color={runtimeReady ? "#047857" : "#9a6700"}>{runtimeLabel}</AppText>
          </View>
        </View>

        <View style={styles.runtimeRow}>
          <AppText variant="caption" color={colors.subtext}>ROBOT RUNTIME</AppText>
          <View style={styles.runtimeChoices}>
            {(runtimes.length ? runtimes : [{ id: "sim", displayName: "Gazebo SIM", kind: "SIM" } as RobotRuntime, { id: "real", displayName: "Robot thật", kind: "REAL" } as RobotRuntime]).map((item) => (
              <Pressable
                key={item.id}
                onPress={() => { if (!activeSession) { setRuntimeId(item.id); setArmLeaseId(null); setErrorMessage(null); } }}
                disabled={Boolean(activeSession)}
                accessibilityRole="button"
                accessibilityLabel={`Chọn ${item.displayName}`}
                style={[styles.runtimeChoice, runtimeId === item.id && styles.runtimeChoiceSelected, activeSession && styles.choiceDisabled]}
              >
                <AppText variant="caption" color={runtimeId === item.id ? "#fff" : colors.textSecondary}>{item.kind === "REAL" ? "Robot thật" : "Gazebo SIM"}</AppText>
              </Pressable>
            ))}
          </View>
        </View>

        <GazeboMap2D
          robot={robotPose}
          robotConnected={Boolean(runtime?.connected && !runtime.stale)}
          runtimeLabel={runtime?.kind === "REAL" ? "REAL" : "SIM"}
          destination={destination}
          destinationLabel={selectedCopy?.shelf ?? "Vị trí sách"}
          path={route}
          testID="gazebo-guidance-map"
        />

        <View style={styles.legend}>
          <LegendDot color="#0284c7" label={robotPose ? "Robot realtime" : "Chưa nhận pose robot"} />
          <LegendDot color="#ea580c" label="Bản sao sách" />
          <LegendDot color="#2563eb" label={route.length > 1 ? "Lộ trình Nav2" : "Chưa có plannedPath"} />
        </View>
        <View style={styles.mapCaption}>
          <AppText variant="caption" color={colors.subtext}>
            {realtimeConnected ? "Realtime SignalR" : "Đang cập nhật bằng REST polling"} • tọa độ cùng origin và tỷ lệ với bản đồ FE
          </AppText>
        </View>

        {bookLoading && <View style={styles.inline}><ActivityIndicator color={colors.primary} /><AppText variant="caption">Đang tải vị trí bản sao…</AppText></View>}
        {!bookLoading && !destination && (
          <View style={styles.errorBox}><AppText variant="body" color="#9f1239">Bản sao này thiếu endpoint tọa độ. Hãy chọn bản sao khác có vị trí đã cấu hình.</AppText></View>
        )}
        {activeSession && (
          <View style={styles.workflowCard}>
            <View style={styles.workflowIcon}><Radio size={18} color={isArrived ? "#047857" : "#1d4ed8"} /></View>
            <View style={styles.bookDetails}>
          <AppText variant="subtitle">{isArrived ? "Đã đến vị trí sách" : workflowStatus === "failed" ? "Workflow bị từ chối" : execution?.currentStep === "S170" ? "Đang hoàn tất BookGuidance" : workflowStatus === "navigating" ? "LiBot đang dẫn đường" : "Đang chạy BookGuidance"}</AppText>
              <AppText variant="caption" color={colors.subtext}>{execution?.currentStep ?? "Đang chờ workflow"} • {activeSession.runtimeId} • {activeSession.executionId.slice(0, 8)}</AppText>
            </View>
            {isArrived && <CheckCircle2 size={22} color="#059669" />}
          </View>
        )}

        {errorMessage && <View style={styles.errorBox}><AppText variant="body" color="#9f1239">{errorMessage}</AppText></View>}

        {isReal && !activeSession && (
          <Pressable disabled={!runtimeMatchesSelection || !runtime?.connected || runtime.stale || busy || Boolean(armLeaseId)} onPress={handleArm} style={[styles.armButton, (busy || !runtimeMatchesSelection || !runtime?.connected || runtime.stale || Boolean(armLeaseId)) && styles.buttonDisabled]}>
            {busy ? <ActivityIndicator color="#1d4ed8" /> : <Shield size={17} color="#1d4ed8" />}
            <AppText variant="subtitle" color="#1d4ed8">{armLeaseId ? "Robot đã ARM" : "ARM robot thật (bắt buộc)"}</AppText>
          </Pressable>
        )}

        {activeSession ? (
          <View style={styles.actionRow}>
            {isArrived ? (
              <Pressable onPress={() => onGoToFeedback(activeSession.missionId)} style={styles.primaryButton}>
                <CheckCircle2 size={17} color="#fff" /><AppText variant="subtitle" color="#fff">Đánh giá chuyến đi</AppText>
              </Pressable>
            ) : workflowStatus === "failed" ? (
              <Pressable onPress={handleStopTracking} style={styles.primaryButton}><AppText variant="subtitle" color="#fff">Đóng phiên lỗi</AppText></Pressable>
            ) : (
              <View style={[styles.primaryButton, styles.buttonWaiting]}><ActivityIndicator color="#fff" /><AppText variant="subtitle" color="#fff">{workflowStatus === "navigating" ? "Đang dẫn đường…" : "Đang chuẩn bị workflow…"}</AppText></View>
            )}
          </View>
        ) : (
          <Pressable
            disabled={busy || bookLoading || !copyAvailable || !destination || !runtimeReady || (isReal && !armLeaseId) || env.isMock}
            onPress={handleStart}
            style={[styles.primaryButton, (busy || bookLoading || !copyAvailable || !destination || !runtimeReady || (isReal && !armLeaseId) || env.isMock) && styles.buttonDisabled]}
          >
            {busy ? <ActivityIndicator color="#fff" /> : <Zap size={17} color="#fff" fill="#fff" />}
            <AppText variant="subtitle" color="#fff">{busy ? "Đang gửi BookGuidance…" : "Dẫn đường đến bản sao này"}</AppText>
          </Pressable>
        )}
        {!activeSession && <AppText variant="caption" color={colors.subtext} style={styles.footerHint}>Workflow chạy qua BE BookGuidance; Mobile chỉ đọc telemetry và ARM robot thật.</AppText>}
      </ScrollView>
    </View>
  );
}

function LegendDot({ color, label }: { color: string; label: string }): React.ReactElement {
  return <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: color }]} /><AppText variant="caption" color={colors.textSecondary}>{label}</AppText></View>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#f7f9fc" },
  content: { padding: spacing.md, gap: spacing.sm, alignSelf: "center", width: "100%", maxWidth: 840 },
  contentWide: { paddingHorizontal: spacing.lg },
  bookCard: { minHeight: 66, padding: 12, backgroundColor: "#fff", borderRadius: radius.md, borderWidth: 1, borderColor: "#e2e8f0", flexDirection: "row", alignItems: "center", gap: 10 },
  bookIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: "#eff6ff", alignItems: "center", justifyContent: "center" },
  bookDetails: { flex: 1, gap: 3 },
  statusPill: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 9, paddingVertical: 6, borderRadius: 14 },
  statusReady: { backgroundColor: "#ecfdf5" }, statusWaiting: { backgroundColor: "#fffbeb" },
  statusDot: { width: 7, height: 7, borderRadius: 4 }, dotReady: { backgroundColor: "#059669" }, dotWaiting: { backgroundColor: "#d97706" },
  runtimeRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12, minHeight: 44 },
  runtimeChoices: { flexDirection: "row", gap: 7 },
  runtimeChoice: { minHeight: 40, minWidth: 92, paddingHorizontal: 11, alignItems: "center", justifyContent: "center", borderRadius: 12, borderWidth: 1, borderColor: "#dbe2ea", backgroundColor: "#fff" },
  runtimeChoiceSelected: { backgroundColor: "#1d4ed8", borderColor: "#1d4ed8" }, choiceDisabled: { opacity: 0.7 },
  legend: { flexDirection: "row", flexWrap: "wrap", gap: 14, paddingVertical: 4 },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 6 }, legendDot: { width: 8, height: 8, borderRadius: 4 },
  mapCaption: { alignItems: "flex-end", marginTop: -5 },
  inline: { flexDirection: "row", alignItems: "center", gap: 8, padding: 8 },
  workflowCard: { padding: 12, borderRadius: radius.md, borderWidth: 1, borderColor: "#dbeafe", backgroundColor: "#eff6ff", flexDirection: "row", alignItems: "center", gap: 10 },
  workflowIcon: { width: 36, height: 36, borderRadius: 12, backgroundColor: "#dbeafe", alignItems: "center", justifyContent: "center" },
  errorBox: { padding: 12, borderRadius: 12, backgroundColor: "#fff1f2", borderWidth: 1, borderColor: "#fecdd3" },
  armButton: { minHeight: 48, borderRadius: 14, borderWidth: 1, borderColor: "#bfdbfe", backgroundColor: "#eff6ff", alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 9 },
  actionRow: { flexDirection: "row", gap: 10 },
  primaryButton: { flex: 1, minHeight: 52, borderRadius: 15, backgroundColor: "#1d4ed8", alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 10, paddingHorizontal: 14 },
  buttonWaiting: { backgroundColor: "#2563eb" }, buttonDisabled: { opacity: 0.47 },
  footerHint: { textAlign: "center", paddingBottom: spacing.xs },
});
