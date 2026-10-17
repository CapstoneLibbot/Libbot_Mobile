import { Book, BookItem } from "../types/catalog.types";
import {
  BookCategoryDto,
  BookGuidanceDetailDto,
  BookSearchItemDto,
  BookSearchResponseDto,
} from "./catalog.dto";

/**
 * Maps a search item from backend DTO to domain Book model.
 */
export function mapSearchItemToBook(dto: BookSearchItemDto): Book {
  const availableCopies = dto.availableCopies ?? 0;
  return {
    id: dto.bookId,
    isbn: dto.isbn || "",
    title: dto.title || "Chưa có tiêu đề",
    author: dto.author || "Không rõ tác giả",
    category: dto.classification?.trim() || "Khác",
    description: "",
    available: availableCopies > 0,
    availableCopies,
    totalCopies: availableCopies,
    coverUrl: dto.image || undefined,
    shelf: "Chung",
    floor: 1,
  };
}

/**
 * Maps search response list to domain Book array.
 */
export function mapSearchResponseToBooks(dto: BookSearchResponseDto): Book[] {
  if (!dto || !Array.isArray(dto.books)) {
    return [];
  }
  return dto.books.map(mapSearchItemToBook);
}

/**
 * Formats a clean aisle label (e.g. "Dãy A").
 */
function formatAisleLabel(aisle?: string | null, aisleName?: string | null): string {
  if (aisleName) {
    return aisleName;
  }
  if (aisle) {
    return aisle.startsWith("Dãy") ? aisle : `Dãy ${aisle}`;
  }
  return "Dãy chính";
}

/**
 * Formats a clean shelf label (e.g. "Kệ A-12" or "Kệ 01-A").
 */
function formatShelfLabel(shelf?: string | null, shelfName?: string | null): string {
  if (shelfName) {
    return shelfName;
  }
  if (shelf) {
    return shelf.startsWith("Kệ") ? shelf : `Kệ ${shelf}`;
  }
  return "Kệ sách";
}

/**
 * Maps detailed book guidance DTO to domain Book model,
 * including individual copies (bookItems), shelf, floor, and shelfSlot extracted from location.
 */
export function mapBookDetailToBook(dto: BookGuidanceDetailDto): Book {
  const rawBookItems = dto.bookItems ?? [];
  const location =
    rawBookItems.find(
      (item) =>
        item.status?.trim().toLowerCase() === "available" && item.location,
    )?.location ?? null;
  const hasLocation = Boolean(location);

  const floor = location?.floorNumber ?? 1;
  const aisle = location ? formatAisleLabel(location.aisle, location.aisleName) : undefined;
  const shelf = location ? formatShelfLabel(location.shelf, location.shelfName) : "Chung";

  const shelfSlot = location?.shelfLevel
    ? `Ngăn ${location.shelfLevel}`
    : undefined;

  const copies: BookItem[] = rawBookItems.map((item) => {
    // Keep an unlocated copy unlocated; aggregate book location may point at another copy.
    const itemLoc = item.location ?? null;
    const itemAisle = itemLoc
      ? formatAisleLabel(itemLoc.aisle, itemLoc.aisleName)
      : aisle;
    const itemShelf = itemLoc
      ? formatShelfLabel(itemLoc.shelf, itemLoc.shelfName)
      : shelf;
    const itemShelfSlot = itemLoc?.shelfLevel
      ? `Ngăn ${itemLoc.shelfLevel}`
      : shelfSlot;

    const itemStatus: "Available" | "Borrowed" =
      item.status?.trim().toLowerCase() === "available"
        ? "Available"
        : "Borrowed";

    return {
      id: item.id,
      barcode: item.barcode,
      status: itemStatus,
      shelf: itemShelf,
      shelfSlot: itemShelfSlot,
      aisle: itemAisle,
      floor: itemLoc?.floorNumber ?? floor,
      location: itemLoc ?? null,
      endpoint: itemLoc?.endpoint ?? null,
    };
  });

  const hasExplicitCopies = copies.length > 0;
  const availableCopies = hasExplicitCopies
    ? copies.filter((c) => c.status === "Available").length
    : hasLocation
      ? 1
      : 0;
  const totalCopies = hasExplicitCopies ? copies.length : hasLocation ? 1 : 0;
  const isAvailable = availableCopies > 0;

  return {
    id: dto.bookId,
    isbn: dto.isbn || "",
    title: dto.title || "Chưa có tiêu đề",
    author: dto.author || "Không rõ tác giả",
    category: dto.classification?.trim() || "Khác",
    description: "",
    available: isAvailable,
    availableCopies,
    totalCopies,
    floor,
    shelf,
    shelfSlot,
    aisle,
    actions: dto.actions ?? [],
    copies,
    endpoint: location?.endpoint ?? null,
    coverUrl: dto.image || undefined,
    publishedYear: dto.publicationYear || undefined,
    publisher: dto.publisher || undefined,
  };
}

/**
 * Maps category DTOs to category name string list with "All" prepended.
 */
export function mapCategoriesDto(categories: BookCategoryDto[]): string[] {
  if (!Array.isArray(categories)) {
    return ["All"];
  }
  const names = categories
    .map((c) => c.name?.trim())
    .filter((name): name is string => Boolean(name));
  const uniqueNames = Array.from(new Set(names));
  return ["All", ...uniqueNames];
}
