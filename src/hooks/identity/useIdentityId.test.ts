import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useIdentityId } from "./useIdentityId";
import { TestProvider } from "../../stores/TestProvider";

// Mock fetchAuthSession
vi.mock("aws-amplify/auth", () => ({
  fetchAuthSession: vi.fn(),
}));

import { fetchAuthSession } from "aws-amplify/auth";

describe("useIdentityId", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should start with loading true and identityId null", () => {
    vi.mocked(fetchAuthSession).mockImplementation(() => new Promise(() => {}));

    const { result } = renderHook(() => useIdentityId(), {
      wrapper: TestProvider,
    });

    expect(result.current.loading).toBe(true);
    expect(result.current.identityId).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it("should return identityId after successful auth session fetch", async () => {
    vi.mocked(fetchAuthSession).mockResolvedValue({
      identityId: "test-identity-id",
    } as Awaited<ReturnType<typeof fetchAuthSession>>);

    const { result } = renderHook(() => useIdentityId(), {
      wrapper: TestProvider,
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.identityId).toBe("test-identity-id");
    expect(result.current.error).toBeNull();
  });

  it("should set error when auth session fetch fails", async () => {
    const mockError = new Error("Auth failed");
    vi.mocked(fetchAuthSession).mockRejectedValue(mockError);

    const { result } = renderHook(() => useIdentityId(), {
      wrapper: TestProvider,
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.identityId).toBeNull();
    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.error?.message).toBe("Auth failed");
  });

  it("should handle missing identityId in session", async () => {
    vi.mocked(fetchAuthSession).mockResolvedValue({
      // identityId is undefined
    } as Awaited<ReturnType<typeof fetchAuthSession>>);

    const { result } = renderHook(() => useIdentityId(), {
      wrapper: TestProvider,
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.identityId).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it("should only fetch once on mount (uses cache)", async () => {
    vi.mocked(fetchAuthSession).mockResolvedValue({
      identityId: "test-identity-id",
    } as Awaited<ReturnType<typeof fetchAuthSession>>);

    const { result, rerender } = renderHook(() => useIdentityId(), {
      wrapper: TestProvider,
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    rerender();
    rerender();

    // TanStack Query はキャッシュを使うので 1 回のみ fetch
    expect(fetchAuthSession).toHaveBeenCalledTimes(1);
  });

  describe("shouldFetch option", () => {
    it("should not fetch when shouldFetch is false", async () => {
      vi.mocked(fetchAuthSession).mockResolvedValue({
        identityId: "test-identity-id",
      } as Awaited<ReturnType<typeof fetchAuthSession>>);

      const { result } = renderHook(() => useIdentityId({ shouldFetch: false }), {
        wrapper: TestProvider,
      });

      // shouldFetch: false の場合は loading も false（クエリが実行されないため）
      expect(result.current.loading).toBe(false);
      expect(result.current.identityId).toBeNull();
      expect(fetchAuthSession).not.toHaveBeenCalled();
    });

    it("should fetch when shouldFetch is true", async () => {
      vi.mocked(fetchAuthSession).mockResolvedValue({
        identityId: "test-identity-id",
      } as Awaited<ReturnType<typeof fetchAuthSession>>);

      const { result } = renderHook(() => useIdentityId({ shouldFetch: true }), {
        wrapper: TestProvider,
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.identityId).toBe("test-identity-id");
      expect(fetchAuthSession).toHaveBeenCalledTimes(1);
    });

    it("should start fetching when shouldFetch changes from false to true", async () => {
      vi.mocked(fetchAuthSession).mockResolvedValue({
        identityId: "test-identity-id",
      } as Awaited<ReturnType<typeof fetchAuthSession>>);

      const { result, rerender } = renderHook(
        ({ shouldFetch }: { shouldFetch: boolean }) => useIdentityId({ shouldFetch }),
        {
          wrapper: TestProvider,
          initialProps: { shouldFetch: false },
        },
      );

      // 最初は fetch されない
      expect(fetchAuthSession).not.toHaveBeenCalled();
      expect(result.current.identityId).toBeNull();

      // shouldFetch を true に変更
      rerender({ shouldFetch: true });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.identityId).toBe("test-identity-id");
      expect(fetchAuthSession).toHaveBeenCalledTimes(1);
    });

    it("should default to shouldFetch when option is not provided", async () => {
      vi.mocked(fetchAuthSession).mockResolvedValue({
        identityId: "test-identity-id",
      } as Awaited<ReturnType<typeof fetchAuthSession>>);

      const { result } = renderHook(() => useIdentityId(), {
        wrapper: TestProvider,
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.identityId).toBe("test-identity-id");
      expect(fetchAuthSession).toHaveBeenCalledTimes(1);
    });
  });
});
