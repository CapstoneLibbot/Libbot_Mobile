export interface Book {
  id: string;
  title: string;
  author: string;
  isbn: string;
  category: string;
  description: string;
  coverUrl?: string;
  available: boolean;
  shelf: string;
  floor: number;
}

export interface BookSearchFilters {
  query: string;
  category?: string;
}
