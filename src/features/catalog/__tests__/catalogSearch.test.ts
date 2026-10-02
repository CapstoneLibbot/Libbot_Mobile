import { describe, expect, it } from "vitest";
import { MockCatalogRepository } from "@/testing/fakes/mockCatalogRepository";
import { Book } from "../types/catalog.types";

describe("Catalog Search and Filtering", () => {
  const repository = new MockCatalogRepository(0); // 0 delay for fast unit tests

  it("filters books by title (case-insensitive and partial match)", async () => {
    const results = await repository.search({ query: "clean" });
    expect(results.length).toBeGreaterThan(0);
    expect(results.every((b: Book) => b.title.toLowerCase().includes("clean"))).toBe(
      true,
    );
    expect(results[0].title).toContain("Clean Architecture");
  });

  it("filters books by author (case-insensitive)", async () => {
    const results = await repository.search({ query: "Martin" });
    expect(results.length).toBeGreaterThan(0);
    const authors = results.map((b: Book) => b.author);
    expect(authors.some((a: string) => a.includes("Martin"))).toBe(true);
  });

  it("filters books by ISBN exactly or partially", async () => {
    const results = await repository.search({ query: "9780134494166" });
    expect(results.length).toBe(1);
    expect(results[0].id).toBe("bk-1001");
    expect(results[0].isbn).toBe("9780134494166");
  });

  it("filters books by category", async () => {
    const results = await repository.search({ category: "Robotics" });
    expect(results.length).toBeGreaterThan(0);
    expect(results.every((b: Book) => b.category === "Robotics")).toBe(true);
  });

  it("combines query and category filters simultaneously", async () => {
    const results = await repository.search({
      query: "Thrun",
      category: "Robotics",
    });
    expect(results.length).toBe(1);
    expect(results[0].title).toBe("Probabilistic Robotics");
    expect(results[0].author).toBe("Sebastian Thrun");
  });

  it('returns all books when category is "All" and query is empty', async () => {
    const allBooks = await repository.search({ category: "All" });
    const emptyFilterBooks = await repository.search();
    expect(allBooks.length).toBe(emptyFilterBooks.length);
    expect(allBooks.length).toBeGreaterThanOrEqual(7);
  });

  it("returns empty array when no books match query", async () => {
    const results = await repository.search({
      query: "xyz-non-existent-query-999",
    });
    expect(results).toEqual([]);
  });

  it("retrieves single book by ID", async () => {
    const book = await repository.getById("bk-1001");
    expect(book).not.toBeNull();
    expect(book?.title).toContain("Clean Architecture");
  });

  it("returns null for non-existent book ID", async () => {
    const book = await repository.getById("non-existent-id");
    expect(book).toBeNull();
  });
});
