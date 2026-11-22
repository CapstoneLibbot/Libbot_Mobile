import React from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { AppText } from "@/shared/ui";

export interface CatalogCategoryBarProps {
  categories: string[];
  selectedCategory: string;
  onSelectCategory: (category: string) => void;
  totalCount: number;
  paddingLeft?: number;
  paddingRight?: number;
}

export function CatalogCategoryBar({
  categories,
  selectedCategory,
  onSelectCategory,
  totalCount,
  paddingLeft = 16,
  paddingRight = 16,
}: CatalogCategoryBarProps): React.ReactElement {
  return (
    <View style={[styles.categoryBar, { paddingLeft, paddingRight }]}>
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
              onPress={() => onSelectCategory(cat)}
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
  );
}

const styles = StyleSheet.create({
  categoryBar: {
    paddingVertical: 8,
  },
  categoryScrollContent: {
    gap: 8,
    paddingVertical: 2,
  },
  categoryPill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  categoryPillSelected: {
    backgroundColor: "#2563EB",
    borderColor: "#2563EB",
  },
  categoryPillText: {
    color: "#64748B",
    fontWeight: "600",
    fontSize: 12,
  },
  categoryPillTextSelected: {
    color: "#FFFFFF",
  },
});
