/**
 * useMoveMutation フックのテスト
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useQueryClient } from "@tanstack/react-query";
import { list, copy, remove } from "aws-amplify/storage";
import { TestProvider } from "../../../stores/TestProvider";
import { useMoveMutation } from "./useMoveMutation";
import { queryKeys } from "../../../stores/queryKeys";

vi.mock("aws-amplify/storage", () => ({
  list: vi.fn(),
  copy: vi.fn(),
  remove: vi.fn(),
}));

describe("useMoveMutation", () => {
  const mockContext = {
    identityId: "test-identity-id",
    currentPath: "photos",
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return mutation with initial state", () => {
    const { result } = renderHook(() => useMoveMutation(mockContext), {
      wrapper: TestProvider,
    });

    expect(result.current.isPending).toBe(false);
    expect(result.current.isError).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("should move single file successfully", async () => {
    vi.mocked(list).mockResolvedValue({ items: [] } as never);
    vi.mocked(copy).mockResolvedValue({ path: "test-path" } as never);
    vi.mocked(remove).mockResolvedValue({ path: "test-path" });

    const { result } = renderHook(() => useMoveMutation(mockContext), {
      wrapper: TestProvider,
    });

    const moveResult = await result.current.mutateAsync({
      items: [{ key: "media/source/image.jpg", name: "image.jpg", type: "file" }],
      destinationPath: "media/dest",
    });

    expect(moveResult.success).toBe(true);
    expect(moveResult.succeeded).toBe(1);
    expect(moveResult.failed).toBe(0);
    expect(copy).toHaveBeenCalled();
    expect(remove).toHaveBeenCalled();
  });

  it("should detect duplicate files at destination", async () => {
    vi.mocked(list).mockResolvedValue({
      items: [{ path: "media/dest/image.jpg" }],
    } as never);

    const { result } = renderHook(() => useMoveMutation(mockContext), {
      wrapper: TestProvider,
    });

    const moveResult = await result.current.mutateAsync({
      items: [{ key: "media/source/image.jpg", name: "image.jpg", type: "file" }],
      destinationPath: "media/dest",
    });

    expect(moveResult.success).toBe(false);
    expect(moveResult.duplicates).toContain("image.jpg");
    expect(copy).not.toHaveBeenCalled();
  });

  it("should move folder contents", async () => {
    vi.mocked(list)
      .mockResolvedValueOnce({
        items: [
          { path: "media/source/folder/file1.jpg" },
          { path: "media/source/folder/file2.jpg" },
        ],
      } as never)
      .mockResolvedValueOnce({ items: [] } as never);
    vi.mocked(copy).mockResolvedValue({ path: "test-path" } as never);
    vi.mocked(remove).mockResolvedValue({ path: "test-path" });

    const { result } = renderHook(() => useMoveMutation(mockContext), {
      wrapper: TestProvider,
    });

    const moveResult = await result.current.mutateAsync({
      items: [{ key: "media/source/folder/", name: "folder", type: "folder" }],
      destinationPath: "media/dest",
    });

    expect(moveResult.success).toBe(true);
    expect(moveResult.succeeded).toBe(2);
  });

  it("should call onProgress callback", async () => {
    vi.mocked(list).mockResolvedValue({ items: [] } as never);
    vi.mocked(copy).mockResolvedValue({ path: "test-path" } as never);
    vi.mocked(remove).mockResolvedValue({ path: "test-path" });

    const { result } = renderHook(() => useMoveMutation(mockContext), {
      wrapper: TestProvider,
    });

    const onProgress = vi.fn();

    await result.current.mutateAsync({
      items: [
        { key: "media/file1.jpg", name: "file1.jpg", type: "file" },
        { key: "media/file2.jpg", name: "file2.jpg", type: "file" },
      ],
      destinationPath: "media/dest",
      onProgress,
    });

    expect(onProgress).toHaveBeenCalledWith({ current: 1, total: 2 });
    expect(onProgress).toHaveBeenCalledWith({ current: 2, total: 2 });
  });

  it("should set isPending to true during move", async () => {
    vi.mocked(list).mockResolvedValue({ items: [] } as never);
    let resolveCopy: () => void;
    const copyPromise = new Promise<{ path: string }>((resolve) => {
      resolveCopy = () => resolve({ path: "test" });
    });
    vi.mocked(copy).mockReturnValue(copyPromise as never);
    vi.mocked(remove).mockResolvedValue({ path: "test-path" });

    const { result } = renderHook(() => useMoveMutation(mockContext), {
      wrapper: TestProvider,
    });

    const mutationPromise = result.current.mutateAsync({
      items: [{ key: "media/file.jpg", name: "file.jpg", type: "file" }],
      destinationPath: "media/dest",
    });

    await waitFor(() => {
      expect(result.current.isPending).toBe(true);
    });

    resolveCopy!();
    await mutationPromise;

    await waitFor(() => {
      expect(result.current.isPending).toBe(false);
    });
  });

  it("should invalidate both source and destination queries on success", async () => {
    vi.mocked(list).mockResolvedValue({ items: [] } as never);
    vi.mocked(copy).mockResolvedValue({ path: "test-path" } as never);
    vi.mocked(remove).mockResolvedValue({ path: "test-path" });

    // QueryClient の invalidateQueries をスパイ
    const invalidateQueriesSpy = vi.fn();
    const { result } = renderHook(
      () => {
        const queryClient = useQueryClient();
        vi.spyOn(queryClient, "invalidateQueries").mockImplementation(invalidateQueriesSpy);
        return useMoveMutation(mockContext);
      },
      { wrapper: TestProvider },
    );

    await result.current.mutateAsync({
      items: [{ key: "media/test-identity-id/photos/image.jpg", name: "image.jpg", type: "file" }],
      destinationPath: "media/test-identity-id/documents/",
    });

    await waitFor(() => {
      // 移動元の storageItems クエリが無効化される
      expect(invalidateQueriesSpy).toHaveBeenCalledWith({
        queryKey: queryKeys.storageItems(mockContext.identityId, mockContext.currentPath),
      });
      // 移動先の storageItems クエリが無効化される
      expect(invalidateQueriesSpy).toHaveBeenCalledWith({
        queryKey: queryKeys.storageItems(mockContext.identityId, "documents"),
      });
      // 2回だけ呼ばれることを確認（移動元と移動先）
      expect(invalidateQueriesSpy).toHaveBeenCalledTimes(2);
    });
  });
});
