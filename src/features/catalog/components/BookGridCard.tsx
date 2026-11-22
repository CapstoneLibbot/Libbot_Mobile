import { Compass, Eye } from "lucide-react-native";
import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { AppText } from "@/shared/ui";
import { Book } from "../types/catalog.types";
import { BookCoverThumb } from "./BookCoverThumb";

export interface BookGridCardProps {
  book: Book;
  onViewDetail: (bookId: string) => void;
  onRequestGuidance: (book: Book) => void;
}

export function BookGridCard({
  book,
  onViewDetail,
  onRequestGuidance,
}: BookGridCardProps): React.ReactElement {
  return (
    <View style={styles.gridCard}>
      {/* 1. Main Content: Book Cover + Details & Status Badge */}
      <Pressable
        onPress={() => onViewDetail(book.id)}
        style={styles.cardBodyRow}
        accessibilityRole="button"
        accessibilityLabel={`Xem chi tiết ${book.title}`}
      >
        {/* Mini Book Cover (Photo or Stylized Cover) */}
        <BookCoverThumb
          coverUrl={book.coverUrl}
          category={book.category}
          title={book.title}
          author={book.author}
          width={58}
          height={80}
        />

        {/* Book Info Text */}
        <View style={styles.bookInfoContent}>
          {/* Top Line: Title (Left) & Status Badge (Right) */}
          <View style={styles.titleStatusRow}>
            <AppText
              variant="subtitle"
              style={styles.bookMainTitle}
              numberOfLines={2}
            >
              {book.title}
            </AppText>

            {book.available ? (
              <View style={styles.badgeAvailable}>
                <View style={styles.dotAvailable} />
                <AppText variant="caption" style={styles.textAvailable}>
                  Có sẵn
                </AppText>
              </View>
            ) : (
              <View style={styles.badgeBorrowed}>
                <View style={styles.dotBorrowed} />
                <AppText variant="caption" style={styles.textBorrowed}>
                  Đang mượn
                </AppText>
              </View>
            )}
          </View>

          {/* Middle Line: Author */}
          <AppText
            variant="caption"
            style={styles.bookAuthorText}
            numberOfLines={1}
          >
            Tác giả:{" "}
            <AppText variant="caption" style={styles.bookAuthorBold}>
              {book.author}
            </AppText>
          </AppText>

          {/* Bottom Line: ISBN (Left) & Stock Count (Right) */}
          <View style={styles.metaAndStockRow}>
            <AppText
              variant="caption"
              style={styles.bookMetaText}
              numberOfLines={1}
            >
              ISBN: {book.isbn}
            </AppText>

            {book.available ? (
              <AppText variant="caption" style={styles.stockInShelf}>
                Còn {book.availableCopies ?? 1} cuốn
              </AppText>
            ) : null}
          </View>
        </View>
      </Pressable>

      {/* 2. Card Footer: Action Buttons */}
      <View style={styles.cardFooterRow}>
        {book.available ? (
          <>
            {/* Primary: Dẫn đường */}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Dẫn đường tìm sách ${book.title}`}
              onPress={() => onRequestGuidance(book)}
              style={({ pressed }) => [
                styles.btnLeadToShelf,
                pressed && styles.btnPressed,
              ]}
            >
              <Compass size={14} color="#FFFFFF" />
              <AppText variant="caption" style={styles.btnLeadText}>
                Dẫn đường
              </AppText>
            </Pressable>

            {/* Secondary: Chi tiết */}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Xem chi tiết ${book.title}`}
              onPress={() => onViewDetail(book.id)}
              style={({ pressed }) => [
                styles.btnDetailWhite,
                pressed && styles.btnPressed,
              ]}
            >
              <AppText variant="caption" style={styles.btnDetailWhiteText}>
                Chi tiết
              </AppText>
            </Pressable>
          </>
        ) : (
          /* Single Full-width Secondary Button when Borrowed */
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Xem chi tiết ${book.title}`}
            onPress={() => onViewDetail(book.id)}
            style={({ pressed }) => [
              styles.btnDetailFull,
              pressed && styles.btnPressed,
            ]}
          >
            <Eye size={14} color="#64748B" />
            <AppText variant="caption" style={styles.btnDetailFullText}>
              Xem chi tiết sách
            </AppText>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  gridCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 12,
    marginBottom: 10,
    marginHorizontal: 4,
    justifyContent: "space-between",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  cardBodyRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  bookInfoContent: {
    flex: 1,
    justifyContent: "space-between",
  },
  titleStatusRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 6,
    marginBottom: 4,
  },
  bookMainTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: "700",
    color: "#0F172A",
    lineHeight: 18,
  },
  badgeAvailable: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#DCFCE7",
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 20,
    gap: 4,
  },
  dotAvailable: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#16A34A",
  },
  textAvailable: {
    color: "#15803D",
    fontWeight: "600",
    fontSize: 11,
  },
  badgeBorrowed: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 20,
    gap: 4,
  },
  dotBorrowed: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#94A3B8",
  },
  textBorrowed: {
    color: "#64748B",
    fontWeight: "600",
    fontSize: 11,
  },
  bookAuthorText: {
    fontSize: 12,
    color: "#64748B",
    marginBottom: 6,
  },
  bookAuthorBold: {
    color: "#334155",
    fontWeight: "600",
  },
  metaAndStockRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 2,
  },
  bookMetaText: {
    fontSize: 11,
    color: "#94A3B8",
  },
  stockInShelf: {
    fontSize: 11,
    color: "#0D9488",
    fontWeight: "600",
  },
  cardFooterRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  btnLeadToShelf: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#2563EB",
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  btnLeadText: {
    color: "#FFFFFF",
    fontWeight: "600",
    fontSize: 12,
  },
  btnDetailWhite: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    alignItems: "center",
    justifyContent: "center",
  },
  btnDetailWhiteText: {
    color: "#475569",
    fontWeight: "600",
    fontSize: 12,
  },
  btnDetailFull: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  btnDetailFullText: {
    color: "#475569",
    fontWeight: "600",
    fontSize: 12,
  },
  btnPressed: {
    opacity: 0.8,
  },
});
