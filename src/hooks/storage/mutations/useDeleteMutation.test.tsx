/**
 * useDeleteMutation フックのテスト
 */
import type { ReactNode } from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Provider } from "jotai";
import { MantineProvider } from "@mantine/core";
import { list, remove } from "aws-amplify/storage";
import { queryKeys } from "../../../stores/queryKeys";
import { useDeleteMutation } from "./useDeleteMutation";

vi.mock("aws-amplify/storage", () => ({
  list: vi.fn(),
  remove: vi.fn(),
}));

/**
 * QueryClient を外部から制御可能な TestProvider
 */
function createTestProviderWithQueryClient(queryClient: QueryClient) {
  return function TestProviderWithQueryClient({ children }: { children: ReactNode }) {
    return (
      <MantineProvider>
        <QueryClientProvider client={queryClient}>
          <Provider>{children}</Provider>
        </QueryClientProvider>
      </MantineProvider>
    );
  };
}

describe("useDeleteMutation", () => {
  const mockContext = {
    identityId: "test-identity-id",
    currentPath: "photos",
  };

  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
          gcTime: 0,
        },
      },
    });
  });

  it("should return mutation with initial state", () => {
    const { result } = renderHook(() => useDeleteMutation(mockContext), {
      wrapper: createTestProviderWithQueryClient(queryClient),
    });

    expect(result.current.isPending).toBe(false);
    expect(result.current.isError).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("should delete single file successfully", async () => {
    vi.mocked(remove).mockResolvedValue({ path: "test-path" });

    const { result } = renderHook(() => useDeleteMutation(mockContext), {
      wrapper: createTestProviderWithQueryClient(queryClient),
    });

    const deleteResult = await result.current.mutateAsync({
      items: [{ key: "media/user-123/photos/image.jpg", name: "image.jpg", type: "file" }],
    });

    expect(deleteResult.succeeded).toEqual(["media/user-123/photos/image.jpg"]);
    expect(deleteResult.failed).toEqual([]);
    expect(remove).toHaveBeenCalledWith({ path: "media/user-123/photos/image.jpg" });
  });

  it("should delete folder and its contents", async () => {
    vi.mocked(list).mockResolvedValue({
      items: [
        { path: "media/user-123/photos/folder/file1.jpg" },
        { path: "media/user-123/photos/folder/file2.jpg" },
      ],
    } as never);
    vi.mocked(remove).mockResolvedValue({ path: "test-path" });

    const { result } = renderHook(() => useDeleteMutation(mockContext), {
      wrapper: createTestProviderWithQueryClient(queryClient),
    });

    const deleteResult = await result.current.mutateAsync({
      items: [{ key: "media/user-123/photos/folder/", name: "folder", type: "folder" }],
    });

    expect(deleteResult.succeeded).toContain("media/user-123/photos/folder/file1.jpg");
    expect(deleteResult.succeeded).toContain("media/user-123/photos/folder/file2.jpg");
    expect(deleteResult.succeeded).toContain("media/user-123/photos/folder/");
    expect(deleteResult.failed).toEqual([]);
  });

  it("should handle partial failure", async () => {
    const deleteError = new Error("Delete failed");
    vi.mocked(remove)
      .mockResolvedValueOnce({ path: "test-path" })
      .mockRejectedValueOnce(deleteError);

    const { result } = renderHook(() => useDeleteMutation(mockContext), {
      wrapper: createTestProviderWithQueryClient(queryClient),
    });

    const deleteResult = await result.current.mutateAsync({
      items: [
        { key: "media/file1.jpg", name: "file1.jpg", type: "file" },
        { key: "media/file2.jpg", name: "file2.jpg", type: "file" },
      ],
    });

    expect(deleteResult.succeeded).toEqual(["media/file1.jpg"]);
    expect(deleteResult.failed).toHaveLength(1);
    expect(deleteResult.failed[0].key).toBe("media/file2.jpg");
    expect(deleteResult.failed[0].error).toEqual(deleteError);
  });

  it("should set isPending to true during deletion", async () => {
    let resolveDelete: () => void;
    const deletePromise = new Promise<{ path: string }>((resolve) => {
      resolveDelete = () => resolve({ path: "test" });
    });
    vi.mocked(remove).mockReturnValue(deletePromise as never);

    const { result } = renderHook(() => useDeleteMutation(mockContext), {
      wrapper: createTestProviderWithQueryClient(queryClient),
    });

    const mutationPromise = result.current.mutateAsync({
      items: [{ key: "media/file.jpg", name: "file.jpg", type: "file" }],
    });

    await waitFor(() => {
      expect(result.current.isPending).toBe(true);
    });

    resolveDelete!();
    await mutationPromise;

    await waitFor(() => {
      expect(result.current.isPending).toBe(false);
    });
  });

  describe("cache invalidation", () => {
    it("should invalidate current path cache after deletion", async () => {
      vi.mocked(remove).mockResolvedValue({ path: "test-path" });

      // キャッシュを設定
      queryClient.setQueryData(queryKeys.storageItems(mockContext.identityId, "photos"), [
        { key: "photos/image.jpg", name: "image.jpg", type: "file" },
      ]);

      const { result } = renderHook(() => useDeleteMutation(mockContext), {
        wrapper: createTestProviderWithQueryClient(queryClient),
      });

      await result.current.mutateAsync({
        items: [{ key: "media/user-123/photos/image.jpg", name: "image.jpg", type: "file" }],
      });

      // キャッシュが無効化されていること
      await waitFor(() => {
        const state = queryClient.getQueryState(
          queryKeys.storageItems(mockContext.identityId, "photos"),
        );
        expect(state?.isInvalidated).toBe(true);
      });
    });

    it("should invalidate descendant path caches when deleting folder", async () => {
      vi.mocked(list).mockResolvedValue({
        items: [{ path: "media/user-123/photos/folder/file1.jpg" }],
      } as never);
      vi.mocked(remove).mockResolvedValue({ path: "test-path" });

      // 削除対象フォルダとその配下のキャッシュを設定
      queryClient.setQueryData(queryKeys.storageItems(mockContext.identityId, "photos"), []);
      queryClient.setQueryData(queryKeys.storageItems(mockContext.identityId, "photos/folder"), [
        { key: "photos/folder/file1.jpg", name: "file1.jpg", type: "file" },
      ]);
      queryClient.setQueryData(
        queryKeys.storageItems(mockContext.identityId, "photos/folder/subfolder"),
        [],
      );

      const { result } = renderHook(() => useDeleteMutation(mockContext), {
        wrapper: createTestProviderWithQueryClient(queryClient),
      });

      // photos/folder を削除
      await result.current.mutateAsync({
        items: [{ key: "media/user-123/photos/folder/", name: "folder", type: "folder" }],
      });

      // 配下パスのキャッシュも無効化されていること
      await waitFor(() => {
        expect(
          queryClient.getQueryState(queryKeys.storageItems(mockContext.identityId, "photos"))
            ?.isInvalidated,
        ).toBe(true);
        expect(
          queryClient.getQueryState(queryKeys.storageItems(mockContext.identityId, "photos/folder"))
            ?.isInvalidated,
        ).toBe(true);
        expect(
          queryClient.getQueryState(
            queryKeys.storageItems(mockContext.identityId, "photos/folder/subfolder"),
          )?.isInvalidated,
        ).toBe(true);
      });
    });

    it("should not invalidate unrelated path caches", async () => {
      vi.mocked(list).mockResolvedValue({
        items: [{ path: "media/user-123/photos/folder/file1.jpg" }],
      } as never);
      vi.mocked(remove).mockResolvedValue({ path: "test-path" });

      // 関連するパスと無関係なパスのキャッシュを設定
      queryClient.setQueryData(queryKeys.storageItems(mockContext.identityId, "photos"), []);
      queryClient.setQueryData(queryKeys.storageItems(mockContext.identityId, "photos/folder"), []);
      queryClient.setQueryData(queryKeys.storageItems(mockContext.identityId, "documents"), []);

      const { result } = renderHook(() => useDeleteMutation(mockContext), {
        wrapper: createTestProviderWithQueryClient(queryClient),
      });

      // photos/folder を削除
      await result.current.mutateAsync({
        items: [{ key: "media/user-123/photos/folder/", name: "folder", type: "folder" }],
      });

      // documents キャッシュは無効化されていないこと
      await waitFor(() => {
        expect(
          queryClient.getQueryState(queryKeys.storageItems(mockContext.identityId, "photos/folder"))
            ?.isInvalidated,
        ).toBe(true);
        expect(
          queryClient.getQueryState(queryKeys.storageItems(mockContext.identityId, "documents"))
            ?.isInvalidated,
        ).toBeFalsy();
      });
    });
  });
});
