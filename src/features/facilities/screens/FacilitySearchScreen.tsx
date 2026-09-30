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
import { colors, radius, spacing } from "../../../shared/theme";
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
  const { isTablet, insets } = useResponsiveLayout();
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
    <AppCard style={styles.facilityCard}>
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
        title="Tìm khu vực & sơ đồ thư viện"
        subtitle={
          isConnected
            ? "Danh sách phòng chức năng, khu vực đọc sách và hệ thống dãy kệ"
            : "Đang hiển thị dữ liệu khu vực nội bộ"
        }
        onBack={() => {
          recordInteraction();
          router.replace("/(kiosk)/idle");
        }}
        backLabel="← Về màn hình chờ"
      />

      <View
        style={[
          styles.contentContainer,
          {
            paddingLeft: Math.max(insets.left, spacing.xl),
            paddingRight: Math.max(insets.right, spacing.xl),
          },
        ]}
      >
        {/* Search Input bar */}
        <View style={styles.searchBarWrapper}>
          <AppInput
            value={searchInput}
            onChangeText={handleSearchChange}
            placeholder="Nhập tên khu vực, phòng tự học, số tầng hoặc mã kệ..."
            autoFocus={false}
          />
        </View>

        {/* Type Filter Chips */}
        <View style={styles.typesRow}>
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
                  accessibilityLabel={`Lọc theo ${type}`}
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

        {/* Facilities List Grid */}
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
  contentContainer: {
    flex: 1,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
  },
  searchBarWrapper: {
    marginBottom: spacing.md,
  },
  typesRow: {
    marginBottom: spacing.md,
  },
  typesScroll: {
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  typeChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  typeChipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  typeChipText: {
    fontFamily: "InterSemiBold",
  },
  listContent: {
    paddingBottom: spacing.xxl,
    gap: spacing.md,
  },
  listColumnWrapper: {
    gap: spacing.md,
  },
  facilityCard: {
    flex: 1,
    backgroundColor: colors.surface,
    padding: spacing.lg,
    borderRadius: radius.lg,
    gap: spacing.xs,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.xs,
  },
  cardTitle: {
    color: colors.text,
  },
  cardDesc: {
    lineHeight: 20,
    marginTop: spacing.xs,
  },
  shelfCodeRow: {
    backgroundColor: colors.primarySoft,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.sm,
    alignSelf: "flex-start",
    marginTop: spacing.xs,
  },
  cardFooter: {
    marginTop: spacing.md,
  },
  detailButton: {
    width: "100%",
    borderRadius: radius.md,
  },
});
