export const queryKeys = {
  catalog: {
    all: ["catalog"] as const,
    search: (filter?: { query?: string; category?: string }) =>
      ["catalog", "search", filter ?? {}] as const,
    detail: (bookId: string) => ["catalog", "detail", bookId] as const,
  },
  facilities: {
    all: ["facilities"] as const,
    list: (filter?: { query?: string; type?: string; mapId?: string }) => ["facilities", "list", filter ?? {}] as const,
    detail: (facilityId: string) =>
      ["facilities", "detail", facilityId] as const,
  },
  guidance: {
    all: ["guidance"] as const,
    detail: (jobId: string) => ["guidance", "detail", jobId] as const,
  },
  maps: {
    all: ["maps"] as const,
    latest: () => ["maps", "latest"] as const,
    detail: (mapId: string) => ["maps", "detail", mapId] as const,
    endpoints: (mapId: string) => ["maps", "endpoints", mapId] as const,
    zones: (mapId: string) => ["maps", "zones", mapId] as const,
  },
  endpoints: {
    all: ["endpoints"] as const,
    detail: (endpointId: string) => ["endpoints", "detail", endpointId] as const,
  },
  runtimes: {
    all: ["robot-runtimes"] as const,
  },
} as const;
