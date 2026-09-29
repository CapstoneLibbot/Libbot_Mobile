import React from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { AppCard, AppText } from '../../components/common';
import { colors, spacing } from '../../theme';

const misplaced = [
  { id: 'm-1', title: 'Deep Learning Fundamentals', shelf: 'C-15', status: 'FLAGGED' },
  { id: 'm-2', title: 'Space and Time', shelf: 'B-09', status: 'FOUND' },
];

export default function MisplacedBooksScreen(): React.ReactElement {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <AppText variant="title">Misplaced books</AppText>
      {misplaced.map((book) => (
        <AppCard key={book.id} style={styles.card}>
          <AppText variant="subtitle">{book.title}</AppText>
          <AppText>Shelf: {book.shelf}</AppText>
          <AppText>Status: {book.status}</AppText>
        </AppCard>
      ))}
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
    gap: spacing.md,
  },
  card: {
    gap: spacing.sm,
  },
});

