import { describe, expect, it } from "vitest";
import { getBookCoverTheme } from "../../utils/bookCoverTheme";

describe("getBookCoverTheme", () => {
  it("assigns Robotics theme correctly", () => {
    const theme = getBookCoverTheme("Robotics", "Probabilistic Robotics", "Sebastian Thrun");
    expect(theme.bgColor).toBe("#881337");
    expect(theme.tag).toBe("ROBOTICS");
    expect(theme.titleSnippet).toBe("PROBABILISTIC ROBOTICS");
    expect(theme.authorSnippet).toBe("Thrun");
  });

  it("assigns AI theme correctly", () => {
    const theme = getBookCoverTheme("Artificial Intelligence", "Deep Learning", "Ian Goodfellow");
    expect(theme.bgColor).toBe("#4C1D95");
    expect(theme.tag).toBe("AI");
  });

  it("assigns Software Engineering fallback theme correctly", () => {
    const theme = getBookCoverTheme("Software", "Clean Code", "Robert C. Martin");
    expect(theme.bgColor).toBe("#1E3A8A");
    expect(theme.tag).toBe("SOFTWARE");
  });

  it("assigns Data Science theme correctly", () => {
    const theme = getBookCoverTheme("Database Systems", "SQL Fundamentals", "John Smith");
    expect(theme.bgColor).toBe("#064E3B");
    expect(theme.tag).toBe("DATA");
  });
});
