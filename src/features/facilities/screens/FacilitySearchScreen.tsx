import { router } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { useKioskStore } from "../../../core/store/kioskStore";
import { useNetworkStatus } from "../../../infrastructure/network/useNetworkStatus";
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
} from "../../../shared/components";
import { useDebounce } from "../../../shared/hooks/useDebounce";
import { useResponsiveLayout } from "../../../shared/hooks/useResponsiveLayout";
import { colors, spacing } from "../../../shared/theme";
import { useFacilities } from "../hooks/useFacilities";
import { FacilityArea } from "../types/facility.types";

const FACILITY_TYPES = [
  "All",
  "Reading Zone",
  "Bookshelf Area",
  "Study Hall",
  "Robot Dock",
] as const;

export function FacilitySearchScreen(): React.ReactElement {
  const { insets, isCompactWidth, isExpandedWidth, tokens } = useResponsiveLayout();
  const isTablet = isExpandedWidth;

  const [searchInput, setSearchInput] = useState("");
  const [selectedType, setSelectedType] = useState<string>("All");
  const debouncedQuery = useDebounce(searchInput, 250);
  const recordInteraction = useKioskStore((state) => state.recordInteraction);
  const { isConnected } = useNetworkStatus();

  const {
    data: facilities = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useFacilities();

  const filteredFacilities = useMemo(() => {
    return facilities.filter((fac) => {
      const q = debouncedQuery.toLowerCase().trim();
      const matchesQuery =
        !q ||
        fac.name.toLowerCase().includes(q) ||
        fac.description.toLowerCase().includes(q) ||
        (fac.shelfCode && fac.shelfCode.toLowerCase().includes(q));

      const matchesType =
        selectedType === "All" || fac.type === selectedType;

      return matchesQuery && matchesType;
    });
  }, [facilities, debouncedQuery, selectedType]);

  const handleSearchChange = (text: string) => {
    recordInteraction();
    setSearchInput(text);
  };

  const handleTypeSelect = (type: string) => {
    recordInteraction();
    setSelectedType(type);
  };

  const renderFacilityCard = ({ item }: { item: FacilityArea }) => (
    <AppCard
      style={styles.facilityCard}
      padding={isCompactWidth ? "compact" : "normal"}
    >
      <View style={styles.cardHeader}>
        <StatusBadge label={item.type} tone="info" />
        <AppText variant="caption" color={colors.subtext}>
          Tầng {item.floor}
        </AppText>
      </View>

      <AppText variant="subtitle" style={styles.cardTitle} numberOfLines={2}>
        {item.name}
      </AppText>

      <AppText
        variant="body"
        color={colors.textSecondary}
        style={styles.cardDesc}
        numberOfLines={2}
      >
        {item.description}
      </AppText>

      {item.shelfCode ? (
        <View style={styles.shelfCodeRow}>
          <AppText variant="caption" color={colors.primary}>
            Mã kệ: {item.shelfCode}
          </AppText>
        </View>
      ) : null}

      <View style={styles.cardFooter}>
        <AppButton
          title="Xem sơ đồ & chỉ dẫn"
          variant="secondary"
          size="md"
          onPress={() => {
            recordInteraction();
            router.push(`/(kiosk)/facilities/${item.id}`);
          }}
          style={styles.detailButton}
        />
      </View>
    </AppCard>
  );

  return (
    <View style={styles.container}>
      <AppHeader
        title="Tìm khu vực & sơ đồ"
        subtitle={
          isConnected
            ? "Phòng chức năng, khu vực đọc sách và hệ thống kệ"
            : "Dữ liệu khu vực nội bộ"
        }
        onBack={() => {
          recordInteraction();
          router.replace("/(kiosk)/idle");
        }}
        backLabel="Màn hình chờ"
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
          value={searchInput}
          onChangeText={handleSearchChange}
          placeholder="Nhập tên khu vực, phòng học, tầng hoặc mã kệ..."
          onClear={() => handleSearchChange("")}
        />

        {/* Type Filter Chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.typesScroll}
        >
          {FACILITY_TYPES.map((type) => {
            const isSelected = selectedType === type;
            return (
              <Pressable
                key={type}
                onPress={() => handleTypeSelect(type)}
                style={[
                  styles.typeChip,
                  isSelected && styles.typeChipSelected,
                ]}
                accessibilityRole="button"
                accessibilityLabel={`Lọc theo ${type === "All" ? "Tất cả" : type}`}
              >
                <AppText
                  variant="caption"
                  color={isSelected ? colors.surface : colors.text}
                  style={styles.typeChipText}
                >
                  {type === "All" ? "Tất cả khu vực" : type}
                </AppText>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* Facility Grid / List */}
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
          <AppLoading message="Đang tải danh sách khu vực..." />
        ) : isError ? (
          <AppErrorState
            title="Không thể tải khu vực"
            message={error?.message ?? "Đã xảy ra lỗi khi lấy danh sách khu vực."}
            onRetry={refetch}
          />
        ) : filteredFacilities.length === 0 ? (
          <AppEmptyState
            title="Không tìm thấy khu vực phù hợp"
            message="Vui lòng thử tìm kiếm bằng từ khóa hoặc bộ lọc khu vực khác."
            actionTitle="Xóa tìm kiếm"
            onAction={() => {
              recordInteraction();
              setSearchInput("");
              setSelectedType("All");
            }}
          />
        ) : (
          <FlatList
            key={isTablet ? 'fac-tablet-2' : 'fac-phone-1'}
            data={filteredFacilities}
            keyExtractor={(item) => item.id}
            renderItem={renderFacilityCard}
            numColumns={isTablet ? 2 : 1}
            columnWrapperStyle={isTablet ? styles.listColumnWrapper : undefined}
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
  typesScroll: {
    gap: spacing.xs,
    paddingVertical: spacing.xs,
  },
  typeChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 20,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.borderLight,
    minHeight: 44,
    minWidth: 44,
    justifyContent: "center",
    alignItems: "center",
    flexShrink: 0,
  },
  typeChipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  typeChipText: {
    fontWeight: "600",
  },
  resultsSection: {
    flex: 1,
  },
  listContent: {
    paddingTop: spacing.md,
  },
  listColumnWrapper: {
    gap: spacing.lg,
  },
  facilityCard: {
    flex: 1,
    gap: spacing.xs + 2,
    justifyContent: "space-between",
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: spacing.xs,
  },
  cardTitle: {
    fontWeight: "700",
  },
  cardDesc: {
    lineHeight: 20,
  },
  shelfCodeRow: {
    marginTop: 2,
  },
  cardFooter: {
    marginTop: spacing.xs + 2,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    paddingTop: spacing.sm,
  },
  detailButton: {
    width: "100%",
    minHeight: 44,
  },
});
