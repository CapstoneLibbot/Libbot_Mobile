import { router, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useKioskStore } from '../../../core/store/kioskStore';
import {
  AppButton,
  AppCard,
  AppHeader,
  AppInput,
  AppText,
} from '../../../shared/components';
import { useResponsiveLayout } from '../../../shared/hooks/useResponsiveLayout';
import { colors, spacing } from '../../../shared/theme';
import { useSubmitFeedback } from '../hooks/useSubmitFeedback';

const RATING_LEVELS = [
  { rating: 1, emoji: '😞', label: 'Rất tệ' },
  { rating: 2, emoji: '🙁', label: 'Chưa tốt' },
  { rating: 3, emoji: '😐', label: 'Bình thường' },
  { rating: 4, emoji: '😊', label: 'Hài lòng' },
  { rating: 5, emoji: '🤩', label: 'Tuyệt vời!' },
];

const FEEDBACK_TAGS = [
  'Đến đúng kệ sách',
  'Di chuyển nhanh chóng',
  'Màn hình dễ quan sát',
  'Tốc độ đi vừa phải',
  'Dễ tương tác',
];

export function FeedbackScreen(): React.ReactElement {
  const { isCompact, isNarrowHeight, insets } = useResponsiveLayout();
  const { missionId } = useLocalSearchParams<{ missionId: string }>();
  const recordInteraction = useKioskStore((state) => state.recordInteraction);
  const kioskSessionId = useKioskStore((state) => state.kioskSessionId);
  const resetKioskSession = useKioskStore((state) => state.resetKioskSession);

  const [selectedRating, setSelectedRating] = useState<number>(5);
  const [selectedTags, setSelectedTags] = useState<string[]>(['Đến đúng kệ sách']);
  const [comment, setComment] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const submitFeedbackMutation = useSubmitFeedback();

  const handleSelectRating = (rating: number) => {
    recordInteraction();
    setSelectedRating(rating);
  };

  const handleToggleTag = (tag: string) => {
    recordInteraction();
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    );
  };

  const handleSubmit = async () => {
    recordInteraction();
    setErrorMessage(null);

    try {
      await submitFeedbackMutation.mutateAsync({
        missionId: missionId ?? 'unknown-mission',
        rating: selectedRating,
        tags: selectedTags,
        comment: comment.trim() || undefined,
        kioskSessionId,
      });

      // reset session & redirect to attract screen
      resetKioskSession();
      router.replace('/(kiosk)/idle');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Không thể gửi phản hồi.';
      setErrorMessage(msg);
    }
  };

  const handleSkip = () => {
    recordInteraction();
    resetKioskSession();
    router.replace('/(kiosk)/idle');
  };

  return (
    <View style={styles.container}>
      <AppHeader
        title="Đánh giá chuyến đi cùng LiBot"
        subtitle="Ý kiến của bạn giúp chúng tôi cải thiện dịch vụ robot thư viện"
        rightActionLabel="Bỏ qua"
        onRightAction={handleSkip}
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
            Bạn cảm thấy chuyến dẫn đường thế nào?
          </AppText>

          {/* Rating Emoji Buttons */}
          <View style={[styles.ratingRow, isCompact && styles.ratingRowCompact]}>
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
                  <AppText style={[styles.ratingEmoji, isNarrowHeight && styles.ratingEmojiNarrow]}>
                    {item.emoji}
                  </AppText>
                  <AppText
                    variant="caption"
                    color={isSelected ? colors.primaryDark : colors.textSecondary}
                    style={isSelected ? styles.boldLabel : undefined}
                    numberOfLines={1}
                  >
                    {item.label}
                  </AppText>
                </Pressable>
              );
            })}
          </View>

          {/* Quick Tags */}
          <AppText variant="subtitle" style={styles.tagsHeading}>
            Điểm bạn thích ở chuyến đi này:
          </AppText>
          <View style={[styles.tagWrap, isCompact && styles.tagWrapCompact]}>
            {FEEDBACK_TAGS.map((tag) => {
              const isSelected = selectedTags.includes(tag);
              return (
                <Pressable
                  key={tag}
                  onPress={() => handleToggleTag(tag)}
                  style={[
                    styles.tagChip,
                    isSelected && styles.tagChipSelected,
                    isCompact && styles.tagChipCompact,
                  ]}
                  accessibilityRole="button"
                >
                  <AppText
                    variant="body"
                    color={isSelected ? colors.surface : colors.textSecondary}
                    style={isSelected ? styles.boldLabel : undefined}
                  >
                    {isSelected ? '✓ ' : '+ '}
                    {tag}
                  </AppText>
                </Pressable>
              );
            })}
          </View>

          {/* Optional comment */}
          <AppInput
            label="Góp ý thêm (không bắt buộc)"
            placeholder="Viết nhận xét của bạn về LiBot..."
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

          {/* Action buttons */}
          <View style={styles.actions}>
            <AppButton
              title={
                submitFeedbackMutation.isPending
                  ? 'Đang gửi đánh giá...'
                  : 'Gửi đánh giá & Hoàn tất'
              }
              variant="primary"
              size="lg"
              loading={submitFeedbackMutation.isPending}
              disabled={submitFeedbackMutation.isPending}
              onPress={handleSubmit}
            />
            <AppButton
              title="Bỏ qua đánh giá và trở về màn hình chính"
              variant="secondary"
              size="md"
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
    width: '100%',
    alignSelf: 'center',
  },
  card: {
    gap: spacing.lg,
  },
  cardCompact: {
    gap: spacing.md,
    padding: spacing.md,
  },
  centeredTitle: {
    textAlign: 'center',
  },
  ratingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
    marginVertical: spacing.sm,
  },
  ratingRowCompact: {
    gap: spacing.xs,
    marginVertical: spacing.xs,
  },
  ratingButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.sm,
    borderRadius: 16,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 2,
    borderColor: 'transparent',
    minHeight: 110,
    justifyContent: 'center',
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
    fontWeight: '700',
  },
  tagsHeading: {
    marginTop: spacing.xs,
  },
  tagWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
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
    justifyContent: 'center',
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
  actions: {
    gap: spacing.md,
    marginTop: spacing.md,
  },
});
