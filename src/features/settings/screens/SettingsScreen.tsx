import React from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import {
  Bot,
  Clock,
  Cpu,
  Globe,
  Mic,
  Radio,
  RotateCcw,
  Save,
  Server,
  Sparkles,
  Star,
} from "lucide-react-native";
import { useResponsiveLayout } from "@/shared/layout";
import { colors, radius, spacing } from "@/shared/theme";
import { AppBackButton, AppCard, AppText } from "@/shared/ui";
import { SettingFieldCard } from "../components/SettingFieldCard";
import { SettingSectionHeader } from "../components/SettingSectionHeader";
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
      "Đặt lại cài đặt",
      "Bạn có chắc muốn đặt lại toàn bộ cài đặt về cấu hình ban đầu?",
      [
        { text: "Hủy", style: "cancel" },
        {
          text: "Đặt lại",
          style: "destructive",
          onPress: () => void handleReset(),
        },
      ],
    );
  };

  const onSavePress = async () => {
    const result = await handleSave();
    if (result.success) {
      Alert.alert(
        "Thành công",
        "Đã lưu và áp dụng cấu hình mới vào toàn bộ hệ thống!",
        [{ text: "Đóng", style: "default" }],
      );
    } else {
      Alert.alert(
        "Không thể lưu cấu hình",
        result.error || "Vui lòng kiểm tra lại các trường thông tin.",
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
        {/* Left: Nút Quay lại */}
        <View style={[styles.headerSide, styles.headerLeft]}>
          <AppBackButton onPress={onBack} accessibilityLabel="Quay lại" />
        </View>

        {/* Center: Title & Description nằm chính giữa */}
        <View style={styles.headerCenter}>
          <AppText
            variant="title"
            color={colors.text}
            style={styles.headerTitle}
            numberOfLines={1}
          >
            Cài đặt hệ thống
          </AppText>
          <AppText
            variant="caption"
            color={colors.textSecondary}
            style={styles.headerDescription}
            numberOfLines={1}
          >
            Tùy chỉnh thông số vận hành và kết nối Kiosk
          </AppText>
        </View>

        {/* Right: 2 nút Đặt lại và Lưu nhỏ gọn */}
        <View style={[styles.headerSide, styles.headerRight]}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Đặt lại cấu hình mặc định"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            onPress={onConfirmReset}
            style={({ pressed }) => [
              styles.headerResetBtn,
              pressed && styles.headerBtnPressed,
            ]}
          >
            <RotateCcw size={14} color={colors.textSecondary} strokeWidth={2.2} />
            <AppText variant="caption" style={styles.headerResetText}>
              Đặt lại
            </AppText>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Lưu cấu hình"
            disabled={isLoading}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            onPress={() => void onSavePress()}
            style={({ pressed }) => [
              styles.headerSaveBtn,
              pressed && styles.headerBtnPressed,
              isLoading && styles.headerBtnDisabled,
            ]}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color="#FFFFFF" style={styles.headerBtnSpinner} />
            ) : (
              <Save size={14} color="#FFFFFF" strokeWidth={2.2} />
            )}
            <AppText variant="caption" style={styles.headerSaveText}>
              Lưu
            </AppText>
          </Pressable>
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

        {/* ========================================================================= */}
        {/* SECTION 1: MÁY CHỦ & KẾT NỐI MẠNG */}
        {/* ========================================================================= */}
        <SettingSectionHeader
          title="Máy chủ & Kết nối mạng"
          description="Quản lý địa chỉ API, kết nối thời gian thực và trợ lý giọng nói."
          icon={<Server size={20} color={colors.primary} />}
        />

        {/* Card 1: API Base URL */}
        <SettingFieldCard
          label="API Base URL (REST API)"
          description="Địa chỉ máy chủ cho dữ liệu sách, bản đồ và điều hướng."
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
          description="Địa chỉ server AI Voice trợ lý ảo (bắt đầu bằng ws:// hoặc wss://)."
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
          description="Mã định danh của kiosk gửi lên Xiaozhi server để kết nối phiên thoại."
          placeholder="libot-kiosk-01"
          value={formValues.voiceKioskId}
          error={errors.voiceKioskId}
          icon={<Cpu size={20} color={colors.primary} />}
          onChangeText={(text) => handleChange("voiceKioskId", text)}
          onClear={() => handleChange("voiceKioskId", "")}
        />

        {/* ========================================================================= */}
        {/* SECTION 2: THỜI GIAN CHỜ & TƯƠNG TÁC KIOSK */}
        {/* ========================================================================= */}
        <SettingSectionHeader
          title="Thời gian chờ & Tương tác Kiosk"
          description="Thiết lập thời gian tự động quay về màn hình chờ, đóng hội thoại và thời gian phản hồi AI."
          icon={<Clock size={20} color={colors.primary} />}
        />

        {/* Card 5: Kiosk Idle Timeout */}
        <SettingFieldCard
          label="Thời gian chờ Kiosk (Inactivity)"
          description="Tự động quay về màn hình chào khi không có tương tác người dùng."
          placeholder="60"
          value={formValues.kioskIdleSeconds}
          error={errors.kioskIdleSeconds}
          keyboardType="numeric"
          unitText="giây"
          icon={<Clock size={20} color={colors.primary} />}
          onChangeText={(text) => handleChange("kioskIdleSeconds", text)}
          onClear={() => handleChange("kioskIdleSeconds", "")}
        />

        {/* Card 6: Voice Modal Inactivity Timeout */}
        <SettingFieldCard
          label="Thời gian chờ hội thoại im lặng"
          description="Tự động đóng cửa sổ giọng nói khi không phát hiện âm thanh người dùng."
          placeholder="60"
          value={formValues.voiceModalInactivitySeconds}
          error={errors.voiceModalInactivitySeconds}
          keyboardType="numeric"
          unitText="giây"
          icon={<Mic size={20} color={colors.primary} />}
          onChangeText={(text) => handleChange("voiceModalInactivitySeconds", text)}
          onClear={() => handleChange("voiceModalInactivitySeconds", "")}
        />

        {/* Card 7: Voice Response Timeout */}
        <SettingFieldCard
          label="Thời gian chờ phản hồi AI"
          description="Thời gian tối đa chờ câu trả lời từ máy chủ AI trước khi báo lỗi."
          placeholder="30"
          value={formValues.voiceResponseTimeoutSeconds}
          error={errors.voiceResponseTimeoutSeconds}
          keyboardType="numeric"
          unitText="giây"
          icon={<Sparkles size={20} color={colors.primary} />}
          onChangeText={(text) => handleChange("voiceResponseTimeoutSeconds", text)}
          onClear={() => handleChange("voiceResponseTimeoutSeconds", "")}
        />

        {/* Card 8: Feedback Idle Timeout */}
        <SettingFieldCard
          label="Thời gian chờ màn hình đánh giá"
          description="Tự động quay về màn hình chờ nếu người dùng bỏ quên màn hình đánh giá."
          placeholder="45"
          value={formValues.feedbackIdleSeconds}
          error={errors.feedbackIdleSeconds}
          keyboardType="numeric"
          unitText="giây"
          icon={<Star size={20} color={colors.primary} />}
          onChangeText={(text) => handleChange("feedbackIdleSeconds", text)}
          onClear={() => handleChange("feedbackIdleSeconds", "")}
        />
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
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 2,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
  },
  headerSide: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  headerLeft: {
    justifyContent: "flex-start",
  },
  headerCenter: {
    flex: 2,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.sm,
  },
  headerRight: {
    justifyContent: "flex-end",
    gap: spacing.xs + 2,
  },
  headerTitle: {
    fontWeight: "700",
    textAlign: "center",
  },
  headerDescription: {
    marginTop: 2,
    textAlign: "center",
  },
  headerResetBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: "#FFFFFF",
    minHeight: 38,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1,
  },
  headerResetText: {
    fontWeight: "600",
    color: colors.textSecondary,
    fontSize: 13,
  },
  headerSaveBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 15,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: colors.primary,
    minHeight: 38,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 1,
  },
  headerSaveText: {
    fontWeight: "600",
    color: "#FFFFFF",
    fontSize: 13,
  },
  headerBtnPressed: {
    opacity: 0.75,
  },
  headerBtnDisabled: {
    opacity: 0.6,
  },
  headerBtnSpinner: {
    marginRight: 2,
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
});

