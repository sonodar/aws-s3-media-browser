/**
 * storagePathUtils のテスト
 */
import { describe, it, expect } from "vitest";
import {
  normalizePathWithSlash,
  buildMediaBasePath,
  extractRelativePath,
  isFullStoragePath,
  toRelativeStoragePath,
} from "./storagePathUtils";

describe("normalizePathWithSlash", () => {
  it("should return empty string as is", () => {
    expect(normalizePathWithSlash("")).toBe("");
  });

  it("should return path with trailing slash as is", () => {
    expect(normalizePathWithSlash("photos/")).toBe("photos/");
  });

  it("should add trailing slash to path without one", () => {
    expect(normalizePathWithSlash("photos")).toBe("photos/");
  });

  it("should handle nested paths", () => {
    expect(normalizePathWithSlash("photos/2024/summer")).toBe("photos/2024/summer/");
  });
});

describe("buildMediaBasePath", () => {
  it("should build base path without currentPath", () => {
    expect(buildMediaBasePath("user-123")).toBe("media/user-123/");
  });

  it("should build base path with empty currentPath", () => {
    expect(buildMediaBasePath("user-123", "")).toBe("media/user-123/");
  });

  it("should build full path with currentPath", () => {
    expect(buildMediaBasePath("user-123", "photos")).toBe("media/user-123/photos/");
  });

  it("should handle nested currentPath", () => {
    expect(buildMediaBasePath("user-123", "photos/2024")).toBe("media/user-123/photos/2024/");
  });

  it("should handle currentPath with trailing slash", () => {
    expect(buildMediaBasePath("user-123", "photos/")).toBe("media/user-123/photos/");
  });
});

describe("extractRelativePath", () => {
  it("should extract relative path from full path", () => {
    expect(extractRelativePath("media/user-123/photos/", "user-123")).toBe("photos");
  });

  it("should extract nested relative path", () => {
    expect(extractRelativePath("media/user-123/photos/2024/summer/", "user-123")).toBe(
      "photos/2024/summer",
    );
  });

  it("should handle path without trailing slash", () => {
    expect(extractRelativePath("media/user-123/photos", "user-123")).toBe("photos");
  });

  it("should return empty string for root path", () => {
    expect(extractRelativePath("media/user-123/", "user-123")).toBe("");
  });

  it("should return null for invalid prefix", () => {
    expect(extractRelativePath("thumbnails/user-123/photos/", "user-123")).toBeNull();
  });

  it("should return null for mismatched identityId", () => {
    expect(extractRelativePath("media/other-user/photos/", "user-123")).toBeNull();
  });

  it("should be inverse of buildMediaBasePath", () => {
    const identityId = "user-123";
    const relativePath = "photos/2024";
    const fullPath = buildMediaBasePath(identityId, relativePath);
    expect(extractRelativePath(fullPath, identityId)).toBe(relativePath);
  });
});

// toRelativePath のテストは pathUtils.test.ts に移動済み

describe("isFullStoragePath", () => {
  it("should return true for full storage path", () => {
    expect(isFullStoragePath("media/user-123/photos/", "user-123")).toBe(true);
  });

  it("should return true for root full path", () => {
    expect(isFullStoragePath("media/user-123/", "user-123")).toBe(true);
  });

  it("should return false for relative path", () => {
    expect(isFullStoragePath("photos/", "user-123")).toBe(false);
  });

  it("should return false for empty path", () => {
    expect(isFullStoragePath("", "user-123")).toBe(false);
  });

  it("should return false for mismatched identityId", () => {
    expect(isFullStoragePath("media/other-user/photos/", "user-123")).toBe(false);
  });

  it("should return false for different prefix", () => {
    expect(isFullStoragePath("thumbnails/user-123/photos/", "user-123")).toBe(false);
  });
});

describe("toRelativeStoragePath", () => {
  it("should convert full storage path to relative path", () => {
    expect(toRelativeStoragePath("media/user-123/photos/", "user-123")).toBe("photos");
  });

  it("should return relative path as is", () => {
    expect(toRelativeStoragePath("photos/", "user-123")).toBe("photos/");
  });

  it("should return empty string as is", () => {
    expect(toRelativeStoragePath("", "user-123")).toBe("");
  });

  it("should handle nested full path", () => {
    expect(toRelativeStoragePath("media/user-123/photos/2024/summer/", "user-123")).toBe(
      "photos/2024/summer",
    );
  });

  it("should return empty string for root full path", () => {
    expect(toRelativeStoragePath("media/user-123/", "user-123")).toBe("");
  });
});
