import { Info, MapPin } from "lucide-react-native";
import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { AppText } from "@/shared/ui";
import { Book } from "../types/catalog.types";
import { BookCoverThumb } from "./BookCoverThumb";

export interface BookListRowProps {
  book: Book;
  onViewDetail: (bookId: string) => void;
  onRequestGuidance: (book: Book) => void;
}

export function BookListRow({
  book,
  onViewDetail,
  onRequestGuidance,
}: BookListRowProps): React.ReactElement {
  return (
    <Pressable
      onPress={() => onViewDetail(book.id)}
      style={({ pressed }) => [
        styles.listRowCard,
        pressed && styles.listRowPressed,
      ]}
      accessibilityRole="button"
      accessibilityLabel={`Xem chi tiết ${book.title}`}
    >
      {/* Mini Book Cover (Photo or Stylized Cover) */}
      <BookCoverThumb
        coverUrl={book.coverUrl}
        category={book.category}
        title={book.title}
        author={book.author}
        width={46}
        height={64}
      />

      {/* Center: Book Metadata */}
      <View style={styles.compactInfoContent}>
        <AppText
          variant="subtitle"
          style={styles.compactMainTitle}
          numberOfLines={1}
        >
          {book.title}
        </AppText>
        <AppText
          variant="caption"
          style={styles.compactSubtitle}
          numberOfLines={1}
        >
          {book.author}
        </AppText>
        <View style={styles.compactStatusRow}>
          {book.available ? (
            <AppText variant="caption" style={styles.compactAvailableText}>
              Có sẵn ({book.availableCopies ?? 1} cuốn)
            </AppText>
          ) : (
            <AppText variant="caption" style={styles.compactBorrowedText}>
              Đang mượn
            </AppText>
          )}
        </View>
      </View>

      {/* Right: Quick Action Button */}
      <View style={styles.compactActionGroup}>
        {book.available ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Dẫn đường tìm sách ${book.title}`}
            onPress={(e) => {
              e.stopPropagation();
              onRequestGuidance(book);
            }}
            style={({ pressed }) => [
              styles.compactBtnLead,
              pressed && styles.btnPressed,
            ]}
          >
            <MapPin size={12} color="#FFFFFF" />
            <AppText variant="caption" style={styles.compactBtnLeadText}>
              Dẫn đường
            </AppText>
          </Pressable>
        ) : (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Xem chi tiết ${book.title}`}
            onPress={(e) => {
              e.stopPropagation();
              onViewDetail(book.id);
            }}
            style={({ pressed }) => [
              styles.compactBtnDetail,
              pressed && styles.btnPressed,
            ]}
          >
            <Info size={12} color="#64748B" />
            <AppText variant="caption" style={styles.compactBtnDetailText}>
              Chi tiết
            </AppText>
          </Pressable>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  listRowCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 8,
    gap: 12,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  listRowPressed: {
    backgroundColor: "#F8FAFC",
  },
  compactInfoContent: {
    flex: 1,
    justifyContent: "center",
  },
  compactMainTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 2,
  },
  compactSubtitle: {
    fontSize: 12,
    color: "#64748B",
    marginBottom: 4,
  },
  compactStatusRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  compactAvailableText: {
    color: "#16A34A",
    fontWeight: "600",
    fontSize: 11,
  },
  compactBorrowedText: {
    color: "#94A3B8",
    fontWeight: "500",
    fontSize: 11,
  },
  compactActionGroup: {
    justifyContent: "center",
    alignItems: "flex-end",
  },
  compactBtnLead: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#2563EB",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    gap: 4,
  },
  compactBtnLeadText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "600",
  },
  compactBtnDetail: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    gap: 4,
  },
  compactBtnDetailText: {
    color: "#475569",
    fontSize: 11,
    fontWeight: "600",
  },
  btnPressed: {
    opacity: 0.8,
  },
});
