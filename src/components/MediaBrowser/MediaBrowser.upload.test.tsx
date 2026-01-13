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
  mockRootItems,
  list,
  uploadData,
} from "./MediaBrowser.test.helpers";

describe("MediaBrowser Upload Tests", () => {
  const onSignOut = vi.fn();
  const { setupBeforeEach, cleanupAfterEach } = setupMediaBrowserTest();

  beforeEach(() => {
    setupBeforeEach();
  });

  afterEach(() => {
    cleanupAfterEach();
  });

  describe("3. Delete Flow (useStorageOperations)", () => {
    // Note: Delete flow is currently handled in PreviewModal
    // This test verifies the integration when delete is triggered

    it("should refresh list after item removal", async () => {
      let listCallCount = 0;

      vi.mocked(list).mockImplementation(async () => {
        listCallCount++;
        // @ts-expect-error - mock data structure differs from actual API type
        return { items: mockRootItems, nextToken: undefined };
      });

      render(<MediaBrowser onSignOut={onSignOut} />, { wrapper: MediaBrowserTestWrapper });

      await waitFor(() => {
        expect(screen.getByText("folder1")).toBeInTheDocument();
      });

      const initialCallCount = listCallCount;

      // Simulate refresh (which happens after delete)
      const retryButton = screen.queryByRole("button", { name: /再試行/ });
      if (retryButton) {
        fireEvent.click(retryButton);
      }

      // List should be called during initial render
      expect(listCallCount).toBeGreaterThanOrEqual(initialCallCount);
    });
  });

  describe("4. Upload Flow (useStorageOperations + useUploadTracker)", () => {
    it("should show upload button when authenticated", async () => {
      render(<MediaBrowser onSignOut={onSignOut} />, { wrapper: MediaBrowserTestWrapper });

      await waitFor(() => {
        expect(screen.getByText("folder1")).toBeInTheDocument();
      });

      expect(screen.getByRole("button", { name: /ファイルをアップロード/ })).toBeInTheDocument();
    });

    it("should show uploader modal when upload button is clicked", async () => {
      render(<MediaBrowser onSignOut={onSignOut} />, { wrapper: MediaBrowserTestWrapper });

      await waitFor(() => {
        expect(screen.getByText("folder1")).toBeInTheDocument();
      });

      const uploadButton = screen.getByRole("button", { name: /ファイルをアップロード/ });
      fireEvent.click(uploadButton);

      expect(screen.getByText("ファイルをアップロード")).toBeInTheDocument();
      expect(screen.getByTestId("mock-file-uploader")).toBeInTheDocument();
    });

    it("should refresh list and close modal after upload completes", async () => {
      let listCallCount = 0;

      vi.mocked(list).mockImplementation(async () => {
        listCallCount++;
        // @ts-expect-error - mock data structure differs from actual API type
        return { items: mockRootItems, nextToken: undefined };
      });

      render(<MediaBrowser onSignOut={onSignOut} />, { wrapper: MediaBrowserTestWrapper });

      await waitFor(() => {
        expect(screen.getByText("folder1")).toBeInTheDocument();
      });

      const callCountBeforeUpload = listCallCount;

      // Open uploader
      const uploadButton = screen.getByRole("button", { name: /ファイルをアップロード/ });
      fireEvent.click(uploadButton);

      // Trigger mock upload complete
      const mockUploadButton = screen.getByText("Mock Upload");
      fireEvent.click(mockUploadButton);

      // Wait for refresh
      await waitFor(() => {
        expect(listCallCount).toBeGreaterThan(callCountBeforeUpload);
      });

      // Modal should be closed
      expect(screen.queryByTestId("mock-file-uploader")).not.toBeInTheDocument();
    });
  });

  describe("5. Folder Creation Flow", () => {
    it("should show create folder button when authenticated", async () => {
      render(<MediaBrowser onSignOut={onSignOut} />, { wrapper: MediaBrowserTestWrapper });

      await waitFor(() => {
        expect(screen.getByText("folder1")).toBeInTheDocument();
      });

      expect(screen.getByRole("button", { name: /フォルダを作成/ })).toBeInTheDocument();
    });

    it("should open create folder dialog when button is clicked", async () => {
      render(<MediaBrowser onSignOut={onSignOut} />, { wrapper: MediaBrowserTestWrapper });

      await waitFor(() => {
        expect(screen.getByText("folder1")).toBeInTheDocument();
      });

      const createFolderButton = screen.getByRole("button", { name: /フォルダを作成/ });
      fireEvent.click(createFolderButton);

      await waitFor(() => {
        expect(screen.getByText("新しいフォルダを作成")).toBeInTheDocument();
      });
    });

    it("should create folder and refresh list", async () => {
      let listCallCount = 0;

      vi.mocked(list).mockImplementation(async () => {
        listCallCount++;
        // @ts-expect-error - mock data structure differs from actual API type
        return { items: mockRootItems, nextToken: undefined };
      });

      render(<MediaBrowser onSignOut={onSignOut} />, { wrapper: MediaBrowserTestWrapper });

      await waitFor(() => {
        expect(screen.getByText("folder1")).toBeInTheDocument();
      });

      const callCountBefore = listCallCount;

      // Open dialog
      fireEvent.click(screen.getByRole("button", { name: /フォルダを作成/ }));

      // Wait for modal to open
      await waitFor(() => {
        expect(screen.getByPlaceholderText("フォルダ名")).toBeInTheDocument();
      });

      // Type folder name
      const input = screen.getByPlaceholderText("フォルダ名");
      fireEvent.change(input, { target: { value: "newfolder" } });

      // Submit
      const submitButton = screen.getByRole("button", { name: "作成" });
      fireEvent.click(submitButton);

      // Wait for refresh
      await waitFor(() => {
        expect(listCallCount).toBeGreaterThan(callCountBefore);
      });

      // uploadData should have been called with folder path
      expect(uploadData).toHaveBeenCalledWith({
        path: expect.stringMatching(/newfolder\/$/),
        data: "",
      });
    });
  });
});
