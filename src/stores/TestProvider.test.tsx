import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { atom, useAtom, useAtomValue } from "jotai";
import { atomWithReset } from "jotai/utils";
import { TestProvider, createTestProvider } from "./TestProvider";

// Task 1.3: テスト用ユーティリティのテスト

describe("TestProvider", () => {
  describe("basic functionality", () => {
    it("provides atom scope for tests", () => {
      const countAtom = atom(0);

      const { result } = renderHook(() => useAtom(countAtom), {
        wrapper: TestProvider,
      });

      expect(result.current[0]).toBe(0);
    });

    it("allows updating atom state", () => {
      const countAtom = atom(0);

      const { result } = renderHook(() => useAtom(countAtom), {
        wrapper: TestProvider,
      });

      act(() => {
        result.current[1](10);
      });

      expect(result.current[0]).toBe(10);
    });
  });

  describe("state isolation", () => {
    it("isolates state between different TestProvider instances", () => {
      const countAtom = atom(0);

      const { result: result1 } = renderHook(() => useAtom(countAtom), {
        wrapper: TestProvider,
      });
      const { result: result2 } = renderHook(() => useAtom(countAtom), {
        wrapper: TestProvider,
      });

      // Update in first provider
      act(() => {
        result1.current[1](100);
      });

      // First updated, second unchanged
      expect(result1.current[0]).toBe(100);
      expect(result2.current[0]).toBe(0);
    });
  });

  describe("createTestProvider with initial values", () => {
    it("creates provider with hydrated initial values", () => {
      const countAtom = atom(0);
      const nameAtom = atom("default");

      const ProviderWithInitialValues = createTestProvider([
        [countAtom, 42],
        [nameAtom, "test"],
      ]);

      const { result } = renderHook(
        () => ({
          count: useAtomValue(countAtom),
          name: useAtomValue(nameAtom),
        }),
        { wrapper: ProviderWithInitialValues },
      );

      expect(result.current.count).toBe(42);
      expect(result.current.name).toBe("test");
    });

    it("allows updating hydrated values", () => {
      const countAtom = atom(0);
      const ProviderWithInitialValues = createTestProvider([[countAtom, 100]]);

      const { result } = renderHook(() => useAtom(countAtom), {
        wrapper: ProviderWithInitialValues,
      });

      expect(result.current[0]).toBe(100);

      act(() => {
        result.current[1](200);
      });

      expect(result.current[0]).toBe(200);
    });

    it("works with atomWithReset", () => {
      const resettableAtom = atomWithReset(0);
      const ProviderWithInitialValues = createTestProvider([[resettableAtom, 50]]);

      const { result } = renderHook(() => useAtomValue(resettableAtom), {
        wrapper: ProviderWithInitialValues,
      });

      expect(result.current).toBe(50);
    });
  });
});
