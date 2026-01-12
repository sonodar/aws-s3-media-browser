import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { useStorageOperations } from "./useStorageOperations";
import { TestProvider } from "../../stores/testProvider";

// Mock aws-amplify/storage
vi.mock("aws-amplify/storage", () => ({
  list: vi.fn(),
  remove: vi.fn(),
  uploadData: vi.fn(),
  getUrl: vi.fn(),
  copy: vi.fn(),
}));

// Mock aws-amplify/auth to prevent interference with other test files
vi.mock("aws-amplify/auth", () => ({
  fetchAuthSession: vi.fn(),
}));

import { list, remove, uploadData, getUrl, copy } from "aws-amplify/storage";

describe("useStorageOperations", () => {
  const identityId = "test-identity-id";
  const currentPath = "";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("initialization", () => {
    it("should start with loading true when identityId is provided", () => {
      vi.mocked(list).mockImplementation(() => new Promise(() => {}));

      const { result } = renderHook(() => useStorageOperations({ identityId, currentPath }), {
        wrapper: TestProvider,
      });

      expect(result.current.loading).toBe(true);
      expect(result.current.items).toEqual([]);
      expect(result.current.error).toBeNull();
    });

    it("should not fetch when identityId is null", () => {
      const { result } = renderHook(() => useStorageOperations({ identityId: null, currentPath }), {
        wrapper: TestProvider,
      });

      expect(result.current.loading).toBe(false);
      expect(result.current.items).toEqual([]);
      expect(list).not.toHaveBeenCalled();
    });
  });

  describe("fetchItems", () => {
    it("should fetch and parse items correctly", async () => {
      const basePath = `media/${identityId}/`;
      vi.mocked(list).mockResolvedValue({
        items: [
          { path: `${basePath}photo.jpg`, size: 1024, lastModified: new Date() },
          { path: `${basePath}folder/`, size: 0, lastModified: new Date() },
        ],
      });

      const { result } = renderHook(() => useStorageOperations({ identityId, currentPath }), {
        wrapper: TestProvider,
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.items).toHaveLength(2);
      expect(result.current.items[0].type).toBe("folder");
      expect(result.current.items[1].type).toBe("file");
    });

    it("should set error on list failure", async () => {
      const mockError = new Error("Network error");
      vi.mocked(list).mockRejectedValue(mockError);

      const { result } = renderHook(() => useStorageOperations({ identityId, currentPath }), {
        wrapper: TestProvider,
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toBe(mockError);
    });

    it("should refetch when currentPath changes", async () => {
      vi.mocked(list).mockResolvedValue({ items: [] });

      const { result, rerender } = renderHook(
        ({ path }) => useStorageOperations({ identityId, currentPath: path }),
        { initialProps: { path: "" }, wrapper: TestProvider },
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(list).toHaveBeenCalledTimes(1);

      rerender({ path: "subfolder" });

      await waitFor(() => {
        expect(list).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe("uploadFiles", () => {
    it("should upload files and return uploaded keys", async () => {
      vi.mocked(list).mockResolvedValue({ items: [] });
      vi.mocked(uploadData).mockResolvedValue({
        path: "test",
        result: Promise.resolve({}),
      } as never);

      const { result } = renderHook(() => useStorageOperations({ identityId, currentPath }), {
        wrapper: TestProvider,
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const file1 = new File(["content1"], "file1.txt", { type: "text/plain" });
      const file2 = new File(["content2"], "file2.txt", { type: "text/plain" });

      let uploadedKeys: string[] = [];
      await act(async () => {
        uploadedKeys = await result.current.uploadFiles([file1, file2]);
      });

      expect(uploadData).toHaveBeenCalledTimes(2);
      expect(uploadedKeys).toEqual([
        `media/${identityId}/file1.txt`,
        `media/${identityId}/file2.txt`,
      ]);
    });

    it("should refresh items after upload", async () => {
      vi.mocked(list).mockResolvedValue({ items: [] });
      vi.mocked(uploadData).mockResolvedValue({
        path: "test",
        result: Promise.resolve({}),
      } as never);

      const { result } = renderHook(() => useStorageOperations({ identityId, currentPath }), {
        wrapper: TestProvider,
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const file = new File(["content"], "file.txt", { type: "text/plain" });

      await act(async () => {
        await result.current.uploadFiles([file]);
      });

      // Initial fetch + refresh after upload
      expect(list).toHaveBeenCalledTimes(2);
    });
  });

  describe("removeItem", () => {
    it("should remove item and refresh list", async () => {
      vi.mocked(list).mockResolvedValue({ items: [] });
      vi.mocked(remove).mockResolvedValue({ path: "test" });

      const { result } = renderHook(() => useStorageOperations({ identityId, currentPath }), {
        wrapper: TestProvider,
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        await result.current.removeItem("some/key/file.jpg");
      });

      expect(remove).toHaveBeenCalledWith({ path: "some/key/file.jpg" });
      // Initial fetch + refresh after remove
      expect(list).toHaveBeenCalledTimes(2);
    });
  });

  describe("createFolder", () => {
    it("should create folder and refresh list", async () => {
      vi.mocked(list).mockResolvedValue({ items: [] });
      vi.mocked(uploadData).mockResolvedValue({
        path: "test",
        result: Promise.resolve({}),
      } as never);

      const { result } = renderHook(() => useStorageOperations({ identityId, currentPath }), {
        wrapper: TestProvider,
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        await result.current.createFolder("new-folder");
      });

      expect(uploadData).toHaveBeenCalledWith({
        path: `media/${identityId}/new-folder/`,
        data: "",
      });
      // Initial fetch + refresh after create
      expect(list).toHaveBeenCalledTimes(2);
    });

    it("should handle nested path for folder creation", async () => {
      vi.mocked(list).mockResolvedValue({ items: [] });
      vi.mocked(uploadData).mockResolvedValue({
        path: "test",
        result: Promise.resolve({}),
      } as never);

      const { result } = renderHook(
        () => useStorageOperations({ identityId, currentPath: "photos/travel" }),
        { wrapper: TestProvider },
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        await result.current.createFolder("japan");
      });

      expect(uploadData).toHaveBeenCalledWith({
        path: `media/${identityId}/photos/travel/japan/`,
        data: "",
      });
    });
  });

  describe("getFileUrl", () => {
    it("should return signed URL for file", async () => {
      vi.mocked(list).mockResolvedValue({ items: [] });
      vi.mocked(getUrl).mockResolvedValue({
        url: new URL("https://s3.amazonaws.com/bucket/file.jpg?signed=xxx"),
        expiresAt: new Date(),
      });

      const { result } = renderHook(() => useStorageOperations({ identityId, currentPath }), {
        wrapper: TestProvider,
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      let url: string = "";
      await act(async () => {
        url = await result.current.getFileUrl("some/key/file.jpg");
      });

      expect(getUrl).toHaveBeenCalledWith({ path: "some/key/file.jpg" });
      expect(url).toBe("https://s3.amazonaws.com/bucket/file.jpg?signed=xxx");
    });
  });

  describe("refresh", () => {
    it("should refetch items when called", async () => {
      vi.mocked(list).mockResolvedValue({ items: [] });

      const { result } = renderHook(() => useStorageOperations({ identityId, currentPath }), {
        wrapper: TestProvider,
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(list).toHaveBeenCalledTimes(1);

      await act(async () => {
        result.current.refresh();
      });

      expect(list).toHaveBeenCalledTimes(2);
    });
  });

  describe("basePath construction", () => {
    it("should construct correct basePath for root", async () => {
      vi.mocked(list).mockResolvedValue({ items: [] });

      renderHook(() => useStorageOperations({ identityId, currentPath: "" }), {
        wrapper: TestProvider,
      });

      await waitFor(() => {
        expect(list).toHaveBeenCalledWith({
          path: `media/${identityId}/`,
          options: { listAll: true },
        });
      });
    });

    it("should construct correct basePath for nested path", async () => {
      vi.mocked(list).mockResolvedValue({ items: [] });

      renderHook(() => useStorageOperations({ identityId, currentPath: "photos/vacation" }), {
        wrapper: TestProvider,
      });

      await waitFor(() => {
        expect(list).toHaveBeenCalledWith({
          path: `media/${identityId}/photos/vacation/`,
          options: { listAll: true },
        });
      });
    });
  });

  describe("removeItems (複数削除)", () => {
    it("should delete a single file", async () => {
      vi.mocked(list).mockResolvedValue({ items: [] });
      vi.mocked(remove).mockResolvedValue({ path: "test" });

      const { result } = renderHook(() => useStorageOperations({ identityId, currentPath }), {
        wrapper: TestProvider,
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const items = [{ key: "media/id/file.jpg", name: "file.jpg", type: "file" as const }];

      let deleteResult: { succeeded: string[]; failed: Array<{ key: string; error: Error }> };
      await act(async () => {
        deleteResult = await result.current.removeItems(items);
      });

      expect(remove).toHaveBeenCalledWith({ path: "media/id/file.jpg" });
      expect(deleteResult!.succeeded).toEqual(["media/id/file.jpg"]);
      expect(deleteResult!.failed).toHaveLength(0);
    });

    it("should delete multiple files in parallel", async () => {
      vi.mocked(list).mockResolvedValue({ items: [] });
      vi.mocked(remove).mockResolvedValue({ path: "test" });

      const { result } = renderHook(() => useStorageOperations({ identityId, currentPath }), {
        wrapper: TestProvider,
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const items = [
        { key: "media/id/file1.jpg", name: "file1.jpg", type: "file" as const },
        { key: "media/id/file2.jpg", name: "file2.jpg", type: "file" as const },
        { key: "media/id/file3.jpg", name: "file3.jpg", type: "file" as const },
      ];

      let deleteResult: { succeeded: string[]; failed: Array<{ key: string; error: Error }> };
      await act(async () => {
        deleteResult = await result.current.removeItems(items);
      });

      expect(remove).toHaveBeenCalledTimes(3);
      expect(deleteResult!.succeeded).toHaveLength(3);
      expect(deleteResult!.failed).toHaveLength(0);
    });

    it("should handle partial failure", async () => {
      vi.mocked(list).mockResolvedValue({ items: [] });
      const mockError = new Error("Permission denied");
      vi.mocked(remove)
        .mockResolvedValueOnce({ path: "test" })
        .mockRejectedValueOnce(mockError)
        .mockResolvedValueOnce({ path: "test" });

      const { result } = renderHook(() => useStorageOperations({ identityId, currentPath }), {
        wrapper: TestProvider,
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const items = [
        { key: "media/id/file1.jpg", name: "file1.jpg", type: "file" as const },
        { key: "media/id/file2.jpg", name: "file2.jpg", type: "file" as const },
        { key: "media/id/file3.jpg", name: "file3.jpg", type: "file" as const },
      ];

      let deleteResult: { succeeded: string[]; failed: Array<{ key: string; error: Error }> };
      await act(async () => {
        deleteResult = await result.current.removeItems(items);
      });

      expect(deleteResult!.succeeded).toHaveLength(2);
      expect(deleteResult!.failed).toHaveLength(1);
      expect(deleteResult!.failed[0].key).toBe("media/id/file2.jpg");
      expect(deleteResult!.failed[0].error).toBe(mockError);
    });

    it("should delete folder contents recursively", async () => {
      const basePath = `media/${identityId}/`;
      // Initial list for hook mount
      vi.mocked(list)
        .mockResolvedValueOnce({ items: [] })
        // Folder contents list
        .mockResolvedValueOnce({
          items: [
            { path: `${basePath}folder/file1.jpg`, size: 100 },
            { path: `${basePath}folder/file2.jpg`, size: 200 },
            { path: `${basePath}folder/subfolder/file3.jpg`, size: 300 },
          ],
        })
        // Final refresh
        .mockResolvedValueOnce({ items: [] });

      vi.mocked(remove).mockResolvedValue({ path: "test" });

      const { result } = renderHook(() => useStorageOperations({ identityId, currentPath }), {
        wrapper: TestProvider,
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const items = [{ key: `${basePath}folder/`, name: "folder", type: "folder" as const }];

      await act(async () => {
        await result.current.removeItems(items);
      });

      // Should list folder contents first
      expect(list).toHaveBeenCalledWith({
        path: `${basePath}folder/`,
        options: { listAll: true },
      });

      // Should delete all contents + folder itself (4 total: 3 files + 1 folder)
      expect(remove).toHaveBeenCalledTimes(4);
    });

    it("should handle folder that does not exist as object", async () => {
      const basePath = `media/${identityId}/`;
      // Initial list for hook mount
      vi.mocked(list)
        .mockResolvedValueOnce({ items: [] })
        // Folder contents list - no folder object, just files inside
        .mockResolvedValueOnce({
          items: [{ path: `${basePath}folder/file1.jpg`, size: 100 }],
        })
        // Final refresh
        .mockResolvedValueOnce({ items: [] });

      // First call succeeds (file), second call fails (folder object doesn't exist)
      vi.mocked(remove)
        .mockResolvedValueOnce({ path: "test" })
        .mockRejectedValueOnce(new Error("NotFound"));

      const { result } = renderHook(() => useStorageOperations({ identityId, currentPath }), {
        wrapper: TestProvider,
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const items = [{ key: `${basePath}folder/`, name: "folder", type: "folder" as const }];

      let deleteResult: { succeeded: string[]; failed: Array<{ key: string; error: Error }> };
      await act(async () => {
        deleteResult = await result.current.removeItems(items);
      });

      // File deletion succeeded, folder object deletion failed but that's ok
      expect(deleteResult!.succeeded).toContain(`${basePath}folder/file1.jpg`);
    });

    it("should set isDeleting to true during deletion", async () => {
      vi.mocked(list).mockResolvedValue({ items: [] });
      let resolveRemove: () => void;
      vi.mocked(remove).mockImplementation(
        () =>
          new Promise((resolve) => {
            resolveRemove = () => resolve({ path: "test" });
          }),
      );

      const { result } = renderHook(() => useStorageOperations({ identityId, currentPath }), {
        wrapper: TestProvider,
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.isDeleting).toBe(false);

      const items = [{ key: "media/id/file.jpg", name: "file.jpg", type: "file" as const }];

      let deletePromise: Promise<unknown>;
      act(() => {
        deletePromise = result.current.removeItems(items);
      });

      // isDeleting should be true while deletion is in progress
      expect(result.current.isDeleting).toBe(true);

      await act(async () => {
        resolveRemove!();
        await deletePromise;
      });

      expect(result.current.isDeleting).toBe(false);
    });

    it("should refresh items after deletion", async () => {
      vi.mocked(list).mockResolvedValue({ items: [] });
      vi.mocked(remove).mockResolvedValue({ path: "test" });

      const { result } = renderHook(() => useStorageOperations({ identityId, currentPath }), {
        wrapper: TestProvider,
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(list).toHaveBeenCalledTimes(1);

      const items = [{ key: "media/id/file.jpg", name: "file.jpg", type: "file" as const }];

      await act(async () => {
        await result.current.removeItems(items);
      });

      // Initial fetch + refresh after deletion
      expect(list).toHaveBeenCalledTimes(2);
    });
  });

  describe("renameItem (単一ファイルリネーム)", () => {
    it("should rename file successfully when target does not exist", async () => {
      const basePath = `media/${identityId}/`;
      // Initial list
      vi.mocked(list)
        .mockResolvedValueOnce({ items: [] })
        // Check for duplicate - empty means no conflict
        .mockResolvedValueOnce({ items: [] })
        // Refresh after rename
        .mockResolvedValueOnce({ items: [] });

      vi.mocked(copy).mockResolvedValue({ path: `${basePath}new.jpg` });
      vi.mocked(remove).mockResolvedValue({ path: `${basePath}old.jpg` });

      const { result } = renderHook(() => useStorageOperations({ identityId, currentPath }), {
        wrapper: TestProvider,
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      let renameResult: { success: boolean; error?: string };
      await act(async () => {
        renameResult = await result.current.renameItem(`${basePath}old.jpg`, "new.jpg");
      });

      expect(renameResult!.success).toBe(true);
      expect(copy).toHaveBeenCalledWith({
        source: { path: `${basePath}old.jpg` },
        destination: { path: `${basePath}new.jpg` },
      });
      expect(remove).toHaveBeenCalledWith({ path: `${basePath}old.jpg` });
    });

    it("should return error when target file already exists", async () => {
      const basePath = `media/${identityId}/`;
      // Initial list
      vi.mocked(list)
        .mockResolvedValueOnce({ items: [] })
        // Check for duplicate - file exists
        .mockResolvedValueOnce({ items: [{ path: `${basePath}new.jpg`, size: 100 }] });

      const { result } = renderHook(() => useStorageOperations({ identityId, currentPath }), {
        wrapper: TestProvider,
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      let renameResult: { success: boolean; error?: string };
      await act(async () => {
        renameResult = await result.current.renameItem(`${basePath}old.jpg`, "new.jpg");
      });

      expect(renameResult!.success).toBe(false);
      expect(renameResult!.error).toBe("同じ名前のファイルが既に存在します");
      expect(copy).not.toHaveBeenCalled();
      expect(remove).not.toHaveBeenCalled();
    });

    it("should return error when list API fails during duplicate check", async () => {
      const basePath = `media/${identityId}/`;
      // Initial list
      vi.mocked(list)
        .mockResolvedValueOnce({ items: [] })
        // Check for duplicate - API error
        .mockRejectedValueOnce(new Error("Network error"));

      const { result } = renderHook(() => useStorageOperations({ identityId, currentPath }), {
        wrapper: TestProvider,
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      let renameResult: { success: boolean; error?: string };
      await act(async () => {
        renameResult = await result.current.renameItem(`${basePath}old.jpg`, "new.jpg");
      });

      expect(renameResult!.success).toBe(false);
      expect(renameResult!.error).toContain("リネーム前のチェックに失敗しました");
      expect(copy).not.toHaveBeenCalled();
    });

    it("should return error when copy fails", async () => {
      const basePath = `media/${identityId}/`;
      vi.mocked(list).mockResolvedValueOnce({ items: [] }).mockResolvedValueOnce({ items: [] });

      vi.mocked(copy).mockRejectedValueOnce(new Error("Copy failed"));

      const { result } = renderHook(() => useStorageOperations({ identityId, currentPath }), {
        wrapper: TestProvider,
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      let renameResult: { success: boolean; error?: string };
      await act(async () => {
        renameResult = await result.current.renameItem(`${basePath}old.jpg`, "new.jpg");
      });

      expect(renameResult!.success).toBe(false);
      expect(renameResult!.error).toContain("コピーに失敗しました");
      // Original file should remain (no remove called)
      expect(remove).not.toHaveBeenCalled();
    });

    it("should return success with warning when delete fails after copy", async () => {
      const basePath = `media/${identityId}/`;
      vi.mocked(list)
        .mockResolvedValueOnce({ items: [] })
        .mockResolvedValueOnce({ items: [] })
        .mockResolvedValueOnce({ items: [] });

      vi.mocked(copy).mockResolvedValueOnce({ path: `${basePath}new.jpg` });
      vi.mocked(remove).mockRejectedValueOnce(new Error("Delete failed"));

      const { result } = renderHook(() => useStorageOperations({ identityId, currentPath }), {
        wrapper: TestProvider,
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      let renameResult: { success: boolean; error?: string; warning?: string };
      await act(async () => {
        renameResult = await result.current.renameItem(`${basePath}old.jpg`, "new.jpg");
      });

      // Rename is considered successful even if delete fails
      expect(renameResult!.success).toBe(true);
      expect(renameResult!.warning).toContain("元ファイルの削除に失敗");
    });

    it("should set isRenaming to true during rename", async () => {
      const basePath = `media/${identityId}/`;
      vi.mocked(list)
        .mockResolvedValueOnce({ items: [] })
        .mockResolvedValueOnce({ items: [] })
        .mockResolvedValueOnce({ items: [] });

      let resolveCopy: (value: { path: string }) => void;
      const copyPromise = new Promise<{ path: string }>((resolve) => {
        resolveCopy = resolve;
      });
      vi.mocked(copy).mockReturnValueOnce(copyPromise);
      vi.mocked(remove).mockResolvedValueOnce({ path: "test" });

      const { result } = renderHook(() => useStorageOperations({ identityId, currentPath }), {
        wrapper: TestProvider,
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.isRenaming).toBe(false);

      let renamePromise: Promise<unknown>;
      act(() => {
        renamePromise = result.current.renameItem(`${basePath}old.jpg`, "new.jpg");
      });

      expect(result.current.isRenaming).toBe(true);

      await act(async () => {
        resolveCopy!({ path: `${basePath}new.jpg` });
        await renamePromise;
      });

      expect(result.current.isRenaming).toBe(false);
    });

    it("should refresh items after successful rename", async () => {
      const basePath = `media/${identityId}/`;
      vi.mocked(list)
        .mockResolvedValueOnce({ items: [] })
        .mockResolvedValueOnce({ items: [] })
        .mockResolvedValueOnce({ items: [] });

      vi.mocked(copy).mockResolvedValueOnce({ path: `${basePath}new.jpg` });
      vi.mocked(remove).mockResolvedValueOnce({ path: "test" });

      const { result } = renderHook(() => useStorageOperations({ identityId, currentPath }), {
        wrapper: TestProvider,
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(list).toHaveBeenCalledTimes(1);

      await act(async () => {
        await result.current.renameItem(`${basePath}old.jpg`, "new.jpg");
      });

      // Initial + duplicate check + refresh after rename
      expect(list).toHaveBeenCalledTimes(3);
    });
  });

  describe("renameFolder (フォルダリネーム)", () => {
    const basePath = `media/${identityId}/`;

    it("should rename folder successfully when target does not exist", async () => {
      vi.mocked(list)
        .mockResolvedValueOnce({ items: [] }) // Initial hook mount
        .mockResolvedValueOnce({ items: [] }) // Check target prefix empty
        .mockResolvedValueOnce({
          items: [
            // List source folder contents
            { path: `${basePath}old/file1.jpg`, size: 100 },
            { path: `${basePath}old/file2.jpg`, size: 200 },
          ],
        })
        .mockResolvedValueOnce({ items: [] }); // Refresh after rename

      vi.mocked(copy).mockResolvedValue({ path: "test" });
      vi.mocked(remove).mockResolvedValue({ path: "test" });

      const { result } = renderHook(() => useStorageOperations({ identityId, currentPath }), {
        wrapper: TestProvider,
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      let renameResult: { success: boolean; succeeded?: number; failed?: number };
      await act(async () => {
        renameResult = await result.current.renameFolder(`${basePath}old/`, "new");
      });

      expect(renameResult!.success).toBe(true);
      expect(renameResult!.succeeded).toBe(2);
      expect(copy).toHaveBeenCalledTimes(2);
      expect(copy).toHaveBeenCalledWith({
        source: { path: `${basePath}old/file1.jpg` },
        destination: { path: `${basePath}new/file1.jpg` },
      });
    });

    it("should return error when folder has more than 1000 items", async () => {
      const manyItems = Array.from({ length: 1001 }, (_, i) => ({
        path: `${basePath}old/file${i}.jpg`,
        size: 100,
      }));

      vi.mocked(list)
        .mockResolvedValueOnce({ items: [] }) // Initial hook mount
        .mockResolvedValueOnce({ items: [] }) // Check target prefix empty
        .mockResolvedValueOnce({ items: manyItems }); // List source - too many items

      const { result } = renderHook(() => useStorageOperations({ identityId, currentPath }), {
        wrapper: TestProvider,
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      let renameResult: { success: boolean; error?: string };
      await act(async () => {
        renameResult = await result.current.renameFolder(`${basePath}old/`, "new");
      });

      expect(renameResult!.success).toBe(false);
      expect(renameResult!.error).toContain("ファイル数が多すぎます");
      expect(renameResult!.error).toContain("1001");
      expect(copy).not.toHaveBeenCalled();
    });

    it("should abort rename when duplicate files exist in target", async () => {
      vi.mocked(list)
        .mockResolvedValueOnce({ items: [] }) // Initial
        .mockResolvedValueOnce({
          items: [
            // Target folder has files
            { path: `${basePath}new/file1.jpg`, size: 100 },
          ],
        })
        .mockResolvedValueOnce({
          items: [
            // Source folder contents
            { path: `${basePath}old/file1.jpg`, size: 100 },
            { path: `${basePath}old/file2.jpg`, size: 200 },
          ],
        });

      const { result } = renderHook(() => useStorageOperations({ identityId, currentPath }), {
        wrapper: TestProvider,
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      let renameResult: { success: boolean; error?: string; duplicates?: string[] };
      await act(async () => {
        renameResult = await result.current.renameFolder(`${basePath}old/`, "new");
      });

      expect(renameResult!.success).toBe(false);
      expect(renameResult!.error).toContain("重複するファイルが存在します");
      expect(renameResult!.duplicates).toContain("file1.jpg");
      expect(copy).not.toHaveBeenCalled();
    });

    it("should skip duplicate check when target is empty (fast path)", async () => {
      vi.mocked(list)
        .mockResolvedValueOnce({ items: [] }) // Initial
        .mockResolvedValueOnce({ items: [] }) // Target empty - fast path
        .mockResolvedValueOnce({ items: [{ path: `${basePath}old/file1.jpg`, size: 100 }] })
        .mockResolvedValueOnce({ items: [] }); // Refresh

      vi.mocked(copy).mockResolvedValue({ path: "test" });
      vi.mocked(remove).mockResolvedValue({ path: "test" });

      const { result } = renderHook(() => useStorageOperations({ identityId, currentPath }), {
        wrapper: TestProvider,
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        await result.current.renameFolder(`${basePath}old/`, "new");
      });

      // Should proceed without additional duplicate checks
      expect(copy).toHaveBeenCalledTimes(1);
    });

    it("should report partial failure when some copies fail", async () => {
      vi.mocked(list)
        .mockResolvedValueOnce({ items: [] }) // Initial
        .mockResolvedValueOnce({ items: [] }) // Target empty
        .mockResolvedValueOnce({
          items: [
            { path: `${basePath}old/file1.jpg`, size: 100 },
            { path: `${basePath}old/file2.jpg`, size: 200 },
          ],
        })
        .mockResolvedValueOnce({ items: [] }); // Refresh

      vi.mocked(copy)
        .mockResolvedValueOnce({ path: "test" })
        .mockRejectedValueOnce(new Error("Copy failed"));
      vi.mocked(remove).mockResolvedValue({ path: "test" });

      const { result } = renderHook(() => useStorageOperations({ identityId, currentPath }), {
        wrapper: TestProvider,
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      let renameResult: {
        success: boolean;
        succeeded?: number;
        failed?: number;
        failedFiles?: string[];
      };
      await act(async () => {
        renameResult = await result.current.renameFolder(`${basePath}old/`, "new");
      });

      expect(renameResult!.success).toBe(false);
      expect(renameResult!.succeeded).toBe(1);
      expect(renameResult!.failed).toBe(1);
      expect(renameResult!.failedFiles).toContain("file2.jpg");
      // Only successful copy should have remove called
      expect(remove).toHaveBeenCalledTimes(1);
    });

    it("should call progress callback during folder rename", async () => {
      vi.mocked(list)
        .mockResolvedValueOnce({ items: [] }) // Initial
        .mockResolvedValueOnce({ items: [] }) // Target empty
        .mockResolvedValueOnce({
          items: [
            { path: `${basePath}old/file1.jpg`, size: 100 },
            { path: `${basePath}old/file2.jpg`, size: 200 },
          ],
        })
        .mockResolvedValueOnce({ items: [] }); // Refresh

      vi.mocked(copy).mockResolvedValue({ path: "test" });
      vi.mocked(remove).mockResolvedValue({ path: "test" });

      const { result } = renderHook(() => useStorageOperations({ identityId, currentPath }), {
        wrapper: TestProvider,
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const progressCallback = vi.fn();

      await act(async () => {
        await result.current.renameFolder(`${basePath}old/`, "new", progressCallback);
      });

      expect(progressCallback).toHaveBeenCalled();
      // Should be called with progress updates
      expect(progressCallback).toHaveBeenCalledWith({ current: 1, total: 2 });
      expect(progressCallback).toHaveBeenCalledWith({ current: 2, total: 2 });
    });

    it("should set isRenaming during folder rename", async () => {
      vi.mocked(list)
        .mockResolvedValueOnce({ items: [] }) // Initial
        .mockResolvedValueOnce({ items: [] }) // Target check
        .mockResolvedValueOnce({ items: [{ path: `${basePath}old/file1.jpg`, size: 100 }] }) // Source list
        .mockResolvedValueOnce({ items: [] }); // Refresh

      // Create a deferred promise for copy
      let resolveCopy: ((value: { path: string }) => void) | undefined;
      const copyPromise = new Promise<{ path: string }>((resolve) => {
        resolveCopy = resolve;
      });
      vi.mocked(copy).mockReturnValue(copyPromise);
      vi.mocked(remove).mockResolvedValue({ path: "test" });

      const { result } = renderHook(() => useStorageOperations({ identityId, currentPath }), {
        wrapper: TestProvider,
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.isRenaming).toBe(false);

      let renamePromise: Promise<unknown>;
      act(() => {
        renamePromise = result.current.renameFolder(`${basePath}old/`, "new");
      });

      // Wait a tick for the async operation to start
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      expect(result.current.isRenaming).toBe(true);

      await act(async () => {
        resolveCopy!({ path: "test" });
        await renamePromise;
      });

      expect(result.current.isRenaming).toBe(false);
    });
  });

  describe("moveItems (ファイル/フォルダ移動)", () => {
    const basePath = `media/${identityId}/`;

    it("should move a single file to destination folder", async () => {
      vi.mocked(list)
        .mockResolvedValueOnce({ items: [] }) // Initial
        .mockResolvedValueOnce({ items: [] }) // Check destination for duplicates
        .mockResolvedValueOnce({ items: [] }); // Refresh

      vi.mocked(copy).mockResolvedValue({ path: "test" });
      vi.mocked(remove).mockResolvedValue({ path: "test" });

      const { result } = renderHook(() => useStorageOperations({ identityId, currentPath }), {
        wrapper: TestProvider,
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const items = [
        { key: `${basePath}photos/file.jpg`, name: "file.jpg", type: "file" as const },
      ];

      let moveResult: { success: boolean; succeeded: number; failed: number };
      await act(async () => {
        moveResult = await result.current.moveItems(items, `${basePath}archive`);
      });

      expect(moveResult!.success).toBe(true);
      expect(moveResult!.succeeded).toBe(1);
      // encodePathForCopy encodes each segment but preserves /
      // For ASCII-only paths, the result is the same as the input
      expect(copy).toHaveBeenCalledWith({
        source: { path: `${basePath}photos/file.jpg` },
        destination: { path: `${basePath}archive/file.jpg` },
      });
      expect(remove).toHaveBeenCalledWith({ path: `${basePath}photos/file.jpg` });
    });

    it("should move multiple files to destination folder", async () => {
      vi.mocked(list)
        .mockResolvedValueOnce({ items: [] }) // Initial
        .mockResolvedValueOnce({ items: [] }) // Check destination
        .mockResolvedValueOnce({ items: [] }); // Refresh

      vi.mocked(copy).mockResolvedValue({ path: "test" });
      vi.mocked(remove).mockResolvedValue({ path: "test" });

      const { result } = renderHook(() => useStorageOperations({ identityId, currentPath }), {
        wrapper: TestProvider,
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const items = [
        { key: `${basePath}photos/file1.jpg`, name: "file1.jpg", type: "file" as const },
        { key: `${basePath}photos/file2.jpg`, name: "file2.jpg", type: "file" as const },
      ];

      let moveResult: { success: boolean; succeeded: number; failed: number };
      await act(async () => {
        moveResult = await result.current.moveItems(items, `${basePath}archive`);
      });

      expect(moveResult!.success).toBe(true);
      expect(moveResult!.succeeded).toBe(2);
      expect(copy).toHaveBeenCalledTimes(2);
      expect(remove).toHaveBeenCalledTimes(2);
    });

    it("should move folder with all contents", async () => {
      vi.mocked(list)
        .mockResolvedValueOnce({ items: [] }) // Initial
        .mockResolvedValueOnce({
          items: [
            // Folder contents (listFolderContents is called first)
            { path: `${basePath}photos/folder/file1.jpg`, size: 100 },
            { path: `${basePath}photos/folder/subfolder/file2.jpg`, size: 200 },
          ],
        })
        .mockResolvedValueOnce({ items: [] }) // Check destination for duplicates
        .mockResolvedValueOnce({ items: [] }); // Refresh

      vi.mocked(copy).mockResolvedValue({ path: "test" });
      vi.mocked(remove).mockResolvedValue({ path: "test" });

      const { result } = renderHook(() => useStorageOperations({ identityId, currentPath }), {
        wrapper: TestProvider,
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const items = [{ key: `${basePath}photos/folder/`, name: "folder", type: "folder" as const }];

      let moveResult: { success: boolean; succeeded: number; failed: number };
      await act(async () => {
        moveResult = await result.current.moveItems(items, `${basePath}archive`);
      });

      expect(moveResult!.success).toBe(true);
      expect(moveResult!.succeeded).toBe(2);
      // Should copy files preserving folder structure
      expect(copy).toHaveBeenCalledWith({
        source: { path: `${basePath}photos/folder/file1.jpg` },
        destination: { path: `${basePath}archive/folder/file1.jpg` },
      });
      expect(copy).toHaveBeenCalledWith({
        source: { path: `${basePath}photos/folder/subfolder/file2.jpg` },
        destination: { path: `${basePath}archive/folder/subfolder/file2.jpg` },
      });
    });

    it("should abort when duplicate file exists at destination", async () => {
      vi.mocked(list)
        .mockResolvedValueOnce({ items: [] }) // Initial
        .mockResolvedValueOnce({
          // listAll for destination - duplicate exists
          items: [{ path: `${basePath}archive/file.jpg`, size: 100 }],
        });

      const { result } = renderHook(() => useStorageOperations({ identityId, currentPath }), {
        wrapper: TestProvider,
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const items = [
        { key: `${basePath}photos/file.jpg`, name: "file.jpg", type: "file" as const },
      ];

      let moveResult: { success: boolean; error?: string; duplicates?: string[] };
      await act(async () => {
        moveResult = await result.current.moveItems(items, `${basePath}archive`);
      });

      expect(moveResult!.success).toBe(false);
      expect(moveResult!.error).toContain("同名のファイルが存在します");
      expect(moveResult!.duplicates).toContain("file.jpg");
      expect(copy).not.toHaveBeenCalled();
    });

    it("should call progress callback during move", async () => {
      vi.mocked(list)
        .mockResolvedValueOnce({ items: [] }) // Initial
        .mockResolvedValueOnce({ items: [] }) // Check destination
        .mockResolvedValueOnce({ items: [] }); // Refresh

      vi.mocked(copy).mockResolvedValue({ path: "test" });
      vi.mocked(remove).mockResolvedValue({ path: "test" });

      const { result } = renderHook(() => useStorageOperations({ identityId, currentPath }), {
        wrapper: TestProvider,
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const items = [
        { key: `${basePath}photos/file1.jpg`, name: "file1.jpg", type: "file" as const },
        { key: `${basePath}photos/file2.jpg`, name: "file2.jpg", type: "file" as const },
      ];

      const progressCallback = vi.fn();

      await act(async () => {
        await result.current.moveItems(items, `${basePath}archive`, progressCallback);
      });

      expect(progressCallback).toHaveBeenCalledWith({ current: 1, total: 2 });
      expect(progressCallback).toHaveBeenCalledWith({ current: 2, total: 2 });
    });

    it("should report partial failure when some copies fail", async () => {
      vi.mocked(list)
        .mockResolvedValueOnce({ items: [] }) // Initial
        .mockResolvedValueOnce({ items: [] }) // Check destination
        .mockResolvedValueOnce({ items: [] }); // Refresh

      vi.mocked(copy)
        .mockResolvedValueOnce({ path: "test" })
        .mockRejectedValueOnce(new Error("Copy failed"));
      vi.mocked(remove).mockResolvedValue({ path: "test" });

      const { result } = renderHook(() => useStorageOperations({ identityId, currentPath }), {
        wrapper: TestProvider,
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const items = [
        { key: `${basePath}photos/file1.jpg`, name: "file1.jpg", type: "file" as const },
        { key: `${basePath}photos/file2.jpg`, name: "file2.jpg", type: "file" as const },
      ];

      let moveResult: {
        success: boolean;
        succeeded: number;
        failed: number;
        failedItems?: string[];
      };
      await act(async () => {
        moveResult = await result.current.moveItems(items, `${basePath}archive`);
      });

      expect(moveResult!.success).toBe(false);
      expect(moveResult!.succeeded).toBe(1);
      expect(moveResult!.failed).toBe(1);
      expect(moveResult!.failedItems).toContain("file2.jpg");
    });

    it("should set isMoving during move operation", async () => {
      vi.mocked(list)
        .mockResolvedValueOnce({ items: [] }) // Initial
        .mockResolvedValueOnce({ items: [] }) // Check destination
        .mockResolvedValueOnce({ items: [] }); // Refresh

      let resolveCopy: ((value: { path: string }) => void) | undefined;
      const copyPromise = new Promise<{ path: string }>((resolve) => {
        resolveCopy = resolve;
      });
      vi.mocked(copy).mockReturnValue(copyPromise);
      vi.mocked(remove).mockResolvedValue({ path: "test" });

      const { result } = renderHook(() => useStorageOperations({ identityId, currentPath }), {
        wrapper: TestProvider,
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.isMoving).toBe(false);

      const items = [
        { key: `${basePath}photos/file.jpg`, name: "file.jpg", type: "file" as const },
      ];

      let movePromise: Promise<unknown>;
      act(() => {
        movePromise = result.current.moveItems(items, `${basePath}archive`);
      });

      // Wait a tick for the async operation to start
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      expect(result.current.isMoving).toBe(true);

      await act(async () => {
        resolveCopy!({ path: "test" });
        await movePromise;
      });

      expect(result.current.isMoving).toBe(false);
    });

    it("should refresh items after successful move", async () => {
      vi.mocked(list)
        .mockResolvedValueOnce({ items: [] }) // Initial
        .mockResolvedValueOnce({ items: [] }) // Check destination
        .mockResolvedValueOnce({ items: [] }); // Refresh

      vi.mocked(copy).mockResolvedValue({ path: "test" });
      vi.mocked(remove).mockResolvedValue({ path: "test" });

      const { result } = renderHook(() => useStorageOperations({ identityId, currentPath }), {
        wrapper: TestProvider,
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(list).toHaveBeenCalledTimes(1);

      const items = [
        { key: `${basePath}photos/file.jpg`, name: "file.jpg", type: "file" as const },
      ];

      await act(async () => {
        await result.current.moveItems(items, `${basePath}archive`);
      });

      // Initial + duplicate check + refresh after move
      expect(list).toHaveBeenCalledTimes(3);
    });
  });

  describe("listFolders", () => {
    const basePath = `media/${identityId}/`;

    it("should return only folders from the specified path", async () => {
      vi.mocked(list)
        .mockResolvedValueOnce({ items: [] }) // Initial hook mount
        .mockResolvedValueOnce({
          items: [
            { path: `${basePath}photos/`, size: 0, lastModified: new Date() },
            { path: `${basePath}archive/`, size: 0, lastModified: new Date() },
            { path: `${basePath}file.jpg`, size: 1024, lastModified: new Date() },
            { path: `${basePath}document.pdf`, size: 2048, lastModified: new Date() },
          ],
        });

      const { result } = renderHook(() => useStorageOperations({ identityId, currentPath }), {
        wrapper: TestProvider,
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      let folders: Array<{ key: string; name: string; type: string }>;
      await act(async () => {
        folders = await result.current.listFolders(basePath);
      });

      expect(folders!).toHaveLength(2);
      expect(folders!.every((f) => f.type === "folder")).toBe(true);
      // Order may vary, use toContain for both
      const folderNames = folders!.map((f) => f.name);
      expect(folderNames).toContain("photos");
      expect(folderNames).toContain("archive");
    });

    it("should return empty array when no folders exist", async () => {
      vi.mocked(list)
        .mockResolvedValueOnce({ items: [] }) // Initial
        .mockResolvedValueOnce({
          items: [{ path: `${basePath}file.jpg`, size: 1024, lastModified: new Date() }],
        });

      const { result } = renderHook(() => useStorageOperations({ identityId, currentPath }), {
        wrapper: TestProvider,
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      let folders: Array<{ key: string; name: string; type: string }>;
      await act(async () => {
        folders = await result.current.listFolders(basePath);
      });

      expect(folders!).toHaveLength(0);
    });
  });
});
