import type {
  XiaozhiNativeEvent,
  XiaozhiVoiceArea,
  XiaozhiVoiceBook,
} from "xiaozhi-audio";

export type VoiceToolResult =
  | {
      kind: "books";
      query: string;
      totalMatches: number;
      books: XiaozhiVoiceBook[];
    }
  | {
      kind: "areas";
      query: string;
      totalMatches: number;
      areas: XiaozhiVoiceArea[];
    };

function isBook(value: unknown): value is XiaozhiVoiceBook {
  return Boolean(
    value &&
    typeof value === "object" &&
    typeof (value as XiaozhiVoiceBook).bookId === "string" &&
    typeof (value as XiaozhiVoiceBook).title === "string" &&
    typeof (value as XiaozhiVoiceBook).availableCopies === "number",
  );
}

function isArea(value: unknown): value is XiaozhiVoiceArea {
  return Boolean(
    value &&
    typeof value === "object" &&
    typeof (value as XiaozhiVoiceArea).name === "string" &&
    typeof (value as XiaozhiVoiceArea).floorNumber === "number",
  );
}

/** Converts an untrusted native bridge event into display-safe card data. */
export function toVoiceToolResult(
  event: XiaozhiNativeEvent,
): VoiceToolResult | null {
  const totalMatches =
    typeof event.totalMatches === "number" && event.totalMatches >= 0
      ? event.totalMatches
      : 0;
  if (event.tool === "search_books") {
    return {
      kind: "books",
      query: typeof event.query === "string" ? event.query : "",
      totalMatches,
      books: Array.isArray(event.books) ? event.books.filter(isBook) : [],
    };
  }
  if (event.tool === "search_areas") {
    return {
      kind: "areas",
      query: typeof event.query === "string" ? event.query : "",
      totalMatches,
      areas: Array.isArray(event.areas) ? event.areas.filter(isArea) : [],
    };
  }
  return null;
}
