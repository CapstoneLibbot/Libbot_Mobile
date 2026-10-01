import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { AppText } from '../../../shared/components/AppText';
import { colors, spacing } from '../../../shared/theme';
import { GuidanceDemoState } from '../types/guidance.types';

export interface GuidanceDemoSwitcherProps {
  currentState: GuidanceDemoState;
  onSelectState: (state: GuidanceDemoState) => void;
  routeRevision?: number;
}

interface DemoStateOption {
  key: GuidanceDemoState;
  label: string;
  badge?: string;
  tone: 'info' | 'warning' | 'success' | 'danger';
}

const OPTIONS: DemoStateOption[] = [
  {
    key: 'navigating',
    label: '1. Đang dẫn đường',
    tone: 'info',
  },
  {
    key: 'replanning',
    label: '2. Tính lại đường',
    tone: 'warning',
  },
  {
    key: 'arrived',
    label: '3. Đã đến nơi',
    tone: 'success',
  },
  {
    key: 'cancelled',
    label: '4. Đã hủy',
    tone: 'danger',
  },
];

export function GuidanceDemoSwitcher({
  currentState,
  onSelectState,
  routeRevision = 1,
}: GuidanceDemoSwitcherProps): React.ReactElement {
  return (
    <View style={styles.container} testID="guidance-demo-switcher">
      <View style={styles.headerRow}>
        <View style={styles.badge}>
          <AppText variant="caption" style={styles.badgeText}>
            Chế độ xem trước UI
          </AppText>
        </View>
        <AppText variant="caption" color={colors.subtext}>
          Mô phỏng 4 trạng thái local (Lộ trình #{routeRevision})
        </AppText>
      </View>

      <View style={styles.buttonsRow}>
        {OPTIONS.map((opt) => {
          const isActive = currentState === opt.key;
          return (
            <Pressable
              key={opt.key}
              testID={`switcher-btn-${opt.key}`}
              accessibilityRole="button"
              accessibilityState={{ selected: isActive }}
              accessibilityLabel={`Chuyển sang chế độ xem: ${opt.label}`}
              onPress={() => onSelectState(opt.key)}
              style={({ pressed }) => [
                styles.optionButton,
                isActive && styles.optionButtonActive,
                isActive && opt.tone === 'warning' && styles.optionButtonWarning,
                isActive && opt.tone === 'success' && styles.optionButtonSuccess,
                isActive && opt.tone === 'danger' && styles.optionButtonDanger,
                pressed && styles.optionButtonPressed,
              ]}
            >
              <View
                style={[
                  styles.statusDot,
                  opt.tone === 'info' && { backgroundColor: colors.primary },
                  opt.tone === 'warning' && { backgroundColor: colors.warning },
                  opt.tone === 'success' && { backgroundColor: colors.success },
                  opt.tone === 'danger' && { backgroundColor: colors.danger },
                ]}
              />
              <AppText
                variant="caption"
                style={[
                  styles.optionText,
                  isActive && styles.optionTextActive,
                ]}
              >
                {opt.label}
              </AppText>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderStyle: 'dashed',
    gap: spacing.sm,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  badge: {
    backgroundColor: '#EDE9FE',
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeText: {
    color: '#6D28D9',
    fontWeight: '700',
    fontSize: 11,
  },
  buttonsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  optionButton: {
    minHeight: 44,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    justifyContent: 'center',
    flexGrow: 1,
  },
  optionButtonActive: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary,
  },
  optionButtonWarning: {
    backgroundColor: '#FEF3C7',
    borderColor: '#D97706',
  },
  optionButtonSuccess: {
    backgroundColor: colors.successSoft,
    borderColor: colors.success,
  },
  optionButtonDanger: {
    backgroundColor: colors.dangerSoft,
    borderColor: colors.danger,
  },
  optionButtonPressed: {
    opacity: 0.8,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  optionText: {
    fontWeight: '600',
    color: colors.textSecondary,
  },
  optionTextActive: {
    color: colors.text,
    fontWeight: '700',
  },
});
