import { describe, it, expect } from "vitest";
import { validateItemName, validateRename } from "./validateItemName";
import type { StorageItem } from "../types/storage";

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

describe("validateRename", () => {
  // Helper to create mock StorageItem
  const createItem = (name: string, type: "file" | "folder", key?: string): StorageItem => ({
    key: key ?? (type === "folder" ? `path/${name}/` : `path/${name}`),
    name,
    type,
  });

  describe("format validation", () => {
    it("should reject empty string", () => {
      const item = createItem("old.jpg", "file");
      const result = validateRename({ newName: "", item, existingItems: [] });
      expect(result).toEqual({
        valid: false,
        error: "名前を入力してください",
      });
    });

    it("should reject whitespace-only string", () => {
      const item = createItem("old.jpg", "file");
      const result = validateRename({ newName: "   ", item, existingItems: [] });
      expect(result).toEqual({
        valid: false,
        error: "名前を入力してください",
      });
    });

    it("should reject name containing forward slash", () => {
      const item = createItem("old.jpg", "file");
      const result = validateRename({ newName: "foo/bar", item, existingItems: [] });
      expect(result).toEqual({
        valid: false,
        error: "名前にスラッシュは使用できません",
      });
    });

    it("should reject name containing backslash", () => {
      const item = createItem("old.jpg", "file");
      const result = validateRename({ newName: "foo\\bar", item, existingItems: [] });
      expect(result).toEqual({
        valid: false,
        error: "名前にスラッシュは使用できません",
      });
    });

    it("should reject name exceeding 100 characters", () => {
      const item = createItem("old.jpg", "file");
      const longName = "a".repeat(101);
      const result = validateRename({ newName: longName, item, existingItems: [] });
      expect(result).toEqual({
        valid: false,
        error: "名前は100文字以内にしてください",
      });
    });

    it("should accept name with exactly 100 characters", () => {
      const item = createItem("old.jpg", "file");
      const maxName = "a".repeat(100);
      const result = validateRename({ newName: maxName, item, existingItems: [] });
      expect(result.valid).toBe(true);
      expect(result.normalizedName).toBe(maxName);
    });

    it("should reject same name (no change)", () => {
      const item = createItem("old.jpg", "file");
      const result = validateRename({ newName: "old.jpg", item, existingItems: [] });
      expect(result).toEqual({
        valid: false,
        error: "名前が変更されていません",
      });
    });

    it("should reject same name with surrounding whitespace", () => {
      const item = createItem("old.jpg", "file");
      const result = validateRename({ newName: "  old.jpg  ", item, existingItems: [] });
      expect(result).toEqual({
        valid: false,
        error: "名前が変更されていません",
      });
    });

    it("should accept and trim name with surrounding whitespace", () => {
      const item = createItem("old.jpg", "file");
      const result = validateRename({ newName: "  new.jpg  ", item, existingItems: [] });
      expect(result).toEqual({
        valid: true,
        normalizedName: "new.jpg",
      });
    });

    it("should accept extension change", () => {
      const item = createItem("photo.png", "file");
      const result = validateRename({ newName: "photo.jpg", item, existingItems: [] });
      expect(result).toEqual({
        valid: true,
        normalizedName: "photo.jpg",
      });
    });

    it("should accept valid new file name", () => {
      const item = createItem("old.jpg", "file");
      const result = validateRename({ newName: "newname.jpg", item, existingItems: [] });
      expect(result).toEqual({
        valid: true,
        normalizedName: "newname.jpg",
      });
    });

    it("should accept valid new folder name", () => {
      const item = createItem("oldfolder", "folder");
      const result = validateRename({ newName: "newfolder", item, existingItems: [] });
      expect(result).toEqual({
        valid: true,
        normalizedName: "newfolder",
      });
    });
  });

  describe("UI duplicate check", () => {
    it("should reject duplicate file name", () => {
      const item = createItem("old.jpg", "file");
      const existingItems = [createItem("existing.jpg", "file"), createItem("new.jpg", "file")];
      const result = validateRename({ newName: "new.jpg", item, existingItems });
      expect(result).toEqual({
        valid: false,
        error: "同じ名前のファイルが既に存在します",
      });
    });

    it("should reject duplicate folder name", () => {
      const item = createItem("oldfolder", "folder");
      const existingItems = [
        createItem("existingfolder", "folder"),
        createItem("newfolder", "folder"),
      ];
      const result = validateRename({ newName: "newfolder", item, existingItems });
      expect(result).toEqual({
        valid: false,
        error: "同じ名前のフォルダが既に存在します",
      });
    });

    it("should allow same name with different type (file to existing folder name)", () => {
      const item = createItem("old.jpg", "file");
      const existingItems = [createItem("photos", "folder")];
      const result = validateRename({ newName: "photos", item, existingItems });
      expect(result).toEqual({
        valid: true,
        normalizedName: "photos",
      });
    });

    it("should allow same name with different type (folder to existing file name)", () => {
      const item = createItem("oldfolder", "folder");
      const existingItems = [createItem("photo.jpg", "file")];
      const result = validateRename({ newName: "photo.jpg", item, existingItems });
      expect(result).toEqual({
        valid: true,
        normalizedName: "photo.jpg",
      });
    });

    it("should be case-sensitive (Photo.jpg vs photo.jpg)", () => {
      const item = createItem("old.jpg", "file");
      const existingItems = [createItem("photo.jpg", "file")];
      const result = validateRename({ newName: "Photo.jpg", item, existingItems });
      expect(result).toEqual({
        valid: true,
        normalizedName: "Photo.jpg",
      });
    });

    it("should not consider current item as duplicate", () => {
      const item = createItem("current.jpg", "file", "path/current.jpg");
      const existingItems = [
        item, // The item itself is in the list
        createItem("other.jpg", "file"),
      ];
      const result = validateRename({ newName: "new.jpg", item, existingItems });
      expect(result).toEqual({
        valid: true,
        normalizedName: "new.jpg",
      });
    });
  });

  describe("validation priority order", () => {
    it("should check empty before slash", () => {
      const item = createItem("old.jpg", "file");
      // Empty string should be caught before any other check
      const result = validateRename({ newName: "", item, existingItems: [] });
      expect(result.error).toBe("名前を入力してください");
    });

    it("should check slash before length", () => {
      const item = createItem("old.jpg", "file");
      // A string with slash that's also too long
      const longNameWithSlash = "a/".repeat(60); // > 100 chars
      const result = validateRename({ newName: longNameWithSlash, item, existingItems: [] });
      expect(result.error).toBe("名前にスラッシュは使用できません");
    });

    it("should check length before same-name", () => {
      const item = createItem("a".repeat(101), "file");
      // Same as current name but too long
      const result = validateRename({ newName: "a".repeat(101), item, existingItems: [] });
      expect(result.error).toBe("名前は100文字以内にしてください");
    });

    it("should check same-name before duplicate", () => {
      const item = createItem("existing.jpg", "file");
      const existingItems = [createItem("existing.jpg", "file")];
      // Name is same as current (and also would be duplicate)
      const result = validateRename({ newName: "existing.jpg", item, existingItems });
      expect(result.error).toBe("名前が変更されていません");
    });
  });
});
