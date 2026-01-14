import { describe, it, expect } from "vitest";
import { queryKeys } from "./queryKeys";

describe("queryKeys", () => {
  describe("identityId", () => {
    it("should return correct queryKey for identityId", () => {
      const key = queryKeys.identityId();
      expect(key).toEqual(["identityId"] as const);
    });
  });

  describe("items", () => {
    it("should return correct queryKey for items with identityId and path", () => {
      const key = queryKeys.items("user-123", "/photos");
      expect(key).toEqual(["items", "user-123", "/photos"] as const);
    });

    it("should return correct queryKey for items with root path", () => {
      const key = queryKeys.items("user-123", "");
      expect(key).toEqual(["items", "user-123", ""] as const);
    });
  });

  describe("folders", () => {
    it("should return correct queryKey for folders with identityId and path", () => {
      const key = queryKeys.folders("user-123", "/photos");
      expect(key).toEqual(["folders", "user-123", "/photos"] as const);
    });

    it("should return correct queryKey for folders with root path", () => {
      const key = queryKeys.folders("user-123", "");
      expect(key).toEqual(["folders", "user-123", ""] as const);
    });
  });

  describe("previewUrls", () => {
    it("should return correct queryKey for previewUrls with item keys", () => {
      const key = queryKeys.previewUrls(["photo1.jpg", "photo2.jpg"]);
      expect(key).toEqual(["previewUrls", "photo1.jpg", "photo2.jpg"] as const);
    });

    it("should return correct queryKey for previewUrls with empty array", () => {
      const key = queryKeys.previewUrls([]);
      expect(key).toEqual(["previewUrls"] as const);
    });

    it("should return correct queryKey for previewUrls with single item", () => {
      const key = queryKeys.previewUrls(["single.jpg"]);
      expect(key).toEqual(["previewUrls", "single.jpg"] as const);
    });
  });

  describe("passkeys", () => {
    it("should return correct queryKey for passkeys", () => {
      const key = queryKeys.passkeys();
      expect(key).toEqual(["passkeys"] as const);
    });
  });

  describe("type safety (as const)", () => {
    it("queryKeys.identityId() should return readonly tuple", () => {
      const key = queryKeys.identityId();
      // Type assertion to verify readonly tuple
      const _typeCheck: readonly ["identityId"] = key;
      expect(_typeCheck).toBe(key);
    });

    it("queryKeys.items() should return readonly tuple", () => {
      const key = queryKeys.items("id", "path");
      // Type assertion to verify readonly tuple
      const _typeCheck: readonly ["items", string, string] = key;
      expect(_typeCheck).toBe(key);
    });

    it("queryKeys.passkeys() should return readonly tuple", () => {
      const key = queryKeys.passkeys();
      // Type assertion to verify readonly tuple
      const _typeCheck: readonly ["passkeys"] = key;
      expect(_typeCheck).toBe(key);
    });
  });

  describe("storageItems", () => {
    it("should return correct queryKey for storageItems with identityId and path", () => {
      const key = queryKeys.storageItems("user-123", "/photos");
      expect(key).toEqual(["storageItems", "user-123", "/photos"] as const);
    });

    it("should return correct queryKey for storageItems with root path", () => {
      const key = queryKeys.storageItems("user-123", "");
      expect(key).toEqual(["storageItems", "user-123", ""] as const);
    });
  });

  describe("invalidateQueries prefix matching", () => {
    it("items queryKey should start with 'items' prefix for invalidation", () => {
      const key = queryKeys.items("user-123", "/photos");
      expect(key[0]).toBe("items");
    });

    it("folders queryKey should start with 'folders' prefix for invalidation", () => {
      const key = queryKeys.folders("user-123", "/photos");
      expect(key[0]).toBe("folders");
    });

    it("previewUrls queryKey should start with 'previewUrls' prefix for invalidation", () => {
      const key = queryKeys.previewUrls(["photo.jpg"]);
      expect(key[0]).toBe("previewUrls");
    });

    it("storageItems queryKey should start with 'storageItems' prefix for invalidation", () => {
      const key = queryKeys.storageItems("user-123", "/photos");
      expect(key[0]).toBe("storageItems");
    });
  });
});
