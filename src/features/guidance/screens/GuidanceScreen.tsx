import {
  Shield,
  Zap,
} from "lucide-react-native";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import { env } from "@/config/env";
import { useKioskStore } from "@/core/state";
import { AppHeader, AppText } from "@/shared/ui";
import { useResponsiveLayout } from "@/shared/layout";
import { colors, radius, shadows, spacing } from "@/shared/theme";
import { GazeboMap2D } from "../components/GazeboMap2D";
import { bookGuidanceApi, type BookGuidanceExecution, type NavigationEndpoint } from "../api/bookGuidance.api";
import { useRobotRuntimeTelemetry } from "../hooks/useRobotRuntimeTelemetry";
import { useRobotMapOverlays } from "../hooks/useRobotMapOverlays";
import type { GuidanceSession, RobotPose } from "../types/guidance.types";

export interface GuidanceScreenProps {
  endpointId: string;
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

function getWorkflowFailureDetails(execution?: BookGuidanceExecution | null): {
  step?: string;
  code?: string;
  message?: string;
} {
  const results = execution?.result?.results ?? [];
  const failedStep =
    execution?.result?.failed_step ?? execution?.currentStep ?? undefined;
  const failedStepResult =
    results.find((item) => item.step === failedStep) ??
    results.find((item) =>
      ["error", "failed", "timeout"].includes(
        item.result?.status?.toLowerCase() ?? "",
      ),
    );
  return {
    step: failedStep ?? undefined,
    code: failedStepResult?.result?.nav2_result_code ?? undefined,
    message:
      failedStepResult?.result?.message ??
      execution?.error ??
      execution?.message ??
      undefined,
  };
}

function formatWorkflowFailure(execution: BookGuidanceExecution): string {
  const details = getWorkflowFailureDetails(execution);
  return (
    [
      details.step ? `Bước ${details.step}` : undefined,
      details.code,
      details.message,
    ]
      .filter(Boolean)
      .join(" · ") || "BookGuidance workflow thất bại."
  );
}

export function GuidanceScreen({
  endpointId,
  onGoToFeedback,
  onBackToSearch,
}: GuidanceScreenProps): React.ReactElement {
  const { insets, isCompactWidth } = useResponsiveLayout();
  const session = useKioskStore((state) => state.activeGuidanceSession);
  const setSession = useKioskStore((state) => state.setActiveGuidanceSession);
  const recordInteraction = useKioskStore((state) => state.recordInteraction);
  const [endpoint, setEndpoint] = useState<NavigationEndpoint | null>(null);
  const [loadedEndpointId, setLoadedEndpointId] = useState<string | null>(null);
  const endpointLoaded = loadedEndpointId === endpointId;
  const [runtimeId, setRuntimeId] = useState(
    session?.endpointId === endpointId
      ? session.runtimeId
      : "real",
  );
  const [armLeaseId, setArmLeaseId] = useState<string | null>(
    session?.armLeaseId ?? null,
  );
  const [busy, setBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const pollInFlight = useRef(false);
  const completionPosted = useRef(false);
  const feedbackNavigated = useRef(false);

  const { runtime, refreshRuntime } = useRobotRuntimeTelemetry(runtimeId);

  const activeSession = session?.endpointId === endpointId ? session : null;
  const {
    mapMetadata: savedRobotMap,
    mapEndpoints,
    mapZones,
    endpointsError: mapEndpointsError,
    zonesError: mapZonesError,
  } = useRobotMapOverlays(endpoint?.id, endpoint?.mapId);
  const destination = useMemo<RobotPose | null>(
    () =>
      endpoint && endpoint.isActive
        && Number.isFinite(endpoint.positionX)
        && Number.isFinite(endpoint.positionY)
        && Number.isFinite(endpoint.theta)
        ? { x: endpoint.positionX, y: endpoint.positionY, yaw: endpoint.theta }
        : null,
    [endpoint],
  );
  const runtimeMatchesSelection = runtime?.id === runtimeId;
  const selectedSavedRobotMap = savedRobotMap;
  const robotPose = runtimeMatchesSelection
    ? (runtime?.telemetry?.pose ?? null)
    : null;

  // Memoize route to avoid unnecessary recreation on every render
  const route = useMemo(
    () =>
      runtimeMatchesSelection
        ? (runtime?.telemetry?.plannedPath?.map((point) => ({
          ...point,
          yaw: 0,
        })) ?? [])
        : [],
    [runtimeMatchesSelection, runtime?.telemetry?.plannedPath],
  );
  const runtimeReady = Boolean(
    runtimeMatchesSelection &&
    runtime?.connected &&
    !runtime.stale &&
    runtime.telemetry?.localizationState?.toUpperCase() === "LOCALIZED",
  );
  // Avoid crowding the header on compact phones.
  const showHeaderStatus = !isCompactWidth;

  useEffect(() => {
    let mounted = true;
    void bookGuidanceApi.getEndpoint(endpointId)
      .then((value) => {
        if (!mounted) return;
        setEndpoint(value);
        setLoadedEndpointId(endpointId);
      })
      .catch((error: unknown) => {
        if (!mounted) return;
        setErrorMessage(getErrorMessage(error));
        setLoadedEndpointId(endpointId);
      });
    return () => { mounted = false; };
  }, [endpointId]);

  useEffect(() => {
    let mounted = true;
    void bookGuidanceApi
      .getRuntimes()
      .then((items) => {
        if (!mounted) return;
        const realRuntimes = items.filter(
          (item) =>
            item.kind?.toUpperCase() === "REAL" ||
            item.id.toLowerCase() === "real",
        );
        const selected = realRuntimes.find((item) => item.id === runtimeId);
        if (!selected && realRuntimes.length > 0)
          setRuntimeId(realRuntimes[0].id);
      })
      .catch((error: unknown) => {
        if (mounted) setErrorMessage(getErrorMessage(error));
      });
    return () => {
      mounted = false;
    };
  }, [runtimeId]);

  const postCompletion = useCallback(
    async (missionId: string, succeeded: boolean, message?: string) => {
      if (completionPosted.current) return;
      completionPosted.current = true;
      try {
        await bookGuidanceApi.complete(missionId, succeeded, message);
      } catch {
        /* Workflow state remains authoritative in the UI. */
      }
    },
    [],
  );

  useEffect(() => {
    if (!activeSession || isTerminal(activeSession.status)) return;
    let mounted = true;
    const tick = async () => {
      if (!mounted || pollInFlight.current) return;
      pollInFlight.current = true;
      try {
        const state = await bookGuidanceApi.getExecution(
          activeSession.executionId,
        );
        if (!mounted) return;
        const eventType = state.expectedEventType?.toUpperCase();

        if (state.status.toLowerCase() === "completed") {
          if (activeSession.status !== "completed")
            setSession({ ...activeSession, status: "completed" });
          await postCompletion(activeSession.missionId, true);
          if (mounted && !feedbackNavigated.current) {
            feedbackNavigated.current = true;
            onGoToFeedback(activeSession.missionId);
          }
        } else if (state.status.toLowerCase() === "failed") {
          const failureMessage = formatWorkflowFailure(state);
          if (activeSession.status !== "failed")
            setSession({ ...activeSession, status: "failed" });
          await postCompletion(
            activeSession.missionId,
            false,
            failureMessage,
          );
          if (mounted) setErrorMessage(failureMessage);
        } else {
          const status =
            state.currentStep === "S120" ||
              runtime?.telemetry?.navigationState?.toUpperCase() === "NAVIGATING"
              ? "navigating"
              : eventType
                ? "waiting"
                : "starting";
          if (activeSession.status !== status)
            setSession({ ...activeSession, status });
        }
      } catch (error: unknown) {
        if (mounted) setErrorMessage(getErrorMessage(error));
      } finally {
        pollInFlight.current = false;
      }
    };
    void tick();
    const timer = setInterval(() => {
      void tick();
    }, 1200);
    return () => {
      mounted = false;
      clearInterval(timer);
    };
  }, [
    activeSession,
    runtime?.telemetry?.navigationState,
    setSession,
    postCompletion,
    onGoToFeedback,
  ]);

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
    if (!endpoint || !destination) {
      setErrorMessage("Đích dẫn đường không còn hợp lệ.");
      return;
    }
    if (env.isMock) {
      setErrorMessage(
        "BookGuidance cần kết nối BE. Hãy cấu hình EXPO_PUBLIC_API_BASE_URL để bắt đầu.",
      );
      return;
    }
    if (!runtimeReady) {
      setErrorMessage(
        "Robot đang offline, telemetry cũ hoặc chưa định vị. Chưa thể bắt đầu dẫn đường.",
      );
      return;
    }
    if (!armLeaseId) {
      setErrorMessage("Hãy ARM robot thật trước khi bắt đầu dẫn đường.");
      return;
    }

    setBusy(true);
    setErrorMessage(null);
    try {
      const started = await bookGuidanceApi.start({
        runtimeId,
        endpointId: endpoint.id,
        armLeaseId,
      });
      const next: GuidanceSession = {
        missionId: started.missionId,
        executionId: started.executionId,
        runtimeId: started.runtimeId || runtimeId,
        endpointId: endpoint.id,
        armLeaseId: armLeaseId ?? undefined,
        status: "starting",
      };
      completionPosted.current = false;
      feedbackNavigated.current = false;
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
    completionPosted.current = false;
    feedbackNavigated.current = false;
  };

  const handleBack = () => {
    handleStopTracking();
    onBackToSearch();
  };

  const runtimeLabel =
    runtimeMatchesSelection && runtime?.connected && !runtime.stale
      ? runtime.telemetry?.localizationState?.toUpperCase() === "LOCALIZED"
        ? "Sẵn sàng"
        : "Đang định vị"
      : "Mất kết nối";

  const runtimeTone = runtimeReady
    ? { backgroundColor: colors.successSoft, color: colors.success }
    : runtimeMatchesSelection && runtime?.connected && !runtime.stale
      ? { backgroundColor: colors.warningSoft, color: colors.warning }
      : { backgroundColor: colors.dangerSoft, color: colors.danger };

  const armDisabled = Boolean(
    activeSession ||
      busy ||
      !runtimeMatchesSelection ||
      !runtime?.connected ||
      runtime.stale ||
      armLeaseId,
  );
  const startDisabled = Boolean(
    busy ||
      activeSession ||
      !endpointLoaded ||
      !endpoint ||
      !destination ||
      !runtimeReady ||
      !armLeaseId ||
      env.isMock,
  );

  return (
    <View style={styles.screen}>
      <AppHeader
        title="Dẫn đường đến sách"
        subtitle="Bản đồ Gazebo 2D • vị trí và lộ trình robot trực tiếp"
        onBack={handleBack}
        rightAccessory={
          showHeaderStatus ? (
            <View
              style={[
                styles.headerStatus,
                { backgroundColor: runtimeTone.backgroundColor },
              ]}
              accessibilityRole="text"
              accessibilityLabel={`Robot ${runtimeLabel}`}
            >
              <View
                style={[
                  styles.statusDot,
                  { backgroundColor: runtimeTone.color },
                ]}
              />
              <AppText
                variant="caption"
                color={runtimeTone.color}
                style={styles.headerStatusText}
              >
                {runtimeLabel}
              </AppText>
            </View>
          ) : undefined
        }
      />
      <View style={styles.mapArea}>
        <GazeboMap2D
          robot={robotPose}
          robotConnected={Boolean(runtime?.connected && !runtime.stale)}
          runtimeLabel={
            selectedSavedRobotMap
              ? `MAP V${selectedSavedRobotMap.version}`
              : "REAL"
          }
          destination={destination}
          destinationLabel={endpoint?.name ?? "Đích dẫn đường"}
          mapEndpoints={mapEndpoints}
          mapZones={mapZones}
          selectedEndpointId={endpoint?.id}
          path={route}
          mapMetadata={selectedSavedRobotMap ?? undefined}
          frameStyle={styles.mapFrame}
          testID="gazebo-guidance-map"
        />

        {!endpointLoaded && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator color={colors.primary} />
            <AppText variant="caption">Đang tải endpoint…</AppText>
          </View>
        )}
        {endpointLoaded && !destination && (
          <View style={styles.errorOverlay}>
            <AppText variant="body" color={colors.danger}>
              Endpoint này không còn active hoặc thiếu tọa độ hợp lệ.
            </AppText>
          </View>
        )}
        {errorMessage && (
          <View style={styles.errorOverlay} testID="guidance-error-overlay">
            <AppText variant="body" color={colors.danger}>
              {errorMessage}
            </AppText>
          </View>
        )}
        {(mapEndpointsError || mapZonesError) && (
          <View style={styles.mapWarningOverlay}>
            <AppText variant="caption" color={colors.danger}>
              {mapEndpointsError ?? mapZonesError}
            </AppText>
          </View>
        )}
      </View>

      <View
        style={[
          styles.actionBar,
          {
            paddingBottom: Math.max(insets.bottom, spacing.sm),
            paddingLeft: Math.max(insets.left, spacing.md),
            paddingRight: Math.max(insets.right, spacing.md),
          },
        ]}
      >
        <Pressable
          disabled={armDisabled}
          onPress={handleArm}
          style={[styles.armButton, armDisabled && styles.buttonDisabled]}
          accessibilityRole="button"
          accessibilityLabel={
            armLeaseId ? "Robot đã ARM" : "ARM robot thật (bắt buộc)"
          }
        >
          {busy && !armLeaseId ? (
            <ActivityIndicator color={colors.primary} />
          ) : (
            <Shield size={18} color={colors.primary} />
          )}
          <AppText variant="subtitle" color={colors.primary} style={styles.actionButtonText}>
            {armLeaseId ? "Robot đã ARM" : "ARM robot thật"}
          </AppText>
        </Pressable>

        <Pressable
          disabled={startDisabled}
          onPress={handleStart}
          style={[styles.primaryButton, startDisabled && styles.buttonDisabled]}
          accessibilityRole="button"
          accessibilityLabel="Dẫn đường đến sách"
        >
          {busy ? (
            <ActivityIndicator color={colors.surface} />
          ) : (
            <Zap size={18} color={colors.surface} fill={colors.surface} />
          )}
          <AppText variant="subtitle" color={colors.surface} style={styles.actionButtonText}>
            {activeSession
              ? "Đang dẫn đường…"
              : busy
                ? "Đang gửi…"
                : "Dẫn đường"}
          </AppText>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  mapArea: {
    flex: 1,
    minHeight: 0,
    position: "relative",
    backgroundColor: colors.surface,
  },
  mapFrame: {
    flex: 1,
    width: "100%",
    height: "100%",
    borderRadius: 0,
    borderWidth: 0,
  },
  statusDot: { width: 7, height: 7, borderRadius: 4 },
  headerStatus: {
    minHeight: 34,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 4,
    borderRadius: radius.lg,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  headerStatusText: {
    fontWeight: "600",
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFill,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    backgroundColor: "rgba(255,255,255,0.72)",
  },
  errorOverlay: {
    position: "absolute",
    top: spacing.md,
    left: spacing.md,
    right: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.dangerSoft,
    borderWidth: 1,
    borderColor: colors.danger,
    ...shadows.card,
  },
  mapWarningOverlay: {
    position: "absolute",
    bottom: spacing.sm,
    left: spacing.sm,
    right: spacing.sm,
    padding: spacing.sm,
    borderRadius: radius.sm,
    backgroundColor: colors.surface,
    ...shadows.card,
  },
  actionBar: {
    flexDirection: "row",
    gap: spacing.sm,
    paddingTop: spacing.sm,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderColor: colors.borderLight,
  },
  actionButtonText: {
    fontWeight: "700",
  },
  armButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  primaryButton: {
    flex: 1,
    minHeight: 52,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    ...shadows.card,
  },
  buttonWaiting: { backgroundColor: colors.primaryDark },
  buttonDisabled: { opacity: 0.47 },
  footnote: {
    textAlign: "center",
    marginTop: spacing.xs,
    lineHeight: 18,
  },
});
