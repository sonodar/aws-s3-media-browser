/**
 * ファイルアップロード用 useMutation フック
 */
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { uploadData } from "aws-amplify/storage";
import { queryKeys } from "../../../stores/queryKeys";
import type { MutationContext, UploadVariables } from "./types";

/**
 * ファイルアップロードを実行する mutation フック
 */
export function useUploadMutation(context: MutationContext) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ["storage", "upload"],
    mutationFn: async (variables: UploadVariables): Promise<string[]> => {
      const { files, basePath } = variables;

      const uploadedKeys = files.map((file) => `${basePath}${file.name}`);

      await Promise.all(
        files.map((file) =>
          uploadData({
            path: `${basePath}${file.name}`,
            data: file,
          }),
        ),
      );

      return uploadedKeys;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.storageItems(context.identityId, context.currentPath),
      });
    },
  });
}
