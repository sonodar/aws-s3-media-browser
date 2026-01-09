import { describe, it, expect } from "vitest";
import { atom, useAtom, useAtomValue, useSetAtom } from "jotai";
import { atomWithReset, atomWithStorage, useResetAtom } from "jotai/utils";
import { renderHook, act } from "@testing-library/react";
import type { ReactNode } from "react";
import { Provider } from "jotai";

// Task 1.1: Jotai パッケージの型定義が正しく解決されることを確認

describe("Jotai type definitions", () => {
  describe("core atoms", () => {
    it("atom() creates a primitive atom with correct types", () => {
      const countAtom = atom(0);
      expect(countAtom).toBeDefined();
      expect(countAtom.init).toBe(0);
    });

    it("atom() creates a derived atom with correct types", () => {
      const baseAtom = atom(10);
      const doubledAtom = atom((get) => get(baseAtom) * 2);
      expect(doubledAtom).toBeDefined();
    });

    it("atom() creates an action atom with correct types", () => {
      const countAtom = atom(0);
      const incrementAtom = atom(null, (get, set) => {
        set(countAtom, get(countAtom) + 1);
      });
      expect(incrementAtom).toBeDefined();
    });
  });

  describe("jotai/utils atoms", () => {
    it("atomWithReset creates resettable atom", () => {
      const resettableAtom = atomWithReset(0);
      expect(resettableAtom).toBeDefined();
    });

    it("atomWithStorage creates persistent atom", () => {
      const storageAtom = atomWithStorage("test-key", "default");
      expect(storageAtom).toBeDefined();
    });
  });

  describe("hooks integration", () => {
    it("useAtom works with primitive atom", () => {
      const countAtom = atom(0);
      const wrapper = ({ children }: { children: ReactNode }) => <Provider>{children}</Provider>;

      const { result } = renderHook(() => useAtom(countAtom), { wrapper });

      expect(result.current[0]).toBe(0);
      expect(typeof result.current[1]).toBe("function");
    });

    it("useAtomValue returns atom value", () => {
      const countAtom = atom(42);
      const wrapper = ({ children }: { children: ReactNode }) => <Provider>{children}</Provider>;

      const { result } = renderHook(() => useAtomValue(countAtom), { wrapper });

      expect(result.current).toBe(42);
    });

    it("useSetAtom returns setter function", () => {
      const countAtom = atom(0);
      const wrapper = ({ children }: { children: ReactNode }) => <Provider>{children}</Provider>;

      const { result } = renderHook(() => useSetAtom(countAtom), { wrapper });

      expect(typeof result.current).toBe("function");
    });

    it("useResetAtom works with atomWithReset", () => {
      const resettableAtom = atomWithReset(0);
      const wrapper = ({ children }: { children: ReactNode }) => <Provider>{children}</Provider>;

      const { result } = renderHook(
        () => ({
          value: useAtomValue(resettableAtom),
          setValue: useSetAtom(resettableAtom),
          reset: useResetAtom(resettableAtom),
        }),
        { wrapper },
      );

      // Initial value
      expect(result.current.value).toBe(0);

      // Update value
      act(() => {
        result.current.setValue(100);
      });
      expect(result.current.value).toBe(100);

      // Reset to initial
      act(() => {
        result.current.reset();
      });
      expect(result.current.value).toBe(0);
    });
  });

  describe("Provider isolation", () => {
    it("different Providers have isolated state", () => {
      const countAtom = atom(0);

      const wrapper1 = ({ children }: { children: ReactNode }) => <Provider>{children}</Provider>;
      const wrapper2 = ({ children }: { children: ReactNode }) => <Provider>{children}</Provider>;

      const { result: result1 } = renderHook(() => useAtom(countAtom), {
        wrapper: wrapper1,
      });
      const { result: result2 } = renderHook(() => useAtom(countAtom), {
        wrapper: wrapper2,
      });

      // Update in Provider 1
      act(() => {
        result1.current[1](10);
      });

      // Provider 1 updated, Provider 2 unchanged
      expect(result1.current[0]).toBe(10);
      expect(result2.current[0]).toBe(0);
    });
  });
});
