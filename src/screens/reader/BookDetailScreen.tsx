import { router, useLocalSearchParams } from 'expo-router';
import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { AppButton, AppCard, AppText } from '../../components/common';
import { booksMock } from '../../mocks/books.mock';
import { colors, spacing } from '../../theme';

export default function BookDetailScreen(): React.ReactElement {
  const { bookId } = useLocalSearchParams<{ bookId: string }>();
  const book = booksMock.find((item) => item.id === bookId) ?? booksMock[0];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <AppText variant="title">{book.title}</AppText>
      <AppText color={colors.subtext}>{book.author}</AppText>

      <AppCard style={styles.card}>
        <AppText variant="heading">Book details</AppText>
        <AppText style={styles.text}>{book.description}</AppText>
        <AppText>ISBN: {book.isbn}</AppText>
        <AppText>Category: {book.category}</AppText>
        <AppText>Shelf: {book.shelf}</AppText>
        <AppText>Floor: {book.floor}</AppText>
      </AppCard>

      <AppCard style={styles.card}>
        <AppText variant="heading">Availability</AppText>
        <AppText color={book.available ? colors.success : colors.danger}>{book.available ? 'Available now' : 'Currently unavailable'}</AppText>
      </AppCard>

      <View style={styles.actions}>
        <AppButton title="Request guidance" onPress={() => router.push('/(reader)/guidance/mission-001')} />
        <AppButton title="Back to search" variant="secondary" onPress={() => router.back()} />
      </View>
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
  text: {
    marginTop: spacing.sm,
  },
  actions: {
    gap: spacing.md,
  },
});

