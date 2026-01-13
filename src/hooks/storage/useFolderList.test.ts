import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useFolderList } from "./useFolderList";
import { TestProvider } from "../../stores/TestProvider";

// Mock aws-amplify/storage
vi.mock("aws-amplify/storage", () => ({
  list: vi.fn(),
}));

// Mock aws-amplify/auth
vi.mock("aws-amplify/auth", () => ({
  fetchAuthSession: vi.fn(),
}));

import { list } from "aws-amplify/storage";

describe("useFolderList", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("initialization", () => {
    it("should not fetch when identityId is null", () => {
      const { result } = renderHook(() => useFolderList(null, ""), {
        wrapper: TestProvider,
      });

      expect(result.current.data).toEqual([]);
      expect(result.current.isLoading).toBe(false);
      expect(list).not.toHaveBeenCalled();
    });

    it("should not fetch when enabled is false", () => {
      const { result } = renderHook(
        () => useFolderList("test-identity-id", "", { enabled: false }),
        { wrapper: TestProvider },
      );

      expect(result.current.data).toEqual([]);
      expect(result.current.isLoading).toBe(false);
      expect(list).not.toHaveBeenCalled();
    });

    it("should start loading when identityId is provided and enabled", () => {
      vi.mocked(list).mockImplementation(() => new Promise(() => {}));

      const { result } = renderHook(() => useFolderList("test-identity-id", ""), {
        wrapper: TestProvider,
      });

      expect(result.current.isLoading).toBe(true);
      expect(result.current.data).toEqual([]);
    });
  });

  describe("data fetching", () => {
    it("should fetch and return only folders", async () => {
      const basePath = "media/test-identity-id/";
      vi.mocked(list).mockResolvedValue({
        items: [
          { path: `${basePath}photo.jpg`, size: 1024, lastModified: new Date() },
          { path: `${basePath}folder1/`, size: 0, lastModified: new Date() },
          { path: `${basePath}folder2/`, size: 0, lastModified: new Date() },
          { path: `${basePath}video.mp4`, size: 2048, lastModified: new Date() },
        ],
      });

      const { result } = renderHook(() => useFolderList("test-identity-id", ""), {
        wrapper: TestProvider,
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // フォルダのみが返される
      expect(result.current.data).toHaveLength(2);
      expect(result.current.data.every((item) => item.type === "folder")).toBe(true);
      expect(result.current.data[0].name).toBe("folder1");
      expect(result.current.data[1].name).toBe("folder2");
    });

    it("should set error when list fails", async () => {
      const mockError = new Error("Network error");
      vi.mocked(list).mockRejectedValue(mockError);

      const { result } = renderHook(() => useFolderList("test-identity-id", ""), {
        wrapper: TestProvider,
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.isError).toBe(true);
      expect(result.current.error).toBe(mockError);
    });

    it("should return empty array when no folders exist", async () => {
      const basePath = "media/test-identity-id/";
      vi.mocked(list).mockResolvedValue({
        items: [
          { path: `${basePath}photo.jpg`, size: 1024, lastModified: new Date() },
          { path: `${basePath}video.mp4`, size: 2048, lastModified: new Date() },
        ],
      });

      const { result } = renderHook(() => useFolderList("test-identity-id", ""), {
        wrapper: TestProvider,
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data).toEqual([]);
    });
  });

  describe("queryKey dependencies", () => {
    it("should call list with correct basePath for root", async () => {
      vi.mocked(list).mockResolvedValue({ items: [] });

      renderHook(() => useFolderList("test-identity-id", ""), {
        wrapper: TestProvider,
      });

      await waitFor(() => {
        expect(list).toHaveBeenCalledWith({
          path: "media/test-identity-id/",
          options: { listAll: true },
        });
      });
    });

    it("should call list with correct basePath for nested path", async () => {
      vi.mocked(list).mockResolvedValue({ items: [] });

      renderHook(() => useFolderList("test-identity-id", "photos/vacation/"), {
        wrapper: TestProvider,
      });

      await waitFor(() => {
        expect(list).toHaveBeenCalledWith({
          path: "media/test-identity-id/photos/vacation/",
          options: { listAll: true },
        });
      });
    });

    it("should handle full path by extracting relative path", async () => {
      vi.mocked(list).mockResolvedValue({ items: [] });

      // フルパスが渡された場合（MoveDialog や FolderBrowser から渡される）
      renderHook(() => useFolderList("test-identity-id", "media/test-identity-id/photos/"), {
        wrapper: TestProvider,
      });

      await waitFor(() => {
        // フルパスが正しく相対パスに変換され、二重パスにならない
        expect(list).toHaveBeenCalledWith({
          path: "media/test-identity-id/photos/",
          options: { listAll: true },
        });
      });
    });

    it("should handle full path for root", async () => {
      vi.mocked(list).mockResolvedValue({ items: [] });

      // ルートのフルパスが渡された場合
      renderHook(() => useFolderList("test-identity-id", "media/test-identity-id/"), {
        wrapper: TestProvider,
      });

      await waitFor(() => {
        expect(list).toHaveBeenCalledWith({
          path: "media/test-identity-id/",
          options: { listAll: true },
        });
      });
    });

    it("should refetch when path changes", async () => {
      vi.mocked(list).mockResolvedValue({ items: [] });

      const { rerender } = renderHook(({ path }) => useFolderList("test-identity-id", path), {
        initialProps: { path: "" },
        wrapper: TestProvider,
      });

      await waitFor(() => {
        expect(list).toHaveBeenCalledTimes(1);
      });

      rerender({ path: "subfolder/" });

      await waitFor(() => {
        expect(list).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe("enabled option", () => {
    it("should fetch when enabled changes from false to true", async () => {
      vi.mocked(list).mockResolvedValue({ items: [] });

      const { result, rerender } = renderHook(
        ({ enabled }) => useFolderList("test-identity-id", "", { enabled }),
        {
          initialProps: { enabled: false },
          wrapper: TestProvider,
        },
      );

      expect(list).not.toHaveBeenCalled();
      expect(result.current.isLoading).toBe(false);

      rerender({ enabled: true });

      await waitFor(() => {
        expect(list).toHaveBeenCalledTimes(1);
      });
    });
  });
});
