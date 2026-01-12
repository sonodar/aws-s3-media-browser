import { useMutation, useQueryClient } from "@tanstack/react-query";
import { deleteWebAuthnCredential } from "aws-amplify/auth";
import { queryKeys } from "../../stores/queryKeys";
import type { MutationReturn } from "../types";

export interface DeletePasskeyParams {
  credentialId: string;
}

export type UseDeletePasskeyReturn = MutationReturn<DeletePasskeyParams>;

/**
 * パスキー削除用の useMutation フック
 *
 * - deleteWebAuthnCredential を実行
 * - 成功時に invalidateQueries でクレデンシャル一覧を再取得
 */
export function useDeletePasskey(): UseDeletePasskeyReturn {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async ({ credentialId }: DeletePasskeyParams) => {
      await deleteWebAuthnCredential({ credentialId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.passkeys() });
    },
  });

  return {
    mutate: mutation.mutate,
    mutateAsync: mutation.mutateAsync,
    isPending: mutation.isPending,
    isError: mutation.isError,
    error: mutation.error as Error | null,
  };
}
