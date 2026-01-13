/**
 * ファイル/フォルダ削除用 useMutation フック
 */
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { list, remove } from "aws-amplify/storage";
import { queryKeys } from "../../../stores/queryKeys";
import type { MutationContext, DeleteVariables, DeleteResult } from "./types";

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
 * 削除対象のすべてのキーを収集する
 */
async function collectKeysToDelete(items: Array<{ key: string; type: string }>): Promise<string[]> {
  const allKeysToDelete: string[] = [];

  for (const item of items) {
    if (item.type === "folder") {
      // フォルダの場合は配下コンテンツを取得
      const folderContents = await listFolderContents(item.key);
      allKeysToDelete.push(...folderContents);
      // フォルダオブジェクト自体も削除対象に追加
      allKeysToDelete.push(item.key);
    } else {
      allKeysToDelete.push(item.key);
    }
  }

  // 重複を除去して返す
  return [...new Set(allKeysToDelete)];
}

/**
 * ファイル/フォルダ削除を実行する mutation フック
 * フォルダが含まれる場合は配下コンテンツも一括削除します。
 */
export function useDeleteMutation(context: MutationContext) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ["storage", "delete"],
    mutationFn: async (variables: DeleteVariables): Promise<DeleteResult> => {
      const { items } = variables;

      // 削除対象のすべてのキーを収集
      const uniqueKeys = await collectKeysToDelete(items);

      // 並列で削除を実行
      const results = await Promise.allSettled(
        uniqueKeys.map(async (key) => {
          await remove({ path: key });
          return key;
        }),
      );

      // 結果を分類
      const succeeded: string[] = [];
      const failed: Array<{ key: string; error: Error }> = [];

      results.forEach((result, index) => {
        const key = uniqueKeys[index];
        if (result.status === "fulfilled") {
          succeeded.push(key);
        } else {
          failed.push({ key, error: result.reason as Error });
        }
      });

      return { succeeded, failed };
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.items(context.identityId, context.currentPath),
      });
    },
  });
}
