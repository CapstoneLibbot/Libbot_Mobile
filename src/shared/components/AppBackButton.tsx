import { ArrowLeft } from "lucide-react-native";
import React from "react";
import { Pressable, StyleSheet, ViewStyle } from "react-native";
import { AppText } from "./AppText";

export interface AppBackButtonProps {
  onPress: () => void;
  accessibilityLabel?: string;
  style?: ViewStyle;
}

/**
 * Standardized pill-shaped back button with consistent styling across all screens.
 */
export function AppBackButton({
  onPress,
  accessibilityLabel = "Quay lại",
  style,
}: AppBackButtonProps): React.ReactElement {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.backButton,
        pressed && styles.backButtonPressed,
        style,
      ]}
    >
      <ArrowLeft size={16} color="#334155" strokeWidth={2.4} />
      <AppText variant="caption" style={styles.backButtonText}>
        Quay lại
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: "#FFFFFF",
    minHeight: 38,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1,
  },
  backButtonPressed: {
    opacity: 0.75,
    backgroundColor: "#F8FAFC",
  },
  backButtonText: {
    fontWeight: "700",
    color: "#334155",
    fontSize: 13,
  },
});
