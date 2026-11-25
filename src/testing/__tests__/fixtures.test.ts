import { describe, expect, it } from "vitest";
import { booksFixture } from "../fixtures/books.fixture";
import { facilitiesFixture } from "../fixtures/facilities.fixture";
import {
  sampleJobAlternativePath,
  sampleJobPrimaryPath,
  sampleJobTemplate,
} from "../fixtures/jobs.fixture";

describe("Testing Fixtures Contract Validation", () => {
  it("validates all booksFixture items have required non-empty fields", () => {
    expect(booksFixture.length).toBeGreaterThan(0);
    for (const book of booksFixture) {
      expect(book.id).toBeDefined();
      expect(book.title.length).toBeGreaterThan(0);
      expect(book.author.length).toBeGreaterThan(0);
      expect(book.shelf.length).toBeGreaterThan(0);
      expect(book.category.length).toBeGreaterThan(0);
      expect(book.description.length).toBeGreaterThan(20);
      if (typeof book.availableCopies === "number") {
        expect(book.totalCopies).toBeGreaterThanOrEqual(book.availableCopies);
      }
    }
  });

  it("validates all facilitiesFixture items have required non-empty fields", () => {
    expect(facilitiesFixture.length).toBeGreaterThan(0);
    for (const fac of facilitiesFixture) {
      expect(fac.id).toBeDefined();
      expect(fac.name.length).toBeGreaterThan(0);
      expect(fac.type.length).toBeGreaterThan(0);
      expect(fac.mapId.length).toBeGreaterThan(0);
      expect(fac.mapName.length).toBeGreaterThan(0);
    }
  });

  it("validates jobsFixture primary and alternative paths have valid robot poses", () => {
    expect(sampleJobPrimaryPath.length).toBeGreaterThan(0);
    for (const pose of sampleJobPrimaryPath) {
      expect(pose.x).toBeGreaterThan(0);
      expect(pose.y).toBeGreaterThan(0);
      expect(typeof pose.yaw).toBe("number");
    }

    expect(sampleJobAlternativePath.length).toBeGreaterThan(0);
    for (const pose of sampleJobAlternativePath) {
      expect(pose.x).toBeGreaterThan(0);
      expect(pose.y).toBeGreaterThan(0);
      expect(typeof pose.yaw).toBe("number");
    }

    expect(sampleJobTemplate.robotId).toBe("LiBot-01");
    expect(sampleJobTemplate.currentPose).toBeDefined();
    expect(sampleJobTemplate.destination).toBeDefined();
  });
});
