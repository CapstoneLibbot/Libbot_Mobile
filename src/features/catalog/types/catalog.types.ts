import type {
  BookLocationDto,
  NavigationEndpointDto,
} from "../api/catalog.dto";

export type BookCopyStatus = "Available" | "Borrowed";

export interface BookItem {
  id: string;
  barcode: string;
  status: BookCopyStatus;
  shelf?: string;
  shelfSlot?: string;
  aisle?: string;
  /** Legacy client compatibility only; detail UI derives capability from endpoint presence. */
  actions?: string[];
  floor?: number;
  location?: BookLocationDto | null;
  endpoint?: NavigationEndpointDto | null;
}

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
  aisle?: string;
  actions?: string[];
  copies?: BookItem[];
  endpoint?: NavigationEndpointDto | null;
}

export interface BookSearchFilter {
  query?: string;
  category?: string;
}

export interface BookSearchPage {
  books: Book[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}

export interface CatalogRepository {
  search(filter?: BookSearchFilter): Promise<Book[]>;
  searchPage?(
    filter?: BookSearchFilter & { page?: number; pageSize?: number },
  ): Promise<BookSearchPage>;
  getById(bookId: string): Promise<Book | null>;
  getCategories(): Promise<string[]>;
}

