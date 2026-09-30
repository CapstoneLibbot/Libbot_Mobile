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
  MobileMap,
  StatusBadge,
} from '../../../shared/components';
import { useResponsiveLayout } from '../../../shared/hooks/useResponsiveLayout';
import { colors, spacing } from '../../../shared/theme';
import { useFacility } from '../hooks/useFacility';

export function FacilityDetailScreen(): React.ReactElement {
  const { isTablet, insets } = useResponsiveLayout();
  const { facilityId } = useLocalSearchParams<{ facilityId: string }>();
  const recordInteraction = useKioskStore((state) => state.recordInteraction);

  const {
    data: facility,
    isLoading,
    isError,
    error,
    refetch,
  } = useFacility(facilityId ?? '');

  if (isLoading) {
    return (
      <View style={styles.container}>
        <AppHeader title="Sơ đồ khu vực" onBack={() => router.back()} />
        <AppLoading message="Đang tải thông tin khu vực thư viện..." />
      </View>
    );
  }

  if (isError || !facility) {
    return (
      <View style={styles.container}>
        <AppHeader title="Sơ đồ khu vực" onBack={() => router.back()} />
        {isError ? (
          <AppErrorState
            title="Lỗi tải sơ đồ khu vực"
            message={error?.message ?? 'Không thể tải thông tin khu vực.'}
            onRetry={() => refetch()}
          />
        ) : (
          <AppEmptyState
            title="Không tìm thấy khu vực"
            message="Mã khu vực hoặc kệ sách không tồn tại."
            actionTitle="Quay lại"
            onAction={() => router.back()}
          />
        )}
      </View>
    );
  }

  const mapMarkers = [
    {
      id: facility.id,
      coordinate: {
        latitude: facility.location.lat,
        longitude: facility.location.lng,
      },
      title: facility.name,
      description: `Tầng ${facility.floor} - ${facility.type}`,
      pinColor: colors.primary,
    },
    {
      id: 'robot-current',
      coordinate: {
        latitude: facility.location.lat - 0.0006,
        longitude: facility.location.lng - 0.0007,
      },
      title: 'Vị trí hiện tại của LiBot',
      description: 'Trạm kiosk tablet',
      pinColor: colors.robot,
    },
  ];

  return (
    <View style={styles.container}>
      <AppHeader
        title={facility.name}
        subtitle={`Tầng ${facility.floor} • ${facility.type}`}
        onBack={() => {
          recordInteraction();
          router.back();
        }}
        backLabel="← Quay lại"
      />

      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={[
          styles.contentContainer,
          {
            paddingLeft: Math.max(insets.left, spacing.xl),
            paddingRight: Math.max(insets.right, spacing.xl),
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
          <View style={[styles.leftColumn, !isTablet && styles.columnPhone]}>
            <AppCard style={styles.card}>
              <View style={styles.badgeRow}>
                <StatusBadge label={facility.type} tone="info" />
                <StatusBadge label={`Tầng ${facility.floor}`} tone="neutral" />
                {facility.shelfCode ? (
                  <StatusBadge label={`Mã kệ: ${facility.shelfCode}`} tone="success" />
                ) : null}
              </View>

              <AppText variant="title" style={styles.facilityName}>
                {facility.name}
              </AppText>

              <AppText variant="body" color={colors.textSecondary} style={styles.description}>
                {facility.description}
              </AppText>

              <View style={styles.infoBox}>
                <AppText variant="subtitle" color={colors.primary}>
                  Chỉ dẫn di chuyển:
                </AppText>
                <AppText variant="body" color={colors.textSecondary}>
                  Khu vực này nằm tại Tầng {facility.floor}. Quý độc giả có thể dùng thang máy hoặc thang bộ khu B để đến nơi.
                </AppText>
              </View>

              <AppButton
                title="Quay lại"
                variant="secondary"
                size="lg"
                onPress={() => {
                  recordInteraction();
                  router.back();
                }}
              />
            </AppCard>
          </View>

          <View style={[styles.rightColumn, !isTablet && styles.columnPhone]}>
            <AppCard style={styles.card}>
              <AppText variant="heading">Sơ đồ vị trí trực quan</AppText>
              <MobileMap
                markers={mapMarkers}
                initialRegion={{
                  latitude: facility.location.lat,
                  longitude: facility.location.lng,
                  latitudeDelta: 0.003,
                  longitudeDelta: 0.003,
                }}
                style={styles.mapContainer}
              />
              <View style={styles.legendRow}>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: colors.primary }]} />
                  <AppText variant="caption">Vị trí điểm đến</AppText>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: colors.robot }]} />
                  <AppText variant="caption">Vị trí LiBot / Bạn đang ở đây</AppText>
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
  badgeRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'center',
  },
  facilityName: {
    fontWeight: '800',
  },
  description: {
    lineHeight: 22,
  },
  infoBox: {
    backgroundColor: colors.surfaceAlt,
    padding: spacing.lg,
    borderRadius: 12,
    gap: spacing.xs,
  },
  mapContainer: {
    height: 340,
    borderRadius: 14,
  },
  legendRow: {
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
