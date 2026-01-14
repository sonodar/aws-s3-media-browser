/**
 * ファイル/フォルダ移動用 useMutation フック
 */
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { list, copy, remove } from "aws-amplify/storage";
import { queryKeys } from "../../../stores/queryKeys";
import { normalizePathWithSlash, extractRelativePath } from "../../../utils/storagePathUtils";
import { encodePathForCopy } from "../../../utils/pathUtils";
import { invalidateWithDescendants } from "./invalidationUtils";
import type { MutationContext, MoveVariables, MoveResult } from "./types";

/**
 * フォルダ配下のすべてのファイルキーを取得する
 */
async function listFolderContents(folderKey: string): Promise<string[]> {
  const result = await list({
    path: folderKey,
    options: { listAll: true },
  });
  return result.items.map((item) => item.path);
}

/**
 * 移動対象のファイル情報を収集する
 */
async function collectFilesToMove(
  items: Array<{ key: string; name: string; type: string }>,
  normalizedDestPath: string,
): Promise<Array<{ sourcePath: string; destPath: string; relativeName: string }>> {
  const filesToMove = [];

  for (const item of items) {
    if (item.type === "folder") {
      // フォルダの場合は配下コンテンツを取得
      const folderContents = await listFolderContents(item.key);
      for (const sourcePath of folderContents) {
        const folderName = item.name;
        const relativeToFolder = sourcePath.slice(item.key.length);
        const destPath = `${normalizedDestPath}${folderName}/${relativeToFolder}`;
        filesToMove.push({
          sourcePath,
          destPath,
          relativeName: `${folderName}/${relativeToFolder}`,
        });
      }
    } else {
      // ファイルの場合
      const destPath = `${normalizedDestPath}${item.name}`;
      filesToMove.push({
        sourcePath: item.key,
        destPath,
        relativeName: item.name,
      });
    }
  }

  return filesToMove;
}

/**
 * ファイル/フォルダ移動を実行する mutation フック
 */
export function useMoveMutation(context: MutationContext) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ["storage", "move"],
    mutationFn: async (variables: MoveVariables): Promise<MoveResult> => {
      const { items, destinationPath, onProgress } = variables;

      const normalizedDestPath = normalizePathWithSlash(destinationPath);

      // 移動対象のすべてのファイルを収集
      const allFilesToMove = await collectFilesToMove(items, normalizedDestPath);

      // 移動先での重複チェック
      const destResult = await list({
        path: normalizedDestPath,
        options: { listAll: true },
      });
      const existingPaths = new Set(destResult.items.map((item) => item.path));
      const duplicates: string[] = [];

      for (const file of allFilesToMove) {
        if (existingPaths.has(file.destPath)) {
          duplicates.push(file.relativeName);
        }
      }

      if (duplicates.length > 0) {
        return {
          success: false,
          succeeded: 0,
          failed: allFilesToMove.length,
          duplicates,
          error: `移動先に同名のファイルが存在します（${duplicates.length}件）`,
        };
      }

      // コピー＆削除を実行
      const total = allFilesToMove.length;
      let succeeded = 0;
      let failed = 0;
      const failedItems: string[] = [];

      for (let i = 0; i < allFilesToMove.length; i++) {
        const { sourcePath, destPath, relativeName } = allFilesToMove[i];

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
        } catch {
          failed++;
          failedItems.push(relativeName);
        }

        onProgress?.({ current: i + 1, total });
      }

      if (failed > 0) {
        return {
          success: false,
          succeeded,
          failed,
          failedItems,
        };
      }

      return { success: true, succeeded, failed: 0 };
    },
    onSuccess: async (_data, variables) => {
      // 移動元のクエリを無効化
      await queryClient.invalidateQueries({
        queryKey: queryKeys.storageItems(context.identityId, context.currentPath),
      });

      // フォルダ移動の場合、そのフォルダ配下のキャッシュも無効化
      for (const item of variables.items) {
        if (item.type === "folder") {
          const folderPath = context.currentPath
            ? `${context.currentPath}/${item.name}`
            : item.name;
          await invalidateWithDescendants(queryClient, context.identityId, folderPath);
        }
      }

      // 移動先のクエリを無効化
      const destRelativePath = extractRelativePath(variables.destinationPath, context.identityId);
      if (destRelativePath !== null) {
        await queryClient.invalidateQueries({
          queryKey: queryKeys.storageItems(context.identityId, destRelativePath),
        });
      }
    },
  });
}
