import { describe, it, expect, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useSetAtom } from "jotai";
import { useSelection } from "./useSelection";
import { TestProvider, selectedKeysAtom, isSelectionModeAtom } from "../../stores";

/**
 * useSelection テスト
 *
 * Jotai atoms に接続されたファサード hook のテスト。
 * TestProvider でラップして atoms のスコープを提供する。
 */
describe("useSelection", () => {
  const defaultItemKeys = ["file1.jpg", "file2.png", "folder1/"];

  // Helper hook to reset atoms between tests
  function useResetAtoms() {
    const setSelectedKeys = useSetAtom(selectedKeysAtom);
    const setIsSelectionMode = useSetAtom(isSelectionModeAtom);
    return () => {
      setSelectedKeys(new Set());
      setIsSelectionMode(false);
    };
  }

  // Reset atoms before each test
  beforeEach(() => {
    const { result } = renderHook(() => useResetAtoms(), { wrapper: TestProvider });
    act(() => {
      result.current();
    });
  });

  describe("選択モード", () => {
    it("初期状態では選択モードが無効", () => {
      const { result } = renderHook(() => useSelection({ itemKeys: defaultItemKeys }), {
        wrapper: TestProvider,
      });

      expect(result.current.isSelectionMode).toBe(false);
    });

    it("enterSelectionMode で選択モードが有効になる", () => {
      const { result } = renderHook(() => useSelection({ itemKeys: defaultItemKeys }), {
        wrapper: TestProvider,
      });

      act(() => {
        result.current.enterSelectionMode();
      });

      expect(result.current.isSelectionMode).toBe(true);
    });

    it("exitSelectionMode で選択モードが無効になる", () => {
      const { result } = renderHook(() => useSelection({ itemKeys: defaultItemKeys }), {
        wrapper: TestProvider,
      });

      act(() => {
        result.current.enterSelectionMode();
      });
      act(() => {
        result.current.exitSelectionMode();
      });

      expect(result.current.isSelectionMode).toBe(false);
    });

    it("選択モード終了時に選択状態がクリアされる", () => {
      const { result } = renderHook(() => useSelection({ itemKeys: defaultItemKeys }), {
        wrapper: TestProvider,
      });

      act(() => {
        result.current.enterSelectionMode();
      });
      act(() => {
        result.current.toggleSelection("file1.jpg");
        result.current.toggleSelection("file2.png");
      });

      expect(result.current.selectedCount).toBe(2);

      act(() => {
        result.current.exitSelectionMode();
      });

      expect(result.current.selectedCount).toBe(0);
      expect(result.current.selectedKeys.size).toBe(0);
    });
  });

  describe("個別選択", () => {
    it("toggleSelection でアイテムを選択できる", () => {
      const { result } = renderHook(() => useSelection({ itemKeys: defaultItemKeys }), {
        wrapper: TestProvider,
      });

      act(() => {
        result.current.toggleSelection("file1.jpg");
      });

      expect(result.current.selectedKeys.has("file1.jpg")).toBe(true);
      expect(result.current.selectedCount).toBe(1);
    });

    it("toggleSelection で選択中のアイテムを解除できる", () => {
      const { result } = renderHook(() => useSelection({ itemKeys: defaultItemKeys }), {
        wrapper: TestProvider,
      });

      act(() => {
        result.current.toggleSelection("file1.jpg");
      });
      act(() => {
        result.current.toggleSelection("file1.jpg");
      });

      expect(result.current.selectedKeys.has("file1.jpg")).toBe(false);
      expect(result.current.selectedCount).toBe(0);
    });

    it("複数のアイテムを選択できる", () => {
      const { result } = renderHook(() => useSelection({ itemKeys: defaultItemKeys }), {
        wrapper: TestProvider,
      });

      act(() => {
        result.current.toggleSelection("file1.jpg");
        result.current.toggleSelection("folder1/");
      });

      expect(result.current.selectedKeys.has("file1.jpg")).toBe(true);
      expect(result.current.selectedKeys.has("folder1/")).toBe(true);
      expect(result.current.selectedCount).toBe(2);
    });
  });

  describe("全選択", () => {
    it("toggleSelectAll で全アイテムを選択できる", () => {
      const { result } = renderHook(() => useSelection({ itemKeys: defaultItemKeys }), {
        wrapper: TestProvider,
      });

      act(() => {
        result.current.toggleSelectAll();
      });

      expect(result.current.selectedCount).toBe(3);
      expect(result.current.isAllSelected).toBe(true);
    });

    it("全選択状態で toggleSelectAll を実行すると全解除される", () => {
      const { result } = renderHook(() => useSelection({ itemKeys: defaultItemKeys }), {
        wrapper: TestProvider,
      });

      act(() => {
        result.current.toggleSelectAll();
      });
      act(() => {
        result.current.toggleSelectAll();
      });

      expect(result.current.selectedCount).toBe(0);
      expect(result.current.isAllSelected).toBe(false);
    });

    it("一部選択状態で toggleSelectAll を実行すると全選択される", () => {
      const { result } = renderHook(() => useSelection({ itemKeys: defaultItemKeys }), {
        wrapper: TestProvider,
      });

      act(() => {
        result.current.toggleSelection("file1.jpg");
      });
      act(() => {
        result.current.toggleSelectAll();
      });

      expect(result.current.selectedCount).toBe(3);
      expect(result.current.isAllSelected).toBe(true);
    });
  });

  describe("選択クリア", () => {
    it("clearSelection で選択状態をクリアできる", () => {
      const { result } = renderHook(() => useSelection({ itemKeys: defaultItemKeys }), {
        wrapper: TestProvider,
      });

      act(() => {
        result.current.toggleSelection("file1.jpg");
        result.current.toggleSelection("file2.png");
      });
      act(() => {
        result.current.clearSelection();
      });

      expect(result.current.selectedCount).toBe(0);
      expect(result.current.selectedKeys.size).toBe(0);
    });
  });

  describe("isAllSelected", () => {
    it("アイテムがない場合は false", () => {
      const { result } = renderHook(() => useSelection({ itemKeys: [] }), {
        wrapper: TestProvider,
      });

      expect(result.current.isAllSelected).toBe(false);
    });

    it("一部選択時は false", () => {
      const { result } = renderHook(() => useSelection({ itemKeys: defaultItemKeys }), {
        wrapper: TestProvider,
      });

      act(() => {
        result.current.toggleSelection("file1.jpg");
      });

      expect(result.current.isAllSelected).toBe(false);
    });

    it("全選択時は true", () => {
      const { result } = renderHook(() => useSelection({ itemKeys: defaultItemKeys }), {
        wrapper: TestProvider,
      });

      act(() => {
        result.current.toggleSelectAll();
      });

      expect(result.current.isAllSelected).toBe(true);
    });
  });

  describe("itemKeys 変更時の自動クリーンアップ", () => {
    it("itemKeys 変更時に存在しないキーが選択から削除される", () => {
      const { result, rerender } = renderHook(({ itemKeys }) => useSelection({ itemKeys }), {
        wrapper: TestProvider,
        initialProps: { itemKeys: ["file1.jpg", "file2.png", "file3.txt"] },
      });

      act(() => {
        result.current.toggleSelection("file1.jpg");
        result.current.toggleSelection("file2.png");
        result.current.toggleSelection("file3.txt");
      });

      expect(result.current.selectedCount).toBe(3);

      // file3.txt を除いた新しい itemKeys で再レンダリング
      rerender({ itemKeys: ["file1.jpg", "file2.png"] });

      expect(result.current.selectedCount).toBe(2);
      expect(result.current.selectedKeys.has("file1.jpg")).toBe(true);
      expect(result.current.selectedKeys.has("file2.png")).toBe(true);
      expect(result.current.selectedKeys.has("file3.txt")).toBe(false);
    });

    it("全アイテムが削除された場合は選択がクリアされる", () => {
      const { result, rerender } = renderHook(({ itemKeys }) => useSelection({ itemKeys }), {
        wrapper: TestProvider,
        initialProps: { itemKeys: ["file1.jpg", "file2.png"] },
      });

      act(() => {
        result.current.toggleSelectAll();
      });

      expect(result.current.selectedCount).toBe(2);

      rerender({ itemKeys: [] });

      expect(result.current.selectedCount).toBe(0);
      expect(result.current.isAllSelected).toBe(false);
    });
  });
});
