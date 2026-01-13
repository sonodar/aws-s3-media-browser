/**
 * useRenameMutation フックのテスト
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { list, copy, remove } from "aws-amplify/storage";
import { TestProvider } from "../../../stores/TestProvider";
import { useRenameMutation } from "./useRenameMutation";

vi.mock("aws-amplify/storage", () => ({
  list: vi.fn(),
  copy: vi.fn(),
  remove: vi.fn(),
}));

describe("useRenameMutation", () => {
  const mockContext = {
    identityId: "test-identity-id",
    currentPath: "photos",
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return mutation with initial state", () => {
    const { result } = renderHook(() => useRenameMutation(mockContext), {
      wrapper: TestProvider,
    });

    expect(result.current.isPending).toBe(false);
    expect(result.current.isError).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("should rename file successfully", async () => {
    vi.mocked(list).mockResolvedValue({ items: [] } as never);
    vi.mocked(copy).mockResolvedValue({ path: "test-path" } as never);
    vi.mocked(remove).mockResolvedValue({ path: "test-path" });

    const { result } = renderHook(() => useRenameMutation(mockContext), {
      wrapper: TestProvider,
    });

    const renameResult = await result.current.mutateAsync({
      currentKey: "media/photos/old.jpg",
      newName: "new.jpg",
      isFolder: false,
    });

    expect(renameResult.success).toBe(true);
    expect(copy).toHaveBeenCalled();
    expect(remove).toHaveBeenCalled();
  });

  it("should detect duplicate file name", async () => {
    vi.mocked(list).mockResolvedValue({
      items: [{ path: "media/photos/new.jpg" }],
    } as never);

    const { result } = renderHook(() => useRenameMutation(mockContext), {
      wrapper: TestProvider,
    });

    const renameResult = await result.current.mutateAsync({
      currentKey: "media/photos/old.jpg",
      newName: "new.jpg",
      isFolder: false,
    });

    expect(renameResult.success).toBe(false);
    expect(renameResult.error).toContain("既に存在");
    expect(copy).not.toHaveBeenCalled();
  });

  it("should rename folder successfully", async () => {
    vi.mocked(list)
      .mockResolvedValueOnce({ items: [] } as never) // target check
      .mockResolvedValueOnce({
        items: [
          { path: "media/photos/old-folder/file1.jpg" },
          { path: "media/photos/old-folder/file2.jpg" },
        ],
      } as never); // source contents
    vi.mocked(copy).mockResolvedValue({ path: "test-path" } as never);
    vi.mocked(remove).mockResolvedValue({ path: "test-path" });

    const { result } = renderHook(() => useRenameMutation(mockContext), {
      wrapper: TestProvider,
    });

    const renameResult = await result.current.mutateAsync({
      currentKey: "media/photos/old-folder/",
      newName: "new-folder",
      isFolder: true,
    });

    expect(renameResult.success).toBe(true);
    expect(renameResult.succeeded).toBe(2);
    expect(copy).toHaveBeenCalledTimes(2);
  });

  it("should call onProgress callback for folder rename", async () => {
    vi.mocked(list)
      .mockResolvedValueOnce({ items: [] } as never)
      .mockResolvedValueOnce({
        items: [{ path: "media/folder/file1.jpg" }, { path: "media/folder/file2.jpg" }],
      } as never);
    vi.mocked(copy).mockResolvedValue({ path: "test-path" } as never);
    vi.mocked(remove).mockResolvedValue({ path: "test-path" });

    const { result } = renderHook(() => useRenameMutation(mockContext), {
      wrapper: TestProvider,
    });

    const onProgress = vi.fn();

    await result.current.mutateAsync({
      currentKey: "media/folder/",
      newName: "new-folder",
      isFolder: true,
      onProgress,
    });

    expect(onProgress).toHaveBeenCalledWith({ current: 1, total: 2 });
    expect(onProgress).toHaveBeenCalledWith({ current: 2, total: 2 });
  });

  it("should return warning when delete fails after successful copy", async () => {
    vi.mocked(list).mockResolvedValue({ items: [] } as never);
    vi.mocked(copy).mockResolvedValue({ path: "test-path" } as never);
    vi.mocked(remove).mockRejectedValue(new Error("Delete failed"));

    const { result } = renderHook(() => useRenameMutation(mockContext), {
      wrapper: TestProvider,
    });

    const renameResult = await result.current.mutateAsync({
      currentKey: "media/photos/old.jpg",
      newName: "new.jpg",
      isFolder: false,
    });

    expect(renameResult.success).toBe(true);
    expect(renameResult.warning).toContain("削除に失敗");
  });

  it("should set isPending to true during rename", async () => {
    vi.mocked(list).mockResolvedValue({ items: [] } as never);
    let resolveCopy: () => void;
    const copyPromise = new Promise<{ path: string }>((resolve) => {
      resolveCopy = () => resolve({ path: "test" });
    });
    vi.mocked(copy).mockReturnValue(copyPromise as never);
    vi.mocked(remove).mockResolvedValue({ path: "test-path" });

    const { result } = renderHook(() => useRenameMutation(mockContext), {
      wrapper: TestProvider,
    });

    const mutationPromise = result.current.mutateAsync({
      currentKey: "media/old.jpg",
      newName: "new.jpg",
      isFolder: false,
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
});
