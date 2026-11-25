import { LayoutGrid, List } from "lucide-react-native";
import React, { useMemo, useState } from "react";
import { FlatList, Pressable, StyleSheet, View } from "react-native";
import { getCatalogRepository } from "@/core/composition";
import { useKioskStore } from "@/core/state";
import { getFriendlyErrorMessage } from "@/services/api/apiError";
import { useResponsiveLayout } from "@/shared/layout";
import { useDebounce } from "@/shared/lib";
import { spacing } from "@/shared/theme";
import {
  AppEmptyState,
  AppErrorState,
  AppLoading,
  AppText,
} from "@/shared/ui";
import {
  BookGridCard,
  BookListRow,
  CatalogCategoryBar,
  CatalogFilterModal,
  CatalogSearchBar,
  SortByOption,
} from "../components";
import { useBookSearch } from "../hooks/useBookSearch";
import { useCategories } from "../hooks/useCategories";
import { Book } from "../types/catalog.types";

export interface CatalogSearchScreenProps {
  onSelectBook: (bookId: string) => void;
  onStartGuidance: (endpointId: string) => void;
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
  const currentColumns = isMultiColumn ? 2 : 1;

  const [searchInput, setSearchInput] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [onlyAvailable, setOnlyAvailable] = useState(false);
  const [sortBy, setSortBy] = useState<SortByOption>("default");

  const debouncedQuery = useDebounce(searchInput, 300);
  const recordInteraction = useKioskStore((state) => state.recordInteraction);

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
      const detail = await getCatalogRepository().getById(book.id);
      const firstLocatedCopy = detail?.copies?.find(
        (copy) => copy.status === "Available" && copy.endpoint,
      );
      if (!detail || !firstLocatedCopy) {
        handleViewDetail(book.id);
        return;
      }
      onStartGuidance(firstLocatedCopy.endpoint!.endpointId);
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

  return (
    <View style={styles.container}>
      {/* 1. Unified Single-Row Top Search Bar */}
      <CatalogSearchBar
        searchInput={searchInput}
        onChangeSearchInput={handleSearchChange}
        onClearSearch={handleClearSearch}
        onBackToIdle={() => {
          recordInteraction();
          onBackToIdle();
        }}
        onOpenFilterModal={() => {
          recordInteraction();
          setIsFilterModalOpen(true);
        }}
        isFilterActive={onlyAvailable || sortBy !== "default"}
        paddingTop={Math.max(insets.top, spacing.xs) + 4}
        paddingLeft={Math.max(insets.left, tokens.pagePaddingHorizontal)}
        paddingRight={Math.max(insets.right, tokens.pagePaddingHorizontal)}
      />

      {/* 2. Category Filter Pills Row */}
      <CatalogCategoryBar
        categories={categories}
        selectedCategory={selectedCategory}
        onSelectCategory={handleCategorySelect}
        totalCount={totalCount}
        paddingLeft={Math.max(insets.left, tokens.pagePaddingHorizontal)}
        paddingRight={Math.max(insets.right, tokens.pagePaddingHorizontal)}
      />

      {/* 3. Section Header & Results */}
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
              viewMode === "grid" ? (
                <BookGridCard
                  book={item}
                  onViewDetail={handleViewDetail}
                  onRequestGuidance={handleRequestGuidance}
                />
              ) : (
                <BookListRow
                  book={item}
                  onViewDetail={handleViewDetail}
                  onRequestGuidance={handleRequestGuidance}
                />
              )
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

      {/* 4. Quick Filter & Sort Modal */}
      <CatalogFilterModal
        visible={isFilterModalOpen}
        onlyAvailable={onlyAvailable}
        sortBy={sortBy}
        onToggleOnlyAvailable={(val) => setOnlyAvailable(val)}
        onSelectSortBy={(sort) => setSortBy(sort)}
        onReset={() => {
          setOnlyAvailable(false);
          setSortBy("default");
        }}
        onClose={() => setIsFilterModalOpen(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  resultsSection: {
    flex: 1,
  },
  resultsCountRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
    marginTop: 4,
  },
  resultsTitleGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  resultsSectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0F172A",
  },
  resultsCountSubText: {
    fontSize: 12,
    color: "#64748B",
  },
  viewToggleContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F1F5F9",
    borderRadius: 8,
    padding: 2,
    gap: 2,
  },
  viewToggleBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  viewToggleBtnActive: {
    backgroundColor: "#FFFFFF",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
  },
  rowWrapper: {
    justifyContent: "space-between",
  },
  listContent: {
    paddingTop: 4,
  },
});
