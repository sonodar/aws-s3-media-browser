import type { StorageItem } from "../../types/storage";

/**
 * excludedSubpaths 配列を StorageItem[] に変換する
 *
 * Amplify Storage API の subpathStrategy: 'exclude' オプションを使用した際に
 * 返される excludedSubpaths（サブフォルダのパス一覧）を StorageItem 形式に変換する
 *
 * @param excludedSubpaths - API から返されたサブパスの配列（例: ["media/user/photos/"]）
 * @param basePath - 現在のベースパス（例: "media/user/"）
 * @returns フォルダ型の StorageItem 配列
 */
export function parseExcludedSubpaths(excludedSubpaths: string[], basePath: string): StorageItem[] {
  return excludedSubpaths.map((subpath) => {
    // basePath を除去して相対パスを取得し、末尾のスラッシュを除去してフォルダ名を抽出
    const relativePath = subpath.replace(basePath, "");
    const name = relativePath.replace(/\/$/, "");

    return {
      key: subpath,
      name,
      type: "folder" as const,
    };
  });
}

/**
 * 明示的フォルダと暗黙的フォルダを統合し、重複を排除する
 *
 * S3 には2種類のフォルダ表現がある:
 * - 明示的フォルダ: photos/ のような0バイトのスラッシュオブジェクト（items 配列から取得）
 * - 暗黙的フォルダ: photos/image.jpg 存在時の photos/（excludedSubpaths から取得）
 *
 * 両方を統合し、key ベースで重複を排除する
 *
 * @param explicitFolders - items 配列から抽出した明示的フォルダ
 * @param implicitFolders - excludedSubpaths から変換した暗黙的フォルダ
 * @returns 重複排除された統合フォルダ一覧
 */
export function mergeAndDeduplicateFolders(
  explicitFolders: StorageItem[],
  implicitFolders: StorageItem[],
): StorageItem[] {
  const folderMap = new Map<string, StorageItem>();

  // 明示的フォルダを先に追加（優先）
  for (const folder of explicitFolders) {
    folderMap.set(folder.key, folder);
  }

  // 暗黙的フォルダを追加（重複キーは無視）
  for (const folder of implicitFolders) {
    if (!folderMap.has(folder.key)) {
      folderMap.set(folder.key, folder);
    }
  }

  return Array.from(folderMap.values());
}
