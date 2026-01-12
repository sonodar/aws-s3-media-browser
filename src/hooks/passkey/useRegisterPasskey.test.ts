import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { useRegisterPasskey } from "./useRegisterPasskey";
import { TestProvider } from "../../stores/testProvider";

vi.mock("aws-amplify/auth", () => ({
  associateWebAuthnCredential: vi.fn(),
}));

import { associateWebAuthnCredential } from "aws-amplify/auth";

describe("useRegisterPasskey", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(associateWebAuthnCredential).mockResolvedValue(undefined);
  });

  it("should start with idle state", () => {
    const { result } = renderHook(() => useRegisterPasskey(), {
      wrapper: TestProvider,
    });

    expect(result.current.isPending).toBe(false);
    expect(result.current.isError).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("should set isPending true while registering", async () => {
    let resolveRegister: () => void;
    const registerPromise = new Promise<void>((resolve) => {
      resolveRegister = resolve;
    });
    vi.mocked(associateWebAuthnCredential).mockReturnValue(registerPromise);

    const { result } = renderHook(() => useRegisterPasskey(), {
      wrapper: TestProvider,
    });

    expect(result.current.isPending).toBe(false);

    act(() => {
      result.current.mutate();
    });

    await waitFor(() => {
      expect(result.current.isPending).toBe(true);
    });

    await act(async () => {
      resolveRegister!();
      await registerPromise;
    });

    await waitFor(() => {
      expect(result.current.isPending).toBe(false);
    });
  });

  it("should call associateWebAuthnCredential on mutate", async () => {
    const { result } = renderHook(() => useRegisterPasskey(), {
      wrapper: TestProvider,
    });

    await act(async () => {
      await result.current.mutateAsync();
    });

    expect(associateWebAuthnCredential).toHaveBeenCalledTimes(1);
  });

  it("should set error on failure", async () => {
    const error = new Error("Registration failed");
    vi.mocked(associateWebAuthnCredential).mockRejectedValue(error);

    const { result } = renderHook(() => useRegisterPasskey(), {
      wrapper: TestProvider,
    });

    await act(async () => {
      try {
        await result.current.mutateAsync();
      } catch {
        // Expected to throw
      }
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.error?.message).toBe("Registration failed");
  });
});
