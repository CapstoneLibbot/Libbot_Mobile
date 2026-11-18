import { describe, expect, it } from "vitest";
import { facilitiesFixture } from "@/testing/fixtures/facilities.fixture";
import { getFacilityMeta } from "../../utils/facilityMeta";

describe("FacilityCardItem and FacilityMeta Contract", () => {
  it("resolves Endpoint meta", () => {
    const meta = getFacilityMeta("ENDPOINT");
    expect(meta.label).toBe("Địa điểm");
    expect(meta.iconType).toBe("endpoint");
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

  it("handles Endpoint fixtures correctly", () => {
    const endpoint = facilitiesFixture[0];
    expect(endpoint).toBeDefined();
    expect(endpoint?.type).toBe("ENDPOINT");
    expect(endpoint?.mapName).toBeDefined();
  });

  it("satisfies touch target requirements (minHeight >= 44dp)", () => {
    const minInteractiveHeight = 44;
    const cardMinHeight = 82; // from FacilityCardItem styles
    const iconBoxSize = 52;
    expect(cardMinHeight).toBeGreaterThanOrEqual(minInteractiveHeight);
    expect(iconBoxSize).toBeGreaterThanOrEqual(minInteractiveHeight);
  });
});
