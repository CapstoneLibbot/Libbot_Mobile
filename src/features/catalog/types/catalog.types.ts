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
}

export interface BookSearchFilter {
  query?: string;
  category?: string;
}
