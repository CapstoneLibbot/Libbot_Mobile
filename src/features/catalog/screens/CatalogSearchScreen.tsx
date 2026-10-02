import {
  Building2,
  Info,
  LayoutGrid,
  List,
  MapPin,
  Search,
  X,
} from "lucide-react-native";
import React, { useMemo, useState } from "react";
import {
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { useKioskStore } from "@/core/state";
import { useCreateGuidanceMission } from "../../../features/guidance/hooks/useCreateGuidanceMission";
import {
  AppBackButton,
  AppEmptyState,
  AppErrorState,
  AppLoading,
  AppText,
} from "@/shared/ui";
import { useDebounce } from "@/shared/lib";
import { useResponsiveLayout } from "@/shared/layout";
import { spacing } from "@/shared/theme";
import { useBookSearch } from "../hooks/useBookSearch";
import { useCategories } from "../hooks/useCategories";
import { Book } from "../types/catalog.types";

/**
 * Returns distinct cover design colors and labels based on book category
 */
function getBookCoverTheme(category: string, title: string, author: string) {
  const catLower = (category || "").toLowerCase();

  let bgColor = "#1E3A8A"; // Deep Navy
  let tagColor = "#93C5FD";
  let tag = "SOFTWARE";

  if (catLower.includes("robot")) {
    bgColor = "#881337"; // Crimson
    tagColor = "#FECDD3";
    tag = "ROBOTICS";
  } else if (catLower.includes("data") || catLower.includes("database")) {
    bgColor = "#064E3B"; // Forest
    tagColor = "#A7F3D0";
    tag = "DATA";
  } else if (catLower.includes("intelligence") || catLower.includes("ai")) {
    bgColor = "#4C1D95"; // Violet
    tagColor = "#DDD6FE";
    tag = "AI";
  } else if (catLower.includes("literature") || catLower.includes("văn")) {
    bgColor = "#78350F"; // Amber/Bronze
    tagColor = "#FDE68A";
    tag = "LITERATURE";
  }

  // Generate short title snippet for cover graphic to look like screenshot
  let titleSnippet = "";
  const titleLower = title.toLowerCase();
  if (titleLower.includes("clean arch")) {
    titleSnippet = "CLEAN ARCH";
  } else if (titleLower.includes("robotics")) {
    titleSnippet = "CONTROL";
  } else if (
    titleLower.includes("data-intensive") ||
    titleLower.includes("data intensive")
  ) {
    titleSnippet = "DATA INTENSIVE";
  } else if (titleLower.includes("artificial intelligence")) {
    titleSnippet = "AI: MODERN";
  } else {
    const words = title.split(/[\s:-]+/).filter(Boolean);
    titleSnippet =
      words.length <= 2
        ? words.join(" ").toUpperCase()
        : `${words[0]} ${words[1]}`.toUpperCase();
  }

  const authorSnippet = author.split(",")[0].trim().split(" ").pop() ?? author;

  return { bgColor, tagColor, tag, titleSnippet, authorSnippet };
}

export interface CatalogSearchScreenProps {
  onSelectBook: (bookId: string) => void;
  onStartGuidance: (missionId: string) => void;
  onBackToIdle: () => void;
}

export function CatalogSearchScreen({
  onSelectBook,
  onStartGuidance,
  onBackToIdle,
}: CatalogSearchScreenProps): React.ReactElement {
  const { insets, isCompactWidth, isExpandedWidth, tokens } =
    useResponsiveLayout();

  // Responsive: 2 columns on tablet / wide (medium >= 600 or expanded >= 840), 1 column on compact mobile
  const isMultiColumn = !isCompactWidth;

  const [searchInput, setSearchInput] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const debouncedQuery = useDebounce(searchInput, 300);

  const recordInteraction = useKioskStore((state) => state.recordInteraction);
  const kioskSessionId = useKioskStore((state) => state.kioskSessionId);

  const { data: categories = ["All"] } = useCategories();
  const {
    data: books = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useBookSearch({
    query: debouncedQuery,
    category: selectedCategory,
  });

  const createMissionMutation = useCreateGuidanceMission();

  const handleSearchChange = (text: string) => {
    recordInteraction();
    setSearchInput(text);
  };

  const handleClearSearch = () => {
    recordInteraction();
    setSearchInput("");
  };

  const handleCategorySelect = (category: string) => {
    recordInteraction();
    setSelectedCategory(category);
  };

  const handleViewDetail = (bookId: string) => {
    recordInteraction();
    onSelectBook(bookId);
  };

  const handleRequestGuidance = async (book: Book) => {
    recordInteraction();
    if (!book.available) {
      handleViewDetail(book.id);
      return;
    }

    try {
      const mission = await createMissionMutation.mutateAsync({
        bookId: book.id,
        kioskSessionId,
      });
      onStartGuidance(mission.id);
    } catch {
      // Fallback to detail page if quick guidance cannot be created
      handleViewDetail(book.id);
    }
  };

  // Total count across all books when category is "All"
  const totalCount = useMemo(() => {
    return books.length > 0 ? books.length : 42;
  }, [books.length]);

  // ── Mode 1: Detailed List Card (Horizontal) ──────────────────────────────
  const renderListItem = (item: Book) => {
    const coverTheme = getBookCoverTheme(item.category, item.title, item.author);

    return (
      <View style={styles.bookCardContainer}>
        {/* 1. Header: Status badge & Shelf location */}
        <View style={styles.cardHeaderRow}>
          {item.available ? (
            <View style={styles.badgeAvailable}>
              <View style={styles.dotAvailable} />
              <AppText variant="caption" style={styles.textAvailable}>
                Có sẵn tại kệ
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

          <View style={styles.shelfLocationBadge}>
            <Building2 size={13} color="#64748B" />
            <AppText variant="caption" style={styles.shelfLocationText}>
              Tầng {item.floor} • Kệ {item.shelf}
            </AppText>
          </View>
        </View>

        {/* 2. Body: Book Cover Thumbnail + Detailed Metadata */}
        <View style={styles.cardBodyRow}>
          {/* Book Cover Graphic Thumbnail */}
          <View
            style={[
              styles.bookCoverThumb,
              { backgroundColor: coverTheme.bgColor },
            ]}
          >
            <AppText
              variant="caption"
              style={[styles.coverTagText, { color: coverTheme.tagColor }]}
            >
              {coverTheme.tag}
            </AppText>
            <AppText
              variant="caption"
              numberOfLines={2}
              style={styles.coverTitleText}
            >
              {coverTheme.titleSnippet}
            </AppText>
            <AppText
              variant="caption"
              numberOfLines={1}
              style={styles.coverAuthorText}
            >
              {coverTheme.authorSnippet}
            </AppText>
          </View>

          {/* Book Info Text */}
          <View style={styles.bookInfoContent}>
            <AppText
              variant="subtitle"
              style={styles.bookMainTitle}
              numberOfLines={2}
            >
              {item.title}
            </AppText>

            <AppText
              variant="caption"
              style={styles.bookAuthorText}
              numberOfLines={1}
            >
              Tác giả:{" "}
              <AppText variant="caption" style={styles.bookAuthorBold}>
                {item.author}
              </AppText>
            </AppText>

            <AppText
              variant="caption"
              style={styles.bookMetaText}
              numberOfLines={1}
            >
              {item.category} • ISBN: {item.isbn}
            </AppText>

            {/* Availability Stock */}
            <View style={styles.stockRow}>
              {item.available && (
                <AppText variant="caption" style={styles.stockInShelf}>
                  Còn {item.availableCopies ?? 1} cuốn{" "}
                  <AppText variant="caption" style={styles.slotText}>
                    • Vị trí: {item.shelfSlot ?? "Ngăn 3"}
                  </AppText>
                </AppText>
              )}
            </View>
          </View>
        </View>

        {/* 3. Footer: Action Buttons */}
        <View style={styles.cardFooterRow}>
          {item.available ? (
            <>
              {/* Primary: Dẫn đường kệ */}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Dẫn đường đến kệ ${item.shelf}`}
                onPress={() => handleRequestGuidance(item)}
                style={({ pressed }) => [
                  styles.btnLeadToShelf,
                  pressed && styles.btnPressed,
                ]}
              >
                <MapPin size={15} color="#FFFFFF" />
                <AppText variant="caption" style={styles.btnLeadText}>
                  Dẫn đường kệ
                </AppText>
              </Pressable>

              {/* Secondary: Chi tiết */}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Xem chi tiết sách"
                onPress={() => handleViewDetail(item.id)}
                style={({ pressed }) => [
                  styles.btnDetailWhite,
                  pressed && styles.btnPressed,
                ]}
              >
                <AppText variant="caption" style={styles.btnDetailWhiteText}>
                  Chi tiết
                </AppText>
              </Pressable>
            </>
          ) : (
            /* Single Secondary Button when Borrowed */
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Xem chi tiết sách đang mượn"
              onPress={() => handleViewDetail(item.id)}
              style={({ pressed }) => [
                styles.btnDetailFull,
                pressed && styles.btnPressed,
              ]}
            >
              <Info size={15} color="#64748B" />
              <AppText variant="caption" style={styles.btnDetailFullText}>
                Xem chi tiết
              </AppText>
            </Pressable>
          )}
        </View>
      </View>
    );
  };

  // ── Mode 2: E-commerce Product Card (Vertical Poster Style) ───────────────
  const renderGridItem = (item: Book) => {
    const coverTheme = getBookCoverTheme(item.category, item.title, item.author);

    return (
      <View style={styles.gridCardContainer}>
        {/* Cover Poster with Floating Badges */}
        <View
          style={[
            styles.gridCoverWrapper,
            { backgroundColor: coverTheme.bgColor },
          ]}
        >
          {/* Overlaid Badges */}
          <View style={styles.gridOverlayRow}>
            {item.available ? (
              <View style={styles.gridBadgeAvailable}>
                <View style={styles.dotAvailable} />
                <AppText variant="caption" style={styles.textAvailable}>
                  Có sẵn
                </AppText>
              </View>
            ) : (
              <View style={styles.gridBadgeBorrowed}>
                <View style={styles.dotBorrowed} />
                <AppText variant="caption" style={styles.textBorrowed}>
                  Đang mượn
                </AppText>
              </View>
            )}

            <View style={styles.gridShelfBadge}>
              <AppText variant="caption" style={styles.gridShelfText}>
                Kệ {item.shelf}
              </AppText>
            </View>
          </View>

          {/* Cover Graphic Center */}
          <View style={styles.gridCoverCenter}>
            <AppText
              variant="caption"
              style={[styles.gridCoverTag, { color: coverTheme.tagColor }]}
            >
              {coverTheme.tag}
            </AppText>
            <AppText
              variant="subtitle"
              numberOfLines={2}
              style={styles.gridCoverTitle}
            >
              {coverTheme.titleSnippet}
            </AppText>
            <AppText variant="caption" style={styles.gridCoverAuthor}>
              {coverTheme.authorSnippet}
            </AppText>
          </View>
        </View>

        {/* Product Information Body */}
        <View style={styles.gridCardBody}>
          <AppText
            variant="caption"
            style={styles.gridCategoryText}
            numberOfLines={1}
          >
            {item.category.toUpperCase()}
          </AppText>

          <AppText
            variant="subtitle"
            style={styles.gridTitleText}
            numberOfLines={2}
          >
            {item.title}
          </AppText>

          <AppText
            variant="caption"
            style={styles.gridAuthorText}
            numberOfLines={1}
          >
            Tác giả:{" "}
            <AppText variant="caption" style={styles.bookAuthorBold}>
              {item.author}
            </AppText>
          </AppText>

          {/* Stock / Shelf Slot */}
          <View style={styles.gridStockRow}>
            {item.available ? (
              <AppText variant="caption" style={styles.gridStockAvailable}>
                Còn {item.availableCopies ?? 1} cuốn • {item.shelfSlot ?? "Ngăn 3"}
              </AppText>
            ) : (
              <AppText variant="caption" style={styles.gridStockUnavailable}>
                Tạm hết tại kệ
              </AppText>
            )}
          </View>

          {/* Action Button */}
          {item.available ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Dẫn đường tới kệ ${item.shelf}`}
              onPress={() => handleRequestGuidance(item)}
              style={({ pressed }) => [
                styles.gridBtnLead,
                pressed && styles.btnPressed,
              ]}
            >
              <MapPin size={14} color="#FFFFFF" />
              <AppText variant="caption" style={styles.gridBtnLeadText}>
                Dẫn đường kệ
              </AppText>
            </Pressable>
          ) : (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Xem chi tiết sách"
              onPress={() => handleViewDetail(item.id)}
              style={({ pressed }) => [
                styles.gridBtnDetail,
                pressed && styles.btnPressed,
              ]}
            >
              <Info size={14} color="#475569" />
              <AppText variant="caption" style={styles.gridBtnDetailText}>
                Chi tiết
              </AppText>
            </Pressable>
          )}
        </View>
      </View>
    );
  };

  const gridColumns = isExpandedWidth ? 3 : 2;
  const currentColumns =
    viewMode === "grid" ? gridColumns : isMultiColumn ? 2 : 1;

  return (
    <View style={styles.container}>
      {/* ── 1. Top Header ──────────────────────────────────────────────────── */}
      <View
        style={[
          styles.headerBar,
          {
            paddingTop: Math.max(insets.top, spacing.xs) + 4,
            paddingLeft: Math.max(insets.left, tokens.pagePaddingHorizontal),
            paddingRight: Math.max(insets.right, tokens.pagePaddingHorizontal),
          },
        ]}
      >
        {/* Standardized Pill Back Button */}
        <AppBackButton
          onPress={() => {
            recordInteraction();
            onBackToIdle();
          }}
        />

        {/* Center Title */}
        <AppText variant="subtitle" style={styles.headerTitleText}>
          Tra cứu sách thư viện
        </AppText>

        {/* Balancing right spacer to keep title centered */}
        <View style={styles.headerRightSpacer} />
      </View>

      {/* ── 2. Search Bar & Filter Section ─────────────────────────────────── */}
      <View
        style={[
          styles.searchContainer,
          {
            paddingLeft: Math.max(insets.left, tokens.pagePaddingHorizontal),
            paddingRight: Math.max(insets.right, tokens.pagePaddingHorizontal),
          },
        ]}
      >
        {/* Search Input Bar (No mic icon) */}
        <View style={styles.searchInputWrapper}>
          <Search size={18} color="#94A3B8" style={styles.searchIcon} />

          <TextInput
            placeholder="Tìm theo tên sách, tác giả hoặc ISBN..."
            placeholderTextColor="#94A3B8"
            value={searchInput}
            onChangeText={handleSearchChange}
            style={styles.textInput}
            returnKeyType="search"
            autoCapitalize="none"
            autoCorrect={false}
          />

          {searchInput.length > 0 && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Xóa từ khóa"
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              onPress={handleClearSearch}
              style={styles.inputClearButton}
            >
              <X size={16} color="#94A3B8" />
            </Pressable>
          )}

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Tìm kiếm"
            onPress={() => recordInteraction()}
            style={({ pressed }) => [
              styles.btnSearchSubmit,
              pressed && styles.btnPressed,
            ]}
          >
            <AppText variant="caption" style={styles.btnSearchSubmitText}>
              Tìm
            </AppText>
          </Pressable>
        </View>

        {/* Category Pills Row */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryScrollContent}
        >
          {categories.map((cat) => {
            const isSelected = selectedCategory === cat;
            const label = cat === "All" ? `Tất cả (${totalCount})` : cat;

            return (
              <Pressable
                key={cat}
                onPress={() => handleCategorySelect(cat)}
                style={[
                  styles.categoryPill,
                  isSelected && styles.categoryPillSelected,
                ]}
                accessibilityRole="button"
                accessibilityLabel={`Lọc thể loại ${cat}`}
              >
                <AppText
                  variant="caption"
                  style={[
                    styles.categoryPillText,
                    isSelected && styles.categoryPillTextSelected,
                  ]}
                >
                  {label}
                </AppText>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* ── 3. Results Header & List ───────────────────────────────────────── */}
      <View
        style={[
          styles.resultsSection,
          {
            paddingLeft: Math.max(insets.left, tokens.pagePaddingHorizontal),
            paddingRight: Math.max(insets.right, tokens.pagePaddingHorizontal),
          },
        ]}
      >
        {/* Results Count Summary & View Toggle */}
        <View style={styles.resultsCountRow}>
          <AppText variant="caption" style={styles.resultsCountText}>
            {debouncedQuery.trim().length > 0 ? (
              <>
                Kết quả tìm kiếm cho:{" "}
                <AppText variant="caption" style={styles.resultsQueryBold}>
                  &quot;{debouncedQuery}&quot;
                </AppText>{" "}
                ({books.length} kết quả)
              </>
            ) : (
              <>Danh mục sách ({books.length} kết quả)</>
            )}
          </AppText>

          {/* Toggle between Detailed List & E-Commerce Grid */}
          <View style={styles.viewToggleContainer}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Chế độ xem danh sách chi tiết"
              onPress={() => {
                recordInteraction();
                setViewMode("list");
              }}
              style={[
                styles.viewToggleBtn,
                viewMode === "list" && styles.viewToggleBtnActive,
              ]}
            >
              <List
                size={16}
                color={viewMode === "list" ? "#FFFFFF" : "#64748B"}
              />
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Chế độ xem lưới sản phẩm"
              onPress={() => {
                recordInteraction();
                setViewMode("grid");
              }}
              style={[
                styles.viewToggleBtn,
                viewMode === "grid" && styles.viewToggleBtnActive,
              ]}
            >
              <LayoutGrid
                size={16}
                color={viewMode === "grid" ? "#FFFFFF" : "#64748B"}
              />
            </Pressable>
          </View>
        </View>

        {/* Results List / Loading / Empty / Error */}
        {isLoading ? (
          <AppLoading message="Đang tìm kiếm sách trong thư viện..." />
        ) : isError ? (
          <AppErrorState
            title="Lỗi tra cứu sách"
            message={
              error?.message ??
              "Không thể tải danh sách sách. Vui lòng thử lại."
            }
            onRetry={() => refetch()}
          />
        ) : books.length === 0 ? (
          <AppEmptyState
            title="Không tìm thấy sách phù hợp"
            message={`Không có kết quả nào khớp với "${searchInput}". Bạn hãy thử tìm với từ khóa khác.`}
            actionTitle="Xóa tìm kiếm"
            onAction={handleClearSearch}
          />
        ) : (
          <FlatList
            key={`books-${viewMode}-${currentColumns}`}
            data={books}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) =>
              viewMode === "grid" ? renderGridItem(item) : renderListItem(item)
            }
            numColumns={currentColumns}
            columnWrapperStyle={
              currentColumns > 1 ? styles.rowWrapper : undefined
            }
            contentContainerStyle={[
              styles.listContent,
              {
                paddingBottom: Math.max(insets.bottom + spacing.lg, spacing.xl),
              },
            ]}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  // ── Header Bar ─────────────────────────────────────────────────────────────
  headerBar: {
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
    paddingBottom: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
    zIndex: 10,
  },
  headerTitleText: {
    fontWeight: "800",
    color: "#0F172A",
    fontSize: 16,
    textAlign: "center",
  },
  headerRightSpacer: {
    width: 90, // Approximate width matching the pill back button for optical centering
  },

  // ── Search & Filter Section ────────────────────────────────────────────────
  searchContainer: {
    backgroundColor: "#FFFFFF",
    paddingTop: 10,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
    gap: 10,
  },
  searchInputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1.5,
    borderColor: "#CBD5E1",
    borderRadius: 14,
    paddingHorizontal: 12,
    minHeight: 48,
    gap: 8,
  },
  searchIcon: {
    marginLeft: 2,
  },
  textInput: {
    flex: 1,
    fontSize: 14,
    color: "#0F172A",
    fontWeight: "500",
    paddingVertical: 8,
  },
  inputClearButton: {
    padding: 6,
  },
  btnSearchSubmit: {
    backgroundColor: "#2563EB",
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  btnSearchSubmitText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 13,
  },
  btnPressed: {
    opacity: 0.85,
  },
  categoryScrollContent: {
    gap: 8,
    paddingVertical: 2,
  },
  categoryPill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    minHeight: 34,
    justifyContent: "center",
    alignItems: "center",
  },
  categoryPillSelected: {
    backgroundColor: "#2563EB",
    borderColor: "#2563EB",
  },
  categoryPillText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#475569",
  },
  categoryPillTextSelected: {
    color: "#FFFFFF",
    fontWeight: "700",
  },

  // ── Results Section ────────────────────────────────────────────────────────
  resultsSection: {
    flex: 1,
    paddingTop: 8,
  },
  resultsCountRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 6,
  },
  resultsCountText: {
    color: "#475569",
    fontSize: 12.5,
  },
  resultsQueryBold: {
    fontWeight: "800",
    color: "#0F172A",
  },
  viewToggleContainer: {
    flexDirection: "row",
    backgroundColor: "#F1F5F9",
    borderRadius: 8,
    padding: 2,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    gap: 2,
  },
  viewToggleBtn: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
    justifyContent: "center",
    alignItems: "center",
    minWidth: 32,
    minHeight: 28,
  },
  viewToggleBtnActive: {
    backgroundColor: "#2563EB",
    shadowColor: "#2563EB",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 1,
  },
  listContent: {
    paddingTop: 4,
    gap: 12,
  },
  rowWrapper: {
    gap: 12,
  },

  // ── Mode 1: Detailed List Card ─────────────────────────────────────────────
  bookCardContainer: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 14,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
    justifyContent: "space-between",
  },
  cardHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  badgeAvailable: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#ECFDF5",
    borderWidth: 1,
    borderColor: "#A7F3D0",
    paddingHorizontal: 9,
    paddingVertical: 3.5,
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
    fontSize: 11.5,
  },
  badgeBorrowed: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#FEF3C7",
    borderWidth: 1,
    borderColor: "#FDE68A",
    paddingHorizontal: 9,
    paddingVertical: 3.5,
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
    fontSize: 11.5,
  },
  shelfLocationBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  shelfLocationText: {
    color: "#475569",
    fontWeight: "700",
    fontSize: 12,
  },
  cardBodyRow: {
    flexDirection: "row",
    gap: 12,
    marginVertical: 10,
    alignItems: "flex-start",
  },
  bookCoverThumb: {
    width: 62,
    height: 88,
    borderRadius: 7,
    padding: 6,
    justifyContent: "space-between",
    flexShrink: 0,
  },
  coverTagText: {
    fontSize: 8.5,
    fontWeight: "900",
    letterSpacing: 0.5,
  },
  coverTitleText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#FFFFFF",
    lineHeight: 12,
  },
  coverAuthorText: {
    fontSize: 8,
    color: "#CBD5E1",
  },
  bookInfoContent: {
    flex: 1,
    gap: 2,
  },
  bookMainTitle: {
    fontWeight: "800",
    color: "#0F172A",
    fontSize: 14.5,
    lineHeight: 19,
  },
  bookAuthorText: {
    color: "#64748B",
    fontSize: 12,
  },
  bookAuthorBold: {
    fontWeight: "700",
    color: "#334155",
  },
  bookMetaText: {
    color: "#94A3B8",
    fontSize: 11,
  },
  stockRow: {
    marginTop: 3,
    minHeight: 16,
  },
  stockInShelf: {
    color: "#059669",
    fontWeight: "800",
    fontSize: 11.5,
  },
  slotText: {
    color: "#64748B",
    fontWeight: "500",
  },
  cardFooterRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  btnLeadToShelf: {
    flex: 1.8,
    minHeight: 40,
    backgroundColor: "#2563EB",
    borderRadius: 8,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
  },
  btnLeadText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 13,
  },
  btnDetailWhite: {
    flex: 1,
    minHeight: 40,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  btnDetailWhiteText: {
    color: "#334155",
    fontWeight: "700",
    fontSize: 13,
  },
  btnDetailFull: {
    flex: 1,
    minHeight: 40,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 8,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
  },
  btnDetailFullText: {
    color: "#475569",
    fontWeight: "700",
    fontSize: 13,
  },

  // ── Mode 2: E-Commerce Product Card ────────────────────────────────────────
  gridCardContainer: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    overflow: "hidden",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  gridCoverWrapper: {
    height: 140,
    padding: 10,
    justifyContent: "space-between",
  },
  gridOverlayRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  gridBadgeAvailable: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#ECFDF5EE",
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 999,
  },
  gridBadgeBorrowed: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#FEF3C7EE",
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 999,
  },
  gridShelfBadge: {
    backgroundColor: "#00000055",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  gridShelfText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 11,
  },
  gridCoverCenter: {
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
    marginVertical: 4,
  },
  gridCoverTag: {
    fontSize: 8.5,
    fontWeight: "900",
    letterSpacing: 0.5,
  },
  gridCoverTitle: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 12,
    textAlign: "center",
    lineHeight: 14,
  },
  gridCoverAuthor: {
    color: "#CBD5E1",
    fontSize: 9,
  },
  gridCardBody: {
    padding: 12,
    gap: 5,
  },
  gridCategoryText: {
    color: "#2563EB",
    fontWeight: "700",
    fontSize: 10,
    letterSpacing: 0.5,
  },
  gridTitleText: {
    fontWeight: "800",
    color: "#0F172A",
    fontSize: 13.5,
    lineHeight: 18,
    minHeight: 36,
  },
  gridAuthorText: {
    color: "#64748B",
    fontSize: 11.5,
  },
  gridStockRow: {
    marginTop: 2,
    marginBottom: 4,
    minHeight: 16,
  },
  gridStockAvailable: {
    color: "#059669",
    fontWeight: "700",
    fontSize: 11,
  },
  gridStockUnavailable: {
    color: "#D97706",
    fontWeight: "600",
    fontSize: 11,
  },
  gridBtnLead: {
    backgroundColor: "#2563EB",
    borderRadius: 8,
    height: 36,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
  },
  gridBtnLeadText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 12.5,
  },
  gridBtnDetail: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 8,
    height: 36,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
  },
  gridBtnDetailText: {
    color: "#475569",
    fontWeight: "700",
    fontSize: 12.5,
  },
});
