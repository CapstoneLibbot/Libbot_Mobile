import {
  BookOpen,
  Building2,
  CalendarDays,
  Map as MapIcon,
  MapPin,
  User,
  Zap,
} from "lucide-react-native";
import React, { useState } from "react";
import { Image, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useKioskStore } from "@/core/state";
import {
  AppEmptyState,
  AppErrorState,
  AppHeader,
  AppLoading,
  AppText,
} from "@/shared/ui";
import { useResponsiveLayout } from "@/shared/layout";
import { colors, radius, shadows, spacing } from "@/shared/theme";
import { useBookDetail } from "../hooks/useBookDetail";

export interface BookDetailScreenProps {
  bookId: string;
  onBack: () => void;
  onOpenFacility: (facilityId: string) => void;
  onStartGuidance: (endpointId: string) => void;
}

export function BookDetailScreen({
  bookId,
  onBack,
  onOpenFacility,
  onStartGuidance,
}: BookDetailScreenProps): React.ReactElement {
  const { insets, isCompactWidth, width, height, isTablet } =
    useResponsiveLayout();
  const recordInteraction = useKioskStore((state) => state.recordInteraction);
  const { data: book, isLoading, isError, error, refetch } =
    useBookDetail(bookId);
  const [coverFailed, setCoverFailed] = useState(false);

  if (isLoading) {
    return (
      <View style={styles.screen}>
        <AppHeader title="Thông tin sách" onBack={onBack} />
        <AppLoading message="Đang tải thông tin chi tiết sách..." />
      </View>
    );
  }

  if (isError || !book) {
    return (
      <View style={styles.screen}>
        <AppHeader title="Thông tin sách" onBack={onBack} />
        {isError ? (
          <AppErrorState
            title="Lỗi tải thông tin sách"
            message={error?.message ?? "Không thể tải chi tiết sách."}
            onRetry={refetch}
          />
        ) : (
          <AppEmptyState
            title="Không tìm thấy sách"
            message="Mã sách không hợp lệ hoặc đã bị gỡ khỏi hệ thống."
            actionTitle="Quay lại"
            onAction={onBack}
          />
        )}
      </View>
    );
  }

  const selectedCopy = book.copies?.[0] ?? null;
  const endpoint = selectedCopy?.endpoint ?? null;
  const canStartGuidance = Boolean(endpoint?.endpointId);
  const locationLabel = [
    selectedCopy?.aisle,
    selectedCopy?.shelf,
    selectedCopy?.shelfSlot,
  ]
    .filter((value): value is string => Boolean(value?.trim()))
    .join(" · ");

  // Desktop / kiosk landscape uses two-column layout (42% / 58%)
  const isTwoColumn = Boolean(isTablet || (!isCompactWidth && width > height));
  const facilityId = selectedCopy?.aisle?.toLowerCase().includes("b")
    ? "fac-shelf-r"
    : "fac-shelf-a";

  return (
    <View style={styles.screen}>
      <AppHeader
        title={book.title}
        subtitle={`${book.author} • ${book.category}`}
        onBack={() => {
          recordInteraction();
          onBack();
        }}
        backLabel="Quay lại"
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.content,
          isTwoColumn && styles.contentWide,
          {
            paddingLeft: Math.max(insets.left, spacing.md),
            paddingRight: Math.max(insets.right, spacing.md),
          },
        ]}
      >
        <View style={[styles.main, isTwoColumn && styles.mainWide]}>
          {/* Card 1 (Left): Book Information & Metadata */}
          <View
            style={[
              styles.card,
              styles.infoCard,
              isTwoColumn && styles.infoWide,
            ]}
          >
            {/* Top row: Cover (left) + Details (right) */}
            <View style={styles.summaryTopRow}>
              <View style={styles.coverWrapper}>
                {book.coverUrl && !coverFailed ? (
                  <Image
                    source={{ uri: book.coverUrl }}
                    style={styles.coverImage}
                    resizeMode="cover"
                    onError={() => setCoverFailed(true)}
                  />
                ) : (
                  <View style={styles.coverFallback}>
                    <AppText
                      variant="caption"
                      color={colors.surface}
                      style={styles.coverFallbackBadge}
                    >
                      BOOK
                    </AppText>
                    <AppText
                      variant="subtitle"
                      color={colors.surface}
                      numberOfLines={3}
                      style={styles.coverFallbackTitle}
                    >
                      {book.title}
                    </AppText>
                  </View>
                )}
              </View>

              <View style={styles.infoDetails}>
                {/* Availability pill */}
                <View
                  style={[
                    styles.availabilityPill,
                    !canStartGuidance && styles.unavailablePill,
                  ]}
                >
                  <View
                    style={[
                      styles.statusDot,
                      !canStartGuidance && styles.statusDotMuted,
                    ]}
                  />
                  <AppText
                    variant="caption"
                    color={
                      canStartGuidance ? colors.success : colors.textSecondary
                    }
                    style={styles.availabilityText}
                  >
                    {canStartGuidance ? "Có sẵn" : "Chưa thể dẫn đường"}
                  </AppText>
                </View>

                {/* Book Title - strictly capped at 2 lines */}
                <AppText
                  variant="subtitle"
                  style={styles.bookTitle}
                  numberOfLines={2}
                >
                  {book.title}
                </AppText>

                {/* Author row */}
                <View style={styles.authorRow}>
                  <User size={15} color={colors.textSecondary} />
                  <AppText
                    variant="caption"
                    color={colors.textSecondary}
                    numberOfLines={1}
                    style={styles.authorText}
                  >
                    {book.author}
                  </AppText>
                </View>

                {/* Category badge */}
                {book.category ? (
                  <View style={styles.categoryBadge}>
                    <AppText
                      variant="caption"
                      color={colors.primary}
                      numberOfLines={1}
                      style={styles.categoryText}
                    >
                      {book.category}
                    </AppText>
                  </View>
                ) : null}
              </View>
            </View>

            {/* Bottom row: Compact metadata pills */}
            <View style={styles.metadataGrid}>
              <View style={styles.metaRow}>
                <MetaItem label="ISBN" value={book.isbn || "Chưa cập nhật"} />
                <MetaItem
                  label="Năm XB"
                  value={book.publishedYear?.toString() ?? "Chưa cập nhật"}
                  icon={
                    <CalendarDays size={14} color={colors.textSecondary} />
                  }
                />
              </View>
              <MetaItem
                label="Nhà xuất bản"
                value={book.publisher || "Chưa cập nhật"}
                icon={<Building2 size={14} color={colors.textSecondary} />}
                fullWidth
              />
            </View>
          </View>

          {/* Card 2 (Right): Summary Content */}
          <View
            style={[
              styles.card,
              styles.summaryCard,
              isTwoColumn && styles.summaryWide,
            ]}
          >
            <View style={styles.summaryHeader}>
              <View style={styles.summaryIconBadge}>
                <BookOpen size={18} color={colors.primary} />
              </View>
              <AppText style={styles.summaryTitleText}>
                TÓM TẮT NỘI DUNG
              </AppText>
            </View>

            {isTwoColumn ? (
              <ScrollView
                style={styles.summaryScroll}
                contentContainerStyle={styles.summaryScrollContent}
                nestedScrollEnabled
                showsVerticalScrollIndicator
              >
                <AppText
                  variant="body"
                  color={colors.textSecondary}
                  style={styles.descriptionText}
                >
                  {book.description?.trim() ||
                    "Chưa cập nhật tóm tắt nội dung."}
                </AppText>
              </ScrollView>
            ) : (
              <AppText
                variant="body"
                color={colors.textSecondary}
                style={styles.descriptionText}
              >
                {book.description?.trim() || "Chưa cập nhật tóm tắt nội dung."}
              </AppText>
            )}
          </View>
        </View>
      </ScrollView>

      {/* Bottom Action Bar: Destination + Map & Guidance actions */}
      <View
        style={[
          styles.actionBar,
          {
            paddingBottom: Math.max(insets.bottom, spacing.sm),
            paddingLeft: Math.max(insets.left, spacing.md),
            paddingRight: Math.max(insets.right, spacing.md),
          },
          isCompactWidth && styles.actionBarCompact,
        ]}
      >
        <View style={styles.destination}>
          <View
            style={[
              styles.destinationIcon,
              isCompactWidth && styles.destinationIconCompact,
            ]}
          >
            <MapPin size={isCompactWidth ? 20 : 22} color={colors.primary} />
          </View>
          <View style={styles.destinationText}>
            <AppText
              variant="caption"
              color={colors.textSecondary}
              style={styles.destinationLabel}
            >
              ĐÍCH ĐẾN ĐÃ CHỌN:
            </AppText>
            <AppText
              variant="subtitle"
              numberOfLines={isCompactWidth ? 1 : 2}
              style={styles.destinationValue}
            >
              {canStartGuidance
                ? locationLabel || endpoint?.name || "Vị trí bản sao"
                : "Chưa có vị trí dẫn đường cho sách này"}
            </AppText>
          </View>
        </View>

        <View style={styles.actions}>
          <Pressable
            onPress={() => {
              recordInteraction();
              onOpenFacility(facilityId);
            }}
            style={[
              styles.mapButton,
              isCompactWidth && styles.mapButtonCompact,
            ]}
            accessibilityRole="button"
            accessibilityLabel="Xem sơ đồ vị trí"
          >
            <MapIcon size={18} color={colors.text} />
            <AppText variant="subtitle" style={styles.mapButtonText}>
              Sơ đồ
            </AppText>
          </Pressable>

          <Pressable
            disabled={!canStartGuidance}
            onPress={() => {
              if (!endpoint) return;
              recordInteraction();
              onStartGuidance(endpoint.endpointId);
            }}
            style={[
              styles.guideButton,
              isCompactWidth && styles.guideButtonCompact,
              !canStartGuidance && styles.disabled,
            ]}
            accessibilityRole="button"
            accessibilityLabel={
              canStartGuidance
                ? "Dẫn đường đến sách"
                : "Chưa có vị trí dẫn đường"
            }
          >
            <Zap size={17} color={colors.surface} fill={colors.surface} />
            <AppText
              variant="subtitle"
              color={colors.surface}
              style={styles.guideButtonText}
            >
              Dẫn đường
            </AppText>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

function MetaItem({
  label,
  value,
  fullWidth,
  icon,
}: {
  label: string;
  value: string;
  fullWidth?: boolean;
  icon?: React.ReactNode;
}): React.ReactElement {
  return (
    <View style={[styles.metaChip, fullWidth && styles.metaChipFull]}>
      {icon ? <View style={styles.metaIcon}>{icon}</View> : null}
      <AppText
        variant="caption"
        color={colors.textSecondary}
        style={styles.metaLabel}
      >
        {label}:
      </AppText>
      <AppText
        variant="caption"
        color={colors.text}
        numberOfLines={1}
        style={styles.metaValue}
      >
        {value}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    paddingTop: spacing.sm + 2,
    paddingBottom: spacing.sm + 2,
    width: "100%",
    maxWidth: 1200,
    alignSelf: "center",
  },
  contentWide: {
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
  },
  main: {
    gap: spacing.md,
  },
  mainWide: {
    flexDirection: "row",
    alignItems: "stretch",
    gap: spacing.md,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.card,
  },
  infoCard: {
    padding: spacing.md,
    gap: spacing.sm + 2,
    justifyContent: "flex-start",
  },
  infoWide: {
    flex: 0.42,
    minWidth: 280,
    maxHeight: 380,
  },
  summaryTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm + 2,
  },
  coverWrapper: {
    width: 88,
    height: 128,
    borderRadius: radius.md,
    overflow: "hidden",
    backgroundColor: colors.primaryDark,
    flexShrink: 0,
  },
  coverImage: {
    width: "100%",
    height: "100%",
  },
  coverFallback: {
    flex: 1,
    padding: spacing.sm,
    justifyContent: "space-between",
    backgroundColor: colors.primaryDark,
  },
  coverFallbackBadge: {
    fontWeight: "700",
    letterSpacing: 1,
    opacity: 0.8,
  },
  coverFallbackTitle: {
    fontWeight: "700",
  },
  infoDetails: {
    flex: 1,
    gap: 4,
    minWidth: 0,
    justifyContent: "flex-start",
  },
  availabilityPill: {
    flexDirection: "row",
    alignSelf: "flex-start",
    alignItems: "center",
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.lg,
    backgroundColor: colors.successSoft,
  },
  unavailablePill: {
    backgroundColor: colors.surfaceAlt,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.success,
  },
  statusDotMuted: {
    backgroundColor: colors.subtext,
  },
  availabilityText: {
    fontSize: 12,
    fontWeight: "600",
  },
  bookTitle: {
    fontSize: 18,
    lineHeight: 23,
    fontWeight: "700",
    color: colors.text,
  },
  authorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  authorText: {
    fontSize: 13,
    flexShrink: 1,
  },
  categoryBadge: {
    alignSelf: "flex-start",
    backgroundColor: colors.primarySoft,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.sm,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: "600",
  },
  metadataGrid: {
    gap: spacing.xs + 2,
    marginTop: 2,
  },
  metaRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  metaChip: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.borderLight,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 6,
    borderRadius: radius.sm,
    minHeight: 32,
  },
  metaChipFull: {
    flex: 0,
    width: "100%",
  },
  metaIcon: {
    marginRight: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  metaLabel: {
    fontSize: 12,
  },
  metaValue: {
    fontSize: 12,
    fontWeight: "700",
    flexShrink: 1,
  },
  summaryCard: {
    padding: spacing.md + 2,
    gap: spacing.sm,
    minHeight: 220,
  },
  summaryWide: {
    flex: 0.58,
    minWidth: 320,
    maxHeight: 380,
  },
  summaryHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  summaryIconBadge: {
    width: 32,
    height: 32,
    borderRadius: radius.sm,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  summaryTitleText: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.text,
    letterSpacing: 0.4,
  },
  summaryScroll: {
    flex: 1,
  },
  summaryScrollContent: {
    paddingBottom: spacing.xs,
  },
  descriptionText: {
    fontSize: 14,
    lineHeight: 22,
    color: colors.textSecondary,
  },
  actionBar: {
    borderTopWidth: 1,
    borderColor: colors.borderLight,
    backgroundColor: colors.surface,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
    paddingTop: spacing.sm + 2,
  },
  actionBarCompact: {
    gap: spacing.sm,
    paddingTop: spacing.sm,
  },
  destination: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  destinationIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  destinationIconCompact: {
    width: 38,
    height: 38,
    borderRadius: radius.sm,
  },
  destinationText: {
    flex: 1,
    minWidth: 0,
  },
  destinationLabel: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 0.4,
  },
  destinationValue: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "700",
    color: colors.text,
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    flexShrink: 0,
  },
  mapButton: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surface,
    justifyContent: "center",
  },
  mapButtonCompact: {
    paddingHorizontal: spacing.sm + 2,
  },
  mapButtonText: {
    fontWeight: "600",
    fontSize: 14,
  },
  guideButton: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.primary,
    justifyContent: "center",
    ...shadows.card,
  },
  guideButtonCompact: {
    paddingHorizontal: spacing.md,
  },
  guideButtonText: {
    fontWeight: "700",
    fontSize: 14,
  },
  disabled: {
    opacity: 0.45,
  },
});
