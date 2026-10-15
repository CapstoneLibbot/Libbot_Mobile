import {
  Check,
  Compass,
  Eye,
  Info,
  LayoutGrid,
  List,
  MapPin,
  RotateCcw,
  Search,
  Settings,
  X,
} from "lucide-react-native";
import React, { useMemo, useState } from "react";
import {
  FlatList,
  Image,
  Modal,
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
import { getFriendlyErrorMessage } from "@/services/api/apiError";

/**
 * Returns distinct cover design colors, abbreviations, and labels based on book category
 */
function getBookCoverTheme(category: string, title: string, author: string) {
  const catLower = (category || "").toLowerCase();

  let bgColor = "#1E3A8A"; // Deep Navy
  let tagColor = "#93C5FD";
  let tag = "SOFTWARE";
  let shortAbbr = "SE";

  if (catLower.includes("robot")) {
    bgColor = "#881337"; // Crimson
    tagColor = "#FECDD3";
    tag = "ROBOTICS";
    shortAbbr = "ROB";
  } else if (catLower.includes("data") || catLower.includes("database")) {
    bgColor = "#064E3B"; // Forest
    tagColor = "#A7F3D0";
    tag = "DATA";
    shortAbbr = "DATA";
  } else if (catLower.includes("intelligence") || catLower.includes("ai")) {
    bgColor = "#4C1D95"; // Violet
    tagColor = "#DDD6FE";
    tag = "AI";
    shortAbbr = "AI";
  } else if (catLower.includes("literature") || catLower.includes("văn")) {
    bgColor = "#78350F"; // Amber/Bronze
    tagColor = "#FDE68A";
    tag = "LITERATURE";
    shortAbbr = "LIT";
  }

  // Generate short title snippet dynamically for stylized cover graphic
  const words = title.split(/[\s:-]+/).filter(Boolean);
  const titleSnippet =
    words.length === 0
      ? "BOOK"
      : words.length <= 2
        ? words.join(" ").toUpperCase()
        : `${words[0]} ${words[1]}`.toUpperCase();

  const authorSnippet = author.split(",")[0].trim().split(" ").pop() ?? author;

  return { bgColor, tagColor, tag, shortAbbr, titleSnippet, authorSnippet };
}

interface BookCoverThumbProps {
  coverUrl?: string;
  category: string;
  title: string;
  author: string;
  width: number;
  height: number;
}

/**
 * Renders real book cover image when available with automatic fallback
 * to a category-themed stylized mini physical book cover.
 */
function BookCoverThumb({
  coverUrl,
  category,
  title,
  author,
  width,
  height,
}: BookCoverThumbProps): React.ReactElement {
  const [hasError, setHasError] = useState(false);
  const coverTheme = useMemo(
    () => getBookCoverTheme(category, title, author),
    [category, title, author],
  );

  const isMini = width < 52;

  if (coverUrl && !hasError) {
    return (
      <View style={[styles.bookCoverThumbWrapper, { width, height }]}>
        <Image
          source={{ uri: coverUrl }}
          style={styles.bookCoverImage}
          resizeMode="cover"
          onError={() => setHasError(true)}
        />
        <View style={styles.bookSpineSheen} />
      </View>
    );
  }

  return (
    <View
      style={[
        styles.bookCoverThumbWrapper,
        {
          width,
          height,
          backgroundColor: coverTheme.bgColor,
        },
      ]}
    >
      <View style={styles.bookSpineSheen} />
      <AppText
        variant="caption"
        style={[
          styles.coverTagText,
          { color: coverTheme.tagColor, fontSize: isMini ? 6.5 : 8 },
        ]}
      >
        {coverTheme.tag}
      </AppText>
      <AppText
        variant="caption"
        numberOfLines={2}
        style={[
          styles.coverTitleText,
          { fontSize: isMini ? 8 : 9.5, lineHeight: isMini ? 10 : 12 },
        ]}
      >
        {coverTheme.titleSnippet}
      </AppText>
      <AppText
        variant="caption"
        numberOfLines={1}
        style={[
          styles.coverAuthorText,
          { fontSize: isMini ? 6 : 7.5 },
        ]}
      >
        {coverTheme.authorSnippet}
      </AppText>
    </View>
  );
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
  const { insets, isCompactWidth, tokens } = useResponsiveLayout();

  // Responsive: 2 columns on tablet / wide, 1 column on compact phone
  const isMultiColumn = !isCompactWidth;

  const [searchInput, setSearchInput] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [onlyAvailable, setOnlyAvailable] = useState(false);
  const [sortBy, setSortBy] = useState<"default" | "title" | "author">("default");

  const debouncedQuery = useDebounce(searchInput, 300);

  const recordInteraction = useKioskStore((state) => state.recordInteraction);
  const kioskSessionId = useKioskStore((state) => state.kioskSessionId);

  const { data: categories = ["All"] } = useCategories();
  const {
    data: rawBooks = [],
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
      handleViewDetail(book.id);
    }
  };

  // Filter and sort books based on options
  const books = useMemo(() => {
    let result = [...rawBooks];

    if (onlyAvailable) {
      result = result.filter((b) => b.available);
    }

    if (sortBy === "title") {
      result.sort((a, b) => a.title.localeCompare(b.title));
    } else if (sortBy === "author") {
      result.sort((a, b) => a.author.localeCompare(b.author));
    }

    return result;
  }, [rawBooks, onlyAvailable, sortBy]);

  // Total count for "All" category pill
  const totalCount = useMemo(() => {
    return rawBooks.length;
  }, [rawBooks.length]);

  // ── Mode 1: Compact Grid Card ──────────────────────────────────────────────
  const renderGridCard = (item: Book) => {
    return (
      <View style={styles.gridCard}>
        {/* 1. Card Header: Category Badge (Left) & Status Badge (Right) */}
        <View style={styles.cardHeaderRow}>
          <View style={styles.categoryBadge}>
            <AppText
              variant="caption"
              style={styles.categoryBadgeText}
              numberOfLines={1}
            >
              {item.category}
            </AppText>
          </View>

          {item.available ? (
            <View style={styles.badgeAvailable}>
              <View style={styles.dotAvailable} />
              <AppText variant="caption" style={styles.textAvailable}>
                Có sẵn
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
        </View>

        {/* 2. Card Body: Book Cover Thumbnail + Detailed Metadata */}
        <Pressable
          onPress={() => handleViewDetail(item.id)}
          style={styles.cardBodyRow}
          accessibilityRole="button"
          accessibilityLabel={`Xem chi tiết ${item.title}`}
        >
          {/* Mini Book Cover (Photo or Stylized Cover) */}
          <BookCoverThumb
            coverUrl={item.coverUrl}
            category={item.category}
            title={item.title}
            author={item.author}
            width={58}
            height={80}
          />

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
              Mã ISBN: {item.isbn}
            </AppText>

            {/* Availability Stock */}
            <View style={styles.stockRow}>
              {item.available ? (
                <AppText variant="caption" style={styles.stockInShelf}>
                  Còn {item.availableCopies ?? 1} cuốn
                </AppText>
              ) : (
                <AppText variant="caption" style={styles.stockBorrowed}>
                  Đang mượn
                </AppText>
              )}
            </View>
          </View>
        </Pressable>

        {/* 3. Card Footer: Action Buttons */}
        <View style={styles.cardFooterRow}>
          {item.available ? (
            <>
              {/* Primary: Dẫn đường */}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Dẫn đường tìm sách ${item.title}`}
                onPress={() => handleRequestGuidance(item)}
                style={({ pressed }) => [
                  styles.btnLeadToShelf,
                  pressed && styles.btnPressed,
                ]}
              >
                <Compass size={14} color="#FFFFFF" />
                <AppText variant="caption" style={styles.btnLeadText}>
                  Dẫn đường
                </AppText>
              </Pressable>

              {/* Secondary: Chi tiết */}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Xem chi tiết ${item.title}`}
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
            /* Single Full-width Secondary Button when Borrowed */
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Xem chi tiết ${item.title}`}
              onPress={() => handleViewDetail(item.id)}
              style={({ pressed }) => [
                styles.btnDetailFull,
                pressed && styles.btnPressed,
              ]}
            >
              <Eye size={14} color="#64748B" />
              <AppText variant="caption" style={styles.btnDetailFullText}>
                Xem chi tiết sách
              </AppText>
            </Pressable>
          )}
        </View>
      </View>
    );
  };

  // ── Mode 2: Ultra-compact List Row ────────────────────────────────────────
  const renderListCompactItem = (item: Book) => {
    return (
      <Pressable
        onPress={() => handleViewDetail(item.id)}
        style={({ pressed }) => [
          styles.listRowCard,
          pressed && styles.listRowPressed,
        ]}
        accessibilityRole="button"
        accessibilityLabel={`Xem chi tiết ${item.title}`}
      >
        {/* Mini Book Cover (Photo or Stylized Cover) */}
        <BookCoverThumb
          coverUrl={item.coverUrl}
          category={item.category}
          title={item.title}
          author={item.author}
          width={46}
          height={64}
        />

        {/* Center: Book Metadata */}
        <View style={styles.compactInfoContent}>
          <AppText
            variant="subtitle"
            style={styles.compactMainTitle}
            numberOfLines={1}
          >
            {item.title}
          </AppText>
          <AppText
            variant="caption"
            style={styles.compactSubtitle}
            numberOfLines={1}
          >
            {item.author} • {item.category}
          </AppText>
          <View style={styles.compactStatusRow}>
            {item.available ? (
              <AppText variant="caption" style={styles.compactAvailableText}>
                Có sẵn ({item.availableCopies ?? 1} cuốn)
              </AppText>
            ) : (
              <AppText variant="caption" style={styles.compactBorrowedText}>
                Đang mượn
              </AppText>
            )}
          </View>
        </View>

        {/* Right: Quick Action Button */}
        <View style={styles.compactActionGroup}>
          {item.available ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Dẫn đường tìm sách ${item.title}`}
              onPress={(e) => {
                e.stopPropagation();
                handleRequestGuidance(item);
              }}
              style={({ pressed }) => [
                styles.compactBtnLead,
                pressed && styles.btnPressed,
              ]}
            >
              <MapPin size={12} color="#FFFFFF" />
              <AppText variant="caption" style={styles.compactBtnLeadText}>
                Dẫn đường
              </AppText>
            </Pressable>
          ) : (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Xem chi tiết ${item.title}`}
              onPress={(e) => {
                e.stopPropagation();
                handleViewDetail(item.id);
              }}
              style={({ pressed }) => [
                styles.compactBtnDetail,
                pressed && styles.btnPressed,
              ]}
            >
              <Info size={12} color="#64748B" />
              <AppText variant="caption" style={styles.compactBtnDetailText}>
                Chi tiết
              </AppText>
            </Pressable>
          )}
        </View>
      </Pressable>
    );
  };

  const currentColumns = isMultiColumn ? 2 : 1;

  return (
    <View style={styles.container}>
      {/* ── 1. Unified Single-Row Top Bar ──────────────────────────────────── */}
      <View
        style={[
          styles.topBarContainer,
          {
            paddingTop: Math.max(insets.top, spacing.xs) + 4,
            paddingLeft: Math.max(insets.left, tokens.pagePaddingHorizontal),
            paddingRight: Math.max(insets.right, tokens.pagePaddingHorizontal),
          },
        ]}
      >
        {/* Pill Back Button */}
        <AppBackButton
          onPress={() => {
            recordInteraction();
            onBackToIdle();
          }}
          style={styles.headerBackButton}
        />

        {/* Search Input Bar with embedded "Tìm" button */}
        <View style={styles.searchInputWrapper}>
          <Search size={15} color="#94A3B8" style={styles.searchIcon} />

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
              <X size={14} color="#94A3B8" />
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

        {/* Settings / Quick Filter Icon Button */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Bộ lọc và tùy chọn hiển thị"
          onPress={() => {
            recordInteraction();
            setIsFilterModalOpen(true);
          }}
          style={({ pressed }) => [
            styles.btnSettings,
            pressed && styles.btnPressed,
            (onlyAvailable || sortBy !== "default") && styles.btnSettingsActive,
          ]}
        >
          <Settings
            size={17}
            color={
              onlyAvailable || sortBy !== "default" ? "#2563EB" : "#475569"
            }
          />
        </Pressable>
      </View>

      {/* ── 2. Category Filter Pills Row ───────────────────────────────────── */}
      <View
        style={[
          styles.categoryBar,
          {
            paddingLeft: Math.max(insets.left, tokens.pagePaddingHorizontal),
            paddingRight: Math.max(insets.right, tokens.pagePaddingHorizontal),
          },
        ]}
      >
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

      {/* ── 3. Section Header & Results ────────────────────────────────────── */}
      <View
        style={[
          styles.resultsSection,
          {
            paddingLeft: Math.max(insets.left, tokens.pagePaddingHorizontal),
            paddingRight: Math.max(insets.right, tokens.pagePaddingHorizontal),
          },
        ]}
      >
        {/* Results Title & View Mode Toggle */}
        <View style={styles.resultsCountRow}>
          <View style={styles.resultsTitleGroup}>
            <AppText variant="subtitle" style={styles.resultsSectionTitle}>
              Danh mục sách
            </AppText>
            <AppText variant="caption" style={styles.resultsCountSubText}>
              ({books.length} kết quả)
            </AppText>
          </View>

          {/* View Toggle: Grid Card vs Compact List */}
          <View style={styles.viewToggleContainer}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Chế độ xem lưới thẻ"
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
                color={viewMode === "grid" ? "#2563EB" : "#94A3B8"}
              />
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Chế độ xem danh sách gọn"
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
                color={viewMode === "list" ? "#2563EB" : "#94A3B8"}
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
              error
                ? getFriendlyErrorMessage(error)
                : "Không thể tải danh sách sách. Vui lòng thử lại."
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
              viewMode === "grid"
                ? renderGridCard(item)
                : renderListCompactItem(item)
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

      {/* ── 4. Quick Filter & Sort Modal (Triggered by ⚙️) ──────────────────── */}
      <Modal
        visible={isFilterModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsFilterModalOpen(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setIsFilterModalOpen(false)}
        >
          <Pressable
            style={styles.modalContent}
            onPress={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <AppText variant="subtitle" style={styles.modalTitle}>
                Tùy chọn hiển thị & lọc
              </AppText>
              <Pressable
                onPress={() => setIsFilterModalOpen(false)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <X size={18} color="#64748B" />
              </Pressable>
            </View>

            {/* Filter: Only Available */}
            <View style={styles.modalSection}>
              <AppText variant="caption" style={styles.modalSectionLabel}>
                Trạng thái sách
              </AppText>
              <View style={styles.modalOptionRow}>
                <Pressable
                  onPress={() => setOnlyAvailable(false)}
                  style={[
                    styles.modalFilterPill,
                    !onlyAvailable && styles.modalFilterPillActive,
                  ]}
                >
                  <AppText
                    variant="caption"
                    style={[
                      styles.modalFilterPillText,
                      !onlyAvailable && styles.modalFilterPillTextActive,
                    ]}
                  >
                    Tất cả sách
                  </AppText>
                </Pressable>
                <Pressable
                  onPress={() => setOnlyAvailable(true)}
                  style={[
                    styles.modalFilterPill,
                    onlyAvailable && styles.modalFilterPillActive,
                  ]}
                >
                  <AppText
                    variant="caption"
                    style={[
                      styles.modalFilterPillText,
                      onlyAvailable && styles.modalFilterPillTextActive,
                    ]}
                  >
                    Chỉ sách có sẵn
                  </AppText>
                </Pressable>
              </View>
            </View>

            {/* Sort Options */}
            <View style={styles.modalSection}>
              <AppText variant="caption" style={styles.modalSectionLabel}>
                Sắp xếp theo
              </AppText>
              <View style={styles.modalSortOptions}>
                {[
                  { key: "default", label: "Mặc định (theo kết quả tìm)" },
                  { key: "title", label: "Tên sách (A → Z)" },
                  { key: "author", label: "Tác giả (A → Z)" },
                ].map((opt) => (
                  <Pressable
                    key={opt.key}
                    onPress={() =>
                      setSortBy(opt.key as "default" | "title" | "author")
                    }
                    style={styles.modalSortRow}
                  >
                    <AppText
                      variant="caption"
                      style={[
                        styles.modalSortText,
                        sortBy === opt.key && styles.modalSortTextActive,
                      ]}
                    >
                      {opt.label}
                    </AppText>
                    {sortBy === opt.key && (
                      <Check size={16} color="#2563EB" />
                    )}
                  </Pressable>
                ))}
              </View>
            </View>

            {/* Modal Footer Actions */}
            <View style={styles.modalFooter}>
              <Pressable
                onPress={() => {
                  setOnlyAvailable(false);
                  setSortBy("default");
                }}
                style={styles.modalResetBtn}
              >
                <RotateCcw size={14} color="#64748B" />
                <AppText variant="caption" style={styles.modalResetText}>
                  Đặt lại
                </AppText>
              </Pressable>
              <Pressable
                onPress={() => setIsFilterModalOpen(false)}
                style={styles.modalApplyBtn}
              >
                <AppText variant="caption" style={styles.modalApplyText}>
                  Áp dụng
                </AppText>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },

  // ── 1. Unified Single-Row Top Bar ──────────────────────────────────────────
  topBarContainer: {
    backgroundColor: "#FFFFFF",
    paddingBottom: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
    zIndex: 10,
  },
  headerBackButton: {
    minHeight: 38,
    paddingHorizontal: 12,
  },
  searchInputWrapper: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1.5,
    borderColor: "#CBD5E1",
    borderRadius: 12,
    paddingLeft: 10,
    paddingRight: 4,
    height: 40,
    gap: 6,
  },
  searchIcon: {
    marginLeft: 2,
  },
  textInput: {
    flex: 1,
    fontSize: 13,
    color: "#0F172A",
    fontWeight: "500",
    paddingVertical: 4,
  },
  inputClearButton: {
    padding: 4,
  },
  btnSearchSubmit: {
    backgroundColor: "#2563EB",
    paddingHorizontal: 14,
    height: 30,
    borderRadius: 7,
    justifyContent: "center",
    alignItems: "center",
  },
  btnSearchSubmitText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 12,
  },
  btnSettings: {
    width: 38,
    height: 38,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
  },
  btnSettingsActive: {
    borderColor: "#2563EB",
    backgroundColor: "#EFF6FF",
  },
  btnPressed: {
    opacity: 0.85,
  },

  // ── 2. Category Filter Pills Row ───────────────────────────────────────────
  categoryBar: {
    backgroundColor: "#FFFFFF",
    paddingVertical: 7,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  categoryScrollContent: {
    gap: 8,
    paddingVertical: 2,
  },
  categoryPill: {
    paddingHorizontal: 13,
    paddingVertical: 5.5,
    borderRadius: 999,
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    minHeight: 32,
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

  // ── 3. Section Header & Results ────────────────────────────────────────────
  resultsSection: {
    flex: 1,
    paddingTop: 6,
  },
  resultsCountRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 6,
  },
  resultsTitleGroup: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 6,
  },
  resultsSectionTitle: {
    fontWeight: "800",
    color: "#0F172A",
    fontSize: 14.5,
  },
  resultsCountSubText: {
    color: "#64748B",
    fontSize: 12.5,
    fontWeight: "500",
  },
  viewToggleContainer: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    padding: 2,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    gap: 2,
  },
  viewToggleBtn: {
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: 6,
    justifyContent: "center",
    alignItems: "center",
    minWidth: 28,
    minHeight: 26,
  },
  viewToggleBtnActive: {
    backgroundColor: "#EFF6FF",
  },
  listContent: {
    paddingTop: 4,
    gap: 10,
  },
  rowWrapper: {
    gap: 10,
  },

  // ── Mode 1: Compact Grid Card (Cards 1 & 2 from screenshot) ────────────────
  gridCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 12,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
    justifyContent: "space-between",
    gap: 9,
  },
  cardHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  badgeAvailable: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4.5,
    backgroundColor: "#ECFDF5",
    borderWidth: 1,
    borderColor: "#A7F3D0",
    paddingHorizontal: 8,
    paddingVertical: 3,
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
    fontSize: 11,
  },
  badgeBorrowed: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4.5,
    backgroundColor: "#FEF3C7",
    borderWidth: 1,
    borderColor: "#FDE68A",
    paddingHorizontal: 8,
    paddingVertical: 3,
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
    fontSize: 11,
  },
  categoryBadge: {
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    maxWidth: "58%",
  },
  categoryBadgeText: {
    color: "#475569",
    fontWeight: "600",
    fontSize: 11,
  },
  cardBodyRow: {
    flexDirection: "row",
    gap: 10,
    alignItems: "flex-start",
  },
  bookCoverThumbWrapper: {
    borderRadius: 6,
    overflow: "hidden",
    flexShrink: 0,
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    position: "relative",
    padding: 4,
    justifyContent: "space-between",
  },
  bookCoverImage: {
    ...StyleSheet.absoluteFill,
    width: "100%",
    height: "100%",
  },
  bookSpineSheen: {
    position: "absolute",
    top: 0,
    left: 0,
    bottom: 0,
    width: 3.5,
    backgroundColor: "rgba(255, 255, 255, 0.3)",
    borderRightWidth: 0.5,
    borderRightColor: "rgba(0, 0, 0, 0.15)",
    zIndex: 2,
  },
  coverTagText: {
    fontSize: 8,
    fontWeight: "900",
    letterSpacing: 0.5,
  },
  coverTitleText: {
    fontSize: 9.5,
    fontWeight: "800",
    color: "#FFFFFF",
    lineHeight: 12,
  },
  coverAuthorText: {
    fontSize: 7.5,
    color: "#CBD5E1",
  },
  bookInfoContent: {
    flex: 1,
    gap: 2,
  },
  bookMainTitle: {
    fontWeight: "800",
    color: "#0F172A",
    fontSize: 13.5,
    lineHeight: 18,
  },
  bookAuthorText: {
    color: "#64748B",
    fontSize: 11.5,
  },
  bookAuthorBold: {
    fontWeight: "700",
    color: "#1E293B",
  },
  bookMetaText: {
    color: "#94A3B8",
    fontSize: 10.5,
  },
  stockRow: {
    marginTop: 2,
    minHeight: 15,
  },
  stockInShelf: {
    color: "#059669",
    fontWeight: "700",
    fontSize: 11,
  },
  stockBorrowed: {
    color: "#D97706",
    fontWeight: "700",
    fontSize: 11,
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
    flex: 2.2,
    height: 36,
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
    fontSize: 12.5,
  },
  btnDetailWhite: {
    flex: 1,
    height: 36,
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
    fontSize: 12.5,
  },
  btnDetailFull: {
    flex: 1,
    height: 36,
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
    fontSize: 12.5,
  },

  // ── Mode 2: Ultra-compact List Row (Cards 3 & 4 from screenshot) ───────────
  listRowCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    paddingHorizontal: 12,
    paddingVertical: 9,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },
  listRowPressed: {
    backgroundColor: "#F8FAFC",
  },
  compactThumbBadge: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    justifyContent: "center",
    alignItems: "center",
    flexShrink: 0,
  },
  compactThumbText: {
    color: "#475569",
    fontWeight: "800",
    fontSize: 12,
    letterSpacing: 0.5,
  },
  compactInfoContent: {
    flex: 1,
    gap: 1.5,
  },
  compactMainTitle: {
    fontWeight: "700",
    color: "#0F172A",
    fontSize: 13,
  },
  compactSubtitle: {
    color: "#64748B",
    fontSize: 11,
  },
  compactStatusRow: {
    marginTop: 1,
  },
  compactAvailableText: {
    color: "#059669",
    fontSize: 10.5,
    fontWeight: "600",
  },
  compactBorrowedText: {
    color: "#D97706",
    fontSize: 10.5,
    fontWeight: "600",
  },
  compactActionGroup: {
    flexShrink: 0,
  },
  compactBtnLead: {
    height: 32,
    paddingHorizontal: 11,
    backgroundColor: "#2563EB",
    borderRadius: 7,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  compactBtnLeadText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 11.5,
  },
  compactBtnDetail: {
    height: 32,
    paddingHorizontal: 11,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 7,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  compactBtnDetailText: {
    color: "#64748B",
    fontWeight: "600",
    fontSize: 11.5,
  },

  // ── Modal Styles ───────────────────────────────────────────────────────────
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.45)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    width: "100%",
    maxWidth: 380,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 18,
    gap: 16,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
    paddingBottom: 10,
  },
  modalTitle: {
    fontWeight: "800",
    color: "#0F172A",
    fontSize: 15,
  },
  modalSection: {
    gap: 8,
  },
  modalSectionLabel: {
    color: "#64748B",
    fontWeight: "700",
    fontSize: 12,
  },
  modalOptionRow: {
    flexDirection: "row",
    gap: 8,
  },
  modalFilterPill: {
    flex: 1,
    height: 34,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: "#F8FAFC",
    justifyContent: "center",
    alignItems: "center",
  },
  modalFilterPillActive: {
    borderColor: "#2563EB",
    backgroundColor: "#EFF6FF",
  },
  modalFilterPillText: {
    color: "#64748B",
    fontWeight: "600",
    fontSize: 12,
  },
  modalFilterPillTextActive: {
    color: "#2563EB",
    fontWeight: "700",
  },
  modalSortOptions: {
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 10,
    overflow: "hidden",
  },
  modalSortRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  modalSortText: {
    color: "#475569",
    fontWeight: "500",
    fontSize: 12.5,
  },
  modalSortTextActive: {
    color: "#2563EB",
    fontWeight: "700",
  },
  modalFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
    paddingTop: 12,
    gap: 10,
  },
  modalResetBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    height: 36,
  },
  modalResetText: {
    color: "#64748B",
    fontWeight: "600",
    fontSize: 12,
  },
  modalApplyBtn: {
    flex: 1,
    height: 36,
    backgroundColor: "#2563EB",
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  modalApplyText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 12.5,
  },
});

