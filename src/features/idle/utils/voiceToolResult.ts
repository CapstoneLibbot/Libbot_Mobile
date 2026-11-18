import type {
  XiaozhiNativeEvent,
  XiaozhiVoiceBook,
  XiaozhiVoiceLocation,
} from "xiaozhi-audio";

export type VoiceToolResult =
  {
    kind: "books";
    query: string;
    totalMatches: number;
    books: XiaozhiVoiceBook[];
  }
  | {
      kind: "locations";
      query: string;
      totalMatches: number;
      locations: XiaozhiVoiceLocation[];
    };

function isBook(value: unknown): value is XiaozhiVoiceBook {
  return Boolean(
    value &&
    typeof value === "object" &&
    typeof (value as XiaozhiVoiceBook).bookId === "string" &&
    typeof (value as XiaozhiVoiceBook).title === "string" &&
    typeof (value as XiaozhiVoiceBook).author === "string" &&
    typeof (value as XiaozhiVoiceBook).canGuide === "boolean",
  );
}

function isLocation(value: unknown): value is XiaozhiVoiceLocation {
  return Boolean(
    value &&
    typeof value === "object" &&
    typeof (value as XiaozhiVoiceLocation).endpointId === "string" &&
    typeof (value as XiaozhiVoiceLocation).name === "string" &&
    typeof (value as XiaozhiVoiceLocation).canGuide === "boolean",
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
  if (event.tool === "search_locations") {
    return {
      kind: "locations",
      query: typeof event.query === "string" ? event.query : "",
      totalMatches,
      locations: Array.isArray(event.locations) ? event.locations.filter(isLocation) : [],
    };
  }
  return null;
}
