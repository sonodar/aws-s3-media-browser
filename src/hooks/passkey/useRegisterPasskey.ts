import { useMutation, useQueryClient } from "@tanstack/react-query";
import { associateWebAuthnCredential } from "aws-amplify/auth";
import { queryKeys } from "../../stores/queryKeys";

export interface UseRegisterPasskeyReturn {
  mutate: () => void;
  mutateAsync: () => Promise<void>;
  isPending: boolean;
  isError: boolean;
  error: Error | null;
}

/**
 * パスキー登録用の useMutation フック
 *
 * - associateWebAuthnCredential を実行
 * - 成功時に invalidateQueries でクレデンシャル一覧を再取得
 */
export function useRegisterPasskey(): UseRegisterPasskeyReturn {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async () => {
      await associateWebAuthnCredential();
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
    error: mutation.error ?? null,
  };
}
