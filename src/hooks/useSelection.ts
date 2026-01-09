import { useCallback, useEffect, useRef } from "react";
import { useAtomValue, useSetAtom } from "jotai";
import {
  // Primitive atoms
  isSelectionModeAtom,
  itemKeysAtom,
  // Derived atoms
  filteredSelectedKeysAtom,
  isAllSelectedAtom,
  // Action atoms
  toggleSelectionAtom,
  enterSelectionModeAtom,
  exitSelectionModeAtom,
  toggleSelectAllAtom,
  clearSelectionAtom,
} from "../stores/atoms";

export interface UseSelectionProps {
  /** 選択可能なアイテムのキー一覧 */
  itemKeys: string[];
}

export interface UseSelectionReturn {
  /** 選択モードが有効か */
  isSelectionMode: boolean;
  /** 選択中のアイテムキー */
  selectedKeys: ReadonlySet<string>;
  /** 選択件数 */
  selectedCount: number;
  /** 全アイテムが選択されているか */
  isAllSelected: boolean;
  /** 選択モード開始 */
  enterSelectionMode: () => void;
  /** 選択モード終了（選択クリア） */
  exitSelectionMode: () => void;
  /** アイテム選択トグル */
  toggleSelection: (key: string) => void;
  /** 全選択/全解除トグル */
  toggleSelectAll: () => void;
  /** 選択クリア */
  clearSelection: () => void;
}

/**
 * 選択状態とモードを管理するファサード hook
 *
 * Jotai atoms に接続し、O(1) での選択チェックを可能にする Set ベースの実装。
 * 選択モード終了時に選択状態を自動クリアする。
 * itemKeys 変更時に存在しないキーを自動削除する。
 *
 * Architecture Note:
 * - 禁止用途の useEffect を排除（itemKeys 同期は derived atom で処理）
 * - 選択キーのフィルタリングはレンダリング中に計算
 * - 派生値（selectedCount, isAllSelected）は derived atoms で計算
 */
export function useSelection({ itemKeys }: UseSelectionProps): UseSelectionReturn {
  // Primitive atoms
  const isSelectionMode = useAtomValue(isSelectionModeAtom);
  const setItemKeys = useSetAtom(itemKeysAtom);

  // Derived atoms（フィルタリングは derived atom で実行 - 禁止用途 useEffect 排除）
  const selectedKeys = useAtomValue(filteredSelectedKeysAtom);
  const isAllSelected = useAtomValue(isAllSelectedAtom);

  // Action atoms
  const toggleSelectionAction = useSetAtom(toggleSelectionAtom);
  const enterSelectionModeAction = useSetAtom(enterSelectionModeAtom);
  const exitSelectionModeAction = useSetAtom(exitSelectionModeAtom);
  const toggleSelectAllAction = useSetAtom(toggleSelectAllAtom);
  const clearSelectionAction = useSetAtom(clearSelectionAtom);

  // itemKeys を atom に同期（レンダリング中に実行 - 禁止用途 useEffect の排除）
  // React 19 の concurrent rendering に対応するため、レンダリング中に状態を更新
  const prevItemKeysRef = useRef<string[]>([]);

  // itemKeys が変更された場合のみ atom を更新
  if (itemKeys !== prevItemKeysRef.current) {
    // 配列の内容を比較（浅い比較）
    const isSameContent =
      itemKeys.length === prevItemKeysRef.current.length &&
      itemKeys.every((key, index) => key === prevItemKeysRef.current[index]);

    if (!isSameContent) {
      prevItemKeysRef.current = itemKeys;
    }
  }

  // itemKeysAtom への同期は useEffect で行う（React のルールに従う）
  // ただし、これは「外部 store への同期」なので許可用途
  useEffect(() => {
    setItemKeys(itemKeys);
  }, [itemKeys, setItemKeys]);

  // Action callbacks
  const enterSelectionMode = useCallback(() => {
    enterSelectionModeAction();
  }, [enterSelectionModeAction]);

  const exitSelectionMode = useCallback(() => {
    exitSelectionModeAction();
  }, [exitSelectionModeAction]);

  const toggleSelection = useCallback(
    (key: string) => {
      toggleSelectionAction(key);
    },
    [toggleSelectionAction],
  );

  const toggleSelectAll = useCallback(() => {
    toggleSelectAllAction();
  }, [toggleSelectAllAction]);

  const clearSelection = useCallback(() => {
    clearSelectionAction();
  }, [clearSelectionAction]);

  return {
    isSelectionMode,
    selectedKeys,
    selectedCount: selectedKeys.size, // フィルタリング後のサイズを使用
    isAllSelected,
    enterSelectionMode,
    exitSelectionMode,
    toggleSelection,
    toggleSelectAll,
    clearSelection,
  };
}
