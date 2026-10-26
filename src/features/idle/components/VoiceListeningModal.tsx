import { Mic, X } from "lucide-react-native";
import React, { useCallback, useEffect, useState } from "react";
import { Animated, Easing, Pressable, StyleSheet, View } from "react-native";
import { useKioskStore } from "@/core/state";
import { AppText } from "@/shared/ui";
import { useResponsiveLayout } from "@/shared/layout";
import { colors, radius, shadows, spacing } from "@/shared/theme";
import { IDLE_MENU_CONFIG } from "../constants/idleMenuConfig";
import { useRealtimeVoiceSession } from "../hooks/useRealtimeVoiceSession";

export interface VoiceListeningModalProps {
  visible: boolean;
  onClose: () => void;
}

export function VoiceListeningModal({
  visible,
  onClose,
}: VoiceListeningModalProps): React.ReactElement | null {
  const recordInteraction = useKioskStore((state) => state.recordInteraction);
  const setVoiceActive = useKioskStore((state) => state.setVoiceActive);
  const { isTablet, isNarrowHeight, insets, width } = useResponsiveLayout();
  const { status, error, start, stop } = useRealtimeVoiceSession();

  // Animation values initialized once via useState for React 19 safety
  const [pulseAnim] = useState(() => new Animated.Value(0));
  const [bar1] = useState(() => new Animated.Value(12));
  const [bar2] = useState(() => new Animated.Value(24));
  const [bar3] = useState(() => new Animated.Value(18));
  const [bar4] = useState(() => new Animated.Value(28));
  const [bar5] = useState(() => new Animated.Value(14));

  // Safe handler to close the live WebRTC session and notify the kiosk store.
  const handleClose = useCallback(() => {
    stop();
    setVoiceActive(false);
    recordInteraction();
    onClose();
  }, [onClose, recordInteraction, setVoiceActive, stop]);

  // Register interaction without interrupting a live conversation.
  const handleUserInteraction = useCallback(() => {
    recordInteraction();
  }, [recordInteraction]);

  useEffect(() => {
    if (!visible) return;

    // Suppress idle reset while the live voice session owns the microphone.
    setVoiceActive(true);
    recordInteraction();
    void start();

    // Pulse ring animation loop
    const pulseLoop = Animated.loop(
      Animated.timing(pulseAnim, {
        toValue: 1,
        duration: 1600,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
    );
    pulseLoop.start();

    // Sound wave bars animation loops
    const createBarAnimation = (
      anim: Animated.Value,
      min: number,
      max: number,
      duration: number,
    ) => {
      return Animated.loop(
        Animated.sequence([
          Animated.timing(anim, {
            toValue: max,
            duration,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: false,
          }),
          Animated.timing(anim, {
            toValue: min,
            duration,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: false,
          }),
        ]),
      );
    };

    const maxBar = isNarrowHeight ? 26 : 40;
    const barLoops = [
      createBarAnimation(bar1, 8, maxBar * 0.75, 420),
      createBarAnimation(bar2, 10, maxBar, 360),
      createBarAnimation(bar3, 6, maxBar * 0.85, 480),
      createBarAnimation(bar4, 10, maxBar * 0.95, 390),
      createBarAnimation(bar5, 8, maxBar * 0.7, 450),
    ];

    barLoops.forEach((loop) => loop.start());

    return () => {
      stop();
      pulseLoop.stop();
      barLoops.forEach((loop) => loop.stop());
      setVoiceActive(false);
    };
  }, [
    visible,
    bar1,
    bar2,
    bar3,
    bar4,
    bar5,
    isNarrowHeight,
    pulseAnim,
    recordInteraction,
    setVoiceActive,
    start,
    stop,
  ]);

  if (!visible) {
    return null;
  }

  const pulseScale = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.45],
  });

  const pulseOpacity = pulseAnim.interpolate({
    inputRange: [0, 0.7, 1],
    outputRange: [0.65, 0.25, 0],
  });

  // Responsive card max-width avoiding iPhone notch / home indicator
  const cardMaxWidth = isTablet
    ? 500
    : Math.min(width - (insets.left + insets.right + 48), 440);

  return (
    <View
      style={styles.overlay}
      accessibilityViewIsModal={true}
      accessibilityRole="none"
    >
      {/* Backdrop press closes modal */}
      <Pressable
        style={styles.backdropPressable}
        onPress={handleClose}
        accessibilityLabel="Đóng hộp thoại giọng nói"
        accessibilityRole="button"
      />

      {/* Simplified Modal Card */}
      <Pressable
        style={[
          styles.card,
          {
            maxWidth: cardMaxWidth,
            paddingVertical: isNarrowHeight ? spacing.md : spacing.xl,
            paddingHorizontal: isNarrowHeight ? spacing.lg : spacing.xxl,
          },
        ]}
        onPress={handleUserInteraction}
        accessible={false}
      >
        {/* Top-right X Close Button */}
        <Pressable
          onPress={handleClose}
          style={styles.cardCloseButton}
          accessibilityRole="button"
          accessibilityLabel="Đóng"
        >
          <X color={colors.textSecondary} size={20} />
        </Pressable>

        {/* Pulsing Mic visualizer */}
        <View
          style={[
            styles.micVisualizerContainer,
            isNarrowHeight && styles.micVisualizerContainerNarrow,
          ]}
        >
          <Animated.View
            style={[
              styles.pulseRing,
              isNarrowHeight && styles.pulseRingNarrow,
              {
                transform: [{ scale: pulseScale }],
                opacity: pulseOpacity,
              },
            ]}
          />

          <View
            style={[styles.micCircle, isNarrowHeight && styles.micCircleNarrow]}
          >
            <Mic
              color={colors.surface}
              size={isNarrowHeight ? 30 : 38}
              strokeWidth={2.2}
            />
          </View>
        </View>

        {/* Audio frequency wave bars */}
        <View
          style={[
            styles.waveBarsRow,
            isNarrowHeight && styles.waveBarsRowNarrow,
          ]}
        >
          <Animated.View style={[styles.waveBar, { height: bar1 }]} />
          <Animated.View style={[styles.waveBar, { height: bar2 }]} />
          <Animated.View style={[styles.waveBar, { height: bar3 }]} />
          <Animated.View style={[styles.waveBar, { height: bar4 }]} />
          <Animated.View style={[styles.waveBar, { height: bar5 }]} />
        </View>

        {/* Title */}
        <AppText
          variant={isNarrowHeight ? "subtitle" : "heading"}
          style={styles.title}
        >
          LiBot đang lắng nghe
        </AppText>

        {/* Description: instructing user to speak book title, author, or area */}
        <AppText
          variant="body"
          color={colors.textSecondary}
          style={[
            styles.description,
            isNarrowHeight && styles.descriptionNarrow,
          ]}
        >
          Bạn có thể nói tên sách, tác giả hoặc khu vực bạn muốn tìm.
        </AppText>
        <AppText
          variant="caption"
          color={error ? colors.danger : colors.textSecondary}
          style={styles.connectionStatus}
        >
          {error
            ? error
            : status === "connecting"
              ? "Đang kết nối trợ lý giọng nói…"
              : status === "stopping"
                ? "Đang kết thúc cuộc trò chuyện…"
                : "Bạn có thể nói ngay bây giờ."}
        </AppText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFill,
    zIndex: IDLE_MENU_CONFIG.zIndex.modal,
    elevation: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  backdropPressable: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(23, 24, 28, 0.55)",
  },
  card: {
    width: "100%",
    backgroundColor: colors.surface,
    borderRadius: radius.lg + 4,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.card,
    shadowColor: colors.text,
    shadowOpacity: 0.18,
    shadowRadius: 20,
    elevation: 12,
  },
  cardCloseButton: {
    position: "absolute",
    top: spacing.sm + 2,
    right: spacing.sm + 2,
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surfaceAlt,
    zIndex: 2,
  },
  micVisualizerContainer: {
    width: 110,
    height: 110,
    alignItems: "center",
    justifyContent: "center",
    marginTop: spacing.xs,
    marginBottom: spacing.sm,
  },
  micVisualizerContainerNarrow: {
    width: 80,
    height: 80,
    marginBottom: spacing.xs,
  },
  pulseRing: {
    position: "absolute",
    width: 84,
    height: 84,
    borderRadius: 42,
    borderWidth: 3,
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  pulseRingNarrow: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
  },
  micCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    ...shadows.card,
    shadowColor: colors.primary,
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  micCircleNarrow: {
    width: 58,
    height: 58,
    borderRadius: 29,
  },
  waveBarsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    height: 38,
    marginBottom: spacing.xs,
  },
  waveBarsRowNarrow: {
    height: 26,
    gap: 4,
    marginBottom: 2,
  },
  waveBar: {
    width: 5,
    borderRadius: 3,
    backgroundColor: colors.primary,
  },
  title: {
    textAlign: "center",
    color: colors.text,
    marginBottom: spacing.xs,
  },
  description: {
    textAlign: "center",
    maxWidth: 360,
    lineHeight: 22,
  },
  descriptionNarrow: {
    fontSize: 13,
    lineHeight: 18,
  },
  connectionStatus: {
    textAlign: "center",
    marginTop: spacing.sm,
    maxWidth: 360,
  },
});
