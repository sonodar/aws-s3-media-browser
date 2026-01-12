import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { usePasskeyCredentials } from "./usePasskeyCredentials";
import { TestProvider } from "../../stores/testProvider";

vi.mock("aws-amplify/auth", () => ({
  listWebAuthnCredentials: vi.fn(),
}));

import { listWebAuthnCredentials } from "aws-amplify/auth";

describe("usePasskeyCredentials", () => {
  const mockCredentials = [
    {
      credentialId: "cred-1",
      friendlyCredentialName: "My MacBook",
      relyingPartyId: "localhost",
      createdAt: new Date("2024-01-01T00:00:00Z"),
    },
    {
      credentialId: "cred-2",
      friendlyCredentialName: "My iPhone",
      relyingPartyId: "localhost",
      createdAt: new Date("2024-01-02T00:00:00Z"),
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(listWebAuthnCredentials).mockResolvedValue({
      credentials: mockCredentials,
      nextToken: undefined,
    });
  });

  it("should start with loading true and credentials undefined", () => {
    vi.mocked(listWebAuthnCredentials).mockImplementation(() => new Promise(() => {}));

    const { result } = renderHook(() => usePasskeyCredentials(), {
      wrapper: TestProvider,
    });

    expect(result.current.isLoading).toBe(true);
    expect(result.current.data).toBeUndefined();
    expect(result.current.error).toBeNull();
  });

  it("should return credentials after successful fetch", async () => {
    const { result } = renderHook(() => usePasskeyCredentials(), {
      wrapper: TestProvider,
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toHaveLength(2);
    expect(result.current.data?.[0].credentialId).toBe("cred-1");
    expect(result.current.data?.[1].credentialId).toBe("cred-2");
    expect(result.current.error).toBeNull();
  });

  it("should handle pagination with nextToken", async () => {
    const page1 = {
      credentials: [mockCredentials[0]],
      nextToken: "token-1",
    };
    const page2 = {
      credentials: [mockCredentials[1]],
      nextToken: undefined,
    };

    vi.mocked(listWebAuthnCredentials).mockResolvedValueOnce(page1).mockResolvedValueOnce(page2);

    const { result } = renderHook(() => usePasskeyCredentials(), {
      wrapper: TestProvider,
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(listWebAuthnCredentials).toHaveBeenCalledTimes(2);
    expect(listWebAuthnCredentials).toHaveBeenNthCalledWith(1, undefined);
    expect(listWebAuthnCredentials).toHaveBeenNthCalledWith(2, { nextToken: "token-1" });
    expect(result.current.data).toHaveLength(2);
  });

  it("should handle errors", async () => {
    const error = new Error("Failed to fetch");
    vi.mocked(listWebAuthnCredentials).mockRejectedValue(error);

    const { result } = renderHook(() => usePasskeyCredentials(), {
      wrapper: TestProvider,
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.error?.message).toBe("Failed to fetch");
    expect(result.current.data).toBeUndefined();
  });

  it("should filter out credentials with missing required fields", async () => {
    const mixedCredentials = [
      mockCredentials[0],
      {
        credentialId: undefined, // missing
        friendlyCredentialName: "Invalid",
        relyingPartyId: "localhost",
        createdAt: new Date(),
      },
      mockCredentials[1],
    ];

    vi.mocked(listWebAuthnCredentials).mockResolvedValue({
      credentials: mixedCredentials,
      nextToken: undefined,
    });

    const { result } = renderHook(() => usePasskeyCredentials(), {
      wrapper: TestProvider,
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Only valid credentials should be returned (2 out of 3)
    expect(result.current.data).toHaveLength(2);
  });
});
