export const queryKeys = {
  catalog: {
    all: ['catalog'] as const,
    search: (filter?: { query?: string; category?: string }) =>
      ['catalog', 'search', filter ?? {}] as const,
    detail: (bookId: string) => ['catalog', 'detail', bookId] as const,
  },
  facilities: {
    all: ['facilities'] as const,
    list: () => ['facilities', 'list'] as const,
    detail: (facilityId: string) => ['facilities', 'detail', facilityId] as const,
  },
  guidance: {
    all: ['guidance'] as const,
    detail: (missionId: string) => ['guidance', 'detail', missionId] as const,
  },
} as const;
