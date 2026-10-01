import { router, useLocalSearchParams } from 'expo-router';
import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useKioskStore } from '../../../core/store/kioskStore';
import {
  AppButton,
  AppCard,
  AppEmptyState,
  AppErrorState,
  AppHeader,
  AppLoading,
  AppText,
  IndoorMap,
  StatusBadge,
} from '../../../shared/components';
import { useResponsiveLayout } from '../../../shared/hooks/useResponsiveLayout';
import { colors, spacing } from '../../../shared/theme';
import { GuidanceDemoSwitcher } from '../components/GuidanceDemoSwitcher';
import { useGuidanceDemoViewModel } from '../hooks/useGuidanceDemoViewModel';
import { useGuidanceMission } from '../hooks/useGuidanceMission';

export function GuidanceScreen(): React.ReactElement {
  const { insets, isCompactWidth, isExpandedWidth, tokens } = useResponsiveLayout();
  const isExpanded = isExpandedWidth;

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

  // Demo view-model managing local presentation states (navigating, replanning, arrived, cancelled)
  const {
    demoState,
    routeRevision,
    mapVersion,
    currentPose,
    destinationPose,
    path,
    progress,
    statusLabel,
    statusTone,
    instructionTitle,
    instructionMessage,
    isReplanning,
    isArrived,
    isCancelled,
    isNavigating,
    setDemoState,
    cancelLocalMission,
    completeLocalMission,
  } = useGuidanceDemoViewModel(mission);

  // Demo local action handlers - no real backend calls
  const handleLocalCancel = () => {
    recordInteraction();
    cancelLocalMission();
    setActiveMissionId(null);
  };

  const handleLocalComplete = () => {
    recordInteraction();
    completeLocalMission();
  };

  const handleGoToFeedback = () => {
    recordInteraction();
    router.push(`/(kiosk)/feedback/${missionId}`);
  };

  const handleBackToSearch = () => {
    recordInteraction();
    router.replace('/(kiosk)/search');
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
        <AppHeader
          title="Hành trình dẫn đường"
          onBack={() => router.replace('/(kiosk)/search')}
        />
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

  // Live Status & Target Shelf Header Summary
  const renderLiveStatusSummary = () => (
    <AppCard
      style={styles.card}
      padding={isCompactWidth ? 'compact' : 'normal'}
    >
      <View style={styles.statusRow}>
        <StatusBadge
          label={statusLabel}
          tone={statusTone}
          size="md"
        />
        <AppText variant="subtitle" color={colors.primaryDark} style={styles.progressPercent}>
          {progress}%
        </AppText>
      </View>

      <View style={styles.progressBarTrack}>
        <View
          style={[
            styles.progressBarFill,
            {
              width: `${Math.min(Math.max(progress, 5), 100)}%`,
              backgroundColor:
                isArrived
                  ? colors.success
                  : isCancelled
                    ? colors.danger
                    : isReplanning
                      ? colors.warning
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
            <AppText variant="caption" color={colors.subtext}>
              Kệ sách đích
            </AppText>
            <AppText variant="heading" color={colors.destination}>
              {mission.shelf ?? 'A-12'}
            </AppText>
          </View>
          <View style={styles.inlineItem}>
            <AppText variant="caption" color={colors.subtext}>
              Robot phụ trách
            </AppText>
            <AppText variant="subtitle">{mission.robotId}</AppText>
          </View>
          <View style={styles.inlineItem}>
            <AppText variant="caption" color={colors.subtext}>
              Lộ trình
            </AppText>
            <AppText variant="subtitle" color={colors.textSecondary}>
              #{routeRevision}
            </AppText>
          </View>
        </View>
      </View>
    </AppCard>
  );

  // Guidance Safety Instruction & Action Buttons
  const renderInstructionAndActions = () => (
    <AppCard
      style={styles.card}
      padding={isCompactWidth ? 'compact' : 'normal'}
    >
      <View
        style={[
          styles.instructionBoxBase,
          isNavigating && styles.instructionBoxNavigating,
          isReplanning && styles.instructionBoxReplanning,
          isArrived && styles.instructionBoxArrived,
          isCancelled && styles.instructionBoxCancelled,
        ]}
      >
        <AppText
          variant="subtitle"
          color={
            isArrived
              ? colors.success
              : isCancelled
                ? colors.danger
                : isReplanning
                  ? colors.warning
                  : colors.primary
          }
        >
          {instructionTitle}
        </AppText>
        <AppText variant="body" color={colors.textSecondary}>
          {instructionMessage}
        </AppText>
      </View>

      <View style={styles.actions}>
        {(isNavigating || isReplanning) && (
          <>
            <AppButton
              title="Mô phỏng: LiBot đã đến nơi"
              variant="success"
              size="lg"
              onPress={handleLocalComplete}
            />
            <AppButton
              title="Hủy hành trình"
              variant="danger"
              size="md"
              onPress={handleLocalCancel}
            />
          </>
        )}

        {isArrived && (
          <AppButton
            title="Đánh giá dịch vụ LiBot →"
            variant="primary"
            size="lg"
            onPress={handleGoToFeedback}
          />
        )}

        {isCancelled && (
          <AppButton
            title="Quay lại danh sách tra cứu"
            variant="primary"
            size="lg"
            onPress={handleBackToSearch}
          />
        )}
      </View>
    </AppCard>
  );

  return (
    <View style={styles.container}>
      <AppHeader
        title={`Dẫn đường: ${mission.robotId}`}
        subtitle={`Phiên ${mission.id} • ${mapVersion}`}
        rightActionLabel={isNavigating || isReplanning ? 'Hủy' : undefined}
        onRightAction={isNavigating || isReplanning ? handleLocalCancel : undefined}
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
        {/* Reviewer Demo-Only State Switcher */}
        <GuidanceDemoSwitcher
          currentState={demoState}
          onSelectState={setDemoState}
          routeRevision={routeRevision}
        />

        {/* Responsive Layout: Expanded (>= 840dp) two-column vs Compact (< 840dp) mobile-first sequence */}
        {isExpanded ? (
          <View style={styles.columnsWrapperExpanded}>
            {/* Left priority column: Indoor Map (>= 840dp) */}
            <View style={styles.leftMapColumnExpanded}>
              <AppCard style={styles.mapCard}>
                <View style={styles.mapHeaderRow}>
                  <AppText variant="heading">Sơ đồ di chuyển trong nhà</AppText>
                  <AppText variant="caption" color={colors.subtext}>
                    Tỷ lệ 13.9 × 9.9 m | Tầng 1
                  </AppText>
                </View>
                <IndoorMap
                  mapVersion={mapVersion}
                  robotPose={currentPose}
                  destinationPose={destinationPose}
                  path={path}
                  missionStatus={demoState}
                  routeRevision={routeRevision}
                  showLegend={true}
                  style={styles.indoorMapExpanded}
                />
              </AppCard>
            </View>

            {/* Right column: Status, book details, instructions, CTAs */}
            <View style={styles.rightPanelColumnExpanded}>
              {renderLiveStatusSummary()}
              {renderInstructionAndActions()}
            </View>
          </View>
        ) : (
          /* Compact/Medium (< 840dp) Mobile Hierarchy:
             1. Live Status & Target Shelf
             2. Indoor Map
             3. Safety Guidance & Actions */
          <View style={styles.columnsWrapperCompact}>
            {/* 1. Live status & Destination Banner */}
            {renderLiveStatusSummary()}

            {/* 2. Indoor Map with flexible height */}
            <AppCard
              style={styles.mapCard}
              padding={isCompactWidth ? 'compact' : 'normal'}
            >
              <View style={styles.mapHeaderRow}>
                <AppText variant="heading">Sơ đồ di chuyển trong nhà</AppText>
                <AppText variant="caption" color={colors.subtext}>
                  Tầng 1 ({mapVersion})
                </AppText>
              </View>
              <IndoorMap
                mapVersion={mapVersion}
                robotPose={currentPose}
                destinationPose={destinationPose}
                path={path}
                missionStatus={demoState}
                routeRevision={routeRevision}
                showLegend={true}
                style={[
                  styles.indoorMapCompact,
                  isCompactWidth && styles.indoorMapPhone,
                ]}
              />
            </AppCard>

            {/* 3. Guidance Instructions & Action CTAs */}
            {renderInstructionAndActions()}
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
    flexDirection: 'row',
    gap: spacing.xl,
    alignItems: 'flex-start',
  },
  columnsWrapperCompact: {
    flexDirection: 'column',
    gap: spacing.md,
  },
  leftMapColumnExpanded: {
    flex: 3,
  },
  rightPanelColumnExpanded: {
    flex: 2,
    gap: spacing.lg,
  },
  mapCard: {
    gap: spacing.sm,
  },
  mapHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  indoorMapExpanded: {
    minHeight: 440,
  },
  indoorMapCompact: {
    minHeight: 260,
  },
  indoorMapPhone: {
    minHeight: 230,
    maxHeight: 280,
  },
  card: {
    gap: spacing.sm,
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
    height: 10,
    backgroundColor: colors.surfaceAlt,
    borderRadius: 5,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 5,
  },
  missionDetailsBox: {
    backgroundColor: colors.surfaceAlt,
    padding: spacing.md,
    borderRadius: 12,
    gap: spacing.xs,
  },
  inlineInfoRow: {
    flexDirection: 'row',
    marginTop: spacing.xs,
    gap: spacing.lg,
  },
  inlineItem: {
    gap: 2,
  },
  instructionBoxBase: {
    padding: spacing.md,
    borderRadius: 10,
    gap: 4,
  },
  instructionBoxNavigating: {
    backgroundColor: colors.primarySoft,
  },
  instructionBoxReplanning: {
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  instructionBoxArrived: {
    backgroundColor: colors.successSoft,
  },
  instructionBoxCancelled: {
    backgroundColor: colors.dangerSoft,
  },
  actions: {
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
});
