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
  const { isTablet, insets } = useResponsiveLayout();
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
    <AppCard style={styles.bookCard}>
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
      <AppText variant="caption" color={colors.subtext}>
        Thể loại: {item.category} • ISBN: {item.isbn}
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
            ? 'Tìm kiếm theo tiêu đề, tác giả, ISBN hoặc thể loại'
            : 'Đang ngoại tuyến'
        }
        backLabel="← Màn hình chờ"
        onBack={() => {
          recordInteraction();
          router.replace('/(kiosk)/idle');
        }}
      />

      <View
        style={[
          styles.searchSection,
          {
            paddingLeft: Math.max(insets.left, spacing.xl),
            paddingRight: Math.max(insets.right, spacing.xl),
          },
        ]}
      >
        <AppInput
          label="Từ khóa tìm kiếm"
          placeholder="Nhập tên sách, tác giả hoặc mã ISBN..."
          value={searchInput}
          onChangeText={handleSearchChange}
          onClear={() => handleSearchChange('')}
        />

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

      <View
        style={[
          styles.resultsSection,
          {
            paddingLeft: Math.max(insets.left, spacing.xl),
            paddingRight: Math.max(insets.right, spacing.xl),
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
            contentContainerStyle={styles.listContent}
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
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    gap: spacing.md,
  },
  categoryList: {
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  categoryChip: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: 20,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.borderLight,
    minHeight: 38,
    justifyContent: 'center',
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
    padding: spacing.xl,
    gap: spacing.lg,
  },
  rowWrapper: {
    gap: spacing.lg,
  },
  bookCard: {
    flex: 1,
    gap: spacing.sm,
    justifyContent: 'space-between',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  bookTitle: {
    fontWeight: '700',
  },
  cardFooter: {
    marginTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    paddingTop: spacing.md,
  },
  detailButton: {
    minHeight: 46,
  },
});
