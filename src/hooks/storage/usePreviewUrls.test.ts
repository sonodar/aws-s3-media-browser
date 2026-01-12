import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { usePreviewUrls } from "./usePreviewUrls";
import { TestProvider } from "../../stores/testProvider";
import type { StorageItem } from "../../types/storage";

// Mock getUrl from AWS Amplify
vi.mock("aws-amplify/storage", () => ({
  getUrl: vi.fn(),
}));

import { getUrl } from "aws-amplify/storage";

describe("usePreviewUrls", () => {
  const mockGetUrl = vi.mocked(getUrl);

  const sampleItems: StorageItem[] = [
    { key: "media/user123/photo1.jpg", name: "photo1.jpg", type: "file" },
    { key: "media/user123/video1.mp4", name: "video1.mp4", type: "file" },
    { key: "media/user123/photo2.png", name: "photo2.png", type: "file" },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUrl.mockImplementation(({ path }) =>
      Promise.resolve({ url: new URL(`https://s3.example.com/${path}`) }),
    );
  });

  const renderUsePreviewUrls = (items: StorageItem[], enabled = true) => {
    return renderHook(() => usePreviewUrls(items, { enabled }), {
      wrapper: TestProvider,
    });
  };

  describe("URL fetching", () => {
    it("should fetch URLs for all items when enabled", async () => {
      const { result } = renderUsePreviewUrls(sampleItems);

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockGetUrl).toHaveBeenCalledTimes(3);
      expect(mockGetUrl).toHaveBeenCalledWith({ path: "media/user123/photo1.jpg" });
      expect(mockGetUrl).toHaveBeenCalledWith({ path: "media/user123/video1.mp4" });
      expect(mockGetUrl).toHaveBeenCalledWith({ path: "media/user123/photo2.png" });
    });

    it("should not fetch URLs when disabled", async () => {
      const { result } = renderUsePreviewUrls(sampleItems, false);

      // Wait a tick to ensure no calls are made
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(result.current.isLoading).toBe(false);
      expect(result.current.data).toEqual([]);
      expect(mockGetUrl).not.toHaveBeenCalled();
    });

    it("should not fetch URLs when items array is empty", async () => {
      const { result } = renderUsePreviewUrls([]);

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data).toEqual([]);
      expect(mockGetUrl).not.toHaveBeenCalled();
    });
  });

  describe("slide generation", () => {
    it("should generate image slides with src property", async () => {
      const imageItems: StorageItem[] = [
        { key: "media/user123/photo1.jpg", name: "photo1.jpg", type: "file" },
        { key: "media/user123/photo2.png", name: "photo2.png", type: "file" },
      ];

      const { result } = renderUsePreviewUrls(imageItems);

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data).toHaveLength(2);
      expect(result.current.data[0]).toEqual({
        src: "https://s3.example.com/media/user123/photo1.jpg",
      });
      expect(result.current.data[1]).toEqual({
        src: "https://s3.example.com/media/user123/photo2.png",
      });
    });

    it("should generate video slides with video type and sources", async () => {
      const videoItems: StorageItem[] = [
        { key: "media/user123/video1.mp4", name: "video1.mp4", type: "file" },
        { key: "media/user123/video2.webm", name: "video2.webm", type: "file" },
      ];

      const { result } = renderUsePreviewUrls(videoItems);

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data).toHaveLength(2);
      expect(result.current.data[0]).toEqual({
        type: "video",
        width: 1280,
        height: 720,
        sources: [{ src: "https://s3.example.com/media/user123/video1.mp4", type: "video/mp4" }],
      });
      expect(result.current.data[1]).toEqual({
        type: "video",
        width: 1280,
        height: 720,
        sources: [{ src: "https://s3.example.com/media/user123/video2.webm", type: "video/webm" }],
      });
    });

    it("should handle mixed image and video items", async () => {
      const { result } = renderUsePreviewUrls(sampleItems);

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data).toHaveLength(3);
      // First item: image
      expect(result.current.data[0]).toEqual({
        src: "https://s3.example.com/media/user123/photo1.jpg",
      });
      // Second item: video
      expect(result.current.data[1]).toEqual({
        type: "video",
        width: 1280,
        height: 720,
        sources: [{ src: "https://s3.example.com/media/user123/video1.mp4", type: "video/mp4" }],
      });
      // Third item: image
      expect(result.current.data[2]).toEqual({
        src: "https://s3.example.com/media/user123/photo2.png",
      });
    });

    it("should filter out non-previewable items", async () => {
      const mixedItems: StorageItem[] = [
        { key: "media/user123/photo1.jpg", name: "photo1.jpg", type: "file" },
        { key: "media/user123/document.pdf", name: "document.pdf", type: "file" },
        { key: "media/user123/video1.mp4", name: "video1.mp4", type: "file" },
      ];

      const { result } = renderUsePreviewUrls(mixedItems);

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // PDF should be filtered out
      expect(result.current.data).toHaveLength(2);
    });
  });

  describe("loading state", () => {
    it("should show loading state while fetching", async () => {
      // Delay the mock to observe loading state
      mockGetUrl.mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(() => resolve({ url: new URL("https://example.com/test.jpg") }), 50),
          ),
      );

      const { result } = renderUsePreviewUrls(sampleItems);

      expect(result.current.isLoading).toBe(true);
      expect(result.current.data).toEqual([]);

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });
  });

  describe("error handling", () => {
    it("should set isError when URL fetching fails", async () => {
      mockGetUrl.mockRejectedValue(new Error("Failed to get URL"));

      const { result } = renderUsePreviewUrls(sampleItems);

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toBeDefined();
    });
  });

  describe("video MIME types", () => {
    it("should use correct MIME type for mp4", async () => {
      const items: StorageItem[] = [
        { key: "media/user123/video.mp4", name: "video.mp4", type: "file" },
      ];

      const { result } = renderUsePreviewUrls(items);

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data[0]).toMatchObject({
        sources: [{ type: "video/mp4" }],
      });
    });

    it("should use correct MIME type for webm", async () => {
      const items: StorageItem[] = [
        { key: "media/user123/video.webm", name: "video.webm", type: "file" },
      ];

      const { result } = renderUsePreviewUrls(items);

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data[0]).toMatchObject({
        sources: [{ type: "video/webm" }],
      });
    });

    it("should use correct MIME type for mov", async () => {
      const items: StorageItem[] = [
        { key: "media/user123/video.mov", name: "video.mov", type: "file" },
      ];

      const { result } = renderUsePreviewUrls(items);

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data[0]).toMatchObject({
        sources: [{ type: "video/quicktime" }],
      });
    });
  });
});
