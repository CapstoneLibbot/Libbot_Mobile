import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { BookOpen, ChevronRight, Compass, MapPin } from "lucide-react-native";
import { AppText } from "@/shared/ui";
import { colors, radius, shadows, spacing } from "@/shared/theme";
import type { FacilitySearchItem } from "../types/facility.types";
import { getFacilityMeta } from "../utils/facilityMeta";

export interface FacilityCardItemProps {
  item: FacilitySearchItem;
  onPress: (facilityId: string) => void;
  isCompactWidth?: boolean;
  isExpandedWidth?: boolean;
}

const FACILITY_ICONS = {
  reading_room: BookOpen,
  area: Compass,
  default: MapPin,
};

export function FacilityCardItem({
  item,
  onPress,
  isCompactWidth = false,
  isExpandedWidth = false,
}: FacilityCardItemProps): React.ReactElement {
  const meta = getFacilityMeta(item.type);
  const FacilityIcon = FACILITY_ICONS[meta.iconType];

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Xem khu vực ${item.name}`}
      accessibilityHint="Chạm để xem thông tin vị trí và để LiBot dẫn đường"
      onPress={() => onPress(item.id)}
      style={({ pressed }) => [
        styles.card,
        isExpandedWidth && styles.cardExpanded,
        pressed && styles.cardPressed,
      ]}
    >
      {/* Visual Avatar / Icon Badge */}
      <View
        style={[
          styles.iconBox,
          { backgroundColor: meta.iconBg, borderColor: meta.iconBorder },
        ]}
      >
        <FacilityIcon size={24} color={meta.iconColor} strokeWidth={2.2} />
      </View>

      {/* Center Details */}
      <View style={styles.content}>
        {/* Type Badge */}
        <View style={styles.badgeRow}>
          <View
            style={[
              styles.badge,
              { backgroundColor: meta.badgeBg, borderColor: meta.badgeBorder },
            ]}
          >
            <View
              style={[styles.badgeDot, { backgroundColor: meta.dotColor }]}
            />
            <AppText
              variant="caption"
              style={[styles.badgeText, { color: meta.badgeText }]}
            >
              {meta.label}
            </AppText>
          </View>
        </View>

        {/* Title */}
        <AppText variant="subtitle" style={styles.title} numberOfLines={2}>
          {item.name}
        </AppText>

        {/* Location / Map Row */}
        <View style={styles.locationRow}>
          <MapPin size={13} color={colors.subtext} strokeWidth={2} />
          <AppText
            variant="caption"
            color={colors.subtext}
            numberOfLines={1}
            style={styles.locationText}
          >
            {item.mapName ? item.mapName : "Bản đồ thư viện"}
          </AppText>
        </View>
      </View>

      {/* Right Navigation CTA */}
      <View style={styles.actionSection}>
        {isCompactWidth ? (
          <View style={styles.chevronCircle}>
            <ChevronRight
              size={18}
              color={colors.primary}
              strokeWidth={2.5}
            />
          </View>
        ) : (
          <View style={styles.actionPill}>
            <AppText
              variant="caption"
              color={colors.primary}
              style={styles.actionText}
            >
              Dẫn đường
            </AppText>
            <ChevronRight
              size={15}
              color={colors.primary}
              strokeWidth={2.5}
            />
          </View>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minHeight: 82,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.borderLight,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    ...shadows.card,
  },
  cardExpanded: {
    maxWidth: "49.3%",
  },
  cardPressed: {
    backgroundColor: colors.surfaceAlt,
    borderColor: "#93C5FD",
    transform: [{ scale: 0.99 }],
    opacity: 0.94,
  },
  iconBox: {
    width: 52,
    height: 52,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  content: {
    flex: 1,
    justifyContent: "center",
    gap: 3,
  },
  badgeRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    borderWidth: 1,
    alignSelf: "flex-start",
  },
  badgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "700",
  },
  title: {
    fontWeight: "700",
    fontSize: 16,
    lineHeight: 22,
    color: colors.text,
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 2,
  },
  locationText: {
    fontSize: 12.5,
    fontWeight: "500",
  },
  actionSection: {
    flexShrink: 0,
    justifyContent: "center",
    alignItems: "center",
  },
  actionPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: "#BFDBFE",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
  },
  actionText: {
    fontWeight: "700",
    fontSize: 12.5,
  },
  chevronCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: "#BFDBFE",
    justifyContent: "center",
    alignItems: "center",
  },
});
