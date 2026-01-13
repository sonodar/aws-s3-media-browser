import { describe, it, expect, vi, beforeEach } from "vitest";
import type { ReactNode } from "react";
import { render, screen, waitFor, fireEvent, act } from "@testing-library/react";
import { MantineProvider } from "@mantine/core";
import { ThumbnailImage } from "./ThumbnailImage";

// Mock aws-amplify/storage
const mockGetUrl = vi.fn();
vi.mock("aws-amplify/storage", () => ({
  getUrl: (params: { path: string }) => mockGetUrl(params),
}));

const MantineWrapper = ({ children }: { children: ReactNode }) => (
  <MantineProvider>{children}</MantineProvider>
);

describe("ThumbnailImage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("loading state", () => {
    it("shows skeleton while loading", () => {
      mockGetUrl.mockReturnValue(new Promise(() => {})); // Never resolves

      const { container } = render(
        <ThumbnailImage
          originalKey="media/abc123/photos/image.jpg"
          fileName="image.jpg"
          fileType="image"
        />,
        { wrapper: MantineWrapper },
      );

      // Skeleton with visible attribute should be present during loading
      const skeleton = container.querySelector("[data-visible='true']");
      expect(skeleton).toBeInTheDocument();
    });
  });

  describe("loaded state", () => {
    it("displays thumbnail image when URL is fetched successfully", async () => {
      mockGetUrl.mockResolvedValue({
        url: new URL("https://example.com/thumbnail.jpg"),
      });

      render(
        <ThumbnailImage
          originalKey="media/abc123/photos/image.jpg"
          fileName="image.jpg"
          fileType="image"
        />,
        { wrapper: MantineWrapper },
      );

      await waitFor(() => {
        const img = screen.getByRole("img");
        expect(img).toHaveAttribute("src", "https://example.com/thumbnail.jpg");
      });
    });

    it("uses lazy loading attribute", async () => {
      mockGetUrl.mockResolvedValue({
        url: new URL("https://example.com/thumbnail.jpg"),
      });

      render(
        <ThumbnailImage
          originalKey="media/abc123/photos/image.jpg"
          fileName="image.jpg"
          fileType="image"
        />,
        { wrapper: MantineWrapper },
      );

      await waitFor(() => {
        const img = screen.getByRole("img");
        expect(img).toHaveAttribute("loading", "lazy");
      });
    });

    it("sets alt text to fileName", async () => {
      mockGetUrl.mockResolvedValue({
        url: new URL("https://example.com/thumbnail.jpg"),
      });

      render(
        <ThumbnailImage
          originalKey="media/abc123/photos/image.jpg"
          fileName="image.jpg"
          fileType="image"
        />,
        { wrapper: MantineWrapper },
      );

      await waitFor(() => {
        const img = screen.getByRole("img");
        expect(img).toHaveAttribute("alt", "image.jpg");
      });
    });

    it("converts original path to thumbnail path for getUrl", async () => {
      mockGetUrl.mockResolvedValue({
        url: new URL("https://example.com/thumbnail.jpg"),
      });

      render(
        <ThumbnailImage
          originalKey="media/abc123/photos/image.jpg"
          fileName="image.jpg"
          fileType="image"
        />,
        { wrapper: MantineWrapper },
      );

      await waitFor(() => {
        expect(mockGetUrl).toHaveBeenCalledWith({
          path: "thumbnails/abc123/photos/image.jpg.thumb.jpg",
        });
      });
    });
  });

  describe("error state", () => {
    it("shows image fallback icon on error for image files", async () => {
      mockGetUrl.mockResolvedValue({
        url: new URL("https://example.com/thumbnail.jpg"),
      });

      const { container } = render(
        <ThumbnailImage
          originalKey="media/abc123/photos/image.jpg"
          fileName="image.jpg"
          fileType="image"
        />,
        { wrapper: MantineWrapper },
      );

      // Wait for URL to be set
      await waitFor(() => {
        expect(screen.getByRole("img")).toHaveAttribute("src");
      });

      // Simulate image load error
      fireEvent.error(screen.getByRole("img"));

      const fallbackContainer = container.querySelector(".thumbnail-fallback");
      expect(fallbackContainer).toBeInTheDocument();
      expect(fallbackContainer?.querySelector("svg")).toBeInTheDocument();
    });

    it("shows video fallback icon on error for video files", async () => {
      mockGetUrl.mockResolvedValue({
        url: new URL("https://example.com/thumbnail.jpg"),
      });

      const { container } = render(
        <ThumbnailImage
          originalKey="media/abc123/videos/video.mp4"
          fileName="video.mp4"
          fileType="video"
        />,
        { wrapper: MantineWrapper },
      );

      // Wait for URL to be set
      await waitFor(() => {
        expect(screen.getByRole("img")).toHaveAttribute("src");
      });

      // Simulate image load error
      fireEvent.error(screen.getByRole("img"));

      const fallbackContainer = container.querySelector(".thumbnail-fallback");
      expect(fallbackContainer).toBeInTheDocument();
      expect(fallbackContainer?.querySelector("svg")).toBeInTheDocument();
    });

    it("shows fallback icon when getUrl fails", async () => {
      mockGetUrl.mockRejectedValue(new Error("Network error"));

      const { container } = render(
        <ThumbnailImage
          originalKey="media/abc123/photos/image.jpg"
          fileName="image.jpg"
          fileType="image"
        />,
        { wrapper: MantineWrapper },
      );

      await waitFor(() => {
        const fallbackContainer = container.querySelector(".thumbnail-fallback");
        expect(fallbackContainer).toBeInTheDocument();
        expect(fallbackContainer?.querySelector("svg")).toBeInTheDocument();
      });
    });
  });

  describe("container styling", () => {
    it("has fixed aspect ratio container", async () => {
      mockGetUrl.mockResolvedValue({
        url: new URL("https://example.com/thumbnail.jpg"),
      });

      const { container } = render(
        <ThumbnailImage
          originalKey="media/abc123/photos/image.jpg"
          fileName="image.jpg"
          fileType="image"
        />,
        { wrapper: MantineWrapper },
      );

      const wrapper = container.querySelector(".thumbnail-container");
      expect(wrapper).toBeInTheDocument();

      // 非同期処理完了を待つ
      await waitFor(() => {
        expect(screen.getByRole("img")).toBeInTheDocument();
      });
    });
  });

  describe("initialDelay", () => {
    it("shows fallback icon initially when initialDelay is set", () => {
      vi.useFakeTimers();
      mockGetUrl.mockResolvedValue({
        url: new URL("https://example.com/thumbnail.jpg"),
      });

      const { container } = render(
        <ThumbnailImage
          originalKey="media/abc123/photos/image.jpg"
          fileName="image.jpg"
          fileType="image"
          initialDelay={3000}
        />,
        { wrapper: MantineWrapper },
      );

      // Should show fallback icon initially
      const fallbackContainer = container.querySelector(".thumbnail-fallback");
      expect(fallbackContainer).toBeInTheDocument();
      expect(fallbackContainer?.querySelector("svg")).toBeInTheDocument();
      // getUrl should not be called yet
      expect(mockGetUrl).not.toHaveBeenCalled();

      vi.useRealTimers();
    });

    it("fetches thumbnail after delay expires", async () => {
      vi.useFakeTimers();
      mockGetUrl.mockResolvedValue({
        url: new URL("https://example.com/thumbnail.jpg"),
      });

      const { container } = render(
        <ThumbnailImage
          originalKey="media/abc123/photos/image.jpg"
          fileName="image.jpg"
          fileType="image"
          initialDelay={3000}
        />,
        { wrapper: MantineWrapper },
      );

      // Initially shows fallback
      const fallbackContainer = container.querySelector(".thumbnail-fallback");
      expect(fallbackContainer).toBeInTheDocument();
      expect(fallbackContainer?.querySelector("svg")).toBeInTheDocument();

      // Advance timers using act
      await act(async () => {
        vi.advanceTimersByTime(3000);
      });

      // Let microtasks flush
      await act(async () => {
        await Promise.resolve();
      });

      // Now getUrl should have been called
      expect(mockGetUrl).toHaveBeenCalledWith({
        path: "thumbnails/abc123/photos/image.jpg.thumb.jpg",
      });

      vi.useRealTimers();
    });
  });
});
