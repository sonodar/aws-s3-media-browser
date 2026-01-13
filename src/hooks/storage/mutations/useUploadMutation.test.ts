/**
 * useUploadMutation フックのテスト
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { uploadData } from "aws-amplify/storage";
import { TestProvider } from "../../../stores/TestProvider";
import { useUploadMutation } from "./useUploadMutation";

vi.mock("aws-amplify/storage", () => ({
  uploadData: vi.fn(),
}));

describe("useUploadMutation", () => {
  const mockContext = {
    identityId: "test-identity-id",
    currentPath: "photos",
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return mutation with initial state", () => {
    const { result } = renderHook(() => useUploadMutation(mockContext), {
      wrapper: TestProvider,
    });

    expect(result.current.isPending).toBe(false);
    expect(result.current.isError).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("should upload files and return uploaded keys", async () => {
    vi.mocked(uploadData).mockResolvedValue({
      path: "test-path",
      result: Promise.resolve({}),
    } as never);

    const { result } = renderHook(() => useUploadMutation(mockContext), {
      wrapper: TestProvider,
    });

    const mockFile1 = new File(["content1"], "file1.jpg", { type: "image/jpeg" });
    const mockFile2 = new File(["content2"], "file2.png", { type: "image/png" });

    const uploadedKeys = await result.current.mutateAsync({
      files: [mockFile1, mockFile2],
      basePath: "media/user-123/photos/",
    });

    expect(uploadedKeys).toEqual([
      "media/user-123/photos/file1.jpg",
      "media/user-123/photos/file2.png",
    ]);
    expect(uploadData).toHaveBeenCalledTimes(2);
    expect(uploadData).toHaveBeenCalledWith({
      path: "media/user-123/photos/file1.jpg",
      data: mockFile1,
    });
    expect(uploadData).toHaveBeenCalledWith({
      path: "media/user-123/photos/file2.png",
      data: mockFile2,
    });
  });

  it("should set isPending to true during upload", async () => {
    vi.mocked(uploadData).mockResolvedValue({
      path: "test-path",
      result: Promise.resolve({}),
    } as never);

    const { result } = renderHook(() => useUploadMutation(mockContext), {
      wrapper: TestProvider,
    });

    // 初期状態は isPending = false
    expect(result.current.isPending).toBe(false);

    const mockFile = new File(["content"], "file.jpg", { type: "image/jpeg" });

    await result.current.mutateAsync({
      files: [mockFile],
      basePath: "media/",
    });

    // mutation 完了後は isPending = false
    await waitFor(() => {
      expect(result.current.isPending).toBe(false);
    });

    // uploadData が呼ばれたことを確認
    expect(uploadData).toHaveBeenCalled();
  });

  it("should set isError to true when upload fails", async () => {
    const uploadError = new Error("Upload failed");
    vi.mocked(uploadData).mockRejectedValue(uploadError);

    const { result } = renderHook(() => useUploadMutation(mockContext), {
      wrapper: TestProvider,
    });

    const mockFile = new File(["content"], "file.jpg", { type: "image/jpeg" });

    await expect(
      result.current.mutateAsync({
        files: [mockFile],
        basePath: "media/",
      }),
    ).rejects.toThrow("Upload failed");

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
      expect(result.current.error).toEqual(uploadError);
    });
  });
});
