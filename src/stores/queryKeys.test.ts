import { describe, it, expect } from "vitest";
import { queryKeys } from "./queryKeys";

describe("queryKeys", () => {
  describe("identityId", () => {
    it("should return correct queryKey for identityId", () => {
      const key = queryKeys.identityId();
      expect(key).toEqual(["identityId"] as const);
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

  describe("thumbnail", () => {
    it("should return correct queryKey for thumbnail", () => {
      const key = queryKeys.thumbnail("media/user-123/photos/image.jpg");
      expect(key).toEqual(["thumbnail", "media/user-123/photos/image.jpg"] as const);
    });
  });

  describe("type safety (as const)", () => {
    it("queryKeys.identityId() should return readonly tuple", () => {
      const key = queryKeys.identityId();
      // Type assertion to verify readonly tuple
      const _typeCheck: readonly ["identityId"] = key;
      expect(_typeCheck).toBe(key);
    });

    it("queryKeys.storageItems() should return readonly tuple", () => {
      const key = queryKeys.storageItems("id", "path");
      // Type assertion to verify readonly tuple
      const _typeCheck: readonly ["storageItems", string, string] = key;
      expect(_typeCheck).toBe(key);
    });

    it("queryKeys.passkeys() should return readonly tuple", () => {
      const key = queryKeys.passkeys();
      // Type assertion to verify readonly tuple
      const _typeCheck: readonly ["passkeys"] = key;
      expect(_typeCheck).toBe(key);
    });
  });

  describe("invalidateQueries prefix matching", () => {
    it("storageItems queryKey should start with 'storageItems' prefix for invalidation", () => {
      const key = queryKeys.storageItems("user-123", "/photos");
      expect(key[0]).toBe("storageItems");
    });

    it("previewUrls queryKey should start with 'previewUrls' prefix for invalidation", () => {
      const key = queryKeys.previewUrls(["photo.jpg"]);
      expect(key[0]).toBe("previewUrls");
    });
  });
});
