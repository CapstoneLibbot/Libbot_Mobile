import React, { useMemo, useState } from "react";
import { Image, StyleSheet, View } from "react-native";
import { AppText } from "@/shared/ui";
import { getBookCoverTheme } from "../utils/bookCoverTheme";

export { getBookCoverTheme };

export interface BookCoverThumbProps {
  coverUrl?: string;
  category: string;
  title: string;
  author: string;
  width: number;
  height: number;
}

/**
 * Renders real book cover image when available with automatic fallback
 * to a category-themed stylized mini physical book cover.
 */
export function BookCoverThumb({
  coverUrl,
  category,
  title,
  author,
  width,
  height,
}: BookCoverThumbProps): React.ReactElement {
  const [hasError, setHasError] = useState(false);
  const coverTheme = useMemo(
    () => getBookCoverTheme(category, title, author),
    [category, title, author],
  );

  const isMini = width < 52;

  if (coverUrl && !hasError) {
    return (
      <View style={[styles.bookCoverThumbWrapper, { width, height }]}>
        <Image
          source={{ uri: coverUrl }}
          style={styles.bookCoverImage}
          resizeMode="cover"
          onError={() => setHasError(true)}
        />
        <View style={styles.bookSpineSheen} />
      </View>
    );
  }

  return (
    <View
      style={[
        styles.bookCoverThumbWrapper,
        {
          width,
          height,
          backgroundColor: coverTheme.bgColor,
        },
      ]}
    >
      <View style={styles.bookSpineSheen} />
      <AppText
        variant="caption"
        style={[
          styles.coverTagText,
          { color: coverTheme.tagColor, fontSize: isMini ? 6.5 : 8 },
        ]}
      >
        {coverTheme.tag}
      </AppText>
      <AppText
        variant="caption"
        numberOfLines={2}
        style={[
          styles.coverTitleText,
          { fontSize: isMini ? 8 : 9.5, lineHeight: isMini ? 10 : 12 },
        ]}
      >
        {coverTheme.titleSnippet}
      </AppText>
      <AppText
        variant="caption"
        numberOfLines={1}
        style={[
          styles.coverAuthorText,
          { fontSize: isMini ? 6 : 7.5 },
        ]}
      >
        {coverTheme.authorSnippet}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  bookCoverThumbWrapper: {
    borderRadius: 6,
    overflow: "hidden",
    position: "relative",
    justifyContent: "space-between",
    padding: 4,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  bookCoverImage: {
    ...StyleSheet.absoluteFill,
    borderRadius: 6,
  },
  bookSpineSheen: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    backgroundColor: "rgba(255, 255, 255, 0.18)",
  },
  coverTagText: {
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  coverTitleText: {
    color: "#FFFFFF",
    fontWeight: "700",
    marginTop: 2,
  },
  coverAuthorText: {
    color: "rgba(255, 255, 255, 0.75)",
    fontWeight: "500",
    alignSelf: "flex-end",
  },
});
