import { describe, expect, it } from "vitest";
import { describeSize, fitsInTmp, TMP_STORAGE_MB } from "./limits";

const MB = 1024 * 1024;

describe("thumbnail limits", () => {
  describe("fitsInTmp", () => {
    it("should accept the sizes that actually occur", () => {
      // The 464MB video in production is what exposed the old 512MB of /tmp
      expect(fitsInTmp(486171255)).toBe(true);
      expect(fitsInTmp(1 * MB)).toBe(true);
    });

    it("should refuse a video that leaves no room for the frame", () => {
      expect(fitsInTmp(TMP_STORAGE_MB * MB)).toBe(false);
      expect(fitsInTmp((TMP_STORAGE_MB - 1) * MB)).toBe(false);
    });

    it("should refuse an unknown or empty size", () => {
      // ContentLength is missing on some responses, and 0 means nothing to read
      expect(fitsInTmp(0)).toBe(false);
    });
  });

  describe("describeSize", () => {
    it("should report the size in MB", () => {
      expect(describeSize(486171255)).toBe("464MB");
    });
  });
});
