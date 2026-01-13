import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { useDeletePasskey } from "./useDeletePasskey";
import { TestProvider } from "../../stores/TestProvider";

vi.mock("aws-amplify/auth", () => ({
  deleteWebAuthnCredential: vi.fn(),
}));

import { deleteWebAuthnCredential } from "aws-amplify/auth";

describe("useDeletePasskey", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(deleteWebAuthnCredential).mockResolvedValue(undefined);
  });

  it("should start with idle state", () => {
    const { result } = renderHook(() => useDeletePasskey(), {
      wrapper: TestProvider,
    });

    expect(result.current.isPending).toBe(false);
    expect(result.current.isError).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("should set isPending true while deleting", async () => {
    let resolveDelete: () => void;
    const deletePromise = new Promise<void>((resolve) => {
      resolveDelete = resolve;
    });
    vi.mocked(deleteWebAuthnCredential).mockReturnValue(deletePromise);

    const { result } = renderHook(() => useDeletePasskey(), {
      wrapper: TestProvider,
    });

    expect(result.current.isPending).toBe(false);

    act(() => {
      result.current.mutate({ credentialId: "cred-1" });
    });

    await waitFor(() => {
      expect(result.current.isPending).toBe(true);
    });

    await act(async () => {
      resolveDelete!();
      await deletePromise;
    });

    await waitFor(() => {
      expect(result.current.isPending).toBe(false);
    });
  });

  it("should call deleteWebAuthnCredential with credentialId", async () => {
    const { result } = renderHook(() => useDeletePasskey(), {
      wrapper: TestProvider,
    });

    await act(async () => {
      await result.current.mutateAsync({ credentialId: "cred-123" });
    });

    expect(deleteWebAuthnCredential).toHaveBeenCalledTimes(1);
    expect(deleteWebAuthnCredential).toHaveBeenCalledWith({
      credentialId: "cred-123",
    });
  });

  it("should set error on failure", async () => {
    const error = new Error("Deletion failed");
    vi.mocked(deleteWebAuthnCredential).mockRejectedValue(error);

    const { result } = renderHook(() => useDeletePasskey(), {
      wrapper: TestProvider,
    });

    await act(async () => {
      try {
        await result.current.mutateAsync({ credentialId: "cred-1" });
      } catch {
        // Expected to throw
      }
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.error?.message).toBe("Deletion failed");
  });
});
