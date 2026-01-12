import { describe, it, expect } from "vitest";
import { queryClient, queryClientOptions } from "./queryClient";

describe("queryClient", () => {
  describe("queryClientOptions", () => {
    it("should have staleTime set to 5 minutes", () => {
      expect(queryClientOptions.queries?.staleTime).toBe(5 * 60 * 1000);
    });

    it("should have gcTime set to 30 minutes", () => {
      expect(queryClientOptions.queries?.gcTime).toBe(30 * 60 * 1000);
    });

    it("should have retry set to 3", () => {
      expect(queryClientOptions.queries?.retry).toBe(3);
    });

    it("should have refetchOnWindowFocus set to false", () => {
      expect(queryClientOptions.queries?.refetchOnWindowFocus).toBe(false);
    });
  });

  describe("queryClient instance", () => {
    it("should be a QueryClient instance", () => {
      expect(queryClient).toBeDefined();
      expect(queryClient.getQueryCache).toBeDefined();
      expect(queryClient.getMutationCache).toBeDefined();
    });

    it("should have the correct default options", () => {
      const defaultOptions = queryClient.getDefaultOptions();
      expect(defaultOptions.queries?.staleTime).toBe(5 * 60 * 1000);
      expect(defaultOptions.queries?.gcTime).toBe(30 * 60 * 1000);
      expect(defaultOptions.queries?.retry).toBe(3);
      expect(defaultOptions.queries?.refetchOnWindowFocus).toBe(false);
    });
  });
});
