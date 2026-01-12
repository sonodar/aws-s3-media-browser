import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useWebAuthnSupport } from "./useWebAuthnSupport";

describe("useWebAuthnSupport", () => {
  const originalPublicKeyCredential = window.PublicKeyCredential;

  afterEach(() => {
    // Restore original
    if (originalPublicKeyCredential) {
      Object.defineProperty(window, "PublicKeyCredential", {
        value: originalPublicKeyCredential,
        writable: true,
        configurable: true,
      });
    } else {
      // @ts-expect-error - deleting property for test cleanup
      delete window.PublicKeyCredential;
    }
  });

  describe("when WebAuthn is not supported", () => {
    beforeEach(() => {
      // @ts-expect-error - deleting property for test
      delete window.PublicKeyCredential;
    });

    it("should return isSupported as false", () => {
      const { result } = renderHook(() => useWebAuthnSupport());
      expect(result.current.isSupported).toBe(false);
    });
  });

  describe("when WebAuthn is supported but platform authenticator is not available", () => {
    beforeEach(() => {
      Object.defineProperty(window, "PublicKeyCredential", {
        value: {
          isUserVerifyingPlatformAuthenticatorAvailable: vi.fn().mockResolvedValue(false),
        },
        writable: true,
        configurable: true,
      });
    });

    it("should return isSupported as false", async () => {
      const { result } = renderHook(() => useWebAuthnSupport());

      await waitFor(() => {
        expect(result.current.isSupported).toBe(false);
      });
    });
  });

  describe("when WebAuthn and platform authenticator are available", () => {
    beforeEach(() => {
      Object.defineProperty(window, "PublicKeyCredential", {
        value: {
          isUserVerifyingPlatformAuthenticatorAvailable: vi.fn().mockResolvedValue(true),
        },
        writable: true,
        configurable: true,
      });
    });

    it("should return isSupported as true", async () => {
      const { result } = renderHook(() => useWebAuthnSupport());

      await waitFor(() => {
        expect(result.current.isSupported).toBe(true);
      });
    });
  });

  describe("when isUserVerifyingPlatformAuthenticatorAvailable throws", () => {
    beforeEach(() => {
      Object.defineProperty(window, "PublicKeyCredential", {
        value: {
          isUserVerifyingPlatformAuthenticatorAvailable: vi
            .fn()
            .mockRejectedValue(new Error("Not supported")),
        },
        writable: true,
        configurable: true,
      });
    });

    it("should return isSupported as false", async () => {
      const { result } = renderHook(() => useWebAuthnSupport());

      await waitFor(() => {
        expect(result.current.isSupported).toBe(false);
      });
    });
  });
});
