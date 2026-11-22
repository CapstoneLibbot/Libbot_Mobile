export interface BookCoverTheme {
  bgColor: string;
  tagColor: string;
  tag: string;
  shortAbbr: string;
  titleSnippet: string;
  authorSnippet: string;
}

/**
 * Returns distinct cover design colors, abbreviations, and labels based on book category
 */
export function getBookCoverTheme(
  category: string,
  title: string,
  author: string,
): BookCoverTheme {
  const catLower = (category || "").toLowerCase();

  let bgColor = "#1E3A8A"; // Deep Navy
  let tagColor = "#93C5FD";
  let tag = "SOFTWARE";
  let shortAbbr = "SE";

  if (catLower.includes("robot")) {
    bgColor = "#881337"; // Crimson
    tagColor = "#FECDD3";
    tag = "ROBOTICS";
    shortAbbr = "ROB";
  } else if (catLower.includes("data") || catLower.includes("database")) {
    bgColor = "#064E3B"; // Forest
    tagColor = "#A7F3D0";
    tag = "DATA";
    shortAbbr = "DATA";
  } else if (catLower.includes("intelligence") || catLower.includes("ai")) {
    bgColor = "#4C1D95"; // Violet
    tagColor = "#DDD6FE";
    tag = "AI";
    shortAbbr = "AI";
  } else if (catLower.includes("literature") || catLower.includes("văn")) {
    bgColor = "#78350F"; // Amber/Bronze
    tagColor = "#FDE68A";
    tag = "LITERATURE";
    shortAbbr = "LIT";
  }

  // Generate short title snippet dynamically for stylized cover graphic
  const words = title.split(/[\s:-]+/).filter(Boolean);
  const titleSnippet =
    words.length === 0
      ? "BOOK"
      : words.length <= 2
        ? words.join(" ").toUpperCase()
        : `${words[0]} ${words[1]}`.toUpperCase();

  const authorSnippet = author.split(",")[0].trim().split(" ").pop() ?? author;

  return { bgColor, tagColor, tag, shortAbbr, titleSnippet, authorSnippet };
}
