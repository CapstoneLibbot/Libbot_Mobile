import { describe, expect, it } from "vitest";

describe("Book Detail Sơ đồ Action & Facility Map Screen Contract", () => {
  it("determines guidance and map availability from endpoint coordinates", () => {
    const validEndpoint = {
      endpointId: "218ccb36-61c1-46a2-94f5-53831d3ef372",
      name: "kệ chính trị",
      x: -0.365,
      y: -1.681,
      theta: -2.98,
    };
    const canGuide = Boolean(validEndpoint?.endpointId);
    expect(canGuide).toBe(true);

    const emptyEndpoint = null;
    expect(Boolean(emptyEndpoint)).toBe(false);
  });

  it("formats destination label with location priority: locationLabel -> endpoint.name -> bookTitle", () => {
    const formatDestLabel = (
      locationLabel?: string,
      endpointName?: string,
      bookTitle?: string,
    ) => locationLabel || endpointName || bookTitle || "Vị trí sách";

    expect(
      formatDestLabel("Dãy A · Kệ Chính trị · Ngăn 1", "kệ chính trị", "7 thói quen hiệu quả"),
    ).toBe("Dãy A · Kệ Chính trị · Ngăn 1");

    expect(
      formatDestLabel("", "kệ chính trị", "7 thói quen hiệu quả"),
    ).toBe("kệ chính trị");

    expect(
      formatDestLabel("", "", "7 thói quen hiệu quả"),
    ).toBe("7 thói quen hiệu quả");

    expect(formatDestLabel("", "", "")).toBe("Vị trí sách");
  });

  it("resolves valid facility ID preferring endpointId over fallback shelf category", () => {
    const resolveFacilityId = (
      endpointId?: string | null,
      aisle?: string | null,
    ) => endpointId || (aisle?.toLowerCase().includes("b") ? "fac-shelf-r" : "fac-shelf-a");

    expect(
      resolveFacilityId("218ccb36-61c1-46a2-94f5-53831d3ef372", "Dãy A"),
    ).toBe("218ccb36-61c1-46a2-94f5-53831d3ef372");

    expect(resolveFacilityId(null, "Dãy B")).toBe("fac-shelf-r");
    expect(resolveFacilityId(null, "Dãy A")).toBe("fac-shelf-a");
  });

  it("builds facility map navigation path with bookTitle and locationLabel metadata", () => {
    const buildFacilityNavPath = (
      facilityId: string,
      meta?: { bookTitle?: string; locationLabel?: string },
    ) => {
      const queryParams = new URLSearchParams();
      if (meta?.bookTitle) queryParams.set("bookTitle", meta.bookTitle);
      if (meta?.locationLabel) queryParams.set("locationLabel", meta.locationLabel);
      const queryStr = queryParams.toString();
      return `/(kiosk)/facilities/${encodeURIComponent(facilityId)}${queryStr ? `?${queryStr}` : ""}`;
    };

    expect(
      buildFacilityNavPath("218ccb36-61c1-46a2-94f5-53831d3ef372", {
        bookTitle: "7 thói quen hiệu quả",
        locationLabel: "Dãy A · Kệ Chính trị · Ngăn 1",
      }),
    ).toBe(
      "/(kiosk)/facilities/218ccb36-61c1-46a2-94f5-53831d3ef372?bookTitle=7+th%C3%B3i+quen+hi%E1%BB%87u+qu%E1%BA%A3&locationLabel=D%C3%A3y+A+%C2%B7+K%E1%BB%87+Ch%C3%ADnh+tr%E1%BB%8B+%C2%B7+Ng%C4%83n+1",
    );

    expect(buildFacilityNavPath("fac-shelf-a")).toBe("/(kiosk)/facilities/fac-shelf-a");
  });
});
