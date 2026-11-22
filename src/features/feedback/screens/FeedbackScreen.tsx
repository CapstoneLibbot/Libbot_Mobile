import React, { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useKioskStore } from "@/core/state";
import { kioskTimeoutConfig } from "@/core/config";
import {
  AppButton,
  AppCard,
  AppHeader,
  AppInput,
  AppText,
} from "@/shared/ui";
import { useResponsiveLayout } from "@/shared/layout";
import { colors, spacing } from "@/shared/theme";
import { useSubmitFeedback } from "../hooks/useSubmitFeedback";
import type { GuidanceKind, GuidanceTerminalStatus } from "@/features/guidance/types/guidance.types";

const RATING_LEVELS = [
  { rating: 1, emoji: "😞", label: "Rất tệ" },
  { rating: 2, emoji: "🙁", label: "Chưa tốt" },
  { rating: 3, emoji: "😐", label: "Bình thường" },
  { rating: 4, emoji: "😊", label: "Hài lòng" },
  { rating: 5, emoji: "🤩", label: "Tuyệt vời!" },
];

export interface FeedbackScreenProps {
  jobId: string;
  guidanceKind: GuidanceKind;
  terminalStatus: GuidanceTerminalStatus;
  destinationName: string;
  onComplete: () => void;
  onSkip: () => void;
}

export function FeedbackScreen({
  jobId,
  guidanceKind,
  terminalStatus,
  destinationName,
  onComplete,
  onSkip,
}: FeedbackScreenProps): React.ReactElement {
  const { isCompact, isNarrowHeight, insets } = useResponsiveLayout();
  const recordInteraction = useKioskStore((state) => state.recordInteraction);
  const resetKioskSession = useKioskStore((state) => state.resetKioskSession);
  const lastInteractionAt = useKioskStore((state) => state.lastInteractionAt);

  const [selectedRating, setSelectedRating] = useState<number>(5);
  const [comment, setComment] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const submitFeedbackMutation = useSubmitFeedback();

  // Inactivity timeout: If user doesn't touch anything on feedback screen, auto-return to idle
  // Resets timer whenever user interacts (rates, types, scrolls) and does not fire after submission
  useEffect(() => {
    if (isSuccess) return;

    const timer = setTimeout(() => {
      if (__DEV__) {
        console.log(
          `[FeedbackScreen] Inactivity timeout (${kioskTimeoutConfig.feedbackIdleSeconds}s) reached without feedback interaction. Returning to idle.`,
        );
      }
      resetKioskSession();
      onSkip();
    }, kioskTimeoutConfig.feedbackIdleMs);
    return () => clearTimeout(timer);
  }, [isSuccess, lastInteractionAt, onSkip, resetKioskSession]);

  const handleSelectRating = (rating: number) => {
    recordInteraction();
    setSelectedRating(rating);
  };

  const handleSubmit = async () => {
    recordInteraction();
    setErrorMessage(null);

    try {
      await submitFeedbackMutation.mutateAsync({
        jobId: jobId || "mock-guidance-job",
        guidanceKind,
        terminalStatus,
        rating: selectedRating,
        comment: comment.trim() || undefined,
      });

      setIsSuccess(true);
      setTimeout(() => {
        if (__DEV__) {
          console.log(
            `[FeedbackScreen] Feedback submitted successfully. Redirecting after ${kioskTimeoutConfig.feedbackSuccessDelayMs}ms delay.`,
          );
        }
        resetKioskSession();
        onComplete();
      }, kioskTimeoutConfig.feedbackSuccessDelayMs);
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Không thể gửi phản hồi.";
      setErrorMessage(msg);
    }
  };

  const handleSkip = () => {
    recordInteraction();
    resetKioskSession();
    onSkip();
  };

  return (
    <View style={styles.container}>
      <AppHeader
        title="Đánh giá chuyến đi cùng robot"
        subtitle="Ý kiến của bạn giúp chúng tôi cải thiện dịch vụ robot thư viện"
      />

      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={[
          styles.contentContainer,
          {
            paddingLeft: Math.max(insets.left, spacing.xl),
            paddingRight: Math.max(insets.right, spacing.xl),
            paddingBottom: Math.max(insets.bottom, spacing.xl),
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <AppCard style={[styles.card, isCompact && styles.cardCompact]}>
          <AppText variant="heading" style={styles.centeredTitle}>
            {terminalStatus === "COMPLETED"
              ? `Robot đã đến ${destinationName}. Bạn thấy chuyến đi thế nào?`
              : `Chuyến dẫn đường đến ${destinationName} chưa hoàn thành. Bạn đánh giá thế nào?`}
          </AppText>

          {/* Rating Emoji Buttons */}
          <View
            style={[styles.ratingRow, isCompact && styles.ratingRowCompact]}
          >
            {RATING_LEVELS.map((item) => {
              const isSelected = selectedRating === item.rating;
              return (
                <Pressable
                  key={item.rating}
                  onPress={() => handleSelectRating(item.rating)}
                  style={[
                    styles.ratingButton,
                    isSelected && styles.ratingButtonSelected,
                    isNarrowHeight && styles.ratingButtonNarrow,
                  ]}
                  accessibilityRole="button"
                >
                  <AppText
                    style={[
                      styles.ratingEmoji,
                      isNarrowHeight && styles.ratingEmojiNarrow,
                    ]}
                  >
                    {item.emoji}
                  </AppText>
                  <AppText
                    variant="caption"
                    color={
                      isSelected ? colors.primaryDark : colors.textSecondary
                    }
                    style={isSelected ? styles.boldLabel : undefined}
                    numberOfLines={1}
                  >
                    {item.label}
                  </AppText>
                </Pressable>
              );
            })}
          </View>

          {/* Optional comment */}
          <AppInput
            label="Góp ý thêm (không bắt buộc)"
            placeholder="Viết nhận xét của bạn về trải nghiệm robot..."
            value={comment}
            onChangeText={(text) => {
              recordInteraction();
              setComment(text);
            }}
          />

          {errorMessage ? (
            <View style={styles.errorBox}>
              <AppText variant="caption" color={colors.danger}>
                {errorMessage}
              </AppText>
            </View>
          ) : null}

          {isSuccess ? (
            <View style={styles.successBox}>
              <AppText variant="subtitle" color={colors.success} style={styles.successText}>
                ✓ Cảm ơn bạn đã gửi đánh giá! Đang trở về màn hình chính…
              </AppText>
            </View>
          ) : null}

          {/* Action buttons */}
          <View style={styles.actions}>
            <AppButton
              title={
                submitFeedbackMutation.isPending
                  ? "Đang gửi đánh giá..."
                  : isSuccess
                    ? "Đã ghi nhận ✓"
                    : "Đánh giá"
              }
              variant="primary"
              size="lg"
              loading={submitFeedbackMutation.isPending}
              disabled={submitFeedbackMutation.isPending || isSuccess}
              onPress={handleSubmit}
            />
            <AppButton
              title="Bỏ qua"
              variant="secondary"
              size="md"
              disabled={isSuccess}
              onPress={handleSkip}
            />
          </View>
        </AppCard>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollArea: {
    flex: 1,
  },
  contentContainer: {
    padding: spacing.xl,
    maxWidth: 800,
    width: "100%",
    alignSelf: "center",
  },
  card: {
    gap: spacing.lg,
  },
  cardCompact: {
    gap: spacing.md,
    padding: spacing.md,
  },
  centeredTitle: {
    textAlign: "center",
  },
  ratingRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: spacing.md,
    marginVertical: spacing.sm,
  },
  ratingRowCompact: {
    gap: spacing.xs,
    marginVertical: spacing.xs,
  },
  ratingButton: {
    flex: 1,
    alignItems: "center",
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.sm,
    borderRadius: 16,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 2,
    borderColor: "transparent",
    minHeight: 110,
    justifyContent: "center",
    gap: spacing.xs,
  },
  ratingButtonSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  ratingButtonNarrow: {
    minHeight: 76,
    paddingVertical: spacing.sm,
    paddingHorizontal: 4,
    borderRadius: 12,
  },
  ratingEmoji: {
    fontSize: 40,
    lineHeight: 48,
  },
  ratingEmojiNarrow: {
    fontSize: 28,
    lineHeight: 34,
  },
  boldLabel: {
    fontWeight: "700",
  },
  tagsHeading: {
    marginTop: spacing.xs,
  },
  tagWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
  },
  tagWrapCompact: {
    gap: spacing.sm,
  },
  tagChip: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: 12,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.borderLight,
    minHeight: 46,
    justifyContent: "center",
  },
  tagChipCompact: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minHeight: 38,
  },
  tagChipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  errorBox: {
    backgroundColor: colors.dangerSoft,
    padding: spacing.md,
    borderRadius: 10,
  },
  successBox: {
    backgroundColor: colors.successSoft,
    padding: spacing.md,
    borderRadius: 10,
    alignItems: "center",
  },
  successText: {
    textAlign: "center",
    fontWeight: "700",
  },
  actions: {
    gap: spacing.md,
    marginTop: spacing.md,
  },
});
