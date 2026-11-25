import React, { useEffect, useState } from "react";
import { Animated, StyleSheet, View } from "react-native";
import { colors, spacing } from "@/shared/theme";
import { AppText } from "@/shared/ui";

export interface PinCodeSlotsProps {
  pinLength?: number;
  currentPin: string;
  hasError: boolean;
}

export function PinCodeSlots({
  pinLength = 4,
  currentPin,
  hasError,
}: PinCodeSlotsProps): React.ReactElement {
  const [shakeAnim] = useState(() => new Animated.Value(0));

  useEffect(() => {
    if (hasError) {
      Animated.sequence([
        Animated.timing(shakeAnim, { toValue: 10, duration: 60, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: -10, duration: 60, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 10, duration: 60, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 0, duration: 60, useNativeDriver: true }),
      ]).start();
    }
  }, [hasError, shakeAnim]);

  const slots = Array.from({ length: pinLength }, (_, i) => i);

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ translateX: shakeAnim }],
        },
      ]}
    >
      {slots.map((index) => {
        const isFilled = index < currentPin.length;
        const isActive = index === currentPin.length && !hasError;

        return (
          <View
            key={index}
            style={[
              styles.slot,
              isActive && styles.slotActive,
              isFilled && styles.slotFilled,
              hasError && styles.slotError,
            ]}
          >
            {isFilled ? (
              <AppText variant="title" color={hasError ? colors.danger : colors.text}>
                ●
              </AppText>
            ) : isActive ? (
              <View style={styles.cursorIndicator} />
            ) : null}
          </View>
        );
      })}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: spacing.md,
    marginVertical: spacing.lg,
  },
  slot: {
    width: 54,
    height: 54,
    borderRadius: 27,
    borderWidth: 2,
    borderColor: "#E2E8F0",
    backgroundColor: colors.surface,
    justifyContent: "center",
    alignItems: "center",
  },
  slotActive: {
    borderColor: colors.primary,
    borderWidth: 2.5,
    backgroundColor: "#F0F7FF",
  },
  slotFilled: {
    borderColor: colors.primary,
    backgroundColor: colors.surface,
  },
  slotError: {
    borderColor: colors.danger,
    backgroundColor: "#FEF2F2",
  },
  cursorIndicator: {
    width: 2,
    height: 22,
    backgroundColor: colors.primary,
    borderRadius: 1,
  },
});
