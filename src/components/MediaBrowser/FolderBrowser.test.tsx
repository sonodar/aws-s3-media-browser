import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { FolderBrowser } from "./FolderBrowser";
import { TestProvider } from "../../stores/TestProvider";
import type { StorageItem } from "../../types/storage";

// Mock useFolderList hook
vi.mock("../../hooks/storage", async () => {
  const actual = await vi.importActual("../../hooks/storage");
  return {
    ...actual,
    useFolderList: vi.fn(),
  };
});

import { useFolderList } from "../../hooks/storage";

describe("FolderBrowser", () => {
  const mockOnNavigate = vi.fn();
  const mockUseFolderList = vi.mocked(useFolderList);

  const basePath = "media/user123/";
  const sampleFolders: StorageItem[] = [
    { key: `${basePath}photos/`, name: "photos", type: "folder" },
    { key: `${basePath}documents/`, name: "documents", type: "folder" },
    { key: `${basePath}archive/`, name: "archive", type: "folder" },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    // Default mock: loaded folders
    mockUseFolderList.mockReturnValue({
      data: sampleFolders,
      isLoading: false,
      isError: false,
      error: null,
    });
  });

  const renderFolderBrowser = (props: Partial<Parameters<typeof FolderBrowser>[0]> = {}) => {
    return render(
      <FolderBrowser
        identityId="user123"
        currentPath={basePath}
        onNavigate={mockOnNavigate}
        disabledPaths={[]}
        {...props}
      />,
      { wrapper: TestProvider },
    );
  };

  describe("folder list display", () => {
    it("should display folders from useFolderList", async () => {
      renderFolderBrowser();

      await waitFor(() => {
        expect(screen.getByText("photos")).toBeInTheDocument();
        expect(screen.getByText("documents")).toBeInTheDocument();
        expect(screen.getByText("archive")).toBeInTheDocument();
      });
    });

    it("should call useFolderList with correct parameters", () => {
      renderFolderBrowser({ currentPath: basePath });

      expect(mockUseFolderList).toHaveBeenCalledWith("user123", basePath, { enabled: true });
    });

    it("should show loading state while fetching", () => {
      mockUseFolderList.mockReturnValue({
        data: [],
        isLoading: true,
        isError: false,
        error: null,
      });

      renderFolderBrowser();

      expect(screen.getByTestId("folder-browser-loading")).toBeInTheDocument();
    });
  });

  describe("folder navigation", () => {
    it("should call onNavigate when folder is clicked", async () => {
      renderFolderBrowser();

      await waitFor(() => {
        expect(screen.getByText("photos")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText("photos"));

      expect(mockOnNavigate).toHaveBeenCalledWith(`${basePath}photos/`);
    });

    it("should call onNavigate with documents folder path", async () => {
      renderFolderBrowser();

      await waitFor(() => {
        expect(screen.getByText("documents")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText("documents"));

      expect(mockOnNavigate).toHaveBeenCalledWith(`${basePath}documents/`);
    });
  });

  describe("disabled paths", () => {
    it("should disable folders in disabledPaths", async () => {
      renderFolderBrowser({ disabledPaths: [`${basePath}photos/`] });

      await waitFor(() => {
        const photosItem = screen.getByText("photos").closest("[data-disabled]");
        expect(photosItem).toHaveAttribute("data-disabled", "true");
      });
    });

    it("should not call onNavigate when disabled folder is clicked", async () => {
      renderFolderBrowser({ disabledPaths: [`${basePath}photos/`] });

      await waitFor(() => {
        expect(screen.getByText("photos")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText("photos"));

      expect(mockOnNavigate).not.toHaveBeenCalled();
    });
  });

  describe("navigation controls", () => {
    it("should show parent folder button when not at root", async () => {
      renderFolderBrowser({
        currentPath: `${basePath}photos/2024/`,
        rootPath: basePath,
      });

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /上へ|parent/i })).toBeInTheDocument();
      });
    });

    it("should navigate to parent folder when parent button is clicked", async () => {
      renderFolderBrowser({
        currentPath: `${basePath}photos/2024/`,
        rootPath: basePath,
      });

      await waitFor(() => {
        const parentButton = screen.getByRole("button", { name: /上へ|parent/i });
        fireEvent.click(parentButton);
      });

      expect(mockOnNavigate).toHaveBeenCalledWith(`${basePath}photos/`);
    });

    it("should show home button when not at root", async () => {
      renderFolderBrowser({
        currentPath: `${basePath}photos/2024/`,
        rootPath: basePath,
      });

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /ホーム|home/i })).toBeInTheDocument();
      });
    });

    it("should navigate to home when home button is clicked", async () => {
      renderFolderBrowser({
        currentPath: `${basePath}photos/2024/`,
        rootPath: basePath,
      });

      await waitFor(() => {
        const homeButton = screen.getByRole("button", { name: /ホーム|home/i });
        fireEvent.click(homeButton);
      });

      expect(mockOnNavigate).toHaveBeenCalledWith(basePath);
    });

    it("should disable navigation buttons when at root", async () => {
      renderFolderBrowser({
        currentPath: basePath,
        rootPath: basePath,
      });

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
      mockUseFolderList.mockReturnValue({
        data: [],
        isLoading: false,
        isError: false,
        error: null,
      });

      renderFolderBrowser();

      await waitFor(() => {
        expect(screen.getByText(/フォルダがありません/i)).toBeInTheDocument();
      });
    });
  });

  describe("enabled option", () => {
    it("should pass enabled option to useFolderList", () => {
      renderFolderBrowser({ enabled: false });

      expect(mockUseFolderList).toHaveBeenCalledWith("user123", basePath, { enabled: false });
    });
  });
});
