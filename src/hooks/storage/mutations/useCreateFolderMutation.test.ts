/**
 * useCreateFolderMutation フックのテスト
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { uploadData } from "aws-amplify/storage";
import { TestProvider } from "../../../stores/TestProvider";
import { useCreateFolderMutation } from "./useCreateFolderMutation";

vi.mock("aws-amplify/storage", () => ({
  uploadData: vi.fn(),
}));

describe("useCreateFolderMutation", () => {
  const mockContext = {
    identityId: "test-identity-id",
    currentPath: "photos",
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return mutation with initial state", () => {
    const { result } = renderHook(() => useCreateFolderMutation(mockContext), {
      wrapper: TestProvider,
    });

    expect(result.current.isPending).toBe(false);
    expect(result.current.isError).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("should create folder and return folder path", async () => {
    vi.mocked(uploadData).mockResolvedValue({
      path: "test-path",
      result: Promise.resolve({}),
    } as never);

    const { result } = renderHook(() => useCreateFolderMutation(mockContext), {
      wrapper: TestProvider,
    });

    const folderPath = await result.current.mutateAsync({
      name: "new-folder",
      basePath: "media/user-123/photos/",
    });

    expect(folderPath).toBe("media/user-123/photos/new-folder/");
    expect(uploadData).toHaveBeenCalledWith({
      path: "media/user-123/photos/new-folder/",
      data: "",
    });
  });

  it("should set isPending to true during folder creation", async () => {
    vi.mocked(uploadData).mockResolvedValue({
      path: "test-path",
      result: Promise.resolve({}),
    } as never);

    const { result } = renderHook(() => useCreateFolderMutation(mockContext), {
      wrapper: TestProvider,
    });

    // 初期状態は isPending = false
    expect(result.current.isPending).toBe(false);

    await result.current.mutateAsync({
      name: "new-folder",
      basePath: "media/",
    });

    // mutation 完了後は isPending = false
    await waitFor(() => {
      expect(result.current.isPending).toBe(false);
    });

    // uploadData が呼ばれたことを確認
    expect(uploadData).toHaveBeenCalled();
  });

  it("should set isError to true when folder creation fails", async () => {
    const createError = new Error("Folder creation failed");
    vi.mocked(uploadData).mockRejectedValue(createError);

    const { result } = renderHook(() => useCreateFolderMutation(mockContext), {
      wrapper: TestProvider,
    });

    await expect(
      result.current.mutateAsync({
        name: "new-folder",
        basePath: "media/",
      }),
    ).rejects.toThrow("Folder creation failed");

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
      expect(result.current.error).toEqual(createError);
    });
  });

  it("should handle folder names with special characters", async () => {
    vi.mocked(uploadData).mockResolvedValue({
      path: "test-path",
      result: Promise.resolve({}),
    } as never);

    const { result } = renderHook(() => useCreateFolderMutation(mockContext), {
      wrapper: TestProvider,
    });

    const folderPath = await result.current.mutateAsync({
      name: "日本語フォルダ",
      basePath: "media/",
    });

    expect(folderPath).toBe("media/日本語フォルダ/");
    expect(uploadData).toHaveBeenCalledWith({
      path: "media/日本語フォルダ/",
      data: "",
    });
  });
});
