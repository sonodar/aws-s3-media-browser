import { atom } from "jotai";
import { atomWithStorage } from "jotai/utils";
import type { SortOrder } from "../../hooks/sortStorageItems";
import { DEFAULT_SORT_ORDER } from "../../hooks/sortStorageItems";

/**
 * Sort Domain Atoms
 *
 * ソート設定を atomWithStorage で localStorage に永続化する Jotai atoms。
 * ユーザー設定をブラウザに保存し、セッション間で維持する。
 */

// =============================================================================
// Constants
// =============================================================================

/**
 * localStorage のキー（既存 useSortOrder と同じキーを使用）
 */
export const SORT_STORAGE_KEY = "s3-photo-browser:sort-order";

// =============================================================================
// Primitive Atoms
// =============================================================================

/**
 * ソート順（atomWithStorage で永続化）
 * - newest: 新しい順
 * - oldest: 古い順
 * - name: 名前順
 * - size: サイズ順
 */
export const sortOrderAtom = atomWithStorage<SortOrder>(SORT_STORAGE_KEY, DEFAULT_SORT_ORDER);
sortOrderAtom.debugLabel = "sort/order";

// =============================================================================
// Action Atoms
// =============================================================================

/**
 * ソート順を設定する
 */
export const setSortOrderAtom = atom(null, (_get, set, order: SortOrder) => {
  set(sortOrderAtom, order);
});
setSortOrderAtom.debugLabel = "sort/setOrder";

/**
 * ソート順をトグルする
 * - newest ⇄ oldest
 * - name, size → newest（日時ベースではないので newest にフォールバック）
 */
export const toggleSortOrderAtom = atom(null, (get, set) => {
  const current = get(sortOrderAtom);

  let next: SortOrder;
  switch (current) {
    case "newest":
      next = "oldest";
      break;
    case "oldest":
      next = "newest";
      break;
    default:
      // name, size の場合は newest にフォールバック
      next = "newest";
  }

  set(sortOrderAtom, next);
});
toggleSortOrderAtom.debugLabel = "sort/toggle";
