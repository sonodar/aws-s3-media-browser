import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useAtomValue, useSetAtom } from "jotai";
import { useResetAtom } from "jotai/utils";
import { createTestProvider } from "../TestProvider";
import {
  // Primitive atoms
  selectedKeysAtom,
  isSelectionModeAtom,
  itemKeysAtom,
  // Derived atoms
  selectedCountAtom,
  isAllSelectedAtom,
  // Action atoms
  toggleSelectionAtom,
  enterSelectionModeAtom,
  exitSelectionModeAtom,
  toggleSelectAllAtom,
  clearSelectionAtom,
} from "./selection";

// Task 2.1: Selection Atoms のテスト

describe("Selection Atoms", () => {
  describe("Primitive Atoms", () => {
    describe("selectedKeysAtom", () => {
      it("has empty Set as initial value", () => {
        const { result } = renderHook(() => useAtomValue(selectedKeysAtom), {
          wrapper: createTestProvider([]),
        });

        expect(result.current).toBeInstanceOf(Set);
        expect(result.current.size).toBe(0);
      });

      it("can be reset to empty Set", () => {
        const TestProvider = createTestProvider([[selectedKeysAtom, new Set(["key1", "key2"])]]);

        const { result } = renderHook(
          () => ({
            keys: useAtomValue(selectedKeysAtom),
            reset: useResetAtom(selectedKeysAtom),
          }),
          { wrapper: TestProvider },
        );

        expect(result.current.keys.size).toBe(2);

        act(() => {
          result.current.reset();
        });

        expect(result.current.keys.size).toBe(0);
      });
    });

    describe("isSelectionModeAtom", () => {
      it("has false as initial value", () => {
        const { result } = renderHook(() => useAtomValue(isSelectionModeAtom), {
          wrapper: createTestProvider([]),
        });

        expect(result.current).toBe(false);
      });
    });

    describe("itemKeysAtom", () => {
      it("has empty array as initial value", () => {
        const { result } = renderHook(() => useAtomValue(itemKeysAtom), {
          wrapper: createTestProvider([]),
        });

        expect(result.current).toEqual([]);
      });
    });
  });

  describe("Derived Atoms", () => {
    describe("selectedCountAtom", () => {
      it("returns 0 when no items selected", () => {
        const { result } = renderHook(() => useAtomValue(selectedCountAtom), {
          wrapper: createTestProvider([]),
        });

        expect(result.current).toBe(0);
      });

      it("returns correct count when items are selected", () => {
        const TestProvider = createTestProvider([
          [selectedKeysAtom, new Set(["key1", "key2", "key3"])],
          [itemKeysAtom, ["key1", "key2", "key3"]], // filteredSelectedKeysAtom がフィルタリングに使用
        ]);

        const { result } = renderHook(() => useAtomValue(selectedCountAtom), {
          wrapper: TestProvider,
        });

        expect(result.current).toBe(3);
      });
    });

    describe("isAllSelectedAtom", () => {
      it("returns false when itemKeys is empty", () => {
        const { result } = renderHook(() => useAtomValue(isAllSelectedAtom), {
          wrapper: createTestProvider([]),
        });

        expect(result.current).toBe(false);
      });

      it("returns false when not all items are selected", () => {
        const TestProvider = createTestProvider([
          [itemKeysAtom, ["key1", "key2", "key3"]],
          [selectedKeysAtom, new Set(["key1", "key2"])],
        ]);

        const { result } = renderHook(() => useAtomValue(isAllSelectedAtom), {
          wrapper: TestProvider,
        });

        expect(result.current).toBe(false);
      });

      it("returns true when all items are selected", () => {
        const TestProvider = createTestProvider([
          [itemKeysAtom, ["key1", "key2", "key3"]],
          [selectedKeysAtom, new Set(["key1", "key2", "key3"])],
        ]);

        const { result } = renderHook(() => useAtomValue(isAllSelectedAtom), {
          wrapper: TestProvider,
        });

        expect(result.current).toBe(true);
      });

      it("filters out selected keys not in itemKeys", () => {
        const TestProvider = createTestProvider([
          [itemKeysAtom, ["key1", "key2"]],
          [selectedKeysAtom, new Set(["key1", "key2", "key3"])], // key3 is not in itemKeys
        ]);

        const { result } = renderHook(() => useAtomValue(isAllSelectedAtom), {
          wrapper: TestProvider,
        });

        // All itemKeys are selected, extra keys are ignored
        expect(result.current).toBe(true);
      });
    });
  });

  describe("Action Atoms", () => {
    describe("toggleSelectionAtom", () => {
      it("adds key when not selected", () => {
        const { result } = renderHook(
          () => ({
            keys: useAtomValue(selectedKeysAtom),
            toggle: useSetAtom(toggleSelectionAtom),
          }),
          { wrapper: createTestProvider([]) },
        );

        expect(result.current.keys.has("key1")).toBe(false);

        act(() => {
          result.current.toggle("key1");
        });

        expect(result.current.keys.has("key1")).toBe(true);
      });

      it("removes key when already selected", () => {
        const TestProvider = createTestProvider([[selectedKeysAtom, new Set(["key1", "key2"])]]);

        const { result } = renderHook(
          () => ({
            keys: useAtomValue(selectedKeysAtom),
            toggle: useSetAtom(toggleSelectionAtom),
          }),
          { wrapper: TestProvider },
        );

        expect(result.current.keys.has("key1")).toBe(true);

        act(() => {
          result.current.toggle("key1");
        });

        expect(result.current.keys.has("key1")).toBe(false);
        expect(result.current.keys.has("key2")).toBe(true);
      });
    });

    describe("enterSelectionModeAtom", () => {
      it("sets selection mode to true", () => {
        const { result } = renderHook(
          () => ({
            mode: useAtomValue(isSelectionModeAtom),
            enter: useSetAtom(enterSelectionModeAtom),
          }),
          { wrapper: createTestProvider([]) },
        );

        expect(result.current.mode).toBe(false);

        act(() => {
          result.current.enter();
        });

        expect(result.current.mode).toBe(true);
      });
    });

    describe("exitSelectionModeAtom", () => {
      it("sets selection mode to false and clears selected keys", () => {
        const TestProvider = createTestProvider([
          [isSelectionModeAtom, true],
          [selectedKeysAtom, new Set(["key1", "key2"])],
        ]);

        const { result } = renderHook(
          () => ({
            mode: useAtomValue(isSelectionModeAtom),
            keys: useAtomValue(selectedKeysAtom),
            exit: useSetAtom(exitSelectionModeAtom),
          }),
          { wrapper: TestProvider },
        );

        expect(result.current.mode).toBe(true);
        expect(result.current.keys.size).toBe(2);

        act(() => {
          result.current.exit();
        });

        expect(result.current.mode).toBe(false);
        expect(result.current.keys.size).toBe(0);
      });
    });

    describe("toggleSelectAllAtom", () => {
      it("selects all items when none are selected", () => {
        const TestProvider = createTestProvider([[itemKeysAtom, ["key1", "key2", "key3"]]]);

        const { result } = renderHook(
          () => ({
            keys: useAtomValue(selectedKeysAtom),
            toggleAll: useSetAtom(toggleSelectAllAtom),
          }),
          { wrapper: TestProvider },
        );

        expect(result.current.keys.size).toBe(0);

        act(() => {
          result.current.toggleAll();
        });

        expect(result.current.keys.size).toBe(3);
        expect(result.current.keys.has("key1")).toBe(true);
        expect(result.current.keys.has("key2")).toBe(true);
        expect(result.current.keys.has("key3")).toBe(true);
      });

      it("clears all items when all are selected", () => {
        const TestProvider = createTestProvider([
          [itemKeysAtom, ["key1", "key2", "key3"]],
          [selectedKeysAtom, new Set(["key1", "key2", "key3"])],
        ]);

        const { result } = renderHook(
          () => ({
            keys: useAtomValue(selectedKeysAtom),
            toggleAll: useSetAtom(toggleSelectAllAtom),
          }),
          { wrapper: TestProvider },
        );

        expect(result.current.keys.size).toBe(3);

        act(() => {
          result.current.toggleAll();
        });

        expect(result.current.keys.size).toBe(0);
      });

      it("selects all items when some are selected", () => {
        const TestProvider = createTestProvider([
          [itemKeysAtom, ["key1", "key2", "key3"]],
          [selectedKeysAtom, new Set(["key1"])],
        ]);

        const { result } = renderHook(
          () => ({
            keys: useAtomValue(selectedKeysAtom),
            toggleAll: useSetAtom(toggleSelectAllAtom),
          }),
          { wrapper: TestProvider },
        );

        expect(result.current.keys.size).toBe(1);

        act(() => {
          result.current.toggleAll();
        });

        expect(result.current.keys.size).toBe(3);
      });
    });

    describe("clearSelectionAtom", () => {
      it("clears all selected keys", () => {
        const TestProvider = createTestProvider([[selectedKeysAtom, new Set(["key1", "key2"])]]);

        const { result } = renderHook(
          () => ({
            keys: useAtomValue(selectedKeysAtom),
            clear: useSetAtom(clearSelectionAtom),
          }),
          { wrapper: TestProvider },
        );

        expect(result.current.keys.size).toBe(2);

        act(() => {
          result.current.clear();
        });

        expect(result.current.keys.size).toBe(0);
      });
    });
  });

  describe("Debug Labels", () => {
    it("has debugLabel on selectedKeysAtom", () => {
      expect(selectedKeysAtom.debugLabel).toBe("selection/keys");
    });

    it("has debugLabel on isSelectionModeAtom", () => {
      expect(isSelectionModeAtom.debugLabel).toBe("selection/mode");
    });

    it("has debugLabel on itemKeysAtom", () => {
      expect(itemKeysAtom.debugLabel).toBe("selection/itemKeys");
    });

    it("has debugLabel on selectedCountAtom", () => {
      expect(selectedCountAtom.debugLabel).toBe("selection/count");
    });

    it("has debugLabel on isAllSelectedAtom", () => {
      expect(isAllSelectedAtom.debugLabel).toBe("selection/isAllSelected");
    });
  });
});
