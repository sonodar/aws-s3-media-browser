import { describe, it, expect } from "vitest";
import { parseExcludedSubpaths, mergeAndDeduplicateFolders } from "./storageItemParser";
import type { StorageItem } from "../../types/storage";

describe("parseExcludedSubpaths", () => {
  const basePath = "media/identity123/";

  it("should return empty array for empty input", () => {
    const result = parseExcludedSubpaths([], basePath);
    expect(result).toEqual([]);
  });

  it("should convert subpath to folder StorageItem", () => {
    const subpaths = [`${basePath}photos/`];
    const result = parseExcludedSubpaths(subpaths, basePath);

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      key: `${basePath}photos/`,
      name: "photos",
      type: "folder",
    });
  });

  it("should convert multiple subpaths to folder StorageItems", () => {
    const subpaths = [`${basePath}photos/`, `${basePath}documents/`, `${basePath}videos/`];
    const result = parseExcludedSubpaths(subpaths, basePath);

    expect(result).toHaveLength(3);
    expect(result.map((item) => item.name)).toEqual(["photos", "documents", "videos"]);
    expect(result.every((item) => item.type === "folder")).toBe(true);
  });

  it("should handle nested basePath correctly", () => {
    const nestedBasePath = "media/identity123/photos/travel/";
    const subpaths = [`${nestedBasePath}japan/`, `${nestedBasePath}france/`];
    const result = parseExcludedSubpaths(subpaths, nestedBasePath);

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({
      key: `${nestedBasePath}japan/`,
      name: "japan",
      type: "folder",
    });
    expect(result[1]).toEqual({
      key: `${nestedBasePath}france/`,
      name: "france",
      type: "folder",
    });
  });

  it("should handle folder names with special characters", () => {
    const subpaths = [`${basePath}写真 フォルダ/`, `${basePath}folder (1)/`];
    const result = parseExcludedSubpaths(subpaths, basePath);

    expect(result).toHaveLength(2);
    expect(result[0].name).toBe("写真 フォルダ");
    expect(result[1].name).toBe("folder (1)");
  });
});

describe("mergeAndDeduplicateFolders", () => {
  it("should return empty array when both inputs are empty", () => {
    const result = mergeAndDeduplicateFolders([], []);
    expect(result).toEqual([]);
  });

  it("should return explicit folders when implicit folders are empty", () => {
    const explicitFolders: StorageItem[] = [
      { key: "media/identity123/photos/", name: "photos", type: "folder" },
    ];
    const result = mergeAndDeduplicateFolders(explicitFolders, []);

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual(explicitFolders[0]);
  });

  it("should return implicit folders when explicit folders are empty", () => {
    const implicitFolders: StorageItem[] = [
      { key: "media/identity123/documents/", name: "documents", type: "folder" },
    ];
    const result = mergeAndDeduplicateFolders([], implicitFolders);

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual(implicitFolders[0]);
  });

  it("should deduplicate folders with same key", () => {
    const explicitFolders: StorageItem[] = [
      { key: "media/identity123/photos/", name: "photos", type: "folder" },
    ];
    const implicitFolders: StorageItem[] = [
      { key: "media/identity123/photos/", name: "photos", type: "folder" },
    ];
    const result = mergeAndDeduplicateFolders(explicitFolders, implicitFolders);

    expect(result).toHaveLength(1);
    expect(result[0].key).toBe("media/identity123/photos/");
  });

  it("should merge unique folders from both arrays", () => {
    const explicitFolders: StorageItem[] = [
      { key: "media/identity123/photos/", name: "photos", type: "folder" },
    ];
    const implicitFolders: StorageItem[] = [
      { key: "media/identity123/documents/", name: "documents", type: "folder" },
    ];
    const result = mergeAndDeduplicateFolders(explicitFolders, implicitFolders);

    expect(result).toHaveLength(2);
    expect(result.map((item) => item.name).sort()).toEqual(["documents", "photos"]);
  });

  it("should handle multiple duplicates correctly", () => {
    const explicitFolders: StorageItem[] = [
      { key: "media/identity123/a/", name: "a", type: "folder" },
      { key: "media/identity123/b/", name: "b", type: "folder" },
      { key: "media/identity123/c/", name: "c", type: "folder" },
    ];
    const implicitFolders: StorageItem[] = [
      { key: "media/identity123/b/", name: "b", type: "folder" },
      { key: "media/identity123/c/", name: "c", type: "folder" },
      { key: "media/identity123/d/", name: "d", type: "folder" },
    ];
    const result = mergeAndDeduplicateFolders(explicitFolders, implicitFolders);

    expect(result).toHaveLength(4);
    expect(result.map((item) => item.name).sort()).toEqual(["a", "b", "c", "d"]);
  });
});
