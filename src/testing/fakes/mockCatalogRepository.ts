import {
  Book,
  BookSearchFilter,
  CatalogRepository,
} from "@/features/catalog/types/catalog.types";
import { booksFixture } from "../fixtures/books.fixture";

export class MockCatalogRepository implements CatalogRepository {
  private delayMs: number;

  constructor(delayMs = 150) {
    this.delayMs = delayMs;
  }

  private sleep(): Promise<void> {
    if (this.delayMs <= 0) return Promise.resolve();
    return new Promise((resolve) => setTimeout(resolve, this.delayMs));
  }

  async search(filter?: BookSearchFilter): Promise<Book[]> {
    await this.sleep();
    let results = [...booksFixture];

    if (filter?.category && filter.category !== "All") {
      results = results.filter(
        (b) => b.category.toLowerCase() === filter.category!.toLowerCase(),
      );
    }

    if (filter?.query && filter.query.trim().length > 0) {
      const q = filter.query.trim().toLowerCase();
      results = results.filter(
        (b) =>
          b.title.toLowerCase().includes(q) ||
          b.author.toLowerCase().includes(q) ||
          b.isbn.toLowerCase().includes(q) ||
          b.category.toLowerCase().includes(q),
      );
    }

    return results;
  }

  async getById(bookId: string): Promise<Book | null> {
    await this.sleep();
    const book = booksFixture.find((b) => b.id === bookId);
    return book ?? null;
  }

  async getCategories(): Promise<string[]> {
    await this.sleep();
    const categories = new Set(booksFixture.map((b) => b.category));
    return ["All", ...Array.from(categories)];
  }
}
