export const typography = {
  hero: {
    fontFamily: "InterExtraBold",
    fontSize: 34,
    lineHeight: 42,
  },
  title: {
    fontFamily: "InterBold",
    fontSize: 26,
    lineHeight: 34,
  },
  heading: {
    fontFamily: "InterBold",
    fontSize: 20,
    lineHeight: 28,
  },
  subtitle: {
    fontFamily: "InterSemiBold",
    fontSize: 17,
    lineHeight: 24,
  },
  body: {
    fontFamily: "InterRegular",
    fontSize: 15,
    lineHeight: 22,
  },
  caption: {
    fontFamily: "InterMedium",
    fontSize: 13,
    lineHeight: 18,
  },
} as const;

export type AppTypography = typeof typography;
