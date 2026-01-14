import type { StorageItem } from "../types/storage";

export interface ValidateRenameOptions {
  /** 入力された新しい名前 */
  newName: string;
  /** リネーム対象アイテム */
  item: StorageItem;
  /** 現在のディレクトリ内の既存アイテム */
  existingItems: StorageItem[];
}

export interface ValidationResult {
  /** バリデーション成功フラグ */
  valid: boolean;
  /** エラーメッセージ（失敗時） */
  error?: string;
  /** 正規化された名前（成功時、トリム済み） */
  normalizedName?: string;
}

/**
 * リネーム名のバリデーションを行う（UI層バリデーション）
 *
 * バリデーションルール（優先度順）:
 * 1. 空文字チェック
 * 2. 無効文字チェック（スラッシュ）
 * 3. 長さ制限（100文字）
 * 4. 同一名チェック
 * 5. 重複チェック（UI）
 *
 * @param options バリデーションオプション
 * @returns バリデーション結果
 */
export function validateRename(options: ValidateRenameOptions): ValidationResult {
  const { newName, item, existingItems } = options;
  const normalizedName = newName.trim();

  // 1. 空文字チェック
  if (normalizedName === "") {
    return { valid: false, error: "名前を入力してください" };
  }

  // 2. 無効文字チェック（スラッシュ）
  if (normalizedName.includes("/") || normalizedName.includes("\\")) {
    return { valid: false, error: "名前にスラッシュは使用できません" };
  }

  // 3. 長さ制限（100文字）
  if (normalizedName.length > 100) {
    return { valid: false, error: "名前は100文字以内にしてください" };
  }

  // 4. 同一名チェック
  if (normalizedName === item.name) {
    return { valid: false, error: "名前が変更されていません" };
  }

  // 5. 重複チェック（UI）
  // 同タイプのアイテムで、現在のアイテム以外に同名のものがあるか
  const isDuplicate = existingItems.some(
    (existing) =>
      existing.type === item.type && existing.key !== item.key && existing.name === normalizedName,
  );

  if (isDuplicate) {
    const itemType = item.type === "folder" ? "フォルダ" : "ファイル";
    return { valid: false, error: `同じ名前の${itemType}が既に存在します` };
  }

  return { valid: true, normalizedName };
}
