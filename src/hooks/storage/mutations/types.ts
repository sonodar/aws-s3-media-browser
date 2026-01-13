/**
 * Storage Mutation フックの共通型定義
 */
import type { StorageItem } from "../../../types/storage";

/**
 * Mutation コンテキスト（各 mutation フックの共通パラメータ）
 */
export interface MutationContext {
  /** ユーザーの Cognito Identity ID */
  identityId: string;
  /** 現在のフォルダパス（ルートは空文字列） */
  currentPath: string;
}

/**
 * アップロード操作の変数
 */
export interface UploadVariables {
  /** アップロードするファイル */
  files: File[];
  /** アップロード先のベースパス */
  basePath: string;
}

/**
 * 削除操作の変数
 */
export interface DeleteVariables {
  /** 削除対象のアイテム */
  items: StorageItem[];
}

/**
 * 削除操作の結果
 */
export interface DeleteResult {
  /** 削除に成功したキー */
  succeeded: string[];
  /** 削除に失敗したキーとエラー */
  failed: Array<{ key: string; error: Error }>;
}

/**
 * 操作の進捗情報（移動・リネーム共通）
 */
export interface OperationProgress {
  /** 処理済み件数 */
  current: number;
  /** 全体件数 */
  total: number;
}

/**
 * 移動操作の変数
 */
export interface MoveVariables {
  /** 移動対象のアイテム */
  items: StorageItem[];
  /** 移動先のフォルダパス */
  destinationPath: string;
  /** 進捗コールバック */
  onProgress?: (progress: OperationProgress) => void;
}

/**
 * バッチ操作の結果（移動・リネーム共通）
 */
export interface BatchOperationResult {
  /** 操作が全て成功したか */
  success: boolean;
  /** 成功件数 */
  succeeded: number;
  /** 失敗件数 */
  failed: number;
  /** エラーメッセージ */
  error?: string;
  /** 警告メッセージ（成功したが注意が必要な場合） */
  warning?: string;
  /** 失敗したアイテム名 */
  failedItems?: string[];
  /** 重複していたファイル名 */
  duplicates?: string[];
}

/**
 * リネーム操作の変数
 */
export interface RenameVariables {
  /** 現在のキー（ファイル）またはプレフィックス（フォルダ） */
  currentKey: string;
  /** 新しい名前 */
  newName: string;
  /** フォルダかどうか */
  isFolder: boolean;
  /** 進捗コールバック（フォルダの場合のみ） */
  onProgress?: (progress: OperationProgress) => void;
}

export type MoveProgress = OperationProgress;
export type RenameProgress = OperationProgress;
export type MoveResult = BatchOperationResult;
// リネーム結果は独自の型定義が必要（succeeded/failedがオプショナル）
export interface RenameResult {
  /** 操作が成功したか */
  success: boolean;
  /** エラーメッセージ */
  error?: string;
  /** 警告メッセージ（成功したが注意が必要な場合） */
  warning?: string;
  /** 成功件数（フォルダリネームの場合） */
  succeeded?: number;
  /** 失敗件数（フォルダリネームの場合） */
  failed?: number;
  /** 失敗したファイル名（フォルダリネームの場合） */
  failedFiles?: string[];
  /** 重複していたファイル名 */
  duplicates?: string[];
}

/**
 * 操作の制限値
 */
export const OPERATION_LIMITS = {
  /** フォルダリネーム時の最大アイテム数 */
  MAX_FOLDER_RENAME_ITEMS: 1000,
} as const;

/**
 * フォルダ作成操作の変数
 */
export interface CreateFolderVariables {
  /** フォルダ名 */
  name: string;
  /** 作成先のベースパス */
  basePath: string;
}
