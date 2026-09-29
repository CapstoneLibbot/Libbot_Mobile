import React from 'react';
import { StyleSheet, TextInput, TextInputProps, View } from 'react-native';
import { colors, spacing } from '../../theme';

interface AppInputProps extends TextInputProps {
  label?: string;
}

export function AppInput({ label, ...props }: AppInputProps): React.ReactElement {
  return (
    <View style={styles.container}>
      {label ? <TextInput style={styles.input} {...props} placeholder={label} /> : <TextInput style={styles.input} {...props} />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: 12,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    color: colors.text,
  },
});

