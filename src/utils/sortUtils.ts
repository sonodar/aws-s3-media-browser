/**
 * ソート関連のユーティリティ
 */

/**
 * 自然順ソート用の Collator
 * 数字を正しく扱う（例: file1, file2, file10 の順になる）
 */
const collator = new Intl.Collator("ja", {
  numeric: true,
  sensitivity: "base",
});

/**
 * 名前で自然順ソートするための比較関数
 * @param a 比較対象1
 * @param b 比較対象2
 * @returns 比較結果（負: a < b, 0: a == b, 正: a > b）
 */
export function compareByName(a: { name: string }, b: { name: string }): number {
  return collator.compare(a.name, b.name);
}
