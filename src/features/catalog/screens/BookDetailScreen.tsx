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
  const { insets, isCompactWidth, isExpandedWidth, tokens } = useResponsiveLayout();
  const isExpanded = isExpandedWidth;

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

  // Robot Service & Actions Card Content
  const renderActionsPanel = () => (
    <AppCard
      style={styles.card}
      padding={isCompactWidth ? 'compact' : 'normal'}
    >
      <AppText variant="heading">Dịch vụ Robot LiBot</AppText>
      <AppText variant="body" color={colors.textSecondary} style={styles.robotIntro}>
        LiBot có thể tự hành dẫn bạn đến trực tiếp kệ sách{' '}
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
            Tất cả bản in đã được mượn. Tính năng dẫn đường tạm khóa.
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

      {/* Visual action priority */}
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
          size={isCompactWidth ? 'md' : 'lg'}
          onPress={handleViewShelfMap}
        />

        <AppButton
          title="Quay lại tra cứu"
          variant="secondary"
          size="md"
          onPress={() => {
            recordInteraction();
            router.back();
          }}
        />
      </View>
    </AppCard>
  );

  return (
    <View style={styles.container}>
      <AppHeader
        title={book.title}
        subtitle={`${book.author} • ${book.category}`}
        onBack={() => {
          recordInteraction();
          router.back();
        }}
        backLabel="Quay lại tra cứu"
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
            {/* Left Column: Book Details */}
            <View style={styles.leftColumnExpanded}>
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

            {/* Right Column: LiBot Guidance Actions */}
            <View style={styles.rightColumnExpanded}>
              {renderActionsPanel()}
            </View>
          </View>
        ) : (
          /* Compact/Medium Mobile Layout: Single Ordered Column */
          <View style={styles.columnsWrapperCompact}>
            <AppCard
              style={styles.card}
              padding={isCompactWidth ? 'compact' : 'normal'}
            >
              {/* 1. Identity & Status */}
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

              {/* 2. Important Location Info Highlights */}
              <View style={styles.locationHighlightBox}>
                <View style={styles.locationItem}>
                  <AppText variant="caption" color={colors.subtext}>Vị trí kệ đích</AppText>
                  <AppText variant="heading" color={colors.destination}>
                    Kệ {book.shelf}
                  </AppText>
                </View>
                <View style={styles.locationItem}>
                  <AppText variant="caption" color={colors.subtext}>Tầng thư viện</AppText>
                  <AppText variant="subtitle">Tầng {book.floor}</AppText>
                </View>
                <View style={styles.locationItem}>
                  <AppText variant="caption" color={colors.subtext}>Bản in khả dụng</AppText>
                  <AppText variant="subtitle">
                    {book.availableCopies ?? (book.available ? 1 : 0)} / {book.totalCopies ?? 1}
                  </AppText>
                </View>
              </View>

              {/* 3. Description */}
              <AppText variant="heading" style={styles.sectionHeader}>
                Tóm tắt nội dung
              </AppText>
              <AppText variant="body" color={colors.textSecondary} style={styles.description}>
                {book.description}
              </AppText>

              {/* 4. Secondary Metadata Grid */}
              <View style={styles.metadataGrid}>
                <View style={styles.metaItem}>
                  <AppText variant="caption" color={colors.subtext}>Mã ISBN</AppText>
                  <AppText variant="caption" style={styles.metaValue}>{book.isbn}</AppText>
                </View>
                <View style={styles.metaItem}>
                  <AppText variant="caption" color={colors.subtext}>Năm xuất bản</AppText>
                  <AppText variant="caption" style={styles.metaValue}>{book.publishedYear}</AppText>
                </View>
              </View>
            </AppCard>

            {/* 5. Robot Service & Actions */}
            {renderActionsPanel()}
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
  leftColumnExpanded: {
    flex: 3,
  },
  rightColumnExpanded: {
    flex: 2,
  },
  card: {
    gap: spacing.sm,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    alignItems: 'center',
  },
  bookTitle: {
    fontWeight: '800',
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: colors.borderLight,
    marginVertical: spacing.xs,
  },
  sectionHeader: {
    marginTop: spacing.xs,
    marginBottom: 2,
  },
  description: {
    lineHeight: 22,
  },
  locationHighlightBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: colors.surfaceAlt,
    padding: spacing.md,
    borderRadius: 12,
    gap: spacing.sm,
  },
  locationItem: {
    gap: 2,
  },
  metadataGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    backgroundColor: colors.surfaceAlt,
    padding: spacing.md,
    borderRadius: 12,
    marginTop: spacing.xs,
  },
  metaItem: {
    flex: 1,
    minWidth: 120,
    gap: 2,
  },
  metaValue: {
    fontWeight: '600',
    color: colors.text,
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
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
});
