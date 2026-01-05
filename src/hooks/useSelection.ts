import { useState, useCallback, useMemo, useEffect } from 'react';

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
 * 選択状態とモードを管理するフック
 *
 * O(1) での選択チェックを可能にする Set ベースの実装。
 * 選択モード終了時に選択状態を自動クリアする。
 * itemKeys 変更時に存在しないキーを自動削除する。
 */
export function useSelection({ itemKeys }: UseSelectionProps): UseSelectionReturn {
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());

  // itemKeys が変更された場合、存在しないキーを削除
  useEffect(() => {
    const itemKeySet = new Set(itemKeys);
    setSelectedKeys((prev) => {
      const filtered = new Set([...prev].filter((key) => itemKeySet.has(key)));
      // 変更がない場合は同じ参照を返す（不要な再レンダリング防止）
      if (filtered.size === prev.size) {
        return prev;
      }
      return filtered;
    });
  }, [itemKeys]);

  const selectedCount = useMemo(() => selectedKeys.size, [selectedKeys]);

  const isAllSelected = useMemo(() => {
    if (itemKeys.length === 0) return false;
    return itemKeys.every((key) => selectedKeys.has(key));
  }, [itemKeys, selectedKeys]);

  const enterSelectionMode = useCallback(() => {
    setIsSelectionMode(true);
  }, []);

  const exitSelectionMode = useCallback(() => {
    setIsSelectionMode(false);
    setSelectedKeys(new Set());
  }, []);

  const toggleSelection = useCallback((key: string) => {
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    setSelectedKeys((prev) => {
      const allSelected = itemKeys.every((key) => prev.has(key));
      if (allSelected) {
        return new Set();
      }
      return new Set(itemKeys);
    });
  }, [itemKeys]);

  const clearSelection = useCallback(() => {
    setSelectedKeys(new Set());
  }, []);

  return {
    isSelectionMode,
    selectedKeys,
    selectedCount,
    isAllSelected,
    enterSelectionMode,
    exitSelectionMode,
    toggleSelection,
    toggleSelectAll,
    clearSelection,
  };
}
