import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { FolderBrowser } from "./FolderBrowser";
import type { StorageItem } from "../../types/storage";

describe("FolderBrowser", () => {
  const mockOnNavigate = vi.fn();
  const mockListFolders = vi.fn<[string], Promise<StorageItem[]>>();

  const basePath = "media/user123/";
  const sampleFolders: StorageItem[] = [
    { key: `${basePath}photos/`, name: "photos", type: "folder" },
    { key: `${basePath}documents/`, name: "documents", type: "folder" },
    { key: `${basePath}archive/`, name: "archive", type: "folder" },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    mockListFolders.mockResolvedValue(sampleFolders);
  });

  describe("folder list display", () => {
    it("should display folders from listFolders", async () => {
      render(
        <FolderBrowser
          currentPath={basePath}
          listFolders={mockListFolders}
          onNavigate={mockOnNavigate}
          disabledPaths={[]}
        />,
      );

      await waitFor(() => {
        expect(screen.getByText("photos")).toBeInTheDocument();
        expect(screen.getByText("documents")).toBeInTheDocument();
        expect(screen.getByText("archive")).toBeInTheDocument();
      });
    });

    it("should call listFolders with current path", async () => {
      render(
        <FolderBrowser
          currentPath={basePath}
          listFolders={mockListFolders}
          onNavigate={mockOnNavigate}
          disabledPaths={[]}
        />,
      );

      await waitFor(() => {
        expect(mockListFolders).toHaveBeenCalledWith(basePath);
      });
    });

    it("should show loading state while fetching", () => {
      // Create a promise that never resolves
      mockListFolders.mockReturnValue(new Promise(() => {}));

      render(
        <FolderBrowser
          currentPath={basePath}
          listFolders={mockListFolders}
          onNavigate={mockOnNavigate}
          disabledPaths={[]}
        />,
      );

      expect(screen.getByTestId("folder-browser-loading")).toBeInTheDocument();
    });
  });

  describe("folder navigation", () => {
    it("should call onNavigate when folder is clicked", async () => {
      render(
        <FolderBrowser
          currentPath={basePath}
          listFolders={mockListFolders}
          onNavigate={mockOnNavigate}
          disabledPaths={[]}
        />,
      );

      await waitFor(() => {
        expect(screen.getByText("photos")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText("photos"));

      expect(mockOnNavigate).toHaveBeenCalledWith(`${basePath}photos/`);
    });

    it("should call onNavigate with documents folder path", async () => {
      render(
        <FolderBrowser
          currentPath={basePath}
          listFolders={mockListFolders}
          onNavigate={mockOnNavigate}
          disabledPaths={[]}
        />,
      );

      await waitFor(() => {
        expect(screen.getByText("documents")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText("documents"));

      expect(mockOnNavigate).toHaveBeenCalledWith(`${basePath}documents/`);
    });
  });

  describe("disabled paths", () => {
    it("should disable folders in disabledPaths", async () => {
      render(
        <FolderBrowser
          currentPath={basePath}
          listFolders={mockListFolders}
          onNavigate={mockOnNavigate}
          disabledPaths={[`${basePath}photos/`]}
        />,
      );

      await waitFor(() => {
        const photosItem = screen.getByText("photos").closest("[data-disabled]");
        expect(photosItem).toHaveAttribute("data-disabled", "true");
      });
    });

    it("should not call onNavigate when disabled folder is clicked", async () => {
      render(
        <FolderBrowser
          currentPath={basePath}
          listFolders={mockListFolders}
          onNavigate={mockOnNavigate}
          disabledPaths={[`${basePath}photos/`]}
        />,
      );

      await waitFor(() => {
        expect(screen.getByText("photos")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText("photos"));

      expect(mockOnNavigate).not.toHaveBeenCalled();
    });
  });

  describe("navigation controls", () => {
    it("should show parent folder button when not at root", async () => {
      render(
        <FolderBrowser
          currentPath={`${basePath}photos/2024/`}
          listFolders={mockListFolders}
          onNavigate={mockOnNavigate}
          disabledPaths={[]}
          rootPath={basePath}
        />,
      );

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /上へ|parent/i })).toBeInTheDocument();
      });
    });

    it("should navigate to parent folder when parent button is clicked", async () => {
      render(
        <FolderBrowser
          currentPath={`${basePath}photos/2024/`}
          listFolders={mockListFolders}
          onNavigate={mockOnNavigate}
          disabledPaths={[]}
          rootPath={basePath}
        />,
      );

      await waitFor(() => {
        const parentButton = screen.getByRole("button", { name: /上へ|parent/i });
        fireEvent.click(parentButton);
      });

      expect(mockOnNavigate).toHaveBeenCalledWith(`${basePath}photos/`);
    });

    it("should show home button when not at root", async () => {
      render(
        <FolderBrowser
          currentPath={`${basePath}photos/2024/`}
          listFolders={mockListFolders}
          onNavigate={mockOnNavigate}
          disabledPaths={[]}
          rootPath={basePath}
        />,
      );

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /ホーム|home/i })).toBeInTheDocument();
      });
    });

    it("should navigate to home when home button is clicked", async () => {
      render(
        <FolderBrowser
          currentPath={`${basePath}photos/2024/`}
          listFolders={mockListFolders}
          onNavigate={mockOnNavigate}
          disabledPaths={[]}
          rootPath={basePath}
        />,
      );

      await waitFor(() => {
        const homeButton = screen.getByRole("button", { name: /ホーム|home/i });
        fireEvent.click(homeButton);
      });

      expect(mockOnNavigate).toHaveBeenCalledWith(basePath);
    });

    it("should disable navigation buttons when at root", async () => {
      render(
        <FolderBrowser
          currentPath={basePath}
          listFolders={mockListFolders}
          onNavigate={mockOnNavigate}
          disabledPaths={[]}
          rootPath={basePath}
        />,
      );

      await waitFor(() => {
        const parentButton = screen.getByRole("button", { name: /上へ|parent/i });
        const homeButton = screen.getByRole("button", { name: /ホーム|home/i });
        expect(parentButton).toBeDisabled();
        expect(homeButton).toBeDisabled();
      });
    });
  });

  describe("empty state", () => {
    it("should show empty message when no folders exist", async () => {
      mockListFolders.mockResolvedValue([]);

      render(
        <FolderBrowser
          currentPath={basePath}
          listFolders={mockListFolders}
          onNavigate={mockOnNavigate}
          disabledPaths={[]}
        />,
      );

      await waitFor(() => {
        expect(screen.getByText(/フォルダがありません/i)).toBeInTheDocument();
      });
    });
  });
});
