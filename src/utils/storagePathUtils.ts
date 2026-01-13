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
