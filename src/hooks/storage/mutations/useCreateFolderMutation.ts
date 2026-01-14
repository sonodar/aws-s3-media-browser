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
      await queryClient.invalidateQueries({
        queryKey: queryKeys.storageItems(context.identityId, context.currentPath),
      });
    },
  });
}
