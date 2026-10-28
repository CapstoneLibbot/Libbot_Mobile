import { colors } from "@/shared/theme";
import type { FacilityType } from "../types/facility.types";

export type FacilityIconType = "reading_room" | "area" | "default";

export interface FacilityMeta {
  label: string;
  iconType: FacilityIconType;
  iconColor: string;
  iconBg: string;
  iconBorder: string;
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
  dotColor: string;
}

export function getFacilityMeta(type: FacilityType): FacilityMeta {
  switch (type) {
    case "READING_ROOM":
      return {
        label: "Phòng đọc",
        iconType: "reading_room",
        iconColor: colors.primary,
        iconBg: colors.primarySoft,
        iconBorder: "#BFDBFE",
        badgeBg: colors.primarySoft,
        badgeText: colors.primaryDark,
        badgeBorder: "#BFDBFE",
        dotColor: colors.primary,
      };
    case "AREA":
      return {
        label: "Khu vực",
        iconType: "area",
        iconColor: "#0D9488",
        iconBg: "#E6F7F5",
        iconBorder: "#A7F3D0",
        badgeBg: "#ECFDF5",
        badgeText: "#065F46",
        badgeBorder: "#A7F3D0",
        dotColor: "#10B981",
      };
    default:
      return {
        label: "Tiện ích",
        iconType: "default",
        iconColor: colors.textSecondary,
        iconBg: colors.surfaceAlt,
        iconBorder: colors.borderLight,
        badgeBg: colors.surfaceAlt,
        badgeText: colors.textSecondary,
        badgeBorder: colors.borderLight,
        dotColor: colors.subtext,
      };
  }
}
