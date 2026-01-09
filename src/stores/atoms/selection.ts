import { atom } from "jotai";
import { atomWithReset, RESET } from "jotai/utils";

/**
 * Selection Domain Atoms
 *
 * 選択状態をデータドリブンに一元管理する Jotai atoms。
 * - Primitive atoms: 真の状態を保持
 * - Derived atoms: 派生値をレンダリング時に計算
 * - Action atoms: 状態変更操作をカプセル化
 */

// =============================================================================
// Primitive Atoms
// =============================================================================

/**
 * 選択中のアイテムキー Set
 * atomWithReset で初期値にリセット可能
 */
export const selectedKeysAtom = atomWithReset<Set<string>>(new Set());
selectedKeysAtom.debugLabel = "selection/keys";

/**
 * 選択モードフラグ
 */
export const isSelectionModeAtom = atom<boolean>(false);
isSelectionModeAtom.debugLabel = "selection/mode";

/**
 * 選択可能なアイテムキー一覧
 * 親コンポーネントから設定される
 */
export const itemKeysAtom = atom<string[]>([]);
itemKeysAtom.debugLabel = "selection/itemKeys";

// =============================================================================
// Derived Atoms
// =============================================================================

/**
 * フィルタリング済み選択キー（派生値 - レンダリング時に計算）
 * itemKeys に存在しないキーを除外した selectedKeys を返す
 *
 * Note: フィルタリング結果が同じ場合は同じ Set オブジェクトを返し、
 * 不要な再レンダリングを防ぐ
 */
let lastFilteredKeys: Set<string> = new Set();
export const filteredSelectedKeysAtom = atom((get) => {
  const selectedKeys = get(selectedKeysAtom);
  const itemKeys = get(itemKeysAtom);
  const itemKeySet = new Set(itemKeys);
  const filtered = new Set([...selectedKeys].filter((key) => itemKeySet.has(key)));

  // 結果が同じなら前回のオブジェクトを再利用（参照安定性）
  if (
    filtered.size === lastFilteredKeys.size &&
    [...filtered].every((key) => lastFilteredKeys.has(key))
  ) {
    return lastFilteredKeys;
  }

  lastFilteredKeys = filtered;
  return filtered;
});
filteredSelectedKeysAtom.debugLabel = "selection/filteredKeys";

/**
 * 選択件数（派生値 - レンダリング時に計算）
 */
export const selectedCountAtom = atom((get) => {
  const filteredKeys = get(filteredSelectedKeysAtom);
  return filteredKeys.size;
});
selectedCountAtom.debugLabel = "selection/count";

/**
 * 全選択状態（派生値 - レンダリング時に計算）
 * itemKeys が空の場合は false
 * すべての itemKeys が selectedKeys に含まれている場合は true
 */
export const isAllSelectedAtom = atom((get) => {
  const itemKeys = get(itemKeysAtom);
  const selectedKeys = get(selectedKeysAtom);

  if (itemKeys.length === 0) {
    return false;
  }

  return itemKeys.every((key) => selectedKeys.has(key));
});
isAllSelectedAtom.debugLabel = "selection/isAllSelected";

// =============================================================================
// Action Atoms
// =============================================================================

/**
 * アイテム選択トグル
 * 選択されていれば解除、されていなければ選択
 */
export const toggleSelectionAtom = atom(null, (get, set, key: string) => {
  const selectedKeys = get(selectedKeysAtom);
  const next = new Set(selectedKeys);

  if (next.has(key)) {
    next.delete(key);
  } else {
    next.add(key);
  }

  set(selectedKeysAtom, next);
});
toggleSelectionAtom.debugLabel = "selection/toggle";

/**
 * 選択モード開始
 */
export const enterSelectionModeAtom = atom(null, (_get, set) => {
  set(isSelectionModeAtom, true);
});
enterSelectionModeAtom.debugLabel = "selection/enterMode";

/**
 * 選択モード終了（選択もクリア）
 */
export const exitSelectionModeAtom = atom(null, (_get, set) => {
  set(isSelectionModeAtom, false);
  set(selectedKeysAtom, RESET);
});
exitSelectionModeAtom.debugLabel = "selection/exitMode";

/**
 * 全選択/全解除トグル
 * 全て選択されていれば全解除、そうでなければ全選択
 */
export const toggleSelectAllAtom = atom(null, (get, set) => {
  const itemKeys = get(itemKeysAtom);
  const selectedKeys = get(selectedKeysAtom);

  const allSelected = itemKeys.every((key) => selectedKeys.has(key));

  if (allSelected) {
    set(selectedKeysAtom, new Set());
  } else {
    set(selectedKeysAtom, new Set(itemKeys));
  }
});
toggleSelectAllAtom.debugLabel = "selection/toggleAll";

/**
 * 選択クリア
 */
export const clearSelectionAtom = atom(null, (_get, set) => {
  set(selectedKeysAtom, new Set());
});
clearSelectionAtom.debugLabel = "selection/clear";
