import { describe, it, expect } from "vitest";
import {
  getFileExtension,
  isImageFile,
  isVideoFile,
  isPreviewable,
  getFileType,
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
});
