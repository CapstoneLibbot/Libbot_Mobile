import { Book } from "../types/catalog.types";
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
 * Maps detailed book guidance DTO to domain Book model,
 * including shelf, floor, and shelfSlot extracted from location.
 */
export function mapBookDetailToBook(dto: BookGuidanceDetailDto): Book {
  const hasLocation = Boolean(dto.location);
  const location = dto.location;

  const floor = location?.floorNumber ?? 1;
  const shelf = location
    ? location.shelfName || location.shelf || "Kệ sách"
    : "Chung";

  const shelfSlot = location?.shelfLevel
    ? `Tầng ${location.shelfLevel}`
    : undefined;

  return {
    id: dto.bookId,
    isbn: dto.isbn || "",
    title: dto.title || "Chưa có tiêu đề",
    author: dto.author || "Không rõ tác giả",
    category: dto.classification?.trim() || "Khác",
    description: "",
    available: hasLocation,
    availableCopies: hasLocation ? 1 : 0,
    totalCopies: hasLocation ? 1 : 0,
    floor,
    shelf,
    shelfSlot,
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
