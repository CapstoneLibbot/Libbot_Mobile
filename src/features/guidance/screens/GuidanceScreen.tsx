import { router, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useKioskStore } from '../../../core/store/kioskStore';
import { guidanceRepository } from '../../../infrastructure/repositories/guidance.repository';
import {
  AppButton,
  AppCard,
  AppEmptyState,
  AppErrorState,
  AppHeader,
  AppLoading,
  AppText,
  MobileMap,
  StatusBadge,
  StatusTone,
} from '../../../shared/components';
import { useResponsiveLayout } from '../../../shared/hooks/useResponsiveLayout';
import { colors, spacing } from '../../../shared/theme';
import { useGuidanceMission } from '../hooks/useGuidanceMission';
import { GuidanceMissionStatus } from '../types/guidance.types';

export function GuidanceScreen(): React.ReactElement {
  const { isTablet, insets } = useResponsiveLayout();
  const { missionId } = useLocalSearchParams<{ missionId: string }>();
  const recordInteraction = useKioskStore((state) => state.recordInteraction);
  const setActiveMissionId = useKioskStore((state) => state.setActiveMissionId);

  const {
    data: mission,
    isLoading,
    isError,
    error,
    refetch,
  } = useGuidanceMission(missionId ?? '');

  const [isProcessing, setIsProcessing] = useState(false);

  const getStatusTone = (status: GuidanceMissionStatus): StatusTone => {
    switch (status) {
      case 'completed':
        return 'success';
      case 'active':
        return 'info';
      case 'creating':
        return 'warning';
      case 'cancelled':
      case 'failed':
        return 'danger';
      default:
        return 'neutral';
    }
  };

  const getStatusLabel = (status: GuidanceMissionStatus): string => {
    switch (status) {
      case 'creating':
        return 'Đang khởi tạo tuyến đi...';
      case 'active':
        return 'Đang dẫn đường đến kệ sách';
      case 'completed':
        return 'Đã đến đích thành công';
      case 'cancelled':
        return 'Chuyến đi đã bị hủy';
      case 'failed':
        return 'Gặp sự cố trên đường đi';
      default:
        return status;
    }
  };

  const handleSimulateComplete = async () => {
    if (!missionId) return;
    recordInteraction();
    setIsProcessing(true);
    try {
      await guidanceRepository.completeMission(missionId);
      await refetch();
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCancelMission = async () => {
    if (!missionId) return;
    recordInteraction();
    setIsProcessing(true);
    try {
      await guidanceRepository.cancelMission(missionId);
      setActiveMissionId(null);
      await refetch();
    } finally {
      setIsProcessing(false);
    }
  };

  const handleGoToFeedback = () => {
    recordInteraction();
    router.push(`/(kiosk)/feedback/${missionId}`);
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <AppHeader title="Hành trình dẫn đường" />
        <AppLoading message="Đang kết nối hệ thống điều hướng robot..." />
      </View>
    );
  }

  if (isError || !mission) {
    return (
      <View style={styles.container}>
        <AppHeader title="Hành trình dẫn đường" onBack={() => router.replace('/(kiosk)/search')} />
        {isError ? (
          <AppErrorState
            title="Lỗi theo dõi hành trình"
            message={error?.message ?? 'Không thể tìm thấy chuyến đi.'}
            onRetry={() => refetch()}
          />
        ) : (
          <AppEmptyState
            title="Chuyến đi không tồn tại"
            message="Mã hành trình không hợp lệ hoặc đã kết thúc."
            actionTitle="Quay lại tra cứu"
            onAction={() => router.replace('/(kiosk)/search')}
          />
        )}
      </View>
    );
  }

  const mapMarkers = [
    {
      id: 'target-shelf',
      coordinate: {
        latitude: 10.7772,
        longitude: 106.7012,
      },
      title: `Kệ sách đích: ${mission.shelf ?? 'Kệ chỉ định'}`,
      description: mission.bookTitle ?? 'Sách bạn tìm kiếm',
      pinColor: colors.destination,
    },
    {
      id: 'libot-pose',
      coordinate: {
        latitude:
          mission.status === 'completed'
            ? 10.7772
            : 10.7765 + ((mission.progress || 10) / 100) * 0.0007,
        longitude:
          mission.status === 'completed'
            ? 106.7012
            : 106.7005 + ((mission.progress || 10) / 100) * 0.0007,
      },
      title: `Robot LiBot (${mission.robotId})`,
      description: `Tiến độ di chuyển: ${mission.progress}%`,
      pinColor: colors.robot,
    },
  ];

  return (
    <View style={styles.container}>
      <AppHeader
        title={`Theo dõi dẫn đường: ${mission.robotId}`}
        subtitle={`Mã phiên: ${mission.id}`}
        rightActionLabel={mission.status === 'active' ? 'Hủy dẫn đường' : undefined}
        onRightAction={mission.status === 'active' ? handleCancelMission : undefined}
      />

      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={[
          styles.contentContainer,
          {
            paddingLeft: Math.max(insets.left, spacing.xl),
            paddingRight: Math.max(insets.right, spacing.xl),
            paddingBottom: Math.max(insets.bottom, spacing.xl),
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View
          style={[
            styles.columnsWrapper,
            !isTablet && styles.columnsWrapperPhone,
          ]}
        >
          {/* Cột trái: Tiến độ và chỉ dẫn */}
          <View style={[styles.leftColumn, !isTablet && styles.columnPhone]}>
            <AppCard style={styles.card}>
              <View style={styles.statusRow}>
                <StatusBadge
                  label={getStatusLabel(mission.status)}
                  tone={getStatusTone(mission.status)}
                  size="md"
                />
                <AppText variant="subtitle" color={colors.primaryDark} style={styles.progressPercent}>
                  {mission.progress}%
                </AppText>
              </View>

              {/* Progress bar */}
              <View style={styles.progressBarTrack}>
                <View
                  style={[
                    styles.progressBarFill,
                    {
                      width: `${Math.min(Math.max(mission.progress, 5), 100)}%`,
                      backgroundColor:
                        mission.status === 'completed'
                          ? colors.success
                          : mission.status === 'cancelled' || mission.status === 'failed'
                            ? colors.danger
                            : colors.primary,
                    },
                  ]}
                />
              </View>

              <View style={styles.missionDetailsBox}>
                <AppText variant="caption" color={colors.subtext}>
                  Sách cần tìm
                </AppText>
                <AppText variant="subtitle" numberOfLines={2}>
                  {mission.bookTitle ?? 'Sách trong danh mục'}
                </AppText>

                <View style={styles.inlineInfoRow}>
                  <View style={styles.inlineItem}>
                    <AppText variant="caption" color={colors.subtext}>Kệ đích</AppText>
                    <AppText variant="heading" color={colors.primary}>
                      {mission.shelf ?? 'A-12'}
                    </AppText>
                  </View>
                  <View style={styles.inlineItem}>
                    <AppText variant="caption" color={colors.subtext}>Robot phụ trách</AppText>
                    <AppText variant="subtitle">{mission.robotId}</AppText>
                  </View>
                </View>
              </View>

              {/* Instructions based on status */}
              {mission.status === 'active' && (
                <View style={styles.instructionBox}>
                  <AppText variant="subtitle" color={colors.primary}>
                    Vui lòng đi cùng LiBot:
                  </AppText>
                  <AppText variant="body" color={colors.textSecondary}>
                    Robot đang di chuyển phía trước dẫn đường cho bạn. Xin chú ý giữ khoảng cách an toàn 1 mét.
                  </AppText>
                </View>
              )}

              {mission.status === 'completed' && (
                <View style={styles.completedBox}>
                  <AppText variant="subtitle" color={colors.success}>
                    ✓ Bạn đã đến kệ sách đích!
                  </AppText>
                  <AppText variant="body" color={colors.textSecondary}>
                    LiBot đã hoàn thành nhiệm vụ dẫn đường. Vui lòng cho biết trải nghiệm của bạn để giúp LiBot hoàn thiện hơn.
                  </AppText>
                </View>
              )}

              {(mission.status === 'cancelled' || mission.status === 'failed') && (
                <View style={styles.cancelledBox}>
                  <AppText variant="subtitle" color={colors.danger}>
                    Hành trình đã kết thúc
                  </AppText>
                  <AppText variant="body" color={colors.textSecondary}>
                    Phiên dẫn đường đã bị hủy hoặc gặp trở ngại. Bạn có thể quay lại tra cứu tựa sách khác.
                  </AppText>
                </View>
              )}

              {/* Action buttons */}
              <View style={styles.actions}>
                {mission.status === 'active' && (
                  <>
                    <AppButton
                      title="Mô phỏng: LiBot đã đến nơi"
                      variant="success"
                      size="lg"
                      loading={isProcessing}
                      onPress={handleSimulateComplete}
                    />
                    <AppButton
                      title="Hủy hành trình"
                      variant="danger"
                      size="md"
                      disabled={isProcessing}
                      onPress={handleCancelMission}
                    />
                  </>
                )}

                {mission.status === 'completed' && (
                  <AppButton
                    title="Đánh giá dịch vụ LiBot →"
                    variant="primary"
                    size="lg"
                    onPress={handleGoToFeedback}
                  />
                )}

                {(mission.status === 'cancelled' || mission.status === 'failed') && (
                  <AppButton
                    title="Quay lại danh sách tra cứu"
                    variant="primary"
                    size="lg"
                    onPress={() => {
                      recordInteraction();
                      router.replace('/(kiosk)/search');
                    }}
                  />
                )}
              </View>
            </AppCard>
          </View>

          {/* Cột phải: Bản đồ lộ trình di chuyển */}
          <View style={[styles.rightColumn, !isTablet && styles.columnPhone]}>
            <AppCard style={styles.card}>
              <AppText variant="heading">Lộ trình robot di chuyển</AppText>
              <MobileMap
                markers={mapMarkers}
                initialRegion={{
                  latitude: 10.7769,
                  longitude: 106.7009,
                  latitudeDelta: 0.003,
                  longitudeDelta: 0.003,
                }}
                style={[styles.mapView, !isTablet && styles.mapViewCompact]}
              />
              <View style={styles.mapLegend}>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: colors.robot }]} />
                  <AppText variant="caption">LiBot (Đang di chuyển)</AppText>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: colors.destination }]} />
                  <AppText variant="caption">Kệ sách đích ({mission.shelf})</AppText>
                </View>
              </View>
            </AppCard>
          </View>
        </View>
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
    padding: spacing.xl,
  },
  columnsWrapper: {
    flexDirection: 'row',
    gap: spacing.xl,
  },
  columnsWrapperPhone: {
    flexDirection: 'column',
    gap: spacing.lg,
  },
  leftColumn: {
    flex: 2,
  },
  rightColumn: {
    flex: 3,
  },
  columnPhone: {
    flex: undefined,
    width: '100%',
  },
  card: {
    gap: spacing.md,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressPercent: {
    fontWeight: '800',
  },
  progressBarTrack: {
    height: 12,
    backgroundColor: colors.surfaceAlt,
    borderRadius: 6,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 6,
  },
  missionDetailsBox: {
    backgroundColor: colors.surfaceAlt,
    padding: spacing.lg,
    borderRadius: 12,
    gap: spacing.xs,
  },
  inlineInfoRow: {
    flexDirection: 'row',
    marginTop: spacing.sm,
    gap: spacing.xl,
  },
  inlineItem: {
    gap: 2,
  },
  instructionBox: {
    backgroundColor: colors.primarySoft,
    padding: spacing.md,
    borderRadius: 10,
    gap: 4,
  },
  completedBox: {
    backgroundColor: colors.successSoft,
    padding: spacing.md,
    borderRadius: 10,
    gap: 4,
  },
  cancelledBox: {
    backgroundColor: colors.dangerSoft,
    padding: spacing.md,
    borderRadius: 10,
    gap: 4,
  },
  actions: {
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  mapView: {
    height: 380,
    borderRadius: 14,
  },
  mapViewCompact: {
    height: 240,
  },
  mapLegend: {
    flexDirection: 'row',
    gap: spacing.xl,
    paddingTop: spacing.xs,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
});
