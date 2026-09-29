import { router } from 'expo-router';
import React from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { useAppStore } from '../../core/store/appStore';
import { AppButton, AppCard, AppText } from '../../components/common';
import { colors, spacing } from '../../theme';
import { secureStorage } from '../../services/storage/secureStorage';

export default function ReaderProfileScreen(): React.ReactElement {
  const user = useAppStore((state) => state.user);
  const logout = useAppStore((state) => state.logout);

  const handleLogout = async () => {
    await secureStorage.remove('session');
    logout();
    router.replace('/(auth)/login');
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <AppCard style={styles.card}>
        <AppText variant="heading">Profile</AppText>
        <AppText variant="subtitle">{user?.name ?? 'Reader user'}</AppText>
        <AppText color={colors.subtext}>{user?.email ?? 'reader@libot.edu'}</AppText>
      </AppCard>

      <AppCard style={styles.card}>
        <AppText variant="heading">Account</AppText>
        <AppText>Role: {user?.role ?? 'READER'}</AppText>
        <AppText>Guidance rating: 4.8/5</AppText>
      </AppCard>

      <AppButton title="Logout" variant="secondary" onPress={handleLogout} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: spacing.xl,
    backgroundColor: colors.background,
    gap: spacing.lg,
  },
  card: {
    gap: spacing.sm,
  },
});

