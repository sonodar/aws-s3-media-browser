import { describe, it, expect } from "vitest";
import { validateItemName } from "./validateItemName";

describe("validateItemName", () => {
  describe("basic validation", () => {
    it("should reject empty string", () => {
      const result = validateItemName("");
      expect(result).toEqual({
        valid: false,
        error: "名前を入力してください",
      });
    });

    it("should reject whitespace-only string", () => {
      const result = validateItemName("   ");
      expect(result).toEqual({
        valid: false,
        error: "名前を入力してください",
      });
    });

    it("should reject name containing forward slash", () => {
      const result = validateItemName("foo/bar");
      expect(result).toEqual({
        valid: false,
        error: "名前にスラッシュは使用できません",
      });
    });

    it("should reject name containing backslash", () => {
      const result = validateItemName("foo\\bar");
      expect(result).toEqual({
        valid: false,
        error: "名前にスラッシュは使用できません",
      });
    });

    it("should reject name exceeding 100 characters", () => {
      const longName = "a".repeat(101);
      const result = validateItemName(longName);
      expect(result).toEqual({
        valid: false,
        error: "名前は100文字以内にしてください",
      });
    });

    it("should accept name with exactly 100 characters", () => {
      const maxName = "a".repeat(100);
      const result = validateItemName(maxName);
      expect(result.valid).toBe(true);
      expect(result.normalizedName).toBe(maxName);
    });

    it("should trim and accept valid name with surrounding whitespace", () => {
      const result = validateItemName("  valid-name.jpg  ");
      expect(result).toEqual({
        valid: true,
        normalizedName: "valid-name.jpg",
      });
    });

    it("should accept valid file name", () => {
      const result = validateItemName("photo.jpg");
      expect(result).toEqual({
        valid: true,
        normalizedName: "photo.jpg",
      });
    });

    it("should accept valid folder name", () => {
      const result = validateItemName("newfolder");
      expect(result).toEqual({
        valid: true,
        normalizedName: "newfolder",
      });
    });
  });

  describe("validation priority order", () => {
    it("should check empty before slash", () => {
      const result = validateItemName("");
      expect(result.error).toBe("名前を入力してください");
    });

    it("should check slash before length", () => {
      const longNameWithSlash = "a/".repeat(60); // > 100 chars
      const result = validateItemName(longNameWithSlash);
      expect(result.error).toBe("名前にスラッシュは使用できません");
    });
  });
});
