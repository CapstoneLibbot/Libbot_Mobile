import { ChevronDown, ChevronUp, X } from "lucide-react-native";
import React, { useState } from "react";
import {
  Modal,
  Pressable,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from "react-native";
import { AppText } from "@/shared/ui";
import { colors, radius, spacing } from "@/shared/theme";
import { GuidanceDemoState } from "../types/guidance.types";

export interface GuidanceDemoSwitcherProps {
  currentState: GuidanceDemoState;
  onSelectState: (state: GuidanceDemoState) => void;
  routeRevision?: number;
  style?: StyleProp<ViewStyle>;
  testID?: string;
  compact?: boolean;
}

interface DemoStateOption {
  key: GuidanceDemoState;
  label: string;
  shortLabel: string;
  tone: "info" | "warning" | "success" | "danger";
}

const OPTIONS: DemoStateOption[] = [
  {
    key: "navigating",
    label: "1. Đang dẫn đường",
    shortLabel: "Dẫn đường",
    tone: "info",
  },
  {
    key: "replanning",
    label: "2. Tính lại đường",
    shortLabel: "Tính lại đường",
    tone: "warning",
  },
  {
    key: "arrived",
    label: "3. Đã đến nơi",
    shortLabel: "Đã đến nơi",
    tone: "success",
  },
  {
    key: "cancelled",
    label: "4. Đã hủy",
    shortLabel: "Đã hủy",
    tone: "danger",
  },
];

export function GuidanceDemoSwitcher({
  currentState,
  onSelectState,
  routeRevision = 1,
  style,
  testID = "guidance-demo-switcher",
  compact = false,
}: GuidanceDemoSwitcherProps): React.ReactElement {
  const [isOpen, setIsOpen] = useState(false);

  const currentOption =
    OPTIONS.find((opt) => opt.key === currentState) ?? OPTIONS[0];

  const dotColor =
    currentOption.tone === "info"
      ? colors.primary
      : currentOption.tone === "warning"
        ? colors.warning
        : currentOption.tone === "success"
          ? colors.success
          : colors.danger;

  return (
    <View style={[styles.wrapper, style]} testID={testID}>
      {/* Small floating chip button */}
      <Pressable
        testID="guidance-demo-chip"
        accessibilityRole="button"
        accessibilityLabel={`Demo: ${currentOption.shortLabel}. Nhấn để chọn trạng thái khác`}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        onPress={() => setIsOpen((prev) => !prev)}
        style={({ pressed }) => [
          compact ? styles.compactButton : styles.chipButton,
          isOpen &&
            (compact ? styles.compactButtonOpen : styles.chipButtonOpen),
          pressed && styles.chipButtonPressed,
        ]}
      >
        <View
          style={[
            compact ? styles.compactStatusDot : styles.statusDot,
            { backgroundColor: dotColor },
          ]}
        />
        <AppText
          variant="caption"
          style={compact ? styles.compactText : styles.chipText}
        >
          Demo: {currentOption.shortLabel}
        </AppText>
        {isOpen ? (
          <ChevronUp size={compact ? 12 : 14} color={colors.textSecondary} />
        ) : (
          <ChevronDown size={compact ? 12 : 14} color={colors.textSecondary} />
        )}
      </Pressable>

      {/* Dropdown selector modal/popover */}
      {isOpen && (
        <Modal
          visible={isOpen}
          transparent={true}
          animationType="fade"
          supportedOrientations={[
            "portrait",
            "portrait-upside-down",
            "landscape",
            "landscape-left",
            "landscape-right",
          ]}
          statusBarTranslucent={true}
          onRequestClose={() => setIsOpen(false)}
        >
          <Pressable
            style={styles.modalBackdrop}
            onPress={() => setIsOpen(false)}
          >
            <Pressable
              style={styles.dropdownCard}
              onPress={() => {}}
            >
              <View style={styles.dropdownHeader}>
                <View>
                  <AppText variant="subtitle" style={styles.dropdownTitle}>
                    Chọn trạng thái mô phỏng
                  </AppText>
                  <AppText variant="caption" color={colors.subtext}>
                    Lộ trình #{routeRevision}
                  </AppText>
                </View>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Đóng bộ chọn"
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  onPress={() => setIsOpen(false)}
                  style={styles.closeButton}
                >
                  <X size={18} color={colors.textSecondary} />
                </Pressable>
              </View>

              <View style={styles.optionsList}>
                {OPTIONS.map((opt) => {
                  const isActive = currentState === opt.key;
                  return (
                    <Pressable
                      key={opt.key}
                      testID={`switcher-btn-${opt.key}`}
                      accessibilityRole="button"
                      accessibilityState={{ selected: isActive }}
                      accessibilityLabel={`Chọn: ${opt.label}`}
                      onPress={() => {
                        onSelectState(opt.key);
                        setIsOpen(false);
                      }}
                      style={({ pressed }) => [
                        styles.optionButton,
                        isActive && styles.optionButtonActive,
                        isActive &&
                          opt.tone === "warning" &&
                          styles.optionButtonWarning,
                        isActive &&
                          opt.tone === "success" &&
                          styles.optionButtonSuccess,
                        isActive &&
                          opt.tone === "danger" &&
                          styles.optionButtonDanger,
                        pressed && styles.optionButtonPressed,
                      ]}
                    >
                      <View
                        style={[
                          styles.statusDot,
                          opt.tone === "info" && {
                            backgroundColor: colors.primary,
                          },
                          opt.tone === "warning" && {
                            backgroundColor: colors.warning,
                          },
                          opt.tone === "success" && {
                            backgroundColor: colors.success,
                          },
                          opt.tone === "danger" && {
                            backgroundColor: colors.danger,
                          },
                        ]}
                      />
                      <AppText
                        variant="caption"
                        style={[
                          styles.optionText,
                          isActive && styles.optionTextActive,
                        ]}
                      >
                        {opt.label}
                      </AppText>
                    </Pressable>
                  );
                })}
              </View>
            </Pressable>
          </Pressable>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    zIndex: 30,
  },
  chipButton: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs,
    backgroundColor: "#FFFFFF",
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  chipButtonOpen: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  chipButtonPressed: {
    opacity: 0.85,
  },
  chipText: {
    fontWeight: "700",
    color: colors.text,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  compactButton: {
    minHeight: 32,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: "#F8FAFC",
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#CBD5E1",
  },
  compactButtonOpen: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  compactText: {
    fontWeight: "700",
    color: "#334155",
    fontSize: 12,
  },
  compactStatusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.45)",
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.lg,
  },
  dropdownCard: {
    width: "100%",
    maxWidth: 380,
    backgroundColor: "#FFFFFF",
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    gap: spacing.md,
  },
  dropdownHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingBottom: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  dropdownTitle: {
    fontWeight: "700",
    color: colors.text,
  },
  closeButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.sm,
  },
  optionsList: {
    gap: spacing.xs,
  },
  optionButton: {
    minHeight: 44,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: "#F8FAFC",
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  optionButtonActive: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary,
  },
  optionButtonWarning: {
    backgroundColor: "#FEF3C7",
    borderColor: "#D97706",
  },
  optionButtonSuccess: {
    backgroundColor: colors.successSoft,
    borderColor: colors.success,
  },
  optionButtonDanger: {
    backgroundColor: colors.dangerSoft,
    borderColor: colors.danger,
  },
  optionButtonPressed: {
    opacity: 0.8,
  },
  optionText: {
    fontWeight: "600",
    color: colors.textSecondary,
    fontSize: 13,
  },
  optionTextActive: {
    color: colors.text,
    fontWeight: "700",
  },
});
