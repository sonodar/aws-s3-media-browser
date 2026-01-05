import type { StorageItem } from '../types/storage';

export interface S3ListItem {
  path: string;
  size?: number;
  lastModified?: Date;
}

/**
 * S3 リスト結果を StorageItem 配列にパースする
 * - 現在のパスのマーカーを除外
 * - 直接の子のみを表示（ネストされたファイルはフォルダとして表示）
 * - フォルダを重複排除
 * - フォルダを先に、アルファベット順でソート
 */
export function parseStorageItems(items: S3ListItem[], basePath: string): StorageItem[] {
  // Parse items - filter out current path prefix and extract relative names
  const parsed: StorageItem[] = items
    .filter((item) => item.path !== basePath) // Exclude current folder marker
    .map((item) => {
      const relativePath = item.path.replace(basePath, '');
      // Check if this is a direct child or nested
      const parts = relativePath.split('/').filter(Boolean);

      if (parts.length === 0) return null;

      // Only show direct children
      const isFolder = item.path.endsWith('/') || parts.length > 1;
      const name = parts[0];

      return {
        key: item.path,
        name: isFolder ? name : relativePath,
        type: isFolder ? 'folder' : 'file',
        size: item.size,
        lastModified: item.lastModified,
      } as StorageItem;
    })
    .filter((item): item is StorageItem => item !== null);

  // Deduplicate folders (multiple files in same subfolder)
  const uniqueItems = parsed.reduce((acc, item) => {
    const existing = acc.find((i) => i.name === item.name && i.type === item.type);
    if (!existing) {
      acc.push(item);
    }
    return acc;
  }, [] as StorageItem[]);

  // Sort: folders first, then files, alphabetically within each type
  uniqueItems.sort((a, b) => {
    if (a.type === b.type) return a.name.localeCompare(b.name);
    return a.type === 'folder' ? -1 : 1;
  });

  return uniqueItems;
}
