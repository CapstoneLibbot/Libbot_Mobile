import React from "react";
import { StyleSheet, View } from "react-native";
import { colors, spacing } from "@/shared/theme";
import { AppText } from "@/shared/ui";

export interface SettingSectionHeaderProps {
  title: string;
  description: string;
  icon?: React.ReactNode;
}

export function SettingSectionHeader({
  title,
  description,
  icon,
}: SettingSectionHeaderProps): React.ReactElement {
  return (
    <View style={styles.container}>
      <View style={styles.titleRow}>
        {icon ? <View style={styles.iconWrap}>{icon}</View> : null}
        <AppText variant="title" color={colors.text} style={styles.titleText}>
          {title}
        </AppText>
      </View>
      <AppText
        variant="caption"
        color={colors.textSecondary}
        style={styles.description}
      >
        {description}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
    paddingHorizontal: 2,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  iconWrap: {
    marginRight: spacing.xs + 2,
  },
  titleText: {
    fontWeight: "700",
    fontSize: 18,
    letterSpacing: -0.2,
  },
  description: {
    marginTop: 3,
    lineHeight: 18,
  },
});
