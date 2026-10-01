import { router } from 'expo-router';
import React, { useState } from 'react';
import {
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useKioskStore } from '../../../core/store/kioskStore';
import { useNetworkStatus } from '../../../infrastructure/network/useNetworkStatus';
import {
  AppButton,
  AppCard,
  AppEmptyState,
  AppErrorState,
  AppHeader,
  AppInput,
  AppLoading,
  AppText,
  StatusBadge,
} from '../../../shared/components';
import { useDebounce } from '../../../shared/hooks/useDebounce';
import { useResponsiveLayout } from '../../../shared/hooks/useResponsiveLayout';
import { colors, spacing } from '../../../shared/theme';
import { useBookSearch } from '../hooks/useBookSearch';
import { useCategories } from '../hooks/useCategories';
import { Book } from '../types/catalog.types';

export function CatalogSearchScreen(): React.ReactElement {
  const { insets, isCompactWidth, isExpandedWidth, tokens } = useResponsiveLayout();
  const isTablet = isExpandedWidth;

  const [searchInput, setSearchInput] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const debouncedQuery = useDebounce(searchInput, 300);
  const recordInteraction = useKioskStore((state) => state.recordInteraction);
  const { isConnected } = useNetworkStatus();

  const { data: categories = ['All'] } = useCategories();
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

  const handleSearchChange = (text: string) => {
    recordInteraction();
    setSearchInput(text);
  };

  const handleCategorySelect = (category: string) => {
    recordInteraction();
    setSelectedCategory(category);
  };

  const renderBookItem = ({ item }: { item: Book }) => (
    <AppCard
      style={styles.bookCard}
      padding={isCompactWidth ? 'compact' : 'normal'}
    >
      <View style={styles.cardHeader}>
        <StatusBadge
          label={item.available ? 'Có sẵn tại kệ' : 'Đang được mượn'}
          tone={item.available ? 'success' : 'danger'}
        />
        <AppText variant="caption" color={colors.subtext}>
          Tầng {item.floor} • Kệ {item.shelf}
        </AppText>
      </View>

      <AppText variant="subtitle" style={styles.bookTitle} numberOfLines={2}>
        {item.title}
      </AppText>
      <AppText variant="body" color={colors.textSecondary} numberOfLines={1}>
        Tác giả: {item.author}
      </AppText>
      <AppText variant="caption" color={colors.subtext} numberOfLines={1}>
        {item.category} • ISBN: {item.isbn}
      </AppText>

      <View style={styles.cardFooter}>
        <AppButton
          title="Xem chi tiết"
          variant="secondary"
          size="md"
          onPress={() => {
            recordInteraction();
            router.push(`/(kiosk)/catalog/${item.id}`);
          }}
          style={styles.detailButton}
        />
      </View>
    </AppCard>
  );

  return (
    <View style={styles.container}>
      <AppHeader
        title="Tra cứu sách thư viện"
        subtitle={
          isConnected
            ? 'Tìm theo tên sách, tác giả, ISBN hoặc thể loại'
            : 'Đang ngoại tuyến'
        }
        backLabel="Màn hình chờ"
        onBack={() => {
          recordInteraction();
          router.replace('/(kiosk)/idle');
        }}
      />

      {/* Top Search & Filter Bar */}
      <View
        style={[
          styles.searchSection,
          {
            paddingLeft: Math.max(insets.left, tokens.pagePaddingHorizontal),
            paddingRight: Math.max(insets.right, tokens.pagePaddingHorizontal),
          },
        ]}
      >
        <AppInput
          label={isCompactWidth ? undefined : 'Từ khóa tìm kiếm'}
          placeholder="Tìm tên sách, tác giả hoặc ISBN..."
          value={searchInput}
          onChangeText={handleSearchChange}
          onClear={() => handleSearchChange('')}
        />

        {/* Category Filter Chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryList}
        >
          {categories.map((cat) => {
            const isSelected = selectedCategory === cat;
            return (
              <Pressable
                key={cat}
                onPress={() => handleCategorySelect(cat)}
                style={[
                  styles.categoryChip,
                  isSelected && styles.categoryChipSelected,
                ]}
                accessibilityRole="button"
                accessibilityLabel={`Lọc thể loại ${cat === 'All' ? 'Tất cả' : cat}`}
              >
                <AppText
                  variant="caption"
                  color={isSelected ? colors.surface : colors.textSecondary}
                  style={isSelected ? styles.categoryTextSelected : undefined}
                >
                  {cat === 'All' ? 'Tất cả thể loại' : cat}
                </AppText>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* Results View */}
      <View
        style={[
          styles.resultsSection,
          {
            paddingLeft: Math.max(insets.left, tokens.pagePaddingHorizontal),
            paddingRight: Math.max(insets.right, tokens.pagePaddingHorizontal),
          },
        ]}
      >
        {isLoading ? (
          <AppLoading message="Đang tìm kiếm sách trong thư viện..." />
        ) : isError ? (
          <AppErrorState
            title="Lỗi tra cứu sách"
            message={error?.message ?? 'Không thể tải danh sách sách. Vui lòng thử lại.'}
            onRetry={() => refetch()}
          />
        ) : books.length === 0 ? (
          <AppEmptyState
            title="Không tìm thấy sách phù hợp"
            message={`Không có kết quả nào khớp với "${searchInput}". Bạn hãy thử tìm với từ khóa khác.`}
            actionTitle="Xóa tìm kiếm"
            onAction={() => handleSearchChange('')}
          />
        ) : (
          <FlatList
            key={isTablet ? 'books-tablet-2' : 'books-phone-1'}
            data={books}
            keyExtractor={(item) => item.id}
            renderItem={renderBookItem}
            numColumns={isTablet ? 2 : 1}
            columnWrapperStyle={isTablet ? styles.rowWrapper : undefined}
            contentContainerStyle={[
              styles.listContent,
              {
                paddingBottom: Math.max(insets.bottom + spacing.xl, spacing.xxl),
                gap: tokens.contentGap,
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
    backgroundColor: colors.background,
  },
  searchSection: {
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    gap: spacing.sm,
  },
  categoryList: {
    gap: spacing.xs,
    paddingVertical: spacing.xs,
  },
  categoryChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 20,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.borderLight,
    minHeight: 44,
    minWidth: 44,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  categoryChipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  categoryTextSelected: {
    fontWeight: '700',
  },
  resultsSection: {
    flex: 1,
  },
  listContent: {
    paddingTop: spacing.md,
  },
  rowWrapper: {
    gap: spacing.lg,
  },
  bookCard: {
    flex: 1,
    gap: spacing.xs + 2,
    justifyContent: 'space-between',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginBottom: 2,
  },
  bookTitle: {
    fontWeight: '700',
  },
  cardFooter: {
    marginTop: spacing.xs + 2,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    paddingTop: spacing.sm,
  },
  detailButton: {
    width: '100%',
    minHeight: 44,
  },
});
