import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useSortOrder, STORAGE_KEY } from "./useSortOrder";
import type { SortOrder } from "./sortStorageItems";

describe("useSortOrder", () => {
  beforeEach(() => {
    // localStorage をクリア
    localStorage.clear();
    vi.clearAllMocks();
  });

  describe("初期化", () => {
    it("保存されたソート順がない場合はデフォルト値（newest）を返すこと", () => {
      const { result } = renderHook(() => useSortOrder());

      expect(result.current.sortOrder).toBe("newest");
    });

    it("保存されたソート順がある場合はその値を返すこと", () => {
      localStorage.setItem(STORAGE_KEY, "name");

      const { result } = renderHook(() => useSortOrder());

      expect(result.current.sortOrder).toBe("name");
    });

    it("不正な値が保存されている場合はデフォルト値にフォールバックすること", () => {
      localStorage.setItem(STORAGE_KEY, "invalid-value");

      const { result } = renderHook(() => useSortOrder());

      expect(result.current.sortOrder).toBe("newest");
    });
  });

  describe("ソート順の変更", () => {
    it("setSortOrder で新しいソート順を設定できること", () => {
      const { result } = renderHook(() => useSortOrder());

      act(() => {
        result.current.setSortOrder("oldest");
      });

      expect(result.current.sortOrder).toBe("oldest");
    });

    it("setSortOrder で localStorage に保存されること", () => {
      const { result } = renderHook(() => useSortOrder());

      act(() => {
        result.current.setSortOrder("size");
      });

      expect(localStorage.getItem(STORAGE_KEY)).toBe("size");
    });
  });

  describe("localStorage エラーハンドリング", () => {
    it("localStorage が無効な場合でもデフォルト値で動作すること", () => {
      // localStorage.getItem をモックしてエラーを投げる
      const originalGetItem = Storage.prototype.getItem;
      Storage.prototype.getItem = vi.fn(() => {
        throw new Error("localStorage is disabled");
      });

      const { result } = renderHook(() => useSortOrder());

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

      const { result } = renderHook(() => useSortOrder());

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
        const { result } = renderHook(() => useSortOrder());

        act(() => {
          result.current.setSortOrder(order);
        });

        expect(result.current.sortOrder).toBe(order);
      },
    );
  });
});
