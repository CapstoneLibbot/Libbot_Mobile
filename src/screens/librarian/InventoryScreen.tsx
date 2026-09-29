import React from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { AppCard, AppText } from '../../components/common';
import { colors, spacing } from '../../theme';

export default function InventoryScreen(): React.ReactElement {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <AppText variant="title">Inventory results</AppText>
      <AppCard>
        <AppText variant="heading">Shelf summary</AppText>
        <AppText>Total items: 1840</AppText>
        <AppText>Scanned: 1702</AppText>
        <AppText>Missing: 18</AppText>
      </AppCard>
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
  },
});

