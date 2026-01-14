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
  mockIdentityId,
  mockRootItems,
  mockFolder1Items,
  list,
} from "./MediaBrowser.test.helpers";

describe("MediaBrowser Navigation Tests", () => {
  const originalLocation = window.location;
  const onSignOut = vi.fn();
  const { setupBeforeEach, cleanupAfterEach } = setupMediaBrowserTest();

  beforeEach(() => {
    setupBeforeEach();
  });

  afterEach(() => {
    cleanupAfterEach();
  });

  describe("2. Navigation Flow (useStoragePath + useStorageOperations)", () => {
    it("should navigate to folder when folder is clicked", async () => {
      // Setup: return different items based on path
      vi.mocked(list).mockImplementation(async (options) => {
        const path = (options as { path: string }).path;
        if (path.includes("folder1")) {
          // @ts-expect-error - mock data structure differs from actual API type
          return { items: mockFolder1Items, nextToken: undefined };
        }
        // @ts-expect-error - mock data structure differs from actual API type
        return { items: mockRootItems, nextToken: undefined };
      });

      render(<MediaBrowser identityId={mockIdentityId} onSignOut={onSignOut} />, {
        wrapper: MediaBrowserTestWrapper,
      });

      await waitFor(() => {
        expect(screen.getByText("folder1")).toBeInTheDocument();
      });

      // Click on folder
      fireEvent.click(screen.getByText("folder1"));

      // Should now show folder1 contents
      await waitFor(() => {
        expect(screen.getByText("nested-photo.jpg")).toBeInTheDocument();
      });

      // URL should be updated
      expect(window.history.pushState).toHaveBeenCalledWith(
        { path: "folder1" },
        "",
        expect.stringContaining("path=folder1"),
      );
    });

    it("should go back when back button is clicked", async () => {
      // Start with folder1 in URL
      vi.stubGlobal("location", {
        ...originalLocation,
        href: "http://localhost/?path=folder1",
        search: "?path=folder1",
      });

      vi.mocked(list).mockImplementation(async (options) => {
        const path = (options as { path: string }).path;
        if (path.includes("folder1")) {
          // @ts-expect-error - mock data structure differs from actual API type
          return { items: mockFolder1Items, nextToken: undefined };
        }
        // @ts-expect-error - mock data structure differs from actual API type
        return { items: mockRootItems, nextToken: undefined };
      });

      render(<MediaBrowser identityId={mockIdentityId} onSignOut={onSignOut} />, {
        wrapper: MediaBrowserTestWrapper,
      });

      await waitFor(() => {
        expect(screen.getByText("nested-photo.jpg")).toBeInTheDocument();
      });

      // Back button should be visible
      const backButton = screen.getByRole("button", { name: /戻る/ });
      expect(backButton).toBeInTheDocument();

      // Click back button
      fireEvent.click(backButton);

      // Should navigate back to root
      await waitFor(() => {
        expect(screen.getByText("folder1")).toBeInTheDocument();
        expect(screen.getByText("photo1.jpg")).toBeInTheDocument();
      });
    });

    it("should hide back button at root path", async () => {
      render(<MediaBrowser identityId={mockIdentityId} onSignOut={onSignOut} />, {
        wrapper: MediaBrowserTestWrapper,
      });

      await waitFor(() => {
        expect(screen.getByText("folder1")).toBeInTheDocument();
      });

      // Back button should not be visible at root
      expect(screen.queryByRole("button", { name: /戻る/ })).not.toBeInTheDocument();
    });

    it("should respond to browser popstate event", async () => {
      vi.mocked(list).mockImplementation(async (options) => {
        const path = (options as { path: string }).path;
        if (path.includes("folder1")) {
          // @ts-expect-error - mock data structure differs from actual API type
          return { items: mockFolder1Items, nextToken: undefined };
        }
        // @ts-expect-error - mock data structure differs from actual API type
        return { items: mockRootItems, nextToken: undefined };
      });

      render(<MediaBrowser identityId={mockIdentityId} onSignOut={onSignOut} />, {
        wrapper: MediaBrowserTestWrapper,
      });

      await waitFor(() => {
        expect(screen.getByText("folder1")).toBeInTheDocument();
      });

      // Navigate to folder
      fireEvent.click(screen.getByText("folder1"));

      await waitFor(() => {
        expect(screen.getByText("nested-photo.jpg")).toBeInTheDocument();
      });

      // Simulate browser back button
      vi.stubGlobal("location", {
        ...originalLocation,
        href: "http://localhost/",
        search: "",
      });

      fireEvent(window, new PopStateEvent("popstate", { state: { path: "" } }));

      await waitFor(() => {
        expect(screen.getByText("photo1.jpg")).toBeInTheDocument();
      });
    });
  });
});
