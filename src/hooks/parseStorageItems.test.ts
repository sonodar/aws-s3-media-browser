import { describe, it, expect } from "vitest";
import { parseStorageItems } from "./parseStorageItems";

describe("parseStorageItems", () => {
  const basePath = "media/identity123/";

  it("should return empty array for empty input", () => {
    const result = parseStorageItems([], basePath);
    expect(result).toEqual([]);
  });

  it("should exclude current folder marker", () => {
    const items = [{ path: basePath, size: 0, lastModified: new Date() }];
    const result = parseStorageItems(items, basePath);
    expect(result).toEqual([]);
  });

  it("should parse direct file correctly", () => {
    const items = [
      { path: `${basePath}photo.jpg`, size: 1024, lastModified: new Date("2024-01-15") },
    ];
    const result = parseStorageItems(items, basePath);

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      key: `${basePath}photo.jpg`,
      name: "photo.jpg",
      type: "file",
      size: 1024,
      lastModified: new Date("2024-01-15"),
    });
  });

  it("should detect folder from trailing slash", () => {
    const items = [{ path: `${basePath}subfolder/`, size: 0, lastModified: new Date() }];
    const result = parseStorageItems(items, basePath);

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("subfolder");
    expect(result[0].type).toBe("folder");
  });

  it("should detect folder from nested file", () => {
    const items = [
      { path: `${basePath}subfolder/nested-file.jpg`, size: 512, lastModified: new Date() },
    ];
    const result = parseStorageItems(items, basePath);

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("subfolder");
    expect(result[0].type).toBe("folder");
  });

  it("should deduplicate folders", () => {
    const items = [
      { path: `${basePath}subfolder/file1.jpg`, size: 100, lastModified: new Date() },
      { path: `${basePath}subfolder/file2.jpg`, size: 200, lastModified: new Date() },
      { path: `${basePath}subfolder/file3.jpg`, size: 300, lastModified: new Date() },
    ];
    const result = parseStorageItems(items, basePath);

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("subfolder");
    expect(result[0].type).toBe("folder");
  });

  it("should sort folders before files", () => {
    const items = [
      { path: `${basePath}zebra.jpg`, size: 100, lastModified: new Date() },
      { path: `${basePath}alpha/file.jpg`, size: 200, lastModified: new Date() },
      { path: `${basePath}apple.jpg`, size: 300, lastModified: new Date() },
      { path: `${basePath}beta/`, size: 0, lastModified: new Date() },
    ];
    const result = parseStorageItems(items, basePath);

    expect(result).toHaveLength(4);
    expect(result[0].name).toBe("alpha");
    expect(result[0].type).toBe("folder");
    expect(result[1].name).toBe("beta");
    expect(result[1].type).toBe("folder");
    expect(result[2].name).toBe("apple.jpg");
    expect(result[2].type).toBe("file");
    expect(result[3].name).toBe("zebra.jpg");
    expect(result[3].type).toBe("file");
  });

  it("should sort items alphabetically within same type", () => {
    const items = [
      { path: `${basePath}charlie.jpg`, size: 100, lastModified: new Date() },
      { path: `${basePath}alpha.jpg`, size: 200, lastModified: new Date() },
      { path: `${basePath}bravo.jpg`, size: 300, lastModified: new Date() },
    ];
    const result = parseStorageItems(items, basePath);

    expect(result.map((i) => i.name)).toEqual(["alpha.jpg", "bravo.jpg", "charlie.jpg"]);
  });

  it("should handle nested path correctly", () => {
    const nestedBasePath = "media/identity123/photos/travel/";
    const items = [{ path: `${nestedBasePath}paris.jpg`, size: 1024, lastModified: new Date() }];
    const result = parseStorageItems(items, nestedBasePath);

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("paris.jpg");
    expect(result[0].type).toBe("file");
  });

  it("should handle files with special characters", () => {
    const items = [
      {
        path: `${basePath}写真 (1).jpg`,
        size: 2048,
        lastModified: new Date("2024-06-01"),
      },
    ];
    const result = parseStorageItems(items, basePath);

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("写真 (1).jpg");
    expect(result[0].type).toBe("file");
  });

  it("should handle mixed content correctly", () => {
    const items = [
      { path: basePath, size: 0, lastModified: new Date() }, // current folder marker
      { path: `${basePath}vacation/`, size: 0, lastModified: new Date() },
      { path: `${basePath}vacation/beach.jpg`, size: 100, lastModified: new Date() },
      { path: `${basePath}sunset.jpg`, size: 500, lastModified: new Date() },
      { path: `${basePath}work/project/doc.pdf`, size: 1000, lastModified: new Date() },
    ];
    const result = parseStorageItems(items, basePath);

    expect(result).toHaveLength(3);
    expect(result[0]).toMatchObject({ name: "vacation", type: "folder" });
    expect(result[1]).toMatchObject({ name: "work", type: "folder" });
    expect(result[2]).toMatchObject({ name: "sunset.jpg", type: "file" });
  });
});
