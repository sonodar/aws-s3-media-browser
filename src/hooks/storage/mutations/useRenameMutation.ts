/**
 * ファイル/フォルダリネーム用 useMutation フック
 */
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { list, copy, remove } from "aws-amplify/storage";
import { queryKeys } from "../../../stores/queryKeys";
import { buildRenamedKey, buildRenamedPrefix, encodePathForCopy } from "../../../utils/pathUtils";
import { OPERATION_LIMITS } from "./types";
import type { MutationContext, RenameVariables, RenameResult } from "./types";

/**
 * 単一ファイルをリネームする
 */
async function renameFile(currentKey: string, newName: string): Promise<RenameResult> {
  const newKey = buildRenamedKey(currentKey, newName);

  // S3上で新キーの存在をチェック
  const existingItems = await list({
    path: newKey,
    options: { listAll: true },
  });

  // ファイルが存在する場合はエラー
  if (existingItems.items.length > 0) {
    return { success: false, error: "同じ名前のファイルが既に存在します" };
  }

  // コピー実行
  await copy({
    source: { path: encodePathForCopy(currentKey) },
    destination: { path: newKey },
  });

  // 元ファイルを削除（失敗しても警告として扱う）
  let warning: string | undefined;
  try {
    await remove({ path: currentKey });
  } catch (err: unknown) {
    console.warn("Error deleting original file after rename:", err);
    warning = `元ファイルの削除に失敗しました: ${(err as Error).message}`;
  }

  return { success: true, warning };
}

/**
 * フォルダをリネームする
 */
async function renameFolder(
  currentPrefix: string,
  newName: string,
  onProgress?: (progress: { current: number; total: number }) => void,
): Promise<RenameResult> {
  const newPrefix = buildRenamedPrefix(currentPrefix, newName);

  // リネーム先の既存オブジェクトを取得
  let targetItems: string[] = [];
  try {
    const targetResult = await list({
      path: newPrefix,
      options: { listAll: true },
    });
    targetItems = targetResult.items.map((item) => item.path);
  } catch {
    // リネーム先が存在しない場合は空として扱う
  }

  // ソースフォルダの内容を取得
  const sourceResult = await list({
    path: currentPrefix,
    options: { listAll: true },
  });
  const sourceItems = sourceResult.items.map((item) => item.path);

  // ファイル数制限チェック
  if (sourceItems.length > OPERATION_LIMITS.MAX_FOLDER_RENAME_ITEMS) {
    return {
      success: false,
      error: `フォルダ内のファイル数が多すぎます（${sourceItems.length}件）。${OPERATION_LIMITS.MAX_FOLDER_RENAME_ITEMS}件以下のフォルダのみリネーム可能です`,
    };
  }

  // 重複チェック（高速パス: リネーム先が空なら重複なし）
  if (targetItems.length > 0) {
    const targetSet = new Set(targetItems);
    const duplicates: string[] = [];

    for (const sourcePath of sourceItems) {
      // ソースパスからリネーム先パスを構築
      const relativePath = sourcePath.slice(currentPrefix.length);
      const destPath = `${newPrefix}${relativePath}`;
      if (targetSet.has(destPath)) {
        duplicates.push(relativePath);
      }
    }

    if (duplicates.length > 0) {
      return {
        success: false,
        error: `重複するファイルが存在します（${duplicates.length}件）`,
        duplicates,
      };
    }
  }

  // コピー＆削除を実行
  const total = sourceItems.length;
  let succeeded = 0;
  let failed = 0;
  const failedFiles: string[] = [];

  for (let i = 0; i < sourceItems.length; i++) {
    const sourcePath = sourceItems[i];
    const relativePath = sourcePath.slice(currentPrefix.length);
    const destPath = `${newPrefix}${relativePath}`;

    try {
      await copy({
        source: { path: encodePathForCopy(sourcePath) },
        destination: { path: destPath },
      });

      // コピー成功したら元ファイルを削除
      try {
        await remove({ path: sourcePath });
      } catch {
        // 削除失敗は無視（ファイルは両方に存在することになる）
      }

      succeeded++;
    } catch (err: unknown) {
      console.error("Error renaming folder item:", err);
      failed++;
      failedFiles.push(relativePath);
    }

    onProgress?.({ current: i + 1, total });
  }

  if (failed > 0) {
    return {
      success: false,
      succeeded,
      failed,
      failedFiles,
    };
  }

  return { success: true, succeeded, failed: 0 };
}

/**
 * ファイル/フォルダリネームを実行する mutation フック
 */
export function useRenameMutation(context: MutationContext) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ["storage", "rename"],
    mutationFn: async (variables: RenameVariables): Promise<RenameResult> => {
      const { currentKey, newName, isFolder, onProgress } = variables;

      if (isFolder) {
        return renameFolder(currentKey, newName, onProgress);
      }
      return renameFile(currentKey, newName);
    },
    onSuccess: async () => {
      // 新キャッシュキー（storageItems）を無効化
      await queryClient.invalidateQueries({
        queryKey: queryKeys.storageItems(context.identityId, context.currentPath),
      });
      // 旧キャッシュキー（items）も無効化（Strangler Fig: 並行運用期間）
      await queryClient.invalidateQueries({
        queryKey: queryKeys.items(context.identityId, context.currentPath),
      });
    },
  });
}
