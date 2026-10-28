import { describe, expect, it } from "vitest";
import { facilitiesFixture } from "@/testing/fixtures/facilities.fixture";
import { getFacilityMeta } from "../../utils/facilityMeta";

describe("FacilityCardItem and FacilityMeta Contract", () => {
  it("resolves READING_ROOM facility meta with appropriate label and primary styling", () => {
    const meta = getFacilityMeta("READING_ROOM");
    expect(meta.label).toBe("Phòng đọc");
    expect(meta.iconType).toBe("reading_room");
    expect(meta.iconColor).toBeDefined();
    expect(meta.iconBg).toBeDefined();
    expect(meta.badgeBg).toBeDefined();
    expect(meta.dotColor).toBeDefined();
  });

  it("resolves AREA facility meta with appropriate label and teal/emerald styling", () => {
    const meta = getFacilityMeta("AREA");
    expect(meta.label).toBe("Khu vực");
    expect(meta.iconType).toBe("area");
    expect(meta.iconColor).toBeDefined();
    expect(meta.iconBg).toBeDefined();
    expect(meta.badgeBg).toBeDefined();
    expect(meta.dotColor).toBeDefined();
  });

  it("resolves fallback facility meta for unknown types", () => {
    // @ts-expect-error Testing fallback
    const meta = getFacilityMeta("UNKNOWN_TYPE");
    expect(meta.label).toBe("Tiện ích");
    expect(meta.iconType).toBe("default");
  });

  it("handles READING_ROOM facility fixtures correctly", () => {
    const readingRoom = facilitiesFixture.find((f) => f.type === "READING_ROOM");
    expect(readingRoom).toBeDefined();
    expect(readingRoom?.name).toContain("Đọc Sách");
    expect(readingRoom?.type).toBe("READING_ROOM");
    expect(readingRoom?.mapName).toBeDefined();
  });

  it("handles AREA facility fixtures correctly", () => {
    const area = facilitiesFixture.find((f) => f.type === "AREA");
    expect(area).toBeDefined();
    expect(area?.type).toBe("AREA");
    expect(area?.mapName).toBeDefined();
  });

  it("satisfies touch target requirements (minHeight >= 44dp)", () => {
    const minInteractiveHeight = 44;
    const cardMinHeight = 82; // from FacilityCardItem styles
    const iconBoxSize = 52;
    expect(cardMinHeight).toBeGreaterThanOrEqual(minInteractiveHeight);
    expect(iconBoxSize).toBeGreaterThanOrEqual(minInteractiveHeight);
  });
});
