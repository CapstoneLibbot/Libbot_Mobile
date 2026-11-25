import { MapPin, Menu, Search, Settings, X } from "lucide-react-native";
import React, { useCallback, useEffect, useState } from "react";
import { Animated, Easing, Pressable, StyleSheet, View } from "react-native";
import { useKioskStore } from "@/core/state";
import { AdminPinModal } from "@/features/settings";
import { AppText } from "@/shared/ui";
import { useResponsiveLayout } from "@/shared/layout";
import { colors, radius, shadows, spacing } from "@/shared/theme";
import { IDLE_MENU_CONFIG } from "../constants/idleMenuConfig";

export interface LiBotActionMenuProps {
  onSearchSelect: () => void;
  onFacilitySelect: () => void;
  onSettingsSelect?: () => void;
}

export function LiBotActionMenu({
  onSearchSelect,
  onFacilitySelect,
  onSettingsSelect,
}: LiBotActionMenuProps): React.ReactElement {
  const [isOpen, setIsOpen] = useState(false);
  const [isPinModalVisible, setIsPinModalVisible] = useState(false);
  const recordInteraction = useKioskStore((state) => state.recordInteraction);
  const { insets, isNarrowHeight, width } = useResponsiveLayout();

  // Animated expansion value (0: closed, 1: open)
  const [menuAnim] = useState(() => new Animated.Value(0));

  // Animate open/close
  useEffect(() => {
    Animated.timing(menuAnim, {
      toValue: isOpen ? 1 : 0,
      duration: IDLE_MENU_CONFIG.animationDurationMs,
      easing: isOpen ? Easing.out(Easing.cubic) : Easing.in(Easing.quad),
      useNativeDriver: true,
    }).start();
  }, [isOpen, menuAnim]);

  const toggleMenu = useCallback(() => {
    recordInteraction();
    setIsOpen((prev) => !prev);
  }, [recordInteraction]);

  const closeMenu = useCallback(() => {
    recordInteraction();
    setIsOpen(false);
  }, [recordInteraction]);

  const handleSearchAction = useCallback(() => {
    recordInteraction();
    setIsOpen(false);
    onSearchSelect();
  }, [onSearchSelect, recordInteraction]);

  const handleFacilityAction = useCallback(() => {
    recordInteraction();
    setIsOpen(false);
    onFacilitySelect();
  }, [onFacilitySelect, recordInteraction]);

  const handleSettingsAction = useCallback(() => {
    recordInteraction();
    setIsOpen(false);
    if (onSettingsSelect) {
      setIsPinModalVisible(true);
    }
  }, [onSettingsSelect, recordInteraction]);

  const handlePinSuccess = useCallback(() => {
    setIsPinModalVisible(false);
    onSettingsSelect?.();
  }, [onSettingsSelect]);

  // Interpolations for action items container
  const menuOpacity = menuAnim;
  const menuTranslateY = menuAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-10, 0],
  });
  const menuScale = menuAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.9, 1],
  });

  const fabTop = Math.max(insets.top, spacing.md);
  const fabRight = Math.max(insets.right, spacing.lg);

  // Responsive max width so actions never overflow on narrow landscape screens
  const actionMaxWidth = Math.min(260, width - insets.left - insets.right - 80);

  return (
    <>
      {/* Outside click backdrop when menu is open */}
      {isOpen && (
        <Pressable
          style={styles.backdrop}
          onPress={closeMenu}
          accessibilityLabel="Đóng menu chức năng"
          accessibilityRole="button"
        />
      )}

      {/* Floating Action Menu Container (Top-Right) */}
      <View
        style={[
          styles.floatingContainer,
          {
            top: fabTop,
            right: fabRight,
          },
        ]}
        pointerEvents="box-none"
      >
        {/* Main Hamburger Floating Action Button (FAB) */}
        <Pressable
          onPress={toggleMenu}
          style={({ pressed }) => [
            styles.fabButton,
            {
              opacity: pressed ? 0.88 : 1,
            },
          ]}
          accessibilityRole="button"
          accessibilityLabel={
            isOpen ? "Đóng menu chức năng" : "Mở menu chức năng"
          }
        >
          {isOpen ? (
            <X
              color={colors.surface}
              size={IDLE_MENU_CONFIG.fabIconSize}
              strokeWidth={2.4}
            />
          ) : (
            <Menu
              color={colors.surface}
              size={IDLE_MENU_CONFIG.fabIconSize}
              strokeWidth={2.4}
            />
          )}
        </Pressable>

        {/* Speed Dial Actions (opens vertically downward) */}
        <Animated.View
          style={[
            styles.actionsContainer,
            {
              opacity: menuOpacity,
              transform: [{ translateY: menuTranslateY }, { scale: menuScale }],
            },
          ]}
          pointerEvents={isOpen ? "auto" : "none"}
        >
          {/* Action 1: Tìm sách */}
          <Pressable
            onPress={handleSearchAction}
            style={({ pressed }) => [
              styles.actionItem,
              {
                maxWidth: actionMaxWidth,
                paddingVertical: isNarrowHeight ? spacing.xs + 2 : spacing.sm,
                opacity: pressed ? 0.85 : 1,
              },
            ]}
            accessibilityRole="button"
            accessibilityLabel="Tìm sách"
          >
            <View style={styles.actionIconCircle}>
              <Search
                color={colors.primary}
                size={IDLE_MENU_CONFIG.actionIconSize}
                strokeWidth={2.2}
              />
            </View>
            <AppText
              variant="subtitle"
              numberOfLines={1}
              style={styles.actionLabel}
            >
              Tìm sách
            </AppText>
          </Pressable>

          {/* Action 2: Tìm khu vực */}
          <Pressable
            onPress={handleFacilityAction}
            style={({ pressed }) => [
              styles.actionItem,
              {
                maxWidth: actionMaxWidth,
                paddingVertical: isNarrowHeight ? spacing.xs + 2 : spacing.sm,
                opacity: pressed ? 0.85 : 1,
              },
            ]}
            accessibilityRole="button"
            accessibilityLabel="Tìm khu vực"
          >
            <View style={styles.actionIconCircle}>
              <MapPin
                color={colors.primary}
                size={IDLE_MENU_CONFIG.actionIconSize}
                strokeWidth={2.2}
              />
            </View>
            <AppText
              variant="subtitle"
              numberOfLines={1}
              style={styles.actionLabel}
            >
              Tìm khu vực
            </AppText>
          </Pressable>

          {/* Action 3: Cài đặt hệ thống */}
          {onSettingsSelect && (
            <Pressable
              onPress={handleSettingsAction}
              style={({ pressed }) => [
                styles.actionItem,
                {
                  maxWidth: actionMaxWidth,
                  paddingVertical: isNarrowHeight ? spacing.xs + 2 : spacing.sm,
                  opacity: pressed ? 0.85 : 1,
                },
              ]}
              accessibilityRole="button"
              accessibilityLabel="Cài đặt hệ thống"
            >
              <View style={styles.actionIconCircle}>
                <Settings
                  color={colors.primary}
                  size={IDLE_MENU_CONFIG.actionIconSize}
                  strokeWidth={2.2}
                />
              </View>
              <AppText
                variant="subtitle"
                numberOfLines={1}
                style={styles.actionLabel}
              >
                Cài đặt
              </AppText>
            </Pressable>
          )}
        </Animated.View>
      </View>

      {/* Admin PIN Verification Modal */}
      {onSettingsSelect && (
        <AdminPinModal
          visible={isPinModalVisible}
          onSuccess={handlePinSuccess}
          onClose={() => setIsPinModalVisible(false)}
        />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFill,
    zIndex: IDLE_MENU_CONFIG.zIndex.backdrop,
  },
  floatingContainer: {
    position: "absolute",
    alignItems: "flex-end",
    zIndex: IDLE_MENU_CONFIG.zIndex.fabMenu,
    elevation: 8,
  },
  fabButton: {
    width: IDLE_MENU_CONFIG.fabSize,
    height: IDLE_MENU_CONFIG.fabSize,
    borderRadius: IDLE_MENU_CONFIG.fabSize / 2,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    ...shadows.card,
    shadowColor: colors.primary,
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 8,
  },
  actionsContainer: {
    marginTop: spacing.xs + 2,
    alignItems: "flex-end",
    gap: spacing.xs + 2,
  },
  actionItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
    ...shadows.card,
    shadowColor: colors.text,
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    minHeight: 46,
    alignSelf: "flex-end",
  },
  actionIconCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  actionLabel: {
    color: colors.text,
    flexShrink: 1,
  },
});
