import React from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { useKioskStore } from "@/core/state";
import { AppButton, AppCard, AppEmptyState, AppErrorState, AppHeader, AppLoading, AppText, StatusBadge } from "@/shared/ui";
import { useResponsiveLayout } from "@/shared/layout";
import { colors, spacing } from "@/shared/theme";
import { GazeboMap2D } from "@/features/guidance/components/GazeboMap2D";
import { useRobotRuntimeTelemetry } from "@/features/guidance/hooks/useRobotRuntimeTelemetry";
import { useRobotMapOverlays } from "@/features/guidance/hooks/useRobotMapOverlays";
import { useFacility } from "../hooks/useFacility";

export interface FacilityDetailScreenProps { facilityId: string; onBack: () => void; onStartGuidance: (facilityId: string) => void; }

export function FacilityDetailScreen({ facilityId, onBack, onStartGuidance }: FacilityDetailScreenProps): React.ReactElement {
  const { insets, isCompactWidth, tokens } = useResponsiveLayout();
  const recordInteraction = useKioskStore((state) => state.recordInteraction);
  const { data: facility, isLoading, isError, error, refetch } = useFacility(facilityId);
  const { runtime } = useRobotRuntimeTelemetry("real");
  const { mapMetadata, mapEndpoints, mapZones, mapError, endpointsError, zonesError } = useRobotMapOverlays(facility?.location.endpoint.endpointId, facility?.location.mapId);
  if (isLoading) return <View style={styles.container}><AppHeader title="Khu vực" onBack={onBack} /><AppLoading message="Đang tải thông tin khu vực..." /></View>;
  if (isError || !facility) return <View style={styles.container}><AppHeader title="Khu vực" onBack={onBack} />{isError ? <AppErrorState title="Không thể tải khu vực" message={error?.message ?? "Đã xảy ra lỗi."} onRetry={refetch} /> : <AppEmptyState title="Không tìm thấy khu vực" message="Khu vực không còn tồn tại." actionTitle="Quay lại" onAction={onBack} />}</View>;
  const canViewLocation = facility.actions.includes("VIEW_LOCATION");
  const canStartGuidance = facility.actions.includes("START_GUIDANCE");
  const destination = facility.location.endpoint;
  return <View style={styles.container}>
    <AppHeader title={facility.name} subtitle={facility.location.mapName} onBack={onBack} backLabel="Quay lại" />
    <ScrollView contentContainerStyle={[styles.content, { paddingLeft: Math.max(insets.left, tokens.pagePaddingHorizontal), paddingRight: Math.max(insets.right, tokens.pagePaddingHorizontal), paddingBottom: Math.max(insets.bottom + spacing.xl, spacing.xxl) }]}>
      <AppCard style={styles.card} padding={isCompactWidth ? "compact" : "normal"}>
        <StatusBadge label={facility.type === "READING_ROOM" ? "Phòng đọc" : "Khu vực"} tone="info" />
        <AppText variant="title" style={styles.name}>{facility.name}</AppText>
        {facility.description ? <AppText variant="body" color={colors.textSecondary}>{facility.description}</AppText> : null}
        <AppText variant="caption" color={colors.subtext}>Bản đồ: {facility.location.mapName}</AppText>
      </AppCard>
      {canViewLocation ? <AppCard style={styles.card} padding={isCompactWidth ? "compact" : "normal"}>
        <AppText variant="heading">Vị trí trên bản đồ</AppText>
        <GazeboMap2D robot={runtime?.telemetry?.pose ?? null} robotConnected={Boolean(runtime?.connected && !runtime.stale)} runtimeLabel="REAL" destination={{ x: destination.x, y: destination.y, yaw: destination.theta }} destinationLabel={facility.name} mapEndpoints={mapEndpoints} mapZones={mapZones} selectedEndpointId={destination.endpointId} mapMetadata={mapMetadata ?? undefined} path={runtime?.telemetry?.plannedPath ?? []} testID="facility-map" />
        {mapError ? <AppText variant="caption" color={colors.danger}>{mapError}</AppText> : null}
        {endpointsError ? <AppText variant="caption" color={colors.danger}>{endpointsError}</AppText> : null}
        {zonesError ? <AppText variant="caption" color={colors.danger}>{zonesError}</AppText> : null}
      </AppCard> : null}
      {canStartGuidance ? <AppButton title="Dẫn đường đến đây" size="lg" onPress={() => { recordInteraction(); onStartGuidance(facility.id); }} /> : null}
    </ScrollView>
  </View>;
}

const styles = StyleSheet.create({ container: { flex: 1, backgroundColor: colors.background }, content: { paddingTop: spacing.md, gap: spacing.md }, card: { gap: spacing.sm }, name: { fontWeight: "800" } });
