import { Search, Settings, X } from "lucide-react-native";
import React from "react";
import { Pressable, StyleSheet, TextInput, View } from "react-native";
import { AppBackButton, AppText } from "@/shared/ui";

export interface CatalogSearchBarProps {
  searchInput: string;
  onChangeSearchInput: (text: string) => void;
  onClearSearch: () => void;
  onBackToIdle: () => void;
  onOpenFilterModal: () => void;
  isFilterActive: boolean;
  paddingTop?: number;
  paddingLeft?: number;
  paddingRight?: number;
}

export function CatalogSearchBar({
  searchInput,
  onChangeSearchInput,
  onClearSearch,
  onBackToIdle,
  onOpenFilterModal,
  isFilterActive,
  paddingTop = 12,
  paddingLeft = 16,
  paddingRight = 16,
}: CatalogSearchBarProps): React.ReactElement {
  return (
    <View
      style={[
        styles.topBarContainer,
        {
          paddingTop,
          paddingLeft,
          paddingRight,
        },
      ]}
    >
      {/* Pill Back Button */}
      <AppBackButton
        onPress={onBackToIdle}
        style={styles.headerBackButton}
      />

      {/* Search Input Bar with embedded "Tìm" button */}
      <View style={styles.searchInputWrapper}>
        <Search size={15} color="#94A3B8" style={styles.searchIcon} />

        <TextInput
          placeholder="Tìm theo tên sách, tác giả hoặc ISBN..."
          placeholderTextColor="#94A3B8"
          value={searchInput}
          onChangeText={onChangeSearchInput}
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
            onPress={onClearSearch}
            style={styles.inputClearButton}
          >
            <X size={14} color="#94A3B8" />
          </Pressable>
        )}

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Tìm kiếm"
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
        onPress={onOpenFilterModal}
        style={({ pressed }) => [
          styles.btnSettings,
          pressed && styles.btnPressed,
          isFilterActive && styles.btnSettingsActive,
        ]}
      >
        <Settings
          size={17}
          color={isFilterActive ? "#2563EB" : "#475569"}
        />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  topBarContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingBottom: 8,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  headerBackButton: {
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  searchInputWrapper: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 999,
    paddingLeft: 10,
    paddingRight: 4,
    height: 38,
  },
  searchIcon: {
    marginRight: 6,
  },
  textInput: {
    flex: 1,
    fontFamily: "InterRegular",
    fontSize: 13,
    color: "#0F172A",
    paddingVertical: 0,
  },
  inputClearButton: {
    padding: 6,
    marginRight: 2,
  },
  btnSearchSubmit: {
    backgroundColor: "#2563EB",
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 999,
    justifyContent: "center",
    alignItems: "center",
  },
  btnSearchSubmitText: {
    color: "#FFFFFF",
    fontWeight: "600",
    fontSize: 12,
  },
  btnSettings: {
    width: 38,
    height: 38,
    borderRadius: 999,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    justifyContent: "center",
    alignItems: "center",
  },
  btnSettingsActive: {
    borderColor: "#2563EB",
    backgroundColor: "#EFF6FF",
  },
  btnPressed: {
    opacity: 0.8,
  },
});
