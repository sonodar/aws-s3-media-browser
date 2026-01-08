import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, fireEvent, within } from "@testing-library/react";
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

import { setupMediaBrowserTest, remove } from "./MediaBrowser.test.helpers";

describe("MediaBrowser Selection Tests", () => {
  const onSignOut = vi.fn();
  const { setupBeforeEach, cleanupAfterEach } = setupMediaBrowserTest();

  beforeEach(() => {
    setupBeforeEach();
  });

  afterEach(() => {
    cleanupAfterEach();
  });

  describe("8. Selection Mode and Batch Delete", () => {
    it("should show selection mode button when items are loaded", async () => {
      render(<MediaBrowser onSignOut={onSignOut} />);

      await waitFor(() => {
        expect(screen.getByText("folder1")).toBeInTheDocument();
      });

      expect(screen.getByRole("button", { name: "選択" })).toBeInTheDocument();
    });

    it("should enter selection mode when selection button is clicked", async () => {
      render(<MediaBrowser onSignOut={onSignOut} />);

      await waitFor(() => {
        expect(screen.getByText("folder1")).toBeInTheDocument();
      });

      const selectionButton = screen.getByRole("button", { name: "選択" });
      fireEvent.click(selectionButton);

      // Should show selection mode UI
      await waitFor(() => {
        expect(screen.getByRole("button", { name: /キャンセル/ })).toBeInTheDocument();
        expect(screen.getByText("0件選択中")).toBeInTheDocument();
      });
    });

    it("should show checkboxes in selection mode", async () => {
      render(<MediaBrowser onSignOut={onSignOut} />);

      await waitFor(() => {
        expect(screen.getByText("folder1")).toBeInTheDocument();
      });

      // Enter selection mode
      fireEvent.click(screen.getByRole("button", { name: "選択" }));

      await waitFor(() => {
        const checkboxes = screen.getAllByRole("checkbox");
        expect(checkboxes.length).toBeGreaterThan(0);
      });
    });

    it("should toggle selection when item is clicked in selection mode", async () => {
      render(<MediaBrowser onSignOut={onSignOut} />);

      await waitFor(() => {
        expect(screen.getByText("folder1")).toBeInTheDocument();
      });

      // Enter selection mode
      fireEvent.click(screen.getByRole("button", { name: "選択" }));

      await waitFor(() => {
        expect(screen.getByText("0件選択中")).toBeInTheDocument();
      });

      // Click on an item to select it
      fireEvent.click(screen.getByText("photo1.jpg"));

      await waitFor(() => {
        expect(screen.getByText("1件選択中")).toBeInTheDocument();
      });
    });

    it("should exit selection mode when cancel is clicked", async () => {
      render(<MediaBrowser onSignOut={onSignOut} />);

      await waitFor(() => {
        expect(screen.getByText("folder1")).toBeInTheDocument();
      });

      // Enter selection mode
      fireEvent.click(screen.getByRole("button", { name: "選択" }));

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /キャンセル/ })).toBeInTheDocument();
      });

      // Cancel selection mode
      fireEvent.click(screen.getByRole("button", { name: /キャンセル/ }));

      await waitFor(() => {
        expect(screen.getByRole("button", { name: "選択" })).toBeInTheDocument();
        expect(screen.queryByRole("button", { name: /キャンセル/ })).not.toBeInTheDocument();
      });
    });

    it("should show delete confirmation dialog when delete is clicked", async () => {
      render(<MediaBrowser onSignOut={onSignOut} />);

      await waitFor(() => {
        expect(screen.getByText("folder1")).toBeInTheDocument();
      });

      // Enter selection mode
      fireEvent.click(screen.getByRole("button", { name: "選択" }));

      await waitFor(() => {
        expect(screen.getByText("0件選択中")).toBeInTheDocument();
      });

      // Select an item
      fireEvent.click(screen.getByText("photo1.jpg"));

      await waitFor(() => {
        expect(screen.getByText("1件選択中")).toBeInTheDocument();
      });

      // Click delete button
      fireEvent.click(screen.getByRole("button", { name: /削除/ }));

      await waitFor(() => {
        expect(screen.getByText("削除の確認")).toBeInTheDocument();
      });
    });

    it("should delete selected items when confirmed", async () => {
      render(<MediaBrowser onSignOut={onSignOut} />);

      await waitFor(() => {
        expect(screen.getByText("folder1")).toBeInTheDocument();
      });

      // Enter selection mode
      fireEvent.click(screen.getByRole("button", { name: "選択" }));

      // Select an item
      fireEvent.click(screen.getByText("photo1.jpg"));

      await waitFor(() => {
        expect(screen.getByText("1件選択中")).toBeInTheDocument();
      });

      // Click delete button
      fireEvent.click(screen.getByRole("button", { name: /削除/ }));

      await waitFor(() => {
        expect(screen.getByText("削除の確認")).toBeInTheDocument();
      });

      // Confirm deletion - get the dialog's delete button (not header's)
      const dialog = screen.getByRole("alertdialog");
      const confirmButton = within(dialog).getByRole("button", { name: /削除/ });
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(remove).toHaveBeenCalled();
      });
    });

    it("should toggle select all", async () => {
      render(<MediaBrowser onSignOut={onSignOut} />);

      await waitFor(() => {
        expect(screen.getByText("folder1")).toBeInTheDocument();
      });

      // Enter selection mode
      fireEvent.click(screen.getByRole("button", { name: "選択" }));

      await waitFor(() => {
        expect(screen.getByText("0件選択中")).toBeInTheDocument();
      });

      // Click select all
      fireEvent.click(screen.getByRole("button", { name: /全選択/ }));

      await waitFor(() => {
        expect(screen.getByText("3件選択中")).toBeInTheDocument();
      });
    });
  });
});
