import React, { useState } from "react";
import { X } from "lucide-react-native";
import {
  Pressable,
  StyleSheet,
  TextInput,
  TextInputProps,
  View,
} from "react-native";
import { colors, radius, spacing } from "../theme";
import { AppText } from "./AppText";

interface AppInputProps extends TextInputProps {
  label?: string;
  onClear?: () => void;
}

export function AppInput({
  label,
  onClear,
  value,
  ...props
}: AppInputProps): React.ReactElement {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <View style={styles.container}>
      {label ? (
        <AppText
          variant="caption"
          color={colors.textSecondary}
          style={styles.label}
        >
          {label}
        </AppText>
      ) : null}
      <View
        style={[styles.inputWrapper, isFocused && styles.inputWrapperFocused]}
      >
        <TextInput
          style={styles.input}
          placeholderTextColor={colors.subtext}
          value={value}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          {...props}
        />
        {onClear && value && value.length > 0 ? (
          <Pressable
            onPress={onClear}
            style={styles.clearButton}
            accessibilityLabel="Clear text"
          >
            <X color={colors.subtext} size={20} strokeWidth={2} />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
  },
  label: {
    marginBottom: spacing.xs,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    minHeight: 54,
    paddingHorizontal: spacing.lg,
  },
  inputWrapperFocused: {
    borderColor: colors.primary,
    backgroundColor: colors.surface,
  },
  input: {
    flex: 1,
    fontSize: 16,
    fontFamily: "InterRegular",
    color: colors.text,
    paddingVertical: spacing.sm,
  },
  clearButton: {
    padding: spacing.sm,
  },
});
