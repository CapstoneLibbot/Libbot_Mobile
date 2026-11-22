import { CheckCircle2, MapPin, Radio, Shield, Zap } from "lucide-react-native";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useKioskStore } from "@/core/state";
import { AppHeader, AppText } from "@/shared/ui";
import { useResponsiveLayout } from "@/shared/layout";
import { colors, radius, spacing } from "@/shared/theme";
import { bookGuidanceApi, type RobotRuntime } from "@/features/guidance/api/bookGuidance.api";
import { GazeboMap2D } from "@/features/guidance/components/GazeboMap2D";
import { useRobotRuntimeTelemetry } from "@/features/guidance/hooks/useRobotRuntimeTelemetry";
import { useRobotMapOverlays } from "@/features/guidance/hooks/useRobotMapOverlays";
import { facilityGuidanceApi, type FacilityGuidanceExecution } from "../api/facilityGuidance.api";
import { useFacility } from "../hooks/useFacility";

export interface FacilityGuidanceScreenProps {
  facilityId: string;
  onGoToFeedback: (jobId: string) => void;
  onBack: () => void;
}

function errorMessage(error: unknown): string {
  if (typeof error === "object" && error !== null) {
    const details = (error as { details?: unknown }).details;
    if (typeof details === "object" && details !== null) {
      const body = details as { message?: unknown; robot?: unknown };
      if (typeof body.message === "string") return body.message;
      if (typeof body.robot === "object" && body.robot !== null) {
        const robot = body.robot as { message?: unknown; error?: unknown };
        if (typeof robot.message === "string") return robot.message;
        if (typeof robot.error === "string") return robot.error;
      }
    }
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string") return message;
  }
  return "Không thể kết nối với robot.";
}

function workflowFailureMessage(
  execution: FacilityGuidanceExecution | null,
): string | undefined {
  if (!execution) return undefined;
  const results = execution.result?.results ?? [];
  const failedStep =
    execution.result?.failed_step ?? execution.currentStep ?? undefined;
  const failedResult =
    results.find((item) => item.step === failedStep) ??
    results.find((item) =>
      ["error", "failed", "timeout"].includes(
        item.result?.status?.toLowerCase() ?? "",
      ),
    );
  return (
    [
      failedStep,
      failedResult?.result?.nav2_result_code,
      failedResult?.result?.message,
      execution.error,
      execution.message,
    ]
      .filter(Boolean)
      .join(" · ") || undefined
  );
}

export function FacilityGuidanceScreen({
  facilityId,
  onGoToFeedback,
  onBack,
}: FacilityGuidanceScreenProps): React.ReactElement {
  const { insets, isCompactWidth } = useResponsiveLayout();
  const recordInteraction = useKioskStore((state) => state.recordInteraction);
  const setActiveGuidanceSession = useKioskStore(
    (state) => state.setActiveGuidanceSession,
  );
  const {
    data: facility,
    isLoading: facilityLoading,
    error: facilityError,
  } = useFacility(facilityId);

  const [runtimes, setRuntimes] = useState<RobotRuntime[]>([]);
  const [runtimeId, setRuntimeId] = useState("real");
  const [armLeaseId, setArmLeaseId] = useState<string | null>(null);
  const [started, setStarted] = useState<{
    jobId: string;
    executionId: string;
  } | null>(null);
  const [execution, setExecution] =
    useState<FacilityGuidanceExecution | null>(null);
  const [arrived, setArrived] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const sentEvents = useRef(new Set<string>());
  const pollInFlight = useRef(false);
  const completed = useRef(false);
  const feedbackNavigated = useRef(false);

  const { runtime, refreshRuntime, realtimeConnected } =
    useRobotRuntimeTelemetry(runtimeId);
  const { mapMetadata, mapEndpoints, mapZones, mapError } =
    useRobotMapOverlays(facility?.location.endpoint.endpointId);

  const realRuntimes = runtimes.filter(
    (item) =>
      item.kind?.toUpperCase() === "REAL" || item.id.toLowerCase() === "real",
  );
  const ready = Boolean(
    runtime?.id === runtimeId &&
      runtime.connected &&
      !runtime.stale &&
      runtime.telemetry?.localizationState?.toUpperCase() === "LOCALIZED",
  );
  const destination = facility?.location.endpoint;
  const hasDestination = Boolean(
    destination &&
      [destination.x, destination.y, destination.theta].every(Number.isFinite),
  );
  const terminal = ["completed", "failed"].includes(
    execution?.status?.toLowerCase() ?? "",
  );
  const failed = execution?.status?.toLowerCase() === "failed";
  const failureDetails = failed ? workflowFailureMessage(execution) : undefined;

  useEffect(() => {
    let mounted = true;
    void bookGuidanceApi
      .getRuntimes()
      .then((items) => {
        if (!mounted) return;
        const real = items.filter(
          (item) =>
            item.kind?.toUpperCase() === "REAL" ||
            item.id.toLowerCase() === "real",
        );
        setRuntimes(real);
        if (real[0] && !real.some((item) => item.id === runtimeId)) {
          setRuntimeId(real[0].id);
        }
      })
      .catch((error) => {
        if (mounted) setMessage(errorMessage(error));
      });
    return () => {
      mounted = false;
    };
  }, [runtimeId]);

  const complete = useCallback(
    async (succeeded: boolean, detail?: string) => {
      if (!started || completed.current) return;
      completed.current = true;
      try {
        await facilityGuidanceApi.complete(started.jobId, succeeded, detail);
      } catch {
        /* task completion is best effort */
      }
    },
    [started],
  );

  useEffect(() => {
    if (!started || terminal || arrived) return;
    let active = true;

    const tick = async () => {
      if (!active || pollInFlight.current) return;
      pollInFlight.current = true;
      try {
        const state = await facilityGuidanceApi.getExecution(
          started.executionId,
        );
        if (!active) return;
        setExecution(state);

        const eventType = state.expectedEventType?.toUpperCase();
        if (eventType === "RATING_SUBMIT") {
          await complete(true);
          if (active) setArrived(true);
          return;
        }

        const eventKey = eventType
          ? `${started.executionId}:${eventType}`
          : null;
        if (eventType && eventKey && !sentEvents.current.has(eventKey)) {
          sentEvents.current.add(eventKey);
          try {
            if (eventType === "FACILITY_SELECTED") {
              await facilityGuidanceApi.submitEvent(
                started.executionId,
                eventType,
                { selected_facility_id: facilityId },
              );
            }
            if (eventType === "FACILITY_ACTION") {
              await facilityGuidanceApi.submitEvent(
                started.executionId,
                eventType,
                { action: "START_GUIDANCE" },
              );
            }
          } catch (eventError) {
            sentEvents.current.delete(eventKey);
            throw eventError;
          }
        }

        if (
          ["completed", "failed", "cancelled"].includes(
            state.status.toLowerCase(),
          )
        ) {
          const succeeded = state.status.toLowerCase() === "completed";
          await complete(
            succeeded,
            succeeded
              ? undefined
              : state.error ?? state.message ?? undefined,
          );
          if (active && !feedbackNavigated.current) {
            feedbackNavigated.current = true;
            onGoToFeedback(started.jobId);
          }
        }
      } catch (error) {
        if (active) setMessage(errorMessage(error));
      } finally {
        pollInFlight.current = false;
      }
    };

    void tick();
    const timer = setInterval(() => void tick(), 1200);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [started, terminal, arrived, facilityId, complete, onGoToFeedback]);

  const arm = async () => {
    recordInteraction();
    setBusy(true);
    setMessage(null);
    try {
      const lease = await bookGuidanceApi.arm(runtimeId);
      setArmLeaseId(lease.leaseId);
      await refreshRuntime();
    } catch (error) {
      setMessage(errorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  const start = async () => {
    recordInteraction();
    if (!facility || !hasDestination || !ready || !armLeaseId) return;
    setBusy(true);
    setMessage(null);
    try {
      const response = await facilityGuidanceApi.start({
        query: facility.name,
        facilityId: facility.id,
        runtimeId,
        armLeaseId,
      });
      sentEvents.current.clear();
      completed.current = false;
      feedbackNavigated.current = false;
      setArrived(false);
      setExecution(null);
      setStarted({ jobId: response.jobId, executionId: response.executionId });
      setActiveGuidanceSession({
        jobId: response.jobId,
        executionId: response.executionId,
        runtimeId,
        destinationId: facility.location.endpoint.endpointId,
        destinationName: facility.name,
        guidanceKind: "LOCATION_GUIDANCE",
        startStatus: "ACCEPTED",
      });
    } catch (error) {
      setMessage(errorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  const status = ready ? "Sẵn sàng" : "Chưa sẵn sàng";
  const fallbackReal = realRuntimes.length
    ? realRuntimes
    : [{ id: "real", displayName: "Robot thật", kind: "REAL" } as RobotRuntime];

  return (
    <View
      style={[
        styles.screen,
        { paddingBottom: Math.max(insets.bottom, spacing.sm) },
      ]}
    >
      <AppHeader
        title="Dẫn đường đến khu vực"
        subtitle="Robot thật • vị trí và lộ trình trực tiếp"
        onBack={onBack}
      />
      <ScrollView
        contentContainerStyle={[
          styles.content,
          !isCompactWidth && styles.contentWide,
        ]}
      >
        {/* Destination Card */}
        <View style={styles.card}>
          <MapPin size={19} color={colors.primary} />
          <View style={styles.details}>
            <AppText variant="subtitle">
              {facility?.name ?? "Đang tải khu vực…"}
            </AppText>
            <AppText variant="caption" color={colors.subtext}>
              {facility?.location.mapName}
            </AppText>
          </View>
          <AppText
            variant="caption"
            color={ready ? colors.success : colors.warning}
          >
            {status}
          </AppText>
        </View>

        {/* Runtime Selector */}
        <View style={styles.runtimeRow}>
          <AppText variant="caption" color={colors.subtext}>
            ROBOT THẬT
          </AppText>
          <View style={styles.runtimeChoices}>
            {fallbackReal.map((item) => (
              <Pressable
                key={item.id}
                disabled={Boolean(started)}
                onPress={() => {
                  setRuntimeId(item.id);
                  setArmLeaseId(null);
                }}
                style={[
                  styles.runtimeChoice,
                  runtimeId === item.id && styles.runtimeChoiceSelected,
                ]}
              >
                <AppText
                  variant="caption"
                  color={runtimeId === item.id ? "#fff" : colors.textSecondary}
                >
                  {item.displayName}
                </AppText>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Live Gazebo Map */}
        {destination ? (
          <GazeboMap2D
            robot={runtime?.telemetry?.pose ?? null}
            robotConnected={Boolean(runtime?.connected && !runtime.stale)}
            runtimeLabel="REAL"
            destination={{
              x: destination.x,
              y: destination.y,
              yaw: destination.theta,
            }}
            destinationLabel={facility?.name ?? "Địa điểm"}
            mapEndpoints={mapEndpoints}
            mapZones={mapZones}
            selectedEndpointId={destination.endpointId}
            path={runtime?.telemetry?.plannedPath ?? []}
            mapMetadata={mapMetadata ?? undefined}
            testID="facility-guidance-map"
          />
        ) : null}

        {mapError ? (
          <AppText variant="caption" color={colors.danger}>
            {mapError}
          </AppText>
        ) : null}

        {message || facilityError ? (
          <View style={styles.error}>
            <AppText variant="body" color={colors.danger}>
              {message ?? errorMessage(facilityError)}
            </AppText>
          </View>
        ) : null}

        {/* Actions before Start */}
        {!started ? (
          <>
            <Pressable
              disabled={busy || !ready || Boolean(armLeaseId)}
              onPress={arm}
              style={[
                styles.arm,
                (busy || !ready || Boolean(armLeaseId)) && styles.disabled,
              ]}
            >
              {busy ? (
                <ActivityIndicator color={colors.primary} />
              ) : (
                <Shield size={17} color={colors.primary} />
              )}
              <AppText variant="subtitle" color={colors.primary}>
                {armLeaseId ? "Robot đã ARM" : "ARM robot thật"}
              </AppText>
            </Pressable>

            <Pressable
              disabled={
                busy || facilityLoading || !hasDestination || !ready || !armLeaseId
              }
              onPress={start}
              style={[
                styles.primary,
                (busy ||
                  facilityLoading ||
                  !hasDestination ||
                  !ready ||
                  !armLeaseId) &&
                  styles.disabled,
              ]}
            >
              {busy ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Zap size={17} color="#fff" fill="#fff" />
              )}
              <AppText variant="subtitle" color="#fff">
                Dẫn đường đến đây
              </AppText>
            </Pressable>
          </>
        ) : (
          <View style={styles.workflow}>
            <Radio size={18} color={failed ? colors.danger : colors.primary} />
            <View style={styles.details}>
              <AppText variant="subtitle">
                {execution?.status?.toLowerCase() === "completed"
                  ? "Đã đến khu vực"
                  : failed
                    ? "Workflow thất bại"
                    : "Robot đang dẫn đường"}
              </AppText>
              <AppText variant="caption" color={colors.subtext}>
                {execution?.currentStep ?? "Đang chuẩn bị workflow"} ·{" "}
                {realtimeConnected ? "Realtime" : "Polling"}
              </AppText>
              {failureDetails ? (
                <AppText variant="caption" color={colors.danger}>
                  {failureDetails}
                </AppText>
              ) : null}
            </View>
            {execution?.status?.toLowerCase() === "completed" ? (
              <CheckCircle2 size={22} color={colors.success} />
            ) : null}
          </View>
        )}

        {started && (arrived || terminal) ? (
          <Pressable
            onPress={() => onGoToFeedback(started.jobId)}
            style={styles.primary}
          >
            <CheckCircle2 size={17} color="#fff" />
            <AppText variant="subtitle" color="#fff">
              Đánh giá chuyến đi
            </AppText>
          </Pressable>
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
    padding: spacing.md,
    gap: spacing.sm,
    width: "100%",
    maxWidth: 840,
    alignSelf: "center",
  },
  contentWide: {
    paddingHorizontal: spacing.lg,
  },
  card: {
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm + 2,
  },
  details: {
    flex: 1,
    gap: 3,
  },
  runtimeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  runtimeChoices: {
    flexDirection: "row",
    gap: spacing.xs + 3,
  },
  runtimeChoice: {
    minHeight: 40,
    paddingHorizontal: spacing.sm + 3,
    justifyContent: "center",
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  runtimeChoiceSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  arm: {
    minHeight: 48,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: spacing.sm,
  },
  primary: {
    minHeight: 52,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  disabled: {
    opacity: 0.47,
  },
  workflow: {
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.primarySoft,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm + 2,
  },
  error: {
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: "#fff1f2",
  },
});
