import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { MantineProvider } from "@mantine/core";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { FolderTree } from "./FolderTree";
import type { StorageItem } from "../../types/storage";

// Mock useStorageItems hook
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

describe("FolderTree", () => {
  const mockUseStorageItems = vi.mocked(useStorageItems);
  const mockOnSelect = vi.fn();

  const basePath = "media/user123/";
  const sampleFolders: StorageItem[] = [
    { key: `${basePath}photos/`, name: "photos", type: "folder" },
    { key: `${basePath}archive/`, name: "archive", type: "folder" },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseStorageItems.mockReturnValue({
      data: sampleFolders,
      isLoading: false,
      isError: false,
      error: null,
    });
  });

  describe("basic rendering", () => {
    it("should render tree with root node", async () => {
      render(
        <FolderTree
          identityId="user123"
          rootPath=""
          disabledPaths={[]}
          currentPath={basePath}
          onSelect={mockOnSelect}
        />,
        { wrapper },
      );

      // ルートノード（ホーム）が表示される
      await waitFor(() => {
        expect(screen.getByText("ホーム")).toBeInTheDocument();
      });
    });

    it("should render child folders under root", async () => {
      render(
        <FolderTree
          identityId="user123"
          rootPath=""
          disabledPaths={[]}
          currentPath={basePath}
          onSelect={mockOnSelect}
        />,
        { wrapper },
      );

      await waitFor(() => {
        expect(screen.getByText("photos")).toBeInTheDocument();
        expect(screen.getByText("archive")).toBeInTheDocument();
      });
    });
  });

  describe("node selection", () => {
    it("should call onSelect when folder is clicked", async () => {
      render(
        <FolderTree
          identityId="user123"
          rootPath=""
          disabledPaths={[]}
          currentPath={basePath}
          onSelect={mockOnSelect}
        />,
        { wrapper },
      );

      await waitFor(() => {
        expect(screen.getByText("photos")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText("photos"));

      await waitFor(() => {
        expect(mockOnSelect).toHaveBeenCalledWith(`${basePath}photos/`);
      });
    });

    it("should not call onSelect for disabled folders", async () => {
      render(
        <FolderTree
          identityId="user123"
          rootPath=""
          disabledPaths={[`${basePath}photos/`]}
          currentPath={basePath}
          onSelect={mockOnSelect}
        />,
        { wrapper },
      );

      await waitFor(() => {
        expect(screen.getByText("photos")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText("photos"));

      expect(mockOnSelect).not.toHaveBeenCalled();
    });

    it("should allow selecting root node", async () => {
      render(
        <FolderTree
          identityId="user123"
          rootPath=""
          disabledPaths={[]}
          currentPath={basePath}
          onSelect={mockOnSelect}
        />,
        { wrapper },
      );

      await waitFor(() => {
        expect(screen.getByText("ホーム")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText("ホーム"));

      await waitFor(() => {
        expect(mockOnSelect).toHaveBeenCalledWith("");
      });
    });
  });

  describe("disabled nodes", () => {
    it("should visually indicate disabled nodes", async () => {
      render(
        <FolderTree
          identityId="user123"
          rootPath=""
          disabledPaths={[`${basePath}photos/`]}
          currentPath={basePath}
          onSelect={mockOnSelect}
        />,
        { wrapper },
      );

      await waitFor(() => {
        expect(screen.getByText("photos")).toBeInTheDocument();
      });

      // 無効なノードには disabled クラスが付いている
      const photosNode = screen.getByText("photos").closest("[data-disabled]");
      expect(photosNode).toHaveAttribute("data-disabled", "true");
    });

    it("should disable currentPath folder", async () => {
      const currentPath = `${basePath}photos/`;

      render(
        <FolderTree
          identityId="user123"
          rootPath=""
          disabledPaths={[]}
          currentPath={currentPath}
          onSelect={mockOnSelect}
        />,
        { wrapper },
      );

      await waitFor(() => {
        expect(screen.getByText("photos")).toBeInTheDocument();
      });

      // currentPath のノードは無効
      const photosNode = screen.getByText("photos").closest("[data-disabled]");
      expect(photosNode).toHaveAttribute("data-disabled", "true");
    });
  });

  describe("folder icons", () => {
    it("should display folder icons for each node", async () => {
      render(
        <FolderTree
          identityId="user123"
          rootPath=""
          disabledPaths={[]}
          currentPath={basePath}
          onSelect={mockOnSelect}
        />,
        { wrapper },
      );

      await waitFor(() => {
        expect(screen.getByText("photos")).toBeInTheDocument();
      });

      // フォルダアイコンが表示されている（lucide-react の Folder アイコン）
      const folderIcons = document.querySelectorAll(".lucide-folder");
      expect(folderIcons.length).toBeGreaterThan(0);
    });
  });
});
