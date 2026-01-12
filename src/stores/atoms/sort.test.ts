import { describe, it, expect, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useAtomValue, useSetAtom } from "jotai";
import { createTestProvider } from "../TestProvider";
import {
  // Primitive atoms
  sortOrderAtom,
  // Action atoms
  setSortOrderAtom,
  toggleSortOrderAtom,
  // Constants
  SORT_STORAGE_KEY,
} from "./sort";
import type { SortOrder } from "../../hooks/storage";

// Task 2.3: Sort Atoms のテスト

describe("Sort Atoms", () => {
  beforeEach(() => {
    // localStorage をクリア
    localStorage.clear();
  });

  describe("Primitive Atoms", () => {
    describe("sortOrderAtom", () => {
      it("has 'newest' as default value", () => {
        const { result } = renderHook(() => useAtomValue(sortOrderAtom), {
          wrapper: createTestProvider([]),
        });

        expect(result.current).toBe("newest");
      });

      it("can be initialized with a different value", () => {
        const TestProvider = createTestProvider([[sortOrderAtom, "name" as SortOrder]]);

        const { result } = renderHook(() => useAtomValue(sortOrderAtom), {
          wrapper: TestProvider,
        });

        expect(result.current).toBe("name");
      });
    });
  });

  describe("Action Atoms", () => {
    describe("setSortOrderAtom", () => {
      it("sets sort order to specified value", () => {
        const { result } = renderHook(
          () => ({
            order: useAtomValue(sortOrderAtom),
            setOrder: useSetAtom(setSortOrderAtom),
          }),
          { wrapper: createTestProvider([]) },
        );

        expect(result.current.order).toBe("newest");

        act(() => {
          result.current.setOrder("oldest");
        });

        expect(result.current.order).toBe("oldest");
      });

      it("can set to all valid sort orders", () => {
        const { result } = renderHook(
          () => ({
            order: useAtomValue(sortOrderAtom),
            setOrder: useSetAtom(setSortOrderAtom),
          }),
          { wrapper: createTestProvider([]) },
        );

        const sortOrders: SortOrder[] = ["newest", "oldest", "name", "size"];

        for (const order of sortOrders) {
          act(() => {
            result.current.setOrder(order);
          });
          expect(result.current.order).toBe(order);
        }
      });
    });

    describe("toggleSortOrderAtom", () => {
      it("toggles between newest and oldest", () => {
        const { result } = renderHook(
          () => ({
            order: useAtomValue(sortOrderAtom),
            toggle: useSetAtom(toggleSortOrderAtom),
          }),
          { wrapper: createTestProvider([[sortOrderAtom, "newest" as SortOrder]]) },
        );

        expect(result.current.order).toBe("newest");

        act(() => {
          result.current.toggle();
        });

        expect(result.current.order).toBe("oldest");

        act(() => {
          result.current.toggle();
        });

        expect(result.current.order).toBe("newest");
      });

      it("changes name to newest when toggled", () => {
        const TestProvider = createTestProvider([[sortOrderAtom, "name" as SortOrder]]);

        const { result } = renderHook(
          () => ({
            order: useAtomValue(sortOrderAtom),
            toggle: useSetAtom(toggleSortOrderAtom),
          }),
          { wrapper: TestProvider },
        );

        expect(result.current.order).toBe("name");

        act(() => {
          result.current.toggle();
        });

        // name の反対は newest（日時ベースではないので newest にフォールバック）
        expect(result.current.order).toBe("newest");
      });

      it("changes size to newest when toggled", () => {
        const TestProvider = createTestProvider([[sortOrderAtom, "size" as SortOrder]]);

        const { result } = renderHook(
          () => ({
            order: useAtomValue(sortOrderAtom),
            toggle: useSetAtom(toggleSortOrderAtom),
          }),
          { wrapper: TestProvider },
        );

        expect(result.current.order).toBe("size");

        act(() => {
          result.current.toggle();
        });

        // size の反対は newest（サイズベースではないので newest にフォールバック）
        expect(result.current.order).toBe("newest");
      });
    });
  });

  describe("Storage Key", () => {
    it("exports correct storage key", () => {
      expect(SORT_STORAGE_KEY).toBe("s3-photo-browser:sort-order");
    });
  });

  describe("Debug Labels", () => {
    it("has debugLabel on sortOrderAtom", () => {
      expect(sortOrderAtom.debugLabel).toBe("sort/order");
    });
  });
});
