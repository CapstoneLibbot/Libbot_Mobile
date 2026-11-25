export const queryKeys = {
  catalog: {
    all: ["catalog"] as const,
    search: (filter?: { query?: string; category?: string }) =>
      ["catalog", "search", filter ?? {}] as const,
    detail: (bookId: string) => ["catalog", "detail", bookId] as const,
  },
  facilities: {
    all: ["facilities"] as const,
    list: (filter?: { query?: string; type?: string }) => ["facilities", "list", filter ?? {}] as const,
    detail: (facilityId: string) =>
      ["facilities", "detail", facilityId] as const,
  },
  guidance: {
    all: ["guidance"] as const,
    detail: (jobId: string) => ["guidance", "detail", jobId] as const,
  },
} as const;
