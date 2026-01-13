/**
 * ストレージパス関連のユーティリティ
 */

/**
 * パスの末尾スラッシュを正規化する
 * 空文字列またはすでにスラッシュで終わる場合はそのまま、それ以外はスラッシュを追加
 */
export function normalizePathWithSlash(path: string): string {
  return path === "" || path.endsWith("/") ? path : `${path}/`;
}

/**
 * ユーザーのメディアベースパスを構築する
 * @param identityId ユーザーの Identity ID
 * @param currentPath 現在のパス（オプション）
 * @returns 完全なベースパス
 */
export function buildMediaBasePath(identityId: string, currentPath?: string): string {
  const base = `media/${identityId}/`;
  if (!currentPath) {
    return base;
  }
  const normalizedPath = normalizePathWithSlash(currentPath);
  return `${base}${normalizedPath}`;
}

/**
 * フルパスから相対パスを抽出する（buildMediaBasePath の逆変換）
 * @param fullPath フルパス（例: "media/user-123/photos/subfolder/"）
 * @param identityId ユーザーの Identity ID
 * @returns 相対パス（例: "photos/subfolder"）、抽出できない場合は null
 */
export function extractRelativePath(fullPath: string, identityId: string): string | null {
  const prefix = `media/${identityId}/`;
  if (!fullPath.startsWith(prefix)) {
    return null;
  }
  let relativePath = fullPath.slice(prefix.length);
  // 末尾のスラッシュを削除
  if (relativePath.endsWith("/")) {
    relativePath = relativePath.slice(0, -1);
  }
  return relativePath;
}
