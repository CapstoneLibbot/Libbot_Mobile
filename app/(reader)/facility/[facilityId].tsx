import React from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { AppText } from '../../../src/components/common';
import { MobileMap } from '../../../src/components/map/MobileMap';
import { colors, spacing } from '../../../src/theme';

export default function FacilityDetailRoute(): React.ReactElement {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <AppText variant="title">Library areas</AppText>
      <AppText color={colors.subtext}>Find the reading area and other destinations.</AppText>
      <MobileMap />
      <AppText variant="heading">Reading area</AppText>
      <AppText color={colors.subtext}>Quiet reading zone, ground floor.</AppText>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.xl, gap: spacing.md },
});
