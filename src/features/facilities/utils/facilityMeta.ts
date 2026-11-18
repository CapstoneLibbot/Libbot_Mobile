import { colors } from "@/shared/theme";
import type { FacilityType } from "../types/facility.types";

export type FacilityIconType = "endpoint" | "default";

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
    case "ENDPOINT":
      return {
        label: "Địa điểm",
        iconType: "endpoint",
        iconColor: colors.primary,
        iconBg: colors.primarySoft,
        iconBorder: "#BFDBFE",
        badgeBg: colors.primarySoft,
        badgeText: colors.primaryDark,
        badgeBorder: "#BFDBFE",
        dotColor: colors.primary,
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
