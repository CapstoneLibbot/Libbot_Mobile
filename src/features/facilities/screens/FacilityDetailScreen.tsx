import React from "react";
import { StyleSheet, View } from "react-native";
import { BookOpen, Bot, MapPin } from "lucide-react-native";
import { useKioskStore } from "@/core/state";
import {
  AppButton,
  AppCard,
  AppEmptyState,
  AppErrorState,
  AppHeader,
  AppLoading,
  AppText,
  StatusBadge,
} from "@/shared/ui";
import { useResponsiveLayout } from "@/shared/layout";
import { colors, radius, shadows, spacing } from "@/shared/theme";
import { GazeboMap2D } from "@/features/guidance/components/GazeboMap2D";
import { useRobotRuntimeTelemetry } from "@/features/guidance/hooks/useRobotRuntimeTelemetry";
import { useRobotMapOverlays } from "@/features/guidance/hooks/useRobotMapOverlays";
import { useFacility } from "../hooks/useFacility";

export interface FacilityDetailScreenProps {
  facilityId: string;
  bookTitle?: string;
  locationLabel?: string;
  onBack: () => void;
  onStartGuidance: (facilityId: string) => void;
}

export function FacilityDetailScreen({
  facilityId,
  bookTitle,
  locationLabel,
  onBack,
  onStartGuidance,
}: FacilityDetailScreenProps): React.ReactElement {
  const { insets, isCompactWidth, width, height, isTablet } =
    useResponsiveLayout();
  const recordInteraction = useKioskStore((state) => state.recordInteraction);
  const {
    data: facility,
    isLoading,
    isError,
    error,
    refetch,
  } = useFacility(facilityId);
  const { runtime } = useRobotRuntimeTelemetry("real");
  const {
    mapMetadata,
    mapEndpoints,
    mapZones,
    mapError,
    endpointsError,
    zonesError,
  } = useRobotMapOverlays(facility?.location.endpoint.endpointId);

  const isLandscape = width > height;
  const isTwoColumn = Boolean(isTablet || (!isCompactWidth && isLandscape));
  const robotConnected = Boolean(runtime?.connected && !runtime.stale);

  if (isLoading) {
    return (
      <View style={styles.container}>
        <AppHeader title="Sơ đồ khu vực" onBack={onBack} />
        <AppLoading message="Đang tải sơ đồ khu vực & vị trí..." />
      </View>
    );
  }

  if (isError || !facility) {
    return (
      <View style={styles.container}>
        <AppHeader title="Sơ đồ khu vực" onBack={onBack} />
        {isError ? (
          <AppErrorState
            title="Không thể tải khu vực"
            message={error?.message ?? "Đã xảy ra lỗi khi tải dữ liệu sơ đồ."}
            onRetry={refetch}
          />
        ) : (
          <AppEmptyState
            title="Không tìm thấy khu vực"
            message="Khu vực hoặc kệ sách không còn tồn tại trên hệ thống."
            actionTitle="Quay lại"
            onAction={onBack}
          />
        )}
      </View>
    );
  }

  const destination = facility.location.endpoint;
  const canStartGuidance =
    facility.actions.length === 0 ||
    facility.actions.includes("START_GUIDANCE");
  const displayLabel = locationLabel || facility.name;
  const headerSubtitle = bookTitle
    ? `${bookTitle} • ${facility.location.mapName}`
    : facility.location.mapName;

  return (
    <View style={styles.container}>
      <AppHeader
        title={facility.name}
        subtitle={headerSubtitle}
        onBack={onBack}
        backLabel="Quay lại"
      />

      <View
        style={[
          styles.main,
          isTwoColumn ? styles.mainRow : styles.mainCol,
          {
            paddingLeft: Math.max(insets.left, spacing.md),
            paddingRight: Math.max(insets.right, spacing.md),
            paddingBottom: Math.max(insets.bottom, spacing.md),
          },
        ]}
      >
        {/* BIG HERO MAP */}
        <View style={styles.mapContainer}>
          <GazeboMap2D
            robot={runtime?.telemetry?.pose ?? null}
            robotConnected={robotConnected}
            runtimeLabel="REAL"
            destination={
              destination
                ? {
                    x: destination.x,
                    y: destination.y,
                    yaw: destination.theta,
                  }
                : null
            }
            destinationLabel={displayLabel}
            mapEndpoints={mapEndpoints}
            mapZones={mapZones}
            selectedEndpointId={destination?.endpointId}
            mapMetadata={mapMetadata ?? undefined}
            path={runtime?.telemetry?.plannedPath ?? []}
            fillContainer
            cropToContent
            showMapTag
            showScaleBar
            testID="facility-map"
          />

          {/* Floating error notice if any map data fails */}
          {mapError || endpointsError || zonesError ? (
            <View style={styles.mapAlert}>
              <AppText variant="caption" color={colors.danger}>
                {mapError || endpointsError || zonesError}
              </AppText>
            </View>
          ) : null}
        </View>

        {/* INFO & ACTIONS PANEL */}
        <View
          style={[
            styles.infoPanel,
            isTwoColumn ? styles.infoPanelSide : styles.infoPanelBottom,
          ]}
        >
          <AppCard style={styles.infoCard} padding="normal">
            <View style={styles.cardHeaderRow}>
              <StatusBadge
                label={
                  facility.type === "READING_ROOM"
                    ? "Phòng đọc"
                    : "Khu vực kệ sách"
                }
                tone="info"
              />
              <View style={styles.robotStatusChip}>
                <Bot
                  size={13}
                  color={robotConnected ? colors.success : colors.subtext}
                />
                <View
                  style={[
                    styles.statusDot,
                    robotConnected ? styles.dotGreen : styles.dotMuted,
                  ]}
                />
                <AppText
                  variant="caption"
                  color={robotConnected ? colors.success : colors.textSecondary}
                  style={styles.robotText}
                >
                  {robotConnected ? "LiBot sẵn sàng" : "Chờ kết nối"}
                </AppText>
              </View>
            </View>

            <AppText variant="title" style={styles.name} numberOfLines={2}>
              {facility.name}
            </AppText>

            {bookTitle ? (
              <View style={styles.metaRow}>
                <BookOpen size={15} color={colors.primary} />
                <AppText
                  variant="body"
                  color={colors.primaryDark}
                  numberOfLines={1}
                  style={styles.metaText}
                >
                  {bookTitle}
                </AppText>
              </View>
            ) : null}

            {locationLabel ? (
              <View style={styles.metaRow}>
                <MapPin size={15} color={colors.textSecondary} />
                <AppText
                  variant="caption"
                  color={colors.textSecondary}
                  numberOfLines={1}
                  style={styles.metaText}
                >
                  Vị trí: {locationLabel}
                </AppText>
              </View>
            ) : null}

            {facility.description ? (
              <AppText
                variant="body"
                color={colors.textSecondary}
                numberOfLines={3}
                style={styles.descText}
              >
                {facility.description}
              </AppText>
            ) : null}

            <AppText variant="caption" color={colors.subtext}>
              Bản đồ: {facility.location.mapName}
            </AppText>
          </AppCard>

          {canStartGuidance ? (
            <AppButton
              title="Dẫn đường đến đây"
              size="lg"
              onPress={() => {
                recordInteraction();
                onStartGuidance(facility.id);
              }}
              style={styles.guideButton}
            />
          ) : null}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  main: {
    flex: 1,
    paddingTop: spacing.sm,
    gap: spacing.md,
  },
  mainRow: {
    flexDirection: "row",
    alignItems: "stretch",
  },
  mainCol: {
    flexDirection: "column",
  },
  mapContainer: {
    flex: 1,
    minHeight: 280,
    borderRadius: radius.lg,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.borderLight,
    backgroundColor: "#f8fafc",
    position: "relative",
    ...shadows.card,
  },
  mapAlert: {
    position: "absolute",
    bottom: spacing.sm,
    left: spacing.sm,
    right: spacing.sm,
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  infoPanel: {
    gap: spacing.md,
  },
  infoPanelSide: {
    width: 320,
    justifyContent: "space-between",
  },
  infoPanelBottom: {
    width: "100%",
  },
  infoCard: {
    gap: spacing.xs + 2,
  },
  cardHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.xs,
  },
  name: {
    fontWeight: "800",
    color: colors.text,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  metaText: {
    flex: 1,
    fontWeight: "600",
  },
  descText: {
    lineHeight: 20,
  },
  robotStatusChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  dotGreen: {
    backgroundColor: colors.success,
  },
  dotMuted: {
    backgroundColor: colors.subtext,
  },
  robotText: {
    fontSize: 11,
    fontWeight: "600",
  },
  guideButton: {
    minHeight: 48,
  },
});
