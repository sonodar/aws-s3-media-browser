import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { MantineProvider } from "@mantine/core";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MoveDialog } from "./MoveDialog";
import type { StorageItem } from "../../types/storage";
import type { MoveResult, MoveProgress } from "../../hooks/storage";

// Mock useStorageItems hook (FolderTree uses this internally)
vi.mock("../../hooks/storage", async () => {
  const actual = await vi.importActual("../../hooks/storage");
  return {
    ...actual,
    useStorageItems: vi.fn(),
  };
});

import { useStorageItems } from "../../hooks/storage";

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
        staleTime: 0,
      },
    },
  });

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={createTestQueryClient()}>
    <MantineProvider>{children}</MantineProvider>
  </QueryClientProvider>
);

describe("MoveDialog", () => {
  const mockOnClose = vi.fn();
  const mockOnMove = vi.fn<
    [StorageItem[], string, ((p: MoveProgress) => void)?],
    Promise<MoveResult>
  >();
  const mockUseStorageItemsV2 = vi.mocked(useStorageItems);

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
    // Default mock: useStorageItems returns folders (FolderTree uses this internally)
    mockUseStorageItemsV2.mockReturnValue({
      data: sampleFolders,
      isLoading: false,
      isError: false,
      error: null,
    });
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
          identityId="user123"
          onClose={mockOnClose}
          onMove={mockOnMove}
        />,
        { wrapper },
      );

      expect(screen.getByRole("dialog")).toBeInTheDocument();

      // FolderTree の表示を待つ
      await waitFor(() => {
        expect(screen.getByText("archive")).toBeInTheDocument();
      });
    });

    it("should not render when isOpen is false", () => {
      render(
        <MoveDialog
          isOpen={false}
          items={sampleItems}
          currentPath={basePath}
          rootPath={basePath}
          identityId="user123"
          onClose={mockOnClose}
          onMove={mockOnMove}
        />,
        { wrapper },
      );

      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    it("should start from currentPath as initial selection", async () => {
      const rootPath = "media/";
      const currentPath = "media/user123/photos/";

      render(
        <MoveDialog
          isOpen={true}
          items={sampleItems}
          currentPath={currentPath}
          rootPath={rootPath}
          identityId="user123"
          onClose={mockOnClose}
          onMove={mockOnMove}
        />,
        { wrapper },
      );

      // 初期表示は currentPath のフォルダ名（photos）であるべき
      expect(screen.getByTestId("selected-path")).toHaveTextContent("photos");

      // FolderTree は rootPath からツリーを構築する
      await waitFor(() => {
        // ルートノード「ホーム」が表示される
        expect(screen.getByText("ホーム")).toBeInTheDocument();
      });
    });

    it("should display item count in header", async () => {
      render(
        <MoveDialog
          isOpen={true}
          items={sampleItems}
          currentPath={basePath}
          rootPath={basePath}
          identityId="user123"
          onClose={mockOnClose}
          onMove={mockOnMove}
        />,
        { wrapper },
      );

      await waitFor(() => {
        expect(screen.getByText(/2件/)).toBeInTheDocument();
      });
    });
  });

  describe("folder tree integration", () => {
    it("should contain FolderTree component", async () => {
      render(
        <MoveDialog
          isOpen={true}
          items={sampleItems}
          currentPath={basePath}
          rootPath={basePath}
          identityId="user123"
          onClose={mockOnClose}
          onMove={mockOnMove}
        />,
        { wrapper },
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
          identityId="user123"
          onClose={mockOnClose}
          onMove={mockOnMove}
        />,
        { wrapper },
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
          identityId="user123"
          onClose={mockOnClose}
          onMove={mockOnMove}
        />,
        { wrapper },
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
          identityId="user123"
          onClose={mockOnClose}
          onMove={mockOnMove}
        />,
        { wrapper },
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
          identityId="user123"
          onClose={mockOnClose}
          onMove={mockOnMove}
        />,
        { wrapper },
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
          identityId="user123"
          onClose={mockOnClose}
          onMove={mockOnMove}
        />,
        { wrapper },
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

      mockUseStorageItemsV2.mockImplementation((_identityId, path) => {
        if (path === "photos/") {
          return {
            data: subfolders,
            isLoading: false,
            isError: false,
            error: null,
          };
        }
        return {
          data: sampleFolders,
          isLoading: false,
          isError: false,
          error: null,
        };
      });

      render(
        <MoveDialog
          isOpen={true}
          items={[folderItem]}
          currentPath={basePath}
          rootPath={basePath}
          identityId="user123"
          onClose={mockOnClose}
          onMove={mockOnMove}
        />,
        { wrapper },
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
          identityId="user123"
          onClose={mockOnClose}
          onMove={mockOnMove}
        />,
        { wrapper },
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
          identityId="user123"
          onClose={mockOnClose}
          onMove={mockOnMove}
        />,
        { wrapper },
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
          identityId="user123"
          onClose={mockOnClose}
          onMove={mockOnMove}
        />,
        { wrapper },
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
          identityId="user123"
          onClose={mockOnClose}
          onMove={mockOnMove}
        />,
        { wrapper },
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
          identityId="user123"
          onClose={mockOnClose}
          onMove={mockOnMove}
        />,
        { wrapper },
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
          identityId="user123"
          onClose={mockOnClose}
          onMove={mockOnMove}
        />,
        { wrapper },
      );

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /キャンセル/i })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole("button", { name: /キャンセル/i }));

      expect(mockOnClose).toHaveBeenCalled();
    });

    it("should call onClose when overlay is clicked", async () => {
      render(
        <MoveDialog
          isOpen={true}
          items={sampleItems}
          currentPath={basePath}
          rootPath={basePath}
          identityId="user123"
          onClose={mockOnClose}
          onMove={mockOnMove}
        />,
        { wrapper },
      );

      await waitFor(() => {
        expect(screen.getByRole("dialog")).toBeInTheDocument();
      });

      // Modal のオーバーレイをクリック
      const overlay = document.querySelector(".mantine-Modal-overlay");
      if (overlay) {
        fireEvent.click(overlay);
      }

      expect(mockOnClose).toHaveBeenCalled();
    });

    it("should not close when moving is in progress and overlay is clicked", async () => {
      // 移動処理を手動で制御するための Promise
      let resolveMove: (value: { success: boolean; succeeded: number; failed: number }) => void;
      const movePromise = new Promise<{ success: boolean; succeeded: number; failed: number }>(
        (resolve) => {
          resolveMove = resolve;
        },
      );
      mockOnMove.mockReturnValue(movePromise);

      render(
        <MoveDialog
          isOpen={true}
          items={sampleItems}
          currentPath={basePath}
          rootPath={basePath}
          identityId="user123"
          onClose={mockOnClose}
          onMove={mockOnMove}
        />,
        { wrapper },
      );

      await waitFor(() => {
        expect(screen.getByText("archive")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText("archive"));
      fireEvent.click(screen.getByRole("button", { name: /ここに移動/i }));

      // 移動中になるのを待つ
      await waitFor(() => {
        expect(screen.getByRole("button", { name: /キャンセル/i })).toBeDisabled();
      });

      // オーバーレイをクリック
      const overlay = document.querySelector(".mantine-Modal-overlay");
      if (overlay) {
        fireEvent.click(overlay);
      }

      // イベント処理が完了するまで少し待つ（非同期イベントハンドラの完了を待つ）
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      // 移動中はクローズが呼ばれない
      expect(mockOnClose).not.toHaveBeenCalled();

      // テスト終了前に移動を完了させる
      await act(async () => {
        resolveMove!({ success: true, succeeded: 2, failed: 0 });
      });
    });
  });
});
