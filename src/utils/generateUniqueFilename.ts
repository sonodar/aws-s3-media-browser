export interface GenerateUniqueFilenameOptions {
  /** 元のファイル名 */
  originalName: string;
  /** 現在フォルダ内の既存ファイル名リスト */
  existingNames: string[];
}

export interface GenerateUniqueFilenameResult {
  /** 成功フラグ */
  success: boolean;
  /** 生成されたファイル名（成功時） */
  filename?: string;
  /** エラーメッセージ（失敗時） */
  error?: string;
  /** リネームされたかどうか */
  renamed: boolean;
}

/** ファイル名の最大長 */
const MAX_FILENAME_LENGTH = 100;

/**
 * ファイル名を名前部分と拡張子に分離する
 *
 * @param filename ファイル名
 * @returns [名前部分, 拡張子（ドット付き）または空文字]
 */
function splitFilename(filename: string): [string, string] {
  // ドットで始まる隠しファイル（例: .gitignore）の場合は拡張子なしとして扱う
  if (filename.startsWith(".") && !filename.includes(".", 1)) {
    return [filename, ""];
  }

  const lastDotIndex = filename.lastIndexOf(".");
  if (lastDotIndex === -1 || lastDotIndex === 0) {
    return [filename, ""];
  }

  return [filename.slice(0, lastDotIndex), filename.slice(lastDotIndex)];
}

/**
 * 連番付きファイル名を生成する
 *
 * @param baseName 基本ファイル名（拡張子なし）
 * @param extension 拡張子（ドット付き）
 * @param counter 連番
 * @returns 連番付きファイル名
 */
function buildNumberedFilename(baseName: string, extension: string, counter: number): string {
  return `${baseName} (${counter})${extension}`;
}

/**
 * 重複しないファイル名を生成する
 *
 * @param options ファイル名生成オプション
 * @returns 生成結果
 */
export function generateUniqueFilename(
  options: GenerateUniqueFilenameOptions,
): GenerateUniqueFilenameResult {
  const { originalName, existingNames } = options;

  // 重複チェック用のセットを作成（大文字小文字を区別）
  const existingSet = new Set(existingNames);

  // 重複がなければそのまま返す
  if (!existingSet.has(originalName)) {
    return { success: true, filename: originalName, renamed: false };
  }

  // ファイル名を分割
  const [baseName, extension] = splitFilename(originalName);

  // 連番を付けて空いている番号を探す
  let counter = 1;
  let newFilename = buildNumberedFilename(baseName, extension, counter);

  while (existingSet.has(newFilename)) {
    counter++;
    newFilename = buildNumberedFilename(baseName, extension, counter);
  }

  // 長さ制限チェック
  if (newFilename.length > MAX_FILENAME_LENGTH) {
    return {
      success: false,
      error: "連番を付与すると名前が100文字を超えるためアップロードできません",
      renamed: false,
    };
  }

  return { success: true, filename: newFilename, renamed: true };
}
