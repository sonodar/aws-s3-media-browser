import { useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { usePasskeyCredentials, type WebAuthnCredential } from "./usePasskeyCredentials";
import { useRegisterPasskey } from "./useRegisterPasskey";
import { useDeletePasskey } from "./useDeletePasskey";
import { queryKeys } from "../../stores/queryKeys";

// 既存のインターフェースを維持するためにエクスポート
export type { WebAuthnCredential } from "./usePasskeyCredentials";

export interface UsePasskeyReturn {
  credentials: WebAuthnCredential[];
  loading: boolean;
  registering: boolean;
  error: Error | null;
  registerPasskey: () => Promise<void>;
  deletePasskey: (credentialId: string) => Promise<void>;
  refreshCredentials: () => Promise<void>;
}

/**
 * パスキー管理用の統合フック
 *
 * TanStack Query ベースの個別フックを統合し、既存のインターフェースを維持
 * - usePasskeyCredentials: クレデンシャル一覧の取得
 * - useRegisterPasskey: パスキー登録
 * - useDeletePasskey: パスキー削除
 */
export function usePasskey(): UsePasskeyReturn {
  const queryClient = useQueryClient();
  const { data, isLoading, error: fetchError } = usePasskeyCredentials();
  const {
    mutateAsync: registerMutateAsync,
    isPending: isRegistering,
    error: registerError,
  } = useRegisterPasskey();
  const { mutateAsync: deleteMutateAsync, error: deleteError } = useDeletePasskey();

  const registerPasskey = useCallback(async () => {
    await registerMutateAsync();
  }, [registerMutateAsync]);

  const deletePasskey = useCallback(
    async (credentialId: string) => {
      await deleteMutateAsync({ credentialId });
    },
    [deleteMutateAsync],
  );

  const refreshCredentials = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: queryKeys.passkeys() });
  }, [queryClient]);

  // エラーは最も最近発生したものを返す
  const error = registerError ?? deleteError ?? fetchError;

  return {
    credentials: data ?? [],
    loading: isLoading,
    registering: isRegistering,
    error,
    registerPasskey,
    deletePasskey,
    refreshCredentials,
  };
}
