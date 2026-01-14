import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useStorageItemsV2 } from "./useStorageItemsV2";
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

describe("useStorageItemsV2", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("initialization", () => {
    it("should not fetch when identityId is null", () => {
      const { result } = renderHook(() => useStorageItemsV2(null, ""), {
        wrapper: TestProvider,
      });

      expect(result.current.data).toEqual([]);
      expect(result.current.isLoading).toBe(false);
      expect(list).not.toHaveBeenCalled();
    });

    it("should start loading when identityId is provided", () => {
      vi.mocked(list).mockImplementation(() => new Promise(() => {}));

      const { result } = renderHook(() => useStorageItemsV2("test-identity-id", ""), {
        wrapper: TestProvider,
      });

      expect(result.current.isLoading).toBe(true);
      expect(result.current.data).toEqual([]);
    });
  });

  describe("subpathStrategy API call", () => {
    it("should call list with subpathStrategy: 'exclude'", async () => {
      vi.mocked(list).mockResolvedValue({
        items: [],
        excludedSubpaths: [],
      });

      renderHook(() => useStorageItemsV2("test-identity-id", ""), {
        wrapper: TestProvider,
      });

      await waitFor(() => {
        expect(list).toHaveBeenCalledWith({
          path: "media/test-identity-id/",
          options: {
            subpathStrategy: { strategy: "exclude" },
          },
        });
      });
    });

    it("should call list with correct basePath for nested path", async () => {
      vi.mocked(list).mockResolvedValue({
        items: [],
        excludedSubpaths: [],
      });

      renderHook(() => useStorageItemsV2("test-identity-id", "photos/vacation"), {
        wrapper: TestProvider,
      });

      await waitFor(() => {
        expect(list).toHaveBeenCalledWith({
          path: "media/test-identity-id/photos/vacation/",
          options: {
            subpathStrategy: { strategy: "exclude" },
          },
        });
      });
    });
  });

  describe("data parsing with excludedSubpaths", () => {
    it("should parse files from items and folders from excludedSubpaths", async () => {
      const basePath = "media/test-identity-id/";
      vi.mocked(list).mockResolvedValue({
        items: [
          { path: `${basePath}photo.jpg`, size: 1024, lastModified: new Date() },
          { path: `${basePath}document.pdf`, size: 2048, lastModified: new Date() },
        ],
        excludedSubpaths: [`${basePath}photos/`, `${basePath}documents/`],
      });

      const { result } = renderHook(() => useStorageItemsV2("test-identity-id", ""), {
        wrapper: TestProvider,
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // 2 files + 2 folders = 4 items
      expect(result.current.data).toHaveLength(4);

      // フォルダが先に来る（ソート順）
      const folders = result.current.data.filter((item) => item.type === "folder");
      const files = result.current.data.filter((item) => item.type === "file");

      expect(folders).toHaveLength(2);
      expect(files).toHaveLength(2);

      // フォルダ名
      expect(folders.map((f) => f.name).sort()).toEqual(["documents", "photos"]);
      // ファイル名
      expect(files.map((f) => f.name).sort()).toEqual(["document.pdf", "photo.jpg"]);
    });

    it("should handle explicit folder in items and merge with excludedSubpaths", async () => {
      const basePath = "media/test-identity-id/";
      vi.mocked(list).mockResolvedValue({
        items: [
          { path: `${basePath}photo.jpg`, size: 1024, lastModified: new Date() },
          // 明示的フォルダ（0バイトオブジェクト）
          { path: `${basePath}photos/`, size: 0, lastModified: new Date() },
        ],
        excludedSubpaths: [
          // 暗黙的フォルダ（同じキー）
          `${basePath}photos/`,
        ],
      });

      const { result } = renderHook(() => useStorageItemsV2("test-identity-id", ""), {
        wrapper: TestProvider,
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // 重複排除: 1 file + 1 folder (重複なし) = 2 items
      expect(result.current.data).toHaveLength(2);

      const folders = result.current.data.filter((item) => item.type === "folder");
      expect(folders).toHaveLength(1);
      expect(folders[0].name).toBe("photos");
    });

    it("should handle empty excludedSubpaths", async () => {
      const basePath = "media/test-identity-id/";
      vi.mocked(list).mockResolvedValue({
        items: [{ path: `${basePath}photo.jpg`, size: 1024, lastModified: new Date() }],
        excludedSubpaths: [],
      });

      const { result } = renderHook(() => useStorageItemsV2("test-identity-id", ""), {
        wrapper: TestProvider,
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data).toHaveLength(1);
      expect(result.current.data[0].type).toBe("file");
    });

    it("should handle empty items with folders in excludedSubpaths", async () => {
      const basePath = "media/test-identity-id/";
      vi.mocked(list).mockResolvedValue({
        items: [],
        excludedSubpaths: [`${basePath}photos/`, `${basePath}documents/`],
      });

      const { result } = renderHook(() => useStorageItemsV2("test-identity-id", ""), {
        wrapper: TestProvider,
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data).toHaveLength(2);
      expect(result.current.data.every((item) => item.type === "folder")).toBe(true);
    });
  });

  describe("error handling", () => {
    it("should set error when list fails", async () => {
      const mockError = new Error("Network error");
      vi.mocked(list).mockRejectedValue(mockError);

      const { result } = renderHook(() => useStorageItemsV2("test-identity-id", ""), {
        wrapper: TestProvider,
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.isError).toBe(true);
      expect(result.current.error).toBe(mockError);
    });
  });

  describe("cache behavior", () => {
    it("should not refetch on rerender within same component (uses cache)", async () => {
      vi.mocked(list).mockResolvedValue({
        items: [],
        excludedSubpaths: [],
      });

      const { result, rerender } = renderHook(() => useStorageItemsV2("test-identity-id", ""), {
        wrapper: TestProvider,
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      rerender();
      rerender();

      // TanStack Query はキャッシュを使うので 1 回のみ fetch
      expect(list).toHaveBeenCalledTimes(1);
    });

    it("should refetch when currentPath changes", async () => {
      vi.mocked(list).mockResolvedValue({
        items: [],
        excludedSubpaths: [],
      });

      const { rerender } = renderHook(({ path }) => useStorageItemsV2("test-identity-id", path), {
        initialProps: { path: "" },
        wrapper: TestProvider,
      });

      await waitFor(() => {
        expect(list).toHaveBeenCalledTimes(1);
      });

      rerender({ path: "subfolder" });

      await waitFor(() => {
        expect(list).toHaveBeenCalledTimes(2);
      });
    });
  });
});
