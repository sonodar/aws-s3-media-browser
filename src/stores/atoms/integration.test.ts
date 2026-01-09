import { describe, it, expect, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useAtomValue, useSetAtom } from "jotai";
import { TestProvider, createTestProvider } from "../TestProvider";

// Selection atoms
import {
  selectedKeysAtom,
  isSelectionModeAtom,
  itemKeysAtom,
  selectedCountAtom,
  isAllSelectedAtom,
  toggleSelectionAtom,
  enterSelectionModeAtom,
  exitSelectionModeAtom,
  toggleSelectAllAtom,
} from "./selection";

// Path atoms
import { currentPathAtom, pathSegmentsAtom, navigateAtom, goBackAtom, setPathAtom } from "./path";

// Sort atoms
import { sortOrderAtom, setSortOrderAtom } from "./sort";
import type { SortOrder } from "../../hooks/sortStorageItems";

// Task 2.4: Atom 定義の統合テスト

describe("Atom Integration Tests", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe("State Isolation with TestProvider", () => {
    it("isolates Selection state between different TestProvider instances", () => {
      // First instance with initial selection
      const { result: result1 } = renderHook(
        () => ({
          keys: useAtomValue(selectedKeysAtom),
          toggle: useSetAtom(toggleSelectionAtom),
        }),
        { wrapper: TestProvider },
      );

      // Second instance with separate state
      const { result: result2 } = renderHook(
        () => ({
          keys: useAtomValue(selectedKeysAtom),
          toggle: useSetAtom(toggleSelectionAtom),
        }),
        { wrapper: TestProvider },
      );

      // Modify first instance
      act(() => {
        result1.current.toggle("key1");
      });

      // First should have key1, second should be empty
      expect(result1.current.keys.has("key1")).toBe(true);
      expect(result2.current.keys.size).toBe(0);
    });

    it("isolates Path state between different TestProvider instances", () => {
      const { result: result1 } = renderHook(
        () => ({
          path: useAtomValue(currentPathAtom),
          navigate: useSetAtom(navigateAtom),
        }),
        { wrapper: TestProvider },
      );

      const { result: result2 } = renderHook(
        () => ({
          path: useAtomValue(currentPathAtom),
          navigate: useSetAtom(navigateAtom),
        }),
        { wrapper: TestProvider },
      );

      act(() => {
        result1.current.navigate("photos");
      });

      expect(result1.current.path).toBe("photos");
      expect(result2.current.path).toBe("");
    });

    it("isolates Sort state between different TestProvider instances", () => {
      const { result: result1 } = renderHook(
        () => ({
          order: useAtomValue(sortOrderAtom),
          setOrder: useSetAtom(setSortOrderAtom),
        }),
        { wrapper: TestProvider },
      );

      const { result: result2 } = renderHook(
        () => ({
          order: useAtomValue(sortOrderAtom),
          setOrder: useSetAtom(setSortOrderAtom),
        }),
        { wrapper: TestProvider },
      );

      act(() => {
        result1.current.setOrder("oldest");
      });

      expect(result1.current.order).toBe("oldest");
      // Note: Each TestProvider has its own Jotai store, so state is isolated
      // even for atomWithStorage. The localStorage is cleared in beforeEach,
      // so result2 retains its initial default value.
      expect(result2.current.order).toBe("newest");
    });
  });

  describe("Selection Workflow", () => {
    it("completes a full selection workflow: enter mode, select items, toggle all, exit", () => {
      const TestProviderWithItems = createTestProvider([[itemKeysAtom, ["key1", "key2", "key3"]]]);

      const { result } = renderHook(
        () => ({
          mode: useAtomValue(isSelectionModeAtom),
          keys: useAtomValue(selectedKeysAtom),
          count: useAtomValue(selectedCountAtom),
          isAll: useAtomValue(isAllSelectedAtom),
          enter: useSetAtom(enterSelectionModeAtom),
          toggle: useSetAtom(toggleSelectionAtom),
          toggleAll: useSetAtom(toggleSelectAllAtom),
          exit: useSetAtom(exitSelectionModeAtom),
        }),
        { wrapper: TestProviderWithItems },
      );

      // Initial state
      expect(result.current.mode).toBe(false);
      expect(result.current.count).toBe(0);
      expect(result.current.isAll).toBe(false);

      // Enter selection mode
      act(() => {
        result.current.enter();
      });
      expect(result.current.mode).toBe(true);

      // Select some items
      act(() => {
        result.current.toggle("key1");
        result.current.toggle("key2");
      });
      expect(result.current.count).toBe(2);
      expect(result.current.isAll).toBe(false);

      // Toggle select all (should select all since not all are selected)
      act(() => {
        result.current.toggleAll();
      });
      expect(result.current.count).toBe(3);
      expect(result.current.isAll).toBe(true);

      // Toggle select all again (should clear all)
      act(() => {
        result.current.toggleAll();
      });
      expect(result.current.count).toBe(0);
      expect(result.current.isAll).toBe(false);

      // Exit selection mode
      act(() => {
        result.current.exit();
      });
      expect(result.current.mode).toBe(false);
      expect(result.current.count).toBe(0);
    });
  });

  describe("Path Navigation Workflow", () => {
    it("completes a full navigation workflow: navigate deep, then go back", () => {
      const { result } = renderHook(
        () => ({
          path: useAtomValue(currentPathAtom),
          segments: useAtomValue(pathSegmentsAtom),
          navigate: useSetAtom(navigateAtom),
          goBack: useSetAtom(goBackAtom),
          setPath: useSetAtom(setPathAtom),
        }),
        { wrapper: TestProvider },
      );

      // Initial state
      expect(result.current.path).toBe("");
      expect(result.current.segments).toEqual([]);

      // Navigate into folders
      act(() => {
        result.current.navigate("photos");
      });
      expect(result.current.path).toBe("photos");
      expect(result.current.segments).toEqual(["photos"]);

      act(() => {
        result.current.navigate("2024");
      });
      expect(result.current.path).toBe("photos/2024");
      expect(result.current.segments).toEqual(["photos", "2024"]);

      act(() => {
        result.current.navigate("summer");
      });
      expect(result.current.path).toBe("photos/2024/summer");
      expect(result.current.segments).toEqual(["photos", "2024", "summer"]);

      // Go back
      act(() => {
        result.current.goBack();
      });
      expect(result.current.path).toBe("photos/2024");

      act(() => {
        result.current.goBack();
      });
      expect(result.current.path).toBe("photos");

      // Direct set path
      act(() => {
        result.current.setPath("videos/vacation");
      });
      expect(result.current.path).toBe("videos/vacation");
      expect(result.current.segments).toEqual(["videos", "vacation"]);
    });
  });

  describe("Sort Configuration Workflow", () => {
    it("changes sort order and persists selection", () => {
      const { result } = renderHook(
        () => ({
          order: useAtomValue(sortOrderAtom),
          setOrder: useSetAtom(setSortOrderAtom),
        }),
        { wrapper: TestProvider },
      );

      // Initial state (default)
      expect(result.current.order).toBe("newest");

      // Change to each order
      const orders: SortOrder[] = ["oldest", "name", "size", "newest"];
      for (const order of orders) {
        act(() => {
          result.current.setOrder(order);
        });
        expect(result.current.order).toBe(order);
      }
    });
  });

  describe("Cross-Domain Independence", () => {
    it("modifying one domain does not affect other domains", () => {
      const TestProviderWithItems = createTestProvider([[itemKeysAtom, ["key1", "key2"]]]);

      const { result } = renderHook(
        () => ({
          // Selection
          selectionMode: useAtomValue(isSelectionModeAtom),
          selectedKeys: useAtomValue(selectedKeysAtom),
          enterSelection: useSetAtom(enterSelectionModeAtom),
          toggleSelection: useSetAtom(toggleSelectionAtom),
          // Path
          path: useAtomValue(currentPathAtom),
          navigate: useSetAtom(navigateAtom),
          // Sort
          sortOrder: useAtomValue(sortOrderAtom),
          setSortOrder: useSetAtom(setSortOrderAtom),
        }),
        { wrapper: TestProviderWithItems },
      );

      // Modify selection
      act(() => {
        result.current.enterSelection();
        result.current.toggleSelection("key1");
      });

      // Verify path and sort unchanged
      expect(result.current.path).toBe("");
      expect(result.current.sortOrder).toBe("newest");

      // Modify path
      act(() => {
        result.current.navigate("photos");
      });

      // Verify selection unchanged
      expect(result.current.selectionMode).toBe(true);
      expect(result.current.selectedKeys.has("key1")).toBe(true);

      // Modify sort
      act(() => {
        result.current.setSortOrder("name");
      });

      // Verify selection and path unchanged
      expect(result.current.selectionMode).toBe(true);
      expect(result.current.selectedKeys.has("key1")).toBe(true);
      expect(result.current.path).toBe("photos");
    });
  });
});
