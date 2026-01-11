import { atom } from "jotai";
import type { StorageItem } from "../../types/storage";

/**
 * Delete Confirm Domain Atoms
 *
 * 削除確認ダイアログの状態をグローバルに管理する Jotai atoms。
 * どのコンポーネントからでも削除リクエストを発行でき、
 * MediaBrowser で一元的に削除処理を実行する。
 *
 * - Primitive atoms: 真の状態を保持
 * - Derived atoms: 派生値をレンダリング時に計算
 * - Action atoms: 状態変更操作をカプセル化
 */

// =============================================================================
// Primitive Atoms
// =============================================================================

/**
 * 削除対象アイテム配列
 * 空配列の場合はダイアログ非表示
 */
export const itemsToDeleteAtom = atom<StorageItem[]>([]);
itemsToDeleteAtom.debugLabel = "deleteConfirm/items";

/**
 * 削除処理中フラグ
 */
export const isDeletingAtom = atom<boolean>(false);
isDeletingAtom.debugLabel = "deleteConfirm/isDeleting";

// =============================================================================
// Derived Atoms
// =============================================================================

/**
 * 削除確認ダイアログ表示状態（派生値）
 */
export const isDeleteConfirmOpenAtom = atom((get) => {
  return get(itemsToDeleteAtom).length > 0;
});
isDeleteConfirmOpenAtom.debugLabel = "deleteConfirm/isOpen";

// =============================================================================
// Action Atoms
// =============================================================================

/**
 * 削除リクエスト
 * ダイアログを表示するためにアイテムを設定
 */
export const requestDeleteAtom = atom(null, (_get, set, items: StorageItem[]) => {
  set(itemsToDeleteAtom, items);
});
requestDeleteAtom.debugLabel = "deleteConfirm/request";

/**
 * 削除キャンセル
 * ダイアログを閉じてアイテムをクリア
 */
export const cancelDeleteAtom = atom(null, (_get, set) => {
  set(itemsToDeleteAtom, []);
  set(isDeletingAtom, false);
});
cancelDeleteAtom.debugLabel = "deleteConfirm/cancel";

/**
 * 削除処理開始
 * isDeleting を true に設定
 */
export const startDeletingAtom = atom(null, (_get, set) => {
  set(isDeletingAtom, true);
});
startDeletingAtom.debugLabel = "deleteConfirm/startDeleting";

/**
 * 削除処理完了
 * 状態をリセット
 */
export const finishDeletingAtom = atom(null, (_get, set) => {
  set(itemsToDeleteAtom, []);
  set(isDeletingAtom, false);
});
finishDeletingAtom.debugLabel = "deleteConfirm/finishDeleting";
