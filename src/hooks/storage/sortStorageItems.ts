import type { StorageItem } from "../../types/storage";

/**
 * ソート順を表す型
 * - newest: 新しい順（lastModified 降順）
 * - oldest: 古い順（lastModified 昇順）
 * - name: 名前順（A→Z、自然順）
 * - size: サイズ順（大きい順、size 降順）
 */
export type SortOrder = "newest" | "oldest" | "name" | "size";

/**
 * ソート順のラベル定義
 */
export const SORT_ORDER_LABELS: Record<SortOrder, string> = {
  newest: "新しい順",
  oldest: "古い順",
  name: "名前順",
  size: "サイズ順",
};

/**
 * デフォルトのソート順
 */
export const DEFAULT_SORT_ORDER: SortOrder = "newest";

/**
 * 自然順ソート用の Collator
 * 数字を正しく扱う（例: file1, file2, file10 の順になる）
 */
const collator = new Intl.Collator("ja", { numeric: true, sensitivity: "base" });

/**
 * StorageItem 配列を指定されたソート順でソートする
 *
 * - フォルダを常にファイルより先に配置
 * - フォルダ群・ファイル群それぞれに対してソートを適用
 * - 元の配列は変更しない（イミュータブル）
 *
 * @param items ソート対象の StorageItem 配列
 * @param sortOrder ソート順
 * @returns ソートされた新しい配列
 */
export function sortStorageItems(items: StorageItem[], sortOrder: SortOrder): StorageItem[] {
  // 空配列の場合は早期リターン
  if (items.length === 0) {
    return [];
  }

  // フォルダとファイルを分離
  const folders = items.filter((item) => item.type === "folder");
  const files = items.filter((item) => item.type === "file");

  // 比較関数を取得
  const compareFn = getCompareFn(sortOrder);

  // それぞれをソート
  const sortedFolders = [...folders].sort(compareFn);
  const sortedFiles = [...files].sort(compareFn);

  // フォルダを先に結合
  return [...sortedFolders, ...sortedFiles];
}

/**
 * ソート順に応じた比較関数を返す
 */
function getCompareFn(sortOrder: SortOrder): (a: StorageItem, b: StorageItem) => number {
  switch (sortOrder) {
    case "newest":
      return (a, b) => {
        const aTime = a.lastModified?.getTime() ?? 0;
        const bTime = b.lastModified?.getTime() ?? 0;
        return bTime - aTime; // 降順
      };

    case "oldest":
      return (a, b) => {
        const aTime = a.lastModified?.getTime() ?? 0;
        const bTime = b.lastModified?.getTime() ?? 0;
        return aTime - bTime; // 昇順
      };

    case "name":
      return (a, b) => collator.compare(a.name, b.name);

    case "size":
      return (a, b) => {
        const aSize = a.size ?? 0;
        const bSize = b.size ?? 0;
        return bSize - aSize; // 降順（大きい順）
      };
  }
}
