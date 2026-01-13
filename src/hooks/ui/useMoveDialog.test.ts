import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useMoveDialog } from "./useMoveDialog";
import type { StorageItem } from "../../types/storage";

describe("useMoveDialog", () => {
  const mockItems: StorageItem[] = [
    { key: "media/123/photos/file1.jpg", name: "file1.jpg", type: "file" },
    { key: "media/123/photos/file2.png", name: "file2.png", type: "file" },
  ];

  const mockFolder: StorageItem = {
    key: "media/123/photos/folder1/",
    name: "folder1",
    type: "folder",
  };

  describe("初期状態", () => {
    it("初期状態ではダイアログが閉じている", () => {
      const { result } = renderHook(() => useMoveDialog());

      expect(result.current.isOpen).toBe(false);
    });

    it("初期状態では移動対象アイテムが空", () => {
      const { result } = renderHook(() => useMoveDialog());

      expect(result.current.itemsToMove).toEqual([]);
    });
  });

  describe("openMoveDialog", () => {
    it("openMoveDialog でダイアログを開ける", () => {
      const { result } = renderHook(() => useMoveDialog());

      act(() => {
        result.current.openMoveDialog(mockItems);
      });

      expect(result.current.isOpen).toBe(true);
    });

    it("openMoveDialog で複数アイテムを渡せる", () => {
      const { result } = renderHook(() => useMoveDialog());

      act(() => {
        result.current.openMoveDialog(mockItems);
      });

      expect(result.current.itemsToMove).toEqual(mockItems);
      expect(result.current.itemsToMove.length).toBe(2);
    });

    it("openMoveDialog で単一アイテムを渡せる", () => {
      const { result } = renderHook(() => useMoveDialog());

      act(() => {
        result.current.openMoveDialog([mockFolder]);
      });

      expect(result.current.itemsToMove).toEqual([mockFolder]);
      expect(result.current.itemsToMove.length).toBe(1);
    });

    it("openMoveDialog で空配列を渡してもダイアログは開く", () => {
      const { result } = renderHook(() => useMoveDialog());

      act(() => {
        result.current.openMoveDialog([]);
      });

      expect(result.current.isOpen).toBe(true);
      expect(result.current.itemsToMove).toEqual([]);
    });
  });

  describe("closeMoveDialog", () => {
    it("closeMoveDialog でダイアログを閉じられる", () => {
      const { result } = renderHook(() => useMoveDialog());

      act(() => {
        result.current.openMoveDialog(mockItems);
      });

      expect(result.current.isOpen).toBe(true);

      act(() => {
        result.current.closeMoveDialog();
      });

      expect(result.current.isOpen).toBe(false);
    });

    it("closeMoveDialog でアイテムがクリアされる", () => {
      const { result } = renderHook(() => useMoveDialog());

      act(() => {
        result.current.openMoveDialog(mockItems);
      });

      expect(result.current.itemsToMove.length).toBe(2);

      act(() => {
        result.current.closeMoveDialog();
      });

      expect(result.current.itemsToMove).toEqual([]);
    });
  });

  describe("再オープン", () => {
    it("クローズ後に別のアイテムで再オープンできる", () => {
      const { result } = renderHook(() => useMoveDialog());

      act(() => {
        result.current.openMoveDialog(mockItems);
      });
      act(() => {
        result.current.closeMoveDialog();
      });
      act(() => {
        result.current.openMoveDialog([mockFolder]);
      });

      expect(result.current.isOpen).toBe(true);
      expect(result.current.itemsToMove).toEqual([mockFolder]);
    });
  });
});
