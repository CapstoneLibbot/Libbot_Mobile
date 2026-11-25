import {
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
import { useQuery } from "@tanstack/react-query";
import { env } from "@/config/env";
import { queryKeys, useKioskStore } from "@/core/state";
import { ApiError, getFriendlyErrorMessage } from "@/services/api/apiError";
import { AppHeader, AppText } from "@/shared/ui";
import { useResponsiveLayout } from "@/shared/layout";
import { colors, radius, shadows, spacing } from "@/shared/theme";
import { GazeboMap2D } from "../components/GazeboMap2D";
import { bookGuidanceApi } from "../api/bookGuidance.api";
import { facilityGuidanceApi } from "@/features/facilities/api/facilityGuidance.api";
import { useRobotRuntimeTelemetry } from "../hooks/useRobotRuntimeTelemetry";
import { useRobotMapOverlays } from "../hooks/useRobotMapOverlays";
import { useGuidanceAnnouncer } from "../hooks/useGuidanceAnnouncer";
import {
  formatExecutionStepLabel,
  useGuidanceExecutionTracking,
} from "../hooks/useGuidanceExecutionTracking";
import type { GuidanceKind, GuidanceSession, RobotPose } from "../types/guidance.types";

export interface GuidanceScreenProps {
  endpointId: string;
  bookId?: string;
  bookItemId?: string;
  facilityId?: string;
  initialQuery?: string;
  guidanceKind?: GuidanceKind;
  onGoToFeedback: (jobId: string) => void;
  onBackToSearch: () => void;
}

function getErrorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.friendlyMessage || error.message;
  if (error instanceof Error) return getFriendlyErrorMessage(error);
  return "Không thể kết nối với robot. Hãy kiểm tra mạng và thử lại.";
}

export function GuidanceScreen({
  endpointId,
  bookId,
  bookItemId,
  facilityId,
  initialQuery,
  guidanceKind,
  onGoToFeedback,
  onBackToSearch,
}: GuidanceScreenProps): React.ReactElement {
  const { insets, isCompactWidth, width, height } = useResponsiveLayout();
  const isLandscape = width > height;
  const session = useKioskStore((state) => state.activeGuidanceSession);
  const setSession = useKioskStore((state) => state.setActiveGuidanceSession);
  const recordInteraction = useKioskStore((state) => state.recordInteraction);
  const [runtimeId, setRuntimeId] = useState(
    session?.destinationId === endpointId
      ? session.runtimeId
      : "real",
  );
  const mapRotationDeg = 0;
  const [busy, setBusy] = useState(false);
  const [actionErrorMessage, setActionErrorMessage] = useState<string | null>(null);

  const endpointQuery = useQuery({
    queryKey: queryKeys.endpoints.detail(endpointId),
    queryFn: () => bookGuidanceApi.getEndpoint(endpointId),
    enabled: Boolean(endpointId),
    staleTime: 5 * 60_000,
  });
  const endpoint = endpointQuery.data ?? null;
  const endpointLoaded = Boolean(endpointId) && !endpointQuery.isPending;

  const runtimesQuery = useQuery({
    queryKey: queryKeys.runtimes.all,
    queryFn: () => bookGuidanceApi.getRuntimes(),
    staleTime: 60_000,
  });

  useEffect(() => {
    const items = runtimesQuery.data;
    if (!items) return;
    const realRuntimes = items.filter(
      (item) =>
        item.kind?.toUpperCase() === "REAL" ||
        item.id.toLowerCase() === "real",
    );
    const selected = realRuntimes.find((item) => item.id === runtimeId);
    if (!selected && realRuntimes.length > 0) {
      setRuntimeId(realRuntimes[0].id);
    }
  }, [runtimesQuery.data, runtimeId]);

  const errorMessage =
    actionErrorMessage ??
    (endpointQuery.error
      ? getErrorMessage(endpointQuery.error)
      : runtimesQuery.error
        ? getErrorMessage(runtimesQuery.error)
        : null);

  const { runtime } = useRobotRuntimeTelemetry(runtimeId);

  const activeSession = session?.destinationId === endpointId ? session : null;
  const effectiveKind: GuidanceKind =
    activeSession?.guidanceKind ??
    guidanceKind ??
    (facilityId ? "LOCATION_GUIDANCE" : "BOOK_GUIDANCE");
  const announcer = useGuidanceAnnouncer({
    activeJobId: activeSession?.jobId,
  });

  const { execution, resetTracking } = useGuidanceExecutionTracking({
    activeSession,
    setSession,
    announcer,
    onGoToFeedback,
    onErrorMessage: setActionErrorMessage,
  });
  const stepStatusLabel = activeSession
    ? formatExecutionStepLabel(execution)
    : null;
  const {
    mapMetadata: savedRobotMap,
    mapEndpoints,
    endpointsError: mapEndpointsError,
  } = useRobotMapOverlays(endpoint?.id, endpoint?.mapId, {
    includeZones: false,
    runtimeActiveMapId: runtime?.telemetry?.activeMapId ?? null,
  });
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

  const autoStartTriggered = useRef(false);

  const handleStart = useCallback(async () => {
    recordInteraction();
    if (!endpoint || !destination) {
      setActionErrorMessage("Đích dẫn đường không còn hợp lệ.");
      return;
    }
    if (env.isMock) {
      setActionErrorMessage(
        "BookGuidance cần kết nối BE. Hãy cấu hình EXPO_PUBLIC_API_BASE_URL để bắt đầu.",
      );
      return;
    }
    if (!runtimeReady) {
      setActionErrorMessage(
        "Robot đang offline, telemetry cũ hoặc chưa định vị. Chưa thể bắt đầu dẫn đường.",
      );
      return;
    }

    setBusy(true);
    setActionErrorMessage(null);
    try {
      let leaseId: string | undefined;
      try {
        const lease = await bookGuidanceApi.arm(runtimeId);
        leaseId = lease.leaseId;
      } catch {
        // Backend will auto-arm if already initialized
      }

      const started =
        effectiveKind === "LOCATION_GUIDANCE"
          ? await facilityGuidanceApi.start({
              query: initialQuery?.trim() || endpoint.name,
              facilityId: facilityId || endpoint.id,
              runtimeId,
              armLeaseId: leaseId,
            })
          : await bookGuidanceApi.start({
              runtimeId,
              endpointId: endpoint.id,
              bookId,
              bookItemId,
              armLeaseId: leaseId,
              query: initialQuery?.trim() || endpoint.name,
            });
      const next: GuidanceSession = {
        jobId: started.jobId,
        executionId: started.executionId,
        runtimeId: started.runtimeId || runtimeId,
        destinationId: endpoint.id,
        destinationName: initialQuery?.trim() || endpoint.name,
        guidanceKind: effectiveKind,
        startStatus: "ACCEPTED",
      };
      resetTracking();
      setSession(next);
    } catch (error: unknown) {
      setActionErrorMessage(getErrorMessage(error));
    } finally {
      setBusy(false);
    }
  }, [
    bookId,
    bookItemId,
    destination,
    effectiveKind,
    endpoint,
    facilityId,
    initialQuery,
    recordInteraction,
    resetTracking,
    runtimeId,
    runtimeReady,
    setSession,
  ]);

  // Auto-start guidance automatically as soon as destination & robot are ready (no manual ARM button needed)
  useEffect(() => {
    if (
      activeSession ||
      busy ||
      !endpointLoaded ||
      !endpoint ||
      !destination ||
      !runtimeReady ||
      env.isMock
    ) {
      return;
    }
    if (autoStartTriggered.current) return;
    autoStartTriggered.current = true;
    void handleStart();
  }, [
    activeSession,
    busy,
    destination,
    endpoint,
    endpointLoaded,
    handleStart,
    runtimeReady,
  ]);

  const handleStopTracking = () => {
    recordInteraction();
    if (activeSession && !activeSession.terminalStatus) {
      void bookGuidanceApi.cancelJob(activeSession.jobId).catch(() => {});
    }
    announcer.reset();
    setSession(null);
    resetTracking();
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

  const startDisabled = Boolean(
    busy ||
      activeSession ||
      !endpointLoaded ||
      !endpoint ||
      !destination ||
      !runtimeReady ||
      env.isMock,
  );

  return (
    <View style={styles.screen}>
      <AppHeader
        title={
          effectiveKind === "LOCATION_GUIDANCE"
            ? "Dẫn đường đến khu vực"
            : "Dẫn đường đến sách"
        }
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
      <View style={isLandscape ? styles.bodyLandscape : styles.bodyPortrait}>
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
            selectedEndpointId={endpoint?.id}
            path={route}
            mapMetadata={selectedSavedRobotMap ?? undefined}
            frameStyle={styles.mapFrame}
            fillContainer
            rotationAngle={(mapRotationDeg * Math.PI) / 180}
            cropToContent
            preserveAspectRatio="none"
            showMapTag={false}
            showScaleBar={false}
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
          {mapEndpointsError && (
            <View style={styles.mapWarningOverlay}>
              <AppText variant="caption" color={colors.danger}>
                {mapEndpointsError}
              </AppText>
            </View>
          )}
        </View>

        {/* Side Panel (Landscape) or Bottom Action Bar (Portrait) */}
        <View
          style={[
            isLandscape ? styles.sidePanel : styles.actionBar,
            {
              paddingBottom: Math.max(insets.bottom, isLandscape ? spacing.md : spacing.sm),
              paddingRight: Math.max(insets.right, spacing.md),
              paddingLeft: isLandscape ? spacing.md : Math.max(insets.left, spacing.md),
            },
          ]}
        >
          {isLandscape && (
            <View style={styles.destinationCard}>
              <AppText variant="caption" color={colors.textSecondary} style={styles.destinationCardSub}>
                ĐÍCH ĐẾN
              </AppText>
              <AppText variant="subtitle" color={colors.text} numberOfLines={2} style={styles.destinationCardTitle}>
                {endpoint?.name ?? "Đang tải…"}
              </AppText>
              {destination && (
                <AppText variant="caption" color={colors.subtext} style={styles.destinationCoords}>
                  X: {destination.x.toFixed(2)}m · Y: {destination.y.toFixed(2)}m
                </AppText>
              )}
            </View>
          )}

          <View style={isLandscape ? styles.sideActionsContainer : styles.bottomActionsContainer}>
            {stepStatusLabel ? (
              <View style={styles.stepStatusBanner} testID="guidance-step-status">
                <AppText variant="caption" color={colors.primaryDark} numberOfLines={2}>
                  {stepStatusLabel}
                </AppText>
              </View>
            ) : null}
            <Pressable
              disabled={startDisabled}
              onPress={handleStart}
              style={[
                styles.primaryButton,
                isLandscape && styles.primaryButtonLandscape,
                startDisabled && styles.buttonDisabled,
              ]}
              accessibilityRole="button"
              accessibilityLabel="Dẫn đường đến sách"
            >
              {busy ? (
                <ActivityIndicator color={colors.surface} />
              ) : (
                <Zap size={18} color={colors.surface} fill={colors.surface} />
              )}
              <AppText variant="subtitle" color={colors.surface} style={styles.actionButtonText}>
                {announcer.phase === "ARRIVED"
                  ? "Đã đến nơi!"
                  : announcer.phase === "FAILED"
                    ? "Đã có lỗi xảy ra"
                    : activeSession
                      ? "Đang dẫn đường…"
                      : busy
                        ? "Đang khởi động robot…"
                        : "Bắt đầu dẫn đường"}
              </AppText>
            </Pressable>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  bodyLandscape: {
    flex: 1,
    flexDirection: "row",
  },
  bodyPortrait: {
    flex: 1,
    flexDirection: "column",
  },
  mapArea: {
    flex: 1,
    minHeight: 0,
    position: "relative",
    backgroundColor: "#f1f5f9",
    alignItems: "center",
    justifyContent: "center",
  },
  mapFrame: {
    flex: 1,
    width: "100%",
    height: "100%",
    borderRadius: 0,
    borderWidth: 0,
    backgroundColor: "#f1f5f9",
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
  stepStatusBanner: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  sidePanel: {
    width: 290,
    backgroundColor: colors.surface,
    borderLeftWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing.md,
    justifyContent: "space-between",
  },
  destinationCard: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    gap: spacing.xs,
  },
  destinationCardSub: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  destinationCardTitle: {
    fontSize: 16,
    fontWeight: "700",
    lineHeight: 22,
  },
  destinationCoords: {
    fontSize: 12,
  },
  sideActionsContainer: {
    gap: spacing.sm,
  },
  bottomActionsContainer: {
    flex: 1,
    flexDirection: "row",
    gap: spacing.sm,
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
  primaryButtonLandscape: {
    flex: 0,
    width: "100%",
  },
  buttonWaiting: { backgroundColor: colors.primaryDark },
  buttonDisabled: { opacity: 0.47 },
  footnote: {
    textAlign: "center",
    marginTop: spacing.xs,
    lineHeight: 18,
  },
});
