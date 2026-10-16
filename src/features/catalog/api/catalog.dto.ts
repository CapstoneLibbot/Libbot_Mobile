/**
 * Backend DTOs corresponding to /api/book-guidance endpoints and /api/book-categories.
 */

export interface BookSearchItemDto {
  bookId: string;
  isbn: string;
  title: string;
  author: string;
  classification?: string | null;
  availableCopies: number;
  image?: string | null;
}

export interface BookSearchResponseDto {
  books: BookSearchItemDto[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}

export interface NavigationEndpointDto {
  endpointId: string;
  name: string;
  x: number;
  y: number;
  theta: number;
}

export interface BookLocationDto {
  floorId: string;
  floor: string;
  floorNumber: number;
  aisleId: string;
  aisle: string;
  aisleName: string;
  shelfId: string;
  shelf: string;
  shelfName: string;
  shelfLevelId: string;
  shelfLevel: number;
  endpoint?: NavigationEndpointDto | null;
}

export interface BookGuidanceBookItemDto {
  id: string;
  barcode: string;
  status: string;
  location?: BookLocationDto | null;
}

export interface BookGuidanceDetailDto {
  bookId: string;
  isbn: string;
  title: string;
  author: string;
  publisher?: string | null;
  publicationYear?: number | null;
  classification?: string | null;
  location?: BookLocationDto | null;
  actions: string[];
  image?: string | null;
  bookItems?: BookGuidanceBookItemDto[];
}

export interface BookSearchParamsDto {
  query?: string;
  category?: string;
  matchMode?: "FUZZY" | "EXACT";
  page?: number;
  pageSize?: number;
}

export interface BookCategoryDto {
  id: string;
  name: string;
  description?: string | null;
}
