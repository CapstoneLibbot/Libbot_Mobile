export const typography = {
  title: {
    fontSize: 26,
    fontWeight: '700' as const,
    lineHeight: 32,
  },
  heading: {
    fontSize: 20,
    fontWeight: '700' as const,
    lineHeight: 26,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    lineHeight: 22,
  },
  body: {
    fontSize: 14,
    fontWeight: '400' as const,
    lineHeight: 20,
  },
  caption: {
    fontSize: 12,
    fontWeight: '500' as const,
    lineHeight: 18,
  },
};

export type AppTypography = typeof typography;
