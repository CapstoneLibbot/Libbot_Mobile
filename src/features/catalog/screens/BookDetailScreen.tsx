import { router, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useKioskStore } from '../../../core/store/kioskStore';
import { useCreateGuidanceMission } from '../../../features/guidance/hooks/useCreateGuidanceMission';
import {
  AppButton,
  AppCard,
  AppEmptyState,
  AppErrorState,
  AppHeader,
  AppLoading,
  AppText,
  StatusBadge,
} from '../../../shared/components';
import { useResponsiveLayout } from '../../../shared/hooks/useResponsiveLayout';
import { colors, spacing } from '../../../shared/theme';
import { useBookDetail } from '../hooks/useBookDetail';

export function BookDetailScreen(): React.ReactElement {
  const { isTablet, insets } = useResponsiveLayout();
  const { bookId } = useLocalSearchParams<{ bookId: string }>();
  const recordInteraction = useKioskStore((state) => state.recordInteraction);
  const kioskSessionId = useKioskStore((state) => state.kioskSessionId);

  const { data: book, isLoading, isError, error, refetch } = useBookDetail(bookId ?? '');
  const createMissionMutation = useCreateGuidanceMission();
  const [actionError, setActionError] = useState<string | null>(null);

  const handleRequestGuidance = async () => {
    recordInteraction();
    setActionError(null);

    if (!book) return;

    if (!book.available) {
      setActionError('Sách này hiện không có sẵn trên kệ để dẫn đường.');
      return;
    }

    try {
      const mission = await createMissionMutation.mutateAsync({
        bookId: book.id,
        kioskSessionId,
      });
      router.push(`/(kiosk)/guidance/${mission.id}`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Không thể khởi tạo chuyến hướng dẫn.';
      setActionError(message);
    }
  };

  const handleViewShelfMap = () => {
    recordInteraction();
    // Navigate to facilities view for shelf
    const facilityId = book?.category === 'Robotics' ? 'fac-shelf-r' : 'fac-shelf-a';
    router.push(`/(kiosk)/facilities/${facilityId}`);
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <AppHeader title="Thông tin sách" onBack={() => router.back()} />
        <AppLoading message="Đang tải thông tin chi tiết sách..." />
      </View>
    );
  }

  if (isError || !book) {
    return (
      <View style={styles.container}>
        <AppHeader title="Thông tin sách" onBack={() => router.back()} />
        {isError ? (
          <AppErrorState
            title="Lỗi tải thông tin sách"
            message={error?.message ?? 'Không thể tải chi tiết sách.'}
            onRetry={() => refetch()}
          />
        ) : (
          <AppEmptyState
            title="Không tìm thấy sách"
            message="Mã sách không hợp lệ hoặc đã bị gỡ khỏi hệ thống."
            actionTitle="Quay lại danh sách"
            onAction={() => router.back()}
          />
        )}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <AppHeader
        title={book.title}
        subtitle={`${book.author} • ${book.category}`}
        onBack={() => {
          recordInteraction();
          router.back();
        }}
        backLabel="← Quay lại tra cứu"
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
          {/* Cột chính: Thông tin sách */}
          <View style={[styles.leftColumn, !isTablet && styles.columnPhone]}>
            <AppCard style={styles.card}>
              <View style={styles.badgeRow}>
                <StatusBadge
                  label={book.available ? 'Có sẵn trên kệ' : 'Đang được mượn'}
                  tone={book.available ? 'success' : 'danger'}
                />
                <StatusBadge label={book.category} tone="info" />
              </View>

              <AppText variant="title" style={styles.bookTitle}>
                {book.title}
              </AppText>
              <AppText variant="subtitle" color={colors.textSecondary}>
                Tác giả: {book.author}
              </AppText>

              <View style={styles.divider} />

              <AppText variant="heading" style={styles.sectionHeader}>
                Tóm tắt nội dung
              </AppText>
              <AppText variant="body" color={colors.textSecondary} style={styles.description}>
                {book.description}
              </AppText>

              <View style={styles.metadataGrid}>
                <View style={styles.metaItem}>
                  <AppText variant="caption" color={colors.subtext}>Mã ISBN</AppText>
                  <AppText variant="subtitle">{book.isbn}</AppText>
                </View>
                <View style={styles.metaItem}>
                  <AppText variant="caption" color={colors.subtext}>Vị trí kệ</AppText>
                  <AppText variant="subtitle" color={colors.primary}>Kệ {book.shelf}</AppText>
                </View>
                <View style={styles.metaItem}>
                  <AppText variant="caption" color={colors.subtext}>Vị trí tầng</AppText>
                  <AppText variant="subtitle">Tầng {book.floor}</AppText>
                </View>
                <View style={styles.metaItem}>
                  <AppText variant="caption" color={colors.subtext}>Bản in khả dụng</AppText>
                  <AppText variant="subtitle">
                    {book.availableCopies ?? (book.available ? 1 : 0)} / {book.totalCopies ?? 1}
                  </AppText>
                </View>
              </View>
            </AppCard>
          </View>

          {/* Cột phải: Hướng dẫn robot & Vị trí */}
          <View style={[styles.rightColumn, !isTablet && styles.columnPhone]}>
            <AppCard style={styles.card}>
              <AppText variant="heading">Dịch vụ Robot LiBot</AppText>
              <AppText variant="body" color={colors.textSecondary} style={styles.robotIntro}>
                Robot LiBot có thể tự hành dẫn bạn đến trực tiếp kệ sách{' '}
                <AppText variant="body" style={styles.boldText}>
                  {book.shelf} (Tầng {book.floor})
                </AppText>
                .
              </AppText>

              {book.available ? (
                <View style={styles.availableNotice}>
                  <AppText variant="subtitle" color={colors.success}>
                    ✓ Sách đang sẵn sàng tại kệ
                  </AppText>
                  <AppText variant="caption" color={colors.textSecondary}>
                    Chạm nút bên dưới để LiBot bắt đầu dẫn đường cho bạn.
                  </AppText>
                </View>
              ) : (
                <View style={styles.unavailableNotice}>
                  <AppText variant="subtitle" color={colors.danger}>
                    ✕ Sách hiện không có sẵn
                  </AppText>
                  <AppText variant="caption" color={colors.textSecondary}>
                    Tất cả các bản in của tựa sách này đã được độc giả khác mượn. Tính năng dẫn đường bị tạm khóa.
                  </AppText>
                </View>
              )}

              {actionError ? (
                <View style={styles.errorBox}>
                  <AppText variant="caption" color={colors.danger}>
                    {actionError}
                  </AppText>
                </View>
              ) : null}

              <View style={styles.actionGroup}>
                <AppButton
                  title={
                    createMissionMutation.isPending
                      ? 'Đang khởi tạo chuyến đi...'
                      : 'Yêu cầu LiBot dẫn đường tới kệ'
                  }
                  variant="primary"
                  size="lg"
                  disabled={!book.available || createMissionMutation.isPending}
                  loading={createMissionMutation.isPending}
                  onPress={handleRequestGuidance}
                />

                <AppButton
                  title="Xem sơ đồ khu vực & kệ sách"
                  variant="outline"
                  size="lg"
                  onPress={handleViewShelfMap}
                />

                <AppButton
                  title="Quay lại danh sách tra cứu"
                  variant="secondary"
                  size="md"
                  onPress={() => {
                    recordInteraction();
                    router.back();
                  }}
                />
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
    flex: 3,
  },
  rightColumn: {
    flex: 2,
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
  bookTitle: {
    fontWeight: '800',
  },
  divider: {
    height: 1,
    backgroundColor: colors.borderLight,
    marginVertical: spacing.sm,
  },
  sectionHeader: {
    marginBottom: spacing.xs,
  },
  description: {
    lineHeight: 24,
  },
  metadataGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.lg,
    backgroundColor: colors.surfaceAlt,
    padding: spacing.lg,
    borderRadius: 12,
    marginTop: spacing.sm,
  },
  metaItem: {
    minWidth: '45%',
    gap: 2,
  },
  robotIntro: {
    lineHeight: 22,
  },
  boldText: {
    fontWeight: '700',
  },
  availableNotice: {
    backgroundColor: colors.successSoft,
    padding: spacing.md,
    borderRadius: 10,
    gap: 4,
  },
  unavailableNotice: {
    backgroundColor: colors.dangerSoft,
    padding: spacing.md,
    borderRadius: 10,
    gap: 4,
  },
  errorBox: {
    backgroundColor: colors.dangerSoft,
    padding: spacing.sm,
    borderRadius: 8,
  },
  actionGroup: {
    gap: spacing.md,
    marginTop: spacing.sm,
  },
});
