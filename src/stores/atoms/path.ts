import { atom } from "jotai";

/**
 * Path Domain Atoms
 *
 * 現在パスの一元管理を行う Jotai atoms。
 * URL 同期は useStoragePath ファサード hook で処理（popstate は useEffect 許可用途）
 */

// =============================================================================
// Primitive Atoms
// =============================================================================

/**
 * 現在のパス文字列
 */
export const currentPathAtom = atom<string>("");
currentPathAtom.debugLabel = "path/current";

// =============================================================================
// Derived Atoms
// =============================================================================

/**
 * パスセグメント配列（派生値 - レンダリング時に計算）
 * 空のセグメントはフィルタリングする
 */
export const pathSegmentsAtom = atom((get) => {
  const currentPath = get(currentPathAtom);
  if (!currentPath) {
    return [];
  }
  return currentPath.split("/").filter(Boolean);
});
pathSegmentsAtom.debugLabel = "path/segments";

/**
 * 親パス（派生値 - レンダリング時に計算）
 * ルートまたは単一フォルダの場合は空文字列
 */
export const parentPathAtom = atom((get) => {
  const segments = get(pathSegmentsAtom);
  if (segments.length <= 1) {
    return "";
  }
  return segments.slice(0, -1).join("/");
});
parentPathAtom.debugLabel = "path/parent";

// =============================================================================
// Action Atoms
// =============================================================================

/**
 * フォルダへナビゲート
 * 現在のパスにフォルダ名を追加する
 */
export const navigateAtom = atom(null, (get, set, folderName: string) => {
  const currentPath = get(currentPathAtom);
  const newPath = currentPath ? `${currentPath}/${folderName}` : folderName;
  set(currentPathAtom, newPath);
});
navigateAtom.debugLabel = "path/navigate";

/**
 * 親フォルダへ戻る
 */
export const goBackAtom = atom(null, (get, set) => {
  const segments = get(pathSegmentsAtom);
  if (segments.length === 0) {
    return;
  }
  const parentPath = segments.slice(0, -1).join("/");
  set(currentPathAtom, parentPath);
});
goBackAtom.debugLabel = "path/goBack";

/**
 * パスを直接設定する
 */
export const setPathAtom = atom(null, (_get, set, path: string) => {
  set(currentPathAtom, path);
});
setPathAtom.debugLabel = "path/setPath";
