import { useState, useCallback } from "react";
import { DEFAULT_SORT_ORDER } from "./sortStorageItems";
import type { SortOrder } from "./sortStorageItems";

/**
 * localStorage のキー
 */
export const STORAGE_KEY = "s3-photo-browser:sort-order";

/**
 * 有効なソート順かどうかを検証する
 */
function isValidSortOrder(value: unknown): value is SortOrder {
  return value === "newest" || value === "oldest" || value === "name" || value === "size";
}

/**
 * localStorage からソート順を読み込む
 */
function loadSortOrder(): SortOrder {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && isValidSortOrder(stored)) {
      return stored;
    }
  } catch {
    // localStorage が無効な場合はデフォルト値を使用
  }
  return DEFAULT_SORT_ORDER;
}

/**
 * localStorage にソート順を保存する
 */
function saveSortOrder(order: SortOrder): void {
  try {
    localStorage.setItem(STORAGE_KEY, order);
  } catch {
    // 保存に失敗してもエラーを投げない（サイレントフォールバック）
  }
}

/**
 * ソート順の状態管理と localStorage への永続化を行うフック
 *
 * @returns ソート順の状態と更新関数
 */
export function useSortOrder() {
  const [sortOrder, setSortOrderState] = useState<SortOrder>(loadSortOrder);

  const setSortOrder = useCallback((order: SortOrder) => {
    setSortOrderState(order);
    saveSortOrder(order);
  }, []);

  return {
    sortOrder,
    setSortOrder,
  };
}
