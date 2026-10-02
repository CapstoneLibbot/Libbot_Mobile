export interface Book {
  id: string;
  title: string;
  author: string;
  isbn: string;
  category: string;
  description: string;
  available: boolean;
  shelf: string;
  floor: number;
  coverUrl?: string;
  publishedYear?: number;
  totalCopies?: number;
  availableCopies?: number;
  shelfSlot?: string;
  pages?: number;
  publisher?: string;
  language?: string;
  zone?: string;
}

export interface BookSearchFilter {
  query?: string;
  category?: string;
}

export interface CatalogRepository {
  search(filter?: BookSearchFilter): Promise<Book[]>;
  getById(bookId: string): Promise<Book | null>;
  getCategories(): Promise<string[]>;
}

