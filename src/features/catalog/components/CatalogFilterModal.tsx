import { Check, RotateCcw, X } from "lucide-react-native";
import React from "react";
import { Modal, Pressable, StyleSheet, View } from "react-native";
import { useKioskStore } from "@/core/state";
import { AppText } from "@/shared/ui";

export type SortByOption = "default" | "title" | "author";

export interface CatalogFilterModalProps {
  visible: boolean;
  onlyAvailable: boolean;
  sortBy: SortByOption;
  onToggleOnlyAvailable: (value: boolean) => void;
  onSelectSortBy: (sort: SortByOption) => void;
  onReset: () => void;
  onClose: () => void;
}

const SORT_OPTIONS: { key: SortByOption; label: string }[] = [
  { key: "default", label: "Mặc định (theo kết quả tìm)" },
  { key: "title", label: "Tên sách (A → Z)" },
  { key: "author", label: "Tác giả (A → Z)" },
];

export function CatalogFilterModal({
  visible,
  onlyAvailable,
  sortBy,
  onToggleOnlyAvailable,
  onSelectSortBy,
  onReset,
  onClose,
}: CatalogFilterModalProps): React.ReactElement {
  const recordInteraction = useKioskStore((state) => state.recordInteraction);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={() => {
        recordInteraction();
        onClose();
      }}
    >
      <Pressable
        style={styles.modalOverlay}
        onPress={() => {
          recordInteraction();
          onClose();
        }}
        onTouchStart={recordInteraction}
      >
        <Pressable
          style={styles.modalContent}
          onPress={(e) => e.stopPropagation()}
          onTouchStart={recordInteraction}
        >
          {/* Modal Header */}
          <View style={styles.modalHeader}>
            <AppText variant="subtitle" style={styles.modalTitle}>
              Tùy chọn hiển thị & lọc
            </AppText>
            <Pressable
              onPress={onClose}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityRole="button"
              accessibilityLabel="Đóng bộ lọc"
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
                onPress={() => onToggleOnlyAvailable(false)}
                style={[
                  styles.modalFilterPill,
                  !onlyAvailable && styles.modalFilterPillActive,
                ]}
                accessibilityRole="button"
                accessibilityLabel="Tất cả sách"
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
                onPress={() => onToggleOnlyAvailable(true)}
                style={[
                  styles.modalFilterPill,
                  onlyAvailable && styles.modalFilterPillActive,
                ]}
                accessibilityRole="button"
                accessibilityLabel="Chỉ sách có sẵn"
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
              {SORT_OPTIONS.map((opt) => (
                <Pressable
                  key={opt.key}
                  onPress={() => onSelectSortBy(opt.key)}
                  style={styles.modalSortRow}
                  accessibilityRole="button"
                  accessibilityLabel={`Sắp xếp theo ${opt.label}`}
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
              onPress={onReset}
              style={styles.modalResetBtn}
              accessibilityRole="button"
              accessibilityLabel="Đặt lại bộ lọc"
            >
              <RotateCcw size={14} color="#64748B" />
              <AppText variant="caption" style={styles.modalResetText}>
                Đặt lại
              </AppText>
            </Pressable>
            <Pressable
              onPress={onClose}
              style={styles.modalApplyBtn}
              accessibilityRole="button"
              accessibilityLabel="Áp dụng bộ lọc"
            >
              <AppText variant="caption" style={styles.modalApplyText}>
                Áp dụng
              </AppText>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.45)",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    width: "100%",
    maxWidth: 400,
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
