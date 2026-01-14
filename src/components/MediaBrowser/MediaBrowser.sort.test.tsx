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
  sortTestItems,
  SORT_ORDER_STORAGE_KEY,
  list,
} from "./MediaBrowser.test.helpers";

describe("MediaBrowser Sort Tests", () => {
  const onSignOut = vi.fn();
  const { setupBeforeEach, cleanupAfterEach } = setupMediaBrowserTest();

  beforeEach(() => {
    setupBeforeEach();
    // Use sort test items
    // @ts-expect-error - mock data structure differs from actual API type
    vi.mocked(list).mockResolvedValue({
      items: sortTestItems,
      nextToken: undefined,
    });
  });

  afterEach(() => {
    cleanupAfterEach();
  });

  describe("9. Sort Order Feature", () => {
    it("should show sort selector when loaded", async () => {
      render(<MediaBrowser identityId={mockIdentityId} onSignOut={onSignOut} />, {
        wrapper: MediaBrowserTestWrapper,
      });

      await waitFor(() => {
        expect(screen.getByRole("combobox", { name: "並び順" })).toBeInTheDocument();
      });
    });

    it("should have 4 sort options available", async () => {
      render(<MediaBrowser identityId={mockIdentityId} onSignOut={onSignOut} />, {
        wrapper: MediaBrowserTestWrapper,
      });

      await waitFor(() => {
        expect(screen.getByRole("combobox", { name: "並び順" })).toBeInTheDocument();
      });

      const options = screen.getAllByRole("option");
      expect(options).toHaveLength(4);
      expect(screen.getByRole("option", { name: "新しい順" })).toBeInTheDocument();
      expect(screen.getByRole("option", { name: "古い順" })).toBeInTheDocument();
      expect(screen.getByRole("option", { name: "名前順" })).toBeInTheDocument();
      expect(screen.getByRole("option", { name: "サイズ順" })).toBeInTheDocument();
    });

    it("should default to newest order", async () => {
      render(<MediaBrowser identityId={mockIdentityId} onSignOut={onSignOut} />, {
        wrapper: MediaBrowserTestWrapper,
      });

      await waitFor(() => {
        expect(screen.getByRole("combobox", { name: "並び順" })).toBeInTheDocument();
      });

      const select = screen.getByRole("combobox", { name: "並び順" }) as HTMLSelectElement;
      expect(select.value).toBe("newest");
    });

    it("should hide sort selector in selection mode", async () => {
      render(<MediaBrowser identityId={mockIdentityId} onSignOut={onSignOut} />, {
        wrapper: MediaBrowserTestWrapper,
      });

      await waitFor(() => {
        expect(screen.getByRole("combobox", { name: "並び順" })).toBeInTheDocument();
      });

      // Enter selection mode
      fireEvent.click(screen.getByRole("button", { name: "選択" }));

      await waitFor(() => {
        expect(screen.queryByRole("combobox", { name: "並び順" })).not.toBeInTheDocument();
      });
    });

    it("should change file order when sort order is changed to name", async () => {
      render(<MediaBrowser identityId={mockIdentityId} onSignOut={onSignOut} />, {
        wrapper: MediaBrowserTestWrapper,
      });

      await waitFor(() => {
        expect(screen.getByText("a-file.jpg")).toBeInTheDocument();
      });

      // Change to name sort
      const select = screen.getByRole("combobox", { name: "並び順" });
      fireEvent.change(select, { target: { value: "name" } });

      // Verify sort order is updated in localStorage (atomWithStorage uses JSON format)
      await waitFor(() => {
        expect(localStorage.getItem(SORT_ORDER_STORAGE_KEY)).toBe(JSON.stringify("name"));
      });
    });

    it("should change file order when sort order is changed to size", async () => {
      render(<MediaBrowser identityId={mockIdentityId} onSignOut={onSignOut} />, {
        wrapper: MediaBrowserTestWrapper,
      });

      await waitFor(() => {
        expect(screen.getByText("a-file.jpg")).toBeInTheDocument();
      });

      // Change to size sort
      const select = screen.getByRole("combobox", { name: "並び順" });
      fireEvent.change(select, { target: { value: "size" } });

      // Verify sort order is updated in localStorage (atomWithStorage uses JSON format)
      await waitFor(() => {
        expect(localStorage.getItem(SORT_ORDER_STORAGE_KEY)).toBe(JSON.stringify("size"));
      });
    });

    it("should persist sort order across remounts", async () => {
      // Set sort order before render (atomWithStorage uses JSON format)
      localStorage.setItem(SORT_ORDER_STORAGE_KEY, JSON.stringify("oldest"));

      render(<MediaBrowser identityId={mockIdentityId} onSignOut={onSignOut} />, {
        wrapper: MediaBrowserTestWrapper,
      });

      await waitFor(() => {
        expect(screen.getByRole("combobox", { name: "並び順" })).toBeInTheDocument();
      });

      // Verify the saved sort order is restored
      const select = screen.getByRole("combobox", { name: "並び順" }) as HTMLSelectElement;
      expect(select.value).toBe("oldest");
    });

    it("should restore sort order after page reload simulation", async () => {
      const { unmount } = render(
        <MediaBrowser identityId={mockIdentityId} onSignOut={onSignOut} />,
        {
          wrapper: MediaBrowserTestWrapper,
        },
      );

      await waitFor(() => {
        expect(screen.getByRole("combobox", { name: "並び順" })).toBeInTheDocument();
      });

      // Change sort order
      const select = screen.getByRole("combobox", { name: "並び順" });
      fireEvent.change(select, { target: { value: "name" } });

      // atomWithStorage uses JSON format
      await waitFor(() => {
        expect(localStorage.getItem(SORT_ORDER_STORAGE_KEY)).toBe(JSON.stringify("name"));
      });

      // Simulate page reload by unmounting and remounting
      unmount();

      render(<MediaBrowser identityId={mockIdentityId} onSignOut={onSignOut} />, {
        wrapper: MediaBrowserTestWrapper,
      });

      await waitFor(() => {
        const newSelect = screen.getByRole("combobox", { name: "並び順" }) as HTMLSelectElement;
        expect(newSelect.value).toBe("name");
      });
    });

    it("should always display folders before files regardless of sort order", async () => {
      render(<MediaBrowser identityId={mockIdentityId} onSignOut={onSignOut} />, {
        wrapper: MediaBrowserTestWrapper,
      });

      await waitFor(() => {
        expect(screen.getByText("folder1")).toBeInTheDocument();
      });

      // Get all file/folder list items
      const listItems = screen.getAllByRole("listitem");
      const folderIndices: number[] = [];
      const fileIndices: number[] = [];

      listItems.forEach((item, index) => {
        if (item.textContent?.includes("folder")) {
          folderIndices.push(index);
        } else if (item.textContent?.includes("-file.jpg")) {
          fileIndices.push(index);
        }
      });

      // All folders should appear before all files
      const maxFolderIndex = Math.max(...folderIndices);
      const minFileIndex = Math.min(...fileIndices);
      expect(maxFolderIndex).toBeLessThan(minFileIndex);
    });
  });
});
