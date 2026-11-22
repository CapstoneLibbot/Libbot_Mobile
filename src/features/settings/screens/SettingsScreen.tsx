import React from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { Bot, Cpu, Globe, Radio } from "lucide-react-native";
import { useResponsiveLayout } from "@/shared/layout";
import { colors, radius, spacing } from "@/shared/theme";
import { AppBackButton, AppButton, AppCard, AppText } from "@/shared/ui";
import { SettingFieldCard } from "../components/SettingFieldCard";
import { useSettingsViewModel } from "../hooks/useSettingsViewModel";

export interface SettingsScreenProps {
  onBack: () => void;
}

export function SettingsScreen({ onBack }: SettingsScreenProps): React.ReactElement {
  const { insets, isTablet } = useResponsiveLayout();
  const {
    formValues,
    errors,
    isLoading,
    saveSuccess,
    fieldTestStates,
    handleChange,
    handleTestField,
    handleSave,
    handleReset,
  } = useSettingsViewModel();

  const onConfirmReset = () => {
    Alert.alert(
      "Khôi phục mặc định",
      "Bạn có chắc muốn khôi phục toàn bộ cài đặt về cấu hình ban đầu (.env)?",
      [
        { text: "Hủy", style: "cancel" },
        {
          text: "Khôi phục",
          style: "destructive",
          onPress: () => void handleReset(),
        },
      ],
    );
  };

  const onSavePress = async () => {
    const success = await handleSave();
    if (success) {
      Alert.alert(
        "Thành công",
        "Đã lưu và áp dụng cấu hình mới vào toàn bộ hệ thống!",
        [{ text: "Đóng", style: "default" }],
      );
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={[
        styles.screen,
        {
          paddingTop: Math.max(insets.top, spacing.md),
          paddingBottom: Math.max(insets.bottom, spacing.md),
        },
      ]}
    >
      {/* Top Header */}
      <View style={styles.header}>
        <AppBackButton onPress={onBack} accessibilityLabel="Quay lại" />
        <View style={styles.headerTitleWrap}>
          <AppText variant="title" color={colors.text}>
            Cài đặt hệ thống
          </AppText>
          <AppText variant="caption" color={colors.textSecondary}>
            Tùy chỉnh máy chủ mạng và định danh robot
          </AppText>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          isTablet && styles.scrollContentTablet,
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Banner thông báo lưu thành công */}
        {saveSuccess ? (
          <AppCard style={styles.successBanner}>
            <AppText variant="body" color={colors.success}>
              ✓ Đã lưu và áp dụng cấu hình mới thành công!
            </AppText>
          </AppCard>
        ) : null}

        {/* Card 1: API Base URL */}
        <SettingFieldCard
          label="API Base URL (REST API)"
          description="Địa chỉ máy chủ ASP.NET Core cho dữ liệu sách, bản đồ và điều hướng."
          placeholder="http://192.168.1.100:5205/api"
          value={formValues.apiBaseUrl}
          error={errors.apiBaseUrl}
          keyboardType="url"
          icon={<Globe size={20} color={colors.primary} />}
          onChangeText={(text) => handleChange("apiBaseUrl", text)}
          onClear={() => handleChange("apiBaseUrl", "")}
          onTest={() => void handleTestField("apiBaseUrl")}
          testState={fieldTestStates.apiBaseUrl}
        />

        {/* Card 2: SignalR Hub URL */}
        <SettingFieldCard
          label="SignalR Hub URL (Realtime Robot)"
          description="Kênh truyền tín hiệu WebSocket thời gian thực giữa kiosk và robot."
          placeholder="http://192.168.1.100:5205/robotHub"
          value={formValues.signalRUrl}
          error={errors.signalRUrl}
          keyboardType="url"
          icon={<Radio size={20} color={colors.primary} />}
          onChangeText={(text) => handleChange("signalRUrl", text)}
          onClear={() => handleChange("signalRUrl", "")}
          onTest={() => void handleTestField("signalRUrl")}
          testState={fieldTestStates.signalRUrl}
        />

        {/* Card 3: Xiaozhi WebSocket URL */}
        <SettingFieldCard
          label="Xiaozhi Audio WebSocket URL"
          description="Địa chỉ server AI Voice trợ lý ảo Xiaozhi (bắt đầu bằng ws:// hoặc wss://)."
          placeholder="ws://192.168.1.100:8000/xiaozhi/v1/"
          value={formValues.xiaozhiWsUrl}
          error={errors.xiaozhiWsUrl}
          keyboardType="url"
          icon={<Bot size={20} color={colors.primary} />}
          onChangeText={(text) => handleChange("xiaozhiWsUrl", text)}
          onClear={() => handleChange("xiaozhiWsUrl", "")}
          onTest={() => void handleTestField("xiaozhiWsUrl")}
          testState={fieldTestStates.xiaozhiWsUrl}
        />

        {/* Card 4: Voice Kiosk ID */}
        <SettingFieldCard
          label="Voice Kiosk ID (Mã định danh Kiosk)"
          description="Tên hoặc mã định danh của kiosk gửi lên Xiaozhi server để kết nối phiên thoại."
          placeholder="libot-kiosk-01"
          value={formValues.voiceKioskId}
          error={errors.voiceKioskId}
          icon={<Cpu size={20} color={colors.primary} />}
          onChangeText={(text) => handleChange("voiceKioskId", text)}
          onClear={() => handleChange("voiceKioskId", "")}
        />

        {/* Action Buttons */}
        <View style={styles.actionRow}>
          <AppButton
            title="Khôi phục mặc định"
            variant="outline"
            size="md"
            onPress={onConfirmReset}
            style={styles.actionBtn}
          />
          <AppButton
            title="Lưu cấu hình"
            variant="primary"
            size="md"
            loading={isLoading}
            onPress={() => void onSavePress()}
            style={styles.actionBtn}
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
  },
  headerTitleWrap: {
    marginLeft: spacing.md,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xl * 2,
  },
  scrollContentTablet: {
    maxWidth: 760,
    width: "100%",
    alignSelf: "center",
  },
  successBanner: {
    padding: spacing.md,
    marginBottom: spacing.md,
    backgroundColor: "#F0FDF4",
    borderColor: "#BBF7D0",
    borderWidth: 1,
    borderRadius: radius.md,
  },
  actionRow: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  actionBtn: {
    flex: 1,
  },
});
