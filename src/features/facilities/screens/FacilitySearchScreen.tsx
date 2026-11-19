import React, { useState } from "react";
import { FlatList, StyleSheet, View } from "react-native";
import { useKioskStore } from "@/core/state";
import {
  AppEmptyState,
  AppErrorState,
  AppHeader,
  AppInput,
  AppLoading,
} from "@/shared/ui";
import { useDebounce } from "@/shared/lib";
import { useResponsiveLayout } from "@/shared/layout";
import { colors, spacing } from "@/shared/theme";
import { useFacilities } from "../hooks/useFacilities";
import { FacilityCardItem } from "../components/FacilityCardItem";
import type { FacilitySearchItem } from "../types/facility.types";

export interface FacilitySearchScreenProps {
  onSelectFacility: (facilityId: string) => void;
  onBackToIdle: () => void;
}

export function FacilitySearchScreen({
  onSelectFacility,
  onBackToIdle,
}: FacilitySearchScreenProps): React.ReactElement {
  const { insets, isCompactWidth, isExpandedWidth, tokens } =
    useResponsiveLayout();
  const recordInteraction = useKioskStore((state) => state.recordInteraction);
  const [searchInput, setSearchInput] = useState("");
  const query = useDebounce(searchInput, 300);
  const {
    data: facilities = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useFacilities({ query });

  const renderFacility = ({ item }: { item: FacilitySearchItem }) => (
    <FacilityCardItem
      item={item}
      onPress={(id: string) => {
        recordInteraction();
        onSelectFacility(id);
      }}
      isCompactWidth={isCompactWidth}
      isExpandedWidth={isExpandedWidth}
    />
  );

  return (
    <View style={styles.container}>
      <AppHeader
        title="Tìm địa điểm"
        subtitle="Tìm địa điểm và để robot dẫn đường"
        onBack={onBackToIdle}
        backLabel="Màn hình chờ"
      />

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
          onChangeText={(value) => {
            recordInteraction();
            setSearchInput(value);
          }}
          placeholder="Nhập tên địa điểm..."
          onClear={() => setSearchInput("")}
        />
      </View>

      <View
        style={[
          styles.results,
          {
            paddingLeft: Math.max(insets.left, tokens.pagePaddingHorizontal),
            paddingRight: Math.max(insets.right, tokens.pagePaddingHorizontal),
          },
        ]}
      >
        {isLoading ? (
          <AppLoading message="Đang tìm địa điểm..." />
        ) : isError ? (
          <AppErrorState
            title="Không thể tải địa điểm"
            message={error?.message ?? "Đã xảy ra lỗi khi tìm địa điểm."}
            onRetry={refetch}
          />
        ) : facilities.length === 0 ? (
          <AppEmptyState
            title="Không tìm thấy địa điểm"
            message="Vui lòng thử từ khóa khác."
            actionTitle="Xóa tìm kiếm"
            onAction={() => {
              setSearchInput("");
            }}
          />
        ) : (
          <FlatList
            key={isExpandedWidth ? "facility-grid" : "facility-list"}
            data={facilities}
            keyExtractor={(item) => item.id}
            renderItem={renderFacility}
            numColumns={isExpandedWidth ? 2 : 1}
            columnWrapperStyle={isExpandedWidth ? styles.columns : undefined}
            contentContainerStyle={[
              styles.list,
              {
                paddingBottom: Math.max(
                  insets.bottom + spacing.xl,
                  spacing.xxl,
                ),
              },
            ]}
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
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  filters: {
    gap: spacing.xs,
    paddingVertical: spacing.xs,
  },
  chip: {
    minHeight: 40,
    paddingHorizontal: spacing.md,
    borderRadius: 20,
    justifyContent: "center",
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  chipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipText: {
    fontWeight: "600",
  },
  chipTextSelected: {
    fontWeight: "700",
  },
  results: {
    flex: 1,
  },
  list: {
    paddingTop: spacing.md,
    gap: spacing.md,
  },
  columns: {
    gap: spacing.md,
  },
});
