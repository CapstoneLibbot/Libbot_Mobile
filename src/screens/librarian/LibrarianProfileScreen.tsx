import { router } from 'expo-router';
import React from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { useAppStore } from '../../core/store/appStore';
import { AppButton, AppCard, AppText } from '../../components/common';
import { colors, spacing } from '../../theme';
import { secureStorage } from '../../services/storage/secureStorage';

export default function LibrarianProfileScreen(): React.ReactElement {
  const user = useAppStore((state) => state.user);
  const logout = useAppStore((state) => state.logout);

  const handleLogout = async () => {
    await secureStorage.remove('session');
    logout();
    router.replace('/(auth)/login');
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <AppCard style={styles.card}>
        <AppText variant="heading">Librarian profile</AppText>
        <AppText>{user?.name ?? 'Librarian Chen'}</AppText>
        <AppText color={colors.subtext}>{user?.email ?? 'librarian@libot.edu'}</AppText>
      </AppCard>

      <AppButton title="Logout" variant="secondary" onPress={handleLogout} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.xl,
    gap: spacing.lg,
  },
  card: {
    gap: spacing.sm,
  },
});

