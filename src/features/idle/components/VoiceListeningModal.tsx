import {
  BookOpen,
  ChevronLeft,
  ChevronRight,
  MapPin,
  MessageCircle,
  Mic,
  MicOff,
  X,
} from "lucide-react-native";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Animated,
  Easing,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { useKioskStore } from "@/core/state";
import { kioskTimeoutConfig } from "@/core/config";
import { useResponsiveLayout } from "@/shared/layout";
import { colors, radius, shadows, spacing } from "@/shared/theme";
import { AppButton, AppText } from "@/shared/ui";
import { IDLE_MENU_CONFIG } from "../constants/idleMenuConfig";
import {
  type VoiceConversationEntry,
  type VoiceGuidanceStart,
  type VoiceToolResult,
} from "../hooks/useXiaozhiVoiceSession";
import { useVoiceSession } from "../hooks/useVoiceSession";
import {
  computeVoiceModalLayout,
  DEFAULT_LIBOT_GREETING,
} from "../utils/voiceModalLayout";
import { getVoiceSessionCopy } from "../domain/voiceSessionState";

export {
  DEFAULT_LIBOT_GREETING,
} from "../utils/voiceModalLayout";
export {
  getVoiceSessionCopy as voiceSessionCopy,
} from "../domain/voiceSessionState";

export interface VoiceListeningModalProps {
  visible: boolean;
  activation?: "manual" | "wake";
  onClose: () => void;
  onSelectBook: (bookId: string) => void;
  onSelectLocation: (endpointId: string) => void;
  onGuidanceStarted: (guidance: VoiceGuidanceStart) => void;
}

function ToolResultCards({
  result,
  onSelectBook,
  onSelectLocation,
}: {
  result: VoiceToolResult;
  onSelectBook: (bookId: string) => void;
  onSelectLocation: (endpointId: string) => void;
}): React.ReactElement | null {
  if (result.kind === "books") {
    if (result.books.length === 0) return null;
    return (
      <View style={styles.resultList}>
        <AppText variant="caption" color={colors.subtext}>
          {result.totalMatches} kết quả phù hợp
        </AppText>
        {result.books.map((book) => (
          <View key={book.bookId} style={styles.resultCard}>
            <Pressable
              onPress={() => onSelectBook(book.bookId)}
              style={({ pressed }) => [
                styles.resultCardMain,
                pressed && styles.resultCardPressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel={`Mở chi tiết sách ${book.title}`}
            >
              <View style={styles.resultIcon}>
                <BookOpen color={colors.primary} size={20} />
              </View>
              <View style={styles.resultCopy}>
                <AppText
                  variant="body"
                  style={styles.resultTitle}
                  numberOfLines={2}
                >
                  {book.title}
                </AppText>
                <AppText variant="caption" color={colors.textSecondary} numberOfLines={1}>
                  {book.author || "Không rõ tác giả"}
                </AppText>
                <AppText
                  variant="caption"
                  color={colors.primary}
                  numberOfLines={1}
                >
                  {book.canGuide ? "Có thể dẫn đường" : "Chưa thể dẫn đường"}
                </AppText>
              </View>
            </Pressable>
            <AppButton
              title="Chi tiết"
              size="md"
              onPress={() => onSelectBook(book.bookId)}
              style={styles.detailButton}
            />
          </View>
        ))}
      </View>
    );
  }

  if (result.kind === "locations") {
    if (result.locations.length === 0) return null;
    return (
      <View style={styles.resultList}>
        <AppText variant="caption" color={colors.subtext}>
          {result.totalMatches} địa điểm phù hợp
        </AppText>
        {result.locations.map((location) => (
          <View key={location.endpointId} style={styles.resultCard}>
            <Pressable
              onPress={() => onSelectLocation(location.endpointId)}
              style={({ pressed }) => [styles.resultCardMain, pressed && styles.resultCardPressed]}
              accessibilityRole="button"
              accessibilityLabel={`Mở địa điểm ${location.name}`}
            >
              <View style={styles.resultIcon}>
                <MapPin color={colors.primary} size={20} />
              </View>
              <View style={styles.resultCopy}>
                <AppText variant="body" style={styles.resultTitle} numberOfLines={2}>
                  {location.name}
                </AppText>
                <AppText variant="caption" color={colors.primary} numberOfLines={1}>
                  {location.canGuide ? "Có thể dẫn đường" : "Chưa thể dẫn đường"}
                </AppText>
              </View>
            </Pressable>
            <AppButton title="Chi tiết" size="md" onPress={() => onSelectLocation(location.endpointId)} style={styles.detailButton} />
          </View>
        ))}
      </View>
    );
  }

  return null;
}

function ConversationMessageEntry({
  entry,
  onSelectBook,
  onSelectLocation,
}: {
  entry: VoiceConversationEntry;
  onSelectBook: (bookId: string) => void;
  onSelectLocation: (endpointId: string) => void;
}): React.ReactElement {
  const isUser = entry.speaker === "user";
  return (
    <View style={[styles.messageRow, isUser && styles.userMessageRow]}>
      {!isUser ? (
        <View style={styles.assistantAvatar}>
          <AppText variant="caption" style={styles.assistantAvatarText}>
            LB
          </AppText>
        </View>
      ) : null}
      <View style={[styles.messageColumn, isUser && styles.userMessageColumn]}>
        <View
          style={[
            styles.messageBubble,
            isUser ? styles.userBubble : styles.assistantBubble,
          ]}
        >
          {entry.text ? (
            <AppText
              variant="body"
              color={isUser ? colors.surface : colors.text}
            >
              {entry.text}
            </AppText>
          ) : entry.isPending ? (
            <AppText variant="body" color={colors.textSecondary}>
              Đang tìm thông tin…
            </AppText>
          ) : null}
        </View>
        {entry.toolResult ? (
          <ToolResultCards
            result={entry.toolResult}
            onSelectBook={onSelectBook}
            onSelectLocation={onSelectLocation}
          />
        ) : null}
      </View>
    </View>
  );
}

function VoiceListeningModalInner({
  onClose,
  onSelectBook,
  onSelectLocation,
  onGuidanceStarted,
  activation = "manual",
}: Omit<VoiceListeningModalProps, "visible">): React.ReactElement {
  const recordInteraction = useKioskStore((state) => state.recordInteraction);
  const setVoiceActive = useKioskStore((state) => state.setVoiceActive);
  const lastInteractionAt = useKioskStore((state) => state.lastInteractionAt);
  const { width, height, insets } = useResponsiveLayout();
  const {
    status,
    error,
    transcript,
    conversation,
    start,
    stop,
    voiceActivitySequence,
    guidanceStart,
    isMuted,
    toggleMute,
  } =
    useVoiceSession();
  const conversationRef = useRef<ScrollView>(null);
  const statusCopy = isMuted
    ? {
      title: "Đã tạm dừng nghe",
      description: "Bấm nút để tiếp tục nói.",
    }
    : getVoiceSessionCopy(status, error);

  const isTogglingMuteRef = useRef(false);
  const handleToggleMute = useCallback(() => {
    if (isTogglingMuteRef.current) return;
    isTogglingMuteRef.current = true;
    recordInteraction();
    void toggleMute().finally(() => {
      setTimeout(() => {
        isTogglingMuteRef.current = false;
      }, 350);
    });
  }, [recordInteraction, toggleMute]);

  // Responsive layout dimensions
  const layout = computeVoiceModalLayout(width, height, insets);

  // Expansion state: always false initially on fresh mount
  const [isExpanded, setIsExpanded] = useState(false);

  // One progress value drives both layout and visual transition. Width is a
  // JS-driven Animated property, so this animation must never use native driver.
  const [expandProgress] = useState(() => new Animated.Value(0));

  // Waveform bars (symmetric 7-bar audio visualizer matching anh1/anh2)
  const [bar1] = useState(() => new Animated.Value(10));
  const [bar2] = useState(() => new Animated.Value(22));
  const [bar3] = useState(() => new Animated.Value(14));
  const [bar4] = useState(() => new Animated.Value(36));
  const [bar5] = useState(() => new Animated.Value(14));
  const [bar6] = useState(() => new Animated.Value(22));
  const [bar7] = useState(() => new Animated.Value(10));
  const closeInFlightRef = useRef(false);

  const handleClose = useCallback(() => {
    if (closeInFlightRef.current) return Promise.resolve();
    closeInFlightRef.current = true;
    return stop().finally(() => {
      setVoiceActive(false);
      recordInteraction();
      onClose();
    });
  }, [onClose, recordInteraction, setVoiceActive, stop]);

  const handleSelectBook = useCallback(
    async (bookId: string) => {
      await handleClose();
      onSelectBook(bookId);
    },
    [handleClose, onSelectBook],
  );
  const handleSelectLocation = useCallback(
    async (endpointId: string) => {
      await handleClose();
      onSelectLocation(endpointId);
    },
    [handleClose, onSelectLocation],
  );

  useEffect(() => {
    if (!guidanceStart) return;
    const sessionToStart = guidanceStart;
    setVoiceActive(false);
    onClose();
    void stop().finally(() => onGuidanceStarted(sessionToStart));
  }, [guidanceStart, onClose, onGuidanceStarted, setVoiceActive, stop]);

  const handleExpand = useCallback(() => {
    recordInteraction();
    setIsExpanded(true);
    Animated.timing(expandProgress, {
      toValue: 1,
      duration: 260,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [expandProgress, recordInteraction]);

  const handleCollapse = useCallback(() => {
    recordInteraction();
    Animated.timing(expandProgress, {
      toValue: 0,
      duration: 240,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start(({ finished }) => {
      if (finished) {
        setIsExpanded(false);
      }
    });
  }, [expandProgress, recordInteraction]);

  // A shared kiosk must not leave an abandoned reader's conversation on
  // screen. Native `speech_started` resets this timer before Google Speech
  // Recognizer can publish a transcript, so a reader is never closed out
  // while saying a short answer such as "đồng ý".
  useEffect(() => {
    if (status !== "listening" || isMuted) return;
    const timer = setTimeout(() => {
      if (__DEV__) {
        console.log(
          `[VoiceListeningModal] Inactivity timeout (${kioskTimeoutConfig.voiceModalInactivitySeconds}s) reached without voice activity. Auto-closing modal.`,
        );
      }
      handleClose();
    }, kioskTimeoutConfig.voiceModalInactivityMs);
    return () => clearTimeout(timer);
  }, [handleClose, isMuted, lastInteractionAt, status, voiceActivitySequence]);

  // Session lifecycle
  useEffect(() => {
    setVoiceActive(true);
    recordInteraction();
    void start(activation === "wake" ? "Tôi nghe đây" : undefined);

    return () => {
      void stop();
      setVoiceActive(false);
    };
  }, [activation, recordInteraction, setVoiceActive, start, stop]);

  // Waveform animation
  useEffect(() => {
    if (isMuted) {
      bar1.setValue(8);
      bar2.setValue(12);
      bar3.setValue(10);
      bar4.setValue(16);
      bar5.setValue(10);
      bar6.setValue(12);
      bar7.setValue(8);
      return;
    }

    const animateBar = (
      val: Animated.Value,
      min: number,
      max: number,
      duration: number,
    ) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(val, {
            toValue: max,
            duration,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: false,
          }),
          Animated.timing(val, {
            toValue: min,
            duration,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: false,
          }),
        ]),
      );

    const maxBar = layout.isNarrowHeight ? 34 : 52;
    const loops = [
      animateBar(bar1, 8, maxBar * 0.45, 420),
      animateBar(bar2, 12, maxBar * 0.72, 360),
      animateBar(bar3, 10, maxBar * 0.55, 480),
      animateBar(bar4, 16, maxBar, 390),
      animateBar(bar5, 10, maxBar * 0.55, 450),
      animateBar(bar6, 12, maxBar * 0.72, 370),
      animateBar(bar7, 8, maxBar * 0.45, 430),
    ];
    loops.forEach((loop) => loop.start());

    return () => {
      loops.forEach((loop) => loop.stop());
    };
  }, [
    bar1,
    bar2,
    bar3,
    bar4,
    bar5,
    bar6,
    bar7,
    isMuted,
    layout.isNarrowHeight,
  ]);

  const barColor = isMuted
    ? colors.subtext
    : error
      ? colors.danger
      : colors.primary;

  // Conversations to display (with initial greeting if conversation array is empty)
  const displayConversation: VoiceConversationEntry[] =
    conversation.length > 0
      ? conversation
      : [
        {
          id: "initial-greeting",
          speaker: "assistant",
          text: DEFAULT_LIBOT_GREETING,
        },
      ];

  // =========================================================================
  // Compact Viewport (< 600dp, e.g. Phone portrait)
  // Fluid modal with 100% full-width horizontal sliding transition
  // =========================================================================
  if (layout.isCompact) {
    const compactTranslateX = expandProgress.interpolate({
      inputRange: [0, 1],
      outputRange: [0, -layout.cardMaxWidth],
    });

    return (
      <View
        style={styles.overlay}
        accessibilityViewIsModal
        accessibilityRole="none"
      >
        <Pressable
          style={styles.backdropPressable}
          onPress={handleClose}
          accessibilityRole="button"
          accessibilityLabel="Đóng hộp thoại giọng nói"
        />

        <View
          style={[
            styles.compactModalContainer,
            {
              width: layout.cardMaxWidth,
              height: layout.cardMaxHeight,
            },
          ]}
        >
          <Animated.View
            style={[
              styles.compactTrack,
              {
                width: layout.cardMaxWidth * 2,
                transform: [{ translateX: compactTranslateX }],
              },
            ]}
          >
            {/* Page 1: Live Voice Panel */}
            <View
              style={[
                styles.panelCard,
                { width: layout.cardMaxWidth, height: layout.cardMaxHeight },
              ]}
            >
              {/* Header */}
              <View style={styles.panelHeader}>
                <View style={styles.headerTitleGroup}>
                  <View
                    style={[
                      styles.liveIndicatorDot,
                      isMuted && styles.liveIndicatorDotMuted,
                    ]}
                  />
                  <AppText
                    variant="subtitle"
                    color={isMuted ? colors.subtext : colors.primary}
                    style={styles.panelHeading}
                  >
                    GIỌNG NÓI TRỰC TIẾP
                  </AppText>
                </View>
                <Pressable
                  onPress={handleClose}
                  style={styles.closeButton}
                  accessibilityRole="button"
                  accessibilityLabel="Đóng cuộc trò chuyện"
                  hitSlop={6}
                >
                  <X color={colors.textSecondary} size={20} />
                </Pressable>
              </View>

              {/* Voice Content */}
              <View style={styles.liveContent}>
                <View style={styles.waveBarsRow}>
                  <Animated.View
                    style={[
                      styles.waveBar,
                      { height: bar1, backgroundColor: barColor },
                    ]}
                  />
                  <Animated.View
                    style={[
                      styles.waveBar,
                      { height: bar2, backgroundColor: barColor },
                    ]}
                  />
                  <Animated.View
                    style={[
                      styles.waveBar,
                      { height: bar3, backgroundColor: barColor },
                    ]}
                  />
                  <Animated.View
                    style={[
                      styles.waveBar,
                      { height: bar4, backgroundColor: barColor },
                    ]}
                  />
                  <Animated.View
                    style={[
                      styles.waveBar,
                      { height: bar5, backgroundColor: barColor },
                    ]}
                  />
                  <Animated.View
                    style={[
                      styles.waveBar,
                      { height: bar6, backgroundColor: barColor },
                    ]}
                  />
                  <Animated.View
                    style={[
                      styles.waveBar,
                      { height: bar7, backgroundColor: barColor },
                    ]}
                  />
                </View>

                <AppText
                  variant={layout.isNarrowHeight ? "subtitle" : "heading"}
                  style={styles.voiceTitle}
                  numberOfLines={1}
                >
                  {statusCopy.title}
                </AppText>
                <AppText
                  variant="body"
                  color={
                    isMuted
                      ? colors.warning
                      : error
                        ? colors.danger
                        : colors.textSecondary
                  }
                  style={styles.voiceDescription}
                  numberOfLines={2}
                >
                  {statusCopy.description}
                </AppText>

                <Pressable
                  onPress={handleToggleMute}
                  style={({ pressed }) => [
                    styles.mutePillButton,
                    isMuted
                      ? styles.mutePillButtonMuted
                      : styles.mutePillButtonActive,
                    pressed && styles.mutePillButtonPressed,
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={
                    isMuted ? "Bật micro để nói" : "Tắt micro tạm thời"
                  }
                >
                  {isMuted ? (
                    <MicOff
                      color={colors.danger}
                      size={18}
                      strokeWidth={2.2}
                    />
                  ) : (
                    <Mic
                      color={colors.primary}
                      size={18}
                      strokeWidth={2.2}
                    />
                  )}
                  <AppText
                    variant="caption"
                    style={[
                      styles.mutePillText,
                      isMuted
                        ? styles.mutePillTextMuted
                        : styles.mutePillTextActive,
                    ]}
                  >
                    {isMuted
                      ? "Micro đang tắt"
                      : "Tạm dừng nghe"}
                  </AppText>
                </Pressable>
              </View>

              {/* Bottom Transcript */}
              <View style={styles.liveTranscript}>
                <AppText
                  variant="body"
                  style={styles.liveTranscriptText}
                  numberOfLines={2}
                >
                  <AppText style={styles.liveTranscriptPrefix}>Bạn: </AppText>
                  &quot;
                  {isMuted
                    ? "Micro đang tắt…"
                    : transcript || "Tôi muốn tìm sách…"}
                  &quot;
                  {status === "listening" && !isMuted ? (
                    <AppText color={colors.primary} style={styles.cursorText}>
                      {" "}
                      |
                    </AppText>
                  ) : null}
                </AppText>
              </View>

              {/* Expand tab at right edge */}
              <Pressable
                onPress={handleExpand}
                style={styles.compactExpandTab}
                accessibilityRole="button"
                accessibilityLabel="Mở nhật ký trò chuyện"
                hitSlop={{ top: 12, bottom: 12, left: 16, right: 16 }}
              >
                <ChevronRight
                  color={colors.textSecondary}
                  size={16}
                  strokeWidth={2.2}
                />
              </Pressable>
            </View>

            {/* Page 2: Conversation Log Panel */}
            <View
              style={[
                styles.panelCard,
                { width: layout.cardMaxWidth, height: layout.cardMaxHeight },
              ]}
            >
              {/* Header with back button and close button */}
              <View style={styles.panelHeader}>
                <View style={styles.headerTitleGroup}>
                  <Pressable
                    onPress={handleCollapse}
                    style={styles.headerIconButton}
                    accessibilityRole="button"
                    accessibilityLabel="Thu gọn nhật ký trò chuyện"
                    hitSlop={8}
                  >
                    <ChevronLeft
                      color={colors.textSecondary}
                      size={22}
                      strokeWidth={2.5}
                    />
                  </Pressable>
                  <MessageCircle color={colors.primary} size={20} />
                  <AppText
                    variant="subtitle"
                    style={styles.conversationHeading}
                  >
                    NHẬT KÝ TRÒ CHUYỆN
                  </AppText>
                </View>

                <Pressable
                  onPress={handleClose}
                  style={styles.headerIconButton}
                  accessibilityRole="button"
                  accessibilityLabel="Đóng cuộc trò chuyện"
                  hitSlop={6}
                >
                  <X color={colors.textSecondary} size={20} />
                </Pressable>
              </View>

              <ScrollView
                ref={conversationRef}
                style={styles.conversationScroll}
                contentContainerStyle={styles.conversationContent}
                showsVerticalScrollIndicator={false}
                onContentSizeChange={() =>
                  conversationRef.current?.scrollToEnd({ animated: true })
                }
                onTouchStart={recordInteraction}
              >
                {displayConversation.map((entry) => (
                  <ConversationMessageEntry
                    key={entry.id}
                    entry={entry}
                    onSelectBook={handleSelectBook}
                    onSelectLocation={handleSelectLocation}
                  />
                ))}
              </ScrollView>
            </View>
          </Animated.View>
        </View>
      </View>
    );
  }

  // =========================================================================
  // Medium (600–839dp) and Expanded (>= 840dp) Viewports
  // Fluid modal widening from single panel into two distinct panels (anh1 -> anh2)
  // =========================================================================
  const containerWidth = expandProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [layout.collapsedWidth, layout.expandedWidth],
  });

  const leftPanelWidth = expandProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [layout.collapsedWidth, layout.panelWidth],
  });

  const rightPanelWidth = expandProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, layout.panelWidth],
  });

  const rightPanelOpacity = expandProgress.interpolate({
    inputRange: [0, 0.25, 1],
    outputRange: [0, 0.15, 1],
    extrapolate: "clamp",
  });

  const rightPanelTranslateX = expandProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [36, 0],
    extrapolate: "clamp",
  });

  const expandTabOpacity = expandProgress.interpolate({
    inputRange: [0, 0.3],
    outputRange: [1, 0],
    extrapolate: "clamp",
  });

  const leftCloseOpacity = expandProgress.interpolate({
    inputRange: [0, 0.4],
    outputRange: [1, 0],
    extrapolate: "clamp",
  });

  return (
    <View
      style={styles.overlay}
      accessibilityViewIsModal
      accessibilityRole="none"
    >
      <Pressable
        style={styles.backdropPressable}
        onPress={handleClose}
        accessibilityRole="button"
        accessibilityLabel="Đóng hộp thoại giọng nói"
      />

      <Animated.View
        style={[
          styles.twoPanelContainer,
          {
            width: containerWidth,
            height: layout.cardMaxHeight,
          },
        ]}
      >
        {/* Left Panel: Live Voice Panel */}
        <Animated.View
          style={[
            styles.panelCard,
            {
              width: leftPanelWidth,
              height: layout.cardMaxHeight,
            },
          ]}
        >
          {/* Header */}
          <View style={styles.panelHeader}>
            <View style={styles.headerTitleGroup}>
              <View
                style={[
                  styles.liveIndicatorDot,
                  isMuted && styles.liveIndicatorDotMuted,
                ]}
              />
              <AppText
                variant="subtitle"
                color={isMuted ? colors.subtext : colors.primary}
                style={styles.panelHeading}
              >
                GIỌNG NÓI TRỰC TIẾP
              </AppText>
            </View>

            {/* Close button on left panel (visible when collapsed) */}
            <Animated.View
              style={{ opacity: leftCloseOpacity }}
              pointerEvents={isExpanded ? "none" : "auto"}
            >
              <Pressable
                onPress={handleClose}
                style={styles.closeButton}
                accessibilityRole="button"
                accessibilityLabel="Đóng cuộc trò chuyện"
                hitSlop={6}
              >
                <X color={colors.textSecondary} size={20} />
              </Pressable>
            </Animated.View>
          </View>

          {/* Voice Waveform and Status */}
          <View style={styles.liveContent}>
            <View style={styles.waveBarsRow}>
              <Animated.View
                style={[
                  styles.waveBar,
                  { height: bar1, backgroundColor: barColor },
                ]}
              />
              <Animated.View
                style={[
                  styles.waveBar,
                  { height: bar2, backgroundColor: barColor },
                ]}
              />
              <Animated.View
                style={[
                  styles.waveBar,
                  { height: bar3, backgroundColor: barColor },
                ]}
              />
              <Animated.View
                style={[
                  styles.waveBar,
                  { height: bar4, backgroundColor: barColor },
                ]}
              />
              <Animated.View
                style={[
                  styles.waveBar,
                  { height: bar5, backgroundColor: barColor },
                ]}
              />
              <Animated.View
                style={[
                  styles.waveBar,
                  { height: bar6, backgroundColor: barColor },
                ]}
              />
              <Animated.View
                style={[
                  styles.waveBar,
                  { height: bar7, backgroundColor: barColor },
                ]}
              />
            </View>

            <AppText
              variant={layout.isNarrowHeight ? "subtitle" : "heading"}
              style={styles.voiceTitle}
              numberOfLines={1}
            >
              {statusCopy.title}
            </AppText>
            <AppText
              variant="body"
              color={
                isMuted
                  ? colors.warning
                  : error
                    ? colors.danger
                    : colors.textSecondary
              }
              style={styles.voiceDescription}
              numberOfLines={2}
            >
              {statusCopy.description}
            </AppText>

            <Pressable
              onPress={handleToggleMute}
              style={({ pressed }) => [
                styles.mutePillButton,
                isMuted
                  ? styles.mutePillButtonMuted
                  : styles.mutePillButtonActive,
                pressed && styles.mutePillButtonPressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel={
                isMuted ? "Bật micro để nói" : "Tắt micro tạm thời"
              }
            >
              {isMuted ? (
                <MicOff
                  color={colors.danger}
                  size={18}
                  strokeWidth={2.2}
                />
              ) : (
                <Mic
                  color={colors.primary}
                  size={18}
                  strokeWidth={2.2}
                />
              )}
              <AppText
                variant="caption"
                style={[
                  styles.mutePillText,
                  isMuted
                    ? styles.mutePillTextMuted
                    : styles.mutePillTextActive,
                ]}
              >
                {isMuted
                  ? "Micro đang tắt"
                  : "Tạm dừng nghe"}
              </AppText>
            </Pressable>
          </View>

          {/* Bottom Transcript */}
          <View style={styles.liveTranscript}>
            <AppText
              variant="body"
              style={styles.liveTranscriptText}
              numberOfLines={2}
            >
              <AppText style={styles.liveTranscriptPrefix}>Bạn: </AppText>
              &quot;
              {isMuted
                ? "Micro đang tắt…"
                : transcript || "Tôi muốn tìm sách…"}
              &quot;
              {status === "listening" && !isMuted ? (
                <AppText color={colors.primary} style={styles.cursorText}>
                  {" "}
                  |
                </AppText>
              ) : null}
            </AppText>
          </View>

          {/* Expand tab at right edge of collapsed modal (anh1) */}
          <Animated.View
            style={[
              styles.expandTabWrapper,
              {
                opacity: expandTabOpacity,
              },
            ]}
            pointerEvents={isExpanded ? "none" : "auto"}
          >
            <Pressable
              onPress={handleExpand}
              style={styles.expandTab}
              accessibilityRole="button"
              accessibilityLabel="Mở nhật ký trò chuyện"
              hitSlop={{ top: 12, bottom: 12, left: 14, right: 18 }}
            >
              <ChevronRight
                color={colors.textSecondary}
                size={16}
                strokeWidth={2.2}
              />
            </Pressable>
          </Animated.View>
        </Animated.View>

        {/* Right Panel: Conversation Log Panel (anh2) */}
        <Animated.View
          style={[
            styles.panelCard,
            styles.rightPanelCard,
            {
              width: rightPanelWidth,
              height: layout.cardMaxHeight,
              marginLeft: layout.panelGap,
              opacity: rightPanelOpacity,
              transform: [{ translateX: rightPanelTranslateX }],
            },
          ]}
          pointerEvents={isExpanded ? "auto" : "none"}
        >
          {/* Header */}
          <View style={styles.panelHeader}>
            <View style={styles.headerTitleGroup}>
              <MessageCircle color={colors.primary} size={20} />
              <AppText variant="subtitle" style={styles.conversationHeading}>
                NHẬT KÝ TRÒ CHUYỆN
              </AppText>
            </View>

            <View style={styles.headerActionsGroup}>
              {/* Close button X */}
              <Pressable
                onPress={handleClose}
                style={styles.headerIconButton}
                accessibilityRole="button"
                accessibilityLabel="Đóng cuộc trò chuyện"
                hitSlop={6}
              >
                <X color={colors.textSecondary} size={20} />
              </Pressable>
            </View>
          </View>

          {/* Divider collapse tab at the left edge of right panel */}
          <Pressable
            onPress={handleCollapse}
            style={styles.dividerCollapseTab}
            accessibilityRole="button"
            accessibilityLabel="Thu gọn nhật ký trò chuyện"
            hitSlop={{ top: 12, bottom: 12, left: 18, right: 14 }}
          >
            <ChevronLeft
              color={colors.textSecondary}
              size={16}
              strokeWidth={2.2}
            />
          </Pressable>

          {/* Conversation list */}
          <ScrollView
            ref={conversationRef}
            style={styles.conversationScroll}
            contentContainerStyle={styles.conversationContent}
            showsVerticalScrollIndicator={false}
            onContentSizeChange={() =>
              conversationRef.current?.scrollToEnd({ animated: true })
            }
            onTouchStart={recordInteraction}
          >
            {displayConversation.map((entry) => (
              <ConversationMessageEntry
                key={entry.id}
                entry={entry}
                onSelectBook={handleSelectBook}
                onSelectLocation={handleSelectLocation}
              />
            ))}
          </ScrollView>
        </Animated.View>
      </Animated.View>
    </View>
  );
}

export function VoiceListeningModal({
  visible,
  activation,
  onClose,
  onSelectBook,
  onSelectLocation,
  onGuidanceStarted,
}: VoiceListeningModalProps): React.ReactElement | null {
  if (!visible) return null;
  return (
    <VoiceListeningModalInner
      key="voice-modal-active"
      activation={activation}
      onClose={onClose}
      onSelectBook={onSelectBook}
      onSelectLocation={onSelectLocation}
      onGuidanceStarted={onGuidanceStarted}
    />
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

  // Two-panel layout container
  twoPanelContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },

  // Base card for panels (rounded white card matching anh1 & anh2)
  panelCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg + 4,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing.lg,
    overflow: "visible",
    ...shadows.card,
    shadowColor: colors.text,
    shadowOpacity: 0.16,
    shadowRadius: 18,
    elevation: 10,
  },
  rightPanelCard: {
    padding: 0,
    overflow: "visible",
  },

  // Header
  panelHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: 44,
    paddingHorizontal: spacing.sm,
    paddingBottom: spacing.xs,
  },
  headerTitleGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  headerActionsGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  liveIndicatorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
  liveIndicatorDotMuted: {
    backgroundColor: colors.subtext,
  },
  panelHeading: {
    fontWeight: "700",
    letterSpacing: 0.6,
  },
  conversationHeading: {
    color: colors.text,
    fontWeight: "700",
  },

  // Buttons
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surfaceAlt,
    alignItems: "center",
    justifyContent: "center",
  },
  headerIconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  headerIconButtonMuted: {
    backgroundColor: "#FEE2E2",
  },

  // Live content
  liveContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: spacing.md,
  },
  waveBarsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 56,
    gap: 8,
    marginBottom: spacing.lg,
  },
  waveBar: {
    width: 6,
    borderRadius: 3,
    backgroundColor: colors.primary,
  },
  voiceTitle: {
    textAlign: "center",
    color: colors.text,
    marginBottom: spacing.xs,
    fontWeight: "700",
  },
  voiceDescription: {
    textAlign: "center",
    lineHeight: 20,
    maxWidth: 320,
  },
  mutePillButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs + 2,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 24,
    marginTop: spacing.md,
    borderWidth: 1.5,
  },
  mutePillButtonActive: {
    backgroundColor: colors.surfaceAlt,
    borderColor: colors.primary,
  },
  mutePillButtonMuted: {
    backgroundColor: "#FEE2E2",
    borderColor: colors.danger,
  },
  mutePillButtonPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
  mutePillText: {
    fontWeight: "600",
    fontSize: 13,
  },
  mutePillTextActive: {
    color: colors.primary,
  },
  mutePillTextMuted: {
    color: colors.danger,
  },

  // Live Transcript
  liveTranscript: {
    minHeight: 56,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    justifyContent: "center",
  },
  liveTranscriptPrefix: {
    fontWeight: "700",
    color: colors.text,
  },
  liveTranscriptText: {
    color: colors.text,
  },
  cursorText: {
    fontWeight: "700",
  },

  // Expand tab protruding from right edge of collapsed card (matching anh1.jpeg)
  expandTabWrapper: {
    position: "absolute",
    right: -24,
    top: "50%",
    transform: [{ translateY: -27 }],
    zIndex: 10,
  },
  expandTab: {
    width: 26,
    height: 54,
    borderTopRightRadius: radius.md,
    borderBottomRightRadius: radius.md,
    borderTopLeftRadius: 0,
    borderBottomLeftRadius: 0,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderLeftWidth: 0,
    borderColor: colors.borderLight,
    alignItems: "center",
    justifyContent: "center",
    ...shadows.card,
    shadowColor: colors.text,
    shadowOffset: { width: 3, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
  },

  // Divider collapse tab
  dividerCollapseTab: {
    position: "absolute",
    left: -26,
    top: "50%",
    transform: [{ translateY: -27 }],
    width: 26,
    height: 54,
    borderTopLeftRadius: radius.md,
    borderBottomLeftRadius: radius.md,
    borderTopRightRadius: 0,
    borderBottomRightRadius: 0,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderRightWidth: 0,
    borderColor: colors.borderLight,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
    ...shadows.card,
    shadowColor: colors.text,
    shadowOffset: { width: -3, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
  },

  // Compact layout expand tab
  compactExpandTab: {
    position: "absolute",
    right: 0,
    top: "50%",
    transform: [{ translateY: -27 }],
    width: 26,
    height: 54,
    borderTopLeftRadius: radius.md,
    borderBottomLeftRadius: radius.md,
    borderTopRightRadius: 0,
    borderBottomRightRadius: 0,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderRightWidth: 0,
    borderColor: colors.borderLight,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
    ...shadows.card,
    elevation: 4,
  },

  // Conversation panel
  conversationScroll: {
    flex: 1,
  },
  conversationContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xs,
    paddingBottom: spacing.xl,
    gap: spacing.md,
  },
  messageRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
  },
  userMessageRow: {
    justifyContent: "flex-end",
  },
  assistantAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  assistantAvatarText: {
    color: colors.surface,
    fontWeight: "700",
    fontSize: 12,
  },
  messageColumn: {
    flexShrink: 1,
    maxWidth: "88%",
  },
  userMessageColumn: {
    alignItems: "flex-end",
  },
  messageBubble: {
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minHeight: 40,
    justifyContent: "center",
  },
  assistantBubble: {
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  userBubble: {
    backgroundColor: colors.primary,
  },

  // Tool results
  resultList: {
    marginTop: spacing.xs,
    gap: spacing.xs,
    width: "100%",
  },
  resultCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: radius.md,
    padding: spacing.sm,
    minHeight: 60,
  },
  resultCardMain: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    alignSelf: "stretch",
  },
  resultCardPressed: {
    backgroundColor: colors.primarySoft,
  },
  resultIcon: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  resultCopy: {
    flex: 1,
    gap: 2,
  },
  detailButton: {
    marginRight: spacing.xs,
    minWidth: 84,
    minHeight: 44,
  },
  resultTitle: {
    color: colors.text,
    fontWeight: "700",
  },

  // Compact layout specifics
  compactModalContainer: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg + 4,
    borderWidth: 1,
    borderColor: colors.borderLight,
    overflow: "hidden",
    ...shadows.card,
    elevation: 10,
  },
  compactTrack: {
    flexDirection: "row",
    height: "100%",
  },
});
