import { Mic } from "lucide-react-native";
import { useFocusEffect } from "expo-router";
import React, { useCallback, useRef } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import Svg, {
  Defs,
  LinearGradient,
  RadialGradient,
  Rect,
  Stop,
} from "react-native-svg";
import { useKioskStore } from "@/core/state";
import type { VoiceGuidanceStart } from "../hooks/useXiaozhiVoiceSession";
import { useNetworkStatus } from "@/platform/network";
import { AppText } from "@/shared/ui";
import { useResponsiveLayout } from "@/shared/layout";
import { colors, radius, shadows, spacing } from "@/shared/theme";
import { LiBotActionMenu } from "../components/LiBotActionMenu";
import { RobotFace, RobotFaceRef } from "../components/RobotFace";
import { VoiceListeningModal } from "../components/VoiceListeningModal";
import { IDLE_MENU_CONFIG } from "../constants/idleMenuConfig";
import { useKioskVoiceCoordinator } from "../hooks/useKioskVoiceCoordinator";

export interface IdleAttractScreenProps {
  onNavigateToSearch: () => void;
  onNavigateToFacilities: () => void;
  onNavigateToBook: (bookId: string) => void;
  onNavigateToLocation: (endpointId: string) => void;
  onGuidanceStarted: (guidance: VoiceGuidanceStart) => void;
  onNavigateToSettings?: () => void;
}

export function IdleAttractScreen({
  onNavigateToSearch,
  onNavigateToFacilities,
  onNavigateToBook,
  onNavigateToLocation,
  onGuidanceStarted,
  onNavigateToSettings,
}: IdleAttractScreenProps): React.ReactElement {
  const recordInteraction = useKioskStore((state) => state.recordInteraction);
  const resetKioskSession = useKioskStore((state) => state.resetKioskSession);
  const { isConnected } = useNetworkStatus();
  const { isTablet, isNarrowHeight, insets } = useResponsiveLayout();

  const robotFaceRef = useRef<RobotFaceRef>(null);
  const isNavigatingRef = useRef(false);

  // Mở khóa chuyển màn hình mỗi khi quay lại màn hình Idle
  useFocusEffect(
    useCallback(() => {
      isNavigatingRef.current = false;
    }, []),
  );

  // Single-flight navigation handler to search (Tìm sách)
  const handleNavigateToSearch = useCallback(() => {
    if (isNavigatingRef.current) {
      return;
    }
    isNavigatingRef.current = true;
    setTimeout(() => {
      isNavigatingRef.current = false;
    }, 1000);

    resetKioskSession();
    recordInteraction();
    onNavigateToSearch();
  }, [onNavigateToSearch, recordInteraction, resetKioskSession]);

  // Single-flight navigation handler to facilities (Tìm khu vực)
  const handleNavigateToFacilities = useCallback(() => {
    if (isNavigatingRef.current) {
      return;
    }
    isNavigatingRef.current = true;
    setTimeout(() => {
      isNavigatingRef.current = false;
    }, 1000);

    resetKioskSession();
    recordInteraction();
    onNavigateToFacilities();
  }, [onNavigateToFacilities, recordInteraction, resetKioskSession]);

  // Single-flight navigation handler to settings (Cài đặt)
  const handleNavigateToSettings = useCallback(() => {
    if (isNavigatingRef.current) {
      return;
    }
    isNavigatingRef.current = true;
    setTimeout(() => {
      isNavigatingRef.current = false;
    }, 1000);

    resetKioskSession();
    recordInteraction();
    onNavigateToSettings?.();
  }, [onNavigateToSettings, recordInteraction, resetKioskSession]);

  // Voice Coordinator: điều phối nhả/nhận mic giữa Vosk và Xiaozhi có buffer an toàn
  const voice = useKioskVoiceCoordinator({
    isConnected,
    onRecordInteraction: recordInteraction,
  });

  // Touching the robot face triggers the playful eye reaction without navigating
  const handleFaceTouch = useCallback(() => {
    recordInteraction();
    robotFaceRef.current?.triggerTouchReaction();
  }, [recordInteraction]);

  const voiceFabBottom = Math.max(insets.bottom, spacing.md);
  const voiceFabRight = Math.max(insets.right, spacing.lg);

  return (
    <View style={styles.container}>
      {/* Fullscreen subtle vector gradient & soft center highlight background */}
      <Svg style={StyleSheet.absoluteFill} width="100%" height="100%">
        <Defs>
          <LinearGradient id="screenBg" x1="0%" y1="0%" x2="0%" y2="100%">
            <Stop offset="0%" stopColor={colors.accent} stopOpacity="0.85" />
            <Stop offset="55%" stopColor="#F3F7FD" stopOpacity="0.95" />
            <Stop offset="100%" stopColor={colors.background} stopOpacity="1" />
          </LinearGradient>
          <RadialGradient id="centerGlow" cx="50%" cy="40%" rx="45%" ry="45%">
            <Stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.8" />
            <Stop offset="100%" stopColor={colors.accent} stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill="url(#screenBg)" />
        <Rect x="0" y="0" width="100%" height="100%" fill="url(#centerGlow)" />
      </Svg>

      {/* Floating Hamburger Speed Dial Menu (Top-Right) */}
      <LiBotActionMenu
        onSearchSelect={handleNavigateToSearch}
        onFacilitySelect={handleNavigateToFacilities}
        onSettingsSelect={onNavigateToSettings ? handleNavigateToSettings : undefined}
      />

      {/* Independent Voice FAB (Bottom-Right, Safe Area aware) */}
      <Pressable
        onPress={voice.openManualVoice}
        style={({ pressed }) => [
          styles.voiceFabButton,
          {
            bottom: voiceFabBottom,
            right: voiceFabRight,
            opacity: pressed ? 0.88 : 1,
          },
        ]}
        accessibilityRole="button"
        accessibilityLabel="Trò chuyện với robot"
      >
        <Mic
          color={colors.surface}
          size={IDLE_MENU_CONFIG.fabIconSize}
          strokeWidth={2.4}
        />
      </Pressable>

      {/* Voice Listening Simulation Modal */}
      <VoiceListeningModal
        visible={voice.isVoiceModalOpen}
        activation={voice.voiceActivation}
        onClose={voice.closeVoice}
        onSelectBook={onNavigateToBook}
        onSelectLocation={onNavigateToLocation}
        onGuidanceStarted={(guidance) => {
          voice.closeVoice();
          onGuidanceStarted(guidance);
        }}
      />

      <View
        style={[
          styles.contentWrapper,
          {
            paddingLeft: Math.max(insets.left, spacing.xl),
            paddingRight: Math.max(insets.right, spacing.xl),
            paddingTop: Math.max(insets.top, spacing.sm),
            paddingBottom: Math.max(insets.bottom, spacing.xs),
          },
        ]}
      >
        {/* Top bar kiosk status indicator */}
        <View style={styles.topBar}>
          <View style={styles.statusIndicator}>
            <View
              style={[
                styles.statusDot,
                {
                  backgroundColor: isConnected
                    ? colors.success
                    : colors.warning,
                },
              ]}
            />
            <AppText variant="caption" color={colors.textSecondary}>
              {voice.statusLabel}
            </AppText>
          </View>
        </View>

        {/* Center robot face section */}
        <View
          style={[
            styles.centerSection,
            { gap: isNarrowHeight ? spacing.sm : spacing.lg },
          ]}
        >
          <Pressable
            onPress={handleFaceTouch}
            accessible={false}
            style={[
              styles.faceTouchContainer,
              isNarrowHeight && { transform: [{ scale: 0.82 }] },
            ]}
          >
            <RobotFace ref={robotFaceRef} />
          </Pressable>

          {/* Greeting text block */}
          <View
            style={[
              styles.textContainer,
              { gap: isNarrowHeight ? 2 : spacing.xs },
            ]}
          >
            <AppText
              variant={isTablet ? "hero" : "title"}
              style={styles.greetingTitle}
            >
              Xin chào! Tôi là robot thư viện
            </AppText>
            <AppText
              variant={isNarrowHeight ? "body" : "subtitle"}
              color={colors.textSecondary}
              style={[
                styles.greetingSubtitle,
                isNarrowHeight && { lineHeight: 20 },
              ]}
            >
              Tôi có thể giúp bạn tìm sách hoặc dẫn đường trong thư viện
            </AppText>
          </View>
        </View>

        {/* Bottom subtle spacer to preserve landscape vertical balance */}
        <View style={[styles.bottomSpacer, isNarrowHeight && { height: 4 }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  contentWrapper: {
    flex: 1,
    justifyContent: "space-between",
    alignItems: "center",
  },
  topBar: {
    width: "100%",
    flexDirection: "row",
    justifyContent: "flex-start",
    alignItems: "center",
  },
  statusIndicator: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: "rgba(255, 255, 255, 0.75)",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    maxWidth: "60%",
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    flexShrink: 0,
  },
  centerSection: {
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
  },
  faceTouchContainer: {
    alignItems: "center",
    justifyContent: "center",
  },
  textContainer: {
    alignItems: "center",
    maxWidth: 680,
  },
  greetingTitle: {
    color: colors.text,
    textAlign: "center",
  },
  greetingSubtitle: {
    textAlign: "center",
    lineHeight: 24,
  },
  bottomSpacer: {
    height: spacing.lg,
  },
  voiceFabButton: {
    position: "absolute",
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
    zIndex: IDLE_MENU_CONFIG.zIndex.fabMenu,
  },
});
