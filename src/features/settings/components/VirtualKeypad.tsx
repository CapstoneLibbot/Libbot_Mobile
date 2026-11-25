import React from "react";
import { Delete } from "lucide-react-native";
import { Pressable, StyleSheet, View } from "react-native";
import { colors, radius, spacing } from "@/shared/theme";
import { AppText } from "@/shared/ui";

export interface VirtualKeypadProps {
  onDigitPress: (digit: string) => void;
  onDeletePress: () => void;
  onCancelPress: () => void;
  disabled?: boolean;
}

interface KeyData {
  value: string;
  sub?: string;
}

const KEYPAD_ROWS: KeyData[][] = [
  [
    { value: "1" },
    { value: "2", sub: "ABC" },
    { value: "3", sub: "DEF" },
  ],
  [
    { value: "4", sub: "GHI" },
    { value: "5", sub: "JKL" },
    { value: "6", sub: "MNO" },
  ],
  [
    { value: "7", sub: "PQRS" },
    { value: "8", sub: "TUV" },
    { value: "9", sub: "WXYZ" },
  ],
];

export function VirtualKeypad({
  onDigitPress,
  onDeletePress,
  onCancelPress,
  disabled = false,
}: VirtualKeypadProps): React.ReactElement {
  return (
    <View style={styles.container}>
      {KEYPAD_ROWS.map((row, rowIndex) => (
        <View key={rowIndex} style={styles.row}>
          {row.map((key) => (
            <Pressable
              key={key.value}
              disabled={disabled}
              onPress={() => onDigitPress(key.value)}
              style={({ pressed }) => [
                styles.keyButton,
                pressed && styles.keyPressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel={`Số ${key.value}`}
            >
              <AppText variant="title" color={colors.text} style={styles.digitText}>
                {key.value}
              </AppText>
              {key.sub ? (
                <AppText variant="caption" color={colors.textSecondary} style={styles.subText}>
                  {key.sub}
                </AppText>
              ) : null}
            </Pressable>
          ))}
        </View>
      ))}

      {/* Hàng cuối: [Hủy], [0], [⌫] */}
      <View style={styles.row}>
        {/* Nút Hủy */}
        <Pressable
          disabled={disabled}
          onPress={onCancelPress}
          style={({ pressed }) => [
            styles.actionKeyButton,
            pressed && styles.keyPressed,
          ]}
          accessibilityRole="button"
          accessibilityLabel="Hủy"
        >
          <AppText variant="body" color={colors.textSecondary} style={styles.cancelText}>
            Hủy
          </AppText>
        </Pressable>

        {/* Số 0 */}
        <Pressable
          disabled={disabled}
          onPress={() => onDigitPress("0")}
          style={({ pressed }) => [
            styles.keyButton,
            pressed && styles.keyPressed,
          ]}
          accessibilityRole="button"
          accessibilityLabel="Số 0"
        >
          <AppText variant="title" color={colors.text} style={styles.digitText}>
            0
          </AppText>
        </Pressable>

        {/* Nút Xóa (Backspace) */}
        <Pressable
          disabled={disabled}
          onPress={onDeletePress}
          style={({ pressed }) => [
            styles.actionKeyButton,
            pressed && styles.keyPressed,
          ]}
          accessibilityRole="button"
          accessibilityLabel="Xóa một số"
        >
          <Delete size={24} color={colors.textSecondary} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    gap: spacing.sm,
    paddingTop: spacing.xs,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  keyButton: {
    flex: 1,
    height: 60,
    backgroundColor: "#F8FAFC",
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    justifyContent: "center",
    alignItems: "center",
  },
  actionKeyButton: {
    flex: 1,
    height: 60,
    backgroundColor: "transparent",
    borderRadius: radius.md,
    justifyContent: "center",
    alignItems: "center",
  },
  keyPressed: {
    backgroundColor: "#E2E8F0",
    opacity: 0.85,
  },
  digitText: {
    fontSize: 22,
    lineHeight: 26,
    fontWeight: "600",
  },
  subText: {
    fontSize: 10,
    lineHeight: 12,
    letterSpacing: 1.2,
    marginTop: 1,
  },
  cancelText: {
    fontWeight: "500",
  },
});
