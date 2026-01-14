export interface ValidationResult {
  /** バリデーション成功フラグ */
  valid: boolean;
  /** エラーメッセージ（失敗時） */
  error?: string;
  /** 正規化された名前（成功時、トリム済み） */
  normalizedName?: string;
}

/**
 * アイテム名の基本バリデーションを行う
 *
 * バリデーションルール（優先度順）:
 * 1. 空文字チェック
 * 2. 無効文字チェック（スラッシュ）
 * 3. 長さ制限（100文字）
 *
 * @param name バリデーション対象の名前
 * @returns バリデーション結果
 */
export function validateItemName(name: string): ValidationResult {
  const normalizedName = name.trim();

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

  return { valid: true, normalizedName };
}
