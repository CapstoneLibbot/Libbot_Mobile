import { router } from 'expo-router';
import React, { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useAppStore } from '../../core/store/appStore';
import { AppButton, AppCard, AppInput, AppText } from '../../components/common';
import { colors, spacing } from '../../theme';
import { secureStorage } from '../../services/storage/secureStorage';

export default function LoginScreen(): React.ReactElement {
  const [email, setEmail] = useState('reader@libot.edu');
  const [password, setPassword] = useState('password123');
  const [role, setRole] = useState<'READER' | 'LIBRARIAN'>('READER');
  const setUser = useAppStore((state) => state.setUser);
  const setSelectedRole = useAppStore((state) => state.setSelectedRole);

  const handleLogin = async () => {
    const user = {
      id: role === 'LIBRARIAN' ? 'lib-01' : 'reader-01',
      name: role === 'LIBRARIAN' ? 'Librarian Chen' : 'Ava Reader',
      email,
      role,
    };

    await secureStorage.set('session', {
      accessToken: 'demo-access-token',
      refreshToken: 'demo-refresh-token',
      user,
    });

    setUser(user);
    setSelectedRole(role);

    if (role === 'LIBRARIAN') {
      router.replace('/(librarian)/dashboard');
      return;
    }

    router.replace('/(reader)/home');
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.headerWrap}>
        <AppText variant="title">LiBot Mobile</AppText>
        <AppText variant="subtitle" color={colors.subtext}>Intelligent Library Management Robot</AppText>
      </View>

      <AppCard style={styles.card}>
        <AppText variant="heading" style={styles.sectionTitle}>Sign in</AppText>

        <View style={styles.roleRow}>
          {(['READER', 'LIBRARIAN'] as const).map((value) => (
            <AppButton
              key={value}
              title={value}
              variant={role === value ? 'primary' : 'secondary'}
              onPress={() => setRole(value)}
              style={styles.roleButton}
            />
          ))}
        </View>

        <View style={styles.fieldGroup}>
          <AppInput label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
        </View>

        <View style={styles.fieldGroup}>
          <AppInput label="Password" value={password} onChangeText={setPassword} secureTextEntry />
        </View>

        <AppButton title="Login" onPress={handleLogin} style={styles.loginButton} />
      </AppCard>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: spacing.xl,
    backgroundColor: colors.background,
  },
  headerWrap: {
    marginBottom: spacing.xl,
  },
  card: {
    borderRadius: 24,
  },
  sectionTitle: {
    marginBottom: spacing.lg,
  },
  roleRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  roleButton: {
    flex: 1,
  },
  fieldGroup: {
    marginBottom: spacing.lg,
  },
  loginButton: {
    marginTop: spacing.sm,
  },
});

