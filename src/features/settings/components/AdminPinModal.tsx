import React, { useCallback, useState } from "react";
import { Modal, Pressable, StyleSheet, View } from "react-native";
import { Lock } from "lucide-react-native";
import { env } from "@/config/env";
import { useKioskStore } from "@/core/state";
import { colors, radius, shadows, spacing } from "@/shared/theme";
import { AppText } from "@/shared/ui";
import { PinCodeSlots } from "./PinCodeSlots";
import { VirtualKeypad } from "./VirtualKeypad";

export interface AdminPinModalProps {
  visible: boolean;
  onSuccess: () => void;
  onClose: () => void;
}

const PIN_LENGTH = 4;

export function AdminPinModal({
  visible,
  onSuccess,
  onClose,
}: AdminPinModalProps): React.ReactElement {
  const recordInteraction = useKioskStore((state) => state.recordInteraction);
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  const expectedPin = env.adminPin || "1234";

  const handleClose = useCallback(() => {
    recordInteraction();
    setPin("");
    setError(null);
    setIsVerifying(false);
    onClose();
  }, [onClose, recordInteraction]);

  const verifyPin = useCallback(
    (enteredPin: string) => {
      setIsVerifying(true);
      if (enteredPin === expectedPin) {
        setError(null);
        setPin("");
        setIsVerifying(false);
        onSuccess();
      } else {
        setError("Mã PIN không chính xác. Vui lòng thử lại!");
        // Rung đỏ và tự xóa số sau 450ms để người dùng nhập lại nhanh chóng
        setTimeout(() => {
          setPin("");
          setError(null);
          setIsVerifying(false);
        }, 450);
      }
    },
    [expectedPin, onSuccess],
  );

  const handleDigitPress = useCallback(
    (digit: string) => {
      recordInteraction();
      if (isVerifying || pin.length >= PIN_LENGTH) return;

      const nextPin = pin + digit;
      setPin(nextPin);
      setError(null);

      // Auto-verify ngay khi nhập đủ 4 số
      if (nextPin.length === PIN_LENGTH) {
        verifyPin(nextPin);
      }
    },
    [isVerifying, pin, recordInteraction, verifyPin],
  );

  const handleDeletePress = useCallback(() => {
    recordInteraction();
    if (isVerifying || pin.length === 0) return;
    setPin((prev) => prev.slice(0, -1));
    setError(null);
  }, [isVerifying, pin.length, recordInteraction]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <Pressable
        style={styles.backdrop}
        onPress={handleClose}
        accessibilityRole="button"
        accessibilityLabel="Đóng xác thực quản trị viên"
      >
        <Pressable
          style={styles.modalContent}
          onPress={(e) => e.stopPropagation()}
        >
          {/* Header Icon & Title */}
          <View style={styles.header}>
            <View style={styles.iconCircle}>
              <Lock size={22} color={colors.primary} />
            </View>
            <AppText variant="title" color={colors.text} style={styles.title}>
              Xác thực Quản trị viên
            </AppText>
            <AppText variant="caption" color={colors.textSecondary} style={styles.subtitle}>
              Nhập mã PIN {PIN_LENGTH} số để truy cập cấu hình hệ thống
            </AppText>
          </View>

          {/* 4 Ô tròn hiển thị mã PIN */}
          <PinCodeSlots
            pinLength={PIN_LENGTH}
            currentPin={pin}
            hasError={Boolean(error)}
          />

          {/* Thông báo lỗi nếu sai mã PIN */}
          {error ? (
            <View style={styles.errorContainer}>
              <AppText variant="caption" color={colors.danger} style={styles.errorText}>
                {error}
              </AppText>
            </View>
          ) : (
            <View style={styles.errorContainerPlaceholder} />
          )}

          {/* Bàn phím số cảm ứng ảo (Virtual Keypad) */}
          <VirtualKeypad
            onDigitPress={handleDigitPress}
            onDeletePress={handleDeletePress}
            onCancelPress={handleClose}
            disabled={isVerifying}
          />
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.55)",
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.md,
  },
  modalContent: {
    width: "100%",
    maxWidth: 380,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    alignItems: "center",
    ...shadows.card,
  },
  header: {
    alignItems: "center",
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#EFF6FF",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: spacing.xs,
  },
  title: {
    fontWeight: "700",
    marginBottom: 4,
    textAlign: "center",
  },
  subtitle: {
    textAlign: "center",
    lineHeight: 18,
  },
  errorContainer: {
    height: 22,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: spacing.xs,
  },
  errorContainerPlaceholder: {
    height: 22,
    marginBottom: spacing.xs,
  },
  errorText: {
    fontWeight: "600",
  },
});
