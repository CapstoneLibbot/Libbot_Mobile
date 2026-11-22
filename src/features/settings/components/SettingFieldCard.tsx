import React, { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { Radio, X } from "lucide-react-native";
import { colors, radius, spacing } from "@/shared/theme";
import { AppCard, AppText } from "@/shared/ui";
import { FieldTestState } from "../types/settings.types";
import { FieldConnectionBadge } from "./FieldConnectionBadge";

export interface SettingFieldCardProps {
  label: string;
  description: string;
  value: string;
  placeholder?: string;
  error?: string;
  icon?: React.ReactNode;
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
  keyboardType?: "default" | "url" | "email-address" | "numeric";
  onChangeText: (text: string) => void;
  onClear: () => void;
  onTest?: () => void;
  testState?: FieldTestState;
}

export function SettingFieldCard({
  label,
  description,
  value,
  placeholder,
  error,
  icon,
  autoCapitalize = "none",
  keyboardType = "default",
  onChangeText,
  onClear,
  onTest,
  testState,
}: SettingFieldCardProps): React.ReactElement {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <AppCard style={styles.card}>
      {/* Title & Description */}
      <View style={styles.headerRow}>
        {icon ? <View style={styles.iconContainer}>{icon}</View> : null}
        <View style={styles.titleContainer}>
          <AppText variant="subtitle" color={colors.text} style={styles.titleText}>
            {label}
          </AppText>
          <AppText variant="caption" color={colors.textSecondary} style={styles.description}>
            {description}
          </AppText>
        </View>
      </View>

      {/* Input container with [X] and [Kiểm tra] buttons */}
      <View
        style={[
          styles.inputWrapper,
          isFocused && styles.inputWrapperFocused,
          Boolean(error) && styles.inputWrapperError,
        ]}
      >
        <TextInput
          style={styles.textInput}
          value={value}
          placeholder={placeholder}
          placeholderTextColor={colors.subtext}
          onChangeText={onChangeText}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          autoCapitalize={autoCapitalize}
          autoCorrect={false}
          keyboardType={keyboardType}
        />

        {/* Nút xóa [x] */}
        {value.length > 0 ? (
          <Pressable
            onPress={onClear}
            style={styles.clearBtn}
            accessibilityRole="button"
            accessibilityLabel="Xóa nội dung"
            hitSlop={8}
          >
            <X size={18} color={colors.textSecondary} />
          </Pressable>
        ) : null}

        {/* Nút Test kết nối độc lập cho dòng */}
        {onTest ? (
          <>
            <View style={styles.inlineDivider} />
            <Pressable
              onPress={onTest}
              disabled={testState?.status === "testing" || !value.trim()}
              style={({ pressed }) => [
                styles.testBtn,
                pressed && styles.testBtnPressed,
                (!value.trim() || testState?.status === "testing") && styles.testBtnDisabled,
              ]}
              accessibilityRole="button"
              accessibilityLabel={`Kiểm tra kết nối ${label}`}
              hitSlop={6}
            >
              {testState?.status === "testing" ? (
                <ActivityIndicator size="small" color={colors.primary} style={styles.testSpinner} />
              ) : (
                <Radio
                  size={15}
                  color={value.trim() ? colors.primary : colors.disabled}
                  style={styles.testIcon}
                />
              )}
              <AppText
                variant="caption"
                color={value.trim() ? colors.primary : colors.disabled}
                style={styles.testBtnText}
              >
                {testState?.status === "testing" ? "Đang test..." : "Kiểm tra"}
              </AppText>
            </Pressable>
          </>
        ) : null}
      </View>

      {/* Error message */}
      {error ? (
        <AppText variant="caption" color={colors.danger} style={styles.errorText}>
          {error}
        </AppText>
      ) : null}

      {/* Kết quả kiểm tra của dòng */}
      <FieldConnectionBadge testState={testState} />
    </AppCard>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: spacing.md,
    marginBottom: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: spacing.xs,
  },
  iconContainer: {
    marginRight: spacing.sm,
    marginTop: 2,
  },
  titleContainer: {
    flex: 1,
  },
  titleText: {
    fontWeight: "600",
  },
  description: {
    marginTop: 2,
    lineHeight: 18,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
    minHeight: 48,
    marginTop: spacing.xs,
  },
  inputWrapperFocused: {
    borderColor: colors.primary,
  },
  inputWrapperError: {
    borderColor: colors.danger,
  },
  textInput: {
    flex: 1,
    fontFamily: "InterRegular",
    fontSize: 15,
    color: colors.text,
    paddingVertical: spacing.xs + 2,
  },
  clearBtn: {
    padding: spacing.xs,
  },
  inlineDivider: {
    width: 1,
    height: 22,
    backgroundColor: "#E2E8F0",
    marginHorizontal: 8,
  },
  testBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.sm,
  },
  testBtnPressed: {
    backgroundColor: "#DBEAFE",
    opacity: 0.85,
  },
  testBtnDisabled: {
    backgroundColor: "#F1F5F9",
    opacity: 0.6,
  },
  testIcon: {
    marginRight: 4,
  },
  testSpinner: {
    marginRight: 4,
  },
  testBtnText: {
    fontWeight: "600",
  },
  errorText: {
    marginTop: 4,
    marginLeft: 2,
  },
});
