import { describe, expect, it } from "vitest";
import { toVoiceToolResult } from "../utils/voiceToolResult";

describe("toVoiceToolResult", () => {
  it("maps presentation-safe book results", () => {
    expect(
      toVoiceToolResult({
        type: "tool_result",
        tool: "search_books",
        query: "Clean Code",
        totalMatches: 1,
        books: [
          {
            bookId: "book-1",
            title: "Clean Code",
            author: "Robert C. Martin",
            canGuide: true,
          },
        ],
      }),
    ).toEqual({
      kind: "books",
      query: "Clean Code",
      totalMatches: 1,
      books: [
        {
          bookId: "book-1",
          title: "Clean Code",
          author: "Robert C. Martin",
          canGuide: true,
        },
      ],
    });
  });

  it("maps presentation-safe Endpoint results", () => {
    expect(toVoiceToolResult({
      type: "tool_result",
      tool: "search_locations",
      query: "Bàn thủ thư",
      totalMatches: 1,
      locations: [{ endpointId: "endpoint-1", name: "Bàn thủ thư", canGuide: true }],
    })).toEqual({
      kind: "locations",
      query: "Bàn thủ thư",
      totalMatches: 1,
      locations: [{ endpointId: "endpoint-1", name: "Bàn thủ thư", canGuide: true }],
    });
  });

  it("keeps an empty valid result and filters malformed card records", () => {
    expect(
      toVoiceToolResult({
        type: "tool_result",
        tool: "search_books",
        totalMatches: 0,
        books: [],
      }),
    ).toMatchObject({ kind: "books", books: [] });
    expect(
      toVoiceToolResult({
        type: "tool_result",
        tool: "search_books",
        books: [{ title: "Missing id" }] as never,
      }),
    ).toMatchObject({ kind: "books", books: [] });
  });

  it("ignores unknown tool events", () => {
    expect(toVoiceToolResult({ type: "tool_result" })).toBeNull();
  });
});
