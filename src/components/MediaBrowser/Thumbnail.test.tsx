/**
 * Thumbnail コンポーネントのテスト
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { getUrl } from "aws-amplify/storage";
import { TestProvider } from "../../stores/TestProvider";
import { Thumbnail } from "./Thumbnail";

vi.mock("aws-amplify/storage", () => ({
  getUrl: vi.fn(),
}));

describe("Thumbnail", () => {
  const defaultProps = {
    originalKey: "media/abc123/photos/image.jpg",
    fileName: "image.jpg",
    fileType: "image" as const,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("loading state", () => {
    it("should show skeleton while loading", () => {
      // 永続的に pending 状態にする
      vi.mocked(getUrl).mockImplementation(() => new Promise(() => {}));

      render(
        <TestProvider>
          <Thumbnail {...defaultProps} />
        </TestProvider>,
      );

      // Mantine Skeleton は data-visible 属性を持つ
      const skeleton = document.querySelector('[data-visible="true"]');
      expect(skeleton).toBeInTheDocument();
    });
  });

  describe("success state", () => {
    it("should show image when url is fetched successfully", async () => {
      vi.mocked(getUrl).mockResolvedValue({
        url: new URL("https://example.com/thumbnail.jpg"),
        expiresAt: new Date(),
      });

      render(
        <TestProvider>
          <Thumbnail {...defaultProps} />
        </TestProvider>,
      );

      await waitFor(() => {
        const img = screen.getByRole("img", { name: defaultProps.fileName });
        expect(img).toBeInTheDocument();
        expect(img).toHaveAttribute("src", "https://example.com/thumbnail.jpg");
      });
    });
  });

  describe("error state", () => {
    it("should show fallback icon for image when getUrl fails", async () => {
      vi.mocked(getUrl).mockRejectedValue(new Error("Not found"));

      render(
        <TestProvider>
          <Thumbnail {...defaultProps} fileType="image" retry={false} />
        </TestProvider>,
      );

      await waitFor(() => {
        const fallbackContainer = document.querySelector(".thumbnail-fallback");
        expect(fallbackContainer).toBeInTheDocument();
      });
    });

    it("should show fallback icon for video when getUrl fails", async () => {
      vi.mocked(getUrl).mockRejectedValue(new Error("Not found"));

      render(
        <TestProvider>
          <Thumbnail {...defaultProps} fileType="video" retry={false} />
        </TestProvider>,
      );

      await waitFor(() => {
        const fallbackContainer = document.querySelector(".thumbnail-fallback");
        expect(fallbackContainer).toBeInTheDocument();
      });
    });
  });
});
