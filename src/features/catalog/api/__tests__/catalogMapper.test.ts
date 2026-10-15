import { describe, expect, it } from "vitest";
import {
  BookGuidanceDetailDto,
  BookSearchItemDto,
  BookSearchResponseDto,
} from "../catalog.dto";
import {
  mapBookDetailToBook,
  mapCategoriesDto,
  mapSearchItemToBook,
  mapSearchResponseToBooks,
} from "../catalog.mapper";

describe("Catalog DTO to Domain Mapper (src/features/catalog/api/catalog.mapper.ts)", () => {
  it("maps BookSearchItemDto to Book domain model correctly", () => {
    const searchItemDto: BookSearchItemDto = {
      bookId: "b001-guid",
      isbn: "9780134494166",
      title: "Clean Architecture",
      author: "Robert C. Martin",
      classification: "Software Engineering",
      availableCopies: 3,
      image: "https://example.com/clean-arch.jpg",
    };

    const book = mapSearchItemToBook(searchItemDto);

    expect(book.id).toBe("b001-guid");
    expect(book.isbn).toBe("9780134494166");
    expect(book.title).toBe("Clean Architecture");
    expect(book.author).toBe("Robert C. Martin");
    expect(book.category).toBe("Software Engineering");
    expect(book.available).toBe(true);
    expect(book.availableCopies).toBe(3);
    expect(book.coverUrl).toBe("https://example.com/clean-arch.jpg");
  });

  it("handles empty classification, fallback category, and zero copies in search item", () => {
    const itemWithoutClassification: BookSearchItemDto = {
      bookId: "b002-guid",
      isbn: "9781234567890",
      title: "Unknown Book",
      author: "Jane Doe",
      classification: null,
      availableCopies: 0,
      image: null,
    };

    const book = mapSearchItemToBook(itemWithoutClassification);

    expect(book.id).toBe("b002-guid");
    expect(book.category).toBe("Khác");
    expect(book.available).toBe(false);
    expect(book.availableCopies).toBe(0);
    expect(book.coverUrl).toBeUndefined();
  });

  it("maps BookSearchResponseDto list to Book array", () => {
    const responseDto: BookSearchResponseDto = {
      books: [
        {
          bookId: "1",
          isbn: "111",
          title: "Book 1",
          author: "Author 1",
          classification: "AI",
          availableCopies: 1,
          image: null,
        },
        {
          bookId: "2",
          isbn: "222",
          title: "Book 2",
          author: "Author 2",
          classification: "Data",
          availableCopies: 0,
          image: null,
        },
      ],
      page: 1,
      pageSize: 20,
      totalCount: 2,
      totalPages: 1,
    };

    const books = mapSearchResponseToBooks(responseDto);
    expect(books).toHaveLength(2);
    expect(books[0].id).toBe("1");
    expect(books[0].category).toBe("AI");
    expect(books[0].available).toBe(true);
    expect(books[1].id).toBe("2");
    expect(books[1].available).toBe(false);
  });

  it("maps BookGuidanceDetailDto with full location and availability to Book model", () => {
    const detailDto: BookGuidanceDetailDto = {
      bookId: "book-guid-123",
      isbn: "9780132350884",
      title: "Clean Code",
      author: "Robert C. Martin",
      publisher: "Prentice Hall",
      publicationYear: 2008,
      classification: "Programming",
      location: {
        floorId: "f1",
        floor: "Floor 1",
        floorNumber: 1,
        aisleId: "a1",
        aisle: "A1",
        aisleName: "Aisle Software",
        shelfId: "s1",
        shelf: "S1",
        shelfName: "Kệ 01-A",
        shelfLevelId: "sl2",
        shelfLevel: 3,
        endpoint: {
          endpointId: "ep1",
          name: "Point Shelf 1",
          x: 12.5,
          y: 8.2,
          theta: 1.57,
        },
      },
      actions: ["VIEW_LOCATION", "START_GUIDANCE", "RATE"],
      image: "https://example.com/clean-code.jpg",
    };

    const book = mapBookDetailToBook(detailDto);

    expect(book.id).toBe("book-guid-123");
    expect(book.title).toBe("Clean Code");
    expect(book.category).toBe("Programming");
    expect(book.available).toBe(true);
    expect(book.availableCopies).toBe(1);
    expect(book.floor).toBe(1);
    expect(book.shelf).toBe("Kệ 01-A");
    expect(book.shelfSlot).toBe("Tầng 3");
    expect(book.publisher).toBe("Prentice Hall");
    expect(book.publishedYear).toBe(2008);
    expect(book.coverUrl).toBe("https://example.com/clean-code.jpg");
  });

  it("maps BookGuidanceDetailDto when location is null (borrowed / unavailable)", () => {
    const unavailableDetailDto: BookGuidanceDetailDto = {
      bookId: "book-guid-456",
      isbn: "9780132350885",
      title: "Out of Stock Book",
      author: "Anonymous",
      publisher: null,
      publicationYear: null,
      classification: null,
      location: null,
      actions: ["VIEW_LOCATION"],
      image: null,
    };

    const book = mapBookDetailToBook(unavailableDetailDto);

    expect(book.id).toBe("book-guid-456");
    expect(book.available).toBe(false);
    expect(book.availableCopies).toBe(0);
    expect(book.shelf).toBe("Chung");
    expect(book.shelfSlot).toBeUndefined();
    expect(book.category).toBe("Khác");
  });

  it("maps category list with All prepended and duplicates removed", () => {
    const rawCategories = [
      { id: "1", name: "Công nghệ thông tin" },
      { id: "2", name: "Trí tuệ nhân tạo" },
      { id: "3", name: "Công nghệ thông tin" }, // duplicate
    ];

    const result = mapCategoriesDto(rawCategories);
    expect(result).toEqual([
      "All",
      "Công nghệ thông tin",
      "Trí tuệ nhân tạo",
    ]);
  });
});
