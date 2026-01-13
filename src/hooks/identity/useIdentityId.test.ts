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
});
