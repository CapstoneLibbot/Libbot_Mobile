import React from "react";
import { ScrollView, StyleSheet, View } from "react-native";
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
import { colors, spacing } from "@/shared/theme";
import { useBookDetail } from "@/features/catalog/hooks/useBookDetail";
import { hasNavigationEndpoint } from "@/features/guidance/api/bookGuidance.api";
import { GazeboMap2D } from "@/features/guidance/components/GazeboMap2D";
import { useRobotRuntimeTelemetry } from "@/features/guidance/hooks/useRobotRuntimeTelemetry";
import type { RobotPose } from "@/features/guidance/types/guidance.types";
import { useFacility } from "../hooks/useFacility";

export interface FacilityDetailScreenProps {
  facilityId: string;
  bookId?: string;
  bookItemId?: string;
  onBack: () => void;
}

export function FacilityDetailScreen({
  facilityId,
  bookId,
  bookItemId,
  onBack,
}: FacilityDetailScreenProps): React.ReactElement {
  const { insets, isCompactWidth, isExpandedWidth, tokens } =
    useResponsiveLayout();
  const isExpanded = isExpandedWidth;

  const recordInteraction = useKioskStore((state) => state.recordInteraction);
  const activeGuidanceSession = useKioskStore((state) => state.activeGuidanceSession);
  const runtimeId = activeGuidanceSession?.runtimeId ?? "sim";
  const { runtime, realtimeConnected } = useRobotRuntimeTelemetry(runtimeId);
  const { data: book, isLoading: bookLoading, isError: bookError } = useBookDetail(bookId ?? "");
  const selectedCopy = book?.copies?.find((copy) => copy.id === bookItemId) ?? null;
  const destination: RobotPose | null = hasNavigationEndpoint(selectedCopy?.endpoint)
    ? { x: selectedCopy.endpoint.x, y: selectedCopy.endpoint.y, yaw: selectedCopy.endpoint.theta }
    : null;
  const robotPose = runtime?.telemetry?.pose ?? null;
  const plannedPath = runtime?.telemetry?.plannedPath ?? [];

  const {
    data: facility,
    isLoading,
    isError,
    error,
    refetch,
  } = useFacility(facilityId ?? "");

  if (isLoading) {
    return (
      <View style={styles.container}>
        <AppHeader title="Sơ đồ khu vực" onBack={onBack} />
        <AppLoading message="Đang tải thông tin khu vực thư viện..." />
      </View>
    );
  }

  if (isError || !facility) {
    return (
      <View style={styles.container}>
        <AppHeader title="Sơ đồ khu vực" onBack={onBack} />
        {isError ? (
          <AppErrorState
            title="Lỗi tải sơ đồ khu vực"
            message={error?.message ?? "Không thể tải thông tin khu vực."}
            onRetry={() => refetch()}
          />
        ) : (
          <AppEmptyState
            title="Không tìm thấy khu vực"
            message="Mã khu vực hoặc kệ sách không tồn tại."
            actionTitle="Quay lại"
            onAction={onBack}
          />
        )}
      </View>
    );
  }

  const renderMapCard = () => (
    <AppCard
      style={styles.card}
      padding={isCompactWidth ? "compact" : "normal"}
    >
      <View style={styles.mapHeaderRow}>
        <AppText variant="heading">Sơ đồ vị trí trực quan</AppText>
        <AppText variant="caption" color={colors.subtext}>
          Tầng {facility.floor} · Gazebo 2D
        </AppText>
      </View>
      <GazeboMap2D
        robot={robotPose}
        robotConnected={Boolean(runtime?.connected && !runtime.stale)}
        runtimeLabel={runtime?.kind === "REAL" ? "REAL" : "SIM"}
        destination={destination}
        destinationLabel={selectedCopy?.shelf ?? selectedCopy?.barcode ?? facility.shelfCode ?? "Vị trí sách"}
        path={plannedPath}
        testID="facility-gazebo-map"
      />
      <View style={styles.legendRow}>
        <View style={styles.legendItem}>
          <View
            style={[styles.legendDot, { backgroundColor: "#ea580c" }]}
          />
          <AppText variant="caption">Vị trí bản sao sách</AppText>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: "#0284c7" }]} />
          <AppText variant="caption">{robotPose ? "LiBot realtime" : "Chưa có pose LiBot"}</AppText>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: "#2563eb" }]} />
          <AppText variant="caption">{plannedPath.length > 1 ? "Lộ trình Nav2" : "Đang chờ plannedPath"}</AppText>
        </View>
      </View>
      {bookLoading && <AppText variant="caption" color={colors.subtext}>Đang tải tọa độ bản sao…</AppText>}
      {bookId && !bookLoading && (bookError || !destination) && (
        <View style={styles.mapHint}>
          <AppText variant="caption" color={colors.textSecondary}>
            {bookError ? "Không tải được vị trí sách từ BE." : "Bản sao chưa có endpoint Gazebo; bản đồ không đặt điểm đích giả."}
          </AppText>
        </View>
      )}
      {!bookId && (
        <AppText variant="caption" color={colors.subtext}>
          Mở bản đồ từ chi tiết sách để hiển thị đúng vị trí bản sao đã chọn.
        </AppText>
      )}
      <AppText variant="caption" color={colors.subtext} style={styles.mapCaption}>
        {realtimeConnected ? "Realtime SignalR" : "Đang cập nhật bằng REST polling"} · cùng tọa độ và tỷ lệ với FE
      </AppText>
    </AppCard>
  );

  return (
    <View style={styles.container}>
      <AppHeader
        title={facility.name}
        subtitle={`Tầng ${facility.floor} • ${facility.type}`}
        onBack={() => {
          recordInteraction();
          onBack();
        }}
        backLabel="Quay lại"
      />

      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={[
          styles.contentContainer,
          {
            paddingLeft: Math.max(insets.left, tokens.pagePaddingHorizontal),
            paddingRight: Math.max(insets.right, tokens.pagePaddingHorizontal),
            paddingBottom: Math.max(insets.bottom + spacing.xl, spacing.xxl),
            gap: tokens.contentGap,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {isExpanded ? (
          /* Expanded Tablet Layout: 2 Columns */
          <View style={styles.columnsWrapperExpanded}>
            <View style={styles.leftColumnExpanded}>
              <AppCard style={styles.card}>
                <View style={styles.badgeRow}>
                  <StatusBadge label={facility.type} tone="info" />
                  <StatusBadge
                    label={`Tầng ${facility.floor}`}
                    tone="neutral"
                  />
                  {facility.shelfCode ? (
                    <StatusBadge
                      label={`Mã kệ: ${facility.shelfCode}`}
                      tone="success"
                    />
                  ) : null}
                </View>

                <AppText variant="title" style={styles.facilityName}>
                  {facility.name}
                </AppText>

                <AppText
                  variant="body"
                  color={colors.textSecondary}
                  style={styles.description}
                >
                  {facility.description}
                </AppText>

                <View style={styles.infoBox}>
                  <AppText variant="subtitle" color={colors.primary}>
                    Chỉ dẫn di chuyển:
                  </AppText>
                  <AppText variant="body" color={colors.textSecondary}>
                    Khu vực này nằm tại Tầng {facility.floor}. Quý độc giả có
                    thể dùng thang máy hoặc thang bộ khu B để đến nơi.
                  </AppText>
                </View>

                <AppButton
                  title="Quay lại danh sách"
                  variant="secondary"
                  size="md"
                  onPress={() => {
                    recordInteraction();
                    onBack();
                  }}
                />
              </AppCard>
            </View>

            <View style={styles.rightColumnExpanded}>{renderMapCard()}</View>
          </View>
        ) : (
          /* Compact/Medium Mobile Layout: Single Ordered Column */
          <View style={styles.columnsWrapperCompact}>
            <AppCard
              style={styles.card}
              padding={isCompactWidth ? "compact" : "normal"}
            >
              <View style={styles.badgeRow}>
                <StatusBadge label={facility.type} tone="info" />
                <StatusBadge label={`Tầng ${facility.floor}`} tone="neutral" />
                {facility.shelfCode ? (
                  <StatusBadge
                    label={`Mã kệ: ${facility.shelfCode}`}
                    tone="success"
                  />
                ) : null}
              </View>

              <AppText variant="title" style={styles.facilityName}>
                {facility.name}
              </AppText>

              <AppText
                variant="body"
                color={colors.textSecondary}
                style={styles.description}
              >
                {facility.description}
              </AppText>

              <View style={styles.infoBox}>
                <AppText variant="subtitle" color={colors.primary}>
                  Chỉ dẫn di chuyển:
                </AppText>
                <AppText variant="body" color={colors.textSecondary}>
                  Khu vực này nằm tại Tầng {facility.floor}. Quý độc giả có thể
                  dùng thang máy hoặc thang bộ khu B để đến nơi.
                </AppText>
              </View>
            </AppCard>

            {/* Map Card */}
            {renderMapCard()}

            {/* Action button */}
            <AppButton
              title="Quay lại danh sách"
              variant="secondary"
              size="md"
              onPress={() => {
                recordInteraction();
                onBack();
              }}
            />
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollArea: {
    flex: 1,
  },
  contentContainer: {
    paddingTop: spacing.md,
  },
  columnsWrapperExpanded: {
    flexDirection: "row",
    gap: spacing.xl,
    alignItems: "flex-start",
  },
  columnsWrapperCompact: {
    flexDirection: "column",
    gap: spacing.md,
  },
  leftColumnExpanded: {
    flex: 2,
  },
  rightColumnExpanded: {
    flex: 3,
  },
  card: {
    gap: spacing.sm,
  },
  badgeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
    alignItems: "center",
  },
  facilityName: {
    fontWeight: "800",
    marginTop: 2,
  },
  description: {
    lineHeight: 22,
  },
  infoBox: {
    backgroundColor: colors.surfaceAlt,
    padding: spacing.md,
    borderRadius: 12,
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  mapHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
  },
  mapCaption: { textAlign: "right" },
  mapHint: { backgroundColor: "#f8fafc", borderRadius: 10, padding: spacing.sm },
  legendRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
    paddingTop: spacing.xs,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
});
