import { apiClient } from "@/services/api/client";
import {
  Book,
  BookSearchFilter,
  CatalogRepository,
} from "../types/catalog.types";
import {
  BookCategoryDto,
  BookGuidanceDetailDto,
  BookSearchParamsDto,
  BookSearchResponseDto,
} from "./catalog.dto";
import {
  mapBookDetailToBook,
  mapCategoriesDto,
  mapSearchResponseToBooks,
} from "./catalog.mapper";

/**
 * Feature API client for book search and catalog operations.
 * Communicates with ASP.NET Core backend /api/book-guidance endpoints.
 */
export const catalogApi = {
  async searchBooks(
    params?: BookSearchParamsDto,
  ): Promise<BookSearchResponseDto> {
    const queryParams: Record<string, string | number> = {
      matchMode: params?.matchMode || "FUZZY",
      page: params?.page ?? 1,
      pageSize: params?.pageSize ?? 50,
    };

    if (params?.query && params.query.trim()) {
      queryParams.query = params.query.trim();
    }

    if (
      params?.category &&
      params.category.trim() &&
      params.category !== "All"
    ) {
      queryParams.category = params.category.trim();
    }

    const response = await apiClient.get<BookSearchResponseDto>(
      "/book-guidance/search",
      { params: queryParams },
    );
    return response.data;
  },

  async getBookById(bookId: string): Promise<BookGuidanceDetailDto | null> {
    try {
      const response = await apiClient.get<BookGuidanceDetailDto>(
        `/book-guidance/books/${bookId}`,
      );
      return response.data;
    } catch (error: unknown) {
      if (
        typeof error === "object" &&
        error !== null &&
        "status" in error &&
        (error as { status: number }).status === 404
      ) {
        return null;
      }
      throw error;
    }
  },

  async getCategories(): Promise<BookCategoryDto[]> {
    try {
      const response = await apiClient.get<BookCategoryDto[]>(
        "/book-categories",
      );
      return response.data;
    } catch {
      return [];
    }
  },
};

/**
 * Production HTTP implementation of CatalogRepository using catalogApi.
 */
export class HttpCatalogRepository implements CatalogRepository {
  async search(filter?: BookSearchFilter): Promise<Book[]> {
    const responseDto = await catalogApi.searchBooks({
      query: filter?.query,
      category: filter?.category,
    });
    return mapSearchResponseToBooks(responseDto);
  }

  async getById(bookId: string): Promise<Book | null> {
    const detailDto = await catalogApi.getBookById(bookId);
    if (!detailDto) return null;
    return mapBookDetailToBook(detailDto);
  }

  async getCategories(): Promise<string[]> {
    const categoriesDto = await catalogApi.getCategories();
    return mapCategoriesDto(categoriesDto);
  }
}
