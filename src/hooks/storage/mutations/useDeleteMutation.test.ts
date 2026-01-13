/**
 * useDeleteMutation フックのテスト
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { list, remove } from "aws-amplify/storage";
import { TestProvider } from "../../../stores/TestProvider";
import { useDeleteMutation } from "./useDeleteMutation";

vi.mock("aws-amplify/storage", () => ({
  list: vi.fn(),
  remove: vi.fn(),
}));

describe("useDeleteMutation", () => {
  const mockContext = {
    identityId: "test-identity-id",
    currentPath: "photos",
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return mutation with initial state", () => {
    const { result } = renderHook(() => useDeleteMutation(mockContext), {
      wrapper: TestProvider,
    });

    expect(result.current.isPending).toBe(false);
    expect(result.current.isError).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("should delete single file successfully", async () => {
    vi.mocked(remove).mockResolvedValue({ path: "test-path" });

    const { result } = renderHook(() => useDeleteMutation(mockContext), {
      wrapper: TestProvider,
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
      wrapper: TestProvider,
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
      wrapper: TestProvider,
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
      wrapper: TestProvider,
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
});
