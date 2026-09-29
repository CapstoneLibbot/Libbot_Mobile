import { router } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { AppButton, AppCard, AppInput, AppText } from '../../components/common';
import { useBooks } from '../../features/books';
import { colors, spacing } from '../../theme';

export default function SearchScreen(): React.ReactElement {
  const { data: books = [], isLoading, error } = useBooks();
  const [query, setQuery] = useState('');

  const filteredBooks = useMemo(
    () => books.filter((book) => book.title.toLowerCase().includes(query.toLowerCase()) || book.author.toLowerCase().includes(query.toLowerCase())),
    [books, query],
  );

  if (isLoading) {
    return <AppText style={{ padding: spacing.xl }}>Loading books...</AppText>;
  }

  if (error) {
    return <AppText style={{ padding: spacing.xl, color: colors.danger }}>Could not load books.</AppText>;
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <AppText variant="title">Search books</AppText>
      <AppInput label="Search by title or author" value={query} onChangeText={setQuery} />

      {filteredBooks.map((book) => (
        <AppCard key={book.id} style={styles.card}>
          <AppText variant="subtitle">{book.title}</AppText>
          <AppText color={colors.subtext}>{book.author}</AppText>
          <AppText color={colors.subtext}>{book.category}</AppText>
          <View style={styles.footer}>
            <AppText color={book.available ? colors.success : colors.danger}>{book.available ? 'Available' : 'Unavailable'}</AppText>
            <AppButton title="Details" variant="secondary" onPress={() => router.push(`/(reader)/book/${book.id}`)} />
          </View>
        </AppCard>
      ))}

      {filteredBooks.length === 0 ? <AppText color={colors.subtext}>No books matched your search.</AppText> : null}
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
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.md,
  },
});

