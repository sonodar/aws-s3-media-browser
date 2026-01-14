/**
 * フォルダ作成用 useMutation フック
 */
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { uploadData } from "aws-amplify/storage";
import { queryKeys } from "../../../stores/queryKeys";
import type { MutationContext, CreateFolderVariables } from "./types";

/**
 * フォルダ作成を実行する mutation フック
 */
export function useCreateFolderMutation(context: MutationContext) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ["storage", "createFolder"],
    mutationFn: async (variables: CreateFolderVariables): Promise<string> => {
      const { name, basePath } = variables;

      const folderPath = `${basePath}${name}/`;
      await uploadData({
        path: folderPath,
        data: "",
      });

      return folderPath;
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
