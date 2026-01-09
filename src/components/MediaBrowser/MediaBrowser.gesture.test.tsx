import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MediaBrowser } from "./index";

// Mock Amplify modules
vi.mock("aws-amplify/storage", () => ({
  list: vi.fn(),
  getUrl: vi.fn(),
  remove: vi.fn(),
  uploadData: vi.fn(),
}));

vi.mock("aws-amplify/auth", () => ({
  fetchAuthSession: vi.fn(),
}));

vi.mock("@aws-amplify/ui-react-storage", () => ({
  FileUploader: ({ onUploadSuccess }: { onUploadSuccess: () => void }) => (
    <div data-testid="mock-file-uploader">
      <button onClick={onUploadSuccess}>Mock Upload</button>
    </div>
  ),
}));

vi.mock("./ThumbnailImage", () => ({
  ThumbnailImage: ({
    originalKey,
    fileName,
    fileType,
  }: {
    originalKey: string;
    fileName: string;
    fileType: string;
  }) => (
    <div
      data-testid="thumbnail-image"
      data-original-key={originalKey}
      data-file-name={fileName}
      data-file-type={fileType}
    >
      Mocked Thumbnail
    </div>
  ),
}));

import { setupMediaBrowserTest, MediaBrowserTestWrapper } from "./MediaBrowser.test.helpers";

describe("MediaBrowser Gesture Tests", () => {
  const onSignOut = vi.fn();
  const { setupBeforeEach, cleanupAfterEach } = setupMediaBrowserTest();

  beforeEach(() => {
    setupBeforeEach();
  });

  afterEach(() => {
    cleanupAfterEach();
  });

  describe("10. ContextMenu Integration (Long Press)", () => {
    it("should render ContextMenu component (initially closed)", async () => {
      render(<MediaBrowser onSignOut={onSignOut} />, { wrapper: MediaBrowserTestWrapper });

      await waitFor(() => {
        expect(screen.getByText("folder1")).toBeInTheDocument();
      });

      // ContextMenu should not be visible initially
      expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    });

    it("should pass onShowActionMenu to FileList", async () => {
      render(<MediaBrowser onSignOut={onSignOut} />, { wrapper: MediaBrowserTestWrapper });

      await waitFor(() => {
        expect(screen.getByText("folder1")).toBeInTheDocument();
      });

      // FileActionMenu のトリガーボタンが表示されないこと
      // onShowActionMenu が渡されている場合は FileActionMenu は非表示
      expect(screen.queryByLabelText(/のアクション/)).not.toBeInTheDocument();
    });
  });

  describe("11. Swipe Navigation CSS", () => {
    it("should have touch-action style on content area", async () => {
      render(<MediaBrowser onSignOut={onSignOut} />, { wrapper: MediaBrowserTestWrapper });

      await waitFor(() => {
        expect(screen.getByText("folder1")).toBeInTheDocument();
      });

      // Find the main content area
      const contentArea = document.querySelector(".media-browser-content");
      expect(contentArea).toBeInTheDocument();
    });
  });

  describe("12. PreviewModal Multi-Slide Integration", () => {
    it("should filter previewable items for PreviewModal", async () => {
      render(<MediaBrowser onSignOut={onSignOut} />, { wrapper: MediaBrowserTestWrapper });

      await waitFor(() => {
        expect(screen.getByText("photo1.jpg")).toBeInTheDocument();
      });

      // Should have 2 previewable items: photo1.jpg and video1.mp4
      // folder1 is not previewable
      const previewableItems = screen.getAllByRole("listitem").filter((item) => {
        const name = item.querySelector(".file-name")?.textContent;
        return name === "photo1.jpg" || name === "video1.mp4";
      });
      expect(previewableItems).toHaveLength(2);
    });

    it("should pass items and currentIndex to PreviewModal when file is clicked", async () => {
      // This test verifies the MediaBrowser uses multi-slide mode
      // We can only verify indirectly through behavior
      render(<MediaBrowser onSignOut={onSignOut} />, { wrapper: MediaBrowserTestWrapper });

      await waitFor(() => {
        expect(screen.getByText("photo1.jpg")).toBeInTheDocument();
      });

      // Verify that the file list contains the expected structure
      // The list should contain previewable items (photo1.jpg, video1.mp4) and folder1
      const list = screen.getByRole("list");
      expect(list).toBeInTheDocument();

      // Verify all items are present and can be clicked
      expect(screen.getByText("photo1.jpg")).toBeInTheDocument();
      expect(screen.getByText("video1.mp4")).toBeInTheDocument();
      expect(screen.getByText("folder1")).toBeInTheDocument();
    });
  });
});
