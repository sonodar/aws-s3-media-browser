import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
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

vi.mock("./Thumbnail", () => ({
  Thumbnail: ({
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

import {
  setupMediaBrowserTest,
  MediaBrowserTestWrapper,
  list,
  fetchAuthSession,
} from "./MediaBrowser.test.helpers";

describe("MediaBrowser Display Tests", () => {
  const onSignOut = vi.fn();
  const { setupBeforeEach, cleanupAfterEach } = setupMediaBrowserTest();

  beforeEach(() => {
    setupBeforeEach();
  });

  afterEach(() => {
    cleanupAfterEach();
  });

  describe("1. Initial Display Flow (useIdentityId + useStorageOperations)", () => {
    it("should show loading state while fetching data", () => {
      // Mock fetchAuthSession to never resolve immediately
      vi.mocked(fetchAuthSession).mockImplementation(
        () => new Promise(() => {}), // Never resolves
      );

      render(<MediaBrowser onSignOut={onSignOut} />, {
        wrapper: MediaBrowserTestWrapper,
      });

      expect(screen.getByText("読み込み中...")).toBeInTheDocument();
    });

    it("should display items after loading completes", async () => {
      render(<MediaBrowser onSignOut={onSignOut} />, {
        wrapper: MediaBrowserTestWrapper,
      });

      // Wait for items to actually appear
      await waitFor(() => {
        expect(screen.getByText("folder1")).toBeInTheDocument();
      });

      // Should display folder and files
      expect(screen.getByText("folder1")).toBeInTheDocument();
      expect(screen.getByText("photo1.jpg")).toBeInTheDocument();
      expect(screen.getByText("video1.mp4")).toBeInTheDocument();
    });

    it("should show error state when auth fails", async () => {
      vi.mocked(fetchAuthSession).mockRejectedValue(new Error("Auth failed"));

      render(<MediaBrowser onSignOut={onSignOut} />, {
        wrapper: MediaBrowserTestWrapper,
      });

      await waitFor(() => {
        expect(screen.getByText(/エラーが発生しました/)).toBeInTheDocument();
        expect(screen.getByText(/Auth failed/)).toBeInTheDocument();
      });
    });

    it("should show error state when list fails", async () => {
      vi.mocked(list).mockRejectedValue(new Error("Network error"));

      render(<MediaBrowser onSignOut={onSignOut} />, {
        wrapper: MediaBrowserTestWrapper,
      });

      await waitFor(() => {
        expect(screen.getByText(/エラーが発生しました/)).toBeInTheDocument();
        expect(screen.getByText(/Network error/)).toBeInTheDocument();
      });
    });
  });

  describe("6. Empty State", () => {
    it("should show empty message when no items", async () => {
      // @ts-expect-error - mock data structure differs from actual API type
      vi.mocked(list).mockResolvedValue({
        items: [],
        nextToken: undefined,
      });

      render(<MediaBrowser onSignOut={onSignOut} />, {
        wrapper: MediaBrowserTestWrapper,
      });

      await waitFor(() => {
        expect(screen.getByText("ファイルがありません")).toBeInTheDocument();
      });
    });
  });

  describe("7. Sign Out", () => {
    it("should call onSignOut when sign out menu item is clicked", async () => {
      render(<MediaBrowser onSignOut={onSignOut} />, {
        wrapper: MediaBrowserTestWrapper,
      });

      await waitFor(() => {
        expect(screen.getByText("folder1")).toBeInTheDocument();
      });

      // メニューを開いてサインアウトをクリック
      const menuButton = screen.getByRole("button", { name: "メニューを開く" });
      fireEvent.click(menuButton);

      await waitFor(() => {
        expect(
          screen.getByRole("menuitem", { name: /サインアウト/, hidden: true }),
        ).toBeInTheDocument();
      });
      fireEvent.click(screen.getByRole("menuitem", { name: /サインアウト/, hidden: true }));

      expect(onSignOut).toHaveBeenCalled();
    });
  });
});
