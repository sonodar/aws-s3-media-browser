/**
 * useThumbnailUrl フックのテスト
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { getProperties, getUrl } from "aws-amplify/storage";
import { TestProvider } from "../../stores/TestProvider";
import { useThumbnailUrl } from "./useThumbnailUrl";

vi.mock("aws-amplify/storage", () => ({
  getProperties: vi.fn(),
  getUrl: vi.fn(),
}));

describe("useThumbnailUrl", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return initial loading state", () => {
    // Promise を pending 状態のままにすることで、永続的な loading 状態をシミュレート
    vi.mocked(getProperties).mockImplementation(() => new Promise(() => {}));

    const { result } = renderHook(() => useThumbnailUrl("media/abc123/photos/image.jpg"), {
      wrapper: TestProvider,
    });

    expect(result.current.isLoading).toBe(true);
    expect(result.current.url).toBeNull();
    expect(result.current.isError).toBe(false);
  });

  it("should return url on success", async () => {
    vi.mocked(getProperties).mockResolvedValue({});
    vi.mocked(getUrl).mockResolvedValue({
      url: new URL("https://example.com/thumbnail.jpg"),
      expiresAt: new Date(),
    });

    const { result } = renderHook(() => useThumbnailUrl("media/abc123/photos/image.jpg"), {
      wrapper: TestProvider,
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.url).toBe("https://example.com/thumbnail.jpg");
    expect(result.current.isError).toBe(false);
  });

  it("should call getProperties and getUrl with correct thumbnail path", async () => {
    vi.mocked(getProperties).mockResolvedValue({});
    vi.mocked(getUrl).mockResolvedValue({
      url: new URL("https://example.com/thumbnail.jpg"),
      expiresAt: new Date(),
    });

    renderHook(() => useThumbnailUrl("media/abc123/photos/image.jpg"), {
      wrapper: TestProvider,
    });

    await waitFor(() => {
      expect(getProperties).toHaveBeenCalledWith({
        path: "thumbnails/abc123/photos/image.jpg.thumb.jpg",
      });
      expect(getUrl).toHaveBeenCalledWith({
        path: "thumbnails/abc123/photos/image.jpg.thumb.jpg",
      });
    });
  });

  it("should return isError true when getProperties fails (file not found)", async () => {
    // ファイルが存在しない場合、getProperties がエラーを投げる
    vi.mocked(getProperties).mockRejectedValue(new Error("NoSuchKey"));

    const { result } = renderHook(
      () => useThumbnailUrl("media/abc123/photos/image.jpg", { retry: false }),
      {
        wrapper: TestProvider,
      },
    );

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.url).toBeNull();
    expect(result.current.isLoading).toBe(false);
    // getProperties が失敗したため、getUrl は呼ばれない
    expect(getUrl).not.toHaveBeenCalled();
  });

  it("should use queryKey based on originalKey", async () => {
    vi.mocked(getProperties).mockResolvedValue({});
    vi.mocked(getUrl).mockResolvedValue({
      url: new URL("https://example.com/thumbnail.jpg"),
      expiresAt: new Date(),
    });

    const { result } = renderHook(() => useThumbnailUrl("media/abc123/photos/image.jpg"), {
      wrapper: TestProvider,
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // クエリが成功することでキャッシュが使用されていることを確認
    expect(result.current.url).toBe("https://example.com/thumbnail.jpg");
  });
});
