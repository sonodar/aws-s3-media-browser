import { describe, it, expect } from "vitest";
import {
  getFileExtension,
  isImageFile,
  isVideoFile,
  isPreviewable,
  getFileType,
  isImageContentType,
  isVideoContentType,
  getFileCategory,
} from "./fileTypes";

describe("fileTypes", () => {
  describe("getFileExtension", () => {
    it("should return extension for simple filename", () => {
      expect(getFileExtension("photo.jpg")).toBe("jpg");
    });

    it("should return lowercase extension", () => {
      expect(getFileExtension("photo.JPG")).toBe("jpg");
    });

    it("should return last extension for multiple dots", () => {
      expect(getFileExtension("photo.backup.png")).toBe("png");
    });

    it("should return empty string for no extension", () => {
      expect(getFileExtension("README")).toBe("");
    });
  });

  describe("isImageFile", () => {
    it.each(["jpg", "jpeg", "png", "gif", "webp"])("should return true for .%s files", (ext) => {
      expect(isImageFile(`photo.${ext}`)).toBe(true);
    });

    it("should return false for video files", () => {
      expect(isImageFile("video.mp4")).toBe(false);
    });

    it("should return false for other files", () => {
      expect(isImageFile("document.pdf")).toBe(false);
    });
  });

  describe("isVideoFile", () => {
    it.each(["mp4", "webm", "mov"])("should return true for .%s files", (ext) => {
      expect(isVideoFile(`video.${ext}`)).toBe(true);
    });

    it("should return false for image files", () => {
      expect(isVideoFile("photo.jpg")).toBe(false);
    });

    it("should return false for other files", () => {
      expect(isVideoFile("document.pdf")).toBe(false);
    });
  });

  describe("isPreviewable", () => {
    it("should return true for images", () => {
      expect(isPreviewable("photo.jpg")).toBe(true);
    });

    it("should return true for videos", () => {
      expect(isPreviewable("video.mp4")).toBe(true);
    });

    it("should return false for other files", () => {
      expect(isPreviewable("document.pdf")).toBe(false);
    });
  });

  describe("getFileType", () => {
    it('should return "image" for image files', () => {
      expect(getFileType("photo.jpg")).toBe("image");
    });

    it('should return "video" for video files', () => {
      expect(getFileType("video.mp4")).toBe("video");
    });

    it('should return "other" for other files', () => {
      expect(getFileType("document.pdf")).toBe("other");
    });
  });

  describe("isImageContentType", () => {
    it.each(["image/jpeg", "image/png", "image/gif", "image/webp"])(
      "should return true for %s",
      (contentType) => {
        expect(isImageContentType(contentType)).toBe(true);
      },
    );

    it("should return false for video content types", () => {
      expect(isImageContentType("video/mp4")).toBe(false);
    });

    it("should return false for undefined", () => {
      expect(isImageContentType(undefined)).toBe(false);
    });
  });

  describe("isVideoContentType", () => {
    it.each(["video/mp4", "video/webm", "video/quicktime"])(
      "should return true for %s",
      (contentType) => {
        expect(isVideoContentType(contentType)).toBe(true);
      },
    );

    it("should return false for image content types", () => {
      expect(isVideoContentType("image/jpeg")).toBe(false);
    });

    it("should return false for undefined", () => {
      expect(isVideoContentType(undefined)).toBe(false);
    });
  });

  describe("getFileCategory", () => {
    it('should return "folder" for folder items', () => {
      const item = { key: "test/", name: "test", type: "folder" as const };
      expect(getFileCategory(item)).toBe("folder");
    });

    it("should prioritize contentType over extension for images", () => {
      const item = {
        key: "unknown.xyz",
        name: "unknown.xyz",
        type: "file" as const,
        contentType: "image/jpeg",
      };
      expect(getFileCategory(item)).toBe("image");
    });

    it("should prioritize contentType over extension for videos", () => {
      const item = {
        key: "unknown.xyz",
        name: "unknown.xyz",
        type: "file" as const,
        contentType: "video/mp4",
      };
      expect(getFileCategory(item)).toBe("video");
    });

    it("should fallback to extension when contentType is undefined", () => {
      const item = { key: "photo.jpg", name: "photo.jpg", type: "file" as const };
      expect(getFileCategory(item)).toBe("image");
    });

    it("should fallback to extension when contentType is not image/video", () => {
      const item = {
        key: "photo.jpg",
        name: "photo.jpg",
        type: "file" as const,
        contentType: "application/octet-stream",
      };
      expect(getFileCategory(item)).toBe("image");
    });

    it('should return "file" for unknown content types and extensions', () => {
      const item = {
        key: "document.pdf",
        name: "document.pdf",
        type: "file" as const,
        contentType: "application/pdf",
      };
      expect(getFileCategory(item)).toBe("file");
    });
  });
});
