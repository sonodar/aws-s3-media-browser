import { useCallback } from "react";
import { useAtomValue, useSetAtom } from "jotai";
import type { SortOrder } from "../storage/sortStorageItems";
import { sortOrderAtom, setSortOrderAtom, SORT_STORAGE_KEY } from "../../stores/atoms";

/**
 * localStorage のキー（既存 API との互換性のためエクスポート）
 */
export const STORAGE_KEY = SORT_STORAGE_KEY;

/**
 * ソート順の状態管理と localStorage への永続化を行うファサード hook
 *
 * Jotai atoms に接続し、atomWithStorage で自動的に localStorage と同期する。
 *
 * @returns ソート順の状態と更新関数
 */
export function useSortOrder() {
  const sortOrder = useAtomValue(sortOrderAtom);
  const setSortOrderAction = useSetAtom(setSortOrderAtom);

  const setSortOrder = useCallback(
    (order: SortOrder) => {
      setSortOrderAction(order);
    },
    [setSortOrderAction],
  );

  return {
    sortOrder,
    setSortOrder,
  };
}
