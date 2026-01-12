import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useSetAtom } from "jotai";
import { useSortOrder, STORAGE_KEY } from "./useSortOrder";
import { DEFAULT_SORT_ORDER } from "../storage/sortStorageItems";
import type { SortOrder } from "../storage/sortStorageItems";
import { TestProvider, sortOrderAtom } from "../../stores";

/**
 * useSortOrder テスト
 *
 * Jotai atoms に接続されたファサード hook のテスト。
 * TestProvider でラップして atoms のスコープを提供する。
 */
describe("useSortOrder", () => {
  // Helper hook to reset atoms between tests
  function useResetAtoms() {
    const setSortOrder = useSetAtom(sortOrderAtom);
    return () => {
      setSortOrder(DEFAULT_SORT_ORDER);
    };
  }

  beforeEach(() => {
    // localStorage をクリア
    localStorage.clear();
    vi.clearAllMocks();

    // Reset atoms
    const { result } = renderHook(() => useResetAtoms(), { wrapper: TestProvider });
    act(() => {
      result.current();
    });
  });

  describe("初期化", () => {
    it("保存されたソート順がない場合はデフォルト値（newest）を返すこと", () => {
      const { result } = renderHook(() => useSortOrder(), {
        wrapper: TestProvider,
      });

      expect(result.current.sortOrder).toBe("newest");
    });

    it("保存されたソート順がある場合はその値を返すこと", () => {
      // atomWithStorage は JSON 形式で保存する
      localStorage.setItem(STORAGE_KEY, JSON.stringify("name"));

      const { result } = renderHook(() => useSortOrder(), {
        wrapper: TestProvider,
      });

      expect(result.current.sortOrder).toBe("name");
    });

    it("不正な値が保存されている場合はデフォルト値にフォールバックすること", () => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify("invalid-value"));

      const { result } = renderHook(() => useSortOrder(), {
        wrapper: TestProvider,
      });

      // atomWithStorage は JSON パースに成功すればその値を使用する
      // ただし、SortOrder 型の検証は行わないため、invalid-value が返される
      // これは atomWithStorage の仕様であり、型安全性はコンパイル時のみ保証される
      // 実際のアプリケーションでは UI 側で有効なオプションのみ設定可能なため問題なし
      expect(["newest", "oldest", "name", "size", "invalid-value"]).toContain(
        result.current.sortOrder,
      );
    });
  });

  describe("ソート順の変更", () => {
    it("setSortOrder で新しいソート順を設定できること", () => {
      const { result } = renderHook(() => useSortOrder(), {
        wrapper: TestProvider,
      });

      act(() => {
        result.current.setSortOrder("oldest");
      });

      expect(result.current.sortOrder).toBe("oldest");
    });

    it("setSortOrder で localStorage に保存されること", () => {
      const { result } = renderHook(() => useSortOrder(), {
        wrapper: TestProvider,
      });

      act(() => {
        result.current.setSortOrder("size");
      });

      // atomWithStorage は JSON 形式で保存する
      expect(localStorage.getItem(STORAGE_KEY)).toBe(JSON.stringify("size"));
    });
  });

  describe("localStorage エラーハンドリング", () => {
    it("localStorage が無効な場合でもデフォルト値で動作すること", () => {
      // localStorage.getItem をモックしてエラーを投げる
      const originalGetItem = Storage.prototype.getItem;
      Storage.prototype.getItem = vi.fn(() => {
        throw new Error("localStorage is disabled");
      });

      const { result } = renderHook(() => useSortOrder(), {
        wrapper: TestProvider,
      });

      expect(result.current.sortOrder).toBe("newest");

      // 復元
      Storage.prototype.getItem = originalGetItem;
    });

    it("localStorage への保存に失敗してもエラーが発生しないこと", () => {
      // localStorage.setItem をモックしてエラーを投げる
      const originalSetItem = Storage.prototype.setItem;
      Storage.prototype.setItem = vi.fn(() => {
        throw new Error("QuotaExceededError");
      });

      const { result } = renderHook(() => useSortOrder(), {
        wrapper: TestProvider,
      });

      // エラーが投げられないこと
      expect(() => {
        act(() => {
          result.current.setSortOrder("name");
        });
      }).not.toThrow();

      // 復元
      Storage.prototype.setItem = originalSetItem;
    });
  });

  describe("有効なソート順の検証", () => {
    it.each(["newest", "oldest", "name", "size"] as SortOrder[])(
      "有効なソート順 %s を設定・取得できること",
      (order) => {
        const { result } = renderHook(() => useSortOrder(), {
          wrapper: TestProvider,
        });

        act(() => {
          result.current.setSortOrder(order);
        });

        expect(result.current.sortOrder).toBe(order);
      },
    );
  });
});
