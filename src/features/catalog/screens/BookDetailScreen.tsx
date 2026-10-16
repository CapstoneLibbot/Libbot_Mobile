import {
  Check,
  Lock,
  Map as MapIcon,
  MapPin,
  Zap,
} from "lucide-react-native";
import React, { useMemo, useState } from "react";
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { useKioskStore } from "@/core/state";
import { useCreateGuidanceMission } from "../../../features/guidance/hooks/useCreateGuidanceMission";
import {
  AppEmptyState,
  AppErrorState,
  AppHeader,
  AppLoading,
  AppText,
} from "@/shared/ui";
import { useResponsiveLayout } from "@/shared/layout";
import { colors, radius, spacing } from "@/shared/theme";
import { useBookDetail } from "../hooks/useBookDetail";
import { BookItem } from "../types/catalog.types";

/**
 * Returns tailored cover graphic theme based on book data when no image is available.
 */
function getBookCoverDetailTheme(category: string, title: string, author: string) {
  const catLower = (category || "").toLowerCase();
  const titleLower = (title || "").toLowerCase();

  let bgColor = "#0F172A"; // Dark Navy / Slate
  let topTag = "ARCH";
  let topColor = "#F59E0B"; // Amber
  let midText = "CLEAN ARCH";

  if (titleLower.includes("clean arch")) {
    topTag = "ARCH";
    midText = "CLEAN ARCH";
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
    topTag = (category || "TECH").slice(0, 5).toUpperCase();
    const words = title.split(/[\s:-]+/).filter(Boolean);
    midText = words.slice(0, 2).join(" ").toUpperCase();
  }

  const authorSnippet = author.split("(")[0].trim().split(" ").pop() ?? author;

  return { bgColor, topTag, topColor, midText, authorSnippet };
}

function formatPublisherName(publisher?: string | null): string {
  if (!publisher) return "Chưa cập nhật";
  let clean = publisher.trim();
  if (/^nxb[\s:]+/i.test(clean)) {
    clean = clean.replace(/^nxb[\s:]+/i, "").trim();
  }
  return clean || publisher;
}

export interface BookDetailScreenProps {
  bookId: string;
  onBack: () => void;
  onOpenFacility: (facilityId: string) => void;
  onStartGuidance: (missionId: string) => void;
}

export function BookDetailScreen({
  bookId,
  onBack,
  onOpenFacility,
  onStartGuidance,
}: BookDetailScreenProps): React.ReactElement {
  const { insets, isCompactWidth } = useResponsiveLayout();

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
  const [failedCoverBookId, setFailedCoverBookId] = useState<string | null>(null);
  const [selectedCopyId, setSelectedCopyId] = useState<string | null>(null);

  const hasCoverError = failedCoverBookId === bookId;

  // Synthesize or extract copies from book data
  const copies: BookItem[] = useMemo(() => {
    if (!book) return [];
    if (book.copies && book.copies.length > 0) {
      return book.copies;
    }
    // Fallback if backend does not provide explicit copies
    return [
      {
        id: `${book.id}-c1`,
        barcode: `BC-${book.isbn ? book.isbn.slice(-5) : "94811"}`,
        status: book.available ? "Available" : "Borrowed",
        aisle: book.aisle || "Dãy A",
        shelf: book.shelf || "Kệ A-12",
        shelfSlot: book.shelfSlot || "Ngăn 3",
        floor: book.floor,
        location: null,
      },
    ];
  }, [book]);

  // Statistics
  const totalCopiesCount = book?.totalCopies ?? copies.length;
  const availableCopiesCount =
    book?.availableCopies ??
    copies.filter((c) => c.status.toLowerCase() === "available").length;
  const borrowedCopiesCount = Math.max(
    0,
    totalCopiesCount - availableCopiesCount,
  );

  // Derive effective selected copy ID without cascading renders
  const activeSelectedCopyId = useMemo(() => {
    if (copies.length === 0) return null;
    if (selectedCopyId) {
      const match = copies.find((c) => c.id === selectedCopyId);
      if (match && match.status.toLowerCase() === "available") {
        return match.id;
      }
    }
    const firstAvailable = copies.find(
      (c) => c.status.toLowerCase() === "available",
    );
    return firstAvailable ? firstAvailable.id : null;
  }, [copies, selectedCopyId]);

  const selectedCopy = useMemo(() => {
    return copies.find((c) => c.id === activeSelectedCopyId) ?? null;
  }, [copies, activeSelectedCopyId]);

  const handleSelectCopy = (copy: BookItem) => {
    recordInteraction();
    if (copy.status.toLowerCase() !== "available") {
      return; // Cannot select borrowed copies
    }
    setSelectedCopyId(copy.id);
    setActionError(null);
  };

  const handleRequestGuidance = async () => {
    recordInteraction();
    setActionError(null);

    if (!book) return;

    if (!selectedCopy || selectedCopy.status.toLowerCase() !== "available") {
      setActionError("Vui lòng chọn một bản sao đang có sẵn trên kệ.");
      return;
    }

    try {
      const mission = await createMissionMutation.mutateAsync({
        bookId: book.id,
        kioskSessionId,
        bookItemId: selectedCopy.id,
        targetShelf: selectedCopy.shelf,
        barcode: selectedCopy.barcode,
      });
      onStartGuidance(mission.id);
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
      selectedCopy?.aisle?.toLowerCase().includes("b")
        ? "fac-shelf-r"
        : "fac-shelf-a";
    onOpenFacility(facilityId);
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <AppHeader title="Thông tin sách" onBack={onBack} />
        <AppLoading message="Đang tải thông tin chi tiết sách..." />
      </View>
    );
  }

  if (isError || !book) {
    return (
      <View style={styles.container}>
        <AppHeader title="Thông tin sách" onBack={onBack} />
        {isError ? (
          <AppErrorState
            title="Lỗi tải thông tin sách"
            message={error?.message ?? "Không thể tải chi tiết sách từ hệ thống."}
            onRetry={() => refetch()}
          />
        ) : (
          <AppEmptyState
            title="Không tìm thấy sách"
            message="Mã sách không hợp lệ hoặc đã bị gỡ khỏi hệ thống."
            actionTitle="Quay lại danh sách"
            onAction={onBack}
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
      {/* ═══════════════════════════════════════════════════════════════════════
          ORIGINAL APP HEADER (PRESERVED)
         ═══════════════════════════════════════════════════════════════════════ */}
      <AppHeader
        title={book.title}
        subtitle={`${book.author} • ${book.category}`}
        onBack={() => {
          recordInteraction();
          onBack();
        }}
        backLabel="Quay lại tra cứu"
      />

      <View
        style={[
          styles.mainContent,
          {
            paddingLeft: Math.max(insets.left, spacing.md),
            paddingRight: Math.max(insets.right, spacing.md),
          },
        ]}
      >
        {/* ═══════════════════════════════════════════════════════════════════════
            1. TOP BOOK HEADER CARD
           ═══════════════════════════════════════════════════════════════════════ */}
        <View style={styles.topCard}>
          {/* Left: Cover thumbnail + Title & Metadata pills */}
          <View style={styles.topCardLeft}>
            {/* Book Cover Thumbnail */}
            <View
              style={[
                styles.coverThumbnail,
                { backgroundColor: coverTheme.bgColor },
              ]}
            >
              {book.coverUrl && !hasCoverError ? (
                <Image
                  source={{ uri: book.coverUrl }}
                  style={styles.coverImage}
                  resizeMode="cover"
                  onError={() => setFailedCoverBookId(book.id)}
                />
              ) : (
                <View style={styles.coverGraphic}>
                  <AppText
                    variant="caption"
                    style={[styles.coverGraphicTop, { color: coverTheme.topColor }]}
                  >
                    {coverTheme.topTag}
                  </AppText>
                  <AppText
                    variant="caption"
                    numberOfLines={2}
                    style={styles.coverGraphicMid}
                  >
                    {coverTheme.midText}
                  </AppText>
                  <AppText
                    variant="caption"
                    numberOfLines={1}
                    style={styles.coverGraphicBottom}
                  >
                    {coverTheme.authorSnippet}
                  </AppText>
                </View>
              )}
              <View style={styles.coverSpineSheen} />
            </View>

            {/* Title and Metadata */}
            <View style={styles.topInfoWrap}>
              <View style={styles.titleAuthorRow}>
                <AppText
                  variant="subtitle"
                  style={styles.bookTitleText}
                  numberOfLines={1}
                >
                  {book.title}
                </AppText>
                <AppText variant="body" style={styles.separatorDot}>
                  •
                </AppText>
                <AppText
                  variant="body"
                  style={styles.bookAuthorText}
                  numberOfLines={1}
                >
                  {book.author}
                </AppText>
                {book.category ? (
                  <View style={styles.categoryPill}>
                    <AppText
                      variant="caption"
                      style={styles.categoryPillText}
                      numberOfLines={1}
                    >
                      {book.category}
                    </AppText>
                  </View>
                ) : null}
              </View>

              {/* Metadata Pills */}
              <View style={styles.metadataPillsRow}>
                <View style={styles.metaPill}>
                  <AppText variant="caption" style={styles.metaPillLabel}>
                    ISBN:
                  </AppText>
                  <AppText
                    variant="caption"
                    style={styles.metaPillValue}
                    numberOfLines={1}
                  >
                    {book.isbn || "978-0134494166"}
                  </AppText>
                </View>

                <View style={styles.metaPill}>
                  <AppText variant="caption" style={styles.metaPillLabel}>
                    NXB:
                  </AppText>
                  <AppText
                    variant="caption"
                    style={styles.metaPillValue}
                    numberOfLines={1}
                  >
                    {formatPublisherName(book.publisher)}
                  </AppText>
                </View>

                <View style={styles.metaPill}>
                  <AppText variant="caption" style={styles.metaPillLabel}>
                    Năm:
                  </AppText>
                  <AppText
                    variant="caption"
                    style={styles.metaPillValue}
                    numberOfLines={1}
                  >
                    {book.publishedYear || 2024}
                  </AppText>
                </View>
              </View>
            </View>
          </View>

          {/* Right: Summary Stats Pill */}
          <View style={styles.statsPill}>
            <View style={styles.statsPillItem}>
              <View style={styles.statDotBlue} />
              <AppText
                variant="caption"
                numberOfLines={1}
                style={styles.statTextBold}
              >
                {totalCopiesCount} Bản sao
              </AppText>
            </View>

            <View style={styles.statDivider} />

            <View style={styles.statsPillItem}>
              <View style={styles.statDotGreen} />
              <AppText
                variant="caption"
                numberOfLines={1}
                style={styles.statTextGreen}
              >
                {availableCopiesCount} Có sẵn
              </AppText>
            </View>

            <View style={styles.statDivider} />

            <View style={styles.statsPillItem}>
              <View
                style={
                  borrowedCopiesCount > 0
                    ? styles.statDotAmber
                    : styles.statDotMuted
                }
              />
              <AppText
                variant="caption"
                numberOfLines={1}
                style={
                  borrowedCopiesCount > 0
                    ? styles.statTextAmber
                    : styles.statTextMuted
                }
              >
                {borrowedCopiesCount} Đang mượn
              </AppText>
            </View>
          </View>
        </View>

        {/* ═══════════════════════════════════════════════════════════════════════
            2. SECTION TITLE & LEGEND ROW
           ═══════════════════════════════════════════════════════════════════════ */}
        <View style={styles.sectionHeaderRow}>
          <View style={styles.sectionTitleWrap}>
            <View style={styles.sectionIconBadge}>
              <MapPin size={13} color="#2563EB" />
            </View>
            <View style={styles.sectionTitleTexts}>
              <AppText variant="caption" style={styles.sectionTitleBold}>
                CHỌN BẢN SAO ĐỂ LIBOT DẪN ĐƯỜNG
              </AppText>
              <AppText variant="caption" style={styles.sectionTitleHint}>
                (Bấm thẻ để đổi mục tiêu)
              </AppText>
            </View>
          </View>

          {/* Legend */}
          <View style={styles.legendWrap}>
            <View style={styles.legendItem}>
              <View style={styles.statDotBlue} />
              <AppText variant="caption" style={styles.legendText}>
                Bản đã chọn
              </AppText>
            </View>

            <View style={styles.legendItem}>
              <View style={styles.statDotGreen} />
              <AppText variant="caption" style={styles.legendText}>
                Có sẵn
              </AppText>
            </View>

            <View style={styles.legendItem}>
              <View style={styles.statDotAmber} />
              <AppText variant="caption" style={styles.legendText}>
                Đang mượn
              </AppText>
            </View>
          </View>
        </View>

        {/* Action error banner if needed */}
        {actionError ? (
          <View style={styles.errorBanner}>
            <AppText variant="caption" color={colors.danger}>
              {actionError}
            </AppText>
          </View>
        ) : null}

        {/* ═══════════════════════════════════════════════════════════════════════
            3. COPIES GRID (ADAPTIVE 1 OR 2 COLUMNS)
           ═══════════════════════════════════════════════════════════════════════ */}
        <ScrollView
          style={styles.scrollArea}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View
            style={
              isCompactWidth
                ? styles.cardsColumnCompact
                : copies.length === 1
                  ? styles.cardsSingleLandscape
                  : styles.cardsGridLandscape
            }
          >
            {copies.map((copy) => {
              const isAvailable = copy.status.toLowerCase() === "available";
              const isSelected = copy.id === activeSelectedCopyId;
              const isSingle = !isCompactWidth && copies.length === 1;

              const aisleLabel = copy.aisle || "Dãy A";
              const shelfLabel = copy.shelf || "Kệ A-12";
              const slotLabel = copy.shelfSlot || "Ngăn 1";
              const floorLabel = `Tầng ${copy.floor || 1}`;

              const cardWidthStyle = isSingle
                ? styles.cardSingleWidth
                : isCompactWidth
                  ? styles.cardFullWidth
                  : styles.cardHalfWidth;

              if (isAvailable && isSelected) {
                // ── CARD: SELECTED AVAILABLE ─────────────────────────────────
                return (
                  <Pressable
                    key={copy.id}
                    accessibilityRole="button"
                    accessibilityLabel={`Bản sao ${copy.barcode} đang chọn`}
                    onPress={() => handleSelectCopy(copy)}
                    style={[styles.copyCard, styles.cardSelected, cardWidthStyle]}
                  >
                    <View style={styles.cardIndicatorWrap}>
                      <View style={styles.checkCircleSelected}>
                        <Check size={11} color="#FFFFFF" strokeWidth={2.5} />
                      </View>
                    </View>

                    <View style={styles.cardMain}>
                      <View style={styles.cardHeaderRow}>
                        <View style={styles.barcodeWithTag}>
                          <AppText
                            variant="subtitle"
                            style={styles.barcodeText}
                            numberOfLines={1}
                          >
                            {copy.barcode}
                          </AppText>
                          <View style={styles.selectedPillTag}>
                            <AppText
                              variant="caption"
                              style={styles.selectedTagText}
                            >
                              ĐANG CHỌN
                            </AppText>
                          </View>
                        </View>

                        <View style={styles.badgeAvailable}>
                          <View style={styles.dotAvailable} />
                          <AppText variant="caption" style={styles.textAvailable}>
                            Có sẵn
                          </AppText>
                        </View>
                      </View>

                      <View style={styles.cardLocationRow}>
                        <MapPin
                          size={11}
                          color="#2563EB"
                          style={styles.pinIcon}
                        />
                        <AppText
                          variant="caption"
                          style={styles.locationBreadcrumb}
                          numberOfLines={1}
                        >
                          {aisleLabel} › {shelfLabel} ›{" "}
                        </AppText>
                        <View style={styles.slotPillSelected}>
                          <AppText
                            variant="caption"
                            style={styles.slotPillText}
                          >
                            {slotLabel}
                          </AppText>
                        </View>
                        <View style={styles.floorPill}>
                          <AppText variant="caption" style={styles.floorPillText}>
                            {floorLabel}
                          </AppText>
                        </View>
                      </View>
                    </View>
                  </Pressable>
                );
              }

              if (isAvailable && !isSelected) {
                // ── CARD: UNSELECTED AVAILABLE ───────────────────────────────
                return (
                  <Pressable
                    key={copy.id}
                    accessibilityRole="button"
                    accessibilityLabel={`Chọn bản sao ${copy.barcode}`}
                    onPress={() => handleSelectCopy(copy)}
                    style={({ pressed }) => [
                      styles.copyCard,
                      styles.cardAvailable,
                      cardWidthStyle,
                      pressed && styles.cardPressed,
                    ]}
                  >
                    <View style={styles.cardIndicatorWrap}>
                      <View style={styles.radioCircleUnselected} />
                    </View>

                    <View style={styles.cardMain}>
                      <View style={styles.cardHeaderRow}>
                        <AppText
                          variant="subtitle"
                          style={styles.barcodeText}
                          numberOfLines={1}
                        >
                          {copy.barcode}
                        </AppText>

                        <View style={styles.badgeAvailable}>
                          <View style={styles.dotAvailable} />
                          <AppText variant="caption" style={styles.textAvailable}>
                            Có sẵn
                          </AppText>
                        </View>
                      </View>

                      <View style={styles.cardLocationRow}>
                        <MapPin
                          size={11}
                          color="#94A3B8"
                          style={styles.pinIcon}
                        />
                        <AppText
                          variant="caption"
                          style={styles.locationBreadcrumb}
                          numberOfLines={1}
                        >
                          {aisleLabel} › {shelfLabel} › {slotLabel}
                        </AppText>
                        <View style={styles.floorPill}>
                          <AppText variant="caption" style={styles.floorPillText}>
                            {floorLabel}
                          </AppText>
                        </View>
                      </View>
                    </View>
                  </Pressable>
                );
              }

              // ── CARD: BORROWED / UNAVAILABLE ───────────────────────────────
              return (
                <View
                  key={copy.id}
                  style={[styles.copyCard, styles.cardBorrowed, cardWidthStyle]}
                >
                  <View style={styles.cardIndicatorWrap}>
                    <View style={styles.lockIconBox}>
                      <Lock size={10} color="#94A3B8" />
                    </View>
                  </View>

                  <View style={styles.cardMain}>
                    <View style={styles.cardHeaderRow}>
                      <AppText
                        variant="subtitle"
                        style={styles.barcodeTextBorrowed}
                        numberOfLines={1}
                      >
                        {copy.barcode}
                      </AppText>

                      <View style={styles.badgeBorrowed}>
                        <View style={styles.dotBorrowed} />
                        <AppText variant="caption" style={styles.textBorrowed}>
                          Đang mượn
                        </AppText>
                      </View>
                    </View>

                    <View style={styles.cardLocationRow}>
                      <MapPin
                        size={11}
                        color="#CBD5E1"
                        style={styles.pinIcon}
                      />
                      <AppText
                        variant="caption"
                        style={styles.locationBreadcrumbBorrowed}
                        numberOfLines={1}
                      >
                        {aisleLabel} › {shelfLabel} › {slotLabel}
                      </AppText>
                      <View style={styles.floorPill}>
                        <AppText variant="caption" style={styles.floorPillText}>
                          {floorLabel}
                        </AppText>
                      </View>
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        </ScrollView>
      </View>

      {/* ═══════════════════════════════════════════════════════════════════════
          4. BOTTOM FIXED ACTION BAR
           ═══════════════════════════════════════════════════════════════════════ */}
      <View
        style={[
          styles.bottomActionBar,
          {
            paddingBottom: Math.max(insets.bottom, spacing.sm),
            paddingLeft: Math.max(insets.left, spacing.md),
            paddingRight: Math.max(insets.right, spacing.md),
          },
        ]}
      >
        {/* Left: Destination Info */}
        <View style={styles.destinationBox}>
          <View style={styles.destinationPinSquare}>
            <MapPin size={16} color="#2563EB" />
          </View>
          <View style={styles.destinationTextWrap}>
            <AppText variant="caption" style={styles.destinationLabel}>
              ĐÍCH ĐẾN ĐÃ CHỌN:
            </AppText>
            {selectedCopy ? (
              <AppText variant="subtitle" style={styles.destinationTarget} numberOfLines={1}>
                {selectedCopy.shelf}{" "}
                <AppText variant="body" style={styles.destinationTargetSub}>
                  ({selectedCopy.shelfSlot})
                </AppText>{" "}
                • Mã:{" "}
                <AppText variant="subtitle" style={styles.destinationBarcode}>
                  {selectedCopy.barcode}
                </AppText>
              </AppText>
            ) : (
              <AppText variant="body" style={styles.destinationEmpty} numberOfLines={1}>
                Chưa có bản sao nào được chọn
              </AppText>
            )}
          </View>
        </View>

        {/* Right: Buttons */}
        <View style={styles.actionButtonsWrap}>
          {/* Button: Sơ đồ 2D */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Xem sơ đồ 2D"
            onPress={handleViewShelfMap}
            style={({ pressed }) => [
              styles.btnSecondaryMap,
              pressed && styles.btnPressed,
            ]}
          >
            <MapIcon size={16} color="#334155" />
            <AppText variant="subtitle" style={styles.btnSecondaryMapText}>
              Sơ đồ 2D
            </AppText>
          </Pressable>

          {/* Button: Dẫn đường LiBot */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={
              selectedCopy
                ? `Dẫn đường LiBot tới ${selectedCopy.shelf}`
                : "Dẫn đường LiBot"
            }
            disabled={!selectedCopy || createMissionMutation.isPending}
            onPress={handleRequestGuidance}
            style={({ pressed }) => [
              styles.btnPrimaryGuidance,
              (!selectedCopy || createMissionMutation.isPending) &&
                styles.btnDisabled,
              pressed && styles.btnPressed,
            ]}
          >
            <Zap size={16} color="#FFFFFF" fill="#FFFFFF" />
            <AppText variant="subtitle" style={styles.btnPrimaryGuidanceText}>
              {createMissionMutation.isPending
                ? "Đang khởi tạo chuyến đi..."
                : selectedCopy
                  ? `Dẫn đường LiBot tới ${selectedCopy.shelf}`
                  : "Dẫn đường LiBot"}
            </AppText>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  mainContent: {
    flex: 1,
    paddingTop: spacing.sm,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.lg,
    backgroundColor: "#F8FAFC",
  },

  /* ── 1. Top Book Header Card ────────────────────────────────────────────── */
  topCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    paddingVertical: 10,
    paddingHorizontal: 14,
    gap: 12,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  topCardLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    minWidth: 0,
    gap: 12,
  },
  coverThumbnail: {
    width: 44,
    height: 60,
    borderRadius: 6,
    overflow: "hidden",
    position: "relative",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  coverImage: {
    width: "100%",
    height: "100%",
  },
  coverGraphic: {
    width: "100%",
    height: "100%",
    padding: 3,
    justifyContent: "space-between",
  },
  coverGraphicTop: {
    fontSize: 7.5,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  coverGraphicMid: {
    fontSize: 8.5,
    fontWeight: "800",
    color: "#FFFFFF",
    lineHeight: 10,
  },
  coverGraphicBottom: {
    fontSize: 7.5,
    color: "#94A3B8",
  },
  coverSpineSheen: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 3.5,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
  },
  topInfoWrap: {
    flex: 1,
    minWidth: 0,
    justifyContent: "center",
    gap: 5,
  },
  titleAuthorRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "nowrap",
    gap: 6,
    minWidth: 0,
  },
  bookTitleText: {
    fontWeight: "700",
    color: "#0F172A",
    fontSize: 15,
    flexShrink: 1,
  },
  separatorDot: {
    color: "#CBD5E1",
    fontSize: 13,
  },
  bookAuthorText: {
    color: "#475569",
    fontSize: 13,
    fontWeight: "500",
    flexShrink: 2,
  },
  categoryPill: {
    backgroundColor: "#F1F5F9",
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 1.5,
  },
  categoryPillText: {
    color: "#475569",
    fontSize: 11,
    fontWeight: "600",
  },
  metadataPillsRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
  },
  metaPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  metaPillLabel: {
    color: "#94A3B8",
    fontSize: 11,
    fontWeight: "500",
  },
  metaPillValue: {
    color: "#334155",
    fontSize: 11.5,
    fontWeight: "600",
  },

  /* ── Right: Summary Stats Pill ─────────────────────────────────────────── */
  statsPill: {
    flexShrink: 0,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 999,
    paddingVertical: 5.5,
    paddingHorizontal: 14,
    gap: 8,
  },
  statsPillItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexShrink: 0,
  },
  statDotBlue: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#2563EB",
  },
  statDotGreen: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#10B981",
  },
  statDotAmber: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#F59E0B",
  },
  statDotMuted: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#94A3B8",
  },
  statTextBold: {
    fontWeight: "700",
    color: "#1E293B",
    fontSize: 12.5,
  },
  statTextGreen: {
    fontWeight: "700",
    color: "#059669",
    fontSize: 12.5,
  },
  statTextAmber: {
    fontWeight: "600",
    color: "#B45309",
    fontSize: 12,
  },
  statTextMuted: {
    fontWeight: "500",
    color: "#94A3B8",
    fontSize: 12,
  },
  statDivider: {
    width: 1,
    height: 12,
    backgroundColor: "#CBD5E1",
    marginHorizontal: 1,
  },

  /* ── 2. Section Header & Legend Row ────────────────────────────────────── */
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 10,
    marginBottom: 8,
  },
  sectionTitleWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  sectionIconBadge: {
    width: 24,
    height: 24,
    borderRadius: 6,
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#DBEAFE",
    justifyContent: "center",
    alignItems: "center",
  },
  sectionTitleTexts: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  sectionTitleBold: {
    fontWeight: "800",
    color: "#0F172A",
    fontSize: 12.5,
    letterSpacing: 0.3,
  },
  sectionTitleHint: {
    color: "#64748B",
    fontSize: 11.5,
    fontWeight: "400",
  },
  legendWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  legendText: {
    color: "#475569",
    fontSize: 11.5,
    fontWeight: "500",
  },

  errorBanner: {
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FCA5A5",
    borderRadius: radius.sm,
    padding: spacing.xs,
    marginBottom: spacing.xs,
  },

  /* ── 3. Copies Grid ────────────────────────────────────────────────────── */
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: spacing.sm,
  },
  cardsGridLandscape: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 8,
  },
  cardsSingleLandscape: {
    flexDirection: "column",
    width: "100%",
  },
  cardsColumnCompact: {
    flexDirection: "column",
    gap: 8,
  },
  cardSingleWidth: {
    width: "100%",
  },
  cardHalfWidth: {
    width: "49.2%",
  },
  cardFullWidth: {
    width: "100%",
  },
  copyCard: {
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    minHeight: 62,
  },
  cardIndicatorWrap: {
    marginRight: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  cardMain: {
    flex: 1,
    justifyContent: "center",
    gap: 4,
  },
  cardHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  cardLocationRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  pinIcon: {
    marginRight: 4,
  },

  /* ── Selected Card Styles ── */
  cardSelected: {
    backgroundColor: "#F0F7FF",
    borderWidth: 1.5,
    borderColor: "#2563EB",
    shadowColor: "#2563EB",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  },
  checkCircleSelected: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#2563EB",
    justifyContent: "center",
    alignItems: "center",
  },
  barcodeWithTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  barcodeText: {
    fontWeight: "700",
    color: "#0F172A",
    fontSize: 15,
  },
  selectedPillTag: {
    backgroundColor: "#2563EB",
    borderRadius: 999,
    paddingHorizontal: 7,
    paddingVertical: 1.5,
  },
  selectedTagText: {
    color: "#FFFFFF",
    fontSize: 9.5,
    fontWeight: "800",
    letterSpacing: 0.4,
  },
  locationBreadcrumb: {
    color: "#475569",
    fontSize: 12.5,
    fontWeight: "500",
  },
  slotPillSelected: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  slotPillText: {
    color: "#0F172A",
    fontSize: 12,
    fontWeight: "700",
  },
  floorPill: {
    backgroundColor: "#F1F5F9",
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 1,
    marginLeft: 8,
  },
  floorPillText: {
    color: "#64748B",
    fontSize: 11,
    fontWeight: "600",
  },

  /* ── Available Unselected Card Styles ── */
  cardAvailable: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  cardPressed: {
    opacity: 0.85,
    borderColor: "#93C5FD",
  },
  radioCircleUnselected: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: "#CBD5E1",
    backgroundColor: "#FFFFFF",
  },

  /* ── Borrowed Card Styles ── */
  cardBorrowed: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    opacity: 0.85,
  },
  lockIconBox: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#F1F5F9",
    justifyContent: "center",
    alignItems: "center",
  },
  barcodeTextBorrowed: {
    fontWeight: "600",
    color: "#94A3B8",
    fontSize: 14.5,
    textDecorationLine: "line-through",
  },
  locationBreadcrumbBorrowed: {
    color: "#94A3B8",
    fontSize: 12,
  },

  /* ── Badges ── */
  badgeAvailable: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ECFDF5",
    borderWidth: 1,
    borderColor: "#BBF7D0",
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    gap: 4.5,
  },
  dotAvailable: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: "#16A34A",
  },
  textAvailable: {
    color: "#15803D",
    fontSize: 11.5,
    fontWeight: "600",
  },
  badgeBorrowed: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEF3C7",
    borderWidth: 1,
    borderColor: "#FDE68A",
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    gap: 4.5,
  },
  dotBorrowed: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: "#D97706",
  },
  textBorrowed: {
    color: "#B45309",
    fontSize: 11.5,
    fontWeight: "600",
  },

  /* ── 4. Bottom Action Bar ───────────────────────────────────────────────── */
  bottomActionBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
    paddingTop: 8,
  },
  destinationBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
    minWidth: 0,
  },
  destinationPinSquare: {
    width: 34,
    height: 34,
    borderRadius: 6,
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#DBEAFE",
    justifyContent: "center",
    alignItems: "center",
  },
  destinationTextWrap: {
    justifyContent: "center",
    minWidth: 0,
  },
  destinationLabel: {
    color: "#64748B",
    fontSize: 10.5,
    fontWeight: "700",
    letterSpacing: 0.4,
  },
  destinationTarget: {
    color: "#0F172A",
    fontWeight: "700",
    fontSize: 13.5,
  },
  destinationTargetSub: {
    color: "#475569",
    fontWeight: "500",
  },
  destinationBarcode: {
    color: "#2563EB",
    fontWeight: "800",
  },
  destinationEmpty: {
    color: "#94A3B8",
    fontSize: 12.5,
  },
  actionButtonsWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexShrink: 0,
  },
  btnSecondaryMap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    height: 40,
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: "#CBD5E1",
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
  },
  btnSecondaryMapText: {
    color: "#334155",
    fontWeight: "700",
    fontSize: 13.5,
  },
  btnPrimaryGuidance: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    height: 40,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: "#2563EB",
    justifyContent: "center",
    shadowColor: "#2563EB",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 2,
  },
  btnPrimaryGuidanceText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 13.5,
  },
  btnDisabled: {
    opacity: 0.5,
    backgroundColor: "#94A3B8",
    shadowOpacity: 0,
    elevation: 0,
  },
  btnPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
});
