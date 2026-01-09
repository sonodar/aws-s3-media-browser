import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { MoveDialog } from "./MoveDialog";
import type { StorageItem } from "../../types/storage";
import type { MoveResult, MoveProgress } from "../../hooks/useStorageOperations";

describe("MoveDialog", () => {
  const mockOnClose = vi.fn();
  const mockOnMove = vi.fn<
    [StorageItem[], string, ((p: MoveProgress) => void)?],
    Promise<MoveResult>
  >();
  const mockListFolders = vi.fn<[string], Promise<StorageItem[]>>();

  const basePath = "media/user123/";
  const sampleItems: StorageItem[] = [
    { key: `${basePath}photo1.jpg`, name: "photo1.jpg", type: "file" },
    { key: `${basePath}photo2.jpg`, name: "photo2.jpg", type: "file" },
  ];

  const sampleFolders: StorageItem[] = [
    { key: `${basePath}archive/`, name: "archive", type: "folder" },
    { key: `${basePath}photos/`, name: "photos", type: "folder" },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    mockListFolders.mockResolvedValue(sampleFolders);
    mockOnMove.mockResolvedValue({
      success: true,
      succeeded: 2,
      failed: 0,
    });
  });

  describe("dialog display", () => {
    it("should render modal dialog when isOpen is true", async () => {
      render(
        <MoveDialog
          isOpen={true}
          items={sampleItems}
          currentPath={basePath}
          rootPath={basePath}
          onClose={mockOnClose}
          onMove={mockOnMove}
          listFolders={mockListFolders}
        />,
      );

      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });

    it("should not render when isOpen is false", () => {
      render(
        <MoveDialog
          isOpen={false}
          items={sampleItems}
          currentPath={basePath}
          rootPath={basePath}
          onClose={mockOnClose}
          onMove={mockOnMove}
          listFolders={mockListFolders}
        />,
      );

      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    it("should start from currentPath, not rootPath", async () => {
      const rootPath = "media/";
      const currentPath = "media/user123/photos/";

      render(
        <MoveDialog
          isOpen={true}
          items={sampleItems}
          currentPath={currentPath}
          rootPath={rootPath}
          onClose={mockOnClose}
          onMove={mockOnMove}
          listFolders={mockListFolders}
        />,
      );

      // 初期表示は currentPath のフォルダ名（photos）であるべき
      expect(screen.getByTestId("selected-path")).toHaveTextContent("photos");
    });

    it("should display item count in header", async () => {
      render(
        <MoveDialog
          isOpen={true}
          items={sampleItems}
          currentPath={basePath}
          rootPath={basePath}
          onClose={mockOnClose}
          onMove={mockOnMove}
          listFolders={mockListFolders}
        />,
      );

      await waitFor(() => {
        expect(screen.getByText(/2件/)).toBeInTheDocument();
      });
    });
  });

  describe("folder browser integration", () => {
    it("should contain FolderBrowser component", async () => {
      render(
        <MoveDialog
          isOpen={true}
          items={sampleItems}
          currentPath={basePath}
          rootPath={basePath}
          onClose={mockOnClose}
          onMove={mockOnMove}
          listFolders={mockListFolders}
        />,
      );

      await waitFor(() => {
        expect(screen.getByText("archive")).toBeInTheDocument();
        expect(screen.getByText("photos")).toBeInTheDocument();
      });
    });

    it("should display selected destination path", async () => {
      render(
        <MoveDialog
          isOpen={true}
          items={sampleItems}
          currentPath={basePath}
          rootPath={basePath}
          onClose={mockOnClose}
          onMove={mockOnMove}
          listFolders={mockListFolders}
        />,
      );

      await waitFor(() => {
        expect(screen.getByText("archive")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText("archive"));

      await waitFor(() => {
        expect(screen.getByTestId("selected-path")).toHaveTextContent("archive");
      });
    });
  });

  describe("move button", () => {
    it("should disable move button when no destination selected", async () => {
      render(
        <MoveDialog
          isOpen={true}
          items={sampleItems}
          currentPath={basePath}
          rootPath={basePath}
          onClose={mockOnClose}
          onMove={mockOnMove}
          listFolders={mockListFolders}
        />,
      );

      await waitFor(() => {
        const moveButton = screen.getByRole("button", { name: /ここに移動/i });
        expect(moveButton).toBeDisabled();
      });
    });

    it("should enable move button when destination is selected", async () => {
      render(
        <MoveDialog
          isOpen={true}
          items={sampleItems}
          currentPath={basePath}
          rootPath={basePath}
          onClose={mockOnClose}
          onMove={mockOnMove}
          listFolders={mockListFolders}
        />,
      );

      await waitFor(() => {
        expect(screen.getByText("archive")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText("archive"));

      await waitFor(() => {
        const moveButton = screen.getByRole("button", { name: /ここに移動/i });
        expect(moveButton).not.toBeDisabled();
      });
    });

    it("should call onMove when move button is clicked", async () => {
      render(
        <MoveDialog
          isOpen={true}
          items={sampleItems}
          currentPath={basePath}
          rootPath={basePath}
          onClose={mockOnClose}
          onMove={mockOnMove}
          listFolders={mockListFolders}
        />,
      );

      await waitFor(() => {
        expect(screen.getByText("archive")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText("archive"));

      await waitFor(() => {
        const moveButton = screen.getByRole("button", { name: /ここに移動/i });
        expect(moveButton).not.toBeDisabled();
      });

      fireEvent.click(screen.getByRole("button", { name: /ここに移動/i }));

      await waitFor(() => {
        expect(mockOnMove).toHaveBeenCalledWith(
          sampleItems,
          `${basePath}archive/`,
          expect.any(Function),
        );
      });
    });
  });

  describe("circular move prevention", () => {
    it("should disable folder that is being moved", async () => {
      const folderItem: StorageItem = {
        key: `${basePath}photos/`,
        name: "photos",
        type: "folder",
      };

      render(
        <MoveDialog
          isOpen={true}
          items={[folderItem]}
          currentPath={basePath}
          rootPath={basePath}
          onClose={mockOnClose}
          onMove={mockOnMove}
          listFolders={mockListFolders}
        />,
      );

      await waitFor(() => {
        expect(screen.getByText("photos")).toBeInTheDocument();
      });

      // 移動対象のフォルダは無効化されている
      const photosItem = screen.getByText("photos").closest("[data-disabled]");
      expect(photosItem).toHaveAttribute("data-disabled", "true");
    });

    it("should show error when navigating into subfolder and selecting source folder", async () => {
      // サブフォルダに入って、そこで移動元フォルダを選択しようとするケース
      const folderItem: StorageItem = {
        key: `${basePath}photos/`,
        name: "photos",
        type: "folder",
      };

      // サブフォルダのモック
      const subfolders: StorageItem[] = [
        { key: `${basePath}photos/2024/`, name: "2024", type: "folder" },
      ];

      mockListFolders.mockImplementation(async (path) => {
        if (path === `${basePath}photos/`) {
          return subfolders;
        }
        return sampleFolders;
      });

      render(
        <MoveDialog
          isOpen={true}
          items={[folderItem]}
          currentPath={basePath}
          rootPath={basePath}
          onClose={mockOnClose}
          onMove={mockOnMove}
          listFolders={mockListFolders}
        />,
      );

      await waitFor(() => {
        expect(screen.getByText("archive")).toBeInTheDocument();
      });

      // archive フォルダを選択（循環ではない）
      fireEvent.click(screen.getByText("archive"));

      await waitFor(() => {
        expect(screen.getByTestId("selected-path")).toHaveTextContent("archive");
      });

      // エラーは表示されない
      expect(screen.queryByText(/移動元のフォルダ配下には移動できません/)).not.toBeInTheDocument();
    });
  });

  describe("duplicate file handling", () => {
    it("should show error when duplicate file exists", async () => {
      mockOnMove.mockResolvedValue({
        success: false,
        succeeded: 0,
        failed: 2,
        duplicates: ["photo1.jpg", "photo2.jpg"],
        error: "移動先に同名のファイルが存在します",
      });

      render(
        <MoveDialog
          isOpen={true}
          items={sampleItems}
          currentPath={basePath}
          rootPath={basePath}
          onClose={mockOnClose}
          onMove={mockOnMove}
          listFolders={mockListFolders}
        />,
      );

      await waitFor(() => {
        expect(screen.getByText("archive")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText("archive"));
      fireEvent.click(screen.getByRole("button", { name: /ここに移動/i }));

      await waitFor(() => {
        expect(screen.getByText(/同名のファイルが存在します/)).toBeInTheDocument();
      });
    });
  });

  describe("progress display", () => {
    it("should show progress indicator during move", async () => {
      let progressCallback: ((p: MoveProgress) => void) | undefined;

      mockOnMove.mockImplementation(async (_items, _dest, onProgress) => {
        progressCallback = onProgress;
        // Simulate slow operation
        await new Promise((resolve) => setTimeout(resolve, 100));
        return { success: true, succeeded: 2, failed: 0 };
      });

      render(
        <MoveDialog
          isOpen={true}
          items={sampleItems}
          currentPath={basePath}
          rootPath={basePath}
          onClose={mockOnClose}
          onMove={mockOnMove}
          listFolders={mockListFolders}
        />,
      );

      await waitFor(() => {
        expect(screen.getByText("archive")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText("archive"));
      fireEvent.click(screen.getByRole("button", { name: /ここに移動/i }));

      // Progress callback should be captured
      await waitFor(() => {
        expect(progressCallback).toBeDefined();
      });

      // Simulate progress update
      act(() => {
        progressCallback!({ current: 1, total: 2 });
      });

      await waitFor(() => {
        expect(screen.getByText(/1.*\/.*2/)).toBeInTheDocument();
      });
    });

    it("should disable controls during move", async () => {
      mockOnMove.mockImplementation(async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
        return { success: true, succeeded: 2, failed: 0 };
      });

      render(
        <MoveDialog
          isOpen={true}
          items={sampleItems}
          currentPath={basePath}
          rootPath={basePath}
          onClose={mockOnClose}
          onMove={mockOnMove}
          listFolders={mockListFolders}
        />,
      );

      await waitFor(() => {
        expect(screen.getByText("archive")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText("archive"));
      fireEvent.click(screen.getByRole("button", { name: /ここに移動/i }));

      await waitFor(() => {
        const cancelButton = screen.getByRole("button", { name: /キャンセル/i });
        expect(cancelButton).toBeDisabled();
      });
    });
  });

  describe("success handling", () => {
    it("should show success message after move completes", async () => {
      render(
        <MoveDialog
          isOpen={true}
          items={sampleItems}
          currentPath={basePath}
          rootPath={basePath}
          onClose={mockOnClose}
          onMove={mockOnMove}
          listFolders={mockListFolders}
        />,
      );

      await waitFor(() => {
        expect(screen.getByText("archive")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText("archive"));
      fireEvent.click(screen.getByRole("button", { name: /ここに移動/i }));

      await waitFor(() => {
        expect(screen.getByText(/移動が完了しました/)).toBeInTheDocument();
      });
    });
  });

  describe("partial failure handling", () => {
    it("should show failed items list on partial failure", async () => {
      mockOnMove.mockResolvedValue({
        success: false,
        succeeded: 1,
        failed: 1,
        failedItems: ["photo2.jpg"],
        error: "一部のファイルの移動に失敗しました",
      });

      render(
        <MoveDialog
          isOpen={true}
          items={sampleItems}
          currentPath={basePath}
          rootPath={basePath}
          onClose={mockOnClose}
          onMove={mockOnMove}
          listFolders={mockListFolders}
        />,
      );

      await waitFor(() => {
        expect(screen.getByText("archive")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText("archive"));
      fireEvent.click(screen.getByRole("button", { name: /ここに移動/i }));

      await waitFor(() => {
        expect(screen.getByText(/一部のファイルの移動に失敗しました/)).toBeInTheDocument();
        expect(screen.getByText("photo2.jpg")).toBeInTheDocument();
      });
    });
  });

  describe("cancel handling", () => {
    it("should call onClose when cancel button is clicked", async () => {
      render(
        <MoveDialog
          isOpen={true}
          items={sampleItems}
          currentPath={basePath}
          rootPath={basePath}
          onClose={mockOnClose}
          onMove={mockOnMove}
          listFolders={mockListFolders}
        />,
      );

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /キャンセル/i })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole("button", { name: /キャンセル/i }));

      expect(mockOnClose).toHaveBeenCalled();
    });

    it("should call onClose when backdrop is clicked", async () => {
      render(
        <MoveDialog
          isOpen={true}
          items={sampleItems}
          currentPath={basePath}
          rootPath={basePath}
          onClose={mockOnClose}
          onMove={mockOnMove}
          listFolders={mockListFolders}
        />,
      );

      await waitFor(() => {
        expect(screen.getByTestId("dialog-backdrop")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId("dialog-backdrop"));

      expect(mockOnClose).toHaveBeenCalled();
    });
  });
});
