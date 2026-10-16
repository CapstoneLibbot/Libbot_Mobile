import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiClient } from "@/services/api/client";
import { catalogApi, HttpCatalogRepository } from "../catalog.api";
import { BookGuidanceDetailDto } from "../catalog.dto";

vi.mock("@/services/api/client", () => ({
  apiClient: {
    get: vi.fn(),
  },
}));

describe("catalogApi and HttpCatalogRepository (src/features/catalog/api/catalog.api.ts)", () => {
  const mockGet = vi.mocked(apiClient.get);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls /book-guidance/books/{bookId} and returns BookGuidanceDetailDto", async () => {
    const mockDetail: BookGuidanceDetailDto = {
      bookId: "b-01",
      isbn: "9780134494166",
      title: "Clean Architecture",
      author: "Robert C. Martin",
      classification: "Engineering",
      location: {
        floorId: "f1",
        floor: "Tầng 1",
        floorNumber: 1,
        aisleId: "a1",
        aisle: "A",
        aisleName: "Dãy A",
        shelfId: "s1",
        shelf: "A-12",
        shelfName: "Kệ A-12",
        shelfLevelId: "sl3",
        shelfLevel: 3,
      },
      actions: ["VIEW_LOCATION", "START_GUIDANCE", "RATE"],
      bookItems: [
        {
          id: "item-1",
          barcode: "BC-94811",
          status: "Available",
        },
      ],
    };

    mockGet.mockResolvedValueOnce({ data: mockDetail });

    const result = await catalogApi.getBookById("b-01");

    expect(mockGet).toHaveBeenCalledWith("/book-guidance/books/b-01");
    expect(result).toEqual(mockDetail);
  });

  it("returns null when API returns 404 Not Found", async () => {
    mockGet.mockRejectedValueOnce({
      status: 404,
      message: "Book not found.",
    });

    const result = await catalogApi.getBookById("non-existent-id");

    expect(result).toBeNull();
  });

  it("rethrows error when API fails with 500 Internal Server Error", async () => {
    mockGet.mockRejectedValueOnce(new Error("Network Error"));

    await expect(catalogApi.getBookById("b-err")).rejects.toThrow("Network Error");
  });

  it("HttpCatalogRepository.getById maps DTO to domain Book model", async () => {
    const mockDetail: BookGuidanceDetailDto = {
      bookId: "b-repo-01",
      isbn: "9780134494166",
      title: "Clean Architecture",
      author: "Robert C. Martin",
      location: {
        floorId: "f1",
        floor: "Tầng 1",
        floorNumber: 1,
        aisleId: "a1",
        aisle: "A",
        aisleName: "Dãy A",
        shelfId: "s1",
        shelf: "A-12",
        shelfName: "Kệ A-12",
        shelfLevelId: "sl3",
        shelfLevel: 3,
      },
      actions: ["START_GUIDANCE"],
      bookItems: [
        {
          id: "item-1",
          barcode: "BC-94811",
          status: "Available",
        },
        {
          id: "item-2",
          barcode: "BC-94825",
          status: "Borrowed",
        },
      ],
    };

    mockGet.mockResolvedValueOnce({ data: mockDetail });

    const repository = new HttpCatalogRepository();
    const book = await repository.getById("b-repo-01");

    expect(book).not.toBeNull();
    expect(book?.id).toBe("b-repo-01");
    expect(book?.available).toBe(true);
    expect(book?.totalCopies).toBe(2);
    expect(book?.availableCopies).toBe(1);
    expect(book?.copies).toHaveLength(2);
    expect(book?.copies?.[0].barcode).toBe("BC-94811");
  });

  it("HttpCatalogRepository.getById returns null when book not found", async () => {
    mockGet.mockRejectedValueOnce({ status: 404 });

    const repository = new HttpCatalogRepository();
    const book = await repository.getById("missing");

    expect(book).toBeNull();
  });
});
