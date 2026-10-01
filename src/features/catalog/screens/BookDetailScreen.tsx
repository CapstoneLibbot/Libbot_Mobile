import { router, useLocalSearchParams } from "expo-router";
import {
  BookOpen,
  Bot,
  Check,
  Navigation,
} from "lucide-react-native";
import React, { useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useKioskStore } from "../../../core/store/kioskStore";
import { useCreateGuidanceMission } from "../../../features/guidance/hooks/useCreateGuidanceMission";
import {
  AppEmptyState,
  AppErrorState,
  AppHeader,
  AppLoading,
  AppText,
} from "../../../shared/components";
import { useResponsiveLayout } from "../../../shared/hooks/useResponsiveLayout";
import { colors, spacing } from "../../../shared/theme";
import { useBookDetail } from "../hooks/useBookDetail";

/**
 * Returns tailored cover graphic theme based on book data
 */
function getBookCoverDetailTheme(category: string, title: string, author: string) {
  const catLower = (category || "").toLowerCase();
  const titleLower = (title || "").toLowerCase();

  let bgColor = "#0F172A"; // Dark Navy / Slate
  let topTag = "CLEAN";
  let topColor = "#F59E0B"; // Amber
  let midText = "ARCH";

  if (titleLower.includes("clean arch")) {
    topTag = "CLEAN";
    midText = "ARCH";
    topColor = "#FBBF24";
  } else if (catLower.includes("robot")) {
    bgColor = "#881337";
    topTag = "ROBOTICS";
    midText = "CONTROL";
    topColor = "#FECDD3";
  } else if (catLower.includes("data")) {
    bgColor = "#064E3B";
    topTag = "DATA";
    midText = "DATA INTENSIVE";
    topColor = "#A7F3D0";
  } else if (catLower.includes("intelligence") || catLower.includes("ai")) {
    bgColor = "#4C1D95";
    topTag = "AI";
    midText = "AI: MODERN";
    topColor = "#DDD6FE";
  } else {
    topTag = (category || "TECH").toUpperCase();
    const words = title.split(/[\s:-]+/).filter(Boolean);
    midText = words.slice(0, 2).join(" ").toUpperCase();
  }

  const authorSnippet = author.split("(")[0].trim().split(" ").pop() ?? author;

  return { bgColor, topTag, topColor, midText, authorSnippet };
}

export function BookDetailScreen(): React.ReactElement {
  const { insets, isCompactWidth, tokens } = useResponsiveLayout();

  // Multi-column side by side on medium & expanded displays (tablets / kiosk)
  const isMultiColumn = !isCompactWidth;

  const { bookId } = useLocalSearchParams<{ bookId: string }>();
  const recordInteraction = useKioskStore((state) => state.recordInteraction);
  const kioskSessionId = useKioskStore((state) => state.kioskSessionId);

  const {
    data: book,
    isLoading,
    isError,
    error,
    refetch,
  } = useBookDetail(bookId ?? "");
  const createMissionMutation = useCreateGuidanceMission();
  const [actionError, setActionError] = useState<string | null>(null);

  const handleRequestGuidance = async () => {
    recordInteraction();
    setActionError(null);

    if (!book) return;

    if (!book.available) {
      setActionError("Sách này hiện không có sẵn trên kệ để dẫn đường.");
      return;
    }

    try {
      const mission = await createMissionMutation.mutateAsync({
        bookId: book.id,
        kioskSessionId,
      });
      router.push(`/(kiosk)/guidance/${mission.id}`);
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : "Không thể khởi tạo chuyến hướng dẫn.";
      setActionError(message);
    }
  };

  const handleViewShelfMap = () => {
    recordInteraction();
    const facilityId =
      book?.category === "Robotics" ? "fac-shelf-r" : "fac-shelf-a";
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
            message={error?.message ?? "Không thể tải chi tiết sách."}
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

  const coverTheme = getBookCoverDetailTheme(
    book.category,
    book.title,
    book.author,
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
        <View
          style={
            isMultiColumn
              ? styles.columnsWrapperExpanded
              : styles.columnsWrapperCompact
          }
        >
          {/* ══════════════════════════════════════════════════════════════════
              LEFT PANEL: Book Information Card
             ══════════════════════════════════════════════════════════════════ */}
          <View style={isMultiColumn ? styles.leftColumnExpanded : styles.fullWidth}>
            <View style={styles.bookInfoCard}>
              {/* 1. Status & Category Tag Row */}
              <View style={styles.badgeRow}>
                {book.available ? (
                  <View style={styles.badgeAvailable}>
                    <View style={styles.dotAvailable} />
                    <AppText variant="caption" style={styles.textAvailable}>
                      Có sẵn trên kệ
                    </AppText>
                  </View>
                ) : (
                  <View style={styles.badgeBorrowed}>
                    <View style={styles.dotBorrowed} />
                    <AppText variant="caption" style={styles.textBorrowed}>
                      Đang mượn
                    </AppText>
                  </View>
                )}

                <View style={styles.badgeCategory}>
                  <AppText variant="caption" style={styles.textCategory}>
                    {book.category}
                  </AppText>
                </View>
              </View>

              {/* 2. Book Cover + Information Header */}
              <View style={styles.bookHeaderRow}>
                {/* Book Graphic Cover */}
                <View
                  style={[
                    styles.bookCoverThumb,
                    { backgroundColor: coverTheme.bgColor },
                  ]}
                >
                  <AppText
                    variant="caption"
                    style={[
                      styles.coverTopText,
                      { color: coverTheme.topColor },
                    ]}
                  >
                    {coverTheme.topTag}
                  </AppText>
                  <AppText
                    variant="caption"
                    numberOfLines={2}
                    style={styles.coverMidText}
                  >
                    {coverTheme.midText}
                  </AppText>
                  <AppText
                    variant="caption"
                    numberOfLines={1}
                    style={styles.coverBottomText}
                  >
                    {coverTheme.authorSnippet}
                  </AppText>
                </View>

                {/* Title & Metadata */}
                <View style={styles.bookHeaderInfo}>
                  <AppText
                    variant="title"
                    style={styles.bookTitle}
                    numberOfLines={2}
                  >
                    {book.title}
                  </AppText>

                  <AppText variant="body" style={styles.authorLine}>
                    Tác giả:{" "}
                    <AppText variant="body" style={styles.authorBold}>
                      {book.author}
                    </AppText>
                  </AppText>

                  <AppText variant="caption" style={styles.metaLine}>
                    {book.language ?? "Tiếng Anh"} • {book.pages ?? 432} trang •{" "}
                    {book.publisher ?? "NXB Pearson"} (
                    {book.publishedYear ?? 2018})
                  </AppText>
                </View>
              </View>

              {/* 3. Tóm tắt Box */}
              <View style={styles.summaryBox}>
                <AppText variant="body" style={styles.summaryContent}>
                  <AppText variant="body" style={styles.summaryTitle}>
                    Tóm tắt:{" "}
                  </AppText>
                  {book.description}
                </AppText>
              </View>

              {/* 4. Stat Grid (4 Bottom Metric Boxes) */}
              <View
                style={
                  isCompactWidth
                    ? styles.statGridCompact
                    : styles.statGridExpanded
                }
              >
                {/* Box 1: Mã ISBN */}
                <View
                  style={[
                    styles.statBox,
                    styles.statBoxNeutral,
                    isCompactWidth && styles.statBoxCompact,
                  ]}
                >
                  <AppText variant="caption" style={styles.statLabelNeutral}>
                    Mã ISBN
                  </AppText>
                  <AppText
                    variant="caption"
                    style={styles.statValueBold}
                    numberOfLines={1}
                  >
                    {book.isbn}
                  </AppText>
                </View>

                {/* Box 2: Vị trí kệ */}
                <View
                  style={[
                    styles.statBox,
                    styles.statBoxBlue,
                    isCompactWidth && styles.statBoxCompact,
                  ]}
                >
                  <AppText variant="caption" style={styles.statLabelBlue}>
                    Vị trí kệ
                  </AppText>
                  <AppText
                    variant="caption"
                    style={styles.statValueBlue}
                    numberOfLines={1}
                  >
                    Kệ {book.shelf}
                  </AppText>
                </View>

                {/* Box 3: Vị trí tầng */}
                <View
                  style={[
                    styles.statBox,
                    styles.statBoxNeutral,
                    isCompactWidth && styles.statBoxCompact,
                  ]}
                >
                  <AppText variant="caption" style={styles.statLabelNeutral}>
                    Vị trí tầng
                  </AppText>
                  <AppText
                    variant="caption"
                    style={styles.statValueBold}
                    numberOfLines={1}
                  >
                    Tầng {book.floor}
                    {book.zone ? ` (${book.zone})` : ""}
                  </AppText>
                </View>

                {/* Box 4: Khả dụng */}
                <View
                  style={[
                    styles.statBox,
                    styles.statBoxGreen,
                    isCompactWidth && styles.statBoxCompact,
                  ]}
                >
                  <AppText variant="caption" style={styles.statLabelGreen}>
                    Khả dụng
                  </AppText>
                  <AppText
                    variant="caption"
                    style={styles.statValueGreen}
                    numberOfLines={1}
                  >
                    {book.availableCopies ?? (book.available ? 1 : 0)} /{" "}
                    {book.totalCopies ?? 1} bản
                  </AppText>
                </View>
              </View>
            </View>
          </View>

          {/* ══════════════════════════════════════════════════════════════════
              RIGHT PANEL: Dịch vụ Robot LiBot & Actions
             ══════════════════════════════════════════════════════════════════ */}
          <View style={isMultiColumn ? styles.rightColumnExpanded : styles.fullWidth}>
            <View style={styles.robotServiceCard}>
              {/* 1. Header Box with Robot Icon */}
              <View style={styles.robotHeaderRow}>
                <View style={styles.robotIconBox}>
                  <Bot size={22} color="#FFFFFF" />
                </View>
                <View style={styles.robotHeaderTextWrap}>
                  <AppText variant="subtitle" style={styles.robotTitle}>
                    Dịch vụ Robot LiBot
                  </AppText>
                  <AppText variant="caption" style={styles.robotSubtitle}>
                    Tự hành dẫn đường thời gian thực
                  </AppText>
                </View>
              </View>

              {/* 2. Intro Description */}
              <AppText variant="body" style={styles.robotDescription}>
                LiBot có thể tự hành dẫn bạn đến trực tiếp vị trí{" "}
                <AppText variant="body" style={styles.robotHighlightShelf}>
                  Kệ sách {book.shelf} (Tầng {book.floor})
                </AppText>{" "}
                chỉ trong ~1 phút.
              </AppText>

              {/* 3. Availability Alert Box */}
              {book.available ? (
                <View style={styles.readyAlertBox}>
                  <Check size={16} color="#059669" strokeWidth={2.5} />
                  <AppText variant="caption" style={styles.readyAlertText}>
                    Sách đang sẵn sàng tại đúng vị trí {book.shelfSlot ?? "ngăn 3"}
                  </AppText>
                </View>
              ) : (
                <View style={styles.unavailableAlertBox}>
                  <AppText variant="caption" style={styles.unavailableAlertText}>
                    ✕ Sách hiện không có sẵn (tất cả bản in đã được mượn)
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

              {/* 4. Action Buttons */}
              <View style={styles.actionGroup}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Yêu cầu LiBot dẫn đường tới Kệ ${book.shelf}`}
                  disabled={!book.available || createMissionMutation.isPending}
                  onPress={handleRequestGuidance}
                  style={({ pressed }) => [
                    styles.btnPrimaryGuidance,
                    (!book.available ||
                      createMissionMutation.isPending) &&
                      styles.btnDisabled,
                    pressed && styles.btnPressed,
                  ]}
                >
                  <Navigation size={17} color="#FFFFFF" fill="#FFFFFF" />
                  <AppText
                    variant="subtitle"
                    style={styles.btnPrimaryGuidanceText}
                  >
                    {createMissionMutation.isPending
                      ? "Đang khởi tạo chuyến đi..."
                      : `Yêu cầu LiBot dẫn đường tới Kệ ${book.shelf}`}
                  </AppText>
                </Pressable>

                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Xem sơ đồ khu vực & vị trí kệ"
                  onPress={handleViewShelfMap}
                  style={({ pressed }) => [
                    styles.btnSecondaryMap,
                    pressed && styles.btnPressed,
                  ]}
                >
                  <BookOpen size={17} color="#475569" />
                  <AppText variant="subtitle" style={styles.btnSecondaryMapText}>
                    Xem sơ đồ khu vực & vị trí kệ
                  </AppText>
                </Pressable>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  scrollArea: {
    flex: 1,
  },
  contentContainer: {
    paddingTop: spacing.sm,
  },
  columnsWrapperExpanded: {
    flexDirection: "row",
    gap: spacing.md,
    alignItems: "flex-start",
  },
  columnsWrapperCompact: {
    flexDirection: "column",
    gap: spacing.md,
  },
  leftColumnExpanded: {
    flex: 1.3,
  },
  rightColumnExpanded: {
    flex: 1,
  },
  fullWidth: {
    width: "100%",
  },

  // ── Left Card: Book Info Card ──────────────────────────────────────────────
  bookInfoCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 16,
    gap: 14,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  badgeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    alignItems: "center",
  },
  badgeAvailable: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#ECFDF5",
    borderWidth: 1,
    borderColor: "#A7F3D0",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  dotAvailable: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#10B981",
  },
  textAvailable: {
    color: "#065F46",
    fontWeight: "700",
    fontSize: 12,
  },
  badgeBorrowed: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#FEF3C7",
    borderWidth: 1,
    borderColor: "#FDE68A",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  dotBorrowed: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#F59E0B",
  },
  textBorrowed: {
    color: "#92400E",
    fontWeight: "700",
    fontSize: 12,
  },
  badgeCategory: {
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#DBEAFE",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  textCategory: {
    color: "#2563EB",
    fontWeight: "600",
    fontSize: 12,
  },

  // ── Book Header Row ────────────────────────────────────────────────────────
  bookHeaderRow: {
    flexDirection: "row",
    gap: 14,
    alignItems: "flex-start",
  },
  bookCoverThumb: {
    width: 72,
    height: 104,
    borderRadius: 8,
    padding: 6,
    justifyContent: "space-between",
    flexShrink: 0,
  },
  coverTopText: {
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 0.5,
  },
  coverMidText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#FFFFFF",
    lineHeight: 14,
  },
  coverBottomText: {
    fontSize: 8.5,
    color: "#94A3B8",
  },
  bookHeaderInfo: {
    flex: 1,
    gap: 4,
  },
  bookTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#0F172A",
    lineHeight: 22,
  },
  authorLine: {
    color: "#64748B",
    fontSize: 13,
  },
  authorBold: {
    fontWeight: "700",
    color: "#1E293B",
  },
  metaLine: {
    color: "#94A3B8",
    fontSize: 12,
    marginTop: 2,
  },

  // ── Summary Box ────────────────────────────────────────────────────────────
  summaryBox: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    padding: 12,
  },
  summaryTitle: {
    fontWeight: "800",
    color: "#1E293B",
    fontSize: 13,
  },
  summaryContent: {
    color: "#475569",
    fontSize: 13,
    lineHeight: 21,
  },

  // ── Stat Grid ──────────────────────────────────────────────────────────────
  statGridExpanded: {
    flexDirection: "row",
    gap: 8,
  },
  statGridCompact: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  statBox: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 56,
  },
  statBoxCompact: {
    flexBasis: "48%",
    flexGrow: 1,
  },
  statBoxNeutral: {
    backgroundColor: "#F8FAFC",
    borderColor: "#E2E8F0",
  },
  statBoxBlue: {
    backgroundColor: "#EFF6FF",
    borderColor: "#BFDBFE",
  },
  statBoxGreen: {
    backgroundColor: "#ECFDF5",
    borderColor: "#A7F3D0",
  },
  statLabelNeutral: {
    fontSize: 11,
    fontWeight: "600",
    color: "#64748B",
    marginBottom: 3,
  },
  statLabelBlue: {
    fontSize: 11,
    fontWeight: "600",
    color: "#2563EB",
    marginBottom: 3,
  },
  statLabelGreen: {
    fontSize: 11,
    fontWeight: "600",
    color: "#059669",
    marginBottom: 3,
  },
  statValueBold: {
    fontSize: 13.5,
    fontWeight: "800",
    color: "#0F172A",
  },
  statValueBlue: {
    fontSize: 14,
    fontWeight: "800",
    color: "#2563EB",
  },
  statValueGreen: {
    fontSize: 14,
    fontWeight: "800",
    color: "#059669",
  },

  // ── Right Card: Robot Service Card ─────────────────────────────────────────
  robotServiceCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 16,
    gap: 12,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  robotHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  robotIconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: "#2563EB",
    justifyContent: "center",
    alignItems: "center",
  },
  robotHeaderTextWrap: {
    flex: 1,
    gap: 1,
  },
  robotTitle: {
    fontSize: 15.5,
    fontWeight: "800",
    color: "#0F172A",
  },
  robotSubtitle: {
    fontSize: 11.5,
    color: "#64748B",
  },
  robotDescription: {
    color: "#475569",
    fontSize: 13,
    lineHeight: 20,
  },
  robotHighlightShelf: {
    fontWeight: "800",
    color: "#2563EB",
  },
  readyAlertBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#A7F3D0",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  readyAlertText: {
    color: "#059669",
    fontWeight: "700",
    fontSize: 12.5,
    flex: 1,
  },
  unavailableAlertBox: {
    backgroundColor: "#FEF3C7",
    borderWidth: 1,
    borderColor: "#FDE68A",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  unavailableAlertText: {
    color: "#92400E",
    fontWeight: "700",
    fontSize: 12.5,
  },
  errorBox: {
    backgroundColor: "#FEE2E2",
    padding: 10,
    borderRadius: 8,
  },
  actionGroup: {
    gap: 10,
    marginTop: 4,
  },
  btnPrimaryGuidance: {
    backgroundColor: "#2563EB",
    borderRadius: 12,
    minHeight: 46,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
  },
  btnPrimaryGuidanceText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 14,
  },
  btnSecondaryMap: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    minHeight: 46,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
  },
  btnSecondaryMapText: {
    color: "#334155",
    fontWeight: "700",
    fontSize: 13.5,
  },
  btnDisabled: {
    opacity: 0.5,
  },
  btnPressed: {
    opacity: 0.85,
  },
});
